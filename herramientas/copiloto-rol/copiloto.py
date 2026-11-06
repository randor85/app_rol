#!/usr/bin/env python3
"""Copiloto de rol: captura audio (por ejemplo, la salida de Discord),
lo transcribe localmente con faster-whisper y pide sugerencias a Claude
sobre la partida.

Uso rápido:
    python copiloto.py --listar
    python copiloto.py --dispositivo "Monitor" --notas notas_campana.txt
"""

import argparse
import os
import queue
import sys
import threading
import time
from collections import deque
from datetime import datetime
from pathlib import Path

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel

try:
    import anthropic
except ImportError:  # permite usar --solo-transcribir sin el SDK instalado
    anthropic = None

FRECUENCIA_WHISPER = 16000  # Whisper trabaja a 16 kHz mono
UMBRAL_SILENCIO = 0.005     # RMS por debajo de esto se descarta el fragmento
MARCA_SIN_SUGERENCIA = "[SIN_SUGERENCIA]"

PROMPT_SISTEMA = """Eres un asistente para el director de juego (DJ) de una mesa de rol.
Recibes una transcripción aproximada de la partida. Puede tener errores de reconocimiento
de voz y no siempre distingue quién habla.

Tu trabajo es dar sugerencias breves y accionables: reglas relevantes, consecuencias de lo
que acaba de decidirse, ideas para NPCs, pistas, tiradas recomendadas (con dificultad) y
recordatorios de hilos pendientes.

Reglas:
- Responde en español neutro, con viñetas cortas (máximo 5).
- Si el fragmento nuevo no aporta nada útil, responde exactamente: [SIN_SUGERENCIA]
- No inventes hechos de la campaña que no aparezcan en la transcripción o en las notas.
- No repitas sugerencias que ya diste (se te mostrarán las últimas).
- Si tienes dudas sobre una regla, dilo y sugiere verificarla en el libro.
"""


def listar_dispositivos():
    print("Dispositivos de entrada disponibles:\n")
    for i, d in enumerate(sd.query_devices()):
        if d["max_input_channels"] > 0:
            print(f"  [{i}] {d['name']}  ({int(d['default_samplerate'])} Hz, "
                  f"{d['max_input_channels']} canales)")
    print("\nUsa --dispositivo con el índice o con una parte del nombre.")


def buscar_dispositivo(consulta):
    if consulta.isdigit():
        return int(consulta)
    for i, d in enumerate(sd.query_devices()):
        if d["max_input_channels"] > 0 and consulta.lower() in d["name"].lower():
            return i
    raise SystemExit(f"No encontré un dispositivo de entrada que contenga '{consulta}'. "
                     "Usa --listar para ver las opciones.")


def remuestrear(x, origen, destino):
    if origen == destino:
        return x.astype(np.float32)
    n = int(len(x) * destino / origen)
    nuevo = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
    return nuevo.astype(np.float32)


def capturar(dispositivo, segundos, cola, parar):
    """Hilo productor: lee audio del dispositivo en bloques de `segundos`."""
    info = sd.query_devices(dispositivo)
    frec_origen = int(info["default_samplerate"])
    canales = min(2, info["max_input_channels"])
    frames = int(frec_origen * segundos)

    with sd.InputStream(device=dispositivo, channels=canales,
                        samplerate=frec_origen, dtype="float32") as stream:
        print(f"[captura] escuchando '{info['name']}' a {frec_origen} Hz")
        while not parar.is_set():
            datos, desbordado = stream.read(frames)
            if desbordado:
                print("[aviso] se perdió audio (overflow)", file=sys.stderr)
            mono = datos.mean(axis=1)
            cola.put(remuestrear(mono, frec_origen, FRECUENCIA_WHISPER))


def transcribir(modelo, audio, idioma):
    segmentos, _ = modelo.transcribe(audio, language=idioma, vad_filter=True, beam_size=1)
    return " ".join(s.text.strip() for s in segmentos).strip()


def pedir_sugerencia(cliente, modelo_claude, notas, lineas, sugerencias_previas):
    bloques_sistema = [{"type": "text", "text": PROMPT_SISTEMA}]
    if notas:
        bloques_sistema.append({
            "type": "text",
            "text": "Notas de la campaña y de los personajes:\n" + notas,
            "cache_control": {"type": "ephemeral"},
        })

    partes = ["Transcripción reciente:\n" + "\n".join(lineas)]
    if sugerencias_previas:
        partes.append("Sugerencias que ya diste (no repitas):\n" +
                      "\n---\n".join(sugerencias_previas))
    partes.append("Responde solo sobre lo más reciente de la transcripción.")

    respuesta = cliente.messages.create(
        model=modelo_claude,
        max_tokens=500,
        system=bloques_sistema,
        messages=[{"role": "user", "content": "\n\n".join(partes)}],
    )
    return "".join(b.text for b in respuesta.content if b.type == "text").strip()


def hilo_procesador(cola, parar, args, notas, log):
    print(f"[modelo] cargando Whisper '{args.whisper}'...")
    whisper = WhisperModel(args.whisper, device="cpu", compute_type="int8")
    cliente = None if args.solo_transcribir else anthropic.Anthropic()

    lineas = deque(maxlen=args.lineas_contexto)
    sugerencias = deque(maxlen=3)
    fragmentos_desde_sugerencia = 0

    while not parar.is_set():
        try:
            audio = cola.get(timeout=1)
        except queue.Empty:
            continue

        if np.sqrt(np.mean(audio ** 2)) < UMBRAL_SILENCIO:
            continue

        texto = transcribir(whisper, audio, args.idioma)
        if not texto:
            continue

        marca = datetime.now().strftime("%H:%M:%S")
        linea = f"[{marca}] {texto}"
        lineas.append(linea)
        print(f"\n🎙  {linea}")
        log.write(f"- {linea}\n")
        log.flush()

        if cliente is None:
            continue

        fragmentos_desde_sugerencia += 1
        if fragmentos_desde_sugerencia < args.sugerir_cada:
            continue
        fragmentos_desde_sugerencia = 0

        try:
            sugerencia = pedir_sugerencia(cliente, args.modelo, notas,
                                          list(lineas), list(sugerencias))
        except Exception as error:  # red, cuota, clave inválida, etc.
            print(f"[error API] {error}", file=sys.stderr)
            continue

        if sugerencia and MARCA_SIN_SUGERENCIA not in sugerencia:
            sugerencias.append(sugerencia)
            print(f"\n💡 Sugerencia:\n{sugerencia}\n")
            log.write(f"\n> 💡 **Sugerencia ({marca}):**\n> "
                      f"{sugerencia.replace(chr(10), chr(10) + '> ')}\n\n")
            log.flush()


def main():
    p = argparse.ArgumentParser(description="Copiloto de rol con transcripción y Claude.")
    p.add_argument("--listar", action="store_true", help="muestra los dispositivos de entrada")
    p.add_argument("--dispositivo", help="índice o parte del nombre del dispositivo de audio")
    p.add_argument("--chunk", type=float, default=20,
                   help="segundos por fragmento de audio (por defecto 20)")
    p.add_argument("--whisper", default="small",
                   help="modelo de Whisper: tiny, base, small, medium (por defecto small)")
    p.add_argument("--idioma", default="es", help="idioma de la transcripción (por defecto es)")
    p.add_argument("--modelo", default="claude-haiku-5-5",
                   help="modelo de Claude para las sugerencias")
    p.add_argument("--sugerir-cada", type=int, default=3,
                   help="pedir sugerencia cada N fragmentos con voz (por defecto 3)")
    p.add_argument("--lineas-contexto", type=int, default=40,
                   help="líneas de transcripción que se envían como contexto (por defecto 40)")
    p.add_argument("--notas", type=Path,
                   help="archivo de texto con notas de campaña y personajes")
    p.add_argument("--log", type=Path, default=Path("sesion.md"),
                   help="archivo donde se guarda la transcripción y las sugerencias")
    p.add_argument("--solo-transcribir", action="store_true",
                   help="no llama a Claude; solo transcribe")
    args = p.parse_args()

    if args.listar:
        listar_dispositivos()
        return
    if not args.dispositivo:
        raise SystemExit("Indica el dispositivo con --dispositivo (o usa --listar).")
    if not args.solo_transcribir:
        if anthropic is None:
            raise SystemExit("Falta el SDK de Anthropic: pip install -r requirements.txt")
        if not os.environ.get("ANTHROPIC_API_KEY"):
            raise SystemExit("Define la variable de entorno ANTHROPIC_API_KEY.")

    dispositivo = buscar_dispositivo(args.dispositivo)
    notas = args.notas.read_text(encoding="utf-8") if args.notas else ""

    cola = queue.Queue()
    parar = threading.Event()
    with args.log.open("a", encoding="utf-8") as log:
        log.write(f"\n## Sesión {datetime.now():%Y-%m-%d %H:%M}\n\n")
        hilo_cap = threading.Thread(target=capturar,
                                    args=(dispositivo, args.chunk, cola, parar), daemon=True)
        hilo_proc = threading.Thread(target=hilo_procesador,
                                     args=(cola, parar, args, notas, log), daemon=True)
        hilo_cap.start()
        hilo_proc.start()
        print("Copiloto activo. Ctrl+C para terminar.")
        try:
            while True:
                time.sleep(0.5)
        except KeyboardInterrupt:
            print("\nDeteniendo...")
            parar.set()
            hilo_cap.join(timeout=3)
            hilo_proc.join(timeout=5)


if __name__ == "__main__":
    main()

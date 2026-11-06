# Copiloto de rol

Herramienta local que escucha el audio de la partida (por ejemplo, la salida de Discord),
lo transcribe con Whisper en tu máquina y pide a Claude sugerencias para el director de juego.

No es un bot de Discord: solo captura el audio que ya se reproduce en tu computadora.

## Flujo

```
Audio de Discord → dispositivo de captura → fragmentos de 20 s → Whisper (local)
    → transcripción → Claude (sugerencias) → terminal + sesion.md
```

## Instalación

Requiere Python 3.9 o superior.

```bash
cd herramientas/copiloto-rol
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY="tu-clave"  # Windows (PowerShell): $env:ANTHROPIC_API_KEY="tu-clave"
```

## Preparar el audio

Necesitas un dispositivo de **entrada** que contenga lo que suena en Discord:

- **Linux (PipeWire/PulseAudio):** busca un dispositivo llamado `Monitor of ...` asociado a tus altavoces.
- **Windows:** activa "Mezcla estéreo" (Stereo Mix) en la configuración de sonido, o usa
  VB-CABLE y envía la salida de Discord a ese cable, reenviándola también a tus auriculares.
- **macOS:** instala BlackHole (o similar) y crea una salida múltiple con tus altavoces.

Luego verifica qué ve el programa:

```bash
python copiloto.py --listar
```

## Uso

```bash
python copiloto.py --dispositivo "Monitor" --notas notas_campana.txt
```

Opciones principales:

| Opción | Descripción |
| --- | --- |
| `--dispositivo` | Índice o parte del nombre del dispositivo de entrada. |
| `--notas` | Archivo de texto con resumen de la campaña, NPCs, personajes y hilos pendientes. |
| `--whisper` | Modelo de transcripción: `tiny`, `base`, `small` (por defecto), `medium`. Modelos más grandes son más precisos y más lentos. |
| `--modelo` | Modelo de Claude para las sugerencias (por defecto `claude-haiku-5-5`). |
| `--sugerir-cada` | Cada cuántos fragmentos con voz se pide una sugerencia (por defecto 3, es decir, ~1 minuto). |
| `--chunk` | Segundos por fragmento de audio (por defecto 20). |
| `--log` | Archivo donde se guarda la transcripción y las sugerencias (por defecto `sesion.md`). |
| `--solo-transcribir` | No llama a Claude; útil para probar la captura. |

Ctrl+C termina la sesión.

## Notas de diseño

- **Silencio:** los fragmentos sin voz (RMS bajo) no se transcriben ni se envían, para ahorrar tiempo y dinero.
- **Costo:** cada sugerencia envía solo las últimas transcripciones y las notas (con caché de prompt).
  Con `--sugerir-cada 3` y Haiku, el gasto por hora es bajo; si quieres más profundidad, usa un modelo mayor.
- **Limitaciones:** los cortes de 20 s pueden partir una frase; Whisper no sabe quién habla
  (no hay diarización). Para la sugerencia esto basta, pero no atribuye frases a jugadores.
- **Notas:** conviene escribir `notas_campana.txt` a mano (o exportar datos de las fichas de `public/`)
  para que Claude tenga el contexto de la campaña. No subas ese archivo al repositorio si contiene
  información privada de la mesa.

## Consideraciones

- Grabar o transcribir la voz de otras personas requiere su consentimiento. Avísales a los jugadores.
- La transcripción se hace localmente; solo el texto de cada consulta sale hacia la API de Anthropic.
- `sesion.md` puede contener todo lo que se dijo en la partida. Está pensado para tu máquina, no para el repositorio.

/*
 * ficha-vitales.js — vida, dados de golpe, salvaciones de muerte, estados, descansos y recursos de clase.
 *
 * Es la parte "de combate" de la ficha que hasta ahora estaba copiada (con pequeñas variantes) en cada HTML:
 * changeInputVal / updateHPDisplay / tirarHitDie / rollDeathSave / restShort / restLong / contadores de recurso.
 * Acá es una sola implementación guiada por datos y por los ids de siempre, así que los datos guardados de cada
 * personaje en Firebase (hp-cur, hd-N, ds-s1…, cond-*, slot-N-cur, <recurso>-use-N…) siguen valiendo tal cual.
 *
 * Lo monta ficha-shell.js (ficha.html), pero no depende de él: necesita ficha-common.js (guardarCampo, buffs) y,
 * si están, ficha-dados.js (tiradas), ficha-reglas.js (estados) y ficha-nivel.js (registro de subidas).
 *
 *   FichaVitales.iniciar({
 *     hpBase,                    PG máximos antes de las subidas de nivel registradas
 *     clases,                    [{ nombre, dado, nivelInicial }]  (para dados de golpe y nivel)
 *     recursos,                  [{ id, nombre, icono, tipo:'pips'|'pool'|'info', max, prefijo|campo, recarga, ... }] (ver abajo)
 *     espacios,                  () => { [nivel]: máx } ó null  (espacios de conjuro por nivel, para el descanso largo)
 *     modCON,                    () => modificador de CON
 *     alDescanso(tipo)           gancho extra (p. ej. los espacios de Pacto)
 *   })
 *
 * Recursos declarativos (campo `max` puede ser un número o una función (ctx) => número):
 *   { tipo:'pips',  id:'ws', nombre:'Forma Salvaje', icono:'🐾', max:2, prefijo:'ws-use-', recarga:'corto'|'largo'|null, desc:'…' }
 *        → casillas `<prefijo>1..N`; marcada = usada. Descanso las desmarca.
 *   { tipo:'pool',  id:'loh',  nombre:'Imposición de manos', max:(c)=>5*c.clase('Paladin'), campo:'lay-hands-cur', recarga:'largo' }
 *        → contador `<campo>` con máximo; el descanso lo lleva al máximo.
 *   { tipo:'info',  id:'sneak', nombre:'Sneak Attack', valor:(c)=>Math.ceil(c.clase('Rogue')/2)+'d6', formula:true }
 *        → solo muestra (y con `formula` ofrece botón de tirar).
 * ctx = { nivel, clase(nombre), mod(hab), prof }
 */
(function () {
  'use strict';

  const cfg = { hpBase: 0, clases: [], recursos: [], espacios: null, modCON: null, alDescanso: null };
  let iniciado = false;

  const $ = (id) => document.getElementById(id);
  const num = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
  const leer = (id, d) => { const e = $(id); return e ? num(e.value !== undefined && e.tagName !== 'SPAN' && e.tagName !== 'DIV' ? e.value : e.textContent, d) : d; };
  const guardar = (id, v) => { if (window.FichaComun) FichaComun.guardarCampo(id, v); };
  const soloLectura = () => !!document.querySelector('.readonly-mode');
  function disparar(el, tipo) { el.dispatchEvent(new Event(tipo, { bubbles: true })); }
  function dados() { return window.FichaDados || null; }
  function aviso(texto, tipo) {
    if (dados()) FichaDados.registrarUso(texto, tipo || 'recurso');
    else if (window.FichaComun && FichaComun.emitirUso) FichaComun.emitirUso(tipo || 'recurso', texto);
  }

  /* ---------- nivel y registro de subidas ---------- */
  function registro() {
    try { const a = JSON.parse((($('subidas-nivel-registro') || {}).value) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function nivelClase(nombre) {
    const c = cfg.clases.find(x => x.nombre === nombre);
    return (c ? (c.nivelInicial || 0) : 0) + registro().filter(r => r.clase === nombre).length;
  }
  function nivelTotal() {
    const base = cfg.clases.reduce((s, c) => s + (c.nivelInicial || 0), 0);
    return base + registro().length;
  }
  function ctx() {
    return {
      nivel: nivelTotal(),
      clase: nivelClase,
      mod: (h) => (window.FichaAtributos ? FichaAtributos.modDe(h) : 0),
      prof: window.FichaAtributos ? FichaAtributos.profBonusActual() : 2,
    };
  }

  /* ---------- puntos de golpe ---------- */
  function bonusHPSubidas() { return registro().reduce((s, r) => s + (r.hpGanado || 0), 0); }
  function hpMaxActual() {
    let max = cfg.hpBase + bonusHPSubidas() + leer('hp-max-buff', 0) + (window.FichaBuffs ? FichaBuffs.plano('hp-max') : 0);
    if (window.FichaReglas) { const f = FichaReglas.efectos().hpMaxFactor; if (f < 1) max = Math.floor(max * f); }
    return Math.max(1, max);
  }
  function pintarHP() {
    const cur = leer('hp-cur', 0), max = hpMaxActual();
    const pct = Math.max(0, Math.min(100, Math.round(cur / max * 100)));
    const barra = $('hp-barra');
    if (barra) {
      const r = barra.firstElementChild; if (r) r.style.width = pct + '%';
      barra.setAttribute('aria-valuenow', String(cur)); barra.setAttribute('aria-valuemax', String(max));
      barra.classList.remove('bien', 'aviso', 'mal'); barra.classList.add(pct > 50 ? 'bien' : pct > 25 ? 'aviso' : 'mal');
    }
    const m = $('hp-max-label'); if (m) m.textContent = String(max);
    const bar = $('barra-hp'); if (bar) bar.textContent = cur + ' / ' + max;
    const tot = $('hp-max-total'); if (tot && tot.textContent !== String(max) && !$('hp-max-buff')) tot.textContent = String(max);
    document.dispatchEvent(new CustomEvent('ficha:hp'));
  }
  function fijarHP(valor) {
    const el = $('hp-cur'); if (!el || soloLectura()) return;
    const v = Math.max(0, Math.min(hpMaxActual(), valor));
    el.value = String(v); disparar(el, 'input'); pintarHP();
    if (v === 0) aviso('Llegó a 0 PG', 'hp');
  }
  function cambiarHP(delta) { fijarHP(leer('hp-cur', 0) + delta); }
  /** Daño: primero se consumen los PG temporales (regla del SRD); el resto baja los PG. */
  function recibirDano(n) {
    if (soloLectura()) return;
    n = Math.max(0, n | 0); if (!n) return;
    const t = $('hp-temp-input');
    let resto = n;
    if (t) { const temp = num(t.value, 0), usados = Math.min(temp, resto); if (usados) { t.value = String(temp - usados); disparar(t, 'input'); resto -= usados; } }
    const antes = leer('hp-cur', 0);
    fijarHP(antes - resto);
    aviso('Recibió ' + n + ' de daño' + (resto !== n ? ' (' + (n - resto) + ' absorbido por PG temporales)' : '') + ': ' + antes + ' → ' + leer('hp-cur', 0) + ' PG', 'hp');
  }
  function curar(n) {
    if (soloLectura()) return;
    n = Math.max(0, n | 0); if (!n) return;
    const antes = leer('hp-cur', 0);
    fijarHP(antes + n);
    aviso('Se curó ' + n + ': ' + antes + ' → ' + leer('hp-cur', 0) + ' PG', 'hp');
  }

  /* ---------- dados de golpe ---------- */
  function resumenDados() {
    const por = {};
    cfg.clases.forEach(c => { const n = nivelClase(c.nombre); if (n) por[c.dado] = (por[c.dado] || 0) + n; });
    return por;
  }
  function listaHD() {
    const lista = [];
    cfg.clases.slice().sort((a, b) => b.dado - a.dado).forEach(c => { for (let i = 0; i < nivelClase(c.nombre); i++) lista.push(c.dado); });
    return lista;
  }
  function pintarHD() {
    const cont = $('hd-pips'); if (!cont) return;
    const lista = listaHD();
    if (cont.children.length !== lista.length) {
      cont.textContent = '';
      lista.forEach((dado, i) => {
        const id = 'hd-' + (i + 1);
        const lab = document.createElement('label'); lab.className = 'pip-casilla';
        lab.title = 'Dado de golpe d' + dado;
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.setAttribute('aria-label', 'Dado de golpe ' + (i + 1) + ' (d' + dado + ')');
        const sp = document.createElement('span'); sp.className = 'pip dado'; sp.setAttribute('aria-hidden', 'true');
        lab.append(cb, sp); cont.appendChild(lab);
      });
      if (window.FichaComun) FichaComun.reaplicarDatos();
    }
    const libres = lista.filter((_, i) => { const e = $('hd-' + (i + 1)); return e && !e.checked; }).length;
    const et = $('hd-cuenta'); if (et) et.textContent = libres + ' de ' + lista.length + ' disponibles';
    const por = resumenDados();
    const l = $('hd-label'); if (l) l.textContent = 'Dados de golpe (' + Object.keys(por).sort((a, b) => b - a).map(d => por[d] + 'd' + d).join(' + ') + ')';
  }
  function tirarHitDie() {
    if (soloLectura()) return;
    const lista = listaHD();
    let idx = -1;
    for (let i = 0; i < lista.length; i++) { const e = $('hd-' + (i + 1)); if (e && !e.checked) { idx = i; break; } }
    if (idx < 0) { if (dados()) FichaDados.mostrar('—', 'Sin dados de golpe', 'Se recuperan la mitad (mínimo 1) con un descanso largo.'); return; }
    const dado = lista[idx];
    const cb = $('hd-' + (idx + 1)); cb.checked = true; disparar(cb, 'change');
    const mod = cfg.modCON ? cfg.modCON() : ctx().mod('CON');
    const r = dados() ? FichaDados.tirar({ count: 1, sides: dado, mod }, 'Dado de golpe (d' + dado + (mod ? (mod > 0 ? '+' : '') + mod : '') + ')') : null;
    const total = r && !r.error ? Math.max(0, r.total) : 0;
    if (total) curar(total);
    pintarHD();
  }

  /* ---------- salvaciones de muerte ---------- */
  function salvacionDeMuerte() {
    if (soloLectura()) return;
    const d20 = 1 + Math.floor(Math.random() * 20);
    const exito = d20 >= 10, doble = d20 === 1 || d20 === 20;
    if (d20 === 20) { fijarHP(Math.max(1, leer('hp-cur', 0))); }
    const prefijo = exito ? 'ds-s' : 'ds-f';
    const cajas = [1, 2, 3].map(n => $(prefijo + n)).filter(Boolean);
    const libres = cajas.filter(c => !c.checked);
    libres.slice(0, doble ? 2 : 1).forEach(c => { c.checked = true; disparar(c, 'change'); });
    const marcadas = cajas.filter(c => c.checked).length;
    const detalle = d20 === 20 ? 'Natural 20: se levanta con 1 PG' : d20 === 1 ? 'Natural 1: dos fallos' : '';
    if (dados()) FichaDados.mostrar(d20, 'Salvación de muerte — ' + (exito ? 'éxito' : 'fallo') + ' (' + marcadas + '/3)', detalle || '[' + d20 + ']');
    if (marcadas >= 3 && dados()) FichaDados.mostrar('—', exito ? 'Estable' : 'Murió', exito ? '3 éxitos: el personaje se estabiliza.' : '3 fallos: el personaje muere.');
  }

  /* ---------- recursos de clase ---------- */
  function maxDe(r) { return typeof r.max === 'function' ? r.max(ctx()) : (r.max || 0); }
  function renderRecurso(r) {
    const cont = $('recurso-' + r.id); if (!cont) return;
    const cuerpo = cont.querySelector('.recurso-valor'); if (!cuerpo) return;
    if (r.tipo === 'pips') {
      const n = maxDe(r);
      if (cuerpo.querySelectorAll('input[type="checkbox"]').length !== n) {
        cuerpo.textContent = '';
        const grupo = document.createElement('div'); grupo.className = 'pips'; grupo.setAttribute('role', 'group'); grupo.setAttribute('aria-label', r.nombre);
        for (let i = 1; i <= n; i++) {
          const lab = document.createElement('label'); lab.className = 'pip-casilla';
          const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = r.prefijo + i; cb.dataset.recurso = r.id;
          cb.setAttribute('aria-label', r.nombre + ' — uso ' + i);
          const sp = document.createElement('span'); sp.className = 'pip'; sp.setAttribute('aria-hidden', 'true');
          lab.append(cb, sp); grupo.appendChild(lab);
        }
        cuerpo.appendChild(grupo);
        if (window.FichaComun) FichaComun.reaplicarDatos();
      }
      const usados = Array.from(cuerpo.querySelectorAll('input:checked')).length;
      const e = cont.querySelector('.recurso-cuenta'); if (e) e.textContent = (n - usados) + ' / ' + n;
    } else if (r.tipo === 'pool') {
      const max = maxDe(r);
      const val = $(r.campo), mx = $(r.campo + '-max');
      if (mx) mx.textContent = String(max);
      if (val) val.dataset.max = String(max);
      const barra = cont.querySelector('.progreso');
      if (barra && val) { const pct = max ? Math.max(0, Math.min(100, Math.round(num(val.textContent, 0) / max * 100))) : 0; if (barra.firstElementChild) barra.firstElementChild.style.width = pct + '%'; }
    } else if (r.tipo === 'info') {
      const v = $('recurso-valor-' + r.id); if (v) v.textContent = typeof r.valor === 'function' ? r.valor(ctx()) : String(r.valor);
    }
  }
  function pintarRecursos() { cfg.recursos.forEach(renderRecurso); }
  function cambiarPool(campo, delta, nombre) {
    if (soloLectura()) return;
    const el = $(campo); if (!el) return;
    const r = cfg.recursos.find(x => x.campo === campo);
    const max = r ? maxDe(r) : Infinity;
    const antes = num(el.textContent, 0);
    const nuevo = Math.max(0, Math.min(max, antes + delta));
    el.textContent = String(nuevo); guardar(campo, nuevo);
    if (r) renderRecurso(r);
    if (nuevo !== antes) aviso((nombre || campo) + ': ' + antes + ' → ' + nuevo + ' / ' + max, 'recurso');
  }
  function cambiarContador(id, delta, nombre) {
    if (soloLectura()) return;
    const el = $(id); if (!el) return;
    const antes = num(el.textContent, 0);
    const nuevo = Math.max(0, antes + delta);
    el.textContent = String(nuevo); guardar(id, nuevo);
    if (nuevo !== antes) aviso((nombre || id) + ': ' + antes + ' → ' + nuevo, /^slot-/.test(id) ? 'hechizo' : 'recurso');
  }

  /* ---------- descansos ---------- */
  function descansoCorto() {
    if (soloLectura()) return;
    cfg.recursos.forEach(r => {
      if (r.recarga !== 'corto') return;
      if (r.tipo === 'pips') document.querySelectorAll('input[data-recurso="' + r.id + '"]').forEach(cb => { if (cb.checked) { cb.checked = false; disparar(cb, 'change'); } });
      else if (r.tipo === 'pool') { const el = $(r.campo); if (el) { el.textContent = String(maxDe(r)); guardar(r.campo, maxDe(r)); } }
    });
    if (cfg.alDescanso) cfg.alDescanso('corto');
    pintarRecursos(); pintarHD();
    aviso('Descanso corto: recursos de descanso corto restablecidos', 'descanso');
  }
  function descansoLargo() {
    if (soloLectura()) return;
    fijarHP(hpMaxActual());
    const t = $('hp-temp-input'); if (t && num(t.value, 0) !== 0) { t.value = '0'; disparar(t, 'input'); }
    // Dados de golpe: se recupera la mitad del total (mínimo 1), sin pasarse.
    const lista = listaHD();
    const usados = lista.map((_, i) => $('hd-' + (i + 1))).filter(e => e && e.checked);
    let devolver = Math.max(1, Math.floor(lista.length / 2));
    usados.reverse().forEach(e => { if (devolver > 0) { e.checked = false; disparar(e, 'change'); devolver--; } });
    // Salvaciones de muerte
    ['s', 'f'].forEach(p => [1, 2, 3].forEach(n => { const e = $('ds-' + p + n); if (e && e.checked) { e.checked = false; disparar(e, 'change'); } }));
    // Recursos (corto y largo)
    cfg.recursos.forEach(r => {
      if (r.recarga !== 'corto' && r.recarga !== 'largo') return;
      if (r.tipo === 'pips') document.querySelectorAll('input[data-recurso="' + r.id + '"]').forEach(cb => { if (cb.checked) { cb.checked = false; disparar(cb, 'change'); } });
      else if (r.tipo === 'pool') { const el = $(r.campo); if (el) { el.textContent = String(maxDe(r)); guardar(r.campo, maxDe(r)); } }
    });
    // Espacios de conjuro
    const esp = cfg.espacios ? cfg.espacios() : null;
    if (esp) Object.keys(esp).forEach(n => { const el = $('slot-' + n + '-cur'); if (el) { el.textContent = String(esp[n]); guardar('slot-' + n + '-cur', esp[n]); } });
    // Agotamiento: un descanso largo quita 1 nivel
    const ex = $('exhaustion-level');
    if (ex && num(ex.value, 0) > 0) { ex.value = String(num(ex.value, 0) - 1); disparar(ex, 'input'); disparar(ex, 'change'); }
    // Concentración
    if (window.FichaComun) { try { const c = $('concentracion-actual'); if (c && c.value) { c.value = ''; guardar('concentracion-actual', ''); document.dispatchEvent(new CustomEvent('ficha:buffs')); } } catch (e) { /* noop */ } }
    if (cfg.alDescanso) cfg.alDescanso('largo');
    pintarRecursos(); pintarHD(); pintarHP();
    aviso('Descanso largo: PG, dados de golpe (la mitad), espacios y recursos restablecidos', 'descanso');
  }

  /* ---------- estados (condiciones y agotamiento) ---------- */
  function pintarEstados() {
    const cont = $('estados-activos'); if (!cont || !window.FichaReglas) return;
    const e = FichaReglas.estados();
    cont.textContent = '';
    e.condiciones.forEach(id => {
      const c = FichaReglas.condicion(id); if (!c) return;
      const chip = document.createElement('span'); chip.className = 'cond-chip'; chip.title = c.resumen;
      chip.textContent = c.icono + ' ' + c.nombre + ' ';
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-clear'; x.textContent = '✖';
      x.setAttribute('aria-label', 'Quitar estado ' + c.nombre);
      x.addEventListener('click', () => { const cb = $('cond-' + id); if (cb && !soloLectura()) { cb.checked = false; disparar(cb, 'change'); } });
      chip.appendChild(x); cont.appendChild(chip);
    });
    if (e.agotamiento) {
      const chip = document.createElement('span'); chip.className = 'cond-chip'; chip.textContent = '🥱 Agotamiento ' + e.agotamiento;
      const n = FichaReglas.datos().agotamiento.find(x => x.nivel === e.agotamiento); if (n) chip.title = n.texto;
      cont.appendChild(chip);
    }
    if (!cont.children.length) { const v = document.createElement('span'); v.className = 'texto-suave'; v.textContent = 'Sin estados activos.'; cont.appendChild(v); }
    const ef = FichaReglas.efectos();
    const nota = $('estados-efectos');
    if (nota) {
      const t = [];
      if (ef.ataque && ef.ataque !== 'cancelan') t.push('ataques con ' + ef.ataque);
      if (ef.pruebas && ef.pruebas !== 'cancelan') t.push('pruebas con ' + ef.pruebas);
      if (ef.salvaciones && ef.salvaciones !== 'cancelan') t.push('salvaciones con ' + ef.salvaciones);
      if (ef.autoFalla.length) t.push('falla automáticamente salvaciones de ' + ef.autoFalla.join('/'));
      if (ef.velocidadFactor === 0) t.push('velocidad 0'); else if (ef.velocidadFactor < 1) t.push('velocidad ×' + ef.velocidadFactor);
      if (ef.hpMaxFactor < 1) t.push('PG máximos a la mitad');
      if (ef.incapacitado) t.push('sin acciones ni reacciones');
      if (ef.muerte) t.push('☠️ muerte');
      nota.textContent = t.length ? 'Efectos automáticos: ' + t.join('; ') + '.' : '';
    }
    pintarHP();
    document.dispatchEvent(new CustomEvent('ficha:atributos'));
  }

  function iniciar(opts) {
    Object.assign(cfg, opts || {});
    window.hpMaxActual = hpMaxActual;
    window.FichaVitales = API;
    if (iniciado) return API;
    iniciado = true;
    const refrescar = () => { pintarHP(); pintarHD(); pintarRecursos(); pintarEstados(); };
    document.addEventListener('ficha:datos-sincronizados', refrescar);
    document.addEventListener('ficha:buffs', pintarHP);
    document.addEventListener('ficha:estados', pintarEstados);
    document.addEventListener('input', (e) => { if (e.target && (e.target.id === 'hp-max-buff' || e.target.id === 'exhaustion-level')) { pintarHP(); if (e.target.id === 'exhaustion-level') pintarEstados(); } });
    document.addEventListener('change', (e) => { if (e.target && /^hd-\d+$/.test(e.target.id || '')) pintarHD(); if (e.target && e.target.dataset && e.target.dataset.recurso) { const r = cfg.recursos.find(x => x.id === e.target.dataset.recurso); if (r) { renderRecurso(r); if (e.target.checked) aviso(r.nombre + ': usó 1', 'recurso'); } } });
    const hp = $('hp-cur'); if (hp) hp.addEventListener('change', () => fijarHP(num(hp.value, 0)));
    refrescar();
    return API;
  }

  const API = { iniciar, hpMaxActual, cambiarHP, fijarHP, recibirDano, curar, tirarHitDie, salvacionDeMuerte, descansoCorto, descansoLargo, cambiarPool, cambiarContador, nivelTotal, nivelClase, registro, pintarHP, pintarHD, pintarRecursos, pintarEstados, ctx, listaHD };
  window.FichaVitales = API;
})();

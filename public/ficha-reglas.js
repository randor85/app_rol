/*
 * ficha-reglas.js — reglas automatizables (condiciones y agotamiento) sobre el compendio reglas_srd2014_data.js.
 *
 * Módulo compartido, sin framework. Responde a una sola pregunta: "dados los estados que tiene el personaje,
 * ¿qué cambia en sus tiradas, su velocidad y sus PG máximos?". Los demás módulos le preguntan:
 *   - ficha-dados.js  → FichaReglas.ventaja({ categoria, habilidad })  al tirar un d20.
 *   - ficha-party.js  → FichaReglas.estados()                          para mostrar chips de condición.
 *   - la ficha        → FichaReglas.efectos().velocidadFactor / .hpMaxFactor para los totales.
 *
 * De dónde salen los estados (se puede reemplazar con iniciar({ leerEstados })):
 *   por defecto, las casillas marcadas `#cond-<id>` de la ficha (cond-blinded, cond-prone…, el mismo dato que ya
 *   guarda el autoguardado en datos/cond-<id>); `#cond-exhaustion` marcada = agotamiento 1, o el valor numérico
 *   de `#exhaustion-level` / `#cond-exhaustion-level` si existe.
 *
 * Aviso 'ficha:estados' (CustomEvent en document) cuando cambia el conjunto de estados activos.
 */
(function () {
  'use strict';
  const datos = () => (typeof REGLAS_SRD2014 !== 'undefined' ? REGLAS_SRD2014 : { condiciones: [], agotamiento: [] });
  const cfg = { leerEstados: null };
  let ultima = '';

  function condicion(id) { return datos().condiciones.find(c => c.id === id) || null; }
  function listaCondiciones() { return datos().condiciones.slice(); }

  function leerEstadosPorDefecto() {
    const ids = [];
    document.querySelectorAll('input[type="checkbox"][id^="cond-"]').forEach(cb => {
      const id = cb.id.slice(5);
      if (cb.checked && id !== 'exhaustion' && condicion(id)) ids.push(id);
    });
    let agotamiento = 0;
    const casilla = document.getElementById('cond-exhaustion');
    const nivelEl = document.getElementById('exhaustion-level') || document.getElementById('cond-exhaustion-level');
    if (nivelEl) agotamiento = Math.max(0, Math.min(6, parseInt(nivelEl.value !== undefined && nivelEl.value !== '' ? nivelEl.value : nivelEl.textContent, 10) || 0));
    if (casilla && casilla.checked) agotamiento = Math.max(agotamiento, 1);   // casilla heredada: cuenta como nivel 1
    return { condiciones: ids, agotamiento };
  }

  /** { condiciones: ['poisoned', …], agotamiento: 0-6 } */
  function estados() {
    const e = cfg.leerEstados ? cfg.leerEstados() : leerEstadosPorDefecto();
    return { condiciones: (e && e.condiciones) || [], agotamiento: (e && e.agotamiento) || 0 };
  }

  // Las fichas usan STR/DEX/WIS/CHA (FichaAtributos); el compendio, FUE/DES/SAB/CAR. Se aceptan ambas.
  const A_ES = { STR: 'FUE', DEX: 'DES', CON: 'CON', INT: 'INT', WIS: 'SAB', CHA: 'CAR', FUE: 'FUE', DES: 'DES', SAB: 'SAB', CAR: 'CAR' };
  const normalizar = (h) => (h ? (A_ES[String(h).toUpperCase()] || null) : null);
  const PESO = { ventaja: 1, desventaja: -1 };
  function mezclar(actual, nuevo) {   // ventaja y desventaja se cancelan; varias del mismo signo cuentan una vez
    if (!nuevo) return actual;
    if (!actual) return nuevo;
    return actual === nuevo ? actual : 'cancelan';
  }

  /**
   * Efectos acumulados de los estados activos.
   * { ataque, pruebas, salvaciones, salvacionesPor:{DES:…}, autoFalla:[…], velocidadFactor, hpMaxFactor,
   *   incapacitado, muerte, fuentes:[{ nombre, texto }] }   — ataque/pruebas/salvaciones: 'ventaja'|'desventaja'|'cancelan'|null
   */
  function efectos(est) {
    const e = est || estados();
    const r = { ataque: null, pruebas: null, salvaciones: null, salvacionesPor: {}, autoFalla: [], velocidadFactor: 1, hpMaxFactor: 1, incapacitado: false, muerte: false, fuentes: [] };
    const aplicar = (ef, nombre) => {
      if (!ef) return;
      r.ataque = mezclar(r.ataque, ef.ataque);
      r.pruebas = mezclar(r.pruebas, ef.pruebas);
      r.salvaciones = mezclar(r.salvaciones, ef.salvaciones);
      Object.keys(ef.salvacionesPor || {}).forEach(k => { r.salvacionesPor[k] = mezclar(r.salvacionesPor[k], ef.salvacionesPor[k]); });
      (ef.autoFalla || []).forEach(k => { if (r.autoFalla.indexOf(k) < 0) r.autoFalla.push(k); });
      if (ef.velocidad !== undefined) r.velocidadFactor = Math.min(r.velocidadFactor, ef.velocidad);
      if (ef.hpMaxFactor !== undefined) r.hpMaxFactor = Math.min(r.hpMaxFactor, ef.hpMaxFactor);
      if (ef.incapacitado) r.incapacitado = true;
      if (ef.muerte) r.muerte = true;
      r.fuentes.push(nombre);
    };
    e.condiciones.forEach(id => { const c = condicion(id); if (c) aplicar(c.efectos, c.nombre); });
    datos().agotamiento.filter(n => n.nivel <= e.agotamiento).forEach(n => aplicar(n.efectos, 'Agotamiento ' + n.nivel));
    return r;
  }

  /**
   * ¿Qué tipo de tirada fuerzan los estados? categoria: 'ataque' | 'pruebas' | 'salvaciones' (alias 'check', 'save').
   * habilidad: 'DES', 'FUE'… (para salvaciones concretas). Devuelve { estado:'advantage'|'disadvantage'|'normal',
   * autoFalla:boolean, motivo:string }.
   */
  function ventaja(o) {
    const op = o || {};
    const alias = { check: 'pruebas', prueba: 'pruebas', save: 'salvaciones', salvacion: 'salvaciones', attack: 'ataque' };
    const cat = alias[op.categoria] || op.categoria;
    const ef = efectos();
    const hab = normalizar(op.habilidad);
    let v = null;
    if (cat === 'ataque') v = ef.ataque;
    else if (cat === 'pruebas') v = ef.pruebas;
    else if (cat === 'salvaciones') {
      v = ef.salvaciones;
      if (hab && ef.salvacionesPor[hab]) v = mezclar(v, ef.salvacionesPor[hab]);
    }
    const autoFalla = cat === 'salvaciones' && !!hab && ef.autoFalla.indexOf(hab) >= 0;
    const estado = v === 'ventaja' ? 'advantage' : v === 'desventaja' ? 'disadvantage' : 'normal';
    let motivo = '';
    if (v === 'cancelan') motivo = 'ventaja y desventaja por estados se cancelan';
    else if (v) motivo = (v === 'ventaja' ? 'ventaja' : 'desventaja') + ' por ' + ef.fuentes.join(', ');
    return { estado, autoFalla, motivo };
  }

  /**
   * Completa un desplegable de estados existente con las condiciones del SRD que le falten y agrega el nivel de
   * agotamiento. Las casillas son `#cond-<id>` (el mismo dato que ya guardan las fichas en datos/cond-<id>) y llaman a
   * updateConditions() de la ficha si existe. opts: { idioma:'en'|'es' (texto de value), conAgotamiento:true }.
   */
  function poblarDesplegable(contenedorId, opts) {
    const cont = document.getElementById(contenedorId); if (!cont) return 0;
    const o = opts || {};
    let agregadas = 0;
    datos().condiciones.forEach(c => {
      if (document.getElementById('cond-' + c.id)) return;
      const lab = document.createElement('label');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'cond-' + c.id;
      cb.value = o.idioma === 'es' ? c.nombre : c.en; cb.setAttribute('data-type', 'debuff');
      cb.addEventListener('change', () => { if (typeof window.updateConditions === 'function') window.updateConditions(); });
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' ' + c.icono + ' ' + (o.idioma === 'es' ? c.nombre + ' (' + c.en + ')' : c.en)));
      lab.title = c.resumen;
      cont.appendChild(lab); agregadas++;
    });
    if (o.conAgotamiento !== false && !document.getElementById('exhaustion-level')) {
      const lab = document.createElement('label'); lab.title = datos().agotamiento.map(n => n.nivel + ': ' + n.texto).join('\n');
      lab.appendChild(document.createTextNode('🥱 Agotamiento (0-6) '));
      const n = document.createElement('input'); n.type = 'number'; n.id = 'exhaustion-level'; n.min = '0'; n.max = '6'; n.value = '0'; n.style.width = '3.5rem';
      lab.appendChild(n); cont.appendChild(lab);
    }
    avisarSiCambio();
    return agregadas;
  }

  function iniciar(opts) { cfg.leerEstados = (opts && opts.leerEstados) || null; avisarSiCambio(); return FichaReglas; }

  function avisarSiCambio() {
    const e = estados();
    const clave = JSON.stringify([e.condiciones.slice().sort(), e.agotamiento]);
    if (clave === ultima) return;
    ultima = clave;
    document.dispatchEvent(new CustomEvent('ficha:estados', { detail: e }));
  }
  document.addEventListener('change', (ev) => { if (ev.target && /^(cond-|exhaustion)/.test(ev.target.id || '')) avisarSiCambio(); });
  document.addEventListener('input', (ev) => { if (ev.target && /^exhaustion/.test(ev.target.id || '')) avisarSiCambio(); });
  document.addEventListener('ficha:datos-sincronizados', avisarSiCambio);

  window.FichaReglas = { normalizar, poblarDesplegable, iniciar, estados, efectos, ventaja, condicion, listaCondiciones, datos, _mezclar: mezclar, _peso: PESO };
})();

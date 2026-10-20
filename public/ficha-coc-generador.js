/*
 * ficha-coc-generador.js — arma la DEFINICIÓN de un investigador de Call of Cthulhu a partir de lo que elige el creador (crear-investigador.html).
 *
 * Lógica pura (sin DOM ni Firebase), igual que ficha-generador.js (D&D). Necesita coc_data.js y ficha-coc-reglas.js.
 *
 *   FichaCoCGenerador.generar(form)  → { id, nodo, definicion, resumen }      (nodo = lo que se escribe en Firebase)
 *   FichaCoCGenerador.validar(form)  → [mensajes de error en español]
 *   FichaCoCGenerador.valoresBase(c) → { <id de habilidad>: valor base }       (con las características dadas)
 *
 * form = {
 *   nombre, jugador, ocupacion, edad, residencia, nacimiento, genero, descripcion, paleta,
 *   caracteristicas:{ str, con, siz, dex, app, int, pow, edu }, suerte,
 *   formulaOcupacion:'edu4',
 *   habilidades:[ { id, nombre, en?, base, ocup, interes } ],          valor final = base + ocup + interes (máx. 99)
 *   armas:[ índices de COC_ARMAS ] | [ { …arma } ],
 *   trasfondo:{ ideologia, personas, lugar, pertenencia, rasgos, heridas, fobias, tomos }, equipamiento, finanzas,
 *   capacidades:[ …capacidad… ], descanso:{ pv, pm, san }, importado:true (no exige gastar todos los puntos)
 * }
 * Los textos que escribe la persona se guardan como TEXTO PLANO: la ficha los escapa al dibujarlos.
 */
(function (global) {
  'use strict';

  const R = () => global.FichaCoCReglas;
  const CARAC = ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu'];
  const NOMBRE_CARAC = { str: 'Fuerza', con: 'Constitución', siz: 'Tamaño', dex: 'Destreza', app: 'Aspecto', int: 'Inteligencia', pow: 'Poder', edu: 'Educación' };
  const entero = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
  const slug = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'inv';
  const num = (c, k) => entero((c || {})[k], 0);
  const habBase = () => (typeof COC_HABILIDADES !== 'undefined' ? COC_HABILIDADES : []);
  const armasBase = () => (typeof COC_ARMAS !== 'undefined' ? COC_ARMAS : []);

  function valoresBase(c) {
    const o = {}; habBase().forEach((h) => { o[h.id] = R().valorBase(h.base, c); });
    return o;
  }
  const valorFinal = (h) => Math.max(0, Math.min(99, entero(h.base, 0) + entero(h.ocup, 0) + entero(h.interes, 0)));
  function puntosGastados(form) {
    let ocup = 0, interes = 0;
    (form.habilidades || []).forEach((h) => { ocup += Math.max(0, entero(h.ocup, 0)); interes += Math.max(0, entero(h.interes, 0)); });
    return { ocup, interes };
  }

  function validar(form) {
    const e = [];
    if (!String(form.nombre || '').trim()) e.push('Pon un nombre al investigador.');
    const edad = entero(form.edad, 0);
    if (!(edad >= 15 && edad <= 89)) e.push('La edad tiene que estar entre 15 y 89 años.');
    CARAC.forEach((k) => { const v = num(form.caracteristicas, k); if (!(v >= 1 && v <= 99)) e.push(`${NOMBRE_CARAC[k]} (${k.toUpperCase()}) tiene que estar entre 1 y 99.`); });
    const s = entero(form.suerte, -1); if (!(s >= 1 && s <= 99)) e.push('La Suerte tiene que estar entre 1 y 99.');
    if (!form.importado) {
      const pool = { ocup: R().puntosOcupacion(form.formulaOcupacion, form.caracteristicas), interes: R().puntosInteres(form.caracteristicas) };
      const g = puntosGastados(form);
      if (g.ocup > pool.ocup) e.push(`Gastaste ${g.ocup} puntos de ocupación y tienes ${pool.ocup}.`);
      if (g.interes > pool.interes) e.push(`Gastaste ${g.interes} puntos de interés personal y tienes ${pool.interes}.`);
    }
    (form.habilidades || []).forEach((h) => { if (!String(h.nombre || '').trim()) e.push('Hay una habilidad sin nombre.'); if (valorFinalDe(h) > 99) e.push(`${h.nombre}: pasa de 99 %.`); });
    return e;
  }
  const valorFinalDe = (h) => entero(h.base, 0) + entero(h.ocup, 0) + entero(h.interes, 0);

  function generar(form) {
    const errores = validar(form);
    if (errores.length) { const x = new Error(errores.join(' ')); x.errores = errores; throw x; }
    const car = {}; CARAC.forEach((k) => { car[k] = num(form.caracteristicas, k); });
    const nombre = String(form.nombre).trim().slice(0, 60);
    const id = form.id || ('pc_' + slug(nombre) + '_' + Math.random().toString(36).slice(2, 6));
    const habilidades = (form.habilidades || []).filter((h) => String(h.nombre || '').trim()).map((h) => {
      const o = { id: String(h.id || slug(h.nombre)).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40), nombre: String(h.nombre).trim().slice(0, 60), val: Math.min(99, valorFinalDe(h)) };
      if (h.en) o.en = String(h.en).slice(0, 60);
      if (entero(h.ocup, 0) > 0) o.ocup = true;
      return o;
    });
    const mitos = (habilidades.find((h) => h.id === 'cthulhu_mythos') || { val: 0 }).val;
    const d = R().derivadas(car, { edad: form.edad, mitos });
    const armas = (form.armas || []).map((a) => (typeof a === 'number' ? armasBase()[a] : a)).filter(Boolean).map((a) => JSON.parse(JSON.stringify(a)));
    const t = form.trasfondo || {};
    const info = { jugador: form.jugador || '', ocupacion: form.ocupacion || '', edad: String(entero(form.edad, 0)), residencia: form.residencia || '', nacimiento: form.nacimiento || '', genero: form.genero || '', movimiento: String(d.mov), credito: String((habilidades.find((h) => h.id === 'credit_rating') || { val: 0 }).val), descripcion: form.descripcion || '' };
    const definicion = {
      id, nombre, sistema: 'coc', paleta: form.paleta || 'ascua',
      subtitulo: [form.ocupacion, form.edad ? form.edad + ' años' : ''].filter(Boolean).join(' · '),
      info, caracteristicas: car, suerte: entero(form.suerte, 50), suerteMax: entero(form.suerte, 50),
      pv: { max: d.pvMax, actual: d.pvMax }, pm: { max: d.pmMax, actual: d.pmMax }, san: { max: d.sanMax, actual: Math.min(d.sanInicial, d.sanMax), inicial: d.sanInicial },
      habilidades, armas, capacidades: (form.capacidades || []).map((c) => JSON.parse(JSON.stringify(c))),
      equipamiento: form.equipamiento || '', finanzas: form.finanzas || '',
      trasfondo: ['ideologia', 'personas', 'lugar', 'pertenencia', 'rasgos', 'heridas', 'fobias', 'tomos'].reduce((o, k) => { if (t[k] && String(t[k]).trim()) o[k] = String(t[k]); return o; }, {}),
      descanso: form.descanso || { pv: 'max', pm: 'max', san: 'ninguno' },
    };
    // Firebase no guarda undefined ni arreglos vacíos: se limpia para que lo escrito sea exactamente lo que se lee.
    const limpio = JSON.parse(JSON.stringify(definicion));
    const nodo = {
      nombre, clase: String(form.ocupacion || 'Investigador'), sistema: 'coc', definicion: limpio,
      datos: { 'hp-curr': d.pvMax, 'hp-max': d.pvMax, 'mp-curr': d.pmMax, 'mp-max': d.pmMax, 'san-curr': limpio.san.actual, 'san-max': d.sanMax, 'luck-curr': limpio.suerte, 'luck-max': limpio.suerte, 'san-inicio-dia': limpio.san.actual },
    };
    return { id, nodo, definicion: limpio, resumen: { ocupacion: info.ocupacion, edad: info.edad, pv: d.pvMax, pm: d.pmMax, san: limpio.san.actual } };
  }

  global.FichaCoCGenerador = { generar, validar, valoresBase, puntosGastados, valorFinal, CARAC, NOMBRE_CARAC };
})(typeof window !== 'undefined' ? window : globalThis);

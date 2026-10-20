/*
 * ficha-coc-reglas.js — reglas de Call of Cthulhu (7.ª edición) como funciones puras (sin DOM ni Firebase).
 *
 * Lo usan la ficha (ficha-coc.js), el creador de investigadores y las pruebas. Solo mecánica: umbrales, derivadas y tiradas;
 * ningún texto del manual. Los dados se pueden inyectar (`rnd(lados)`) para probar resultados exactos.
 *
 *   FichaCoCReglas.mitad(v), quinto(v)
 *   FichaCoCReglas.nivelExito(tirada, objetivo)        → { nivel, texto, css, exito }   nivel: 'critico'|'extremo'|'dificil'|'regular'|'fallo'|'pifia'
 *   FichaCoCReglas.tirarD100({ bonus, rnd })           → { total, unidades, decenas:[…], elegida, bonus }   bonus: +n dados de bonificación, −n de penalización
 *   FichaCoCReglas.tirarHabilidad(objetivo, { bonus, dificultad, rnd }) → { tirada, objetivo, nivel…, cumple }   dificultad: 'regular'|'dificil'|'extremo'
 *   FichaCoCReglas.suerteParaExito(tirada, objetivo, dificultad)       → puntos de Suerte para que la tirada cumpla (o null)
 *   FichaCoCReglas.derivadas(c, { edad, mitos })       → { pvMax, pmMax, sanInicial, sanMax, mov, bonoDano, corpulencia }
 *   FichaCoCReglas.bonoDanoDe(str, siz)                → { dado:'+1D4'|'-1'|'0'…, corpulencia }
 *   FichaCoCReglas.valorBase(base, c)                  → número (base fijo o fórmula 'dex/2', 'edu')
 *   FichaCoCReglas.mejoraHabilidad(valor, { rnd })     → { tirada, mejora, nuevo, ganaCordura }   fase de desarrollo (una habilidad marcada)
 *   FichaCoCReglas.parsearPerdida(texto)               → { exito:'0', fallo:'1d4' }   de «0/1d4»
 *   FichaCoCReglas.tirarFormula(texto, { rnd })        → { total, detalle }   «1d10+2», «2D6», «3»
 *   FichaCoCReglas.danoDeArma(arma, { nivel, bonoDano, rnd }) → { total, detalle }   incluye el bono de daño y el empalamiento
 *   FichaCoCReglas.puntosOcupacion(id, c)              → número   (con COC_PUNTOS_OCUPACION)
 *   FichaCoCReglas.perdidaDeCordura(...)               → aplica una pérdida y devuelve avisos de locura
 */
(function (global) {
  'use strict';

  const defRnd = (lados) => 1 + Math.floor(Math.random() * lados);
  const mitad = (v) => Math.floor((parseInt(v, 10) || 0) / 2);
  const quinto = (v) => Math.floor((parseInt(v, 10) || 0) / 5);

  /* ---------- niveles de éxito ---------- */
  const NIVELES = {
    critico: { texto: '¡ÉXITO CRÍTICO!', css: 'log-critical', exito: true, rango: 5 },
    extremo: { texto: 'ÉXITO EXTREMO', css: 'log-extreme', exito: true, rango: 4 },
    dificil: { texto: 'ÉXITO DIFÍCIL', css: 'log-hard', exito: true, rango: 3 },
    regular: { texto: 'ÉXITO REGULAR', css: 'log-success', exito: true, rango: 2 },
    fallo: { texto: 'FALLO', css: 'log-fail', exito: false, rango: 1 },
    pifia: { texto: '¡PIFIA / FALLO CRÍTICO!', css: 'log-fumble', exito: false, rango: 0 },
  };
  function nivelExito(tirada, objetivo) {
    const t = parseInt(tirada, 10), o = parseInt(objetivo, 10) || 0;
    let nivel;
    if (t === 1) nivel = 'critico';
    else if (t === 100 || (o < 50 && t >= 96)) nivel = 'pifia';
    else if (t <= quinto(o)) nivel = 'extremo';
    else if (t <= mitad(o)) nivel = 'dificil';
    else if (t <= o) nivel = 'regular';
    else nivel = 'fallo';
    return Object.assign({ nivel }, NIVELES[nivel]);
  }
  // ¿La tirada cumple la dificultad pedida? (un crítico cumple cualquiera; una pifia o un fallo, ninguna)
  function cumple(nivel, dificultad) {
    const pedido = NIVELES[dificultad || 'regular'] ? NIVELES[dificultad || 'regular'].rango : 2;
    return NIVELES[nivel].exito && NIVELES[nivel].rango >= pedido;
  }

  /* ---------- d100 con dados de bonificación / penalización ---------- */
  // Un d100 son dos d10: unidades y decenas (00–90). Con bonificación se tiran decenas de más y se queda la MENOR; con penalización, la MAYOR.
  function tirarD100(o) {
    o = o || {};
    const rnd = o.rnd || defRnd, bonus = parseInt(o.bonus, 10) || 0;
    const unidades = rnd(10) - 1;
    const decenas = [];
    for (let i = 0; i < 1 + Math.abs(bonus); i++) decenas.push((rnd(10) - 1) * 10);
    const candidatos = decenas.map((d) => (d + unidades === 0 ? 100 : d + unidades));
    const elegida = bonus > 0 ? Math.min.apply(null, candidatos) : bonus < 0 ? Math.max.apply(null, candidatos) : candidatos[0];
    return { total: elegida, unidades, decenas, candidatos, bonus };
  }
  function tirarHabilidad(objetivo, o) {
    o = o || {};
    const t = tirarD100(o);
    const r = nivelExito(t.total, objetivo);
    return Object.assign({}, t, r, { tirada: t.total, objetivo: parseInt(objetivo, 10) || 0, dificultad: o.dificultad || 'regular', cumple: cumple(r.nivel, o.dificultad) });
  }
  // Gastar Suerte baja la tirada punto a punto: cuántos puntos hacen falta para que cumpla la dificultad (no se puede con una pifia de 100).
  function suerteParaExito(tirada, objetivo, dificultad) {
    const o = parseInt(objetivo, 10) || 0;
    const meta = dificultad === 'extremo' ? quinto(o) : dificultad === 'dificil' ? mitad(o) : o;
    const t = parseInt(tirada, 10);
    if (t <= meta) return 0;
    return t - meta;
  }

  /* ---------- valores derivados ---------- */
  function bonoDanoDe(str, siz) {
    const suma = (parseInt(str, 10) || 0) + (parseInt(siz, 10) || 0);
    if (suma <= 64) return { dado: '-2', corpulencia: -2 };
    if (suma <= 84) return { dado: '-1', corpulencia: -1 };
    if (suma <= 124) return { dado: '0', corpulencia: 0 };
    if (suma <= 164) return { dado: '+1D4', corpulencia: 1 };
    if (suma <= 204) return { dado: '+1D6', corpulencia: 2 };
    const extra = Math.ceil((suma - 204) / 80);   // +1D6 y +1 de corpulencia por cada 80 puntos de más
    return { dado: '+' + (1 + extra) + 'D6', corpulencia: 2 + extra };
  }
  function movimiento(c, edad) {
    const str = c.str, dex = c.dex, siz = c.siz;
    let mov = 8;
    if (str < siz && dex < siz) mov = 7;
    else if (str > siz && dex > siz) mov = 9;
    const e = parseInt(edad, 10) || 0;
    if (e >= 40) mov -= Math.min(5, Math.floor((e - 30) / 10));
    return Math.max(1, mov);
  }
  function derivadas(c, o) {
    o = o || {};
    const n = (k) => parseInt(c[k], 10) || 0;
    const car = { str: n('str'), con: n('con'), siz: n('siz'), dex: n('dex'), app: n('app'), int: n('int'), pow: n('pow'), edu: n('edu') };
    const bd = bonoDanoDe(car.str, car.siz);
    return {
      pvMax: Math.floor((car.con + car.siz) / 10),
      pmMax: Math.floor(car.pow / 5),
      sanInicial: car.pow,
      sanMax: 99 - (parseInt(o.mitos, 10) || 0),
      mov: movimiento(car, o.edad),
      bonoDano: bd.dado, corpulencia: bd.corpulencia,
    };
  }
  function valorBase(base, c) {
    if (typeof base === 'number') return base;
    const m = String(base || '').trim().match(/^([a-z]+)\s*(?:\/\s*(\d+))?$/);
    if (!m) return parseInt(base, 10) || 0;
    const v = parseInt((c || {})[m[1]], 10) || 0;
    return m[2] ? Math.floor(v / parseInt(m[2], 10)) : v;
  }

  /* ---------- fórmulas de dados ---------- */
  function tirarFormula(texto, o) {
    o = o || {};
    const rnd = o.rnd || defRnd;
    const s = String(texto == null ? '' : texto).trim();
    if (!s) return { total: 0, detalle: '' };
    const partes = s.replace(/\s+/g, '').match(/[+-]?(?:\d*[dD]\d+|\d+)/g);
    if (!partes) return { total: 0, detalle: '' };
    let total = 0; const det = [];
    partes.forEach((p, i) => {
      const signo = p[0] === '-' ? -1 : 1, q = p.replace(/^[+-]/, '');
      const m = q.match(/^(\d*)[dD](\d+)$/);
      if (m) {
        const cant = Math.min(parseInt(m[1], 10) || 1, 50), caras = Math.max(parseInt(m[2], 10) || 1, 1), t = [];
        for (let k = 0; k < cant; k++) t.push(rnd(caras));
        const suma = t.reduce((a, b) => a + b, 0);
        total += signo * suma; det.push(`${signo < 0 ? '−' : (i ? '+' : '')}${cant}d${caras}=[${t.join(',')}]`);
      } else { const v = parseInt(q, 10) || 0; total += signo * v; det.push(`${signo < 0 ? '−' : (i ? '+' : '')}${v}`); }
    });
    return { total, detalle: det.join('') };
  }
  function maximoDeFormula(texto) {
    const s = String(texto == null ? '' : texto).replace(/\s+/g, '');
    const partes = s.match(/[+-]?(?:\d*[dD]\d+|\d+)/g) || [];
    return partes.reduce((suma, p) => {
      const signo = p[0] === '-' ? -1 : 1, q = p.replace(/^[+-]/, ''), m = q.match(/^(\d*)[dD](\d+)$/);
      return suma + signo * (m ? (parseInt(m[1], 10) || 1) * parseInt(m[2], 10) : parseInt(q, 10) || 0);
    }, 0);
  }

  /* ---------- armas ---------- */
  // El bono de daño (p. ej. «+1D4», «-1», «0») solo se aplica en cuerpo a cuerpo: 'completo' | 'medio' (la mitad, hacia abajo) | ''.
  function bonoDanoValor(bonoDano, uso, o) {
    const rnd = (o && o.rnd) || defRnd;
    const t = String(bonoDano == null ? '0' : bonoDano).trim().replace(/\s+/g, '');
    if (!uso || t === '0' || t === '') return { total: 0, detalle: '' };
    const r = tirarFormula(t, { rnd });
    if (uso === 'medio') { const m = Math.trunc(r.total / 2); return { total: m, detalle: `${t}/2=${m}` }; }
    return { total: r.total, detalle: t + '=' + r.total };
  }
  // nivel: nivel de éxito del ataque. Un éxito extremo con arma que empala hace el daño MÁXIMO más una tirada adicional del daño del arma.
  function danoDeArma(arma, o) {
    o = o || {};
    const rnd = o.rnd || defRnd, nivel = o.nivel || 'regular';
    const empala = !!arma.empala && (nivel === 'extremo' || nivel === 'critico');
    let base;
    if (empala) {
      const max = maximoDeFormula(arma.dano), extra = tirarFormula(arma.dano, { rnd });
      base = { total: max + extra.total, detalle: `empala: máx ${max} + ${extra.detalle}=${extra.total}` };
    } else base = tirarFormula(arma.dano, { rnd });
    const b = bonoDanoValor(o.bonoDano, arma.bono, { rnd });
    const total = Math.max(0, base.total + b.total);
    return { total, detalle: base.detalle + (b.detalle ? ' | bono ' + b.detalle : ''), empala };
  }

  /* ---------- fase de desarrollo (mejora de habilidades marcadas) ---------- */
  // Una habilidad marcada mejora si se saca MÁS que su valor actual (o más de 95); entonces sube 1D10 (máximo 99). Pasar de 90 da 2D6 de Cordura.
  function mejoraHabilidad(valor, o) {
    o = o || {};
    const rnd = o.rnd || defRnd, v = parseInt(valor, 10) || 0;
    const tirada = rnd(100);
    if (tirada > v || tirada > 95) {
      const mejora = rnd(10);
      const nuevo = Math.min(99, v + mejora);
      return { tirada, mejora, nuevo, mejoro: true, ganaCordura: v < 90 && nuevo >= 90 };
    }
    return { tirada, mejora: 0, nuevo: v, mejoro: false, ganaCordura: false };
  }

  /* ---------- Cordura ---------- */
  // «0/1d4»: pérdida si se pasa la tirada de Cordura / si se falla. Acepta también un solo valor («1d6»: se aplica en el fallo).
  function parsearPerdida(texto) {
    const s = String(texto == null ? '' : texto).trim();
    if (!s) return { exito: '0', fallo: '0' };
    const p = s.split('/');
    if (p.length >= 2) return { exito: p[0].trim() || '0', fallo: p.slice(1).join('/').trim() || '0' };
    return { exito: '0', fallo: p[0].trim() };
  }
  // Resuelve una tirada de Cordura. Devuelve la pérdida y los avisos que corresponden (locura temporal: pérdida ≥ 5 de un golpe;
  // locura indefinida: la pérdida del día llega a 1/5 de la Cordura con la que empezó el día).
  function chequeoDeCordura(o) {
    const rnd = o.rnd || defRnd, san = parseInt(o.san, 10) || 0;
    const t = tirarD100({ rnd });
    const r = nivelExito(t.total, san);
    const p = parsearPerdida(o.perdida);
    const pasa = t.total <= san && t.total !== 100 && r.nivel !== 'pifia';
    const formula = pasa ? p.exito : p.fallo;
    let perdida = tirarFormula(formula, { rnd });
    if (!pasa && r.nivel === 'pifia') { const mx = maximoDeFormula(p.fallo); perdida = { total: mx, detalle: 'pifia: máximo ' + mx }; }
    const total = Math.max(0, perdida.total);
    const nuevaSan = Math.max(0, san - total);
    const hoy = (parseInt(o.perdidaHoy, 10) || 0) + total;
    const base = parseInt(o.sanInicioDia, 10) || san;
    const avisos = [];
    if (total >= 5) avisos.push('Pérdida de 5 o más de una vez: tira INT; si la superas, sufres locura temporal.');
    if (hoy >= Math.floor(base / 5) && hoy > 0) avisos.push('La pérdida de hoy llega a 1/5 de tu Cordura de inicio de día: locura indefinida.');
    if (nuevaSan === 0) avisos.push('Cordura en 0: el personaje queda permanentemente loco.');
    return { tirada: t.total, nivel: r.nivel, texto: r.texto, css: r.css, pasa, formula, perdida: total, detalle: perdida.detalle, nuevaSan, perdidaHoy: hoy, avisos };
  }

  /* ---------- heridas ---------- */
  // Un solo golpe de la mitad de los PV máximos o más es una herida grave; con 0 PV se cae inconsciente (o moribundo si hay herida grave).
  function evaluarDano(o) {
    const dano = Math.max(0, parseInt(o.dano, 10) || 0), pv = parseInt(o.pv, 10) || 0, max = parseInt(o.pvMax, 10) || 0;
    const nuevoPv = Math.max(0, pv - dano);
    const grave = !!o.heridaGrave || (max > 0 && dano >= Math.ceil(max / 2) && dano > 0);
    const avisos = [];
    if (dano >= Math.ceil(max / 2) && dano > 0) avisos.push('Herida grave: tira CON; si fallas, quedas inconsciente.');
    if (dano >= max && max > 0) avisos.push('Daño igual o superior a tus PV máximos: muerte instantánea (a criterio del Guardián).');
    if (nuevoPv === 0) avisos.push(grave ? 'A 0 PV con herida grave: moribundo (necesitas Primeros Auxilios).' : 'A 0 PV: inconsciente.');
    return { nuevoPv, heridaGrave: grave, inconsciente: nuevoPv === 0 && !grave, moribundo: nuevoPv === 0 && grave, avisos };
  }

  /* ---------- creación ---------- */
  function puntosOcupacion(id, c) {
    const lista = typeof COC_PUNTOS_OCUPACION !== 'undefined' ? COC_PUNTOS_OCUPACION : [];
    const f = lista.find((x) => x.id === id) || lista[0];
    const n = (k) => parseInt((c || {})[k], 10) || 0;
    return f ? f.calc({ str: n('str'), con: n('con'), siz: n('siz'), dex: n('dex'), app: n('app'), int: n('int'), pow: n('pow'), edu: n('edu') }) : 0;
  }
  function puntosInteres(c) { return (parseInt((c || {}).int, 10) || 0) * 2; }
  function bandaDeEdad(edad) {
    const e = parseInt(edad, 10) || 0, lista = typeof COC_EDADES !== 'undefined' ? COC_EDADES : [];
    return lista.find((b) => e >= b.desde && e <= b.hasta) || null;
  }
  // Tirada de características al crear: 3D6×5 (STR, CON, DEX, APP, POW, Suerte) y (2D6+6)×5 (SIZ, INT, EDU).
  function tirarCaracteristicas(o) {
    const rnd = (o && o.rnd) || defRnd, d6 = () => rnd(6);
    const t3 = () => (d6() + d6() + d6()) * 5, t2 = () => (d6() + d6() + 6) * 5;
    return { str: t3(), con: t3(), dex: t3(), app: t3(), pow: t3(), siz: t2(), int: t2(), edu: t2(), suerte: t3() };
  }

  global.FichaCoCReglas = {
    mitad, quinto, nivelExito, cumple, NIVELES, tirarD100, tirarHabilidad, suerteParaExito,
    bonoDanoDe, movimiento, derivadas, valorBase, tirarFormula, maximoDeFormula, bonoDanoValor, danoDeArma,
    mejoraHabilidad, parsearPerdida, chequeoDeCordura, evaluarDano,
    puntosOcupacion, puntosInteres, bandaDeEdad, tirarCaracteristicas,
  };
})(typeof window !== 'undefined' ? window : globalThis);

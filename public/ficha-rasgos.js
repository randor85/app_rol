/*
 * ficha-rasgos.js — rasgos con recursos y efectos declarativos, rasgos propios editables en la ficha y biblioteca global (v102.0).
 *
 * Un RASGO es solo datos (nada se ejecuta):
 *   { id, nombre, icono, origen:{tipo:'clase'|'subclase'|'especie'|'dote'|'trasfondo'|'otro', nombre}, nivel, texto,
 *     recurso?:{ tipo:'pips'|'pool', max:<declarativo>, recarga:'corto'|'largo'|'ambos'|null, icono?, desc?, id?, campo?, prefijo?, ids?, pasos?, inicial?, hechizos? },
 *     efectos?:[ { tipo:'plano'|'dado'|'ventaja'|'desventaja'|'stat', objetivo, valor|dado, cuando? } ],   (los mismos efectos de los buffs personalizados)
 *     acciones?:[ { texto, roll } ],                                                                      (botón que tira una fórmula)
 *     activo?: false (apaga los efectos), biblioteca?:{id,autor}, desde?:{tipo:'base'|'global',id} }
 *   max (declarativo): número | { fijo:n } | { por:n, clase? } | { tabla:{nivel:valor}, clase? } | { modificador:'CHA', min?, mas? } | { competencia:true, mult? } | { nivelTotal:true, mult? }
 *
 * Tres fuentes de rasgos:
 *   1) los de la ficha (P.rasgos): texto, sin lógica;
 *   2) los PROPIOS del personaje (datos/rasgos-propios-json, semilla P.rasgosPropios): se agregan, editan y quitan desde la ficha;
 *   3) la BIBLIOTECA: la integrada (rasgos_data.js → RASGOS_BASE) y la global de los jugadores (biblioteca/rasgos_custom/<id>).
 *
 * Los textos admiten MARCADORES que se recalculan solos al cambiar nivel o atributos (nada de números escritos a mano):
 *   {{mod:WIS}} modificador · {{prof}} competencia · {{cd:CON}} 8+mod+comp. (sin atributo: CD de conjuro) · {{atq:CHA}} mod+comp. · {{ini}} iniciativa
 *   {{nivel}} nivel total · {{nivel:Monk}} nivel de una clase · {{nivel:Paladin*5}} por 5 · {{nivel:Rogue/2}} mitad, redondeada hacia arriba
 *
 * Carga antes de ficha-plantilla.js (solo funciones puras); `FichaRasgos.iniciar()` lo llama la carcasa con la sesión iniciada.
 */
(function (global) {
  'use strict';

  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const ORIGENES = [['clase', 'Clase'], ['subclase', 'Subclase'], ['especie', 'Especie'], ['dote', 'Dote'], ['trasfondo', 'Trasfondo'], ['otro', 'Otro']];
  const RECARGAS = [['largo', 'Descanso largo'], ['corto', 'Descanso corto'], ['ambos', 'Corto o largo'], ['', 'Ninguna (manual)']];
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const entero = (v, def) => { const n = parseInt(v, 10); return isNaN(n) ? def : n; };
  const acotar = (n, a, b) => Math.max(a, Math.min(b, n));
  const idSeguro = (t, def) => String(t == null ? '' : t).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || def;
  const slug = (t) => norm(t).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'rasgo';
  const nuevoId = (nombre) => 'rg_' + slug(nombre) + '_' + Math.random().toString(36).slice(2, 6);

  /* ---------- máximos declarativos (movido de la carcasa) ---------- */
  function escalonado(tabla, niv) {
    let v = null, mejor = -1;
    Object.keys(tabla || {}).forEach((k) => { const n = parseInt(k, 10); if (!isNaN(n) && n <= niv && n > mejor) { mejor = n; v = tabla[k]; } });
    return v;
  }
  function declarativo(m) {
    if (m == null || typeof m === 'function' || typeof m !== 'object') return m;
    return (c) => {
      const niv = m.clase ? c.clase(m.clase) : c.nivel;
      if (m.tabla) { const v = escalonado(m.tabla, niv); return v == null ? 0 : v; }
      if (m.por != null) return m.por * niv;
      if (m.modificador) return Math.max(m.min != null ? m.min : 0, c.mod(m.modificador) + (m.mas || 0));
      if (m.competencia) return (m.mult || 1) * c.prof;
      if (m.nivelTotal) return (m.mult || 1) * c.nivel;
      return m.fijo != null ? m.fijo : 0;
    };
  }

  /* ---------- marcadores {{…}} → <span class="js-calc"> ---------- */
  const attr = (v) => esc(v);
  function marcadores(texto) {
    return String(texto == null ? '' : texto).replace(/\{\{\s*([a-zA-Z]+)\s*(?::\s*([^}]*?))?\s*\}\}/g, (m, tipo, arg) => {
      tipo = tipo.toLowerCase(); arg = (arg || '').trim();
      const span = (calc, extra) => `<span class="js-calc" data-calc="${calc}"${extra || ''}>—</span>`;
      const hab = arg.toUpperCase();
      switch (tipo) {
        case 'mod': return ABIL.includes(hab) ? span('modsig', ` data-hab="${hab}"`) : m;
        case 'prof': return span('prof');
        case 'cd': return arg ? (ABIL.includes(hab) ? span('cdHab', ` data-hab="${hab}"`) : m) : span('cdConjuro');
        case 'atq': return arg ? (ABIL.includes(hab) ? span('atqHab', ` data-hab="${hab}"`) : m) : span('atqConjuro');
        case 'ini': return span('ini');
        case 'nivel': {
          if (!arg) return span('nivelTotal');
          const mm = arg.match(/^(.*?)\s*([*/])\s*(\d+)$/), clase = (mm ? mm[1] : arg).trim();
          const mult = mm && mm[2] === '*' ? mm[3] : '1', div = mm && mm[2] === '/' ? mm[3] : '1';
          return clase ? span('nivelClase', ` data-clase="${attr(clase)}" data-mult="${attr(mult)}" data-div="${attr(div)}"`) : m;
        }
        default: return m;
      }
    });
  }
  // Texto escrito por una persona: se escapa primero y después se convierten los marcadores (que sobreviven al escape).
  const textoSeguro = (t) => marcadores(esc(t)).replace(/\n/g, '<br>');

  /* ---------- validación y limpieza de un rasgo (datos de una persona o de la biblioteca) ---------- */
  const OBJETIVOS = ['ca', 'iniciativa', 'velocidad', 'hp-max', 'ataque', 'ataque-conjuro', 'cd-conjuro', 'salvaciones', 'pruebas', 'curacion', 'dano'];
  const TIPOS_EFECTO = ['plano', 'dado', 'ventaja', 'desventaja', 'stat'];
  const DE_VALOR = ['nivelClase', 'nivelTotal', 'modificador', 'competencia'];
  const txt = (v, max) => String(v == null ? '' : v).slice(0, max);
  function limpiarValor(v) {
    if (v && typeof v === 'object') {
      if (DE_VALOR.indexOf(v.de) < 0) return 0;
      const o = { de: v.de };
      if (v.clase) o.clase = txt(v.clase, 40);
      if (ABIL.includes(v.hab)) o.hab = v.hab;
      if (v.mult != null) o.mult = acotar(Number(v.mult) || 1, -20, 20);
      if (v.signo === -1) o.signo = -1;
      if (v.min != null) o.min = acotar(entero(v.min, 0), -10, 20);
      return o;
    }
    return acotar(Number(v) || 0, -99, 99);
  }
  function limpiarEfecto(e) {
    if (!e || typeof e !== 'object' || TIPOS_EFECTO.indexOf(e.tipo) < 0) return null;
    const o = { tipo: e.tipo, objetivo: txt(e.objetivo, 30) };
    if (e.tipo === 'dado') { const d = e.dado || {}; o.dado = { count: acotar(entero(d.count, 1), 1, 20), sides: acotar(entero(d.sides, 6), 2, 100) }; }
    else if (e.tipo === 'stat') { o.stat = ABIL.includes(e.stat) ? e.stat : 'STR'; o.valor = limpiarValor(e.valor); }
    else if (e.tipo === 'plano') o.valor = limpiarValor(e.valor);
    const c = e.cuando;
    if (c && typeof c === 'object') {
      const k = {};
      if (c.hechizo && typeof c.hechizo === 'object') {
        const h = {}; if (c.hechizo.etiqueta) h.etiqueta = txt(c.hechizo.etiqueta, 40); if (c.hechizo.nombre) h.nombre = txt(c.hechizo.nombre, 60); if (c.hechizo.nivelMin != null) h.nivelMin = acotar(entero(c.hechizo.nivelMin, 0), 0, 9);
        if (Object.keys(h).length) k.hechizo = h;
      }
      if (c.concentrando) k.concentrando = true;
      if (c.pgMitad) k.pgMitad = true;
      if (c.estado) k.estado = txt(c.estado, 40);
      if (Object.keys(k).length) o.cuando = k;
    }
    return o;
  }
  function limpiarMax(m) {
    if (typeof m === 'number') return { fijo: acotar(m, 0, 99) };
    if (!m || typeof m !== 'object') return { fijo: 1 };
    if (m.tabla && typeof m.tabla === 'object') {
      const t = {}; Object.keys(m.tabla).slice(0, 25).forEach((k) => { const n = entero(k, null); if (n != null && n >= 1 && n <= 20 && m.tabla[k] != null) t[n] = acotar(entero(m.tabla[k], 0), 0, 99); });
      const o = { tabla: t }; if (m.clase) o.clase = txt(m.clase, 40); return o;
    }
    if (m.por != null) { const o = { por: acotar(entero(m.por, 1), -20, 20) }; if (m.clase) o.clase = txt(m.clase, 40); return o; }
    if (m.modificador && ABIL.includes(m.modificador)) { const o = { modificador: m.modificador, min: acotar(entero(m.min, 0), 0, 10) }; if (m.mas) o.mas = acotar(entero(m.mas, 0), 0, 5); return o; }
    if (m.competencia) return { competencia: true, mult: acotar(entero(m.mult, 1), 1, 10) };
    if (m.nivelTotal) return { nivelTotal: true, mult: acotar(entero(m.mult, 1), 1, 10) };
    return { fijo: acotar(entero(m.fijo, 1), 0, 99) };
  }
  function limpiarRecurso(rc) {
    if (!rc || typeof rc !== 'object') return null;
    const o = { tipo: rc.tipo === 'pool' ? 'pool' : 'pips', max: limpiarMax(rc.max) };
    o.recarga = ['corto', 'largo', 'ambos'].indexOf(rc.recarga) >= 0 ? rc.recarga : null;
    if (rc.icono) o.icono = txt(rc.icono, 8);
    if (rc.desc) o.desc = txt(rc.desc, 300);
    ['id', 'campo', 'prefijo'].forEach((k) => { if (rc[k]) o[k] = idSeguro(rc[k], ''); if (!o[k]) delete o[k]; });
    if (Array.isArray(rc.ids)) o.ids = rc.ids.slice(0, 12).map((x) => idSeguro(x, '')).filter(Boolean);
    if (Array.isArray(rc.pasos)) o.pasos = rc.pasos.slice(0, 6).map((x) => acotar(entero(x, 1), -50, 50)).filter((x) => x);
    if (rc.inicial != null) o.inicial = acotar(entero(rc.inicial, 0), 0, 999);
    if (Array.isArray(rc.hechizos)) o.hechizos = rc.hechizos.slice(0, 12).map((x) => txt(x, 60));
    if (Array.isArray(rc.etiquetas)) o.etiquetas = rc.etiquetas.slice(0, 12).map((x) => txt(x, 30));
    return o;
  }
  function normalizar(r) {
    if (!r || typeof r !== 'object' || !String(r.nombre || '').trim()) return null;
    const o = {
      id: idSeguro(r.id, nuevoId(r.nombre)), nombre: txt(String(r.nombre).trim(), 80), icono: txt(r.icono || '', 8),
      origen: { tipo: ORIGENES.some((x) => x[0] === (r.origen || {}).tipo) ? r.origen.tipo : 'otro', nombre: txt((r.origen || {}).nombre, 80) },
      nivel: acotar(entero(r.nivel, 0), 0, 20), texto: txt(r.texto, 4000),
    };
    const rc = limpiarRecurso(r.recurso); if (rc) o.recurso = rc;
    const ef = (Array.isArray(r.efectos) ? r.efectos : (r.efectos && typeof r.efectos === 'object' ? Object.keys(r.efectos).map((k) => r.efectos[k]) : [])).slice(0, 12).map(limpiarEfecto).filter(Boolean);
    if (ef.length) o.efectos = ef;
    const ac = (Array.isArray(r.acciones) ? r.acciones : (r.acciones && typeof r.acciones === 'object' ? Object.keys(r.acciones).map((k) => r.acciones[k]) : [])).slice(0, 8)
      .map((a) => (a && String(a.texto || '').trim() && String(a.roll || '').trim() ? { texto: txt(a.texto, 60), roll: txt(a.roll, 40) } : null)).filter(Boolean);
    if (ac.length) o.acciones = ac;
    if (r.activo === false) o.activo = false;
    if (r.biblioteca && r.biblioteca.id) o.biblioteca = { id: idSeguro(r.biblioteca.id, ''), autor: txt(r.biblioteca.autor, 60) };
    if (r.desde && r.desde.id) o.desde = { tipo: r.desde.tipo === 'base' ? 'base' : 'global', id: txt(r.desde.id, 60) };
    return o;
  }

  /* ---------- el recurso que entiende ficha-vitales.js ---------- */
  function recursoDe(r) {
    const rc = r && r.recurso; if (!rc) return null;
    const id = rc.id || ('r-' + r.id);
    const x = { id, nombre: r.nombre, icono: rc.icono || r.icono || '🔹', tipo: rc.tipo, max: declarativo(rc.max), recarga: rc.recarga, desc: rc.desc || '', propio: true, rasgoId: r.id };
    if (rc.tipo === 'pool') { x.campo = rc.campo || id + '-cur'; x.pasos = rc.pasos || [-1, 1]; if (rc.inicial != null) x.inicial = rc.inicial; }
    else { x.prefijo = rc.prefijo || id + '-use-'; if (rc.ids) x.ids = rc.ids; if (rc.etiquetas) x.etiquetas = rc.etiquetas; if (rc.hechizos) x.hechizos = rc.hechizos; }
    return x;
  }

  /* ---------- resúmenes ---------- */
  function textoMax(m) {
    if (!m) return '';
    if (m.fijo != null) return String(m.fijo);
    if (m.por != null) return `${m.por === 1 ? '' : m.por + ' × '}nivel${m.clase ? ' de ' + m.clase : ' total'}`;
    if (m.modificador) return `${m.mas ? m.mas + ' + ' : ''}mod. de ${m.modificador}${m.min ? ' (mín. ' + m.min + ')' : ''}`;
    if (m.competencia) return `${m.mult > 1 ? m.mult + ' × ' : ''}bono de competencia`;
    if (m.nivelTotal) return `${m.mult > 1 ? m.mult + ' × ' : ''}nivel total`;
    if (m.tabla) return 'según el nivel' + (m.clase ? ' de ' + m.clase : '');
    return '';
  }
  const etiquetaOrigen = (r) => [(ORIGENES.find((o) => o[0] === (r.origen || {}).tipo) || [0, ''])[1], (r.origen || {}).nombre].filter(Boolean).join(': ') + (r.nivel ? ' · nv. ' + r.nivel : '');
  function resumenRasgo(r) {
    const p = [];
    if (r.recurso) p.push(`🔥 ${r.recurso.tipo === 'pool' ? 'Contador' : 'Usos'}: ${textoMax(r.recurso.max)}${r.recurso.recarga ? ' · ' + (RECARGAS.find((x) => x[0] === r.recurso.recarga) || ['', ''])[1].toLowerCase() : ''}`);
    if (r.efectos && global.FichaComun && FichaComun.resumenEfectos) p.push('🔆 ' + FichaComun.resumenEfectos(r.efectos));
    return p.join(' · ');
  }

  /* ============================================================
   *  Interfaz dentro de la ficha (solo cuando hay sesión y charRef)
   * ============================================================ */
  let ctxIni = null, editor = null, EE = null, accionesForm = [], items = () => [];
  let cacheGlobal = null;
  const $ = (id) => document.getElementById(id);
  const soloLectura = () => !!document.querySelector('.readonly-mode');
  const clasesDelPersonaje = () => ((global.CONFIG_NIVEL && CONFIG_NIVEL.clases) || []).map((c) => c.nombre);
  const subclasesDelPersonaje = () => ((global.CONFIG_NIVEL && CONFIG_NIVEL.clases) || []).map((c) => c.subclase).filter(Boolean);
  const calcular = () => { try { if (global.FichaShell && FichaShell.aplicarJsCalc) FichaShell.aplicarJsCalc(); } catch (e) { /* aún no */ } };
  const aviso = (t) => { if (ctxIni && ctxIni.toast) ctxIni.toast(t); };

  /* --- recursos de los rasgos propios: se agregan a P.recursos y a su zona de la ficha --- */
  let firmaRecursos = '';
  function sincronizarRecursos() {
    const P = ctxIni && ctxIni.P; if (!P) return;
    const propios = items().map(recursoDe).filter(Boolean);
    P.recursos = P.recursos || [];
    const firma = JSON.stringify(propios.map((r) => [r.id, r.nombre, r.icono, r.tipo, r.recarga, r.campo, r.prefijo, r.desc, r.ids, r.pasos, r.inicial, r.etiquetas, r.hechizos, r.rasgoId]));
    // P.recursos es el mismo arreglo que usa ficha-vitales.js: se actualiza en el sitio.
    for (let i = P.recursos.length - 1; i >= 0; i--) if (P.recursos[i].propio) P.recursos.splice(i, 1);
    propios.forEach((r) => P.recursos.push(r));
    // las max son funciones y se rehacen siempre; la zona solo se dibuja de nuevo si cambió algo visible
    const zona = $('recursos-propios'), wrap = $('recursos-propios-wrap');
    if (zona && firma !== firmaRecursos) {
      firmaRecursos = firma;
      zona.innerHTML = propios.map((r) => global.FichaPlantilla.recursoHtml(r)).join('');
      if (wrap) wrap.hidden = !propios.length;
      if (global.FichaComun) FichaComun.reaplicarDatos();
    }
    if (global.FichaVitales && FichaVitales.pintarRecursos) FichaVitales.pintarRecursos();
  }

  /* --- tarjetas --- */
  function accionesHtml(r) {
    return (r.acciones || []).map((a) => `<button type="button" class="btn-roll btn-roll-sm" data-roll="${esc(a.roll)}" data-etiqueta="${esc(a.texto)}">${esc(a.texto)}</button>`).join('');
  }
  function renderFila(raw, idx) {
    const r = normalizar(raw) || { nombre: '(rasgo dañado)', origen: {}, texto: '' };
    const resumen = resumenRasgo(r);
    const publicado = r.biblioteca && r.biblioteca.id;
    const mio = publicado && ctxIni && r.biblioteca.autor === ctxIni.uid;
    return `<div class="feature-card rasgo-propio" data-rasgo="${idx}">
      <div class="fila"><h4>${esc(r.icono ? r.icono + ' ' : '')}${esc(r.nombre)}</h4><span class="tag">${esc(etiquetaOrigen(r) || 'Propio')}</span></div>
      ${r.texto ? `<div class="rasgo-texto">${textoSeguro(r.texto)}</div>` : ''}
      ${resumen ? `<p class="texto-suave rasgo-resumen">${esc(resumen)}</p>` : ''}
      ${r.efectos ? `<label class="bp-check"><input type="checkbox" data-rasgo-activo="${idx}"${r.activo === false ? '' : ' checked'}> Efectos activos</label>` : ''}
      ${r.acciones ? `<div class="fila">${accionesHtml(r)}</div>` : ''}
      <div class="fila rasgo-gestion">
        <span class="rasgo-botones">
          <button type="button" onclick="FichaRasgos.editor.mostrarFormulario(${idx})" title="Editar" aria-label="Editar ${esc(r.nombre)}">✏️</button>
          <button type="button" onclick="FichaRasgos.quitar(${idx})" title="Quitar" aria-label="Quitar ${esc(r.nombre)}">🗑️</button>
          <button type="button" onclick="FichaRasgos.publicar(${idx})" title="${mio ? 'Actualizar en la biblioteca global' : 'Guardar en la biblioteca global para otras builds'}">${mio ? '📚 Actualizar en la biblioteca' : '📤 A la biblioteca'}</button>
          ${mio ? `<button type="button" onclick="FichaRasgos.quitarDeBiblioteca(${idx})" title="Borrar de la biblioteca global">🗑️ De la biblioteca</button>` : ''}
        </span>
      </div></div>`;
  }

  /* --- formulario --- */
  const optHtml = (lista, sel) => lista.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const MAX_TIPOS = [['fijo', 'Número fijo'], ['porClase', 'Veces el nivel de una clase'], ['nivelTotal', 'Veces tu nivel total'], ['modificador', 'Un modificador (mínimo…)'], ['competencia', 'Veces tu bono de competencia'], ['tabla', 'Tabla por nivel (nivel:valor)']];
  function maxAFila(m) {
    m = m || { fijo: 1 };
    if (m.tabla) return { t: 'tabla', n: 1, clase: m.clase || '', hab: 'CHA', tabla: Object.keys(m.tabla).map((k) => k + ':' + m.tabla[k]).join(', ') };
    if (m.por != null) return { t: 'porClase', n: m.por, clase: m.clase || '', hab: 'CHA', tabla: '' };
    if (m.modificador) return { t: 'modificador', n: m.min != null ? m.min : 1, clase: '', hab: m.modificador, tabla: '', mas: m.mas || 0 };
    if (m.competencia) return { t: 'competencia', n: m.mult || 1, clase: '', hab: 'CHA', tabla: '' };
    if (m.nivelTotal) return { t: 'nivelTotal', n: m.mult || 1, clase: '', hab: 'CHA', tabla: '' };
    return { t: 'fijo', n: m.fijo != null ? m.fijo : 1, clase: '', hab: 'CHA', tabla: '' };
  }
  function filaAMax(f) {
    const n = entero(f.n, 1);
    if (f.t === 'porClase') return f.clase ? { por: n, clase: f.clase } : { por: n };
    if (f.t === 'nivelTotal') return { nivelTotal: true, mult: n };
    if (f.t === 'modificador') return f.mas ? { modificador: f.hab, min: Math.max(0, n), mas: f.mas } : { modificador: f.hab, min: Math.max(0, n) };
    if (f.t === 'competencia') return { competencia: true, mult: n };
    if (f.t === 'tabla') {
      const t = {}; String(f.tabla || '').split(/[,;]+/).forEach((p) => { const mm = p.trim().match(/^(\d+)\s*[:=]\s*(\d+)$/); if (mm) t[mm[1]] = parseInt(mm[2], 10); });
      return f.clase ? { tabla: t, clase: f.clase } : { tabla: t };
    }
    return { fijo: n };
  }
  function pintarAcciones() {
    const c = $('rg-acciones'); if (!c) return;
    c.innerHTML = accionesForm.map((a, i) => `<div class="rg-accion" data-i="${i}"><input type="text" class="rg-ac-texto" value="${esc(a.texto)}" placeholder="Texto del botón" aria-label="Texto del botón ${i + 1}"><input type="text" class="rg-ac-roll" value="${esc(a.roll)}" placeholder="2d6+3" aria-label="Fórmula ${i + 1}"><button type="button" class="btn-clear" onclick="FichaRasgos.quitarAccion(${i})" aria-label="Quitar el botón ${i + 1}">✖</button></div>`).join('');
  }
  function leerAcciones() { accionesForm = Array.from(document.querySelectorAll('#rg-acciones .rg-accion')).map((el) => ({ texto: el.querySelector('.rg-ac-texto').value, roll: el.querySelector('.rg-ac-roll').value })); }
  function claseOpts(sel, conTodas) {
    const lista = clasesDelPersonaje();
    return (conTodas ? `<option value="">(nivel total)</option>` : '') + lista.map((c) => `<option value="${esc(c)}"${c === sel ? ' selected' : ''}>${esc(c)}</option>`).join('') + (sel && lista.indexOf(sel) < 0 ? `<option value="${esc(sel)}" selected>${esc(sel)}</option>` : '');
  }
  function pintarMax() {
    const c = $('rg-max-campos'); if (!c) return;
    const f = leerMaxForm();
    c.innerHTML = `<select id="rg-max-t" aria-label="Máximo">${optHtml(MAX_TIPOS, f.t)}</select>
      ${f.t === 'tabla' ? `<input type="text" id="rg-max-tabla" value="${esc(f.tabla)}" placeholder="2:2, 6:3, 17:4" aria-label="Tabla por nivel">` : `<input type="number" id="rg-max-n" min="${f.t === 'modificador' ? 0 : 1}" max="99" value="${esc(f.n)}" aria-label="${f.t === 'modificador' ? 'Mínimo' : 'Cantidad'}">`}
      ${(f.t === 'porClase' || f.t === 'tabla') ? `<select id="rg-max-clase" aria-label="Clase">${claseOpts(f.clase, true)}</select>` : ''}
      ${f.t === 'modificador' ? `<select id="rg-max-hab" aria-label="Característica">${ABIL.map((h) => `<option${h === f.hab ? ' selected' : ''}>${h}</option>`).join('')}</select>` : ''}`;
  }
  let maxForm = { t: 'fijo', n: 1, clase: '', hab: 'CHA', tabla: '' };
  function leerMaxForm() {
    const g = (id) => { const e = $(id); return e ? e.value : undefined; };
    if (g('rg-max-t') !== undefined) {
      maxForm = { t: g('rg-max-t'), n: g('rg-max-n') !== undefined ? g('rg-max-n') : maxForm.n, clase: g('rg-max-clase') !== undefined ? g('rg-max-clase') : maxForm.clase, hab: g('rg-max-hab') !== undefined ? g('rg-max-hab') : maxForm.hab, tabla: g('rg-max-tabla') !== undefined ? g('rg-max-tabla') : maxForm.tabla, mas: maxForm.mas || 0 };
    }
    return maxForm;
  }
  const MARCADORES = [['{{mod:WIS}}', 'mod.'], ['{{prof}}', 'competencia'], ['{{cd:CON}}', 'CD'], ['{{atq:CHA}}', 'ataque'], ['{{nivel}}', 'nivel'], ['{{nivel:Clase*5}}', 'nivel clase']];
  function renderFormulario(r) {
    r = r ? normalizar(r) : null;
    maxForm = maxAFila(r && r.recurso ? r.recurso.max : null);
    accionesForm = ((r && r.acciones) || []).map((a) => ({ texto: a.texto, roll: a.roll }));
    const tiene = !!(r && r.recurso), tieneEf = !!(r && r.efectos && r.efectos.length), rc = (r && r.recurso) || {};
    if (EE) EE.cargar(r && r.efectos, !tieneEf);
    setTimeout(() => { pintarMax(); pintarAcciones(); }, 0);
    const origen = (r && r.origen) || { tipo: 'clase', nombre: clasesDelPersonaje()[0] || '' };
    return `<div class="bp-form rg-form">
      <datalist id="rg-origenes">${clasesDelPersonaje().concat(subclasesDelPersonaje()).map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="bp-grid">
        <label class="bp-campo"><span>Nombre</span><input type="text" id="rg-nombre" maxlength="80" value="${esc(r ? r.nombre : '')}" placeholder="p. ej. Wild Shape"></label>
        <label class="bp-campo"><span>Ícono</span><input type="text" id="rg-icono" maxlength="4" value="${esc(r ? r.icono : '🧩')}"></label>
        <label class="bp-campo"><span>Viene de</span><select id="rg-origen-tipo">${optHtml(ORIGENES, origen.tipo)}</select></label>
        <label class="bp-campo"><span>Nombre (clase, subclase, especie…)</span><input type="text" id="rg-origen-nombre" list="rg-origenes" maxlength="80" value="${esc(origen.nombre)}"></label>
        <label class="bp-campo"><span>Desde el nivel</span><input type="number" id="rg-nivel" min="0" max="20" value="${esc(r ? r.nivel || '' : '')}" placeholder="—"></label>
      </div>
      <label class="bp-campo bp-ancho"><span>Texto del rasgo</span><textarea id="rg-texto" rows="4" maxlength="4000" placeholder="Qué hace. Puedes usar marcadores que se recalculan solos.">${esc(r ? r.texto : '')}</textarea></label>
      <div class="rg-marcadores"><span class="texto-suave">Insertar:</span> ${MARCADORES.map(([m, t]) => `<button type="button" class="btn btn-fantasma btn-sm" data-rg-ins="${esc(m)}" title="${esc(m)}">${esc(t)}</button>`).join(' ')}</div>
      <label class="bp-check"><input type="checkbox" id="rg-tiene-rec"${tiene ? ' checked' : ''}> 🔥 Tiene usos o un contador <small>(aparece en «Recursos» y se recarga con los descansos)</small></label>
      <div id="rg-rec" class="bp-parte"${tiene ? '' : ' hidden'}>
        <div class="bp-grid">
          <label class="bp-campo"><span>Cómo se muestra</span><select id="rg-rec-tipo">${optHtml([['pips', 'Casillas (usos)'], ['pool', 'Contador (puntos)']], rc.tipo || 'pips')}</select></label>
          <label class="bp-campo"><span>Se recarga con</span><select id="rg-rec-recarga">${optHtml(RECARGAS, rc.recarga == null ? 'largo' : rc.recarga)}</select></label>
          <div class="bp-campo bp-ancho"><span>Máximo</span><div class="bp-parte" id="rg-max-campos"></div></div>
        </div>
      </div>
      <label class="bp-check"><input type="checkbox" id="rg-tiene-ef"${tieneEf ? ' checked' : ''}> 🔆 Da un efecto permanente <small>(suma a CA, iniciativa, salvaciones…; se puede apagar desde la tarjeta)</small></label>
      <div id="rg-ef" class="bp-parte"${tieneEf ? '' : ' hidden'}>
        ${EE ? EE.html() : ''}
        <div class="bp-acciones"><button type="button" onclick="FichaEfectosEditor.rg.agregar()">➕ Agregar efecto</button></div>
      </div>
      <div class="bp-campo bp-ancho"><span>Botones de tirada (opcional)</span><div id="rg-acciones"></div>
        <div class="bp-acciones"><button type="button" onclick="FichaRasgos.agregarAccion()">➕ Agregar botón</button></div></div>
      <div class="bp-acciones">
        <button type="button" onclick="FichaRasgos.editor.cerrarFormulario()">Cancelar</button>
        <button type="button" class="bp-guardar" onclick="FichaRasgos.guardarDesdeFormulario()">💾 Guardar rasgo</button>
      </div></div>`;
  }
  function guardarDesdeFormulario() {
    leerAcciones(); leerMaxForm();
    const nombre = ($('rg-nombre').value || '').trim();
    if (!nombre) { alert('El rasgo necesita un nombre.'); return; }
    const idx = editor.editandoIdx(), previo = idx !== null ? normalizar(editor.items()[idx]) : null;
    const nuevo = {
      id: previo ? previo.id : nuevoId(nombre), nombre, icono: ($('rg-icono').value || '').trim(),
      origen: { tipo: $('rg-origen-tipo').value, nombre: ($('rg-origen-nombre').value || '').trim() },
      nivel: $('rg-nivel').value, texto: $('rg-texto').value,
      acciones: accionesForm,
    };
    if ($('rg-tiene-rec').checked) {
      nuevo.recurso = { tipo: $('rg-rec-tipo').value, recarga: $('rg-rec-recarga').value || null, max: filaAMax(maxForm) };
      if (previo && previo.recurso) ['id', 'campo', 'prefijo', 'ids', 'pasos', 'inicial', 'icono', 'desc', 'hechizos', 'etiquetas'].forEach((k) => { if (previo.recurso[k] != null && (k !== 'pasos' || previo.recurso.tipo === nuevo.recurso.tipo)) nuevo.recurso[k] = previo.recurso[k]; });
    }
    if ($('rg-tiene-ef').checked && EE) nuevo.efectos = EE.leer();
    if (previo) { if (previo.activo === false) nuevo.activo = false; if (previo.biblioteca) nuevo.biblioteca = previo.biblioteca; if (previo.desde) nuevo.desde = previo.desde; }
    const limpio = normalizar(nuevo);
    if (!limpio) { alert('No se pudo guardar el rasgo.'); return; }
    editor.guardarDesdeFormulario(limpio);
  }
  /* --- publicar / quitar de la biblioteca global --- */
  function paraBiblioteca(r) {
    const o = normalizar(r); if (!o) return null;
    delete o.activo; delete o.biblioteca; delete o.desde;
    if (o.recurso) ['id', 'campo', 'prefijo', 'ids'].forEach((k) => { delete o.recurso[k]; });   // los ids de las casillas son de esta ficha
    return o;
  }
  async function nombreDeAutor() {
    try { const n = (await ctxIni.db.ref(`usuarios/${ctxIni.uid}/perfil/nombre`).once('value')).val(); if (n) return String(n).slice(0, 60); } catch (e) { /* se usa el de la cuenta */ }
    const u = ctxIni.user || {};
    return String(u.displayName || (u.email ? String(u.email).split('@')[0] : '') || 'Jugador').slice(0, 60);
  }
  async function publicar(idx) {
    if (soloLectura()) return;
    const r = normalizar(editor.items()[idx]); if (!r) return;
    const mio = r.biblioteca && r.biblioteca.autor === ctxIni.uid;
    if (!mio && !confirm(`¿Guardar «${r.nombre}» en la biblioteca global? Cualquier jugador podrá agregarlo a sus fichas; solo tú podrás editarlo o borrarlo.`)) return;
    const datos = paraBiblioteca(r); if (!datos) return;
    const bid = mio ? r.biblioteca.id : nuevoId(r.nombre);
    datos.id = bid; datos.autor = ctxIni.uid; datos.autorNombre = await nombreDeAutor(); datos.actualizado = Date.now();
    try {
      await ctxIni.db.ref('biblioteca/rasgos_custom/' + bid).set(JSON.parse(JSON.stringify(datos)));
      editor.mutar(idx, (it) => { it.biblioteca = { id: bid, autor: ctxIni.uid }; });
      cacheGlobal = null;
      aviso(mio ? 'Biblioteca actualizada.' : '📚 Guardado en la biblioteca global.');
    } catch (e) { alert('No se pudo guardar en la biblioteca: ' + (e && e.message ? e.message : e)); }
  }
  async function quitarDeBiblioteca(idx) {
    const r = normalizar(editor.items()[idx]); if (!r || !r.biblioteca) return;
    if (!confirm(`¿Borrar «${r.nombre}» de la biblioteca global? Las fichas que ya lo copiaron lo conservan.`)) return;
    try { await ctxIni.db.ref('biblioteca/rasgos_custom/' + r.biblioteca.id).remove(); editor.mutar(idx, (it) => { delete it.biblioteca; }); cacheGlobal = null; aviso('Quitado de la biblioteca.'); }
    catch (e) { alert('No se pudo borrar: ' + (e && e.message ? e.message : e)); }
  }
  function quitar(idx) {
    if (soloLectura()) return;
    const r = normalizar(editor.items()[idx]); if (!r) return;
    const rec = recursoDe(r);
    editor.eliminar(idx, `¿Quitar el rasgo «${r.nombre}» de esta ficha?`);
    if (rec && ctxIni && ctxIni.charRef && !items().some((x) => x.id === r.id)) {
      // ya no hacen falta los valores guardados de sus casillas o su contador
      const claves = rec.tipo === 'pool' ? [rec.campo] : (rec.ids || Array.from({ length: 12 }, (_, i) => rec.prefijo + (i + 1)));
      claves.forEach((k) => ctxIni.charRef.child('datos/' + k).remove().catch(() => {}));
    }
  }

  /* --- biblioteca: integrada + global --- */
  async function cargarGlobal() {
    if (cacheGlobal) return cacheGlobal;
    const v = (await ctxIni.db.ref('biblioteca/rasgos_custom').once('value')).val() || {};
    cacheGlobal = Object.keys(v).map((k) => { const r = normalizar(Object.assign({}, v[k], { id: k })); return r ? Object.assign(r, { _autor: v[k].autor, _autorNombre: v[k].autorNombre || '', _fuente: 'global' }) : null; }).filter(Boolean);
    return cacheGlobal;
  }
  function integrados() {
    return (typeof RASGOS_BASE !== 'undefined' ? RASGOS_BASE : []).map((x) => { const r = normalizar(Object.assign({}, x, { id: x.id.replace(/[^a-zA-Z0-9_-]/g, '_') })); return r ? Object.assign(r, { _id: x.id, _fuente: 'base' }) : null; }).filter(Boolean);
  }
  let listaBiblioteca = [];
  async function abrirBiblioteca() {
    const cont = $('rasgos-biblioteca'); if (!cont) return;
    if (cont.innerHTML.trim()) { cont.innerHTML = ''; return; }   // alterna
    cont.innerHTML = '<p class="texto-suave">Cargando la biblioteca…</p>';
    let glob = [];
    try { glob = await cargarGlobal(); } catch (e) { /* solo la integrada */ }
    listaBiblioteca = integrados().concat(glob);
    cont.innerHTML = `<div class="rg-biblioteca">
      <div class="bp-grid">
        <label class="bp-campo bp-ancho"><span>🔎 Buscar en la biblioteca (nombre, texto, clase…)</span><input type="search" id="rgb-buscar" placeholder="p. ej. Wild Shape, aura, orco" autocomplete="off"></label>
        <label class="bp-campo"><span>Viene de</span><select id="rgb-tipo">${optHtml([['', 'Todo']].concat(ORIGENES), '')}</select></label>
        <label class="bp-campo"><span>Mostrar</span><select id="rgb-alcance">${optHtml([['mis', 'Lo de mis clases y subclases'], ['todo', 'Toda la biblioteca']], clasesDelPersonaje().length ? 'mis' : 'todo')}</select></label>
      </div>
      <div id="rgb-lista"></div>
      <div class="fila"><button type="button" class="btn btn-fantasma btn-sm" onclick="FichaRasgos.abrirBiblioteca()">Cerrar la biblioteca</button></div></div>`;
    pintarBiblioteca();
  }
  function pintarBiblioteca() {
    const lista = $('rgb-lista'); if (!lista) return;
    const q = norm(($('rgb-buscar') || {}).value), tipo = ($('rgb-tipo') || {}).value, mis = ($('rgb-alcance') || {}).value === 'mis';
    const propios = new Set(clasesDelPersonaje().concat(subclasesDelPersonaje()).map(norm));
    const r = listaBiblioteca.filter((x) => {
      if (tipo && x.origen.tipo !== tipo) return false;
      if (mis && !q && !propios.has(norm(x.origen.nombre))) return false;
      if (!q) return true;
      return norm([x.nombre, x.texto, x.origen.nombre, x._autorNombre].join(' ')).indexOf(q) >= 0;
    }).slice(0, 60);
    lista.innerHTML = r.length ? r.map((x) => {
      const resumen = resumenRasgo(x), i = listaBiblioteca.indexOf(x), mio = x._fuente === 'global' && x._autor === ctxIni.uid;
      return `<div class="feature-card rgb-item"><div class="fila"><h4>${esc(x.icono ? x.icono + ' ' : '')}${esc(x.nombre)}</h4><span class="tag">${esc(etiquetaOrigen(x) || 'Propio')}</span></div>
        ${x.texto ? `<p class="texto-suave">${esc(x.texto.length > 220 ? x.texto.slice(0, 220) + '…' : x.texto)}</p>` : ''}
        ${resumen ? `<p class="texto-suave rasgo-resumen">${esc(resumen)}</p>` : ''}
        <div class="fila"><span class="texto-suave">${x._fuente === 'base' ? '📘 Integrada' : '👥 ' + esc(x._autorNombre || 'Jugador')}</span>
          <span class="rasgo-botones"><button type="button" class="btn btn-primario btn-sm" onclick="FichaRasgos.agregarDeBiblioteca(${i})">➕ Agregar a mi ficha</button>${mio ? `<button type="button" class="btn btn-fantasma btn-sm" onclick="FichaRasgos.borrarGlobal(${i})">🗑️ Borrar</button>` : ''}</span></div></div>`;
    }).join('') : '<p class="texto-suave">No hay rasgos con esos filtros. Prueba «Toda la biblioteca» o crea uno propio y publícalo con 📤.</p>';
  }
  function agregarRasgo(r) {
    const c = normalizar(r); if (!c) return;
    // una copia independiente: editarla aquí no cambia la biblioteca ni otras fichas
    const rc = c.recurso; if (rc) ['id', 'campo', 'prefijo'].forEach((k) => { delete rc[k]; });
    c.id = nuevoId(c.nombre);
    const lista = editor.items(); lista.push(c);
    editor.mutar(lista.length - 1, () => {});   // guarda y vuelve a dibujar
    aviso(`➕ «${c.nombre}» agregado a tu ficha.`);
  }
  function agregarDeBiblioteca(i) {
    if (soloLectura()) return;
    const x = listaBiblioteca[i]; if (!x) return;
    const copia = JSON.parse(JSON.stringify(x));
    delete copia.biblioteca; copia.desde = { tipo: x._fuente === 'base' ? 'base' : 'global', id: x._fuente === 'base' ? x._id : x.id };
    agregarRasgo(copia);
  }
  async function borrarGlobal(i) {
    const x = listaBiblioteca[i]; if (!x || x._fuente !== 'global' || x._autor !== ctxIni.uid) return;
    if (!confirm(`¿Borrar «${x.nombre}» de la biblioteca global? Las fichas que ya lo copiaron lo conservan.`)) return;
    try { await ctxIni.db.ref('biblioteca/rasgos_custom/' + x.id).remove(); cacheGlobal = null; listaBiblioteca = listaBiblioteca.filter((y) => y !== x); pintarBiblioteca(); aviso('Borrado de la biblioteca.'); }
    catch (e) { alert('No se pudo borrar: ' + (e && e.message ? e.message : e)); }
  }

  /* --- arranque --- */
  // Los escuchas de documento se instalan una sola vez al iniciar (el módulo es puro al cargarse).
  let escuchasInstalados = false;
  function instalarEscuchas() {
    if (escuchasInstalados) return; escuchasInstalados = true;
    // Campos que cambian la forma del formulario
    document.addEventListener('change', (e) => {
      const t = e.target; if (!t || !t.id) return;
      if (t.id === 'rg-tiene-rec') { const b = $('rg-rec'); if (b) b.hidden = !t.checked; }
      else if (t.id === 'rg-tiene-ef') { const b = $('rg-ef'); if (b) b.hidden = !t.checked; if (t.checked && EE && !EE.cuenta()) EE.cargar([], false); }
      else if (t.id === 'rg-max-t') pintarMax();
    });
    document.addEventListener('change', (e) => {
      const t = e.target; if (!t || !t.dataset || t.dataset.rasgoActivo === undefined) return;
      editor.mutar(parseInt(t.dataset.rasgoActivo, 10), (it) => { if (t.checked) delete it.activo; else it.activo = false; });
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-rg-ins]'); if (!b) return;
      const ta = $('rg-texto'); if (!ta) return;
      const ins = b.dataset.rgIns, a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, z = ta.selectionEnd == null ? a : ta.selectionEnd;
      ta.value = ta.value.slice(0, a) + ins + ta.value.slice(z); ta.focus(); ta.selectionStart = ta.selectionEnd = a + ins.length;
    });

    document.addEventListener('input', (e) => { if (e.target && e.target.id === 'rgb-buscar') pintarBiblioteca(); });
    document.addEventListener('change', (e) => { if (e.target && (e.target.id === 'rgb-tipo' || e.target.id === 'rgb-alcance')) pintarBiblioteca(); });

  }

  function iniciar(ctx) {
    ctxIni = ctx;
    const P = ctx.P;
    instalarEscuchas();
    if (!global.FichaComun || !FichaComun.crearEditorDeLista) return null;
    if (FichaComun.crearEditorEfectos) EE = FichaComun.crearEditorEfectos('rg', { fraseInicio: 'Efecto: ' });
    editor = FichaComun.crearEditorDeLista({
      storageKey: 'rasgos-propios-json',
      datosIniciales: (P.rasgosPropios || []).map(normalizar).filter(Boolean),
      contenedorListaId: 'rasgos-propios-lista',
      contenedorFormId: 'rasgos-propios-form',
      filaVacia: '<p class="texto-suave">Aquí van los rasgos que agregues tú (con su recurso y efecto si los tienen). Puedes crearlos o traerlos de la biblioteca.</p>',
      alCambiar: () => { sincronizarRecursos(); FichaComun.notificarBuffs(); calcular(); },
      renderFila, renderFormulario,
    });
    items = () => editor.items().map(normalizar).filter(Boolean);
    FichaComun.registrarFuenteBuffs(() => items().map((r, idx) => ({ r, idx })).filter((x) => x.r.efectos && x.r.activo !== false).map((x) => ({
      nombre: x.r.nombre, icono: x.r.icono || '🧩', efectos: x.r.efectos,
      apagar: () => editor.mutar(x.idx, (it) => { it.activo = false; }),
    })));
    sincronizarRecursos();
    return API;
  }
  const API = {
    iniciar, normalizar, declarativo, marcadores, textoSeguro, recursoDe, resumenRasgo, limpiarEfecto, limpiarRecurso, textoMax, etiquetaOrigen,
    get editor() { return editor; }, items: () => items(),
    guardarDesdeFormulario, agregarAccion() { leerAcciones(); accionesForm.push({ texto: '', roll: '' }); pintarAcciones(); },
    quitarAccion(i) { leerAcciones(); accionesForm.splice(i, 1); pintarAcciones(); },
    quitar, publicar, quitarDeBiblioteca, abrirBiblioteca, agregarDeBiblioteca, borrarGlobal, agregarRasgo,
    sincronizarRecursos, ORIGENES, ABIL,
  };
  global.FichaRasgos = API;
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * ficha-shell.js — carcasa única de la ficha: ficha.html?pj=<id>[&campana=<código>]
 *
 * Una sola página para todos los personajes. Lo que cambia entre personajes es un archivo de datos
 * (personajes/<id>.js) con la forma de abajo; todo lo demás (dibujo, motores, dados, grupo, nivel) es común.
 *
 * Orden de arranque:
 *   1) lee ?pj y carga personajes/<id>.js            → window.PERSONAJES[id]
 *   2) arma FICHA_CONFIG para el motor y dibuja la ficha (ficha-plantilla.js)
 *   3) carga fragmentos HTML de secciones propias    (personajes/<id>/<sección>.html)
 *   4) carga el motor y los módulos (ficha-common, ficha-dados, ficha-vitales, ficha-party, ficha-nivel)
 *   5) con la sesión iniciada: conecta Firebase y arranca cada motor sobre el DOM ya dibujado
 *
 * FORMA DE personajes/<id>.js
 *   window.PERSONAJES = window.PERSONAJES || {};
 *   PERSONAJES.<id> = {
 *     id, nombre, sistema:'dnd', paleta:'bosque',
 *     subtitulo, chips:[...], xp,
 *     clases:[{ nombre:'Druid', dado:8, nivelInicial:8, caster:'full'|'half'|'third'|'pact', subclase }],   (CONFIG_NIVEL.clases)
 *     hpBase,                       PG máximos sin subidas registradas
 *     velocidad:30, habilidadAtaque:'STR', habilidadConjuro:'WIS', sinConjuros:false,
 *     atributos:{ STR:13, … }, salvaciones:['INT','WIS'], habilidades:{ 'Insight':'comp'|'exp', … }, competencias:'html',
 *     ca:{ fija:17 } | { sinArmadura:() => 10 + FichaAtributos.modDe('DEX') + …, texto:'10 + DEX + WIS' },
 *     ataques:[{ nombre, habilidad:'STR', competente:true, bonoExtra:0, dano:{count,sides,mod:'STR'|n|{hab,prof,fijo}}, textoDano, notas, extras:[{nombre,dado}],
 *                soloDano:true (fila sin tirada de ataque; dano.count y textoDano pueden ser funciones (ctx) => …) }],
 *     velocidadNota:'/ 🦇30 vuelo', badgeAtaque:{ extra:4, alternativo:-5 }   (el badge de ataque suma `extra` y muestra "+12/+7"),
 *     espaciosModo:'casillas'   (espacios como casillas chk-slotN-M, ☑ = usado, con espejo slot-N-cur: ver renderEspacios),
 *     hechizos:[…], inventario:[…], reputacion:[…],                      (semillas; mismo formato que FICHA_CONFIG)
 *     recursos:[ ver ficha-vitales.js ],
 *     rasgos:[{ id:'txt-feat-…', tag, titulo, html }],
 *     secciones:[{ id, icono, titulo, fragmento:'personajes/<id>/x.html' | html }],
 *     monedas:[{ id:'gp-val', etiqueta:'Oro (po)' }], trasfondo:{ html },
 *     ganchos:{ resolverSlotId, alGastarSlot, ventajaForzada, notasD20(o)=>[texto], validarLanzamiento(h,nivel,slotId)=>aviso|null, etiquetaEspacio(slotId,nivel)=>texto },   (opcionales; notasD20 agrega notas al detalle de un d20)
 *     ca:{ fija, casillaAuto:true, bonoConArmadura:1 }   (casillaAuto: casilla «calcular desde el equipo»; la CA fija manda mientras esté apagada)
 *     auras:[{ id, nombre, icono, texto, objetivo:'salvaciones'|'iniciativa'|…, valor:()=>n, activa:true }]   (buffs permanentes con casilla)
 *     calculos:{ clave: () => texto }                                    (valores para <span class="js-calc" data-calc="clave">)
 *     rasgos[].acciones:[{ texto, roll } | { texto, uso:'Nombre' }]      (botón que tira una fórmula o anota un uso)
 *     iniciar(ctx)                                                       (opcional: código propio de la clase o del personaje)
 *   };
 *
 * PERSONAJES DINÁMICOS (creador de personajes): un id que empieza con `pc_` no tiene archivo; su definición vive en
 *   campanas/<campaña>/personajes/<id>/definicion   (o usuarios/<uid>/personajes/<id>/definicion sin campaña)
 * y es la MISMA forma pero solo con datos (JSON): nada de funciones. Lo que en los archivos es una función se declara así:
 *   recursos[].max / recursos[].valor:  número | { fijo:n } | { por:n, clase? } | { tabla:{nivel:valor}, clase? } | { modificador:'CHA', min:1 }
 *   ca:{ formula:['DEX','CON'] }       → 10 + esos modificadores mientras no haya armadura equipada
 * (ver normalizarDefinicion). Las clases/subclases custom de la campaña se fusionan en CLASSES antes de arrancar los motores.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const pj = (params.get('pj') || '').replace(/[^a-z0-9_]/gi, '');
  const codigoCampana = params.get('campana');
  const raiz = () => document.getElementById('ficha-raiz');
  const $ = (id) => document.getElementById(id);
  const num = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };

  const FIREBASE = {
    apiKey: 'AIzaSyBaCAA748xac6HcrQnY-p1jHRp8_CtgtbU', authDomain: 'personajes-rol.firebaseapp.com',
    databaseURL: 'https://personajes-rol-default-rtdb.firebaseio.com', projectId: 'personajes-rol',
    storageBucket: 'personajes-rol.appspot.com', messagingSenderId: '81108671440', appId: '1:81108671440:web:effb710af86054f4c6f7d5',
  };

  function mensaje(html) {
    const r = raiz();
    if (r) r.innerHTML = `<div class="aviso aviso-mal" role="alert" style="margin:var(--sp-4)"><span>${html}</span></div>`;
  }
  function cargarScript(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }

  /* ---------- definiciones dinámicas (solo datos) ---------- */
  function escalonado(tabla, niv) {
    let v = null, mejor = -1;
    Object.keys(tabla || {}).forEach(k => { const n = parseInt(k, 10); if (!isNaN(n) && n <= niv && n > mejor) { mejor = n; v = tabla[k]; } });
    return v;
  }
  function declarativo(m) {
    if (m == null || typeof m === 'function' || typeof m !== 'object') return m;
    return (c) => {
      const niv = m.clase ? c.clase(m.clase) : c.nivel;
      if (m.tabla) { const v = escalonado(m.tabla, niv); return v == null ? 0 : v; }
      if (m.por != null) return m.por * niv;
      if (m.modificador) return Math.max(m.min != null ? m.min : 0, c.mod(m.modificador));
      return m.fijo != null ? m.fijo : 0;
    };
  }
  function aLista(v) { return Array.isArray(v) ? v.filter(x => x != null) : (v && typeof v === 'object' ? Object.keys(v).map(k => v[k]) : []); }
  // Una definición dinámica la escribe un jugador: NADA de lo que trae se interpreta como HTML ni como código.
  const escTxt = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const aHtmlSeguro = (t) => escTxt(t).replace(/\n/g, '<br>');
  const idSeguro = (t, def) => String(t == null ? '' : t).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || def;
  const ABIL_VALIDAS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  function normalizarDefinicion(D, id) {
    const d = Object.assign({}, D, { id });
    delete d.ganchos; delete d.iniciar; delete d.calculos; delete d.secciones; delete d.auras; delete d.nivel; delete d.badgeAtaque; delete d.espaciosModo;
    ['clases', 'chips', 'salvaciones', 'ataques', 'hechizos', 'inventario', 'reputacion', 'recursos', 'rasgos', 'secciones', 'monedas', 'buffs', 'auras'].forEach(k => { if (d[k] != null) d[k] = aLista(d[k]); });
    d.clases = (d.clases || []).map(c => Object.assign({}, c));
    d.competencias = d.competencias ? aHtmlSeguro(d.competencias) : '';
    d.trasfondo = (d.trasfondo && (d.trasfondo.texto || d.trasfondo.html)) ? { html: aHtmlSeguro(d.trasfondo.texto || d.trasfondo.html) } : undefined;
    d.rasgos = (d.rasgos || []).map((r, i) => ({ id: idSeguro(r.id, 'txt-feat-' + (i + 1)), tag: r.tag, titulo: r.titulo, html: aHtmlSeguro(r.texto != null ? r.texto : r.html) }));
    d.ataques = (d.ataques || []).map((a) => {
      const x = Object.assign({}, a); delete x.html; delete x.bonoTexto; delete x.acciones;
      if (x.dano) x.dano = { count: parseInt(x.dano.count, 10) || 1, sides: parseInt(x.dano.sides, 10) || 4, mod: ABIL_VALIDAS.includes(x.dano.mod) ? x.dano.mod : (parseInt(x.dano.mod, 10) || 0) };
      if (!ABIL_VALIDAS.includes(x.habilidad)) x.habilidad = 'STR';
      return x;
    });
    d.monedas = (d.monedas && d.monedas.length ? d.monedas : [{ id: 'gp-val', etiqueta: 'Oro (po)' }]).map(m => ({ id: idSeguro(m.id, 'gp-val'), etiqueta: m.etiqueta || 'Oro', valor: parseInt(m.valor, 10) || 0 }));
    if (!ABIL_VALIDAS.includes(d.habilidadAtaque)) d.habilidadAtaque = 'STR';
    if (d.habilidadConjuro && !ABIL_VALIDAS.includes(d.habilidadConjuro)) d.habilidadConjuro = null;
    d.salvaciones = (d.salvaciones || []).filter(k => ABIL_VALIDAS.includes(k));
    d.recursos = (d.recursos || []).map(r => {
      const x = Object.assign({}, r);
      x.id = idSeguro(x.id, 'recurso'); if (x.prefijo) x.prefijo = idSeguro(x.prefijo, x.id + '-use-'); if (x.campo) x.campo = idSeguro(x.campo, x.id + '-cur');
      x.max = declarativo(x.max);
      if (x.valor && typeof x.valor === 'object') { const f = declarativo(x.valor); x.valor = (c) => { const v = f(c); return v == null ? '—' : String(v); }; }
      return x;
    });
    if (d.ca && Array.isArray(d.ca.formula) || (d.ca && d.ca.formula && typeof d.ca.formula === 'object')) {
      const hs = aLista(d.ca.formula).filter(h => ABIL_VALIDAS.includes(h));
      d.ca = Object.assign({}, d.ca, { sinArmadura: () => 10 + hs.reduce((s, h) => s + FichaAtributos.modDe(h), 0), texto: '10 + ' + (hs.join(' + ') || '0') });
    }
    return d;
  }
  function esperarUsuario() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE);
    return new Promise((ok) => {
      let hecho = false, off = null;
      off = firebase.auth().onAuthStateChanged((u) => { if (hecho) return; hecho = true; ok(u); if (typeof off === 'function') off(); });
    });
  }
  async function cargarDefinicionDinamica() {
    const user = await esperarUsuario();
    if (!user) { location.href = 'index.html'; return null; }
    const db = firebase.database();
    const ruta = codigoCampana ? `campanas/${codigoCampana}/personajes/${pj}/definicion` : `usuarios/${user.uid}/personajes/${pj}/definicion`;
    const D = (await db.ref(ruta).once('value')).val();
    return D ? normalizarDefinicion(D, pj) : null;
  }

  /* ---------- toasts mínimos ---------- */
  function toast(msg) {
    const z = $('toast-zona'); if (!z) return;
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    z.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  let P = null;
  let SKILLS_CFG = [];

  /* ---------- FICHA_CONFIG para el motor ---------- */
  function armarConfig() {
    const g = P.ganchos || {};
    const cfg = {
      personajeId: P.id,
      nombrePersonaje: P.nombre,
      sistemaPropio: P.sistema || 'dnd',
      wrapperSelector: '.ficha',
      mostrarTirada: (total, etiqueta, detalle) => window.FichaDados.mostrar(total, etiqueta, detalle),
      habilidadConjuro: P.habilidadConjuro || null,
      slotsIds: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `slot-${n}-cur`),
      hechizosIniciales: P.hechizos || [],
      inventarioInicial: P.inventario || [],
      reputacionInicial: P.reputacion || [],
      buffsIniciales: P.buffs || [],
      resumenClase: null,
    };
    if (P.ca && P.ca.fija != null) cfg.caBase = P.ca.fija;
    if (P.ca && P.ca.sinArmadura) { cfg.caSinArmadura = P.ca.sinArmadura; cfg.caSinArmaduraTexto = P.ca.texto || ''; }
    // CA base editable a mano (campo guardado en datos/<id>): se usa mientras no haya armadura ni escudo equipados.
    if (P.ca && P.ca.manual) {
      delete cfg.caBase;
      cfg.caSinArmadura = () => { const e = document.getElementById(P.ca.manual); return e ? num(e.value, P.ca.fija != null ? P.ca.fija : 10) : (P.ca.fija != null ? P.ca.fija : 10); };
      cfg.caSinArmaduraTexto = 'valor manual de CA base';
    }
    ['resolverSlotId', 'alGastarSlot', 'ventajaForzada', 'notasD20', 'validarLanzamiento', 'etiquetaEspacio'].forEach(k => { if (g[k]) cfg[k] = g[k]; });
    window.FICHA_CONFIG = cfg;
    window.CONFIG_NIVEL = { clases: P.clases.map(c => Object.assign({}, c)) };
  }

  /* ---------- fragmentos de secciones propias ---------- */
  async function cargarFragmentos() {
    const nodos = Array.from(document.querySelectorAll('.seccion-propia[data-fragmento]')).filter(n => n.dataset.fragmento);
    await Promise.all(nodos.map(async (n) => {
      try {
        const r = await fetch(n.dataset.fragmento, { cache: 'no-cache' });
        if (!r.ok) throw new Error(r.status);
        n.innerHTML = await r.text();
      } catch (e) { n.innerHTML = '<p class="texto-suave">No se pudo cargar esta sección.</p>'; }
    }));
  }

  /* ---------- espacios de conjuro (tabla por clase y nivel) ---------- */
  function espaciosActuales() {
    if (P.sinConjuros || !window.FichaNivel) return { slots: [], pacto: null };
    const niv = {};
    window.CONFIG_NIVEL.clases.forEach(c => { niv[c.nombre] = FichaVitales.nivelClase(c.nombre); });
    return FichaNivel.espaciosPara(niv);
  }
  /* ---------- espacios como CASILLAS (espaciosModo:'casillas'; p. ej. Dane) ----------
     Las casillas chk-slotN-M son la fuente de verdad (☑ = usado) y `slot-N-cur` es un espejo (disponibles = sin marcar) que
     FichaHechizos.usar descuenta; el puente traslada ese gasto a una casilla. Los datos ya guardados (chk-slotN-M) siguen valiendo. */
  let enUsarHechizo = false;
  function slotCasillas(n) { return Array.from(document.querySelectorAll(`#espacios-conjuro [data-slot-nivel="${n}"] input[type="checkbox"]`)); }
  function refrescarSlotCur() {
    if (enUsarHechizo) return;
    document.querySelectorAll('#espacios-conjuro [data-slot-nivel]').forEach(row => {
      const n = row.dataset.slotNivel, cbs = slotCasillas(n);
      const cur = $(`slot-${n}-cur`), max = $(`slot-${n}-max`);
      const disp = String(cbs.filter(c => !c.checked).length);
      if (cur && cur.textContent !== disp) cur.textContent = disp;
      if (max && max.textContent !== String(cbs.length)) max.textContent = String(cbs.length);
    });
  }
  function renderEspaciosCasillas() {
    const cont = $('espacios-conjuro'); if (!cont) return;
    const e = espaciosActuales();
    e.slots.forEach((max, i) => {
      const n = i + 1;
      if (max <= 0) return;
      let row = cont.querySelector(`[data-slot-nivel="${n}"]`);
      if (!row) {
        row = document.createElement('div'); row.className = 'slot-card slot-casillas'; row.dataset.slotNivel = String(n);
        row.innerHTML = `<h4>Nivel ${n}</h4><div class="pips slot-pips"></div><span class="slot-resumen texto-suave">Disp.: <span id="slot-${n}-cur">${max}</span>/<span id="slot-${n}-max">${max}</span></span>`;
        cont.appendChild(row);
      }
      const grupo = row.querySelector('.slot-pips');
      let cbs = slotCasillas(n);
      for (let k = cbs.length + 1; k <= max; k++) {   // agrega, nunca quita
        const lab = document.createElement('label'); lab.className = 'pip-casilla';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `chk-slot${n}-${k}`; cb.setAttribute('aria-label', `Espacio de nivel ${n}, número ${k}`);
        const sp = document.createElement('span'); sp.className = 'pip'; sp.setAttribute('aria-hidden', 'true');
        lab.append(cb, sp); grupo.appendChild(lab);
      }
    });
    if (window.FichaComun) FichaComun.reaplicarDatos();
    refrescarSlotCur();
    const info = $('pacto-info'); if (info && !cont.children.length) info.textContent = 'Sin espacios de conjuro todavía.';
  }
  function instalarPuenteCasillas() {
    if (!window.FichaHechizos || FichaHechizos.__puente) return;
    const usarOriginal = FichaHechizos.usar;
    FichaHechizos.usar = function (idx) {
      const h = FichaHechizos.editor.items()[idx];
      let n = h && h.slotCost;
      if (h && h.upcast) { const sel = $(`upcast-sel-${idx}`); n = sel ? parseInt(sel.value, 10) : h.upcast.nivelBase; }
      refrescarSlotCur();
      const el = n ? $(`slot-${n}-cur`) : null;
      const antes = el ? parseInt(el.textContent, 10) : NaN;
      enUsarHechizo = true;
      try { usarOriginal(idx); } finally { enUsarHechizo = false; }
      if (el && !isNaN(antes) && parseInt(el.textContent, 10) === antes - 1) {
        const cb = slotCasillas(n).find(c => !c.checked);
        if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      refrescarSlotCur();
    };
    FichaHechizos.__puente = true;
    document.addEventListener('change', (e) => { if (e.target.matches('#espacios-conjuro input[type="checkbox"]')) refrescarSlotCur(); });
    document.addEventListener('ficha:datos-sincronizados', () => refrescarSlotCur());
  }

  function renderEspacios() {
    if (P.espaciosModo === 'casillas') return renderEspaciosCasillas();
    const cont = $('espacios-conjuro'); if (!cont) return;
    const e = espaciosActuales();
    const actuales = {};
    cont.querySelectorAll('[data-slot-nivel]').forEach(c => { actuales[c.dataset.slotNivel] = c; });
    e.slots.forEach((max, i) => {
      const n = i + 1; let card = actuales[n];
      if (max <= 0) { if (card) card.remove(); return; }
      if (!card) {
        card = document.createElement('div'); card.className = 'slot-card'; card.dataset.slotNivel = String(n);
        card.innerHTML = `<h4>Nivel ${n}</h4><div class="contador" role="group" aria-label="Espacios de nivel ${n}"><button type="button" data-slot="${n}" data-delta="-1" aria-label="Gastar un espacio de nivel ${n}">−</button><div><span class="slot-val contador-valor" id="slot-${n}-cur">${max}</span><span class="contador-max"> / <span id="slot-${n}-max">${max}</span></span></div><button type="button" data-slot="${n}" data-delta="1" aria-label="Recuperar un espacio de nivel ${n}">+</button></div>`;
        cont.appendChild(card);
      } else { const m = $(`slot-${n}-max`); if (m) m.textContent = String(max); }
    });
    if (window.FichaComun) FichaComun.reaplicarDatos();   // las tarjetas nuevas (subida de nivel) reciben su valor guardado
    const info = $('pacto-info');
    if (e.pacto) {
      let card = cont.querySelector('[data-slot-pacto]');
      if (!card) {
        card = document.createElement('div'); card.className = 'slot-card'; card.dataset.slotPacto = '1';
        card.innerHTML = `<h4>Magia de pacto (nivel <span id="slot-pact-nivel">${e.pacto.nivel}</span>)</h4><div class="contador" role="group" aria-label="Espacios de pacto"><button type="button" data-slot="pact" data-delta="-1" aria-label="Gastar un espacio de pacto">−</button><div><span class="slot-val contador-valor" id="slot-pact-cur">${e.pacto.count}</span><span class="contador-max"> / <span id="slot-pact-max">${e.pacto.count}</span></span></div><button type="button" data-slot="pact" data-delta="1" aria-label="Recuperar un espacio de pacto">+</button></div>`;
        cont.appendChild(card);
      } else { $('slot-pact-max').textContent = String(e.pacto.count); $('slot-pact-nivel').textContent = String(e.pacto.nivel); }
      if (info) info.textContent = 'Los espacios de pacto se recuperan con un descanso corto o largo.';
    }
    if (!cont.children.length && info) info.textContent = 'Sin espacios de conjuro todavía.';
  }
  function maxEspacios() {
    const e = espaciosActuales(); const o = {};
    e.slots.forEach((m, i) => { if (m > 0) o[i + 1] = m; });
    return o;
  }

  // Iniciativa base: DEX, salvo que el personaje tenga una fórmula propia (P.iniciativa.calcular, p. ej. DEX + INT).
  function iniciativaBase() {
    if (P.iniciativa && typeof P.iniciativa.calcular === 'function') return P.iniciativa.calcular({ mod: (h) => FichaAtributos.modDe(h), prof: FichaAtributos.profBonusActual() });
    return FichaAtributos.modDe('DEX');
  }

  /* ---------- números derivados que se muestran en varios lugares ---------- */
  function refrescarDerivados() {
    if (!window.FichaAtributos) return;
    const prof = FichaAtributos.profBonusActual();
    const f = (n) => (n >= 0 ? '+' : '') + n;
    const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
    set('prof-badge', f(prof)); set('prof-badge-2', f(prof)); set('barra-prof', f(prof));
    set('chip-nivel', 'Nivel ' + FichaVitales.nivelTotal());
    set('prof-nivel', 'Nivel ' + FichaVitales.nivelTotal());
    set('barra-ca', ($('ac-total') || {}).textContent || '—');
    const hm = $('hp-max-total'); if (hm) hm.textContent = String(FichaVitales.hpMaxActual());
    FichaVitales.pintarHP();
    // ataques
    (P.ataques || []).forEach((a, i) => {
      const bono = FichaAtributos.modDe(a.habilidad || 'STR') + (a.competente === false ? 0 : prof) + (a.bonoExtra || 0);   // (a.conjuro: mismo valor sin buffs)
      set('atq-bono-' + i, f(bono));
    });
    if (P.habilidadConjuro) set('atq-bono-conjuro', f(FichaAtributos.modDe(P.habilidadConjuro) + prof));
    // estadísticas base
    const extraAtk = (P.badgeAtaque && P.badgeAtaque.extra) || 0;
    set('atk-base', f(FichaAtributos.modDe(P.habilidadAtaque || 'STR') + prof + extraAtk) + ` (${P.habilidadAtaque || 'STR'} + comp.${extraAtk ? ' + ' + extraAtk : ''})`);
    if (P.habilidadConjuro) {
      set('spell-atk-base', f(FichaAtributos.modDe(P.habilidadConjuro) + prof) + ` (${P.habilidadConjuro} + comp.)`);
      set('spell-dc-base', (8 + FichaAtributos.modDe(P.habilidadConjuro) + prof) + ` (8 + ${P.habilidadConjuro} + comp.)`);
    }
    set('ini-base', P.iniciativa && P.iniciativa.texto ? P.iniciativa.texto : 'DEX ' + f(FichaAtributos.modDe('DEX')));
    set('vel-base', 'Base ' + (P.velocidad || 30) + ' ft' + (P.velocidadNota ? ' ' + P.velocidadNota : ''));
    (P.ataques || []).forEach((a, i) => { if (typeof a.textoDano === 'function') set('atq-dano-' + i, a.textoDano(FichaVitales.ctx())); });
    set('hp-max-base', 'Base ' + (P.hpBase || 0) + ' + subidas');
  }

  function pintarXP() {
    if (!window.FichaNivel) return;
    const xp = num(($('xp-val') || {}).value, 0);
    const tabla = FichaNivel.tablaXP();
    const nivelXP = FichaNivel.nivelPorXP(xp);
    const actual = tabla.find(t => t.nivel === nivelXP) || tabla[0];
    const sig = tabla.find(t => t.nivel === nivelXP + 1);
    const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
    set('xp-siguiente', sig ? '/ ' + sig.xp.toLocaleString('es-AR') + ' para el nivel ' + sig.nivel : '(nivel máximo)');
    set('xp-nivel-info', 'XP de nivel ' + nivelXP);
    const barra = $('xp-barra');
    if (barra) {
      const pct = sig ? Math.max(0, Math.min(100, Math.round((xp - actual.xp) / (sig.xp - actual.xp) * 100))) : 100;
      if (barra.firstElementChild) barra.firstElementChild.style.width = pct + '%';
      barra.setAttribute('aria-valuenow', String(pct));
    }
  }

  /* ---------- tiradas (delegado) ---------- */
  function etiquetaHab(k) { return k; }
  function bindClicks() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tirar],[data-roll],[data-uso],[data-contador],[data-compendio],[data-ataque],[data-hp-delta],[data-hp-accion],[data-slot],[data-pool],[data-descanso],[data-recurso-formula],.tab');
      if (!t) return;
      if (t.dataset.tirar) {
        const bono = num(t.dataset.bonus || (t.closest('.skill-item') || {}).dataset && t.closest('.skill-item').dataset.bonus, 0);
        if (t.dataset.tirar === 'skill') return FichaDados.d20({ mod: bono, etiqueta: t.dataset.skill, categoria: 'pruebas' });
        if (t.dataset.tirar === 'check') return FichaDados.d20({ mod: bono, etiqueta: etiquetaHab(t.dataset.hab) + ' Check', categoria: 'pruebas' });
        if (t.dataset.tirar === 'save') return FichaDados.d20({ mod: bono, etiqueta: etiquetaHab(t.dataset.hab) + ' Save', categoria: 'salvaciones' });
        if (t.dataset.tirar === 'iniciativa') {
          const m = iniciativaBase() + num(($('iniciativa-buff') || {}).value, 0) + FichaBuffs.plano('iniciativa');
          return FichaDados.d20({ mod: m, etiqueta: 'Iniciativa', categoria: 'pruebas' });
        }
      }
      if (t.dataset.tirar === 'concentracion') return FichaDados.d20({ mod: num(($('ab-con') && $('ab-con').querySelector('.btn-save') || {}).dataset && $('ab-con').querySelector('.btn-save').dataset.bonus, 0), etiqueta: 'CON Save (concentración)', categoria: 'salvaciones' });
      if (t.dataset.ataque !== undefined) return tirarAtaque(t);
      if (t.dataset.contador) return FichaVitales.cambiarContador(t.dataset.contador, num(t.dataset.delta, 0), t.closest('.panel') ? t.closest('.panel').querySelector('h3').textContent.trim() : t.dataset.contador);
      if (t.dataset.uso) return FichaDados.registrarUso(t.dataset.uso, 'recurso');
      if (t.dataset.roll) return FichaDados.tirar(t.dataset.roll, t.dataset.etiqueta || t.dataset.roll);
      if (t.dataset.compendio !== undefined) return FichaCompendio.abrir();
      if (t.dataset.hpDelta) return FichaVitales.cambiarHP(num(t.dataset.hpDelta, 0));
      if (t.dataset.hpAccion) {
        const a = t.dataset.hpAccion, cant = $('hp-cantidad');
        if (a === 'hitdie') return FichaVitales.tirarHitDie();
        if (a === 'muerte') return FichaVitales.salvacionDeMuerte();
        const n = num(cant && cant.value, 0); if (cant) cant.value = '';
        return a === 'dano' ? FichaVitales.recibirDano(n) : FichaVitales.curar(n);
      }
      if (t.dataset.slot) {
        const id = t.dataset.slot === 'pact' ? 'slot-pact-cur' : 'slot-' + t.dataset.slot + '-cur';
        const nombre = t.dataset.slot === 'pact' ? 'Espacio de pacto' : 'Espacio de nivel ' + t.dataset.slot;
        const max = num(($(id.replace('-cur', '-max')) || {}).textContent, 99);
        const cur = num(($(id) || {}).textContent, 0);
        const d = num(t.dataset.delta, 0);
        if (cur + d > max) return;
        return FichaVitales.cambiarContador(id, d, nombre);
      }
      if (t.dataset.pool) {
        const r = (P.recursos || []).find(x => x.campo === t.dataset.pool);
        return FichaVitales.cambiarPool(t.dataset.pool, num(t.dataset.delta, 0), r && r.nombre);
      }
      if (t.dataset.descanso) {
        const largo = t.dataset.descanso === 'largo';
        if (!confirm(largo ? '¿Hacer un descanso largo?' : '¿Hacer un descanso corto?')) return;
        return largo ? FichaVitales.descansoLargo() : FichaVitales.descansoCorto();
      }
      if (t.dataset.recursoFormula) {
        const r = (P.recursos || []).find(x => x.id === t.dataset.recursoFormula);
        if (r) FichaDados.tirar(typeof r.valor === 'function' ? r.valor(FichaVitales.ctx()) : r.valor, r.nombre);
        return;
      }
      if (t.classList.contains('tab')) {
        const grupo = t.parentElement;
        grupo.querySelectorAll('.tab').forEach(b => { const on = b === t; b.setAttribute('aria-selected', String(on)); const p = $(b.getAttribute('aria-controls')); if (p) p.hidden = !on; });
      }
    });
  }

  // Un modificador de daño puede ser un número, una habilidad ('STR') o { hab:'DEX', prof:true } (habilidad + competencia).
  function valorMod(m) {
    if (m == null) return 0;
    if (typeof m === 'number') return m;
    if (typeof m === 'string') return FichaAtributos.modDe(m);
    return (m.hab ? FichaAtributos.modDe(m.hab) : 0) + (m.prof ? FichaAtributos.profBonusActual() : 0) + (m.clase ? FichaVitales.nivelClase(m.clase) * (m.mult || 1) : 0) + (m.fijo || 0);
  }

  function tirarAtaque(btn) {
    const idx = btn.dataset.ataque, modo = btn.dataset.modo;
    const prof = FichaAtributos.profBonusActual();
    if (idx === 'conjuro') {
      const m = FichaAtributos.modDe(P.habilidadConjuro) + prof + num(($('spell-atk-buff') || {}).value, 0) + FichaBuffs.plano('ataque-conjuro');
      return FichaDados.d20({ mod: m, etiqueta: 'Ataque de conjuro', categoria: 'ataque' });
    }
    const a = P.ataques[num(idx, 0)]; if (!a) return;
    if (modo === 'atk' || modo === 'atqextra') {
      // a.conjuro: ataque de conjuro con otra característica (p. ej. el racial de Eldur con CON): suma el buff y los efectos de ataque de conjuro.
      const m = a.conjuro
        ? FichaAtributos.modDe(a.habilidad) + prof + num(($('spell-atk-buff') || {}).value, 0) + FichaBuffs.plano('ataque-conjuro')
        : FichaAtributos.modDe(a.habilidad || 'STR') + (a.competente === false ? 0 : prof) + (a.bonoExtra || 0) + num(($('atk-buff') || {}).value, 0) + FichaBuffs.plano('ataque');
      const et = modo === 'atqextra' ? (a.atqExtra[num(btn.dataset.extra, 0)] || a.nombre) : (a.etiquetaAtaque || 'Ataque ' + a.nombre);
      return FichaDados.d20({ mod: m, etiqueta: et, categoria: 'ataque' });
    }
    const dado = modo === 'extra' ? (a.extras[num(btn.dataset.extra, 0)] || {}).dado : a.dano;
    if (!dado) return;
    const modDano = valorMod(dado.mod);
    const nombre = modo === 'extra' ? a.extras[num(btn.dataset.extra, 0)].nombre : 'Daño ' + a.nombre;
    const base = FichaDados.calcular({ count: typeof dado.count === 'function' ? dado.count(FichaVitales.ctx()) : dado.count, sides: dado.sides, mod: modDano });
    if (base.error) return;
    let total = base.total, detalle = base.detalle;
    const ex = FichaBuffs.tirarDados('dano');
    ex.partes.forEach(p => { total += p.valor; detalle += ' | ' + p.texto; });
    FichaDados.mostrar(total, nombre, detalle);
  }

  /* ---------- compatibilidad para fragmentos HTML propios ----------
     Los stat blocks escritos a mano en cada ficha llaman a estas funciones desde onclick; se conservan con la misma
     firma que tenían (rollAttack, rollGenericDamage…) para no reescribir cientos de botones. */
  function instalarCompat() {
    const mod = (h) => FichaAtributos.modDe(h), prof = () => FichaAtributos.profBonusActual();
    window.armaBono = (hab) => mod(hab) + prof();
    window.bonoAtaqueConjuro = () => mod(P.habilidadConjuro) + prof();
    window.rollAttack = (bono, etiqueta) => FichaDados.d20({ mod: bono + num(($('atk-buff') || {}).value, 0) + FichaBuffs.plano('ataque'), etiqueta, categoria: 'ataque' });
    window.rollSpellAttack = (etiqueta) => FichaDados.d20({ mod: window.bonoAtaqueConjuro() + num(($('spell-atk-buff') || {}).value, 0) + FichaBuffs.plano('ataque-conjuro'), etiqueta, categoria: 'ataque' });
    window.rollGenericDamage = (count, sides, m, etiqueta) => FichaDados.tirar({ count, sides, mod: m }, etiqueta + ` (${count}d${sides})`);
    window.rollManualDice = window.rollGenericDamage;
    window.rollCheckSave = (dado, m, etiqueta, tipo, categoria) => FichaDados.d20({ mod: m, etiqueta, categoria: categoria || (tipo === 'save' ? 'salvaciones' : 'pruebas') });
    window.rollCoin = () => FichaDados.moneda();
    window.changeVal = (id, delta) => FichaVitales.cambiarContador(id, delta, id);
    window.registrarUsoRecursoGenerico = (etiqueta) => FichaDados.registrarUso(etiqueta, 'recurso');
    // Gasta un espacio de conjuro del nivel indicado (p. ej. Divine Smite); avisa si no queda ninguno.
    window.gastarSlot = (nivel) => {
      const el = $('slot-' + nivel + '-cur'); if (!el) return;
      if (num(el.textContent, 0) <= 0) { FichaDados.mostrar('—', 'Sin espacios de nivel ' + nivel, 'No te quedan espacios de ese nivel.'); return; }
      FichaVitales.cambiarContador('slot-' + nivel + '-cur', -1, 'Espacio de nivel ' + nivel);
    };
  }

  // Textos derivados dentro de HTML propio: <span class="js-calc" data-calc="armaBono|mod|prof|cd" data-hab="DEX" data-fmt="num">
  function aplicarJsCalc() {
    if (!window.FichaAtributos) return;
    const f = FichaComun.formatearMod, prof = FichaAtributos.profBonusActual();
    document.querySelectorAll('.js-calc').forEach(el => {
      const hab = el.dataset.hab; let t;
      switch (el.dataset.calc) {
        case 'armaBono': { const v = FichaAtributos.modDe(hab) + prof; t = el.dataset.fmt === 'num' ? String(v) : f(v); break; }
        case 'mod': t = f(FichaAtributos.modDe(hab)); break;
        case 'prof': t = f(prof); break;
        case 'cd': case 'cdConjuro': t = String(8 + FichaAtributos.modDe(P.habilidadConjuro) + prof); break;
        case 'bonoConjuro': t = f(FichaAtributos.modDe(P.habilidadConjuro) + prof); break;
        case 'modnum': t = String(FichaAtributos.modDe(hab)); break;
        case 'modsig': t = f(FichaAtributos.modDe(hab)); break;
        case 'atqConjuro': t = f(FichaAtributos.modDe(P.habilidadConjuro) + prof); break;
        case 'ini': t = f(iniciativaBase()); break;
        default: if (P.calculos && P.calculos[el.dataset.calc]) t = String(P.calculos[el.dataset.calc]());
      }
      if (t !== undefined && el.textContent !== t) el.textContent = t;
    });
    const cb = $('conc-save-bonus'), b = $('ab-con') && $('ab-con').querySelector('.btn-save');
    if (cb && b) cb.textContent = f(num(b.dataset.bonus, 0));
  }

  // Elegir el nivel de upcast autoguarda el <select> (tiene id); el eco dispara 'ficha:atributos' y la tabla de hechizos
  // se vuelve a dibujar devolviendo el selector al nivel base antes de tirar. Se recuerda la elección y se restaura.
  function protegerSelectoresUpcast() {
    const guardado = {};
    ['input', 'change'].forEach(t => document.addEventListener(t, (e) => { if (/^upcast-sel-/.test(e.target.id || '')) guardado[e.target.id] = e.target.value; }, true));
    const lista = $('hechizos-lista');
    if (lista) new MutationObserver(() => {
      aplicarJsCalc();
      Object.entries(guardado).forEach(([id, v]) => { const sel = $(id); if (sel && sel.value !== v && Array.from(sel.options).some(o => o.value === v)) sel.value = v; });
    }).observe(lista, { childList: true, subtree: true });
  }

  /* ---------- permisos / hp-max para la pantalla del GM ---------- */
  function sincronizarHpMaxParaElGM(db, charRef, uid) {
    const gm = codigoCampana ? db.ref(`campanas/${codigoCampana}/gm`).once('value').then(s => s.val() === uid) : Promise.resolve(true);
    gm.then(soyGM => charRef.child('owner').once('value').then(s => {
      const esMio = !codigoCampana || s.val() === uid;
      if (!(esMio || soyGM)) return;
      const escribir = () => { const m = FichaVitales.hpMaxActual(); charRef.child('datos/hp-max').once('value').then(v => { if (num(v.val(), -1) !== m) charRef.child('datos/hp-max').set(m); }); };
      setTimeout(escribir, 1800);
      document.addEventListener('ficha:hp', () => { clearTimeout(sincronizarHpMaxParaElGM._t); sincronizarHpMaxParaElGM._t = setTimeout(escribir, 1500); });
    }));
  }

  /* ---------- arranque de motores ---------- */
  async function arrancarMotores(user) {
    const db = firebase.database();
    let charRef;
    // Clases y subclases custom de la campaña: se fusionan en CLASSES/PROGRESION_CLASES antes de que cualquier motor las consulte.
    if (window.ClasesCustom && codigoCampana) { try { await ClasesCustom.cargar(db, codigoCampana); } catch (e) { console.warn('Clases custom no disponibles:', e); } }
    if (codigoCampana) {
      const sis = (await db.ref(`lista_campanas/${codigoCampana}/sistema`).once('value')).val();
      if (sis && sis !== (P.sistema || 'dnd')) { FichaComun.bloquearPorSistemaIncorrecto(sis, codigoCampana); return; }
      charRef = db.ref(`campanas/${codigoCampana}/personajes/${P.id}`);
    } else {
      charRef = db.ref(`usuarios/${user.uid}/personajes/${P.id}`);
    }
    FichaComun.setCharRef(charRef);

    FichaDados.iniciar({ personaje: P.nombre, db, codigoCampana, publicarUsos: true });
    FichaReglas.poblarDesplegable('conditions-dropdown', { idioma: 'es' });
    // rótulos de las casillas de estado ya dibujadas
    FichaComun.iniciarEditorHechizos();
    FichaComun.iniciarEditorInventario();
    FichaComun.iniciarEditorReputacion();
    FichaComun.iniciarBuffsPersonales();

    FichaVitales.iniciar({
      hpBase: P.hpBase || 1, idHpTemp: P.idHpTemp, clases: window.CONFIG_NIVEL.clases, recursos: P.recursos || [],
      espacios: P.espaciosModo === 'casillas' ? () => null : maxEspacios, modCON: () => (window.FichaAtributos ? FichaAtributos.modDe('CON') : 0),
      alDescanso: (tipo) => {
        if (P.espaciosModo === 'casillas' && tipo === 'largo') {
          document.querySelectorAll('#espacios-conjuro input[type="checkbox"]:checked').forEach(c => { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); });
          refrescarSlotCur();
        }
        const e = espaciosActuales();
        if (e.pacto) { const el = $('slot-pact-cur'); if (el) { el.textContent = String(e.pacto.count); FichaComun.guardarCampo('slot-pact-cur', e.pacto.count); } }
        if (P.ganchos && P.ganchos.alDescanso) P.ganchos.alDescanso(tipo);
      },
    });
    if (P.espaciosModo === 'casillas') instalarPuenteCasillas();
    renderEspacios();
    FichaComun.sincronizarDatosDesdeNube();

    // Atributos, habilidades, competencia
    const ABIL = FichaPlantilla.ABIL;
    FichaComun.iniciarAtributos({
      obtenerNivel: FichaVitales.nivelTotal, profBadgeId: 'prof-badge',
      habilidades: ABIL.map(k => ({ clave: k, scoreId: `${k.toLowerCase()}-score`, tempId: `${k.toLowerCase()}-temp`, contenedorId: `ab-${k.toLowerCase()}`, saveCompetente: (P.salvaciones || []).indexOf(k) >= 0 })),
      skills: SKILLS_CFG,
      pasiva: [{ elId: 'percepcion-pasiva', skillClave: 'Perception' }],
    });
    // Base + buff = total
    if (P.ca && P.ca.casillaAuto) {
      // CA fija mientras la casilla «calcular desde el equipo» esté apagada; encendida, armadura/escudo equipados (+ bono de estilo).
      FichaComun.iniciarCA({ totalElId: 'ca-motor-sin-pintar' });   // solo publica FichaCA.calcular(); no pinta nada
      const caDesdeEquipo = () => {
        const r = FichaCA.calcular(), conArmadura = !/fija|sin armadura/.test(r.texto), extra = conArmadura ? (P.ca.bonoConArmadura || 0) : 0;
        const detalle = (r.texto.match(/\((.*)\)\s*$/) || [])[1] || '';
        return { total: r.total + extra, texto: `${r.total + extra} (equipo: ${detalle}${extra ? ', estilo de combate +' + extra : ''})` };
      };
      const caAuto = () => !!($('ac-auto') && $('ac-auto').checked);
      FichaComun.iniciarEstadisticaConBuff({
        buffInputId: 'ac-buff', totalElId: 'ac-total', baseElId: 'ac-base',
        calcularBase: () => (caAuto() ? caDesdeEquipo().total : P.ca.fija),
        formatearBase: () => (caAuto() ? caDesdeEquipo().texto : `${P.ca.fija} (fija)`),
        objetivoBuff: 'ca', eventos: ['ficha:inventario'], vigilarTambien: ['ac-auto'],
      });
    } else {
      FichaComun.iniciarCA({ buffInputId: 'ac-buff', totalElId: 'ac-total', baseElId: 'ac-base' });
    }
    // Auras / buffs permanentes con casilla (p. ej. Aura of Protection): entran como fuente de buffs y se apagan con la casilla o la ✖.
    if ((P.auras || []).length) {
      FichaComun.registrarFuenteBuffs(() => P.auras.filter(a => { const c = $(a.id); return c && c.checked; }).map(a => ({
        nombre: a.nombre, efectos: [{ tipo: 'plano', objetivo: a.objetivo, valor: a.valor() }],
        apagar: () => { const c = $(a.id); if (c) { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); } },
      })));
      document.addEventListener('change', (e) => { if (P.auras.some(a => a.id === e.target.id)) FichaComun.notificarBuffs(); });
      document.addEventListener('ficha:datos-sincronizados', () => FichaComun.notificarBuffs());
    }
    if (P.ca && P.ca.manual) document.addEventListener('input', (e) => { if (e.target.id === P.ca.manual && window.FichaCA) FichaCA.recalcular(); });
    FichaComun.iniciarConcentracion('concentracion-panel');
    const mod = (h) => FichaAtributos.modDe(h), prof = () => FichaAtributos.profBonusActual();
    const f = FichaComun.formatearMod;
    FichaComun.iniciarEstadisticaConBuff({ buffInputId: 'hp-max-buff', totalElId: 'hp-max-total', calcularBase: () => (P.hpBase || 1) + FichaVitales.registro().reduce((s, r) => s + (r.hpGanado || 0), 0), objetivoBuff: 'hp-max' });
    FichaComun.iniciarEstadisticaConBuff({ buffInputId: 'iniciativa-buff', totalElId: 'iniciativa-total', calcularBase: iniciativaBase, formatear: (n) => '🎲 ' + f(n), objetivoBuff: 'iniciativa' });
    FichaComun.iniciarEstadisticaConBuff({ buffInputId: 'velocidad-buff', totalElId: 'velocidad-total', calcularBase: () => Math.floor((P.velocidad || 30) * FichaReglas.efectos().velocidadFactor), formatear: (n) => n + ' ft', objetivoBuff: 'velocidad' });
    const altAtk = P.badgeAtaque && P.badgeAtaque.alternativo;
    FichaComun.iniciarEstadisticaConBuff({ buffInputId: 'atk-buff', totalElId: 'atk-total', calcularBase: () => mod(P.habilidadAtaque || 'STR') + prof() + ((P.badgeAtaque && P.badgeAtaque.extra) || 0), formatear: altAtk ? (n) => f(n) + '/' + f(n + altAtk) : f, objetivoBuff: 'ataque' });
    if (!P.sinConjuros && P.habilidadConjuro) {
      FichaComun.iniciarEstadisticaConBuff({ buffInputId: 'spell-atk-buff', totalElId: 'spell-atk-total', calcularBase: () => mod(P.habilidadConjuro) + prof(), formatear: f, objetivoBuff: 'ataque-conjuro' });
      FichaComun.iniciarEstadisticaConBuff({ buffInputId: 'spell-dc-buff', totalElId: 'spell-dc-total', calcularBase: () => 8 + mod(P.habilidadConjuro) + prof(), objetivoBuff: 'cd-conjuro' });
    }
    instalarCompat(); protegerSelectoresUpcast();
    document.addEventListener('ficha:atributos', () => { refrescarDerivados(); aplicarJsCalc(); });
    document.addEventListener('ficha:datos-sincronizados', () => { refrescarDerivados(); pintarXP(); });

    FichaComun.iniciarBitacora({ db, codigoCampana });
    FichaComun.iniciarPermisosYCompartir({ db, codigoCampana, uid: user.uid });
    sincronizarHpMaxParaElGM(db, charRef, user.uid);

    FichaNivel.iniciar({
      clases: window.CONFIG_NIVEL.clases, skills: SKILLS_CFG, hpMax: FichaVitales.hpMaxActual,
      refrescarEspacios: renderEspacios, abrirCompendio: () => FichaCompendio.abrir(),
      agregarHD: () => FichaVitales.pintarHD(), quitarHD: () => FichaVitales.pintarHD(),
      recursos: [],
      ...(P.nivel || {}),   // p. ej. { rasgosExtra:[{nivel,clase,nombre,descripcion}], rasgosDeFicha:['Monk','Cleric'] } si el personaje trae sus propios rasgos por nivel
    });
    document.addEventListener('ficha:nivel', () => { renderEspacios(); FichaVitales.pintarHD(); FichaVitales.pintarRecursos(); refrescarDerivados(); pintarXP(); });
    const undo = $('btn-deshacer-nivel'); if (undo) undo.addEventListener('click', () => FichaNivel.deshacer());
    const xp = $('xp-val'); if (xp) xp.addEventListener('input', pintarXP);

    FichaParty.iniciar({ db, codigoCampana, personajeId: P.id, nombre: P.nombre });
    if (typeof P.iniciar === 'function') P.iniciar({ db, charRef, codigoCampana, uid: user.uid, P, toast });

    refrescarDerivados(); aplicarJsCalc(); pintarXP();
    window.__fichaLista = true;
    document.dispatchEvent(new CustomEvent('ficha:lista'));
  }

  async function arrancar() {
    if (!pj) return mensaje('Falta el personaje en la dirección: usá <code>ficha.html?pj=&lt;id&gt;</code>.');
    if (/^pc_/.test(pj)) {
      try { P = await cargarDefinicionDinamica(); } catch (e) { return mensaje('No se pudo leer el personaje: ' + (e && e.message ? e.message : e)); }
      if (!P) return mensaje(`No existe el personaje “${pj}” en esta campaña.`);
    } else {
      try { await cargarScript(`personajes/${pj}.js`); } catch (e) { return mensaje(`No existe el personaje “${pj}”.`); }
      P = (window.PERSONAJES || {})[pj];
      if (!P) return mensaje(`El archivo de “${pj}” no define el personaje.`);
    }
    document.title = P.nombre + ' — Ficha';

    SKILLS_CFG = Object.keys(FichaPlantilla.SKILL_HAB).map(n => ({ clave: n, contenedorId: FichaPlantilla.skillId(n), habilidad: FichaPlantilla.SKILL_HAB[n], competente: !!(P.habilidades || {})[n], expertise: (P.habilidades || {})[n] === 'exp' }));
    armarConfig();
    raiz().innerHTML = FichaPlantilla.ficha(P, { codigoCampana });
    document.title = P.nombre + ' — Ficha';
    if (window.FichaPaleta) FichaPaleta.iniciar({ contenedorId: 'selector-paleta', porDefecto: P.paleta, clave: P.id });
    await cargarFragmentos();

    try { await cargarScript('clases-custom.js'); } catch (e) { /* módulo opcional */ }
    for (const s of ['ficha-common.js', 'ficha-dados.js', 'ficha-vitales.js', 'ficha-party.js', 'ficha-nivel.js', 'ficha-compendio.js']) await cargarScript(s);
    bindClicks();

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE);
    firebase.auth().onAuthStateChanged((user) => {
      if (!user) { location.href = 'index.html'; return; }
      arrancarMotores(user).catch((e) => { console.error(e); mensaje('Ocurrió un error al iniciar la ficha: ' + (e && e.message ? e.message : e)); });
    });
  }

  window.FichaShell = { arrancar, toast, renderEspacios, refrescarDerivados, get personaje() { return P; } };
  arrancar();
})();

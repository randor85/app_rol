/*
 * ficha-nivel.js — asistente de SUBIDA DE NIVEL generado desde los datos (classes_data.js,
 * spells_data.js), sin código por ficha. Se carga después de ficha-common.js.
 *
 *   FichaNivel.iniciar({ clases, ... })   configura la ficha (ver "opciones" abajo)
 *   FichaNivel.abrir()                    abre el asistente
 *   FichaNivel.deshacer()                 revierte la última subida (con confirmación en pantalla)
 *   FichaNivel.nivelPorXP(xp)             nivel que corresponde a un XP (tabla de la campaña)
 *   FichaNivel.descanso('corto'|'largo')  restablece los recursos declarativos
 *
 * Compatibilidad: las fichas migradas guardan los niveles como CONFIG_NIVEL.clases[].nivelInicial +
 * el campo oculto `subidas-nivel-registro` (JSON). Cada registro conserva su forma
 *   { clase, nivelNuevo, dado, tirada, modo, hpGanado, fecha }
 * y este módulo le agrega `elecciones` (subclase, asi, dote, expertise, estilo, metamagia,
 * invocaciones, hechizos, rasgos) y `prev` (estado anterior, para poder deshacer exacto).
 * Nada se aplica solo: el XP solo muestra el aviso de "subida pendiente".
 *
 * Opciones de iniciar():
 *   clases       [{ nombre, dado, nivelInicial, caster?, subclase? }]  (se puede pasar CONFIG_NIVEL.clases:
 *                el módulo agrega ahí las clases nuevas por multiclase, con nivelInicial 0)
 *   campoRegistro, campoXP, campoHP   ids (por defecto 'subidas-nivel-registro', 'xp-val', 'hp-cur')
 *   tablaXP      [{nivel, xp}]   (por defecto la de la campaña)
 *   hpMax, conMod                funciones (por defecto hpMaxActual() / FichaAtributos.modDe('CON'))
 *   rasgosExtra  [{nivel, nombre, descripcion, clase?}]   rasgos propios de la ficha (se mezclan con los de classes_data)
 *   rasgosDeFicha  ['Paladin']  clases cuyos rasgos salen SOLO de rasgosExtra (la ficha ya tiene su propia lista, p. ej. 2014)
 *   skills       el MISMO array de skills que se le pasó a FichaComun.iniciarAtributos (para expertise)
 *   recursos     [{ clase, id, campoId, contenedorId }]   contadores declarativos (PROGRESION_CLASES[..].recursos).
 *                Si ya existe #campoId (con #campoId-max y #campoId-etq) solo se actualizan los máximos;
 *                si no, se genera el contador dentro de #contenedorId.
 *   contenedorRasgos  selector de la grilla de tarjetas (por defecto '.feature-grid')
 *   boton        selector del botón "Subir de nivel" (por defecto '[data-fn-abrir]')
 *   abrirCompendio, alAplicar(ctx), alDeshacer(ctx), agregarHD(dado), quitarHD()   ganchos opcionales
 */
(function () {
  'use strict';

  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const ABIL_ES = { STR: 'Fuerza', DEX: 'Destreza', CON: 'Constitución', INT: 'Inteligencia', WIS: 'Sabiduría', CHA: 'Carisma' };
  const SKILLS = ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'];
  const TABLA_XP_DEFECTO = [
    { nivel: 1, xp: 0 }, { nivel: 2, xp: 1500 }, { nivel: 3, xp: 4500 }, { nivel: 4, xp: 9500 },
    { nivel: 5, xp: 16500 }, { nivel: 6, xp: 25500 }, { nivel: 7, xp: 36500 }, { nivel: 8, xp: 49500 },
    { nivel: 9, xp: 64500 }, { nivel: 10, xp: 81500 }, { nivel: 11, xp: 100500 }, { nivel: 12, xp: 121500 },
    { nivel: 13, xp: 144500 }, { nivel: 14, xp: 169500 }, { nivel: 15, xp: 196500 }, { nivel: 16, xp: 225500 },
    { nivel: 17, xp: 256500 }, { nivel: 18, xp: 289500 }, { nivel: 19, xp: 324500 }, { nivel: 20, xp: 361500 }
  ];

  let cfg = null;
  let est = null;       // estado del asistente (null = cerrado sin trabajo en curso)
  let overlay = null;

  // ------------------------------------------------------------------ utilidades
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => (window.FichaComun ? FichaComun.formatearMod(n) : (n >= 0 ? '+' : '') + n);
  const $ = (id) => document.getElementById(id);
  const norm = (s) => String(s || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').replace(/[^a-z0-9áéíóúñ ]/g, '').trim();

  function clasesData() { return (typeof CLASSES !== 'undefined') ? CLASSES : []; }
  function datosClase(ref) {
    if (!ref) return null;
    const r = String(ref).toLowerCase();
    return clasesData().find((c) => c.id === r || c.name.toLowerCase() === r || (c.nombre_es || '').toLowerCase() === r) || null;
  }
  function prog(d) { return (d && typeof PROGRESION_CLASES !== 'undefined' && PROGRESION_CLASES[d.id]) || {}; }
  function escalonado(tabla, n) {
    if (!tabla) return undefined;
    let v;
    Object.keys(tabla).map(Number).sort((a, b) => a - b).forEach((k) => { if (k <= n) v = tabla[k]; });
    return v;
  }

  // ------------------------------------------------------------------ registro de subidas
  function campoRegistro() { return cfg.campoRegistro || 'subidas-nivel-registro'; }
  function leerRegistro() {
    try { const a = JSON.parse((($(campoRegistro()) || {}).value) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function escribirRegistro(lista) {
    const s = lista.length ? JSON.stringify(lista) : '';
    const h = $(campoRegistro());
    if (h) h.value = s;
    if (window.FichaComun) FichaComun.guardarCampo(campoRegistro(), s);
  }

  function asegurarClases() {
    leerRegistro().forEach((r) => {
      if (!cfg.clases.find((c) => c.nombre === r.clase)) {
        const d = datosClase(r.clase);
        cfg.clases.push({ nombre: r.clase, id: d ? d.id : undefined, dado: r.dado || (d && d.hitDie) || 8, nivelInicial: 0, caster: d ? (d.casterType || null) : null });
      }
    });
  }
  function nivelClase(nombre) {
    const c = cfg.clases.find((x) => x.nombre === nombre);
    return (c ? c.nivelInicial : 0) + leerRegistro().filter((r) => r.clase === nombre).length;
  }
  function clasesPropias() { return cfg.clases.filter((c) => nivelClase(c.nombre) > 0); }
  function nivelTotal() { return cfg.clases.reduce((s, c) => s + nivelClase(c.nombre), 0); }
  function subclaseDe(nombre) {
    const regs = leerRegistro().filter((r) => r.clase === nombre && r.elecciones && r.elecciones.subclase);
    if (regs.length) return regs[regs.length - 1].elecciones.subclase;
    const c = cfg.clases.find((x) => x.nombre === nombre);
    return (c && c.subclase) || null;
  }

  // ------------------------------------------------------------------ XP
  function tablaXP() { return cfg.tablaXP || TABLA_XP_DEFECTO; }
  function nivelPorXP(xp) {
    let n = 1;
    tablaXP().forEach((f) => { if (xp >= f.xp) n = f.nivel; });
    return n;
  }
  function xpActual() { const el = $(cfg.campoXP || 'xp-val'); return el ? (parseInt(el.value, 10) || 0) : 0; }
  function nivelPendiente() {
    const xp = xpActual();
    const porXP = nivelPorXP(xp);
    const actual = nivelTotal();
    return { pendiente: actual < porXP && actual < 20, nivelXP: porXP, nivelActual: actual, xp };
  }

  // ------------------------------------------------------------------ puntuaciones y estadísticas
  function scoreId(k) { return cfg.scoreId ? cfg.scoreId(k) : k.toLowerCase() + '-score'; }
  function leerScores() {
    const o = {};
    ABIL.forEach((k) => { const el = $(scoreId(k)); o[k] = el ? (parseInt(el.value, 10) || 10) : 10; });
    return o;
  }
  function fijarScore(k, v) {
    const el = $(scoreId(k));
    if (!el) return;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function hpMax() { return cfg.hpMax ? cfg.hpMax() : (typeof window.hpMaxActual === 'function' ? window.hpMaxActual() : null); }
  function conMod() { return cfg.conMod ? cfg.conMod() : (window.FichaAtributos ? FichaAtributos.modDe('CON') : 0); }
  function prof(n) { return window.FichaComun ? FichaComun.calcularProfBonus(n) : 2; }

  // ------------------------------------------------------------------ espacios de conjuro
  // Una sola clase lanzadora: su propia tabla. Varias (sin Pact): tabla de multiclase con nivel de
  // lanzador = lanzadores completos + mitad (redondeada hacia arriba, PHB 2024 — incierto) de semilanzadores.
  function espaciosPara(niveles) {
    const casters = [];
    let pacto = null;
    Object.keys(niveles).forEach((nombre) => {
      const lv = niveles[nombre];
      const d = datosClase(nombre);
      if (!d || !lv) return;
      if (d.casterType === 'pact' && typeof SLOTS_PACT_CASTER !== 'undefined') pacto = SLOTS_PACT_CASTER[Math.min(lv, 20)] || null;
      else if (d.casterType === 'full' || d.casterType === 'half') casters.push({ tipo: d.casterType, lv });
    });
    let slots = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (typeof SLOTS_FULL_CASTER !== 'undefined') {
      if (casters.length === 1) {
        const t = casters[0].tipo === 'full' ? SLOTS_FULL_CASTER : SLOTS_HALF_CASTER;
        slots = (t[Math.min(casters[0].lv, 20)] || slots).slice();
      } else if (casters.length > 1) {
        const lvl = casters.reduce((s, c) => s + (c.tipo === 'full' ? c.lv : Math.ceil(c.lv / 2)), 0);
        slots = (SLOTS_FULL_CASTER[Math.min(lvl, 20)] || slots).slice();
      }
    }
    return { slots, pacto };
  }
  function nivelesActuales() { const o = {}; clasesPropias().forEach((c) => { o[c.nombre] = nivelClase(c.nombre); }); return o; }

  function refrescarEspacios() {
    if (cfg.refrescarEspacios) return cfg.refrescarEspacios();
    const bar = document.querySelector('#conjuros-slots-bar');
    const { slots, pacto } = espaciosPara(nivelesActuales());
    if (bar) {
      slots.forEach((max, i) => {
        const n = i + 1;
        let card = bar.querySelector(`.tracker-card[data-slot-nivel="${n}"]`);
        if (max <= 0) { if (card && card.dataset.fnCreada) card.remove(); return; }
        if (!card) {
          card = document.createElement('div');
          card.className = 'tracker-card';
          card.dataset.slotNivel = n;
          card.dataset.fnCreada = '1';
          card.innerHTML = `<h4>Nivel ${n}</h4><div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <button class="btn-cnt" onclick="changeVal('slot-${n}-cur', -1); if (window.registrarUsoRecursoGenerico) registrarUsoRecursoGenerico('Espacio de Nivel ${n}')">-1</button>
            <span id="slot-${n}-cur" style="font-size:1.4rem; font-weight:bold; color:var(--accent-gold)">${max}</span> / <span id="slot-${n}-max">${max}</span>
            <button class="btn-cnt" onclick="changeVal('slot-${n}-cur', 1)">+1</button></div>`;
          bar.appendChild(card);
        } else {
          const m = $(`slot-${n}-max`);
          if (m) m.textContent = max;
        }
      });
    }
    const pm = $('slot-pact-max');
    if (pm && pacto) { pm.textContent = pacto.count; const pn = $('slot-pact-nivel'); if (pn) pn.textContent = pacto.nivel; }
  }
  function leerSlotsCur() {
    const o = {};
    for (let n = 1; n <= 9; n++) { const el = $(`slot-${n}-cur`); if (el) o[n] = parseInt(el.textContent, 10) || 0; }
    const p = $('slot-pact-cur'); if (p) o.pact = parseInt(p.textContent, 10) || 0;
    return o;
  }
  function fijarSlotCur(clave, v) {
    const id = clave === 'pact' ? 'slot-pact-cur' : `slot-${clave}-cur`;
    const el = $(id);
    if (!el) return;
    el.textContent = v;
    if (window.FichaComun) FichaComun.guardarCampo(id, v);
  }

  // ------------------------------------------------------------------ recursos declarativos
  function defRecurso(r) {
    const d = datosClase(r.clase);
    return (prog(d).recursos || []).find((x) => x.id === r.id) || null;
  }
  function maxRecurso(r) {
    const def = defRecurso(r);
    if (!def) return 0;
    const lv = nivelClase(r.clase);
    if (def.max.por) return def.max.por * lv;
    if (def.max.tabla) return escalonado(def.max.tabla, lv) || 0;
    return lv;
  }
  function refrescarRecursos() {
    (cfg.recursos || []).forEach((r) => {
      const def = defRecurso(r);
      const cont = $(r.contenedorId);
      if (!def || (!cont && !$(r.campoId))) return;
      const max = maxRecurso(r);
      if (!$(r.campoId)) {
        const p = def.paso || 1;
        cont.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;">
          <label style="font-size:0.85rem; font-weight:bold; color:var(--accent-light, inherit);">${esc(def.nombre)} (Pool <span id="${esc(r.campoId)}-etq">${max}</span> ${esc(def.unidad || '')}):</label>
          <div class="counter-controls">
            <button class="btn-cnt" onclick="changeVal('${esc(r.campoId)}', -${p})">-${p}</button>
            <span id="${esc(r.campoId)}" class="cnt-val">${max}</span>
            <span class="cnt-max" id="${esc(r.campoId)}-max">/ ${max}</span>
            <button class="btn-cnt" onclick="changeVal('${esc(r.campoId)}', ${p})">+${p}</button>
          </div></div>`;
      } else {
        const m = $(r.campoId + '-max'); if (m) m.textContent = '/ ' + max;
        const e = $(r.campoId + '-etq'); if (e) e.textContent = max;
      }
    });
  }
  function descanso(tipo) {
    (cfg.recursos || []).forEach((r) => {
      const def = defRecurso(r);
      if (!def) return;
      const rec = def.recarga;
      if (tipo === 'largo' || rec === 'corto') {
        const el = $(r.campoId);
        if (el) { const max = maxRecurso(r); el.textContent = max; if (window.FichaComun) FichaComun.guardarCampo(r.campoId, max); }
      }
    });
  }
  function leerRecursosCur() {
    const o = {};
    (cfg.recursos || []).forEach((r) => { const el = $(r.campoId); if (el) o[r.campoId] = parseInt(el.textContent, 10) || 0; });
    return o;
  }

  // ------------------------------------------------------------------ rasgos y expertise
  function esAsi(f) { return /Mejora de Puntuaci/i.test(f.nombre); }
  function esSubclaseGenerico(f) { return /\(Subclase\)/i.test(f.nombre); }

  function rasgosDelNivel(nombreClase, nivel, subNombre, retroSub) {
    const d = datosClase(nombreClase);
    const out = [];
    const vistos = new Set();
    const push = (f, origen) => {
      const k = norm(f.nombre);
      if (vistos.has(k)) return;
      vistos.add(k);
      out.push({ nombre: f.nombre, desc: f.desc || f.descripcion || '', nivel: f.nivel, clase: nombreClase, origen, incierto: !!f.incierto });
    };
    const deFicha = (cfg.rasgosDeFicha || []).includes(nombreClase);
    if (d && !deFicha) d.features.filter((f) => f.nivel === nivel && !esAsi(f) && !esSubclaseGenerico(f)).forEach((f) => push(f, 'Clase'));
    const sc = d && subNombre ? d.subclasses.find((s) => s.name === subNombre) : null;
    if (sc) sc.features.filter((f) => retroSub ? (f.nivel <= nivel && f.nivel >= d.subclassLevel) : f.nivel === nivel).forEach((f) => push(f, subNombre));
    (cfg.rasgosExtra || []).filter((h) => h.nivel === nivel && (!h.clase || h.clase === nombreClase) && !esAsi({ nombre: h.nombre }))
      .forEach((h) => push({ nombre: h.nombre, desc: h.descripcion || h.desc, nivel: h.nivel }, 'Ficha'));
    return out;
  }

  function skillsConfig() { return cfg.skills || []; }
  function aplicarExpertise() {
    const sk = skillsConfig();
    if (!sk.length) return;
    const exp = new Set();
    leerRegistro().forEach((r) => ((r.elecciones && r.elecciones.expertise) || []).forEach((n) => exp.add(n)));
    sk.forEach((s) => {
      if (s._expOrig === undefined) s._expOrig = !!s.expertise;
      s.expertise = s._expOrig || exp.has(s.clave);
    });
    if (window.FichaAtributos) FichaAtributos.recalcular();
  }

  function renderRasgos() {
    const grid = document.querySelector(cfg.contenedorRasgos || '.feature-grid');
    if (!grid) return;
    grid.querySelectorAll('[data-fn-rasgo]').forEach((n) => n.remove());
    const existentes = Array.from(grid.querySelectorAll('.feature-card h4')).map((h) => norm(h.textContent));
    leerRegistro().forEach((r) => {
      ((r.elecciones && r.elecciones.rasgos) || []).forEach((f) => {
        const k = norm(f.nombre);
        if (existentes.some((t) => t.includes(k))) return;
        existentes.push(k);
        const card = document.createElement('div');
        card.className = 'feature-card';
        card.dataset.fnRasgo = '1';
        card.innerHTML = `<h4>🆕 ${esc(f.nombre)} <span style="font-size:0.68rem;color:var(--text-muted);font-weight:400;">(Nvl ${f.nivel} — ${esc(f.clase)}${f.origen && f.origen !== 'Clase' ? ' · ' + esc(f.origen) : ''})</span></h4><p>${esc(f.desc)}</p>`;
        grid.appendChild(card);
      });
    });
  }

  // ------------------------------------------------------------------ dados de golpe (casillas)
  function agregarHD(dado) {
    if (cfg.agregarHD) return cfg.agregarHD(dado);
    if (typeof window.agregarCheckboxHD === 'function') return window.agregarCheckboxHD(dado);
    const cont = $('hd-checkbox-group');
    if (!cont) return;
    const n = cont.querySelectorAll('input[type="checkbox"]').length + 1;
    const label = document.createElement('label');
    label.className = 'check-box-item';
    label.innerHTML = `<input type="checkbox" id="hd-${n}"> HD ${n}`;
    cont.appendChild(label);
  }
  function quitarHD() {
    if (cfg.quitarHD) return cfg.quitarHD();
    const cont = $('hd-checkbox-group');
    if (!cont) return;
    const labels = cont.querySelectorAll('label');
    const last = labels[labels.length - 1];
    if (!last) return;
    const cb = last.querySelector('input[type="checkbox"]');
    if (cb && cb.id && window.FichaComun) FichaComun.guardarCampo(cb.id, false);
    last.remove();
    if (typeof window.actualizarEtiquetaHD === 'function') window.actualizarEtiquetaHD();
  }
  function sincronizarHD() {
    const cont = $('hd-checkbox-group');
    if (!cont) return;
    if (cfg._baseHD === undefined) cfg._baseHD = cont.querySelectorAll('input[type="checkbox"]').length;
    const objetivo = cfg._baseHD + leerRegistro().length;
    let actuales = cont.querySelectorAll('input[type="checkbox"]').length;
    const regs = leerRegistro();
    while (actuales < objetivo) { agregarHD((regs[actuales - cfg._baseHD] || {}).dado || 8); actuales++; }
    while (actuales > objetivo) { quitarHD(); actuales--; }
    if (typeof window.actualizarEtiquetaHD === 'function') window.actualizarEtiquetaHD();
  }

  // ------------------------------------------------------------------ información de la subida en curso
  function prerrequisitosFaltantes(nuevaClase) {
    const requeridos = new Set();
    const sc = leerScores();
    clasesPropias().forEach((c) => (prog(datosClase(c.nombre)).prerrequisitos || []).forEach((k) => requeridos.add(k)));
    (prog(datosClase(nuevaClase)).prerrequisitos || []).forEach((k) => requeridos.add(k));
    return Array.from(requeridos).filter((k) => sc[k] < 13).map((k) => ({ k, valor: sc[k] }));
  }

  function infoNivel() {
    const nombre = est.clase;
    const d = datosClase(nombre);
    const antes = nivelClase(nombre);
    const n = antes + 1;
    const sub0 = subclaseDe(nombre);
    const necesitaSub = !!d && !sub0 && n >= d.subclassLevel && d.subclasses && d.subclasses.length > 0;
    const subElegida = sub0 || (est.subclase === '__otra' ? (est.subclaseLibre || '').trim() : est.subclase);
    const rasgos = rasgosDelNivel(nombre, n, subElegida, necesitaSub && !!subElegida);
    const asi = !!d && d.features.some((f) => f.nivel === n && esAsi(f));
    const p = prog(d);
    const elecciones = (p.elecciones || []).filter((e) => e.nivel === n).map((e) => ({ ...e }));
    if (p.invocaciones) {
      const prev = n > 1 ? p.invocaciones[n - 2] : 0;
      const dif = p.invocaciones[n - 1] - prev;
      if (dif > 0) elecciones.push({ nivel: n, tipo: 'invocaciones', cantidad: dif });
    }
    const esLanzador = !!d && !!d.casterType;
    return { d, nombre, antes, n, necesitaSub, subElegida, rasgos, asi, epico: asi && n === 19, elecciones, esLanzador, prog: p };
  }

  // ------------------------------------------------------------------ validación de las elecciones del paso 4
  function opcionesSub(info) { return info.d ? info.d.subclasses : []; }
  function validarElecciones(info) {
    const err = [];
    if (info.necesitaSub) {
      if (!est.subclase) err.push(`Elegí ${info.d.subclassLabel || 'la subclase'}.`);
      else if (est.subclase === '__otra' && !(est.subclaseLibre || '').trim()) err.push('Escribí el nombre de la subclase.');
    }
    if (info.asi) {
      const sc = leerScores();
      if (!est.asi.modo) err.push('Elegí mejora de característica o talento.');
      else if (est.asi.modo === 'asi') {
        if (est.asi.tipo === 'dos') {
          if (!est.asi.a || !est.asi.b || est.asi.a === est.asi.b) err.push('Elegí dos características distintas (+1 cada una).');
          else [est.asi.a, est.asi.b].forEach((k) => { if (sc[k] + 1 > 20) err.push(`${ABIL_ES[k]} no puede pasar de 20.`); });
        } else {
          if (!est.asi.a) err.push('Elegí la característica (+2).');
          else if (sc[est.asi.a] + 2 > 20) err.push(`${ABIL_ES[est.asi.a]} no puede pasar de 20 (tiene ${sc[est.asi.a]}).`);
        }
      } else if (est.asi.modo === 'dote') {
        const nombre = est.dote.nombre === '__otro' ? (est.dote.libre || '').trim() : est.dote.nombre;
        if (!nombre) err.push('Elegí un talento (o escribí el nombre).');
        if (est.dote.aumento && sc[est.dote.aumento] + 1 > 20) err.push(`${ABIL_ES[est.dote.aumento]} no puede pasar de 20.`);
      }
    }
    info.elecciones.forEach((e, i) => {
      const sel = (est.sel[e.tipo + i] || []);
      const libre = (est.libre[e.tipo + i] || '').trim() ? 1 : 0;
      if (sel.length + libre !== e.cantidad) err.push(`Elegí exactamente ${e.cantidad} (${etiquetaEleccion(e)}).`);
    });
    return err;
  }
  function etiquetaEleccion(e) {
    return { expertise: 'Pericia (Expertise)', estilo: 'Estilo de combate', metamagia: 'Metamagia', invocaciones: 'Invocaciones místicas' }[e.tipo] || e.tipo;
  }

  // ------------------------------------------------------------------ vista previa
  function nombreDote() { return est.dote.nombre === '__otro' ? (est.dote.libre || '').trim() : est.dote.nombre; }
  function aumentosElegidos() {
    const a = {};
    if (est.asi.modo === 'asi') {
      if (est.asi.tipo === 'dos') { if (est.asi.a) a[est.asi.a] = (a[est.asi.a] || 0) + 1; if (est.asi.b) a[est.asi.b] = (a[est.asi.b] || 0) + 1; }
      else if (est.asi.a) a[est.asi.a] = 2;
    } else if (est.asi.modo === 'dote' && est.dote.aumento) a[est.dote.aumento] = 1;
    return a;
  }
  function hpGanadoCalculado(info) {
    if (est.hp.tirada == null) return null;
    let g = Math.max(1, est.hp.tirada + conMod());
    const toughPrev = leerRegistro().filter((r) => r.elecciones && r.elecciones.dote && r.elecciones.dote.hpPorNivel).reduce((s, r) => s + r.elecciones.dote.hpPorNivel, 0);
    g += toughPrev;
    const t = (typeof TALENTOS !== 'undefined') ? TALENTOS.find((x) => x.nombre === nombreDote()) : null;
    if (est.asi.modo === 'dote' && t && t.hpPorNivel) g += t.hpPorNivel * (nivelTotal() + 1);
    return g;
  }
  function vistaPrevia(info) {
    const antesNiv = nivelTotal();
    const despNiv = antesNiv + 1;
    const filas = [];
    filas.push(['Nivel', `${info.nombre} ${info.antes} → ${info.n} (total ${antesNiv} → ${despNiv})`]);
    const hpg = hpGanadoCalculado(info);
    const hm = hpMax();
    filas.push(['Puntos de golpe', hpg == null ? 'sin definir' : `+${hpg} (máximo ${hm == null ? '?' : hm} → ${hm == null ? '?' : hm + hpg})`]);
    if (prof(antesNiv) !== prof(despNiv)) filas.push(['Bono de competencia', `${fmt(prof(antesNiv))} → ${fmt(prof(despNiv))} (saves, skills, ataques y CD se actualizan solos)`]);
    const aum = aumentosElegidos();
    const sc = leerScores();
    Object.keys(aum).forEach((k) => {
      const m0 = Math.floor((sc[k] - 10) / 2), m1 = Math.floor((sc[k] + aum[k] - 10) / 2);
      filas.push([ABIL_ES[k], `${sc[k]} → ${sc[k] + aum[k]} (modificador ${fmt(m0)} → ${fmt(m1)}${prof(despNiv) >= 0 && (datosClase(info.nombre).savingThrows || []).includes(ABIL_ES[k]) ? '; salvación con competencia' : ''})`]);
      if (k === 'DEX' || k === 'CON' || k === 'WIS') filas.push([`Impacto en CA (${k})`, 'La CA se recalcula sola con el nuevo modificador.']);
    });
    if (est.asi.modo === 'dote' && nombreDote()) filas.push(['Talento', nombreDote()]);
    // espacios
    const ahora = nivelesActuales();
    const luego = { ...ahora, [info.nombre]: info.n };
    const e0 = espaciosPara(ahora), e1 = espaciosPara(luego);
    const cambios = [];
    for (let i = 0; i < 9; i++) if (e0.slots[i] !== e1.slots[i]) cambios.push(`Nvl ${i + 1}: ${e0.slots[i]} → ${e1.slots[i]}`);
    if (cambios.length) filas.push(['Espacios de conjuro', cambios.join(' · ')]);
    if (e1.pacto && (!e0.pacto || e0.pacto.count !== e1.pacto.count || e0.pacto.nivel !== e1.pacto.nivel)) filas.push(['Pact Magic', `${e0.pacto ? e0.pacto.count + '×nvl ' + e0.pacto.nivel : '—'} → ${e1.pacto.count}×nvl ${e1.pacto.nivel} (se recuperan en descanso corto)`]);
    // recursos
    const d = info.d;
    if (d && d.resourceName && d.resourceProgression) {
      const v0 = escalonado(d.resourceProgression, info.antes), v1 = escalonado(d.resourceProgression, info.n);
      if (v0 !== v1) filas.push([d.resourceName, `${v0 == null ? '—' : v0} → ${v1}`]);
    }
    (cfg.recursos || []).filter((r) => r.clase === info.nombre).forEach((r) => {
      const def = defRecurso(r);
      if (!def) return;
      const antesM = maxRecurso(r);
      const despM = def.max.por ? def.max.por * info.n : (def.max.tabla ? (escalonado(def.max.tabla, info.n) || 0) : info.n);
      if (antesM !== despM) filas.push([def.nombre, `${antesM} → ${despM}`]);
    });
    if (info.rasgos.length) filas.push(['Rasgos nuevos', info.rasgos.map((f) => f.nombre).join(', ')]);
    if (est.hechizos.size) filas.push(['Hechizos que se agregan', Array.from(est.hechizos).join(', ')]);
    return filas;
  }

  // ------------------------------------------------------------------ pasos
  function pasosAplicables(info) {
    const p = ['clase'];
    if (!info) return p;
    p.push('pg', 'rasgos');
    if (info.necesitaSub || info.asi || info.elecciones.length) p.push('elecciones');
    if (info.esLanzador) p.push('hechizos');
    p.push('resumen');
    return p;
  }
  function tituloPaso(id) {
    return { clase: '1. Clase', pg: '2. Puntos de golpe', rasgos: '3. Rasgos', elecciones: '4. Elecciones', hechizos: '5. Hechizos', resumen: '6. Resumen' }[id];
  }

  function htmlClase() {
    const lvl = nivelTotal();
    const pend = nivelPendiente();
    let h = '';
    if (lvl >= 20) return '<p class="fn-bloqueo">⛔ Ya estás en nivel 20: no se puede subir más.</p>' + htmlUndo();
    h += `<p class="fn-nota">Nivel total actual: <strong>${lvl}</strong>${pend.xp ? ` · XP ${pend.xp.toLocaleString('es-AR')} → nivel ${pend.nivelXP} por XP` : ''}.</p>`;
    h += '<h4 class="fn-h">Subir una clase que ya tenés</h4><div class="fn-lista">';
    clasesPropias().forEach((c) => {
      const sel = est.clase === c.nombre && !est.esNueva;
      h += `<button type="button" class="fn-opcion ${sel ? 'sel' : ''}" data-fn="clase" data-valor="${esc(c.nombre)}">${esc(c.nombre)} <small>nivel ${nivelClase(c.nombre)} → ${nivelClase(c.nombre) + 1}</small></button>`;
    });
    h += '</div>';
    const propias = new Set(clasesPropias().map((c) => c.nombre));
    const nuevas = clasesData().filter((c) => !propias.has(c.name));
    h += '<h4 class="fn-h">Multiclase: sumar una clase nueva</h4><div class="fn-lista">';
    nuevas.forEach((c) => {
      const falt = prerrequisitosFaltantes(c.name);
      const req = prog(c).prerrequisitos || [];
      const sel = est.clase === c.name && est.esNueva;
      if (falt.length) {
        h += `<div class="fn-opcion bloqueada" data-clase-bloqueada="${esc(c.name)}">⛔ ${esc(c.name)} <small>requiere ${req.map((k) => k + ' 13').join(' y ')}${falt.some((f) => !req.includes(f.k)) ? ' (y las de tus clases actuales)' : ''} — te falta: ${falt.map((f) => `${f.k} (tenés ${f.valor})`).join(', ')}</small></div>`;
      } else {
        h += `<button type="button" class="fn-opcion ${sel ? 'sel' : ''}" data-fn="clase-nueva" data-valor="${esc(c.name)}">➕ ${esc(c.name)} <small>d${c.hitDie} · cumplís los prerrequisitos</small></button>`;
      }
    });
    h += '</div><p class="fn-nota">Multiclase: se necesita 13 en las características principales de la clase nueva y de las que ya tenés. Las competencias que se ganan al multiclasear son reducidas: revisalas en el libro.</p>';
    return h + htmlUndo();
  }
  function htmlUndo() {
    const regs = leerRegistro();
    if (!regs.length) return '';
    const u = regs[regs.length - 1];
    if (est && est.confirmarUndo) {
      return `<div class="fn-caja fn-aviso-caja"><p>¿Deshacer <strong>${esc(u.clase)} ${u.nivelNuevo}</strong>? Se revierten PG, características, hechizos agregados, rasgos y recursos de esa subida.</p>
        <button type="button" class="fn-btn fn-btn-peligro" data-fn="undo-si">Sí, deshacer</button> <button type="button" class="fn-btn" data-fn="undo-no">No</button></div>`;
    }
    return `<div class="fn-caja"><button type="button" class="fn-btn" data-fn="undo">↩️ Deshacer última subida (${esc(u.clase)} ${u.nivelNuevo})</button></div>`;
  }

  function htmlPG(info) {
    const d = info.d;
    const dado = d ? d.hitDie : 8;
    const prom = (typeof HD_PROMEDIO !== 'undefined' && HD_PROMEDIO[dado]) || Math.ceil(dado / 2) + 1;
    let h = `<h4 class="fn-h">${esc(info.nombre)} ${info.antes} → ${info.n} · dado de golpe d${dado}</h4>`;
    h += `<div class="fn-fila"><button type="button" class="fn-btn" data-fn="hp" data-valor="tirar">🎲 Tirar 1d${dado}</button> <button type="button" class="fn-btn" data-fn="hp" data-valor="promedio">📊 Promedio (${prom})</button></div>`;
    if (est.hp.tirada != null) {
      const g = hpGanadoCalculado(info);
      h += `<div class="fn-resultado">🎲 ${est.hp.tirada} ${fmt(conMod())} (CON)${g !== Math.max(1, est.hp.tirada + conMod()) ? ' + extras' : ''} = <strong>+${g} PG</strong>${hpMax() != null ? ` · nuevo máximo ${hpMax() + g}` : ''}</div>`;
    } else h += '<p class="fn-nota">Tirá el dado o usá el promedio para continuar.</p>';
    h += '<p class="fn-nota">El modificador de Constitución usado es el actual (no se recalcula retroactivamente si subís CON en este nivel).</p>';
    return h;
  }

  function htmlRasgos(info) {
    let h = `<h4 class="fn-h">Rasgos de ${esc(info.nombre)} ${info.n}</h4>`;
    const lvl = nivelTotal();
    if (prof(lvl) !== prof(lvl + 1)) h += `<div class="fn-caja fn-aviso-caja">📘 Bono de competencia: <strong>${fmt(prof(lvl))} → ${fmt(prof(lvl + 1))}</strong> (saves, skills, ataques y CD se actualizan solos).</div>`;
    if (!info.rasgos.length) h += '<p class="fn-nota">No hay rasgos nuevos registrados para este nivel (más que la mejora de característica, si corresponde).</p>';
    info.rasgos.forEach((f) => {
      h += `<div class="fn-rasgo"><strong>${esc(f.nombre)}</strong> <small>${esc(f.origen)}</small>${f.incierto ? ' <span title="Detalle sin confirmar">⚠️</span>' : ''}<br><span>${esc(f.desc)}</span></div>`;
    });
    if (info.necesitaSub) h += `<p class="fn-nota">En este nivel elegís ${esc(info.d.subclassLabel || 'tu subclase')} (próximo paso): los rasgos que aparecen acá dependen de esa elección.</p>`;
    if (info.d && info.d.resourceName && info.d.resourceProgression) {
      const v0 = escalonado(info.d.resourceProgression, info.antes), v1 = escalonado(info.d.resourceProgression, info.n);
      if (v0 !== v1) h += `<p class="fn-nota">${esc(info.d.resourceName)}: ${v0 == null ? '—' : v0} → <strong>${v1}</strong>.</p>`;
    }
    return h;
  }

  function opcionesCheck(lista, clave, cantidad, marcadas, deshabilitadas) {
    return `<div class="fn-checks">${lista.map((o) => {
      const nombre = typeof o === 'string' ? o : o.nombre;
      const desc = typeof o === 'string' ? '' : o.desc;
      const dis = (deshabilitadas || []).includes(nombre);
      return `<label class="fn-check ${dis ? 'dis' : ''}"><input type="checkbox" data-fn-in="check" data-clave="${esc(clave)}" data-valor="${esc(nombre)}" ${marcadas.includes(nombre) ? 'checked' : ''} ${dis ? 'disabled' : ''}> <span><strong>${esc(nombre)}</strong>${desc ? '<br><small>' + esc(desc) + '</small>' : ''}</span></label>`;
    }).join('')}</div>`;
  }

  function htmlElecciones(info) {
    let h = '';
    const sc = leerScores();
    if (info.necesitaSub) {
      h += `<h4 class="fn-h">${esc(info.d.subclassLabel || 'Subclase')} (nivel ${info.d.subclassLevel})</h4><div class="fn-lista">`;
      opcionesSub(info).forEach((s) => {
        h += `<button type="button" class="fn-opcion ${est.subclase === s.name ? 'sel' : ''}" data-fn="subclase" data-valor="${esc(s.name)}"><strong>${esc(s.name)}</strong><small>${esc((s.resumen || '').slice(0, 160))}</small></button>`;
      });
      h += `<button type="button" class="fn-opcion ${est.subclase === '__otra' ? 'sel' : ''}" data-fn="subclase" data-valor="__otra">Otra (homebrew / otro libro)</button></div>`;
      if (est.subclase === '__otra') h += `<input type="text" class="fn-input" data-fn-in="subclase-libre" placeholder="Nombre de la subclase" value="${esc(est.subclaseLibre)}">`;
    }
    if (info.asi) {
      h += `<h4 class="fn-h">Mejora de característica o talento</h4><div class="fn-fila">
        <button type="button" class="fn-btn ${est.asi.modo === 'asi' ? 'sel' : ''}" data-fn="asi-modo" data-valor="asi">Mejora de característica</button>
        <button type="button" class="fn-btn ${est.asi.modo === 'dote' ? 'sel' : ''}" data-fn="asi-modo" data-valor="dote">${info.epico ? 'Talento / Don Épico' : 'Talento'}</button></div>`;
      const selAbil = (campo, valor, excl) => `<select class="fn-input" data-fn-in="${campo}"><option value="">—</option>${ABIL.filter((k) => k !== excl).map((k) => `<option value="${k}" ${valor === k ? 'selected' : ''}>${ABIL_ES[k]} (${sc[k]})</option>`).join('')}</select>`;
      if (est.asi.modo === 'asi') {
        h += `<div class="fn-fila"><label><input type="radio" name="fn-asi-tipo" data-fn-in="asi-tipo" value="una" ${est.asi.tipo !== 'dos' ? 'checked' : ''}> +2 a una</label> <label><input type="radio" name="fn-asi-tipo" data-fn-in="asi-tipo" value="dos" ${est.asi.tipo === 'dos' ? 'checked' : ''}> +1 a dos</label></div>`;
        h += est.asi.tipo === 'dos'
          ? `<div class="fn-fila">${selAbil('asi-a', est.asi.a, null)} ${selAbil('asi-b', est.asi.b, est.asi.a)}</div>`
          : `<div class="fn-fila">${selAbil('asi-a', est.asi.a, null)}</div>`;
        h += '<p class="fn-nota">Ninguna característica puede pasar de 20.</p>';
      } else if (est.asi.modo === 'dote') {
        const lista = (typeof TALENTOS !== 'undefined') ? TALENTOS : [];
        const epicos = info.epico && typeof DONES_EPICOS !== 'undefined' ? DONES_EPICOS : [];
        h += `<select class="fn-input" data-fn-in="dote"><option value="">— Elegí —</option>${lista.map((t) => `<option value="${esc(t.nombre)}" ${est.dote.nombre === t.nombre ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}${epicos.map((t) => `<option value="${esc(t)}" ${est.dote.nombre === t ? 'selected' : ''}>${esc(t)} (Don Épico)</option>`).join('')}<option value="__otro" ${est.dote.nombre === '__otro' ? 'selected' : ''}>Otro (escribirlo)</option></select>`;
        if (est.dote.nombre === '__otro') h += `<input type="text" class="fn-input" data-fn-in="dote-libre" placeholder="Nombre del talento" value="${esc(est.dote.libre)}">`;
        const t = lista.find((x) => x.nombre === est.dote.nombre);
        if (t) h += `<p class="fn-nota">${esc(t.desc)}</p>`;
        const opcionesMas1 = t ? t.aumento : (est.dote.nombre === '__otro' ? ABIL : null);
        if (opcionesMas1) h += `<div class="fn-fila"><label>+1 a: <select class="fn-input" data-fn-in="dote-aumento"><option value="">— ninguno —</option>${opcionesMas1.map((k) => `<option value="${k}" ${est.dote.aumento === k ? 'selected' : ''}>${ABIL_ES[k]} (${sc[k]})</option>`).join('')}</select></label></div>`;
      }
    }
    info.elecciones.forEach((e, i) => {
      const clave = e.tipo + i;
      h += `<h4 class="fn-h">${esc(etiquetaEleccion(e))} — elegí ${e.cantidad}${e.etiqueta ? ' (' + esc(e.etiqueta) + ')' : ''}</h4>`;
      let lista = [];
      let dis = [];
      if (e.tipo === 'expertise') {
        const sk = skillsConfig();
        lista = e.restringido ? e.restringido : SKILLS;
        if (sk.length) dis = lista.filter((n) => { const s = sk.find((x) => x.clave === n); return !s || !s.competente || s.expertise; });
        h += '<p class="fn-nota">Elegí habilidades en las que ya tengas competencia: duplican el bono de competencia.' + (sk.length ? ' Las que no tienen competencia o ya tienen expertise aparecen deshabilitadas.' : '') + '</p>';
      } else if (e.tipo === 'estilo') {
        lista = (typeof ESTILOS_COMBATE !== 'undefined' ? ESTILOS_COMBATE : []).filter((x) => !x.clases || x.clases.includes(info.d.id));
      } else if (e.tipo === 'metamagia') {
        lista = typeof OPCIONES_METAMAGIA !== 'undefined' ? OPCIONES_METAMAGIA : [];
        const ya = new Set(); leerRegistro().forEach((r) => ((r.elecciones && r.elecciones.metamagia) || []).forEach((n) => ya.add(n)));
        dis = Array.from(ya);
      } else if (e.tipo === 'invocaciones') {
        lista = typeof OPCIONES_INVOCACIONES !== 'undefined' ? OPCIONES_INVOCACIONES : [];
        const ya = new Set(); leerRegistro().forEach((r) => ((r.elecciones && r.elecciones.invocaciones) || []).forEach((n) => ya.add(n)));
        dis = Array.from(ya);
        if (info.prog.incierto) h += '<p class="fn-nota">⚠️ La cantidad de invocaciones por nivel no está confirmada contra el libro: ajustala si hace falta.</p>';
      }
      h += opcionesCheck(lista, clave, e.cantidad, est.sel[clave] || [], dis);
      if (e.tipo !== 'expertise') h += `<input type="text" class="fn-input" data-fn-in="libre" data-clave="${esc(clave)}" placeholder="Otra opción (escribirla)" value="${esc(est.libre[clave] || '')}">`;
    });
    const err = validarElecciones(info);
    if (err.length) h += `<ul class="fn-errores">${err.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`;
    return h;
  }

  function nivelMaxHechizo(info) {
    const luego = { ...nivelesActuales(), [info.nombre]: info.n };
    const e = espaciosPara(luego);
    let max = 0;
    e.slots.forEach((c, i) => { if (c > 0) max = i + 1; });
    if (e.pacto) max = Math.max(max, e.pacto.nivel);
    return max;
  }
  function htmlHechizos(info) {
    const p = info.prog;
    const d = info.d;
    let h = `<h4 class="fn-h">Hechizos de ${esc(info.nombre)}</h4>`;
    const c0 = escalonado(p.cantrips, info.antes), c1 = escalonado(p.cantrips, info.n);
    if (p.cantrips) h += `<p class="fn-nota">Trucos: ${c0 == null ? 0 : c0} → <strong>${c1 == null ? 0 : c1}</strong>${c1 > (c0 || 0) ? ' (aprendés ' + (c1 - (c0 || 0)) + ' más)' : ''}.</p>`;
    if (p.preparados) {
      const prepN = p.preparados[info.n - 1];
      const tiene = (window.FichaHechizos ? FichaHechizos.editor.items().filter((x) => x.nivel > 0).length : 0);
      h += `<p class="fn-nota">Hechizos preparados según la tabla: <strong>${prepN}</strong> (en tu ficha hay ${tiene} de nivel 1+).${p.incierto ? ' ⚠️ Tabla sin confirmar: tomala como orientación.' : ''}</p>`;
    }
    if (p.libro) h += `<p class="fn-nota">Libro de conjuros: aprendés ${p.libro.porNivel} hechizos más al subir de nivel.</p>`;
    const maxNivel = nivelMaxHechizo(info);
    const tiene = new Set(window.FichaHechizos ? FichaHechizos.editor.items().map((x) => x.nombre) : []);
    const nombresClase = [d.nombre_es, d.name].map((x) => String(x).toLowerCase());
    const filtro = (est.filtroHechizo || '').toLowerCase();
    const lista = (typeof SPELLS !== 'undefined' ? SPELLS : []).filter((s) => s.nivel <= maxNivel && (s.clases || []).some((c) => nombresClase.includes(String(c).toLowerCase())) && !tiene.has(s.name) && (!filtro || s.name.toLowerCase().includes(filtro)))
      .sort((a, b) => a.nivel - b.nivel || a.name.localeCompare(b.name)).slice(0, 80);
    h += `<input type="text" class="fn-input" data-fn-in="filtro-hechizo" placeholder="Buscar hechizo de ${esc(info.nombre)} (hasta nivel ${maxNivel})..." value="${esc(est.filtroHechizo || '')}">`;
    h += '<div class="fn-checks fn-scroll">' + lista.map((s) => `<label class="fn-check"><input type="checkbox" data-fn-in="hechizo" data-valor="${esc(s.name)}" ${est.hechizos.has(s.name) ? 'checked' : ''}> <span><strong>${esc(s.name)}</strong> <small>${s.nivel === 0 ? 'Truco' : 'Nvl ' + s.nivel}</small></span></label>`).join('') + '</div>';
    if (!lista.length) h += '<p class="fn-nota">No hay más hechizos de la clase para ese filtro.</p>';
    if (cfg.abrirCompendio) h += '<div class="fn-fila"><button type="button" class="fn-btn" data-fn="compendio">📖 Abrir el compendio completo de la ficha</button></div>';
    h += '<p class="fn-nota">Es opcional: podés saltear este paso y agregar hechizos más tarde desde la tarjeta de hechizos. Para reemplazar un hechizo anterior usá ✏️/🗑️ en esa tarjeta.</p>';
    return h;
  }

  function htmlResumen(info) {
    const filas = vistaPrevia(info);
    let h = `<h4 class="fn-h">Vista previa — ${esc(info.nombre)} ${info.n}</h4><table class="fn-tabla">`;
    filas.forEach((f) => { h += `<tr><th>${esc(f[0])}</th><td>${esc(f[1])}</td></tr>`; });
    h += '</table><p class="fn-nota">Nada cambia hasta que confirmes. Podés deshacer esta subida después.</p>';
    return h;
  }

  function cuerpo() {
    if (est.resultado) {
      return `<div class="fn-caja fn-ok"><p>✅ <strong>${esc(est.resultado.clase)} ${est.resultado.nivelNuevo}</strong> aplicado${est.resultado.hpGanado ? ` (+${est.resultado.hpGanado} PG)` : ''}.</p></div>` + htmlUndo();
    }
    const info = est.clase ? infoNivel() : null;
    const id = est.pasos[est.paso];
    if (id === 'clase') return htmlClase();
    if (id === 'pg') return htmlPG(info);
    if (id === 'rasgos') return htmlRasgos(info);
    if (id === 'elecciones') return htmlElecciones(info);
    if (id === 'hechizos') return htmlHechizos(info);
    return htmlResumen(info);
  }

  function puedeAvanzar() {
    const info = est.clase ? infoNivel() : null;
    const id = est.pasos[est.paso];
    if (id === 'clase') return !!est.clase && nivelTotal() < 20;
    if (id === 'pg') return est.hp.tirada != null;
    if (id === 'elecciones') return validarElecciones(info).length === 0;
    return true;
  }

  function render() {
    if (!overlay) return;
    const body = overlay.querySelector('.fn-cuerpo');
    const pie = overlay.querySelector('.fn-pie');
    const prog_ = overlay.querySelector('.fn-pasos');
    if (est.clase) est.pasos = pasosAplicables(infoNivel()); else est.pasos = ['clase'];
    if (est.paso >= est.pasos.length) est.paso = est.pasos.length - 1;
    prog_.innerHTML = est.resultado ? '' : est.pasos.map((p, i) => `<span class="fn-paso ${i === est.paso ? 'act' : (i < est.paso ? 'hecho' : '')}">${esc(tituloPaso(p))}</span>`).join('');
    body.innerHTML = cuerpo();
    if (est.resultado) {
      pie.innerHTML = '<button type="button" class="fn-btn fn-btn-primario" data-fn="cerrar">Cerrar</button>';
      return;
    }
    const ultimo = est.paso === est.pasos.length - 1 && est.pasos[est.paso] === 'resumen';
    pie.innerHTML = `<button type="button" class="fn-btn" data-fn="atras" ${est.paso === 0 ? 'disabled' : ''}>← Atrás</button>
      <button type="button" class="fn-btn" data-fn="cancelar">Cancelar</button>
      ${ultimo ? '<button type="button" class="fn-btn fn-btn-primario" data-fn="confirmar">✅ Confirmar subida</button>'
        : `<button type="button" class="fn-btn fn-btn-primario" data-fn="siguiente" ${puedeAvanzar() ? '' : 'disabled'}>Siguiente →</button>`}`;
  }

  // ------------------------------------------------------------------ aplicar / deshacer
  function aplicar() {
    const info = infoNivel();
    const d = info.d;
    const claseCfg = cfg.clases.find((c) => c.nombre === info.nombre) || (function () {
      const nuevo = { nombre: info.nombre, id: d ? d.id : undefined, dado: d ? d.hitDie : 8, nivelInicial: 0, caster: d ? (d.casterType || null) : null };
      cfg.clases.push(nuevo);
      return nuevo;
    })();
    const hpg = hpGanadoCalculado(info);
    if (hpg == null) return false;
    const hpEl = $(cfg.campoHP || 'hp-cur');
    const prev = { hpCur: hpEl ? (parseInt(hpEl.value, 10) || 0) : null, scores: leerScores(), slots: leerSlotsCur(), recursos: leerRecursosCur() };
    const antesN = nivelesActuales();
    const slotsAntes = espaciosPara(antesN);

    const el = { rasgos: info.rasgos.map((f) => ({ nombre: f.nombre, desc: f.desc, nivel: f.nivel, clase: f.clase, origen: f.origen })) };
    if (info.necesitaSub) el.subclase = est.subclase === '__otra' ? (est.subclaseLibre || '').trim() : est.subclase;
    const aum = aumentosElegidos();
    if (est.asi.modo === 'asi') el.asi = { tipo: est.asi.tipo === 'dos' ? 'dos' : 'una', aumentos: aum };
    if (est.asi.modo === 'dote') {
      const t = (typeof TALENTOS !== 'undefined') ? TALENTOS.find((x) => x.nombre === nombreDote()) : null;
      el.dote = { nombre: nombreDote(), aumento: est.dote.aumento || null };
      if (est.dote.aumento) el.asi = { tipo: 'dote', aumentos: aum };
      if (t && t.hpPorNivel) el.dote.hpPorNivel = t.hpPorNivel;
    }
    info.elecciones.forEach((e, i) => {
      const clave = e.tipo + i;
      const sel = (est.sel[clave] || []).slice();
      const libre = (est.libre[clave] || '').trim();
      if (libre) sel.push(libre);
      el[e.tipo] = (el[e.tipo] || []).concat(sel);
      sel.forEach((n) => {
        const lst = e.tipo === 'estilo' ? ESTILOS_COMBATE : e.tipo === 'metamagia' ? OPCIONES_METAMAGIA : e.tipo === 'invocaciones' ? OPCIONES_INVOCACIONES : [];
        const o = lst.find((x) => x.nombre === n);
        if (e.tipo !== 'expertise') el.rasgos.push({ nombre: `${etiquetaEleccion(e)}: ${n}`, desc: o ? o.desc : '', nivel: info.n, clase: info.nombre, origen: 'Elección' });
      });
    });
    if (el.dote) el.rasgos.push({ nombre: `Talento: ${el.dote.nombre}`, desc: ((typeof TALENTOS !== 'undefined' && TALENTOS.find((x) => x.nombre === el.dote.nombre)) || {}).desc || '', nivel: info.n, clase: info.nombre, origen: 'Elección' });
    if (el.subclase) el.rasgos.push({ nombre: `${d ? (d.subclassLabel || 'Subclase') : 'Subclase'}: ${el.subclase}`, desc: ((d && d.subclasses.find((s) => s.name === el.subclase)) || {}).resumen || '', nivel: info.n, clase: info.nombre, origen: 'Elección' });

    // hechizos (se agregan ahora; el nombre queda en el registro para poder quitarlos al deshacer)
    const agregados = [];
    if (window.FichaHechizos && typeof SPELLS !== 'undefined') {
      const tiene = new Set(FichaHechizos.editor.items().map((x) => x.nombre));
      est.hechizos.forEach((nombre) => {
        const s = SPELLS.find((x) => x.name === nombre);
        if (!s || tiene.has(nombre)) return;
        FichaHechizos.editor.guardarDesdeFormulario({
          nombre: s.name, nivel: s.nivel, tiempo: s.tiempo, alcance: s.alcance, area: '', resumen: s.desc, duracion: s.duracion,
          formula: s.formula || null, slotCost: s.nivel > 0 ? s.nivel : null, ataque: s.ataque || null, upcast: s.upcast || null,
          buff: s.buff ? JSON.parse(JSON.stringify(s.buff)) : null
        });
        agregados.push(nombre);
      });
    }
    el.hechizos = agregados;

    const registro = { clase: info.nombre, nivelNuevo: info.n, dado: claseCfg.dado, tirada: est.hp.tirada, modo: est.hp.modo, hpGanado: hpg, fecha: Date.now(), elecciones: el, prev };
    const lista = leerRegistro();
    lista.push(registro);
    escribirRegistro(lista);

    if (hpEl) { hpEl.value = (parseInt(hpEl.value, 10) || 0) + hpg; hpEl.dispatchEvent(new Event('input', { bubbles: true })); }
    Object.keys(aum).forEach((k) => fijarScore(k, Math.min(20, prev.scores[k] + aum[k])));

    agregarHD(claseCfg.dado);
    // espacios y recursos: se suma la diferencia (los espacios/usos nuevos quedan disponibles)
    refrescarEspacios();
    const slotsDesp = espaciosPara(nivelesActuales());
    for (let i = 0; i < 9; i++) {
      const dlt = slotsDesp.slots[i] - slotsAntes.slots[i];
      if (dlt > 0) { const cur = leerSlotsCur()[i + 1]; fijarSlotCur(i + 1, (cur == null ? slotsAntes.slots[i] : cur) + dlt); }
    }
    if (slotsDesp.pacto && slotsAntes.pacto && $('slot-pact-cur') && slotsDesp.pacto.count > slotsAntes.pacto.count) fijarSlotCur('pact', (leerSlotsCur().pact || 0) + (slotsDesp.pacto.count - slotsAntes.pacto.count));
    (cfg.recursos || []).forEach((r) => {
      if (r.clase !== info.nombre) return;
      const antesM = (function () { const lv = info.antes; const def = defRecurso(r); return def ? (def.max.por ? def.max.por * lv : (def.max.tabla ? (escalonado(def.max.tabla, lv) || 0) : lv)) : 0; })();
      refrescarRecursos();
      const dlt = maxRecurso(r) - antesM;
      const cur = $(r.campoId);
      if (cur && dlt > 0) { const v = (parseInt(cur.textContent, 10) || 0) + dlt; cur.textContent = v; if (window.FichaComun) FichaComun.guardarCampo(r.campoId, v); }
    });
    refrescarRecursos();
    renderRasgos();
    aplicarExpertise();
    postCambio(registro);
    if (cfg.alAplicar) cfg.alAplicar({ registro, info });
    est.resultado = registro;
    return true;
  }

  function postCambio() {
    if (typeof window.updateHPDisplay === 'function') window.updateHPDisplay();
    if (typeof window.actualizarEtiquetaHD === 'function') window.actualizarEtiquetaHD();
    if (window.FichaAtributos) FichaAtributos.recalcular();
    if (window.FichaComun && FichaComun.notificarBuffs) FichaComun.notificarBuffs();
    actualizarAviso();
    document.dispatchEvent(new CustomEvent('ficha:nivel'));
  }

  function deshacerReal() {
    const lista = leerRegistro();
    if (!lista.length) return false;
    const r = lista.pop();
    const prev = r.prev || {};
    const el = r.elecciones || {};
    escribirRegistro(lista);
    // hp
    const hpEl = $(cfg.campoHP || 'hp-cur');
    if (hpEl && prev.hpCur != null) { hpEl.value = prev.hpCur; hpEl.dispatchEvent(new Event('input', { bubbles: true })); }
    else if (hpEl) { hpEl.value = Math.max(0, (parseInt(hpEl.value, 10) || 0) - (r.hpGanado || 0)); hpEl.dispatchEvent(new Event('input', { bubbles: true })); }
    // características
    if (prev.scores) ABIL.forEach((k) => { const el_ = $(scoreId(k)); if (el_ && parseInt(el_.value, 10) !== prev.scores[k]) fijarScore(k, prev.scores[k]); });
    // hechizos agregados por esta subida
    if (window.FichaHechizos && (el.hechizos || []).length) {
      const items = FichaHechizos.editor.items();
      el.hechizos.forEach((nombre) => { const i = items.findIndex((h) => h.nombre === nombre); if (i >= 0) items.splice(i, 1); });
      FichaComun.guardarCampo('hechizos-json', JSON.stringify(items));
      FichaHechizos.editor.renderizar();
    }
    // clase nueva que quedó en nivel 0
    const idx = cfg.clases.findIndex((c) => c.nombre === r.clase);
    if (idx >= 0 && cfg.clases[idx].nivelInicial === 0 && nivelClase(r.clase) === 0) cfg.clases.splice(idx, 1);
    quitarHD();
    refrescarEspacios();
    if (prev.slots) Object.keys(prev.slots).forEach((k) => fijarSlotCur(k, prev.slots[k]));
    refrescarRecursos();
    if (prev.recursos) Object.keys(prev.recursos).forEach((id) => { const e = $(id); if (e) { e.textContent = prev.recursos[id]; FichaComun.guardarCampo(id, prev.recursos[id]); } });
    renderRasgos();
    aplicarExpertise();
    postCambio();
    if (cfg.alDeshacer) cfg.alDeshacer({ registro: r });
    return r;
  }

  // ------------------------------------------------------------------ interfaz
  function nuevoEstado() {
    return {
      paso: 0, pasos: ['clase'], clase: null, esNueva: false, hp: { modo: null, tirada: null },
      subclase: null, subclaseLibre: '', asi: { modo: null, tipo: 'una', a: null, b: null }, dote: { nombre: null, libre: '', aumento: null },
      sel: {}, libre: {}, hechizos: new Set(), filtroHechizo: '', confirmarUndo: false, resultado: null
    };
  }

  function inyectarCSS() {
    if ($('fn-css')) return;
    const s = document.createElement('style');
    s.id = 'fn-css';
    s.textContent = `
.fn-overlay{position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:10000;display:none;align-items:center;justify-content:center;padding:10px}
.fn-overlay.open{display:flex}
.fn-modal{background:var(--bg-card,#1f1a14);color:var(--text-light,#f1ece3);border:1px solid var(--border-color,#3a2f22);border-radius:12px;max-width:640px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.6);font-size:.9rem}
.fn-cab{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--border-color,#3a2f22)}
.fn-cab h3{margin:0;font-size:1.05rem;color:var(--accent-gold,#d4af37)}
.fn-cab button{background:none;border:none;color:inherit;font-size:1.1rem;cursor:pointer}
.fn-pasos{display:flex;gap:6px;flex-wrap:wrap;padding:8px 14px 0}
.fn-paso{font-size:.68rem;padding:2px 8px;border-radius:10px;border:1px solid var(--border-color,#3a2f22);color:var(--text-muted,#a89f8e)}
.fn-paso.act{background:var(--accent-gold,#d4af37);color:#000;border-color:transparent;font-weight:700}
.fn-paso.hecho{color:var(--text-light,#f1ece3)}
.fn-cuerpo{padding:12px 14px;overflow-y:auto;flex:1}
.fn-pie{display:flex;gap:8px;justify-content:flex-end;padding:10px 14px;border-top:1px solid var(--border-color,#3a2f22);flex-wrap:wrap}
.fn-h{margin:12px 0 6px;font-size:.88rem;color:var(--accent-gold,#d4af37)}
.fn-nota{font-size:.78rem;color:var(--text-muted,#a89f8e);margin:6px 0}
.fn-fila{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}
.fn-lista{display:flex;flex-direction:column;gap:6px}
.fn-opcion{text-align:left;background:var(--surface-mid,#221c15);color:inherit;border:1px solid var(--border-color,#3a2f22);border-radius:8px;padding:8px 10px;cursor:pointer;font-size:.88rem;display:flex;flex-direction:column;gap:2px}
.fn-opcion small{color:var(--text-muted,#a89f8e);font-size:.72rem}
.fn-opcion.sel{border-color:var(--accent-gold,#d4af37);box-shadow:0 0 0 1px var(--accent-gold,#d4af37) inset}
.fn-opcion.bloqueada{opacity:.6;cursor:not-allowed}
.fn-btn{background:var(--surface-mid,#221c15);color:inherit;border:1px solid var(--border-color,#3a2f22);border-radius:8px;padding:7px 12px;cursor:pointer;font-size:.82rem;font-weight:600}
.fn-btn:disabled{opacity:.4;cursor:not-allowed}
.fn-btn.sel{border-color:var(--accent-gold,#d4af37);color:var(--accent-gold,#d4af37)}
.fn-btn-primario{background:var(--accent-gold,#d4af37);color:#000;border-color:transparent}
.fn-btn-peligro{background:#823a3a;border-color:#a14a4a;color:#fff}
.fn-input{background:var(--surface-strong,#140f0b);color:inherit;border:1px solid var(--border-color,#3a2f22);border-radius:6px;padding:6px 8px;font-size:.85rem;width:100%;margin:4px 0}
.fn-fila .fn-input{width:auto;min-width:150px}
.fn-caja{background:var(--surface-mid,#221c15);border:1px solid var(--border-color,#3a2f22);border-radius:8px;padding:8px 10px;margin:10px 0}
.fn-aviso-caja{border-color:var(--accent-gold,#d4af37)}
.fn-ok{border-color:#4a7a52}
.fn-bloqueo{color:#e08888;font-weight:700}
.fn-resultado{font-size:1.05rem;margin:10px 0;color:var(--accent-gold,#d4af37)}
.fn-rasgo{border-bottom:1px solid var(--border-color,#3a2f22);padding:6px 0;font-size:.82rem}
.fn-rasgo small{color:var(--text-muted,#a89f8e)}
.fn-checks{display:flex;flex-direction:column;gap:4px;margin:6px 0}
.fn-scroll{max-height:240px;overflow-y:auto;border:1px solid var(--border-color,#3a2f22);border-radius:8px;padding:6px}
.fn-check{display:flex;gap:8px;align-items:flex-start;font-size:.82rem;cursor:pointer}
.fn-check.dis{opacity:.45}
.fn-check small{color:var(--text-muted,#a89f8e)}
.fn-errores{color:#e08888;font-size:.8rem;margin:8px 0 0 18px}
.fn-tabla{width:100%;border-collapse:collapse;font-size:.82rem}
.fn-tabla th{text-align:left;color:var(--accent-gold,#d4af37);padding:5px 8px 5px 0;vertical-align:top;white-space:nowrap}
.fn-tabla td{padding:5px 0;border-bottom:1px solid var(--border-color,#3a2f22)}
.fn-aviso-nivel{background:var(--accent-gold,#d4af37);color:#000;border:none;border-radius:12px;padding:3px 10px;font-weight:700;font-size:.74rem;cursor:pointer;margin-left:6px}
@media (max-width:520px){.fn-modal{max-height:96vh;border-radius:10px}.fn-pie .fn-btn{flex:1}}
`;
    document.head.appendChild(s);
  }

  function crearOverlay() {
    if (overlay) return;
    inyectarCSS();
    overlay = document.createElement('div');
    overlay.className = 'fn-overlay';
    overlay.id = 'fn-overlay';
    overlay.innerHTML = `<div class="fn-modal" role="dialog" aria-modal="true" aria-label="Subir de nivel">
      <div class="fn-cab"><h3>⬆️ Subir de Nivel</h3><button type="button" data-fn="cerrar" aria-label="Cerrar">✖</button></div>
      <div class="fn-pasos"></div><div class="fn-cuerpo"></div><div class="fn-pie"></div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cerrar();
      const b = e.target.closest('[data-fn]');
      if (b && overlay.contains(b)) accion(b.dataset.fn, b.dataset.valor);
    });
    overlay.addEventListener('input', entrada);
    overlay.addEventListener('change', entrada);
  }

  function accion(a, v) {
    if (!est) return;
    if (a === 'cerrar') return cerrar();
    if (a === 'cancelar') { est = null; return cerrar(); }
    if (a === 'atras') { if (est.paso > 0) est.paso--; return render(); }
    if (a === 'siguiente') { if (puedeAvanzar()) est.paso++; return render(); }
    if (a === 'clase' || a === 'clase-nueva') {
      if (est.clase !== v || est.esNueva !== (a === 'clase-nueva')) { const base = nuevoEstado(); est = { ...base, clase: v, esNueva: a === 'clase-nueva', paso: 0 }; }
      return render();
    }
    if (a === 'hp') {
      const d = datosClase(est.clase);
      const dado = d ? d.hitDie : 8;
      const prom = (typeof HD_PROMEDIO !== 'undefined' && HD_PROMEDIO[dado]) || Math.ceil(dado / 2) + 1;
      est.hp = { modo: v, tirada: v === 'promedio' ? prom : (Math.floor(Math.random() * dado) + 1) };
      return render();
    }
    if (a === 'subclase') { est.subclase = v; return render(); }
    if (a === 'asi-modo') { est.asi.modo = v; return render(); }
    if (a === 'compendio') { if (cfg.abrirCompendio) { overlay.classList.remove('open'); cfg.abrirCompendio(); } return; }
    if (a === 'undo') { est.confirmarUndo = true; return render(); }
    if (a === 'undo-no') { est.confirmarUndo = false; return render(); }
    if (a === 'undo-si') { deshacerReal(); est.confirmarUndo = false; est.resultado = null; est.clase = null; est.paso = 0; return render(); }
    if (a === 'confirmar') { if (aplicar()) render(); return; }
  }

  function entrada(e) {
    const t = e.target.closest('[data-fn-in]');
    if (!t || !est) return;
    const k = t.dataset.fnIn;
    const v = t.value;
    if (k === 'check') {
      const clave = t.dataset.clave;
      const arr = est.sel[clave] || (est.sel[clave] = []);
      const i = arr.indexOf(t.dataset.valor);
      if (t.checked && i < 0) arr.push(t.dataset.valor);
      if (!t.checked && i >= 0) arr.splice(i, 1);
      return render();
    }
    if (k === 'hechizo') { if (t.checked) est.hechizos.add(t.dataset.valor); else est.hechizos.delete(t.dataset.valor); return; }
    if (k === 'filtro-hechizo') { est.filtroHechizo = v; render(); const f = overlay.querySelector('[data-fn-in="filtro-hechizo"]'); if (f) { f.focus(); f.setSelectionRange(v.length, v.length); } return; }
    if (k === 'libre') { est.libre[t.dataset.clave] = v; if (e.type === 'change') render(); else actualizarPie(); return; }
    if (k === 'subclase-libre') { est.subclaseLibre = v; return actualizarPie(); }
    if (k === 'asi-tipo') { est.asi.tipo = v; est.asi.b = null; return render(); }
    if (k === 'asi-a') { est.asi.a = v || null; if (est.asi.b === est.asi.a) est.asi.b = null; return render(); }
    if (k === 'asi-b') { est.asi.b = v || null; return render(); }
    if (k === 'dote') { est.dote.nombre = v || null; est.dote.aumento = null; return render(); }
    if (k === 'dote-libre') { est.dote.libre = v; return actualizarPie(); }
    if (k === 'dote-aumento') { est.dote.aumento = v || null; return render(); }
  }
  function actualizarPie() {
    const sig = overlay.querySelector('[data-fn="siguiente"]');
    if (sig) sig.disabled = !puedeAvanzar();
    const err = overlay.querySelector('.fn-errores');
    if (err && est.clase) {
      const m = validarElecciones(infoNivel());
      err.innerHTML = m.map((x) => `<li>${esc(x)}</li>`).join('');
    }
  }

  function abrir() {
    if (!cfg) return;
    asegurarClases();
    crearOverlay();
    if (!est || est.resultado) est = nuevoEstado();
    const propias = clasesPropias();
    if (!est.clase && propias.length === 1 && nivelTotal() < 20) { est.clase = propias[0].nombre; est.paso = 0; }
    overlay.classList.add('open');
    render();
  }
  function cerrar() {
    if (overlay) overlay.classList.remove('open');
    if (est && est.resultado) est = null;
  }
  function deshacer(opts) {
    asegurarClases();
    if (opts && opts.sinConfirmar) return deshacerReal();
    abrir();
    est.confirmarUndo = true;
    est.clase = null;
    render();
  }

  // ------------------------------------------------------------------ aviso de subida pendiente
  function actualizarAviso() {
    if (!cfg) return;
    let av = $('fn-aviso');
    const p = nivelPendiente();
    if (!av) {
      av = document.createElement('button');
      av.type = 'button';
      av.id = 'fn-aviso';
      av.className = 'fn-aviso-nivel';
      av.hidden = true;
      av.setAttribute('data-fn-aviso', '1');
      av.addEventListener('click', () => abrir());
      const btn = document.querySelector(cfg.boton || '[data-fn-abrir]');
      if (btn && btn.parentNode) btn.parentNode.insertBefore(av, btn.nextSibling);
      else document.body.appendChild(av);
      inyectarCSS();
    }
    if (p.pendiente) {
      av.hidden = false;
      av.textContent = `⬆️ Subida de nivel pendiente: nivel ${p.nivelActual} → ${p.nivelXP}`;
      av.title = `XP ${p.xp.toLocaleString('es-AR')} corresponde a nivel ${p.nivelXP}. No se aplica sola: tocá para abrir el asistente.`;
    } else av.hidden = true;
  }

  let refrescando = false;
  function refrescarTodo() {
    // guardarCampo() dispara 'ficha:datos-sincronizados' en el mismo tick: sin esta guarda se reentra.
    if (!cfg || refrescando) return;
    refrescando = true;
    try { refrescarTodoInterno(); } finally { refrescando = false; }
  }
  function refrescarTodoInterno() {
    asegurarClases();
    renderRasgos();
    aplicarExpertise();
    refrescarEspacios();
    refrescarRecursos();
    sincronizarHD();
    actualizarAviso();
  }

  function iniciar(opciones) {
    cfg = opciones;
    if (!Array.isArray(cfg.clases)) cfg.clases = [];
    asegurarClases();
    inyectarCSS();
    const xp = $(cfg.campoXP || 'xp-val');
    if (xp) xp.addEventListener('input', actualizarAviso);
    document.addEventListener('ficha:datos-sincronizados', refrescarTodo);
    document.querySelectorAll(cfg.boton || '[data-fn-abrir]').forEach((b) => { if (!b.dataset.fnLigado) { b.dataset.fnLigado = '1'; b.addEventListener('click', abrir); } });
    refrescarTodo();
  }

  window.FichaNivel = {
    iniciar, abrir, cerrar, deshacer, nivelPorXP, nivelPendiente, actualizarAviso, descanso,
    nivelClase, nivelTotal, registro: leerRegistro, subclaseDe, espaciosPara, refrescar: refrescarTodo,
    get _est() { return est; }
  };
})();

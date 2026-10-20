/*
 * importar-personaje.js — importa un personaje desde el JSON de Alchemy RPG (importar-personaje.html?campana=<código>).
 *
 * Flujo: archivo/pegado → FichaImportador.analizar → pantalla de revisión editable → FichaGenerador.generar →
 * transacción en campanas/<campana>/personajes/<id> (solo si no existe). La ficha se abre con ficha.html?pj=<id>.
 * Sin alert/confirm/prompt: avisos y errores en la página.
 */
(function () {
  'use strict';

  const FIREBASE = {
    apiKey: 'AIzaSyBaCAA748xac6HcrQnY-p1jHRp8_CtgtbU', authDomain: 'personajes-rol.firebaseapp.com',
    databaseURL: 'https://personajes-rol-default-rtdb.firebaseio.com', projectId: 'personajes-rol',
    storageBucket: 'personajes-rol.appspot.com', messagingSenderId: '81108671440', appId: '1:81108671440:web:effb710af86054f4c6f7d5',
  };
  const G = window.FichaGenerador, I = window.FichaImportador;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const params = new URLSearchParams(location.search);
  const CAMPANA = (params.get('campana') || '').trim();
  const ATRS = G ? G.ATRIBUTOS : ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const entero = (v) => { const n = parseInt(v, 10); return isNaN(n) ? null : n; };

  let db = null, usuario = null, S = null, creando = false;

  const clases = () => (typeof CLASSES !== 'undefined' ? CLASSES : []);
  const nom = (d) => d.nombre_es || d.name;

  function avisoGlobal(html) { const el = $('aviso-global'); el.innerHTML = `<span>${html}</span>`; el.hidden = false; $('cargando').hidden = true; $('cuerpo').hidden = true; }
  function estadoArchivo(t) { $('estado-archivo').textContent = t || ''; }

  /* ---------- análisis ---------- */
  function analizar(texto) {
    const r = I.analizar(texto);
    if (!r.form) { S = null; $('revision').hidden = true; $('resultado').hidden = true; estadoArchivo(''); mostrarSoloAvisos(r.avisos); return; }
    S = {
      form: r.form, avisos: r.avisos, detalle: r.detalle,
      usarRasgo: r.form.rasgosExtra.map(() => true), usarHechizo: r.form.hechizos.map(() => true), usarLibre: r.form.hechizosLibres.map(() => true), usarEquipo: r.form.equipoExtra.map(() => true),
      exp: Object.assign({}, r.form.habilidades),
    };
    estadoArchivo('Listo: revisá los datos de abajo.');
    pintarRevision();
  }
  function mostrarSoloAvisos(avisos) {
    const rev = $('revision'); rev.hidden = false;
    rev.innerHTML = `<section class="bloque"><h2>No se pudo leer el archivo</h2>${avisosHtml(avisos)}</section>`;
  }
  function avisosHtml(avisos) {
    if (!avisos.length) return '';
    return `<div class="avisos">${avisos.map((a) => `<div class="aviso ${a.tipo === 'error' ? 'aviso-mal' : a.tipo === 'aviso' ? 'aviso-alerta' : ''}" ${a.tipo === 'error' ? 'role="alert"' : ''}><span>${a.tipo === 'error' ? '⛔' : a.tipo === 'aviso' ? '⚠️' : 'ℹ️'} ${esc(a.texto)}</span></div>`).join('')}</div>`;
  }

  /* ---------- revisión ---------- */
  function opcionesClase(sel) {
    const of = clases().filter((c) => !c.custom), cu = clases().filter((c) => c.custom);
    const op = (c) => `<option value="${esc(c.id)}"${c.id === sel ? ' selected' : ''}>${esc(nom(c))}</option>`;
    return `<option value="">— Elegí una clase —</option>${of.map(op).join('')}${cu.length ? `<optgroup label="✨ Custom">${cu.map(op).join('')}</optgroup>` : ''}`;
  }
  function filaClase(c, i) {
    const d = clases().find((x) => x.id === c.id);
    const lista = d ? (d.subclasses || []).map((s) => `<option value="${esc(s.name)}"></option>`).join('') : '';
    return `<div class="fila-clase">
      <label class="campo"><span>Clase</span><select data-k="clase" data-i="${i}">${opcionesClase(c.id)}</select></label>
      <label class="campo"><span>Nivel</span><input type="number" min="1" max="20" value="${esc(c.nivel)}" data-k="nivel" data-i="${i}"></label>
      <label class="campo"><span>${esc(d && d.subclassLabel ? d.subclassLabel : 'Subclase')}</span><input type="text" list="sub-${i}" value="${esc(c.subclase)}" data-k="subclase" data-i="${i}" placeholder="${d && (d.subclasses || []).length ? 'Elegí o escribí' : 'Opcional'}"><datalist id="sub-${i}">${lista}</datalist></label>
      ${S.form.clases.length > 1 ? `<button type="button" class="btn btn-fantasma btn-sm" data-act="quitar-clase" data-i="${i}" aria-label="Quitar esta clase">✖</button>` : '<span></span>'}
    </div>${c.original && c.original !== (d ? nom(d) : '') ? `<p class="texto-suave" style="font-size:var(--fs-xs)">En el JSON: «${esc(c.original)}»</p>` : ''}`;
  }
  function pintarRevision() {
    const f = S.form, rev = $('revision');
    const habs = Object.keys(G.HABILIDADES).map((h) => {
      const on = !!f.habilidades[h];
      return `<div class="hab"><label class="hab" style="min-height:0"><input type="checkbox" data-k="hab" data-h="${esc(h)}"${on ? ' checked' : ''}> ${esc(h)} <small>(${G.HABILIDADES[h]})</small></label><label class="exp"><input type="checkbox" data-k="exp" data-h="${esc(h)}"${f.habilidades[h] === 'exp' ? ' checked' : ''}${on ? '' : ' disabled'}> pericia</label></div>`;
    }).join('');
    const itemRasgo = (r, i) => `<label class="item"><input type="checkbox" data-k="usar-rasgo" data-i="${i}"${S.usarRasgo[i] ? ' checked' : ''}><div><strong>${esc(r.titulo)}</strong> <span class="tag">${esc(r.tag)}</span><p>${esc(r.texto)}</p></div></label>`;
    rev.hidden = false;
    rev.innerHTML = `
      <section class="bloque"><h2>2. Lo que encontré</h2>${avisosHtml(S.avisos) || '<p class="texto-suave">Todo se reconoció sin problemas.</p>'}</section>
      <section class="bloque"><h2>Identidad</h2>
        <div class="rejilla">
          <label class="campo"><span>Nombre *</span><input type="text" data-k="nombre" value="${esc(f.nombre)}"></label>
          <label class="campo"><span>Especie / raza</span><input type="text" data-k="especie" value="${esc(f.especie)}"></label>
          <label class="campo"><span>Trasfondo</span><input type="text" data-k="trasfondoNombre" value="${esc(f.trasfondoNombre)}"></label>
          <label class="campo"><span>Alineamiento</span><input type="text" data-k="alineamiento" value="${esc(f.alineamiento)}"></label>
        </div></section>
      <section class="bloque"><h2>Clases</h2>
        ${f.clases.map(filaClase).join('')}
        <div class="fila-btn"><button type="button" class="btn btn-fantasma btn-sm" data-act="agregar-clase"${f.clases.length >= 3 ? ' disabled' : ''}>➕ Agregar clase (multiclase)</button></div></section>
      <section class="bloque"><h2>Atributos</h2>
        <div class="rejilla">${ATRS.map((k) => `<label class="campo"><span>${esc(G.ATRIBUTO_ES[k])} (${k})</span><input type="number" min="1" max="30" value="${esc(f.atributos[k])}" data-k="atr" data-a="${k}"></label>`).join('')}</div></section>
      <section class="bloque"><h2>Defensa, vida y movimiento</h2>
        <p class="texto-suave">Dejá en blanco lo que quieras que calcule la app. Con la CA fija del JSON, equipar armadura en la ficha la recalcula.</p>
        <div class="rejilla">
          <label class="campo"><span>CA fija</span><input type="number" min="1" max="40" value="${esc(f.caFija == null ? '' : f.caFija)}" data-k="caFija" placeholder="auto"></label>
          <label class="campo"><span>PG máximos</span><input type="number" min="1" value="${esc(f.hpMax == null ? '' : f.hpMax)}" data-k="hpMax" placeholder="auto"></label>
          <label class="campo"><span>PG actuales</span><input type="number" min="0" value="${esc(f.hpActual == null ? '' : f.hpActual)}" data-k="hpActual" placeholder="= máximos"></label>
          <label class="campo"><span>Velocidad (ft)</span><input type="number" min="0" value="${esc(f.velocidad == null ? '' : f.velocidad)}" data-k="velocidad" placeholder="30"></label>
          <label class="campo"><span>Experiencia (XP)</span><input type="number" min="0" value="${esc(f.xp == null ? '' : f.xp)}" data-k="xp" placeholder="auto por nivel"></label>
        </div></section>
      <section class="bloque"><h2>Habilidades con competencia</h2><div class="habs">${habs}</div></section>
      ${f.rasgosExtra.length ? `<section class="bloque"><h2>Acciones y rasgos del JSON (${f.rasgosExtra.length})</h2><p class="texto-suave">Se agregan a la ficha como tarjetas editables. Los rasgos de la clase hasta tu nivel se agregan aparte, solos.</p>${f.rasgosExtra.map(itemRasgo).join('')}</section>` : ''}
      ${(f.hechizos.length || f.hechizosLibres.length) ? `<section class="bloque"><h2>Hechizos</h2>
        ${f.hechizos.map((h, i) => `<label class="item"><input type="checkbox" data-k="usar-hechizo" data-i="${i}"${S.usarHechizo[i] ? ' checked' : ''}><div><strong>${esc(h)}</strong> <span class="tag">compendio</span><p>${esc(((S.detalle.hechizosReconocidos[i] || {}).original) || '')}</p></div></label>`).join('')}
        ${f.hechizosLibres.map((h, i) => `<label class="item"><input type="checkbox" data-k="usar-libre" data-i="${i}"${S.usarLibre[i] ? ' checked' : ''}><div><strong>${esc(h.nombre)}</strong> <span class="tag">libre · nivel ${esc(h.nivel)}</span><p>${esc(h.resumen)}</p></div></label>`).join('')}</section>` : ''}
      ${f.equipoExtra.length ? `<section class="bloque"><h2>Equipo (${f.equipoExtra.length})</h2>${f.equipoExtra.map((e, i) => `<label class="item"><input type="checkbox" data-k="usar-equipo" data-i="${i}"${S.usarEquipo[i] ? ' checked' : ''}><div><strong>${esc(e.nombre)}</strong> × ${esc(e.cantidad)}<p>${esc(e.descripcion)}</p></div></label>`).join('')}</section>` : ''}
      <section class="bloque"><h2>3. Crear</h2>
        <div id="errores" role="alert"></div>
        <div class="fila-btn"><button type="button" class="btn btn-primario" id="btn-crear">✨ Crear personaje</button><span class="texto-suave">Se guarda en la campaña <strong>${esc(CAMPANA)}</strong> a tu nombre.</span></div>
        <div id="estado-creacion" role="status" aria-live="polite"></div></section>`;
  }

  /* ---------- edición ---------- */
  function onChange(e) {
    const t = e.target, k = t.dataset && t.dataset.k; if (!S || !k) return;
    const f = S.form, i = parseInt(t.dataset.i, 10);
    if (k === 'clase') { f.clases[i].id = t.value; f.clases[i].subclase = ''; pintarRevision(); enfocar(`[data-k="clase"][data-i="${i}"]`); }
    else if (k === 'hab') { if (t.checked) f.habilidades[t.dataset.h] = 'comp'; else delete f.habilidades[t.dataset.h]; pintarRevision(); }
    else if (k === 'exp') f.habilidades[t.dataset.h] = t.checked ? 'exp' : 'comp';
    else if (k === 'usar-rasgo') S.usarRasgo[i] = t.checked;
    else if (k === 'usar-hechizo') S.usarHechizo[i] = t.checked;
    else if (k === 'usar-libre') S.usarLibre[i] = t.checked;
    else if (k === 'usar-equipo') S.usarEquipo[i] = t.checked;
  }
  function onInput(e) {
    const t = e.target, k = t.dataset && t.dataset.k; if (!S || !k) return;
    const f = S.form, i = parseInt(t.dataset.i, 10);
    if (k === 'nivel') f.clases[i].nivel = t.value;
    else if (k === 'subclase') f.clases[i].subclase = t.value;
    else if (k === 'atr') f.atributos[t.dataset.a] = t.value;
    else if (['nombre', 'especie', 'trasfondoNombre', 'alineamiento'].indexOf(k) >= 0) f[k] = t.value;
    else if (['caFija', 'hpMax', 'hpActual', 'velocidad', 'xp'].indexOf(k) >= 0) f[k] = t.value === '' ? null : t.value;
  }
  function enfocar(sel) { const el = document.querySelector(sel); if (el) el.focus(); }
  function onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || !S) return;
    if (b.dataset.act === 'quitar-clase') { S.form.clases.splice(parseInt(b.dataset.i, 10), 1); pintarRevision(); }
    else if (b.dataset.act === 'agregar-clase') { S.form.clases.push({ id: '', nivel: 1, subclase: '' }); pintarRevision(); enfocar(`[data-k="clase"][data-i="${S.form.clases.length - 1}"]`); }
  }

  /* ---------- crear ---------- */
  function formFinal() {
    const f = JSON.parse(JSON.stringify(S.form));
    f.rasgosExtra = f.rasgosExtra.filter((_, i) => S.usarRasgo[i]);
    f.hechizos = f.hechizos.filter((_, i) => S.usarHechizo[i]);
    f.hechizosLibres = f.hechizosLibres.filter((_, i) => S.usarLibre[i]);
    f.equipoExtra = f.equipoExtra.filter((_, i) => S.usarEquipo[i]);
    ['caFija', 'hpMax', 'hpActual', 'velocidad', 'xp'].forEach((k) => { if (f[k] === null || f[k] === '' || f[k] === undefined) delete f[k]; });
    f.clases = f.clases.map((c) => ({ id: c.id, nivel: entero(c.nivel) || 1, subclase: String(c.subclase || '').trim() }));
    f.nombre = String(f.nombre || '').trim();
    ATRS.forEach((k) => { f.atributos[k] = entero(f.atributos[k]) || 10; });
    return f;
  }
  function errores(msgs) { $('errores').innerHTML = msgs.length ? `<div class="aviso aviso-mal"><div><ul>${msgs.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div></div>` : ''; }
  function estadoCreacion(html, tipo) { $('estado-creacion').innerHTML = html ? `<div class="aviso ${tipo || ''}"><div>${html}</div></div>` : ''; }

  async function crear() {
    if (creando || !S) return;
    errores([]); estadoCreacion('');
    const form = formFinal();
    const falt = [];
    form.clases.forEach((c, i) => { if (!c.id) falt.push(`Elegí la clase de la fila ${i + 1}.`); });
    if (falt.length) { errores(falt); return; }
    creando = true; $('btn-crear').disabled = true; estadoCreacion('Creando el personaje…');
    try {
      let creado = null, ultimo = null;
      for (let intento = 0; intento < 4 && !creado; intento++) {
        let r;
        try { r = G.generar(form); }
        catch (err) { creando = false; $('btn-crear').disabled = false; estadoCreacion(''); errores((err && err.errores) || [err && err.message ? err.message : String(err)]); return; }
        ultimo = r.id;
        const nodo = Object.assign({}, r.nodo, { owner: usuario.uid, activo: true, publico: false });
        const res = await db.ref(`campanas/${CAMPANA}/personajes/${r.id}`).transaction((cur) => (cur === null || cur === undefined ? nodo : undefined));
        if (res && res.committed) creado = { id: r.id, resumen: r.resumen, nombre: form.nombre };
      }
      if (!creado) throw new Error('No se pudo reservar un identificador libre (' + ultimo + '). Probá de nuevo.');
      creando = false; mostrarExito(creado);
    } catch (err) {
      creando = false; $('btn-crear').disabled = false;
      const msg = String((err && (err.code || err.message)) || err);
      estadoCreacion(/permission|denied/i.test(msg) ? '<strong>No tenés permiso para crear personajes en esta campaña.</strong> Las reglas de la base solo dejan crear uno a un jugador con sesión iniciada que lo registre a su nombre, o al GM.' : '<strong>No se pudo crear el personaje.</strong> ' + esc(msg) + ' No se guardó nada a medias.', 'aviso-mal');
    }
  }
  function mostrarExito(c) {
    const url = `ficha.html?pj=${encodeURIComponent(c.id)}&campana=${encodeURIComponent(CAMPANA)}`;
    $('revision').hidden = true;
    const r = $('resultado'); r.hidden = false;
    r.innerHTML = `<section class="bloque"><h2 tabindex="-1" id="t-exito">¡Personaje importado!</h2>
      <p><strong>${esc(c.nombre)}</strong> — ${esc(c.resumen.clasesTxt)} · ${esc(c.resumen.pg)} PG</p>
      <p class="texto-suave">Quedó guardado en la campaña <strong>${esc(CAMPANA)}</strong> a tu nombre. Abrí la ficha para revisar vida, espacios de conjuro y agregar lo que el JSON no traía.</p>
      <div class="fila-btn"><a class="btn btn-primario" id="abrir-ficha" href="${esc(url)}">📜 Abrir ficha</a><button type="button" class="btn btn-fantasma" id="btn-otro">📥 Importar otro</button><a class="btn btn-fantasma" href="index.html">Volver al menú</a></div></section>`;
    $('t-exito').focus();
    $('btn-otro').addEventListener('click', () => { r.hidden = true; $('texto-json').value = ''; $('archivo').value = ''; estadoArchivo(''); S = null; });
  }

  /* ---------- arranque ---------- */
  function cargarScript(src) { return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); }); }
  function esperarUsuario() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE);
    return new Promise((ok) => { let hecho = false; const fin = (u) => { if (!hecho) { hecho = true; ok(u || null); } }; firebase.auth().onAuthStateChanged((u) => fin(u), () => fin(null)); setTimeout(() => fin(null), 15000); });
  }
  async function arrancar() {
    if (!G || !I || typeof CLASSES === 'undefined') return avisoGlobal('No se pudieron cargar los datos del importador. Recargá la página.');
    if (!CAMPANA) return avisoGlobal('<strong>Abrí esta página desde una campaña.</strong> Falta el código en la dirección (<code>importar-personaje.html?campana=&lt;código&gt;</code>). Entrá desde el <a href="index.html">menú principal</a>.');
    if (/[.#$\[\]\/]/.test(CAMPANA)) return avisoGlobal('El código de campaña de la dirección no es válido. Entrá desde el <a href="index.html">menú principal</a>.');
    if (!window.firebase) return avisoGlobal('No se pudo cargar Firebase. Revisá tu conexión y recargá la página.');
    $('sub-campana').textContent = `Campaña ${CAMPANA} · cargá el JSON exportado de Alchemy RPG y revisá antes de crear.`;
    try { usuario = await esperarUsuario(); } catch (e) { usuario = null; }
    if (!usuario) { location.href = 'index.html'; return; }
    db = firebase.database();
    try {
      const sis = (await db.ref(`lista_campanas/${CAMPANA}/sistema`).once('value')).val();
      if (sis && sis !== 'dnd') return avisoGlobal(`Esta campaña usa otro sistema de juego (<strong>${esc(sis === 'coc' ? 'Call of Cthulhu' : sis)}</strong>), así que no se pueden importar personajes de D&amp;D acá. <a href="index.html">Volver al menú</a>.`);
    } catch (e) { /* el intento de escritura dirá si hay permiso */ }
    try { await cargarScript('clases-custom.js'); if (window.ClasesCustom) await ClasesCustom.cargar(db, CAMPANA); } catch (e) { console.warn('Clases custom no disponibles:', e); }

    $('cargando').hidden = true; $('cuerpo').hidden = false;
    $('archivo').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024) { estadoArchivo('El archivo pesa demasiado para ser una ficha (más de 2 MB).'); return; }
      const txt = await file.text(); $('texto-json').value = txt; estadoArchivo(file.name); analizar(txt);
    });
    $('btn-analizar').addEventListener('click', () => { const t = $('texto-json').value.trim(); if (!t) { estadoArchivo('Elegí un archivo o pegá el JSON.'); return; } analizar(t); });
    const rev = $('revision');
    rev.addEventListener('input', onInput); rev.addEventListener('change', onChange); rev.addEventListener('click', (e) => { onClick(e); if (e.target.closest('#btn-crear')) crear(); });
    document.title = 'Importar personaje — ' + CAMPANA;
  }
  arrancar().catch((e) => avisoGlobal('Algo falló al iniciar el importador: ' + esc(e && e.message ? e.message : e)));
})();

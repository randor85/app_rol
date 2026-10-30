/*
 * ficha-coc-shell.js — carcasa de la ficha de Call of Cthulhu: ficha-coc.html?pj=<id>[&campana=<código>]
 *
 * Igual que la carcasa de D&D (ficha-shell.js): una sola página para todos los investigadores. Lo que cambia entre ellos es un archivo de datos
 * (personajes-coc/<id>.js → window.PERSONAJES_COC[id]) o, para los que se crean en la app, una definición guardada en
 *   campanas/<campaña>/personajes/<id>/definicion        (o usuarios/<uid>/personajes/<id>/definicion sin campaña)
 * con la misma forma (solo datos; ver la cabecera de ficha-coc-plantilla.js).
 *
 * Orden de arranque: lee ?pj y carga los datos → arma FICHA_CONFIG para ficha-common.js → dibuja la ficha → carga el motor común, los dados y el
 * grupo → con la sesión iniciada comprueba que seas integrante y que la campaña sea de Call of Cthulhu, conecta Firebase y arranca FichaCoC.
 *
 * Datos antiguos: un personaje de la ficha anterior (nevada_jones.html) guardó sus habilidades como skill-val-<n> y sus armas como arma-<n>-*.
 * Si el personaje declara `legado:{ habilidades:true, armas:true }` y todavía no hay habilidades-json / armas-json, esos valores se leen una sola
 * vez para sembrar las listas nuevas; las claves antiguas no se borran.
 */
(function () {
  'use strict';

  const VERSION_APP = '104.0';
  const params = new URLSearchParams(location.search);
  const pj = (params.get('pj') || '').replace(/[^a-z0-9_]/gi, '');
  const codigoCampana = params.get('campana');
  const raiz = () => document.getElementById('ficha-raiz');
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FIREBASE = {
    apiKey: 'AIzaSyBaCAA748xac6HcrQnY-p1jHRp8_CtgtbU', authDomain: 'personajes-rol.firebaseapp.com',
    databaseURL: 'https://personajes-rol-default-rtdb.firebaseio.com', projectId: 'personajes-rol',
    storageBucket: 'personajes-rol.appspot.com', messagingSenderId: '81108671440', appId: '1:81108671440:web:effb710af86054f4c6f7d5',
  };
  let P = null;

  function mensaje(html) { const r = raiz(); if (r) r.innerHTML = `<div class="aviso aviso-mal" role="alert" style="margin:var(--sp-4)"><span>${html}</span></div>`; }
  function cargarScript(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = src + (/^https?:/.test(src) || src.indexOf('?') >= 0 ? '' : '?v=' + VERSION_APP); s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }
  function toast(msg) {
    const z = $('toast-zona'); if (!z) return;
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    z.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  const aLista = (v) => (Array.isArray(v) ? v.filter((x) => x != null) : (v && typeof v === 'object' ? Object.keys(v).map((k) => v[k]) : []));

  // Una definición dinámica la escribe una persona: nada de lo que trae se interpreta como código y los textos se escapan al dibujar.
  function normalizarDefinicion(D, id) {
    const d = Object.assign({}, D, { id, sistema: 'coc' });
    ['habilidades', 'armas', 'capacidades', 'infoExtra'].forEach((k) => { d[k] = aLista(d[k]); });
    d.info = Object.assign({}, d.info || {});
    d.caracteristicas = Object.assign({}, d.caracteristicas || {});
    d.trasfondo = Object.assign({}, d.trasfondo || {});
    d.infoExtra = d.infoExtra.filter((x) => x && /^[a-zA-Z0-9_-]{1,40}$/.test(String(x.id || '')) && String(x.etiqueta || '').trim());
    delete d.notasHtml;   // solo los archivos del repositorio pueden traer HTML propio
    return d;
  }
  async function esperarUsuario() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE);
    if (window.FichaSesion) return FichaSesion.esperarUsuario();
    return new Promise((ok) => { let hecho = false, off = null; off = firebase.auth().onAuthStateChanged((u) => { if (hecho) return; hecho = true; ok(u); if (typeof off === 'function') off(); }); });
  }
  async function cargarDefinicionDinamica() {
    const user = await esperarUsuario();
    if (!user) { location.href = 'index.html'; return null; }
    const db = firebase.database();
    const ruta = codigoCampana ? `campanas/${codigoCampana}/personajes/${pj}/definicion` : `usuarios/${user.uid}/personajes/${pj}/definicion`;
    const D = (await db.ref(ruta).once('value')).val();
    return D ? normalizarDefinicion(D, pj) : null;
  }

  // Datos de la ficha antigua → semillas de las listas nuevas (solo si las listas todavía no existen en Firebase).
  function aplicarLegado(datos) {
    const L = P.legado || {};
    if (L.habilidades && datos['habilidades-json'] === undefined) {
      (P.habilidades || []).forEach((h, i) => { const v = parseInt(datos['skill-val-' + i], 10); if (!isNaN(v)) h.val = v; });
    }
    if (L.armas && datos['armas-json'] === undefined && Object.keys(datos).some((k) => /^arma-\d+-/.test(k))) {
      const armas = [];
      for (let n = 1; n <= 12; n++) {
        const nombre = datos[`arma-${n}-nombre`]; if (nombre === undefined && n > (P.armas || []).length) continue;
        const base = (P.armas || [])[n - 1] || {};
        const hab = datos[`arma-${n}-habilidad`] != null ? String(datos[`arma-${n}-habilidad`]) : (base.habilidadTexto || '');
        const dano = datos[`arma-${n}-dano`] != null ? String(datos[`arma-${n}-dano`]) : (base.dano || '');
        const notas = datos[`arma-${n}-notas`] != null ? String(datos[`arma-${n}-notas`]) : (base.notas || '');
        const m = hab.match(/\d+/);
        armas.push(Object.assign({}, base, { nombre: nombre != null ? String(nombre) : (base.nombre || ''), habilidad: '', habilidadTexto: hab, objetivo: m ? parseInt(m[0], 10) : 50, dano, alcance: datos[`arma-${n}-alcance`] != null ? String(datos[`arma-${n}-alcance`]) : (base.alcance || ''), notas }));
      }
      if (armas.length) P.armas = armas;
    }
  }

  function armarConfig() {
    window.FICHA_CONFIG = {
      personajeId: P.id, nombrePersonaje: P.nombre, sistemaPropio: 'coc', wrapperSelector: '.ficha',
      mostrarTirada: (total, etiqueta, detalle) => window.FichaDados.mostrar(total, etiqueta, detalle),
      slotsIds: [], hechizosIniciales: [], inventarioInicial: [], reputacionInicial: [], buffsIniciales: [],
    };
  }

  async function arrancarMotores(user) {
    const db = firebase.database();
    let charRef;
    if (codigoCampana) {
      let esIntegrante = false;
      try { esIntegrante = (await db.ref(`campanas/${codigoCampana}/miembros/${user.uid}`).once('value')).exists(); } catch (e) { esIntegrante = false; }
      if (!esIntegrante) return mensaje(`No eres integrante de la campaña «${esc(codigoCampana)}». Vuelve al menú y únete con una invitación o con su ID.`);
      const sis = (await db.ref(`lista_campanas/${codigoCampana}/sistema`).once('value')).val();
      if (sis && sis !== 'coc') { FichaComun.bloquearPorSistemaIncorrecto(sis, codigoCampana); return; }
      charRef = db.ref(`campanas/${codigoCampana}/personajes/${P.id}`);
    } else charRef = db.ref(`usuarios/${user.uid}/personajes/${P.id}`);
    FichaComun.setCharRef(charRef);

    // Datos antiguos (una sola lectura) para sembrar las listas nuevas
    if (P.legado) { try { aplicarLegado((await charRef.child('datos').once('value')).val() || {}); } catch (e) { /* sin datos antiguos */ } }

    FichaDados.iniciar({ personaje: P.nombre, db, codigoCampana, publicarUsos: true, sinVentaja: true });
    FichaCoC.iniciar({ P, db, charRef, codigoCampana, uid: user.uid, user, toast });
    FichaComun.sincronizarDatosDesdeNube();
    FichaComun.iniciarBitacora({ db, codigoCampana });
    FichaComun.iniciarPermisosYCompartir({ db, codigoCampana, uid: user.uid });
    FichaCoC.pintarDerivados();
    window.__fichaLista = true;
    document.dispatchEvent(new CustomEvent('ficha:lista'));
  }

  async function arrancar() {
    if (!pj) return mensaje('Falta el personaje en la dirección: usa <code>ficha-coc.html?pj=&lt;id&gt;</code>.');
    if (/^pc_/.test(pj)) {
      try { P = await cargarDefinicionDinamica(); } catch (e) { return mensaje('No se pudo leer el personaje: ' + esc(e && e.message ? e.message : e)); }
      if (!P) return mensaje(`No existe el personaje “${esc(pj)}” en esta campaña.`);
    } else {
      try { await cargarScript(`personajes-coc/${pj}.js`); } catch (e) { return mensaje(`No existe el personaje “${esc(pj)}”.`); }
      P = (window.PERSONAJES_COC || {})[pj];
      if (!P) return mensaje(`El archivo de “${esc(pj)}” no define el personaje.`);
    }
    document.title = P.nombre + ' — Ficha';
    armarConfig();
    raiz().innerHTML = FichaCoCPlantilla.ficha(P, { codigoCampana });
    if (window.FichaPaleta) FichaPaleta.iniciar({ contenedorId: 'selector-paleta', porDefecto: P.paleta || 'ascua', clave: P.id });
    for (const s of ['ficha-common.js', 'ficha-dados.js', 'ficha-party.js', 'ficha-coc.js']) await cargarScript(s);
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE);
    const iniciarConUsuario = (user) => arrancarMotores(user).catch((e) => { console.error(e); mensaje('Ocurrió un error al iniciar la ficha: ' + esc(e && e.message ? e.message : e)); });
    if (window.FichaSesion) FichaSesion.alUsuario(iniciarConUsuario, () => { location.href = 'index.html'; });
    else firebase.auth().onAuthStateChanged((user) => { if (!user) { location.href = 'index.html'; return; } iniciarConUsuario(user); });
  }

  window.FichaCoCShell = { arrancar, toast, get personaje() { return P; } };
  arrancar();
})();

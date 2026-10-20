/*
 * crear-investigador.js — asistente de la página crear-investigador.html: arma el formulario del generador (ficha-coc-generador.js)
 * y crea el investigador en campanas/<campaña>/personajes/pc_*. Abre desde una campaña: crear-investigador.html?campana=<código>.
 */
(function () {
  'use strict';
  const FIREBASE = {
    apiKey: 'AIzaSyBaCAA748xac6HcrQnY-p1jHRp8_CtgtbU', authDomain: 'personajes-rol.firebaseapp.com',
    databaseURL: 'https://personajes-rol-default-rtdb.firebaseio.com', projectId: 'personajes-rol',
    storageBucket: 'personajes-rol.appspot.com', messagingSenderId: '81108671440', appId: '1:81108671440:web:effb710af86054f4c6f7d5',
  };
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const entero = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
  const R = window.FichaCoCReglas, G = window.FichaCoCGenerador;
  const CAMPANA = (new URLSearchParams(location.search).get('campana') || '').trim();
  const TRASFONDO = window.FichaCoCPlantilla ? FichaCoCPlantilla.TRASFONDO : [['ideologia', 'Ideología y creencias'], ['personas', 'Personas importantes'], ['lugar', 'Lugares significativos'], ['pertenencia', 'Pertenencias preciadas'], ['rasgos', 'Rasgos y manías'], ['heridas', 'Heridas y cicatrices'], ['fobias', 'Fobias y filias'], ['tomos', 'Tomos arcanos, hechizos y encuentros']];
  let db = null, usuario = null;
  const E = { car: { str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 50, pow: 50, edu: 50 }, suerte: 50, hab: [], armas: {}, creando: false };

  function avisoGlobal(html) { const a = $('aviso-global'); a.className = 'aviso aviso-mal'; a.innerHTML = html; a.hidden = false; $('cargando').hidden = true; }
  async function esperarUsuario() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE);
    if (window.FichaSesion) return FichaSesion.esperarUsuario();
    return new Promise((ok) => { let hecho = false, off = null; off = firebase.auth().onAuthStateChanged((u) => { if (hecho) return; hecho = true; ok(u); if (typeof off === 'function') off(); }); });
  }

  /* ---------- características ---------- */
  function pintarCar() {
    $('grid-car').innerHTML = G.CARAC.map((k) => `<div class="car-caja"><label for="car-${k}"><strong>${k.toUpperCase()}</strong> <small>${esc(G.NOMBRE_CARAC[k])}</small></label>
      <input type="number" id="car-${k}" min="1" max="99" value="${E.car[k]}"><small id="car-${k}-m">${R.mitad(E.car[k])} / ${R.quinto(E.car[k])}</small></div>`).join('')
      + `<div class="car-caja"><label for="car-suerte"><strong>SUERTE</strong> <small>Luck</small></label><input type="number" id="car-suerte" min="1" max="99" value="${E.suerte}"><small>3D6 × 5</small></div>`;
  }
  function leerCar() { G.CARAC.forEach((k) => { E.car[k] = entero(($('car-' + k) || {}).value, 0); }); E.suerte = entero(($('car-suerte') || {}).value, 0); }
  function pintarDerivados() {
    const d = R.derivadas(E.car, { edad: $('c-edad').value, mitos: 0 });
    $('derivados').innerHTML = [`❤️ PV ${d.pvMax}`, `✨ PM ${d.pmMax}`, `🧠 Cordura ${d.sanInicial}`, `🏃 MOV ${d.mov}`, `💥 Bono de daño ${d.bonoDano}`, `🛡️ Corpulencia ${d.corpulencia}`].map((t) => `<span class="punto">${t}</span>`).join('');
    G.CARAC.forEach((k) => { const m = $('car-' + k + '-m'); if (m) m.textContent = `${R.mitad(E.car[k])} / ${R.quinto(E.car[k])}`; });
    const b = R.bandaDeEdad($('c-edad').value), info = $('edad-info');
    if (!b) { info.hidden = false; info.textContent = 'Edad fuera de rango (15–89).'; return; }
    info.hidden = false;
    info.innerHTML = `<strong>Edad ${b.desde}–${b.hasta}:</strong> ${b.mejorasEdu ? `${b.mejorasEdu} mejora(s) de EDU. ` : ''}${b.reparto ? `Reduce ${b.reparto} puntos repartidos entre ${esc(b.repartoEn)} (a mano). ` : ''}${b.app ? `APP ${b.app}. ` : ''}${b.edu ? `EDU ${b.edu}. ` : ''}${b.mov ? `MOV ${b.mov}. ` : ''}${b.suerteDoble ? 'Tira la Suerte dos veces y quédate con la mejor. ' : ''}<span class="texto-suave">Revisa estas cifras con tu manual.</span>`;
  }
  function tirarTodas() {
    const t = R.tirarCaracteristicas(); G.CARAC.forEach((k) => { E.car[k] = t[k]; });
    E.suerte = t.suerte; if (R.bandaDeEdad($('c-edad').value) && R.bandaDeEdad($('c-edad').value).suerteDoble) E.suerte = Math.max(E.suerte, R.tirarCaracteristicas().suerte);
    pintarCar(); recalcular();
  }
  function ajustesEdad() { leerCar(); const b = R.bandaDeEdad($('c-edad').value); if (!b) return; E.car.app = Math.max(1, E.car.app + (b.app || 0)); E.car.edu = Math.max(1, E.car.edu + (b.edu || 0)); pintarCar(); recalcular(); }
  function mejorasEdu() {
    leerCar(); const b = R.bandaDeEdad($('c-edad').value); if (!b || !b.mejorasEdu) return;
    for (let i = 0; i < b.mejorasEdu; i++) { const m = R.mejoraHabilidad(E.car.edu); if (m.mejoro) E.car.edu = Math.min(99, m.nuevo); }
    pintarCar(); recalcular();
  }

  /* ---------- habilidades ---------- */
  function iniciarHab() {
    E.hab = COC_HABILIDADES.map((h) => ({ id: h.id, nombre: h.es, en: h.en, baseDef: h.base, ocup: 0, interes: 0, propia: false }));
    const f = $('c-formula'); f.innerHTML = COC_PUNTOS_OCUPACION.map((x) => `<option value="${x.id}">${x.texto}</option>`).join('');
  }
  const baseDe = (h) => (h.baseDef !== undefined ? R.valorBase(h.baseDef, E.car) : entero(h.base, 1));
  function pintarHab() {
    const q = String($('c-buscar').value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    $('tbody-hab').innerHTML = E.hab.map((h, i) => {
      const nom = (h.nombre + ' ' + (h.en || '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (q && nom.indexOf(q) < 0) return '';
      const base = baseDe(h), tot = Math.min(99, base + h.ocup + h.interes);
      return `<tr class="${h.ocup || h.interes ? 'con-puntos' : ''}" data-i="${i}"><td class="nom">${esc(h.nombre)}${h.en ? ` <small>(${esc(h.en)})</small>` : ''}</td><td>${base}</td>
        <td><input type="number" min="0" max="99" value="${h.ocup || ''}" data-hab-ocup="${i}" aria-label="Puntos de ocupación en ${esc(h.nombre)}"></td>
        <td><input type="number" min="0" max="99" value="${h.interes || ''}" data-hab-int="${i}" aria-label="Puntos de interés en ${esc(h.nombre)}"></td><td class="total" id="hab-tot-${i}">${tot}</td></tr>`;
    }).join('');
    pintarPuntos();
  }
  function pintarPuntos() {
    const form = { caracteristicas: E.car, formulaOcupacion: $('c-formula').value };
    const pool = { ocup: R.puntosOcupacion(form.formulaOcupacion, E.car), interes: R.puntosInteres(E.car) };
    const g = G.puntosGastados({ habilidades: E.hab });
    const c = (txt, gastado, total) => `<span class="punto ${gastado > total ? 'mal' : gastado === total ? 'bien' : ''}">${txt}: ${gastado} / ${total} (quedan ${total - gastado})</span>`;
    $('puntos').innerHTML = c('Ocupación', g.ocup, pool.ocup) + c('Interés personal', g.interes, pool.interes);
  }
  function recalcular() { leerCar(); pintarDerivados(); pintarHab(); }

  /* ---------- armas y trasfondo ---------- */
  function pintarArmas() {
    $('lista-armas').innerHTML = COC_ARMAS.map((a, i) => `<label class="op"><input type="checkbox" data-arma="${i}"> <span><strong>${esc(a.nombre)}</strong><br><small class="texto-suave">${esc(a.dano)} · ${esc(a.alcance)}</small></span></label>`).join('');
    $('trasfondo-campos').innerHTML = TRASFONDO.map(([k, et]) => `<label class="campo"><span>${esc(et)}</span><textarea id="t-${k}" rows="2"></textarea></label>`).join('');
  }

  /* ---------- crear ---------- */
  function construirForm() {
    leerCar();
    // Se guardan todas las habilidades con su valor (las del manual con su base, aunque no tengan puntos)
    const t = {}; TRASFONDO.forEach(([k]) => { t[k] = ($('t-' + k) || {}).value || ''; });
    return {
      nombre: $('c-nombre').value, jugador: $('c-jugador').value, ocupacion: $('c-ocupacion').value, edad: $('c-edad').value, residencia: $('c-residencia').value, nacimiento: $('c-nacimiento').value, genero: $('c-genero').value, descripcion: $('c-descripcion').value,
      caracteristicas: E.car, suerte: E.suerte, formulaOcupacion: $('c-formula').value, habilidades: E.hab.map((h) => ({ id: h.id, nombre: h.nombre, en: h.en, base: baseDe(h), ocup: h.ocup, interes: h.interes })),
      armas: Object.keys(E.armas).filter((i) => E.armas[i]).map((i) => parseInt(i, 10)), trasfondo: t, equipamiento: $('c-equipo').value, finanzas: $('c-finanzas').value, paleta: (window.FichaPaleta && FichaPaleta.actual && FichaPaleta.actual()) || 'ascua',
    };
  }
  function mostrarErrores(lista) { const e = $('errores'); if (!lista.length) { e.hidden = true; return; } e.hidden = false; e.innerHTML = '<ul>' + lista.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>'; e.focus(); }
  async function crear() {
    if (E.creando) return;
    const form = construirForm();
    const errores = G.validar(form); if (errores.length) return mostrarErrores(errores);
    mostrarErrores([]); E.creando = true; $('b-crear').disabled = true;
    const est = $('estado'); est.hidden = false; est.className = 'aviso'; est.textContent = 'Creando tu investigador…';
    try {
      let creado = null;
      for (let intento = 0; intento < 4 && !creado; intento++) {
        const r = G.generar(form);
        const nodo = Object.assign({}, r.nodo, { owner: usuario.uid, ownerNombre: (form.jugador || '').slice(0, 60) || null, activo: true, publico: false });
        const res = await db.ref(`campanas/${CAMPANA}/personajes/${r.id}`).transaction((cur) => (cur === null || cur === undefined ? nodo : undefined));
        if (res && res.committed) creado = { id: r.id, resumen: r.resumen };
      }
      if (!creado) throw new Error('No se pudo reservar un identificador libre. Prueba de nuevo.');
      const url = `ficha-coc.html?pj=${encodeURIComponent(creado.id)}&campana=${encodeURIComponent(CAMPANA)}`;
      $('cuerpo').innerHTML = `<div class="exito"><h2>¡Investigador creado!</h2><p><strong>${esc(form.nombre.trim())}</strong> — ${esc(creado.resumen.ocupacion)} · ${creado.resumen.pv} PV · ${creado.resumen.pm} PM · Cordura ${creado.resumen.san}</p><p class="texto-suave">Quedó guardado en la campaña <strong>${esc(CAMPANA)}</strong> a tu nombre.</p><div class="fila"><a class="btn btn-primario" id="abrir-ficha" href="${esc(url)}">📜 Abrir ficha</a><a class="btn btn-fantasma" href="index.html">Volver al menú</a></div></div>`;
    } catch (err) {
      E.creando = false; $('b-crear').disabled = false;
      const msg = String((err && (err.code || err.message)) || err);
      est.className = 'aviso aviso-mal'; est.innerHTML = /permission|denied/i.test(msg) ? '<strong>No tienes permiso para crear personajes en esta campaña.</strong> Tienes que ser integrante.' : '<strong>No se pudo crear.</strong> ' + esc(msg);
    }
  }

  async function arrancar() {
    if (!R || !G || typeof COC_HABILIDADES === 'undefined') return avisoGlobal('No se pudieron cargar los datos del asistente. Recarga la página.');
    if (!CAMPANA || /[.#$\[\]\/]/.test(CAMPANA)) return avisoGlobal('<strong>Abre esta página desde una campaña.</strong> Falta el código en la dirección (<code>crear-investigador.html?campana=&lt;código&gt;</code>). Entra desde el <a href="index.html">menú principal</a>.');
    $('sub-campana').textContent = `Campaña ${CAMPANA} · asistente para armar tu ficha de Call of Cthulhu.`;
    try { usuario = await esperarUsuario(); } catch (e) { usuario = null; }
    if (!usuario) { location.href = 'index.html'; return; }
    db = firebase.database();
    try {
      const sis = (await db.ref(`lista_campanas/${CAMPANA}/sistema`).once('value')).val();
      if (sis && sis !== 'coc') return avisoGlobal(`Esta campaña usa otro sistema (<strong>${esc(sis === 'dnd' ? 'D&D' : sis)}</strong>); este asistente es de Call of Cthulhu. Vuelve al <a href="index.html">menú</a>.`);
    } catch (e) { /* el intento de escritura dirá si hay permiso */ }
    try { const n = (await db.ref(`usuarios/${usuario.uid}/perfil/nombre`).once('value')).val(); if (n) $('c-jugador').value = n; } catch (e) { /* opcional */ }
    iniciarHab(); pintarCar(); pintarArmas(); recalcular();
    $('cargando').hidden = true; $('cuerpo').hidden = false;
    $('grid-car').addEventListener('input', recalcular);
    $('c-edad').addEventListener('input', () => { pintarDerivados(); });
    $('c-formula').addEventListener('change', pintarPuntos);
    $('c-buscar').addEventListener('input', pintarHab);
    $('b-tirar').addEventListener('click', tirarTodas);
    $('b-edad-ajustes').addEventListener('click', ajustesEdad);
    $('b-edad-mejoras').addEventListener('click', mejorasEdu);
    $('b-crear').addEventListener('click', crear);
    $('b-nueva').addEventListener('click', () => { const n = $('c-nueva').value.trim(); if (!n) return; E.hab.push({ id: 'x_' + n.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24) + '_' + E.hab.length, nombre: n, en: '', baseDef: 1, ocup: 0, interes: 0, propia: true }); $('c-nueva').value = ''; $('c-buscar').value = n; pintarHab(); });
    $('tbody-hab').addEventListener('input', (e) => {
      const t = e.target, i = t.dataset.habOcup !== undefined ? parseInt(t.dataset.habOcup, 10) : t.dataset.habInt !== undefined ? parseInt(t.dataset.habInt, 10) : null;
      if (i === null) return;
      if (t.dataset.habOcup !== undefined) E.hab[i].ocup = Math.max(0, entero(t.value, 0)); else E.hab[i].interes = Math.max(0, entero(t.value, 0));
      const tot = $('hab-tot-' + i); if (tot) tot.textContent = Math.min(99, baseDe(E.hab[i]) + E.hab[i].ocup + E.hab[i].interes);
      pintarPuntos();
    });
    $('lista-armas').addEventListener('change', (e) => { if (e.target.dataset.arma !== undefined) E.armas[e.target.dataset.arma] = e.target.checked; });
    document.title = 'Crear investigador — ' + CAMPANA;
  }
  arrancar().catch((e) => avisoGlobal('Algo falló al iniciar el asistente: ' + esc(e && e.message ? e.message : e)));
})();

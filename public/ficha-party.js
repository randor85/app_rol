/*
 * ficha-party.js — resumen público del personaje + visor pequeño del grupo.
 *
 * Dos mitades en un solo módulo:
 *
 *  1) PUBLICAR (cada ficha, solo el dueño o el GM):
 *     escribe un nodo chico en  campanas/<campaña>/party/<personajeId>  con lo que el grupo necesita ver:
 *       { nombre, clase, nivel, hp, hpMax, hpTemp, ca, iniciativa, velocidad, pasiva, concentracion, condiciones:[ids], agotamiento, actualizado }
 *     Lo calcula leyendo la propia ficha (hp-cur, hpMaxActual()/hp-max, hp-temp-input|hp-temp, ac-total,
 *     concentracion-actual, y los estados de FichaReglas). Revisa cada 2 s y ante cambios, y solo escribe si algo cambió.
 *     Cualquiera de estos lectores se puede reemplazar con iniciarPublicador({ leer: () => ({...}) }).
 *
 *  2) VER (cualquier ficha o party.html): suscripción a campanas/<campaña>/party y panel pequeño con una
 *     tarjeta por personaje: barra de PG, CA, concentración y condiciones.
 *
 * Ninguna ficha entera se descarga para mostrar el grupo: el visor lee únicamente el nodo `party`.
 * Estilos: ficha-party.css (solo tokens; si la página no trae ficha-tema.css, usa el puente de variables de la ficha).
 */
(function () {
  'use strict';

  const estado = { db: null, codigoCampana: null, personajeId: null, nombre: '', leer: null, ultimo: '', timer: null, ui: {}, datos: {}, desuscribir: null, iniciadoVisor: false };

  const num = (v, def) => { const n = parseInt(v, 10); return isNaN(n) ? def : n; };
  const txt = (id) => { const e = document.getElementById(id); return e ? (e.value !== undefined && e.tagName !== 'DIV' && e.tagName !== 'SPAN' ? e.value : e.textContent) : ''; };
  function el(tag, cls, texto) { const e = document.createElement(tag); if (cls) e.className = cls; if (texto !== undefined) e.textContent = texto; return e; }

  /* ---------- PUBLICAR ---------- */
  // "Ranger 5 / Rogue 4": niveles iniciales de CONFIG_NIVEL.clases + subidas registradas en `subidas-nivel-registro`.
  function clasesDeLaFicha() {
    const cn = (typeof CONFIG_NIVEL !== 'undefined' && CONFIG_NIVEL) ? CONFIG_NIVEL.clases : null;
    if (!cn || !cn.length) return '';
    let reg = [];
    try { const a = JSON.parse((document.getElementById('subidas-nivel-registro') || {}).value || '[]'); if (Array.isArray(a)) reg = a; } catch (e) { /* sin registro */ }
    return cn.map(c => ({ nombre: c.nombre, nivel: (c.nivelInicial || 0) + reg.filter(r => r.clase === c.nombre).length })).filter(c => c.nivel > 0).map(c => c.nombre + ' ' + c.nivel).join(' / ');
  }

  function leerDeLaFicha() {
    const cfg = (typeof FICHA_CONFIG !== 'undefined') ? FICHA_CONFIG : {};
    const sub = document.querySelector('.char-sub');
    const clase = cfg.resumenClase || clasesDeLaFicha() || (sub ? sub.textContent.split('|')[0].trim() : '');
    const hpMax = (typeof hpMaxActual === 'function') ? hpMaxActual() : num(txt('hp-max'), 0);
    const st = (window.FichaReglas ? FichaReglas.estados() : { condiciones: [], agotamiento: 0 });
    return {
      nombre: cfg.nombrePersonaje || estado.nombre,
      clase,
      nivel: (window.FichaAtributos && FichaAtributos.nivel) ? FichaAtributos.nivel() : null,
      hp: num(txt('hp-cur'), 0),
      hpMax,
      hpTemp: num(txt('hp-temp-input') || txt('hp-temp'), 0),
      ca: num(txt('ac-total'), 0),
      iniciativa: num((((document.getElementById('iniciativa-total') || {}).textContent) || '').replace(/[^0-9+\-]/g, ''), null),
      velocidad: num(txt('velocidad-total'), null),
      pasiva: num(txt('percepcion-pasiva'), null),
      concentracion: (txt('concentracion-actual') || '').trim(),
      condiciones: st.condiciones,
      agotamiento: st.agotamiento,
    };
  }

  function soloLectura() {
    return !!document.querySelector('.readonly-mode');
  }

  function revisar() {
    if (!estado.db || !estado.codigoCampana || !estado.personajeId) return;
    if (soloLectura()) return;
    let r;
    try { r = (estado.leer || leerDeLaFicha)(); } catch (e) { return; }
    if (!r || !r.nombre) return;
    const clave = JSON.stringify(r);
    if (clave === estado.ultimo) return;
    estado.ultimo = clave;
    try {
      const p = estado.db.ref(`campanas/${estado.codigoCampana}/party/${estado.personajeId}`)
        .set(Object.assign({}, r, { actualizado: firebase.database.ServerValue.TIMESTAMP }));
      if (p && p.catch) p.catch(() => { estado.ultimo = ''; });   // sin permiso (o sin reglas desplegadas): se reintenta
    } catch (e) { estado.ultimo = ''; }
  }

  function iniciarPublicador(o) {
    estado.db = o.db; estado.codigoCampana = o.codigoCampana; estado.personajeId = o.personajeId;
    estado.nombre = o.nombre || ''; estado.leer = o.leer || null;
    if (estado.timer) clearInterval(estado.timer);
    estado.timer = setInterval(revisar, 2000);
    ['ficha:atributos', 'ficha:buffs', 'ficha:estados', 'ficha:datos-sincronizados'].forEach(ev => document.addEventListener(ev, () => setTimeout(revisar, 400)));
    setTimeout(revisar, 1500);
    return FichaParty;
  }

  /* ---------- VER ---------- */
  function hace(ts) {
    if (!ts) return '';
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return 'ahora';
    if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
    return 'hace ' + Math.round(s / 86400) + ' d';
  }

  function chipsCondiciones(p) {
    const wrap = el('span', 'party-conds');
    (p.condiciones || []).forEach(id => {
      const c = window.FichaReglas ? FichaReglas.condicion(id) : null;
      const chip = el('span', 'party-cond', c ? c.icono + ' ' + c.nombre : id);
      if (c) chip.title = c.resumen;
      wrap.appendChild(chip);
    });
    if (p.agotamiento) {
      const chip = el('span', 'party-cond', '🥱 Agotamiento ' + p.agotamiento);
      const niv = window.FichaReglas ? FichaReglas.datos().agotamiento.find(n => n.nivel === p.agotamiento) : null;
      if (niv) chip.title = niv.texto;
      wrap.appendChild(chip);
    }
    return wrap;
  }

  function tarjeta(id, p) {
    const art = el('article', 'party-card'); art.dataset.id = id;
    if (id === estado.personajeId) art.dataset.yo = 'true';
    const hpMax = Math.max(1, p.hpMax || 1), hp = Math.max(0, p.hp || 0);
    const pct = Math.max(0, Math.min(100, Math.round(hp / hpMax * 100)));
    art.dataset.estado = hp === 0 ? 'caido' : pct <= 25 ? 'critico' : pct <= 50 ? 'herido' : 'sano';

    const cab = el('div', 'party-cab');
    cab.appendChild(el('strong', 'party-nombre', p.nombre || id));
    const sub = [p.clase, p.nivel ? 'nivel ' + p.nivel : ''].filter(Boolean).join(' · ');
    if (sub) cab.appendChild(el('span', 'party-clase', sub));
    art.appendChild(cab);

    const fila = el('div', 'party-fila');
    const barra = el('div', 'party-barra'); barra.setAttribute('role', 'progressbar');
    barra.setAttribute('aria-valuemin', '0'); barra.setAttribute('aria-valuemax', String(hpMax)); barra.setAttribute('aria-valuenow', String(hp));
    barra.setAttribute('aria-label', 'Puntos de golpe de ' + (p.nombre || id));
    const relleno = el('span', 'party-relleno'); relleno.style.width = pct + '%'; barra.appendChild(relleno);
    fila.appendChild(barra);
    fila.appendChild(el('span', 'party-hp', hp + '/' + hpMax + (p.hpTemp ? ' +' + p.hpTemp : '')));
    fila.appendChild(el('span', 'party-ca', '🛡️ ' + (p.ca || '—')));
    art.appendChild(fila);

    const extra = el('div', 'party-extra');
    if (p.concentracion) extra.appendChild(el('span', 'party-conc', '🧠 ' + p.concentracion));
    const chips = chipsCondiciones(p);
    if (chips.childNodes.length) extra.appendChild(chips);
    if (extra.childNodes.length) art.appendChild(extra);

    const t = hace(p.actualizado);
    if (t) art.appendChild(el('small', 'party-hora', t));
    return art;
  }

  function pintar() {
    const u = estado.ui; if (!u.lista) return;
    u.lista.textContent = '';
    const ids = Object.keys(estado.datos).sort((a, b) => String(estado.datos[a].nombre || a).localeCompare(String(estado.datos[b].nombre || b), 'es'));
    if (!ids.length) { u.lista.appendChild(el('p', 'party-vacio', 'Todavía nadie publicó su estado. Cada jugador aparece apenas abre su ficha.')); }
    ids.forEach(id => u.lista.appendChild(tarjeta(id, estado.datos[id])));
    if (u.badge) {
      const caidos = ids.filter(id => (estado.datos[id].hp || 0) === 0).length;
      u.badge.hidden = !caidos; u.badge.textContent = String(caidos);
    }
    if (u.resumenFab) u.resumenFab.textContent = ids.length ? ids.length + ' en el grupo' : 'Grupo';
  }

  function sufijoPuente(raiz) {
    // Si la página no trae ficha-tema.css, los tokens no existen: se activa el puente a las variables de la ficha.
    const v = getComputedStyle(document.documentElement).getPropertyValue('--acento').trim();
    if (!v) raiz.dataset.puente = 'true';
  }

  function suscribir() {
    if (!estado.db || !estado.codigoCampana) return;
    const ref = estado.db.ref(`campanas/${estado.codigoCampana}/party`);
    const cb = ref.on('value', (snap) => { estado.datos = snap.val() || {}; pintar(); }, () => { estado.datos = {}; pintar(); });
    estado.desuscribir = () => ref.off('value', cb);
    setInterval(pintar, 60000);   // refresca los "hace N min"
  }

  /**
   * Monta el visor. opts: { db, codigoCampana, personajeId?, contenedor?: Element (modo página), flotante?: true (default) }
   * Sin contenedor se dibuja un botón flotante (👥) que abre el panel en una esquina.
   */
  function iniciarVisor(o) {
    if (estado.iniciadoVisor) return FichaParty;
    estado.iniciadoVisor = true;
    estado.db = estado.db || o.db; estado.codigoCampana = estado.codigoCampana || o.codigoCampana;
    estado.personajeId = estado.personajeId || o.personajeId || null;
    const u = estado.ui;
    const raiz = el('div', 'party'); raiz.id = 'party-raiz';
    sufijoPuente(raiz);

    const lista = el('div', 'party-lista'); lista.setAttribute('aria-live', 'polite');
    lista.setAttribute('aria-label', 'Estado del grupo');
    u.lista = lista;

    if (o.contenedor) {
      raiz.dataset.modo = 'pagina';
      raiz.appendChild(lista);
      o.contenedor.appendChild(raiz);
    } else {
      raiz.dataset.modo = 'flotante'; raiz.dataset.abierto = 'false';
      const fab = el('button', 'party-fab'); fab.type = 'button';
      fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'party-panel'); fab.setAttribute('aria-label', 'Abrir el estado del grupo');
      fab.appendChild(el('span', 'party-fab-ico', '👥'));
      const badge = el('span', 'party-fab-badge'); badge.hidden = true; badge.setAttribute('aria-label', 'Personajes caídos'); fab.appendChild(badge);
      const panel = el('section', 'party-panel'); panel.id = 'party-panel'; panel.hidden = true;
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Estado del grupo');
      const cab = el('div', 'party-panel-cab');
      u.resumenFab = el('h3', null, 'Grupo'); cab.appendChild(u.resumenFab);
      const x = el('button', 'party-cerrar', '✖'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar el estado del grupo'); cab.appendChild(x);
      panel.append(cab, lista);
      const abrir = () => { raiz.dataset.abierto = 'true'; panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); };
      const cerrar = () => { raiz.dataset.abierto = 'false'; panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); try { fab.focus(); } catch (e) { /* noop */ } };
      fab.addEventListener('click', () => (raiz.dataset.abierto === 'true' ? cerrar() : abrir()));
      x.addEventListener('click', cerrar);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && raiz.dataset.abierto === 'true') { e.preventDefault(); cerrar(); } });
      raiz.append(fab, panel);
      document.body.appendChild(raiz);
      u.badge = badge;
    }
    pintar();
    suscribir();
    return FichaParty;
  }

  /**
   * Avisos del grupo: cuando otro personaje enciende un buff con "avisar al grupo" (ficha-common.js), llega como una
   * entrada "🔔 …" en campanas/<c>/tiradas y acá se muestra como notificación. Es solo un aviso: no cambia esta ficha.
   */
  function escucharAvisos(o) {
    if (!o.db || !o.codigoCampana || !window.FichaDados || !FichaDados.notificar) return;
    const propio = ((typeof FICHA_CONFIG !== 'undefined' && FICHA_CONFIG.nombrePersonaje) || o.nombre || '').trim();
    let ultima = null, primera = true;
    const base = o.db.ref(`campanas/${o.codigoCampana}/tiradas`);
    if (typeof base.limitToLast !== 'function') return;   // los avisos son un extra: nunca deben romper el resto del grupo
    try {
    base.limitToLast(1).on('value', (snap) => {
      const v = snap.val();
      if (!v) { primera = false; return; }
      const k = Object.keys(v).pop(), e = v[k];
      if (primera) { ultima = k; primera = false; return; }   // lo que ya estaba al abrir no se vuelve a avisar
      if (k === ultima) return;
      ultima = k;
      if (e && typeof e.tipo === 'string' && e.tipo.indexOf('🔔') === 0 && String(e.personaje || '').trim() !== propio) {
        FichaDados.notificar({ etiqueta: `${e.personaje || 'Alguien'}: ${e.tipo.replace(/^🔔\s*/, '')}`, detalle: e.resultado || '' });
      }
    }, () => { /* sin permiso: no hay avisos */ });
    } catch (e) { /* sin avisos */ }
  }

  /** Atajo para una ficha: publica el resumen propio y muestra el visor flotante. */
  function iniciar(o) {
    if (!o || !o.db || !o.codigoCampana) return FichaParty;   // sin campaña no hay grupo
    iniciarPublicador(o);
    iniciarVisor(o);
    escucharAvisos(o);
    return FichaParty;
  }

  window.FichaParty = { iniciar, iniciarPublicador, iniciarVisor, revisar, _leerDeLaFicha: leerDeLaFicha, _tarjeta: tarjeta };
})();

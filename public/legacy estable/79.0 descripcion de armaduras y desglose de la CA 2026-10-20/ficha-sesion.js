/*
 * ficha-sesion.js — espera de la sesión de Firebase con tiempo de gracia + registro de diagnóstico (todas las páginas).
 *
 *   FichaSesion.esperarUsuario({ gracia })   → Promise<user|null>: resuelve en cuanto hay usuario; null solo si pasan `gracia` ms (5 s por
 *                                              defecto) viendo únicamente «sin sesión». Evita expulsar al menú por un «null» pasajero al cargar.
 *   FichaSesion.alUsuario(cb, alPerder, o)   → llama cb(user) UNA vez cuando hay usuario; alPerder() si tras la gracia no hubo ninguno.
 *   FichaSesion.vigilar()                    → registra (una vez por página) el contexto y los cambios de sesión y de token.
 *   FichaSesion.diag(texto)                  → agrega una línea al registro local (localStorage 'rol-auth-diag', últimas 40; se ve en index.html?diag=1).
 *
 * Necesita firebase-app y firebase-auth ya cargados y la app inicializada. Sin dependencias del resto del sitio.
 */
(function (global) {
  'use strict';
  const CLAVE = 'rol-auth-diag', MAX = 40;
  const pagina = () => (location.pathname.split('/').pop() || 'index.html');
  function diag(texto) {
    try {
      const l = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      l.push(new Date().toISOString().slice(0, 19) + ' ' + pagina() + ' ' + texto);
      localStorage.setItem(CLAVE, JSON.stringify(l.slice(-MAX)));
    } catch (e) { /* sin almacenamiento */ }
  }
  const corto = (u) => (u && u.uid ? u.uid.slice(0, 6) : '—');
  let vigilando = false;

  function vigilar() {
    if (vigilando || !global.firebase || !firebase.auth) return; vigilando = true;
    try {
      const nav = navigator, ua = nav.userAgent || '';
      const navegador = /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox/.test(ua) ? 'Firefox' : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'otro';
      const marca = localStorage.getItem('rol-visto');
      try { if (!marca) localStorage.setItem('rol-visto', String(Date.now())); } catch (e) { /* */ }
      const modo = (global.matchMedia && matchMedia('(display-mode: standalone)').matches) ? 'app instalada' : 'pestaña';
      diag(`carga · ${navegador}${/Android/.test(ua) ? ' Android' : /iPhone|iPad/.test(ua) ? ' iOS' : ''} · ${modo} · ${nav.onLine ? 'con red' : 'SIN red'} · ${document.visibilityState} · almacenamiento previo: ${marca ? 'sí' : 'NO (vacío)'}`);
      if (nav.storage && nav.storage.persisted) nav.storage.persisted().then((p) => diag('almacenamiento persistente: ' + (p ? 'sí' : 'no'))).catch(() => {});
      const au = firebase.auth();
      diag('usuario al cargar: ' + (au.currentUser ? 'sí (' + corto(au.currentUser) + ')' : 'aún no'));
      au.onIdTokenChanged((u) => {
        if (!u) { diag('token: sin usuario'); return; }
        u.getIdTokenResult().then((r) => diag('token renovado · vence ' + new Date(r.expirationTime).toISOString().slice(11, 19) + ' · ' + (r.signInProvider || '?'))).catch((e) => diag('token: error ' + (e && e.code)));
      }, (e) => diag('token: error ' + (e && e.code)));
    } catch (e) { /* el diagnóstico nunca debe romper la página */ }
  }

  function observar(alUsuario, alNull, alError) {
    try { return firebase.auth().onAuthStateChanged(alUsuario, alError || ((e) => diag('auth: error ' + (e && e.code)))); }
    catch (e) { alError && alError(e); return null; }
  }

  function esperarUsuario(o) {
    const gracia = (o && o.gracia) != null ? o.gracia : 5000;
    vigilar();
    return new Promise((ok) => {
      let hecho = false, timer = null;
      const fin = (u, motivo) => { if (hecho) return; hecho = true; clearTimeout(timer); diag(motivo); ok(u || null); };
      observar((u) => {
        if (u) return fin(u, 'sesión activa (' + corto(u) + ')');
        diag('sin sesión (espero ' + gracia / 1000 + ' s antes de pedir entrar)');
        if (!timer) timer = setTimeout(() => fin(null, 'sin sesión tras la espera → menú'), gracia);
      });
    });
  }

  function alUsuario(cb, alPerder, o) {
    let llamado = false;
    esperarUsuario(o).then((u) => {
      if (u) { if (!llamado) { llamado = true; cb(u); } } else if (alPerder) alPerder();
    });
  }

  global.FichaSesion = { esperarUsuario, alUsuario, vigilar, diag };
})(window);

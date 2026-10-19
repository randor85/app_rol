/*
 * ficha-paleta.js — selector de paleta de colores para las fichas (reemplaza el modo día/noche).
 *
 * Uso:
 *   <script src="ficha-paleta.js"></script>
 *   FichaPaleta.aplicarGuardada({ porDefecto: 'bosque', clave: 'fiona_faraway' });   // en <head>, sin parpadeo
 *   FichaPaleta.iniciar({ contenedorId: 'selector-paleta', porDefecto: 'bosque', clave: 'fiona_faraway' });
 *
 * - La elección se guarda por dispositivo (localStorage, clave 'ficha-paleta:<clave>'); sin elección guardada
 *   se usa la paleta por defecto del personaje. Si localStorage no está disponible, todo funciona igual
 *   (solo que no se recuerda la elección).
 * - Las muestras de color NO duplican hex: cada muestra lleva su propio data-paleta y toma los colores
 *   de ficha-tema.css. FichaPaleta.PALETAS[i].colores() los devuelve ya resueltos.
 * - Dispara el evento 'ficha:paleta' en document con detail { id }.
 */
(function () {
  'use strict';

  const PALETAS = [
    { id: 'bosque',         nombre: 'Bosque',         personaje: 'fiona_faraway' },
    { id: 'ascua',          nombre: 'Ascua',          personaje: 'eldur' },
    { id: 'marea',          nombre: 'Marea',          personaje: 'hannoghar' },
    { id: 'ceniza',         nombre: 'Ceniza',         personaje: 'myrklogi_mangarisonn' },
    { id: 'amatista',       nombre: 'Amatista',       personaje: 'ulreek' },
    { id: 'turquesa',       nombre: 'Turquesa',       personaje: 'dane' },
    { id: 'obsidiana',      nombre: 'Obsidiana',      personaje: null },
    { id: 'pergamino',      nombre: 'Pergamino (claro)', personaje: null },
    { id: 'alto-contraste', nombre: 'Alto contraste', personaje: null },
  ];
  const IDS = PALETAS.map(p => p.id);

  // Colores de muestra ya resueltos desde el CSS (bg, superficie, acento, acento-2).
  function coloresDe(id) {
    const el = document.createElement('div');
    el.dataset.paleta = id;
    el.style.display = 'none';
    document.body.appendChild(el);
    const cs = getComputedStyle(el);
    const r = { bg: cs.getPropertyValue('--bg').trim(), surface: cs.getPropertyValue('--surface-2').trim(), acento: cs.getPropertyValue('--acento').trim(), acento2: cs.getPropertyValue('--acento-2').trim() };
    el.remove();
    return r;
  }
  PALETAS.forEach(p => { p.colores = () => coloresDe(p.id); });

  const claveAlmacen = (clave) => 'ficha-paleta:' + (clave || 'global');
  function leer(clave) {
    try { const v = localStorage.getItem(claveAlmacen(clave)); return IDS.includes(v) ? v : null; } catch (e) { return null; }
  }
  function guardar(clave, id) {
    try { localStorage.setItem(claveAlmacen(clave), id); } catch (e) { /* sin almacenamiento: no se recuerda */ }
  }

  let actualId = null;
  function aplicar(id) {
    if (!IDS.includes(id)) id = IDS[0];
    actualId = id;
    document.documentElement.dataset.paleta = id;
    document.dispatchEvent(new CustomEvent('ficha:paleta', { detail: { id } }));
    return id;
  }
  function aplicarGuardada(opts) {
    opts = opts || {};
    const id = leer(opts.clave) || (IDS.includes(opts.porDefecto) ? opts.porDefecto : IDS[0]);
    actualId = id;
    document.documentElement.dataset.paleta = id;
    return id;
  }

  // Renderiza el botón "🎨 Paleta" con un menú de muestras (radiogroup accesible).
  function iniciar(opts) {
    opts = opts || {};
    const cont = document.getElementById(opts.contenedorId);
    if (!cont) return null;
    const inicial = aplicarGuardada(opts);
    cont.classList.add('paleta-selector');
    cont.innerHTML =
      '<button type="button" class="btn btn-fantasma paleta-boton" aria-haspopup="true" aria-expanded="false">' +
        '<span class="paleta-muestra-actual muestra" aria-hidden="true"></span><span class="paleta-nombre"></span></button>' +
      '<div class="paleta-menu" role="radiogroup" aria-label="Paleta de colores" hidden></div>';
    const boton = cont.querySelector('.paleta-boton');
    const menu = cont.querySelector('.paleta-menu');
    const nombre = cont.querySelector('.paleta-nombre');
    const muestraActual = cont.querySelector('.paleta-muestra-actual');

    menu.innerHTML = PALETAS.map(p =>
      '<button type="button" class="paleta-opcion" role="radio" aria-checked="false" data-id="' + p.id + '">' +
        '<span class="muestra" data-paleta="' + p.id + '" aria-hidden="true"></span>' +
        '<span>' + p.nombre + (p.id === opts.porDefecto ? ' <small>(tu personaje)</small>' : '') + '</span></button>').join('');

    function refrescar() {
      const p = PALETAS.find(x => x.id === actualId);
      nombre.textContent = p ? p.nombre : '';
      muestraActual.dataset.paleta = actualId;
      menu.querySelectorAll('.paleta-opcion').forEach(b => b.setAttribute('aria-checked', String(b.dataset.id === actualId)));
    }
    function abrir(v) {
      menu.hidden = !v;
      boton.setAttribute('aria-expanded', String(v));
      if (v) { const sel = menu.querySelector('[aria-checked="true"]'); if (sel) sel.focus(); }
    }
    boton.addEventListener('click', () => abrir(menu.hidden));
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('.paleta-opcion');
      if (!b) return;
      aplicar(b.dataset.id); guardar(opts.clave, b.dataset.id); refrescar(); abrir(false); boton.focus();
    });
    document.addEventListener('click', (e) => { if (!cont.contains(e.target)) abrir(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { abrir(false); boton.focus(); } });
    menu.addEventListener('keydown', (e) => {
      const ops = Array.from(menu.querySelectorAll('.paleta-opcion'));
      const i = ops.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); ops[(i + 1) % ops.length].focus(); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); ops[(i - 1 + ops.length) % ops.length].focus(); }
    });
    document.addEventListener('ficha:paleta', refrescar);
    refrescar();
    return inicial;
  }

  window.FichaPaleta = { PALETAS, PERSONAJE_PALETA: Object.fromEntries(PALETAS.filter(p => p.personaje).map(p => [p.personaje, p.id])), aplicar, aplicarGuardada, iniciar, actual: () => actualId };
})();

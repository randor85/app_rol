/*
 * ficha-coc-plantilla.js — HTML de la ficha de Call of Cthulhu, generado desde los datos de un investigador
 * (personajes-coc/<id>.js, o una definición dinámica pc_* con sistema:'coc').
 *
 * Mismos principios que ficha-plantilla.js (D&D): cada valor editable lleva un `id` que es literalmente su clave bajo datos/ en Firebase
 * (los de siempre: str, con, siz, dex, app, int, pow, edu, luck-curr, hp-curr, mp-max, san-curr, info-*, trasfondo-*…), y todo lo que viene de
 * los datos se escapa. Las listas editables (habilidades, armas, capacidades) las dibuja ficha-coc.js desde datos/<clave>-json.
 *
 * Forma de los datos (ver también ficha-coc-shell.js):
 *   { id, nombre, sistema:'coc', paleta, subtitulo,
 *     info:{ jugador, ocupacion, edad, residencia, nacimiento, genero, movimiento, credito, descripcion } + infoExtra:[{id,etiqueta,valor}],
 *     caracteristicas:{ str, con, siz, dex, app, int, pow, edu }, suerte,
 *     pv:{max,actual}, pm:{max,actual}, san:{max,actual,inicial},
 *     habilidades:[{ id, nombre, en?, val, ocup? }], armas:[…], capacidades:[…],
 *     equipamiento, finanzas, trasfondo:{ ideologia, personas, lugar, pertenencia, rasgos, heridas, fobias, tomos }, notas,
 *     descanso:{ pv:'max'|'ninguno'|n, pm:…, san:… } }
 */
(function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CARAC = [['str', 'STR', 'Fuerza'], ['con', 'CON', 'Constitución'], ['siz', 'SIZ', 'Tamaño'], ['dex', 'DEX', 'Destreza'], ['app', 'APP', 'Aspecto'], ['int', 'INT', 'Inteligencia'], ['pow', 'POW', 'Poder'], ['edu', 'EDU', 'Educación']];
  const TRASFONDO = [['ideologia', 'Ideología y creencias'], ['personas', 'Personas importantes'], ['lugar', 'Lugares significativos'], ['pertenencia', 'Pertenencias preciadas'], ['rasgos', 'Rasgos y manías'], ['heridas', 'Heridas y cicatrices'], ['fobias', 'Fobias y filias'], ['tomos', 'Tomos arcanos, hechizos y encuentros']];
  const INFO = [['jugador', 'Jugador'], ['ocupacion', 'Ocupación'], ['edad', 'Edad'], ['residencia', 'Residencia'], ['nacimiento', 'Lugar de nacimiento'], ['genero', 'Género'], ['movimiento', 'Movimiento (MOV)'], ['credito', 'Nivel de crédito']];

  function seccion(id, icono, titulo, cuerpo, opts) {
    const o = opts || {};
    return `<details class="seccion" id="seccion-${esc(id)}"${o.abierta ? ' open' : ''}>
    <summary><span class="seccion-icono" aria-hidden="true">${icono}</span> ${titulo}${o.nota ? ` <span class="seccion-nota">· ${o.nota}</span>` : ''}</summary>
    <div class="seccion-cuerpo">${cuerpo}</div>
  </details>`;
  }

  function cabecera(P, ctx) {
    const volver = ctx.codigoCampana ? `index.html?campana=${encodeURIComponent(ctx.codigoCampana)}` : 'index.html';
    const chips = [(P.info || {}).ocupacion].filter(Boolean).map((c) => `<span class="tag">${esc(c)}</span>`).join('') + (ctx.codigoCampana ? `<span class="tag">Campaña: ${esc(ctx.codigoCampana)}</span>` : '');
    return `<header class="cabecera">
    <div class="cabecera-top">
      <div><h1>${esc(P.nombre)}</h1><div class="subtitulo">${esc(P.subtitulo || 'Call of Cthulhu — ficha de investigador')}</div></div>
      <div class="cabecera-acciones"><div id="selector-paleta"></div><a class="btn btn-fantasma" href="${volver}">← Volver</a></div>
    </div>
    <div class="cabecera-chips">${chips}</div>
  </header>
  <div class="aviso aviso-mal" id="readonly-banner" role="status" style="display:none"><span>👁️ Modo solo lectura: esta ficha es de otra persona.</span></div>`;
  }

  function barraFija(secs) {
    const atajos = secs.map((x) => `<a href="#seccion-${esc(x.id)}" class="atajo" title="${esc(x.titulo)}" aria-label="Ir a ${esc(x.titulo)}">${x.icono}</a>`).join('');
    return `<div class="barra-fija" role="region" aria-label="Resumen rápido">
    <div class="barra-dato"><small>❤️ PV</small><strong id="scb-hp">—</strong></div>
    <div class="barra-dato"><small>🧠 Cordura</small><strong id="scb-san">—</strong></div>
    <div class="barra-dato"><small>🍀 Suerte</small><strong id="scb-luck">—</strong></div>
    <div class="barra-dato"><small>✨ Magia</small><strong id="scb-mp">—</strong></div>
    <span class="barra-sep"></span>
    <button type="button" class="btn btn-fantasma btn-sm" data-coc-descanso title="Restablece PV, PM y Cordura según la regla de la mesa">🌙 Descanso</button>
    <button type="button" class="btn btn-fantasma btn-sm" data-coc-d100 title="Tirada rápida de d100">🎲 d100</button>
    <button type="button" class="btn btn-fantasma btn-sm" id="btn-compartir" style="display:none" title="Compartir esta ficha para que otros jugadores la vean en modo lectura">👁️ Compartir</button>
    <button type="button" class="btn btn-fantasma btn-sm" data-colapsar-todo title="Cierra todas las secciones (o las abre si ya están cerradas)">📁 Colapsar todo</button>
    <nav class="barra-atajos" aria-label="Ir a una sección">${atajos}</nav>
  </div>`;
  }

  /* ---------- investigador ---------- */
  function investigador(P) {
    const info = P.info || {};
    const campos = INFO.map(([k, et]) => `<label class="campo"><span>${esc(et)}</span><input type="text" id="info-${k}" value="${esc(info[k] || '')}"></label>`).join('')
      + (P.infoExtra || []).map((x) => `<label class="campo"><span>${esc(x.etiqueta)}</span><input type="text" id="${esc(x.id)}" value="${esc(x.valor || '')}"></label>`).join('');
    return `<div class="form-grid">${campos}</div>
      <label class="campo"><span>Descripción física</span><input type="text" id="info-descripcion" value="${esc(info.descripcion || '')}"></label>`;
  }

  /* ---------- características y estado ---------- */
  function caracteristicas(P) {
    const c = P.caracteristicas || {};
    const tarjetas = CARAC.map(([k, ab, nom]) => `<div class="coc-carac" id="carac-${k}">
        <label for="${k}">${esc(nom)} <small>(${ab})</small></label>
        <input type="number" id="${k}" value="${esc(c[k] != null ? c[k] : 50)}" min="0" max="999" aria-label="${esc(nom)}">
        <div class="coc-mitades" id="${k}-calc" title="Mitad (difícil) / quinto (extremo)">— / —</div>
        <button type="button" class="btn btn-roll btn-sm" data-coc-tirar="carac" data-id="${k}" aria-label="Tirar ${esc(nom)}">🎲 Tirar</button>
      </div>`).join('');
    const bono = `<div class="coc-carac" id="carac-bono"><label>Bono de daño y corpulencia</label><div class="coc-valor" id="db-val">0</div><div class="coc-mitades" id="build-val">Corpulencia: 0</div><div class="coc-mitades" id="mov-sugerido"></div></div>`;
    const par = (id, et, icono, cur, max, extra) => `<div class="panel coc-vital" id="vital-${id}">
        <h3>${icono} ${et}</h3>
        <div class="contador" role="group" aria-label="${esc(et)}">
          <button type="button" data-coc-delta="${id}-curr" data-delta="-1" aria-label="Restar 1 de ${esc(et)}">−</button>
          <div><input type="number" id="${id}-curr" class="contador-valor" value="${esc(cur)}" min="0" aria-label="${esc(et)} actual"><span class="contador-max"> / <input type="number" id="${id}-max" class="coc-max" value="${esc(max)}" min="0" aria-label="${esc(et)} máximo"></span></div>
          <button type="button" data-coc-delta="${id}-curr" data-delta="1" aria-label="Sumar 1 de ${esc(et)}">+</button>
        </div>
        <div class="progreso gruesa" id="${id}-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Barra de ${esc(et)}"><span style="width:100%"></span></div>
        <small class="texto-suave" id="${id}-sugerido"></small>${extra || ''}
      </div>`;
    const pv = P.pv || {}, pm = P.pm || {}, san = P.san || {};
    const estados = [['herida-grave', '🩸 Herida grave'], ['inconsciente', '😵 Inconsciente'], ['moribundo', '☠️ Moribundo'], ['locura-temporal', '🌀 Locura temporal'], ['locura-indefinida', '🕳️ Locura indefinida']]
      .map(([k, t]) => `<label class="coc-estado"><input type="checkbox" id="st-${k}"> ${t}</label>`).join('');
    return `<div class="coc-caracs">${tarjetas}${bono}</div>
      <div class="vitales coc-vitales">
        ${par('hp', 'Puntos de vida', '❤️', pv.actual != null ? pv.actual : pv.max || 10, pv.max || 10)}
        ${par('mp', 'Puntos de magia', '✨', pm.actual != null ? pm.actual : pm.max || 10, pm.max || 10)}
        ${par('san', 'Cordura', '🧠', san.actual != null ? san.actual : san.max || 50, san.max || 99, `<small class="texto-suave" id="san-info"></small>`)}
        ${par('luck', 'Suerte', '🍀', P.suerte != null ? P.suerte : 50, P.suerteMax != null ? P.suerteMax : (P.suerte != null ? P.suerte : 50), `<div class="coc-mitades" id="luck-calc">— / —</div><button type="button" class="btn btn-roll btn-sm" data-coc-tirar="carac" data-id="luck-curr" aria-label="Tirar Suerte">🎲 Tirar Suerte</button>`)}
      </div>
      <input type="hidden" id="san-inicio-dia" value=""><input type="hidden" id="san-perdida-hoy" value="">
      <div class="coc-herramientas">
        <div class="panel"><h3>💥 Recibir daño</h3>
          <div class="fila"><label class="campo"><span>Puntos de daño</span><input type="number" id="dados-dano" min="0" placeholder="0"></label>
          <button type="button" class="btn btn-peligro btn-sm" data-coc-recibir-dano>💥 Aplicar daño</button>
          <button type="button" class="btn btn-primario btn-sm" data-coc-curar>💚 Curar</button></div>
          <small class="texto-suave">Un golpe de la mitad de tus PV máximos o más es una herida grave.</small></div>
        <div class="panel"><h3>🧠 Chequeo de Cordura</h3>
          <div class="fila"><label class="campo"><span>Pérdida (éxito/fallo)</span><input type="text" id="dados-san-perdida" value="0/1d4" placeholder="1/1d6" aria-label="Pérdida si se supera la tirada y si se falla"></label>
          <button type="button" class="btn btn-roll btn-sm" data-coc-chequeo-san>🎲 Tirar Cordura</button></div>
          <small class="texto-suave">Se resta sola de la Cordura y avisa de las locuras. «Cordura hoy»: <span id="san-hoy">0</span> perdidos.</small></div>
      </div>
      <div class="coc-estados" role="group" aria-label="Estados del investigador">${estados}</div>`;
  }

  /* ---------- habilidades ---------- */
  function habilidades() {
    return `<div class="fila coc-barra-hab">
        <label class="campo coc-buscar"><span>Buscar habilidad</span><input type="search" id="dados-buscar-hab" placeholder="Arqueología, Sigilo…" autocomplete="off"></label>
        <label class="campo"><span>Mostrar</span><select id="dados-filtro-hab"><option value="todas">Todas</option><option value="marcadas">Marcadas para mejorar</option><option value="altas">50 % o más</option></select></label>
        <button type="button" class="btn btn-fantasma btn-sm" data-coc-agregar-hab>➕ Agregar habilidad</button>
        <button type="button" class="btn btn-fantasma btn-sm" data-coc-desarrollo title="Tira la mejora de cada habilidad marcada con ✓ (fin de sesión)">📈 Fase de desarrollo</button>
      </div>
      <p class="texto-suave">Marca con ✓ las habilidades en las que tuviste un éxito en la sesión. El valor se edita directamente.</p>
      <div id="habilidades-lista" class="coc-habilidades"></div>
      <div id="habilidades-form"></div>
      <div id="coc-desarrollo" class="aviso" hidden></div>`;
  }

  /* ---------- combate ---------- */
  function combate() {
    return `<div class="coc-tabla-scroll"><table class="tabla tabla-resp"><thead><tr><th>Arma</th><th>Habilidad</th><th>Daño</th><th>Alcance</th><th>Notas</th><th>Tirar</th><th>Editar</th></tr></thead><tbody id="armas-lista"></tbody></table></div>
      <div class="fila"><button type="button" class="btn btn-fantasma btn-sm" onclick="FichaCoC.armas.mostrarFormulario()">➕ Agregar arma</button><button type="button" class="btn btn-fantasma btn-sm" onclick="FichaCoC.abrirArmasEjemplo()">📚 Armas de ejemplo</button></div>
      <div id="armas-form"></div><div id="armas-ejemplo"></div>
      <div class="form-grid"><label class="campo"><span>Armadura (puntos que absorbe)</span><input type="text" id="armadura" placeholder="Ninguna"></label></div>`;
  }

  /* ---------- capacidades (hechizos, dones, habilidades especiales) ---------- */
  function capacidades() {
    return `<p class="texto-suave">Hechizos, dones y habilidades especiales del investigador. Con «⚡ Usar» se descuenta el costo (PM, Cordura, PV) y se anota en el historial.</p>
      <div id="capacidades-lista" class="feature-grid"></div>
      <div class="fila rasgo-gestion"><button type="button" class="btn btn-fantasma btn-sm" onclick="FichaCoC.capacidades.mostrarFormulario()">➕ Crear capacidad</button><button type="button" class="btn btn-fantasma btn-sm" onclick="FichaCoC.abrirBibliotecaCapacidades()">📚 Biblioteca</button></div>
      <div id="capacidades-form"></div><div id="capacidades-biblioteca"></div>`;
  }

  function equipo(P) {
    return `<div class="form-grid">
      <label class="campo"><span>Equipamiento y objetos personales</span><textarea id="equipamiento" rows="5">${esc(P.equipamiento || '')}</textarea></label>
      <label class="campo"><span>Finanzas y economía</span><textarea id="finanzas" rows="5">${esc(P.finanzas || '')}</textarea></label></div>`;
  }
  function trasfondo(P) {
    const t = P.trasfondo || {};
    return `<div class="form-grid">${TRASFONDO.map(([k, et]) => `<label class="campo"><span>${esc(et)}</span><textarea id="trasfondo-${k}" rows="3">${esc(t[k] || '')}</textarea></label>`).join('')}</div>`;
  }
  function bitacora() {
    return `<div class="bitacora-ficha">
      <label class="campo"><span>Nueva entrada</span><input type="text" id="bitacora-ficha-titulo" placeholder="Título (opcional)"></label>
      <label class="campo"><textarea id="bitacora-ficha-texto" rows="3" placeholder="Qué pasó…"></textarea></label>
      <div class="fila"><button type="button" class="btn btn-primario btn-sm" id="btn-guardar-bitacora-ficha" onclick="guardarEntradaBitacoraFicha()">Guardar entrada</button><button type="button" class="btn btn-fantasma btn-sm" id="btn-cancelar-bitacora-ficha" onclick="cancelarEdicionBitacoraFicha()" style="display:none">Cancelar</button></div>
      <p class="texto-suave">Últimas entradas</p><div id="bitacora-ficha-lista"></div></div>`;
  }

  function ficha(P, ctx) {
    const secs = [];
    const sec = (id, icono, titulo, cuerpo, opts) => { secs.push({ id, icono, titulo: String(titulo).replace(/<[^>]*>/g, ''), html: seccion(id, icono, titulo, cuerpo, opts) }); };
    sec('investigador', '🕵️', 'Investigador', investigador(P), { abierta: true });
    sec('caracteristicas', '📊', 'Características y estado', caracteristicas(P), { abierta: true });
    sec('habilidades', '🎯', 'Habilidades', habilidades(), { abierta: true });
    sec('combate', '⚔️', 'Combate', combate(), { abierta: true });
    sec('capacidades', '🔮', 'Capacidades, hechizos y dones', capacidades(), { abierta: true });
    sec('equipo', '🎒', 'Equipo y finanzas', equipo(P));
    sec('trasfondo', '📖', 'Trasfondo', trasfondo(P));
    // Notas: lo que escribió el Guardián al armar el personaje (solo lectura; HTML propio solo en los archivos del repositorio) y las notas de aventura de la persona.
    sec('notas', '📝', 'Notas', (P.notas ? `<div class="aviso"><span>${P.notasHtml || esc(P.notas).replace(/\n/g, '<br>')}</span></div>` : '') +
      '<label class="campo"><span>Notas de aventura y diario de campaña</span><textarea id="notas-personaje" rows="6" placeholder="Pistas, notas del Guardián y descubrimientos arcanos. Se guardan solas en la nube."></textarea></label>');
    sec('bitacora', '📜', 'Bitácora de la campaña', bitacora());
    const resultado = `<div class="coc-resultado" id="coc-resultado" hidden role="status" aria-live="polite"></div>`;
    const ajustes = `<div class="coc-ajustes" role="group" aria-label="Ajustes de la tirada">
      <label class="campo"><span>Dados</span><select id="dados-bonus" aria-label="Dados de bonificación o penalización"><option value="2">Bonificación ×2</option><option value="1">Bonificación</option><option value="0" selected>Normal</option><option value="-1">Penalización</option><option value="-2">Penalización ×2</option></select></label>
      <label class="campo"><span>Dificultad</span><select id="dados-dificultad" aria-label="Dificultad de la tirada"><option value="regular" selected>Regular</option><option value="dificil">Difícil</option><option value="extremo">Extrema</option></select></label></div>`;
    return `<div class="ficha ficha-coc sheet" data-personaje="${esc(P.id)}">${cabecera(P, ctx)}${barraFija(secs)}${ajustes}${resultado}${secs.map((x) => x.html).join('\n')}</div><div class="toast-zona" id="toast-zona" aria-live="polite"></div>`;
  }

  window.FichaCoCPlantilla = { ficha, esc, CARAC, TRASFONDO, INFO };
})();

/*
 * ficha-plantilla.js — HTML de la ficha, generado desde los datos de un personaje (personajes/<id>.js).
 *
 * Es la parte "qué se dibuja": cada función devuelve el marcado de UNA sección con los ids de siempre
 * (hp-cur, hd-N, ds-s1…, cond-*, slot-N-cur, <ab>-score, sk-<habilidad>, ac-buff, …), que son las claves bajo
 * datos/ en Firebase. Por eso un personaje existente conserva todos sus datos al pasar a la ficha única.
 * ficha-shell.js decide el orden, carga los módulos y conecta los motores; los estilos salen de ficha-tema.css.
 *
 * Todo lo que viene de los datos se escapa con esc(), salvo los campos `html` (texto de rasgos y secciones propias),
 * que son contenido nuestro, versionado en el repositorio.
 */
(function () {
  'use strict';

  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const ABIL_ES = { STR: 'Fuerza', DEX: 'Destreza', CON: 'Constitución', INT: 'Inteligencia', WIS: 'Sabiduría', CHA: 'Carisma' };
  const SKILL_HAB = { 'Acrobatics': 'DEX', 'Animal Handling': 'WIS', 'Arcana': 'INT', 'Athletics': 'STR', 'Deception': 'CHA', 'History': 'INT', 'Insight': 'WIS', 'Intimidation': 'CHA', 'Investigation': 'INT', 'Medicine': 'WIS', 'Nature': 'INT', 'Perception': 'WIS', 'Performance': 'CHA', 'Persuasion': 'CHA', 'Religion': 'INT', 'Sleight of Hand': 'DEX', 'Stealth': 'DEX', 'Survival': 'WIS' };
  const skillId = (n) => 'sk-' + n.toLowerCase().replace(/ /g, '-');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => (n >= 0 ? '+' : '') + n;

  function seccion(id, icono, titulo, cuerpo, opts) {
    const o = opts || {};
    return `<details class="seccion" id="seccion-${esc(id)}"${o.abierta ? ' open' : ''}>
    <summary><span class="seccion-icono" aria-hidden="true">${icono}</span> ${titulo}${o.nota ? ` <span class="seccion-nota">· ${o.nota}</span>` : ''}</summary>
    <div class="seccion-cuerpo">${cuerpo}</div>
  </details>`;
  }

  /* ---------- cabecera ---------- */
  function cabecera(P, ctx) {
    const chips = (P.chips || []).map(c => `<span class="tag">${esc(c)}</span>`).join('') +
      '<span class="tag" id="chip-nivel"></span><span class="tag">Competencia <span id="prof-badge">+2</span></span>' +
      (ctx.codigoCampana ? `<span class="tag">Campaña: ${esc(ctx.codigoCampana)}</span>` : '');
    const volver = ctx.codigoCampana ? `index.html?campana=${encodeURIComponent(ctx.codigoCampana)}` : 'index.html';
    return `<header class="cabecera">
    <div class="cabecera-top">
      <div>
        <h1>${esc(P.nombreCompleto || P.nombre)}</h1>
        <div class="subtitulo">${esc(P.subtitulo || '')}</div>
      </div>
      <div class="cabecera-acciones">
        <div id="selector-paleta"></div>
        <a class="btn btn-fantasma" href="${volver}">← Volver</a>
      </div>
    </div>
    <div class="cabecera-chips">${chips}</div>
    <div class="xp">
      <div class="xp-linea"><label for="xp-val">⭐ XP</label><input type="number" id="xp-val" step="100" min="0" value="${P.xp || 0}" aria-label="Experiencia actual"><span id="xp-siguiente"></span><span id="xp-nivel-info"></span></div>
      <div class="progreso gruesa" id="xp-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Experiencia hasta el próximo nivel"><span style="width:0%"></span></div>
    </div>
    <input type="hidden" id="subidas-nivel-registro" value="">
    <div class="fila" id="fila-nivel"><button type="button" class="btn btn-fantasma btn-sm" data-fn-abrir>⬆️ Subir de nivel</button><button type="button" class="btn btn-fantasma btn-sm" id="btn-deshacer-nivel">↩️ Deshacer última subida</button></div>
  </header>
  <div class="aviso aviso-mal" id="readonly-banner" role="status" style="display:none"><span>👁️ Modo solo lectura: esta ficha es de otra persona.</span></div>`;
  }

  /* ---------- barra fija ---------- */
  function barraFija(secs) {
    const atajos = (secs || []).map(x => `<a href="#seccion-${esc(x.id)}" class="atajo" data-atajo="${esc(x.id)}" title="${esc(x.titulo)}" aria-label="Ir a ${esc(x.titulo)}">${x.icono}</a>`).join('');
    return `<div class="barra-fija" role="region" aria-label="Resumen rápido">
    <div class="barra-dato"><small>HP</small><strong id="barra-hp">—</strong></div>
    <div class="barra-dato"><small>CA</small><strong id="barra-ca">—</strong></div>
    <div class="barra-dato"><small>Prof.</small><strong id="barra-prof">—</strong></div>
    <button type="button" class="conc-casilla" id="barra-conc" data-activa="false" title="Sin concentración"><span class="conc-icono" aria-hidden="true">🧠</span> <span id="barra-conc-nombre">Sin concentración</span></button>
    <span class="barra-sep"></span>
    <button type="button" class="btn btn-fantasma btn-sm" data-descanso="corto">☕ Corto</button>
    <button type="button" class="btn btn-fantasma btn-sm" data-descanso="largo">🌙 Largo</button>
    <button type="button" class="btn btn-fantasma btn-sm" id="btn-compartir" style="display:none" title="Compartir esta ficha para que otros jugadores la vean en modo lectura">👁️ Compartir</button>
    <nav class="barra-atajos" aria-label="Ir a una sección">${atajos}</nav>
  </div>`;
  }

  /* ---------- efectos manuales (Bless, Bane, Haste…): casillas que el jugador marca a mano ---------- */
  function efectosManuales(P) {
    const l = (P.efectosManuales || []);
    if (!l.length) return '';
    return '<strong class="estados-titulo">Efectos y buffs</strong>' + l.map(e => `<label title="${esc(e.texto || '')}"><input type="checkbox" id="${esc(e.id)}" data-efecto="${esc(e.nombre)}" data-tipo="${esc(e.tipo || 'buff')}"> ${esc(e.icono || '✨')} ${esc(e.nombre)}${e.texto ? ' <small>(' + esc(e.texto) + ')</small>' : ''}</label>`).join('') + '<hr class="separador"><strong class="estados-titulo">Condiciones</strong>';
  }

  /* ---------- vitales ---------- */
  function vitales(P) {
    const stats = [
      ['ca', '🛡️ CA', 'ac-base', 'ac-buff', 'ac-total', true],
      ['hpmax', '❤️ PG máx.', 'hp-max-base', 'hp-max-buff', 'hp-max-total'],
      ['ini', '🎲 Iniciativa', 'ini-base', 'iniciativa-buff', 'iniciativa-total'],
      ['vel', '🏃 Velocidad', 'vel-base', 'velocidad-buff', 'velocidad-total'],
      ['atk', '⚔️ Ataque', 'atk-base', 'atk-buff', 'atk-total'],
      ['satk', '✨ Atq. conjuro', 'spell-atk-base', 'spell-atk-buff', 'spell-atk-total'],
      ['sdc', '📿 CD conjuro', 'spell-dc-base', 'spell-dc-buff', 'spell-dc-total'],
    ].filter(s => !(P.sinConjuros && (s[0] === 'satk' || s[0] === 'sdc')));
    const badges = stats.map(([k, et, base, buff, tot, destacado]) => `<div class="stat-badge${destacado ? ' destacado' : ''}" id="stat-${k}">
        <label for="${buff}">${et}</label>
        <span class="stat-base" id="${base}"></span>${k === 'ca' && P.ca && P.ca.casillaAuto ? '<label class="ac-auto-label" title="Calcula la CA desde la armadura y el escudo equipados en el inventario. Apagada: se usa la CA fija del personaje."><input type="checkbox" id="ac-auto"> calcular desde el equipo</label>' : ''}
        <div class="buff-row"><input type="number" id="${buff}" value="0" aria-label="Bono manual: ${esc(et.replace(/^\S+\s/, ''))}" title="Bono manual (objetos o efectos)">${k === 'ini'
          ? `<button type="button" class="btn-roll" id="${tot}" data-tirar="iniciativa" aria-label="Tirar iniciativa">🎲 +0</button>`
          : `<div class="stat-total" id="${tot}">0</div>`}</div>${k === 'ca' && P.ca && P.ca.manual ? `<label class="campo"><span>CA base manual</span><input type="number" id="${esc(P.ca.manual)}" value="${P.ca.fija != null ? P.ca.fija : 10}" title="Se usa mientras no haya armadura o escudo equipados"></label>` : ''}
      </div>`).join('');
    return `<div class="vitales">
        <div class="panel panel-hp">
          <h3>Puntos de golpe</h3>
          <div class="hp-linea">
            <div class="contador" role="group" aria-label="Puntos de golpe">
              <button type="button" class="contador-paso" data-hp-delta="-5" aria-label="Restar 5 PG">−5</button>
              <button type="button" data-hp-delta="-1" aria-label="Restar 1 PG">−</button>
              <div><input type="number" id="hp-cur" class="contador-valor" value="${P.hpBase || 1}" min="0" aria-label="Puntos de golpe actuales"><span class="contador-max"> / <span id="hp-max-label">${P.hpBase || 1}</span></span></div>
              <button type="button" data-hp-delta="1" aria-label="Sumar 1 PG">+</button>
              <button type="button" class="contador-paso" data-hp-delta="5" aria-label="Sumar 5 PG">+5</button>
            </div>
          </div>
          <div class="progreso gruesa bien" id="hp-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Barra de PG"><span style="width:100%"></span></div>
          <div class="form-grid">
            <label class="campo"><span>PG temporales</span><input type="number" id="${P.idHpTemp || 'hp-temp-input'}" value="0" min="0"></label>
            <label class="campo"><span>Recibir daño o curar</span><input type="number" id="hp-cantidad" value="" min="0" placeholder="Cantidad"></label>
          </div>
          <div class="fila"><button type="button" class="btn btn-peligro btn-sm" data-hp-accion="dano" title="El daño consume primero los PG temporales">💥 Daño</button><button type="button" class="btn btn-primario btn-sm" data-hp-accion="curar">💚 Curar</button></div>
        </div>

        <div class="panel">
          <h3 id="hd-label">Dados de golpe</h3>
          <div class="pips" id="hd-pips" role="group" aria-label="Dados de golpe disponibles"></div>
          <p class="texto-suave" id="hd-cuenta"></p>
          <button type="button" class="btn btn-roll" data-hp-accion="hitdie">🎲 Usar dado de golpe</button>
        </div>

        <div class="panel">
          <h3>Salvaciones de muerte</h3>
          <div class="salvaciones-muerte">
            <div class="fila"><span>✓ Éxitos</span><div class="pips">${[1, 2, 3].map(n => `<label class="pip-casilla"><input type="checkbox" id="ds-s${n}" aria-label="Éxito ${n}"><span class="pip exito" aria-hidden="true"></span></label>`).join('')}</div></div>
            <div class="fila"><span>✗ Fallos</span><div class="pips">${[1, 2, 3].map(n => `<label class="pip-casilla"><input type="checkbox" id="ds-f${n}" aria-label="Fallo ${n}"><span class="pip fallo" aria-hidden="true"></span></label>`).join('')}</div></div>
          </div>
          <button type="button" class="btn btn-roll" data-hp-accion="muerte">💀 Tirar salvación de muerte</button>
          <div class="etiqueta-seccion" style="margin:var(--sp-2) 0 0">Estados</div>
          <div class="estados-linea" id="estados-activos"></div>
          <p class="texto-suave" id="estados-efectos"></p>
          <details class="selector-estados"><summary class="btn btn-fantasma btn-sm">+ Estado</summary><div id="conditions-dropdown" class="estados-lista">${efectosManuales(P)}</div></details>
          ${P.sinConjuros ? '' : '<button type="button" class="btn btn-roll" data-tirar="concentracion">🧘 Save de concentración (CON <span id="conc-save-bonus">+0</span>)</button>'}
        </div>

        <div class="vitales-stats stats-grid">
          ${badges}
          <div class="stat-badge"><label>📘 Competencia</label><span class="stat-base" id="prof-nivel"></span><div class="stat-total" id="prof-badge-2">+2</div></div>
          <div class="stat-badge"><label>👁️ Percepción pasiva</label><span class="stat-base">10 + Percepción</span><div class="stat-total" id="percepcion-pasiva">10</div></div>
        </div>
        <div class="fila" style="grid-column:1/-1;align-items:flex-start"><div id="concentracion-panel" class="buffs-activos"></div><div id="buffs-activos" class="buffs-activos"></div>${(P.auras || []).length ? `<div class="buffs-activos" id="auras-control">${P.auras.map(a => `<label class="aura-toggle" title="${esc(a.texto || '')}"><input type="checkbox" id="${esc(a.id)}"${a.activa === false ? '' : ' checked'}> ${esc(a.icono || '🛡️')} ${esc(a.nombre)}</label>`).join('')}</div>` : ''}</div>
      </div>`;
  }

  /* ---------- atributos, salvaciones y habilidades ---------- */
  function atributos(P) {
    const saves = P.salvaciones || [];
    const a = ABIL.map(k => {
      const kk = k.toLowerCase();
      const comp = saves.indexOf(k) >= 0;
      return `<div class="atributo${comp ? ' competente' : ''}" id="ab-${kk}">
        <h3>${k}${comp ? ' ★' : ''}</h3>
        <div class="ab-score"><input type="number" id="${kk}-score" value="${(P.atributos || {})[k] || 10}" aria-label="Puntuación de ${ABIL_ES[k]}"></div>
        <div class="ab-mod">(+0)</div>
        <div class="ab-temp"><input type="number" id="${kk}-temp" value="0" aria-label="Aumento temporal de ${ABIL_ES[k]}" title="Aumento temporal (pociones, artefactos)"></div>
        <div class="ab-btns"><button type="button" class="btn-roll btn-roll-sm btn-check" data-tirar="check" data-hab="${k}">Check</button><button type="button" class="btn-roll btn-roll-sm btn-save" data-tirar="save" data-hab="${k}">Save</button></div>
      </div>`;
    }).join('');
    const hab = P.habilidades || {};
    const s = Object.keys(SKILL_HAB).map(n => {
      const nivel = hab[n];
      const marca = nivel === 'exp' ? '★★' : nivel ? '★' : '';
      return `<div class="skill-item${nivel ? ' competente' : ''}" id="${skillId(n)}"><button type="button" class="btn-roll" data-tirar="skill" data-skill="${esc(n)}" aria-label="Tirar ${esc(n)}">🎲</button><span class="skill-name">${esc(n)} <span class="skill-hab">(${SKILL_HAB[n]})</span>${marca ? ` <span class="skill-tag">${marca}</span>` : ''}</span><span class="skill-mod">+0</span></div>`;
    }).join('');
    return `<div class="atributos">${a}</div>
      <p class="texto-suave">Debajo de cada puntuación va el aumento temporal (pociones, artefactos). El bono de competencia y todos los números se calculan solos desde el nivel.</p>
      <div class="etiqueta-seccion">Habilidades (★ competencia, ★★ pericia)</div>
      <div class="skills-grid">${s}</div>
      ${P.competencias ? `<div class="aviso"><span><strong>Competencias e idiomas:</strong> ${P.competencias}</span></div>` : ''}`;
  }

  /* ---------- ataques ---------- */
  function ataques(P) {
    const filas = (P.ataques || []).map((a, i) => `<tr>
        <td data-etiqueta="Arma"><strong>${esc(a.nombre)}</strong></td>
        <td class="num" data-etiqueta="Bono"${a.bonoTexto ? '>' + a.bonoTexto : a.soloDano ? '>—' : ` id="atq-bono-${i}">+0`}</td>
        <td data-etiqueta="Daño" id="atq-dano-${i}">${a.html ? (a.textoDano || '') : esc(a.textoDano || '')}</td>
        <td data-etiqueta="Notas">${a.html ? (a.notas || '') : esc(a.notas || '')}</td>
        <td data-etiqueta="Tirar"><div class="spell-item-actions">${(a.soloDano || a.sinAtq) ? '' : `<button type="button" class="btn-roll btn-roll-sm" data-ataque="${i}" data-modo="atk">🎯 Atq</button>`}${a.dano ? `<button type="button" class="btn-roll btn-roll-sm" data-ataque="${i}" data-modo="dano">💥 Daño</button>` : ''}${(a.extras || []).map((x, j) => `<button type="button" class="btn-roll btn-roll-sm" data-ataque="${i}" data-modo="extra" data-extra="${j}">${esc(x.icono || '➕')} ${esc(x.nombre)}</button>`).join('')}${(a.atqExtra || []).map((n, j) => `<button type="button" class="btn-roll btn-roll-sm" data-ataque="${i}" data-modo="atqextra" data-extra="${j}">🎯 ${esc(n)}</button>`).join('')}${a.uso ? `<button type="button" class="btn-roll btn-roll-sm" data-uso="${esc(a.uso)}">✅ Usar</button>` : ''}</div></td>
      </tr>`).join('');
    const conj = P.sinConjuros ? '' : `<tr><td data-etiqueta="Arma"><strong>Ataque de conjuro</strong></td><td class="num" data-etiqueta="Bono" id="atq-bono-conjuro">+0</td><td data-etiqueta="Daño">Según el conjuro</td><td data-etiqueta="Notas">${P.habilidadConjuro || ''} + competencia</td><td data-etiqueta="Tirar"><button type="button" class="btn-roll btn-roll-sm" data-ataque="conjuro" data-modo="atk">🎯 Atq conjuro</button></td></tr>`;
    return `<div class="tabla-scroll"><table class="tabla tabla-resp"><thead><tr><th>Arma</th><th>Bono</th><th>Daño</th><th>Notas</th><th>Tirar</th></tr></thead><tbody>${filas}${conj}</tbody></table></div>`;
  }

  /* ---------- conjuros ---------- */
  function conjuros(P) {
    return `<div class="fila-espacios">
        <div class="espacios" id="espacios-conjuro" aria-label="Espacios de conjuro"></div>
        <div class="fila"><span class="texto-suave" id="pacto-info"></span></div>
      </div>
      <div class="fila" style="justify-content:flex-end"><button type="button" class="btn btn-fantasma" data-compendio>📖 Agregar del compendio</button><button type="button" class="spell-add-btn" onclick="FichaHechizos.editor.mostrarFormulario()">➕ Agregar hechizo (en blanco)</button></div>
      <div class="tabla-scroll"><table class="tabla tabla-resp tabla-hechizos"><thead><tr><th>Nivel</th><th>Conjuro</th><th>Tiempo / alcance</th><th>Efecto</th><th>Acción</th></tr></thead><tbody id="hechizos-lista"></tbody></table></div>
      <div id="hechizos-form-container"></div>`;
  }

  /* ---------- recursos de clase ---------- */
  function recursos(P) {
    const lista = (P.recursos || []).map(r => {
      const recarga = r.recarga === 'corto' ? '↻ Descanso corto' : r.recarga === 'largo' ? '↻ Descanso largo' : r.recarga === 'ambos' ? '↻ Corto o largo' : 'Informativo';
      let cuerpo;
      if (r.tipo === 'pool') {
        const b = (r.pasos || [-5, -1, 1, 5]).map(p => `<button type="button" class="${Math.abs(p) > 1 ? 'contador-paso' : ''}" data-pool="${esc(r.campo)}" data-delta="${p}" aria-label="${p < 0 ? 'Gastar ' + (-p) : 'Recuperar ' + p}">${p < 0 ? '−' + (-p) : '+' + p}</button>`);
        const neg = b.filter((_, i) => (r.pasos || [-5, -1, 1, 5])[i] < 0).join(''), pos = b.filter((_, i) => (r.pasos || [-5, -1, 1, 5])[i] > 0).join('');
        cuerpo = `<div class="progreso gruesa bien"><span style="width:100%"></span></div>
          <div class="recurso-valor"><div class="contador" role="group" aria-label="${esc(r.nombre)}">${neg}<div><span class="contador-valor" id="${esc(r.campo)}">${r.inicial != null ? r.inicial : 0}</span><span class="contador-max"> / <span id="${esc(r.campo)}-max">0</span></span></div>${pos}</div></div>`;
      } else if (r.tipo === 'info') {
        cuerpo = `<div class="recurso-valor"><span class="recurso-info" id="recurso-valor-${esc(r.id)}">—</span>${r.formula ? `<button type="button" class="btn-roll" data-recurso-formula="${esc(r.id)}">🎲 Tirar</button>` : ''}</div>`;
      } else {
        cuerpo = `<div class="recurso-valor"></div><span class="recurso-cuenta texto-suave"></span>`;
      }
      return `<div class="recurso" id="recurso-${esc(r.id)}">
        <div class="recurso-cab"><span class="recurso-nombre">${esc(r.icono || '🔹')} ${esc(r.nombre)}</span><span class="recurso-recarga">${recarga}</span></div>
        ${cuerpo}
        ${r.desc ? `<p class="recurso-desc">${esc(r.desc)}</p>` : ''}
      </div>`;
    }).join('');
    return lista ? `<div class="recursos-grid">${lista}</div>` : '<p class="texto-suave">Este personaje no tiene recursos de clase con contador.</p>';
  }

  /* ---------- buffs personalizados ---------- */
  function buffsPersonales() {
    return `<p class="texto-suave">Se encienden y apagan a mano. Mientras están activos aparecen junto a los estados.</p>
      <div id="buffs-personales-lista"></div>
      <div class="fila"><button type="button" class="btn btn-fantasma btn-sm" onclick="FichaBuffsPersonales.editor.mostrarFormulario()">➕ Crear buff</button></div>
      <div id="buffs-personales-form"></div>`;
  }

  /* ---------- rasgos ---------- */
  function rasgos(P) {
    const cards = (P.rasgos || []).map(r => `<div class="feature-card"><div class="fila"><h4>${esc(r.titulo)}</h4><span class="tag">${esc(r.tag || '')}</span></div><div class="editable-text" contenteditable="true" id="${esc(r.id)}">${r.html || ''}</div>${(r.acciones || []).map(a => `<button type="button" class="btn-roll btn-roll-sm" ${a.uso ? `data-uso="${esc(a.uso)}"` : `data-roll="${esc(a.roll)}"`} data-etiqueta="${esc(a.etiqueta || a.texto)}">${esc(a.texto)}</button>`).join('')}</div>`).join('');
    return `<div class="feature-grid">${cards}</div>`;
  }

  /* ---------- inventario ---------- */
  function inventario(P) {
    const monedas = (P.monedas || [{ id: 'gp-val', etiqueta: 'Oro (po)' }]).map(m => `<label class="campo"><span>${esc(m.etiqueta)}</span><input type="number" id="${esc(m.id)}" value="${m.valor || 0}"></label>`).join('');
    const contadores = (P.contadores || []).map(c => `<div class="panel"><h3>${esc(c.icono || '🔹')} ${esc(c.etiqueta)}</h3><div class="contador" role="group" aria-label="${esc(c.etiqueta)}"><button type="button" data-contador="${esc(c.id)}" data-delta="-1" aria-label="Restar">−</button><span class="contador-valor" id="${esc(c.id)}">${c.valor || 0}</span><button type="button" data-contador="${esc(c.id)}" data-delta="1" aria-label="Sumar">+</button></div></div>`).join('');
    return `<div class="form-grid">${monedas}</div>
      ${contadores ? `<div class="form-grid">${contadores}</div>` : ''}
      ${P.notaInventario ? `<div class="aviso"><span>${P.notaInventario}</span></div>` : ''}
      <div class="fila" style="justify-content:space-between"><span class="texto-suave">La CA se calcula con la armadura y el escudo equipados.</span><button type="button" class="inventory-add-btn" onclick="FichaInventario.editor.mostrarFormulario()">➕ Agregar ítem</button></div>
      <div id="inventario-lista"></div><div id="inventario-form-container"></div>`;
  }

  function reputacion() {
    return `<div class="fila" style="justify-content:space-between"><span class="texto-suave">Agrega facciones, ajusta su valor, renómbralas o quítalas.</span><button type="button" class="reputacion-add-btn" onclick="FichaReputacion.editor.mostrarFormulario()">➕ Agregar facción</button></div>
      <div id="reputacion-lista"></div><div id="reputacion-form-container"></div>`;
  }

  /* ---------- trasfondo, notas y bitácora ---------- */
  function trasfondo(P) {
    const t = P.trasfondo || {};
    const campo = (id, et, ph) => `<label class="campo"><span>${et}</span><textarea id="${id}" placeholder="${ph}"></textarea></label>`;
    return `<div class="tabs" role="tablist" aria-label="Trasfondo, notas y bitácora">
        <button type="button" class="tab" role="tab" id="tab-trasfondo" aria-selected="true" aria-controls="panel-trasfondo">Trasfondo</button>
        <button type="button" class="tab" role="tab" id="tab-notas" aria-selected="false" aria-controls="panel-notas">Notas</button>
        <button type="button" class="tab" role="tab" id="tab-bitacora" aria-selected="false" aria-controls="panel-bitacora">Bitácora</button>
      </div>
      <div class="tab-panel" role="tabpanel" id="panel-trasfondo" aria-labelledby="tab-trasfondo">
        ${t.html ? `<div class="aviso"><span>${t.html}</span></div>` : ''}
        ${t.sinCampos ? '<p class="texto-suave">El trasfondo de este personaje está en su sección propia.</p>' : `<div class="form-grid">
          ${campo('trasfondo-historia', 'Historia', 'De dónde viene, qué lo trajo a la aventura…')}
          ${campo('trasfondo-personalidad', 'Personalidad', 'Rasgos de personalidad…')}
          ${campo('trasfondo-ideales', 'Ideales', 'Qué lo motiva…')}
          ${campo('trasfondo-vinculos', 'Vínculos', 'Personas, lugares u objetos importantes…')}
          ${campo('trasfondo-defectos', 'Defectos', 'Debilidades o vicios…')}
        </div>`}
      </div>
      <div class="tab-panel" role="tabpanel" id="panel-notas" aria-labelledby="tab-notas" hidden>
        <label class="campo"><span>Notas de aventura</span><textarea id="notas-personaje" style="min-height:160px" placeholder="Pistas, nombres, deudas pendientes…"></textarea></label>
      </div>
      <div class="tab-panel" role="tabpanel" id="panel-bitacora" aria-labelledby="tab-bitacora" hidden>
        <div id="bitacora-section" class="bitacora-section">
          <p class="bitacora-section-label">Nueva entrada</p>
          <input type="text" id="bitacora-ficha-titulo" placeholder="Título (opcional)">
          <textarea id="bitacora-ficha-texto" rows="3" placeholder="Qué pasó…"></textarea>
          <div class="fila"><button type="button" class="btn btn-primario" id="btn-guardar-bitacora-ficha" onclick="guardarEntradaBitacoraFicha()">Guardar entrada</button><button type="button" class="btn btn-fantasma" id="btn-cancelar-bitacora-ficha" onclick="cancelarEdicionBitacoraFicha()" style="display:none">Cancelar</button></div>
          <p class="bitacora-section-label" style="margin-top:var(--sp-3)">Últimas entradas</p>
          <div id="bitacora-ficha-lista"></div>
        </div>
      </div>`;
  }

  /* ---------- ficha completa ---------- */
  function ficha(P, ctx) {
    const partes = [];
    partes.push(cabecera(P, ctx));
    const secs = [];
    const sec = (id, icono, titulo, cuerpo, opts) => { secs.push({ id, icono, titulo: String(titulo).replace(/<[^>]*>/g, ''), html: seccion(id, icono, titulo, cuerpo, opts) }); };
    sec('vitales', '❤️', 'Vitales y combate', vitales(P), { abierta: true });
    sec('atributos', '📊', 'Atributos, salvaciones y habilidades', atributos(P), { abierta: true });
    sec('ataques', '⚔️', 'Ataques', ataques(P), { abierta: true });
    if (!P.sinConjuros) sec('conjuros', '✨', 'Conjuros', conjuros(P), { abierta: true });
    // Recursos (de clase, raza y talentos) y rasgos en UNA sola tarjeta: lo que se gasta arriba y lo que dice cada rasgo debajo.
    const hayRecursos = (P.recursos || []).length > 0;
    sec('rasgos', '📜', hayRecursos ? 'Recursos y rasgos' : 'Rasgos y características',
      (hayRecursos ? `<div class="subseccion-titulo">🔥 Recursos</div>${recursos(P)}<div class="subseccion-titulo">📜 Rasgos y características</div>` : '') + rasgos(P),
      { abierta: true, nota: hayRecursos ? 'los máximos se calculan del nivel y se recargan con el descanso' : '' });
    sec('buffs', '🔆', 'Buffs personalizados', buffsPersonales(P), { abierta: true, nota: 'interruptores propios: suman o restan solo cuando se cumple su condición' });
    (P.secciones || []).forEach(s => sec(s.id, s.icono || '📄', esc(s.titulo), `<div class="seccion-propia" data-fragmento="${esc(s.fragmento || '')}">${s.html || '<p class="texto-suave">Cargando…</p>'}</div>`));
    sec('inventario', '🎒', 'Inventario y equipo', inventario(P));
    sec('reputacion', '🏅', 'Reputación y honor', reputacion());
    sec('trasfondo', '📖', 'Trasfondo, notas y bitácora', trasfondo(P));
    partes.push(barraFija(secs));
    secs.forEach(x => partes.push(x.html));
    // Campos ocultos que algún módulo del personaje guarda en datos/ (p. ej. un mapa JSON de preferencias).
    const ocultos = (P.camposOcultos || []).map(id => `<input type="hidden" id="${esc(id)}" value="">`).join('');
    return `<div class="ficha sheet" data-personaje="${esc(P.id)}">${ocultos}${partes.join('\n  ')}</div><div class="toast-zona" id="toast-zona" aria-live="polite"></div>`;
  }

  // Atajos de la barra fija: abren la sección y se desplazan hasta ella dejando libre la altura de la barra.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-atajo]'); if (!a) return;
    const sec = document.getElementById('seccion-' + a.dataset.atajo); if (!sec) return;
    e.preventDefault();
    if (sec.tagName === 'DETAILS') sec.open = true;
    const barra = document.querySelector('.barra-fija');
    const y = sec.getBoundingClientRect().top + window.scrollY - (barra ? barra.offsetHeight : 0) - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  });

  window.FichaPlantilla = { ficha, ABIL, SKILL_HAB, skillId, esc, fmt };
})();

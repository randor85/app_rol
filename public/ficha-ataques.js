/*
 * ficha-ataques.js — tabla de ataques EDITABLE de la carcasa (agregar, editar, quitar) con escalado de daño por nivel.
 *
 * Los ataques de `P.ataques` (personajes/<id>.js) se usan como SEMILLA de la lista editable (datos/ataques-json), igual que
 * el inventario y los hechizos. Los ataques «especiales» de código (con funciones, HTML, usos, ataques extra… p. ej. Sneak Attack
 * de Dane o los golpes de Eldur) no se pueden guardar como datos: en la lista van como referencia `{fija: i}` al i-ésimo de
 * P.ataques (conservan su posición, sin botón de edición, y se pueden quitar).
 *
 * Modelo de un ataque editable (JSON):
 *   { nombre, habilidad:'STR', competente:true, bonoExtra:0, soloDano:false,
 *     dano:{count, sides, mod:'STR'|n|{hab,prof,fijo}} | null,  tipo:'contundente', notas:'',
 *     escala:{ tipo:'ninguna'|'truco'|'shillelagh'|'tabla', tabla:'5: 1d10\n11: 1d12' } }
 * Escalado (por nivel TOTAL del personaje): 'truco' suma un dado en los niveles 5, 11 y 17 (Fire Bolt, Produce Flame…);
 * 'shillelagh' = d8 → d10 (5) → d12 (11) → 2d6 (17), versión 2024; 'tabla' = una línea «nivel: NdX» por escalón.
 *
 *   FichaAtaques.iniciar(P)       crea el editor (después de FichaComun.setCharRef)
 *   FichaAtaques.lista()          ataques con la forma de P.ataques (fijos + editables ya escalados): lo usa el shell para tirar
 *   FichaAtaques.repintar()       actualiza bonos y texto de daño (por nivel, características, competencia…)
 *   FichaAtaques.editor / editar(i) / eliminar(i) / guardarDesdeFormulario() / alternarEscala()
 */
(function () {
  'use strict';

  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const ABIL_ES = { STR: 'Fuerza', DEX: 'Destreza', CON: 'Constitución', INT: 'Inteligencia', WIS: 'Sabiduría', CHA: 'Carisma' };
  const ESCALAS = [['ninguna', 'Sin escalado'], ['truco', 'Truco estándar (+1 dado en los niveles 5, 11 y 17)'], ['shillelagh', 'Shillelagh 2024 (d8 → d10 → d12 → 2d6)'], ['tabla', 'Personalizado (tabla nivel → dado)']];
  const TABLA_SHILLELAGH = [[1, 1, 8], [5, 1, 10], [11, 1, 12], [17, 2, 6]];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => (n >= 0 ? '+' : '') + n;
  const num = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? (d == null ? 0 : d) : n; };

  let P = null, editor = null;

  // ------------------------------------------------------------------ semilla y ataques fijos
  // ¿No se puede representar como datos? (funciones, HTML, usos, ataques extra propios…) → queda fijo en el código.
  function esFija(a) {
    if (!a) return false;
    if (a.html || a.sinAtq || a.atqExtra || a.conjuro || a.uso || a.bonoTexto || a.acciones) return true;
    if (typeof a.textoDano === 'function') return true;
    if (a.dano) {
      if (typeof a.dano.count === 'function') return true;
      const m = a.dano.mod;
      if (m && typeof m === 'object' && (m.clase || m.mult)) return true;
    }
    if ((a.extras || []).some((x) => !x.auto)) return true;
    return false;
  }
  const TIPOS_DANO = ['contundente', 'perforante', 'cortante', 'radiante', 'necrótico', 'fuego', 'frío', 'rayo', 'trueno', 'veneno', 'ácido', 'psíquico', 'fuerza'];
  function tipoDe(texto) {
    const t = String(texto || '').toLowerCase();
    const h = TIPOS_DANO.find((x) => t.includes(x));
    return h || '';
  }
  function aModelo(a) {
    const esc0 = a.escala;
    const escala = esc0 && typeof esc0 === 'object' ? { tipo: esc0.tipo || 'ninguna', tabla: esc0.tabla || '' } : { tipo: typeof esc0 === 'string' ? esc0 : 'ninguna', tabla: '' };
    const m = {
      nombre: String(a.nombre || 'Ataque'), habilidad: ABIL.includes(a.habilidad) ? a.habilidad : 'STR', competente: a.competente !== false,
      bonoExtra: num(a.bonoExtra, 0), soloDano: !!a.soloDano, dano: null, tipo: tipoDe(a.textoDano), notas: String(a.notas || ''), escala,
    };
    if (a.dano) m.dano = { count: num(a.dano.count, 1), sides: num(a.dano.sides, 4), mod: a.dano.mod == null ? 0 : a.dano.mod };
    else if (a.textoDano) m.textoLibre = String(a.textoDano);
    return m;
  }

  // ------------------------------------------------------------------ escalado y texto
  function nivelTotal() { try { return (window.FichaAtributos && FichaAtributos.nivel && FichaAtributos.nivel()) || 1; } catch (e) { return 1; } }
  function parseTabla(txt) {
    const out = [];
    String(txt || '').split('\n').forEach((l) => {
      const m = l.trim().match(/^(\d+)\s*[:=-]\s*(\d*)\s*d\s*(\d+)$/i);
      if (m) out.push([parseInt(m[1], 10), parseInt(m[2], 10) || 1, parseInt(m[3], 10)]);
    });
    return out.sort((a, b) => a[0] - b[0]);
  }
  function dadoEscalado(m) {
    const base = { count: m.dano.count, sides: m.dano.sides };
    const nv = nivelTotal(), tipo = (m.escala && m.escala.tipo) || 'ninguna';
    if (tipo === 'truco') return { count: base.count + (nv >= 5 ? 1 : 0) + (nv >= 11 ? 1 : 0) + (nv >= 17 ? 1 : 0), sides: base.sides };
    const escalones = tipo === 'shillelagh' ? TABLA_SHILLELAGH : tipo === 'tabla' ? parseTabla(m.escala.tabla) : [];
    let d = base;
    escalones.forEach((e) => { if (nv >= e[0]) d = { count: e[1], sides: e[2] }; });
    return d;
  }
  function textoMod(mod) {
    if (mod == null || mod === 0) return '';
    if (typeof mod === 'number') return ' ' + (mod > 0 ? '+ ' : '− ') + Math.abs(mod);
    if (typeof mod === 'string') return ' + ' + mod;
    const p = [];
    if (mod.hab) p.push(mod.hab);
    if (mod.prof) p.push('Competencia');
    if (mod.fijo) p.push(String(mod.fijo));
    return p.length ? ' + ' + p.join(' + ') : '';
  }
  function textoDano(m, dado) {
    if (!dado) return m.textoLibre || '—';
    return `${dado.count}d${dado.sides}${textoMod(m.dano.mod)}${m.tipo ? ' ' + m.tipo : ''}`;
  }
  // Extras de daño comunes (P.danoExtra con grupo 'ataques', p. ej. Elemental Fury) como botón en cada fila.
  function extrasComunes() {
    return (P.danoExtra || []).filter((x) => x && x.dado && (x.grupos || []).indexOf('ataques') >= 0).map((x) => ({ nombre: x.nombre, icono: x.icono, dado: x.dado, auto: true }));
  }
  function vista(m) {
    const dado = m.dano ? dadoEscalado(m) : null;
    const a = { nombre: m.nombre, habilidad: m.habilidad, competente: m.competente, bonoExtra: m.bonoExtra, soloDano: !!m.soloDano, notas: m.notas, textoDano: textoDano(m, dado), editable: true };
    if (dado) a.dano = { count: dado.count, sides: dado.sides, mod: m.dano.mod };
    a.extras = (m.soloDano && !dado) ? [] : extrasComunes();
    a.escalaTxt = m.escala && m.escala.tipo !== 'ninguna' && dado ? ` (nivel ${nivelTotal()})` : '';
    return a;
  }
  // Ataques con la forma de P.ataques, en el mismo orden que la tabla (los índices de las filas coinciden con los de esta lista).
  function lista() { return editor ? editor.items().map((m) => (m.fija != null ? ((P.ataques || [])[m.fija] || { nombre: 'Ataque no disponible', soloDano: true }) : vista(m))) : []; }

  // ------------------------------------------------------------------ filas
  function botones(a, i, extra) {
    return `<div class="spell-item-actions">${(a.soloDano || a.sinAtq) ? '' : `<button type="button" class="btn-roll btn-roll-sm" data-ataque="${i}" data-modo="atk">🎯 Atq</button>`}${a.dano ? `<button type="button" class="btn-roll btn-roll-sm" data-ataque="${i}" data-modo="dano">💥 Daño</button>` : ''}${(a.extras || []).map((x, j) => `<button type="button" class="btn-roll btn-roll-sm" data-ataque="${i}" data-modo="extra" data-extra="${j}">${esc(x.icono || '➕')} ${esc(x.nombre)}</button>`).join('')}${(a.atqExtra || []).map((n, j) => `<button type="button" class="btn-roll btn-roll-sm" data-ataque="${i}" data-modo="atqextra" data-extra="${j}">🎯 ${esc(n)}</button>`).join('')}${a.uso ? `<button type="button" class="btn-roll btn-roll-sm" data-uso="${esc(a.uso)}">✅ Usar</button>` : ''}${extra || ''}</div>`;
  }
  function fila(a, i, acciones) {
    return `<tr>
        <td data-etiqueta="Arma"><strong>${esc(a.nombre)}</strong></td>
        <td class="num" data-etiqueta="Bono"${a.bonoTexto ? '>' + a.bonoTexto : a.soloDano ? '>—' : ` id="atq-bono-${i}">+0`}</td>
        <td data-etiqueta="Daño" id="atq-dano-${i}">${a.html ? (a.textoDano || '') : esc(typeof a.textoDano === 'function' ? '' : (a.textoDano || ''))}</td>
        <td data-etiqueta="Notas">${a.html ? (a.notas || '') : esc(a.notas || '')}</td>
        <td data-etiqueta="Tirar">${botones(a, i, acciones)}</td>
      </tr>`;
  }
  function filaEditable(m, idx) {
    const fija = m.fija != null;
    const a = fija ? ((P.ataques || [])[m.fija] || { nombre: 'Ataque no disponible', soloDano: true }) : vista(m);
    const nombre = esc(a.nombre);
    const acc = (fija ? '' : `<button type="button" class="btn-roll btn-roll-sm" onclick="FichaAtaques.editar(${idx})" title="Editar el ataque" aria-label="Editar ${nombre}">✏️</button>`) +
      `<button type="button" class="btn-clear" onclick="FichaAtaques.eliminar(${idx})" title="Quitar el ataque" aria-label="Quitar ${nombre}">🗑️</button>`;
    return fila(a, idx, acc);
  }

  // ------------------------------------------------------------------ repintar (bonos y daño derivados)
  function repintar() {
    if (!window.FichaAtributos || !P) return;
    const prof = FichaAtributos.profBonusActual();
    const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
    const ctx = window.FichaVitales && FichaVitales.ctx ? FichaVitales.ctx() : null;
    lista().forEach((a, i) => {
      if (!a.bonoTexto && !a.soloDano) set('atq-bono-' + i, fmt(FichaAtributos.modDe(a.habilidad || 'STR') + (a.competente === false ? 0 : prof) + (a.bonoExtra || 0)));
      if (typeof a.textoDano === 'function' && ctx) set('atq-dano-' + i, a.textoDano(ctx));
      else if (a.editable) set('atq-dano-' + i, a.textoDano + (a.escalaTxt || ''));
    });
  }

  // ------------------------------------------------------------------ formulario
  const L = (t, el, cls) => `<label class="campo-rotulado${cls ? ' ' + cls : ''}"><span class="campo-etiqueta">${t}</span>${el}</label>`;
  const optHab = (sel, vacio) => (vacio ? `<option value="">${vacio}</option>` : '') + ABIL.map((h) => `<option value="${h}"${h === sel ? ' selected' : ''}>${ABIL_ES[h]} (${h})</option>`).join('');
  function formulario(m) {
    const d = m && m.dano, mod = d ? d.mod : 'STR';
    const modHab = typeof mod === 'string' ? mod : (mod && typeof mod === 'object' ? (mod.hab || '') : '');
    const modFijo = typeof mod === 'number' ? mod : (mod && typeof mod === 'object' ? (mod.fijo || 0) : 0);
    const modProf = !!(mod && typeof mod === 'object' && mod.prof);
    const esc0 = (m && m.escala) || { tipo: 'ninguna', tabla: '' };
    const conDano = m ? !!m.dano : true;
    return `<div class="spell-form">
      <p class="spell-form-label">${m ? 'Editar ataque' : 'Agregar ataque'}</p>
      ${L('Nombre', `<input type="text" id="af-nombre" value="${esc(m ? m.nombre : '')}" placeholder="p. ej. Espada larga, Shillelagh…">`)}
      <div class="spell-form-row-dado">
        ${L('Característica del ataque', `<select id="af-hab">${optHab(m ? m.habilidad : 'STR')}</select>`)}
        ${L('Bono extra al ataque', `<input type="number" id="af-bonoextra" value="${m ? m.bonoExtra : 0}">`)}
        <label><input type="checkbox" id="af-comp" ${!m || m.competente ? 'checked' : ''}> Competente (suma competencia)</label>
        <label><input type="checkbox" id="af-solodano" ${m && m.soloDano ? 'checked' : ''}> Solo daño (sin tirada de ataque)</label>
      </div>
      <label><input type="checkbox" id="af-condano" ${conDano ? 'checked' : ''} onchange="FichaAtaques.alternarDano()"> Tiene tirada de daño</label>
      <div id="af-dano-campos" style="display:${conDano ? 'block' : 'none'}">
        <div class="spell-form-row-dado">
          ${L('Cantidad de dados', `<input type="number" id="af-count" min="1" value="${d ? d.count : 1}">`)}<span>d</span>
          ${L('Caras', `<input type="number" id="af-sides" min="2" value="${d ? d.sides : 8}">`)}
          ${L('Característica del daño', `<select id="af-modhab">${optHab(modHab, '— ninguna —')}</select>`)}
          ${L('Bono fijo', `<input type="number" id="af-modfijo" value="${modFijo}">`)}
          <label><input type="checkbox" id="af-modprof" ${modProf ? 'checked' : ''}> + competencia</label>
        </div>
        ${L('Tipo de daño', `<input type="text" id="af-tipo" value="${esc(m ? m.tipo : '')}" placeholder="contundente, perforante, fuego…" list="af-tipos">`)}
        <datalist id="af-tipos">${TIPOS_DANO.map((t) => `<option value="${t}">`).join('')}</datalist>
        ${L('Escalado del daño con el nivel', `<select id="af-escala" onchange="FichaAtaques.alternarEscala()">${ESCALAS.map((e) => `<option value="${e[0]}"${e[0] === esc0.tipo ? ' selected' : ''}>${e[1]}</option>`).join('')}</select>`)}
        <div id="af-tabla-campos" style="display:${esc0.tipo === 'tabla' ? 'block' : 'none'}">
          ${L('Tabla: una línea por escalón, «nivel: NdX» (el nivel es el del personaje)', `<textarea id="af-tabla" rows="3" placeholder="5: 1d10&#10;11: 1d12">${esc(esc0.tabla || '')}</textarea>`)}
        </div>
      </div>
      <div id="af-libre-campos" style="display:${conDano ? 'none' : 'block'}">${L('Texto de daño (si no tiene dados)', `<input type="text" id="af-libre" value="${esc(m && m.textoLibre ? m.textoLibre : '')}" placeholder="p. ej. 1 + FUE contundente">`)}</div>
      ${L('Notas', `<textarea id="af-notas" rows="2">${esc(m ? m.notas : '')}</textarea>`)}
      <div class="spell-form-actions">
        <button type="button" onclick="FichaAtaques.editor.cerrarFormulario()">Cancelar</button>
        <button type="button" class="add" onclick="FichaAtaques.guardarDesdeFormulario()">💾 Guardar</button>
      </div>
    </div>`;
  }
  function alternarEscala() { const t = $('af-escala'), c = $('af-tabla-campos'); if (t && c) c.style.display = t.value === 'tabla' ? 'block' : 'none'; }
  function alternarDano() { const on = $('af-condano').checked; $('af-dano-campos').style.display = on ? 'block' : 'none'; $('af-libre-campos').style.display = on ? 'none' : 'block'; }
  function guardarDesdeFormulario() {
    const nombre = ($('af-nombre').value || '').trim();
    if (!nombre) { alert('El ataque necesita un nombre.'); return; }
    const conDano = $('af-condano').checked;
    const m = { nombre, habilidad: $('af-hab').value, competente: $('af-comp').checked, bonoExtra: num($('af-bonoextra').value, 0), soloDano: $('af-solodano').checked, dano: null, tipo: '', notas: ($('af-notas').value || '').trim(), escala: { tipo: 'ninguna', tabla: '' } };
    if (conDano) {
      const hab = $('af-modhab').value, fijo = num($('af-modfijo').value, 0), prof = $('af-modprof').checked;
      const mod = prof ? { hab: hab || undefined, prof: true, fijo } : (hab && !fijo ? hab : (hab ? { hab, fijo } : fijo));
      m.dano = { count: Math.max(1, num($('af-count').value, 1)), sides: Math.max(2, num($('af-sides').value, 8)), mod };
      m.tipo = ($('af-tipo').value || '').trim();
      m.escala = { tipo: $('af-escala').value, tabla: ($('af-tabla').value || '').trim() };
      if (m.escala.tipo === 'tabla' && !parseTabla(m.escala.tabla).length) { alert('La tabla de escalado no tiene líneas válidas. Usa el formato «5: 1d10», una por línea.'); return; }
    } else {
      const libre = ($('af-libre').value || '').trim(); if (libre) m.textoLibre = libre;
    }
    editor.guardarDesdeFormulario(m);
  }
  function editar(idx) { editor.mostrarFormulario(idx); }
  function eliminar(idx) { const a = lista()[idx]; editor.eliminar(idx, `¿Quitar el ataque «${a ? a.nombre : ''}» de la tabla?`); }

  // ------------------------------------------------------------------ arranque
  function iniciar(personaje) {
    P = personaje;
    const semilla = (P.ataques || []).map((a, i) => (esFija(a) ? { fija: i } : aModelo(a)));
    editor = FichaComun.crearEditorDeLista({
      storageKey: 'ataques-json', datosIniciales: semilla, contenedorListaId: 'ataques-lista', contenedorFormId: 'ataques-form-container',
      filaVacia: '<tr><td colspan="5" class="texto-suave">Sin ataques todavía: usa «➕ Agregar ataque».</td></tr>',
      alCambiar: () => { repintar(); document.dispatchEvent(new CustomEvent('ficha:ataques')); },
      renderFila: filaEditable, renderFormulario: formulario,
    });
    api.editor = editor;
    repintar();
  }

  const api = { iniciar, lista, repintar, editar, eliminar, guardarDesdeFormulario, alternarEscala, alternarDano, editor: null, _dadoEscalado: dadoEscalado, _parseTabla: parseTabla };
  window.FichaAtaques = api;
})();

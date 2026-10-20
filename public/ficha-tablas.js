/*
 * ficha-tablas.js — tablas aleatorias de la carcasa (p. ej. Wild Magic Surge): se tiran con un botón, se muestran en el historial de
 * tiradas y se pueden editar entrada por entrada (agregar, corregir, quitar) para ajustarlas al libro o a la mesa.
 *
 * Declaración en personajes/<id>.js:
 *   tablas: [{ id:'wild-magic', nombre:'Wild Magic Surge', icono:'🌀', dado:100, nota:'texto de ayuda',
 *              previo:{ dado:20, dispara:1, etiqueta:'¿Sobrecarga?', texto:'cuándo se tira' },     (opcional: d20 que decide si se tira la tabla)
 *              entradas:[[desde, hasta, 'efecto'], …] }]                                           (para d100, 100 se muestra como «00»)
 * Las entradas se guardan por personaje en datos/tabla-<id>-json (la semilla es `entradas`; lo editado manda, igual que el inventario).
 *
 *   FichaTablas.iniciar(P)        crea los editores y engancha los botones (después de FichaComun.setCharRef y de dibujar la ficha)
 *   FichaTablas.tirar(id)         tira en la tabla, muestra y guarda el resultado en el historial
 *   FichaTablas.previo(id)        tira el d20 previo y, si sale el valor que dispara, tira en la tabla
 *   FichaTablas.agregar(id) / editar(id, idx) / eliminar(id, idx) / guardarDesdeFormulario(id)
 *   FichaTablas.configurar(id)    ⚙️ cambia las caras del dado de la tabla, si hay d20 previo, sus caras y el número que activa el efecto
 *                                 (igual / menor o igual / mayor o igual); se guarda en datos/tabla-<id>-config y manda sobre la declaración.
 */
(function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const num = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? (d == null ? 0 : d) : n; };

  const tablas = {};   // id → { def, editor }

  const rango = (e, dado) => {
    const f = (n) => (dado === 100 && n === 100 ? '00' : (dado >= 100 ? String(n).padStart(2, '0') : String(n)));
    return e.desde === e.hasta ? f(e.desde) : f(e.desde) + '–' + f(e.hasta);
  };
  const aEntrada = (x) => (Array.isArray(x) ? { desde: x[0], hasta: x[1], texto: x[2] } : { desde: num(x.desde), hasta: num(x.hasta, num(x.desde)), texto: String(x.texto || '') });

  // Configuración efectiva: lo declarado en el personaje y, encima, lo que el jugador cambió con ⚙️ (mesas con tablas propias).
  function cfg(id) {
    const t = tablas[id], d = t.def, p = d.previo || {};
    const base = { dado: d.dado || 100, previoOn: !!d.previo, previoDado: p.dado || 20, dispara: p.dispara == null ? 1 : p.dispara, cmp: p.cmp || '=' };
    let guardada = {};
    try { const v = ($('tabla-' + id + '-config') || {}).value; if (v) guardada = JSON.parse(v) || {}; } catch (e) { guardada = {}; }
    const out = Object.assign({}, base);
    if (guardada.dado >= 2) out.dado = guardada.dado;
    if (typeof guardada.previoOn === 'boolean') out.previoOn = guardada.previoOn;
    if (guardada.previoDado >= 2) out.previoDado = guardada.previoDado;
    if (guardada.dispara != null && !isNaN(guardada.dispara)) out.dispara = guardada.dispara;
    if (['=', '<=', '>='].includes(guardada.cmp)) out.cmp = guardada.cmp;
    return out;
  }
  const CMP_TXT = { '=': '=', '<=': '≤', '>=': '≥' };
  const cumple = (n, c) => (c.cmp === '<=' ? n <= c.dispara : c.cmp === '>=' ? n >= c.dispara : n === c.dispara);
  function pintarEtiquetas(id) {
    const t = tablas[id]; if (!t) return;
    const c = cfg(id);
    const set = (suf, txt) => { const e = $('tabla-' + id + '-' + suf); if (e) e.textContent = txt; };
    set('btn-tirar', `🎲 Tirar en la tabla (d${c.dado})`);
    set('th', 'd' + c.dado);
    const bp = $('tabla-' + id + '-btn-previo');
    if (bp) {
      bp.hidden = !c.previoOn;
      bp.textContent = `🎯 d${c.previoDado}: ${(t.def.previo && t.def.previo.etiqueta) ? t.def.previo.etiqueta.replace(/\s*\(.*\)\s*$/, '') : '¿se tira la tabla?'} (${CMP_TXT[c.cmp]} ${c.dispara})`;
    }
  }

  function buscar(t, n) { return t.editor.items().findIndex((e) => n >= e.desde && n <= e.hasta); }

  function resaltar(id, idx) {
    if (tablas[id]) tablas[id].resaltada = idx;   // se recuerda: la lista se vuelve a dibujar al sincronizar o editar
    const cont = $('tabla-' + id + '-lista'); if (!cont) return;
    Array.from(cont.children).forEach((tr, i) => tr.classList.toggle('tabla-resaltada', i === idx));
    const tr = cont.children[idx]; if (tr && tr.scrollIntoView) { const det = cont.closest('details'); if (det && det.open) tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function pintarResultado(id, html) {
    const r = $('tabla-' + id + '-resultado'); if (!r) return;
    r.hidden = false; r.innerHTML = html;
  }

  function tirar(id) {
    const t = tablas[id]; if (!t) return null;
    const dado = cfg(id).dado;
    const r = window.FichaDados ? FichaDados.calcular({ count: 1, sides: dado, mod: 0 }) : { total: 1 + Math.floor(Math.random() * dado) };
    if (r.error) return null;
    const n = r.total, idx = buscar(t, n);
    const e = idx >= 0 ? t.editor.items()[idx] : null;
    const rotulo = `${t.def.icono || '🎲'} ${t.def.nombre}`;
    const cuerpo = e ? `${rango(e, dado)}: ${e.texto}` : 'La tabla no tiene una entrada para este número.';
    if (window.FichaDados) FichaDados.mostrar(dado === 100 && n === 100 ? '00' : n, `${rotulo} — ${cuerpo.length > 110 ? cuerpo.slice(0, 107) + '…' : cuerpo}`, cuerpo);
    pintarResultado(id, `<span><strong>${esc(rotulo)} · d${dado}: ${dado === 100 && n === 100 ? '00' : n}</strong><br>${e ? esc(e.texto) : 'La tabla no tiene una entrada para este número. Agrégala con «➕ Agregar entrada».'}</span>`);
    resaltar(id, idx);
    return { n, entrada: e };
  }

  function previo(id) {
    const t = tablas[id]; if (!t || !cfg(id).previoOn) return tirar(id);
    const p = t.def.previo || {}, c = cfg(id);
    const r = FichaDados.calcular({ count: 1, sides: c.previoDado, mod: 0 });
    if (r.error) return null;
    const dispara = cumple(r.total, c);
    FichaDados.mostrar(r.total, `${t.def.icono || '🎲'} d${c.previoDado} previo (se activa con ${CMP_TXT[c.cmp]} ${c.dispara}) — ${dispara ? 'se activa' : 'no se activa'}`, p.texto || '');
    if (!dispara) { pintarResultado(id, `<span><strong>d${c.previoDado}: ${r.total}</strong> — no se activa (hace falta ${CMP_TXT[c.cmp]} ${c.dispara}).</span>`); return { n: r.total, dispara: false }; }
    return tirar(id);
  }

  // ------------------------------------------------------------------ edición
  const L = (t, el) => `<label class="campo-rotulado"><span class="campo-etiqueta">${t}</span>${el}</label>`;
  function formulario(id, e) {
    return `<div class="spell-form">
      <p class="spell-form-label">${e ? 'Editar entrada' : 'Agregar entrada'}</p>
      <div class="spell-form-row-dado">
        ${L('Desde', `<input type="number" id="tf-desde" min="1" value="${e ? e.desde : ''}">`)}
        ${L('Hasta', `<input type="number" id="tf-hasta" min="1" value="${e ? e.hasta : ''}">`)}
      </div>
      ${L('Efecto', `<textarea id="tf-texto" rows="3">${esc(e ? e.texto : '')}</textarea>`)}
      <div class="spell-form-actions">
        <button type="button" onclick="FichaTablas.cerrar('${id}')">Cancelar</button>
        <button type="button" class="add" onclick="FichaTablas.guardarDesdeFormulario('${id}')">💾 Guardar</button>
      </div>
    </div>`;
  }
  function guardarDesdeFormulario(id) {
    const t = tablas[id]; if (!t) return;
    const desde = num($('tf-desde').value, 0), hasta = num($('tf-hasta').value, desde), texto = ($('tf-texto').value || '').trim();
    const dado = cfg(id).dado;
    if (!(desde >= 1 && hasta >= desde && hasta <= dado)) { alert(`El rango tiene que estar entre 1 y ${dado}, con «desde» menor o igual que «hasta».`); return; }
    if (!texto) { alert('Escribe el efecto.'); return; }
    t.editor.guardarDesdeFormulario({ desde, hasta, texto });
    // las entradas se mantienen ordenadas por rango
    const items = t.editor.items(); items.sort((a, b) => a.desde - b.desde); t.editor.renderizar();
    if (window.FichaComun) FichaComun.guardarCampo('tabla-' + id + '-json', JSON.stringify(items));
  }
  function agregar(id) { const t = tablas[id]; if (t) { const det = $('tabla-' + id + '-lista').closest('details'); if (det) det.open = true; t.editor.mostrarFormulario(); } }
  function editar(id, idx) { const t = tablas[id]; if (t) t.editor.mostrarFormulario(idx); }
  function cerrar(id) { const t = tablas[id]; if (t) t.editor.cerrarFormulario(); }
  function eliminar(id, idx) {
    const t = tablas[id]; if (!t) return;
    const e = t.editor.items()[idx];
    t.editor.eliminar(idx, `¿Quitar la entrada ${e ? rango(e, cfg(id).dado) : ''} de la tabla?`);
  }

  function formularioConfig(id) {
    const c = cfg(id);
    const opt = (v, t) => `<option value="${v}"${c.cmp === v ? ' selected' : ''}>${t}</option>`;
    return `<div class="spell-form">
      <p class="spell-form-label">⚙️ Dados de la tabla</p>
      <div class="spell-form-row-dado">
        ${L('Caras del dado de la tabla', `<input type="number" id="tf-dado" min="2" max="1000" value="${c.dado}">`)}
        <label><input type="checkbox" id="tf-previo-on" ${c.previoOn ? 'checked' : ''}> Tirar antes un dado que decide si se activa</label>
      </div>
      <div class="spell-form-row-dado">
        ${L('Caras del dado previo', `<input type="number" id="tf-previo-dado" min="2" max="1000" value="${c.previoDado}">`)}
        ${L('Se activa cuando sale', `<select id="tf-cmp">${opt('=', 'igual a')}${opt('<=', 'menor o igual a')}${opt('>=', 'mayor o igual a')}</select>`)}
        ${L('Número', `<input type="number" id="tf-dispara" min="1" value="${c.dispara}">`)}
      </div>
      <p class="texto-suave"><small>Las entradas cuyo rango pase de las caras del dado no saldrán nunca; ajústalas con ✏️.</small></p>
      <div class="spell-form-actions">
        <button type="button" onclick="FichaTablas.cerrarConfig('${id}')">Cancelar</button>
        <button type="button" onclick="FichaTablas.guardarConfig('${id}', true)">Restablecer</button>
        <button type="button" class="add" onclick="FichaTablas.guardarConfig('${id}')">💾 Guardar</button>
      </div>
    </div>`;
  }
  function configurar(id) { const f = $('tabla-' + id + '-config-form'); if (f && tablas[id]) f.innerHTML = formularioConfig(id); }
  function cerrarConfig(id) { const f = $('tabla-' + id + '-config-form'); if (f) f.innerHTML = ''; }
  function guardarConfig(id, restablecer) {
    const h = $('tabla-' + id + '-config'); if (!h || !tablas[id]) return;
    let nuevo = '';
    if (!restablecer) {
      const dado = num($('tf-dado').value, 0), pd = num($('tf-previo-dado').value, 0), k = num($('tf-dispara').value, 0);
      if (dado < 2 || dado > 1000) { alert('El dado de la tabla tiene que tener entre 2 y 1000 caras.'); return; }
      if ($('tf-previo-on').checked && (pd < 2 || k < 1 || k > pd)) { alert('El dado previo necesita 2 caras o más y un número entre 1 y sus caras.'); return; }
      nuevo = JSON.stringify({ dado, previoOn: $('tf-previo-on').checked, previoDado: pd >= 2 ? pd : 20, dispara: k >= 1 ? k : 1, cmp: $('tf-cmp').value });
    }
    h.value = nuevo; h.dispatchEvent(new Event('input', { bubbles: true }));
    cerrarConfig(id); pintarEtiquetas(id); tablas[id].editor.renderizar();
  }

  // ------------------------------------------------------------------ arranque
  function iniciar(P) {
    (P.tablas || []).forEach((def) => {
      const id = def.id;
      const editor = FichaComun.crearEditorDeLista({
        storageKey: 'tabla-' + id + '-json', datosIniciales: (def.entradas || []).map(aEntrada),
        contenedorListaId: 'tabla-' + id + '-lista', contenedorFormId: 'tabla-' + id + '-form',
        filaVacia: '<tr><td colspan="3" class="texto-suave">La tabla está vacía: usa «➕ Agregar entrada».</td></tr>',
        alCambiar: () => { const c = $('tabla-' + id + '-cuenta'); if (c) c.textContent = String(editor.items().length); },
        renderFila: (e, idx) => { const dado = tablas[id] ? cfg(id).dado : (def.dado || 100); return `<tr data-idx="${idx}"${tablas[id] && tablas[id].resaltada === idx ? ' class="tabla-resaltada"' : ''}${e.hasta > dado ? ' title="Fuera del dado actual: no saldrá"' : ''}><td data-etiqueta="d${dado}"><strong>${esc(rango(e, dado))}</strong></td><td data-etiqueta="Efecto">${esc(e.texto)}</td>
          <td data-etiqueta="Acciones"><div class="spell-item-actions"><button type="button" class="btn-roll btn-roll-sm" onclick="FichaTablas.editar('${id}', ${idx})" title="Editar la entrada" aria-label="Editar la entrada ${esc(rango(e, dado))}">✏️</button><button type="button" class="btn-clear" onclick="FichaTablas.eliminar('${id}', ${idx})" title="Quitar la entrada" aria-label="Quitar la entrada ${esc(rango(e, dado))}">🗑️</button></div></td></tr>`; },
        renderFormulario: (e) => formulario(id, e),
      });
      tablas[id] = { def, editor };
      const c = $('tabla-' + id + '-cuenta'); if (c) c.textContent = String(editor.items().length);
      pintarEtiquetas(id);
    });
    // al llegar la configuración guardada (sincronización) se repintan las etiquetas y la lista con el dado vigente
    document.addEventListener('ficha:datos-sincronizados', () => Object.keys(tablas).forEach((k) => { pintarEtiquetas(k); tablas[k].editor.renderizar(); }));
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest && ev.target.closest('[data-tabla-tirar],[data-tabla-previo]'); if (!b) return;
      if (b.dataset.tablaTirar) tirar(b.dataset.tablaTirar); else previo(b.dataset.tablaPrevio);
    });
  }

  window.FichaTablas = { iniciar, tirar, previo, agregar, editar, eliminar, cerrar, guardarDesdeFormulario, configurar, cerrarConfig, guardarConfig, cfg, _tablas: tablas };
})();

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
    const dado = t.def.dado || 100;
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
    const t = tablas[id]; if (!t || !t.def.previo) return tirar(id);
    const p = t.def.previo, r = FichaDados.calcular({ count: 1, sides: p.dado || 20, mod: 0 });
    if (r.error) return null;
    const dispara = r.total === (p.dispara == null ? 1 : p.dispara);
    FichaDados.mostrar(r.total, `${t.def.icono || '🎲'} ${p.etiqueta || 'd' + (p.dado || 20) + ' previo'} — ${dispara ? 'sale la sobrecarga' : 'sin sobrecarga'}`, p.texto || '');
    if (!dispara) { pintarResultado(id, `<span><strong>d${p.dado || 20}: ${r.total}</strong> — no hay sobrecarga esta vez.</span>`); return { n: r.total, dispara: false }; }
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
    const dado = t.def.dado || 100;
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
    t.editor.eliminar(idx, `¿Quitar la entrada ${e ? rango(e, t.def.dado || 100) : ''} de la tabla?`);
  }

  // ------------------------------------------------------------------ arranque
  function iniciar(P) {
    (P.tablas || []).forEach((def) => {
      const id = def.id, dado = def.dado || 100;
      const editor = FichaComun.crearEditorDeLista({
        storageKey: 'tabla-' + id + '-json', datosIniciales: (def.entradas || []).map(aEntrada),
        contenedorListaId: 'tabla-' + id + '-lista', contenedorFormId: 'tabla-' + id + '-form',
        filaVacia: '<tr><td colspan="3" class="texto-suave">La tabla está vacía: usa «➕ Agregar entrada».</td></tr>',
        alCambiar: () => { const c = $('tabla-' + id + '-cuenta'); if (c) c.textContent = String(editor.items().length); },
        renderFila: (e, idx) => `<tr data-idx="${idx}"${tablas[id] && tablas[id].resaltada === idx ? ' class="tabla-resaltada"' : ''}><td data-etiqueta="d${dado}"><strong>${esc(rango(e, dado))}</strong></td><td data-etiqueta="Efecto">${esc(e.texto)}</td>
          <td data-etiqueta="Acciones"><div class="spell-item-actions"><button type="button" class="btn-roll btn-roll-sm" onclick="FichaTablas.editar('${id}', ${idx})" title="Editar la entrada" aria-label="Editar la entrada ${esc(rango(e, dado))}">✏️</button><button type="button" class="btn-clear" onclick="FichaTablas.eliminar('${id}', ${idx})" title="Quitar la entrada" aria-label="Quitar la entrada ${esc(rango(e, dado))}">🗑️</button></div></td></tr>`,
        renderFormulario: (e) => formulario(id, e),
      });
      tablas[id] = { def, editor };
      const c = $('tabla-' + id + '-cuenta'); if (c) c.textContent = String(editor.items().length);
    });
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest && ev.target.closest('[data-tabla-tirar],[data-tabla-previo]'); if (!b) return;
      if (b.dataset.tablaTirar) tirar(b.dataset.tablaTirar); else previo(b.dataset.tablaPrevio);
    });
  }

  window.FichaTablas = { iniciar, tirar, previo, agregar, editar, eliminar, cerrar, guardarDesdeFormulario, _tablas: tablas };
})();

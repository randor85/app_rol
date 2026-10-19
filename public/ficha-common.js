/*
 * ficha-common.js — motor compartido de fichas de personaje.
 *
 * Objetivo: que el autoguardado, el modo lectura, y el editor add/edit/delete
 * de listas (hechizos, inventario, y cualquier lista futura) vivan en UN SOLO
 * archivo, cargado por cada ficha con <script src="ficha-common.js">, igual
 * que ya se hace con spells_data.js/classes_data.js — ese mecanismo ya existe
 * en el proyecto, acá se extiende de "datos compartidos" a "funciones
 * compartidas". Sin build, sin framework: sigue siendo un sitio estático.
 *
 * Cada ficha define un FICHA_CONFIG chico ANTES de este script (su id,
 * los ids de sus tarjetas de espacio de conjuro si las tiene, y los datos
 * semilla de sus listas) y llama a las funciones de acá para todo lo
 * genérico — lo único que escribe cada ficha es su HTML/CSS propio y su
 * config, no lógica.
 *
 * Validado primero en randor85/app_rol-sandbox con localStorage (sin riesgo);
 * esta versión usa Firebase Realtime Database de verdad, vía charRef — el
 * mismo objeto que cada ficha ya calcula según campaña/owner.
 */
(function () {
  'use strict';

  if (typeof FICHA_CONFIG === 'undefined') {
    console.error('ficha-common.js requiere que la ficha defina FICHA_CONFIG antes de cargar este script.');
    return;
  }

  let modoLectura = false;
  let charRef = null;
  const editoresDeLista = {}; // storageKey -> { resincronizarDesdeValor, sembrarSiVacioEnFirebase }

  // ============================================================
  // 1. ALMACENAMIENTO (Firebase) — si el día de mañana hiciera
  //    falta otro backend, esta es la única sección a tocar.
  // ============================================================
  function setCharRef(ref) {
    charRef = ref;
  }
  function guardarCampo(fieldId, value) {
    if (modoLectura || !charRef) return;
    charRef.child('datos/' + fieldId).set(value);
  }

  // ============================================================
  // 2. AUTOGUARDADO GENÉRICO — cualquier input/select/textarea
  //    con id se guarda solo, igual que en el resto de la flota.
  // ============================================================
  function valorDeCampo(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.isContentEditable) return el.innerText;
    return el.value;
  }
  document.addEventListener('input', (e) => {
    if (modoLectura) return;
    if (e.target.matches('input, select, textarea, [contenteditable="true"]') && e.target.id) {
      guardarCampo(e.target.id, valorDeCampo(e.target));
    }
  });
  document.addEventListener('change', (e) => {
    if (modoLectura) return;
    if (e.target.matches('input[type="checkbox"], select, textarea') && e.target.id) {
      guardarCampo(e.target.id, valorDeCampo(e.target));
    }
  });

  // ============================================================
  // 3. SINCRONIZACIÓN DESDE FIREBASE — los campos simples se
  //    vuelcan al DOM igual que siempre (sincronizarDatosDesdeNube
  //    de cualquier ficha); los campos que son listas registradas
  //    (hechizos-json, inventario-json) delegan al editor
  //    correspondiente, con su propio guard anti-pisado.
  // ============================================================
  function sincronizarDatosDesdeNube() {
    if (!charRef) return;
    // Antes de escuchar cambios, cada editor de lista revisa una sola vez si
    // ya hay algo guardado; si no, siembra sus datos iniciales. Así un
    // personaje nuevo arranca con su semilla persistida de verdad, no solo
    // en memoria.
    Object.values(editoresDeLista).forEach(ed => ed.sembrarSiVacioEnFirebase());

    charRef.child('datos').on('value', (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      Object.keys(data).forEach(id => {
        if (editoresDeLista[id]) {
          editoresDeLista[id].resincronizarDesdeValor(data[id]);
          return;
        }
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') {
          if (el.checked !== data[id]) el.checked = data[id];
        } else if (el.tagName === 'SPAN' || el.tagName === 'DIV') {
          if (el.textContent !== String(data[id]) && document.activeElement !== el) el.textContent = data[id];
        } else if (el.value !== String(data[id]) && document.activeElement !== el) {
          el.value = data[id];
        }
      });
    });
  }

  // ============================================================
  // 4. MODO LECTURA — idéntico al del resto de la flota.
  // ============================================================
  function aplicarModoLectura(soloLectura) {
    modoLectura = soloLectura;
    // FICHA_CONFIG.wrapperSelector es opcional — por defecto '.sheet' (la
    // convención de la mayoría de la flota), pero alguna ficha real usa otro
    // selector para su contenedor raíz (p.ej. '.container').
    const selector = FICHA_CONFIG.wrapperSelector || '.sheet';
    const wrapper = document.querySelector(selector);
    const banner = document.getElementById('readonly-banner');
    if (wrapper) wrapper.classList.toggle('readonly-mode', soloLectura);
    if (banner) banner.style.display = soloLectura ? 'block' : 'none';
    document.querySelectorAll(`${selector} input, ${selector} select, ${selector} textarea, ${selector} [contenteditable]`).forEach(el => {
      if (el.hasAttribute('contenteditable')) el.setAttribute('contenteditable', soloLectura ? 'false' : 'true');
      else el.disabled = soloLectura;
    });
  }

  // ============================================================
  // 5. EDITOR GENÉRICO DE LISTAS — la base que usan tanto el
  //    inventario como los hechizos (y cualquier lista futura).
  //    Se guarda como JSON string en datos/{storageKey}, mismo
  //    formato que ya usa inventario-json en el resto de la flota.
  // ============================================================
  function crearEditorDeLista(opts) {
    // Semilla local inmediata para que la ficha no se vea vacía mientras
    // Firebase todavía no contestó — se reemplaza en cuanto llega el
    // snapshot real (o se persiste tal cual si de verdad no hay nada).
    let items = (opts.datosIniciales || []).map(x => ({ ...x }));
    let editandoIdx = null;

    function formularioAbierto() {
      const cont = document.getElementById(opts.contenedorFormId);
      return !!(cont && cont.innerHTML.trim().length);
    }
    function renderizar() {
      const cont = document.getElementById(opts.contenedorListaId);
      if (!cont) return;
      cont.innerHTML = items.length
        ? items.map((item, idx) => opts.renderFila(item, idx)).join('')
        : (opts.filaVacia || '<tr><td colspan="99">Sin elementos todavía.</td></tr>');
    }
    function guardar() {
      guardarCampo(opts.storageKey, JSON.stringify(items));
      renderizar();
    }
    function mostrarFormulario(idx) {
      editandoIdx = (typeof idx === 'number') ? idx : null;
      const cont = document.getElementById(opts.contenedorFormId);
      if (cont) cont.innerHTML = opts.renderFormulario(editandoIdx !== null ? items[editandoIdx] : null);
    }
    function cerrarFormulario() {
      editandoIdx = null;
      const cont = document.getElementById(opts.contenedorFormId);
      if (cont) cont.innerHTML = '';
    }
    function guardarDesdeFormulario(nuevoItem) {
      if (editandoIdx !== null) items[editandoIdx] = nuevoItem;
      else items.push(nuevoItem);
      cerrarFormulario();
      guardar();
    }
    function eliminar(idx, mensajeConfirm) {
      if (!confirm(mensajeConfirm || '¿Eliminar este elemento?')) return;
      items.splice(idx, 1);
      guardar();
    }
    // Modifica un elemento existente in-place sin pasar por el formulario de
    // edición — lo usan los botones de "uso directo" (p.ej. gastar 1 poción).
    function mutar(idx, fn) {
      const item = items[idx];
      if (!item) return;
      fn(item);
      guardar();
    }
    // Llamado por sincronizarDatosDesdeNube() en cada snapshot. Si hay un
    // formulario de edición abierto, no lo pisa (mismo guard que el
    // inventario real de toda la flota). Si el valor remoto está vacío/roto,
    // no toca nada acá — la siembra inicial la resuelve sembrarSiVacioEnFirebase.
    function resincronizarDesdeValor(raw) {
      if (formularioAbierto()) return;
      let parsed = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
      if (Array.isArray(parsed)) {
        items = parsed;
        renderizar();
      }
    }
    // Se corre una sola vez, antes de empezar a escuchar cambios: si el
    // personaje es nuevo y todavía no tiene nada guardado bajo este
    // storageKey, persiste la semilla de FICHA_CONFIG. Si ya había algo
    // real, no toca nada (evita pisar datos de un jugador existente).
    function sembrarSiVacioEnFirebase() {
      if (!charRef) return;
      charRef.child('datos/' + opts.storageKey).once('value').then(snap => {
        if (!snap.exists() && opts.datosIniciales && opts.datosIniciales.length) {
          guardarCampo(opts.storageKey, JSON.stringify(items));
        }
      });
    }

    renderizar();
    editoresDeLista[opts.storageKey] = { resincronizarDesdeValor, sembrarSiVacioEnFirebase };
    return { items: () => items, mostrarFormulario, cerrarFormulario, guardarDesdeFormulario, eliminar, mutar, renderizar, editandoIdx: () => editandoIdx };
  }

  // ============================================================
  // 6. EDITOR DE HECHIZOS — una sola tabla para los hechizos de
  //    clase (migrados a datos) y los agregados del compendio,
  //    con área y ataque/salvación como campos opcionales.
  // ============================================================
  function etiquetaNivelConjuro(nivel) {
    if (nivel === 0) return 'Cantrip';
    const sufijo = nivel === 1 ? 'st' : nivel === 2 ? 'nd' : nivel === 3 ? 'rd' : 'th';
    return nivel + sufijo;
  }

  function iniciarEditorHechizos() {
    const editor = crearEditorDeLista({
      storageKey: 'hechizos-json',
      datosIniciales: FICHA_CONFIG.hechizosIniciales,
      contenedorListaId: 'hechizos-lista',
      contenedorFormId: 'hechizos-form-container',
      filaVacia: '<tr><td colspan="5" style="color:var(--text-muted);font-size:0.85rem;">Sin hechizos agregados todavía.</td></tr>',
      renderFila: (h, idx) => {
        const nombreEsc = h.nombre.replace(/'/g, "\\'");
        const accionBtn = h.formula
          ? `<button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx})">🎲 ${h.formula.count}d${h.formula.sides}${h.formula.mod ? (h.formula.mod > 0 ? '+' : '') + h.formula.mod : ''}</button>`
          : `<button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx})">✅ Usar</button>`;
        const ataqueBadge = !h.ataque ? '' :
          h.ataque.tipo === 'ataque'
            ? `<span class="tag tag-atk">🎯 +${h.ataque.bonus} Ataque</span>`
            : `<span class="tag tag-atk">🛡️ ${h.ataque.habilidad} DC ${h.ataque.dc}</span>`;
        const areaTxt = h.area ? ` · 📐 ${h.area}` : '';
        return `
          <tr>
            <td><span class="tag">${h.especial ? '⭐ ' : ''}${etiquetaNivelConjuro(h.nivel)}</span></td>
            <td><strong>${h.nombre}</strong>${ataqueBadge ? ' ' + ataqueBadge : ''}</td>
            <td>${h.tiempo} / ${h.alcance}${areaTxt}</td>
            <td>${h.resumen} <em>(${h.duracion})</em></td>
            <td class="spell-item-actions">
              ${accionBtn}
              ${!h.especial ? `<button class="btn-roll btn-roll-sm" onclick="FichaHechizos.editor.mostrarFormulario(${idx})">✏️ Editar</button>` : ''}
              <button class="btn-clear" onclick="FichaHechizos.editor.eliminar(${idx}, '¿Quitar \\'${nombreEsc}\\' de la ficha?')">🗑️</button>
            </td>
          </tr>
        `;
      },
      renderFormulario: (h) => `
        <div class="spell-form">
          <p class="spell-form-label">${h ? 'Editar hechizo' : 'Agregar hechizo'}</p>
          <input type="text" id="hf-nombre" placeholder="Nombre" value="${h ? h.nombre : ''}">
          <input type="number" id="hf-nivel" placeholder="Nivel (0 = truco)" min="0" max="9" value="${h ? h.nivel : 0}">
          <input type="text" id="hf-tiempo" placeholder="Tiempo de lanzamiento" value="${h ? h.tiempo : ''}">
          <input type="text" id="hf-alcance" placeholder="Alcance" value="${h ? h.alcance : ''}">
          <input type="text" id="hf-area" placeholder="Área (opcional, p.ej. Esfera 20 ft)" value="${h && h.area ? h.area : ''}">
          <textarea id="hf-resumen" placeholder="Resumen y efecto mecánico" rows="2">${h ? h.resumen : ''}</textarea>
          <input type="text" id="hf-duracion" placeholder="Duración" value="${h ? h.duracion : ''}">
          <div class="spell-form-row-dado">
            <span class="spell-form-mini-label">Tirada automática (opcional):</span>
            <input type="number" id="hf-dado-cant" placeholder="cant." min="0" value="${h && h.formula ? h.formula.count : ''}">
            <span>d</span>
            <input type="number" id="hf-dado-caras" placeholder="caras" min="0" value="${h && h.formula ? h.formula.sides : ''}">
            <span>mod.</span>
            <input type="number" id="hf-dado-mod" placeholder="±" value="${h && h.formula ? h.formula.mod : ''}">
          </div>
          <div class="spell-form-row-dado">
            <span class="spell-form-mini-label">Ataque / Salvación (opcional):</span>
            <select id="hf-ataque-tipo" onchange="FichaHechizos.alternarCamposAtaque()">
              <option value="">Ninguno</option>
              <option value="ataque" ${h && h.ataque && h.ataque.tipo === 'ataque' ? 'selected' : ''}>Tirada de ataque</option>
              <option value="salvacion" ${h && h.ataque && h.ataque.tipo === 'salvacion' ? 'selected' : ''}>Salvación</option>
            </select>
            <input type="number" id="hf-ataque-bonus" placeholder="Bono (+N)" style="width:80px;display:${h && h.ataque && h.ataque.tipo === 'ataque' ? 'inline-block' : 'none'};" value="${h && h.ataque && h.ataque.tipo === 'ataque' ? h.ataque.bonus : ''}">
            <select id="hf-ataque-habilidad" style="display:${h && h.ataque && h.ataque.tipo === 'salvacion' ? 'inline-block' : 'none'};">
              ${['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(a => `<option value="${a}" ${h && h.ataque && h.ataque.habilidad === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
            <input type="number" id="hf-ataque-dc" placeholder="DC" style="width:70px;display:${h && h.ataque && h.ataque.tipo === 'salvacion' ? 'inline-block' : 'none'};" value="${h && h.ataque && h.ataque.tipo === 'salvacion' ? h.ataque.dc : ''}">
          </div>
          <div class="spell-form-actions">
            <button type="button" onclick="FichaHechizos.editor.cerrarFormulario()">Cancelar</button>
            <button type="button" class="add" onclick="FichaHechizos.guardarDesdeFormulario()">💾 Guardar</button>
          </div>
        </div>
      `,
    });

    function alternarCamposAtaque() {
      const tipo = document.getElementById('hf-ataque-tipo').value;
      document.getElementById('hf-ataque-bonus').style.display = tipo === 'ataque' ? 'inline-block' : 'none';
      document.getElementById('hf-ataque-habilidad').style.display = tipo === 'salvacion' ? 'inline-block' : 'none';
      document.getElementById('hf-ataque-dc').style.display = tipo === 'salvacion' ? 'inline-block' : 'none';
    }

    function guardarDesdeFormulario() {
      const nombre = document.getElementById('hf-nombre').value.trim();
      if (!nombre) { alert('El hechizo necesita un nombre.'); return; }
      const nivel = Math.max(0, Math.min(9, parseInt(document.getElementById('hf-nivel').value, 10) || 0));
      const count = parseInt(document.getElementById('hf-dado-cant').value, 10);
      const sides = parseInt(document.getElementById('hf-dado-caras').value, 10);
      const mod = parseInt(document.getElementById('hf-dado-mod').value, 10) || 0;
      const formula = (count > 0 && sides > 0) ? { count, sides, mod } : null;
      const tipoAtaque = document.getElementById('hf-ataque-tipo').value;
      let ataque = null;
      if (tipoAtaque === 'ataque') {
        ataque = { tipo: 'ataque', bonus: parseInt(document.getElementById('hf-ataque-bonus').value, 10) || 0 };
      } else if (tipoAtaque === 'salvacion') {
        ataque = {
          tipo: 'salvacion',
          habilidad: document.getElementById('hf-ataque-habilidad').value,
          dc: parseInt(document.getElementById('hf-ataque-dc').value, 10) || 0,
        };
      }
      editor.guardarDesdeFormulario({
        nombre, nivel,
        tiempo: document.getElementById('hf-tiempo').value.trim(),
        alcance: document.getElementById('hf-alcance').value.trim(),
        area: document.getElementById('hf-area').value.trim(),
        resumen: document.getElementById('hf-resumen').value.trim(),
        duracion: document.getElementById('hf-duracion').value.trim(),
        formula,
        ataque,
        slotCost: nivel > 0 ? nivel : null,
      });
    }

    function usar(idx) {
      const h = editor.items()[idx];
      if (!h || modoLectura) return;
      if (h.slotCost) {
        // Se construye el id directo ('slot-N-cur') en vez de indexar
        // FICHA_CONFIG.slotsIds por posición: esa indexación se rompía
        // (undefined) para cualquier nivel de espacio más allá de
        // slotsIds.length, como pasó de verdad al probar contra los
        // datos reales de Fiona (nivel 5 con un slotsIds de 4 entradas).
        const slotId = `slot-${h.slotCost}-cur`;
        const el = document.getElementById(slotId);
        if (el) {
          const actual = parseInt(el.textContent) || 0;
          if (actual <= 0) { alert(`⚠️ No te quedan espacios de nivel ${h.slotCost} disponibles.`); return; }
          el.textContent = actual - 1;
          guardarCampo(slotId, actual - 1);
        }
      }
      if (h.formula) {
        const tiradas = Array.from({ length: h.formula.count }, () => Math.floor(Math.random() * h.formula.sides) + 1);
        const total = tiradas.reduce((a, b) => a + b, 0) + h.formula.mod;
        alert(`🎲 ${h.nombre}: [${tiradas.join(', ')}]${h.formula.mod ? (h.formula.mod > 0 ? ' +' : ' ') + h.formula.mod : ''} = ${total}`);
      } else {
        alert(`✅ ${h.nombre}: usado (sin tirada automática).`);
      }
    }

    window.FichaHechizos = { editor, usar, guardarDesdeFormulario, alternarCamposAtaque };
  }

  // ============================================================
  // 7. EDITOR DE INVENTARIO — reusa crearEditorDeLista; agrega
  //    categoría (con CA base + tope de DEX para armadura) y
  //    un botón de uso directo para ítems consumibles.
  // ============================================================
  function iniciarEditorInventario() {
    const editor = crearEditorDeLista({
      storageKey: 'inventario-json',
      datosIniciales: FICHA_CONFIG.inventarioInicial,
      contenedorListaId: 'inventario-lista',
      contenedorFormId: 'inventario-form-container',
      filaVacia: '<p class="inventory-empty">Inventario vacío.</p>',
      renderFila: (item, idx) => {
        const nombreEsc = item.nombre.replace(/'/g, "\\'");
        const catLabel = { armadura: '🛡️ Armadura', municion: '🏹 Munición', bienes: '💰 Bienes' }[item.categoria] || '';
        const acInfo = (item.categoria === 'armadura' && item.modAC != null)
          ? ` · CA base ${item.modAC}${item.dexCap === null ? ' + DEX' : item.dexCap === 0 ? ' (sin DEX)' : ` + DEX (máx +${item.dexCap})`}`
          : '';
        const usarBtn = item.consumible
          ? `<button onclick="FichaInventario.usar(${idx})" title="Gasta 1 sin entrar a edición">⚡ Usar</button>`
          : '';
        return `
          <div class="inventory-item">
            <div class="inventory-item-top">
              <span class="inventory-item-name">${item.equipado ? '🛡️ ' : ''}${item.nombre} <span class="inventory-item-meta">x${item.cantidad}${catLabel ? ' · ' + catLabel : ''}${acInfo}</span></span>
              <div class="inventory-item-actions">
                ${usarBtn}
                <button onclick="FichaInventario.editor.mostrarFormulario(${idx})">✏️</button>
                <button onclick="FichaInventario.editor.eliminar(${idx}, '¿Eliminar \\'${nombreEsc}\\' del inventario?')">🗑️</button>
              </div>
            </div>
            <div class="inventory-item-desc">${item.descripcion || ''}</div>
          </div>
        `;
      },
      renderFormulario: (item) => `
        <div class="inventory-form">
          <input type="text" id="if-nombre" placeholder="Nombre" value="${item ? item.nombre : ''}">
          <input type="number" id="if-cantidad" placeholder="Cantidad" min="1" value="${item ? item.cantidad : 1}">
          <select id="if-categoria" onchange="FichaInventario.alternarCamposArmadura()">
            <option value="general" ${!item || item.categoria === 'general' || !item.categoria ? 'selected' : ''}>General</option>
            <option value="armadura" ${item && item.categoria === 'armadura' ? 'selected' : ''}>Armadura</option>
            <option value="municion" ${item && item.categoria === 'municion' ? 'selected' : ''}>Munición</option>
            <option value="bienes" ${item && item.categoria === 'bienes' ? 'selected' : ''}>Bienes comerciales</option>
          </select>
          <div id="if-armadura-campos" class="inventory-armadura-campos" style="display:${item && item.categoria === 'armadura' ? 'flex' : 'none'};">
            <input type="number" id="if-modac" placeholder="CA base" value="${item && item.modAC != null ? item.modAC : ''}">
            <select id="if-dexcap">
              <option value="sin-tope" ${item && item.dexCap === null ? 'selected' : ''}>+ DEX sin tope (ligera)</option>
              <option value="2" ${item && item.dexCap === 2 ? 'selected' : ''}>+ DEX máx +2 (media)</option>
              <option value="0" ${item && item.dexCap === 0 ? 'selected' : ''}>Sin DEX (pesada)</option>
            </select>
          </div>
          <textarea id="if-descripcion" placeholder="Descripción / notas">${item ? item.descripcion || '' : ''}</textarea>
          <label><input type="checkbox" id="if-equipado" ${item && item.equipado ? 'checked' : ''}> Equipado/portado</label>
          <label><input type="checkbox" id="if-consumible" ${item && item.consumible ? 'checked' : ''}> Consumible (botón "⚡ Usar" gasta 1 sin entrar a edición)</label>
          <div class="inventory-form-actions">
            <button type="button" onclick="FichaInventario.editor.cerrarFormulario()">Cancelar</button>
            <button type="button" onclick="FichaInventario.guardarDesdeFormulario()">💾 Guardar</button>
          </div>
        </div>
      `,
    });

    function alternarCamposArmadura() {
      const categoria = document.getElementById('if-categoria').value;
      document.getElementById('if-armadura-campos').style.display = categoria === 'armadura' ? 'flex' : 'none';
    }

    function guardarDesdeFormulario() {
      const nombre = document.getElementById('if-nombre').value.trim();
      if (!nombre) { alert('El ítem necesita un nombre.'); return; }
      const categoria = document.getElementById('if-categoria').value;
      let modAC = null, dexCap = null;
      if (categoria === 'armadura') {
        const modACRaw = parseInt(document.getElementById('if-modac').value, 10);
        modAC = isNaN(modACRaw) ? null : modACRaw;
        const dexCapRaw = document.getElementById('if-dexcap').value;
        dexCap = dexCapRaw === 'sin-tope' ? null : parseInt(dexCapRaw, 10);
      }
      editor.guardarDesdeFormulario({
        nombre,
        cantidad: parseInt(document.getElementById('if-cantidad').value, 10) || 1,
        descripcion: document.getElementById('if-descripcion').value.trim(),
        equipado: document.getElementById('if-equipado').checked,
        consumible: document.getElementById('if-consumible').checked,
        categoria,
        modAC,
        dexCap,
      });
    }

    // "Usar" directo (sin pasar por el formulario de edición): gasta 1 unidad.
    // No borra el ítem automáticamente al llegar a 0 — queda en la lista para
    // que el jugador decida si lo quita.
    function usar(idx) {
      const item = editor.items()[idx];
      if (!item || modoLectura) return;
      if (item.cantidad <= 0) { alert(`No te quedan "${item.nombre}".`); return; }
      editor.mutar(idx, (it) => { it.cantidad -= 1; });
    }

    window.FichaInventario = { editor, guardarDesdeFormulario, alternarCamposArmadura, usar };
  }

  // ============================================================
  // 8. BITÁCORA DE CAMPAÑA — confirmado byte-idéntico en las 6
  //    fichas D&D (renderizarBitacoraFicha/editarEntradaBitacoraFicha/
  //    cancelarEdicionBitacoraFicha/eliminarEntradaBitacoraFicha/
  //    guardarEntradaBitacoraFicha). Se expone como funciones globales
  //    con el MISMO nombre porque el HTML de cada ficha ya las llama
  //    vía onclick="..." — así una ficha migrada no necesita tocar su
  //    markup, solo dejar de definir estas funciones ella misma.
  // ============================================================
  function iniciarBitacora({ db, codigoCampana }) {
    const cont0 = document.getElementById('bitacora-ficha-lista');
    if (!cont0) return; // esta ficha no tiene la tarjeta de bitácora

    let bitacoraFichaCache = {};
    let editandoKeyBitacoraFicha = null;

    function renderizarBitacoraFicha(logs) {
      const cont = document.getElementById('bitacora-ficha-lista');
      if (!cont) return;
      bitacoraFichaCache = {};
      const entradas = Object.entries(logs || {}).map(([key, log]) => ({ key, ...log })).sort((a, b) => (b.fecha || 0) - (a.fecha || 0)).slice(0, 8);
      if (!entradas.length) {
        cont.innerHTML = '<p style="font-size:0.75rem;color:var(--text-muted);">Sin entradas todavía.</p>';
        return;
      }
      cont.innerHTML = entradas.map(log => {
        bitacoraFichaCache[log.key] = { titulo: log.titulo || '', texto: log.texto || '' };
        const esMia = log.personaje === FICHA_CONFIG.nombrePersonaje;
        return `
          <div class="bf-entrada">
            <div class="bf-entrada-head">
              <div class="bf-fecha">${log.fecha ? new Date(log.fecha).toLocaleString() : ''}${log.personaje ? ' · ' + log.personaje : ''}</div>
              ${esMia ? `<div class="bf-entrada-actions">
                <button type="button" onclick="editarEntradaBitacoraFicha('${log.key}')" title="Editar">✏️</button>
                <button type="button" onclick="eliminarEntradaBitacoraFicha('${log.key}')" title="Eliminar">🗑️</button>
              </div>` : ''}
            </div>
            ${log.titulo ? `<strong>${log.titulo}</strong>` : ''}
            <p style="white-space:pre-wrap;margin:2px 0 0;">${log.texto || ''}</p>
          </div>
        `;
      }).join('');
    }
    function editarEntradaBitacoraFicha(key) {
      const entry = bitacoraFichaCache[key];
      if (!entry) return;
      editandoKeyBitacoraFicha = key;
      document.getElementById('bitacora-ficha-titulo').value = entry.titulo;
      document.getElementById('bitacora-ficha-texto').value = entry.texto;
      const btn = document.getElementById('btn-guardar-bitacora-ficha');
      if (btn) btn.innerText = '💾 Guardar Cambios';
      const btnCancelar = document.getElementById('btn-cancelar-bitacora-ficha');
      if (btnCancelar) btnCancelar.style.display = 'inline-block';
      document.getElementById('bitacora-ficha-texto')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function cancelarEdicionBitacoraFicha() {
      editandoKeyBitacoraFicha = null;
      document.getElementById('bitacora-ficha-titulo').value = '';
      document.getElementById('bitacora-ficha-texto').value = '';
      const btn = document.getElementById('btn-guardar-bitacora-ficha');
      if (btn) btn.innerText = 'Guardar Entrada';
      const btnCancelar = document.getElementById('btn-cancelar-bitacora-ficha');
      if (btnCancelar) btnCancelar.style.display = 'none';
    }
    function eliminarEntradaBitacoraFicha(key) {
      if (!codigoCampana) return;
      if (!confirm('¿Eliminar esta entrada de la bitácora?')) return;
      db.ref(`campanas/${codigoCampana}/bitacora/${key}`).remove()
        .catch(err => alert('No se pudo eliminar la entrada: ' + err.message));
    }
    function guardarEntradaBitacoraFicha() {
      if (!codigoCampana) { alert('Esta ficha no está asociada a ninguna campaña.'); return; }
      const tituloEl = document.getElementById('bitacora-ficha-titulo');
      const textoEl = document.getElementById('bitacora-ficha-texto');
      const texto = (textoEl.value || '').trim();
      if (!texto) return;
      if (editandoKeyBitacoraFicha) {
        db.ref(`campanas/${codigoCampana}/bitacora/${editandoKeyBitacoraFicha}`).update({
          titulo: (tituloEl.value || '').trim(),
          texto: texto
        }).then(() => {
          cancelarEdicionBitacoraFicha();
        }).catch(err => alert('No se pudo guardar la edición en la bitácora: ' + err.message));
        return;
      }
      db.ref(`campanas/${codigoCampana}/bitacora`).push({
        titulo: (tituloEl.value || '').trim(),
        texto: texto,
        fecha: firebase.database.ServerValue.TIMESTAMP,
        personaje: FICHA_CONFIG.nombrePersonaje
      }).then(() => {
        tituloEl.value = '';
        textoEl.value = '';
      }).catch(err => alert('No se pudo guardar la entrada en la bitácora: ' + err.message));
    }

    if (codigoCampana) {
      db.ref(`campanas/${codigoCampana}/bitacora`).on('value', snap => renderizarBitacoraFicha(snap.val() || {}));
    } else {
      const bitacoraWrap = document.getElementById('bitacora-section');
      if (bitacoraWrap) bitacoraWrap.style.display = 'none';
    }

    window.editarEntradaBitacoraFicha = editarEntradaBitacoraFicha;
    window.cancelarEdicionBitacoraFicha = cancelarEdicionBitacoraFicha;
    window.eliminarEntradaBitacoraFicha = eliminarEntradaBitacoraFicha;
    window.guardarEntradaBitacoraFicha = guardarEntradaBitacoraFicha;
  }

  // ============================================================
  // 9. PERMISOS (owner/GM/modo lectura) + BOTÓN COMPARTIR +
  //    BLOQUEO POR SISTEMA INCORRECTO — confirmado idéntico en
  //    nevada_jones.html (y el resto de la flota) dentro de
  //    firebase.auth().onAuthStateChanged.
  // ============================================================
  function bloquearPorSistemaIncorrecto(sistemaCampana, codigoCampana) {
    const propio = FICHA_CONFIG.sistemaPropio === 'coc' ? 'Call of Cthulhu' : 'D&D';
    const deCampana = sistemaCampana === 'coc' ? 'Call of Cthulhu' : 'D&D';
    document.body.innerHTML = `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f0f12;color:#e2e8f0;font-family:'Segoe UI',Tahoma,sans-serif;text-align:center;padding:30px;gap:14px;">
      <div style="font-size:3rem;">⚠️</div>
      <h1 style="font-size:1.3rem;color:#e0b84a;">Ficha fuera de sistema</h1>
      <p style="max-width:420px;color:#94a3b8;">Esta ficha es de <strong>${propio}</strong> y la campaña seleccionada es de <strong>${deCampana}</strong>. No se puede abrir esta ficha desde esa campaña.</p>
      <a href="index.html?campana=${codigoCampana}" style="color:#e0b84a;text-decoration:underline;">← Volver al selector de personajes</a>
    </div>`;
  }

  function iniciarPermisosYCompartir({ db, codigoCampana, uid }) {
    if (!charRef) return;
    let ownerReparado = false;

    const gmRefPromise = codigoCampana
      ? db.ref(`campanas/${codigoCampana}/gm`).once('value').then(s => s.val() === uid)
      : Promise.resolve(true);

    gmRefPromise.then(soyElGM => {
      charRef.on('value', snap => {
        const p = snap.val();
        if (!p) return;

        // Auto-reparación: personaje activo sin owner (dato legacy) -> quien lo abre lo reclama.
        if (codigoCampana && p.activo === true && !p.owner && !ownerReparado && !soyElGM) {
          ownerReparado = true;
          charRef.child('owner').set(uid);
          return;
        }

        const esMio = codigoCampana ? (p.owner === uid) : true;
        const soloLectura = codigoCampana ? (!esMio && !soyElGM) : false;
        aplicarModoLectura(soloLectura);

        const btnCompartir = document.getElementById('btn-compartir');
        if (btnCompartir && esMio) {
          btnCompartir.style.display = 'inline-block';
          btnCompartir.innerText = p.publico ? "🔒 Hacer Privada" : "👁️ Compartir Ficha";
          btnCompartir.style.backgroundColor = p.publico ? "#c94a4a" : "#3a7d44";
          btnCompartir.onclick = () => { charRef.child('publico').set(!p.publico); };
        } else if (btnCompartir) {
          btnCompartir.style.display = 'none';
        }
      });
    });
  }

  window.FichaComun = {
    setCharRef, guardarCampo, sincronizarDatosDesdeNube, aplicarModoLectura,
    crearEditorDeLista, iniciarEditorHechizos, iniciarEditorInventario,
    iniciarBitacora, bloquearPorSistemaIncorrecto, iniciarPermisosYCompartir,
  };
})();

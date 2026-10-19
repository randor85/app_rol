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
  // Campos de formularios temporales y selectores de acción (no son datos del
  // personaje): no deben ir a datos/ ni sincronizarse de vuelta.
  const PREFIJOS_EFIMEROS = ['hf-', 'if-', 'rf-', 'upcast-sel-', 'bitacora-ficha-'];
  function esCampoEfimero(id) {
    return PREFIJOS_EFIMEROS.some(p => id.startsWith(p));
  }
  document.addEventListener('input', (e) => {
    if (modoLectura) return;
    if (e.target.matches('input, select, textarea, [contenteditable="true"]') && e.target.id && !esCampoEfimero(e.target.id)) {
      guardarCampo(e.target.id, valorDeCampo(e.target));
    }
  });
  document.addEventListener('change', (e) => {
    if (modoLectura) return;
    if (e.target.matches('input[type="checkbox"], select, textarea') && e.target.id && !esCampoEfimero(e.target.id)) {
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
      // Los valores se aplican por código (sin evento 'input'): avisar para que
      // las estadísticas derivadas (bono de competencia, saves, ataque...) recalculen.
      document.dispatchEvent(new CustomEvent('ficha:datos-sincronizados'));
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
      if (opts.alCambiar) opts.alCambiar();
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
        if (opts.alCambiar) opts.alCambiar();
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
  // 5b. BUFFS ACTIVABLES (aura / efecto temporal que se prende y se
  //     apaga) — genérico: hoy lo alimentan los hechizos; el día de
  //     mañana ítems o artefactos pueden registrarse como otra fuente
  //     con registrarFuenteBuffs(). Tres tipos de efecto:
  //       plano: suma un número fijo a una estadística derivada
  //              (CA, iniciativa, velocidad, HP máx., ataque, CD...).
  //       dado:  suma un dado a las tiradas (ataque, salvaciones,
  //              pruebas) o queda como "daño extra" que se tira aparte.
  //       stat:  suma a una puntuación de atributo (STR..CHA), así el
  //              modificador y todo lo que depende de él se recalcula.
  // ============================================================
  const OBJETIVOS_PLANO = [['ca', 'CA'], ['iniciativa', 'Iniciativa'], ['velocidad', 'Velocidad (ft)'], ['hp-max', 'HP máx.'], ['ataque', 'Ataque con arma'], ['ataque-conjuro', 'Ataque de conjuro'], ['cd-conjuro', 'CD de conjuro'], ['salvaciones', 'Todas las salvaciones'], ['pruebas', 'Todas las pruebas y skills']];
  const OBJETIVOS_DADO = [['ataque', 'Tiradas de ataque'], ['salvaciones', 'Salvaciones'], ['pruebas', 'Pruebas y skills'], ['dano', 'Daño (se tira aparte)']];
  const STATS_ATRIBUTO = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const fuentesBuff = [];
  function registrarFuenteBuffs(fn) { fuentesBuff.push(fn); }
  function buffsActivos() { return fuentesBuff.flatMap(f => f()); }
  function efectosActivos() { return buffsActivos().flatMap(b => (b.efectos || []).map(e => ({ ...e, fuente: b.nombre }))); }
  function nombreObjetivo(lista, id) { const x = lista.find(o => o[0] === id); return x ? x[1] : id; }
  function resumenEfecto(e) {
    if (e.tipo === 'dado') return `+${e.dado.count}d${e.dado.sides} ${nombreObjetivo(OBJETIVOS_DADO, e.objetivo)}`;
    if (e.tipo === 'stat') return `${e.valor > 0 ? '+' : ''}${e.valor} ${e.stat}`;
    return `${e.valor > 0 ? '+' : ''}${e.valor} ${nombreObjetivo(OBJETIVOS_PLANO, e.objetivo)}`;
  }
  function resumenEfectos(efectos) { return (efectos || []).map(resumenEfecto).join(', '); }

  const FichaBuffs = {
    plano: (obj) => efectosActivos().filter(e => e.tipo === 'plano' && e.objetivo === obj).reduce((a, e) => a + (Number(e.valor) || 0), 0),
    stat: (clave) => efectosActivos().filter(e => e.tipo === 'stat' && e.stat === clave).reduce((a, e) => a + (Number(e.valor) || 0), 0),
    dados: (obj) => efectosActivos().filter(e => e.tipo === 'dado' && e.objetivo === obj),
    // Tira los dados extra activos de una categoría ('ataque'|'salvaciones'|'pruebas'|'dano').
    tirarDados(obj) {
      const partes = [];
      let total = 0;
      FichaBuffs.dados(obj).forEach(e => {
        const rs = Array.from({ length: e.dado.count }, () => Math.floor(Math.random() * e.dado.sides) + 1);
        const suma = rs.reduce((a, b) => a + b, 0);
        total += suma;
        partes.push({ fuente: e.fuente, texto: `${e.fuente}: +${suma} (${e.dado.count}d${e.dado.sides} [${rs.join(', ')}])`, valor: suma });
      });
      return { total, partes };
    },
    activos: buffsActivos,
    apagar(i) { const b = buffsActivos()[i]; if (b && b.apagar) b.apagar(); },
    tirarDano() {
      const r = FichaBuffs.tirarDados('dano');
      if (!r.partes.length) return;
      const detalle = r.partes.map(p => p.texto).join(' | ');
      if (FICHA_CONFIG.mostrarTirada) FICHA_CONFIG.mostrarTirada(r.total, 'Daño extra de buffs', detalle);
      else alert(`🎲 Daño extra: ${r.total}\n${detalle}`);
    },
    resumenEfectos,
  };
  window.FichaBuffs = FichaBuffs;

  function renderPanelBuffs() {
    const cont = document.getElementById('buffs-activos');
    if (!cont) return;
    const act = buffsActivos();
    if (!act.length) { cont.innerHTML = '<span class="buffs-vacio">Sin buffs activos.</span>'; return; }
    cont.innerHTML = act.map((b, i) => `<span class="buff-chip" title="${resumenEfectos(b.efectos)}">🔆 ${b.nombre} <small>${resumenEfectos(b.efectos)}</small> <button type="button" onclick="FichaBuffs.apagar(${i})" title="Apagar">✖</button></span>`).join(' ')
      + (FichaBuffs.dados('dano').length ? ' <button type="button" class="buff-dano-btn" onclick="FichaBuffs.tirarDano()">🎲 Daño extra</button>' : '');
  }
  function notificarBuffs() {
    renderPanelBuffs();
    document.dispatchEvent(new CustomEvent('ficha:buffs'));
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

  // Ataque/CD de un hechizo: fijo (bonus/dc) o automático (bonusAuto/dcAuto) según la
  // característica de conjuro de la ficha (FICHA_CONFIG.habilidadConjuro) + bono de
  // competencia vigente — así subir de nivel no deja un DC viejo en la tabla.
  function valorAtaqueHechizo(ataque, campo) {
    const auto = campo === 'dc' ? ataque.dcAuto : ataque.bonusAuto;
    if (auto && window.FichaAtributos && FICHA_CONFIG.habilidadConjuro) {
      const base = FichaAtributos.modDe(FICHA_CONFIG.habilidadConjuro) + FichaAtributos.profBonusActual();
      return campo === 'dc' ? 8 + base : base;
    }
    return ataque[campo];
  }

  // --- Formulario de efectos de buff (filas dinámicas) ---
  function defaultEfecto(tipo) {
    if (tipo === 'dado') return { tipo: 'dado', objetivo: 'ataque', dado: { count: 1, sides: 4 } };
    if (tipo === 'stat') return { tipo: 'stat', stat: 'STR', valor: 2 };
    return { tipo: 'plano', objetivo: 'ca', valor: 2 };
  }
  function opcionesSelect(lista, actual) {
    return lista.map(o => `<option value="${o[0]}" ${o[0] === actual ? 'selected' : ''}>${o[1]}</option>`).join('');
  }
  function renderEfectosForm(efectos) {
    return efectos.map((e, i) => {
      const tipoSel = `<select id="hf-bf-tipo-${i}" onchange="FichaHechizos.buffCambiarTipo(${i})">
        <option value="plano" ${e.tipo === 'plano' ? 'selected' : ''}>Sumar número fijo</option>
        <option value="dado" ${e.tipo === 'dado' ? 'selected' : ''}>Sumar dado</option>
        <option value="stat" ${e.tipo === 'stat' ? 'selected' : ''}>Sumar a un atributo</option></select>`;
      let campos;
      if (e.tipo === 'dado') {
        campos = `<select id="hf-bf-obj-${i}">${opcionesSelect(OBJETIVOS_DADO, e.objetivo)}</select>
          <input type="number" id="hf-bf-cant-${i}" min="1" style="width:55px;" value="${e.dado.count}"><span>d</span>
          <input type="number" id="hf-bf-caras-${i}" min="1" style="width:55px;" value="${e.dado.sides}">`;
      } else if (e.tipo === 'stat') {
        campos = `<select id="hf-bf-stat-${i}">${STATS_ATRIBUTO.map(a => `<option value="${a}" ${a === e.stat ? 'selected' : ''}>${a}</option>`).join('')}</select>
          <input type="number" id="hf-bf-val-${i}" style="width:65px;" value="${e.valor}">`;
      } else {
        campos = `<select id="hf-bf-obj-${i}">${opcionesSelect(OBJETIVOS_PLANO, e.objetivo)}</select>
          <input type="number" id="hf-bf-val-${i}" style="width:65px;" value="${e.valor}">`;
      }
      return `<div class="spell-form-row-dado buff-efecto-row">${tipoSel} ${campos}
        <button type="button" class="btn-clear" onclick="FichaHechizos.buffQuitarEfecto(${i})" title="Quitar efecto">✖</button></div>`;
    }).join('');
  }
  // Lee las filas del formulario tal como están en pantalla (con valores por defecto
  // para campos que todavía no existen tras cambiar el tipo).
  function leerEfectosForm() {
    const filas = document.querySelectorAll('#hf-buff-efectos .buff-efecto-row');
    return Array.from(filas).map((_, i) => {
      const tipo = document.getElementById(`hf-bf-tipo-${i}`).value;
      const num = (id, def) => { const el = document.getElementById(id); const n = el ? parseInt(el.value, 10) : NaN; return isNaN(n) ? def : n; };
      const sel = (id, def) => { const el = document.getElementById(id); return el ? el.value : def; };
      if (tipo === 'dado') return { tipo, objetivo: sel(`hf-bf-obj-${i}`, 'ataque'), dado: { count: num(`hf-bf-cant-${i}`, 1), sides: num(`hf-bf-caras-${i}`, 4) } };
      if (tipo === 'stat') return { tipo, stat: sel(`hf-bf-stat-${i}`, 'STR'), valor: num(`hf-bf-val-${i}`, 0) };
      return { tipo: 'plano', objetivo: sel(`hf-bf-obj-${i}`, 'ca'), valor: num(`hf-bf-val-${i}`, 0) };
    });
  }
  function efectoValido(e) {
    if (e.tipo === 'dado') return e.dado.count > 0 && e.dado.sides > 0;
    return e.valor !== 0;
  }

  function iniciarEditorHechizos() {
    // Nivel de espacio elegido en el selector de upcast de cada fila: se recuerda
    // para que un re-render (sincronización, DC automáticos) no lo resetee al base.
    const upcastElegido = {};
    const editor = crearEditorDeLista({
      storageKey: 'hechizos-json',
      alCambiar: notificarBuffs,
      datosIniciales: FICHA_CONFIG.hechizosIniciales,
      contenedorListaId: 'hechizos-lista',
      contenedorFormId: 'hechizos-form-container',
      filaVacia: '<tr><td colspan="5" style="color:var(--text-muted);font-size:0.85rem;">Sin hechizos agregados todavía.</td></tr>',
      renderFila: (h, idx) => {
        const nombreEsc = h.nombre.replace(/'/g, "\\'");
        let accionBtn;
        if (h.upcast) {
          // Hechizo con upcast: un selector de nivel de espacio (desde el nivel
          // base hasta 9) + un solo botón que usa el nivel elegido — mantiene la
          // mecánica real de subir de nivel en vez de quedar fijo a un nivel.
          const nivelMax = 9;
          const opciones = [];
          for (let n = h.upcast.nivelBase; n <= nivelMax; n++) opciones.push(n);
          const elegido = upcastElegido[idx] || h.upcast.nivelBase;
          const selectHtml = `<select id="upcast-sel-${idx}" style="width:auto;display:inline-block;" onchange="FichaHechizos.recordarUpcast(${idx}, this.value)">${opciones.map(n => `<option value="${n}" ${n === elegido ? 'selected' : ''}>Nvl ${n}</option>`).join('')}</select>`;
          const etiquetaBtn = h.upcast.tipo === 'tabla' ? '📜 Usar' : '🎲 Tirar';
          accionBtn = `${selectHtml} <button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx})">${etiquetaBtn}</button>`;
        } else if (h.formula) {
          accionBtn = `<button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx})">🎲 ${h.formula.count}d${h.formula.sides}${h.formula.mod ? (h.formula.mod > 0 ? '+' : '') + h.formula.mod : ''}</button>`;
        } else {
          accionBtn = `<button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx})">✅ Usar</button>`;
        }
        const ataqueBadge = !h.ataque ? '' :
          h.ataque.tipo === 'ataque'
            ? `<span class="tag tag-atk">🎯 ${formatearMod(valorAtaqueHechizo(h.ataque, 'bonus'))} Ataque</span>`
            : `<span class="tag tag-atk">🛡️ ${h.ataque.habilidad} DC ${valorAtaqueHechizo(h.ataque, 'dc')}</span>`;
        const areaTxt = h.area ? ` · 📐 ${h.area}` : '';
        const upcastTxt = h.upcast ? ' · ⬆️ Escala con el nivel del espacio' : '';
        const buffTxt = h.buff ? ` · 🔆 ${resumenEfectos(h.buff.efectos)}` : '';
        if (h.buff) {
          accionBtn += ` <button type="button" class="btn-buff ${h.buff.activo ? 'on' : ''}" onclick="FichaHechizos.alternarBuff(${idx})" title="Prender/apagar el efecto">${h.buff.activo ? '🟢 Activo' : '⚪ Activar'}</button>`;
        }
        return `
          <tr>
            <td><span class="tag">${h.especial ? '⭐ ' : ''}${etiquetaNivelConjuro(h.nivel)}</span></td>
            <td><strong>${h.nombre}</strong>${ataqueBadge ? ' ' + ataqueBadge : ''}</td>
            <td>${h.tiempo} / ${h.alcance}${areaTxt}</td>
            <td>${h.resumen}${upcastTxt}${buffTxt} <em>(${h.duracion})</em></td>
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
            <label id="hf-ataque-auto-label" style="display:${h && h.ataque ? 'flex' : 'none'};"><input type="checkbox" id="hf-ataque-auto" ${h && h.ataque && (h.ataque.dcAuto || h.ataque.bonusAuto) ? 'checked' : ''}> Automático (según mi característica de conjuro)</label>
          </div>
          <div class="spell-form-row-dado">
            <span class="spell-form-mini-label">Upcast (opcional, si el efecto escala con el nivel del espacio):</span>
            <select id="hf-upcast-tipo" onchange="FichaHechizos.alternarCamposUpcast()">
              <option value="">Ninguno (nivel fijo)</option>
              <option value="dado" ${h && h.upcast && h.upcast.tipo === 'dado' ? 'selected' : ''}>Dado adicional por nivel</option>
              <option value="tabla" ${h && h.upcast && h.upcast.tipo === 'tabla' ? 'selected' : ''}>Tabla de efecto por nivel</option>
            </select>
          </div>
          <div id="hf-upcast-campos" class="spell-form-row-dado" style="display:${h && h.upcast ? 'flex' : 'none'};flex-direction:column;align-items:stretch;">
            <div class="spell-form-row-dado">
              <span class="spell-form-mini-label">Nivel base del upcast:</span>
              <input type="number" id="hf-upcast-nivelbase" min="1" max="9" style="width:60px;" value="${h && h.upcast ? h.upcast.nivelBase : (h ? Math.max(1, h.nivel) : 1)}">
            </div>
            <div id="hf-upcast-dado-campos" style="display:${h && h.upcast && h.upcast.tipo === 'dado' ? 'flex' : 'none'};gap:6px;align-items:center;">
              <span class="spell-form-mini-label">+ por cada nivel sobre el base:</span>
              <input type="number" id="hf-upcast-dado-cant" placeholder="cant." min="1" style="width:60px;" value="${h && h.upcast && h.upcast.tipo === 'dado' ? h.upcast.dado.count : ''}">
              <span>d</span>
              <input type="number" id="hf-upcast-dado-caras" placeholder="caras" min="1" style="width:60px;" value="${h && h.upcast && h.upcast.tipo === 'dado' ? h.upcast.dado.sides : ''}">
            </div>
            <div id="hf-upcast-tabla-campos" style="display:${h && h.upcast && h.upcast.tipo === 'tabla' ? 'block' : 'none'};">
              <span class="spell-form-mini-label">Una línea por nivel, formato "nivel: efecto":</span>
              <textarea id="hf-upcast-tabla" rows="4" placeholder="3: efecto a nivel 3&#10;4: efecto a nivel 4">${h && h.upcast && h.upcast.tipo === 'tabla' ? Object.entries(h.upcast.tabla).map(([n, t]) => `${n}: ${t}`).join('\n') : ''}</textarea>
            </div>
          </div>
          <div class="spell-form-row-dado">
            <label><input type="checkbox" id="hf-buff-on" onchange="FichaHechizos.alternarCamposBuff()" ${h && h.buff ? 'checked' : ''}> 🔆 Buff / aura que se puede prender y apagar</label>
          </div>
          <div id="hf-buff-campos" style="display:${h && h.buff ? 'block' : 'none'};">
            <div id="hf-buff-efectos">${renderEfectosForm(h && h.buff ? h.buff.efectos : [defaultEfecto('plano')])}</div>
            <button type="button" class="btn-roll btn-roll-sm" onclick="FichaHechizos.buffAgregarEfecto()">➕ Agregar efecto</button>
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
      document.getElementById('hf-ataque-auto-label').style.display = tipo ? 'flex' : 'none';
    }

    function alternarCamposBuff() {
      document.getElementById('hf-buff-campos').style.display = document.getElementById('hf-buff-on').checked ? 'block' : 'none';
    }
    function redibujarEfectosForm(efectos) {
      document.getElementById('hf-buff-efectos').innerHTML = renderEfectosForm(efectos);
    }
    function buffAgregarEfecto() { const efs = leerEfectosForm(); efs.push(defaultEfecto('plano')); redibujarEfectosForm(efs); }
    function buffQuitarEfecto(i) { const efs = leerEfectosForm(); efs.splice(i, 1); redibujarEfectosForm(efs); }
    function buffCambiarTipo(i) {
      const efs = leerEfectosForm();
      efs[i] = defaultEfecto(document.getElementById(`hf-bf-tipo-${i}`).value);
      redibujarEfectosForm(efs);
    }
    function alternarBuff(idx) {
      if (modoLectura) return;
      editor.mutar(idx, (h) => { if (h.buff) h.buff.activo = !h.buff.activo; });
    }

    function alternarCamposUpcast() {
      const tipo = document.getElementById('hf-upcast-tipo').value;
      document.getElementById('hf-upcast-campos').style.display = tipo ? 'flex' : 'none';
      document.getElementById('hf-upcast-dado-campos').style.display = tipo === 'dado' ? 'flex' : 'none';
      document.getElementById('hf-upcast-tabla-campos').style.display = tipo === 'tabla' ? 'block' : 'none';
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
        if (document.getElementById('hf-ataque-auto').checked) ataque.bonusAuto = true;
      } else if (tipoAtaque === 'salvacion') {
        ataque = {
          tipo: 'salvacion',
          habilidad: document.getElementById('hf-ataque-habilidad').value,
          dc: parseInt(document.getElementById('hf-ataque-dc').value, 10) || 0,
        };
        if (document.getElementById('hf-ataque-auto').checked) ataque.dcAuto = true;
      }
      const tipoUpcast = document.getElementById('hf-upcast-tipo').value;
      let upcast = null;
      if (tipoUpcast === 'dado') {
        upcast = {
          tipo: 'dado',
          nivelBase: parseInt(document.getElementById('hf-upcast-nivelbase').value, 10) || Math.max(1, nivel),
          dado: {
            count: parseInt(document.getElementById('hf-upcast-dado-cant').value, 10) || 1,
            sides: parseInt(document.getElementById('hf-upcast-dado-caras').value, 10) || 1,
          },
        };
      } else if (tipoUpcast === 'tabla') {
        const tabla = {};
        document.getElementById('hf-upcast-tabla').value.split('\n').forEach(linea => {
          const m = linea.match(/^\s*(\d+)\s*:\s*(.+)$/);
          if (m) tabla[parseInt(m[1], 10)] = m[2].trim();
        });
        upcast = {
          tipo: 'tabla',
          nivelBase: parseInt(document.getElementById('hf-upcast-nivelbase').value, 10) || Math.max(1, nivel),
          tabla,
        };
      }
      let buff = null;
      if (document.getElementById('hf-buff-on').checked) {
        const efectos = leerEfectosForm().filter(efectoValido);
        if (efectos.length) {
          const idxEd = editor.editandoIdx();
          const previo = idxEd !== null ? editor.items()[idxEd] : null;
          buff = { activo: !!(previo && previo.buff && previo.buff.activo), efectos };
        }
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
        upcast,
        buff,
        slotCost: nivel > 0 ? nivel : null,
      });
    }

    // Gasta el espacio del nivel elegido (fijo en h.slotCost, o el nivel elegido en
    // el selector de upcast de esa fila) y resuelve el efecto: tirada de dados
    // (fija, o base+bono por nivel si es upcast tipo 'dado'), texto de una tabla
    // por nivel (upcast tipo 'tabla'), o un simple "usado" si no hay nada de eso.
    function usar(idx) {
      const h = editor.items()[idx];
      if (!h || modoLectura) return;

      let nivelGastado = h.slotCost;
      if (h.upcast) {
        const sel = document.getElementById(`upcast-sel-${idx}`);
        nivelGastado = sel ? parseInt(sel.value, 10) : h.upcast.nivelBase;
      }

      if (nivelGastado) {
        // Id directo ('slot-N-cur'), no indexado por posición en FICHA_CONFIG.slotsIds
        // — esa indexación se rompía (undefined) para cualquier nivel más allá de
        // slotsIds.length, como pasó de verdad al probar contra los datos reales de Fiona.
        const slotId = `slot-${nivelGastado}-cur`;
        const el = document.getElementById(slotId);
        if (el) {
          const actual = parseInt(el.textContent) || 0;
          if (actual <= 0) { alert(`⚠️ No te quedan espacios de nivel ${nivelGastado} disponibles.`); return; }
          el.textContent = actual - 1;
          guardarCampo(slotId, actual - 1);
        }
      }

      // Lanzar un hechizo con buff lo activa (apagarlo es a mano o con la ✖ del panel).
      let sufijoBuff = '';
      if (h.buff && !h.buff.activo) {
        editor.mutar(idx, (it) => { it.buff.activo = true; });
        sufijoBuff = `\n🔆 Buff "${h.nombre}" activado: ${resumenEfectos(h.buff.efectos)}.`;
      }

      if (h.upcast && h.upcast.tipo === 'tabla') {
        const texto = h.upcast.tabla[nivelGastado] || h.upcast.tabla[h.upcast.nivelBase] || '(sin detalle para ese nivel)';
        alert(`📜 ${h.nombre} (nivel ${nivelGastado}): ${texto}${sufijoBuff}`);
        return;
      }

      let count = h.formula ? h.formula.count : 0;
      let sides = h.formula ? h.formula.sides : (h.upcast && h.upcast.tipo === 'dado' ? h.upcast.dado.sides : 0);
      const mod = h.formula ? h.formula.mod : 0;
      if (h.upcast && h.upcast.tipo === 'dado') {
        count += h.upcast.dado.count * Math.max(0, nivelGastado - h.upcast.nivelBase);
      }
      if (count > 0 && sides > 0) {
        const tiradas = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
        const total = tiradas.reduce((a, b) => a + b, 0) + mod;
        const etiquetaNivel = h.upcast ? ` (nivel ${nivelGastado})` : '';
        alert(`🎲 ${h.nombre}${etiquetaNivel}: [${tiradas.join(', ')}]${mod ? (mod > 0 ? ' +' : ' ') + mod : ''} = ${total}${sufijoBuff}`);
      } else {
        alert(`✅ ${h.nombre}: usado (sin tirada automática).${sufijoBuff}`);
      }
    }

    // Re-renderiza al recalcular atributos solo si algún hechizo tiene valores automáticos
    // (evita resetear los selectores de upcast en cada sincronización si no hace falta).
    document.addEventListener('ficha:atributos', () => {
      if (editor.items().some(h => h.ataque && (h.ataque.dcAuto || h.ataque.bonusAuto))) editor.renderizar();
    });

    function recordarUpcast(idx, valor) { upcastElegido[idx] = parseInt(valor, 10); }

    registrarFuenteBuffs(() => editor.items()
      .map((h, idx) => ({ h, idx }))
      .filter(x => x.h.buff && x.h.buff.activo)
      .map(x => ({ nombre: x.h.nombre, efectos: x.h.buff.efectos || [], apagar: () => alternarBuff(x.idx) })));

    window.FichaHechizos = { editor, usar, guardarDesdeFormulario, alternarCamposAtaque, alternarCamposUpcast, recordarUpcast,
      alternarCamposBuff, buffAgregarEfecto, buffQuitarEfecto, buffCambiarTipo, alternarBuff };
    notificarBuffs();
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

  // ============================================================
  // 10. ATRIBUTOS Y ESTADÍSTICAS DERIVADAS — el bono de competencia
  //     y todo lo que depende de él (Check/Save, skills con
  //     competencia/expertise, percepción pasiva, ataque/CD de
  //     conjuro) se CALCULAN desde el nivel + puntuación base +
  //     aumento temporal, en vez de ser texto hardcodeado. Nace de
  //     un bug real (Fiona nivel 8->9, v55.0): 25 lugares quedaron
  //     con el bono viejo porque nada los recalculaba.
  // ============================================================
  function calcularProfBonus(nivel) {
    if (nivel >= 17) return 6;
    if (nivel >= 13) return 5;
    if (nivel >= 9) return 4;
    if (nivel >= 5) return 3;
    return 2;
  }
  function calcularModificador(score) {
    return Math.floor((score - 10) / 2);
  }
  function formatearMod(n) {
    return (n >= 0 ? '+' : '') + n;
  }
  function leerNumero(el, porDefecto) {
    if (!el) return porDefecto;
    const crudo = ('value' in el && el.value !== undefined && el.tagName !== 'DIV' && el.tagName !== 'SPAN') ? el.value : el.textContent;
    const n = parseInt(crudo, 10);
    return isNaN(n) ? porDefecto : n;
  }

  // opts.obtenerNivel: () => nivel total del personaje (preferido: p.ej. suma de
  //   niveles de clase, o derivado de XP). Alternativa: opts.nivelInputId.
  // opts.profBadgeId: elemento donde mostrar "+N".
  // opts.habilidades: [{ clave:'WIS', scoreId, tempId?, contenedorId, saveCompetente, checkCompetente }]
  //   El contenedor tiene .ab-mod, .btn-check y .btn-save (el bono vigente queda en dataset.bonus).
  // opts.skills: [{ clave:'Perception', contenedorId, habilidad:'WIS', competente, expertise? }]
  //   El contenedor tiene .skill-mod; el bono vigente queda en dataset.bonus del contenedor
  //   (y de su botón), para que onclick lo lea en vez de llevar un número fijo.
  // opts.pasiva: [{ elId, skillClave }] -> 10 + bono de esa skill (percepción pasiva, etc.).
  // Dispara el evento 'ficha:atributos' tras cada recálculo para que otras
  // estadísticas (ataque, CD de conjuro) se enganchen sin duplicar la cuenta.
  const estadoAtributos = { prof: 2, mods: {}, bonosSkill: {} };
  function iniciarAtributos(opts) {
    const habilidades = opts.habilidades || [];
    const skills = opts.skills || [];
    function nivelActual() {
      if (opts.obtenerNivel) return opts.obtenerNivel();
      return opts.nivelInputId ? leerNumero(document.getElementById(opts.nivelInputId), 1) : 1;
    }
    function recalcular() {
      const prof = calcularProfBonus(nivelActual());
      estadoAtributos.prof = prof;
      const badge = document.getElementById(opts.profBadgeId);
      if (badge) badge.textContent = formatearMod(prof);
      habilidades.forEach(h => {
        const score = leerNumero(document.getElementById(h.scoreId), 10);
        const temp = h.tempId ? leerNumero(document.getElementById(h.tempId), 0) : 0;
        const mod = calcularModificador(score + temp + FichaBuffs.stat(h.clave));
        estadoAtributos.mods[h.clave] = mod;
        const cont = document.getElementById(h.contenedorId);
        if (!cont) return;
        const checkBonus = mod + (h.checkCompetente ? prof : 0) + FichaBuffs.plano('pruebas');
        const saveBonus = mod + (h.saveCompetente ? prof : 0) + FichaBuffs.plano('salvaciones');
        const modEl = cont.querySelector('.ab-mod');
        if (modEl) modEl.textContent = `(${formatearMod(mod)})`;
        const checkBtn = cont.querySelector('.btn-check');
        if (checkBtn) {
          checkBtn.textContent = `Check ${formatearMod(checkBonus)}${h.checkCompetente ? '★' : ''}`;
          checkBtn.dataset.bonus = checkBonus;
        }
        const saveBtn = cont.querySelector('.btn-save');
        if (saveBtn) {
          saveBtn.textContent = `Save ${formatearMod(saveBonus)}${h.saveCompetente ? '★' : ''}`;
          saveBtn.dataset.bonus = saveBonus;
        }
      });
      skills.forEach(s => {
        const mod = estadoAtributos.mods[s.habilidad] ?? 0;
        const bono = mod + (s.competente ? prof * (s.expertise ? 2 : 1) : 0) + FichaBuffs.plano('pruebas');
        estadoAtributos.bonosSkill[s.clave] = bono;
        const cont = document.getElementById(s.contenedorId);
        if (!cont) return;
        const modEl = cont.querySelector('.skill-mod');
        if (modEl) modEl.textContent = formatearMod(bono);
        cont.dataset.bonus = bono;
        const btn = cont.querySelector('button');
        if (btn) btn.dataset.bonus = bono;
      });
      (opts.pasiva || []).forEach(p => {
        const el = document.getElementById(p.elId);
        if (el) el.textContent = 10 + (estadoAtributos.bonosSkill[p.skillClave] ?? 0);
      });
      document.dispatchEvent(new CustomEvent('ficha:atributos'));
    }
    const idsAVigilar = [opts.nivelInputId, ...habilidades.flatMap(h => [h.scoreId, h.tempId])].filter(Boolean);
    document.addEventListener('input', (e) => { if (idsAVigilar.includes(e.target.id)) recalcular(); });
    // Datos que llegan de Firebase se aplican por código (sin evento 'input').
    document.addEventListener('ficha:datos-sincronizados', recalcular);
    document.addEventListener('ficha:buffs', recalcular);
    // Se publica ANTES del primer recálculo: los listeners de 'ficha:atributos'
    // (hechizos con DC automático, estadísticas con buff) lo necesitan ya disponible.
    window.FichaAtributos = { recalcular, profBonusActual: () => estadoAtributos.prof, modDe: (clave) => estadoAtributos.mods[clave] ?? 0, bonoSkill: (clave) => estadoAtributos.bonosSkill[clave] ?? 0 };
    recalcular();
    return window.FichaAtributos;
  }

  // Patrón "base + buff = total" (el mismo de CA/Ataque/CD de Conjuro), para
  // cualquier estadística con un modificador externo de objeto/efecto: HP máx.,
  // Iniciativa, Velocidad, etc. calcularBase() puede leer lo que haga falta
  // (p.ej. FichaAtributos.modDe('DEX') + FichaAtributos.profBonusActual()); se
  // recalcula solo cuando cambian los atributos ('ficha:atributos').
  function iniciarEstadisticaConBuff(opts) {
    function recalcular() {
      const base = opts.calcularBase();
      const buff = opts.buffInputId ? leerNumero(document.getElementById(opts.buffInputId), 0) : 0;
      // objetivoBuff: además del campo manual, suma los buffs activados (hechizos, etc.).
      const buffActivado = opts.objetivoBuff ? FichaBuffs.plano(opts.objetivoBuff) : 0;
      const total = base + buff + buffActivado;
      const totalEl = document.getElementById(opts.totalElId);
      if (totalEl) totalEl.textContent = opts.formatear ? opts.formatear(total) : total;
      if (opts.baseElId) {
        const baseEl = document.getElementById(opts.baseElId);
        if (baseEl) baseEl.textContent = opts.formatearBase ? opts.formatearBase(base) : (opts.formatear ? opts.formatear(base) : base);
      }
      return total;
    }
    if (opts.buffInputId) {
      document.addEventListener('input', (e) => { if (e.target.id === opts.buffInputId) recalcular(); });
    }
    (opts.vigilarTambien || []).forEach(id => {
      document.addEventListener('input', (e) => { if (e.target.id === id) recalcular(); });
    });
    document.addEventListener('ficha:atributos', recalcular);
    document.addEventListener('ficha:datos-sincronizados', recalcular);
    document.addEventListener('ficha:buffs', recalcular);
    recalcular();
    return { recalcular };
  }

  // ============================================================
  // 11. EDITOR DE REPUTACIÓN / HONOR — tracker de facciones
  //     personalizable (agregar, renombrar, ajustar valor con ➖/➕
  //     directo, quitar). Tercer uso de crearEditorDeLista.
  // ============================================================
  function iniciarEditorReputacion() {
    const editor = crearEditorDeLista({
      storageKey: 'reputacion-json',
      datosIniciales: FICHA_CONFIG.reputacionInicial || [],
      contenedorListaId: 'reputacion-lista',
      contenedorFormId: 'reputacion-form-container',
      filaVacia: '<p class="reputacion-empty">Sin facciones registradas todavía.</p>',
      renderFila: (r, idx) => {
        const faccionEsc = r.faccion.replace(/'/g, "\\'");
        return `
          <div class="reputacion-item">
            <div class="reputacion-top">
              <span class="reputacion-faccion">${r.faccion}</span>
              <div class="reputacion-controles">
                <button onclick="FichaReputacion.ajustar(${idx}, -1)" title="-1">➖</button>
                <span class="reputacion-valor">${r.valor}</span>
                <button onclick="FichaReputacion.ajustar(${idx}, 1)" title="+1">➕</button>
                <button onclick="FichaReputacion.editor.mostrarFormulario(${idx})" title="Editar/renombrar">✏️</button>
                <button onclick="FichaReputacion.editor.eliminar(${idx}, '¿Quitar la facción \\'${faccionEsc}\\' del tracker?')" title="Quitar">🗑️</button>
              </div>
            </div>
            ${r.descripcion ? `<div class="reputacion-desc">${r.descripcion}</div>` : ''}
          </div>
        `;
      },
      renderFormulario: (r) => `
        <div class="reputacion-form">
          <input type="text" id="rf-faccion" placeholder="Nombre de la facción" value="${r ? r.faccion : ''}">
          <input type="number" id="rf-valor" placeholder="Valor" value="${r ? r.valor : 0}">
          <textarea id="rf-descripcion" placeholder="Notas (opcional)">${r ? r.descripcion || '' : ''}</textarea>
          <div class="reputacion-form-actions">
            <button type="button" onclick="FichaReputacion.editor.cerrarFormulario()">Cancelar</button>
            <button type="button" onclick="FichaReputacion.guardarDesdeFormulario()">💾 Guardar</button>
          </div>
        </div>
      `,
    });

    function guardarDesdeFormulario() {
      const faccion = document.getElementById('rf-faccion').value.trim();
      if (!faccion) { alert('La facción necesita un nombre.'); return; }
      editor.guardarDesdeFormulario({
        faccion,
        valor: parseInt(document.getElementById('rf-valor').value, 10) || 0,
        descripcion: document.getElementById('rf-descripcion').value.trim(),
      });
    }
    function ajustar(idx, delta) {
      if (modoLectura) return;
      editor.mutar(idx, (r) => { r.valor += delta; });
    }

    window.FichaReputacion = { editor, guardarDesdeFormulario, ajustar };
  }

  window.FichaComun = {
    setCharRef, guardarCampo, sincronizarDatosDesdeNube, aplicarModoLectura,
    crearEditorDeLista, iniciarEditorHechizos, iniciarEditorInventario,
    iniciarBitacora, bloquearPorSistemaIncorrecto, iniciarPermisosYCompartir,
    calcularProfBonus, calcularModificador, formatearMod,
    iniciarAtributos, iniciarEstadisticaConBuff, iniciarEditorReputacion,
    registrarFuenteBuffs, notificarBuffs,
  };
})();

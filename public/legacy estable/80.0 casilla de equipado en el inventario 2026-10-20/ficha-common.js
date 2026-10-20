/*
 * ficha-common.js — motor compartido de fichas de personaje.
 *
 * Objetivo: que el autoguardado, el modo lectura, y el editor add/edit/delete
 * de listas (hechizos, inventario, y cualquier lista futura) vivan en UN SOLO
 * archivo, cargado por cada ficha con <script src="ficha-common.js">, igual
 * que ya se hace con spells_data.js/classes_data.js — ese mecanismo ya existe
 * en el proyecto, aquí se extiende de "datos compartidos" a "funciones
 * compartidas". Sin build, sin framework: sigue siendo un sitio estático.
 *
 * Cada ficha define un FICHA_CONFIG chico ANTES de este script (su id,
 * los ids de sus tarjetas de espacio de conjuro si las tiene, y los datos
 * semilla de sus listas) y llama a las funciones de aquí para todo lo
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
  const PREFIJOS_EFIMEROS = ['hf-', 'if-', 'rf-', 'upcast-sel-', 'bitacora-ficha-', 'concentracion-casilla', 'dice-', 'dados-', 'bp-'];
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
      ultimosDatos = data;
      aplicarDatosAlDOM(data);
      // Los valores se aplican por código (sin evento 'input'): avisar para que
      // las estadísticas derivadas (bono de competencia, saves, ataque...) recalculen.
      document.dispatchEvent(new CustomEvent('ficha:datos-sincronizados'));
    });
  }

  let ultimosDatos = null;
  function aplicarDatosAlDOM(data) {
    Object.keys(data).forEach(id => {
      if (editoresDeLista[id]) {
        editoresDeLista[id].resincronizarDesdeValor(data[id]);
        return;
      }
      // Valores viejos de formularios temporales que quedaron en datos/ no deben pisar lo que se está escribiendo.
      if (esCampoEfimero(id)) return;
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
  }
  // Para elementos que se dibujan DESPUÉS de la primera sincronización (casillas nuevas al subir de nivel):
  // vuelve a volcar el último snapshot conocido, sin disparar eventos.
  function reaplicarDatos() { if (ultimosDatos) aplicarDatosAlDOM(ultimosDatos); }

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
    // no toca nada aquí — la siembra inicial la resuelve sembrarSiVacioEnFirebase.
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
  // Aviso de uso de recurso (hechizo lanzado, buff, concentración, consumible, reputación). Si hay un
  // registro escuchando (ficha-dados.js) lo anota en el historial; si no, no pasa nada.
  function emitirUso(tipo, texto, detalle) {
    document.dispatchEvent(new CustomEvent('ficha:uso', { detail: { tipo, texto, detalle } }));
  }
  // Dónde mostrar un resultado de tirada: el lanzador compartido si está cargado; si no, el gancho de la ficha.
  function resolverMostrar() {
    if (window.FichaDados && FichaDados.mostrar) return FichaDados.mostrar;
    return FICHA_CONFIG.mostrarTirada || null;
  }
  const OBJETIVOS_PLANO = [['ca', 'CA'], ['iniciativa', 'Iniciativa'], ['velocidad', 'Velocidad (ft)'], ['hp-max', 'HP máx.'], ['ataque', 'Ataque con arma'], ['ataque-conjuro', 'Ataque de conjuro'], ['cd-conjuro', 'CD de conjuro'], ['salvaciones', 'Todas las salvaciones'], ['pruebas', 'Todas las pruebas y skills'], ['curacion', 'Curación de hechizos'], ['dano', 'Daño de hechizos']];
  const OBJETIVOS_DADO = [['ataque', 'Tiradas de ataque'], ['salvaciones', 'Salvaciones'], ['pruebas', 'Pruebas y skills'], ['dano', 'Daño (se tira aparte)'], ['curacion', 'Curación de hechizos']];
  const STATS_ATRIBUTO = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const fuentesBuff = [];
  function registrarFuenteBuffs(fn) { fuentesBuff.push(fn); }
  function buffsActivos() { return fuentesBuff.flatMap(f => f()); }

  // --- Condiciones ("cuando") y valores dinámicos de un efecto ---
  //   cuando: { hechizo:{ etiqueta?, nombre?, nivelMin? }, concentrando?, pgMitad?, estado? }   (todas las que estén deben cumplirse)
  //   valor:  número, o { de:'nivelClase'|'nivelTotal'|'modificador'|'competencia', clase?, hab?, signo?, mult? }
  // Un efecto con condición de hechizo solo aplica cuando se pasa el contexto { hechizo, nivel } (al lanzar ese hechizo);
  // los demás (concentrando, pgMitad, estado) se evalúan en cualquier momento.
  const normalizar = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const sinParentesis = (s) => String(s || '').replace(/\s*\(.*?\)\s*/g, ' ');
  // Etiquetas de un hechizo: las propias (h.etiquetas) más las del compendio (spells_data.js) por nombre,
  // más 'concentracion' si lo es. Se comparan sin acentos ni mayúsculas.
  function etiquetasDeHechizo(h) {
    const t = new Set((h.etiquetas || []).map(normalizar));
    const base = normalizar(sinParentesis(h.nombre));
    if (typeof SPELLS !== 'undefined') {
      const c = SPELLS.find(x => normalizar(sinParentesis(x.name)) === base);
      if (c) { (c.etiquetas || []).forEach(x => t.add(normalizar(x))); if (/conc/i.test(c.duracion || '')) t.add('concentracion'); }
    }
    if (h.concentracion || /conc/i.test(h.duracion || '')) t.add('concentracion');
    return t;
  }
  let evaluandoPgMitad = false;
  function cumpleCuando(c, ctx) {
    if (!c) return true;
    if (c.hechizo) {
      const h = ctx && ctx.hechizo; if (!h) return false;
      if (c.hechizo.etiqueta && !etiquetasDeHechizo(h).has(normalizar(c.hechizo.etiqueta))) return false;
      if (c.hechizo.nombre && normalizar(h.nombre).indexOf(normalizar(c.hechizo.nombre)) < 0) return false;
      if (c.hechizo.nivelMin != null && ((ctx.nivel != null ? ctx.nivel : h.nivel) || 0) < c.hechizo.nivelMin) return false;
    }
    if (c.concentrando) { const el = document.getElementById('concentracion-actual'); if (!(el && el.value)) return false; }
    if (c.pgMitad) {
      // hpMaxActual() consulta los buffs ('hp-max'), que podrían consultar esta condición: se corta el ciclo.
      if (evaluandoPgMitad) return false;
      evaluandoPgMitad = true;
      let max = 0;
      try { max = (typeof window.hpMaxActual === 'function') ? window.hpMaxActual() : 0; } finally { evaluandoPgMitad = false; }
      const cur = parseInt((document.getElementById('hp-cur') || {}).value, 10) || 0;
      if (!max || cur * 2 > max) return false;
    }
    if (c.estado) {
      if (!window.FichaReglas) return false;
      const want = normalizar(c.estado);
      const ok = FichaReglas.estados().condiciones.some(id => { const k = FichaReglas.condicion(id); return normalizar(id) === want || (k && (normalizar(k.nombre) === want || normalizar(k.en) === want)); });
      if (!ok) return false;
    }
    return true;
  }
  function nivelDeClase(nombre) {
    if (window.FichaVitales && FichaVitales.nivelClase) return FichaVitales.nivelClase(nombre) || 0;
    if (window.FichaNivel && FichaNivel.nivelClase) return FichaNivel.nivelClase(nombre) || 0;
    const cn = (typeof CONFIG_NIVEL !== 'undefined' && CONFIG_NIVEL) ? CONFIG_NIVEL.clases.find(c => c.nombre === nombre) : null;
    return cn ? cn.nivelInicial || 0 : 0;
  }
  function resolverValor(e) {
    const v = e.valor;
    if (v && typeof v === 'object') {
      let n = 0;
      if (v.de === 'nivelClase') n = nivelDeClase(v.clase);
      else if (v.de === 'nivelTotal') n = window.FichaVitales ? FichaVitales.nivelTotal() : 0;
      else if (v.de === 'modificador') n = window.FichaAtributos ? FichaAtributos.modDe(v.hab) : 0;
      else if (v.de === 'competencia') n = window.FichaAtributos ? FichaAtributos.profBonusActual() : 0;
      return n * (v.mult || 1) * (v.signo || 1);
    }
    return Number(v) || 0;
  }
  function efectosActivos(ctx) { return buffsActivos().flatMap(b => (b.efectos || []).filter(e => cumpleCuando(e.cuando, ctx)).map(e => ({ ...e, fuente: b.nombre }))); }
  function nombreObjetivo(lista, id) { const x = lista.find(o => o[0] === id); return x ? x[1] : id; }
  function textoCuando(c) {
    if (!c) return '';
    const p = [];
    if (c.hechizo) {
      if (c.hechizo.etiqueta) p.push(`hechizo «${c.hechizo.etiqueta}»`);
      if (c.hechizo.nombre) p.push(`hechizo «${c.hechizo.nombre}»`);
      if (c.hechizo.nivelMin != null) p.push(`hechizo de nivel ${c.hechizo.nivelMin} o más`);
    }
    if (c.concentrando) p.push('concentrado');
    if (c.pgMitad) p.push('PG ≤ mitad');
    if (c.estado) p.push(`estado ${c.estado}`);
    return p.length ? ` (si ${p.join(' y ')})` : '';
  }
  function resumenEfecto(e) {
    const cu = textoCuando(e.cuando);
    if (e.tipo === 'ventaja' || e.tipo === 'desventaja') return `${e.tipo} en ${nombreObjetivo(OBJETIVOS_DADO, e.objetivo)}${cu}`;
    if (e.tipo === 'dado') return `+${e.dado.count}d${e.dado.sides} ${nombreObjetivo(OBJETIVOS_DADO, e.objetivo)}${cu}`;
    const val = resolverValor(e);
    if (e.tipo === 'stat') return `${val > 0 ? '+' : ''}${val} ${e.stat}${cu}`;
    return `${val > 0 ? '+' : ''}${val} ${nombreObjetivo(OBJETIVOS_PLANO, e.objetivo)}${cu}`;
  }
  function resumenEfectos(efectos) { return (efectos || []).map(resumenEfecto).join(', '); }

  const FichaBuffs = {
    // ctx (opcional): { hechizo, nivel } para efectos que solo valen al lanzar cierto hechizo.
    plano: (obj, ctx) => efectosActivos(ctx).filter(e => e.tipo === 'plano' && e.objetivo === obj).reduce((a, e) => a + resolverValor(e), 0),
    stat: (clave) => efectosActivos().filter(e => e.tipo === 'stat' && e.stat === clave).reduce((a, e) => a + resolverValor(e), 0),
    dados: (obj, ctx) => efectosActivos(ctx).filter(e => e.tipo === 'dado' && e.objetivo === obj),
    // Tira los dados extra activos de una categoría ('ataque'|'salvaciones'|'pruebas'|'dano'|'curacion').
    tirarDados(obj, ctx) {
      const partes = [];
      let total = 0;
      FichaBuffs.dados(obj, ctx).forEach(e => {
        const rs = Array.from({ length: e.dado.count }, () => Math.floor(Math.random() * e.dado.sides) + 1);
        const suma = rs.reduce((a, b) => a + b, 0);
        total += suma;
        partes.push({ fuente: e.fuente, texto: `${e.fuente}: +${suma} (${e.dado.count}d${e.dado.sides} [${rs.join(', ')}])`, valor: suma });
      });
      return { total, partes };
    },
    // Ventaja/desventaja que dan los buffs activos a una categoría ('ataque'|'salvaciones'|'pruebas').
    // Devuelve 'advantage' | 'disadvantage' | 'normal' (si hay de las dos, se cancelan).
    ventaja(cat) {
      const ef = efectosActivos().filter(e => (e.tipo === 'ventaja' || e.tipo === 'desventaja') && e.objetivo === cat);
      const v = ef.some(e => e.tipo === 'ventaja'), d = ef.some(e => e.tipo === 'desventaja');
      return v && d ? 'normal' : v ? 'advantage' : d ? 'disadvantage' : 'normal';
    },
    // Bonos de buffs para el resultado de un hechizo: suma fija + dados de un objetivo ('curacion' | 'dano').
    // soloCondicionales: ignora los efectos sin condición de hechizo (el 'dano' sin condición es "daño extra" que se tira aparte).
    bonoDeHechizo(obj, ctx, soloCondicionales) {
      const ef = efectosActivos(ctx).filter(e => e.objetivo === obj && (e.tipo === 'plano' || e.tipo === 'dado') && (!soloCondicionales || (e.cuando && e.cuando.hechizo)));
      const partes = []; let total = 0;
      ef.forEach(e => {
        if (e.tipo === 'plano') { const v = resolverValor(e); if (!v) return; total += v; partes.push(`${e.fuente}: ${v > 0 ? '+' : '−'}${Math.abs(v)}`); }
        else {
          const rs = Array.from({ length: e.dado.count }, () => Math.floor(Math.random() * e.dado.sides) + 1);
          const suma = rs.reduce((a, b) => a + b, 0); total += suma;
          partes.push(`${e.fuente}: +${suma} (${e.dado.count}d${e.dado.sides} [${rs.join(', ')}])`);
        }
      });
      return { total, partes };
    },
    activos: buffsActivos,
    apagar(i) { const b = buffsActivos()[i]; if (b && b.apagar) b.apagar(); },
    tirarDano() {
      const r = FichaBuffs.tirarDados('dano');
      if (!r.partes.length) return;
      const detalle = r.partes.map(p => p.texto).join(' | ');
      const mostrar = resolverMostrar();
      if (mostrar) mostrar(r.total, 'Daño extra de buffs', detalle);
      else alert(`🎲 Daño extra: ${r.total}\n${detalle}`);
    },
    resumenEfectos, etiquetasDeHechizo, cumpleCuando,
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
  // 5c. CLASE DE ARMADURA (CA) CALCULADA desde el inventario
  //     Armadura equipada: base + DEX (con el tope de su tipo) + escudos
  //     equipados. Los ítems sin categoría se reconocen por nombre con la
  //     tabla SRD (Half Plate, Studded Leather, Shield...) sin tocar los
  //     datos guardados. Si no hay NADA equipado se usa
  //     FICHA_CONFIG.caBase (valor fijo de la ficha) o 10 + DEX — así una
  //     ficha existente no cambia de CA hasta que el jugador equipe algo.
  // ============================================================
  // [nombre, CA base, tope de DEX (null = sin tope, 0 = sin DEX), Fuerza mínima (0 = ninguna), desventaja en Sigilo]
  const ARMADURAS_SRD = [
    ['half plate', 15, 2, 0, true], ['breastplate', 14, 2, 0, false], ['studded leather', 12, null, 0, false], ['chain shirt', 13, 2, 0, false],
    ['chain mail', 16, 0, 13, true], ['scale mail', 14, 2, 0, true], ['ring mail', 14, 0, 0, true], ['padded', 11, null, 0, true],
    ['leather', 11, null, 0, false], ['splint', 17, 0, 15, true], ['plate', 18, 0, 15, true], ['hide', 12, 2, 0, false],
  ];
  // Alias en español (mismo orden de prioridad: los nombres más específicos primero).
  const ARMADURAS_ES = [
    ['semiplacas', 15, 2, 0, true], ['coraza', 14, 2, 0, false], ['cuero tachonado', 12, null, 0, false], ['camisote de mallas', 13, 2, 0, false],
    ['cota de mallas', 16, 0, 13, true], ['cota de escamas', 14, 2, 0, true], ['cota de anillas', 14, 0, 0, true], ['acolchada', 11, null, 0, true],
    ['cuero', 11, null, 0, false], ['laminas', 17, 0, 15, true], ['láminas', 17, 0, 15, true], ['placas', 18, 0, 15, true], ['pieles', 12, 2, 0, false],
  ];
  // Devuelve la lista de piezas que aportan CA reconocidas en el nombre (una armadura y/o un escudo,
  // p.ej. "Plate Armor & Shield" aporta las dos).
  function reconocerArmaduras(item) {
    const n = (item.nombre || '').toLowerCase();
    const piezas = [];
    if ((/\bshield\b/.test(n) && !/\bshield of\b|\bspell\b/.test(n)) || /\bescudo\b/.test(n)) piezas.push({ tipo: 'escudo', bono: 2 });
    const hit = ARMADURAS_SRD.find(a => new RegExp('\\b' + a[0] + '\\b').test(n));
    if (hit) piezas.push({ tipo: 'armadura', base: hit[1], dexCap: hit[2], fue: hit[3], sigilo: hit[4] });
    else {
      const es = ARMADURAS_ES.find(a => n.includes(a[0]));
      if (es) piezas.push({ tipo: 'armadura', base: es[1], dexCap: es[2], fue: es[3], sigilo: es[4] });
    }
    return piezas;
  }
  function reconocerArmadura(item) { return reconocerArmaduras(item)[0] || null; }
  function fuerzaActual() {
    const e = document.getElementById('str-score'); const v = e ? parseInt(e.value, 10) : NaN;
    return isNaN(v) ? null : v;
  }
  // Piezas de CA de un objeto del inventario (armadura y/o escudo). Un objeto puede traer ambas ("Plate Armor & Shield").
  function infosDeItem(i) {
    if (i.categoria === 'armadura') {
      const srd = reconocerArmaduras(i).find(x => x.tipo === 'armadura') || {};   // Fuerza mínima y Sigilo salen de la tabla SRD si el nombre se reconoce
      return (i.modAC != null) ? [{ tipo: 'armadura', base: i.modAC, dexCap: i.dexCap === undefined ? null : i.dexCap, fue: srd.fue || 0, sigilo: !!srd.sigilo }] : reconocerArmaduras(i);
    }
    if (i.categoria === 'escudo') return [{ tipo: 'escudo', bono: i.modAC != null ? i.modAC : 2 }];
    if (!i.categoria || i.categoria === 'general') return reconocerArmaduras(i);
    return [];
  }
  // Texto que describe una armadura o un escudo del inventario: CA, tope de DEX, Fuerza mínima, Sigilo y lo que aporta hoy.
  function descripcionArmadura(item) {
    const dex = window.FichaAtributos ? FichaAtributos.modDe('DEX') : 0;
    return infosDeItem(item).map(info => {
      if (info.tipo === 'escudo') return `🛡️ Escudo: +${info.bono} a la CA mientras lo llevas equipado.`;
      const sinTope = info.dexCap === null || info.dexCap === undefined;
      const topeTxt = info.dexCap === 0 ? 'sin DEX (armadura pesada)' : sinTope ? '+ DEX (sin tope)' : `+ DEX (máx. +${info.dexCap})`;
      const aporte = info.dexCap === 0 ? 0 : sinTope ? dex : Math.min(dex, info.dexCap);
      const partes = [`🛡️ CA ${info.base} ${topeTxt}`];
      if (info.sigilo) partes.push('⚠️ desventaja en Sigilo');
      if (info.fue) partes.push(`💪 requiere Fuerza ${info.fue} (si no, velocidad −10 pies)`);
      if (info.dexCap !== 0) partes.push(`con tu DEX ${FichaComun.formatearMod(dex)} da CA ${info.base + aporte}${!sinTope && dex > info.dexCap ? ' (tu DEX se recorta al tope)' : ''}`);
      return partes.join(' · ');
    }).join('<br>');
  }
  function calcularCA() {
    const dex = window.FichaAtributos ? FichaAtributos.modDe('DEX') : 0;
    const equipados = (window.FichaInventario ? FichaInventario.editor.items() : []).filter(i => i.equipado);
    let mejor = null;
    let escudo = 0;
    equipados.forEach(i => {
      infosDeItem(i).forEach(info => {
        if (info.tipo === 'escudo') { escudo += info.bono; return; }
        const aporteDex = info.dexCap === null ? dex : (info.dexCap === 0 ? 0 : Math.min(dex, info.dexCap));
        const total = info.base + aporteDex;
        if (!mejor || total > mejor.total) mejor = { total, nombre: i.nombre, base: info.base, aporteDex, dexCap: info.dexCap, fue: info.fue || 0, sigilo: !!info.sigilo };
      });
    });
    if (!mejor && !escudo) {
      // Fórmula de clase sin armadura (monje 10+DEX+WIS, bárbaro 10+DEX+CON, hechicero dracónico...).
      if (typeof FICHA_CONFIG.caSinArmadura === 'function') {
        const v = FICHA_CONFIG.caSinArmadura();
        return { total: v, texto: `${v} (sin armadura: ${FICHA_CONFIG.caSinArmaduraTexto || 'fórmula de clase'})` };
      }
      if (typeof FICHA_CONFIG.caBase === 'number') return { total: FICHA_CONFIG.caBase, texto: `${FICHA_CONFIG.caBase} (fija — equipa una armadura para calcularla)` };
      return { total: 10 + dex, texto: `${10 + dex} (sin armadura: 10 + DEX ${FichaComun.formatearMod(dex)})` };
    }
    const sinArm = typeof FICHA_CONFIG.caSinArmadura === 'function' ? FICHA_CONFIG.caSinArmadura() : 10 + dex;
    const base = mejor ? mejor.total : sinArm;
    // Desglose: base de la armadura + DEX (con su tope) + escudo, y las penalizaciones que trae (Sigilo, Fuerza mínima).
    const partes = [];
    if (mejor) {
      partes.push(`${mejor.nombre} ${mejor.base}`);
      if (mejor.dexCap === 0) partes.push('DEX 0 (armadura pesada, no suma DEX)');
      else if (mejor.dexCap === null || mejor.dexCap === undefined) partes.push(`DEX ${FichaComun.formatearMod(dex)} (sin tope)`);
      else partes.push(`DEX ${FichaComun.formatearMod(mejor.aporteDex)} (tope +${mejor.dexCap}${dex > mejor.dexCap ? `; tu DEX ${FichaComun.formatearMod(dex)} se recorta` : ''})`);
    } else partes.push(`sin armadura ${sinArm}`);
    if (escudo) partes.push(`escudo +${escudo}`);
    const avisos = [];
    if (mejor && mejor.sigilo) avisos.push('⚠️ desventaja en Sigilo');
    if (mejor && mejor.fue) {
      const fue = fuerzaActual();
      avisos.push(fue != null && fue < mejor.fue ? `⚠️ Fuerza ${mejor.fue} requerida (tienes ${fue}): velocidad −10 pies` : `Fuerza ${mejor.fue} requerida (la cumples)`);
    }
    return { total: base + escudo, texto: `${base + escudo} = ${partes.join(' + ')}${avisos.length ? ' · ' + avisos.join(' · ') : ''}`, desglose: partes, avisos };
  }
  // opts: { totalElId, baseElId?, buffInputId? } — CA = armadura calculada + buff manual + buffs activados.
  function iniciarCA(opts) {
    const ctl = iniciarEstadisticaConBuff({
      buffInputId: opts.buffInputId, totalElId: opts.totalElId, baseElId: opts.baseElId,
      calcularBase: () => calcularCA().total,
      formatearBase: () => calcularCA().texto,
      objetivoBuff: 'ca',
      eventos: ['ficha:inventario'],
    });
    window.FichaCA = { calcular: calcularCA, recalcular: ctl.recalcular };
    return window.FichaCA;
  }

  // ============================================================
  // 5d. CONCENTRACIÓN — una casilla que se marca sola al lanzar un
  //     hechizo con concentración y se desmarca a mano cuando se
  //     pierde. Solo se puede concentrar en un hechizo a la vez:
  //     lanzar otro reemplaza al anterior, y soltar la concentración
  //     apaga el buff de ese hechizo.
  // ============================================================
  function esConcentracion(h) {
    return h.concentracion !== undefined ? !!h.concentracion : /conc/i.test(h.duracion || '');
  }
  function concentracionActual() {
    const el = document.getElementById('concentracion-actual');
    return el ? (el.value || '') : '';
  }
  function renderConcentracion() {
    const cb = document.querySelector('.conc-check');
    const nombre = document.getElementById('concentracion-nombre');
    const actual = concentracionActual();
    if (cb) cb.checked = !!actual;
    if (nombre) nombre.textContent = actual || 'ninguna';
    // Chip de la barra fija (ficha única): apagado o encendido con el nombre del hechizo; tocarlo suelta la concentración.
    const chip = document.getElementById('barra-conc'), chipNombre = document.getElementById('barra-conc-nombre');
    if (chip) {
      chip.dataset.activa = actual ? 'true' : 'false';
      chip.title = actual ? `Concentrando en ${actual}. Toca para soltar la concentración.` : 'Sin concentración';
      if (chipNombre) chipNombre.textContent = actual || 'Sin concentración';
      chip.setAttribute('aria-label', actual ? `Concentrando en ${actual}. Toca para soltarla.` : 'Sin concentración');
    }
  }
  function fijarConcentracion(nombre) {
    if (modoLectura) return;
    const previa = concentracionActual();
    const el = document.getElementById('concentracion-actual');
    if (el) el.value = nombre || '';
    guardarCampo('concentracion-actual', nombre || '');
    renderConcentracion();
    // Al soltar o cambiar de hechizo se apaga el buff del anterior (si era de concentración).
    if (previa && previa !== nombre && window.FichaHechizos) {
      FichaHechizos.editor.items().forEach((h, idx) => {
        if (h.nombre === previa && h.buff && h.buff.activo && esConcentracion(h)) {
          FichaHechizos.editor.mutar(idx, (it) => { it.buff.activo = false; });
          emitirUso('buff', `Buff "${h.nombre}" desactivado (se soltó la concentración)`);
        }
      });
    }
    if (nombre) emitirUso('concentracion', previa && previa !== nombre ? `Concentración: pasa de "${previa}" a "${nombre}"` : `Concentrando en "${nombre}"`);
    else if (previa) emitirUso('concentracion', `Dejó de concentrarse en "${previa}"`);
    return previa;
  }
  // contenedorId: elemento donde se pinta la casilla (se crea el input oculto con el estado).
  function iniciarConcentracion(contenedorId) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    cont.innerHTML = `<input type="hidden" id="concentracion-actual" value="">
      <label class="conc-casilla" title="Se marca al lanzar un hechizo con concentración; desmárcala cuando la pierdas"><input type="checkbox" class="conc-check"> 🧠 Concentración: <strong id="concentracion-nombre">ninguna</strong></label>`;
    // Sin id a propósito: ningún autoguardado genérico debe tratarla como un dato; el estado es 'concentracion-actual'.
    cont.querySelector('.conc-check').addEventListener('change', (e) => {
      if (e.target.checked) fijarConcentracion(concentracionActual() || 'Concentración (manual)');
      else fijarConcentracion('');
    });
    document.addEventListener('ficha:datos-sincronizados', renderConcentracion);
    const chipBarra = document.getElementById('barra-conc');
    if (chipBarra && !chipBarra.dataset.ligado) { chipBarra.dataset.ligado = '1'; chipBarra.addEventListener('click', () => { if (concentracionActual()) fijarConcentracion(''); }); }
    renderConcentracion();
    window.FichaConcentracion = { actual: concentracionActual, fijar: fijarConcentracion, esConcentracion };
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

  // Hechizos cuyo efecto se puede repetir muchas veces mientras dura (daño cada turno, ataques de criaturas invocadas…):
  // se lanzan UNA vez (gasta el espacio y concentra) y el daño se tira aparte tantas veces como haga falta. Se puede
  // forzar en cada hechizo con el campo `repetible` (true/false); si no está, se decide por el nombre.
  const HECHIZOS_REPETIBLES = new Set(['Insect Plague', 'Moonbeam', 'Spirit Guardians', 'Call Lightning', 'Flaming Sphere', 'Flame Blade', 'Heat Metal',
    'Cloud of Daggers', 'Cloudkill', 'Wall of Fire', 'Wall of Thorns', 'Wall of Ice', 'Blade Barrier', 'Black Tentacles', "Evard's Black Tentacles", 'Storm of Vengeance',
    'Incendiary Cloud', 'Sunbeam', 'Sickening Radiance', 'Spiritual Weapon', 'Spirit Shroud', 'Vampiric Touch', 'Witch Bolt', "Dragon's Breath", 'Arcane Sword',
    'Arcane Hand', 'Create Bonfire', 'Dawn', 'Spike Growth', 'Hunger of Hadar', 'Hex', "Hunter's Mark", 'Divine Favor', 'Ensnaring Strike',
    'Conjure Animals', 'Conjure Woodland Beings', 'Conjure Minor Elementals', 'Conjure Elemental', 'Conjure Fey', 'Conjure Celestial', 'Giant Insect', 'Animate Objects']);
  const esRepetible = (h) => {
    if (!h) return false;
    if (h.repetible === true) return true;
    if (h.repetible === false) return false;
    const base = String(h.nombre || '').replace(/\s*\(2024\)\s*$/, '').trim();
    return HECHIZOS_REPETIBLES.has(base) || /^Summon /.test(base);
  };

  // Etiqueta «✨ Fey-Touched 1/1» junto a los hechizos que usan cargas propias en vez de espacios.
  function cargasTag(h) {
    const cg = (window.FichaVitales && FichaVitales.cargasDeHechizo && h.nivel > 0) ? FichaVitales.cargasDeHechizo(h) : null;
    if (!cg) return '';
    const nom = String(cg.recurso.nombre || 'Cargas').replace(/\s*\(.*\)\s*$/, '');
    return ` <span class="tag" title="Lanzarlo gasta una carga de ${nom} y no un espacio de conjuro (si no quedan, usa el espacio)">${cg.recurso.icono || '✨'} ${nom} ${cg.quedan}/${cg.total}</span>`;
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
          // Hasta el mayor nivel que tenga contador de espacios en la ficha (o 9 si no hay ninguno visible).
          let nivelMax = 0;
          for (let n = 1; n <= 9; n++) if (document.getElementById(`slot-${n}-cur`)) nivelMax = n;
          if (nivelMax < h.upcast.nivelBase) nivelMax = 9;
          const opciones = [];
          for (let n = h.upcast.nivelBase; n <= nivelMax; n++) opciones.push(n);
          const elegido = upcastElegido[idx] || h.upcast.nivelBase;
          const selectHtml = `<select id="upcast-sel-${idx}" style="width:auto;display:inline-block;" onchange="FichaHechizos.recordarUpcast(${idx}, this.value)">${opciones.map(n => `<option value="${n}" ${n === elegido ? 'selected' : ''}>Nvl ${n}</option>`).join('')}</select>`;
          const etiquetaBtn = h.upcast.tipo === 'tabla' ? '📜 Usar' : '🎲 Tirar';
          accionBtn = `${selectHtml} <button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx})">${etiquetaBtn}</button>`;
          if (esRepetible(h) && (h.formula || h.upcast.tipo === 'dado')) accionBtn = `${selectHtml} <button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx}, 'lanzar')" title="Gasta el espacio y empieza la concentración, sin tirar daño">✨ Lanzar</button> <button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx}, 'tirar')" title="Tira el daño o efecto sin gastar otro espacio (puedes repetirlo mientras dure)">🎲 Daño</button>`;
        } else if (h.formula) {
          accionBtn = `<button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx})">🎲 ${h.formula.count}d${h.formula.sides}${h.formula.mod ? (h.formula.mod > 0 ? '+' : '') + h.formula.mod : ''}</button>`;
          if (esRepetible(h)) accionBtn = `<button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx}, 'lanzar')" title="Gasta el espacio y empieza la concentración, sin tirar daño">✨ Lanzar</button> <button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx}, 'tirar')" title="Tira el daño o efecto sin gastar otro espacio (puedes repetirlo mientras dure)">🎲 ${h.formula.count}d${h.formula.sides}${h.formula.mod ? (h.formula.mod > 0 ? '+' : '') + h.formula.mod : ''}</button>`;
        } else {
          accionBtn = `<button class="btn-roll btn-roll-sm" onclick="FichaHechizos.usar(${idx})">✅ Usar</button>`;
        }
        const ataqueBadge = !h.ataque ? '' :
          h.ataque.tipo === 'ataque'
            ? `<span class="tag tag-atk">🎯 ${formatearMod(valorAtaqueHechizo(h.ataque, 'bonus'))} Ataque</span>`
            : `<span class="tag tag-atk">🛡️ ${h.ataque.habilidad} DC ${valorAtaqueHechizo(h.ataque, 'dc')}</span>`;
        const areaTxt = h.area ? ` · 📐 ${h.area}` : '';
        const upcastTxt = h.upcast ? ' · ⬆️ Escala con el nivel del espacio' : '';
        const buffTxt = (h.buff ? ` · 🔆 ${resumenEfectos(h.buff.efectos)}` : '') + (esConcentracion(h) ? ' · 🧠 Conc.' : '');
        if (h.buff) {
          accionBtn += ` <button type="button" class="btn-buff ${h.buff.activo ? 'on' : ''}" onclick="FichaHechizos.alternarBuff(${idx})" title="Prender/apagar el efecto">${h.buff.activo ? '🟢 Activo' : '⚪ Activar'}</button>`;
        }
        return `
          <tr>
            <td><span class="tag">${h.especial ? '⭐ ' : ''}${etiquetaNivelConjuro(h.nivel)}</span></td>
            <td><strong>${h.nombre}</strong>${ataqueBadge ? ' ' + ataqueBadge : ''}${cargasTag(h)}</td>
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
          <input type="text" id="hf-duracion" placeholder="Duración" value="${h ? h.duracion : ''}" oninput="if (/conc/i.test(this.value)) document.getElementById('hf-concentracion').checked = true;">
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
              <span>+</span>
              <input type="number" id="hf-upcast-dado-mod" placeholder="fijo" style="width:55px;" title="Bono fijo por nivel (opcional)" value="${h && h.upcast && h.upcast.tipo === 'dado' && h.upcast.dado.mod ? h.upcast.dado.mod : ''}">
            </div>
            <div id="hf-upcast-tabla-campos" style="display:${h && h.upcast && h.upcast.tipo === 'tabla' ? 'block' : 'none'};">
              <span class="spell-form-mini-label">Una línea por nivel, formato "nivel: efecto":</span>
              <textarea id="hf-upcast-tabla" rows="4" placeholder="3: efecto a nivel 3&#10;4: efecto a nivel 4">${h && h.upcast && h.upcast.tipo === 'tabla' ? Object.entries(h.upcast.tabla).map(([n, t]) => `${n}: ${t}`).join('\n') : ''}</textarea>
            </div>
          </div>
 <div class="spell-form-row-dado">
            <label><input type="checkbox" id="hf-concentracion" ${h ? (esConcentracion(h) ? 'checked' : '') : ''}> 🧠 Requiere concentración (marca la casilla de concentración al lanzarlo)</label>
            <label><input type="checkbox" id="hf-repetible" ${h && esRepetible(h) ? 'checked' : ''}> 🔁 Efecto repetible mientras dura: botones «Lanzar» (gasta el espacio) y «Daño» (se tira las veces que haga falta)</label>
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
      const hb = editor.items()[idx];
      if (hb && hb.buff) emitirUso('buff', `Buff "${hb.nombre}" ${hb.buff.activo ? 'activado' : 'desactivado'}`, resumenEfectos(hb.buff.efectos));
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
            mod: parseInt(document.getElementById('hf-upcast-dado-mod').value, 10) || 0,
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
        concentracion: document.getElementById('hf-concentracion').checked,
        repetible: document.getElementById('hf-repetible') ? document.getElementById('hf-repetible').checked : undefined,
        slotCost: nivel > 0 ? nivel : null,
      });
    }

    // Gasta el espacio del nivel elegido (fijo en h.slotCost, o el nivel elegido en
    // el selector de upcast de esa fila) y resuelve el efecto: tirada de dados
    // (fija, o base+bono por nivel si es upcast tipo 'dado'), texto de una tabla
    // por nivel (upcast tipo 'tabla'), o un simple "usado" si no hay nada de eso.
    function usar(idx, modo) {
      // modo: undefined = lanzar y tirar (lo de siempre) | 'lanzar' = gasta el espacio y concentra, sin tirar | 'tirar' = solo tira, sin gastar espacio
      const h = editor.items()[idx];
      if (!h || modoLectura) return;
      const soloTirar = modo === 'tirar', soloLanzar = modo === 'lanzar';

      let nivelGastado = h.slotCost;
      if (h.upcast) {
        const sel = document.getElementById(`upcast-sel-${idx}`);
        nivelGastado = sel ? parseInt(sel.value, 10) : h.upcast.nivelBase;
      }

      let quedan = null;
      let slotId = null;
      // Hechizos con cargas propias (Fey-Touched…): si quedan cargas, gasta una y NO el espacio de conjuro; si no, usa el espacio como cualquier hechizo.
      let cargaUsada = null, sinCargas = null;
      if (!soloTirar && h.nivel > 0 && window.FichaVitales && FichaVitales.cargasDeHechizo) {
        const cg = FichaVitales.cargasDeHechizo(h);
        if (cg) { if (cg.quedan > 0) cargaUsada = FichaVitales.gastarCarga(h); else sinCargas = cg.recurso; }
      }
      if (nivelGastado && !soloTirar && !cargaUsada) {
        // Id directo ('slot-N-cur'), no indexado por posición en FICHA_CONFIG.slotsIds
        // — esa indexación se rompía (undefined) para cualquier nivel más allá de
        // slotsIds.length, como pasó de verdad al probar contra los datos reales de Fiona.
        // FICHA_CONFIG.resolverSlotId(h, nivel) permite otra reserva (p.ej. Pact Magic); por defecto 'slot-N-cur'.
        slotId = FICHA_CONFIG.resolverSlotId ? FICHA_CONFIG.resolverSlotId(h, nivelGastado) : `slot-${nivelGastado}-cur`;
        // FICHA_CONFIG.validarLanzamiento(h, nivel, slotId): devuelve un texto para impedir el lanzamiento (p. ej. el
        // espacio de Pact Magic es de un nivel menor al del hechizo) o falsy si puede seguir.
        if (FICHA_CONFIG.validarLanzamiento) { const aviso = FICHA_CONFIG.validarLanzamiento(h, nivelGastado, slotId); if (aviso) { alert(aviso); return; } }
        const el = document.getElementById(slotId);
        if (el) {
          const actual = parseInt(el.textContent) || 0;
          if (actual <= 0) { alert(`⚠️ No te quedan espacios de ${FICHA_CONFIG.etiquetaEspacio ? FICHA_CONFIG.etiquetaEspacio(slotId, nivelGastado) : 'nivel ' + nivelGastado} disponibles.`); return; }
          el.textContent = actual - 1;
          quedan = actual - 1;
          guardarCampo(slotId, actual - 1);
          // FICHA_CONFIG.alGastarSlot(nivel, hechizo, slotId): registro de uso, casillas espejo, etc.
          if (FICHA_CONFIG.alGastarSlot) FICHA_CONFIG.alGastarSlot(nivelGastado, h, slotId);
        }
      }

      // Registro de uso (historial del lanzador de dados, si está cargado).
      if (!soloTirar && cargaUsada) emitirUso('hechizo', `Lanzó ${h.nombre} con ${cargaUsada.recurso.nombre} (quedan ${cargaUsada.quedan}/${cargaUsada.total}; no gastó espacio)`);
      else if (!soloTirar) emitirUso('hechizo', (sinCargas ? `[sin cargas de ${sinCargas.nombre}] ` : '') + (h.nivel === 0 ? `Lanzó ${h.nombre} (truco)` : (nivelGastado ? `Lanzó ${h.nombre} con ${FICHA_CONFIG.etiquetaEspacio ? 'espacio de ' + FICHA_CONFIG.etiquetaEspacio(slotId, nivelGastado) : 'espacio de nivel ' + nivelGastado}${quedan !== null ? ` (quedan ${quedan})` : ''}` : `Lanzó ${h.nombre}`)));
      const enDados = (window.FichaDados && FichaDados.mostrar) ? FichaDados.mostrar : null;

      // Hechizo de concentración: marca la casilla (y deja de concentrar en el anterior).
      let sufijoBuff = '';
      if (!soloTirar && esConcentracion(h) && window.FichaConcentracion) {
        const previa = FichaConcentracion.fijar(h.nombre);
        sufijoBuff += `\n🧠 Concentrando en "${h.nombre}"${previa && previa !== h.nombre ? ` (dejas de concentrarte en "${previa}")` : ''}.`;
      }
      // Lanzar un hechizo con buff lo activa (apagarlo es a mano o con la ✖ del panel).
      if (!soloTirar && h.buff && !h.buff.activo) {
        editor.mutar(idx, (it) => { it.buff.activo = true; });
        sufijoBuff += `\n🔆 Buff "${h.nombre}" activado: ${resumenEfectos(h.buff.efectos)}.`;
        emitirUso('buff', `Buff "${h.nombre}" activado`, resumenEfectos(h.buff.efectos));
      }

      if (soloLanzar) return;   // el efecto se tira después con «Daño» (tantas veces como haga falta)

      if (h.upcast && h.upcast.tipo === 'tabla') {
        const texto = h.upcast.tabla[nivelGastado] || h.upcast.tabla[h.upcast.nivelBase] || '(sin detalle para ese nivel)';
        if (enDados) enDados(`📜 nivel ${nivelGastado}`, h.nombre, texto);
        else alert(`📜 ${h.nombre} (nivel ${nivelGastado}): ${texto}${sufijoBuff}`);
        return;
      }

      let count = h.formula ? h.formula.count : 0;
      let sides = h.formula ? h.formula.sides : (h.upcast && h.upcast.tipo === 'dado' ? h.upcast.dado.sides : 0);
      let mod = h.formula ? h.formula.mod : 0;
      if (h.upcast && h.upcast.tipo === 'dado') {
        const extraNiveles = Math.max(0, nivelGastado - h.upcast.nivelBase);
        count += h.upcast.dado.count * extraNiveles;
        mod += (h.upcast.dado.mod || 0) * extraNiveles; // bono fijo por nivel (p.ej. Magic Missile: +1 por nivel)
      }
      if (count > 0 && sides > 0) {
        const tiradas = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
        let total = tiradas.reduce((a, b) => a + b, 0) + mod;
        const etiquetaNivel = h.upcast ? ` (nivel ${nivelGastado})` : '';
        let detalle = `[${tiradas.join(', ')}]${mod ? (mod > 0 ? ' + ' : ' − ') + Math.abs(mod) : ''}`;
        // Buffs con condición de hechizo (p. ej. el Tótem de Unicornio suma a las curaciones): bonos fijos y dados extra.
        const etq = etiquetasDeHechizo(h), ctxB = { hechizo: h, nivel: nivelGastado };
        [['curacion', false], ['dano', true]].forEach(([obj, soloCond]) => {
          if (!etq.has(obj)) return;
          const bb = FichaBuffs.bonoDeHechizo(obj, ctxB, soloCond);
          if (bb.partes.length) { total += bb.total; detalle += ' | ' + bb.partes.join(' | '); }
        });
        if (soloTirar && esConcentracion(h) && window.FichaConcentracion && FichaConcentracion.actual() !== h.nombre) detalle += ' | ⚠️ no estás concentrado en este hechizo (lánzalo primero)';
        if (enDados) enDados(total, `${h.nombre}${etiquetaNivel}`, detalle);
        else alert(`🎲 ${h.nombre}${etiquetaNivel}: ${detalle} = ${total}${sufijoBuff}`);
      } else if (!enDados) {
        alert(`✅ ${h.nombre}: usado (sin tirada automática).${sufijoBuff}`);
      }
    }

    // Re-renderiza al recalcular atributos solo si algún hechizo tiene valores automáticos
    // (evita resetear los selectores de upcast en cada sincronización si no hace falta).
    // Las etiquetas de cargas se actualizan al marcar/desmarcar una casilla de recurso, al descansar y al terminar de cargar la ficha.
    const hayCargas = () => window.FichaVitales && FichaVitales.cargasDeHechizo && editor.items().some(h => h.nivel > 0 && FichaVitales.cargasDeHechizo(h));
    document.addEventListener('change', (e) => { if (e.target && e.target.dataset && e.target.dataset.recurso && hayCargas()) editor.renderizar(); });
    document.addEventListener('ficha:lista', () => { if (hayCargas()) editor.renderizar(); });
    document.addEventListener('ficha:atributos', () => {
      if (editor.items().some(h => h.ataque && (h.ataque.dcAuto || h.ataque.bonusAuto))) editor.renderizar();
    });

    function recordarUpcast(idx, valor) { upcastElegido[idx] = parseInt(valor, 10); }

    registrarFuenteBuffs(() => editor.items()
      .map((h, idx) => ({ h, idx }))
      .filter(x => x.h.buff && x.h.buff.activo)
      .map(x => ({ nombre: x.h.nombre, efectos: x.h.buff.efectos || [], apagar: () => alternarBuff(x.idx) })));

    // Atajos: pasan por window.FichaHechizos.usar para que los envoltorios de la ficha (puente de casillas, etc.) también los vean.
    const lanzar = (idx) => window.FichaHechizos.usar(idx, 'lanzar'), tirar = (idx) => window.FichaHechizos.usar(idx, 'tirar');
    window.FichaHechizos = { editor, usar, lanzar, tirar, esRepetible, guardarDesdeFormulario, alternarCamposAtaque, alternarCamposUpcast, recordarUpcast,
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
      alCambiar: () => document.dispatchEvent(new CustomEvent('ficha:inventario')),
      datosIniciales: FICHA_CONFIG.inventarioInicial,
      contenedorListaId: 'inventario-lista',
      contenedorFormId: 'inventario-form-container',
      filaVacia: '<p class="inventory-empty">Inventario vacío.</p>',
      renderFila: (item, idx) => {
        const nombreEsc = item.nombre.replace(/'/g, "\\'");
        const catLabel = { armadura: '🛡️ Armadura', escudo: '🛡️ Escudo', municion: '🏹 Munición', bienes: '💰 Bienes' }[item.categoria] || '';
        const acInfo = '';   // la CA, el tope de DEX y las penalizaciones se describen en una línea propia (descripcionArmadura)
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
            ${(() => { const d = descripcionArmadura(item); return d ? `<div class="inventory-item-desc inventory-item-ca">${d}</div>` : ''; })()}
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
            <option value="escudo" ${item && item.categoria === 'escudo' ? 'selected' : ''}>Escudo (suma a la CA)</option>
            <option value="municion" ${item && item.categoria === 'municion' ? 'selected' : ''}>Munición</option>
            <option value="bienes" ${item && item.categoria === 'bienes' ? 'selected' : ''}>Bienes comerciales</option>
          </select>
          <div id="if-armadura-campos" class="inventory-armadura-campos" style="display:${item && (item.categoria === 'armadura' || item.categoria === 'escudo') ? 'flex' : 'none'};">
            <input type="number" id="if-modac" placeholder="CA base (armadura) / bono (escudo)" value="${item && item.modAC != null ? item.modAC : ''}">
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
      document.getElementById('if-armadura-campos').style.display = (categoria === 'armadura' || categoria === 'escudo') ? 'flex' : 'none';
    }

    function guardarDesdeFormulario() {
      const nombre = document.getElementById('if-nombre').value.trim();
      if (!nombre) { alert('El ítem necesita un nombre.'); return; }
      const categoria = document.getElementById('if-categoria').value;
      let modAC = null, dexCap = null;
      if (categoria === 'armadura' || categoria === 'escudo') {
        const modACRaw = parseInt(document.getElementById('if-modac').value, 10);
        modAC = isNaN(modACRaw) ? null : modACRaw;
      }
      if (categoria === 'armadura') {
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
      emitirUso('inventario', `Usó ${item.nombre} (quedan ${item.cantidad})`);
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
    window.FichaAtributos = { recalcular, nivel: nivelActual, profBonusActual: () => estadoAtributos.prof, modDe: (clave) => estadoAtributos.mods[clave] ?? 0, bonoSkill: (clave) => estadoAtributos.bonosSkill[clave] ?? 0 };
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
    (opts.eventos || []).forEach(ev => document.addEventListener(ev, recalcular));
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
      const antes = editor.items()[idx] ? editor.items()[idx].valor : null;
      editor.mutar(idx, (r) => { r.valor += delta; });
      const r2 = editor.items()[idx];
      if (r2 && antes !== null) emitirUso('reputacion', `Reputación con ${r2.faccion}: ${antes} → ${r2.valor}`);
    }

    window.FichaReputacion = { editor, guardarDesdeFormulario, ajustar };
  }

  // ============================================================
  // 9b. BUFFS PERSONALIZADOS — interruptores propios del personaje (no atados a un hechizo)
  //     Lista en datos/buffs-personales-json: [{ nombre, icono, activo, descripcion, avisarGrupo:{texto}|null,
  //       efectos:[{ tipo:'plano'|'dado'|'ventaja'|'desventaja', objetivo, valor|dado, cuando }] }]
  //     Cada efecto usa el mismo formato que los buffs de hechizo (ver 5b), más el "cuando" y los valores dinámicos.
  //     Se apagan a mano; aparecen junto a los estados. FICHA_CONFIG.buffsIniciales siembra la lista.
  //     avisarGrupo: al encender o apagar manda una NOTIFICACIÓN al resto del grupo (FichaDados.avisarGrupo);
  //     no modifica ninguna otra ficha.
  // ============================================================
  function iniciarBuffsPersonales() {
    const ACCIONES = [['sumar', 'Suma'], ['restar', 'Resta'], ['dado', 'Suma un dado'], ['ventaja', 'Da ventaja'], ['desventaja', 'Da desventaja']];
    const VALORES = [['fijo', 'Número fijo'], ['nivelClase', 'Tu nivel de una clase'], ['modificador', 'Un modificador'], ['competencia', 'Tu bono de competencia']];
    const OBJ_ADV = [['ataque', 'Tiradas de ataque'], ['salvaciones', 'Salvaciones'], ['pruebas', 'Pruebas y habilidades']];
    const CONDICIONES = [['siempre', 'Siempre'], ['etiqueta', 'Si el hechizo tiene la etiqueta…'], ['nombre', 'Si el hechizo se llama…'], ['nivel', 'Si el hechizo es de nivel… o más'], ['concentrando', 'Mientras estoy concentrado'], ['pgMitad', 'Mientras tengo la mitad de mis PG o menos'], ['estado', 'Mientras tengo el estado…']];
    const ETIQUETAS = ['curación', 'daño', 'fuego', 'frío', 'rayo', 'trueno', 'ácido', 'veneno', 'necrótico', 'radiante', 'psíquico', 'fuerza', 'ataque', 'salvación', 'buff', 'control', 'invocación', 'concentración', 'utilidad'];
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const opts = (lista, sel) => lista.map(([v, t]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${t}</option>`).join('');
    let filasForm = [];   // efectos en edición (estado del formulario)

    // --- el efecto guardado ⇄ la fila del formulario ---
    function efectoAFila(e) {
      const f = { accion: 'sumar', objetivo: e.objetivo || 'curacion', valorTipo: 'fijo', num: 0, clase: '', hab: 'WIS', dc: 1, dl: 6, cond: 'siempre', cv: '' };
      if (e.tipo === 'ventaja' || e.tipo === 'desventaja') f.accion = e.tipo;
      else if (e.tipo === 'dado') { f.accion = 'dado'; f.dc = e.dado.count; f.dl = e.dado.sides; }
      else if (e.valor && typeof e.valor === 'object') { f.valorTipo = e.valor.de; f.clase = e.valor.clase || ''; f.hab = e.valor.hab || 'WIS'; f.accion = (e.valor.signo === -1) ? 'restar' : 'sumar'; }
      else { f.num = Math.abs(Number(e.valor) || 0); f.accion = (Number(e.valor) < 0) ? 'restar' : 'sumar'; }
      const c = e.cuando || {};
      if (c.hechizo && c.hechizo.etiqueta) { f.cond = 'etiqueta'; f.cv = c.hechizo.etiqueta; }
      else if (c.hechizo && c.hechizo.nombre) { f.cond = 'nombre'; f.cv = c.hechizo.nombre; }
      else if (c.hechizo && c.hechizo.nivelMin != null) { f.cond = 'nivel'; f.cv = c.hechizo.nivelMin; }
      else if (c.concentrando) f.cond = 'concentrando';
      else if (c.pgMitad) f.cond = 'pgMitad';
      else if (c.estado) { f.cond = 'estado'; f.cv = c.estado; }
      return f;
    }
    function filaAEfecto(f) {
      const e = { objetivo: f.objetivo };
      if (f.accion === 'ventaja' || f.accion === 'desventaja') e.tipo = f.accion;
      else if (f.accion === 'dado') { e.tipo = 'dado'; e.dado = { count: Math.max(1, parseInt(f.dc, 10) || 1), sides: parseInt(f.dl, 10) || 6 }; }
      else {
        e.tipo = 'plano';
        const signo = f.accion === 'restar' ? -1 : 1;
        if (f.valorTipo === 'fijo') e.valor = signo * Math.abs(parseInt(f.num, 10) || 0);
        else { e.valor = { de: f.valorTipo, signo }; if (f.valorTipo === 'nivelClase') e.valor.clase = f.clase; if (f.valorTipo === 'modificador') e.valor.hab = f.hab; }
      }
      const cv = String(f.cv == null ? '' : f.cv).trim();
      if (f.cond === 'etiqueta' && cv) e.cuando = { hechizo: { etiqueta: cv } };
      else if (f.cond === 'nombre' && cv) e.cuando = { hechizo: { nombre: cv } };
      else if (f.cond === 'nivel' && cv) e.cuando = { hechizo: { nivelMin: parseInt(cv, 10) || 0 } };
      else if (f.cond === 'concentrando') e.cuando = { concentrando: true };
      else if (f.cond === 'pgMitad') e.cuando = { pgMitad: true };
      else if (f.cond === 'estado' && cv) e.cuando = { estado: cv };
      return e;
    }

    function htmlFila(f, i) {
      const esDado = f.accion === 'dado', esVent = f.accion === 'ventaja' || f.accion === 'desventaja';
      const objetivos = esVent ? OBJ_ADV : (esDado ? OBJETIVOS_DADO : OBJETIVOS_PLANO);
      const objSel = objetivos.some(o => o[0] === f.objetivo) ? f.objetivo : objetivos[0][0];
      const claseOpts = (typeof CONFIG_NIVEL !== 'undefined' && CONFIG_NIVEL ? CONFIG_NIVEL.clases : []).map(c => `<option value="${esc(c.nombre)}"${c.nombre === f.clase ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('');
      const cvCampo = (f.cond === 'etiqueta') ? `<input type="text" class="bp-cv" list="bp-etiquetas" value="${esc(f.cv)}" placeholder="p. ej. curación">`
        : (f.cond === 'nombre') ? `<input type="text" class="bp-cv" value="${esc(f.cv)}" placeholder="parte del nombre">`
        : (f.cond === 'nivel') ? `<input type="number" class="bp-cv" min="0" max="9" value="${esc(f.cv)}">`
        : (f.cond === 'estado') ? `<input type="text" class="bp-cv" value="${esc(f.cv)}" placeholder="p. ej. Envenenado">` : '';
      return `<div class="bp-efecto" data-i="${i}">
        <div class="bp-efecto-cab"><strong>Efecto ${i + 1}</strong><button type="button" class="btn-clear" onclick="FichaBuffsPersonales.quitarEfecto(${i})" aria-label="Quitar el efecto ${i + 1}">✖</button></div>
        <div class="bp-partes">
          <div class="bp-parte"><span class="bp-et">Qué hace</span>
            <select class="bp-accion" data-i="${i}">${opts(ACCIONES, f.accion)}</select>
            ${(!esDado && !esVent) ? `<select class="bp-valor-tipo" data-i="${i}">${opts(VALORES, f.valorTipo)}</select>` : ''}
            ${(!esDado && !esVent && f.valorTipo === 'fijo') ? `<input type="number" class="bp-num" value="${esc(f.num)}" aria-label="Valor">` : ''}
            ${(!esDado && !esVent && f.valorTipo === 'nivelClase') ? `<select class="bp-clase">${claseOpts}</select>` : ''}
            ${(!esDado && !esVent && f.valorTipo === 'modificador') ? `<select class="bp-hab">${STATS_ATRIBUTO.map(h => `<option${h === f.hab ? ' selected' : ''}>${h}</option>`).join('')}</select>` : ''}
            ${esDado ? `<span class="bp-dado"><input type="number" class="bp-dc" min="1" value="${esc(f.dc)}" aria-label="Cantidad de dados"> d <input type="number" class="bp-dl" min="2" value="${esc(f.dl)}" aria-label="Caras del dado"></span>` : ''}
          </div>
          <div class="bp-parte"><span class="bp-et">A qué se aplica</span>
            <select class="bp-objetivo" data-i="${i}">${opts(objetivos, objSel)}</select>
          </div>
          <div class="bp-parte"><span class="bp-et">Cuándo</span>
            <select class="bp-cond" data-i="${i}">${opts(CONDICIONES, f.cond)}</select>
            ${cvCampo}
          </div>
        </div>
      </div>`;
    }
    function pintarEfectosForm() {
      const cont = document.getElementById('bp-efectos'); if (!cont) return;
      cont.innerHTML = filasForm.map(htmlFila).join('') || '<p class="bp-vacio">Sin efectos todavía.</p>';
      actualizarFrase();
    }
    function leerFilasDelDOM() {
      document.querySelectorAll('#bp-efectos .bp-efecto').forEach((el) => {
        const i = parseInt(el.dataset.i, 10), f = filasForm[i]; if (!f) return;
        const v = (sel) => { const e = el.querySelector(sel); return e ? e.value : undefined; };
        f.accion = v('.bp-accion') || f.accion; f.objetivo = v('.bp-objetivo') || f.objetivo;
        if (v('.bp-valor-tipo') !== undefined) f.valorTipo = v('.bp-valor-tipo');
        if (v('.bp-num') !== undefined) f.num = v('.bp-num');
        if (v('.bp-clase') !== undefined) f.clase = v('.bp-clase');
        if (v('.bp-hab') !== undefined) f.hab = v('.bp-hab');
        if (v('.bp-dc') !== undefined) f.dc = v('.bp-dc');
        if (v('.bp-dl') !== undefined) f.dl = v('.bp-dl');
        f.cond = v('.bp-cond') || f.cond;
        f.cv = v('.bp-cv') !== undefined ? v('.bp-cv') : '';
      });
    }
    function actualizarFrase() {
      const el = document.getElementById('bp-frase'); if (!el) return;
      const ef = filasForm.map(filaAEfecto);
      el.textContent = ef.length ? 'Encendido: ' + resumenEfectos(ef) + '.' : '';
    }

    const editor = crearEditorDeLista({
      storageKey: 'buffs-personales-json',
      datosIniciales: FICHA_CONFIG.buffsIniciales || [],
      contenedorListaId: 'buffs-personales-lista',
      contenedorFormId: 'buffs-personales-form',
      filaVacia: '<p class="bp-vacio">Todavía no creaste ningún buff personalizado.</p>',
      alCambiar: () => notificarBuffs(),
      renderFila: (b, idx) => `<div class="buff-personal" data-activo="${b.activo ? 'true' : 'false'}">
        <button type="button" class="buff-toggle" aria-pressed="${b.activo ? 'true' : 'false'}" onclick="FichaBuffsPersonales.alternar(${idx})"><span aria-hidden="true">${esc(b.icono || '🔆')}</span><span>${esc(b.nombre)}</span><span class="buff-est">${b.activo ? 'ENCENDIDO' : 'apagado'}</span></button>
        <span class="buff-personal-resumen">${esc(resumenEfectos(b.efectos))}${b.descripcion ? ' — ' + esc(b.descripcion) : ''}${b.avisarGrupo ? ' · 📣 avisa al grupo' : ''}</span>
        <span class="buff-personal-acciones"><button type="button" onclick="FichaBuffsPersonales.editor.mostrarFormulario(${idx})" title="Editar" aria-label="Editar ${esc(b.nombre)}">✏️</button><button type="button" onclick="FichaBuffsPersonales.editor.eliminar(${idx}, '¿Quitar el buff «${esc(b.nombre).replace(/'/g, "\\'")}»?')" title="Quitar" aria-label="Quitar ${esc(b.nombre)}">🗑️</button></span>
      </div>`,
      renderFormulario: (b) => {
        filasForm = ((b && b.efectos) || []).map(efectoAFila);
        if (!filasForm.length) filasForm.push(efectoAFila({ tipo: 'plano', objetivo: 'ca', valor: 1 }));
        setTimeout(pintarEfectosForm, 0);
        return `<div class="bp-form">
          <datalist id="bp-etiquetas">${ETIQUETAS.map(t => `<option value="${t}">`).join('')}</datalist>
          <div class="bp-grid">
            <label class="bp-campo"><span>Nombre</span><input type="text" id="bp-nombre" value="${esc(b ? b.nombre : '')}" placeholder="p. ej. Tótem de Unicornio"></label>
            <label class="bp-campo"><span>Ícono</span><input type="text" id="bp-icono" maxlength="4" value="${esc(b ? b.icono || '🔆' : '🔆')}"></label>
            <label class="bp-campo bp-ancho"><span>Nota (opcional)</span><input type="text" id="bp-desc" value="${esc(b ? b.descripcion || '' : '')}" placeholder="Para recordar qué es"></label>
          </div>
          <div id="bp-efectos"></div>
          <div class="bp-frase" id="bp-frase" aria-live="polite"></div>
          <label class="bp-check"><input type="checkbox" id="bp-grupo"${b && b.avisarGrupo ? ' checked' : ''}> 📣 Avisar al grupo al encenderlo o apagarlo <small>(solo una notificación: no cambia ninguna otra ficha)</small></label>
          <input type="text" id="bp-grupo-texto" value="${esc(b && b.avisarGrupo ? b.avisarGrupo.texto : '')}" placeholder="Mensaje para el grupo (opcional)">
          <div class="bp-acciones">
            <button type="button" onclick="FichaBuffsPersonales.agregarEfecto()">➕ Agregar efecto</button>
            <button type="button" onclick="FichaBuffsPersonales.editor.cerrarFormulario()">Cancelar</button>
            <button type="button" class="bp-guardar" onclick="FichaBuffsPersonales.guardarDesdeFormulario()">💾 Guardar buff</button>
          </div>
        </div>`;
      },
    });

    function agregarEfecto() { leerFilasDelDOM(); filasForm.push(efectoAFila({ tipo: 'plano', objetivo: 'ca', valor: 1 })); pintarEfectosForm(); }
    function quitarEfecto(i) { leerFilasDelDOM(); filasForm.splice(i, 1); pintarEfectosForm(); }
    function guardarDesdeFormulario() {
      leerFilasDelDOM();
      const nombre = (document.getElementById('bp-nombre').value || '').trim();
      if (!nombre) { alert('El buff necesita un nombre.'); return; }
      if (!filasForm.length) { alert('Agrega al menos un efecto.'); return; }
      const idx = editor.editandoIdx();
      const previo = idx !== null ? editor.items()[idx] : null;
      const grupoOn = document.getElementById('bp-grupo').checked;
      editor.guardarDesdeFormulario({
        nombre, icono: (document.getElementById('bp-icono').value || '🔆').trim(),
        descripcion: (document.getElementById('bp-desc').value || '').trim(),
        activo: previo ? !!previo.activo : false,
        avisarGrupo: grupoOn ? { texto: (document.getElementById('bp-grupo-texto').value || '').trim() } : null,
        efectos: filasForm.map(filaAEfecto),
      });
    }
    function alternar(idx) {
      if (modoLectura) return;
      const b = editor.items()[idx]; if (!b) return;
      const activo = !b.activo;
      editor.mutar(idx, (it) => { it.activo = activo; });
      const etiqueta = `${b.icono || '🔆'} ${b.nombre}`;
      emitirUso('buff', `Buff "${b.nombre}" ${activo ? 'activado' : 'desactivado'}`, resumenEfectos(b.efectos));
      if (b.avisarGrupo && window.FichaDados && FichaDados.avisarGrupo) FichaDados.avisarGrupo(etiqueta, `${activo ? 'activo' : 'terminó'}${b.avisarGrupo.texto ? ' — ' + b.avisarGrupo.texto : ''}`);
    }

    // Cambios en el formulario: rearmar la fila (campos que dependen de la acción o de la condición) y la frase de resumen.
    document.addEventListener('change', (e) => {
      const t = e.target;
      if (!t || !t.closest || !t.closest('#bp-efectos')) return;
      leerFilasDelDOM();
      if (t.classList.contains('bp-accion') || t.classList.contains('bp-valor-tipo') || t.classList.contains('bp-cond')) {
        const i = parseInt(t.dataset.i, 10), f = filasForm[i];
        if (t.classList.contains('bp-accion')) {   // el objetivo válido depende de la acción
          const esVent = f.accion === 'ventaja' || f.accion === 'desventaja';
          const lista = esVent ? OBJ_ADV : (f.accion === 'dado' ? OBJETIVOS_DADO : OBJETIVOS_PLANO);
          if (!lista.some(o => o[0] === f.objetivo)) f.objetivo = lista[0][0];
        }
        if (t.classList.contains('bp-cond')) f.cv = '';
        pintarEfectosForm();
      } else actualizarFrase();
    });
    document.addEventListener('input', (e) => { if (e.target && e.target.closest && e.target.closest('#bp-efectos')) { leerFilasDelDOM(); actualizarFrase(); } });

    registrarFuenteBuffs(() => editor.items()
      .map((b, idx) => ({ b, idx }))
      .filter(x => x.b.activo)
      .map(x => ({ nombre: x.b.nombre, icono: x.b.icono || '🔆', efectos: x.b.efectos || [], apagar: () => alternar(x.idx) })));

    window.FichaBuffsPersonales = { editor, alternar, agregarEfecto, quitarEfecto, guardarDesdeFormulario };
    notificarBuffs();
    return window.FichaBuffsPersonales;
  }

  window.FichaComun = {
    setCharRef, guardarCampo, sincronizarDatosDesdeNube, reaplicarDatos, aplicarModoLectura,
    crearEditorDeLista, iniciarEditorHechizos, iniciarEditorInventario,
    iniciarBitacora, bloquearPorSistemaIncorrecto, iniciarPermisosYCompartir,
    calcularProfBonus, calcularModificador, formatearMod,
    iniciarAtributos, iniciarEstadisticaConBuff, iniciarEditorReputacion,
    registrarFuenteBuffs, notificarBuffs, iniciarBuffsPersonales, iniciarCA, iniciarConcentracion, esCampoEfimero, emitirUso,
  };
})();

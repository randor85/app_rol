/*
 * crear-personaje.js — asistente paso a paso para crear un personaje de D&D (crear-personaje.html?campana=<código>).
 *
 * Arma el objeto `form` que documenta ficha-generador.js, llama a FichaGenerador.generar y escribe el resultado en
 * campanas/<campana>/personajes/<id> con una transacción (solo si no existe). La ficha se abre con
 * ficha.html?pj=<id>&campana=<campana> (ficha-shell.js lee la `definicion` de los ids que empiezan con `pc_`).
 *
 * Estado: un único objeto `E` en memoria; cada paso se dibuja desde E, así que ir y volver conserva todo.
 * Sin alert/confirm/prompt: los avisos y errores se muestran en la página.
 */
(function () {
  'use strict';

  const FIREBASE = {
    apiKey: 'AIzaSyBaCAA748xac6HcrQnY-p1jHRp8_CtgtbU', authDomain: 'personajes-rol.firebaseapp.com',
    databaseURL: 'https://personajes-rol-default-rtdb.firebaseio.com', projectId: 'personajes-rol',
    storageBucket: 'personajes-rol.appspot.com', messagingSenderId: '81108671440', appId: '1:81108671440:web:effb710af86054f4c6f7d5',
  };

  const G = window.FichaGenerador;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mod = (v) => Math.floor(((parseInt(v, 10) || 10) - 10) / 2);
  const signo = (n) => (n >= 0 ? '+' : '−') + Math.abs(n);
  const entero = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };

  const ATRS = G.ATRIBUTOS, ATR_ES = G.ATRIBUTO_ES;
  const PASOS = ['Identidad', 'Clase', 'Atributos', 'Habilidades', 'Equipo', 'Hechizos', 'Revisión'];
  const P_HECHIZOS = 5, P_REVISION = 6;
  const HAB_ES = { 'Acrobatics': 'Acrobacias', 'Animal Handling': 'Trato con animales', 'Arcana': 'Arcanos', 'Athletics': 'Atletismo', 'Deception': 'Engaño', 'History': 'Historia', 'Insight': 'Perspicacia', 'Intimidation': 'Intimidación', 'Investigation': 'Investigación', 'Medicine': 'Medicina', 'Nature': 'Naturaleza', 'Perception': 'Percepción', 'Performance': 'Interpretación', 'Persuasion': 'Persuasión', 'Religion': 'Religión', 'Sleight of Hand': 'Juego de manos', 'Stealth': 'Sigilo', 'Survival': 'Supervivencia' };
  const DANO_ES = { B: 'contundente', P: 'perforante', S: 'cortante' };
  const ESPECIES = ['Humano', 'Elfo', 'Enano', 'Mediano', 'Gnomo', 'Semielfo', 'Semiorco', 'Tiefling', 'Dracónido', 'Aasimar', 'Goliat', 'Genasi'];
  const TRASFONDOS = ['Acólito', 'Artista', 'Charlatán', 'Criminal', 'Ermitaño', 'Forastero', 'Héroe del pueblo', 'Marinero', 'Noble', 'Pilluelo', 'Sabio', 'Soldado'];
  const ALINEAMIENTOS = ['Legal bueno', 'Neutral bueno', 'Caótico bueno', 'Legal neutral', 'Neutral', 'Caótico neutral', 'Legal malvado', 'Neutral malvado', 'Caótico malvado', 'Sin alineamiento'];
  const LISTAS = ['Mago', 'Clérigo', 'Druida', 'Bardo', 'Hechicero', 'Brujo', 'Paladín', 'Ranger'];
  const MAX_FILAS_CLASE = 3;
  const PUNTOS_TOTAL = 27;

  const params = new URLSearchParams(location.search);
  const CAMPANA = (params.get('campana') || '').trim();

  let db = null, usuario = null;
  const panel = $('paso-panel');
  const erroresBox = $('errores-paso');

  /* ============================================================ estado */
  function nuevoEstado() {
    const vacio = (v) => ATRS.reduce((o, k) => { o[k] = v; return o; }, {});
    return {
      paso: 0, maxPaso: 0,
      id: { nombre: '', especie: '', trasfondo: '', alineamiento: '', velocidad: '30', idiomas: 'Común', historia: '', paleta: (window.FichaPaleta && FichaPaleta.actual()) || 'bosque' },
      clases: [{ id: '', nivel: '1', subclase: '', listaHechizos: '' }],
      metodo: 'array', array: vacio(null), puntos: vacio(8), manual: vacio(''), tiradas: {}, bonos: vacio(0),
      hab: {},
      armadura: '', escudo: false, armas: [], busquedaArmas: '', extra: [], oro: '0',
      hechizos: {}, filtros: {}, vistas: {},
      creando: false, creado: null,
    };
  }
  let E = nuevoEstado();

  /* ============================================================ datos de clases */
  const listaClases = () => (typeof CLASSES !== 'undefined' ? CLASSES : []);
  const dc = (id) => listaClases().find((c) => c.id === id) || null;
  const nomClase = (d) => d.nombre_es || d.name;
  const nivelDe = (c) => entero(c.nivel, 0);
  const nivelTotal = () => E.clases.reduce((s, c) => s + (c.id ? nivelDe(c) : 0), 0);
  const subLvl = (d) => d.subclassLevel || 3;
  const pideSubclase = (c) => { const d = dc(c.id); return !!(d && (d.subclasses || []).length && nivelDe(c) >= subLvl(d)); };
  const necesitaLista = (d) => !!(d && d.casterType && !G.LISTA_HECHIZOS[d.id]);
  const bonoComp = () => 2 + Math.floor((Math.max(nivelTotal(), 1) - 1) / 4);
  const clasesLanzadoras = () => E.clases.filter((c) => { const d = dc(c.id); return d && d.casterType; });
  const hayLanzadora = () => clasesLanzadoras().length > 0;
  const pasoActivo = (i) => (i === P_HECHIZOS ? hayLanzadora() : true);

  /* ============================================================ atributos */
  function baseDe(k) {
    if (E.metodo === 'array') return E.array[k];
    if (E.metodo === 'puntos') return E.puntos[k];
    const v = parseInt(E.manual[k], 10);
    return isNaN(v) ? null : v;
  }
  function totalDe(k) { const b = baseDe(k); return b == null ? null : Math.min(30, Math.max(1, b + (parseInt(E.bonos[k], 10) || 0))); }
  function atributosFinales(tolerante) {
    const o = {};
    for (const k of ATRS) { const t = totalDe(k); if (t == null) { if (!tolerante) return null; o[k] = 10; } else o[k] = t; }
    return o;
  }
  const gastados = () => ATRS.reduce((s, k) => s + (G.COSTO_PUNTOS[E.puntos[k]] || 0), 0);
  function tirar4d6() {
    const d = [0, 0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
    return { valor: d[1] + d[2] + d[3], texto: `4d6 → ${d.slice().reverse().join(', ')} (se descarta ${d[0]}) = ${d[1] + d[2] + d[3]}` };
  }

  /* ============================================================ construcción del form */
  function podarHechizos() {
    const nuevo = {};
    clasesLanzadoras().forEach((c) => {
      const lim = G.limitesHechizos(esClaseForm(c));
      const validos = new Set(listaHechizosDe(c).map((s) => s.name));
      const previos = E.hechizos[c.id] || [];
      nuevo[c.id] = previos.filter((n) => validos.has(n));
      if (!lim.lista) nuevo[c.id] = [];
    });
    E.hechizos = nuevo;
  }
  function esClaseForm(c) {
    const d = dc(c.id);
    const niv = nivelDe(c);
    const o = { id: c.id, nivel: niv, subclase: d && niv >= subLvl(d) ? (c.subclase || '') : '' };
    if (c.listaHechizos) o.listaHechizos = c.listaHechizos;
    return o;
  }
  function todosHechizos() {
    const out = [];
    clasesLanzadoras().forEach((c) => (E.hechizos[c.id] || []).forEach((n) => { if (!out.includes(n)) out.push(n); }));
    return out;
  }
  function construirForm() {
    podarHechizos();
    const f = E.id;
    const form = {
      nombre: f.nombre.trim(), especie: f.especie.trim(), trasfondoNombre: f.trasfondo.trim(), alineamiento: f.alineamiento,
      velocidad: entero(f.velocidad, 30), paleta: f.paleta, historia: f.historia, idiomas: f.idiomas.trim(),
      clases: E.clases.filter((c) => c.id).map(esClaseForm),
      atributos: atributosFinales(true),
      habilidades: Object.assign({}, E.hab),
      armadura: E.armadura || null, escudo: !!E.escudo, armas: E.armas.slice(),
      equipoExtra: E.extra.filter((x) => String(x.nombre || '').trim()).map((x) => ({ nombre: String(x.nombre).trim(), cantidad: Math.max(1, entero(x.cantidad, 1)), descripcion: String(x.descripcion || '') })),
      oro: Math.max(0, entero(E.oro, 0)),
      hechizos: todosHechizos(),
    };
    return form;
  }

  function caEstimada(form) {
    const at = form.atributos, dexM = mod(at.DEX);
    const ar = G.ARMADURAS.find((a) => a[0] === form.armadura);
    const escudo = form.escudo ? 2 : 0;
    if (ar) { const tope = ar[2]; const dm = tope === 0 ? 0 : (tope == null ? dexM : Math.min(dexM, tope)); return ar[1] + dm + escudo; }
    const c0 = form.clases[0] && form.clases[0].id;
    const sin = c0 === 'barbarian' ? ['DEX', 'CON'] : c0 === 'monk' ? ['DEX', 'WIS'] : ['DEX'];
    return 10 + sin.reduce((s, h) => s + mod(at[h]), 0) + escudo;
  }

  /* ============================================================ hechizos: listas */
  function listaHechizosDe(c) {
    const lim = G.limitesHechizos(esClaseForm(c));
    if (!lim.lista || typeof SPELLS === 'undefined') return [];
    return SPELLS.filter((s) => (s.clases || []).includes(lim.lista) && s.nivel <= lim.maxNivel)
      .sort((a, b) => a.nivel - b.nivel || a.name.localeCompare(b.name));
  }
  function contadoresDe(c) {
    const sel = E.hechizos[c.id] || [];
    let trucos = 0, otros = 0;
    sel.forEach((n) => { const s = SPELLS.find((x) => x.name === n); if (s) { if (s.nivel === 0) trucos++; else otros++; } });
    return { trucos, otros };
  }

  /* ============================================================ validación por paso */
  function validarPaso(n) {
    const e = [];
    if (n === 0) {
      if (!E.id.nombre.trim()) e.push('Pon un nombre al personaje.');
    }
    if (n === 1) {
      const filas = E.clases.filter((c) => c.id);
      if (!filas.length) e.push('Elige al menos una clase.');
      E.clases.forEach((c, i) => { if (!c.id && E.clases.length > 1) e.push(`La clase ${i + 1} está vacía: elige una o quita la fila.`); });
      filas.forEach((c) => {
        const d = dc(c.id), niv = nivelDe(c), nom = nomClase(d);
        if (!(niv >= 1 && niv <= 20)) e.push(`El nivel de ${nom} tiene que estar entre 1 y 20.`);
        if (pideSubclase(c) && !c.subclase) e.push(`${nom}: elige ${d.subclassLabel || 'subclase'} (se obtiene en nivel ${subLvl(d)}).`);
        if (necesitaLista(d) && !c.listaHechizos) e.push(`${nom}: elige de qué lista toma sus hechizos.`);
      });
      const ids = filas.map((c) => c.id);
      if (new Set(ids).size !== ids.length) e.push('No repitas la misma clase: suma sus niveles en una sola fila.');
      if (nivelTotal() > 20) e.push(`El nivel total no puede pasar de 20 (ahora suma ${nivelTotal()}).`);
    }
    if (n === 2) {
      if (E.metodo === 'array') {
        const falta = ATRS.filter((k) => E.array[k] == null);
        if (falta.length) e.push(`Asigna un valor del array a todos los atributos (falta: ${falta.map((k) => ATR_ES[k]).join(', ')}).`);
      } else if (E.metodo === 'manual') {
        const falta = ATRS.filter((k) => baseDe(k) == null);
        if (falta.length) e.push(`Completa el valor de: ${falta.map((k) => ATR_ES[k]).join(', ')} (tira los dados o escríbelo).`);
        ATRS.forEach((k) => { const b = baseDe(k); if (b != null && (b < 1 || b > 30)) e.push(`${ATR_ES[k]} tiene que estar entre 1 y 30.`); });
      }
    }
    if (n === 3) {
      const c0 = E.clases[0], hc = c0 && G.HABILIDADES_CLASE[c0.id];
      const marcadas = Object.keys(E.hab).length;
      if (!c0 || !c0.id) e.push('Elige primero la clase (paso 2).');
      else if (hc && marcadas < hc.cantidad) e.push(`Marca al menos ${hc.cantidad} habilidades con competencia: tu clase inicial (${nomClase(dc(c0.id))}) da ${hc.cantidad}. Te faltan ${hc.cantidad - marcadas}.`);
    }
    return e;
  }
  // Errores del generador → paso donde se corrigen.
  function pasoDeError(msg) {
    if (/nombre/i.test(msg)) return 0;
    if (/clase|nivel|subclase|repitas/i.test(msg) && !/hechizo/i.test(msg)) return 1;
    if (/hechizo/i.test(msg)) return P_HECHIZOS;
    if (/habilidades/i.test(msg)) return 3;
    if (/entre 1 y 30/.test(msg)) return 2;
    return null;
  }

  /* ============================================================ UI base: pasos, progreso, errores */
  function mostrarErrores(lista, enfocar) {
    if (!lista.length) { erroresBox.hidden = true; erroresBox.innerHTML = ''; return; }
    erroresBox.innerHTML = `<div><strong>Falta corregir esto:</strong><ul>${lista.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`;
    erroresBox.hidden = false;
    if (enfocar) { erroresBox.focus(); try { erroresBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) { /* nada */ } }
  }
  function refrescarErroresVisibles() { if (!erroresBox.hidden && E.paso <= 3) mostrarErrores(validarPaso(E.paso), false); }

  function pintarPasos() {
    const n = PASOS.length;
    $('pasos').innerHTML = PASOS.map((nom, i) => {
      const hecho = i < E.maxPaso && i !== E.paso && pasoActivo(i);
      const omit = !pasoActivo(i);
      const bloqueado = i > E.maxPaso;
      return `<li><button type="button" class="paso-btn${hecho ? ' hecho' : ''}${omit ? ' omitido' : ''}" data-act="ir" data-paso="${i}"${bloqueado ? ' disabled' : ''}${i === E.paso ? ' aria-current="step"' : ''} aria-label="Paso ${i + 1}: ${nom}${omit ? ' (no aplica a tu clase)' : ''}${hecho ? ' (completado)' : ''}"><span class="num" aria-hidden="true">${hecho ? '✓' : i + 1}</span><span class="lbl">${nom}</span></button></li>`;
    }).join('');
    $('progreso-texto').textContent = `Paso ${E.paso + 1} de ${n}`;
    $('progreso-nombre').textContent = PASOS[E.paso];
    const pct = Math.round(((E.paso + 1) / n) * 100);
    $('progreso').setAttribute('aria-valuenow', String(pct));
    $('progreso-barra').style.width = pct + '%';
    $('btn-anterior').style.visibility = E.paso === 0 ? 'hidden' : 'visible';
    const sig = $('btn-siguiente');
    if (E.paso === P_REVISION) { sig.textContent = '✨ Crear personaje'; sig.dataset.act = 'crear'; sig.disabled = E.creando; if (E.creando) sig.textContent = 'Creando…'; }
    else { sig.textContent = 'Siguiente →'; sig.dataset.act = 'siguiente'; sig.disabled = false; }
  }

  function conFoco(fn) {
    const a = document.activeElement;
    const k = a && a.dataset ? a.dataset.k : null;
    fn();
    if (k) { const n = panel.querySelector(`[data-k="${k.replace(/"/g, '\\"')}"]`); if (n && !n.disabled) { try { n.focus({ preventScroll: true }); } catch (x) { /* nada */ } } }
  }

  function renderPaso(enfocarTitulo) {
    const htmls = [htmlIdentidad, htmlClase, htmlAtributos, htmlHabilidades, htmlEquipo, htmlHechizos, htmlRevision];
    panel.innerHTML = `<h2 id="paso-titulo" tabindex="-1">${E.paso + 1}. ${PASOS[E.paso]}</h2>` + htmls[E.paso]();
    pintarPasos();
    if (E.paso === 1) actualizarClases();
    if (E.paso === 4) { pintarListaArmas(); actualizarCA(); }
    if (E.paso === 5) clasesLanzadoras().forEach((c) => pintarListaHechizos(c));
    if (enfocarTitulo) { const t = $('paso-titulo'); if (t) { t.focus(); try { t.scrollIntoView({ block: 'start' }); } catch (x) { /* nada */ } } }
  }

  function irA(p, opts) {
    opts = opts || {};
    // Los pasos que no aplican (hechizos sin lanzadora) se saltan al avanzar/retroceder con los botones.
    if (opts.salto && !pasoActivo(p)) p += opts.salto;
    p = Math.max(0, Math.min(PASOS.length - 1, p));
    E.paso = p;
    if (p > E.maxPaso) E.maxPaso = p;
    if (p === P_HECHIZOS) podarHechizos();
    mostrarErrores([], false);
    renderPaso(true);
  }
  function siguiente() {
    const errs = validarPaso(E.paso);
    if (errs.length) { mostrarErrores(errs, true); return; }
    irA(E.paso + 1, { salto: 1 });
  }
  function anterior() { irA(E.paso - 1, { salto: -1 }); }

  /* ============================================================ PASO 1: identidad */
  function htmlIdentidad() {
    const f = E.id;
    const pal = (window.FichaPaleta ? FichaPaleta.PALETAS : []);
    return `<p class="intro">Cuéntanos quién es tu personaje. Solo el nombre es obligatorio; el resto se puede ajustar después.</p>
    <div class="form-grid">
      <label class="campo"><span>Nombre *</span><input type="text" data-bind="id.nombre" data-k="nombre" value="${esc(f.nombre)}" maxlength="60" autocomplete="off" aria-required="true"></label>
      <label class="campo"><span>Especie / raza</span><input type="text" data-bind="id.especie" data-k="especie" value="${esc(f.especie)}" list="lista-especies" maxlength="40" autocomplete="off" placeholder="Humano, Elfo, Enano…"></label>
      <label class="campo"><span>Trasfondo</span><input type="text" data-bind="id.trasfondo" data-k="trasfondo" value="${esc(f.trasfondo)}" list="lista-trasfondos" maxlength="40" autocomplete="off" placeholder="Soldado, Sabio, Criminal…"></label>
      <label class="campo"><span>Alineamiento</span><select data-bind="id.alineamiento" data-k="alineamiento"><option value="">— Sin elegir —</option>${ALINEAMIENTOS.map((a) => `<option${f.alineamiento === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
      <label class="campo"><span>Velocidad (pies)</span><select data-bind="id.velocidad" data-k="velocidad">${[25, 30, 35].map((v) => `<option value="${v}"${String(f.velocidad) === String(v) ? ' selected' : ''}>${v} ft</option>`).join('')}</select></label>
      <label class="campo"><span>Idiomas</span><input type="text" data-bind="id.idiomas" data-k="idiomas" value="${esc(f.idiomas)}" maxlength="120" autocomplete="off" placeholder="Común, Élfico…"></label>
      <label class="campo"><span>Paleta de la ficha</span><select data-bind="id.paleta" data-act="paleta" data-k="paleta">${pal.map((p) => `<option value="${esc(p.id)}"${f.paleta === p.id ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>
    </div>
    <label class="campo"><span>Historia</span><textarea data-bind="id.historia" data-k="historia" rows="5" placeholder="De dónde viene, qué quiere, qué lo mueve…">${esc(f.historia)}</textarea></label>
    <datalist id="lista-especies">${ESPECIES.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
    <datalist id="lista-trasfondos">${TRASFONDOS.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`;
  }

  /* ============================================================ PASO 2: clase */
  function opcionesClase(sel) {
    const of = listaClases().filter((c) => !c.custom), cu = listaClases().filter((c) => c.custom);
    const op = (c) => `<option value="${esc(c.id)}"${sel === c.id ? ' selected' : ''}>${esc(nomClase(c))}${nomClase(c) !== c.name ? ' (' + esc(c.name) + ')' : ''}</option>`;
    return `<option value="">— Elige una clase —</option><optgroup label="Oficiales">${of.map(op).join('')}</optgroup>${cu.length ? `<optgroup label="✨ Custom de la campaña">${cu.map(op).join('')}</optgroup>` : ''}`;
  }
  function htmlClase() {
    return `<p class="intro">Elige tu clase inicial. Si quieres multiclase, suma hasta ${MAX_FILAS_CLASE} clases (la primera es la inicial; el nivel total no puede pasar de 20).</p>
    <div class="pila" id="filas-clases">${E.clases.map((c, i) => `
      <div class="tarjeta" data-fila="${i}">
        <div class="tarjeta-cab"><h3>${i === 0 ? 'Clase inicial' : 'Clase ' + (i + 1)}</h3>${E.clases.length > 1 ? `<button type="button" class="btn btn-peligro btn-sm" data-act="clase-quitar" data-i="${i}" data-k="quitar-${i}" aria-label="Quitar la clase ${i + 1}">Quitar</button>` : ''}</div>
        <div class="form-grid">
          <label class="campo"><span>Clase</span><select data-act="clase-sel" data-i="${i}" data-k="clase-${i}">${opcionesClase(c.id)}</select></label>
          <label class="campo"><span>Nivel (1–20)</span><input type="number" min="1" max="20" inputmode="numeric" data-bind="clases.${i}.nivel" data-k="nivel-${i}" value="${esc(c.nivel)}"></label>
        </div>
        <div id="detalle-clase-${i}" class="pila"></div>
      </div>`).join('')}
    </div>
    <div class="fila"><button type="button" class="btn btn-fantasma" data-act="clase-agregar" data-k="agregar-clase"${E.clases.length >= MAX_FILAS_CLASE ? ' disabled' : ''}>＋ Agregar otra clase (multiclase)</button>
    <span class="total-nivel" id="total-nivel" aria-live="polite"></span></div>`;
  }
  function detalleClase(i) {
    const c = E.clases[i], d = dc(c.id);
    if (!d) return '<p class="texto-suave">Elige una clase para ver su resumen y sus rasgos.</p>';
    const niv = nivelDe(c);
    const partes = [];
    const campos = [];
    if ((d.subclasses || []).length) {
      if (niv >= subLvl(d)) {
        campos.push(`<label class="campo"><span>${esc(d.subclassLabel || 'Subclase')} *</span><select data-act="subclase-sel" data-i="${i}" data-k="sub-${i}"><option value="">— Elige una —</option>${d.subclasses.map((s) => `<option value="${esc(s.name)}"${c.subclase === s.name ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>`);
      } else {
        campos.push(`<div class="campo"><span>${esc(d.subclassLabel || 'Subclase')}</span><p class="texto-suave">Se elige a partir del nivel ${subLvl(d)}.</p></div>`);
      }
    }
    if (necesitaLista(d)) {
      campos.push(`<label class="campo"><span>Lista de hechizos *</span><select data-act="lista-sel" data-i="${i}" data-k="lista-${i}"><option value="">— Elige una lista —</option>${LISTAS.map((l) => `<option${c.listaHechizos === l ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`);
    }
    if (campos.length) partes.push(`<div class="form-grid">${campos.join('')}</div>`);
    const chips = [`Dado de golpe d${d.hitDie}`, `Salvaciones: ${(d.savingThrows || []).join(' y ')}`, d.casterType ? 'Lanza hechizos' : 'No lanza hechizos'];
    if (d.custom) chips.push('✨ Custom');
    partes.push(`<div class="chips">${chips.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>`);
    if (d.resumen) partes.push(`<p class="texto-suave">${esc(d.resumen)}</p>`);
    const sub = c.subclase && (d.subclasses || []).find((s) => s.name === c.subclase);
    if (sub && niv >= subLvl(d) && sub.resumen) partes.push(`<p class="texto-suave"><strong>${esc(sub.name)}:</strong> ${esc(sub.resumen)}</p>`);
    const feats = (d.features || []).filter((f) => f.nivel <= niv).map((f) => ({ f, tag: nomClase(d) }));
    if (sub && niv >= subLvl(d)) (sub.features || []).filter((f) => f.nivel <= niv).forEach((f) => feats.push({ f, tag: sub.name }));
    feats.sort((a, b) => a.f.nivel - b.f.nivel);
    partes.push(`<details class="rasgos"><summary>Rasgos hasta el nivel ${niv} (${feats.length})</summary>${feats.length ? feats.map(({ f, tag }) => `<div class="rasgo"><h4>Nv ${f.nivel} · ${esc(f.nombre)} <span class="tag">${esc(tag)}</span></h4><p>${esc(f.desc || '')}</p></div>`).join('') : '<p class="texto-suave">Todavía no tiene rasgos a este nivel.</p>'}</details>`);
    return partes.join('');
  }
  function actualizarClases() {
    E.clases.forEach((c, i) => {
      const el = $('detalle-clase-' + i); if (!el) return;
      const abierto = (el.querySelector('details.rasgos') || {}).open;
      el.innerHTML = detalleClase(i);
      const det = el.querySelector('details.rasgos'); if (det && abierto) det.open = true;
    });
    const t = nivelTotal(), el = $('total-nivel');
    if (el) { el.textContent = `Nivel total: ${t} / 20${t > 20 ? ' — te pasaste' : ''}`; el.classList.toggle('mal', t > 20); }
    const ag = panel.querySelector('[data-act="clase-agregar"]'); if (ag) ag.disabled = E.clases.length >= MAX_FILAS_CLASE;
  }

  /* ============================================================ PASO 3: atributos */
  function htmlAtributos() {
    const m = E.metodo;
    const radio = (v, t, d) => `<label class="op"><input type="radio" name="metodo" value="${v}" data-act="metodo" data-k="metodo-${v}"${m === v ? ' checked' : ''}> <span><strong>${t}</strong> <small>${d}</small></span></label>`;
    const rest = PUNTOS_TOTAL - gastados();
    return `<p class="intro">Elige cómo generar los valores base y suma, si corresponde, los bonos de tu especie o trasfondo.</p>
    <fieldset class="pila"><legend>Método</legend>
      ${radio('array', 'Array estándar', '15, 14, 13, 12, 10, 8 — asígnalos a cada atributo')}
      ${radio('puntos', 'Compra de puntos', '27 puntos, valores de 8 a 15')}
      ${radio('manual', 'Manual', '4d6 descartando el menor, o escríbelo a mano')}
    </fieldset>
    ${m === 'puntos' ? `<div class="aviso${rest === 0 ? ' aviso-bien' : ''}" role="status" id="puntos-restantes">Puntos restantes: <strong>${rest}</strong> de ${PUNTOS_TOTAL}</div>` : ''}
    ${m === 'manual' ? `<div class="fila"><button type="button" class="btn btn-fantasma btn-sm" data-act="tirar-todos" data-k="tirar-todos">🎲 Tirar los seis</button><span class="texto-suave">Cada tirada es 4d6 sin el dado más bajo.</span></div>` : ''}
    <div class="attr-lista">${ATRS.map((k) => `
      <div class="attr-card" data-attr="${k}">
        <div class="attr-nombre"><strong>${ATR_ES[k]}</strong><span class="tag">${k}</span></div>
        <div class="attr-controles">
          <div class="campo"><span>Base</span>${controlBase(k)}</div>
          <label class="campo"><span>Bono especie</span><select data-bind="bonos.${k}" data-act="bono" data-k="bono-${k}" aria-label="Bono de especie o trasfondo de ${ATR_ES[k]}">${[-2, -1, 0, 1, 2, 3].map((b) => `<option value="${b}"${(parseInt(E.bonos[k], 10) || 0) === b ? ' selected' : ''}>${b > 0 ? '+' + b : b === 0 ? '0' : '−' + (-b)}</option>`).join('')}</select></label>
        </div>
        <div class="attr-total" data-tot="${k}">${totalTexto(k)}</div>
        ${E.metodo === 'manual' && E.tiradas[k] ? `<div class="nota-tirada" data-tirada="${k}">${esc(E.tiradas[k])}</div>` : ''}
      </div>`).join('')}
    </div>`;
  }
  function controlBase(k) {
    if (E.metodo === 'array') {
      const usados = new Set(ATRS.filter((o) => o !== k).map((o) => E.array[o]).filter((v) => v != null));
      return `<select data-act="array-sel" data-k="array-${k}" data-attr="${k}" aria-label="Valor base de ${ATR_ES[k]}"><option value="">—</option>${G.ARRAY_ESTANDAR.map((v) => `<option value="${v}"${E.array[k] === v ? ' selected' : ''}${usados.has(v) ? ' disabled' : ''}>${v}</option>`).join('')}</select>`;
    }
    if (E.metodo === 'puntos') {
      const v = E.puntos[k], rest = PUNTOS_TOTAL - gastados();
      const puedeSubir = v < 15 && (G.COSTO_PUNTOS[v + 1] - G.COSTO_PUNTOS[v]) <= rest;
      return `<div class="contador" role="group" aria-label="Valor base de ${ATR_ES[k]}"><button type="button" data-act="punto-menos" data-attr="${k}" data-k="menos-${k}" aria-label="Bajar ${ATR_ES[k]}"${v <= 8 ? ' disabled' : ''}>−</button><span class="contador-valor" aria-live="polite">${v}</span><button type="button" data-act="punto-mas" data-attr="${k}" data-k="mas-${k}" aria-label="Subir ${ATR_ES[k]}"${puedeSubir ? '' : ' disabled'}>+</button></div>`;
    }
    return `<div class="fila"><input type="number" min="1" max="30" inputmode="numeric" data-bind="manual.${k}" data-act="manual" data-attr="${k}" data-k="manual-${k}" value="${esc(E.manual[k])}" aria-label="Valor base de ${ATR_ES[k]}"><button type="button" class="btn btn-fantasma btn-sm" data-act="tirar" data-attr="${k}" data-k="tirar-${k}" aria-label="Tirar 4d6 para ${ATR_ES[k]}">🎲 Tirar</button></div>`;
  }
  function totalTexto(k) {
    const b = baseDe(k), bono = parseInt(E.bonos[k], 10) || 0, t = totalDe(k);
    if (t == null) return '<span>Total: sin asignar</span>';
    return `Base ${b} ${bono ? (bono > 0 ? '+ ' + bono : '− ' + (-bono)) : ''} → <strong>${t}</strong> <span>(modificador ${signo(mod(t))})</span>`;
  }
  function actualizarAtributos() {
    ATRS.forEach((k) => { const el = panel.querySelector(`[data-tot="${k}"]`); if (el) el.innerHTML = totalTexto(k); });
    const pr = $('puntos-restantes');
    if (pr) { const rest = PUNTOS_TOTAL - gastados(); pr.innerHTML = `Puntos restantes: <strong>${rest}</strong> de ${PUNTOS_TOTAL}`; pr.classList.toggle('aviso-bien', rest === 0); }
  }

  /* ============================================================ PASO 4: habilidades */
  function htmlHabilidades() {
    const c0 = E.clases[0], d0 = c0 && dc(c0.id);
    if (!d0) return '<div class="aviso" role="status"><p>Elige primero la clase (paso 2) para ver cuántas habilidades te da.</p></div>';
    const hc = G.HABILIDADES_CLASE[d0.id];
    const at = atributosFinales(true), pb = bonoComp();
    const opciones = hc ? (hc.opciones === 'cualquiera' ? Object.keys(G.HABILIDADES) : hc.opciones) : [];
    const marcadas = Object.keys(E.hab).length;
    const enOpciones = Object.keys(E.hab).filter((n) => opciones.includes(n)).length;
    const sug = (hc ? hc.cantidad : 0) + 2;
    const salv = (d0.savingThrows || []).join(' y ') || '—';
    const pericias = E.clases.filter((c) => c.id).flatMap((c) => { const d = dc(c.id); return d ? (d.features || []).filter((f) => /Expertise|Pericia/i.test(f.nombre) && f.nivel <= nivelDe(c)).map((f) => `${nomClase(d)} (${f.nombre}, nv ${f.nivel})`) : []; });
    return `<p class="intro">Marca las habilidades en las que tienes competencia. Con competencia sumas tu bono (+${pb} a nivel ${Math.max(nivelTotal(), 1)}); con pericia, el doble.</p>
    <div class="tarjeta">
      <p><strong>${esc(nomClase(d0))}</strong> (clase inicial) te da elegir <strong>${hc ? hc.cantidad : '—'}</strong> habilidades ${hc ? (hc.opciones === 'cualquiera' ? '<strong>cualquiera</strong>' : 'de: ' + opciones.map((o) => `<strong>${esc(HAB_ES[o] || o)}</strong>`).join(', ')) : '(clase custom: elige las que correspondan)'}. El trasfondo suele dar 2 más.</p>
      <p>Salvaciones con competencia: <strong>${esc(salv)}</strong>.</p>
      ${pericias.length ? `<p class="texto-suave">Rasgos de pericia de tu(s) clase(s): ${esc(pericias.join('; '))}. Marca «Pericia» en las habilidades que correspondan.</p>` : ''}
      <div class="chips" aria-live="polite" id="resumen-hab"><span class="tag">Marcadas: ${marcadas}</span><span class="tag">De la lista de clase: ${enOpciones}${hc ? ' / ' + hc.cantidad : ''}</span><span class="tag">Sugerido total: ${sug}</span></div>
      <div id="avisos-hab">${avisosHab(hc, opciones, marcadas, enOpciones, sug)}</div>
    </div>
    <ul class="hab-lista">${Object.keys(G.HABILIDADES).sort((a, b) => (HAB_ES[a] || a).localeCompare(HAB_ES[b] || b)).map((n) => {
      const a = G.HABILIDADES[n], v = E.hab[n], comp = !!v, exp = v === 'exp';
      const m = mod(at[a]) + (comp ? pb * (exp ? 2 : 1) : 0);
      const clase = opciones.includes(n);
      return `<li class="hab-item${comp ? ' comp' : ''}">
        <label class="op"><input type="checkbox" data-act="hab" data-n="${esc(n)}" data-k="hab-${esc(n)}"${comp ? ' checked' : ''}><span>${esc(HAB_ES[n] || n)} <small>${a}</small>${clase ? ' <span class="tag">clase</span>' : ''}</span></label>
        <label class="op"><input type="checkbox" data-act="hab-exp" data-n="${esc(n)}" data-k="exp-${esc(n)}"${exp ? ' checked' : ''}${comp ? '' : ' disabled'}><span>Pericia</span></label>
        <span class="hab-mod" aria-label="Modificador ${signo(m)}">${signo(m)}</span></li>`;
    }).join('')}</ul>`;
  }
  function avisosHab(hc, opciones, marcadas, enOpciones, sug) {
    const av = [];
    if (hc && marcadas > sug) av.push(`Marcaste ${marcadas} habilidades; lo habitual es ${hc.cantidad} de la clase + 2 del trasfondo (${sug}). Puedes dejarlo así si tu GM lo permite.`);
    if (hc && marcadas >= hc.cantidad && enOpciones < hc.cantidad) av.push(`Solo ${enOpciones} de las habilidades marcadas están en la lista de tu clase (te corresponden ${hc.cantidad}). Está bien si el resto viene de otras fuentes.`);
    return av.length ? `<div class="aviso" role="status"><ul>${av.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
  }

  /* ============================================================ PASO 5: equipo */
  function descArmadura(a) { return `${a[0]} — CA ${a[1]}${a[2] === null ? ' + DEX' : a[2] === 0 ? ' (sin DEX)' : ' + DEX (máx. ' + a[2] + ')'}`; }
  function htmlEquipo() {
    const grupos = ['ligera', 'media', 'pesada'];
    return `<p class="intro">Armadura, armas y equipo con el que arrancas. La armadura y el escudo quedan equipados; las armas, en el inventario con su ataque listo.</p>
    <div class="form-grid">
      <label class="campo"><span>Armadura</span><select data-bind="armadura" data-act="armadura" data-k="armadura"><option value="">Sin armadura</option>${grupos.map((g) => `<optgroup label="Armadura ${g}">${G.ARMADURAS.filter((a) => a[3] === g).map((a) => `<option value="${esc(a[0])}"${E.armadura === a[0] ? ' selected' : ''}>${esc(descArmadura(a))}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <div class="campo"><span>Escudo</span><label class="op"><input type="checkbox" data-bind="escudo" data-act="escudo" data-k="escudo"${E.escudo ? ' checked' : ''}> Shield (+2 CA)</label></div>
      <div class="campo"><span>CA estimada</span><strong id="ca-est" aria-live="polite">—</strong></div>
      <label class="campo"><span>Oro inicial (po)</span><input type="number" min="0" inputmode="numeric" data-bind="oro" data-k="oro" value="${esc(E.oro)}"></label>
    </div>
    <div class="pila">
      <h3>Armas <span class="tag" id="cuenta-armas"></span></h3>
      <label class="campo"><span>Buscar arma</span><input type="search" data-bind="busquedaArmas" data-act="buscar-armas" data-k="buscar-armas" value="${esc(E.busquedaArmas)}" placeholder="Espada, arco, hacha…" autocomplete="off"></label>
      <div class="armas-lista" id="lista-armas" role="group" aria-label="Armas disponibles"></div>
    </div>
    <div class="pila">
      <h3>Equipo extra</h3>
      <div class="pila" id="filas-extra">${E.extra.map((x, i) => filaExtra(x, i)).join('')}</div>
      <div><button type="button" class="btn btn-fantasma btn-sm" data-act="extra-agregar" data-k="extra-agregar">＋ Agregar objeto</button></div>
    </div>`;
  }
  function filaExtra(x, i) {
    return `<div class="fila-extra" data-i="${i}">
      <label class="campo"><span>Nombre</span><input type="text" data-bind="extra.${i}.nombre" data-k="extra-n-${i}" value="${esc(x.nombre)}" maxlength="60" autocomplete="off"></label>
      <label class="campo"><span>Cant.</span><input type="number" min="1" inputmode="numeric" data-bind="extra.${i}.cantidad" data-k="extra-c-${i}" value="${esc(x.cantidad)}"></label>
      <label class="campo"><span>Descripción</span><input type="text" data-bind="extra.${i}.descripcion" data-k="extra-d-${i}" value="${esc(x.descripcion)}" maxlength="200" autocomplete="off"></label>
      <button type="button" class="btn btn-peligro btn-sm" data-act="extra-quitar" data-i="${i}" data-k="extra-q-${i}" aria-label="Quitar el objeto ${i + 1}">Quitar</button></div>`;
  }
  function pintarListaArmas() {
    const q = E.busquedaArmas.trim().toLowerCase();
    const el = $('lista-armas'); if (!el) return;
    const lista = G.ARMAS.filter((a) => !q || a[0].toLowerCase().includes(q));
    el.innerHTML = lista.length ? lista.map((a) => `<label class="op"><input type="checkbox" data-act="arma" data-n="${esc(a[0])}" data-k="arma-${esc(a[0])}"${E.armas.includes(a[0]) ? ' checked' : ''}><span>${esc(a[0])} <small>${a[1]}d${a[2]} ${DANO_ES[a[3]] || a[3]}${a[4] ? ' · ' + esc(a[4]) : ''}</small></span></label>`).join('') : '<p class="texto-suave">Ninguna arma coincide con la búsqueda.</p>';
    const c = $('cuenta-armas'); if (c) c.textContent = `${E.armas.length} elegida${E.armas.length === 1 ? '' : 's'}`;
  }
  function actualizarCA() {
    const el = $('ca-est'); if (!el) return;
    el.textContent = String(caEstimada(construirForm()));
  }

  /* ============================================================ PASO 6: hechizos */
  function htmlHechizos() {
    const cl = clasesLanzadoras();
    if (!cl.length) return '<div class="aviso aviso-bien" role="status"><p><strong>Tu clase no lanza hechizos.</strong> No hace falta elegir nada aquí: sigue al paso siguiente.</p></div>';
    const ed = typeof edicionPreferida === 'function' ? edicionPreferida() : '2014';
    return `<p class="intro">Elige los hechizos de cada clase lanzadora. Los límites son una guía: si te pasas, te avisamos pero no te bloqueamos (por si tu GM lo permite).</p>
    <label class="campo" style="max-width:340px"><span>Edición del texto de los hechizos</span><select data-act="edicion" data-k="edicion"><option value="2014"${ed === '2014' ? ' selected' : ''}>2014 (D&amp;D 5e original)</option><option value="2024"${ed === '2024' ? ' selected' : ''}>2024 (reglas revisadas)</option></select></label>
    ${cl.map((c, idx) => htmlPanelHechizos(c, idx)).join('')}`;
  }
  function htmlPanelHechizos(c, idx) {
    const d = dc(c.id), lim = G.limitesHechizos(esClaseForm(c));
    const f = E.filtros[c.id] || (E.filtros[c.id] = { q: '', nivel: '', solo: false });
    const niveles = []; for (let n = 0; n <= lim.maxNivel; n++) niveles.push(n);
    if (!lim.lista) return `<div class="tarjeta"><h3>${esc(nomClase(d))} ${nivelDe(c)}</h3><div class="aviso" role="status"><p>Esta clase no tiene una lista de hechizos asignada. Vuelve al paso 2 y elígela.</p></div></div>`;
    if (!lim.maxNivel && !lim.trucos) return `<div class="tarjeta"><h3>${esc(nomClase(d))} ${nivelDe(c)}</h3><p class="texto-suave">A nivel ${nivelDe(c)} todavía no tiene hechizos (la lista es la de ${esc(lim.lista)}). Los sumas cuando suba de nivel.</p></div>`;
    return `<div class="tarjeta" data-clase="${esc(c.id)}">
      <div class="tarjeta-cab"><h3>${esc(nomClase(d))} ${nivelDe(c)} <span class="texto-suave" style="font-size:var(--fs-sm)">· lista de ${esc(lim.lista)}</span></h3></div>
      <div class="lim-chips" id="lim-${esc(c.id)}" aria-live="polite">${chipsLimites(c, lim)}</div>
      <div id="aviso-sobre-${esc(c.id)}"></div>
      <div class="form-grid">
        <label class="campo"><span>Buscar hechizo</span><input type="search" data-act="hech-filtro" data-clase="${esc(c.id)}" data-f="q" data-k="hq-${idx}" value="${esc(f.q)}" placeholder="Nombre…" autocomplete="off"></label>
        <label class="campo"><span>Nivel</span><select data-act="hech-filtro" data-clase="${esc(c.id)}" data-f="nivel" data-k="hn-${idx}"><option value="">Todos</option>${niveles.map((n) => `<option value="${n}"${String(f.nivel) === String(n) ? ' selected' : ''}>${n === 0 ? 'Trucos' : 'Nivel ' + n}</option>`).join('')}</select></label>
        <div class="campo"><span>Mostrar</span><label class="op"><input type="checkbox" data-act="hech-filtro" data-clase="${esc(c.id)}" data-f="solo" data-k="hs-${idx}"${f.solo ? ' checked' : ''}> Solo los elegidos</label></div>
      </div>
      <div class="hech-lista" id="lista-hech-${esc(c.id)}" role="group" aria-label="Hechizos de ${esc(nomClase(d))}"></div>
      <div class="vista-hech" id="vista-hech-${esc(c.id)}" aria-live="polite"><span class="texto-suave">Toca el nombre de un hechizo para leer su texto.</span></div>
    </div>`;
  }
  function chipsLimites(c, lim) {
    const k = contadoresDe(c);
    const chip = (t, a, b) => `<span class="lim-chip${a > b ? ' sobre' : a === b && b > 0 ? ' justo' : ''}">${t}: ${a} de ${b}</span>`;
    return `${chip('Trucos elegidos', k.trucos, lim.trucos)}${chip('Hechizos elegidos', k.otros, lim.preparados)}<span class="lim-chip">Nivel máximo: ${lim.maxNivel || '—'}</span>`;
  }
  function pintarListaHechizos(c) {
    const el = $('lista-hech-' + c.id); if (!el) return;
    const f = E.filtros[c.id] || { q: '', nivel: '', solo: false };
    const sel = E.hechizos[c.id] || [];
    const q = f.q.trim().toLowerCase();
    const ed = typeof edicionPreferida === 'function' ? edicionPreferida() : '2014';
    const lista = listaHechizosDe(c).filter((s) => (!q || s.name.toLowerCase().includes(q)) && (f.nivel === '' || String(s.nivel) === String(f.nivel)) && (!f.solo || sel.includes(s.name)));
    const vista = E.vistas[c.id];
    el.innerHTML = lista.length ? lista.map((s) => `<div class="hech-fila${sel.includes(s.name) ? ' elegido' : ''}">
      <input type="checkbox" data-act="hech-sel" data-clase="${esc(c.id)}" data-n="${esc(s.name)}" data-k="hs-${esc(c.id)}-${esc(s.name)}" aria-label="Elegir ${esc(s.name)}"${sel.includes(s.name) ? ' checked' : ''}>
      <button type="button" class="hech-nombre" data-act="hech-ver" data-clase="${esc(c.id)}" data-n="${esc(s.name)}" data-k="hv-${esc(c.id)}-${esc(s.name)}" aria-pressed="${vista === s.name ? 'true' : 'false'}">${esc(s.name)}</button>
      <span class="hech-meta">${s.nivel === 0 ? 'Truco' : 'Nv ' + s.nivel} · ${esc(s.escuela || '')}${typeof etiquetaEdicion === 'function' && etiquetaEdicion(s) ? ' · ' + esc(etiquetaEdicion(s)) : ''}</span></div>`).join('') : '<p class="texto-suave" style="padding:var(--sp-2)">No hay hechizos con ese filtro.</p>';
    actualizarContadoresHechizos(c);
    pintarVistaHechizo(c);
  }
  function actualizarContadoresHechizos(c) {
    const lim = G.limitesHechizos(esClaseForm(c));
    const ch = $('lim-' + c.id); if (ch) ch.innerHTML = chipsLimites(c, lim);
    const k = contadoresDe(c), av = $('aviso-sobre-' + c.id);
    if (av) {
      const m = [];
      if (k.trucos > lim.trucos) m.push(`Elegiste ${k.trucos} trucos y el límite es ${lim.trucos}.`);
      if (k.otros > lim.preparados) m.push(`Elegiste ${k.otros} hechizos y el límite es ${lim.preparados}.`);
      av.innerHTML = m.length ? `<div class="aviso" role="status"><p>${esc(m.join(' '))} Puedes seguir, pero revísalo con tu GM.</p></div>` : '';
    }
  }
  function pintarVistaHechizo(c) {
    const el = $('vista-hech-' + c.id); if (!el) return;
    const n = E.vistas[c.id], s = n && SPELLS.find((x) => x.name === n);
    if (!s) { el.innerHTML = '<span class="texto-suave">Toca el nombre de un hechizo para leer su texto.</span>'; return; }
    const ed = typeof edicionPreferida === 'function' ? edicionPreferida() : '2014';
    const txt = typeof descDeHechizo === 'function' ? descDeHechizo(s, ed) : s.desc;
    el.innerHTML = `<h3>${esc(s.name)}</h3><div class="meta">${s.nivel === 0 ? 'Truco' : 'Nivel ' + s.nivel} · ${esc(s.escuela || '')} · ${esc(s.tiempo || '')} · alcance ${esc(s.alcance || '—')} · ${esc(s.componentes || '')} · ${esc(s.duracion || '')}${etiquetaEdicion(s) ? ' · ' + esc(etiquetaEdicion(s)) : ''}</div><div class="texto">${esc(txt)}</div><div class="meta">Texto según la edición ${ed}.</div>`;
  }

  /* ============================================================ PASO 7: revisión */
  function problemasGlobales() {
    const form = construirForm();
    const out = [];
    for (let p = 0; p <= 3; p++) validarPaso(p).forEach((m) => out.push({ m, p }));
    if (!out.length) {
      try { G.validar(form).forEach((m) => { if (!out.some((o) => o.m === m)) { const p = pasoDeError(m); if (!esFalsoPositivoMulticlase(m, form)) out.push({ m, p: p == null ? 0 : p }); } }); } catch (e) { /* nada */ }
    }
    return out;
  }
  // validar() del generador compara los hechizos contra el nivel máximo de CADA clase lanzadora (ver generarConId).
  function esFalsoPositivoMulticlase(m, form) { return /demasiado alto/.test(m) && form.clases.filter((c) => G.limitesHechizos(c).maxNivel || G.limitesHechizos(c).trucos).length > 1; }

  function htmlRevision() {
    const form = construirForm(), at = form.atributos, f = E.id;
    const pg = G.pgBase(form), ca = caEstimada(form), n = nivelTotal();
    const problemas = problemasGlobales();
    const clasesTxt = form.clases.map((c) => { const d = dc(c.id); return `${nomClase(d)} ${c.nivel}${c.subclase ? ' (' + esc(c.subclase) + ')' : ''}`; }).join(' / ') || '—';
    const comp = Object.keys(form.habilidades);
    const editar = (p, t) => `<button type="button" class="btn btn-fantasma btn-sm" data-act="ir" data-paso="${p}" data-k="editar-${p}">Editar ${t}</button>`;
    const hechCl = clasesLanzadoras().map((c) => { const d = dc(c.id), l = (E.hechizos[c.id] || []); return `<dt>${esc(nomClase(d))}</dt><dd>${l.length ? l.map(esc).join(', ') : '<span class="texto-suave">Ninguno elegido</span>'}</dd>`; }).join('');
    return `${problemas.length ? `<div class="aviso aviso-mal" role="alert"><div><strong>Antes de crear, corrige esto:</strong><ul>${problemas.map((x) => `<li>${esc(x.m)} <button type="button" class="btn btn-fantasma btn-sm" data-act="ir" data-paso="${x.p}">Ir al paso ${x.p + 1}</button></li>`).join('')}</ul></div></div>` : '<div class="aviso aviso-bien" role="status"><p>Todo en orden. Revisa el resumen y crea tu personaje.</p></div>'}
    <div class="tarjeta"><div class="tarjeta-cab"><h3>${esc(form.nombre || '(sin nombre)')}</h3>${editar(0, 'identidad')}</div>
      <dl style="display:grid;grid-template-columns:auto 1fr;gap:2px var(--sp-3);margin:0;font-size:var(--fs-sm)">
        <dt class="texto-suave">Especie</dt><dd style="margin:0">${esc(form.especie || '—')}</dd>
        <dt class="texto-suave">Trasfondo</dt><dd style="margin:0">${esc(form.trasfondoNombre || '—')}</dd>
        <dt class="texto-suave">Alineamiento</dt><dd style="margin:0">${esc(form.alineamiento || '—')}</dd>
        <dt class="texto-suave">Velocidad</dt><dd style="margin:0">${form.velocidad} ft</dd>
        <dt class="texto-suave">Idiomas</dt><dd style="margin:0">${esc(form.idiomas || '—')}</dd>
        <dt class="texto-suave">Paleta</dt><dd style="margin:0">${esc(((window.FichaPaleta ? FichaPaleta.PALETAS : []).find((p) => p.id === form.paleta) || {}).nombre || form.paleta)}</dd>
      </dl></div>
    <div class="rev-grid">
      <div class="tarjeta"><div class="tarjeta-cab"><h3>Clase</h3>${editar(1, 'clase')}</div><p><strong>${clasesTxt}</strong></p><p class="texto-suave">Nivel total ${n}</p>
        <div><span class="texto-suave">Puntos de golpe</span><div class="rev-pg" id="rev-pg">${pg} PG</div></div>
        <div><span class="texto-suave">CA estimada</span><div class="rev-pg" id="rev-ca">${ca}</div></div></div>
      <div class="tarjeta"><div class="tarjeta-cab"><h3>Atributos</h3>${editar(2, 'atributos')}</div>
        <div class="rev-attrs">${ATRS.map((k) => `<div class="rev-attr"><small>${k}</small><strong>${at[k]}</strong><small>${signo(mod(at[k]))}</small></div>`).join('')}</div></div>
    </div>
    <div class="rev-grid">
      <div class="tarjeta"><div class="tarjeta-cab"><h3>Habilidades</h3>${editar(3, 'habilidades')}</div>
        ${comp.length ? `<div class="chips">${comp.map((h) => `<span class="tag">${esc(HAB_ES[h] || h)}${form.habilidades[h] === 'exp' ? ' ★' : ''}</span>`).join('')}</div>` : '<p class="texto-suave">Ninguna</p>'}</div>
      <div class="tarjeta"><div class="tarjeta-cab"><h3>Equipo</h3>${editar(4, 'equipo')}</div>
        <dl style="display:grid;grid-template-columns:auto 1fr;gap:2px var(--sp-3);margin:0;font-size:var(--fs-sm)">
          <dt class="texto-suave">Armadura</dt><dd style="margin:0">${esc(form.armadura || 'Sin armadura')}${form.escudo ? ' + escudo' : ''}</dd>
          <dt class="texto-suave">Armas</dt><dd style="margin:0">${form.armas.length ? form.armas.map(esc).join(', ') : '—'}</dd>
          <dt class="texto-suave">Extra</dt><dd style="margin:0">${form.equipoExtra.length ? form.equipoExtra.map((x) => esc(x.nombre) + (x.cantidad > 1 ? ' ×' + x.cantidad : '')).join(', ') : '—'}</dd>
          <dt class="texto-suave">Oro</dt><dd style="margin:0">${form.oro} po</dd>
        </dl></div>
    </div>
    ${hayLanzadora() ? `<div class="tarjeta"><div class="tarjeta-cab"><h3>Hechizos</h3>${editar(P_HECHIZOS, 'hechizos')}</div><dl style="display:grid;grid-template-columns:auto 1fr;gap:2px var(--sp-3);margin:0;font-size:var(--fs-sm)">${hechCl}</dl></div>` : '<p class="texto-suave">Tu clase no lanza hechizos.</p>'}
    <div id="estado-creacion" role="status" aria-live="polite"></div>`;
  }

  /* ============================================================ creación */
  // ficha-generador.validar() compara todos los hechizos contra el nivel máximo de CADA clase lanzadora, lo que rechaza
  // multiclases legítimas (p. ej. Bardo 5 / Clérigo 1 con un hechizo de nivel 3). Se le pasan solo los aptos para todas y
  // después se restituye la lista completa en la definición.
  function generarConId(form) {
    const todos = form.hechizos.slice();
    const topes = form.clases.map((c) => G.limitesHechizos(c)).filter((l) => l.maxNivel || l.trucos).map((l) => l.maxNivel);
    const tope = topes.length > 1 ? Math.min.apply(null, topes) : 99;
    const aptos = todos.filter((nm) => { const s = SPELLS.find((x) => x.name === nm); return s && s.nivel <= tope; });
    const r = G.generar(Object.assign({}, form, { hechizos: aptos }));
    if (aptos.length !== todos.length) r.definicion.hechizos = todos.map((nm) => G.hechizoDeCompendio(nm)).filter(Boolean).map((h) => JSON.parse(JSON.stringify(h)));
    return r;
  }

  function estadoCreacion(html, tipo) {
    const el = $('estado-creacion'); if (!el) return;
    el.innerHTML = html ? `<div class="aviso ${tipo || ''}" ${tipo === 'aviso-mal' ? 'role="alert"' : ''}><div>${html}</div></div>` : '';
  }

  async function crear() {
    if (E.creando) return;
    const problemas = problemasGlobales();
    if (problemas.length) {
      mostrarErrores(problemas.map((x) => x.m), true);
      if (E.paso === P_REVISION) renderPaso(false);
      return;
    }
    const form = construirForm();
    E.creando = true; pintarPasos();
    estadoCreacion('Creando tu personaje…', '');
    try {
      let creado = null, ultimoId = null;
      for (let intento = 0; intento < 4 && !creado; intento++) {
        let r;
        try { r = generarConId(form); }
        catch (err) {
          const lista = (err && err.errores) || [err && err.message ? err.message : String(err)];
          E.creando = false; pintarPasos();
          const p = lista.map(pasoDeError).filter((x) => x != null).sort((a, b) => a - b)[0];
          mostrarErrores(lista, false);
          if (p != null && p !== E.paso) { irA(p); mostrarErrores(lista, true); }
          else estadoCreacion('El generador no aceptó el personaje: ' + esc(lista.join(' ')), 'aviso-mal');
          return;
        }
        ultimoId = r.id;
        const nodo = Object.assign({}, r.nodo, { owner: usuario.uid, activo: true, publico: false });
        const ref = db.ref(`campanas/${CAMPANA}/personajes/${r.id}`);
        const res = await ref.transaction((cur) => (cur === null || cur === undefined ? nodo : undefined));
        if (res && res.committed) creado = { id: r.id, resumen: r.resumen };
      }
      if (!creado) throw new Error('No se pudo reservar un identificador libre (' + ultimoId + '). Prueba de nuevo.');
      E.creado = creado; E.creando = false;
      mostrarExito();
    } catch (err) {
      E.creando = false; pintarPasos();
      const msg = String((err && (err.code || err.message)) || err);
      if (/permission|denied/i.test(msg)) {
        estadoCreacion('<strong>No tienes permiso para crear personajes en esta campaña.</strong><br>Las reglas de la base de datos solo dejan crear un personaje a un jugador con sesión iniciada que lo registre a su nombre, o al GM de la campaña. Revisa que hayas entrado con tu cuenta, que el código de campaña sea el correcto y, si sigue fallando, pídele ayuda al GM.', 'aviso-mal');
      } else {
        estadoCreacion('<strong>No se pudo crear el personaje.</strong><br>' + esc(msg) + '<br>Revisa tu conexión y prueba de nuevo; no se guardó nada a medias.', 'aviso-mal');
      }
    }
  }

  function mostrarExito() {
    const c = E.creado, url = `ficha.html?pj=${encodeURIComponent(c.id)}&campana=${encodeURIComponent(CAMPANA)}`;
    $('pasos').closest('nav').hidden = true; $('asis-nav').hidden = true; $('progreso').hidden = true; $('progreso-texto').parentElement.hidden = true;
    mostrarErrores([], false);
    panel.innerHTML = `<div class="exito"><h2 id="paso-titulo" tabindex="-1">¡Personaje creado!</h2>
      <p><strong>${esc(E.id.nombre.trim())}</strong> — ${esc(c.resumen.clasesTxt)} · ${c.resumen.pg} PG</p>
      <p class="texto-suave">Quedó guardado en la campaña <strong>${esc(CAMPANA)}</strong> a tu nombre. Lo vas a ver también en el menú principal.</p>
      <div class="fila" style="justify-content:center"><a class="btn btn-primario" id="abrir-ficha" href="${esc(url)}">📜 Abrir ficha</a><button type="button" class="btn btn-fantasma" data-act="crear-otro">➕ Crear otro</button><a class="btn btn-fantasma" href="index.html">Volver al menú</a></div></div>`;
    const t = $('paso-titulo'); if (t) t.focus();
  }
  function crearOtro() {
    const paleta = E.id.paleta;
    E = nuevoEstado(); E.id.paleta = paleta;
    $('pasos').closest('nav').hidden = false; $('asis-nav').hidden = false; $('progreso').hidden = false; $('progreso-texto').parentElement.hidden = false;
    renderPaso(true);
  }

  /* ============================================================ eventos */
  function setPath(obj, path, val) {
    const p = path.split('.');
    let o = obj;
    for (let i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = val;
  }

  function alCambiarBind(path) {
    if (/^clases\.\d+\.nivel$/.test(path)) { actualizarClases(); }
    else if (/^(bonos|manual)\./.test(path)) { actualizarAtributos(); }
    else if (path === 'armadura' || path === 'escudo') actualizarCA();
    refrescarErroresVisibles();
  }

  function onInput(e) {
    const t = e.target;
    if (t.matches('input[type="text"], input[type="number"], input[type="search"], textarea')) {
      if (t.dataset.bind) { setPath(E, t.dataset.bind, t.value); alCambiarBind(t.dataset.bind); }
      if (t.dataset.act === 'buscar-armas') pintarListaArmas();
      if (t.dataset.act === 'hech-filtro') filtroHechizos(t);
      if (t.dataset.act === 'manual') { delete E.tiradas[t.dataset.attr]; const n = panel.querySelector(`[data-tirada="${t.dataset.attr}"]`); if (n) n.remove(); }
    }
  }
  function filtroHechizos(t) {
    const id = t.dataset.clase, f = E.filtros[id] || (E.filtros[id] = { q: '', nivel: '', solo: false });
    f[t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value;
    const c = E.clases.find((x) => x.id === id); if (c) pintarListaHechizos(c);
  }

  function onChange(e) {
    const t = e.target;
    const act = t.dataset.act;
    if (t.dataset.bind && t.matches('select, input[type="checkbox"]')) {
      setPath(E, t.dataset.bind, t.type === 'checkbox' ? t.checked : t.value);
      if (act === 'paleta' && window.FichaPaleta) FichaPaleta.aplicar(t.value);
      if (act === 'bono') actualizarAtributos();
      alCambiarBind(t.dataset.bind);
      return;
    }
    if (act === 'clase-sel') {
      const c = E.clases[+t.dataset.i], d = dc(t.value);
      c.id = t.value; c.subclase = ''; c.listaHechizos = (d && d.listaHechizos) || '';
      conFoco(actualizarClases); refrescarErroresVisibles();
    } else if (act === 'subclase-sel') { E.clases[+t.dataset.i].subclase = t.value; conFoco(actualizarClases); refrescarErroresVisibles(); }
    else if (act === 'lista-sel') { E.clases[+t.dataset.i].listaHechizos = t.value; refrescarErroresVisibles(); }
    else if (act === 'metodo') { E.metodo = t.value; conFoco(() => renderPaso(false)); refrescarErroresVisibles(); }
    else if (act === 'array-sel') { E.array[t.dataset.attr] = t.value === '' ? null : parseInt(t.value, 10); conFoco(() => renderPaso(false)); refrescarErroresVisibles(); }
    else if (act === 'hab') {
      if (t.checked) E.hab[t.dataset.n] = 'comp'; else delete E.hab[t.dataset.n];
      conFoco(() => renderPaso(false)); refrescarErroresVisibles();
    } else if (act === 'hab-exp') { if (E.hab[t.dataset.n]) E.hab[t.dataset.n] = t.checked ? 'exp' : 'comp'; conFoco(() => renderPaso(false)); }
    else if (act === 'arma') {
      const n = t.dataset.n;
      if (t.checked) { if (!E.armas.includes(n)) E.armas.push(n); } else E.armas = E.armas.filter((x) => x !== n);
      const c = $('cuenta-armas'); if (c) c.textContent = `${E.armas.length} elegida${E.armas.length === 1 ? '' : 's'}`;
    } else if (act === 'hech-sel') {
      const id = t.dataset.clase, n = t.dataset.n, arr = E.hechizos[id] || (E.hechizos[id] = []);
      if (t.checked) { if (!arr.includes(n)) arr.push(n); } else E.hechizos[id] = arr.filter((x) => x !== n);
      const c = E.clases.find((x) => x.id === id);
      if (c) { const fila = t.closest('.hech-fila'); if (fila) fila.classList.toggle('elegido', t.checked); actualizarContadoresHechizos(c); if ((E.filtros[id] || {}).solo) conFoco(() => pintarListaHechizos(c)); }
    } else if (act === 'hech-filtro' && (t.tagName === 'SELECT' || t.type === 'checkbox')) { filtroHechizos(t); }
    else if (act === 'edicion') {
      if (typeof guardarEdicionPreferida === 'function') guardarEdicionPreferida(t.value);
      clasesLanzadoras().forEach((c) => pintarListaHechizos(c));
    }
  }

  function onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
    const act = b.dataset.act;
    if (act === 'ir') { const p = +b.dataset.paso; if (p <= E.maxPaso || p === E.paso) irA(p); return; }
    if (act === 'siguiente') return siguiente();
    if (act === 'crear') return crear();
    if (act === 'crear-otro') return crearOtro();
    if (act === 'clase-agregar') { if (E.clases.length < MAX_FILAS_CLASE) { E.clases.push({ id: '', nivel: '1', subclase: '', listaHechizos: '' }); renderPaso(false); const s = panel.querySelector(`[data-k="clase-${E.clases.length - 1}"]`); if (s) s.focus(); } return; }
    if (act === 'clase-quitar') { E.clases.splice(+b.dataset.i, 1); renderPaso(false); const s = panel.querySelector('[data-k="agregar-clase"]'); if (s) s.focus(); refrescarErroresVisibles(); return; }
    if (act === 'punto-mas' || act === 'punto-menos') {
      const k = b.dataset.attr, v = E.puntos[k], nv = act === 'punto-mas' ? v + 1 : v - 1;
      if (nv < 8 || nv > 15) return;
      if (act === 'punto-mas' && (G.COSTO_PUNTOS[nv] - G.COSTO_PUNTOS[v]) > PUNTOS_TOTAL - gastados()) return;
      E.puntos[k] = nv; conFoco(() => renderPaso(false)); return;
    }
    if (act === 'tirar') { const r = tirar4d6(), k = b.dataset.attr; E.manual[k] = String(r.valor); E.tiradas[k] = r.texto; conFoco(() => renderPaso(false)); refrescarErroresVisibles(); return; }
    if (act === 'tirar-todos') { ATRS.forEach((k) => { const r = tirar4d6(); E.manual[k] = String(r.valor); E.tiradas[k] = r.texto; }); conFoco(() => renderPaso(false)); refrescarErroresVisibles(); return; }
    if (act === 'extra-agregar') { E.extra.push({ nombre: '', cantidad: '1', descripcion: '' }); renderPaso(false); const n = panel.querySelector(`[data-k="extra-n-${E.extra.length - 1}"]`); if (n) n.focus(); return; }
    if (act === 'extra-quitar') { E.extra.splice(+b.dataset.i, 1); renderPaso(false); const n = panel.querySelector('[data-k="extra-agregar"]'); if (n) n.focus(); return; }
    if (act === 'hech-ver') {
      const id = b.dataset.clase; E.vistas[id] = E.vistas[id] === b.dataset.n ? null : b.dataset.n;
      const c = E.clases.find((x) => x.id === id);
      if (c) { panel.querySelectorAll(`#lista-hech-${CSS.escape(id)} .hech-nombre`).forEach((x) => x.setAttribute('aria-pressed', x.dataset.n === E.vistas[id] ? 'true' : 'false')); pintarVistaHechizo(c); }
    }
  }

  /* ============================================================ arranque */
  function avisoGlobal(html, tipo) {
    const el = $('aviso-global');
    el.className = 'aviso ' + (tipo || 'aviso-mal'); el.innerHTML = `<span>${html}</span>`; el.hidden = false;
    $('cargando').hidden = true; $('asistente-cuerpo').hidden = true;
  }
  function cargarScript(src) { return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); }); }
  function esperarUsuario() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE);
    return new Promise((ok) => {
      let hecho = false;
      const fin = (u) => { if (!hecho) { hecho = true; ok(u || null); } };
      firebase.auth().onAuthStateChanged((u) => fin(u), () => fin(null));
      setTimeout(() => fin(null), 15000);
    });
  }

  async function arrancar() {
    if (!G || typeof CLASSES === 'undefined' || typeof SPELLS === 'undefined') return avisoGlobal('No se pudieron cargar los datos del asistente (clases, hechizos o generador). Recarga la página.');
    if (!CAMPANA) return avisoGlobal('<strong>Abre esta página desde una campaña.</strong> Falta el código en la dirección (<code>crear-personaje.html?campana=&lt;código&gt;</code>). Entra desde el <a href="index.html">menú principal</a> y elige tu campaña.', 'aviso');
    if (/[.#$\[\]\/]/.test(CAMPANA)) return avisoGlobal('El código de campaña de la dirección no es válido. Entra desde el <a href="index.html">menú principal</a>.');
    if (!window.firebase) return avisoGlobal('No se pudo cargar Firebase. Revisa tu conexión y recarga la página.');
    $('sub-campana').textContent = `Campaña ${CAMPANA} · asistente paso a paso para armar tu ficha de D&D.`;
    $('enlace-volver').href = 'index.html';
    try { usuario = await esperarUsuario(); } catch (e) { usuario = null; }
    if (!usuario) { location.href = 'index.html'; return; }
    db = firebase.database();

    // Sistema de la campaña: solo D&D (si todavía no tiene sistema, se deja crear).
    try {
      const sis = (await db.ref(`lista_campanas/${CAMPANA}/sistema`).once('value')).val();
      if (sis && sis !== 'dnd') return avisoGlobal(`Esta campaña usa otro sistema de juego (<strong>${esc(sis === 'coc' ? 'Call of Cthulhu' : sis)}</strong>), así que este asistente de D&amp;D no puede crear personajes aquí. <a href="index.html">Volver al menú</a>.`, 'aviso');
    } catch (e) { /* si no se puede leer, el intento de escritura dirá si hay permiso */ }

    // Clases y subclases custom de la campaña (opcional: si falla, quedan solo las oficiales).
    try {
      if (window.ClasesCustom && typeof ClasesCustom.cargar === 'function') await ClasesCustom.cargar(db, CAMPANA);
    } catch (e) { console.warn('Clases custom no disponibles:', e); }

    $('cargando').hidden = true; $('asistente-cuerpo').hidden = false;
    E = nuevoEstado();
    panel.addEventListener('input', onInput);
    panel.addEventListener('change', onChange);
    panel.addEventListener('click', onClick);
    $('pasos').addEventListener('click', onClick);
    $('asis-nav').addEventListener('click', onClick);
    $('btn-anterior').addEventListener('click', anterior);
    renderPaso(false);
    document.title = 'Crear personaje — ' + CAMPANA;
  }

  arrancar().catch((e) => avisoGlobal('Algo falló al iniciar el asistente: ' + esc(e && e.message ? e.message : e)));
})();

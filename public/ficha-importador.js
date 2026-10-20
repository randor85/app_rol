/*
 * ficha-importador.js — convierte el JSON exportado por Alchemy RPG en las elecciones de FichaGenerador (lógica pura, sin DOM).
 *
 *   FichaImportador.analizar(textoOObjeto) → {
 *     form,        objeto `form` para FichaGenerador.generar() (ver su cabecera), con los campos de importación
 *     avisos,      [{ tipo:'info'|'aviso'|'error', texto }]  lo que no se pudo reconocer o se asumió
 *     detalle,     { acciones:[…], hechizosReconocidos:[…], hechizosLibres:[…], equipo:[…], competencias:{…} }  para mostrar
 *   }
 *
 * También importa el XML de Fantasy Grounds Unity (<root><character>…): FichaImportador.analizar(texto) detecta el formato
 * (JSON de Alchemy o XML de FGU) y devuelve lo mismo. El XML necesita DOMParser (navegador).
 *
 * Formato visto (ejemplo real, Alchemy RPG): { name, alignment, armorClass, hitDice, challengeRating,
 *   classes:[{ class:'Druida (Círculo del Pastor)', level:8 }], abilityScores:[{ name:'Strength', value:14 }…],
 *   proficiencies:[{ name:'Manejo de Animales', type:'skill' }], actions:[{ name, description, sortOrder, steps }] }.
 * El resto de los campos se busca de forma tolerante (nombres en inglés o español, mayúsculas/minúsculas) para cubrir
 * exportaciones con más datos (raza, trasfondo, velocidad, PG, inventario, conjuros, rasgos, notas…).
 * Todo lo que llega queda como TEXTO: la carcasa lo escapa al dibujar la ficha.
 *
 * Necesita (si están): CLASSES, SPELLS, FichaGenerador y nombreHechizoEs (spells_alias_es.js).
 */
(function (global) {
  'use strict';

  const norm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const clavesDe = (o) => Object.keys(o || {});
  // Busca el primer campo cuyo nombre normalizado coincide con alguno de los candidatos.
  function campo(o, nombres) {
    if (!o || typeof o !== 'object') return undefined;
    const mapa = {}; clavesDe(o).forEach((k) => { mapa[norm(k).replace(/ /g, '')] = k; });
    for (const n of nombres) { const k = mapa[norm(n).replace(/ /g, '')]; if (k !== undefined && o[k] != null && o[k] !== '') return o[k]; }
    return undefined;
  }
  const texto = (v) => (v == null ? '' : typeof v === 'object' ? String(v.name || v.nombre || v.value || '') : String(v)).trim();
  const entero = (v) => { const n = parseInt(String(v).replace(/[^0-9\-]/g, ''), 10); return isNaN(n) ? null : n; };
  const lista = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.keys(v).map((k) => v[k]) : []);

  const CLASES_ALIAS = {
    barbaro: 'barbarian', barbarian: 'barbarian', bardo: 'bard', bard: 'bard', clerigo: 'cleric', cleric: 'cleric', druida: 'druid', druid: 'druid',
    guerrero: 'fighter', fighter: 'fighter', monje: 'monk', monk: 'monk', paladin: 'paladin', explorador: 'ranger', guardabosques: 'ranger', ranger: 'ranger',
    picaro: 'rogue', ladron: 'rogue', rogue: 'rogue', hechicero: 'sorcerer', sorcerer: 'sorcerer', brujo: 'warlock', warlock: 'warlock', mago: 'wizard', wizard: 'wizard',
  };
  const ATRIBUTO_ALIAS = {
    strength: 'STR', str: 'STR', fuerza: 'STR', fue: 'STR', dexterity: 'DEX', dex: 'DEX', destreza: 'DEX', des: 'DEX', constitution: 'CON', con: 'CON', constitucion: 'CON',
    intelligence: 'INT', int: 'INT', inteligencia: 'INT', wisdom: 'WIS', wis: 'WIS', sabiduria: 'WIS', sab: 'WIS', charisma: 'CHA', cha: 'CHA', carisma: 'CHA', car: 'CHA',
  };
  const HABILIDAD_ALIAS = {
    acrobacias: 'Acrobatics', acrobatics: 'Acrobatics', 'manejo de animales': 'Animal Handling', 'trato con animales': 'Animal Handling', 'animal handling': 'Animal Handling',
    arcanos: 'Arcana', arcano: 'Arcana', arcana: 'Arcana', atletismo: 'Athletics', athletics: 'Athletics', engano: 'Deception', deception: 'Deception',
    historia: 'History', history: 'History', perspicacia: 'Insight', insight: 'Insight', intimidacion: 'Intimidation', intimidation: 'Intimidation',
    investigacion: 'Investigation', investigation: 'Investigation', medicina: 'Medicine', medicine: 'Medicine', naturaleza: 'Nature', nature: 'Nature',
    percepcion: 'Perception', perception: 'Perception', interpretacion: 'Performance', actuacion: 'Performance', performance: 'Performance',
    persuasion: 'Persuasion', religion: 'Religion', 'juego de manos': 'Sleight of Hand', 'sleight of hand': 'Sleight of Hand', sigilo: 'Stealth', stealth: 'Stealth',
    supervivencia: 'Survival', survival: 'Survival',
  };

  const datosClases = () => (typeof CLASSES !== 'undefined' ? CLASSES : []);
  function buscarClase(txt) {
    const n = norm(txt); if (!n) return null;
    const cs = datosClases();
    const porAlias = CLASES_ALIAS[n] ? cs.find((c) => c.id === CLASES_ALIAS[n]) : null;
    if (porAlias) return porAlias;
    return cs.find((c) => norm(c.name) === n || norm(c.nombre_es) === n) || cs.find((c) => n.indexOf(norm(c.nombre_es)) === 0 || n.indexOf(norm(c.name)) === 0) || null;
  }
  // "Druida (Círculo del Pastor)" → { clase, subTexto }. También acepta "Druida - Círculo del Pastor" y "Druida: …".
  function separarClase(txt) {
    const t = texto(txt);
    const m = t.match(/^([^(\-–:]+?)\s*(?:[(\[]\s*([^)\]]+?)\s*[)\]]|[\-–:]\s*(.+))?$/);
    return { nombre: (m && m[1] ? m[1] : t).trim(), sub: ((m && (m[2] || m[3])) || '').trim() };
  }
  function buscarSubclase(d, sub) {
    if (!d || !sub) return null;
    const n = norm(sub);
    return (d.subclasses || []).find((s) => norm(s.name) === n || n.indexOf(norm(s.name)) >= 0 || norm(s.name).indexOf(n) >= 0) || null;
  }

  function analizar(entrada) {
    const avisos = [], aviso = (tipo, t) => avisos.push({ tipo, texto: t });
    if (typeof entrada === 'string' && /^\s*(<\?xml|<root|<character)/i.test(entrada.replace(/^\uFEFF/, ''))) return analizarFG(entrada);
    let crudo = entrada;
    if (typeof entrada === 'string') {
      try { crudo = JSON.parse(entrada.replace(/^﻿/, '')); } catch (e) { return { form: null, avisos: [{ tipo: 'error', texto: 'No es un JSON válido: ' + e.message }], detalle: {} }; }
    }
    if (Array.isArray(crudo) && crudo.length === 1) crudo = crudo[0];
    if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return { form: null, avisos: [{ tipo: 'error', texto: 'El JSON tiene que ser un personaje (un objeto con nombre, clases y atributos).' }], detalle: {} };
    const raiz = (crudo.character && typeof crudo.character === 'object') ? crudo.character : crudo;
    const G = global.FichaGenerador;

    const form = { importado: true, nombre: texto(campo(raiz, ['name', 'nombre', 'characterName'])), clases: [], atributos: {}, habilidades: {}, armas: [], equipoExtra: [], rasgosExtra: [], hechizos: [], hechizosLibres: [] };
    if (!form.nombre) aviso('aviso', 'El JSON no trae nombre: escribilo antes de crear.');
    form.alineamiento = texto(campo(raiz, ['alignment', 'alineamiento']));
    form.especie = texto(campo(raiz, ['race', 'species', 'raza', 'especie']));
    form.trasfondoNombre = texto(campo(raiz, ['background', 'trasfondo']));
    const hist = campo(raiz, ['backstory', 'biography', 'description', 'descripcion', 'historia', 'notes', 'notas']);
    if (hist) form.historia = texto(hist);

    // ---- clases
    let filas = lista(campo(raiz, ['classes', 'clases']));
    if (!filas.length) { const c = campo(raiz, ['class', 'className', 'clase']); if (c) filas = [{ class: c, level: campo(raiz, ['level', 'nivel']) }]; }
    filas.forEach((f) => {
      const crudoClase = typeof f === 'string' ? f : (campo(f, ['class', 'className', 'name', 'clase', 'nombre']) || '');
      const nivel = typeof f === 'object' ? entero(campo(f, ['level', 'nivel', 'levels'])) : null;
      const { nombre, sub } = separarClase(crudoClase);
      const subCampo = typeof f === 'object' ? texto(campo(f, ['subclass', 'subclase', 'archetype'])) : '';
      const d = buscarClase(nombre);
      const subTxt = subCampo || sub;
      if (!d) { aviso('error', `No reconocí la clase «${nombre || crudoClase}». Elegí una de la lista (o creala en «Clases y subclases custom»).`); form.clases.push({ id: '', nivel: nivel || 1, subclase: subTxt, original: texto(crudoClase) }); return; }
      const s = buscarSubclase(d, subTxt);
      const niv = nivel || 1;
      if (subTxt && !s) aviso('info', `La subclase «${subTxt}» no tiene detalle cargado en la app: se guarda con ese nombre, sin sus rasgos (podés agregarlos como rasgos o crear la subclase custom).`);
      form.clases.push({ id: d.id, nivel: niv, subclase: s ? s.name : subTxt, original: texto(crudoClase) });
    });
    if (!form.clases.length) { aviso('error', 'No encontré la clase del personaje.'); form.clases.push({ id: '', nivel: entero(campo(raiz, ['level', 'nivel'])) || 1, subclase: '' }); }
    const total = form.clases.reduce((s, c) => s + (parseInt(c.nivel, 10) || 0), 0);
    if (total > 20) aviso('aviso', `El nivel total es ${total} (máximo 20): revisalo.`);

    // ---- atributos
    const ab = campo(raiz, ['abilityScores', 'abilities', 'attributes', 'atributos', 'stats']);
    if (Array.isArray(ab)) ab.forEach((a) => { const k = ATRIBUTO_ALIAS[norm(campo(a, ['name', 'nombre', 'ability']) || '')]; const v = entero(campo(a, ['value', 'valor', 'score', 'total'])); if (k && v != null) form.atributos[k] = v; });
    else if (ab && typeof ab === 'object') clavesDe(ab).forEach((n) => { const k = ATRIBUTO_ALIAS[norm(n)]; const v = entero(typeof ab[n] === 'object' ? campo(ab[n], ['value', 'score', 'valor']) : ab[n]); if (k && v != null) form.atributos[k] = v; });
    ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((k) => { if (form.atributos[k] == null) { form.atributos[k] = 10; aviso('aviso', `Falta el atributo ${k}: se puso 10.`); } });

    // ---- competencias
    const comp = { habilidades: [], salvaciones: [], armaduras: [], armas: [], herramientas: [], idiomas: [], otras: [] };
    let hayTipoSalvacion = false;
    lista(campo(raiz, ['proficiencies', 'competencias'])).forEach((p) => {
      const nombre = typeof p === 'string' ? p : texto(campo(p, ['name', 'nombre']));
      const tipo = typeof p === 'object' ? norm(campo(p, ['type', 'tipo', 'category']) || '') : '';
      const experto = typeof p === 'object' && (campo(p, ['expertise', 'pericia', 'expert']) === true || /expert|pericia/.test(tipo));
      const h = HABILIDAD_ALIAS[norm(nombre)];
      if (/sav|salvaci/.test(tipo)) { hayTipoSalvacion = true; const k = ATRIBUTO_ALIAS[norm(nombre.replace(/salvaci[oó]n|saving throw|save/gi, ''))]; if (k) comp.salvaciones.push(k); else comp.otras.push(nombre); }
      else if (h && (!tipo || /skill|habilidad|expert|pericia/.test(tipo))) { form.habilidades[h] = experto || form.habilidades[h] === 'exp' ? 'exp' : 'comp'; comp.habilidades.push(h); }
      else if (/armor|armadura/.test(tipo)) comp.armaduras.push(nombre);
      else if (/weapon|arma/.test(tipo)) comp.armas.push(nombre);
      else if (/tool|herramienta|instrument/.test(tipo)) comp.herramientas.push(nombre);
      else if (/lang|idioma/.test(tipo)) comp.idiomas.push(nombre);
      else if (h) { form.habilidades[h] = experto ? 'exp' : 'comp'; comp.habilidades.push(h); }
      else if (nombre) comp.otras.push(nombre);
    });
    if (hayTipoSalvacion && comp.salvaciones.length) form.salvaciones = comp.salvaciones.filter((k, i, a) => a.indexOf(k) === i);
    const comps = [];
    if (comp.armaduras.length) comps.push('Armaduras: ' + comp.armaduras.join(', ') + '.');
    if (comp.armas.length) comps.push('Armas: ' + comp.armas.join(', ') + '.');
    if (comp.herramientas.length) comps.push('Herramientas: ' + comp.herramientas.join(', ') + '.');
    if (comp.otras.length) comps.push('Otras competencias: ' + comp.otras.join(', ') + '.');
    if (comp.idiomas.length) form.idiomas = comp.idiomas.join(', ');
    const idiomasTxt = campo(raiz, ['languages', 'idiomas']);
    if (idiomasTxt && !form.idiomas) form.idiomas = lista(idiomasTxt).length ? lista(idiomasTxt).map(texto).join(', ') : texto(idiomasTxt);
    if (comps.length) form.competenciasExtra = comps.join(' ');
    if (!Object.keys(form.habilidades).length) aviso('aviso', 'No encontré habilidades con competencia: marcalas en la revisión.');

    // ---- defensa, vida, velocidad, experiencia
    const ca = entero(campo(raiz, ['armorClass', 'ac', 'ca', 'claseDeArmadura']));
    if (ca != null) form.caFija = ca; else aviso('info', 'No trae la CA: se calculará 10 + DES (o la fórmula de la clase) hasta que equipes armadura.');
    const hpMax = entero(campo(raiz, ['maxHitPoints', 'hitPointsMax', 'maxHp', 'hpMax', 'pgMax', 'hitPoints', 'hp', 'pg']));
    if (hpMax != null) form.hpMax = hpMax; else aviso('info', 'No trae los puntos de golpe: se calculan con el dado de golpe de la clase (nivel 1 máximo, después el promedio) y tu Constitución. Si tirás tus dados, corregilo en la ficha.');
    const hpAct = entero(campo(raiz, ['currentHitPoints', 'currentHp', 'hpActual', 'pgActual']));
    if (hpAct != null) form.hpActual = hpAct;
    const vel = entero(campo(raiz, ['speed', 'velocidad', 'walkSpeed']));
    if (vel) form.velocidad = vel;
    const xp = entero(campo(raiz, ['experience', 'experiencePoints', 'xp', 'experiencia']));
    if (xp != null) form.xp = xp;
    const dados = texto(campo(raiz, ['hitDice', 'dadosDeGolpe']));
    const dm = dados.match(/(\d+)\s*d\s*(\d+)/i);
    if (dm && form.clases.length === 1) {
      const d = datosClases().find((c) => c.id === form.clases[0].id);
      if (d && parseInt(dm[2], 10) !== d.hitDie) aviso('aviso', `El JSON trae dados de golpe d${dm[2]} y la clase usa d${d.hitDie}: revisá la clase.`);
      if (parseInt(dm[1], 10) !== parseInt(form.clases[0].nivel, 10)) aviso('aviso', `El JSON trae ${dm[1]} dados de golpe pero el nivel es ${form.clases[0].nivel}.`);
    }

    // ---- acciones, rasgos y hechizos
    const reconocer = (txt) => (typeof global.nombreHechizoEs === 'function' ? global.nombreHechizoEs(txt) : null);
    const detalle = { acciones: [], hechizosReconocidos: [], hechizosLibres: [], equipo: [], competencias: comp };
    const yaHechizo = {};
    const agregarHechizo = (nombreTxt, nivelTxt, desc) => {
      const eng = reconocer(nombreTxt);
      if (eng) { if (!yaHechizo[eng]) { yaHechizo[eng] = true; form.hechizos.push(eng); detalle.hechizosReconocidos.push({ original: nombreTxt, nombre: eng }); } return true; }
      const nv = entero(nivelTxt);
      form.hechizosLibres.push({ nombre: nombreTxt, nivel: nv == null ? 0 : nv, resumen: desc || 'Importado de Alchemy RPG.' });
      detalle.hechizosLibres.push({ nombre: nombreTxt, nivel: nv == null ? 0 : nv });
      return false;
    };
    lista(campo(raiz, ['spells', 'hechizos', 'conjuros', 'spellbook'])).forEach((h) => {
      const nombre = typeof h === 'string' ? h : texto(campo(h, ['name', 'nombre']));
      if (!nombre) return;
      agregarHechizo(nombre, typeof h === 'object' ? campo(h, ['level', 'nivel']) : null, typeof h === 'object' ? texto(campo(h, ['description', 'descripcion'])) : '');
    });
    lista(campo(raiz, ['actions', 'acciones', 'features', 'rasgos', 'traits', 'feats', 'abilities'])).forEach((a) => {
      if (typeof a === 'string') { form.rasgosExtra.push({ tag: 'Importado', titulo: a, texto: '' }); detalle.acciones.push({ titulo: a }); return; }
      const nombre = texto(campo(a, ['name', 'nombre', 'title']));
      const desc = texto(campo(a, ['description', 'descripcion', 'desc', 'text']));
      if (!nombre) return;
      const nivelH = (desc.match(/hechizo de nivel\s*(\d)|spell(?:\s+of)?\s+level\s*(\d)|truco/i) || []);
      const pareceHechizo = /hechizo|conjuro|spell|truco|cantrip/i.test(desc) || /hechizo|conjuro/i.test(nombre);
      if (pareceHechizo && reconocer(nombre)) { agregarHechizo(nombre, nivelH[1] || nivelH[2] || (/truco/i.test(nivelH[0] || '') ? 0 : null), desc); return; }
      form.rasgosExtra.push({ tag: 'Alchemy', titulo: nombre, texto: desc });
      detalle.acciones.push({ titulo: nombre, texto: desc });
    });

    // ---- equipo
    lista(campo(raiz, ['inventory', 'equipment', 'items', 'inventario', 'equipo'])).forEach((it) => {
      const nombre = typeof it === 'string' ? it : texto(campo(it, ['name', 'nombre', 'item']));
      if (!nombre) return;
      const cant = typeof it === 'object' ? (entero(campo(it, ['quantity', 'qty', 'cantidad'])) || 1) : 1;
      const desc = typeof it === 'object' ? texto(campo(it, ['description', 'descripcion'])) : '';
      form.equipoExtra.push({ nombre, cantidad: cant, descripcion: desc });
      detalle.equipo.push({ nombre, cantidad: cant });
    });
    const oro = entero(campo(raiz, ['gold', 'gp', 'oro']));
    if (oro != null) form.oro = oro;

    if (form.competenciasExtra) form.rasgosExtra.unshift({ tag: 'Competencias', titulo: 'Competencias importadas', texto: form.competenciasExtra });
    const hechizoAviso = form.hechizosLibres.length;
    if (hechizoAviso) aviso('info', `${hechizoAviso} hechizo(s) no están en el compendio y se agregaron como hechizos libres (nivel ${form.hechizosLibres.map((h) => h.nivel).join(', ')}): revisá su texto.`);
    if (form.hechizos.length || form.hechizosLibres.length) { /* ok */ } else if (form.clases.some((c) => { const d = datosClases().find((x) => x.id === c.id); return d && d.casterType; })) aviso('info', 'El JSON no trae hechizos: agregalos desde la ficha con «Agregar del compendio».');
    if (!form.rasgosExtra.length && !detalle.acciones.length) aviso('info', 'El JSON no trae acciones ni rasgos propios; los rasgos de la clase se agregan solos hasta el nivel.');
    marcarRasgosDeClase(form);
    return { form, avisos, detalle, crudo };
  }

  /* ---------- rasgos que la clase ya trae ---------- */
  // Marca con `ya:true` los rasgos importados que coinciden con un rasgo de clase/subclase que la app agrega sola.
  const sinParen = (t) => norm(String(t || '').replace(/\([^)]*\)/g, ' '));
  const enParen = (t) => { const m = String(t || '').match(/\(([^)]+)\)/); return m ? norm(m[1]) : ''; };
  function marcarRasgosDeClase(form) {
    const nombres = new Set();
    (form.clases || []).forEach((c) => {
      const d = datosClases().find((x) => x.id === c.id); if (!d) return;
      (d.features || []).forEach((f) => { nombres.add(sinParen(f.nombre)); const p = enParen(f.nombre); if (p) nombres.add(p); });
      const sub = (d.subclasses || []).find((x) => x.name === c.subclase);
      if (sub) (sub.features || []).forEach((f) => { nombres.add(sinParen(f.nombre)); const p = enParen(f.nombre); if (p) nombres.add(p); });
    });
    (form.rasgosExtra || []).forEach((r) => {
      const a = sinParen(r.titulo), b = enParen(r.titulo);
      const lanzador = (form.clases || []).some((c) => { const d = datosClases().find((x) => x.id === c.id); return d && d.casterType; });
      if (r.tag !== 'Competencias' && (nombres.has(a) || (b && nombres.has(b)) || (lanzador && (a === 'spellcasting' || a === 'pact magic')))) r.ya = true;
    });
  }

  /* ---------- Fantasy Grounds Unity (XML) ---------- */
  // Texto plano de un nodo con HTML de FG (<p>, <h>, <b>, <list>/<li>, <table>/<tr>/<td>, <linklist>).
  function fgTexto(el) {
    let out = '';
    const rec = (n) => {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      const t = n.nodeName.toLowerCase();
      if (t === 'linklist' || t === 'link') return;
      if (t === 'li') out += '• ';
      Array.prototype.forEach.call(n.childNodes, rec);
      if (t === 'td') out += ' | ';
      if (t === 'p' || t === 'h' || t === 'li' || t === 'tr') out += '\n';
    };
    rec(el);
    return out.replace(/ \| \n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  const hijo = (el, tag) => { if (!el) return null; for (let i = 0; i < el.children.length; i++) if (el.children[i].nodeName === tag) return el.children[i]; return null; };
  const val = (el, tag) => { const h = hijo(el, tag); return h ? (h.textContent || '').trim() : ''; };
  const valN = (el, tag) => { const v = parseFloat(val(el, tag)); return isNaN(v) ? null : v; };
  const hijos = (el) => (el ? Array.prototype.slice.call(el.children) : []);
  const FG_ATRIBUTOS = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
  const FG_ARMAS = { 'crossbow light': 'Light Crossbow', 'crossbow hand': 'Hand Crossbow', 'crossbow heavy': 'Heavy Crossbow' };

  function analizarFG(xml) {
    const avisos = [], aviso = (tipo, t) => avisos.push({ tipo, texto: t });
    if (typeof DOMParser === 'undefined') return { form: null, avisos: [{ tipo: 'error', texto: 'Este navegador no puede leer XML.' }], detalle: {} };
    const doc = new DOMParser().parseFromString(xml.replace(/^﻿/, ''), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return { form: null, avisos: [{ tipo: 'error', texto: 'No es un XML válido.' }], detalle: {} };
    const ch = doc.getElementsByTagName('character')[0];
    if (!ch) return { form: null, avisos: [{ tipo: 'error', texto: 'El XML no trae un <character> (tiene que ser la exportación de un personaje de Fantasy Grounds).' }], detalle: {} };
    if (doc.getElementsByTagName('character').length > 1) aviso('info', 'El XML trae más de un personaje: se importó el primero.');

    const reconocer = (txt) => (typeof global.nombreHechizoEs === 'function' ? global.nombreHechizoEs(txt) : null);
    const form = { importado: true, origen: 'fantasy-grounds', nombre: val(ch, 'name'), clases: [], atributos: {}, habilidades: {}, armas: [], equipoExtra: [], inventarioExtra: [], rasgosExtra: [], hechizos: [], hechizosLibres: [] };
    const detalle = { acciones: [], hechizosReconocidos: [], hechizosLibres: [], equipo: [], competencias: {} };
    if (!form.nombre) aviso('aviso', 'El XML no trae nombre: escribilo antes de crear.');
    form.especie = val(ch, 'racename') || val(ch, 'race');
    form.trasfondoNombre = val(ch, 'background');
    form.alineamiento = val(ch, 'alignment');

    // ---- clases
    hijos(hijo(ch, 'classes')).forEach((c) => {
      const nombre = val(c, 'name'), nivel = valN(c, 'level') || 1, sub = val(c, 'specialization');
      const d = buscarClase(nombre);
      if (!d) { aviso('error', `No reconocí la clase «${nombre}». Elegí una de la lista (o creala en «Clases y subclases custom»).`); form.clases.push({ id: '', nivel, subclase: sub, original: nombre }); return; }
      const s = buscarSubclase(d, sub);
      if (sub && !s) aviso('info', `La subclase «${sub}» no tiene detalle cargado en la app: se guarda con ese nombre. Sus rasgos vienen del XML como tarjetas (revisalos abajo).`);
      form.clases.push({ id: d.id, nivel, subclase: s ? s.name : sub, original: nombre });
    });
    if (!form.clases.length) { aviso('error', 'No encontré la clase del personaje.'); form.clases.push({ id: '', nivel: valN(ch, 'level') || 1, subclase: '' }); }
    if (form.clases.reduce((a, c) => a + (parseInt(c.nivel, 10) || 0), 0) > 20) aviso('aviso', 'El nivel total pasa de 20: revisalo.');

    // ---- atributos y salvaciones
    const salv = [];
    hijos(hijo(ch, 'abilities')).forEach((a) => {
      const k = FG_ATRIBUTOS[a.nodeName]; if (!k) return;
      const sc = valN(a, 'score'); if (sc != null) form.atributos[k] = sc;
      if (valN(a, 'saveprof') === 1) salv.push(k);
    });
    ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((k) => { if (form.atributos[k] == null) { form.atributos[k] = 10; aviso('aviso', `Falta el atributo ${k}: se puso 10.`); } });
    form.salvaciones = salv;

    // ---- habilidades (prof 1 = competencia, 2 = pericia)
    hijos(hijo(ch, 'skilllist')).forEach((s) => {
      const h = HABILIDAD_ALIAS[norm(val(s, 'name'))], p = valN(s, 'prof');
      if (h && p >= 1) form.habilidades[h] = p >= 2 ? 'exp' : 'comp';
    });

    // ---- competencias e idiomas
    const comp = { Armaduras: [], Armas: [], Herramientas: [], Otras: [] };
    hijos(hijo(ch, 'proficiencylist')).forEach((p) => {
      const n = val(p, 'name'); if (!n) return;
      const m = n.match(/^\s*(Armor|Weapon|Tool|Skill|Language)s?\s*:\s*(.+)$/i);
      if (!m) { comp.Otras.push(n); return; }
      const k = m[1].toLowerCase();
      if (k === 'armor') comp.Armaduras.push(m[2]); else if (k === 'weapon') comp.Armas.push(m[2]); else if (k === 'tool') comp.Herramientas.push(m[2]); else comp.Otras.push(m[2]);
    });
    const comps = Object.keys(comp).filter((k) => comp[k].length).map((k) => `${k}: ${comp[k].join(', ')}.`);
    const idiomas = []; hijos(hijo(ch, 'languagelist')).forEach((l) => { const n = val(l, 'name'); if (n && n !== 'Choice' && idiomas.indexOf(n) < 0) idiomas.push(n); });
    if (idiomas.length) form.idiomas = idiomas.join(', ');
    if (comps.length) form.rasgosExtra.push({ tag: 'Competencias', titulo: 'Competencias importadas', texto: comps.join(' ') });

    // ---- vida, velocidad, experiencia, monedas
    const hp = hijo(ch, 'hp');
    const hpTot = valN(hp, 'total');
    if (hpTot != null) { form.hpMax = hpTot; const heridas = valN(hp, 'wounds') || 0; form.hpActual = Math.max(0, hpTot - heridas); }
    else aviso('info', 'No trae los puntos de golpe: se calculan con el dado de la clase y la Constitución.');
    const vel = valN(hijo(ch, 'speed'), 'total'); if (vel) form.velocidad = vel;
    const xp = valN(ch, 'exp'); if (xp != null) form.xp = xp;
    const ac = valN(hijo(hijo(ch, 'defenses'), 'ac'), 'total'); if (ac != null) form.caFija = ac;
    let oro = 0; const otras = [];
    hijos(hijo(ch, 'coins')).forEach((c) => { const n = (val(c, 'name') || '').toUpperCase(), a = valN(c, 'amount') || 0; if (!a) return; if (n === 'GP') oro += a; else otras.push(`${a} ${n}`); });
    if (oro) form.oro = oro;
    if (otras.length) form.equipoExtra.push({ nombre: 'Otras monedas', cantidad: 1, descripcion: otras.join(', ') });

    // ---- notas personales
    const notas = [];
    [['Edad', 'age'], ['Género', 'gender'], ['Altura', 'height'], ['Peso', 'weight'], ['Sentidos', 'senses'], ['Tamaño', 'size']].forEach((x) => { const v = val(ch, x[1]); if (v) notas.push(`${x[0]}: ${v}`); });
    if (notas.length) form.historia = notas.join(' · ');

    // ---- inventario y armas
    const nombreArma = (n) => { const k = norm(n); if (FG_ARMAS[k]) return FG_ARMAS[k]; return (global.FichaGenerador ? global.FichaGenerador.ARMAS : []).map((a) => a[0]).find((a) => norm(a) === k) || null; };
    const armasVistas = {};
    hijos(hijo(ch, 'weaponlist')).forEach((w) => { const a = nombreArma(val(w, 'name')); if (a && !armasVistas[a]) { armasVistas[a] = true; form.armas.push(a); } });
    hijos(hijo(ch, 'inventorylist')).forEach((it) => {
      const nombre = val(it, 'name'); if (!nombre) return;
      const tipo = norm(val(it, 'type')), sub = norm(val(it, 'subtype')), cant = valN(it, 'count') || 1, carried = valN(it, 'carried');
      const desc = hijo(it, 'description') ? fgTexto(hijo(it, 'description')).replace(/\s+/g, ' ').slice(0, 240) : '';
      if (tipo === 'weapon' && nombreArma(nombre)) return;   // ya entra como ataque del personaje
      if (tipo === 'armor' && /shield|escudo/.test(sub + ' ' + norm(nombre))) { form.inventarioExtra.push({ nombre, cantidad: cant, descripcion: desc || '+2 CA', equipado: carried === 2, categoria: 'escudo', consumible: false, modAC: valN(it, 'ac') || 2 }); detalle.equipo.push({ nombre, cantidad: cant }); return; }
      if (tipo === 'armor') {
        const base = valN(it, 'ac');
        const dexCap = /heavy|pesada/.test(sub) ? 0 : /medium|media/.test(sub) ? 2 : null;
        form.inventarioExtra.push({ nombre, cantidad: cant, descripcion: desc || val(it, 'subtype'), equipado: carried === 2, categoria: 'armadura', consumible: false, modAC: base == null ? undefined : base, dexCap });
        detalle.equipo.push({ nombre, cantidad: cant }); return;
      }
      const extra = [val(it, 'damage'), val(it, 'properties')].filter(Boolean).join(' · ');
      form.inventarioExtra.push({ nombre, cantidad: cant, descripcion: (extra ? extra + (desc ? ' — ' : '') : '') + desc, equipado: false, categoria: tipo === 'weapon' ? 'arma' : 'general', consumible: false });
      detalle.equipo.push({ nombre, cantidad: cant });
    });

    // ---- rasgos de especie y de clase
    hijos(hijo(ch, 'traitlist')).forEach((t) => { const n = val(t, 'name'); if (n) { form.rasgosExtra.push({ tag: 'Especie', titulo: n, texto: fgTexto(hijo(t, 'text') || t) }); detalle.acciones.push({ titulo: n }); } });
    hijos(hijo(ch, 'featurelist')).forEach((f) => {
      const n = val(f, 'name'); if (!n) return;
      if (/^(bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard|barbarian)\s+subclass$/i.test(n)) return;
      const niv = valN(f, 'level');
      form.rasgosExtra.push({ tag: niv ? `FG · nivel ${niv}` : 'FG', titulo: n, texto: fgTexto(hijo(f, 'text') || f).slice(0, 1500) });
      detalle.acciones.push({ titulo: n });
    });

    // ---- hechizos y poderes
    const yaH = {};
    hijos(hijo(ch, 'powers')).forEach((p) => {
      const n = val(p, 'name'); if (!n) return;
      const esConjuro = !!val(p, 'castingtime') || !!val(p, 'school') || /^spells?\b/i.test(val(p, 'group'));
      const texto = hijo(p, 'description') ? fgTexto(hijo(p, 'description')) : '';
      if (!esConjuro) {   // acción de clase o poder propio: tarjeta de rasgo
        form.rasgosExtra.push({ tag: 'FG · ' + (val(p, 'group') || 'poder'), titulo: n, texto: texto.slice(0, 1500) });
        detalle.acciones.push({ titulo: n }); return;
      }
      const eng = reconocer(n);
      if (eng) { if (!yaH[eng]) { yaH[eng] = true; form.hechizos.push(eng); detalle.hechizosReconocidos.push({ original: n, nombre: eng }); } return; }
      const nv = valN(p, 'level') || 0;
      form.hechizosLibres.push({ nombre: n, nivel: nv, tiempo: val(p, 'castingtime'), alcance: val(p, 'range'), duracion: val(p, 'duration'), resumen: texto.replace(/\s+/g, ' ').slice(0, 700) || 'Importado de Fantasy Grounds.' });
      detalle.hechizosLibres.push({ nombre: n, nivel: nv });
    });
    if (form.hechizosLibres.length) aviso('info', `${form.hechizosLibres.length} hechizo(s) no están en el compendio y se agregaron como hechizos libres: revisá su texto.`);

    marcarRasgosDeClase(form);
    const ya = form.rasgosExtra.filter((r) => r.ya).length;
    if (ya) aviso('info', `${ya} rasgo(s) del XML ya los agrega la clase de la app solos: quedan desmarcados para no duplicarlos (marcalos si querés conservar el texto de Fantasy Grounds).`);
    return { form, avisos, detalle, formato: 'Fantasy Grounds Unity (XML)' };
  }

  global.FichaImportador = { analizar, analizarFG, marcarRasgosDeClase, fgTexto, buscarClase, separarClase, buscarSubclase, norm, HABILIDAD_ALIAS, ATRIBUTO_ALIAS, CLASES_ALIAS };
})(typeof window !== 'undefined' ? window : globalThis);

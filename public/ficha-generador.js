/*
 * ficha-generador.js — arma la DEFINICIÓN de un personaje a partir de lo que elige el creador (crear-personaje.html).
 *
 * Es lógica pura (sin DOM ni Firebase): recibe las elecciones y devuelve el objeto de datos que ficha-shell.js sabe
 * dibujar (ver «PERSONAJES DINÁMICOS» en la cabecera de ficha-shell.js). Necesita los globales de spells_data.js y
 * classes_data.js (SPELLS, CLASSES, PROGRESION_CLASES, SLOTS_*) y, si hay clases custom, que ya estén fusionadas en CLASSES.
 *
 *   FichaGenerador.generar(form)            → { id, nodo, definicion, resumen }   (nodo = lo que se escribe en Firebase)
 *   FichaGenerador.validar(form)            → [mensajes de error en español]
 *   FichaGenerador.limitesHechizos(clase)   → { trucos, preparados, maxNivel, lista }  para { id, nivel } de una clase
 *   FichaGenerador.pgBase(form)             → PG máximos de nivel 1 al nivel total
 *   tablas: HABILIDADES_CLASE, ARMADURAS, ARMAS, ATRIBUTOS, HABILIDADES, ARRAY_ESTANDAR, COSTO_PUNTOS, XP_POR_NIVEL
 *
 * form = {
 *   nombre, especie, trasfondoNombre, alineamiento, velocidad, paleta, historia, idiomas,
 *   clases: [{ id, nivel, subclase, listaHechizos? }],                (la primera es la clase inicial)
 *   atributos: { STR, DEX, CON, INT, WIS, CHA },                      (valores finales)
 *   habilidades: { 'Athletics': 'comp' | 'exp' },
 *   armadura: 'Chain Mail' | null, escudo: bool, armas: ['Longsword', …],
 *   equipoExtra: [{ nombre, cantidad, descripcion }], oro,
 *   hechizos: ['Fire Bolt', …],                                       (nombres del compendio)
 *   Solo importaciones (ficha-importador.js): importado:true (no exige la cantidad de habilidades de la clase), salvaciones:['WIS',…],
 *   caFija:14, hpMax, hpActual, xp, rasgosExtra:[{tag,titulo,texto}], hechizosLibres:[{nombre,nivel,resumen,tiempo?,alcance?,duracion?}],
 *   inventarioExtra:[{nombre,cantidad,descripcion,equipado,categoria:'armadura'|'escudo'|'arma'|'general',modAC?,dexCap?}]
 * }
 *
 * Los textos que escribe el usuario se guardan como TEXTO PLANO: la carcasa los escapa al leer la definición (normalizarDefinicion).
 */
(function (global) {
  'use strict';

  const ATRIBUTOS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const ATRIBUTO_ES = { STR: 'Fuerza', DEX: 'Destreza', CON: 'Constitución', INT: 'Inteligencia', WIS: 'Sabiduría', CHA: 'Carisma' };
  const ES_A_ABREV = { 'fuerza': 'STR', 'destreza': 'DEX', 'constitución': 'CON', 'constitucion': 'CON', 'inteligencia': 'INT', 'sabiduría': 'WIS', 'sabiduria': 'WIS', 'carisma': 'CHA' };
  const HABILIDADES = { 'Acrobatics': 'DEX', 'Animal Handling': 'WIS', 'Arcana': 'INT', 'Athletics': 'STR', 'Deception': 'CHA', 'History': 'INT', 'Insight': 'WIS', 'Intimidation': 'CHA', 'Investigation': 'INT', 'Medicine': 'WIS', 'Nature': 'INT', 'Perception': 'WIS', 'Performance': 'CHA', 'Persuasion': 'CHA', 'Religion': 'INT', 'Sleight of Hand': 'DEX', 'Stealth': 'DEX', 'Survival': 'WIS' };
  const ARRAY_ESTANDAR = [15, 14, 13, 12, 10, 8];
  const COSTO_PUNTOS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };   // 27 puntos
  const XP_POR_NIVEL = [0, 0, 1500, 4500, 9500, 16500, 25500, 36500, 49500, 64500, 81500, 100500, 121500, 144500, 169500, 196500, 225500, 256500, 289500, 324500, 361500];

  // Elecciones de habilidades de clase (SRD): cuántas y de cuáles. 'cualquiera' = las 18.
  const HABILIDADES_CLASE = {
    barbarian: { cantidad: 2, opciones: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'] },
    bard: { cantidad: 3, opciones: 'cualquiera' },
    cleric: { cantidad: 2, opciones: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] },
    druid: { cantidad: 2, opciones: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'] },
    fighter: { cantidad: 2, opciones: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Persuasion', 'Perception', 'Survival'] },
    monk: { cantidad: 2, opciones: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'] },
    paladin: { cantidad: 2, opciones: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'] },
    ranger: { cantidad: 3, opciones: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'] },
    rogue: { cantidad: 4, opciones: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Persuasion', 'Sleight of Hand', 'Stealth'] },
    sorcerer: { cantidad: 2, opciones: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'] },
    warlock: { cantidad: 2, opciones: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'] },
    wizard: { cantidad: 2, opciones: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'] },
  };
  const COMPETENCIAS_CLASE = {
    barbarian: 'Armadura ligera y media, escudos; armas simples y marciales.',
    bard: 'Armadura ligera; armas simples; tres instrumentos musicales.',
    cleric: 'Armadura ligera y media, escudos; armas simples.',
    druid: 'Armadura ligera y media (sin metal), escudos; armas simples druídicas; kit de herbolario.',
    fighter: 'Todas las armaduras y escudos; armas simples y marciales.',
    monk: 'Armas simples y espadas cortas; sin armadura.',
    paladin: 'Todas las armaduras y escudos; armas simples y marciales.',
    ranger: 'Armadura ligera y media, escudos; armas simples y marciales.',
    rogue: 'Armadura ligera; armas simples, ballestas de mano, espadas largas, estoques y espadas cortas; herramientas de ladrón.',
    sorcerer: 'Dagas, dardos, hondas, bastones y ballestas ligeras.',
    warlock: 'Armadura ligera; armas simples.',
    wizard: 'Dagas, dardos, hondas, bastones y ballestas ligeras.',
  };
  const HABILIDAD_CONJURO = { wizard: 'INT', cleric: 'WIS', druid: 'WIS', ranger: 'WIS', bard: 'CHA', sorcerer: 'CHA', warlock: 'CHA', paladin: 'CHA' };
  const LISTA_HECHIZOS = { bard: 'Bardo', cleric: 'Clérigo', druid: 'Druida', paladin: 'Paladín', ranger: 'Ranger', sorcerer: 'Hechicero', warlock: 'Brujo', wizard: 'Mago' };
  const CA_SIN_ARMADURA = { barbarian: ['DEX', 'CON'], monk: ['DEX', 'WIS'] };

  // [nombre, CA base, tope de DEX (null = sin tope, 0 = sin DEX), categoría]
  const ARMADURAS = [
    ['Padded Armor', 11, null, 'ligera'], ['Leather Armor', 11, null, 'ligera'], ['Studded Leather Armor', 12, null, 'ligera'],
    ['Hide Armor', 12, 2, 'media'], ['Chain Shirt', 13, 2, 'media'], ['Scale Mail', 14, 2, 'media'], ['Breastplate', 14, 2, 'media'], ['Half Plate Armor', 15, 2, 'media'],
    ['Ring Mail', 14, 0, 'pesada'], ['Chain Mail', 16, 0, 'pesada'], ['Splint Armor', 17, 0, 'pesada'], ['Plate Armor', 18, 0, 'pesada'],
  ];
  // [nombre, dados, caras, tipo de daño, propiedades]  (sutil = finesse, dist = a distancia)
  const ARMAS = [
    ['Club', 1, 4, 'B', ''], ['Dagger', 1, 4, 'P', 'sutil'], ['Greatclub', 1, 8, 'B', ''], ['Handaxe', 1, 6, 'S', ''], ['Javelin', 1, 6, 'P', ''],
    ['Light Hammer', 1, 4, 'B', ''], ['Mace', 1, 6, 'B', ''], ['Quarterstaff', 1, 6, 'B', 'Versátil (1d8)'], ['Sickle', 1, 4, 'S', ''], ['Spear', 1, 6, 'P', 'Versátil (1d8)'],
    ['Light Crossbow', 1, 8, 'P', 'dist'], ['Dart', 1, 4, 'P', 'sutil dist'], ['Shortbow', 1, 6, 'P', 'dist'], ['Sling', 1, 4, 'B', 'dist'],
    ['Battleaxe', 1, 8, 'S', 'Versátil (1d10)'], ['Flail', 1, 8, 'B', ''], ['Glaive', 1, 10, 'S', ''], ['Greataxe', 1, 12, 'S', ''], ['Greatsword', 2, 6, 'S', ''],
    ['Halberd', 1, 10, 'S', ''], ['Lance', 1, 10, 'P', ''], ['Longsword', 1, 8, 'S', 'Versátil (1d10)'], ['Maul', 2, 6, 'B', ''], ['Morningstar', 1, 8, 'P', ''],
    ['Pike', 1, 10, 'P', ''], ['Rapier', 1, 8, 'P', 'sutil'], ['Scimitar', 1, 6, 'S', 'sutil'], ['Shortsword', 1, 6, 'P', 'sutil'], ['Trident', 1, 6, 'P', 'Versátil (1d8)'],
    ['War Pick', 1, 8, 'P', ''], ['Warhammer', 1, 8, 'B', 'Versátil (1d10)'], ['Whip', 1, 4, 'S', 'sutil'],
    ['Hand Crossbow', 1, 6, 'P', 'dist'], ['Heavy Crossbow', 1, 10, 'P', 'dist'], ['Longbow', 1, 8, 'P', 'dist'],
  ];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mod = (v) => Math.floor(((parseInt(v, 10) || 10) - 10) / 2);
  const clasesData = () => (typeof CLASSES !== 'undefined' ? CLASSES : []);
  const datosClase = (id) => clasesData().find((c) => c.id === id) || null;
  const prog = (id) => (typeof PROGRESION_CLASES !== 'undefined' && PROGRESION_CLASES[id]) || {};
  const escalonado = (tabla, niv) => { let v = null, m = -1; Object.keys(tabla || {}).forEach((k) => { const n = parseInt(k, 10); if (!isNaN(n) && n <= niv && n > m) { m = n; v = tabla[k]; } }); return v; };
  const nivelTotal = (form) => (form.clases || []).reduce((s, c) => s + (parseInt(c.nivel, 10) || 0), 0);
  const slug = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'pj';

  /* ---------- hechizos ---------- */
  // Espacios por nivel de hechizo de UNA clase (tabla propia de su tipo de lanzador), para saber hasta qué nivel puede aprender.
  function maxNivelHechizo(tipo, nivel) {
    const n = Math.min(Math.max(nivel, 1), 20);
    if (tipo === 'pact' && typeof SLOTS_PACT_CASTER !== 'undefined') return (SLOTS_PACT_CASTER[n] || {}).nivel || 0;
    const t = tipo === 'full' ? SLOTS_FULL_CASTER : tipo === 'half' ? SLOTS_HALF_CASTER : null;
    if (!t) return 0;
    const fila = t[n] || [];
    let m = 0; fila.forEach((c, i) => { if (c > 0) m = i + 1; });
    return m;
  }
  function limitesHechizos(c) {
    const d = datosClase(c.id); if (!d || !d.casterType) return { trucos: 0, preparados: 0, maxNivel: 0, lista: null };
    const p = prog(c.id), niv = parseInt(c.nivel, 10) || 1;
    const prep = Array.isArray(p.preparados) ? p.preparados[Math.min(niv, 20) - 1] : null;
    return {
      trucos: escalonado(p.cantrips, niv) || 0,
      preparados: prep == null ? 0 : prep,
      maxNivel: maxNivelHechizo(d.casterType, niv),
      lista: c.listaHechizos || d.listaHechizos || LISTA_HECHIZOS[c.id] || null,
    };
  }
  function hechizoDeCompendio(nombre) {
    const s = (typeof SPELLS !== 'undefined' ? SPELLS : []).find((x) => x.name === nombre); if (!s) return null;
    const desc = typeof descDeHechizo === 'function' ? descDeHechizo(s) : s.desc;
    return {
      nombre: s.name, nivel: s.nivel, tiempo: s.tiempo, alcance: s.alcance, area: '', resumen: desc, duracion: s.duracion,
      formula: s.formula || null, slotCost: s.nivel > 0 ? s.nivel : null, ataque: s.ataque || null, upcast: s.upcast || null,
      buff: s.buff ? JSON.parse(JSON.stringify(s.buff)) : null,
      concentracion: /^Conc/i.test(s.duracion || ''),
    };
  }

  /* ---------- PG ---------- */
  function pgBase(form) {
    const conMod = mod((form.atributos || {}).CON);
    let total = 0, primero = true;
    (form.clases || []).forEach((c) => {
      const d = datosClase(c.id); if (!d) return;
      const niv = parseInt(c.nivel, 10) || 0;
      for (let i = 0; i < niv; i++) {
        total += (primero ? d.hitDie : Math.floor(d.hitDie / 2) + 1) + conMod;
        primero = false;
      }
    });
    return Math.max(total, 1);
  }

  /* ---------- rasgos ---------- */
  const esAsi = (f) => /Mejora de Puntuaci[oó]n/i.test(f.nombre || '');
  const esElegirSub = (f) => /\(Subclase\)/.test(f.nombre || '') || /^Rasgo (de|del) .*\(Subclase\)/.test(f.nombre || '');
  function rasgosDe(form) {
    const out = [];
    let n = 0;
    (form.clases || []).forEach((c) => {
      const d = datosClase(c.id); if (!d) return;
      const niv = parseInt(c.nivel, 10) || 0;
      (d.features || []).filter((f) => f.nivel <= niv && !esAsi(f) && !esElegirSub(f)).forEach((f) => {
        out.push({ id: 'txt-feat-' + (++n), tag: d.nombre_es || d.name, titulo: f.nombre, texto: f.desc || '' });
      });
      const sub = c.subclase && (d.subclasses || []).find((s) => s.name === c.subclase);
      if (sub && niv >= (d.subclassLevel || 3)) {
        (sub.features || []).filter((f) => f.nivel <= niv).forEach((f) => out.push({ id: 'txt-feat-' + (++n), tag: sub.name, titulo: f.nombre, texto: f.desc || '' }));
      }
    });
    return out;
  }

  function rasgosExtraDe(form, desde) {
    return (form.rasgosExtra || []).filter((r) => r && String(r.titulo || '').trim()).map((r, i) => ({ id: 'txt-feat-' + (desde + i + 1), tag: String(r.tag || 'Importado'), titulo: String(r.titulo).trim(), texto: String(r.texto || '') }));
  }

  /* ---------- recursos ---------- */
  function recursosDe(form) {
    const out = [];
    (form.clases || []).forEach((c) => {
      const d = datosClase(c.id); if (!d) return;
      const p = prog(c.id), usados = {};
      (p.recursos || []).forEach((r) => {
        const max = r.max && r.max.tabla ? { tabla: r.max.tabla, clase: d.name } : (r.max && r.max.por != null ? { por: r.max.por, clase: d.name } : { fijo: 1 });
        out.push({ id: r.id, tipo: r.unidad ? 'pool' : 'pips', nombre: r.nombre, icono: '🔹', max, prefijo: r.id + '-use-', campo: r.id + '-cur', recarga: r.recarga || 'largo', inicial: undefined, pasos: r.unidad ? [-5, -1, 1, 5] : undefined, desc: '' });
        usados[r.id] = true;
      });
      if (d.resourceName && d.resourceProgression && Object.keys(d.resourceProgression).length) {
        const id = 'rc-' + d.id;
        const vals = Object.keys(d.resourceProgression).map((k) => d.resourceProgression[k]);
        const numerico = vals.every((v) => typeof v === 'number');
        const yaEsta = out.some((o) => o.nombre === d.resourceName);
        if (!yaEsta) {
          if (!numerico) out.push({ id, tipo: 'info', nombre: d.resourceName, icono: '🔹', valor: { tabla: d.resourceProgression, clase: d.name }, recarga: null, desc: '' });
          else if (Math.max.apply(null, vals) <= 10) out.push({ id, tipo: 'pips', nombre: d.resourceName, icono: '🔹', max: { tabla: d.resourceProgression, clase: d.name }, prefijo: id + '-use-', recarga: 'largo', desc: '' });
          else out.push({ id, tipo: 'pool', nombre: d.resourceName, icono: '🔹', max: { tabla: d.resourceProgression, clase: d.name }, campo: id + '-cur', recarga: 'largo', pasos: [-1, 1], desc: '' });
        }
      }
      if (c.id === 'bard') out.push({ id: 'bardic-uses', tipo: 'pips', nombre: 'Usos de Bardic Inspiration', icono: '🎶', max: { modificador: 'CHA', min: 1 }, prefijo: 'bardic-use-', recarga: 'largo', desc: 'Igual a tu modificador de Carisma (mínimo 1).' });
    });
    // Limpieza de claves indefinidas (Firebase no admite undefined).
    return out.map((r) => JSON.parse(JSON.stringify(r)));
  }

  /* ---------- rasgos de la biblioteca integrada (rasgos_data.js): recursos y efectos de la clase, la subclase y la especie ---------- */
  const ESPECIE_ALIAS = { orco: 'orc', draconido: 'dragonborn', dragonborn: 'dragonborn', orc: 'orc' };
  const normTxt = (t) => String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  function rasgosBaseDe(form) {
    const base = typeof RASGOS_BASE !== 'undefined' ? RASGOS_BASE : [];
    if (!base.length) return [];
    const nTotal = nivelTotal(form), salida = [], vistos = {};
    const tomar = (tipo, nombre, nivel) => base.filter((r) => r.origen && r.origen.tipo === tipo && normTxt(r.origen.nombre) === normTxt(nombre) && (r.nivel || 0) <= nivel).forEach((r) => {
      if (vistos[r.id]) return; vistos[r.id] = true;
      const c = JSON.parse(JSON.stringify(r));
      c.id = 'rg_' + slug(r.nombre) + '_' + Math.random().toString(36).slice(2, 6);
      c.desde = { tipo: 'base', id: r.id };
      salida.push(c);
    });
    (form.clases || []).forEach((c) => {
      const d = datosClase(c.id); if (!d) return;
      const niv = parseInt(c.nivel, 10) || 0;
      tomar('clase', d.name, niv);
      if (c.subclase) tomar('subclase', c.subclase, niv);
    });
    if (form.especie) tomar('especie', ESPECIE_ALIAS[normTxt(form.especie)] || form.especie, nTotal);
    return salida;
  }

  /* ---------- ataques e inventario ---------- */
  function ataquesDe(form) {
    const at = form.atributos || {};
    return (form.armas || []).map((nombre) => {
      const a = ARMAS.find((x) => x[0] === nombre); if (!a) return null;
      const dist = /dist/.test(a[4]), sutil = /sutil/.test(a[4]);
      let hab = 'STR';
      if (dist) hab = 'DEX'; else if (sutil && mod(at.DEX) > mod(at.STR)) hab = 'DEX';
      const nota = a[4].replace(/sutil/, 'Sutil').replace(/dist/, 'A distancia').replace(/\s+/g, ' ').trim();
      return { nombre: a[0], habilidad: hab, competente: true, dano: { count: a[1], sides: a[2], mod: hab }, textoDano: `${a[1]}d${a[2]} + ${hab} ${a[3]}`, notas: nota };
    }).filter(Boolean);
  }
  function inventarioDe(form) {
    const inv = [];
    const ar = ARMADURAS.find((x) => x[0] === form.armadura);
    if (ar) inv.push({ nombre: ar[0], cantidad: 1, descripcion: 'Armadura ' + ar[3], equipado: true, categoria: 'armadura', consumible: false, modAC: ar[1], dexCap: ar[2] });
    if (form.escudo) inv.push({ nombre: 'Shield', cantidad: 1, descripcion: '+2 CA', equipado: true, categoria: 'escudo', consumible: false, modAC: 2 });
    (form.armas || []).forEach((n) => { const a = ARMAS.find((x) => x[0] === n); if (a) inv.push({ nombre: a[0], cantidad: 1, descripcion: `${a[1]}d${a[2]} ${a[3]}${a[4] ? ' · ' + a[4] : ''}`, equipado: false, categoria: 'arma', consumible: false }); });
    // Inventario ya armado por un importador (armaduras equipadas, escudo, objetos): se limpia el tipo de cada campo.
    (form.inventarioExtra || []).forEach((x) => {
      if (!x || !String(x.nombre || '').trim()) return;
      const cat = ['armadura', 'escudo', 'arma', 'general'].indexOf(x.categoria) >= 0 ? x.categoria : 'general';
      const o = { nombre: String(x.nombre).trim(), cantidad: Math.max(1, parseInt(x.cantidad, 10) || 1), descripcion: String(x.descripcion || ''), equipado: !!x.equipado, categoria: cat, consumible: false };
      if (x.modAC != null && !isNaN(parseInt(x.modAC, 10))) o.modAC = parseInt(x.modAC, 10);
      if (cat === 'armadura') o.dexCap = x.dexCap === null || x.dexCap === undefined ? null : parseInt(x.dexCap, 10);
      inv.push(o);
    });
    (form.equipoExtra || []).forEach((e) => { if (e && String(e.nombre || '').trim()) inv.push({ nombre: String(e.nombre).trim(), cantidad: Math.max(1, parseInt(e.cantidad, 10) || 1), descripcion: String(e.descripcion || ''), equipado: false, categoria: 'general', consumible: false }); });
    return inv;
  }

  /* ---------- validación ---------- */
  function validar(form) {
    const e = [];
    if (!String(form.nombre || '').trim()) e.push('Pon un nombre al personaje.');
    if (!(form.clases || []).length) e.push('Elige al menos una clase.');
    (form.clases || []).forEach((c, i) => {
      const d = datosClase(c.id);
      if (!d) { e.push(`La clase ${i + 1} no existe.`); return; }
      const niv = parseInt(c.nivel, 10);
      if (!(niv >= 1 && niv <= 20)) e.push(`El nivel de ${d.nombre_es || d.name} tiene que estar entre 1 y 20.`);
      if (niv >= (d.subclassLevel || 3) && (d.subclasses || []).length && !c.subclase) e.push(`${d.nombre_es || d.name}: elige ${d.subclassLabel || 'subclase'} (se obtiene en nivel ${d.subclassLevel}).`);
    });
    if (nivelTotal(form) > 20) e.push('El nivel total no puede pasar de 20.');
    const ids = (form.clases || []).map((c) => c.id);
    if (new Set(ids).size !== ids.length) e.push('No repitas la misma clase: suma sus niveles en una sola fila.');
    ATRIBUTOS.forEach((k) => { const v = parseInt((form.atributos || {})[k], 10); if (!(v >= 1 && v <= 30)) e.push(`${ATRIBUTO_ES[k]} tiene que estar entre 1 y 30.`); });
    const clase0 = (form.clases || [])[0], hc = clase0 && HABILIDADES_CLASE[clase0.id];
    if (hc && !form.importado) {
      const comp = Object.keys(form.habilidades || {}).length;
      if (comp < hc.cantidad) e.push(`Elige al menos ${hc.cantidad} habilidades con competencia (la clase da ${hc.cantidad}).`);
    }
    // Los hechizos van en una lista plana: se valida contra el nivel máximo que alcanza CUALQUIERA de las clases lanzadoras.
    const lanzadoras = (form.clases || []).map((c) => ({ c, l: limitesHechizos(c) })).filter((x) => x.l.maxNivel || x.l.trucos);
    if (lanzadoras.length) {
      const maxNivel = Math.max.apply(null, lanzadoras.map((x) => x.l.maxNivel));
      const sel = (form.hechizos || []).map((n) => (typeof SPELLS !== 'undefined' ? SPELLS.find((s) => s.name === n) : null)).filter(Boolean);
      const fuera = sel.filter((s) => s.nivel > maxNivel);
      if (fuera.length) e.push(`Hechizos de nivel demasiado alto: ${fuera.map((s) => s.name).join(', ')} (tus clases llegan a nivel ${maxNivel}).`);
    }
    return e;
  }

  /* ---------- generar ---------- */
  function generar(form) {
    const errores = validar(form);
    if (errores.length) { const x = new Error(errores.join(' ')); x.errores = errores; throw x; }
    const nombre = String(form.nombre).trim();
    const id = form.id || ('pc_' + slug(nombre) + '_' + Math.random().toString(36).slice(2, 6));
    const clase0 = form.clases[0], d0 = datosClase(clase0.id);
    const lanzadora = form.clases.map((c) => ({ c, d: datosClase(c.id) })).find((x) => x.d && x.d.casterType);
    const nTotal = nivelTotal(form);

    const salvaciones = Array.isArray(form.salvaciones) ? form.salvaciones.filter((k) => ATRIBUTOS.includes(k)) : (d0.savingThrows || []).map((s) => ES_A_ABREV[String(s).toLowerCase()]).filter(Boolean);
    const habilidades = {};
    Object.keys(form.habilidades || {}).forEach((k) => { if (HABILIDADES[k]) habilidades[k] = form.habilidades[k] === 'exp' ? 'exp' : 'comp'; });

    const clasesTxt = form.clases.map((c) => `${datosClase(c.id).nombre_es || datosClase(c.id).name} ${c.nivel}${c.subclase ? ' (' + c.subclase + ')' : ''}`).join(' / ');
    const subtitulo = [clasesTxt, [form.especie, form.alineamiento ? '(' + form.alineamiento + ')' : ''].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const competencias = [COMPETENCIAS_CLASE[clase0.id] || '', form.idiomas ? 'Idiomas: ' + form.idiomas : ''].filter(Boolean).join(' ');

    const hechizos = (form.hechizos || []).map(hechizoDeCompendio).filter(Boolean);
    (form.hechizosLibres || []).forEach((h) => { if (h && String(h.nombre || '').trim()) { const nv = Math.max(0, Math.min(9, parseInt(h.nivel, 10) || 0)); hechizos.push({ nombre: String(h.nombre).trim(), nivel: nv, tiempo: h.tiempo || '', alcance: h.alcance || '', area: '', resumen: String(h.resumen || ''), duracion: h.duracion || '', formula: null, slotCost: nv > 0 ? nv : null, concentracion: false }); } });
    const definicion = {
      id, nombre, sistema: 'dnd', paleta: form.paleta || 'bosque', subtitulo,
      chips: [form.especie, form.trasfondoNombre].filter(Boolean),
      xp: form.xp != null && form.xp !== '' ? (parseInt(form.xp, 10) || 0) : (XP_POR_NIVEL[Math.min(nTotal, 20)] || 0),
      clases: form.clases.map((c) => {
        const d = datosClase(c.id);
        const x = { nombre: d.name, dado: d.hitDie, nivelInicial: parseInt(c.nivel, 10) };
        if (d.casterType) x.caster = d.casterType;
        if (c.subclase) x.subclase = c.subclase;
        return x;
      }),
      hpBase: form.hpMax ? Math.max(1, parseInt(form.hpMax, 10) || pgBase(form)) : pgBase(form),
      velocidad: parseInt(form.velocidad, 10) || 30,
      habilidadAtaque: ataquesDe(form)[0] ? ataquesDe(form)[0].habilidad : (mod((form.atributos || {}).DEX) > mod((form.atributos || {}).STR) ? 'DEX' : 'STR'),
      habilidadConjuro: lanzadora ? (lanzadora.d.habilidadConjuro || HABILIDAD_CONJURO[lanzadora.c.id] || 'INT') : null,
      sinConjuros: !lanzadora,
      atributos: Object.assign({}, form.atributos),
      salvaciones, habilidades, competencias,
      ca: form.caFija ? { fija: parseInt(form.caFija, 10) } : { formula: CA_SIN_ARMADURA[clase0.id] || ['DEX'] },
      ataques: ataquesDe(form),
      hechizos, inventario: inventarioDe(form),
      recursos: recursosDe(form),
      rasgos: rasgosDe(form).concat(rasgosExtraDe(form, rasgosDe(form).length)),
      rasgosPropios: rasgosBaseDe(form),
      monedas: [{ id: 'gp-val', etiqueta: 'Oro (po)' }],
    };
    if (form.historia && String(form.historia).trim()) definicion.trasfondo = { texto: String(form.historia).trim() };
    // Firebase no guarda undefined ni arrays vacíos: se limpia para que lo escrito sea exactamente lo que se lee.
    const limpio = JSON.parse(JSON.stringify(definicion));
    const nodo = {
      nombre, clase: clasesTxt, definicion: limpio,
      datos: { 'hp-cur': form.hpActual != null && form.hpActual !== '' ? Math.max(0, Math.min(definicion.hpBase, parseInt(form.hpActual, 10) || 0)) : definicion.hpBase, 'hp-max': definicion.hpBase, 'gp-val': parseInt(form.oro, 10) || 0 },
    };
    return { id, nodo, definicion: limpio, resumen: { clasesTxt, nivel: nTotal, pg: definicion.hpBase } };
  }

  global.FichaGenerador = {
    generar, validar, limitesHechizos, pgBase, hechizoDeCompendio, maxNivelHechizo, slug, rasgosBaseDe,
    HABILIDADES_CLASE, COMPETENCIAS_CLASE, ARMADURAS, ARMAS, ATRIBUTOS, ATRIBUTO_ES, HABILIDADES, ARRAY_ESTANDAR, COSTO_PUNTOS, XP_POR_NIVEL, LISTA_HECHIZOS, HABILIDAD_CONJURO,
  };
})(typeof window !== 'undefined' ? window : globalThis);

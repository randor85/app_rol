/*
 * clases-custom.js — clases y subclases CUSTOM (homebrew) por campaña.
 *
 * Módulo global `window.ClasesCustom`, sin dependencias de DOM. Se carga DESPUÉS de classes_data.js
 * (usa los globales CLASSES y PROGRESION_CLASES) y recibe la base de datos (firebase.database()) por
 * parámetro. Lo usan classes.html, creador-clases.html y (a través de los globales ya fusionados)
 * ficha-nivel.js y el futuro creador de personajes.
 *
 * Datos en Firebase. Las CLASES custom son por campaña; las SUBCLASES custom están en una biblioteca GLOBAL
 * (`biblioteca/subclases_custom/<id>`, v85.0) para reutilizarlas en campañas futuras. Las subclases que ya estaban dentro de una
 * campaña se siguen leyendo y se mezclan (la global gana por id); `migrarSubclasesALaBiblioteca` las pasa a la global.
 * Por campaña:
 *   campanas/<c>/clases_custom/<id>     = objeto con la forma de un elemento de CLASSES + `prog` (la entrada
 *                                         de PROGRESION_CLASES) + autor, autorNombre, creada.
 *   campanas/<c>/subclases_custom/<id>  = { id, clase, name, resumen, features:[{nivel,nombre,desc}], autor, autorNombre, creada }
 *   `id` = slug a-z0-9_ prefijado `c_` (p. ej. `c_artificiero`). `custom:true` se agrega al cargar (no se guarda).
 *
 * API:
 *   cargar(db, campana)                       → Promise<{clases, subclases}>  lee ambos nodos UNA vez, normaliza y FUSIONA
 *                                               en CLASSES / PROGRESION_CLASES. Idempotente.
 *   escuchar(db, campana, cb)                 → función para dejar de escuchar. cb({clases, subclases}) en cada cambio.
 *   leer(db, campana)                         → Promise<{clases, subclases}> (normalizadas, sin fusionar)
 *   guardarClase(db, campana, uid, nombreAutor, clase)      → Promise<clase guardada>  (rechaza con Error.errores si no valida)
 *   guardarSubclase(db, campana, uid, nombreAutor, sub)     → Promise<subclase guardada>
 *   borrarClase(db, campana, id) / borrarSubclase(db, campana, id)  → Promise
 *   validarClase(obj, opts) / validarSubclase(obj, opts)    → [mensajes de error en español] ([] = válido)
 *   slug(nombre)                              → 'c_artificiero' (prefijo c_ incluido)
 *   plantillaClase()                          → clase vacía (solo le falta el nombre para ser válida)
 *   normalizarClase(raw, clave) / normalizarSubclase(raw, clave)   → forma canónica (con defaults)
 *   fusionar(clases, subclases)               → aplica la fusión sobre los globales (la usa cargar)
 *   estado()                                  → { clases, subclases } de la última carga
 *   esId(id) · RASGOS_TIPICOS(subclassLevel, subclassLabel) · constantes (ABIL, SALVACIONES, TIPOS_ELECCION…)
 *
 * Firebase RTDB descarta null/[]/{} y devuelve como ARRAY los objetos con claves enteras consecutivas: por eso
 * todo lo que se lee pasa por normalizarClase() (tablas escalonadas → {nivel:valor} sin nulls, defaults en lo
 * que falte) y todo lo que se escribe se limpia con paraGuardar() (tablas como objetos de claves string).
 */
(function () {
  'use strict';

  const PREFIJO = 'c_';
  const RE_ID = /^c_[a-z0-9_]{1,40}$/;
  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const ABIL_ES = { STR: 'Fuerza', DEX: 'Destreza', CON: 'Constitución', INT: 'Inteligencia', WIS: 'Sabiduría', CHA: 'Carisma' };
  const SALVACIONES = ['Fuerza', 'Destreza', 'Constitución', 'Inteligencia', 'Sabiduría', 'Carisma'];
  const DADOS = [6, 8, 10, 12];
  const CASTER = [null, 'full', 'half', 'pact'];
  const TIPOS_ELECCION = ['estilo', 'expertise', 'metamagia', 'invocaciones'];
  const RECARGAS = ['corto', 'largo'];

  // CLASSES / PROGRESION_CLASES son `const` de otro <script>: no cuelgan de window, pero se leen como globales.
  function clasesGlobal() { try { return (typeof CLASSES !== 'undefined') ? CLASSES : null; } catch (e) { return null; } }
  function progGlobal() { try { return (typeof PROGRESION_CLASES !== 'undefined') ? PROGRESION_CLASES : null; } catch (e) { return null; } }

  const clonar = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const str = (v) => (v == null ? '' : String(v)).trim();
  const entero = (v) => { const n = Number(v); return Number.isInteger(n) ? n : NaN; };
  const esObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  // ------------------------------------------------------------------ normalización (lectura)
  function valor(v) {                       // número si lo parece, si no texto ("1d6", "d8")
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { const t = v.trim(); if (t !== '' && !isNaN(Number(t))) return Number(t); return t; }
    return v;
  }
  // {nivel:valor} | array de RTDB (índice = nivel) → objeto sin nulls
  function aTabla(x) {
    const out = {};
    const poner = (k, v) => { if (v == null || v === '') return; const n = entero(k); if (!(n >= 1 && n <= 20)) return; out[String(n)] = valor(v); };
    if (Array.isArray(x)) x.forEach((v, i) => poner(i, v));
    else if (esObj(x)) Object.keys(x).forEach((k) => poner(k, x[k]));
    return out;
  }
  // array de RTDB / objeto con claves → array de valores sin nulls
  function aLista(x) {
    if (Array.isArray(x)) return x.filter((v) => v != null);
    if (esObj(x)) return Object.keys(x).sort((a, b) => Number(a) - Number(b)).map((k) => x[k]).filter((v) => v != null);
    return [];
  }
  function aVeinte(x) {                     // 20 números (preparados, invocaciones); undefined si no hay nada
    if (x == null) return undefined;
    const src = Array.isArray(x) ? x : (esObj(x) ? x : null);
    if (!src) return undefined;
    const out = [];
    for (let i = 0; i < 20; i++) out.push(Number(src[i]) || 0);
    return out.some((n) => n) ? out : undefined;
  }
  function aFeatures(x) {
    return aLista(x).filter(esObj).map((f) => {
      const r = { nivel: entero(f.nivel), nombre: str(f.nombre), desc: str(f.desc) };
      if (f.incierto) r.incierto = true;
      return r;
    });
  }
  function aEleccion(e) {
    const r = Object.assign({}, e, { nivel: entero(e.nivel), tipo: str(e.tipo), cantidad: entero(e.cantidad) });
    if (e.restringido != null) r.restringido = aLista(e.restringido);
    return r;
  }
  function aRecurso(x) {
    const r = { id: str(x.id), nombre: str(x.nombre), recarga: str(x.recarga) || 'largo' };
    const m = esObj(x.max) ? x.max : {};
    if (m.tabla != null) r.max = { tabla: aTabla(m.tabla) };
    else r.max = { por: Number(m.por) || 0 };
    if (x.paso != null && x.paso !== '') r.paso = Number(x.paso);
    if (x.unidad) r.unidad = str(x.unidad);
    return r;
  }
  function aProg(p) {
    p = esObj(p) ? p : {};
    const r = Object.assign({}, p);
    r.prerrequisitos = aLista(p.prerrequisitos).map(str).filter(Boolean);
    if (p.prerrequisitosAlternativos != null) { r.prerrequisitosAlternativos = aLista(p.prerrequisitosAlternativos).map(str).filter(Boolean); if (!r.prerrequisitosAlternativos.length) delete r.prerrequisitosAlternativos; }
    const cant = aTabla(p.cantrips);
    if (Object.keys(cant).length) r.cantrips = cant; else delete r.cantrips;
    const prep = aVeinte(p.preparados);
    if (prep) r.preparados = prep; else delete r.preparados;
    const inv = aVeinte(p.invocaciones);
    if (inv) r.invocaciones = inv; else delete r.invocaciones;
    r.elecciones = aLista(p.elecciones).filter(esObj).map(aEleccion);
    const rec = aLista(p.recursos).filter(esObj).map(aRecurso);
    if (rec.length) r.recursos = rec; else delete r.recursos;
    return r;
  }

  function normalizarClase(raw, clave) {
    raw = esObj(raw) ? raw : {};
    const id = clave != null ? String(clave) : str(raw.id);
    const name = str(raw.name);
    const c = {
      id,
      name,
      nombre_es: str(raw.nombre_es) || name,
      hitDie: Number(raw.hitDie) || 8,
      primaryAbility: str(raw.primaryAbility),
      savingThrows: aLista(raw.savingThrows).map(str).filter(Boolean),
      casterType: CASTER.indexOf(raw.casterType) > 0 ? raw.casterType : null,
      subclassLevel: entero(raw.subclassLevel) >= 1 ? entero(raw.subclassLevel) : 3,
      subclassLabel: str(raw.subclassLabel) || 'Subclase',
      resumen: str(raw.resumen),
      resourceName: str(raw.resourceName) || null,
      resourceProgression: aTabla(raw.resourceProgression),
      features: aFeatures(raw.features),
      subclasses: aLista(raw.subclasses).filter(esObj).map((s) => ({ name: str(s.name), resumen: str(s.resumen), features: aFeatures(s.features) })),
      prog: aProg(raw.prog),
      autor: str(raw.autor),
      autorNombre: str(raw.autorNombre),
      creada: Number(raw.creada) || 0,
    };
    return c;
  }
  function normalizarSubclase(raw, clave) {
    raw = esObj(raw) ? raw : {};
    return {
      id: clave != null ? String(clave) : str(raw.id),
      clase: str(raw.clase),
      name: str(raw.name),
      resumen: str(raw.resumen),
      features: aFeatures(raw.features),
      autor: str(raw.autor),
      autorNombre: str(raw.autorNombre),
      creada: Number(raw.creada) || 0,
    };
  }

  // ------------------------------------------------------------------ escritura: limpieza para RTDB
  function tablaParaGuardar(t) {            // objeto {"1":v,"3":w}; nunca array
    const o = {};
    Object.keys(aTabla(t)).forEach((k) => { o[k] = aTabla(t)[k]; });
    return o;
  }
  function featuresParaGuardar(fs) {
    return aFeatures(fs).sort((a, b) => a.nivel - b.nivel).map((f) => {
      const r = { nivel: f.nivel, nombre: f.nombre, desc: f.desc };
      if (f.incierto) r.incierto = true;
      return r;
    });
  }
  function paraGuardarClase(c) {
    const n = normalizarClase(c, c.id);
    const out = {
      id: n.id, name: n.name, nombre_es: n.nombre_es, hitDie: n.hitDie, primaryAbility: n.primaryAbility,
      savingThrows: n.savingThrows, subclassLevel: n.subclassLevel, subclassLabel: n.subclassLabel,
      resumen: n.resumen, features: featuresParaGuardar(n.features),
      autor: n.autor, autorNombre: n.autorNombre, creada: n.creada,
    };
    if (n.casterType) out.casterType = n.casterType;
    if (n.resourceName) out.resourceName = n.resourceName;
    const rp = tablaParaGuardar(n.resourceProgression);
    if (Object.keys(rp).length) out.resourceProgression = rp;
    const subs = n.subclasses.map((s) => ({ name: s.name, resumen: s.resumen, features: featuresParaGuardar(s.features) }));
    if (subs.length) out.subclasses = subs;
    const p = clonar(n.prog); delete p.custom;
    if (p.cantrips) p.cantrips = tablaParaGuardar(p.cantrips);
    (p.recursos || []).forEach((r) => { if (r.max && r.max.tabla) r.max.tabla = tablaParaGuardar(r.max.tabla); });
    out.prog = p;
    return clonar(out);                     // sin undefined
  }
  function paraGuardarSubclase(s) {
    const n = normalizarSubclase(s, s.id);
    return clonar({ id: n.id, clase: n.clase, name: n.name, resumen: n.resumen, features: featuresParaGuardar(n.features), autor: n.autor, autorNombre: n.autorNombre, creada: n.creada });
  }

  // ------------------------------------------------------------------ utilidades públicas
  function slug(nombre) {
    const s = String(nombre == null ? '' : nombre).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      .slice(0, 38).replace(/_+$/g, '');
    return PREFIJO + s;
  }
  function esId(id) { return typeof id === 'string' && RE_ID.test(id); }

  function plantillaClase() {
    return {
      id: '', name: '', nombre_es: '', hitDie: 8, primaryAbility: 'Fuerza',
      savingThrows: ['Fuerza', 'Constitución'], casterType: null, subclassLevel: 3, subclassLabel: 'Subclase',
      resumen: '', resourceName: null, resourceProgression: {}, features: [], subclasses: [],
      prog: { prerrequisitos: ['STR'], elecciones: [] },
    };
  }

  // Rasgos «típicos» que comparten las clases oficiales: mejora de característica y el rasgo genérico de subclase.
  const TXT_ASI = 'Aumentas una característica en 2, o dos en 1 cada una, o tomas un Talento.';
  function RASGOS_TIPICOS(subclassLevel, subclassLabel) {
    const l = [4, 8, 12, 16].map((n) => ({ nivel: n, nombre: 'Mejora de Puntuación de Característica', desc: TXT_ASI }));
    l.push({ nivel: 19, nombre: 'Mejora de Puntuación de Característica / Don Épico', desc: 'Última mejora de característica, o un Don Épico.' });
    const sl = entero(subclassLevel);
    if (sl >= 1 && sl <= 20) {
      const et = str(subclassLabel) || 'Subclase';
      l.unshift({ nivel: sl, nombre: (et.toLowerCase() === 'subclase' ? 'Elección de subclase' : et) + ' (Subclase)', desc: 'Eliges tu ' + et.toLowerCase() + '.' });
    }
    return l.sort((a, b) => a.nivel - b.nivel);
  }

  // ------------------------------------------------------------------ validación
  function idsOficiales() {
    const C = clasesGlobal();
    return (C || []).filter((c) => !c.custom).map((c) => c.id);
  }
  function validarRasgos(lista, prefijo, errores) {
    const arr = aLista(lista);
    arr.forEach((f, i) => {
      const p = prefijo + ' ' + (i + 1);
      if (!esObj(f)) { errores.push(p + ': formato inválido.'); return; }
      const nv = entero(f.nivel);
      if (!(nv >= 1 && nv <= 20)) errores.push(p + (str(f.nombre) ? ' («' + str(f.nombre) + '»)' : '') + ': el nivel tiene que estar entre 1 y 20.');
      if (!str(f.nombre)) errores.push(p + ': falta el nombre.');
      else if (str(f.nombre).length > 120) errores.push(p + ': el nombre es demasiado largo (máx. 120 caracteres).');
      if (!str(f.desc)) errores.push(p + (str(f.nombre) ? ' («' + str(f.nombre) + '»)' : '') + ': falta la descripción.');
      else if (str(f.desc).length > 4000) errores.push(p + ': la descripción es demasiado larga (máx. 4000 caracteres).');
    });
  }
  function validarTabla(t, etiqueta, errores, opciones) {
    opciones = opciones || {};
    if (t == null) return;
    const lista = Array.isArray(t) ? t.map((v, i) => [i, v]).filter((p) => p[1] != null) : (esObj(t) ? Object.keys(t).map((k) => [k, t[k]]) : []);
    lista.forEach((p) => {
      const n = entero(p[0]);
      if (!(n >= 1 && n <= 20)) errores.push(etiqueta + ': el nivel «' + p[0] + '» no es válido (1 a 20).');
      if (p[1] === '' || p[1] == null) errores.push(etiqueta + ', nivel ' + p[0] + ': falta el valor.');
      else if (opciones.numerico && !(Number(p[1]) >= 0)) errores.push(etiqueta + ', nivel ' + p[0] + ': el valor tiene que ser un número.');
    });
  }

  function validarClase(obj, opts) {
    opts = opts || {};
    const e = [];
    if (!esObj(obj)) return ['La clase no tiene un formato válido.'];
    const name = str(obj.name);
    if (!name) e.push('Pon un nombre para la clase.');
    else if (name.length > 60) e.push('El nombre es demasiado largo (máx. 60 caracteres).');
    if (str(obj.nombre_es).length > 60) e.push('El nombre en español es demasiado largo (máx. 60 caracteres).');

    const id = str(obj.id);
    if (id) {
      if (!RE_ID.test(id)) e.push('El identificador «' + id + '» no es válido: tiene que empezar con «c_» y usar solo minúsculas, números y guion bajo (hasta 40 caracteres).');
      else if (idsOficiales().indexOf(id) >= 0) e.push('El identificador «' + id + '» ya lo usa una clase oficial.');
      else if (opts.idsExistentes && opts.esNueva && opts.idsExistentes.indexOf(id) >= 0) e.push('Ya existe una clase tuya o de la campaña con el identificador «' + id + '».');
    } else if (name && !RE_ID.test(slug(name))) {
      e.push('Con ese nombre no se puede armar un identificador: usa letras o números.');
    }

    if (DADOS.indexOf(Number(obj.hitDie)) < 0) e.push('El dado de golpe tiene que ser d6, d8, d10 o d12.');
    if (!str(obj.primaryAbility)) e.push('Indica la característica principal (por ejemplo «Fuerza» o «Destreza y Sabiduría»).');
    const salv = aLista(obj.savingThrows).map(str);
    if (salv.length !== 2) e.push('Elige exactamente 2 salvaciones con competencia.');
    else {
      if (salv[0] === salv[1]) e.push('Las dos salvaciones tienen que ser distintas.');
      salv.forEach((s) => { if (SALVACIONES.indexOf(s) < 0) e.push('«' + s + '» no es una salvación válida.'); });
    }
    if (obj.casterType != null && obj.casterType !== '' && CASTER.indexOf(obj.casterType) < 0) e.push('El tipo de lanzador tiene que ser completo, medio, pacto o ninguno.');
    const sl = entero(obj.subclassLevel);
    if (!(sl >= 1 && sl <= 20)) e.push('El nivel en que se elige la subclase tiene que estar entre 1 y 20.');
    if (!str(obj.subclassLabel)) e.push('Pon la etiqueta de la subclase (por ejemplo «Colegio» o «Juramento»).');
    if (str(obj.resumen).length > 2000) e.push('El resumen es demasiado largo (máx. 2000 caracteres).');

    // recurso principal
    const rp = obj.resourceProgression;
    const filasRP = Array.isArray(rp) ? rp.filter((v) => v != null) : (esObj(rp) ? Object.keys(rp) : []);
    if (str(obj.resourceName) && !filasRP.length) e.push('El recurso principal «' + str(obj.resourceName) + '» necesita al menos una fila en su tabla (nivel → valor).');
    if (!str(obj.resourceName) && filasRP.length) e.push('La tabla del recurso principal necesita un nombre de recurso.');
    validarTabla(rp, 'Tabla del recurso principal', e);

    // rasgos
    validarRasgos(obj.features, 'Rasgo', e);

    // subclases embebidas
    const nombres = {};
    aLista(obj.subclasses).forEach((s, i) => {
      const p = 'Subclase ' + (i + 1);
      if (!esObj(s)) { e.push(p + ': formato inválido.'); return; }
      const sn = str(s.name);
      if (!sn) e.push(p + ': falta el nombre.');
      else if (nombres[sn.toLowerCase()]) e.push(p + ': el nombre «' + sn + '» está repetido.');
      else nombres[sn.toLowerCase()] = true;
      validarRasgos(s.features, p + ', rasgo', e);
    });

    // progresión del asistente
    const p = esObj(obj.prog) ? obj.prog : {};
    aLista(p.prerrequisitos).forEach((a) => { if (ABIL.indexOf(a) < 0) e.push('Prerrequisito de multiclase «' + a + '» inválido (usa STR, DEX, CON, INT, WIS o CHA).'); });
    aLista(p.prerrequisitosAlternativos).forEach((a) => { if (ABIL.indexOf(a) < 0) e.push('Prerrequisito alternativo «' + a + '» inválido.'); });
    validarTabla(p.cantrips, 'Trucos conocidos', e, { numerico: true });
    ['preparados', 'invocaciones'].forEach((k) => {
      if (p[k] == null) return;
      const a = Array.isArray(p[k]) ? p[k] : null;
      if (!a || a.length !== 20 || a.some((v) => !(Number(v) >= 0))) e.push((k === 'preparados' ? 'Hechizos preparados' : 'Invocaciones') + ': tienen que ser 20 números (uno por nivel).');
    });
    aLista(p.elecciones).forEach((el, i) => {
      const q = 'Elección ' + (i + 1);
      if (!esObj(el)) { e.push(q + ': formato inválido.'); return; }
      if (!(entero(el.nivel) >= 1 && entero(el.nivel) <= 20)) e.push(q + ': el nivel tiene que estar entre 1 y 20.');
      if (TIPOS_ELECCION.indexOf(el.tipo) < 0) e.push(q + ': el tipo tiene que ser estilo, expertise, metamagia o invocaciones.');
      if (!(entero(el.cantidad) >= 1 && entero(el.cantidad) <= 20)) e.push(q + ': la cantidad tiene que ser un número de 1 a 20.');
    });
    const idsRec = {};
    aLista(p.recursos).forEach((r, i) => {
      const q = 'Recurso ' + (i + 1);
      if (!esObj(r)) { e.push(q + ': formato inválido.'); return; }
      const rid = str(r.id);
      if (!rid) e.push(q + ': falta el identificador.');
      else if (!/^[a-z0-9_-]{1,40}$/.test(rid)) e.push(q + ': el identificador «' + rid + '» solo puede tener minúsculas, números, guion y guion bajo.');
      else if (idsRec[rid]) e.push(q + ': el identificador «' + rid + '» está repetido.');
      else idsRec[rid] = true;
      if (!str(r.nombre)) e.push(q + ': falta el nombre.');
      const m = esObj(r.max) ? r.max : {};
      if (m.tabla != null) {
        if (!Object.keys(aTabla(m.tabla)).length) e.push(q + ' («' + str(r.nombre) + '»): la tabla de usos está vacía.');
        validarTabla(m.tabla, q + ', usos por nivel', e, { numerico: true });
      } else if (!(Number(m.por) > 0)) e.push(q + ' («' + str(r.nombre) + '»): indica cuántos usos por nivel (mayor que 0) o una tabla.');
      if (RECARGAS.indexOf(r.recarga) < 0) e.push(q + ': la recarga tiene que ser descanso corto o largo.');
    });
    return e;
  }

  function validarSubclase(obj, opts) {
    opts = opts || {};
    const e = [];
    if (!esObj(obj)) return ['La subclase no tiene un formato válido.'];
    const name = str(obj.name);
    if (!name) e.push('Pon un nombre para la subclase.');
    else if (name.length > 80) e.push('El nombre es demasiado largo (máx. 80 caracteres).');
    const clase = str(obj.clase);
    const lista = opts.clases || clasesGlobal() || [];
    const base = lista.find((c) => c.id === clase);
    if (!clase) e.push('Elige la clase a la que pertenece la subclase.');
    else if (!base && !(opts.ignorarClaseInexistente)) e.push('La clase base «' + clase + '» no existe.');
    if (base && name) {
      const dup = (base.subclasses || []).some((s) => str(s.name).toLowerCase() === name.toLowerCase() && !(opts.id && s.id === opts.id) && !(obj.id && s.id === obj.id));
      if (dup) e.push('La clase «' + (base.nombre_es || base.name) + '» ya tiene una subclase llamada «' + name + '».');
    }
    const id = str(obj.id);
    if (id) {
      if (!RE_ID.test(id)) e.push('El identificador «' + id + '» no es válido: tiene que empezar con «c_» y usar solo minúsculas, números y guion bajo.');
    }
    if (str(obj.resumen).length > 2000) e.push('El resumen es demasiado largo (máx. 2000 caracteres).');
    validarRasgos(obj.features, 'Rasgo', e);
    return e;
  }

  // ------------------------------------------------------------------ fusión en los globales
  let ultimo = { clases: [], subclases: [] };
  function fusionar(clases, subclases) {
    const C = clasesGlobal();
    const P = progGlobal();
    ultimo = { clases: clases || [], subclases: subclases || [] };
    if (!C) return { clases: 0, subclases: 0 };
    // 1) quitar lo custom de una fusión anterior (idempotente: nunca se duplica y los borrados desaparecen)
    for (let i = C.length - 1; i >= 0; i--) {
      if (C[i].custom) { if (P) delete P[C[i].id]; C.splice(i, 1); }
    }
    C.forEach((c) => { if (Array.isArray(c.subclasses)) { for (let i = c.subclasses.length - 1; i >= 0; i--) if (c.subclasses[i].custom) c.subclasses.splice(i, 1); } });
    if (P) Object.keys(P).forEach((k) => { if (P[k] && P[k].custom) delete P[k]; });

    const oficiales = {};
    C.forEach((c) => { oficiales[c.id] = true; });
    let nc = 0, ns = 0;
    (clases || []).forEach((raw) => {
      const c = normalizarClase(raw, raw.id);
      if (!RE_ID.test(c.id) || oficiales[c.id] || !c.name) return;
      const prog = c.prog; delete c.prog;
      c.custom = true;
      c.subclasses = c.subclasses.map((s) => Object.assign({}, s, { custom: true }));
      C.push(c);
      if (P) P[c.id] = Object.assign({}, prog, { custom: true });
      oficiales[c.id] = true;
      nc++;
    });
    (subclases || []).forEach((raw) => {
      const s = normalizarSubclase(raw, raw.id);
      const c = C.find((x) => x.id === s.clase);
      if (!c || !s.name) return;
      if (!Array.isArray(c.subclasses)) c.subclasses = [];
      if (c.subclasses.some((x) => str(x.name).toLowerCase() === s.name.toLowerCase())) return;
      c.subclasses.push({ name: s.name, resumen: s.resumen, features: s.features, custom: true, id: s.id, autor: s.autor, autorNombre: s.autorNombre });
      ns++;
    });
    return { clases: nc, subclases: ns };
  }

  // ------------------------------------------------------------------ Firebase
  // Las CLASES custom viven por campaña. Las SUBCLASES custom viven en una biblioteca GLOBAL (se crean una vez y sirven
  // en todas las campañas); las que se crearon antes dentro de una campaña se siguen leyendo de ahí y se mezclan (la global gana por id).
  const RUTA_SUBCLASES_GLOBAL = 'biblioteca/subclases_custom';
  function rutaBase(campana) { return 'campanas/' + campana; }
  function convertir(snapC, snapS, snapG) {
    const vc = (snapC && snapC.val && snapC.val()) || {};
    const vs = (snapS && snapS.val && snapS.val()) || {};
    const vg = (snapG && snapG.val && snapG.val()) || {};
    const clases = Object.keys(esObj(vc) ? vc : {}).map((k) => normalizarClase(vc[k], k));
    const porId = {};
    Object.keys(esObj(vs) ? vs : {}).forEach((k) => { porId[k] = normalizarSubclase(vs[k], k); });
    Object.keys(esObj(vg) ? vg : {}).forEach((k) => { const n = normalizarSubclase(vg[k], k); n.global = true; porId[k] = n; });
    return { clases, subclases: Object.keys(porId).map((k) => porId[k]) };
  }
  // La lectura global es tolerante: si las reglas todavía no la permiten, la ficha sigue funcionando con las de la campaña.
  const leerGlobal = (db) => db.ref(RUTA_SUBCLASES_GLOBAL).once('value').catch(() => null);
  // Sin campaña (p. ej. el compendio abierto desde el menú) solo se leen las subclases de la biblioteca global.
  function leer(db, campana) {
    if (!db) return Promise.reject(new Error('Falta la base de datos.'));
    if (!campana) return leerGlobal(db).then((g) => convertir(null, null, g));
    return Promise.all([
      db.ref(rutaBase(campana) + '/clases_custom').once('value'),
      db.ref(rutaBase(campana) + '/subclases_custom').once('value'),
      leerGlobal(db),
    ]).then((r) => convertir(r[0], r[1], r[2]));
  }
  function cargar(db, campana) {
    return leer(db, campana).then((d) => { fusionar(d.clases, d.subclases); return d; });
  }
  function escuchar(db, campana, cb) {
    if (!db || !campana) return function () {};
    let sc = null, ss = null, sg = null, activo = true;
    const refC = db.ref(rutaBase(campana) + '/clases_custom');
    const refS = db.ref(rutaBase(campana) + '/subclases_custom');
    const refG = db.ref(RUTA_SUBCLASES_GLOBAL);
    const aplicar = () => {
      if (!activo || sc === null || ss === null || sg === null) return;
      const d = convertir(sc, ss, sg);
      fusionar(d.clases, d.subclases);
      if (typeof cb === 'function') cb(d);
    };
    const fc = (s) => { sc = s; aplicar(); };
    const fs = (s) => { ss = s; aplicar(); };
    const err = (e) => { if (typeof cb === 'function' && activo) { try { cb({ clases: ultimo.clases, subclases: ultimo.subclases, error: e }); } catch (x) { /* nada */ } } };
    const fg = (s) => { sg = s; aplicar(); };
    refC.on('value', fc, err);
    refS.on('value', fs, err);
    refG.on('value', fg, () => { sg = { val: () => ({}) }; aplicar(); });   // sin permiso de lectura global (reglas aún sin publicar): se sigue con las de la campaña
    return function () { activo = false; try { refC.off('value', fc); refS.off('value', fs); refG.off('value', fg); } catch (e) { /* nada */ } };
  }

  function errorValidacion(errores) {
    const err = new Error(errores[0] + (errores.length > 1 ? ' (y ' + (errores.length - 1) + ' más)' : ''));
    err.errores = errores;
    return err;
  }
  function guardarClase(db, campana, uid, nombreAutor, clase) {
    if (!db || !campana || !uid) return Promise.reject(new Error('Falta la base de datos, la campaña o la sesión.'));
    const c = clonar(clase) || {};
    const edicion = !!str(c.autor);
    if (!str(c.id)) c.id = slug(c.name);
    const errores = validarClase(c, {});
    if (errores.length) return Promise.reject(errorValidacion(errores));
    const n = normalizarClase(c, c.id);
    if (!edicion) { n.autor = uid; n.autorNombre = str(nombreAutor) || 'Anónimo'; n.creada = Date.now(); }
    else if (!n.creada) n.creada = Date.now();
    const ref = db.ref(rutaBase(campana) + '/clases_custom/' + n.id);
    const guardar = () => ref.set(paraGuardarClase(n)).then(() => n);
    if (edicion) return guardar();
    return ref.once('value').then((s) => {
      if (s && s.exists && s.exists()) { const er = new Error('Ya existe una clase con el identificador «' + n.id + '». Cambia el nombre.'); er.errores = [er.message]; throw er; }
      return guardar();
    });
  }
  function guardarSubclase(db, campana, uid, nombreAutor, sub) {
    if (!db || !uid) return Promise.reject(new Error('Falta la base de datos o la sesión.'));
    const s = clonar(sub) || {};
    const edicion = !!str(s.autor);
    if (!str(s.id)) s.id = slug(s.name);
    const errores = validarSubclase(s, { id: s.id });
    if (errores.length) return Promise.reject(errorValidacion(errores));
    const n = normalizarSubclase(s, s.id);
    if (!edicion) { n.autor = uid; n.autorNombre = str(nombreAutor) || 'Anónimo'; n.creada = Date.now(); }
    else if (!n.creada) n.creada = Date.now();
    const ref = db.ref(RUTA_SUBCLASES_GLOBAL + '/' + n.id);
    // Al guardar en la biblioteca global se retira la copia antigua de la campaña (si era del propio autor; si no hay permiso, queda y la global gana).
    const guardar = () => ref.set(paraGuardarSubclase(n)).then(() => {
      if (campana) db.ref(rutaBase(campana) + '/subclases_custom/' + n.id).remove().catch(() => {});
      return n;
    });
    if (edicion) return guardar();
    return ref.once('value').then((snap) => {
      if (snap && snap.exists && snap.exists()) { const er = new Error('Ya existe una subclase con el identificador «' + n.id + '». Cambia el nombre.'); er.errores = [er.message]; throw er; }
      return guardar();
    });
  }
  function borrarClase(db, campana, id) {
    if (!db || !campana || !RE_ID.test(String(id))) return Promise.reject(new Error('Identificador de clase inválido.'));
    return db.ref(rutaBase(campana) + '/clases_custom/' + id).remove();
  }
  function borrarSubclase(db, campana, id) {
    if (!db || !RE_ID.test(String(id))) return Promise.reject(new Error('Identificador de subclase inválido.'));
    const antigua = campana ? db.ref(rutaBase(campana) + '/subclases_custom/' + id).remove().catch(() => {}) : Promise.resolve();
    return db.ref(RUTA_SUBCLASES_GLOBAL + '/' + id).remove().then(() => antigua);
  }
  // Pasa a la biblioteca global las subclases que ESTE usuario creó dentro de una campaña (las de otros las migra quien las creó).
  function migrarSubclasesALaBiblioteca(db, campana, uid) {
    if (!db || !campana || !uid) return Promise.resolve(0);
    return Promise.all([db.ref(rutaBase(campana) + '/subclases_custom').once('value'), leerGlobal(db)]).then((r) => {
      const vs = (r[0] && r[0].val && r[0].val()) || {}, vg = (r[1] && r[1].val && r[1].val()) || {};
      const propias = Object.keys(esObj(vs) ? vs : {}).filter((k) => vs[k] && vs[k].autor === uid && !(esObj(vg) && vg[k]));
      return Promise.all(propias.map((k) => db.ref(RUTA_SUBCLASES_GLOBAL + '/' + k).set(vs[k]).then(() => 1).catch(() => 0))).then((x) => x.reduce((a, b) => a + b, 0));
    }).catch(() => 0);
  }

  window.ClasesCustom = {
    cargar, escuchar, leer, guardarClase, guardarSubclase, borrarClase, borrarSubclase, migrarSubclasesALaBiblioteca,
    validarClase, validarSubclase, slug, plantillaClase, normalizarClase, normalizarSubclase, fusionar,
    estado: () => ({ clases: ultimo.clases.slice(), subclases: ultimo.subclases.slice() }),
    esId, RASGOS_TIPICOS, paraGuardarClase, paraGuardarSubclase,
    ABIL, ABIL_ES, SALVACIONES, DADOS, TIPOS_ELECCION, RECARGAS, PREFIJO,
  };
})();

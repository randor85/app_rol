/*
 * ficha-dados.js — lanzador de dados + historial de tiradas + registro de uso de recursos.
 *
 * Módulo compartido (sin framework). Funciona con o sin Firebase y con o sin ficha-common.js:
 *   - Con ficha-common.js, el motor avisa cada uso de recurso con el evento 'ficha:uso'
 *     ({ tipo, texto, detalle }) y este módulo lo anota en el historial.
 *   - Las TIRADAS (no los usos de recurso) se publican además en campanas/<campaña>/tiradas con la
 *     misma forma que ya usan las fichas y la pantalla del GM:
 *       { personaje, tipo: <etiqueta>, resultado: 'sacó un 🎲 N' | texto, fecha: TIMESTAMP }
 *     Los usos de recurso quedan solo en este dispositivo (elección de diseño: la pantalla del GM
 *     muestra "tiradas" y no hay dónde mostrar un log de recursos; si se quiere compartirlos más
 *     adelante basta con sumar un push a campanas/<campaña>/usos dentro de agregar()).
 *   - El selector de ventaja es un <select id="dice-adv"> real con los valores que ya leen las fichas
 *     ('normal' | 'advantage' | 'disadvantage'), así el código existente que lo consulta sigue andando.
 *
 * API: iniciar, tirar, d20, moneda, mostrar, registrarUso, historial, limpiar, getVentaja, abrir, cerrar.
 * Estilos: sección "lanzador de dados" de ficha-tema.css (solo tokens).
 */
(function () {
  'use strict';

  const ICONOS = { aviso: '🔔', tirada: '🎲', recurso: '🔋', hechizo: '✨', buff: '🔆', concentracion: '🧠', descanso: '🌙', nivel: '⬆️', inventario: '🎒', reputacion: '🏅', hp: '❤️' };
  const GRUPO_RECURSOS = (tipo) => tipo !== 'tirada';

  const estado = {
    personaje: 'personaje', db: null, codigoCampana: null, max: 60, publicarUsos: false,
    items: [], pendientes: [], iniciado: false, tab: 'todo',
    ui: {},
  };

  /* ---------- utilidades ---------- */
  const fmtMod = (n) => (n >= 0 ? '+' : '') + n;
  const rnd = (lados) => 1 + Math.floor(Math.random() * lados);
  function clave() { return 'ficha-dados-' + estado.personaje; }
  function el(tag, cls, texto) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function hora(ts) {
    try { return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }

  /* ---------- persistencia local (por dispositivo) ---------- */
  function cargar() {
    try {
      const raw = localStorage.getItem(clave());
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.slice(-estado.max) : [];
    } catch (e) { return []; }
  }
  function guardar() {
    try { localStorage.setItem(clave(), JSON.stringify(estado.items.slice(-estado.max))); } catch (e) { /* sin almacenamiento */ }
  }

  /* ---------- historial ---------- */
  function agregar(tipo, etiqueta, resultado, detalle) {
    const entrada = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      ts: Date.now(), tipo, grupo: GRUPO_RECURSOS(tipo) ? 'recursos' : 'tiradas',
      etiqueta: String(etiqueta || ''), resultado: resultado === undefined || resultado === null ? '' : String(resultado), detalle: detalle ? String(detalle) : '',
    };
    estado.items.push(entrada);
    if (estado.items.length > estado.max) estado.items = estado.items.slice(-estado.max);
    guardar();
    pintarHistorial();
    avisar(entrada);
    return entrada;
  }

  /* ---------- avisos emergentes (con el panel cerrado, cada tirada o uso se confirma a la vista) ---------- */
  const DURACION_AVISO = { tirada: 5000, otro: 3500 };
  function avisar(it, forzar) {
    if (!estado.iniciado || (abierto() && !forzar)) return;   // con el panel abierto ya se ve en el resultado y el historial
    let zona = document.getElementById('dados-avisos');
    if (!zona) {
      zona = el('div', 'dados-avisos'); zona.id = 'dados-avisos';
      zona.setAttribute('role', 'status'); zona.setAttribute('aria-live', 'polite');
      document.body.appendChild(zona);
    }
    const a = el('button', 'dados-aviso'); a.type = 'button'; a.dataset.tipo = it.tipo; a.dataset.grupo = it.grupo;
    a.setAttribute('aria-label', 'Cerrar aviso: ' + it.etiqueta);
    a.appendChild(el('span', 'dados-aviso-ico', ICONOS[it.tipo] || '•'));
    const cuerpo = el('span', 'dados-aviso-texto');
    cuerpo.appendChild(el('strong', 'dados-aviso-et', it.etiqueta));
    if (it.detalle) cuerpo.appendChild(el('small', 'dados-aviso-det', it.detalle));
    a.appendChild(cuerpo);
    if (it.resultado !== '') a.appendChild(el('span', 'dados-aviso-res', it.resultado));
    const quitar = () => { if (a.parentNode) a.remove(); };
    a.addEventListener('click', quitar);
    zona.appendChild(a);
    while (zona.children.length > 3) zona.firstElementChild.remove();
    setTimeout(quitar, it.grupo === 'tiradas' ? DURACION_AVISO.tirada : DURACION_AVISO.otro);
  }

  function publicarTirada(etiqueta, total) {
    if (!estado.db || !estado.codigoCampana || typeof firebase === 'undefined') return;
    try {
      const p = estado.db.ref(`campanas/${estado.codigoCampana}/tiradas`).push({
        personaje: estado.personaje,
        tipo: etiqueta,
        resultado: (typeof total === 'number') ? `sacó un 🎲 ${total}` : total,
        fecha: firebase.database.ServerValue.TIMESTAMP,
      });
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* el historial local sigue valiendo */ }
  }

  const TIPOS_USO_PUBLICOS = { recurso: 1, hechizo: 1, inventario: 1, descanso: 1 };
  /** Opcional (iniciar({ publicarUsos: true })): los usos de recurso también salen a la pantalla del GM, como hacían las fichas. */
  function publicarUso(tipo, texto) {
    if (!estado.publicarUsos || !TIPOS_USO_PUBLICOS[tipo]) return;
    if (!estado.db || !estado.codigoCampana || typeof firebase === 'undefined') return;
    try {
      const p = estado.db.ref(`campanas/${estado.codigoCampana}/tiradas`).push({
        personaje: estado.personaje, tipo: '🔧 ' + texto, resultado: 'usó', fecha: firebase.database.ServerValue.TIMESTAMP,
      });
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* el historial local sigue valiendo */ }
  }

  /** Aviso emergente que NO se anota en el historial (p. ej. un buff de otro personaje del grupo). */
  function notificar(o) {
    avisar({ tipo: 'aviso', grupo: 'recursos', etiqueta: String(o.etiqueta || ''), resultado: o.resultado || '', detalle: o.detalle || '' }, true);
  }
  /** Avisa al grupo con una NOTIFICACIÓN (viaja por campanas/<c>/tiradas con el tipo "🔔 …"); no modifica ninguna otra ficha. */
  function avisarGrupo(etiqueta, texto) { publicarTirada('🔔 ' + etiqueta, texto || ''); }

  /* ---------- resultado visible ---------- */
  function mostrarResultado(total, etiqueta, detalle) {
    const u = estado.ui;
    if (u.total) {
      u.total.textContent = total;
      u.etiqueta.textContent = etiqueta;
      u.detalle.textContent = detalle || '';
      u.error.hidden = true;
    }
    if (u.badge) { u.badge.textContent = total; u.badge.hidden = false; }
  }

  /** Muestra un resultado ya calculado (reemplazo directo de displayRollResult / FICHA_CONFIG.mostrarTirada). */
  function mostrar(total, etiqueta, detalle) {
    mostrarResultado(total, etiqueta, detalle);
    agregar('tirada', etiqueta, total, detalle);
    publicarTirada(etiqueta, total);
    return { total, etiqueta, detalle };
  }

  /** Anota un uso de recurso sin tirar nada. */
  function registrarUso(texto, tipo, detalle) {
    const t = tipo || 'recurso';
    if (!estado.iniciado) { estado.pendientes.push({ texto, tipo: t, detalle }); return null; }
    publicarUso(t, texto);
    return agregar(t, texto, '', detalle);
  }

  /* ---------- tiradas ---------- */
  function getVentaja() {
    const s = estado.ui.adv || document.getElementById('dice-adv');
    return s ? s.value : 'normal';
  }

  /** Interpreta "2d6+3", "d20-1", "4d6kh3", "1d8+1d4+2". Devuelve { partes, plano } o { error }. */
  function parsear(expr) {
    let s = String(expr || '').replace(/\s+/g, '').toLowerCase();
    if (!s) return { error: 'Escribe una fórmula, por ejemplo 2d6+3.' };
    const partes = []; let plano = 0; let n = 0;
    const re = /^([+-]?)(?:(\d*)d(\d+)(?:(kh|kl)(\d+))?|(\d+))/;
    while (s.length) {
      const m = re.exec(s);
      if (!m) return { error: `No entiendo "${s.slice(0, 12)}". Prueba con 2d6+3 o 4d6kh3.` };
      if (++n > 10) return { error: 'Demasiados términos (máximo 10).' };
      const signo = m[1] === '-' ? -1 : 1;
      if (m[3] !== undefined) {
        const count = m[2] === '' ? 1 : parseInt(m[2], 10), lados = parseInt(m[3], 10);
        if (count < 1 || count > 100) return { error: 'La cantidad de dados va de 1 a 100.' };
        if (lados < 2 || lados > 1000) return { error: 'Los dados tienen entre 2 y 1000 caras.' };
        let keep = null;
        if (m[4]) {
          keep = { modo: m[4], n: parseInt(m[5], 10) };
          if (keep.n < 1 || keep.n > count) return { error: `No se pueden conservar ${keep.n} de ${count} dados.` };
        }
        partes.push({ signo, count, lados, keep });
      } else plano += signo * parseInt(m[6], 10);
      s = s.slice(m[0].length);
      if (s.length && !/^[+-]/.test(s)) return { error: `Falta un + o − antes de "${s.slice(0, 8)}".` };
    }
    return { partes, plano };
  }

  function evaluar(p) {
    let total = p.plano; const trozos = [];
    p.partes.forEach((pt, i) => {
      const rs = Array.from({ length: pt.count }, () => rnd(pt.lados));
      let usados = rs.slice(), texto;
      if (pt.keep) {
        const orden = rs.map((v, idx) => ({ v, idx })).sort((a, b) => pt.keep.modo === 'kh' ? b.v - a.v : a.v - b.v);
        const guardados = new Set(orden.slice(0, pt.keep.n).map(o => o.idx));
        usados = rs.filter((_, idx) => guardados.has(idx));
        texto = rs.map((v, idx) => guardados.has(idx) ? String(v) : `(${v})`).join(', ');
      } else texto = rs.join(', ');
      const suma = usados.reduce((a, b) => a + b, 0) * pt.signo;
      total += suma;
      trozos.push(`${i === 0 && pt.signo > 0 ? '' : (pt.signo > 0 ? '+ ' : '− ')}${pt.count}d${pt.lados}${pt.keep ? pt.keep.modo + pt.keep.n : ''} [${texto}]`);
    });
    if (p.plano) trozos.push(`${p.plano > 0 ? '+' : '−'} ${Math.abs(p.plano)}`);
    return { total, detalle: trozos.join(' ') };
  }

  /** Evalúa una fórmula SIN mostrarla ni anotarla (para sumar partes de una tirada propia). Devuelve { total, detalle } o { error }. */
  function calcular(expr) {
    let texto = expr;
    if (expr && typeof expr === 'object') texto = `${expr.count || 1}d${expr.sides}${expr.mod ? (expr.mod > 0 ? '+' : '') + expr.mod : ''}`;
    const p = parsear(texto);
    return p.error ? { error: p.error } : evaluar(p);
  }

  /** Tira una fórmula o { count, sides, mod }. Devuelve { total, detalle } o { error }. */
  function tirar(expr, etiqueta) {
    let texto = expr;
    if (expr && typeof expr === 'object') texto = `${expr.count || 1}d${expr.sides}${expr.mod ? (expr.mod > 0 ? '+' : '') + expr.mod : ''}`;
    const p = parsear(texto);
    if (p.error) {
      if (estado.ui.error) { estado.ui.error.textContent = p.error; estado.ui.error.hidden = false; }
      return { error: p.error };
    }
    const r = evaluar(p);
    const et = etiqueta || String(texto);
    mostrar(r.total, et, r.detalle);
    return r;
  }

  /** Moneda del Destino (d2): muestra Cara o Cruz en lugar de 1 o 2. */
  function moneda() {
    const r = rnd(2);
    return mostrar('🪙 ' + (r === 1 ? 'Cara' : 'Cruz'), 'Moneda del Destino', '[' + r + ']');
  }

  const ALIAS_CATEGORIA = { salvacion: 'salvaciones', prueba: 'pruebas' };
  /** Tirada de d20 con ventaja/desventaja, bono fijo y dados extra de buffs activos. */
  function d20(opts) {
    const o = opts || {};
    const mod = Number(o.mod) || 0;
    const etiqueta = o.etiqueta || 'd20';
    let adv = o.ventaja || getVentaja();
    const cat0 = ALIAS_CATEGORIA[o.categoria] || o.categoria;
    // Ventaja/desventaja forzada por el personaje: el gancho propio de la ficha manda; si no hay, rigen los estados
    // activos según ficha-reglas.js (condiciones y agotamiento del SRD).
    let forzada = null, autoFalla = false;
    if (typeof FICHA_CONFIG !== 'undefined' && FICHA_CONFIG.ventajaForzada) forzada = FICHA_CONFIG.ventajaForzada(etiqueta, cat0);
    else if (window.FichaReglas && !o.sinReglas && cat0) {
      let hab = o.habilidad;
      if (!hab && cat0 === 'salvaciones') { const m = /\b(STR|DEX|CON|INT|WIS|CHA|FUE|DES|SAB|CAR)\b/i.exec(etiqueta); hab = m && m[1]; }
      const v = FichaReglas.ventaja({ categoria: cat0, habilidad: hab });
      forzada = v.estado; autoFalla = v.autoFalla;
    }
    // Ventaja/desventaja que dan los buffs personalizados encendidos (se combinan con las anteriores).
    if (window.FichaBuffs && FichaBuffs.ventaja && cat0 && !o.sinReglas) {
      const vb = FichaBuffs.ventaja(cat0);
      if (vb !== 'normal') forzada = (!forzada || forzada === 'normal') ? vb : (forzada === vb ? vb : 'normal');
    }
    let nota = '';
    if (forzada && forzada !== 'normal') {
      if (adv === 'normal' || adv === forzada) { adv = forzada; nota = forzada === 'disadvantage' ? ' 🛑 (desventaja por condición)' : ' (ventaja por condición)'; }
      else { adv = 'normal'; nota = ' (ventaja y desventaja se cancelan)'; }
    }
    if (autoFalla) nota += ' ⚠️ (la condición la hace fallar automáticamente)';
    const r1 = rnd(20), r2 = rnd(20);
    const elegido = adv === 'advantage' ? Math.max(r1, r2) : adv === 'disadvantage' ? Math.min(r1, r2) : r1;
    const base = adv === 'advantage' ? `d20: ${elegido} (ventaja: ${r1}, ${r2})` : adv === 'disadvantage' ? `d20: ${elegido} (desventaja: ${r1}, ${r2})` : `d20: ${elegido}`;
    const partes = [base];
    if (mod) partes.push(`mod ${fmtMod(mod)}`);
    let total = elegido + mod;
    const cat = cat0;
    if (cat && typeof FichaBuffs !== 'undefined' && FichaBuffs.tirarDados) {
      const extra = FichaBuffs.tirarDados(cat);
      extra.partes.forEach(pt => { total += pt.valor; partes.push(pt.texto); });
    }
    // Bless / Bane: casillas manuales `#buff-bless` y `#debuff-bane` de la ficha (solo ataques y salvaciones).
    const extras = (o.extras || []).slice();
    if (!o.sinBlessBane && (cat0 === 'ataque' || cat0 === 'salvaciones')) {
      const on = (id) => { const c = document.getElementById(id); return !!(c && c.checked); };
      if (on('buff-bless')) extras.push({ nombre: 'Bless', dado: { count: 1, sides: 4 }, signo: 1 });
      if (on('debuff-bane')) extras.push({ nombre: 'Bane', dado: { count: 1, sides: 4 }, signo: -1 });
    }
    // Dados extra propios de la ficha (p. ej. Bless +1d4, Bane −1d4): extras = [{ nombre, dado:{count,sides}, signo:1|-1 }]
    extras.forEach(x => {
      const p = parsear(`${x.dado.count || 1}d${x.dado.sides}`);
      if (p.error) return;
      const r = evaluar(p), signo = x.signo === -1 ? -1 : 1;
      total += signo * r.total;
      partes.push(`${x.nombre}: ${signo < 0 ? '−' : '+'}${r.total} (${x.dado.count || 1}d${x.dado.sides})`);
    });
    if (cat0 === 'ataque') { if (elegido === 20) partes.push('¡CRÍTICO!'); else if (elegido === 1) partes.push('Pifia (1 natural)'); }
    (o.notas || []).forEach(n => partes.push(n));
    // Gancho propio del personaje: FICHA_CONFIG.notasD20({ categoria, etiqueta }) → [texto, …] (p. ej. un aura activa).
    if (typeof FICHA_CONFIG !== 'undefined' && FICHA_CONFIG.notasD20) { try { (FICHA_CONFIG.notasD20({ categoria: cat0, etiqueta }) || []).forEach(n => partes.push(n)); } catch (e) { /* sin notas */ } }
    // CD opcional (p. ej. el save de concentración): anota éxito o fallo.
    let exito;
    if (o.cd != null) { exito = !autoFalla && total >= o.cd; partes.push(`CD ${o.cd}: ${exito ? '✅ éxito' : '❌ fallo'}`); }
    mostrar(total, etiqueta + nota, partes.join(' | '));
    return { total, d20: elegido, adv, detalle: partes.join(' | '), exito };
  }

  /* ---------- interfaz ---------- */
  function pintarHistorial() {
    const u = estado.ui;
    if (!u.lista) return;
    const filtro = estado.tab;
    const vistos = estado.items.filter(it => filtro === 'todo' || it.grupo === filtro).slice().reverse();
    u.lista.textContent = '';
    if (!vistos.length) {
      u.lista.appendChild(el('li', 'dados-vacio', filtro === 'recursos' ? 'Todavía no se usó ningún recurso.' : filtro === 'tiradas' ? 'Todavía no hay tiradas.' : 'El historial está vacío.'));
    }
    vistos.forEach(it => {
      const li = el('li', 'dados-item');
      li.dataset.grupo = it.grupo; li.dataset.tipo = it.tipo;
      li.appendChild(el('span', 'dados-hora', hora(it.ts)));
      li.appendChild(el('span', 'dados-ico', ICONOS[it.tipo] || '•'));
      const cuerpo = el('span', 'dados-texto');
      cuerpo.appendChild(el('strong', 'dados-et', it.etiqueta));
      if (it.resultado !== '') cuerpo.appendChild(el('span', 'dados-res', it.resultado));
      if (it.detalle) cuerpo.appendChild(el('small', 'dados-det', it.detalle));
      li.appendChild(cuerpo);
      u.lista.appendChild(li);
    });
    const nT = estado.items.filter(i => i.grupo === 'tiradas').length, nR = estado.items.length - nT;
    if (u.tabs) {
      u.tabs.todo.textContent = `Todo (${estado.items.length})`;
      u.tabs.tiradas.textContent = `Tiradas (${nT})`;
      u.tabs.recursos.textContent = `Recursos (${nR})`;
    }
  }

  function elegirTab(nombre) {
    estado.tab = nombre;
    Object.keys(estado.ui.tabs).forEach(k => estado.ui.tabs[k].setAttribute('aria-selected', String(k === nombre)));
    pintarHistorial();
  }

  function abierto() { return estado.ui.raiz && estado.ui.raiz.dataset.abierto === 'true'; }
  function abrir() {
    const u = estado.ui; if (!u.raiz) return;
    u.raiz.dataset.abierto = 'true'; u.panel.hidden = false;
    u.fab.setAttribute('aria-expanded', 'true');
    setTimeout(() => { try { u.formula.focus(); } catch (e) { /* noop */ } }, 0);
  }
  function cerrar() {
    const u = estado.ui; if (!u.raiz) return;
    const estabaAbierto = abierto();
    u.raiz.dataset.abierto = 'false'; u.panel.hidden = true;
    u.fab.setAttribute('aria-expanded', 'false');
    if (estabaAbierto) { try { u.fab.focus(); } catch (e) { /* noop */ } }
  }

  function construir() {
    const u = estado.ui;
    const raiz = el('div', 'dados'); raiz.id = 'dados-raiz'; raiz.dataset.abierto = 'false';

    const fab = el('button', 'dados-fab'); fab.type = 'button';
    fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'dados-panel'); fab.setAttribute('aria-label', 'Abrir lanzador de dados e historial');
    fab.appendChild(el('span', 'dados-fab-ico', '🎲'));
    const badge = el('span', 'dados-fab-badge'); badge.hidden = true; badge.setAttribute('aria-hidden', 'true');
    fab.appendChild(badge);
    fab.addEventListener('click', () => (abierto() ? cerrar() : abrir()));

    // Ficha de ventaja siempre a la vista: un toque pasa Normal → Ventaja → Desventaja (el <select> del panel es la fuente de verdad).
    const chip = el('button', 'dados-adv'); chip.type = 'button'; chip.id = 'dados-adv-chip';
    chip.setAttribute('aria-label', 'Tipo de la próxima tirada: toca para cambiar');

    const panel = el('section', 'dados-panel'); panel.id = 'dados-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Lanzador de dados e historial');

    const cab = el('div', 'dados-cab');
    cab.appendChild(el('h3', null, '🎲 Dados'));
    const x = el('button', 'dados-cerrar', '✖'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar lanzador de dados');
    x.addEventListener('click', cerrar); cab.appendChild(x);

    const cuerpo = el('div', 'dados-cuerpo');

    const res = el('div', 'dados-resultado'); res.setAttribute('role', 'status'); res.setAttribute('aria-live', 'polite');
    const total = el('div', 'dados-total', '—'), etiqueta = el('div', 'dados-etiqueta', 'Todavía no tiraste nada'), detalle = el('div', 'dados-detalle');
    res.append(total, etiqueta, detalle);
    const error = el('div', 'dados-error'); error.setAttribute('role', 'alert'); error.hidden = true;

    const filaAdv = el('div', 'dados-fila');
    const lblAdv = el('label', null, 'Tipo de tirada'); lblAdv.htmlFor = 'dice-adv';
    const adv = document.createElement('select'); adv.id = 'dice-adv';
    [['normal', 'Normal'], ['advantage', 'Ventaja'], ['disadvantage', 'Desventaja']].forEach(([v, t]) => { const o = el('option', null, t); o.value = v; adv.appendChild(o); });
    filaAdv.append(lblAdv, adv);

    const rapidos = el('div', 'dados-rapidos'); rapidos.setAttribute('role', 'group'); rapidos.setAttribute('aria-label', 'Dados rápidos');
    const filaMod = el('div', 'dados-fila');
    const lblMod = el('label', null, 'Modificador'); lblMod.htmlFor = 'dados-mod';
    const mod = document.createElement('input'); mod.type = 'number'; mod.id = 'dados-mod'; mod.value = '0'; mod.inputMode = 'numeric';
    filaMod.append(lblMod, mod);
    [4, 6, 8, 10, 12, 20, 100].forEach(l => {
      const b = el('button', 'dados-rapido', 'd' + l); b.type = 'button'; b.setAttribute('aria-label', 'Tirar d' + l);
      b.addEventListener('click', () => {
        const m = parseInt(mod.value, 10) || 0;
        if (l === 20) d20({ mod: m, etiqueta: 'd20' });
        else tirar({ count: 1, sides: l, mod: m }, '1d' + l + (m ? fmtMod(m) : ''));
      });
      rapidos.appendChild(b);
    });
    const bm = el('button', 'dados-rapido', '🪙'); bm.type = 'button'; bm.setAttribute('aria-label', 'Tirar la Moneda del Destino');
    bm.addEventListener('click', moneda); rapidos.appendChild(bm);

    const form = document.createElement('form'); form.className = 'dados-formula'; form.noValidate = true;
    const lblF = el('label', 'solo-lector', 'Fórmula de dados'); lblF.htmlFor = 'dados-formula';
    const inp = document.createElement('input'); inp.type = 'text'; inp.id = 'dados-formula'; inp.placeholder = '2d6+3 · 4d6kh3'; inp.autocomplete = 'off'; inp.spellcheck = false;
    const go = el('button', 'dados-tirar', 'Tirar'); go.type = 'submit';
    form.append(lblF, inp, go);
    form.addEventListener('submit', (e) => { e.preventDefault(); const r = tirar(inp.value, inp.value.trim()); if (!r.error) { inp.select(); } });

    const tabs = el('div', 'dados-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Filtrar el historial');
    const tb = {};
    [['todo', 'Todo'], ['tiradas', 'Tiradas'], ['recursos', 'Recursos']].forEach(([k, t]) => {
      const b = el('button', 'dados-tab', t); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(k === estado.tab));
      b.addEventListener('click', () => elegirTab(k)); tb[k] = b; tabs.appendChild(b);
    });
    const lista = el('ol', 'dados-historial'); lista.setAttribute('aria-label', 'Historial de tiradas y usos de recursos');
    const pie = el('div', 'dados-pie');
    const limpiar = el('button', 'btn btn-fantasma btn-sm dados-limpiar', '🗑️ Limpiar historial'); limpiar.type = 'button';
    limpiar.addEventListener('click', () => { if (confirm('¿Borrar todo el historial de este dispositivo?')) FichaDados.limpiar(); });
    pie.appendChild(limpiar);

    cuerpo.append(res, error, filaAdv, rapidos, filaMod, form, tabs, lista, pie);
    panel.append(cab, cuerpo);
    raiz.append(chip, fab, panel);
    document.body.appendChild(raiz);

    const ROT = { normal: ['🎯 Normal', 'advantage'], advantage: ['🟢 Ventaja', 'disadvantage'], disadvantage: ['🔴 Desventaja', 'normal'] };
    function pintarChip() { const v = adv.value in ROT ? adv.value : 'normal'; chip.textContent = ROT[v][0]; chip.dataset.valor = v; }
    chip.addEventListener('click', () => { adv.value = ROT[adv.value in ROT ? adv.value : 'normal'][1]; adv.dispatchEvent(new Event('change', { bubbles: true })); });
    adv.addEventListener('change', pintarChip);
    pintarChip();
    if (estado.sinVentaja) { chip.style.display = 'none'; filaAdv.style.display = 'none'; }

    Object.assign(u, { raiz, fab, badge, panel, total, etiqueta, detalle, error, adv, formula: inp, lista, tabs: tb });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierto()) { e.preventDefault(); cerrar(); } });
  }

  function iniciar(opts) {
    const o = opts || {};
    estado.personaje = o.personaje || estado.personaje;
    estado.db = o.db || null;
    estado.codigoCampana = o.codigoCampana || null;
    estado.max = o.maxHistorial || 60;
    estado.publicarUsos = !!o.publicarUsos;
    estado.sinVentaja = !!o.sinVentaja;   // sistemas sin ventaja/desventaja (Call of Cthulhu): se ocultan el chip y el selector
    if (estado.iniciado) return FichaDados;
    estado.items = cargar();
    construir();
    estado.iniciado = true;
    const ultimaTirada = estado.items.slice().reverse().find(i => i.grupo === 'tiradas');
    if (ultimaTirada) mostrarResultado(ultimaTirada.resultado, ultimaTirada.etiqueta, ultimaTirada.detalle);
    estado.pendientes.splice(0).forEach(p => agregar(p.tipo, p.texto, '', p.detalle));
    pintarHistorial();
    return FichaDados;
  }

  function historial() { return estado.items.slice(); }
  function limpiar() {
    estado.items = []; guardar(); pintarHistorial();
    const u = estado.ui;
    if (u.total) { u.total.textContent = '—'; u.etiqueta.textContent = 'Todavía no tiraste nada'; u.detalle.textContent = ''; }
    if (u.badge) u.badge.hidden = true;
  }

  // El motor (ficha-common.js) y otros módulos avisan usos de recurso con este evento. Se escucha desde la
  // carga del script para no perder los que ocurran antes de iniciar().
  document.addEventListener('ficha:uso', (e) => {
    const d = (e && e.detail) || {};
    if (d.texto) registrarUso(d.texto, d.tipo, d.detalle);
  });

  window.FichaDados = { iniciar, tirar, calcular, notificar, avisarGrupo, d20, moneda, mostrar, registrarUso, historial, limpiar, getVentaja, abrir, cerrar, _parsear: parsear };
})();

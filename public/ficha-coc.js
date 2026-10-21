/*
 * ficha-coc.js — motor de la ficha de Call of Cthulhu (7.ª edición).
 *
 * Se apoya en ficha-coc-reglas.js (reglas puras), ficha-common.js (autoguardado, listas editables, bitácora, compartir, modo lectura) y
 * ficha-dados.js (historial y publicación de tiradas al GM). Lo arranca ficha-coc-shell.js con la sesión iniciada:
 *
 *   FichaCoC.iniciar({ P, db, charRef, codigoCampana, uid, user, toast })
 *
 * Qué hace: derivados (mitades y quintos, bono de daño y corpulencia, MOV sugerido), tiradas d100 con dados de bonificación/penalización y
 * dificultad, gasto de Suerte, daño y heridas, chequeos de Cordura (con locura temporal e indefinida), descanso, fase de desarrollo y listas
 * editables: habilidades (datos/habilidades-json), armas (datos/armas-json) y capacidades (datos/capacidades-json: hechizos, dones, habilidades
 * especiales con costo en PM/Cordura/PV). Todo es dato: nada de lo propio de un investigador necesita código.
 */
(function (global) {
  'use strict';

  const R = global.FichaCoCReglas;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const entero = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
  const num = (id, d) => entero(($(id) || {}).value, d === undefined ? 0 : d);
  const acotar = (n, a, b) => Math.max(a, Math.min(b, n));
  const slug = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'x';
  const soloLectura = () => !!document.querySelector('.readonly-mode');
  const CARAC_IDS = ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu'];
  const SIN_MEJORA = ['cthulhu_mythos', 'credit_rating'];   // no se mejoran con la fase de desarrollo

  let ctx = null, P = null;
  let habEd = null, armasEd = null, capEd = null;
  let ultima = null;   // última tirada (para gastar Suerte)

  const aviso = (t) => { if (ctx && ctx.toast) ctx.toast(t); };
  function setVal(id, v) {
    const e = $(id); if (!e) return;
    e.value = String(v);
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function caracteristicas() { const c = {}; CARAC_IDS.forEach((k) => { c[k] = num(k, 0); }); return c; }
  const uso = (tipo, texto, detalle) => { if (global.FichaDados) FichaDados.registrarUso(texto, tipo, detalle); };

  /* ============================================================
   *  Derivados y barra fija
   * ============================================================ */
  function bono() { return R.bonoDanoDe(num('str'), num('siz')); }
  function pintarDerivados() {
    CARAC_IDS.forEach((k) => { const e = $(k + '-calc'); if (e) e.textContent = `${R.mitad(num(k))} / ${R.quinto(num(k))}`; });
    const l = $('luck-calc'); if (l) l.textContent = `${R.mitad(num('luck-curr'))} / ${R.quinto(num('luck-curr'))}`;
    const bd = bono();
    if ($('db-val')) $('db-val').textContent = bd.dado;
    if ($('build-val')) $('build-val').textContent = 'Corpulencia: ' + bd.corpulencia;
    const d = R.derivadas(caracteristicas(), { edad: entero(($('info-edad') || {}).value, 0), mitos: habValor('cthulhu_mythos') });
    const sug = (id, txt) => { const e = $(id); if (e) e.textContent = txt; };
    sug('hp-sugerido', `Sugerido (CON+SIZ): ${d.pvMax}`); sug('mp-sugerido', `Sugerido (POW÷5): ${d.pmMax}`);
    sug('san-sugerido', `Inicial = POW: ${d.sanInicial} · máx. 99 − Mitos: ${d.sanMax}`);
    sug('mov-sugerido', `MOV sugerido: ${d.mov}`);
    [['hp', 'hp'], ['mp', 'mp'], ['san', 'san'], ['luck', 'luck']].forEach(([id]) => {
      const cur = num(id + '-curr'), max = Math.max(1, num(id + '-max', 1)), b = $(id + '-barra');
      if (b && b.firstElementChild) { const p = acotar(Math.round(cur / max * 100), 0, 100); b.firstElementChild.style.width = p + '%'; b.setAttribute('aria-valuenow', String(p)); b.classList.toggle('bien', p > 50); b.classList.toggle('mal', p <= 25); }
    });
    const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
    set('scb-hp', `${num('hp-curr')}/${num('hp-max')}`); set('scb-san', `${num('san-curr')}/${num('san-max')}`); set('scb-luck', String(num('luck-curr'))); set('scb-mp', `${num('mp-curr')}/${num('mp-max')}`);
    set('san-hoy', String(num('san-perdida-hoy')));
    const info = $('san-info'); if (info) { const base = num('san-inicio-dia') || num('san-curr'); info.textContent = `Locura indefinida si hoy se pierde ${Math.max(1, Math.floor(base / 5))} o más.`; }
  }

  /* ============================================================
   *  Tiradas
   * ============================================================ */
  function ajustes() { return { bonus: entero(($('dados-bonus') || {}).value, 0), dificultad: ($('dados-dificultad') || {}).value || 'regular' }; }
  const DIF = { regular: 'Regular', dificil: 'Difícil', extremo: 'Extrema' };
  const detalleDados = (r) => `d100: unidades ${r.unidades}, decenas ${r.decenas.join('/')}${r.bonus ? ` (${r.bonus > 0 ? 'bonificación' : 'penalización'} ×${Math.abs(r.bonus)}: ${r.candidatos.join(' / ')})` : ''}`;
  function pintarResultado(etiqueta, r, extra) {
    const c = $('coc-resultado'); if (!c) return;
    const meta = r.dificultad !== 'regular' ? ` · pedida: ${DIF[r.dificultad]} — ${r.cumple ? 'cumple' : 'no cumple'}` : '';
    let suerte = '';
    if (!extra.sinSuerte && !r.cumple && r.nivel !== 'pifia' && r.tirada !== 100) {
      const coste = R.suerteParaExito(r.tirada, r.objetivo, r.dificultad);
      if (coste > 0 && coste <= num('luck-curr')) suerte = `<button type="button" class="btn btn-fantasma btn-sm" data-coc-suerte="${coste}">🍀 Gastar ${coste} de Suerte para tener éxito</button>`;
      else if (coste > 0) suerte = `<small class="texto-suave">Te faltan ${coste - num('luck-curr')} puntos de Suerte para convertirlo en éxito.</small>`;
    }
    c.hidden = false; c.dataset.nivel = r.nivel;
    c.innerHTML = `<div class="coc-res-cab"><strong>${esc(etiqueta)}</strong> <span class="texto-suave">(${r.objetivo} % · ${DIF[r.dificultad]})</span></div>
      <div class="coc-res-fila"><span class="coc-res-num">🎲 ${r.tirada}</span><span class="coc-res-nivel ${r.css}">${esc(r.texto)}${esc(meta)}</span></div>
      ${extra.dano ? `<div class="coc-res-dano">💥 Daño: <strong>${extra.dano.total}</strong> <small>(${esc(extra.dano.detalle)})</small>${extra.dano.empala ? ' · <strong>empala</strong>' : ''}</div>` : ''}
      <small class="texto-suave">${esc(detalleDados(r))}</small>${extra.nota ? `<small class="texto-suave">${esc(extra.nota)}</small>` : ''}${suerte}`;
  }
  // Tirada contra un objetivo en %; devuelve el resultado y lo anota en el historial (y en la pantalla del GM).
  function tirarContra(etiqueta, objetivo, o) {
    o = o || {};
    const a = ajustes();
    const r = R.tirarHabilidad(objetivo, { bonus: a.bonus, dificultad: o.sinDificultad ? 'regular' : a.dificultad });
    let dano = null;
    if (o.arma && r.nivel !== 'fallo' && r.nivel !== 'pifia') dano = R.danoDeArma(o.arma, { nivel: r.nivel, bonoDano: bono().dado });
    ultima = { etiqueta, r, sinSuerte: !!o.sinSuerte };
    pintarResultado(etiqueta, r, { dano, sinSuerte: o.sinSuerte, nota: o.nota });
    if (global.FichaDados) FichaDados.mostrar(r.tirada, `${etiqueta} [${r.texto}]`, `${r.objetivo} %${dano ? ' | 💥 ' + dano.total + ' (' + dano.detalle + ')' : ''}`);
    return Object.assign({}, r, { dano });
  }
  function gastarSuerte(coste) {
    if (soloLectura() || !ultima) return;
    const l = num('luck-curr');
    if (coste > l) return;
    setVal('luck-curr', l - coste);
    const c = $('coc-resultado');
    if (c) c.innerHTML += `<div class="coc-res-dano">🍀 Gastaste ${coste} de Suerte: la tirada cuenta como éxito (${esc(DIF[ultima.r.dificultad])}).</div>`;
    c && c.querySelectorAll('[data-coc-suerte]').forEach((b) => b.remove());
    uso('recurso', `Gastó ${coste} de Suerte en ${ultima.etiqueta}`, `Suerte ${l} → ${l - coste}`);
    ultima = null;
  }

  /* ============================================================
   *  Daño, curación, Cordura, descanso
   * ============================================================ */
  function marcarEstado(k, v) { const e = $('st-' + k); if (e && e.checked !== !!v) { e.checked = !!v; e.dispatchEvent(new Event('change', { bubbles: true })); } }
  function recibirDano() {
    if (soloLectura()) return;
    const dano = num('dados-dano'); if (dano <= 0) return;
    const e = R.evaluarDano({ dano, pv: num('hp-curr'), pvMax: num('hp-max'), heridaGrave: ($('st-herida-grave') || {}).checked });
    setVal('hp-curr', e.nuevoPv);
    marcarEstado('herida-grave', e.heridaGrave); marcarEstado('inconsciente', e.inconsciente); marcarEstado('moribundo', e.moribundo);
    $('dados-dano').value = '';
    uso('hp', `Recibió ${dano} de daño`, `PV → ${e.nuevoPv}/${num('hp-max')}`);
    e.avisos.forEach((t) => aviso('⚠️ ' + t));
    const c = $('coc-resultado'); if (c) { c.hidden = false; c.dataset.nivel = 'dano'; c.innerHTML = `<div class="coc-res-cab"><strong>💥 ${dano} de daño</strong> → ${e.nuevoPv}/${num('hp-max')} PV</div>${e.avisos.map((t) => `<div class="coc-res-dano">⚠️ ${esc(t)}</div>`).join('')}`; }
  }
  function curar() {
    if (soloLectura()) return;
    const n = num('dados-dano'); if (n <= 0) return;
    const nuevo = Math.min(num('hp-max'), num('hp-curr') + n);
    setVal('hp-curr', nuevo);
    if (nuevo > 0) { marcarEstado('inconsciente', false); marcarEstado('moribundo', false); }
    $('dados-dano').value = '';
    uso('hp', `Curó ${n} PV`, `PV → ${nuevo}/${num('hp-max')}`);
  }
  function chequeoDeCordura() {
    if (soloLectura()) return;
    if (!num('san-inicio-dia')) setVal('san-inicio-dia', num('san-curr'));
    const r = R.chequeoDeCordura({ san: num('san-curr'), perdida: ($('dados-san-perdida') || {}).value, perdidaHoy: num('san-perdida-hoy'), sanInicioDia: num('san-inicio-dia') });
    setVal('san-curr', r.nuevaSan); setVal('san-perdida-hoy', r.perdidaHoy);
    if (r.nuevaSan === 0) marcarEstado('locura-indefinida', true);
    const c = $('coc-resultado');
    if (c) { c.hidden = false; c.dataset.nivel = r.nivel; c.innerHTML = `<div class="coc-res-cab"><strong>🧠 Chequeo de Cordura</strong> <span class="texto-suave">(${r.nuevaSan + r.perdida} %)</span></div>
      <div class="coc-res-fila"><span class="coc-res-num">🎲 ${r.tirada}</span><span class="coc-res-nivel ${r.css}">${esc(r.texto)}</span></div>
      <div class="coc-res-dano">🧠 Pierdes <strong>${r.perdida}</strong> de Cordura (${esc(r.formula)}${r.detalle ? ' · ' + esc(r.detalle) : ''}) → ${r.nuevaSan}</div>${r.avisos.map((t) => `<div class="coc-res-dano">⚠️ ${esc(t)}</div>`).join('')}`; }
    if (global.FichaDados) FichaDados.mostrar(r.tirada, `Chequeo de Cordura [${r.texto}]`, `−${r.perdida} Cordura → ${r.nuevaSan}`);
    r.avisos.forEach((t) => aviso('⚠️ ' + t));
  }
  function cantidadDescanso(regla, actual, max) {
    if (regla === 'ninguno' || regla == null) return actual;
    if (regla === 'max') return max;
    const n = entero(regla, null);
    return n == null ? actual : Math.min(max, actual + n);
  }
  function descanso() {
    if (soloLectura()) return;
    const d = (P && P.descanso) || { pv: 'max', pm: 'max', san: 'ninguno' };
    setVal('hp-curr', cantidadDescanso(d.pv, num('hp-curr'), num('hp-max')));
    setVal('mp-curr', cantidadDescanso(d.pm, num('mp-curr'), num('mp-max')));
    setVal('san-curr', cantidadDescanso(d.san, num('san-curr'), num('san-max')));
    setVal('san-inicio-dia', num('san-curr')); setVal('san-perdida-hoy', 0);
    if (num('hp-curr') > 0) { marcarEstado('inconsciente', false); }
    uso('descanso', 'Descanso', `PV ${num('hp-curr')}/${num('hp-max')} · PM ${num('mp-curr')}/${num('mp-max')} · Cordura ${num('san-curr')}/${num('san-max')}`);
    aviso('🌙 Descanso hecho.');
  }
  function cambiarDelta(id, delta) {
    if (soloLectura()) return;
    const base = id.replace('-curr', ''), max = $(base + '-max') ? Math.min(99, num(base + '-max')) : 99;
    const antes = num(id), nuevo = acotar(antes + delta, 0, max);
    if (nuevo === antes) return;
    setVal(id, nuevo);
    if (base === 'hp' && nuevo === 0) aviso('A 0 PV: inconsciente o moribundo.');
  }

  /* ============================================================
   *  Habilidades
   * ============================================================ */
  function normHab(h) {
    if (!h || !String(h.nombre || '').trim()) return null;
    const o = { id: String(h.id || slug(h.nombre)).slice(0, 40), nombre: String(h.nombre).trim().slice(0, 60), val: acotar(entero(h.val, 0), 0, 99) };
    if (h.en) o.en = String(h.en).slice(0, 60);
    if (h.marca) o.marca = true;
    if (h.ocup) o.ocup = true;
    return o;
  }
  const habs = () => (habEd ? habEd.items() : []);
  function habValor(id) { const h = habs().find((x) => x.id === id || slug(x.nombre) === id); return h ? entero(h.val, 0) : 0; }
  function habPorRef(ref) { return habs().find((x) => x.id === ref) || habs().find((x) => slug(x.nombre) === slug(ref)) || null; }
  function filaHab(h, idx) {
    const v = entero(h.val, 0), sinMarca = SIN_MEJORA.indexOf(h.id) >= 0;
    return `<div class="coc-hab${h.ocup ? ' ocup' : ''}" data-idx="${idx}" data-nombre="${esc((h.nombre + ' ' + (h.en || '')).toLowerCase())}" data-val="${v}" data-marca="${h.marca ? 1 : 0}">
      <button type="button" class="btn-roll" data-coc-tirar="hab" data-idx="${idx}" aria-label="Tirar ${esc(h.nombre)}">🎲</button>
      <span class="coc-hab-nombre">${esc(h.nombre)}${h.en ? ` <small>(${esc(h.en)})</small>` : ''}</span>
      <label class="coc-marca" title="${sinMarca ? 'No se mejora con la fase de desarrollo' : 'Marca: tuviste un éxito con esta habilidad'}"><input type="checkbox" data-coc-marca="${idx}"${h.marca ? ' checked' : ''}${sinMarca ? ' disabled' : ''}><span aria-hidden="true">✓</span><span class="solo-lector">Marcar para mejorar ${esc(h.nombre)}</span></label>
      <input type="number" class="coc-hab-val" data-coc-val="${idx}" value="${v}" min="0" max="99" aria-label="Valor de ${esc(h.nombre)}">
      <span class="coc-hab-calc">(${R.mitad(v)}/${R.quinto(v)})</span>
      <span class="coc-hab-acc"><button type="button" data-coc-editar-hab="${idx}" aria-label="Editar ${esc(h.nombre)}">✏️</button><button type="button" data-coc-quitar-hab="${idx}" aria-label="Quitar ${esc(h.nombre)}">🗑️</button></span></div>`;
  }
  function aplicarFiltroHab() {
    const q = String((($('dados-buscar-hab') || {}).value || '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const f = ($('dados-filtro-hab') || {}).value || 'todas';
    document.querySelectorAll('#habilidades-lista .coc-hab').forEach((el) => {
      const nom = (el.dataset.nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
      const ok = (!q || nom.indexOf(q) >= 0) && (f === 'todas' || (f === 'marcadas' && el.dataset.marca === '1') || (f === 'altas' && parseInt(el.dataset.val, 10) >= 50));
      el.hidden = !ok;
    });
  }
  function formularioHab(h) {
    const base = ((typeof COC_HABILIDADES !== 'undefined' ? COC_HABILIDADES : []) || []).map((x) => `<option value="${esc(x.id)}">${esc(x.es)} (${esc(x.en)}) — base ${typeof x.base === 'number' ? x.base : x.base}</option>`).join('');
    return `<div class="bp-form">
      ${h ? '' : `<label class="bp-campo bp-ancho"><span>Elegir del manual</span><select id="hf-base"><option value="">— o escribe una propia abajo —</option>${base}</select></label>`}
      <div class="bp-grid"><label class="bp-campo"><span>Nombre</span><input type="text" id="hf-nombre" maxlength="60" value="${esc(h ? h.nombre : '')}" placeholder="p. ej. Ciencia (Biología)"></label>
      <label class="bp-campo"><span>Valor (%)</span><input type="number" id="hf-val" min="0" max="99" value="${esc(h ? h.val : 1)}"></label></div>
      <label class="bp-check"><input type="checkbox" id="hf-ocup"${h && h.ocup ? ' checked' : ''}> Habilidad de ocupación</label>
      <div class="bp-acciones"><button type="button" onclick="FichaCoC.habilidades.cerrarFormulario()">Cancelar</button><button type="button" class="bp-guardar" onclick="FichaCoC.guardarHab()">💾 Guardar</button></div></div>`;
  }
  function guardarHab() {
    const idx = habEd.editandoIdx(), previo = idx !== null ? habEd.items()[idx] : null;
    const baseId = ($('hf-base') || {}).value, def = ((typeof COC_HABILIDADES !== 'undefined' ? COC_HABILIDADES : []) || []).find((x) => x.id === baseId);
    const nombre = (($('hf-nombre') || {}).value || '').trim();
    if (!nombre) { alert('La habilidad necesita un nombre.'); return; }
    const h = normHab({ id: previo ? previo.id : (def ? (def.esp ? def.id + '_' + slug(nombre) : def.id) : slug(nombre) + '_' + Math.random().toString(36).slice(2, 5)), nombre, en: previo ? previo.en : (def && !def.esp ? def.en : ''), val: $('hf-val').value, ocup: $('hf-ocup').checked, marca: previo && previo.marca });
    habEd.guardarDesdeFormulario(h);
  }
  function desarrollo() {
    if (soloLectura()) return;
    const lista = habEd.items(), out = [];
    let extraSan = 0;
    lista.forEach((h) => {
      if (!h.marca) return;
      const m = R.mejoraHabilidad(h.val);
      out.push(`${h.nombre}: ${m.tirada} ${m.mejoro ? `(> ${h.val}) → +${m.mejora} = ${m.nuevo}` : `(no supera ${h.val}) → sin cambios`}`);
      if (m.mejoro) { h.val = m.nuevo; if (m.ganaCordura) extraSan += R.tirarFormula('2d6').total; }
      delete h.marca;
    });
    const c = $('coc-desarrollo');
    if (!out.length) { if (c) { c.hidden = false; c.textContent = 'No hay habilidades marcadas con ✓.'; } return; }
    if (extraSan) { setVal('san-curr', Math.min(num('san-max'), num('san-curr') + extraSan)); out.push(`🧠 Superar 90 % en una habilidad da +${extraSan} de Cordura`); }
    habEd.mutar(0, () => {});   // guarda y vuelve a dibujar
    if (c) { c.hidden = false; c.innerHTML = '<strong>📈 Fase de desarrollo</strong><br>' + out.map(esc).join('<br>'); }
    uso('nivel', 'Fase de desarrollo', out.join(' · '));
  }

  /* ============================================================
   *  Armas
   * ============================================================ */
  function normArma(a) {
    if (!a || !String(a.nombre || '').trim()) return null;
    const o = { nombre: String(a.nombre).trim().slice(0, 60), habilidad: String(a.habilidad || '').slice(0, 40), dano: String(a.dano || '').slice(0, 40), alcance: String(a.alcance || '').slice(0, 60), ataques: String(a.ataques || '').slice(0, 20), notas: String(a.notas || '').slice(0, 200), bono: ['completo', 'medio'].indexOf(a.bono) >= 0 ? a.bono : '', empala: !!a.empala };
    if (a.objetivo != null && a.objetivo !== '') o.objetivo = acotar(entero(a.objetivo, 0), 0, 99);
    if (a.habilidadTexto) o.habilidadTexto = String(a.habilidadTexto).slice(0, 80);
    return o;
  }
  function objetivoArma(a) {
    const h = a.habilidad ? habPorRef(a.habilidad) : null;
    if (h) return { valor: h.val, texto: `${h.nombre} ${h.val}%` };
    return { valor: a.objetivo != null ? a.objetivo : 50, texto: a.habilidadTexto || `${a.objetivo != null ? a.objetivo : 50}%` };
  }
  function filaArma(a, idx) {
    const o = objetivoArma(a);
    return `<tr><td data-label="Arma"><strong>${esc(a.nombre)}</strong></td><td data-label="Habilidad">${esc(o.texto)}</td><td data-label="Daño">${esc(a.dano)}${a.bono ? ` <small>(${a.bono === 'medio' ? 'medio bono' : 'bono de daño'})</small>` : ''}${a.empala ? ' <small>· empala</small>' : ''}</td><td data-label="Alcance">${esc(a.alcance)}</td><td data-label="Notas">${esc(a.notas)}${a.ataques ? ` <small>· ${esc(a.ataques)} ataque(s)</small>` : ''}</td>
      <td data-label="Tirar"><button type="button" class="btn btn-roll btn-sm" data-coc-tirar="arma" data-idx="${idx}">🎲 Atacar</button></td>
      <td data-label="Editar"><button type="button" data-coc-editar-arma="${idx}" aria-label="Editar ${esc(a.nombre)}">✏️</button> <button type="button" data-coc-quitar-arma="${idx}" aria-label="Quitar ${esc(a.nombre)}">🗑️</button></td></tr>`;
  }
  function formularioArma(a) {
    const skills = habs().map((h) => `<option value="${esc(h.id)}"${a && a.habilidad === h.id ? ' selected' : ''}>${esc(h.nombre)} (${h.val} %)</option>`).join('');
    return `<div class="bp-form"><div class="bp-grid">
      <label class="bp-campo"><span>Nombre</span><input type="text" id="af-nombre" maxlength="60" value="${esc(a ? a.nombre : '')}"></label>
      <label class="bp-campo"><span>Habilidad</span><select id="af-habilidad"><option value="">(valor manual)</option>${skills}</select></label>
      <label class="bp-campo"><span>Valor manual (%)</span><input type="number" id="af-objetivo" min="0" max="99" value="${esc(a && a.objetivo != null ? a.objetivo : '')}"></label>
      <label class="bp-campo"><span>Daño</span><input type="text" id="af-dano" maxlength="40" value="${esc(a ? a.dano : '1d6')}" placeholder="1d10+2"></label>
      <label class="bp-campo"><span>Alcance</span><input type="text" id="af-alcance" maxlength="60" value="${esc(a ? a.alcance : '')}"></label>
      <label class="bp-campo"><span>Ataques por asalto</span><input type="text" id="af-ataques" maxlength="20" value="${esc(a ? a.ataques : '1')}"></label>
      <label class="bp-campo"><span>Bono de daño</span><select id="af-bono"><option value="">Ninguno (a distancia)</option><option value="completo"${a && a.bono === 'completo' ? ' selected' : ''}>Completo</option><option value="medio"${a && a.bono === 'medio' ? ' selected' : ''}>Medio</option></select></label>
      <label class="bp-campo bp-ancho"><span>Notas (munición, fallo…)</span><input type="text" id="af-notas" maxlength="200" value="${esc(a ? a.notas : '')}"></label></div>
      <label class="bp-check"><input type="checkbox" id="af-empala"${a && a.empala ? ' checked' : ''}> Empala (un éxito extremo hace el daño máximo más una tirada)</label>
      <div class="bp-acciones"><button type="button" onclick="FichaCoC.armas.cerrarFormulario()">Cancelar</button><button type="button" class="bp-guardar" onclick="FichaCoC.guardarArma()">💾 Guardar arma</button></div></div>`;
  }
  function guardarArma() {
    const idx = armasEd.editandoIdx(), previo = idx !== null ? armasEd.items()[idx] : null;
    const nombre = (($('af-nombre') || {}).value || '').trim();
    if (!nombre) { alert('El arma necesita un nombre.'); return; }
    const a = normArma({ nombre, habilidad: $('af-habilidad').value, objetivo: $('af-objetivo').value, dano: $('af-dano').value, alcance: $('af-alcance').value, ataques: $('af-ataques').value, notas: $('af-notas').value, bono: $('af-bono').value, empala: $('af-empala').checked, habilidadTexto: previo && !$('af-habilidad').value ? previo.habilidadTexto : '' });
    armasEd.guardarDesdeFormulario(a);
  }
  function atacar(idx) {
    const a = armasEd.items()[idx]; if (!a) return;
    const o = objetivoArma(a);
    tirarContra('Ataque: ' + a.nombre, o.valor, { arma: a, nota: a.notas });
  }
  function abrirArmasEjemplo() {
    const c = $('armas-ejemplo'); if (!c) return;
    if (c.innerHTML.trim()) { c.innerHTML = ''; return; }
    c.innerHTML = `<div class="rg-biblioteca"><p class="texto-suave">Valores de referencia; ajústalos con tu manual desde ✏️.</p>${((typeof COC_ARMAS !== 'undefined' ? COC_ARMAS : []) || []).map((a, i) => `<div class="fila"><span><strong>${esc(a.nombre)}</strong> · ${esc(a.dano)} · ${esc(a.alcance)}</span><button type="button" class="btn btn-fantasma btn-sm" data-coc-agregar-arma-ejemplo="${i}">➕ Agregar</button></div>`).join('')}</div>`;
  }

  /* ============================================================
   *  Capacidades (hechizos, dones, habilidades especiales)
   * ============================================================ */
  const TIPOS_CAP = [['hechizo', 'Hechizo'], ['don', 'Don o poder'], ['pasiva', 'Pasiva'], ['objeto', 'Objeto o reliquia'], ['otro', 'Otra']];
  function normCoste(c) {
    c = c || {};
    const o = {};
    ['pm', 'san', 'hp', 'pmObj', 'sanObj'].forEach((k) => { const n = entero(c[k], 0); if (n) o[k] = acotar(n, 0, 99); });
    ['pmDado', 'sanDado', 'dadoEfecto'].forEach((k) => { const t = String(c[k] || '').trim().slice(0, 20); if (t) o[k] = t; });
    return o;
  }
  function normCap(c) {
    if (!c || !String(c.nombre || '').trim()) return null;
    const o = { id: String(c.id || 'cap_' + slug(c.nombre) + '_' + Math.random().toString(36).slice(2, 5)).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50), nombre: String(c.nombre).trim().slice(0, 80), tipo: TIPOS_CAP.some((t) => t[0] === c.tipo) ? c.tipo : 'otro', meta: String(c.meta || '').slice(0, 120), texto: String(c.texto || '').slice(0, 4000), nota: String(c.nota || '').slice(0, 300) };
    const co = normCoste(c.coste); if (Object.keys(co).length) o.coste = co;
    if (c.biblioteca && c.biblioteca.id) o.biblioteca = { id: String(c.biblioteca.id).slice(0, 60), autor: String(c.biblioteca.autor || '').slice(0, 60) };
    return o;
  }
  const resumenCoste = (c) => { const p = []; c = c || {}; if (c.pm || c.pmDado) p.push(`${[c.pm, c.pmDado].filter(Boolean).join(' + ')} PM`); if (c.san || c.sanDado) p.push(`${[c.san, c.sanDado].filter(Boolean).join(' + ')} Cordura`); if (c.hp) p.push(`${c.hp} PV`); if (c.dadoEfecto) p.push(`efecto ${c.dadoEfecto}`); return p.join(' · '); };
  function filaCap(raw, idx) {
    const c = normCap(raw) || { nombre: '(dañada)', texto: '' };
    const tipo = (TIPOS_CAP.find((t) => t[0] === c.tipo) || ['', ''])[1];
    const costo = resumenCoste(c.coste), usable = !!c.coste;
    return `<div class="feature-card rasgo-propio" data-cap="${idx}">
      <div class="fila"><h4>${esc(c.nombre)}</h4><span class="tag">${esc(tipo)}</span></div>
      ${c.meta || costo ? `<p class="texto-suave">${esc([c.meta, costo ? 'Costo: ' + costo : ''].filter(Boolean).join(' · '))}</p>` : ''}
      ${c.texto ? `<div class="rasgo-texto">${esc(c.texto).replace(/\n/g, '<br>')}</div>` : ''}
      ${c.nota ? `<p class="texto-suave">${esc(c.nota)}</p>` : ''}
      <div class="fila"><button type="button" class="btn btn-roll btn-sm" data-coc-usar="${idx}">${usable ? '⚡ Usar' : '🔹 Usar'}</button></div>
      <div class="usar-form-container" id="dados-usar-${idx}"></div>
      <div class="fila rasgo-gestion"><span class="rasgo-botones"><button type="button" onclick="FichaCoC.capacidades.mostrarFormulario(${idx})" aria-label="Editar ${esc(c.nombre)}">✏️</button><button type="button" data-coc-quitar-cap="${idx}" aria-label="Quitar ${esc(c.nombre)}">🗑️</button><button type="button" data-coc-publicar-cap="${idx}" title="Guardar en la biblioteca global para otras fichas">${c.biblioteca ? '📚 Actualizar en la biblioteca' : '📤 A la biblioteca'}</button></span></div></div>`;
  }
  function formularioCap(raw) {
    const c = raw ? normCap(raw) : null, co = (c && c.coste) || {};
    const campo = (id, et, v, tipo, ph) => `<label class="bp-campo"><span>${et}</span><input type="${tipo || 'text'}" id="${id}" value="${esc(v == null ? '' : v)}"${ph ? ` placeholder="${ph}"` : ''}${tipo === 'number' ? ' min="0" max="99"' : ''}></label>`;
    return `<div class="bp-form"><div class="bp-grid">
      ${campo('tf-nombre', 'Nombre', c ? c.nombre : '')}
      <label class="bp-campo"><span>Tipo</span><select id="tf-tipo">${TIPOS_CAP.map((t) => `<option value="${t[0]}"${c && c.tipo === t[0] ? ' selected' : ''}>${t[1]}</option>`).join('')}</select></label>
      ${campo('tf-meta', 'Resumen corto', c ? c.meta : '', 'text', 'p. ej. Coste: 2 PM / 1 por sesión')}</div>
      <label class="bp-campo bp-ancho"><span>Texto</span><textarea id="tf-texto" rows="5" maxlength="4000">${esc(c ? c.texto : '')}</textarea></label>
      <p class="texto-suave">Costo de usarla (todo opcional; al usarla se puede ajustar antes de confirmar):</p>
      <div class="bp-grid">${campo('tf-pm', 'PM fijos', co.pm, 'number')}${campo('tf-pmdado', 'PM con dado', co.pmDado, 'text', '1d4')}${campo('tf-san', 'Cordura fija', co.san, 'number')}${campo('tf-sandado', 'Cordura con dado', co.sanDado, 'text', '1d6')}${campo('tf-hp', 'PV', co.hp, 'number')}${campo('tf-efecto', 'Dado de efecto', co.dadoEfecto, 'text', '1d6')}${campo('tf-pmobj', 'PM por objetivo extra', co.pmObj, 'number')}${campo('tf-sanobj', 'Cordura por objetivo extra', co.sanObj, 'number')}</div>
      <label class="bp-campo bp-ancho"><span>Nota (opcional)</span><input type="text" id="tf-nota" maxlength="300" value="${esc(c ? c.nota : '')}"></label>
      <div class="bp-acciones"><button type="button" onclick="FichaCoC.capacidades.cerrarFormulario()">Cancelar</button><button type="button" class="bp-guardar" onclick="FichaCoC.guardarCap()">💾 Guardar</button></div></div>`;
  }
  function guardarCap() {
    const idx = capEd.editandoIdx(), previo = idx !== null ? capEd.items()[idx] : null;
    const nombre = (($('tf-nombre') || {}).value || '').trim();
    if (!nombre) { alert('La capacidad necesita un nombre.'); return; }
    const g = (id) => ($(id) || {}).value;
    const c = normCap({ id: previo ? previo.id : null, nombre, tipo: g('tf-tipo'), meta: g('tf-meta'), texto: g('tf-texto'), nota: g('tf-nota'), biblioteca: previo && previo.biblioteca, coste: { pm: g('tf-pm'), pmDado: g('tf-pmdado'), san: g('tf-san'), sanDado: g('tf-sandado'), hp: g('tf-hp'), dadoEfecto: g('tf-efecto'), pmObj: g('tf-pmobj'), sanObj: g('tf-sanobj') } });
    capEd.guardarDesdeFormulario(c);
  }
  // «Usar»: sin costo solo deja constancia; con costo abre un formulario con los valores por defecto para ajustarlos antes de confirmar.
  function usarCapacidad(idx) {
    const raw = capEd.items()[idx]; const c = raw && normCap(raw); if (!c) return;
    const cont = $('dados-usar-' + idx); if (!cont) return;
    if (!c.coste) { if (!soloLectura()) uso('recurso', `Usa ${c.nombre}`, ''); aviso(`🔹 ${c.nombre}`); return; }
    document.querySelectorAll('.usar-form-container').forEach((x) => { if (x.id !== cont.id) x.innerHTML = ''; });
    if (cont.innerHTML) { cont.innerHTML = ''; return; }
    const co = c.coste, objetivos = co.pmObj || co.sanObj;
    const f = (id, et, v, t, ph) => `<label>${et}<input type="${t || 'number'}" id="dados-usar-${id}-${idx}" value="${esc(v == null ? '' : v)}"${t === 'text' ? ` placeholder="${ph || ''}"` : ' min="0"'}></label>`;
    cont.innerHTML = `<div class="usar-form"><div class="usar-form-row">${f('pm', 'PM fijo', co.pm || 0)}${f('pmd', 'PM dado', co.pmDado || '', 'text', '1d4')}${f('san', 'Cordura fija', co.san || 0)}${f('sand', 'Cordura dado', co.sanDado || '', 'text', '1d6')}</div>
      <div class="usar-form-row">${f('hp', 'PV fijo', co.hp || 0)}${f('ef', 'Dado de efecto', co.dadoEfecto || '', 'text', '1d6')}${objetivos ? f('obj', 'Objetivos adicionales', 0) : ''}</div>
      ${c.nota ? `<p class="texto-suave">${esc(c.nota)}</p>` : ''}
      <div class="usar-form-actions"><button type="button" class="btn btn-fantasma btn-sm" onclick="document.getElementById('dados-usar-${idx}').innerHTML=''">Cancelar</button><button type="button" class="btn btn-primario btn-sm" data-coc-confirmar-uso="${idx}">⚡ Confirmar uso</button></div></div>`;
  }
  function confirmarUso(idx) {
    if (soloLectura()) return;
    const c = normCap(capEd.items()[idx]); if (!c) return;
    const co = c.coste || {}, g = (k) => ($(`dados-usar-${k}-${idx}`) || {}).value;
    const pmD = R.tirarFormula(g('pmd')), sanD = R.tirarFormula(g('sand')), ef = R.tirarFormula(g('ef'));
    const obj = entero(g('obj'), 0);
    const pm = entero(g('pm'), 0) + pmD.total + obj * (co.pmObj || 0), san = entero(g('san'), 0) + sanD.total + obj * (co.sanObj || 0), hp = entero(g('hp'), 0);
    if (pm) setVal('mp-curr', Math.max(0, num('mp-curr') - pm));
    if (san) setVal('san-curr', Math.max(0, num('san-curr') - san));
    if (hp) setVal('hp-curr', Math.max(0, num('hp-curr') - hp));
    const partes = [];
    if (pm) partes.push(`−${pm} PM${pmD.detalle ? ' (' + pmD.detalle + ')' : ''}`);
    if (san) partes.push(`−${san} Cordura${sanD.detalle ? ' (' + sanD.detalle + ')' : ''}`);
    if (hp) partes.push(`−${hp} PV`);
    if (ef.total) partes.push(`Efecto: ${ef.total} (${ef.detalle})`);
    const txt = `⚡ Usa ${c.nombre}${partes.length ? ': ' + partes.join(' | ') : ''}`;
    uso('hechizo', txt, '');
    if (global.FichaDados && ef.total) FichaDados.mostrar(ef.total, `${c.nombre} (efecto)`, ef.detalle);
    const cont = $('dados-usar-' + idx); if (cont) cont.innerHTML = '';
    aviso(txt);
  }

  /* ============================================================
   *  Biblioteca global de capacidades (biblioteca/capacidades_custom/<id>)
   * ============================================================ */
  let cacheLib = null, listaLib = [];
  const norm = (t) => String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  async function nombreAutor() {
    try { const n = (await ctx.db.ref(`usuarios/${ctx.uid}/perfil/nombre`).once('value')).val(); if (n) return String(n).slice(0, 60); } catch (e) { /* se usa el de la cuenta */ }
    const u = ctx.user || {}; return String(u.displayName || (u.email ? String(u.email).split('@')[0] : '') || 'Jugador').slice(0, 60);
  }
  async function publicarCap(idx) {
    if (soloLectura()) return;
    const c = normCap(capEd.items()[idx]); if (!c) return;
    const mio = c.biblioteca && c.biblioteca.autor === ctx.uid;
    if (!mio && !confirm(`¿Guardar «${c.nombre}» en la biblioteca global? Cualquier jugador podrá agregarla a sus fichas; solo tú podrás editarla o borrarla.`)) return;
    const datos = JSON.parse(JSON.stringify(c)); delete datos.biblioteca;
    datos.id = mio ? c.biblioteca.id : 'cap_' + slug(c.nombre) + '_' + Math.random().toString(36).slice(2, 6);
    datos.autor = ctx.uid; datos.autorNombre = await nombreAutor(); datos.actualizado = Date.now();
    try {
      await ctx.db.ref('biblioteca/capacidades_custom/' + datos.id).set(datos);
      capEd.mutar(idx, (it) => { it.biblioteca = { id: datos.id, autor: ctx.uid }; });
      cacheLib = null; aviso(mio ? 'Biblioteca actualizada.' : '📚 Guardada en la biblioteca global.');
    } catch (e) { alert('No se pudo guardar en la biblioteca: ' + (e && e.message ? e.message : e)); }
  }
  async function abrirBibliotecaCapacidades() {
    const cont = $('capacidades-biblioteca'); if (!cont) return;
    if (cont.innerHTML.trim()) { cont.innerHTML = ''; return; }
    cont.innerHTML = '<p class="texto-suave">Cargando la biblioteca…</p>';
    try {
      if (!cacheLib) { const v = (await ctx.db.ref('biblioteca/capacidades_custom').once('value')).val() || {}; cacheLib = Object.keys(v).map((k) => { const c = normCap(Object.assign({}, v[k], { id: k })); return c ? Object.assign(c, { _autor: v[k].autor, _autorNombre: v[k].autorNombre || '' }) : null; }).filter(Boolean); }
      listaLib = cacheLib;
    } catch (e) { listaLib = []; }
    cont.innerHTML = `<div class="rg-biblioteca"><div class="bp-grid"><label class="bp-campo bp-ancho"><span>🔎 Buscar en la biblioteca</span><input type="search" id="dados-bib-buscar" placeholder="nombre, texto, autor…" autocomplete="off"></label>
      <label class="bp-campo"><span>Tipo</span><select id="dados-bib-tipo"><option value="">Todos</option>${TIPOS_CAP.map((t) => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select></label></div>
      <div id="dados-bib-lista"></div><div class="fila"><button type="button" class="btn btn-fantasma btn-sm" onclick="FichaCoC.abrirBibliotecaCapacidades()">Cerrar la biblioteca</button></div></div>`;
    pintarBibliotecaCap();
  }
  function pintarBibliotecaCap() {
    const l = $('dados-bib-lista'); if (!l) return;
    const q = norm(($('dados-bib-buscar') || {}).value), tipo = ($('dados-bib-tipo') || {}).value;
    const r = listaLib.filter((c) => (!tipo || c.tipo === tipo) && (!q || norm([c.nombre, c.texto, c.meta, c._autorNombre].join(' ')).indexOf(q) >= 0)).slice(0, 60);
    l.innerHTML = r.length ? r.map((c) => { const i = listaLib.indexOf(c), mio = c._autor === ctx.uid, costo = resumenCoste(c.coste);
      return `<div class="feature-card rgb-item"><div class="fila"><h4>${esc(c.nombre)}</h4><span class="tag">${esc((TIPOS_CAP.find((t) => t[0] === c.tipo) || ['', ''])[1])}</span></div>
        ${c.texto ? `<p class="texto-suave">${esc(c.texto.length > 220 ? c.texto.slice(0, 220) + '…' : c.texto)}</p>` : ''}${c.meta || costo ? `<p class="texto-suave rasgo-resumen">${esc([c.meta, costo ? 'Costo: ' + costo : ''].filter(Boolean).join(' · '))}</p>` : ''}
        <div class="fila"><span class="texto-suave">👥 ${esc(c._autorNombre || 'Jugador')}</span><span class="rasgo-botones"><button type="button" class="btn btn-primario btn-sm" data-coc-bib-agregar="${i}">➕ Agregar a mi ficha</button>${mio ? `<button type="button" class="btn btn-fantasma btn-sm" data-coc-bib-borrar="${i}">🗑️ Borrar</button>` : ''}</span></div></div>`; }).join('')
      : '<p class="texto-suave">No hay capacidades con esos filtros. Crea una y publícala con 📤.</p>';
  }
  function agregarDeBiblioteca(i) {
    if (soloLectura()) return;
    const x = listaLib[i]; if (!x) return;
    const c = normCap(Object.assign({}, JSON.parse(JSON.stringify(x)), { id: null, biblioteca: null })); if (!c) return;
    capEd.items().push(c); capEd.mutar(capEd.items().length - 1, () => {}); aviso(`➕ «${c.nombre}» agregada a tu ficha.`);
  }
  async function borrarDeBiblioteca(i) {
    const x = listaLib[i]; if (!x || x._autor !== ctx.uid) return;
    if (!confirm(`¿Borrar «${x.nombre}» de la biblioteca global? Las fichas que ya la copiaron la conservan.`)) return;
    try { await ctx.db.ref('biblioteca/capacidades_custom/' + x.id).remove(); cacheLib = null; listaLib = listaLib.filter((y) => y !== x); pintarBibliotecaCap(); aviso('Borrada de la biblioteca.'); }
    catch (e) { alert('No se pudo borrar: ' + (e && e.message ? e.message : e)); }
  }

  // Lanzamiento rápido de un d100 / dado suelto desde la barra
  function d100Rapido() { const t = R.tirarD100(ajustes()); if (global.FichaDados) FichaDados.mostrar(t.total, 'd100', detalleDados(t)); }

  /* ============================================================
   *  Resumen para el GM (campanas/<c>/party/<id>)
   * ============================================================ */
  function resumenParty() {
    const cond = ['herida-grave', 'inconsciente', 'moribundo', 'locura-temporal', 'locura-indefinida'].filter((k) => ($('st-' + k) || {}).checked);
    return { nombre: P.nombre, clase: (($('info-ocupacion') || {}).value || '').trim(), nivel: null, hp: num('hp-curr'), hpMax: num('hp-max'), hpTemp: 0, pm: num('mp-curr'), pmMax: num('mp-max'), san: num('san-curr'), sanMax: num('san-max'), suerte: num('luck-curr'), condiciones: cond, agotamiento: 0, sistema: 'coc' };
  }

  /* ============================================================
   *  Eventos
   * ============================================================ */
  let escuchas = false;
  function instalarEscuchas() {
    if (escuchas) return; escuchas = true;
    document.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('[data-coc-tirar],[data-coc-delta],[data-coc-descanso],[data-coc-d100],[data-coc-recibir-dano],[data-coc-curar],[data-coc-chequeo-san],[data-coc-agregar-hab],[data-coc-desarrollo],[data-coc-suerte],[data-coc-editar-hab],[data-coc-quitar-hab],[data-coc-editar-arma],[data-coc-quitar-arma],[data-coc-usar],[data-coc-confirmar-uso],[data-coc-quitar-cap],[data-coc-agregar-arma-ejemplo],[data-coc-publicar-cap],[data-coc-bib-agregar],[data-coc-bib-borrar]');
      if (!t) return;
      const d = t.dataset;
      if (d.cocTirar === 'carac') { const id = d.id, nombre = id === 'luck-curr' ? 'Suerte' : (((global.FichaCoCPlantilla || {}).CARAC || []).find((c) => c[0] === id) || [0, 0, id])[2]; return void tirarContra((id === 'luck-curr' ? '' : 'Chequeo de ') + nombre, num(id), { sinSuerte: id === 'luck-curr' }); }
      if (d.cocTirar === 'hab') { const h = habEd.items()[parseInt(d.idx, 10)]; if (h) tirarContra(h.nombre, h.val); return; }
      if (d.cocTirar === 'arma') return atacar(parseInt(d.idx, 10));
      if (d.cocDelta) return cambiarDelta(d.cocDelta, parseInt(d.delta, 10) || 0);
      if (d.cocDescanso !== undefined) return descanso();
      if (d.cocD100 !== undefined) return d100Rapido();
      if (d.cocRecibirDano !== undefined) return recibirDano();
      if (d.cocCurar !== undefined) return curar();
      if (d.cocChequeoSan !== undefined) return chequeoDeCordura();
      if (d.cocAgregarHab !== undefined) { if (!soloLectura()) habEd.mostrarFormulario(); return; }
      if (d.cocDesarrollo !== undefined) return desarrollo();
      if (d.cocSuerte) return gastarSuerte(parseInt(d.cocSuerte, 10));
      if (d.cocEditarHab !== undefined) { if (!soloLectura()) habEd.mostrarFormulario(parseInt(d.cocEditarHab, 10)); return; }
      if (d.cocQuitarHab !== undefined) { if (!soloLectura()) habEd.eliminar(parseInt(d.cocQuitarHab, 10), '¿Quitar esta habilidad?'); return; }
      if (d.cocEditarArma !== undefined) { if (!soloLectura()) armasEd.mostrarFormulario(parseInt(d.cocEditarArma, 10)); return; }
      if (d.cocQuitarArma !== undefined) { if (!soloLectura()) armasEd.eliminar(parseInt(d.cocQuitarArma, 10), '¿Quitar esta arma?'); return; }
      if (d.cocAgregarArmaEjemplo !== undefined) { if (soloLectura()) return; const a = normArma(((typeof COC_ARMAS !== 'undefined' ? COC_ARMAS : []) || [])[parseInt(d.cocAgregarArmaEjemplo, 10)]); if (a) { armasEd.items().push(a); armasEd.mutar(armasEd.items().length - 1, () => {}); aviso(`➕ ${a.nombre}`); } return; }
      if (d.cocUsar !== undefined) return usarCapacidad(parseInt(d.cocUsar, 10));
      if (d.cocConfirmarUso !== undefined) return confirmarUso(parseInt(d.cocConfirmarUso, 10));
      if (d.cocPublicarCap !== undefined) return publicarCap(parseInt(d.cocPublicarCap, 10));
      if (d.cocBibAgregar !== undefined) return agregarDeBiblioteca(parseInt(d.cocBibAgregar, 10));
      if (d.cocBibBorrar !== undefined) return borrarDeBiblioteca(parseInt(d.cocBibBorrar, 10));
      if (d.cocQuitarCap !== undefined) { if (!soloLectura()) capEd.eliminar(parseInt(d.cocQuitarCap, 10), '¿Quitar esta capacidad?'); return; }
    });
    // valores y marcas de habilidades (sin id: se guardan por la lista)
    document.addEventListener('change', (e) => {
      const t = e.target; if (!t || !t.dataset) return;
      if (t.dataset.cocVal !== undefined) { if (soloLectura()) return; habEd.mutar(parseInt(t.dataset.cocVal, 10), (h) => { h.val = acotar(entero(t.value, 0), 0, 99); }); return; }
      if (t.dataset.cocMarca !== undefined) { if (soloLectura()) return; habEd.mutar(parseInt(t.dataset.cocMarca, 10), (h) => { if (t.checked) h.marca = true; else delete h.marca; }); return; }
      if (t.id === 'dados-filtro-hab') aplicarFiltroHab();
      if (t.id === 'dados-bib-tipo') pintarBibliotecaCap();
      if (t.id === 'hf-base') {
        const def = ((typeof COC_HABILIDADES !== 'undefined' ? COC_HABILIDADES : []) || []).find((x) => x.id === t.value); if (!def) return;
        $('hf-nombre').value = def.esp ? def.es + ' (' + '…)' : def.es;
        $('hf-val').value = R.valorBase(def.base, caracteristicas());
      }
    });
    document.addEventListener('input', (e) => {
      const t = e.target; if (!t) return;
      if (t.id === 'dados-buscar-hab') aplicarFiltroHab();
      if (t.id === 'dados-bib-buscar') pintarBibliotecaCap();
      if (t.id && (CARAC_IDS.indexOf(t.id) >= 0 || /^(hp|mp|san)-(curr|max)$/.test(t.id) || t.id === 'luck-curr' || t.id === 'luck-max' || t.id === 'info-edad' || t.id === 'san-perdida-hoy')) pintarDerivados();
    });
    document.addEventListener('change', (e) => { if (e.target && /^st-/.test(e.target.id || '')) { /* los estados se guardan solos (tienen id) */ } });
    document.addEventListener('ficha:datos-sincronizados', () => { pintarDerivados(); aplicarFiltroHab(); });
  }

  /* ============================================================
   *  Arranque
   * ============================================================ */
  function iniciar(c) {
    ctx = c; P = c.P;
    instalarEscuchas();
    const C = global.FichaComun;
    const semillaHab = (P.habilidades || []).map(normHab).filter(Boolean);
    habEd = C.crearEditorDeLista({ storageKey: 'habilidades-json', datosIniciales: semillaHab, contenedorListaId: 'habilidades-lista', contenedorFormId: 'habilidades-form', filaVacia: '<p class="texto-suave">Sin habilidades todavía: agrega las del manual con ➕.</p>', alCambiar: () => { aplicarFiltroHab(); pintarDerivados(); }, renderFila: (h, i) => filaHab(normHab(h) || { nombre: '(dañada)', val: 0 }, i), renderFormulario: (h) => formularioHab(h && normHab(h)) });
    armasEd = C.crearEditorDeLista({ storageKey: 'armas-json', datosIniciales: (P.armas || []).map(normArma).filter(Boolean), contenedorListaId: 'armas-lista', contenedorFormId: 'armas-form', filaVacia: '<tr><td colspan="7" class="texto-suave">Sin armas todavía.</td></tr>', renderFila: (a, i) => filaArma(normArma(a) || { nombre: '(dañada)' }, i), renderFormulario: (a) => formularioArma(a && normArma(a)) });
    capEd = C.crearEditorDeLista({ storageKey: 'capacidades-json', datosIniciales: (P.capacidades || []).map(normCap).filter(Boolean), contenedorListaId: 'capacidades-lista', contenedorFormId: 'capacidades-form', filaVacia: '<p class="texto-suave">Aquí van los hechizos, dones y habilidades especiales de tu investigador.</p>', renderFila: (c2, i) => filaCap(c2, i), renderFormulario: (c2) => formularioCap(c2) });
    API.habilidades = habEd; API.armas = armasEd; API.capacidades = capEd;
    pintarDerivados(); aplicarFiltroHab();
    if (global.FichaParty) FichaParty.iniciarPublicador({ db: c.db, codigoCampana: c.codigoCampana, personajeId: P.id, nombre: P.nombre, leer: resumenParty });
    return API;
  }

  const API = {
    iniciar, tirarContra, atacar, recibirDano, curar, chequeoDeCordura, descanso, desarrollo, gastarSuerte, pintarDerivados, resumenParty,
    guardarHab, guardarArma, guardarCap, abrirArmasEjemplo, normHab, normArma, normCap, habValor, usarCapacidad, confirmarUso, resumenCoste, TIPOS_CAP,
    abrirBibliotecaCapacidades, publicarCap,
    habilidades: null, armas: null, capacidades: null,
    get contexto() { return ctx; },
  };
  global.FichaCoC = API;
})(typeof window !== 'undefined' ? window : globalThis);

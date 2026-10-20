/*
 * ficha-compendio.js — selector del compendio de hechizos (spells_data.js) para agregar hechizos a la ficha.
 *
 * Reemplaza al toggleSpellPicker / previsualizarHechizo / agregarHechizoDesdeCompendio que cada ficha tenía copiado.
 * Agrega al editor de hechizos común (FichaHechizos.editor.guardarDesdeFormulario) y respeta la estructura de
 * cada entrada del compendio (formula, ataque, upcast, buff, concentración).
 *
 *   FichaCompendio.abrir()      abre el selector (búsqueda por nombre y filtro por nivel)
 *   FichaCompendio.cerrar()
 * Usa las clases .modal-velo/.modal de ficha-tema.css (un modal accesible: role=dialog, Escape cierra).
 */
(function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let velo = null, vista = null, veloDetalle = null, vistaDetalle = null;

  function lista() { return (typeof SPELLS !== 'undefined') ? SPELLS : []; }
  function yaTiene(nombre) { return window.FichaHechizos && FichaHechizos.editor.items().some(h => h.nombre === nombre); }

  function agregar(nombre) {
    const s = lista().find(x => x.name === nombre);
    if (!s || !window.FichaHechizos) return;
    FichaHechizos.editor.guardarDesdeFormulario({
      nombre: s.name, nivel: s.nivel, tiempo: s.tiempo, alcance: s.alcance, area: '', resumen: descDeHechizo(s), duracion: s.duracion,
      formula: s.formula || null, slotCost: s.nivel > 0 ? s.nivel : null, ataque: s.ataque || null, upcast: s.upcast || null,
      buff: s.buff ? JSON.parse(JSON.stringify(s.buff)) : null,
    });
    if (window.FichaDados) FichaDados.registrarUso('Agregó el hechizo ' + s.name, 'hechizo');
  }

  function pintar() {
    const q = (document.getElementById('comp-buscar').value || '').trim().toLowerCase();
    const nv = document.getElementById('comp-nivel').value;
    let l = lista().filter(s => (!q || s.name.toLowerCase().includes(q)) && (nv === '' || String(s.nivel) === nv));
    l = l.slice().sort((a, b) => a.nivel - b.nivel || a.name.localeCompare(b.name)).slice(0, 60);
    const cont = document.getElementById('comp-lista');
    if (!l.length) { cont.innerHTML = '<p class="texto-suave">Sin resultados.</p>'; return; }
    cont.innerHTML = l.map(s => {
      const tiene = yaTiene(s.name);
      return `<div class="opcion"><div><strong>${esc(s.name)}</strong><small>${s.nivel === 0 ? 'Truco' : s.nivel + '.º'}${etiquetaEdicion(s) ? ' · ' + etiquetaEdicion(s) : ''} · ${esc(s.escuela)} · ${esc((s.clases || []).join(', '))}${s.buff || /Conc/i.test(s.duracion || '') ? ' <span class="tag">🧠 Conc.</span>' : ''}</small></div>
        <div class="fila"><button type="button" class="btn btn-fantasma btn-sm" data-comp-ver="${esc(s.name)}">👁️ Ver</button>${tiene ? '<span class="texto-suave">✅ Ya la tienes</span>' : `<button type="button" class="btn btn-primario btn-sm" data-comp-agregar="${esc(s.name)}">➕ Agregar</button>`}</div></div>`;
    }).join('');
  }

  // ---- Descripción completa en una ventana propia (sobre el selector, si está abierto). Sirve para el compendio y para los hechizos de la ficha. ----
  // `s` = entrada del compendio (o null) y `h` = hechizo de la ficha (o null): si no está en el compendio se muestra lo que tiene guardado la ficha.
  function pintarDetalle(s, h, desdeCompendio) {
    const nombre = s ? s.name : h.nombre;
    const nivel = s ? s.nivel : h.nivel;
    const meta = [s && s.escuela, s && (s.clases || []).join(', ')].filter(Boolean).map(esc).join(' · ');
    const datos = [s ? s.tiempo : h.tiempo, s ? s.alcance : h.alcance, s ? s.duracion : h.duracion].filter(Boolean).map(esc).join(' · ');
    const ed = (window.edicionPreferida && edicionPreferida()) || '2014';
    let cuerpo;
    if (s) {
      if (s.desc2024) {
        const principal = ed === '2024' ? s.desc2024 : s.desc;
        const otra = ed === '2024' ? s.desc : s.desc2024;
        cuerpo = `<div><strong>${ed === '2024' ? '2024' : '2014'}${s.edicion === '2014' || s.edicion === '2024' ? '' : ' (tu edición preferida)'}:</strong> ${principal}</div>
          <details class="comp-otra-edicion"><summary>Ver también la versión ${ed === '2024' ? '2014' : '2024'}</summary><div><strong>${ed === '2024' ? '2014' : '2024'}:</strong> ${otra}</div></details>`;
      } else cuerpo = `<div>${s.desc}</div>`;
    } else {
      cuerpo = `<div style="white-space:pre-wrap">${esc(h.resumen || 'Este hechizo no está en el compendio y no tiene descripción guardada.')}</div>
        <p class="texto-suave"><small>No está en el compendio: se muestra el texto guardado en tu ficha.</small></p>`;
    }
    const extra = [];
    if (h && h.area) extra.push('📐 ' + esc(h.area));
    if (h && h.formula) extra.push(`🎲 ${h.formula.count}d${h.formula.sides}${h.formula.mod ? (h.formula.mod > 0 ? '+' : '') + h.formula.mod : ''}`);
    const pie = desdeCompendio && s
      ? (yaTiene(s.name) ? '<span class="texto-suave">✅ Ya la tienes</span>' : `<button type="button" class="btn btn-primario btn-sm" data-comp-agregar-detalle="${esc(s.name)}">➕ Agregar a mi ficha</button>`)
      : '';
    veloDetalle.querySelector('.modal-cuerpo').innerHTML = `<div><strong>${esc(nombre)}</strong> · ${nivel === 0 ? 'Truco' : nivel + '.º'}${s && etiquetaEdicion(s) ? ' · ' + etiquetaEdicion(s) : ''}
      ${meta ? `<br><small class="texto-suave">${meta}</small>` : ''}${datos ? `<br><small class="texto-suave">${datos}</small>` : ''}${extra.length ? `<br><small class="texto-suave">${extra.join(' · ')}</small>` : ''}</div>
      <div class="comp-texto">${cuerpo}</div>`;
    veloDetalle.querySelector('.modal-pie').innerHTML = `${pie}<button type="button" class="btn btn-fantasma btn-sm" data-det-cerrar>Cerrar</button>`;
  }
  function asegurarDetalle() {
    if (veloDetalle) return;
    veloDetalle = document.createElement('div'); veloDetalle.className = 'modal-velo'; veloDetalle.id = 'modal-hechizo';
    veloDetalle.setAttribute('role', 'dialog'); veloDetalle.setAttribute('aria-modal', 'true'); veloDetalle.setAttribute('aria-label', 'Descripción del hechizo');
    veloDetalle.innerHTML = '<div class="modal"><div class="modal-cab"><h3>📖 Descripción del hechizo</h3><button type="button" class="btn btn-fantasma btn-sm" data-det-cerrar aria-label="Cerrar">✖</button></div><div class="modal-cuerpo"></div><div class="modal-pie"></div></div>';
    document.body.appendChild(veloDetalle);
    veloDetalle.addEventListener('click', (e) => {
      if (e.target === veloDetalle || e.target.closest('[data-det-cerrar]')) return cerrarDetalle();
      const a = e.target.closest('[data-comp-agregar-detalle]');
      if (a) { agregar(a.dataset.compAgregarDetalle); const s = lista().find(x => x.name === a.dataset.compAgregarDetalle); pintarDetalle(s, null, true); if (velo && velo.dataset.abierto === 'true') pintar(); }
    });
  }
  function abrirDetalle(s, h, desdeCompendio) {
    asegurarDetalle(); pintarDetalle(s, h, desdeCompendio);
    vistaDetalle = document.activeElement;
    veloDetalle.dataset.abierto = 'true'; veloDetalle.classList.add('abierto');
    veloDetalle.querySelector('.modal-cuerpo').scrollTop = 0;
    const b = veloDetalle.querySelector('[data-det-cerrar]'); if (b) b.focus();
  }
  function cerrarDetalle() {
    if (!veloDetalle) return;
    veloDetalle.dataset.abierto = 'false'; veloDetalle.classList.remove('abierto');
    if (vistaDetalle && vistaDetalle.focus) { try { vistaDetalle.focus(); } catch (e) { /* noop */ } }
  }
  // Desde el selector del compendio (por nombre).
  function ver(nombre) {
    const s = lista().find(x => x.name === nombre); if (s) abrirDetalle(s, null, true);
  }
  // Desde una fila de la ficha (por posición): compendio si el nombre coincide; si no, el texto guardado en la ficha.
  function verHechizoDeFicha(idx) {
    const h = window.FichaHechizos && FichaHechizos.editor.items()[idx]; if (!h) return;
    const s = lista().find(x => x.name.toLowerCase() === String(h.nombre).trim().toLowerCase()) || null;
    abrirDetalle(s, s ? null : h, false);
  }

  function construir() {
    velo = document.createElement('div'); velo.className = 'modal-velo'; velo.id = 'modal-compendio';
    velo.setAttribute('role', 'dialog'); velo.setAttribute('aria-modal', 'true'); velo.setAttribute('aria-labelledby', 'comp-titulo');
    velo.innerHTML = `<div class="modal"><div class="modal-cab"><h3 id="comp-titulo">📖 Compendio de hechizos</h3><button type="button" class="btn btn-fantasma btn-sm" data-comp-cerrar aria-label="Cerrar">✖</button></div>
      <div class="modal-cuerpo"><div class="form-grid"><label class="campo"><span>Buscar</span><input type="search" id="comp-buscar" placeholder="Nombre del hechizo…"></label>
      <label class="campo"><span>Nivel</span><select id="comp-nivel"><option value="">Todos</option><option value="0">Trucos</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<option value="${n}">${n}.º</option>`).join('')}</select></label></div>
      <label class="campo"><span>Texto al agregar</span><select id="comp-edicion"><option value="2014">SRD 2014</option><option value="2024">SRD 2024</option></select></label>
      <div class="opcion-lista" id="comp-lista"></div></div></div>`;
    document.body.appendChild(velo);
    velo.addEventListener('click', (e) => {
      if (e.target === velo || e.target.closest('[data-comp-cerrar]')) return cerrar();
      const v = e.target.closest('[data-comp-ver]'); if (v) return ver(v.dataset.compVer);
      const a = e.target.closest('[data-comp-agregar]'); if (a) { agregar(a.dataset.compAgregar); pintar(); }
    });
    // Ojo: no volver a dibujar en 'change' del buscador (se dispara al perder el foco y se comería el clic en «Agregar»).
    document.getElementById('comp-buscar').addEventListener('input', pintar);
    document.getElementById('comp-nivel').addEventListener('change', pintar);
    const selEd = document.getElementById('comp-edicion'); selEd.value = edicionPreferida();
    selEd.addEventListener('change', () => guardarEdicionPreferida(selEd.value));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (veloDetalle && veloDetalle.dataset.abierto === 'true') cerrarDetalle();
      else if (velo.dataset.abierto === 'true') cerrar();
    });
  }

  function abrir() {
    if (!velo) construir();
    velo.dataset.abierto = 'true'; velo.classList.add('abierto');
    vista = document.activeElement;
    pintar();
    setTimeout(() => { const b = document.getElementById('comp-buscar'); if (b) b.focus(); }, 0);
  }
  function cerrar() {
    if (!velo) return;
    velo.dataset.abierto = 'false'; velo.classList.remove('abierto');
    if (vista && vista.focus) { try { vista.focus(); } catch (e) { /* noop */ } }
  }

  window.FichaCompendio = { abrir, cerrar, agregar, ver, verHechizoDeFicha };
})();

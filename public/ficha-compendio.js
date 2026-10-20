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
  let velo = null, vista = null;

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

  function ver(nombre) {
    const s = lista().find(x => x.name === nombre); if (!s) return;
    const d = document.getElementById('comp-detalle');
    d.hidden = false;
    d.innerHTML = `<div class="aviso"><div><strong>${esc(s.name)}</strong> · ${s.nivel === 0 ? 'Truco' : s.nivel + '.º'}<br><small>${esc(s.escuela)} · ${esc((s.clases || []).join(', '))}<br>${esc(s.tiempo)} · ${esc(s.alcance)} · ${esc(s.duracion)}</small><div style="margin-top:var(--sp-2)">${s.desc2024 ? `<strong>${s.edicion === '2024' ? '2024' : '2014'}:</strong> ` : ''}${s.desc}</div>${s.desc2024 ? `<div style="margin-top:var(--sp-2)"><strong>2024:</strong> ${s.desc2024}</div>` : ''}</div></div>`;
  }

  function construir() {
    velo = document.createElement('div'); velo.className = 'modal-velo'; velo.id = 'modal-compendio';
    velo.setAttribute('role', 'dialog'); velo.setAttribute('aria-modal', 'true'); velo.setAttribute('aria-labelledby', 'comp-titulo');
    velo.innerHTML = `<div class="modal"><div class="modal-cab"><h3 id="comp-titulo">📖 Compendio de hechizos</h3><button type="button" class="btn btn-fantasma btn-sm" data-comp-cerrar aria-label="Cerrar">✖</button></div>
      <div class="modal-cuerpo"><div class="form-grid"><label class="campo"><span>Buscar</span><input type="search" id="comp-buscar" placeholder="Nombre del hechizo…"></label>
      <label class="campo"><span>Nivel</span><select id="comp-nivel"><option value="">Todos</option><option value="0">Trucos</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<option value="${n}">${n}.º</option>`).join('')}</select></label></div>
      <label class="campo"><span>Texto al agregar</span><select id="comp-edicion"><option value="2014">SRD 2014</option><option value="2024">SRD 2024</option></select></label>
      <div id="comp-detalle" hidden></div><div class="opcion-lista" id="comp-lista"></div></div></div>`;
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && velo.dataset.abierto === 'true') cerrar(); });
  }

  function abrir() {
    if (!velo) construir();
    velo.dataset.abierto = 'true'; velo.classList.add('abierto');
    vista = document.activeElement;
    document.getElementById('comp-detalle').hidden = true;
    pintar();
    setTimeout(() => { const b = document.getElementById('comp-buscar'); if (b) b.focus(); }, 0);
  }
  function cerrar() {
    if (!velo) return;
    velo.dataset.abierto = 'false'; velo.classList.remove('abierto');
    if (vista && vista.focus) { try { vista.focus(); } catch (e) { /* noop */ } }
  }

  window.FichaCompendio = { abrir, cerrar, agregar };
})();

/* Personaje de prueba para la carcasa (no se publica: ver "ignore" en firebase.json). */
window.PERSONAJES = window.PERSONAJES || {};
PERSONAJES._demo = {
  id: '_demo', nombre: 'Demo Druida', sistema: 'dnd', paleta: 'bosque',
  subtitulo: 'Druida — Círculo del Pastor · Orca (Neutral Buena)', xp: 68500,
  clases: [{ nombre: 'Druid', dado: 8, nivelInicial: 9, caster: 'full' }],
  hpBase: 66, velocidad: 30, habilidadAtaque: 'STR', habilidadConjuro: 'WIS',
  atributos: { STR: 13, DEX: 14, CON: 14, INT: 12, WIS: 20, CHA: 12 },
  salvaciones: ['INT', 'WIS'],
  habilidades: { 'Animal Handling': 'comp', 'Insight': 'exp', 'Medicine': 'comp', 'Nature': 'comp', 'Perception': 'comp', 'Religion': 'comp', 'Survival': 'comp' },
  ca: { fija: 17 },
  ataques: [
    { nombre: 'Quarterstaff', habilidad: 'STR', dano: { count: 1, sides: 6, mod: 1 }, textoDano: '1d6 + 1 B', notas: 'Versátil (1d8)' },
    { nombre: 'Shillelagh', habilidad: 'WIS', dano: { count: 1, sides: 8, mod: 'WIS' }, textoDano: '1d8 + WIS B', notas: 'Acción adicional', extras: [{ nombre: 'Elemental Fury', icono: '🔥', dado: { count: 1, sides: 6 } }] },
  ],
  hechizos: [
    { nombre: 'Guidance', nivel: 0, tiempo: '1 Acc', alcance: 'Touch', area: '', resumen: 'Suma 1d4 a un chequeo.', duracion: '1 min, Conc.', formula: null, slotCost: null, concentracion: true, ataque: null },
    { nombre: 'Cure Wounds', nivel: 1, tiempo: '1 Acc', alcance: 'Touch', area: '', resumen: 'Cura 2d8 + 5.', duracion: 'Instantáneo', formula: { count: 2, sides: 8, mod: 5 }, slotCost: 1, upcast: { tipo: 'dado', nivelBase: 1, dado: { count: 1, sides: 8 } }, ataque: null },
    { nombre: 'Faerie Fire', nivel: 1, tiempo: '1 Acc', alcance: '60 ft', area: 'Cubo de 20 ft', resumen: 'Ventaja en ataques contra afectados.', duracion: '1 min, Conc.', formula: null, slotCost: 1, concentracion: true, ataque: { tipo: 'salvacion', habilidad: 'DEX', dc: 17, dcAuto: true } },
  ],
  inventario: [
    { nombre: 'Studded Leather Armor', cantidad: 1, descripcion: '', equipado: true, categoria: 'armadura', consumible: false, modAC: 12, dexCap: null },
    { nombre: 'Poción de curación', cantidad: 2, descripcion: '2d4+2 PG', equipado: false, categoria: 'general', consumible: true },
  ],
  reputacion: [{ faccion: 'Círculo de Druidas', valor: 3, descripcion: '' }],
  recursos: [
    { id: 'ws', tipo: 'pips', nombre: 'Forma Salvaje', icono: '🐾', max: (c) => (c.clase('Druid') >= 6 ? 3 : 2), prefijo: 'ws-use-', recarga: 'corto', desc: 'Máximo 2 (3 desde el nivel 6).' },
    { id: 'kit', tipo: 'pool', nombre: 'Botiquín', icono: '🩹', max: () => 10, campo: 'healer-kit-cur', recarga: 'largo', pasos: [-1, 1], inicial: 10 },
  ],
  rasgos: [
    { id: 'txt-feat-demo-1', tag: 'Clase', titulo: 'Wild Shape', html: 'Te transformás en una bestia.' },
  ],
  secciones: [{ id: 'familiares', icono: '🐾', titulo: 'Familiares', html: '<p>Sección propia de ejemplo.</p>' }],
};

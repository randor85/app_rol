/*
 * rasgos_data.js — biblioteca integrada de rasgos (v102.0): los recursos y efectos que el motor ya sabe manejar, por clase, subclase o especie.
 *
 * Solo MECÁNICA condensada en español (usos, cuándo se recargan, qué número suma); nada de texto literal de libros. Aquí van únicamente rasgos
 * del SRD (CC-BY-4.0); los de libros que no son SRD se cargan en la biblioteca global (biblioteca/rasgos_custom) con acceso de administrador.
 * Forma de cada entrada: ver la cabecera de ficha-rasgos.js. Los textos admiten marcadores: {{mod:WIS}}, {{prof}}, {{cd:CON}}, {{nivel:Clase*5}}, {{nivel:Rogue/2}}…
 * El creador de personajes agrega solas las entradas de la clase, la subclase y la especie elegidas (hasta el nivel del personaje); en la ficha están
 * en «📚 Biblioteca». Los recursos que ya trae classes_data.js (Ki, Channel Divinity, Lay on Hands, Rage, Sorcery Points…) NO se repiten aquí.
 */
const RASGOS_BASE = [
  // ---------- clases ----------
  { id: 'base_wild_shape', nombre: 'Wild Shape', icono: '🐾', origen: { tipo: 'clase', nombre: 'Druid' }, nivel: 2,
    texto: 'Te transformas en una bestia que conozcas. Los usos dependen del nivel de Druida ({{nivel:Druid}}); recuperas uno con un descanso corto y todos con uno largo.',
    recurso: { tipo: 'pips', max: { tabla: { 2: 2, 6: 3, 17: 4 }, clase: 'Druid' }, recarga: 'largo', icono: '🐾', desc: 'Recuperas un uso con un descanso corto y todos con uno largo.' } },
  { id: 'base_arcane_recovery', nombre: 'Arcane Recovery', icono: '📖', origen: { tipo: 'clase', nombre: 'Wizard' }, nivel: 1,
    texto: 'Una vez al día, al terminar un descanso corto, recuperas espacios de conjuro cuyos niveles sumen como máximo {{nivel:Wizard/2}} (la mitad de tu nivel de Mago, hacia arriba); ninguno puede ser de nivel 6 o más.',
    recurso: { tipo: 'pips', max: { fijo: 1 }, recarga: 'largo', icono: '📖', desc: 'Una vez al día, tras un descanso corto.' } },
  { id: 'base_divine_sense', nombre: 'Divine Sense', icono: '👁️', origen: { tipo: 'clase', nombre: 'Paladin' }, nivel: 1,
    texto: 'Con una acción detectas celestiales, infernales y no muertos cercanos. Usos: 1 + mod. de Carisma ({{mod:CHA}}), mínimo 1, por descanso largo.',
    recurso: { tipo: 'pips', max: { modificador: 'CHA', min: 1, mas: 1 }, recarga: 'largo', icono: '👁️' } },
  { id: 'base_aura_of_protection', nombre: 'Aura of Protection', icono: '🛡️', origen: { tipo: 'clase', nombre: 'Paladin' }, nivel: 6,
    texto: 'Tú y tus aliados cercanos suman tu modificador de Carisma ({{mod:CHA}}, mínimo +1) a las salvaciones mientras estés consciente.',
    efectos: [{ tipo: 'plano', objetivo: 'salvaciones', valor: { de: 'modificador', hab: 'CHA', min: 1 } }] },
  { id: 'base_favored_enemy', nombre: 'Favored Enemy', icono: '🏹', origen: { tipo: 'clase', nombre: 'Ranger' }, nivel: 1,
    texto: 'Hunter\'s Mark siempre preparado y sin gastar espacio: lanzamientos gratis según tu nivel de Explorador ({{nivel:Ranger}}).',
    recurso: { tipo: 'pips', max: { tabla: { 1: 2, 5: 3, 9: 4, 13: 5, 17: 6 }, clase: 'Ranger' }, recarga: 'largo', icono: '🏹', hechizos: ["Hunter's Mark"] } },

  // ---------- subclases ----------
  { id: 'base_warding_flare', nombre: 'Warding Flare', icono: '🔆', origen: { tipo: 'subclase', nombre: 'Light Domain' }, nivel: 1,
    texto: 'Como reacción, impones desventaja al ataque de una criatura que veas. Usos: mod. de Sabiduría ({{mod:WIS}}, mínimo 1) por descanso largo.',
    recurso: { tipo: 'pips', max: { modificador: 'WIS', min: 1 }, recarga: 'largo', icono: '🔆' } },

  // ---------- especies ----------
  { id: 'base_orc_adrenaline_rush', nombre: 'Adrenaline Rush', icono: '💢', origen: { tipo: 'especie', nombre: 'Orc' }, nivel: 0,
    texto: 'Con una acción adicional haces Dash y ganas PG temporales iguales a tu bono de competencia ({{prof}}). Usos: tu bono de competencia; se recuperan con un descanso corto o largo.',
    recurso: { tipo: 'pips', max: { competencia: true, mult: 1 }, recarga: 'ambos', icono: '💢' } },
  { id: 'base_orc_relentless_endurance', nombre: 'Relentless Endurance', icono: '🛡️', origen: { tipo: 'especie', nombre: 'Orc' }, nivel: 0,
    texto: 'Una vez por descanso largo, si te reducen a 0 PG sin matarte, te quedas con 1 PG.',
    recurso: { tipo: 'pips', max: { fijo: 1 }, recarga: 'largo', icono: '🛡️' } },
  { id: 'base_dragonborn_breath_weapon', nombre: 'Breath Weapon', icono: '🔥', origen: { tipo: 'especie', nombre: 'Dragonborn' }, nivel: 0,
    texto: 'En lugar de un ataque de tu acción Atacar, exhalas energía: salvación de Destreza, CD {{cd:CON}}. Usos: tu bono de competencia por descanso largo.',
    recurso: { tipo: 'pips', max: { competencia: true, mult: 1 }, recarga: 'largo', icono: '🔥' } },
];

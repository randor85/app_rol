/*
 * coc_data.js — datos de referencia para fichas de Call of Cthulhu (7.ª edición): características, lista de habilidades con su valor base,
 * fórmulas de puntos de ocupación, modificadores por edad y armas de ejemplo.
 *
 * Son números y nombres de juego (sin texto del manual): el creador de investigadores los usa como punto de partida y todo se puede editar en la
 * ficha. Si algo no coincide con tu manual, corrígelo desde la ficha (habilidades y armas son listas editables).
 * Valor base: número, o fórmula con características: 'dex/2' (Esquivar), 'edu' (Idioma propio).
 */
const COC_CARACTERISTICAS = [
  { id: 'str', abrev: 'STR', nombre: 'Fuerza' },
  { id: 'con', abrev: 'CON', nombre: 'Constitución' },
  { id: 'siz', abrev: 'SIZ', nombre: 'Tamaño' },
  { id: 'dex', abrev: 'DEX', nombre: 'Destreza' },
  { id: 'app', abrev: 'APP', nombre: 'Aspecto' },
  { id: 'int', abrev: 'INT', nombre: 'Inteligencia' },
  { id: 'pow', abrev: 'POW', nombre: 'Poder' },
  { id: 'edu', abrev: 'EDU', nombre: 'Educación' },
];

// esp: true = admite especialidad (Arte/Artesanía, Ciencia, Idioma, Lucha, Armas de fuego, Pilotar, Supervivencia).
const COC_HABILIDADES = [
  { id: 'accounting', es: 'Contabilidad', en: 'Accounting', base: 5 },
  { id: 'anthropology', es: 'Antropología', en: 'Anthropology', base: 1 },
  { id: 'appraise', es: 'Tasar', en: 'Appraise', base: 5 },
  { id: 'archaeology', es: 'Arqueología', en: 'Archaeology', base: 1 },
  { id: 'art_craft', es: 'Arte/Artesanía', en: 'Art/Craft', base: 5, esp: true },
  { id: 'charm', es: 'Encanto', en: 'Charm', base: 15 },
  { id: 'climb', es: 'Trepar', en: 'Climb', base: 20 },
  { id: 'credit_rating', es: 'Nivel de Crédito', en: 'Credit Rating', base: 0 },
  { id: 'cthulhu_mythos', es: 'Mitos de Cthulhu', en: 'Cthulhu Mythos', base: 0 },
  { id: 'disguise', es: 'Disfrazarse', en: 'Disguise', base: 5 },
  { id: 'dodge', es: 'Esquivar', en: 'Dodge', base: 'dex/2' },
  { id: 'drive_auto', es: 'Conducir automóvil', en: 'Drive Auto', base: 20 },
  { id: 'elec_repair', es: 'Reparar electricidad', en: 'Electrical Repair', base: 10 },
  { id: 'fast_talk', es: 'Charlatanería', en: 'Fast Talk', base: 5 },
  { id: 'fighting_brawl', es: 'Lucha: Pelea', en: 'Fighting: Brawl', base: 25, esp: true },
  { id: 'firearms_handgun', es: 'Armas de fuego: Pistola', en: 'Firearms: Handgun', base: 20, esp: true },
  { id: 'firearms_rifle', es: 'Armas de fuego: Rifle/Escopeta', en: 'Firearms: Rifle/Shotgun', base: 25, esp: true },
  { id: 'first_aid', es: 'Primeros Auxilios', en: 'First Aid', base: 30 },
  { id: 'history', es: 'Historia', en: 'History', base: 5 },
  { id: 'intimidate', es: 'Intimidar', en: 'Intimidate', base: 15 },
  { id: 'jump', es: 'Saltar', en: 'Jump', base: 20 },
  { id: 'language_other', es: 'Idioma (otro)', en: 'Language (Other)', base: 1, esp: true },
  { id: 'language_own', es: 'Idioma (propio)', en: 'Language (Own)', base: 'edu', esp: true },
  { id: 'law', es: 'Derecho', en: 'Law', base: 5 },
  { id: 'library_use', es: 'Buscar en Biblioteca', en: 'Library Use', base: 20 },
  { id: 'listen', es: 'Escuchar', en: 'Listen', base: 20 },
  { id: 'locksmith', es: 'Cerrajería', en: 'Locksmith', base: 1 },
  { id: 'mech_repair', es: 'Reparar mecánica', en: 'Mechanical Repair', base: 10 },
  { id: 'medicine', es: 'Medicina', en: 'Medicine', base: 1 },
  { id: 'natural_world', es: 'Mundo Natural', en: 'Natural World', base: 10 },
  { id: 'navigate', es: 'Navegar', en: 'Navigate', base: 10 },
  { id: 'occult', es: 'Ocultismo', en: 'Occult', base: 5 },
  { id: 'op_hv_machine', es: 'Operar maquinaria pesada', en: 'Operate Heavy Machinery', base: 1 },
  { id: 'persuade', es: 'Persuasión', en: 'Persuade', base: 10 },
  { id: 'pilot', es: 'Pilotar', en: 'Pilot', base: 1, esp: true },
  { id: 'psychology', es: 'Psicología', en: 'Psychology', base: 10 },
  { id: 'psychoanalysis', es: 'Psicoanálisis', en: 'Psychoanalysis', base: 1 },
  { id: 'ride', es: 'Equitación', en: 'Ride', base: 5 },
  { id: 'science', es: 'Ciencia', en: 'Science', base: 1, esp: true },
  { id: 'sleight_of_hand', es: 'Juego de manos', en: 'Sleight of Hand', base: 10 },
  { id: 'spot_hidden', es: 'Descubrir', en: 'Spot Hidden', base: 25 },
  { id: 'stealth', es: 'Sigilo', en: 'Stealth', base: 20 },
  { id: 'survival', es: 'Supervivencia', en: 'Survival', base: 10, esp: true },
  { id: 'swim', es: 'Nadar', en: 'Swim', base: 20 },
  { id: 'throw', es: 'Lanzar', en: 'Throw', base: 20 },
  { id: 'track', es: 'Rastrear', en: 'Track', base: 10 },
];

// Puntos de ocupación: cada opción es una fórmula sobre las características (valores ya finales).
const COC_PUNTOS_OCUPACION = [
  { id: 'edu4', texto: 'EDU × 4', calc: (c) => c.edu * 4 },
  { id: 'edu2_app2', texto: 'EDU × 2 + APP × 2', calc: (c) => c.edu * 2 + c.app * 2 },
  { id: 'edu2_dex2', texto: 'EDU × 2 + DEX × 2', calc: (c) => c.edu * 2 + c.dex * 2 },
  { id: 'edu2_str2', texto: 'EDU × 2 + STR × 2', calc: (c) => c.edu * 2 + c.str * 2 },
  { id: 'edu2_pow2', texto: 'EDU × 2 + POW × 2', calc: (c) => c.edu * 2 + c.pow * 2 },
  { id: 'edu2_dexstr2', texto: 'EDU × 2 + (DEX o STR, el mayor) × 2', calc: (c) => c.edu * 2 + Math.max(c.dex, c.str) * 2 },
  { id: 'edu2_appdexstr2', texto: 'EDU × 2 + (APP, DEX o STR, el mayor) × 2', calc: (c) => c.edu * 2 + Math.max(c.app, c.dex, c.str) * 2 },
  { id: 'edu2_appstr2', texto: 'EDU × 2 + (APP o STR, el mayor) × 2', calc: (c) => c.edu * 2 + Math.max(c.app, c.str) * 2 },
];

// Edad al crear el investigador (rangos de la 7.ª edición): mejoras de EDU, reducción repartida entre STR/CON/DEX (o STR/SIZ de 15 a 19),
// reducción de APP y de MOV. De 15 a 19: EDU −5, y tirada de Suerte doble (la mejor).
const COC_EDADES = [
  { desde: 15, hasta: 19, mejorasEdu: 0, reparto: 5, repartoEn: 'STR y SIZ', edu: -5, app: 0, mov: 0, suerteDoble: true },
  { desde: 20, hasta: 39, mejorasEdu: 1, reparto: 0, edu: 0, app: 0, mov: 0 },
  { desde: 40, hasta: 49, mejorasEdu: 2, reparto: 5, repartoEn: 'STR, CON o DEX', edu: 0, app: -5, mov: -1 },
  { desde: 50, hasta: 59, mejorasEdu: 3, reparto: 10, repartoEn: 'STR, CON o DEX', edu: 0, app: -10, mov: -2 },
  { desde: 60, hasta: 69, mejorasEdu: 4, reparto: 20, repartoEn: 'STR, CON o DEX', edu: 0, app: -15, mov: -3 },
  { desde: 70, hasta: 79, mejorasEdu: 4, reparto: 40, repartoEn: 'STR, CON o DEX', edu: 0, app: -20, mov: -4 },
  { desde: 80, hasta: 89, mejorasEdu: 4, reparto: 80, repartoEn: 'STR, CON o DEX', edu: 0, app: -25, mov: -5 },
];

// Armas de ejemplo (valores de referencia; ajústalos con tu manual). bono: 'completo' | 'medio' | '' (bono de daño en cuerpo a cuerpo).
const COC_ARMAS = [
  { nombre: 'Pelea (sin armas)', habilidad: 'fighting_brawl', dano: '1d3', alcance: 'Contacto', ataques: '1', bono: 'completo', empala: false, notas: 'Puñetazo, patada, cabezazo' },
  { nombre: 'Cuchillo mediano', habilidad: 'fighting_brawl', dano: '1d4+2', alcance: 'Contacto', ataques: '1', bono: 'completo', empala: true, notas: '' },
  { nombre: 'Bate / garrote', habilidad: 'fighting_brawl', dano: '1d8', alcance: 'Contacto', ataques: '1', bono: 'completo', empala: false, notas: '' },
  { nombre: 'Pistola .22', habilidad: 'firearms_handgun', dano: '1d6', alcance: '10 yardas', ataques: '1', bono: '', empala: true, notas: '6 balas' },
  { nombre: 'Revólver .38', habilidad: 'firearms_handgun', dano: '1d10', alcance: '15 yardas', ataques: '1', bono: '', empala: true, notas: '6 balas' },
  { nombre: 'Pistola .45', habilidad: 'firearms_handgun', dano: '1d10+2', alcance: '15 yardas', ataques: '1', bono: '', empala: true, notas: '7 balas' },
  { nombre: 'Escopeta calibre 12', habilidad: 'firearms_rifle', dano: '4d6', alcance: '10 yardas (2d6 a 20, 1d6 a 50)', ataques: '1 o 2', bono: '', empala: true, notas: '2 cartuchos' },
  { nombre: 'Rifle de caza', habilidad: 'firearms_rifle', dano: '2d6+4', alcance: '110 yardas', ataques: '1', bono: '', empala: true, notas: '' },
];

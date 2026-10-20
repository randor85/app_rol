/*
 * personajes/fiona_faraway.js — datos de Fiona Faraway para la carcasa única (ficha.html?pj=fiona_faraway).
 *
 * Extraído de fiona_faraway.html (la ficha viva sigue siendo la referencia dorada). Las claves de datos (hp-cur, hd-N,
 * ws-use-N, slot-N-cur, …) son las MISMAS que ya guarda Firebase, así que los datos reales siguen valiendo.
 * Lo que no está aquí es del motor común: bonos de competencia, saves, skills, CA, CD, espacios y dados de golpe se CALCULAN.
 * Forma documentada en ficha-shell.js.
 */
window.PERSONAJES = window.PERSONAJES || {};
PERSONAJES.fiona_faraway = {
  id: 'fiona_faraway',
  nombre: 'Fiona Faraway',
  sistema: 'dnd',
  paleta: 'bosque',
  subtitulo: 'Druid — Circle of the Shepherd | Orc (Neutral Buena)',
  xp: 49500,
  clases: [{ nombre: 'Druid', dado: 8, nivelInicial: 8, caster: 'full', subclase: 'Shepherd' }],
  hpBase: 59,                    // PG máximos a nivel 8; la subida a 9 suma su hpGanado desde subidas-nivel-registro
  velocidad: 30,
  habilidadAtaque: 'STR',
  habilidadConjuro: 'WIS',
  atributos: { STR: 13, DEX: 14, CON: 14, INT: 12, WIS: 20, CHA: 12 },
  salvaciones: ['INT', 'WIS'],
  habilidades: { 'Animal Handling': 'comp', 'Insight': 'comp', 'Medicine': 'comp', 'Nature': 'comp', 'Perception': 'comp', 'Religion': 'comp', 'Survival': 'comp' },
  competencias: "• <strong>Armaduras:</strong> Ligera, Media, Escudos. <br>• <strong>Armas:</strong> Armas Simples, Armas Marciales. <br>• <strong>Herramientas:</strong> Herbalism Kit, Healer's Kit. <br>• <strong>Idiomas:</strong> Common, Druidic, Goblin, Orc.",
  // Elemental Fury: +1d6 de fuego o frío, una vez por turno, con ataques de arma y de Wild Shape (el motor agrega el botón a cada ataque y a cada forma marcada).
  danoExtra: [{ nombre: 'Elemental Fury', icono: '🔥❄️', dado: { count: 1, sides: 6 }, texto: 'Una vez por turno al impactar: +1d6 de daño de fuego o de frío (elige el tipo antes de tirar).', grupos: ['ataques', 'wild-shape'] }],
  ca: { fija: 17 },              // CA fija mientras no haya armadura/escudo equipados; al equipar se calcula sola

  ataques: [
    { nombre: 'Quarterstaff', habilidad: 'STR', dano: { count: 1, sides: 6, mod: 'STR' }, textoDano: '1d6 + STR contundente', notas: 'Melee, Versátil (1d8)' },
    { nombre: 'Shillelagh (Bastón Mágico)', habilidad: 'WIS', dano: { count: 1, sides: 8, mod: 'WIS' }, textoDano: '1d8 + WIS contundente (+1d6 Fire/Cold)', notas: 'Acción adicional; usa WIS. +1d6 elemental por Elemental Fury 1/turno' },
    { nombre: 'Light Crossbow', habilidad: 'DEX', dano: { count: 1, sides: 8, mod: 'DEX' }, textoDano: '1d8 + DEX perforante', notas: 'Rango 80/320 ft, Cargando, 2H' },
    { nombre: 'Heavy Crossbow', habilidad: 'DEX', dano: { count: 1, sides: 10, mod: 'DEX' }, textoDano: '1d10 + DEX perforante', notas: 'Rango 100/400 ft, Cargando, Pesada, 2H' },
    { nombre: 'Splinter Arrows', habilidad: 'DEX', dano: { count: 1, sides: 6, mod: { hab: 'DEX', prof: true } }, textoDano: '1d6 + Competencia + DEX perforante', notas: 'Cono 60 ft, elige hasta 4 criaturas y realiza ataques a distancia. Poco común.' },
  ],

  // Buffs personalizados (interruptores propios; ver FichaComun.iniciarBuffsPersonales). Semilla: solo se guarda si todavía no hay lista.
  buffs: [
    { nombre: 'Tótem de Unicornio', icono: '🦄', activo: false,
      descripcion: 'Spirit Totem (Unicorn): suma a las curaciones de tus hechizos tu nivel de Druida.',
      avisarGrupo: { texto: 'las curaciones de Fiona dan PG extra' },
      efectos: [{ tipo: 'plano', objetivo: 'curacion', valor: { de: 'nivelClase', clase: 'Druid' }, cuando: { hechizo: { etiqueta: 'curación' } } }] },
  ],

  efectosManuales: [
    { id: 'buff-bless', nombre: 'Bless', icono: '✨', texto: '+1d4 ataques y salvaciones', tipo: 'buff' },
    { id: 'debuff-bane', nombre: 'Bane', icono: '💀', texto: '−1d4 ataques y salvaciones', tipo: 'debuff' },
    { id: 'buff-guidance', nombre: 'Guidance', icono: '📜', texto: '+1d4 a una prueba', tipo: 'buff' },
    { id: 'buff-haste', nombre: 'Haste', icono: '⚡', texto: '+2 CA, doble velocidad', tipo: 'buff' },
  ],

  recursos: [
    { id: 'ws', tipo: 'pips', nombre: 'Wild Shape', icono: '🐾', max: 2, prefijo: 'ws-use-', recarga: 'corto', desc: '2 usos por descanso corto o largo.' },
    { id: 'totem', tipo: 'pips', nombre: 'Spirit Totem', icono: '🦌', max: 1, prefijo: 'totem-use-', recarga: 'corto', desc: '1 uso por descanso.' },
    { id: 'kit', tipo: 'pool', nombre: "Healer's Kit (usos restantes)", icono: '🩹', max: 10, campo: 'healer-kit-cur', recarga: null, pasos: [-1, 1], inicial: 10, desc: 'No se repone con el descanso: se compra o se repone a mano.' },
    { id: 'adr', tipo: 'pips', nombre: 'Adrenaline Rush (Orc)', icono: '💢', max: 3, prefijo: 'adr-use-', recarga: 'largo', desc: '3 usos por descanso largo.' },
    { id: 'relentless', tipo: 'pips', nombre: 'Relentless Endurance (Orc)', icono: '🛡️', max: 1, prefijo: 'relentless-use-', recarga: 'largo', desc: '1 uso por descanso largo.' },
    { id: 'fey', tipo: 'pips', nombre: 'Fey-Touched (lanzamientos gratis)', icono: '✨', ids: ['fey-misty', 'fey-command'], etiquetas: ['Misty Step', 'Command'], hechizos: ['Misty Step', 'Command'], recarga: 'largo', desc: 'Una vez cada uno por descanso largo.' },
  ],

  hechizos: [
    {
      "nombre": "Poison Spray",
      "nivel": 0,
      "tiempo": "1 Acc",
      "alcance": "30 ft",
      "area": "",
      "resumen": "CON save DC <span class=\"js-calc\" data-calc=\"cd\">17</span>; 2d12 poison damage (cantrip a nivel de personaje 8; escala a 3d12 en nivel 11 y 4d12 en nivel 17).",
      "duracion": "Instantáneo",
      "formula": {
        "count": 2,
        "sides": 12,
        "mod": 0
      },
      "slotCost": null,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "CON",
        "dc": 16,
        "dcAuto": true
      }
    },
    {
      "nombre": "Shillelagh",
      "nivel": 0,
      "tiempo": "1 B.Acc",
      "alcance": "Touch",
      "area": "",
      "resumen": "Arma usa WIS, 1d8 bludgeoning.",
      "duracion": "1 min",
      "formula": {
        "count": 1,
        "sides": 8,
        "mod": 5
      },
      "slotCost": null,
      "ataque": null
    },
    {
      "nombre": "Guidance",
      "nivel": 0,
      "tiempo": "1 Acc",
      "alcance": "Touch",
      "area": "",
      "resumen": "Objetivo suma 1d4 a un ability check.",
      "duracion": "1 min, Conc.",
      "formula": {
        "count": 1,
        "sides": 4,
        "mod": 0
      },
      "slotCost": null,
      "ataque": null
    },
    {
      "nombre": "Cure Wounds (2024)",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "Touch",
      "area": "",
      "resumen": "Cura 2d8 + 5 (WIS). Con Unicornio Totem activo: +8 HP fijo adicional (no modelado automáticamente, súmalo a mano).",
      "duracion": "Instantáneo",
      "formula": {
        "count": 2,
        "sides": 8,
        "mod": 5
      },
      "slotCost": 1,
      "upcast": {
        "tipo": "dado",
        "nivelBase": 1,
        "dado": {
          "count": 2,
          "sides": 8
        }
      },
      "ataque": null
    },
    {
      "nombre": "Healing Word (2024)",
      "nivel": 1,
      "tiempo": "1 B.Acc",
      "alcance": "60 ft",
      "area": "",
      "resumen": "Cura 2d4 + 5 (WIS). Con Unicornio Totem activo: +8 HP fijo adicional (no modelado automáticamente, súmalo a mano).",
      "duracion": "Instantáneo",
      "formula": {
        "count": 2,
        "sides": 4,
        "mod": 5
      },
      "slotCost": 1,
      "upcast": {
        "tipo": "dado",
        "nivelBase": 1,
        "dado": {
          "count": 2,
          "sides": 4
        }
      },
      "ataque": null
    },
    {
      "nombre": "Faerie Fire",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "60 ft",
      "area": "",
      "resumen": "DEX save DC <span class=\"js-calc\" data-calc=\"cd\">17</span>. Ventaja en ataques contra afectados; impide invisibilidad.",
      "duracion": "1 min, Conc.",
      "formula": null,
      "slotCost": 1,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "DEX",
        "dc": 16,
        "dcAuto": true
      }
    },
    {
      "nombre": "Command",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "60 ft",
      "area": "",
      "resumen": "WIS save DC <span class=\"js-calc\" data-calc=\"cd\">17</span>. Orden de 1 palabra: Approach, Drop, Flee, Grovel, Halt.",
      "duracion": "1 Ronda",
      "formula": null,
      "slotCost": 1,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "WIS",
        "dc": 16,
        "dcAuto": true
      }
    },
    {
      "nombre": "Hold Person",
      "nivel": 2,
      "tiempo": "1 Acc",
      "alcance": "60 ft",
      "area": "",
      "resumen": "Humanoide; WIS save DC <span class=\"js-calc\" data-calc=\"cd\">17</span> o Paralyzed. Repite save al final de cada turno.",
      "duracion": "1 min, Conc.",
      "formula": null,
      "slotCost": 2,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "WIS",
        "dc": 16,
        "dcAuto": true
      }
    },
    {
      "nombre": "Lesser Restoration",
      "nivel": 2,
      "tiempo": "1 Acc",
      "alcance": "Touch",
      "area": "",
      "resumen": "Termina condición: Blinded, Deafened, Paralyzed o Poisoned.",
      "duracion": "Instantáneo",
      "formula": null,
      "slotCost": 2,
      "ataque": null
    },
    {
      "nombre": "Summon Beast",
      "nivel": 2,
      "tiempo": "1 Acc",
      "alcance": "90 ft",
      "area": "",
      "resumen": "Invoca espíritu bestial (Air, Land, Water). Ver bloque de estadísticas en Sección 7 para los valores exactos de cada nivel.",
      "duracion": "1 hora, Conc.",
      "formula": null,
      "slotCost": 2,
      "upcast": {
        "tipo": "tabla",
        "nivelBase": 2,
        "tabla": {
          "2": "Espíritu Bestia nivel base — ver bloque de estadísticas 'Beast Spirit' para nivel de espacio 2.",
          "3": "Ver bloque de estadísticas 'Beast Spirit' para nivel de espacio 3 (HP/ataque/daño mayores).",
          "4": "Ver bloque de estadísticas 'Beast Spirit' para nivel de espacio 4.",
          "5": "Ver bloque de estadísticas 'Beast Spirit' para nivel de espacio 5.",
          "6": "Ver bloque de estadísticas 'Beast Spirit' para nivel de espacio 6.",
          "7": "Ver bloque de estadísticas 'Beast Spirit' para nivel de espacio 7.",
          "8": "Ver bloque de estadísticas 'Beast Spirit' para nivel de espacio 8.",
          "9": "Ver bloque de estadísticas 'Beast Spirit' para nivel de espacio 9."
        }
      },
      "ataque": null
    },
    {
      "nombre": "Misty Step",
      "nivel": 2,
      "tiempo": "1 B.Acc",
      "alcance": "Self",
      "area": "",
      "resumen": "Teleport 30 ft a espacio visible desocupado.",
      "duracion": "Instantáneo",
      "formula": null,
      "slotCost": 2,
      "ataque": null
    },
    {
      "nombre": "Conjure Animals (2024)",
      "nivel": 3,
      "tiempo": "1 Acc",
      "alcance": "60 ft",
      "area": "",
      "resumen": "Pack espectral Large. DEX save DC <span class=\"js-calc\" data-calc=\"cd\">17</span> o daño al mover/entrar.",
      "duracion": "10 min, Conc.",
      "formula": {
        "count": 3,
        "sides": 10,
        "mod": 0
      },
      "slotCost": 3,
      "upcast": {
        "tipo": "dado",
        "nivelBase": 3,
        "dado": {
          "count": 1,
          "sides": 10
        }
      },
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "DEX",
        "dc": 16,
        "dcAuto": true
      }
    },
    {
      "nombre": "Summon Fey",
      "nivel": 3,
      "tiempo": "1 Acc",
      "alcance": "90 ft",
      "area": "",
      "resumen": "Invoca espíritu fey (Fuming, Mirthful, Tricksy). Ver bloque de estadísticas en Sección 7 para los valores exactos de cada nivel.",
      "duracion": "1 hora, Conc.",
      "formula": null,
      "slotCost": 3,
      "upcast": {
        "tipo": "tabla",
        "nivelBase": 3,
        "tabla": {
          "3": "Espíritu Feérico nivel base — ver bloque de estadísticas 'Fey Spirit' para nivel de espacio 3.",
          "4": "Ver bloque de estadísticas 'Fey Spirit' para nivel de espacio 4 (HP/ataque/daño mayores).",
          "5": "Ver bloque de estadísticas 'Fey Spirit' para nivel de espacio 5.",
          "6": "Ver bloque de estadísticas 'Fey Spirit' para nivel de espacio 6.",
          "7": "Ver bloque de estadísticas 'Fey Spirit' para nivel de espacio 7.",
          "8": "Ver bloque de estadísticas 'Fey Spirit' para nivel de espacio 8.",
          "9": "Ver bloque de estadísticas 'Fey Spirit' para nivel de espacio 9."
        }
      },
      "ataque": null
    },
    {
      "nombre": "Conjure Woodland Beings",
      "nivel": 4,
      "tiempo": "1 Acc",
      "alcance": "60 ft",
      "area": "",
      "resumen": "Invoca criaturas Fey de CR total según elección/DM (1 CR 2, 2 CR 1, 4 CR 1/2, 8 CR 1/4). Ver Sección 7 para Stat Blocks completos.",
      "duracion": "1 hora, Conc.",
      "formula": null,
      "slotCost": 4,
      "upcast": {
        "tipo": "tabla",
        "nivelBase": 4,
        "tabla": {
          "4": "CR total 4 en espíritus feéricos (o combinación de menor CR, proporcional).",
          "5": "El doble que a nivel 4.",
          "6": "El triple que a nivel 4.",
          "7": "Cuádruple que a nivel 4.",
          "8": "Quíntuple que a nivel 4.",
          "9": "Séxtuple que a nivel 4."
        }
      },
      "ataque": null
    },
    {
      "nombre": "Giant Insect",
      "nivel": 4,
      "tiempo": "1 Acc",
      "alcance": "30 ft",
      "area": "",
      "resumen": "Transforma insectos en versiones gigantes (Centipede, Spider, Bee, Ant, Wasp).",
      "duracion": "10 min, Conc.",
      "formula": null,
      "slotCost": 4,
      "upcast": {
        "tipo": "tabla",
        "nivelBase": 4,
        "tabla": {
          "4": "Base: hasta 10 ciempiés / 3 arañas / 5 avispas / 1 escorpión gigante.",
          "5": "+1 criatura adicional transformada (respetando los límites por tipo).",
          "6": "+2 criaturas adicionales.",
          "7": "+3 criaturas adicionales.",
          "8": "+4 criaturas adicionales.",
          "9": "+5 criaturas adicionales."
        }
      },
      "ataque": null
    },
    {
      "nombre": "Grasping Vine",
      "nivel": 4,
      "tiempo": "1 B.Acc",
      "alcance": "30 ft",
      "area": "",
      "resumen": "Invoca vid. B.Acc para forzar DEX save DC <span class=\"js-calc\" data-calc=\"cd\">17</span> a criatura a 30 ft; si falla la atrae 20 ft.",
      "duracion": "1 min, Conc.",
      "formula": null,
      "slotCost": 4,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "DEX",
        "dc": 16,
        "dcAuto": true
      }
    },
    {
      "nombre": "Mass Cure Wounds",
      "nivel": 5,
      "tiempo": "1 Acción",
      "alcance": "60 ft",
      "area": "Radio de 30 ft, hasta 6 criaturas",
      "resumen": "Hasta 6 criaturas en un radio de 30 ft recuperan 3d8 + tu mod. de característica de lanzamiento HP.",
      "duracion": "Instantáneo",
      "formula": {
        "count": 3,
        "sides": 8,
        "mod": 5
      },
      "slotCost": 5,
      "ataque": null
    },
    {
      "nombre": "Insect Plague",
      "nivel": 5,
      "tiempo": "1 Acción",
      "alcance": "300 ft",
      "area": "Esfera de 20 ft de radio",
      "resumen": "Una esfera de langostas devoradoras; cada criatura ahí hace salvación de Constitución, sufriendo daño perforante (mitad si salva).",
      "duracion": "Conc., hasta 10 min",
      "formula": {
        "count": 4,
        "sides": 10,
        "mod": 0
      },
      "slotCost": 5,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "CON",
        "dc": 16,
        "dcAuto": true
      }
    }
  ],

  inventario: [
    {
      "nombre": "Backpack",
      "descripcion": "Peso: 5 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Bedroll",
      "descripcion": "Peso: 7 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Book",
      "descripcion": "Peso: 5 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Crossbow Bolt",
      "descripcion": "",
      "cantidad": 20,
      "precio": 0,
      "equipado": false,
      "categoria": "municion",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Healer's Kit",
      "descripcion": "Peso: 3 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Heavy Crossbow",
      "descripcion": "Peso: 18 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Herbalism Kit",
      "descripcion": "Peso: 3 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Oil (flask)",
      "descripcion": "Peso: 1 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Traveler's Clothes",
      "descripcion": "Peso: 4 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Quarterstaff",
      "descripcion": "Peso: 4 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Rations (1 day)",
      "descripcion": "Peso: 2 lb",
      "cantidad": 10,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Lamp",
      "descripcion": "Peso: 1 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Hempen Rope (50 feet)",
      "descripcion": "Peso: 10 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Shield",
      "descripcion": "Peso: 6 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Studded Leather Armor",
      "descripcion": "Peso: 13 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "armadura",
      "consumible": false,
      "modAC": 12,
      "dexCap": null
    },
    {
      "nombre": "Tinderbox",
      "descripcion": "Peso: 1 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Torch",
      "descripcion": "Peso: 1 lb",
      "cantidad": 10,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Waterskin",
      "descripcion": "Peso: 5 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Breastplate",
      "descripcion": "Peso: 20 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "armadura",
      "consumible": false,
      "modAC": 14,
      "dexCap": 2
    },
    {
      "nombre": "Half Plate Armor",
      "descripcion": "Peso: 40 lb",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "armadura",
      "consumible": false,
      "modAC": 15,
      "dexCap": 2
    },
    {
      "nombre": "Splinter Arrows",
      "descripcion": "",
      "cantidad": 0,
      "precio": 0,
      "equipado": false,
      "categoria": "municion",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Healing potion",
      "descripcion": "",
      "cantidad": 1,
      "precio": 0,
      "equipado": false,
      "categoria": "general",
      "consumible": true,
      "modAC": null,
      "dexCap": null
    }
  ],

  reputacion: [],

  monedas: [
    { id: 'cp-val', etiqueta: 'CP (Cobre)' }, { id: 'sp-val', etiqueta: 'SP (Plata)' }, { id: 'ep-val', etiqueta: 'EP (Electrum)' },
    { id: 'gp-val', etiqueta: 'GP (Oro)', valor: 150 }, { id: 'pp-val', etiqueta: 'PP (Platino)' },
  ],
  contadores: [{ id: 'honor-cur', etiqueta: 'Honor', icono: '🎖️' }, { id: 'rep-cur', etiqueta: 'Reputación', icono: '🌟' }],
  notaInventario: '<strong>Carga total estimada:</strong> 176 lb',

  rasgos: [
    {
      "id": "txt-feat-druida-primal-order-warden",
      "tag": "Druida",
      "titulo": "Primal Order: Warden",
      "html": "<p>Entrenamiento sagrado enfocado en el combate activo. Otorga competencia con <strong>Armaduras Medias</strong> y <strong>Armas Marciales</strong>.</p>"
    },
    {
      "id": "txt-feat-druida-druidic-amp-wild-companion",
      "tag": "Druida",
      "titulo": "Druidic & Wild Companion",
      "html": "<p>• <strong>Druidic:</strong> Idioma secreto de los druidas y mensajes ocultos.</p>\n<p>• <strong>Wild Companion:</strong> Puedes gastar un uso de Wild Shape para lanzar <em>Find Familiar</em> sin componentes materiales. El familiar es tipo Fey, dura nivel/2 horas (4 horas) y desaparece si cae a 0 HP o vuelves a usar este rasgo.</p>"
    },
    {
      "id": "txt-feat-druida-wild-shape-amp-primal-strike",
      "tag": "Druida",
      "titulo": "Wild Shape & Primal Strike",
      "html": "<p>• <strong>Wild Shape:</strong> 2 usos por descanso corto/largo. Bonus Action para transformarte en bestia dentro de tus límites. Retienes INT, WIS y CHA. Mantienes concentración con checks normales.</p>\n<p>• <strong>Primal Strike:</strong> Los ataques de tus formas bestiales cuentan como mágicos.</p>"
    },
    {
      "id": "txt-feat-druida-elemental-fury",
      "tag": "Druida",
      "titulo": "Elemental Fury",
      "html": "<p>Una vez por turno, cuando golpeas con un ataque que use tus armas o ataques de Wild Shape, añade <strong>+1d6 fire o cold damage</strong>. Anota el tipo elegido antes de tirar daño.</p>"
    },
    {
      "id": "txt-feat-shepherd-speech-of-the-woods",
      "tag": "Shepherd",
      "titulo": "Speech of the Woods",
      "html": "<p>Aprendes Sylvan. Las bestias y plantas pueden entender tu habla, y tú puedes interpretar sus ruidos y gestos simples.</p>"
    },
    {
      "id": "txt-feat-shepherd-spirit-totem",
      "tag": "Shepherd",
      "titulo": "Spirit Totem (Bonus Action)",
      "html": "<p>Invocas un espíritu incorpóreo a 60 ft con un aura de 30 ft de radio por 1 min. Se mueve 60 ft como bonus action.</p>\n<ul>\n<li><strong>🐻 Bear Spirit:</strong> Otorga <strong>13 Temp HP</strong> (Nivel 8 + WIS 5) al invocar a ti y aliados. Ventaja en checks y salvaciones de STR.</li>\n<li><strong>🦅 Hawk Spirit:</strong> Reacción para dar <em>Advantage</em> a un ataque de un aliado en el aura. Ventaja en Perception (WIS).</li>\n<li><strong>🦄 Unicorn Spirit:</strong> Ventaja en checks para detectar criaturas. Al lanzar un spell slot de curación, todas las criaturas elegidas en el aura curan <strong>+8 HP adicionales</strong> (Nivel de druida).</li>\n</ul>"
    },
    {
      "id": "txt-feat-shepherd-mighty-summoner",
      "tag": "Shepherd",
      "titulo": "Mighty Summoner",
      "html": "<p>Cada Beast o Fey invocada/creada con un conjuro gana <strong>+2 HP por Hit Die</strong> y sus ataques naturales cuentan como <strong>mágicos</strong>. *(Aplica a Summon Beast, Summon Fey, Conjure Woodland Beings y criaturas fey con HD)*.</p>"
    },
    {
      "id": "txt-feat-feat-eldritch-adept-pact-of-the-chain",
      "tag": "Feat",
      "titulo": "Eldritch Adept — Pact of the Chain",
      "html": "<p>Conoces <em>Find Familiar</em> (se lanza como ritual). Puedes elegir una forma especial: <strong>Imp, Pseudodragon, Quasit o Sprite</strong>.</p>"
    },
    {
      "id": "txt-feat-feat-fey-touched",
      "tag": "Feat",
      "titulo": "Fey-Touched",
      "html": "<p>+1 WIS incl. Aprendes <strong>Misty Step</strong> y <strong>Command</strong>. Puedes lanzar cada uno 1 vez gratis por descanso largo.</p>"
    },
    {
      "id": "txt-feat-feat-healer",
      "tag": "Feat",
      "titulo": "Healer",
      "html": "<p>• Con Healer's Kit (Acción + 1 uso del kit): estabiliza a 0 HP y recupera <strong>1 HP</strong>.</p>\n<p>• Acción + uso del kit: cura <strong>1d6 + 4 + Nivel HD</strong> (a Fiona cura <strong>1d6 + 12</strong>). 1 vez por criatura por descanso corto/largo.</p>",
      "acciones": [
        {
          "texto": "💚 Curar 1d6+12",
          "roll": "1d6+12",
          "etiqueta": "Curación Feat Healer a Fiona"
        }
      ]
    },
    {
      "id": "txt-feat-raza-orc-traits",
      "tag": "Raza",
      "titulo": "Orc Traits",
      "html": "<p>• <strong>Adrenaline Rush (3/largo):</strong> Bonus Action Dash + gana <strong>3 Temp HP</strong>.</p>\n<p>• <strong>Darkvision:</strong> Visión en la oscuridad 60 ft.</p>\n<p>• <strong>Relentless Endurance (1/largo):</strong> Al caer a 0 HP sin morir, quedas en 1 HP.</p>"
    }
  ],

  secciones: [
    { id: 'familiares', icono: '🐾', titulo: 'Familiares (Pact of the Chain) y Wild Shape', fragmento: 'personajes/fiona_faraway/familiares.html' },
    { id: 'invocaciones', icono: '🧚', titulo: 'Invocaciones y Stat Blocks — Summon Fey, Beast, Giant Insect', fragmento: 'personajes/fiona_faraway/invocaciones.html' },
    { id: 'woodland', icono: '🌲', titulo: 'Conjure Woodland Beings — Stat Blocks y Criaturas Invocables', fragmento: 'personajes/fiona_faraway/woodland.html' },
  ],

  trasfondo: { html: 'Esta sección estaba vacía en la ficha original — complétala a mano cuando quieras, se guarda automáticamente.' },
};

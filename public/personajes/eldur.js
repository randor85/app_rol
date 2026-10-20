/*
 * personajes/eldur.js — datos de Eldur Redmane para la carcasa única (ficha.html?pj=eldur).
 *
 * Extraído de eldur.html (la ficha viva sigue siendo la referencia dorada). Las claves de datos (hp-cur, hd-N, ki-cur,
 * cd-use-1, blinding-N, wf-N, racial-*, slot-N-cur, …) son las MISMAS que ya guarda Firebase.
 * Lo que no está aquí es del motor común: competencia, saves, skills, CA, CD, espacios y dados de golpe se CALCULAN.
 * Forma documentada en ficha-shell.js.
 */
window.PERSONAJES = window.PERSONAJES || {};
PERSONAJES.eldur = {
  id: 'eldur',
  nombre: 'Eldur Redmane',
  sistema: 'dnd',
  paleta: 'ascua',
  subtitulo: 'Eldur (Firelord Redmane) — Monk 5 / Cleric 2 (Light Domain) | Fire Genasi | Legal Bueno',
  xp: 49000,
  clases: [{nombre: 'Monk', dado: 8, nivelInicial: 5, caster: null, subclase: 'Way of the Sun Soul'}, {nombre: 'Cleric', dado: 8, nivelInicial: 2, caster: 'full'}],
  hpBase: 52,                    // PG máximos a Monk 5 / Cleric 2; cada subida registrada suma su hpGanado
  velocidad: 40,                 // 30 ft + Unarmored Movement (+10 ft)
  habilidadAtaque: 'DEX',        // Martial Arts
  habilidadConjuro: 'WIS',
  atributos: { STR: 8, DEX: 18, CON: 14, INT: 10, WIS: 16, CHA: 10 },
  salvaciones: ['DEX', 'WIS'],
  habilidades: { 'Acrobatics': 'comp', 'Insight': 'comp', 'Perception': 'comp', 'Performance': 'comp', 'Religion': 'comp' },
  competencias: "• <strong>Armaduras &amp; Armas:</strong> Sin armadura (Unarmored Defense), Armas Simples, Espadas Cortas, Armaduras Ligeras/Medias y Escudos.<br>\n • <strong>Herramientas:</strong> Herramientas de Artesano o Instrumento Musical.<br>\n • <strong>Idiomas:</strong> Common, Primordial (Ignan).",
  // Monk: Unarmored Defense (10 + DEX + WIS) mientras no haya armadura equipada; al equipar una, la CA se calcula desde ella.
  // Limitación conocida del motor: un escudo equipado sin armadura SUMA +2 (por reglas, el monje pierde Unarmored Defense con escudo).
  ca: { sinArmadura: () => 10 + FichaAtributos.modDe('DEX') + FichaAtributos.modDe('WIS'), texto: '10 + DEX + WIS (Unarmored Defense)' },

  // Textos derivados dentro de HTML propio (<span class="js-calc" data-calc="…">): ver aplicarJsCalc en ficha-shell.js.
  calculos: {
    cdRacial: () => 8 + FichaAtributos.modDe('CON') + FichaAtributos.profBonusActual(),     // Reach to the Blaze usa Constitución
    atkRacial: () => { const v = FichaAtributos.modDe('CON') + FichaAtributos.profBonusActual(); return (v >= 0 ? '+' : '') + v; },
    spellAtk: () => { const v = FichaAtributos.modDe('WIS') + FichaAtributos.profBonusActual(); return (v >= 0 ? '+' : '') + v; },
    clericLvl: () => FichaVitales.nivelClase('Cleric'),
    monkLvl: () => FichaVitales.nivelClase('Monk'),
    slowFall: () => 5 * FichaVitales.nivelClase('Monk'),
    caSin: () => 10 + FichaAtributos.modDe('DEX') + FichaAtributos.modDe('WIS'),
  },

  ataques: [
    {
      "nombre": "Unarmed Strike",
      "habilidad": "DEX",
      "dano": {
        "count": 1,
        "sides": 6,
        "mod": "DEX"
      },
      "html": true,
      "textoDano": "1d6 <span class=\"js-calc\" data-calc=\"mod\" data-hab=\"DEX\">0</span> contundente + 1d6 radiante",
      "notas": "Martial Arts (DEX) + Braces of Sun Fury (+1d6 Rad)",
      "extras": [
        {
          "nombre": "Sun Fury Radiant",
          "icono": "☀️",
          "dado": {
            "count": 1,
            "sides": 6
          }
        }
      ]
    },
    {
      "nombre": "Shortsword",
      "habilidad": "DEX",
      "dano": {
        "count": 1,
        "sides": 6,
        "mod": "DEX"
      },
      "html": true,
      "textoDano": "1d6 <span class=\"js-calc\" data-calc=\"mod\" data-hab=\"DEX\">0</span> perforante",
      "notas": "Finesse, Light, MonkWpn",
      "etiquetaAtaque": "Shortsword Atk"
    },
    {
      "nombre": "Radiant Sun Bolt",
      "habilidad": "DEX",
      "dano": {
        "count": 1,
        "sides": 6,
        "mod": "DEX"
      },
      "html": true,
      "textoDano": "1d6 <span class=\"js-calc\" data-calc=\"mod\" data-hab=\"DEX\">0</span> radiante",
      "notas": "Rango 30 ft; Spell Attack con DEX. (1 Ki: 2 bolts como Bonus Action)",
      "etiquetaAtaque": "Radiant Sun Bolt Atk"
    },
    {
      "nombre": "Flame Blade (Conjuro Racial)",
      "habilidad": "WIS",
      "conjuro": true,
      "dano": {
        "count": 3,
        "sides": 6,
        "mod": 0
      },
      "textoDano": "3d6 Fire",
      "notas": "Melee Spell Attack (WIS), Concentración 10 min. No material.",
      "etiquetaAtaque": "Flame Blade Atk"
    },
    {
      "nombre": "Sunfire Fist (Special Attack)",
      "habilidad": "DEX",
      "sinAtq": true,
      "bonoTexto": "1 Ki",
      "atqExtra": [
        "Sunfire Bolt 1",
        "Sunfire Bolt 2"
      ],
      "textoDano": "Bonus Action: 2 ataques a distancia (30 ft)",
      "notas": "Realiza 2 ataques con Radiant Sun Bolt como Bonus Action."
    },
    {
      "nombre": "Stunning Strike",
      "habilidad": "DEX",
      "sinAtq": true,
      "bonoTexto": "1 Ki",
      "uso": "Stunning Strike",
      "html": true,
      "textoDano": "CON Save DC <span class=\"js-calc\" data-calc=\"cd\">0</span>",
      "notas": "Al golpear Melee: el objetivo queda Stunned hasta el final de tu siguiente turno."
    },
    {
      "nombre": "Radiance of the Dawn",
      "habilidad": "WIS",
      "sinAtq": true,
      "bonoTexto": "Channel Div.",
      "html": true,
      "dano": {
        "count": 2,
        "sides": 10,
        "mod": {
          "clase": "Cleric"
        }
      },
      "textoDano": "2d10 + <span class=\"js-calc\" data-calc=\"clericLvl\">0</span> Radiant",
      "notas": "Disipa oscuridad a 30ft. CON Save DC <span class=\"js-calc\" data-calc=\"cd\">0</span> reduce a la mitad."
    },
    {
      "nombre": "Spell Attack (racial)",
      "habilidad": "CON",
      "conjuro": true,
      "textoDano": "Según conjuro racial",
      "etiquetaAtaque": "Ataque de Conjuro Racial",
      "html": true,
      "notas": "CON Mod (<span class=\"js-calc\" data-calc=\"mod\" data-hab=\"CON\">0</span>) + Prof (<span class=\"js-calc\" data-calc=\"prof\">0</span>) — Reach to the Blaze"
    }
  ],
  recursos: [
    {
      "id": "ki",
      "tipo": "pool",
      "nombre": "Puntos de Ki",
      "icono": "🔥",
      "campo": "ki-cur", "max": (c) => c.clase('Monk'),
      "recarga": "corto",
      "pasos": [
        -1,
        1
      ],
      "inicial": 5,
      "desc": "Máximo = nivel de Monje. Se recuperan con un descanso corto."
    },
    {
      "id": "cd",
      "tipo": "pips",
      "nombre": "Channel Divinity (Radiance of the Dawn o Turn Undead)",
      "icono": "✝️",
      "max": 1,
      "prefijo": "cd-use-",
      "recarga": "corto",
      "desc": "1 uso por descanso; sirve para cualquiera de las 2 opciones."
    },
    {
      "id": "blinding",
      "tipo": "pips",
      "nombre": "Blinding Light (Braces of the Sun Fury)",
      "icono": "🌞",
      "max": 2,
      "prefijo": "blinding-",
      "recarga": "corto",
      "desc": "2 usos por descanso corto."
    },
    {
      "id": "wf",
      "tipo": "pips",
      "nombre": "Warding Flare",
      "icono": "🔆",
      "max": 3,
      "prefijo": "wf-",
      "recarga": "largo",
      "desc": "3 usos por descanso largo."
    },
    {
      "id": "racial",
      "tipo": "pips",
      "nombre": "Reach to the Blaze (lanzamientos gratis)",
      "icono": "🔥",
      "ids": [
        "racial-burning-hands",
        "racial-flame-blade"
      ],
      "etiquetas": [
        "Burning Hands",
        "Flame Blade"
      ],
      "recarga": "largo",
      "desc": "Una vez cada uno por descanso largo (usan Constitución)."
    }
  ],

  efectosManuales: [
    { id: 'buff-bless', nombre: 'Bless', icono: '✨', texto: '+1d4 ataques y salvaciones', tipo: 'buff' },
    { id: 'debuff-bane', nombre: 'Bane', icono: '💀', texto: '−1d4 ataques y salvaciones', tipo: 'debuff' },
    { id: 'buff-guidance', nombre: 'Guidance', icono: '📜', texto: '+1d4 a una prueba', tipo: 'buff' },
  ],

  hechizos: [
    {
      "nombre": "Produce Flame",
      "nivel": 0,
      "tiempo": "1 Acc",
      "alcance": "Self (30ft)",
      "area": "",
      "resumen": "Racial. Luz o ataque a distancia: 2d8 fuego (cantrip a nivel de personaje 7; escala a 3d8 en nivel 11 y 4d8 en nivel 17).",
      "duracion": "10 min",
      "formula": {
        "count": 2,
        "sides": 8,
        "mod": 0
      },
      "slotCost": null,
      "concentracion": false,
      "ataque": null
    },
    {
      "nombre": "Sacred Flame",
      "nivel": 0,
      "tiempo": "1 Acc",
      "alcance": "60 ft",
      "area": "",
      "resumen": "DEX Save DC <span class=\"js-calc\" data-calc=\"cd\">14</span>; 2d8 daño radiante (ignora cobertura) — cantrip a nivel de personaje 7; escala a 3d8 en nivel 11 y 4d8 en nivel 17.",
      "duracion": "Instantáneo",
      "formula": {
        "count": 2,
        "sides": 8,
        "mod": 0
      },
      "slotCost": null,
      "concentracion": false,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "DEX",
        "dc": 14,
        "dcAuto": true
      }
    },
    {
      "nombre": "Light",
      "nivel": 0,
      "tiempo": "1 Acc",
      "alcance": "Touch",
      "area": "",
      "resumen": "Crea luz brillante en un objeto por 1 hora.",
      "duracion": "1 hora",
      "formula": null,
      "slotCost": null,
      "concentracion": false,
      "ataque": null
    },
    {
      "nombre": "Guidance",
      "nivel": 0,
      "tiempo": "1 Acc",
      "alcance": "Touch",
      "area": "",
      "resumen": "Objetivo suma 1d4 a un ability check (Concentración). Activa el buff para sumarlo a tus propias pruebas.",
      "duracion": "Conc., hasta 1 min",
      "formula": null,
      "slotCost": null,
      "concentracion": true,
      "ataque": null,
      "buff": {
        "activo": false,
        "efectos": [
          {
            "tipo": "dado",
            "objetivo": "pruebas",
            "dado": {
              "count": 1,
              "sides": 4
            }
          }
        ]
      }
    },
    {
      "nombre": "Burning Hands",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "Cono 15 ft",
      "area": "",
      "resumen": "DEX Save DC <span class=\"js-calc\" data-calc=\"cd\">14</span> (espacio de Clérigo/WIS); 3d6 daño de fuego. La versión racial gratis (1/LR, CON) está en la fila \"Burning Hands (racial)\".",
      "duracion": "Instantáneo",
      "formula": {
        "count": 3,
        "sides": 6,
        "mod": 0
      },
      "slotCost": 1,
      "concentracion": false,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "DEX",
        "dc": 14,
        "dcAuto": true
      },
      "upcast": {
        "tipo": "dado",
        "nivelBase": 1,
        "dado": {
          "count": 1,
          "sides": 6
        }
      }
    },
    {
      "nombre": "Burning Hands (racial)",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "Cono 15 ft",
      "area": "",
      "resumen": "Racial (Reach to the Blaze, 1/Descanso Largo, Constitución): DEX Save DC <span class=\"js-calc\" data-calc=\"cdRacial\">13</span>; 3d6 daño de fuego. No gasta espacio de conjuro.",
      "duracion": "Instantáneo",
      "formula": {
        "count": 3,
        "sides": 6,
        "mod": 0
      },
      "slotCost": null,
      "concentracion": false,
      "ataque": null
    },
    {
      "nombre": "Guiding Bolt",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "120 ft",
      "area": "",
      "resumen": "Ataque de conjuro (WIS + competencia); 4d6 daño radiante y otorga ventaja al siguiente ataque contra el objetivo.",
      "duracion": "1 round",
      "formula": {
        "count": 4,
        "sides": 6,
        "mod": 0
      },
      "slotCost": 1,
      "concentracion": false,
      "ataque": {
        "tipo": "ataque",
        "bonus": 6,
        "bonusAuto": true
      },
      "upcast": {
        "tipo": "dado",
        "nivelBase": 1,
        "dado": {
          "count": 1,
          "sides": 6
        }
      }
    },
    {
      "nombre": "Cure Wounds",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "Touch",
      "area": "",
      "resumen": "Cura 1d8 + 3 (WIS).",
      "duracion": "Instantáneo",
      "formula": {
        "count": 1,
        "sides": 8,
        "mod": 3
      },
      "slotCost": 1,
      "concentracion": false,
      "ataque": null,
      "upcast": {
        "tipo": "dado",
        "nivelBase": 1,
        "dado": {
          "count": 1,
          "sides": 8
        }
      }
    },
    {
      "nombre": "Faerie Fire",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "60 ft",
      "area": "Cubo de 20 ft",
      "resumen": "DEX Save DC <span class=\"js-calc\" data-calc=\"cd\">14</span>; Ventaja en ataques contra afectados (Concentración).",
      "duracion": "Conc., hasta 1 min",
      "formula": null,
      "slotCost": 1,
      "concentracion": true,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "DEX",
        "dc": 14,
        "dcAuto": true
      }
    },
    {
      "nombre": "Bless",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "30 ft",
      "area": "",
      "resumen": "Hasta 3 objetivos suman +1d4 a tiradas de ataque y salvaciones (Concentración). Activa el buff para sumarlo a tus propias tiradas.",
      "duracion": "Conc., hasta 1 min",
      "formula": null,
      "slotCost": 1,
      "concentracion": true,
      "ataque": null,
      "buff": {
        "activo": false,
        "efectos": [
          {
            "tipo": "dado",
            "objetivo": "ataque",
            "dado": {
              "count": 1,
              "sides": 4
            }
          },
          {
            "tipo": "dado",
            "objetivo": "salvaciones",
            "dado": {
              "count": 1,
              "sides": 4
            }
          }
        ]
      }
    },
    {
      "nombre": "Flame Blade",
      "nivel": 2,
      "tiempo": "1 B.Acc",
      "alcance": "Self",
      "area": "",
      "resumen": "Crea espada de fuego (Concentración); ataque de conjuro cuerpo a cuerpo (Clérigo/WIS) que inflige 3d6 fuego.",
      "duracion": "Conc., hasta 10 min",
      "formula": {
        "count": 3,
        "sides": 6,
        "mod": 0
      },
      "slotCost": 2,
      "concentracion": true,
      "ataque": {
        "tipo": "ataque",
        "bonus": 6,
        "bonusAuto": true
      }
    },
    {
      "nombre": "Flame Blade (racial)",
      "nivel": 2,
      "tiempo": "1 B.Acc",
      "alcance": "Self",
      "area": "",
      "resumen": "Racial (Reach to the Blaze, 1/Descanso Largo, Constitución): ataque de conjuro cuerpo a cuerpo <span class=\"js-calc\" data-calc=\"atkRacial\">+5</span> que inflige 3d6 fuego (Concentración). No gasta espacio de conjuro.",
      "duracion": "Conc., hasta 10 min",
      "formula": {
        "count": 3,
        "sides": 6,
        "mod": 0
      },
      "slotCost": null,
      "concentracion": true,
      "ataque": null
    }
  ],

  inventario: [
    {
      "nombre": "Amulet of Misty Step (Cuello)",
      "descripcion": "Teleportation (Acción, 1/día): teletranspórtate hasta 1 milla a un lugar que puedas ver o conozcas. Resistencia al daño de Frío.",
      "cantidad": 1,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Amulet of Blood (Cuello)",
      "descripcion": "Vampiric Leech (1/turno): al hacer daño, recuperas HP igual a la mitad del daño infligido. Usable veces/día = mod. CON (+2), recarga en descanso largo.",
      "cantidad": 1,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Boots of Combustion (Pies)",
      "descripcion": "Rocket Dash (Bonus Action): te propulsa hasta 45 ft en línea recta sin provocar ataques de oportunidad. Feather Fall: sin daño de caída desde 60 ft o menos.",
      "cantidad": 1,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Braces of the Sun Fury (Muñecas)",
      "descripcion": "Tus Unarmed Strikes infligen +1d6 de daño radiante adicional. Blinding Light (Reacción, 2/Short Rest): el atacante hace CON Save DC 15 o queda ciego hasta el final de tu siguiente turno.",
      "cantidad": 1,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": false,
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

  rasgos: [
    {
      "id": "txt-feat-monje-unarmored-defense-movement",
      "tag": "Monje",
      "titulo": "Unarmored Defense & Movement",
      "html": "<p>• <strong>AC <span class=\"js-calc\" data-calc=\"caSin\">17</span>:</strong> 10 + DEX (<span class=\"js-calc\" data-calc=\"mod\" data-hab=\"DEX\">+4</span>) + WIS (<span class=\"js-calc\" data-calc=\"mod\" data-hab=\"WIS\">+3</span>) mientras no lleves armadura ni escudo.</p>\n <p>• <strong>Speed +10ft:</strong> Movimiento base total incrementado a 40 ft.</p>\n \n<button class=\"btn-roll btn-roll-sm\" onclick=\"registrarUsoRecursoGenerico('Unarmored Defense &amp; Movement')\" style=\"margin-top:6px;\">✅ Usar</button>"
    },
    {
      "id": "txt-feat-monje-martial-arts-ki-5-pts",
      "tag": "Monje",
      "titulo": "Martial Arts & Ki (5 Pts)",
      "html": "<p>• Usa DEX para Unarmed Strikes (1d6) y realiza un Unarmed Strike como Bonus Action tras atacar.</p>\n <p>• <strong>Flurry of Blows:</strong> 1 Ki para 2 Unarmed Strikes como Bonus Action.</p>\n <p>• <strong>Patient Defense:</strong> 1 Ki para Dodge como Bonus Action.</p>\n <p>• <strong>Step of the Wind:</strong> 1 Ki para Disengage o Dash como Bonus Action, dobla distancia de salto.</p>\n \n<button class=\"btn-roll btn-roll-sm\" onclick=\"registrarUsoRecursoGenerico('Martial Arts &amp; Ki (5 Pts)')\" style=\"margin-top:6px;\">✅ Usar</button>"
    },
    {
      "id": "txt-feat-monje-extra-attack-deflect-missiles",
      "tag": "Monje",
      "titulo": "Extra Attack & Deflect Missiles",
      "html": "<p>• Ataca dos veces al tomar la acción de Atacar.</p>\n <p>• Reduce daño de ataques de proyectil a distancia por 1d10 + DEX (<span class=\"js-calc\" data-calc=\"mod\" data-hab=\"DEX\">+4</span>) + Monk Lvl (<span class=\"js-calc\" data-calc=\"monkLvl\">5</span>). Si el daño se reduce a 0, puedes <strong>atrapar el proyectil</strong> (si entra en una mano libre) y gastar <strong>1 Ki</strong> para hacer un ataque a distancia con él como parte de la misma reacción (competencia automática, alcance 20/60 ft).</p>\n \n<button class=\"btn-roll btn-roll-sm\" onclick=\"registrarUsoRecursoGenerico('Extra Attack &amp; Deflect Missiles')\" style=\"margin-top:6px;\">✅ Usar</button>"
    },
    {
      "id": "txt-feat-monje-stunning-strike-nivel-5",
      "tag": "Monje",
      "titulo": "Stunning Strike (Nivel 5)",
      "html": "<p>Al golpear con un ataque de arma cuerpo a cuerpo, puedes gastar <strong>1 Ki</strong> para forzar una salvación de Constitución (<strong>DC <span class=\"js-calc\" data-calc=\"cd\">14</span></strong>). Si falla, el objetivo queda <strong>aturdido (stunned)</strong> hasta el final de tu próximo turno.</p>\n <button class=\"btn-roll\" onclick=\"rollCheckSave('d20', 0, 'Stunning Strike DC' + (8 + bonoAtaqueConjuro()) + ' CON (objetivo)', 'save')\" style=\"margin-top:6px;\">🎲 Recordatorio DC<span class=\"js-calc\" data-calc=\"cd\">14</span> CON</button>\n \n<button class=\"btn-roll btn-roll-sm\" onclick=\"registrarUsoRecursoGenerico('Stunning Strike (Nivel 5)')\" style=\"margin-top:6px;\">✅ Usar</button>"
    },
    {
      "id": "txt-feat-monje-slow-fall-nivel-4",
      "tag": "Monje",
      "titulo": "Slow Fall (Nivel 4)",
      "html": "<p>Reacción al caer: reduces el daño de caída en una cantidad igual a 5 × nivel de monje = <strong><span class=\"js-calc\" data-calc=\"slowFall\">25</span> puntos</strong>.</p>\n \n<button class=\"btn-roll btn-roll-sm\" onclick=\"registrarUsoRecursoGenerico('Slow Fall (Nivel 4)')\" style=\"margin-top:6px;\">✅ Usar</button>"
    },
    {
      "id": "txt-feat-clerigo-light-domain-warding-flare",
      "tag": "Clérigo",
      "titulo": "Light Domain & Warding Flare",
      "html": "<p>• <strong>Warding Flare (3/LR):</strong> Reacción cuando una criatura visible te ataca a <strong>30 ft o menos</strong>, para imponer desventaja en la tirada mediante un destello de luz divina. Un atacante que no pueda ser cegado es inmune a este rasgo.</p>\n <p>• <strong>Channel Divinity (1/Rest, elige una):</strong></p>\n <p style=\"margin-left:10px;\">— <strong>Radiance of the Dawn:</strong> dispersa oscuridad mágica y hace 2d10+<span class=\"js-calc\" data-calc=\"clericLvl\">2</span> radiant a enemigos a 30ft (CON Save DC <span class=\"js-calc\" data-calc=\"cd\">14</span> mitad).</p>\n <p style=\"margin-left:10px;\">— <strong>Turn Undead:</strong> Acción: presentas tu símbolo sagrado; cada no-muerto a 30 ft que te pueda ver/oír hace salvación de Sabiduría (DC <span class=\"js-calc\" data-calc=\"cd\">14</span>) o queda espantado (turned) por 1 minuto o hasta recibir daño.</p>\n \n<button class=\"btn-roll btn-roll-sm\" onclick=\"registrarUsoRecursoGenerico('Light Domain &amp; Warding Flare')\" style=\"margin-top:6px;\">✅ Usar</button>"
    },
    {
      "id": "txt-feat-raza-fire-genasi-traits",
      "tag": "Raza",
      "titulo": "Fire Genasi Traits",
      "html": "<p>• <strong>Darkvision:</strong> 60 ft.</p>\n <p>• <strong>Fire Resistance:</strong> Resistencia natural al daño de fuego.</p>\n <p>• <strong>Reach to the Blaze:</strong> Produce Flame a voluntad (usando Constitución). Burning Hands y Flame Blade gratis 1/LR — <strong>Constitución</strong> es la característica de estos usos raciales: <strong>DC <span class=\"js-calc\" data-calc=\"cdRacial\">13</span> / Spell Atk <span class=\"js-calc\" data-calc=\"atkRacial\">+5</span></strong> (distinto del DC<span class=\"js-calc\" data-calc=\"cd\">14</span>/<span class=\"js-calc\" data-calc=\"spellAtk\">+6</span> de Cure Wounds/Guiding Bolt/Burning Hands/Flame Blade cuando se lanzan con espacio de Clérigo, que usan Sabiduría).</p>\n \n<button class=\"btn-roll btn-roll-sm\" onclick=\"registrarUsoRecursoGenerico('Fire Genasi Traits')\" style=\"margin-top:6px;\">✅ Usar</button>"
    }
  ],

  secciones: [
    { id: 'trasfondo-eldur', icono: '📖', titulo: 'Trasfondo y Características del Personaje (Firelord Redmane)', fragmento: 'personajes/eldur/trasfondo.html' },
  ],
  trasfondo: { sinCampos: true },

  // Rasgos por nivel propios de la ficha (Monk 6+ y Cleric 3+, con notas 2014/2024): el asistente de subida los usa en lugar de classes_data para estas clases.
  nivel: { rasgosDeFicha: ['Monk', 'Cleric'], rasgosExtra: [
    {
      "nivel": 6,
      "clase": "Monk",
      "nombre": "Ki-Empowered Strikes (Empowered Strikes en PHB2024)",
      "descripcion": "Tus golpes desarmados y armas de monje cuentan como mágicos a efectos de superar la resistencia e inmunidad a daño no mágico."
    },
    {
      "nivel": 7,
      "clase": "Monk",
      "nombre": "Evasion",
      "descripcion": "Cuando debas hacer una salvación de DES para reducir daño a la mitad: si tienes éxito no recibes nada de daño, y si fallas recibes solo la mitad."
    },
    {
      "nivel": 7,
      "clase": "Monk",
      "nombre": "Stillness of Mind",
      "descripcion": "Como acción, terminas un efecto sobre ti mismo que te esté causando la condición Encantado o Asustado."
    },
    {
      "nivel": 8,
      "clase": "Monk",
      "nombre": "Mejora de Característica (ASI/Feat)",
      "descripcion": "Aumentas una puntuación de característica en 2, o dos puntuaciones en +1 cada una (o tomas un Talento, según reglas de PHB2024), sin exceder 20."
    },
    {
      "nivel": 9,
      "clase": "Monk",
      "nombre": "Unarmored Movement (mejora) / Acrobatic Movement",
      "descripcion": "Tu velocidad sin armadura aumenta más, y puedes moverte por superficies verticales y sobre líquidos sin caer durante tu turno (debes terminar el turno en superficie sólida). ⚠️ En PHB2024 esto puede estar separado como el rasgo \"Acrobatic Movement\", verificar redacción exacta."
    },
    {
      "nivel": 10,
      "clase": "Monk",
      "nombre": "Purity of Body (Self-Restoration en PHB2024)",
      "descripcion": "Eres inmune a enfermedades y venenos (incluida la condición Envenenado). ⚠️ En PHB2024 el rasgo puede haberse ampliado para curar Exhaustion también; revisar manual."
    },
    {
      "nivel": 12,
      "clase": "Monk",
      "nombre": "Mejora de Característica (ASI/Feat)",
      "descripcion": "Aumentas una puntuación de característica en 2, o dos en +1 cada una (o un Talento), sin exceder 20."
    },
    {
      "nivel": 13,
      "clase": "Monk",
      "nombre": "Tongue of the Sun and Moon",
      "descripcion": "Entiendes todos los idiomas hablados, y cualquier criatura que entienda al menos un idioma te entiende a ti al hablarle. ⚠️ Verificar si PHB2024 renombró este rasgo."
    },
    {
      "nivel": 14,
      "clase": "Monk",
      "nombre": "Diamond Soul (Disciplined Survivor en PHB2024)",
      "descripcion": "Ganas competencia en todas las tiradas de salvación. Además, si fallas una salvación puedes gastar 1 punto de Ki para repetirla con el nuevo resultado. ⚠️ Verificar mecánica exacta y nombre en PHB2024."
    },
    {
      "nivel": 15,
      "clase": "Monk",
      "nombre": "Timeless Body",
      "descripcion": "Ya no sufres los efectos de la vejez y no necesitas comer ni beber (aunque sigues pudiendo consumir comida/bebida mágica para otros beneficios)."
    },
    {
      "nivel": 16,
      "clase": "Monk",
      "nombre": "Mejora de Característica (ASI/Feat)",
      "descripcion": "Aumentas una puntuación de característica en 2, o dos en +1 cada una (o un Talento), sin exceder 20."
    },
    {
      "nivel": 18,
      "clase": "Monk",
      "nombre": "Empty Body (Superior Defense en PHB2024)",
      "descripcion": "Gastas 4 Ki para volverte invisible por 1 minuto y ganar resistencia a todo el daño salvo el de fuerza; por 8 Ki puedes lanzar Astral Projection sin componentes materiales. ⚠️ En PHB2024 este rasgo puede estar simplificado (sin gasto de Ki); revisar manual."
    },
    {
      "nivel": 19,
      "clase": "Monk",
      "nombre": "Mejora de Característica / Don Épico",
      "descripcion": "Última mejora de característica del Monje, o un Don Épico según reglas de PHB2024. ⚠️ Verificar si PHB2024 lo reemplaza directamente por un Epic Boon."
    },
    {
      "nivel": 20,
      "clase": "Monk",
      "nombre": "Perfect Self (Body and Mind en PHB2024)",
      "descripcion": "Si tiras iniciativa y no tienes puntos de Ki, ganas 4 puntos de Ki automáticamente. ⚠️ En PHB2024 este rasgo puede además subir FUE y DES a 25; verificar redacción."
    },
    {
      "nivel": 4,
      "clase": "Cleric",
      "nombre": "Mejora de Característica (ASI/Feat)",
      "descripcion": "Aumentas una puntuación de característica en 2, o dos en +1 cada una (o un Talento), sin exceder 20."
    },
    {
      "nivel": 5,
      "clase": "Cleric",
      "nombre": "Destroy Undead (CR 1/2)",
      "descripcion": "Al usar Turn Undead, los no-muertos con Retador (CR) 1/2 o menos que fallan la salvación son destruidos automáticamente en lugar de solo huir."
    },
    {
      "nivel": 5,
      "clase": "Cleric",
      "nombre": "Sear Undead",
      "descripcion": "Rasgo de PHB2024: cuando usas Turn Undead, los no-muertos que fallan la salvación sufren daño radiante igual a tu modificador de Sabiduría. ⚠️ Confirmar que este rasgo exista en PHB2024 y su nivel exacto — no estaba en la versión 2014."
    },
    {
      "nivel": 6,
      "clase": "Cleric",
      "nombre": "Channel Divinity (uso adicional)",
      "descripcion": "Puedes usar Channel Divinity una vez más entre descansos (total de usos según nivel de clérigo). ⚠️ Verificar si en PHB2024 el salto de usos ocurre en este nivel exacto (en 2014 era nivel 6; PHB2024 pudo adelantarlo)."
    },
    {
      "nivel": 6,
      "clase": "Cleric",
      "nombre": "Light Domain: Improved Warding Flare",
      "descripcion": "Warding Flare ya no requiere que puedas ver al atacante, y ahora también puedes usarlo para imponer desventaja en un ataque dirigido a un aliado a 30 pies. ⚠️ Confirmar nombre/nivel exacto en PHB2024 (Light Domain)."
    },
    {
      "nivel": 7,
      "clase": "Cleric",
      "nombre": "Blessed Strikes (eliges Divine Strike o Potent Spellcasting)",
      "descripcion": "Rasgo unificado de PHB2024: eliges entre (a) Divine Strike — 1/turno tu ataque con arma inflige +1d8 de daño radiante adicional (2d8 a nivel 14); o (b) Potent Spellcasting — sumas tu modificador de Sabiduría al daño de tus cantrips de clérigo. Para Light Domain suele convenir Potent Spellcasting. ⚠️ Verificar mecánica y nivel exactos — en 2014 Potent Spellcasting era exclusivo del dominio de Luz a nivel 8, sin esta elección."
    },
    {
      "nivel": 8,
      "clase": "Cleric",
      "nombre": "Mejora de Característica (ASI/Feat)",
      "descripcion": "Aumentas una puntuación de característica en 2, o dos en +1 cada una (o un Talento), sin exceder 20."
    },
    {
      "nivel": 10,
      "clase": "Cleric",
      "nombre": "Divine Intervention",
      "descripcion": "Rezas pidiendo ayuda divina; el DM determina el efecto (equivalente a un conjuro de clérigo de tu nivel o menor). Tras usarla con éxito, no puedes volver a usarla hasta completar un descanso largo. ⚠️ Verificar nivel exacto y mecánica en PHB2024 (en 2014 era nivel 10 con % de éxito = nivel de clérigo)."
    },
    {
      "nivel": 11,
      "clase": "Cleric",
      "nombre": "Destroy Undead (CR 2)",
      "descripcion": "El umbral de Destroy Undead sube: los no-muertos de Retador (CR) 2 o menos son destruidos automáticamente al fallar la salvación de Turn Undead."
    },
    {
      "nivel": 12,
      "clase": "Cleric",
      "nombre": "Mejora de Característica (ASI/Feat)",
      "descripcion": "Aumentas una puntuación de característica en 2, o dos en +1 cada una (o un Talento), sin exceder 20."
    },
    {
      "nivel": 14,
      "clase": "Cleric",
      "nombre": "Destroy Undead (CR 3)",
      "descripcion": "El umbral de Destroy Undead sube a Retador (CR) 3 o menos."
    },
    {
      "nivel": 16,
      "clase": "Cleric",
      "nombre": "Mejora de Característica (ASI/Feat)",
      "descripcion": "Aumentas una puntuación de característica en 2, o dos en +1 cada una (o un Talento), sin exceder 20. ⚠️ Confirmar que PHB2024 mantenga una mejora de característica en este nivel para Cleric."
    },
    {
      "nivel": 17,
      "clase": "Cleric",
      "nombre": "Light Domain: Corona of Light",
      "descripcion": "Como acción bonus, emanas luz brillante en 60 pies (y tenue 30 pies más) por 1 minuto; las criaturas hostiles dentro de la luz brillante tienen desventaja en salvaciones contra conjuros que hagan daño de fuego o radiante que tú lances."
    },
    {
      "nivel": 18,
      "clase": "Cleric",
      "nombre": "Channel Divinity (uso adicional, 3 usos)",
      "descripcion": "Puedes usar Channel Divinity una tercera vez entre descansos. ⚠️ Confirmar el número final de usos y el nivel exacto en PHB2024."
    },
    {
      "nivel": 19,
      "clase": "Cleric",
      "nombre": "Mejora de Característica / Don Épico",
      "descripcion": "Última mejora de característica del Clérigo, o un Don Épico según reglas de PHB2024. ⚠️ Verificar si PHB2024 lo reemplaza directamente por un Epic Boon."
    },
    {
      "nivel": 20,
      "clase": "Cleric",
      "nombre": "Divine Intervention (mejorada / Greater Divine Intervention)",
      "descripcion": "Divine Intervention ya no puede fallar: tiene éxito automático al usarla. ⚠️ Confirmar nombre exacto del rasgo y su redacción final en PHB2024."
    }
  ] },
};

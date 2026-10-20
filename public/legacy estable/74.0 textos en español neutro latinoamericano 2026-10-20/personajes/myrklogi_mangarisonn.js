/*
 * personajes/myrklogi_mangarisonn.js — datos de Myrklogi Mangarisonn para la carcasa única (ficha.html?pj=myrklogi_mangarisonn).
 *
 * Extraído de myrklogi_mangarisonn.html (la ficha viva sigue siendo la referencia dorada). Las claves de datos (hp-cur, hd-N,
 * shift-N, stasis-N, arcane-recovery-used, slot-N-cur, ac-val, …) son las MISMAS que ya guarda Firebase.
 * Lo que no está acá es del motor común: competencia, saves, skills, CA con armadura, CD, espacios y dados de golpe se CALCULAN.
 * Forma documentada en ficha-shell.js.
 */
window.PERSONAJES = window.PERSONAJES || {};
PERSONAJES.myrklogi_mangarisonn = {
  id: 'myrklogi_mangarisonn',
  nombre: 'Myrklogi Mangarisonn',
  sistema: 'dnd',
  paleta: 'ceniza',
  subtitulo: 'Mago 9 — Chronurgy Magic | Human like (Custom, sin raciales — feat inicial) | Unaligned',
  xp: 64500,
  clases: [{ nombre: 'Wizard', dado: 6, nivelInicial: 9, caster: 'full', subclase: 'Chronurgy Magic' }],
  hpBase: 70,                    // PG máximos a nivel 9; las subidas registradas suman su hpGanado
  velocidad: 30,
  habilidadAtaque: 'STR',
  habilidadConjuro: 'INT',
  atributos: { STR: 10, DEX: 14, CON: 16, INT: 18, WIS: 13, CHA: 8 },
  salvaciones: ['INT', 'WIS'],
  habilidades: { 'Arcana': 'comp', 'History': 'comp', 'Investigation': 'comp', 'Perception': 'comp', 'Religion': 'comp' },
  // CA: valor manual (campo ac-val, guardado en datos/) mientras no haya armadura/escudo equipados; al equipar se calcula sola.
  ca: { fija: 16, manual: 'ac-val' },
  // Temporal Awareness (Chronurgy): suma su mod. de INT a la iniciativa.
  iniciativa: { texto: 'DEX + INT (Temporal Awareness)', calcular: (c) => c.mod('DEX') + c.mod('INT') },

  ataques: [
    { nombre: 'The Hidden Attack', habilidad: 'DEX', dano: { count: 1, sides: 6, mod: 4 }, textoDano: '1d6 + 4 perforante', notas: 'Finesse. Otorga +2 AC (escudo invisible en la off hand). Recup. slot 1/largo' },
    { nombre: 'Shortsword (STR)', habilidad: 'STR', dano: { count: 1, sides: 6, mod: 'STR' }, textoDano: '1d6 + STR perforante', notas: 'Ataque con espada corta usando fuerza' },
    { nombre: 'Shortsword (DEX)', habilidad: 'DEX', dano: { count: 1, sides: 6, mod: 'DEX' }, textoDano: '1d6 + DEX perforante', notas: 'Ataque con espada corta usando destreza (Finesse)' },
    { nombre: 'Unarmed Strike', habilidad: 'STR', textoDano: '1 + STR contundente', notas: 'Golpe desarmado estándar' },
  ],

  efectosManuales: [
    { id: 'buff-bless', nombre: 'Bless', icono: '✨', texto: '+1d4 ataques y salvaciones', tipo: 'buff' },
    { id: 'debuff-bane', nombre: 'Bane', icono: '💀', texto: '−1d4 ataques y salvaciones', tipo: 'debuff' },
    { id: 'buff-guidance', nombre: 'Guidance', icono: '📜', texto: '+1d4 a una prueba', tipo: 'buff' },
  ],

  recursos: [
    { id: 'shift', tipo: 'pips', nombre: 'Chronal Shift', icono: '⏳', max: 2, prefijo: 'shift-', recarga: 'largo', desc: '2 usos por descanso largo.' },
    { id: 'stasis', tipo: 'pips', nombre: 'Momentary Stasis', icono: '🧊', max: (c) => Math.max(1, c.mod('INT')), prefijo: 'stasis-', recarga: 'largo', desc: 'Usos = modificador de INT (mínimo 1) por descanso largo.' },
    // La ficha viva restablece esta casilla con el descanso CORTO (Arcane Recovery: 1/día, tras un descanso corto).
    { id: 'arcane', tipo: 'pips', nombre: 'Arcane Recovery', icono: '📖', ids: ['arcane-recovery-used'], etiquetas: ['Usado hoy'], recarga: 'corto', desc: '1 vez al día, al terminar un descanso corto.' },
  ],

  hechizos: [
    {
      "nombre": "Fire Bolt",
      "nivel": 0,
      "tiempo": "1 Acc",
      "alcance": "120 ft",
      "area": "",
      "resumen": "2d10 fire damage.",
      "duracion": "Instantáneo",
      "formula": {
        "count": 2,
        "sides": 10,
        "mod": 0
      },
      "slotCost": null,
      "ataque": {
        "tipo": "ataque",
        "bonus": 8,
        "bonusAuto": true
      },
      "concentracion": false
    },
    {
      "nombre": "Ray of Frost",
      "nivel": 0,
      "tiempo": "1 Acc",
      "alcance": "60 ft",
      "area": "",
      "resumen": "2d8 cold damage, -10ft vel.",
      "duracion": "Instantáneo",
      "formula": {
        "count": 2,
        "sides": 8,
        "mod": 0
      },
      "slotCost": null,
      "ataque": {
        "tipo": "ataque",
        "bonus": 8,
        "bonusAuto": true
      },
      "concentracion": false
    },
    {
      "nombre": "Guidance",
      "nivel": 0,
      "tiempo": "1 Acc",
      "alcance": "Touch",
      "area": "",
      "resumen": "Objetivo suma 1d4 a su próximo ability check.",
      "duracion": "1 min, Conc.",
      "formula": {
        "count": 1,
        "sides": 4,
        "mod": 0
      },
      "slotCost": null,
      "ataque": null,
      "concentracion": true,
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
      "nombre": "Magic Missile",
      "nivel": 1,
      "tiempo": "1 Acc",
      "alcance": "120 ft",
      "area": "",
      "resumen": "Tres dardos infalibles; 1d4+1 force c/u. Upcast: +1 dardo (1d4+1) por nivel de espacio.",
      "duracion": "Instantáneo",
      "formula": {
        "count": 3,
        "sides": 4,
        "mod": 3
      },
      "slotCost": 1,
      "ataque": null,
      "concentracion": false,
      "upcast": {
        "tipo": "dado",
        "nivelBase": 1,
        "dado": {
          "count": 1,
          "sides": 4,
          "mod": 1
        }
      }
    },
    {
      "nombre": "Shield",
      "nivel": 1,
      "tiempo": "1 Reacción",
      "alcance": "Personal",
      "area": "",
      "resumen": "+5 AC hasta el inicio de tu próximo turno.",
      "duracion": "1 asalto",
      "formula": null,
      "slotCost": 1,
      "ataque": null,
      "concentracion": false,
      "buff": {
        "activo": false,
        "efectos": [
          {
            "tipo": "plano",
            "objetivo": "ca",
            "valor": 5
          }
        ]
      }
    },
    {
      "nombre": "Fireball",
      "nivel": 3,
      "tiempo": "1 Acc",
      "alcance": "150 ft",
      "area": "Esfera 20 ft",
      "resumen": "8d6 fire damage. Upcast: +1d6 por nivel de espacio.",
      "duracion": "Instantáneo",
      "formula": {
        "count": 8,
        "sides": 6,
        "mod": 0
      },
      "slotCost": 3,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "DEX",
        "dc": 16,
        "dcAuto": true
      },
      "concentracion": false,
      "upcast": {
        "tipo": "dado",
        "nivelBase": 3,
        "dado": {
          "count": 1,
          "sides": 6
        }
      }
    },
    {
      "nombre": "Psychic Lance (UA)",
      "nivel": 4,
      "tiempo": "1 Acc",
      "alcance": "120 ft",
      "area": "",
      "resumen": "10d6 psychic y queda incapacitado. Upcast: +1d6 por nivel de espacio.",
      "duracion": "Instantáneo",
      "formula": {
        "count": 10,
        "sides": 6,
        "mod": 0
      },
      "slotCost": 4,
      "ataque": {
        "tipo": "salvacion",
        "habilidad": "INT",
        "dc": 16,
        "dcAuto": true
      },
      "concentracion": false,
      "upcast": {
        "tipo": "dado",
        "nivelBase": 4,
        "dado": {
          "count": 1,
          "sides": 6
        }
      }
    }
  ],

  inventario: [
    {
      "nombre": "The Hidden (broken)",
      "descripcion": "Espada corta mágica (+2 AC)",
      "cantidad": 1,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Potion of Healing",
      "descripcion": "Recupera 2d4+3 HP al consumirse",
      "cantidad": 0,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": true,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Potion of Radiant Damage",
      "descripcion": "Inflige 1d4+1 de daño radiante",
      "cantidad": 8,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": true,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Smokescultor Pipe",
      "descripcion": "Pipa con sintonía de mago",
      "cantidad": 1,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Feline Agility Ring",
      "descripcion": "Acrobacias y sigilo mejorados",
      "cantidad": 1,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Coin of Fate",
      "descripcion": "Duplica tu daño o lo recibes tú",
      "cantidad": 1,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": false,
      "modAC": null,
      "dexCap": null
    },
    {
      "nombre": "Intellect potion",
      "descripcion": "+2 INT temporal",
      "cantidad": 1,
      "precio": 0,
      "equipado": true,
      "categoria": "general",
      "consumible": true,
      "modAC": null,
      "dexCap": null
    }
  ],

  reputacion: [],

  monedas: [{ id: 'gp-val', etiqueta: 'GP (Oro)', valor: 331 }],
  notaInventario: "<strong>Bolsa de 1kg de arena picante (droga)</strong> | Amuleto del dios de la muerte (+1d4 saves) | Pociones de Sanación | Poción de Intelecto (+2 INT) | Anillo de Agilidad Felina (+10ft, ventaja Acrobatics/Stealth) | Tenedor de acero.",

  rasgos: [
    {
      "id": "txt-feat-mago-spellcasting-spellbook-ritual-casting",
      "tag": "Mago",
      "titulo": "Spellcasting, Spellbook & Ritual Casting",
      "html": "<p>• <strong>Spellcasting:</strong> Inteligencia es tu característica de lanzamiento (Spell Save DC <span class=\"js-calc\" data-calc=\"cd\">16</span>, Spell Atk <span class=\"js-calc\" data-calc=\"atqConjuro\">+8</span>). Preparás una cantidad de conjuros igual a tu modificador de INT + tu nivel de Mago (a nivel 9 con INT +4: <strong>13 conjuros preparados</strong>, sin contar cantrips).</p>\n <p>• <strong>Spellbook:</strong> Tus conjuros preparados se eligen de tu libro de conjuros; podés copiar conjuros nuevos que encuentres (tiempo y costo en oro según el nivel del conjuro).</p>\n <p>• <strong>Ritual Casting:</strong> Podés lanzar cualquier conjuro de tu libro con la etiqueta \"ritual\" sin gastar espacio de conjuro ni tenerlo preparado.</p>"
    },
    {
      "id": "txt-feat-mago-arcane-recovery-1-dia",
      "tag": "Mago",
      "titulo": "Arcane Recovery (1/día)",
      "html": "<p>Una vez por día, al terminar un descanso corto, podés recuperar espacios de conjuro gastados cuyo nivel combinado sea igual o menor a la mitad de tu nivel de Mago redondeado hacia arriba (9/2 → <strong>5 niveles de espacios</strong>, en cualquier combinación), y ninguno puede ser de nivel 6 o superior.</p>"
    },
    {
      "id": "txt-feat-chronurgy-chronal-shift-nivel-2",
      "tag": "Chronurgy",
      "titulo": "Chronal Shift (Nivel 2)",
      "html": "<p>Cuando una criatura que podés ver a 30 ft hace una tirada de característica, ataque o salvación, podés usar tu reacción para forzarla a repetir la tirada. Podés elegir esto después de ver el resultado, pero antes de que se determine el efecto; luego decidís cuál tirada se usa.</p>\n <p><strong>2 usos por descanso largo</strong> (checkbox abajo en Recursos).</p>"
    },
    {
      "id": "txt-feat-chronurgy-temporal-awareness-nivel-2",
      "tag": "Chronurgy",
      "titulo": "Temporal Awareness (Nivel 2)",
      "html": "<p>Sumás tu modificador de Inteligencia a tus tiradas de iniciativa. Pasivo, ya reflejado en el bono de Iniciativa (<span class=\"js-calc\" data-calc=\"ini\">+6</span> = DEX <span class=\"js-calc\" data-calc=\"mod\" data-hab=\"DEX\">+2</span> + INT <span class=\"js-calc\" data-calc=\"mod\" data-hab=\"INT\">+4</span>).</p>"
    },
    {
      "id": "txt-feat-chronurgy-momentary-stasis-nivel-6",
      "tag": "Chronurgy",
      "titulo": "Momentary Stasis (Nivel 6)",
      "html": "<p>Como acción, forzás a una criatura Grande o menor que puedas ver a hacer una salvación de Constitución contra tu Spell Save DC (<span class=\"js-calc\" data-calc=\"cd\">16</span>). Si falla, queda incapacitada y su velocidad se reduce a 0, atrapada en un campo mágico, hasta el final de tu próximo turno o hasta recibir daño.</p>\n <p><strong>Usos = modificador de INT (mínimo 1) = 4</strong> por descanso largo (checkbox abajo en Recursos). ⚠️ Alcance y duración exactos a confirmar contra el manual (Explorer's Guide to Wildemount / Tasha's) — las fuentes públicas consultadas no coinciden 100% en el alcance (30 vs 60 ft).</p>"
    },
    {
      "id": "txt-feat-mago-ability-score-improvement-niveles-4-y-8",
      "tag": "Mago",
      "titulo": "Ability Score Improvement (Niveles 4 y 8)",
      "html": "<p>Ya cursadas — reflejadas en las puntuaciones de característica actuales. Sin efecto adicional que trackear.</p>"
    }
  ],

  secciones: [],

  trasfondo: { html: 'Esta sección estaba vacía en la ficha original — completala a mano cuando quieras, se guarda automáticamente.' },
};

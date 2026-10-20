/*
 * personajes/dane.js — datos de Dane para la carcasa única (ficha.html?pj=dane).
 *
 * Extraído de dane.html (la ficha viva sigue siendo la referencia dorada). Las claves de datos (hp-cur, hd-N,
 * chk-slotN-M, favfoe-N, gold-input, txt-feat-*, …) son las MISMAS que ya guarda Firebase.
 * Calculado por el motor común: competencia, saves, skills, CA, CD, iniciativa, espacios y dados de golpe.
 * Propio de Dane (en P.iniciar): los números de la Ballesta Hiperbórea del desglose de daño.
 */
window.PERSONAJES = window.PERSONAJES || {};
PERSONAJES.dane = {
  id: 'dane',
  nombre: 'Dane',
  sistema: 'dnd',
  paleta: 'turquesa',
  subtitulo: 'Ranger (Gloom Stalker) / Rogue (Assassin) · Winged Tiefling · Criminal · Neutral',
  chips: ['Winged Tiefling', 'Criminal', 'Neutral', 'Profesiones: Blacksmith, Pilot'],
  xp: 70000,
  clases: [
    { nombre: 'Ranger', dado: 10, nivelInicial: 5, caster: 'half', subclase: 'Gloom Stalker' },
    { nombre: 'Rogue', dado: 8, nivelInicial: 4, caster: null, subclase: 'Assassin' },
  ],
  hpBase: 73,
  velocidad: 30,
  velocidadNota: '/ 🦇 30 ft de vuelo (Winged Tiefling)',
  habilidadAtaque: 'DEX',
  badgeAtaque: { extra: 4, alternativo: -5 },   // Ballesta Hiperbórea: +2 Archery, +1 magia, +1 Blacksmith; con Sharpshooter −5
  habilidadConjuro: 'WIS',
  iniciativa: { calcular: ({ mod }) => mod('DEX') + mod('WIS'), texto: 'DEX + WIS (Dread Ambusher)' },
  atributos: { STR: 8, DEX: 18, CON: 14, INT: 10, WIS: 16, CHA: 10 },
  salvaciones: ['STR', 'DEX'],
  habilidades: { 'Acrobatics': 'comp', 'Deception': 'comp', 'Insight': 'comp', 'Perception': 'exp', 'Sleight of Hand': 'exp', 'Stealth': 'exp' },
  competencias: "• <strong>Armor:</strong> Light Armor, Medium Armor, Shields<br>• <strong>Weapons:</strong> Simple Weapons, Martial Weapons<br>• <strong>Saving Throws:</strong> Strength, Dexterity<br>• <strong>Tools:</strong> Blacksmith's Tools, Thieves' Tools, Disguise Kit, Poisoner's Kit",
  ca: { fija: 16 },   // Studded Leather 12 + DEX 4; fija hasta que se equipe una armadura en el inventario
  espaciosModo: 'casillas',   // los espacios son casillas chk-slotN-M (☑ = usado), como en la ficha viva

  ataques: [
    { nombre: 'Hyperborean Crossbow (Normal)', habilidad: 'DEX', bonoExtra: 4,
      dano: { count: 1, sides: 8, mod: { hab: 'DEX', fijo: 2 } }, textoDano: ({ mod }) => '1d8 + ' + (mod('DEX') + 2) + ' perforante',
      notas: '+1 magia, +1 Blacksmith, +2 Archery. DC 15 CON o velocidad a la mitad.' },
    { nombre: 'Hyperborean Crossbow (Sharpshooter)', habilidad: 'DEX', bonoExtra: -1,
      dano: { count: 1, sides: 8, mod: { hab: 'DEX', fijo: 12 } }, textoDano: ({ mod }) => '1d8 + ' + (mod('DEX') + 12) + ' perforante',
      notas: 'Sharpshooter: −5 al ataque, +10 al daño.' },
    { nombre: "Hunter's Mark", soloDano: true, dano: { count: 1, sides: 6, mod: 0 }, textoDano: '1d6', notas: 'Acción adicional' },
    { nombre: 'Sneak Attack', soloDano: true, dano: { count: ({ clase }) => Math.ceil(clase('Rogue') / 2), sides: 6, mod: 0 }, textoDano: ({ clase }) => Math.ceil(clase('Rogue') / 2) + 'd6', notas: '1/turno (ventaja o aliado a 5 ft)' },
  ],

  efectosManuales: [
    { id: 'buff-bless', nombre: 'Bless', icono: '✨', texto: '+1d4 ataques y salvaciones', tipo: 'buff' },
    { id: 'debuff-bane', nombre: 'Bane', icono: '💀', texto: '−1d4 ataques y salvaciones', tipo: 'debuff' },
  ],

  recursos: [
    { id: 'favfoe', tipo: 'pips', nombre: 'Favored Foe', icono: '🏹', max: 4, prefijo: 'favfoe-', recarga: 'largo', desc: '4 usos por descanso largo.' },
    { id: 'sneak', tipo: 'info', nombre: 'Sneak Attack', icono: '🗡️', valor: ({ clase }) => Math.ceil(clase('Rogue') / 2) + 'd6', formula: true, recarga: null, desc: 'Dados = ⌈nivel de Rogue ÷ 2⌉. Se muestra y se tira; no se gasta.' },
  ],

  hechizos: [
      {
          "nombre": "Hunter's Mark",
          "nivel": 1,
          "tiempo": "1 Acc. Adicional",
          "alcance": "90 ft",
          "area": "",
          "resumen": "+1d6 de daño extra a la criatura marcada (se tira con \"Daño extra\" del panel de buffs).",
          "duracion": "Conc., hasta 1 hora",
          "formula": null,
          "slotCost": 1,
          "ataque": null,
          "concentracion": true,
          "buff": {
              "activo": false,
              "efectos": [
                  {
                      "tipo": "dado",
                      "objetivo": "dano",
                      "dado": {
                          "count": 1,
                          "sides": 6
                      }
                  }
              ]
          }
      },
      {
          "nombre": "Absorb Elements",
          "nivel": 1,
          "tiempo": "1 Reacción",
          "alcance": "Personal",
          "area": "",
          "resumen": "Reacción: resistencia al daño elemental recibido. Upcast: +1d6 de daño cuerpo a cuerpo extra por cada nivel de espacio sobre el 1º.",
          "duracion": "1 ronda",
          "formula": {
              "count": 1,
              "sides": 6,
              "mod": 0
          },
          "slotCost": 1,
          "ataque": null,
          "concentracion": false,
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
          "tiempo": "1 Acción",
          "alcance": "Toque",
          "area": "",
          "resumen": "Cura 1d8 + 3. Upcast: +1d8 de curación por cada nivel de espacio sobre el 1º.",
          "duracion": "Instantáneo",
          "formula": {
              "count": 1,
              "sides": 8,
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
                  "sides": 8
              }
          }
      },
      {
          "nombre": "Disguise Self",
          "nivel": 1,
          "tiempo": "1 Acción",
          "alcance": "Personal",
          "area": "",
          "resumen": "Gloom Stalker Feature (siempre preparado).",
          "duracion": "1 hora",
          "formula": null,
          "slotCost": 1,
          "ataque": null,
          "concentracion": false
      },
      {
          "nombre": "Pass without Trace",
          "nivel": 2,
          "tiempo": "1 Acción",
          "alcance": "Personal",
          "area": "Aura de 30 ft",
          "resumen": "+10 a Stealth para el grupo.",
          "duracion": "Conc., hasta 1 hora",
          "formula": null,
          "slotCost": 2,
          "ataque": null,
          "concentracion": true
      },
      {
          "nombre": "Rope Trick",
          "nivel": 2,
          "tiempo": "1 Acción",
          "alcance": "Toque",
          "area": "",
          "resumen": "Gloom Stalker Feature (siempre preparado).",
          "duracion": "1 hora",
          "formula": null,
          "slotCost": 2,
          "ataque": null,
          "concentracion": false
      }
  ],

  inventario: [
      {
          "nombre": "Amulet of the Linked Minds",
          "descripcion": "Telepathic communication across any distance/plane with its twin. Shares thoughts/emotions exclusively.",
          "cantidad": 1,
          "precio": 0,
          "equipado": true,
          "categoria": "general",
          "consumible": false,
          "modAC": null,
          "dexCap": null
      },
      {
          "nombre": "Hyperborean Crossbow",
          "descripcion": "+1 Weapon. Deals damage -> DC 15 Con save or speed halved. Can target a surface for 5ft radius frozen difficult terrain (1 min).",
          "cantidad": 1,
          "precio": 0,
          "equipado": true,
          "categoria": "general",
          "consumible": false,
          "modAC": null,
          "dexCap": null
      },
      {
          "nombre": "Mindmugger Mitts",
          "descripcion": "Advantage on Sleight of Hand. (3/day) Bonus Action touch: DC 10 + 1/2 level Wis save or target forgets the entire round.",
          "cantidad": 1,
          "precio": 0,
          "equipado": true,
          "categoria": "general",
          "consumible": false,
          "modAC": null,
          "dexCap": null
      },
      {
          "nombre": "Phantom Steps",
          "descripcion": "Move silently, leave no trace, bypass floor traps. (1/day) Click heels to move through creatures/objects until end of turn.",
          "cantidad": 1,
          "precio": 0,
          "equipado": true,
          "categoria": "general",
          "consumible": false,
          "modAC": null,
          "dexCap": null
      },
      {
          "nombre": "Ring of the Smiling Sphinx",
          "descripcion": "Immune to mind/emotion reading and Divination (Scrying). Disadvantage on Insight checks against you. Can store 1 perfect memory.",
          "cantidad": 1,
          "precio": 0,
          "equipado": true,
          "categoria": "general",
          "consumible": false,
          "modAC": null,
          "dexCap": null
      },
      {
          "nombre": "The Corpse Mask",
          "descripcion": "(2/day) For 1 hour, take the appearance of a humanoid you saw die while wearing the mask (stores up to 5 faces).",
          "cantidad": 1,
          "precio": 0,
          "equipado": true,
          "categoria": "general",
          "consumible": false,
          "modAC": null,
          "dexCap": null
      },
      {
          "nombre": "Potion of Choice",
          "descripcion": "Drink to gain Advantage on one check/save/attack within 10 mins, OR reroll one and use the new result.",
          "cantidad": 1,
          "precio": 0,
          "equipado": false,
          "categoria": "general",
          "consumible": true,
          "modAC": null,
          "dexCap": null
      },
      {
          "nombre": "Reveal (Mask)",
          "descripcion": "Passively reveals AC of creatures within 60ft. Advantage on perception/surprise initiative. (Prof. Bonus/day) Advantage on a check, save, or attack.",
          "cantidad": 1,
          "precio": 0,
          "equipado": false,
          "categoria": "general",
          "consumible": false,
          "modAC": null,
          "dexCap": null
      }
  ],

  reputacion: [],

  monedas: [{ id: 'gold-input', etiqueta: 'Gold (GP)' }],
  notaInventario: "<strong>Armor:</strong> Studded Leather Armor · <strong>Tools:</strong> Blacksmith's Tools",

  rasgos: [
      {
          "id": "txt-feat-sharpshooter",
          "tag": "Feat",
          "titulo": "Sharpshooter (Nvl 4)",
          "html": "<ul><li>Attacking at long range doesn't impose disadvantage.</li>\n                        <li>Attacks ignore half cover and three-quarters cover.</li>\n                        <li>Take -5 penalty to attack roll to add +10 to the attack's damage.</li></ul>"
      },
      {
          "id": "txt-feat-piercer",
          "tag": "Feat",
          "titulo": "Piercer (Nvl 4)",
          "html": "<ul><li>Once per turn, you can reroll one of your damage dice that deals piercing damage (you must use the new roll).</li>\n                        <li>When you score a critical hit that deals piercing damage to a creature, you can roll one additional damage die when determining the extra piercing damage.</li></ul>"
      },
      {
          "id": "txt-feat-deft-explorer-canny",
          "tag": "Ranger",
          "titulo": "Deft Explorer: Canny (Nvl 1)",
          "html": "<ul><li>Double proficiency bonus for one skill (Perception).</li>\n                        <li>Learn two additional languages <em>(Update with DM)</em>.</li></ul>"
      },
      {
          "id": "txt-feat-profession-blacksmith",
          "tag": "Trasfondo",
          "titulo": "Profession: Blacksmith",
          "html": "Your weapons have a +1 bonus to attack rolls. Using a forge and materials, you can upgrade your party members' weapons to add this same +1 bonus."
      },
      {
          "id": "txt-feat-profession-pilot",
          "tag": "Trasfondo",
          "titulo": "Profession: Pilot",
          "html": "You have expertise in piloting any vehicle (airships, sea vessels, land transports). You possess a supernatural intuition for navigation, plotting flawless courses by reading stars and wind currents, ensuring you never lose direction even in treacherous hazards."
      },
      {
          "id": "txt-feat-dread-ambusher",
          "tag": "Ranger",
          "titulo": "Dread Ambusher",
          "html": "+WIS mod to initiative. +10ft speed on first turn. 1 extra attack on first turn Attack action (+1d8 dmg)."
      },
      {
          "id": "txt-feat-extra-attack-cunning-action",
          "tag": "Clase",
          "titulo": "Extra Attack & Cunning Action",
          "html": "Attack twice. Bonus action to Dash, Disengage, or Hide."
      },
      {
          "id": "txt-feat-favored-foe",
          "tag": "Ranger",
          "titulo": "Favored Foe (4/descanso largo)",
          "html": "Cuando impactás a una criatura con un ataque, podés marcarla como enemigo predilecto durante 1 minuto (sin gastar acción, como concentración). La primera vez en cada uno de tus turnos que le pegás a ese enemigo, le hacés +1d4 de daño extra."
      },
      {
          "id": "txt-feat-primeval-awareness",
          "tag": "Ranger",
          "titulo": "Primeval Awareness",
          "html": "Acción + 1 espacio de conjuro para detectar, dentro de 1 milla (6 en terreno favorito), si hay aberraciones, celestiales, dragones, elementales, feéricos, infernales o no-muertos en la zona, durante 1 minuto por nivel del espacio gastado."
      },
      {
          "id": "txt-feat-hellish-resistance",
          "tag": "Racial",
          "titulo": "Hellish Resistance",
          "html": "Resistencia al daño de fuego."
      },
      {
          "id": "txt-feat-fly-speed-30ft",
          "tag": "Racial",
          "titulo": "Fly Speed 30ft",
          "html": "Alas tipo murciélago; volás a 30 ft mientras no lleves armadura pesada. Reemplaza el rasgo racial Infernal Legacy (Dane no tiene Thaumaturgy/Hellish Rebuke/Darkness raciales)."
      }
  ],

  secciones: [
    { id: 'combate', icono: '🎯', titulo: 'Desglose de daño y Nova Strike', fragmento: 'personajes/dane/combate.html' },
    { id: 'recordatorios', icono: '⚠️', titulo: 'Tactical Reminders', fragmento: 'personajes/dane/recordatorios.html' },
  ],

  trasfondo: { html: 'Esta sección estaba vacía en la ficha original — completala a mano cuando quieras, se guarda automáticamente.' },

  // Código propio de Dane: los números de la Ballesta Hiperbórea en el desglose de daño (se recalculan con el nivel y los atributos).
  iniciar() {
    const f = (n) => (n >= 0 ? '+' : '') + n;
    const SS_PENAL = 5, SS_BONO = 10, ATAQUE_EXTRA = 4, DANO_EXTRA = 2;
    function pintar() {
      if (!window.FichaAtributos) return;
      const dex = FichaAtributos.modDe('DEX'), prof = FichaAtributos.profBonusActual();
      const base = dex + prof + ATAQUE_EXTRA, dano = dex + DANO_EXTRA;
      const valores = { ballesta: [base], ballestaSS: [base - SS_PENAL], danoBallesta: [dano], danoBallestaSS: [dano + SS_BONO], novaFijo: [4 * (dano + SS_BONO)] };
      document.querySelectorAll('[data-dane]').forEach(el => {
        const v = valores[el.dataset.dane]; if (!v) return;
        const t = el.dataset.fmt === 'num' ? String(v[0]) : f(v[0]);
        if (el.textContent !== t) el.textContent = t;
      });
    }
    document.addEventListener('ficha:atributos', pintar);
    document.addEventListener('ficha:lista', pintar);
    pintar();
  },
};

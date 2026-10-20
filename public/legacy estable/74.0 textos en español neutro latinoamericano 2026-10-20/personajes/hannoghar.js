/*
 * personajes/hannoghar.js — datos de Hannoghar para la carcasa única (ficha.html?pj=hannoghar).
 *
 * Extraído de hannoghar.html (la ficha viva sigue siendo la referencia dorada). Las claves de datos (hp-cur, hd-N, cd-use-N,
 * lay-hands-cur, slot-N-cur, aura-*-activa, …) son las MISMAS que ya guarda Firebase. Lo que no está acá es del motor común:
 * competencia, saves, skills, CD, espacios (Paladín = lanzador a medias) y dados de golpe se CALCULAN.
 * Hannoghar sigue en nivel 7 (su XP ya alcanza para el 8): la carcasa solo muestra el aviso de subida pendiente.
 * Forma documentada en ficha-shell.js.
 */
window.PERSONAJES = window.PERSONAJES || {};
(function () {
  const numCampo = (id) => { const n = parseInt((document.getElementById(id) || {}).value, 10); return isNaN(n) ? 0 : n; };
  // Aura of Protection: mod. de CARISMA (mín. +1) a TODAS las salvaciones; se lee de los campos para no ir un paso atrás del motor.
  const modAuraProteccion = () => Math.max(1, FichaComun.calcularModificador(numCampo('cha-score') + numCampo('cha-temp')));
  const f = (n) => (n >= 0 ? '+' : '') + n;

  PERSONAJES.hannoghar = {
    id: 'hannoghar',
    nombre: 'Hannoghar',
    sistema: 'dnd',
    paleta: 'marea',
    subtitulo: "Paladin 7 — Oath of the Watchers | Dragonborn (Lawful Good)",
    xp: 50600,
    clases: [{ nombre: 'Paladin', dado: 10, nivelInicial: 7, caster: 'half', subclase: 'Oath of the Watchers' }],
    hpBase: 66,                    // PG máximos a nivel 7; las subidas registradas suman su hpGanado
    velocidad: 30,
    habilidadAtaque: 'STR',
    habilidadConjuro: 'CHA',
    atributos: {"STR": 16, "DEX": 10, "CON": 16, "INT": 10, "WIS": 12, "CHA": 14},
    salvaciones: ["STR", "WIS", "CHA"],
    habilidades: { 'Athletics': 'comp', 'Persuasion': 'comp', 'Religion': 'comp' },
    competencias: "• <strong>Armaduras:</strong> Todas las armaduras, Escudos.<br> • <strong>Armas:</strong> Armas Simples, Armas Marciales.<br> • <strong>Herramientas:</strong> Dice set (Juego de dados).<br> • <strong>Idiomas:</strong> Common, Abyssal, Draconic.",
    ca: { fija: 21, casillaAuto: true, bonoConArmadura: 1 },   // 18 Plate + 2 Shield + 1 Defense; la casilla "calcular desde el equipo" es opcional

    ataques: [
      { nombre: 'Mace (Maza)', habilidad: 'STR', dano: { count: 1, sides: 8, mod: 'STR' }, textoDano: '1d8 + STR contundente', notas: 'Melee, 1H. Impacto contundente cargado con tu fuerza.' },
    ],

    // Acciones especiales (Breath Weapon, Divine Smite): HTML propio con los botones de siempre.
    secciones: [
      { id: 'acciones-especiales', icono: '🔥', titulo: 'Acciones especiales (Aliento y Divine Smite)', html: "<div class=\"tabla-scroll\"><table class=\"tabla tabla-resp\"><thead><tr><th>Acción</th><th>Bono / CD</th><th>Daño / efecto</th><th>Notas</th><th>Tirar</th></tr></thead><tbody><tr> <td><strong>Breath Weapon (Aliento de Fuego)</strong></td> <td>DC <span class=\"js-calc\" data-calc=\"cdAliento\">14</span> Dex</td> <td>3d6 Fuego</td> <td>Cono de 15 ft. Las criaturas atrapadas sufren 3d6 daño de fuego (mitad con CD <span class=\"js-calc\" data-calc=\"cdAliento\">14</span> exitosa) — daño de nivel de personaje 6-10. Se recarga con un descanso corto o largo.</td> <td> <button class=\"btn-roll\" onclick=\"rollGenericDamage(3, 6, 0, 'Aliento de Fuego (3d6)')\">🔥 3d6 Fuego</button> </td> </tr><tr> <td><strong>Divine Smite</strong></td> <td>Especial</td> <td>+2d8 Radiante (+1d8 Lvl 2 / Fiend)</td> <td>Al golpear con un ataque cuerpo a cuerpo, puedes gastar una ranura de conjuro para infligir +2d8 de daño radiante adicional (+1d8 por nivel superior a 1º, máx 5d8). Añade +1d8 extra contra fiends o muertos vivientes.</td> <td> <button class=\"btn-roll\" onclick=\"rollGenericDamage(2, 8, 0, 'Divine Smite Lvl 1 (2d8)'); gastarSlot(1)\">⚡ 2d8</button> <button class=\"btn-roll\" onclick=\"rollGenericDamage(3, 8, 0, 'Divine Smite Lvl 2 / Anti-Fiend (3d8)'); gastarSlot(2)\">⚡ 3d8</button> </td> </tr></tbody></table></div>" },
    ],

    efectosManuales: [
      { id: 'buff-bless', nombre: 'Bless', icono: '✨', texto: '+1d4 ataques y salvaciones', tipo: 'buff' },
      { id: 'buff-watchers', nombre: "Watcher's Will", icono: '🛡️', texto: 'Ventaja en salvaciones de INT/WIS/CHA', tipo: 'buff' },
      { id: 'debuff-bane', nombre: 'Bane', icono: '💀', texto: '−1d4 ataques y salvaciones', tipo: 'debuff' },
    ],

    // Auras de Paladín como buffs permanentes (se apagan con la casilla o la ✖ del panel).
    auras: [
      { id: 'aura-proteccion-activa', nombre: 'Aura of Protection', icono: '🛡️', texto: 'Mientras estés consciente: suma tu mod. de Carisma (mín. +1) a TODAS las salvaciones', objetivo: 'salvaciones', valor: modAuraProteccion },
      { id: 'aura-centinela-activa', nombre: 'Aura of the Sentinel', icono: '👁️', texto: 'Suma tu bono de competencia a la iniciativa', objetivo: 'iniciativa', valor: () => FichaAtributos.profBonusActual() },
    ],

    calculos: {
      cdAliento: () => 8 + FichaAtributos.modDe('CON') + FichaAtributos.profBonusActual(),   // Breath Weapon dracónico: 8 + CON + competencia
      auraProt: () => f(modAuraProteccion()),
      macaBtn: () => '💥 1d8' + f(FichaAtributos.modDe('STR')),
    },

    ganchos: {
      // Watcher's Will activo: nota en ataques y salvaciones (la ventaja se aplica a mano, como en la ficha viva).
      notasD20: (o) => (((o.categoria === 'ataque' || o.categoria === 'salvaciones') && (document.getElementById('buff-watchers') || {}).checked) ? ["Watcher's Will activo"] : []),
    },

    recursos: [
      { id: 'loh', tipo: 'pool', nombre: 'Lay on Hands', icono: '🙌', max: (c) => 5 * c.clase('Paladin'), campo: 'lay-hands-cur', recarga: 'largo', pasos: [-5, 5], inicial: 35, desc: 'Reserva curativa = 5 × nivel de Paladín.' },
      { id: 'cd', tipo: 'pips', nombre: 'Channel Divinity', icono: '✝️', max: 2, prefijo: 'cd-use-', recarga: 'corto', desc: '2 usos por descanso corto o largo.' },
      { id: 'ds', tipo: 'pips', nombre: 'Divine Sense', icono: '👁️', max: 3, prefijo: 'ds-use-', recarga: 'largo', desc: '3 usos por descanso largo.' },
      { id: 'bw', tipo: 'pips', nombre: 'Breath Weapon (Fuego)', icono: '🔥', max: 1, prefijo: 'bw-use-', recarga: 'corto', desc: '1 uso por descanso.' },
    ],

    hechizos: [
      {
        "nombre": "Alarm (Oath)",
        "nivel": 1,
        "tiempo": "1 min (Ritual)",
        "alcance": "30 ft",
        "area": "",
        "resumen": "Abjuración (V, S, M). Estableces una protección mágica en una zona de hasta 20 ft de radio. Si una criatura Pequeña o más grande entra sin tu permiso, recibes una alerta mental (si estás a 1 milla) o suena una campana audible a 60 ft.",
        "duracion": "8 horas",
        "formula": null,
        "slotCost": 1,
        "ataque": null
      },
      {
        "nombre": "Detect Magic (Oath)",
        "nivel": 1,
        "tiempo": "1 Acc (Ritual)",
        "alcance": "Personal",
        "area": "",
        "resumen": "Adivinación (V, S). Sientes la presencia de magia a 30 pies. Puedes usar tu acción para ver una aura tenue alrededor de criaturas u objetos mágicos e identificar su escuela de magia.",
        "duracion": "Conc. 10 min",
        "formula": null,
        "slotCost": 1,
        "ataque": null
      },
      {
        "nombre": "Bless",
        "nivel": 1,
        "tiempo": "1 Acción",
        "alcance": "60 ft",
        "area": "",
        "resumen": "Encantamiento (V, S, M). Bendices a hasta 3 criaturas a tu elección. Cada vez que realicen una tirada de ataque o de salvación, tiran 1d4 adicional y lo suman al resultado.",
        "duracion": "Conc. 1 min",
        "formula": null,
        "slotCost": 1,
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
        "nombre": "Cure Wounds",
        "nivel": 1,
        "tiempo": "1 Acción",
        "alcance": "Toque",
        "area": "",
        "resumen": "Evocación (V, S). Tocas a una criatura para restaurar 1d8 + 2 (Mod. Carisma) Puntos de Golpe. Escalado: +1d8 extra por cada nivel de ranura superior al 1º.",
        "duracion": "Instantáneo",
        "formula": {
          "count": 1,
          "sides": 8,
          "mod": 2
        },
        "slotCost": 1,
        "upcast": {
          "tipo": "dado",
          "nivelBase": 1,
          "dado": {
            "count": 1,
            "sides": 8
          }
        },
        "ataque": null
      },
      {
        "nombre": "Heroism",
        "nivel": 1,
        "tiempo": "1 Acción",
        "alcance": "Toque",
        "area": "",
        "resumen": "Encantamiento (V, S). Infundes valor en un aliado voluntario. Es inmune a estar Asustado (Frightened) y gana 2 HP Temporales (igual a tu Mod. Carisma) al comienzo de cada uno de sus turnos mientras dure el conjuro.",
        "duracion": "Conc. 1 min",
        "formula": null,
        "slotCost": 1,
        "ataque": null
      },
      {
        "nombre": "Compelled Duel",
        "nivel": 1,
        "tiempo": "1 Acción Bonus",
        "alcance": "30 ft",
        "area": "",
        "resumen": "Encantamiento (V). Desafías a una criatura. Debe realizar una salvación de Sabiduría (CD <span class=\"js-calc\" data-calc=\"cd\">13</span>); si falla, tiene desventaja en ataques contra cualquiera que no seas tú y debe hacer una salvación de Sabiduría para intentar moverse a más de 30 ft de ti.",
        "duracion": "Conc. 1 min",
        "formula": null,
        "slotCost": 1,
        "ataque": {
          "tipo": "salvacion",
          "habilidad": "WIS",
          "dc": 13,
          "dcAuto": true
        }
      },
      {
        "nombre": "Moonbeam (Oath)",
        "nivel": 2,
        "tiempo": "1 Acción",
        "alcance": "120 ft",
        "area": "Cilindro de 5 ft de radio y 40 ft de alto",
        "resumen": "Evocación (V, S, M). Un haz plateado hace 2d10 daño radiante a cualquier criatura que entre o empiece su turno ahí (Salvación CON CD <span class=\"js-calc\" data-calc=\"cd\">13</span> reduce a la mitad). Los cambiaformas tiran con desventaja y revelan su forma real si fallan.",
        "duracion": "Conc. 1 min",
        "formula": {
          "count": 2,
          "sides": 10,
          "mod": 0
        },
        "slotCost": 2,
        "ataque": {
          "tipo": "salvacion",
          "habilidad": "CON",
          "dc": 13,
          "dcAuto": true
        }
      },
      {
        "nombre": "See Invisibility (Oath)",
        "nivel": 2,
        "tiempo": "1 Acción",
        "alcance": "Personal",
        "area": "",
        "resumen": "Adivinación (V, S, M). Ves claramente a todas las criaturas y objetos invisibles como si fueran visibles, así como la proyección en el Plano Etéreo dentro de tu línea de visión.",
        "duracion": "1 hora",
        "formula": null,
        "slotCost": 2,
        "ataque": null
      },
      {
        "nombre": "Aid",
        "nivel": 2,
        "tiempo": "1 Acción",
        "alcance": "30 ft",
        "area": "",
        "resumen": "Abjuración (V, S, M). Fortaleces la resolución de hasta 3 aliados dentro del alcance. Su vida máxima y sus Puntos de Golpe actuales aumentan en +5 HP durante toda la duración.",
        "duracion": "8 horas",
        "formula": null,
        "slotCost": 2,
        "ataque": null,
        "buff": {
          "activo": false,
          "efectos": [
            {
              "tipo": "plano",
              "objetivo": "hp-max",
              "valor": 5
            }
          ]
        }
      },
      {
        "nombre": "Magic Weapon",
        "nivel": 2,
        "tiempo": "1 Acción Bonus",
        "alcance": "Toque",
        "area": "",
        "resumen": "Transmutación (V, S). Tocas un arma no mágica. Mientras el conjuro esté activo, el arma se vuelve mágica y otorga un bono de +1 a las tiradas de ataque y daño (el buff automático suma solo el +1 al ataque; el daño se suma a mano).",
        "duracion": "Conc. 1 hora",
        "formula": null,
        "slotCost": 2,
        "ataque": null,
        "buff": {
          "activo": false,
          "efectos": [
            {
              "tipo": "plano",
              "objetivo": "ataque",
              "valor": 1
            }
          ]
        }
      },
      {
        "nombre": "Zone of Truth",
        "nivel": 2,
        "tiempo": "1 Acción",
        "alcance": "60 ft",
        "area": "Esfera de 15 ft de radio",
        "resumen": "Encantamiento (V, S). Creas un área mágica de 15 ft de radio. Las criaturas en la zona deben superar una salvación de Carisma (CD <span class=\"js-calc\" data-calc=\"cd\">13</span>) o quedan imposibilitadas de decir mentiras deliberadas mientras permanezcan en ella.",
        "duracion": "10 min",
        "formula": null,
        "slotCost": 2,
        "ataque": {
          "tipo": "salvacion",
          "habilidad": "CHA",
          "dc": 13,
          "dcAuto": true
        }
      }
    ],

    inventario: [
      {
        "nombre": "Plate Armor & Shield",
        "descripcion": "AC 21 (18 Plate + 2 Shield + 1 Defense Style)",
        "cantidad": 1,
        "precio": 0,
        "equipado": true,
        "categoria": "general",
        "consumible": false,
        "modAC": null,
        "dexCap": null
      },
      {
        "nombre": "Mace (Maza)",
        "descripcion": "Arma Principal (1d8+3 B)",
        "cantidad": 1,
        "precio": 0,
        "equipado": true,
        "categoria": "general",
        "consumible": false,
        "modAC": null,
        "dexCap": null
      },
      {
        "nombre": "Dice Set",
        "descripcion": "Juego de Dados (Competencia)",
        "cantidad": 1,
        "precio": 0,
        "equipado": true,
        "categoria": "general",
        "consumible": false,
        "modAC": null,
        "dexCap": null
      },
      {
        "nombre": "Backpack & Explorer's Pack",
        "descripcion": "Equipo de aventuras",
        "cantidad": 1,
        "precio": 0,
        "equipado": true,
        "categoria": "general",
        "consumible": false,
        "modAC": null,
        "dexCap": null
      },
      {
        "nombre": "Símbolo Sagrado",
        "descripcion": "Foco de Lanzamiento de Conjuros",
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
      { id: 'cp-val', etiqueta: 'CP' }, { id: 'sp-val', etiqueta: 'SP' }, { id: 'ep-val', etiqueta: 'EP' }, { id: 'gp-val', etiqueta: 'GP', valor: 100 }, { id: 'pp-val', etiqueta: 'PP' },
    ],

    rasgos: [
      {
        "id": "txt-feat-aura-aura-of-protection-10-ft",
        "tag": "Aura",
        "titulo": "Aura of Protection (10 ft)",
        "html": "<p>Mientras estés consciente, tú y todos los aliados a 10 pies o menos reciben un bono de <strong><span class=\"js-calc\" data-calc=\"auraProt\">+2</span> (tu modificador de Carisma)</strong> a todas las tiradas de salvación.</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Aura of Protection (10 ft)"
          }
        ]
      },
      {
        "id": "txt-feat-aura-aura-of-the-sentinel-10-ft",
        "tag": "Aura",
        "titulo": "Aura of the Sentinel (10 ft)",
        "html": "<p>Emites una presencia alerta. Tú y tus aliados a 10 pies o menos obtienen un bono de <strong><span class=\"js-calc\" data-calc=\"prof\">+3</span> (tu bono de competencia)</strong> a sus tiradas de iniciativa.</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Aura of the Sentinel (10 ft)"
          }
        ]
      },
      {
        "id": "txt-feat-watchers-watcher-s-will-channel-divinity",
        "tag": "Watchers",
        "titulo": "Watcher's Will (Channel Divinity)",
        "html": "<p>Como acción, manifiestas la vigilancia del juramento. Otorga a ti y a hasta 2 aliados (tu Mod. Carisma) a 30 pies <strong>Ventaja en todas las salvaciones de Inteligencia, Sabiduría y Carisma</strong> durante 1 minuto.</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Watcher's Will (Channel Divinity)"
          }
        ]
      },
      {
        "id": "txt-feat-watchers-abjure-the-extraplanar-channel-divinity",
        "tag": "Watchers",
        "titulo": "Abjure the Extraplanar (Channel Divinity)",
        "html": "<p>Como acción, presentas tu símbolo sagrado. Cada aberración, elemental, fey, fiend (infernal) o celestial a 30 pies que pueda oírte debe superar una salvación de Sabiduría (CD <span class=\"js-calc\" data-calc=\"cd\">13</span>) o ser <strong>expulsado/ahuyentado durante 1 minuto</strong> o hasta recibir daño.</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Abjure the Extraplanar (Channel Divinity)"
          }
        ]
      },
      {
        "id": "txt-feat-paladin-divine-sense-3-dia",
        "tag": "Paladín",
        "titulo": "Divine Sense (3/día)",
        "html": "<p>Como acción, enfocas tu percepción divina. Hasta el final de tu siguiente turno, conoces la ubicación exacta de cualquier celestial, fiend o muerto viviente a 60 pies que no esté tras cobertura total, así como terrenos u objetos consagrados/desecrados.</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Divine Sense (3/día)"
          }
        ]
      },
      {
        "id": "txt-feat-paladin-lay-on-hands",
        "tag": "Paladín",
        "titulo": "Lay on Hands",
        "html": "<p>Tienes una reserva curativa de <strong>35 Puntos de Golpe</strong> (5 x nivel). Como acción al tocar a una criatura, puedes restaurar HP de la reserva o gastar 5 HP para purificar y curar una enfermedad o veneno que la afecte.</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Lay on Hands"
          }
        ]
      },
      {
        "id": "txt-feat-paladin-fighting-style-defense",
        "tag": "Paladín",
        "titulo": "Fighting Style: Defense",
        "html": "<p>Adquieres un entrenamiento defensivo riguroso. Ganas un bono permanente de <strong>+1 a tu Clase de Armadura (AC)</strong> mientras lleves puesta cualquier armadura (ya sumado en tu AC 21).</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Fighting Style: Defense"
          }
        ]
      },
      {
        "id": "txt-feat-paladin-divine-health-extra-attack",
        "tag": "Paladín",
        "titulo": "Divine Health & Extra Attack",
        "html": "<p>• <strong>Divine Health:</strong> La magia divina en tus venas te hace totalmente inmune a las enfermedades.<br>• <strong>Extra Attack:</strong> Puedes realizar dos ataques en lugar de uno al tomar la acción de Atacar en tu turno.</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Divine Health & Extra Attack"
          }
        ]
      },
      {
        "id": "txt-feat-raza-draconic-ancestry-dragonborn-fuego",
        "tag": "Raza",
        "titulo": "Draconic Ancestry (Dragonborn Fuego)",
        "html": "<p>• <strong>Resistencia Dracónica:</strong> Posees resistencia natural contra el daño de Fuego (recibes la mitad de daño).<br>• <strong>Breath Weapon:</strong> Exhalas fuego en un cono de 15 ft (CD <span class=\"js-calc\" data-calc=\"cdAliento\">14</span> DEX, 3d6 daño — escala a 4d6 en nivel 11 y 5d6 en nivel 16).</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Draconic Ancestry (Dragonborn Fuego)"
          }
        ]
      }
    ],
  };
})();

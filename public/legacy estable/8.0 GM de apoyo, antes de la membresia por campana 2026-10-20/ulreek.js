/*
 * personajes/ulreek.js — datos de Ulreek para la carcasa única (ficha.html?pj=ulreek).
 *
 * Extraído de ulreek.html (la ficha viva sigue siendo la referencia dorada). Las claves de datos (hp-cur, hp-temp, hd-N,
 * slot-N-cur, slot-pact-cur, sorc-pts, hechizos-pool, cond-*, …) son las MISMAS que ya guarda Firebase.
 * Lo propio de Ulreek es la reserva doble de espacios (Sorcerer vs Pact Magic de Warlock): cada hechizo de nivel 1+ tiene un
 * selector de pool guardado por NOMBRE en datos/hechizos-pool, y los ganchos de FICHA_CONFIG redirigen el gasto al espacio de pacto.
 */
window.PERSONAJES = window.PERSONAJES || {};
(function () {
  const $ = (id) => document.getElementById(id);

  // ---- pool de espacios por hechizo (Sorcerer / Pact) ----
  function poolMapa() { try { return JSON.parse(($('hechizos-pool') || {}).value || '{}') || {}; } catch (e) { return {}; } }
  function poolDe(nombre) { return poolMapa()[nombre] === 'pact' ? 'pact' : 'sorc'; }
  function fijarPool(nombre, pool) {
    const m = poolMapa();
    if (pool === 'pact') m[nombre] = 'pact'; else delete m[nombre];
    const json = JSON.stringify(m);
    const hidden = $('hechizos-pool'); if (hidden) hidden.value = json;
    FichaComun.guardarCampo('hechizos-pool', json);
  }
  function nivelPact() { const n = parseInt((($('slot-pact-nivel') || {}).textContent), 10); return isNaN(n) ? 1 : n; }

  function decorarFilasConPool() {
    if (!window.FichaHechizos) return;
    const items = FichaHechizos.editor.items();
    document.querySelectorAll('#hechizos-lista tr').forEach(tr => {
      const btn = tr.querySelector('button[onclick^="FichaHechizos.usar("]');
      const cell = tr.querySelector('.spell-item-actions');
      if (!btn || !cell) return;
      const idx = parseInt(btn.getAttribute('onclick').match(/usar\((\d+)/)[1], 10);
      const h = items[idx];
      let sel = cell.querySelector('.pool-sel');
      if (!h || h.nivel === 0) { if (sel) sel.remove(); return; }
      if (!sel) {
        sel = document.createElement('select');
        sel.className = 'pool-sel';
        sel.setAttribute('aria-label', 'Pool de espacios');
        sel.title = '¿De qué pool de espacios gasta al lanzarlo? (Sorcerer o Pact Magic de Warlock)';
        sel.innerHTML = '<option value="sorc">Sorcerer</option><option value="pact">Pact</option>';
        sel.addEventListener('change', () => fijarPool(sel.dataset.nombre, sel.value));
        cell.insertBefore(sel, cell.firstChild);
      }
      sel.dataset.nombre = h.nombre;
      sel.value = poolDe(h.nombre);
    });
  }

  PERSONAJES.ulreek = {
  // Tablas aleatorias (ficha-tablas.js): se tiran con un botón y se pueden editar entrada por entrada. Semilla: la guardada en la ficha manda.
  tablas: [{
    id: 'wild-magic', nombre: 'Tabla de Wild Magic Surge', icono: '🌀', dado: 100,
    nota: 'Hechicero de Magia Salvaje (PHB, Wild Magic Surge). Efectos resumidos en español y escritos de memoria: confírmalos con tu PHB y corrígelos con ✏️ si hace falta. Tras lanzar un conjuro de hechicero de nivel 1 o superior el DM puede pedirte un d20: con 1 tiras aquí; también puedes gastar Tides of Chaos para forzarla.',
    previo: { dado: 20, dispara: 1, etiqueta: '¿hay sobrecarga? (1 = sí)', texto: 'Después de lanzar un conjuro de hechicero de nivel 1 o superior: con un 1 en el d20 se tira en la tabla de Wild Magic Surge.' },
    entradas: [
      [1, 2, "Tira en esta tabla al inicio de cada uno de tus turnos durante 1 minuto (ignora este resultado en las tiradas siguientes)."],
      [3, 4, "Durante 1 minuto ves a las criaturas invisibles si tienes línea de visión hacia ellas."],
      [5, 6, "Aparece un modron controlado por el DM en un espacio libre a 5 pies de ti; desaparece tras 1 minuto."],
      [7, 8, "Lanzas Fireball como conjuro de nivel 3, centrado en ti."],
      [9, 10, "Lanzas Magic Missile como conjuro de nivel 5."],
      [11, 12, "Tira 1d10: tu altura cambia esa cantidad de pulgadas (resultado impar: encoges; par: creces)."],
      [13, 14, "Lanzas Confusion centrado en ti."],
      [15, 16, "Durante 1 minuto recuperas 5 PG al inicio de cada uno de tus turnos."],
      [17, 18, "Te crece una larga barba de plumas que dura hasta que estornudes; entonces las plumas salen disparadas."],
      [19, 20, "Lanzas Grease centrado en ti."],
      [21, 22, "Durante 1 minuto, las criaturas tienen desventaja en las salvaciones contra el siguiente conjuro tuyo que requiera salvación."],
      [23, 24, "Tu piel se vuelve de un azul vibrante; Remove Curse termina el efecto."],
      [25, 26, "Te aparece un ojo en la frente durante 1 minuto: ventaja en pruebas de Sabiduría (Percepción) que dependan de la vista."],
      [27, 28, "Durante 1 minuto, tus conjuros con tiempo de lanzamiento de 1 acción se lanzan como acción adicional."],
      [29, 30, "Te teletransportas hasta 60 pies a un espacio libre que puedas ver."],
      [31, 32, "Te transportas al Plano Astral hasta el final de tu siguiente turno; vuelves al mismo espacio (o al libre más cercano)."],
      [33, 34, "Maximiza el daño del siguiente conjuro dañino que lances durante el próximo minuto."],
      [35, 36, "Tira 1d10: tu edad cambia esa cantidad de años (impar: rejuveneces, mínimo 1 año; par: envejeces)."],
      [37, 38, "1d6 flumphs controlados por el DM aparecen en espacios libres a 60 pies; te temen y desaparecen tras 1 minuto."],
      [39, 40, "Recuperas 2d10 PG."],
      [41, 42, "Te conviertes en una planta en maceta hasta el inicio de tu siguiente turno: incapacitado y vulnerable a todo el daño; si llegas a 0 PG se rompe la maceta y vuelves a tu forma."],
      [43, 44, "Durante 1 minuto puedes teletransportarte hasta 20 pies como acción adicional en cada uno de tus turnos."],
      [45, 46, "Lanzas Levitate sobre ti."],
      [47, 48, "Aparece un unicornio controlado por el DM a 5 pies de ti; desaparece tras 1 minuto."],
      [49, 50, "No puedes hablar durante 1 minuto: cuando lo intentas, salen burbujas rosas de tu boca."],
      [51, 52, "Un escudo espectral flota a tu lado durante 1 minuto: +2 a la CA e inmunidad a Magic Missile."],
      [53, 54, "Eres inmune a la embriaguez por alcohol durante 5d6 días."],
      [55, 56, "Se te cae todo el pelo, pero vuelve a crecer en 24 horas."],
      [57, 58, "Durante 1 minuto, cualquier objeto inflamable que toques y que no lleve puesto ni cargue otra criatura estalla en llamas."],
      [59, 60, "Recuperas tu espacio de conjuro gastado de menor nivel."],
      [61, 62, "Durante 1 minuto tienes que gritar cada vez que hablas."],
      [63, 64, "Lanzas Fog Cloud centrado en ti."],
      [65, 66, "Hasta tres criaturas que elijas a 30 pies de ti reciben 4d10 de daño de rayo."],
      [67, 68, "Te asusta la criatura más cercana hasta el final de tu siguiente turno."],
      [69, 70, "Cada criatura a 30 pies de ti se vuelve invisible durante 1 minuto; el efecto termina en una criatura si ataca o lanza un conjuro."],
      [71, 72, "Ganas resistencia a todo el daño durante 1 minuto."],
      [73, 74, "Una criatura aleatoria a 60 pies de ti queda envenenada durante 1d4 horas."],
      [75, 76, "Brillas con luz brillante en un radio de 30 pies durante 1 minuto; quien termine su turno a 5 pies de ti queda cegado hasta el final de su siguiente turno."],
      [77, 78, "Lanzas Polymorph sobre ti; si fallas la salvación te conviertes en oveja mientras dure el conjuro."],
      [79, 80, "Mariposas ilusorias y pétalos de flores revolotean a 10 pies de ti durante 1 minuto."],
      [81, 82, "Puedes realizar una acción adicional de inmediato."],
      [83, 84, "Cada criatura a 30 pies de ti recibe 1d10 de daño necrótico; recuperas PG iguales a la suma del daño infligido."],
      [85, 86, "Lanzas Mirror Image."],
      [87, 88, "Lanzas Fly sobre una criatura aleatoria a 60 pies de ti."],
      [89, 90, "Te vuelves invisible durante 1 minuto y nadie te oye; termina si atacas o lanzas un conjuro."],
      [91, 92, "Si mueres durante el próximo minuto, vuelves a la vida de inmediato como con Reincarnate."],
      [93, 94, "Tu tamaño aumenta una categoría durante 1 minuto."],
      [95, 96, "Tú y todas las criaturas a 30 pies de ti ganan vulnerabilidad al daño perforante durante 1 minuto."],
      [97, 98, "Te rodea una tenue música etérea durante 1 minuto."],
      [99, 100, "Recuperas todos tus puntos de hechicería gastados."]
    ],
  }],

    id: 'ulreek',
    nombre: 'Ulreek',                       // nombre visible para el GM en el log de tiradas
    nombreCompleto: 'Ulreek Pico Maldito',
    sistema: 'dnd',
    paleta: 'amatista',
    subtitulo: 'Sorcerer 7 / Warlock 1 | Wild Dwarf',
    xp: 49500,
    clases: [
      { nombre: 'Sorcerer', dado: 6, nivelInicial: 7, caster: 'full', subclase: 'Wild Magic Sorcery' },
      { nombre: 'Warlock', dado: 8, nivelInicial: 1, caster: 'pact' },
    ],
    hpBase: 51,                              // PG máximos a nivel 8 (Sorcerer 7 / Warlock 1); las subidas suman su hpGanado
    idHpTemp: 'hp-temp',                     // la ficha viva usa hp-temp (no hp-temp-input)
    camposOcultos: ['hechizos-pool'],
    velocidad: 30,
    habilidadAtaque: 'STR',
    habilidadConjuro: 'CHA',
    atributos: { STR: 10, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 20 },
    salvaciones: ['CON', 'CHA'],
    habilidades: { 'Deception': 'comp', 'Intimidation': 'comp', 'Persuasion': 'comp', 'Stealth': 'comp' },
    // Sin armadura equipada: 10 + DEX (evidencia: su ficha mostraba CA 12 con DEX 14, sin armadura en el inventario).
    ca: { sinArmadura: () => 10 + FichaAtributos.modDe('DEX'), texto: '10 + DEX' },

    ataques: [
      { nombre: 'Unarmed Strike', habilidad: 'STR', textoDano: '1 + STR', notas: 'Ataque melee, 1 Acción' },
    ],

    recursos: [
      { id: 'sorc', tipo: 'pool', nombre: 'Puntos de Sorcery', icono: '🔮', max: (c) => c.clase('Sorcerer'), campo: 'sorc-pts', recarga: 'largo', pasos: [-1, 1], inicial: 7,
        desc: 'Se pueden gastar para crear espacios de conjuro extra o convertir espacios en puntos (Font of Magic).' },
    ],

    hechizos: [
      {
        "nombre": "Guidance",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "Tacto",
        "area": "",
        "resumen": "V/S, Conc. Suma 1d4 a una prueba de característica.",
        "duracion": "Conc., hasta 1 min",
        "formula": {
          "count": 1,
          "sides": 4,
          "mod": 0
        },
        "slotCost": null,
        "ataque": null
      },
      {
        "nombre": "Fire Bolt",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "120 ft",
        "area": "",
        "resumen": "V/S. Atq. a distancia; 1d10 fuego.",
        "duracion": "Instantáneo",
        "formula": {
          "count": 1,
          "sides": 10,
          "mod": 0
        },
        "slotCost": null,
        "ataque": {
          "tipo": "ataque",
          "bonus": 8,
          "bonusAuto": true
        }
      },
      {
        "nombre": "Mage Hand",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "30 ft",
        "area": "",
        "resumen": "V/S. Mano espectral, 1 min, hasta 10 lb.",
        "duracion": "1 min",
        "formula": null,
        "slotCost": null,
        "ataque": null
      },
      {
        "nombre": "Eldritch Blast",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "120 ft",
        "area": "",
        "resumen": "V/S. Atq. a distancia; 2 rayos de 1d10 fuerza c/u (nivel de personaje 8).",
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
        }
      },
      {
        "nombre": "Minor Illusion",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "30 ft",
        "area": "",
        "resumen": "S/M. Sonido o imagen, 1 min.",
        "duracion": "1 min",
        "formula": null,
        "slotCost": null,
        "ataque": null
      },
      {
        "nombre": "Prestidigitation",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "10 ft",
        "area": "",
        "resumen": "V/S. Truco menor, hasta 1h.",
        "duracion": "1 hora",
        "formula": null,
        "slotCost": null,
        "ataque": null
      },
      {
        "nombre": "Ray of Frost",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "60 ft",
        "area": "",
        "resumen": "V/S. Atq. a distancia; 1d8 frío, -10ft veloc.",
        "duracion": "Instantáneo",
        "formula": {
          "count": 1,
          "sides": 8,
          "mod": 0
        },
        "slotCost": null,
        "ataque": {
          "tipo": "ataque",
          "bonus": 8,
          "bonusAuto": true
        }
      },
      {
        "nombre": "Light",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "Tacto",
        "area": "",
        "resumen": "V/M. Luz brillante 20ft + tenue 20ft, 1h.",
        "duracion": "1 hora",
        "formula": null,
        "slotCost": null,
        "ataque": null
      },
      {
        "nombre": "Mind Sliver",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "60 ft",
        "area": "",
        "resumen": "V. INT save; 2d6 psíquico (nivel de personaje 8) y -1d4 a próxima salvación.",
        "duracion": "Instantáneo",
        "formula": {
          "count": 2,
          "sides": 6,
          "mod": 0
        },
        "slotCost": null,
        "ataque": {
          "tipo": "salvacion",
          "habilidad": "INT",
          "dc": 16,
          "dcAuto": true
        }
      },
      {
        "nombre": "Booming Blade",
        "nivel": 0,
        "tiempo": "1 Acción",
        "alcance": "Self (5ft)",
        "area": "",
        "resumen": "S/M. Atq. cuerpo a cuerpo con arma; +1d8 trueno si el objetivo se mueve.",
        "duracion": "1 asalto",
        "formula": null,
        "slotCost": null,
        "ataque": null
      },
      {
        "nombre": "Fog Cloud",
        "nivel": 1,
        "tiempo": "1 Acción",
        "alcance": "120 ft",
        "area": "Esfera 20 ft",
        "resumen": "V/S, Conc. Esfera de niebla 20ft radio, hasta 1h.",
        "duracion": "Conc., hasta 1 hora",
        "formula": null,
        "slotCost": 1,
        "ataque": null
      },
      {
        "nombre": "Shield",
        "nivel": 1,
        "tiempo": "1 Reacción",
        "alcance": "Self",
        "area": "",
        "resumen": "V/S. +5 CA hasta el inicio de tu próximo turno; inmune a magic missile.",
        "duracion": "1 asalto",
        "formula": null,
        "slotCost": 1,
        "ataque": null,
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
        "nombre": "Sleep",
        "nivel": 1,
        "tiempo": "1 Acción",
        "alcance": "90 ft",
        "area": "Área 20 ft",
        "resumen": "V/S/M. 5d8 HP de criaturas dormidas, 1 min.",
        "duracion": "1 min",
        "formula": {
          "count": 5,
          "sides": 8,
          "mod": 0
        },
        "slotCost": 1,
        "ataque": null
      },
      {
        "nombre": "Dissonant Whispers",
        "nivel": 1,
        "tiempo": "1 Acción",
        "alcance": "60 ft",
        "area": "",
        "resumen": "V. WIS save; 3d6 psíquico (mitad si salva) y el objetivo huye.",
        "duracion": "Instantáneo",
        "formula": {
          "count": 3,
          "sides": 6,
          "mod": 0
        },
        "slotCost": 1,
        "ataque": {
          "tipo": "salvacion",
          "habilidad": "WIS",
          "dc": 16,
          "dcAuto": true
        }
      },
      {
        "nombre": "Armor of Agathys",
        "nivel": 1,
        "tiempo": "1 Acción",
        "alcance": "Self",
        "area": "",
        "resumen": "V/S/M. 5 HP temp; quien te golpee cuerpo a cuerpo recibe 5 frío.",
        "duracion": "1 hora",
        "formula": null,
        "slotCost": 1,
        "ataque": null
      },
      {
        "nombre": "Hex",
        "nivel": 1,
        "tiempo": "1 Acción Adicional",
        "alcance": "90 ft",
        "area": "",
        "resumen": "V/S/M, Conc. +1d6 necrótico por golpe, 1h; desventaja en una característica elegida.",
        "duracion": "Conc., hasta 1 hora",
        "formula": {
          "count": 1,
          "sides": 6,
          "mod": 0
        },
        "slotCost": 1,
        "ataque": null,
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
        "nombre": "Misty Step",
        "nivel": 2,
        "tiempo": "1 Acción Adicional",
        "alcance": "Self",
        "area": "",
        "resumen": "V. Teletransporte hasta 30ft a espacio visible.",
        "duracion": "Instantáneo",
        "formula": null,
        "slotCost": 2,
        "ataque": null
      },
      {
        "nombre": "Suggestion",
        "nivel": 2,
        "tiempo": "1 Acción",
        "alcance": "30 ft",
        "area": "",
        "resumen": "V/M, Conc. WIS save; sigue el curso de acción sugerido, hasta 8h.",
        "duracion": "Conc., hasta 8 horas",
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
        "nombre": "Web",
        "nivel": 2,
        "tiempo": "1 Acción",
        "alcance": "60 ft",
        "area": "Cubo 20 ft",
        "resumen": "V/S/M, Conc. Cubo de telaraña 20ft, DEX save o restringido, hasta 1h.",
        "duracion": "Conc., hasta 1 hora",
        "formula": null,
        "slotCost": 2,
        "ataque": {
          "tipo": "salvacion",
          "habilidad": "DEX",
          "dc": 16,
          "dcAuto": true
        }
      },
      {
        "nombre": "Fireball",
        "nivel": 3,
        "tiempo": "1 Acción",
        "alcance": "150 ft",
        "area": "Esfera 20 ft",
        "resumen": "V/S/M. DEX save DC <span class=\"js-calc\" data-calc=\"cd\">16</span>; 8d6 fuego (mitad si salva).",
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
        }
      },
      {
        "nombre": "Haste",
        "nivel": 3,
        "tiempo": "1 Acción",
        "alcance": "30 ft",
        "area": "",
        "resumen": "V/S/M, Conc. Doble velocidad, +2 CA, ventaja en DEX save, acción extra, 1 min.",
        "duracion": "Conc., hasta 1 min",
        "formula": null,
        "slotCost": 3,
        "ataque": null,
        "buff": {
          "activo": false,
          "efectos": [
            {
              "tipo": "plano",
              "objetivo": "ca",
              "valor": 2
            }
          ]
        }
      },
      {
        "nombre": "Greater Invisibility",
        "nivel": 4,
        "tiempo": "1 Acción",
        "alcance": "Tacto",
        "area": "",
        "resumen": "V/S, Conc. Invisibilidad hasta 1 min, incluso en combate.",
        "duracion": "Conc., hasta 1 min",
        "formula": null,
        "slotCost": 4,
        "ataque": null
      }
    ],

    inventario: [
      {
        "nombre": "Poción \"shoes\"",
        "descripcion": "Permite adquirir cualquier apariencia como disfraz. Investigaciones y checks de percepción tienen desventaja contra ti. Dura hasta medianoche.",
        "cantidad": 1,
        "precio": 0,
        "equipado": true,
        "categoria": "general",
        "consumible": false,
        "modAC": null,
        "dexCap": null
      },
      {
        "nombre": "Potion of Wild",
        "descripcion": "Efecto inmediato: Tiras en la tabla de Wild Magic Surge.",
        "cantidad": 1,
        "precio": 0,
        "equipado": true,
        "categoria": "general",
        "consumible": false,
        "modAC": null,
        "dexCap": null
      },
      {
        "nombre": "Horn of the Brave",
        "descripcion": "Contiene hidromiel sin fin. Concede inmunidad al miedo y ventaja en salvaciones de Sabiduría por 1 hora. Se recarga en descanso corto.",
        "cantidad": 1,
        "precio": 0,
        "equipado": true,
        "categoria": "general",
        "consumible": false,
        "modAC": null,
        "dexCap": null
      },
      {
        "nombre": "baculo de light",
        "descripcion": "sacasc",
        "cantidad": 1,
        "precio": 0,
        "equipado": true,
        "categoria": "general",
        "consumible": false,
        "modAC": null,
        "dexCap": null
      },
      {
        "nombre": "healing potion",
        "descripcion": "2d4+3",
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

    rasgos: [
      {
        "id": "txt-feat-sorcerer-spellcasting-sorcerous-origin",
        "tag": "Sorcerer",
        "titulo": "Spellcasting & Sorcerous Origin",
        "html": "<p>• <strong>Spellcasting:</strong> Carisma es tu característica de lanzamiento (Spell Save DC <span class=\"js-calc\" data-calc=\"cd\">16</span>, Spell Atk <span class=\"js-calc\" data-calc=\"spellAtk\">+8</span>). Conoces 9 hechizos de Sorcerer y 5 trucos a nivel 7.</p>\n<p>• <strong>Sorcerous Origin: Wild Magic.</strong></p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Spellcasting & Sorcerous Origin"
          }
        ]
      },
      {
        "id": "txt-feat-wild-magic-wild-magic-surge-tides-of-chaos-nivel-1",
        "tag": "Wild Magic",
        "titulo": "Wild Magic Surge & Tides of Chaos (Nivel 1)",
        "html": "<p>• <strong>Wild Magic Surge:</strong> El DM puede pedirte que tires en la Tabla de Sobrecarga de Magia Salvaje después de lanzar un hechizo de Sorcerer de nivel 1+ (1 en d20).</p>\n<p>• <strong>Tides of Chaos:</strong> Puedes gastar tu Tides of Chaos una vez antes de un descanso largo para obtener ventaja en una tirada de ataque, prueba de característica o salvación. Después de usarlo, el DM puede pedirte una tirada en la Tabla de Sobrecarga. Se recupera al gastar un punto de Sorcery para crear un espacio de conjuro, o con un descanso largo.</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Wild Magic Surge & Tides of Chaos (Nivel 1)"
          }
        ]
      },
      {
        "id": "txt-feat-sorcerer-font-of-magic-nivel-2",
        "tag": "Sorcerer",
        "titulo": "Font of Magic (Nivel 2)",
        "html": "<p>Puntos de Hechicería = nivel de Sorcerer = <strong>7</strong>. Puedes gastarlos como acción adicional para crear espacios de conjuro (1º=2pts, 2º=3pts, 3º=5pts, 4º=6pts, 5º=7pts, máx nivel 5), o convertir un espacio gastado en puntos (= nivel del espacio).</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Font of Magic (Nivel 2)"
          }
        ]
      },
      {
        "id": "txt-feat-sorcerer-metamagic-nivel-3-2-opciones",
        "tag": "Sorcerer",
        "titulo": "Metamagic (Nivel 3 — 2 opciones)",
        "html": "<p>⚠️ <strong>A definir: elige 2</strong> entre Careful Spell, Distant Spell, Empowered Spell, Extended Spell, Heightened Spell, Quickened Spell, Seeking Spell, Subtle Spell, Transmuted Spell o Twinned Spell. (Se agregarán las 2 opciones elegidas con su texto mecánico cuando lo confirmes; la 3ª opción llega en nivel 10 de Sorcerer.)</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Metamagic (Nivel 3 — 2 opciones)"
          }
        ]
      },
      {
        "id": "txt-feat-warlock-otherworldly-patron-pact-magic-nivel-1",
        "tag": "Warlock",
        "titulo": "Otherworldly Patron & Pact Magic (Nivel 1)",
        "html": "<p>• <strong>Otherworldly Patron:</strong> ⚠️ pendiente de definir (ya anotado en la lista de pendientes de la campaña).</p>\n<p>• <strong>Pact Magic:</strong> 1 espacio de conjuro de nivel 1, exclusivo de Warlock (checkbox aparte en Recursos y en Spell Slots) — se recupera en descanso <strong>corto o largo</strong>, a diferencia de los espacios de Sorcerer.</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Otherworldly Patron & Pact Magic (Nivel 1)"
          }
        ]
      },
      {
        "id": "txt-feat-raza-dwarf-traits-base",
        "tag": "Raza",
        "titulo": "Dwarf Traits (base)",
        "html": "<p>• <strong>Aumento de característica:</strong> Constitución +2.</p>\n<p>• <strong>Velocidad:</strong> 25 ft (no se reduce con armadura pesada).</p>\n<p>• <strong>Darkvision:</strong> 60 ft.</p>\n<p>• <strong>Dwarven Resilience:</strong> Ventaja en salvaciones contra veneno; resistencia a daño de veneno.</p>\n<p>• <strong>Dwarven Combat Training:</strong> Competencia con battleaxe, handaxe, light hammer y warhammer.</p>\n<p>• <strong>Stonecunning:</strong> Ventaja en pruebas de Historia relacionadas con trabajos en piedra; se considera competente y duplica el bono en esas pruebas.</p>\n<p>• <strong>Idiomas:</strong> Común y Dwarvish (más Elvish y Halfling ya cargados de trasfondo).</p>",
        "acciones": [
          {
            "texto": "✅ Usar",
            "uso": "Dwarf Traits (base)"
          }
        ]
      },
      {
        "id": "txt-feat-detalles-del-personaje",
        "tag": "",
        "titulo": "Detalles del Personaje",
        "html": "<p><strong>Raza:</strong> Wild Dwarf</p>\n<p><strong>Edad:</strong> 300 años</p>\n<p><strong>Altura:</strong> 1.32 m</p>\n<p><strong>Ojos:</strong> Gris | <strong>Pelo:</strong> Blanco | <strong>Piel:</strong> Ocre</p>"
      },
      {
        "id": "txt-feat-competencias-con-armas-y-armaduras",
        "tag": "",
        "titulo": "Competencias con Armas y Armaduras",
        "html": "<p><strong>Armas:</strong> Dagger, Dart, Light Crossbow, Quarterstaff, Sling.</p>\n<p><strong>Armaduras:</strong> Light Armor, Medium Armor, Shields.</p>\n<p><strong>Herramientas:</strong> Jeweler's Tools.</p>"
      },
      {
        "id": "txt-feat-idiomas-sabidos",
        "tag": "",
        "titulo": "Idiomas Sabidos",
        "html": "<p>Common, Elvish, Dwarvish, Halfling.</p>"
      }
    ],

    monedas: [{ id: 'gp-val', etiqueta: 'Piezas de Oro (GP)', valor: 2000 }],

    ganchos: {
      // Con pool "pact" el hechizo gasta slot-pact-cur en vez de slot-N-cur.
      resolverSlotId: (h, nivel) => (h.nivel > 0 && poolDe(h.nombre) === 'pact') ? 'slot-pact-cur' : `slot-${nivel}-cur`,
      validarLanzamiento: (h, nivel, slotId) => {
        if (slotId !== 'slot-pact-cur') return null;
        const np = nivelPact();
        if (h.nivel > np) return `⚠️ El espacio de Pact Magic es de nivel ${np}: no alcanza para "${h.nombre}" (nivel ${h.nivel}).`;
        if ((parseInt(($('slot-pact-cur') || {}).textContent, 10) || 0) <= 0) return '⚠️ No te quedan espacios de Pact Magic (Warlock) disponibles.';
        return null;
      },
      etiquetaEspacio: (slotId, nivel) => slotId === 'slot-pact-cur' ? `Pact Magic (Warlock, nivel ${nivelPact()})` : `nivel ${nivel}`,
    },

    iniciar() {
      // La tabla de hechizos se vuelve a dibujar al sincronizar: se decoran de nuevo las filas con su selector de pool.
      const lista = $('hechizos-lista');
      if (lista) new MutationObserver(decorarFilasConPool).observe(lista, { childList: true });
      document.addEventListener('ficha:datos-sincronizados', decorarFilasConPool);
      decorarFilasConPool();
    },
  };
})();

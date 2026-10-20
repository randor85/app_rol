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
      const idx = parseInt(btn.getAttribute('onclick').match(/usar\((\d+)\)/)[1], 10);
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
        "html": "<p>• <strong>Spellcasting:</strong> Carisma es tu característica de lanzamiento (Spell Save DC <span class=\"js-calc\" data-calc=\"cd\">16</span>, Spell Atk <span class=\"js-calc\" data-calc=\"spellAtk\">+8</span>). Conocés 9 hechizos de Sorcerer y 5 trucos a nivel 7.</p>\n<p>• <strong>Sorcerous Origin: Wild Magic.</strong></p>",
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
        "html": "<p>• <strong>Wild Magic Surge:</strong> El DM puede pedirte que tirés en la Tabla de Sobrecarga de Magia Salvaje después de lanzar un hechizo de Sorcerer de nivel 1+ (1 en d20).</p>\n<p>• <strong>Tides of Chaos:</strong> Podés gastar tu Tides of Chaos una vez antes de un descanso largo para obtener ventaja en una tirada de ataque, prueba de característica o salvación. Después de usarlo, el DM puede pedirte una tirada en la Tabla de Sobrecarga. Se recupera al gastar un punto de Sorcery para crear un espacio de conjuro, o con un descanso largo.</p>",
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
        "html": "<p>Puntos de Hechicería = nivel de Sorcerer = <strong>7</strong>. Podés gastarlos como acción adicional para crear espacios de conjuro (1º=2pts, 2º=3pts, 3º=5pts, 4º=6pts, 5º=7pts, máx nivel 5), o convertir un espacio gastado en puntos (= nivel del espacio).</p>",
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
        "html": "<p>⚠️ <strong>A definir: elegí 2</strong> entre Careful Spell, Distant Spell, Empowered Spell, Extended Spell, Heightened Spell, Quickened Spell, Seeking Spell, Subtle Spell, Transmuted Spell o Twinned Spell. (Se agregarán las 2 opciones elegidas con su texto mecánico cuando lo confirmes; la 3ª opción llega en nivel 10 de Sorcerer.)</p>",
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

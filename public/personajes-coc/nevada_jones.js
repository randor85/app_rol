/* Nevada Jones (Call of Cthulhu 7.ª edición) — datos de la ficha. Generado a partir de nevada_jones.html (v103.0); desde aquí se edita a mano.
 * Los datos que ya guardó el jugador en Firebase (skill-val-<n>, arma-<n>-*, hp-*, mp-*, etc.) siguen valiendo: ver `legado` en ficha-coc-shell.js. */
window.PERSONAJES_COC = window.PERSONAJES_COC || {};
PERSONAJES_COC.nevada_jones = {
  "id": "nevada_jones",
  "nombre": "Nevada Jones",
  "sistema": "coc",
  "paleta": "ascua",
  "subtitulo": "Call of Cthulhu 7.ª edición — ficha de investigador",
  "info": {
    "jugador": "RANDOR",
    "ocupacion": "Profesor de Arqueología",
    "edad": "35 años",
    "residencia": "Arkham",
    "nacimiento": "Winnipeg, Canadá",
    "genero": "Masculino",
    "movimiento": "9",
    "credito": "Promedio (CR 40)",
    "descripcion": "Atractivo pero un poco tosco/desaliñado. Estatura por debajo del promedio. Viste traje cuando es strictly necesario, pero prefiere ropa más casual."
  },
  "infoExtra": [
    {
      "id": "info-sintonia",
      "etiqueta": "Sintonía cósmica",
      "valor": "Yog-Sothoth / Xylt’hora"
    }
  ],
  "caracteristicas": {
    "str": 60,
    "con": 58,
    "siz": 40,
    "dex": 70,
    "app": 50,
    "int": 59,
    "pow": 68,
    "edu": 80
  },
  "suerte": 50,
  "suerteMax": 50,
  "pv": {
    "max": 10,
    "actual": 10
  },
  "pm": {
    "max": 68,
    "actual": 50
  },
  "san": {
    "max": 57,
    "actual": 57
  },
  "habilidades": [
    {
      "id": "accounting",
      "nombre": "Contabilidad",
      "val": 5,
      "en": "Accounting"
    },
    {
      "id": "anthropology",
      "nombre": "Antropología",
      "val": 1,
      "en": "Anthropology"
    },
    {
      "id": "appraise",
      "nombre": "Tasar",
      "val": 5,
      "en": "Appraise"
    },
    {
      "id": "archaeology",
      "nombre": "Arqueología",
      "val": 70,
      "en": "Archaeology"
    },
    {
      "id": "charm",
      "nombre": "Encanto",
      "val": 61,
      "en": "Charm"
    },
    {
      "id": "credit_rating",
      "nombre": "Nivel de Crédito",
      "val": 40,
      "en": "Credit Rating"
    },
    {
      "id": "cthulhu_mythos",
      "nombre": "Mitos de Cthulhu",
      "val": 53,
      "en": "Cthulhu Mythos"
    },
    {
      "id": "dodge",
      "nombre": "Esquivar",
      "val": 44,
      "en": "Dodge"
    },
    {
      "id": "fighting_brawl",
      "nombre": "Lucha: Pelea",
      "val": 58,
      "en": "Fighting: Brawl"
    },
    {
      "id": "firearms_handgun",
      "nombre": "Armas de fuego: Pistola",
      "val": 40,
      "en": "Firearms: Handgun"
    },
    {
      "id": "first_aid",
      "nombre": "Primeros Auxilios",
      "val": 50,
      "en": "First Aid"
    },
    {
      "id": "history",
      "nombre": "Historia",
      "val": 60,
      "en": "History"
    },
    {
      "id": "language_other_latin",
      "nombre": "Idioma: Latín",
      "val": 40
    },
    {
      "id": "idioma_ingl_s_nativo_",
      "nombre": "Idioma: Inglés (Nativo)",
      "val": 80
    },
    {
      "id": "library_use",
      "nombre": "Buscar en Biblioteca",
      "val": 40,
      "en": "Library Use"
    },
    {
      "id": "listen",
      "nombre": "Escuchar",
      "val": 30,
      "en": "Listen"
    },
    {
      "id": "natural_world",
      "nombre": "Mundo Natural",
      "val": 30,
      "en": "Natural World"
    },
    {
      "id": "occult",
      "nombre": "Ocultismo",
      "val": 67,
      "en": "Occult"
    },
    {
      "id": "psychology",
      "nombre": "Psicología",
      "val": 40,
      "en": "Psychology"
    },
    {
      "id": "spot_hidden",
      "nombre": "Descubrir",
      "val": 57,
      "en": "Spot Hidden"
    },
    {
      "id": "stealth",
      "nombre": "Sigilo",
      "val": 20,
      "en": "Stealth"
    },
    {
      "id": "survival",
      "nombre": "Supervivencia",
      "val": 16,
      "en": "Survival"
    }
  ],
  "armas": [
    {
      "nombre": "Pistola .38",
      "habilidad": "firearms_handgun",
      "dano": "1d10",
      "alcance": "15 yardas",
      "ataques": "1",
      "bono": "",
      "empala": true,
      "notas": "8 balas (4 sal negra, 2 resonancia, 1 plata fría, 1 runas fuego)"
    },
    {
      "nombre": "Látigo (Bullwhip)",
      "habilidad": "",
      "objetivo": 87,
      "habilidadTexto": "Lucha (Pelea) 87%",
      "dano": "1d3",
      "alcance": "15 pies",
      "ataques": "1",
      "bono": "medio",
      "empala": false,
      "notas": "1 ataque; medio bono de daño"
    },
    {
      "nombre": "Pelea (Sin armas)",
      "habilidad": "fighting_brawl",
      "dano": "1d3",
      "alcance": "Cuerpo a Cuerpo",
      "ataques": "1",
      "bono": "completo",
      "empala": false,
      "notas": "Ataque desarmado estándar"
    }
  ],
  "capacidades": [
    {
      "id": "cap_curious_restless_eye",
      "nombre": "Curious — Restless Eye",
      "tipo": "don",
      "meta": "Pasiva mundana / 1 por sesión",
      "texto": "Nevada siempre ha sentido una necesidad casi compulsiva de comprender aquello que despierta su interés.\n\n• Curious: Cuando una situación despierta genuinamente su curiosidad, obtiene +10% a una tirada apropiada de investigación, percepción o conocimiento (Arqueología, Historia, Ocultismo, Mitos de Cthulhu, Uso de Biblioteca, Ciencia, Descubrir, u otra apropiada). Solo aplica cuando Nevada está genuinamente interesado en descubrir algo, no por conveniencia.\n\n• Restless Eye (1 vez por sesión): Tras fallar una tirada de investigación o conocimiento, puede realizar una Tirada Difícil de INT. Con éxito, recuerda, conecta o deduce una pista indirecta relacionada con lo investigado. No obtiene automáticamente la respuesta."
    },
    {
      "id": "cap_combustion",
      "nombre": "Combustión",
      "tipo": "hechizo",
      "meta": "Coste: 2 PM por objetivo",
      "texto": "Una de las primeras técnicas sobrenaturales aprendidas por Nevada y una de las que domina con mayor precisión.\n\n• Combustión concentrada: Coste 2 PM, Objetivo 1, Daño 1D6 fuego. Provoca una ignición directamente sobre un objetivo.\n\n• Combustión múltiple: Coste 2 PM por objetivo, Daño 1D4+1 fuego por objetivo. Divide la energía de la técnica para múltiples puntos de ignición simultáneos.\n\n• Fuego real: Las llamas son reales: pueden prender ropa, incendiar madera, encender combustibles y propagarse normalmente. Prende materiales ligeramente mejor que una llama convencional.",
      "coste": {
        "pm": 2,
        "dadoEfecto": "1d6"
      },
      "nota": "Concentrada: 2 PM, 1d6 fuego a 1 objetivo. Múltiple: 2 PM por objetivo, 1d4+1 fuego c/u — ajusta el costo, el dado de efecto y «objetivos adicionales» según la variante."
    },
    {
      "id": "cap_fuego_alquimico",
      "nombre": "Fuego Alquímico",
      "tipo": "hechizo",
      "meta": "Preparación: 1 HP",
      "texto": "Nevada descubrió que toda combustión necesita solo tres elementos —combustible, comburente, calor— y comprendió que puede proporcionar los tres: su propia sangre como combustible, el oxígeno ambiental como comburente y su magia como calor. Preparación: se realiza voluntariamente un corte (coste 1 HP). Puede usar libremente su sangre como combustible hasta que termine la sesión, transcurra un día de juego o la herida sea curada; si la herida desaparece, debe volver a cortarse para continuar usándola.",
      "coste": {
        "hp": 1
      },
      "nota": "Preparación: corte voluntario, 1 HP. La sangre queda utilizable hasta fin de sesión, un día de juego, o que la herida sane."
    },
    {
      "id": "cap_tatuador_de_runas",
      "nombre": "Tatuador de Runas",
      "tipo": "don",
      "meta": "Repertorio conocido",
      "texto": "Nevada conoce un repertorio concreto de runas sobrenaturales: algunas requieren días de preparación, otras pueden trazarse rápidamente durante combate. Puede investigar y aprender runas adicionales en el futuro, pero actualmente solo dispone de las que conoce."
    },
    {
      "id": "cap_rune_of_the_accusing_eye",
      "nombre": "Rune of the Accusing Eye",
      "tipo": "hechizo",
      "meta": "Reacción / Coste: 1D4 PM + 3 SAN",
      "texto": "Cuando Nevada es atacado por un hechizo o efecto sobrenatural, puede dibujar rápidamente el símbolo de la runa en el aire, devolviendo parte de la energía hacia quien intentó afectarlo. El atacante realiza una tirada de POW: con fallo pierde 1D8 PM; con éxito resiste el retorno; con Éxito Difícil o mejor, rompe la runa y Nevada pierde 1D8 PM.\nLa runa desaparece después de activarse, pero Nevada puede volver a trazarla cuando sea necesario.",
      "coste": {
        "pmDado": "1d4",
        "san": 3
      },
      "nota": "Reacción ante un ataque sobrenatural. El atacante tira POW aparte (no se registra aquí)."
    },
    {
      "id": "cap_runa_de_la_segunda_mirada",
      "nombre": "Runa de la Segunda Mirada",
      "tipo": "objeto",
      "meta": "Runa preparada / Pecho / 2 usos",
      "texto": "Una compleja runa tatuada sobre el pecho de Nevada altera brevemente aquello que acaba de ocurrir. Después de cualquier tirada, puede gastar un uso para repetir la tirada y conservar el mejor de ambos resultados. Posee 2 usos; después del segundo, desaparece.\nReaplicación: recrear el tatuaje requiere aproximadamente 5 días de preparación. Solo beneficia a la persona sobre cuya piel está tatuada."
    },
    {
      "id": "cap_eye_of_the_still_portal",
      "nombre": "Eye of the Still Portal",
      "tipo": "objeto",
      "meta": "Amuleto / Bendición de Yog-Sothoth",
      "texto": "El amuleto no entrega respuestas. Le indica a Nevada dónde debería mirar.\n\n• Reacción espontánea (sin coste): Ante algo especialmente relevante, el amuleto puede reaccionar por sí solo: una sensación difícil de explicar, un impulso de mirar hacia determinado lugar, una percepción agudizada o la impresión de que cierto detalle merece atención. No explica por qué es importante.\n\n• Activación consciente (Coste: 4 PM, usos ilimitados): Nevada se concentra voluntariamente en el amuleto para percibir detalles ocultos, reconocer ilusiones, advertir alteraciones perceptivas, percibir si alguien miente o identificar sobre qué debería concentrar su investigación. Sigue sin dar la respuesta: muestra dónde buscarla.",
      "coste": {
        "pm": 4
      },
      "nota": "Activación consciente (usos ilimitados). La reacción espontánea no tiene coste."
    },
    {
      "id": "cap_puertas_de_yog_sothoth",
      "nombre": "Puertas de Yog-Sothoth",
      "tipo": "hechizo",
      "meta": "Coste: 2 PM cada 5m | Concentración | 1 conexión",
      "texto": "Nevada comprende que dos puntos separados del espacio pueden estar mucho más cerca de lo que aparentan. Crea una entrada y una salida conectadas entre sí.\n\n• Uso convencional: Abrir una Puerta en configuración razonable no requiere tirada; puede hacerlo corriendo, cayendo, combatiendo, conduciendo o en movimiento. Bajo presión extrema puede requerirse una tirada.\n\n• Conservación del impulso: Todo lo que atraviesa una Puerta mantiene su velocidad e impulso (criaturas, proyectiles, objetos, vehículos). Una caída puede redirigirse, un disparo puede cambiar de dirección, una carga puede terminar en otro lugar.\n\n• Una puerta abierta: Las Puertas no distinguen aliados de enemigos; mientras permanezcan abiertas cualquiera puede utilizarlas. Nevada puede cerrarlas voluntariamente.\n\n• Cierre: No puede usarse para cortar a alguien por la mitad. Si se cierra mientras algo la atraviesa, es expulsado por el extremo más cercano.\n\n• Geometría poco convencional: Configuraciones extrañas (suelo hacia techo, ángulos extremos, bucles, acumulación de velocidad) pueden requerir una tirada de POW, frecuentemente Difícil según su complejidad. Son posibles; no necesariamente fáciles.\n\n• Eye of the Still Portal + Puertas: Si el amuleto revela un espacio válido al otro lado de una barrera, Nevada puede colocar allí una salida sin visión directa, pagando el coste de ambas habilidades.\n\n• Ataques a través de Puertas: Aplica -20% a la tirada de ataque (-10% si apunta y prepara el ángulo). Si el enemigo no sabe que Nevada puede atacar mediante portales, no puede Esquivar el primer ataque desde ese ángulo imposible.",
      "coste": {
        "pm": 2
      },
      "nota": "2 PM cada 5 minutos de mantenimiento — usa «Usar» una vez por cada tramo de 5 min que la Puerta siga abierta."
    },
    {
      "id": "cap_el_ojo",
      "nombre": "El Ojo",
      "tipo": "hechizo",
      "meta": "Coste: 1D6 SAN + 6 PM | ~1 minuto",
      "texto": "Nevada ya no necesita un espejo ennegrecido: los cánticos son suficientes. El Ojo permite contemplar la realidad de las cosas, no necesariamente aquello que aparentan ser: seres invisibles, ilusiones, estados etéreos, realidades superpuestas, disfraces sobrenaturales, alteraciones mágicas o aspectos ocultos de anomalías. El Ojo muestra; Nevada debe interpretar. Ver algo no garantiza comprenderlo.\nMirar demasiado: cada activación tiene 10% de probabilidad de mostrar algo que Nevada no pretendía observar, con pérdida adicional de SAN y una consecuencia narrativa relacionada.",
      "coste": {
        "pm": 6,
        "sanDado": "1d6"
      },
      "nota": "~1 minuto de uso. 10% de probabilidad narrativa de ver algo no deseado (a criterio del Guardián)."
    },
    {
      "id": "cap_craneo_del_primer_sacrificado",
      "nombre": "Cráneo del Primer Sacrificado",
      "tipo": "objeto",
      "meta": "Fragmento del Grial Oscuro / Sintonía profunda",
      "texto": "El Cráneo se encuentra completamente vinculado a Nevada. Su presencia ya no se siente enteramente física; parece estar siempre disponible cuando la necesita.\n\n• Eco del No-Ser (Pasiva permanente): +10% Ocultismo, +10% Mitos de Cthulhu, +10 POW (ya reflejado en sus estadísticas actuales). Precio: al comienzo de cada sesión pierde automáticamente 1D6 SAN, sin poder resistirse.\n\n• Consulta Irrestricta: Nevada puede preguntarle al Cráneo cuanto quiera. Nunca miente, pero puede responder con metáforas, de forma incompleta, críptica, sarcástica, burlona, o simplemente guardar silencio. Habla directamente dentro de su mente y también puede mostrarle imágenes.\n\n• Atisbo del Vacío (Coste: 1D4 SAN + 3 PM, 1 vez por escena): escoge un efecto — Claridad Antinatural (repite una tirada de percepción, investigación, Ocultismo o comprensión sobrenatural), Lectura de Fisuras (percibe rastros de portales, fisuras, Puertas o tránsito dimensional) o Sincronía Breve (+20% a una tirada de POW o acción mental). Una pifia permite que algo del Vacío afecte momentáneamente su mente.",
      "coste": {
        "pm": 3,
        "sanDado": "1d4"
      },
      "nota": "«Usar» = Atisbo del Vacío (1 vez por escena). El Eco del No-Ser (inicio de sesión) tiene su propia capacidad."
    },
    {
      "id": "cap_eco_del_no_ser",
      "nombre": "Eco del No-Ser",
      "tipo": "don",
      "meta": "Inicio de cada sesión (Cráneo del Primer Sacrificado)",
      "texto": "Al comenzar cada sesión pierdes 1D6 de Cordura por el Eco del No-Ser.",
      "coste": {
        "sanDado": "1d6"
      }
    },
    {
      "id": "cap_ojo_del_vacio_ascendente",
      "nombre": "Ojo del Vacío Ascendente",
      "tipo": "don",
      "meta": "Coste: 1D10 PM + 2 SAN | Contacto visual",
      "texto": "Nevada establece contacto visual con otra criatura y obliga a su mente a contemplar una fracción del Vacío Absoluto. Contienda: POW de Nevada vs SAN del objetivo (o POW si no posee SAN). Puede afectar a cualquier criatura cuya mente sea capaz de sufrir ante la revelación del Vacío.\n\n• Éxito Normal: el objetivo pierde 1D6 SAN y queda aturdido 1 asalto; si resiste, pierde 1D4 SAN y evita el aturdimiento.\n\n• Éxito Difícil: pierde 1D8 SAN y queda fuertemente desorientado (penalizadores apropiados); si resiste, pierde 1D6 SAN.\n\n• Éxito Extremo: pierde 1D10 SAN y corre riesgo inmediato de fobia, obsesión o alteración mental; si resiste, pierde 1D8 SAN.\n\n• Fallo o pifia: \"Si miras al Vacío, el Vacío te mira de vuelta.\" Puede provocar pérdida de SAN, visiones no deseadas o llamar la atención de algo que observaba desde el otro lado.",
      "coste": {
        "pmDado": "1d10",
        "san": 2
      },
      "nota": "Este es solo el costo propio de Nevada. La pérdida de SAN del objetivo (Contienda POW vs SAN) se resuelve aparte."
    },
    {
      "id": "cap_ojo_del_todo_y_la_nada",
      "nombre": "Ojo del Todo y la Nada",
      "tipo": "don",
      "meta": "Coste: 1D12 PM + 1D12 SAN",
      "texto": "Técnica máxima actual (origen Yog-Sothoth / Xylt'hora). Nevada combina dos conceptos incompatibles: Yog-Sothoth le permite comprender cómo un ser percibe la realidad, y Xylt'hora le permite eliminar temporalmente una parte de esa percepción. No destruye físicamente un sentido: durante unos instantes, simplemente deja de existir para la víctima. No necesita contacto visual, solo poder percibir claramente al objetivo.\n\n• Canales afectados: Éxito Normal = 1 canal (1D4 turnos); Éxito Difícil = 2 canales (1D4+1 turnos); Éxito Extremo = 3 canales (1D4+2 turnos). Los canales se determinan al azar y nunca se repite el mismo durante una activación. Si el objetivo supera su tirada de SAN, reduce en 1 la cantidad de canales afectados (mínimo 1).\n\n• 1 — Vista: queda completamente ciego; las acciones que dependan de visión reciben penalizaciones severas o resultan imposibles.\n\n• 2 — Oído: queda completamente sordo; no reacciona a órdenes, advertencias o información que dependan exclusivamente del sonido.\n\n• 3 — Tacto: deja de recibir información táctil de su cuerpo. -20% a manipulación fina y acciones que dependan directamente del tacto.\n\n• 4 — Equilibrio: el cerebro deja de comprender su orientación. MOV reducido a la mitad, dado de penalización a Esquivar y a movimientos físicos complejos.\n\n• 5 — Dolor: deja de percibir dolor; no sabe cuánto daño ha recibido ni puede reaccionar apropiadamente ante sus propias heridas hasta que termina el efecto.\n\n• 6 — Propiocepción: deja de saber dónde están las distintas partes de su cuerpo. Dado de penalización a acciones físicas; los movimientos complejos requieren superar una tirada de DEX para no perder el equilibrio o caer.\n\n• Uso Masivo: extiende la técnica a múltiples objetivos. Cada objetivo adicional después del primero aumenta el coste total en +5 PM y +5 SAN (1 objetivo: 1D12 PM + 1D12 SAN; 2 objetivos: 1D12+5 / 1D12+5; 3 objetivos: 1D12+10 / 1D12+10; y así sucesivamente).",
      "coste": {
        "pmDado": "1d12",
        "sanDado": "1d12",
        "pmObj": 5,
        "sanObj": 5
      },
      "nota": "Uso Masivo: +5 PM y +5 SAN por cada objetivo adicional — cárgalo en «Objetivos adicionales»."
    },
    {
      "id": "cap_are_you_feeling_lucky",
      "nombre": "Are You Feeling Lucky?",
      "tipo": "don",
      "meta": "Sin coste | 1 por escena | Tirada: Suerte",
      "texto": "Nevada ha descubierto recientemente que puede producir una clase de flash metafísico. No sabe realmente cómo funciona; solo ha comprendido una cosa: John puede verlo. El flash existe únicamente durante un instante y luego desaparece.\n01 natural: John en su mejor versión. Éxito: John logra seguir la señal y aparece para ayudar dentro de sus capacidades normales (no garantiza ganar el combate, resolver el problema ni escapar). Fallo: John no llega. 100 natural: John en un mal día."
    }
  ],
  "equipamiento": "Equipo de viaje en bandolera/bolso, pistola .38, 4 balas de sal negra, 2 balas de resonancia, 1 bala de plata fría, 1 bala con runas de fuego mal escritas por Johnny \"Lucky Shot\" O'Reilly, vial vacío (para fuego alquímico), lápices y bloc de notas, peine para el pelo, medalla de San Cristóbal, Fetiche, anillo con brújula.",
  "finanzas": "Efectivo: $80 USD\nNivel de Gasto: $10 USD\nBienes/Activos: $2,000 USD",
  "trasfondo": {
    "ideologia": "Profundo amor por la historia y las culturas antiguas. Ansía hacerse un nombre propio descubriendo tesoros perdidos.",
    "personas": "Su padre, Frank Jones, cuyos famosos descubrimientos lo hacen sentir eclipsado constante y profesionalmente. Posee además contactos pendientes que debe retomar con Kormac.",
    "lugar": "Un bar donde sirvan tragos fuertes y donde pueda ahogar sus penas y olvidar sus problemas.",
    "pertenencia": "Su medalla de San Cristóbal, la cual considera su amuleto personal de buena suerte.",
    "rasgos": "Imprudente. Tiende a saltar de cabeza a las situaciones antes de detenerse a pensar en las consecuencias."
  },
  "descanso": {
    "pv": "max",
    "pm": "max",
    "san": "max"
  },
  "legado": {
    "habilidades": true,
    "armas": true
  }
};
PERSONAJES_COC.nevada_jones.notas = 'Análisis del personaje y recomendación narrativa del Guardián.';
PERSONAJES_COC.nevada_jones.notasHtml = "<p><strong>Análisis del Personaje:</strong> Nevada empezó como un arqueólogo aventurero en crisis de mediana edad, pero actualmente se encuentra profundamente conectado con Yog-Sothoth, Xylt’hora, el Cráneo del Primer Sacrificado y la erosión constante de su humanidad.</p>\n <p><strong>Recomendación Narrativa:</strong> Encaja perfectamente con la campaña del Grial Oscuro. Funciona mejor cuando el horror cósmico y la tentación del poder divino se mezclan con su ancla terrenal: la nostalgia, el miedo a ser irrelevante, la vergüenza académica y el cansancio físico.</p>";

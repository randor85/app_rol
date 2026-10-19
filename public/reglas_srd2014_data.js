/*
 * reglas_srd2014_data.js — reglas de referencia y automatizables del SRD 5.1 (D&D 5e, edición 2014).
 *
 * Compendio de SOLO LECTURA, igual que spells_data.js y classes_data.js (se carga con <script src>).
 * No es el libro completo: tiene lo que la ficha usa para consultar o automatizar (condiciones, agotamiento,
 * movimiento, cobertura, visibilidad, acciones de combate, descansos y reglas de lanzamiento). Los textos son
 * paráfrasis propias en español; los números y las reglas son las del SRD.
 *
 * Cada condición trae `efectos` legibles por máquina. Claves (todas opcionales):
 *   ataque        'ventaja' | 'desventaja'   → sobre las tiradas de ataque PROPIAS
 *   pruebas       'ventaja' | 'desventaja'   → sobre las pruebas de característica propias
 *   salvaciones   'desventaja'               → sobre todas las salvaciones propias
 *   salvacionesPor { DES: 'desventaja', … }  → sobre una salvación concreta
 *   autoFalla     ['FUE','DES']              → salvaciones que se fallan automáticamente
 *   atacantes     { cuerpo, distancia }      → trato de quien ATACA a este personaje (informativo)
 *   velocidad     0 | factor (0.5)           → velocidad (0 = no se mueve)
 *   hpMaxFactor   0.5                        → mitad de los puntos de golpe máximos
 *   incapacitado  true                       → sin acciones ni reacciones
 *   muerte        true                       → el personaje muere (agotamiento 6)
 * Las claves `ataque`, `pruebas`, `salvaciones*`, `velocidad`, `hpMaxFactor` y `incapacitado` son las que
 * ficha-reglas.js aplica solo; el resto se muestra como texto.
 *
 * Atribución (CC-BY-4.0): This work includes material taken from the System Reference Document 5.1
 * ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document.
 * The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at
 * https://creativecommons.org/licenses/legalcode.
 */
const REGLAS_SRD2014 = {
  edicion: 'SRD 5.1 (2014)',
  atribucion: 'Incluye material del System Reference Document 5.1 de Wizards of the Coast LLC (https://dnd.wizards.com/resources/systems-reference-document), bajo licencia Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/legalcode). Textos parafraseados al español.',

  condiciones: [
    { id: 'blinded', nombre: 'Cegado', en: 'Blinded', icono: '👁️',
      resumen: 'No ve. Falla automáticamente las pruebas que requieran vista. Sus ataques tienen desventaja y los ataques contra él tienen ventaja.',
      efectos: { ataque: 'desventaja', atacantes: { cuerpo: 'ventaja', distancia: 'ventaja' } } },
    { id: 'charmed', nombre: 'Hechizado', en: 'Charmed', icono: '💞',
      resumen: 'No puede atacar a quien lo hechizó ni tomarlo como objetivo de efectos dañinos. Quien lo hechizó tiene ventaja en las pruebas sociales contra él.',
      efectos: {} },
    { id: 'deafened', nombre: 'Ensordecido', en: 'Deafened', icono: '🔇',
      resumen: 'No oye. Falla automáticamente las pruebas que requieran oído.',
      efectos: {} },
    { id: 'frightened', nombre: 'Asustado', en: 'Frightened', icono: '😱',
      resumen: 'Mientras la fuente de su miedo esté a la vista, tiene desventaja en pruebas de característica y ataques, y no puede acercarse voluntariamente a ella.',
      efectos: { ataque: 'desventaja', pruebas: 'desventaja' } },
    { id: 'grappled', nombre: 'Agarrado', en: 'Grappled', icono: '🤼',
      resumen: 'Su velocidad es 0 y no puede beneficiarse de ningún bono a la velocidad. Termina si quien lo agarra queda incapacitado o si un efecto lo aleja del agarre.',
      efectos: { velocidad: 0 } },
    { id: 'incapacitated', nombre: 'Incapacitado', en: 'Incapacitated', icono: '🚫',
      resumen: 'No puede realizar acciones ni reacciones.',
      efectos: { incapacitado: true } },
    { id: 'invisible', nombre: 'Invisible', en: 'Invisible', icono: '🫥',
      resumen: 'No se lo puede ver sin magia ni sentidos especiales (cuenta como muy oscurecido). Sus ataques tienen ventaja y los ataques contra él tienen desventaja.',
      efectos: { ataque: 'ventaja', atacantes: { cuerpo: 'desventaja', distancia: 'desventaja' } } },
    { id: 'paralyzed', nombre: 'Paralizado', en: 'Paralyzed', icono: '⚡',
      resumen: 'Incapacitado, no puede moverse ni hablar. Falla automáticamente las salvaciones de FUE y DES. Los ataques contra él tienen ventaja y son críticos si el atacante está a 1,5 m (5 ft).',
      efectos: { incapacitado: true, velocidad: 0, autoFalla: ['FUE', 'DES'], atacantes: { cuerpo: 'ventaja y crítico', distancia: 'ventaja' } } },
    { id: 'petrified', nombre: 'Petrificado', en: 'Petrified', icono: '🗿',
      resumen: 'Convertido en una sustancia inanimada y sólida: incapacitado, no se mueve ni habla, no percibe su entorno. Pesa diez veces más y no envejece. Resiste todo el daño, es inmune al veneno y las enfermedades y falla las salvaciones de FUE y DES. Los ataques contra él tienen ventaja.',
      efectos: { incapacitado: true, velocidad: 0, autoFalla: ['FUE', 'DES'], atacantes: { cuerpo: 'ventaja', distancia: 'ventaja' } } },
    { id: 'poisoned', nombre: 'Envenenado', en: 'Poisoned', icono: '☣️',
      resumen: 'Tiene desventaja en las tiradas de ataque y en las pruebas de característica.',
      efectos: { ataque: 'desventaja', pruebas: 'desventaja' } },
    { id: 'prone', nombre: 'Derribado', en: 'Prone', icono: '🛌',
      resumen: 'Solo puede arrastrarse, salvo que se levante (gasta la mitad de su movimiento). Sus ataques tienen desventaja. Los ataques contra él tienen ventaja si el atacante está a 1,5 m (5 ft), y desventaja si está más lejos.',
      efectos: { ataque: 'desventaja', atacantes: { cuerpo: 'ventaja', distancia: 'desventaja' } } },
    { id: 'restrained', nombre: 'Apresado', en: 'Restrained', icono: '⛓️',
      resumen: 'Su velocidad es 0. Los ataques contra él tienen ventaja y sus ataques tienen desventaja. Tiene desventaja en las salvaciones de DES.',
      efectos: { velocidad: 0, ataque: 'desventaja', salvacionesPor: { DES: 'desventaja' }, atacantes: { cuerpo: 'ventaja', distancia: 'ventaja' } } },
    { id: 'stunned', nombre: 'Aturdido', en: 'Stunned', icono: '💫',
      resumen: 'Incapacitado, no puede moverse y solo habla con titubeos. Falla automáticamente las salvaciones de FUE y DES. Los ataques contra él tienen ventaja.',
      efectos: { incapacitado: true, velocidad: 0, autoFalla: ['FUE', 'DES'], atacantes: { cuerpo: 'ventaja', distancia: 'ventaja' } } },
    { id: 'unconscious', nombre: 'Inconsciente', en: 'Unconscious', icono: '😴',
      resumen: 'Incapacitado, no puede moverse ni hablar, no percibe su entorno, suelta lo que sostiene y cae derribado. Falla automáticamente las salvaciones de FUE y DES. Los ataques contra él tienen ventaja y son críticos si el atacante está a 1,5 m (5 ft).',
      efectos: { incapacitado: true, velocidad: 0, autoFalla: ['FUE', 'DES'], atacantes: { cuerpo: 'ventaja y crítico', distancia: 'ventaja' } } },
  ],

  // Los niveles de agotamiento se acumulan: en el nivel 3 rigen también los efectos de los niveles 1 y 2.
  // Un descanso largo quita 1 nivel (si además se comió y bebió); en el nivel 6 el personaje muere.
  agotamiento: [
    { nivel: 1, texto: 'Desventaja en las pruebas de característica.', efectos: { pruebas: 'desventaja' } },
    { nivel: 2, texto: 'Velocidad reducida a la mitad.', efectos: { velocidad: 0.5 } },
    { nivel: 3, texto: 'Desventaja en las tiradas de ataque y en las salvaciones.', efectos: { ataque: 'desventaja', salvaciones: 'desventaja' } },
    { nivel: 4, texto: 'Puntos de golpe máximos reducidos a la mitad.', efectos: { hpMaxFactor: 0.5 } },
    { nivel: 5, texto: 'Velocidad reducida a 0.', efectos: { velocidad: 0 } },
    { nivel: 6, texto: 'Muerte.', efectos: { muerte: true } },
  ],

  movimiento: [
    { titulo: 'Velocidad y turno', texto: 'En su turno, un personaje puede moverse hasta su velocidad. Puede repartir el movimiento antes, durante y después de sus acciones.' },
    { titulo: 'Terreno difícil', texto: 'Cada pie que se avanza por terreno difícil cuesta 1 pie extra (el movimiento se paga doble).' },
    { titulo: 'Levantarse', texto: 'Levantarse de estar derribado cuesta la mitad de la velocidad del personaje. Si su velocidad es 0, no puede levantarse.' },
    { titulo: 'Arrastrarse', texto: 'Cada pie que se avanza arrastrándose, trepando o nadando (sin velocidad específica) cuesta 1 pie extra; en terreno difícil, 2 extra.' },
    { titulo: 'Salto largo', texto: 'Con carrera previa de al menos 10 pies, salta tantos pies como su puntuación de FUE. Sin carrera, la mitad.' },
    { titulo: 'Salto en alto', texto: 'Con carrera previa de 10 pies, salta 3 + su modificador de FUE en pies (mínimo 0). Sin carrera, la mitad. Puede extender los brazos hasta 1,5 veces su altura.' },
    { titulo: 'Moverse por criaturas', texto: 'Puede atravesar el espacio de una criatura aliada. El de una hostil solo si es al menos dos categorías de tamaño mayor o menor. No puede terminar el movimiento en un espacio ocupado.' },
    { titulo: 'Ataque de oportunidad', texto: 'Cuando una criatura hostil que se ve sale del alcance de un personaje, este puede usar su reacción para hacer un ataque cuerpo a cuerpo contra ella. Desengancharse (Disengage) evita provocarlo.' },
  ],

  cobertura: [
    { titulo: 'Media cobertura', texto: '+2 a la CA y a las salvaciones de DES contra el origen del efecto (un mueble bajo, una criatura de por medio).' },
    { titulo: 'Tres cuartos de cobertura', texto: '+5 a la CA y a las salvaciones de DES (una aspillera, un tronco grueso).' },
    { titulo: 'Cobertura total', texto: 'No se lo puede tomar como objetivo directo de un ataque ni de un conjuro, aunque algunos efectos de área igual lo alcanzan.' },
  ],

  visibilidad: [
    { titulo: 'Ligeramente oscurecido', texto: 'Penumbra, niebla fina o follaje ralo: desventaja en las pruebas de Sabiduría (Percepción) que dependan de la vista.' },
    { titulo: 'Muy oscurecido', texto: 'Oscuridad total, niebla densa o follaje denso: la criatura queda cegada respecto de lo que no ve.' },
    { titulo: 'Visión en la oscuridad', texto: 'Quien la tiene ve la penumbra como luz brillante y la oscuridad como penumbra, solo en escala de grises, hasta el alcance indicado.' },
  ],

  acciones: [
    { id: 'attack', titulo: 'Atacar', texto: 'Hace un ataque cuerpo a cuerpo o a distancia (o varios, si tiene Ataque Extra).' },
    { id: 'cast', titulo: 'Lanzar un conjuro', texto: 'Lanza un conjuro cuyo tiempo de lanzamiento sea 1 acción.' },
    { id: 'dash', titulo: 'Correr (Dash)', texto: 'Gana movimiento extra igual a su velocidad por este turno.' },
    { id: 'disengage', titulo: 'Desengancharse (Disengage)', texto: 'Su movimiento no provoca ataques de oportunidad durante el resto del turno.' },
    { id: 'dodge', titulo: 'Esquivar (Dodge)', texto: 'Hasta el inicio de su siguiente turno, los ataques contra él tienen desventaja si ve al atacante, y tiene ventaja en las salvaciones de DES. Se pierde si queda incapacitado o su velocidad es 0.' },
    { id: 'help', titulo: 'Ayudar (Help)', texto: 'Da ventaja a un aliado en su siguiente prueba con una tarea, o en su siguiente ataque contra una criatura a 1,5 m (5 ft) de quien ayuda.' },
    { id: 'hide', titulo: 'Esconderse (Hide)', texto: 'Prueba de Destreza (Sigilo) para ocultarse.' },
    { id: 'ready', titulo: 'Preparar (Ready)', texto: 'Elige un desencadenante y una acción; la ejecuta como reacción cuando ocurre. Preparar un conjuro exige concentración hasta que se lance.' },
    { id: 'search', titulo: 'Buscar (Search)', texto: 'Dedica su atención a encontrar algo: prueba de Sabiduría (Percepción) o Inteligencia (Investigación).' },
    { id: 'use', titulo: 'Usar un objeto', texto: 'Interactúa con un segundo objeto en el turno o usa uno que lo exija como acción.' },
    { id: 'bonus', titulo: 'Acción adicional', texto: 'Solo se puede usar si una característica, conjuro o rasgo la concede. Una por turno.' },
    { id: 'reaction', titulo: 'Reacción', texto: 'Una por ronda, se recupera al inicio de su turno. Responde a un desencadenante, como un ataque de oportunidad.' },
  ],

  descansos: [
    { id: 'corto', titulo: 'Descanso corto', texto: 'Al menos 1 hora de actividad ligera. Se pueden gastar Dados de Golpe: cada uno tira su dado + modificador de CON y recupera esa cantidad de PG. Muchos rasgos de clase se recuperan.' },
    { id: 'largo', titulo: 'Descanso largo', texto: 'Al menos 8 horas (máximo 6 en vela, el resto durmiendo). Recupera todos los PG, la mitad de sus Dados de Golpe máximos (mínimo 1) y quita 1 nivel de agotamiento. Solo uno cada 24 horas, y hay que tener al menos 1 PG.' },
    { id: 'interrupcion', titulo: 'Interrupción', texto: 'Si un descanso largo se interrumpe con 1 hora o más de actividad intensa, hay que empezarlo de nuevo.' },
  ],

  lanzamiento: [
    { titulo: 'Espacios de conjuro', texto: 'Lanzar un conjuro de nivel 1 o más gasta un espacio del nivel del conjuro o superior. Los trucos (nivel 0) no gastan espacio.' },
    { titulo: 'Concentración', texto: 'Solo se puede concentrar en un conjuro a la vez; lanzar otro de concentración corta el anterior. Se rompe al quedar incapacitado o morir. Al recibir daño: salvación de CON con CD 10 o la mitad del daño recibido (lo que sea mayor).' },
    { titulo: 'Componentes', texto: 'Verbal (hablar), somático (gestos, requiere una mano libre) y material (se puede sustituir por una bolsa de componentes o un foco, salvo que se indique un costo).' },
    { titulo: 'Rituales', texto: 'Un conjuro con la etiqueta ritual puede lanzarse sin gastar espacio si se tarda 10 minutos más, pero solo si la clase tiene la capacidad de lanzar rituales.' },
    { titulo: 'Acción adicional y conjuros', texto: 'Si en un turno se lanza un conjuro como acción adicional, el único otro conjuro de ese turno puede ser un truco con tiempo de lanzamiento de 1 acción.' },
    { titulo: 'Ataque de conjuro', texto: 'Se tira d20 + modificador de la característica de lanzamiento + bono de competencia contra la CA del objetivo.' },
    { titulo: 'CD de salvación', texto: '8 + modificador de la característica de lanzamiento + bono de competencia.' },
  ],

  combate: [
    { titulo: 'Iniciativa', texto: 'Prueba de DES al comenzar el combate; actúa en orden de mayor a menor resultado.' },
    { titulo: 'Sorpresa', texto: 'Quien no detecta la amenaza está sorprendido: no se mueve ni actúa en su primer turno y no puede usar reacciones hasta que termina.' },
    { titulo: 'Ataque crítico', texto: 'Un 20 natural siempre impacta y es crítico: se tiran el doble de dados de daño del ataque.' },
    { titulo: 'Daño a 0 PG', texto: 'Al llegar a 0 PG se queda inconsciente y empieza a hacer salvaciones de muerte. El daño masivo mata al instante si el sobrante iguala o supera el máximo de PG.' },
    { titulo: 'Salvaciones de muerte', texto: 'Al inicio de su turno tira d20 sin modificadores: 10 o más es un éxito; 9 o menos, un fallo. Un 1 cuenta como dos fallos; un 20 lo recupera con 1 PG. Tres éxitos lo estabilizan; tres fallos, muere.' },
    { titulo: 'Combate con dos armas', texto: 'Con dos armas ligeras, al atacar con una puede atacar con la otra como acción adicional, sin sumar el modificador de característica al daño (salvo que sea negativo).' },
  ],
};

if (typeof window !== 'undefined') window.REGLAS_SRD2014 = REGLAS_SRD2014;

// Base de datos de clases D&D 5e — Player's Handbook 2024 ("5.5e").
// Alcance: las 9 clases que usa el grupo (Monje, Clérigo, Druida, Paladín, Mago, Hechicero,
// Brujo, Explorador, Pícaro), con 2-3 subclases representativas por clase.
// Fuentes: investigación vía WebSearch (WebFetch a sitios de reglas está bloqueado en este
// entorno) contra dndbeyond.com/posts (comparativas oficiales "2024 X vs 2014 X"), wargamer.com,
// thegamer.com, rpgbot.net y dungeonmister.com — consultadas 30 ago 2026. Reutiliza las tablas
// de espacios de conjuro ya existentes en spells_data.js (SLOTS_FULL_CASTER/SLOTS_HALF_CASTER/
// SLOTS_PACT_CASTER), cargado antes que este archivo en classes.html.
//
// IMPORTANTE — TODAS las clases eligen subclase en Nivel 3 en el PHB 2024 (verificado: la idea
// original de que Clérigo/Hechicero/Brujo elegían en nivel 1 era de un paquete de playtest
// anterior, no del libro publicado — esas 3 clases en cambio ganaron un rasgo nuevo de nivel 1
// como compensación: Divine Order, Innate Sorcery, e Invocaciones-desde-nivel-1 respectivamente).
//
// Donde una fecha/nivel/nombre exacto no se pudo confirmar contra una fuente pública, se marca
// con incierto:true (se muestra con ⚠️ en la página) — no se inventó mecánica sin avisar.
const CLASSES = [

// ============================================================
// MONJE (Monk)
// ============================================================
{
  id: "monk", name: "Monk", nombre_es: "Monje",
  hitDie: 8, primaryAbility: "Destreza y Sabiduría", savingThrows: ["Fuerza", "Destreza"],
  casterType: null, subclassLevel: 3, subclassLabel: "Tradición Monástica",
  resumen: "Guerrero marcial que canaliza energía interior — Puntos de Enfoque (Focus Points), antes llamados Ki en la edición 2014 — en golpes, movimiento y defensa sobrenatural.",
  resourceName: "Puntos de Enfoque",
  resourceProgression: Object.fromEntries(Array.from({length:20}, (_,i) => [i+1, i+1])),
  features: [
    {nivel:1, nombre:"Artes Marciales (d6)", desc:"Tus golpes desarmados y armas de monje usan un dado de daño d6 (escala con el nivel); podés usar Destreza en vez de Fuerza para ataque y daño con ellos."},
    {nivel:1, nombre:"Defensa sin Armadura", desc:"CA = 10 + mod. Destreza + mod. Sabiduría, sin armadura ni escudo."},
    {nivel:1, nombre:"Enfoque (Focus)", desc:"Ganás Puntos de Enfoque (= tu nivel de monje) para potenciar Flurry of Blows (golpe desarmado extra), Patient Defense (Esquivar) y Step of the Wind (Correr/Desengancharse) — las tres disponibles desde nivel 1 como acción adicional, a diferencia de 2014 donde llegaban escalonadas."},
    {nivel:2, nombre:"Movimiento sin Armadura", desc:"Tu velocidad aumenta mientras no lleves armadura ni escudo; mejora en niveles posteriores."},
    {nivel:3, nombre:"Tradición Monástica (Subclase)", desc:"Elegís tu tradición monástica."},
    {nivel:3, nombre:"Desviar Ataques", desc:"Con reacción, reducís el daño de un ataque cuerpo a cuerpo que te impacta."},
    {nivel:4, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:4, nombre:"Caída Lenta", desc:"Con reacción, reducís el daño de una caída."},
    {nivel:5, nombre:"Ataque Extra", desc:"Atacás dos veces al usar la acción de Atacar."},
    {nivel:5, nombre:"Golpe Aturdidor (Stunning Strike)", desc:"Al golpear con un ataque de monje, podés gastar 1 Punto de Enfoque para forzar una salvación de Constitución o aturdir al objetivo."},
    {nivel:5, nombre:"Artes Marciales mejora a d8", desc:"El dado de tus golpes desarmados y armas de monje sube a d8."},
    {nivel:7, nombre:"Evasión", desc:"En salvaciones de Destreza para reducir daño a la mitad: con éxito no recibís daño, con fallo recibís la mitad."},
    {nivel:7, nombre:"Serenidad Mental (Stillness of Mind)", desc:"Como acción, terminás sobre vos mismo un efecto de Encantado o Asustado."},
    {nivel:8, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:9, nombre:"Metabolismo Incansable (Uncanny Metabolism)", desc:"Rasgo nuevo en 2024: una vez por descanso largo, al tirar iniciativa (o como acción) recuperás algunos Puntos de Enfoque y podés quitarte Encantado, Asustado o Envenenado; ignorás la Extenuación por falta de comida/agua.", incierto:true},
    {nivel:10, nombre:"Purificación del Cuerpo (mejorada)", desc:"Sos inmune a enfermedades y a la condición Envenenado.", incierto:true},
    {nivel:11, nombre:"Artes Marciales mejora a d10", desc:"El dado de tus golpes desarmados y armas de monje sube a d10."},
    {nivel:12, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:13, nombre:"Lengua del Sol y la Luna", desc:"Entendés todos los idiomas hablados, y cualquier criatura que entienda al menos un idioma te entiende a vos."},
    {nivel:14, nombre:"Alma de Diamante", desc:"Ganás competencia en todas las salvaciones; podés gastar 1 Punto de Enfoque para repetir una salvación fallida."},
    {nivel:15, nombre:"Cuerpo Atemporal", desc:"Dejás de sufrir los efectos de la vejez y no necesitás comer ni beber."},
    {nivel:16, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:17, nombre:"Artes Marciales mejora a d12", desc:"El dado de tus golpes desarmados y armas de monje sube a d12."},
    {nivel:18, nombre:"Cuerpo Vacío (resistencia)", desc:"Gastás Puntos de Enfoque para ganar resistencia a todo el daño salvo el de Fuerza durante 1 minuto.", incierto:true},
    {nivel:19, nombre:"Mejora de Puntuación de Característica / Don Épico", desc:"Última mejora de característica, o un Don Épico."},
    {nivel:20, nombre:"Ser Perfecto", desc:"Si tirás iniciativa y no tenés Puntos de Enfoque, recuperás algunos automáticamente."},
  ],
  subclasses: [
    {
      name: "Warrior of the Open Hand", resumen: "Especialista en combate desarmado que controla a sus enemigos con cada golpe (antes 'Way of the Open Hand' en 2014 — todas las tradiciones fueron renombradas de 'Way of X' a 'Warrior of X' en 2024).",
      features: [
        {nivel:3, nombre:"Open Hand Technique", desc:"Al golpear con Flurry of Blows podés añadir un efecto extra: negar reacciones hasta tu próximo turno (Addle), empujar 15 pies (Push), o forzar una salvación de Destreza o el objetivo cae Derribado (Topple)."},
        {nivel:6, nombre:"Wholeness of Body", desc:"Como acción adicional, gastás Puntos de Enfoque para recuperar HP.", incierto:true},
        {nivel:11, nombre:"Fleet Step", desc:"Al usar Flurry of Blows, podés usar Step of the Wind gratis como parte de esa misma acción adicional."},
        {nivel:17, nombre:"Quivering Palm", desc:"Al golpear con un ataque desarmado, implantás vibraciones letales; luego, como acción, podés detonarlas: el objetivo sufre 10d12 de daño de fuerza si falla una salvación de Constitución."},
      ]
    },
    {
      name: "Warrior of Shadow", resumen: "Ninja místico que usa las sombras para ocultarse y golpear por sorpresa (antes 'Way of Shadow').",
      features: [
        {nivel:3, nombre:"Shadow Arts", desc:"Gastás 1 Punto de Enfoque para lanzar Darkness, Darkvision, Pass without Trace o Silence sin componentes materiales; podés ver a través de tu propia oscuridad mágica."},
        {nivel:6, nombre:"Shadow Step", desc:"Como acción adicional, te teletransportás entre sombras hasta 60 pies y ganás ventaja en tu próximo ataque cuerpo a cuerpo ese turno.", incierto:true},
        {nivel:17, nombre:"Cloak of Shadows", desc:"Como acción, te volvés invisible hasta 1 minuto o hasta que ataques o lances un conjuro.", incierto:true},
      ]
    },
    {
      name: "Warrior of the Elements", resumen: "Canaliza los elementos a través de sus golpes y técnicas (antes 'Way of the Four Elements').",
      features: [
        {nivel:3, nombre:"Elemental Attunement", desc:"Gastás 1 Punto de Enfoque para infundir tus golpes desarmados con daño ácido, frío, fuego, rayo o trueno (a elección) y aumentar tu alcance a 10 pies, por 10 minutos."},
        {nivel:6, nombre:"Rasgo elemental adicional", desc:"Ganás una técnica elemental adicional (nivel y nombre exactos sin confirmar contra el PHB2024).", incierto:true},
        {nivel:17, nombre:"Rasgo elemental de alto nivel", desc:"Técnica elemental capstone (nombre exacto sin confirmar).", incierto:true},
      ]
    },
  ]
},

// ============================================================
// CLÉRIGO (Cleric)
// ============================================================
{
  id: "cleric", name: "Cleric", nombre_es: "Clérigo",
  hitDie: 8, primaryAbility: "Sabiduría", savingThrows: ["Sabiduría", "Carisma"],
  casterType: "full", subclassLevel: 3, subclassLabel: "Dominio Divino",
  resumen: "Lanzador divino que prepara conjuros de la lista completa de Clérigo. En 2024 elige Dominio en nivel 3 (antes nivel 1) y gana Divine Order en nivel 1 como compensación.",
  resourceName: "Usos de Channel Divinity",
  resourceProgression: {2:2, 6:3},
  features: [
    {nivel:1, nombre:"Lanzamiento de Conjuros", desc:"Preparás conjuros de Clérigo usando Sabiduría; conocés algunos trucos."},
    {nivel:1, nombre:"Divine Order", desc:"Rasgo nuevo en 2024 (compensa perder el Dominio en nivel 1): elegís Protector (competencia en armas marciales y armadura pesada) o Thaumaturge (un truco adicional y sumás mod. Sabiduría a pruebas de Inteligencia relacionadas con lo divino)."},
    {nivel:2, nombre:"Channel Divinity — Divine Spark y Turn Undead", desc:"2 usos; con Divine Spark infligís o curáis 1d8 (escala con nivel) tocando o a distancia; con Turn Undead alejás no-muertos. Se recuperan en descanso corto/largo."},
    {nivel:3, nombre:"Dominio Divino (Subclase)", desc:"Elegís vuestro Dominio Divino, que también otorga (retroactivamente) sus rasgos de nivel 1-2."},
    {nivel:4, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:5, nombre:"Sear Undead (mejora de Divine Spark)", desc:"Divine Spark inflige daño radiante adicional a no-muertos que fallan la salvación.", incierto:true},
    {nivel:6, nombre:"Channel Divinity (uso adicional)", desc:"Ganás un tercer uso de Channel Divinity."},
    {nivel:7, nombre:"Blessed Strikes", desc:"Elegís entre Divine Strike (daño radiante extra 1/turno al golpear con arma) o Potent Spellcasting (sumás mod. Sabiduría al daño de vuestros trucos) — posible renombre de 'Divine Strike' de 2014.", incierto:true},
    {nivel:7, nombre:"Divine Spark mejora a 2d8", desc:"El daño/curación de Divine Spark sube a 2d8."},
    {nivel:8, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:10, nombre:"Divine Intervention", desc:"Pedís ayuda divina; el DM determina el efecto (equivalente a un conjuro de vuestro nivel o menor)."},
    {nivel:12, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:13, nombre:"Divine Spark mejora a 3d8", desc:"El daño/curación de Divine Spark sube a 3d8."},
    {nivel:16, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:18, nombre:"Divine Spark mejora a 4d8", desc:"El daño/curación de Divine Spark sube a 4d8."},
    {nivel:19, nombre:"Mejora de Puntuación de Característica / Don Épico", desc:"Última mejora de característica, o un Don Épico."},
    {nivel:20, nombre:"Divine Intervention (mejorada)", desc:"Divine Intervention tiene éxito automático."},
  ],
  subclasses: [
    {
      name: "Life Domain", resumen: "Especialista en curación — sus conjuros restauran más HP de lo normal.",
      features: [
        {nivel:3, nombre:"Disciple of Life", desc:"Tus conjuros de curación restauran HP adicional."},
        {nivel:3, nombre:"Preserve Life", desc:"Opción de Channel Divinity: repartís HP de curación grupal entre criaturas heridas cerca tuyo."},
        {nivel:6, nombre:"Blessed Healer", desc:"Cuando curás a otros con un conjuro, también te curás a vos mismo.", incierto:true},
        {nivel:17, nombre:"Supreme Healing", desc:"Los dados de curación de tus conjuros de Clérigo cuentan como el máximo en vez de tirarse."},
      ]
    },
    {
      name: "Light Domain", resumen: "Canaliza luz radiante para dañar enemigos y proteger aliados.",
      features: [
        {nivel:3, nombre:"Radiance of the Dawn", desc:"Opción de Channel Divinity: disipás oscuridad mágica cerca y causás 2d10 + tu nivel de daño radiante en 30 pies a criaturas hostiles."},
        {nivel:3, nombre:"Warding Flare", desc:"Con reacción, imponés desventaja a un ataque que te apunta."},
        {nivel:6, nombre:"Improved Warding Flare", desc:"Warding Flare también protege a un aliado a distancia y otorga temp HP.", incierto:true},
        {nivel:17, nombre:"Corona of Light", desc:"Como acción adicional, emanás luz brillante en 60 pies; los enemigos dentro tienen desventaja en salvaciones contra tus conjuros de fuego o radiantes."},
      ]
    },
    {
      name: "War Domain", resumen: "Combatiente divino que potencia sus propios ataques con bendiciones de guerra.",
      features: [
        {nivel:3, nombre:"Guided Strike", desc:"Opción de Channel Divinity: sumás +10 a una tirada de ataque."},
        {nivel:3, nombre:"War Priest", desc:"Como acción adicional un número de veces por descanso largo, hacés un ataque extra al usar la acción de Atacar."},
        {nivel:6, nombre:"War God's Blessing", desc:"Con reacción, gastás Channel Divinity para dar +10 al ataque de un aliado a distancia."},
        {nivel:17, nombre:"Avatar of Battle", desc:"Ganás resistencia a daño contundente, perforante y cortante de armas no mágicas."},
      ]
    },
  ]
},

// ============================================================
// DRUIDA (Druid)
// ============================================================
{
  id: "druid", name: "Druid", nombre_es: "Druida",
  hitDie: 8, primaryAbility: "Sabiduría", savingThrows: ["Inteligencia", "Sabiduría"],
  casterType: "full", subclassLevel: 3, subclassLabel: "Círculo Druídico",
  resumen: "Lanzador que prepara conjuros de la lista completa de Druida y puede transformarse en bestias (Wild Shape). En 2024 elige Círculo en nivel 3 (antes nivel 2) y gana Primal Order en nivel 1.",
  resourceName: null,
  features: [
    {nivel:1, nombre:"Lanzamiento de Conjuros", desc:"Preparás conjuros de Druida usando Sabiduría; conocés algunos trucos."},
    {nivel:1, nombre:"Primal Order", desc:"Rasgo nuevo en 2024: elegís Magician (un truco adicional, sumás mod. Sabiduría a pruebas de Arcana/Naturaleza) o Warden (competencia en armas marciales y armadura media)."},
    {nivel:2, nombre:"Wild Shape", desc:"Como acción adicional, te transformás en una bestia que ya conocés (hasta 4 formas conocidas a la vez, intercambiables en descanso largo); 2 usos, se recuperan en descanso corto/largo."},
    {nivel:2, nombre:"Wild Companion", desc:"Gastás un uso de Wild Shape para invocar un espíritu familiar temporal en vez de transformarte."},
    {nivel:3, nombre:"Círculo Druídico (Subclase)", desc:"Elegís vuestro Círculo Druídico."},
    {nivel:4, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:5, nombre:"Wild Resurgence", desc:"Una vez por descanso largo, cambiás un uso de Wild Shape por un espacio de conjuro de nivel 1, o viceversa."},
    {nivel:7, nombre:"Elemental Fury", desc:"Elegís Primal Strike (daño elemental extra 1/turno al golpear, escala en nivel superior) o Potent Spellcasting (sumás mod. Sabiduría al daño de vuestros trucos)."},
    {nivel:8, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:8, nombre:"Wild Shape mejorado (vuelo)", desc:"Podés transformarte en bestias con velocidad de vuelo."},
    {nivel:12, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:15, nombre:"Elemental Fury mejorado", desc:"El daño de Primal Strike aumenta."},
    {nivel:16, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:18, nombre:"Beast Spells", desc:"Podés lanzar conjuros de Druida mientras estás transformado en Wild Shape."},
    {nivel:19, nombre:"Mejora de Puntuación de Característica / Don Épico", desc:"Última mejora de característica, o un Don Épico."},
    {nivel:20, nombre:"Archdruid", desc:"Usos ilimitados de Wild Shape; ignorás componentes verbales/somáticos de conjuros de Druida sin armadura."},
  ],
  subclasses: [
    {
      name: "Circle of the Moon", resumen: "Especialista en Wild Shape de combate — sus formas bestiales son más resistentes y letales.",
      features: [
        {nivel:3, nombre:"Circle of the Moon Spells", desc:"Ganás conjuros adicionales siempre preparados."},
        {nivel:3, nombre:"Improved Circle Forms", desc:"En Wild Shape, tu CA es 13 + mod. Sabiduría (si es mejor), ganás HP temporal igual a 3 × tu nivel de Druida, y el CR máximo de tus formas es tu nivel de Druida ÷ 3 (redondeado hacia abajo)."},
      ]
    },
    {
      name: "Circle of the Land", resumen: "Druida vinculado a un tipo de terreno, con conjuros y recuperación mágica propios de ese entorno.",
      features: [
        {nivel:3, nombre:"Circle of the Land Spells", desc:"Elegís un tipo de terreno (entre 4 opciones en el PHB2024) que otorga conjuros siempre preparados; podés cambiarlo en un descanso largo."},
        {nivel:6, nombre:"Natural Recovery", desc:"Rasgo movido de nivel 2 (2014) a nivel 6 (2024): recuperás espacios de conjuro en un descanso corto (combinado ≤ mitad de vuestro nivel de Druida), y podés lanzar un conjuro de vuestro círculo sin gastar espacio una vez por descanso largo."},
      ]
    },
    {
      name: "Circle of the Stars", resumen: "Canaliza constelaciones estelares para adivinar, curar y potenciar conjuros.",
      features: [
        {nivel:3, nombre:"Star Map / Starry Form", desc:"Podés transformarte en una de tres constelaciones (Archer, Chalice, Dragon) en vez de Wild Shape."},
        {nivel:3, nombre:"Cosmic Omen", desc:"Tras un descanso largo, tirás para determinar si tenés Weal (bono) o Woe (penalización) para usar sobre tiradas cercanas; usos = mod. Sabiduría."},
      ]
    },
  ]
},

// ============================================================
// PALADÍN (Paladin)
// ============================================================
{
  id: "paladin", name: "Paladin", nombre_es: "Paladín",
  hitDie: 10, primaryAbility: "Fuerza y Carisma", savingThrows: ["Sabiduría", "Carisma"],
  casterType: "half", subclassLevel: 3, subclassLabel: "Juramento Sagrado",
  resumen: "Guerrero divino que combina golpes marciales con magia de apoyo. En 2024 gana lanzamiento de conjuros y Lay on Hands desde nivel 1 (antes nivel 2), y Channel Divinity como rasgo nuevo de clase base.",
  resourceName: "Usos de Channel Divinity",
  resourceProgression: {2:2, 11:3},
  features: [
    {nivel:1, nombre:"Lanzamiento de Conjuros", desc:"Movido de nivel 2 (2014) a nivel 1 (2024): preparás conjuros de Paladín usando Carisma."},
    {nivel:1, nombre:"Lay on Hands", desc:"Reserva de HP curativos = 5 × tu nivel de Paladín; ahora se usa como acción adicional (antes acción); alternativamente, Restoring Touch te permite quitar una condición de una lista."},
    {nivel:2, nombre:"Fighting Style", desc:"Elegís un estilo de combate marcial."},
    {nivel:2, nombre:"Paladin's Smite (conjuros)", desc:"Divine Smite deja de ser un rasgo pasivo ilimitado por turno y pasa a ser una familia de conjuros de nivel 1 (Smite Paladino y variantes) que se lanzan como acción adicional tras golpear — limitado a una vez por turno.", incierto:true},
    {nivel:2, nombre:"Channel Divinity — Divine Sense y otro", desc:"Rasgo nuevo en 2024 (el Paladín de 2014 no tenía Channel Divinity): 2 usos, incluye Divine Sense (acción adicional, detectás el bien/mal cercano) y una opción propia del Juramento."},
    {nivel:3, nombre:"Juramento Sagrado (Subclase)", desc:"Elegís vuestro Juramento Sagrado."},
    {nivel:4, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:5, nombre:"Ataque Extra", desc:"Atacás dos veces al usar la acción de Atacar."},
    {nivel:6, nombre:"Aura of Protection", desc:"Vos y aliados cercanos suman vuestro mod. Carisma a salvaciones."},
    {nivel:8, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:9, nombre:"Abjure Foes", desc:"Rasgo (posible adición/renombre 2024) para repeler enemigos cercanos.", incierto:true},
    {nivel:10, nombre:"Aura of Courage", desc:"Vos y aliados cercanos sois inmunes a Asustado."},
    {nivel:11, nombre:"Radiant Strikes", desc:"Vuestros ataques de arma infligen daño radiante adicional."},
    {nivel:12, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:14, nombre:"Restoring Touch (mejorado)", desc:"Podés quitar condiciones adicionales con Lay on Hands."},
    {nivel:16, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:18, nombre:"Aura mejorada (10 pies más)", desc:"El alcance de vuestras auras aumenta a 30 pies."},
    {nivel:19, nombre:"Mejora de Puntuación de Característica / Don Épico", desc:"Última mejora de característica, o un Don Épico."},
    {nivel:20, nombre:"Rasgo del Juramento (capstone)", desc:"Rasgo de nivel 20 otorgado por vuestro Juramento Sagrado."},
  ],
  subclasses: [
    {
      name: "Oath of Devotion", resumen: "El paladín clásico — honor, protección y luz contra el mal.",
      features: [
        {nivel:3, nombre:"Sacred Weapon", desc:"Como acción adicional, imbuís un arma: sumás mod. Carisma a los ataques con ella y emite luz."},
        {nivel:3, nombre:"Aura of Devotion", desc:"Vos y aliados cercanos no podéis ser Encantados."},
        {nivel:15, nombre:"Smite of Protection", desc:"Al lanzar un conjuro de Smite, vos y aliados cercanos ganáis medio cobertura."},
      ]
    },
    {
      name: "Oath of the Ancients", resumen: "Protector de la naturaleza y la luz contra la oscuridad antigua.",
      features: [
        {nivel:3, nombre:"Nature's Wrath", desc:"Opción de Channel Divinity: enredáis a un enemigo cercano con zarcillos espectrales."},
        {nivel:7, nombre:"Aura of Warding", desc:"Vos y aliados cercanos ganáis resistencia al daño de conjuros necróticos, psíquicos y radiantes."},
        {nivel:15, nombre:"Undying Sentinel", desc:"Podés evitar caer a 0 HP y quedar con 1 HP una vez por descanso largo; no envejecés por medios mágicos.", incierto:true},
      ]
    },
    {
      name: "Oath of Vengeance", resumen: "Cazador implacable que persigue a un objetivo hasta destruirlo.",
      features: [
        {nivel:3, nombre:"Vow of Enmity", desc:"Como acción adicional (ya no requiere reacción como en 2014), declarás enemistad con un objetivo: ventaja en tiradas de ataque contra él."},
        {nivel:3, nombre:"Rebuke of the Violent (Channel Divinity)", desc:"Con reacción, respondés al daño de un enemigo cercano con daño necrótico."},
        {nivel:7, nombre:"Relentless Avenger", desc:"Al hacer un ataque de oportunidad, reducís la velocidad del objetivo a 0 (mejora respecto a 2014, que solo reducía la mitad)."},
      ]
    },
  ]
},

// ============================================================
// MAGO (Wizard)
// ============================================================
{
  id: "wizard", name: "Wizard", nombre_es: "Mago",
  hitDie: 6, primaryAbility: "Inteligencia", savingThrows: ["Inteligencia", "Sabiduría"],
  casterType: "full", subclassLevel: 3, subclassLabel: "Tradición Arcana",
  resumen: "Erudito arcano que aprende conjuros en un libro de conjuros y los prepara según su Inteligencia. El PHB2024 reduce las tradiciones arcanas del núcleo a 4 (Abjuración, Adivinación, Evocación e Ilusión); las otras 4 escuelas clásicas quedaron fuera del PHB por ahora.",
  resourceName: null,
  features: [
    {nivel:1, nombre:"Lanzamiento de Conjuros", desc:"Lleváis un libro de conjuros; conocéis 3 trucos (suben a 4 en nivel 4, a 5 en nivel 10)."},
    {nivel:1, nombre:"Ritual Adept", desc:"Podés lanzar cualquier conjuro con etiqueta Ritual de vuestro libro sin haberlo preparado."},
    {nivel:1, nombre:"Arcane Recovery", desc:"En un descanso corto, recuperáis espacios de conjuro (combinados ≤ mitad de vuestro nivel de Mago, redondeado hacia arriba), ninguno de nivel 6 o superior."},
    {nivel:2, nombre:"Scholar", desc:"Rasgo nuevo en 2024: ganáis Expertise (doble competencia) en una habilidad entre Arcana, Historia, Investigación, Medicina, Naturaleza o Religión, si ya sois competentes."},
    {nivel:3, nombre:"Tradición Arcana (Subclase)", desc:"Elegís vuestra Tradición Arcana."},
    {nivel:4, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:8, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:12, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:16, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:18, nombre:"Spell Mastery", desc:"Elegís un conjuro de nivel 1 y otro de nivel 2 que podéis lanzar a su nivel base sin gastar espacio."},
    {nivel:19, nombre:"Mejora de Puntuación de Característica / Don Épico", desc:"Última mejora de característica, o un Don Épico."},
    {nivel:20, nombre:"Signature Spells", desc:"Elegís dos conjuros de nivel 3 que siempre tenéis preparados y podéis lanzar una vez cada uno sin gastar espacio, recargando en descanso corto."},
  ],
  subclasses: [
    {
      name: "School of Abjuration", resumen: "Especialista defensivo: erige escudos mágicos que absorben daño.",
      features: [
        {nivel:3, nombre:"Arcane Ward", desc:"Al lanzar un conjuro de Abjuración de nivel 1+, creás un escudo mágico (HP = 2× vuestro nivel de Mago + mod. Inteligencia) que absorbe daño antes que vos."},
        {nivel:6, nombre:"Rasgo de nivel 6", desc:"Rasgo adicional de la escuela de Abjuración (detalle exacto sin confirmar contra el PHB2024).", incierto:true},
      ]
    },
    {
      name: "School of Evocation", resumen: "Especialista ofensivo en conjuros de área — potencia el daño y protege a sus aliados de sus propias explosiones.",
      features: [
        {nivel:3, nombre:"Sculpt Spells", desc:"Al lanzar un conjuro de Evocación de área, podés proteger a aliados elegidos para que automáticamente tengan éxito en la salvación y no reciban daño si el conjuro lo permitiría.", incierto:true},
        {nivel:6, nombre:"Rasgo de nivel 6", desc:"Rasgo adicional de la escuela de Evocación (detalle exacto sin confirmar contra el PHB2024).", incierto:true},
      ]
    },
    {
      name: "School of Illusion", resumen: "Maestro del engaño — sus ilusiones son casi indistinguibles de la realidad.",
      features: [
        {nivel:3, nombre:"Rasgo de nivel 3", desc:"Mecánica firma de la escuela de Ilusión (detalle exacto sin confirmar contra el PHB2024).", incierto:true},
        {nivel:6, nombre:"Rasgo de nivel 6", desc:"Rasgo adicional de la escuela de Ilusión (detalle exacto sin confirmar contra el PHB2024).", incierto:true},
      ]
    },
  ]
},

// ============================================================
// HECHICERO (Sorcerer)
// ============================================================
{
  id: "sorcerer", name: "Sorcerer", nombre_es: "Hechicero",
  hitDie: 6, primaryAbility: "Carisma", savingThrows: ["Constitución", "Carisma"],
  casterType: "full", subclassLevel: 3, subclassLabel: "Origen Hechiceril",
  resumen: "Lanzador innato que conoce un número fijo de conjuros y los potencia con Puntos de Hechicería. En 2024 elige Origen en nivel 3 (antes nivel 1) y gana Innate Sorcery en nivel 1 como compensación.",
  resourceName: "Puntos de Hechicería",
  resourceProgression: Object.fromEntries(Array.from({length:19}, (_,i) => [i+2, i+2])),
  features: [
    {nivel:1, nombre:"Lanzamiento de Conjuros", desc:"Conocéis un número fijo de conjuros y trucos de Hechicero, usando Carisma."},
    {nivel:1, nombre:"Innate Sorcery", desc:"Rasgo nuevo en 2024: como acción adicional, 2 veces por descanso largo, ganáis +1 a la CD de salvación de vuestros conjuros y ventaja en tiradas de ataque de conjuro por 1 minuto."},
    {nivel:2, nombre:"Font of Magic — Puntos de Hechicería", desc:"Ganáis Puntos de Hechicería (= vuestro nivel) que podéis convertir en espacios de conjuro o viceversa."},
    {nivel:3, nombre:"Origen Hechiceril (Subclase) y Metamagic", desc:"Elegís vuestro Origen Hechiceril y 2 opciones de Metamagic (gastan Puntos de Hechicería para modificar conjuros)."},
    {nivel:4, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:8, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:10, nombre:"Metamagic (opción adicional)", desc:"Aprendés una opción de Metamagic adicional."},
    {nivel:12, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:16, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:17, nombre:"Metamagic (opción adicional)", desc:"Aprendés otra opción de Metamagic."},
    {nivel:19, nombre:"Mejora de Puntuación de Característica / Don Épico", desc:"Última mejora de característica, o un Don Épico."},
    {nivel:20, nombre:"Sorcerous Restoration", desc:"Recuperáis 4 Puntos de Hechicería cuando terminan un descanso corto."},
  ],
  subclasses: [
    {
      name: "Draconic Sorcery", resumen: "Vuestra magia desciende de la sangre de un dragón (antes 'Draconic Bloodline').",
      features: [
        {nivel:3, nombre:"Draconic Resilience y Dragon's Breath", desc:"Ganáis HP máximo extra (+3, luego +1/nivel) y conocéis el conjuro Dragon's Breath."},
        {nivel:6, nombre:"Draconic Resilience mejorado", desc:"CA = 10 + mod. Destreza + mod. Carisma; resistencia a vuestro tipo de daño dracónico siempre activa (ya no cuesta Puntos de Hechicería, a diferencia de 2014)."},
        {nivel:14, nombre:"Dragon Wings", desc:"Ganáis alas y velocidad de vuelo, además de un bono de velocidad al volar (nuevo respecto a 2014)."},
        {nivel:18, nombre:"Draconic Companion", desc:"Podéis lanzar Summon Dragon sin componentes, espacio de conjuro ni concentración."},
      ]
    },
    {
      name: "Wild Magic Sorcery", resumen: "Vuestra magia es caótica e impredecible.",
      features: [
        {nivel:3, nombre:"Wild Magic Surge y Tides of Chaos", desc:"Al lanzar un conjuro de nivel 1+, un resultado de 20 natural en una tirada especial dispara un efecto de magia salvaje aleatorio (cambiado de 'sacar un 1' en 2014); Tides of Chaos os da ventaja en una tirada a cambio de un futuro surge."},
        {nivel:3, nombre:"Bend Luck", desc:"Gastás 1 Punto de Hechicería (bajó de 2 en 2014) para sumar o restar 1d4 a la tirada de otra criatura."},
        {nivel:18, nombre:"Tamed Surges", desc:"Rasgo nuevo en 2024: una vez por día, disparáis un surge a voluntad y elegís el resultado de la tabla."},
      ]
    },
  ]
},

// ============================================================
// BRUJO (Warlock)
// ============================================================
{
  id: "warlock", name: "Warlock", nombre_es: "Brujo",
  hitDie: 8, primaryAbility: "Carisma", savingThrows: ["Sabiduría", "Carisma"],
  casterType: "pact", subclassLevel: 3, subclassLabel: "Patrón de Otro Mundo",
  resumen: "Lanzador con un pacto sobrenatural: pocos espacios de conjuro pero de nivel alto (Pact Magic), que se recuperan en descanso corto. En 2024 elige Patrón en nivel 3 (antes nivel 1); el antiguo 'Pact Boon' (Blade/Chain/Tome) se fusionó con las Invocaciones Ocultas, disponibles desde nivel 1.",
  resourceName: null,
  features: [
    {nivel:1, nombre:"Pact Magic", desc:"Conocéis conjuros de Brujo con un pequeño número de espacios que se recuperan en un descanso corto, todos lanzados al máximo nivel disponible."},
    {nivel:1, nombre:"Invocaciones Ocultas (Eldritch Invocations)", desc:"Movidas de nivel 2 (2014) a nivel 1 (2024): elegís vuestra primera invocación. Las antiguas opciones de Pact Boon (familiar tipo Pacto de la Cadena, Libro de las Sombras del Pacto del Tomo, arma del Pacto de la Espada) ahora son invocaciones seleccionables sin requisito de nivel."},
    {nivel:2, nombre:"Magical Cunning", desc:"Rasgo nuevo en 2024: podés recuperar espacios de Pact Magic gastados fuera de un descanso corto/largo (condición exacta de activación sin confirmar).", incierto:true},
    {nivel:3, nombre:"Patrón de Otro Mundo (Subclase)", desc:"Elegís vuestro Patrón de Otro Mundo."},
    {nivel:4, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:5, nombre:"Invocación adicional", desc:"Aprendés otra Invocación Oculta."},
    {nivel:7, nombre:"Invocación adicional", desc:"Aprendés otra Invocación Oculta."},
    {nivel:8, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:9, nombre:"Invocación adicional", desc:"Aprendés otra Invocación Oculta."},
    {nivel:11, nombre:"Mystic Arcanum (nivel 6)", desc:"Aprendés un conjuro de nivel 6 que podéis lanzar una vez por descanso largo sin gastar espacio."},
    {nivel:12, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:13, nombre:"Mystic Arcanum (nivel 7)", desc:"Aprendés un conjuro de nivel 7 utilizable una vez por descanso largo."},
    {nivel:15, nombre:"Invocación adicional", desc:"Aprendés otra Invocación Oculta."},
    {nivel:15, nombre:"Mystic Arcanum (nivel 8)", desc:"Aprendés un conjuro de nivel 8 utilizable una vez por descanso largo."},
    {nivel:16, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:17, nombre:"Mystic Arcanum (nivel 9)", desc:"Aprendés un conjuro de nivel 9 utilizable una vez por descanso largo."},
    {nivel:19, nombre:"Mejora de Puntuación de Característica / Don Épico", desc:"Última mejora de característica, o un Don Épico."},
    {nivel:20, nombre:"Eldritch Master", desc:"Podéis recuperar todos vuestros espacios de Pact Magic gastados una vez por descanso largo, fuera de turno."},
  ],
  subclasses: [
    {
      name: "Archfey Patron", resumen: "Pacto con un señor o dama del Feywild — magia de encantamiento y desplazamiento.",
      features: [
        {nivel:3, nombre:"Steps of the Fey", desc:"Podéis lanzar Misty Step gratis un número de veces = vuestro mod. Carisma, cada uno con un efecto extra (temp HP a un aliado, o desventaja en salvación de Sabiduría a enemigos donde estabais)."},
        {nivel:6, nombre:"Misty Escape", desc:"Con reacción al recibir daño, lanzáis Misty Step gratis."},
        {nivel:10, nombre:"Bewitching Magic", desc:"Rasgo nuevo en 2024 (detalle exacto sin confirmar).", incierto:true},
      ]
    },
    {
      name: "Fiend Patron", resumen: "Pacto con un diablo o demonio — magia de fuego y destrucción.",
      features: [
        {nivel:3, nombre:"Dark One's Blessing", desc:"Al reducir a un enemigo a 0 HP (vos o un aliado, cambio respecto a 2014 donde era solo vos), ganáis HP temporal."},
        {nivel:3, nombre:"Dark One's Own Luck", desc:"Podéis sumar un bono a una prueba de característica o salvación una vez por descanso corto/largo."},
        {nivel:6, nombre:"Fiendish Resilience", desc:"Elegís un tipo de daño y ganáis resistencia a él hasta vuestro próximo descanso."},
      ]
    },
    {
      name: "Great Old One Patron", resumen: "Pacto con una entidad cósmica incomprensible — telepatía y terror psíquico.",
      features: [
        {nivel:3, nombre:"Awakened Mind", desc:"Podéis comunicaros telepáticamente; en 2024 requiere acción adicional, duración limitada y alcance ampliado, y un idioma compartido (a diferencia del alcance/duración ilimitados de 2014)."},
        {nivel:6, nombre:"Psychic Spells / Eldritch Hex", desc:"Rasgos nuevos en 2024 (detalle exacto sin confirmar).", incierto:true},
      ]
    },
  ]
},

// ============================================================
// EXPLORADOR (Ranger)
// ============================================================
{
  id: "ranger", name: "Ranger", nombre_es: "Explorador",
  hitDie: 10, primaryAbility: "Destreza y Sabiduría", savingThrows: ["Fuerza", "Destreza"],
  casterType: "half", subclassLevel: 3, subclassLabel: "Arquetipo de Explorador",
  resumen: "Cazador y rastreador con magia de apoyo. Cambio mayor en 2024: el lanzamiento de conjuros arranca en nivel 1 (antes nivel 2), y Favored Enemy se reemplaza por un Hunter's Mark siempre preparado con usos gratis.",
  resourceName: null,
  features: [
    {nivel:1, nombre:"Lanzamiento de Conjuros", desc:"Movido de nivel 2 (2014) a nivel 1 (2024): preparás conjuros de Explorador usando Sabiduría; siempre tenés Hunter's Mark preparado."},
    {nivel:1, nombre:"Favored Enemy (reemplazado)", desc:"En vez del rasgo de 2014, podés lanzar Hunter's Mark sin gastar espacio de conjuro 2 veces por descanso largo (escala hasta 6 veces en niveles altos, según nivel de competencia)."},
    {nivel:1, nombre:"Weapon Mastery", desc:"Ganáis propiedades de maestría con ciertas armas (mecánica nueva compartida entre clases marciales en 2024)."},
    {nivel:2, nombre:"Deft Explorer", desc:"Ganás Expertise en una habilidad en la que ya seas competente, y aprendés 2 idiomas adicionales (en 2014 este paquete incluía también Canny/Roving/Tireless juntos; en 2024 se separaron en rasgos de nivel propio)."},
    {nivel:3, nombre:"Arquetipo de Explorador (Subclase)", desc:"Elegís vuestro arquetipo."},
    {nivel:4, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:5, nombre:"Ataque Extra", desc:"Atacás dos veces al usar la acción de Atacar."},
    {nivel:6, nombre:"Roving", desc:"Movido de formar parte de Deft Explorer (2014) a rasgo propio de nivel 6: velocidad +10 pies sin armadura pesada, y ganás velocidad de nado y escalada."},
    {nivel:8, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:10, nombre:"Tireless", desc:"Movido a rasgo propio de nivel 10: podés otorgarte HP temporal como acción adicional un número de veces por descanso largo; reducís la Extenuación en un descanso corto."},
    {nivel:12, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:14, nombre:"Vanish", desc:"Podés esconderos como acción adicional; no os pueden rastrear por medios no mágicos."},
    {nivel:16, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:17, nombre:"Rasgo del arquetipo (nivel 17)", desc:"Rasgo de alto nivel otorgado por vuestro arquetipo."},
    {nivel:19, nombre:"Mejora de Puntuación de Característica / Don Épico", desc:"Última mejora de característica, o un Don Épico."},
    {nivel:20, nombre:"Foe Slayer", desc:"Una vez por turno, sumás vuestro mod. Sabiduría al daño o al ataque contra un objetivo marcado con Hunter's Mark."},
  ],
  subclasses: [
    {
      name: "Hunter", resumen: "Especialista versátil en cazar amenazas específicas, con opciones tácticas por tipo de enemigo.",
      features: [
        {nivel:3, nombre:"Hunter's Lore", desc:"Rasgo nuevo en 2024: obtenés información útil sobre resistencias/inmunidades de una criatura que veis."},
        {nivel:3, nombre:"Hunter's Prey", desc:"Elegís Colossus Slayer (daño extra 1/turno a enemigos heridos) o Horde Breaker (ataque extra a otro enemigo cercano; ya no puede reatacar al mismo objetivo, cambio respecto a 2014); la opción 'Giant Killer' de 2014 no está en 2024."},
        {nivel:7, nombre:"Defensive Tactics", desc:"Opción táctica defensiva del arquetipo Hunter (detalle exacto sin confirmar)."},
        {nivel:11, nombre:"Superior Hunter's Prey", desc:"Mejora de la opción elegida en nivel 3."},
        {nivel:15, nombre:"Superior Hunter's Defense", desc:"Mejora de la opción defensiva elegida en nivel 7."},
      ]
    },
    {
      name: "Gloom Stalker", resumen: "Emboscador que golpea primero desde la oscuridad y las sombras.",
      features: [
        {nivel:3, nombre:"Dread Ambusher", desc:"Ganáis +10 pies de velocidad en el primer turno de combate; el primer golpe de ese turno inflige 2d6 de daño psíquico extra (usos = bono de competencia, se recuperan en descanso largo); sumáis un modificador a la iniciativa."},
        {nivel:3, nombre:"Umbral Sight", desc:"Ganáis visión en la oscuridad; sois invisibles a la visión en la oscuridad de otras criaturas mientras estáis en oscuridad."},
        {nivel:7, nombre:"Iron Mind", desc:"Ganáis competencia en salvaciones de Sabiduría (o Inteligencia/Carisma si ya tenéis Sabiduría)."},
        {nivel:11, nombre:"Stalker's Flurry", desc:"Podéis repetir el daño extra de Dread Ambusher una vez más por turno gastando un uso adicional."},
        {nivel:15, nombre:"Shadowy Dodge", desc:"Con reacción, imponéis desventaja a un ataque que os apunta."},
      ]
    },
    {
      name: "Beast Master", resumen: "Combate junto a un compañero animal vinculado mágicamente.",
      features: [
        {nivel:3, nombre:"Primal Companion", desc:"Invocáis un compañero bestia (estadísticas de Bestia de Tierra/Mar/Aire) que escala con vuestro nivel de Explorador y bono de competencia."},
        {nivel:7, nombre:"Exceptional Training", desc:"Vuestro compañero puede usar Correr/Desengancharse/Esquivar/Ayudar como acción adicional vuestra, e inflige daño de Fuerza extra al golpear."},
        {nivel:11, nombre:"Bestial Fury", desc:"Vuestro compañero ataca dos veces; gana daño de Fuerza extra contra objetivos marcados por vos."},
        {nivel:15, nombre:"Share Spells", desc:"Podéis afectar a vuestro compañero con conjuros de objetivo único que os afectan a vos."},
      ]
    },
  ]
},

// ============================================================
// PÍCARO (Rogue)
// ============================================================
{
  id: "rogue", name: "Rogue", nombre_es: "Pícaro",
  hitDie: 8, primaryAbility: "Destreza", savingThrows: ["Destreza", "Inteligencia"],
  casterType: null, subclassLevel: 3, subclassLabel: "Arquetipo Pícaro",
  resumen: "Especialista en sigilo, habilidades y golpes precisos (Sneak Attack). En 2024 gana Steady Aim como rasgo base de nivel 3 (antes opcional de suplemento) y una nueva mecánica, Cunning Strike, desde nivel 5.",
  resourceName: "Dados de Sneak Attack",
  resourceProgression: {1:"1d6",3:"2d6",5:"3d6",7:"4d6",9:"5d6",11:"6d6",13:"7d6",15:"8d6",17:"9d6",19:"10d6"},
  features: [
    {nivel:1, nombre:"Experticia (Expertise)", desc:"Duplicás vuestro bono de competencia en 2 habilidades (o 1 habilidad y ladrón de herramientas) en las que ya seáis competentes."},
    {nivel:1, nombre:"Sneak Attack", desc:"Una vez por turno, infligís daño extra (1d6, escala cada 2 niveles hasta 10d6 en nivel 19-20) a un objetivo si tenéis ventaja, o si un aliado está a 5 pies de él y vos no tenéis desventaja."},
    {nivel:1, nombre:"Cant de Ladrones (Thieves' Cant)", desc:"Conocéis una jerga y sistema de señas secreto entre pícaros."},
    {nivel:2, nombre:"Acción Astuta (Cunning Action)", desc:"Como acción adicional: Desengancharos, Escondeos o Corred."},
    {nivel:3, nombre:"Arquetipo Pícaro (Subclase)", desc:"Elegís vuestro arquetipo."},
    {nivel:3, nombre:"Steady Aim", desc:"Rasgo nuevo como parte de la clase base en 2024 (antes opcional en Tasha's): como acción adicional, ganáis ventaja en vuestro próximo ataque con arma a distancia este turno si no os movéis."},
    {nivel:4, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:5, nombre:"Cunning Strike", desc:"Rasgo nuevo en 2024: al golpear con Sneak Attack, podéis renunciar a algunos dados de daño para activar un efecto (Poison, Trip, Withdraw) en vez de daño completo."},
    {nivel:5, nombre:"Uncanny Dodge", desc:"Con reacción, reducís a la mitad el daño de un ataque que os impacta."},
    {nivel:7, nombre:"Evasión", desc:"En salvaciones de Destreza para reducir daño a la mitad: éxito = sin daño, fallo = mitad de daño."},
    {nivel:7, nombre:"Reliable Talent", desc:"Movido de nivel 11 (2014) a nivel 7 (2024): en pruebas donde tenéis competencia, un resultado de dado menor a 10 cuenta como 10."},
    {nivel:8, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:10, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:11, nombre:"Improved Cunning Strike", desc:"Podéis aplicar dos efectos de Cunning Strike a la vez."},
    {nivel:12, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:14, nombre:"Sentidos Ciegos (Blindsense)", desc:"Detectáis criaturas ocultas/invisibles a 10 pies si no estáis sordos."},
    {nivel:15, nombre:"Slippery Mind", desc:"Ganáis competencia en salvaciones de Sabiduría."},
    {nivel:16, nombre:"Mejora de Puntuación de Característica", desc:"Aumentás una característica en 2, o dos en 1 cada una, o tomás un Talento."},
    {nivel:18, nombre:"Elusive", desc:"Ningún ataque contra vos tiene ventaja mientras no estéis incapacitado."},
    {nivel:19, nombre:"Mejora de Puntuación de Característica / Don Épico", desc:"Última mejora de característica, o un Don Épico."},
    {nivel:20, nombre:"Stroke of Luck", desc:"Podéis convertir una prueba fallida en un 20 automático, o convertir un ataque que os impacta en un fallo, una vez por descanso corto/largo."},
  ],
  subclasses: [
    {
      name: "Arcane Trickster", resumen: "Pícaro que combina sigilo con magia arcana de apoyo.",
      features: [
        {nivel:3, nombre:"Lanzamiento de Conjuros y Mage Hand Legerdemain", desc:"Ganáis conjuros de Mago (lanzador de un tercio) y una Mage Hand invisible como acción adicional que puede robar bolsillos o forzar cerraduras a distancia."},
        {nivel:9, nombre:"Magical Ambush", desc:"Si estáis escondido al lanzar un conjuro contra una criatura, esta tiene desventaja en su salvación."},
        {nivel:13, nombre:"Versatile Trickster", desc:"Podéis usar Mage Hand para daros ventaja en un ataque (nombre/detalle exacto sin confirmar).", incierto:true},
        {nivel:17, nombre:"Spell Thief", desc:"Podéis robar un conjuro preparado de un lanzador que acaba de impactaros con él."},
      ]
    },
    {
      name: "Assassin", resumen: "Especialista letal en golpes por sorpresa y sigilo.",
      features: [
        {nivel:3, nombre:"Assassinate", desc:"Tenéis ventaja contra criaturas que no hayan actuado en el combate todavía; el daño extra contra un objetivo sorprendido es igual a vuestro nivel de Pícaro (en 2014 era un crítico automático)."},
        {nivel:3, nombre:"Death Strike", desc:"Rasgo relacionado con golpes letales contra objetivos sorprendidos (condición de activación exacta sin confirmar contra el PHB2024).", incierto:true},
        {nivel:9, nombre:"Rasgo de nivel 9", desc:"Rasgo adicional del arquetipo Assassin (detalle exacto sin confirmar)."},
        {nivel:13, nombre:"Rasgo de nivel 13", desc:"Rasgo adicional del arquetipo Assassin (detalle exacto sin confirmar)."},
        {nivel:17, nombre:"Rasgo de nivel 17", desc:"Rasgo capstone del arquetipo Assassin (detalle exacto sin confirmar)."},
      ]
    },
    {
      name: "Thief", resumen: "El ladrón clásico — ágil, rápido y hábil con las manos.",
      features: [
        {nivel:3, nombre:"Fast Hands", desc:"Podéis usar Cunning Action para usar un objeto, abrir una cerradura o buscar en un contenedor."},
        {nivel:3, nombre:"Thief's Reflexes", desc:"Tenéis dos turnos en la primera ronda de combate (uno en iniciativa normal, otro en iniciativa -10)."},
        {nivel:9, nombre:"Supreme Sneak", desc:"Ventaja en pruebas de Sigilo si os movéis a la mitad de vuestra velocidad ese turno."},
        {nivel:13, nombre:"Use Magic Device", desc:"Ignoráis todos los requisitos de clase/raza/nivel para usar un objeto mágico."},
        {nivel:17, nombre:"Thief's Reflexes (mejorado)", desc:"Rasgo capstone del arquetipo Thief (detalle exacto sin confirmar).", incierto:true},
      ]
    },
  ]
},

];

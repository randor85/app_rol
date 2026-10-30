# Historial de versiones — app de fichas de personaje

**Poda del 21 oct 2026.** A pedido del usuario se conservaron solo 10 respaldos de hitos y se renumeraron de 1.0 a 10.0 (antes había 103 carpetas, 37 MB). Cada carpeta contiene los archivos **tal como estaban justo antes** del cambio indicado, no una copia completa del sitio. El log detallado de las versiones 1.0–103.1 (con evidencia de tamaños y diagnósticos) está en el historial de git: `git log -p -- "public/legacy estable/log.md"`. Las carpetas borradas también siguen en git.

Los números de las carpetas (1.0–10.0) son **de respaldo**; los de la columna «versión de aplicación» son los de `VERSION_APP` y los de los mensajes de commit. Los respaldos nuevos continúan desde 11.0.

## Hitos con respaldo

### 1.0 — Base unificada (25 ago 2026)
Respaldo de la versión de aplicación **8.0** (antes de aplicarla). Las 6 fichas comparten arquitectura de código (`PERSONAJE_ID`, `charRef`, `guardarCampo`, `sincronizarDatosDesdeNube`, Firebase compat 9.22), modo solo lectura y seguridad por campaña.

### 2.0 — Separación por sistema (26 ago 2026)
Respaldo de la versión de aplicación **14.1** (antes de aplicarla). Campañas con sistema `dnd`/`coc`, reglas de la base que impiden mezclar personajes de sistemas distintos, y la lección de que las reglas hay que desplegarlas (`firebase deploy --only database`).

### 3.0 — Últimas fichas independientes (18 oct 2026)
Respaldo de la versión de aplicación **54.6** (antes de aplicarla). Cada ficha con su propio código (HTML+CSS+JS), con editor de hechizos, subida de nivel guiada, bitácora editable y compendios. Punto de retorno antes de `ficha-common.js`.

### 4.0 — Las 6 fichas sobre `ficha-common.js` (19 oct 2026)
Respaldo de la versión de aplicación **59.0** (antes de aplicarla). Motor compartido: autoguardado, estadísticas calculadas, CA por armadura, buffs, concentración y editores de lista. Se acaba el copiar y pegar entre fichas.

### 5.0 — Carcasa única (19 oct 2026)
Respaldo de la versión de aplicación **66.0** (antes de aplicarla). `ficha.html?pj=<id>` reemplaza a las 6 páginas (que quedan como redirecciones); dados, estados SRD y panel de grupo comunes. Las fichas anteriores se conservan como `*_clasico.html`.

### 6.0 — Creador de personajes y clases custom (19 oct 2026)
Respaldo de la versión de aplicación **70.0** (antes de aplicarla). Personajes dinámicos (`pc_*`, solo datos), creador y clases/subclases custom. Base de «crear sin tocar código».

### 7.0 — Sesión estable (20 oct 2026)
Respaldo de la versión de aplicación **77.0** (antes de aplicarla). Sesión persistente con tiempo de gracia y diagnóstico local, caché de hosting y `VERSION_APP`.

### 8.0 — GM de apoyo (20 oct 2026)
Respaldo de la versión de aplicación **98.0** (antes de aplicarla). Dos jerarquías de GM, clave de GM con hash PBKDF2, tablas aleatorias, ataques editables. Último estado antes de la membresía por campaña.

### 9.0 — Rasgos propios y biblioteca (20 oct 2026)
Respaldo de la versión de aplicación **102.0** (antes de aplicarla). Rasgos declarativos editables en la ficha, biblioteca integrada (SRD) y global, y tema visual del menú. Incluye membresía, perfil y campañas privadas ya aplicadas (99.0–101.0).

### 10.0 — Motor de Call of Cthulhu (21 oct 2026)
Respaldo de la versión de aplicación **103.0** (antes de aplicarla). Ficha, creador de investigadores y biblioteca de capacidades de CoC; Nevada Jones migrada con paridad. Es el estado previo a esa migración; lo posterior (103.0–103.1) vive en git.

## Versiones intermedias sin respaldo propio
Cada línea es una versión de aplicación; el detalle está en git.

| Versión | Cambio |
|---|---|
| 1.0 | 13 ago 2026 |
| 2.0 | 18 ago 2026 |
| 3.0 | 19 ago 2026 (madrugada) |
| 4.0 | 19 ago 2026 (tarde) |
| 5.0 | 21 ago 2026 (madrugada) |
| 6.0 | 21 ago 2026 (tarde) |
| 7.0 | 24 ago 2026 |
| 8.0 | unificación código+visual+seguridad+XP (25 ago 2026) |
| 9.0 | sistema de subida de nivel (25 ago 2026) |
| 10.0 | rework Nevada Jones + subida de nivel Dane (25 ago 2026) |
| 11.0 | inventario editable (26 ago 2026) |
| 12.0 | bugfixes "the society" - Nevada Jones (26 ago 2026) |
| 13.0 | bugs "the society" - descanso + usar simple (26 ago 2026) |
| 14.0 | separación por sistema (26 ago 2026) |
| 14.1 | fix deploy reglas sistema (26 ago 2026) |
| 15.0 | bitácora desde las fichas (26 ago 2026) |
| 16.0 | upcast de hechizos (26 ago 2026) |
| 17.0 | bitácora fix desplegable (26 ago 2026) |
| 18.0 | fix daños cantrips: Poison Spray, Sacred Flame, Produce Flame (26 ago 2026) |
| 19.0 | fix Unicorn Totem en upcast de heals de Fiona (26 ago 2026) |
| 20.0 | completar rasgos de clase/raza: Eldur, Hannoghar, Dane (26 ago 2026) |
| 20.1 | completar rasgos de clase/raza: Myrklogi, Ulreek (26 ago 2026) |
| 21.0 | uso de recursos loggeado, botón de Hit Die, auto-marcado de spell slots (26 ago 2026) |
| 26.0 | texto editable, salvaciones de muerte, secciones de Trasfondo, revisión de HP (26 ago 2026) |
| 27.0 | Fiona: eliminación de popups "mini-detail" y unificación de la sección 2 (26 ago 2026) |
| 28.0 | Fiona: fix de anidamiento de tarjetas en la sección 2, bug introducido en 27.0 (26 ago 2026) |
| 29.0 | Dane: unificación de estructura de código, ids, clases CSS y markup con el resto de la flota (27 ago 2026) |
| 30.0 | Ulreek: HP real y spells faltantes (27 ago 2026) |
| 31.0 | index: fix navegación a ficha de Ulreek (28 ago 2026) |
| 32.0 | sistema de condiciones y desventaja automática en Ulreek; unificación de la tarjeta de spell slots (estilo Ulreek) en Fiona, Eldur, Myrklogi y Hannoghar (28 ago 2026) |
| 33.0 | Dane: fix de AC contradictorio en la barra sticky (29 ago 2026) |
| 34.0 | fix del popover "Nivel" que se salía de pantalla / quedaba tapado por la barra de dados (29 ago 2026) |
| 35.0 | fix del popover "XP" (mismo bug que Nivel) + toggle de barras fijas para liberar espacio en celular (29 ago 2026) |
| 36.0 | botón de tirada de salvación de muerte + texto mejorado en el historial de tiradas (29 ago 2026) |
| 37.0 | Dane: lanzador de dados propio + barras fijas "sueltas" por defecto (fix bitácora tapada) (29 ago 2026) |
| 38.0 | lanzador de dados: Moneda del Destino (D2), selector de Cantidad y dado custom en las 6 fichas (29 ago 2026) |
| 39.0 | lanzador de dados: descartar N mejores/peores, ventaja/desventaja de varios dados (29 ago 2026) |
| 40.0 | Dane: fix real del corte en la Bitácora (margen negativo de `.header` pisándola) (29 ago 2026) |
| 41.0 | selector único de Ventaja/Desventaja en el lanzador de dados; Condiciones y Efectos junto a Salvaciones de Muerte; Dane con conditions propio; fix de layout del panel de dados (29 ago 2026) |
| 43.0 | lanzador de dados: compactación del panel (iconos, "Quitar" unificado, result box angosto) (29 ago 2026) |
| 44.0 | botones "Usar" en spells/habilidades sin dado (Eldur, Hannoghar, Ulreek); Ulreek: Hit Dice a la tarjeta de HP + Sorcery Points a Espacios de Conjuro (29 ago 2026) |
| 45.0 | unificación de la tarjeta de historial de dados (estilo Hannoghar) en las 6 fichas + fix de contraste en Modo Día (29 ago 2026) |
| 46.0 | fix de XP vs Nivel según la tabla de XP custom (Fiona, Myrklogi, Ulreek) (29 ago 2026) |
| 47.0 | fix de tablas anchas sin scroll horizontal en mobile (Eldur, Fiona, Hannoghar, Myrklogi, Ulreek) (29 ago 2026) |
| 48.0 | Dane: botones de Descanso Corto/Largo (gap conocido desde la unificación de código) (29 ago 2026) |
| 49.0 | Compendio de Hechizos: nueva página `spells.html`, enlazada desde el menú (29 ago 2026) |
| 50.0 | Editor de hechizos aprendidos + botón de Subir de Nivel guiado (las 6 fichas D&D) (30 ago 2026) |
| 51.0 | fix de inventario: re-sincronización en vivo desde Firebase (las 6 fichas D&D) (30 ago 2026) |
| 52.0 | editar/borrar entradas de bitácora (las 7 fichas + panel del GM en index.html) (30 ago 2026) |
| 53.0 | Compendio de Clases: nueva página `classes.html`, enlazada desde el menú (30 ago 2026) |
| 54.0 | Sistema nuevo "El Último Chicle": campaña de 6 jugadores sin nombre fijo + integración con el GM (15 oct 2026) |
| 54.1 | fix: conteo de chicles mal leído en la pantalla del GM (15 oct 2026) |
| 54.2 | tiradas de chicle: mostrar éxito/fracaso en el historial del GM (15 oct 2026) |
| 54.3 | previsualizar hechizos antes de agregarlos, en las 6 fichas D&D (18 oct 2026) |
| 54.4 | link a la tabla de progresión de clases desde el picker de hechizos (18 oct 2026) |
| 54.5 | "Usar" un hechizo adicional gasta un espacio real (+ fix de `.innerText` en `changeVal`) (18 oct 2026) |
| 54.6 | Hechizos Adicionales integrados a la tabla/lista de conjuros, interfaz consistente (18 oct 2026) |
| 55.0 | fix bono de competencia stale tras subir de nivel (19 oct 2026) |
| 56.0 | Fiona migrada a `ficha-common.js`, con estadísticas calculadas (19 oct 2026) |
| 57.0 | buffs activables en los hechizos (19 oct 2026) |
| 58.0 | CA calculada por armadura y casilla de concentración (19 oct 2026) |
| 58.1 | tracker de reputación/honor en Fiona + fix de campos de formulario en `datos/` (19 oct 2026) |
| 59.0 | Eldur, Hannoghar, Myrklogi, Ulreek y Dane migrados a `ficha-common.js` (19 oct 2026) |
| 60.0 | Channel Divinity de Hannoghar: 2 usos (19 oct 2026) |
| 61.0 | Lanzador de dados común en las 6 fichas, y Dane deja de ser distinto (19 oct 2026) |
| 62.0 | Estados del SRD 2014 (condiciones y agotamiento) automatizados (19 oct 2026) |
| 63.0 | Panel del grupo (party) con PG, CA, concentración y condiciones (19 oct 2026) |
| 64.0 | Carcasa única `ficha.html?pj=<id>` con los 6 personajes (19 oct 2026) |
| 65.0 | Avisos emergentes y buffs personalizados con condición (19 oct 2026) |
| 66.0 | Pase a producción: las 6 fichas pasan a la URL única (19 oct 2026) |
| 67.0 | Compendio de hechizos ampliado con el SRD 2014 y 2024 (19 oct 2026) |
| 68.0 | Pantalla del GM: PG reales, CA, iniciativa y más datos (19 oct 2026) |
| 69.0 | Clases Bárbaro, Bardo y Guerrero + índice de subclases oficiales (19 oct 2026) |
| 70.0 | Creador de personajes dinámico y clases/subclases custom (19 oct 2026) |
| 71.0 | Importador de JSON de Alchemy RPG y baja de Luciane Lamas, Sporium y Muldar (20 oct 2026) |
| 72.0 | El importador también lee el XML de Fantasy Grounds Unity (20 oct 2026) |
| 73.0 | Sesión persistente en el dispositivo y menú sin parpadeo de login (20 oct 2026) |
| 74.0 | Textos de la app en español neutro latinoamericano (20 oct 2026) |
| 74.1 | Textos guardados en español neutro y despliegue (20 oct 2026) |
| 75.0 | Redirección de personajes-rol.firebaseapp.com a personajes-rol.web.app (20 oct 2026) |
| 76.0 | Concentración en la barra, hechizos repetibles y daño extra, todo en el motor (20 oct 2026) |
| 77.0 | Sesión con tiempo de gracia, diagnóstico ampliado y caché de hosting (20 oct 2026) |
| 78.0 | Hechizos con cargas propias (Fey-Touched) en el motor (20 oct 2026) |
| 79.0 | Descripción de armaduras, desglose de la CA y más diagnóstico de sesión (20 oct 2026) |
| 80.0 | Casilla «Equipado» en el inventario (20 oct 2026) |
| 81.0 | Atajos a las secciones en la barra fija (20 oct 2026) |
| 82.0 | Formulario de edición junto al elemento editado (20 oct 2026) |
| 83.0 | Etiquetas sobre los campos de los formularios de edición (20 oct 2026) |
| 84.0 | Descripción completa de los hechizos y arreglo del botón «Ver» del compendio (20 oct 2026) |
| 85.0 | Subclases custom en una biblioteca global (20 oct 2026) |
| 86.0 | Reglas y biblioteca de subclases publicadas; Circle of the Shepherd (20 oct 2026) |
| 87.0 | Las subclases globales se ven en el compendio de clases aunque no haya campaña (20 oct 2026) |
| 87.1 | Circle of Spores en la biblioteca global (20 oct 2026) |
| 88.0 | Way of the Sun Soul (Monje) y ajuste de Eldur (20 oct 2026) |
| 89.0 | Clases también globales, creador integrado en el compendio y Light Domain de Eldur (20 oct 2026) |
| 90.0 | Light Domain: Warding Flare e Improved Warding Flare en versión 2024 (20 oct 2026) |
| 91.0 | Botón «Compartir» en la barra fija (20 oct 2026) |
| 92.0 | Recursos y rasgos en una sola tarjeta (20 oct 2026) |
| 93.0 | QA de la interfaz: correcciones (20 oct 2026) |
| 94.0 | Ataques editables con escalado por nivel (20 oct 2026) |
| 95.0 | Clave de GM con hash (P1 del QA) (20 oct 2026) |
| 96.0 | Objetivos táctiles y widgets flotantes en móvil (P3 y P4 del QA) (20 oct 2026) |
| 97.0 | Tabla de Wild Magic Surge (Ulreek) y CD del save de concentración por el último daño (20 oct 2026) |
| 98.0 | GM de apoyo (dos jerarquías) y dados configurables en las tablas aleatorias (20 oct 2026) |
| 99.0 | Membresía por campaña, invitaciones, creación de campañas y menú/compendios con el tema nuevo (20 oct 2026) |
| 100.0 | Nombre de usuario editable y buscador de campañas por jugador (20 oct 2026) |
| 101.0 | Campañas privadas (20 oct 2026) |
| 102.0 | Rasgos propios en la ficha, biblioteca de rasgos (integrada y global) y rasgos automáticos al crear personajes (21 oct 2026) |
| 103.0 | Motor de Call of Cthulhu: ficha, creador de investigadores y biblioteca de capacidades (21 oct 2026) |
| 103.1 | Suerte como tracker en la ficha de Cthulhu y compendios solo para D&D (21 oct 2026) |
| 104.0 | Botón «Colapsar todo / Expandir todo» en la barra fija (D&D y Cthulhu) y pestaña «👥 Grupo» en el panel de dados: log compartido de la campaña (`campanas/<c>/tiradas`, con detalle y aviso de las tiradas de otras personas) |

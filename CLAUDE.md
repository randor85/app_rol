# App de fichas de personaje — contexto para Claude Code

Plataforma de administración de fichas de rol para un grupo de juego. Es un sitio estático (sin build, sin framework, sin `package.json`) desplegado en **Firebase Hosting**, con **Firebase Realtime Database** como backend de datos y autenticación. Cada personaje es un archivo HTML autocontenido (HTML+CSS+JS en un solo archivo) que lee/escribe directamente en Firebase.

Desde el 27 ago 2026 hay repositorio git en `https://github.com/randor85/app_rol` (rama `main`), pero **git es solo respaldo/historial de código — no reemplaza el flujo de respaldos manuales en `legacy estable/` ni hace deploy**. Publicar el sitio real sigue siendo `firebase deploy` (ver advertencia de `database.rules.json` más abajo). Cuidado si trabajás en esta carpeta con git: vive dentro de Google Drive ("Mi unidad"), que puede volcar `desktop.ini` dentro de `.git/` (incluso en `.git/objects/*/`) y corromper refs — si un `git fetch`/`status` falla con `bad object` o similar, correr `find .git -iname "desktop.ini" -delete` antes de reintentar.

## Estructura del proyecto

```
pjs/app/                        ← raíz del proyecto Firebase
├── .firebaserc                 ← proyecto Firebase: "personajes-rol"
├── firebase.json               ← hosting.public = "public"; database.rules = database.rules.json
├── database.rules.json         ← reglas de Firebase RTDB (con comentarios) — ⚠️ ver advertencia abajo
├── bugs-fixes-pendientes.md    ← lista VIVA de pendientes/bugs (el usuario la edita a mano)
├── campanas.json, society.json, borrador   ← notas/plantillas sueltas, no productivas
└── public/                     ← todo lo que se sirve en Firebase Hosting
    ├── index.html              ← menú principal: login, selector de campaña/sistema, listado de personajes, panel de GM
    ├── db_rules.txt            ← reglas de Firebase RTDB — ⚠️ ver advertencia abajo
    ├── db.json                 ← export de datos reales de Firebase (no es fuente de verdad, es un snapshot)
    ├── 404.html
    ├── ficha.html (+ ficha-shell.js, ficha-plantilla.js, personajes/<id>.js)   ← ficha única de los 6 personajes D&D (ver "Carcasa única")
    ├── fiona_faraway.html, eldur.html, hannoghar.html, myrklogi_mangarisonn.html,
    │   ulreek.html, dane.html   ← desde la v66.0 son REDIRECCIONES a ficha.html?pj=<id> (conservan ?campana=)
    ├── <id>_clasico.html       ← la versión anterior de cada una (respaldo para volver atrás; no se enlaza desde ningún lado)
    ├── ficha-coc.html (+ ficha-coc-shell.js, ficha-coc-plantilla.js, ficha-coc.js, personajes-coc/<id>.js)   ← ficha única de Call of Cthulhu (ver «Call of Cthulhu»)
    ├── nevada_jones.html       ← redirección a ficha-coc.html?pj=nevada_jones (la ficha anterior: nevada_jones_clasico.html)
    ├── legacy estable/         ← respaldos versionados (ver "Respaldos e historial")
    ├── estable provisorio/     ← snapshots puntuales más antiguos, menos relevantes
    └── trabajo en progreso/    ← borradores viejos descartados, no tocar salvo que el usuario lo pida
```

> **Estado desde la v66.0:** las 6 fichas D&D se ven y usan desde la carcasa única (`ficha.html?pj=<id>`, sección «Carcasa única»). Las secciones «Arquitectura actual», «Arquitectura de cada ficha D&D» y «Dane» describen el código de las fichas clásicas (`*_clasico.html`), que sigue siendo la base del motor compartido `ficha-common.js`.

## Arquitectura actual: `ficha-common.js` (desde la v56.0)

Las 6 fichas D&D cargan `public/ficha-common.js` (mismo mecanismo `<script src>` que `spells_data.js`/`classes_data.js`, pero con funciones) y definen un `FICHA_CONFIG` ANTES de cargarlo. **Un fix del motor se hace una vez en `ficha-common.js`**, no en 6 archivos. Lo que cada ficha conserva: su HTML/CSS, su `FICHA_CONFIG`, sus rasgos de clase, y su lógica propia (dados de Dane, Pact Magic de Ulreek, owner/GM con efecto lateral de `hp-max`, etc.).

`FICHA_CONFIG`: `personajeId`, `nombrePersonaje`, `sistemaPropio`, `habilidadConjuro` (para DC/ataque automáticos), `hechizosIniciales`, `inventarioInicial`, `reputacionInicial`, `caBase` (CA fija mientras no haya armadura equipada) o `caSinArmadura()` (fórmula de clase), `wrapperSelector` (default `.sheet`; Fiona usa `.container`), `mostrarTirada(total, etiqueta, detalle)`, y los ganchos opcionales `resolverSlotId(h, nivel)` / `alGastarSlot(nivel, h, slotId)`.

Piezas del motor: autoguardado y sincronización genéricos (`FichaComun.sincronizarDatosDesdeNube`, evento `ficha:datos-sincronizados`), `crearEditorDeLista` (base de los editores de hechizos, inventario y reputación; guarda JSON en `datos/<clave>-json`), `iniciarAtributos` (bono de competencia por nivel + Check/Save/skills con competencia y expertise + percepción pasiva + aumento temporal por atributo; lee `dataset.bonus`, nunca números fijos en los `onclick`), `iniciarEstadisticaConBuff` (patrón base + buff manual + buffs activados: ataque, CD, iniciativa, velocidad, HP máx.), `iniciarCA` (armadura/escudo equipados con tope de DEX; reconoce armaduras SRD por nombre), `iniciarConcentracion`, buffs activables en hechizos (`FichaBuffs`: efectos plano/dado/atributo, panel `#buffs-activos`), upcast (`dado` o `tabla`), bitácora, permisos/compartir/modo lectura.

Reglas que costaron bugs reales: (1) **nunca escribir bonos de competencia a mano** (`Save +8★`, `DC 16`…): usar el motor; es lo que dejó 25 números viejos al subir Fiona a nivel 9 (v55.0). (2) Los campos de formularios temporales (`hf-`, `if-`, `rf-`, `upcast-sel-`, `bitacora-ficha-`) no deben guardarse en `datos/` (`FichaComun.esCampoEfimero`), y la casilla de concentración no lleva `id`. (3) Leer valores de elementos dentro de `<details>` colapsados con `.textContent`, no `.innerText`. (4) Antes de migrar o tocar una ficha: respaldo en `legacy estable/N.0 …/`, comparar los valores calculados contra los de la ficha en vivo, y no "corregir" datos del personaje sin confirmar.

El resto de esta sección describe el patrón anterior (cada ficha con su propia copia del autoguardado), que sigue siendo la base conceptual pero ya no es el código que corre.

## Módulos compartidos (lo común) — estado desde la v61.0–63.0

Todos se cargan con `<script src>` (sin build). `FICHA_CONFIG` se define ANTES de `ficha-common.js`.

- `ficha-common.js` — motor (ver sección anterior). Exporta además `FichaComun.reaplicarDatos()` (vuelve a volcar el último snapshot a elementos dibujados tarde) y `FichaAtributos.nivel()`. Los ids `dice-*`/`dados-*` son efímeros (no se guardan en `datos/`).
- `ficha-dados.js` + `ficha-dados.css` — lanzador de dados flotante (🎲), chip de ventaja siempre visible (Normal/Ventaja/Desventaja sobre `#dice-adv`), historial de tiradas y de usos de recursos (local) y publicación a `campanas/<c>/tiradas` (y, con `publicarUsos`, los usos de recurso como `🔧 …`/`usó` para el GM). `FichaDados.d20({mod, etiqueta, categoria:'ataque'|'pruebas'|'salvaciones', ventaja?, extras?, notas?, sinReglas?})` resuelve ventaja/desventaja (selector + estados de `ficha-reglas.js`), Bless/Bane (casillas `buff-bless`/`debuff-bane`, solo ataques y salvaciones), dados extra de buffs, y anota ¡CRÍTICO!/pifia; `tirar`, `calcular` (sin mostrar), `mostrar`, `moneda`, `registrarUso`. `ficha-dados.css` es la misma sección que `ficha-tema.css` más un puente de variables para las fichas viejas que no cargan el tema completo. Dane ya NO tiene tiradas distintas: sus `rollAttack`/`displayRollResult` son envoltorios finos sobre el lanzador.
- `reglas_srd2014_data.js` + `ficha-reglas.js` — compendio de reglas SRD 5.1 (2014) y lógica de estados. Condiciones y agotamiento con efectos legibles por máquina; `FichaReglas.ventaja({categoria, habilidad})`, `efectos()`, `estados()`, `poblarDesplegable(id)`. Estados = casillas `#cond-<id>` + `#exhaustion-level` (mismas claves `datos/cond-*` de siempre). Texto con atribución CC-BY-4.0 (mantenerla).
- Buffs personalizados (`FichaComun.iniciarBuffsPersonales`, `datos/buffs-personales-json`, solo la carcasa única): interruptores propios del personaje con efectos `plano`/`dado`/`ventaja`/`desventaja` sobre un objetivo (incluye `curacion` y `dano` de hechizos) y un `cuando` opcional (`hechizo:{etiqueta|nombre|nivelMin}`, `concentrando`, `pgMitad`, `estado`); el valor puede ser `{de:'nivelClase'|'nivelTotal'|'modificador'|'competencia'}`. `FichaBuffs.plano/dados/tirarDados(obj, ctx)` aceptan el contexto `{hechizo, nivel}`. Los hechizos de `spells_data.js` tienen `etiquetas` (más las propias de cada hechizo, `etiquetasDeHechizo`). Avisar al grupo = notificación `🔔` en `campanas/<c>/tiradas` (nunca modifica otra ficha). Los avisos emergentes de `ficha-dados.js` (`FichaDados.notificar`) cubren tiradas y usos con el panel cerrado.
- `ficha-party.js` + `ficha-party.css` + `party.html` — cada ficha con campaña publica un resumen en `campanas/<c>/party/<personaje>` (PG, CA, concentración, condiciones, clase y nivel; lo escribe solo el dueño o el GM según `database.rules.json`) y muestra el botón 👥 con el estado del grupo. `party.html?campana=<código>` lo muestra en una página.
- `ficha-vitales.js` — vida (daño consume PG temporales primero), dados de golpe, salvaciones de muerte, estados, descansos (largo = SRD: la mitad de los dados de golpe, quita 1 de agotamiento, restablece recursos y espacios) y recursos de clase declarativos (`pips`/`pool`/`info`, con `max` como número o función). Lo usa solo la carcasa única.
- `ficha-nivel.js` — asistente de subida de nivel generado desde `classes_data.js` (multiclase, PG, ASI/dotes, hechizos, deshacer). Nunca se aplica solo; Hannoghar NO sube de nivel hasta que el usuario apruebe el asistente.
- `spells_data.js` — compendio de 348 hechizos (SRD 2014+2024, CC-BY-4.0): `desc` (2014, o 2024 si solo existe ahí), `desc2024` si la mecánica cambió y `edicion` (`'2014'|'2024'|'ambas'`); helpers `descDeHechizo(s, ed)`, `edicionPreferida()` (localStorage `rol-edicion-hechizos`). `classes_data.js` — 12 clases (2024) + `subclases_catalogo.js` (índice de 159 subclases: solo nombres y libros, sin texto protegido). Regla de licencias: solo se copia contenido SRD (CC-BY-4.0, mantener atribución); de libros no-SRD solo nombres/fuente.
- Personajes dinámicos y clases custom (v70.0): `crear-personaje.html`/`.js` + `ficha-generador.js` generan una definición (solo datos) guardada en `campanas/<c>/personajes/pc_*/definicion`; `ficha-shell.js` la lee y la normaliza (`normalizarDefinicion`: todo texto del jugador se escapa; recursos declarativos `{por|tabla|modificador}`). `clases-custom.js` + `creador-clases.html` guardan clases/subclases custom (ids `c_*`; hoy en la biblioteca global, ver abajo) y `ClasesCustom.cargar(db, campana)` las fusiona en `CLASSES`/`PROGRESION_CLASES`. Reglas nuevas en `database.rules.json`: hay que desplegarlas (`firebase deploy --only database`). Nombres/clases/tiradas que escriben jugadores se pintan siempre escapados.
- Importador de Alchemy RPG (JSON) y Fantasy Grounds Unity (XML) (v71.0–72.0): `importar-personaje.html`/`.js` + `ficha-importador.js` (`analizar` detecta el formato; → `form` de `FichaGenerador`, con revisión editable) + `spells_alias_es.js` (alias español → compendio, `nombreHechizoEs`). Crea el mismo `pc_*` que el asistente; lo importado es texto plano.
- Motor de hechizos y daño (v76.0): `ficha-common.js` → `HECHIZOS_REPETIBLES`/`esRepetible(h)` (o `h.repetible`): los hechizos cuyo efecto se repite mientras dura (Insect Plague, Moonbeam, Conjure Animals, `Summon *`…) muestran **✨ Lanzar** (gasta el espacio y concentra) y **🎲 Daño** (tira sin gastar) con `FichaHechizos.usar(idx, 'lanzar'|'tirar')`; los envoltorios de ficha (puente de casillas) deben aceptar ese segundo parámetro. `ficha-shell.js` → `P.danoExtra:[{nombre,icono,dado,texto,grupos}]` (Elemental Fury, etc.): grupo `'ataques'` = botón extra en cada fila de ataque; cualquier otro grupo = botón junto a cada botón de daño dentro de las secciones propias marcadas con `data-danoextra="<grupo>"`. El chip de concentración de la barra fija (`#barra-conc`) lo actualiza `renderConcentracion()` (apagado/encendido con el nombre; tocarlo suelta la concentración). Regla del proyecto: los cambios de comportamiento se hacen en el **motor**, no en la hoja de un personaje.
- Sesión (v77.0): `ficha-sesion.js` (`FichaSesion.esperarUsuario/alUsuario/vigilar/diag`): espera la sesión con 5 s de gracia (un «null» pasajero al cargar ya no expulsa al menú) y registra un diagnóstico local (`rol-auth-diag`, visible en `index.html?diag=1`). Todas las páginas protegidas lo usan. Hosting sirve html/js/css/json con `Cache-Control: no-cache` (`firebase.json`) y `ficha.html`/`ficha-shell.js` agregan `?v=<VERSION_APP>` a los scripts: al cambiar código, subir `VERSION_APP` (ficha-shell.js) y el `?v=` de `ficha.html`.
- Hechizos con cargas propias (v78.0): un recurso `pips` puede declarar `hechizos:['Misty Step','Command']` (mismo orden que sus `ids`) y un hechizo suelto puede traer `recurso:'<id>'`: `FichaVitales.cargasDeHechizo/gastarCarga` + `FichaHechizos.usar` gastan una carga del recurso en vez de un espacio (sin cargas → usa el espacio y lo anota); la fila muestra «✨ nombre n/total». Sirve para Fey-Touched, Magic Initiate, rasgos de especie, etc.
- CA e inventario (v79.0): `ficha-common.js` → `infosDeItem`/`descripcionArmadura` describen cada armadura o escudo del inventario (CA, tope de DEX, Fuerza mínima, desventaja en Sigilo, CA que da con tu DEX) y `calcularCA().texto` desglosa «total = armadura + DEX (tope) + escudo» con avisos. La tabla `ARMADURAS_SRD` es `[nombre, CA, tope DEX, Fuerza mín., Sigilo]`. `ficha-sesion.js` suma sondeo de token cada 5 min y «SESIÓN PERDIDA tras N min» al diagnóstico.
- Biblioteca global de clases y subclases (v85.0/v89.0): las clases y subclases custom viven en `biblioteca/clases_custom/<id>` y `biblioteca/subclases_custom/<id>` (se crean una vez y sirven en todas las campañas; lo antiguo de una campaña se sigue leyendo y la global gana por id). `ClasesCustom.leer/cargar/escuchar` aceptan campaña vacía (solo global); `migrarALaBiblioteca` pasa lo propio. Solo el autor edita o borra una global (un GM puede corregir lo antiguo ajeno en su campaña). El compendio `classes.html` integra el creador (`creador-clases.html?embed=1` en un modal; al cerrarlo recarga lo custom). Las subclases de libros no-SRD se cargan con acceso de administrador (`firebase database:set -f /biblioteca/subclases_custom/<id> …`) con la mecánica condensada en español, no el texto literal. Reglas en `database.rules.json`: hay que desplegarlas.
- Ataques editables (v94.0): `ficha-ataques.js` (`FichaAtaques.iniciar/lista/repintar`) dibuja la tabla de ataques desde `datos/ataques-json` (semilla: `P.ataques`; los ataques de código con funciones/HTML/usos se guardan como referencia `{fija:i}` y no se editan). Se pueden agregar, editar y quitar; el daño escala con el nivel total (`escala`: `truco` = +1 dado en 5/11/17, `shillelagh` = d8→d10→d12→2d6, `tabla` = «nivel: NdX»). En `personajes/<id>.js` un ataque puede traer `escala:'shillelagh'`. El shell tira con `FichaAtaques.lista()`.
- Tablas aleatorias y save de concentración (v97.0): `ficha-tablas.js` (`FichaTablas`) dibuja las `P.tablas` de un personaje (`{id,nombre,icono,dado,nota,previo:{dado,dispara,etiqueta,texto},entradas:[[desde,hasta,'efecto'],…]}`): botón de tirada (d100 muestra 100 como «00»), d20 previo opcional, resultado en el historial/campaña y tabla editable entrada por entrada (`datos/tabla-<id>-json`, semilla = `entradas`). Ulreek lleva la de Wild Magic Surge (efectos resumidos de memoria: el usuario debe confirmarlos con su PHB). El save de concentración (`tirarConcentracion` en el shell) usa como CD la mayor entre 10 y la mitad del último daño recibido (`#ultimo-dano`, lo fija `FichaVitales.recibirDano`; cuenta el daño completo aunque lo absorban PG temporales); `FichaDados.d20({cd})` anota éxito/fallo y si falla se llama `FichaConcentracion.fijar('')`.
- Rasgos propios y biblioteca de rasgos (v102.0): `ficha-rasgos.js` (carga antes de `ficha-plantilla.js`; el módulo es puro al cargarse y `FichaRasgos.iniciar()` lo llama la carcasa). Un rasgo es solo datos: `{id, nombre, icono, origen:{tipo,nombre}, nivel, texto, recurso?:{tipo:'pips'|'pool', max:<declarativo>, recarga:'corto'|'largo'|'ambos'|null}, efectos?:[…mismos efectos de los buffs personalizados…], acciones?:[{texto,roll}]}`; `max` declarativo = número | `{fijo}` | `{por,clase?}` | `{tabla:{nivel:valor},clase?}` | `{modificador,min?,mas?}` | `{competencia:true,mult?}` | `{nivelTotal:true,mult?}`. Los rasgos propios viven en `datos/rasgos-propios-json` (semilla `P.rasgosPropios`, que el generador rellena desde `RASGOS_BASE`), sus recursos entran a `P.recursos` (los usa `ficha-vitales.js`: descansos incluidos) y sus efectos como fuente de buffs. Marcadores en cualquier texto de rasgo o fragmento: `{{mod:WIS}}`, `{{prof}}`, `{{cd:CON}}`, `{{atq:CHA}}`, `{{ini}}`, `{{nivel}}`, `{{nivel:Clase*5}}`, `{{nivel:Rogue/2}}` (se convierten en `<span class="js-calc">`; usar esto en vez de `calculos` o números escritos a mano). Biblioteca: `rasgos_data.js` → `RASGOS_BASE` (solo SRD; los rasgos de libros no-SRD van a `biblioteca/rasgos_custom/<id>` con acceso de administrador, mecánica condensada) y global de los jugadores en `biblioteca/rasgos_custom/<id>` (id `rg_…`; solo el autor edita o borra; reglas: hay que desplegarlas). Para que un personaje nuevo no necesite código: crearlo con el creador (trae los rasgos de su clase, subclase y especie) y completar lo propio con ➕ Crear rasgo / 📚 Biblioteca en la ficha. Pendiente: migrar las 6 fichas de `personajes/*.js` (sus `recursos`, `auras`, `calculos`) a rasgos de la biblioteca con prueba de paridad, después del live test de etreum.
- Pantalla del GM (`index.html`): lee el resumen `campanas/<c>/party/<id>` (PG reales/temp., CA, iniciativa, velocidad, percepción pasiva, concentración, condiciones) con respaldo en `datos/`.
- `ficha-tema.css` + `ficha-paleta.js` — tokens de diseño y 9 paletas (reemplazan el modo día/noche; las fichas viejas todavía lo tienen).

## Carcasa única: `ficha.html?pj=<id>[&campana=<código>]` (URL única elegida por el usuario)

Una sola página para todos los personajes: `ficha-shell.js` (arranque y conexión de motores), `ficha-plantilla.js` (HTML de cada sección con los ids de siempre) y un archivo de datos por personaje `personajes/<id>.js` (forma documentada en la cabecera de `ficha-shell.js`), más fragmentos HTML en `personajes/<id>/*.html` para secciones propias grandes (stat blocks, etc.). Los datos guardados en Firebase siguen valiendo porque la carcasa usa las mismas claves `datos/<id>`. Lo propio de una clase o personaje (Pact Magic, Lay on Hands, criaturas invocadas…) va en `P.recursos`, `P.ganchos` y `P.iniciar(ctx)`, no en los archivos compartidos. `personajes/_*.js` (p. ej. `_demo.js`) son fixtures de prueba y no se publican (`firebase.json` → `ignore`). Desde la v66.0 las URLs viejas (`eldur.html`, …) son redirecciones a la carcasa y la ficha anterior de cada personaje quedó como `<id>_clasico.html` (más el respaldo en `legacy estable/66.0 …/`). Las conversiones se verificaron con una prueba de paridad contra la ficha clásica con datos reales de Firebase (0 diferencias sin explicar). Nevada Jones y chicle no pasaron por la carcasa.

## Arquitectura de cada ficha D&D (patrón compartido por las 6)

Eldur, Hannoghar, Myrklogi, Ulreek, Fiona y Dane comparten el mismo patrón de código (Dane se unificó al resto el 27 ago 2026 — antes tenía autoguardado y nomenclatura propios, ver "Dane: única pieza que sigue siendo distinta" más abajo):

```js
const codigoCampana = urlParams.get('campana');
const PERSONAJE_ID = "eldur";                 // distinto por archivo
const SISTEMA_PERSONAJE_PROPIO = 'dnd';       // 'dnd' o 'coc' — bloquea acceso cruzado entre sistemas
let charRef = null;
// ...
charRef = db.ref(`campanas/${codigoCampana}/personajes/${PERSONAJE_ID}`);
// (o `usuarios/${uid}/personajes/${PERSONAJE_ID}` si no hay campaña)

function guardarCampo(fieldId, value) {
  if (modoLectura) return;
  if (charRef) charRef.child('datos/' + fieldId).set(value);
}

document.addEventListener('input', (e) => {
  if (e.target.matches('input, textarea, select, [contenteditable="true"]')) {
    const val = e.target.type === 'checkbox' ? e.target.checked
      : (e.target.isContentEditable ? e.target.innerText : e.target.value);
    guardarCampo(e.target.id, val);
  }
});
// + listener de 'change' para checkboxes/selects

function sincronizarDatosDesdeNube() {
  charRef.child('datos').on('value', snapshot => {
    // por cada campo guardado, si document.activeElement !== el, pisa el valor local
    // (el guard de activeElement evita corromper lo que el usuario está tipeando/editando)
  });
}
```

Cada valor editable de la ficha (inputs, checkboxes, `contenteditable`) tiene un `id` único que es literalmente la clave bajo `datos/` en Firebase. Al agregar un campo nuevo, alcanza con darle un `id` — el autoguardado y la sincronización lo levantan solos, no hace falta tocar el JS.

**Texto editable sobre prosa (rasgos, hechizos, descripciones):** el patrón es `<div class="editable-text" contenteditable="true" id="txt-...">` — mismo mecanismo de arriba, pero leyendo `.innerText` en vez de `.value`. Cuidado al editar estos bloques a mano: si un bloque tiene contenido HTML propio (listas, `<strong>`, etc.), el cierre del `<div>` tiene que quedar exactamente después del contenido — un `</div>` de menos hace que la siguiente tarjeta quede anidada adentro de la anterior (pasó en la práctica, ver pasada 27.0/28.0 en el log).

## Dane: única pieza que sigue siendo distinta (a propósito)

Desde el 27 ago 2026, `dane.html` comparte con el resto de la flota la misma arquitectura de autoguardado (`guardarCampo`/`input`+`change`/`sincronizarDatosDesdeNube` con `Object.keys`), los mismos nombres de función (`changeInputVal`, `updateHPDisplay`) e ids (`hp-cur`, `hp-temp-input`), y las mismas clases CSS (`btn-roll`/`btn-roll-sm`, `.editable-cnt-val`/`.cnt-max`/`.counter-controls`, `.checkbox-group`/`.check-box-item`, `.ability-table`/`.ab-score`/`.ab-mod`/`.ab-btns`, `★` en skills, `.feature-grid`/`.feature-card`/`<span class="tag">`). Su color de identidad es `--accent-teal` (sí tiene `--accent-gold` definido, igual que el resto — cada ficha solo difiere en su color *propio*, no en el set de variables).

Lo único que sigue siendo distinto, a propósito y de forma disclosed: **el sistema de tiradas de dados.** Dane usa `rollAttack(name, modifier)` / `rollGenericDamage(...)` / `displayRollResult(name, result, calc)`, mientras el resto de la flota usa `rollCheckSave(dado, mod, etiqueta, tipo)` (nótese el orden de argumentos invertido de `displayRollResult` entre ambos). Desde la pasada 41.0 ambos leen el mismo selector único `dice-adv` (Normal/Ventaja/Desventaja) del panel flotante de dados — el viejo widget inline de radio buttons que tenía Dane se eliminó en esa misma pasada. Unificar el resto (los `onclick` con modificadores de combate reales) implicaría reescribir decenas de botones — se dejó fuera por el riesgo, no por descuido; es un pedido aparte si el usuario lo quiere.

Desde la pasada 48.0 (29 ago 2026) tiene botones de Descanso Corto/Largo (☕/🌙) en la barra sticky, igual que el resto de la flota — ya no es un gap.

## Call of Cthulhu: motor propio (desde la v103.0)

Mecánica distinta a D&D (d100 con éxito regular/difícil/extremo, Cordura, Suerte, PV/PM, habilidades en %), así que tiene su propio juego de módulos sobre la misma infraestructura (`ficha-common.js`, `ficha-dados.js`, `ficha-party.js`, `ficha-tema.css`, sesión, membresía):
- `ficha-coc-reglas.js` — reglas puras (niveles de éxito, d100 con dados de bonificación/penalización, derivados, daño de armas, fase de desarrollo, chequeo de Cordura, heridas). **Cambios de reglas se hacen aquí** y se prueban con `unit_coc`.
- `coc_data.js` — características, 46 habilidades con valor base, fórmulas de puntos de ocupación, bandas de edad, armas de ejemplo (valores de referencia; no texto del manual).
- `ficha-coc.html?pj=<id>[&campana=<c>]` → `ficha-coc-shell.js` (carga datos: `personajes-coc/<id>.js` → `window.PERSONAJES_COC[id]`, o la definición `pc_*` con `sistema:'coc'`), `ficha-coc-plantilla.js` (HTML con los ids de siempre: `str…edu`, `luck-curr`, `hp/mp/san-curr|max`, `info-*`, `trasfondo-*`, `equipamiento`, `finanzas`, `notas-personaje`) y `ficha-coc.js` (motor). Listas editables que guarda en `datos/`: `habilidades-json`, `armas-json`, `capacidades-json` (hechizos, dones, objetos con costo PM/Cordura/PV). Un personaje de la ficha anterior declara `legado:{habilidades,armas}` para sembrar esas listas una sola vez desde `skill-val-<n>` / `arma-<n>-*` sin borrar nada.
- Creación: `crear-investigador.html?campana=<c>` + `ficha-coc-generador.js` (puntos de ocupación e interés con topes) → `campanas/<c>/personajes/pc_*` con `sistema:'coc'`. `ficha.html` redirige un `pc_*` de CoC a `ficha-coc.html`; el menú ofrece «Crear investigador» en campañas CoC.
- Biblioteca global `biblioteca/capacidades_custom/<cap_…>` (📤/📚 en la ficha; solo el autor edita o borra; reglas: hay que desplegarlas).
- Nevada Jones: `personajes-coc/nevada_jones.js` (generado desde su HTML; paridad comprobada en la v103.0); `nevada_jones.html` es una redirección y la ficha vieja quedó como `nevada_jones_clasico.html`. `SISTEMA_PERSONAJE_PROPIO = 'coc'` / la campaña con `sistema:'coc'` impide mezclarla con una campaña de D&D. Los valores sugeridos (PV, PM, Cordura, MOV) son solo sugerencias: `hp-max`, `mp-max` y `san-max` son campos manuales (regla de mesa).

## Estándar visual/mecánico unificado (las 6 fichas D&D)

Estas piezas de CSS/HTML se repiten idénticas en Eldur, Hannoghar, Myrklogi, Ulreek, Dane y Fiona (Fiona mantiene su propia numeración de 9 secciones en vez del reorden que sí se aplicó a las otras 5 — fue una decisión explícita del usuario, no un olvido):

- `.ability-table` — tabla de atributos compacta con Check y Save como botones separados (`btn-roll-sm`).
- `.skills-grid` / `.skill-item` — skills en grilla de 2 columnas, con `★` para las que tienen proficiency.
- HP como `<input type="number" class="editable-cnt-val">` con botones +/-, sin fila/botón "Set" separado.
- `.feature-grid` / `.feature-card` — tarjetas de rasgos de clase/raza/feats, con `<span class="tag">` como categoría.
- Salvaciones de muerte (`💀`) como tracker-card con 3 checkboxes de éxito + 3 de fallo, debajo del tracker de HP.
- Sticky nav con botones de acceso directo por sección (⚔️📜🐾🎒📖📝 etc.).
- Sección de Trasfondo/Personalidad con 5 `<textarea>` (Historia, Personalidad, Ideales, Vínculos, Defectos) en las fichas que no traían trasfondo real cargado (Hannoghar, Myrklogi, Dane, Fiona).

**Antes de reusar una variable CSS (`--accent-gold`, `--heal-color`, etc.) en una ficha, verificar con `grep` que esa ficha la define** — no todas las 6 tienen el mismo set de variables (ver tabla en el historial, `legacy estable/log.md`, pasadas 22.0 en adelante).

## Firebase: estructura de datos y reglas

- Una sola base compartida: `personajes-rol-default-rtdb`.
- `campanas/{campanaId}/personajes/{personajeId}/datos/{fieldId}` — datos de cada ficha.
- `campanas/{campanaId}/personajes/{personajeId}/owner` — uid del dueño; se asigna la primera vez que alguien "reclama" el personaje (no se puede pisar el owner de otro).
- **MEMBRESÍA (v99.0):** `campanas/{c}/miembros/<uid> = {nombre, desde}`; las reglas solo dejan leer/escribir `campanas/<c>` a los integrantes (`ficha-shell.js` también lo comprueba y avisa). Los secretos viven FUERA de ese árbol, en `acceso/{c}/`: `gm_hash` (sin lectura), `gm_claim/<uid>`, `invitaciones/<token> = {expira, por}` (solo GM/apoyo), `canjes/<uid>` (token que presenta quien se une), `solicitudes/<uid> = {nombre, ts}` (entrar por id; el GM aprueba escribiendo `miembros/<uid>` + `usuarios/<uid>/campanas/<c>`), `notas_gm` (solo GM). `lista_campanas/{c}/{creador,nombre,sistema}` se lee por id pero NO se puede enumerar (la raíz no tiene `.read`; id `^[a-z0-9_-]{3,40}$`). `usuarios/<uid>/campanas/<c> = true` = «mis campañas» (el menú lista desde ahí). Crear campaña = escrituras secuenciales (creador → sistema → nombre → miembro → gm → índice), no un update multi-ruta (las reglas se evalúan contra la raíz previa). El titular no puede salir sin soltar el puesto; GM/apoyo pueden quitar integrantes menos al titular. Para dar acceso a mano: `firebase database:set /campanas/<c>/miembros/<uid> …` y el índice del usuario.
- **PERFIL Y DIRECTORIO (v100.0):** `usuarios/<uid>/perfil = {nombre, visible}` (nombre de usuario editable; por defecto el de Google o la parte del correo antes de la @). `directorio/<uid> = {nombre, nombre_lc, campanas:{<id>:'gm'|'jugador'}}` lo lee cualquier cuenta con sesión (`.indexOn nombre_lc`, minúsculas sin tildes) y lo escribe solo su dueño, que solo puede listar campañas donde es integrante (rol `gm` solo si es titular/apoyo); el GM/apoyo puede borrar la entrada de campaña de un integrante al sacarlo. Lo usa el buscador de «Unirme» (búsqueda por prefijo del nombre, «Pedir acceso» = solicitud normal). `index.html` mantiene al día `miembros/<uid>/nombre`, `ownerNombre` y el directorio (`sincronizarDirectorio`).
- **CAMPAÑAS PRIVADAS (v101.0):** `lista_campanas/{c}/privada` (booleano, opcional; ausente = pública). Privada = solo por invitación (las reglas rechazan `acceso/<c>/solicitudes/<uid>` nuevas de quien no es GM) y fuera del buscador (no se puede listar en `directorio/<uid>/campanas`; el GM borra esas entradas al activarla). La cambian el GM titular o el apoyo desde el panel de acceso.
- `campanas/{campanaId}/gm_apoyo/<uid> = true` — GM DE APOYO (v98.0): dos jerarquías. El GM titular (`gm`) lo agrega o quita desde su panel del menú («🤝 GM de apoyo», candidatos = dueños de personajes, con `ownerNombre`); el apoyo tiene las facultades de GM (fichas, grupo, sistema, clases antiguas de la campaña) pero no puede compartir ni quitar el rol, ni tocar `gm`/`gm_hash`/`gm_salt`; puede quitarse a sí mismo. Al soltar el puesto el titular borra también `gm_apoyo`. Los clientes comprueban `gm === uid || gm_apoyo/<uid> === true`.
- `campanas/{campanaId}/gm` — GM de la campaña. Desde la v95.0 la clave de GM NO está en texto plano: `gm_salt` (pública) + `gm_hash` (desde la v99.0 en `acceso/<c>/gm_hash`; PBKDF2-SHA256, 200 000 vueltas; ilegible desde el cliente). Para reclamar el puesto vacante cada usuario escribe su hash en `acceso/<c>/gm_claim/<uid>` y las reglas del nodo `gm` lo comparan con `gm_hash`. `gm_password` quedó obsoleto (solo el GM puede borrarlo). Para fijar o cambiar la clave a mano: `crypto.pbkdf2Sync(clave, sal, 200000, 32, 'sha256').toString('hex')` y `firebase database:set -f /campanas/<c>/gm_salt` y `/acceso/<c>/gm_hash`.
- `campanas/{campanaId}/bitacora`, `/tiradas` — bitácora de sesión y log de tiradas, lectura/escritura abierta a cualquier autenticado.
- `lista_campanas/{campanaId}/sistema` — `'dnd'` o `'coc'`, usado por `index.html` y por `SISTEMA_PERSONAJE_PROPIO` en cada ficha para no mezclar personajes de sistemas distintos en la misma campaña.

**⚠️ `database.rules.json` (antes `public/db_rules.txt`) no se publica solo — cambiar el archivo no alcanza, hay que desplegarlo.** Esto ya causó un bug real (ver `log.md`, versión 14.1): las reglas se cambiaron en el archivo pero nunca se publicaron, así que el fix parecía no funcionar.

Desde el 27 ago 2026 el entorno de Claude Code tiene `firebase-tools` instalado y autenticado con acceso confirmado al proyecto `personajes-rol` — `firebase deploy --only database` desde `pjs/app/` funciona y reemplaza el paso manual de pegar las reglas en Firebase Console. Mismo mecanismo para el resto del sitio: `firebase deploy --only hosting` publica `public/` (el sitio real que ven los jugadores) — esto es un paso aparte de subir a git/GitHub, que solo versiona el código y no toca el sitio en vivo. Desde el 20 oct 2026 el usuario autorizó desplegar `hosting` automáticamente tras los **ajustes menores** (verificados con las suites y commiteados); los cambios grandes o riesgosos (reglas de la base de datos, migraciones de datos, subidas de nivel, cambios que borran datos) se siguen consultando antes de desplegar.

## Cómo se hacen los cambios en este proyecto (convención establecida)

1. **Verificar antes de tocar nada**: para archivos grandes con `<script>` embebido, extraer el script y correr `node --check` sobre él; contar balance de tags (`<div>`, `<details>`, `<table>`, `<textarea>`, `<style>`) antes y después del cambio. El conteo de tags por regex puede no detectar anidados incorrectos (un navegador auto-cierra tags huérfanos) — para cambios que tocan estructura de `<div>` alrededor de contenido existente, conviene además parsear con algo como `lxml.html` y chequear que los elementos no queden anidados entre sí inesperadamente.
2. **Editar con regex dirigido, no reparseo completo**: estos archivos son grandes y frágiles (HTML + CSS + JS todo junto). Prefirió siempre ediciones quirúrgicas (`sed`/regex Python apuntado, o `Edit` con contexto único) antes que reescribir el archivo entero con un parser HTML — reserializar todo el documento arriesga romper el `<script>` embebido.
3. **Respaldar antes de desplegar**: copiar la versión previa a `public/legacy estable/N.0 <descripción> <fecha>/` (una carpeta nueva por cambio, numeración incremental, `N.1` si es una sub-pasada del mismo día).
4. **Desplegar**: sobrescribir el archivo directo en `public/`.
5. **Documentar en `public/legacy estable/log.md`**: una entrada nueva por versión, con evidencia concreta (tamaño de archivo, qué cambió y por qué), siguiendo el mismo tono narrativo que las entradas existentes.
6. **Nunca "corregir" datos reales de un personaje sin confirmar con el usuario primero** (HP, stats, rasgos) — una diferencia de 1-2 puntos contra un cálculo teórico es variación normal de dados tirados a mano, no un bug.

## Dónde está el resto del historial

- `public/legacy estable/log.md` — historial versión por versión (1.0 a la fecha), con evidencia de tamaño de archivo por carpeta de respaldo.
- `bugs-fixes-pendientes.md` (raíz del proyecto) — lista viva de pendientes que el usuario edita directamente; es la fuente de verdad de "qué falta" en el día a día.
- Hay además un historial de trabajo mucho más detallado (decisiones, diagnósticos paso a paso, código exacto de cada cambio) guardado en un Proyecto de Claude del usuario ("app rol", doc `unificacion-codigo-fichas-2026-08-25.md`) — ese documento no es accesible desde Claude Code; si hace falta un dato puntual de una pasada vieja que no esté en `log.md`, preguntale al usuario o pedile que lo exporte.

## Personajes activos

D&D: Fiona Faraway (Druid 8, Circle of Shepherd), Eldur Redmane (Monk 5/Cleric 2, Light), Hannoghar (Paladin 7, Oath of Watchers), Myrklogi Mangarisonn (Wizard 9, Chronurgy — raza custom "Human like", sin raciales, con feat inicial en su lugar), Ulreek (Sorcerer 7/Warlock 1), Dane (Ranger 5/Rogue 4, Gloom Stalker/Assassin).
Call of Cthulhu: Nevada Jones (Profesor de Arqueología), campaña "the society" (ficha `ficha-coc.html?pj=nevada_jones`).

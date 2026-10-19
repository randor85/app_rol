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
    ├── fiona_faraway.html, eldur.html, hannoghar.html, myrklogi_mangarisonn.html,
    │   ulreek.html, dane.html   ← 6 fichas de D&D
    ├── nevada_jones.html       ← 1 ficha de Call of Cthulhu (arquitectura de juego distinta, ver abajo)
    ├── legacy estable/         ← respaldos versionados (ver "Respaldos e historial")
    ├── estable provisorio/     ← snapshots puntuales más antiguos, menos relevantes
    └── trabajo en progreso/    ← borradores viejos descartados, no tocar salvo que el usuario lo pida
```

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
- `ficha-party.js` + `ficha-party.css` + `party.html` — cada ficha con campaña publica un resumen en `campanas/<c>/party/<personaje>` (PG, CA, concentración, condiciones, clase y nivel; lo escribe solo el dueño o el GM según `database.rules.json`) y muestra el botón 👥 con el estado del grupo. `party.html?campana=<código>` lo muestra en una página.
- `ficha-vitales.js` — vida (daño consume PG temporales primero), dados de golpe, salvaciones de muerte, estados, descansos (largo = SRD: la mitad de los dados de golpe, quita 1 de agotamiento, restablece recursos y espacios) y recursos de clase declarativos (`pips`/`pool`/`info`, con `max` como número o función). Lo usa solo la carcasa única.
- `ficha-nivel.js` — asistente de subida de nivel generado desde `classes_data.js` (multiclase, PG, ASI/dotes, hechizos, deshacer). Nunca se aplica solo; Hannoghar NO sube de nivel hasta que el usuario apruebe el asistente.
- `ficha-tema.css` + `ficha-paleta.js` — tokens de diseño y 9 paletas (reemplazan el modo día/noche; las fichas viejas todavía lo tienen).

## Carcasa única: `ficha.html?pj=<id>[&campana=<código>]` (URL única elegida por el usuario)

Una sola página para todos los personajes: `ficha-shell.js` (arranque y conexión de motores), `ficha-plantilla.js` (HTML de cada sección con los ids de siempre) y un archivo de datos por personaje `personajes/<id>.js` (forma documentada en la cabecera de `ficha-shell.js`), más fragmentos HTML en `personajes/<id>/*.html` para secciones propias grandes (stat blocks, etc.). Los datos guardados en Firebase siguen valiendo porque la carcasa usa las mismas claves `datos/<id>`. Lo propio de una clase o personaje (Pact Magic, Lay on Hands, criaturas invocadas…) va en `P.recursos`, `P.ganchos` y `P.iniciar(ctx)`, no en los archivos compartidos. `personajes/_*.js` (p. ej. `_demo.js`) son fixtures de prueba y no se publican (`firebase.json` → `ignore`). Las URLs viejas (`eldur.html`, …) se reemplazan por stubs de redirección SOLO cuando la paridad de ese personaje contra la ficha viva está verificada; la ficha vieja queda como respaldo en `legacy estable/`.

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

## Nevada Jones: Call of Cthulhu, mecánica completamente distinta

No comparte nada del sistema de D&D (sin spell slots, sin clases/razas, sin HP por dado de golpe). Usa su propio motor de tiradas (`rollSkill`, `logRoll`, `updateStats`), Cordura (SAN) en vez de maná, y botones "⚡ Usar"/"🔹 Usar" por habilidad. `SISTEMA_PERSONAJE_PROPIO = 'coc'` es lo que impide mezclarlo con una campaña de D&D.

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
- `campanas/{campanaId}/gm` / `gm_password` — GM de la campaña, mismo patrón de "primera escritura reclama".
- `campanas/{campanaId}/bitacora`, `/tiradas` — bitácora de sesión y log de tiradas, lectura/escritura abierta a cualquier autenticado.
- `lista_campanas/{campanaId}/sistema` — `'dnd'` o `'coc'`, usado por `index.html` y por `SISTEMA_PERSONAJE_PROPIO` en cada ficha para no mezclar personajes de sistemas distintos en la misma campaña.

**⚠️ `database.rules.json` (antes `public/db_rules.txt`) no se publica solo — cambiar el archivo no alcanza, hay que desplegarlo.** Esto ya causó un bug real (ver `log.md`, versión 14.1): las reglas se cambiaron en el archivo pero nunca se publicaron, así que el fix parecía no funcionar.

Desde el 27 ago 2026 el entorno de Claude Code tiene `firebase-tools` instalado y autenticado con acceso confirmado al proyecto `personajes-rol` — `firebase deploy --only database` desde `pjs/app/` funciona y reemplaza el paso manual de pegar las reglas en Firebase Console. Mismo mecanismo para el resto del sitio: `firebase deploy --only hosting` publica `public/` (el sitio real que ven los jugadores) — esto es un paso aparte de subir a git/GitHub, que solo versiona el código y no toca el sitio en vivo. El usuario prefiere pedir el deploy explícitamente en cada caso en vez de que se corra automático tras cada edición.

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
Call of Cthulhu: Nevada Jones (Profesor de Arqueología), campaña "the society".

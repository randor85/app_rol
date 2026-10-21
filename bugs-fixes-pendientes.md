Actualizado el 21 oct 2026 (versión de aplicación 103.1). Lo ya resuelto está al final, en «Hecho».

-------------general-------

* fix: copiar fichas de todos los personajes en standalone para enviar y revisar sin logueos ni integracion a firebase
* update: live test de etreum — a la espera de los bugs que reporten los jugadores en sus fichas
* bug (abierto): caidas de sesion (P7) — hay diagnostico local (index.html?diag=1); sin reportes recientes. Opcional: pedir al navegador almacenamiento persistente (navigator.storage.persist())
* feature: migrar las 6 fichas de personajes/*.js (recursos, auras, calculos) a rasgos de la biblioteca, con prueba de paridad — despues del live test de etreum
* update: chicle sigue con su ficha propia (no pasa por ninguna carcasa)
* fix: 3 pruebas automaticas que ya fallaban antes (test_cargas: 1, clasescustom: 2) — revisar si son la prueba o el codigo

----------D&D-----------

* update: Hannoghar NO sube de nivel hasta que apruebes el asistente de subida de nivel
* update: confirmar la tabla de Wild Magic Surge de Ulreek contra tu PHB (efectos resumidos de memoria)
* feature: libreria de items y bestiario (spells y clases ya estan: compendios + bibliotecas globales)
* feature: mas subclases de libros no-SRD en la biblioteca global (se cargan con acceso de administrador, mecanica condensada)

---------etreum----------

* update: actualizar myrk a lvl 10, a la espera de json de david
* update: a la espera del patron de ulreek y su spell list (confirmar si ya estan cargados)
* bug: ficha de ulreek no esta cargando en firebase — confirmar que ya funciona (migrada a la carcasa unica desde v66.0)

----------CoC----------------

* update: probar en vivo la ficha de Cthulhu (ficha-coc.html) y el creador de investigadores con los jugadores
* update: confirmar los valores de Nevada Jones tras la migracion (PV 10, Cordura 57, PM 50, Suerte)

--------- the society---------

* update: solicitar y agregar fichas de resto de jugadores (ahora pueden crearlas con «Crear investigador» en el menu)

---------- Hecho (ya no es pendiente) ----------

* tirada de salvacion de muerte con texto claro en el historial (v36.0); textos de usos de habilidades sin «sacó un 🎲» (v44.0 y posteriores)
* base de datos de hechizos y clases (SRD 2014/2024), creador de personajes, importadores Alchemy y Fantasy Grounds, clases/subclases/rasgos custom globales (v67.0–72.0, 85.0–89.0, 102.0)
* creador de campañas con membresia, invitaciones, campañas privadas, buscador por jugador y GM de apoyo (v98.0–101.0), tanto D&D como Cthulhu
* mecanismos de creacion de personajes de Cthulhu con biblioteca global de capacidades (v103.0)
* spell slots de Ulreek unificados con el resto (v32.0 y ficha-common); Wild Magic Surge de Ulreek (v97.0); tradicion monastica de Eldur: Sun Soul (v88.0)
* Muldar, Sporium y Luciane dados de baja (v71.0)


soy principiante en código, tengo nociones de python hace mucho tiempo, olvide casi todo, pero quiero que me asistas en implementar la solucion descrita en las instrucciones, primero quiero saber si es mejor trabajar en code o cowork, que modelo es el mas optimo para no consumir toda la cuota sin perder calidad en los resultados , que me guíes en lo poco avanzado con otra ia para desarrollar el proyecto

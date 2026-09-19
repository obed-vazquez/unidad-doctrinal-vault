# Pipeline de datos y suite de pruebas

Bitácora de lo que le pasa al **camino que va del documento fuente al visor** (`scripts/convertir_posturas_creencias.py` → `datos/posturas-creencias.json`) y a la **suite de comprobación sin navegador** (`prueba-modelo.js`). No es una funcionalidad del visor: son los cimientos de los que dependen todas las vistas, así que sus fallos aparecen como síntomas en cualquier parte y conviene tenerlos juntos.

## Poner la suite de pruebas en verde (2026-09-17)

`prueba-modelo.js` llevaba tiempo fallando (19 comprobaciones). Al revisarlas resultaron ser cuatro causas distintas, y una de ellas era un bug que afectaba a la aplicación, no solo a la prueba.

### Bug del convertidor: un guion partía una postura en dos

`recursos/posturas-creencias.md` introduce la postura como **`Encarnacionismo / Preexistencialismo`** (línea 102) y más abajo la vuelve a nombrar como **`Encarnacionismo / Pre-existencialismo`** (línea 194, con guion). El convertidor las trataba como dos posturas distintas, creaba una fantasma y **desconectaba de la raíz toda la rama de cristología**: 15 posturas y 7 preguntas, incluidas Nestorianismo, Ortodoxia calcedonense y el wikilink de Diotelitismo. No se podía llegar a ellas navegando el árbol.

**El arreglo va en el convertidor, no en el documento.** `normalize_name` ya era deliberadamente tolerante al reconocer una postura ya introducida: ignora mayúsculas y espacios, y `alias_keys` acepta además el nombre sin `{grupos}` y cada parte separada por `/` (su propio comentario dice «nombres con los que una postura puede volver a referenciarse»). Quien vuelve a nombrar una postura más abajo no tiene por qué repetir su ortografía exacta — el guion interno faltaba en esa lista y ahora también se ignora (solo entre letras: los guiones sueltos separan, no unen). Se comprobó que en el documento actual ninguna postura colisiona con otra al ignorar el guion.

Regenerado el JSON, las posturas inalcanzables pasan de 15 a 0 y los cruces de flechas bajan de 47 a 6 en el peor caso.

> **Criterio para la próxima vez:** si el pipeline o una prueba tropiezan con algo que está escrito en `posturas-creencias.md`, el arreglo va en la herramienta. El documento es contenido de autor, no una entrada que deba amoldarse al convertidor.

Nota: el convertidor **sí avisaba** («se creó la postura X sin una respuesta previa»); se comprobó con un documento sintético que la advertencia existe y funciona. Pasó desapercibida entre el resto de la salida, no por falta de la comprobación.

### Bug de código: el enlace compartible perdía «árbol completo»

`js/router.js` escribía `full=1` cuando `arbolCompleto` era true, pero al leer daba prioridad a `rec`: con `rec=indagatorio` deducía `arbolCompleto = (divulgacion === 'completo')` → `false`, ignorando el `full=1` que venía en la misma URL. La combinación «árbol completo desplegado dentro de otro recorrido» no sobrevivía a la ida y vuelta. Ahora `full`, cuando viene, manda.

### Pruebas fosilizadas

Diez comprobaciones fijaban a mano valores del dataset (conteos de tradiciones, ids de postura, nombres como «Catolicismo» o «Gracia Irresistible») que el documento fue cambiando. Se reescribieron para **derivar esos valores del dataset vigente**, como ya hacían otras pruebas de la misma suite, de modo que crecer el documento no vuelva a romperlas. Una de ellas además dependía del `Estado.divulgacion` que dejara un bloque anterior; ahora lo fija explícitamente.

El criterio general para esta suite: **derivar del dataset, no fijar constantes**. Una prueba que nombra un id o un conteo concreto caduca en cuanto el documento crece.

### Deuda de layout (no resuelta, acotada)

Con los datos ya corregidos quedan **1 cruce** de flechas en «árbol completo» y **6** al expandir rama a rama. No es una prueba desactualizada: es el límite del algoritmo de reducción de cruces (`reducirCruces`, Sugiyama con barycentro e intercambios locales) con el árbol actual. Las dos comprobaciones se convirtieron en **techo de regresión** (`TECHO_CRUCES_COMPLETO`, `TECHO_CRUCES_EXPANDIR`): fallan si el número empeora, y dejan constancia de que bajarlo a cero es trabajo de layout pendiente.

La razón de preferir el techo a dejarlas en rojo: una suite permanentemente roja es justo cómo estas 19 comprobaciones pasaron meses sin que nadie las mirara. El riesgo del techo es que alguien lo suba en vez de arreglar el layout, y por eso el número va en el nombre de la prueba, a la vista.

## Preguntas con documento de análisis (2026-09-19)

Tres bugs distintos que se manifestaban juntos en la línea del Modalismo, y que compartían una causa de fondo: el convertidor daba por hecho que una línea `->` terminaba donde él esperaba.

### La versión coloquial se perdía si la línea llevaba `{ [[wikilink]] }`

`split_colloquial_question` buscaba el paréntesis coloquial anclado al final de la línea (`(\?)\s+\(([^()]+)\)\s*$`). Pero el `{ [[documento.md]] }` va **después** del paréntesis, así que en esas líneas el patrón no casaba nunca: `colloquial_hint` quedaba en `null` y la pregunta coloquial se quedaba dentro del texto formal, visible como un paréntesis largo en el visor.

Afectaba a las tres preguntas del árbol que tienen documento de análisis y versión coloquial: Monergismo, tipos de inspiración bíblica y Modalismo. Ahora el bloque `{…}` se aparta antes de buscar el paréntesis y se devuelve pegado a la pregunta formal (el JSON ya lo limpia con `strip_groups`). De paso se admiten **varios paréntesis coloquiales seguidos**, que es el caso de la pregunta de inspiración plenaria: `(¿Toda la Biblia ha sido inspirada?) (¿Cada parte de la Biblia fue inspirada?)`.

Se conserva el guardarraíl de no separar si lo que queda delante no termina en `?`: así `Invocar el nombre de Dios (pedir ayuda)` sigue siendo parte de la redacción y no se confunde con una glosa.

### `[[Modalismo.md]]` no resolvía a `Modalismo.md`

`resolve_note_path` añadía `.md` al destino del wikilink sin mirar si ya lo traía, y terminaba buscando `Modalismo.md.md`. El enlace salía con `"href": null` y el visor caía al fallback de mostrar el texto crudo `[[Modalismo.md]]` en vez de la tarjeta del documento. Los wikilinks escritos sin extensión siempre funcionaron, de ahí que el fallo pareciera aleatorio.

Obsidian resuelve igual `[[Modalismo]]` que `[[Modalismo.md]]`; el convertidor ahora también. Los 6 wikilinks del árbol resuelven (antes 3 rotos) y las notas embebidas en `notas.cache.js` pasan de 12 a 21, porque el caché ya alcanza esos documentos y los que ellos enlazan.

### La exportación reescribía la ortografía del autor

La propuesta Markdown del Modo de Edición emitía el origen de cada `->` con el **nombre canónico** de la postura, que es el de la arista que la introdujo. Como `normalize_name` ignora el guion interno a propósito (ver el bug de 2026-09-17, más arriba), `Encarnacionismo / Pre-existencialismo` de la línea 202 se exportaba como `Encarnacionismo / Preexistencialismo`: un diff falso contra el documento fuente, provocado por la misma tolerancia que mantiene la rama conectada.

La tolerancia sirve para **reconocer** la postura, no para reescribir al autor. El JSON de cada pregunta lleva ahora `origin_labels` — los nombres de origen tal como los escribió esa línea, que el convertidor ya tenía en `posture_hints` — y `aMarkdown` prefiere el que coincida con la postura ignorando el guion. Si el nombre se cambió desde el editor ya no coincide ninguna etiqueta y gana el nombre nuevo, que es lo que se quiere.

## Convergencias que citan una postura de más abajo (2026-09-19)

Al agregar la convergencia `Inspiracionalismo Plenario & Inspiracionalismo Verbal & Inspiracionalismo Orgánico / Concursal / Confluente -> ¿…?`, el convertidor avisaba dos veces («se creó la postura X sin una respuesta previa») y el JSON salía con **120 posturas en vez de 118**: `Inspiracionalismo Verbal` y `Inspiracionalismo Orgánico / Concursal / Confluente` duplicadas, y la convergencia colgando de las copias vacías en vez de las reales.

La línea venía de la propuesta que exporta el visor, así que el fallo era de ida y de vuelta. Se arregló en los dos extremos.

### El convertidor resuelve los orígenes en una segunda pasada

`nearest_matching_posture` solo veía las posturas ya introducidas, porque el documento se lee de arriba abajo. Una convergencia puede nombrar legítimamente una postura que aparece más abajo: no es un error del documento, es el orden en que quedó escrito.

Los orígenes que no resuelven ya no fabrican una postura fantasma al vuelo: se apuntan en `pending_origins` y se reintentan en `resolve_pending_origins`, con el documento entero leído. Solo si siguen sin resolver se crea la postura y se avisa — la advertencia conserva su sentido original, que era señalar un nombre que no existe en ninguna parte. La decisión de si una pregunta es raíz también se aplaza, para no marcar como raíz una que sí tenía origen, solo que más abajo.

### La exportación coloca la convergencia bajo su ÚLTIMO origen

`aMarkdown` emitía la pregunta compartida bajo el **primero** de sus orígenes (`origenCanónico`), que es justo el caso que el convertidor no podía leer. Ahora lleva un registro de posturas ya escritas y emite cada eje solo cuando **todos** sus orígenes están puestos, de modo que la convergencia cae bajo el último. Es lo que el documento ya hacía a mano: la de la línea 103 cuelga de `Encarnacionismo / Preexistencialismo`, que es posterior a `Subordinacionismo`.

Como red de seguridad, al terminar el recorrido se emiten las preguntas que hayan quedado sin escribir (un origen inalcanzable desde la raíz nunca cumpliría la condición) bajo el primero de sus orígenes que sí se escribió: la propuesta no puede salir con menos preguntas de las que entraron.

**Comprobación de ida y vuelta:** exportada la propuesta y vuelta a pasar por el convertidor, ambos modelos dan 59 preguntas y 118 posturas, cero advertencias, y los textos de pregunta coinciden carácter a carácter.

### Otra prueba fosilizada

`comprobar('dos nodos con varias aristas entrantes', convergentes.length === 2, …)` fijaba el número de convergencias del documento. Con la tercera, fallaba. Se deriva ahora de `is_convergence` en el dataset, según el criterio ya establecido arriba: la prueba comprueba que **cada convergencia del dataset** es un nodo con varias aristas entrantes, y crece con el documento.

Con esto la suite queda entera en verde. Las dos comprobaciones de cruces de layout —las que quedaron como techo de regresión— también pasan: al resolverse las posturas duplicadas, la rama dejó de estar desconectada.

## El inglés cortaba las preguntas largas (2026-09-19)

`traducir_remoto` mandaba a MyMemory `texto.strip()[:450]` y **cacheaba el pedazo como si fuera la traducción entera**. La pregunta de las hipóstasis (679 caracteres) quedaba cortada a media frase —`…that is, the`— y así se mostraba en el visor en inglés, sin ningún aviso.

### El límite existe: mandarla entera no es opción

Se comprobó contra la API. Con los 679 caracteres de esa pregunta responde **403**: `QUERY LENGTH LIMIT EXCEEDED. MAX ALLOWED QUERY : 500 CHARS`. Son **caracteres, no bytes**: 490 caracteres acentuados (532 bytes) pasan sin problema. `LIMITE_CONSULTA = 490` deja un margen pequeño; un texto que quepa entero se manda entero y no se parte nada.

### Dónde se corta importa, y no es donde parecía

El primer intento cortaba en el **último** separador que entrara en el límite. Con ese criterio la pregunta quedaba partida en `…la misma hipóstasis (sujeto personal),` + `Jesucristo, es quien perdona pecados y quien muere…?`, y MyMemory devolvía el segundo trozo como **`Is it Jesus Christ who forgives sins and who dies…?`**: una pregunta inventada dentro de la pregunta. Una pieza final corta la lee el traductor como una frase independiente.

Se probaron los cinco cortes viables de esa frase contra la API. Los tres primeros salen limpios; el último —el que elegía el criterio original— es el único que se rompe. Así que `trozos()` busca el separador **más fuerte** que haya (punto, punto y coma, coma, espacio) y, dentro de esa clase, el más cercano al **reparto parejo**, no el más tardío: piezas parejas, ninguna queda como un fragmento suelto.

Si una pieza falla, no se cachea nada y se deja el español: media frase traducida es peor que ninguna.

Se purgaron las entradas ya envenenadas de `traducciones-en.cache.json` para que se retradujeran enteras. La de las hipóstasis pasa de 444 a 687 caracteres, la costura no se nota (`…that is, the same hypostasis (personal subject), Jesus Christ, is the one who forgives sins…`) y termina donde debe.

> **Cómo se detecta esto:** una traducción mucho más corta que su original. Un barrido de la caché buscando `len(en) < len(es) * 0.6` en textos de más de 120 caracteres no devuelve ninguna otra.

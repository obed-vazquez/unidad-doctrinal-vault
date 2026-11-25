# Cuestionario: respuestas por inclinación y avisos sobre preguntas

## Petición

1. Además de responder con certeza, que el usuario pueda decir que **se inclina** hacia una respuesta, y que eso afecte al reporte final. No todas las preguntas son Sí/No (algunas tienen glosas o más de dos respuestas), así que la inclinación debe funcionar con cualquier respuesta.
2. En cada pregunta, una opción para decir que **tiene un problema con la pregunta** (fraseo, orden, ambigüedad) y poder hacérnoslo llegar. Preferencia: que los avisos terminen ordenados en una hoja de cálculo de Google (vía Google Forms), no en correos.

## Preguntas y respuestas

- **¿Cómo se marca la inclinación?** Ni un interruptor «Respondo con reservas» ni botones «Más bien sí / Más bien no». Junto a cada respuesta, a su izquierda, un botón **«Me inclino a»** visualmente ligado a ella; al pulsarlo se elige esa respuesta como inclinación. La respuesta normal queda como la opción firme y la inclinación, más sutil. Libertad de diseño.
- **¿Qué muestra el reporte?** Firmeza por postura, qué leer para decidir, peso 0,5 de las respuestas inclinadas en la coincidencia con tradiciones, y una sección con la postura alternativa (libertad para definirla).
- **¿Cómo llega el aviso?** Google Form prerrellenado que alimenta una hoja de cálculo; lo crea Claude. Antes de mandar al formulario se recuerda que existe el Modo de Edición, donde se puede proponer el cambio concreto a la pregunta.

## Decisiones tomadas al implementar

### Inclinación
- Cada respuesta se pinta como un par `.quiz-par`: pestaña `.quiz-inclino` («≈ Me inclino a», borde discontinuo, tono dorado al pasar) pegada a la izquierda del botón `.quiz-opcion`. Al pasar sobre la pestaña se ilumina también la respuesta. Un clic responde y avanza, igual que la respuesta firme.
- Estado: `Estado.inclinaciones = { Q1: true }`, persistido en localStorage. `Estado.responder(qid, clave, inclinado)`; responder sin el tercer argumento (desde el árbol o con el botón firme) deja la respuesta como firme. `esInclinada(qid)` solo cuenta si la pregunta sigue respondida (la poda de ramas borra respuestas sin pasar por las inclinaciones).
- No viaja en la URL: el enlace compartido reproduce el recorrido, no el grado de certeza.

### Reporte
- **Firmeza** (en cada postura específica): «N de M respuestas del recorrido fueron firmes», con barra; dorada si hubo inclinaciones. Se cuentan las preguntas respondidas en los ancestros de la postura dentro del camino elegido.
- **Tus puntos de duda** (sección nueva, solo si hubo inclinaciones): por cada pregunta respondida con inclinación, la respuesta elegida; para cada otra respuesta, a qué postura habría llevado (la **postura alternativa**: el vecino doctrinal más cercano a la postura alcanzada), con botón para explorarla si tiene nombre; los documentos de análisis de la pregunta («Para decidir»); y «Reconsiderar esta pregunta», que borra esa respuesta (y la rama que colgaba de ella) y vuelve al cuestionario en esa pregunta.
- **Coincidencia con tradiciones:** una respuesta inclinada que coincide suma 0,5 en vez de 1 (`PESO_INCLINADA`). El umbral de «al menos 2 coincidencias» se mantiene sobre la suma ponderada.
- En «Relación» de cada ficha, una llegada por inclinación dice «Te inclinaste por…» en vez de «Respondiste…».

### Aviso de problema con la pregunta
- No es una respuesta: es un enlace discreto bajo las respuestas, «¿Tienes un problema con esta pregunta?», para que el usuario pueda avisar y seguir respondiendo (para saltarla ya existe «No responder»).
- Al abrirlo, un panel explica las dos vías: **Proponer un cambio en el Modo de Edición** (abre el recorrido de edición con la pregunta seleccionada y encuadrada) y **Describir el problema en un formulario** (Google Form en pestaña nueva).
- El formulario se prerrellena con: id de la pregunta, texto formal, recorrido de respuestas hasta ese momento (marcando las inclinaciones) e idioma. La URL y los `entry.N` viven en `FORMULARIO_AVISOS`, al inicio de `js/cuestionario.js`. Si la URL está vacía, el panel dice que el formulario aún no está configurado.
- El formulario incluye un campo para pegar lo exportado desde el Modo de Edición: así quien no usa GitHub también puede hacer llegar una propuesta concreta.

## Cambios posteriores: nombre al empezar y registro de resultados

### Petición
Al abrir la página por primera vez, solo en el cuestionario, un campo al frente que pida el nombre de la persona (lo más genérico posible: solo cómo se quiere identificar). Al terminar el reporte, guardar en una hoja de cálculo el nombre y los identificadores de las posturas hoja a las que llegó.

### Preguntas y respuestas
- **¿Obligatorio?** Sin botón ni texto de «omitir». Un clic fuera del campo lo cierra, para que no parezca obligatorio; pero con un margen amplio: un clic cerca de la tarjeta le da foco, no la cierra.
- **¿Se avisa?** No se pregunta ni se pide consentimiento; sí se informa que se guarda, aclarando que no hace falta el nombre real (vale un apodo). Al final del reporte, una opción discreta para borrar el resultado.
- **¿Qué se guarda?** Nombre, ids de las posturas, sus nombres legibles e idioma.
- **¿Cómo se borra?** Google Forms solo agrega filas: «borrar» envía otra fila con el mismo id y acción `borrar`; la limpieza en la hoja es manual.

### Decisiones tomadas al implementar
- La capa del nombre vive fuera de `#modo-cuestionario` (que se repinta entero) y aparece mientras no haya un nombre guardado en `localStorage` (`arbol-cuestionario-nombre`). Se cierra con «Empezar», Enter, Escape o un clic fuera de la zona de 72 px alrededor de la tarjeta; cualquiera de esas vías guarda lo escrito (o vacío) y no vuelve a preguntar. Salir del cuestionario sin cerrarla la oculta sin darla por contestada.
- El envío ocurre al pintar el reporte de un recorrido contestado (no con el panel de creencias abierto ni tras «Explorar»). Se hace con `fetch` POST `no-cors` al `formResponse` del Form: no hay confirmación de llegada. Cada resultado lleva un id aleatorio; repintar el mismo reporte no reenvía (se compara la firma de ids de posturas guardada en `arbol-cuestionario-resultado`); un resultado distinto genera otra fila con otro id.
- Configuración en `FORMULARIO_RESULTADOS` (inicio de `js/cuestionario.js`). Con la URL vacía no se envía nada y no aparece la opción de borrar.

### Formularios creados
- **Avisos sobre preguntas:** campos ID de la pregunta, Texto de la pregunta, Recorrido de respuestas, Idioma (prerrellenados), Tipo de problema (casillas), Describe el problema (obligatorio), Propuesta exportada del Modo de Edición, Contacto. Respuestas en la hoja «Árbol de posturas - Avisos sobre preguntas».
- **Resultados del cuestionario:** campos id, nombre, posturas, nombres de las posturas, idioma, accion (todas respuesta corta). Respuestas en la hoja «Árbol de posturas - Resultados del cuestionario (Responses)».
- Los `entry.N` se obtienen del `FB_PUBLIC_LOAD_DATA_` de la página pública del Form. Si se edita un campo del Form, conviene volver a comprobarlos.

## Cambios posteriores: barra de certeza (reemplaza «Me inclino a») y rediseño del nombre

### Petición
- «Me inclino a» se ve mal. Se reemplaza por una barra de certeza dentro de cada respuesta, siempre visible, que por defecto está en el máximo.
- La barra es continua, sin pasos visibles; internamente se manejan 7 niveles.
- Rótulos: izquierda «Muy insegur@», derecha «Completamente segur@» (la @ abarca masculino y femenino).
- Lo más importante es que sea visualmente atractiva y realce el resto de la página.
- El campo del nombre no reaparecía al recargar, y su tarjeta se veía mal: debe ser solo el campo, redondeado, con sombra, muy agradable a la vista.

### Preguntas y respuestas
- **Nombre del control:** «certeza» (no «seguridad», que en una interfaz suena a seguridad informática, ni «confianza», que es ambigua).
- **¿Una barra por pregunta o una por respuesta?** Una dentro de cada respuesta.
- **¿Cuándo reaparece el nombre?** Ya relleno, cada vez que el cuestionario empieza de cero, y además desde un chip en la cabecera.

### Decisiones tomadas al implementar
- **Reemplaza** la decisión anterior de «Me inclino a» (par `.quiz-par`/`.quiz-inclino` y `Estado.inclinaciones`), que se elimina.
- Cada respuesta es ahora un contenedor `div.quiz-opcion`. El `button.quiz-opcion-cuerpo` de arriba responde, y también responde un clic en el borde de la tarjeta. La `.quiz-certeza` de abajo solo se ajusta: un clic o un arrastre en ella no responde. Al responder se usa la barra de esa misma tarjeta. Sobre la barra, la tarjeta no se «levanta», para que no parezca un botón.
- Barra: `input[type=range]` de 0 a 100 con `step="any"`, sin marcas. Se cuantiza a 7 niveles con `1 + round(valor/100 × 6)`. Pista con degradado del dorado al acento, cuyo tramo vacío tapa `--pct`. El tirador cambia de tono del dorado al acento según el valor (`color-mix`) y tiene halo. La tarjeta se tiñe de dorado mientras la certeza no es completa. El rótulo «Completamente segur@» se resalta en acento con certeza completa, y «Muy insegur@» en dorado por debajo de la mitad.
- Estado: `Estado.certezas = { Q1: 1–6 }`. Solo se guarda cuando la certeza no es completa. Se leen con `certezaDe(qid)` (7 si es completa) y `conDudas(qid)`. Responder desde el árbol deja la certeza completa.
- Reporte:
  - Barra de «Certeza del recorrido»: promedio de nivel/7.
  - Texto: cuántas respuestas fueron con certeza completa.
  - «Tus puntos de duda»: todas las respuestas sin certeza completa, ordenadas de menor a mayor certeza, cada una con su barrita.
  - Coincidencia con tradiciones: cada respuesta suma nivel/7. Esto reemplaza el peso fijo de 0,5.
- Nombre:
  - Píldora flotante con icono, campo y botón circular con flecha, sobre un fondo difuminado. Tiene animación de entrada y respeta `prefers-reduced-motion`.
  - Debajo, una sola línea informativa: un apodo vale, se guarda con el resultado y se puede borrar.
  - Aparece si nunca se guardó un nombre o, una vez por carga, cuando el cuestionario está al inicio (sin respuestas ni ramas cerradas). «Repetir cuestionario» lo vuelve a pedir. El campo viene relleno y seleccionado.
  - El chip «👤 nombre» de la cabecera de preguntas lo abre en cualquier momento.

## Cambios posteriores: tirador en barra, aviso dentro de «No responder», edición directa y nombre en el formulario

### Petición
- El tirador de la barra de certeza se vería mejor como una barra que como un punto.
- «¿Tienes un problema con esta pregunta?» pasa a afirmación en primera persona, «Tengo un problema con esta pregunta». Va como hipervínculo dentro de la tarjeta «No responder». Un clic en la tarjeta funciona como siempre; pasar el ratón por la frase abre el panel, que ahora es un globo flotante y no se despliega debajo.
- «Describir el problema en un formulario» pasa a «Reportar el problema».
- «Proponer un cambio en el Modo de Edición» no llevaba a la pregunta: abría el Modo de Edición desde la raíz. Debe llevar directo a la pregunta.
- El formulario de avisos debe venir con el nombre del usuario ya rellenado.

### Decisiones tomadas al implementar
- Tirador: barrita vertical redondeada de 8×24 px, rellena con el tono de la certeza (del dorado al acento) y con un borde del color de fondo que la separa de la pista. Al pasar el ratón se alarga en vertical (`scaleY`), sin crecer en ancho.
- «No responder» es ahora un contenedor `div.quiz-opcion-sin-respuesta`. Su `button.quiz-opcion-cuerpo` cierra la rama. Al pie, a la derecha, va el enlace `.quiz-problema-abrir`.
- El globo se abre de tres maneras: al pasar el ratón (140 ms de retardo), con un clic o al enfocarlo con el teclado.
  - Abierto con el ratón, se cierra 260 ms después de salir del enlace y del globo. Un puente invisible cubre el hueco entre ambos.
  - Abierto con clic, queda fijo hasta un clic fuera o Escape.
  - Nada de lo que se pulse dentro del enlace o del globo responde la pregunta.
  - El globo aparece sobre el enlace, alineado a la derecha y con flecha.
- El panel deja de mostrarse bajo las respuestas, y se pierde con el panel de creencias abierto: en ese caso no hay «No responder».
- Edición directa: el Modo de Edición conserva lo que tenía expandido de una visita anterior, y en edición un nodo solo se ve si toda su cadena de ancestros está expandida. `abrirPreguntaEnEdicion` (app.js) ahora busca el anfitrión en el grafo de edición ya reconstruido y expande la cadena completa hasta la raíz. Prefiere los padres del camino respondido; en una convergencia hay varios. Después selecciona el nodo y lo encuadra con sus respuestas. Se comprobó sin navegador con un recorrido de 3 respuestas: antes, la pregunta Q75 quedaba oculta; después es visible, igual que sus respuestas.
- Formulario de avisos: nuevo primer campo «Nombre o apodo» (`entry.2018982662`), prerrellenado con el nombre guardado. La URL del formulario se recalcula al pulsar «Reportar el problema», para llevar el nombre y el recorrido vigentes.
- «Tipo de problema» llega con «Fraseo ambiguo o confuso» ya marcado (`entry.2013098283`). El valor debe coincidir letra por letra con la opción del Form; si se renombra la opción en el Form, hay que cambiarlo también en `urlFormularioAvisos`.

## Cambios posteriores: límite de resultados guardados por visitante

### Petición
Guardar en la hoja solo los primeros 2 o 3 resultados de cada visitante.

### Preguntas y respuestas
- **¿Se puede limitar en la hoja?** No con lo que hay: cada fila lleva un id aleatorio por resultado (no por visitante), el nombre es opcional y repetible, y Google Forms solo limita respuestas si exige iniciar sesión con Google. El límite se aplica en el navegador.
- **¿Cuántos?** 3.
- **¿Agregar un id de visitante persistente a cada fila?** No; solo el contador.

### Decisiones tomadas al implementar
- Contador en `localStorage` (`arbol-cuestionario-resultados-enviados`), tope en `MAX_RESULTADOS_ENVIADOS = 3` (`js/cuestionario.js`). Solo cuentan los envíos que realmente salen: repintar el mismo reporte ya no reenvía (firma), así que cuentan resultados distintos.
- Alcanzado el tope, el reporte se muestra igual pero no se envía nada. La opción «borrar» sigue aplicando al último resultado enviado; borrar no libera un lugar.
- Es un límite por navegador: borrar los datos del sitio, otro navegador o incógnito lo reinician. Se acepta: el objetivo es evitar filas repetidas de visitantes normales, no impedir abusos.

### Ajuste: el cupo es por nombre de usuario (reemplaza el contador único)
- **Petición:** después del tercero, seguir guardando pero reescribiendo el tercer registro, siempre que el reporte sea del mismo nombre de usuario.
- **¿Cómo se reescribe, si Google Forms solo agrega filas?** Se plantearon un Apps Script en la hoja (borra las filas anteriores con el mismo id) o una pestaña con `QUERY` (muestra la fila más reciente por id). Respuesta: «mejor no». No hay reescritura: pasado el cupo, no se envía nada.
- **¿Y si el visitante cambia de nombre?** Cada nombre tiene sus 3.
- **Implementación:** reemplaza el contador único `arbol-cuestionario-resultados-enviados` por `arbol-cuestionario-resultados-por-nombre`, un mapa `{ nombre normalizado: enviados }`. El nombre se normaliza (espacios compactados, minúsculas); el nombre vacío tiene su propio cupo. El contador anterior se ignora: nunca llegó a publicarse.

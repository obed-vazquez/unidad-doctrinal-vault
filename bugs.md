## Bugs:

- El doble click sigue sin funcionar... se supone que tiene que mostrar el panel de detalle? Porque no abre el panel, de hecho aunque abra el panel y DESPUÉS le dé click a una tarjeta no muestra el detalle, esa pestaña de detalle siempre está vacía.
  - Detalle del bug original:


    El doble click no hace nada. Según la especificacion deberia encuadrarlo, pero me gustaría más que mostrara todo el detalle de la tarjeta (todos los detalles)

  - Si esto es así entonces, tanto la funcionalidad de `detalle` como `Creencias` y `Comparar` se encuentran dentro del mismo panel, siendo así deberían estar de cierta manera agrupadas en los controles y todas se deberían limpiar (el resaltado de habilitado cuando el panel está abierto) si el panel se cierra.
  - Actualmente no se está limpiando el boton de `Creencias`, el de `Comparar` ya se limpia correctamnete pero el de creencias sigue presentando el error.  
  - El path de la URL sigue sin poderse cambiar, la unica forma de corregirlo es cerrar la ventana de incognito (cerrar todas las ventanas) e iniciar un modo incognito nuevo.
  - Detalle del bug original:


    Por alguna razon el explorador guarda el estado aun cuando se elimina el path del URL, sabes por qué será? esto ocurre aun en modo incognito y al dar ctlr+F5. Lo unico que parece arreglarlo es abrir otra ventana en incognito. Quizas es por que estoy usando el "Open with live server" del plugin de VSCode para abrirlo, no estoy seguro de que este causandolo.

- El highlight (ctrl+Click) en color morado desentona mucho, quizás modificar un poco el tono. También falta brillo o subrayado, pues si se hace mucho zoom out el highlight no se nota tanto.
- El boton de borrar todo el arbol (trash) Es muy pequeño, apenas se vé supongo que podemos hacerlo mas grande, o podemos hacer toda la barra superior un poco mas grande para que crezca ese también.


## Mejoras:

- Me gustaría que el botón de selección de respuesta (Sí / No) no ocultara la otra, cuando se le dá click en `Sí` a una pregunta y se expande la rama de esa tarjeta, me gustaría que el `No` no se ocultase, sino que quedase dimmeado de manera que si el usuario da click en el otro (en este ejemplo el botón `No`), el sistema mostrará la rama opuesta (algo parecido a dar click en trash y luego cambiar de respuesta).
- El panel de Detalle / Creencias / Comparar esta bien, pero en la sección de creencias sería mucho mejor reducir el nivel de información de las tarjetas, veo que tienes algunos mensajes debajo de las tarjetas, pero sería buena idea tener un checkbox habilitado por defecto como "modo compacto" para que cupiesen muchas más tarjetas, actualmente hay pocas religiones, pero cuando esto se empiece a llenar, ese panel va a estar repleto de tarjetas en esa zona y muchas más de posturas. Parece buena idea compactarlas lo más posible.
  - Siguiendo con ese espíritu, parece buena idea no solo tener 1 sola tarjeta por renglón, sino poder tener varias si el espacio lo permite, por ejemplo si son nombres pequeños y hace que quepan en una sola linea supongo que sería buena idea que el modo compacto ponga varias tarjetas en una sola línea.
  - Con ese mismo espíritu, parece buena idea dejar al usuario que redimencione el panel para que pueda ver más cosas en los filtros si lo desea mientras lo está rellenando.

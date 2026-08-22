## Bugs:

- El doble click sigue sin funcionar... se supone que tiene que mostrar el panel de detalle? Porque no abre el panel, de hecho aunque abra el panel y DESPUÉS le dé click a una tarjeta no muestra el detalle, esa pestaña de detalle siempre está vacía.
  - Detalle del bug original:


    El doble click no hace nada. Según la especificacion deberia encuadrarlo, pero me gustaría más que mostrara todo el detalle de la tarjeta (todos los detalles)

- El botón de borrar todo el árbol (trash) no era muy pequeño, el tamaño del botón está bien, a lo que me refería era que el ICONO de la basura es super-pequeño y no se distingue, deberíamos hacer los iconos de Tema (obscuro/claro) y este más grande, pero sin modificar el tamaño del botón (me imagino que eliminar padding y hacer el icono más grande) y digo ambos porque están uno al lado del otro y se vería mal que uno cambiase de tamaño sin el otro.


## Mejoras:

- Me gustaría que el botón de selección de respuesta (Sí / No) no ocultara la otra, cuando se le dá click en `Sí` a una pregunta y se expande la rama de esa tarjeta, me gustaría que el `No` no se ocultase, sino que quedase dimm'eado de manera que si el usuario da click en el otro (en este ejemplo el botón `No`), el sistema mostrará la rama opuesta (algo parecido a dar click en trash y luego cambiar de respuesta).
- Agreguemos animaciónes modernas para: el resaltado de un nodo, el mostrar una rama nueva, el podar una rama y cuando aparezca el nodo raíz.
- El panel de Detalle / Creencias / Comparar está bien, pero en la sección de creencias sería mucho mejor reducir el nivel de información de las tarjetas, veo que tienes algunos mensajes debajo de las tarjetas, pero sería buena idea tener un checkbox habilitado por defecto como "modo compacto" para que cupiesen muchas más tarjetas, actualmente hay pocas religiones, pero cuando esto se empiece a llenar, ese panel va a estar repleto de tarjetas en esa zona y muchas más de posturas. Parece buena idea compactarlas lo más posible.
  - Siguiendo con ese espíritu, parece buena idea no solo tener 1 sola tarjeta por renglón, sino poder tener varias si el espacio lo permite, por ejemplo si son nombres pequeños y hace que quepan en una sola línea supongo que sería buena idea que el modo compacto ponga varias tarjetas en una sola línea.
  - Con ese mismo espíritu, parece buena idea dejar al usuario que redimensione el panel para que pueda ver más cosas en los filtros si lo desea mientras lo está rellenando.
- Actualmente, si el usuario selecciona la respuesta `Sí` se despliega su rama pero también se depliega el siguiente nodo directo de la respuesta `No`, supongo que está bien, pero necesitamos 2 cosas: 1) Me gustaría dimmear también las ramas que no están seleccionadas y 2) Me gustaría que tuviésemos un checkbox en la parte superior de los controles que se llamase "modo limpio" o algo parecido que hiciese que SOLO se desplegasen los nodos de las respuestas que tubo el usuario y quite esos nodos que quedan volando (en nuestro ejemplo quitaría el nodo de la respuesta `No` pero dejaría toda la rama de `Sí` como normalmente lo hace y con la misma funcionalidad que tiene ahorita) 
- Otra modalidad sería la de libre exploración, al cambiar a este modo, el usuario ya no es presentado con las opciones de las respuestas de sí y no, solamente se le muestra la posibilidad de expandir un nodo o ocultarlo y esta opción mostraría u ocultaría todas sus respuestas o vertientes.
- Me gustaría habilitar al usuario para que cree nodos o complete información como posturas que no tienen nombres o preguntas nuevas, etc., esta implementación es grande, y lo que me preocupa es como persistir esa información que el usuario introduzca. Se te ocurre alguna idea?

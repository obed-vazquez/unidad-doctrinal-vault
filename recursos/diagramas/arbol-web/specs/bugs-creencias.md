## Bugs detectados

Bugs generados en la implementación de la funcionalidad simplificada de interacción con el panel de Creencias:

- El número de pasos se queda trabado cuando seleccionas algúna creencia (postura) en el panel de creencias en el modo de Cuestionario, ¿sí lo notaste?
- Cuando se seleccionan 2 o 3 posturas en el panel de creencias no se muestran todas sus preguntas en el modo Cuestionario,
- Cuando selecciono varias posturas con el panel de creencias abierto en Cuestionario y le doy a explorar a UNA postura me abre la primera (creo que es la primera la que muestra siempre) y no la que yo le indiqué que abriera.
- En general el Modo cuestionario está teniendo muchos problemas.
- El botón de Limpiar selección no funciona bien, como que tiene que perder foco primero hacia el panel y luego hacia el árbol para que se limpien, y en Cuestionario simplemente no funciona (quizás porque no hay árbol a cuál ganar foco y que se active esa cosa rara), sí es eso, funciona si sustituyes el click en el árbol por el click en Modo compacto. Sí, en todos al parecer si le das limpiar y cambias de modo compacto se limpia.
- La funcionalidad debería ser sencilla de implementar, si se tienen varias creencias, se abren todas las preguntas relacionadas y solo se puede seleccionar una para explorar. El cerrar el panel limpia la selección de creencias independientemente del modo (incluido Creencias)

- Me dí cuenta que la funcionalidad de explorar todas no funciona para el modo indagatorio cuando son ramas opuestas, lo cual está bien, me di cuenta de que deja la rama expandida, pero bloqueada, lo cual está mucho mejor, pero en el modo de exploración libre debería funcionar tal como la especificación lo describe, y no está funcionando, los nodos que coinciden con religiones los oculta por alguna razón. Me parece que es el único modo que permite funcionar tal cual la especificación lo describe y no está funcionando allí.

- Podemos agregar también esos casos de prueba por favor? Me parece que la especificación ya lo abarca asi que son considerados bugs, es conveniente agregarlos como casos de pruebas unitarias.

- Se decompuso el boton de podar rama, aunque el mismo boton (aunque funcion diferente) de "Eliminar Todo" en la vista de edicion, sigue funcionando bien.

### Ajustes:

- Especificación: Pararse en Monoprosopismo muestra Encarnacionismo preseleccionado porque es postura ancestro de Monoprosopismo, pero en el modo Cuestionario no debería mostrar ancestros solo la última pregunta. Está bien si selecciona Encarnacionismo en el panel, pero no debería mostrar la pregunta para no generar confusión.
- Cambio: Actualmente, el sistema utiliza un resaltado en blanco para las líneas de religiones, esto no debería ser así, podemos utilizar otro tono de amarillo para generar un resaltado nuevo para las líneas de religiones, y dejamos el amarillo que tenemos para las líneas de posturas, pero se ve conveniente que los nodos que coinciden exactamente tanto con las religiones como con las posturas se seleccionen teniendo asi un resaltado en blanco, no porque sean resaltados en blanco por ser nodos sino porque están seleccionados con Ctrl+Click.


En conclusión, toda la build está rota y con muchísimos errores, pues es seguro que los que encontramos no son los únicos que existen.
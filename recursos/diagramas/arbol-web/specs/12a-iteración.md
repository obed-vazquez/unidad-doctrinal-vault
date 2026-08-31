## Cambios

- Al hablar de cualquier hipervinculo, ya sea dentro de nuestra página o dentro de los paneles donde desplegamos los Markdown, cuando el usuario de click en cualquier hipervínculo, el sistema debería abrir ese hipervinculo en otra ventana.
- El diseño de algunos hipervínculos (los que están fuera de los Markdown) tienen un problema con el diseño porque desentonan mucho con nuestro tema. Los 2 son azules y el hipervínculo lastima la vista, los que tenemos en los Markdown están muy bien porque se ajustaron para que armonizaran con el tema, necesitamos hacer lo mismo con los nuestros y mejorar ese diseño de la forma en la que se despliegan.
- Se agregará una flecha hacia atras (con diseño moderno) en la parte superor izquierda de todas las vistas de arbol para regresar a la vista anterior.
- Bug: Hay una pregunta que no está identificando bien el script de mapeo:
    `Depravación Total del hombre -> ¿**Antes del Discernimiento** el humano sigue estando condenado debido a su estado de muerte (estado de “pecador”) aun sin haber cometido pecado? (Cuando un niño muere ¿va a un lugar diferente al cielo?)`
Esta pregunta debería identificarse como:
Pregunta principal: `¿**Antes del Discernimiento** el humano sigue estando condenado debido a su estado de muerte (estado de “pecador”) aun sin haber cometido pecado?`
Pregunta Coloquial: `Cuando un niño muere ¿va a un lugar diferente al cielo?`
Este error debe corregirse, no en el campo sino en la regla que el script tiene para identificar esos campos.
- Necesitamos agregar un botón en las tarjetas de Cuestionario con texto: "Sin respuesta" para que el sistema mate esa rama, es decir expandirá esa rama hasta ese nodo y no continuará. El reporte entonces debe asumir que ese nodo fue la hoja y generará el reporte de acuerdo a eso.

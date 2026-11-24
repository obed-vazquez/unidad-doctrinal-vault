## 10a Iteración

- El re-centrar la pantalla en los nodos cuando son creados es muy molesto en escritorio, dejémoslo solamente para la creación de nodos en móvil o quizás solo para cuando el nodo que se está creando queda muy a la orilla del explorador (así funciona para los 2). Tú decide.
- Los nodos despliegan muy rápido, especialmente con el último cambio del reacomodo de los nodos para que no se empalmen, metamos una animación muy vistosa al crear nodos y cortar ramas.
- El atajo `C` abre la sección de creencias. Que también se abra el mismo panel con `Ctrl+F` (además de la `C`).

### Decisiones tomadas al implementar (atajo `Ctrl+F`)

- `Ctrl+F` (`Cmd+F` en Mac) reemplaza la búsqueda nativa del navegador dentro del visor. Con `Ctrl+Shift+F` o `Ctrl+Alt+F` no se intercepta nada.
- A diferencia de `C`, **no alterna**: siempre deja el panel abierto en la pestaña de creencias con el foco en el buscador de tradiciones (y su texto seleccionado). Si el panel ya estaba abierto en otra pestaña, cambia a creencias; si ya estaba en creencias, solo enfoca el buscador. Es el comportamiento esperado de un "buscar".
- Dentro del buscador de creencias, `Ctrl+F` selecciona su texto. En cualquier otro campo de texto (p. ej., del modo de edición) no se intercepta y el navegador hace su búsqueda normal.
- Mientras se elige un padre en el modo de edición (enlace pendiente), `Ctrl+F` queda bloqueado igual que los demás atajos.
- El tooltip del botón pasa a decir `(C / Ctrl+F)`.
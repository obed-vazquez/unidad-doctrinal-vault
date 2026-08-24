## 9a iteración

- Bug: Esta es la más importante y preocupante de todos los hallazgos porque puede afectar la funcionalidad del sistema - Los nodos actualmente se pueden llegar a traslapar si sus padres están muy juntos, específicamente las líneas que los unen se cruzan. Me parece que la expansión del árbol no debería ni siquiera permitir esto, pero actualmente está dando problemas. Necesitamos asegurar que no pase, que no se empalmen los nodos al expandir otros.
- El tooltip de los botones de respuesta (Sí y No) debe decir qué significan los números (el número de nodos que abre esa pregunta). Esto también debe estár mejor descrito en el panel de detalles de la tarjeta.
- los botones de respuesta (`Sí` y `No`) no deberían aparecer en la vista de árbol completo.
- el Diotelitismo tiene una liga externa a uno de los documentos internos del sistema, el problema es que lo abre como texto en el navegador. Desde ahora, usaremos 2 recursos para mostrar archivos Markdown, el segundo es embeber los archivos markdown en nuestra propia interface pero lo dejaremos para después; el primero es el que implementaremos desde ahora, usaremos una herramienta externa para abrir los archivos Markdown, su nombre es MDRender y funciona de la siguiente manera:
```
https://mdrenderer.github.io/?https://raw.githubusercontent.com/obed-vazquez/unidad-doctrinal-vault/refs/heads/arbol-de-desiciones-posturas/recursos/definiciones/diotelitismo.md#3-c-mo-operan-las-dos-voluntades-sin-entrar-en-conflicto
```
Primero la URL de MDRender y después la URL del archivo Markdown a abrir. En este caso estoy poniendo la liga directa al archivo en Github, pero la idea es que mande el archivo que tiene la página publicada. Aunque pensando en esto espero que no dé problemas que el archivo markdown esté fuera de la carpeta del sitio web y cómo afectaría eso al despliegue automático con Github pages, espero puedas alumbrar este asunto en caso de que haya algín problema.
- El nombre del proyecto (página web y sitio web) debe ser Análisis de posturas y creencias, en lugar de árbol de posturas y creencias. Hacemos el cambio en el título de la página como en los lugares donde se hace referencia a esto.

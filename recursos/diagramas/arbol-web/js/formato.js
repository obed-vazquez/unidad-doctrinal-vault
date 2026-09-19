/* Marcas de énfasis del documento fuente dentro del visor.

   `posturas-creencias.md` escribe `**negrita**` y `*cursiva*` en preguntas y
   respuestas. Esas marcas son del autor: viajan intactas hasta el JSON y de
   vuelta al Markdown cuando el Modo de Edición propone cambios. Borrarlas en
   el dato —como se hacía— convertía cada propuesta en un diff falso.

   Como el dato las lleva, cada superficie decide qué hacer con ellas:

   - `aHtml(texto)` escapa y las convierte en <strong>/<em>. Es lo que usan
     los paneles, el cuestionario, los tooltips y el registro: todo lo que
     termina en innerHTML.
   - `plano(texto)` las quita. Es para donde no hay HTML que valga: las
     etiquetas del lienzo SVG (y su medición de ancho), los atributos
     `title`/`aria-label` y las claves de búsqueda.

   Nunca se pasa texto con marcas a innerHTML sin una de las dos: el asterisco
   crudo en pantalla es justo el síntoma que esto viene a evitar.

   El `*` final de una postura sugerida (`Historicidad de Jesús*`) NO es
   cursiva: es notación del documento. Por eso `cursiva` exige un par y prohíbe
   asteriscos dentro, y por eso los rótulos de postura no pasan por aquí. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});

  var NEGRITA = /\*\*([\s\S]+?)\*\*/g;
  // Un solo asterisco a cada lado, sin asteriscos ni espacios pegados por
  // dentro: así un `*` suelto se queda como está en vez de emparejarse con
  // otro que esté media frase más allá.
  var CURSIVA = /\*(?!\s)([^*]*[^\s*])\*/g;

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function aHtml(texto) {
    return escapar(texto)
      .replace(NEGRITA, '<strong>$1</strong>')
      .replace(CURSIVA, '<em>$1</em>');
  }

  function plano(texto) {
    return String(texto == null ? '' : texto)
      .replace(NEGRITA, '$1')
      .replace(CURSIVA, '$1');
  }

  Arbol.Formato = {
    escapar: escapar,
    aHtml: aHtml,
    plano: plano
  };
})(typeof window !== 'undefined' ? window : globalThis);

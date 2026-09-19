/* Textos de interfaz y las secciones fijas (ejes, pregunta diagnóstica). */

(function (global) {
  "use strict";

  global.I18N = {
    es: {
      tituloPagina: "Posturas sobre el origen del texto bíblico",
      subtitulo: "10 posturas · 20 criterios",

      seccionEjesTitulo: "Ejes de la clasificación",
      ejeAlcance: "Alcance — cuánto de la Biblia está inspirado: plenaria o parcial.",
      ejeObjeto: "Objeto — qué se inspira: las palabras o los conceptos.",
      ejeMetodo: "Método — cómo obra Dios sobre el autor: suprimiéndolo o a través de él.",
      ejePrefijo: "Prefijo — si hay comunicación divina de contenido. No es un eje sino un umbral: separa las ocho posturas de inspiración de las dos que quedan fuera de la teopneustia.",
      ejesNota: "Los tres primeros ejes son independientes entre sí; cualquier combinación es formulable, aunque no todas tengan defensores históricos.",

      etPosturas: "Posturas",
      etEjes: "Ejes",
      todas: "Todas",
      ninguna: "Ninguna",
      posturasApagadasAviso: "No hay ninguna postura encendida, así que no hay nada que comparar.",
      volverATodas: "Mostrar las 10 posturas",
      notaEjes: "Marcar un valor reemplaza la selección de posturas. Después puedes afinar postura por postura.",

      criterios: "Criterios",
      mostrarTodos: "Mostrar todos",
      ocultarTodos: "Ocultar todos",
      grupoTodoOn: "Mostrar grupo",
      grupoTodoOff: "Ocultar grupo",
      noCabenFijos: "No caben más columnas fijas: libera alguna para poder desplazarte.",

      fijarColumna: "Fijar esta columna a la izquierda",
      quitarFijado: "Quitar el fijado",
      ocultarCriterio: "Ocultar este criterio",
      apagarPostura: "Quitar esta postura de la comparación",
      ajustarAncho: "Arrastrar para cambiar el ancho de la columna",
      liberarAncho: "Devolver la columna a su ancho automático",

      voltear: "Voltear",
      voltearActivo: "Desvoltear",
      voltearTitulo: "Intercambiar filas y columnas",
      densidadCompacta: "Compacta",
      densidadComoda: "Cómoda",
      densidadTitulo: "Alternar entre celdas recortadas y texto completo",
      soloDiferencias: "Solo diferencias",
      soloDiferenciasNota: "Con menos de dos posturas visibles no hay diferencias que mostrar.",
      fijadas: "Fijadas",
      ocultarCoincidencias: function (n) {
        return n === 1
          ? "Oculta 1 criterio en el que las posturas visibles coinciden"
          : "Oculta " + n + " criterios en los que las posturas visibles coinciden";
      },
      sinCoincidencias: "Las posturas visibles difieren en todos los criterios: no hay nada que ocultar.",

      leyendaCoinciden: "Todas coinciden",
      leyendaDifieren: "Difieren",

      compartir: "Compartir",
      compartirCopiado: "Dirección copiada al portapapeles",
      guia: "Guía",
      guiaTitulo: "Cómo leer esta tabla",

      idiomaBoton: "EN",
      idiomaTitulo: "Cambiar a inglés",
      temaTitulo: "Cambiar entre tema oscuro y claro",

      cerrar: "Cerrar",
      abrirCompleto: "Clic para leer la celda completa",

      corteTeopneustia: "Fuera de la teopneustia",
      deA: function (n, total) { return n + " / " + total; }
    },

    en: {
      tituloPagina: "Views on the origin of the biblical text",
      subtitulo: "10 views · 20 criteria",

      seccionEjesTitulo: "Axes of the classification",
      ejeAlcance: "Scope — how much of the Bible is inspired: plenary or partial.",
      ejeObjeto: "Object — what is inspired: the words or the concepts.",
      ejeMetodo: "Method — how God works upon the author: by suppressing him or through him.",
      ejePrefijo: "Prefix — whether there is divine communication of content. It is not an axis but a threshold: it separates the eight views of inspiration from the two that fall outside theopneustia.",
      ejesNota: "The first three axes are independent of one another; any combination can be formulated, though not all have historical defenders.",

      etPosturas: "Views",
      etEjes: "Axes",
      todas: "All",
      ninguna: "None",
      posturasApagadasAviso: "No view is turned on, so there is nothing to compare.",
      volverATodas: "Show all 10 views",
      notaEjes: "Checking a value replaces the view selection. You can then fine-tune view by view.",

      criterios: "Criteria",
      mostrarTodos: "Show all",
      ocultarTodos: "Hide all",
      grupoTodoOn: "Show group",
      grupoTodoOff: "Hide group",
      noCabenFijos: "No room for more pinned columns: free one up so you can scroll.",

      fijarColumna: "Pin this column to the left",
      quitarFijado: "Unpin",
      ocultarCriterio: "Hide this criterion",
      apagarPostura: "Remove this view from the comparison",
      ajustarAncho: "Drag to change the column width",
      liberarAncho: "Return the column to its automatic width",

      voltear: "Flip",
      voltearActivo: "Unflip",
      voltearTitulo: "Swap rows and columns",
      densidadCompacta: "Compact",
      densidadComoda: "Comfortable",
      densidadTitulo: "Switch between clamped cells and full text",
      soloDiferencias: "Differences only",
      soloDiferenciasNota: "With fewer than two views visible there are no differences to show.",
      fijadas: "Pinned",
      ocultarCoincidencias: function (n) {
        return n === 1
          ? "Hides 1 criterion where the visible views agree"
          : "Hides " + n + " criteria where the visible views agree";
      },
      sinCoincidencias: "The visible views differ in every criterion: there is nothing to hide.",

      leyendaCoinciden: "All agree",
      leyendaDifieren: "They differ",

      compartir: "Share",
      compartirCopiado: "Link copied to the clipboard",
      guia: "Guide",
      guiaTitulo: "How to read this table",

      idiomaBoton: "ES",
      idiomaTitulo: "Switch to Spanish",
      temaTitulo: "Switch between dark and light theme",

      cerrar: "Close",
      abrirCompleto: "Click to read the full cell",

      corteTeopneustia: "Outside theopneustia",
      deA: function (n, total) { return n + " / " + total; }
    }
  };

})(window);

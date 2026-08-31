/* Lógica del panel de creencias, sin DOM: qué abre la selección, qué resalta
   y qué par pregunta-respuesta caracteriza a una postura.

   La idea que gobierna el archivo: el panel NO responde preguntas. Lo que
   aporta es una «apertura» efímera —qué preguntas deja abiertas y por qué
   respuesta pasa su ruta— que solo sirve para dibujar. Nunca entra en las
   respuestas del usuario, ni en el camino elegido, ni en lo que se guarda.
   Por eso al cerrar el panel no hay nada que restaurar: basta con dejar de
   calcularla. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});

  /* La pregunta que LLEVA a la postura, no la que la postura plantea. Son
     cosas distintas y confundirlas es el origen de que el buscador no
     encontrara las posturas por su pregunta y de que la ficha emparejara la
     pregunta de una con la respuesta de otra.

     En un punto de convergencia hay varias entradas válidas; se toma la
     primera, que es suficiente para nombrar la postura y para encontrarla. */
  function entradaDePostura(grafo, datos, pid) {
    if (!grafo || !datos || !pid) return null;
    var nodo = grafo.nodos.get(grafo.idDePostura(pid));
    if (!nodo) return null;
    var entradas = nodo.entradas || [];
    var i;
    for (i = 0; i < entradas.length; i++) {
      var arista = entradas[i];
      if (arista.tipo !== 'respuesta' || !arista.preguntaId) continue;
      var pregunta = datos.questions[arista.preguntaId];
      if (!pregunta) continue;
      var respuesta = null;
      (pregunta.answers || []).forEach(function (opcion) {
        if (opcion.key === arista.clave) respuesta = opcion;
      });
      return { pregunta: pregunta, respuesta: respuesta, clave: arista.clave };
    }
    return null;
  }

  /* Las religiones quedan fuera del cuestionario: su ruta termina en una
     postura concreta y mezclarla con la del usuario le plantearía preguntas
     de ramas opuestas. En el árbol no estorban porque ahí las ramas conviven
     a la vista; en un cuestionario que va pregunta por pregunta, sí. */
  function religionesDisponibles(divulgacion) {
    return divulgacion !== 'cuestionario';
  }

  /* Misma razón, y además explícita en la definición: varias posturas a la
     vez son por fuerza contradictorias entre sí. */
  function explorarTodasDisponible(divulgacion) {
    return divulgacion !== 'cuestionario';
  }

  /* El panel solo pinta mientras está abierto y con algo marcado. */
  function afectaArbol(panelAbierto, tradiciones, posturas) {
    return !!(panelAbierto
      && ((tradiciones && tradiciones.length) || (posturas && posturas.length)));
  }

  /* Unión de las rutas de los sujetos recibidos. `respuestas` dice, para cada
     pregunta que la selección deja abierta, por qué rama pasa; `nodos` es todo
     lo que hay que poder ver para que esa ruta se entienda.

     Cuando dos sujetos se contradicen en una pregunta gana el primero. Es
     inevitable en un árbol de decisión y no se disimula: los nodos de ambos
     siguen en el conjunto, así que las dos ramas quedan a la vista. */
  function apertura(grafo, datos, sujetos) {
    var respuestas = {};
    var nodos = new Set();
    (sujetos || []).forEach(function (sujeto) {
      if (!sujeto) return;
      var resolucion = Arbol.Busqueda.resolver(grafo, datos, sujeto);
      resolucion.nodos.forEach(function (id) { nodos.add(id); });
      Object.keys(resolucion.respuestas).forEach(function (qid) {
        if (respuestas[qid] === undefined) respuestas[qid] = resolucion.respuestas[qid];
      });
    });
    return { respuestas: respuestas, nodos: nodos };
  }

  /* En cuestionario con el panel abierto solo interesa la pregunta que lleva
     directamente a cada postura marcada, no todo el camino desde la raíz. */
  function preguntasDefinitorias(grafo, datos, posturaIds) {
    var pendientes = [];
    var vistos = new Set();
    (posturaIds || []).forEach(function (pid) {
      var entrada = entradaDePostura(grafo, datos, pid);
      if (!entrada || !entrada.pregunta) return;
      var qid = entrada.pregunta.id;
      if (vistos.has(qid)) return;
      vistos.add(qid);
      var nodo = grafo.nodos.get(grafo.anfitrionDePregunta(qid));
      if (nodo && nodo.pregunta) pendientes.push(nodo);
    });
    pendientes.sort(function (a, b) {
      return Number(String(a.preguntaId).slice(1)) - Number(String(b.preguntaId).slice(1));
    });
    return pendientes;
  }

  function enModoDefinitoriasCuestionario(estado) {
    if (!estado || estado.divulgacion !== 'cuestionario') return false;
    var pids = posturasConPreguntaEnCuestionario(estado);
    return !!(pids && pids.length);
  }

  function posturaConPreguntaPendiente(grafo, datos, respuestas, pid) {
    var entrada = entradaDePostura(grafo, datos, pid);
    return !!(entrada && entrada.pregunta
      && respuestas[entrada.pregunta.id] == null);
  }

  function posturasConPreguntaEnCuestionario(estado) {
    if (!estado) return null;
    var respuestas = estado.respuestas || {};
    if (estado.panelAbierto && estado.posturasSueltas && estado.posturasSueltas.length) {
      return estado.posturasSueltas.filter(function (pid) {
        return posturaConPreguntaPendiente(estado.grafo, estado.datos, respuestas, pid);
      });
    }
    if (estado.divulgacion === 'cuestionario' && estado.posturasExploradasCuestionario
      && estado.posturasExploradasCuestionario.length) {
      return estado.posturasExploradasCuestionario.filter(function (pid) {
        return posturaConPreguntaPendiente(estado.grafo, estado.datos, respuestas, pid);
      });
    }
    return null;
  }

  function retirarPosturasContestadas(grafo, datos, posturaIds, preguntaId) {
    return (posturaIds || []).filter(function (pid) {
      var entrada = entradaDePostura(grafo, datos, pid);
      return !(entrada && entrada.pregunta && entrada.pregunta.id === preguntaId);
    });
  }

  /* El amarillo cubre la ruta completa de la religión, no solo la postura que
     sostiene: sin sus ancestros el resaltado señalaría un nodo suelto sin
     explicar cómo se llega a él. */
  function resaltadoDeTradiciones(grafo, datos, sujetos, divulgacion) {
    if (!religionesDisponibles(divulgacion)) return new Set();
    return apertura(grafo, datos, sujetos).nodos;
  }

  /* Nodos-tarjeta que encarnan la creencia marcada (postura de la religión o
     postura suelta), no todo el camino. El camino va en dorado o ámbar; estos
     reciben además el resaltado blanco de «seleccionado». */
  function nodosCoincidentes(grafo, sujetos) {
    var ids = new Set();
    (sujetos || []).forEach(function (sujeto) {
      if (!sujeto || !sujeto.posturaIds) return;
      sujeto.posturaIds.forEach(function (pid) {
        var nodoId = grafo.idDePostura(pid);
        if (nodoId) ids.add(nodoId);
      });
    });
    return ids;
  }

  Arbol.Creencias = {
    entradaDePostura: entradaDePostura,
    religionesDisponibles: religionesDisponibles,
    explorarTodasDisponible: explorarTodasDisponible,
    afectaArbol: afectaArbol,
    apertura: apertura,
    resaltadoDeTradiciones: resaltadoDeTradiciones,
    nodosCoincidentes: nodosCoincidentes,
    preguntasDefinitorias: preguntasDefinitorias,
    enModoDefinitoriasCuestionario: enModoDefinitoriasCuestionario,
    posturasConPreguntaEnCuestionario: posturasConPreguntaEnCuestionario,
    retirarPosturasContestadas: retirarPosturasContestadas
  };

})(window);

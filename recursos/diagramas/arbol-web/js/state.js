/* Modelo de grafo, estado de la aplicación y persistencia local.
   Se carga como script clásico (no módulo) para que index.html funcione
   también con doble clic sobre file://, donde los módulos ES están vetados. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var CLAVE_ALMACEN = 'arbol-posturas/v1';

  /* ------------------------------------------------------------ grafo ---- */

  /* Reglas de nodo (especificación §4.1):
     - Una postura con un solo eje cuya pregunta no converge se dibuja como
       TARJETA UNIFICADA: postura y pregunta comparten un recuadro.
     - Una postura sin ejes es una tarjeta terminal.
     - Una postura con dos o más ejes, o cuyo eje es una pregunta compartida
       por varias posturas, se parte: la postura ocupa su nodo base y cada
       pregunta cuelga en un recuadro de acento.
     Las preguntas convergentes (`A & B -> ...`) son un nodo único con varias
     aristas entrantes; nunca se duplican. */
  function construirGrafo(datos) {
    var nodos = new Map();
    var aristas = new Map();
    var raices = [];

    function preguntaEsSuelta(qid) {
      var q = datos.questions[qid];
      if (!q) return true;
      var origenes = q.origin_posture_ids || [];
      if (origenes.length !== 1) return true;
      var p = datos.postures[origenes[0]];
      return !p || (p.question_axes || []).length !== 1;
    }

    function idDePostura(pid) {
      var p = datos.postures[pid];
      var ejes = (p && p.question_axes) || [];
      if (ejes.length > 1) return 'B:' + pid;
      if (ejes.length === 1 && preguntaEsSuelta(ejes[0])) return 'B:' + pid;
      return 'T:' + pid;
    }

    function idDePregunta(qid) { return 'P:' + qid; }

    function anfitrionDePregunta(qid) {
      if (preguntaEsSuelta(qid)) return idDePregunta(qid);
      return 'T:' + datos.questions[qid].origin_posture_ids[0];
    }

    function crear(id, tipo, posturaId, preguntaId) {
      var nodo = {
        id: id,
        tipo: tipo,
        posturaId: posturaId || null,
        preguntaId: preguntaId || null,
        postura: posturaId ? datos.postures[posturaId] : null,
        pregunta: preguntaId ? datos.questions[preguntaId] : null,
        salidas: [],
        entradas: []
      };
      nodos.set(id, nodo);
      return nodo;
    }

    Object.keys(datos.postures).forEach(function (pid) {
      var postura = datos.postures[pid];
      var ejes = postura.question_axes || [];
      var id = idDePostura(pid);
      if (id.charAt(0) === 'T') {
        var qid = ejes.length === 1 ? ejes[0] : null;
        crear(id, 'tarjeta', pid, qid);
      } else {
        crear(id, 'postura', pid, null);
      }
    });

    Object.keys(datos.questions).forEach(function (qid) {
      if (preguntaEsSuelta(qid)) crear(idDePregunta(qid), 'pregunta', null, qid);
    });

    function conectar(desde, hasta, tipo, extra) {
      if (!nodos.has(desde) || !nodos.has(hasta)) return null;
      var id = desde + '>' + hasta + '#' + (extra && extra.clave ? extra.clave : tipo);
      if (aristas.has(id)) return aristas.get(id);
      var arista = {
        id: id, desde: desde, hasta: hasta, tipo: tipo,
        clave: extra && extra.clave || null,
        etiqueta: extra && extra.etiqueta || '',
        glosa: extra && extra.glosa || null,
        preguntaId: extra && extra.preguntaId || null
      };
      aristas.set(id, arista);
      nodos.get(desde).salidas.push(arista);
      nodos.get(hasta).entradas.push(arista);
      return arista;
    }

    Object.keys(datos.postures).forEach(function (pid) {
      var id = idDePostura(pid);
      if (id.charAt(0) !== 'B') return;
      (datos.postures[pid].question_axes || []).forEach(function (qid) {
        conectar(id, idDePregunta(qid), 'eje', { preguntaId: qid });
      });
    });

    Object.keys(datos.questions).forEach(function (qid) {
      var pregunta = datos.questions[qid];
      var desde = anfitrionDePregunta(qid);
      (pregunta.answers || []).forEach(function (respuesta) {
        conectar(desde, idDePostura(respuesta.target_posture_id), 'respuesta', {
          clave: respuesta.key,
          etiqueta: respuesta.label,
          glosa: respuesta.gloss,
          preguntaId: qid
        });
      });
    });

    (datos.root_postures || []).forEach(function (pid) { raices.push(idDePostura(pid)); });
    if (!raices.length) {
      (datos.root_questions || []).forEach(function (qid) { raices.push(anfitrionDePregunta(qid)); });
    }
    if (!raices.length) {
      nodos.forEach(function (nodo, id) { if (!nodo.entradas.length) raices.push(id); });
    }

    return {
      datos: datos,
      nodos: nodos,
      aristas: aristas,
      raices: raices,
      idDePostura: idDePostura,
      idDePregunta: idDePregunta,
      anfitrionDePregunta: anfitrionDePregunta,
      preguntaEsSuelta: preguntaEsSuelta
    };
  }

  /* Cuántos nodos distintos cuelgan de cada nodo, en el árbol entero y no solo
     en lo que está desplegado. Las ramas se comparten (convergencias), así que
     se unen conjuntos en vez de sumar: un nodo al que se llega por dos caminos
     se cuenta una vez. Se memoriza en el propio grafo, que es inmutable
     mientras no se reconstruya. */
  function descendientesPorNodo(grafo) {
    if (grafo.conteoDescendientes) return grafo.conteoDescendientes;
    var bajo = new Map();
    function recoger(id) {
      if (bajo.has(id)) return bajo.get(id);
      var acumulado = new Set();
      bajo.set(id, acumulado);
      var nodo = grafo.nodos.get(id);
      if (nodo) {
        nodo.salidas.forEach(function (arista) {
          acumulado.add(arista.hasta);
          recoger(arista.hasta).forEach(function (nieto) { acumulado.add(nieto); });
        });
      }
      return acumulado;
    }
    var conteo = new Map();
    grafo.nodos.forEach(function (_, id) { conteo.set(id, recoger(id).size); });
    grafo.conteoDescendientes = conteo;
    return conteo;
  }

  /* Cuántos nodos abre cada respuesta: el nodo al que lleva, más todo lo que
     cuelga de él. Es lo que se anuncia en su botón antes de pulsarlo. Con
     convergencias dos respuestas hermanas pueden compartir parte del subárbol,
     así que sus pesos pueden sumar más que el conteo del nodo padre, que no
     cuenta dos veces lo compartido. */
  function pesoDeRespuestas(grafo) {
    if (grafo.pesoRespuestas) return grafo.pesoRespuestas;
    var debajo = descendientesPorNodo(grafo);
    var pesos = {};
    grafo.aristas.forEach(function (arista) {
      if (arista.tipo !== 'respuesta' || !arista.preguntaId || !arista.clave) return;
      pesos[arista.preguntaId + ':' + arista.clave] = 1 + (debajo.get(arista.hasta) || 0);
    });
    grafo.pesoRespuestas = pesos;
    return pesos;
  }

  /* true legacy = árbol completo; false/omitido = cuestionario. */
  function normalizarDivulgacion(valor) {
    if (valor === true) return 'completo';
    if (valor === false || valor == null) return 'cuestionario';
    if (valor === 'cuestionario' || valor === 'limpio'
      || valor === 'exploracion' || valor === 'completo') return valor;
    return 'cuestionario';
  }

  /* Divulgación progresiva. En cuestionario, responder revela TODAS las
     posturas destino (también la no elegida). En limpio, solo la elegida.
     En exploración, un conjunto de nodos expandidos abre todas sus salidas. */
  function nodosVisibles(grafo, respuestas, divulgacion, expandidos) {
    var modo = normalizarDivulgacion(divulgacion);
    var visibles = new Set();
    if (modo === 'completo') {
      grafo.nodos.forEach(function (_, id) { visibles.add(id); });
      return visibles;
    }
    var pila = grafo.raices.slice();
    while (pila.length) {
      var id = pila.pop();
      if (visibles.has(id)) continue;
      visibles.add(id);
      var nodo = grafo.nodos.get(id);
      if (!nodo) continue;
      var abierto;
      if (modo === 'exploracion') {
        abierto = !!(expandidos && expandidos.has(id));
      } else {
        abierto = nodo.tipo === 'postura'
          || (nodo.preguntaId && respuestas[nodo.preguntaId] != null);
      }
      if (!abierto) continue;
      nodo.salidas.forEach(function (arista) {
        if (modo === 'limpio' && arista.tipo === 'respuesta'
          && respuestas[arista.preguntaId] !== arista.clave) return;
        pila.push(arista.hasta);
      });
    }
    return visibles;
  }

  function aristasVisibles(grafo, visibles, respuestas, divulgacion) {
    var modo = normalizarDivulgacion(divulgacion);
    var resultado = new Set();
    grafo.aristas.forEach(function (arista, id) {
      if (!visibles.has(arista.desde) || !visibles.has(arista.hasta)) return;
      if (arista.tipo === 'eje' || modo === 'completo' || modo === 'exploracion') {
        resultado.add(id);
        return;
      }
      if (respuestas[arista.preguntaId] == null) return;
      if (modo === 'limpio' && respuestas[arista.preguntaId] !== arista.clave) return;
      resultado.add(id);
    });
    return resultado;
  }

  /* Nodos del recorrido que el usuario eligió (sin las ramas gemelas). */
  function nodosEnCaminoElegido(grafo, respuestas) {
    return nodosVisibles(grafo, respuestas, 'limpio');
  }

  /* Subárbol de cada respuesta no elegida: visible pero no interactivo. */
  function marcarSubarbol(grafo, id, conjunto, visibles, camino) {
    if (!id || conjunto.has(id)) return;
    if (camino && camino.has(id)) return;
    if (visibles && !visibles.has(id)) return;
    conjunto.add(id);
    var nodo = grafo.nodos.get(id);
    if (!nodo) return;
    nodo.salidas.forEach(function (arista) {
      marcarSubarbol(grafo, arista.hasta, conjunto, visibles, camino);
    });
  }

  function nodosDeshabilitados(grafo, respuestas, visibles) {
    var deshab = new Set();
    if (!grafo || !respuestas) return deshab;
    var camino = nodosEnCaminoElegido(grafo, respuestas);
    grafo.nodos.forEach(function (nodo) {
      if (!nodo.preguntaId) return;
      var clave = respuestas[nodo.preguntaId];
      if (clave == null) return;
      nodo.salidas.forEach(function (arista) {
        if (arista.tipo !== 'respuesta') return;
        if (arista.clave === clave) return;
        marcarSubarbol(grafo, arista.hasta, deshab, visibles, camino);
      });
    });
    return deshab;
  }

  /* Borra, sobre el objeto recibido, toda respuesta cuya pregunta ya no es
     alcanzable desde la raíz. Itera hasta el punto fijo porque cada respuesta
     que se cae puede dejar huérfanas a otras más profundas.
     Devuelve la lista de preguntas podadas. */
  function podarInalcanzables(grafo, respuestas) {
    var podadas = [];
    var seguir = true;
    while (seguir) {
      seguir = false;
      var visibles = nodosVisibles(grafo, respuestas, false);
      Object.keys(respuestas).forEach(function (preguntaId) {
        var anfitrion = grafo.anfitrionDePregunta(preguntaId);
        if (visibles.has(anfitrion)) return;
        delete respuestas[preguntaId];
        podadas.push(preguntaId);
        seguir = true;
      });
    }
    return podadas;
  }

  /* ------------------------------------------------------------ estado --- */

  var Estado = {
    datos: null,
    grafo: null,

    respuestas: {},          // respuestas del usuario: { Q1: 'A' }
    superpuestas: {},        // respuestas derivadas del explorador de creencias
    resaltados: new Set(),   // Ctrl + clic
    fijados: {},             // { idNodo: {x, y} }
    seleccionado: null,

    camara: { x: 0, y: 0, k: 1 },
    camaraRestaurada: false,
    tema: 'oscuro',
    divulgacion: 'cuestionario', // cuestionario | limpio | exploracion | completo
    arbolCompleto: false,    // espejo de divulgacion === 'completo' (URL y tests)
    expandidos: new Set(),   // nodos abiertos en exploración libre
    modo: 'libre',           // 'libre' | 'explorador'  (explorador de creencias)
    vista: 'grafo',          // 'grafo' | 'lista'
    panelAbierto: false,
    pestana: 'detalle',
    panelAncho: 540,
    compactoCreencias: true,

    tradiciones: [],         // nombres canónicos seleccionados
    posturasSueltas: [],     // ids de posturas elegidas una por una, no por su tradición
    soloDesacuerdos: false,
    profundidad: 0,
    musica: false,

    _oyentes: [],

    suscribir: function (fn) { this._oyentes.push(fn); },
    emitir: function (motivo) {
      var self = this;
      this._oyentes.forEach(function (fn) { fn(motivo, self); });
      this.guardar();
    },

    /* En el explorador, las respuestas derivadas de la tradición abren el
       camino, pero una respuesta que el usuario eligió a mano siempre manda:
       la visibilidad no sufre, porque responder revela todas las posturas
       destino, también la que la tradición no toma. */
    respuestasEfectivas: function () {
      if (this.modo !== 'explorador') return this.respuestas;
      var mezcla = {};
      var clave;
      for (clave in this.superpuestas) mezcla[clave] = this.superpuestas[clave];
      for (clave in this.respuestas) mezcla[clave] = this.respuestas[clave];
      return mezcla;
    },

    visibles: function () {
      return nodosVisibles(this.grafo, this.respuestasEfectivas(),
        this.divulgacion, this.expandidos);
    },

    aristasDe: function (visibles) {
      return aristasVisibles(this.grafo, visibles, this.respuestasEfectivas(),
        this.divulgacion);
    },

    caminoElegido: function () {
      return nodosEnCaminoElegido(this.grafo, this.respuestasEfectivas());
    },

    fijarDivulgacion: function (valor) {
      var anterior = this.divulgacion;
      var siguiente = normalizarDivulgacion(valor);
      if (siguiente === 'exploracion' && anterior !== 'exploracion') {
        this.sembrarExpandidos(anterior);
      }
      this.divulgacion = siguiente;
      this.arbolCompleto = siguiente === 'completo';
      this.emitir('divulgacion');
    },

    /* Al entrar en exploración libre, los nodos que ya tenían hijos a la vista
       quedan expandidos para no colapsar el árbol que el usuario construyó. */
    sembrarExpandidos: function (desdeModo) {
      var visibles = nodosVisibles(this.grafo, this.respuestasEfectivas(),
        desdeModo || 'cuestionario', this.expandidos);
      var sembrados = new Set();
      visibles.forEach(function (id) {
        var nodo = this.grafo.nodos.get(id);
        if (!nodo || !nodo.salidas.length) return;
        var tieneHijoVisible = nodo.salidas.some(function (arista) {
          return visibles.has(arista.hasta);
        });
        if (tieneHijoVisible) sembrados.add(id);
      }, this);
      this.expandidos = sembrados;
    },

    alternarExpandido: function (nodoId) {
      if (this.expandidos.has(nodoId)) this.expandidos.delete(nodoId);
      else this.expandidos.add(nodoId);
      this.emitir('expandir');
    },

    responder: function (preguntaId, clave) {
      if (this.divulgacion === 'cuestionario' && this.grafo) {
        var anfitrion = this.grafo.anfitrionDePregunta(preguntaId);
        var camino = nodosEnCaminoElegido(this.grafo, this.respuestasEfectivas());
        if (anfitrion && !camino.has(anfitrion)) return;
      }
      var anterior = this.respuestas[preguntaId];
      if (anterior && anterior !== clave) {
        delete this.respuestas[preguntaId];
        delete this.superpuestas[preguntaId];
        podarInalcanzables(this.grafo, this.respuestas);
      }
      this.respuestas[preguntaId] = clave;
      this.limpiarHuérfanos();
      this.emitir('respuesta');
    },

    /* Cuántas respuestas se perderían al podar desde esta pregunta. Sirve para
       que el diálogo de confirmación diga exactamente qué se va a borrar. */
    alcanceDePoda: function (preguntaId) {
      var copia = {};
      var clave;
      for (clave in this.respuestas) copia[clave] = this.respuestas[clave];
      delete copia[preguntaId];
      var podadas = podarInalcanzables(this.grafo, copia);
      return { respuestas: podadas.length + 1, descendientes: podadas };
    },

    /* Papelera: deshace la respuesta del nodo y borra también las respuestas
       del subárbol que dependía de ella. Sin esa cascada, las respuestas
       descendientes seguían guardadas y la rama entera reaparecía intacta al
       volver a responder la misma pregunta. Los nodos que siguen alcanzados
       por otra rama conservan su respuesta. */
    limpiarHuérfanos: function () {
      var visibles = nodosVisibles(this.grafo, this.respuestas, false);
      var self = this;
      Object.keys(this.fijados).forEach(function (id) {
        if (!visibles.has(id)) delete self.fijados[id];
      });
      Array.from(this.resaltados).forEach(function (id) {
        if (!visibles.has(id)) self.resaltados.delete(id);
      });
      if (this.seleccionado && !visibles.has(this.seleccionado)) this.seleccionado = null;
    },

    borrarRespuesta: function (preguntaId) {
      delete this.respuestas[preguntaId];
      delete this.superpuestas[preguntaId];
      podarInalcanzables(this.grafo, this.respuestas);
      this.limpiarHuérfanos();
      this.emitir('respuesta');
    },

    desanclar: function (nodoId) {
      delete this.fijados[nodoId];
      this.emitir('fijado');
    },

    limpiarResaltados: function () {
      this.resaltados = new Set();
      this.emitir('resaltado');
    },

    alternarResaltado: function (nodoId) {
      if (this.resaltados.has(nodoId)) this.resaltados.delete(nodoId);
      else this.resaltados.add(nodoId);
      this.emitir('resaltado');
    },

    seleccionar: function (nodoId) {
      this.seleccionado = nodoId;
      this.emitir('seleccion');
    },

    fijar: function (nodoId, punto) {
      this.fijados[nodoId] = { x: punto.x, y: punto.y };
      this.emitir('fijado');
    },

    liberarTodos: function () {
      this.fijados = {};
      this.emitir('fijado');
    },

    reiniciar: function () {
      this.respuestas = {};
      this.superpuestas = {};
      this.resaltados = new Set();
      this.fijados = {};
      this.seleccionado = null;
      this.tradiciones = [];
      this.posturasSueltas = [];
      this.modo = 'libre';
      this.divulgacion = 'cuestionario';
      this.arbolCompleto = false;
      this.expandidos = new Set();
      this.emitir('reinicio');
    },

    /* ------------------------------------------------------ persistencia - */

    guardar: function () {
      try {
        global.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify({
          respuestas: this.respuestas,
          resaltados: Array.from(this.resaltados),
          fijados: this.fijados,
          camara: this.camara,
          tema: this.tema,
          divulgacion: this.divulgacion,
          arbolCompleto: this.arbolCompleto,
          expandidos: Array.from(this.expandidos),
          modo: this.modo,
          vista: this.vista,
          panelAbierto: this.panelAbierto,
          pestana: this.pestana,
          panelAncho: this.panelAncho,
          compactoCreencias: this.compactoCreencias,
          tradiciones: this.tradiciones,
          posturasSueltas: this.posturasSueltas,
          soloDesacuerdos: this.soloDesacuerdos,
          profundidad: this.profundidad
        }));
      } catch (error) { /* modo privado o cuota llena: seguimos sin persistir */ }
    },

    /* Borra lo persistido. Lo usan «Reiniciar» y el arranque con ?limpio=1. */
    olvidar: function () {
      try { global.localStorage.removeItem(CLAVE_ALMACEN); } catch (error) { /* nada que hacer */ }
    },

    cargar: function () {
      var crudo = null;
      try { crudo = global.localStorage.getItem(CLAVE_ALMACEN); } catch (error) { return; }
      if (!crudo) return;
      var guardado;
      try { guardado = JSON.parse(crudo); } catch (error) { return; }
      if (!guardado || typeof guardado !== 'object') return;

      if (guardado.respuestas) this.respuestas = guardado.respuestas;
      if (Array.isArray(guardado.resaltados)) this.resaltados = new Set(guardado.resaltados);
      if (guardado.fijados) this.fijados = guardado.fijados;
      if (guardado.camara) { this.camara = guardado.camara; this.camaraRestaurada = true; }
      if (guardado.tema) this.tema = guardado.tema;
      if (guardado.divulgacion) {
        this.divulgacion = normalizarDivulgacion(guardado.divulgacion);
        this.arbolCompleto = this.divulgacion === 'completo';
      } else if (typeof guardado.arbolCompleto === 'boolean') {
        this.arbolCompleto = guardado.arbolCompleto;
        this.divulgacion = guardado.arbolCompleto ? 'completo' : 'cuestionario';
      }
      if (Array.isArray(guardado.expandidos)) this.expandidos = new Set(guardado.expandidos);
      if (typeof guardado.panelAncho === 'number') {
        this.panelAncho = guardado.panelAncho === 396 ? 540 : guardado.panelAncho;
      }
      if (typeof guardado.compactoCreencias === 'boolean') {
        this.compactoCreencias = guardado.compactoCreencias;
      }
      if (guardado.modo) this.modo = guardado.modo;
      if (guardado.vista) this.vista = guardado.vista;
      if (typeof guardado.panelAbierto === 'boolean') this.panelAbierto = guardado.panelAbierto;
      if (guardado.pestana) this.pestana = guardado.pestana;
      if (Array.isArray(guardado.tradiciones)) this.tradiciones = guardado.tradiciones;
      if (Array.isArray(guardado.posturasSueltas)) this.posturasSueltas = guardado.posturasSueltas;
      if (typeof guardado.soloDesacuerdos === 'boolean') this.soloDesacuerdos = guardado.soloDesacuerdos;
      if (typeof guardado.profundidad === 'number') this.profundidad = guardado.profundidad;
    },

    /* Descarta referencias a nodos o preguntas que ya no existen tras
       regenerar el JSON desde el Markdown. */
    sanear: function () {
      var self = this;
      Object.keys(this.respuestas).forEach(function (qid) {
        if (!self.datos.questions[qid]) delete self.respuestas[qid];
      });
      Array.from(this.resaltados).forEach(function (id) {
        if (!self.grafo.nodos.has(id)) self.resaltados.delete(id);
      });
      Object.keys(this.fijados).forEach(function (id) {
        if (!self.grafo.nodos.has(id)) delete self.fijados[id];
      });
      this.tradiciones = this.tradiciones.filter(function (nombre) {
        return !!self.datos.traditions_index[nombre];
      });
      this.posturasSueltas = this.posturasSueltas.filter(function (pid) {
        return !!self.datos.postures[pid];
      });
      if (this.seleccionado && !this.grafo.nodos.has(this.seleccionado)) this.seleccionado = null;
    }
  };

  Arbol.CLAVE_ALMACEN = CLAVE_ALMACEN;
  Arbol.podarInalcanzables = podarInalcanzables;
  Arbol.construirGrafo = construirGrafo;
  Arbol.descendientesPorNodo = descendientesPorNodo;
  Arbol.pesoDeRespuestas = pesoDeRespuestas;
  Arbol.nodosVisibles = nodosVisibles;
  Arbol.aristasVisibles = aristasVisibles;
  Arbol.nodosEnCaminoElegido = nodosEnCaminoElegido;
  Arbol.nodosDeshabilitados = nodosDeshabilitados;
  Arbol.Estado = Estado;

})(window);

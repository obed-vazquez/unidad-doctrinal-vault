/* Búsqueda inversa por tradición y armado del Modo de Razonamiento y
   Comparación. Aquí vive la herencia causal ascendente: si una tradición
   sostiene una postura hoja, se infiere que sostiene todas las posturas y
   respuestas del camino que lleva a ella desde la raíz. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var LIMITE_CAMINOS = 64;

  // Rango U+0300–U+036F: las marcas diacríticas que NFD deja sueltas, para que
  // «Judaismo» encuentre «Judaísmo». Los caracteres del literal no son visibles.
  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  function listaTradiciones(datos) {
    var indice = datos.traditions_index || {};
    return Object.keys(indice).map(function (nombre) {
      var entrada = indice[nombre];
      return {
        tipo: 'tradicion',
        id: 'tradicion:' + nombre,
        nombre: entrada.canonical_name,
        alias: entrada.aliases || [],
        posturaIds: entrada.posture_ids || [],
        tentativa: !!entrada.tentative,
        busqueda: normalizar([entrada.canonical_name].concat(entrada.aliases || []).join(' '))
      };
    }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  }

  /* §9.4: toda postura nombrada con respuestas asignadas (las que cuelgan de
     al menos una respuesta del árbol), tenga tradición o no. Las afiliadas
     también se listan: son elegibles una por una, sin arrastrar consigo el
     resto de las posturas de su tradición. */
  function listaPosturasSueltas(datos, grafo) {
    return Object.keys(datos.postures).filter(function (pid) {
      var postura = datos.postures[pid];
      if (postura.is_unnamed) return false;
      if (postura.is_root) return false;
      var nodo = grafo.nodos.get(grafo.idDePostura(pid));
      return !!(nodo && nodo.entradas.length);
    }).map(function (pid) {
      var postura = datos.postures[pid];
      return {
        tipo: 'postura',
        id: 'postura:' + pid,
        nombre: postura.label,
        alias: [],
        posturaIds: [pid],
        tentativa: false,
        sugerida: !!postura.is_suggested,
        busqueda: normalizar(postura.label)
      };
    }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  }

  function filtrar(lista, texto) {
    var consulta = normalizar(texto);
    if (!consulta) return lista;
    return lista.filter(function (elemento) {
      return elemento.busqueda.indexOf(consulta) !== -1;
    });
  }

  /* Todos los caminos raíz → nodo destino. El grafo es acíclico y pequeño;
     el guardia de pila y el límite solo evitan sorpresas si el Markdown
     llegara a introducir un ciclo. */
  function caminosHacia(grafo, destinoId) {
    var resultados = [];
    var pilaNodos = [];
    var pilaAristas = [];
    var enPila = new Set();

    function explorar(id) {
      if (resultados.length >= LIMITE_CAMINOS || enPila.has(id)) return;
      pilaNodos.push(id);
      enPila.add(id);
      if (id === destinoId) {
        resultados.push({ nodos: pilaNodos.slice(), aristas: pilaAristas.slice() });
      } else {
        var nodo = grafo.nodos.get(id);
        if (nodo) {
          nodo.salidas.forEach(function (arista) {
            pilaAristas.push(arista);
            explorar(arista.hasta);
            pilaAristas.pop();
          });
        }
      }
      pilaNodos.pop();
      enPila.delete(id);
    }

    grafo.raices.forEach(explorar);
    return resultados;
  }

  var cacheCaminos = new Map();

  function caminosCache(grafo, destinoId) {
    if (cacheCaminos.has(destinoId)) return cacheCaminos.get(destinoId);
    var caminos = caminosHacia(grafo, destinoId);
    cacheCaminos.set(destinoId, caminos);
    return caminos;
  }

  function limpiarCache() { cacheCaminos.clear(); }

  /* Resuelve un sujeto de comparación (tradición, postura suelta o el propio
     recorrido del usuario) a su conjunto de nodos, aristas y respuestas. */
  function resolver(grafo, datos, sujeto) {
    if (sujeto.tipo === 'usuario') {
      return resolverDesdeRespuestas(grafo, sujeto);
    }

    var nodos = new Set();
    var aristas = new Set();
    var aristasFinales = new Set();
    var respuestas = {};
    var opciones = {};
    var ambiguas = new Set();
    var sinCamino = [];

    sujeto.posturaIds.forEach(function (pid) {
      var destino = grafo.idDePostura(pid);
      var caminos = caminosCache(grafo, destino);
      if (!caminos.length) { sinCamino.push(pid); return; }
      caminos.forEach(function (camino) {
        camino.nodos.forEach(function (id) { nodos.add(id); });
        camino.aristas.forEach(function (arista) {
          aristas.add(arista.id);
          if (arista.tipo !== 'respuesta' || !arista.preguntaId) return;
          // Antes de un punto de convergencia hay más de un camino válido:
          // guardamos todas las respuestas que llevan a la misma postura en
          // vez de quedarnos con una arbitraria.
          if (!opciones[arista.preguntaId]) opciones[arista.preguntaId] = [];
          if (opciones[arista.preguntaId].indexOf(arista.clave) === -1) {
            opciones[arista.preguntaId].push(arista.clave);
          }
          if (respuestas[arista.preguntaId] === undefined) {
            respuestas[arista.preguntaId] = arista.clave;
          } else if (respuestas[arista.preguntaId] !== arista.clave) {
            ambiguas.add(arista.preguntaId);
          }
        });
        var ultima = camino.aristas[camino.aristas.length - 1];
        if (ultima) aristasFinales.add(ultima.id);
      });
    });

    Object.keys(opciones).forEach(function (qid) { opciones[qid].sort(); });

    var tentativaPorPostura = new Set();
    sujeto.posturaIds.forEach(function (pid) {
      var postura = datos.postures[pid];
      var adhesion = (postura.traditions || []).filter(function (t) {
        return t.name === sujeto.nombre;
      })[0];
      if (sujeto.tentativa || (adhesion && adhesion.is_tentative)) tentativaPorPostura.add(pid);
    });

    var aristasTentativas = new Set();
    if (tentativaPorPostura.size) {
      tentativaPorPostura.forEach(function (pid) {
        var destino = grafo.idDePostura(pid);
        var nodo = grafo.nodos.get(destino);
        if (!nodo) return;
        nodo.entradas.forEach(function (arista) {
          if (aristasFinales.has(arista.id)) aristasTentativas.add(arista.id);
        });
      });
    }

    return {
      sujeto: sujeto,
      nodos: nodos,
      aristas: aristas,
      aristasTentativas: aristasTentativas,
      respuestas: respuestas,
      opciones: opciones,
      ambiguas: ambiguas,
      sinCamino: sinCamino,
      destinos: new Set(sujeto.posturaIds.map(function (pid) { return grafo.idDePostura(pid); }))
    };
  }

  /* El recorrido propio del usuario se dibuja desde sus respuestas, sin
     buscar caminos: ya son un camino. */
  function resolverDesdeRespuestas(grafo, sujeto) {
    var respuestas = sujeto.respuestas || {};
    var nodos = new Set();
    var aristas = new Set();
    var destinos = new Set();
    var opciones = {};
    var pila = grafo.raices.slice();
    while (pila.length) {
      var id = pila.pop();
      if (nodos.has(id)) continue;
      nodos.add(id);
      var nodo = grafo.nodos.get(id);
      if (!nodo) continue;
      nodo.salidas.forEach(function (arista) {
        if (arista.tipo === 'eje') { aristas.add(arista.id); pila.push(arista.hasta); return; }
        if (respuestas[arista.preguntaId] !== arista.clave) return;
        aristas.add(arista.id);
        opciones[arista.preguntaId] = [arista.clave];
        destinos.add(arista.hasta);
        pila.push(arista.hasta);
      });
    }
    return {
      sujeto: sujeto,
      nodos: nodos,
      aristas: aristas,
      aristasTentativas: new Set(),
      respuestas: respuestas,
      opciones: opciones,
      ambiguas: new Set(),
      sinCamino: [],
      destinos: destinos
    };
  }

  /* Unión de las resoluciones: lo que el explorador debe desplegar e iluminar. */
  function combinar(resoluciones) {
    var nodos = new Set();
    var aristas = new Set();
    var aristasTentativas = new Set();
    var respuestas = {};
    var destinos = new Set();
    resoluciones.forEach(function (resolucion) {
      resolucion.nodos.forEach(function (id) { nodos.add(id); });
      resolucion.aristas.forEach(function (id) { aristas.add(id); });
      resolucion.aristasTentativas.forEach(function (id) { aristasTentativas.add(id); });
      resolucion.destinos.forEach(function (id) { destinos.add(id); });
      Object.keys(resolucion.respuestas).forEach(function (qid) {
        if (respuestas[qid] === undefined) respuestas[qid] = resolucion.respuestas[qid];
      });
    });
    return {
      nodos: nodos, aristas: aristas, aristasTentativas: aristasTentativas,
      respuestas: respuestas, destinos: destinos
    };
  }

  /* ------------------------------------- lista anidada de razonamiento --- */

  function construirLista(grafo, datos, resoluciones, profundidadMaxima) {
    var union = new Set();
    resoluciones.forEach(function (resolucion) {
      resolucion.nodos.forEach(function (id) { union.add(id); });
    });
    var visitados = new Set();

    function etiquetaRespuesta(pregunta, clave) {
      var elegida = (pregunta.answers || []).filter(function (r) { return r.key === clave; })[0];
      return elegida || null;
    }

    function construir(id, profundidad) {
      var nodo = grafo.nodos.get(id);
      if (!nodo) return null;
      var repetido = visitados.has(id);
      visitados.add(id);

      var pregunta = nodo.pregunta;
      var respuestas = resoluciones.map(function (resolucion) {
        if (!resolucion.nodos.has(id)) return { sujeto: resolucion.sujeto, ausente: true };
        if (!pregunta) return { sujeto: resolucion.sujeto, ausente: false, sinPregunta: true };
        var claves = resolucion.opciones[pregunta.id];
        if (!claves || !claves.length) return { sujeto: resolucion.sujeto, ausente: true };
        var opcionesElegidas = claves.map(function (clave) {
          return etiquetaRespuesta(pregunta, clave);
        });
        return {
          sujeto: resolucion.sujeto,
          clave: claves[0],
          claves: claves,
          // Una firma por conjunto de respuestas: dos sujetos que aceptan las
          // mismas dos ramas de una convergencia siguen estando de acuerdo.
          firma: claves.join('+'),
          etiqueta: opcionesElegidas.map(function (opcion, indice) {
            return opcion ? opcion.label : claves[indice];
          }).join(' / '),
          glosa: opcionesElegidas.filter(Boolean).map(function (opcion) {
            return opcion.gloss;
          }).filter(Boolean).join(' · ') || null,
          ambigua: claves.length > 1,
          ausente: false
        };
      });

      var presentes = respuestas.filter(function (r) { return !r.ausente && r.firma; });
      var acuerdo = 'ninguno';
      if (presentes.length > 1) {
        var primera = presentes[0].firma;
        var iguales = presentes.every(function (r) { return r.firma === primera; });
        acuerdo = iguales ? 'consenso' : 'divergencia';
      } else if (presentes.length === 1) {
        acuerdo = 'unico';
      }

      var entrada = {
        nodoId: id,
        tipo: nodo.tipo,
        profundidad: profundidad,
        repetido: repetido,
        posturaId: nodo.posturaId,
        posturaEtiqueta: nodo.postura ? Arbol.Layout.rotuloPostura(nodo.postura) : origenesDe(nodo, datos),
        preguntaId: pregunta ? pregunta.id : null,
        formal: pregunta ? pregunta.formal_text : null,
        coloquial: pregunta ? pregunta.colloquial_hint : null,
        tradiciones: nodo.postura ? (nodo.postura.traditions || []) : [],
        respuestas: respuestas,
        acuerdo: acuerdo,
        hijos: []
      };

      if (repetido) return entrada;
      if (profundidadMaxima && profundidad + 1 >= profundidadMaxima) return entrada;

      nodo.salidas.forEach(function (arista) {
        if (!union.has(arista.hasta)) return;
        if (arista.tipo === 'respuesta') {
          var alguien = resoluciones.some(function (resolucion) {
            return resolucion.aristas.has(arista.id);
          });
          if (!alguien) return;
        }
        var hijo = construir(arista.hasta, profundidad + 1);
        if (hijo) {
          hijo.aristaEtiqueta = arista.etiqueta;
          hijo.aristaGlosa = arista.glosa;
          entrada.hijos.push(hijo);
        }
      });
      return entrada;
    }

    var raices = [];
    grafo.raices.forEach(function (id) {
      if (!union.has(id)) return;
      var entrada = construir(id, 0);
      if (entrada) raices.push(entrada);
    });
    return raices;
  }

  function origenesDe(nodo, datos) {
    if (!nodo.pregunta) return '';
    return (nodo.pregunta.origin_posture_ids || []).map(function (pid) {
      return Arbol.Layout.rotuloPostura(datos.postures[pid]);
    }).join(' & ');
  }

  function aplanar(entradas, salida) {
    salida = salida || [];
    entradas.forEach(function (entrada) {
      salida.push(entrada);
      aplanar(entrada.hijos, salida);
    });
    return salida;
  }

  /* §9.3: en la vista comparativa cada pregunta aparece una única vez. El
     árbol anidado sí repite el nodo convergente para no mentir sobre la
     estructura, pero esas repeticiones van marcadas y aquí se descartan. */
  function preguntasUnicas(entradas) {
    return aplanar(entradas).filter(function (entrada) {
      return entrada.preguntaId && !entrada.repetido;
    });
  }

  /* -------------------------------------------------------- exportación -- */

  function celdaCSV(valor) {
    var texto = valor == null ? '' : String(valor);
    return '"' + texto.replace(/"/g, '""') + '"';
  }

  function aCSV(entradas, sujetos) {
    var filas = preguntasUnicas(entradas);
    var cabecera = ['Nivel', 'Pregunta (ID)', 'Postura', 'Pregunta formal', 'Pregunta coloquial']
      .concat(sujetos.map(function (s) { return s.nombre; }))
      .concat(['Acuerdo']);
    var lineas = [cabecera.map(celdaCSV).join(',')];
    filas.forEach(function (entrada) {
      var columnas = [
        entrada.profundidad,
        entrada.preguntaId,
        entrada.posturaEtiqueta,
        entrada.formal,
        entrada.coloquial || ''
      ].concat(entrada.respuestas.map(function (r) {
        if (r.ausente) return '';
        return r.etiqueta + (r.ambigua ? ' (múltiple)' : '');
      })).concat([entrada.acuerdo]);
      lineas.push(columnas.map(celdaCSV).join(','));
    });
    // El literal inicial es una marca de orden de bytes (U+FEFF, invisible):
    // sin ella Excel abre el CSV en ANSI y rompe los acentos.
    return '﻿' + lineas.join('\r\n') + '\r\n';
  }

  function aJSON(entradas, sujetos, datos) {
    return JSON.stringify({
      generado_por: 'arbol-web',
      documento: datos.source_document,
      version_datos: datos.version,
      sujetos: sujetos.map(function (s) {
        return { id: s.id, tipo: s.tipo, nombre: s.nombre, posturas: s.posturaIds };
      }),
      recorrido: preguntasUnicas(entradas)
        .map(function (entrada) {
          return {
            nivel: entrada.profundidad,
            pregunta_id: entrada.preguntaId,
            postura: entrada.posturaEtiqueta,
            postura_id: entrada.posturaId,
            formal: entrada.formal,
            coloquial: entrada.coloquial,
            acuerdo: entrada.acuerdo,
            respuestas: entrada.respuestas.map(function (r) {
              return {
                sujeto: r.sujeto.nombre,
                respuesta: r.ausente ? null : r.etiqueta,
                glosa: r.glosa || null,
                multiple: !!r.ambigua
              };
            })
          };
        })
    }, null, 2);
  }

  function aTextoPlano(entradas, sujetos) {
    var lineas = [];
    preguntasUnicas(entradas).forEach(function (entrada) {
      var sangria = new Array(entrada.profundidad + 1).join('  ');
      lineas.push(sangria + '- [' + entrada.posturaEtiqueta + '] ' + entrada.formal);
      if (entrada.coloquial) lineas.push(sangria + '  (' + entrada.coloquial + ')');
      entrada.respuestas.forEach(function (r) {
        if (r.ausente) return;
        lineas.push(sangria + '  · ' + r.sujeto.nombre + ': ' + r.etiqueta
          + (r.ambigua ? ' (múltiple)' : ''));
      });
    });
    if (!lineas.length) lineas.push('(sin recorrido: selecciona una tradición o responde alguna pregunta)');
    return sujetos.map(function (s) { return '# ' + s.nombre; }).join('\n') + '\n\n' + lineas.join('\n');
  }

  Arbol.Busqueda = {
    normalizar: normalizar,
    listaTradiciones: listaTradiciones,
    listaPosturasSueltas: listaPosturasSueltas,
    filtrar: filtrar,
    caminosHacia: caminosCache,
    resolver: resolver,
    combinar: combinar,
    construirLista: construirLista,
    aplanar: aplanar,
    preguntasUnicas: preguntasUnicas,
    aCSV: aCSV,
    aJSON: aJSON,
    aTextoPlano: aTextoPlano,
    limpiarCache: limpiarCache
  };

})(window);

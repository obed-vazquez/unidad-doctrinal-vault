/* Orquestador: carga de datos, ciclo de refresco (visibilidad → medida →
   layout → dibujo), panel lateral, explorador de creencias, Modo de
   Razonamiento y Comparación, atajos de teclado y tema. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol;
  var Estado = Arbol.Estado;
  var Vista = Arbol.Vista;
  var Layout = Arbol.Layout;
  var Busqueda = Arbol.Busqueda;
  var Router = Arbol.Router;

  var RUTA_JSON = 'datos/posturas-creencias.json';
  var RUTA_RESPALDO = 'datos/posturas-creencias.js';

  var dom = {};
  var resolucionesActuales = [];
  var entradasComparacion = [];
  var sujetosActuales = [];
  var plegados = {};
  var listaTradiciones = [];
  var listaPosturasSueltas = [];

  /* ------------------------------------------------------------- carga --- */

  function cargarDatos() {
    return fetch(RUTA_JSON, { cache: 'no-store' })
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
        return respuesta.json();
      })
      .catch(function () {
        // file:// bloquea fetch por CORS: caemos al gemelo .js que el
        // generador escribe junto al JSON.
        return cargarRespaldo();
      });
  }

  function cargarRespaldo() {
    return new Promise(function (resolver, rechazar) {
      var script = document.createElement('script');
      script.src = RUTA_RESPALDO;
      script.onload = function () {
        if (global.__ARBOL_POSTURAS__) resolver(global.__ARBOL_POSTURAS__);
        else rechazar(new Error('El respaldo no definió __ARBOL_POSTURAS__.'));
      };
      script.onerror = function () {
        rechazar(new Error('No se pudo leer ' + RUTA_RESPALDO));
      };
      document.head.appendChild(script);
    });
  }

  /* ---------------------------------------------------------- utilidades - */

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function avisar(mensaje) {
    dom.aviso.textContent = mensaje;
    dom.aviso.classList.add('visible');
    global.clearTimeout(avisar._temporizador);
    avisar._temporizador = global.setTimeout(function () {
      dom.aviso.classList.remove('visible');
    }, 2600);
  }

  function descargar(nombre, contenido, tipo) {
    var blob = new Blob([contenido], { type: tipo + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    global.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function copiar(texto) {
    if (global.navigator.clipboard && global.isSecureContext) {
      global.navigator.clipboard.writeText(texto).then(function () {
        avisar('Copiado al portapapeles.');
      }, function () { copiarPorSeleccion(texto); });
      return;
    }
    copiarPorSeleccion(texto);
  }

  function copiarPorSeleccion(texto) {
    // file:// no es contexto seguro: el portapapeles moderno no está
    // disponible y hay que recurrir a la selección de un textarea oculto.
    var area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var listo = false;
    try { listo = document.execCommand('copy'); } catch (error) { listo = false; }
    area.remove();
    avisar(listo ? 'Copiado al portapapeles.' : 'No se pudo copiar automáticamente.');
  }

  /* --------------------------------------------------------- explorador -- */

  function sujetosSeleccionados() {
    var sujetos = [];
    Estado.tradiciones.forEach(function (nombre) {
      var encontrada = listaTradiciones.filter(function (t) { return t.nombre === nombre; })[0];
      if (encontrada) sujetos.push(encontrada);
    });
    Estado.posturasSueltas.forEach(function (pid) {
      var encontrada = listaPosturasSueltas.filter(function (p) {
        return p.posturaIds[0] === pid;
      })[0];
      if (encontrada) sujetos.push(encontrada);
    });
    return sujetos;
  }

  function sujetoUsuario() {
    return {
      tipo: 'usuario',
      id: 'usuario',
      nombre: 'Tu recorrido',
      posturaIds: [],
      tentativa: false,
      respuestas: Estado.respuestas
    };
  }

  function calcularExploracion() {
    var sujetos = sujetosSeleccionados();
    if (Estado.modo !== 'explorador' || !sujetos.length) {
      Estado.superpuestas = {};
      return null;
    }
    var resoluciones = sujetos.map(function (sujeto) {
      return Busqueda.resolver(Estado.grafo, Estado.datos, sujeto);
    });
    var combinado = Busqueda.combinar(resoluciones);
    Estado.superpuestas = combinado.respuestas;

    var destinosTentativos = new Set();
    combinado.aristasTentativas.forEach(function (aristaId) {
      var arista = Estado.grafo.aristas.get(aristaId);
      if (arista) destinosTentativos.add(arista.hasta);
    });

    return {
      nodos: combinado.nodos,
      aristas: combinado.aristas,
      aristasTentativas: combinado.aristasTentativas,
      destinosTentativos: destinosTentativos,
      destinos: combinado.destinos,
      resoluciones: resoluciones,
      sujetos: sujetos
    };
  }

  /* ------------------------------------------------------------ refresco - */

  var caminoActual = null;

  function encuadrarCaminoActual() {
    if (!caminoActual) { Vista.encuadrar(null, true); return; }
    Vista.encuadrar(Array.from(caminoActual.nodos), true);
  }

  function refrescar() {
    var exploracion = calcularExploracion();
    caminoActual = exploracion;
    var respuestas = Estado.respuestasEfectivas();
    var visibles = Estado.visibles();
    var aristasIds = Estado.aristasDe(visibles);

    var contextoMedida = { datos: Estado.datos };
    var tamanos = new Map();
    visibles.forEach(function (id) {
      var nodo = Estado.grafo.nodos.get(id);
      var respuesta = nodo.preguntaId ? respuestas[nodo.preguntaId] : undefined;
      var compuesto = Layout.componer(nodo, respuesta == null ? null : respuesta, contextoMedida);
      tamanos.set(id, { ancho: compuesto.ancho, alto: compuesto.alto });
    });

    var disposicion = Layout.calcular(Estado.grafo, visibles, aristasIds, tamanos, Estado.fijados);

    var destacadas = new Set(Estado.tradiciones);

    Vista.render({
      grafo: Estado.grafo,
      datos: Estado.datos,
      estado: Estado,
      visibles: visibles,
      aristasIds: aristasIds,
      disposicion: disposicion,
      respuestas: respuestas,
      camino: exploracion,
      tradicionesDestacadas: destacadas
    });

    actualizarBarra(visibles);
    actualizarPanel();
    Router.escribir(Estado);
  }

  function actualizarBarra(visibles) {
    var totalNodos = Estado.grafo.nodos.size;
    var respondidas = Object.keys(Estado.respuestasEfectivas()).length;
    dom.contador.textContent = visibles.size + ' de ' + totalNodos + ' nodos · '
      + respondidas + ' de ' + Object.keys(Estado.datos.questions).length + ' preguntas';
    dom.btnCompleto.classList.toggle('activo', Estado.arbolCompleto);
    dom.btnCreencias.classList.toggle('activo', Estado.modo === 'explorador');
    dom.btnComparar.classList.toggle('activo', Estado.vista === 'lista');
    dom.panel.classList.toggle('cerrado', !Estado.panelAbierto);
    dom.panel.classList.toggle('ancho', Estado.vista === 'lista' && Estado.panelAbierto);
    Array.prototype.forEach.call(dom.pestanas, function (boton) {
      boton.classList.toggle('activa', boton.getAttribute('data-pestana') === Estado.pestana);
    });
    Array.prototype.forEach.call(dom.cuerpos, function (cuerpo) {
      cuerpo.classList.toggle('activa', cuerpo.getAttribute('data-cuerpo') === Estado.pestana);
    });
  }

  /* -------------------------------------------------------- panel: ficha - */

  function insigniasDePostura(postura) {
    var insignias = [];
    if (!postura) return insignias;
    if (postura.is_suggested) insignias.push('término sugerido');
    if (postura.is_unnamed) insignias.push('sin nombre documentado');
    if (postura.is_uncertain) insignias.push('denominación en duda');
    return insignias;
  }

  function fichaDeNodo(nodo) {
    if (!nodo) {
      return '<p class="panel-vacio">Selecciona un nodo del árbol para ver su ficha completa.</p>';
    }
    var datos = Estado.datos;
    var respuestas = Estado.respuestasEfectivas();
    var partes = [];

    var tipoRotulo = nodo.tipo === 'pregunta'
      ? (nodo.pregunta.is_convergence ? 'Pregunta convergente' : 'Pregunta de un eje')
      : (nodo.tipo === 'postura' ? 'Postura con varios ejes' : 'Postura y su pregunta');
    partes.push('<span class="ficha-tipo' + (nodo.tipo !== 'tarjeta' ? ' eje' : '') + '">'
      + escapar(tipoRotulo) + '</span>');

    var postura = nodo.postura;
    if (postura) {
      partes.push('<h2 class="ficha-titulo' + (postura.is_unnamed ? ' sin-nombre' : '') + '">'
        + escapar(Layout.rotuloPostura(postura)) + '</h2>');
      var insignias = insigniasDePostura(postura);
      if (insignias.length) {
        partes.push('<p class="panel-nota">' + escapar(insignias.join(' · ')) + '</p>');
      }
    } else if (nodo.pregunta) {
      var origenes = (nodo.pregunta.origin_posture_ids || []).map(function (pid) {
        return Layout.rotuloPostura(datos.postures[pid]);
      });
      partes.push('<h2 class="ficha-titulo">' + escapar(origenes.join(' & ')) + '</h2>');
      if (nodo.pregunta.is_convergence) {
        partes.push('<p class="panel-nota">Punto de convergencia: ' + origenes.length
          + ' posturas distintas desembocan en esta misma pregunta, que se dibuja'
          + ' como un nodo único con varias aristas entrantes.</p>');
      }
    }

    if (nodo.pregunta) {
      partes.push('<p class="ficha-formal">' + escapar(nodo.pregunta.formal_text) + '</p>');
      if (nodo.pregunta.colloquial_hint) {
        partes.push('<p class="ficha-coloquial">' + escapar(nodo.pregunta.colloquial_hint) + '</p>');
      }
      var elegida = respuestas[nodo.pregunta.id];
      partes.push('<ul class="ficha-opciones">'
        + (nodo.pregunta.answers || []).map(function (respuesta) {
          var destino = datos.postures[respuesta.target_posture_id];
          return '<li class="' + (elegida === respuesta.key ? 'elegida' : '') + '">'
            + '<b>' + escapar(respuesta.label) + '</b> → '
            + escapar(Layout.rotuloPostura(destino))
            + (respuesta.gloss ? '<span class="glosa">' + escapar(respuesta.gloss) + '</span>' : '')
            + '</li>';
        }).join('') + '</ul>');
    }

    var tradiciones = (postura && postura.traditions) || [];
    if (tradiciones.length) {
      partes.push('<h3 class="panel-subtitulo">Sostenida por</h3>');
      partes.push('<div class="etiquetas">' + tradiciones.map(function (tradicion) {
        var activa = Estado.tradiciones.indexOf(tradicion.name) !== -1;
        return '<span class="etiqueta' + (tradicion.is_tentative ? ' tentativa' : '')
          + (activa ? ' activa' : '') + '" data-tradicion="' + escapar(tradicion.name) + '">'
          + escapar(tradicion.name) + (tradicion.is_tentative ? ' (?)' : '') + '</span>';
      }).join('') + '</div>');
    } else if (postura && !postura.is_unnamed && nodo.tipo !== 'pregunta') {
      partes.push('<p class="panel-nota">Sin tradición registrada en el documento fuente.</p>');
    }

    var notas = (postura && postura.notes) || [];
    if (notas.length) {
      partes.push('<h3 class="panel-subtitulo">Notas del documento</h3>');
      partes.push('<p class="panel-nota">' + escapar(notas.join(' · ')) + '</p>');
    }

    var enlaces = (postura && postura.wikilinks) || [];
    enlaces.forEach(function (enlace) {
      if (enlace.href) {
        partes.push('<a class="enlace-nota" href="' + escapar(enlace.href) + '">'
          + escapar(enlace.label) + ' →</a>');
      } else {
        partes.push('<p class="panel-nota">Enlace a nota: [[' + escapar(enlace.target) + ']]</p>');
      }
    });

    partes.push('<dl class="ficha-datos">');
    if (postura) partes.push('<dt>Postura</dt><dd>' + escapar(postura.id) + '</dd>');
    if (nodo.pregunta) {
      partes.push('<dt>Pregunta</dt><dd>' + escapar(nodo.pregunta.id) + '</dd>');
      partes.push('<dt>Línea fuente</dt><dd>' + escapar(nodo.pregunta.source_line) + '</dd>');
    }
    if (postura && (postura.question_axes || []).length) {
      partes.push('<dt>Ejes que abre</dt><dd>' + escapar(postura.question_axes.join(', ')) + '</dd>');
    }
    partes.push('<dt>Anclado</dt><dd>'
      + (Object.prototype.hasOwnProperty.call(Estado.fijados, nodo.id) ? 'sí' : 'no') + '</dd>');
    partes.push('</dl>');

    return partes.join('');
  }

  function tooltipDeNodo(nodo) {
    if (!nodo) return null;
    var respuestas = Estado.respuestasEfectivas();
    var partes = [];
    var etiquetaPostura = nodo.postura
      ? Layout.rotuloPostura(nodo.postura)
      : (nodo.pregunta.origin_posture_ids || []).map(function (pid) {
        return Layout.rotuloPostura(Estado.datos.postures[pid]);
      }).join(' & ');

    partes.push('<h4>' + escapar(etiquetaPostura || 'Nodo') + '</h4>');

    if (nodo.pregunta) {
      partes.push('<p class="tooltip-formal">' + escapar(nodo.pregunta.formal_text) + '</p>');
      if (nodo.pregunta.colloquial_hint) {
        partes.push('<p><em>' + escapar(nodo.pregunta.colloquial_hint) + '</em></p>');
      }
      var clave = respuestas[nodo.pregunta.id];
      if (clave) {
        var elegida = (nodo.pregunta.answers || []).filter(function (r) {
          return r.key === clave;
        })[0];
        if (elegida) {
          partes.push('<p>Respuesta: <strong>' + escapar(elegida.label) + '</strong>'
            + (elegida.gloss ? ' — ' + escapar(elegida.gloss) : '') + '</p>');
        }
      }
    }

    var tradiciones = (nodo.postura && nodo.postura.traditions) || [];
    var notas = (nodo.postura && nodo.postura.notes) || [];
    partes.push('<dl>');
    partes.push('<dt>Religiones adheridas</dt><dd>'
      + (tradiciones.length
        ? tradiciones.map(function (t) {
          return escapar(t.name) + (t.is_tentative ? ' (tentativa)' : '');
        }).join(', ')
        : '—') + '</dd>');
    if (notas.length) partes.push('<dt>Nota</dt><dd>' + escapar(notas.join(' · ')) + '</dd>');
    if (nodo.pregunta) {
      partes.push('<dt>Identificadores</dt><dd>' + escapar(nodo.pregunta.id)
        + (nodo.posturaId ? ' · ' + escapar(nodo.posturaId) : '')
        + ' · línea ' + escapar(nodo.pregunta.source_line) + '</dd>');
    }
    partes.push('</dl>');
    return partes.join('');
  }

  /* ------------------------------------------------- panel: creencias ---- */

  /* §7.5: ficha completa del sujeto explorado — sus posturas, la naturaleza de
     cada adhesión y las notas históricas que el documento dejó anotadas. */
  function fichaDeSujetos() {
    var sujetos = sujetosSeleccionados();
    if (!sujetos.length) {
      return '<p class="panel-nota">Selecciona una o varias tradiciones para desplegar '
        + 'su camino en el árbol e iluminarlo desde la raíz. Puedes combinarlas con '
        + 'posturas sin afiliación para compararlas entre sí.</p>';
    }

    return '<h3 class="panel-subtitulo">Selección activa</h3>' + sujetos.map(function (sujeto) {
      var bloques = [];
      bloques.push('<div class="ficha-sujeto">');
      bloques.push('<div class="tradicion-nombre' + (sujeto.tentativa ? ' tentativa' : '') + '">'
        + escapar(sujeto.nombre) + '</div>');
      if (sujeto.alias.length) {
        bloques.push('<p class="panel-nota">También aparece como: '
          + escapar(sujeto.alias.join(' · ')) + '</p>');
      }
      if (sujeto.tipo === 'postura') {
        bloques.push('<p class="panel-nota">Postura sin tradición registrada; se compara por '
          + 'el recorrido de respuestas que la alcanza desde la raíz.</p>');
      }

      var notas = [];
      bloques.push('<ul class="ficha-opciones">' + sujeto.posturaIds.map(function (pid) {
        var postura = Estado.datos.postures[pid];
        var adhesion = (postura.traditions || []).filter(function (t) {
          return t.name === sujeto.nombre;
        })[0];
        (postura.notes || []).forEach(function (nota) { notas.push(nota); });
        var resolucion = Busqueda.resolver(Estado.grafo, Estado.datos, sujeto);
        return '<li class="elegida" data-nodo="' + escapar(Estado.grafo.idDePostura(pid)) + '">'
          + '<b>' + escapar(Layout.rotuloPostura(postura)) + '</b>'
          + (adhesion && adhesion.is_tentative ? ' <em>(adhesión tentativa)</em>' : '')
          + '<span class="glosa">' + escapar(pid) + ' · '
          + Object.keys(resolucion.respuestas).length + ' respuestas heredadas hasta la raíz'
          + '</span></li>';
      }).join('') + '</ul>');

      if (notas.length) {
        bloques.push('<h3 class="panel-subtitulo">Notas históricas</h3>');
        bloques.push('<p class="panel-nota">' + escapar(notas.join(' · ')) + '</p>');
      }
      bloques.push('</div>');
      return bloques.join('');
    }).join('');
  }

  function pintarListaCreencias() {
    dom.fichaCreencias.innerHTML = fichaDeSujetos();
    var consulta = dom.buscador.value;
    var tradiciones = Busqueda.filtrar(listaTradiciones, consulta);
    var posturas = Busqueda.filtrar(listaPosturasSueltas, consulta);

    dom.listaTradiciones.innerHTML = tradiciones.length
      ? tradiciones.map(function (tradicion) {
        var activa = Estado.tradiciones.indexOf(tradicion.nombre) !== -1;
        var meta = [];
        if (tradicion.alias.length) meta.push('También: ' + tradicion.alias.join(' · '));
        meta.push(tradicion.posturaIds.length + ' postura'
          + (tradicion.posturaIds.length === 1 ? '' : 's') + ' sostenida'
          + (tradicion.posturaIds.length === 1 ? '' : 's'));
        return '<label class="tradicion' + (activa ? ' activa' : '') + '">'
          + '<input type="checkbox" data-tradicion="' + escapar(tradicion.nombre) + '"'
          + (activa ? ' checked' : '') + '>'
          + '<span><span class="tradicion-nombre' + (tradicion.tentativa ? ' tentativa' : '') + '">'
          + escapar(tradicion.nombre) + '</span>'
          + '<span class="tradicion-meta">' + escapar(meta.join(' · ')) + '</span></span>'
          + '</label>';
      }).join('')
      : '<p class="panel-nota">Ninguna tradición coincide con la búsqueda.</p>';

    dom.notaSinAfiliacion.textContent = 'Posturas nombradas que el documento no liga a ninguna '
      + 'tradición. Se comparan por el recorrido de respuestas que lleva de la raíz hasta ellas.';

    dom.listaPosturasSueltas.innerHTML = posturas.length
      ? posturas.map(function (postura) {
        var pid = postura.posturaIds[0];
        var activa = Estado.posturasSueltas.indexOf(pid) !== -1;
        return '<label class="tradicion' + (activa ? ' activa' : '') + '">'
          + '<input type="checkbox" data-postura="' + escapar(pid) + '"'
          + (activa ? ' checked' : '') + '>'
          + '<span><span class="tradicion-nombre">' + escapar(postura.nombre) + '</span>'
          + '<span class="tradicion-meta">' + escapar(pid)
          + (postura.sugerida ? ' · término sugerido' : '') + '</span></span>'
          + '</label>';
      }).join('')
      : '<p class="panel-nota">Ninguna postura sin afiliación coincide con la búsqueda.</p>';
  }

  /* -------------------------------------------- panel: razonar y comparar */

  function pintarComparacion() {
    var sujetos = sujetosSeleccionados();
    var resoluciones;

    if (sujetos.length) {
      resoluciones = sujetos.map(function (sujeto) {
        return Busqueda.resolver(Estado.grafo, Estado.datos, sujeto);
      });
    } else {
      var usuario = sujetoUsuario();
      sujetos = [usuario];
      resoluciones = [Busqueda.resolver(Estado.grafo, Estado.datos, usuario)];
    }

    resolucionesActuales = resoluciones;
    sujetosActuales = sujetos;
    entradasComparacion = Busqueda.construirLista(
      Estado.grafo, Estado.datos, resoluciones, Estado.profundidad || 0
    );

    var planas = Busqueda.preguntasUnicas(entradasComparacion);
    var conRespuesta = planas.filter(function (entrada) {
      return entrada.acuerdo !== 'ninguno';
    });
    var divergentes = planas.filter(function (entrada) {
      return entrada.acuerdo === 'divergencia';
    });

    var html = [];
    html.push('<div class="resumen-comparacion">'
      + '<span><b>' + sujetos.length + '</b> sujeto' + (sujetos.length === 1 ? '' : 's') + '</span>'
      + '<span><b>' + conRespuesta.length + '</b> pregunta'
      + (conRespuesta.length === 1 ? '' : 's') + ' con respuesta</span>'
      + '<span><b>' + divergentes.length + '</b> desacuerdo'
      + (divergentes.length === 1 ? '' : 's') + '</span>'
      + '</div>');

    if (sujetos.length > 1) {
      html.push(tablaComparativa(planas, sujetos));
    }

    html.push('<h3 class="panel-subtitulo">Recorrido en forma de lista</h3>');
    var lista = listaAnidada(entradasComparacion);
    html.push(lista || '<p class="panel-nota">Todavía no hay recorrido: responde alguna '
      + 'pregunta del árbol o selecciona una tradición en la pestaña «Creencias».</p>');

    dom.salidaComparar.innerHTML = html.join('');
  }

  function marcaRespuesta(entrada, respuesta, mostrarSujeto) {
    if (respuesta.ausente || !respuesta.clave) {
      return '<span class="respuesta-marca ausente">'
        + (mostrarSujeto ? '<span class="sujeto">' + escapar(respuesta.sujeto.nombre) + '</span>' : '')
        + '—</span>';
    }
    var clase = 'respuesta-marca';
    if (entrada.acuerdo === 'consenso') clase += ' consenso';
    if (entrada.acuerdo === 'divergencia') clase += ' divergencia';
    var titulo = respuesta.glosa || '';
    if (respuesta.ambigua) {
      clase += ' ambigua';
      titulo = 'Ambas ramas desembocan en la misma postura (punto de convergencia), '
        + 'así que el árbol no distingue entre ellas.' + (titulo ? ' — ' + titulo : '');
    }
    return '<span class="' + clase + '" title="' + escapar(titulo) + '">'
      + (mostrarSujeto ? '<span class="sujeto">' + escapar(respuesta.sujeto.nombre) + '</span>' : '')
      + escapar(respuesta.etiqueta) + '</span>';
  }

  function listaAnidada(entradas) {
    var visibles = entradas.filter(function (entrada) {
      return !Estado.soloDesacuerdos || contieneDesacuerdo(entrada);
    });
    if (!visibles.length) return '';
    return '<ul class="lista-razonamiento">' + visibles.map(function (entrada) {
      var plegado = plegados[entrada.nodoId];
      var cuerpo = [];
      cuerpo.push('<div class="paso-cabecera">');
      cuerpo.push('<button type="button" class="paso-plegar" data-plegar="'
        + escapar(entrada.nodoId) + '">' + (plegado ? '▸' : '▾') + '</button>');
      cuerpo.push('<span class="paso-postura">' + escapar(entrada.posturaEtiqueta || '—') + '</span>');
      if (entrada.preguntaId) {
        cuerpo.push('<span class="paso-id">' + escapar(entrada.preguntaId) + '</span>');
      }
      if (entrada.repetido) cuerpo.push('<span class="paso-id">· convergencia ya listada</span>');
      cuerpo.push('</div>');

      if (entrada.formal) {
        cuerpo.push('<p class="paso-formal">' + escapar(entrada.formal) + '</p>');
        if (entrada.coloquial) {
          cuerpo.push('<p class="paso-coloquial">' + escapar(entrada.coloquial) + '</p>');
        }
        cuerpo.push('<div class="paso-respuestas">' + entrada.respuestas.map(function (respuesta) {
          return marcaRespuesta(entrada, respuesta, entrada.respuestas.length > 1);
        }).join('') + '</div>');
      }

      var hijos = listaAnidada(entrada.hijos);
      if (hijos) cuerpo.push(hijos);

      return '<li class="paso' + (plegado ? ' plegado' : '') + '" data-nodo="'
        + escapar(entrada.nodoId) + '">' + cuerpo.join('') + '</li>';
    }).join('') + '</ul>';
  }

  function contieneDesacuerdo(entrada) {
    if (entrada.acuerdo === 'divergencia') return true;
    return entrada.hijos.some(contieneDesacuerdo);
  }

  function tablaComparativa(planas, sujetos) {
    var filas = planas.filter(function (entrada) {
      if (Estado.soloDesacuerdos) return entrada.acuerdo === 'divergencia';
      return entrada.acuerdo !== 'ninguno';
    });
    if (!filas.length) {
      return '<p class="panel-nota">No hay preguntas que comparar con este filtro.</p>';
    }
    return '<h3 class="panel-subtitulo">Comparación por pregunta</h3>'
      + '<table class="tabla-comparativa"><thead><tr><th>Pregunta</th>'
      + sujetos.map(function (sujeto) { return '<th>' + escapar(sujeto.nombre) + '</th>'; }).join('')
      + '</tr></thead><tbody>'
      + filas.map(function (entrada) {
        return '<tr class="' + escapar(entrada.acuerdo) + '">'
          + '<td class="pregunta">' + escapar(entrada.coloquial || entrada.formal)
          + '<small>' + escapar(entrada.posturaEtiqueta) + ' · ' + escapar(entrada.preguntaId)
          + '</small></td>'
          + entrada.respuestas.map(function (respuesta) {
            return '<td>' + marcaRespuesta(entrada, respuesta, false) + '</td>';
          }).join('')
          + '</tr>';
      }).join('')
      + '</tbody></table>';
  }

  function actualizarPanel() {
    var nodo = Estado.seleccionado ? Estado.grafo.nodos.get(Estado.seleccionado) : null;
    dom.cuerpoDetalle.innerHTML = fichaDeNodo(nodo);
    pintarListaCreencias();
    pintarComparacion();
  }

  /* ----------------------------------------------------------- acciones -- */

  function trasCambiarSujetos() {
    Estado.modo = Estado.tradiciones.length || Estado.posturasSueltas.length
      ? 'explorador' : 'libre';
    Estado.emitir('creencias');
    // El layout se anima 300 ms; encuadramos el camino cuando ya reposó.
    global.setTimeout(encuadrarCaminoActual, 330);
  }

  function alternarTradicion(nombre) {
    var indice = Estado.tradiciones.indexOf(nombre);
    if (indice === -1) Estado.tradiciones.push(nombre);
    else Estado.tradiciones.splice(indice, 1);
    trasCambiarSujetos();
  }

  function alternarPosturaSuelta(pid) {
    var indice = Estado.posturasSueltas.indexOf(pid);
    if (indice === -1) Estado.posturasSueltas.push(pid);
    else Estado.posturasSueltas.splice(indice, 1);
    trasCambiarSujetos();
  }

  function abrirPestana(nombre) {
    Estado.pestana = nombre;
    Estado.panelAbierto = true;
    Estado.emitir('panel');
  }

  function aplicarTema() {
    document.documentElement.setAttribute('data-tema', Estado.tema);
  }

  /* ------------------------------------------------------------ eventos -- */

  function registrarEventos() {
    dom.btnAjustar.addEventListener('click', function () { Vista.encuadrar(null, true); });

    dom.btnReorganizar.addEventListener('click', function () {
      Estado.liberarTodos();
      avisar('Posiciones automáticas restauradas.');
    });

    dom.btnCompleto.addEventListener('click', function () {
      Estado.arbolCompleto = !Estado.arbolCompleto;
      Estado.emitir('completo');
      if (Estado.arbolCompleto) global.setTimeout(function () { Vista.encuadrar(null, true); }, 340);
    });

    dom.btnCreencias.addEventListener('click', function () {
      if (Estado.modo === 'explorador') {
        Estado.modo = 'libre';
        Estado.tradiciones = [];
        Estado.posturasSueltas = [];
      } else {
        Estado.modo = 'explorador';
      }
      abrirPestana('creencias');
    });

    dom.btnComparar.addEventListener('click', function () {
      Estado.vista = Estado.vista === 'lista' ? 'grafo' : 'lista';
      abrirPestana(Estado.vista === 'lista' ? 'comparar' : 'detalle');
    });

    dom.btnCompartir.addEventListener('click', function () {
      copiar(Router.enlace(Estado));
    });

    dom.btnTema.addEventListener('click', function () {
      Estado.tema = Estado.tema === 'oscuro' ? 'claro' : 'oscuro';
      aplicarTema();
      Estado.emitir('tema');
    });

    dom.btnReiniciar.addEventListener('click', function () {
      Estado.reiniciar();
      avisar('Árbol reiniciado.');
      global.setTimeout(function () { Vista.encuadrar(null, true); }, 340);
    });

    dom.panelCerrar.addEventListener('click', function () {
      Estado.panelAbierto = false;
      Estado.emitir('panel');
    });

    Array.prototype.forEach.call(dom.pestanas, function (boton) {
      boton.addEventListener('click', function () {
        abrirPestana(boton.getAttribute('data-pestana'));
      });
    });

    dom.buscador.addEventListener('input', pintarListaCreencias);

    dom.fichaCreencias.addEventListener('click', function (evento) {
      var fila = evento.target.closest ? evento.target.closest('[data-nodo]') : null;
      if (!fila) return;
      var nodoId = fila.getAttribute('data-nodo');
      Estado.pestana = 'creencias';
      Estado.seleccionado = nodoId;
      Estado.emitir('seleccion');
      Vista.encuadrarNodoYDescendientes(nodoId);
    });

    dom.listaTradiciones.addEventListener('change', function (evento) {
      var nombre = evento.target.getAttribute('data-tradicion');
      if (nombre) alternarTradicion(nombre);
    });

    dom.listaPosturasSueltas.addEventListener('change', function (evento) {
      var pid = evento.target.getAttribute('data-postura');
      if (pid) alternarPosturaSuelta(pid);
    });

    dom.btnLimpiarCreencias.addEventListener('click', function () {
      Estado.tradiciones = [];
      Estado.posturasSueltas = [];
      Estado.modo = 'libre';
      Estado.emitir('creencias');
    });

    dom.btnIrComparar.addEventListener('click', function () {
      Estado.vista = 'lista';
      abrirPestana('comparar');
    });

    dom.cuerpoDetalle.addEventListener('click', function (evento) {
      var etiqueta = evento.target.closest ? evento.target.closest('[data-tradicion]') : null;
      if (!etiqueta) return;
      alternarTradicion(etiqueta.getAttribute('data-tradicion'));
      abrirPestana('creencias');
    });

    dom.salidaComparar.addEventListener('click', function (evento) {
      var boton = evento.target.closest ? evento.target.closest('[data-plegar]') : null;
      if (!boton) return;
      var id = boton.getAttribute('data-plegar');
      plegados[id] = !plegados[id];
      pintarComparacion();
    });

    dom.chkDesacuerdos.addEventListener('change', function () {
      Estado.soloDesacuerdos = dom.chkDesacuerdos.checked;
      Estado.emitir('comparar');
    });

    dom.selProfundidad.addEventListener('change', function () {
      Estado.profundidad = Number(dom.selProfundidad.value) || 0;
      Estado.emitir('comparar');
    });

    dom.btnCopiar.addEventListener('click', function () {
      copiar(Busqueda.aTextoPlano(entradasComparacion, sujetosActuales));
    });

    dom.btnCSV.addEventListener('click', function () {
      descargar('razonamiento-posturas.csv',
        Busqueda.aCSV(entradasComparacion, sujetosActuales), 'text/csv');
      avisar('CSV generado.');
    });

    dom.btnJSON.addEventListener('click', function () {
      descargar('razonamiento-posturas.json',
        Busqueda.aJSON(entradasComparacion, sujetosActuales, Estado.datos), 'application/json');
      avisar('JSON generado.');
    });

    global.addEventListener('keydown', function (evento) {
      if (evento.target && /^(INPUT|TEXTAREA|SELECT)$/.test(evento.target.tagName)) return;
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      var tecla = evento.key.toLowerCase();
      if (tecla === 'f') { Vista.encuadrar(null, true); }
      else if (tecla === 'r') { dom.btnReorganizar.click(); }
      else if (tecla === 'a') { dom.btnCompleto.click(); }
      else if (tecla === 'e') { dom.btnCreencias.click(); }
      else if (tecla === 'l') { dom.btnComparar.click(); }
      else if (tecla === 't') { dom.btnTema.click(); }
      else if (evento.key === 'Escape') {
        if (Estado.seleccionado) Estado.seleccionar(null);
        else if (Estado.panelAbierto) { Estado.panelAbierto = false; Estado.emitir('panel'); }
      }
    });
  }

  /* --------------------------------------------------------- arranque ---- */

  function recogerDOM() {
    dom = {
      contador: document.getElementById('contador'),
      aviso: document.getElementById('aviso'),
      cargando: document.getElementById('cargando'),
      panel: document.getElementById('panel'),
      panelCerrar: document.getElementById('panel-cerrar'),
      pestanas: document.querySelectorAll('.pestana'),
      cuerpos: document.querySelectorAll('.panel-cuerpo'),
      cuerpoDetalle: document.getElementById('cuerpo-detalle'),
      buscador: document.getElementById('buscador-tradiciones'),
      fichaCreencias: document.getElementById('ficha-creencias'),
      listaTradiciones: document.getElementById('lista-tradiciones'),
      listaPosturasSueltas: document.getElementById('lista-posturas-sueltas'),
      notaSinAfiliacion: document.getElementById('nota-sin-afiliacion'),
      salidaComparar: document.getElementById('salida-comparar'),
      chkDesacuerdos: document.getElementById('chk-desacuerdos'),
      selProfundidad: document.getElementById('sel-profundidad'),
      btnAjustar: document.getElementById('btn-ajustar'),
      btnReorganizar: document.getElementById('btn-reorganizar'),
      btnCompleto: document.getElementById('btn-completo'),
      btnCreencias: document.getElementById('btn-creencias'),
      btnComparar: document.getElementById('btn-comparar'),
      btnCompartir: document.getElementById('btn-compartir'),
      btnTema: document.getElementById('btn-tema'),
      btnReiniciar: document.getElementById('btn-reiniciar'),
      btnLimpiarCreencias: document.getElementById('btn-limpiar-creencias'),
      btnIrComparar: document.getElementById('btn-ir-comparar'),
      btnCopiar: document.getElementById('btn-copiar'),
      btnCSV: document.getElementById('btn-csv'),
      btnJSON: document.getElementById('btn-json')
    };
  }

  function mostrarError(error) {
    dom.cargando.classList.add('error');
    dom.cargando.querySelector('p').innerHTML =
      'No se pudieron cargar los datos del árbol.<br>'
      + escapar(error && error.message ? error.message : String(error)) + '<br><br>'
      + 'Genera el modelo con <code>Generar-Diagramas.cmd</code> o con '
      + '<code>python scripts/convertir_posturas_creencias.py recursos/posturas-creencias.md</code>, '
      + 'que escribe <code>datos/posturas-creencias.json</code> y su respaldo '
      + '<code>datos/posturas-creencias.js</code>.';
  }

  function iniciar(datos) {
    Estado.datos = datos;
    Estado.grafo = Arbol.construirGrafo(datos);
    Estado.cargar();

    var lectura = Router.leer();
    var aplicado = Router.aplicar(lectura, Estado);
    Estado.sanear();
    aplicarTema();

    listaTradiciones = Busqueda.listaTradiciones(datos);
    listaPosturasSueltas = Busqueda.listaPosturasSueltas(datos, Estado.grafo);

    // Un enlace compartido que nombra creencias debe abrir su ficha.
    if ((lectura.tradiciones || lectura.posturas) && Estado.modo === 'explorador') {
      Estado.panelAbierto = true;
      Estado.pestana = Estado.vista === 'lista' ? 'comparar' : 'creencias';
    }

    dom.chkDesacuerdos.checked = Estado.soloDesacuerdos;
    dom.selProfundidad.value = String(Estado.profundidad || 0);

    Vista.iniciar({
      alResponder: function (preguntaId, clave) { Estado.responder(preguntaId, clave); },
      alBorrar: function (preguntaId) { Estado.borrarRespuesta(preguntaId); },
      alSeleccionar: function (nodoId) { Estado.seleccionar(nodoId); },
      alResaltar: function (nodoId) { Estado.alternarResaltado(nodoId); },
      alFijar: function (nodoId, punto) { Estado.fijar(nodoId, punto); },
      alCambiarCamara: function (camara) { Estado.camara = camara; },
      tooltipHTML: tooltipDeNodo,
      margenDerecho: function () {
        return Estado.panelAbierto ? dom.panel.getBoundingClientRect().width + 34 : 40;
      }
    });

    Estado.suscribir(function () { refrescar(); });
    registrarEventos();

    refrescar();

    // La URL manda sobre localStorage, y localStorage sobre el encuadre inicial.
    if (lectura.camara || (Estado.camaraRestaurada && !aplicado.huboCambio)) {
      Vista.fijarCamara(Estado.camara);
    } else {
      Vista.encuadrar(null, false);
    }

    dom.cargando.classList.add('oculto');
  }

  document.addEventListener('DOMContentLoaded', function () {
    recogerDOM();
    cargarDatos().then(iniciar, mostrarError);
  });

})(window);

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
  var Edits = Arbol.Edits;

  var RUTA_JSON = 'datos/posturas-creencias.json';
  var RUTA_RESPALDO = 'datos/posturas-creencias.js';

  var dom = {};
  var datosCanon = null;
  var editsEstado = Edits.vacio();
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

  /* Confirmación modal propia: `window.confirm` bloquea el hilo y desentona
     con el resto de la interfaz. Devuelve una promesa con la decisión. */
  function confirmar(opciones) {
    return new Promise(function (resolver) {
      dom.dialogoTitulo.textContent = opciones.titulo;
      dom.dialogoTexto.innerHTML = opciones.texto;
      dom.dialogoAceptar.textContent = opciones.aceptar || 'Eliminar';
      dom.dialogo.classList.remove('oculto');
      dom.dialogoAceptar.focus();

      function cerrar(decision) {
        dom.dialogo.classList.add('oculto');
        dom.dialogoAceptar.removeEventListener('click', aceptar);
        dom.dialogoCancelar.removeEventListener('click', cancelar);
        dom.dialogo.removeEventListener('click', fuera);
        document.removeEventListener('keydown', tecla);
        resolver(decision);
      }
      function aceptar() { cerrar(true); }
      function cancelar() { cerrar(false); }
      function fuera(evento) { if (evento.target === dom.dialogo) cerrar(false); }
      function tecla(evento) {
        if (evento.key === 'Escape') { evento.stopPropagation(); cerrar(false); }
        if (evento.key === 'Enter') { evento.preventDefault(); cerrar(true); }
      }

      dom.dialogoAceptar.addEventListener('click', aceptar);
      dom.dialogoCancelar.addEventListener('click', cancelar);
      dom.dialogo.addEventListener('click', fuera);
      document.addEventListener('keydown', tecla);
    });
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

    var contextoMedida = {
      datos: Estado.datos,
      fijados: Estado.fijados,
      divulgacion: Estado.divulgacion,
      expandidos: Estado.expandidos,
      caminoUsuario: Estado.caminoElegido()
    };
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
      fijados: Estado.fijados,
      estado: Estado,
      visibles: visibles,
      aristasIds: aristasIds,
      disposicion: disposicion,
      respuestas: respuestas,
      camino: exploracion,
      caminoUsuario: Estado.caminoElegido(),
      tradicionesDestacadas: destacadas,
      divulgacion: Estado.divulgacion,
      expandidos: Estado.expandidos
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
    dom.btnCreencias.classList.toggle('activo', Estado.modo === 'explorador' && Estado.panelAbierto);
    // El botón solo está «encendido» si la vista de lista se está viendo de
    // verdad; cerrar el panel con la ✕ también lo apaga.
    dom.btnComparar.classList.toggle('activo', Estado.vista === 'lista' && Estado.panelAbierto);

    var cuantosResaltados = Estado.resaltados.size;
    dom.conteoResaltados.textContent = String(cuantosResaltados);
    dom.btnResaltados.hidden = cuantosResaltados === 0;
    dom.btnLimpiarResaltados.hidden = cuantosResaltados === 0;
    dom.sepResaltados.hidden = cuantosResaltados === 0;
    dom.panel.classList.toggle('cerrado', !Estado.panelAbierto);
    dom.panel.classList.toggle('ancho', Estado.vista === 'lista' && Estado.panelAbierto);
    document.documentElement.style.setProperty('--panel-ancho', Estado.panelAncho + 'px');
    if (dom.selRecorrido) dom.selRecorrido.value = Estado.divulgacion;
    if (dom.chkCompacto) {
      dom.chkCompacto.checked = Estado.compactoCreencias;
    }
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

    var entradas = nodo.entradas.filter(function (arista) {
      return arista.tipo === 'respuesta';
    });
    if (entradas.length) {
      partes.push('<h3 class="panel-subtitulo">Cómo se llega aquí</h3>');
      partes.push('<ul class="ficha-opciones">' + entradas.map(function (arista) {
        var origen = Estado.grafo.nodos.get(arista.desde);
        var preguntaOrigen = Estado.datos.questions[arista.preguntaId];
        var elegidaAqui = respuestas[arista.preguntaId] === arista.clave;
        return '<li class="' + (elegidaAqui ? 'elegida' : '') + '">'
          + '<b>' + escapar(arista.etiqueta) + '</b> a «'
          + escapar(preguntaOrigen ? (preguntaOrigen.colloquial_hint
            || preguntaOrigen.formal_text) : arista.preguntaId) + '»'
          + '<span class="glosa">desde '
          + escapar(origen && origen.postura ? Layout.rotuloPostura(origen.postura)
            : arista.desde)
          + (arista.glosa ? ' · ' + escapar(arista.glosa) : '') + '</span></li>';
      }).join('') + '</ul>');
    }

    var ejes = (postura && postura.question_axes) || [];
    if (ejes.length) {
      partes.push('<h3 class="panel-subtitulo">Ejes que abre esta postura</h3>');
      partes.push('<ul class="ficha-opciones">' + ejes.map(function (qid) {
        var eje = datos.questions[qid];
        return '<li>'
          + escapar(eje ? (eje.colloquial_hint || eje.formal_text) : 'Pregunta')
          + (eje && eje.is_convergence
            ? '<span class="glosa">Compartida con otra postura (convergencia).</span>' : '')
          + '</li>';
      }).join('') + '</ul>');
    }

    var notas = (postura && postura.notes) || [];
    if (notas.length) {
      partes.push('<h3 class="panel-subtitulo">Notas del documento</h3>');
      partes.push('<p class="panel-nota">' + escapar(notas.join(' · ')) + '</p>');
    }

    if (nodo.pregunta && nodo.pregunta.full_text !== nodo.pregunta.formal_text) {
      partes.push('<h3 class="panel-subtitulo">Texto original en el documento</h3>');
      partes.push('<p class="panel-nota">' + escapar(nodo.pregunta.full_text) + '</p>');
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
    partes.push('<dt>En el árbol</dt><dd>' + escapar(resumenSituacion(nodo, respuestas)) + '</dd>');
    partes.push('<dt>Profundidad</dt><dd>' + escapar(textoProfundidad(nodo)) + '</dd>');
    if (nodo.pregunta) {
      var clave = respuestas[nodo.pregunta.id];
      var elegidaFicha = clave && (nodo.pregunta.answers || []).filter(function (r) {
        return r.key === clave;
      })[0];
      partes.push('<dt>Tu respuesta</dt><dd>'
        + (elegidaFicha
          ? escapar(elegidaFicha.label) + (elegidaFicha.gloss ? ' — ' + escapar(elegidaFicha.gloss) : '')
          : 'todavía sin responder')
        + '</dd>');
    }
    if (postura) {
      var cuantasTrad = (postura.traditions || []).length;
      partes.push('<dt>Tradiciones</dt><dd>'
        + (cuantasTrad
          ? cuantasTrad + (cuantasTrad === 1 ? ' la sostiene' : ' la sostienen')
          : 'ninguna registrada')
        + '</dd>');
      var cuantosEjes = (postura.question_axes || []).length;
      if (cuantosEjes) {
        partes.push('<dt>Preguntas que abre</dt><dd>'
          + cuantosEjes + (cuantosEjes === 1 ? ' eje' : ' ejes') + '</dd>');
      }
    }
    var ramas = nodo.salidas.filter(function (arista) { return arista.tipo === 'respuesta'; }).length;
    if (ramas) {
      partes.push('<dt>Ramas hijas</dt><dd>' + ramas + (ramas === 1 ? ' postura' : ' posturas') + '</dd>');
    }
    if (postura && postura.is_local) {
      partes.push('<dt>Origen</dt><dd>borrador local (aún no está en el documento)</dd>');
    }
    partes.push('<dt>Anclado</dt><dd>'
      + (Object.prototype.hasOwnProperty.call(Estado.fijados, nodo.id)
        ? 'sí (pulsa la chincheta para soltarlo)' : 'no') + '</dd>');
    partes.push('<dt>Resaltado</dt><dd>'
      + (Estado.resaltados.has(nodo.id) ? 'sí (Ctrl + clic para quitarlo)' : 'no') + '</dd>');
    partes.push('</dl>');
    partes.push(fichaDeEdicion(nodo, postura));
    return partes.join('');
  }

  function pasosDesdeRaiz(nodoId) {
    var grafo = Estado.grafo;
    var cola = grafo.raices.map(function (id) { return { id: id, pasos: 0 }; });
    var vistos = new Set();
    while (cola.length) {
      var actual = cola.shift();
      if (vistos.has(actual.id)) continue;
      vistos.add(actual.id);
      if (actual.id === nodoId) return actual.pasos;
      var nodo = grafo.nodos.get(actual.id);
      if (!nodo) continue;
      nodo.salidas.forEach(function (arista) {
        cola.push({ id: arista.hasta, pasos: actual.pasos + 1 });
      });
    }
    return null;
  }

  function textoProfundidad(nodo) {
    var pasos = pasosDesdeRaiz(nodo.id);
    if (pasos == null) return 'fuera del recorrido desde el origen';
    if (pasos === 0) return 'origen del árbol';
    return pasos + (pasos === 1 ? ' paso desde el origen' : ' pasos desde el origen');
  }

  function resumenSituacion(nodo, respuestas) {
    var camino = Estado.caminoElegido();
    var enCamino = camino.has(nodo.id);
    if (nodo.pregunta && respuestas[nodo.pregunta.id] != null) {
      return enCamino ? 'en tu recorrido (ya respondida)' : 'rama que no elegiste';
    }
    if (nodo.pregunta) return 'espera tu respuesta';
    return enCamino ? 'en tu recorrido' : 'visible, fuera de tu recorrido';
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
    partes.push('</dl>');
    return partes.join('');
  }

  function fichaDeEdicion(nodo, postura) {
    var bloques = ['<div class="ficha-edicion">'];
    bloques.push('<h3 class="panel-subtitulo">Contribuir (borrador local)</h3>');
    bloques.push('<p class="panel-nota">Los cambios se guardan en este navegador. '
      + 'Exporta el Markdown para proponerlos al equipo de mantenimiento.</p>');
    if (postura) {
    bloques.push('<h3 class="panel-subtitulo">Nombre de la postura</h3>');
    bloques.push('<p class="panel-nota">Una postura puede quedarse como hoja, sin pregunta. '
      + 'La pregunta es opcional y se añade aparte si hace falta seguir ramificando.</p>');
    bloques.push('<input class="campo" data-campo="nombre" placeholder="Nombre de la postura" value="'
      + escapar(postura.is_unnamed ? '' : postura.label) + '">');
    bloques.push('<button type="button" class="mini-boton destacado" data-accion="nombrar" data-postura="'
      + escapar(postura.id) + '">'
      + (postura.is_unnamed ? 'Poner nombre' : 'Guardar nombre') + '</button>');
    bloques.push('<h3 class="panel-subtitulo">Añadir una pregunta (opcional)</h3>');
      bloques.push('<input class="campo" data-campo="formal" placeholder="¿Pregunta formal?">');
      bloques.push('<input class="campo" data-campo="coloquial" placeholder="¿Versión coloquial? (opcional)">');
      bloques.push('<button type="button" class="mini-boton" data-accion="agregar-pregunta" data-postura="'
        + escapar(postura.id) + '">Añadir pregunta</button>');
    }
    if (nodo.pregunta) {
      bloques.push('<h3 class="panel-subtitulo">Nueva respuesta / postura</h3>');
      bloques.push('<input class="campo" data-campo="respuesta" placeholder="Etiqueta (Sí, No, …)">');
      bloques.push('<input class="campo" data-campo="destino" placeholder="Nombre de la postura destino (? si no tiene)">');
      bloques.push('<button type="button" class="mini-boton" data-accion="agregar-respuesta" data-pregunta="'
        + escapar(nodo.pregunta.id) + '">Añadir respuesta</button>');
    }
    if (editsEstado.ops.length) {
      bloques.push('<p class="panel-nota">' + editsEstado.ops.length
        + ' aporte' + (editsEstado.ops.length === 1 ? '' : 's') + ' locales sin integrar.</p>');
      bloques.push('<button type="button" class="mini-boton peligro" data-accion="olvidar-edits">'
        + 'Descartar aportes locales</button>');
    }
    bloques.push('</div>');
    return bloques.join('');
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

    var claseLista = 'lista-tarjetas' + (Estado.compactoCreencias ? ' compacto' : '');
    dom.listaTradiciones.className = claseLista;
    dom.listaPosturasSueltas.className = claseLista;

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

  function pedirPoda(preguntaId) {
    var pregunta = Estado.datos.questions[preguntaId];
    if (!pregunta) return;
    var alcance = Estado.alcanceDePoda(preguntaId);
    var descendientes = alcance.descendientes.length;
    var detalle = descendientes
      ? ' Con ella se borran <b>' + descendientes + ' respuesta'
        + (descendientes === 1 ? '' : 's') + '</b> más del subárbol que colgaba de ahí.'
      : ' No hay respuestas más abajo que dependan de ella.';

    confirmar({
      titulo: 'Deshacer esta respuesta',
      texto: '«' + escapar(pregunta.colloquial_hint || pregunta.formal_text) + '»'
        + ' volverá a quedar sin responder.' + detalle
        + ' La rama no reaparecerá al volver a responder.',
      aceptar: 'Podar la rama'
    }).then(function (aceptado) {
      if (!aceptado) return;
      Estado.borrarRespuesta(preguntaId);
      avisar(descendientes
        ? 'Rama podada: ' + (descendientes + 1) + ' respuestas olvidadas.'
        : 'Respuesta deshecha.');
    });
  }

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

  function tradicionesDePostura(postura) {
    var nombres = [];
    var indice = Estado.datos && Estado.datos.traditions_index;
    (postura.traditions || []).forEach(function (tradicion) {
      if (!tradicion.name || !indice || !indice[tradicion.name]) return;
      if (nombres.indexOf(tradicion.name) === -1) nombres.push(tradicion.name);
    });
    return nombres;
  }

  function aporteCreenciasDeNodo(nodo) {
    var postura = nodo && nodo.postura;
    if (!postura) return null;
    var nombres = tradicionesDePostura(postura);
    if (nombres.length) return { tradiciones: nombres, posturasSueltas: [] };
    if (!postura.is_unnamed && !postura.is_root) {
      return { tradiciones: [], posturasSueltas: [postura.id] };
    }
    return null;
  }

  function aporteCreenciasCercano(nodo) {
    var visto = new Set();
    var actual = nodo;
    var camino = Estado.caminoElegido();
    while (actual && !visto.has(actual.id)) {
      visto.add(actual.id);
      var aporte = aporteCreenciasDeNodo(actual);
      if (aporte) return aporte;
      var siguiente = null;
      var i;
      for (i = 0; i < (actual.entradas || []).length; i++) {
        var padreId = actual.entradas[i].desde;
        if (camino.has(padreId)) {
          siguiente = Estado.grafo.nodos.get(padreId);
          break;
        }
      }
      if (!siguiente && actual.entradas && actual.entradas.length) {
        siguiente = Estado.grafo.nodos.get(actual.entradas[0].desde);
      }
      actual = siguiente;
    }
    return null;
  }

  function aplicarAporteCreencias(aporte) {
    if (!aporte) {
      Estado.tradiciones = [];
      Estado.posturasSueltas = [];
      return;
    }
    Estado.tradiciones = aporte.tradiciones.slice();
    Estado.posturasSueltas = aporte.posturasSueltas.slice();
    if (Estado.panelAbierto && Estado.pestana === 'creencias'
      && (Estado.tradiciones.length || Estado.posturasSueltas.length)) {
      Estado.modo = 'explorador';
    }
  }

  function preseleccionarPosturaEnCreencias(nodo) {
    if (!nodo) return;
    aplicarAporteCreencias(aporteCreenciasCercano(nodo));
  }

  function hojaDelRecorrido() {
    var camino = Estado.caminoElegido();
    if (!camino || !camino.size) return null;
    var hojas = [];
    camino.forEach(function (id) {
      var nodo = Estado.grafo.nodos.get(id);
      if (!nodo) return;
      var tieneHijoEnCamino = nodo.salidas.some(function (arista) {
        return camino.has(arista.hasta);
      });
      if (!tieneHijoEnCamino) hojas.push(nodo);
    });
    if (!hojas.length) return null;
    var respuestas = Estado.respuestasEfectivas();
    hojas.sort(function (a, b) {
      var esperaA = a.pregunta && respuestas[a.pregunta.id] == null ? 1 : 0;
      var esperaB = b.pregunta && respuestas[b.pregunta.id] == null ? 1 : 0;
      if (esperaB !== esperaA) return esperaB - esperaA;
      var pasosA = pasosDesdeRaiz(a.id);
      var pasosB = pasosDesdeRaiz(b.id);
      if (pasosA == null) pasosA = -1;
      if (pasosB == null) pasosB = -1;
      if (pasosB !== pasosA) return pasosB - pasosA;
      return a.id < b.id ? -1 : 1;
    });
    return hojas[0];
  }

  function sincronizarHojaCuestionario() {
    if (Estado.divulgacion !== 'cuestionario') return;
    var hoja = hojaDelRecorrido();
    if (hoja) preseleccionarPosturaEnCreencias(hoja);
  }

  function abrirPestana(nombre) {
    Estado.pestana = nombre;
    Estado.panelAbierto = true;
    if (nombre !== 'comparar' && Estado.vista === 'lista') Estado.vista = 'grafo';
    if (nombre === 'creencias'
      && (Estado.tradiciones.length || Estado.posturasSueltas.length)) {
      Estado.modo = 'explorador';
    }
    Estado.emitir('panel');
  }

  function aplicarTema() {
    document.documentElement.setAttribute('data-tema', Estado.tema);
  }

  var ORDEN_DIVULGACION = ['cuestionario', 'limpio', 'exploracion', 'completo'];

  function ciclarDivulgacion() {
    var indice = ORDEN_DIVULGACION.indexOf(Estado.divulgacion);
    var siguiente = ORDEN_DIVULGACION[(indice + 1) % ORDEN_DIVULGACION.length];
    Estado.fijarDivulgacion(siguiente);
    avisar('Recorrido: ' + siguiente.replace('exploracion', 'exploración libre'));
  }

  function reconstruirModelo() {
    Estado.datos = Edits.aplicar(datosCanon, editsEstado);
    Estado.grafo = Arbol.construirGrafo(Estado.datos);
    Layout.limpiarCache();
    listaTradiciones = Busqueda.listaTradiciones(Estado.datos);
    listaPosturasSueltas = Busqueda.listaPosturasSueltas(Estado.datos, Estado.grafo);
    Estado.sanear();
    Estado.emitir('edicion');
  }

  function leerCampo(contenedor, nombre) {
    var campo = contenedor.querySelector('[data-campo="' + nombre + '"]');
    return campo ? String(campo.value || '').trim() : '';
  }

  function aplicarEdicion(boton, contenedor) {
    var accion = boton.getAttribute('data-accion');
    if (accion === 'nombrar') {
      var nombre = leerCampo(contenedor, 'nombre');
      if (!nombre) { avisar('Escribe un nombre para la postura.'); return; }
      Edits.nombrarPostura(editsEstado, boton.getAttribute('data-postura'), nombre);
      reconstruirModelo();
      avisar('Nombre guardado en el borrador local.');
      return;
    }
    if (accion === 'agregar-pregunta') {
      var formal = leerCampo(contenedor, 'formal');
      if (!formal) { avisar('Escribe la pregunta formal.'); return; }
      Edits.agregarPregunta(editsEstado, boton.getAttribute('data-postura'),
        formal, leerCampo(contenedor, 'coloquial'));
      reconstruirModelo();
      avisar('Pregunta añadida al borrador local.');
      return;
    }
    if (accion === 'agregar-respuesta') {
      var etiqueta = leerCampo(contenedor, 'respuesta') || 'Sí';
      var destino = leerCampo(contenedor, 'destino') || '?';
      Edits.agregarRespuesta(editsEstado, Estado.datos, boton.getAttribute('data-pregunta'),
        etiqueta, destino);
      reconstruirModelo();
      avisar('Respuesta añadida al borrador local.');
      return;
    }
    if (accion === 'olvidar-edits') {
      confirmar({
        titulo: 'Descartar aportes locales',
        texto: 'Se olvidan las preguntas, nombres y posturas que añadiste en este navegador. '
          + 'El documento canónico no se toca.',
        aceptar: 'Descartar'
      }).then(function (aceptado) {
        if (!aceptado) return;
        Edits.olvidar();
        editsEstado = Edits.vacio();
        reconstruirModelo();
        avisar('Aportes locales descartados.');
      });
    }
  }

  function registrarRedimensionPanel() {
    var arrastre = null;
    dom.panelAsa.addEventListener('pointerdown', function (evento) {
      evento.preventDefault();
      arrastre = { inicioX: evento.clientX, inicioAncho: Estado.panelAncho };
      try { dom.panelAsa.setPointerCapture(evento.pointerId); } catch (error) { /* nada */ }
    });
    dom.panelAsa.addEventListener('pointermove', function (evento) {
      if (!arrastre) return;
      var delta = arrastre.inicioX - evento.clientX;
      var maximo = Math.max(360, Math.round(global.innerWidth * 0.72));
      Estado.panelAncho = Math.max(300, Math.min(maximo, arrastre.inicioAncho + delta));
      document.documentElement.style.setProperty('--panel-ancho', Estado.panelAncho + 'px');
    });
    function soltar() {
      if (!arrastre) return;
      arrastre = null;
      Estado.emitir('panel');
    }
    dom.panelAsa.addEventListener('pointerup', soltar);
    dom.panelAsa.addEventListener('pointercancel', soltar);
  }

  /* ------------------------------------------------------------ eventos -- */

  function registrarEventos() {
    dom.btnAjustar.addEventListener('click', function () { Vista.encuadrar(null, true); });

    dom.btnReorganizar.addEventListener('click', function () {
      Estado.liberarTodos();
      avisar('Posiciones automáticas restauradas.');
    });

    dom.selRecorrido.addEventListener('change', function () {
      Estado.fijarDivulgacion(dom.selRecorrido.value);
      if (Estado.divulgacion === 'completo') {
        global.setTimeout(function () { Vista.encuadrar(null, true); }, 340);
      }
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
      var estaVisible = Estado.vista === 'lista' && Estado.panelAbierto;
      if (estaVisible) {
        Estado.vista = 'grafo';
        Estado.panelAbierto = false;
        Estado.emitir('panel');
        return;
      }
      Estado.vista = 'lista';
      abrirPestana('comparar');
    });

    dom.btnRazonar.addEventListener('click', function () {
      avisar('«Razonar» está en construcción; llegará en una próxima versión.');
    });

    dom.btnResaltados.addEventListener('click', function () {
      if (!Estado.resaltados.size) return;
      Vista.encuadrar(Array.from(Estado.resaltados), true);
    });

    dom.btnLimpiarResaltados.addEventListener('click', function () {
      Estado.limpiarResaltados();
    });

    dom.btnCompartir.addEventListener('click', function () {
      copiar(Router.enlace(Estado));
    });

    dom.btnExportarMd.addEventListener('click', function () {
      descargar('propuesta-posturas-creencias.md', Edits.aMarkdown(Estado.datos), 'text/markdown');
      avisar('Markdown generado para enviarlo al equipo de mantenimiento.');
    });

    dom.btnTema.addEventListener('click', function () {
      Estado.tema = Estado.tema === 'oscuro' ? 'claro' : 'oscuro';
      aplicarTema();
      Estado.emitir('tema');
    });

    dom.btnReiniciar.addEventListener('click', function () {
      var cuantas = Object.keys(Estado.respuestas).length;
      var cuantosAnclajes = Object.keys(Estado.fijados).length;
      confirmar({
        titulo: 'Reiniciar el árbol',
        texto: 'Se borran <b>' + cuantas + ' respuesta' + (cuantas === 1 ? '' : 's') + '</b>, '
          + '<b>' + Estado.resaltados.size + ' resaltado'
          + (Estado.resaltados.size === 1 ? '' : 's') + '</b> y '
          + '<b>' + cuantosAnclajes + ' anclaje'
          + (cuantosAnclajes === 1 ? '' : 's') + '</b>, también los guardados en '
          + 'este navegador. El tema y el documento no se tocan.',
        aceptar: 'Borrar todo'
      }).then(function (aceptado) {
        if (!aceptado) return;
        Estado.olvidar();
        Estado.reiniciar();
        avisar('Árbol reiniciado.');
        global.setTimeout(function () { Vista.encuadrar(null, true); }, 340);
      });
    });

    dom.panelCerrar.addEventListener('click', function () {
      Estado.panelAbierto = false;
      // Cerrar el panel también abandona la vista de lista; si no, el botón
      // «Comparar» seguía encendido sin nada que comparar a la vista.
      if (Estado.pestana === 'comparar') Estado.vista = 'grafo';
      Estado.emitir('panel');
    });

    Array.prototype.forEach.call(dom.pestanas, function (boton) {
      boton.addEventListener('click', function () {
        abrirPestana(boton.getAttribute('data-pestana'));
      });
    });

    registrarRedimensionPanel();

    dom.chkCompacto.addEventListener('change', function () {
      Estado.compactoCreencias = dom.chkCompacto.checked;
      Estado.emitir('panel');
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
      if (etiqueta && !etiqueta.getAttribute('data-accion')) {
        alternarTradicion(etiqueta.getAttribute('data-tradicion'));
        abrirPestana('creencias');
        return;
      }
      var accion = evento.target.closest ? evento.target.closest('[data-accion]') : null;
      if (!accion) return;
      aplicarEdicion(accion, dom.cuerpoDetalle);
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
      else if (tecla === 'a') { ciclarDivulgacion(); }
      else if (tecla === 'e') { dom.btnCreencias.click(); }
      else if (tecla === 'l') { dom.btnComparar.click(); }
      else if (tecla === 't') { dom.btnTema.click(); }
      else if (tecla === 'h' && Estado.resaltados.size) { dom.btnResaltados.click(); }
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
      dialogo: document.getElementById('dialogo'),
      dialogoTitulo: document.getElementById('dialogo-titulo'),
      dialogoTexto: document.getElementById('dialogo-texto'),
      dialogoAceptar: document.getElementById('dialogo-aceptar'),
      dialogoCancelar: document.getElementById('dialogo-cancelar'),
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
      selRecorrido: document.getElementById('sel-recorrido'),
      btnCreencias: document.getElementById('btn-creencias'),
      btnComparar: document.getElementById('btn-comparar'),
      btnCompartir: document.getElementById('btn-compartir'),
      btnExportarMd: document.getElementById('btn-exportar-md'),
      btnTema: document.getElementById('btn-tema'),
      btnReiniciar: document.getElementById('btn-reiniciar'),
      btnResaltados: document.getElementById('btn-resaltados'),
      btnLimpiarResaltados: document.getElementById('btn-limpiar-resaltados'),
      conteoResaltados: document.getElementById('conteo-resaltados'),
      sepResaltados: document.getElementById('sep-resaltados'),
      btnRazonar: document.getElementById('btn-razonar'),
      btnLimpiarCreencias: document.getElementById('btn-limpiar-creencias'),
      btnIrComparar: document.getElementById('btn-ir-comparar'),
      chkCompacto: document.getElementById('chk-compacto'),
      panelAsa: document.getElementById('panel-asa'),
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
    datosCanon = datos;
    editsEstado = Edits.cargar();
    Estado.datos = Edits.aplicar(datosCanon, editsEstado);
    Estado.grafo = Arbol.construirGrafo(Estado.datos);

    var lectura = Router.leer();
    // El estado vive en localStorage (§8.1), así que sobrevive a recargas y a
    // borrar la consulta de la barra de direcciones. `?limpio=1` lo salta.
    // Si la URL no lleva ningún parámetro, el usuario borró la consulta a mano
    // y espera arrancar de cero: tratamos ese caso como limpio.
    var sinParametros = !global.location.search || global.location.search === '?';
    if (lectura.limpio || sinParametros) Estado.olvidar();
    else Estado.cargar();

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
      alBorrar: pedirPoda,
      alExpandir: function (nodoId) { Estado.alternarExpandido(nodoId); },
      alSeleccionar: function (nodoId) {
        var nodo = nodoId ? Estado.grafo.nodos.get(nodoId) : null;
        preseleccionarPosturaEnCreencias(nodo);
        Estado.seleccionar(nodoId);
      },
      alDobleClic: function (nodoId) {
        var nodo = nodoId ? Estado.grafo.nodos.get(nodoId) : null;
        preseleccionarPosturaEnCreencias(nodo);
        Estado.seleccionado = nodoId;
        Estado.panelAbierto = true;
        Estado.pestana = 'detalle';
        Estado.emitir('seleccion');
        Vista.centrarEnNodo(nodoId);
      },
      alResaltar: function (nodoId) { Estado.alternarResaltado(nodoId); },
      alFijar: function (nodoId, punto) { Estado.fijar(nodoId, punto); },
      alDesanclar: function (nodoId) {
        Estado.desanclar(nodoId);
        avisar('Nodo devuelto a su posición automática.');
      },
      alCambiarCamara: function (camara) { Estado.camara = camara; },
      tooltipHTML: tooltipDeNodo,
      margenDerecho: function () {
        return Estado.panelAbierto ? dom.panel.getBoundingClientRect().width + 34 : 40;
      }
    });

    Estado.suscribir(function (motivo) {
      if (motivo === 'respuesta' || motivo === 'divulgacion') {
        sincronizarHojaCuestionario();
      }
      refrescar();
    });
    registrarEventos();

    sincronizarHojaCuestionario();
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

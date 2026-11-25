/* Modo Cuestionario: una pregunta a la vez, con contexto útil y reporte final. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var raiz = null;
  var deps = null;
  var mostrandoReporte = false;
  var historialPreguntas = [];
  var revelarAdelantos = false;
  var preguntaElegida = null;
  var modoSeleccion = false;
  var UMBRAL_SELECTOR = 4;
  var UMBRAL_PROMPT_SIMPLIFICADA = 2;
  var CLAVE_PROMPT_SIMPLIFICADO = 'arbol-cuestionario-prompt-simplificado';
  /* Certeza: cada respuesta lleva una barra continua (0–100) que por dentro
     se cuantiza a NIVELES_CERTEZA niveles; el máximo es «Completamente
     segur@». En la coincidencia con tradiciones, una respuesta cuenta
     nivel / NIVELES_CERTEZA (certeza completa = 1). */
  var NIVELES_CERTEZA = 7;

  function nivelDeBarra(valor) {
    var v = Math.max(0, Math.min(100, Number(valor)));
    if (isNaN(v)) v = 100;
    return 1 + Math.round((v / 100) * (NIVELES_CERTEZA - 1));
  }

  function pesoCerteza(nivel) {
    return (nivel || NIVELES_CERTEZA) / NIVELES_CERTEZA;
  }

  /* Google Form que recibe los avisos de «Problema con esta pregunta» (las
     respuestas caen en una hoja de cálculo). `campos` son los entry.N de los
     campos que se prerrellenan. Ver specs/cuestionario-inclinacion-y-avisos.md. */
  var FORMULARIO_AVISOS = {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSe16uoymlTdh0GW77ahix8AwLCLb3atpPiTU_qV8E8P_ojVKg/viewform',
    campos: {
      nombre: 'entry.2018982662',
      tipoProblema: 'entry.2013098283',
      preguntaId: 'entry.1128235921',
      pregunta: 'entry.495415517',
      camino: 'entry.437028706',
      idioma: 'entry.1143151662'
    }
  };

  function leerPromptSimplificadoRespondido() {
    try {
      return global.localStorage.getItem(CLAVE_PROMPT_SIMPLIFICADO) === '1';
    } catch (error) {
      return false;
    }
  }

  function marcarPromptSimplificadoRespondido() {
    promptSimplificadoRespondido = true;
    try {
      global.localStorage.setItem(CLAVE_PROMPT_SIMPLIFICADO, '1');
    } catch (error) { /* nada */ }
  }

  var promptSimplificadoRespondido = leerPromptSimplificadoRespondido();

  /* ------------------------------------------- nombre y resultados --- */
  /* Al abrir el cuestionario por primera vez se pide un nombre o apodo (no
     el nombre real). Al terminar el reporte se envía, sin abrir nada, a un
     Google Form cuyas respuestas caen en una hoja: un id aleatorio del
     resultado, el nombre, las posturas alcanzadas y el idioma. «Borrar mi
     resultado» envía otra fila con el mismo id y acción «borrar»; la hoja no
     se limpia sola. `url` es el endpoint .../formResponse del Form. */
  var FORMULARIO_RESULTADOS = {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSc3ViPKy9VMUhFK0wTpc034VE3qwWLywVJkRAHlb3olaoLgaw/formResponse',
    campos: {
      id: 'entry.78965822',
      nombre: 'entry.1163113821',
      posturas: 'entry.586056628',
      nombresPosturas: 'entry.782916677',
      idioma: 'entry.247120969',
      accion: 'entry.964861660'
    }
  };
  var CLAVE_NOMBRE = 'arbol-cuestionario-nombre';
  var CLAVE_RESULTADO = 'arbol-cuestionario-resultado';
  /* Solo se guardan en la hoja los primeros resultados distintos de cada
     nombre de usuario en este navegador; después el reporte se sigue
     mostrando, pero ya no se envía. Cada nombre (y el nombre vacío) tiene
     su propio cupo. Es un límite del navegador (localStorage), no del
     servidor. Se guarda como { nombreNormalizado: enviados }. */
  var CLAVE_ENVIADOS = 'arbol-cuestionario-resultados-por-nombre';
  var MAX_RESULTADOS_ENVIADOS = 3;

  function claveDeNombre(nombre) {
    return String(nombre || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function enviadosPorNombre() {
    var crudo = leerLocal(CLAVE_ENVIADOS);
    if (!crudo) return {};
    try {
      var mapa = JSON.parse(crudo);
      return mapa && typeof mapa === 'object' ? mapa : {};
    } catch (error) { return {}; }
  }

  function resultadosEnviados(nombre) {
    var n = Number(enviadosPorNombre()[claveDeNombre(nombre)]);
    return isNaN(n) || n < 0 ? 0 : n;
  }

  function contarResultadoEnviado(nombre) {
    var mapa = enviadosPorNombre();
    var clave = claveDeNombre(nombre);
    mapa[clave] = resultadosEnviados(nombre) + 1;
    escribirLocal(CLAVE_ENVIADOS, JSON.stringify(mapa));
  }

  function leerLocal(clave) {
    try { return global.localStorage.getItem(clave); } catch (error) { return null; }
  }

  function escribirLocal(clave, valor) {
    try { global.localStorage.setItem(clave, valor); } catch (error) { /* nada */ }
  }

  function nombreGuardado() {
    var crudo = leerLocal(CLAVE_NOMBRE);
    if (!crudo) return null;
    try { return JSON.parse(crudo); } catch (error) { return null; }
  }

  function resultadoGuardado() {
    var crudo = leerLocal(CLAVE_RESULTADO);
    if (!crudo) return null;
    try { return JSON.parse(crudo); } catch (error) { return null; }
  }

  function idAleatorio() {
    var bytes = new Uint8Array(8);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function enviarAFormulario(valores) {
    if (!FORMULARIO_RESULTADOS.url || !global.fetch) return false;
    var cuerpo = new URLSearchParams();
    Object.keys(valores).forEach(function (campo) {
      var entrada = FORMULARIO_RESULTADOS.campos[campo];
      if (entrada) cuerpo.append(entrada, valores[campo] == null ? '' : String(valores[campo]));
    });
    /* no-cors: Google Forms no devuelve cabeceras CORS; la respuesta es
       opaca y no se puede confirmar, pero la fila sí llega. */
    global.fetch(FORMULARIO_RESULTADOS.url, {
      method: 'POST',
      mode: 'no-cors',
      body: cuerpo
    }).catch(function () { /* sin red: se pierde este envío */ });
    return true;
  }

  /* Se llama al pintar el reporte. Solo envía si el resultado cambió desde
     el último envío (repintar el mismo reporte no duplica filas). */
  function registrarResultado(estado, especificas) {
    /* Solo un recorrido contestado por la persona; no la vista de posturas
       marcadas en el panel ni la de «Explorar». */
    if (estado.panelAbierto || !especificas.length) return;
    if (estado.posturasExploradasCuestionario
      && estado.posturasExploradasCuestionario.length) return;
    var ids = especificas.map(function (item) { return item.postura.id; }).sort();
    var firma = ids.join(',');
    var previo = resultadoGuardado();
    if (previo && previo.firma === firma && !previo.borrado) return;
    var nombre = nombreGuardado();
    var valorNombre = (nombre && nombre.valor) || '';
    if (resultadosEnviados(valorNombre) >= MAX_RESULTADOS_ENVIADOS) return;
    var id = idAleatorio();
    var enviado = enviarAFormulario({
      id: id,
      nombre: valorNombre,
      posturas: firma,
      nombresPosturas: especificas.map(function (item) {
        return rotuloPostura(item.postura);
      }).join(' · '),
      idioma: Arbol.I18n ? Arbol.I18n.idioma : '',
      accion: 'guardar'
    });
    if (!enviado) return;
    contarResultadoEnviado(valorNombre);
    escribirLocal(CLAVE_RESULTADO, JSON.stringify({ id: id, firma: firma, borrado: false }));
  }

  function borrarResultado() {
    var previo = resultadoGuardado();
    if (!previo || previo.borrado) return;
    enviarAFormulario({ id: previo.id, accion: 'borrar' });
    previo.borrado = true;
    escribirLocal(CLAVE_RESULTADO, JSON.stringify(previo));
  }

  function pintarBorrarResultado() {
    var previo = resultadoGuardado();
    if (!previo) return '';
    if (previo.borrado) {
      return '<p class="quiz-resultado-borrado">' + escapar(t('quizResultadoBorrado')) + '</p>';
    }
    return '<button type="button" class="quiz-resultado-borrar" data-accion="borrar-resultado">'
      + escapar(t('quizResultadoBorrar')) + '</button>';
  }

  /* Capa del nombre: solo el campo, flotando sobre el cuestionario. Va
     fuera de `raiz` porque el cuestionario se repinta entero en cada
     respuesta. Un clic lejos del campo la cierra (no hay botón de omitir);
     el margen amplio alrededor devuelve el foco al campo, para que un clic
     cercano no la cierre por accidente. Aparece la primera vez y, ya
     rellena, cada vez que el cuestionario empieza de cero (una vez por
     carga o por «Repetir cuestionario»); el chip de la cabecera la abre en
     cualquier momento. */
  var capaNombre = null;
  var nombrePreguntadoEnCarga = false;

  var ICONO_PERSONA = '<svg class="quiz-nombre-icono" viewBox="0 0 24 24" aria-hidden="true">'
    + '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/>'
    + '<path d="M4 20c1.6-3.6 4.6-5.4 8-5.4s6.4 1.8 8 5.4" fill="none" stroke="currentColor"'
    + ' stroke-width="1.8" stroke-linecap="round"/></svg>';
  var ICONO_FLECHA = '<svg viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2"'
    + ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function quizAlInicio(estado) {
    return !Object.keys(estado.respuestas || {}).length
      && !Object.keys(estado.ramasSinRespuesta || {}).length
      && !(estado.posturasExploradasCuestionario || []).length;
  }

  function debePedirNombre(estado) {
    if (capaNombre || estado.panelAbierto) return false;
    if (!nombreGuardado()) return true;
    return !nombrePreguntadoEnCarga && quizAlInicio(estado);
  }

  function retirarCapaNombre(animar) {
    var capa = capaNombre;
    capaNombre = null;
    if (!capa || !capa.parentNode) return;
    if (!animar) {
      capa.parentNode.removeChild(capa);
      return;
    }
    capa.classList.add('saliendo');
    global.setTimeout(function () {
      if (capa.parentNode) capa.parentNode.removeChild(capa);
    }, 200);
  }

  function cerrarCapaNombre(valor) {
    escribirLocal(CLAVE_NOMBRE, JSON.stringify({ valor: String(valor || '').trim() }));
    retirarCapaNombre(true);
    var chip = raiz && raiz.querySelector('.quiz-chip-nombre-texto');
    if (chip) chip.textContent = textoChipNombre();
  }

  function textoChipNombre() {
    var guardado = nombreGuardado();
    var valor = guardado && guardado.valor ? guardado.valor : '';
    if (!valor) return t('quizNombreChipVacio');
    return valor.length > 24 ? valor.slice(0, 23) + '…' : valor;
  }

  function mostrarCapaNombre() {
    if (capaNombre) return;
    nombrePreguntadoEnCarga = true;
    var guardado = nombreGuardado();
    capaNombre = document.createElement('div');
    capaNombre.className = 'quiz-nombre-capa';
    capaNombre.innerHTML = '<div class="quiz-nombre-zona">'
      + '<form class="quiz-nombre-form" role="dialog" aria-label="' + escapar(t('quizNombreTitulo')) + '">'
      + '<div class="quiz-nombre-pildora">'
      + ICONO_PERSONA
      + '<input type="text" class="quiz-nombre-campo" maxlength="80" autocomplete="nickname"'
      + ' spellcheck="false" placeholder="' + escapar(t('quizNombreTitulo')) + '"'
      + ' aria-label="' + escapar(t('quizNombreTitulo')) + '">'
      + '<button type="submit" class="quiz-nombre-ir" aria-label="' + escapar(t('quizNombreEmpezar')) + '"'
      + ' title="' + escapar(t('quizNombreEmpezar')) + '">' + ICONO_FLECHA + '</button>'
      + '</div>'
      + '<p class="quiz-nombre-nota">' + escapar(t('quizNombreAviso')) + '</p>'
      + '</form></div>';
    document.body.appendChild(capaNombre);
    var campo = capaNombre.querySelector('.quiz-nombre-campo');
    if (guardado && guardado.valor) campo.value = guardado.valor;
    capaNombre.querySelector('form').addEventListener('submit', function (evento) {
      evento.preventDefault();
      cerrarCapaNombre(campo.value);
    });
    capaNombre.addEventListener('mousedown', function (evento) {
      if (evento.target === capaNombre) {
        cerrarCapaNombre(campo.value);
        return;
      }
      if (!evento.target.closest('input, button')) {
        evento.preventDefault();
        campo.focus();
      }
    });
    capaNombre.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') cerrarCapaNombre(campo.value);
    });
    global.setTimeout(function () {
      campo.focus();
      campo.select();
    }, 40);
  }

  function ocultarCapaNombre() {
    retirarCapaNombre(false);
  }

  function t(clave, vars) {
    return Arbol.I18n ? Arbol.I18n.t(clave, vars) : clave;
  }

  function dato(clave, original) {
    return Arbol.I18n ? Arbol.I18n.dato(clave, original) : original;
  }

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Preguntas, respuestas y glosas vienen del documento fuente con sus marcas
     `**`/`*`; aquí se pintan como negrita y cursiva. Ver js/formato.js. */
  function formatear(texto) {
    return Arbol.Formato ? Arbol.Formato.aHtml(texto) : escapar(texto);
  }

  function rotuloPostura(postura) {
    if (!postura) return '';
    if (Arbol.Layout && Arbol.Layout.rotuloPostura) {
      return Arbol.Layout.rotuloPostura(postura);
    }
    return postura.label || '';
  }

  function urlNota(enlace) {
    if (!enlace) return null;
    if (deps && deps.urlMDRender) return deps.urlMDRender(enlace);
    if (enlace.href) return enlace.href;
    return null;
  }

  function pieEnlaceExterno(enlace, etiqueta) {
    var destino = urlNota(enlace);
    if (!destino) return '';
    return '<a class="enlace-md-externo" href="' + escapar(destino)
      + '" target="_blank" rel="noopener noreferrer">'
      + '<span class="enlace-md-icono" aria-hidden="true">↗</span>'
      + '<span>' + escapar(etiqueta || t('quizAnalisisAbrir')) + '</span></a>';
  }

  function tarjetaMarkdown(enlace, etiquetaPie) {
    if (!enlace) return '';
    if (Arbol.Markdown && Arbol.Markdown.tarjeta) {
      return Arbol.Markdown.tarjeta(enlace, {
        pie: pieEnlaceExterno(enlace, etiquetaPie)
      });
    }
    var destino = urlNota(enlace);
    var titulo = enlace.label || enlace.target || '';
    if (destino) {
      return '<a class="enlace-md-externo" href="' + escapar(destino)
        + '" target="_blank" rel="noopener noreferrer">'
        + '<span class="enlace-md-icono" aria-hidden="true">↗</span>'
        + '<span>' + escapar(titulo) + '</span></a>';
    }
    return '<p class="quiz-ficha-meta">[[' + escapar(titulo) + ']]</p>';
  }

  function hidratarMarkdown() {
    if (Arbol.Markdown && Arbol.Markdown.pintarCola) {
      Arbol.Markdown.pintarCola(raiz);
    }
  }

  function preguntasPendientes(estado) {
    if (Arbol.Creencias
      && Arbol.Creencias.enModoDefinitoriasCuestionario(estado)) {
      var pids = Arbol.Creencias.posturasConPreguntaEnCuestionario(estado) || [];
      return Arbol.Creencias.preguntasDefinitorias(
        estado.grafo, estado.datos, pids);
    }
    var grafo = estado.grafo;
    var respuestas = estado.respuestasEfectivas();
    var visibles = Arbol.nodosVisibles(grafo, respuestas, 'limpio', estado.expandidos,
      null, estado.ramasSinRespuesta);
    var pendientes = [];
    var vistos = new Set();
    visibles.forEach(function (id) {
      var nodo = grafo.nodos.get(id);
      if (!nodo || !nodo.preguntaId || !nodo.pregunta) return;
      if (respuestas[nodo.preguntaId] != null) return;
      if (estado.ramasSinRespuesta && estado.ramasSinRespuesta[nodo.preguntaId]) return;
      if (vistos.has(nodo.preguntaId)) return;
      vistos.add(nodo.preguntaId);
      pendientes.push(nodo);
    });
    pendientes.sort(function (a, b) {
      return Number(String(a.preguntaId).slice(1)) - Number(String(b.preguntaId).slice(1));
    });
    return pendientes;
  }

  function nodoPendientePorId(pendientes, qid) {
    if (!qid) return null;
    for (var i = 0; i < pendientes.length; i++) {
      if (pendientes[i].preguntaId === qid) return pendientes[i];
    }
    return null;
  }

  function debeUsarModoSimplificado(pendientes) {
    return !!(modoSeleccion && pendientes && pendientes.length > 0);
  }

  function debeMostrarPromptSimplificada(estado, pendientes) {
    if (promptSimplificadoRespondido) return false;
    if (!pendientes || pendientes.length <= UMBRAL_PROMPT_SIMPLIFICADA) return false;
    if (estado.panelAbierto) return false;
    if (modoSeleccion) return false;
    return true;
  }

  function registrarRespuestaPrompt(pendientes, aceptar) {
    marcarPromptSimplificadoRespondido();
    if (aceptar) {
      modoSeleccion = true;
      preguntaElegida = null;
    } else {
      modoSeleccion = false;
      preguntaElegida = null;
    }
  }

  function textoCortoPregunta(pregunta) {
    if (!pregunta) return '';
    var coloquial = pregunta.colloquial_hint
      ? dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint)
      : '';
    var formal = dato('q.' + pregunta.id + '.formal', pregunta.formal_text);
    var texto = coloquial || formal || pregunta.id;
    // Se recorta a 140, y un corte a media marca dejaría un `**` suelto en
    // pantalla: en un rótulo tan breve el formato no se echa de menos.
    if (Arbol.Formato) texto = Arbol.Formato.plano(texto);
    if (texto.length > 140) texto = texto.slice(0, 137) + '…';
    return texto;
  }

  function etiquetaRama(nodo, datos) {
    var ids = (nodo.pregunta && nodo.pregunta.origin_posture_ids) || [];
    if (!ids.length && nodo.posturaId) ids = [nodo.posturaId];
    if (!ids.length) return t('quizRamaAbierta');
    return ids.map(function (pid) {
      return rotuloPostura(datos.postures[pid]) || pid;
    }).join(' · ');
  }

  function tradicionesDePostura(postura, datos) {
    var nombres = [];
    var indice = datos && datos.traditions_index;
    (postura && postura.traditions || []).forEach(function (tradicion) {
      if (!tradicion.name || (indice && !indice[tradicion.name])) return;
      if (nombres.indexOf(tradicion.name) === -1) nombres.push(tradicion.name);
    });
    return nombres;
  }

  function posturaTieneNombre(postura) {
    if (!postura || postura.is_root || postura.is_unnamed) return false;
    var etiqueta = String(postura.label || '').trim();
    if (!etiqueta || etiqueta === '?') return false;
    if (/^sin[-\s]?nombre$/i.test(etiqueta)) return false;
    return true;
  }

  function padreEnCamino(estado, nodo, camino) {
    if (!nodo || !nodo.entradas || !nodo.entradas.length) return null;
    var i;
    for (i = 0; i < nodo.entradas.length; i++) {
      var padreId = nodo.entradas[i].desde;
      if (camino && camino.has(padreId)) return estado.grafo.nodos.get(padreId);
    }
    return estado.grafo.nodos.get(nodo.entradas[0].desde) || null;
  }

  /* Sube por el recorrido hasta la postura con nombre más cercana. */
  function posturaNombradaCercana(estado, nodoInicio, camino) {
    var actual = nodoInicio;
    var vistos = new Set();
    while (actual && !vistos.has(actual.id)) {
      vistos.add(actual.id);
      if (posturaTieneNombre(actual.postura)) {
        return { nodo: actual, postura: actual.postura };
      }
      actual = padreEnCamino(estado, actual, camino);
    }
    return null;
  }

  function hojasDelCamino(estado) {
    var camino = estado.caminoElegido();
    if (!camino || !camino.size) return [];
    var hojas = [];
    camino.forEach(function (id) {
      var nodo = estado.grafo.nodos.get(id);
      if (!nodo) return;
      var tieneHijoEnCamino = (nodo.salidas || []).some(function (arista) {
        return camino.has(arista.hasta);
      });
      if (!tieneHijoEnCamino) hojas.push(nodo);
    });
    return hojas;
  }

  function posturasDelCamino(estado) {
    var camino = estado.caminoElegido();
    var lista = [];
    var vistos = new Set();
    camino.forEach(function (id) {
      var nodo = estado.grafo.nodos.get(id);
      if (!nodo || !posturaTieneNombre(nodo.postura)) return;
      if (vistos.has(nodo.posturaId)) return;
      vistos.add(nodo.posturaId);
      lista.push({ nodo: nodo, postura: nodo.postura });
    });
    return lista;
  }

  /* Una postura nombrada por cada hoja alcanzada (o su ancestro nombrado).
     Con el panel abierto en cuestionario solo cuentan las posturas marcadas,
     no ancestros nombrados del camino virtual. */
  function posturasEspecificas(estado) {
    if (estado.panelAbierto && estado.posturasSueltas.length) {
      return estado.posturasSueltas.map(function (pid) {
        var nodoId = estado.grafo.idDePostura(pid);
        var nodo = estado.grafo.nodos.get(nodoId);
        var postura = estado.datos.postures[pid];
        if (!nodo || !postura || !posturaTieneNombre(postura)) return null;
        return { nodo: nodo, postura: postura };
      }).filter(Boolean);
    }
    if (estado.divulgacion === 'cuestionario' && estado.posturasExploradasCuestionario
      && estado.posturasExploradasCuestionario.length) {
      return estado.posturasExploradasCuestionario.map(function (pid) {
        var nodoId = estado.grafo.idDePostura(pid);
        var nodo = estado.grafo.nodos.get(nodoId);
        var postura = estado.datos.postures[pid];
        if (!nodo || !postura || !posturaTieneNombre(postura)) return null;
        return { nodo: nodo, postura: postura };
      }).filter(Boolean);
    }
    var camino = estado.caminoElegido();
    var hojas = hojasDelCamino(estado);
    var lista = [];
    var vistos = new Set();
    hojas.forEach(function (hoja) {
      var item = posturaNombradaCercana(estado, hoja, camino);
      if (!item || vistos.has(item.postura.id)) return;
      vistos.add(item.postura.id);
      lista.push(item);
    });
    return lista;
  }

  function coincidenciasTradicion(estado, nombre) {
    var indice = estado.datos.traditions_index[nombre];
    if (!indice) return { comunes: 0, total: 0, porcentaje: 0 };
    var resolucion = Arbol.Busqueda.resolver(estado.grafo, estado.datos, {
      tipo: 'tradicion',
      id: nombre,
      nombre: nombre,
      posturaIds: indice.posture_ids || [],
      tentativa: !!indice.tentative,
      respuestas: {}
    });
    var propias = estado.respuestasEfectivas();
    var comunes = 0;
    var coinciden = 0;
    var total = 0;
    Object.keys(resolucion.respuestas || {}).forEach(function (qid) {
      total++;
      if (propias[qid] && propias[qid] === resolucion.respuestas[qid]) {
        coinciden++;
        comunes += pesoCerteza(estado.certezaDe(qid));
      }
    });
    /* `comunes` está ponderado por la certeza (es lo que da el porcentaje de
       afinidad); `coinciden` es el conteo entero que se le muestra al usuario. */
    return {
      comunes: comunes,
      coinciden: coinciden,
      total: total,
      porcentaje: total ? Math.round((comunes / total) * 100) : 0
    };
  }

  function pintarOrigenes(nodo, datos) {
    var ids = (nodo.pregunta && nodo.pregunta.origin_posture_ids) || [];
    if (!ids.length && nodo.posturaId) ids = [nodo.posturaId];
    if (!ids.length) return '';
    return '<div class="quiz-origenes"><span class="quiz-etiqueta">'
      + escapar(t('quizDesde')) + '</span> '
      + ids.map(function (pid) {
        var p = datos.postures[pid];
        return '<strong>' + escapar(rotuloPostura(p) || pid) + '</strong>';
      }).join(' · ')
      + '</div>';
  }

  function pintarAnalisis(pregunta) {
    var enlaces = (pregunta && pregunta.wikilinks) || [];
    var html = '<section class="quiz-tarjeta quiz-analisis">'
      + '<h3>' + escapar(t('quizAnalisis')) + '</h3>';
    if (!enlaces.length) {
      html += '<p class="quiz-vacio">' + escapar(t('quizAnalisisVacio')) + '</p></section>';
      return html;
    }
    html += '<div class="quiz-docs">';
    enlaces.forEach(function (enlace) {
      html += tarjetaMarkdown(enlace, t('quizAnalisisAbrir'));
    });
    html += '</div></section>';
    return html;
  }

  function pintarAclaraciones(nodo, datos) {
    var ids = (nodo.pregunta && nodo.pregunta.origin_posture_ids) || [];
    if (!ids.length && nodo.posturaId) ids = [nodo.posturaId];
    var vistos = {};
    var tarjetas = [];
    function agregar(enlace) {
      if (!enlace) return;
      var clave = enlace.vault_path || enlace.href || enlace.target || '';
      if (!clave || vistos[clave]) return;
      vistos[clave] = true;
      tarjetas.push(enlace);
    }
    ids.forEach(function (pid) {
      var postura = datos.postures[pid];
      if (!postura) return;
      (postura.wikilinks || []).forEach(agregar);
    });
    ((nodo.pregunta && nodo.pregunta.answers) || []).forEach(function (respuesta) {
      var destino = datos.postures[respuesta.target_posture_id];
      if (!destino) return;
      (destino.wikilinks || []).forEach(agregar);
    });
    var html = '<section class="quiz-tarjeta quiz-aclaraciones">'
      + '<h3>' + escapar(t('quizAclaraciones')) + '</h3>';
    if (!tarjetas.length) {
      html += '<p class="quiz-vacio">' + escapar(t('quizAclaracionesVacio'))
        + '</p></section>';
      return html;
    }
    html += '<div class="quiz-docs">';
    tarjetas.forEach(function (enlace) {
      html += tarjetaMarkdown(enlace, t('quizAclaracionAbrir'));
    });
    html += '</div></section>';
    return html;
  }

  /* Debajo de las respuestas: aviso de un problema con la pregunta. Primero
     recuerda el Modo de Edición (para proponer un cambio concreto) y después
     ofrece el formulario. */
  function urlFormularioAvisos(estado, pregunta) {
    if (!FORMULARIO_AVISOS.url) return '';
    var campos = FORMULARIO_AVISOS.campos;
    var params = [];
    function agregar(entrada, valor) {
      if (!entrada) return;
      params.push(encodeURIComponent(entrada) + '=' + encodeURIComponent(valor || ''));
    }
    var nombre = nombreGuardado();
    agregar(campos.nombre, nombre && nombre.valor ? nombre.valor : '');
    /* Casilla marcada de inicio en «Tipo de problema». Debe coincidir
       letra por letra con la opción del Form, o Google la ignora. */
    agregar(campos.tipoProblema, 'Fraseo ambiguo o confuso');
    agregar(campos.preguntaId, pregunta.id);
    agregar(campos.pregunta, Arbol.Formato
      ? Arbol.Formato.plano(pregunta.formal_text || '') : pregunta.formal_text);
    agregar(campos.camino, textoCamino(estado));
    agregar(campos.idioma, Arbol.I18n ? Arbol.I18n.idioma : '');
    return FORMULARIO_AVISOS.url + '?usp=pp_url' + (params.length ? '&' + params.join('&') : '');
  }

  /* Las respuestas dadas hasta ahora, en orden, para que quien revisa el
     aviso sepa desde qué recorrido llegó la persona a la pregunta. */
  function textoCamino(estado) {
    var respuestas = estado.respuestas;
    return Object.keys(respuestas).sort(function (a, b) {
      return Number(String(a).slice(1)) - Number(String(b).slice(1));
    }).map(function (qid) {
      var pregunta = estado.datos.questions[qid];
      var respuesta = pregunta && (pregunta.answers || []).filter(function (r) {
        return r.key === respuestas[qid];
      })[0];
      return qid + '=' + (respuesta ? respuesta.label : respuestas[qid])
        + (estado.conDudas(qid)
          ? ' (certeza ' + estado.certezaDe(qid) + '/' + NIVELES_CERTEZA + ')' : '');
    }).join('; ');
  }

  /* «Tengo un problema con esta pregunta»: enlace dentro de la tarjeta de
     «No responder». Pasar el ratón por él (o hacer clic, o enfocarlo con el
     teclado) abre un globo flotante; ninguna de las dos cosas responde la
     pregunta. El globo recuerda primero el Modo de Edición y luego ofrece el
     formulario. El enlace del formulario se recalcula al pulsarlo, para que
     lleve el nombre y el recorrido vigentes. */
  function pintarAvisoProblema(estado, pregunta) {
    var urlForm = urlFormularioAvisos(estado, pregunta);
    return '<div class="quiz-problema">'
      + '<a href="#" class="quiz-problema-abrir" role="button" aria-haspopup="dialog" aria-expanded="false">'
      + escapar(t('quizProblema')) + '</a>'
      + '<div class="quiz-problema-panel" role="dialog" aria-label="' + escapar(t('quizProblema')) + '" hidden>'
      + '<p>' + escapar(t('quizProblemaNota')) + '</p>'
      + '<div class="quiz-problema-acciones">'
      + '<button type="button" class="quiz-btn" data-accion="problema-edicion" data-pregunta="'
      + escapar(pregunta.id) + '">' + escapar(t('quizProblemaEdicion')) + '</button>'
      + (urlForm
        ? '<a class="quiz-btn primario quiz-problema-form" href="' + escapar(urlForm)
          + '" target="_blank" rel="noopener noreferrer" data-pregunta="' + escapar(pregunta.id) + '">'
          + escapar(t('quizProblemaFormulario')) + ' ↗</a>'
        : '<span class="quiz-vacio">' + escapar(t('quizProblemaSinFormulario')) + '</span>')
      + '</div></div></div>';
  }

  /* Globo del aviso: se abre al pasar el ratón (con un pequeño retardo) y se
     cierra al salir de enlace y globo; abierto con clic queda fijo hasta un
     clic fuera o Escape. */
  var RETARDO_ABRIR_PROBLEMA = 140;
  var RETARDO_CERRAR_PROBLEMA = 260;

  function zonaProblemaAbierta(zona) {
    var panel = zona && zona.querySelector('.quiz-problema-panel');
    return !!(panel && !panel.hidden);
  }

  function abrirZonaProblema(zona, fijar) {
    if (!zona) return;
    clearTimeout(zona._tCerrar);
    clearTimeout(zona._tAbrir);
    cerrarZonasProblema(zona);
    var panel = zona.querySelector('.quiz-problema-panel');
    var enlace = zona.querySelector('.quiz-problema-abrir');
    if (!panel) return;
    panel.hidden = false;
    zona.classList.add('abierta');
    if (fijar) zona.dataset.fijada = '1';
    if (enlace) enlace.setAttribute('aria-expanded', 'true');
  }

  function cerrarZonaProblema(zona) {
    if (!zona) return;
    clearTimeout(zona._tCerrar);
    clearTimeout(zona._tAbrir);
    var panel = zona.querySelector('.quiz-problema-panel');
    var enlace = zona.querySelector('.quiz-problema-abrir');
    if (panel) panel.hidden = true;
    zona.classList.remove('abierta');
    delete zona.dataset.fijada;
    if (enlace) enlace.setAttribute('aria-expanded', 'false');
  }

  function cerrarZonasProblema(excepto) {
    if (!raiz) return;
    Array.prototype.forEach.call(raiz.querySelectorAll('.quiz-problema.abierta'), function (zona) {
      if (zona !== excepto) cerrarZonaProblema(zona);
    });
  }

  function alPasarPorProblema(evento) {
    var zona = evento.target.closest ? evento.target.closest('.quiz-problema') : null;
    if (!zona) return;
    clearTimeout(zona._tCerrar);
    if (!evento.target.closest('.quiz-problema-abrir') || zonaProblemaAbierta(zona)) return;
    clearTimeout(zona._tAbrir);
    zona._tAbrir = setTimeout(function () { abrirZonaProblema(zona, false); },
      RETARDO_ABRIR_PROBLEMA);
  }

  function alSalirDeProblema(evento) {
    var zona = evento.target.closest ? evento.target.closest('.quiz-problema') : null;
    if (!zona) return;
    if (evento.relatedTarget && zona.contains(evento.relatedTarget)) return;
    clearTimeout(zona._tAbrir);
    if (zona.dataset.fijada) return;
    zona._tCerrar = setTimeout(function () { cerrarZonaProblema(zona); },
      RETARDO_CERRAR_PROBLEMA);
  }

  /* Barra continua, sin marcas de pasos; empieza en «Completamente segur@».
     `--pct` (0–100) pinta el relleno y el color del tirador. */
  function pintarBarraCerteza(etiqueta) {
    var plano = Arbol.Formato ? Arbol.Formato.plano(etiqueta) : String(etiqueta);
    return '<div class="quiz-certeza" style="--pct:100">'
      + '<input type="range" class="quiz-certeza-barra" min="0" max="100" step="any" value="100"'
      + ' aria-label="' + escapar(t('quizCertezaAria', { respuesta: plano })) + '">'
      + '<div class="quiz-certeza-rotulos" aria-hidden="true">'
      + '<span class="quiz-certeza-min">' + escapar(t('quizCertezaMin')) + '</span>'
      + '<span class="quiz-certeza-max">' + escapar(t('quizCertezaMax')) + '</span>'
      + '</div></div>';
  }

  function actualizarBarraCerteza(barra) {
    var contenedor = barra.closest('.quiz-certeza');
    var tarjeta = barra.closest('.quiz-opcion');
    var valor = Number(barra.value);
    if (contenedor) contenedor.style.setProperty('--pct', String(valor));
    if (tarjeta) {
      tarjeta.classList.toggle('con-dudas', nivelDeBarra(valor) < NIVELES_CERTEZA);
      tarjeta.classList.toggle('certeza-baja', valor < 50);
    }
  }

  function pintarRespuestas(nodo, estado) {
    var pregunta = nodo.pregunta;
    var pesos = Arbol.pesoDeRespuestas(estado.grafo);
    var tradicionesPorRespuesta = Arbol.tradicionesDeRespuestas(
      estado.grafo, estado.datos.traditions_index);
    var html = '<section class="quiz-respuestas"><h3>'
      + escapar(t('quizRespuestas')) + '</h3><div class="quiz-opciones">';
    (pregunta.answers || []).forEach(function (respuesta) {
      var etiqueta = dato('q.' + pregunta.id + '.' + respuesta.key + '.label', respuesta.label);
      var glosa = respuesta.gloss
        ? dato('q.' + pregunta.id + '.' + respuesta.key + '.gloss', respuesta.gloss)
        : '';
      var destino = estado.datos.postures[respuesta.target_posture_id];
      var tradiciones = tradicionesPorRespuesta[pregunta.id + ':' + respuesta.key] || [];
      var peso = pesos[pregunta.id + ':' + respuesta.key] || 0;
      var textoTradiciones = tradiciones.length
        ? tradiciones.join(' · ')
        : t('quizSinTradicion');
      var textoPeso = peso ? t('quizPesoRama', { n: String(peso) }) : '';
      /* La tarjeta es un contenedor: el botón de arriba responde; la barra
         de certeza de abajo solo se ajusta (no responde). Al responder se
         usa la certeza de la barra de esta misma tarjeta. */
      html += '<div class="quiz-opcion" data-pregunta="'
        + escapar(pregunta.id) + '" data-clave="'
        + escapar(respuesta.key) + '">'
        + '<button type="button" class="quiz-opcion-cuerpo">'
        + '<span class="quiz-opcion-etiqueta">' + formatear(etiqueta) + '</span>'
        + (glosa ? '<span class="quiz-opcion-glosa">' + formatear(glosa) + '</span>' : '')
        + '<span class="quiz-opcion-destino">'
        + '<span class="quiz-campo-rotulo">' + escapar(t('quizPosturaDestino')) + ':</span> '
        + '<span class="quiz-spoiler" aria-hidden="' + (revelarAdelantos ? 'false' : 'true') + '">'
        + '<strong>' + escapar(rotuloPostura(destino) || '—') + '</strong>'
        + '</span></span>'
        + '<span class="quiz-opcion-meta">'
        + '<span class="quiz-opcion-fila">'
        + '<span class="quiz-campo-rotulo">' + escapar(t('quizTradicionesSi')) + ':</span> '
        /* Cerca de la raíz la rama abarca decenas de tradiciones: la lista se
           corta a 3 renglones (CSS) y el total se anuncia junto al rótulo; la
           lista completa queda en el `title`. */
        + (tradiciones.length > 1
          ? '<span class="quiz-spoiler quiz-tradiciones-total" aria-hidden="'
            + (revelarAdelantos ? 'false' : 'true') + '">'
            + escapar(t('quizTradicionesTotal', { n: String(tradiciones.length) }))
            + '</span>'
          : '')
        + '<span class="quiz-spoiler quiz-tradiciones-lista" aria-hidden="'
        + (revelarAdelantos ? 'false' : 'true') + '"'
        + (tradiciones.length > 1 ? ' title="' + escapar(textoTradiciones) + '"' : '') + '>'
        + escapar(textoTradiciones)
        + '</span></span>'
        + (textoPeso
          ? '<span class="quiz-opcion-peso">'
            + '<span class="quiz-campo-rotulo">' + escapar(t('quizPesoRamaRotulo')) + ':</span> '
            + '<span class="quiz-spoiler" aria-hidden="'
            + (revelarAdelantos ? 'false' : 'true') + '">'
            + escapar(textoPeso)
            + '</span></span>'
          : '')
        + '</span></button>'
        + pintarBarraCerteza(etiqueta)
        + '</div>';
    });
    /* «No responder» es también una tarjeta contenedor: su botón cierra la
       rama como siempre y, al pie, el enlace «Tengo un problema con esta
       pregunta» abre el globo del aviso sin responder. */
    if (!estado.panelAbierto) {
      html += '<div class="quiz-opcion quiz-opcion-sin-respuesta" data-accion="sin-respuesta" data-pregunta="'
        + escapar(pregunta.id) + '">'
        + '<button type="button" class="quiz-opcion-cuerpo">'
        + '<span class="quiz-opcion-etiqueta">' + escapar(t('quizSinRespuesta')) + '</span>'
        + '<span class="quiz-opcion-glosa">' + escapar(t('quizSinRespuestaNota')) + '</span>'
        + '</button>'
        + pintarAvisoProblema(estado, pregunta)
        + '</div>';
    }
    html += '</div></section>';
    return html;
  }

  function pintarDefiniciones(nodo, estado) {
    var ids = (nodo.pregunta && nodo.pregunta.origin_posture_ids) || [];
    if (!ids.length && nodo.posturaId) ids = [nodo.posturaId];
    var html = '<section class="quiz-tarjeta quiz-contexto"><h3>'
      + escapar(t('quizDefinicion')) + '</h3>';
    var alguno = false;
    ids.forEach(function (pid) {
      var postura = estado.datos.postures[pid];
      if (!postura || postura.is_unnamed || postura.is_root) return;
      alguno = true;
      html += '<div class="quiz-def">'
        + '<h4>' + escapar(rotuloPostura(postura)) + '</h4>'
        + '<div class="quiz-def-cuerpo" data-def="' + escapar(pid) + '"></div></div>';
    });
    if (!alguno) {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinTradicion')) + '</p>';
    }
    html += '</section>';
    return html;
  }

  function pintarCabecera(estado, extras) {
    var respondidas = Object.keys(estado.respuestas).length;
    var vistaPrevia = !!(Arbol.Creencias
      && Arbol.Creencias.enModoDefinitoriasCuestionario(estado));
    var paso = vistaPrevia ? respondidas + 1 : historialPreguntas.length + 1;
    var pendientes = (extras && extras.pendientes) || [];
    var html = '<header class="quiz-cabecera">'
      + '<div class="quiz-cabecera-textos">'
      + '<p class="quiz-progreso">' + escapar(t('quizProgreso', {
        actual: String(paso),
        respondidas: String(respondidas)
      })) + '</p>';
    if (pendientes.length > 1) {
      html += '<p class="quiz-ramas-abiertas">'
        + escapar(t('quizRamasAbiertas', { n: String(pendientes.length) }))
        + '</p>';
    }
    html += '</div><div class="quiz-acciones-top">'
      + '<button type="button" class="quiz-chip-nombre" data-accion="cambiar-nombre" title="'
      + escapar(t('quizNombreCambiar')) + '">' + ICONO_PERSONA
      + '<span class="quiz-chip-nombre-texto">' + escapar(textoChipNombre()) + '</span></button>'
      + '<label class="quiz-revelar" title="' + escapar(t('quizRevelarTitle')) + '">'
      + '<input type="checkbox" data-accion="revelar"'
      + (revelarAdelantos ? ' checked' : '') + '>'
      + '<span>' + escapar(t('quizRevelar')) + '</span>'
      + '</label>'
      + '<label class="quiz-revelar" title="' + escapar(t('quizModoSeleccionTitle')) + '">'
      + '<input type="checkbox" data-accion="modo-seleccion"'
      + (modoSeleccion ? ' checked' : '') + '>'
      + '<span>' + escapar(t('quizModoSeleccion')) + '</span>'
      + '</label>';
    if (extras && extras.cambiarRama) {
      html += '<button type="button" class="quiz-btn fantasma" data-accion="cambiar-rama">'
        + escapar(t('quizCambiarRama')) + '</button>';
    }
    if (historialPreguntas.length) {
      html += '<button type="button" class="quiz-btn fantasma" data-accion="atras">'
        + escapar(t('quizAtras')) + '</button>';
    }
    html += '<button type="button" class="quiz-btn fantasma" data-accion="arbol">'
      + escapar(t('quizSaltarArbol')) + '</button>'
      + '</div></header>';
    if (pendientes.length > UMBRAL_SELECTOR && !modoSeleccion) {
      html += '<div class="quiz-aviso-ramas">'
        + '<p>' + escapar(t('quizAvisoMuchasRamas', { n: String(pendientes.length) })) + '</p>'
        + '</div>';
    }
    return html;
  }

  function pintarBloquePregunta(estado, nodo, indice, total) {
    var pregunta = nodo.pregunta;
    var coloquial = pregunta.colloquial_hint
      ? dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint)
      : '';
    var formal = dato('q.' + pregunta.id + '.formal', pregunta.formal_text);
    var html = '<article class="quiz-bloque" id="quiz-q-' + escapar(pregunta.id) + '">'
      + '<div class="quiz-lienzo">'
      + '<main class="quiz-foco">'
      + (total > 1
        ? '<p class="quiz-paso">' + escapar(t('quizRamaN', { n: String(indice + 1) })) + '</p>'
        : '<p class="quiz-paso">' + escapar(t('quizPaso', {
          n: String(historialPreguntas.length + 1)
        })) + '</p>')
      + pintarOrigenes(nodo, estado.datos)
      + (coloquial
        ? '<h2 class="quiz-coloquial">' + formatear(coloquial) + '</h2>'
          + '<p class="quiz-formal">' + formatear(formal) + '</p>'
        : '<h2 class="quiz-coloquial">' + formatear(formal) + '</h2>')
      + pintarRespuestas(nodo, estado)
      + '</main>'
      + '<aside class="quiz-lateral">'
      + pintarAnalisis(pregunta)
      + pintarAclaraciones(nodo, estado.datos)
      + pintarDefiniciones(nodo, estado)
      + '</aside>'
      + '</div></article>';
    return html;
  }

  function clasesEscena(extras) {
    var clases = ['quiz-escena'];
    if (revelarAdelantos) clases.push('revelar-adelantos');
    if (extras && extras.varias) clases.push('quiz-escena--varias');
    if (extras && extras.muchas) clases.push('quiz-escena--muchas');
    return clases.join(' ');
  }

  function pintarSelectorRamas(estado, pendientes) {
    mostrandoReporte = false;
    var html = '<div class="' + clasesEscena() + '">'
      + pintarCabecera(estado, { pendientes: pendientes })
      + '<div class="quiz-selector">'
      + '<p class="quiz-paso">' + escapar(t('quizVariasRamas')) + '</p>'
      + '<h1 class="quiz-coloquial">' + escapar(t('quizEligeRama')) + '</h1>'
      + '<p class="quiz-formal">' + escapar(t('quizEligeRamaNota')) + '</p>'
      + '<div class="quiz-ramas">';
    pendientes.forEach(function (nodo, indice) {
      html += '<button type="button" class="quiz-rama" data-elegir-pregunta="'
        + escapar(nodo.preguntaId) + '">'
        + '<span class="quiz-rama-indice">'
        + escapar(t('quizRamaN', { n: String(indice + 1) }))
        + '</span>'
        + '<span class="quiz-rama-origen">' + escapar(etiquetaRama(nodo, estado.datos))
        + '</span>'
        + '<span class="quiz-rama-pregunta">' + escapar(textoCortoPregunta(nodo.pregunta))
        + '</span>'
        + '</button>';
    });
    html += '</div></div></div>';
    raiz.innerHTML = html;
    delete raiz.dataset.pregunta;
  }

  function pintarPromptVistaSimplificada(estado, pendientes) {
    mostrandoReporte = false;
    var html = '<div class="' + clasesEscena() + ' quiz-escena--prompt">'
      + pintarCabecera(estado, { pendientes: pendientes })
      + '<section class="quiz-prompt-simplificada" role="dialog" aria-labelledby="quiz-prompt-titulo">'
      + '<p class="quiz-paso">' + escapar(t('quizVariasRamas')) + '</p>'
      + '<h1 class="quiz-coloquial" id="quiz-prompt-titulo">'
      + escapar(t('quizPromptSimplificadaTitulo'))
      + '</h1>'
      + '<p class="quiz-formal">' + escapar(t('quizPromptSimplificadaNota')) + '</p>'
      + '<div class="quiz-prompt-acciones">'
      + '<button type="button" class="quiz-btn primario" data-accion="vista-simplificada-si">'
      + escapar(t('quizPromptSimplificadaSi')) + '</button>'
      + '<button type="button" class="quiz-btn fantasma" data-accion="vista-simplificada-no">'
      + escapar(t('quizPromptSimplificadaNo')) + '</button>'
      + '</div></section></div>';
    raiz.innerHTML = html;
    delete raiz.dataset.pregunta;
  }

  function pintarPreguntasAbiertas(estado, pendientes) {
    mostrandoReporte = false;
    preguntaElegida = null;
    var n = pendientes.length;
    var html = '<div class="' + clasesEscena({
      varias: n > 1,
      muchas: n > 3
    }) + '">'
      + pintarCabecera(estado, { pendientes: pendientes })
      + '<div class="quiz-bloques">';
    pendientes.forEach(function (nodo, indice) {
      html += pintarBloquePregunta(estado, nodo, indice, n);
    });
    html += '</div></div>';
    raiz.innerHTML = html;
    delete raiz.dataset.pregunta;
    if (deps && deps.pintarDefiniciones) deps.pintarDefiniciones(raiz);
    hidratarMarkdown();
  }

  function pintarPregunta(estado, nodo, pendientes) {
    mostrandoReporte = false;
    raiz.innerHTML = '<div class="' + clasesEscena() + '">'
      + pintarCabecera(estado, {
        pendientes: pendientes,
        cambiarRama: false
      })
      + '<div class="quiz-bloques">'
      + pintarBloquePregunta(estado, nodo, 0, 1)
      + '</div></div>';
    if (deps && deps.pintarDefiniciones) deps.pintarDefiniciones(raiz);
    hidratarMarkdown();
    raiz.dataset.pregunta = nodo.pregunta.id;
  }

  function pintarEscena(estado) {
    var pendientes = preguntasPendientes(estado);
    if (!pendientes.length) {
      preguntaElegida = null;
      mostrandoReporte = true;
      pintarReporte(estado);
      return;
    }
    if (debeMostrarPromptSimplificada(estado, pendientes)) {
      pintarPromptVistaSimplificada(estado, pendientes);
      return;
    }
    if (debeUsarModoSimplificado(pendientes)) {
      preguntaElegida = null;
      pintarPregunta(estado, pendientes[0], pendientes);
      return;
    }
    pintarPreguntasAbiertas(estado, pendientes);
  }

  function insigniasDePostura(postura) {
    var insignias = [];
    if (!postura) return insignias;
    if (postura.is_suggested) insignias.push(t('quizTerminoSugerido'));
    if (postura.is_uncertain) insignias.push(t('quizDenominacionDuda'));
    return insignias;
  }

  function llegadaAPostura(estado, nodo) {
    var camino = estado.caminoElegido();
    if (!nodo || !nodo.entradas) return null;
    var i;
    for (i = 0; i < nodo.entradas.length; i++) {
      var arista = nodo.entradas[i];
      if (!camino.has(arista.desde)) continue;
      if (arista.tipo !== 'respuesta' && arista.tipo !== 'eje') continue;
      var desde = estado.grafo.nodos.get(arista.desde);
      var pregunta = arista.preguntaId && estado.datos.questions[arista.preguntaId];
      if (!pregunta && desde && desde.pregunta) pregunta = desde.pregunta;
      var respuesta = null;
      if (pregunta && arista.clave) {
        (pregunta.answers || []).some(function (r) {
          if (r.key === arista.clave) { respuesta = r; return true; }
          return false;
        });
      }
      var padreNombrado = posturaNombradaCercana(estado, desde, camino);
      if (padreNombrado && nodo.postura
        && padreNombrado.postura.id === nodo.postura.id) {
        padreNombrado = null;
      }
      return {
        desde: desde,
        pregunta: pregunta,
        respuesta: respuesta,
        padreNombrado: padreNombrado,
        tipo: arista.tipo
      };
    }
    return null;
  }

  function pintarEnlacesPostura(postura) {
    var enlaces = (postura && postura.wikilinks) || [];
    if (!enlaces.length) return '';
    var html = '<div class="quiz-ficha-enlaces quiz-docs">'
      + '<h4>' + escapar(t('quizAclaraciones')) + '</h4>';
    enlaces.forEach(function (enlace) {
      html += tarjetaMarkdown(enlace, t('quizAclaracionAbrir'));
    });
    html += '</div>';
    return html;
  }

  function pintarRelacionPostura(estado, item) {
    var llegada = llegadaAPostura(estado, item.nodo);
    var partes = [];
    if (llegada && llegada.padreNombrado) {
      partes.push(t('quizRelacionDesde', {
        postura: rotuloPostura(llegada.padreNombrado.postura)
      }));
    }
    if (llegada && llegada.pregunta) {
      var formal = dato('q.' + llegada.pregunta.id + '.formal', llegada.pregunta.formal_text);
      var coloquial = llegada.pregunta.colloquial_hint
        ? dato('q.' + llegada.pregunta.id + '.coloquial', llegada.pregunta.colloquial_hint)
        : '';
      var preguntaTxt = coloquial || formal;
      if (llegada.respuesta) {
        var et = dato(
          'q.' + llegada.pregunta.id + '.' + llegada.respuesta.key + '.label',
          llegada.respuesta.label
        );
        partes.push(t(estado.conDudas(llegada.pregunta.id)
          ? 'quizRelacionDudas' : 'quizRelacionRespuesta', {
          respuesta: et,
          pregunta: preguntaTxt
        }));
      } else {
        partes.push(t('quizRelacionPregunta', { pregunta: preguntaTxt }));
      }
    }
    if (!partes.length) return '';
    return '<div class="quiz-ficha-relacion">'
      + '<h4>' + escapar(t('quizRelacion')) + '</h4>'
      + partes.map(function (p) {
        return '<p>' + formatear(p) + '</p>';
      }).join('')
      + '</div>';
  }

  /* Preguntas respondidas en el recorrido desde la raíz hasta `nodo`. */
  function preguntasHasta(estado, nodo) {
    var camino = estado.caminoElegido();
    var qids = [];
    var actual = padreEnCamino(estado, nodo, camino);
    var vistos = new Set();
    while (actual && !vistos.has(actual.id)) {
      vistos.add(actual.id);
      if (actual.preguntaId && estado.respuestas[actual.preguntaId] != null
        && qids.indexOf(actual.preguntaId) === -1) {
        qids.push(actual.preguntaId);
      }
      actual = padreEnCamino(estado, actual, camino);
    }
    return qids.reverse();
  }

  function textoPregunta(pregunta) {
    var coloquial = pregunta.colloquial_hint
      ? dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint)
      : '';
    return coloquial || dato('q.' + pregunta.id + '.formal', pregunta.formal_text);
  }

  function etiquetaRespuesta(pregunta, clave) {
    var respuesta = (pregunta.answers || []).filter(function (r) {
      return r.key === clave;
    })[0];
    if (!respuesta) return clave;
    return dato('q.' + pregunta.id + '.' + respuesta.key + '.label', respuesta.label);
  }

  /* Certeza del recorrido hasta la postura: la barra es la certeza media;
     el texto, cuántas respuestas fueron con certeza completa. */
  function pintarFirmeza(estado, item) {
    var qids = preguntasHasta(estado, item.nodo);
    if (!qids.length) return '';
    var inclinadas = qids.filter(function (qid) { return estado.conDudas(qid); });
    var firmes = qids.length - inclinadas.length;
    var suma = qids.reduce(function (acc, qid) {
      return acc + pesoCerteza(estado.certezaDe(qid));
    }, 0);
    var porcentaje = Math.round((suma / qids.length) * 100);
    var html = '<div class="quiz-firmeza' + (inclinadas.length ? ' con-dudas' : '') + '">'
      + '<h4>' + escapar(t('quizFirmeza')) + '</h4>'
      + '<p>' + escapar(t('quizFirmezaResumen', {
        firmes: String(firmes),
        total: String(qids.length)
      })) + '</p>'
      + '<div class="quiz-barra quiz-barra-firmeza"><span style="width:'
      + porcentaje + '%"></span></div>';
    if (inclinadas.length) {
      html += '<p class="quiz-firmeza-nota">' + escapar(t('quizFirmezaNota', {
        n: String(inclinadas.length)
      })) + '</p>';
    }
    return html + '</div>';
  }

  /* «Tus puntos de duda»: una tarjeta por respuesta sin certeza completa,
     de menor a mayor certeza. Muestra a qué postura llevaría otra respuesta
     (la alternativa más cercana a la postura alcanzada) y qué leer para
     decidir. */
  function pintarPuntosDeDuda(estado) {
    var camino = estado.caminoElegido();
    var qids = Object.keys(estado.respuestas).filter(function (qid) {
      if (!estado.conDudas(qid)) return false;
      var anfitrion = estado.grafo.anfitrionDePregunta(qid);
      return !anfitrion || camino.has(anfitrion);
    }).sort(function (a, b) {
      return (estado.certezaDe(a) - estado.certezaDe(b))
        || (Number(String(a).slice(1)) - Number(String(b).slice(1)));
    });
    if (!qids.length) return '';
    var html = '<section class="quiz-tarjeta quiz-dudas"><h3>'
      + escapar(t('quizDudas')) + '</h3>'
      + '<p class="quiz-dudas-intro">' + escapar(t('quizDudasIntro')) + '</p>';
    qids.forEach(function (qid) {
      var pregunta = estado.datos.questions[qid];
      if (!pregunta) return;
      var elegida = estado.respuestas[qid];
      html += '<article class="quiz-duda">'
        + '<p class="quiz-duda-pregunta">' + formatear(textoPregunta(pregunta)) + '</p>'
        + '<div class="quiz-duda-certeza" title="' + escapar(t('quizDudaCertezaTitle')) + '">'
        + '<span style="width:' + Math.round(pesoCerteza(estado.certezaDe(qid)) * 100) + '%"></span>'
        + '</div>'
        + '<p class="quiz-duda-eleccion">' + formatear(t('quizDudaEleccion', {
          respuesta: etiquetaRespuesta(pregunta, elegida)
        })) + '</p>';
      var alternativas = (pregunta.answers || []).filter(function (r) {
        return r.key !== elegida;
      });
      if (alternativas.length) {
        html += '<ul class="quiz-duda-alternativas">';
        alternativas.forEach(function (r) {
          var destino = estado.datos.postures[r.target_posture_id];
          var nombrada = posturaTieneNombre(destino);
          html += '<li><span>' + formatear(t('quizDudaAlternativa', {
            respuesta: etiquetaRespuesta(pregunta, r.key)
          })) + ' <strong>'
            + escapar(nombrada ? rotuloPostura(destino) : t('quizDudaSinNombre'))
            + '</strong></span>'
            + (nombrada
              ? '<button type="button" class="quiz-btn-mini" data-accion="explorar-postura" data-postura="'
                + escapar(destino.id) + '">' + escapar(t('quizExplorarTradicion')) + '</button>'
              : '')
            + '</li>';
        });
        html += '</ul>';
      }
      var lecturas = (pregunta.wikilinks || []).map(function (enlace) {
        var destino = urlNota(enlace);
        if (!destino) return '';
        return '<a class="enlace-md-externo" href="' + escapar(destino)
          + '" target="_blank" rel="noopener noreferrer">'
          + '<span class="enlace-md-icono" aria-hidden="true">↗</span>'
          + '<span>' + escapar(enlace.label || enlace.target || '') + '</span></a>';
      }).filter(Boolean);
      if (lecturas.length) {
        html += '<div class="quiz-duda-lecturas"><span class="quiz-campo-rotulo">'
          + escapar(t('quizDudaLeer')) + ':</span> ' + lecturas.join(' ') + '</div>';
      }
      html += '<div class="quiz-duda-acciones">'
        + '<button type="button" class="quiz-btn-mini" data-accion="reconsiderar" data-pregunta="'
        + escapar(qid) + '">' + escapar(t('quizDudaReconsiderar')) + '</button>'
        + '</div></article>';
    });
    return html + '</section>';
  }

  function pintarFichaPostura(estado, item, clase) {
    var postura = item.postura;
    var trads = tradicionesDePostura(postura, estado.datos);
    var insignias = insigniasDePostura(postura);
    var notas = (postura.notes || []).filter(Boolean);
    var esPrincipal = !clase || clase === 'quiz-hero-postura';
    var html = '<article class="' + (clase || 'quiz-hero-postura') + '">'
      + '<h2>' + escapar(rotuloPostura(postura)) + '</h2>';
    if (insignias.length) {
      html += '<p class="quiz-ficha-insignias">' + escapar(insignias.join(' · ')) + '</p>';
    }
    if (esPrincipal) html += pintarFirmeza(estado, item);
    if (trads.length) {
      html += '<p class="quiz-hero-trads">'
        + '<span class="quiz-campo-rotulo">' + escapar(t('sostenidaPor')) + ':</span> '
        + trads.map(function (nombre) {
          return '<button type="button" class="quiz-enlace quiz-trad-enlace" data-accion="explorar-tradicion" data-tradicion="'
            + escapar(nombre) + '">' + escapar(nombre) + '</button>';
        }).join(' · ')
        + '</p>';
    }
    html += pintarRelacionPostura(estado, item);
    html += '<div class="quiz-ficha-definicion">'
      + '<h4>' + escapar(t('definicion')) + '</h4>'
      + '<div class="quiz-def-cuerpo" data-def="' + escapar(postura.id) + '"></div>'
      + '</div>';
    if (notas.length) {
      html += '<div class="quiz-ficha-notas">'
        + '<h4>' + escapar(t('notasHistoricas')) + '</h4>'
        + '<p>' + escapar(notas.join(' · ')) + '</p>'
        + '</div>';
    }
    html += pintarEnlacesPostura(postura);
    html += '<div class="quiz-ficha-acciones">'
      + '<button type="button" class="quiz-btn primario" data-accion="explorar-postura" data-postura="'
      + escapar(postura.id) + '">'
      + escapar(t('quizExplorarPostura')) + '</button>'
      + '</div>';
    html += '</article>';
    return html;
  }

  function pintarReporte(estado) {
    var especificas = posturasEspecificas(estado);
    registrarResultado(estado, especificas);
    var idsEspecificas = {};
    especificas.forEach(function (item) {
      if (item && item.postura) idsEspecificas[item.postura.id] = true;
    });
    var camino = posturasDelCamino(estado).filter(function (item) {
      return item && item.postura && !idsEspecificas[item.postura.id];
    });
    /* Encaja toda tradición cuyo camino completo coincide con las respuestas
       del usuario (conteo entero, sin ponderar por certeza): equivale a estar
       anotada en alguna postura que alcanzó, sea la más específica, una
       intermedia o una sin nombre. Primero van las de las posturas más
       específicas; después, las demás, de camino más largo a más corto.
       «Afines» queda solo para coincidencias parciales. */
    var tradicionesExactas = [];
    especificas.forEach(function (item) {
      tradicionesDePostura(item.postura, estado.datos).forEach(function (nombre) {
        if (tradicionesExactas.indexOf(nombre) === -1) tradicionesExactas.push(nombre);
      });
    });
    var encajanPorCamino = [];
    var cercanas = [];
    Object.keys(estado.datos.traditions_index || {}).forEach(function (nombre) {
      if (tradicionesExactas.indexOf(nombre) !== -1) return;
      var score = coincidenciasTradicion(estado, nombre);
      if (score.total && score.coinciden === score.total) {
        encajanPorCamino.push({ nombre: nombre, score: score });
        return;
      }
      if (score.comunes < 2) return;
      cercanas.push({ nombre: nombre, score: score });
    });
    encajanPorCamino.sort(function (a, b) {
      return b.score.total - a.score.total
        || a.nombre.localeCompare(b.nombre, (Arbol.I18n && Arbol.I18n.idioma) || 'es');
    });
    encajanPorCamino.forEach(function (item) { tradicionesExactas.push(item.nombre); });
    cercanas.sort(function (a, b) {
      return b.score.porcentaje - a.score.porcentaje || b.score.comunes - a.score.comunes;
    });
    cercanas = cercanas.slice(0, 6);

    var html = '<div class="quiz-escena quiz-reporte">'
      + '<header class="quiz-cabecera">'
      + '<p class="quiz-progreso">' + escapar(t('quizReporteTitulo')) + '</p>'
      + '</header>'
      + '<div class="quiz-reporte-cuerpo">'
      + '<p class="quiz-reporte-intro">' + escapar(t('quizReporteIntro')) + '</p>'
      + '<div class="quiz-reporte-columnas">'
      + '<div class="quiz-reporte-principal">';

    html += '<section class="quiz-especificas"><h3 class="quiz-etiqueta">'
      + escapar(t('quizPosturasEspecificas')) + '</h3>';
    if (especificas.length) {
      html += '<div class="quiz-especificas-lista">';
      especificas.forEach(function (item) {
        html += pintarFichaPostura(estado, item, 'quiz-hero-postura');
      });
      html += '</div>';
    } else {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinPosturaNombrada')) + '</p>';
    }
    html += '</section>';

    html += pintarPuntosDeDuda(estado);

    html += '<section class="quiz-tarjeta"><h3>'
      + escapar(t('quizReligionesEncaje')) + '</h3>';
    if (tradicionesExactas.length) {
      html += '<ul class="quiz-chips">'
        + tradicionesExactas.map(function (n) {
          /* El paréntesis final es una precisión (confesión, época, grupos):
             sigue al nombre en el mismo renglón, en color tenue, para que el
             nombre se lea primero. Si no cabe, se corta con «…» (CSS). */
          var partes = String(n).match(/^(.*?)\s*\(([^()]*)\)\s*$/);
          var principal = partes && partes[1] ? partes[1] : n;
          var detalle = partes && partes[1] ? partes[2] : '';
          return '<li><button type="button" class="quiz-chip-btn" data-accion="explorar-tradicion" data-tradicion="'
            + escapar(n) + '" title="' + escapar(n + ' — ' + t('quizExplorarTradicion')) + '">'
            + '<span class="quiz-chip-texto">'
            + '<span class="quiz-chip-principal">' + escapar(principal) + '</span>'
            + (detalle ? '<span class="quiz-chip-detalle"> · ' + escapar(detalle) + '</span>' : '')
            + '</span></button></li>';
        }).join('')
        + '</ul>';
    } else {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinReligion')) + '</p>';
    }
    html += '</section>';

    html += '<section class="quiz-tarjeta"><h3>'
      + escapar(t('quizReligionesCercanas')) + '</h3>'
      + '<p class="quiz-tarjeta-intro">' + escapar(t('quizReligionesCercanasIntro')) + '</p>';
    if (cercanas.length) {
      html += '<ul class="quiz-cercanas">';
      cercanas.forEach(function (item) {
        html += '<li><div class="quiz-cercana-cabecera"><strong>' + escapar(item.nombre) + '</strong>'
          + '<span>' + escapar(t('quizCoincidencias', {
            n: String(item.score.coinciden), total: String(item.score.total)
          })) + ' · ' + escapar(t('quizAfinidad', { pct: String(item.score.porcentaje) }))
          + '</span></div>'
          + '<div class="quiz-barra"><span style="width:'
          + item.score.porcentaje + '%"></span></div>'
          + '<button type="button" class="quiz-btn-mini" data-accion="explorar-tradicion" data-tradicion="'
          + escapar(item.nombre) + '">'
          + escapar(t('quizExplorarTradicion')) + '</button></li>';
      });
      html += '</ul>';
    } else {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinCercanas')) + '</p>';
    }
    html += '</section>';

    html += '<div class="quiz-reporte-acciones">'
      + '<button type="button" class="quiz-btn" data-accion="reiniciar-quiz">'
      + escapar(t('quizOtraVez')) + '</button>'
      + '</div>'
      + '<div class="quiz-resultado-pie">' + pintarBorrarResultado() + '</div>'
      + '</div>'; // principal

    html += '<aside class="quiz-reporte-lateral">'
      + '<section class="quiz-tarjeta quiz-camino-section"><h3>'
      + escapar(t('quizPosturasCamino')) + '</h3>';
    if (camino.length) {
      html += '<div class="quiz-camino-fichas">';
      camino.forEach(function (item, indice) {
        html += '<div class="quiz-camino-ficha">'
          + '<p class="quiz-paso">' + escapar(t('quizPasoCamino', { n: String(indice + 1) })) + '</p>'
          + pintarFichaPostura(estado, item, 'quiz-camino-cuerpo')
          + '</div>';
      });
      html += '</div>';
    } else {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinPosturaNombrada')) + '</p>';
    }
    html += '</section></aside>'
      + '</div></div></div>'; // columnas, cuerpo, escena

    raiz.innerHTML = html;
    if (deps && deps.pintarDefiniciones) deps.pintarDefiniciones(raiz);
    hidratarMarkdown();
  }

  function aplicarRevelacion() {
    if (!raiz) return;
    var escena = raiz.querySelector('.quiz-escena');
    if (escena) escena.classList.toggle('revelar-adelantos', revelarAdelantos);
    Array.prototype.forEach.call(raiz.querySelectorAll('.quiz-spoiler'), function (el) {
      el.setAttribute('aria-hidden', revelarAdelantos ? 'false' : 'true');
    });
    var control = raiz.querySelector('[data-accion="revelar"]');
    if (control) control.checked = revelarAdelantos;
  }

  function alCambiar(evento) {
    if (!evento.target) return;
    var accion = evento.target.getAttribute('data-accion');
    if (accion === 'revelar') {
      revelarAdelantos = !!evento.target.checked;
      aplicarRevelacion();
      return;
    }
    if (accion === 'modo-seleccion') {
      modoSeleccion = !!evento.target.checked;
      preguntaElegida = null;
      if (modoSeleccion) marcarPromptSimplificadoRespondido();
      if (deps && deps.estado) pintarEscena(deps.estado);
      return;
    }
  }

  function alClick(evento) {
    if (!deps || !deps.estado) return;
    if (evento.target && evento.target.closest
      && evento.target.closest('.quiz-revelar')) {
      evento.stopPropagation();
      return;
    }
    var estado = deps.estado;
    if (estado.panelAbierto) {
      var opcionBloqueada = evento.target.closest
        ? evento.target.closest('.quiz-opcion') : null;
      if (opcionBloqueada) return;
    }
    /* La barra de certeza se ajusta, no responde. */
    if (evento.target.closest && evento.target.closest('.quiz-certeza')) return;
    /* El aviso de problema vive dentro de «No responder», pero nada de lo
       que se pulse en él cierra la rama. */
    var zonaProblema = evento.target.closest ? evento.target.closest('.quiz-problema') : null;
    if (zonaProblema) {
      var enlaceProblema = evento.target.closest('.quiz-problema-abrir');
      if (enlaceProblema) {
        evento.preventDefault();
        if (zonaProblemaAbierta(zonaProblema) && zonaProblema.dataset.fijada) {
          cerrarZonaProblema(zonaProblema);
        } else {
          abrirZonaProblema(zonaProblema, true);
        }
        return;
      }
      var edicion = evento.target.closest('[data-accion="problema-edicion"]');
      if (edicion) {
        var qidEd = edicion.getAttribute('data-pregunta');
        cerrarZonaProblema(zonaProblema);
        if (qidEd && deps.abrirPreguntaEnEdicion) deps.abrirPreguntaEnEdicion(qidEd);
        return;
      }
      var formulario = evento.target.closest('.quiz-problema-form');
      if (formulario) {
        var preguntaForm = estado.datos.questions[formulario.getAttribute('data-pregunta')];
        var urlVigente = preguntaForm && urlFormularioAvisos(estado, preguntaForm);
        if (urlVigente) formulario.href = urlVigente;
      }
      return;
    }
    var sinRespuesta = evento.target.closest
      ? evento.target.closest('[data-accion="sin-respuesta"]') : null;
    if (sinRespuesta) {
      var qidSin = sinRespuesta.getAttribute('data-pregunta') || raiz.dataset.pregunta;
      if (!qidSin) return;
      historialPreguntas.push(qidSin);
      preguntaElegida = null;
      estado.marcarSinRespuesta(qidSin);
      return;
    }
    var elegir = evento.target.closest ? evento.target.closest('[data-elegir-pregunta]') : null;
    if (elegir) {
      preguntaElegida = elegir.getAttribute('data-elegir-pregunta');
      mostrandoReporte = false;
      pintarEscena(estado);
      return;
    }
    var opcion = evento.target.closest ? evento.target.closest('.quiz-opcion') : null;
    if (opcion) {
      var clave = opcion.getAttribute('data-clave');
      var qid = opcion.getAttribute('data-pregunta') || raiz.dataset.pregunta;
      if (!qid || !clave) return;
      var barra = opcion.querySelector('.quiz-certeza-barra');
      historialPreguntas.push(qid);
      preguntaElegida = null;
      estado.responder(qid, clave, barra ? nivelDeBarra(barra.value) : NIVELES_CERTEZA);
      return;
    }
    var boton = evento.target.closest ? evento.target.closest('[data-accion]') : null;
    if (!boton) return;
    var accion = boton.getAttribute('data-accion');
    if (accion === 'cambiar-nombre') {
      mostrarCapaNombre();
      return;
    }
    if (accion === 'borrar-resultado') {
      borrarResultado();
      var pie = boton.parentNode;
      if (pie) pie.innerHTML = pintarBorrarResultado();
      return;
    }
    if (accion === 'reconsiderar') {
      var qidRe = boton.getAttribute('data-pregunta');
      if (!qidRe) return;
      preguntaElegida = null;
      mostrandoReporte = false;
      estado.borrarRespuesta(qidRe);
      historialPreguntas = historialPreguntas.filter(function (q) {
        return estado.respuestas[q] != null
          || (estado.ramasSinRespuesta && estado.ramasSinRespuesta[q]);
      });
      return;
    }
    if (accion === 'cambiar-rama') {
      preguntaElegida = null;
      pintarEscena(estado);
      return;
    }
    if (accion === 'vista-simplificada-si') {
      var pendientesPrompt = preguntasPendientes(estado);
      registrarRespuestaPrompt(pendientesPrompt, true);
      pintarEscena(estado);
      return;
    }
    if (accion === 'vista-simplificada-no') {
      var pendientesRechazo = preguntasPendientes(estado);
      registrarRespuestaPrompt(pendientesRechazo, false);
      pintarEscena(estado);
      return;
    }
    if (accion === 'atras') {
      var anterior = historialPreguntas.pop();
      preguntaElegida = null;
      if (anterior) {
        if (estado.ramasSinRespuesta && estado.ramasSinRespuesta[anterior]) {
          delete estado.ramasSinRespuesta[anterior];
          estado.emitir('respuesta');
        } else {
          estado.borrarRespuesta(anterior);
        }
      }
      return;
    }
    if (accion === 'arbol') {
      if (deps.fijarRecorrido) deps.fijarRecorrido('indagatorio');
      return;
    }
    if (accion === 'explorar-postura') {
      var pid = boton.getAttribute('data-postura');
      if (pid && deps.explorarEnArbol) deps.explorarEnArbol({ posturaId: pid });
      return;
    }
    if (accion === 'explorar-tradicion') {
      var trad = boton.getAttribute('data-tradicion');
      if (trad && deps.explorarEnArbol) deps.explorarEnArbol({ tradicion: trad });
      return;
    }
    if (accion === 'reiniciar-quiz') {
      historialPreguntas = [];
      preguntaElegida = null;
      modoSeleccion = false;
      mostrandoReporte = false;
      Object.keys(estado.respuestas).forEach(function (qid) {
        delete estado.respuestas[qid];
      });
      estado.ramasSinRespuesta = {};
      estado.certezas = {};
      nombrePreguntadoEnCarga = false;
      estado.superpuestas = {};
      estado.rutasExploradas = {};
      estado.posturasExploradasCuestionario = [];
      estado.emitir('respuesta');
    }
  }

  function sembrarHistorial(estado) {
    if (historialPreguntas.length) return;
    var respuestas = estado.respuestasEfectivas();
    var orden = Object.keys(respuestas).sort(function (a, b) {
      return Number(String(a).slice(1)) - Number(String(b).slice(1));
    });
    historialPreguntas = orden.slice();
  }

  var _marcaSeleccionPanel = '';

  var Cuestionario = {
    montar: function (opciones) {
      deps = opciones || {};
      raiz = document.getElementById('modo-cuestionario');
      if (!raiz) {
        raiz = document.createElement('div');
        raiz.id = 'modo-cuestionario';
        raiz.hidden = true;
        document.getElementById('aplicacion').appendChild(raiz);
      }
      raiz.addEventListener('click', alClick);
      raiz.addEventListener('change', alCambiar);
      raiz.addEventListener('mouseover', alPasarPorProblema);
      raiz.addEventListener('mouseout', alSalirDeProblema);
      /* Teclado: enfocar el enlace abre el globo; Escape lo cierra. Un clic
         fuera cierra el que esté abierto. */
      raiz.addEventListener('focusin', function (evento) {
        if (evento.target.classList && evento.target.classList.contains('quiz-problema-abrir')) {
          var zonaFoco = evento.target.closest('.quiz-problema');
          if (zonaFoco && !zonaFoco._sinAbrirAlEnfocar) abrirZonaProblema(zonaFoco, false);
        }
      });
      raiz.addEventListener('focusout', function (evento) {
        var zona = evento.target.closest ? evento.target.closest('.quiz-problema') : null;
        if (!zona || zona.dataset.fijada) return;
        if (evento.relatedTarget && zona.contains(evento.relatedTarget)) return;
        cerrarZonaProblema(zona);
      });
      document.addEventListener('keydown', function (evento) {
        if (evento.key !== 'Escape' || !raiz) return;
        var abierta = raiz.querySelector('.quiz-problema.abierta');
        if (!abierta) return;
        cerrarZonaProblema(abierta);
        var enlace = abierta.querySelector('.quiz-problema-abrir');
        if (!enlace) return;
        abierta._sinAbrirAlEnfocar = true;
        enlace.focus({ preventScroll: true });
        abierta._sinAbrirAlEnfocar = false;
      });
      document.addEventListener('click', function (evento) {
        if (!raiz) return;
        Array.prototype.forEach.call(raiz.querySelectorAll('.quiz-problema.abierta'), function (zona) {
          if (!zona.contains(evento.target)) cerrarZonaProblema(zona);
        });
      });
      raiz.addEventListener('input', function (evento) {
        if (evento.target && evento.target.classList
          && evento.target.classList.contains('quiz-certeza-barra')) {
          actualizarBarraCerteza(evento.target);
        }
      });
    },

    sincronizar: function (estado) {
      if (!raiz) return;
      var activo = estado.divulgacion === 'cuestionario';
      document.body.classList.toggle('en-cuestionario', activo);
      document.body.classList.toggle('quiz-panel-creencias', activo && estado.panelAbierto);
      raiz.hidden = !activo;
      raiz.setAttribute('aria-hidden', activo ? 'false' : 'true');
      if (!activo) {
        ocultarCapaNombre();
        return;
      }
      if (debePedirNombre(estado)) mostrarCapaNombre();
      var marcaPanel = estado.panelAbierto
        ? estado.posturasSueltas.slice().sort().join(',')
        : (estado.posturasExploradasCuestionario || []).slice().sort().join('|');
      if (marcaPanel !== _marcaSeleccionPanel) {
        preguntaElegida = null;
        modoSeleccion = false;
        _marcaSeleccionPanel = marcaPanel;
      }
      sembrarHistorial(estado);
      var pendientes = preguntasPendientes(estado);
      if (mostrandoReporte && !pendientes.length) {
        pintarReporte(estado);
        return;
      }
      mostrandoReporte = false;
      pintarEscena(estado);
    },

    reiniciarHistorial: function () {
      historialPreguntas = [];
      preguntaElegida = null;
      modoSeleccion = false;
      mostrandoReporte = false;
    }
  };

  Arbol.Cuestionario = Cuestionario;

})(window);

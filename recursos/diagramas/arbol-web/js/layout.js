/* Medición de texto, composición de las cajas y layout jerárquico por niveles
   (Sugiyama simplificado: rangos por camino más largo, orden por mediana y
   coordenadas X por regresión isotónica). Todo en coordenadas de mundo; la
   cámara solo aplica una matriz sobre el <g> raíz, así que el SVG conserva su
   nitidez a cualquier zoom. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});

  var PILA = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

  var F_BANDA = '600 13px ' + PILA;
  var F_TITULO = '700 15px ' + PILA;
  var F_TIPO = '700 9.5px ' + PILA;
  var F_COLOQUIAL = '400 14px ' + PILA;
  var F_FORMAL = 'italic 400 12.5px ' + PILA;
  var F_BOTON = '600 12.5px ' + PILA;
  var F_CHIP = '600 12px ' + PILA;
  var F_TRADICION = '500 11px ' + PILA;
  var F_NOTA = 'italic 400 11.5px ' + PILA;
  var F_CONTEO = '700 10.5px ' + PILA;

  var ANCHO_TARJETA = 344;
  var ANCHO_PREGUNTA = 326;
  var ANCHO_BASE_MIN = 176;
  var ANCHO_BASE_MAX = 320;
  var ANCHO_TERMINAL_MIN = 208;

  var PAD_X = 14;
  var PAD_INF = 14;
  var ALTO_BANDA = 32;
  var ALTO_BANDA_EJE = 28;
  var ALTO_TIPO = 18;
  var LH_TITULO = 20;
  var LH_COLOQUIAL = 19;
  var LH_FORMAL = 17;
  var LH_NOTA = 16;
  var ALTO_BOTON = 32;
  var GAP_BOTON = 8;
  var ALTO_CHIP_RESPUESTA = 26;
  var ALTO_CHIP_TRADICION = 22;
  var GAP_CHIP = 6;

  var GAP_X = 52;
  var SEP_RANGO = 96;

  var lienzoMedida = document.createElement('canvas');
  var ctxMedida = lienzoMedida.getContext('2d');
  var cacheAncho = new Map();

  function medir(texto, fuente) {
    var clave = fuente + '::' + texto;
    var guardado = cacheAncho.get(clave);
    if (guardado !== undefined) return guardado;
    ctxMedida.font = fuente;
    var ancho = ctxMedida.measureText(texto).width;
    if (cacheAncho.size < 20000) cacheAncho.set(clave, ancho);
    return ancho;
  }

  function envolver(texto, fuente, anchoMax, maxLineas) {
    if (!texto) return [];
    var palabras = String(texto).split(/\s+/).filter(Boolean);
    var lineas = [];
    var actual = '';
    for (var i = 0; i < palabras.length; i++) {
      var candidata = actual ? actual + ' ' + palabras[i] : palabras[i];
      if (actual && medir(candidata, fuente) > anchoMax) {
        lineas.push(actual);
        actual = palabras[i];
        if (maxLineas && lineas.length === maxLineas) { actual = ''; break; }
      } else {
        actual = candidata;
      }
    }
    if (actual) lineas.push(actual);
    if (maxLineas && lineas.length >= maxLineas) {
      var recortado = lineas.length > maxLineas || actual === '';
      lineas = lineas.slice(0, maxLineas);
      if (recortado || i < palabras.length) {
        var ultima = lineas[lineas.length - 1];
        while (ultima && medir(ultima + '…', fuente) > anchoMax) {
          ultima = ultima.replace(/\s*\S$/, '');
        }
        lineas[lineas.length - 1] = (ultima || '').replace(/[\s,;.]+$/, '') + '…';
      }
    }
    return lineas;
  }

  function recortar(texto, fuente, anchoMax) {
    if (!texto) return '';
    if (medir(texto, fuente) <= anchoMax) return texto;
    var corte = texto;
    while (corte.length > 1 && medir(corte + '…', fuente) > anchoMax) {
      corte = corte.slice(0, -1);
    }
    return corte.replace(/\s+$/, '') + '…';
  }

  function limitar(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
  }

  function rotuloPostura(postura) {
    if (!postura) return '';
    if (postura.is_unnamed) {
      return (Arbol.I18n && Arbol.I18n.dato)
        ? Arbol.I18n.dato('unnamed', '(sin nombre)')
        : ((Arbol.I18n && Arbol.I18n.idioma === 'en') ? '(unnamed)' : '(sin nombre)');
    }
    return dato('p.' + postura.id + '.label', postura.label);
  }

  function anchoRotuloTipo(rotulo) {
    return medir(rotulo, F_TIPO) + rotulo.length;
  }

  /* Puntos dorados que caben en la banda de una tarjeta sin invadir la esquina
     de la papelera. Si la postura la sostienen más tradiciones que eso, el
     último hueco lo ocupa un «+N» para que ninguna quede en silencio. */
  var MAX_MARCAS_TRADICION = 4;

  function marcasTradicion(cuantas) {
    if (cuantas <= MAX_MARCAS_TRADICION) return { puntos: cuantas, resto: 0 };
    var puntos = MAX_MARCAS_TRADICION - 1;
    return { puntos: puntos, resto: cuantas - puntos };
  }

  /* «↓ 12»: nodos que cuelgan de este. Va pegado al margen derecho de la fila
     del título, así que su ancho se descuenta del sitio que le queda al texto. */
  function textoConteo(nodo, contexto) {
    var mapa = contexto && contexto.descendientes;
    if (!mapa || !mapa.get) return '';
    var cuantos = mapa.get(nodo.id);
    return cuantos ? '↓ ' + cuantos : '';
  }

  function anchoConteo(conteo) {
    return conteo ? Math.ceil(medir(conteo, F_CONTEO)) + 10 : 0;
  }

  function reservaDerecha(cuantasTradiciones, conteo) {
    var marcas = marcasTradicion(cuantasTradiciones);
    return 30 + marcas.puntos * 9 + (marcas.resto ? 22 : 0) + anchoConteo(conteo);
  }

  function empaquetar(elementos, anchoDisponible, gap) {
    var filas = [];
    var fila = [];
    var x = 0;
    elementos.forEach(function (elemento) {
      if (fila.length && x + elemento.ancho > anchoDisponible) {
        filas.push(fila);
        fila = [];
        x = 0;
      }
      elemento.x = x;
      fila.push(elemento);
      x += elemento.ancho + gap;
    });
    if (fila.length) filas.push(fila);
    return filas;
  }

  /* Peso de una respuesta: los nodos que se abren si se elige. */
  function pesoRespuesta(preguntaId, clave, contexto) {
    var pesos = contexto && contexto.pesosRespuesta;
    if (!pesos) return 0;
    return pesos[preguntaId + ':' + clave] || 0;
  }

  function partesBotones(pregunta, anchoInterno, y, partes, contexto) {
    var botones = (pregunta.answers || []).map(function (respuestaPosible) {
      var texto = dato('q.' + pregunta.id + '.' + respuestaPosible.key + '.label',
        respuestaPosible.label);
      var glosa = respuestaPosible.gloss
        ? dato('q.' + pregunta.id + '.' + respuestaPosible.key + '.gloss', respuestaPosible.gloss)
        : null;
      var peso = pesoRespuesta(pregunta.id, respuestaPosible.key, contexto);
      var conteo = peso ? '↓ ' + peso : '';
      var reserva = anchoConteo(conteo);
      return {
        ancho: Math.max(58, medir(texto, F_BOTON) + 26) + reserva,
        anchoConteo: reserva,
        clave: respuestaPosible.key,
        texto: texto,
        glosa: glosa,
        peso: peso,
        conteo: conteo
      };
    });
    /* La rama más poblada se distingue con un tono apenas distinto, y solo si
       gana de veras: si todas pesan igual no hay nada que señalar. */
    var mayor = botones.reduce(function (tope, boton) {
      return Math.max(tope, boton.peso);
    }, 0);
    var cuantosEmpatan = botones.filter(function (boton) {
      return boton.peso === mayor;
    }).length;
    if (mayor > 0 && cuantosEmpatan === 1 && botones.length > 1) {
      botones.forEach(function (boton) { boton.densa = boton.peso === mayor; });
    }
    var filas = empaquetar(botones, anchoInterno, GAP_BOTON);
    var altoBotones = filas.length * ALTO_BOTON + Math.max(0, filas.length - 1) * GAP_BOTON;
    // El sello entra en la firma del nodo: sin él, una edición local que solo
    // cambie el peso de una rama dejaría los botones sin repintar.
    partes.push({
      k: 'botones', y: y, alto: altoBotones, filas: filas,
      sello: botones.map(function (boton) {
        return boton.clave + boton.peso + (boton.densa ? '!' : '');
      }).join('/')
    });
    return y + altoBotones;
  }

  function tUI(clave, respaldo) {
    return (Arbol.I18n && Arbol.I18n.t) ? Arbol.I18n.t(clave) : respaldo;
  }

  function dato(clave, original) {
    return (Arbol.I18n && Arbol.I18n.dato) ? Arbol.I18n.dato(clave, original) : original;
  }

  function textosPregunta(pregunta) {
    return {
      formal: dato('q.' + pregunta.id + '.formal', pregunta.formal_text),
      coloquial: pregunta.colloquial_hint
        ? dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint)
        : ''
    };
  }

  function partesPreguntaDestacada(pregunta, anchoInterno, y, partes) {
    var textos = textosPregunta(pregunta);
    if (textos.coloquial) {
      var lineasCol = envolver(textos.coloquial, F_COLOQUIAL, anchoInterno, 3);
      partes.push({ k: 'coloquial', y: y, lineas: lineasCol, lh: LH_COLOQUIAL });
      y += lineasCol.length * LH_COLOQUIAL + 5;
    }
    var lineasF = envolver(textos.formal, F_FORMAL, anchoInterno, 7);
    partes.push({ k: 'formal', y: y, lineas: lineasF, lh: LH_FORMAL });
    return y + lineasF.length * LH_FORMAL;
  }

  function parteExpandir(nodo, contexto, anchoInterno, y, partes) {
    if (!nodo.salidas || !nodo.salidas.length) return y;
    var expandido = !!(contexto.expandidos && contexto.expandidos.has(nodo.id));
    var texto = expandido ? tUI('ocultarRamas', '▾ Ocultar ramas')
      : tUI('mostrarRamas', '▸ Mostrar ramas');
    partes.push({
      k: 'expandir', y: y, alto: ALTO_BOTON,
      texto: texto, expandido: expandido, nodoId: nodo.id,
      ancho: Math.min(anchoInterno, Math.max(148, medir(texto, F_BOTON) + 28))
    });
    return y + ALTO_BOTON;
  }

  function componerCuerpoPregunta(pregunta, respuesta, anchoInterno, y, partes, contexto, nodo) {
    var exploracion = contexto && contexto.divulgacion === 'exploracion';
    if (exploracion) {
      y = partesPreguntaDestacada(pregunta, anchoInterno, y, partes);
      y += 10;
      return parteExpandir(nodo, contexto, anchoInterno, y, partes);
    }

    var enRecorrido = !contexto || !contexto.caminoUsuario
      || contexto.divulgacion === 'completo'
      || contexto.caminoUsuario.has(nodo.id);
    if (contexto && contexto.divulgacion === 'cuestionario' && !enRecorrido) {
      var textosFuera = textosPregunta(pregunta);
      var textoFuera = textosFuera.coloquial || textosFuera.formal;
      var lineasFuera = envolver(textoFuera,
        textosFuera.coloquial ? F_COLOQUIAL : F_FORMAL, anchoInterno, 4);
      partes.push({
        k: textosFuera.coloquial ? 'coloquial' : 'formal',
        y: y, lineas: lineasFuera,
        lh: textosFuera.coloquial ? LH_COLOQUIAL : LH_FORMAL
      });
      return y + lineasFuera.length * (textosFuera.coloquial ? LH_COLOQUIAL : LH_FORMAL);
    }

    if (contexto && contexto.divulgacion === 'completo') {
      y = partesPreguntaDestacada(pregunta, anchoInterno, y, partes);
      return y;
    }

    if (respuesta == null) {
      y = partesPreguntaDestacada(pregunta, anchoInterno, y, partes);
      y += 12;
      return partesBotones(pregunta, anchoInterno, y, partes, contexto);
    }

    var textosCortos = textosPregunta(pregunta);
    var usaColoquial = !!textosCortos.coloquial;
    var fuenteCorta = usaColoquial ? F_COLOQUIAL : F_FORMAL;
    var alturaCorta = usaColoquial ? LH_COLOQUIAL : LH_FORMAL;
    var lineasCortas = envolver(
      usaColoquial ? textosCortos.coloquial : textosCortos.formal,
      fuenteCorta, anchoInterno, usaColoquial ? 3 : 2
    );
    partes.push({
      k: usaColoquial ? 'coloquial' : 'formal',
      y: y, lineas: lineasCortas, lh: alturaCorta
    });
    y += lineasCortas.length * alturaCorta + 10;
    return partesBotones(pregunta, anchoInterno, y, partes, contexto);
  }

  function componerChipsTradiciones(postura, anchoInterno) {
    return (postura.traditions || []).map(function (tradicion) {
      var texto = recortar(tradicion.name, F_TRADICION, anchoInterno - 18);
      return {
        ancho: medir(texto, F_TRADICION) + 18,
        texto: texto,
        nombre: tradicion.name,
        tentativa: tradicion.is_tentative
      };
    });
  }

  function componer(nodo, respuesta, contexto, anclado) {
    var partes = [];
    var datos = contexto.datos;
    var y = 0;
    var ancho;
    var anchoInterno;
    var sangria = anclado ? 26 : 0;
    var exploracion = contexto && contexto.divulgacion === 'exploracion';

    var conteo = textoConteo(nodo, contexto);

    if (nodo.tipo === 'tarjeta' && nodo.pregunta) {
      ancho = ANCHO_TARJETA;
      anchoInterno = ancho - PAD_X * 2;
      var tradicionesTarjeta = (nodo.postura && nodo.postura.traditions) || [];
      var rotuloTarjeta = nodo.postura && nodo.postura.is_root
        ? tUI('origen', 'ORIGEN') : tUI('postura', 'POSTURA');
      var saltoTarjeta = anchoRotuloTipo(rotuloTarjeta) + 10;
      partes.push({
        k: 'banda', y: 0, alto: ALTO_BANDA,
        texto: recortar(rotuloPostura(nodo.postura), F_BANDA,
          anchoInterno - sangria - saltoTarjeta
          - reservaDerecha(tradicionesTarjeta.length, conteo)),
        rotulo: rotuloTarjeta,
        desplazamiento: saltoTarjeta,
        sangria: sangria,
        sinNombre: !!(nodo.postura && nodo.postura.is_unnamed),
        tradiciones: tradicionesTarjeta,
        conteo: conteo
      });
      y = ALTO_BANDA + 12;
      y = componerCuerpoPregunta(nodo.pregunta, respuesta, anchoInterno, y, partes, contexto, nodo);
      y += PAD_INF;

    } else if (nodo.tipo === 'pregunta') {
      ancho = ANCHO_PREGUNTA;
      anchoInterno = ancho - PAD_X * 2;
      var origenes = (nodo.pregunta.origin_posture_ids || []).map(function (pid) {
        return rotuloPostura(datos.postures[pid]);
      });
      var rotuloEje = nodo.pregunta.is_convergence
        ? tUI('convergencia', 'CONVERGENCIA') : tUI('eje', 'EJE');
      var saltoEje = anchoRotuloTipo(rotuloEje) + 10;
      partes.push({
        k: 'banda', y: 0, alto: ALTO_BANDA_EJE,
        texto: recortar(origenes.join('  &  '), F_BANDA,
          anchoInterno - sangria - saltoEje - reservaDerecha(0, conteo)),
        rotulo: rotuloEje,
        desplazamiento: saltoEje,
        sangria: sangria,
        convergencia: !!nodo.pregunta.is_convergence,
        sinNombre: false,
        tradiciones: [],
        conteo: conteo
      });
      y = ALTO_BANDA_EJE + 12;
      y = componerCuerpoPregunta(nodo.pregunta, respuesta, anchoInterno, y, partes, contexto, nodo);
      y += PAD_INF;

    } else {
      var etiqueta = rotuloPostura(nodo.postura);
      var chips = [];
      var esBase = nodo.tipo === 'postura';
      var maximo = esBase ? ANCHO_BASE_MAX : ANCHO_TARJETA;
      var minimo = esBase ? ANCHO_BASE_MIN : ANCHO_TERMINAL_MIN;
      var anchoDeseado = medir(etiqueta, F_TITULO) + PAD_X * 2;
      if (!esBase && nodo.postura && (nodo.postura.traditions || []).length) {
        anchoDeseado = Math.max(anchoDeseado, 268);
      }
      var rotuloBase = esBase
        ? tUI('posturaVarios', 'POSTURA · VARIOS EJES') : tUI('postura', 'POSTURA');
      // El conteo comparte fila con el rótulo del tipo: la caja ha de dar para
      // los dos y para la esquina de la papelera.
      if (conteo) {
        anchoDeseado = Math.max(anchoDeseado, sangria + medir(rotuloBase, F_TIPO)
          + reservaDerecha(0, conteo) + PAD_X * 2);
      }
      ancho = limitar(Math.ceil(anchoDeseado), minimo, maximo);
      anchoInterno = ancho - PAD_X * 2;
      y = 12;
      partes.push({
        k: 'tipo', y: y, sangria: sangria, texto: rotuloBase, conteo: conteo
      });
      y += ALTO_TIPO;
      var lineasTitulo = envolver(etiqueta, F_TITULO, anchoInterno, 4);
      partes.push({
        k: 'titulo', y: y, lineas: lineasTitulo, lh: LH_TITULO,
        sinNombre: !!(nodo.postura && nodo.postura.is_unnamed)
      });
      y += lineasTitulo.length * LH_TITULO;
      chips = componerChipsTradiciones(nodo.postura || {}, anchoInterno);
      if (chips.length) {
        y += 9;
        var filasChips = empaquetar(chips, anchoInterno, GAP_CHIP);
        var altoChips = filasChips.length * ALTO_CHIP_TRADICION
          + (filasChips.length - 1) * GAP_CHIP;
        partes.push({ k: 'chips', y: y, alto: altoChips, filas: filasChips });
        y += altoChips;
      }
      var notas = (nodo.postura && nodo.postura.notes) || [];
      if (notas.length) {
        y += 7;
        var lineasNota = envolver(notas.join(' · '), F_NOTA, anchoInterno, 3);
        partes.push({ k: 'nota', y: y, lineas: lineasNota, lh: LH_NOTA });
        y += lineasNota.length * LH_NOTA;
      }
      if (exploracion && nodo.salidas && nodo.salidas.length) {
        y += 10;
        y = parteExpandir(nodo, contexto, anchoInterno, y, partes);
      }
      y += PAD_INF;
    }

    return { ancho: ancho, alto: Math.round(y), partes: partes, padX: PAD_X };
  }

  var cacheComposicion = new Map();

  function componerConCache(nodo, respuesta, contexto) {
    var anclado = !!(contexto.fijados
      && Object.prototype.hasOwnProperty.call(contexto.fijados, nodo.id));
    var expandido = !!(contexto.expandidos && contexto.expandidos.has(nodo.id));
    var clave = nodo.id + '|' + (respuesta == null ? '' : respuesta)
      + (anclado ? '|a' : '') + '|' + (contexto.divulgacion || '')
      + (expandido ? '|e' : '')
      + '|' + ((nodo.postura && nodo.postura.label) || '')
      + (contexto.caminoUsuario && contexto.caminoUsuario.has(nodo.id) ? '|c' : '')
      + '|' + textoConteo(nodo, contexto)
      + '|' + ((Arbol.I18n && Arbol.I18n.idioma) || 'es');
    var guardado = cacheComposicion.get(clave);
    if (guardado) return guardado;
    var compuesto = componer(nodo, respuesta, contexto, anclado);
    cacheComposicion.set(clave, compuesto);
    return compuesto;
  }

  function limpiarCache() {
    cacheComposicion.clear();
    cacheAncho.clear();
  }

  function regresionIsotonica(deseados) {
    var valores = [];
    var pesos = [];
    var conteos = [];
    for (var i = 0; i < deseados.length; i++) {
      var valor = deseados[i];
      var peso = 1;
      var conteo = 1;
      while (valores.length && valores[valores.length - 1] > valor) {
        var v = valores.pop();
        var p = pesos.pop();
        var c = conteos.pop();
        valor = (valor * peso + v * p) / (peso + p);
        peso += p;
        conteo += c;
      }
      valores.push(valor);
      pesos.push(peso);
      conteos.push(conteo);
    }
    var salida = [];
    for (i = 0; i < valores.length; i++) {
      for (var j = 0; j < conteos[i]; j++) salida.push(valores[i]);
    }
    return salida;
  }

  function colocarFila(fila, deseados, tamanos, posiciones) {
    var desplazamientos = [];
    var acumulado = 0;
    fila.forEach(function (id) {
      desplazamientos.push(acumulado);
      acumulado += tamanos.get(id).ancho + GAP_X;
    });
    var ajustados = deseados.map(function (valor, indice) {
      return valor - desplazamientos[indice];
    });
    var resueltos = regresionIsotonica(ajustados);
    fila.forEach(function (id, indice) {
      posiciones.get(id).x = resueltos[indice] + desplazamientos[indice];
    });
  }

  function ordenarFilasPorX(porRango, posiciones) {
    porRango.forEach(function (fila) {
      fila.sort(function (a, b) {
        return posiciones.get(a).x - posiciones.get(b).x;
      });
    });
  }

  /* Una posición fijada puede desplazar un subárbol sobre otra caja. Las
     iteraciones de barycentro no pueden corregir ese caso porque respetan el
     anclaje; despejamos cada nivel después de aplicarlos, moviendo solo las
     cajas no fijadas cuando sea posible. Varias pasadas cubren el empuje a
     la izquierda (nodo anclado a la derecha) y los anchos distintos. */
  function separarCajasPorNivel(porRango, tamanos, posiciones, fijados) {
    porRango.forEach(function (fila) {
      var guardia = 0;
      var estable = false;
      while (!estable && guardia++ < 24) {
        estable = true;
        var orden = fila.slice().sort(function (a, b) {
          return posiciones.get(a).x - posiciones.get(b).x;
        });
        for (var i = 1; i < orden.length; i++) {
          var anteriorId = orden[i - 1];
          var actualId = orden[i];
          var anterior = posiciones.get(anteriorId);
          var actual = posiciones.get(actualId);
          var minimo = anterior.x + tamanos.get(anteriorId).ancho + GAP_X;
          if (actual.x >= minimo) continue;

          var desplazamiento = minimo - actual.x;
          var actualFijado = Object.prototype.hasOwnProperty.call(fijados, actualId);
          var anteriorFijado = Object.prototype.hasOwnProperty.call(fijados, anteriorId);
          if (actualFijado && anteriorFijado) continue;
          if (actualFijado && !anteriorFijado) {
            anterior.x -= desplazamiento;
          } else {
            actual.x += desplazamiento;
          }
          estable = false;
        }
      }
    });
  }

  /* Los padres se centran sobre el span de sus hijos para que no queden
     apiñados arriba mientras abajo el abanico obliga a las flechas a cruzarse. */
  function alinearPadresAHijos(porRango, salidas, tamanos, posiciones, fijados) {
    for (var r = porRango.length - 2; r >= 0; r--) {
      var fila = porRango[r];
      var deseados = fila.map(function (id) {
        if (Object.prototype.hasOwnProperty.call(fijados, id)) {
          return posiciones.get(id).x;
        }
        var hijos = (salidas.get(id) || []).filter(function (h) {
          return posiciones.has(h);
        });
        if (!hijos.length) return posiciones.get(id).x;
        var minC = Infinity;
        var maxC = -Infinity;
        hijos.forEach(function (h) {
          var p = posiciones.get(h);
          minC = Math.min(minC, p.x);
          maxC = Math.max(maxC, p.x + tamanos.get(h).ancho);
        });
        return (minC + maxC) / 2 - tamanos.get(id).ancho / 2;
      });
      colocarFila(fila, deseados, tamanos, posiciones);
    }
  }

  function orientacion(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }

  function aristasSeCruzan(aristaA, aristaB, tamanos, posiciones) {
    if (aristaA.desde === aristaB.desde || aristaA.desde === aristaB.hasta
      || aristaA.hasta === aristaB.desde || aristaA.hasta === aristaB.hasta) return false;
    var desdeA = posiciones.get(aristaA.desde);
    var hastaA = posiciones.get(aristaA.hasta);
    var desdeB = posiciones.get(aristaB.desde);
    var hastaB = posiciones.get(aristaB.hasta);
    if (!desdeA || !hastaA || !desdeB || !hastaB) return false;
    var a = {
      x: desdeA.x + tamanos.get(aristaA.desde).ancho / 2,
      y: desdeA.y + tamanos.get(aristaA.desde).alto
    };
    var b = { x: hastaA.x + tamanos.get(aristaA.hasta).ancho / 2, y: hastaA.y };
    var c = {
      x: desdeB.x + tamanos.get(aristaB.desde).ancho / 2,
      y: desdeB.y + tamanos.get(aristaB.desde).alto
    };
    var d = { x: hastaB.x + tamanos.get(aristaB.hasta).ancho / 2, y: hastaB.y };
    return orientacion(a, b, c) * orientacion(a, b, d) < 0
      && orientacion(c, d, a) * orientacion(c, d, b) < 0;
  }

  function contarCruces(aristas, tamanos, posiciones) {
    var cruces = 0;
    for (var i = 0; i < aristas.length; i++) {
      for (var j = i + 1; j < aristas.length; j++) {
        if (aristasSeCruzan(aristas[i], aristas[j], tamanos, posiciones)) cruces++;
      }
    }
    return cruces;
  }

  function segmentosDe(salidas) {
    var segs = [];
    salidas.forEach(function (destinos, desde) {
      destinos.forEach(function (hasta) {
        segs.push({ desde: desde, hasta: hasta });
      });
    });
    return segs;
  }

  /* El barycentro da un buen orden inicial, pero puede dejar inversiones
     cuando hay aristas que saltan niveles o convergencias. Intercambiamos
     vecinos solo si el cambio reduce cruces globales y nunca movemos un nodo
     que el usuario haya fijado. El intercambio respeta anchos: un swap de
     x crudo entre cajas distintas reintroducía solapes. */
  function reducirCruces(segmentos, porRango, tamanos, posiciones, fijados) {
    var actual = contarCruces(segmentos, tamanos, posiciones);
    for (var pasada = 0; pasada < 12; pasada++) {
      var cambio = false;
      porRango.forEach(function (fila) {
        var orden = fila.slice().sort(function (a, b) {
          return posiciones.get(a).x - posiciones.get(b).x;
        });
        for (var i = 0; i < orden.length - 1; i++) {
          var izquierda = orden[i];
          var derecha = orden[i + 1];
          if (Object.prototype.hasOwnProperty.call(fijados, izquierda)
            || Object.prototype.hasOwnProperty.call(fijados, derecha)) continue;
          var posicionIzquierda = posiciones.get(izquierda);
          var posicionDerecha = posiciones.get(derecha);
          var xIzq = posicionIzquierda.x;
          var xDer = posicionDerecha.x;
          posicionDerecha.x = xIzq;
          posicionIzquierda.x = xIzq + tamanos.get(derecha).ancho + GAP_X;
          var nuevo = contarCruces(segmentos, tamanos, posiciones);
          if (nuevo < actual) {
            actual = nuevo;
            cambio = true;
            var tmp = orden[i];
            orden[i] = orden[i + 1];
            orden[i + 1] = tmp;
          } else {
            posicionIzquierda.x = xIzq;
            posicionDerecha.x = xDer;
          }
        }
        for (var k = 0; k < orden.length; k++) fila[k] = orden[k];
      });
      if (!cambio) break;
    }
    return actual;
  }

  function mediana(valores) {
    if (!valores.length) return null;
    var orden = valores.slice().sort(function (a, b) { return a - b; });
    var medio = Math.floor(orden.length / 2);
    if (orden.length % 2) return orden[medio];
    return (orden[medio - 1] + orden[medio]) / 2;
  }

  function calcular(grafo, visibles, aristasIds, tamanos, fijados) {
    var salidas = new Map();
    var entradas = new Map();
    visibles.forEach(function (id) { salidas.set(id, []); entradas.set(id, []); });

    aristasIds.forEach(function (aristaId) {
      var arista = grafo.aristas.get(aristaId);
      if (!arista || !salidas.has(arista.desde) || !entradas.has(arista.hasta)) return;
      salidas.get(arista.desde).push(arista.hasta);
      entradas.get(arista.hasta).push(arista.desde);
    });

    var pendientes = new Map();
    entradas.forEach(function (lista, id) { pendientes.set(id, lista.length); });
    var rango = new Map();
    var cola = [];
    grafo.raices.forEach(function (id) {
      if (visibles.has(id) && pendientes.get(id) === 0) cola.push(id);
    });
    visibles.forEach(function (id) {
      if (pendientes.get(id) === 0 && cola.indexOf(id) === -1) cola.push(id);
    });
    cola.forEach(function (id) { rango.set(id, 0); });

    var topologico = [];
    for (var i = 0; i < cola.length; i++) {
      var actual = cola[i];
      topologico.push(actual);
      salidas.get(actual).forEach(function (destino) {
        rango.set(destino, Math.max(rango.get(destino) || 0, rango.get(actual) + 1));
        pendientes.set(destino, pendientes.get(destino) - 1);
        if (pendientes.get(destino) === 0) cola.push(destino);
      });
    }
    visibles.forEach(function (id) {
      if (!rango.has(id)) { rango.set(id, 0); topologico.push(id); }
    });

    var ordenInicial = [];
    var vistos = new Set();
    function recorrer(id) {
      if (vistos.has(id)) return;
      vistos.add(id);
      ordenInicial.push(id);
      salidas.get(id).forEach(recorrer);
    }
    grafo.raices.forEach(function (id) { if (visibles.has(id)) recorrer(id); });
    topologico.forEach(recorrer);

    var maxRango = 0;
    rango.forEach(function (valor) { maxRango = Math.max(maxRango, valor); });
    var porRango = [];
    for (var r = 0; r <= maxRango; r++) porRango.push([]);
    ordenInicial.forEach(function (id) { porRango[rango.get(id)].push(id); });

    /* Aristas que saltan rangos se parten con nodos virtuales. Sin eso, la
       reducción de cruces no ve el tramo intermedio y dos flechas pueden
       cruzarse aunque ningún par de vecinos del mismo nivel esté invertido. */
    tamanos = new Map(tamanos);
    var dummies = [];
    aristasIds.forEach(function (aristaId) {
      var arista = grafo.aristas.get(aristaId);
      if (!arista || !rango.has(arista.desde) || !rango.has(arista.hasta)) return;
      var r0 = rango.get(arista.desde);
      var r1 = rango.get(arista.hasta);
      if (r1 <= r0 + 1) return;
      var origSal = salidas.get(arista.desde);
      var ix = origSal.indexOf(arista.hasta);
      if (ix !== -1) origSal.splice(ix, 1);
      var origEnt = entradas.get(arista.hasta);
      var iy = origEnt.indexOf(arista.desde);
      if (iy !== -1) origEnt.splice(iy, 1);
      var prev = arista.desde;
      for (var rd = r0 + 1; rd < r1; rd++) {
        var did = '__d:' + aristaId + ':' + rd;
        tamanos.set(did, { ancho: 16, alto: 0 });
        rango.set(did, rd);
        salidas.set(did, []);
        entradas.set(did, []);
        salidas.get(prev).push(did);
        entradas.get(did).push(prev);
        porRango[rd].push(did);
        dummies.push(did);
        prev = did;
      }
      salidas.get(prev).push(arista.hasta);
      entradas.get(arista.hasta).push(prev);
    });
    dummies.forEach(function (id) { topologico.push(id); });

    function indices(fila) {
      var mapa = new Map();
      fila.forEach(function (id, indice) { mapa.set(id, indice); });
      return mapa;
    }
    for (var paso = 0; paso < 32; paso++) {
      var haciaAbajo = paso % 2 === 0;
      for (var nivel = 1; nivel <= maxRango; nivel++) {
        var r2 = haciaAbajo ? nivel : maxRango - nivel;
        var vecinaFila = porRango[haciaAbajo ? r2 - 1 : r2 + 1];
        if (!vecinaFila || !vecinaFila.length) continue;
        var posicionVecina = indices(vecinaFila);
        var fila = porRango[r2];
        var claves = new Map();
        fila.forEach(function (id, indice) {
          var vecinos = (haciaAbajo ? entradas.get(id) : salidas.get(id))
            .map(function (v) { return posicionVecina.has(v) ? posicionVecina.get(v) : null; })
            .filter(function (v) { return v !== null; });
          var m = mediana(vecinos);
          claves.set(id, m === null ? indice : m);
        });
        fila.sort(function (a, b) {
          var diferencia = claves.get(a) - claves.get(b);
          return diferencia !== 0 ? diferencia : 0;
        });
      }
    }

    var posiciones = new Map();
    visibles.forEach(function (id) { posiciones.set(id, { x: 0, y: 0 }); });
    dummies.forEach(function (id) { posiciones.set(id, { x: 0, y: 0 }); });

    var alturaRango = porRango.map(function (fila) {
      return fila.reduce(function (maximo, id) {
        return Math.max(maximo, tamanos.get(id).alto);
      }, 0);
    });
    var acumuladoY = 0;
    var yPorRango = alturaRango.map(function (altura) {
      var valor = acumuladoY;
      acumuladoY += altura + SEP_RANGO;
      return valor;
    });
    visibles.forEach(function (id) { posiciones.get(id).y = yPorRango[rango.get(id)]; });
    dummies.forEach(function (id) { posiciones.get(id).y = yPorRango[rango.get(id)]; });

    porRango.forEach(function (fila) {
      var x = 0;
      fila.forEach(function (id) {
        posiciones.get(id).x = x;
        x += tamanos.get(id).ancho + GAP_X;
      });
    });

    for (paso = 0; paso < 12; paso++) {
      var abajo = paso % 2 === 0;
      for (var indiceRango = 0; indiceRango <= maxRango; indiceRango++) {
        var rangoActual = abajo ? indiceRango : maxRango - indiceRango;
        var filaActual = porRango[rangoActual];
        if (!filaActual.length) continue;
        var deseados = filaActual.map(function (id) {
          var vecinos = abajo ? entradas.get(id) : salidas.get(id);
          if (!vecinos.length) return posiciones.get(id).x;
          var suma = vecinos.reduce(function (total, vecino) {
            return total + posiciones.get(vecino).x + tamanos.get(vecino).ancho / 2;
          }, 0);
          return suma / vecinos.length - tamanos.get(id).ancho / 2;
        });
        colocarFila(filaActual, deseados, tamanos, posiciones);
      }
    }

    var segs = segmentosDe(salidas);
    reducirCruces(segs, porRango, tamanos, posiciones, fijados || {});
    ordenarFilasPorX(porRango, posiciones);
    separarCajasPorNivel(porRango, tamanos, posiciones, fijados || {});
    alinearPadresAHijos(porRango, salidas, tamanos, posiciones, fijados || {});
    for (var nivelHijo = 1; nivelHijo <= maxRango; nivelHijo++) {
      var filaHijos = porRango[nivelHijo];
      if (!filaHijos.length) continue;
      var deseadosHijos = filaHijos.map(function (id) {
        if (Object.prototype.hasOwnProperty.call(fijados || {}, id)) {
          return posiciones.get(id).x;
        }
        var vecinos = entradas.get(id);
        if (!vecinos.length) return posiciones.get(id).x;
        var suma = vecinos.reduce(function (total, vecino) {
          return total + posiciones.get(vecino).x + tamanos.get(vecino).ancho / 2;
        }, 0);
        return suma / vecinos.length - tamanos.get(id).ancho / 2;
      });
      colocarFila(filaHijos, deseadosHijos, tamanos, posiciones);
    }
    separarCajasPorNivel(porRango, tamanos, posiciones, fijados || {});
    reducirCruces(segs, porRango, tamanos, posiciones, fijados || {});
    /* La flecha se traza de nodo real a nodo real, no por los dummies.
       Hay que deshacer también esos cruces de segmento largo. */
    var segsReales = [];
    aristasIds.forEach(function (id) {
      var arista = grafo.aristas.get(id);
      if (arista && visibles.has(arista.desde) && visibles.has(arista.hasta)) {
        segsReales.push(arista);
      }
    });
    reducirCruces(segsReales, porRango, tamanos, posiciones, fijados || {});
    ordenarFilasPorX(porRango, posiciones);
    separarCajasPorNivel(porRango, tamanos, posiciones, fijados || {});

    var raizVisible = grafo.raices.filter(function (id) { return visibles.has(id); })[0];
    if (raizVisible) {
      var desplazamiento = posiciones.get(raizVisible).x + tamanos.get(raizVisible).ancho / 2;
      visibles.forEach(function (id) { posiciones.get(id).x -= desplazamiento; });
      dummies.forEach(function (id) { posiciones.get(id).x -= desplazamiento; });
    }

    var anclados = topologico.filter(function (id) { return fijados[id]; });
    anclados.forEach(function (id) {
      var actualPos = posiciones.get(id);
      if (!actualPos) return;
      var deltaX = fijados[id].x - actualPos.x;
      var deltaY = fijados[id].y - actualPos.y;
      var conjunto = new Set([id]);
      topologico.forEach(function (candidato) {
        if (conjunto.has(candidato)) return;
        var padres = entradas.get(candidato);
        if (!padres.length || fijados[candidato]) return;
        var todosDentro = padres.every(function (padre) { return conjunto.has(padre); });
        if (todosDentro) conjunto.add(candidato);
      });
      conjunto.forEach(function (miembro) {
        var punto = posiciones.get(miembro);
        punto.x += deltaX;
        punto.y += deltaY;
      });
    });

    reducirCruces(segs, porRango, tamanos, posiciones, fijados || {});
    reducirCruces(segsReales, porRango, tamanos, posiciones, fijados || {});
    ordenarFilasPorX(porRango, posiciones);
    separarCajasPorNivel(porRango, tamanos, posiciones, fijados || {});

    var disposicion = new Map();
    visibles.forEach(function (id) {
      var punto = posiciones.get(id);
      var tamano = tamanos.get(id);
      disposicion.set(id, {
        x: Math.round(punto.x),
        y: Math.round(punto.y),
        ancho: tamano.ancho,
        alto: tamano.alto,
        rango: rango.get(id)
      });
    });
    return disposicion;
  }

  Arbol.Layout = {
    PILA: PILA,
    fuentes: {
      banda: F_BANDA, titulo: F_TITULO, tipo: F_TIPO, formal: F_FORMAL,
      coloquial: F_COLOQUIAL, boton: F_BOTON, chip: F_CHIP,
      tradicion: F_TRADICION, nota: F_NOTA
    },
    alturas: {
      chipTradicion: ALTO_CHIP_TRADICION, chipRespuesta: ALTO_CHIP_RESPUESTA,
      boton: ALTO_BOTON, gapBoton: GAP_BOTON, gapChip: GAP_CHIP
    },
    medir: medir,
    envolver: envolver,
    recortar: recortar,
    marcasTradicion: marcasTradicion,
    rotuloPostura: rotuloPostura,
    componer: componerConCache,
    limpiarCache: limpiarCache,
    calcular: calcular
  };

})(window);

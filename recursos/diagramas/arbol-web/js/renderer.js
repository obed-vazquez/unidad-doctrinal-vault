/* Dibujo en SVG puro: nodos, aristas Bézier, cámara por matriz, minimapa,
   arrastre con fijación y tooltip enriquecido.
   No hay <foreignObject> ni capas HTML sobre el lienzo: todo el diagrama es
   vectorial, de modo que el zoom no pixela a ningún nivel. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var NS = 'http://www.w3.org/2000/svg';

  var ZOOM_MIN = 0.04;
  var ZOOM_MAX = 24;
  var DURACION = 300;
  var UMBRAL_ARRASTRE = 4;
  var UMBRAL_ARRASTRE_TACTIL = 12;

  function distanciaPuntos(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function crear(nombre, atributos, clase) {
    var elemento = document.createElementNS(NS, nombre);
    if (clase) elemento.setAttribute('class', clase);
    if (atributos) {
      Object.keys(atributos).forEach(function (nombreAtributo) {
        elemento.setAttribute(nombreAtributo, atributos[nombreAtributo]);
      });
    }
    return elemento;
  }

  function texto(contenido, x, y, clase) {
    var elemento = crear('text', { x: x, y: y }, clase);
    elemento.textContent = contenido;
    return elemento;
  }

  function ancestro(elemento, selector) {
    if (!elemento || !elemento.closest) return null;
    return elemento.closest(selector);
  }

  /* Con setPointerCapture el `click`/`dblclick` a veces apunta al SVG, no a
     la tarjeta. elementFromPoint recupera el nodo real bajo el cursor. */
  function elementoBajoPuntero(evento) {
    var bajo = null;
    if (typeof document.elementFromPoint === 'function') {
      bajo = document.elementFromPoint(evento.clientX, evento.clientY);
    }
    return bajo || evento.target;
  }

  function cajaSuperior(ancho, alto, radio) {
    return 'M 0 ' + radio
      + ' A ' + radio + ' ' + radio + ' 0 0 1 ' + radio + ' 0'
      + ' H ' + (ancho - radio)
      + ' A ' + radio + ' ' + radio + ' 0 0 1 ' + ancho + ' ' + radio
      + ' V ' + alto + ' H 0 Z';
  }

  function suavizar(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /* Punto medio de la caja en el lado pedido, más la normal que sale de él:
     las manijas de la curva de Bézier se tiran en esa dirección. */
  function puntoDeLado(punto, caja, lado) {
    if (lado === 'abajo') {
      return { x: punto.x + caja.ancho / 2, y: punto.y + caja.alto, nx: 0, ny: 1 };
    }
    if (lado === 'arriba') {
      return { x: punto.x + caja.ancho / 2, y: punto.y, nx: 0, ny: -1 };
    }
    if (lado === 'derecha') {
      return { x: punto.x + caja.ancho, y: punto.y + caja.alto / 2, nx: 1, ny: 0 };
    }
    return { x: punto.x, y: punto.y + caja.alto / 2, nx: -1, ny: 0 };
  }

  var Vista = {
    svg: null,
    mundo: null,
    capaAristas: null,
    capaNodos: null,
    patron: null,
    opciones: {},
    contexto: null,
    camara: { x: 0, y: 0, k: 1 },
    nodosDOM: new Map(),
    aristasDOM: new Map(),
    posiciones: new Map(),
    animacion: null,
    arrastre: null,
    panorama: null,
    punteros: null,
    pellizco: null,
    _clicDiferido: null,
    _ultimoNodoPuntero: null,
    _conteoClic: { id: null, veces: 0, marca: 0 },

    iniciar: function (opciones) {
      this.opciones = opciones || {};
      this.punteros = new Map();
      this.svg = document.getElementById('lienzo');
      this.mundo = document.getElementById('mundo');
      this.capaAristas = document.getElementById('capa-aristas');
      this.capaNodos = document.getElementById('capa-nodos');
      this.patron = document.getElementById('rejilla');
      this.tooltip = document.getElementById('tooltip');
      this.minimapaSVG = document.getElementById('minimapa-svg');
      this.minimapaNodos = document.getElementById('minimapa-nodos');
      this.minimapaVista = document.getElementById('minimapa-vista');
      this.minimapaEscala = document.getElementById('minimapa-escala');
      this.registrarEventos();
    },

    /* ------------------------------------------------------- coordenadas - */

    aMundo: function (clienteX, clienteY) {
      var caja = this.svg.getBoundingClientRect();
      return {
        x: (clienteX - caja.left - this.camara.x) / this.camara.k,
        y: (clienteY - caja.top - this.camara.y) / this.camara.k
      };
    },

    aplicarCamara: function () {
      var camara = this.camara;
      var matriz = 'translate(' + camara.x + ',' + camara.y + ') scale(' + camara.k + ')';
      this.mundo.setAttribute('transform', matriz);
      if (this.patron) this.patron.setAttribute('patternTransform', matriz);
      if (this.minimapaEscala) {
        this.minimapaEscala.textContent = Math.round(camara.k * 100) + ' %';
      }
      this.actualizarMinimapaVista();
      if (this.opciones.alCambiarCamara) this.opciones.alCambiarCamara(camara);
    },

    fijarCamara: function (camara) {
      this.camara = {
        x: camara.x,
        y: camara.y,
        k: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camara.k || 1))
      };
      this.aplicarCamara();
    },

    animarCamara: function (destino) {
      var self = this;
      var inicio = { x: this.camara.x, y: this.camara.y, k: this.camara.k };
      var t0 = null;
      function paso(marca) {
        if (t0 === null) t0 = marca;
        var avance = Math.min(1, (marca - t0) / DURACION);
        var e = suavizar(avance);
        self.camara = {
          x: inicio.x + (destino.x - inicio.x) * e,
          y: inicio.y + (destino.y - inicio.y) * e,
          k: inicio.k + (destino.k - inicio.k) * e
        };
        self.aplicarCamara();
        if (avance < 1) global.requestAnimationFrame(paso);
      }
      global.requestAnimationFrame(paso);
    },

    /* Márgenes del lienzo que tapizan barra, panel y minimapa. */
    margenesLienzo: function () {
      var rect = this.svg.getBoundingClientRect();
      var barra = document.getElementById('barra');
      var panel = document.getElementById('panel');
      var minimapa = document.getElementById('minimapa');
      var movil = rect.width <= 860;
      var margenArr = 92;
      var margenIzq = movil ? 12 : 40;
      var margenDer = movil ? 12 : 40;
      var margenAba = 16;
      if (barra) {
        margenArr = Math.max(24, barra.getBoundingClientRect().bottom - rect.top + 10);
      }
      var panelAbierto = panel && !panel.classList.contains('cerrado');
      if (movil && panelAbierto) {
        margenAba = Math.max(margenAba, rect.bottom - panel.getBoundingClientRect().top + 10);
      } else if (!movil) {
        margenDer = (this.opciones.margenDerecho && this.opciones.margenDerecho()) || 40;
        margenAba = 24;
        if (minimapa && minimapa.offsetParent) margenAba = 70;
      }
      return {
        margenArr: margenArr,
        margenIzq: margenIzq,
        margenDer: margenDer,
        margenAba: margenAba
      };
    },

    /* Encuadra un conjunto de nodos dejando sitio a la barra y al panel. */
    encuadrar: function (ids, animar) {
      var disposicion = this.contexto && this.contexto.disposicion;
      if (!disposicion) return;
      var lista = (ids && ids.length ? ids : Array.from(disposicion.keys()))
        .filter(function (id) { return disposicion.has(id); });
      if (!lista.length) return;

      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      lista.forEach(function (id) {
        var caja = disposicion.get(id);
        minX = Math.min(minX, caja.x);
        minY = Math.min(minY, caja.y);
        maxX = Math.max(maxX, caja.x + caja.ancho);
        maxY = Math.max(maxY, caja.y + caja.alto);
      });

      var rect = this.svg.getBoundingClientRect();
      var m = this.margenesLienzo();
      var disponibleX = Math.max(120, rect.width - m.margenIzq - m.margenDer);
      var disponibleY = Math.max(120, rect.height - m.margenArr - m.margenAba);
      var k = Math.min(disponibleX / (maxX - minX || 1), disponibleY / (maxY - minY || 1), 1.35);
      k = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, k));

      var destino = {
        k: k,
        x: m.margenIzq + (disponibleX - (maxX - minX) * k) / 2 - minX * k,
        y: m.margenArr + (disponibleY - (maxY - minY) * k) / 2 - minY * k
      };
      if (animar === false) this.fijarCamara(destino);
      else this.animarCamara(destino);
    },

    encuadrarNodoYDescendientes: function (nodoId) {
      var grafo = this.contexto.grafo;
      var visibles = this.contexto.visibles;
      var ids = [nodoId];
      var nodo = grafo.nodos.get(nodoId);
      if (nodo) {
        nodo.salidas.forEach(function (arista) {
          if (visibles.has(arista.hasta)) ids.push(arista.hasta);
        });
      }
      this.encuadrar(ids, true);
    },

    /* Deja el nodo centrado en la parte del lienzo que el panel no tapa,
       conservando el nivel de zoom actual. */
    centrarEnNodo: function (nodoId) {
      var caja = this.contexto.disposicion.get(nodoId);
      if (!caja) return;
      var rect = this.svg.getBoundingClientRect();
      var m = this.margenesLienzo();
      var k = this.camara.k;
      var ancho = rect.width - m.margenIzq - m.margenDer;
      var alto = rect.height - m.margenArr - m.margenAba;
      this.animarCamara({
        k: k,
        x: m.margenIzq + ancho / 2 - (caja.x + caja.ancho / 2) * k,
        y: m.margenArr + alto / 2 - (caja.y + caja.alto / 2) * k
      });
    },

    /* ------------------------------------------------------------ render - */

    render: function (contexto) {
      this.contexto = contexto;
      this.sincronizarNodos();
      this.animarPosiciones();
      this.dibujarMinimapa();
    },

    sincronizarNodos: function () {
      var self = this;
      var contexto = this.contexto;
      var vistos = new Set();

      contexto.visibles.forEach(function (id) {
        vistos.add(id);
        var nodo = contexto.grafo.nodos.get(id);
        if (!nodo) return;
        var respuesta = nodo.preguntaId ? contexto.respuestas[nodo.preguntaId] : undefined;
        var compuesto = Arbol.Layout.componer(nodo, respuesta == null ? null : respuesta, contexto);
        var grupo = self.nodosDOM.get(id);
        var esNuevo = !grupo;
        if (esNuevo) {
          grupo = crear('g', { 'data-id': id }, 'nodo');
          self.capaNodos.appendChild(grupo);
          self.nodosDOM.set(id, grupo);
        }
        grupo.classList.remove('saliendo');
        self.pintarNodo(grupo, nodo, compuesto, respuesta, esNuevo);
      });

      this.nodosDOM.forEach(function (grupo, id) {
        if (vistos.has(id)) return;
        if (self.reducirMovimiento()) {
          grupo.remove();
          self.nodosDOM.delete(id);
          self.posiciones.delete(id);
          return;
        }
        grupo.classList.add('saliendo');
        global.setTimeout(function () {
          if (self.contexto && self.contexto.visibles && self.contexto.visibles.has(id)) return;
          grupo.remove();
          self.nodosDOM.delete(id);
          self.posiciones.delete(id);
        }, 280);
      });
    },

    pintarNodo: function (grupo, nodo, compuesto, respuesta, esNuevo) {
      var contexto = this.contexto;
      var estado = contexto.estado;
      var camino = contexto.camino;
      var ancho = compuesto.ancho;
      var alto = compuesto.alto;
      var padX = compuesto.padX;

      var clases = ['nodo', 'tipo-' + nodo.tipo];
      if (nodo.postura && nodo.postura.is_root) clases.push('raiz');
      if (estado.seleccionado === nodo.id) clases.push('seleccionado');
      if (estado.resaltados.has(nodo.id)) clases.push('resaltado');
      if (Object.prototype.hasOwnProperty.call(estado.fijados, nodo.id)) clases.push('fijado');
      var resaltado = estado.resaltados.has(nodo.id);
      if (camino) {
        if (camino.nodos.has(nodo.id)) {
          clases.push('camino');
          if (camino.destinosTentativos && camino.destinosTentativos.has(nodo.id)) {
            clases.push('tentativa');
          }
        } else if (!resaltado) {
          clases.push('atenuado');
        }
      } else if (!resaltado && this.debeAtenuarRecorrido() && contexto.caminoUsuario
        && contexto.caminoUsuario.size > 1 && !contexto.caminoUsuario.has(nodo.id)) {
        clases.push('atenuado');
      }
      if (esNuevo) clases.push('entrando');
      if (nodo.postura && nodo.postura.is_local) clases.push('borrador');
      grupo.setAttribute('class', clases.join(' '));

      var firma = compuesto.ancho + 'x' + compuesto.alto + ':'
        + (respuesta == null ? '' : respuesta) + ':'
        + compuesto.partes.map(function (p) { return p.k + (p.expandido ? 'e' : ''); }).join(',')
        + ':' + ((nodo.postura && nodo.postura.label) || '')
        + (Object.prototype.hasOwnProperty.call(estado.fijados, nodo.id) ? ':f' : '');
      if (!esNuevo && grupo.getAttribute('data-firma') === firma) return;
      grupo.setAttribute('data-firma', firma);

      while (grupo.firstChild) grupo.removeChild(grupo.firstChild);

      grupo.appendChild(crear('rect', {
        x: -6, y: -6, width: ancho + 12, height: alto + 12, rx: 17
      }, 'nodo-brillo'));
      grupo.appendChild(crear('rect', {
        x: -3.5, y: -3.5, width: ancho + 7, height: alto + 7, rx: 15
      }, 'nodo-anillo'));
      grupo.appendChild(crear('rect', {
        x: 3, y: 5, width: ancho, height: alto, rx: 12
      }, 'nodo-sombra'));
      grupo.appendChild(crear('rect', {
        x: 0, y: 0, width: ancho, height: alto, rx: 12
      }, 'nodo-caja'));

      var self = this;
      compuesto.partes.forEach(function (parte) {
        self.pintarParte(grupo, parte, ancho, padX, nodo, respuesta);
      });

      if (nodo.preguntaId && respuesta != null) {
        grupo.appendChild(this.construirPapelera(ancho, nodo));
      }
      if (Object.prototype.hasOwnProperty.call(contexto.estado.fijados, nodo.id)) {
        grupo.appendChild(this.construirChincheta(nodo));
      }

      var entradasVisibles = nodo.entradas.filter(function (arista) {
        return contexto.aristasIds.has(arista.id);
      });
      if (entradasVisibles.length > 1) {
        grupo.appendChild(crear('path', {
          d: 'M ' + (ancho / 2 - 16) + ' -9 Q ' + (ancho / 2) + ' -20 '
            + (ancho / 2 + 16) + ' -9'
        }, 'convergencia-puerto'));
        grupo.appendChild(texto('&', ancho / 2, -22, 'convergencia-glifo'));
      }
    },

    pintarParte: function (grupo, parte, ancho, padX, nodo, respuesta) {
      var i;

      if (parte.k === 'banda') {
        grupo.appendChild(crear('path', { d: cajaSuperior(ancho, parte.alto, 12) },
          'nodo-encabezado-fondo'));
        grupo.appendChild(crear('line', {
          x1: 0, y1: parte.alto, x2: ancho, y2: parte.alto
        }, 'nodo-separador'));
        var base = padX + (parte.sangria || 0);
        grupo.appendChild(texto(parte.rotulo, base, parte.alto / 2, 'nodo-etiqueta-tipo'));
        grupo.appendChild(texto(parte.texto, base + parte.desplazamiento, parte.alto / 2,
          'nodo-encabezado-texto' + (parte.sinNombre ? ' sin-nombre' : '')));
        // Puntos dorados de tradición; dejan libre la esquina de la papelera.
        (parte.tradiciones || []).slice(0, 4).forEach(function (tradicion, indice) {
          grupo.appendChild(crear('circle', {
            cx: ancho - padX - 24 - indice * 9, cy: parte.alto / 2, r: 3
          }, 'marca-tradicion' + (tradicion.is_tentative ? ' tentativa' : '')));
        });

      } else if (parte.k === 'tipo') {
        grupo.appendChild(texto(parte.texto, padX + (parte.sangria || 0), parte.y + 6,
          'nodo-etiqueta-tipo'));

      } else if (parte.k === 'titulo') {
        for (i = 0; i < parte.lineas.length; i++) {
          grupo.appendChild(texto(parte.lineas[i], padX,
            parte.y + parte.lh / 2 + i * parte.lh,
            'nodo-titulo' + (parte.sinNombre ? ' sin-nombre' : '')));
        }

      } else if (parte.k === 'formal' || parte.k === 'coloquial') {
        var clase = parte.k === 'formal' ? 'nodo-pregunta' : 'nodo-coloquial';
        for (i = 0; i < parte.lineas.length; i++) {
          grupo.appendChild(texto(parte.lineas[i], padX,
            parte.y + parte.lh / 2 + i * parte.lh, clase));
        }

      } else if (parte.k === 'nota') {
        for (i = 0; i < parte.lineas.length; i++) {
          grupo.appendChild(texto(parte.lineas[i], padX,
            parte.y + parte.lh / 2 + i * parte.lh, 'nodo-nota'));
        }

      } else if (parte.k === 'botones') {
        var alturas = Arbol.Layout.alturas;
        parte.filas.forEach(function (fila, indiceFila) {
          var y = parte.y + indiceFila * (alturas.boton + alturas.gapBoton);
          fila.forEach(function (boton) {
            var g = crear('g', {
              'data-clave': boton.clave,
              'data-pregunta': nodo.preguntaId
            }, 'opcion' + (respuesta === boton.clave ? ' elegida'
              : (respuesta != null ? ' tenue' : '')));
            g.appendChild(crear('rect', {
              x: padX + boton.x, y: y, width: boton.ancho, height: alturas.boton, rx: 8
            }, 'opcion-caja'));
            var centro = padX + boton.x + (boton.glosa ? boton.ancho - 14 : boton.ancho) / 2;
            g.appendChild(texto(boton.texto, centro, y + alturas.boton / 2, 'opcion-texto'));
            if (boton.glosa) {
              var marca = texto('ⓘ', padX + boton.x + boton.ancho - 16,
                y + alturas.boton / 2, 'opcion-glosa');
              var tituloGlosa = crear('title');
              tituloGlosa.textContent = boton.glosa;
              marca.appendChild(tituloGlosa);
              g.appendChild(marca);
            }
            grupo.appendChild(g);
          });
        });

      } else if (parte.k === 'expandir') {
        var gExp = crear('g', { 'data-expandir': parte.nodoId },
          'opcion expandir' + (parte.expandido ? ' elegida' : ''));
        gExp.appendChild(crear('rect', {
          x: padX, y: parte.y, width: parte.ancho, height: parte.alto, rx: 8
        }, 'opcion-caja'));
        gExp.appendChild(texto(parte.texto, padX + parte.ancho / 2,
          parte.y + parte.alto / 2, 'opcion-texto'));
        grupo.appendChild(gExp);

      } else if (parte.k === 'chipRespuesta') {
        grupo.appendChild(crear('rect', {
          x: padX, y: parte.y, width: parte.ancho, height: parte.alto, rx: 8
        }, 'respuesta-chip-caja'));
        grupo.appendChild(texto(parte.texto, padX + 11, parte.y + parte.alto / 2,
          'respuesta-chip-texto'));

      } else if (parte.k === 'chips') {
        var alturaChip = Arbol.Layout.alturas.chipTradicion;
        var gapChip = Arbol.Layout.alturas.gapChip;
        var destacadas = this.contexto.tradicionesDestacadas || new Set();
        parte.filas.forEach(function (fila, indiceFila) {
          var y = parte.y + indiceFila * (alturaChip + gapChip);
          fila.forEach(function (chip) {
            var clases = 'tradicion-chip-caja'
              + (chip.tentativa ? ' tentativa' : '')
              + (destacadas.has(chip.nombre) ? ' destacada' : '');
            grupo.appendChild(crear('rect', {
              x: padX + chip.x, y: y, width: chip.ancho, height: alturaChip, rx: 11
            }, clases));
            grupo.appendChild(texto(chip.texto, padX + chip.x + 9, y + alturaChip / 2,
              'tradicion-chip-texto'));
          });
        });
      }
    },

    construirPapelera: function (ancho, nodo) {
      var g = crear('g', {
        transform: 'translate(' + (ancho - 30) + ',7)',
        'data-papelera': nodo.preguntaId
      }, 'papelera');
      g.appendChild(crear('rect', { x: 0, y: 0, width: 22, height: 20, rx: 6 }, 'papelera-caja'));
      g.appendChild(crear('path', {
        d: 'M 6 7 H 16 M 8 7 V 15 M 11 7 V 15 M 14 7 V 15 M 8.5 5 H 13.5'
      }, 'papelera-icono'));
      var titulo = crear('title');
      titulo.textContent = 'Deshacer esta respuesta y podar su rama';
      g.appendChild(titulo);
      return g;
    },

    /* Chincheta de tachuela, contrapuesta a la papelera. Al pulsarla el nodo
       suelta el anclaje y vuelve a su posición automática. */
    construirChincheta: function (nodo) {
      var g = crear('g', {
        transform: 'translate(8,7)',
        'data-desanclar': nodo.id
      }, 'chincheta');
      g.appendChild(crear('rect', { x: 0, y: 0, width: 22, height: 20, rx: 6 }, 'chincheta-caja'));
      g.appendChild(crear('path', {
        d: 'M 8 4 H 14 L 13 5 V 9 L 15.5 11.5 H 6.5 L 9 9 V 5 Z'
      }, 'chincheta-cabeza'));
      g.appendChild(crear('path', { d: 'M 11 11.5 V 16' }, 'chincheta-aguja'));
      var titulo = crear('title');
      titulo.textContent = 'Anclado a mano. Pulsa para soltarlo y devolverlo a su posición automática.';
      g.appendChild(titulo);
      return g;
    },

    /* ------------------------------------------------ animación y aristas */

    animarPosiciones: function () {
      var self = this;
      var disposicion = this.contexto.disposicion;
      var inicio = new Map();
      var hayMovimiento = false;

      disposicion.forEach(function (caja, id) {
        var actual = self.posiciones.get(id);
        if (!actual) {
          var origen = self.posicionDeEntrada(id, caja);
          self.posiciones.set(id, { x: origen.x, y: origen.y });
          inicio.set(id, { x: origen.x, y: origen.y });
          if (Math.abs(origen.x - caja.x) > 0.5 || Math.abs(origen.y - caja.y) > 0.5) {
            hayMovimiento = true;
          }
        } else {
          inicio.set(id, { x: actual.x, y: actual.y });
          if (Math.abs(actual.x - caja.x) > 0.5 || Math.abs(actual.y - caja.y) > 0.5) {
            hayMovimiento = true;
          }
        }
      });

      if (this.animacion) { global.cancelAnimationFrame(this.animacion); this.animacion = null; }

      if (!hayMovimiento || this.reducirMovimiento()) {
        disposicion.forEach(function (caja, id) { self.posiciones.set(id, { x: caja.x, y: caja.y }); });
        this.aplicarPosiciones();
        this.dibujarAristas();
        return;
      }

      var t0 = null;
      function paso(marca) {
        if (t0 === null) t0 = marca;
        var avance = Math.min(1, (marca - t0) / DURACION);
        var e = suavizar(avance);
        disposicion.forEach(function (caja, id) {
          var desde = inicio.get(id);
          self.posiciones.set(id, {
            x: desde.x + (caja.x - desde.x) * e,
            y: desde.y + (caja.y - desde.y) * e
          });
        });
        self.aplicarPosiciones();
        self.dibujarAristas();
        if (avance < 1) self.animacion = global.requestAnimationFrame(paso);
        else self.animacion = null;
      }
      this.animacion = global.requestAnimationFrame(paso);
    },

    reducirMovimiento: function () {
      return global.matchMedia
        && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    /* En cuestionario (y limpio, por si queda un gemelo visible) se atenúa
       lo que no está en el recorrido elegido. Exploración libre y árbol
       completo muestran todas las ramas a plena opacidad. */
    debeAtenuarRecorrido: function () {
      var modo = this.contexto && this.contexto.divulgacion;
      return modo === 'cuestionario' || modo === 'limpio';
    },

    /* Un nodo recién abierto nace junto a su padre visible y viaja a su sitio. */
    posicionDeEntrada: function (id, cajaDestino) {
      var contexto = this.contexto;
      var nodo = contexto.grafo.nodos.get(id);
      if (nodo) {
        var i;
        for (i = 0; i < nodo.entradas.length; i++) {
          var padreId = nodo.entradas[i].desde;
          var padre = this.posiciones.get(padreId);
          var cajaPadre = contexto.disposicion.get(padreId);
          if (padre) {
            return {
              x: padre.x + ((cajaPadre && cajaPadre.ancho || 0) - cajaDestino.ancho) / 2,
              y: padre.y + (cajaPadre && cajaPadre.alto || 0)
            };
          }
        }
      }
      var raiz = contexto.grafo.raices.filter(function (rid) {
        return contexto.visibles.has(rid);
      })[0];
      var posRaiz = raiz ? this.posiciones.get(raiz) : null;
      return posRaiz ? { x: posRaiz.x, y: posRaiz.y } : { x: cajaDestino.x, y: cajaDestino.y };
    },

    aplicarPosiciones: function () {
      var self = this;
      this.nodosDOM.forEach(function (grupo, id) {
        var punto = self.posiciones.get(id);
        if (!punto) return;
        grupo.setAttribute('transform', 'translate(' + punto.x + ',' + punto.y + ')');
      });
    },

    /* Elige por qué lado sale y entra cada arista según la posición relativa
       de las dos cajas. Con los puntos fijos abajo→arriba, arrastrar un nodo
       a un costado o por encima de su padre dejaba el trazo pasando por
       detrás de los recuadros. */
    anclas: function (desdeId, hastaId) {
      var puntoA = this.posiciones.get(desdeId);
      var cajaA = this.contexto.disposicion.get(desdeId);
      var puntoB = this.posiciones.get(hastaId);
      var cajaB = this.contexto.disposicion.get(hastaId);
      if (!puntoA || !cajaA || !puntoB || !cajaB) return null;

      var dx = (puntoB.x + cajaB.ancho / 2) - (puntoA.x + cajaA.ancho / 2);
      var dy = (puntoB.y + cajaB.alto / 2) - (puntoA.y + cajaA.alto / 2);
      var holguraX = (cajaA.ancho + cajaB.ancho) / 2;
      var holguraY = (cajaA.alto + cajaB.alto) / 2;

      var ladoA;
      var ladoB;
      if (Math.abs(dx) / holguraX > Math.abs(dy) / holguraY) {
        ladoA = dx > 0 ? 'derecha' : 'izquierda';
        ladoB = dx > 0 ? 'izquierda' : 'derecha';
      } else {
        ladoA = dy > 0 ? 'abajo' : 'arriba';
        ladoB = dy > 0 ? 'arriba' : 'abajo';
      }
      return {
        desde: puntoDeLado(puntoA, cajaA, ladoA),
        hasta: puntoDeLado(puntoB, cajaB, ladoB)
      };
    },

    dibujarAristas: function () {
      var self = this;
      var contexto = this.contexto;
      var vistas = new Set();

      contexto.aristasIds.forEach(function (aristaId) {
        var arista = contexto.grafo.aristas.get(aristaId);
        if (!arista) return;
        var extremos = self.anclas(arista.desde, arista.hasta);
        if (!extremos) return;
        var desde = extremos.desde;
        var hasta = extremos.hasta;
        vistas.add(aristaId);

        var grupo = self.aristasDOM.get(aristaId);
        if (!grupo) {
          grupo = crear('g', { 'data-id': aristaId }, 'arista-grupo');
          grupo.appendChild(crear('path', {}, 'arista'));
          if (arista.tipo === 'respuesta' && arista.etiqueta) {
            grupo.appendChild(crear('rect', {}, 'arista-etiqueta-caja'));
            grupo.appendChild(texto(arista.etiqueta, 0, 0, 'arista-etiqueta-texto'));
          }
          self.capaAristas.appendChild(grupo);
          self.aristasDOM.set(aristaId, grupo);
        }

        var distancia = Math.sqrt(Math.pow(hasta.x - desde.x, 2)
          + Math.pow(hasta.y - desde.y, 2));
        var tiron = Math.max(28, Math.min(150, distancia * 0.42));
        var c1x = desde.x + desde.nx * tiron;
        var c1y = desde.y + desde.ny * tiron;
        var c2x = hasta.x + hasta.nx * tiron;
        var c2y = hasta.y + hasta.ny * tiron;
        var d = 'M ' + desde.x + ' ' + desde.y
          + ' C ' + c1x + ' ' + c1y + ', ' + c2x + ' ' + c2y
          + ', ' + hasta.x + ' ' + hasta.y;
        var trazo = grupo.querySelector('.arista');
        trazo.setAttribute('d', d);

        var clases = ['arista-grupo'];
        var clasesTrazo = ['arista'];
        if (arista.tipo === 'eje') clasesTrazo.push('eje');
        var elegida = arista.tipo === 'respuesta'
          && contexto.respuestas[arista.preguntaId] === arista.clave;
        if (contexto.camino) {
          if (contexto.camino.aristas.has(aristaId)) {
            clases.push('camino');
            clasesTrazo.push('camino');
            if (contexto.camino.aristasTentativas.has(aristaId)) clasesTrazo.push('tentativa');
          } else {
            clases.push('atenuada');
            clasesTrazo.push('atenuada');
          }
        } else if (elegida) {
          clases.push('elegida');
          clasesTrazo.push('elegida');
        } else if (self.debeAtenuarRecorrido() && contexto.caminoUsuario
          && arista.tipo === 'respuesta'
          && contexto.respuestas[arista.preguntaId] != null
          && !contexto.caminoUsuario.has(arista.hasta)) {
          clases.push('atenuada');
          clasesTrazo.push('atenuada');
        }
        grupo.setAttribute('class', clases.join(' '));
        trazo.setAttribute('class', clasesTrazo.join(' '));

        var caja = grupo.querySelector('.arista-etiqueta-caja');
        if (caja) {
          var etiqueta = grupo.querySelector('.arista-etiqueta-texto');
          // Punto medio real de la cúbica: (P0 + 3·C1 + 3·C2 + P3) / 8.
          var mx = (desde.x + 3 * c1x + 3 * c2x + hasta.x) / 8;
          var my = (desde.y + 3 * c1y + 3 * c2y + hasta.y) / 8;
          var anchoTexto = Arbol.Layout.medir(arista.etiqueta, '600 11px ' + Arbol.Layout.PILA);
          caja.setAttribute('x', mx - anchoTexto / 2 - 8);
          caja.setAttribute('y', my - 10);
          caja.setAttribute('width', anchoTexto + 16);
          caja.setAttribute('height', 20);
          etiqueta.setAttribute('x', mx);
          etiqueta.setAttribute('y', my);
        }
      });

      this.aristasDOM.forEach(function (grupo, id) {
        if (vistas.has(id)) return;
        grupo.remove();
        self.aristasDOM.delete(id);
      });
    },

    /* --------------------------------------------------------- minimapa -- */

    limitesMundo: function () {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      var self = this;
      this.contexto.disposicion.forEach(function (caja, id) {
        var punto = self.posiciones.get(id) || caja;
        minX = Math.min(minX, punto.x);
        minY = Math.min(minY, punto.y);
        maxX = Math.max(maxX, punto.x + caja.ancho);
        maxY = Math.max(maxY, punto.y + caja.alto);
      });
      if (minX === Infinity) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
      return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
    },

    dibujarMinimapa: function () {
      var cajaMin = document.getElementById('minimapa');
      if (cajaMin && cajaMin.offsetParent === null) return;
      if (!this.minimapaNodos) return;
      var limites = this.limitesMundo();
      var ancho = limites.maxX - limites.minX || 1;
      var alto = limites.maxY - limites.minY || 1;
      var relleno = ancho * 0.06;
      this.minimapaCaja = {
        x: limites.minX - relleno,
        y: limites.minY - relleno,
        ancho: ancho + relleno * 2,
        alto: alto + relleno * 2
      };
      this.minimapaSVG.setAttribute('viewBox',
        this.minimapaCaja.x + ' ' + this.minimapaCaja.y + ' '
        + this.minimapaCaja.ancho + ' ' + this.minimapaCaja.alto);
      this.minimapaSVG.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      while (this.minimapaNodos.firstChild) {
        this.minimapaNodos.removeChild(this.minimapaNodos.firstChild);
      }
      var self = this;
      var contexto = this.contexto;
      contexto.disposicion.forEach(function (caja, id) {
        var punto = self.posiciones.get(id) || caja;
        var clase = '';
        var nodo = contexto.grafo.nodos.get(id);
        if (nodo && (nodo.tipo === 'pregunta' || nodo.tipo === 'postura')) clase = 'eje';
        if (contexto.camino && contexto.camino.nodos.has(id)) clase = 'camino';
        if (contexto.estado.seleccionado === id) clase = 'seleccionado';
        if (contexto.estado.resaltados.has(id)) clase = 'resaltado';
        self.minimapaNodos.appendChild(crear('rect', {
          x: punto.x, y: punto.y, width: caja.ancho, height: caja.alto, rx: 8
        }, clase));
      });
      this.actualizarMinimapaVista();
    },

    actualizarMinimapaVista: function () {
      if (!this.minimapaVista || !this.minimapaCaja) return;
      var rect = this.svg.getBoundingClientRect();
      var k = this.camara.k;
      this.minimapaVista.setAttribute('x', -this.camara.x / k);
      this.minimapaVista.setAttribute('y', -this.camara.y / k);
      this.minimapaVista.setAttribute('width', rect.width / k);
      this.minimapaVista.setAttribute('height', rect.height / k);
    },

    centrarDesdeMinimapa: function (evento) {
      if (!this.minimapaCaja) return;
      var caja = this.minimapaSVG.getBoundingClientRect();
      var escala = Math.min(caja.width / this.minimapaCaja.ancho,
        caja.height / this.minimapaCaja.alto);
      var offsetX = (caja.width - this.minimapaCaja.ancho * escala) / 2;
      var offsetY = (caja.height - this.minimapaCaja.alto * escala) / 2;
      var mundoX = (evento.clientX - caja.left - offsetX) / escala + this.minimapaCaja.x;
      var mundoY = (evento.clientY - caja.top - offsetY) / escala + this.minimapaCaja.y;
      var lienzo = this.svg.getBoundingClientRect();
      this.fijarCamara({
        k: this.camara.k,
        x: lienzo.width / 2 - mundoX * this.camara.k,
        y: lienzo.height / 2 - mundoY * this.camara.k
      });
    },

    /* --------------------------------------------------------- tooltip --- */

    mostrarTooltip: function (contenido, clienteX, clienteY) {
      if (!contenido) return;
      this.tooltip.innerHTML = contenido;
      this.tooltip.classList.add('visible');
      this.tooltip.setAttribute('aria-hidden', 'false');
      var caja = this.tooltip.getBoundingClientRect();
      var maxX = global.innerWidth - caja.width - 16;
      var maxY = global.innerHeight - caja.height - 16;
      this.tooltip.style.left = Math.max(12, Math.min(maxX, clienteX + 18)) + 'px';
      this.tooltip.style.top = Math.max(12, Math.min(maxY, clienteY + 18)) + 'px';
    },

    ocultarTooltip: function () {
      this.tooltip.classList.remove('visible');
      this.tooltip.setAttribute('aria-hidden', 'true');
    },

    iniciarPellizco: function () {
      if (!this.punteros || this.punteros.size < 2) return;
      var pts = Array.from(this.punteros.values());
      var caja = this.svg.getBoundingClientRect();
      this.pellizco = {
        dist: Math.max(1, distanciaPuntos(pts[0], pts[1])),
        camara: { x: this.camara.x, y: this.camara.y, k: this.camara.k },
        mid: {
          x: (pts[0].x + pts[1].x) / 2 - caja.left,
          y: (pts[0].y + pts[1].y) / 2 - caja.top
        }
      };
      this.arrastre = null;
      this.panorama = null;
      this._huboPellizco = true;
      this.svg.classList.remove('arrastrando', 'moviendo-nodo');
      this.cancelarResalteLargo();
    },

    actualizarPellizco: function () {
      if (!this.pellizco || this.punteros.size < 2) return;
      var pts = Array.from(this.punteros.values());
      var caja = this.svg.getBoundingClientRect();
      var mid = {
        x: (pts[0].x + pts[1].x) / 2 - caja.left,
        y: (pts[0].y + pts[1].y) / 2 - caja.top
      };
      var dist = Math.max(1, distanciaPuntos(pts[0], pts[1]));
      var k0 = this.pellizco.camara.k;
      var k = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, k0 * (dist / this.pellizco.dist)));
      var mundoX = (this.pellizco.mid.x - this.pellizco.camara.x) / k0;
      var mundoY = (this.pellizco.mid.y - this.pellizco.camara.y) / k0;
      this.fijarCamara({
        k: k,
        x: mid.x - mundoX * k,
        y: mid.y - mundoY * k
      });
    },

    cancelarResalteLargo: function () {
      if (this._resalteLargo) {
        global.clearTimeout(this._resalteLargo);
        this._resalteLargo = null;
      }
    },

    /* ---------------------------------------------------------- eventos -- */

    registrarEventos: function () {
      var self = this;

      this.svg.addEventListener('selectstart', function (evento) { evento.preventDefault(); });

      this.svg.addEventListener('wheel', function (evento) {
        evento.preventDefault();
        var caja = self.svg.getBoundingClientRect();
        var cx = evento.clientX - caja.left;
        var cy = evento.clientY - caja.top;
        var factor = Math.pow(1.0016, -evento.deltaY * (evento.deltaMode === 1 ? 16 : 1));
        var nuevo = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, self.camara.k * factor));
        var relacion = nuevo / self.camara.k;
        self.fijarCamara({
          k: nuevo,
          x: cx - (cx - self.camara.x) * relacion,
          y: cy - (cy - self.camara.y) * relacion
        });
      }, { passive: false });

      this.svg.addEventListener('pointerdown', function (evento) {
        if (evento.button != null && evento.button !== 0) return;
        evento.preventDefault();
        var tactil = evento.pointerType === 'touch';
        if (!self.punteros) self.punteros = new Map();
        self.punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
        if (self.punteros.size >= 2) {
          self.iniciarPellizco();
          return;
        }

        var bajo = elementoBajoPuntero(evento);
        var nodoDOM = ancestro(bajo, '.nodo');
        if (ancestro(bajo, '.opcion') || ancestro(bajo, '.papelera')
          || ancestro(bajo, '.chincheta')) return;
        if ((evento.ctrlKey || evento.metaKey) && nodoDOM) return;

        self._ultimoNodoPuntero = nodoDOM;
        if (nodoDOM) {
          var id = nodoDOM.getAttribute('data-id');
          var punto = self.posiciones.get(id);
          if (!punto) return;
          self.arrastre = {
            id: id,
            inicioCliente: { x: evento.clientX, y: evento.clientY },
            inicioNodo: { x: punto.x, y: punto.y },
            movido: false,
            ctrl: evento.ctrlKey || evento.metaKey
          };
          if (tactil) {
            self.cancelarResalteLargo();
            self._resalteLargo = global.setTimeout(function () {
              self._resalteLargo = null;
              if (!self.arrastre || self.arrastre.movido) return;
              if (self.opciones.alResaltar) self.opciones.alResaltar(self.arrastre.id);
              self.arrastre = null;
              self.ignorarSiguienteClic = true;
            }, 520);
          }
        } else {
          self.panorama = {
            inicioCliente: { x: evento.clientX, y: evento.clientY },
            inicioCamara: { x: self.camara.x, y: self.camara.y },
            movido: false
          };
          self.svg.classList.add('arrastrando');
        }
        if (!tactil) {
          try { self.svg.setPointerCapture(evento.pointerId); } catch (error) { /* nada */ }
        }
      });

      this.svg.addEventListener('pointermove', function (evento) {
        if (self.punteros && self.punteros.has(evento.pointerId)) {
          self.punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
        }
        if (self.pellizco) {
          self.actualizarPellizco();
          return;
        }
        var umbral = evento.pointerType === 'touch' ? UMBRAL_ARRASTRE_TACTIL : UMBRAL_ARRASTRE;
        if (self.panorama) {
          var dxLienzo = evento.clientX - self.panorama.inicioCliente.x;
          var dyLienzo = evento.clientY - self.panorama.inicioCliente.y;
          if (Math.abs(dxLienzo) + Math.abs(dyLienzo) >= umbral) {
            self.panorama.movido = true;
          }
          self.fijarCamara({
            k: self.camara.k,
            x: self.panorama.inicioCamara.x + dxLienzo,
            y: self.panorama.inicioCamara.y + dyLienzo
          });
          return;
        }
        if (!self.arrastre) return;
        var dx = evento.clientX - self.arrastre.inicioCliente.x;
        var dy = evento.clientY - self.arrastre.inicioCliente.y;
        if (!self.arrastre.movido
          && Math.abs(dx) + Math.abs(dy) < umbral) return;
        self.arrastre.movido = true;
        self.cancelarResalteLargo();
        self.svg.classList.add('moviendo-nodo');
        self.ocultarTooltip();
        self.posiciones.set(self.arrastre.id, {
          x: self.arrastre.inicioNodo.x + dx / self.camara.k,
          y: self.arrastre.inicioNodo.y + dy / self.camara.k
        });
        self.aplicarPosiciones();
        self.dibujarAristas();
      });

      this.svg.addEventListener('pointerup', function (evento) {
        if (self.svg.hasPointerCapture && self.svg.hasPointerCapture(evento.pointerId)) {
          self.svg.releasePointerCapture(evento.pointerId);
        }
        if (self.punteros) self.punteros.delete(evento.pointerId);
        self.cancelarResalteLargo();
        if (self.pellizco) {
          if (!self.punteros || self.punteros.size < 2) self.pellizco = null;
          self.ignorarSiguienteClic = true;
          self.svg.classList.remove('arrastrando', 'moviendo-nodo');
          return;
        }
        self.svg.classList.remove('arrastrando', 'moviendo-nodo');
        if (self.panorama) {
          self.ignorarSiguienteClic = self.panorama.movido || self._huboPellizco;
          self.panorama = null;
          self._huboPellizco = false;
          return;
        }
        if (!self.arrastre) {
          self._huboPellizco = false;
          return;
        }
        var arrastre = self.arrastre;
        self.arrastre = null;
        if (arrastre.movido) {
          self.ignorarSiguienteClic = true;
          var punto = self.posiciones.get(arrastre.id);
          if (self.opciones.alFijar) self.opciones.alFijar(arrastre.id, punto);
          self.dibujarMinimapa();
        }
        self._huboPellizco = false;
      });

      this.svg.addEventListener('pointercancel', function (evento) {
        if (self.punteros) self.punteros.delete(evento.pointerId);
        self.cancelarResalteLargo();
        self.arrastre = null;
        self.panorama = null;
        self.pellizco = null;
        self.svg.classList.remove('arrastrando', 'moviendo-nodo');
      });

      this.svg.addEventListener('click', function (evento) {
        if (self.ignorarSiguienteClic) { self.ignorarSiguienteClic = false; return; }
        var bajo = elementoBajoPuntero(evento);
        var nodoBajoCursor = ancestro(bajo, '.nodo') || self._ultimoNodoPuntero;

        if ((evento.ctrlKey || evento.metaKey) && nodoBajoCursor) {
          evento.preventDefault();
          evento.stopPropagation();
          if (self.opciones.alResaltar) {
            self.opciones.alResaltar(nodoBajoCursor.getAttribute('data-id'));
          }
          return;
        }

        var opcion = ancestro(bajo, '.opcion');
        if (opcion && opcion.getAttribute('data-expandir')) {
          evento.stopPropagation();
          if (self.opciones.alExpandir) {
            self.opciones.alExpandir(opcion.getAttribute('data-expandir'));
          }
          return;
        }
        if (opcion) {
          evento.stopPropagation();
          if (self.opciones.alResponder) {
            self.opciones.alResponder(opcion.getAttribute('data-pregunta'),
              opcion.getAttribute('data-clave'));
          }
          return;
        }
        var papelera = ancestro(bajo, '.papelera');
        if (papelera) {
          evento.stopPropagation();
          if (self.opciones.alBorrar) {
            self.opciones.alBorrar(papelera.getAttribute('data-papelera'));
          }
          return;
        }
        var chincheta = ancestro(bajo, '.chincheta');
        if (chincheta) {
          evento.stopPropagation();
          if (self.opciones.alDesanclar) {
            self.opciones.alDesanclar(chincheta.getAttribute('data-desanclar'));
          }
          return;
        }
        if (nodoBajoCursor) {
          var idCapturado = nodoBajoCursor.getAttribute('data-id');
          var ahora = Date.now();
          var conteo = self._conteoClic;
          if (conteo.id === idCapturado && ahora - conteo.marca < 420) {
            global.clearTimeout(self._clicDiferido);
            self._conteoClic = { id: null, veces: 0, marca: 0 };
            evento.preventDefault();
            self.ocultarTooltip();
            if (self.opciones.alDobleClic) self.opciones.alDobleClic(idCapturado);
            return;
          }
          self._conteoClic = { id: idCapturado, veces: 1, marca: ahora };
          global.clearTimeout(self._clicDiferido);
          self._clicDiferido = global.setTimeout(function () {
            if (self.opciones.alSeleccionar) self.opciones.alSeleccionar(idCapturado);
          }, 280);
          return;
        }
        global.clearTimeout(self._clicDiferido);
        if (self.opciones.alSeleccionar) self.opciones.alSeleccionar(null);
      });

      this.svg.addEventListener('dblclick', function (evento) {
        evento.preventDefault();
        evento.stopPropagation();
        if (global.getSelection) {
          var sel = global.getSelection();
          if (sel && sel.removeAllRanges) sel.removeAllRanges();
        }
        var bajo = elementoBajoPuntero(evento);
        var nodoDOM = ancestro(bajo, '.nodo') || self._ultimoNodoPuntero;
        global.clearTimeout(self._clicDiferido);
        self._conteoClic = { id: null, veces: 0, marca: 0 };
        if (!nodoDOM) return;
        self.ocultarTooltip();
        if (self.opciones.alDobleClic) {
          self.opciones.alDobleClic(nodoDOM.getAttribute('data-id'));
        }
      });

      this.svg.addEventListener('mousemove', function (evento) {
        if (evento.sourceCapabilities && evento.sourceCapabilities.firesTouchEvents) return;
        if (self.arrastre || self.panorama || self.pellizco) return;
        var nodoDOM = ancestro(elementoBajoPuntero(evento), '.nodo');
        if (!nodoDOM) { self.ocultarTooltip(); return; }
        var id = nodoDOM.getAttribute('data-id');
        var contenido = self.opciones.tooltipHTML
          ? self.opciones.tooltipHTML(self.contexto.grafo.nodos.get(id))
          : null;
        self.mostrarTooltip(contenido, evento.clientX, evento.clientY);
      });

      this.svg.addEventListener('mouseleave', function () { self.ocultarTooltip(); });

      if (this.minimapaSVG) {
        var arrastrandoMinimapa = false;
        this.minimapaSVG.addEventListener('pointerdown', function (evento) {
          arrastrandoMinimapa = true;
          this.setPointerCapture(evento.pointerId);
          self.centrarDesdeMinimapa(evento);
        });
        this.minimapaSVG.addEventListener('pointermove', function (evento) {
          if (arrastrandoMinimapa) self.centrarDesdeMinimapa(evento);
        });
        this.minimapaSVG.addEventListener('pointerup', function (evento) {
          arrastrandoMinimapa = false;
          if (this.hasPointerCapture(evento.pointerId)) this.releasePointerCapture(evento.pointerId);
        });
      }

      global.addEventListener('resize', function () { self.actualizarMinimapaVista(); });
    }
  };

  Arbol.Vista = Vista;

})(window);

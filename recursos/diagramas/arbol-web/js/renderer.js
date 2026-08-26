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
  var ENTRADA_ARISTA_MS = 480;
  var ENTRADA_NODO_MS = 620;
  var ENTRADA_NODO_ESPERA_MS = 200;
  var SALIDA_NODO_MS = 400;
  var SALIDA_ARISTA_MS = 360;
  var UMBRAL_ARRASTRE = 4;
  var UMBRAL_ARRASTRE_TACTIL = 12;
  var TIP_ESPERA = 500;
  var TIP_OCULTA = 1500;
  var TIP_MOVIMIENTO = 3;

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
      this.capaEtiquetas = document.getElementById('capa-etiquetas');
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
      if (Arbol.EditMode) Arbol.EditMode.aplicarLod(camara.k);
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

    /* Desplaza la cámara para mostrar esos nodos, sin tocar el zoom. */
    centrarEnIds: function (ids, animar) {
      var disposicion = this.contexto && this.contexto.disposicion;
      if (!disposicion) return;
      var lista = (ids && ids.length ? ids : [])
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
      var k = this.camara.k;
      var disponibleX = Math.max(120, rect.width - m.margenIzq - m.margenDer);
      var disponibleY = Math.max(120, rect.height - m.margenArr - m.margenAba);
      var destino = {
        k: k,
        x: m.margenIzq + disponibleX / 2 - ((minX + maxX) / 2) * k,
        y: m.margenArr + disponibleY / 2 - ((minY + maxY) / 2) * k
      };
      if (animar === false) this.fijarCamara(destino);
      else this.animarCamara(destino);
    },

    /* En móvil la rama recién abierta debe quedar a la vista; en escritorio
       solo movemos la cámara si algún nodo nuevo quedó fuera del área útil. */
    debeCentrarEnIds: function (ids) {
      var disposicion = this.contexto && this.contexto.disposicion;
      if (!disposicion) return false;
      var rect = this.svg.getBoundingClientRect();
      if (rect.width <= 860) return true;
      var m = this.margenesLienzo();
      var limiteIzq = m.margenIzq;
      var limiteDer = rect.width - m.margenDer;
      var limiteArr = m.margenArr;
      var limiteAba = rect.height - m.margenAba;
      var k = this.camara.k;
      return (ids || []).some(function (id) {
        var caja = disposicion.get(id);
        if (!caja) return false;
        var x = this.camara.x + caja.x * k;
        var y = this.camara.y + caja.y * k;
        var ancho = caja.ancho * k;
        var alto = caja.alto * k;
        return x < limiteIzq || x + ancho > limiteDer
          || y < limiteArr || y + alto > limiteAba;
      }, this);
    },

    encuadrarNodoYDescendientes: function (nodoId, soloSiHaceFalta) {
      var grafo = this.contexto.grafo;
      var visibles = this.contexto.visibles;
      var ids = [nodoId];
      var nodo = grafo.nodos.get(nodoId);
      if (nodo) {
        nodo.salidas.forEach(function (arista) {
          if (visibles.has(arista.hasta)) ids.push(arista.hasta);
        });
      }
      if (soloSiHaceFalta && !this.debeCentrarEnIds(ids)) return;
      this.centrarEnIds(ids, true);
    },

    /* Deja el nodo centrado en la parte del lienzo que el panel no tapa,
       conservando el nivel de zoom actual. */
    centrarEnNodo: function (nodoId) {
      this.centrarEnIds([nodoId], true);
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
      var idsNuevos = [];

      this.contexto.visibles.forEach(function (id) {
        vistos.add(id);
        var grupo = self.nodosDOM.get(id);
        if (!grupo) {
          idsNuevos.push(id);
          return;
        }
        var nodo = contexto.grafo.nodos.get(id);
        if (!nodo) return;
        var respuesta = nodo.preguntaId ? contexto.respuestas[nodo.preguntaId] : undefined;
        var compuesto = Arbol.Layout.componer(nodo, respuesta == null ? null : respuesta, contexto);
        grupo.classList.remove('saliendo');
        grupo.style.removeProperty('--retraso-salida');
        self.pintarNodo(grupo, nodo, compuesto, respuesta, false);
      });

      var salientes = [];
      this.nodosDOM.forEach(function (grupo, id) {
        if (vistos.has(id)) return;
        if (self.reducirMovimiento()) {
          grupo.remove();
          self.nodosDOM.delete(id);
          self.posiciones.delete(id);
          return;
        }
        if (grupo.classList.contains('saliendo')) return;
        var punto = self.posiciones.get(id);
        salientes.push({ id: id, grupo: grupo, y: punto ? punto.y : 0 });
      });
      salientes.sort(function (a, b) { return b.y - a.y; });
      var cascada = Math.min(280, Math.max(0, salientes.length - 1) * 45);
      salientes.forEach(function (item, indice) {
        var retraso = salientes.length < 2 ? 0
          : Math.round((indice / (salientes.length - 1)) * cascada);
        item.grupo.classList.add('saliendo');
        item.grupo.style.setProperty('--retraso-salida', retraso + 'ms');
        global.setTimeout(function () {
          if (self.contexto && self.contexto.visibles && self.contexto.visibles.has(item.id)) return;
          item.grupo.remove();
          self.nodosDOM.delete(item.id);
          self.posiciones.delete(item.id);
        }, retraso + SALIDA_NODO_MS + 40);
      });

      if (!idsNuevos.length) return;
      this.aparecerNodos(idsNuevos);
    },

    /* Crea el DOM, fija el retraso CSS y pinta. El nodo ya nace en su sitio. */
    aparecerNodos: function (ids) {
      var self = this;
      var contexto = this.contexto;
      ids.forEach(function (id) {
        if (self.nodosDOM.has(id)) return;
        var grupo = crear('g', { 'data-id': id }, 'nodo');
        self.capaNodos.appendChild(grupo);
        self.nodosDOM.set(id, grupo);
        var caja = contexto.disposicion.get(id);
        if (caja) self.posiciones.set(id, { x: caja.x, y: caja.y });
      });
      this.programarRetrasosEntrada(ids);
      ids.forEach(function (id) {
        var grupo = self.nodosDOM.get(id);
        var nodo = contexto.grafo.nodos.get(id);
        if (!grupo || !nodo) return;
        var respuesta = nodo.preguntaId ? contexto.respuestas[nodo.preguntaId] : undefined;
        var compuesto = Arbol.Layout.componer(nodo, respuesta == null ? null : respuesta, contexto);
        self.pintarNodo(grupo, nodo, compuesto, respuesta, true);
      });
    },

    /* Los nodos nuevos se pintan ya en su sitio; el retraso solo orquesta
       flecha → nodo, de arriba hacia abajo. */
    programarRetrasosEntrada: function (idsNuevos) {
      this._retrasoArista = new Map();
      if (!idsNuevos.length || this.reducirMovimiento()) return;
      var disposicion = this.contexto.disposicion;
      var yMin = Infinity;
      var yMax = -Infinity;
      var i;
      for (i = 0; i < idsNuevos.length; i++) {
        var caja = disposicion.get(idsNuevos[i]);
        if (!caja) continue;
        yMin = Math.min(yMin, caja.y);
        yMax = Math.max(yMax, caja.y);
      }
      var rango = Math.max(1, yMax - yMin);
      /* Una sola cascada continua según Y. En el árbol completo había pausas
         entre trozos; el tope sube con el recuento para no comprimir la ola. */
      var n = idsNuevos.length;
      var porNodo = n > 12 ? 12 : 48;
      var tope = n > 12 ? 820 : 420;
      var cascada = Math.min(tope, Math.max(0, n - 1) * porNodo);
      var nuevos = new Set(idsNuevos);
      var self = this;
      idsNuevos.forEach(function (id) {
        var cajaNodo = disposicion.get(id);
        var t = cajaNodo ? (cajaNodo.y - yMin) / rango : 0;
        var retrasoNodo = Math.round(ENTRADA_NODO_ESPERA_MS + t * cascada);
        var grupo = self.nodosDOM.get(id);
        if (grupo) {
          grupo.style.setProperty('--retraso-entrada', retrasoNodo + 'ms');
          global.setTimeout(function () {
            grupo.classList.remove('entrando');
          }, retrasoNodo + ENTRADA_NODO_MS + 40);
        }
      });
      this.contexto.aristasIds.forEach(function (aristaId) {
        if (self.aristasDOM.has(aristaId)) return;
        var arista = self.contexto.grafo.aristas.get(aristaId);
        if (!arista || !nuevos.has(arista.hasta)) return;
        var cajaHasta = disposicion.get(arista.hasta);
        var tArista = cajaHasta ? (cajaHasta.y - yMin) / rango : 0;
        self._retrasoArista.set(aristaId, Math.round(tArista * cascada));
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
      if (contexto.divulgacion === 'edicion') clases.push('modo-edicion');
      if (nodo.esControl) clases.push('control');
      if (nodo.postura && nodo.postura.is_root) clases.push('raiz');
      if (estado.seleccionado === nodo.id) clases.push('seleccionado');
      if (estado.resaltados.has(nodo.id)) clases.push('resaltado');
      if (Object.prototype.hasOwnProperty.call(estado.fijados, nodo.id)) clases.push('fijado');
      var resaltado = estado.resaltados.has(nodo.id);
      if (camino && !nodo.esControl) {
        if (camino.nodos.has(nodo.id)) {
          clases.push('camino');
          if (camino.destinosTentativos && camino.destinosTentativos.has(nodo.id)) {
            clases.push('tentativa');
          }
        } else if (!resaltado) {
          clases.push('atenuado');
        }
      } else if (!nodo.esControl && !resaltado && this.debeAtenuarRecorrido() && contexto.caminoUsuario
        && contexto.caminoUsuario.size > 1 && !contexto.caminoUsuario.has(nodo.id)
        && !(contexto.deshabilitados && contexto.deshabilitados.has(nodo.id))) {
        clases.push('atenuado');
      }
      if (esNuevo || grupo.classList.contains('entrando')) clases.push('entrando');
      if (nodo.postura && nodo.postura.is_local) clases.push('borrador');
      if (contexto.deshabilitados && contexto.deshabilitados.has(nodo.id)) {
        clases.push('deshabilitado');
      }
      grupo.setAttribute('class', clases.join(' '));

      var firma = compuesto.ancho + 'x' + compuesto.alto + ':'
        + (respuesta == null ? '' : respuesta) + ':'
        + compuesto.partes.map(function (p) {
          return p.k + (p.expandido ? 'e' : '') + (p.conteo || '') + (p.sello || '')
            + (p.valor ? p.valor : '');
        }).join(',')
        + ':' + ((nodo.postura && nodo.postura.label) || '')
        + (Object.prototype.hasOwnProperty.call(estado.fijados, nodo.id) ? ':f' : '')
        + ':' + ((Arbol.I18n && Arbol.I18n.idioma) || 'es')
        + (nodo.pregunta ? '|' + (nodo.pregunta.formal_text || '') + '|' + (nodo.pregunta.colloquial_hint || '') : '')
        + (nodo.postura ? '|' + ((nodo.postura.notes || []).join())
          + '|' + ((nodo.postura.traditions || []).map(function (t) { return t.name; }).join())
          + '|' + ((nodo.postura.wikilinks || []).map(function (e) { return e.target || e.label; }).join()) : '');
      if (!esNuevo && grupo.getAttribute('data-firma') === firma) return;
      grupo.setAttribute('data-firma', firma);

      while (grupo.firstChild) grupo.removeChild(grupo.firstChild);

      var cuerpo = crear('g', {}, 'nodo-cuerpo');
      grupo.appendChild(cuerpo);

      cuerpo.appendChild(crear('rect', {
        x: -6, y: -6, width: ancho + 12, height: alto + 12, rx: 17
      }, 'nodo-brillo'));
      cuerpo.appendChild(crear('rect', {
        x: -3.5, y: -3.5, width: ancho + 7, height: alto + 7, rx: 15
      }, 'nodo-anillo'));
      cuerpo.appendChild(crear('rect', {
        x: 3, y: 5, width: ancho, height: alto, rx: 12
      }, 'nodo-sombra'));
      cuerpo.appendChild(crear('rect', {
        x: 0, y: 0, width: ancho, height: alto, rx: 12
      }, 'nodo-caja'));

      var self = this;
      compuesto.partes.forEach(function (parte) {
        self.pintarParte(cuerpo, parte, ancho, padX, nodo, respuesta);
      });

      if (contexto.divulgacion !== 'edicion' && nodo.preguntaId && respuesta != null) {
        cuerpo.appendChild(this.construirPapelera(ancho, nodo));
      }
      if (!nodo.esControl) {
        cuerpo.appendChild(this.construirAsaNodo(nodo, ancho));
      }

      var entradasVisibles = nodo.entradas.filter(function (arista) {
        return contexto.aristasIds.has(arista.id);
      });
      if (entradasVisibles.length > 1) {
        cuerpo.appendChild(crear('path', {
          d: 'M ' + (ancho / 2 - 16) + ' -9 Q ' + (ancho / 2) + ' -20 '
            + (ancho / 2 + 16) + ' -9'
        }, 'convergencia-puerto'));
        cuerpo.appendChild(texto('&', ancho / 2, -22, 'convergencia-glifo'));
      }
    },

    pintarParte: function (grupo, parte, ancho, padX, nodo, respuesta) {
      if (parte.k === 'editBanda' || parte.k === 'editCampo' || parte.k === 'editPie'
        || parte.k === 'editRegion' || parte.k === 'editPapelera'
        || parte.k === 'editResize' || parte.k === 'editLod'
        || parte.k === 'controlMas' || parte.k === 'controlEje') {
        if (Arbol.EditMode) Arbol.EditMode.pintarParte(grupo, parte, ancho, padX, nodo);
        return;
      }
      var i;
      var self = this;

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
        var marcas = parte.tradiciones || [];
        var reparto = Arbol.Layout.marcasTradicion(marcas.length);
        var elegidas = this.contexto.tradicionesDestacadas || new Set();
        for (i = 0; i < reparto.puntos; i++) {
          grupo.appendChild(crear('circle', {
            cx: ancho - padX - 24 - i * 9, cy: parte.alto / 2, r: 3
          }, 'marca-tradicion' + (marcas[i].is_tentative ? ' tentativa' : '')
            + (elegidas.has(marcas[i].name) ? ' destacada' : '')));
        }
        var derecha = ancho - padX - 24 - reparto.puntos * 9;
        if (reparto.resto) {
          var resto = texto('+' + reparto.resto, derecha, parte.alto / 2,
            'marca-tradicion-resto');
          resto.setAttribute('text-anchor', 'end');
          grupo.appendChild(resto);
          derecha -= 22;
        }
        if (parte.conteo) {
          grupo.appendChild(this.conteoDebajo(parte.conteo, derecha, parte.alto / 2));
        }

      } else if (parte.k === 'tipo') {
        grupo.appendChild(texto(parte.texto, padX + (parte.sangria || 0), parte.y + 6,
          'nodo-etiqueta-tipo'));
        if (parte.conteo) {
          grupo.appendChild(this.conteoDebajo(parte.conteo, ancho - padX - 24, parte.y + 6));
        }

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
              'data-pregunta': nodo.preguntaId,
              'data-control': 'opcion',
              'data-glosa': boton.glosa || '',
              'data-rotulo': boton.texto
            }, 'opcion' + (respuesta === boton.clave ? ' elegida'
              : (respuesta != null ? ' tenue' : ''))
              + (boton.densa ? ' densa' : ''));
            g.appendChild(crear('rect', {
              x: padX + boton.x, y: y, width: boton.ancho, height: alturas.boton, rx: 8
            }, 'opcion-caja'));
            // El rótulo se centra en el hueco que deja el conteo, no en la caja.
            var anchoRotulo = boton.ancho - (boton.anchoConteo || 0);
            g.appendChild(texto(boton.texto, padX + boton.x + anchoRotulo / 2,
              y + alturas.boton / 2, 'opcion-texto'));
            if (boton.conteo) {
              g.appendChild(self.conteoDebajo(boton.conteo,
                padX + boton.x + boton.ancho - 11, y + alturas.boton / 2, 'opcion-conteo'));
            }
            grupo.appendChild(g);
          });
        });

      } else if (parte.k === 'expandir') {
        var gExp = crear('g', {
          'data-expandir': parte.nodoId,
          'data-control': 'expandir'
        }, 'opcion expandir' + (parte.expandido ? ' elegida' : ''));
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

    /* Cuántos nodos cuelgan de algo, alineado a su derecha: del nodo en su
       título, de una respuesta en su botón. */
    conteoDebajo: function (contenido, x, y, clase) {
      var marca = texto(contenido, x, y, clase || 'nodo-conteo');
      marca.setAttribute('text-anchor', 'end');
      return marca;
    },

    construirPapelera: function (ancho, nodo) {
      var g = crear('g', {
        transform: 'translate(8,7)',
        'data-papelera': nodo.preguntaId,
        'data-control': 'papelera'
      }, 'papelera');
      g.appendChild(crear('rect', { x: 0, y: 0, width: 22, height: 20, rx: 6 }, 'papelera-caja'));
      g.appendChild(crear('path', {
        d: 'M 6 7 H 16 M 8 7 V 15 M 11 7 V 15 M 14 7 V 15 M 8.5 5 H 13.5'
      }, 'papelera-icono'));
      return g;
    },

    /* Asa fija arriba a la derecha: agarre para mover, chincheta al anclar. */
    construirAsaNodo: function (nodo, ancho) {
      var fijado = Object.prototype.hasOwnProperty.call(this.contexto.estado.fijados, nodo.id);
      var g = crear('g', {
        transform: 'translate(' + (ancho - 30) + ',7)',
        'data-asa-nodo': nodo.id,
        'data-desanclar': nodo.id,
        'data-control': 'asa-nodo'
      }, 'asa-nodo' + (fijado ? ' anclada' : ''));
      g.appendChild(crear('rect', { x: 0, y: 0, width: 22, height: 20, rx: 6 }, 'asa-nodo-caja'));
      var agarre = crear('g', {}, 'asa-nodo-agarre');
      var puntos = [[8, 6], [14, 6], [8, 10], [14, 10], [8, 14], [14, 14]];
      puntos.forEach(function (p) {
        agarre.appendChild(crear('circle', { cx: p[0], cy: p[1], r: 1.35 }, 'asa-nodo-punto'));
      });
      g.appendChild(agarre);
      var pin = crear('g', {}, 'asa-nodo-pin');
      pin.appendChild(crear('path', {
        d: 'M 8 4 H 14 L 13 5 V 9 L 15.5 11.5 H 6.5 L 9 9 V 5 Z'
      }, 'chincheta-cabeza'));
      pin.appendChild(crear('path', { d: 'M 11 11.5 V 16' }, 'chincheta-aguja'));
      g.appendChild(pin);
      return g;
    },

    /* ------------------------------------------------ posiciones y aristas */

    animarPosiciones: function () {
      var self = this;
      var disposicion = this.contexto.disposicion;
      if (this.animacion) { global.cancelAnimationFrame(this.animacion); this.animacion = null; }
      /* Los nodos nuevos nacen en su coordenada final. Un translate CSS en el
         mismo <g> que el translate SVG los pintaba en el origen del mundo. */
      disposicion.forEach(function (caja, id) {
        if (!self.nodosDOM.has(id)) return;
        self.posiciones.set(id, { x: caja.x, y: caja.y });
      });
      this.aplicarPosiciones();
      this.dibujarAristas();
    },

    reducirMovimiento: function () {
      return global.matchMedia
        && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    debeAtenuarRecorrido: function () {
      return this.contexto && this.contexto.divulgacion === 'cuestionario';
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

      /* Si el hijo está debajo del padre, siempre abajo→arriba. Las anclas
         laterales cruzaban flechas cuando los padres quedaban juntos y los
         hijos se abrían en abanico. */
      var claroAbajo = puntoB.y >= puntoA.y + cajaA.alto * 0.45;
      var claroArriba = puntoA.y >= puntoB.y + cajaB.alto * 0.45;

      var ladoA;
      var ladoB;
      if (claroAbajo) {
        ladoA = 'abajo';
        ladoB = 'arriba';
      } else if (claroArriba) {
        ladoA = 'arriba';
        ladoB = 'abajo';
      } else if (Math.abs(dx) / holguraX > Math.abs(dy) / holguraY) {
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
        if (!self.nodosDOM.has(arista.desde) || !self.nodosDOM.has(arista.hasta)) return;
        var extremos = self.anclas(arista.desde, arista.hasta);
        if (!extremos) return;
        var desde = extremos.desde;
        var hasta = extremos.hasta;
        vistas.add(aristaId);

        var grupo = self.aristasDOM.get(aristaId);
        var esNueva = !grupo;
        if (!grupo) {
          grupo = crear('g', { 'data-id': aristaId }, 'arista-grupo');
          grupo.appendChild(crear('path', { pathLength: 1 }, 'arista'));
          if (arista.tipo === 'respuesta' && (arista.etiqueta || contexto.divulgacion === 'edicion')) {
            grupo.appendChild(crear('rect', {}, 'arista-etiqueta-caja'));
            grupo.appendChild(texto(arista.etiqueta, 0, 0, 'arista-etiqueta-texto'));
          }
          self.capaAristas.appendChild(grupo);
          self.aristasDOM.set(aristaId, grupo);
        }
        if (grupo.__salidaTimer) {
          global.clearTimeout(grupo.__salidaTimer);
          grupo.__salidaTimer = null;
        }
        grupo.classList.remove('saliendo');
        grupo.style.removeProperty('--retraso-salida');

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
        trazo.setAttribute('pathLength', '1');
        trazo.setAttribute('d', d);

        var clases = ['arista-grupo'];
        var clasesTrazo = ['arista'];
        if (arista.tipo === 'eje') clasesTrazo.push('eje');
        if (arista.tipo === 'control') {
          clasesTrazo.push('control');
          clases.push('control');
          var destControl = contexto.grafo.nodos.get(arista.hasta);
          if (destControl && destControl.tipo === 'control-eje') {
            clasesTrazo.push('control-eje');
            clases.push('control-eje');
          }
        }
        var elegida = arista.tipo === 'respuesta'
          && contexto.respuestas[arista.preguntaId] === arista.clave;
        var deshab = contexto.deshabilitados;
        var ramaOpaca = deshab && deshab.has(arista.hasta);
        if (ramaOpaca) {
          clases.push('deshabilitada');
          clasesTrazo.push('deshabilitada');
        } else if (contexto.camino && arista.tipo !== 'control') {
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
          clases.push('deshabilitada');
          clasesTrazo.push('deshabilitada');
        }
        var seguirEntrando = !esNueva && grupo.classList.contains('entrando');
        if ((esNueva || seguirEntrando) && !self.reducirMovimiento()) {
          clases.push('entrando');
        }
        if (esNueva && !self.reducirMovimiento()) {
          var retrasoArista = (self._retrasoArista && self._retrasoArista.get(aristaId)) || 0;
          grupo.style.setProperty('--retraso-entrada', retrasoArista + 'ms');
          global.setTimeout(function () {
            grupo.classList.remove('entrando');
          }, retrasoArista + ENTRADA_ARISTA_MS + 360);
        }
        grupo.setAttribute('class', clases.join(' '));
        trazo.setAttribute('class', clasesTrazo.join(' '));

        var mx = (desde.x + 3 * c1x + 3 * c2x + hasta.x) / 8;
        var my = (desde.y + 3 * c1y + 3 * c2y + hasta.y) / 8;
        var caja = grupo.querySelector('.arista-etiqueta-caja');
        var etiqueta = grupo.querySelector('.arista-etiqueta-texto');
        if (caja) {
          var anchoTexto = Arbol.Layout.medir(arista.etiqueta || '', '600 11px ' + Arbol.Layout.PILA);
          caja.setAttribute('x', mx - anchoTexto / 2 - 8);
          caja.setAttribute('y', my - 10);
          caja.setAttribute('width', Math.max(24, anchoTexto + 16));
          caja.setAttribute('height', 20);
          if (etiqueta) {
            etiqueta.setAttribute('x', mx);
            etiqueta.setAttribute('y', my);
            etiqueta.textContent = arista.etiqueta || '';
          }
        }
        if (contexto.divulgacion === 'edicion' && arista.tipo === 'respuesta' && Arbol.EditMode) {
          Arbol.EditMode.pintarEtiquetaArista(grupo, arista, mx, my);
        } else {
          if (Arbol.EditMode && Arbol.EditMode.quitarEtiquetaArista) {
            Arbol.EditMode.quitarEtiquetaArista(aristaId);
          }
          var foEdit = grupo.querySelector('.edit-arista-fo');
          if (foEdit) foEdit.remove();
          if (etiqueta) etiqueta.removeAttribute('display');
        }
      });

      if (contexto.divulgacion === 'edicion' && Arbol.EditMode) {
        Arbol.EditMode.dibujarAsas(this);
      }

      var salientesAristas = [];
      this.aristasDOM.forEach(function (grupo, id) {
        if (vistas.has(id)) return;
        if (self.reducirMovimiento()) {
          if (Arbol.EditMode && Arbol.EditMode.quitarEtiquetaArista) {
            Arbol.EditMode.quitarEtiquetaArista(id);
          }
          grupo.remove();
          self.aristasDOM.delete(id);
          return;
        }
        if (grupo.classList.contains('saliendo')) return;
        var arista = contexto.grafo.aristas.get(id);
        var hastaPunto = arista ? self.posiciones.get(arista.hasta) : null;
        salientesAristas.push({
          id: id, grupo: grupo, y: hastaPunto ? hastaPunto.y : 0
        });
      });
      salientesAristas.sort(function (a, b) { return b.y - a.y; });
      var cascadaArista = Math.min(280, Math.max(0, salientesAristas.length - 1) * 45);
      salientesAristas.forEach(function (item, indice) {
        var retraso = salientesAristas.length < 2 ? 0
          : Math.round((indice / (salientesAristas.length - 1)) * cascadaArista);
        item.grupo.classList.add('saliendo');
        item.grupo.style.setProperty('--retraso-salida', retraso + 'ms');
        if (item.grupo.__salidaTimer) global.clearTimeout(item.grupo.__salidaTimer);
        item.grupo.__salidaTimer = global.setTimeout(function () {
          if (self.contexto && self.contexto.aristasIds && self.contexto.aristasIds.has(item.id)) return;
          if (Arbol.EditMode && Arbol.EditMode.quitarEtiquetaArista) {
            Arbol.EditMode.quitarEtiquetaArista(item.id);
          }
          item.grupo.remove();
          self.aristasDOM.delete(item.id);
        }, retraso + SALIDA_ARISTA_MS + 40);
      });
    },

    /* --------------------------------------------------------- minimapa -- */

    limitesMundo: function () {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      var self = this;
      this.contexto.disposicion.forEach(function (caja, id) {
        if (!self.nodosDOM.has(id)) return;
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
        if (!self.nodosDOM.has(id)) return;
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
      if (this.tooltip.innerHTML !== contenido) {
        this.tooltip.innerHTML = contenido;
        if (this.opciones.alPintarTooltip) this.opciones.alPintarTooltip(this.tooltip);
      }
      this.tooltip.classList.add('visible');
      this.tooltip.classList.remove('saliendo');
      this.tooltip.setAttribute('aria-hidden', 'false');
      this.posicionarTooltip(clienteX, clienteY);
    },

    posicionarTooltip: function (clienteX, clienteY) {
      var caja = this.tooltip.getBoundingClientRect();
      var maxX = global.innerWidth - caja.width - 16;
      var maxY = global.innerHeight - caja.height - 16;
      this.tooltip.style.left = Math.max(12, Math.min(maxX, clienteX + 18)) + 'px';
      this.tooltip.style.top = Math.max(12, Math.min(maxY, clienteY + 18)) + 'px';
    },

    ocultarTooltip: function (inmediato) {
      this._tipModo = null;
      this._tipClave = null;
      this.cancelarTipTimers();
      if (!this.tooltip) return;
      if (inmediato) {
        this.tooltip.classList.remove('visible', 'saliendo');
      } else {
        this.tooltip.classList.add('saliendo');
        this.tooltip.classList.remove('visible');
      }
      this.tooltip.setAttribute('aria-hidden', 'true');
    },

    cancelarTipTimers: function () {
      if (this._tipShow) { global.clearTimeout(this._tipShow); this._tipShow = null; }
      if (this._tipHide) { global.clearTimeout(this._tipHide); this._tipHide = null; }
    },

    nodoDeshabilitado: function (nodoDOM) {
      return !!(nodoDOM && nodoDOM.classList.contains('deshabilitado'));
    },

    /* SVG serializado del diagrama actual (sin cámara: todo el árbol visible). */
    svgDelDiagrama: function () {
      if (!this.svg || !this.contexto || !this.mundo) return '';
      var limites = this.limitesMundo();
      var pad = 36;
      var x = limites.minX - pad;
      var y = limites.minY - pad;
      var w = (limites.maxX - limites.minX) + pad * 2;
      var h = (limites.maxY - limites.minY) + pad * 2;
      var estilosRaiz = global.getComputedStyle(document.documentElement);
      var fondo = (estilosRaiz.getPropertyValue('--fondo') || '#0e141b').trim();
      var props = [
        'fill', 'stroke', 'stroke-width', 'stroke-opacity', 'fill-opacity', 'opacity',
        'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing',
        'text-anchor', 'dominant-baseline', 'stroke-linecap', 'stroke-linejoin',
        'stroke-dasharray', 'marker-end'
      ];
      function inlinear(origen, destino) {
        if (!origen || !destino || origen.nodeType !== 1) return;
        var tag = String(origen.tagName || '').toLowerCase();
        var cs = global.getComputedStyle(origen);
        if (tag === 'g' || tag === 'svg' || tag === 'defs') {
          var opacidad = cs.getPropertyValue('opacity');
          if (opacidad && opacidad !== '1') destino.setAttribute('opacity', opacidad.trim());
          return;
        }
        var i;
        for (i = 0; i < props.length; i++) {
          var valor = (cs.getPropertyValue(props[i]) || '').trim();
          if (!valor || valor === 'normal') continue;
          // `fill` hay que escribirlo siempre, incluso `none`: sin el atributo
          // el SVG rellena de negro y las curvas de las aristas se manchan.
          if (/^(fill|stroke)$/.test(props[i])
            && (valor === 'transparent' || valor === 'rgba(0, 0, 0, 0)')) {
            valor = 'none';
          }
          destino.setAttribute(props[i], valor);
        }
      }
      var defsOrig = this.svg.querySelector('defs');
      var defs = defsOrig ? defsOrig.cloneNode(true) : null;
      if (defsOrig && defs) {
        var origDefEls = defsOrig.querySelectorAll('*');
        var copyDefEls = defs.querySelectorAll('*');
        var d;
        for (d = 0; d < origDefEls.length; d++) inlinear(origDefEls[d], copyDefEls[d]);
      }
      var mundo = this.mundo.cloneNode(true);
      // El `viewBox` ya está en coordenadas del árbol: la matriz de la cámara
      // desplazaría y escalaría el contenido fuera del recuadro.
      mundo.removeAttribute('transform');
      inlinear(this.mundo, mundo);
      var origEls = this.mundo.querySelectorAll('*');
      var copyEls = mundo.querySelectorAll('*');
      var i;
      for (i = 0; i < origEls.length; i++) inlinear(origEls[i], copyEls[i]);
      var serializer = new XMLSerializer();
      var defsXml = defs ? serializer.serializeToString(defs) : '';
      var mundoXml = serializer.serializeToString(mundo);
      return '<?xml version="1.0" encoding="UTF-8"?>\n'
        + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'
        + x + ' ' + y + ' ' + w + ' ' + h
        + '" width="' + Math.round(w) + '" height="' + Math.round(h) + '">'
        + defsXml
        + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h
        + '" fill="' + fondo + '"/>'
        + mundoXml + '</svg>';
    },

    exportarSVG: function () {
      return this.svgDelDiagrama();
    },

    exportarPNG: function () {
      var self = this;
      var xml = this.svgDelDiagrama();
      if (!xml) return Promise.reject(new Error('vacío'));
      return new Promise(function (resolver, rechazar) {
        var blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
          var lienzo = document.createElement('canvas');
          lienzo.width = Math.max(1, img.naturalWidth);
          lienzo.height = Math.max(1, img.naturalHeight);
          var ctx = lienzo.getContext('2d');
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          if (lienzo.toBlob) {
            lienzo.toBlob(function (png) {
              if (png) resolver(png);
              else rechazar(new Error('toBlob'));
            }, 'image/png');
          } else {
            rechazar(new Error('toBlob'));
          }
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          rechazar(new Error('svg'));
        };
        img.src = url;
      });
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

      this.svg.addEventListener('selectstart', function (evento) {
        if (Arbol.EditMode && Arbol.EditMode.esEventoDeEdicion(evento)) return;
        evento.preventDefault();
      });

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
        var bajo = elementoBajoPuntero(evento);
        var tag = evento.target && evento.target.tagName;
        var enCampo = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
          || (evento.target && evento.target.closest
            && evento.target.closest('.edit-chip-quitar'));
        if (!enCampo && Arbol.EditMode && self.contexto
          && self.contexto.divulgacion === 'edicion') {
          Arbol.EditMode.quitarFocoCampos();
        }
        if (Arbol.EditMode && Arbol.EditMode.esEventoDeEdicion(evento)) {
          if (Arbol.EditMode.iniciarReenganche(evento, self)) {
            try { self.svg.setPointerCapture(evento.pointerId); } catch (e) { /* nada */ }
            evento.preventDefault();
            return;
          }
          if (Arbol.EditMode.iniciarResize(evento, self)) {
            try { self.svg.setPointerCapture(evento.pointerId); } catch (e) { /* nada */ }
            evento.preventDefault();
            return;
          }
          return;
        }
        var nodoDOM = ancestro(bajo, '.nodo');
        if (ancestro(bajo, '.opcion') || ancestro(bajo, '.papelera')
          || ancestro(bajo, '.edit-papelera') || ancestro(bajo, '.tipo-control-mas')
          || ancestro(bajo, '.tipo-control-eje')) {
          return;
        }
        evento.preventDefault();
        if ((evento.ctrlKey || evento.metaKey) && nodoDOM) return;
        var tactil = evento.pointerType === 'touch';
        if (!self.punteros) self.punteros = new Map();
        self.punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
        if (self.punteros.size >= 2) {
          self.iniciarPellizco();
          return;
        }

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
        if (Arbol.EditMode && Arbol.EditMode.hayGesto()) {
          if (Arbol.EditMode.moverReenganche(evento, self)) return;
          if (Arbol.EditMode.moverResize(evento)) return;
        }
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
        self.ocultarTooltip(true);
        var grupoMovido = self.nodosDOM.get(self.arrastre.id);
        var asaMovida = grupoMovido && grupoMovido.querySelector('.asa-nodo');
        if (asaMovida) asaMovida.classList.add('arrastrando');
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
        if (Arbol.EditMode && Arbol.EditMode.hayGesto()) {
          if (Arbol.EditMode.soltarReenganche(evento, self, self.opciones.alReenganchar)) {
            self.ignorarSiguienteClic = true;
            return;
          }
          if (Arbol.EditMode.soltarResize(self.opciones.alRedimensionar)) {
            self.ignorarSiguienteClic = true;
            return;
          }
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
          self._ignorarClicHasta = Date.now() + 400;
          var punto = self.posiciones.get(arrastre.id);
          if (self.opciones.alFijar) self.opciones.alFijar(arrastre.id, punto);
          self.dibujarMinimapa();
        }
        self._huboPellizco = false;
      });

      this.svg.addEventListener('pointercancel', function (evento) {
        if (Arbol.EditMode && Arbol.EditMode.hayGesto()) {
          Arbol.EditMode.cancelarGestos(self);
        }
        if (self.punteros) self.punteros.delete(evento.pointerId);
        self.cancelarResalteLargo();
        self.arrastre = null;
        self.panorama = null;
        self.pellizco = null;
        self.svg.classList.remove('arrastrando', 'moviendo-nodo');
      });

      this.svg.addEventListener('click', function (evento) {
        var bajo = elementoBajoPuntero(evento);
        var esControl = !!(ancestro(bajo, '.asa-nodo') || ancestro(bajo, '.chincheta')
          || ancestro(bajo, '.papelera')
          || ancestro(bajo, '.opcion') || ancestro(bajo, '.edit-papelera')
          || ancestro(bajo, '.edit-agregar') || ancestro(bajo, '.edit-rama')
          || ancestro(bajo, '.tipo-control-mas') || ancestro(bajo, '.tipo-control-eje')
          || ancestro(bajo, '.edit-fo') || ancestro(bajo, '.reenganche-asa')
          || ancestro(bajo, '.edit-resize'));
        var asaNodo = ancestro(bajo, '.asa-nodo');
        if (asaNodo) {
          if (self.ignorarSiguienteClic || Date.now() < (self._ignorarClicHasta || 0)) {
            self.ignorarSiguienteClic = false;
            return;
          }
          evento.stopPropagation();
          if (asaNodo.classList.contains('anclada') && self.opciones.alDesanclar) {
            self.opciones.alDesanclar(asaNodo.getAttribute('data-desanclar')
              || asaNodo.getAttribute('data-asa-nodo'));
          }
          return;
        }
        if (self.ignorarSiguienteClic) {
          self.ignorarSiguienteClic = false;
          if (!esControl) return;
        }
        if (!esControl && Date.now() < (self._ignorarClicHasta || 0)) return;
        var nodoBajoCursor = ancestro(bajo, '.nodo') || self._ultimoNodoPuntero;

        if ((evento.ctrlKey || evento.metaKey) && nodoBajoCursor) {
          evento.preventDefault();
          evento.stopPropagation();
          if (self.opciones.alResaltar) {
            self.opciones.alResaltar(nodoBajoCursor.getAttribute('data-id'));
          }
          return;
        }

        var bloqueado = self.nodoDeshabilitado(nodoBajoCursor);
        var opcion = ancestro(bajo, '.opcion');
        if (opcion && bloqueado) return;
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
          if (bloqueado) return;
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
        var ramaEdit = ancestro(bajo, '[data-edit-expandir]');
        if (ramaEdit) {
          evento.stopPropagation();
          if (self.opciones.alExpandir) {
            self.opciones.alExpandir(ramaEdit.getAttribute('data-edit-expandir'));
          }
          return;
        }
        var agregar = ancestro(bajo, '[data-edit-control="agregar"]');
        if (agregar && self.opciones.alAgregarCampo) {
          evento.stopPropagation();
          self.opciones.alAgregarCampo(agregar, evento);
          return;
        }
        var borrarEdit = ancestro(bajo, '[data-edit-borrar]');
        if (borrarEdit && self.opciones.alBorrarNodoEdicion) {
          evento.stopPropagation();
          self.opciones.alBorrarNodoEdicion(borrarEdit.getAttribute('data-edit-borrar'));
          return;
        }
        if (nodoBajoCursor && (nodoBajoCursor.classList.contains('tipo-control-mas')
            || nodoBajoCursor.classList.contains('tipo-control-eje'))) {
          evento.stopPropagation();
          if (self.opciones.alCrearControl) {
            self.opciones.alCrearControl(nodoBajoCursor.getAttribute('data-id'));
          }
          return;
        }
        if (ancestro(bajo, '.edit-fo') || ancestro(bajo, '.reenganche-asa')
            || ancestro(bajo, '.edit-resize')) {
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
        if (Arbol.EditMode && Arbol.EditMode.esEventoDeEdicion(evento)) return;
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
        var bajo = elementoBajoPuntero(evento);
        var control = ancestro(bajo, '[data-control], [data-edit-control], [data-edit-campo]');
        var nodoDOM = ancestro(bajo, '.nodo');
        var mx = evento.clientX;
        var my = evento.clientY;

        if (control) {
          self.cancelarTipTimers();
          var clave = 'c:' + (control.getAttribute('data-control') || '')
            + ':' + (control.getAttribute('data-clave') || '')
            + ':' + (control.getAttribute('data-papelera') || '')
            + ':' + (control.getAttribute('data-desanclar') || '');
          if (self._tipModo !== 'control' || self._tipClave !== clave) {
            self._tipModo = 'control';
            self._tipClave = clave;
            var htmlControl = self.opciones.tooltipControl
              ? self.opciones.tooltipControl(control) : null;
            if (htmlControl) self.mostrarTooltip(htmlControl, mx, my);
            else self.ocultarTooltip(true);
          } else if (self.tooltip.classList.contains('visible')) {
            self.posicionarTooltip(mx, my);
          }
          return;
        }

        if (!nodoDOM) {
          self.ocultarTooltip();
          self._ultimoPuntoTip = null;
          return;
        }

        var id = nodoDOM.getAttribute('data-id');
        var primera = !self._ultimoPuntoTip;
        var movio = false;
        if (self._ultimoPuntoTip) {
          movio = Math.abs(mx - self._ultimoPuntoTip.x) + Math.abs(my - self._ultimoPuntoTip.y)
            >= TIP_MOVIMIENTO;
        }
        self._ultimoPuntoTip = { x: mx, y: my };

        if (self._tipModo === 'control') {
          self.ocultarTooltip(true);
        }

        if (movio && self._tipModo === 'nodo' && self.tooltip.classList.contains('visible')) {
          if (!self._tipHide) {
            self._tipHide = global.setTimeout(function () {
              self._tipHide = null;
              self.ocultarTooltip();
            }, TIP_OCULTA);
          }
        }

        if (self._tipNodoId !== id) {
          self.cancelarTipTimers();
          if (self._tipModo === 'nodo') self.ocultarTooltip(true);
          self._tipNodoId = id;
          primera = true;
        }

        if (primera || movio) {
          if (self._tipShow) global.clearTimeout(self._tipShow);
            self._tipShow = global.setTimeout(function () {
            self._tipShow = null;
            if (self._tipHide) { global.clearTimeout(self._tipHide); self._tipHide = null; }
            if (!self.contexto || !self.contexto.grafo) return;
            var html = self.opciones.tooltipHTML
              ? self.opciones.tooltipHTML(self.contexto.grafo.nodos.get(id))
              : null;
            self._tipModo = 'nodo';
            self._tipClave = id;
            if (html) self.mostrarTooltip(html, mx, my);
            else self.ocultarTooltip(true);
          }, TIP_ESPERA);
        }
      });

      this.svg.addEventListener('mouseleave', function () {
        self._ultimoPuntoTip = null;
        self._tipNodoId = null;
        self.ocultarTooltip();
      });

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

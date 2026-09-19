/* Comprobación sin navegador de los módulos puros del visor (grafo, layout y
   búsqueda inversa). No forma parte de la aplicación: se ejecuta con
   `node prueba-modelo.js` desde recursos/diagramas/arbol-web/. */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const datos = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'datos', 'posturas-creencias.json'), 'utf8')
);

// DOM mínimo: solo lo que state.js, layout.js y search.js llegan a tocar.
const almacen = new Map();
const ventana = {
  localStorage: {
    getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => almacen.set(k, String(v)),
    removeItem: (k) => almacen.delete(k)
  },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  setTimeout,
  clearTimeout
};
ventana.window = ventana;

const documento = {
  createElement(nombre) {
    if (nombre !== 'canvas') return {};
    return {
      getContext: () => ({
        font: '',
        // Aproximación estable: no medimos glifos reales, solo comprobamos
        // que la composición y el layout no exploten ni produzcan NaN.
        measureText: (texto) => ({ width: texto.length * 7.1 })
      })
    };
  }
};

ventana.location = { search: '', pathname: '/index.html', href: 'file:///index.html' };
ventana.history = { replaceState() {} };

const contexto = vm.createContext(Object.assign(ventana, {
  document: documento,
  console,
  URLSearchParams, encodeURIComponent, decodeURIComponent,
  Map, Set, Math, JSON, Object, Array, String, Number, Boolean, isFinite,
  RegExp, Error, Infinity, Date
}));

['js/formato.js', 'js/state.js', 'js/edits.js', 'js/layout.js', 'js/search.js', 'js/router.js'].forEach((archivo) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, archivo), 'utf8'), contexto, {
    filename: archivo
  });
});

const Arbol = contexto.Arbol;
const fallos = [];
function comprobar(titulo, condicion, detalle) {
  if (condicion) console.log('  ok   ' + titulo);
  else { fallos.push(titulo); console.log('  FALLA ' + titulo + (detalle ? ' → ' + detalle : '')); }
}

console.log('\n== Grafo ==');
const grafo = Arbol.construirGrafo(datos);
comprobar('hay una raíz', grafo.raices.length === 1, grafo.raices.join(','));
comprobar('la raíz es la tarjeta de Existencia', grafo.raices[0] === 'T:PR1', grafo.raices[0]);

const tipos = { tarjeta: 0, postura: 0, pregunta: 0 };
grafo.nodos.forEach((n) => { tipos[n.tipo] += 1; });
console.log('  nodos por tipo:', JSON.stringify(tipos), '· total', grafo.nodos.size);

const convergentes = [];
grafo.nodos.forEach((n) => { if (n.entradas.length > 1) convergentes.push(n.id); });
// El número se deriva del dataset, no se fija: el documento gana convergencias
// y una constante aquí caduca en cuanto se agrega la siguiente.
const convergenciasEsperadas = Object.values(datos.questions)
  .filter((q) => q.is_convergence).length;
comprobar('cada convergencia del dataset es un nodo con varias aristas entrantes',
  convergentes.length === convergenciasEsperadas,
  convergentes.join(', ') + ' · esperadas ' + convergenciasEsperadas);
convergentes.forEach((id) => {
  const nodo = grafo.nodos.get(id);
  console.log('    ' + id + ' ← ' + nodo.entradas.map((a) => a.desde).join(' , ')
    + '  «' + nodo.pregunta.formal_text.slice(0, 48) + '…»');
});

comprobar('ninguna postura se duplicó en dos nodos',
  new Set(Array.from(grafo.nodos.values())
    .filter((n) => n.posturaId).map((n) => n.posturaId)).size
  === Object.keys(datos.postures).length);

let preguntasCubiertas = new Set();
grafo.nodos.forEach((n) => { if (n.preguntaId) preguntasCubiertas.add(n.preguntaId); });
comprobar('cada pregunta tiene exactamente un nodo anfitrión',
  preguntasCubiertas.size === Object.keys(datos.questions).length,
  preguntasCubiertas.size + ' de ' + Object.keys(datos.questions).length);

console.log('\n== Divulgación progresiva ==');
let visibles = Arbol.nodosVisibles(grafo, {}, false);
comprobar('el árbol arranca solo con la raíz', visibles.size === 1, 'visibles=' + visibles.size);

visibles = Arbol.nodosVisibles(grafo, { Q1: 'A' }, false);
console.log('  tras responder Q1:A →', visibles.size, 'nodos');
// Los destinos salen del dataset: fijarlos a mano envejeció mal cuando el
// documento creció y la rama de Q1 cambió de posturas.
const destinosQ1 = datos.questions.Q1.answers.map((r) => grafo.idDePostura(r.target_posture_id));
comprobar('Q1 revela las dos posturas destino, no solo la elegida',
  destinosQ1.length === 2 && destinosQ1.every((id) => visibles.has(id)),
  destinosQ1.join(',') + ' | visibles=' + Array.from(visibles).join(','));
comprobar('no se filtran nietos sin responder', !visibles.has('T:P2') && !visibles.has('T:P3'));

visibles = Arbol.nodosVisibles(grafo, { Q1: 'A', Q2: 'B' }, false);
comprobar('Q2 abre Teísmo y Deísmo como nodos base',
  visibles.has('B:P2') && visibles.has('B:P3'));
// Una postura partida enseña su pregunta colgante igual que una tarjeta
// unificada enseña la suya: el nodo convergente debe aparecer sin responder.
comprobar('la pregunta convergente cuelga de ambas posturas, sin responder',
  visibles.has('P:Q3') && !visibles.has('T:P4') && !visibles.has('T:P5'),
  Array.from(visibles).join(','));

const todos = Arbol.nodosVisibles(grafo, {}, true);
comprobar('el modo «árbol completo» muestra todo', todos.size === grafo.nodos.size);

visibles = Arbol.nodosVisibles(grafo, { Q1: 'A' }, 'limpio');
comprobar('el modo limpio oculta la postura no elegida',
  visibles.has('T:P1') && !visibles.has('B:P98'), Array.from(visibles).join(','));

console.log('\n== Layout ==');
const respuestas = { Q1: 'A', Q2: 'B', Q3: 'B', Q4: 'B', Q5: 'A' };
const vis = Arbol.nodosVisibles(grafo, respuestas, false);
const aristas = Arbol.aristasVisibles(grafo, vis, respuestas, false);
const tamanos = new Map();
vis.forEach((id) => {
  const nodo = grafo.nodos.get(id);
  const compuesto = Arbol.Layout.componer(
    nodo, nodo.preguntaId ? (respuestas[nodo.preguntaId] || null) : null, { datos }
  );
  tamanos.set(id, { ancho: compuesto.ancho, alto: compuesto.alto });
});
const disposicion = Arbol.Layout.calcular(grafo, vis, aristas, tamanos, {});
comprobar('el layout coloca todos los nodos visibles', disposicion.size === vis.size);
let finito = true;
let solapes = 0;
const cajas = Array.from(disposicion.values());
disposicion.forEach((c) => {
  if (!isFinite(c.x) || !isFinite(c.y) || !isFinite(c.alto)) finito = false;
});
for (let i = 0; i < cajas.length; i++) {
  for (let j = i + 1; j < cajas.length; j++) {
    const a = cajas[i]; const b = cajas[j];
    if (a.x < b.x + b.ancho && b.x < a.x + a.ancho
      && a.y < b.y + b.alto && b.y < a.y + a.alto) solapes += 1;
  }
}
comprobar('todas las coordenadas son finitas', finito);
comprobar('ningún par de nodos se solapa', solapes === 0, solapes + ' solapes');

const rangos = {};
disposicion.forEach((c) => { rangos[c.rango] = (rangos[c.rango] || 0) + 1; });
console.log('  nodos por rango:', JSON.stringify(rangos));

// El mismo layout con el árbol entero: es el caso peor y el que más fácilmente
// produciría solapes o rangos mal asignados.
const visTodo = Arbol.nodosVisibles(grafo, {}, true);
const aristasTodo = Arbol.aristasVisibles(grafo, visTodo, {}, true);
const tamanosTodo = new Map();
visTodo.forEach((id) => {
  const nodo = grafo.nodos.get(id);
  const compuesto = Arbol.Layout.componer(nodo, null, { datos });
  tamanosTodo.set(id, { ancho: compuesto.ancho, alto: compuesto.alto });
});
const disposicionTodo = Arbol.Layout.calcular(grafo, visTodo, aristasTodo, tamanosTodo, {});
const cajasTodo = Array.from(disposicionTodo.values());
let botonesArbolCompleto = 0;
visTodo.forEach((id) => {
  const nodo = grafo.nodos.get(id);
  const compuesto = Arbol.Layout.componer(nodo, null, { datos, divulgacion: 'completo' });
  botonesArbolCompleto += compuesto.partes.filter((p) => p.k === 'botones').length;
});
comprobar('el árbol completo no muestra botones de respuesta', botonesArbolCompleto === 0);
let solapesTodo = 0;
for (let i = 0; i < cajasTodo.length; i++) {
  for (let j = i + 1; j < cajasTodo.length; j++) {
    const a = cajasTodo[i]; const b = cajasTodo[j];
    if (a.x < b.x + b.ancho && b.x < a.x + a.ancho
      && a.y < b.y + b.alto && b.y < a.y + a.alto) solapesTodo += 1;
  }
}
comprobar('el árbol completo se dispone sin solapes',
  disposicionTodo.size === grafo.nodos.size && solapesTodo === 0,
  solapesTodo + ' solapes en ' + disposicionTodo.size + ' nodos');
let padreArribaDeHijo = true;
grafo.aristas.forEach((arista) => {
  const a = disposicionTodo.get(arista.desde);
  const b = disposicionTodo.get(arista.hasta);
  if (a && b && a.rango >= b.rango) padreArribaDeHijo = false;
});
comprobar('toda arista baja de rango (el DAG queda estratificado)', padreArribaDeHijo);

const conFijado = Arbol.Layout.calcular(grafo, vis, aristas, tamanos,
  { 'T:P1': { x: 900, y: 400 } });
comprobar('un nodo anclado conserva su posición exacta',
  conFijado.get('T:P1').x === 900 && conFijado.get('T:P1').y === 400,
  JSON.stringify(conFijado.get('T:P1')));
const mismaFila = Array.from(disposicion.entries()).find(([id, caja]) =>
  Array.from(disposicion.entries()).some(([otroId, otraCaja]) =>
    otroId !== id && otraCaja.rango === caja.rango));
if (mismaFila) {
  const [ancladoId, ancladoCaja] = mismaFila;
  const vecinoId = Array.from(disposicion.entries()).find(([id, caja]) =>
    id !== ancladoId && caja.rango === ancladoCaja.rango)[0];
  const conColision = Arbol.Layout.calcular(grafo, vis, aristas, tamanos,
    { [ancladoId]: { x: disposicion.get(vecinoId).x, y: disposicion.get(vecinoId).y } });
  const cajasColision = Array.from(conColision.values());
  let solapesAnclados = 0;
  for (let i = 0; i < cajasColision.length; i++) {
    for (let j = i + 1; j < cajasColision.length; j++) {
      const a = cajasColision[i]; const b = cajasColision[j];
      if (a.x < b.x + b.ancho && b.x < a.x + a.ancho
        && a.y < b.y + b.alto && b.y < a.y + a.alto) solapesAnclados += 1;
    }
  }
  comprobar('un anclaje no provoca solapes en su nivel', solapesAnclados === 0,
    solapesAnclados + ' solapes');
}

function segmentoCruce(a, b, c, d) {
  function orient(p, q, r) {
    return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  }
  return orient(a, b, c) * orient(a, b, d) < 0
    && orient(c, d, a) * orient(c, d, b) < 0;
}

function contarCrucesLayout(grafoLocal, aristasIds, disposicionLocal) {
  const lista = [];
  aristasIds.forEach((id) => {
    const arista = grafoLocal.aristas.get(id);
    if (arista) lista.push(arista);
  });
  let cruces = 0;
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const A = lista[i];
      const B = lista[j];
      if (A.desde === B.desde || A.desde === B.hasta
        || A.hasta === B.desde || A.hasta === B.hasta) continue;
      const da = disposicionLocal.get(A.desde);
      const ha = disposicionLocal.get(A.hasta);
      const db = disposicionLocal.get(B.desde);
      const hb = disposicionLocal.get(B.hasta);
      if (!da || !ha || !db || !hb) continue;
      const pa = { x: da.x + da.ancho / 2, y: da.y + da.alto };
      const qa = { x: ha.x + ha.ancho / 2, y: ha.y };
      const pb = { x: db.x + db.ancho / 2, y: db.y + db.alto };
      const qb = { x: hb.x + hb.ancho / 2, y: hb.y };
      if (segmentoCruce(pa, qa, pb, qb)) cruces += 1;
    }
  }
  return cruces;
}

const crucesCamino = contarCrucesLayout(grafo, aristas, disposicion);
comprobar('el recorrido respondido no cruza flechas',
  crucesCamino === 0, crucesCamino + ' cruces');
/* Deuda de layout conocida, no una prueba desactualizada: con el árbol de hoy,
   la reducción de cruces de `reducirCruces` (Sugiyama con barycentro e
   intercambios locales, js/layout.js) deja unos pocos cruces que no consigue
   deshacer. Se fija el número actual como techo para que un empeoramiento
   falle; llevarlo a cero es trabajo de layout pendiente, no de esta suite. */
const TECHO_CRUCES_COMPLETO = 1;
const crucesTodo = contarCrucesLayout(grafo, aristasTodo, disposicionTodo);
comprobar('el árbol completo no empeora los cruces conocidos (deuda: '
  + TECHO_CRUCES_COMPLETO + ')',
  crucesTodo <= TECHO_CRUCES_COMPLETO, crucesTodo + ' cruces');

console.log('\n== Nodos que cuelgan de cada nodo ==');
const debajo = Arbol.descendientesPorNodo(grafo);
comprobar('cada nodo tiene su conteo', debajo.size === grafo.nodos.size);
const hojas = Array.from(grafo.nodos.keys())
  .filter((id) => !grafo.nodos.get(id).salidas.length);
comprobar('las hojas no cuelgan de nada',
  hojas.length > 0 && hojas.every((id) => debajo.get(id) === 0));
console.log('  desde la raíz cuelgan ' + debajo.get(grafo.raices[0]) + ' de '
  + (grafo.nodos.size - 1) + ' nodos posibles');
comprobar('desde la raíz cuelga casi todo el árbol, sin contarse a sí misma',
  debajo.get(grafo.raices[0]) > 90 && debajo.get(grafo.raices[0]) < grafo.nodos.size,
  String(debajo.get(grafo.raices[0])));
// Convergencia: un nodo alcanzable por dos ramas se cuenta una sola vez, así
// que el padre nunca suma más que la suma de sus hijos.
let sinDobleConteo = true;
grafo.nodos.forEach((nodo, id) => {
  const suma = nodo.salidas.reduce((n, arista) => n + 1 + debajo.get(arista.hasta), 0);
  if (debajo.get(id) > suma) sinDobleConteo = false;
  nodo.salidas.forEach((arista) => {
    if (debajo.get(id) <= debajo.get(arista.hasta)) sinDobleConteo = false;
  });
});
comprobar('el conteo no duplica los nodos de las convergencias', sinDobleConteo);

Arbol.Layout.limpiarCache();
const nodoRaiz = grafo.nodos.get(grafo.raices[0]);
const bandaRaiz = Arbol.Layout.componer(nodoRaiz, null,
  { datos, descendientes: debajo }).partes.filter((p) => p.k === 'banda')[0];
comprobar('la banda de la tarjeta lleva el conteo para dibujarlo a la derecha',
  bandaRaiz.conteo === '↓ ' + debajo.get(nodoRaiz.id), String(bandaRaiz.conteo));
Arbol.Layout.limpiarCache();
const idBase = Array.from(grafo.nodos.keys()).filter((id) => id.charAt(0) === 'B')[0];
const tipoBase = Arbol.Layout.componer(grafo.nodos.get(idBase), null,
  { datos, descendientes: debajo }).partes.filter((p) => p.k === 'tipo')[0];
comprobar('la postura de varios ejes también lo lleva en su fila de tipo',
  tipoBase.conteo === '↓ ' + debajo.get(idBase), String(tipoBase.conteo));
Arbol.Layout.limpiarCache();
const hojaId = hojas.find((id) => grafo.nodos.get(id).postura);
const partesHoja = Arbol.Layout.componer(grafo.nodos.get(hojaId), null,
  { datos, descendientes: debajo }).partes;
comprobar('una hoja no muestra ningún conteo',
  partesHoja.every((p) => !p.conteo));
Arbol.Layout.limpiarCache();

console.log('\n== Peso de cada respuesta ==');
const pesos = Arbol.pesoDeRespuestas(grafo);
const aristasRespuesta = Array.from(grafo.aristas.values())
  .filter((arista) => arista.tipo === 'respuesta');
comprobar('cada respuesta del árbol tiene su peso',
  Object.keys(pesos).length === aristasRespuesta.length,
  Object.keys(pesos).length + ' de ' + aristasRespuesta.length);
comprobar('el peso incluye el nodo destino y todo lo que cuelga de él',
  aristasRespuesta.every((arista) => pesos[arista.preguntaId + ':' + arista.clave]
    === 1 + debajo.get(arista.hasta)));
// El nodo no cuenta dos veces lo que comparten sus ramas; los pesos sí, cada
// uno por su lado, así que nunca pueden sumar menos que el conteo del padre.
let pesosCoherentes = true;
grafo.nodos.forEach((nodo, id) => {
  const salidas = nodo.salidas.filter((arista) => arista.tipo === 'respuesta');
  if (!salidas.length) return;
  const suma = salidas.reduce(
    (n, arista) => n + pesos[arista.preguntaId + ':' + arista.clave], 0);
  if (suma < debajo.get(id)) pesosCoherentes = false;
});
comprobar('los pesos hermanos nunca suman menos que el conteo de su nodo', pesosCoherentes);

Arbol.Layout.limpiarCache();
const contextoBotones = { datos, descendientes: debajo, pesosRespuesta: pesos };
const botonesRaiz = Arbol.Layout.componer(nodoRaiz, null, contextoBotones)
  .partes.filter((p) => p.k === 'botones')[0];
const listaBotones = botonesRaiz.filas.reduce((todos, fila) => todos.concat(fila), []);
console.log('  ' + listaBotones.map((b) => b.texto + ' ' + b.conteo
  + (b.densa ? ' (más poblada)' : '')).join(' · '));
comprobar('cada botón anuncia los nodos que abre',
  listaBotones.length === 2 && listaBotones.every(
    (boton) => boton.conteo === '↓ ' + pesos['Q1:' + boton.clave]));
comprobar('el botón reserva sitio para su conteo',
  listaBotones.every((boton) => boton.anchoConteo > 0
    && boton.ancho > boton.anchoConteo + 26));
comprobar('solo la rama más poblada queda marcada',
  listaBotones.filter((boton) => boton.densa).length === 1
  && listaBotones.filter((boton) => boton.densa)[0].peso
    === Math.max.apply(null, listaBotones.map((boton) => boton.peso)));
// Sin empates que valgan: si dos ramas pesan igual, ninguna se distingue.
const preguntaEmpate = JSON.parse(JSON.stringify(datos));
const respuestasQ1 = preguntaEmpate.questions.Q1.answers;
const empateGrafo = Arbol.construirGrafo(preguntaEmpate);
const pesosEmpate = Arbol.pesoDeRespuestas(empateGrafo);
pesosEmpate['Q1:' + respuestasQ1[0].key] = pesosEmpate['Q1:' + respuestasQ1[1].key];
Arbol.Layout.limpiarCache();
const botonesEmpate = Arbol.Layout.componer(
  empateGrafo.nodos.get(empateGrafo.raices[0]), null,
  { datos: preguntaEmpate, descendientes: Arbol.descendientesPorNodo(empateGrafo),
    pesosRespuesta: pesosEmpate }
).partes.filter((p) => p.k === 'botones')[0];
comprobar('un empate no destaca ninguna rama',
  botonesEmpate.filas[0].every((boton) => !boton.densa));
Arbol.Layout.limpiarCache();

console.log('\n== Búsqueda inversa por tradición ==');
const tradiciones = Arbol.Busqueda.listaTradiciones(datos);
comprobar('el panel lista tantas tradiciones como el índice de los datos',
  tradiciones.length === Object.keys(datos.traditions_index).length,
  tradiciones.length + ' vs ' + Object.keys(datos.traditions_index).length);
tradiciones.forEach((tradicion) => {
  const resolucion = Arbol.Busqueda.resolver(grafo, datos, tradicion);
  const preguntas = Object.keys(resolucion.respuestas).length;
  console.log('  ' + tradicion.nombre.padEnd(38)
    + ' camino: ' + String(resolucion.nodos.size).padStart(3) + ' nodos, '
    + String(preguntas).padStart(2) + ' respuestas'
    + (tradicion.tentativa ? ' · tentativa' : '')
    + (resolucion.aristasTentativas.size ? ' · ' + resolucion.aristasTentativas.size
      + ' arista(s) punteada(s)' : ''));
  comprobar('  «' + tradicion.nombre + '» alcanza la raíz desde la postura',
    resolucion.nodos.has(grafo.raices[0]) && resolucion.sinCamino.length === 0,
    resolucion.sinCamino.join(','));
});

const sud = tradiciones.find((t) => t.nombre === 'SUD');
const resolucionSUD = Arbol.Busqueda.resolver(grafo, datos, sud);
comprobar('la adhesión tentativa marca su arista de llegada',
  resolucionSUD.aristasTentativas.size > 0);

const islam = tradiciones.find((t) => t.nombre.startsWith('Islam Sun'));
comprobar('los sinónimos con «/» generan alias de búsqueda',
  islam.alias.length === 2 && islam.alias.includes('Islam Chiita'), islam.alias.join(' | '));
comprobar('la búsqueda sin acentos encuentra la tradición',
  Arbol.Busqueda.filtrar(tradiciones, 'judaismo rabinico').length === 1);

console.log('\n== Herencia causal ascendente ==');
const diotelitismo = tradiciones.find((t) => t.nombre === 'Ortodoxia calcedonense');
const caminoDiotelitismo = Arbol.Busqueda.resolver(grafo, datos, diotelitismo);
comprobar('la ortodoxia calcedonense hereda toda la cadena hasta la raíz',
  caminoDiotelitismo.respuestas.Q1 === 'A' && Object.keys(caminoDiotelitismo.respuestas).length >= 10,
  Object.keys(caminoDiotelitismo.respuestas).length + ' respuestas heredadas');

console.log('\n== Razonar y comparar ==');
const sujetos = [
  tradiciones.find((t) => t.nombre.startsWith('Islam Sun')),
  tradiciones.find((t) => t.nombre === 'Ortodoxia calcedonense')
];
const resoluciones = sujetos.map((s) => Arbol.Busqueda.resolver(grafo, datos, s));
const lista = Arbol.Busqueda.construirLista(grafo, datos, resoluciones, 0);
const planas = Arbol.Busqueda.preguntasUnicas(lista);
const consenso = planas.filter((e) => e.acuerdo === 'consenso').length;
const divergencia = planas.filter((e) => e.acuerdo === 'divergencia').length;
console.log('  preguntas en la lista:', planas.length,
  '· consenso:', consenso, '· divergencia:', divergencia);
comprobar('la lista comparativa detecta consensos y divergencias',
  consenso > 0 && divergencia > 0);
comprobar('cada pregunta aparece una sola vez en la comparación',
  new Set(planas.map((e) => e.preguntaId)).size === planas.length);

// Antes del punto de convergencia «Teísmo & Deísmo» ambas ramas llevan a la
// misma pregunta: la comparación debe declararlo en vez de elegir una.
const previaConvergencia = planas.find((e) => e.preguntaId === 'Q2');
comprobar('una pregunta previa a una convergencia muestra ambas respuestas',
  previaConvergencia.respuestas.every((r) => r.ambigua && r.etiqueta.indexOf('/') !== -1),
  JSON.stringify(previaConvergencia.respuestas.map((r) => r.etiqueta)));
comprobar('dos sujetos con el mismo par de ramas siguen en consenso',
  previaConvergencia.acuerdo === 'consenso', previaConvergencia.acuerdo);

const csv = Arbol.Busqueda.aCSV(lista, sujetos);
// 5 columnas fijas + una por sujeto + la columna «Acuerdo».
comprobar('el CSV lleva una columna por sujeto',
  csv.split('\r\n')[0].split('","').length === 5 + sujetos.length + 1,
  csv.split('\r\n')[0]);
comprobar('el CSV tiene una fila por pregunta única',
  csv.trim().split('\r\n').length === planas.length + 1);
comprobar('el JSON exportado es válido',
  !!JSON.parse(Arbol.Busqueda.aJSON(lista, sujetos, datos)).recorrido);

console.log('\n== Lista de posturas del panel ==');
const sueltas = Arbol.Busqueda.listaPosturasSueltas(datos, grafo);
console.log('  ' + sueltas.length + ' posturas nombradas con respuestas asignadas');
// Ya no quedan fuera de la lista: son buscables y seleccionables. Lo que las
// mantiene ocultas es `visiblesEnPanel`, que solo las deja pasar cuando el
// usuario busca algo o las tiene marcadas.
comprobar('las posturas sin nombre entran en la lista para poder buscarlas',
  sueltas.some((p) => p.sinNombre));
comprobar('pero el panel no las enseña mientras no se busque nada',
  Arbol.Busqueda.visiblesEnPanel(sueltas, '', []).every((p) => !p.sinNombre));
comprobar('las posturas afiliadas también se pueden elegir una por una',
  sueltas.some((p) => (datos.postures[p.posturaIds[0]].traditions || []).length > 0),
  'ninguna postura con tradición llegó a la lista');
comprobar('ninguna postura aparece dos veces',
  new Set(sueltas.map((p) => p.posturaIds[0])).size === sueltas.length);
comprobar('las tradiciones salen en orden alfabético',
  tradiciones.map((t) => t.nombre).join('|')
  === tradiciones.map((t) => t.nombre).slice().sort((a, b) => a.localeCompare(b, 'es')).join('|'),
  tradiciones.map((t) => t.nombre).join(' | '));

console.log('\n== Varias tradiciones por una misma postura ==');
// El documento todavía no tiene ninguna, así que se fabrica el caso: seis
// tradiciones sobre una misma postura, una de ellas ya existente y otra
// tentativa. La postura se elige del dataset —hoja, alcanzable y sin
// religiones propias— porque la que estaba fija aquí dejó de serlo: al ganar
// una pregunta pasó a dibujarse como tarjeta unificada, que muestra los
// distintivos como puntos en la banda y no como chips.
const modeloVarias = JSON.parse(JSON.stringify(datos));
const pidVarias = Object.keys(datos.postures).filter((pid) => {
  const p = datos.postures[pid];
  return !(p.traditions || []).length && !(p.question_axes || []).length
    && Object.keys(datos.questions).some((qid) =>
      (datos.questions[qid].answers || []).some((r) => r.target_posture_id === pid));
})[0];
comprobar('hay una postura hoja sin religiones para fabricar el caso',
  !!pidVarias, String(pidVarias));
// «La que ya existía» se toma del dataset vigente en vez de nombrarla a mano:
// el documento renombra tradiciones cada tanto (Catolicismo → Catolicismo
// Moderno/Ortodoxo) y la prueba se quedaba comprobando un nombre fantasma.
const trExistente = Object.keys(datos.traditions_index).find((nombre) =>
  datos.traditions_index[nombre].posture_ids.length === 1
  && datos.traditions_index[nombre].posture_ids[0] !== pidVarias);
const pidPrevio = datos.traditions_index[trExistente].posture_ids[0];
comprobar('hay una tradición previa, de una sola postura, para la prueba',
  !!trExistente && !!pidPrevio, trExistente + ' → ' + pidPrevio);

const NUEVAS = [trExistente, 'Luteranismo', 'Anglicanismo', 'Metodismo', 'Presbiterianismo'];
modeloVarias.postures[pidVarias].traditions = [
  { name: 'Ortodoxia calcedonense', is_tentative: false, is_note: false, aliases: [] },
  { name: trExistente, is_tentative: false, is_note: false, aliases: [] },
  { name: 'Luteranismo', is_tentative: false, is_note: false, aliases: ['Iglesia luterana'] },
  { name: 'Anglicanismo', is_tentative: true, is_note: false, aliases: [] },
  { name: 'Metodismo', is_tentative: false, is_note: false, aliases: [] },
  { name: 'Presbiterianismo', is_tentative: false, is_note: false, aliases: [] }
];
const conVarias = Arbol.Edits.aplicar(modeloVarias, Arbol.Edits.vacio());
const indiceVarias = conVarias.traditions_index;
comprobar('todas las tradiciones de la postura entran en el índice',
  NUEVAS.every((n) => indiceVarias[n] && indiceVarias[n].posture_ids.indexOf(pidVarias) !== -1),
  NUEVAS.filter((n) => !indiceVarias[n]).join(', '));
comprobar('una tradición que ya existía suma la postura nueva sin perder las viejas',
  indiceVarias[trExistente].posture_ids.length === 2
  && indiceVarias[trExistente].posture_ids.indexOf(pidPrevio) !== -1,
  indiceVarias[trExistente].posture_ids.join(','));
comprobar('basta una adhesión firme para que la tradición no sea tentativa',
  indiceVarias[trExistente].tentative === false,
  trExistente + ' salió tentative=' + indiceVarias[trExistente].tentative);
comprobar('una tradición con todas sus adhesiones tentativas sí lo es',
  indiceVarias.Anglicanismo.tentative === true && indiceVarias.SUD.tentative === true);
comprobar('los alias de la adhesión llegan al índice',
  indiceVarias.Luteranismo.aliases.indexOf('Iglesia luterana') !== -1,
  indiceVarias.Luteranismo.aliases.join(','));

const grafoVarias = Arbol.construirGrafo(conVarias);
const tradsVarias = Arbol.Busqueda.listaTradiciones(conVarias);
comprobar('el panel lista el índice completo, con las tradiciones nuevas incluidas',
  tradsVarias.length === Object.keys(indiceVarias).length
  && NUEVAS.every((n) => tradsVarias.some((t) => t.nombre === n)),
  tradsVarias.length + ' vs ' + Object.keys(indiceVarias).length);
const compartida = tradsVarias.find((t) => t.nombre === trExistente);
const caminoCompartida = Arbol.Busqueda.resolver(grafoVarias, conVarias, compartida);
comprobar('una tradición con dos posturas en ramas distintas resuelve ambas',
  caminoCompartida.nodos.has(grafoVarias.idDePostura(pidPrevio))
  && caminoCompartida.nodos.has(grafoVarias.idDePostura(pidVarias))
  && caminoCompartida.sinCamino.length === 0,
  caminoCompartida.sinCamino.join(','));
comprobar('la postura compartida sigue apareciendo una sola vez en la lista',
  Arbol.Busqueda.listaPosturasSueltas(conVarias, grafoVarias)
    .filter((p) => p.posturaIds[0] === pidVarias).length === 1);

comprobar('el reparto de marcas deja un «+N» cuando no caben todas',
  Arbol.Layout.marcasTradicion(6).puntos === 3 && Arbol.Layout.marcasTradicion(6).resto === 3
  && Arbol.Layout.marcasTradicion(4).resto === 0,
  JSON.stringify(Arbol.Layout.marcasTradicion(6)));

Arbol.Layout.limpiarCache();
const nodoVariasAntes = grafo.nodos.get(grafo.idDePostura(pidVarias));
const altoUna = Arbol.Layout.componer(nodoVariasAntes, null, { datos }).alto;
Arbol.Layout.limpiarCache();
const nodoVarias = grafoVarias.nodos.get(grafoVarias.idDePostura(pidVarias));
const compuestoVarias = Arbol.Layout.componer(nodoVarias, null, { datos: conVarias });
const chipsVarias = compuestoVarias.partes.filter((p) => p.k === 'chips')[0];
// Lo que importa es que no se descarte ninguno; que además crezca depende de
// si la tarjeta ya tenía holgura (cuando lleva pregunta integrada, la tiene).
comprobar('el nodo muestra los seis distintivos, sin descartar ninguno',
  compuestoVarias.alto >= altoUna && isFinite(compuestoVarias.alto)
  && chipsVarias && chipsVarias.filas.reduce((n, fila) => n + fila.length, 0) === 6,
  'alto ' + altoUna + ' → ' + compuestoVarias.alto + ', chips '
  + (chipsVarias ? chipsVarias.filas.reduce((n, fila) => n + fila.length, 0) : 'sin chips'));
Arbol.Layout.limpiarCache();

console.log('\n== Persistencia ==');
Arbol.Estado.datos = datos;
Arbol.Estado.grafo = grafo;
Arbol.Estado.respuestas = { Q1: 'A', Q2: 'B' };
Arbol.Estado.resaltados = new Set(['T:P1']);
Arbol.Estado.fijados = { 'T:P1': { x: 10, y: 20 } };
Arbol.Estado.guardar();
Arbol.Estado.respuestas = {};
Arbol.Estado.resaltados = new Set();
Arbol.Estado.fijados = {};
Arbol.Estado.cargar();
comprobar('respuestas, resaltados y anclajes vuelven de localStorage',
  Arbol.Estado.respuestas.Q2 === 'B' && Arbol.Estado.resaltados.has('T:P1')
  && Arbol.Estado.fijados['T:P1'].x === 10);

Arbol.Estado.respuestas.QINEXISTENTE = 'A';
Arbol.Estado.resaltados.add('T:PNOEXISTE');
Arbol.Estado.sanear();
comprobar('sanear descarta referencias que ya no existen en el JSON',
  !Arbol.Estado.respuestas.QINEXISTENTE && !Arbol.Estado.resaltados.has('T:PNOEXISTE'));

console.log('\n== Papelera: poda y reversión al estado 1 ==');
Arbol.Estado.datos = datos;
Arbol.Estado.grafo = grafo;
Arbol.Estado.modo = 'libre';
Arbol.Estado.arbolCompleto = false;
// Explícito: en «limpio» la rama no elegida se oculta, así que heredar el
// recorrido que dejara un bloque anterior hacía fallar la prueba sin que el
// código tuviera nada que ver.
Arbol.Estado.divulgacion = 'indagatorio';
Arbol.Estado.respuestas = { Q1: 'A', Q2: 'B', Q3: 'B', Q4: 'B', Q5: 'A' };
// El nodo profundo se deriva del árbol: cuelga de la respuesta elegida en Q4,
// que a su vez cuelga de Q3, la pregunta que se poda más abajo.
const nodoProfundo = grafo.idDePostura(
  datos.questions.Q4.answers.filter((r) => r.key === 'B')[0].target_posture_id);
Arbol.Estado.resaltados = new Set([nodoProfundo]);
Arbol.Estado.fijados = {};
Arbol.Estado.fijados[nodoProfundo] = { x: 5, y: 5 };
Arbol.Estado.seleccionado = nodoProfundo;
Arbol.Estado._oyentes = [];

const antesDePodar = Arbol.Estado.visibles();
comprobar('el nodo profundo está visible antes de podar', antesDePodar.has(nodoProfundo),
  nodoProfundo);

Arbol.Estado.borrarRespuesta('Q3');
const trasPodar = Arbol.Estado.visibles();
comprobar('podar Q3 elimina su subárbol dependiente',
  !trasPodar.has(nodoProfundo) && !trasPodar.has('P:Q4'),
  trasPodar.size + ' nodos visibles');
comprobar('el nodo de la pregunta podada sobrevive como hoja sin responder',
  trasPodar.has('P:Q3') && Arbol.Estado.respuestas.Q3 === undefined);
comprobar('las respuestas anteriores a la poda no se tocan',
  Arbol.Estado.respuestas.Q1 === 'A' && Arbol.Estado.respuestas.Q2 === 'B');
comprobar('la poda arrastra también las respuestas del subárbol',
  Arbol.Estado.respuestas.Q4 === undefined && Arbol.Estado.respuestas.Q5 === undefined,
  Object.keys(Arbol.Estado.respuestas).join(','));

// Sin la cascada, volver a responder la misma pregunta resucitaba la rama
// entera con todas sus respuestas viejas intactas.
Arbol.Estado.respuestas.Q3 = 'B';
const trasReResponder = Arbol.Estado.visibles();
comprobar('al volver a responder, la rama no revive expandida',
  !trasReResponder.has(nodoProfundo), trasReResponder.size + ' nodos');
Arbol.Estado.respuestas.Q3 = 'A';
comprobar('responder la opción contraria tampoco revive la rama anterior',
  !Arbol.Estado.visibles().has(nodoProfundo));
delete Arbol.Estado.respuestas.Q3;
comprobar('los anclajes, resaltados y la selección de lo podado se limpian',
  !Arbol.Estado.fijados[nodoProfundo] && !Arbol.Estado.resaltados.has(nodoProfundo)
  && Arbol.Estado.seleccionado === null);

Arbol.Estado.respuestas = { Q1: 'A', Q2: 'B', Q3: 'B' };
Arbol.Estado.responder('Q1', 'B');
comprobar('cambiar Sí por No poda la rama de Sí',
  Arbol.Estado.respuestas.Q1 === 'B' && Arbol.Estado.respuestas.Q2 === undefined
  && Arbol.Estado.respuestas.Q3 === undefined,
  JSON.stringify(Arbol.Estado.respuestas));

console.log('\n== Exploración libre: expansión ==');
Arbol.Estado.datos = datos;
Arbol.Estado.grafo = grafo;
Arbol.Estado.respuestas = {};
Arbol.Estado.expandidos = new Set();
Arbol.Estado.divulgacion = 'completo';
Arbol.Estado.arbolCompleto = true;
Arbol.Estado._oyentes = [];
Arbol.Estado.fijarDivulgacion('exploracion');
const visDesdeCompleto = Arbol.Estado.visibles();
comprobar('pasar de árbol completo a exploración no abre todo el árbol',
  visDesdeCompleto.size < grafo.nodos.size,
  visDesdeCompleto.size + ' de ' + grafo.nodos.size + ' nodos');

const raizExp = grafo.raices[0];
Arbol.Estado.divulgacion = 'exploracion';
Arbol.Estado.expandidos = new Set();
Arbol.Estado.alternarExpandido(raizExp);
const hijoConSalida = grafo.nodos.get(raizExp).salidas
  .map((a) => a.hasta)
  .find((id) => grafo.nodos.get(id) && grafo.nodos.get(id).salidas.length);
comprobar('hay un hijo de la raíz con descendientes para la prueba', !!hijoConSalida);
if (hijoConSalida) {
  Arbol.Estado.alternarExpandido(hijoConSalida);
  const nieto = grafo.nodos.get(hijoConSalida).salidas[0].hasta;
  comprobar('expandir un hijo deja nietos a la vista',
    Arbol.Estado.visibles().has(nieto));
  comprobar('el hijo queda marcado como expandido',
    Arbol.Estado.expandidos.has(hijoConSalida));
  Arbol.Estado.alternarExpandido(raizExp);
  comprobar('ocultar la raíz olvida la expansión de las ramas inferiores',
    !Arbol.Estado.expandidos.has(hijoConSalida),
    Array.from(Arbol.Estado.expandidos).join(','));
  Arbol.Estado.alternarExpandido(raizExp);
  comprobar('volver a expandir la raíz reabre el subárbol que tenía antes de colapsar',
    Arbol.Estado.visibles().has(nieto)
    && Arbol.Estado.expandidos.has(hijoConSalida));

  // Estado limpio: alternarExpandidoTotal decide expandir-vs-colapsar según
  // si el nodo YA está expandido (Arbol.Estado.expandidos), y a esta altura
  // la raíz sigue expandida por la prueba anterior.
  Arbol.Estado.expandidos = new Set();
  Arbol.Estado.ramasGuardadas = {};
  Arbol.Estado.alternarExpandidoTotal(raizExp);
  comprobar('expandir todo revela el árbol completo desde la raíz',
    Arbol.Estado.visibles().size === grafo.nodos.size,
    Arbol.Estado.visibles().size + ' de ' + grafo.nodos.size);

  Arbol.Estado.alternarExpandido(hijoConSalida);
  comprobar('colapsar un nodo en medio de «expandir todo» guarda los descendientes que seguían abiertos',
    !!Arbol.Estado.ramasGuardadas[hijoConSalida]
    && Arbol.Estado.ramasGuardadas[hijoConSalida].indexOf(nieto) !== -1);

  Arbol.Estado.alternarExpandidoTotal(raizExp);
  comprobar('colapsar todo oculta el subárbol',
    Arbol.Estado.visibles().size === 1);
  comprobar('colapsar todo borra en cascada la memoria del botón normal de todo el subárbol',
    !Object.prototype.hasOwnProperty.call(Arbol.Estado.ramasGuardadas, hijoConSalida));

  Arbol.Estado.alternarExpandido(raizExp);
  var visTrasNivel = Arbol.Estado.visibles().size;
  Arbol.Estado.alternarExpandidoTotal(raizExp);
  comprobar('«todo» sobre un nodo ya expandido a mano (sin pasar por «todo» antes) colapsa, no expande más',
    visTrasNivel > 1 && Arbol.Estado.visibles().size === 1,
    'antes=' + visTrasNivel + ' después=' + Arbol.Estado.visibles().size);
}

console.log('\n== Rendimiento: layout con el grafo casi completo (edición, "expandir todo") ==');
{
  // Con controles (+ y nuevo eje) el grafo de edición triplica más o menos
  // el número de nodos y aristas de uno solo; es el escenario real detrás
  // del bug de 15+ segundos de `reducirCruces` recontando cruces globales
  // en cada intercambio candidato en vez de solo el cambio local.
  const grafoCtrl = Arbol.grafoConControles(grafo);
  const visCtrl = new Set();
  grafoCtrl.nodos.forEach((_, id) => visCtrl.add(id));
  const arCtrl = new Set();
  grafoCtrl.aristas.forEach((_, id) => arCtrl.add(id));
  const tamCtrl = new Map();
  visCtrl.forEach((id) => {
    const nodo = grafoCtrl.nodos.get(id);
    const c = Arbol.Layout.componer(nodo, null, { datos, divulgacion: 'completo', expandidos: new Set() });
    tamCtrl.set(id, { ancho: c.ancho, alto: c.alto });
  });
  const inicioLayout = Date.now();
  Arbol.Layout.calcular(grafoCtrl, visCtrl, arCtrl, tamCtrl, {});
  const duracionLayout = Date.now() - inicioLayout;
  comprobar('el layout de ' + visCtrl.size + ' nodos / ' + arCtrl.size
    + ' aristas termina en menos de 3s', duracionLayout < 3000, duracionLayout + 'ms');
}

function disposicionDeEstado() {
  const visE = Arbol.Estado.visibles();
  const arE = Arbol.Estado.aristasDe(visE);
  const tamE = new Map();
  visE.forEach((id) => {
    const nodo = grafo.nodos.get(id);
    const c = Arbol.Layout.componer(nodo, null, {
      datos, divulgacion: 'exploracion', expandidos: Arbol.Estado.expandidos
    });
    tamE.set(id, { ancho: c.ancho, alto: c.alto });
  });
  return { vis: visE, aristas: arE, disp: Arbol.Layout.calcular(grafo, visE, arE, tamE, {}) };
}

Arbol.Estado.divulgacion = 'exploracion';
Arbol.Estado.expandidos = new Set();
let solapesExp = 0;
let crucesExp = 0;
const colaExp = [raizExp];
const vistosExp = new Set();
while (colaExp.length) {
  const id = colaExp.shift();
  if (vistosExp.has(id)) continue;
  vistosExp.add(id);
  const nodo = grafo.nodos.get(id);
  if (!nodo || !nodo.salidas.length) continue;
  Arbol.Estado.expandidos.add(id);
  const paso = disposicionDeEstado();
  const cajasE = Array.from(paso.disp.values());
  for (let i = 0; i < cajasE.length; i++) {
    for (let j = i + 1; j < cajasE.length; j++) {
      const a = cajasE[i]; const b = cajasE[j];
      if (a.x < b.x + b.ancho && b.x < a.x + a.ancho
        && a.y < b.y + b.alto && b.y < a.y + a.alto) solapesExp += 1;
    }
  }
  crucesExp += contarCrucesLayout(grafo, paso.aristas, paso.disp);
  nodo.salidas.forEach((a) => colaExp.push(a.hasta));
}
comprobar('expandir rama a rama no solapa nodos', solapesExp === 0, solapesExp + ' solapes');
// Misma deuda de layout que arriba (ver TECHO_CRUCES_COMPLETO).
const TECHO_CRUCES_EXPANDIR = 6;
comprobar('expandir rama a rama no empeora los cruces conocidos (deuda: '
  + TECHO_CRUCES_EXPANDIR + ')',
  crucesExp <= TECHO_CRUCES_EXPANDIR, crucesExp + ' cruces');

Arbol.Estado.divulgacion = 'indagatorio';
Arbol.Estado.arbolCompleto = false;
Arbol.Estado.expandidos = new Set();
Arbol.Estado._oyentes = [];

console.log('\n== Contribuciones locales ==');
const edits = Arbol.Edits.vacio();
Arbol.Edits.nombrarPostura(edits, 'P8', 'Socinianismo nombrado');
const mezclado = Arbol.Edits.aplicar(datos, edits);
comprobar('renombrar una postura no toca el JSON canónico',
  datos.postures.P8.label !== 'Socinianismo nombrado'
  && mezclado.postures.P8.label === 'Socinianismo nombrado');
const md = Arbol.Edits.aMarkdown(datos);
comprobar('el export Markdown arranca como el documento fuente',
  md.indexOf('## Árbol de Decisión:') !== -1 && md.indexOf('Creacionismo') !== -1);
comprobar('el export conserva el wikilink de la pregunta raíz',
  md.indexOf('¿El universo fue causado por un Creador? { [[La inexistencia de un Dios creador]] }') !== -1);
comprobar('el wikilink de La Perdida de la Salvación queda en la pregunta',
  md.indexOf('¿El volver a pecar después de esa conversión remueve del humano el derecho a entrar al cielo? { [[La Perdida de la Salvación]] }') !== -1);
const idxDeismo = md.indexOf('- No: Deísmo');
const idxTeismo = md.indexOf('- Sí: Teísmo');
const idxConvergencia = md.indexOf('Teísmo & Deísmo ->');
comprobar('Sí: Teísmo queda junto a Deísmo, no al final del archivo',
  idxDeismo !== -1 && idxTeismo !== -1 && idxTeismo - idxDeismo < 80,
  'delta=' + (idxTeismo - idxDeismo));
comprobar('la pregunta compartida cuelga de Teísmo, no de Deísmo',
  idxConvergencia !== -1 && idxTeismo !== -1 && idxConvergencia > idxTeismo
  && (idxDeismo === -1 || idxConvergencia > idxTeismo),
  String(idxConvergencia));
// La postura de muestra se busca en el dataset (con religiones, con eje propio
// y sin wikilink que sustituya su nombre) en vez de nombrarla: la que estaba
// fija aquí se renombró en el documento y la prueba se quedó comprobando un
// nombre que ya no existía.
const pidConReligion = Object.keys(datos.postures).filter((pid) => {
  const p = datos.postures[pid];
  return (p.traditions || []).length && (p.question_axes || []).length
    && !(p.wikilinks || []).length
    && Object.keys(datos.questions).some((qid) =>
      (datos.questions[qid].answers || []).some((r) => r.target_posture_id === pid));
})[0];
const pConReligion = datos.postures[pidConReligion];
const gruposConReligion = (pConReligion.traditions || [])
  .map((t) => t.name + (t.is_tentative ? '?' : '')).join(', ');
comprobar('hay una postura con religiones y eje propio para la prueba',
  !!pidConReligion, pidConReligion + ' → ' + pConReligion.label);
comprobar('el origen de una pregunta no repite las religiones de la postura',
  md.indexOf(pConReligion.label + ' -> ') !== -1
  && md.indexOf(pConReligion.label + ' {' + gruposConReligion + '} ->') === -1,
  pConReligion.label);
comprobar('las religiones sí aparecen al introducir la postura',
  md.indexOf(': ' + pConReligion.label + ' {' + gruposConReligion + '}') !== -1,
  pConReligion.label + ' {' + gruposConReligion + '}');
comprobar('el export no incluye el preámbulo del documento fuente',
  md.indexOf('## Sintaxis') === -1 && md.indexOf('## Propósito') === -1);
comprobar('el destino con wikilink usa la forma [[ruta|etiqueta]]',
  md.indexOf('[[diotelitismo#3-c-mo-operan-las-dos-voluntades-sin-entrar-en-conflicto|Diotelitismo]]') !== -1);
comprobar('el wikilink de destino no va en la línea origen',
  md.indexOf('[[diotelitismo#3-c-mo-operan-las-dos-voluntades-sin-entrar-en-conflicto|Diotelitismo]] ->') === -1);

Arbol.Edits.guardar(edits);
comprobar('guardar deja el borrador en localStorage',
  !!almacen.get('arbol-posturas/edits/v1'));
Arbol.Edits.olvidar();
comprobar('olvidar quita el borrador de localStorage',
  !almacen.has('arbol-posturas/edits/v1')
  && Arbol.Edits.cargar().ops.length === 0);

console.log('\n== URL compartible ==');
Arbol.Estado.respuestas = { Q1: 'A', Q2: 'B', Q5: 'A' };
Arbol.Estado.resaltados = new Set(['T:P1', 'P:Q3']);
Arbol.Estado.tradiciones = ['Islam Suní/Chiita', 'SUD'];
Arbol.Estado.posturasSueltas = ['P11'];
Arbol.Estado.fijados = { 'T:P1': { x: 12, y: 34 } };
Arbol.Estado.modo = 'explorador';
Arbol.Estado.vista = 'lista';
Arbol.Estado.tema = 'claro';
Arbol.Estado.arbolCompleto = true;
Arbol.Estado.camara = { x: -120, y: 44, k: 0.75 };

const url = Arbol.Router.enlace(Arbol.Estado);
console.log('  ' + url.replace('file:///index.html', '…'));
comprobar('la URL declara el modo manual cuando hay anclajes',
  url.indexOf('view=manual') !== -1);
comprobar('el enlace conserva el formato legible de la especificación',
  url.indexOf('path=Q1:A,Q2:B,Q5:A') !== -1 && url.indexOf('hl=T:P1,P:Q3') !== -1, url);

ventana.location.search = url.slice(url.indexOf('?'));
const destino = Object.assign(Object.create(Object.getPrototypeOf(Arbol.Estado)), {
  respuestas: {}, resaltados: new Set(), tradiciones: [], posturasSueltas: [],
  fijados: {}, modo: 'libre', vista: 'grafo', tema: 'oscuro', arbolCompleto: false,
  camara: { x: 0, y: 0, k: 1 }
});
Arbol.Router.aplicar(Arbol.Router.leer(), destino);
comprobar('las respuestas viajan íntegras', destino.respuestas.Q5 === 'A'
  && Object.keys(destino.respuestas).length === 3);
comprobar('los resaltados viajan íntegros',
  destino.resaltados.has('T:P1') && destino.resaltados.has('P:Q3'));
comprobar('los nombres con «/» y acentos sobreviven a la ida y vuelta',
  destino.tradiciones.indexOf('Islam Suní/Chiita') !== -1
  && destino.tradiciones.indexOf('SUD') !== -1, destino.tradiciones.join(' | '));
comprobar('las posturas elegidas una por una viajan', destino.posturasSueltas[0] === 'P11');
comprobar('modo, vista, tema y árbol completo viajan',
  destino.modo === 'explorador' && destino.vista === 'lista'
  && destino.tema === 'claro' && destino.arbolCompleto === true);
comprobar('la cámara viaja con la vista exacta',
  destino.camara.x === -120 && destino.camara.y === 44 && destino.camara.k === 0.75,
  JSON.stringify(destino.camara));

ventana.location.search = '';

console.log('\n== Edición: preguntas separadas y huérfanos ==');
const grafoEdicion = Arbol.construirGrafo(datos, { separarSiempre: true });
let tarjetasConPregunta = 0;
let ejesSueltos = 0;
grafoEdicion.nodos.forEach((n) => {
  if (n.tipo === 'tarjeta' && n.pregunta) tarjetasConPregunta++;
  if (n.tipo === 'pregunta') ejesSueltos++;
});
comprobar('en edición no hay tarjetas unificadas postura+eje', tarjetasConPregunta === 0,
  String(tarjetasConPregunta));
comprobar('en edición cada eje es un nodo suelto', ejesSueltos === Object.keys(datos.questions).length,
  ejesSueltos + ' vs ' + Object.keys(datos.questions).length);
comprobar('sin la opción, la raíz unificada se conserva',
  Arbol.construirGrafo(datos).raices[0] === 'T:PR1');

const Edits = Arbol.Edits;
comprobar('postura innominada sin datos está vacía',
  Edits.posturaCompletamenteVacia({ is_unnamed: true, label: '?', traditions: [], notes: [], question_axes: [] }));
comprobar('postura con nombre no está vacía',
  !Edits.posturaCompletamenteVacia({ is_unnamed: false, label: 'Teísmo', traditions: [], notes: [], question_axes: [] }));
comprobar('eje sin texto ni respuestas está vacío',
  Edits.preguntaCompletamenteVacia({ formal_text: '', colloquial_hint: '', answers: [] }));
comprobar('eje con respuesta no está vacío',
  !Edits.preguntaCompletamenteVacia({ formal_text: '', answers: [{ key: 'A' }] }));

const mini = {
  root_postures: ['P1'],
  postures: {
    P1: { id: 'P1', label: 'Raíz', is_unnamed: false, question_axes: ['Q1'], traditions: [], notes: [] },
    P2: { id: 'P2', label: '?', is_unnamed: true, question_axes: [], traditions: [], notes: [] }
  },
  questions: {
    Q1: {
      id: 'Q1', formal_text: '¿Hay Dios?', colloquial_hint: '', origin_posture_ids: ['P1'],
      answers: [{ key: 'A', label: 'Sí', target_posture_id: 'P2', gloss: null }]
    }
  }
};
comprobar('P2 quedaría huérfana al quitar su única entrada',
  Edits.quedariaHuerfanaPostura(mini, 'P2', { questionId: 'Q1', key: 'A' }));
const editsMini = Edits.vacio();
Edits.desconectarRespuesta(editsMini, 'Q1', 'A');
const trasQuitar = Edits.aplicar(mini, editsMini);
comprobar('desconectar la respuesta deja a Q1 sin answers',
  (trasQuitar.questions.Q1.answers || []).length === 0);
comprobar('la postura huérfana sigue en los datos hasta que se borre', !!trasQuitar.postures.P2);

console.log('\n== Edición: campos hermanos no se pisan ==');
const qidTexto = Object.keys(datos.questions)[0];
const pidTexto = Object.keys(datos.postures)[0];
const editsCoal = Edits.vacio();
Edits.fijarPregunta(editsCoal, qidTexto, undefined, 'a');
Edits.fijarPregunta(editsCoal, qidTexto, undefined, 'ab');
comprobar('teclas seguidas en el mismo campo se coalescen',
  editsCoal.ops.length === 1 && editsCoal.ops[0].colloquial === 'ab',
  JSON.stringify(editsCoal.ops));

const editsTexto = Edits.vacio();
Edits.fijarPregunta(editsTexto, qidTexto, undefined, 'coloquial nueva');
Edits.fijarPregunta(editsTexto, qidTexto, 'formal nueva', undefined);
const aplicadoTexto = Edits.aplicar(datos, editsTexto);
comprobar('editar formal no borra la coloquial recién puesta',
  aplicadoTexto.questions[qidTexto].colloquial_hint === 'coloquial nueva'
  && aplicadoTexto.questions[qidTexto].formal_text === 'formal nueva',
  JSON.stringify({
    formal: aplicadoTexto.questions[qidTexto].formal_text,
    coloquial: aplicadoTexto.questions[qidTexto].colloquial_hint,
    ops: editsTexto.ops
  }));
Edits.fijarPregunta(editsTexto, qidTexto, undefined, 'coloquial otra');
const aplicado2 = Edits.aplicar(datos, editsTexto);
comprobar('editar coloquial no borra la formal recién puesta',
  aplicado2.questions[qidTexto].formal_text === 'formal nueva'
  && aplicado2.questions[qidTexto].colloquial_hint === 'coloquial otra',
  JSON.stringify({
    formal: aplicado2.questions[qidTexto].formal_text,
    coloquial: aplicado2.questions[qidTexto].colloquial_hint
  }));

const editsPostura = Edits.vacio();
Edits.nombrarPostura(editsPostura, pidTexto, 'Nombre nuevo');
Edits.fijarMetaPostura(editsPostura, pidTexto, 'traditions', 'Catolicismo');
Edits.fijarMetaPostura(editsPostura, pidTexto, 'notes', 'una nota');
Edits.fijarMetaPostura(editsPostura, pidTexto, 'wikilinks', '[[Wiki]]');
Edits.fijarMetaPostura(editsPostura, pidTexto, 'notes', 'nota corregida');
const aplicadoPostura = Edits.aplicar(datos, editsPostura);
const metaP = aplicadoPostura.postures[pidTexto];
comprobar('nombre, religiones, notas y enlaces de una postura conviven',
  metaP.label === 'Nombre nuevo'
  && (metaP.traditions || []).some((t) => t.name === 'Catolicismo')
  && (metaP.notes || []).indexOf('nota corregida') !== -1
  && (metaP.wikilinks || []).length > 0,
  JSON.stringify({
    label: metaP.label,
    traditions: metaP.traditions,
    notes: metaP.notes,
    wikilinks: metaP.wikilinks,
    ops: editsPostura.ops
  }));

const qConRespuesta = Object.keys(datos.questions).find((id) =>
  (datos.questions[id].answers || []).length > 0);
const claveA = datos.questions[qConRespuesta].answers[0].key;
const editsArista = Edits.vacio();
Edits.fijarRespuesta(editsArista, qConRespuesta, claveA, 'Sí', 'glosa inicial');
Edits.fijarRespuesta(editsArista, qConRespuesta, claveA, 'No', undefined);
const aplicadoArista = Edits.aplicar(datos, editsArista);
const respA = aplicadoArista.questions[qConRespuesta].answers.find((r) => r.key === claveA);
comprobar('cambiar la etiqueta de una arista no borra la glosa',
  respA && respA.label === 'No' && respA.gloss === 'glosa inicial',
  JSON.stringify(respA));
Edits.fijarRespuesta(editsArista, qConRespuesta, claveA, undefined, 'glosa nueva');
const aplicadoArista2 = Edits.aplicar(datos, editsArista);
const respA2 = aplicadoArista2.questions[qConRespuesta].answers.find((r) => r.key === claveA);
comprobar('cambiar la glosa no borra la etiqueta de la arista',
  respA2 && respA2.label === 'No' && respA2.gloss === 'glosa nueva',
  JSON.stringify(respA2));

console.log('\n== Convergencias: attachAxis/removeAxis/rewireAxis (specs/convergencias.md) ==');
const qConvergente = 'Q3';
const origenesQ3 = (datos.questions[qConvergente].origin_posture_ids || []).slice();
comprobar('Q3 ya converge con dos posturas en el documento fuente',
  origenesQ3.length === 2, origenesQ3.join(','));

const posturaExtra = Object.keys(datos.postures).find((pid) =>
  origenesQ3.indexOf(pid) === -1 && !Edits.seriaCicloEje(datos, pid, qConvergente));
comprobar('se encontró una tercera postura sin ciclo para converger con Q3',
  !!posturaExtra, String(posturaExtra));

const editsConv = Edits.vacio();
Edits.ligarEje(editsConv, qConvergente, posturaExtra);
const trasLigar = Edits.aplicar(datos, editsConv);
comprobar('attachAxis suma un tercer origen sin quitar los dos que ya había',
  trasLigar.questions[qConvergente].origin_posture_ids.length === 3
  && trasLigar.questions[qConvergente].is_convergence === true,
  trasLigar.questions[qConvergente].origin_posture_ids.join(','));
comprobar('attachAxis se refleja en question_axes de la postura nueva',
  (trasLigar.postures[posturaExtra].question_axes || []).indexOf(qConvergente) !== -1);

const grafoTrasLigar = Arbol.construirGrafo(trasLigar, { separarSiempre: true });
const nodoQ3 = grafoTrasLigar.nodos.get('P:' + qConvergente);
comprobar('el grafo dibuja una arista eje por cada origen, entrando al mismo nodo pregunta',
  !!nodoQ3 && nodoQ3.entradas.filter((a) => a.tipo === 'eje').length === 3,
  nodoQ3 ? nodoQ3.entradas.length : 'sin nodo');

Edits.ligarEje(editsConv, qConvergente, posturaExtra);
const trasLigarOtraVez = Edits.aplicar(datos, editsConv);
comprobar('attachAxis repetido sobre el mismo origen no duplica (R5, copiar sobre un origen existente)',
  trasLigarOtraVez.questions[qConvergente].origin_posture_ids.length === 3);

const editsQuitarUno = Edits.vacio();
Edits.ligarEje(editsQuitarUno, qConvergente, posturaExtra);
Edits.desconectarEje(editsQuitarUno, qConvergente, posturaExtra);
const trasQuitarUno = Edits.aplicar(datos, editsQuitarUno);
comprobar('removeAxis quita solo la unión indicada y deja las otras dos intactas (R4/R6)',
  trasQuitarUno.questions[qConvergente].origin_posture_ids.length === 2
  && trasQuitarUno.questions[qConvergente].origin_posture_ids.indexOf(origenesQ3[0]) !== -1
  && trasQuitarUno.questions[qConvergente].origin_posture_ids.indexOf(origenesQ3[1]) !== -1,
  trasQuitarUno.questions[qConvergente].origin_posture_ids.join(','));

const editsFusion = Edits.vacio();
Edits.reengancharEje(editsFusion, qConvergente, origenesQ3[0], { toPostureId: origenesQ3[1] });
const trasFusion = Edits.aplicar(datos, editsFusion);
comprobar('rewireAxis hacia un origen ya existente funde las dos uniones en una (R5, mover)',
  trasFusion.questions[qConvergente].origin_posture_ids.length === 1
  && trasFusion.questions[qConvergente].origin_posture_ids[0] === origenesQ3[1]
  && trasFusion.questions[qConvergente].is_convergence === false,
  trasFusion.questions[qConvergente].origin_posture_ids.join(','));

comprobar('seriaCicloEje detecta que una postura descendiente de Q1 no puede ser su propio origen',
  Edits.seriaCicloEje(datos, 'P1', 'Q1') === true);
const editsCiclo = Edits.vacio();
Edits.ligarEje(editsCiclo, 'Q1', 'P1');
const trasCiclo = Edits.aplicar(datos, editsCiclo);
comprobar('attachAxis no aplica una unión que crearía un ciclo',
  (trasCiclo.questions.Q1.origin_posture_ids || []).indexOf('P1') === -1);

comprobar('grupoConvergenciaDeSeleccion agrupa la pregunta y sus posturas de origen',
  (() => {
    const g = Arbol.grupoConvergenciaDeSeleccion(grafoTrasLigar, trasLigar, 'P:' + qConvergente);
    if (!g) return false;
    const esperados = trasLigar.questions[qConvergente].origin_posture_ids
      .map((pid) => grafoTrasLigar.idDePostura(pid));
    return esperados.every((id) => g.nodos.has(id)) && g.nodos.has('P:' + qConvergente)
      && g.aristas.size === 3;
  })());
comprobar('grupoConvergenciaDeSeleccion devuelve null para una pregunta no convergente',
  Arbol.grupoConvergenciaDeSeleccion(grafoTrasLigar, trasLigar, 'P:Q1') === null);

console.log('\n' + (fallos.length
  ? fallos.length + ' comprobación(es) fallidas: ' + fallos.join(' | ')
  : 'Todas las comprobaciones pasaron.') + '\n');
process.exit(fallos.length ? 1 : 0);

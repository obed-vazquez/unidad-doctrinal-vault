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
    setItem: (k, v) => almacen.set(k, String(v))
  },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {}
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

['js/state.js', 'js/edits.js', 'js/layout.js', 'js/search.js', 'js/router.js'].forEach((archivo) => {
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
comprobar('dos nodos con varias aristas entrantes', convergentes.length === 2,
  convergentes.join(', '));
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
comprobar('Q1 revela las dos posturas destino, no solo la elegida',
  visibles.has('T:P1') && visibles.has('B:P98'), Array.from(visibles).join(','));
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
comprobar('siete tradiciones en el índice', tradiciones.length === 7, String(tradiciones.length));
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
comprobar('las posturas sin nombre quedan fuera de la lista',
  sueltas.every((p) => p.nombre !== '?'));
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
// tradiciones sobre P97, una de ellas ya existente (Catolicismo, que hoy solo
// sostiene P71 y con adhesión tentativa) y otra tentativa.
const modeloVarias = JSON.parse(JSON.stringify(datos));
const NUEVAS = ['Catolicismo', 'Luteranismo', 'Anglicanismo', 'Metodismo', 'Presbiterianismo'];
modeloVarias.postures.P97.traditions = [
  { name: 'Ortodoxia calcedonense', is_tentative: false, is_note: false, aliases: [] },
  { name: 'Catolicismo', is_tentative: false, is_note: false, aliases: [] },
  { name: 'Luteranismo', is_tentative: false, is_note: false, aliases: ['Iglesia luterana'] },
  { name: 'Anglicanismo', is_tentative: true, is_note: false, aliases: [] },
  { name: 'Metodismo', is_tentative: false, is_note: false, aliases: [] },
  { name: 'Presbiterianismo', is_tentative: false, is_note: false, aliases: [] }
];
const conVarias = Arbol.Edits.aplicar(modeloVarias, Arbol.Edits.vacio());
const indiceVarias = conVarias.traditions_index;
comprobar('todas las tradiciones de la postura entran en el índice',
  NUEVAS.every((n) => indiceVarias[n] && indiceVarias[n].posture_ids.indexOf('P97') !== -1),
  NUEVAS.filter((n) => !indiceVarias[n]).join(', '));
comprobar('una tradición que ya existía suma la postura nueva sin perder las viejas',
  indiceVarias.Catolicismo.posture_ids.length === 2
  && indiceVarias.Catolicismo.posture_ids.indexOf('P71') !== -1,
  indiceVarias.Catolicismo.posture_ids.join(','));
comprobar('basta una adhesión firme para que la tradición no sea tentativa',
  indiceVarias.Catolicismo.tentative === false,
  'Catolicismo salió tentative=' + indiceVarias.Catolicismo.tentative);
comprobar('una tradición con todas sus adhesiones tentativas sí lo es',
  indiceVarias.Anglicanismo.tentative === true && indiceVarias.SUD.tentative === true);
comprobar('los alias de la adhesión llegan al índice',
  indiceVarias.Luteranismo.aliases.indexOf('Iglesia luterana') !== -1,
  indiceVarias.Luteranismo.aliases.join(','));

const grafoVarias = Arbol.construirGrafo(conVarias);
const tradsVarias = Arbol.Busqueda.listaTradiciones(conVarias);
comprobar('el panel lista las once tradiciones resultantes', tradsVarias.length === 11,
  String(tradsVarias.length));
const catolicismo = tradsVarias.find((t) => t.nombre === 'Catolicismo');
const caminoCatolicismo = Arbol.Busqueda.resolver(grafoVarias, conVarias, catolicismo);
comprobar('una tradición con dos posturas en ramas distintas resuelve ambas',
  caminoCatolicismo.nodos.has(grafoVarias.idDePostura('P71'))
  && caminoCatolicismo.nodos.has(grafoVarias.idDePostura('P97'))
  && caminoCatolicismo.sinCamino.length === 0,
  caminoCatolicismo.sinCamino.join(','));
comprobar('la postura compartida sigue apareciendo una sola vez en la lista',
  Arbol.Busqueda.listaPosturasSueltas(conVarias, grafoVarias)
    .filter((p) => p.posturaIds[0] === 'P97').length === 1);

comprobar('el reparto de marcas deja un «+N» cuando no caben todas',
  Arbol.Layout.marcasTradicion(6).puntos === 3 && Arbol.Layout.marcasTradicion(6).resto === 3
  && Arbol.Layout.marcasTradicion(4).resto === 0,
  JSON.stringify(Arbol.Layout.marcasTradicion(6)));

Arbol.Layout.limpiarCache();
const nodoP97Antes = grafo.nodos.get(grafo.idDePostura('P97'));
const altoUna = Arbol.Layout.componer(nodoP97Antes, null, { datos }).alto;
Arbol.Layout.limpiarCache();
const nodoP97 = grafoVarias.nodos.get(grafoVarias.idDePostura('P97'));
const compuestoVarias = Arbol.Layout.componer(nodoP97, null, { datos: conVarias });
const chipsVarias = compuestoVarias.partes.filter((p) => p.k === 'chips')[0];
comprobar('el nodo crece para mostrar los seis distintivos, sin descartar ninguno',
  compuestoVarias.alto > altoUna && isFinite(compuestoVarias.alto)
  && chipsVarias && chipsVarias.filas.reduce((n, fila) => n + fila.length, 0) === 6,
  'alto ' + altoUna + ' → ' + compuestoVarias.alto);
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
Arbol.Estado.respuestas = { Q1: 'A', Q2: 'B', Q3: 'B', Q4: 'B', Q5: 'A' };
Arbol.Estado.resaltados = new Set(['T:P6']);
Arbol.Estado.fijados = { 'T:P6': { x: 5, y: 5 } };
Arbol.Estado.seleccionado = 'T:P6';
Arbol.Estado._oyentes = [];

const antesDePodar = Arbol.Estado.visibles();
comprobar('el nodo profundo está visible antes de podar', antesDePodar.has('T:P6'));

Arbol.Estado.borrarRespuesta('Q3');
const trasPodar = Arbol.Estado.visibles();
comprobar('podar Q3 elimina su subárbol dependiente',
  !trasPodar.has('T:P6') && !trasPodar.has('P:Q4'),
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
  !trasReResponder.has('T:P6'), trasReResponder.size + ' nodos');
Arbol.Estado.respuestas.Q3 = 'A';
comprobar('responder la opción contraria tampoco revive la rama anterior',
  !Arbol.Estado.visibles().has('T:P6'));
delete Arbol.Estado.respuestas.Q3;
comprobar('los anclajes, resaltados y la selección de lo podado se limpian',
  !Arbol.Estado.fijados['T:P6'] && !Arbol.Estado.resaltados.has('T:P6')
  && Arbol.Estado.seleccionado === null);

Arbol.Estado.respuestas = { Q1: 'A', Q2: 'B', Q3: 'B' };
Arbol.Estado.responder('Q1', 'B');
comprobar('cambiar Sí por No poda la rama de Sí',
  Arbol.Estado.respuestas.Q1 === 'B' && Arbol.Estado.respuestas.Q2 === undefined
  && Arbol.Estado.respuestas.Q3 === undefined,
  JSON.stringify(Arbol.Estado.respuestas));

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

console.log('\n' + (fallos.length
  ? fallos.length + ' comprobación(es) fallidas: ' + fallos.join(' | ')
  : 'Todas las comprobaciones pasaron.') + '\n');
process.exit(fallos.length ? 1 : 0);

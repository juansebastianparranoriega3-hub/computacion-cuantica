/* =====================================================================
   herramientas/generar-modelos.js
   Convierte los .glb de prototipos/candelabro/modelos/ en scripts clásicos
   (web/modelos/*.js) con un data URI base64, porque desde file:// el
   navegador no deja hacer fetch de un .glb.

   Uso (desde la carpeta del proyecto):
     node herramientas/generar-modelos.js
   Para usar otra variante (p. ej. sin compresión):
     node herramientas/generar-modelos.js _sin_compresion
   ===================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');

var raiz = path.resolve(__dirname, '..');
var origen = path.join(raiz, 'prototipos', 'candelabro', 'modelos');
var destino = path.join(raiz, 'web', 'modelos');
var sufijo = process.argv[2] || '';

var MODELOS = [
  { glb: 'candelabro', variable: 'MODELO_CANDELABRO' },
  { glb: 'majorana1', variable: 'MODELO_MAJORANA1' },
  { glb: 'majorana2', variable: 'MODELO_MAJORANA2' }
];

if (!fs.existsSync(destino)) fs.mkdirSync(destino, { recursive: true });

MODELOS.forEach(function (m) {
  var archivo = path.join(origen, m.glb + sufijo + '.glb');
  var datos = fs.readFileSync(archivo);
  if (datos.readUInt32LE(0) !== 0x46546c67) throw new Error(archivo + ' no es un .glb');
  var texto = '/* Generado por herramientas/generar-modelos.js a partir de ' + m.glb + sufijo + '.glb (' +
    datos.length + ' bytes). No editar a mano. */\n' +
    'window.' + m.variable + " = 'data:model/gltf-binary;base64," + datos.toString('base64') + "';\n";
  var salida = path.join(destino, m.glb + '.js');
  fs.writeFileSync(salida, texto);
  console.log(path.relative(raiz, salida) + ': ' + (texto.length / 1048576).toFixed(2) + ' MB (glb ' + (datos.length / 1048576).toFixed(2) + ' MB)');
});

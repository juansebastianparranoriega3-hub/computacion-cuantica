/* =====================================================================
   06-candelabro.js — Modo candelabro: recorrido 3D por el sistema de
   enfriamiento ("candelabro") de un computador cuántico superconductor.
   Bajar por el candelabro = pasar de lo clásico a lo cuántico.

   - Es un MODO de la misma página: las láminas no se duplican; se
     muestran sobre un panel de cristal y el 3D va detrás.
   - three.js r147 (UMD, web/vendor/three/) se carga aquí solo si el
     modo 3D se va a usar. Nada de módulos ES: abre con doble clic.
   - Respaldo automático al modo clásico: sin WebGL, ?modo=clasico,
     o si el promedio baja de ~30 fps en los primeros segundos.
     Con prefers-reduced-motion el 3D queda estático (sin viajes).
     ?modo=3d fuerza el 3D (sin la prueba de fps).
   - Gancho con el núcleo: Expo.esperaAlEntrar(n, previa, rapido)
     (01-nucleo.js lo llama en irA y espera lo que devuelva).
   API pública: window.Candelabro
   ===================================================================== */
(function () {
  'use strict';

  var Expo = window.Expo;
  var VERSION = '2026-11-25b';
  var RUTA_THREE = 'vendor/three/';

  /* Modelos reales hechos en Blender (agente chip-3d). En file:// no se puede
     hacer fetch de un .glb: cada modelo va en un .js que define una variable
     global con un data URI base64 (lo genera herramientas/generar-modelos.js):
       web/modelos/candelabro.js → window.MODELO_CANDELABRO = 'data:model/gltf-binary;base64,…'
     Vienen comprimidos con EXT_meshopt_compression: se decodifican con
     vendor/three/meshopt_decoder.js (UMD de three@0.147.0, wasm embebido).
     Se cargan DESPUÉS de que la portada ya se ve (carga progresiva): primero
     se muestra el candelabro procedural y luego se funde con el real. */
  var MODELO_REAL = {
    decodificador: RUTA_THREE + 'meshopt_decoder.js',
    candelabro: { archivo: 'modelos/candelabro.js', variable: 'MODELO_CANDELABRO' },
    chips: [
      { nombre: 'majorana1', ancla: 'ancla_chip_m1', archivo: 'modelos/majorana1.js', variable: 'MODELO_MAJORANA1' },
      { nombre: 'majorana2', ancla: 'ancla_chip_m2', archivo: 'modelos/majorana2.js', variable: 'MODELO_MAJORANA2' }
    ]
  };
  /* El .glb está en metros (≈ 1,74 m con el tubo de pulso; placas de 0 a −1,11 m).
     La escena se diseñó en «unidades» del procedural: ×5,5 deja los chips a la
     misma altura que los marcadores provisionales (−7,44) y el alto total
     parecido (≈ 9,5 unidades), así las distancias de cámara siguen sirviendo. */
  var ESCALA_REAL = 5.5;
  var ESPERA_MODELO = 900;     // ms tras el primer cuadro antes de empezar a cargar (la portada aparece antes)
  var FUNDIDO_MODELO = 900;    // ms del fundido procedural → real

  /* Pisos del candelabro (arriba → abajo) y el bloque del recorrido de cada uno.
     Temperaturas aproximadas según docs/referencia-candelabro.md §1 (el piso 4 es
     el still, 0,7–0,9 K; la placa fría, ~50–100 mK); la de la cámara de mezcla
     (~15 mK) es la del documento («unos 15 milikelvin»). */
  var PISOS = [
    { nombre: 'Placa superior', temp: 'Ambiente' },
    { nombre: 'Piso 2', temp: '~50 K' },
    { nombre: 'Piso 3', temp: '~4 K' },
    { nombre: 'Piso 4', temp: '~0,8 K (still)' },
    { nombre: 'Piso 5', temp: '~100 mK' },
    { nombre: 'Cámara de mezcla', temp: '~15 mK' }
  ];
  var Y_PLACA = [0, -1.5, -2.9, -4.2, -5.4, -6.5];     // altura de cada placa
  var R_PLACA = [2.6, 2.3, 2.02, 1.76, 1.52, 1.28];    // radio de cada placa
  var GROSOR = 0.12;

  var DURACION_VIAJE = 1200;   // ms: bajada de la cámara entre bloques
  var FPS_MINIMO = 30;

  /* Vistas de la cámara: objetivo (tx, ty), ángulo alrededor (az), distancia (D),
     altura sobre el objetivo (h). Se interpolan parámetro a parámetro con la
     misma curva (ease-in-out), así la cámara baja y a la vez orbita el candelabro.
     Las luces direccionales acompañan a la cámara (grupo `luces`), así cada
     ángulo queda iluminado igual y el panel de cristal siempre tiene detrás
     el mismo brillo; lo que cambia con el giro son los reflejos y la forma. */
  var VISTA_PORTADA = { tx: 0, ty: -4.4, az: 4.3, D: 17.5, h: 3.2, giro: true };
  var VISTA_CIERRE = { tx: 5.6, ty: -3.6, az: -0.5, D: 18.5, h: 1.8, giro: true };
  var AZ_LUZ_REF = 0.35;   // ángulo de cámara con el que se diseñó la iluminación

  /* Encuadre de cada estación, independiente del modelo: el objetivo vertical
     sale de las ANCLAS del modelo (altura de cada piso) + dy. Así, al cambiar el
     candelabro procedural por un .glb de Blender basta con dar sus anclas
     (Candelabro.usarModelo); los viajes no cambian.
     Giro de órbita entre pisos: progresivo, siempre en el mismo sentido que el
     giro de la portada (37–47° por viaje), y termina de frente a los chips. */
  var ENCUADRES = [
    { dy: -0.1, az: 3.80, D: 4.6, h: 1.5 },    // 01 placa superior
    { dy: -0.1, az: 3.05, D: 4.2, h: 1.3 },    // 02  −43°
    { dy: -0.1, az: 2.40, D: 3.8, h: 1.15 },   // 03  −37°
    { dy: -0.1, az: 1.62, D: 3.5, h: 1.0 },    // 04  −45°
    { dy: -0.1, az: 0.80, D: 3.2, h: 0.9 },    // 05  −47°
    { dy: -0.6, az: 0.12, D: 3.3, h: 0.75 }    // 06  −39°: chips bajo la cámara de mezcla
  ];
  /* Mismo giro para el modelo real (×5,5): placas algo más chicas (Ø 0,78 → 4,3
     unidades arriba; 0,50 → 2,75 abajo) y pisos más juntos abajo; el objetivo de
     cada piso queda un poco por debajo de su placa, donde cuelgan los componentes. */
  var ENCUADRES_REAL = [
    { dy: -0.35, az: 3.80, D: 5.6, h: 1.7 },  // 01 placa superior (300 K) y lo que cuelga
    { dy: -0.55, az: 3.05, D: 5.0, h: 1.4 },  // 02 50 K
    { dy: -0.55, az: 2.40, D: 4.5, h: 1.25 },   // 03 4 K
    { dy: -0.45, az: 1.62, D: 4.2, h: 1.1 },  // 04 still
    { dy: -0.35, az: 0.80, D: 3.9, h: 0.95 },  // 05 placa fría
    { dy: -0.95, az: 0.12, D: 4.0, h: 0.6 }    // 06 cámara de mezcla y chips
  ];
  var ESTACIONES = [];
  /** Recalcula las estaciones con las alturas (anclas) del modelo en uso. */
  function calcularEstaciones(anclas, encuadres) {
    ESTACIONES = (encuadres || ENCUADRES).map(function (e, i) {
      return { tx: 0, ty: anclas[Math.min(i, anclas.length - 1)] + e.dy, az: e.az, D: e.D, h: e.h };
    });
  }
  calcularEstaciones(Y_PLACA);

  /* Primer plano de un chip (tecla V en las láminas 13 y 15): la cámara se pone
     de frente al chip (que mira a +Z), apenas por encima. D se calcula con el
     tamaño del chip para que llene ~70 % del alto de la pantalla. */
  var LAMINA_CHIP = { 'l-majorana1': 'majorana1', 'l-majorana2': 'majorana2' };
  var OCUPA_CHIP = 0.7;

  var consultaCompacto = window.matchMedia('(max-width: 760px), (max-height: 500px), (max-aspect-ratio: 4/5)');
  var consultaTactil = window.matchMedia('(hover: none) and (pointer: coarse)');

  /* ------------------------------------------------------------------
     Estado
     ------------------------------------------------------------------ */
  var modo = 'clasico';          // 'clasico' | '3d'
  var forzado = false;           // ?modo=3d o elegido a mano: sin prueba de fps
  var construido = false;
  var cargando = null;           // promesa de carga de three
  var T = null;                  // THREE
  var renderer, escena, camara, raiz, inclinacion, luces, chips = {}, luzChip;
  var lienzo, vidrio, termometro, barraTemp, btnModo;
  var vistaActual = null, vistaDesde = null, vistaHacia = null;
  var viajeInicio = 0, viajeDuracion = 0, viajando = false;
  var giro = 0, giroDesde = 0, giroHacia = 0;
  var velParticulas = 1, tiempo = 0;
  /* Fondo: en las estaciones solo se mueven las partículas; se dibuja a 30 fps
     (el panel de cristal recalcula su desenfoque con cada cuadro del lienzo). */
  var FPS_FONDO = 30;
  var ultimoDibujo = 0;
  var vigiaFondo = { t: 0, n: 0, espera: 2.5 };
  var fondoPausado = false;      // si el equipo no da ni ~20 fps con el fondo, se queda quieto
  var costoFondo = { suma: 0, n: 0 };
  var bucleId = 0, previo = 0, cuadrosPendientes = 0;
  var tiltX = 0, tiltY = 0, tiltObjX = 0, tiltObjY = 0;
  var verEscena = false;
  var pisoActual = 0;
  var pruebaFps = { activa: false, tiempo: 0, cuadros: 0, calentamiento: 0.6 };
  var medicion = null;           // para Candelabro.medir()
  var costoRender = { suma: 0, n: 0 };
  var colaChips = [];
  var finViaje = 0;
  /* Modelo real: 'procedural' (aún no) | 'cargando' | 'real' | 'fallo' | 'omitido' (celular o ?modelo=procedural) */
  var estadoModelo = 'procedural';
  var detalleModelo = { ms: null, error: null };
  var pendienteModelo = null;    // modelo listo esperando a que termine un viaje
  var fundido = null;            // { inicio, saliente, matsNuevos, matsViejos }
  var primerPlano = null;        // nombre del chip en primer plano (tecla V en 13 / 15)
  var cargaPausaFps = false;     // la prueba de fps no cuenta mientras se decodifica el modelo

  function reducido() { return !!Expo.reducido; }
  function compacto() { return consultaCompacto.matches; }

  /* ------------------------------------------------------------------
     Decidir el modo
     ------------------------------------------------------------------ */
  function parametroModo() {
    var m = /[?&]modo=(3d|clasico)\b/i.exec(location.search);
    return m ? m[1].toLowerCase() : null;
  }
  function leerPreferencia() {
    try { return localStorage.getItem('expo-modo'); } catch (e) { return null; }
  }
  function guardarPreferencia(v) {
    try { localStorage.setItem('expo-modo', v); } catch (e) { /* almacenamiento bloqueado */ }
  }
  var webglCache = null;
  function hayWebGL() {
    if (webglCache !== null) return webglCache;
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
      webglCache = !!gl;
      if (gl && gl.getExtension('WEBGL_lose_context')) gl.getExtension('WEBGL_lose_context').loseContext();
    } catch (e) { webglCache = false; }
    return webglCache;
  }

  /* ------------------------------------------------------------------
     Carga de three.js (scripts clásicos, en orden)
     ------------------------------------------------------------------ */
  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = src + '?v=' + VERSION;
      s.onload = function () { ok(); };
      s.onerror = function () { mal(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }
  function cargarThree() {
    if (window.THREE && window.THREE.GLTFLoader && window.THREE.RoomEnvironment) return Promise.resolve();
    if (cargando) return cargando;
    cargando = cargarScript(RUTA_THREE + 'three.min.js')
      .then(function () { return cargarScript(RUTA_THREE + 'GLTFLoader.js'); })
      .then(function () { return cargarScript(RUTA_THREE + 'RoomEnvironment.js'); });
    return cargando;
  }

  /* ------------------------------------------------------------------
     Materiales
     ------------------------------------------------------------------ */
  var MAT = {};
  /** Material PBR con el color en sRGB (r147 interpreta el hex como lineal). */
  function pbr(hex, metal, rugosidad, extra) {
    var o = { color: new T.Color(hex).convertSRGBToLinear(), metalness: metal, roughness: rugosidad };
    for (var k in extra) o[k] = extra[k];
    if (o.emissive) o.emissive = new T.Color(o.emissive).convertSRGBToLinear();
    return new T.MeshStandardMaterial(o);
  }
  function crearMateriales() {
    MAT.oro = pbr(0xe0ab52, 1, 0.24);
    MAT.oroMate = pbr(0xc8923f, 1, 0.42);
    MAT.oroPulido = pbr(0xf2c46a, 1, 0.14);
    MAT.cobre = pbr(0xd07a45, 1, 0.32);
    MAT.acero = pbr(0x9aa1ab, 1, 0.34);
    MAT.tornillo = pbr(0xb9bcc2, 1, 0.22);
    MAT.oscuro = pbr(0x2a2f3a, 0.6, 0.45);
    MAT.pcbRoja = pbr(0xb3101f, 0.1, 0.4);
    MAT.pcbAzul = pbr(0x14479c, 0.1, 0.4);
    MAT.dado = pbr(0x1b2a4a, 0.7, 0.18, { emissive: 0x16306a, emissiveIntensity: 0.35 });
    MAT.gris = pbr(0xb8b0a2, 0.8, 0.35);
  }

  /* ------------------------------------------------------------------
     Modelo procedural del candelabro
     ------------------------------------------------------------------ */
  function cilindro(r, h, mat, seg) {
    return new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 48), mat);
  }

  /** Placa circular con borde, agujero central, tornillos (instanciados). */
  function crearPlaca(i, tornillos) {
    var g = new T.Group();
    var r = R_PLACA[i], y = Y_PLACA[i];
    // Disco (un anillo extruido: así se ve el agujero central)
    var forma = new T.Shape();
    forma.absarc(0, 0, r, 0, Math.PI * 2, false);
    var hueco = new T.Path();
    hueco.absarc(0, 0, 0.32, 0, Math.PI * 2, true);
    forma.holes.push(hueco);
    var geo = new T.ExtrudeGeometry(forma, { depth: GROSOR, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 72 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -GROSOR / 2, 0);
    var disco = new T.Mesh(geo, MAT.oro);
    disco.position.y = y;
    g.add(disco);
    // Labio inferior más delgado (da lectura de dos espesores)
    var labio = cilindro(r * 0.93, 0.04, MAT.oroMate, 72);
    labio.position.y = y - GROSOR / 2 - 0.02;
    g.add(labio);
    // Tornillos: anillo exterior e interior
    var n = Math.round(14 + r * 6);
    for (var k = 0; k < n; k++) {
      var a = k / n * Math.PI * 2;
      tornillos.push([Math.cos(a) * (r - 0.11), y + GROSOR / 2 + 0.012, Math.sin(a) * (r - 0.11)]);
    }
    var n2 = 10;
    for (k = 0; k < n2; k++) {
      a = (k + 0.5) / n2 * Math.PI * 2;
      tornillos.push([Math.cos(a) * 0.5, y + GROSOR / 2 + 0.012, Math.sin(a) * 0.5]);
    }
    return g;
  }

  /** Bandeja de instancias (una malla por tipo de pieza repetida). */
  function instancias(geo, mat, lista, escalas) {
    var malla = new T.InstancedMesh(geo, mat, lista.length);
    var m = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(1, 1, 1), p = new T.Vector3();
    for (var i = 0; i < lista.length; i++) {
      p.set(lista[i][0], lista[i][1], lista[i][2]);
      if (escalas) s.set(escalas[i][0], escalas[i][1], escalas[i][2]);
      q.identity();
      if (lista[i][3]) q.setFromAxisAngle(new T.Vector3(0, 1, 0), lista[i][3]);
      m.compose(p, q, s);
      malla.setMatrixAt(i, m);
    }
    malla.instanceMatrix.needsUpdate = true;
    return malla;
  }

  function crearCandelabro() {
    var g = new T.Group();
    var tornillos = [];
    var varillas = [], escVarillas = [];
    var latas = [], escLatas = [];
    var cajas = [], escCajas = [];

    for (var i = 0; i < PISOS.length; i++) g.add(crearPlaca(i, tornillos));

    // Brida y cuello sobre la placa superior (conexión con el resto del equipo)
    var cuello = cilindro(0.55, 1.6, MAT.acero, 48);
    cuello.position.y = 0.86;
    g.add(cuello);
    var brida = cilindro(0.85, 0.12, MAT.acero, 48);
    brida.position.y = 1.7;
    g.add(brida);
    var anillo = new T.Mesh(new T.TorusGeometry(R_PLACA[0] - 0.02, 0.05, 12, 96), MAT.oroPulido);
    anillo.rotation.x = Math.PI / 2;
    anillo.position.y = GROSOR / 2;
    g.add(anillo);

    for (i = 0; i < PISOS.length - 1; i++) {
      var y0 = Y_PLACA[i] - GROSOR / 2, y1 = Y_PLACA[i + 1] + GROSOR / 2;
      var alto = y0 - y1, medio = (y0 + y1) / 2;
      var rv = R_PLACA[i + 1] - 0.2;
      // Varillas de soporte (6 por piso)
      for (var k = 0; k < 6; k++) {
        var a = k / 6 * Math.PI * 2 + i * 0.18;
        varillas.push([Math.cos(a) * rv, medio, Math.sin(a) * rv]);
        escVarillas.push([1, alto, 1]);
      }
      // Columna central (intercambiadores de calor): tramo dorado y anillos
      var col = cilindro(0.2 - i * 0.015, alto, MAT.oroMate, 32);
      col.position.y = medio;
      g.add(col);
      for (k = 1; k <= 3; k++) {
        var aro = cilindro(0.27 - i * 0.015, 0.05, MAT.oroPulido, 32);
        aro.position.y = y0 - alto * k / 4;
        g.add(aro);
      }
      // Cables coaxiales en espiral (de esta placa a la siguiente)
      var nc = 8;
      var rc0 = R_PLACA[i] * 0.62, rc1 = R_PLACA[i + 1] * 0.62;
      for (k = 0; k < nc; k++) {
        var a0 = k / nc * Math.PI * 2 + i * 0.4;
        var pts = [];
        for (var s = 0; s <= 24; s++) {
          var t = s / 24;
          var aa = a0 + t * Math.PI * 0.85;
          var rr = rc0 + (rc1 - rc0) * t + Math.sin(t * Math.PI) * 0.12;
          pts.push(new T.Vector3(Math.cos(aa) * rr, y0 - t * alto, Math.sin(aa) * rr));
        }
        var curva = new T.CatmullRomCurve3(pts);
        var tubo = new T.Mesh(new T.TubeGeometry(curva, 48, 0.022, 6, false), k % 2 ? MAT.acero : MAT.cobre);
        g.add(tubo);
      }
      // Componentes del piso (debajo de la placa i): latas de filtros/atenuadores
      var nl = 6 + (i % 2) * 2;
      for (k = 0; k < nl; k++) {
        a = (k + 0.5) / nl * Math.PI * 2 + i * 0.3;
        var rl = R_PLACA[i] * 0.4;
        var hl = 0.28 + (k % 3) * 0.07;
        latas.push([Math.cos(a) * rl, y0 - hl / 2, Math.sin(a) * rl]);
        escLatas.push([1, hl, 1]);
      }
      // Cajas (amplificadores, conectores) sobre la placa siguiente
      var nb = 4;
      for (k = 0; k < nb; k++) {
        a = k / nb * Math.PI * 2 + 0.4 + i * 0.5;
        var rb = R_PLACA[i + 1] * 0.78;
        cajas.push([Math.cos(a) * rb, y1 + 0.09, Math.sin(a) * rb, -a]);
        escCajas.push([0.34, 0.18, 0.22]);
      }
    }

    g.add(instancias(new T.CylinderGeometry(0.03, 0.03, 0.035, 12), MAT.tornillo, tornillos));
    g.add(instancias(new T.CylinderGeometry(0.035, 0.035, 1, 12), MAT.acero, varillas, escVarillas));
    g.add(instancias(new T.CylinderGeometry(0.075, 0.075, 1, 20), MAT.oroPulido, latas, escLatas));
    g.add(instancias(new T.BoxGeometry(1, 1, 1), MAT.gris, cajas, escCajas));

    // Debajo de la cámara de mezcla: el soporte frío con los chips
    var yM = Y_PLACA[5] - GROSOR / 2;
    var dedo = cilindro(0.16, 0.42, MAT.oroPulido, 32);
    dedo.position.y = yM - 0.21;
    g.add(dedo);
    var soporte = new T.Mesh(new T.BoxGeometry(1.5, 0.08, 0.5), MAT.oroPulido);
    soporte.position.set(0, yM - 0.44, 0);
    g.add(soporte);
    var placaChips = new T.Mesh(new T.BoxGeometry(1.5, 0.82, 0.06), MAT.oro);
    placaChips.position.set(0, yM - 0.88, -0.05);
    g.add(placaChips);

    chips.majorana1 = crearChipProvisional('majorana1');
    chips.majorana1.position.set(-0.36, yM - 0.88, 0.02);
    g.add(chips.majorana1);
    chips.majorana2 = crearChipProvisional('majorana2');
    chips.majorana2.position.set(0.36, yM - 0.88, 0.02);
    g.add(chips.majorana2);

    luzChip = new T.PointLight(0x7fb6ff, 0.45, 2.5, 2);
    luzChip.position.set(0, yM - 1.1, 1.2);
    g.add(luzChip);
    return g;
  }

  /** Marcador provisional de un chip: marco dorado, PCB (roja o azul), dado y contactos.
      Se reemplaza con Candelabro.cargarChip(nombre, urlDatos). */
  function crearChipProvisional(nombre) {
    var g = new T.Group();
    g.name = 'chip-' + nombre;
    var ancho = 0.6, alto = 0.66, f = 0.07, prof = 0.06;
    var lados = [
      [0, alto / 2 - f / 2, ancho, f], [0, -alto / 2 + f / 2, ancho, f],
      [-ancho / 2 + f / 2, 0, f, alto], [ancho / 2 - f / 2, 0, f, alto]
    ];
    lados.forEach(function (l) {
      var m = new T.Mesh(new T.BoxGeometry(l[2], l[3], prof), MAT.oroPulido);
      m.position.set(l[0], l[1], 0);
      g.add(m);
    });
    var pcb = new T.Mesh(new T.BoxGeometry(ancho - 2 * f, alto - 2 * f, prof * 0.5), nombre === 'majorana1' ? MAT.pcbRoja : MAT.pcbAzul);
    g.add(pcb);
    // Placa de metal central y dado del chip
    var base = new T.Mesh(new T.BoxGeometry(0.24, 0.22, 0.012), MAT.gris);
    base.position.set(nombre === 'majorana1' ? -0.04 : 0.02, 0, prof * 0.25 + 0.006);
    g.add(base);
    var dado = new T.Mesh(new T.BoxGeometry(0.11, 0.11, 0.02), MAT.dado);
    dado.position.set(base.position.x, 0, prof * 0.25 + 0.016);
    g.add(dado);
    // Contactos dorados arriba y abajo
    [-0.21, 0.21].forEach(function (yy) {
      var c = new T.Mesh(new T.BoxGeometry(0.34, 0.05, 0.01), MAT.oro);
      c.position.set(0, yy, prof * 0.25 + 0.005);
      g.add(c);
    });
    // Tornillos del marco
    var geoT = new T.CylinderGeometry(0.014, 0.014, 0.012, 10);
    geoT.rotateX(Math.PI / 2);
    for (var k = 0; k < 5; k++) {
      var yy = -alto / 2 + f + (alto - 2 * f) * (k + 0.5) / 5;
      [-1, 1].forEach(function (lado) {
        var t = new T.Mesh(geoT, MAT.tornillo);
        t.position.set(lado * (ancho / 2 - f / 2), yy, prof / 2 + 0.006);
        g.add(t);
      });
    }
    g.userData.provisional = true;
    g.userData.tamano = new T.Vector3(ancho, alto, prof);
    return g;
  }

  /* ------------------------------------------------------------------
     Fondo de materia y antimateria
     Partículas de materia (cian) y antimateria (magenta) que derivan despacio.
     Al azar, una de cada tipo se atraen y se aniquilan: destello blanco y dos
     rayos opuestos (fotones gamma) que se desvanecen; las dos reaparecen en
     otro lugar, así el número no cambia. Es fondo: tenue y lento.
     - Simulación en CPU sobre búferes fijos (Float32Array) que se suben a la
       GPU cada cuadro: no se crean objetos por cuadro.
     - Destellos en un pool fijo (Points para el núcleo, LineSegments para los
       rayos) que se reutiliza.
     - Movimiento reducido: quietas y sin destellos.
     ------------------------------------------------------------------ */
  var Y_MIN_PART = -11, Y_RANGO_PART = 15;
  var R_MIN_PART = 2.6, R_MAX_PART = 12.5;
  var U_PIXEL = { value: 1 };            // uniforme compartido (tamaño de punto según la pantalla)
  var DUR_DESTELLO = 0.55;               // s
  var fondo = null;

  function crearFondo(n, nDestellos) {
    var f = {
      n: n, p: nDestellos,
      pos: new Float32Array(n * 3), vel: new Float32Array(n * 3),
      alfa: new Float32Array(n), pareja: new Int16Array(n), tPar: new Float32Array(n),
      dPos: new Float32Array(nDestellos * 3), dDir: new Float32Array(nDestellos * 3), dEdad: new Float32Array(nDestellos),
      dNucleo: new Float32Array(nDestellos * 3), dBrillo: new Float32Array(nDestellos),
      rPos: new Float32Array(nDestellos * 12), rAlfa: new Float32Array(nDestellos * 4),
      proxima: 0.8, siguienteDestello: 0, aniquilaciones: 0
    };
    var tipo = new Float32Array(n), tam = new Float32Array(n), fase = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      tipo[i] = i & 1;                       // par = materia, impar = antimateria
      tam[i] = 0.7 + Math.random() * 1.0;
      fase[i] = Math.random() * Math.PI * 2;
      reaparecer(f, i, true);
    }
    for (i = 0; i < nDestellos; i++) f.dEdad[i] = -1;

    // Partículas
    var geo = new T.BufferGeometry();
    f.aPos = new T.BufferAttribute(f.pos, 3); f.aPos.setUsage(T.DynamicDrawUsage);
    f.aAlfa = new T.BufferAttribute(f.alfa, 1); f.aAlfa.setUsage(T.DynamicDrawUsage);
    geo.setAttribute('position', f.aPos);
    geo.setAttribute('alfa', f.aAlfa);
    geo.setAttribute('tipo', new T.BufferAttribute(tipo, 1));
    geo.setAttribute('tam', new T.BufferAttribute(tam, 1));
    geo.setAttribute('fase', new T.BufferAttribute(fase, 1));
    f.uTiempo = { value: 0 };
    f.puntos = new T.Points(geo, new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uTiempo: f.uTiempo, uPixel: U_PIXEL },
      vertexShader: [
        'attribute float alfa;',
        'attribute float tipo;',
        'attribute float tam;',
        'attribute float fase;',
        'uniform float uTiempo;',
        'uniform float uPixel;',
        'varying float vBrillo;',
        'varying float vTipo;',
        'void main() {',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  float s = 0.5 + 0.5 * sin(uTiempo * (0.7 + fase * 0.25) + fase * 3.0);',
        '  vBrillo = alfa * (0.45 + 0.35 * s);',
        '  vBrillo *= smoothstep(0.7, 2.4, -mv.z) * smoothstep(28.0, 13.0, -mv.z);',
        '  vTipo = tipo;',
        '  // Tamaño acotado: cerca de la cámara los puntos no crecen sin límite (evita sobredibujo)',
        '  gl_PointSize = min(tam * uPixel * (66.0 / -mv.z), 13.0 * uPixel);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying float vBrillo;',
        'varying float vTipo;',
        'void main() {',
        '  float d = length(gl_PointCoord - 0.5);',
        '  float a = smoothstep(0.5, 0.0, d);',
        '  a = a * a;',
        '  vec3 col = mix(vec3(0.33, 0.86, 1.0), vec3(1.0, 0.3, 0.8), vTipo);',
        '  gl_FragColor = vec4(col * vBrillo * a, 1.0);',
        '}'
      ].join('\n')
    }));
    f.puntos.frustumCulled = false;

    // Núcleo de los destellos (flash blanco con halo)
    var gN = new T.BufferGeometry();
    f.aNucleo = new T.BufferAttribute(f.dNucleo, 3); f.aNucleo.setUsage(T.DynamicDrawUsage);
    f.aBrillo = new T.BufferAttribute(f.dBrillo, 1); f.aBrillo.setUsage(T.DynamicDrawUsage);
    gN.setAttribute('position', f.aNucleo);
    gN.setAttribute('brillo', f.aBrillo);
    f.nucleos = new T.Points(gN, new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uPixel: U_PIXEL },
      vertexShader: [
        'attribute float brillo;',
        'uniform float uPixel;',
        'varying float vB;',
        'void main() {',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vB = brillo * smoothstep(0.7, 2.4, -mv.z);',
        '  gl_PointSize = brillo > 0.0 ? min(uPixel * (0.6 + 0.4 * brillo) * (300.0 / -mv.z), 64.0 * uPixel) : 0.0;',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying float vB;',
        'void main() {',
        '  float d = length(gl_PointCoord - 0.5) * 2.0;',
        '  float nucleo = smoothstep(0.34, 0.0, d);',
        '  float halo = pow(max(0.0, 1.0 - d), 2.5) * 0.6;',
        '  gl_FragColor = vec4(vec3(1.0, 0.97, 0.93) * (nucleo + halo) * vB, 1.0);',
        '}'
      ].join('\n')
    }));
    f.nucleos.frustumCulled = false;

    // Rayos gamma: dos segmentos opuestos por destello (cabeza brillante, cola transparente)
    var gR = new T.BufferGeometry();
    f.aRayo = new T.BufferAttribute(f.rPos, 3); f.aRayo.setUsage(T.DynamicDrawUsage);
    f.aRayoAlfa = new T.BufferAttribute(f.rAlfa, 1); f.aRayoAlfa.setUsage(T.DynamicDrawUsage);
    gR.setAttribute('position', f.aRayo);
    gR.setAttribute('alfa', f.aRayoAlfa);
    f.rayos = new T.LineSegments(gR, new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: [
        'attribute float alfa;',
        'varying float vA;',
        'void main() { vA = alfa; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
      ].join('\n'),
      fragmentShader: [
        'varying float vA;',
        'void main() { gl_FragColor = vec4(vec3(1.0, 0.96, 0.9) * vA, 1.0); }'
      ].join('\n')
    }));
    f.rayos.frustumCulled = false;

    f.grupo = new T.Group();
    f.grupo.add(f.puntos, f.nucleos, f.rayos);
    f.v = new T.Vector3();        // vectores de trabajo, reutilizados
    f.adelante = new T.Vector3();
    return f;
  }

  /** Pone la partícula i en un lugar al azar del volumen (alfa 0: aparece con fundido). */
  function reaparecer(f, i, inicio) {
    var r = R_MIN_PART + Math.pow(Math.random(), 0.8) * (R_MAX_PART - R_MIN_PART);
    var a = Math.random() * Math.PI * 2;
    var k = i * 3;
    f.pos[k] = Math.cos(a) * r;
    f.pos[k + 1] = Y_MIN_PART + Math.random() * Y_RANGO_PART;
    f.pos[k + 2] = Math.sin(a) * r;
    // Deriva lenta en una dirección al azar (0,04–0,13 unidades/s)
    var u = Math.random() * 2 - 1, b = Math.random() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
    var v = 0.04 + Math.random() * 0.09;
    f.vel[k] = Math.cos(b) * rr * v;
    f.vel[k + 1] = u * v * 0.6;
    f.vel[k + 2] = Math.sin(b) * rr * v;
    f.alfa[i] = inicio ? 1 : 0;
    f.pareja[i] = -1;
    f.tPar[i] = 0;
  }

  /** ¿La partícula i se ve en pantalla (dentro del cuadro y a distancia media)? */
  function enPantalla(f, i) {
    var k = i * 3;
    f.v.set(f.pos[k], f.pos[k + 1], f.pos[k + 2]);
    var dist = f.v.distanceTo(camara.position);
    if (dist < 1.6 || dist > 14) return false;
    f.v.project(camara);
    return f.v.z < 1 && Math.abs(f.v.x) < 0.92 && Math.abs(f.v.y) < 0.88;
  }

  /** Empareja una partícula de materia visible con la antimateria libre más cercana
      (recorre toda la antimateria: ocurre ~2 veces por segundo, no en cada cuadro). */
  function emparejar(f) {
    var mitad = f.n >> 1;
    for (var intento = 0; intento < 30; intento++) {
      var i = Math.floor(Math.random() * mitad) * 2;                // materia (índice par)
      if (f.pareja[i] >= 0 || f.alfa[i] < 1 || !enPantalla(f, i)) continue;
      var mejor = -1, dMejor = 12.25;                               // hasta 3,5 unidades
      for (var j = 1; j < f.n; j += 2) {                            // antimateria (índice impar)
        if (f.pareja[j] >= 0 || f.alfa[j] < 1) continue;
        var dx = f.pos[j * 3] - f.pos[i * 3], dy = f.pos[j * 3 + 1] - f.pos[i * 3 + 1], dz = f.pos[j * 3 + 2] - f.pos[i * 3 + 2];
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < dMejor && d2 > 0.04) { dMejor = d2; mejor = j; }
      }
      if (mejor >= 0) {
        f.pareja[i] = mejor; f.pareja[mejor] = i;
        f.tPar[i] = f.tPar[mejor] = 0;
        return true;
      }
    }
    return false;
  }

  function lanzarDestello(f, x, y, z) {
    var d = f.siguienteDestello;
    f.siguienteDestello = (d + 1) % f.p;
    f.dPos[d * 3] = x; f.dPos[d * 3 + 1] = y; f.dPos[d * 3 + 2] = z;
    // Dirección de los rayos: al azar, pero perpendicular a la mirada (se ven de lado)
    camara.getWorldDirection(f.adelante);
    f.v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    f.v.addScaledVector(f.adelante, -f.v.dot(f.adelante));
    if (f.v.lengthSq() < 1e-4) f.v.set(1, 0, 0);
    f.v.normalize();
    f.dDir[d * 3] = f.v.x; f.dDir[d * 3 + 1] = f.v.y; f.dDir[d * 3 + 2] = f.v.z;
    f.dEdad[d] = 0;
    f.ultimo = d;
    f.aniquilaciones++;
  }

  function aniquilar(f, i, j) {
    var a = i * 3, b = j * 3;
    lanzarDestello(f, (f.pos[a] + f.pos[b]) / 2, (f.pos[a + 1] + f.pos[b + 1]) / 2, (f.pos[a + 2] + f.pos[b + 2]) / 2);
    // «Pop» de aniquilación (07-sonido.js), paneado según la x en pantalla; en silencio durante
    // un viaje. Cuántas suenan lo decide 07: ≈ 1 de cada 3, ≥ 700 ms entre sí y nunca
    // en los 1,5 s siguientes a un sonido de demostración.
    if (!viajando) Expo.sonar('aniquilacion', (f.v.set(f.pos[a], f.pos[a + 1], f.pos[a + 2]).project(camara).x + 1) / 2);
    reaparecer(f, i, false);
    reaparecer(f, j, false);
  }

  function apagarDestello(f, d) {
    var b4 = d * 4;
    f.dEdad[d] = -1;
    f.dBrillo[d] = 0;
    f.rAlfa[b4] = f.rAlfa[b4 + 1] = f.rAlfa[b4 + 2] = f.rAlfa[b4 + 3] = 0;
  }

  /** Un paso de la simulación. flujoY: desplazamiento vertical de este cuadro (viajes). */
  function actualizarFondo(f, dt, flujoY) {
    var n = f.n, pos = f.pos, vel = f.vel, i, j, k, q;
    var yMax = Y_MIN_PART + Y_RANGO_PART;
    for (i = 0; i < n; i++) {
      k = i * 3;
      if (f.alfa[i] < 1) f.alfa[i] = Math.min(1, f.alfa[i] + dt * 0.9);
      j = f.pareja[i];
      if (j >= 0) {
        if (j < i) continue;                         // cada par se mueve una sola vez
        // Atracción que crece con el tiempo: se acercan, se aceleran y se aniquilan
        f.tPar[i] += dt; f.tPar[j] = f.tPar[i];
        var t = f.tPar[i];
        q = j * 3;
        var dx = pos[q] - pos[k], dy = pos[q + 1] - pos[k + 1], dz = pos[q + 2] - pos[k + 2];
        if (dx * dx + dy * dy + dz * dz < 0.0025 || t > 2.2) { aniquilar(f, i, j); continue; }
        var s = Math.min(0.5, dt * (0.35 + 2.6 * t * t));
        pos[k] += dx * s; pos[k + 1] += dy * s + flujoY; pos[k + 2] += dz * s;
        pos[q] -= dx * s; pos[q + 1] += flujoY - dy * s; pos[q + 2] -= dz * s;
        if (pos[k + 1] < Y_MIN_PART || pos[k + 1] > yMax) { reaparecer(f, i, true); reaparecer(f, j, true); }
        continue;
      }
      pos[k] += vel[k] * dt;
      pos[k + 1] += vel[k + 1] * dt + flujoY;
      pos[k + 2] += vel[k + 2] * dt;
      // Volumen: se repite en altura; en el radio rebota (anillo alrededor del candelabro)
      if (pos[k + 1] < Y_MIN_PART) pos[k + 1] += Y_RANGO_PART;
      else if (pos[k + 1] > yMax) pos[k + 1] -= Y_RANGO_PART;
      var r2 = pos[k] * pos[k] + pos[k + 2] * pos[k + 2];
      var radial = pos[k] * vel[k] + pos[k + 2] * vel[k + 2];
      if ((r2 > R_MAX_PART * R_MAX_PART && radial > 0) || (r2 < R_MIN_PART * R_MIN_PART && radial < 0)) {
        var inv = 2 * radial / Math.max(r2, 1e-4);
        vel[k] -= inv * pos[k]; vel[k + 2] -= inv * pos[k + 2];
      }
    }
    // Nueva pareja cada 0,3–0,8 s (≈ 1,5–2 aniquilaciones por segundo en pantalla)
    f.proxima -= dt;
    if (f.proxima <= 0) {
      // Si no hubo pareja posible (pocas a la vista), se reintenta enseguida
      f.proxima = emparejar(f) ? 0.3 + Math.random() * 0.5 : 0.08;
    }
    // Destellos: el núcleo se enciende (50 ms) y se apaga; los rayos salen en sentidos opuestos
    for (var d = 0; d < f.p; d++) {
      var e = f.dEdad[d];
      if (e < 0) continue;
      e += dt;
      if (e >= DUR_DESTELLO) { apagarDestello(f, d); continue; }
      f.dEdad[d] = e;
      var b3 = d * 3, b12 = d * 12, b4 = d * 4;
      var x = f.dPos[b3], y = f.dPos[b3 + 1], z = f.dPos[b3 + 2];
      f.dNucleo[b3] = x; f.dNucleo[b3 + 1] = y; f.dNucleo[b3 + 2] = z;
      f.dBrillo[d] = e < 0.05 ? e / 0.05 : Math.exp(-(e - 0.05) * 9);
      var cab = 0.08 + e * 2.6, cola = Math.max(0, cab - 0.55);
      var al = Math.pow(1 - e / DUR_DESTELLO, 2) * 0.85;
      var ux = f.dDir[b3], uy = f.dDir[b3 + 1], uz = f.dDir[b3 + 2];
      for (var lado = 0; lado < 2; lado++) {
        var sg = lado ? -1 : 1, o = b12 + lado * 6;
        f.rPos[o] = x + ux * cola * sg; f.rPos[o + 1] = y + uy * cola * sg; f.rPos[o + 2] = z + uz * cola * sg;
        f.rPos[o + 3] = x + ux * cab * sg; f.rPos[o + 4] = y + uy * cab * sg; f.rPos[o + 5] = z + uz * cab * sg;
        f.rAlfa[b4 + lado * 2] = 0;
        f.rAlfa[b4 + lado * 2 + 1] = al;
      }
    }
    f.aPos.needsUpdate = true; f.aAlfa.needsUpdate = true;
    f.aNucleo.needsUpdate = true; f.aBrillo.needsUpdate = true;
    f.aRayo.needsUpdate = true; f.aRayoAlfa.needsUpdate = true;
  }

  /* ------------------------------------------------------------------
     Construcción de la escena
     ------------------------------------------------------------------ */
  function construir() {
    T = window.THREE;
    lienzo = document.getElementById('cv-candelabro');
    var ligero = compacto() || consultaTactil.matches;
    renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: !ligero, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ligero ? 1.25 : 1.5));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    escena = new T.Scene();
    escena.background = new T.Color(0x03060f);
    escena.fog = new T.Fog(0x03060f, 14, 30);
    var pmrem = new T.PMREMGenerator(renderer);
    escena.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    camara = new T.PerspectiveCamera(38, 1, 0.1, 80);
    crearMateriales();

    // Luces direccionales en un grupo que orbita con la cámara (aplicarVista)
    luces = new T.Group();
    var clave = new T.DirectionalLight(0xfff1dc, 1.1);
    clave.position.set(5, 6, 7);
    luces.add(clave);
    var contra = new T.DirectionalLight(0x5f8dff, 0.9);
    contra.position.set(-6, -4, -5);
    luces.add(contra);
    escena.add(luces);
    escena.add(new T.HemisphereLight(0x9cc0ff, 0x1a1208, 0.35));

    inclinacion = new T.Group();
    raiz = crearCandelabro();
    inclinacion.add(raiz);
    escena.add(inclinacion);

    // Fondo de materia y antimateria (menos partículas en celular)
    fondo = crearFondo(ligero ? 240 : 640, ligero ? 4 : 8);
    escena.add(fondo.grupo);

    ajustarTamano();
    window.addEventListener('resize', function () { if (modo === '3d') { ajustarTamano(); pedirCuadros(2); } });
    construido = true;
    colaChips.forEach(function (c) { cargarChip(c[0], c[1]).then(c[2], c[3]); });
    colaChips = [];
    programarModeloReal();
  }

  function ajustarTamano() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    U_PIXEL.value = renderer.getPixelRatio() * h / 900;
  }

  /** Cambia el modelo del candelabro (p. ej. el .glb de Blender) sin tocar los viajes.
      anclas: altura (y) del objetivo de cada piso, de arriba abajo (6 valores, como PISOS);
      chips: { majorana1: Object3D, majorana2: Object3D } si el modelo ya los trae;
      encuadres: tabla como ENCUADRES (si el modelo tiene otras proporciones);
      vistas: { portada, cierre } para reemplazar esas dos vistas;
      fundido: true → el modelo nuevo aparece con un fundido sobre el anterior;
      luzChip: luz puntual de los chips del modelo nuevo. */
  function usarModelo(objeto, opciones) {
    opciones = opciones || {};
    if (!construido) return false;
    if (fundido) terminarFundido();
    var saliente = raiz;
    raiz = objeto;
    inclinacion.add(raiz);
    if (opciones.anclas) calcularEstaciones(opciones.anclas, opciones.encuadres);
    if (opciones.vistas && opciones.vistas.portada) VISTA_PORTADA = opciones.vistas.portada;
    if (opciones.vistas && opciones.vistas.cierre) VISTA_CIERRE = opciones.vistas.cierre;
    if (opciones.chips) chips = opciones.chips;
    if (opciones.luzChip) luzChip = opciones.luzChip;
    if (opciones.fundido && !reducido() && saliente) empezarFundido(saliente, raiz);
    else if (saliente) { inclinacion.remove(saliente); liberar(saliente); }
    // La cámara va al encuadre nuevo (las alturas cambiaron): con un viaje corto si se puede
    if (Expo.actual >= 0 && !Expo.esAnexo(Expo.actual)) {
      var v = primerPlano ? vistaPrimerPlano(primerPlano) : vistaDeLamina(Expo.actual);
      if (v) viajarA(v, !!opciones.fundido);
    }
    pedirCuadros(2);
    return true;
  }

  /* Fundido entre modelos: el nuevo pasa de opacidad 0 a 1 y el viejo de 1 a 0
     (los dos transparentes mientras dura); al terminar el nuevo vuelve a ser
     opaco y el viejo se libera. Sin needsUpdate: no se recompilan shaders. */
  function materialesDe(obj) {
    var lista = [];
    obj.traverse(function (o) {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        if (lista.indexOf(m) < 0) lista.push(m);
      });
    });
    return lista;
  }
  function empezarFundido(viejo, nuevo) {
    var mn = materialesDe(nuevo), mv = materialesDe(viejo);
    mn.forEach(function (m) { m.userData.eraTransparente = m.transparent; m.transparent = true; m.opacity = 0; });
    mv.forEach(function (m) { m.transparent = true; m.depthWrite = false; });
    fundido = { inicio: performance.now(), saliente: viejo, matsNuevos: mn, matsViejos: mv };
    arrancarBucle();
  }
  function pasoFundido(ahora) {
    var p = Math.min(1, (ahora - fundido.inicio) / FUNDIDO_MODELO);
    var e = Expo.suavizarIO(p);
    fundido.matsNuevos.forEach(function (m) { m.opacity = e; });
    fundido.matsViejos.forEach(function (m) { m.opacity = 1 - e; });
    if (p >= 1) terminarFundido();
  }
  function terminarFundido() {
    fundido.matsNuevos.forEach(function (m) { m.opacity = 1; m.transparent = !!m.userData.eraTransparente; });
    inclinacion.remove(fundido.saliente);
    liberar(fundido.saliente);
    fundido = null;
    pedirCuadros(2);
  }
  /** Libera geometrías y materiales de un modelo que ya no se usa. */
  function liberar(obj) {
    obj.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
    });
    materialesDe(obj).forEach(function (m) { m.dispose(); });
  }

  /* ------------------------------------------------------------------
     Cámara: vistas, viajes y bucle de render
     ------------------------------------------------------------------ */
  /* cx, cz: objetivo fuera del eje (primer plano de un chip); fija: sin el
     ajuste de pantallas verticales ni la inclinación con el puntero. */
  function copiaVista(v) {
    return { tx: v.tx, ty: v.ty, az: v.az, D: v.D, h: v.h, giro: !!v.giro, cx: v.cx || 0, cz: v.cz || 0, fija: +v.fija || 0 };
  }

  /** Vista de primer plano del chip `nombre` (de frente, encuadrado por su tamaño). */
  function vistaPrimerPlano(nombre) {
    var c = chips[nombre];
    if (!c || !construido) return null;
    raiz.updateMatrixWorld(true);
    var caja = new T.Box3().setFromObject(c);
    if (caja.isEmpty()) return null;
    var centro = caja.getCenter(new T.Vector3());
    var tam = caja.getSize(new T.Vector3());
    // La inclinación del grupo se descuenta: el primer plano se mira con el candelabro recto
    var mitadV = Math.tan(camara.fov * Math.PI / 360);
    var alto = Math.max(tam.y, tam.x / Math.max(0.5, camara.aspect));
    var D = alto / OCUPA_CHIP / 2 / mitadV + tam.z / 2;
    return { tx: 0, ty: centro.y, cx: centro.x, cz: centro.z, az: 0, D: D, h: D * 0.12, giro: false, fija: true };
  }

  /** Vista para la lámina n (índice en el documento). */
  function vistaDeLamina(n) {
    var l = Expo.laminas[n];
    if (!l) return copiaVista(VISTA_PORTADA);
    if (l.id === 'l-portada') return copiaVista(VISTA_PORTADA);
    var b = +l.dataset.bloque;
    if (b >= ESTACIONES.length) return copiaVista(VISTA_CIERRE);
    return copiaVista(ESTACIONES[b]);
  }
  function nombreVista(n) {
    var l = Expo.laminas[n];
    if (!l) return 'portada';
    if (Expo.esAnexo(n)) return 'anexo';
    if (l.id === 'l-portada') return 'portada';
    return +l.dataset.bloque >= ESTACIONES.length ? 'cierre' : 'estacion';
  }
  function pisoDeLamina(n) {
    var l = Expo.laminas[n];
    if (!l || l.id === 'l-portada') return 0;
    var b = +l.dataset.bloque;
    return b >= PISOS.length ? -1 : b;
  }

  function aplicarVista(v) {
    // En pantallas verticales el candelabro se ve más lejos para que quepa
    var factor = camara.aspect < 1 ? 1 + (1 - camara.aspect) * 1.25 * (1 - (v.fija || 0)) : 1;
    var tx = camara.aspect < 1 ? 0 : v.tx;
    var D = v.D * factor;
    // La niebla acompaña a la distancia: lejos (portada, cierre, celular) no oscurece el candelabro
    escena.fog.near = Math.max(14, D * 0.95);
    escena.fog.far = Math.max(30, D * 2);
    // tx desplaza el objetivo a la derecha de la cámara: el candelabro queda a la izquierda
    var ox = Math.cos(v.az) * tx + (v.cx || 0), oz = -Math.sin(v.az) * tx + (v.cz || 0);
    camara.position.set(ox + Math.sin(v.az) * D, v.ty + v.h, oz + Math.cos(v.az) * D);
    camara.lookAt(ox, v.ty, oz);
    luces.rotation.y = v.az - AZ_LUZ_REF;
  }

  function mezclar(a, b, t) {
    return { tx: a.tx + (b.tx - a.tx) * t, ty: a.ty + (b.ty - a.ty) * t, az: a.az + (b.az - a.az) * t,
      D: a.D + (b.D - a.D) * t, h: a.h + (b.h - a.h) * t, giro: b.giro,
      cx: (a.cx || 0) + ((b.cx || 0) - (a.cx || 0)) * t, cz: (a.cz || 0) + ((b.cz || 0) - (a.cz || 0)) * t,
      fija: (+a.fija || 0) + ((+b.fija || 0) - (+a.fija || 0)) * t };
  }

  /** Ángulo de giro más cercano a 0 (módulo 2π) para volver de frente al llegar a una estación. */
  function giroNeutro(g) { return Math.round(g / (Math.PI * 2)) * Math.PI * 2; }

  function viajarA(v, conViaje) {
    // El ángulo de destino se toma en la vuelta más cercana a la actual: la órbita
    // entre pisos vecinos es la de la tabla (37–47°) y nunca da una vuelta de más.
    if (vistaActual) v.az += Math.round((vistaActual.az - v.az) / (Math.PI * 2)) * Math.PI * 2;
    if (!vistaActual || !conViaje || reducido()) {
      vistaActual = copiaVista(v);
      viajando = false;
      if (!v.giro) giro = giroNeutro(giro);
      pedirCuadros(2);
      return 0;
    }
    vistaDesde = copiaVista(vistaActual);
    vistaHacia = copiaVista(v);
    giroDesde = giro;
    giroHacia = v.giro ? giro : giroNeutro(giro + 0.6);
    viajeInicio = performance.now();
    viajeDuracion = DURACION_VIAJE;
    viajando = true;
    arrancarBucle();
    return DURACION_VIAJE;
  }

  function animaContinuo() {
    if (reducido() || document.hidden || modo !== '3d') return false;
    if (Expo.esAnexo(Expo.actual)) return false;
    return viajando || verEscena || !!fundido || (vistaActual && vistaActual.giro) || medicion !== null || fondoAnima();
  }
  function fondoAnima() { return !!fondo && !fondoPausado && !reducido(); }
  /** Solo se mueve el fondo (estación quieta): se dibuja a FPS_FONDO. */
  function soloFondo() { return !viajando && !verEscena && !fundido && !(vistaActual && vistaActual.giro); }

  function pedirCuadros(n) {
    cuadrosPendientes = Math.max(cuadrosPendientes, n || 1);
    arrancarBucle();
  }
  function arrancarBucle() {
    if (!construido || modo !== '3d' || bucleId) return;
    previo = 0;
    bucleId = requestAnimationFrame(cuadro);
  }
  function detenerBucle() {
    cancelAnimationFrame(bucleId);
    bucleId = 0;
  }

  function cuadro(ahora) {
    bucleId = 0;
    if (modo !== '3d') return;
    var continuo = animaContinuo();
    var asentandoAntes = Math.abs(tiltObjX - tiltX) + Math.abs(tiltObjY - tiltY) > 0.0005;
    var lento = continuo && soloFondo() && cuadrosPendientes === 0 && !asentandoAntes;
    // Estación quieta: solo el fondo se mueve → un cuadro de cada dos (30 fps)
    if (lento && previo && ahora - previo < 1000 / FPS_FONDO - 4) { bucleId = requestAnimationFrame(cuadro); return; }
    var dtCrudo = previo ? ahora - previo : 0;
    var dt = Math.min(0.05, dtCrudo / 1000);
    previo = ahora;
    var flujoY = 0;

    // Viaje de cámara (ease-in-out): baja, se acerca y orbita con la misma curva
    if (viajando) {
      var p = Math.min(1, (ahora - viajeInicio) / viajeDuracion);
      var e = Expo.suavizarIO(p);
      vistaActual = mezclar(vistaDesde, vistaHacia, e);
      giro = giroDesde + (giroHacia - giroDesde) * e;
      // Las partículas se aceleran a mitad del viaje y fluyen hacia arriba (sensación de bajar)
      velParticulas = 1 + 5 * Math.sin(Math.PI * p);
      var sube = vistaHacia.ty < vistaDesde.ty ? 1 : -1;
      flujoY = dt * sube * 3.2 * Math.sin(Math.PI * p);
      if (p >= 1) {
        viajando = false; velParticulas = 1; cuadrosPendientes = Math.max(cuadrosPendientes, 2);
        // Un modelo que terminó de cargar durante el viaje entra al llegar
        if (pendienteModelo) { var pm = pendienteModelo; pendienteModelo = null; setTimeout(pm, 0); }
      }
    } else if (continuo && vistaActual && vistaActual.giro) {
      giro += dt * 0.12;
    }
    if (fundido) pasoFundido(ahora);
    if (!reducido()) tiempo += dt * velParticulas;

    // Fondo de materia y antimateria (quieto con movimiento reducido)
    var tf = performance.now();
    if (fondoAnima() && dt > 0 && !Expo.esAnexo(Expo.actual)) actualizarFondo(fondo, dt, flujoY);
    var costoF = performance.now() - tf;
    costoFondo.suma += costoF; costoFondo.n++;
    if (lento && dt > 0) vigilarFondo(dt);

    // Inclinación con el puntero (suavizada; solo cuando se ve la escena)
    var k = 1 - Math.exp(-dt * 4);
    tiltX += (tiltObjX - tiltX) * k;
    tiltY += (tiltObjY - tiltY) * k;
    inclinacion.rotation.x = tiltX;
    inclinacion.rotation.z = -tiltY * 0.4;
    raiz.rotation.y = giro + tiltY;
    if (fundido) fundido.saliente.rotation.y = raiz.rotation.y;

    if (vistaActual) aplicarVista(vistaActual);
    fondo.uTiempo.value = tiempo;

    var t0 = performance.now();
    renderer.render(escena, camara);
    var costo = performance.now() - t0;
    costoRender.suma += costo; costoRender.n++;

    // La prueba de fps solo cuenta los cuadros a ritmo completo (no los del fondo a 30 fps)
    if (dt > 0 && continuo && !lento) registrarFps(dt);
    if (medicion && dt > 0) {
      medicion.cuadros++; medicion.tiempo += dt; medicion.costo += costo; medicion.costoFondo += costoF;
      medicion.dtMax = Math.max(medicion.dtMax, dtCrudo / 1000);
    }

    if (cuadrosPendientes > 0) cuadrosPendientes--;
    // Tras asentarse la inclinación, se deja de dibujar si nada se mueve
    var asentando = Math.abs(tiltObjX - tiltX) + Math.abs(tiltObjY - tiltY) > 0.0005;
    if (continuo || cuadrosPendientes > 0 || asentando) bucleId = requestAnimationFrame(cuadro);
  }

  /* Prueba de rendimiento: promedio de fps en los primeros segundos animados.
     Si baja de FPS_MINIMO se pasa al modo clásico y se avisa. */
  function registrarFps(dt) {
    if (!pruebaFps.activa) return;
    // Si el usuario eligió el modo con el botón 3D/2D, su elección manda sobre la prueba
    if (forzado) { pruebaFps.activa = false; return; }
    // Decodificar el modelo real traba unos cuadros: esa pausa no es del equipo, no se cuenta
    if (cargaPausaFps) { pruebaFps.calentamiento = Math.max(pruebaFps.calentamiento, 0.4); return; }
    // Con la pestaña oculta o la ventana sin foco (p. ej. el proyector en otra pantalla al
    // cargar) el navegador frena requestAnimationFrame: esos cuadros no miden el equipo.
    if (document.visibilityState !== 'visible' || !document.hasFocus()) {
      pruebaFps.calentamiento = Math.max(pruebaFps.calentamiento, 0.6);
      return;
    }
    if (pruebaFps.calentamiento > 0) { pruebaFps.calentamiento -= dt; return; }
    pruebaFps.tiempo += dt;
    pruebaFps.cuadros++;
    if (pruebaFps.tiempo >= 2.5) {
      pruebaFps.activa = false;
      var fps = pruebaFps.cuadros / pruebaFps.tiempo;
      pruebaFps.resultado = Math.round(fps);
      if (fps < FPS_MINIMO) {
        activarClasico(false);
        avisar('Modo 2D para que todo vaya fluido (' + Math.round(fps) + ' fps en 3D).', {
          texto: 'Volver a 3D',
          alPulsar: function () { forzado = true; guardarPreferencia('3d'); activar3D(); }
        }, 3000);
      }
    }
  }

  /* Vigía del fondo: si en una estación el equipo no sostiene ~20 fps con las
     partículas en movimiento (3 s seguidos), el fondo se queda quieto y la
     escena vuelve a dibujarse solo cuando cambia algo. */
  function vigilarFondo(dt) {
    if (vigiaFondo.espera > 0) { vigiaFondo.espera -= dt; return; }
    vigiaFondo.t += dt; vigiaFondo.n++;
    if (vigiaFondo.t < 3) return;
    if (vigiaFondo.n / vigiaFondo.t < 20) fondoPausado = true;
    vigiaFondo.t = 0; vigiaFondo.n = 0;
  }

  /* ------------------------------------------------------------------
     Interfaz: vidrio, termómetro, botón de modo, aviso
     ------------------------------------------------------------------ */
  function crearInterfaz() {
    lienzo = document.getElementById('cv-candelabro');
    vidrio = document.getElementById('vidrio-3d');
    luz.el = vidrio ? vidrio.querySelector('.luz-cristal') : null;
    window.addEventListener('pointermove', moverLuz, { passive: true });
    btnModo = document.getElementById('btn-modo');

    termometro = Expo.crear('div', 'termometro');
    termometro.setAttribute('aria-hidden', 'true');
    var cab = Expo.crear('div', 'termo-cab', 'Temperatura');
    cab.appendChild(Expo.crear('small', null, 'aprox.'));
    termometro.appendChild(cab);
    var cuerpo = Expo.crear('div', 'termo-cuerpo');
    var pista = Expo.crear('div', 'termo-pista');
    var carro = Expo.crear('div', 'termo-carro');
    carro.appendChild(Expo.crear('i', 'termo-marca'));
    pista.appendChild(carro);
    cuerpo.appendChild(pista);
    var escala = Expo.crear('ol', 'termo-escala');
    PISOS.forEach(function (p) {
      var li = Expo.crear('li');
      li.appendChild(Expo.crear('b', null, p.temp));
      li.appendChild(Expo.crear('span', null, p.nombre));
      escala.appendChild(li);
    });
    cuerpo.appendChild(escala);
    termometro.appendChild(cuerpo);
    document.body.appendChild(termometro);

    barraTemp = Expo.crear('span', 'barra-temp');
    barraTemp.id = 'barra-temp';
    var izq = document.querySelector('.barra-izq');
    if (izq) izq.appendChild(barraTemp);

    if (btnModo) {
      btnModo.addEventListener('click', function () {
        if (modo === '3d') { activarClasico(true); }
        else { forzado = true; guardarPreferencia('3d'); activar3D(); }
      });
    }

    // Inclinación con el puntero
    window.addEventListener('pointermove', function (e) {
      if (modo !== '3d' || reducido() || primerPlano) return;   // en el primer plano el chip queda quieto
      var v = nombreVista(Expo.actual);
      if (!(verEscena || v === 'portada' || v === 'cierre')) return;
      tiltObjY = (e.clientX / window.innerWidth - 0.5) * 0.35;
      tiltObjX = (e.clientY / window.innerHeight - 0.5) * 0.16;
      arrancarBucle();
    }, { passive: true });

    // Tecla V: ocultar el panel para mirar el piso (y volver)
    document.addEventListener('keydown', function (e) {
      if (modo !== '3d' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'v' && e.key !== 'V') return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (document.getElementById('indice').classList.contains('abierto')) return;
      e.preventDefault();
      alternarVerEscena();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) detenerBucle();
      else if (modo === '3d') pedirCuadros(2);
    });
  }

  function alternarVerEscena(forzar) {
    var nuevo = forzar != null ? forzar : !verEscena;
    if (nuevo && nombreVista(Expo.actual) === 'anexo') nuevo = false;
    verEscena = nuevo;
    document.body.classList.toggle('ver-escena', verEscena);
    if (!verEscena) { tiltObjX = 0; tiltObjY = 0; }
    // Láminas 13 y 15: V lleva la cámara a un primer plano del chip (y de vuelta a la estación)
    var lamina = Expo.laminas[Expo.actual];
    var nombreChip = lamina && LAMINA_CHIP[lamina.id];
    if (verEscena && nombreChip && construido && modo === '3d') {
      var v = vistaPrimerPlano(nombreChip);
      if (v) { primerPlano = nombreChip; tiltObjX = 0; tiltObjY = 0; viajarA(v, true); }
    } else if (primerPlano) {
      primerPlano = null;
      if (construido && Expo.actual >= 0 && !Expo.esAnexo(Expo.actual)) viajarA(vistaDeLamina(Expo.actual), true);
    }
    document.body.classList.toggle('primer-plano', !!primerPlano);
    pedirCuadros(2);
  }

  /* Aviso discreto (toast en cristal). accion opcional: { texto, alPulsar } → botón.
     Se oculta solo a los ms indicados; con el puntero encima espera. */
  var avisoEl = null, avisoTimer = 0, avisoMs = 5200;
  function ocultarAviso() { if (avisoEl) avisoEl.classList.remove('visible'); }
  function programarOcultar(ms) { clearTimeout(avisoTimer); avisoTimer = setTimeout(ocultarAviso, ms); }
  function avisar(texto, accion, ms) {
    if (!avisoEl) {
      avisoEl = Expo.crear('div', 'aviso-modo');
      avisoEl.setAttribute('role', 'status');
      avisoEl.addEventListener('pointerenter', function () { clearTimeout(avisoTimer); });
      avisoEl.addEventListener('pointerleave', function () { if (avisoEl.classList.contains('visible')) programarOcultar(1500); });
      document.body.appendChild(avisoEl);
    }
    avisoEl.textContent = '';
    avisoEl.appendChild(Expo.crear('span', null, texto));
    avisoEl.classList.toggle('con-accion', !!accion);
    if (accion) {
      var b = Expo.crear('button', 'aviso-accion', accion.texto);
      b.type = 'button';
      b.addEventListener('click', function () { ocultarAviso(); accion.alPulsar(); });
      avisoEl.appendChild(b);
    }
    void avisoEl.offsetWidth;
    avisoEl.classList.add('visible');
    avisoMs = ms || 5200;
    programarOcultar(avisoMs);
  }

  function actualizarInterfaz(n) {
    var v = nombreVista(n);
    var piso = pisoDeLamina(n);
    document.body.dataset.vista = v;
    if (piso >= 0) pisoActual = piso;
    if (termometro) {
      termometro.style.setProperty('--k', pisoActual);
      Array.prototype.forEach.call(termometro.querySelectorAll('.termo-escala li'), function (li, k) {
        li.classList.toggle('on', k === pisoActual);
      });
    }
    if (barraTemp) {
      barraTemp.textContent = v === 'anexo' || piso < 0 ? '' : '· ' + PISOS[piso].temp + ' (aprox.)';
    }
  }

  function actualizarBoton() {
    if (!btnModo) return;
    btnModo.hidden = !hayWebGL();
    var es3d = modo === '3d';
    btnModo.setAttribute('aria-pressed', es3d ? 'true' : 'false');
    btnModo.textContent = es3d ? '3D' : '2D';
    btnModo.title = es3d ? 'Modo candelabro 3D (clic: modo clásico)' : 'Modo clásico (clic: modo candelabro 3D)';
    btnModo.setAttribute('aria-label', btnModo.title);
  }

  /* ------------------------------------------------------------------
     Gancho con la navegación (01-nucleo.js → irA)
     ------------------------------------------------------------------ */
  Expo.esperaAlEntrar = function (n, previa, rapido) {
    if (modo !== '3d') return 0;
    if (verEscena) alternarVerEscena(false);
    actualizarInterfaz(n);
    if (!construido) return 0;
    var anexo = Expo.esAnexo(n);
    if (anexo) { pedirCuadros(1); return 0; }   // anexo: sin viaje, la escena queda detrás
    var destino = vistaDeLamina(n);
    var mismoLugar = previa >= 0 && !Expo.esAnexo(previa) && vistaDeLamina(previa) &&
      nombreVista(previa) === nombreVista(n) && Expo.laminas[previa].dataset.bloque === Expo.laminas[n].dataset.bloque &&
      (Expo.laminas[previa].id === 'l-portada') === (Expo.laminas[n].id === 'l-portada');
    if (mismoLugar) return 0;                    // misma estación: solo cambia el panel
    var desdeAnexo = previa >= 0 && Expo.esAnexo(previa);
    var espera = viajarA(destino, !desdeAnexo && previa >= 0);
    if (espera) {
      Expo.sonar('piso', pisoDeLamina(n), vistaHacia.ty <= vistaDesde.ty, espera);
      document.body.classList.add('viajando');
      clearTimeout(finViaje);
      finViaje = setTimeout(function () { document.body.classList.remove('viajando'); }, espera - 60);
      return espera;
    }
    return 0;
  };

  /* ------------------------------------------------------------------
     Cambiar de modo
     ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------
     Paleta de cristal (dirección E) para los lienzos de las láminas.
     Los lienzos leen Expo.color / Expo.fuente en cada cuadro: basta con
     cambiar los valores (y devolverlos al volver al modo clásico).
     ------------------------------------------------------------------ */
  var FUENTE_CRISTAL = '"Segoe UI Variable Display", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif';
  var PALETA_CRISTAL = {
    papel: '#121b3a', papel2: 'rgba(255,255,255,0.10)', tinta: '#eef3ff', tinta2: '#c9d4ee', tinta3: '#aab6d6',
    noche: '#05070f', azul: '#8fd8ff', azul2: '#d6eeff', azulOscuro: '#5a7dff',
    hielo: '#eef3ff', tenue: '#aab6d6', alerta: '#ffc27a', violeta: '#c9a2ff', rotulo: '#dbe4f6'
  };
  var paletaClasica = null, fuentesClasicas = null;
  function aplicarPaletaCristal(activar) {
    if (!paletaClasica) {
      paletaClasica = {}; fuentesClasicas = {};
      Object.keys(Expo.color).forEach(function (k) { paletaClasica[k] = Expo.color[k]; });
      Object.keys(Expo.fuente).forEach(function (k) { fuentesClasicas[k] = Expo.fuente[k]; });
    }
    Object.keys(PALETA_CRISTAL).forEach(function (k) { Expo.color[k] = activar ? PALETA_CRISTAL[k] : paletaClasica[k]; });
    Object.keys(fuentesClasicas).forEach(function (k) { Expo.fuente[k] = activar ? FUENTE_CRISTAL : fuentesClasicas[k]; });
    Expo.cristal = !!activar;
    if (Expo.despertarBucles) Expo.despertarBucles();
  }

  /* Luz suave que sigue al puntero sobre el panel de cristal (resorte; solo transform) */
  var luz = { el: null, x: 0.5, y: 0.35, vx: 0, vy: 0, ox: 0.5, oy: 0.35, id: 0, previo: 0 };
  function moverLuz(e) {
    if (modo !== '3d' || !luz.el) return;
    var r = vidrio.getBoundingClientRect();
    if (!r.width) return;
    luz.ox = (e.clientX - r.left) / r.width;
    luz.oy = (e.clientY - r.top) / r.height;
    if (!luz.id) { luz.previo = 0; luz.id = requestAnimationFrame(pasoLuz); }
  }
  function pasoLuz(ahora) {
    luz.id = 0;
    var dt = luz.previo ? Math.min(0.05, (ahora - luz.previo) / 1000) : 0.016;
    luz.previo = ahora;
    if (reducido()) { luz.x = luz.ox; luz.y = luz.oy; luz.vx = luz.vy = 0; }
    else {
      luz.vx += ((luz.ox - luz.x) * 60 - luz.vx * 13) * dt;
      luz.vy += ((luz.oy - luz.y) * 60 - luz.vy * 13) * dt;
      luz.x += luz.vx * dt; luz.y += luz.vy * dt;
    }
    var r = vidrio.getBoundingClientRect();
    luz.el.style.transform = 'translate(' + (luz.x * r.width).toFixed(1) + 'px,' + (luz.y * r.height).toFixed(1) + 'px)';
    var quieta = Math.abs(luz.ox - luz.x) + Math.abs(luz.oy - luz.y) + Math.abs(luz.vx) + Math.abs(luz.vy) < 0.002;
    if (!quieta) luz.id = requestAnimationFrame(pasoLuz);
  }

  function activar3D() {
    if (!hayWebGL()) { activarClasico(false); return Promise.resolve(false); }
    modo = '3d';
    document.body.classList.add('modo-3d');
    aplicarPaletaCristal(true);
    actualizarBoton();
    actualizarInterfaz(Math.max(0, Expo.actual));
    return cargarThree().then(function () {
      if (modo !== '3d') return false;
      if (!construido) construir();
      vistaActual = null;
      if (Expo.actual >= 0) viajarA(vistaDeLamina(Expo.esAnexo(Expo.actual) ? (Expo.recorrido[0]) : Expo.actual), false);
      if (!forzado && !reducido()) { pruebaFps = { activa: true, tiempo: 0, cuadros: 0, calentamiento: 0.6 }; }
      ajustarTamano();
      pedirCuadros(3);
      document.body.classList.add('modo-3d-listo');
      return true;
    }).catch(function (err) {
      console.warn('Modo candelabro no disponible:', err && err.message);
      activarClasico(false);
      return false;
    });
  }

  function activarClasico(recordar) {
    modo = 'clasico';
    if (recordar) guardarPreferencia('clasico');
    detenerBucle();
    viajando = false;
    if (verEscena) alternarVerEscena(false);
    document.body.classList.remove('modo-3d', 'modo-3d-listo', 'viajando');
    delete document.body.dataset.vista;
    aplicarPaletaCristal(false);
    actualizarBoton();
  }

  /* ------------------------------------------------------------------
     Modelos .glb (data URI base64 → ArrayBuffer → GLTFLoader.parse)
     ------------------------------------------------------------------ */
  function dataUriABuffer(uri) {
    var coma = uri.indexOf(',');
    var bin = atob(uri.slice(coma + 1));
    var u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }

  /** Lee un .glb (data URI) con GLTFLoader; usa el decodificador meshopt si ya está cargado. */
  function parsearGlb(urlDatos) {
    return new Promise(function (ok, mal) {
      if (typeof urlDatos !== 'string' || urlDatos.indexOf('data:') !== 0) {
        mal(new Error('se espera un data URI base64 (file:// bloquea el fetch de .glb)'));
        return;
      }
      var cargador = new T.GLTFLoader();
      if (window.MeshoptDecoder) cargador.setMeshoptDecoder(window.MeshoptDecoder);
      cargador.parse(dataUriABuffer(urlDatos), '', ok, mal);
    });
  }
  /** Escena con contenido: los .glb de los chips traen antes una escena vacía (DECAL_*). */
  function escenaDe(gltf) {
    var mejor = gltf.scene;
    (gltf.scenes || []).forEach(function (s) { if (s.children.length > (mejor ? mejor.children.length : -1)) mejor = s; });
    return mejor;
  }

  /** Cambia el marcador provisional del chip `nombre` ('majorana1' | 'majorana2')
      por el modelo .glb de urlDatos (data URI base64). Devuelve una promesa.
      Si el destino es un ancla del modelo real (userData.ancla), el chip entra
      sin transformación (ya viene a escala real); si es el marcador del
      procedural, se escala y centra al tamaño del marcador. */
  function cargarChip(nombre, urlDatos) {
    if (!construido) {
      return new Promise(function (ok, mal) { colaChips.push([nombre, urlDatos, ok, mal]); });
    }
    var destino = chips[nombre];
    if (!destino) return Promise.reject(new Error('Chip desconocido: ' + nombre));
    return parsearGlb(urlDatos).then(function (gltf) {
      var modelo = escenaDe(gltf);
      if (!destino.userData.ancla) {
        var caja = new T.Box3().setFromObject(modelo);
        var tam = caja.getSize(new T.Vector3());
        var centro = caja.getCenter(new T.Vector3());
        var ref = destino.userData.tamano || new T.Vector3(0.6, 0.66, 0.06);
        var mayor = Math.max(tam.x, tam.y, tam.z) || 1;
        var escala = Math.max(ref.x, ref.y) / mayor;
        modelo.position.sub(centro.multiplyScalar(escala));
        modelo.scale.setScalar(escala);
      }
      while (destino.children.length) destino.remove(destino.children[0]);
      destino.add(modelo);
      destino.userData.provisional = false;
      pedirCuadros(2);
      return modelo;
    });
  }

  /* ------------------------------------------------------------------
     Modelo real (Blender): carga progresiva
     1. La portada se ve con el candelabro procedural.
     2. ESPERA_MODELO ms después (y en un momento libre del navegador) se
        cargan el decodificador meshopt y los tres scripts de modelos.
     3. Se decodifican, se montan los chips en sus anclas, se ajusta el oro y
        se precompilan los shaders.
     4. Fundido de FUNDIDO_MODELO ms del procedural al real; si hay un viaje
        en curso, se espera a que termine. Si algo falla, queda el procedural.
     En celular (pantalla compacta o táctil) no se carga: ahorra ~5,5 MB de
     scripts y ~150.000 triángulos. ?modelo=real / ?modelo=procedural lo fuerzan.
     ------------------------------------------------------------------ */
  /* Oro de las fotos de IBM y Google: más saturado y cálido que el F0 «físico»
     del .glb (que con RoomEnvironment se ve champán). Colores en sRGB. */
  var ORO_REAL = {
    oro: { color: 0xf0b04a, rugosidad: 0.2, entorno: 1 },
    oro_placas: { color: 0xe39b34, rugosidad: 0.72, entorno: 0.75 },  // rugosidad × la textura ORM (mecanizado); menos entorno: vista desde arriba se quemaba
    iman: { color: 0x1c2230, rugosidad: 0.5, entorno: 0.6, metal: 0.35 }   // no es oro: carcasa oscura como en el render de Blender
  };

  /** Estado del modelo, también en <body data-modelo> (se ve en --dump-dom y sirve a CSS). */
  function marcarModelo(e) {
    estadoModelo = e;
    document.body.dataset.modelo = e;
  }

  function quiereModeloReal() {
    var m = /[?&]modelo=(real|procedural)\b/i.exec(location.search);
    if (m) return m[1].toLowerCase() === 'real';
    return !(compacto() || consultaTactil.matches);
  }

  function programarModeloReal() {
    if (estadoModelo !== 'procedural') return;
    if (!quiereModeloReal()) { marcarModelo('omitido'); return; }
    marcarModelo('cargando');
    var ocioso = window.requestIdleCallback || function (f) { return setTimeout(f, 0); };
    setTimeout(function () { ocioso(cargarModeloReal, { timeout: 1500 }); }, ESPERA_MODELO);
  }

  function cargarModeloReal() {
    var t0 = performance.now();
    var cand = MODELO_REAL.candelabro;
    var glbChips = {};
    cargarScript(MODELO_REAL.decodificador)
      .then(function () {
        if (!window.MeshoptDecoder || !window.MeshoptDecoder.supported) throw new Error('el navegador no tiene WebAssembly (meshopt)');
        return window.MeshoptDecoder.ready;
      })
      .then(function () { return cargarScript(cand.archivo); })
      .then(function () {
        // Los chips son opcionales: si uno falla, queda su marcador provisional
        return MODELO_REAL.chips.reduce(function (p, c) {
          return p.then(function () { return cargarScript(c.archivo).catch(function () { return null; }); });
        }, Promise.resolve());
      })
      .then(function () {
        cargaPausaFps = true;
        var datos = window[cand.variable];
        window[cand.variable] = null;             // el texto base64 ya no hace falta
        return parsearGlb(datos);
      })
      .then(function (gltf) {
        return MODELO_REAL.chips.reduce(function (p, c) {
          return p.then(function () {
            var datos = window[c.variable];
            window[c.variable] = null;
            if (!datos) return null;
            return parsearGlb(datos).then(function (g) { glbChips[c.nombre] = g; }, function () { return null; });
          });
        }, Promise.resolve()).then(function () { return gltf; });
      })
      .then(function (gltf) {
        var armado = armarModeloReal(gltf, glbChips);
        precompilar(armado.grupo);
        detalleModelo.ms = Math.round(performance.now() - t0);
        var aplicar = function () {
          if (estadoModelo !== 'cargando') return;
          usarModelo(armado.grupo, {
            anclas: armado.anclas, encuadres: ENCUADRES_REAL, chips: armado.chips,
            vistas: armado.vistas, luzChip: armado.luzChip, fundido: modo === '3d'
          });
          marcarModelo('real');
          cargaPausaFps = false;
          document.body.classList.add('modelo-real');
        };
        if (viajando) pendienteModelo = aplicar;
        else aplicar();
      })
      .catch(function (err) {
        marcarModelo('fallo');
        cargaPausaFps = false;
        detalleModelo.error = err && err.message ? err.message : String(err);
        // Sin error en consola: queda el candelabro procedural (aviso discreto para quien depure)
        console.info('Candelabro: se queda el modelo procedural (' + detalleModelo.error + ')');
      });
  }

  /** Arma el grupo del modelo real: escala, anclas, chips, oro y luz de los chips. */
  function armarModeloReal(gltf, glbChips) {
    var grupo = new T.Group();
    grupo.name = 'candelabro-real';
    var modelo = escenaDe(gltf);
    modelo.scale.setScalar(ESCALA_REAL);
    grupo.add(modelo);
    grupo.updateMatrixWorld(true);

    // Anclas de los pisos (y en unidades de la escena)
    var p = new T.Vector3();
    var anclas = [];
    for (var i = 1; i <= PISOS.length; i++) {
      var a = modelo.getObjectByName('ancla_piso_' + i);
      if (!a) throw new Error('falta ancla_piso_' + i);
      anclas.push(a.getWorldPosition(p).y);
    }

    // Chips: cada .glb va como hijo de su ancla, sin transformación
    var nuevos = {};
    MODELO_REAL.chips.forEach(function (c) {
      var ancla = modelo.getObjectByName(c.ancla);
      if (!ancla) throw new Error('falta ' + c.ancla);
      var cont = new T.Group();
      cont.name = 'chip-' + c.nombre;
      cont.userData.ancla = true;
      if (glbChips[c.nombre]) {
        cont.add(escenaDe(glbChips[c.nombre]));
        cont.userData.provisional = false;
      } else {
        // Respaldo: el marcador provisional (en metros), con materiales propios
        var marcador = crearChipProvisional(c.nombre);
        marcador.traverse(function (o) { if (o.material) o.material = o.material.clone(); });
        marcador.scale.setScalar(1 / ESCALA_REAL);
        cont.add(marcador);
        cont.userData.provisional = true;
      }
      ancla.add(cont);
      nuevos[c.nombre] = cont;
    });

    // Oro más intenso y cálido (la placa superior es acero y se queda plateada)
    modelo.traverse(function (o) {
      if (!o.isMesh) return;
      var ajuste = ORO_REAL[o.material.name];
      if (ajuste && !o.material.userData.oroAjustado) {
        o.material.color.set(ajuste.color).convertSRGBToLinear();
        o.material.roughness = ajuste.rugosidad;
        o.material.envMapIntensity = ajuste.entorno;
        if (ajuste.metal != null) o.material.metalness = ajuste.metal;
        o.material.userData.oroAjustado = true;
      }
      o.matrixAutoUpdate = false;   // piezas fijas dentro del modelo: no recalcular matrices
    });

    // Luz fría frente a los chips (para leer sus textos en el primer plano)
    grupo.updateMatrixWorld(true);
    var caja = new T.Box3();
    Object.keys(nuevos).forEach(function (k) { caja.expandByObject(nuevos[k]); });
    var centro = caja.isEmpty() ? new T.Vector3(0, anclas[5] - 1.3, 0) : caja.getCenter(new T.Vector3());
    var luz = new T.PointLight(0xcfe2ff, 0.7, 5, 2);
    // Al costado y arriba: su reflejo especular cae fuera del primer plano (no quema el oro)
    luz.position.set(centro.x + 2.2, centro.y + 1.2, centro.z + 1.0);
    grupo.add(luz);

    // Portada y cierre: el modelo real es algo más alto (tubo de pulso arriba)
    var vistas = {
      portada: { tx: 0, ty: -4.6, az: 4.3, D: 18.2, h: 3.2, giro: true },
      cierre: { tx: 5.6, ty: -3.9, az: -0.5, D: 19, h: 1.8, giro: true }
    };
    return { grupo: grupo, anclas: anclas, chips: nuevos, luzChip: luz, vistas: vistas };
  }

  /** Compila shaders y sube texturas antes del fundido (evita el tirón del primer cuadro). */
  function precompilar(grupo) {
    try {
      escena.add(grupo);
      renderer.compile(escena, camara);
      grupo.traverse(function (o) {
        if (!o.material) return;
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach(function (k) {
          if (o.material[k] && renderer.initTexture) renderer.initTexture(o.material[k]);
        });
      });
    } finally {
      escena.remove(grupo);
    }
  }

  /* ------------------------------------------------------------------
     API pública (también sirve para las pruebas)
     ------------------------------------------------------------------ */
  window.Candelabro = {
    cargarChip: cargarChip,
    usarModelo: usarModelo,
    modo: function () { return modo; },
    activar3D: function () { forzado = true; return activar3D(); },
    activarClasico: function () { activarClasico(false); },
    verEscena: alternarVerEscena,
    estado: function () {
      return {
        modo: modo, construido: construido, viajando: viajando, bucleActivo: !!bucleId,
        fpsPrueba: pruebaFps.resultado || null,
        costoRenderMs: costoRender.n ? +(costoRender.suma / costoRender.n).toFixed(2) : null,
        fondo: fondo ? { particulas: fondo.n, aniquilaciones: fondo.aniquilaciones, pausado: fondoPausado, animado: fondoAnima(), costoMs: costoFondo.n ? +(costoFondo.suma / costoFondo.n).toFixed(3) : null } : null,
        vista: vistaActual ? { az: +vistaActual.az.toFixed(3), ty: +vistaActual.ty.toFixed(2), D: +vistaActual.D.toFixed(2) } : null, giro: +giro.toFixed(3),
        chips: Object.keys(chips).map(function (k) { return k + (chips[k].userData.provisional ? ' (provisional)' : ' (modelo)'); }),
        modelo: { estado: estadoModelo, cargaMs: detalleModelo.ms, error: detalleModelo.error, fundiendo: !!fundido, primerPlano: primerPlano },
        anclas: ESTACIONES.map(function (e) { return +e.ty.toFixed(3); }),
        renderer: renderer ? { llamadas: renderer.info.render.calls, triangulos: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio() } : null
      };
    },
    /** Posición en pantalla (px) del último destello (para pruebas). */
    ultimoDestello: function () {
      if (!fondo || fondo.ultimo == null) return null;
      var d = fondo.ultimo, v = new T.Vector3(fondo.dPos[d * 3], fondo.dPos[d * 3 + 1], fondo.dPos[d * 3 + 2]).project(camara);
      return { x: Math.round((v.x + 1) / 2 * window.innerWidth), y: Math.round((1 - v.y) / 2 * window.innerHeight), edad: +fondo.dEdad[d].toFixed(3), n: fondo.aniquilaciones };
    },
    /** Mide fps y costo de render (CPU) con la escena en movimiento durante ms milisegundos. */
    medir: function (ms) {
      return new Promise(function (ok) {
        if (modo !== '3d' || !construido) { ok(null); return; }
        medicion = { cuadros: 0, tiempo: 0, costo: 0, costoFondo: 0, dtMax: 0 };
        arrancarBucle();
        setTimeout(function () {
          var m = medicion;
          medicion = null;
          ok({ fps: m.tiempo ? +(m.cuadros / m.tiempo).toFixed(1) : 0, costoRenderMs: m.cuadros ? +(m.costo / m.cuadros).toFixed(2) : 0, costoFondoMs: m.cuadros ? +(m.costoFondo / m.cuadros).toFixed(3) : 0, peorCuadroMs: Math.round(m.dtMax * 1000), cuadros: m.cuadros });
        }, ms || 3000);
      });
    }
  };

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  /* Se decide ya (el script va al final del <body>), para que el modo 3D no
     muestre un instante el papel del modo clásico. */
  var quiere3d = (function () {
    var param = parametroModo();
    var pref = leerPreferencia();
    if (param === 'clasico') return false;
    if (param === '3d') { forzado = true; return true; }
    if (pref === 'clasico') return false;
    forzado = pref === '3d';
    return true;
  })() && hayWebGL();
  if (quiere3d) { document.body.classList.add('modo-3d'); aplicarPaletaCristal(true); }

  function iniciar() {
    crearInterfaz();
    if (quiere3d) activar3D();
    else activarClasico(false);
  }

  // Después del arranque del núcleo (que corre en DOMContentLoaded)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(iniciar, 0); });
  else setTimeout(iniciar, 0);
})();

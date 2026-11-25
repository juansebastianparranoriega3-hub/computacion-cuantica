/* =====================================================================
   08-chips.js — Los chips Majorana en el modo candelabro 3D
   (láminas 13 «Majorana 1» y 15 «Majorana 2»). Depende de 06-candelabro.js.

   1. Capa HUD del primer plano (tecla V): etiquetas de componentes con una
      línea que se dibuja hasta la pieza (posición proyectada de la malla
      3D a pantalla en cada cuadro) y tarjetas de datos curiosos al costado.
      Solo visual: sin interacción. Entra escalonada al terminar el viaje de
      la cámara y se va al salir con V o al cambiar de lámina.
   2. Visor 3D del chip en el panel de la lámina: segundo WebGLRenderer
      pequeño, compartido por los dos chips (se prepara una vez en un momento
      libre; fuera de las láminas 13 y 15 no dibuja y su lienzo se quita). Usa las mismas geometrías y materiales del .glb ya
      cargado (clone() comparte geometría y material). Se gira arrastrando,
      con inercia y límites suaves; en reposo se balancea. Mientras el modelo
      no esté o si falla, se queda la foto. Modo clásico y celular: la foto.

   Textos: materiales/documento-texto.txt (línea entre paréntesis).
   ===================================================================== */
(function () {
  'use strict';

  var Expo = window.Expo;
  var C3 = window.Candelabro;
  if (!Expo || !C3 || !C3.escuchar) return;

  /* ------------------------------------------------------------------
     Datos de cada chip
     Puntos de las etiquetas: pieza del .glb (malla agrupada por material),
     material de la sub-malla (opcional) y posición dentro de su caja local
     (fracciones x, y, z; y = 1 es la cara de arriba del chip). Ajustados a
     mano mirando el primer plano para que la línea caiga sobre la pieza.
     ------------------------------------------------------------------ */
  var CHIPS = {
    majorana1: {
      lamina: 'l-majorana1',
      titulo: 'Majorana 1',
      dado: { pieza: 'dado', material: 'dado_m1', f: [0.5, 1, 0.5] },
      etiquetas: [
        { nombre: 'Procesador cuántico', sub: 'núcleo topológico', punto: { pieza: 'dado', material: 'dado_m1', f: [0.5, 1, 0.5] } },
        { nombre: 'Conectores de señal', punto: { pieza: 'conectores', material: 'oro_pulido', f: [0.257, 1, 0.907] } },
        { nombre: 'Marco de cobre dorado', punto: { pieza: 'marco', f: [0.03, 1, 0.645] } },
        { nombre: 'Placa de circuito', punto: { pieza: 'pcb', material: 'pcb_m1', f: [0.183, 1, 0.294] } }
      ],
      datos: [
        '8 qubits topológicos — según Microsoft',                              // (388)
        'Diseñado para crecer hasta 1 millón de qubits (meta, no logro)',      // (388, 390)
        'Topoconductor: arseniuro de indio + aluminio',                        // (370–373)
        'Guarda el 0 y el 1 en la paridad: par o impar de electrones'          // (376)
      ]
    },
    majorana2: {
      lamina: 'l-majorana2',
      titulo: 'Majorana 2',
      dado: { pieza: 'dado', material: 'dado_m2', f: [0.5, 1, 0.5] },
      etiquetas: [
        { nombre: 'Procesador cuántico', sub: '2.ª generación', punto: { pieza: 'dado', material: 'dado_m2', f: [0.5, 1, 0.5] } },
        { nombre: 'Conectores de señal', punto: { pieza: 'conectores', material: 'oro_tira', f: [0.093, 1, 0.81] } },
        { nombre: 'Marco dorado', punto: { pieza: 'marco', material: 'oro_espejo_web', f: [0.03, 1, 0.2] } },
        { nombre: 'Placa de circuito', punto: { pieza: 'pcb', material: 'pcb_m2', f: [0.053, 1, 0.398] } }
      ],
      datos: [
        'Cambia el aluminio por plomo',                                        // (395)
        '1.000 veces más fiable — según Microsoft',                            // (396)
        'Vida media de ~20 s (hasta 1 min)',                                   // (396)
        'Material diseñado con ayuda de IA (Microsoft Discovery)',             // (397)
        'Meta: sistema escalable en 2029 (objetivo anunciado)'                 // (352, 398)
      ]
    }
  };

  function laminaActiva() { return Expo.laminas[Expo.actual] || null; }
  function rem() { return Expo.rem(); }

  /** Sub-malla del punto (pieza + material) dentro del chip. */
  function mallaDe(raiz, punto) {
    var pieza = raiz.getObjectByName(punto.pieza);
    if (!pieza) return null;
    var hallada = null;
    pieza.traverse(function (o) {
      if (hallada || !o.isMesh) return;
      if (!punto.material || (o.material && o.material.name === punto.material)) hallada = o;
    });
    return hallada;
  }

  /** Punto local (en la geometría) de una malla según las fracciones f. */
  function puntoLocal(T, malla, f) {
    var g = malla.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    var b = g.boundingBox;
    return new T.Vector3(
      b.min.x + (b.max.x - b.min.x) * f[0],
      b.min.y + (b.max.y - b.min.y) * f[1],
      b.min.z + (b.max.z - b.min.z) * f[2]);
  }

  /* ==================================================================
     1. HUD del primer plano
     ================================================================== */
  var NS = 'http://www.w3.org/2000/svg';
  var hud = null;   // { el, svg, nombre, items: [{ etq, linea, punto, malla, local }], datos, cajaChip, activo }
  var hudTimer = 0, hudOcultar = 0;
  var v3 = null;

  function crearHud(nombre) {
    var T = C3.three();
    var datos = CHIPS[nombre];
    var chip = C3.chipModelo(nombre);
    var el = Expo.crear('div', 'chip-hud');
    el.setAttribute('aria-hidden', 'true');
    el.dataset.chip = nombre;

    // Etiquetas con línea (solo con el modelo real y si hay sitio: no en pantallas compactas)
    var items = [];
    var conLineas = !!(chip && T && !C3.compacto());
    var svg = null;
    if (conLineas) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'chip-hud-lineas');
      el.appendChild(svg);
      datos.etiquetas.forEach(function (d, i) {
        var malla = mallaDe(chip, d.punto);
        if (!malla) return;
        var linea = document.createElementNS(NS, 'path');
        linea.setAttribute('class', 'chip-hud-linea');
        linea.setAttribute('pathLength', '1');
        var punto = document.createElementNS(NS, 'circle');
        punto.setAttribute('class', 'chip-hud-punto');
        punto.setAttribute('r', '5');
        svg.appendChild(linea);
        svg.appendChild(punto);
        var etq = Expo.crear('div', 'chip-hud-etq');
        var pastilla = Expo.crear('span', 'chip-hud-pastilla', d.nombre);
        if (d.sub) pastilla.appendChild(Expo.crear('small', null, d.sub));
        etq.appendChild(pastilla);
        el.appendChild(etq);
        // Escalonado: cada línea 70 ms después de la anterior; su pastilla, al llegar la línea
        var orden = items.length;
        linea.style.transitionDelay = (orden * 70) + 'ms';
        punto.style.transitionDelay = (orden * 70) + 'ms';
        pastilla.style.transitionDelay = (orden * 70 + 220) + 'ms';
        items.push({ etq: etq, pastilla: pastilla, linea: linea, punto: punto, malla: malla, local: puntoLocal(T, malla, d.punto.f), x: 0, y: 0, d: '' });
      });
    }

    var caja = Expo.crear('div', 'chip-hud-datos');
    caja.appendChild(Expo.crear('span', 'chip-hud-cab', 'Datos curiosos · ' + datos.titulo));
    datos.datos.forEach(function (t, i) {
      var tarjeta = Expo.crear('p', 'chip-hud-dato', t);
      tarjeta.style.transitionDelay = (180 + i * 70) + 'ms';
      caja.appendChild(tarjeta);
    });
    caja.firstChild.style.transitionDelay = '120ms';
    el.appendChild(caja);
    el.classList.toggle('sin-lineas', !conLineas);
    document.body.appendChild(el);
    return { el: el, svg: svg, nombre: nombre, chip: chip, items: items, medidas: null, activo: true };
  }

  /** Coloca etiquetas y líneas: proyecta cada punto 3D con la cámara de la escena. */
  function colocarHud() {
    if (!hud || !hud.activo || !hud.items.length) return;
    var T = C3.three(), cam = C3.camara();
    if (!T || !cam) return;
    if (!v3) v3 = new T.Vector3();
    var W = window.innerWidth, H = window.innerHeight, r = rem();
    cam.updateMatrixWorld();

    // Caja del chip en pantalla (8 esquinas de su caja en el mundo)
    var caja = new T.Box3().setFromObject(hud.chip);
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (var k = 0; k < 8; k++) {
      v3.set(k & 1 ? caja.max.x : caja.min.x, k & 2 ? caja.max.y : caja.min.y, k & 4 ? caja.max.z : caja.min.z).project(cam);
      var sx = (v3.x + 1) / 2 * W, sy = (1 - v3.y) / 2 * H;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }

    // Medidas de las pastillas (se leen una vez por tamaño de ventana)
    var clave = W + 'x' + H;
    if (!hud.medidas || hud.medidas.clave !== clave) {
      hud.medidas = { clave: clave, tam: hud.items.map(function (it) { return { w: it.etq.offsetWidth, h: it.etq.offsetHeight }; }) };
    }

    // Anclas en pantalla
    hud.items.forEach(function (it) {
      v3.copy(it.local).applyMatrix4(it.malla.matrixWorld).project(cam);
      it.x = (v3.x + 1) / 2 * W;
      it.y = (1 - v3.y) / 2 * H;
    });

    // Columna izquierda: a la izquierda del chip, ordenadas por altura (las líneas no se cruzan)
    var orden = hud.items.slice().sort(function (a, b) { return a.y - b.y; });
    var hueco = r * 0.9;
    var arriba = Math.max(r * 1.2, y0), abajo = Math.min(H - r * 4, y1);
    var ys = [];
    orden.forEach(function (it, i) {
      var h = hud.medidas.tam[hud.items.indexOf(it)].h;
      var y = Math.max(it.y - h / 2, arriba);
      if (i) y = Math.max(y, ys[i - 1].y + ys[i - 1].h + hueco);
      ys.push({ y: y, h: h });
    });
    // Si la última se pasa por abajo, se sube todo el bloque
    var exceso = ys.length ? ys[ys.length - 1].y + ys[ys.length - 1].h - abajo : 0;
    if (exceso > 0) ys.forEach(function (s) { s.y = Math.max(r * 1.2, s.y - exceso); });

    var bordeDer = x0 - r * 1.6;   // borde derecho de las pastillas
    orden.forEach(function (it, i) {
      var t = hud.medidas.tam[hud.items.indexOf(it)];
      var px = Math.max(r * 0.8, bordeDer - t.w), py = ys[i].y;
      it.etq.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px)';
      // Línea: sale del borde de la pastilla, corre en horizontal y baja en diagonal hasta la pieza
      var bx = px + t.w + r * 0.35, by = py + t.h / 2;
      var codo = Math.min(it.x - r * 0.8, bx + r * 1.6);
      var d = 'M' + bx.toFixed(1) + ' ' + by.toFixed(1) + 'H' + codo.toFixed(1) + 'L' + it.x.toFixed(1) + ' ' + it.y.toFixed(1);
      if (d !== it.d) { it.linea.setAttribute('d', d); it.d = d; }
      it.punto.setAttribute('cx', it.x.toFixed(1));
      it.punto.setAttribute('cy', it.y.toFixed(1));
    });
  }

  function mostrarHud(nombre, espera) {
    quitarHud(true);
    clearTimeout(hudTimer);
    // Entra cuando la cámara ya llegó al primer plano
    hudTimer = setTimeout(function () {
      if (C3.primerPlano() !== nombre) return;
      hud = crearHud(nombre);
      colocarHud();
      void hud.el.offsetWidth;          // estado inicial pintado antes de la transición
      hud.el.classList.add('visible');
    }, Math.max(0, (espera || 0) - 80));
  }

  function quitarHud(inmediato) {
    clearTimeout(hudTimer);
    if (!hud) return;
    var viejo = hud;
    hud = null;
    viejo.activo = false;
    viejo.el.classList.add('saliendo');
    clearTimeout(hudOcultar);
    if (inmediato) { viejo.el.remove(); return; }
    hudOcultar = setTimeout(function () { viejo.el.remove(); }, 200);
  }

  C3.escuchar('primerPlano', function (nombre, espera) {
    if (nombre && CHIPS[nombre]) mostrarHud(nombre, espera);
    else quitarHud(false);
  });
  C3.escuchar('cuadro', function () {
    colocarHud();
  });
  window.addEventListener('resize', function () { if (hud) { hud.medidas = null; colocarHud(); } });

  /* ==================================================================
     2. Visor 3D del chip en el panel
     Un solo WebGLRenderer pequeño («motor») para los dos chips: crear un
     contexto y compilar sus shaders traba ~0,5–0,7 s (medido), así que se
     prepara una vez, en un momento libre después de cargar el modelo real,
     y se reutiliza: al entrar a la lámina su lienzo se pone en la tarjeta y
     su bucle arranca; al salir se quita el lienzo y el bucle se detiene (no
     dibuja nada). El contexto se libera al pasar al modo clásico.
     No se dibuja en el lienzo principal con tijera: el panel de cristal lo
     desenfoca (backdrop-filter) y el chip se vería borroso.
     ================================================================== */
  var motor = null;   // { renderer, lienzo, escena, camara, pivote, entorno, chips: { nombre: { grupo, mallaDado, localDado } }, ms }
  var visor = null;   // visita actual: { nombre, tarjeta, marca, pista, ang, vel, … }
  var LIM_GIRO = 50 * Math.PI / 180;     // izquierda/derecha (más allá se vería la parte de atrás)
  var LIM_INCL = 28 * Math.PI / 180;     // arriba/abajo
  var REPOSO_MS = 1400;                  // tras soltar, cuánto espera el balanceo

  function puedeVisor() {
    return C3.modo() === '3d' && !C3.compacto() && !!C3.three() && !!C3.raiz();
  }

  /** Copia de un chip (comparte geometría y materiales) con la orientación del primer plano. */
  function copiaChip(T, nombre) {
    var origen = C3.chipModelo(nombre);
    if (!origen || !origen.children.length) return null;
    var modelo = origen.children[0];
    var raiz = C3.raiz();
    raiz.updateMatrixWorld(true);
    // Orientación respecto del candelabro, sin el giro de la escena (= la del primer plano)
    var rel = new T.Matrix4().copy(raiz.matrixWorld).invert().multiply(modelo.matrixWorld);
    var q = new T.Quaternion();
    rel.decompose(new T.Vector3(), q, new T.Vector3());
    var copia = modelo.clone(true);
    copia.position.set(0, 0, 0);
    copia.scale.setScalar(1);
    copia.quaternion.copy(q);
    var grupo = new T.Group();
    grupo.add(copia);
    var caja = new T.Box3().setFromObject(copia);
    var tam = caja.getSize(new T.Vector3()), centro = caja.getCenter(new T.Vector3());
    var s = 1 / Math.max(tam.x, tam.y);
    grupo.scale.setScalar(s);
    grupo.position.copy(centro).multiplyScalar(-s);
    var mallaDado = mallaDe(copia, CHIPS[nombre].dado);
    return {
      grupo: grupo, mallaDado: mallaDado,
      localDado: mallaDado ? puntoLocal(T, mallaDado, CHIPS[nombre].dado.f) : null
    };
  }

  /** Crea el renderer, la escena y las copias de los chips; compila y sube todo una vez. */
  function crearMotor() {
    var T = C3.three();
    var t0 = performance.now();
    var lienzo = document.createElement('canvas');
    lienzo.className = 'chip-visor';
    lienzo.setAttribute('data-interactivo', '');
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: lienzo, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      return null;   // sin contexto WebGL: se queda la foto
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // La misma luz del candelabro: RoomEnvironment + luz cálida + contraluz azul + luz fría de los chips
    var escena = new T.Scene();
    var pmrem = new T.PMREMGenerator(renderer);
    var entorno = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    escena.environment = entorno;
    var clave = new T.DirectionalLight(0xfff1dc, 1.1); clave.position.set(5, 6, 7); escena.add(clave);
    var contra = new T.DirectionalLight(0x5f8dff, 0.9); contra.position.set(-6, -4, -5); escena.add(contra);
    var fria = new T.DirectionalLight(0xcfe2ff, 0.45); fria.position.set(2.2, 1.2, 1); escena.add(fria);
    escena.add(new T.HemisphereLight(0x9cc0ff, 0x1a1208, 0.35));

    var pivote = new T.Group();
    escena.add(pivote);
    var chips = {};
    Object.keys(CHIPS).forEach(function (k) {
      var c = copiaChip(T, k);
      if (!c) return;
      chips[k] = c;
      pivote.add(c.grupo);
    });

    var camara = new T.PerspectiveCamera(26, 1, 0.05, 20);
    // El lienzo sobresale de la tarjeta 3rem por lado: el chip (lado mayor = 1) ocupa ~85 % de la tarjeta,
    // con margen para girar sin salirse
    var D = 1.42 / (2 * Math.tan(13 * Math.PI / 180));
    camara.position.set(0, D * 0.08, D);
    camara.lookAt(0, 0, 0);

    // Compilar shaders y subir geometría ahora (un cuadro pequeño con los dos chips)
    renderer.setSize(64, 64, false);
    renderer.compile(escena, camara);
    renderer.render(escena, camara);
    Object.keys(chips).forEach(function (k) { chips[k].grupo.visible = false; });

    var m = { renderer: renderer, lienzo: lienzo, escena: escena, camara: camara, pivote: pivote, entorno: entorno, chips: chips, ms: 0, p: new T.Vector3() };
    configurarArrastre(m);
    m.ms = Math.round(performance.now() - t0);
    return m;
  }

  function destruirMotor() {
    salirVisor();
    if (!motor) return;
    // Solo se libera lo de ESTE contexto (geometrías y materiales son del modelo de la escena)
    motor.entorno.dispose();
    motor.renderer.dispose();
    motor.renderer.forceContextLoss();
    motor = null;
  }

  /* Preparación en segundo plano: tras cargar el modelo real, en un momento
     libre del navegador y fuera de los viajes de cámara. */
  var precalentando = 0;
  function precalentar(pronto) {
    if (motor || precalentando || !puedeVisor()) return;
    if (!Object.keys(CHIPS).some(function (k) { return C3.chipModelo(k); })) return;
    var ocioso = window.requestIdleCallback || function (f) { return setTimeout(f, 0); };
    precalentando = setTimeout(function () {
      ocioso(function () {
        precalentando = 0;
        if (motor || !puedeVisor()) return;
        var b = document.body.classList;
        if (b.contains('viajando') || b.contains('ver-escena') || C3.estado().modelo.fundiendo) { precalentar(pronto); return; }
        try { motor = crearMotor(); } catch (err) { console.warn('Visor del chip: se queda la foto', err); motor = null; }
        if (motor) revisarVisor();
      }, { timeout: pronto ? 300 : 4000 });
    }, pronto ? 700 : 1500);
  }

  /* --- Arrastre con inercia y límites suaves (eventos del lienzo, una vez) */
  function limiteSuave(valor, delta, lim) {
    // Más allá del límite el chip cede cada vez menos (como una goma)
    var fuera = Math.abs(valor) > lim && Math.sign(delta) === Math.sign(valor);
    return fuera ? delta * Math.exp(-(Math.abs(valor) - lim) * 14) : delta;
  }
  function configurarArrastre(m) {
    var lienzo = m.lienzo;
    lienzo.addEventListener('pointerdown', function (e) {
      var v = visor;
      if (!v || v.arrastre || (e.pointerType === 'mouse' && e.button !== 0)) return;   // un solo puntero
      lienzo.setPointerCapture(e.pointerId);
      v.arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
      v.vel.x = v.vel.y = 0;
      lienzo.classList.add('arrastrando');
      pedirCuadro();
    });
    lienzo.addEventListener('pointermove', function (e) {
      var v = visor, a = v && v.arrastre;
      if (!a || a.id !== e.pointerId) return;
      var ahora = performance.now(), dt = Math.max(1, ahora - a.t) / 1000;
      var k = Math.PI / Math.max(200, v.ancho);       // todo el ancho del lienzo = 180°
      var dy = limiteSuave(v.ang.y, (e.clientX - a.x) * k, LIM_GIRO);
      var dx = limiteSuave(v.ang.x, (e.clientY - a.y) * k, LIM_INCL);
      v.ang.y += dy; v.ang.x += dx;
      // Velocidad suavizada (para la inercia al soltar)
      v.vel.y = v.vel.y * 0.6 + (dy / dt) * 0.4;
      v.vel.x = v.vel.x * 0.6 + (dx / dt) * 0.4;
      a.x = e.clientX; a.y = e.clientY; a.t = ahora;
      pedirCuadro();
    });
    function soltar(e) {
      var v = visor;
      if (!v || !v.arrastre || v.arrastre.id !== e.pointerId) return;
      // Si el puntero se quedó quieto antes de soltar, no hay inercia
      if (performance.now() - v.arrastre.t > 80 || Expo.reducido) v.vel.x = v.vel.y = 0;
      v.arrastre = null;
      v.ultimoToque = performance.now();
      lienzo.classList.remove('arrastrando');
      pedirCuadro();
    }
    lienzo.addEventListener('pointerup', soltar);
    lienzo.addEventListener('pointercancel', soltar);
    lienzo.addEventListener('lostpointercapture', soltar);
  }

  /* --- Bucle del visor: solo corre con la lámina activa y el panel a la vista */
  function pausado() {
    return document.hidden || document.body.classList.contains('ver-escena') || C3.modo() !== '3d';
  }
  function pedirCuadro() {
    if (visor && !visor.id) { visor.previo = 0; visor.id = requestAnimationFrame(pasoVisor); }
  }
  function pasoVisor(ahora) {
    var v = visor;
    if (!v) return;
    v.id = 0;
    if (pausado() || !motor) return;   // se reanuda con pedirCuadro()
    var dt = v.previo ? Math.min(0.05, (ahora - v.previo) / 1000) : 0;
    v.previo = ahora;
    var mueve = fisica(v, dt, ahora);
    var tc = performance.now();
    motor.pivote.rotation.set(v.ang.x, v.ang.y, 0);
    motor.renderer.render(motor.escena, motor.camara);
    if (dt) { v.fps.cuadros++; v.fps.t += dt; v.fps.costo += performance.now() - tc; }
    colocarMarca(v);
    if (!v.listo) { v.listo = true; v.tarjeta.classList.add('visor-listo'); }
    if (mueve || v.arrastre) v.id = requestAnimationFrame(pasoVisor);   // sigue sin reiniciar el reloj
  }

  /** Inercia, vuelta suave dentro de los límites y balanceo en reposo. Devuelve si sigue en movimiento. */
  function fisica(v, dt, ahora) {
    if (v.arrastre) return true;
    if (Expo.reducido) {
      // Sin movimiento propio: solo lo que mueve la mano, dentro de los límites
      v.ang.y = Expo.limitar(v.ang.y, -LIM_GIRO, LIM_GIRO);
      v.ang.x = Expo.limitar(v.ang.x, -LIM_INCL, LIM_INCL);
      v.vel.x = v.vel.y = 0;
      return false;
    }
    if (!dt) return true;
    var reposo = ahora - v.ultimoToque > REPOSO_MS;
    if (reposo) v.tiempo += dt;
    // [eje, límite, amplitud del balanceo (rad), frecuencia (rad/s)]
    [['y', LIM_GIRO, 0.24, 0.55], ['x', LIM_INCL, 0.1, 0.41]].forEach(function (e) {
      var k = e[0], lim = e[1], ang = v.ang[k], vel = v.vel[k], acc = 0;
      if (Math.abs(ang) > lim) acc = (Math.sign(ang) * lim * 0.94 - ang) * 70 - vel * 14;   // fuera: resorte firme hacia adentro
      else if (reposo) acc = (Math.sin(v.tiempo * e[3]) * e[2] - ang) * 5 - vel * 4.5;      // balanceo: resorte blando
      else vel *= Math.exp(-dt * 3.2);                                                       // inercia que se frena sola
      vel += acc * dt;
      v.vel[k] = vel;
      v.ang[k] = ang + vel * dt;
    });
    return true;   // en reposo siempre se balancea
  }

  /** La etiqueta «Chip Majorana N» apunta al dado: se proyecta su centro en el lienzo. */
  function colocarMarca(v) {
    var c = motor.chips[v.nombre];
    if (!v.marca || !c.mallaDado) return;
    motor.p.copy(c.localDado).applyMatrix4(c.mallaDado.matrixWorld).project(motor.camara);
    var l = motor.lienzo;
    var x = l.offsetLeft + (motor.p.x + 1) / 2 * v.ancho, y = l.offsetTop + (1 - motor.p.y) / 2 * v.alto;
    v.marca.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
  }

  function ajustarVisor() {
    var v = visor;
    if (!v || !motor) return;
    var r = motor.lienzo.getBoundingClientRect();
    if (!r.width || !r.height) return;
    v.ancho = r.width; v.alto = r.height;
    motor.renderer.setSize(r.width, r.height, false);
    motor.camara.aspect = r.width / r.height;
    motor.camara.updateProjectionMatrix();
    pedirCuadro();
  }
  var observador = window.ResizeObserver ? new ResizeObserver(function () { ajustarVisor(); }) : null;
  if (!observador) window.addEventListener('resize', ajustarVisor);

  /** Pone el visor del chip `nombre` en su tarjeta (el motor ya tiene que estar preparado). */
  function entrarVisor(nombre) {
    if (visor && visor.nombre === nombre) return;
    salirVisor();
    if (!motor || !motor.chips[nombre]) return;   // sin modelo de este chip: la foto
    var lamina = document.getElementById(CHIPS[nombre].lamina);
    var tarjeta = lamina.querySelector('.chip-tarjeta');
    var pista = lamina.querySelector('.pista-arrastre');
    Object.keys(motor.chips).forEach(function (k) { motor.chips[k].grupo.visible = k === nombre; });
    motor.lienzo.setAttribute('aria-label', 'Modelo 3D del chip ' + CHIPS[nombre].titulo + ': arrastra para girarlo');
    tarjeta.insertBefore(motor.lienzo, tarjeta.querySelector('img').nextSibling);
    visor = {
      nombre: nombre, tarjeta: tarjeta, escenaEl: lamina.querySelector('.chip-escena'),
      marca: lamina.querySelector('.chip-marca'), pista: pista, textoPista: pista ? pista.textContent : '',
      ang: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, arrastre: null, ultimoToque: -1e9, tiempo: 0,
      ancho: 0, alto: 0, id: 0, previo: 0, listo: false, fps: { cuadros: 0, t: 0, costo: 0 }
    };
    tarjeta.classList.add('con-visor');
    if (pista) pista.textContent = 'Arrastra el chip para girarlo';
    if (observador) observador.observe(motor.lienzo);
    ajustarVisor();
  }

  /** Quita el visor de la tarjeta: vuelve la foto y el bucle se detiene. */
  function salirVisor() {
    var v = visor;
    if (!v) return;
    visor = null;
    cancelAnimationFrame(v.id);
    if (observador && motor) observador.unobserve(motor.lienzo);
    v.tarjeta.classList.remove('con-visor', 'visor-listo');
    if (v.marca) v.marca.style.transform = '';
    if (v.pista) v.pista.textContent = v.textoPista;
    if (motor) { motor.lienzo.classList.remove('arrastrando'); motor.lienzo.remove(); }
  }

  /** Pone o quita el visor según la lámina activa, el modo y el modelo. */
  function revisarVisor() {
    if (C3.modo() !== '3d') { destruirMotor(); return; }
    var l = laminaActiva(), nombre = null;
    Object.keys(CHIPS).forEach(function (k) { if (l && CHIPS[k].lamina === l.id) nombre = k; });
    var quiere = nombre && puedeVisor() && C3.chipModelo(nombre);
    // Sin motor aún: la foto se queda y el motor se prepara enseguida (tras la entrada de la lámina)
    if (quiere && motor) entrarVisor(nombre);
    else salirVisor();
    precalentar(!!quiere);
  }

  Object.keys(CHIPS).forEach(function (k) {
    Expo.registrar(CHIPS[k].lamina, {
      iniciar: revisarVisor,
      detener: function () { if (visor && visor.nombre === k) salirVisor(); }
    });
  });
  C3.escuchar('modelo', revisarVisor);
  C3.escuchar('modo', function () { setTimeout(revisarVisor, 0); });
  C3.escuchar('primerPlano', function (nombre) { if (!nombre && visor) { ajustarVisor(); pedirCuadro(); } });
  document.addEventListener('visibilitychange', function () { if (visor && !document.hidden) pedirCuadro(); });

  /** Para pruebas: fps y costo del visor, y lo que muestra la capa HUD. */
  C3.chips = {
    visor: function () {
      if (!visor || !motor) return motor ? { preparado: true, preparadoMs: motor.ms } : null;
      var f = visor.fps;
      return {
        chip: visor.nombre, preparadoMs: motor.ms, listo: visor.listo, corriendo: !!visor.id,
        fps: f.t ? +(f.cuadros / f.t).toFixed(1) : null,
        costoMs: f.cuadros ? +(f.costo / f.cuadros).toFixed(2) : null,
        triangulos: motor.renderer.info.render.triangles, llamadas: motor.renderer.info.render.calls,
        angulo: { giro: +(visor.ang.y * 180 / Math.PI).toFixed(1), incl: +(visor.ang.x * 180 / Math.PI).toFixed(1) }
      };
    },
    medirVisor: function () { if (visor) visor.fps = { cuadros: 0, t: 0, costo: 0 }; },
    hud: function () {
      if (!hud) return null;
      return { chip: hud.nombre, etiquetas: hud.items.map(function (it) { return { x: Math.round(it.x), y: Math.round(it.y) }; }), conLineas: !!hud.items.length };
    }
  };
})();

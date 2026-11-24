/* =====================================================================
   01-nucleo.js — Navegación, teclado, barra de progreso, notas, índice
   y utilidades compartidas (lienzos, bucles de animación).
   Script clásico: expone todo en window.Expo.
   ===================================================================== */
(function () {
  'use strict';

  var SECCIONES = [
    { nombre: 'Portada', min: 0 },
    { nombre: 'Apertura', min: 1 },
    { nombre: 'Computación y bits', min: 3 },
    { nombre: 'Física cuántica', min: 4 },
    { nombre: 'Qubits', min: 4 },
    { nombre: 'Historia', min: 3 },
    { nombre: 'Microsoft Majorana', min: 4 },
    { nombre: 'Videos', min: 0 },
    { nombre: 'Cierre', min: 1 },
    { nombre: 'Extra', min: 0 }
  ];
  var ROMANOS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

  var consultaReducido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  var Expo = window.Expo = {
    reducido: !!(consultaReducido && consultaReducido.matches),
    actual: -1,
    laminas: [],
    animaciones: {},
    color: {
      papel: '#ebe6da', papel2: '#e0d9c8', tinta: '#17160f', tinta2: '#3a372e', tinta3: '#6f6a58',
      noche: '#02050c', azul: '#3b8bff', azul2: '#8fc1ff', azulOscuro: '#1a4fb0',
      hielo: '#eaf2ff', tenue: '#93a3c4', alerta: '#ffb03b', violeta: '#9b7bff'
    },
    fuente: {
      mono: '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
      hud: 'Bahnschrift, "Segoe UI", sans-serif',
      display: '"Bodoni MT", "Bodoni 72", Didot, Georgia, serif',
      texto: 'Georgia, Cambria, serif'
    }
  };
  if (consultaReducido && consultaReducido.addEventListener) {
    consultaReducido.addEventListener('change', function (e) {
      Expo.reducido = e.matches;
      if (Expo.despertarBucles) Expo.despertarBucles();   // reanuda el bucle continuo o redibuja
    });
  }

  /* ------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------ */

  /** Registra el control de animación de una lámina: {iniciar, detener, siguiente, anterior}. */
  Expo.registrar = function (idLamina, control) {
    (Expo.animaciones[idLamina] = Expo.animaciones[idLamina] || []).push(control);
  };

  /** Tamaño actual de 1rem en píxeles CSS. */
  Expo.rem = function () {
    return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  };

  Expo.limitar = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  Expo.suavizar = function (t) { return 1 - Math.pow(1 - t, 3); };            // ease-out cúbica
  Expo.suavizarIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /** Prepara un canvas con densidad de píxeles correcta y lo mantiene al tamaño de su caja. */
  Expo.lienzo = function (canvas, alCambiar) {
    var ctx = canvas.getContext('2d');
    var L = { canvas: canvas, ctx: ctx, ancho: 1, alto: 1, dpr: 1 };
    function ajustar() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(r.width * dpr));
      var h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      L.ancho = Math.max(1, r.width);
      L.alto = Math.max(1, r.height);
      L.dpr = dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (alCambiar) alCambiar(L);
    }
    L.ajustar = ajustar;
    // Cambiar el tamaño borra el canvas: se pide redibujar (importa con movimiento reducido)
    if (window.ResizeObserver) new ResizeObserver(function () { ajustar(); Expo.despertarBucles(); }).observe(canvas);
    else window.addEventListener('resize', ajustar);
    ajustar();
    return L;
  };

  /* Con movimiento reducido, un bucle no anima en continuo: dibuja durante una
     ráfaga corta al iniciar y tras cada interacción (para que los cambios de
     estado se asienten) y luego se queda en un fotograma estático. */
  var RAFAGA_REDUCIDO_MS = 800;
  var bucles = [];

  /** Bucle requestAnimationFrame que se puede iniciar y detener. cuadro(dt en s, t en s).
      Con movimiento reducido, t se congela en 0 para que no haya movimiento ambiental. */
  Expo.bucle = function (cuadro) {
    var id = 0, previo = 0, activo = false, hasta = 0;
    function programar() { if (activo && !id) id = requestAnimationFrame(paso); }
    function paso(t) {
      id = 0;
      if (!activo) return;
      var dt = previo ? Math.min(0.05, (t - previo) / 1000) : 0;
      previo = t;
      cuadro(dt, Expo.reducido ? 0 : t / 1000);
      // Si cuadro() llamó a detener()+iniciar(), ya hay un cuadro pedido (id ≠ 0):
      // no se pide otro, así nunca corren dos cadenas a la vez (tasa doble).
      if (id || !activo) return;
      if (!Expo.reducido || t < hasta) programar();
      else previo = 0;   // en reposo: la próxima ráfaga empieza con dt = 0
    }
    var control = {
      iniciar: function () {
        if (activo) return;
        activo = true; previo = 0;
        hasta = performance.now() + RAFAGA_REDUCIDO_MS;
        programar();
      },
      detener: function () { activo = false; cancelAnimationFrame(id); id = 0; },
      estaActivo: function () { return activo; },
      /** Redibuja (con movimiento reducido, una ráfaga corta); sin efecto si está detenido. */
      despertar: function () {
        if (!activo) return;
        hasta = Math.max(hasta, performance.now() + RAFAGA_REDUCIDO_MS);
        programar();
      }
    };
    bucles.push(control);
    return control;
  };

  /** Pide redibujar todos los bucles activos (interacción, cambio de tamaño o de preferencia). */
  Expo.despertarBucles = function () {
    for (var i = 0; i < bucles.length; i++) bucles[i].despertar();
  };

  /** Posición del puntero relativa a un elemento, en píxeles CSS. */
  Expo.puntero = function (el, e) {
    var r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, ancho: r.width, alto: r.height };
  };

  /** Crea un elemento con clase y texto opcionales (sin innerHTML). */
  Expo.crear = function (etiqueta, clase, texto) {
    var el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto != null) el.textContent = texto;
    return el;
  };

  /** Temporizadores agrupados que se cancelan juntos al salir de una lámina. */
  Expo.temporizadores = function () {
    var ids = [];
    return {
      poner: function (fn, ms) { var id = setTimeout(fn, ms); ids.push(id); return id; },
      limpiar: function () { ids.forEach(clearTimeout); ids = []; }
    };
  };

  /* ------------------------------------------------------------------
     Construcción de cabeceras, índice
     ------------------------------------------------------------------ */
  function construirCabecera(lamina, i, total) {
    if (lamina.hasAttribute('data-sin-cabecera')) return;
    var sec = +lamina.dataset.seccion;
    var marco = lamina.querySelector('.marco');
    var cab = Expo.crear('header', 'cab');
    cab.setAttribute('aria-hidden', 'true');
    var izq = Expo.crear('div', 'cab-izq');
    var centro = Expo.crear('div', 'cab-centro');
    var der = Expo.crear('div', 'cab-der');
    var num = String(i + 1).padStart(2, '0');
    if (lamina.dataset.tema === 'papel') {
      izq.textContent = 'Sección ' + ROMANOS[sec] + ' · ' + SECCIONES[sec].nombre;
      centro.textContent = 'Gaceta Cuántica';
      der.textContent = 'Pág. ' + num + ' · Nov. 2026';
    } else {
      var b = Expo.crear('b', null, '// ' + String(sec).padStart(2, '0'));
      izq.appendChild(b);
      izq.appendChild(document.createTextNode(' · ' + SECCIONES[sec].nombre));
      der.textContent = 'Lámina ' + num + '/' + total;
      var seg = Expo.crear('span', 'cab-segmentos');
      for (var k = 0; k < 10; k++) {
        var s = document.createElement('i');
        if (k < Math.round((i + 1) / total * 10)) s.className = 'on';
        seg.appendChild(s);
      }
      der.appendChild(seg);
    }
    cab.appendChild(izq); cab.appendChild(centro); cab.appendChild(der);
    marco.insertBefore(cab, marco.firstChild);
  }

  function construirIndice() {
    var rejilla = document.getElementById('indice-rejilla');
    var grupos = {};
    Expo.laminas.forEach(function (l, i) {
      var sec = +l.dataset.seccion;
      if (!grupos[sec]) {
        var div = Expo.crear('div', 'indice-seccion');
        div.appendChild(Expo.crear('h4', null, String(sec).padStart(2, '0') + ' · ' + SECCIONES[sec].nombre));
        var ol = document.createElement('ol');
        div.appendChild(ol);
        rejilla.appendChild(div);
        grupos[sec] = ol;
      }
      var li = document.createElement('li');
      var btn = Expo.crear('button', 'indice-enlace');
      btn.appendChild(Expo.crear('span', null, String(i + 1).padStart(2, '0')));
      btn.appendChild(document.createTextNode(l.dataset.titulo));
      btn.addEventListener('click', function () { cerrarIndice(); irA(i); });
      li.appendChild(btn);
      grupos[sec].appendChild(li);
    });
  }

  /* ------------------------------------------------------------------
     Navegación
     ------------------------------------------------------------------ */
  var ultimoCambio = 0;

  function llamar(idx, metodo) {
    var l = Expo.laminas[idx];
    if (!l) return false;
    var lista = Expo.animaciones[l.id] || [];
    var consumido = false;
    lista.forEach(function (c) {
      if (consumido || typeof c[metodo] !== 'function') return;
      try { if (c[metodo]() === true) consumido = true; }
      catch (err) { console.error('Animación ' + l.id + '.' + metodo, err); }
    });
    return consumido;
  }

  function irA(n) {
    n = Expo.limitar(n, 0, Expo.laminas.length - 1);
    if (n === Expo.actual) return;
    var ahora = performance.now();
    var rapido = ahora - ultimoCambio < 450;
    ultimoCambio = ahora;

    Expo.direccion = n > Expo.actual ? 'adelante' : 'atras';
    var anterior = Expo.laminas[Expo.actual];
    if (anterior) {
      llamar(Expo.actual, 'detener');
      anterior.classList.remove('activa', 'entrando');
      anterior.setAttribute('aria-hidden', 'true');
      anterior.inert = true;
    }

    Expo.actual = n;
    var lamina = Expo.laminas[n];
    lamina.classList.remove('entrando');
    lamina.scrollTop = 0;   // diseño compacto: cada lámina empieza arriba
    if (!rapido) { void lamina.offsetWidth; lamina.classList.add('entrando'); }
    lamina.classList.add('activa');
    lamina.removeAttribute('aria-hidden');
    lamina.inert = false;
    document.body.dataset.tema = lamina.dataset.tema;

    actualizarBarra();
    actualizarNotas();
    actualizarIndice();
    try { history.replaceState(null, '', '#' + (n + 1)); } catch (e) { /* file:// en algunos navegadores */ }

    llamar(n, 'iniciar');
  }
  Expo.irA = irA;

  function siguiente() {
    if (llamar(Expo.actual, 'siguiente')) return;
    irA(Expo.actual + 1);
  }
  function anterior() {
    if (llamar(Expo.actual, 'anterior')) return;
    irA(Expo.actual - 1);
  }
  Expo.siguiente = siguiente;
  Expo.anterior = anterior;

  /* ------------------------------------------------------------------
     Barra de progreso
     ------------------------------------------------------------------ */
  function actualizarBarra() {
    var l = Expo.laminas[Expo.actual];
    var sec = +l.dataset.seccion;
    var total = Expo.laminas.length;
    var pct = Math.round(Expo.actual / (total - 1) * 100);
    document.getElementById('barra-seccion').textContent = String(sec).padStart(2, '0') + ' · ' + SECCIONES[sec].nombre;
    document.getElementById('barra-min').textContent = SECCIONES[sec].min ? '≈ ' + SECCIONES[sec].min + ' min' : '';
    document.getElementById('barra-num').textContent = (Expo.actual + 1) + ' / ' + total;
    document.getElementById('barra-porcentaje').textContent = pct + '%';
    document.getElementById('barra-estado').textContent = l.dataset.tema === 'hud'
      ? (pct >= 100 ? 'Transferencia completa' : 'Transferencia en curso…')
      : 'Edición';
    document.getElementById('barra-relleno').style.transform = 'scaleX(' + (pct / 100) + ')';
  }

  /* ------------------------------------------------------------------
     Notas del expositor
     ------------------------------------------------------------------ */
  var panelNotas, cuerpoNotas;
  function actualizarNotas() {
    if (!cuerpoNotas) return;
    while (cuerpoNotas.firstChild) cuerpoNotas.removeChild(cuerpoNotas.firstChild);
    var fuente = Expo.laminas[Expo.actual].querySelector('.notas');
    if (fuente) {
      Array.prototype.forEach.call(fuente.childNodes, function (n) { cuerpoNotas.appendChild(n.cloneNode(true)); });
    } else {
      cuerpoNotas.appendChild(Expo.crear('p', null, 'Sin notas para esta lámina.'));
    }
  }
  function alternarNotas(forzar) {
    var abrir = forzar != null ? forzar : !panelNotas.classList.contains('abierto');
    panelNotas.classList.toggle('abierto', abrir);
    panelNotas.setAttribute('aria-hidden', abrir ? 'false' : 'true');
  }
  Expo.alternarNotas = alternarNotas;

  /* ------------------------------------------------------------------
     Índice general
     ------------------------------------------------------------------ */
  var indice;
  function actualizarIndice() {
    if (!indice) return;
    var enlaces = indice.querySelectorAll('.indice-enlace');
    Array.prototype.forEach.call(enlaces, function (b, i) { b.classList.toggle('actual', i === Expo.actual); });
  }
  function abrirIndice() {
    indice.classList.add('abierto');
    indice.setAttribute('aria-hidden', 'false');
    var actual = indice.querySelector('.indice-enlace.actual');
    if (actual) actual.focus({ preventScroll: false });
  }
  function cerrarIndice() {
    indice.classList.remove('abierto');
    indice.setAttribute('aria-hidden', 'true');
  }
  function indiceAbierto() { return indice.classList.contains('abierto'); }

  /* ------------------------------------------------------------------
     Pantalla completa
     ------------------------------------------------------------------ */
  function alternarPantalla() {
    if (!document.fullscreenElement) {
      var p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      if (p && p.catch) p.catch(function () {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  /* ------------------------------------------------------------------
     Teclado, clic y toque
     ------------------------------------------------------------------ */
  function esEditable(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function alTeclado(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    var tecla = e.key;

    // El modal de video tiene prioridad
    if (Expo.modalAbierto && Expo.modalAbierto()) {
      if (tecla === 'Escape') { e.preventDefault(); Expo.cerrarModal(); }
      return;
    }
    if (indiceAbierto()) {
      if (tecla === 'Escape' || tecla === 'i' || tecla === 'I') { e.preventDefault(); cerrarIndice(); }
      return;
    }
    // En deslizadores, las flechas ajustan el valor
    if (esEditable(t) && t.type === 'range' && /^Arrow/.test(tecla)) return;
    if (esEditable(t) && t.type !== 'range') return;
    // Espacio/Enter sobre un botón lo pulsan; no navegan
    if ((tecla === ' ' || tecla === 'Enter') && t && t.tagName === 'BUTTON') return;

    switch (tecla) {
      case 'ArrowRight': case 'PageDown': case ' ':
        e.preventDefault(); siguiente(); break;
      case 'ArrowLeft': case 'PageUp':
        e.preventDefault(); anterior(); break;
      case 'Home': e.preventDefault(); irA(0); break;
      case 'End': e.preventDefault(); irA(Expo.laminas.length - 1); break;
      case 'f': case 'F': e.preventDefault(); alternarPantalla(); break;
      case 'n': case 'N': e.preventDefault(); alternarNotas(); break;
      case 'Escape': case 'i': case 'I':
        e.preventDefault();
        if (panelNotas.classList.contains('abierto') && tecla === 'Escape') alternarNotas(false);
        else abrirIndice();
        break;
    }
  }

  // Gestos de deslizamiento en pantallas táctiles (fuera de lienzos y zonas con arrastre propio).
  // Se usan eventos touch (pasivos) y no pointer: en el diseño compacto la lámina se desplaza
  // en vertical y el navegador cancelaría los pointer events al empezar ese desplazamiento.
  // Solo cuenta un gesto claramente horizontal, así no choca con el desplazamiento vertical.
  var ZONAS_SIN_DESLIZAR = 'canvas, input, .linea-contenedor, .esquema-desliza, [data-inclinar]';
  function configurarToque() {
    var escenario = document.getElementById('escenario');
    var inicio = null;
    escenario.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || e.target.closest(ZONAS_SIN_DESLIZAR)) { inicio = null; return; }
      var t = e.touches[0];
      inicio = { x: t.clientX, y: t.clientY, t: performance.now() };
    }, { passive: true });
    escenario.addEventListener('touchcancel', function () { inicio = null; }, { passive: true });
    escenario.addEventListener('touchend', function (e) {
      if (!inicio || e.changedTouches.length !== 1) { inicio = null; return; }
      var t = e.changedTouches[0];
      var dx = t.clientX - inicio.x, dy = t.clientY - inicio.y;
      var dt = Math.max(1, performance.now() - inicio.t);
      inicio = null;
      if (indiceAbierto() || (Expo.modalAbierto && Expo.modalAbierto())) return;
      var veloz = Math.abs(dx) / dt > 0.4 && Math.abs(dx) > 30;
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && (Math.abs(dx) > 60 || veloz)) {
        if (dx < 0) siguiente(); else anterior();
      }
    }, { passive: true });
  }

  // Tablas HUD: cada celda guarda el nombre de su columna (el diseño compacto
  // las muestra como tarjetas y usa esa etiqueta con attr(data-etq)).
  function etiquetarTablas() {
    Array.prototype.forEach.call(document.querySelectorAll('.h-tabla'), function (tabla) {
      var cabeceras = Array.prototype.map.call(tabla.querySelectorAll('thead th'), function (th) {
        return th.firstChild ? th.firstChild.textContent.trim() : '';
      });
      Array.prototype.forEach.call(tabla.querySelectorAll('tbody tr'), function (tr) {
        Array.prototype.forEach.call(tr.children, function (celda, k) {
          if (celda.tagName === 'TD' && cabeceras[k]) celda.setAttribute('data-etq', cabeceras[k]);
        });
      });
    });
  }

  // En pantallas táctiles, las pistas «mueve el ratón» hablan del dedo
  function adaptarPistasTactiles() {
    if (!window.matchMedia || !window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-inclinar] .pista-arrastre'), function (p) {
      p.textContent = 'Desliza el dedo sobre la foto';
    });
  }

  // Tras usar un deslizador con el ratón, las flechas vuelven a navegar
  function soltarFocoDeslizadores() {
    document.addEventListener('pointerup', function (e) {
      var t = e.target;
      if (t && t.type === 'range' && e.pointerType !== 'touch') setTimeout(function () { t.blur(); }, 0);
    });
  }

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  function arrancar() {
    Expo.laminas = Array.prototype.slice.call(document.querySelectorAll('.lamina'));
    var total = Expo.laminas.length;

    Expo.laminas.forEach(function (l, i) {
      construirCabecera(l, i, total);
      // Orden de entrada escalonada (máx. 8 pasos para no hacerla lenta)
      Array.prototype.forEach.call(l.querySelectorAll('.e'), function (el, k) {
        el.style.setProperty('--i', Math.min(k, 8));
      });
      l.setAttribute('aria-hidden', 'true');
      l.inert = true;
    });

    panelNotas = document.getElementById('panel-notas');
    cuerpoNotas = document.getElementById('panel-notas-cuerpo');
    indice = document.getElementById('indice');
    construirIndice();

    document.getElementById('btn-anterior').addEventListener('click', anterior);
    document.getElementById('btn-siguiente').addEventListener('click', siguiente);
    document.getElementById('btn-notas').addEventListener('click', function () { alternarNotas(); });
    document.getElementById('cerrar-notas').addEventListener('click', function () { alternarNotas(false); });
    document.getElementById('btn-indice').addEventListener('click', abrirIndice);
    document.getElementById('cerrar-indice').addEventListener('click', cerrarIndice);
    document.getElementById('btn-pantalla').addEventListener('click', alternarPantalla);
    indice.addEventListener('click', function (e) { if (e.target === indice) cerrarIndice(); });

    document.addEventListener('keydown', alTeclado);
    configurarToque();
    etiquetarTablas();
    adaptarPistasTactiles();
    soltarFocoDeslizadores();
    despertarAlInteractuar();

    // Navegar al cambiar el hash (enlace #N, atrás/adelante). irA() actualiza el hash
    // con replaceState, que no dispara «hashchange»: no hay bucle.
    window.addEventListener('hashchange', function () {
      var n = laminaDesdeHash();
      if (n !== null && n !== Expo.actual) irA(n);
    });
    var inicial = laminaDesdeHash();
    irA(inicial === null ? 0 : inicial);
  }

  /** Índice (base 0) de la lámina indicada en el hash «#N», o null si no hay uno válido. */
  function laminaDesdeHash() {
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    return isNaN(n) ? null : n - 1;
  }

  // Con movimiento reducido los lienzos están quietos: cualquier interacción los redibuja
  function despertarAlInteractuar() {
    ['pointerdown', 'pointerup', 'click', 'input', 'change', 'keydown', 'wheel'].forEach(function (tipo) {
      document.addEventListener(tipo, Expo.despertarBucles, { capture: true, passive: true });
    });
    document.addEventListener('pointermove', function (e) {
      if (e.buttons) Expo.despertarBucles();   // solo al arrastrar
    }, { capture: true, passive: true });
    window.addEventListener('resize', Expo.despertarBucles);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else setTimeout(arrancar, 0);
})();

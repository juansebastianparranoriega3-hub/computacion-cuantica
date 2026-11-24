/* =====================================================================
   01-nucleo.js — Navegación, teclado, barra de progreso, notas, índice
   y utilidades compartidas (lienzos, bucles de animación).
   Script clásico: expone todo en window.Expo.
   ===================================================================== */
(function () {
  'use strict';

  /* Secciones originales del documento (data-seccion de cada lámina).
     Se usan para agrupar el anexo en el índice. */
  var SECCIONES = [
    'Portada', 'Apertura', 'Computación y bits', 'Física cuántica', 'Qubits',
    'Historia', 'Microsoft Majorana', 'Videos', 'Cierre', 'Extra'
  ];
  var ROMANOS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

  /* Recorrido principal de 10 minutos (aprobado por Sebas). Solo estas
     láminas se recorren con →, Espacio y deslizar; el resto pasa al anexo.
     Para sumar o quitar una lámina del recorrido basta con editar esta tabla. */
  var BLOQUES = [
    { nombre: 'Apertura', tiempo: '0:45', ids: ['l-portada', 'l-gancho'] },
    { nombre: 'Bits', tiempo: '1:30', ids: ['l-bit', 'l-moore'] },
    { nombre: 'Física cuántica', tiempo: '2:30', ids: ['l-transicion', 'l-rendija', 'l-moneda', 'l-entrelazamiento'] },
    { nombre: 'Qubits', tiempo: '2:00', ids: ['l-bloch', 'l-potencia', 'l-tabla'] },
    { nombre: 'Historia', tiempo: '0:45', ids: ['l-linea'] },
    { nombre: 'Majorana', tiempo: '2:00', ids: ['l-majorana1', 'l-topologia', 'l-majorana2', 'l-controversia'] },
    { nombre: 'Cierre', tiempo: '0:30', ids: ['l-ideas'] }
  ];
  var PREFIJO_ANEXO = 'anexo-';

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
  /* ------------------------------------------------------------------
     Recorrido y anexo
     ------------------------------------------------------------------ */
  /** Reparte las láminas: Expo.recorrido (orden de BLOQUES) y Expo.anexo (el resto, en orden del documento). */
  function repartirLaminas() {
    var porId = {};
    Expo.laminas.forEach(function (l, i) { porId[l.id] = i; });
    Expo.recorrido = [];
    BLOQUES.forEach(function (bloque, b) {
      bloque.ids.forEach(function (id) {
        var i = porId[id];
        if (i == null) { console.error('Recorrido: no existe la lámina #' + id); return; }
        var l = Expo.laminas[i];
        l.dataset.parte = 'recorrido';
        l.dataset.bloque = b;
        Expo.recorrido.push(i);
        l.dataset.pos = Expo.recorrido.length;
      });
    });
    Expo.anexo = [];
    Expo.laminas.forEach(function (l, i) {
      if (l.dataset.parte === 'recorrido') return;
      l.dataset.parte = 'anexo';
      Expo.anexo.push(i);
      l.dataset.pos = Expo.anexo.length;
    });
  }

  function esAnexo(i) { return Expo.laminas[i] && Expo.laminas[i].dataset.parte === 'anexo'; }
  /** Lista que recorren las flechas desde la lámina i: el recorrido o el anexo. */
  function listaDe(i) { return esAnexo(i) ? Expo.anexo : Expo.recorrido; }
  function dos(n) { return String(n).padStart(2, '0'); }

  function construirCabecera(lamina) {
    if (lamina.hasAttribute('data-sin-cabecera')) return;
    var anexo = lamina.dataset.parte === 'anexo';
    var pos = +lamina.dataset.pos;
    var total = anexo ? Expo.anexo.length : Expo.recorrido.length;
    var b = +lamina.dataset.bloque;
    var nombre = anexo ? SECCIONES[+lamina.dataset.seccion] : BLOQUES[b].nombre;
    var marco = lamina.querySelector('.marco');
    var cab = Expo.crear('header', 'cab');
    cab.setAttribute('aria-hidden', 'true');
    var izq = Expo.crear('div', 'cab-izq');
    var centro = Expo.crear('div', 'cab-centro');
    var der = Expo.crear('div', 'cab-der');
    if (lamina.dataset.tema === 'papel') {
      izq.textContent = (anexo ? 'Anexo' : 'Sección ' + ROMANOS[b + 1]) + ' · ' + nombre;
      centro.textContent = 'Gaceta Cuántica';
      der.textContent = (anexo ? 'Anexo, pág. A' : 'Pág. ') + dos(pos) + ' · Nov. 2026';
    } else {
      izq.appendChild(Expo.crear('b', null, '// ' + (anexo ? 'ANEXO' : dos(b + 1))));
      izq.appendChild(document.createTextNode(' · ' + nombre));
      der.textContent = (anexo ? 'Anexo ' : 'Lámina ') + dos(pos) + '/' + total;
      var seg = Expo.crear('span', 'cab-segmentos');
      for (var k = 0; k < 10; k++) {
        var s = document.createElement('i');
        if (k < Math.round(pos / total * 10)) s.className = 'on';
        seg.appendChild(s);
      }
      der.appendChild(seg);
    }
    cab.appendChild(izq); cab.appendChild(centro); cab.appendChild(der);
    marco.insertBefore(cab, marco.firstChild);
  }

  function enlaceIndice(i, etiqueta) {
    var li = document.createElement('li');
    var btn = Expo.crear('button', 'indice-enlace');
    btn.dataset.indice = i;
    btn.appendChild(Expo.crear('span', null, etiqueta));
    btn.appendChild(document.createTextNode(Expo.laminas[i].dataset.titulo));
    btn.addEventListener('click', function () { cerrarIndice(); irA(i); });
    li.appendChild(btn);
    return li;
  }

  function grupoIndice(contenedor, titulo, tiempo) {
    var div = Expo.crear('div', 'indice-seccion');
    var h4 = Expo.crear('h4', null, titulo);
    if (tiempo) h4.appendChild(Expo.crear('small', 'indice-tiempo', tiempo));
    div.appendChild(h4);
    var ol = document.createElement('ol');
    div.appendChild(ol);
    contenedor.appendChild(div);
    return ol;
  }

  function parteIndice(rejilla, clase, titulo, detalle) {
    var parte = Expo.crear('section', 'indice-parte ' + clase);
    var h3 = Expo.crear('h3', 'indice-parte-titulo', titulo);
    if (detalle) h3.appendChild(Expo.crear('small', null, detalle));
    parte.appendChild(h3);
    var grupos = Expo.crear('div', 'indice-grupos');
    parte.appendChild(grupos);
    rejilla.appendChild(parte);
    return grupos;
  }

  /** Índice: primero el recorrido por bloques (con su tiempo); debajo, el anexo por sección original. */
  function construirIndice() {
    var rejilla = document.getElementById('indice-rejilla');
    var recorrido = parteIndice(rejilla, 'indice-recorrido', 'Recorrido', '10 min · ' + Expo.recorrido.length + ' láminas');
    var pos = 0;
    BLOQUES.forEach(function (bloque, b) {
      var ol = grupoIndice(recorrido, dos(b + 1) + ' · ' + bloque.nombre, '≈ ' + bloque.tiempo);
      bloque.ids.forEach(function (id) {
        var i = Expo.laminas.indexOf(document.getElementById(id));
        if (i < 0) return;
        pos++;
        ol.appendChild(enlaceIndice(i, dos(pos)));
      });
    });
    var anexo = parteIndice(rejilla, 'indice-anexo', 'Anexo — para preguntas', Expo.anexo.length + ' láminas · ← y → se mueven dentro del anexo');
    var grupos = {};
    Expo.anexo.forEach(function (i, k) {
      var sec = +Expo.laminas[i].dataset.seccion;
      if (!grupos[sec]) grupos[sec] = grupoIndice(anexo, SECCIONES[sec]);
      grupos[sec].appendChild(enlaceIndice(i, 'A' + dos(k + 1)));
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

  /** Va a la lámina n (índice en el documento). desdeHash: la URL ya cambió (enlace, atrás/adelante). */
  function irA(n, desdeHash) {
    n = Expo.limitar(n, 0, Expo.laminas.length - 1);
    if (n === Expo.actual) return;
    var ahora = performance.now();
    var rapido = ahora - ultimoCambio < 450;
    ultimoCambio = ahora;

    Expo.direccion = n > Expo.actual ? 'adelante' : 'atras';
    var cambiaParte = Expo.actual >= 0 && esAnexo(n) !== esAnexo(Expo.actual);
    var anterior = Expo.laminas[Expo.actual];
    Expo.laminaPrevia = anterior || null;   // la transición papel→HUD mira de dónde se viene
    if (!esAnexo(n)) ultimaRecorrido = n;
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
    document.body.dataset.parte = lamina.dataset.parte;

    actualizarBarra();
    actualizarNotas();
    actualizarIndice();
    // Dentro de una misma parte se reemplaza la entrada del historial (no se llena de #N);
    // al entrar o salir del anexo se agrega una, para que «atrás» devuelva al punto anterior.
    if (!desdeHash) {
      try {
        if (cambiaParte) history.pushState(null, '', hashDe(n));
        else history.replaceState(null, '', hashDe(n));
      } catch (e) { /* file:// en algunos navegadores */ }
    }

    llamar(n, 'iniciar');
  }
  Expo.irA = irA;

  /** Paso dentro de la parte actual (recorrido o anexo): +1 siguiente, −1 anterior. */
  function paso(delta) {
    var lista = listaDe(Expo.actual);
    var p = lista.indexOf(Expo.actual) + delta;
    if (p >= 0 && p < lista.length) irA(lista[p]);
  }
  function siguiente() {
    if (llamar(Expo.actual, 'siguiente')) return;
    paso(1);
  }
  function anterior() {
    if (llamar(Expo.actual, 'anterior')) return;
    paso(-1);
  }
  Expo.siguiente = siguiente;
  Expo.anterior = anterior;

  /** Sale del anexo y vuelve a la última lámina del recorrido que se vio. */
  var ultimaRecorrido = 0;
  function volverAlRecorrido() { irA(ultimaRecorrido); }
  Expo.volverAlRecorrido = volverAlRecorrido;

  /* Esquema de la URL:
       #N              lámina N del recorrido (1…total del recorrido)
       #anexo-<nombre> lámina del anexo, por su id sin «l-» (p. ej. #anexo-cuantizacion) */
  function hashDe(n) {
    var l = Expo.laminas[n];
    return esAnexo(n) ? '#' + PREFIJO_ANEXO + l.id.replace(/^l-/, '') : '#' + l.dataset.pos;
  }
  /** Índice (base 0, en el documento) de la lámina que indica el hash, o null si no es válido. */
  function laminaDesdeHash() {
    var h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (h.indexOf(PREFIJO_ANEXO) === 0) {
      var el = document.getElementById('l-' + h.slice(PREFIJO_ANEXO.length));
      var i = el ? Expo.laminas.indexOf(el) : -1;
      return i < 0 ? null : i;
    }
    if (!/^\d+$/.test(h)) return null;
    var n = parseInt(h, 10);
    return n >= 1 && n <= Expo.recorrido.length ? Expo.recorrido[n - 1] : null;
  }

  /* ------------------------------------------------------------------
     Barra de progreso
     ------------------------------------------------------------------ */
  function actualizarBarra() {
    var l = Expo.laminas[Expo.actual];
    var anexo = esAnexo(Expo.actual);
    var pos = +l.dataset.pos;
    var total = listaDe(Expo.actual).length;
    var pct = total > 1 ? Math.round((pos - 1) / (total - 1) * 100) : 100;
    var num = document.getElementById('barra-num');
    if (anexo) {
      document.getElementById('barra-seccion').textContent = 'Anexo · ' + SECCIONES[+l.dataset.seccion];
      document.getElementById('barra-min').textContent = '';
      num.textContent = 'A' + pos + ' / ' + total;
      num.setAttribute('aria-label', 'Anexo, lámina ' + pos + ' de ' + total);
    } else {
      var b = +l.dataset.bloque;
      document.getElementById('barra-seccion').textContent = dos(b + 1) + ' · ' + BLOQUES[b].nombre;
      document.getElementById('barra-min').textContent = '≈ ' + BLOQUES[b].tiempo + ' min';
      num.textContent = pos + ' / ' + total;
      num.setAttribute('aria-label', 'Lámina ' + pos + ' de ' + total);
    }
    document.getElementById('barra-porcentaje').textContent = pct + '%';
    document.getElementById('barra-estado').textContent = anexo ? 'Anexo'
      : l.dataset.tema === 'hud'
        ? (pct >= 100 ? 'Transferencia completa' : 'Transferencia en curso…')
        : 'Edición';
    document.getElementById('barra-relleno').style.transform = 'scaleX(' + (pct / 100) + ')';
    document.getElementById('btn-volver').hidden = !anexo;
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
    Array.prototype.forEach.call(enlaces, function (b) { b.classList.toggle('actual', +b.dataset.indice === Expo.actual); });
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
      case 'Home': e.preventDefault(); irA(listaDe(Expo.actual)[0]); break;
      case 'End': e.preventDefault(); irA(listaDe(Expo.actual)[listaDe(Expo.actual).length - 1]); break;
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
    repartirLaminas();

    Expo.laminas.forEach(function (l) {
      construirCabecera(l);
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
    document.getElementById('btn-volver').addEventListener('click', volverAlRecorrido);
    indice.addEventListener('click', function (e) { if (e.target === indice) cerrarIndice(); });

    document.addEventListener('keydown', alTeclado);
    configurarToque();
    etiquetarTablas();
    adaptarPistasTactiles();
    soltarFocoDeslizadores();
    despertarAlInteractuar();

    // Navegar al cambiar el hash (enlace #N o #anexo-…, atrás/adelante). irA() escribe el
    // hash con replaceState/pushState, que no disparan «hashchange»: no hay bucle.
    // «popstate» cubre atrás/adelante entre entradas creadas con pushState.
    function alCambiarHash() {
      var n = laminaDesdeHash();
      if (n === null) {   // hash no válido: se deja la URL de la lámina actual
        try { history.replaceState(null, '', hashDe(Expo.actual)); } catch (e) { /* file:// */ }
      } else if (n !== Expo.actual) irA(n, true);
    }
    window.addEventListener('hashchange', alCambiarHash);
    window.addEventListener('popstate', alCambiarHash);
    var inicial = laminaDesdeHash();
    // irA() también normaliza la URL (sin hash, o un #N fuera de rango → la portada)
    irA(inicial === null ? Expo.recorrido[0] : inicial);
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

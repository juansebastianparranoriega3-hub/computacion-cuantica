/* =====================================================================
   05-majorana.js — Historia y Microsoft: línea de tiempo, fotos de los
   chips con inclinación 3D, nudo topológico, ola del estadio, paridad,
   medición digital, tetron, videos (modal) y preguntas (acordeón).
   ===================================================================== */
(function () {
  'use strict';
  var C = Expo.color, F = Expo.fuente;
  var TAU = Math.PI * 2;

  function texto(ctx, txt, x, y, tam, color, alinear, peso) {
    alinear = alinear || 'left';
    ctx.font = (peso || 500) + ' ' + Math.round(tam) + 'px ' + F.mono;
    var aj = Expo.ajusteTexto(ctx, txt, x, alinear), k = aj.k;   // en pantallas chicas, que no se salga
    x = aj.x;
    if (k < 1) ctx.font = (peso || 500) + ' ' + Math.floor(tam * k) + 'px ' + F.mono;
    ctx.fillStyle = color;
    ctx.textAlign = alinear;
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

  /* ------------------------------------------------------------------
     Línea de tiempo 1900 → 2026 con desplazamiento horizontal
     ------------------------------------------------------------------ */
  function lineaDeTiempo() {
    var cont = document.getElementById('linea-contenedor');
    var ventana = document.getElementById('linea-ventana');
    var fichas = Array.prototype.slice.call(cont.querySelectorAll('.ficha'));
    var anios = document.querySelector('.linea-regla-anios');
    var A0 = 1900, A1 = 2026;

    // Años de la regla en su posición real (no equiespaciados)
    while (anios.firstChild) anios.removeChild(anios.firstChild);
    anios.style.position = 'relative';
    anios.style.height = '1.2em';
    [1900, 1950, 2000, 2026].forEach(function (a, i, lista) {
      var s = Expo.crear('span', null, String(a));
      s.style.position = 'absolute';
      s.style.left = ((a - A0) / (A1 - A0) * 100) + '%';
      s.style.transform = i === 0 ? 'none' : (i === lista.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)');
      anios.appendChild(s);
    });

    function actualizarRegla() {
      var izq = cont.scrollLeft, der = izq + cont.clientWidth;
      var primero = null, ultimo = null;
      fichas.forEach(function (f) {
        var x0 = f.offsetLeft, x1 = x0 + f.offsetWidth;
        if (x1 > izq + 20 && x0 < der - 20) {
          var a = parseFloat(f.dataset.anio);
          if (primero === null || a < primero) primero = a;
          if (ultimo === null || a > ultimo) ultimo = a;
        }
      });
      if (primero === null) return;
      var p0 = (primero - A0) / (A1 - A0), p1 = (ultimo - A0) / (A1 - A0);
      var ancho = Math.max(0.02, p1 - p0);
      // translateX se aplica sin escalar: desplazar p0 del ancho total y luego encoger
      ventana.style.transform = 'translateX(' + (p0 * 100).toFixed(2) + '%) scaleX(' + ancho.toFixed(4) + ')';
    }
    cont.addEventListener('scroll', actualizarRegla, { passive: true });

    // Desplazamiento animado propio (ease-out, 420 ms). Pulsaciones seguidas acumulan el destino.
    var destino = null, animId = 0;
    function maxScroll() { return cont.scrollWidth - cont.clientWidth; }
    function desplazar(dx) {
      var base = destino === null ? cont.scrollLeft : destino;
      destino = Expo.limitar(base + dx, 0, maxScroll());
      if (Expo.reducido) { cont.scrollLeft = destino; destino = null; return; }
      cancelAnimationFrame(animId);
      var desde = cont.scrollLeft, hacia = destino, t0 = performance.now();
      function paso(t) {
        var k = Math.min(1, (t - t0) / 420);
        cont.scrollLeft = desde + (hacia - desde) * Expo.suavizar(k);
        if (k < 1) animId = requestAnimationFrame(paso); else destino = null;
      }
      animId = requestAnimationFrame(paso);
    }
    /* Paso de → / ›: lo visible (×0,8) o 1/6 del recorrido, lo que sea mayor. Así la línea
       se recorre en ~6 pasos como máximo en cualquier tamaño (en celular antes eran > 20). */
    function pasoLinea() { return Math.max(cont.clientWidth * 0.8, maxScroll() / 6); }
    function posicion() { return destino === null ? cont.scrollLeft : destino; }
    function alFinal() { return posicion() >= maxScroll() - 4; }
    function alInicio() { return posicion() <= 4; }

    // Rueda vertical → desplazamiento horizontal
    cont.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); cont.scrollLeft += e.deltaY; }
    }, { passive: false });

    // Arrastrar con el ratón
    var arrastre = null;
    cont.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || arrastre) return;
      arrastre = { x: e.clientX, s: cont.scrollLeft, id: e.pointerId };
      cont.setPointerCapture(e.pointerId);
      cont.classList.add('arrastrando');
    });
    cont.addEventListener('pointermove', function (e) {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      cont.scrollLeft = arrastre.s - (e.clientX - arrastre.x);
    });
    function soltar(e) {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      arrastre = null;
      cont.classList.remove('arrastrando');
    }
    cont.addEventListener('pointerup', soltar);
    cont.addEventListener('pointercancel', soltar);

    Expo.registrar('l-linea', {
      iniciar: function () {
        cancelAnimationFrame(animId); destino = null;
        cont.scrollLeft = Expo.direccion === 'atras' ? maxScroll() : 0;
        actualizarRegla();
      },
      detener: function () { cancelAnimationFrame(animId); destino = null; },
      // → avanza la línea; al llegar al final, deja pasar a la siguiente lámina
      siguiente: function () { if (alFinal()) return false; desplazar(pasoLinea()); return true; },
      anterior: function () { if (alInicio()) return false; desplazar(-pasoLinea()); return true; }
    });
  }

  /* ------------------------------------------------------------------
     Fotos de los chips: inclinación 3D con resorte
     ------------------------------------------------------------------ */
  function inclinacion() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-inclinar]'), function (escena) {
      var tarjeta = escena.querySelector('.chip-tarjeta');
      var brilloEl = escena.querySelector('.chip-brillo');
      var lamina = escena.closest('.lamina');
      var objetivo = { x: 0, y: 0 }, actual = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
      var sobre = false;

      escena.addEventListener('pointermove', function (e) {
        var p = Expo.puntero(tarjeta, e);
        objetivo.x = Expo.limitar(p.x / p.ancho * 2 - 1, -1.2, 1.2);
        objetivo.y = Expo.limitar(p.y / p.alto * 2 - 1, -1.2, 1.2);
        sobre = true;
      });
      escena.addEventListener('pointerleave', function () { sobre = false; objetivo.x = objetivo.y = 0; });

      var bucle = Expo.bucle(function (dt, t) {
        if (Expo.reducido) { tarjeta.style.transform = 'none'; return; }
        var ox = objetivo.x, oy = objetivo.y;
        if (!sobre) { ox = Math.sin(t * 0.5) * 0.35; oy = Math.cos(t * 0.37) * 0.25; }  // vaivén suave en reposo
        // Resorte amortiguado (rigidez 120, amortiguación 16)
        var k = 120, d = 16;
        vel.x += ((ox - actual.x) * k - vel.x * d) * dt;
        vel.y += ((oy - actual.y) * k - vel.y * d) * dt;
        actual.x += vel.x * dt; actual.y += vel.y * dt;
        tarjeta.style.transform = 'rotateY(' + (actual.x * 14).toFixed(2) + 'deg) rotateX(' + (-actual.y * 11).toFixed(2) + 'deg)';
        brilloEl.style.setProperty('--bx', (50 + actual.x * 40).toFixed(1) + '%');
        brilloEl.style.setProperty('--by', (40 + actual.y * 40).toFixed(1) + '%');
      });
      Expo.registrar(lamina.id, { iniciar: bucle.iniciar, detener: bucle.detener });
    });
  }

  /* ------------------------------------------------------------------
     Topología: dato local frente a un nudo
     ------------------------------------------------------------------ */
  function nudo() {
    var L = Expo.lienzo(document.getElementById('cv-nudo'));
    var rango = document.getElementById('nudo-ruido');
    var txt = document.getElementById('nudo-txt');
    var ruido = 0.3, bit = 1, volteos = 0, destello = 0;
    var N = 260;

    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      var mitad = w * 0.42;
      var mov = Expo.reducido ? 0 : t;

      // Separador
      ctx.strokeStyle = 'rgba(82,145,255,0.3)'; ctx.lineWidth = 1; ctx.lineCap = 'butt'; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(mitad, rem * 0.5); ctx.lineTo(mitad, h - rem * 0.5); ctx.stroke(); ctx.setLineDash([]);

      // --- Dato local: un punto en una cuerda
      texto(ctx, 'INFORMACIÓN LOCAL', rem * 0.6, rem * 0.9, rem * 0.8, C.azul2, 'left', 600);
      var cy = h * 0.46, x0 = rem * 1, x1 = mitad - rem * 1;
      ctx.strokeStyle = C.azul2; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      for (var x = x0; x <= x1; x += 4) {
        var u = (x - x0) / (x1 - x0);
        var y = cy + Math.sin(u * 9 + mov * 3) * ruido * rem * 1.2 + Math.sin(u * 23 - mov * 5) * ruido * rem * 0.4;
        if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (!Expo.reducido && Math.random() < ruido * ruido * dt * 1.6) { bit ^= 1; volteos++; destello = 1; }
      destello = Math.max(0, destello - dt * 2);
      var bx = (x0 + x1) / 2, by = cy + Math.sin(0.5 * 9 + mov * 3) * ruido * rem * 1.2 + Math.sin(0.5 * 23 - mov * 5) * ruido * rem * 0.4;
      if (destello > 0) { ctx.strokeStyle = 'rgba(255,176,59,' + destello + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, rem * (1 + (1 - destello) * 2), 0, TAU); ctx.stroke(); }
      ctx.fillStyle = bit === 1 ? '#fff' : C.alerta;
      ctx.beginPath(); ctx.arc(bx, by, rem * 0.95, 0, TAU); ctx.fill();
      texto(ctx, String(bit), bx, by + 1, rem * 1.1, '#071226', 'center', 700);
      texto(ctx, 'dato guardado en un punto', (x0 + x1) / 2, cy + rem * 2.6, rem * 0.75, C.rotulo, 'center', 600);
      texto(ctx, 'VOLTEOS POR RUIDO: ' + volteos, rem * 0.6, h - rem * 1.2, rem * 0.75, volteos ? C.alerta : '#fff', 'left', 700);

      // --- Nudo de trébol deformado por el ruido
      texto(ctx, 'INFORMACIÓN TOPOLÓGICA', mitad + rem * 0.8, rem * 0.9, rem * 0.8, C.azul2, 'left', 600);
      var kx = (mitad + w) / 2, ky = h * 0.5, esc = Math.min(w - mitad, h) * 0.13;
      var pts = [];
      for (var i = 0; i <= N; i++) {
        var s = i / N * TAU;
        var px = Math.sin(s) + 2 * Math.sin(2 * s);
        var py = Math.cos(s) - 2 * Math.cos(2 * s);
        var pz = -Math.sin(3 * s);
        // Deformación suave (no rompe la cuerda)
        px += ruido * 0.45 * Math.sin(3 * s + mov * 1.7) + ruido * 0.2 * Math.sin(7 * s - mov * 2.3);
        py += ruido * 0.45 * Math.cos(2 * s + mov * 1.3) + ruido * 0.2 * Math.cos(5 * s + mov * 2.9);
        pts.push({ x: kx + px * esc, y: ky + py * esc, z: pz });
      }
      // Tramos ordenados por profundidad: el de encima tapa al de abajo (cruces del nudo)
      var TRAMO = 10, tramos = [];
      for (var j = 0; j < N; j += TRAMO) {
        var zm = 0, fin = Math.min(N, j + TRAMO);
        for (var q = j; q <= fin; q++) zm += pts[q].z;
        tramos.push({ ini: j, fin: fin, z: zm / (fin - j + 1) });
      }
      tramos.sort(function (a, b) { return a.z - b.z; });
      ctx.lineJoin = 'round';
      tramos.forEach(function (tr) {
        ctx.beginPath();
        ctx.moveTo(pts[tr.ini].x, pts[tr.ini].y);
        for (var q = tr.ini + 1; q <= tr.fin; q++) ctx.lineTo(pts[q].x, pts[q].y);
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#06102a'; ctx.lineWidth = rem * 0.8; ctx.stroke();
        var luz = 0.55 + 0.45 * ((tr.z + 1) / 2);
        ctx.strokeStyle = 'rgb(' + Math.round(59 + 120 * luz) + ',' + Math.round(139 + 80 * luz) + ',255)';
        ctx.lineCap = 'round';
        ctx.lineWidth = rem * 0.42; ctx.stroke();
      });
      texto(ctx, w - mitad > rem * 16 ? 'NUDO: INTACTO · SIGUE SIENDO UN NUDO' : 'NUDO: INTACTO', mitad + rem * 0.8, h - rem * 1.2, rem * 0.75, '#fff', 'left', 700);
    }
    rango.addEventListener('input', function () { ruido = rango.value / 100; txt.textContent = rango.value + ' %'; });
    document.getElementById('nudo-reiniciar').addEventListener('click', function () { bit = 1; volteos = 0; });
    var bucle = Expo.bucle(cuadro);
    Expo.registrar('l-topologia', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  /* ------------------------------------------------------------------
     La ola del estadio: un comportamiento colectivo que «viaja»
     ------------------------------------------------------------------ */
  function ola() {
    var L = Expo.lienzo(document.getElementById('cv-ola'));
    var FILAS = 5, COLS = 30;
    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      var margen = rem * 1, ancho = w - margen * 2;
      var centro = Expo.reducido ? 0.5 : ((t * 0.16) % 1.3) - 0.15;   // posición de la ola (0..1)
      var paso = ancho / COLS;
      var filaH = (h - rem * 4) / FILAS;
      for (var f = 0; f < FILAS; f++) {
        // Grada
        var baseY = rem * 3 + (f + 1) * filaH;
        ctx.fillStyle = 'rgba(82,145,255,0.10)';
        ctx.fillRect(margen, baseY - filaH * 0.12, ancho, filaH * 0.12);
        for (var c = 0; c < COLS; c++) {
          var u = (c + 0.5) / COLS;
          var retraso = f * 0.01;
          var d = (u - centro + retraso) / 0.06;
          var alt = Math.exp(-d * d);                     // 0 sentado, 1 de pie
          var x = margen + (c + 0.5) * paso;
          var cuerpo = filaH * (0.32 + 0.38 * alt);
          var marcado = (c === 14 && f === 2);
          var color = marcado ? C.alerta : 'rgba(' + Math.round(120 + 135 * alt) + ',' + Math.round(170 + 85 * alt) + ',255,' + (0.55 + 0.45 * alt) + ')';
          ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(2, paso * 0.18); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, baseY - filaH * 0.12); ctx.lineTo(x, baseY - cuerpo); ctx.stroke();
          ctx.beginPath(); ctx.arc(x, baseY - cuerpo - paso * 0.22, paso * 0.2, 0, TAU); ctx.fill();
          if (alt > 0.5) {   // brazos arriba
            ctx.lineWidth = Math.max(1.5, paso * 0.1);
            ctx.beginPath();
            ctx.moveTo(x, baseY - cuerpo * 0.8); ctx.lineTo(x - paso * 0.3, baseY - cuerpo - paso * 0.45 * alt);
            ctx.moveTo(x, baseY - cuerpo * 0.8); ctx.lineTo(x + paso * 0.3, baseY - cuerpo - paso * 0.45 * alt);
            ctx.stroke();
          }
        }
      }
      // Corchete de la «cuasipartícula»
      var cx = margen + centro * ancho;
      if (centro > -0.05 && centro < 1.05) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - paso * 2.2, rem * 2.6); ctx.lineTo(cx - paso * 2.2, rem * 2.1); ctx.lineTo(cx + paso * 2.2, rem * 2.1); ctx.lineTo(cx + paso * 2.2, rem * 2.6);
        ctx.stroke();
        texto(ctx, 'CUASIPARTÍCULA →', cx, rem * 1.3, rem * 0.8, '#fff', 'center', 700);
      }
      texto(ctx, '● esta persona solo se levanta y se sienta', margen, h - rem * 0.7, rem * 0.75, C.alerta, 'left', 600);
    }
    var bucle = Expo.bucle(cuadro);
    Expo.registrar('l-particulas', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  /* ------------------------------------------------------------------
     Paridad: pares de baile (pares de Cooper) y electrón suelto
     ------------------------------------------------------------------ */
  function paridad() {
    var L = Expo.lienzo(document.getElementById('cv-paridad'));
    var bAgregar = document.getElementById('paridad-agregar');
    var eEstado = document.getElementById('paridad-estado');
    var PAREJAS = 6;
    var parejas = [];
    for (var i = 0; i < PAREJAS; i++) {
      parejas.push({ u: 0.12 + i * 0.152, v: 0.5 + (i % 2 ? 0.14 : -0.14), fase: Math.random() * TAU, vel: 1.6 + Math.random() * 0.8 });
    }
    var suelto = null;          // { u, v, entrando: 0..1, saliendo }
    var mensaje = null;         // { txt, t, color }
    var golpe = 0;

    function estado() {
      var n = PAREJAS * 2 + (suelto && !suelto.saliendo ? 1 : 0);
      var par = n % 2 === 0;
      eEstado.textContent = (par ? 'PAR' : 'IMPAR') + ' (' + n + ' electrones) → qubit = ' + (par ? 0 : 1);
      bAgregar.textContent = suelto && !suelto.saliendo ? 'Se va el electrón solo' : 'Llega un electrón solo';
    }
    function alternarSuelto() {
      if (suelto && !suelto.saliendo) suelto.saliendo = true;
      else suelto = { u: 0.5, v: 0.5, entrando: 0, saliendo: false, t: 0 };
      estado();
    }
    function ruido() {
      golpe = 1;
      if (Math.random() < 0.2) {
        if (!(suelto && !suelto.saliendo)) {
          suelto = { u: 0.5, v: 0.5, entrando: 0, saliendo: false, t: 0 };
          mensaje = { txt: 'EVENTO RARO: apareció un electrón suelto · el qubit se volteó', t: 0, color: C.alerta };
        } else {
          suelto.saliendo = true;
          mensaje = { txt: 'EVENTO RARO: el electrón suelto se fue · el qubit se volteó', t: 0, color: C.alerta };
        }
      } else {
        mensaje = { txt: 'Las parejas resisten: romper una cuesta energía', t: 0, color: C.azul2 };
      }
      estado();
    }

    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      // Pista (nanohilo) con modos de Majorana en los extremos
      var px = rem * 1.2, py = h * 0.2, pw = w - rem * 2.4, ph = h * 0.6;
      ctx.fillStyle = 'rgba(59,139,255,0.08)'; ctx.strokeStyle = 'rgba(82,145,255,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, ph / 2); else ctx.rect(px, py, pw, ph);
      ctx.fill(); ctx.stroke();
      [px + ph * 0.22, px + pw - ph * 0.22].forEach(function (mx) {
        var g = ctx.createRadialGradient(mx, py + ph / 2, 0, mx, py + ph / 2, ph * 0.35);
        g.addColorStop(0, 'rgba(143,193,255,0.9)'); g.addColorStop(1, 'rgba(59,139,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, py + ph / 2, ph * 0.35, 0, TAU); ctx.fill();
        texto(ctx, 'MZM', mx, py + ph + rem * 0.7, rem * 0.75, C.azul2, 'center', 600);
      });
      texto(ctx, 'NANOHILO TOPOLÓGICO · PISTA DE BAILE', px, rem * 0.9, rem * 0.75, C.rotulo, 'left', 600);

      // Golpe de ruido: onda que cruza
      if (golpe > 0) {
        golpe = Math.max(0, golpe - dt * 1.4);
        var gx = px + pw * (1 - golpe);
        ctx.strokeStyle = 'rgba(255,176,59,' + golpe + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(gx, py - rem * 0.4); ctx.lineTo(gx, py + ph + rem * 0.4); ctx.stroke();
      }

      // Parejas que bailan
      var r = Math.min(rem * 0.42, ph * 0.08), radio = ph * 0.13;
      parejas.forEach(function (p) {
        var ang = p.fase + (Expo.reducido ? 0 : t * p.vel);
        var cx = px + pw * p.u, cy = py + ph * p.v;
        var ax = cx + Math.cos(ang) * radio, ay = cy + Math.sin(ang) * radio * 0.7;
        var bx = cx - Math.cos(ang) * radio, by = cy - Math.sin(ang) * radio * 0.7;
        ctx.strokeStyle = 'rgba(143,193,255,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ax, ay, r, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
      });

      // Electrón suelto
      if (suelto) {
        suelto.t += dt;
        if (!suelto.saliendo) suelto.entrando = Math.min(1, suelto.entrando + dt / 0.6);
        else suelto.entrando = Math.max(0, suelto.entrando - dt / 0.5);
        var k = Expo.suavizar(suelto.entrando);
        var sx = px + pw * 0.5 + Math.sin(suelto.t * 1.3) * pw * 0.06;
        var sy = (py - rem * 2) + (py + ph * 0.5 - (py - rem * 2)) * k + Math.cos(suelto.t * 2) * ph * 0.05 * k;
        ctx.globalAlpha = Math.max(0.15, k);
        var g2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4);
        g2.addColorStop(0, 'rgba(255,176,59,0.8)'); g2.addColorStop(1, 'rgba(255,176,59,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(sx, sy, r * 4, 0, TAU); ctx.fill();
        ctx.fillStyle = C.alerta; ctx.beginPath(); ctx.arc(sx, sy, r * 1.1, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        if (k > 0.9) texto(ctx, 'SIN PAREJA', sx, sy - r * 3, rem * 0.75, C.alerta, 'center', 700);
        if (suelto.saliendo && suelto.entrando <= 0) { suelto = null; estado(); }
      }

      // Mensaje temporal
      if (mensaje) {
        mensaje.t += dt;
        var a = mensaje.t < 2.2 ? 1 : Math.max(0, 1 - (mensaje.t - 2.2) / 0.4);
        ctx.globalAlpha = a;
        texto(ctx, mensaje.txt, w / 2, h - rem * 0.8, rem * 0.8, mensaje.color, 'center', 600);
        ctx.globalAlpha = 1;
        if (a <= 0) mensaje = null;
      }
    }
    bAgregar.addEventListener('click', alternarSuelto);
    document.getElementById('paridad-ruido').addEventListener('click', ruido);
    estado();
    var bucle = Expo.bucle(cuadro);
    Expo.registrar('l-topoconductor', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  /* ------------------------------------------------------------------
     Medición digital: recorrer los pasos
     ------------------------------------------------------------------ */
  function medicionDigital() {
    var lista = document.getElementById('pasos-medicion');
    var pasos = lista.querySelectorAll('[data-paso]');
    var esquema = document.getElementById('esquema-medicion');
    var nodos = esquema.querySelectorAll('.nodo');
    var actual = -1;
    var timer = Expo.temporizadores();
    function mostrar(i) {
      actual = i;
      lista.classList.toggle('en-curso', i >= 0);
      esquema.classList.toggle('en-curso', i >= 0);
      Array.prototype.forEach.call(nodos, function (n) { n.classList.toggle('on', +n.dataset.nodo <= i); });
      Array.prototype.forEach.call(pasos, function (p, k) {
        p.classList.toggle('actual', k === i);
        p.classList.toggle('hecho', k < i);
      });
    }
    function siguientePaso() { mostrar(actual >= pasos.length - 1 ? -1 : actual + 1); }
    document.getElementById('medicion-siguiente').addEventListener('click', function () { timer.limpiar(); siguientePaso(); });
    document.getElementById('medicion-auto').addEventListener('click', function () {
      timer.limpiar();
      mostrar(0);
      for (var i = 1; i < pasos.length; i++) (function (k) { timer.poner(function () { mostrar(k); }, k * 1400); })(i);
    });
    Expo.registrar('l-medicion', { iniciar: function () { mostrar(-1); }, detener: timer.limpiar });
  }

  /* ------------------------------------------------------------------
     Tetron: matriz 4×2 dibujada en el SVG
     ------------------------------------------------------------------ */
  function matrizTetrones() {
    var g = document.getElementById('tetron-matriz');
    var NS = 'http://www.w3.org/2000/svg';
    function el(tag, a) { var n = document.createElementNS(NS, tag); for (var k in a) n.setAttribute(k, a[k]); return n; }
    for (var f = 0; f < 2; f++) {
      for (var c = 0; c < 4; c++) {
        var x = 318 + c * 48, y = 60 + f * 90;
        var grupo = el('g', { 'class': 'mini-tetron' });
        grupo.appendChild(el('rect', { x: x, y: y, width: 36, height: 6, rx: 3 }));
        grupo.appendChild(el('rect', { x: x, y: y + 44, width: 36, height: 6, rx: 3 }));
        grupo.appendChild(el('rect', { x: x + 15, y: y + 6, width: 6, height: 38 }));
        [[x, y + 3], [x + 36, y + 3], [x, y + 47], [x + 36, y + 47]].forEach(function (p) {
          grupo.appendChild(el('circle', { cx: p[0], cy: p[1], r: 4.5, 'class': 'mzm' }));
        });
        g.appendChild(grupo);
      }
    }
  }

  /* ------------------------------------------------------------------
     Videos: modal con iframe (solo se crea al abrir)
     ------------------------------------------------------------------ */
  function videos() {
    var modal = document.getElementById('modal-video');
    var marco = document.getElementById('modal-marco');
    var titulo = document.getElementById('modal-titulo');
    var aviso = document.getElementById('modal-aviso');
    var cerrar = document.getElementById('modal-cerrar');
    var cab = modal.querySelector('.modal-cab');
    var enlace = Expo.crear('a', 'btn', 'Abrir en YouTube');
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    enlace.style.textDecoration = 'none';
    enlace.style.color = 'var(--hielo)';
    enlace.style.borderColor = 'var(--linea-hud)';
    var acciones = Expo.crear('div', 'controles');
    cab.removeChild(cerrar);
    acciones.appendChild(enlace);
    acciones.appendChild(cerrar);
    cab.appendChild(acciones);
    var origen = null;

    function abrir(id, nombre, boton) {
      origen = boton;
      titulo.textContent = nombre;
      enlace.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(id);
      while (marco.firstChild) marco.removeChild(marco.firstChild);
      var sinRed = navigator.onLine === false;
      aviso.hidden = !sinRed;
      if (!sinRed) {
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
        f.title = nombre;
        f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        marco.appendChild(f);
      }
      modal.classList.add('abierto');
      modal.setAttribute('aria-hidden', 'false');
      cerrar.focus();
    }
    function cerrarModal() {
      if (!modal.classList.contains('abierto')) return;
      modal.classList.remove('abierto');
      modal.setAttribute('aria-hidden', 'true');
      while (marco.firstChild) marco.removeChild(marco.firstChild);   // detiene el video
      if (origen) origen.focus();
    }
    Expo.modalAbierto = function () { return modal.classList.contains('abierto'); };
    Expo.cerrarModal = cerrarModal;
    cerrar.addEventListener('click', cerrarModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) cerrarModal(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-video]'), function (b) {
      b.addEventListener('click', function () { abrir(b.dataset.video, b.dataset.tituloVideo, b); });
    });
    var avisoLamina = document.getElementById('aviso-conexion');
    Expo.registrar('l-videos', {
      iniciar: function () {
        avisoLamina.textContent = navigator.onLine === false
          ? 'Sin conexión a internet: los videos no podrán cargarse ahora.'
          : 'Los videos se cargan desde YouTube: necesitan conexión a internet.';
        avisoLamina.style.color = navigator.onLine === false ? 'var(--alerta)' : '';
      },
      detener: cerrarModal
    });
  }

  /* ------------------------------------------------------------------
     Preguntas frecuentes: acordeón (una abierta a la vez)
     ------------------------------------------------------------------ */
  function acordeon() {
    var botones = document.querySelectorAll('#acordeon .acordeon-boton');
    Array.prototype.forEach.call(botones, function (b) {
      b.addEventListener('click', function () {
        var abrir = b.getAttribute('aria-expanded') !== 'true';
        Array.prototype.forEach.call(botones, function (o) {
          o.setAttribute('aria-expanded', 'false');
          o.nextElementSibling.hidden = true;
        });
        if (abrir) { b.setAttribute('aria-expanded', 'true'); b.nextElementSibling.hidden = false; }
      });
    });
  }

  lineaDeTiempo();
  inclinacion();
  nudo();
  ola();
  paridad();
  medicionDigital();
  matrizTetrones();
  videos();
  acordeon();
})();

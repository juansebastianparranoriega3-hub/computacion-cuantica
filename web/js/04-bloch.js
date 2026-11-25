/* =====================================================================
   04-bloch.js — Qubits: amplitudes α/β, esfera de Bloch arrastrable con
   puertas X/H/Z, crecimiento 2ⁿ, circuito H+CNOT y código de repetición.
   ===================================================================== */
(function () {
  'use strict';
  var C = Expo.color, F = Expo.fuente;
  var TAU = Math.PI * 2;

  function texto(ctx, txt, x, y, tam, color, alinear, peso, familia) {
    alinear = alinear || 'left';
    ctx.font = (peso || 500) + ' ' + Math.round(tam) + 'px ' + (familia || F.mono);
    var aj = Expo.ajusteTexto(ctx, txt, x, alinear), k = aj.k;   // en pantallas chicas, que no se salga
    x = aj.x;
    if (k < 1) ctx.font = (peso || 500) + ' ' + Math.floor(tam * k) + 'px ' + (familia || F.mono);
    ctx.fillStyle = color;
    ctx.textAlign = alinear;
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }
  function miles(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  /* ------------------------------------------------------------------
     Amplitudes: α² y β²
     ------------------------------------------------------------------ */
  function amplitudes() {
    var rango = document.getElementById('qb-alfa');
    var b0 = document.getElementById('qb-barra0'), b1 = document.getElementById('qb-barra1');
    var t0 = document.getElementById('qb-p0'), t1 = document.getElementById('qb-p1');
    var pie = document.getElementById('qb-pie');
    function poner(v) {
      v = +v;
      rango.value = v;
      b0.style.transform = 'scaleX(' + (v / 100) + ')';
      b1.style.transform = 'scaleX(' + (1 - v / 100) + ')';
      t0.textContent = v + ' %';
      t1.textContent = (100 - v) + ' %';
      var frase;
      if (v === 50) frase = 'Superposición «justa»: 50 % de obtener 0 y 50 % de obtener 1.';
      else if (v === 100) frase = 'α² = 1: es justo un bit clásico en 0. El bit es un caso particular del qubit.';
      else if (v === 0) frase = 'β² = 1: es un bit clásico en 1.';
      else frase = 'Al medir saldrá 0 el ' + v + ' % de las veces y 1 el ' + (100 - v) + ' %.';
      pie.textContent = frase;
    }
    rango.addEventListener('input', function () { poner(rango.value); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-alfa]'), function (b) {
      b.addEventListener('click', function () { poner(b.dataset.alfa); });
    });
    poner(50);
  }

  /* ------------------------------------------------------------------
     Esfera de Bloch
     ------------------------------------------------------------------ */
  function bloch() {
    var canvas = document.getElementById('cv-bloch');
    var L = Expo.lienzo(canvas);
    var v = [0, 0, 1];                 // estado (x, y, z) en la esfera
    var vista = { yaw: -0.55, pitch: 0.38, vYaw: 0, vPitch: 0 };
    var anim = null;                   // { tipo, eje, desde, t, dur, hacia }
    var estela = [];
    var destello = 0;
    var arrastre = null;
    var lect = {
      theta: document.getElementById('bloch-theta'), phi: document.getElementById('bloch-phi'),
      p0: document.getElementById('bloch-p0'), p1: document.getElementById('bloch-p1')
    };
    var ultimaLectura = '';

    function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
    function rotar(p, n, ang) {
      // Fórmula de Rodrigues
      var c = Math.cos(ang), s = Math.sin(ang);
      var d = n[0] * p[0] + n[1] * p[1] + n[2] * p[2];
      var cr = [n[1] * p[2] - n[2] * p[1], n[2] * p[0] - n[0] * p[2], n[0] * p[1] - n[1] * p[0]];
      return [p[0] * c + cr[0] * s + n[0] * d * (1 - c), p[1] * c + cr[1] * s + n[1] * d * (1 - c), p[2] * c + cr[2] * s + n[2] * d * (1 - c)];
    }
    function proyectar(p, cx, cy, R) {
      var cyw = Math.cos(vista.yaw), syw = Math.sin(vista.yaw);
      var x1 = p[0] * cyw - p[1] * syw, y1 = p[0] * syw + p[1] * cyw, z1 = p[2];
      var cp = Math.cos(vista.pitch), sp = Math.sin(vista.pitch);
      var y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp;
      return { x: cx + x1 * R, y: cy - z2 * R, cerca: -y2 };   // cerca > 0: hacia el espectador
    }
    var EJES = { X: [1, 0, 0], Z: [0, 0, 1], H: norm([1, 0, 1]) };

    function aplicarPuerta(nombre) {
      if (anim) { v = anim.final(); }
      var eje = EJES[nombre], desde = v.slice();
      estela = [];
      anim = {
        t: 0, dur: Expo.reducido ? 0.001 : 0.75, nombre: nombre,
        en: function (k) { return rotar(desde, eje, Math.PI * k); },
        final: function () { return norm(rotar(desde, eje, Math.PI)); }
      };
    }
    function irA(destino) {
      if (anim) v = anim.final();
      var desde = v.slice(), hacia = destino;
      var ang = Math.acos(Expo.limitar(desde[0] * hacia[0] + desde[1] * hacia[1] + desde[2] * hacia[2], -1, 1));
      var eje = [desde[1] * hacia[2] - desde[2] * hacia[1], desde[2] * hacia[0] - desde[0] * hacia[2], desde[0] * hacia[1] - desde[1] * hacia[0]];
      if (Math.hypot(eje[0], eje[1], eje[2]) < 1e-6) eje = [1, 0, 0];
      eje = norm(eje);
      estela = [];
      anim = {
        t: 0, dur: Expo.reducido ? 0.001 : 0.5,
        en: function (k) { return rotar(desde, eje, ang * k); },
        final: function () { return hacia.slice(); }
      };
    }
    function medir() {
      if (anim) v = anim.final();
      var p0 = (1 + v[2]) / 2;
      var sale0 = Math.random() < p0;
      irA(sale0 ? [0, 0, 1] : [0, 0, -1]);
      destello = 1;
      Expo.sonar('colapso', sale0);
    }

    function circulo(ctx, puntoEn, cx, cy, R, color, grosor) {
      // Círculo 3D en segmentos; la mitad trasera más tenue
      var N = 72, prev = null;
      for (var i = 0; i <= N; i++) {
        var q = proyectar(puntoEn(i / N * TAU), cx, cy, R);
        if (prev) {
          ctx.strokeStyle = color;
          ctx.globalAlpha = (prev.cerca + q.cerca) / 2 > 0 ? 0.85 : 0.22;
          ctx.lineWidth = grosor;
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
        prev = q;
      }
      ctx.globalAlpha = 1;
    }

    function cuadro(dt) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2 + rem * 0.2, R = Math.min(w, h) * 0.36;

      // Inercia al soltar
      if (!arrastre) {
        vista.yaw += vista.vYaw * dt; vista.pitch = Expo.limitar(vista.pitch + vista.vPitch * dt, -1.3, 1.3);
        var fr = Math.pow(0.04, dt);
        vista.vYaw *= fr; vista.vPitch *= fr;
      }
      // Animación de puerta
      if (anim) {
        anim.t = Math.min(1, anim.t + dt / anim.dur);
        v = anim.en(Expo.suavizarIO(anim.t));
        estela.push(v.slice());
        if (anim.t >= 1) { v = anim.final(); anim = null; }
      }

      // Esfera
      var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, 'rgba(90,150,255,0.35)');
      g.addColorStop(0.7, 'rgba(20,50,120,0.25)');
      g.addColorStop(1, 'rgba(59,139,255,0.08)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(143,193,255,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();

      // Ecuador y meridianos
      circulo(ctx, function (a) { return [Math.cos(a), Math.sin(a), 0]; }, cx, cy, R, C.azul, 2);
      circulo(ctx, function (a) { return [Math.cos(a), 0, Math.sin(a)]; }, cx, cy, R, 'rgba(143,193,255,0.6)', 1);
      circulo(ctx, function (a) { return [0, Math.cos(a), Math.sin(a)]; }, cx, cy, R, 'rgba(143,193,255,0.6)', 1);

      // Ejes y rótulos
      var ejes = [
        { p: [0, 0, 1], t: '|0⟩', c: '#fff' }, { p: [0, 0, -1], t: '|1⟩', c: '#fff' },
        { p: [1, 0, 0], t: '|+⟩', c: C.azul2 }, { p: [-1, 0, 0], t: '|−⟩', c: C.azul2 },
        { p: [0, 1, 0], t: '|+i⟩', c: C.rotulo }, { p: [0, -1, 0], t: '|−i⟩', c: C.rotulo }
      ];
      var centro = proyectar([0, 0, 0], cx, cy, R);
      ejes.forEach(function (e) {
        var q = proyectar(e.p, cx, cy, R);
        var q2 = proyectar([e.p[0] * 1.2, e.p[1] * 1.2, e.p[2] * 1.2], cx, cy, R);
        ctx.strokeStyle = 'rgba(143,193,255,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(centro.x, centro.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.setLineDash([]);
        var tam = (e.t === '|0⟩' || e.t === '|1⟩') ? rem * 1.05 : rem * 0.85;
        ctx.globalAlpha = q.cerca > -0.2 ? 1 : 0.8;   // los de atrás, apenas más suaves: legibles en proyector
        texto(ctx, e.t, q2.x, q2.y, tam, e.c, 'center', 700);
        ctx.globalAlpha = 1;
      });

      // Estela de la rotación
      if (estela.length > 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([2, 4]);
        ctx.beginPath();
        estela.forEach(function (p, i) { var q = proyectar(p, cx, cy, R); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
        ctx.stroke(); ctx.setLineDash([]);
      }

      // Proyección al plano ecuatorial (muestra la fase)
      var punta = proyectar(v, cx, cy, R);
      var sombra = proyectar([v[0], v[1], 0], cx, cy, R);
      ctx.strokeStyle = 'rgba(143,193,255,0.5)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(punta.x, punta.y); ctx.lineTo(sombra.x, sombra.y); ctx.lineTo(centro.x, centro.y); ctx.stroke(); ctx.setLineDash([]);

      // Vector de estado
      ctx.save();
      ctx.shadowColor = C.azul; ctx.shadowBlur = 16;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(centro.x, centro.y); ctx.lineTo(punta.x, punta.y); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(punta.x, punta.y, rem * 0.38, 0, TAU); ctx.fill();
      ctx.restore();
      texto(ctx, '|ψ⟩', punta.x + rem * 0.6, punta.y - rem * 0.6, rem * 0.9, '#fff', 'left', 700);

      // Destello de medición
      if (destello > 0) {
        destello = Math.max(0, destello - dt * 1.6);
        ctx.strokeStyle = 'rgba(255,255,255,' + destello + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(punta.x, punta.y, rem * (0.4 + (1 - destello) * 3), 0, TAU); ctx.stroke();
      }

      // Nombre de la puerta en curso
      if (anim && anim.nombre) texto(ctx, 'PUERTA ' + anim.nombre + ' · ROTACIÓN DE 180°', rem * 0.5, rem * 0.8, rem * 0.65, C.azul2, 'left', 600);

      // Lecturas
      var theta = Math.acos(Expo.limitar(v[2], -1, 1)) * 180 / Math.PI;
      var phi = (Math.atan2(v[1], v[0]) * 180 / Math.PI + 360) % 360;
      var p0 = Math.round((1 + v[2]) / 2 * 100);
      var sinFase = Math.hypot(v[0], v[1]) < 0.02;
      var clave = Math.round(theta) + '|' + Math.round(phi) + '|' + p0 + '|' + sinFase;
      if (clave !== ultimaLectura) {
        ultimaLectura = clave;
        lect.theta.textContent = Math.round(theta) + '°';
        lect.phi.textContent = sinFase ? '—' : Math.round(phi) + '°';
        lect.p0.textContent = p0 + ' %';
        lect.p1.textContent = (100 - p0) + ' %';
      }
    }

    // Arrastre para girar la vista (con captura de puntero)
    canvas.addEventListener('pointerdown', function (e) {
      if (arrastre) return;   // ignorar un segundo dedo
      canvas.setPointerCapture(e.pointerId);
      arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
      vista.vYaw = vista.vPitch = 0;
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      var dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
      var ahora = performance.now(), dtm = Math.max(1, ahora - arrastre.t) / 1000;
      var k = 3.2 / Math.max(200, canvas.clientWidth);
      vista.yaw -= dx * k;
      vista.pitch = Expo.limitar(vista.pitch + dy * k, -1.3, 1.3);
      vista.vYaw = -dx * k / dtm * 0.6;
      vista.vPitch = dy * k / dtm * 0.6;
      arrastre.x = e.clientX; arrastre.y = e.clientY; arrastre.t = ahora;
    });
    function soltar(e) {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      if (performance.now() - arrastre.t > 80) { vista.vYaw = vista.vPitch = 0; }
      arrastre = null;
    }
    canvas.addEventListener('pointerup', soltar);
    canvas.addEventListener('pointercancel', soltar);

    Array.prototype.forEach.call(document.querySelectorAll('[data-puerta]'), function (b) {
      b.addEventListener('click', function () { aplicarPuerta(b.dataset.puerta); Expo.sonar('puerta', b.dataset.puerta); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#l-bloch [data-estado]'), function (b) {
      b.addEventListener('click', function () { irA(b.dataset.estado === '0' ? [0, 0, 1] : [0, 0, -1]); });
    });
    document.getElementById('bloch-medir').addEventListener('click', medir);

    var bucle = Expo.bucle(cuadro);
    Expo.registrar('l-bloch', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  /* ------------------------------------------------------------------
     Crecimiento 2ⁿ
     ------------------------------------------------------------------ */
  function potencia() {
    var L = Expo.lienzo(document.getElementById('cv-potencia'));
    var rango = document.getElementById('pot-rango');
    var eN = document.getElementById('pot-n');
    var eNum = document.getElementById('pot-numero');
    var eTexto = document.getElementById('pot-texto');
    var eClasico = document.getElementById('pot-clasico');
    var n = 3, nVisible = 3;
    var LOG2 = Math.log10(2);

    // Escribe el número en un elemento: exacto hasta 2⁴⁰; después, notación científica con <sup>
    // (los superíndices Unicode en fuentes mono se confunden con «°»).
    function escribir(el, k, prefijo, sufijo) {
      while (el.firstChild) el.removeChild(el.firstChild);
      if (prefijo) el.appendChild(document.createTextNode(prefijo));
      if (k <= 40) {
        var exacto = typeof BigInt === 'function' ? (BigInt(2) ** BigInt(k)).toString() : String(Math.pow(2, k));
        el.appendChild(document.createTextNode(miles(exacto)));
      } else {
        var l = k * LOG2, e = Math.floor(l), m = Math.pow(10, l - e);
        el.appendChild(document.createTextNode('≈ ' + m.toFixed(2).replace('.', ',') + ' × 10'));
        el.appendChild(Expo.crear('sup', null, String(e)));
      }
      if (sufijo) el.appendChild(document.createTextNode(sufijo));
    }
    function poner(k) {
      n = Expo.limitar(+k, 1, 300);
      rango.value = n;
      eN.textContent = n;
      escribir(eNum, n);
      escribir(eClasico, n, 'de ', ' posibles');
      while (eTexto.firstChild) eTexto.removeChild(eTexto.firstChild);
      if (n * LOG2 >= 80) {
        eTexto.appendChild(document.createTextNode('amplitudes: más que átomos en el universo observable (~10'));
        eTexto.appendChild(Expo.crear('sup', null, '80'));
        eTexto.appendChild(document.createTextNode(')'));
      } else {
        eTexto.textContent = n === 50 ? 'amplitudes (unos 1.100 billones)' : 'amplitudes a la vez';
      }
    }

    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      nVisible += (n - nVisible) * Math.min(1, dt * 8);

      // Rejilla de amplitudes (hasta 2¹² celdas)
      var zonaH = h - rem * 6;
      var k = Math.min(n, 12);
      var celdas = Math.pow(2, k);
      var cols = Math.pow(2, Math.ceil(k / 2)), filas = Math.pow(2, Math.floor(k / 2));
      var lado = Math.min((w - rem * 1.2) / cols, zonaH / filas);
      var gx = (w - lado * cols) / 2, gy = rem * 0.6 + (zonaH - lado * filas) / 2;
      var hueco = lado > 6 ? Math.max(1, lado * 0.12) : 0;
      for (var i = 0; i < celdas; i++) {
        var cx = i % cols, cy = Math.floor(i / cols);
        var brillo = 0.45 + 0.55 * Math.abs(Math.sin(i * 12.9898 + (Expo.reducido ? 0 : t * (0.6 + (i % 7) * 0.13))));
        ctx.fillStyle = 'rgba(' + Math.round(40 + 100 * brillo) + ',' + Math.round(110 + 80 * brillo) + ',255,' + (0.35 + 0.6 * brillo) + ')';
        ctx.fillRect(gx + cx * lado, gy + cy * lado, lado - hueco, lado - hueco);
      }
      if (n <= 6) {
        // Etiquetas binarias de cada amplitud
        for (var j = 0; j < celdas; j++) {
          var x = gx + (j % cols) * lado + (lado - hueco) / 2, y = gy + Math.floor(j / cols) * lado + (lado - hueco) / 2;
          texto(ctx, j.toString(2).padStart(n, '0'), x, y, Math.min(rem * 0.9, lado * 0.22), '#fff', 'center', 700);
        }
      }
      if (n > 12) {
        ctx.fillStyle = 'rgba(2,5,12,0.72)';
        ctx.fillRect(gx, gy + lado * filas / 2 - rem * 1.3, lado * cols, rem * 2.6);
        var yMsg = gy + lado * filas / 2;
        if (n - 12 > 28) {
          // «… faltan 10^k veces más» con el exponente dibujado pequeño y elevado
          var exp = String(Math.floor((n - 12) * LOG2));
          var a = 'Aquí caben 4.096 celdas · faltan 10', b = ' veces más';
          ctx.font = '600 ' + Math.round(rem * 0.8) + 'px ' + F.mono;
          var wa = ctx.measureText(a).width, wb2 = ctx.measureText(b).width;
          ctx.font = '600 ' + Math.round(rem * 0.55) + 'px ' + F.mono;
          var we2 = ctx.measureText(exp).width;
          var xa = w / 2 - (wa + we2 + wb2) / 2;
          texto(ctx, a, xa, yMsg, rem * 0.8, '#fff', 'left', 600);
          texto(ctx, exp, xa + wa, yMsg - rem * 0.3, rem * 0.55, '#fff', 'left', 600);
          texto(ctx, b, xa + wa + we2, yMsg, rem * 0.8, '#fff', 'left', 600);
        } else {
          texto(ctx, 'Aquí caben 4.096 celdas · faltan ' + miles(String(Math.pow(2, n - 12))) + ' veces más', w / 2, yMsg, rem * 0.8, '#fff', 'center', 600);
        }
      }

      // Regla logarítmica: dígitos de 2ⁿ frente a referencias
      var rx = rem * 0.8, rw = w - rem * 1.6, ry = h - rem * 2.9;
      var maxDec = 95;
      ctx.fillStyle = 'rgba(82,145,255,0.12)'; ctx.fillRect(rx, ry, rw, rem * 0.6);
      var dec = nVisible * LOG2;
      ctx.fillStyle = C.azul; ctx.fillRect(rx, ry, rw * Math.min(1, dec / maxDec), rem * 0.6);
      ctx.strokeStyle = 'rgba(82,145,255,0.5)'; ctx.strokeRect(rx, ry, rw, rem * 0.6);
      [[3, ''], [15, ''], [80, ' átomos'], [90, '']].forEach(function (m) {
        var mx = rx + rw * m[0] / maxDec;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(mx, ry - rem * 0.25); ctx.lineTo(mx, ry + rem * 0.85); ctx.stroke();
        // «10» con exponente dibujado más pequeño y elevado (las fuentes mono no traen buenos superíndices)
        var color = m[0] === 80 ? C.alerta : C.rotulo;
        var tb = rem * 0.85, te = rem * 0.75, y0 = m[0] === 80 ? ry - rem * 0.85 : ry + rem * 1.6;
        ctx.font = '600 ' + Math.round(tb) + 'px ' + F.mono; var wb = ctx.measureText('10').width;
        ctx.font = '600 ' + Math.round(te) + 'px ' + F.mono; var we = ctx.measureText(String(m[0])).width;
        ctx.font = '600 ' + Math.round(tb) + 'px ' + F.mono; var ws = ctx.measureText(m[1]).width;
        var x0 = m[0] === 90 ? mx - (wb + we + ws) : mx - (wb + we) / 2;
        texto(ctx, '10', x0, y0, tb, color, 'left', 600);
        texto(ctx, String(m[0]), x0 + wb, y0 - rem * 0.32, te, color, 'left', 600);
        if (m[1]) texto(ctx, m[1], x0 + wb + we, y0, tb, color, 'left', 600);
      });
      // Título de la regla: 0,75 rem, sin pisar el rótulo «10⁸⁰ átomos» (que va a la misma altura)
      var titulo = 'ESCALA LOGARÍTMICA · CANTIDAD DE DÍGITOS', tt = rem * 0.75;
      ctx.font = '600 ' + Math.round(tt) + 'px ' + F.mono;
      var libre = rx + rw * 80 / maxDec - rem * 1.6 - rx, anchoT = ctx.measureText(titulo).width;
      if (anchoT > libre && libre > 0) tt *= libre / anchoT;
      texto(ctx, titulo, rx, ry - rem * 0.85, tt, C.rotulo, 'left', 600);
    }
    rango.addEventListener('input', function () { poner(rango.value); Expo.sonar('potencia', n); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-n]'), function (b) {
      b.addEventListener('click', function () { poner(b.dataset.n); Expo.sonar('potencia', n); });
    });
    poner(3);
    var bucle = Expo.bucle(cuadro);
    Expo.registrar('l-potencia', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  /* ------------------------------------------------------------------
     Circuito H + CNOT y medición del estado entrelazado
     ------------------------------------------------------------------ */
  function circuitoBell() {
    var pulsos = [document.getElementById('pulso-0'), document.getElementById('pulso-1')];
    var cuentas = { '00': 0, '01': 0, '10': 0, '11': 0 };
    var animando = false, raf = 0;
    function pintar() {
      var max = Math.max(1, cuentas['00'], cuentas['01'], cuentas['10'], cuentas['11']);
      Object.keys(cuentas).forEach(function (k) {
        document.getElementById('bell-' + k).style.transform = 'scaleY(' + (cuentas[k] / max) + ')';
        document.getElementById('bell-' + k + '-n').textContent = cuentas[k];
      });
    }
    function muestra() { return Math.random() < 0.5 ? '00' : '11'; }
    function ejecutar() {
      if (animando) return;
      if (Expo.reducido) { cuentas[muestra()]++; pintar(); return; }
      animando = true;
      var t0 = performance.now(), DUR = 1100;
      function paso(t) {
        var k = Math.min(1, (t - t0) / DUR);
        var x = 410 * Expo.suavizarIO(k);
        pulsos.forEach(function (p) {
          p.setAttribute('transform', 'translate(' + x + ' 0)');
          p.style.opacity = k < 0.95 ? 1 : (1 - k) * 20;
        });
        if (k < 1) raf = requestAnimationFrame(paso);
        else { animando = false; cuentas[muestra()]++; pintar(); }
      }
      raf = requestAnimationFrame(paso);
    }
    document.getElementById('bell-uno').addEventListener('click', ejecutar);
    document.getElementById('bell-cien').addEventListener('click', function () {
      for (var i = 0; i < 100; i++) cuentas[muestra()]++;
      pintar();
    });
    document.getElementById('bell-reiniciar').addEventListener('click', function () {
      cuentas = { '00': 0, '01': 0, '10': 0, '11': 0 }; pintar();
    });
    Expo.registrar('l-puertas', {
      detener: function () {
        cancelAnimationFrame(raf); animando = false;
        pulsos.forEach(function (p) { p.style.opacity = 0; });
      }
    });
    pintar();
  }

  /* ------------------------------------------------------------------
     Código de repetición: enviar el mensaje tres veces
     ------------------------------------------------------------------ */
  function repeticion() {
    var mensaje = 1;
    var bits = [1, 1, 1];
    var cont = document.getElementById('rep-bits');
    var eMensaje = document.getElementById('rep-mensaje');
    var eRes = document.getElementById('rep-resultado');
    var eEstado = document.getElementById('rep-estado');
    var botones = [0, 1, 2].map(function (i) {
      var b = Expo.crear('button', 'rep-bit', '1');
      b.setAttribute('aria-label', 'Copia ' + (i + 1) + ': clic para meter ruido');
      b.addEventListener('click', function () { bits[i] ^= 1; pintar(); });
      cont.appendChild(b);
      return b;
    });
    function pintar() {
      var unos = bits[0] + bits[1] + bits[2];
      var res = unos >= 2 ? 1 : 0;
      var errores = bits.filter(function (b) { return b !== mensaje; }).length;
      eMensaje.textContent = mensaje;
      eRes.textContent = res;
      botones.forEach(function (b, i) {
        b.textContent = bits[i];
        b.classList.toggle('error', bits[i] !== mensaje);
      });
      if (errores === 0) eEstado.textContent = 'correcto · sin errores';
      else if (res === mensaje) eEstado.textContent = 'corregido · ' + errores + ' error';
      else eEstado.textContent = 'falla · ' + errores + ' errores';
      eEstado.classList.toggle('mal', res !== mensaje);
    }
    document.getElementById('rep-cambiar').addEventListener('click', function () { mensaje ^= 1; bits = [mensaje, mensaje, mensaje]; pintar(); });
    document.getElementById('rep-ruido').addEventListener('click', function () {
      bits = [mensaje, mensaje, mensaje].map(function (b) { return Math.random() < 0.3 ? b ^ 1 : b; });
      pintar();
    });
    document.getElementById('rep-limpiar').addEventListener('click', function () { bits = [mensaje, mensaje, mensaje]; pintar(); });
    pintar();
  }

  amplitudes();
  bloch();
  potencia();
  circuitoBell();
  repeticion();
})();

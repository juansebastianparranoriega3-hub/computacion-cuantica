/* =====================================================================
   02-clasico.js — Láminas del "periódico": portada, pregunta gancho,
   receta/algoritmo, interruptores de bits, compuertas lógicas, Moore.
   ===================================================================== */
(function () {
  'use strict';
  var C = Expo.color, F = Expo.fuente;

  /* ------------------------------------------------------------------
     Portada: titular letra por letra + grabado en semitono
     ------------------------------------------------------------------ */
  function portadaTitular() {
    var h1 = document.getElementById('titular-portada');
    var n = 0;
    Array.prototype.forEach.call(h1.querySelectorAll('.linea'), function (linea) {
      var texto = linea.textContent;
      linea.textContent = '';
      linea.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < texto.length; i++) {
        var s = Expo.crear('span', 'letra', texto[i]);
        s.style.setProperty('--l', n++);
        linea.appendChild(s);
      }
    });
    Expo.registrar('l-portada', {
      iniciar: function () {
        h1.classList.remove('animar');
        void h1.offsetWidth;
        h1.classList.add('animar');
      },
      detener: function () { h1.classList.remove('animar'); }
    });
  }

  function portadaGrabado() {
    var canvas = document.getElementById('cv-portada');
    // Dibujo estático: se repinta solo al cambiar de tamaño.
    Expo.lienzo(canvas, function (L) {
      var ctx = L.ctx, w = L.ancho, h = L.alto;
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.34;
      var paso = Math.max(4, Math.min(w, h) / 46);
      ctx.fillStyle = C.tinta;
      // Esfera en semitono: el tamaño del punto depende de la sombra
      for (var y = paso / 2; y < h; y += paso) {
        for (var x = paso / 2; x < w; x += paso) {
          var dx = (x - cx) / R, dy = (y - cy) / R;
          var d2 = dx * dx + dy * dy;
          var tono;
          if (d2 <= 1) {
            var z = Math.sqrt(1 - d2);
            var luz = Math.max(0, -0.5 * dx - 0.6 * dy + 0.62 * z);
            tono = 0.85 - luz * 0.8;
          } else {
            // Fondo: degradado suave de imprenta
            tono = 0.1 + 0.08 * Math.sin(x * 0.02) * Math.cos(y * 0.03);
          }
          var r = Math.max(0, tono) * paso * 0.55;
          if (r > 0.3) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      // Órbitas de electrón (líneas de grabado)
      ctx.strokeStyle = C.tinta;
      ctx.lineWidth = 1.6;
      for (var k = 0; k < 3; k++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(k * Math.PI / 3 + 0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.42, R * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = C.papel;
        ctx.arc(R * 1.42, 0, paso * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Rótulos 0 / 1 como en un diagrama antiguo
      ctx.fillStyle = C.tinta;
      ctx.font = 'italic ' + Math.round(R * 0.32) + 'px ' + F.display;
      ctx.textAlign = 'center';
      ctx.fillText('0', cx, cy - R - R * 0.18);
      ctx.fillText('1', cx, cy + R + R * 0.38);
    });
  }

  /* ------------------------------------------------------------------
     Pregunta gancho: texto que se escribe solo
     ------------------------------------------------------------------ */
  function gancho() {
    var p = document.getElementById('gancho-texto');
    var pie = document.getElementById('gancho-pie');
    var texto = p.dataset.texto;
    var timer = Expo.temporizadores();
    var escribiendo = false;
    var nodoTexto = document.createTextNode('');
    var cursor = Expo.crear('span', 'cursor');
    p.appendChild(nodoTexto);
    p.appendChild(cursor);
    p.setAttribute('aria-label', texto);

    function completar() {
      timer.limpiar();
      escribiendo = false;
      nodoTexto.nodeValue = texto;
      pie.classList.add('visible');
    }
    function escribir(i) {
      nodoTexto.nodeValue = texto.slice(0, i);
      if (i >= texto.length) { completar(); return; }
      var ch = texto[i];
      var pausa = (ch === ',' || ch === '?') ? 220 : 38 + Math.random() * 30;
      timer.poner(function () { escribir(i + 1); }, pausa);
    }
    Expo.registrar('l-gancho', {
      iniciar: function () {
        pie.classList.remove('visible');
        if (Expo.reducido) { completar(); return; }
        escribiendo = true;
        nodoTexto.nodeValue = '';
        timer.poner(function () { escribir(0); }, 350);
      },
      detener: function () { timer.limpiar(); escribiendo = false; },
      // Si aún se escribe, → completa la frase en vez de avanzar
      siguiente: function () { if (escribiendo) { completar(); return true; } return false; }
    });
  }

  /* ------------------------------------------------------------------
     Receta = algoritmo «¿es par?»
     ------------------------------------------------------------------ */
  function receta() {
    var numero = 14;
    var pasos = document.querySelectorAll('#receta .receta-paso');
    var vEntrada = document.getElementById('receta-entrada');
    var vProceso = document.getElementById('receta-proceso');
    var vSalida = document.getElementById('receta-salida');
    var timer = Expo.temporizadores();

    function reiniciar() {
      timer.limpiar();
      Array.prototype.forEach.call(pasos, function (p) { p.classList.remove('activo'); });
      vEntrada.textContent = numero;
      vProceso.textContent = '÷ 2 → ¿residuo?';
      vSalida.textContent = '?';
    }
    function ejecutar() {
      reiniciar();
      var residuo = numero % 2;
      var cociente = Math.floor(numero / 2);
      var t = Expo.reducido ? 0 : 520;
      pasos[0].classList.add('activo');
      timer.poner(function () {
        pasos[0].classList.remove('activo');
        pasos[1].classList.add('activo');
        vProceso.textContent = numero + ' ÷ 2 = ' + cociente + ', residuo ' + residuo;
      }, t);
      timer.poner(function () {
        pasos[1].classList.remove('activo');
        pasos[2].classList.add('activo');
        vSalida.textContent = residuo === 0 ? 'Es par' : 'Es impar';
      }, t * 2 + 200);
    }
    document.getElementById('receta-mas').addEventListener('click', function () { numero = Math.min(999, numero + 1); reiniciar(); });
    document.getElementById('receta-menos').addEventListener('click', function () { numero = Math.max(0, numero - 1); reiniciar(); });
    document.getElementById('receta-ejecutar').addEventListener('click', ejecutar);
    Expo.registrar('l-computar', { iniciar: reiniciar, detener: timer.limpiar });
  }

  /* ------------------------------------------------------------------
     Interruptores de bits → decimal y letra ASCII
     ------------------------------------------------------------------ */
  function bits() {
    var cont = document.getElementById('interruptores');
    var valor = 0;
    var botones = [];
    for (var i = 7; i >= 0; i--) {
      (function (pos) {
        var b = Expo.crear('button', 'interruptor');
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', 'Bit de valor ' + (1 << pos));
        var placa = Expo.crear('span', 'interruptor-placa');
        placa.appendChild(Expo.crear('span', 'interruptor-palanca'));
        var bit = Expo.crear('span', 'interruptor-bit', '0');
        var val = Expo.crear('span', 'interruptor-valor', String(1 << pos));
        b.appendChild(placa); b.appendChild(bit); b.appendChild(val);
        b.addEventListener('click', function () { valor ^= (1 << pos); pintar(); });
        botones.push({ boton: b, pos: pos, texto: bit });
        cont.appendChild(b);
      })(i);
    }
    var eBin = document.getElementById('bits-binario');
    var eDec = document.getElementById('bits-decimal');
    var eLetra = document.getElementById('bits-letra');
    var eSuma = document.getElementById('bits-suma');
    function pintar() {
      var partes = [];
      botones.forEach(function (o) {
        var on = (valor >> o.pos) & 1;
        o.boton.setAttribute('aria-pressed', on ? 'true' : 'false');
        o.texto.textContent = on;
        if (on) partes.push(1 << o.pos);
      });
      eBin.textContent = valor.toString(2).padStart(8, '0');
      eDec.textContent = valor;
      eLetra.textContent = (valor >= 33 && valor <= 126) ? '«' + String.fromCharCode(valor) + '»' : '—';
      eSuma.textContent = partes.length
        ? valor + ' = ' + partes.join(' + ') + '  ·  cada posición vale el doble que la anterior'
        : 'Enciende interruptores: cada posición vale el doble que la anterior.';
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-bits]'), function (b) {
      b.addEventListener('click', function () { valor = +b.dataset.bits; pintar(); });
    });
    pintar();
  }

  /* ------------------------------------------------------------------
     Compuertas lógicas AND / OR / NOT
     ------------------------------------------------------------------ */
  function compuertas() {
    var tipo = 'AND', a = 0, b = 0;
    var bA = document.getElementById('puerta-a');
    var bB = document.getElementById('puerta-b');
    var svg = document.getElementById('puerta-svg');
    var bombillo = document.getElementById('puerta-bombillo');
    var salida = document.getElementById('puerta-salida');
    var regla = document.getElementById('puerta-regla');
    var ejemplo = document.getElementById('puerta-ejemplo');
    var pestanas = document.querySelectorAll('[data-compuerta]');
    var NS = 'http://www.w3.org/2000/svg';
    var INFO = {
      NOT: { regla: 'NOT invierte el bit: 0 pasa a 1 y 1 pasa a 0.', ejemplo: 'Un botón que cambia «encendido» por «apagado».' },
      AND: { regla: 'AND da 1 solo si las dos entradas son 1.', ejemplo: 'Para arrancar una máquina hay que girar la llave y pisar el freno.' },
      OR: { regla: 'OR da 1 si al menos una entrada es 1.', ejemplo: 'La alarma suena si se abre la puerta o la ventana.' }
    };

    function el(tag, attrs) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    }
    function dibujar(out) {
      // viewBox 0 0 400 140: cables largos que unen los botones con la compuerta y el bombillo
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var cuerpo;
      if (tipo === 'AND') cuerpo = el('path', { d: 'M150 25 H190 A45 45 0 0 1 190 115 H150 Z', 'class': 'cuerpo' });
      else if (tipo === 'OR') cuerpo = el('path', { d: 'M145 25 Q210 25 240 70 Q210 115 145 115 Q170 70 145 25 Z', 'class': 'cuerpo' });
      else cuerpo = el('path', { d: 'M155 30 L225 70 L155 110 Z', 'class': 'cuerpo' });
      if (tipo === 'NOT') {
        svg.appendChild(el('line', { x1: -40, y1: 70, x2: 155, y2: 70, 'class': 'cable' + (a ? ' on' : '') }));
      } else {
        svg.appendChild(el('polyline', { points: '-40,30 100,30 100,48 160,48', 'class': 'cable' + (a ? ' on' : '') }));
        svg.appendChild(el('polyline', { points: '-40,110 100,110 100,92 160,92', 'class': 'cable' + (b ? ' on' : '') }));
      }
      svg.appendChild(cuerpo);
      var xs = tipo === 'NOT' ? 243 : (tipo === 'AND' ? 235 : 240);
      if (tipo === 'NOT') svg.appendChild(el('circle', { cx: 234, cy: 70, r: 8, 'class': 'cuerpo' }));
      svg.appendChild(el('line', { x1: xs, y1: 70, x2: 440, y2: 70, 'class': 'cable' + (out ? ' on' : '') }));
      var t = el('text', { x: tipo === 'NOT' ? 170 : 166, y: 77 });
      t.textContent = tipo;
      svg.appendChild(t);
    }
    function calcular() {
      if (tipo === 'NOT') return a ? 0 : 1;
      if (tipo === 'AND') return a & b;
      return a | b;
    }
    function pintar() {
      var out = calcular();
      bA.setAttribute('aria-pressed', a ? 'true' : 'false');
      bB.setAttribute('aria-pressed', b ? 'true' : 'false');
      bA.querySelector('.bit-valor').textContent = a;
      bB.querySelector('.bit-valor').textContent = b;
      bB.hidden = tipo === 'NOT';
      salida.textContent = out;
      bombillo.classList.toggle('on', !!out);
      regla.textContent = INFO[tipo].regla;
      ejemplo.textContent = 'Ejemplo cotidiano: ' + INFO[tipo].ejemplo;
      Array.prototype.forEach.call(pestanas, function (p) {
        p.setAttribute('aria-selected', p.dataset.compuerta === tipo ? 'true' : 'false');
      });
      dibujar(out);
    }
    bA.addEventListener('click', function () { a ^= 1; pintar(); });
    bB.addEventListener('click', function () { b ^= 1; pintar(); });
    Array.prototype.forEach.call(pestanas, function (p) {
      p.addEventListener('click', function () { tipo = p.dataset.compuerta; pintar(); });
    });
    pintar();
  }

  /* ------------------------------------------------------------------
     Ley de Moore: curva que se dibuja + efecto túnel
     ------------------------------------------------------------------ */
  function moore() {
    var L = Expo.lienzo(document.getElementById('cv-moore'));
    var t0 = 0;
    var electrones = [];
    var DUR = 2.6;          // segundos que tarda en dibujarse la curva
    var ANIO0 = 1965, ANIO1 = 2025;

    function nuevoElectron(L2) {
      return { x: 0, v: 60 + Math.random() * 50, y: Math.random(), cruza: Math.random() < 0.28, estado: 'va' };
    }

    function cuadro(dt, t) {
      if (!t0) t0 = t;
      var ctx = L.ctx, w = L.ancho, h = L.alto;
      var rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);

      // --- Gráfica (65 % izquierdo)
      var gx = rem * 3.6, gy = rem * 0.8, gw = w * 0.64 - gx, gh = h - gy - rem * 2.2;
      var prog = Expo.reducido ? 1 : Expo.limitar((t - t0) / DUR, 0, 1);
      var progS = Expo.suavizarIO(prog);
      ctx.strokeStyle = C.tinta; ctx.fillStyle = C.tinta; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();

      // Marcas del eje Y: multiplicadores (escala logarítmica, ×2 cada 2 años)
      ctx.font = Math.round(rem * 0.62) + 'px ' + F.mono;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      var marcas = [[0, '×1'], [10, '×1.000'], [20, '×1 M'], [30, '×1.000 M']];
      marcas.forEach(function (m) {
        var y = gy + gh - m[0] / 30 * gh;
        ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillText(m[1], gx - rem * 0.3, y);
      });
      // Eje X: años
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (var a = ANIO0; a <= ANIO1; a += 10) {
        var x = gx + (a - ANIO0) / (ANIO1 - ANIO0) * gw;
        ctx.fillText(String(a), x, gy + gh + rem * 0.35);
      }
      ctx.save();
      ctx.translate(rem * 0.6, gy + gh / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = 'italic ' + Math.round(rem * 0.66) + 'px ' + F.texto;
      ctx.fillText('transistores por chip (escala relativa)', 0, 0);
      ctx.restore();

      // Banda de la escala atómica (aparece al final)
      var banda = Expo.limitar((prog - 0.75) / 0.25, 0, 1);
      if (banda > 0) {
        ctx.globalAlpha = banda;
        var by = gy, bh = gh * 0.12;
        for (var i = 0; i < gw; i += 7) {
          ctx.beginPath(); ctx.moveTo(gx + i, by + bh); ctx.lineTo(gx + i + bh, by); ctx.globalAlpha = banda * 0.35; ctx.stroke();
        }
        ctx.globalAlpha = banda;
        ctx.fillStyle = C.tinta;
        ctx.fillRect(gx + gw * 0.03, by + bh * 0.12, rem * 12.8, rem * 1.15);
        ctx.fillStyle = C.papel;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = 'italic bold ' + Math.round(rem * 0.66) + 'px ' + F.display;
        ctx.fillText('ESCALA ATÓMICA · EFECTO TÚNEL', gx + gw * 0.03 + rem * 0.5, by + bh * 0.12 + rem * 0.6);
        ctx.globalAlpha = 1;
      }

      // Curva: duplicación cada 2 años
      var anioFin = ANIO0 + (ANIO1 - ANIO0) * progS;
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 3;
      ctx.beginPath();
      for (var an = ANIO0; an <= anioFin; an += 0.5) {
        var px = gx + (an - ANIO0) / (ANIO1 - ANIO0) * gw;
        var py = gy + gh - ((an - ANIO0) / 2) / 30 * gh;
        if (an === ANIO0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // Escalones: cada duplicación
      ctx.fillStyle = C.tinta;
      for (var d = ANIO0; d <= anioFin; d += 2) {
        var qx = gx + (d - ANIO0) / (ANIO1 - ANIO0) * gw;
        var qy = gy + gh - ((d - ANIO0) / 2) / 30 * gh;
        ctx.beginPath(); ctx.arc(qx, qy, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      // Etiqueta de la punta
      var ex = gx + (anioFin - ANIO0) / (ANIO1 - ANIO0) * gw;
      var ey = gy + gh - ((anioFin - ANIO0) / 2) / 30 * gh;
      ctx.font = 'bold ' + Math.round(rem * 0.72) + 'px ' + F.mono;
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(Math.floor(anioFin) + '  ×2 cada 2 años', ex - rem * 0.4, ey - rem * 0.2);

      // --- Efecto túnel (derecha)
      var tx = w * 0.69, tw = w - tx - rem * 0.4, ty = gy, th = gh;
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 1.5;
      ctx.strokeRect(tx, ty, tw, th);
      ctx.fillStyle = C.tinta;
      ctx.font = 'italic bold ' + Math.round(rem * 0.7) + 'px ' + F.display;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('EFECTO TÚNEL', tx + tw / 2, ty + rem * 0.4);
      var barX = tx + tw * 0.55, barW = tw * 0.08;
      // Barrera rayada
      ctx.save();
      ctx.beginPath(); ctx.rect(barX, ty + rem * 1.6, barW, th - rem * 3.4); ctx.clip();
      ctx.fillStyle = C.papel2; ctx.fillRect(barX, ty, barW, th);
      for (var k = -th; k < th; k += 6) { ctx.beginPath(); ctx.moveTo(barX, ty + k); ctx.lineTo(barX + barW, ty + k + barW); ctx.stroke(); }
      ctx.restore();
      ctx.strokeRect(barX, ty + rem * 1.6, barW, th - rem * 3.4);
      ctx.font = Math.round(rem * 0.58) + 'px ' + F.mono;
      ctx.textBaseline = 'bottom';
      ctx.fillText('barrera', barX + barW / 2, ty + th - rem * 0.4);

      // Electrones
      if (!Expo.reducido && Math.random() < dt * 3.2 && electrones.length < 18) electrones.push(nuevoElectron());
      var zonaY0 = ty + rem * 1.9, zonaH = th - rem * 4;
      electrones = electrones.filter(function (e) {
        e.x += e.v * dt * (e.estado === 'vuelve' ? -1 : 1);
        var px = tx + rem * 0.4 + e.x;
        if (e.estado === 'va' && px >= barX - 5) {
          if (e.cruza) { e.estado = 'cruzo'; e.x += barW + 10; }
          else e.estado = 'vuelve';
        }
        px = tx + rem * 0.4 + e.x;
        var py = zonaY0 + e.y * zonaH;
        ctx.fillStyle = e.estado === 'cruzo' ? C.tinta : C.tinta2;
        ctx.globalAlpha = e.estado === 'vuelve' ? 0.45 : 1;
        ctx.beginPath(); ctx.arc(px, py, e.estado === 'cruzo' ? 4.5 : 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        return px > tx && px < tx + tw - 4;
      });
    }

    var bucle = Expo.bucle(cuadro);
    document.getElementById('moore-repetir').addEventListener('click', function () { t0 = 0; });
    Expo.registrar('l-moore', {
      iniciar: function () { t0 = 0; bucle.iniciar(); },
      detener: bucle.detener
    });
  }

  portadaTitular();
  portadaGrabado();
  gancho();
  receta();
  bits();
  compuertas();
  moore();
})();

/* =====================================================================
   03-cuantico.js — Física cuántica: transición papel→HUD, cuantización,
   doble rendija, moneda (superposición/medición), interferencia,
   entrelazamiento y decoherencia. Cada animación tiene iniciar/detener.
   ===================================================================== */
(function () {
  'use strict';
  var C = Expo.color, F = Expo.fuente;
  var TAU = Math.PI * 2;

  /* Utilidades de dibujo HUD */
  function textoHUD(ctx, txt, x, y, tam, color, alinear, peso) {
    ctx.font = (peso || 500) + ' ' + Math.round(tam) + 'px ' + F.mono;
    ctx.fillStyle = color || C.azul2;
    ctx.textAlign = alinear || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }
  function brillo(ctx, x, y, r, color, alfa) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(59,139,255,0)');
    ctx.globalAlpha = alfa == null ? 1 : alfa;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------
     Transición: el periódico se descompone en píxeles azules
     ------------------------------------------------------------------ */
  function transicion() {
    var canvas = document.getElementById('cv-transicion');
    var papel = document.createElement('canvas');
    var teselas = [];
    var t0 = 0, activa = false;
    var L = Expo.lienzo(canvas, function () { if (activa) prepararPapel(); });

    function prepararPapel() {
      var w = L.ancho, h = L.alto, dpr = L.dpr, rem = Expo.rem();
      papel.width = Math.round(w * dpr); papel.height = Math.round(h * dpr);
      var p = papel.getContext('2d');
      p.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Papel
      var g = p.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.5, h * 0.5, w * 0.8);
      g.addColorStop(0, '#f2eee4'); g.addColorStop(1, C.papel2);
      p.fillStyle = g; p.fillRect(0, 0, w, h);
      // Página de periódico esquemática
      var mx = (w - rem * 80) / 2 + rem * 2.4, my = (h - rem * 45) / 2 + rem * 1.2, mw = rem * 75.2;
      p.fillStyle = C.tinta; p.strokeStyle = C.tinta;
      p.font = Math.round(rem * 1.2) + 'px "Old English Text MT", ' + F.display;
      p.textAlign = 'center'; p.textBaseline = 'alphabetic';
      p.fillText('Gaceta Cuántica', w / 2, my + rem * 1.2);
      p.fillRect(mx, my + rem * 1.6, mw, 3); p.fillRect(mx, my + rem * 1.9, mw, 1);
      p.font = Math.round(rem * 6.4) + 'px ' + F.display;
      p.fillText('FÍSICA CLÁSICA', w / 2, my + rem * 8.2);
      p.fillRect(mx, my + rem * 9.2, mw, 3); p.fillRect(mx, my + rem * 9.5, mw, 1);
      // Columnas de texto (líneas grises)
      var cols = 4, cw = (mw - rem * 3) / cols;
      for (var c = 0; c < cols; c++) {
        var cx = mx + c * (cw + rem);
        p.fillRect(cx, my + rem * 10.6, cw * 0.7, rem * 0.9);
        for (var l = 0; l < 22; l++) {
          var ly = my + rem * 12.4 + l * rem * 1.05;
          if (ly > my + rem * 40) break;
          p.globalAlpha = 0.55;
          p.fillRect(cx, ly, cw * (l % 6 === 5 ? 0.55 : 0.97), rem * 0.36);
          p.globalAlpha = 1;
        }
      }
      // Teselas
      teselas = [];
      var n = 44, lado = w / n, filas = Math.ceil(h / lado);
      var ox = w * 0.5, oy = h * 0.5, maxD = Math.hypot(w, h) / 2;
      for (var fy = 0; fy < filas; fy++) {
        for (var fx = 0; fx < n; fx++) {
          var x = fx * lado, y = fy * lado;
          var d = Math.hypot(x + lado / 2 - ox, y + lado / 2 - oy) / maxD;
          var ang = Math.atan2(y - oy, x - ox) + (Math.random() - 0.5) * 0.8;
          teselas.push({
            x: x, y: y, lado: lado,
            retraso: d * 0.9 + Math.random() * 0.35,
            vx: Math.cos(ang) * (40 + Math.random() * 120),
            vy: Math.sin(ang) * (40 + Math.random() * 120) - 30
          });
        }
      }
    }

    function cuadro(dt, t) {
      if (!t0) t0 = t;
      var e = t - t0;
      var ctx = L.ctx, w = L.ancho, h = L.alto, dpr = L.dpr;
      ctx.clearRect(0, 0, w, h);
      var VIDA = 0.95, vivas = 0;
      for (var i = 0; i < teselas.length; i++) {
        var s = teselas[i];
        var p = (e - s.retraso) / VIDA;
        if (p >= 1) continue;
        vivas++;
        if (p <= 0) {
          ctx.drawImage(papel, s.x * dpr, s.y * dpr, s.lado * dpr, s.lado * dpr, s.x, s.y, s.lado + 0.6, s.lado + 0.6);
          continue;
        }
        var k = Expo.suavizar(p);
        var dx = s.vx * k, dy = s.vy * k;
        if (p < 0.3) {
          // El papel se desprende y se tiñe de azul
          var a = 1 - p / 0.3;
          var tam = s.lado * (1 - 0.4 * (p / 0.3));
          ctx.globalAlpha = a;
          ctx.drawImage(papel, s.x * dpr, s.y * dpr, s.lado * dpr, s.lado * dpr, s.x + dx, s.y + dy, tam, tam);
          ctx.globalAlpha = (p / 0.3) * 0.9;
          ctx.fillStyle = C.azul;
          ctx.fillRect(s.x + dx, s.y + dy, tam, tam);
          ctx.globalAlpha = 1;
        } else {
          // Se convierte en un píxel luminoso que se desvanece
          var q = (p - 0.3) / 0.7;
          var tp = s.lado * 0.6 * (1 - q * 0.7);
          ctx.globalAlpha = 1 - q;
          ctx.fillStyle = q < 0.4 ? C.azul2 : C.azul;
          ctx.fillRect(s.x + dx + s.lado * 0.2, s.y + dy + s.lado * 0.2, tp, tp);
          ctx.globalAlpha = 1;
        }
      }
      if (vivas === 0) { terminar(); }
    }

    var bucle = Expo.bucle(cuadro);
    function terminar() {
      bucle.detener();
      activa = false;
      L.ctx.clearRect(0, 0, L.ancho, L.alto);
      canvas.style.visibility = 'hidden';
    }
    function lanzar() {
      if (Expo.reducido) { terminar(); return; }
      L.ajustar();
      activa = true;
      prepararPapel();
      canvas.style.visibility = 'visible';
      t0 = 0;
      // Primer cuadro inmediato: papel completo, sin parpadeo
      L.ctx.drawImage(papel, 0, 0, papel.width, papel.height, 0, 0, L.ancho, L.alto);
      bucle.detener();
      bucle.iniciar();
    }
    document.getElementById('transicion-repetir').addEventListener('click', lanzar);
    Expo.registrar('l-transicion', {
      iniciar: function () {
        // La transición solo tiene sentido viniendo del periódico (hacia delante)
        var previa = Expo.laminas[Expo.actual - 1];
        if (previa && previa.dataset.tema === 'papel' && Expo.direccion === 'adelante') lanzar();
        else terminar();
      },
      detener: terminar
    });
  }

  /* ------------------------------------------------------------------
     Cuantización: rampa (continuo) contra escalera (niveles)
     ------------------------------------------------------------------ */
  function cuantizacion() {
    var L = Expo.lienzo(document.getElementById('cv-cuantizacion'));
    var NIVELES = 5;
    var nivel = 0, desde = 0, hacia = 0, tSalto = 1, espera = 0.8;

    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      var mitad = w / 2, base = h - rem * 1.6, alto = h - rem * 4.4, margen = rem * 1.2;

      // Separador
      ctx.strokeStyle = 'rgba(82,145,255,0.3)'; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(mitad, rem); ctx.lineTo(mitad, h - rem * 0.6); ctx.stroke(); ctx.setLineDash([]);

      // --- RAMPA
      var x0 = margen, x1 = mitad - margen, topY = base - alto;
      textoHUD(ctx, 'RAMPA · CUALQUIER ALTURA', x0, rem * 0.9, rem * 0.7, C.azul2);
      ctx.fillStyle = 'rgba(59,139,255,0.15)'; ctx.strokeStyle = C.azul; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x1, topY); ctx.lineTo(x1, base); ctx.closePath(); ctx.fill(); ctx.stroke();
      var u = Expo.reducido ? 0.6 : 0.5 + 0.45 * Math.sin(t * 0.9);
      var bx = x0 + (x1 - x0) * u, by = base - alto * u;
      var r = rem * 0.6;
      // Bola apoyada sobre la rampa: se desplaza un radio a lo largo de la normal
      var largo = Math.hypot(x1 - x0, alto);
      var bolaX = bx - (alto / largo) * r, bolaY = by - ((x1 - x0) / largo) * r;
      brillo(ctx, bolaX, bolaY, r * 3, 'rgba(143,193,255,0.6)', 0.6);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bolaX, bolaY, r, 0, TAU); ctx.fill();
      textoHUD(ctx, 'altura ' + (u * 4).toFixed(2).replace('.', ','), x0, base + rem * 0.85, rem * 0.85, '#fff', 'left', 600);

      // --- ESCALERA
      var e0 = mitad + margen, e1 = w - margen, pasoW = (e1 - e0) / NIVELES, pasoH = alto / NIVELES;
      textoHUD(ctx, 'ESCALERA · SOLO ESCALONES', e0, rem * 0.9, rem * 0.7, C.azul2);
      ctx.fillStyle = 'rgba(59,139,255,0.15)';
      ctx.beginPath(); ctx.moveTo(e0, base);
      for (var i = 0; i < NIVELES; i++) {
        ctx.lineTo(e0 + i * pasoW, base - (i + 1) * pasoH);
        ctx.lineTo(e0 + (i + 1) * pasoW, base - (i + 1) * pasoH);
      }
      ctx.lineTo(e1, base); ctx.closePath(); ctx.fill(); ctx.stroke();
      // Etiquetas de nivel
      for (var j = 0; j < NIVELES; j++) {
        textoHUD(ctx, 'E' + (j + 1), e0 + j * pasoW + pasoW / 2, base - (j + 1) * pasoH + rem * 0.7, rem * 0.6, C.tenue, 'center');
      }
      // Saltos discretos
      if (!Expo.reducido) {
        if (tSalto >= 1) {
          espera -= dt;
          if (espera <= 0) {
            desde = nivel;
            do { hacia = Math.floor(Math.random() * NIVELES); } while (hacia === nivel);
            tSalto = 0; espera = 0.7 + Math.random() * 0.6;
          }
        } else {
          tSalto = Math.min(1, tSalto + dt / 0.35);
          if (tSalto >= 1) nivel = hacia;
        }
      }
      var k = tSalto >= 1 ? 1 : Expo.suavizarIO(tSalto);
      var nivelVisible = tSalto >= 1 ? nivel : desde + (hacia - desde) * k;
      var sx = e0 + nivelVisible * pasoW + pasoW / 2;
      var sy = base - (nivelVisible + 1) * pasoH - r - (tSalto < 1 ? Math.sin(k * Math.PI) * pasoH * 0.8 : 0);
      brillo(ctx, sx, sy, r * 3, 'rgba(143,193,255,0.6)', 0.6);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      // Marcar 0 y 1 (dos niveles usados como qubit)
      ctx.strokeStyle = C.azul2; ctx.lineWidth = 1.5;
      textoHUD(ctx, '«0»', e0 + pasoW / 2, base - pasoH - rem * 2.1, rem * 0.6, C.azul2, 'center');
      textoHUD(ctx, '«1»', e0 + pasoW * 1.5, base - pasoH * 2 - rem * 2.1, rem * 0.6, C.azul2, 'center');
      textoHUD(ctx, 'nivel E' + ((tSalto >= 1 ? nivel : hacia) + 1), e0, base + rem * 0.85, rem * 0.85, '#fff', 'left', 600);
    }
    var bucle = Expo.bucle(cuadro);
    Expo.registrar('l-cuantizacion', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  /* ------------------------------------------------------------------
     Doble rendija: electrones de uno en uno → franjas
     ------------------------------------------------------------------ */
  function dobleRendija() {
    var L = Expo.lienzo(document.getElementById('cv-rendija'));
    var bLanzar = document.getElementById('rendija-lanzar');
    var bRafaga = document.getElementById('rendija-rafaga');
    var bModo = document.getElementById('rendija-modo');
    var contador = document.getElementById('rendija-contador');
    var emitiendo = true, rafaga = false, dosRendijas = true;
    var impactos = [];      // {u, j}: posición vertical (-1..1) y desplazamiento horizontal
    var vuelos = [];        // electrones en camino
    var destellos = [];
    var BINS = 70, hist = new Float32Array(BINS);
    var acumulado = 0, MAX = 5000;

    function intensidad(u) {
      // u en [-1, 1] sobre la pantalla
      var env = function (x) { var a = Math.PI * x * 1.6; return a === 0 ? 1 : Math.pow(Math.sin(a) / a, 2); };
      if (dosRendijas) return Math.pow(Math.cos(Math.PI * u * 4.2), 2) * env(u);
      return env(u - 0.12);
    }
    function muestrear() {
      for (var n = 0; n < 200; n++) {
        var u = Math.random() * 2 - 1;
        if (Math.random() < intensidad(u)) return u;
      }
      return 0;
    }
    function registrar(u) {
      if (impactos.length < MAX) impactos.push({ u: u, j: Math.random() });
      var b = Math.floor((u + 1) / 2 * BINS);
      hist[Expo.limitar(b, 0, BINS - 1)]++;
      acumulado++;
      contador.textContent = acumulado + (acumulado === 1 ? ' electrón' : ' electrones');
    }
    function reiniciar() {
      impactos = []; vuelos = []; destellos = []; hist = new Float32Array(BINS); acumulado = 0;
      contador.textContent = '0 electrones';
    }

    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      var fx = w * 0.06, bx = w * 0.36, sx = w * 0.72, hx = w * 0.76, cy = h / 2;
      var gap = h * 0.12, ancho = h * 0.035;
      var y1 = cy - gap, y2 = cy + gap;
      var pantallaH = h * 0.86, py0 = cy - pantallaH / 2;

      // Ondas de fondo desde la fuente (la «onda de probabilidad»)
      ctx.lineWidth = 1.5;
      for (var k = 0; k < 6; k++) {
        var r = ((t * 60 + k * 40) % 240);
        ctx.strokeStyle = 'rgba(82,145,255,' + (0.28 * (1 - r / 240)) + ')';
        ctx.beginPath(); ctx.arc(fx, cy, r * (bx - fx) / 240, -0.7, 0.7); ctx.stroke();
      }
      // Ondas desde las rendijas
      var fuentes = dosRendijas ? [y1, y2] : [y2];
      for (var f = 0; f < fuentes.length; f++) {
        for (var q = 0; q < 7; q++) {
          var rr = ((t * 60 + q * 34) % 240);
          ctx.strokeStyle = 'rgba(143,193,255,' + (0.22 * (1 - rr / 240)) + ')';
          ctx.beginPath(); ctx.arc(bx, fuentes[f], rr * (sx - bx) / 240, -1.1, 1.1); ctx.stroke();
        }
      }

      // Fuente
      brillo(ctx, fx, cy, rem * 1.6, 'rgba(143,193,255,0.9)', 0.9);
      ctx.fillStyle = '#fff'; ctx.fillRect(fx - rem * 0.5, cy - rem * 0.7, rem * 0.5, rem * 1.4);
      textoHUD(ctx, 'FUENTE', fx - rem * 0.25, cy + rem * 1.5, rem * 0.55, C.tenue, 'center');

      // Barrera con rendijas
      ctx.fillStyle = '#c9d6ee';
      var bw = rem * 0.45, techo = rem * 1.4, piso = h - rem * 0.3;
      ctx.fillRect(bx - bw / 2, techo, bw, y1 - ancho - techo);
      if (dosRendijas) ctx.fillRect(bx - bw / 2, y1 + ancho, bw, (y2 - ancho) - (y1 + ancho));
      else ctx.fillRect(bx - bw / 2, y1 - ancho, bw, (y2 - ancho) - (y1 - ancho));
      ctx.fillRect(bx - bw / 2, y2 + ancho, bw, piso - (y2 + ancho));
      textoHUD(ctx, dosRendijas ? 'DOS RENDIJAS' : 'UNA RENDIJA', bx, rem * 0.7, rem * 0.6, C.tenue, 'center', 600);

      // Pantalla
      ctx.fillStyle = 'rgba(10,24,54,0.9)';
      ctx.fillRect(sx, py0, hx - sx, pantallaH);
      ctx.strokeStyle = C.azul; ctx.lineWidth = 1.5; ctx.strokeRect(sx, py0, hx - sx, pantallaH);
      textoHUD(ctx, 'PANTALLA', (sx + hx) / 2, py0 + pantallaH + rem * 0.5, rem * 0.55, C.tenue, 'center');

      // Emisión (con movimiento reducido no hay vuelos: ver acumularReducido)
      if (emitiendo && !Expo.reducido) {
        var tasa = rafaga ? 160 : 5;
        var nuevos = tasa * dt + (Math.random() < (tasa * dt) % 1 ? 1 : 0);
        nuevos = Math.floor(nuevos);
        for (var n = 0; n < nuevos; n++) {
          if (rafaga) { registrar(muestrear()); }
          else vuelos.push({ t: 0, u: muestrear(), y0: cy + (Math.random() - 0.5) * rem * 0.4 });
        }
      }
      // Electrones en vuelo: partícula hasta la barrera, luego «se esparce» y aparece en la pantalla
      vuelos = vuelos.filter(function (v) {
        v.t += dt;
        var T1 = 0.55;
        if (v.t < T1) {
          var p = v.t / T1;
          var x = fx + (bx - fx) * p;
          brillo(ctx, x, v.y0, rem * 0.7, 'rgba(255,255,255,0.9)', 0.9);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, v.y0, rem * 0.16, 0, TAU); ctx.fill();
          return true;
        }
        // Al llegar a la barrera: impacto en la pantalla según la probabilidad
        registrar(v.u);
        destellos.push({ y: cy + v.u * pantallaH / 2, t: 0 });
        return false;
      });

      // Impactos acumulados
      ctx.fillStyle = 'rgba(200,225,255,0.85)';
      var tamPunto = Math.max(1.5, rem * 0.09);
      for (var i = 0; i < impactos.length; i++) {
        var im = impactos[i];
        ctx.fillRect(sx + 2 + im.j * (hx - sx - 4 - tamPunto), cy + im.u * pantallaH / 2, tamPunto, tamPunto);
      }
      // Destellos de llegada
      destellos = destellos.filter(function (d) {
        d.t += dt;
        if (d.t > 0.5) return false;
        brillo(ctx, (sx + hx) / 2, d.y, rem * 1.4 * (1 - d.t), 'rgba(255,255,255,1)', 1 - d.t * 2);
        return true;
      });

      // Histograma (franjas)
      var maxH = 0;
      for (var b = 0; b < BINS; b++) if (hist[b] > maxH) maxH = hist[b];
      var hx0 = hx + rem * 0.6, hw = w - hx0 - rem * 0.4, bh = pantallaH / BINS;
      ctx.strokeStyle = 'rgba(82,145,255,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hx0, py0); ctx.lineTo(hx0, py0 + pantallaH); ctx.stroke();
      if (maxH > 0) {
        for (var c = 0; c < BINS; c++) {
          var largo = hist[c] / maxH * hw;
          ctx.fillStyle = 'rgba(59,139,255,' + (0.35 + 0.65 * hist[c] / maxH) + ')';
          ctx.fillRect(hx0, py0 + c * bh, largo, bh - 1);
        }
      }
      textoHUD(ctx, 'CONTEO', hx0 + hw / 2, py0 + pantallaH + rem * 0.5, rem * 0.55, C.tenue, 'center');
    }

    // Con movimiento reducido no hay electrones en vuelo: los impactos se suman de
    // golpe (al entrar y con cada botón) y el lienzo queda en un fotograma estático.
    function acumularReducido(n) {
      if (!Expo.reducido || !emitiendo) return;
      for (var i = 0; i < n; i++) registrar(muestrear());
    }
    var bucle = Expo.bucle(cuadro);
    bLanzar.addEventListener('click', function () {
      emitiendo = !emitiendo;
      bLanzar.textContent = emitiendo ? 'Pausa' : 'Lanzar';
      bLanzar.setAttribute('aria-pressed', emitiendo ? 'true' : 'false');
      acumularReducido(rafaga ? 400 : 40);
    });
    bRafaga.addEventListener('click', function () {
      rafaga = !rafaga;
      bRafaga.setAttribute('aria-pressed', rafaga ? 'true' : 'false');
      bRafaga.textContent = rafaga ? 'De uno en uno' : 'Ráfaga ×20';
      if (rafaga && !emitiendo) bLanzar.click();
      else if (rafaga) acumularReducido(400);
    });
    bModo.addEventListener('click', function () {
      dosRendijas = !dosRendijas;
      bModo.setAttribute('aria-pressed', dosRendijas ? 'false' : 'true');
      bModo.textContent = dosRendijas ? 'Tapar una rendija' : 'Abrir las dos rendijas';
      reiniciar();
      acumularReducido(300);
    });
    document.getElementById('rendija-reiniciar').addEventListener('click', reiniciar);
    Expo.registrar('l-rendija', {
      iniciar: function () { if (acumulado === 0) acumularReducido(300); bucle.iniciar(); },
      detener: bucle.detener
    });
  }

  /* ------------------------------------------------------------------
     Moneda girando: superposición y colapso al medir
     ------------------------------------------------------------------ */
  function moneda() {
    var L = Expo.lienzo(document.getElementById('cv-moneda'));
    var deslizador = document.getElementById('moneda-p');
    var txtP = document.getElementById('moneda-p-txt');
    var p = 0.5;                 // probabilidad de cara
    var estado = 'girando';      // girando | cayendo | medida
    var angulo = 0, vel = 9, resultado = null, tCaida = 0, anguloInicio = 0, anguloFinal = 0;
    var cuenta = { cara: 0, sello: 0 };
    var ultimos = [];

    function medir() {
      if (estado !== 'girando') return;
      resultado = Math.random() < p ? 'cara' : 'sello';
      cuenta[resultado]++;
      ultimos.unshift(resultado); if (ultimos.length > 16) ultimos.pop();
      estado = 'cayendo'; tCaida = 0;
      anguloInicio = angulo;
      var base = Math.ceil(angulo / TAU) * TAU + TAU;
      anguloFinal = base + (resultado === 'cara' ? 0 : Math.PI);
      if (Expo.reducido) { angulo = anguloFinal; estado = 'medida'; }
    }
    function lanzar() { estado = 'girando'; resultado = null; vel = 9; }
    function medirCien() {
      for (var i = 0; i < 100; i++) {
        var r = Math.random() < p ? 'cara' : 'sello';
        cuenta[r]++;
        ultimos.unshift(r);
      }
      ultimos.length = 16;
      resultado = ultimos[0];
      estado = 'medida';
      angulo = resultado === 'cara' ? 0 : Math.PI;
    }

    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      var cx = w * 0.3, cy = h * 0.5, R = Math.min(w * 0.2, h * 0.34);

      if (estado === 'girando') {
        if (!Expo.reducido) angulo += vel * dt;   // con movimiento reducido: moneda quieta
      } else if (estado === 'cayendo') {
        tCaida = Math.min(1, tCaida + dt / 0.7);
        angulo = anguloInicio + (anguloFinal - anguloInicio) * Expo.suavizar(tCaida);
        if (tCaida >= 1) estado = 'medida';
      }
      var flota = estado === 'girando' ? Math.sin(t * 2.2) * R * 0.08 : 0;
      var escalaX = Math.cos(angulo);
      var cara = escalaX >= 0;

      // Sombra
      ctx.fillStyle = 'rgba(59,139,255,0.18)';
      ctx.beginPath(); ctx.ellipse(cx, cy + R * 1.2, R * 0.8, R * 0.12, 0, 0, TAU); ctx.fill();
      // Halo de superposición
      if (estado === 'girando') brillo(ctx, cx, cy + flota, R * 1.7, 'rgba(59,139,255,0.45)', 0.5 + 0.2 * Math.sin(t * 5));

      // Moneda (elipse que cambia de ancho al girar)
      ctx.save();
      ctx.translate(cx, cy + flota);
      ctx.scale(Math.max(0.04, Math.abs(escalaX)), 1);
      var g = ctx.createLinearGradient(-R, -R, R, R);
      if (cara) { g.addColorStop(0, '#d8e7ff'); g.addColorStop(1, '#5d8fe0'); }
      else { g.addColorStop(0, '#cbb8ff'); g.addColorStop(1, '#5b45b8'); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 / Math.max(0.2, Math.abs(escalaX));
      ctx.beginPath(); ctx.arc(0, 0, R * 0.84, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#071226';
      ctx.font = '700 ' + Math.round(R * 0.9) + 'px ' + F.hud;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cara ? 'C' : 'S', 0, R * 0.05);
      ctx.restore();

      // Rótulo de estado
      var etiqueta, color;
      if (estado === 'girando') { etiqueta = 'SUPERPOSICIÓN · GIRANDO'; color = C.azul2; }
      else if (estado === 'cayendo') { etiqueta = 'MIDIENDO…'; color = '#fff'; }
      else { etiqueta = 'COLAPSÓ → ' + resultado.toUpperCase(); color = '#fff'; }
      textoHUD(ctx, etiqueta, cx, rem * 0.9, rem * 0.85, color, 'center', 600);

      // Panel derecho: probabilidades y frecuencias
      var px = w * 0.58, pw = w - px - rem * 0.6;
      textoHUD(ctx, 'PROBABILIDAD ANTES DE MEDIR', px, rem * 0.9, rem * 0.6, C.tenue);
      barra(ctx, px, rem * 1.7, pw, rem * 0.9, p, 'Cara', C.azul);
      barra(ctx, px, rem * 3.1, pw, rem * 0.9, 1 - p, 'Sello', C.violeta);
      var total = cuenta.cara + cuenta.sello;
      textoHUD(ctx, 'RESULTADOS MEDIDOS · ' + total, px, rem * 5.0, rem * 0.6, C.tenue);
      barra(ctx, px, rem * 5.8, pw, rem * 0.9, total ? cuenta.cara / total : 0, 'Cara ' + cuenta.cara, C.azul);
      barra(ctx, px, rem * 7.2, pw, rem * 0.9, total ? cuenta.sello / total : 0, 'Sello ' + cuenta.sello, C.violeta);
      // Últimos resultados
      textoHUD(ctx, 'ÚLTIMOS', px, rem * 9.1, rem * 0.6, C.tenue);
      for (var i = 0; i < ultimos.length; i++) {
        var col = i % 8, fila = Math.floor(i / 8);
        var x = px + col * rem * 1.4, y = rem * 10 + fila * rem * 1.4;
        if (y > h - rem * 0.6) break;
        ctx.fillStyle = ultimos[i] === 'cara' ? C.azul : C.violeta;
        ctx.globalAlpha = 1 - i / 18;
        ctx.fillRect(x, y - rem * 0.5, rem * 1.1, rem * 1.1);
        ctx.globalAlpha = 1;
        textoHUD(ctx, ultimos[i] === 'cara' ? 'C' : 'S', x + rem * 0.55, y + rem * 0.05, rem * 0.6, '#fff', 'center', 700);
      }
    }
    function barra(ctx, x, y, w, h, v, txt, color) {
      ctx.fillStyle = 'rgba(82,145,255,0.12)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = color; ctx.fillRect(x, y, w * v, h);
      ctx.strokeStyle = 'rgba(82,145,255,0.4)'; ctx.strokeRect(x, y, w, h);
      var rem = Expo.rem();
      textoHUD(ctx, txt, x + rem * 0.35, y + h / 2, rem * 0.6, '#fff', 'left', 600);
      textoHUD(ctx, Math.round(v * 100) + ' %', x + w - rem * 0.35, y + h / 2, rem * 0.6, '#fff', 'right', 600);
    }

    deslizador.addEventListener('input', function () {
      p = deslizador.value / 100;
      txtP.textContent = deslizador.value + ' %';
    });
    document.getElementById('moneda-medir').addEventListener('click', medir);
    document.getElementById('moneda-lanzar').addEventListener('click', lanzar);
    document.getElementById('moneda-cien').addEventListener('click', medirCien);
    var bucle = Expo.bucle(cuadro);
    Expo.registrar('l-moneda', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  /* ------------------------------------------------------------------
     Interferencia: dos ondas y su suma, con desfase ajustable
     ------------------------------------------------------------------ */
  function interferencia() {
    var L = Expo.lienzo(document.getElementById('cv-interferencia'));
    var rango = document.getElementById('fase');
    var txt = document.getElementById('fase-txt');
    var fase = 0, faseVisible = 0;

    function onda(ctx, x0, x1, yc, amp, fn, color, grosor) {
      ctx.strokeStyle = color; ctx.lineWidth = grosor;
      ctx.beginPath();
      for (var x = x0; x <= x1; x += 2) {
        var y = yc - amp * fn((x - x0) / (x1 - x0));
        if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      faseVisible += (fase - faseVisible) * Math.min(1, dt * 10);
      var fi = faseVisible * Math.PI / 180;
      var mov = Expo.reducido ? 0 : t * 3;
      var k = TAU * 2.5;
      var x0 = rem * 5.4, x1 = w - rem * 0.8;
      var fila = (h - rem * 1.6) / 3.3, amp = fila * 0.24;
      var yA = fila * 0.5, yB = fila * 1.35, yS = fila * 2.4;

      // Ejes
      ctx.strokeStyle = 'rgba(82,145,255,0.22)'; ctx.lineWidth = 1;
      [yA, yB, yS].forEach(function (y) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); });
      textoHUD(ctx, 'ONDA A', rem * 0.4, yA, rem * 0.7, C.azul2, 'left', 600);
      textoHUD(ctx, 'ONDA B', rem * 0.4, yB, rem * 0.7, C.violeta, 'left', 600);
      textoHUD(ctx, 'A + B', rem * 0.4, yS, rem * 0.9, '#fff', 'left', 700);

      onda(ctx, x0, x1, yA, amp, function (u) { return Math.sin(k * u - mov); }, C.azul2, 2.5);
      onda(ctx, x0, x1, yB, amp, function (u) { return Math.sin(k * u - mov + fi); }, C.violeta, 2.5);
      // Suma
      ctx.save();
      ctx.shadowColor = C.azul; ctx.shadowBlur = 12;
      onda(ctx, x0, x1, yS, amp, function (u) { return Math.sin(k * u - mov) + Math.sin(k * u - mov + fi); }, '#fff', 3.5);
      ctx.restore();
      // Línea divisoria
      ctx.strokeStyle = 'rgba(82,145,255,0.4)'; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(x0, fila * 1.78); ctx.lineTo(x1, fila * 1.78); ctx.stroke(); ctx.setLineDash([]);

      // Amplitud resultante = |2 cos(φ/2)|
      var A = Math.abs(2 * Math.cos(fi / 2));
      var tipo = A > 1.6 ? 'CONSTRUCTIVA · SE REFUERZAN' : (A < 0.4 ? 'DESTRUCTIVA · SE CANCELAN' : 'PARCIAL');
      textoHUD(ctx, 'AMPLITUD ' + A.toFixed(2).replace('.', ',') + ' · ' + tipo, x1, h - rem * 0.6, rem * 0.75, A < 0.4 ? C.alerta : '#fff', 'right', 600);
    }
    function poner(v) {
      fase = +v;
      rango.value = v;
      txt.textContent = Math.round(fase) + '°';
    }
    rango.addEventListener('input', function () { poner(rango.value); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-fase]'), function (b) {
      b.addEventListener('click', function () { poner(b.dataset.fase); });
    });
    var bucle = Expo.bucle(cuadro);
    Expo.registrar('l-interferencia', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  /* ------------------------------------------------------------------
     Entrelazamiento: resultados opuestos, cada uno aleatorio
     ------------------------------------------------------------------ */
  function entrelazamiento() {
    var L = Expo.lienzo(document.getElementById('cv-entrelazamiento'));
    var estado = 'unido';   // unido | medido
    var a = null;           // 1 = ↑, 0 = ↓
    var tMedida = 0;
    var historial = [];     // [{a, b}]

    function medirPar() {
      a = Math.random() < 0.5 ? 1 : 0;
      historial.unshift({ a: a, b: 1 - a });
      if (historial.length > 40) historial.pop();
      estado = 'medido'; tMedida = 0;
    }
    function flecha(ctx, x, y, arriba, tam, color) {
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = tam * 0.12;
      var d = arriba ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(x, y - d * tam * 0.55); ctx.lineTo(x, y + d * tam * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + d * tam * 0.62); ctx.lineTo(x - tam * 0.25, y + d * tam * 0.25); ctx.lineTo(x + tam * 0.25, y + d * tam * 0.25); ctx.closePath(); ctx.fill();
    }
    function particula(ctx, x, y, R, t, valor, etiqueta, rem) {
      brillo(ctx, x, y, R * 2.2, 'rgba(59,139,255,0.6)', valor == null ? 0.5 + 0.2 * Math.sin(t * 4) : 0.4);
      ctx.fillStyle = 'rgba(8,20,48,0.95)'; ctx.strokeStyle = C.azul; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.stroke();
      if (valor == null) {
        // Superposición: ↑ y ↓ superpuestas, girando
        ctx.save(); ctx.translate(x, y); ctx.rotate(Expo.reducido ? 0 : t * 1.4);
        ctx.globalAlpha = 0.55; flecha(ctx, 0, 0, true, R * 1.2, C.azul2);
        ctx.globalAlpha = 0.55; flecha(ctx, 0, 0, false, R * 1.2, C.violeta);
        ctx.restore(); ctx.globalAlpha = 1;
        textoHUD(ctx, '?', x, y + R + rem * 0.9, rem * 0.8, C.azul2, 'center', 700);
      } else {
        flecha(ctx, x, y, valor === 1, R * 1.3, valor === 1 ? '#fff' : C.violeta);
        textoHUD(ctx, valor === 1 ? '↑ ARRIBA' : '↓ ABAJO', x, y + R + rem * 0.9, rem * 0.8, '#fff', 'center', 700);
      }
      textoHUD(ctx, etiqueta, x, y - R - rem * 0.8, rem * 0.7, C.tenue, 'center', 600);
    }

    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      var cy = h * 0.32, R = Math.min(h * 0.11, w * 0.06);
      var xa = w * 0.16, xb = w * 0.84;
      tMedida += dt;

      // Vínculo ondulado
      var fuerza = estado === 'unido' ? 1 : Math.max(0, 1 - tMedida / 0.6);
      if (fuerza > 0) {
        ctx.save();
        ctx.shadowColor = C.azul; ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(143,193,255,' + (0.8 * fuerza) + ')'; ctx.lineWidth = 2;
        for (var hebra = 0; hebra < 2; hebra++) {
          ctx.beginPath();
          for (var x = xa + R; x <= xb - R; x += 4) {
            var u = (x - xa) / (xb - xa);
            var y = cy + Math.sin(u * TAU * 3 - t * 4 + hebra * Math.PI) * R * 0.35 * Math.sin(u * Math.PI);
            if (x === xa + R) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
        textoHUD(ctx, 'ENTRELAZADAS · CUALQUIER DISTANCIA', w / 2, cy - R * 1.2, rem * 0.6, C.azul2, 'center');
      }
      // Onda de la medición
      if (estado === 'medido' && tMedida < 0.6) {
        var rr = tMedida / 0.6;
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - rr) + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(xa, cy, R * (1 + rr * 2), 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(xb, cy, R * (1 + rr * 2), 0, TAU); ctx.stroke();
      }
      particula(ctx, xa, cy, R, t, estado === 'medido' ? a : null, 'PARTÍCULA A', rem);
      particula(ctx, xb, cy, R, t, estado === 'medido' ? 1 - a : null, 'PARTÍCULA B', rem);

      // Registro: dos columnas
      var y0 = h * 0.62, celda = Math.min(rem * 1.25, (w - rem * 6) / 20);
      textoHUD(ctx, 'A', rem * 0.6, y0, rem * 0.7, C.tenue, 'left', 700);
      textoHUD(ctx, 'B', rem * 0.6, y0 + celda * 1.3, rem * 0.7, C.tenue, 'left', 700);
      var n = Math.min(historial.length, 20);
      for (var i = 0; i < n; i++) {
        var hx = rem * 2 + i * celda;
        [historial[i].a, historial[i].b].forEach(function (v, fila) {
          var yy = y0 + fila * celda * 1.3;
          ctx.fillStyle = v ? 'rgba(59,139,255,0.85)' : 'rgba(155,123,255,0.85)';
          ctx.globalAlpha = 1 - i / 26;
          ctx.fillRect(hx, yy - celda * 0.45, celda * 0.86, celda * 0.9);
          ctx.globalAlpha = 1;
          textoHUD(ctx, v ? '↑' : '↓', hx + celda * 0.43, yy, celda * 0.65, '#fff', 'center', 700);
        });
      }
      // Estadística
      if (historial.length) {
        var total = historial.length, aArriba = 0, bArriba = 0, opuestos = 0;
        historial.forEach(function (r) { aArriba += r.a; bArriba += r.b; opuestos += (r.a !== r.b) ? 1 : 0; });
        var ys = y0 + celda * 3.1;
        textoHUD(ctx, 'A sale ↑ el ' + Math.round(aArriba / total * 100) + ' %  ·  B sale ↑ el ' + Math.round(bArriba / total * 100) + ' %  (cada uno, al azar)', rem * 0.6, ys, rem * 0.68, '#c9d6ee');
        textoHUD(ctx, 'Comparando ambos: opuestos el ' + Math.round(opuestos / total * 100) + ' % de las veces', rem * 0.6, ys + rem * 1.1, rem * 0.75, '#fff', 'left', 700);
      } else {
        textoHUD(ctx, 'Pulsa «Medir el par» para medir las dos partículas', rem * 0.6, y0 + celda * 3.1, rem * 0.7, C.tenue);
      }
    }
    var bucle = Expo.bucle(cuadro);
    document.getElementById('entre-medir').addEventListener('click', function () {
      if (estado === 'medido') { estado = 'unido'; setTimeout(medirPar, Expo.reducido ? 0 : 280); }
      else medirPar();
    });
    document.getElementById('entre-veinte').addEventListener('click', function () {
      for (var i = 0; i < 20; i++) medirPar();
    });
    document.getElementById('entre-reiniciar').addEventListener('click', function () {
      historial = []; estado = 'unido'; a = null;
    });
    Expo.registrar('l-entrelazamiento', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  /* ------------------------------------------------------------------
     Decoherencia: el ruido del entorno destruye la onda
     ------------------------------------------------------------------ */
  function decoherencia() {
    var L = Expo.lienzo(document.getElementById('cv-decoherencia'));
    var rango = document.getElementById('ruido');
    var txt = document.getElementById('ruido-txt');
    var ruido = 0, coherencia = 1;
    var particulas = [], choques = [];
    var fases = [];
    for (var i = 0; i < 9; i++) fases.push({ f: 1 + Math.random() * 9, p: Math.random() * TAU, a: Math.random() });

    function cuadro(dt, t) {
      var ctx = L.ctx, w = L.ancho, h = L.alto, rem = Expo.rem();
      ctx.clearRect(0, 0, w, h);
      var cy = h * 0.48, amp = h * 0.2, x0 = rem * 0.8, x1 = w - rem * 0.8;

      // Partículas del entorno (calor, vibraciones…)
      var objetivo = Math.round(ruido * 70);
      while (particulas.length < objetivo) particulas.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5) });
      if (particulas.length > objetivo) particulas.length = objetivo;
      var rapidez = 80 + ruido * 260;
      ctx.fillStyle = 'rgba(255,176,59,0.75)';
      var quietas = Expo.reducido;   // con movimiento reducido: partículas fijas, sin choques
      particulas.forEach(function (p) {
        if (quietas) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAU); ctx.fill(); return; }
        p.x += p.vx * rapidez * dt; p.y += p.vy * rapidez * dt;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAU); ctx.fill();
        // Choque con la onda: «la mide sin querer»
        if (Math.abs(p.y - cy) < amp * 0.6 && Math.random() < dt * 1.2) {
          choques.push({ x: p.x, y: p.y, t: 0 });
          coherencia = Math.max(0, coherencia - 0.012);
        }
      });
      if (!quietas) coherencia = Math.max(0, coherencia - ruido * ruido * dt * 0.12);

      // Destellos de choque
      choques = choques.filter(function (c) {
        c.t += dt;
        if (c.t > 0.4) return false;
        ctx.strokeStyle = 'rgba(255,176,59,' + (1 - c.t / 0.4) + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(c.x, c.y, 4 + c.t * 40, 0, TAU); ctx.stroke();
        return true;
      });

      // Onda del qubit: mezcla de onda limpia y ruido
      var mov = Expo.reducido ? 0 : t * 2.4;
      ctx.save();
      ctx.shadowColor = C.azul; ctx.shadowBlur = 14 * coherencia;
      ctx.strokeStyle = coherencia > 0.25 ? '#fff' : '#9aa6bd'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (var x = x0; x <= x1; x += 3) {
        var u = (x - x0) / (x1 - x0);
        var env = Math.sin(u * Math.PI);
        var limpia = Math.sin(u * TAU * 4 - mov) * env;
        var sucia = 0;
        for (var k = 0; k < fases.length; k++) sucia += Math.sin(u * TAU * fases[k].f * 3 + fases[k].p + t * fases[k].f) * fases[k].a;
        sucia = sucia / 3 * env;
        var y = cy - amp * (coherencia * limpia + (1 - coherencia) * sucia * 0.8);
        if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Medidor de coherencia
      var mx = rem * 0.8, my = h - rem * 2.1, mw = w - rem * 1.6, mh = rem * 0.7;
      ctx.fillStyle = 'rgba(82,145,255,0.12)'; ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = coherencia > 0.25 ? C.azul : C.alerta; ctx.fillRect(mx, my, mw * coherencia, mh);
      ctx.strokeStyle = 'rgba(82,145,255,0.45)'; ctx.strokeRect(mx, my, mw, mh);
      textoHUD(ctx, 'COHERENCIA ' + Math.round(coherencia * 100) + ' %', mx, my - rem * 0.55, rem * 0.7, '#fff', 'left', 600);
      var estado = coherencia > 0.8 ? 'SUPERPOSICIÓN INTACTA' : (coherencia > 0.25 ? 'SE ESTÁ DEGRADANDO' : 'SUPERPOSICIÓN PERDIDA: YA NO SIRVE COMO QUBIT');
      textoHUD(ctx, estado, mx + mw, my - rem * 0.55, rem * 0.7, coherencia > 0.25 ? C.azul2 : C.alerta, 'right', 600);
      textoHUD(ctx, ruido === 0 ? 'AISLADO · CERCA DEL CERO ABSOLUTO' : 'ENTORNO: CALOR · VIBRACIONES · CAMPOS', rem * 0.8, rem * 0.8, rem * 0.6, C.tenue);
    }
    rango.addEventListener('input', function () {
      ruido = rango.value / 100;
      txt.textContent = rango.value + ' %';
      // Sin animación, el desgaste se muestra directamente: más ruido, menos coherencia
      if (Expo.reducido) coherencia = Math.max(0, 1 - ruido);
    });
    document.getElementById('deco-reiniciar').addEventListener('click', function () { coherencia = 1; });
    var bucle = Expo.bucle(cuadro);
    Expo.registrar('l-decoherencia', { iniciar: bucle.iniciar, detener: bucle.detener });
  }

  transicion();
  cuantizacion();
  dobleRendija();
  moneda();
  interferencia();
  entrelazamiento();
  decoherencia();
})();

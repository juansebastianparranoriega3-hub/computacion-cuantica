/* =====================================================================
   07-sonido.js — Sonidos sutiles, todos sintetizados con Web Audio API
   (osciladores, ruido filtrado y envolventes). Sin archivos de audio:
   funciona sin internet y con doble clic (file://).

   Principio: el sonido acompaña, no protagoniza. Todo es corto, suave
   y con caída rápida; nada de pitidos agudos.

   - Un solo AudioContext, creado (o reanudado) en el primer gesto
     (pointerdown o keydown). Antes de eso, cada llamada es un no-op.
   - Bus maestro: ganancia global baja → compresor suave → salida.
     Una reverberación corta (convolución con un impulso generado) solo
     para las aniquilaciones del fondo.
   - Silencio: tecla M (01-nucleo.js) y botón #btn-sonido; se guarda en
     localStorage ('expo-sonido' = 'off' | 'on').
   - Pestaña oculta: el contexto se suspende.
   - Con prefers-reduced-motion se bajan los efectos ambientales.
   - Cada sonido es una «voz» que libera (disconnect) todos sus nodos al
     terminar su última fuente; Sonido.estado() cuenta las voces vivas.

   Los demás scripts llaman con Expo.sonar('nombre', …) (definido en
   01-nucleo.js), así no falla si este archivo no está cargado.
   API pública: window.Sonido
   ===================================================================== */
(function () {
  'use strict';

  var Expo = window.Expo || {};
  var CLAVE = 'expo-sonido';
  var VOLUMEN = 0.5;                         // ganancia del bus maestro
  // Aniquilaciones del fondo (modo 3D)
  var NIVEL_ANIQUILACION = 0.62;             // ganancia de la voz (pico ≈ −27/−31 dBFS según nota y paneo)
  var AMBIENTE_REDUCIDO = 0.4;               // con movimiento reducido, −8 dB más bajo
  var PROB_ANIQUILACION = 0.45;              // sorteo; con el mínimo de 700 ms suena ≈ 1 de cada 3
  var ANIQ_MIN_MS = 700;                     // mínimo entre dos aniquilaciones audibles
  var ANIQ_TRAS_DEMO_MS = 1500;              // silencio tras cualquier sonido de demostración
  var ANIQ_BASE = 659.26;                    // Mi5: nota central de la campana
  var ANIQ_NOTAS = [-2, 0, 3];               // pentatónica de Do alrededor de Mi: Re, Mi, Sol

  var ac = null;          // AudioContext (o OfflineAudioContext al exportar muestras)
  var maestro = null;     // GainNode del bus maestro
  var reverb = null;      // entrada de la reverberación corta
  var ruidoBuf = null;    // ruido blanco compartido (2 s, en bucle)
  var silencio = leerPreferencia() === 'off';
  var exportando = false;
  var activos = 0, creados = 0;
  var ultimo = {};        // limitadores de frecuencia por nombre
  var ultimoEspecifico = 0;
  var ultimaDemo = -1e9;  // último sonido de demostración (propio o botón genérico)
  var ultimaNota = -1;    // última nota de aniquilación (para no repetirla)
  var vozPiso = null, vozGiro = null, vozRuido = null, timerRuido = 0;

  function leerPreferencia() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function guardarPreferencia(v) {
    try { localStorage.setItem(CLAVE, v); } catch (e) { /* almacenamiento bloqueado */ }
  }

  /* ------------------------------------------------------------------
     Contexto, bus maestro y desbloqueo por gesto
     ------------------------------------------------------------------ */
  function crearRuido(ctx) {
    var n = Math.floor(ctx.sampleRate * 2);
    var b = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  /** Impulso de reverberación estéreo: ruido con caída exponencial y cada vez más opaco. */
  function crearImpulso(ctx, seg) {
    var n = Math.floor(ctx.sampleRate * seg);
    var b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c), previo = 0;
      for (var i = 0; i < n; i++) {
        var t = i / n;
        var suave = 0.25 + 0.7 * t;                  // filtro de un polo: la cola se oscurece
        previo += ((Math.random() * 2 - 1) - previo) * (1 - suave);
        d[i] = previo * Math.pow(1 - t, 3);
      }
    }
    return b;
  }

  /** Arma el bus en un contexto: maestro → compresor → salida, y la reverberación. */
  function armarBus(ctx) {
    var m = ctx.createGain();
    m.gain.value = silencio && !exportando ? 0 : VOLUMEN;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    m.connect(comp); comp.connect(ctx.destination);
    var conv = ctx.createConvolver();
    conv.buffer = crearImpulso(ctx, 0.45);
    var retorno = ctx.createGain();
    retorno.gain.value = 0.9;
    conv.connect(retorno); retorno.connect(m);
    return { maestro: m, reverb: conv, ruido: crearRuido(ctx) };
  }

  function asegurarContexto() {
    if (ac) return true;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    try { ac = new Ctx({ latencyHint: 'interactive' }); }
    catch (e) { return false; }
    var bus = armarBus(ac);
    maestro = bus.maestro; reverb = bus.reverb; ruidoBuf = bus.ruido;
    return true;
  }

  /** Primer gesto del usuario: crea o reanuda el contexto (política de autoplay). */
  function alGesto() {
    if (silencio || document.hidden) return;
    if (!asegurarContexto()) return;
    if (ac.state === 'suspended') ac.resume().catch(function () {});
  }
  document.addEventListener('pointerdown', alGesto, { capture: true, passive: true });
  document.addEventListener('keydown', alGesto, { capture: true });

  document.addEventListener('visibilitychange', function () {
    if (!ac || exportando) return;
    if (document.hidden) ac.suspend().catch(function () {});
    else if (!silencio) ac.resume().catch(function () {});
  });

  /** ¿Se puede sonar ahora? (contexto en marcha y sin silencio) */
  function listo() {
    if (exportando) return true;
    return !!ac && !silencio && ac.state === 'running' && !document.hidden;
  }

  /** Limitador: como máximo un sonido `nombre` cada `ms`. */
  function permitir(nombre, ms) {
    if (exportando) return true;
    var ahora = performance.now();
    if (ultimo[nombre] && ahora - ultimo[nombre] < ms) return false;
    ultimo[nombre] = ahora;
    return true;
  }
  /** Marca que sonó un sonido propio de una demostración (evita el genérico encima). */
  function especifico() { ultimoEspecifico = ultimaDemo = performance.now(); }

  /* ------------------------------------------------------------------
     Voces: cada sonido guarda sus nodos y los libera al terminar
     ------------------------------------------------------------------ */
  function Voz() {
    this.nodos = []; this.fuentes = []; this.vivas = 0; this.libre = false;
    this.ctx = ac;   // su propio contexto (al exportar muestras es el offline)
    activos++; creados++;
  }
  Voz.prototype.nodo = function (n) { this.nodos.push(n); return n; };
  Voz.prototype.ganancia = function (v) { var g = ac.createGain(); g.gain.value = v == null ? 1 : v; return this.nodo(g); };
  Voz.prototype.filtro = function (tipo, f, q) {
    var b = ac.createBiquadFilter(); b.type = tipo; b.frequency.value = f; if (q != null) b.Q.value = q; return this.nodo(b);
  };
  Voz.prototype.paneo = function (p) {
    if (!ac.createStereoPanner) return this.ganancia(1);
    var s = ac.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); return this.nodo(s);
  };
  Voz.prototype.fuente = function (s, t0, t1) {
    var v = this;
    v.fuentes.push(s); v.nodos.push(s); v.vivas++;
    s.onended = function () { if (--v.vivas <= 0) v.liberar(); };
    s.start(t0); s.stop(t1);
    return s;
  };
  Voz.prototype.osc = function (tipo, f, t0, t1) {
    var o = ac.createOscillator(); o.type = tipo; o.frequency.value = f;
    return this.fuente(o, t0, t1);
  };
  /** Ruido blanco en bucle, con desfase al azar (cada ráfaga suena distinta). */
  Voz.prototype.ruido = function (t0, t1) {
    var v = this;
    var s = ac.createBufferSource(); s.buffer = ruidoBuf; s.loop = true;
    v.fuentes.push(s); v.nodos.push(s); v.vivas++;
    s.onended = function () { if (--v.vivas <= 0) v.liberar(); };
    s.start(t0, Math.random() * (ruidoBuf.duration - 0.1));
    s.stop(t1);
    return s;
  };
  /** Corta la voz antes de tiempo con un fundido corto (sin clics). */
  Voz.prototype.cortar = function (salida, ms) {
    if (this.libre) return;
    var t = this.ctx.currentTime, fin = t + (ms || 60) / 1000;
    if (salida) {
      salida.gain.cancelScheduledValues(t);
      salida.gain.setValueAtTime(salida.gain.value, t);
      salida.gain.linearRampToValueAtTime(0, fin);
    }
    this.fuentes.forEach(function (s) { try { s.stop(fin + 0.01); } catch (e) { /* ya parada */ } });
  };
  Voz.prototype.liberar = function () {
    if (this.libre) return;
    this.libre = true;
    this.nodos.forEach(function (n) { try { n.disconnect(); } catch (e) { /* ya desconectado */ } });
    this.nodos = []; this.fuentes = [];
    activos--;
  };

  /** Envolvente percusiva: 0 → pico en `ataque` s → casi 0 tras `caida` s (exponencial). */
  function envolvente(param, t, ataque, pico, caida) {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(pico, t + ataque);
    param.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
  }
  /** Tono simple con envolvente percusiva hacia `destino`. */
  function tono(v, destino, tipo, f, t, ataque, pico, caida) {
    var g = v.ganancia(0);
    envolvente(g.gain, t, ataque, pico, caida);
    var o = v.osc(tipo, f, t, t + ataque + caida + 0.03);
    o.connect(g); g.connect(destino);
    return o;
  }
  /** Ráfaga corta de ruido filtrado. */
  function chasquido(v, destino, tipoFiltro, f, q, t, pico, caida) {
    var fl = v.filtro(tipoFiltro, f, q);
    var g = v.ganancia(0);
    envolvente(g.gain, t, 0.002, pico, caida);
    v.ruido(t, t + caida + 0.03).connect(fl); fl.connect(g); g.connect(destino);
  }
  /** Campanita cristalina muy suave (parciales inarmónicos, caída rápida). */
  function campana(v, destino, f, t, pico) {
    [[1, 1, 0.9], [2.76, 0.28, 0.45], [5.4, 0.08, 0.22]].forEach(function (p) {
      tono(v, destino, 'sine', f * p[0], t, 0.004, pico * p[1], p[2]);
    });
  }

  /* ------------------------------------------------------------------
     1. Viaje entre pisos del candelabro (modo 3D) y transición clásica
     ------------------------------------------------------------------ */
  /** Whoosh grave que dura lo mismo que el viaje + campanita al llegar.
      piso: 0 (ambiente) … 5 (cámara de mezcla), −1 para la vista de cierre.
      baja: true si la cámara desciende. ms: duración del viaje. */
  function piso(n, baja, ms) {
    if (!listo() || !permitir('piso', 120)) return;
    especifico();
    if (vozPiso) vozPiso.voz.cortar(vozPiso.salida, 80);
    var dur = Math.max(0.4, (ms || 1200) / 1000);
    var k = n < 0 ? 0.5 : Math.min(1, n / 5);        // 0 = cálido … 1 = lo más frío
    var t = ac.currentTime + 0.01, fin = t + dur;
    var v = new Voz();
    var salida = v.ganancia(1);
    salida.connect(maestro);

    // Ruido filtrado con barrido (hacia abajo al bajar, hacia arriba al subir)
    var lp = v.filtro('lowpass', 1, 1.1);
    var fAlto = 1700 * (1 - 0.35 * k), fBajo = 200 * (1 - 0.3 * k);
    lp.frequency.setValueAtTime(baja ? fAlto : fBajo, t);
    lp.frequency.exponentialRampToValueAtTime(baja ? fBajo : fAlto, fin);
    var gR = v.ganancia(0);
    gR.gain.setValueAtTime(0.0001, t);
    gR.gain.linearRampToValueAtTime(0.11, t + dur * 0.4);
    gR.gain.exponentialRampToValueAtTime(0.0001, fin);
    v.ruido(t, fin + 0.05).connect(lp); lp.connect(gR); gR.connect(salida);

    // Tono grave que baja levemente; más grave y «frío» (más puro) en cada piso
    var f0 = 98 * Math.pow(2, -0.6 * k);
    var lpT = v.filtro('lowpass', 520 - 220 * k, 0.7);
    var gT = v.ganancia(0);
    gT.gain.setValueAtTime(0.0001, t);
    gT.gain.linearRampToValueAtTime(0.1, t + dur * 0.35);
    gT.gain.exponentialRampToValueAtTime(0.0001, fin);
    lpT.connect(gT); gT.connect(salida);
    ['sine', 'triangle'].forEach(function (tipo, i) {
      var o = v.osc(tipo, f0 * (i ? 2 : 1), t, fin + 0.05);
      o.frequency.setValueAtTime(f0 * (i ? 2 : 1), t);
      o.frequency.exponentialRampToValueAtTime(f0 * (i ? 2 : 1) * (baja ? 0.89 : 1.12), fin);
      var g = v.ganancia(i ? 0.35 : 1);
      o.connect(g); g.connect(lpT);
    });

    // Campanita al llegar (un poco más clara cuanto más frío)
    campana(v, salida, 880 * Math.pow(2, 0.25 * k), fin - 0.06, 0.045);
    vozPiso = { voz: v, salida: salida };
  }

  /** Transición papel → HUD (modo clásico): disolución digital breve (~0,9 s). */
  function disolucion() {
    if (!listo() || !permitir('disolucion', 300)) return;
    especifico();
    var t = ac.currentTime + 0.01, dur = 0.9;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    // Granos de ruido cada vez más agudos y espaciados (los píxeles que se desprenden)
    var bp = v.filtro('bandpass', 900, 2.5);
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + dur);
    var compuerta = v.ganancia(0);
    var tt = t;
    while (tt < t + dur) {
      var p = (tt - t) / dur;
      var a = 0.09 * (1 - p) + 0.015;
      var largo = 0.006 + Math.random() * 0.012;
      compuerta.gain.setValueAtTime(0, tt);
      compuerta.gain.linearRampToValueAtTime(a * (0.5 + Math.random() * 0.5), tt + 0.002);
      compuerta.gain.linearRampToValueAtTime(0, tt + largo);
      tt += 0.014 + p * p * 0.07 + Math.random() * 0.02;
    }
    v.ruido(t, t + dur + 0.05).connect(bp); bp.connect(compuerta); compuerta.connect(salida);
    // Un tono suave en escalones (lo «digital»), que sube y se apaga
    var lp = v.filtro('lowpass', 1800, 0.5);
    var g = v.ganancia(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.025, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var o = v.osc('square', 330, t, t + dur + 0.02);
    for (var s = 0; s < 9; s++) o.frequency.setValueAtTime(330 * Math.pow(2, Math.floor(Math.random() * 5) / 12 + s / 12), t + s * dur / 9);
    o.connect(lp); lp.connect(g); g.connect(salida);
  }

  /* ------------------------------------------------------------------
     2. Demostraciones
     ------------------------------------------------------------------ */
  /** Moneda girando: trémolo suave mientras gira (se apaga solo a los ~3 s). */
  function giro(encender) {
    if (vozGiro) { vozGiro.voz.cortar(vozGiro.salida, 120); vozGiro = null; }
    if (!encender || !listo()) return;
    especifico();
    var t = ac.currentTime + 0.01, fin = t + 3.6;
    var v = new Voz();
    var salida = v.ganancia(0);
    salida.gain.setValueAtTime(0.0001, t);
    salida.gain.linearRampToValueAtTime(0.02, t + 0.4);
    salida.gain.setValueAtTime(0.02, t + 2.4);
    salida.gain.linearRampToValueAtTime(0, fin);
    salida.connect(maestro);
    var lp = v.filtro('lowpass', 900, 0.6);
    var trem = v.ganancia(0.55);
    var lfo = v.osc('sine', 3.1, t, fin + 0.05);      // dos destellos por vuelta de la moneda
    var prof = v.ganancia(0.45);
    lfo.connect(prof); prof.connect(trem.gain);
    v.osc('triangle', 196, t, fin + 0.05).connect(lp);
    v.osc('sine', 293.7, t, fin + 0.05).connect(trem);
    lp.connect(trem); trem.connect(salida);
    vozGiro = { voz: v, salida: salida };
  }

  /** Clic metálico al medir la moneda. resultado: 'cara' | 'sello'. */
  function moneda(resultado) {
    giro(false);
    if (!listo() || !permitir('moneda', 60)) return;
    especifico();
    var t = ac.currentTime + 0.005;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    var f = resultado === 'sello' ? 1900 : 2150;
    tono(v, salida, 'sine', f, t, 0.002, 0.05, 0.12);
    tono(v, salida, 'sine', f * 1.58, t, 0.002, 0.028, 0.08);
    tono(v, salida, 'sine', f * 2.31, t, 0.002, 0.012, 0.05);
    chasquido(v, salida, 'highpass', 4000, 0.7, t, 0.05, 0.012);
  }

  /** «Medir 100 veces»: ráfaga de ticks muy suaves (~0,45 s). */
  function monedaCien() {
    giro(false);
    if (!listo() || !permitir('monedaCien', 200)) return;
    especifico();
    var t = ac.currentTime + 0.01;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    for (var i = 0; i < 14; i++) {
      var ti = t + i * 0.03 + Math.random() * 0.012;
      tono(v, salida, 'sine', 1800 + Math.random() * 700, ti, 0.001, 0.014 * (1 - i / 20), 0.025);
    }
  }

  /** Doble rendija: tic suavísimo por impacto (máx. ~12 por segundo). */
  function impacto() {
    if (!listo() || !permitir('impacto', 80)) return;
    especifico();
    var t = ac.currentTime + 0.005;
    var v = new Voz();
    var p = v.paneo((Math.random() - 0.5) * 0.4);
    p.connect(maestro);
    tono(v, p, 'sine', 2300 + Math.random() * 500, t, 0.001, 0.014 + Math.random() * 0.006, 0.03);
  }

  /** Interruptor de bits: clic mecánico corto (dos transitorios y un golpe grave). */
  function interruptor(encendido) {
    if (!listo() || !permitir('interruptor', 30)) return;
    especifico();
    var t = ac.currentTime + 0.005;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    var f = encendido ? 2100 : 1700;
    chasquido(v, salida, 'bandpass', f, 3, t, 0.12, 0.012);
    chasquido(v, salida, 'bandpass', f * 1.3, 3, t + 0.018, 0.05, 0.01);
    tono(v, salida, 'sine', encendido ? 170 : 140, t, 0.002, 0.07, 0.05);
  }

  /** Compuerta lógica: tono alto si la salida es 1, bajo y más apagado si es 0. */
  function compuerta(salidaBit) {
    if (!listo() || !permitir('compuerta', 40)) return;
    especifico();
    var t = ac.currentTime + 0.005;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    if (salidaBit) {
      tono(v, salida, 'sine', 659.3, t, 0.006, 0.055, 0.22);
      tono(v, salida, 'sine', 988, t, 0.006, 0.012, 0.12);
    } else {
      var lp = v.filtro('lowpass', 700, 0.5); lp.connect(salida);
      tono(v, lp, 'triangle', 329.6, t, 0.006, 0.05, 0.16);
    }
  }

  /** Esfera de Bloch: un intervalo distinto por puerta (base La4 y la nota del intervalo). */
  var INTERVALOS = { X: 1.5, H: 1.26, Z: 1.335 };   // quinta, tercera mayor, cuarta
  function puerta(nombre) {
    if (!listo() || !permitir('puerta', 60)) return;
    especifico();
    var t = ac.currentTime + 0.005;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    var base = 440, r = INTERVALOS[nombre] || 1.5;
    tono(v, salida, 'sine', base, t, 0.01, 0.025, 0.5);
    tono(v, salida, 'sine', base * r, t + 0.09, 0.01, 0.022, 0.6);
    tono(v, salida, 'triangle', base * r / 2, t + 0.09, 0.01, 0.015, 0.4);
  }

  /** Medir en la esfera de Bloch: «colapso» (glissando rápido hacia abajo y un golpe suave). */
  function colapso(sale0) {
    if (!listo() || !permitir('colapso', 80)) return;
    especifico();
    var t = ac.currentTime + 0.005;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    var g = v.ganancia(0);
    envolvente(g.gain, t, 0.005, 0.03, 0.22);
    var o = v.osc('sine', 880, t, t + 0.3);
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(sale0 ? 440 : 330, t + 0.12);
    o.connect(g); g.connect(salida);
    tono(v, salida, 'sine', sale0 ? 130.8 : 98, t + 0.11, 0.004, 0.04, 0.12);
  }

  /** Entrelazamiento: dos tonos a la vez, siempre opuestos (A a la izquierda, B a la derecha). */
  function par(aArriba) {
    if (!listo() || !permitir('par', 60)) return;
    especifico();
    var t = ac.currentTime + 0.005;
    var v = new Voz();
    [[aArriba, -0.6], [!aArriba, 0.6]].forEach(function (q) {
      var p = v.paneo(q[1]); p.connect(maestro);
      tono(v, p, 'sine', q[0] ? 659.3 : 440, t, 0.006, 0.045, 0.35);
    });
  }

  /** 2ⁿ: blip cuya altura sube con n (1…300 → ~150…1200 Hz). */
  function potencia(n) {
    if (!listo() || !permitir('potencia', 70)) return;
    especifico();
    var t = ac.currentTime + 0.005;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    var f = 150 * Math.pow(2, 3 * (Math.max(1, Math.min(300, n)) - 1) / 299);
    tono(v, salida, 'sine', f, t, 0.004, 0.035, 0.09);
  }

  /** Decoherencia: ruido que sube con el deslizador (0…1); se apaga solo al soltar. */
  function ruido(nivel) {
    if (!listo()) return;
    especifico();
    nivel = Math.max(0, Math.min(1, +nivel || 0));
    var t = ac.currentTime;
    if (!vozRuido) {
      var v = new Voz();
      var salida = v.ganancia(0); salida.connect(maestro);
      var lp = v.filtro('lowpass', 400, 0.7);
      v.ruido(t, t + 30).connect(lp); lp.connect(salida);   // tope de seguridad: 30 s
      vozRuido = { voz: v, salida: salida, lp: lp };
    }
    vozRuido.salida.gain.setTargetAtTime(0.012 + 0.06 * nivel * nivel, t, 0.04);
    vozRuido.lp.frequency.setTargetAtTime(400 + 4200 * nivel, t, 0.05);
    clearTimeout(timerRuido);
    timerRuido = setTimeout(apagarRuido, 260);
  }
  function apagarRuido() {
    clearTimeout(timerRuido);
    if (!vozRuido) return;
    vozRuido.voz.cortar(vozRuido.salida, 220);
    vozRuido = null;
  }

  /** Botón genérico de una demostración: un tic corto y suave. */
  function boton() {
    if (!listo() || !permitir('boton', 40)) return;
    ultimaDemo = performance.now();
    var t = ac.currentTime + 0.005;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    var g = v.ganancia(0);
    envolvente(g.gain, t, 0.002, 0.04, 0.045);
    var o = v.osc('sine', 1250, t, t + 0.06);
    o.frequency.setValueAtTime(1250, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.04);
    o.connect(g); g.connect(salida);
  }

  /* ------------------------------------------------------------------
     3. Aniquilaciones del fondo (modo 3D): un «pop» redondo y cristalino
     ------------------------------------------------------------------ */
  /** Elige la nota de esta aniquilación (pentatónica), sin repetir la anterior. */
  function notaAniquilacion() {
    var n = ANIQ_NOTAS.length, k;
    if (ultimaNota < 0) k = Math.floor(Math.random() * n);
    else { k = Math.floor(Math.random() * (n - 1)); if (k >= ultimaNota) k++; }
    ultimaNota = k;
    return ANIQ_BASE * Math.pow(2, ANIQ_NOTAS[k] / 12);
  }

  /** x: posición horizontal en pantalla (0 = izquierda, 1 = derecha).
      forzar: suena siempre (sin sorteo ni limitadores; para muestras).
      retraso: segundos desde ahora (solo para renderizar secuencias).
      Partes: (1) succión ascendente de 60 ms mientras se atraen; (2) impacto:
      seno grave que cae una octava (nota/3 → nota/6, ≈ 220 → 110 Hz) + campana
      con fundamental, quinta y un parcial inarmónico suave; (3) cola brillante
      con batido lento (shimmer) de ~0,45 s. Todo pasa por un pasabajos de
      4,5 kHz y por la reverberación corta del bus. */
  function aniquilacion(x, forzar, retraso) {
    if (!listo()) return;
    if (vozPiso && !vozPiso.voz.libre) return;                 // silencio durante un viaje
    if (!forzar) {
      if (!exportando && performance.now() - ultimaDemo < ANIQ_TRAS_DEMO_MS) return;
      if (Math.random() > PROB_ANIQUILACION) return;
      if (!permitir('aniquilacion', ANIQ_MIN_MS)) return;
    }
    var nivel = NIVEL_ANIQUILACION * (Expo.reducido ? AMBIENTE_REDUCIDO : 1);
    var f = notaAniquilacion();
    var t0 = ac.currentTime + 0.005 + (retraso || 0);
    var t = t0 + 0.06;                                         // instante del impacto
    var v = new Voz();
    var p = v.paneo(((x == null ? 0.5 : x) * 2 - 1) * 0.6);
    var seco = v.ganancia(1), envio = v.ganancia(0.55);
    p.connect(seco); p.connect(envio);
    seco.connect(maestro); envio.connect(reverb);
    var lp = v.filtro('lowpass', 4500, 0.5);                   // nada chillón por encima de ~5 kHz
    lp.connect(p);

    // (1) Succión: ruido en banda que sube 500 → 1800 Hz y crece hasta el impacto…
    var bp = v.filtro('bandpass', 500, 1.6);
    bp.frequency.setValueAtTime(500, t0);
    bp.frequency.exponentialRampToValueAtTime(1800, t);
    var gs = v.ganancia(0);
    gs.gain.setValueAtTime(0.0001, t0);
    gs.gain.exponentialRampToValueAtTime(0.05 * nivel, t - 0.004);
    gs.gain.linearRampToValueAtTime(0.0001, t + 0.01);
    v.ruido(t0, t + 0.03).connect(bp); bp.connect(gs); gs.connect(lp);
    //     …y un seno que sube una octava con ella (da altura a la succión)
    var gso = v.ganancia(0);
    gso.gain.setValueAtTime(0.0001, t0);
    gso.gain.exponentialRampToValueAtTime(0.010 * nivel, t - 0.004);
    gso.gain.linearRampToValueAtTime(0.0001, t + 0.008);
    var os = v.osc('sine', f / 2, t0, t + 0.03);
    os.frequency.setValueAtTime(f / 2, t0);
    os.frequency.exponentialRampToValueAtTime(f, t);
    os.connect(gso); gso.connect(lp);

    // (2a) Cuerpo: seno grave que cae una octava
    var gc = v.ganancia(0);
    envolvente(gc.gain, t, 0.004, 0.06 * nivel, 0.22);
    var oc = v.osc('sine', f / 3, t, t + 0.26);
    oc.frequency.setValueAtTime(f / 3, t);
    oc.frequency.exponentialRampToValueAtTime(f / 6, t + 0.12);
    oc.connect(gc); gc.connect(lp);
    //      transitorio: golpe de ruido muy corto y opaco (el «pop», sin clic seco)
    chasquido(v, lp, 'lowpass', 1400, 0.7, t, 0.03 * nivel, 0.018);

    // (2b) Campana: fundamental, quinta (intervalo consonante) e inarmónico suave
    tono(v, lp, 'sine', f,        t, 0.003, 0.030 * nivel, 0.42);
    tono(v, lp, 'sine', f * 1.5,  t, 0.003, 0.014 * nivel, 0.30);
    tono(v, lp, 'sine', f * 2.76, t, 0.002, 0.006 * nivel, 0.12);

    // (3) Cola brillante: dos senos casi iguales a la octava (batido ≈ 5 Hz = shimmer)
    [1, 1.0039].forEach(function (d) {
      var g = v.ganancia(0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.008 * nivel, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
      var o = v.osc('sine', f * 2 * d, t, t + 0.5);
      o.connect(g); g.connect(lp);
    });
  }

  /* ------------------------------------------------------------------
     4. Barra, índice y notas
     ------------------------------------------------------------------ */
  /** Presión (pointerdown) en un botón de la barra o del índice. */
  function presion() {
    if (!listo() || !permitir('presion', 40)) return;
    var t = ac.currentTime + 0.003;
    var v = new Voz();
    var lp = v.filtro('lowpass', 2200, 0.5); lp.connect(maestro);
    var g = v.ganancia(0);
    envolvente(g.gain, t, 0.002, 0.04, 0.04);
    var o = v.osc('sine', 820, t, t + 0.06);
    o.frequency.setValueAtTime(820, t);
    o.frequency.exponentialRampToValueAtTime(640, t + 0.035);
    o.connect(g); g.connect(lp);
  }
  /** Suelte (pointerup): aún más sutil. */
  function suelte() {
    if (!listo() || !permitir('suelte', 40)) return;
    var t = ac.currentTime + 0.003;
    var v = new Voz();
    tono(v, maestro, 'sine', 1180, t, 0.002, 0.016, 0.03);
  }

  /** Abrir (true) o cerrar (false) el índice o las notas: deslizamiento cristalino corto. */
  function deslizar(abrir) {
    if (!listo() || !permitir('deslizar', 80)) return;
    var t = ac.currentTime + 0.005, dur = 0.24;
    var v = new Voz();
    var salida = v.ganancia(1); salida.connect(maestro);
    var bp = v.filtro('bandpass', 1, 3.5);
    bp.frequency.setValueAtTime(abrir ? 600 : 2600, t);
    bp.frequency.exponentialRampToValueAtTime(abrir ? 2600 : 600, t + dur);
    var g = v.ganancia(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    v.ruido(t, t + dur + 0.03).connect(bp); bp.connect(g); g.connect(salida);
    // Brillo de cristal, muy bajo
    tono(v, salida, 'sine', abrir ? 1568 : 1175, t + dur * 0.5, 0.004, 0.012, 0.25);
  }

  /* ------------------------------------------------------------------
     Delegación: barra/índice (presión y suelte) y botones genéricos
     ------------------------------------------------------------------ */
  var SEL_BARRA = '.barra-btn, .indice-enlace';
  var SEL_GENERICO = '.btn, .pestana, .acordeon-boton, .tarjeta-video, .bit-boton';
  var presionado = null;
  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var b = e.target.closest && e.target.closest(SEL_BARRA);
    presionado = b;
    if (b) presion();
  }, { capture: true, passive: true });
  document.addEventListener('pointerup', function (e) {
    var b = e.target.closest && e.target.closest(SEL_BARRA);
    if (b && b === presionado) suelte();
    presionado = null;
  }, { capture: true, passive: true });
  // Fase de burbuja: corre después del manejador del botón; si la demostración ya
  // hizo su propio sonido en este clic, no se suma el genérico.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest(SEL_GENERICO);
    if (!b || b.closest(SEL_BARRA)) return;
    if (performance.now() - ultimoEspecifico < 50) return;
    boton();
  });

  /* ------------------------------------------------------------------
     Silencio: botón de la barra y tecla M
     ------------------------------------------------------------------ */
  var btn = null;
  function pintarBoton() {
    if (!btn) btn = document.getElementById('btn-sonido');
    if (!btn) return;
    btn.setAttribute('aria-pressed', silencio ? 'true' : 'false');
    var txt = silencio ? 'Activar sonido (M)' : 'Silenciar sonido (M)';
    btn.setAttribute('aria-label', txt);
    btn.title = txt;
  }
  function silenciar(valor) {
    silencio = !!valor;
    guardarPreferencia(silencio ? 'off' : 'on');
    pintarBoton();
    if (silencio) { giro(false); apagarRuido(); }
    if (!ac) { if (!silencio) alGesto(); return; }
    var t = ac.currentTime;
    maestro.gain.cancelScheduledValues(t);
    maestro.gain.setValueAtTime(maestro.gain.value, t);
    maestro.gain.linearRampToValueAtTime(silencio ? 0 : VOLUMEN, t + 0.08);
    if (silencio) setTimeout(function () { if (silencio && ac) ac.suspend().catch(function () {}); }, 120);
    else ac.resume().then(function () { boton(); }).catch(function () {});
  }
  function alternar() { silenciar(!silencio); }

  function conectarBoton() {
    btn = document.getElementById('btn-sonido');
    if (btn) btn.addEventListener('click', alternar);
    pintarBoton();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', conectarBoton);
  else conectarBoton();

  /* ------------------------------------------------------------------
     Exportar muestras (QA): renderiza un sonido con OfflineAudioContext
     y devuelve un WAV (PCM 16 bits, estéreo) en base64.
     ------------------------------------------------------------------ */
  function aWav(buf) {
    var canales = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate;
    var datos = new DataView(new ArrayBuffer(44 + n * canales * 2));
    function texto(o, s) { for (var i = 0; i < s.length; i++) datos.setUint8(o + i, s.charCodeAt(i)); }
    texto(0, 'RIFF'); datos.setUint32(4, 36 + n * canales * 2, true); texto(8, 'WAVE');
    texto(12, 'fmt '); datos.setUint32(16, 16, true); datos.setUint16(20, 1, true);
    datos.setUint16(22, canales, true); datos.setUint32(24, sr, true);
    datos.setUint32(28, sr * canales * 2, true); datos.setUint16(32, canales * 2, true); datos.setUint16(34, 16, true);
    texto(36, 'data'); datos.setUint32(40, n * canales * 2, true);
    var ch = []; for (var c = 0; c < canales; c++) ch.push(buf.getChannelData(c));
    var o = 44;
    for (var i = 0; i < n; i++) {
      for (c = 0; c < canales; c++) {
        var s = Math.max(-1, Math.min(1, ch[c][i]));
        datos.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
      }
    }
    var bytes = new Uint8Array(datos.buffer), bin = '';
    for (i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  /** Renderiza fuera de línea: fn() se llama con el contexto offline ya armado. */
  function renderizar(fn, segundos) {
    var Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Off) return Promise.reject(new Error('Sin OfflineAudioContext'));
    var guardado = { ac: ac, maestro: maestro, reverb: reverb, ruidoBuf: ruidoBuf, vozPiso: vozPiso, vozGiro: vozGiro, vozRuido: vozRuido };
    var off = new Off(2, Math.ceil(44100 * segundos), 44100);
    exportando = true;
    ac = off;
    var bus = armarBus(off);
    maestro = bus.maestro; reverb = bus.reverb; ruidoBuf = bus.ruido; vozPiso = null; vozGiro = null; vozRuido = null;
    try { fn(); }
    finally {
      exportando = false;
      if (vozRuido) { clearTimeout(timerRuido); vozRuido.voz.cortar(vozRuido.salida, 220); }
      ac = guardado.ac; maestro = guardado.maestro; reverb = guardado.reverb; ruidoBuf = guardado.ruidoBuf;
      vozPiso = guardado.vozPiso; vozGiro = guardado.vozGiro; vozRuido = guardado.vozRuido;
    }
    return off.startRendering().then(function (buf) {
      var pico = 0;
      for (var c = 0; c < buf.numberOfChannels; c++) {
        var d = buf.getChannelData(c);
        for (var i = 0; i < d.length; i++) if (Math.abs(d[i]) > pico) pico = Math.abs(d[i]);
      }
      // Duración audible: hasta la última muestra por encima de −60 dB respecto al pico
      var umbral = pico * 0.001, ultimaMuestra = 0;
      for (c = 0; c < buf.numberOfChannels; c++) {
        d = buf.getChannelData(c);
        for (i = d.length - 1; i > ultimaMuestra; i--) if (Math.abs(d[i]) > umbral) { ultimaMuestra = i; break; }
      }
      return { wav: aWav(buf), picoDb: pico > 0 ? +(20 * Math.log10(pico)).toFixed(1) : -Infinity, duracion: +(ultimaMuestra / buf.sampleRate).toFixed(2) };
    });
  }

  /* ------------------------------------------------------------------
     API pública
     ------------------------------------------------------------------ */
  window.Sonido = {
    piso: piso, disolucion: disolucion,
    giro: giro, moneda: moneda, monedaCien: monedaCien,
    impacto: impacto, interruptor: interruptor, compuerta: compuerta,
    puerta: puerta, colapso: colapso, par: par, potencia: potencia, ruido: ruido,
    boton: boton, aniquilacion: aniquilacion,
    presion: presion, suelte: suelte, deslizar: deslizar,
    alternar: alternar, silenciar: silenciar,
    silenciado: function () { return silencio; },
    /** Estado para pruebas: voces vivas, creadas y el estado del contexto. */
    estado: function () {
      return { contexto: ac ? ac.state : 'sin crear', silencio: silencio, vocesActivas: activos, vocesCreadas: creados };
    },
    renderizar: renderizar
  };
})();

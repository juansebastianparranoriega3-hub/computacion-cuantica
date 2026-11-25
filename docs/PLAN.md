# Plan de trabajo — Exposición "Computación Cuántica"

Fecha: 2026-11-24 · Dueño: Sebas · Supervisor: Claude (delega a subagentes)

## 1. Qué vamos a construir
Una **presentación web interactiva** (se abre en el navegador, pantalla completa) para exponer el documento
`materiales/Computacion_Cuantica_Exposicion.docx` en 15–20 minutos. No es un PowerPoint: cada lámina tiene
animaciones que explican el concepto (no de adorno).

Funciona **sin internet** (todo local, sin CDN), salvo los dos videos de YouTube, que muestran un aviso si no hay conexión.

## 2. Idea de diseño: "del periódico al holograma"
Las dos referencias que mandaste se usan como **narrativa**, no como decoración:

| Parte de la expo | Estilo | Referencia |
|---|---|---|
| Computación clásica, bits, historia (1900–1980) | **Periódico editorial**: papel crema, tinta negra, serif grande (tipo "OSAKA"), columnas, filetes dobles, fechas y coordenadas en la cabecera | `ref-periodico-osaka.jpg` |
| Física cuántica, qubits, Majorana, futuro | **HUD futurista**: fondo negro-azul, azul eléctrico (#3B8BFF aprox.), paneles con esquinas cortadas, barras de progreso, monoespaciada, destellos de estrella | `ref-hud-nextgen.jpg` |
| El paso de uno al otro (cap. 3) | **Transición grande**: el papel se "descompone" en partículas/píxeles y aparece el HUD | — |

Así el público *ve* el salto de lo clásico a lo cuántico.

Tipografías (locales, en `web/fuentes/` o del sistema): una serif display para titulares de periódico, una serif de lectura para el texto, y una monoespaciada para el HUD.

## 3. Estructura de láminas

### 3.1 Recorrido principal de 10 minutos (aprobado por Sebas, 2026-11-24)
Con `→`, Espacio y deslizar solo se recorren estas láminas, en este orden. La tabla vive en
`BLOQUES` de `web/js/01-nucleo.js`: para sumar o quitar una lámina basta con editarla.

| Bloque | Tiempo | Láminas (n.º en el recorrido · id) |
|---|---|---|
| 01 Apertura | 0:45 | 1 `l-portada` · 2 `l-gancho` |
| 02 Bits | 1:30 | 3 `l-bit` · 4 `l-moore` |
| 03 Física cuántica | 2:30 | 5 `l-transicion` (transición papel→HUD) · 6 `l-rendija` · 7 `l-moneda` · 8 `l-entrelazamiento` |
| 04 Qubits | 2:00 | 9 `l-bloch` · 10 `l-potencia` · 11 `l-tabla` |
| 05 Historia | 0:45 | 12 `l-linea` |
| 06 Majorana | 2:00 | 13 `l-majorana1` · 14 `l-topologia` · 15 `l-majorana2` · 16 `l-controversia` |
| 07 Cierre | 0:30 | 17 `l-ideas` |

Son 17 láminas (la petición original decía 18, pero la lista de ids aprobada tiene 17; ver bitácora).

### 3.2 Anexo — para preguntas (23 láminas)
No se borran: se abren desde el índice (`Esc` o ☰), sección «Anexo — para preguntas», agrupadas por su
sección original. Dentro del anexo `←`/`→` se mueven solo por el anexo; «↩ Recorrido» en la barra (o «atrás»
del navegador) vuelve a la última lámina del recorrido. URL: `#N` = lámina N del recorrido; `#anexo-<nombre>`
= lámina del anexo por su id sin `l-` (p. ej. `#anexo-cuantizacion`).

Anexo: `l-computar`, `l-fundamentos`, `l-compuertas`, `l-cuantizacion`, `l-interferencia`, `l-decoherencia`,
`l-sintesis`, `l-qubit`, `l-puertas`, `l-tipos`, `l-errores`, `l-usos`, `l-camino`, `l-particulas`,
`l-topoconductor`, `l-medicion`, `l-tetron`, `l-comparacion`, `l-videos`, `l-futuro`, `l-preguntas`,
`l-glosario`, `l-fuentes`.

### 3.3 Estructura original completa (según la guía del cap. 8 del documento)

| # | Bloque | Min | Lámina(s) | Animación que explica algo |
|---|---|---|---|---|
| 0 | Portada | — | "Gaceta Cuántica" — titular COMPUTACIÓN CUÁNTICA, subtítulo, fecha | Entrada del titular letra por letra (sencilla) |
| 1 | Apertura | 1 | Pregunta gancho: "¿Qué pasaría si una computadora pudiera simular una molécula…?" | Texto que se escribe solo |
| 2 | Computación y bits | 3 | Entrada→Proceso→Salida (receta) · ¿Qué es un bit? · combinaciones 1/2/3/8 bits · decimal→binario · compuertas AND/OR/NOT · Ley de Moore | **Interruptores clicables** que cambian bits y muestran el número decimal; compuerta lógica interactiva; gráfica de Moore que se dibuja |
| 3 | Física cuántica | 4 | Cuantización · doble rendija · superposición (moneda) · medición · interferencia · entrelazamiento · decoherencia | **Transición papel→HUD**. Doble rendija con partículas que forman el patrón de franjas; ondas que se suman/cancelan (slider de fase); moneda girando que "colapsa" al medir; par entrelazado; decoherencia como ruido que destruye la onda |
| 4 | Qubits | 4 | Cómo se describe un qubit · **esfera de Bloch** · 2ⁿ amplitudes · puertas cuánticas · tabla bit vs qubit · tipos de qubits · corrección de errores · ¿para qué sirve? | **Esfera de Bloch 3D en canvas** (arrastrable, botones X/H/Z que rotan el vector) ; contador que muestra 2ⁿ creciendo con un slider de n |
| 5 | Historia | 3 | Línea de tiempo 1900 → 2026 (tabla del cap. 6) | **Línea de tiempo con scroll horizontal**; las fichas viejas en estilo periódico, las nuevas en HUD |
| 6 | Microsoft Majorana | 4 | Problema · topología (nudo) · partículas de Majorana · topoconductor · paridad · medición digital · tetrón · Majorana 2 · comparación · controversia | **Fotos de los chips** con efecto de inclinación 3D al mover el mouse y etiquetas HUD que señalan partes; animación del nudo/paridad |
| 7 | Videos | — | "Los 4 tipos de Computación Cuántica" (NovaGea) y "La Computación Cuántica Explicada" (El Robot de Platón) | Tarjetas que abren el video en un modal |
| 8 | Cierre | 1 | Ideas fuerza + "2029: objetivos anunciados" | Panel HUD final tipo "2040+ THE FUTURE IS…" |
| 9 | Extra | — | Preguntas frecuentes · glosario · fuentes | Acordeón (sencilla) |

El texto se toma del documento, **resumido** para lámina; el detalle largo va en "notas del expositor" (tecla `N`).

## 4. Animaciones: dos niveles
**Complejas** (canvas/JS propio, explican física): partículas de la doble rendija, ondas de interferencia, esfera de Bloch,
transición papel→HUD, entrelazamiento, crecimiento 2ⁿ, inclinación 3D de los chips.

**Sencillas** (siguiendo la skill de **Emil Kowalski** `emil-design-eng` + `animate`):
- Botones con `scale(0.97)` al presionar, transiciones de 150–250 ms con `ease-out` personalizada.
- Entradas de lámina con opacidad + desplazamiento corto (no desde `scale(0)`), escalonado de 40–60 ms.
- Nada de animación en la navegación por teclado repetida; tooltips sin retraso tras el primero.
- `prefers-reduced-motion`: se quitan movimientos y quedan fundidos.
- Solo `transform` y `opacity` (60 fps).

## 5. Controles de la presentación
- `→` / `Espacio` siguiente, `←` anterior, `F` pantalla completa, `N` notas del expositor, `Esc` índice general.
- Barra de progreso tipo HUD abajo ("UPLOAD IN PROGRESS 42%") con el bloque actual y minutos sugeridos.
- Funciona con clic/toque también (para tablet o celular).

## 6. Archivos
```
Computacion Cuantica/
  materiales/            Documento original, texto extraído y referencias (no se editan)
  web/index.html         La presentación
  web/css/estilos.css
  web/js/01-nucleo.js    Navegación, teclado, progreso, notas
  web/js/02-clasico.js   Bits, compuertas, Moore
  web/js/03-cuantico.js  Doble rendija, ondas, moneda, entrelazamiento, transición
  web/js/04-bloch.js     Esfera de Bloch
  web/js/05-majorana.js  Chips, línea de tiempo
  web/img/               majorana-1.jpg, majorana-2.jpg
  docs/PLAN.md           Este plan
  docs/BITACORA.md       Qué se hizo y cuándo
  .claude/agents/        Subagentes del proyecto
```

## 7. Fases y quién hace qué
| Fase | Qué | Quién |
|---|---|---|
| 1 | Plan (este documento) | Claude (supervisor) |
| 2 | Interfaz base: sistema visual (periódico + HUD), navegación, todas las láminas con su texto, animaciones sencillas | Subagente **expo-frontend** |
| 3 | Animaciones complejas (canvas) | Subagente **expo-frontend** |
| 4 | Prueba en navegador: todas las láminas, teclado, 1920×1080 y 1366×768, consola sin errores, reduced-motion | Subagente **expo-qa** |
| 5 | Revisión final del supervisor y ajustes | Claude |

## 8. Criterios de "terminado"
- **Exposición en 10 minutos:** el recorrido de la §3.1 (17 láminas, 7 bloques que suman 10:00) se expone
  completo con `→`; la barra muestra «N / 17» y los minutos del bloque («≈ 2:30 min»), iguales a la tabla.
  Cada lámina del recorrido tiene en sus notas (`N`) un guion de 15–45 s que cabe en el tiempo de su bloque,
  sacado del documento. El resto (anexo) queda a un clic desde el índice para las preguntas.
- Las 10 secciones navegables (recorrido + anexo), texto fiel al documento (sin inventar datos ni fechas).
- Cada animación compleja explica su concepto y se puede controlar (play/reset o slider).
- 0 errores en consola; 60 fps en las animaciones en un portátil normal.
- Se lee bien en un proyector (contraste alto, texto mínimo 24 px en láminas).
- Abre con doble clic en `web/index.html` (sin servidor) y sin internet.

## 9. Modo candelabro (3D) — aprobado por Sebas, 2026-11-24
Recorrido 3D por el «candelabro» (sistema de enfriamiento dorado de un computador cuántico superconductor). Bajar por él = pasar de lo clásico a lo cuántico. Es un **modo de la misma página** (`web/index.html`): las láminas no se duplican.

| Piso (arriba → abajo) | Temperatura (aprox.) | Bloque |
|---|---|---|
| Placa superior | Ambiente | 01 Apertura (la portada es una vista aparte: candelabro girando completo) |
| Piso 2 | ~50 K | 02 Bits |
| Piso 3 | ~4 K | 03 Física cuántica |
| Piso 4 (still) | ~0,8 K (still) — `docs/referencia-candelabro.md` §1: 0,7–0,9 K | 04 Qubits |
| Piso 5 | ~100 mK | 05 Historia |
| Cámara de mezcla | ~15 mK (documento: «unos 15 milikelvin») | 06 Majorana (chips bajo la cámara de mezcla) |
| Vista completa | — | 07 Cierre (la cámara se aleja; candelabro a la izquierda, panel a la derecha) |

- **Viaje entre bloques:** 1,2 s, ease-in-out; las partículas se aceleran y fluyen hacia arriba; el termómetro HUD baja con la misma curva. Entre láminas del mismo bloque solo cambia el panel. Anexo: sin viaje (escena detrás, desenfocada).
- **Estética:** en el modo 3D **todo es cristal** (dirección E de `prototipos/rediseno/`): las 40 láminas (también las de «papel»), barra, termómetro, índice, notas, modal de video y botón de modo. Los lienzos usan la paleta de cristal (`Expo.cristal`); la moneda es de cristal con borde irisado; una luz suave sigue al puntero sobre el panel. La transición papel→HUD no se usa en 3D. El modo clásico (periódico → HUD) no cambia.
- **Teclas extra:** `V` oculta el panel para mirar el piso (por ejemplo, los chips en la estación 06). Botón «3D / 2D» en la barra cambia de modo (se recuerda en el navegador).
- **Respaldo automático al modo clásico:** sin WebGL, `?modo=clasico`, o promedio < 30 fps en los primeros 2,5 s animados (con aviso). `prefers-reduced-motion`: 3D estático (la cámara salta, sin giro ni titileo). `?modo=3d` fuerza el 3D sin prueba de fps.
- **Viajes con giro (v. 2026-11-24f):** en cada bajada la cámara también orbita el candelabro 37–47° en el mismo sentido (tabla `ENCUADRES` de `06-candelabro.js`), con la misma curva ease-in-out del zoom; las luces acompañan a la cámara. Las estaciones dependen solo de las alturas («anclas») del modelo: `Candelabro.usarModelo(objeto, { anclas: [...] })` cambia el modelo procedural por el .glb sin tocar los viajes. Portada sin termómetro (aparece con el primer viaje).
- **Fondo de materia y antimateria:** partículas cian (materia) y magenta (antimateria) que derivan; ~1,5 aniquilaciones/s a la vista (destello blanco + dos rayos opuestos). 640 partículas (240 en celular), pool de 8 destellos (4).
- **Rendimiento:** en las estaciones solo se mueve el fondo y se dibuja a 30 fps (el desenfoque del panel se recalcula a ese ritmo); si el equipo no da ~20 fps, el fondo se queda quieto y el render vuelve a detenerse. Se detiene con la pestaña oculta y en el anexo. Durante el viaje el panel y la lámina nueva quedan `visibility: hidden`. En el cierre (el candelabro gira detrás del panel) se usa vidrio «falso» (gradiente + ruido, sin `backdrop-filter`); `body.vidrio-falso` lo fuerza en todo. Celular: 240 partículas, pixelRatio 1,25, sin antialias; sin bloom en ningún caso.
- **Archivos:** `web/js/06-candelabro.js` (escena, cámara, termómetro, modos, API `window.Candelabro`), `web/css/candelabro.css` (estructura del modo), `web/css/cristal.css` (estética E), `web/vendor/three/` (three.js r147 UMD: `three.min.js`, `GLTFLoader.js`, `RoomEnvironment.js`, `LICENSE`, y desde 2026-11-25 `meshopt_decoder.js` + `LICENSE-meshoptimizer`; ≈ 742 KB), `web/modelos/` (≈ 5,4 MB de scripts con los .glb en base64; ver «Modelo real»). Gancho en `01-nucleo.js`: `Expo.esperaAlEntrar(n, previa, rapido)`.
- **Modelo real de Blender (v. 2026-11-25a):** `candelabro.glb` (147.490 triángulos, 11 materiales) y los chips `majorana1.glb` / `majorana2.glb` (agente chip-3d) van en `web/modelos/candelabro.js`, `majorana1.js` y `majorana2.js` como `window.MODELO_CANDELABRO` / `MODELO_MAJORANA1` / `MODELO_MAJORANA2` = data URI base64 (en file:// no se puede hacer fetch de un .glb). Se regeneran con `node herramientas/generar-modelos.js` (con el argumento `_sin_compresion` usa esas variantes). Vienen con `EXT_meshopt_compression` y se decodifican con `web/vendor/three/meshopt_decoder.js` (UMD de three@0.147.0 = meshoptimizer 0.18, wasm embebido; licencia en `LICENSE-meshoptimizer`). Tabla `MODELO_REAL` en `06-candelabro.js`.
  - **Carga progresiva:** la portada aparece con el candelabro procedural; 0,9 s después de armar la escena (y en un momento libre) se cargan el decodificador y los 3 scripts, se decodifican, los chips se montan como hijos de `ancla_chip_m1` / `ancla_chip_m2` sin transformación, se precompilan los shaders y entra el real con un **fundido de 0,9 s** (si hay un viaje en curso, al terminarlo). Si algo falla, queda el procedural sin errores (solo un `console.info`). La prueba de fps no cuenta los cuadros mientras se decodifica. `<body data-modelo>` = `cargando` / `real` / `fallo` / `omitido`. Con `?modo=clasico` no se carga nada de 3D.
  - **Escala y encuadres:** el .glb (metros) se escala ×5,5 (`ESCALA_REAL`): los chips quedan a la altura de los marcadores provisionales y el alto total es parecido. Las anclas `ancla_piso_1…6` dan las alturas; los encuadres del modelo real están en `ENCUADRES_REAL` (mismo giro que `ENCUADRES`, distancias propias); portada y cierre con `ty`/`D` propios.
  - **Primer plano de los chips:** en la lámina 13 (`l-majorana1`) la tecla `V` lleva la cámara (viaje de 1,2 s, sin inclinación con el puntero) de frente a Majorana 1, con el chip en ~70 % del alto de la pantalla; en la 15 (`l-majorana2`), a Majorana 2. `V` otra vez vuelve a la estación. Sin termómetro en el primer plano (`body.primer-plano`). También funciona con los marcadores del procedural.
  - **Oro:** en three.js se sobrescriben `oro` (#f0b04a, rugosidad 0,2) y `oro_placas` (#e39b34, rugosidad 0,72 × la textura de mecanizado, `envMapIntensity` 0,75 para que las placas vistas desde arriba no se quemen); la placa superior es acero (plateada). `iman` se oscurece como en el render de Blender. Tabla `ORO_REAL`.
  - **Celular:** pantalla compacta o táctil → se queda el procedural (ahorra ~5,5 MB de scripts y ~150.000 triángulos). `?modelo=real` / `?modelo=procedural` lo fuerzan.
  - `Candelabro.cargarChip(nombre, dataUri)` sigue sirviendo: sobre un ancla del modelo real el chip entra sin transformación; sobre un marcador del procedural, se escala y centra al marcador.

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

## 3. Estructura de láminas (según la guía del cap. 8 del documento)

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
- Las 10 secciones navegables, texto fiel al documento (sin inventar datos ni fechas).
- Cada animación compleja explica su concepto y se puede controlar (play/reset o slider).
- 0 errores en consola; 60 fps en las animaciones en un portátil normal.
- Se lee bien en un proyector (contraste alto, texto mínimo 24 px en láminas).
- Abre con doble clic en `web/index.html` (sin servidor) y sin internet.

# Referencia visual: el "candelabro" de un computador cuántico superconductor

Documento de apoyo para modelar en Blender el refrigerador de dilución con su cableado.
Prioridad: **fidelidad visual** para una presentación educativa, no exactitud de ingeniería.

**Cómo leer las marcas:**
- **[V]** = verificado en la fuente citada (número o frase que aparece en ella).
- **[A]** = aproximado: estimado a partir de fotos, de otros modelos o de conocimiento general del área. Sirve para modelar, no para citar como dato.

Fecha de la investigación: noviembre de 2026.

---

## 1. Pisos y temperaturas (de arriba abajo)

El "candelabro" es el **inserto** de un refrigerador de dilución: una pila de discos (placas o "flanges") colgados unos de otros con varillas o tubos delgados. Cada disco está más frío que el de arriba. Todo va dentro de una "lata" de vacío y de una serie de blindajes cilíndricos que se quitan para las fotos (por eso en las fotos famosas se ve "desnudo").

### Tabla principal

| # | Piso (de arriba abajo) | Temperatura típica | Ejemplo medido (Bluefors XLD400, Krinner et al.) | Separación al piso de arriba (proxy) | Diámetro aproximado de la placa (clase XLD) |
|---|---|---|---|---|---|
| 0 | Placa superior (tapa de la lata, ambiente) | ~300 K (temperatura ambiente) | — | — | ~0,75–0,80 m **[A]** |
| 1 | Placa de 50 K | 35–60 K | **35 K [V]** | ~0,20 m **[V como largo de cable]** | ~0,62–0,66 m **[A]** |
| 2 | Placa de 4 K | 2,8–4,2 K | **2,85 K [V]** | ~0,29 m **[V como largo de cable]** | ~0,56 m **[A]** (la base del XLDsl‑4K mide 556 mm **[V]**) |
| 3 | Still (destilador) | 0,7–0,9 K | **882 mK [V]** | ~0,25 m **[V como largo de cable]** | ~0,52 m **[A]** |
| 4 | Placa fría (cold plate, CP) | ~50–100 mK | **82 mK [V]** | ~0,17 m (en ese equipo la ampliaron 60 mm **[V]**) | ~0,50 m **[A]** |
| 5 | Cámara de mezcla (MXC) | ~10–20 mK (mínimo ~6–10 mK) | **6 mK [V]**; Bluefors anuncia 10 mK de base **[V]** | ~0,14 m **[V como largo de cable]** | **0,50 m [V]** (XLD); 0,294 m en el modelo pequeño LD **[V]** |
| 6 | Espacio experimental bajo la MXC (donde cuelga el chip) | igual que la MXC | — | 0,44–0,63 m de alto **[V]** | cabe dentro del blindaje del still |

Notas sobre la tabla:
- Las **temperaturas y los largos de cable** vienen de Krinner et al., *Engineering cryogenic setups for 100-qubit scale superconducting circuit systems*, EPJ Quantum Technology (2019), que usa un Bluefors XLD400 modificado. La tabla 1 del artículo da el largo del cable coaxial entre pisos: 200, 290, 250, 170 y 140 mm. Los cables van casi en línea recta entre placas, así que esos largos son una buena **aproximación de la distancia vertical** entre pisos. Fuente: https://ar5iv.labs.arxiv.org/html/1806.07862 (también https://epjquantumtechnology.springeropen.com/track/pdf/10.1140/epjqt/s40507-019-0072-0).
- **Diámetro de la MXC:** Bluefors XLD = 500 mm **[V]**, https://bluefors.com/products/xld-dilution-refrigerator/. Bluefors LD = 294 mm **[V]**, https://bluefors.com/products/dilution-refrigerator-measurement-systems/. XLDsl‑4K (sin dilución): placa base de 556 mm **[V]**, https://bluefors.com/products/4k-systems/xldsl-4k-measurement-system/.
- **Alto del espacio experimental:** 625 mm en una configuración de prueba del XLD1000sl **[V]** (misma página de Bluefors). La Universidad de Sherbrooke lista un XLD400 con espacio de muestra de 52 cm × 44 cm **[V]**: https://www.usherbrooke.ca/iq/en/?p=28830.
- Bluefors **no publica** los diámetros de las placas de 50 K, 4 K, still y CP en su web: dice que cada sistema tiene su propio plano de instalación. Por eso esos valores son **[A]**. La regla visual sí es segura: **los discos se van achicando poco a poco hacia abajo** porque cada blindaje debe caber dentro del anterior.

### Por fabricante

| Equipo | Qué se sabe | Estado |
|---|---|---|
| **Bluefors XLD** (XLD400/450/1000) | MXC de 500 mm; 10 mK de base; >14–30 µW a 20 mK; tubo de pulso PT425‑RM | **[V]** Bluefors |
| **Bluefors LD** | MXC de 294 mm (el "candelabro" pequeño de laboratorio) | **[V]** Bluefors |
| **Oxford Instruments Proteox** (MX, LX) | Inserto secundario con 2 puertos ISO100 y hasta 37 coaxiales UT85 por puerto (hasta 128 por inserto en versión especial) | **[V]** folleto Proteox: https://nanoscience.oxinst.com/assets/uploads/TFD_Oxford_Instruments_The_Proteox_Family_2023_V7.pdf. Un listado comercial habla de "placa de MXC de 360 mm", sin decir el modelo **[A]**: https://www.directindustry.com/prod/oxford-instruments-nanoscience/product-180952-2272035.html |
| **IBM Quantum System One** | Candelabro dorado de varios pisos dentro de un criostato cilíndrico; el chip va en el piso de abajo a ~10–15 mK; enfriar toma ~48 h | **[V]** PopSci e IBM. La caja de vidrio de ~2,7 m de lado es **[A]** |
| **IBM Goldeneye** (prototipo) | 1,7 m³ de volumen experimental, ~6,7 t, ~25 mK, 10 placas (5 normales arriba y 5 invertidas abajo), lata que abre "como almeja" | **[V]** https://www.ibm.com/quantum/blog/goldeneye-cryogenic-concept-system |
| **IBM criostato modular** (base de System Two) | Celdas en forma de caja, de paneles de aluminio, ~2,75 m³ de vacío y ~0,53 m² de área de cableado por celda; dentro, el mismo candelabro dorado | **[V]** https://ibm.com/quantum/blog/modular-cryogenics |
| **Google Sycamore / Willow** | La BBC lo describe como una pila de discos del tamaño de un barril, que parece un candelabro dorado y lleva cientos de cables negros | **[V]** cita de prensa (vía https://www.aol.com/articles/inside-sub-zero-lair-worlds-000448380.html). Google no publica medidas ni marca del refrigerador. |

---

## 2. Qué hay en cada piso

Idea central para el artista: **las señales bajan por la izquierda (atenuadas) y suben por la derecha (amplificadas)**. Es una simplificación útil. En un equipo real los grupos se reparten alrededor del círculo, pero cada línea sí tiene su "lado de bajada" y su "lado de subida".

### Placa superior (300 K)
- Conectores herméticos (pasamuros SMA/SMP en bloques) por donde entran cientos de coaxiales desde afuera.
- Puertos de bombeo para la mezcla de helio‑3/helio‑4, sensores y cables de corriente continua en cintas o en "telar".
- Varios cilindros de acero que bajan: los tubos de bombeo.
- **Tubo de pulso** (cabeza fría): cilindro de acero inoxidable con dos etapas que baja hasta 50 K y 4 K. Las "piezas grandes de cobre que cuelgan" del piso de arriba, que menciona PopSci, son las conexiones térmicas flexibles (trenzas o láminas de cobre) entre el tubo de pulso y las placas **[V]**. El Bluefors XLD usa el modelo **PT425‑RM**, con motor remoto **[V]**.

### Placa de 50 K
- Primer anclaje térmico de los cables: aquí casi no hay atenuadores (0 dB en el ejemplo de Krinner) **[V]**.
- De esta placa cuelga el **blindaje de radiación de 50 K**: un cilindro de aluminio o cobre, a veces envuelto en mantas de superaislante plateado (MLI) **[A]**.
- Abrazaderas de los cables y bridas de la primera etapa del tubo de pulso.

### Placa de 4 K
- **Atenuadores** de 20 dB en las líneas de control (drive) y de 10 a 20 dB en las de flujo **[V]**. Visualmente son cilindritos dorados o plateados de ~2–3 cm entre dos conectores SMA, atornillados a un bloque de cobre **[A]**.
- **Amplificadores HEMT** en la línea de salida, uno por línea (por ejemplo LNF LNC4_8C, ~40 dB de ganancia) **[V]**. Son cajitas metálicas de unos 3 × 2 × 1 cm, doradas o de aluminio, con dos conectores SMA y cables de alimentación **[A]**.
- Filtros pasabajos y filtros Eccosorb (de absorbente negro) en las líneas de flujo **[V]**.
- Del 4 K cuelga el **blindaje de 4 K**, de cobre o aluminio.

### Still (~0,8 K)
- Aquí se evapora el helio‑3 de la mezcla. Hay una **cámara del still** (un cilindro de cobre) y un tubo de bombeo grande que sube.
- Anclajes de cables (en el ejemplo, 0 dB) **[V]**. En otras configuraciones se ponen atenuadores también aquí **[A]**.
- Comienzan los **intercambiadores de calor**: un tubo en espiral (continuo) y bloques sinterizados en escalera que bajan hacia la MXC **[A]**.
- Del still cuelga el **blindaje del still** (~1 K), el último cilindro, que envuelve todo lo de abajo.

### Placa fría (CP, ~80–100 mK)
- **Atenuadores** de 20 dB en las líneas de control **[V]**.
- **Circulador** en la línea de salida (por ejemplo Quinstar QCY‑060400CM00) **[V]**. Es una cajita metálica de ~2–3 cm con **tres conectores**, a menudo con una etiqueta o un imán visible **[A]**.
- Intercambiadores de calor en escalera.

### Cámara de mezcla (MXC, ~10 mK)
- La **cámara de mezcla** propiamente dicha es un recipiente cilíndrico de cobre **centrado en la placa** **[V]** (Krinner: "dilution unit centered on the MXC plate").
- Últimos **atenuadores** (20 dB, para sumar unos 60 dB en total) **[V]**.
- **Aisladores** en bloque (por ejemplo Quinstar QCC, cuatro canales cada uno), uno antes y otro después del amplificador paramétrico **[V]**.
- **Amplificador paramétrico TWPA** (o JPA) como primer amplificador, con 20–30 dB de ganancia **[V]**, montado sobre láminas de cobre de 2 mm **[V]**. Es una cajita o un "sándwich" de cobre dorado de unos 3–5 cm, a veces dentro de su propio blindaje magnético **[A]**.
- Filtros pasabanda reflectivos y filtros infrarrojos **[V/A]**.
- Termómetros (pastillas de óxido de rutenio) y calentadores.
- Debajo cuelga la **varilla fría** ("cold finger") con el chip.

### La "lata" de vacío (OVC)
- Es el cilindro exterior de acero inoxidable o aluminio que cierra todo. Se ve como el "barril" plateado o blanco que cuelga del marco **[A]**.
- Dentro, de afuera hacia adentro: blindaje de 50 K, blindaje de 4 K y blindaje del still: tres cilindros concéntricos, cada uno más corto y angosto **[A]**.
- En IBM Goldeneye la lata se abre de lado, como una almeja **[V]**.

### Por qué los cables semirrígidos se ven en espiral o en "U"
- Al enfriarse, el metal **se contrae** (cerca de 0,2–0,3 % del largo entre 300 K y 4 K) y las placas se mueven un poco entre sí. Un cable recto y tenso arrancaría sus conectores. Por eso se le dan **curvas en "U", en "S" o espirales** que funcionan como resortes **[V]**.
  - Krinner: los dobleces reducen la tensión sobre los conectores al enfriar; radio de curvatura de **~1 cm** **[V]**.
  - Guía práctica de RF: radio mínimo de ~5 veces el diámetro exterior del cable **[V, fuente informal]**: https://rfessentials.com/rf-knowledge-base/how-do-i-route-microwave-signals-through-a-dilution-refrigerator-with-minimal-he/
  - Bluefors, cableado coaxial (con "bobinas" de termalización): https://bluefors.com/products/measurement-infrastructure/coaxial-wiring/
- Visualmente: cada cable baja recto un tramo, hace un **codo en "U" o un medio rizo** justo antes de cada placa y se conecta a un atenuador o a un pasamuros. Con cientos de cables, esto forma la "cortina" o "barba" de cables plateados y dorados.

### Cables de corriente continua
- Hilos de cobre, bronce fosforado y NbTi en pares trenzados, en **cintas planas** o "telares" **[V]**. Se ven como cintas finas de color marrón, beige o cobre que suben en zigzag.

---

## 3. Materiales y aspecto

| Pieza | Material real | Aspecto en fotos | Estado |
|---|---|---|---|
| Placas (discos) | Cobre libre de oxígeno (OFHC), **bañado en oro** | Dorado cálido, con brillo semimate; muchos agujeros y tornillos | Oro: **[V]** (todas las fuentes hablan de "gold"); OFHC: **[A]** |
| Varillas y tubos de soporte entre placas | Acero inoxidable o fibra de vidrio (G10), poco conductores del calor | Varillas plateadas delgadas o tubos color crema o verdoso | **[A]** |
| Cables coaxiales de control | Acero inoxidable (UT85‑SS‑SS), CuNi | **Plateado mate**, de 2,2 mm de diámetro | **[V]** material; diámetro UT85 = 0,085" ≈ 2,2 mm **[A]** |
| Cables coaxiales de salida (4 K → MXC) | **NbTi** superconductor | Gris oscuro o plateado opaco | **[V]** |
| Atenuadores, circuladores, aisladores | Cajas de latón dorado o aluminio, conectores SMA dorados | Pequeños bloques dorados o plateados, con etiquetas blancas | **[A]** |
| HEMT | Caja de aluminio o latón dorado | Bloque metálico con conector de alimentación | **[A]** |
| Blindajes térmicos | Aluminio o cobre; a veces con superaislante (MLI) | Cilindros plateados o color cobre; el MLI se ve como papel aluminio arrugado | **[A]** |
| Blindaje magnético | Cryoperm o mu‑metal (y a veces una capa superconductora de aluminio o plomo) | Lata gris mate, a veces pintada de negro o azul por dentro | **[A]** |
| Lata exterior (OVC) | Acero inoxidable o aluminio | Plateado o pintado de blanco | **[A]** |
| Cables de control fuera del criostato (Google) | — | **Negros**, "cientos" | **[V]** (BBC vía AOL) |

**¿Por qué se ve "dorado y complejo"?**
1. **El oro:** el cobre se oxida y el óxido empeora el contacto térmico entre piezas atornilladas. Un baño delgado de oro lo evita y además refleja la radiación de calor. Una fuente de divulgación dice que el oro "conduce bien el calor y reparte el frío en cada piso" **[A, divulgación]**: https://www.scienceabc.com/innovation/quantum-computer-colder-than-space
2. **La repetición:** cientos de cables iguales, cada uno con su atenuador en cada piso, forman patrones radiales. Esa repetición ordenada es lo que da la sensación de "relojería" o "pastel de bodas steampunk al revés" **[V]** (PopSci).
3. **El contraste:** placas doradas, cables plateados, cintas cobrizas, tornillería de acero y alguna etiqueta blanca. **No es todo dorado.**
4. **La forma de campana:** discos que se achican hacia abajo, con cables que convergen hacia el centro.

---

## 4. Dónde va el chip

### Montaje típico de un procesador superconductor
- El chip (de unos 1–2 cm de lado; IBM lo describe "no más grande que una moneda de 25 centavos" **[V]**, PopSci) se pega y se conecta con **microsoldadura de hilo** (wire bonds) a una **placa de circuito** dentro de un **portamuestras de cobre dorado** o de aluminio: una caja con tapa y decenas de conectores SMP alrededor **[A]**.
- El portamuestras va atornillado a la **varilla fría** ("cold finger"), una barra de cobre dorado que cuelga bajo la MXC, entre 10 y 40 cm por debajo **[A]**.
- Alrededor van **una o dos latas de blindaje magnético** (Cryoperm o mu‑metal, a veces con una lata superconductora interior), cilíndricas, de ~8–15 cm de diámetro y 15–30 cm de alto **[A]**. **En las fotos el chip casi nunca se ve**: lo que se ve es un cilindro gris o dorado con cables que entran por arriba.
- Microsoft usa la palabra **"puck"** ("disco"): el dispositivo cuántico se mete en un "puck" que luego se enfría a milikelvin en el refrigerador de dilución **[V]**: https://news.microsoft.com/?p=374170 (2017). Los Proteox de Oxford y los Bluefors también ofrecen "pucks" de carga inferior (bottom loading) **[V]**: https://nanoscience.oxinst.com/campaigns/accessories/sample-loading-pucks

### Microsoft Majorana 1: ¿usa refrigerador de dilución? **Sí, confirmado públicamente.**
- Microsoft (febrero de 2025): el chip "existe en un ecosistema con lógica de control y un **refrigerador de dilución** que mantiene los qubits a temperaturas mucho más frías que el espacio exterior" **[V]**: https://news.microsoft.com/source/features/ai/microsofts-majorana-1-chip-carves-new-path-for-quantum-computing/
- El blog de Azure dice que el procesador funciona "enfriado cerca del cero absoluto y ajustado con campos magnéticos" y que tiene un blindaje que lo envuelve **[V]**: https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-topological-qubits/
- Artículo técnico de Microsoft Quantum (2022–2024): "la temperatura base de nuestros refrigeradores de dilución durante estas mediciones es de **20 mK**"; temperatura de electrones de ≲40 mK **[V]**: https://arxiv.org/abs/2207.02472
- Artículo de 2025 sobre el tetrón: usa un **imán vectorial** (campo en el plano de **2,3 T**), un **JTWPA** como primer amplificador y resonadores de lectura por reflectometría **[V]**: https://arxiv.org/html/2507.08795
- **Diferencia visual clave con IBM o Google:** los qubits topológicos necesitan un **campo magnético fuerte**. Por eso, bajo la MXC, el chip va dentro de un **imán superconductor** (un cilindro grueso de varios decímetros, bobinado con NbTi y anclado a 4 K) en vez de un blindaje magnético **[A, inferido del uso de un imán vectorial de 2,3 T]**. Un imán vectorial suele verse como un cilindro con bobinas o "anillos" laterales **[A]**.
- **No hay foto pública** del Majorana 1 montado en su criostato. La foto oficial muestra el chip en la mano y, en otra, el chip con "equipo de latón" de fondo **[V]** (texto alternativo de Microsoft). El empaque visible es un cuadrado con borde dorado y el chip en el centro **[A, por las fotos oficiales]**.

**Cómo se vería en la escena (propuesta para la presentación):** bajo la MXC, la varilla fría baja hasta un cilindro (el imán o el blindaje). Se hace un **corte** o se pone el cilindro **semitransparente** y dentro se ve el portamuestras dorado, abierto, con el chip cuadrado Majorana en el centro y una corona de hilos de microsoldadura. Es una licencia didáctica: en la realidad todo va cerrado.

---

## 5. Referencias visuales (no se descargaron imágenes)

Las descripciones combinan los pies de foto verificados con lo que se ve típicamente en esas imágenes. Revísalas tú antes de usarlas como referencia de detalle.

1. **PopSci, "In photos: Journey to the center of a quantum computer" (IBM)**: https://www.popsci.com/technology/in-photos-journey-to-the-center-of-a-quantum-computer/
   Fotos de Charlotte Hu e IBM con estos pies: "The dilution refrigerator" (candelabro completo sin blindajes), "The quantum processor inside the chandelier" (piso inferior con el chip), "Putting the shields on the plates" (técnicos poniendo los blindajes), "The container that holds the dilution refrigerator" (la lata exterior) y "The top layer of the chandelier" (placa superior con trenzas de cobre que bajan). **La mejor referencia piso por piso.**
2. **IBM, criostatos modulares**: https://ibm.com/quantum/blog/modular-cryogenics
   Foto de System One en su cilindro (Fraunhofer), foto del interior de una celda modular con el candelabro dorado de varios pisos y el procesador abajo, y dos celdas prototipo conectadas (Poughkeepsie).
3. **IBM Goldeneye**: https://www.ibm.com/quantum/blog/goldeneye-cryogenic-concept-system
   Criostato gigante con forma de barril, lata que se abre de lado y 10 placas (5 normales y 5 invertidas). Útil para la escala y el marco.
4. **Wikimedia Commons, "IBM Quantum System One.jpg"** (CC BY 4.0, Onri Jay Benally, 2024): https://commons.wikimedia.org/wiki/File:IBM_Quantum_System_One.jpg
   El System One en el Watson Research Center: el cilindro negro y brillante dentro de la caja de vidrio. Sirve para el aspecto exterior.
5. **Wikimedia Commons, "Dilution Refrigerator (39016294284).jpg"** (CC BY 2.0, UCL / London Centre for Nanotechnology, 2016): https://commons.wikimedia.org/wiki/File:Dilution_Refrigerator_(39016294284).jpg
   Interior de un refrigerador de dilución de laboratorio, en vertical y en alta resolución. Buena referencia de un candelabro "real de laboratorio", menos pulido que los de prensa.
6. **Bluefors XLD**: https://bluefors.com/products/xld-dilution-refrigerator/
   Fotos de producto del XLD (marco, lata, inserto) y la ficha técnica con el diámetro de la MXC (500 mm). Bluefors también tiene una página de cableado coaxial con fotos de los manojos de semirrígidos: https://bluefors.com/products/measurement-infrastructure/coaxial-wiring/
7. **Microsoft, Majorana 1**: https://news.microsoft.com/source/features/ai/microsofts-majorana-1-chip-carves-new-path-for-quantum-computing/
   Primer plano del chip en la mano y del chip con "equipo de latón" de fondo (fotos de John Brecher). **Referencia del chip, no del criostato.**
8. **Princeton, "Dilution Refrigerator" (EurekAlert)**: https://www.eurekalert.org/multimedia/889342
   Refrigerador de dilución de un laboratorio de qubits de espín (crédito Brian Wilson, Princeton).
9. **Google Quantum AI (prensa)**: https://semafor.com/article/01/03/2025/googles-quantum-breakthrough-leads-to-next-challenge-bringing-costs-down
   Foto de Reuters/Google de un criostato en el laboratorio de Santa Bárbara. Según la BBC: discos redondos apilados, dorados, con cientos de cables negros.
10. **Wikimedia Commons, esquema "Cold part of dilution refrigerator.jpg"** (CC BY-SA 3.0): https://commons.wikimedia.org/wiki/File:Cold_part_of_dilution_refrigerator.jpg
    **Diagrama**, no foto: still, intercambiadores y cámara de mezcla. Sirve para ubicar las piezas internas.

---

## 6. Guía para modelar

Unidades en **metros**. Escala sugerida: **inserto clase XLD**, con la MXC de 0,50 m. Origen: la cara inferior de la placa superior está en z = 0 y el candelabro cuelga hacia z negativo.

### 6.1 Esqueleto (alturas y discos)

| Pieza | z (cara superior) | Diámetro | Grosor | Material Blender | Detalle |
|---|---|---|---|---|---|
| Placa superior 300 K | 0,000 | 0,78 | 0,025 | Acero inoxidable cepillado (o aluminio) | Medio: anillo de pasamuros, puertos y pernos |
| Placa 50 K | −0,22 | 0,64 | 0,012 | Oro sobre cobre (ver 6.4) | Alto: patrón de agujeros y abrazaderas |
| Placa 4 K | −0,52 | 0,56 | 0,012 | Oro | **Muy alto**: atenuadores y HEMT |
| Still | −0,78 | 0,52 | 0,010 | Oro | Alto: cámara del still y tubo de bombeo |
| Placa fría (CP) | −0,97 | 0,50 | 0,010 | Oro | Alto: atenuadores y circuladores |
| MXC | −1,12 | 0,50 | 0,012 | Oro | **Muy alto**: aisladores, TWPA y cámara de mezcla |
| Varilla fría | −1,13 a −1,45 | 0,04–0,06 (barra) | — | Oro | Medio |
| Portamuestras / chip | ≈ −1,45 | 0,08 × 0,08 × 0,02 | — | Oro + PCB verde oscuro | **Muy alto** (es el "héroe" de la escena) |

Separaciones: 0,22 / 0,30 / 0,26 / 0,19 / 0,15 m **[A, basado en Krinner]**. Si quieres un look más "candelabro de prensa", **estira un 10–20 %** los dos tramos de arriba: en las fotos de IBM los pisos superiores se ven más altos.

**Soportes entre placas:** 6 a 8 varillas por tramo en círculo, cerca del borde (radio = 0,9 × el radio de la placa). Diámetro de 0,008–0,012 m, en acero (plateado) o G10 (crema translúcido). **Bajo nivel de detalle** (cilindros simples con una tuerca en cada punta).

### 6.2 Piezas por piso

**Placa superior (300 K)**
- 4–6 bloques de pasamuros (cajas de 0,10 × 0,04 × 0,03 m) con 20–30 conectores SMA cada uno (cilindros de 0,006 m, dorados). Detalle **medio** (usar instancias).
- Tubo de pulso: cilindro de acero de 0,10 m de diámetro que baja hasta 50 K, luego uno de 0,06 m hasta 4 K, con bridas en cada etapa. Detalle **medio**.
- 3–4 **trenzas de cobre** del tubo de pulso a las placas de 50 K y 4 K: curvas aplanadas de 0,04 × 0,005 m, con material cobre sin oro (más rojizo). Detalle **medio**. Dan mucho realismo.
- Tubos de bombeo: 1 de 0,08 m y 2 de 0,02 m de diámetro, de acero, bajando hasta el still.

**50 K**
- Pocas piezas: abrazaderas de cables (barras de 0,05 × 0,01 × 0,01 m), bridas del tubo de pulso y pasamuros de cables. Detalle **medio**.

**4 K**
- **Atenuadores:** cilindros de 0,025 m de largo y 0,008 m de diámetro, dorados, con conector en cada punta. Uno por línea de control, en **filas sobre bloques de cobre** de 0,12 × 0,03 × 0,01 m. Detalle **alto, con instancias** (pon 24–48).
- **HEMT:** cajas de 0,035 × 0,025 × 0,012 m, doradas o de aluminio, una por línea de salida (4–8). Detalle **alto**.
- Filtros: cilindros negros (Eccosorb) de 0,03 × 0,01 m en algunas líneas.

**Still**
- Cámara del still: cilindro de cobre de 0,08 m de diámetro y 0,06 m de alto, centrado y colgando de la placa.
- Intercambiador continuo: **espiral** de tubo de 0,004 m de diámetro, de 0,06 m de diámetro y 0,15 m de alto, entre el still y la MXC. Detalle **medio** (curva con bevel).
- Atenuadores opcionales (mismo modelo que en 4 K).

**Placa fría**
- Atenuadores (segunda fila, otra vez instancias).
- **Circuladores:** cajas de 0,025 × 0,025 × 0,012 m con 3 conectores y una etiqueta blanca, uno por línea de salida.
- Intercambiadores en escalera: 3–4 bloques de cobre de 0,03 × 0,03 × 0,02 m conectados por tubitos.

**MXC**
- **Cámara de mezcla:** cilindro de cobre dorado de 0,06–0,08 m de diámetro y 0,06 m de alto, centrado bajo la placa. Detalle **alto**.
- Atenuadores (tercera fila).
- **Aisladores en bloque:** 2 bloques de 0,06 × 0,03 × 0,015 m, cada uno con 4 + 4 conectores.
- **TWPA/JPA:** caja de 0,05 × 0,03 × 0,01 m sobre una lámina de cobre de 0,002 m. Detalle **alto**.
- Termómetro: pastilla de 0,01 m con dos hilos.

**Bajo la MXC (chip)**
- Varilla fría: barra dorada de 0,05 m de diámetro y 0,30 m de largo.
- **Versión IBM/Google:** lata de blindaje magnético, cilindro gris mate de 0,12 m de diámetro y 0,25 m de alto, con 8–16 coaxiales entrando por arriba. Para la vista didáctica, haz un corte de 90° o ponlo semitransparente.
- **Versión Majorana:** cilindro de imán superconductor de 0,20–0,25 m de diámetro y 0,25 m de alto, con un acabado de bobina (bandas) y bridas. Dentro, el portamuestras dorado con el chip Majorana cuadrado en el centro y una corona de wire bonds (curvas de 0,0005 m). Detalle **muy alto** en el chip, **medio** en el imán.

### 6.3 Cableado (lo que más se ve)
- **Coaxiales semirrígidos:** curvas con bevel de **0,0011 m de radio** (UT85 ≈ 2,2 mm de diámetro). Para que se lean bien en un render a distancia, **sube a 0,002–0,003 m de radio**: es una exageración visual recomendada.
- **Cantidad:** 48–96 líneas bastan para dar la sensación de "cientos". Reparte en 6 grupos radiales.
- **Forma:** en cada tramo entre placas, recto vertical con una **"U" o medio rizo de 0,01–0,02 m de radio** justo antes de la placa siguiente. Algunos grupos llevan **espirales de 2–3 vueltas** (radio de 0,01 m). Usa un perfil de curva repetido con modificador Array + Curve, o Geometry Nodes.
- **Material:** 70 % acero plateado mate (control). Desde 4 K hacia abajo, las líneas de salida en gris oscuro (NbTi). Conectores SMA dorados en cada unión.
- **Cables de corriente continua:** 2–4 cintas planas de 0,01 × 0,0005 m, color cobre o beige, subiendo en zigzag pegadas a los soportes. Detalle **bajo**.

### 6.4 Materiales (Principled BSDF, valores de partida)
- **Oro sobre cobre (placas):** Base color ≈ (1,00; 0,77; 0,34), Metallic 1, Roughness 0,25–0,35. Añade una ligera textura de **ruido o anisotropía** (marcas de mecanizado concéntricas) para que no parezca plástico.
- **Cobre sin oro (trenzas, láminas):** (0,95; 0,55; 0,40), Metallic 1, Roughness 0,35.
- **Acero inoxidable (cables, varillas, tubo de pulso):** (0,75; 0,75; 0,76), Metallic 1, Roughness 0,30–0,45.
- **NbTi:** (0,45; 0,46; 0,48), Metallic 1, Roughness 0,5.
- **G10:** (0,80; 0,78; 0,60), Metallic 0, Roughness 0,5, algo de Transmission.
- **Blindaje magnético:** gris (0,35; 0,36; 0,38), Metallic 0,6, Roughness 0,6.
- **Etiquetas:** blanco mate, pequeñas: rompen la monotonía del dorado y dan escala.

### 6.5 Prioridad de detalle (si falta tiempo)
1. Discos dorados con borde biselado y agujeros (alto impacto, bajo costo).
2. Cortina de coaxiales con sus "U" (lo que hace que "se vea real").
3. Filas de atenuadores en 4 K, CP y MXC (instancias).
4. Chip y portamuestras (héroe).
5. Trenzas de cobre y tubo de pulso arriba.
6. Intercambiadores, termómetros y cintas de corriente continua (relleno fino).

### 6.6 Iluminación sugerida
Fondo oscuro, una luz principal cálida en diagonal y una luz de contorno fría detrás, para separar el dorado del fondo. Así se ven las fotos de prensa de IBM y Google.

---

## Fuentes principales
- Krinner et al., EPJ Quantum Technology 6, 2 (2019): https://ar5iv.labs.arxiv.org/html/1806.07862
- Bluefors XLD: https://bluefors.com/products/xld-dilution-refrigerator/
- Bluefors, comparativa de sistemas: https://bluefors.com/products/dilution-refrigerator-measurement-systems/
- Bluefors XLDsl‑4K: https://bluefors.com/products/4k-systems/xldsl-4k-measurement-system/
- Bluefors, cableado coaxial: https://bluefors.com/products/measurement-infrastructure/coaxial-wiring/
- Oxford Instruments, familia Proteox: https://nanoscience.oxinst.com/assets/uploads/TFD_Oxford_Instruments_The_Proteox_Family_2023_V7.pdf
- PopSci (IBM): https://www.popsci.com/technology/in-photos-journey-to-the-center-of-a-quantum-computer/
- IBM Goldeneye: https://www.ibm.com/quantum/blog/goldeneye-cryogenic-concept-system
- IBM, criostatos modulares: https://ibm.com/quantum/blog/modular-cryogenics
- Microsoft, Majorana 1 (Source): https://news.microsoft.com/source/features/ai/microsofts-majorana-1-chip-carves-new-path-for-quantum-computing/
- Microsoft, blog de Azure Quantum: https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-topological-qubits/
- Microsoft, 2017 ("puck"): https://news.microsoft.com/?p=374170
- Microsoft Quantum, protocolo de brecha topológica (20 mK): https://arxiv.org/abs/2207.02472
- Microsoft Quantum, tetrón 2025 (imán vectorial, JTWPA): https://arxiv.org/html/2507.08795
- Google, laboratorio (descripción de la BBC vía AOL): https://www.aol.com/articles/inside-sub-zero-lair-worlds-000448380.html
- Guía de cableado de RF (fuente informal): https://rfessentials.com/rf-knowledge-base/how-do-i-route-microwave-signals-through-a-dilution-refrigerator-with-minimal-he/

# Computación Cuántica — presentación interactiva

Presentación web para una exposición de 10 minutos (con anexo para preguntas): **de los bits a los qubits, la física detrás y el chip Majorana de Microsoft**.

El diseño cuenta la historia con dos estilos: lo clásico (computación, bits, historia) se ve como un **periódico**; al llegar a la física cuántica, el papel se descompone en píxeles y todo pasa a un **HUD futurista**.

## Cómo abrirla
Abre `web/index.html` en el navegador (Chrome o Edge). No necesita internet ni instalar nada, salvo para ver los videos de YouTube.

| Tecla | Acción |
|---|---|
| → / Espacio | Siguiente |
| ← | Anterior |
| F | Pantalla completa |
| N | Notas del expositor |
| Esc / I | Índice |

## Qué tiene
- **Recorrido de 10 minutos: 17 láminas** en 7 bloques (apertura, bits, física cuántica, qubits, historia, Majorana y cierre). → / Espacio solo recorren estas.
- **Anexo para preguntas: 23 láminas** más (computación, compuertas, cuantización, interferencia, decoherencia, tipos de qubits, partículas de Majorana, videos, 2029, preguntas frecuentes, glosario, fuentes…). Se abren desde el índice (Esc o ☰); «↩ Recorrido» en la barra vuelve a la exposición.
- Enlaces: `#7` = lámina 7 del recorrido; `#anexo-glosario` = lámina del anexo.
- Animaciones interactivas en canvas: doble rendija, interferencia, moneda que colapsa, entrelazamiento, decoherencia, esfera de Bloch, crecimiento 2ⁿ, línea de tiempo 1900→2026, chips Majorana con inclinación 3D.
- Respeta `prefers-reduced-motion`.

## Estructura
```
web/        La presentación (index.html, css/, js/, img/)
docs/       Plan de trabajo y bitácora
materiales/ Documento de apoyo (.docx) y su texto
```

Las fotos de los chips Majorana 1 y 2 son de Microsoft y se usan con fines educativos.

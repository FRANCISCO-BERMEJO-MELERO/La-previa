---
author: FRANCISCO-BERMEJO-MELERO
branch: docs/readme
status: done
---

# README de la primera versión

## Intención

Fran pide, para cerrar la primera versión, un README completo con imágenes, ilustraciones y explicaciones.

## Alcance

- `README.md` reescrito: qué es, recorrido de una noche, la sala, una ficha por juego con capturas, robustez en una fiesta, arquitectura, secreto, pruebas, arranque en local, scripts, estructura y documentación.
- `docs/img/`: 22 capturas PNG a 390 px (escala 2) y 4 ilustraciones SVG con los colores de Verbena (portada, recorrido, arquitectura y secreto).
- Fuera: código de la aplicación, pruebas y el resto de documentos.

## Lista

- [x] Capturas de partidas reales — prueba: un spec temporal de Playwright juega cada juego en local y guarda las pantallas; se borra al terminar
- [x] Ilustraciones — prueba: cada SVG renderizado con Chrome y revisado a ojo, sin solapes
- [x] README — prueba: cada dato contrastado con `docs/` y `src/lib/copy.ts`; Prettier aplicado
- [x] TAREAS — prueba: D.5 marcada

## Evidencia

- 2026-10-15: el spec temporal pasó 7 de 7 contra Supabase local; las capturas no muestran el indicador de desarrollo de Next.
- Renderizado de los SVG en Chrome tras corregir tres solapes (texto de la portada, foto de Marta, flecha de Realtime).
- Cifras del README sacadas de los documentos: 300 palabras en 15 temáticas, 230 preguntas, 120 dilemas, 150 tarjetas, reparto recomendado de `composition.ts`.

## Siguiente

Pull request de `docs/readme` a `develop` cuando Fran lo pida.

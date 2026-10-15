---
author: FRANCISCO-BERMEJO-MELERO
branch: feat/avatares-imagen
status: done
---

# Avatares con imagen

## Intención

Fran pide usar en la app los 11 avatares de `public/avatars/` en lugar de los 12 dibujados con formas.

## Alcance

- La galería pasa a los 11 avatares nuevos, con identificadores en inglés que apuntan a su archivo: `olive`, `churro`, `croquette`, `dice`, `watermelon`, `lemon`, `omelette`, `popcorn`, `lantern`, `flip_flop` y `moon`.
- Migración nueva: los jugadores con un avatar antiguo vuelven a su inicial y la base de datos solo acepta los nuevos.
- `Avatar` pinta la imagen; `avatar-art.tsx` desaparece.
- Fuera: el aspecto de la inicial, el selector (salvo sus opciones) y el resto de pantallas.

## Lista

- [x] Migración y pruebas pgTAP — prueba: `npm run test:db` tras `supabase db reset`
- [x] Cliente y tests unitarios — prueba: `npm run check`
- [x] E2E — prueba: `npm run test:e2e`
- [x] Documentación — prueba: DECISIONES, TAREAS y README actualizados

## Evidencia

- 2026-10-15, partiendo de `supabase db reset`: `npm run test:db` 1161 pruebas pgTAP, con el rechazo de un avatar de la galería antigua; `npm run check` 745 tests sin avisos.
- `npm run test:e2e`: 29 de 32 a la primera. Las 3 que fallaron eran el repaso 26.1, que pulsaba el avatar «Nube enfadada», ya inexistente. Corregido, `accessibility-mejoras.spec.ts` pasa entero a 360, 390 y 430 px; el resto de la batería no cambia.
- Captura a 390 px de la pantalla de nombre: las 11 imágenes cargan (ninguna con `naturalWidth` 0) y el selector las enseña con la elegida marcada.

## Siguiente

Desplegar: migración en producción antes de fusionar en `main`.

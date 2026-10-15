---
author: FRANCISCO-BERMEJO-MELERO
branch: feat/el-lobo-y-sala
status: done
---

# El lobo y cambiar de juego en la sala

## Intención

Peticiones de Fran tras probar Luna llena: que se pueda jugar con menos gente, que se llame "El lobo" y salga el primero, y que el anfitrión pueda cambiar de juego desde la sala de espera con una píldora que se entienda como botón.

## Alcance

- Mínimo de 4 jugadores para el juego del lobo, en el cliente y en la base de datos (migración nueva).
- Nombre visible "El lobo" en lugar de "Luna llena". El identificador interno `luna_llena` no cambia.
- El lobo, primero en el selector de juegos.
- En la sala de espera, el anfitrión pulsa la píldora del juego para abrir el selector. La píldora parece un botón; para el resto de jugadores sigue siendo informativa.
- Fuera: las reglas del juego, el reparto recomendado y el resto de pantallas.

## Lista

- [x] Mínimo de 4 en la base de datos y pruebas pgTAP — prueba: `npm run test:db` tras `supabase db reset`
- [x] Mínimo de 4, nombre y orden en el cliente con sus tests — prueba: `npm run check`
- [x] Píldora botón que abre el selector desde la sala — prueba: `npm run check`
- [x] E2E al día — prueba: `npm run test:e2e`
- [x] Documentación — prueba: DECISIONES y TAREAS actualizados

## Evidencia

- 2026-10-15, partiendo de `supabase db reset`: `npm run test:db` 1160 pruebas pgTAP; `npm run check` 745 tests sin avisos; `npm run test:e2e` 32 pruebas, con la nueva `change-game.spec.ts` (cambio de juego desde la píldora, píldora de 44 px y partida con 4).
- En la primera tanda e2e, la 6.5 de secreto de El impostor superó los 120 s; sola pasó en 9 s y la tanda completa repetida pasó entera. No toca nada de este cambio.

## Siguiente

Que Fran lo pruebe en el móvil: cambiar de juego desde la sala y una partida del lobo con 4.

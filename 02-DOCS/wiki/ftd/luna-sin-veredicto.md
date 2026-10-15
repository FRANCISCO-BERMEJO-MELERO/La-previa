---
author: FRANCISCO-BERMEJO-MELERO
branch: feat/luna-llena
status: done
---

# Luna llena sin veredicto

## Intención

Quitar la segunda votación del juicio (condenar o salvar), que Fran considera redundante. El más votado en la acusación tiene sus últimas palabras en la defensa y, al continuar, el narrador lo ahorca.

## Alcance

- Base de datos (migración nueva): sin fase `verdict`, sin `luna_llena_verdict`, sin votos de veredicto. Continuar desde la defensa con acusado lo ahorca; sin acusado, cae la noche. La ejecución enseña los votos de la acusación.
- Cliente: sin pantallas de veredicto, guion y textos ajustados, la ejecución enseña quién votó a quién.
- Pruebas pgTAP, unitarias y e2e ajustadas; `docs/DECISIONES.md` e `docs/INFORME.md` al día.
- Fuera: nada más del juego cambia. El voto del alcalde sigue valiendo doble al acusar.

## Lista

- [x] Migración y pruebas pgTAP — prueba: `npm run test:db` tras `supabase db reset`
- [x] Cliente y pruebas unitarias — prueba: `npm run check`
- [x] E2E — prueba: `npm run test:e2e`
- [x] Documentación — prueba: DECISIONES, INFORME y TAREAS actualizados

## Evidencia

- 2026-10-12, partiendo de `supabase db reset`: `npm run check` 741 tests sin avisos; `npm run test:db` 1159 pruebas pgTAP; `npm run test:e2e` 31 pruebas.
- El repaso de anchos con 16 jugadores pasó tres veces seguidas tras el cambio.

## Siguiente

Nada pendiente. Falta que Fran pruebe el juicio en una partida real.

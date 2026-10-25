---
author: FRANCISCO-BERMEJO-MELERO
branch: feat/lobo-bruja-asesino
status: in-progress
---

# El lobo: configuración libre, bruja y asesino en serie

## Intención

Issue #13. El anfitrión configura los roles con libertad y recibe avisos de equilibrio que no bloquean. Llegan la bruja (dos pociones de un solo uso) y el asesino en serie (gana si queda solo). Especificación aprobada y fases en `docs/PLAN-6.md`; tareas 33–36 en `docs/TAREAS.md`.

## Alcance

- Composición libre con validación de integridad en cliente y servidor, avisos de equilibrio y botón «Usar la recomendada».
- Bruja y asesino: estado, acciones, resolución de la noche, victoria, privacidad, cartas, pantallas y «Cómo se juega».
- Fuera: otros roles, habilidades o inmunidades no acordadas, y cambios en otros juegos.

## Lista

- [x] 33.1 Composición libre en la base de datos — prueba: `npm run test:db` tras `supabase db reset`
- [x] 33.2 Composición libre en el cliente — prueba: `npm run check`
- [x] 34.1–34.2 Bruja y asesino en el servidor — prueba: `npm run test:db`
- [x] 35.1–35.4 Bruja y asesino en el cliente — prueba: `npm run check`
- [ ] 36.1–36.3 E2E, repaso móvil y accesibilidad, documentación — prueba: `npm run test:e2e` y `npm run build`

## Evidencia

- Antes de empezar: `npm run check` 745 unitarios en verde; `npm run test:db` 1161 pgTAP en verde.
- 33.1: `npm run test:db` 1180 pgTAP en verde tras `supabase db reset`.
- 33.2: `npm run check` 753 unitarios en verde; `npm run test:e2e` 32 en verde (la 31.7 de secreto, adaptada).
- 34: `npm run test:db` 1288 pgTAP en verde tras `supabase db reset` (52 y 53 nuevas; la 53 comprueba que su detector de fugas salta con la foto de la bruja).
- 35: `npm run check` 781 unitarios en verde; `npm run test:e2e` 32 en verde contra la base con bruja y asesino.

## Siguiente

Fase 36: e2e nuevas, repaso móvil y accesibilidad, documentación.

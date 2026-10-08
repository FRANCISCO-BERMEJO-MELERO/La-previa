# Informe final

Estado de La Previa al cerrar el plan (`docs/PLAN.md`), el 9 de octubre de 2026.

## Resumen

La primera versión está completa: salas y El impostor, de crear la sala a volver a jugar, con todas las pantallas de la referencia y las variantes que no estaban dibujadas. Todas las fases del plan (0 a 7) están cerradas y todas sus tareas marcadas en `docs/TAREAS.md`.

Verificación al cerrar, todo partiendo de cero:

| Comprobación                               | Resultado                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `npm run check` (lint, tipos, unitarios)   | 340 tests, sin avisos                                                  |
| `npm run test:db` tras `supabase db reset` | 291 pruebas pgTAP en 10 archivos                                       |
| `npm run test:e2e`                         | 8 pruebas; la batería de la fase 6 pasó tres veces seguidas sin fallos |
| `npm run build`                            | Sin avisos                                                             |

No se ha publicado nada: ni push (no hay remoto `origin`), ni Supabase ni Vercel. Eso lo haces tú con `docs/DESPLIEGUE.md`.

## Qué está hecho

- **Base de datos** (9 migraciones): esquema con RLS en todas las tablas, una sola política (leer tu propia sala, para Realtime), funciones RPC con las comprobaciones de `CLAUDE.md`, reglas completas de El impostor, abandono y expulsión en las cuatro fases y 200 palabras.
- **Secreto**: la foto del estado solo lleva lo que cada jugador puede ver. Probado en pgTAP recorriendo la foto entera en cada fase y en Playwright inspeccionando toda la red y el almacenamiento del navegador. Ambas pruebas se validaron filtrando la palabra a propósito: fallan.
- **Sincronización** pensada para fiestas: Realtime, sondeo cada 10 s, reintentos rápidos tras un corte, vuelta a primer plano, aviso de sin conexión sin bloquear la pantalla, reconexión sin volver a pedir el nombre y pantalla siempre encendida.
- **Interfaz**: las 14 pantallas, el sistema Verbena como tokens de Tailwind, todos los textos en un módulo, y sin desbordes a 360, 390 y 430 px. Las 200 palabras caben sin partirse en esos tres anchos (tamaño medido en el navegador, no estimado).
- **Accesibilidad**: encabezado por pantalla, foco visible, uso completo con teclado, objetivos táctiles de 44 px o más, contraste AA de toda la paleta y respeto de `prefers-reduced-motion`, todo con pruebas.
- **Documentación**: `README.md`, `docs/DESPLIEGUE.md`, `docs/PALABRAS.md` y `docs/DECISIONES.md`, y un flujo de GitHub Actions con `check` y `test:db`.

## Qué no está hecho o no se ha podido verificar

- **GitHub Actions no se ha ejecutado en GitHub**, porque no hay remoto. Sus pasos de base de datos se reprodujeron en local con un Postgres vacío y pasan; el primer push dirá si el entorno de GitHub da alguna sorpresa.
- **No se ha probado en móviles reales**, solo en Chrome de escritorio con vista y tacto de móvil. En particular, falta probar en iPhone (Safari): la hoja de compartir, el Wake Lock, que Safari soporta desde la versión 16.4, y el comportamiento al bloquear el móvil.
- Lo que `docs/CONTEXTO.md` deja fuera de la primera versión sigue fuera: más juegos, limpieza de salas abandonadas, aviso para evitar la pausa del plan gratuito, etc.

## Bloqueos que hubo

- **Docker no estaba instalado** al empezar la fase 2. Lo instalaste y se resolvió.
- **Docker Desktop se para** entre sesiones. Si fallan `test:db` o `test:e2e`, lo primero es comprobar que está abierto.

## Decisiones que conviene conocer

Están todas en `docs/DECISIONES.md`. Las que más afectan al uso:

- **Expulsar**: el anfitrión toca la ficha del jugador y confirma. En partida solo se puede echar a desconectados, y se hace desde la espera de votos.
- **El anfitrión siempre puede avanzar la partida**, aunque esté eliminado o le haya tocado ser anfitrión habiendo llegado tarde.
- **Volver a jugar** con gente de menos lleva a la sala de espera para ajustar los impostores.
- **Textos neutros en género**: "Sin conexión" en vez de "Desconectada"; "no puedes votar por ti".
- **Versiones fijadas**: TypeScript 6.0 y ESLint 9, por compatibilidad con typescript-eslint y los plugins de Next.
- **Un commit para las tareas 5.1 a 5.5**, en vez de uno por tarea, porque comparten el contenedor de pantallas.

## Qué revisar primero

1. **La lista de palabras** (`docs/PALABRAS.md`). La escribí yo. Revisa que todas se entiendan en tu grupo y que no haya ninguna demasiado fácil o rara; para quitar alguna, crea una migración que la desactive.
2. **Una partida real con el grupo**, en vuestros móviles, sobre todo con alguno con iPhone.
3. **El límite de inicios anónimos** en Supabase al publicar (`docs/DESPLIEGUE.md`, paso 1.3): con todos en la misma wifi, el valor por defecto de 30 por hora puede quedarse corto.
4. **Los textos** de `src/lib/copy.ts` que no venían en la referencia: estados de espera ("Fran cerrará la votación"…), errores y diálogos.

# Informe final

## Segunda tanda: tres juegos nuevos (fases 8 a 13)

Estado al cerrar `docs/PLAN-2.md`, el 10 de octubre de 2026.

### Resumen

La Previa tiene ya los cuatro juegos de `docs/JUEGOS.md`: El impostor, **¿Quién es más probable que…?**, **¿Quién lo dijo?** y **Una sola pista**, elegibles desde el selector y jugables uno detrás de otro en la misma sala. Todas las fases (8 a 13) están cerradas y sus tareas marcadas en `docs/TAREAS.md`, en 38 commits sin subir.

Verificación al cerrar, todo partiendo de cero:

| Comprobación                               | Resultado                                                        |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `npm run check` (lint, tipos, unitarios)   | 472 tests en 44 archivos, sin avisos                             |
| `npm run test:db` tras `supabase db reset` | 633 pruebas pgTAP en 26 archivos                                 |
| `npm run test:e2e`                         | 15 pruebas; las tres baterías pasaron tres veces seguidas (12.6) |
| `npm run build`                            | Sin avisos                                                       |

No se ha publicado nada: ni push (ahora sí hay remoto `origin`, pero no lo he usado), ni Supabase ni Vercel. Las 14 migraciones nuevas se aplican con el mismo `npx supabase db push` de `docs/DESPLIEGUE.md`.

### Qué está hecho

- **Base de datos** (14 migraciones nuevas): tablas `prompts`, `game_rounds` y `answers` con RLS y sin políticas; acciones de los tres juegos con su prefijo; lo común de los juegos por rondas en `private` (abrir ronda, avanzar cuando ya no falta nadie, abandonos, final con menos de 3, parte común de la foto); 150 preguntas de `probable` y 80 de `quien_lo_dijo`.
- **Reglas de juego por rondas**: avance automático, el anfitrión puede forzar, quien llega tarde entra en la ronda siguiente, quien se va deja de contar y la partida termina con menos de 3. Ninguna pregunta ni palabra se repite en la sala mientras queden otras.
- **Secreto**, probado en pgTAP recorriendo la foto entera y en Playwright mirando la red: nadie ve votos ajenos antes del recuento; nadie sabe de quién es la respuesta elegida antes de la revelación (ni siquiera deduciendo quién falta por votar); el adivino no recibe la palabra hasta el final ni las pistas hasta que se enseñan, y entonces solo las vivas, sin autor.
- **Cliente**: una carpeta por juego (`src/games/…`) con su `viewFor`, sus pantallas y sus pruebas, y `src/games/rounds` con lo que comparten los juegos por rondas. La foto es una unión validada con zod por `game.type`.
- **Interfaz**: selector con cuatro juegos y dos "Próximamente", selector de rondas, botón de empezar que explica por qué no se puede con menos de 3, y pantallas nuevas hechas solo con los componentes y tokens existentes. Sin desbordes a 360, 390 y 430 px con 16 jugadores, nombres de 14 caracteres, respuestas de 80 y pistas de 20.
- **Accesibilidad**: un encabezado por pantalla, objetivos táctiles de 44 px, campos con etiqueta y uso con teclado, con su prueba e2e.
- **Documentación**: `README.md`, `docs/DESPLIEGUE.md`, `docs/PREGUNTAS.md` y las decisiones en `docs/DECISIONES.md`.

### Qué no está hecho o no se ha podido verificar

- **Las pantallas nuevas no tenían maqueta.** Están hechas con los componentes de El impostor y comprobadas con capturas, pero el aspecto es criterio mío.
- **No se ha probado en móviles reales** ni en Safari, igual que en la primera versión.
- **GitHub Actions** sigue sin haberse ejecutado en GitHub: no he hecho push.

### Incidencias

- **Docker se paró varias veces**, también a mitad de sesión. El síntoma en la app es "No hemos podido identificarte". Se arregla abriendo Docker Desktop, `npx supabase start` y, si hace falta, `npx supabase db reset`.

### Decisiones que conviene conocer

Todas están en `docs/DECISIONES.md`. Las que más afectan al juego:

- **¿Quién lo dijo?** no enseña quién falta por votar, solo el contador: si no, el último en votar sabría quién es el autor. `docs/JUEGOS.md` pedía las fichas; es la única desviación de lo pedido por motivo de secreto.
- **Quien se va a media votación** pierde su voto y los votos que había recibido se borran: quien le votó vuelve a votar.
- **Quien se va y vuelve a la sala** juega desde la ronda siguiente con sus puntos.
- **Una sola pista**: el adivino rota (el que menos veces ha adivinado, por orden de entrada) y el árbitro se calcula en cada acción, prefiriendo a los conectados. Si se va el adivino, la ronda se repite con otro y no cuenta. La comparación de pistas conserva la ñ.
- **El anfitrión o el árbitro cierran una fase después de hacer su parte** (votar o dar pista), como ya pasaba en El impostor.
- **Una ronda de ¿Quién lo dijo? sin respuestas** se salta pero cuenta para el total, para que la partida siempre termine.
- **Pruebas existentes modificadas**: una de secreto de El impostor (ignora la clave `type`, que ahora siempre vale `impostor`) y la del selector de juegos, que daba por hecho un solo juego. Justificadas en 8.6 y 9.7.

### Qué revisar primero

1. **`docs/PREGUNTAS.md`**: las 230 preguntas las he escrito yo. Revisa el tono y quita las que no encajen en tu grupo con una migración que las desactive.
2. **El aspecto de las pantallas nuevas**: ¿Quién es más probable que…? (recuento y clasificación), ¿Quién lo dijo? (respuesta anónima y revelación) y Una sola pista (revisión de pistas, pantalla del adivino y marcador). Lo más rápido es una partida de cada en local con tres ventanas.
3. **Una partida real** con el grupo y móviles de verdad, sobre todo de Una sola pista, que es el que más depende de quién arbitra.
4. **Subir los cambios** cuando quieras: `git push` y, al publicar, `npx supabase db push` antes del despliegue.

## Primera versión (fases 0 a 7)

Estado de La Previa al cerrar el plan (`docs/PLAN.md`), el 9 de octubre de 2026.

### Resumen

La primera versión está completa: salas y El impostor, de crear la sala a volver a jugar, con todas las pantallas de la referencia y las variantes que no estaban dibujadas. Todas las fases del plan (0 a 7) están cerradas y todas sus tareas marcadas en `docs/TAREAS.md`.

Verificación al cerrar, todo partiendo de cero:

| Comprobación                               | Resultado                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `npm run check` (lint, tipos, unitarios)   | 340 tests, sin avisos                                                  |
| `npm run test:db` tras `supabase db reset` | 291 pruebas pgTAP en 10 archivos                                       |
| `npm run test:e2e`                         | 8 pruebas; la batería de la fase 6 pasó tres veces seguidas sin fallos |
| `npm run build`                            | Sin avisos                                                             |

No se ha publicado nada: ni push (no hay remoto `origin`), ni Supabase ni Vercel. Eso lo haces tú con `docs/DESPLIEGUE.md`.

### Qué está hecho

- **Base de datos** (9 migraciones): esquema con RLS en todas las tablas, una sola política (leer tu propia sala, para Realtime), funciones RPC con las comprobaciones de `CLAUDE.md`, reglas completas de El impostor, abandono y expulsión en las cuatro fases y 200 palabras.
- **Secreto**: la foto del estado solo lleva lo que cada jugador puede ver. Probado en pgTAP recorriendo la foto entera en cada fase y en Playwright inspeccionando toda la red y el almacenamiento del navegador. Ambas pruebas se validaron filtrando la palabra a propósito: fallan.
- **Sincronización** pensada para fiestas: Realtime, sondeo cada 10 s, reintentos rápidos tras un corte, vuelta a primer plano, aviso de sin conexión sin bloquear la pantalla, reconexión sin volver a pedir el nombre y pantalla siempre encendida.
- **Interfaz**: las 14 pantallas, el sistema Verbena como tokens de Tailwind, todos los textos en un módulo, y sin desbordes a 360, 390 y 430 px. Las 200 palabras caben sin partirse en esos tres anchos (tamaño medido en el navegador, no estimado).
- **Accesibilidad**: encabezado por pantalla, foco visible, uso completo con teclado, objetivos táctiles de 44 px o más, contraste AA de toda la paleta y respeto de `prefers-reduced-motion`, todo con pruebas.
- **Documentación**: `README.md`, `docs/DESPLIEGUE.md`, `docs/PALABRAS.md` y `docs/DECISIONES.md`, y un flujo de GitHub Actions con `check` y `test:db`.

### Qué no está hecho o no se ha podido verificar

- **GitHub Actions no se ha ejecutado en GitHub**, porque no hay remoto. Sus pasos de base de datos se reprodujeron en local con un Postgres vacío y pasan; el primer push dirá si el entorno de GitHub da alguna sorpresa.
- **No se ha probado en móviles reales**, solo en Chrome de escritorio con vista y tacto de móvil. En particular, falta probar en iPhone (Safari): la hoja de compartir, el Wake Lock, que Safari soporta desde la versión 16.4, y el comportamiento al bloquear el móvil.
- Lo que `docs/CONTEXTO.md` deja fuera de la primera versión sigue fuera: más juegos, limpieza de salas abandonadas, aviso para evitar la pausa del plan gratuito, etc.

### Bloqueos que hubo

- **Docker no estaba instalado** al empezar la fase 2. Lo instalaste y se resolvió.
- **Docker Desktop se para** entre sesiones. Si fallan `test:db` o `test:e2e`, lo primero es comprobar que está abierto.

### Decisiones que conviene conocer

Están todas en `docs/DECISIONES.md`. Las que más afectan al uso:

- **Expulsar**: el anfitrión toca la ficha del jugador y confirma. En partida solo se puede echar a desconectados, y se hace desde la espera de votos.
- **El anfitrión siempre puede avanzar la partida**, aunque esté eliminado o le haya tocado ser anfitrión habiendo llegado tarde.
- **Volver a jugar** con gente de menos lleva a la sala de espera para ajustar los impostores.
- **Textos neutros en género**: "Sin conexión" en vez de "Desconectada"; "no puedes votar por ti".
- **Versiones fijadas**: TypeScript 6.0 y ESLint 9, por compatibilidad con typescript-eslint y los plugins de Next.
- **Un commit para las tareas 5.1 a 5.5**, en vez de uno por tarea, porque comparten el contenedor de pantallas.

### Qué revisar primero

1. **La lista de palabras** (`docs/PALABRAS.md`). La escribí yo. Revisa que todas se entiendan en tu grupo y que no haya ninguna demasiado fácil o rara; para quitar alguna, crea una migración que la desactive.
2. **Una partida real con el grupo**, en vuestros móviles, sobre todo con alguno con iPhone.
3. **El límite de inicios anónimos** en Supabase al publicar (`docs/DESPLIEGUE.md`, paso 1.3): con todos en la misma wifi, el valor por defecto de 30 por hora puede quedarse corto.
4. **Los textos** de `src/lib/copy.ts` que no venían en la referencia: estados de espera ("Fran cerrará la votación"…), errores y diálogos.

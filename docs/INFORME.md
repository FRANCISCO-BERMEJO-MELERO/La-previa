# Informe final

## Mejoras tras probarla en grupo (fases 19 a 26)

Estado al cerrar `docs/PLAN-4.md`, el 11 de octubre de 2026.

### Resumen

Las ocho mejoras que Fran y su grupo pidieron tras jugar están hechas: escanear el QR desde el inicio, un botón "Salir" a la vista, "Cómo se juega" con ilustraciones, un final de partida que deja claro qué pasa y quién decide, tiempo para votar en El impostor, temáticas, 100 palabras nuevas y avatares de cachondeo. Todas las fases (19 a 26) están cerradas y sus tareas marcadas en `docs/TAREAS.md`, en 21 commits en la rama `feat/mejoras`, que sale de `feat/plan-3`, sin subir.

Verificación al cerrar, todo partiendo de cero:

| Comprobación                               | Resultado                            |
| ------------------------------------------ | ------------------------------------ |
| `npm run check` (lint, tipos, unitarios)   | 613 tests en 54 archivos, sin avisos |
| `npm run test:db` tras `supabase db reset` | 855 pruebas pgTAP en 40 archivos     |
| `npm run test:e2e`                         | 24 pruebas                           |
| `npm run build`                            | Sin avisos                           |

No se ha publicado nada. Las 4 migraciones nuevas se aplican con `npx supabase db push`, como siempre.

### Qué está hecho

- **Escanear el QR** desde el inicio, con la cámara trasera y `jsqr` (la única dependencia nueva, justificada en 19.2). Sin permiso o sin cámara, lo explica y deja escribir el código.
- **Salir** con un botón con texto en la cabecera de la sala y de todas las partidas; la píldora solo informa.
- **Fin de partida**: en El impostor, "Siguiente ronda" y "Ronda 2 de la partida" dejan claro que sigue la misma; al terminar cualquier juego, "Fin de la partida", "Cambiar de juego" tan visible como "Volver a jugar", y los demás leen quién decide.
- **Tiempo para votar** en El impostor (sin tiempo, 30, 60 o 90 s): cuenta atrás con la hora del servidor y cierre automático aunque el móvil del anfitrión esté bloqueado; la base de datos impide cerrar antes de tiempo a quien no es anfitrión.
- **Temáticas**: el anfitrión elige una, varias o ninguna (todas); la lista sale de la base de datos.
- **Palabras**: Fútbol, Historia, Videojuegos, Ciencia y Geografía, 20 cada una.
- **Cómo se juega**: tres pasos ilustrados por juego, para todos los de la sala.
- **Avatares**: 12 ilustraciones en el estilo de la app, elegibles al poner el nombre y desde tu ficha en la sala.

### Qué no está hecho o no se ha podido verificar

- **El escáner no se ha probado con un móvil y un QR de verdad.** Se comprobó que `jsqr` lee el QR que dibuja la app y que en Chrome con una cámara simulada el vídeo arranca y escanea.
- **Las ilustraciones (avatares y pasos) son criterio mío**, revisadas con capturas a 36 y 80 px.
- **`CLAUDE.md` no nombra todavía `docs/MEJORAS.md` ni `docs/PLAN-4.md`**: no se toca sin permiso de Fran.

### Incidencias

- **Un fallo mío, corregido antes del commit**: la cuenta atrás de una votación (en 0) se arrastraba a la siguiente, y el móvil del anfitrión cerraba la segunda votación de un empate nada más abrirla. Hay una prueba que lo cubre y que falla con la versión antigua (23.2).
- **Una prueba propia intermitente** de las temáticas (22.2) se corrigió en la 23.3: el código estaba bien, la prueba no.
- **Un desborde que ya existía**: a 360 px el titular "La Previa" del inicio se salía 14 px. Se baja un tamaño por debajo de 390 px, con un punto de corte nuevo en `globals.css` (26.1).

### Decisiones que conviene conocer

- **El temporizador y los avatares con imagen** estaban en "Fuera de alcance"; entran porque los pidió Fran (19.2). Subir fotos sigue fuera.
- **Se elige y se confirma** el tiempo, las temáticas y el avatar con controles normales; el cierre automático no enseña errores porque lo normal es que otro móvil se adelante.
- **Lo elegido en la sala de espera** (temáticas, tiempo) vive en el móvil del anfitrión; al recargar vuelve a lo de por defecto. El tiempo de "Volver a jugar" sale de la partida.
- **Pruebas existentes modificadas**, todas justificadas en su tarea: las que tocaban la píldora como botón (20.1), "Seguir hablando" (20.2), "decide si se vuelve a jugar" (20.3), la firma de `startGame` (22.3 y 23.2), el recuento de palabras (22.1), las fixtures con `avatar` (25.1) y el objeto de participantes de El impostor (25.2).

### Qué revisar primero

1. **El escáner con móviles de verdad**, Android e iPhone, apuntando al QR de "Mostrar QR".
2. **Los avatares y las ilustraciones de "Cómo se juega"**: `/dev/componentes` en local enseña la galería entera.
3. **Las 100 palabras nuevas** en `docs/PALABRAS.md`.
4. **Una partida de El impostor con 30 segundos** para ver si el tiempo os encaja.
5. **Subir los cambios**: pull request de `feat/plan-3` y después de `feat/mejoras` a `develop`, y `npx supabase db push` antes de publicar.

## Tercera tanda: ¿Qué prefieres? y Palabras prohibidas (fases 14 a 18)

Estado al cerrar `docs/PLAN-3.md`, el 11 de octubre de 2026.

### Resumen

La Previa tiene ya los seis juegos: a los cuatro anteriores se suman **¿Qué prefieres?** y **Palabras prohibidas**, elegibles en el selector (que ya no tiene sección "Próximamente") y jugables uno detrás de otro en la misma sala. Todas las fases (14 a 18) están cerradas y sus tareas marcadas en `docs/TAREAS.md`, en 27 commits en la rama `feat/plan-3`, sin subir.

Verificación al cerrar, todo partiendo de cero:

| Comprobación                               | Resultado                                                        |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `npm run check` (lint, tipos, unitarios)   | 535 tests en 50 archivos, sin avisos                             |
| `npm run test:db` tras `supabase db reset` | 811 pruebas pgTAP en 36 archivos                                 |
| `npm run test:e2e`                         | 19 pruebas; las tres baterías pasaron tres veces seguidas (17.4) |
| `npm run build`                            | Sin avisos                                                       |

No se ha publicado nada: ni push, ni pull request, ni Supabase, ni Vercel. Las 8 migraciones nuevas se aplican con el mismo `npx supabase db push` de `docs/DESPLIEGUE.md` y no piden ningún paso más.

### Qué está hecho

- **Base de datos** (8 migraciones nuevas): `prompts.text_b` para la opción B, tabla `taboo_cards` con RLS, sin políticas y con un `check` que exige cinco prohibidas distintas entre sí y de la palabra, y `game_rounds.card_id`; acciones de los dos juegos con su prefijo; 120 dilemas y 150 tarjetas.
- **Reglas**: en ¿Qué prefieres? puntúa la mayoría y con empate o sin elecciones nadie; en Palabras prohibidas el turno de describir rota, vigila el siguiente prefiriendo a los conectados, acertar da un punto a quien acierta y otro a quien describe, y si se va quien describe la ronda se repite sin contar. Lo común de los juegos por rondas sigue en `private`, ampliado con un caso por juego; el turno y quien vigila comparten auxiliares con Una sola pista.
- **Secreto**, probado en pgTAP recorriendo la foto entera y en Playwright mirando la red: antes del reparto nadie ve qué ha elegido otro ni cuántos van con cada opción; quien adivina no recibe la palabra ni las prohibidas hasta la revelación.
- **Cliente**: `src/games/que-prefieres` y `src/games/palabras-prohibidas`, cada uno con su `viewFor`, sus pantallas y sus pruebas; la foto es una unión validada con zod por `game.type`.
- **Interfaz**: pantallas hechas solo con componentes y tokens existentes, con acento `orange` y la tarjeta oscura con sombra `tomato`. Sin desbordes a 360, 390 y 430 px con 16 jugadores, nombres de 14 caracteres y los dilemas y tarjetas más largos.
- **Accesibilidad**: un encabezado por pantalla, objetivos táctiles de 44 px y uso con teclado, con su prueba e2e.
- **Documentación**: `README.md`, `docs/DESPLIEGUE.md`, `docs/PREGUNTAS.md` (dilemas), `docs/TARJETAS.md` y las decisiones en `docs/DECISIONES.md`.

### Qué no está hecho o no se ha podido verificar

- **Las pantallas nuevas no tenían maqueta.** Están hechas con los componentes de los otros juegos y comprobadas con capturas, pero el aspecto es criterio mío.
- **No se ha probado en móviles reales** ni en Safari.
- **GitHub Actions** sigue sin ejecutarse en GitHub: no he hecho push.

### Incidencias

- **Docker estaba parado** al empezar; se arrancó a mano, como en las tandas anteriores.
- **Una prueba existente de El impostor falló una vez** (`09_game_state`, el orden de entrada de los jugadores) y pasó en las cuatro repeticiones siguientes y en las tres pasadas finales. El orden sale de `clock_timestamp()` y solo puede invertirse si el reloj del contenedor retrocede, lo que encaja con Docker recién arrancado en Windows. No la causa este cambio y no se ha tocado.
- **La verificación triple se cortó una vez por falta de memoria** al lanzarla en segundo plano. Se repitió en primer plano, una batería detrás de otra, y pasaron las tres veces.
- **El aviso de rsc decía que la sincronización de conocimiento estaba activa.** No lo está: el interruptor `.rsc/.no-knowledge-sync` sigue puesto y el script lo respeta, así que no ha subido nada.

### Decisiones que conviene conocer

Todas están en `docs/DECISIONES.md`. Las que más afectan al juego:

- **Elegir y confirmar.** En ¿Qué prefieres? y al marcar quién acierta en Palabras prohibidas se toca y luego se confirma, porque no se puede deshacer.
- **Quien vigila se calcula en cada acción**, así que si se desconecta vigila otro, que pasa a ver la tarjeta. Así una ronda nunca se atasca: aunque quien describe desaparezca, quien vigila puede cerrarla con "¡Prohibida!".
- **En Palabras prohibidas no se echa a nadie a media ronda**: ninguna ronda espera a todos, así que no hay lista de quién falta.
- **Pruebas existentes modificadas**: la del selector (ahora seis juegos y sin "Próximamente"), la de entrar tarde en `Room` (un caso por juego nuevo), la e2e de teclado de la 7.1 (más pulsaciones de Tab porque hay más juegos) y la sesión larga (dos juegos más). Justificadas en 15.6, 15.7, 15.8 y 17.4.

### Qué revisar primero

1. **Los dilemas y las tarjetas**: `docs/PREGUNTAS.md` (sección ¿Qué prefieres?) y `docs/TARJETAS.md`. Los he escrito yo; quita o cambia los que no encajen con una migración nueva.
2. **El aspecto de las pantallas nuevas**: el dilema y el reparto de ¿Qué prefieres?, y las tres pantallas de Palabras prohibidas (describir, vigilar y adivinar) y su revelación. Lo más rápido es una partida de cada en local con tres o cuatro ventanas.
3. **Una partida real** de Palabras prohibidas con el grupo, que es el que más depende de quién describe y quién vigila.
4. **Subir los cambios** cuando quieras: pull request de `feat/plan-3` a `develop` y, al publicar, `npx supabase db push` antes del despliegue.

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

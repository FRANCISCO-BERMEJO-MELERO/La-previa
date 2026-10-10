# La Previa: plan de la tercera tanda de juegos

Continúa `docs/PLAN-2.md`, cuyas fases 8–13 están terminadas. Añade los dos juegos de `docs/JUEGOS-2.md`. Se ejecuta **sin supervisión**, con las mismas normas de trabajo, de dudas y de bloqueos que `docs/PLAN.md` y las reglas de `CLAUDE.md`.

## Antes de empezar (lo hace Fran)

1. Confirmar o cambiar las decisiones de `docs/JUEGOS-2.md` §0.
2. Añadir a `CLAUDE.md` las referencias a `docs/JUEGOS-2.md` y a este plan, que mandan sobre `docs/CONTEXTO.md` y `docs/JUEGOS.md` donde se contradigan, y que no se modifican durante el plan.

## Cómo trabajar

1. Añade a `docs/TAREAS.md` todas las tareas de este plan, con su numeración (fases 14–18), debajo de las ya hechas.
2. Fases y tareas en orden. Un commit por tarea.
3. **Nada de lo que ya funciona puede romperse.** Antes de empezar y al cerrar cada fase, `npm run check`, `npm run test:db` y `npm run test:e2e` pasan enteros.
4. Lo común entre juegos ya existe (`private.*` de juegos por rondas y `src/games/rounds`). Se amplía con un `case` por juego donde haga falta; no se generaliza más.
5. Si `docs/JUEGOS-2.md` nombra algo distinto de como está en el código, sigue el código y anótalo en `docs/DECISIONES.md`.

---

## Fase 14 · Preparación

- **14.1** Leer `docs/JUEGOS-2.md`, `docs/DECISIONES.md` (entradas de las fases 8–13) e `docs/INFORME.md`. Repasar las auxiliares de `private` para juegos por rondas y `src/games/rounds`.
- **14.2** Comprobar que las tres baterías pasan antes de tocar nada.
- **14.3** Anotar en `docs/DECISIONES.md` las diferencias entre `docs/JUEGOS-2.md` y el código, y cómo se resuelven.
- **14.4** Añadir las fases 14–18 a `docs/TAREAS.md`.

**Aceptación:** las pruebas existentes pasan sin cambios.

## Fase 15 · ¿Qué prefieres?

- **15.1** Migración: `rooms.game`, `games.game_type` y `games.phase` admiten `que_prefieres`; `prompts` admite el juego y gana `text_b`, obligatoria solo para él.
- **15.2** Migración de datos con unos 120 dilemas; ampliar `docs/PREGUNTAS.md`.
- **15.3** `set_game` acepta el juego. Funciones `que_prefieres_start`, `_choose`, `_close`, `_next`, usando las auxiliares comunes (`first_phase`, `has_responded`, `close_if_done`).
- **15.4** Variante `que_prefieres` en `get_room_state`.
- **15.5** Pruebas pgTAP. Como mínimo:
  - Secreto: antes de `reveal`, la foto no contiene la elección de nadie más ni recuentos.
  - Elección: opción distinta de `a`/`b`, doble, fuera de fase o sin participar, rechazadas.
  - Cierre automático cuando elige el último; cierre forzado con elecciones parciales y sin ninguna.
  - Puntos para la mayoría; empate y sin elecciones, nadie puntúa.
  - No se repite dilema en la sala; quien llega tarde elige desde la ronda siguiente; abandono a media ronda; final con menos de 3.
- **15.6** Selector con el juego elegible y su portada (fichas "A" y "B").
- **15.7** Pantallas y `viewFor`, con tests unitarios.
- **15.8** Prueba e2e: partida de 5 rondas con 3 jugadores, con mayoría y con empate.

**Aceptación:** las tres baterías pasan.

## Fase 16 · Palabras prohibidas

- **16.1** Migración: los identificadores en `rooms`, `games` y fases; tabla `taboo_cards` con RLS y sin políticas, y sus `check` (cinco prohibidas distintas entre sí y de la palabra, en forma normalizada); `game_rounds.card_id`.
- **16.2** Migración de datos con unas 150 tarjetas y `docs/TARJETAS.md`.
- **16.3** Funciones `palabras_prohibidas_start`, `_guessed`, `_pass`, `_forbidden`, `_next`. Turno de quien describe y cálculo de quien vigila; ronda anulada si se va quien describe.
- **16.4** Variante `palabras_prohibidas` en `get_room_state`.
- **16.5** Pruebas pgTAP. Como mínimo:
  - Secreto: la foto de quien adivina no contiene la palabra ni las prohibidas hasta `reveal`; las de quien describe y quien vigila sí.
  - Solo quien describe marca acierto o pasa; solo quien vigila marca "¡Prohibida!"; no se puede marcar como acertante a quien describe, a quien vigila ni a un inactivo.
  - Acierto: un punto a quien adivina y otro a quien describe. Prohibida y pasar: ninguno.
  - El turno rota y salta a los inactivos; si se desconecta quien vigila, vigila el siguiente conectado.
  - Si se va quien describe, la ronda se anula y no cuenta. Si se va quien vigila, la ronda sigue.
  - No se repite tarjeta en la sala; final con menos de 3.
- **16.6** Selector con el juego elegible y su portada (palabra tachada).
- **16.7** Pantallas y `viewFor`, con tests unitarios.
- **16.8** Prueba e2e: partida de 5 rondas con 4 jugadores, con un acierto, una prohibida y un pase. Incluye comprobar que las respuestas de red de quien adivina no contienen la palabra antes de la revelación.

**Aceptación:** las tres baterías pasan.

## Fase 17 · Selector y repaso conjunto

- **17.1** Selector definitivo: seis juegos elegibles y sin sección "Próximamente".
- **17.2** Repaso a 360, 390 y 430 px de las pantallas nuevas con 16 jugadores, nombres de 14 caracteres y los dilemas y tarjetas más largos. Nada desborda ni se parte mal.
- **17.3** Repaso de accesibilidad de las pantallas nuevas, ampliando la prueba e2e de accesibilidad de los juegos.
- **17.4** Ampliar la prueba e2e de sesión larga a los seis juegos seguidos, con una recarga a mitad de cada uno.

**Aceptación:** las tres baterías pasan tres veces seguidas sin fallos intermitentes.

## Fase 18 · Cierre

- **18.1** Actualizar `README.md` con los seis juegos.
- **18.2** Actualizar `docs/DESPLIEGUE.md` si las migraciones nuevas piden algún paso.
- **18.3** Revisión final contra `docs/JUEGOS-2.md` y su "Fuera de alcance". Lo construido de más se quita.
- **18.4** Ampliar `docs/INFORME.md` con esta tanda. Como mínimo, qué debe revisar Fran primero: los dilemas, las tarjetas y el aspecto de las pantallas nuevas.

**Aceptación:** `npm run check`, `npm run test:db`, `npm run test:e2e` y `npm run build` pasan sin avisos.

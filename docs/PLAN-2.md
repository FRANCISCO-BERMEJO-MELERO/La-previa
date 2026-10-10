# La Previa: plan de la segunda tanda de juegos

Continúa `docs/PLAN.md`, cuyas fases 0–7 están terminadas. Añade tres juegos descritos en `docs/JUEGOS.md`. Se ejecuta **sin supervisión**, con las mismas normas de trabajo, de dudas y de bloqueos que `docs/PLAN.md` y las reglas de `CLAUDE.md`.

## Cómo trabajar

1. Añade a `docs/TAREAS.md` todas las tareas de este plan, con su numeración (fases 8–13), debajo de las ya hechas. No borres el historial.
2. Fases y tareas en orden. Un commit por tarea.
3. **Nada de lo que ya funciona puede romperse.** Antes de empezar y al cerrar cada fase, `npm run check`, `npm run test:db` y `npm run test:e2e` pasan enteros.
4. Lo común entre juegos se extrae **en la fase 10**, cuando ya existen dos juegos por rondas. En la fase 9 no se generaliza nada por adelantado.
5. Si `docs/JUEGOS.md` nombra algo distinto de como está en el código, sigue el código y anótalo en `docs/DECISIONES.md`.

---

## Fase 8 · Preparación

- **8.1** Leer `docs/JUEGOS.md`, `docs/DECISIONES.md` e `docs/INFORME.md`. Recorrer el código existente: migraciones, funciones SQL, tipos de la foto, `viewFor` y pantallas de El impostor.
- **8.2** Comprobar que las tres baterías de pruebas pasan antes de tocar nada. Si alguna falla, arreglarla es la primera tarea.
- **8.3** Escribir en `docs/DECISIONES.md` las diferencias encontradas entre `docs/JUEGOS.md` y el código real, y cómo se resuelve cada una.
- **8.4** Añadir las fases 8–13 a `docs/TAREAS.md`.
- **8.5** Reorganizar el cliente para que El impostor viva en su propia carpeta de juego (por ejemplo `src/games/impostor/`) y la sala elija el juego por `game.type`. Sin cambios de comportamiento.
- **8.6** Añadir `type` a la foto de El impostor y convertir el esquema de `game` en una unión discriminada con una sola variante.

**Aceptación:** todas las pruebas existentes pasan sin haber cambiado ninguna aserción. La app se comporta igual que antes.

## Fase 9 · ¿Quién es más probable que…?

- **9.1** Migración de esquema: `rooms.game` y `games.phase` admiten el juego nuevo, `games.total_rounds`, `game_players.score`, tablas `prompts` y `game_rounds`, con RLS y sin políticas.
- **9.2** Migración de datos con las preguntas de `probable` y primera versión de `docs/PREGUNTAS.md`.
- **9.3** `set_game` acepta `probable`. Funciones `probable_start`, `probable_vote`, `probable_close`, `probable_next`.
- **9.4** Reglas de juego por rondas para `probable`: avance automático al votar todos, incorporación de quien llega tarde al abrir ronda, abandono y expulsión, y final anticipado con menos de 3 activos.
- **9.5** Variante `probable` en `get_room_state`.
- **9.6** Pruebas pgTAP. Como mínimo:
  - Secreto: antes de `reveal`, la foto no contiene votos ajenos ni recuento.
  - `probable_start`: menos de 3 jugadores, rondas fuera de 5/10/15, no anfitrión, partida en curso.
  - Voto a uno mismo permitido; voto doble, fuera de fase, a un inactivo o sin participar, rechazados.
  - Cierre automático cuando vota el último; cierre forzado con votos parciales y sin votos.
  - Puntuación con ganador único, con empate y sin votos.
  - La partida termina tras la última ronda con la clasificación correcta.
  - No se repite pregunta en la sala.
  - Quien entra a media ronda no vota en ella y sí en la siguiente.
  - Abandono a media votación: su voto desaparece y la fase avanza si ya no falta nadie.
  - Con menos de 3 activos la partida termina.
- **9.7** Sala de espera: selector de rondas cuando el juego elegido es por rondas. Selector de juegos con `probable` elegible y su portada.
- **9.8** Pantallas de `probable` y su `viewFor`, con tests unitarios de todos los casos.
- **9.9** Prueba e2e: partida de 5 rondas con 3 jugadores, incluido un cambio de juego desde El impostor en la misma sala.

**Aceptación:** las tres baterías pasan. En una misma sala se puede jugar a El impostor, cambiar a `probable`, jugar y volver.

## Fase 10 · ¿Quién lo dijo? y extracción de lo común

- **10.1** Migración: tabla `answers`; `rooms.game` y `games.phase` admiten `quien_lo_dijo`.
- **10.2** Migración de datos con las preguntas de `quien_lo_dijo`; ampliar `docs/PREGUNTAS.md`.
- **10.3** **Extraer lo común** de `probable` a funciones auxiliares en `private` antes de escribir el juego nuevo: abrir ronda (con incorporación de tardíos y elección de pregunta sin repetir), comprobar si han respondido todos, abandono en juego por rondas, final anticipado, y la parte común de la foto. `probable` pasa a usarlas. Sus pruebas siguen pasando sin tocarlas.
- **10.4** Funciones `quien_lo_dijo_start`, `_answer`, `_close_writing`, `_vote`, `_close_voting`, `_next`.
- **10.5** Variante `quien_lo_dijo` en `get_room_state`.
- **10.6** Pruebas pgTAP. Como mínimo:
  - Secreto: en `writing` y `voting`, la foto de un jugador no contiene respuestas ajenas salvo el texto elegido, ni el autor; el autor recibe `is_author` y los demás no.
  - Respuesta vacía, de más de 80 caracteres o repetida por el mismo jugador, rechazadas. Espacios recortados.
  - El autor no puede votar; nadie puede votarse a sí mismo.
  - Elección de respuesta: solo entre las enviadas, y rota entre autores a lo largo de la partida.
  - Ronda sin respuestas: se salta sin puntos.
  - Puntos: uno por acierto y uno al autor por cada fallo.
  - Avance automático en escritura y en votación; cierre forzado en ambas.
  - Abandono del autor elegido durante la votación: la ronda se anula sin puntos y se pasa a `reveal`.
  - Clasificación final y empate en cabeza.
- **10.7** Extraer en el cliente los componentes comunes de los juegos por rondas: cabecera de ronda, espera de respuestas, clasificación y resultado. `probable` pasa a usarlos.
- **10.8** Pantallas de `quien_lo_dijo` y su `viewFor`, con tests unitarios.
- **10.9** Prueba e2e: partida de 5 rondas con 4 jugadores. Incluye comprobar que las respuestas de red de un jugador no autor no contienen el autor antes de la revelación.

**Aceptación:** las tres baterías pasan. No queda lógica duplicada entre `probable` y `quien_lo_dijo` en las piezas listadas en 10.3 y 10.7.

## Fase 11 · Una sola pista

- **11.1** Migración: `rooms.game` y `games.phase` admiten `una_pista`. Función auxiliar de normalización de texto (minúsculas, sin tildes ni diéresis, sin espacios), con sus pruebas.
- **11.2** Funciones `una_pista_start`, `_clue`, `_close_writing`, `_toggle_clue`, `_show_clues`, `_mark`, `_next`, usando las auxiliares comunes. Cálculo del adivino por turno y del árbitro.
- **11.3** Variante `una_pista` en `get_room_state`.
- **11.4** Pruebas pgTAP. Como mínimo:
  - Secreto: la foto del adivino no contiene la palabra hasta `reveal`, ni pistas hasta `guessing`, ni pistas anuladas ni autores hasta `reveal`. Quien da pista no ve las ajenas hasta `review`.
  - Pista con espacios, vacía, de más de 20 caracteres, igual a la palabra o que la contenga (también con tildes y mayúsculas distintas), rechazadas.
  - El adivino no puede enviar pista.
  - Anulación automática: "Sol", "sol" y "SÓL" se anulan entre sí; "sol" y "soles" no.
  - `toggle_clue` solo en `review` y solo por quien ha dado pista; el adivino no puede.
  - Solo el árbitro confirma y marca. Cuando el anfitrión es el adivino, el árbitro es el siguiente conectado por orden de entrada.
  - `mark` con `correct` suma un punto de equipo; con `wrong` y `pass`, no.
  - El turno de adivino rota y salta a los inactivos.
  - Abandono del adivino a media ronda: ronda anulada, no cuenta para el total.
  - Todas las pistas anuladas: el adivino juega sin pistas.
  - No se repite palabra con ninguna usada antes en la sala, tampoco en El impostor.
- **11.5** Pantallas de `una_pista` y su `viewFor`, con tests unitarios.
- **11.6** Prueba e2e: partida de 5 rondas con 4 jugadores, con una pista duplicada y una anulada a mano. Incluye comprobar que las respuestas de red del adivino no contienen la palabra antes de la revelación.

**Aceptación:** las tres baterías pasan.

## Fase 12 · Selector y repaso conjunto

- **12.1** Selector de juegos definitivo: cuatro elegibles con portada, descripción y rango de jugadores; dos "Próximamente"; "La bomba" retirada. El elegido se destaca como hasta ahora.
- **12.2** El botón de empezar se desactiva, con un texto que explique por qué, si no hay jugadores suficientes para el juego elegido.
- **12.3** Pantalla de entrar tarde con el texto correcto según el juego ("en la siguiente partida" o "en la siguiente ronda").
- **12.4** Repaso a 360, 390 y 430 px de todas las pantallas nuevas, con nombres de 14 caracteres, 16 jugadores, respuestas de 80 caracteres y pistas de 20. Nada desborda ni se recorta.
- **12.5** Repaso de accesibilidad de las pantallas nuevas: etiquetas en los campos, foco, orden de tabulación, objetivos táctiles.
- **12.6** Prueba e2e de sesión larga: en una sola sala, una partida de cada uno de los cuatro juegos seguidas, con un jugador que recarga la página a mitad de cada una.

**Aceptación:** las tres baterías pasan tres veces seguidas sin fallos intermitentes.

## Fase 13 · Cierre

- **13.1** Actualizar `README.md` con los cuatro juegos y la estructura por carpetas de juego.
- **13.2** Actualizar `docs/DESPLIEGUE.md` si las migraciones nuevas piden algún paso.
- **13.3** Revisión final contra `docs/JUEGOS.md`, sección por sección, y contra la lista "Fuera de alcance". Lo construido de más se quita.
- **13.4** Ampliar `docs/INFORME.md` con esta tanda: qué está hecho, qué no, decisiones, y qué debe revisar Fran primero. Como mínimo: `docs/PREGUNTAS.md` y el aspecto de las pantallas nuevas, que no tenían maqueta.

**Aceptación:** `npm run check`, `npm run test:db`, `npm run test:e2e` y `npm run build` pasan sin avisos.

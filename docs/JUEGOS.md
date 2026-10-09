# La Previa: segunda tanda de juegos

Amplía `docs/CONTEXTO.md` con tres juegos y con los cambios de plataforma que necesitan. Todo lo que `docs/CONTEXTO.md` dice sobre salas, identidad, seguridad y sincronización sigue vigente. Donde este documento lo contradiga, manda este.

Los nombres de tablas, funciones y campos de aquí son los previstos. **Si el código ya existente usa otra convención, se sigue la del código** y se anota en `docs/DECISIONES.md`.

## 1. Los cuatro juegos

| Identificador | Nombre visible | Jugadores | Tipo |
| --- | --- | --- | --- |
| `impostor` | El impostor | 3–16 | Roles ocultos (ya hecho) |
| `probable` | ¿Quién es más probable que…? | 3–16 | Pregunta, voto, recuento |
| `quien_lo_dijo` | ¿Quién lo dijo? | 3–16 | Respuesta escrita, adivinar autor |
| `una_pista` | Una sola pista | 3–16 | Cooperativo de palabras |

El selector muestra los cuatro como elegibles, cada uno con su portada hecha con formas en el estilo Verbena, su descripción de una línea y su rango de jugadores. "¿Qué prefieres?" y "Palabras prohibidas" quedan como "Próximamente". "La bomba" desaparece.

## 2. Lo que comparten los tres juegos nuevos

Los tres son **juegos por rondas**. Esto es lo único que se comparte entre ellos; todo lo demás es propio de cada juego.

- **Rondas.** El anfitrión elige 5, 10 o 15 rondas en la sala de espera (10 por defecto). Sustituye al selector de impostores, que solo aparece con El impostor.
- **Avance.** Cuando una fase espera respuestas, avanza **sola** en cuanto han respondido todos los participantes activos. El anfitrión puede forzarla antes con lo que haya. Las fases de revelación las avanza siempre el anfitrión. El impostor no cambia: sigue cerrando el anfitrión.
- **Entrar tarde.** Quien entra en la sala a media partida se incorpora **al empezar la siguiente ronda**. Mientras tanto ve la pantalla de entrar tarde con el texto adaptado. El impostor no cambia.
- **Irse a media partida.** El jugador deja de participar (`alive = false`) y se borra lo que hubiera enviado en la ronda en curso. Se vuelve a comprobar si la fase puede avanzar. Si quedan menos de 3 participantes activos, la partida termina en el acto con el marcador que haya.
- **Puntos.** Viven solo dentro de la partida, en `game_players.score`.
- **Contenido sin repetir.** Ninguna pregunta ni palabra se repite dentro de una sala mientras queden otras sin usar. Para las palabras cuenta también lo usado en El impostor.
- **Textos escritos por jugadores.** Se recortan, se colapsan los espacios y se limitan en longitud en el servidor. No hay moderación: es un juego entre amigos.
- **Final.** "Volver a jugar" empieza otra partida del mismo juego con las mismas rondas. "Cambiar de juego" vuelve a la sala de espera.

## 3. ¿Quién es más probable que…?

Sale una pregunta, todos señalan a alguien a la vez y se ve el recuento.

- **Fases:** `voting` → `reveal` → (siguiente ronda) … → `finished`.
- **Votación:** cada participante vota a un jugador activo. **Puede votarse a sí mismo.** El voto no se cambia. Mientras se vota se ve quién ha votado, no a quién.
- **Revelación:** recuento público por jugador, de más a menos, con los nombres de quienes le han votado. El más votado se lleva 1 punto; si hay empate en cabeza, lo recibe cada uno de los empatados. Sin votos, nadie puntúa.
- **Resultado:** clasificación por puntos. El titular nombra a quien más puntos tiene como "el más probable de la noche"; en caso de empate, a todos.
- **Secreto:** antes de `reveal`, la foto no dice a quién ha votado nadie más.

## 4. ¿Quién lo dijo?

Sale una pregunta abierta, todos escriben, se enseña **una** respuesta anónima y el grupo adivina de quién es.

- **Fases:** `writing` → `voting` → `reveal` → (siguiente ronda) … → `finished`.
- **Escritura:** cada participante escribe una respuesta de 1 a 80 caracteres. No se cambia una vez enviada.
- **Elección:** al cerrar la escritura, el servidor elige una de las respuestas enviadas. Elige al azar entre los autores que menos veces han sido elegidos en esta partida, para que el protagonismo rote. Si nadie ha respondido, la ronda se salta sin puntos.
- **Votación:** se muestra la respuesta elegida, sin autor. Todos menos su autor votan quién la escribió. Nadie puede votarse a sí mismo. El autor ve un aviso de que es la suya y de que disimule.
- **Revelación:** autor, quién acertó y quién falló, y debajo el resto de respuestas de la ronda con su autor.
- **Puntos:** 1 por acertar el autor. El autor recibe 1 por cada jugador que haya fallado.
- **Resultado:** clasificación por puntos; gana quien más tenga. Empate: ganan todos los empatados.
- **Si se va el autor elegido** durante la votación, la ronda se anula sin puntos y se pasa a `reveal`, que muestra las respuestas de la ronda.
- **Secreto:** antes de `reveal`, la foto no contiene el autor de la respuesta elegida ni ninguna otra respuesta ajena. Cada uno ve solo la suya.

## 5. Una sola pista

Cooperativo. Uno adivina una palabra que no ve; los demás le dan una pista de una sola palabra cada uno, y las pistas repetidas se anulan.

- **Turno:** el adivino rota por orden de entrada en la sala entre los participantes activos.
- **Árbitro:** es el anfitrión. Si el anfitrión es el adivino de la ronda, lo es el siguiente participante conectado por orden de entrada. La foto lo indica en `arbiter_id`.
- **Fases:** `writing` → `review` → `guessing` → `reveal` → (siguiente ronda) … → `finished`.
- **Escritura:** todos menos el adivino ven la palabra y su categoría, y escriben una pista. El adivino ve que le toca adivinar y que no mire otros móviles.
  - La pista es **una sola palabra**: sin espacios, de 1 a 20 caracteres.
  - No puede ser la palabra secreta ni contenerla, comparando en forma normalizada.
  - El servidor rechaza las que no cumplan (`invalid_clue`).
- **Anulación automática:** al cerrar la escritura se anulan todas las pistas que coincidan entre sí en forma normalizada: minúsculas, sin tildes ni diéresis, sin espacios. No se tratan plurales ni derivados.
- **Revisión:** los que han dado pista ven todas, con las anuladas marcadas. Cualquiera de ellos puede anular o recuperar una pista, para los casos que el automático no ve ("perro" y "perros"). El árbitro confirma con "Enseñar pistas". El adivino sigue sin ver nada.
- **Adivinanza:** el adivino ve las pistas que han sobrevivido, sin autor, y dice su respuesta **en voz alta**. No se escribe. El árbitro marca "Acertada", "Fallada" o "Pasa".
- **Revelación:** la palabra, el resultado y todas las pistas con su autor, incluidas las anuladas.
- **Puntos:** marcador de equipo, un punto por palabra acertada. No hay puntos individuales.
- **Resultado:** "7 de 10" y una frase según el tramo (hasta el 40 %, hasta el 70 %, hasta el 99 %, pleno).
- **Si se va el adivino** a media ronda, la ronda se anula sin contar y se pasa a la siguiente.
- **Secreto:** hasta `reveal`, la foto del adivino no contiene la palabra; hasta `guessing` no contiene ninguna pista; y hasta `reveal` no contiene las anuladas ni los autores. Quien da pista no ve las de los demás hasta `review`.

## 6. Cambios en el modelo de datos

Siempre en migraciones nuevas. Las tablas existentes no cambian de significado.

- **`rooms.game`** admite los cuatro identificadores.
- **`games`**: la restricción de `phase` pasa a depender de `game_type`. Columna nueva `total_rounds int`, nula en El impostor.
- **`game_players`**: columna nueva `score int not null default 0`.
- **`prompts`** (nueva): `id`, `game_type` (`probable` o `quien_lo_dijo`), `text`, `active`. Único `(game_type, text)`.
- **`game_rounds`** (nueva): PK `(game_id, round)`. Columnas `prompt_id` nula, `word_id` nula, `subject_id` nula (el adivino en `una_pista`; el autor elegido en `quien_lo_dijo`), `result` jsonb nulo.
- **`answers`** (nueva): PK `(game_id, round, user_id)`. Columnas `text` y `cancelled boolean not null default false`. Guarda las respuestas de `quien_lo_dijo` y las pistas de `una_pista`.
- **`votes`** se reutiliza tal cual para `probable` y `quien_lo_dijo`.

Todas con RLS activado y sin políticas, como el resto. `game_rounds.subject_id` es secreto en `quien_lo_dijo` hasta la revelación: solo sale por la foto cuando toca.

## 7. Acciones nuevas

Las funciones de El impostor no se renombran ni cambian de firma. Las nuevas llevan el identificador del juego como prefijo. Todas siguen las reglas de `docs/CONTEXTO.md`: `security definer`, bloqueo de la fila de la sala, subida de versión y devolución de la foto.

| Función | Quién | Cuándo | Efecto |
| --- | --- | --- | --- |
| `probable_start(room_id, rounds)` | Anfitrión | Sala de espera o partida terminada | Crea la partida y abre la ronda 1 en `voting` |
| `probable_vote(room_id, target_id)` | Participante activo | `voting`, sin haber votado | Guarda el voto. Si ya han votado todos, cierra |
| `probable_close(room_id)` | Anfitrión | `voting` | Recuenta, puntúa y pasa a `reveal` |
| `probable_next(room_id)` | Anfitrión | `reveal` | Abre la ronda siguiente o pasa a `finished` |
| `quien_lo_dijo_start(room_id, rounds)` | Anfitrión | Igual | Crea la partida y abre la ronda 1 en `writing` |
| `quien_lo_dijo_answer(room_id, text)` | Participante activo | `writing`, sin haber respondido | Guarda la respuesta. Si han respondido todos, cierra |
| `quien_lo_dijo_close_writing(room_id)` | Anfitrión | `writing` | Elige respuesta y pasa a `voting`, o salta la ronda |
| `quien_lo_dijo_vote(room_id, target_id)` | Participante activo que no es el autor | `voting`, sin haber votado | Guarda el voto. Si han votado todos, cierra |
| `quien_lo_dijo_close_voting(room_id)` | Anfitrión | `voting` | Puntúa y pasa a `reveal` |
| `quien_lo_dijo_next(room_id)` | Anfitrión | `reveal` | Ronda siguiente o `finished` |
| `una_pista_start(room_id, rounds)` | Anfitrión | Igual | Crea la partida y abre la ronda 1 en `writing` |
| `una_pista_clue(room_id, text)` | Participante activo que no es el adivino | `writing`, sin haber enviado | Valida y guarda la pista. Si están todas, cierra |
| `una_pista_close_writing(room_id)` | Árbitro | `writing` | Anula duplicadas y pasa a `review` |
| `una_pista_toggle_clue(room_id, user_id)` | Quien haya dado pista en la ronda | `review` | Anula o recupera esa pista |
| `una_pista_show_clues(room_id)` | Árbitro | `review` | Pasa a `guessing` |
| `una_pista_mark(room_id, result)` | Árbitro | `guessing` | `result` es `correct`, `wrong` o `pass`. Puntúa y pasa a `reveal` |
| `una_pista_next(room_id)` | Árbitro | `reveal` | Ronda siguiente o `finished` |

Cambios en funciones existentes:

- `set_game` acepta los cuatro identificadores.
- `get_room_state` devuelve `game.type` y la forma propia de cada juego.
- `leave_room` y `kick_player` aplican a los juegos por rondas las reglas de la sección 2.
- `back_to_lobby` no cambia.

Códigos de error nuevos: `invalid_rounds`, `invalid_answer`, `invalid_clue`, `already_answered`, `not_arbiter`, `is_author`, `is_guesser`.

## 8. La foto del estado

`game` pasa a ser una unión discriminada por `type`. La forma de `impostor` es la que ya existe, con `type: "impostor"` añadido. Todas las variantes nuevas comparten:

```jsonc
{
  "type": "probable",
  "id": "…",
  "phase": "voting",
  "round": 3,
  "total_rounds": 10,
  "participants": [
    { "user_id": "…", "name": "Fran", "alive": true, "score": 2, "has_responded": true }
  ],
  "my": { "is_participant": true, "alive": true }
}
```

Y cada una añade lo suyo:

- **`probable`**: `prompt`; `my.voted_for`; en `reveal`, `tally` (por jugador: votos y nombres de quienes le votaron) y `round_winner_ids`.
- **`quien_lo_dijo`**: `prompt`; `my.answer`; en `voting`, `featured_text` y `my.is_author`; `my.voted_for`; en `reveal`, `author_id`, `correct_ids`, `wrong_ids` y `answers` (todas, con autor).
- **`una_pista`**: `guesser_id`, `arbiter_id`, `team_score`; `category` y `word` (nulos para el adivino hasta `reveal`); `my.clue`; en `review`, `clues` con autor y `cancelled` (solo para quien no es el adivino); en `guessing`, `clues` solo con el texto de las vivas para el adivino; en `reveal`, todo, más `result`.

En `finished`, las tres llevan `ranking` (o `team_score` y `total_rounds` en `una_pista`).

En el cliente: un esquema `zod` por variante, una función `viewFor` por juego y una carpeta por juego. El código de un juego no importa nada de la carpeta de otro.

## 9. Pantallas

No hay maquetas dibujadas de estos juegos. Se construyen **solo con los componentes y tokens existentes**, siguiendo el patrón de El impostor: cabecera con la píldora de sala o de fase, una tarjeta protagonista girada, texto de apoyo, y abajo el botón del anfitrión o la caja discontinua de espera.

Comunes a los tres:

- **Sala de espera:** selector de rondas (5, 10, 15) donde antes iba el de impostores.
- **Cabecera en partida:** píldora "Ronda 3 de 10".
- **Esperando respuestas:** contador "4 de 6" con la barra de segmentos y las fichas de quién falta, como en la espera de votos.
- **Resultado:** tarjeta protagonista con el titular y, debajo, la clasificación.

Por juego:

| Juego | Pantallas |
| --- | --- |
| `probable` | Pregunta y lista para votar · Esperando votos · Recuento · Resultado |
| `quien_lo_dijo` | Pregunta y campo de respuesta · Esperando respuestas · Respuesta anónima y lista para votar (o aviso de autor) · Esperando votos · Revelación del autor y resto de respuestas · Resultado |
| `una_pista` | Palabra y campo de pista (o aviso de adivino) · Esperando pistas · Revisión de pistas (o espera del adivino) · Pistas para el adivino (o espera con los botones del árbitro) · Revelación · Resultado |

Colores de acento por juego, para distinguirlos de un vistazo: `probable` usa `sky`, `quien_lo_dijo` usa `lilac`, `una_pista` usa `lime`. `tomato` sigue siendo el de la acción principal en todos.

## 10. Contenido

- **`probable`: unas 150 preguntas.** Completan la frase "¿Quién es más probable que…?". Variadas: fiesta, viajes, trabajo y estudios, vida cotidiana, absurdas.
- **`quien_lo_dijo`: unas 80 preguntas abiertas** que den respuestas cortas y personales ("¿Qué harías con un día entero sin móvil?").
- **`una_pista`:** reutiliza `words`. No se añade nada.

Criterios: español de España, tono de grupo de amigos de veintitantos, con picante suave. Nada que señale físico, salud, dinero, orientación, origen o creencias de nadie, ni que empuje a beber o a hacer algo arriesgado. Que cualquiera del grupo pueda salir elegido sin pasarlo mal.

Las escribe quien desarrolla, en migraciones de datos, y deja el listado legible en `docs/PREGUNTAS.md` para que Fran lo pode.

## 11. Fuera de alcance en esta tanda

- Temporizadores y cuentas atrás.
- Equipos.
- Comparar la adivinanza escrita con la palabra: en `una_pista` se adivina en voz alta.
- Moderación o filtro de texto.
- Detección de plurales, derivados o sinónimos en las pistas.
- Packs de contenido y preguntas creadas por los jugadores.
- Puntuación acumulada entre partidas.
- Maquetas nuevas, ilustraciones nuevas más allá de las tres portadas, y cualquier token visual nuevo.

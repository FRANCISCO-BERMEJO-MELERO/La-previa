# La Previa: tercera tanda de juegos

Amplía `docs/CONTEXTO.md` y `docs/JUEGOS.md` con los dos juegos que hoy aparecen como "Próximamente": **¿Qué prefieres?** y **Palabras prohibidas**. Todo lo que esos documentos dicen sobre salas, identidad, seguridad, sincronización y juegos por rondas sigue vigente. Donde este documento los contradiga, manda este; en particular, deja sin efecto el punto "Más juegos que los cuatro descritos" de la lista "Fuera de alcance" de `docs/CONTEXTO.md`.

Los nombres de tablas, funciones y campos son los previstos. **Si el código ya existente usa otra convención, se sigue la del código** y se anota en `docs/DECISIONES.md`.

## 0. Decisiones de producto que debe confirmar Fran

Están tomadas con el criterio de "lo más simple que funcione en una fiesta". Si alguna no convence, se cambia aquí antes de empezar la fase 14.

1. **¿Qué prefieres? puntúa a la mayoría.** Quien elige la opción que más gente ha elegido se lleva un punto. Alternativas descartadas: no puntuar nada (el resultado no diría nada) o apostar antes qué opción ganará (añade una fase y complica la pantalla).
2. **Palabras prohibidas sin equipos.** Uno describe, otro vigila las palabras prohibidas y los demás adivinan en voz alta; acertar da un punto a quien adivina y otro a quien describe. Los equipos siguen fuera de alcance.
3. **Sin temporizador.** Quien describe tiene el tiempo que quiera y puede pasar. Los temporizadores siguen fuera de alcance.
4. **Contenido escrito por quien desarrolla**: 120 dilemas y 150 tarjetas, con listados legibles para que Fran los pode.

## 1. Los seis juegos

| Identificador         | Nombre visible               | Jugadores | Tipo                            |
| --------------------- | ---------------------------- | --------- | ------------------------------- |
| `impostor`            | El impostor                  | 3–16      | Roles ocultos (hecho)           |
| `probable`            | ¿Quién es más probable que…? | 3–16      | Por rondas (hecho)              |
| `quien_lo_dijo`       | ¿Quién lo dijo?              | 3–16      | Por rondas (hecho)              |
| `una_pista`           | Una sola pista               | 3–16      | Por rondas, cooperativo (hecho) |
| `que_prefieres`       | ¿Qué prefieres?              | 3–16      | Por rondas, elegir entre dos    |
| `palabras_prohibidas` | Palabras prohibidas          | 3–16      | Por rondas, describir sin decir |

El selector muestra los seis como elegibles, cada uno con su portada hecha con formas, su descripción de una línea y su rango de jugadores. La sección "Próximamente" desaparece.

Los dos juegos nuevos son **juegos por rondas** y siguen todo lo que `docs/JUEGOS.md` §2 dice de ellos: 5, 10 o 15 rondas; avance automático cuando han respondido todos y cierre forzado por quien lleva la fase; incorporación de tardíos al abrir ronda; abandonos con final anticipado por debajo de 3 activos; puntos en `game_players.score`; contenido sin repetir en la sala; volver a jugar y cambiar de juego. Usan las auxiliares de `private` y los componentes de `src/games/rounds` que ya existen, ampliándolos solo donde haga falta.

## 2. ¿Qué prefieres?

Sale un dilema con dos opciones, cada uno elige la suya en secreto y se ve cómo se ha repartido el grupo.

- **Fases:** `voting` → `reveal` → (siguiente ronda) … → `finished`.
- **Elección:** cada participante activo elige la opción A o la B. No se cambia. Mientras se elige se ve quién ha elegido, nunca qué.
- **Revelación:** cuántos han elegido cada opción y quiénes. Los de la opción mayoritaria se llevan 1 punto cada uno. Empate o nadie ha elegido: nadie puntúa.
- **Resultado:** clasificación por puntos. El titular nombra a quien más puntos tiene como "quien mejor conoce al grupo"; en caso de empate, a todos.
- **Irse a media ronda:** regla común; su elección se borra.
- **Secreto:** antes de `reveal`, la foto no dice qué ha elegido nadie más ni cuántos han elegido cada opción.

## 3. Palabras prohibidas

Uno describe una palabra sin decir ninguna de las cinco prohibidas, otro vigila que no se le escape ninguna y los demás adivinan en voz alta.

- **Turnos:** quien describe rota como el adivino de Una sola pista (el participante activo que menos veces lo ha sido; entre ellos, el primero por orden de entrada). **Vigila** el siguiente participante activo por orden de entrada después de quien describe, prefiriendo a los conectados; se calcula en cada acción, como el árbitro de Una sola pista. Los demás adivinan.
- **Fases:** `describing` → `reveal` → (siguiente ronda) … → `finished`.
- **Describir:** quien describe y quien vigila ven la palabra y sus cinco palabras prohibidas. Los demás ven quién describe y que tienen que adivinar en voz alta. No hay tiempo límite.
- **Cómo acaba la ronda** (lo primero que ocurra):
  - Quien describe toca al jugador que ha acertado: ese jugador y quien describe se llevan 1 punto cada uno.
  - Quien vigila pulsa "¡Prohibida!": nadie puntúa.
  - Quien describe pasa: nadie puntúa.
- **Revelación:** la palabra, las prohibidas y cómo ha acabado (quién acertó, "se dijo una prohibida" o "pasó"). La avanza el anfitrión.
- **Resultado:** clasificación por puntos; gana quien más tenga. Empate: ganan todos los empatados.
- **Si se va quien describe** antes de la revelación, la ronda se anula sin contar y se vuelve a abrir con otro y otra tarjeta, como en Una sola pista. Si se va quien vigila, vigila el siguiente.
- **Secreto:** hasta `reveal`, la foto de quien adivina no contiene la palabra ni las prohibidas.

## 4. Cambios en el modelo de datos

Siempre en migraciones nuevas. Las tablas existentes no cambian de significado.

- **`rooms.game`**, **`games.game_type`** y la restricción de **`games.phase`** admiten los dos juegos nuevos.
- **`prompts`**: admite `que_prefieres`. Columna nueva `text_b text`, obligatoria solo para `que_prefieres`: `text` es la opción A y `text_b` la B.
- **`answers`** se reutiliza para la elección de ¿Qué prefieres? (`text` es `'a'` o `'b'`, validado en la acción).
- **`taboo_cards`** (nueva): `id`, `word`, `forbidden text[]` (exactamente 5, sin repetidas ni iguales a la palabra en forma normalizada), `active`. Única por `word`. RLS activado y sin políticas.
- **`game_rounds`**: columna nueva `card_id bigint` nula, con clave ajena a `taboo_cards`. `subject_id` es quien describe.

## 5. Acciones nuevas

Con el prefijo del juego y las reglas de siempre (`security definer`, bloqueo de la sala, subida de versión y devolución de la foto).

| Función                                         | Quién               | Cuándo                             | Efecto                                                                                        |
| ----------------------------------------------- | ------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `que_prefieres_start(room_id, rounds)`          | Anfitrión           | Sala de espera o partida terminada | Crea la partida y abre la ronda 1 en `voting`                                                 |
| `que_prefieres_choose(room_id, option)`         | Participante activo | `voting`, sin haber elegido        | `option` es `a` o `b`. Si han elegido todos, cierra                                           |
| `que_prefieres_close(room_id)`                  | Anfitrión           | `voting`                           | Recuenta, puntúa y pasa a `reveal`                                                            |
| `que_prefieres_next(room_id)`                   | Anfitrión           | `reveal`                           | Ronda siguiente o `finished`                                                                  |
| `palabras_prohibidas_start(room_id, rounds)`    | Anfitrión           | Igual                              | Crea la partida y abre la ronda 1 en `describing`                                             |
| `palabras_prohibidas_guessed(room_id, user_id)` | Quien describe      | `describing`                       | `user_id` es quien ha acertado (un participante activo que adivina). Puntúa y pasa a `reveal` |
| `palabras_prohibidas_pass(room_id)`             | Quien describe      | `describing`                       | Pasa a `reveal` sin puntos                                                                    |
| `palabras_prohibidas_forbidden(room_id)`        | Quien vigila        | `describing`                       | Pasa a `reveal` sin puntos                                                                    |
| `palabras_prohibidas_next(room_id)`             | Anfitrión           | `reveal`                           | Ronda siguiente o `finished`                                                                  |

Cambios en funciones existentes: `set_game` acepta los seis identificadores; `get_room_state` devuelve las dos formas nuevas; `leave_room` y `kick_player` aplican las reglas de §2 y §3; la elección de palabra o tarjeta no repite lo ya salido en la sala.

Códigos de error nuevos: `invalid_option`, `not_describer`, `not_watcher`. Se reutilizan `already_answered`, `invalid_target` y los comunes.

## 6. La foto del estado

Las dos variantes nuevas comparten la parte común de los juegos por rondas (`type`, `id`, `phase`, `round`, `total_rounds`, `participants`, `my`, `ranking`) y añaden:

- **`que_prefieres`**: `option_a`, `option_b`; `my.choice` (`a`, `b` o nulo); en `reveal`, `choices` (`{ "a": [ids], "b": [ids] }`) y `majority` (`a`, `b` o nulo si hay empate o nadie eligió).
- **`palabras_prohibidas`**: `describer_id`, `watcher_id`; `word` y `forbidden` (nulos para quien adivina hasta `reveal`); en `reveal`, `result` (`{ "type": "guessed", "user_id": "…" }`, `{ "type": "forbidden" }` o `{ "type": "passed" }`).

En el cliente: un esquema `zod` por variante, una función `viewFor` por juego y una carpeta por juego (`src/games/que-prefieres`, `src/games/palabras-prohibidas`).

## 7. Pantallas

Sin maquetas: solo componentes y tokens existentes, con el patrón de los otros juegos por rondas.

| Juego                 | Pantallas                                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `que_prefieres`       | Dilema con las dos opciones como botones grandes · Esperando elecciones · Reparto con el número y los nombres de cada opción · Resultado                                                            |
| `palabras_prohibidas` | Tarjeta para quien describe (palabra, prohibidas, lista de quién puede haber acertado y "Pasar") · Tarjeta para quien vigila con "¡Prohibida!" · Pantalla de quien adivina · Revelación · Resultado |

Colores de acento: `que_prefieres` usa `orange`; `palabras_prohibidas` usa la tarjeta oscura (`ink` con sombra `tomato`) que ya existe. Portadas: las dos fichas "A" y "B" para ¿Qué prefieres? y la palabra tachada para Palabras prohibidas, que ya están dibujadas en el selector.

## 8. Contenido

- **`que_prefieres`: unos 120 dilemas**, con dos opciones cortas y equilibradas ("¿Vivir sin música o sin series?"). Variados: fiesta, viajes, comida, vida cotidiana, superpoderes y absurdos.
- **`palabras_prohibidas`: unas 150 tarjetas**, cada una con su palabra y cinco prohibidas que sean las pistas más obvias.
- Criterios de `docs/JUEGOS.md` §10: español de España, tono de grupo de amigos, nada que señale físico, salud, dinero, orientación, origen o creencias, ni que empuje a beber o a hacer algo arriesgado.
- Listados legibles: los dilemas en `docs/PREGUNTAS.md` y las tarjetas en `docs/TARJETAS.md`.

## 9. Fuera de alcance en esta tanda

- Temporizadores, cuentas atrás y sonidos.
- Equipos.
- Comprobar por escrito lo que se dice en voz alta.
- Dilemas o tarjetas creados por los jugadores.
- Puntuación acumulada entre partidas.
- Maquetas nuevas, ilustraciones más allá de las dos portadas que ya existen y cualquier token visual nuevo.

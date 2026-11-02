# La Previa: Cuela la mentira

Juego nuevo pedido en la issue #30. Amplía `docs/JUEGOS.md` con un juego por rondas más: todo lo que `docs/CONTEXTO.md`, `docs/JUEGOS.md` §2, `docs/JUEGOS-2.md` y `docs/MEJORAS.md` dicen sobre salas, seguridad, sincronización, secreto y juegos por rondas sigue vigente. El movimiento sigue `docs/PLAN-8.md`.

La sección «Especificación aprobada» es la que aprobó Fran antes de implementar y manda sobre la issue. Donde algo no esté cubierto, se elige lo más simple coherente con esto y con `docs/JUEGOS.md` §2 y se anota en `docs/DECISIONES.md`.

## Especificación aprobada

### 1. Identidad

- Identificador interno: `cuela_la_mentira`. Prefijo de funciones SQL: `cuela_`. Carpeta: `src/games/cuela-la-mentira/`.
- Nombre visible: **Cuela la mentira**. Descripción de una línea: «Inventa una respuesta falsa y cuélasela al resto.»
- Jugadores: **de 3 a 10**. Es un juego por rondas: se añade a la lista explícita de `src/lib/rounds.ts`.
- Rondas: el selector común de 5, 10 o 15, **con 5 por defecto en este juego** (los demás siguen con 10). Convierte `DEFAULT_ROUNDS` en una función por juego, sin cambiar el valor de los existentes. Al elegir este juego en la sala, el selector se pone en 5.
- Acento: `sky`. Portada en la sección 8.

### 2. Cómo se juega

Sale una pregunta curiosa con una respuesta real que casi nadie sabe. Cada uno se inventa una respuesta falsa creíble. El servidor mezcla la verdad con las mentiras, sin autores, y todos votan cuál creen que es la real. Se puntúa por acertar y por engañar.

**Fases:** `writing` → `voting` → `reveal` → (siguiente ronda) … → `finished`.

**Escritura (`writing`)**

- Todos ven la pregunta. Nadie ve la respuesta real.
- Cada participante activo escribe **una mentira de 1 a 80 caracteres**, tras recortar y colapsar espacios en el servidor (`invalid_answer` si queda vacía o se pasa). Una vez enviada no se cambia (`already_answered`).
- **Si la mentira coincide con la verdad** (o con una de sus variantes aceptadas) en forma normalizada, se rechaza con el error nuevo `is_truth` y no se gasta el envío. Texto: «¡Has dado con la verdad! Invéntate otra cosa.»
- Mientras se escribe, se ve quién ha enviado, no qué.
- Cierra sola cuando han enviado todos los participantes activos. El anfitrión puede cerrarla antes con lo que haya.

**Preparación (al cerrar la escritura, en la misma transacción)**

- Las mentiras que coinciden entre sí en forma normalizada se **funden en una sola opción con varios autores**. El texto que se muestra es el de quien la envió primero.
- Las opciones son: la verdad + una por cada mentira distinta.
- Si hay **menos de 3 opciones**, se añaden distractores de respaldo de la pregunta (sección 6), saltando los que coincidan con una opción existente, hasta llegar a 3. Estas opciones no tienen autor: en la revelación son de «La casa».
- El servidor baraja las opciones al azar y guarda el orden. Todos ven el mismo orden.
- Si nadie ha escrito nada, la ronda sigue igual: verdad más distractores.

**Votación (`voting`)**

- Todos ven las opciones en el mismo orden, sin nada que distinga la verdad.
- Cada participante activo vota **una** opción. No puede votar una opción de la que es autor (error nuevo `own_option`). El voto no se cambia (`already_voted` o el código existente equivalente).
- Quien no envió mentira vota igual.
- Mientras se vota se ve quién ha votado, no qué.
- Cierra sola cuando han votado todos los participantes activos. El anfitrión puede cerrarla antes.

**Revelación (`reveal`)**

- Primero, la verdad, con su explicación breve.
- Después, cada mentira con su autor o autores («La casa» para los distractores) y quién la ha votado.
- Los puntos de la ronda de cada uno.
- La avanza el anfitrión: siguiente ronda o `finished`.

**Puntos**

| Situación | Puntos |
| --- | ---: |
| Votar la verdad | 2 |
| Por cada persona que vota tu mentira | 1 (a cada autor, si la opción tiene varios) |
| Votos a un distractor de la casa | 0 para todos |
| No enviar o no votar | 0 por lo que no se ha hecho |

Los puntos se suman una sola vez, al cerrar la votación, en `game_players.score`.

**Resultado (`finished`):** clasificación por puntos. Empate en cabeza: victoria compartida, sin desempate. «Volver a jugar» y «Cambiar de juego» como en el resto de juegos por rondas.

### 3. Normalización

Función `private.normalize_answer(text)`, con pruebas, para comparar mentiras entre sí y con la verdad:

1. Minúsculas.
2. Sin tildes ni diéresis (á→a, ü→u; la ñ se conserva).
3. Signos de puntuación y comillas fuera.
4. Espacios colapsados y recortados.
5. Fuera un artículo inicial: `el`, `la`, `los`, `las`, `un`, `una`, `unos`, `unas`.

Sin plurales, sinónimos ni equivalencias por significado. Lo que no detecte la normalización lo resuelven las variantes aceptadas de cada pregunta. Documenta la normalización en `docs/DECISIONES.md`.

### 4. Casos límite

- **Pocos o muchos jugadores al empezar:** `cuela_start` rechaza menos de 3 participantes (`not_enough_players`) y más de 10 (error nuevo `too_many_players`, texto: «Cuela la mentira es para 3 a 10 personas. Ahora sois {n}.»). La sala de espera lo avisa antes de pulsar, como ya hace con el mínimo.
- **Entrar tarde:** como en el resto de juegos por rondas, se entra al empezar la siguiente ronda, **salvo que ya haya 10 participantes activos**: entonces se mira hasta la siguiente partida, con la pantalla de entrar tarde y su texto adaptado.
- **Irse o ser expulsado** (regla común de `docs/JUEGOS.md` §2, concretada):
  - En `writing`: se borra su mentira y se comprueba si la fase puede cerrar.
  - En `voting`: su opción **se queda** (quitarla dejaría votos huérfanos); en la revelación su autor sale como «se ha ido» y no cobra puntos. Su voto se borra. Se comprueba si la fase puede cerrar.
  - Si quedan menos de 3 participantes activos, la partida termina en el acto con el marcador que haya.
- **Reconexión y recarga:** la mentira enviada y el voto se recuperan de la foto; nunca se duplican.
- **Cambio de anfitrión:** el de siempre.
- **Doble envío y concurrencia:** cada acción bloquea la fila de la sala; la segunda petición falla con el código correspondiente sin efectos.
- **Texto malicioso:** las mentiras son texto plano. Se pintan como texto de React, nunca como HTML. Ni moderación ni filtro (`docs/JUEGOS.md` §2).

### 5. Datos y acciones

Sigue la convención real del código; si difiere de estos nombres, manda el código y lo anotas.

- `rooms.game` y la restricción de fases admiten `cuela_la_mentira` con `writing`, `voting`, `reveal` y `finished`.
- Tabla nueva `cuela_questions`: `id`, `text` (la pregunta), `truth` (la respuesta real tal como se muestra), `accepted text[]` (variantes, sin incluir `truth`), `explanation`, `source`, `distractors text[]` (al menos 2), `active boolean`. Único en `text`. Restricción de al menos 2 distractores.
- La pregunta de cada ronda se guarda en `game_rounds` (columna nueva o la convención que encaje). Sin repetir preguntas en la sala mientras queden otras.
- Las mentiras se guardan en `answers` (como en `quien_lo_dijo`).
- Tabla nueva para las opciones de cada ronda (por ejemplo `cuela_options`: `game_id`, `round`, `option_id`, `text`, `kind` `truth` | `lie` | `house`, `position`) y su relación con los autores. Los votos van en una tabla nueva (por ejemplo `cuela_votes`: `game_id`, `round`, `user_id`, `option_id`) si `votes` no sirve porque apunta a jugadores.
- RLS activado y sin políticas en todas.

| Función | Quién | Cuándo | Efecto |
| --- | --- | --- | --- |
| `cuela_start(room_id, rounds)` | Anfitrión | Sala de espera o partida terminada | Valida 3–10 y las rondas, abre la ronda 1 en `writing` |
| `cuela_answer(room_id, text)` | Participante activo | `writing`, sin haber enviado | Valida y guarda. Si han enviado todos, prepara y pasa a `voting` |
| `cuela_close_writing(room_id)` | Anfitrión | `writing` | Prepara opciones y pasa a `voting` |
| `cuela_vote(room_id, option_id)` | Participante activo | `voting`, sin haber votado | Valida y guarda. Si han votado todos, puntúa y pasa a `reveal` |
| `cuela_close_voting(room_id)` | Anfitrión | `voting` | Puntúa y pasa a `reveal` |
| `cuela_next(room_id)` | Anfitrión | `reveal` | Ronda siguiente o `finished` |

Todas con las reglas de siempre (`security definer`, `search_path = ''`, `auth.uid()`, bloqueo de la sala, versión, foto de vuelta, `execute` solo para `authenticated`). `set_game`, `get_room_state`, `leave_room` y `kick_player` se amplían para este juego.

Códigos de error nuevos, también en el cliente con su texto: `is_truth`, `own_option`, `too_many_players`, `invalid_option`.

**Foto del estado**, variante `cuela_la_mentira`, con los campos comunes de los juegos por rondas (`round`, `total_rounds`, `participants` con `has_responded` y `score`, `my`) más:

- `question`: el texto de la pregunta.
- `my.answer`: tu mentira enviada, o nulo.
- En `voting`: `options` como `[{ id, text, is_mine }]`, en el orden guardado; `my.voted_option_id`.
- En `reveal` y `finished`: `options` como `[{ id, text, kind, author_ids, left_author_ids, voter_ids }]`, `explanation`, `round_points` (por jugador).
- En `finished`: `ranking`.

**Secreto, antes de `reveal`:** la foto no contiene la verdad, el `kind` de ninguna opción, autores de opciones ajenas, mentiras ajenas durante `writing` ni votos ajenos. `is_mine` solo marca las opciones del propio jugador. Nada de esto va en `rooms` ni por Realtime. Las opciones no llevan identificadores ni orden que permitan deducir cuál es la verdad (por ejemplo, la verdad no puede ser siempre la primera insertada ni tener un `option_id` reconocible).

### 6. Contenido: banco de preguntas

Lo escribe quien desarrolla. **Es la parte más delicada del juego:** si una «verdad» es falsa, el grupo acierta y la app le dice que se equivoca. Ante la duda, una pregunta se queda fuera.

- **40 preguntas**, en una migración de datos, más el listado legible en `docs/MENTIRAS.md` con todos los campos, para que Fran e Ignacio las revisen.
- **Qué tipo de pregunta:** curiosidades estables y comprobables cuya respuesta real sea sorprendente pero creíble, para que las mentiras compitan con ella. Por ejemplo, el origen de una palabra o de una costumbre, para qué se inventó algo, un dato de un animal, un nombre curioso de algo cotidiano o una ley o récord histórico ya cerrado. Mezcla de temas, con varias de España.
- **Nada de:** noticias o datos que cambian (precios, poblaciones actuales, récords vigentes), personas vivas, temas sensibles (salud, política, religión, tragedias), cifras dudosas, leyendas urbanas presentadas como hechos, ni respuestas que dependan de la fuente que se mire.
- **Forma:**
  - La pregunta se entiende sola y tiene una única respuesta correcta.
  - La verdad cabe en 1 a 6 palabras, como una respuesta que podría haber escrito un jugador (sin tono de enciclopedia que la delate).
  - `accepted` recoge las formas razonables de escribirla.
  - `explanation`: una o dos frases que se leen en voz alta en la revelación.
  - `distractors`: dos o tres mentiras creíbles y con el mismo estilo que la verdad.
- **Comprobación:**
  - Si hay búsqueda web, se comprueba cada dato en una fuente fiable (enciclopedia, institución, diccionario académico, museo) y se pone la URL en `source`.
  - Si no la hay, se pone la referencia conocida y se marca la pregunta en `docs/MENTIRAS.md` como «Sin comprobar en la web».
  - En los dos casos, solo datos de los que se esté muy seguro.
- Al principio de `docs/MENTIRAS.md` va una nota: las preguntas hay que revisarlas antes de jugar en serio, y se desactivan con una migración nueva (`active = false`).
- El ejemplo del «tróspilo» de la issue es inventado: no se usa.

### 7. Pantallas

Solo componentes y tokens existentes, con el patrón de `quien_lo_dijo`: cabecera con la píldora «Ronda 2 de 5», tarjeta protagonista girada, texto de apoyo y, abajo, botón del anfitrión o caja discontinua de espera. Todo cabe sin desbordar a 360, 390 y 430 px con mentiras de 80 caracteres.

- **Escribir:**
  - La pregunta en la tarjeta protagonista.
  - Debajo, un campo de texto con `label` («Tu mentira»), contador «23/80» y el botón principal «Colar mentira».
  - El error `is_truth` sale en línea bajo el campo, con el aviso `orange`, sin borrar lo escrito.
  - Tras enviar: tu mentira en una ficha y la espera común «4 de 6» con quién falta.
- **Votar:**
  - La pregunta arriba, más pequeña, y la frase «¿Cuál es la de verdad?».
  - Cada opción es un `button` a todo el ancho, con el texto completo, que puede ocupar varias líneas.
  - La tuya va con borde discontinuo, la etiqueta «Tu mentira» y desactivada.
  - Al votar, la elegida queda marcada (`aria-pressed`) y aparece la espera común.
- **Revelación:**
  - Tarjeta protagonista con la verdad, el sello «La verdad» en `lime` y la explicación.
  - Debajo, una tarjeta por mentira: el texto, «La coló {nombres}» o «La casa» y las fichas de quienes la votaron.
  - Al final, los puntos de la ronda por jugador («+3»). Las mentiras que no ha votado nadie van al final.
- **Resultado:** el común de los juegos por rondas, con la clasificación.
- **Movimiento:** aplica `docs/PLAN-8.md`, sin movimientos nuevos.
  - Al pasar a `reveal`: la verdad entra con Cambio de fase y su sello con Sello. Las tarjetas de mentira caen de una en una, cada una con sus votos.
  - Los marcadores cuentan.
  - En `writing` y `voting` no hay animaciones que dependan de lo que escribe o vota cada uno.
- **Cómo se juega:** cuatro pasos con ilustraciones hechas con formas.
  1. «Sale una pregunta rara con una respuesta real.»
  2. «Invéntate una respuesta falsa que suene a verdad.»
  3. «Vota cuál crees que es la de verdad.»
  4. «Ganas 2 puntos por acertar y 1 por cada uno que se trague tu mentira.»

### 8. Portada del selector

Mismo lienzo y trazo que las demás. En el código, colores y trazo salen de los tokens.

```html
<svg viewBox="0 0 300 220" role="img" aria-label="Bocadillo con una respuesta tachada" style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round">
<path d="M40 40 H250 Q262 40 262 52 V136 Q262 148 250 148 H120 L82 186 L90 148 H52 Q40 148 40 136 V52 Q40 40 52 40 Z" fill="#7FD8FF"></path>
<line x1="72" y1="78" x2="228" y2="78"></line>
<line x1="72" y1="110" x2="190" y2="110"></line>
<g transform="rotate(-8 205 160)">
<rect x="150" y="136" width="110" height="46" rx="10" fill="#FF6B5E"></rect>
<line x1="168" y1="159" x2="242" y2="159"></line>
</g>
</svg>
```

### 9. Fuera de alcance

Temporizador, equipos, preguntas escritas por los jugadores, packs de contenido, IA para generar o comparar respuestas, equivalencias por significado, modo en solitario, puntuación entre partidas y cualquier cambio en los otros juegos más allá de `rounds.ts`, el selector y lo necesario para registrar el juego.

### 10. Pruebas mínimas

**pgTAP**

- Normalización: tildes, mayúsculas, puntuación, espacios y artículo inicial; plurales no se igualan.
- `is_truth` con la verdad exacta, con una variante y con una forma normalizada; no gasta el envío.
- Duplicados: dos mentiras iguales en forma normalizada dan una opción con dos autores; ninguno de los dos puede votarla; cada uno cobra 1 por votante.
- Distractores: con 1 o 0 mentiras distintas se completa hasta 3 opciones sin repetir; los votos a la casa no dan puntos.
- Votar la propia opción: `own_option`. Votar dos veces o una opción que no existe: rechazado.
- Puntos: 2 por la verdad, 1 por engañado, sumados una sola vez aunque se cierre a mano y se reintente.
- Cierres automáticos y forzados en ambas fases; nadie escribe y nadie vota.
- `cuela_start` con 2 y con 11 participantes; con 10 entra el undécimo como espectador hasta la siguiente partida.
- Irse en `writing` y en `voting`; bajar de 3 participantes termina la partida.
- **Secreto:** en `writing` y `voting`, la foto de cada jugador no contiene la verdad, el tipo de opción, autores ajenos, mentiras ajenas ni votos ajenos; el orden es el mismo para todos.
- Sin repetir preguntas en la sala mientras queden; empate en el resultado.
- El contenido: 40 preguntas activas, cada una con al menos 2 distractores y ningún distractor igual a la verdad en forma normalizada.

**Unitarias:** esquema de la variante, `viewFor` en cada fase y para autor, votante, espectador y quien entró tarde, rondas por defecto por juego, contador de caracteres, y que un texto con etiquetas HTML se pinta como texto.

**E2E**, con tres contextos:

- Partida de dos rondas: una mentira que engaña a alguien, dos mentiras duplicadas, un intento de escribir la verdad, recarga a mitad de la votación y resultado con «Volver a jugar».
- En red, un jugador no recibe la verdad ni autores antes de `reveal`.

Se cierra cuando `npm run check`, `npm run test:db`, `npm run test:e2e` y `npm run build` pasen sin avisos. Resumen final en `docs/INFORME.md` con lo que Fran debe probar primero:

- Revisar `docs/MENTIRAS.md` antes de jugar, empezando por las marcadas «Sin comprobar en la web».
- La pantalla de votar a 360 px con 10 opciones largas.
- Si «La casa» se entiende en la revelación.

## Fases de trabajo

Rama `feat/cuela-la-mentira`. Cada fase deja la app funcionando y con todas las pruebas en verde.

- **Fase 47 · Integración.** Juego registrado (`rooms.game`, `set_game`, selector con portada, `rounds.ts` con rondas por defecto por juego, límite de 3 a 10 en la sala de espera). Las pruebas de los otros juegos pasan sin tocarlas.
- **Fase 48 · Servidor.** Tablas, `normalize_answer`, las seis funciones, salidas y entradas tardías, variante de `get_room_state`. Pruebas pgTAP.
- **Fase 49 · Cliente.** Esquema `zod`, acciones, errores traducidos, `viewFor` con tests y todas las pantallas, incluido el movimiento.
- **Fase 50 · Contenido.** Las 40 preguntas, la migración de datos y `docs/MENTIRAS.md`.
- **Fase 51 · Validación y cierre.** E2E, repaso a 360/390/430 px y accesibilidad, `docs/DECISIONES.md`, `docs/TAREAS.md`, `docs/INFORME.md`.

# La Previa: mejoras tras probarla en grupo

Fran y sus amigos jugaron con los seis juegos y apuntaron lo que falta o confunde. Este documento dice qué se cambia y por qué; `docs/PLAN-4.md` dice en qué orden. Todo lo que `docs/CONTEXTO.md`, `docs/JUEGOS.md` y `docs/JUEGOS-2.md` dicen sobre salas, seguridad, sincronización y secreto sigue vigente. Donde este documento los contradiga, manda este.

## 0. Decisiones tomadas con Fran

1. **El temporizador y los avatares con imagen entran en alcance**, aunque `docs/CONTEXTO.md`, `docs/JUEGOS.md` y `docs/JUEGOS-2.md` los dejaban fuera. Lo pide Fran; se anota en `docs/DECISIONES.md`.
2. **Avatares: una galería de ilustraciones de cachondeo**, dibujadas en el estilo de la app. No se suben fotos ni se guardan imágenes.
3. **Temporizador: lo elige el anfitrión** en la sala de espera: sin tiempo (cierre a mano), 30, 60 o 90 segundos.
4. **Una dependencia nueva**, `jsqr`, para leer el QR con la cámara. Se justifica en `docs/DECISIONES.md` antes de instalarla.

5. **Fin de partida:** Fran confirma que la confusión era la de §4.
6. **Palabras nuevas:** valen conceptos y títulos muy conocidos ("Tetris", "Mario"), sin equipos ni personas reales.

## 1. Escanear el QR desde el inicio

Hoy el QR solo sirve con la cámara del móvil. Se añade un botón **"Escanear QR"** en la pantalla de inicio, debajo de "Unirse".

- Abre un diálogo a pantalla completa con la cámara trasera (`getUserMedia`) y un recuadro de encuadre. Cada fotograma se busca con `jsqr`.
- Si lee un enlace de La Previa (`…/sala/ABCD`) o un código de cuatro letras válido, cierra la cámara y lleva a esa sala, como si se hubiera escrito el código.
- Si lee otra cosa, lo dice y sigue buscando. Si no hay permiso de cámara o el navegador no tiene cámara, lo explica y deja escribir el código.
- La cámara se apaga siempre al cerrar el diálogo o al salir de la pantalla.

## 2. Salir de la sala, a la vista

Hoy se sale tocando la píldora "Sala ABCD" de la cabecera, y nadie lo descubre. Se añade un botón **"Salir"** con texto, visible en la cabecera de la sala de espera y de todas las pantallas de partida, al lado de la píldora. La píldora deja de ser pulsable y solo informa (sala o ronda). Salir sigue pidiendo confirmación con el diálogo que ya existe.

## 3. Cómo se juega

En la sala de espera, todos (no solo el anfitrión) ven un botón **"Cómo se juega"** del juego elegido. Abre un mini tutorial de 3 o 4 pasos, cada uno con una ilustración hecha con formas en el estilo de las portadas y una frase corta. Se pasa con "Siguiente" y "Anterior" y se cierra en cualquier momento. Los textos salen del módulo de textos; las ilustraciones usan solo componentes y tokens existentes.

## 4. Terminar una partida sin sorpresas

Lo que se vio: al acabar una partida empezaba otra del mismo juego sin opción de cambiar. Lo que hace hoy el código:

- En **El impostor**, tras expulsar a alguien, si la partida sigue, el anfitrión pulsa "Seguir hablando" y empieza otra ronda **de la misma partida**. Se confunde fácilmente con una partida nueva.
- Al **terminar** cualquier juego, solo el anfitrión ve "Volver a jugar" (botón grande) y "Cambiar de juego" (pequeño). Los demás solo leen "Fran decide si se vuelve a jugar".

Cambios:

- En la revelación de El impostor, el botón pasa a **"Siguiente ronda"** y encima se lee "La partida sigue: quedan N jugadores y M impostores". La píldora dice "Ronda 2".
- En el resultado de todos los juegos, el titular dice **"Fin de la partida"**. El anfitrión ve dos botones del mismo tamaño: **"Otra de [juego]"** y **"Elegir otro juego"**. Los demás ven "Fran elige si jugáis otra o cambiáis de juego".

## 5. Temporizador de votación en El impostor

- En la sala de espera de El impostor, el anfitrión elige **"Tiempo para votar"**: sin tiempo, 30, 60 o 90 segundos (por defecto, sin tiempo).
- Al abrir la votación se guarda en `games` la hora límite, y la foto la incluye. Todos ven una cuenta atrás.
- Con tiempo, el anfitrión puede cerrar antes, como ahora. Al llegar a cero la votación se cierra con los votos que haya: como el móvil del anfitrión puede estar bloqueado, **cualquier miembro** puede cerrar una votación cuyo tiempo ha pasado, y los móviles lo piden solos al llegar a cero. La base de datos comprueba la hora, así que nadie puede cerrar antes de tiempo salvo el anfitrión.
- Con la segunda votación de un empate, el tiempo vuelve a empezar.

## 6. Temáticas de El impostor

- En la sala de espera de El impostor, el anfitrión ve **"Temáticas"** con una ficha por temática (`aria-pressed`). Puede marcar una, varias o ninguna. **Ninguna = todas.**
- `start_game` recibe las temáticas elegidas y saca la palabra solo de esas, sin repetir en la sala mientras queden.
- La lista de temáticas sale de la base de datos con una función nueva, no está escrita en el cliente.
- Una sola pista sigue usando todas las palabras.

## 7. Más palabras

Cinco temáticas nuevas de 20 palabras cada una: **Fútbol, Historia, Videojuegos, Ciencia y Geografía**. Las 200 de ahora se quedan. Mismos criterios que `docs/JUEGOS.md` §10, en una migración nueva, y el listado en `docs/PALABRAS.md`.

En Fútbol y Videojuegos valen conceptos y títulos muy conocidos, pero no equipos ni personas reales (§0.6).

## 8. Avatares de cachondeo

- Una galería de 12 ilustraciones graciosas (un aguacate con gafas de sol, un huevo frito, un fantasma, un cactus…) dibujadas con formas en el estilo Verbena: borde grueso `ink` y colores de la paleta.
- Al poner el nombre se elige una; sin elegir, se queda la inicial sobre color, como ahora. En la sala de espera se cambia tocando tu propia ficha.
- Se guarda en `room_players.avatar` (un identificador de la galería, validado en la base de datos) con una acción nueva. La foto la incluye y el cliente la valida con zod.
- Se ve en todas partes donde hoy sale la inicial.

## 9. Cambios en el modelo de datos

Siempre en migraciones nuevas: `games.vote_seconds` y `games.voting_deadline`; `room_players.avatar`; palabras nuevas. Las funciones cambiadas (`start_game`, `open_voting`, `close_voting`, `join_room`, `get_room_state`) conservan sus llamadas actuales con parámetros por defecto, para no romper ninguna prueba existente. Funciones nuevas: `impostor_categories` y `set_avatar`, con sus pruebas pgTAP. Código de error nuevo: `invalid_avatar`.

## 10. Fuera de alcance

- Subir fotos o guardar imágenes de los jugadores.
- Temporizador en los juegos por rondas.
- Temáticas en Una sola pista.
- Tutoriales en vídeo o animados más allá de pasar de paso.
- Sonidos y vibraciones.

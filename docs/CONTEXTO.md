# La Previa: contexto del proyecto

Este documento es la fuente de verdad del producto y de la arquitectura. Si algo del código lo contradice, el código está mal. Las reglas de cómo programar están en `CLAUDE.md` y el orden de trabajo en `docs/PLAN.md` (primera versión) y `docs/PLAN-2.md` (segunda tanda de juegos).

Este documento describe la plataforma y El impostor. Los otros tres juegos y los cambios de plataforma que traen están en `docs/JUEGOS.md`, que manda sobre este documento allí donde se contradigan.

## 1. Qué es

La Previa es una web gratuita de juegos de fiesta para jugar **en persona**, cada uno con su móvil, en español de España. El móvil reparte información y lleva la cuenta; el juego ocurre hablando en el grupo.

Tiene dos fines: portfolio de Fran y uso real con su grupo de amigos. De ahí salen dos prioridades que mandan sobre todo lo demás:

1. **Que no se rompa en una fiesta.** Móviles que se bloquean, cambian de wifi a datos o abren WhatsApp a media ronda son el caso normal, no el raro.
2. **Que nadie pueda hacer trampas mirando las herramientas del navegador.** El impostor no puede averiguarse desde el cliente.

La primera versión contiene la plataforma (salas) y un solo juego: **El impostor**. La segunda tanda añade tres: **¿Quién es más probable que…?**, **¿Quién lo dijo?** y **Una sola pista**.

## 2. Decisiones de producto

| Cuestión | Decisión |
| --- | --- |
| Acceso | Sin registro ni inicio de sesión visible. Crear sala o unirse con un código |
| Dispositivos | Solo móviles. Diseño para 360–430 px de ancho |
| Elección de juego | La hace el anfitrión antes de abrir la sala; puede cambiarla desde el resultado |
| Ritmo | El anfitrión avanza las fases. No hay relojes ni cuentas atrás |
| Entrar tarde | Se entra en la sala y se juega en la siguiente partida |
| El anfitrión se va | Tras 90 s sin dar señal, pasa a ser anfitrión el jugador conectado más antiguo. Si vuelve, es un jugador más |
| Desconexión a media partida | La partida sigue. El jugador aparece como desconectado y puede volver |
| Volver a jugar | Nueva partida en la **misma sala**: mismo código, misma gente |
| Código de sala | 4 letras mayúsculas del alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ` (sin I, L, O) |
| Formas de unirse | Código, enlace (`/sala/CODIGO`) y QR mostrado en el móvil del anfitrión |
| Aforo | Máximo 16 jugadores por sala |
| Nombres | De 1 a 14 caracteres, únicos en la sala sin distinguir mayúsculas |
| Expulsar | Solo el anfitrión. En la sala de espera, a cualquiera; durante una partida, solo a un desconectado |
| Idioma | Español de España en toda la interfaz. Se usa "vosotros", nunca "ustedes" |

### Fuera de alcance

No se construye nada de esta lista. Si una tarea parece necesitarlo, se resuelve sin ello.

- Más juegos que los cuatro descritos. "¿Qué prefieres?" y "Palabras prohibidas" aparecen en el selector como "Próximamente" y no son pulsables. "La bomba" se retira del selector.
- Motor genérico de juegos. Se comparte solo lo que `docs/JUEGOS.md` dice que se comparte.
- Pantalla compartida (tele o portátil como marcador).
- Avatares con imagen. Se usa la inicial del nombre sobre un color.
- Portadas definitivas de los juegos. Se usan las ilustraciones hechas con formas de la referencia.
- Tema oscuro.
- Limpieza automática de salas abandonadas (ver sección 10).
- Cuentas, historial, estadísticas y puntuaciones que sobrevivan a una partida.
- La última oportunidad del impostor de adivinar la palabra.
- Pistas propias por palabra: la pista es la categoría.
- Temporizadores, sonidos, vibración, notificaciones, PWA instalable.

## 3. Reglas de El impostor

- **Jugadores:** de 3 a 16. Participan todos los miembros de la sala en el momento de empezar, también los desconectados (el anfitrión puede expulsarlos antes).
- **Impostores:** los elige el anfitrión. Uno por defecto. Siempre menos que jugadores normales: `2 × impostores < jugadores`.
- **Reparto:** el servidor elige una palabra al azar, evitando las ya usadas en esa sala mientras queden otras. Los jugadores normales ven la palabra y su categoría. Cada impostor ve "Impostor" y solo la categoría. Los impostores no saben quiénes son los demás impostores.
- **Conversación:** el grupo habla las rondas que quiera. La aplicación solo espera.
- **Votación:** la abre el anfitrión. Vota cada jugador que sigue en la partida, una sola vez y sin poder cambiarlo; no puede votarse a sí mismo ni a un eliminado. El voto es secreto: se muestra quién ha votado, nunca a quién ni el recuento.
- **Cierre:** lo hace el anfitrión, con los votos que haya.
  - Un único jugador con más votos: queda eliminado y se revela si era impostor.
  - Empate en cabeza, o ningún voto: no se elimina a nadie.
- **Eliminados:** siguen viendo la partida, no votan y vuelven en la siguiente.
- **Final:** se comprueba tras cada revelación.
  - Gana el grupo cuando no queda ningún impostor.
  - Ganan los impostores cuando quedan tantos impostores como jugadores normales, o más.
  - Al terminar se revelan la palabra y quiénes eran los impostores.
- **Abandono o expulsión a media partida:** cuenta como una eliminación sin votación. Se cancela la votación en curso si la hay, se revela si era impostor y se comprueba el final.

## 4. Arquitectura

### Stack

- **Next.js** (última versión estable, App Router) con **TypeScript estricto**, desplegado en **Vercel**.
- **Supabase**: Postgres, autenticación anónima y Realtime. Plan gratuito.
- **Tailwind CSS v4** con los tokens de la sección 8.
- Sin servidor propio: no hay rutas de API ni acciones de servidor de Next con lógica de juego. Toda la lógica vive en funciones de Postgres.

### Principio central

**La base de datos es la única autoridad.** Los móviles piden acciones y leen una foto del estado; nunca escriben tablas ni deciden nada.

De ahí salen cuatro reglas que no admiten excepción:

1. Toda tabla tiene RLS activado y **ninguna política de escritura**. Los clientes no hacen `insert`, `update` ni `delete`.
2. Los clientes tampoco hacen `select` sobre las tablas. Leen el estado con una única función, `get_room_state`, que devuelve solo lo que ese jugador puede ver.
3. Toda acción es una función RPC que comprueba quién la llama (`auth.uid()`), si pertenece a la sala, si tiene permiso y si la fase lo permite.
4. La pantalla se **reconstruye entera a partir de la foto del estado**, nunca acumulando eventos. Perder un evento no puede dejar la interfaz incoherente.

### Identidad

Inicio de sesión anónimo de Supabase (`signInAnonymously`). Se inicia en silencio la primera vez que hace falta. `auth.uid()` es la identidad del jugador; la sesión persiste en el almacenamiento del navegador y eso es lo que permite reconectar sin cuentas.

Limitación asumida: si alguien borra los datos del navegador o cambia de navegador, es un jugador nuevo y su antiguo yo queda como desconectado.

### Modelo de datos

Identificadores y columnas en inglés. Todas las tablas en el esquema `public`, con RLS activado.

**`rooms`**: la sala. Pertenece a la plataforma y sobrevive entre partidas.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid, PK | |
| `code` | text, único | 4 letras del alfabeto permitido, con `check` |
| `host_id` | uuid | Usuario anfitrión |
| `game` | text | Juego elegido. Por ahora solo `'impostor'` |
| `current_game_id` | uuid, nulo | Nulo = sala de espera |
| `version` | bigint | Sube en cada cambio de estado. Dispara la sincronización |
| `created_at`, `last_activity_at` | timestamptz | |

Esta tabla no puede contener nunca información secreta: su fila viaja por Realtime.

**`room_players`**: miembros de la sala. PK `(room_id, user_id)`. Índice único `(room_id, lower(name))`.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `name` | text | 1–14 caracteres tras recortar espacios |
| `joined_at` | timestamptz | Decide la antigüedad para el traspaso de anfitrión |
| `last_seen_at` | timestamptz | Lo actualiza cada lectura del estado |

**`games`**: una partida dentro de una sala.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid, PK | |
| `room_id` | uuid, FK con borrado en cascada | |
| `game_type` | text | `'impostor'` |
| `phase` | text | `'talking'`, `'voting'`, `'reveal'`, `'finished'` |
| `round` | int | Empieza en 1; sube al volver a hablar |
| `impostor_count` | int | |
| `word_id` | bigint, FK a `words` | Secreto hasta el final |
| `outcome` | jsonb, nulo | Resultado de la última revelación (ver abajo) |
| `winner` | text, nulo | `'group'` o `'impostors'`; solo en `finished` |
| `created_at`, `finished_at` | timestamptz | |

**`game_players`**: participantes de una partida (público). PK `(game_id, user_id)`.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `name` | text | Copia del nombre al empezar, para poder mostrarlo aunque se vaya |
| `alive` | boolean | `false` = eliminado o fuera |
| `has_voted` | boolean | Se reinicia al abrir cada votación |

**`game_roles`**: el secreto. PK `(game_id, user_id)`. Columna `role`: `'player'` o `'impostor'`. Va en tabla aparte a propósito: si alguna vez se añade una política de lectura a `game_players`, los roles siguen sin exponerse.

**`votes`**: PK `(game_id, round, voter_id)`. Columna `target_id`.

**`words`**: `id`, `category`, `word`, `active`. Único `(category, word)`.

Forma de `games.outcome`:

```json
{ "type": "eliminated", "user_id": "…", "name": "Álvaro", "was_impostor": false }
{ "type": "tie", "user_ids": ["…", "…"] }
{ "type": "left", "user_id": "…", "name": "Dani", "was_impostor": true }
```

Un empate sin votos es `{ "type": "tie", "user_ids": [] }`.

### Seguridad

- RLS activado en todas las tablas. **Única política en todo el esquema:** `select` sobre `rooms` para usuarios autenticados que sean miembros de esa sala. Existe solo porque Realtime la necesita para entregar el cambio de `version`.
- Esa política usa una función auxiliar `private.is_room_member(room_id)` con `security definer`, porque `room_players` no es legible directamente.
- Las funciones RPC viven en `public`, son `security definer`, fijan `set search_path = ''` y usan nombres totalmente cualificados. Las auxiliares viven en el esquema `private`, que no se expone por la API.
- Se revoca `execute` a `public` y `anon` en todas las funciones y se concede solo a `authenticated`.
- Cada acción bloquea la fila de la sala (`select … for update`) al empezar, para que dos acciones simultáneas (dos votos, voto y cierre) se ejecuten en orden.
- La clave `service_role` no aparece en ningún archivo del repositorio ni en el cliente.

### Acciones (RPC)

Todas exigen usuario autenticado. Todas las que cambian estado suben `rooms.version`, actualizan `last_activity_at` y **devuelven la foto del estado** para quien llama.

| Función | Quién | Cuándo | Efecto |
| --- | --- | --- | --- |
| `create_room(name)` | Cualquiera | Siempre | Crea la sala con código libre (reintenta si choca), anfitrión = quien llama, y lo añade como jugador |
| `join_room(code, name)` | Cualquiera | Sala existente y con hueco | Añade al jugador. Si ya era miembro, no cambia nada y devuelve el estado (reconexión) |
| `get_room_state(room_id)` | Miembro | Siempre | Marca `last_seen_at`, traspasa el anfitrión si toca y devuelve la foto. No sube la versión salvo que haya traspaso |
| `set_game(room_id, game)` | Anfitrión | Sala de espera | Cambia el juego elegido |
| `kick_player(room_id, user_id)` | Anfitrión | Sala de espera: a cualquiera. En partida: solo a un desconectado | Quita al miembro. En partida, se trata como abandono |
| `leave_room(room_id)` | Miembro | Siempre | Sale de la sala. Si era el anfitrión, pasa al miembro conectado más antiguo (o al más antiguo si no hay conectados). Si no queda nadie, borra la sala |
| `start_game(room_id, impostor_count)` | Anfitrión | Sala de espera, o partida en `finished` | Valida mínimos, elige palabra e impostores al azar, crea la partida en `talking`, ronda 1 |
| `open_voting(room_id)` | Anfitrión | `talking` | Pasa a `voting` y pone `has_voted = false` a todos |
| `cast_vote(room_id, target_id)` | Participante vivo | `voting`, sin haber votado | Guarda el voto y marca `has_voted` |
| `close_voting(room_id)` | Anfitrión | `voting` | Recuenta, elimina si procede, escribe `outcome` y pasa a `reveal` |
| `continue_game(room_id)` | Anfitrión | `reveal` | Si alguien ha ganado: `finished`, con `winner`. Si no: `talking`, ronda + 1 |
| `back_to_lobby(room_id)` | Anfitrión | `finished` | Pone `current_game_id` a nulo |

"Volver a jugar" es `start_game` sobre una partida terminada, con el mismo número de impostores. Si ya no es válido (se ha ido gente), la interfaz vuelve a la sala de espera. "Cambiar de juego" es `back_to_lobby` y abrir el selector.

**Abandono a media partida** (`leave_room` o `kick_player` de un participante vivo):

- En `talking` o `voting`: `alive = false`, se borran los votos de la ronda en curso, `outcome` de tipo `left` y fase `reveal`.
- En `reveal`: solo `alive = false`. El `outcome` existente no se toca.
- En `finished`: nada especial.

### Errores

Las funciones lanzan excepciones cuyo mensaje es un código estable. El cliente los traduce a texto en español; nunca muestra el código ni un error técnico.

`not_authenticated`, `room_not_found`, `room_full`, `name_invalid`, `name_taken`, `not_member`, `not_host`, `invalid_phase`, `not_enough_players`, `invalid_impostor_count`, `not_participant`, `not_alive`, `already_voted`, `invalid_target`, `cannot_kick`, `invalid_game`.

### La foto del estado

`get_room_state` devuelve un único JSON. Es el contrato entre base de datos y cliente; sus tipos de TypeScript se escriben a mano en un solo archivo y se validan al recibirlos.

```jsonc
{
  "server_time": "2026-10-08T19:30:00Z",
  "room": { "id": "…", "code": "KTRM", "game": "impostor", "host_id": "…", "version": 42 },
  "me": { "user_id": "…", "name": "Lucía", "is_host": false },
  "players": [
    { "user_id": "…", "name": "Fran", "connected": true, "joined_at": "…" }
  ],
  "game": null
}
```

Con partida en curso, `game` es:

```jsonc
{
  "id": "…",
  "phase": "voting",
  "round": 2,
  "impostor_count": 1,
  "impostors_left": 1,
  "category": "Comida",
  "participants": [
    { "user_id": "…", "name": "Fran", "alive": true, "has_voted": true }
  ],
  "my": {
    "is_participant": true,
    "alive": true,
    "role": "player",        // o "impostor"; null si no participa
    "word": "Paella",        // null si es impostor o no participa
    "voted_for": null        // id del votado en la ronda actual, o null
  },
  "outcome": null,           // solo en "reveal" (y se conserva en "finished")
  "game_over": false,        // en "reveal": si al continuar se acaba la partida
  "result": null             // solo en "finished"
}
```

En `finished`, `result` es `{ "winner": "group", "word": "Paella", "impostor_ids": ["…"] }`.

Lo que la foto **no puede contener nunca** antes de `finished`: el rol o la palabra de otro jugador, a quién ha votado otro, ni el recuento de votos. Quien no participa (llegó tarde) recibe `role` y `word` nulos y sí ve la categoría.

`connected` es `last_seen_at` hace menos de 25 s.

### Sincronización

1. Al entrar en una sala, el cliente pide la foto.
2. Se suscribe por Realtime (`postgres_changes`, `UPDATE`) a su fila de `rooms`. Cualquier evento significa "ha cambiado algo": se vuelve a pedir la foto. El contenido del evento no se usa.
3. Además, pide la foto **cada 10 s**. Sirve de latido (marca `last_seen_at`) y de red de seguridad si Realtime pierde un evento.
4. También la pide al volver a ser visible la pestaña (`visibilitychange`) y al recuperar la conexión (`online`).
5. Tras una acción propia se usa la foto que devuelve la acción.
6. Una foto con `version` menor que la que ya se tiene se descarta.

No se usa Presence de Supabase: la conexión se deduce de `last_seen_at`, que es lo único que el servidor puede comprobar.

### Presencia y anfitrión

- Mientras se está en una sala, la app pide un **Screen Wake Lock** para que el móvil no se bloquee durante la conversación. Si el navegador no lo soporta o lo deniega, se sigue sin él y sin avisar.
- Traspaso de anfitrión: lo evalúa `get_room_state` en cada llamada. Si el anfitrión lleva más de **90 s** sin dar señal y hay otro miembro conectado, el anfitrión pasa al miembro conectado con `joined_at` más antiguo y sube la versión.
- Todos los permisos de anfitrión se comprueban contra `rooms.host_id` en el momento de la acción, así que el traspaso no necesita nada más.
- Los umbrales (10 s, 25 s, 90 s) son constantes con nombre, una en el cliente y dos en SQL.

## 5. Fases de la partida

```
(sala de espera) --start_game--> talking --open_voting--> voting --close_voting--> reveal
reveal --continue_game--> talking   (si nadie ha ganado; ronda + 1)
reveal --continue_game--> finished  (si alguien ha ganado)
finished --start_game--> talking    (volver a jugar)
finished --back_to_lobby--> (sala de espera)
talking | voting --abandono de un participante vivo--> reveal
```

## 6. Rutas y pantallas

Dos rutas: `/` y `/sala/[code]`. Dentro de la sala, **la vista se deduce de la foto del estado**; no hay rutas por fase ni navegación entre pantallas de juego.

La referencia visual de las 14 pantallas está en `docs/referencia-pantallas.html`. Los textos de la referencia son los textos de la aplicación, salvo los nombres y datos de ejemplo.

| N.º | Pantalla | Se muestra cuando |
| --- | --- | --- |
| 01 | Inicio | Ruta `/`. Campo de código + "Unirse", y "Crear sala" |
| 02 | Tu nombre | Antes de `create_room`, o en `/sala/[code]` sin ser miembro. Muestra el error de nombre repetido en línea |
| 03 | Elegir juego | Anfitrión, justo después de crear la sala y al pulsar "Cambiar de juego". Es una subvista local de la sala de espera |
| 04 | Sala de espera | `game` nulo. El anfitrión ve el selector de impostores, "Empezar partida" y puede expulsar. Los demás ven la lista y un aviso de espera |
| 05 | Entrar tarde | Hay partida sin terminar y `my.is_participant` es falso |
| 06 | Reparto: jugador | `talking`, vivo, rol `player` |
| 07 | Reparto: impostor | `talking`, vivo, rol `impostor` |
| 08 | Votación | `voting`, vivo, sin haber votado |
| 09 | Esperando votos | `voting`, vivo y ya ha votado. Solo el anfitrión ve "Cerrar votación" |
| 10 | Revelación | `reveal` con `outcome` de tipo `eliminated` o `left` |
| 11 | Empate | `reveal` con `outcome` de tipo `tie` |
| 12 | Eliminado | `talking` o `voting` y `my.alive` es falso |
| 13 | Resultado: has ganado | `finished` y el bando del jugador coincide con `winner` |
| 14 | Resultado: has perdido | `finished` y no coincide |

Variantes que la referencia no dibuja y hay que resolver con los mismos componentes:

- **Anfitrión frente a jugador.** Donde el anfitrión tiene un botón de acción, el resto ve una caja de borde discontinuo con el texto de espera ("Fran decide cuándo se vota").
- **Anfitrión que aún no ha votado.** Ve la pantalla 08; "Cerrar votación" aparece en la 09. Un anfitrión eliminado ve la 12 con el botón de la fase que toque, porque sigue siendo quien avanza la partida.
- **Revelación.** El sello dice "Era el impostor" (fondo tomate) o "No era el impostor" (fondo cielo). Con `left`, el título es "Se ha ido" en vez de "El grupo expulsa a". El botón del anfitrión es "Seguir hablando", o "Ver resultado" si `game_over`.
- **Empate sin votos.** Texto: "Nadie ha votado. Esta vez no se expulsa a nadie."
- **Resultado para quien llegó tarde.** Tarjeta neutra con quién ha ganado, la palabra y los impostores.
- **Con varios impostores**, el resultado lista todos los nombres.
- **Salir de la sala.** Acción discreta accesible desde la píldora "Sala KTRM", con confirmación.
- **QR y enlace.** "Mostrar QR" abre un diálogo con el QR de `/sala/CODIGO`. "Copiar enlace" usa la API de compartir del sistema si existe y, si no, copia al portapapeles.
- **Cargando, sin conexión y sala inexistente.** Estados propios, con el mismo estilo. Sin conexión no se bloquea la pantalla: se muestra un aviso y se sigue enseñando la última foto.

## 7. Textos

- Español de España, tuteo y "vosotros". Tono directo y con algo de gracia, sin pasarse.
- Sin emojis en la interfaz.
- Los textos visibles se centralizan en un único módulo, no se reparten por los componentes.
- Mensajes de error en lenguaje llano y con salida: qué ha pasado y qué puede hacer el jugador.

## 8. Sistema visual: Verbena

Fondo amarillo, bordes negros gruesos, sombras duras sin difuminar, tarjetas ligeramente torcidas. Se define como tokens de Tailwind; ningún componente lleva valores sueltos.

| Token | Valor | Uso |
| --- | --- | --- |
| `ground` | `#FFD23F` | Fondo de toda la aplicación |
| `ink` | `#111111` | Texto, bordes y sombras |
| `paper` | `#FFFFFF` | Tarjetas y botones secundarios |
| `tomato` | `#FF6B5E` | Acción principal, impostor |
| `sky` | `#7FD8FF` | Acento secundario, etiquetas |
| `lime` | `#B8F28A` | Positivo: votos recibidos, victoria |
| `lilac` | `#D9B8FF` | Acento, espectador |
| `orange` | `#FFB36B` | Acento, aviso |
| `ground-soft` | `#FFE98F` | Elementos apagados: desconectado, pendiente |
| `field` | `#FFF6D6` | Fondo de campos de texto |
| `field-error` | `#FFE1DE` | Campo con error |

- **Texto siempre `ink`** sobre cualquier color de la paleta, incluido `tomato`. Texto blanco solo sobre `ink`. Sobre `ink`, el titular destacado va en `ground`.
- **Tipografía:** Archivo Black para titulares, botones principales y el código de sala, en mayúsculas. Archivo (500 y 700) para todo lo demás. Se cargan con `next/font`.
- **Bordes:** 3 px `ink` en todo elemento con caja. Discontinuo para estados apagados o de espera.
- **Sombras:** desplazadas y sólidas, sin desenfoque. `6px 6px 0` en botón principal y tarjetas; `8px 8px 0` en la tarjeta protagonista. Sobre tarjeta `ink`, la sombra es `tomato`.
- **Radios:** 12–16 px en botones y fichas, 20–24 px en tarjetas, completo en píldoras y avatares.
- **Giro:** la tarjeta protagonista de cada pantalla gira ±1,5°; las píldoras y sellos, entre 3° y 4°. Nada más gira.
- **Tamaños:** botón principal de 64 px de alto; secundarios de 48–56 px; mínimo táctil 44 px.
- **Avatar:** círculo con la inicial y un color de la paleta asignado de forma estable según el orden de entrada en la sala.
- **Movimiento:** el botón se "hunde" al pulsar (se desplaza y pierde la sombra). Sin más animaciones en esta versión. Se respeta `prefers-reduced-motion`.

## 9. Contenido

- Unas **200 palabras en 10 categorías**, en una migración de datos.
- Categorías: Comida, Animales, Lugares, Objetos de casa, Deportes, Profesiones, Cine y series, Música, Transporte, Fiesta y ocio.
- Criterios: sustantivos o conceptos que conozca cualquier persona de veintitantos en España; una sola idea por entrada; nada ofensivo; sin nombres de personas reales; variedad de dificultad dentro de cada categoría.
- La lista inicial la escribe quien desarrolla. Fran la revisa y poda después; por eso se deja además un listado legible en `docs/PALABRAS.md`.
- La palabra la elige siempre el servidor. La tabla `words` no es legible desde el cliente.

## 10. Aplazado y riesgos conocidos

- **Limpieza de salas abandonadas.** No se hace en la primera versión. Cuando toque, la vía prevista es una tarea programada dentro de la base de datos (`pg_cron`) que borre salas con `last_activity_at` antiguo; `last_activity_at` ya se mantiene para eso.
- **Pausa del plan gratuito.** Supabase pausa los proyectos gratuitos tras 7 días de baja actividad. Mitigación prevista y no incluida: una petición programada desde fuera cada pocos días. Hasta entonces, conviene abrir la app antes de la fiesta.
- **Abuso del inicio anónimo.** Cualquiera puede crear identidades y salas. Para un grupo de amigos no importa; si se hace pública, hará falta CAPTCHA y límites.
- **Identidad ligada al navegador.** Ver "Identidad".
- **Dos pestañas del mismo navegador** son el mismo jugador. Es correcto y no se trata como caso especial.

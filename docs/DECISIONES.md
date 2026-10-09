# Decisiones

## 2026-10-09 · 8.3 · `votes` y votarse a sí mismo

`votes` tiene `check (voter_id <> target_id)` y `01_schema` comprueba que una inserción así falla con `23514`, pero en `probable` uno puede votarse a sí mismo y `docs/JUEGOS.md` dice que `votes` se reutiliza tal cual. Se resuelve en la 9.1 con una migración que cambia el `check` por un disparador que lanza la misma violación (`check_violation`) solo si la partida es de El impostor. La prueba existente sigue pasando sin tocarla y El impostor conserva la garantía en la propia tabla.
Descartado: quitar la restricción y cambiar la prueba, que pierde una defensa de El impostor; una tabla de votos aparte para `probable`, que contradice `docs/JUEGOS.md`.

## 2026-10-09 · 8.3 · Columnas de `games` propias de El impostor

`games.word_id` e `impostor_count` son obligatorias y el `check` de `winner` exige ganador en toda partida terminada, pero los juegos por rondas no tienen palabra de partida, impostores ni bando ganador (el ganador sale de `game_players.score`). En la 9.1 pasan a admitir nulos y los `check` se condicionan a `game_type = 'impostor'`; para los demás juegos, `winner` es siempre nulo. Las partidas de El impostor quedan exactamente igual de restringidas.
Descartado: rellenar esas columnas con valores de mentira en los juegos nuevos.

## 2026-10-09 · 8.3 · `has_responded` se calcula, no se guarda

La foto de los juegos nuevos lleva `has_responded` por participante. En vez de otra columna que haya que reiniciar en cada fase (como `has_voted` en El impostor), se deduce de si existe su voto o su respuesta en la ronda y fase en curso. `has_voted` se queda solo para El impostor, sin cambios.
Descartado: reutilizar `has_voted` con otro significado según el juego.

## 2026-10-09 · 8.3 · Participar en un juego por rondas

En El impostor participa quien está en `game_players` desde `start_game`. En los juegos por rondas se mantiene el mismo criterio y la incorporación tardía se hace insertando en `game_players` al abrir cada ronda a los miembros de la sala que aún no estén; `my.is_participant` sigue siendo "tiene fila en `game_players`". Quien se va conserva su fila con `alive = false`, como en El impostor, para que su nombre y sus puntos sigan saliendo.
Descartado: una columna aparte de "se incorpora en la ronda N".

## 2026-10-09 · 8.3 · Nombres y piezas que cambian más adelante

Lo que `docs/JUEGOS.md` nombra coincide con el código (`games.game_type`, `rooms.game`, `game_players.alive`, prefijo por juego en las funciones nuevas). Quedan anotadas para su tarea: el texto de `invalid_game` dice "jugad a El impostor" (se cambia en la 9.7); el selector lista "¿Quién lo dijo?" y "La bomba" como próximos (9.7 y 12.1); `private.pick_word` solo mira `games.word_id` y en la 11.2 tiene que mirar también `game_rounds.word_id`. Los votos repetidos de los juegos nuevos usan el código existente `already_voted`.
Descartado: adelantar esos cambios a la fase 8, que no debe cambiar el comportamiento.

## 2026-10-09 · 8.4 · Tareas de preparación sin producto propio

La 8.1 (leer) y la 8.2 (pasar las pruebas) no cambian ningún archivo, y la lista de tareas de la fase 8 no existía hasta la 8.4. Se marcan en el mismo commit que la 8.4, que se hace antes que la 8.3 para que esta pueda marcarse en su propio commit.
Descartado: commits vacíos para las tareas de lectura.

## 2026-10-09 · 7.5 · Revisión final contra CONTEXTO

Repasadas las secciones 1 a 10. Se cumple todo lo que pide la primera versión, con estas salvedades ya anotadas en su tarea: `leave_room` devuelve `null` en vez de una foto (2.5), los textos son neutros en género (1.6) y el color de tema repite `#ffd23f` (1.4). Se ha arreglado un incumplimiento de §7: varios mensajes de error decían qué había pasado pero no qué podía hacer el jugador; ahora todos tienen las dos partes y un test lo comprueba. Las búsquedas de reglas de `CLAUDE.md` (sin `as` salvo `as const`, sin estilos en línea ni valores arbitrarios, sin `from()` en el cliente, sin `service_role`, sin menciones prohibidas en los commits) salen limpias.
Descartado: nada pendiente que deba anotarse como incumplido.

## 2026-10-09 · 7.4 · CI con dos trabajos y solo Postgres para pgTAP

El flujo `.github/workflows/ci.yml` corre en cada push y pull request: un trabajo con `npm run check` y otro con `npx supabase db start` (solo Postgres, sin el resto de servicios) y `npm run test:db`. No hay remoto `origin`, así que no se ha ejecutado en GitHub; sus pasos de base de datos se han reproducido en local partiendo de un Postgres vacío (`supabase stop --no-backup`) y pasan las 291 pruebas.
Descartado: `supabase start` completo en CI, que tarda más y levanta servicios que pgTAP no usa. Los e2e tampoco van al CI porque el plan no lo pide y necesitan el entorno completo.

## 2026-10-08 · 6.1 · Cómo corren los e2e

Playwright arranca `next dev` en el puerto 3123 (o reutiliza uno abierto) contra el Supabase local, con el Chrome del sistema (`channel: 'chrome'`), vista de móvil de 390 × 844 y un contexto por jugador, que es una sesión anónima distinta como un móvil distinto. Un solo trabajador y sin reintentos: un fallo intermitente tiene que verse, no taparse.
Descartado: reintentos automáticos, que esconderían justo los fallos de sincronización que estas pruebas buscan.

## 2026-10-08 · 6.1 · Límite local de inicios anónimos

En `supabase/config.toml` se sube `auth.rate_limit.anonymous_users` de 30 a 1000 por hora: cada pasada de e2e crea una docena de jugadores anónimos y el criterio de aceptación pide tres pasadas seguidas. Solo afecta al entorno local; en producción el límite se ajusta en el panel de Supabase (anotado para `docs/DESPLIEGUE.md`).
Descartado: esperar una hora entre pasadas.

## 2026-10-08 · 5.6 · Echar a un desconectado durante la partida

CONTEXTO §2 permite al anfitrión echar durante una partida a un jugador desconectado, pero ninguna pantalla lo dibuja. Se resuelve con los componentes existentes en la espera de votos (09), que es donde un desconectado bloquea: el anfitrión toca su ficha y confirma con el mismo diálogo que en la sala de espera. El diálogo pasa a pintarlo el contenedor para servir a las dos pantallas.
Descartado: añadirlo también al reparto, donde un desconectado no impide nada porque el anfitrión decide cuándo se vota.

## 2026-10-08 · 5.6 · Repaso de variantes de CONTEXTO §6

Revisadas una a una: caja de espera para quien no es anfitrión, anfitrión que aún no ha votado (08) y cierra en la 09, anfitrión eliminado con el botón de la fase (12), sellos y título "Se ha ido" de la revelación, empate sin votos, resultado neutro para quien llegó tarde, varios impostores en el resultado, salir desde la píldora con confirmación, QR y enlace, y estados de cargando, sin conexión y sala inexistente. Todas tienen test.

## 2026-10-08 · 5.1–5.5 · Un solo commit para las pantallas de partida

Las tareas 5.1 a 5.5 comparten el contenedor `Room` (que elige la pantalla según `viewFor`) y los controles del anfitrión, que son el mismo componente para todas las fases. Partirlas en cinco commits obligaba a escribir versiones intermedias del contenedor que nunca iban a existir, así que van juntas en un commit y la 5.6 (repaso de variantes) en otro.
Descartado: commits intermedios con pantallas que el contenedor aún no usa, que dejarían archivos sin usar en cada uno.

## 2026-10-08 · 5.x · Los controles del anfitrión no dependen de la pantalla

El pie de cada pantalla de partida sale de la fase, no de la vista: el anfitrión ve el botón que avanza la fase (pasar a votación, cerrar votación, seguir, volver a jugar) también si está eliminado (12) o si es un anfitrión que llegó tarde tras un traspaso (05). Así la partida nunca se queda sin nadie que la pueda avanzar. Los demás ven la caja de espera con el nombre del anfitrión.
Descartado: botones solo en las pantallas dibujadas, que dejaban atascada la partida si el anfitrión no participaba.

## 2026-10-08 · D.1 · Tamaño de la palabra medido, no estimado

La palabra secreta y los titulares con nombre eligen su tamaño según su palabra más larga. Los umbrales salen de medir en el navegador, a 360 px, el ancho real de las 200 palabras en Archivo Black: hasta 4 letras 68 px, hasta 6 48 px, hasta 8 38 px, 9 32 px, hasta 11 28 px, 12 24 px y más 20 px. Comprobado con las 200 palabras a 360, 390 y 430 px: ninguna se parte.
Descartado: una estimación previa de 0,7 em por letra, que dejaba fuera 47 palabras.

## 2026-10-08 · 5.5 · "Volver a jugar" cuando ya no vale

Volver a jugar llama a `start_game` con los mismos impostores. Si falla porque se ha ido gente (`not_enough_players` o `invalid_impostor_count`), se llama a `back_to_lobby` y el anfitrión ajusta en la sala de espera, sin mensaje de error.
Descartado: mostrar el error y dejar al anfitrión en el resultado, que no tiene forma de cambiar los impostores.

## 2026-10-08 · 3.8 · QR dibujado como SVG con `qrcode`

Se instala `qrcode` (permitida) y `@types/qrcode` como dependencia de desarrollo: son solo sus tipos, necesarios con TypeScript estricto. El QR se dibuja como SVG a partir de la matriz que da `qrcode.create`, con los tokens de color (`fill-ink`, `bg-paper`); así no hay imágenes ni valores de color sueltos y se calcula sin efectos. El diálogo solo pinta su contenido abierto, para no calcular el QR si nadie lo mira.
Descartado: `toDataURL` en una imagen, que es asíncrono y obliga a pasarle colores en hexadecimal.

## 2026-10-08 · 3.8 · Compartir: hoja del sistema, portapapeles y salida

"Copiar enlace" abre la hoja de compartir del sistema si existe; si el jugador la cierra no se hace nada más. Si no existe o falla, copia el enlace y el botón pasa a decir "Enlace copiado". Si tampoco se puede copiar, se muestra el código para dictarlo.
Descartado: copiar siempre, que en el móvil es peor que la hoja de compartir.

## 2026-10-08 · 3.7 · Echar tocando la ficha, con confirmación

La referencia no dibuja cómo se echa. Un botón con aspa dentro de cada ficha dejaba los nombres en "L…" a 360 px, así que el anfitrión toca la ficha del jugador (botón con `aria-label` "Echar a Lucía") y un diálogo le pide confirmar. Además evita echar a alguien sin querer.
Descartado: el aspa en la ficha, por falta de sitio; echar sin confirmar, por los toques accidentales.

## 2026-10-08 · 3.7 · "Empezar partida" llega con la fase 5

`start_game` no existe hasta la 4.2, así que la sala de espera de la fase 3 muestra el selector de impostores pero todavía no el botón "Empezar partida". Se añade en la 5.1, cuando hay una RPC a la que llamar.
Descartado: un botón que no hace nada o que siempre falla.

## 2026-10-08 · 3.7 · La 03 se abre con `?nueva=1`

`create_room` lleva a `/sala/CODIGO?nueva=1`; con ese parámetro el anfitrión ve primero la pantalla 03, que es una subvista local de la sala de espera. Al abrir la sala se quita el parámetro con `history.replaceState`, para que recargar no vuelva al selector. Con un solo juego disponible, la tarjeta de El impostor se muestra elegida y no es un botón.
Descartado: guardar en el navegador que la sala es nueva, que es estado que puede quedarse viejo.

## 2026-10-08 · 3.6 · Entrar en la sala llamando a `join_room` sin nombre

Al abrir `/sala/CODIGO` no se sabe si el jugador ya es miembro, y las RPC de la sala piden su id. Se llama a `join_room(code, '')`: si ya era miembro devuelve la foto (reconexión); si no, falla con `name_invalid` y se pide el nombre; con `room_not_found` se muestra que no existe. No hace falta ninguna RPC nueva.
Descartado: guardar el id de la sala en el navegador, que no sirve en otro dispositivo y es otra entrada externa que validar.

## 2026-10-08 · 3.4 · Reintentos y fotos con la misma versión

Tras un fallo de red la foto se vuelve a pedir a los 1, 2, 4 y 8 s, y después cada 10 s como siempre: en una fiesta los cortes suelen ser breves y así se recupera antes. Cada respuesta programa la siguiente petición, para no solapar peticiones con la red lenta. Con la misma `version` se acepta la foto con `server_time` más reciente, porque la conexión de los jugadores cambia sin subir la versión.
Descartado: un intervalo fijo de 10 s también tras fallar, que deja al jugador hasta 10 s con el aviso de "sin conexión" después de recuperarla.

## 2026-10-08 · 3.4 · `room_not_found` y `not_member` cierran la sincronización

Si la sala desaparece o te han echado, el hook deja de pedir la foto y la vista muestra "sala inexistente".
Descartado: seguir sondeando, que solo repetiría el mismo error.

## 2026-10-08 · 2.5 · Expulsar a media partida antes de que exista la partida

`kick_player` ya aplica la regla de CONTEXTO (en partida, solo a un desconectado) y quita al miembro, pero todavía no marca la eliminación en la partida: eso es la tarea 4.4, cuando existan `start_game` y las fases.
Descartado: escribir ahora la lógica de abandono sin las funciones de partida que la prueban.

## 2026-10-08 · 2.5 · `leave_room` devuelve `null`

CONTEXTO dice que las acciones devuelven la foto para quien llama, pero quien sale deja de ser miembro y no tiene foto. `leave_room` devuelve `null` y el cliente vuelve al inicio.
Descartado: devolver una foto sin `me`, que obligaría al cliente a tratar un estado que no existe.

## 2026-10-08 · 2.5 · Orden de las comprobaciones de `join_room`

Primero se busca y bloquea la sala por código (`room_not_found`); si quien llama ya es miembro, se devuelve el estado sin validar el nombre (reconexión). Después: nombre válido, sala llena y nombre repetido. Los códigos se aceptan en minúsculas y con espacios alrededor.
Descartado: validar el nombre antes que la sala, porque a quien reconecta le daría un error de nombre que no ha escrito.

## 2026-10-08 · 2.2 · `joined_at` con `clock_timestamp()`

`joined_at` usa `clock_timestamp()` y no `now()`, para que dos entradas en la misma transacción tengan orden distinto: decide el traspaso de anfitrión y el color del avatar.
Descartado: `now()`, que empata dentro de una transacción.

## 2026-10-08 · 1.7 · Playwright instalado antes de la fase 6

Se instala `@playwright/test` (permitido en `CLAUDE.md`) para comparar `/dev/componentes` con la referencia a 360, 390 y 430 px y medir desbordes. Usa el Chrome del sistema (`channel: 'chrome'`), sin descargar navegadores. Las capturas se hacen con un guion temporal fuera del repositorio; los e2e llegan en la fase 6.
Descartado: Chrome en modo headless por línea de comandos, porque impone un ancho mínimo de ventana de unos 500 px y las capturas de móvil salían falseadas.

## 2026-10-08 · 1.7 · `/dev/componentes` se excluye con `notFound()`

La página llama a `notFound()` si `NODE_ENV` es `production`, así que en producción responde 404. Comprobado con `next build` y `next start`.
Descartado: excluirla por configuración de rutas o `pageExtensions`, más frágil y difícil de probar con un test.

## 2026-10-08 · 1.6 · Textos sin género gramatical del jugador

La app no sabe el género de cada jugador, así que donde la referencia usa formas femeninas por los datos de ejemplo se usa una forma neutra: "Sin conexión" en vez de "Desconectada" y "no puedes votar por ti" en vez de "votarte a ti misma". Los textos de espera que la referencia no dibuja ("Fran cerrará la votación", "Fran decide cuándo seguir"…) siguen el patrón de "Fran decide cuándo se vota".
Descartado: "Desconectado/a", que se lee peor en una ficha pequeña.

## 2026-10-08 · 1.4 · Tokens de Tailwind más allá de la paleta

Se anulan los colores, sombras y radios por defecto de Tailwind, así que solo existen los de Verbena. Además de la paleta se definen como tokens las sombras duras (`shadow-hard`, `shadow-hard-lg` y sus variantes `tomato`), los radios por uso (`control`, `chip`, `button`, `card`, `hero`), los tamaños de texto que usa la referencia y que Tailwind no trae, y utilidades para los giros (`tilt-*`) y el hundido del botón (`press`). El color de tema del `viewport` repite `#ffd23f` porque Next lo necesita como texto; un test comprueba que coincide con `--color-ground`.
Descartado: valores arbitrarios (`text-[84px]`, `rotate-[-1.5deg]`) en los componentes, porque reparten valores sueltos.

## 2026-10-08 · 1.2 · Reglas de lint que hacen cumplir CLAUDE.md

ESLint usa `noInlineConfig` (cualquier `eslint-disable` deja de tener efecto y avisa, y el aviso falla con `--max-warnings 0`), prohíbe `enum`, clases, `console`, comentarios `TODO`, `@ts-ignore`/`@ts-expect-error` y exportaciones `default` salvo en los archivos que Next exige. Prettier no toca `CLAUDE.md`, `docs/CONTEXTO.md` ni `docs/PLAN.md`.
Descartado: confiar solo en la revisión manual, porque estas reglas se pueden comprobar solas.

## 2026-10-08 · 1.2 · `typecheck` genera antes los tipos de Next

`typecheck` es `next typegen && tsc --noEmit`, para que `next-env.d.ts` (ignorado por git) y los tipos de rutas existan sin haber compilado antes.
Descartado: versionar `next-env.d.ts`, porque Next lo regenera y lo recomienda ignorar.

## 2026-10-08 · 1.1 · Versiones fijadas de TypeScript y ESLint

Se usa TypeScript 6.0 y no la 7.0 (última), porque typescript-eslint solo admite `<6.1`. Por lo mismo, ESLint será la 9 y no la 10: los plugins que trae eslint-config-next no declaran compatibilidad con la 10. Las versiones se instalan exactas.
Descartado: forzar las últimas con `--legacy-peer-deps`, porque oculta incompatibilidades reales.

## 2026-10-08 · 1.1 · Proyecto creado a mano, sin create-next-app

Se escriben `package.json`, `tsconfig.json` y la app mínima a mano. Hasta que exista `npm run check` (tarea 1.2), la 1.1 se verifica con `next build`.
Descartado: create-next-app, que añade código de ejemplo, ESLint y Tailwind antes de sus tareas.

## 2026-10-08 · 0.3 · Finales de línea LF en el repositorio

Se añade `.gitattributes` con `* text=auto eol=lf`. Con `core.autocrlf=true` en Windows, el gancho `commit-msg` saldría con CRLF en otros clones y `sh` fallaría; además Prettier espera LF.
Descartado: cambiar `core.autocrlf` en local, porque no viaja con el repositorio.

## 2026-10-08 · 0.1 · Definición de hecho en la fase 0

En la fase 0 todavía no existe proyecto de npm, así que `npm run check` no se puede ejecutar. Las tareas de esta fase se dan por hechas con su propia comprobación (la indicada en la aceptación de la fase).
Descartado: adelantar la creación de `package.json` desde la fase 1, porque rompería el orden del plan.

## 2026-10-08 · 0.1 · Lista de tareas versionada y copia local

`docs/TAREAS.md` se versiona, como exigen `CLAUDE.md` y `docs/PLAN.md`. Fran mantiene además una copia personal en `docs/TAREAS.local.md`, ignorada por git (`*.local.md`), que se actualiza a la vez.
Descartado: llevar el seguimiento solo en local, porque la definición de hecho obliga a marcar cada tarea en el mismo commit.

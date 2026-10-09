# Tareas

Estado: fase 8 terminada, fase 9 pendiente · última actualización 2026-10-09

## Fase 0 · Preparación

- [x] 0.1 Crear `docs/TAREAS.md` y `docs/DECISIONES.md`
- [x] 0.2 Comprobar requisitos: versión de Node, que Docker responde y que `npx supabase --version` funciona (Node v24.20.0, npm 11.19.0, Supabase CLI 2.120.0; Docker no instalado)
- [x] 0.3 Gancho `.githooks/commit-msg` que rechace `Co-Authored-By`, `Generated with`, `Claude` o `Anthropic`; activarlo con `git config core.hooksPath .githooks` y documentarlo en el README
- [x] 0.4 `.gitignore` y `.env.example` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Aceptación: existen los dos documentos; un commit de prueba con `Co-Authored-By` es rechazado.

## Fase 1 · Esqueleto de la aplicación

- [x] 1.1 App de Next (App Router, TypeScript, `src/`, sin código de ejemplo); `tsconfig` con `strict`, `noUncheckedIndexedAccess` y `noImplicitOverride`
- [x] 1.2 ESLint estricto y Prettier; scripts `lint`, `typecheck`, `test`, `test:db`, `test:e2e`, `format` y `check`
- [x] 1.3 Vitest con un test de humo
- [x] 1.4 Tailwind v4 con tokens de Verbena (CONTEXTO §8); fuentes Archivo y Archivo Black con `next/font`; metadatos, `lang="es"`, `viewport` y color de tema
- [x] 1.5 Componentes base: `Screen`, `Button`, `Card`, `Pill`, `Avatar`, `PlayerChip`, `WaitingBox`, `TextField`, `Dialog`
- [x] 1.6 Módulo único de textos (`src/lib/copy.ts`)
- [x] 1.7 Página `/dev/componentes`, excluida en producción

Aceptación: `npm run check` pasa; `/dev/componentes` a 390 px se parece a la referencia.

## Fase 2 · Base de datos: salas

- [x] 2.1 `supabase init`, inicio de sesión anónimo en `config.toml`, `supabase start` funciona
  - [x] 2.1a `supabase init` y `enable_anonymous_sign_ins = true` en `supabase/config.toml`
  - [x] 2.1b Comprobar que `supabase start` levanta el entorno local
- [x] 2.2 Migración del esquema: `rooms`, `room_players`, `games`, `game_players`, `game_roles`, `votes`, `words` (CONTEXTO §4)
- [x] 2.3 Migración de seguridad: RLS, esquema `private`, `private.is_room_member`, política de lectura de `rooms`, Realtime, `revoke`/`grant`
- [x] 2.4 Funciones auxiliares en `private`: código libre, subir versión, miembro y anfitrión, errores con código, foto del estado, traspasar anfitrión
- [x] 2.5 RPC de sala: `create_room`, `join_room`, `get_room_state`, `set_game`, `kick_player`, `leave_room`
- [x] 2.6 Pruebas pgTAP de todo lo anterior (accesos directos, salas ajenas, códigos, `join_room`, permisos de anfitrión, `leave_room`, traspaso automático, versión estable)

Aceptación: `npm run test:db` pasa tras `supabase db reset`.

## Fase 3 · La sala en la aplicación

- [x] 3.1 Cliente de Supabase e inicio de sesión anónimo perezoso; variables de entorno validadas
- [x] 3.2 Tipos de la foto del estado y validación en tiempo de ejecución
- [x] 3.3 Capa de acciones por RPC y traducción de códigos de error
- [x] 3.4 Hook de sincronización (foto inicial, Realtime, sondeo 10 s, primer plano, reconexión, descarte de fotos antiguas, limpieza) con tests
- [x] 3.5 Función pura `viewFor(snapshot)` con tests de la tabla de CONTEXTO §6
- [x] 3.6 Pantallas 01 (Inicio) y 02 (Tu nombre)
- [x] 3.7 Pantallas 03 (Elegir juego) y 04 (Sala de espera)
- [x] 3.8 Compartir: diálogo con QR y botón de enlace
- [x] 3.9 Screen Wake Lock en la sala
- [x] 3.10 Estados de cargando, sin conexión y sala inexistente; salir con confirmación

Aceptación: dos navegadores en local: crear, unirse por código y enlace, lista en directo, traspaso de anfitrión, recarga sin pedir nombre.

## Fase 4 · Base de datos: El impostor

- [x] 4.1 Migración de palabras (CONTEXTO §9) y `docs/PALABRAS.md`
- [x] 4.2 `start_game`: validaciones, palabra sin repetir, reparto de roles
- [x] 4.3 `open_voting`, `cast_vote`, `close_voting`, `continue_game`, `back_to_lobby`
- [x] 4.4 Abandono y expulsión a media partida en las cuatro fases
- [x] 4.5 Foto del estado con `game`
- [x] 4.6 Pruebas pgTAP (secreto, `start_game`, reparto, `cast_vote`, `close_voting`, victorias, dos impostores, abandonos, palabras sin repetir, entrar tarde)

Aceptación: `npm run test:db` pasa desde cero.

## Fase 5 · El impostor en la aplicación

- [x] 5.1 Pantallas 06 y 07 (reparto), y el botón "Empezar partida" de la sala de espera (ver DECISIONES 3.7)
- [x] 5.2 Pantallas 08 y 09 (votación y espera)
- [x] 5.3 Pantallas 10 y 11 (revelación y empate)
- [x] 5.4 Pantallas 12 (eliminado) y 05 (entrar tarde)
- [x] 5.5 Pantallas 13 y 14 (resultado), volver a jugar y cambiar de juego
- [x] 5.6 Variantes de CONTEXTO §6 no dibujadas

Aceptación: tres navegadores juegan dos partidas seguidas; nada desborda a 360 px.

## Fase 6 · Pruebas de extremo a extremo

- [x] 6.1 Partida feliz con 3 jugadores
- [x] 6.2 Reconexión a media partida
- [x] 6.3 Entrar tarde y jugar la siguiente
- [x] 6.4 Empate y segunda votación
- [x] 6.5 Secreto en el cliente (red y almacenamiento)

Aceptación: `npm run test:e2e` pasa tres veces seguidas.

## Fase 7 · Cierre

- [x] 7.1 Accesibilidad
- [x] 7.2 `README.md`
- [x] 7.3 `docs/DESPLIEGUE.md`
- [x] 7.4 GitHub Actions con `check` y `test:db`
- [x] 7.5 Revisión final contra CONTEXTO
- [x] 7.6 `docs/INFORME.md`

Aceptación: `check`, `test:db` y `test:e2e` pasan; `npm run build` sin avisos; el informe existe.

## Fase 8 · Preparación de la segunda tanda

- [x] 8.1 Leer `docs/JUEGOS.md`, `docs/DECISIONES.md` e `docs/INFORME.md`; recorrer migraciones, funciones SQL, tipos de la foto, `viewFor` y pantallas de El impostor
- [x] 8.2 Comprobar que las tres baterías pasan antes de tocar nada (340 unitarios, 291 pgTAP, 8 e2e)
- [x] 8.3 Anotar en `docs/DECISIONES.md` las diferencias entre `docs/JUEGOS.md` y el código, y cómo se resuelven
- [x] 8.4 Añadir las fases 8–13 a `docs/TAREAS.md`
- [x] 8.5 El impostor en su propia carpeta de juego; la sala elige el juego por `game.type`, sin cambios de comportamiento
- [x] 8.6 `type` en la foto de El impostor y esquema de `game` como unión discriminada de una variante

Aceptación: todas las pruebas existentes pasan sin cambiar ninguna aserción; la app se comporta igual.

## Fase 9 · ¿Quién es más probable que…?

- [ ] 9.1 Migración de esquema: `rooms.game` y `games.phase` admiten el juego, `games.total_rounds`, `game_players.score`, tablas `prompts` y `game_rounds`, con RLS y sin políticas
- [ ] 9.2 Migración de datos con las preguntas de `probable` y primera versión de `docs/PREGUNTAS.md`
- [ ] 9.3 `set_game` acepta `probable`; `probable_start`, `probable_vote`, `probable_close`, `probable_next`
- [ ] 9.4 Reglas por rondas: avance automático, incorporación de tardíos al abrir ronda, abandono y expulsión, final anticipado con menos de 3 activos
- [ ] 9.5 Variante `probable` en `get_room_state`
- [ ] 9.6 Pruebas pgTAP de `probable`
- [ ] 9.7 Sala de espera con selector de rondas; selector de juegos con `probable` elegible y su portada
- [ ] 9.8 Pantallas de `probable` y su `viewFor`, con tests unitarios
- [ ] 9.9 Prueba e2e: 5 rondas con 3 jugadores, con cambio desde El impostor en la misma sala

Aceptación: las tres baterías pasan; en una sala se juega a El impostor, se cambia a `probable`, se juega y se vuelve.

## Fase 10 · ¿Quién lo dijo? y extracción de lo común

- [ ] 10.1 Migración: tabla `answers`; `rooms.game` y `games.phase` admiten `quien_lo_dijo`
- [ ] 10.2 Migración de datos con las preguntas de `quien_lo_dijo`; ampliar `docs/PREGUNTAS.md`
- [ ] 10.3 Extraer lo común de `probable` a auxiliares en `private`; `probable` pasa a usarlas sin tocar sus pruebas
- [ ] 10.4 `quien_lo_dijo_start`, `_answer`, `_close_writing`, `_vote`, `_close_voting`, `_next`
- [ ] 10.5 Variante `quien_lo_dijo` en `get_room_state`
- [ ] 10.6 Pruebas pgTAP de `quien_lo_dijo`
- [ ] 10.7 Componentes comunes de juegos por rondas en el cliente; `probable` pasa a usarlos
- [ ] 10.8 Pantallas de `quien_lo_dijo` y su `viewFor`, con tests unitarios
- [ ] 10.9 Prueba e2e: 5 rondas con 4 jugadores, sin autor en la red antes de la revelación

Aceptación: las tres baterías pasan; no queda lógica duplicada entre los dos juegos en las piezas de 10.3 y 10.7.

## Fase 11 · Una sola pista

- [ ] 11.1 Migración: `rooms.game` y `games.phase` admiten `una_pista`; normalización de texto con sus pruebas
- [ ] 11.2 `una_pista_start`, `_clue`, `_close_writing`, `_toggle_clue`, `_show_clues`, `_mark`, `_next`; adivino por turno y árbitro
- [ ] 11.3 Variante `una_pista` en `get_room_state`
- [ ] 11.4 Pruebas pgTAP de `una_pista`
- [ ] 11.5 Pantallas de `una_pista` y su `viewFor`, con tests unitarios
- [ ] 11.6 Prueba e2e: 5 rondas con 4 jugadores, pista duplicada y anulada a mano, sin palabra en la red del adivino

Aceptación: las tres baterías pasan.

## Fase 12 · Selector y repaso conjunto

- [ ] 12.1 Selector de juegos definitivo: cuatro elegibles, dos "Próximamente", sin "La bomba"
- [ ] 12.2 Botón de empezar desactivado, con explicación, si faltan jugadores
- [ ] 12.3 Entrar tarde con el texto según el juego
- [ ] 12.4 Repaso a 360, 390 y 430 px con nombres de 14, 16 jugadores, respuestas de 80 y pistas de 20
- [ ] 12.5 Repaso de accesibilidad de las pantallas nuevas
- [ ] 12.6 Prueba e2e de sesión larga: los cuatro juegos seguidos con una recarga a mitad de cada uno

Aceptación: las tres baterías pasan tres veces seguidas sin fallos intermitentes.

## Fase 13 · Cierre de la segunda tanda

- [ ] 13.1 `README.md` con los cuatro juegos y la estructura por carpetas
- [ ] 13.2 `docs/DESPLIEGUE.md` si las migraciones nuevas piden algún paso
- [ ] 13.3 Revisión final contra `docs/JUEGOS.md` y "Fuera de alcance"
- [ ] 13.4 Ampliar `docs/INFORME.md` con esta tanda

Aceptación: `check`, `test:db`, `test:e2e` y `build` pasan sin avisos.

## Bloqueos

- Ninguno. (Resuelto: Docker Desktop instalado. Su `docker.exe` está en `AppData\Local\Programs\DockerDesktop\resources\bin` y no en el PATH de Git Bash, pero la CLI de Supabase lo encuentra.)

## Descubierto por el camino

- [x] D.1 (para 5.1 y 5.5) Ajustar el tamaño de la palabra y de los titulares a su longitud: a 360 px una palabra de 6 letras en `text-display-lg` ya no cabe en la tarjeta protagonista. La `Card` parte palabras para no desbordar, pero partir la palabra secreta queda mal.

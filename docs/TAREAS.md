# Tareas

Estado: fase 4 en curso · última actualización 2026-10-08

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
- [ ] 4.4 Abandono y expulsión a media partida en las cuatro fases
- [ ] 4.5 Foto del estado con `game`
- [ ] 4.6 Pruebas pgTAP (secreto, `start_game`, reparto, `cast_vote`, `close_voting`, victorias, dos impostores, abandonos, palabras sin repetir, entrar tarde)

Aceptación: `npm run test:db` pasa desde cero.

## Fase 5 · El impostor en la aplicación

- [ ] 5.1 Pantallas 06 y 07 (reparto), y el botón "Empezar partida" de la sala de espera (ver DECISIONES 3.7)
- [ ] 5.2 Pantallas 08 y 09 (votación y espera)
- [ ] 5.3 Pantallas 10 y 11 (revelación y empate)
- [ ] 5.4 Pantallas 12 (eliminado) y 05 (entrar tarde)
- [ ] 5.5 Pantallas 13 y 14 (resultado), volver a jugar y cambiar de juego
- [ ] 5.6 Variantes de CONTEXTO §6 no dibujadas

Aceptación: tres navegadores juegan dos partidas seguidas; nada desborda a 360 px.

## Fase 6 · Pruebas de extremo a extremo

- [ ] 6.1 Partida feliz con 3 jugadores
- [ ] 6.2 Reconexión a media partida
- [ ] 6.3 Entrar tarde y jugar la siguiente
- [ ] 6.4 Empate y segunda votación
- [ ] 6.5 Secreto en el cliente (red y almacenamiento)

Aceptación: `npm run test:e2e` pasa tres veces seguidas.

## Fase 7 · Cierre

- [ ] 7.1 Accesibilidad
- [ ] 7.2 `README.md`
- [ ] 7.3 `docs/DESPLIEGUE.md`
- [ ] 7.4 GitHub Actions con `check` y `test:db`
- [ ] 7.5 Revisión final contra CONTEXTO
- [ ] 7.6 `docs/INFORME.md`

Aceptación: `check`, `test:db` y `test:e2e` pasan; `npm run build` sin avisos; el informe existe.

## Bloqueos

- Ninguno. (Resuelto: Docker Desktop instalado. Su `docker.exe` está en `AppData\Local\Programs\DockerDesktop\resources\bin` y no en el PATH de Git Bash, pero la CLI de Supabase lo encuentra.)

## Descubierto por el camino

- [ ] D.1 (para 5.1 y 5.5) Ajustar el tamaño de la palabra y de los titulares a su longitud: a 360 px una palabra de 6 letras en `text-display-lg` ya no cabe en la tarjeta protagonista. La `Card` parte palabras para no desbordar, pero partir la palabra secreta queda mal.

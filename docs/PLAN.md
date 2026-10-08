# La Previa: plan de actuación

Este plan está escrito para ejecutarse **sin supervisión**. Nadie va a contestar preguntas mientras trabajas. Lee antes `CLAUDE.md` (cómo programar) y `docs/CONTEXTO.md` (qué se construye y por qué).

## Cómo trabajar

1. **Antes de nada**, crea `docs/TAREAS.md` y `docs/DECISIONES.md` como se describe abajo. Es la primera tarea de la fase 0.
2. Haz las fases en orden y, dentro de cada fase, las tareas en orden. Una tarea cada vez.
3. Una tarea está hecha cuando cumple la "Definición de hecho" de `CLAUDE.md`. Entonces: márcala en `docs/TAREAS.md` y haz **un commit** que incluya ese cambio.
4. No empieces una fase hasta que la anterior cumpla sus criterios de aceptación.
5. Al terminar cada fase, vuelve a leer este plan y `docs/TAREAS.md` antes de seguir.

### Si algo no está claro

No preguntes y no te pares. Elige la opción **más simple que sea coherente con `docs/CONTEXTO.md`**, apúntala en `docs/DECISIONES.md` y sigue. Si la duda toca seguridad o secreto del juego, elige siempre la opción más restrictiva.

### Si algo te bloquea

Un bloqueo es algo que no puedes resolver tú: falta Docker, falta una credencial, un servicio externo no responde.

1. Anótalo en la sección "Bloqueos" de `docs/TAREAS.md`: qué tarea, qué falta y qué tiene que hacer Fran.
2. Marca la tarea como bloqueada y pasa a la siguiente que **no dependa de ella**.
3. No finjas que funciona: nada de pruebas desactivadas, datos falsos o código que simule el servicio para que pase la verificación.
4. Si ya no queda ninguna tarea que puedas hacer, escribe el estado en `docs/INFORME.md` y termina.

### Formato de `docs/TAREAS.md`

```markdown
# Tareas

Estado: fase N en curso · última actualización AAAA-MM-DD

## Fase 0 · Preparación
- [x] 0.1 Crear TAREAS.md y DECISIONES.md
- [ ] 0.2 …
- [!] 0.3 … (bloqueada: ver Bloqueos)

## Bloqueos
- 0.3 · Falta Docker en la máquina. Fran: instalar y arrancar Docker Desktop.

## Descubierto por el camino
- Cosas que hacen falta y no estaban en el plan. Se añaden aquí como tareas con número propio.
```

Copia en él todas las tareas de este plan, con su numeración. Puedes dividir una tarea en subtareas; no puedes borrar ni saltarte ninguna.

### Formato de `docs/DECISIONES.md`

Una entrada por decisión, la más reciente arriba: fecha, tarea, qué se decidió, qué alternativa se descartó y por qué, en tres o cuatro líneas.

## Lo que Fran deja preparado

Para desarrollar (todo en local, sin tocar la nube):

- Repositorio git iniciado con `CLAUDE.md`, `.claude/settings.json` y la carpeta `docs/` con `CONTEXTO.md`, `PLAN.md` y `referencia-pantallas.html`.
- Node en versión LTS y npm.
- Docker instalado y en marcha (lo necesita la base de datos local de Supabase).

Para publicar (lo hace Fran al final, a mano, siguiendo `docs/DESPLIEGUE.md`): proyecto de Supabase con el inicio de sesión anónimo activado y proyecto de Vercel. **No crees ni toques nada en la nube.**

---

## Fase 0 · Preparación

- **0.1** Crear `docs/TAREAS.md` y `docs/DECISIONES.md`.
- **0.2** Comprobar los requisitos: versión de Node, que Docker responde y que `npx supabase --version` funciona. Lo que falte va a Bloqueos.
- **0.3** Crear el gancho de git `.githooks/commit-msg` que rechace cualquier mensaje que contenga `Co-Authored-By`, `Generated with`, `Claude` o `Anthropic` (sin distinguir mayúsculas), y activarlo con `git config core.hooksPath .githooks`. Documentar ese comando en el README, porque la configuración no viaja con el repositorio.
- **0.4** `.gitignore` y `.env.example` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Aceptación:** existen los dos documentos; un commit de prueba con `Co-Authored-By` en el mensaje es rechazado.

## Fase 1 · Esqueleto de la aplicación

- **1.1** Crear la app de Next (App Router, TypeScript, carpeta `src/`, sin código de ejemplo). `tsconfig` con `strict`, `noUncheckedIndexedAccess` y `noImplicitOverride`.
- **1.2** ESLint (configuración de Next más reglas de TypeScript estrictas) y Prettier. Scripts de npm: `lint`, `typecheck`, `test`, `test:db`, `test:e2e`, `format` y `check` (= `lint` + `typecheck` + `test`).
- **1.3** Vitest con un test de humo.
- **1.4** Tailwind v4 con los tokens de Verbena de `docs/CONTEXTO.md` §8. Fuentes Archivo y Archivo Black con `next/font`. Metadatos, `lang="es"`, `viewport` para móvil y color de tema.
- **1.5** Componentes base, sin lógica: `Screen` (marco de pantalla con cabecera), `Button` (principal, secundario, ancho completo), `Card` (normal, protagonista, oscura), `Pill`, `Avatar`, `PlayerChip`, `WaitingBox` (caja discontinua de espera), `TextField`, `Dialog`. Deben reproducir la referencia.
- **1.6** Módulo único de textos de la interfaz (`src/lib/copy.ts` o similar).
- **1.7** Página interna `/dev/componentes` con todos los componentes y variantes, excluida en producción.

**Aceptación:** `npm run check` pasa. `/dev/componentes` a 390 px de ancho se parece a la referencia: colores, bordes, sombras y tipografías correctos.

## Fase 2 · Base de datos: salas

- **2.1** `supabase init`. En `supabase/config.toml`, activar el inicio de sesión anónimo. Comprobar que `supabase start` levanta el entorno local.
- **2.2** Migración del esquema: tablas `rooms`, `room_players`, `games`, `game_players`, `game_roles`, `votes` y `words`, con sus restricciones, claves ajenas e índices (`docs/CONTEXTO.md` §4).
- **2.3** Migración de seguridad: RLS en todas las tablas, esquema `private`, `private.is_room_member`, la única política de lectura sobre `rooms`, `rooms` en la publicación de Realtime, y los `revoke`/`grant` de ejecución.
- **2.4** Funciones auxiliares en `private`: generar código libre, subir versión, comprobar miembro y anfitrión, lanzar errores con código, construir la foto del estado, traspasar anfitrión.
- **2.5** RPC de sala: `create_room`, `join_room`, `get_room_state`, `set_game`, `kick_player`, `leave_room`.
- **2.6** Pruebas pgTAP (`supabase test db`) de todo lo anterior. Como mínimo:
  - Un usuario autenticado no puede hacer `select`, `insert`, `update` ni `delete` directos en ninguna tabla, salvo leer su propia fila de `rooms`.
  - Un usuario no puede leer la fila de `rooms` de una sala ajena.
  - `create_room` genera códigos del alfabeto permitido.
  - `join_room`: sala inexistente, sala llena (16), nombre vacío o largo, nombre repetido con distinta capitalización, y reentrada del mismo usuario.
  - `kick_player` y `set_game` fallan si no eres anfitrión.
  - `leave_room` del anfitrión traspasa; del último miembro borra la sala.
  - Traspaso automático: anfitrión con `last_seen_at` de hace más de 90 s y otro miembro conectado.
  - `get_room_state` no sube la versión si no hay traspaso.

**Aceptación:** `npm run test:db` pasa desde una base de datos recién creada (`supabase db reset`).

## Fase 3 · La sala en la aplicación

- **3.1** Cliente de Supabase para el navegador e inicio de sesión anónimo perezoso. Variables de entorno validadas al arrancar.
- **3.2** Tipos de la foto del estado escritos a mano en un único archivo, con validación en tiempo de ejecución de lo que devuelve la RPC.
- **3.3** Capa de acciones: una función tipada por RPC, y traducción de códigos de error a textos.
- **3.4** Hook de sincronización de la sala (`docs/CONTEXTO.md` §4, "Sincronización"): foto inicial, suscripción a Realtime, sondeo cada 10 s, relectura al volver a primer plano y al recuperar conexión, descarte de fotos antiguas, limpieza al desmontar. Con tests unitarios de la lógica de versiones y de reintentos.
- **3.5** Función pura `viewFor(snapshot)` que decide qué pantalla toca, con tests unitarios de todos los casos de la tabla de `docs/CONTEXTO.md` §6.
- **3.6** Pantallas 01 (Inicio) y 02 (Tu nombre), con sus errores en línea. El código se escribe en mayúsculas y solo admite letras del alfabeto permitido.
- **3.7** Pantallas 03 (Elegir juego) y 04 (Sala de espera): lista en directo, estado de conexión, selector de impostores con sus límites, expulsar, y vista de no anfitrión.
- **3.8** Compartir: diálogo con QR y botón de enlace.
- **3.9** Screen Wake Lock mientras se está en una sala, recuperándolo al volver a primer plano.
- **3.10** Estados de cargando, sin conexión y sala inexistente. Salir de la sala con confirmación.

**Aceptación:** con dos navegadores contra el entorno local, uno crea la sala y el otro entra por código y por enlace; ambos ven la lista actualizarse; al cerrar la pestaña del anfitrión, el otro pasa a ser anfitrión tras el margen; recargar la página devuelve a la sala sin volver a pedir el nombre.

## Fase 4 · Base de datos: El impostor

- **4.1** Migración de datos con las palabras (`docs/CONTEXTO.md` §9) y listado legible en `docs/PALABRAS.md`.
- **4.2** `start_game`: validaciones, elección de palabra sin repetir en la sala, reparto de roles.
- **4.3** `open_voting`, `cast_vote`, `close_voting`, `continue_game`, `back_to_lobby`.
- **4.4** Abandono y expulsión a media partida, en las cuatro fases.
- **4.5** Ampliar la foto del estado con `game`.
- **4.6** Pruebas pgTAP. Como mínimo:
  - **Secreto:** antes de `finished`, la foto de un jugador normal no contiene el rol de nadie más ni identifica al impostor; la del impostor no contiene la palabra; ninguna contiene a quién ha votado otro ni recuentos. Tras `finished`, sí aparecen palabra e impostores.
  - `start_game`: menos de 3 jugadores, impostores de más (`2 × impostores ≥ jugadores`), no anfitrión, partida ya en curso.
  - El número de impostores repartidos coincide con el pedido.
  - `cast_vote`: fuera de fase, votarse a uno mismo, votar a un eliminado, votar dos veces, votar estando eliminado o sin participar.
  - `close_voting`: mayoría clara, empate, sin votos.
  - Victoria del grupo al caer el último impostor; victoria de los impostores al igualar en número.
  - Partida completa con dos impostores.
  - Abandono de un impostor y de un jugador normal en `talking` y en `voting`; los votos de la ronda se borran.
  - Volver a jugar no repite palabra mientras queden otras.
  - Quien entra tarde no participa y recibe `role` y `word` nulos.

**Aceptación:** `npm run test:db` pasa desde cero.

## Fase 5 · El impostor en la aplicación

- **5.1** Pantallas 06 y 07 (reparto), con las dos variantes de pie: botón del anfitrión o caja de espera.
- **5.2** Pantallas 08 y 09 (votación y espera de votos).
- **5.3** Pantallas 10 y 11 (revelación y empate), con todas las variantes de `outcome`.
- **5.4** Pantalla 12 (eliminado) y pantalla 05 (entrar tarde).
- **5.5** Pantallas 13 y 14 (resultado), "Volver a jugar" y "Cambiar de juego".
- **5.6** Repaso de variantes de `docs/CONTEXTO.md` §6 que no están dibujadas.

**Aceptación:** tres navegadores contra el entorno local juegan una partida entera y una segunda en la misma sala. Ninguna pantalla desborda ni recorta contenido a 360 px de ancho.

## Fase 6 · Pruebas de extremo a extremo

Playwright contra el entorno local, con un contexto de navegador por jugador y vista de móvil.

- **6.1** Partida feliz con 3 jugadores: crear, unirse, repartir, votar, revelar, resultado, volver a jugar.
- **6.2** Reconexión: un jugador recarga la página a media partida y sigue viendo su palabra.
- **6.3** Entrar tarde: un cuarto jugador entra con la partida empezada y juega la siguiente.
- **6.4** Empate y segunda votación.
- **6.5** Secreto en el cliente: durante la partida, las respuestas de red que recibe un jugador normal no contienen ningún rol ajeno ni `impostor_ids`, y las que recibe el impostor no contienen la palabra. Tampoco hay nada de eso en el almacenamiento del navegador.

**Aceptación:** `npm run test:e2e` pasa tres veces seguidas sin fallos intermitentes.

## Fase 7 · Cierre

- **7.1** Accesibilidad: foco visible, navegación por teclado, etiquetas en campos y botones de icono, contraste, `prefers-reduced-motion`.
- **7.2** `README.md`: qué es, cómo arrancar en local, scripts y estructura.
- **7.3** `docs/DESPLIEGUE.md`: pasos exactos para que Fran publique (crear proyecto de Supabase, activar inicio anónimo, enlazar y aplicar migraciones, variables en Vercel, comprobación final).
- **7.4** Flujo de GitHub Actions que ejecute `check` y `test:db` en cada push.
- **7.5** Revisión final contra `docs/CONTEXTO.md`, sección por sección. Lo que no se cumpla se arregla o se anota.
- **7.6** `docs/INFORME.md`: qué está hecho, qué no, bloqueos, decisiones tomadas y lo que Fran debería revisar primero (como mínimo, la lista de palabras).

**Aceptación:** `npm run check`, `npm run test:db` y `npm run test:e2e` pasan; `npm run build` termina sin avisos; el informe existe.

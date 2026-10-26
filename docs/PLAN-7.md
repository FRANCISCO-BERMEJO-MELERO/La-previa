# La Previa: A dados, juego de dados por columnas en 1 contra 1 y 2 contra 2

Plan de la issue #12. La sección «Especificación aprobada» es la que se aprobó antes de implementar y manda sobre la issue donde esta dice «por concretar» o «propuesta pendiente de confirmar». Donde algo no esté cubierto ni aquí ni en la issue, se elige lo más simple coherente con esto y se anota en `docs/DECISIONES.md`.

No se cambia el comportamiento de los otros juegos. Migraciones siempre nuevas.

**Ojo con `src/lib/rounds.ts`:** `isRoundGame` trataba como juego por rondas todo lo que no fuera `impostor` ni `luna_llena`. Este juego no es por rondas: no hereda el selector de 5/10/15 rondas, el texto de entrar tarde «en la siguiente ronda» ni ninguna otra regla de los juegos por rondas. La lista de juegos por rondas pasa a ser explícita, sin alterar el comportamiento de los existentes.

## Especificación aprobada

### 1. Identidad

- Identificador interno: `dados`. Nombre visible: **A dados**. No se usa «Matatena» (en España no se entiende) ni ningún nombre, personaje, gráfico o música de _Cult of the Lamb_.
- Descripción de una línea: «Coloca dados en tus columnas y rompe los del rival.»
- Jugadores: «2 o 4». Color de acento del juego: `orange`.
- **Sin animaciones.** Este juego sigue la regla general de `CONTEXTO.md` §8: solo el botón que se hunde al pulsar. Las animaciones quedan aplazadas para hacerlas en toda la web más adelante; no se añade ninguna aquí.

### 2. Reglas

- Dos bandos, A y B. Cada bando tiene un tablero de **3 columnas con 3 huecos**.
- Los turnos se alternan entre bandos. Al empezar cada turno, **el servidor tira el dado** (1–6) y lo guarda como dado pendiente. No hay botón de tirar.
- En su turno, la persona a la que le toca elige una columna de su tablero con hueco libre. No puede cambiar el valor, volver a tirar ni pasar.
- **Puntuación por columna:** un grupo de `n` dados de valor `v` aporta `v × n²`. Se suman los grupos de la columna y las columnas del tablero.

  | Columna | Puntos |
  | ------- | -----: |
  | 6       |      6 |
  | 6, 6    |     24 |
  | 6, 6, 6 |     54 |
  | 5, 5, 4 |     24 |
  | 2, 3, 6 |     11 |

- **Ataque:** al colocar un dado de valor `v` en la columna `c`, se eliminan **todos** los dados de valor `v` de la columna `c` del tablero rival. Las demás columnas no se tocan. Los huecos liberados vuelven a estar disponibles.
- Cada jugada se resuelve entera en una sola transacción: colocar, eliminar en el rival, recalcular, comprobar el final y, si no ha terminado, pasar el turno y tirar el siguiente dado.
- **Final:** en cuanto un tablero queda lleno tras resolver la jugada. Gana el bando con más puntos, no necesariamente el que ha llenado. **Con los mismos puntos es empate**, sin desempate.

### 3. Modalidades, equipos y orden

- **1 contra 1:** una persona en cada bando.
- **2 contra 2:** exactamente dos personas en cada bando, con tablero y marcador compartidos. La victoria es del equipo.
- **Orden de turnos.** Al empezar, el servidor decide al azar qué bando abre y, en 2 contra 2, el orden dentro de cada equipo. La secuencia es `A1 → B1 → A2 → B2 → A1…` (o empezando por B). Cada persona coloca un dado en su turno; nunca coloca el mismo equipo dos veces seguidas ni puede jugar cualquiera de sus miembros.
- **Quién juega.** En la sala de espera, el anfitrión elige la modalidad y asigna a cada miembro a «A», «B» o «Mira». Por defecto: los primeros 2 o 4 por orden de entrada, alternando A y B; el resto, «Mira». La asignación vive en el cliente del anfitrión y se envía al empezar; los demás ven la caja de espera de siempre.
- **Espectadores.** Los miembros que no juegan miran la partida en directo. No se expulsa a nadie por sobrar.
- El anfitrión puede ser jugador o espectador.

### 4. Casos límite

- **Desconexión temporal:** no cambia nada. La partida espera a quien le toca. Al volver, todo se reconstruye desde la foto.
- **Abandono o expulsión de un jugador** (`leave_room`, o `kick_player` de un desconectado, según la regla existente): la partida termina en el acto y gana el otro bando por abandono. No hay sustituciones.
- **Abandono de un espectador:** nada especial.
- **Entrar tarde:** se entra como espectador; se juega en la siguiente partida si el anfitrión lo asigna.
- **Traspaso de anfitrión:** el de siempre. El anfitrión solo tiene poder en la sala de espera y en el resultado («Volver a jugar», «Cambiar de juego»); durante la partida no hace nada especial.
- **Volver a jugar:** misma modalidad y mismos equipos, con orden y bando inicial sorteados de nuevo. Si alguno de los jugadores ya no está en la sala, vuelve a la sala de espera.
- **Doble toque, reenvío o concurrencia:** la jugada bloquea la fila de la sala. Una segunda petición del mismo turno falla con `not_your_turn` porque el turno ya ha pasado. Una columna llena falla con `column_full` sin consumir el turno ni cambiar el dado pendiente.

### 5. Datos y acciones

Sigue la convención real del código (si difiere de estos nombres, manda el código y se anota):

- `rooms.game` y la restricción de `games.phase` admiten `dados` con las fases `playing` y `finished`.
- Estado propio en una tabla nueva, por ejemplo `dados_state` (PK `game_id`): `mode`, `turn_order uuid[]`, `turn_index int`, `pending_die int`, `boards jsonb` (por bando, tres columnas con sus dados en orden de colocación), `winner text` (`A`, `B` o nulo si empate), `end_reason text` (`board_full` o `forfeit`). Los equipos salen de `game_players` con una columna de bando, o de donde encaje mejor con el código existente. RLS activado y sin políticas.
- La tirada usa el azar de Postgres en el servidor. El cliente nunca propone un valor.
- Funciones nuevas, con las reglas de siempre (`security definer`, `search_path = ''`, `auth.uid()`, bloqueo de la sala, versión, foto de vuelta, `execute` solo para `authenticated`):

  | Función                                                    | Quién                | Cuándo                             | Efecto                                                                                         |
  | ---------------------------------------------------------- | -------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
  | `dados_start(room_id, mode, team_a uuid[], team_b uuid[])` | Anfitrión            | Sala de espera o partida terminada | Valida modalidad y equipos, sortea orden y bando inicial, tira el primer dado y abre `playing` |
  | `dados_place(room_id, column)`                             | Quien tiene el turno | `playing`                          | Resuelve la jugada completa                                                                    |

- `set_game` acepta `dados`. `get_room_state` añade la variante. `leave_room` y `kick_player` aplican la sección 4. `back_to_lobby` no cambia.
- Validación de `dados_start`: `mode` es `1v1` o `2v2` (`invalid_mode`); tamaños 1+1 o 2+2, sin repetidos, sin solapes y todos miembros de la sala (`invalid_teams`).
- Códigos de error nuevos: `invalid_mode`, `invalid_teams`, `not_your_turn`, `column_full`, añadidos también al cliente con su texto en español llano.

**Foto del estado**, variante `dados`. Este juego no tiene información secreta: todos ven todo.

```jsonc
{
  "type": "dados",
  "id": "…",
  "phase": "playing",
  "mode": "2v2",
  "sides": [
    {
      "side": "A",
      "members": [{ "user_id": "…", "name": "Fran" }],
      "board": [[5, 5], [6], []],
      "column_scores": [20, 6, 0],
      "total": 26,
    },
  ],
  "turn_order": ["…"],
  "turn": { "user_id": "…", "side": "A" },
  "pending_die": 4,
  "my": { "side": "A", "is_spectator": false, "is_my_turn": true },
  "result": null,
}
```

En `finished`, `result` es `{ "winner": "A", "reason": "board_full" }`, con `winner` nulo si hay empate. Las puntuaciones las calcula el servidor; el cliente no recalcula nada.

### 6. Pantallas

Solo componentes y tokens existentes. Sin tokens nuevos.

- **Selector:** A dados elegible, con su portada (abajo), descripción y «2 o 4».
- **Sala de espera:** dos botones de modalidad («1 contra 1», «2 contra 2»; el elegido en `ink` con texto blanco). Debajo, «Quién juega» con una fila por miembro: avatar, nombre y tres botones de 44 px «A», «B», «Mira» (`aria-pressed`). Elegido: A en `sky`, B en `lilac`, Mira en `ground-soft`; no elegido, blanco con borde discontinuo. Dos píldoras «A · 2/2» y «B · 1/2», en `lime` si están completas y en `ground-soft` discontinuo si no. Si los equipos no cuadran, aviso en `orange` («En 2 contra 2 van dos personas en cada equipo. El resto mira.») y el botón de empezar desactivado. Quien no es anfitrión ve la caja de espera de siempre.
- **Partida**, de arriba abajo:
  1. Cabecera con la píldora «A dados» (o «A dados · 2 contra 2»).
  2. Fila del rival: avatar o avatares solapados, nombre («Lucía» o «Equipo B») y total grande en Archivo Black.
  3. Tablero rival en tarjeta blanca: tres columnas, con los dados apilados **hacia el centro de la pantalla** (el primero colocado abajo).
  4. Puntos por columna del rival (píldoras `ground-soft`) y, debajo, los propios (píldoras blancas), alineados con sus columnas.
  5. Tablero propio, con los dados apilados desde arriba (hacia el centro). Si te toca, cada columna es un `button` de alto completo con fondo `field` y `aria-label` «Colocar el dado en la columna 2»; una columna llena va con borde discontinuo y desactivada. Si no te toca, son simples contenedores.
  6. Fila propia: «Tú» o «Tu equipo» y el total.
  7. Abajo, si te toca: tarjeta protagonista `tomato`, girada, con el dado pendiente grande (72 px) y «Te toca. Te ha salido un 5. Toca la columna donde lo quieres.» Si no te toca: caja discontinua de espera con el dado pendiente y «Le toca a Marta. Decide ella dónde va el 3.», y en 2 contra 2 el orden de turnos en píldoras con la persona actual destacada (`aria-current`).
- **Dados:** cuadrados de 52 px, borde de 3 px, esquinas de 12 px, con **puntos** (no números) en una rejilla de 3×3 y `aria-label` «Dado: 5». Fondo blanco si el valor está solo en su columna, `sky` si forma pareja y `lime` si forma trío. Hueco libre: borde discontinuo sin fondo.
- **Espectador:** la pantalla de partida sin botones, con la caja de espera «Le toca a {nombre}». Los tableros se rotulan con los nombres de cada bando; no hay «Tú».
- **Resultado:** tarjeta protagonista `ink` con sombra `tomato` y titular personal en `ground`: «Has ganado» / «Has perdido» (1 contra 1), «Habéis ganado» / «Habéis perdido» (2 contra 2), «Empate» para todos, y para espectadores «Gana {nombre o equipo}». Debajo, el marcador final («91 a 18») y una tarjeta por bando con su total y sus tres columnas. Si fue por abandono: «{nombre} se ha ido. Gana {bando} por abandono.» Botones de siempre: «Volver a jugar» y «Cambiar de juego».
- **Cómo se juega:** explica la puntuación con los ejemplos de la tabla, el ataque por columna, qué significan los colores de pareja y trío, y la alternancia del 2 contra 2.
- Todo cabe sin desbordar a 360, 390 y 430 px, incluido el 2 contra 2 con nombres de 14 caracteres y la caja de orden de turnos.

**Portada del selector** (mismo lienzo y trazo que las ilustraciones de El lobo; en el código, colores y trazo desde los tokens):

```html
<svg
  viewBox="0 0 300 220"
  role="img"
  aria-label="Tres dados"
  style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round"
>
  <g transform="rotate(8 160 100)">
    <rect x="115" y="55" width="90" height="90" rx="18" fill="#7FD8FF"></rect>
    <circle cx="139" cy="79" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="181" cy="121" r="7" fill="#111111" style="stroke: none"></circle>
  </g>
  <g transform="rotate(-12 85 115)">
    <rect x="40" y="70" width="90" height="90" rx="18" fill="#FFFFFF"></rect>
    <circle cx="61" cy="91" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="109" cy="91" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="85" cy="115" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="61" cy="139" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="109" cy="139" r="7" fill="#111111" style="stroke: none"></circle>
  </g>
  <g transform="rotate(-6 225 135)">
    <rect x="180" y="90" width="90" height="90" rx="18" fill="#B8F28A"></rect>
    <circle cx="201" cy="111" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="249" cy="111" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="201" cy="135" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="249" cy="135" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="201" cy="159" r="7" fill="#111111" style="stroke: none"></circle>
    <circle cx="249" cy="159" r="7" fill="#111111" style="stroke: none"></circle>
  </g>
</svg>
```

### 7. Fuera de alcance

Bots o jugar contra la máquina, torneos, varias partidas a la vez en una sala, clasificaciones entre partidas, dados especiales o variantes de reglas, sustituciones de jugadores, animaciones, y cualquier cambio en el comportamiento de los otros juegos.

### Pruebas mínimas

**pgTAP**

- Puntuación: cada fila de la tabla de la sección 2; iguales en columnas distintas no se multiplican entre sí.
- Ataque: elimina todos los dados del valor en la columna rival correspondiente y ninguno de las demás; recalcula la puntuación; libera los huecos.
- Turnos: solo coloca quien tiene el turno; la secuencia de 2 contra 2 se cumple durante toda una partida simulada; `not_your_turn` en cualquier otro caso, también para un espectador.
- Columna llena: `column_full`, sin cambiar turno ni dado pendiente.
- El dado pendiente persiste y es el mismo al releer la foto; el cliente no puede elegir valor.
- Final: termina al llenarse cualquier tablero tras la jugada completa (incluido el caso en que el ataque libera huecos del rival); gana el de más puntos aunque no haya llenado; empate con los mismos puntos; ninguna jugada se acepta en `finished`.
- `dados_start`: no anfitrión, modalidad inválida, equipos de tamaño incorrecto, repetidos, solapados o con no miembros, partida en curso.
- Abandono y expulsión de un jugador en `playing`: termina con victoria del otro bando y `forfeit`. Abandono de un espectador: la partida sigue.
- Volver a jugar con los mismos equipos y con un jugador que ya no está.
- Quien entra tarde es espectador.

**Unitarias:** esquema de la variante, `viewFor` (jugador con turno, jugador en espera, espectador, resultado de cada tipo), validación de equipos en la sala, colores de pareja y trío, y que `isRoundGame` sigue devolviendo lo mismo para los juegos existentes.

**E2E:** partida 1 contra 1 completa con dos contextos y partida 2 contra 2 con cuatro contextos más un espectador, comprobando en cada turno qué persona puede colocar. Incluir un ataque visible en ambos móviles, una columna llena rechazada, una recarga a media partida que conserva tableros, turno y dado, y el resultado con «Volver a jugar».

## Plan de trabajo

Sigue la numeración de `docs/TAREAS.md`: fases 37 a 40. Un commit por tarea, con la tarea marcada en el mismo commit. Rama `feat/a-dados`, que vuelve a `develop` por pull request con «Closes #12».

### Fase 37 · Integración en la plataforma

- **37.1** `isRoundGame` con la lista explícita de juegos por rondas, con test de que devuelve lo mismo para los existentes.
- **37.2** Migración: `rooms.game`, `games.game_type` y `games.phase` admiten `dados`; `set_game` acepta `dados`. Pruebas pgTAP.
- **37.3** Cliente: `dados` en `gameIds`, textos del selector, portada y entrada en el selector. Las pruebas de los otros juegos siguen pasando.

**Aceptación:** A dados se elige en el selector; los demás juegos funcionan igual.

### Fase 38 · Servidor

- **38.1** Migración: `dados_state`, bando en la partida, puntuación, `dados_start`, `dados_place` (ataque, final, empate), abandono y expulsión, variante de `get_room_state`.
- **38.2** Pruebas pgTAP de la sección «Pruebas mínimas».

**Aceptación:** `npm run test:db` pasa desde cero.

### Fase 39 · Cliente

- **39.1** Esquema `zod` de la variante, acciones tipadas, errores traducidos y `viewFor`, con tests.
- **39.2** Sala de espera: modalidad, «Quién juega», validación de equipos y empezar.
- **39.3** Partida: dados, tableros, jugador con turno, en espera y espectador.
- **39.4** Resultado y «Volver a jugar».
- **39.5** «Cómo se juega».

**Aceptación:** `npm run check` pasa.

### Fase 40 · Validación y cierre

- **40.1** E2E de 1 contra 1 y de 2 contra 2 con espectador.
- **40.2** Repaso a 360, 390 y 430 px y de accesibilidad.
- **40.3** `docs/DECISIONES.md`, `docs/INFORME.md` y `README.md`.

**Aceptación:** `npm run check`, `npm run test:db`, `npm run test:e2e` y `npm run build` pasan sin avisos.

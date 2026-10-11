# La Previa: plan de Luna llena

Documento único y autosuficiente: contiene **la especificación completa del juego** (secciones 1 a 10), **el plan de trabajo** (sección 11) y **las ilustraciones** (sección 12). No hace falta ningún otro documento nuevo.

Continúa el trabajo ya hecho: la plataforma, El impostor y los tres juegos por rondas están terminados, y `docs/TAREAS.md` llega hasta la fase 13. Este plan añade las fases 14 a 19 y se ejecuta **sin supervisión**, con las normas de comportamiento ya definidas en el repositorio.

**Este documento manda sobre cualquier otro del repositorio que diga que solo hay cuatro juegos o que añadir más queda fuera de alcance.** Luna llena es el quinto juego y construirlo es exactamente el encargo. Todo lo demás que esos documentos dicen sobre salas, identidad, seguridad y sincronización sigue vigente.

Los nombres de tablas, funciones y campos son los previstos. **Si el código existente usa otra convención, se sigue la del código** y se anota en `docs/DECISIONES.md`.

## 1. Idea y prioridades

Un pueblo con lobos escondidos. De noche los lobos matan; de día el pueblo debate y ahorca a un sospechoso.

Tres prioridades de diseño, por este orden:

1. **Se juega en persona y hablando.** El móvil se usa de noche y para votar. De día, las pantallas piden dejarlo boca abajo.
2. **Nadie se queda sin jugar por narrar.** El anfitrión hace de narrador leyendo en voz alta lo que le marca su pantalla, y además juega.
3. **Nadie puede deducir un rol mirando quién toca el móvil.** De noche actúan todos, tengan poder o no.

Identificador: `luna_llena`. Nombre visible: **Luna llena**. De 6 a 16 jugadores. No se usa el nombre de ningún juego comercial ni sus nombres de personajes.

## 2. Roles

| Identificador | Nombre | Bando | De noche | Efecto en texto (el de la carta) |
| --- | --- | --- | --- | --- |
| `wolf` | Lobo | Lobos | Marca víctima con los demás lobos | Cada noche elegís entre los lobos a quién devorar. De día, disimula y que ahorquen a otro. |
| `villager` | Aldeano | Pueblo | Marca de quién sospecha (sin efecto) | No tienes poderes. Tu arma es hablar: descubre a los lobos y convence al resto de a quién ahorcar. |
| `seer` | Vidente | Pueblo | Elige a un jugador y ve si es lobo | Cada noche eliges a un jugador y descubres si es lobo. Úsalo con cabeza: si te delatas, eres la siguiente cena. |
| `protector` | Protector | Pueblo | Elige a quién protege | Cada noche proteges a un jugador del ataque de los lobos. Puedes protegerte a ti, pero no a la misma persona dos noches seguidas. |
| `hunter` | Cazador | Pueblo | Marca de quién sospecha (sin efecto) | Si mueres, de noche o en la horca, disparas antes de caer y te llevas contigo a quien elijas. |
| `jester` | Bufón | Solo | Marca de quién sospecha (sin efecto) | Ganas tú, y solo tú, si el pueblo te ahorca. Hazte el sospechoso sin que se note. Si te matan los lobos, pierdes. |
| `cupid` | Cupido | Pueblo | La primera noche elige a dos enamorados; después, como un aldeano | La primera noche eliges a dos enamorados. Si uno muere, el otro muere con él. Después eres un aldeano más. |

El **alcalde** no es un rol: es un cargo que se elige por votación (sección 3).

### Composición de la partida

Siempre hay lobos, aldeanos y **una** vidente. El anfitrión, en la sala de espera, puede:

- Cambiar el número de lobos.
- Activar o desactivar cada rol opcional: protector, cazador, bufón, Cupido. Hay como mucho uno de cada.

La sala de espera muestra la composición resultante en una línea ("2 lobos · vidente · protector · cazador · 4 aldeanos") y se recalcula sola cuando cambia el número de jugadores.

**Reparto recomendado**, que es el que aparece por defecto:

| Jugadores | Lobos | Opcionales activados |
| --- | --- | --- |
| 6 | 1 | ninguno |
| 7–8 | 2 | protector |
| 9–11 | 2 | protector, cazador |
| 12–13 | 3 | protector, cazador, bufón |
| 14–16 | 3 | protector, cazador, bufón, Cupido |

**Validación** al empezar: al menos 6 jugadores; al menos 1 lobo; `2 × lobos < jugadores`; y `lobos + vidente + opcionales ≤ jugadores − 1`, para que quede al menos un aldeano.

## 3. Desarrollo de la partida

```
roles → night → dawn → [hunter] → [mayor] → day → voting → defense → verdict → execution → [hunter] → night → …
```

Entre corchetes, fases que solo ocurren cuando toca. Tras `dawn` y `execution` se comprueba si alguien ha ganado; si es así, se pasa a `finished`.

| Fase | Qué pasa | Cómo avanza |
| --- | --- | --- |
| `roles` | Cada uno ve su carta. Los lobos ven quiénes son los otros lobos | Narrador |
| `night` | Todos los vivos actúan en el móvil | Sola cuando han actuado todos; el narrador puede forzarla |
| `dawn` | Se anuncia quién ha muerto y su rol, o que no ha muerto nadie | Narrador |
| `hunter` | Solo si ha muerto el cazador: elige a quién se lleva | Al disparar; el narrador puede saltarla si está desconectado |
| `mayor` | Solo si no hay alcalde vivo: se vota uno | Sola cuando han votado todos; el narrador puede forzarla |
| `day` | Debate. Móviles boca abajo | Narrador ("Abrir votación") |
| `voting` | Cada vivo vota a quién acusa | Sola o forzada |
| `defense` | Se enseñan los votos. El acusado se defiende de palabra | Narrador |
| `verdict` | Todos menos el acusado votan condenar o salvar | Sola o forzada |
| `execution` | Se enseñan los votos y el resultado: ahorcado (con su rol) o salvado | Narrador |
| `finished` | Resultado y todos los roles | — |

### La noche

Todos los jugadores vivos tienen algo que tocar, y todas las pantallas tienen el mismo aspecto general para quien mire de reojo.

- **Lobos.** Cada lobo marca a un jugador vivo que no sea lobo y ve **en directo** lo que marcan los demás lobos. Puede cambiar su marca hasta que acabe la noche. Muere el más marcado; con empate, uno de los empatados al azar. Si ningún lobo ha marcado, no muere nadie.
- **Vidente.** Elige a un jugador vivo distinto de sí misma y ve al momento "es lobo" o "no es lobo". Conserva en pantalla la lista de todo lo que ha visto. El bufón sale como "no es lobo".
- **Protector.** Elige a un jugador vivo. No puede repetir el de la noche anterior. Si coincide con la víctima de los lobos, esa noche no muere nadie.
- **Cupido, primera noche.** Elige a dos jugadores vivos distintos; puede elegirse a sí mismo.
- **Resto** (aldeano, cazador, bufón y Cupido desde la segunda noche). Marcan de quién sospechan. No tiene ningún efecto y solo lo ven los muertos.

Salvo la de los lobos, las acciones no se cambian una vez enviadas. Quien no actúe antes de que el narrador fuerce el final pierde su acción.

**Orden de resolución** al cerrar la noche: enamorados (primera noche), víctima de los lobos, protección, muerte de la víctima, muerte por amor del enamorado.

### Los enamorados

Versión simple: **cada uno sigue en su bando**. El único efecto es que, si uno muere por cualquier causa, el otro muere a continuación. Se enteran al amanecer de la primera noche, cada uno en su móvil. Cupido sabe a quién eligió. Nadie más lo sabe hasta que mueren.

### El alcalde

- Se elige en la fase `mayor`, que ocurre al empezar cualquier día en que no haya alcalde vivo (el primero siempre).
- Vota cada jugador vivo a cualquier jugador vivo, incluido él mismo. Con empate, el azar decide entre los empatados.
- Su voto **vale doble** en `voting` y en `verdict`.
- Si muere, se elige otro al día siguiente.

### El juicio

1. **`voting`.** Cada vivo vota a otro vivo; no puede votarse a sí mismo. Mientras se vota solo se ve quién ha votado ya.
2. **`defense`.** Se muestra **quién ha votado a quién**. El acusado es el más votado, contando doble el voto del alcalde. Si hay empate o nadie ha votado, no hay acusado: el narrador lo anuncia y se pasa directamente a la noche.
3. **`verdict`.** Todos los vivos menos el acusado votan "condenar" o "salvar".
4. **`execution`.** Se muestra quién ha votado qué. Muere si los votos de condenar superan a los de salvar, contando doble el del alcalde. Con empate, se salva.

### Muertes

- Al morir se revela siempre el rol.
- **Cazador:** si muere, de noche o ahorcado, se abre la fase `hunter` y elige a un jugador vivo. El disparo se añade al anuncio en curso. Si se va de la sala, no dispara.
- **Bufón:** si muere **ahorcado**, gana él solo y la partida termina. Si muere de cualquier otra forma, simplemente está muerto.
- **Muertos:** pasan a espectadores. Ven todos los roles, quiénes son los enamorados y lo que marca cada uno de noche, en directo. No actúan ni votan. Su pantalla les recuerda que no pueden hablar del juego.

### Quién gana

Se comprueba al continuar desde `dawn` y desde `execution`, en este orden:

1. Bufón ahorcado: gana el bufón.
2. No quedan lobos vivos: gana el pueblo.
3. Quedan tantos lobos vivos como jugadores vivos que no son lobos, o más: ganan los lobos.

El bufón cuenta como "no lobo" para el punto 3 y pierde si gana el pueblo.

## 4. El narrador

El narrador es el anfitrión. Su pantalla es la misma que la de cualquier jugador con su rol, **más** una caja "Lee en voz alta" con el texto de la fase y el botón de avanzar.

- El guion solo contiene **información pública**. Nunca nombra roles vivos ni acciones de nadie.
- Si el narrador muere, sigue narrando. Como muerto, ve además todo lo que ve cualquier espectador.
- Si el anfitrión cambia (se va o se desconecta), el nuevo anfitrión pasa a narrar.
- La foto incluye `narration`: una clave y sus parámetros. Los textos viven en el módulo de textos del cliente.

Guion base. Se puede pulir el tono, no el contenido:

| Clave | Cuándo | Texto |
| --- | --- | --- |
| `roles` | Reparto | "Bienvenidos al pueblo. Mirad vuestra carta sin que nadie la vea. Entre vosotros hay lobos." |
| `night_first` | Primera noche | "Cae la primera noche. Coged todos el móvil y seguid las instrucciones. Nada de mirar al de al lado." |
| `night` | Resto de noches | "Cae la noche sobre el pueblo. Todos al móvil." |
| `dawn_death` | Amanecer con muerte | "Amanece. {nombre} no ha despertado. Era {rol}." |
| `dawn_deaths` | Varias muertes | "Amanece con malas noticias. Han muerto {nombres}." |
| `dawn_none` | Sin muertes | "Amanece y, por una vez, estáis todos. Alguien ha tenido suerte esta noche." |
| `hunter` | Turno del cazador | "{nombre} era el cazador, y no piensa irse solo. Elige a quién te llevas." |
| `hunter_shot` | Tras el disparo | "El cazador dispara. {nombre} cae con él. Era {rol}." |
| `lover_death` | Muerte por amor | "{nombre} no soporta la pérdida y muere de pena. Era {rol}." |
| `mayor` | Elección | "El pueblo necesita un alcalde. Su voto valdrá doble. Postulaos, convenced y votad." |
| `mayor_elected` | Tras elegir | "{nombre} es vuestro alcalde." |
| `day` | Debate | "Móviles boca abajo. Tenéis que decidir a quién acusáis. Hablad." |
| `voting` | Votación | "Se acabó la charla. Coged el móvil y votad a quién acusáis." |
| `defense` | Con acusado | "El pueblo acusa a {nombre}. {nombre}, tienes la palabra: defiéndete." |
| `no_accused` | Sin acusado | "El pueblo no se pone de acuerdo. Hoy no se ahorca a nadie." |
| `verdict` | Segundo voto | "Habéis oído su defensa. ¿Condenar o salvar? Votad." |
| `executed` | Ahorcado | "El pueblo ha hablado. {nombre} sube a la horca. Era {rol}." |
| `spared` | Salvado | "El pueblo perdona a {nombre}. Por ahora." |
| `win_village` | Final | "No queda ni un lobo. El pueblo puede dormir tranquilo." |
| `win_wolves` | Final | "Los lobos ya son mayoría. El pueblo ha caído." |
| `win_jester` | Final | "Habéis ahorcado al bufón, que es justo lo que quería. Gana él solo." |

## 5. Casos límite

- **Desconectados:** las fases que esperan respuestas no avanzan solas mientras falte alguien; el narrador las fuerza. Quien no ha respondido pierde su acción o su voto.
- **Acusado desconectado:** el juicio sigue; simplemente no se defiende.
- **Abandono o expulsión a media partida:** el jugador muere al instante y se revela su rol. Se cancela la fase en curso y se pasa a un anuncio de tipo `execution` con causa `left`. Después se continúa: si era de noche, la noche se repite desde cero; si era de día, se vuelve a `day`. Su enamorado muere con él. Un cazador que se va no dispara.
- **Entrar tarde:** se juega en la siguiente partida.
- **Todos muertos:** posible con enamorados y cazador. Se aplica el orden de victoria tal cual (gana el pueblo si no quedan lobos).
- **Narrador desconectado:** se aplica el traspaso de anfitrión de siempre.

## 6. Modelo de datos

Tablas nuevas, propias de este juego, en migraciones nuevas. Todas con RLS activado y sin políticas.

- **`luna_state`**, PK `game_id`: `night int`, `day int`, `mayor_id`, `accused_id`, `lover_a`, `lover_b`, `last_protected_id`, `hunter_pending boolean`, `return_phase text`, `announcement jsonb`, `config jsonb` (lobos y roles activados).
- **`luna_night_actions`**, PK `(game_id, night, user_id)`: `target_id`, `target2_id` (solo Cupido).
- **`luna_votes`**, PK `(game_id, day, kind, voter_id)`: `kind` es `mayor`, `accuse` o `verdict`; `target_id` nulo; `condemn boolean` nulo.

Se reutilizan `games` (con las fases nuevas en la restricción por `game_type`), `game_players` (`alive`) y `game_roles` (con los siete roles).

Forma de `announcement`:

```json
{
  "deaths": [
    { "user_id": "…", "name": "Marta", "role": "seer", "cause": "wolves" }
  ],
  "spared": null
}
```

`cause` es `wolves`, `hanged`, `hunter`, `heartbreak` o `left`. `spared` lleva el nombre del acusado salvado, si lo hubo.

## 7. Acciones

Mismas reglas que el resto: `security definer`, bloqueo de la fila de la sala, subida de versión y devolución de la foto.

| Función | Quién | Cuándo | Efecto |
| --- | --- | --- | --- |
| `luna_llena_start(room_id, wolves, roles)` | Anfitrión | Sala de espera o partida terminada | Valida la composición, reparte roles y abre `roles` |
| `luna_llena_continue(room_id)` | Anfitrión | `roles`, `dawn`, `day`, `defense`, `execution` | Avanza a la fase que toque, comprobando victoria donde corresponde |
| `luna_llena_night_action(room_id, target_id, target2_id)` | Vivo | `night` | Guarda la acción según el rol. Si han actuado todos, cierra la noche |
| `luna_llena_close_night(room_id)` | Anfitrión | `night` | Resuelve la noche con lo que haya |
| `luna_llena_vote(room_id, target_id)` | Vivo | `mayor` o `voting` | Guarda el voto. Si han votado todos, cierra |
| `luna_llena_verdict(room_id, condemn)` | Vivo que no es el acusado | `verdict` | Guarda el voto. Si han votado todos, cierra |
| `luna_llena_close_vote(room_id)` | Anfitrión | `mayor`, `voting`, `verdict` | Cierra con lo que haya |
| `luna_llena_hunter_shot(room_id, target_id)` | El cazador muerto | `hunter` | Mata al objetivo y vuelve a la fase de `return_phase` |
| `luna_llena_skip_hunter(room_id)` | Anfitrión | `hunter` | Vuelve sin disparo |

Cambios en funciones existentes: `set_game` acepta `luna_llena`; `get_room_state` añade la variante; `leave_room` y `kick_player` aplican el abandono de la sección 5.

Códigos de error nuevos: `invalid_config`, `already_acted`, `not_hunter`, `is_accused`, `same_as_last_night`.

## 8. La foto del estado

Variante `luna_llena` de `game`:

```jsonc
{
  "type": "luna_llena",
  "id": "…",
  "phase": "night",
  "night": 2,
  "day": 1,
  "mayor_id": "…",
  "accused_id": null,
  "config": { "wolves": 2, "roles": ["protector", "hunter"] },
  "participants": [
    { "user_id": "…", "name": "Fran", "alive": true, "has_acted": true, "role": null }
  ],
  "my": {
    "is_participant": true,
    "alive": true,
    "role": "wolf",
    "fellow_wolves": ["…"],
    "action": { "target_id": "…" },
    "wolf_marks": [ { "user_id": "…", "target_id": "…" } ],
    "seer_results": [],
    "lover_id": null,
    "last_protected_id": null
  },
  "announcement": null,
  "public_votes": null,
  "narration": { "key": "night", "params": {} },
  "spectator": null,
  "result": null
}
```

- `participants[].role` es nulo mientras el jugador está vivo; lleva su rol cuando ha muerto.
- `public_votes` aparece en `defense` (votos de acusación), en `execution` (votos del veredicto) y tras elegir alcalde. Antes de cerrar cada votación es nulo.
- `spectator` solo se rellena si quien pide la foto está muerto: todos los roles, los enamorados y las acciones de la noche en curso.
- `result`, en `finished`: ganador (`village`, `wolves` o `jester`), todos los roles y los enamorados.

**Lo que la foto de un jugador vivo no puede contener nunca** antes de `finished`: el rol de otro jugador vivo (salvo, para un lobo, quiénes son los demás lobos); las acciones nocturnas ajenas (salvo, para un lobo, las marcas de los otros lobos); el resultado de la vidente; quiénes son los enamorados (salvo su propia pareja, y Cupido los suyos); a quién protegió el protector; ni votos ajenos antes de cerrar la votación.

## 9. Pantallas e ilustraciones

**Las cartas de rol sí están diseñadas:** el anexo (sección 12) describe la carta y contiene el SVG exacto de las siete ilustraciones.

- Cada ilustración se implementa como un componente SVG propio, copiando las formas del anexo. Nada de imágenes externas.
- La misma ilustración se reutiliza en pequeño allí donde se nombra un rol: anuncios de muerte, vista de espectador, resultado y portada del juego (la del lobo).
- La carta del lobo es oscura (`ink`) con sombra `tomato`; las demás son blancas con el bloque de ilustración en el color del rol.
- El jugador puede **volver a ver su carta** en cualquier momento desde un botón discreto, y la carta se oculta sola al soltar o al cabo de unos segundos, para que no se quede a la vista.

El resto de pantallas no tiene maqueta y se construye con los componentes existentes:

| Pantalla | Notas |
| --- | --- |
| Sala de espera | Lobos (más/menos), interruptores de roles opcionales, línea de composición y aviso si no es válida |
| Carta de rol | Según el anexo |
| Noche, por rol | Tarjeta protagonista `ink`. Lista de jugadores para elegir. Lobos: marcas de la manada en cada fila. Vidente: resultado al instante e historial |
| Noche, esperando | Tras actuar: "Espera al amanecer", con el contador de quién falta |
| Amanecer | Tarjeta con la ilustración del rol del muerto, o mensaje de noche tranquila |
| Enamorado | Aviso privado al amanecer de la primera noche: "Estás enamorado de {nombre}" |
| Cazador | Lista para elegir; el resto espera |
| Elección de alcalde | Como la votación, con resultado público |
| Día | Pantalla casi vacía: "Móviles boca abajo. Hablad." El alcalde lleva su distintivo en las listas |
| Votación de acusación | Lista de vivos |
| Defensa | Quién votó a quién, agrupado por acusado, y el acusado destacado |
| Veredicto | Dos botones grandes: condenar y salvar. El acusado ve una espera |
| Ejecución | Votos del veredicto y resultado, con la carta del ahorcado |
| Muerto | Vista de espectador: roles de todos, enamorados y acciones de la noche en directo |
| Resultado | Bando ganador, con todos los jugadores y su rol. El titular es personal: "Has ganado" o "Has perdido" |
| Caja del narrador | En todas las fases, para el anfitrión: "Lee en voz alta", el texto y el botón de avanzar |

Colores por rol: lobo `tomato` sobre `ink`, aldeano `orange`, vidente `lilac`, protector `sky`, cazador `lime`, bufón `ground-soft`, Cupido `field-error`. No se añade ningún token.

## 10. Fuera de alcance

- La bruja y cualquier otro rol.
- Los enamorados como tercer bando.
- Narración con voz sintética, sonidos o música.
- Temporizadores para el debate o la defensa.
- Que el alcalde nombre sucesor.
- Chat de lobos o de muertos.
- Estadísticas, historial de partidas o puntuaciones.
- Ilustraciones que no sean las siete del anexo.
- Tema oscuro general.

## 11. Plan de trabajo

### Cómo trabajar

1. Añade a `docs/TAREAS.md` las tareas de este plan (fases 14–19) debajo de las ya hechas.
2. Fases y tareas en orden. Un commit por tarea.
3. **Nada de lo que ya funciona puede romperse.** Antes de empezar y al cerrar cada fase pasan enteras las tres baterías: `npm run check`, `npm run test:db` y `npm run test:e2e`.
4. Este juego **no es por rondas**: no reutiliza las auxiliares de los juegos por rondas ni las fuerza a encajar. Sí reutiliza lo de plataforma (sala, foto, abandono, anfitrión) y los componentes visuales.
5. Es el juego con más información secreta. Ante cualquier duda sobre qué puede ver quién, se elige lo más restrictivo y se cubre con una prueba.
6. Ante una duda, se elige la opción más simple coherente con este documento, se anota en `docs/DECISIONES.md` y se sigue. No se pregunta ni se espera.
7. Ante un bloqueo real (falta una herramienta o una credencial), se anota en la sección de bloqueos de `docs/TAREAS.md` y se pasa a la siguiente tarea que no dependa de él. Nunca se simula que algo funciona.

### Fase 14 · Preparación

- **14.1** Leer este documento entero, incluido el anexo. Repasar cómo están hechos El impostor (roles secretos, votación, eliminación) y la estructura por carpetas de juego.
- **14.2** Comprobar que las tres baterías pasan antes de tocar nada.
- **14.3** Anotar en `docs/DECISIONES.md` las diferencias entre el documento y el código real, y cómo se resuelven.
- **14.4** Añadir las fases 14–19 a `docs/TAREAS.md`.

**Aceptación:** baterías en verde; tareas y decisiones escritas.

### Fase 15 · Base de datos: reparto y noche

- **15.1** Migración: `rooms.game` y `games.phase` admiten `luna_llena`; `game_roles.role` admite los siete roles; tablas `luna_state`, `luna_night_actions` y `luna_votes`, con RLS y sin políticas.
- **15.2** `set_game` acepta `luna_llena`. Función auxiliar que valida una composición y otra que calcula la recomendada por número de jugadores.
- **15.3** `luna_llena_start`: validación, reparto aleatorio de roles, estado inicial en `roles`.
- **15.4** `luna_llena_night_action` para cada rol, con sus restricciones, y cierre automático de la noche.
- **15.5** Resolución de la noche (`luna_llena_close_night` y la auxiliar que comparte con el cierre automático), en el orden de la sección 3, y paso a `dawn` con su `announcement`.
- **15.6** Variante `luna_llena` en `get_room_state` para `roles`, `night` y `dawn`, incluidos `narration` y `spectator`.
- **15.7** Pruebas pgTAP. Como mínimo:
  - Composición: menos de 6 jugadores, cero lobos, lobos de más, sin hueco para un aldeano, rol opcional desconocido o repetido, todos rechazados. La recomendada es válida para cada número de jugadores de 6 a 16.
  - El reparto coincide exactamente con la composición pedida.
  - **Secreto en `roles` y `night`:** un aldeano no ve ningún rol ajeno; un lobo ve quiénes son los lobos y nada más; nadie ve acciones ajenas salvo los lobos entre sí; el resultado de la vidente solo lo ve ella; el protegido solo lo ve el protector.
  - Lobos: no pueden marcar a un lobo ni a un muerto; pueden cambiar la marca; mayoría, empate y ninguna marca.
  - Vidente: lobo sale lobo; bufón y el resto salen no lobo; no puede elegirse ni repetir acción en la misma noche.
  - Protector: salva a la víctima; no puede repetir objetivo de la noche anterior; puede protegerse a sí mismo.
  - Cupido: enlaza la primera noche; desde la segunda actúa como aldeano; no puede elegir dos veces al mismo.
  - Muerte por amor al morir un enamorado de noche, y aviso privado a cada enamorado al amanecer.
  - La noche se cierra sola cuando actúa el último vivo, y forzada con acciones a medias.
  - Un muerto no puede actuar y recibe `spectator` completo; un vivo lo recibe nulo.

**Aceptación:** `npm run test:db` pasa desde cero, con las pruebas anteriores intactas.

### Fase 16 · Base de datos: día, juicio y final

- **16.1** `luna_llena_continue` con todas sus transiciones.
- **16.2** Elección de alcalde: `luna_llena_vote` en `mayor`, cierre, empate al azar, nueva elección si el alcalde ha muerto.
- **16.3** Juicio: `luna_llena_vote` en `voting`, `luna_llena_verdict`, `luna_llena_close_vote`, voto doble del alcalde, casos sin acusado y de empate.
- **16.4** Cazador: fase `hunter`, `luna_llena_hunter_shot`, `luna_llena_skip_hunter` y vuelta a la fase de origen con el anuncio ampliado.
- **16.5** Comprobación de victoria en el orden de la sección 3, y `result` en la foto.
- **16.6** Abandono y expulsión en cada fase, según la sección 5.
- **16.7** Resto de la foto: `public_votes`, `accused_id`, `mayor_id` y todas las claves de `narration`.
- **16.8** Pruebas pgTAP. Como mínimo:
  - Transiciones: cada fase solo avanza con su función y su actor; cualquier otra combinación falla con `invalid_phase`, `not_host` o el código que toque.
  - `public_votes` es nulo antes de cerrar cada votación y completo después.
  - Alcalde: elección, empate, voto doble que decide una acusación y un veredicto, y reelección tras su muerte.
  - Juicio: acusado único, empate sin acusado, nadie vota, el acusado no puede votar en el veredicto, empate en el veredicto salva.
  - Cazador: dispara al morir de noche y al morir ahorcado; no dispara si abandona; su disparo mata a un enamorado y cae también la pareja.
  - Bufón: ahorcado gana y termina la partida; devorado no gana.
  - Victoria del pueblo y de los lobos, incluida la paridad con el bufón vivo contando como no lobo.
  - Todos muertos.
  - Abandono en `night` (la noche se repite desde cero), en `voting`, en `defense` siendo el acusado y en `hunter` siendo el cazador.
  - **Partidas completas simuladas** de principio a fin: una que gana el pueblo, una que ganan los lobos y una que gana el bufón, con todos los roles opcionales activos.
  - **Secreto de extremo a extremo:** en cada fase de una partida simulada, la foto de cada jugador vivo no contiene nada de la lista prohibida de la sección 8.

**Aceptación:** `npm run test:db` pasa desde cero.

### Fase 17 · Aplicación: cartas, sala y noche

- **17.1** Los siete componentes de ilustración SVG, copiando el anexo, y el componente de carta de rol. Añadirlos a `/dev/componentes`.
- **17.2** Módulo de textos del juego: nombres, bandos y efectos de los roles, y el guion completo del narrador con sus parámetros.
- **17.3** Esquema `zod` de la variante, acciones tipadas, traducción de errores y `viewFor` del juego, con tests unitarios de todos los casos.
- **17.4** Sala de espera: lobos, interruptores de roles, línea de composición, valores recomendados que siguen al número de jugadores y aviso cuando la composición no es válida.
- **17.5** Caja del narrador: componente único que muestra el texto de `narration` y el botón de avanzar que toque en cada fase.
- **17.6** Pantalla de reparto con la carta, y el botón para volver a verla durante la partida, que se oculta sola.
- **17.7** Pantallas de noche de cada rol, espera tras actuar y amanecer. Aviso privado a los enamorados.

**Aceptación:** `npm run check` pasa. Con seis navegadores contra el entorno local se reparte, se juega una noche y se ve el amanecer.

### Fase 18 · Aplicación: día, juicio y final

- **18.1** Elección de alcalde y distintivo de alcalde en las listas de jugadores.
- **18.2** Día (móviles boca abajo), votación de acusación y defensa con los votos a la vista.
- **18.3** Veredicto y ejecución.
- **18.4** Turno del cazador.
- **18.5** Vista de espectador para los muertos.
- **18.6** Resultado, con todos los roles y los enamorados.
- **18.7** Pruebas e2e con Playwright, seis contextos y vista de móvil:
  - Partida completa con la composición recomendada para 6.
  - Partida con 9 jugadores y todos los opcionales, hasta el final.
  - Un jugador recarga la página de noche y conserva su rol y su acción.
  - El narrador muere y sigue pudiendo avanzar la partida.
  - Secreto en el cliente: durante la partida, las respuestas de red de un aldeano vivo no contienen el rol de ningún otro jugador vivo.

**Aceptación:** las tres baterías pasan tres veces seguidas sin fallos intermitentes.

### Fase 19 · Cierre

- **19.1** Selector de juegos: Luna llena elegible, con la ilustración del lobo como portada y su rango de 6 a 16.
- **19.2** Repaso a 360, 390 y 430 px con 16 jugadores y nombres de 14 caracteres: listas de noche, defensa con muchos votos, espectador y resultado. Nada desborda ni se recorta.
- **19.3** Repaso de accesibilidad de las pantallas nuevas.
- **19.4** Revisión final contra las secciones 1 a 10 de este documento, una por una, y contra la lista "Fuera de alcance".
- **19.5** Actualizar `README.md` y, si hace falta, `docs/DESPLIEGUE.md`.
- **19.6** Ampliar `docs/INFORME.md`: qué está hecho, decisiones y qué debe revisar Fran primero. Como mínimo: el guion del narrador leído en voz alta, el equilibrio del reparto recomendado y las pantallas sin maqueta.

**Aceptación:** `npm run check`, `npm run test:db`, `npm run test:e2e` y `npm run build` pasan sin avisos.

## 12. Anexo: carta de rol e ilustraciones

### La carta

Pantalla completa de reparto, de arriba abajo:

1. **Cabecera:** "La Previa" a la izquierda y la píldora "Luna llena" a la derecha.
2. **Tarjeta protagonista**, que ocupa el alto disponible, girada ±1,5° y con sombra dura de 8 px. Blanca con borde `ink`, salvo la del lobo, que es `ink` con texto blanco, sombra `tomato` y bordes interiores blancos. Dentro, en columna:
   - Píldora "Eres" en el color del rol.
   - Bloque de ilustración: fondo del color del rol, borde de 3 px, esquinas de 16 px, con el SVG a todo el ancho.
   - Nombre del rol en Archivo Black, mayúsculas, de 46 a 56 px según quepa. En la carta del lobo va en `ground`.
   - Píldora de bando: "Bando del pueblo" en `lime`, "Bando de los lobos" en `tomato`, "Juegas solo" en `lilac`.
   - Texto del efecto, 16 px, tal como figura en la tabla de roles de la sección 2.
   - Solo en la del lobo, al pie y separado por una línea: "Tu manada" y los nombres de los otros lobos.
3. **Pie:** el botón del narrador o la caja de espera "El narrador dará paso a la noche".

### Las ilustraciones

Lienzo de 300×220. Todas comparten trazo `ink` de 5 px con uniones y extremos redondeados; los colores son los tokens de Verbena (`#111111` ink, `#FFFFFF` paper, `#FFD23F` ground, `#FF6B5E` tomato, `#7FD8FF` sky, `#B8F28A` lime). Se copian las formas tal cual; en el código real los colores y el trazo salen de los tokens, no de valores sueltos.

### Lobo (`wolf`)

Fondo del bloque: `tomato`, dentro de una carta `ink`.

```html
<svg viewBox="0 0 300 220" role="img" aria-label="Cabeza de lobo bajo la luna" style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round">
<circle cx="238" cy="54" r="30" fill="#FFD23F"></circle>
<polygon points="90,98 102,28 142,80" fill="#111111"></polygon>
<polygon points="210,98 198,28 158,80" fill="#111111"></polygon>
<polygon points="84,90 216,90 198,160 150,204 102,160" fill="#111111"></polygon>
<ellipse cx="124" cy="122" rx="13" ry="8" fill="#FFD23F"></ellipse>
<ellipse cx="176" cy="122" rx="13" ry="8" fill="#FFD23F"></ellipse>
<polygon points="128,152 172,152 150,198" fill="#FFFFFF"></polygon>
<circle cx="150" cy="186" r="6" fill="#111111"></circle>
</svg>
```

### Aldeano (`villager`)

Fondo del bloque: `orange`.

```html
<svg viewBox="0 0 300 220" role="img" aria-label="Aldeano con sombrero de paja" style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round">
<circle cx="150" cy="132" r="54" fill="#FFFFFF"></circle>
<path d="M104 88 Q104 30 150 30 Q196 30 196 88 Z" fill="#FFD23F"></path>
<rect x="104" y="70" width="92" height="16" fill="#FF6B5E"></rect>
<ellipse cx="150" cy="90" rx="88" ry="16" fill="#FFD23F"></ellipse>
<circle cx="132" cy="134" r="5" fill="#111111"></circle>
<circle cx="168" cy="134" r="5" fill="#111111"></circle>
<path d="M130 156 Q150 174 170 156" fill="none"></path>
</svg>
```

### Vidente (`seer`)

Fondo del bloque: `lilac`.

```html
<svg viewBox="0 0 300 220" role="img" aria-label="Bola de cristal con un ojo" style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round">
<path d="M94 200 L206 200 L190 168 L110 168 Z" fill="#FFD23F"></path>
<circle cx="150" cy="100" r="74" fill="#7FD8FF"></circle>
<path d="M98 100 Q150 54 202 100 Q150 146 98 100 Z" fill="#FFFFFF"></path>
<circle cx="150" cy="100" r="19" fill="#111111"></circle>
<circle cx="157" cy="93" r="5" fill="#FFFFFF" style="stroke: none"></circle>
</svg>
```

### Protector (`protector`)

Fondo del bloque: `sky`.

```html
<svg viewBox="0 0 300 220" role="img" aria-label="Escudo" style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round">
<path d="M150 22 L228 48 L228 110 Q228 172 150 202 Q72 172 72 110 L72 48 Z" fill="#FFFFFF"></path>
<path d="M150 22 L228 48 L228 110 Q228 172 150 202 Z" fill="#B8F28A"></path>
<rect x="138" y="74" width="24" height="76" fill="#111111" style="stroke: none"></rect>
<rect x="112" y="100" width="76" height="24" fill="#111111" style="stroke: none"></rect>
</svg>
```

### Cazador (`hunter`)

Fondo del bloque: `lime`.

```html
<svg viewBox="0 0 300 220" role="img" aria-label="Punto de mira" style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round">
<circle cx="150" cy="110" r="78" fill="#FFFFFF"></circle>
<circle cx="150" cy="110" r="52" fill="#FF6B5E"></circle>
<circle cx="150" cy="110" r="24" fill="#FFFFFF"></circle>
<line x1="150" y1="14" x2="150" y2="206"></line>
<line x1="54" y1="110" x2="246" y2="110"></line>
<circle cx="150" cy="110" r="7" fill="#111111"></circle>
</svg>
```

### Bufón (`jester`)

Fondo del bloque: `ground-soft`.

```html
<svg viewBox="0 0 300 220" role="img" aria-label="Bufón con gorro de tres puntas" style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round">
<polygon points="92,126 58,42 134,98" fill="#FF6B5E"></polygon>
<polygon points="208,126 242,42 166,98" fill="#7FD8FF"></polygon>
<polygon points="116,108 150,26 184,108" fill="#B8F28A"></polygon>
<circle cx="58" cy="42" r="11" fill="#FFFFFF"></circle>
<circle cx="242" cy="42" r="11" fill="#FFFFFF"></circle>
<circle cx="150" cy="26" r="11" fill="#FFFFFF"></circle>
<circle cx="150" cy="150" r="52" fill="#FFFFFF"></circle>
<circle cx="132" cy="142" r="5" fill="#111111"></circle>
<circle cx="168" cy="142" r="5" fill="#111111"></circle>
<path d="M122 160 Q150 196 178 160 Z" fill="#111111"></path>
</svg>
```

### Cupido (`cupid`)

Fondo del bloque: `field-error`.

```html
<svg viewBox="0 0 300 220" role="img" aria-label="Corazón atravesado por una flecha" style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round">
<path d="M150 194 C56 132 68 46 120 46 C140 46 150 62 150 76 C150 62 160 46 180 46 C232 46 244 132 150 194 Z" fill="#FF6B5E"></path>
<line x1="44" y1="178" x2="252" y2="48"></line>
<polygon points="262,42 228,44 248,74" fill="#111111"></polygon>
<polygon points="44,178 36,150 62,166" fill="#FFFFFF"></polygon>
<polygon points="44,178 72,188 62,166" fill="#FFFFFF"></polygon>
</svg>
```

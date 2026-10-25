# Decisiones

## 2026-10-25 · D.6 · Next 16.4.3 por seguridad

Next 16.4.0 tiene vulnerabilidades conocidas (entre ellas GHSA-2464-fhr4-w9xw, ejecución remota de código en la optimización de imágenes con SVG, crítica, que afecta a `>=16.0.0 <=16.4.0`). `next dev` y `next build` se paraban para recomendar actualizar. Se sube `next` y `eslint-config-next` a la 16.4.3, la última del 16.4, con versiones exactas como el resto. Es un parche de la misma versión menor: no cambia ninguna API que use el proyecto.

- `npm audit` ya no avisa de `next`. Siguen dos avisos ajenos: `undici` 8.11.2, que solo llega a través de `jsdom` en los tests, y `zod` 4.6.5, que pide `--force`. Quedan fuera de este cambio.

## 2026-10-15 · D.4 · Avatares con imagen

Fran pide usar los 11 avatares de `public/avatars/` (generados aparte y recortados a un círculo de 256 px) en lugar de los 12 dibujados con formas de `docs/MEJORAS.md` §8 y la referencia.

- **Sustituyen a los antiguos.** La galería tiene solo los 11 nuevos y `avatar-art.tsx` desaparece. Los identificadores van en inglés (`olive`, `churro`, `croquette`, `dice`, `watermelon`, `lemon`, `omelette`, `popcorn`, `lantern`, `flip_flop`, `moon`) y `avatarImages` dice el archivo de cada uno.
- **Migración nueva.** Redefine `private.avatar_ids()`. Antes deja sin avatar a quien tenga uno antiguo en una sala abierta, porque la foto con un avatar desconocido no pasaría la validación del cliente y la sala dejaría de verse. Esos jugadores vuelven a su inicial y pueden elegir otro.
- **`next/image` sin optimizar.** Las imágenes ya vienen a 256 px y por debajo de 20 KB; optimizarlas en Vercel no ahorraría nada.
- **Pruebas.** Las que elegían un avatar antiguo pasan a uno nuevo (la regla que comprueban no cambia), y se añade que un avatar de la galería antigua se rechaza en la base de datos y en el cliente.

## 2026-10-15 · D.3 · El lobo, desde 4 jugadores y cambiar de juego en la sala

Fran pide, tras probar Luna llena, cuatro cambios. Contradicen a `docs/PLAN-5.md` §1 y §2 (nombre "Luna llena", de 6 a 16 jugadores) y a la referencia (la píldora del juego solo informa). El plan no se toca; esta entrada manda sobre él en estos puntos.

- **Nombre.** El nombre visible pasa a "El lobo". El identificador `luna_llena`, la carpeta `src/games/luna-llena`, las funciones `luna_llena_*` y las tablas `luna_*` no cambian: renombrarlos obligaría a migrar toda la base de datos sin que se note nada en pantalla. "El lobo" es genérico y no es el nombre de ningún juego comercial.
- **Desde 4 jugadores.** Migración nueva que redefine `private.luna_config` con el mínimo en 4; en el cliente, `MIN_LUNA_PLAYERS`. Con 4 o 5 vale el reparto recomendado de 6 (un lobo, la vidente y aldeanos), que ya cumple las reglas de validación. Las pruebas pgTAP 42 y 43 que comprobaban el mínimo de 6 se ajustan a 4: la regla que comprobaban es la que cambia.
- **Orden.** El lobo es el primero en el selector: va primero en `gameIds`.
- **Cambiar de juego en la sala.** En la sala de espera, la píldora del juego es para el anfitrión un botón con sombra, 44 px de alto y una etiqueta "Cambiar", que abre el selector. Elegir y pulsar "Abrir la sala" llama a `set_game`, que ya aceptaba cambiar el juego mientras no hay partida; elegir el mismo juego sirve para volver sin cambiar nada. Para los demás jugadores la píldora sigue informando.

## 2026-10-12 · D.2 · Luna llena sin veredicto

Fran decide quitar la segunda votación del juicio (condenar o salvar) que pide `docs/PLAN-5.md` §3, porque la considera redundante con la acusación. El plan no se toca; esta entrada manda sobre él en este punto.

- **Nuevo juicio.** El más votado en la acusación (contando doble al alcalde) va a la defensa, donde dice sus últimas palabras mientras todos ven quién votó a quién. Al pulsar el narrador "A la horca", sube a la horca. Con empate o sin votos no hay acusado y cae la noche, como antes.
- **Ejecución.** Enseña al ahorcado con su carta y otra vez quién votó a quién en la acusación. Ya no existe el acusado que se salva, así que desaparecen la clave del guion `spared` y la frase de "condenar o salvar"; `announcement.spared` queda siempre nulo.
- **Base de datos.** Migración nueva: sin fase `verdict`, sin `luna_llena_verdict` ni votos de veredicto (`luna_votes.condemn` desaparece). Continuar desde la defensa con acusado lo ahorca (`private.luna_hang`). El bufón ahorcado sigue ganando.
- **Cliente.** Sin pantallas de veredicto ni del acusado esperando; `viewFor` ya no necesita saber quién mira. El código de error `is_accused` deja de usarse y sale del cliente. El guion de la defensa pasa a "tienes la palabra: son tus últimas palabras".
- **Pruebas.** Las pgTAP, unitarias y e2e de Luna llena que usaban el veredicto se adaptan; en las pgTAP, el acusado de varias pruebas pasa a ser un aldeano para que ahorcarlo no acabe la partida. De paso, el ayudante `act()` de las e2e espera a que llegue cada acción de noche: una acción perdida dejó una vez la noche sin cerrar.

## 2026-10-11 · 32.2 y 32.3 · Repaso de anchos y accesibilidad de Luna llena

`accessibility-luna.spec.ts` juega con 16 jugadores de nombre de 14 caracteres y la composición recomendada (todos los roles). En la sala de espera, las cartas, la noche del lobo con las marcas de la manada, la de la vidente y la de quien sospecha, el amanecer con el aviso de los enamorados, el espectador, el alcalde, el debate con sus votos, la acusación, la defensa con quince votos, el veredicto (también el del acusado), la ejecución y el resultado comprueba, a 360, 390 y 430 px, que nada desborda, que todo lo pulsable mide 44 px o más y que hay un solo `h1`. Para llegar al final sin jugar tres días, los lobos se van de la sala, que también prueba el traspaso del narrador si el anfitrión era lobo. No hizo falta ningún cambio.

## 2026-10-11 · 32.4 · Revisión contra el plan de Luna llena

Repaso de las secciones 1 a 10 de `docs/PLAN-5.md`, una por una, y de su "Fuera de alcance".

- **Corregido.** La §9 pide que la elección de alcalde tenga resultado público. La foto ya traía los votos en el debate de ese día, pero la pantalla no los enseñaba. Ahora el debate enseña "Así se eligió al alcalde", agrupado por votado y sin voto doble. La agrupación de la defensa y la del alcalde son la misma función (`voteGroups`).
- **Añadido a la foto, sin estar en el plan.** `my.vote` (el voto propio en la votación en curso, para que quien recarga lo vea) y `my.chosen_lovers` (Cupido sabe a quién enlazó). Ninguno da información ajena.
- **Ya anotado antes.** El ganador en `luna_state.winner` (27.3), `kind` y `resume` en el anuncio (28.4 y 29.6), la clave `left` del guion y los datos `lover` y `mayor` de la narración (29.1).
- **Fuera de alcance.** No hay bruja ni otros roles, los enamorados no son un bando, no hay voz, sonidos, temporizadores, sucesor del alcalde, chats, estadísticas ni tema oscuro, y solo están las siete ilustraciones del anexo.

## 2026-10-11 · 31.1 a 31.6 · Pantallas del día, el juicio y el final

Ninguna tiene maqueta; se construyen con las piezas existentes y la tarjeta protagonista, como pide el plan.

- **31.1 y 31.2 juntas.** Alcalde y acusación comparten la misma pantalla de votar, así que van en un commit.
- **Distintivo del alcalde.** Píldora "Alcalde" en `lime` junto al nombre en las listas para elegir, y una línea con su nombre en la pantalla del debate. Un alcalde muerto deja de llevarlo.
- **Mientras se vota.** Tras votar solo se ve el propio voto y cuántos faltan, nunca a quién han votado los demás.
- **Ejecución por abandono.** El mismo marco que la ejecución de un juicio, con la píldora "Se ha ido" y sin votos.
- **Espectador.** Los muertos ven su tarjeta de "Has muerto", el anuncio en curso, de noche lo que marca cada uno en directo, los enamorados y todos los roles. No ven el botón de volver a ver la carta. Si el narrador muere, su caja sigue al pie.
- **Resultado.** El titular es "¡Has ganado!" o "Has perdido" según el bando: el pueblo gana con todos menos lobos y bufón; el bufón gana solo. Quien no jugaba ve el bando ganador como titular.
- **Volver a jugar.** Se empieza otra con la misma composición. Si ya no vale para los que quedan, se usa la recomendada; si no hay jugadores bastantes, se vuelve a la sala de espera, como en los demás juegos.

## 2026-10-11 · 30.4 · Sala de espera de Luna llena

- **Recomendada hasta que se toque.** Mientras el anfitrión no cambie nada, la composición es la recomendada para los jugadores que haya y se recalcula sola si entra o sale alguien. En cuanto cambia los lobos o un rol, se queda con la suya; la línea de composición sigue recalculando los aldeanos. Al empezar, la recomendada se envía nula y la calcula la base de datos con los jugadores de ese momento.
- **Solo la ve el anfitrión.** La composición vive en el estado de la pantalla del anfitrión, como el número de impostores, así que los demás no la ven hasta el reparto. Para que la vieran habría que guardarla en la sala, y eso pide una RPC y un campo nuevos que el plan no menciona.
- **Aviso.** Si la composición no vale, el botón de empezar se desactiva y el motivo aparece encima, en el mismo sitio que "faltan jugadores". `needPlayers` recibe ahora el mínimo de cada juego (6 en Luna llena); el texto para 3 no cambia.
- **Lo común.** El contador con "−" y "+" lo usan ya dos juegos (impostores y lobos), así que sale de la sala de espera a `src/components/Stepper.tsx`. Las pruebas de El impostor no cambian.
- **Roles opcionales.** Cada uno es un botón con `aria-pressed`, su dibujo en pequeño y su nombre; apagado, con borde discontinuo.

## 2026-10-11 · 30.3 y 32.1 · Esquema, acciones y el juego en el selector

- **El selector se adelanta.** Al añadir `luna_llena` a la lista de juegos, los tipos obligan a darle textos, portada y pasos de "Cómo se juega" (`Record<GameId, …>`). Esa es la 32.1, que se hace aquí: portada con la cabeza del lobo sobre `tomato` en un fondo `ink`, "De 6 a 16 jugadores" y cuatro pasos con los dibujos de los roles en pequeño.
- **Prueba del selector.** `GamePickerScreen.test.tsx` contaba seis juegos; ahora cuenta siete, con Luna llena la última, y comprueba su rango. Es el único cambio en una prueba existente, y lo exige el plan.
- **No va por rondas.** `isRoundGame` excluye también a Luna llena.
- **Arranque provisional.** Hasta que la sala de espera deje elegir la composición (30.4), "Empezar partida" envía la recomendada (`wolves` y `roles` nulos).
- **Roles en el cliente.** La lista de roles vive en `src/games/luna-llena/roles.ts` y la foto la importa de ahí, como hace con los avatares.
- **Tamaño del nombre en la carta.** El plan pide de 46 a 56 px "según quepa". No hay token entre 48 y 68 px y no se añaden tokens, así que el nombre usa `fitDisplay` con tope en `text-display-md` (48 px): "LOBO" sale a 48 px y "PROTECTOR" baja hasta caber a 360 px.

## 2026-10-11 · 29.6 y 29.7 · Abandono y resto de la foto

- **Abandono tras un juicio.** El plan dice que, si alguien se va de día, se vuelve al debate. Si se va durante la ejecución, o durante el disparo del cazador que la sigue, el juicio del día ya ha terminado; volver al debate permitiría un segundo juicio. En ese caso se sigue con la noche siguiente. El anuncio de tipo `left` guarda a dónde se vuelve en `resume` (`night`, `day` o `next_night`).
- **Votos cancelados.** Al volver al debate se borran la acusación y el veredicto de ese día, y también la elección de alcalde si estaba en curso. Un alcalde ya elegido ese día se mantiene.
- **Cazador muerto que se va.** Si aún no había disparado, pierde el disparo. Si estaba en su turno, se vuelve al anuncio sin disparo.
- **29.7.** `public_votes`, `accused_id`, `mayor_id` y todas las claves de `narration` llegaron con la foto en la 28.6. Esta tarea añade las pruebas de las claves que faltaban.

## 2026-10-11 · 29.2 y 29.3 · Alcalde y juicio

Las dos votaciones comparten la función de votar, el cierre automático y el forzado, así que van juntas.

- **Alcalde sin votos.** Si nadie vota, todos los vivos empatan a cero y el azar elige entre ellos, como en cualquier empate.
- **Votos del alcalde a la vista.** Se ven durante el debate del día en que se eligió. En la acusación y el veredicto dejan de verse.
- **Bufón ahorcado.** Al ahorcarlo se fija `luna_state.winner = 'jester'`, y la partida termina al continuar desde la ejecución, como pide el plan.
- **Veredicto sin respuesta.** Un veredicto nulo lanza `invalid_option`, el código que ya existe para "elige una de las dos".

## 2026-10-11 · 29.1, 29.4 y 29.5 · Continuar, cazador y victoria

Continuar desde un anuncio necesita saber si dispara el cazador y si alguien ha ganado, así que las tres tareas van en un commit.

- **Orden tras un anuncio.** Primero el disparo pendiente del cazador; al volver al anuncio, que ya incluye el disparo, el narrador continúa otra vez y entonces se comprueba la victoria. Así un cazador que muere en la última muerte también dispara.
- **Vuelta del cazador.** El disparo se añade al anuncio en curso y la partida vuelve a `dawn` o `execution`. La narración pasa a `hunter_shot`.
- **Narración compuesta.** `narration` es una clave y sus datos, pero algunas fases cuentan dos cosas. Si alguien muere de pena, los datos llevan `lover` y el narrador lee después la frase `lover_death`. Al empezar el debate del día en que se eligió alcalde, llevan `mayor` y se lee antes `mayor_elected`. El guion no tiene texto para quien se va de la sala; se añade la clave `left` ("{nombre} se ha ido del pueblo. Era {rol}.").

## 2026-10-11 · 28.4 y 28.5 · La noche en un solo commit

La 28.4 pide que la noche se cierre sola al actuar el último vivo, y eso es justo la resolución de la 28.5. Las dos van en un commit, con sus pruebas, para no dejar un cierre a medias entre ambos.

- **Anuncio.** Además de `deaths` y `spared`, el anuncio lleva `kind` (`night`, `trial` o `left`), para saber qué contar y qué votos enseñar sin deducirlo de las causas.
- **Día.** `luna_state.day` sube al resolver la noche: el amanecer ya es del día siguiente, y los votos de ese día van con su número.
- **Protector sin actuar.** Si el protector no actúa, `last_protected_id` queda vacío y a la noche siguiente puede proteger a cualquiera.
- **Sospechas.** Aldeano, cazador, bufón y Cupido desde la segunda noche marcan a otro jugador vivo, nunca a sí mismos. El protector sí puede protegerse.
- **Errores.** `already_acted` y `same_as_last_night` llegan al cliente con su mensaje. El objetivo inválido, muerto o ajeno a la partida usa `invalid_target`, como en el resto de juegos.

## 2026-10-11 · 27.3 · Diferencias entre el plan de Luna llena y el código

`docs/PLAN-5.md` se escribió contando con que `develop` acababa en la fase 13. Antes de empezar se fusionaron en `develop` las ramas de los planes 3 y 4 (fases 14–26), así que:

- **Numeración.** Las fases 14–19 del plan son aquí las 27–32, con la misma subnumeración: la tarea 15.3 del plan es la 28.3. El plan no se toca; la equivalencia queda en `docs/TAREAS.md`.
- **Séptimo juego, no quinto.** El selector pasa a tener siete juegos elegibles, y "Cómo se juega" (fase 24) gana los pasos de Luna llena, porque la sala de espera ya muestra ese botón para todos los juegos.
- **Avatares.** Las listas de jugadores de Luna llena pintan el avatar de la sala, como el resto de juegos (fase 25).
- **Ganador.** `games.winner` solo admite los bandos de El impostor y su `check` obliga a que sea nulo en los demás juegos. El bando ganador de Luna llena (`village`, `wolves` o `jester`) se guarda en `luna_state.winner`, una columna más de las que lista el plan, en vez de relajar esa restricción.
- **Quién ha actuado.** `game_players.has_voted` es de El impostor. En Luna llena `has_acted` se calcula con `luna_night_actions` y `luna_votes`, sin columna nueva.
- **Vivo y activo.** En los demás juegos `game_players.alive` significa "participa". En Luna llena significa "vivo", y quien se va muere, así que el sentido coincide.
- **Roles.** `game_roles.role` pasa a admitir los siete roles además de `player` e `impostor`. El aldeano es `villager` y no reutiliza `player`, para que el rol de cada juego se lea sin mirar el tipo de partida.
- **Expulsión.** Se mantiene la regla de la plataforma: a media partida solo se puede echar a un desconectado. Al echarle se aplica el abandono de la sección 5 del plan.
- **Entrar tarde.** Quien llega con la partida empezada no es participante (`my.is_participant` falso) y ve la pantalla de esperar, como en El impostor.
- **Volver a la sala.** Al terminar se usa `back_to_lobby`, que ya vale para cualquier juego; "Volver a jugar" llama a `luna_llena_start` con la misma composición.

## 2026-10-11 · 26.1 · Repaso de lo nuevo a 360, 390 y 430 px

`accessibility-mejoras.spec.ts` recorre, en los tres anchos, el inicio con "Escanear QR", la pantalla de nombre con la galería de avatares, la sala de espera con "Salir", "Cómo se juega", el tiempo para votar y las temáticas, y los tres diálogos (temáticas, avatar y tutorial). En cada uno comprueba que no hay desborde horizontal y que todo lo pulsable mide 44 px o más. Otra prueba recorre el tutorial solo con el teclado, con el foco visible, y lo cierra con Escape.

El repaso sacó un desborde que ya existía: a 360 px, "PREVIA" en el titular del inicio (`text-display-xl`, 84 px) ocupaba 14 px más que el ancho útil, y la página se podía desplazar en horizontal. Las pruebas anteriores miraban el inicio a 390, donde sí cabe. Se añade el punto de corte `xs` (390 px, el ancho de la referencia) en `globals.css` y el titular usa `text-display-lg` por debajo y el tamaño de la referencia desde ahí. Es el único cambio de tokens de esta tanda.
Descartado: bajar el titular a `text-display-lg` en todos los anchos, que se aleja de la referencia a 390.

## 2026-10-11 · 25.3 · Elegir y cambiar el avatar

Debajo del nombre, en las dos pantallas donde se escribe (crear sala y entrar por enlace), aparece "Tu avatar" con la inicial y las 12 ilustraciones (botones de 56 px con `aria-pressed` y el nombre de cada dibujo para lectores de pantalla). Por defecto se queda la inicial. Tras crear la sala o unirse se llama a `set_avatar`; si esa llamada falla se entra igual, porque el avatar se puede volver a elegir en la sala. En la sala de espera, tu propia ficha es un botón ("Cambiar tu avatar") que abre el mismo selector en un diálogo; cada toque guarda el avatar al momento. Las pruebas existentes de la pantalla de nombre y de la sala de espera solo ganan las propiedades nuevas en sus ayudantes, y las de `Room`, `RoomEntry` y `HomeFlow`, el doble de `setAvatar`.

## 2026-10-11 · 25.2 · Las 12 ilustraciones

Aguacate con gafas de sol, huevo frito, fantasma, cactus, plátano, pizza, nube enfadada, tostada, pulpo, dónut, cohete y pingüino, en SVG dentro del propio componente (`avatar-art.tsx`): caja de 40 × 40, borde `ink` grueso y relleno con los colores de la paleta (`fill-*`), sin imágenes ni estilos en línea. `Avatar` las pinta sobre `paper` cuando el jugador tiene avatar y, si está desconectado, en gris; si no, la inicial sobre su color, como siempre. El avatar llega a todas las pantallas por los mismos datos que el color (`Player` y `ParticipantView` lo toman de la lista de jugadores de la sala), y en esos tipos es opcional: sin él se pinta la inicial.

Se revisaron a 36 px y a 80 px en `/dev/componentes`; el plátano (demasiado fino, con los ojos fuera) y la sonrisa del aguacate (que se confundía con el hueso) se rehicieron. La prueba de `participants` de El impostor comparaba el objeto entero de cada participante y gana `avatar: null`.

## 2026-10-11 · 25.1 · Avatar en la base de datos

`room_players.avatar` guarda el nombre de una de las 12 ilustraciones de la galería (`private.avatar_ids()`, con un `check` que no admite otro) o nulo, que sigue enseñando la inicial. `public.set_avatar(sala, avatar)` lo elige, lo cambia o lo quita para quien llama, en cualquier momento; lanza `invalid_avatar` (código nuevo, añadido al cliente) si no es de la galería. La foto lleva `avatar` en cada jugador de la sala y el cliente lo valida con la misma lista (`src/lib/avatars.ts`). Las partidas no copian el avatar: las pantallas lo toman de la lista de jugadores de la sala, como ya hacían con el color.

Se elige con su propia acción y no como parámetro de `create_room` o `join_room`, para no tocar dos funciones que usan casi todas las pruebas; entrar y elegir son dos llamadas seguidas. Las fixtures de las pruebas ganan `avatar: null` en cada jugador.

## 2026-10-11 · 24.2 · Ilustraciones de los pasos

Cada paso de "Cómo se juega" lleva una ilustración en una caja de color `ground`, hecha con cuatro piezas en el estilo de las portadas del selector: caras redondas (la del impostor o la de quien adivina, en `ink`), etiquetas con borde grueso (tachadas para lo que se anula o no se puede decir), bocadillos y el "+1". Usan solo los tokens de la paleta, y sus pocos textos ("Pizza", "Fuera", "¡Prohibida!"…) salen de `copy.howTo.art`. Son decorativas (`aria-hidden`): lo que hay que leer está en el título y la frase del paso. Un guion temporal abrió los 18 pasos a 360 px y comprobó que ninguna ilustración se sale de su caja; las capturas sacaron una (las tres pistas de Una sola pista no cabían en fila) y se apilaron las dos repetidas.

## 2026-10-11 · 24.1 · Cómo se juega

En la sala de espera, debajo de la tarjeta del código y para todos, un botón "Cómo se juega" abre un diálogo con tres pasos del juego elegido ("Paso 1 de 3", título y una frase), con "Anterior" y "Siguiente". Los textos de los seis juegos están en `copy.howTo` y resumen las reglas de `docs/CONTEXTO.md`, `docs/JUEGOS.md` y `docs/JUEGOS-2.md`. El diálogo solo se monta abierto: así empieza siempre por el primer paso y, cerrado, su título no repite el nombre del juego en la página (la e2e de accesibilidad encontraba dos textos iguales). Las ilustraciones de cada paso llegan en la 24.2.

## 2026-10-11 · 23.3 · Votación que se cierra sola

`vote-timer.spec.ts` juega con 3 jugadores y 30 segundos para votar: todos ven la cuenta atrás, vota uno solo y nadie pulsa "Cerrar votación"; al acabarse el tiempo, todos ven la expulsión. Tarda unos 40 s por la espera, así que tiene un límite de 2 minutos.

Al cerrar la fase apareció un fallo intermitente en `38_impostor_categories` (de la 22.2): para comprobar que no se repite palabra dejaba activas "Tetris" y "Sonic", pero las partidas sin temáticas de antes en la misma prueba podían haber sacado una de ellas, y entonces repetir era lo correcto. Ahora deja activas dos de Videojuegos que aún no han salido en la sala. El código no cambia.

## 2026-10-11 · 23.2 · Cuenta atrás y cierre al llegar a cero

El anfitrión elige "Tiempo para votar" en la sala de espera (Sin, 30, 60 o 90 s; por defecto, sin). La cuenta atrás va en la píldora de la votación ("Votación · 0:23") y se calcula con la hora del servidor de la última foto (`useCountdown`), no con el reloj del móvil. Al llegar a cero, cada móvil pide `close_voting` una vez; si la base de datos responde `not_host` (aún no ve pasada la hora por desfase de reloj) se reintenta hasta tres veces cada 1,5 s, y cualquier otro fallo (otro móvil ya la cerró) no se enseña: la foto nueva llega por la sincronización. "Volver a jugar" usa el tiempo guardado en la partida.

Se detectó y corrigió un fallo propio antes del commit: la cuenta de una votación anterior (en 0) se arrastraba a la siguiente hasta el primer tic, y el móvil del anfitrión cerraba la segunda votación nada más abrirla. Cada cuenta va ahora con su hora límite; una prueba de `Room` lo cubre y falla con la versión antigua. Pruebas existentes modificadas: las que esperaban los ajustes de `startGame`, el ayudante de la sala de espera y la fixture de El impostor, que ganan los campos del tiempo.

## 2026-10-11 · 23.1 · Tiempo para votar en la base de datos

- `games.vote_seconds` (nulo, 30, 60 o 90, solo en El impostor) se fija al empezar: `start_game` gana un cuarto parámetro con valor por defecto, como las temáticas en la 22.2. Fuera de esos valores lanza `invalid_vote_seconds`, que se añade al cliente.
- `open_voting` guarda `games.voting_deadline` (ahora más el tiempo) y la foto la incluye solo durante la votación, con `vote_seconds`. La segunda votación de un empate vuelve a pasar por `open_voting`, así que el tiempo empieza de nuevo.
- `close_voting`: el anfitrión cierra cuando quiere, como siempre. Cualquier otro miembro solo puede cerrar una votación de El impostor con hora límite ya pasada; si no, recibe `not_host`, como antes. Así la votación se cierra aunque el móvil del anfitrión esté bloqueado, y nadie puede adelantarse. Al cerrar se borra la hora límite.
- La hora la decide la base de datos con `now()`: el móvil solo cuenta hacia atrás y pide cerrar al llegar a cero.
- Quien no es miembro recibe ahora `not_member` en vez de `not_host` al intentar cerrar, porque se comprueba que sea miembro antes que la hora. Ninguna prueba existente dependía de eso.

## 2026-10-11 · 22.3 · Selector de temáticas

Las 15 temáticas no caben en la sala de espera sin alargarla mucho, así que debajo de "Impostores" hay una fila "Temáticas" con lo elegido ("Todas", "Fútbol" o "3 temáticas") y un botón "Elegir" que abre un diálogo con una ficha por temática (`aria-pressed`) y "Todas", que quita el filtro. Lo elegido vive en el estado de `Room`, como el número de impostores, y "Volver a jugar" usa las mismas temáticas; al recargar vuelven a ser todas. Solo el anfitrión de una sala de El impostor pide la lista (`useImpostorCategories`), y mientras no llega no se enseña la fila.

`startGame` pasa a recibir un objeto con los ajustes de El impostor, para que el temporizador de la fase 23 no obligue a cambiar las llamadas otra vez. Las temáticas solo se envían si hay alguna elegida, así que la llamada a la base de datos sin temáticas es la misma de antes. Pruebas existentes modificadas: las que llamaban o esperaban `startGame(sala, 1)` (`actions` y `Room`), el ayudante de la prueba de la sala de espera, que gana las propiedades nuevas, y el doble de acciones de `Room`, que gana `impostorCategories`.

## 2026-10-11 · 22.2 · Temáticas en `start_game`

`start_game` gana un tercer parámetro, `categories text[] default null`; nulo o vacío es "todas". Como en Postgres una función con otro número de parámetros es otra función, se borra la de dos y se crea la de tres: la llamada de siempre, `start_game(sala, 1)`, sigue funcionando por el valor por defecto, y todas las pruebas de El impostor pasan sin tocarlas. `private.pick_word` gana el mismo parámetro y filtra solo si se le dan temáticas, así que Una sola pista la sigue llamando igual. Agotadas las palabras de las temáticas elegidas, se repite dentro de ellas antes que salirse.

`public.impostor_categories()` devuelve las temáticas con alguna palabra activa, en orden alfabético, para que la lista no esté escrita en el cliente. No bloquea ninguna sala porque no lee estado de partida, solo la tabla de palabras.

Código nuevo `invalid_categories` (`docs/MEJORAS.md` §9 no lo preveía): una temática que no existe o sin palabras activas se rechaza; si no, la partida intentaría crearse sin palabra y fallaría con un error técnico. Se añade también al cliente con su texto.

## 2026-10-11 · 22.1 · Cinco temáticas nuevas

Fútbol, Historia, Videojuegos, Ciencia y Geografía, con 20 palabras cada una, en una migración nueva. Ninguna repite una de las 200 primeras (la prueba de duplicados de `05_words` sigue pasando sobre las 300). Las temáticas son la columna `category` que ya existía, así que no hay tabla nueva. Una sola pista también las usa, porque saca sus palabras de la misma tabla.

`05_words` contaba 200 palabras en 10 categorías en toda la tabla. Se limita a las diez categorías de `docs/CONTEXTO.md` §9, así que comprueba lo mismo que antes sobre esas palabras; lo nuevo lo prueba `37_more_words`.

## 2026-10-11 · 21.2 · Escanear el QR desde el inicio

En la tarjeta del código, debajo de "Unirse", hay un botón "Escanear QR" que abre un diálogo con la cámara trasera. Cada 250 ms se lee un fotograma (reducido a 640 px de lado como mucho) y se busca un QR con `jsqr`, que se carga al abrir el diálogo. Si es el enlace de una sala o cuatro letras válidas, se cierra el diálogo y se entra en la sala por su ruta, igual que al escribir el código. Si es otro QR, lo dice y sigue buscando. Sin permiso de cámara (`NotAllowedError`) pide darlo o escribir el código; cualquier otro fallo (sin cámara, sin `mediaDevices`) pide escribir el código. La cámara vive en un componente que solo existe con el diálogo abierto, así que cerrarlo la apaga siempre.

La cámara, la lectura de fotogramas y el decodificador llegan como dependencias (`ScanDeps`), como las de las acciones, para probar el diálogo con dobles. Aparte se comprobó que `jsqr` lee el QR que dibuja `qrcode` con el enlace de una sala, y que en Chrome con una cámara simulada el vídeo arranca y el diálogo queda escaneando.
Descartado: llamar a `video.play()`, cuya promesa puede fallar sin más; con `autoPlay`, `muted` y `playsInline` el navegador lo reproduce solo.

## 2026-10-11 · 20.3 · Un final de partida que se ve

Al terminar cualquier juego, la píldora de la cabecera dice "Fin de la partida" (antes, "Sala ABCD"). El anfitrión ve "Cambiar de juego" con la variante destacada (`accent`, 56 px, como un botón principal) en lugar del botón pequeño, encima de "Volver a jugar". Los demás leen "Fran elige si jugáis otra o cambiáis de juego". Los botones mantienen sus textos ("Volver a jugar" y "Cambiar de juego") en vez de "Otra de [juego]" y "Elegir otro juego" de `docs/MEJORAS.md` §4: se entienden igual y con nombres de juego largos "Otra de ¿Quién es más probable que…?" ocupaba dos líneas. Las pruebas que leían "Fran decide si se vuelve a jugar" (`HostControls` y las e2e de `probable`, `quien_lo_dijo` y `que_prefieres`) leen el texto nuevo.

## 2026-10-11 · 20.2 · "Siguiente ronda" en El impostor

El texto que explica que la partida sigue ("La partida sigue. Quedan 4 jugadores y 1 impostor entre ellos.") ya estaba en la revelación; lo que confundía era el botón "Seguir hablando" y que la pantalla siguiente era igual a la de una partida nueva. El botón pasa a "Siguiente ronda" y, desde la segunda ronda, la píldora dice "Ronda 2 de la partida" en lugar de "Sala ABCD". Al terminar vuelve a decir la sala. Las tres pruebas que pulsaban "Seguir hablando" (`Room`, `HostControls` y la e2e del empate) pulsan ahora "Siguiente ronda".

## 2026-10-11 · 20.1 · Salir con un botón a la vista

`PillButton` (la píldora que al tocarla abría el diálogo de salir) se sustituye por `HeaderAside`: un botón "Salir" con borde, de 44 px, a la derecha de "La Previa", y la píldora, que ya solo informa (sala, juego o ronda), en su propia fila bajo la cabecera. Con las dos cosas en la misma fila, a 360 px el nombre del juego más largo partía "La Previa" y la propia píldora en dos líneas. El botón se llama "Salir de la sala" para lectores de pantalla y sigue abriendo la confirmación de siempre.

Pruebas existentes modificadas, porque buscaban la píldora como botón ("Ronda 3 de 10. Salir de la sala"): ahora buscan el texto de la píldora o pulsan "Salir de la sala". Son las de `Room`, el selector, la sala de espera, la del componente (que pasa a probar `HeaderAside`) y la e2e de `probable`, que comprobaba que la píldora decía el juego. Lo que comprueban no cambia.

## 2026-10-11 · 19.2 · Lo que entra en alcance con las mejoras

Fran y su grupo probaron los seis juegos y pidieron ocho mejoras, recogidas en `docs/MEJORAS.md` y ordenadas en `docs/PLAN-4.md`. Fran aprobó los dos documentos. Dos de ellas estaban en "Fuera de alcance" y entran porque las pide él:

- **Temporizador**, solo para la votación de El impostor (`docs/JUEGOS.md` §11 y `docs/JUEGOS-2.md` §9 lo dejaban fuera para todos los juegos; en los juegos por rondas sigue fuera).
- **Avatares con imagen** (`docs/CONTEXTO.md`, "Fuera de alcance"): una galería de ilustraciones dibujadas en el estilo de la app. Subir fotos sigue fuera.

`CLAUDE.md` todavía no nombra `docs/MEJORAS.md` ni `docs/PLAN-4.md`, y no se modifica sin permiso de Fran. Hasta que los añada, manda lo que él ha aprobado.

## 2026-10-11 · 19.2 · `jsqr` para leer el QR con la cámara

Para escanear desde la web hay que decodificar el QR de los fotogramas de la cámara. `BarcodeDetector` es nativo en Chrome para Android, pero Safari en iPhone no lo tiene, y sin iPhone la mitad del grupo se quedaría fuera. `qrcode`, la que ya usamos, solo dibuja QR: no los lee. `jsqr` 1.4.0 lee QR de una imagen en JavaScript puro, sin dependencias, con licencia Apache-2.0 y con sus propios tipos. Entra en la lista permitida como "una librería de QR", y solo se carga al abrir el escáner, así que no pesa en la primera carga.
Descartado: `html5-qrcode` y otras que traen su propia interfaz (habría que tapar sus estilos con los de Verbena) y escribir un decodificador propio.

## 2026-10-11 · 17.4 · Sesión larga con los seis juegos

`long-session.spec.ts` sigue en la misma sala de 4 jugadores tras Una sola pista con ¿Qué prefieres? y Palabras prohibidas, 5 rondas cada uno. En ¿Qué prefieres?, Álvaro recarga tras elegir mientras aún falta Marta y vuelve a ver su elección. En Palabras prohibidas, quien vigila recarga y sigue viendo la tarjeta, y quien adivina recarga y sigue sin verla. El título de la prueba pasa a decir seis juegos; lo que ya comprobaba no cambia. Las tres baterías pasaron tres veces seguidas sin fallos (535 unitarios, 811 pgTAP y 19 e2e en cada pasada). La primera vez que se lanzaron las tres pasadas seguidas en segundo plano, el sistema las paró por falta de memoria; se repitieron en primer plano, una batería detrás de otra.

## 2026-10-11 · 18.3 · Revisión final contra JUEGOS-2

Repasadas las secciones 0 a 9 de `docs/JUEGOS-2.md`. Se cumple lo que piden, con estas diferencias ya anotadas en su tarea:

- La elección de ¿Qué prefieres? va en `answers`, como dice §4, y por eso `has_responded` y los abandonos miran `answers` también en la fase `voting` de este juego (14.3).
- El turno de quien describe y el cálculo de quien vigila son auxiliares comunes con Una sola pista (`next_subject` y `next_active_after`), con las pruebas de Una sola pista intactas (16.3).
- Si quien vigila cambia a media ronda, el nuevo pasa a ver la tarjeta: es lo que pide §3 al calcularlo en cada acción (14.3).
- La tarjeta de una ronda anulada puede volver a salir, igual que la palabra en Una sola pista (16.3).
- En la pantalla de quien adivina, el titular es "Adivina en voz alta" y no el nombre de quien describe, para que un nombre largo no se parta (17.2).

Fuera de alcance: no hay temporizadores, cuentas atrás ni sonidos; no hay equipos; nada de lo que se dice en voz alta se comprueba por escrito; no hay dilemas ni tarjetas de los jugadores ni puntos entre partidas. No hay maquetas nuevas: las dos portadas son las fichas "A" y "B" y la palabra tachada que ya estaban dibujadas, a tamaño de portada grande, y `globals.css` no ha cambiado; `orange` y `tomato` se añaden como tonos de componentes con los tokens que ya existían.

Comprobado además que ningún juego importa de la carpeta de otro, que no hay `TODO`, `console`, `as` fuera de `as const` ni `eslint-disable` en lo nuevo, que no hay políticas nuevas ni `service_role`, y que todas las funciones nuevas de `private` se usan.

## 2026-10-11 · 17.3 · Accesibilidad de los dos juegos nuevos

La e2e de accesibilidad de la 12.5 suma una prueba por juego, con 3 jugadores, que comprueba en cada pantalla visitada que todo lo pulsable mide 44 px o más y que hay un solo `h1`. En ¿Qué prefieres? se marca la opción con Tab y Enter (con el foco visible y `aria-pressed`) y se envía igual. En Palabras prohibidas se miran las tres pantallas a la vez (describir, vigilar y adivinar) y quien describe marca el acierto solo con el teclado. No hizo falta cambiar ninguna pantalla: las opciones y la lista de acertantes son `button` con `aria-pressed`, y las opciones llevan `aria-label` con su letra y su texto.

## 2026-10-11 · 17.2 · Repaso con 16 jugadores a 360, 390 y 430 px

Un guion temporal (fuera del repositorio, como en la 12.4) juega en una sala de 16 jugadores, repartidos entre los tres anchos y con nombres de 14 caracteres de letras anchas ("Mmmmmmmmmmmm01"), una ronda de ¿Qué prefieres? con el dilema más largo (45 caracteres por opción) y dos de Palabras prohibidas con las tarjetas más largas ("Extraterrestre" y "Fantasma" con "Casa encantada"). Hasta el resultado de cada juego comprueba en los 16 móviles que no hay desborde horizontal. No desborda nada. Las capturas sacaron dos defectos, que se arreglan:

- En "Adivina en voz alta", el nombre de quien describe era el titular y catorce letras anchas se partían en dos líneas. El titular pasa a ser "Adivina en voz alta" y el nombre va en el texto, que corta por los espacios.
- El tachado de las prohibidas tapaba las letras en la tarjeta oscura. Se quita; el rótulo "No se puede decir" ya dice lo que son, y quien describe y quien vigila tienen que leerlas de un vistazo.

Visto y no cambiado: en el resultado común, que ya existía, catorce letras igual de anchas también parten el nombre del ganador. Con nombres reales de 14 letras cabe, porque `fitDisplay` está medido con palabras reales; cambiar sus umbrales movería también la palabra de El impostor.

## 2026-10-11 · 16.7 · Pantallas de Palabras prohibidas

Sin maqueta y con acento `tomato`, que va con la tarjeta oscura (`ink` con sombra `tomato`) que pide `docs/JUEGOS-2.md` §7; se añade como acento del resultado común, porque la píldora ya lo tenía.

- **Quien describe** ve la tarjeta oscura con la palabra y las cinco prohibidas tachadas, "¿Quién ha acertado?" con la lista de los que adivinan (ni él ni quien vigila), "Ha acertado Marta" cuando marca a alguien y "Pasar". Se marca y luego se confirma, como el voto, porque el punto no se puede deshacer. `CandidateList` recibe la etiqueta del marcado ("Acierta"); por defecto sigue diciendo "Tu voto".
- **Quien vigila** ve la misma tarjeta y el botón "¡Prohibida!".
- **Quien adivina** ve "Adivina en voz alta" con el nombre de quien describe y de quien vigila, y espera a que se marque. El anfitrión, si adivina, también espera: en esta fase no le toca nada.
- **La revelación** nombra la palabra y cómo ha acabado ("Lo acierta Marta" con "+1 para Marta y +1 para Lucía", "Se dijo una prohibida" o "Lucía ha pasado") y lista las prohibidas. El resultado usa la pantalla común con "Gana la partida".
- No hay lista de quién falta, porque ninguna ronda espera a todos, y por eso tampoco se echa a nadie desde estas pantallas. Una ronda no se atasca: si quien describe se desconecta, quien vigila (que se calcula prefiriendo a los conectados) puede cerrarla con "¡Prohibida!".

## 2026-10-11 · 16.6 · Palabras prohibidas elegible y sin "Próximamente"

Con este juego ya no queda ninguno próximo, así que el bloque "Próximamente" del selector y sus textos (`games.soon`, `games.upcoming`) se quitan aquí mismo en vez de dejar una lista vacía o código sin usar hasta la 17.1. La portada es la palabra tachada que ya estaba dibujada, a tamaño de portada grande y sobre el mismo `lilac` de la referencia. La prueba existente del selector pasa a contar seis juegos y a comprobar que no aparece "Próximamente".

## 2026-10-11 · 16.3 · Turnos y ronda anulada en Palabras prohibidas

- `private.una_pista_next_guesser` pasa a ser `private.next_subject` y elige también a quien describe; `open_round` la usa para los dos juegos y guarda la tarjeta en `game_rounds.card_id` con `private.pick_card`, que no repite tarjeta en la sala.
- `private.next_active_after(partida, X)` es el "siguiente activo por orden de entrada después de X, empezando por los conectados". Quien vigila es el siguiente después de quien describe, y el árbitro de Una sola pista, cuando al anfitrión le toca adivinar, el siguiente después del anfitrión. Las pruebas de Una sola pista pasan sin tocarlas.
- Si se va quien describe antes de la revelación, la ronda se borra y se vuelve a abrir con el mismo número, como en Una sola pista. La tarjeta de la ronda borrada puede volver a salir, igual que allí la palabra.
- Acertar, pasar y "¡Prohibida!" guardan el resultado y pasan a la revelación en la misma auxiliar. Acertar da un punto a quien acierta y otro a quien describe.
- Los textos de `not_describer` y `not_watcher` dicen a cada uno lo que sí puede hacer.

## 2026-10-11 · 15.8 · Más pasos de Tab en el selector

La e2e de accesibilidad de la 7.1 llega a "Abrir la sala" con `tabTo`, que prueba como mucho 6 pulsaciones de Tab. Con cinco juegos elegibles el selector tiene 7 paradas (píldora, cinco juegos y el botón), y con seis tendrá 8, así que esa llamada pasa a admitir 10, igual que la de "Mostrar QR" en la misma prueba. Sigue comprobando lo mismo, que el botón se alcanza y se pulsa solo con el teclado; solo cambia cuántos elementos hay delante. La e2e nueva juega 5 rondas con 3 jugadores: mayorías de dos y de tres, y en la ronda 3 el anfitrión cierra con una A y una B, que empatan.

## 2026-10-11 · 15.7 · Pantallas de ¿Qué prefieres?

Sin maqueta, con los componentes de los otros juegos por rondas y acento `orange`, que se añade como tono de la píldora pulsable y del resultado común (el token ya existía, como el `lime` de la 11.5). El dilema es el titular "¿Qué prefieres?" y debajo las dos opciones como tarjetas-botón grandes con su ficha "A" o "B" y un "o" entre ellas. Tocar una la marca (`aria-pressed`) y el botón del pie dice "Elegir la A"; la elección se envía con ese botón, igual que el voto en `probable`, porque no se puede cambiar y un toque sin querer la gastaría. La espera es la común con "Han elegido 1 de 3" y "Tu elección: …". El reparto nombra la opción mayoritaria en la tarjeta protagonista (o "Empate" o "Nadie ha elegido") y lista las dos opciones con cuántos y quiénes, y el "+1" en la mayoritaria. El resultado usa la pantalla común con "Quien mejor conoce al grupo". La prueba de entrar tarde en `Room` suma el caso del juego nuevo. Este commit arregla también el formato de `copy.ts`, que se coló sin pasar Prettier en el de la 15.6.
Descartado: elegir con un solo toque, que no deja corregir un toque sin querer.

## 2026-10-11 · 15.6 · ¿Qué prefieres? pasa a elegible

El selector lista cinco juegos elegibles y deja "Palabras prohibidas" como único próximo. La portada son las fichas "A" y "B" que ya estaban dibujadas, a tamaño de portada grande, sobre `orange`. La prueba existente del selector contaba cuatro juegos y dos próximos; se actualiza a cinco y uno, como se hizo en la 9.7 y la 10.8 al añadir cada juego. Elegir el juego y empezar con las rondas elegidas ya llama a `que_prefieres_start`; las pantallas de la partida llegan en la 15.7.

## 2026-10-11 · 14.3 · Diferencias entre JUEGOS-2 y el código

Lo que `docs/JUEGOS-2.md` nombra coincide con el código: `rooms.game`, `games.game_type`, `games.phase`, `prompts`, `answers`, `game_rounds.subject_id` y `result`, y las auxiliares comunes de la 10.3. Fran confirma las cuatro decisiones de su §0 y autoriza añadir a `CLAUDE.md` las referencias a `docs/JUEGOS-2.md` y `docs/PLAN-3.md`. Lo que el código pide resolver:

- **`has_responded` en `voting`** mira `votes`, pero la elección de ¿Qué prefieres? va en `answers` (§4). Se añade un caso por juego: en `que_prefieres` cuenta la fila de `answers`.
- **Irse a media ronda** solo borra `answers` en `writing`. En `que_prefieres` la elección también se borra en `voting`, como pide §2.
- **Turno de quien describe:** es la misma regla que el adivino de Una sola pista, así que `private.una_pista_next_guesser` pasa a ser la auxiliar común `private.next_subject` en cuanto la usan dos juegos.
- **Quien vigila:** es el mismo cálculo que el árbitro de Una sola pista cuando al anfitrión le toca adivinar ("el siguiente activo por orden de entrada después de X, prefiriendo a los conectados"). Se extrae `private.next_active_after(partida, X)` y `private.una_pista_arbiter` pasa a usarla; conserva su nombre porque lo usan sus pruebas.
- **Si quien vigila cambia a media ronda** (se va o se desconecta), quien le sustituye pasa a ver la palabra: es consecuencia de calcularlo en cada acción, como manda §3. Quien deja de vigilar al reconectarse otro sigue sabiéndola; se acepta.
- **Puntos y reparto de ¿Qué prefieres?** se guardan al cerrar la ronda en `game_rounds.result` (`{choices: {a, b}, majority}`), como el recuento de `probable` (9.3): lo que pase después no cambia lo ya enseñado.
- **Resultado de Palabras prohibidas** en `game_rounds.result` con la forma que pide §6 para la foto (`{type: …}`).
- **Acertante no válido** (quien describe, quien vigila, un inactivo o alguien de fuera) lanza `invalid_target`, ya existente. Los códigos nuevos son los tres de §5: `invalid_option`, `not_describer` y `not_watcher`, que se añaden también al cliente.
- **`text_b`** sigue el límite de `text` (1 a 200 caracteres) y un `check` exige que exista si y solo si el juego es `que_prefieres`.
- **Las prohibidas de una tarjeta** se comparan con `private.normalize_clue`, la misma normalización de Una sola pista (11.1).
  Descartado: guardar quien vigila al abrir la ronda, que la dejaba atascada si se desconectaba (el mismo motivo de la 11.2).

## 2026-10-10 · Harness · Se adopta rsc y el flujo con ramas

Fran pide instalar rsc-harness (`npx @ericrisco/rsc@3.0.13 onboard`, perfil técnico, software en crecimiento, solo Claude Code) y tomar sus reglas. Por eso, y solo con su autorización expresa, cambia `CLAUDE.md`:

- Se trabaja con ramas y pull requests. `main` es producción y queda cerrada para el agente; `develop` es la rama de integración y de ella salen las ramas de trabajo.
- Los mensajes de commit llevan gitmoji delante del formato Conventional Commits, porque el gancho `gitmoji-guard` lo exige.
- El agente pregunta en qué rama trabajar y pide aprobar la especificación en la cadena spec-driven, aunque la regla general sigue siendo no preguntar.

Se mantienen la prohibición de mencionar a una IA en los commits (`.githooks/commit-msg`), un commit por tarea y no hacer push sin que Fran lo pida. Por esto último quedan desactivados `knowledge-sync`, que subía `01-TOOLS/` y `02-DOCS/` a la rama `rsc/knowledge` al final de cada turno, y `git-permissions`, que dejaba hacer commit, push y pull requests sin confirmar.
Pendiente: la constitución de `02-DOCS/wiki/sdd/constitution.md` es un borrador; se completa con la fase `constitution` antes de la primera funcionalidad por la cadena spec-driven.
Descartado: trabajar directamente en `main`, que era la regla anterior.

## 2026-10-10 · 13.3 · Revisión final contra JUEGOS

Repasadas las secciones 1 a 11 de `docs/JUEGOS.md`. Se cumple lo que piden, con estas diferencias ya anotadas en su tarea:

- La foto de ¿Quién lo dijo? no dice quién falta por votar y añade `vote_progress` y `annulled` (10.5).
- `back_to_lobby` vale para cualquier juego terminado; para El impostor se comporta igual (9.3).
- Las acciones de El impostor exigen que la partida sea de El impostor (9.3).
- `votes` cambia su `check` por un disparador para permitir votarse a sí mismo en `probable` (8.3).
- En Una sola pista se reutilizan códigos existentes en vez de inventar otros (11.2).

Fuera de alcance: no hay temporizadores, equipos, comparación de la adivinanza escrita, moderación, plurales ni sinónimos, packs de contenido ni puntos entre partidas. Las ilustraciones nuevas son solo las tres portadas, y no hay tokens nuevos: `globals.css` no ha cambiado en esta tanda; el tono `lime` de la píldora usa el token que ya existía.

Comprobado además que ningún juego importa de la carpeta de otro y que no hay `TODO`, `console`, `as` fuera de `as const` ni `eslint-disable`. Se quitan dos tipos y seis textos de El impostor que ya no usaba nadie (`GameState`, `Outcome` y `copy.result.groupWins`…). Todas las funciones de `private` se usan.

## 2026-10-10 · 12.6 · Sesión larga

`long-session.spec.ts` juega en una sola sala de 4 jugadores una partida de El impostor y otra de cada juego por rondas (5 rondas), cambiando de juego desde el resultado. En cada una alguien recarga a mitad y se comprueba que vuelve a la misma pantalla con lo suyo: el papel en El impostor, su voto en ¿Quién es más probable que…?, su respuesta en ¿Quién lo dijo? y, en Una sola pista, el adivino sigue sin ver la palabra durante la revisión. La prueba tiene un límite de 6 minutos porque son 16 rondas seguidas. Al escribirla se vio que, como en El impostor, el anfitrión o el árbitro solo pueden cerrar una fase después de hacer su parte (votar, dar pista); es el diseño de la 09 y se mantiene.

## 2026-10-10 · 12.5 · Repaso de accesibilidad de los juegos nuevos

Una e2e (`accessibility-games.spec.ts`) recorre una ronda de cada juego nuevo con 3 jugadores y comprueba en cada pantalla visitada que todo lo pulsable mide 44 px o más y que hay un solo `h1`; además, que el selector de rondas, el campo de respuesta, el de pista y las pistas de la revisión se usan con Tab y Enter, y que el foco se ve. Los campos ya llevaban `label` y los botones sin texto propio, `aria-label`. Faltaba encabezado en tres pantallas: la votación de ¿Quién lo dijo? (la respuesta elegida pasa a ser el `h1`), la pista y la espera de Una sola pista (la palabra) y la pantalla del adivino ("Tus pistas").
Descartado: recorrer las cinco rondas de cada juego en esta prueba, que repite pantallas ya comprobadas.

## 2026-10-10 · 12.4 · Repaso con 16 jugadores a 360, 390 y 430 px

Un guion temporal (fuera del repositorio, como en la 1.7) juega en una sala de 16 jugadores con nombres de 14 caracteres una partida de cada juego nuevo, con respuestas de 80 caracteres y pistas de 20, y en cada pantalla comprueba en los 16 móviles que no hay desborde horizontal. No desborda nada en ningún ancho. Las capturas sacaron un defecto: una pista de 20 letras anchas ("ZQWXZ…") se partía en dos líneas en la revisión y en la pantalla del adivino. El tamaño de las pistas pasa a una función común (`clue-size.ts`): hasta 12 letras, en mayúsculas al tamaño de la pantalla; de 13 a 16, `text-lg` sin mayúsculas; de 17 a 20, `text-base`. Los nombres de 14 caracteres se recortan con puntos suspensivos en las fichas de dos columnas de la sala de espera, como ya pasaba en El impostor; en las listas de una columna se ven enteros.
Descartado: partir las pistas largas, que deja una letra suelta en otra línea.

## 2026-10-10 · 12.3 · El texto de entrar tarde ya venía de la 9.8

La pantalla de entrar tarde pasó a `src/screens` con el texto por prop en la 9.8, cuando la usó el segundo juego: El impostor dice "Juegas en la siguiente partida" y los juegos por rondas, "Juegas desde la siguiente ronda" con la espera "Esperando a la siguiente ronda". La 12.3 se cierra añadiendo las pruebas de los cuatro juegos en `Room`.

## 2026-10-10 · 12.2 · Empezar sin gente suficiente

Los cuatro juegos piden de 3 a 16 jugadores, así que el mínimo es una constante de la sala de espera (`MIN_PLAYERS = 3`) y no algo de cada juego. Con menos, el botón "Empezar partida" se desactiva y encima aparece "Hacen falta al menos 3 jugadores: falta 1. Comparte el código…", enlazado al botón con `aria-describedby`. El servidor sigue rechazando con `not_enough_players` por si la sala cambia entre la foto y la acción.
Descartado: dejar el botón activo y enseñar el error después de pulsarlo, que es lo que pasaba hasta ahora.

## 2026-10-10 · 12.1 · "Próximamente" sin La bomba

El selector deja cuatro juegos elegibles y dos próximos, "Palabras prohibidas" y "¿Qué prefieres?". Las portadas de los próximos pasan de ir por posición en la lista a ir con cada juego, para que quitar uno no cambie la portada de los demás.

## 2026-10-09 · 11.5 · Pantallas de Una sola pista

Con los componentes existentes y acento `lime`, que se añade como tono de la píldora pulsable (el token ya existía). El adivino ve "Te toca adivinar" mientras se escriben y revisan las pistas, y después solo las vivas, grandes; quien da pista ve la palabra y su categoría y un campo de 20 caracteres; la revisión lista las pistas con su autor, las anuladas tachadas, y cada una es un botón (con `aria-pressed`) para quien ha dado pista; el árbitro ve "Cerrar pistas", "Enseñar pistas" y los botones "Acertada", "Fallada" y "Pasa"; la revelación enseña la palabra, cómo ha ido y todas las pistas; el final, "7 de 10" con la frase de su tramo. `RoundControls` pasa a recibir `inCharge` en vez de `isHost`, porque en este juego lleva la ronda el árbitro y la partida el anfitrión. Las pistas de más de 12 letras se pintan más pequeñas y sin mayúsculas en la pantalla del adivino: en mayúsculas no cabían a 360 px.
Descartado: mantener el tamaño y dejar que la pista se parta, que a 360 px cortaba "SUPERCALIFRAGILISTI" en dos líneas.

## 2026-10-09 · 11.2 · Adivino, árbitro y ronda anulada en Una sola pista

- **Adivino:** al abrir cada ronda, el participante activo que menos veces ha adivinado y, entre ellos, el primero por orden de entrada. Así rota por orden de entrada, salta a quien se ha ido y quien llega tarde se pone a la cola sin colarse. Se guarda en `game_rounds.subject_id`.
- **Árbitro:** se calcula en cada acción, no se guarda. Es el anfitrión; si le toca adivinar, el siguiente participante activo por orden de entrada después de él, prefiriendo a los conectados. Así un traspaso de anfitrión o un desconectado no dejan la ronda sin árbitro.
- **Si se va el adivino** antes de la revelación, la ronda se borra con sus pistas y se vuelve a abrir con el mismo número, otro adivino y otra palabra: no cuenta para el total. La palabra de la ronda borrada puede volver a salir. Como quien se va todavía figura en la sala mientras se trata su abandono, abrir ronda recibe a quien se está yendo para dejarlo fuera.
- **Códigos:** `una_pista_mark` con un resultado que no es `correct`, `wrong` ni `pass` lanza `invalid_answer`; anular pistas sin haber dado ninguna lanza `not_participant`, y una pista que no existe, `invalid_target`. No hacen falta códigos nuevos.
- El marcador de equipo no se guarda: se cuenta en las rondas marcadas como `correct`.
  Descartado: guardar el árbitro al abrir la ronda, que la dejaba atascada si ese jugador se desconectaba.

## 2026-10-09 · 11.1 · La normalización conserva la ñ

`private.normalize_clue` pasa a minúsculas, quita tildes (á, à, â) y diéresis (ü) y quita los espacios, como pide `docs/JUEGOS.md` §5. La ñ no es una tilde de acento sino otra letra, así que "año" y "ano" no se anulan entre sí. Se hace con `translate` y sin la extensión `unaccent`, que habría que instalar y que también convertiría la ñ en n.
Descartado: `unaccent`, por la ñ y por ser una dependencia más de la base de datos.

## 2026-10-09 · 10.8 · Pantallas de ¿Quién lo dijo?

Con los componentes existentes y acento `lilac`: tarjeta protagonista con la pregunta y campo "Tu respuesta" (80 caracteres, se envía también con la tecla de enviar); espera de respuestas con las fichas de quién falta; votación con la respuesta elegida entre comillas « » y la lista de todos menos uno mismo; el autor ve "Es la tuya" con su respuesta y el contador de votos; la espera de votos enseña solo el contador (ver 10.5); la revelación nombra al autor, dice quién acertó y quién falló y lista el resto de respuestas con su autor; una ronda anulada lo explica y lista todas. El resultado usa la pantalla común con "Gana la partida". En el selector, "¿Quién lo dijo?" pasa de "Próximamente" a elegible con el bocadillo "¿?" como portada; el test del selector se actualiza para tres juegos.
Descartado: un campo de varias líneas, que invita a escribir más de lo que cabe en una línea de 80 caracteres.

## 2026-10-09 · 10.7 · Lo común de los juegos por rondas en el cliente

`src/games/rounds/` no es un juego: guarda lo que comparten los juegos por rondas y que ya usan dos. Contiene los datos derivados (jugadores, clasificación con puestos compartidos, ganadores, última ronda), la espera de respuestas (`WaitScreen`, con el contador y, si se puede decir, las fichas de quién falta), la lista para votar, el resultado con la clasificación, los controles del anfitrión (`RoundControls`, que reciben el texto del botón y el de espera) y "volver a jugar o, si faltan jugadores, volver a la sala". La píldora "Ronda 3 de 10" sale de `copy.rounds.pill`. `probable` se queda con lo suyo (pregunta, recuento) y sus pruebas de lo común pasan a `src/games/rounds`. Un juego no importa nada de la carpeta de otro.
Descartado: meter El impostor en estas piezas, que no va por rondas y ya funciona.

## 2026-10-09 · 10.5 · En la votación de ¿Quién lo dijo? no se dice quién falta

`docs/JUEGOS.md` §9 pide las fichas de quién falta también en la espera de votos, pero en `quien_lo_dijo` el autor no vota: el último en votar vería que solo faltan él y otro, y sabría quién es el autor. Como la duda toca el secreto, se elige lo más restrictivo: en esa fase `has_responded` es `false` para todos y la foto lleva solo `vote_progress` (`{voted, total}`) para el contador. En la escritura sí se ve quién ha respondido. La foto añade también `annulled` en la revelación, para decir que la ronda se anuló sin depender de que falte el autor.
Descartado: enseñar las fichas como en las otras esperas, que filtra al autor.

## 2026-10-09 · 10.4 · Detalles de ¿Quién lo dijo?

- Una ronda sin respuestas se salta: cuenta como jugada (la partida sigue teniendo las rondas elegidas) y se abre directamente la siguiente, o se termina si era la última. Queda marcada con `{"skipped": true}`.
- Si se va el autor elegido durante la votación, se borran los votos de la ronda, se marca `{"annulled": true}` y se pasa a la revelación. Las respuestas de la ronda, también la suya, se conservan para enseñarlas, como pide `docs/JUEGOS.md`.
- En la votación el autor cuenta como que ya ha respondido, así que la fase avanza sola cuando votan todos los demás.
- Se puede votar a cualquier participante activo menos a uno mismo, aunque no haya respondido: adivinar mal también es jugar.
- Los votos repetidos usan el código existente `already_voted`; `already_answered` es para las respuestas.
  Descartado: no contar la ronda saltada, que podía alargar la partida sin fin si nadie escribe.

## 2026-10-09 · 10.3 · Lo común de los juegos por rondas en SQL

Lo compartido vive en `private`: `start_round_game` (validaciones y creación), `open_round` (incorporación y pregunta sin repetir), `next_round`, `all_responded`, `round_departure` (abandono y final anticipado con menos de 3) y `round_state` (parte común de la foto, con la clasificación al terminar; cada juego añade lo suyo y `with_my` mete sus campos en `my`). Lo que cambia de un juego a otro se reparte en tres funciones pequeñas que cada juego amplía con un `case`: `first_phase`, `has_responded` (qué cuenta como haber respondido en cada fase) y `close_if_done` (qué cierre toca cuando ya no falta nadie). `probable` pasa a usarlas y sus pruebas siguen pasando sin tocarlas; sus funciones sustituidas se borran.
Descartado: tablas de configuración por juego o SQL dinámico, que son el "motor de juegos" que `docs/JUEGOS.md` deja fuera.

## 2026-10-09 · 9.8 · Pantallas de ¿Quién es más probable que…?

Sin maqueta, se montan con los componentes de El impostor: píldora "Ronda 3 de 10" en `sky` (sirve para salir, como la de la sala), tarjeta protagonista girada con la pregunta ("…se pierda en un museo?", con la píldora "¿Quién es más probable que…" encima), lista de votar igual que la 08 pero incluyéndose uno mismo, espera de votos igual que la 09 ("Han votado 2 de 4"), y recuento con la tarjeta en `lime` para el más votado y una fila por jugador votado con "3 votos de …" y un "+1" para quien puntúa. El resultado nombra a "el más probable de la noche" (todos los empatados; "Nadie ha sumado puntos" si nadie puntuó) y debajo la clasificación con puestos compartidos en los empates. La pantalla de entrar tarde pasa a `src/screens` con el texto por prop, porque ya la usan dos juegos; quien se fue y ha vuelto a media ronda también la ve. Las píldoras largas van sin mayúsculas para no partirse a 360 px.
Descartado: enseñar en el recuento a quien no ha recibido votos, que con muchos jugadores alarga la pantalla sin decir nada.

## 2026-10-09 · 9.7 · El selector de juegos con más de un juego

Cada juego elegible es una tarjeta-botón con `aria-pressed`, su portada, descripción y jugadores; la elegida lleva la pegatina "Elegido" y la sombra dura, las demás no. Se elige primero el juego que ya tiene la sala, y "Abrir la sala" llama a `set_game` con el elegido. La portada de `probable` son tres caras en `sky` con la del centro en `lime` y un "+1". La prueba existente "muestra El impostor elegido…" daba por hecho un solo juego (exigía que los únicos botones fueran la píldora y "Abrir la sala", y un único "De 3 a 16 jugadores"), así que se reescribe para el selector con varios juegos; las demás pruebas del selector solo cambian cómo se monta.
Descartado: mantener la tarjeta grande solo para el elegido y fichas pequeñas para el resto, que cambia el tamaño de todo al elegir.

## 2026-10-09 · 9.7 · Selector de rondas

En la sala de espera de un juego por rondas, el anfitrión ve "Rondas" con tres botones (5, 10, 15; `aria-pressed`), en el mismo marco que el selector de impostores. Las rondas elegidas viven en el estado de `Room`, como los impostores, y empiezan en 10. La píldora de la cabecera dice el nombre del juego elegido. El texto de `invalid_game` deja de decir "jugad a El impostor".
Descartado: un campo numérico, que deja escribir valores que no valen.

## 2026-10-09 · 9.4 · Irse a media votación en un juego por rondas

Se borran el voto de quien se va y también los votos que había recibido en esa ronda: quien le votó vuelve a la pantalla de votar. Así nadie se lleva un punto estando fuera y ningún voto se pierde en un jugador que ya no está. Después, con menos de 3 activos la partida termina; si no, se comprueba si ya han votado todos. En la revelación solo se marca como fuera: el recuento ya enseñado no cambia, como en El impostor.
Descartado: dejar los votos recibidos, que podían dar el punto de la ronda a alguien que se ha ido.

## 2026-10-09 · 9.4 · Al abrir ronda juegan todos los miembros de la sala

Al abrir cada ronda se incorporan todos los miembros: quien llegó tarde y también quien se fue y ha vuelto a entrar, que recupera su fila con sus puntos (`alive = true`). Quien vuelve a media ronda espera, como quien llega tarde. A quien echan deja de ser miembro y no vuelve.
Descartado: dejar fuera para toda la partida a quien se fue, que en un juego por rondas castiga un corte de conexión sin motivo.

## 2026-10-09 · 9.3 · Cada acción comprueba el juego de la partida

`private.require_phase`, que usan todas las acciones de El impostor, pasa a exigir además que la partida sea de El impostor (con la auxiliar nueva `private.require_game(sala, juego, fase)`). Sin eso, el anfitrión podía llamar a `close_voting` sobre una votación de `probable` y eliminar a alguien. `back_to_lobby` deja de usarla y comprueba `finished` para cualquier juego. `probable_start` exige que la sala tenga elegido `probable` (`invalid_game`); `start_game` no se toca para no cambiar El impostor.
Descartado: confiar en que el cliente solo llama a las acciones del juego en curso.

## 2026-10-09 · 9.3 · El recuento se guarda al cerrar la ronda

Al cerrar, `game_rounds.result` guarda `{tally: [{user_id, votes, voter_ids}], winner_ids}`, ordenado de más a menos votos, y se suman los puntos en ese momento. La revelación enseña lo guardado, así que lo que pase después (alguien que se va) no cambia lo que ya se ha visto. El recuento solo lista a quien ha recibido algún voto; los nombres los pone el cliente con la lista de participantes, donde siguen quienes se han ido.
Descartado: recalcular el recuento en cada foto a partir de `votes`.

## 2026-10-09 · 8.6 · La prueba de secreto ignora la clave `type`

Cuatro aserciones de `10_impostor_rules` comprobaban que el valor `"impostor"` no aparece en ningún punto de `game` en la foto de un jugador normal (y que aparece una sola vez en la del impostor). Con `type: "impostor"`, que exige `docs/JUEGOS.md` §8, ese valor está siempre. Se analiza `game` sin la clave `type` (`(... -> 'game') - 'type'`); el resto del objeto se recorre igual y las aserciones no cambian. Que `type` está y vale `impostor` lo prueba `11_game_type`. La prueba e2e de secreto ya buscaba `"role": "impostor"` y no se toca. Única prueba existente modificada en la fase 8.
Descartado: sacar el tipo de `game` o deducirlo de `rooms.game`, que contradice el contrato de `docs/JUEGOS.md`.

## 2026-10-09 · 8.6 · El cliente elige el juego por `game.type`

`game` se valida con `z.discriminatedUnion('type', …)`, de momento con la variante de El impostor (`ImpostorGameState`), que es la que usa todo `src/games/impostor`. `Room` pasa la partida a `ImpostorGame` solo si `game.type` es `impostor`. `viewFor` de El impostor sigue recibiendo la foto entera para no tocar sus pruebas.
Descartado: un registro de juegos o un componente genérico de partida, que sería generalizar antes de tener el segundo juego.

## 2026-10-09 · 8.5 · Qué va a la carpeta de El impostor

`src/games/impostor/` recibe su `viewFor`, los datos derivados de la foto (`game-view.ts`), el selector de impostores, sus pantallas (05–14 y `HostControls`) y `ImpostorGame`, que guarda el voto elegido y llama a sus acciones. `Room` se queda con lo de la sala (sincronización, salir, echar, selector y sala de espera) y le pasa la partida. Las llamadas RPC siguen todas en `src/lib/actions.ts`, que es la capa de acceso a la base de datos y la que sustituyen las pruebas de `Room`; el marco `GameScreen` y `KickableChip` se quedan en `src/screens` porque los usa también la plataforma. La pantalla de entrar tarde va con El impostor hasta que otro juego la use.
Descartado: repartir las RPC por juegos, que obligaba a reescribir las pruebas existentes sin ganar nada.

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

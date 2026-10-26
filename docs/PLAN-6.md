# La Previa: El lobo con configuración libre, bruja y asesino en serie

Plan de la issue #13. La sección «Especificación aprobada» es la que se aprobó antes de implementar y manda sobre `docs/PLAN-5.md` en lo que toca. Donde algo no esté cubierto ni aquí ni en la issue, se elige lo más simple coherente con esto y se anota en `docs/DECISIONES.md`. Ante cualquier duda sobre qué puede ver quién, lo más restrictivo, cubierto con una prueba.

Se mantiene el identificador interno `luna_llena`. No se cambian otros juegos. Migraciones siempre nuevas.

## Especificación aprobada

### 1. Composición libre

**Roles configurables.** Lobos: cantidad de 0 en adelante. Especiales, cada uno activable o no y **como mucho uno de cada**: vidente, protector, cazador, bufón, Cupido, bruja, asesino. Los huecos que sobran son aldeanos; puede haber cero aldeanos.

- La vidente pasa a ser opcional. El reparto no la añade por su cuenta.
- La composición recomendada actual sigue existiendo como valor por defecto y como botón «Usar la recomendada». No incluye bruja ni asesino.
- El mínimo de jugadores de la sala no cambia.

**Validación de integridad (bloquea, en cliente y en servidor, `invalid_config`):**

- Rol desconocido o repetido.
- Lobos negativos.
- `lobos + especiales activados > jugadores`.
- Ninguna amenaza: cero lobos y sin asesino.
- Todo lobos: `lobos ≥ jugadores` (tiene que haber al menos un no lobo).
- El mínimo de jugadores que ya exija el código.

Nada más bloquea. Se retiran del servidor y del cliente `2 × lobos < jugadores`, el máximo de lobos por debajo de la mitad y la obligación de dejar hueco para un aldeano. Las pruebas que comprobaban esas restricciones se adaptan, no se borran: ahora comprueban que esas composiciones se aceptan. Justifica cada cambio de prueba en `docs/DECISIONES.md`.

**Avisos de equilibrio (no bloquean, no cambian la selección).** Función pura en el cliente, con tests, que devuelve una lista de avisos:

| Clave                      | Cuándo                                                                          | Texto orientativo                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `wolves_majority`          | `2 × lobos ≥ jugadores`                                                         | «Hay {lobos} lobos para {jugadores} jugadores. Ya son mayoría: la partida terminará en cuanto amanezca. Podéis jugar igualmente.» |
| `wolves_above_recommended` | Más lobos que la recomendada para ese número de jugadores, sin llegar a mayoría | «Hay más lobos de lo habitual. Lo va a tener difícil el pueblo.»                                                                  |
| `no_seer`                  | Hay lobos y no hay vidente                                                      | «Sin vidente, el pueblo juega a ciegas.»                                                                                          |

Los avisos se muestran en la sala de espera bajo la línea de composición, con el estilo de aviso existente (`orange`), y el botón de empezar sigue activo. La línea de composición, el selector y los avisos se recalculan cuando cambia el número de jugadores.

**Caso 4 lobos de 5 jugadores:** se puede configurar y empezar. La victoria se sigue comprobando solo al continuar desde `dawn` y `execution`, así que se juega la primera noche y la partida acaba en el primer amanecer con victoria de los lobos. Es el comportamiento esperado; no se tocan las reglas de victoria para alargarla.

### 2. Bruja (`witch`)

Bando del pueblo. Dos pociones, cada una de **un solo uso en toda la partida**, independientes.

**Qué ve de noche.** Además de su acción, la bruja ve **en directo** la víctima provisional de los lobos: el jugador más marcado en ese momento, o «Los lobos aún no se han decidido» si no hay marcas o hay empate. Solo la bruja recibe este dato, y solo mientras le quede la poción de vida.

**Su acción** es única por noche y no se cambia una vez enviada (como el resto de roles no lobos):

- **Poción de vida:** un sí o no. No elige a quién: si dice sí, salva a quien acaben matando los lobos esa noche, sea quien sea. Puede salvarse a sí misma.
- **Poción de muerte:** un jugador vivo distinto de ella, o ninguno.
- Puede usar las dos la misma noche, una, o ninguna. «No usar nada» es una acción válida y cuenta como haber actuado. Si se queda sin pociones, su noche es como la de un aldeano (marca de sospecha sin efecto).

**Consumo:**

- La de vida solo se gasta si ha salvado a alguien de verdad: los lobos tenían víctima y el protector no la cubría. Si no había a quién salvar, la conserva.
- La de muerte se gasta siempre que se usa.
- El consumo se guarda en el servidor bajo el bloqueo de la sala. Reenviar, recargar o tocar dos veces no gasta otra vez ni permite un segundo uso (`already_acted` en la misma noche; elegir una poción gastada es un error nuevo `potion_used`).
- Si el narrador fuerza el cierre y la bruja no había enviado, no usa nada.

**Al amanecer**, en privado, la bruja ve qué ha pasado con sus pociones esa noche («Tu poción de vida ha salvado a Marta», «Tu poción de muerte ha caído sobre Dani») y cuántas le quedan.

### 3. Asesino en serie (`killer`)

Juega solo. Gana si es **la única persona viva**.

- Cada noche elige a un jugador vivo distinto de él. Es obligatorio para contar como actuado; si el narrador fuerza el cierre y no ha elegido, no mata a nadie.
- La vidente lo ve como «no es lobo».
- Sin inmunidades: los lobos pueden matarlo, la bruja envenenarlo, el pueblo ahorcarlo.
- Cuenta como «no lobo» para la paridad de los lobos.
- Carta: píldora «Juegas solo» (`lilac`), como el bufón.

### 4. Orden de resolución de la noche

Todas las acciones son simultáneas y se resuelven juntas al cerrar la noche. Quien muere esa noche aplica su acción igualmente.

1. Enamorados (primera noche).
2. Víctima de los lobos (W): la más marcada; empate al azar; sin marcas, ninguna.
3. Víctima del asesino (K).
4. Protección: si el protegido es W, W se anula; si es K, K se anula. **El protector no frena el veneno.**
5. Poción de vida: si la bruja la usa y W sigue en pie, W se anula y la poción se gasta. **No salva del asesino ni del veneno.**
6. Poción de muerte: su objetivo muere.
7. Muertes de la noche: W, K y veneno que sigan en pie, sin duplicados (si dos ataques coinciden, muere una vez).
8. Muerte por amor de los enamorados de los muertos.
9. Si entre los muertos está el cazador, fase `hunter` como hasta ahora.

### 5. Victoria

Se sigue comprobando al continuar desde `dawn` y `execution`, después de resolver por completo la cadena (cazador incluido). Orden:

1. Bufón ahorcado → gana el bufón.
2. El asesino está vivo y es el único vivo → gana el asesino (`killer`).
3. No quedan lobos vivos y el asesino no está vivo → gana el pueblo. Incluye el caso de que no quede nadie vivo.
4. El asesino no está vivo y `lobos vivos ≥ no lobos vivos` → ganan los lobos.
5. En cualquier otro caso, la partida sigue. En particular: **si el asesino está vivo, los lobos no ganan por paridad ni el pueblo gana por quedarse sin lobos.**

Añade `killer` a los posibles ganadores y la clave de narración `win_killer`: «Solo queda uno en pie, y no es precisamente un vecino ejemplar. Gana el asesino.» El titular del resultado sigue siendo personal («Has ganado» / «Has perdido»).

### 6. Privacidad

Lo que la foto de un jugador **vivo** no puede contener nunca antes de `finished`, además de lo que ya prohibía El lobo:

- Que la bruja exista como persona concreta, sus pociones restantes, su acción o sus resultados (salvo para la propia bruja).
- La víctima provisional de los lobos (salvo para los lobos entre sí, como ya pasa, y para la bruja).
- El objetivo del asesino (salvo para el propio asesino).
- **La causa real de una muerte nocturna.** En la parte pública del anuncio, las causas `wolves`, `killer` y `poison` salen todas como `night`. Se mantienen públicas `hanged`, `hunter`, `heartbreak` y `left`. La causa real solo vive en la tabla interna y en la vista de espectador. Revisa también la narración: ningún texto dice cómo ha muerto alguien de noche.
- Ningún dato de lo anterior en `rooms`, en respuestas de RPC de otros jugadores ni en nada que viaje por Realtime.

Los **muertos** (espectadores) sí ven todo: pociones, acciones de bruja y asesino en directo, y causas reales. El **narrador** vivo no ve nada extra por narrar. Al terminar, `result` muestra todos los roles como hasta ahora; no se añade historial de pociones ni de acciones.

### 7. Modelo de datos y acciones

Sigue la convención real del código (si difiere de estos nombres, manda el código y lo anotas):

- `game_roles.role` admite `witch` y `killer`. La configuración admite ambos como opcionales y la vidente como opcional.
- Estado de pociones en el estado de la partida de El lobo (por ejemplo `witch_life_used` y `witch_poison_used` en `luna_state`).
- Acción de la bruja en su propia RPC, por ejemplo `luna_llena_witch_action(room_id, use_life boolean, poison_target_id uuid)`, con las mismas reglas que el resto: `security definer`, `search_path = ''`, `auth.uid()`, bloqueo de la sala, versión, foto de vuelta, `execute` solo para `authenticated`.
- El asesino usa `luna_llena_night_action` como el resto de roles.
- El cierre automático de la noche cuenta a la bruja y al asesino como cualquier vivo.
- Abandono o expulsión: la bruja o el asesino que se van mueren como cualquiera; no actúan.
- Códigos de error nuevos: `potion_used` (y los que necesites, añadidos también al cliente con su texto).

### 8. Ilustraciones de las cartas nuevas

Mismo lienzo y trazo que las siete existentes. Como en ellas, en el código los colores y el trazo salen de los tokens, no de estos valores sueltos. No se añade ningún token.

**Bruja** · bloque `field` · bando del pueblo (`lime`).

```html
<svg
  viewBox="0 0 300 220"
  role="img"
  aria-label="Caldero entre dos pociones"
  style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round"
>
  <line x1="100" y1="186" x2="92" y2="206"></line>
  <line x1="200" y1="186" x2="208" y2="206"></line>
  <path d="M72 112 L228 112 Q236 190 150 194 Q64 190 72 112 Z" fill="#111111"></path>
  <ellipse cx="150" cy="112" rx="82" ry="15" fill="#B8F28A"></ellipse>
  <circle cx="128" cy="82" r="10" fill="#B8F28A"></circle>
  <circle cx="168" cy="66" r="7" fill="#B8F28A"></circle>
  <circle cx="146" cy="42" r="5" fill="#B8F28A"></circle>
  <rect x="28" y="116" width="16" height="22" fill="#FFFFFF"></rect>
  <rect x="26" y="106" width="20" height="12" fill="#FFD23F"></rect>
  <circle cx="36" cy="164" r="24" fill="#B8F28A"></circle>
  <rect x="256" y="116" width="16" height="22" fill="#FFFFFF"></rect>
  <rect x="254" y="106" width="20" height="12" fill="#FFD23F"></rect>
  <circle cx="264" cy="164" r="24" fill="#FF6B5E"></circle>
</svg>
```

**Asesino** · bloque `ground` · «Juegas solo» (`lilac`).

```html
<svg
  viewBox="0 0 300 220"
  role="img"
  aria-label="Máscara blanca"
  style="display: block; width: 100%; stroke: #111111; stroke-width: 5px; stroke-linejoin: round; stroke-linecap: round"
>
  <ellipse cx="150" cy="112" rx="70" ry="90" fill="#FFFFFF"></ellipse>
  <polyline points="124,50 150,64 176,50" fill="none"></polyline>
  <polygon points="110,96 140,104 136,122 108,114" fill="#111111"></polygon>
  <polygon points="190,96 160,104 164,122 192,114" fill="#111111"></polygon>
  <circle cx="136" cy="160" r="5" fill="#111111" style="stroke: none"></circle>
  <circle cx="150" cy="168" r="5" fill="#111111" style="stroke: none"></circle>
  <circle cx="164" cy="160" r="5" fill="#111111" style="stroke: none"></circle>
  <path d="M200 140 L214 152" fill="none" style="stroke: #FF6B5E"></path>
</svg>
```

Textos de carta:

- **Bruja:** «Tienes dos pociones para toda la partida. La de vida salva a quien vayan a devorar los lobos esta noche; la de muerte se lleva a quien tú elijas. Cada una sirve una sola vez.»
- **Asesino:** «No estás con nadie. Cada noche eliges a quién matar. Ganas si al final eres el único que queda en pie.»

Revisa también «Cómo se juega» de El lobo y la vista de espectador para que incluyan los roles nuevos.

## Plan de trabajo

Sigue la numeración de `docs/TAREAS.md`: fases 33 a 36. Un commit por tarea, con la tarea marcada en el mismo commit. Antes de empezar y al cerrar cada fase pasan `npm run check`, `npm run test:db` (desde `supabase db reset`) y `npm run test:e2e`.

### Fase 33 · Composición libre

- **33.1** Migración: `game_roles.role` admite `witch` y `killer`; `private.luna_optional_roles` con la vidente, la bruja y el asesino; la recomendada lleva la vidente de forma explícita; `private.luna_config` con la validación de integridad de la sección 1; `luna_llena_start` reparte exactamente lo pedido, sin vidente añadida. Pruebas pgTAP de composición y reparto, adaptando las que comprobaban las restricciones retiradas.
- **33.2** Cliente: `composition.ts` (validación de integridad, aldeanos, avisos de equilibrio), selector de lobos sin tope de equilibrio, interruptores de todos los especiales, línea de composición, avisos y botón «Usar la recomendada». Tests unitarios.

**Aceptación:** la app funciona igual con los siete roles de siempre y acepta composiciones antes prohibidas.

### Fase 34 · Bruja y asesino en el servidor

- **34.1** Migración: estado de pociones, acción de la bruja, acción del asesino, resolución de la noche en el orden de la sección 4, victoria de la sección 5, proyección privada de la sección 6 y abandono.
- **34.2** Pruebas pgTAP de bruja, asesino, victoria, secreto y partidas completas simuladas.

**Aceptación:** `npm run test:db` pasa desde cero.

### Fase 35 · Bruja y asesino en el cliente

- **35.1** Esquemas `zod`, acción de la bruja, errores nuevos, `viewFor` y funciones de vista, con tests unitarios.
- **35.2** Cartas e ilustraciones de bruja y asesino, también en `/dev/componentes`; textos de carta.
- **35.3** Noche de la bruja y del asesino, aviso privado de la bruja al amanecer, causas públicas de las muertes, vista de espectador, resultado y narración `win_killer`.
- **35.4** «Cómo se juega» de El lobo con los roles nuevos.

**Aceptación:** `npm run check` pasa.

### Fase 36 · Validación y cierre

- **36.1** E2E: configurar sin vidente y sin aldeanos; 4 lobos de 5 con aviso y final al primer amanecer; partida con bruja y asesino hasta el final; recarga de la bruja tras gastar una poción; secreto en red para un aldeano vivo.
- **36.2** Repaso a 360, 390 y 430 px y de accesibilidad de las pantallas nuevas.
- **36.3** `docs/DECISIONES.md`, `docs/INFORME.md` y `README.md`.

**Aceptación:** `npm run check`, `npm run test:db`, `npm run test:e2e` y `npm run build` pasan sin avisos.

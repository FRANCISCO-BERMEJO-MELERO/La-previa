# La Previa: movimiento en la plataforma, El impostor, El lobo y A dados

Ampliación de alcance. `docs/CONTEXTO.md` §8 dice «Sin más animaciones en esta versión»; este plan lo levanta para lo que se describe aquí y nada más. La sección «Especificación aprobada» es la que se aprobó antes de implementar. Donde algo no esté cubierto, se elige lo más simple coherente con esto y se anota en `docs/DECISIONES.md`. Ante cualquier duda sobre si una animación puede dar información a quien no debe, no se pone.

No se toca la base de datos: es solo de cliente. Ninguna migración nueva.

## Especificación aprobada

### 1. Principios

1. **Pocas animaciones, siempre las mismas.** Seis movimientos con nombre (sección 2). Ninguna pantalla inventa uno propio.
2. **Se animan momentos, no la app entera.** Solo lo que figura en el catálogo (secciones 4 a 7). Lo demás sigue quieto.
3. **El estado manda.** La animación nunca retrasa una acción ni el estado. El estado nuevo se pinta en el acto y la animación es una capa encima. Ningún botón se desactiva ni se oculta para esperar a que termine una animación.
4. **Solo `transform` y `opacity`.** Los cambios de color (pareja de dados, fila ganadora) son instantáneos. Nada de animar `width`, `height`, `top`, `margin`, `box-shadow` ni filtros.
5. **Movimiento reducido.** Con `prefers-reduced-motion: reduce` no se anima nada: todo aparece en su estado final. El botón que se hunde también se queda quieto (cambia la sombra sin desplazarse).
6. **Privacidad.** Ninguna animación puede depender de información que no ven todos los presentes. Las pantallas que miran a la vez varias personas con información distinta (reparto de roles, noche de El lobo) se mueven exactamente igual para todos. Ver sección 3.

### 2. Vocabulario y tokens

Tokens nuevos de movimiento, en la configuración de Tailwind junto a los de Verbena. Ningún componente lleva duraciones ni curvas sueltas.

| Token             | Valor                                                            |
| ----------------- | ---------------------------------------------------------------- |
| `duration-rapido` | 120 ms                                                           |
| `duration-base`   | 240 ms                                                           |
| `duration-lento`  | 420 ms                                                           |
| `duration-contar` | 700 ms                                                           |
| `ease-golpe`      | `cubic-bezier(.2, .8, .3, 1.3)`: arranca rápido y rebota un poco |
| `ease-seco`       | `cubic-bezier(.3, 0, .2, 1)`                                     |
| `ease-salida`     | `cubic-bezier(.5, 0, 1, .5)`                                     |

Los seis movimientos:

| Nombre             | Qué hace                                                                                                              | Duración y curva                                        | Uso general                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| **Hundir**         | El botón se desplaza y pierde la sombra. Ya existe                                                                    | `rapido`, `seco`                                        | Todos los botones                                              |
| **Caer**           | Entra desde arriba con un pequeño rebote                                                                              | `base`, `golpe`                                         | Algo nuevo aparece: alguien entra, un voto, un aviso, una fila |
| **Sello**          | Escala grande que se planta girado                                                                                    | `lento`, `golpe`                                        | Revelaciones y veredictos                                      |
| **Sacudida**       | Tiembla en horizontal                                                                                                 | 300 ms, `seco`                                          | Errores                                                        |
| **Contar**         | Un número sube o baja hasta su valor (cúbica de salida)                                                               | `contar` (400 ms en cambios pequeños)                   | Marcadores y recuentos                                         |
| **Cambio de fase** | La tarjeta protagonista vieja sale hacia la izquierda; la nueva entra desde la derecha y se queda en su giro de −1,5° | Salida `base` con `salida`; entrada `lento` con `golpe` | Cada cambio de fase                                            |

Keyframes de referencia (los valores son los aprobados; adáptalos a la sintaxis del proyecto):

```css
@keyframes caer {
  0% {
    transform: translateY(-28px) scale(0.85);
    opacity: 0;
  }
  60% {
    transform: translateY(4px) scale(1.04);
    opacity: 1;
  }
  100% {
    transform: none;
  }
}
@keyframes sello {
  0% {
    transform: scale(2.4) rotate(-14deg);
    opacity: 0;
  }
  55% {
    transform: scale(0.92) rotate(-4deg);
    opacity: 1;
  }
  75% {
    transform: scale(1.04) rotate(-4deg);
  }
  100% {
    transform: rotate(-4deg);
  }
}
@keyframes sacudida {
  0%,
  100% {
    transform: none;
  }
  20% {
    transform: translateX(-10px);
  }
  40% {
    transform: translateX(9px);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(4px);
  }
}
@keyframes entrar {
  0% {
    transform: translateX(115%) rotate(8deg);
  }
  65% {
    transform: translateX(-4%) rotate(-3deg);
  }
  100% {
    transform: rotate(-1.5deg);
  }
}
@keyframes salir {
  from {
    transform: rotate(-1.5deg);
  }
  to {
    transform: translateX(-125%) rotate(-10deg);
  }
}
@keyframes salto {
  0%,
  100% {
    transform: none;
  }
  40% {
    transform: scale(1.18);
  }
}
```

El giro final de cada keyframe coincide con el giro en reposo del elemento (−1,5° la tarjeta protagonista, entre 3° y 4° píldoras y sellos), para que al terminar no haya salto.

`salto` es un detalle de **Contar** y **Caer**: el número o la fila que cambia da un pequeño salto al terminar. No es un movimiento independiente.

### 3. Cómo se dispara una animación

**De la foto, no de la acción.** Las animaciones salen de comparar la foto anterior con la nueva, en una función pura por juego, por ejemplo `motionEvents(prev, next, viewer) → MotionEvent[]`, con tests. Los componentes leen esos eventos para saber qué animar. No se anima en respuesta a la llamada RPC propia: así, quien pulsa y quien mira ven lo mismo.

**Cuándo no se anima** (se pinta el estado final, quieto):

- Primera foto tras cargar, recargar, reconectar o volver a la pestaña.
- Cuando la foto nueva no es consecutiva con la anterior: se ha saltado una fase o han cambiado a la vez cosas que en la partida pasan una detrás de otra.
- Con movimiento reducido.

**Secuencias.** Varios eventos del mismo tipo (votos, muertes, impostores en el resultado) se escalonan de 350 a 520 ms entre sí. Ninguna secuencia dura más de 1,6 s en total; si no cabe, se acorta el escalonado. Todo lo de la secuencia está ya en el DOM desde el primer momento y es legible por lectores de pantalla; la animación solo cambia cuándo se ve.

**Cambio de fase.** Al cambiar `phase`, la pantalla nueva se monta en el acto y entra con **Cambio de fase**. La tarjeta vieja se pinta un momento encima como copia fantasma (`aria-hidden`, `pointer-events: none`, `inert`) con **salir**, y se desmonta al terminar. Ningún control de la pantalla vieja es usable durante la salida.

**Privacidad, la regla dura:**

- La función de eventos recibe solo lo que la foto ya le da al jugador, pero además **solo puede producir eventos que también producirían las fotos de los demás presentes**. Si un dato solo lo tiene este jugador (su rol, su palabra, el resultado de la vidente, la víctima provisional que ve la bruja, los avisos privados del amanecer, sus pociones), ese dato aparece **sin animación**.
- Durante `roles` y `night` de El lobo y durante el reparto de El impostor, las únicas animaciones permitidas son las del catálogo para esas fases, iguales para todos los roles: misma duración, misma intensidad y mismo instante. Pulsar un objetivo de noche es **Hundir** y nada más, sea quien sea quien pulse.
- Esto se comprueba con tests (sección 10).

### 4. Plataforma

| Momento                                                           | Movimiento                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| Todos los botones                                                 | Hundir (ya existe; pásalo a los tokens)                  |
| Alguien entra en la sala de espera                                | Su fila **cae** al final de la lista                     |
| Alguien se va o es expulsado                                      | Su fila desaparece sin animación                         |
| Aviso nuevo (sin conexión, error de acción, avisos de equilibrio) | **Cae**                                                  |
| Error en un campo (código de sala que no existe, nombre repetido) | El campo hace **sacudida** y el mensaje de error **cae** |
| Cambio de fase en cualquier juego                                 | **Cambio de fase** en la tarjeta protagonista            |
| Abrir el diálogo del QR                                           | **Caer** del diálogo                                     |

### 5. El impostor

| Momento               | Movimiento                                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reparto               | **Mantener para mirar** (sección 8). Jugador e impostor, idénticos                                                                                                                  |
| Cierre de la votación | Cada voto **cae** como avatar pequeño sobre la fila del votado, de uno en uno; el recuento de cada fila **cuenta** y salta. Al final, la fila más votada se pinta en `lime` y salta |
| Revelación            | La tarjeta entra con **Cambio de fase** y el sello «Era el impostor» / «No era el impostor» se planta con **Sello**                                                                 |
| Empate                | El texto de empate **cae**; sin sello                                                                                                                                               |
| Resultado             | Tarjeta con **Cambio de fase**, sello del titular con **Sello** y, debajo, los impostores **caen** de uno en uno, cada uno con su sello pequeño                                     |

### 6. El lobo

| Momento                                          | Movimiento                                                                                                                                                                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paso a `night`                                   | **Telón**: un panel `ink` baja desde arriba cubriendo la pantalla (`lento`, `golpe`) y la luna `ground` **cae** 200 ms después. Al terminar, el telón deja paso a la pantalla de noche. Igual en todos los móviles, vivos y muertos |
| Paso a `dawn`                                    | El telón sube y la pantalla de amanecer entra                                                                                                                                                                                       |
| Carta de rol                                     | Al tocarla, **gira** sobre el eje vertical (`lento`, `golpe`) del dorso a la carta. Todos los roles giran igual                                                                                                                     |
| Amanecer                                         | Título «Amanece» **cae**; cada muerto de la noche **cae** de uno en uno con su sello «Ha muerto». Si no hay muertos, **cae** una única fila «Esta noche no ha muerto nadie» con sello `lime`. Mismo anuncio para cualquier causa    |
| Avisos privados del amanecer (enamorados, bruja) | Sin animación                                                                                                                                                                                                                       |
| Votación de alcalde y de juicio, al cerrar       | Como la votación de El impostor                                                                                                                                                                                                     |
| Veredicto                                        | Recuento que **cuenta** y sello «Ahorcado» / «Se salva» con **Sello**                                                                                                                                                               |
| Disparo del cazador                              | La víctima **cae** con su sello                                                                                                                                                                                                     |
| Resultado                                        | Como el de El impostor                                                                                                                                                                                                              |

El telón y el giro de carta son dos movimientos derivados de **Cambio de fase** con las mismas duraciones y curvas; no cuentan como movimientos nuevos.

### 7. A dados

| Momento              | Movimiento                                                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dado pendiente nuevo | **Tirada**: el dado de la tarjeta rueda 500 ms cambiando de cara (cada 75 ms) y cae con un golpe (`thump`, 340 ms, `golpe`). El valor real ya está en la foto; el teatro no bloquea las columnas                                                   |
| Colocar un dado      | El dado **sube** a su hueco desde la tarjeta (`lento`, `golpe`); los del rival **bajan** desde arriba                                                                                                                                              |
| Pareja o trío        | Los dados iguales de la columna se pintan en el acto y aparece encima el sello «×2» o «×3» con **Sello**, que se quita a los 1,1 s                                                                                                                 |
| Ataque               | Los dados eliminados del rival tiemblan, se ponen `tomato` y revientan (**pop**, 420 ms) antes de desaparecer; sobre su marcador de columna flota «−16» (sube 34 px y se desvanece en 900 ms). Columnas y totales **cuentan** hasta el valor nuevo |
| Cambio de turno      | La tarjeta de abajo entra con **Cambio de fase**                                                                                                                                                                                                   |
| Final                | El resultado entra con **Cambio de fase** y sus marcadores **cuentan**                                                                                                                                                                             |

Keyframes propios de A dados:

```css
@keyframes tumble {
  0% {
    transform: rotate(0) translateY(0);
  }
  25% {
    transform: rotate(-18deg) translateY(-10px);
  }
  50% {
    transform: rotate(0);
  }
  75% {
    transform: rotate(18deg) translateY(-10px);
  }
  100% {
    transform: rotate(0);
  }
}
@keyframes thump {
  0% {
    transform: scale(1.35) rotate(-12deg);
  }
  60% {
    transform: scale(0.92) rotate(3deg);
  }
  100% {
    transform: none;
  }
}
@keyframes subir {
  0% {
    transform: translateY(60px) scale(0.6) rotate(-20deg);
    opacity: 0;
  }
  60% {
    transform: translateY(-6px) scale(1.08) rotate(4deg);
    opacity: 1;
  }
  100% {
    transform: none;
  }
}
@keyframes bajar {
  0% {
    transform: translateY(-60px) scale(0.6) rotate(20deg);
    opacity: 0;
  }
  60% {
    transform: translateY(6px) scale(1.08) rotate(-4deg);
    opacity: 1;
  }
  100% {
    transform: none;
  }
}
@keyframes pop {
  0% {
    transform: none;
  }
  15% {
    transform: translateX(-5px) rotate(-8deg);
  }
  30% {
    transform: translateX(5px) rotate(8deg);
  }
  45% {
    transform: scale(1.15);
    opacity: 1;
  }
  100% {
    transform: scale(0) rotate(40deg);
    opacity: 0;
  }
}
@keyframes flotar {
  0% {
    transform: translate(-50%, 0);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -34px);
    opacity: 0;
  }
}
```

Para el **pop**, el dado eliminado se pinta una copia fantasma encima de su hueco, porque en la foto nueva ya no existe.

### 8. Cambio de interacción: mantener para mirar (El impostor)

No es solo una animación, cambia cómo se juega, y va en su propia fase.

- En el reparto, la palabra (o «Eres el impostor») queda bajo una tarjeta tapa `sky` con «Mantén pulsado» y, debajo, «para ver tu palabra».
- Mientras se mantiene pulsada, la tapa se levanta (`translateY(-64%) rotate(-6deg)`, `base`, `golpe`). Al soltar, vuelve a caer. Con movimiento reducido, la tapa desaparece y aparece sin moverse.
- Teclado: mantener Espacio o Intro. Un clic sin puntero (lector de pantalla, `event.detail === 0`) alterna entre mostrar y ocultar, para que nadie quede fuera.
- La palabra está en el DOM con el resto de la foto, como ahora; la tapa no la protege de la red, solo de la mirada de al lado.
- Mismo tamaño, mismo texto y mismo movimiento para jugador e impostor.
- Cambia el texto de «Cómo se juega» del impostor si menciona cómo se ve la palabra.

### 9. Fuera de alcance

Sonidos, vibración, partículas, confeti, animaciones de fondo continuas (nada se mueve en bucle salvo la tirada de A dados mientras rueda), librerías nuevas, y cualquier cambio en reglas, textos o base de datos fuera de lo dicho. No se añade ninguna librería de animación salvo que un caso concreto no se pueda hacer con CSS y React; si pasa, se justifica en `docs/DECISIONES.md` antes de añadirla.

### 10. Pruebas mínimas

**Unitarias**

- `motionEvents` de cada juego: produce los eventos esperados en cada transición del catálogo; no produce ninguno en la primera foto, tras una foto no consecutiva ni con movimiento reducido.
- **Privacidad:** para cada fase de `roles` y `night` de El lobo y el reparto de El impostor, los eventos generados para cada rol (lobo, aldeano, vidente, protector, cazador, bufón, Cupido, bruja, asesino; jugador e impostor) son idénticos. Los avisos privados del amanecer no generan eventos. El amanecer genera los mismos eventos sea cual sea la causa de cada muerte.
- Secuencias: ninguna supera 1,6 s.
- Mantener para mirar: pulsar muestra, soltar oculta, clic sin puntero alterna, teclado.

**E2E**

- Todas las pruebas existentes pasan con `reducedMotion: 'reduce'`.
- Una prueba por juego **con movimiento activado**: una partida corta en la que cada acción se hace en cuanto el botón está disponible, sin esperar a las animaciones, y el estado final es el correcto en todos los clientes.
- Recarga a mitad de una secuencia (votos, amanecer, ataque): la pantalla aparece en su estado final, sin animar.
- El impostor: en el reparto, la palabra no es visible sin mantener pulsado.

**Manual, apuntado en `docs/INFORME.md`:** que Fran pruebe en un Android de gama baja la votación de 8 personas, el amanecer con dos muertos y el ataque de A dados, y compruebe que van fluidos.

Se cierra cuando `npm run check`, `npm run test:db`, `npm run test:e2e` y `npm run build` pasen sin avisos. Resumen final en `docs/INFORME.md` con lo que Fran debe probar primero: el telón de la noche con varios móviles a la vez, mantener para mirar en el reparto y si el rebote resulta excesivo en algún sitio.

## Fases de trabajo

Rama `feat/movimiento`, una pull request por fase hacia `develop`. Cada fase deja la app funcionando y con todas las pruebas en verde.

- **Fase 41 · Base.** Tokens, keyframes, utilidades de Tailwind, Hundir pasado a tokens, soporte de movimiento reducido, `reducedMotion: 'reduce'` en la configuración de Playwright para las pruebas existentes, y la infraestructura de eventos (sección 3) con su función genérica y el fantasma de cambio de fase.
- **Fase 42 · Plataforma y El impostor.** Sección 4 y sección 5, sin el reparto nuevo.
- **Fase 43 · Mantener para mirar.** Sección 8.
- **Fase 44 · El lobo.** Sección 6.
- **Fase 45 · A dados.** Sección 7.
- **Fase 46 · Validación y cierre.** Pruebas de la sección 10, repaso en móvil, `docs/DECISIONES.md`, `docs/TAREAS.md`, `docs/INFORME.md`.

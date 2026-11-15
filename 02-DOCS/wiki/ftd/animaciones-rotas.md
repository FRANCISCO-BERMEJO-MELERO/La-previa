---
author: FRANCISCO-BERMEJO-MELERO
branch: fix/animaciones
status: done
---

# Animaciones que fallan en el móvil

## Intención

Fran probó el movimiento de `docs/PLAN-8.md` y algunas animaciones no funcionan bien; en El impostor, nada. Se analizan todas, se reproducen en un navegador y se arreglan sin cambiar el catálogo aprobado.

## Diagnóstico

Reproducido con Chrome (390 px, táctil, movimiento activado), capturas en ráfaga e instrumentación temporal de las e2e de la tanda «movimiento» (`animationcancel`, animaciones dentro del fantasma, `pointercancel`).

1. **La tapa de El impostor se cierra sola.** Con el dedo puesto, basta moverlo unos píxeles para que el navegador lo tome como desplazamiento o «tirar para recargar», lance `pointercancel` y la tapa vuelva a caer. En un móvil el dedo siempre se mueve: no se puede ver la palabra. Las e2e no lo veían porque usan ratón o un clic sin puntero. Mismo fallo en «Ver mi carta» de El lobo.
2. **La tarjeta que sale repite sus animaciones.** El fantasma de «Cambio de fase» es un clon con todas las clases `animate-*` de dentro: al insertarlo, el navegador las arranca de nuevo. En El impostor, el sello «Era el impostor» desaparece de la tarjeta que sale (espera su retraso invisible); en A dados, el dado de la tarjeta de turno vuelve a rodar mientras sale.
3. **Animaciones cortadas a medias** («bajar» en A dados, una entrada en El impostor): solo cuando llega otra foto antes de 420 ms, porque las e2e juegan sin pausa. Es el principio 3 del plan (el estado manda). No se toca.

Sin fallos en El lobo (telón, amanecer, giro), Cuela la mentira ni la sala de espera.

## Alcance

- La tapa del reparto y «Ver mi carta» no ceden el gesto al navegador (`touch-action: none`).
- El fantasma sale quieto por dentro: se le quitan las clases de animación y de retraso antes de añadir `salir`.
- Fuera: el catálogo de movimientos, sus duraciones y la altura a la que sube la tapa.

## Lista

- [x] Tapa y carta aguantan el dedo en movimiento — prueba: e2e 43.3 con toques reales y test unitario
- [x] Fantasma sin animaciones internas — prueba: test de `PhaseStage`
- [x] Verificación — prueba: `npm run check` y `npm run test:e2e`

## Evidencia

- 2026-11-15: la e2e 43.3 falla sin `touch-none` («Received: hidden») y pasa con él.
- `npm run check`: 1033 tests, sin avisos.
- `npm run test:e2e`: 49 de 50 en la tanda completa. La 31.7 «un aldeano vivo no recibe por la red el rol de nadie vivo» agotó el tiempo por carga; sola pasa 4 veces seguidas (7–9 s).

## Siguiente

Pull request de `fix/animaciones` hacia `develop` cuando Fran lo pida, y prueba en un móvil real: mantener pulsado en el reparto y el cambio de fase de la revelación.

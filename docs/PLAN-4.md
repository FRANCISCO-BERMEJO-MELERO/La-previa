# La Previa: plan de las mejoras

Continúa `docs/PLAN-3.md`, cuyas fases 14–18 están terminadas. Construye lo de `docs/MEJORAS.md` con las mismas normas de trabajo que los planes anteriores y las reglas de `CLAUDE.md`: un commit por tarea, las tres baterías pasando al cerrar cada fase y nada de lo que ya funciona puede romperse.

## Fase 19 · Preparación

- **19.1** Añadir las fases 19–26 a `docs/TAREAS.md`.
- **19.2** Anotar en `docs/DECISIONES.md` lo que entra en alcance (§0) y justificar `jsqr`.

## Fase 20 · Salir y terminar partida

- **20.1** Botón "Salir" en la cabecera de la sala y de las partidas; la píldora deja de ser pulsable.
- **20.2** "Siguiente ronda" y la explicación en la revelación de El impostor.
- **20.3** Resultado de todos los juegos: "Fin de la partida", dos botones iguales para el anfitrión y el texto para los demás.

## Fase 21 · Escanear el QR

- **21.1** Instalar `jsqr` y la función pura que reconoce un enlace o código de sala, con tests.
- **21.2** Diálogo de cámara y botón "Escanear QR" en el inicio, con sus tests y la limpieza de la cámara.

## Fase 22 · Temáticas y palabras

- **22.1** Migración con las 100 palabras nuevas y `docs/PALABRAS.md`.
- **22.2** `impostor_categories` y temáticas en `start_game`, con pgTAP.
- **22.3** Selector de temáticas en la sala de espera.

## Fase 23 · Temporizador

- **23.1** Migración: tiempo y hora límite; `start_game`, `open_voting` y `close_voting` con el tiempo, y pgTAP.
- **23.2** Selector de tiempo, cuenta atrás y cierre al llegar a cero.
- **23.3** Prueba e2e: votación que se cierra sola.

## Fase 24 · Cómo se juega

- **24.1** Componente de tutorial por pasos y botón en la sala de espera.
- **24.2** Pasos e ilustraciones de los seis juegos.

## Fase 25 · Avatares

- **25.1** Migración `room_players.avatar`, `set_avatar` y foto, con pgTAP.
- **25.2** Las 12 ilustraciones y el `Avatar` que las pinta.
- **25.3** Elegir avatar al poner el nombre y cambiarlo en la sala de espera.

## Fase 26 · Repaso y cierre

- **26.1** Repaso a 360, 390 y 430 px y de accesibilidad de todo lo nuevo, ampliando las e2e.
- **26.2** `README.md`, `docs/DESPLIEGUE.md` y `docs/INFORME.md`.

**Aceptación final:** `npm run check`, `npm run test:db`, `npm run test:e2e` y `npm run build` pasan sin avisos.

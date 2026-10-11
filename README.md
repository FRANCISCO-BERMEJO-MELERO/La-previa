# La Previa

Web gratuita de juegos de fiesta para jugar **en persona**, cada uno con su móvil. Sin registro: se crea una sala, los demás entran con un código de cuatro letras, un enlace o un QR, y el móvil reparte la información y lleva la cuenta mientras el juego ocurre hablando.

Trae siete juegos. Seis son de 3 a 16 jugadores y Luna llena, de 6 a 16:

- **El impostor**: todos conocen la palabra menos uno, que solo sabe la categoría y tiene que disimular. Se vota a quién expulsar hasta que se descubre o gana.
- **¿Quién es más probable que…?**: sale una pregunta y todos señalan a alguien a la vez; el más votado se lleva el punto.
- **¿Quién lo dijo?**: todos escriben una respuesta corta, sale una sin autor y el grupo adivina de quién es.
- **Una sola pista**: uno adivina una palabra con una pista de una palabra de cada uno; las pistas repetidas se anulan. Es cooperativo.
- **¿Qué prefieres?**: sale un dilema con dos opciones, cada uno elige en secreto y puntúa quien coincide con la mayoría.
- **Palabras prohibidas**: uno describe una palabra sin decir las cinco prohibidas, otro vigila que no se le escape ninguna y los demás adivinan en voz alta.
- **Luna llena**: un pueblo con lobos escondidos. De noche todos tocan el móvil y los lobos eligen víctima; de día el pueblo elige alcalde, debate con los móviles boca abajo y ahorca a un sospechoso. El anfitrión narra leyendo lo que le marca su pantalla, y además juega. Hay vidente, protector, cazador, bufón y Cupido.

Todos menos El impostor y Luna llena van por rondas (5, 10 o 15) y llevan la cuenta de puntos durante la partida. En El impostor, el anfitrión elige las temáticas de la palabra (300 palabras en 15 temáticas) y si la votación tiene tiempo (30, 60 o 90 segundos) o se cierra a mano. En Luna llena elige cuántos lobos hay y qué roles opcionales entran; por defecto, el reparto recomendado para los que sois.

Además: se entra en una sala escaneando su QR desde el inicio, cada jugador puede elegir un avatar de una galería de ilustraciones, y la sala de espera explica cada juego en unos pocos pasos ilustrados.

- Qué se construye y por qué: [`docs/CONTEXTO.md`](docs/CONTEXTO.md) (plataforma y El impostor), [`docs/JUEGOS.md`](docs/JUEGOS.md) (los tres siguientes), [`docs/JUEGOS-2.md`](docs/JUEGOS-2.md) (¿Qué prefieres? y Palabras prohibidas), [`docs/MEJORAS.md`](docs/MEJORAS.md) (lo que se añadió tras probarla en grupo) y [`docs/PLAN-5.md`](docs/PLAN-5.md) (Luna llena, con las ilustraciones de sus cartas).
- Contenido para revisar: [`docs/PALABRAS.md`](docs/PALABRAS.md), [`docs/PREGUNTAS.md`](docs/PREGUNTAS.md) (preguntas y dilemas) y [`docs/TARJETAS.md`](docs/TARJETAS.md).
- Cómo publicarla: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).
- Decisiones tomadas por el camino: [`docs/DECISIONES.md`](docs/DECISIONES.md).

## Cómo funciona

- **Next.js** (App Router, TypeScript estricto) para la interfaz, desplegada en **Vercel**.
- **Supabase**: Postgres, inicio de sesión anónimo y Realtime.
- **La base de datos es la única autoridad.** Los móviles no leen ni escriben tablas: llaman a funciones RPC que comprueban quién llama, si puede y si la fase lo permite, y reciben una "foto del estado" con solo lo que ese jugador puede ver. Por eso desde las herramientas del navegador no se puede averiguar al impostor, ver votos ajenos, saber de quién es una respuesta antes de tiempo, ver qué ha elegido otro, si te toca adivinar, ver la palabra ni, en Luna llena, el rol de nadie vivo.
- La pantalla se deduce entera de esa foto. Se mantiene al día con Realtime, una consulta cada 10 s y al volver a la pestaña o recuperar la conexión, así que un móvil que se bloquea o cambia de red vuelve a su sitio.

## Arrancar en local

Requisitos: Node 20.9 o posterior (LTS), npm y Docker Desktop en marcha.

```bash
npm install
git config core.hooksPath .githooks   # una vez por clon: activa el gancho de commits
npx @ericrisco/rsc sync               # una vez por clon: instala las skills y ganchos del harness
npx supabase start                    # base de datos local en Docker
npx supabase status -o env            # muestra API_URL y ANON_KEY
```

Crea `.env.local` a partir de [`.env.example`](.env.example) con esos dos valores:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
```

Y arranca la aplicación:

```bash
npm run dev
```

Abre `http://localhost:3000`. Para jugar en local con varios "móviles", usa ventanas de incógnito o navegadores distintos: cada uno es un jugador. La página `/dev/componentes` muestra todos los componentes (no existe en producción).

## Scripts

| Script                        | Qué hace                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                 | Aplicación en desarrollo.                                                                                                  |
| `npm run build` / `npm start` | Compilación y servidor de producción.                                                                                      |
| `npm run check`               | Lint, tipos y tests unitarios. Es lo que tiene que pasar antes de cada commit.                                             |
| `npm run lint`                | ESLint sin avisos permitidos.                                                                                              |
| `npm run typecheck`           | Genera los tipos de Next y comprueba TypeScript.                                                                           |
| `npm test`                    | Tests unitarios y de componentes (Vitest).                                                                                 |
| `npm run test:db`             | Pruebas pgTAP de la base de datos. Necesita `npx supabase start`; para partir de cero, antes `npx supabase db reset`.      |
| `npm run test:e2e`            | Pruebas de extremo a extremo con Playwright contra el entorno local. Arrancan `next dev` solas y usan el Chrome instalado. |
| `npm run format`              | Formatea con Prettier.                                                                                                     |

## Estructura

```
src/
  app/             Rutas de Next: / (inicio) y /sala/[code]; Room elige el juego por game.type
  games/           Una carpeta por juego; ninguna importa de la carpeta de otro juego
    impostor/        El impostor: qué pantalla toca (view.ts, función pura), datos y pantallas
    probable/        ¿Quién es más probable que…?
    quien-lo-dijo/   ¿Quién lo dijo?
    una-pista/       Una sola pista
    que-prefieres/   ¿Qué prefieres?
    palabras-prohibidas/  Palabras prohibidas
    luna-llena/      Luna llena: roles, cartas e ilustraciones, composición, guion del narrador
                       y pantallas de cada fase
    rounds/          Lo que comparten los juegos por rondas: espera de respuestas, lista para
                       votar, resultado con clasificación y controles de quien lleva la fase
  screens/         Pantallas de la plataforma (inicio, nombre, selector, sala de espera, entrar
                     tarde) y diálogos: solo presentación
  components/      Componentes base de Verbena (botón, tarjeta, píldora, avatar…)
  lib/             Lógica del cliente sin interfaz:
                     snapshot.ts   contrato de la foto del estado, validado con zod
                     actions.ts    una función por RPC y traducción de errores
                     sync.ts, use-room-sync.ts   sincronización (Realtime, sondeo, reintentos)
                     copy.ts       todos los textos de la interfaz
                     scan.ts, qr-camera.ts   leer el QR de una sala con la cámara
                     use-countdown.ts        cuenta atrás de la votación con la hora del servidor
                     avatars.ts    la galería de avatares (las ilustraciones, en components/)
  test/            Datos de ejemplo para los tests
supabase/
  migrations/      Esquema, seguridad (RLS), funciones, palabras, preguntas y tarjetas. Nunca se editan: se
                     añaden nuevas. Las funciones de cada juego llevan su prefijo
                     (probable_, quien_lo_dijo_, una_pista_, que_prefieres_,
                     palabras_prohibidas_, luna_llena_; las auxiliares de Luna llena,
                     luna_); lo común de los juegos por rondas
                     vive en el esquema private (open_round, round_departure, round_state,
                     next_subject…)
  tests/           Pruebas pgTAP, incluidas las de secreto de cada juego
e2e/               Pruebas de Playwright
docs/              Contexto, juegos, planes, decisiones, contenido, despliegue e informe
```

## Reglas del repositorio

Las reglas de trabajo están en [`CLAUDE.md`](CLAUDE.md). Lo más importante: cada cambio de base de datos es una migración nueva, toda tabla tiene RLS y ninguna política salvo la lectura de la propia sala, el cliente solo usa RPC, y los textos visibles salen de `src/lib/copy.ts`.

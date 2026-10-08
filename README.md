# La Previa

Web gratuita de juegos de fiesta para jugar **en persona**, cada uno con su móvil. Sin registro: se crea una sala, los demás entran con un código de cuatro letras, un enlace o un QR, y el móvil reparte la información y lleva la cuenta mientras el juego ocurre hablando.

La primera versión trae un juego, **El impostor**: todos conocen la palabra menos uno, que solo sabe la categoría y tiene que disimular.

- Qué se construye y por qué: [`docs/CONTEXTO.md`](docs/CONTEXTO.md).
- Cómo publicarla: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).
- Decisiones tomadas por el camino: [`docs/DECISIONES.md`](docs/DECISIONES.md).

## Cómo funciona

- **Next.js** (App Router, TypeScript estricto) para la interfaz, desplegada en **Vercel**.
- **Supabase**: Postgres, inicio de sesión anónimo y Realtime.
- **La base de datos es la única autoridad.** Los móviles no leen ni escriben tablas: llaman a funciones RPC que comprueban quién llama, si puede y si la fase lo permite, y reciben una "foto del estado" con solo lo que ese jugador puede ver. Por eso no se puede averiguar al impostor desde las herramientas del navegador.
- La pantalla se deduce entera de esa foto. Se mantiene al día con Realtime, una consulta cada 10 s y al volver a la pestaña o recuperar la conexión, así que un móvil que se bloquea o cambia de red vuelve a su sitio.

## Arrancar en local

Requisitos: Node 20.9 o posterior (LTS), npm y Docker Desktop en marcha.

```bash
npm install
git config core.hooksPath .githooks   # una vez por clon: activa el gancho de commits
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
  app/             Rutas de Next: / (inicio) y /sala/[code]; Room elige la pantalla según la foto
  screens/         Pantallas 01–14 y diálogos: solo presentación, reciben todo por props
  components/      Componentes base de Verbena (botón, tarjeta, píldora, avatar…)
  lib/             Lógica del cliente sin interfaz:
                     snapshot.ts   contrato de la foto del estado, validado con zod
                     actions.ts    una función por RPC y traducción de errores
                     sync.ts, use-room-sync.ts   sincronización (Realtime, sondeo, reintentos)
                     view.ts       qué pantalla toca según la foto (función pura)
                     copy.ts       todos los textos de la interfaz
  test/            Datos de ejemplo para los tests
supabase/
  migrations/      Esquema, seguridad (RLS), funciones y palabras. Nunca se editan: se añaden nuevas
  tests/           Pruebas pgTAP, incluidas las de secreto
e2e/               Pruebas de Playwright
docs/              Contexto, plan, decisiones, palabras, despliegue e informe
```

## Reglas del repositorio

Las reglas de trabajo están en [`CLAUDE.md`](CLAUDE.md). Lo más importante: cada cambio de base de datos es una migración nueva, toda tabla tiene RLS y ninguna política salvo la lectura de la propia sala, el cliente solo usa RPC, y los textos visibles salen de `src/lib/copy.ts`.

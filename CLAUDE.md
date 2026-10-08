# La Previa

Web de juegos de fiesta para móvil. Next.js + Supabase + Vercel.

- **Qué se construye y por qué:** `docs/CONTEXTO.md`. Es la fuente de verdad.
- **En qué orden:** `docs/PLAN.md`. Estado en `docs/TAREAS.md`.
- **Referencia visual:** `docs/referencia-pantallas.html`.

Lee `docs/CONTEXTO.md` y `docs/TAREAS.md` al empezar cada sesión. Estas reglas son obligatorias; no hay excepciones "por esta vez".

## Autonomía

- Trabajas sin supervisión. **No hagas preguntas ni esperes confirmación.**
- Ante una duda, elige la opción más simple coherente con `docs/CONTEXTO.md`, anótala en `docs/DECISIONES.md` y sigue.
- Ante un bloqueo real, sigue el procedimiento de `docs/PLAN.md`. Nunca simules que algo funciona.
- No modifiques `CLAUDE.md`, `docs/CONTEXTO.md` ni `docs/PLAN.md`. Si crees que están mal, anótalo en `docs/DECISIONES.md`.

## Alcance

- Construye solo lo que pide el plan. Nada de la lista "Fuera de la primera versión" de `docs/CONTEXTO.md`.
- Sin abstracciones para un futuro hipotético. No hay "motor de juegos": hay un juego.
- Sin dependencias nuevas fuera de la lista permitida. Si una es imprescindible, justifícala en `docs/DECISIONES.md` antes de instalarla.

Dependencias permitidas: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `tailwindcss` y su integración, `zod`, una librería de QR (`qrcode` o equivalente). De desarrollo: `typescript`, `eslint` y sus configuraciones, `prettier`, `vitest`, `@testing-library/*`, `jsdom`, `@playwright/test`, `supabase` (CLI).

## Git

- **Los commits los firma solo el autor configurado en git. Prohibido añadir `Co-Authored-By`, "Generated with…" o cualquier mención a Claude, Anthropic o a una IA en mensajes de commit, descripciones, comentarios de código o documentación.** Tampoco como autor ni como committer.
- No cambies `user.name` ni `user.email` de git.
- Un commit por tarea terminada, con la tarea marcada en `docs/TAREAS.md` dentro del mismo commit.
- Mensajes en español, formato Conventional Commits: `feat(sala): unirse con código`. Tipos: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`. Asunto en minúscula, imperativo, sin punto final, máximo 72 caracteres.
- Solo se hace commit si la definición de hecho se cumple. Nunca `--no-verify`.
- Trabaja en `main`. Prohibido `push --force`, `reset --hard` sobre commits ya hechos, `rebase` y reescribir historia.
- No hagas `push` salvo que exista un remoto `origin`; en ese caso, al terminar cada fase.
- Nunca subas `.env*` (salvo `.env.example`), claves ni volcados de datos.

## Definición de hecho

Una tarea está hecha cuando **todo** esto es cierto:

1. `npm run check` pasa (lint, tipos y tests unitarios), sin avisos.
2. Si toca SQL: `npm run test:db` pasa partiendo de `supabase db reset`.
3. Si toca un flujo cubierto por e2e: `npm run test:e2e` pasa.
4. Lo nuevo tiene tests que fallarían si se rompiera.
5. No quedan `TODO`, `console.log`, código comentado ni archivos sin usar.
6. `docs/TAREAS.md` está actualizado.

Prohibido para "hacer pasar" la verificación: borrar o saltar tests (`skip`, `only`, `todo`), relajar aserciones, bajar reglas de lint o de tipos, o capturar errores para silenciarlos.

## TypeScript

- `strict` activado. Prohibido `any`, `as any`, `@ts-ignore`, `@ts-expect-error` y `!` de aserción no nula.
- `as` solo tras una validación real o para `as const`.
- Sin `eslint-disable`. Si una regla estorba, el código está mal.
- Lo que llega de fuera (RPC, almacenamiento, URL) se valida con `zod` antes de usarse. Los tipos salen del esquema, no al revés.
- Funciones pequeñas con un solo propósito. Sin clases salvo necesidad real. Sin `enum`: uniones de literales.
- Identificadores en inglés. Comentarios, documentación y textos de interfaz en español.
- Comentarios solo para explicar un porqué que el código no puede decir. No se comenta lo evidente.
- Exportaciones con nombre; `default` solo donde Next lo exige.

## React y Next

- App Router. Componentes de servidor por defecto; `'use client'` solo donde haya estado, efectos o eventos, y lo más abajo posible en el árbol.
- **Sin lógica de juego en el cliente ni en el servidor de Next.** No hay rutas de API ni acciones de servidor que decidan nada: todo va por RPC a Postgres.
- La vista se deduce de la foto del estado con una función pura. Prohibido guardar la fase de la partida en estado local o navegar entre rutas por fase.
- Estado local solo para interfaz (un diálogo abierto, el valor de un campo). Sin librerías de estado global.
- Los efectos limpian siempre lo que crean: suscripciones, intervalos, escuchas, wake lock.
- Sin `useEffect` para derivar datos: se calculan al renderizar.
- Componentes de presentación sin acceso a datos; reciben todo por props.
- Los textos visibles salen del módulo único de textos. Ninguna cadena suelta en componentes.

## Base de datos

- Todo cambio de esquema es una **migración nueva** en `supabase/migrations`. Una migración ya incluida en un commit no se edita nunca.
- RLS activado en toda tabla en la misma migración que la crea. **Ninguna política nueva**: la única permitida es la de lectura de `rooms` descrita en el contexto.
- El cliente no hace `from(...).select/insert/update/delete`. Solo `rpc(...)` y la suscripción a `rooms`.
- Toda función expuesta: `security definer`, `set search_path = ''`, nombres totalmente cualificados, comprobación de `auth.uid()` en la primera línea útil, bloqueo de la fila de la sala antes de leer estado, y `execute` revocado a `public`/`anon`.
- Las funciones auxiliares van en el esquema `private`.
- Los errores se lanzan con los códigos del contexto. No se inventan códigos sin añadirlos también al cliente.
- **Nada secreto en `rooms`** ni en ninguna respuesta antes de `finished`: ni rol ajeno, ni palabra para el impostor, ni votos ajenos, ni recuentos.
- La clave `service_role` no se usa ni se escribe en ningún sitio.
- Cada función nueva llega con sus pruebas pgTAP, incluidos los casos de rechazo.

## Interfaz

- Móvil primero: se diseña y se prueba a 360, 390 y 430 px. Nada de desbordes horizontales.
- Solo tokens de Verbena definidos en Tailwind. Prohibidos colores, sombras o radios con valores sueltos, y los estilos en línea.
- La referencia manda en aspecto y textos. Si un caso no está dibujado, se resuelve con los componentes existentes.
- Español de España, tuteo y "vosotros". Sin emojis.
- Accesibilidad mínima: elementos nativos (`button`, `a`, `input` con `label`), foco visible, objetivos táctiles de 44 px o más, `aria-label` en botones sin texto.
- Nunca se muestra al usuario un error técnico ni un código interno.

## Comandos

```bash
npm run dev          # aplicación en local
npm run check        # lint + tipos + tests unitarios
npm run test:db      # pruebas pgTAP (necesita supabase start)
npm run test:e2e     # Playwright contra el entorno local
npx supabase start   # base de datos local (necesita Docker)
npx supabase db reset
```

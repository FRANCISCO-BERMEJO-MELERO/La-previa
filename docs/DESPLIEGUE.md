# Despliegue

Pasos para publicar La Previa con Supabase (base de datos, sesiones anónimas y Realtime) y Vercel (la web). Todo esto se hace a mano y una sola vez; después, publicar cambios es subir a GitHub y, si hay migraciones nuevas, aplicarlas.

Antes de empezar, en local tiene que pasar todo: `npm run check`, `npm run test:db` (tras `npx supabase db reset`) y `npm run test:e2e`.

## 1. Proyecto de Supabase

1. En [supabase.com](https://supabase.com), **New project**. Plan gratuito. Región cercana (por ejemplo, _West EU_ o _Central EU_). Guarda la contraseña de la base de datos en tu gestor de contraseñas: la pedirá el paso 2.
2. **Authentication → Sign In / Providers → Anonymous sign-ins**: actívalo y guarda. Sin esto nadie puede jugar.
3. **Authentication → Rate Limits → Anonymous sign-ins**: el valor por defecto es 30 por hora y por IP. En una fiesta todos los móviles salen por la misma wifi, así que súbelo a 100 para no quedarte corto si llega gente nueva o alguien borra los datos del navegador.
4. **Authentication → URL Configuration → Site URL**: pon la dirección de Vercel cuando la tengas (paso 4). Las sesiones anónimas no la necesitan para funcionar, pero así queda bien configurado.

## 2. Aplicar las migraciones

Desde la carpeta del proyecto:

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push
```

- El `ref` es la parte de la URL del proyecto: `https://supabase.com/dashboard/project/<ref>`.
- `db push` pide la contraseña del paso 1.1 y aplica todas las migraciones de `supabase/migrations`: tablas con RLS, la única política de lectura de `rooms`, `rooms` en Realtime, las funciones de los seis juegos, las 200 palabras, las 230 preguntas, los 120 dilemas y las 150 tarjetas. No hace falta activar ninguna extensión de Postgres.
- Comprueba que están todas: `npx supabase migration list` debe mostrar cada migración en las columnas _Local_ y _Remote_.

**Nunca** ejecutes `npx supabase db reset --linked`: borra la base de datos de producción.

## 3. Datos para la web

En **Project Settings → API Keys** (o **Data API**):

- **Project URL**: `https://<ref>.supabase.co` → será `NEXT_PUBLIC_SUPABASE_URL`.
- **Clave pública**: la _publishable key_ (`sb_publishable_…`) o, en proyectos antiguos, la _anon key_ → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

La clave `service_role` (o _secret key_) **no se usa en ningún sitio**. No la copies a Vercel ni al repositorio.

## 4. Proyecto de Vercel

1. Sube el repositorio a GitHub si aún no está (`git push`).
2. En [vercel.com](https://vercel.com), **Add New → Project** e importa el repositorio. Vercel detecta Next.js; no cambies el comando de compilación ni la carpeta de salida.
3. En **Environment Variables**, añade para _Production_ y _Preview_:
   - `NEXT_PUBLIC_SUPABASE_URL` = la Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la clave pública.
4. **Deploy**. Si faltan las variables, la compilación falla al validar el entorno: es a propósito.
5. Vuelve al paso 1.4 y pon la dirección que te ha dado Vercel como _Site URL_.

Cada `git push` a la rama principal publica de nuevo. Si un cambio trae migraciones nuevas, aplícalas **antes** del push con `npx supabase db push`, para que la web nunca llame a una función que aún no existe.

## 5. Comprobación final

Con dos o tres móviles de verdad (o un móvil y ventanas de incógnito):

1. Abre la web en el primero, **Crear sala**, tu nombre, **Abrir la sala**.
2. En el segundo, entra con el código. En el tercero, escanea el QR (**Mostrar QR**). Los tres ven la lista actualizarse sola.
3. **Empezar partida**: los jugadores normales ven la misma palabra; el impostor, solo la categoría.
4. Vota, cierra la votación, sigue hasta el resultado y **Volver a jugar**.
5. **Cambiar de juego** y juega una partida de 5 rondas de **¿Quién es más probable que…?**, **¿Quién lo dijo?**, **Una sola pista**, **¿Qué prefieres?** y **Palabras prohibidas**. En Una sola pista, quien adivina no ve la palabra hasta el final; en Palabras prohibidas, quien adivina no ve la tarjeta.
6. Bloquea un móvil un minuto y desbloquéalo: vuelve a su pantalla sin pedir el nombre.
7. Abre `https://<tu-dominio>/dev/componentes`: tiene que responder que la página no existe.

## Avisos

- **Pausa del plan gratuito.** Supabase pausa los proyectos gratuitos tras 7 días sin actividad. Abre la web el día antes de la fiesta; si está pausado, se reactiva desde el panel de Supabase con **Restore project**.
- **Salas abandonadas.** No se borran solas en esta versión (ver `docs/CONTEXTO.md` §10). Ocupan muy poco; si algún día hace falta, la vía prevista es una tarea `pg_cron` que borre salas con `last_activity_at` antiguo.
- **Palabras.** Para quitar o añadir palabras, crea una migración nueva (por ejemplo, `update public.words set active = false where word = '…'`) y aplícala con `npx supabase db push`. La lista legible está en `docs/PALABRAS.md`. Una sola pista usa las mismas palabras.
- **Preguntas.** Igual con las de ¿Quién es más probable que…?, ¿Quién lo dijo? y los dilemas de ¿Qué prefieres? (tabla `public.prompts`): una migración nueva que las desactive o añada. La lista legible está en `docs/PREGUNTAS.md`.
- **Tarjetas.** Igual con las de Palabras prohibidas (tabla `public.taboo_cards`). La base de datos rechaza una tarjeta que no tenga cinco prohibidas distintas entre sí y de la palabra. La lista legible está en `docs/TARJETAS.md`.

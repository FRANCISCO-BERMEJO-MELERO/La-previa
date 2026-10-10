import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  client ??= createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

/** Lo único que hace falta del cliente de autenticación para tener sesión. */
export type SessionAuth = {
  getSession(): Promise<{ data: { session: { user: { id: string } } | null } }>;
  signInAnonymously(): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
};

const pending = new WeakMap<SessionAuth, Promise<string>>();

/**
 * Devuelve el id del jugador e inicia la sesión anónima la primera vez que hace falta.
 * Las llamadas simultáneas comparten el mismo inicio, para no crear dos identidades.
 */
export function ensureSession(auth: SessionAuth = getSupabase().auth): Promise<string> {
  const inFlight = pending.get(auth);
  if (inFlight) return inFlight;

  const started = startSession(auth).finally(() => {
    pending.delete(auth);
  });
  pending.set(auth, started);
  return started;
}

async function startSession(auth: SessionAuth): Promise<string> {
  const { data } = await auth.getSession();
  if (data.session) return data.session.user.id;

  const { data: signedIn, error } = await auth.signInAnonymously();
  if (error || !signedIn.user) throw new Error('not_authenticated', { cause: error });
  return signedIn.user.id;
}

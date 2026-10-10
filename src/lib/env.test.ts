import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('acepta una URL y una clave', () => {
    expect(
      parseEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'clave',
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'clave',
    });
  });

  it('falla si falta una variable', () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      }),
    ).toThrow();
  });

  it('falla si la URL no es una URL', () => {
    expect(() =>
      parseEnv({ NEXT_PUBLIC_SUPABASE_URL: 'supabase', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'clave' }),
    ).toThrow();
  });
});

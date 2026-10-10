import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copy } from '@/lib/copy';
import ComponentsPage from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not-found');
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/dev/componentes', () => {
  it('en desarrollo muestra todas las secciones', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(<ComponentsPage />);
    for (const title of Object.values(copy.dev.sections)) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('en producción no existe', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => render(<ComponentsPage />)).toThrow('not-found');
  });
});

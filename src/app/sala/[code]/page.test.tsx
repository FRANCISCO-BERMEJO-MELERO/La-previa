import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RoomPage from './page';

vi.mock('./RoomEntry', () => ({
  RoomEntry: ({ code }: { code: string }) => <p>{`entrando en ${code}`}</p>,
}));

async function renderPage(code: string) {
  render(await RoomPage({ params: Promise.resolve({ code }) }));
}

describe('/sala/[code]', () => {
  it('entra con un código válido, aunque venga en minúsculas', async () => {
    await renderPage('ktrm');
    expect(screen.getByText('entrando en KTRM')).toBeInTheDocument();
  });

  it.each(['KTRL', 'KT', 'KTRMA', '%E2'])(
    'con un código imposible (%s) dice que no existe',
    async (code) => {
      await renderPage(code);
      expect(screen.getByRole('heading', { name: 'Esta sala no existe' })).toBeInTheDocument();
    },
  );
});

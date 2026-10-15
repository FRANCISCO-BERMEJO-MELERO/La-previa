import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import type { Snapshot } from '@/lib/snapshot';
import { lobbySnapshot } from '@/test/fixtures';
import { HomeFlow } from './HomeFlow';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createRoom: vi.fn<(name: string) => Promise<ActionResult<Snapshot>>>(),
  setAvatar: vi.fn<(roomId: string, avatar: string | null) => Promise<ActionResult<Snapshot>>>(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/actions', () => ({ createRoom: mocks.createRoom, setAvatar: mocks.setAvatar }));
// El escáner de verdad necesita cámara: aquí lee la sala KTRM en cuanto se abre.
vi.mock('@/screens/ScanDialog', () => ({
  ScanDialog: ({ open, onCode }: { open: boolean; onCode: (code: string) => void }) =>
    open ? (
      <button
        type="button"
        onClick={() => {
          onCode('KTRM');
        }}
      >
        leer QR
      </button>
    ) : null,
}));

beforeEach(() => {
  mocks.push.mockReset();
  mocks.createRoom.mockReset();
  mocks.setAvatar.mockReset();
});

describe('HomeFlow', () => {
  it('normaliza el código y entra en la sala por su ruta', () => {
    render(<HomeFlow />);
    fireEvent.change(screen.getByLabelText('Código de la sala'), { target: { value: 'k t r m' } });
    expect(screen.getByLabelText('Código de la sala')).toHaveValue('KTRM');
    fireEvent.click(screen.getByRole('button', { name: 'Unirse' }));
    expect(mocks.push).toHaveBeenCalledWith('/sala/KTRM');
  });

  it('escanear el QR de una sala lleva a ella', () => {
    render(<HomeFlow />);
    expect(screen.queryByRole('button', { name: 'leer QR' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Escanear QR' }));
    fireEvent.click(screen.getByRole('button', { name: 'leer QR' }));
    expect(mocks.push).toHaveBeenCalledWith('/sala/KTRM');
    expect(screen.queryByRole('button', { name: 'leer QR' })).not.toBeInTheDocument();
  });

  it('al crear sala con avatar, lo guarda antes de entrar', async () => {
    mocks.createRoom.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    mocks.setAvatar.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    render(<HomeFlow />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }));
    fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Fran' } });
    fireEvent.click(screen.getByRole('button', { name: 'Farolillo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/sala/KTRM?nueva=1');
    });
    expect(mocks.setAvatar).toHaveBeenCalledWith(lobbySnapshot().room.id, 'lantern');
  });

  it('crear sala pide el nombre, crea la sala y lleva a ella para elegir juego', async () => {
    mocks.createRoom.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    render(<HomeFlow />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }));
    fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Fran' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(mocks.createRoom).toHaveBeenCalledWith('Fran');
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/sala/KTRM?nueva=1');
    });
  });

  it('si falla, muestra el error en línea sin código técnico', async () => {
    mocks.createRoom.mockResolvedValue({ ok: false, error: 'offline' });
    render(<HomeFlow />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }));
    fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Fran' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument();
    expect(screen.queryByText('offline')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import type { Snapshot } from '@/lib/snapshot';
import { lobbySnapshot } from '@/test/fixtures';
import { RoomEntry } from './RoomEntry';

const mocks = vi.hoisted(() => ({
  joinRoom: vi.fn<(code: string, name: string) => Promise<ActionResult<Snapshot>>>(),
}));

vi.mock('@/lib/actions', () => ({ joinRoom: mocks.joinRoom }));
vi.mock('./Room', () => ({
  Room: ({ initial }: { initial: Snapshot }) => <p>{`dentro como ${initial.me.name}`}</p>,
}));

beforeEach(() => {
  mocks.joinRoom.mockReset();
});

describe('RoomEntry', () => {
  it('mientras comprueba muestra que carga', () => {
    mocks.joinRoom.mockReturnValue(new Promise(() => undefined));
    render(<RoomEntry code="KTRM" />);
    expect(screen.getByRole('heading', { name: 'Cargando la sala…' })).toBeInTheDocument();
  });

  it('si ya era miembro entra directamente, sin pedir nombre', async () => {
    mocks.joinRoom.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    render(<RoomEntry code="KTRM" />);
    expect(await screen.findByText('dentro como Fran')).toBeInTheDocument();
    expect(mocks.joinRoom).toHaveBeenCalledWith('KTRM', '');
  });

  it('si no era miembro pide el nombre y se une con él', async () => {
    mocks.joinRoom.mockResolvedValueOnce({ ok: false, error: 'name_invalid' });
    render(<RoomEntry code="KTRM" />);
    fireEvent.change(await screen.findByLabelText('Tu nombre'), { target: { value: 'Lucía' } });
    mocks.joinRoom.mockResolvedValueOnce({
      ok: true,
      data: lobbySnapshot({
        me: { user_id: lobbySnapshot().players[1]?.user_id ?? '', name: 'Lucía', is_host: false },
      }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('dentro como Lucía')).toBeInTheDocument();
    expect(mocks.joinRoom).toHaveBeenLastCalledWith('KTRM', 'Lucía');
    expect(screen.getByText('dentro como Lucía')).toBeInTheDocument();
  });

  it('con nombre repetido lo dice en línea, nombrando al jugador', async () => {
    mocks.joinRoom.mockResolvedValueOnce({ ok: false, error: 'name_invalid' });
    render(<RoomEntry code="KTRM" />);
    fireEvent.change(await screen.findByLabelText('Tu nombre'), { target: { value: 'Álvaro ' } });
    mocks.joinRoom.mockResolvedValueOnce({ ok: false, error: 'name_taken' });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Tu nombre')).toHaveAccessibleDescription(
        'Ya hay un Álvaro en esta sala. Prueba con otro nombre.',
      );
    });
  });

  it('con la sala llena lo dice en línea', async () => {
    mocks.joinRoom.mockResolvedValueOnce({ ok: false, error: 'name_invalid' });
    render(<RoomEntry code="KTRM" />);
    fireEvent.change(await screen.findByLabelText('Tu nombre'), { target: { value: 'Sergio' } });
    mocks.joinRoom.mockResolvedValueOnce({ ok: false, error: 'room_full' });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/La sala está llena/)).toBeInTheDocument();
  });

  it('si la sala no existe lo explica', async () => {
    mocks.joinRoom.mockResolvedValue({ ok: false, error: 'room_not_found' });
    render(<RoomEntry code="ZZZZ" />);
    expect(await screen.findByRole('heading', { name: 'Esta sala no existe' })).toBeInTheDocument();
  });

  it('si falla la red deja reintentar', async () => {
    mocks.joinRoom.mockResolvedValueOnce({ ok: false, error: 'offline' });
    render(<RoomEntry code="KTRM" />);
    expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument();
    mocks.joinRoom.mockResolvedValueOnce({ ok: true, data: lobbySnapshot() });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('dentro como Fran')).toBeInTheDocument();
    expect(mocks.joinRoom).toHaveBeenCalledTimes(2);
  });
});

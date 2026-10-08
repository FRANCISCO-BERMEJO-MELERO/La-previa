import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import type { ShareOutcome } from '@/lib/share';
import type { Snapshot } from '@/lib/snapshot';
import type { RoomSync } from '@/lib/use-room-sync';
import { ids, lobbySnapshot } from '@/test/fixtures';
import { Room } from './Room';

const mocks = vi.hoisted(() => ({
  sync: vi.fn<() => Partial<RoomSync>>(),
  apply: vi.fn(),
  setGame: vi.fn<(roomId: string, game: string) => Promise<ActionResult<Snapshot>>>(),
  kickPlayer: vi.fn<(roomId: string, userId: string) => Promise<ActionResult<Snapshot>>>(),
  shareRoomLink: vi.fn<(url: string, title: string) => Promise<ShareOutcome>>(),
}));

vi.mock('@/lib/use-room-sync', () => ({ useRoomSync: mocks.sync }));
vi.mock('@/lib/actions', () => ({ setGame: mocks.setGame, kickPlayer: mocks.kickPlayer }));
vi.mock('@/lib/share', () => ({ shareRoomLink: mocks.shareRoomLink }));

function ready(snapshot: Snapshot = lobbySnapshot()) {
  mocks.sync.mockReturnValue({ status: 'ready', snapshot, offline: false, apply: mocks.apply });
}

beforeEach(() => {
  vi.resetAllMocks();
  ready();
});

describe('Room', () => {
  it('en la sala de espera muestra la lista de jugadores', () => {
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByText('Lucía')).toBeInTheDocument();
  });

  it('si la sala desaparece lo explica', () => {
    mocks.sync.mockReturnValue({ status: 'gone', snapshot: null, offline: false });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByRole('heading', { name: 'Esta sala no existe' })).toBeInTheDocument();
  });

  it('recién creada, el anfitrión elige juego y abre la sala', async () => {
    mocks.setGame.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    const replaceState = vi.spyOn(window.history, 'replaceState');
    render(<Room initial={lobbySnapshot()} fresh />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir la sala' }));
    expect(mocks.setGame).toHaveBeenCalledWith(ids.room, 'impostor');
    expect(await screen.findByText('KTRM')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir la sala' })).not.toBeInTheDocument();
    expect(mocks.apply).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(null, '', '/sala/KTRM');
  });

  it('quien no es anfitrión nunca ve el selector de juego', () => {
    const base = lobbySnapshot();
    ready(lobbySnapshot({ me: { ...base.me, user_id: ids.lucia, name: 'Lucía', is_host: false } }));
    render(<Room initial={lobbySnapshot()} fresh />);
    expect(screen.queryByRole('button', { name: 'Abrir la sala' })).not.toBeInTheDocument();
  });

  it('el anfitrión echa a un jugador y aplica la foto que devuelve', async () => {
    mocks.kickPlayer.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Echar a Lucía' }));
    expect(mocks.kickPlayer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Echar' }));
    expect(mocks.kickPlayer).toHaveBeenCalledWith(ids.room, ids.lucia);
    await waitFor(() => {
      expect(mocks.apply).toHaveBeenCalledTimes(1);
    });
  });

  it('si no puede echar, lo explica sin códigos técnicos', async () => {
    mocks.kickPlayer.mockResolvedValue({ ok: false, error: 'not_host' });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Echar a Lucía' }));
    fireEvent.click(screen.getByRole('button', { name: 'Echar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Eso solo lo puede hacer quien lleva la sala.',
    );
  });

  it('comparte el enlace completo de la sala y muestra que se ha copiado', async () => {
    mocks.shareRoomLink.mockResolvedValue('copied');
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }));
    expect(mocks.shareRoomLink).toHaveBeenCalledWith(
      `${window.location.origin}/sala/KTRM`,
      'Únete a la sala KTRM en La Previa',
    );
    expect(await screen.findByRole('button', { name: 'Enlace copiado' })).toBeInTheDocument();
  });

  it('abre y cierra el QR', () => {
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar QR' }));
    expect(screen.getByRole('dialog', { name: 'Escanea para entrar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Escanea para entrar' })).not.toBeInTheDocument();
  });

  it('el selector de impostores no pasa de su máximo con la gente que hay', () => {
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByRole('button', { name: 'Más impostores' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Menos impostores' })).toBeDisabled();
  });
});

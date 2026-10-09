import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import type { ShareOutcome } from '@/lib/share';
import type { Snapshot } from '@/lib/snapshot';
import type { RoomSync } from '@/lib/use-room-sync';
import { gameState, ids, inGame, lobbySnapshot } from '@/test/fixtures';
import { Room } from './Room';

const mocks = vi.hoisted(() => ({
  sync: vi.fn<() => Partial<RoomSync>>(),
  apply: vi.fn(),
  setGame: vi.fn<(roomId: string, game: string) => Promise<ActionResult<Snapshot>>>(),
  kickPlayer: vi.fn<(roomId: string, userId: string) => Promise<ActionResult<Snapshot>>>(),
  shareRoomLink: vi.fn<(url: string, title: string) => Promise<ShareOutcome>>(),
  wakeLock: vi.fn<(active: boolean) => void>(),
  leaveRoom: vi.fn<(roomId: string) => Promise<ActionResult<null>>>(),
  startGame: vi.fn<(roomId: string, count: number) => Promise<ActionResult<Snapshot>>>(),
  probableStart: vi.fn<(roomId: string, rounds: number) => Promise<ActionResult<Snapshot>>>(),
  openVoting: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  castVote: vi.fn<(roomId: string, target: string) => Promise<ActionResult<Snapshot>>>(),
  closeVoting: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  continueGame: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  backToLobby: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  push: vi.fn(),
}));

vi.mock('@/lib/use-room-sync', () => ({ useRoomSync: mocks.sync }));
vi.mock('@/lib/actions', () => ({
  setGame: mocks.setGame,
  kickPlayer: mocks.kickPlayer,
  leaveRoom: mocks.leaveRoom,
  startGame: mocks.startGame,
  probableStart: mocks.probableStart,
  openVoting: mocks.openVoting,
  castVote: mocks.castVote,
  closeVoting: mocks.closeVoting,
  continueGame: mocks.continueGame,
  backToLobby: mocks.backToLobby,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/share', () => ({ shareRoomLink: mocks.shareRoomLink }));
vi.mock('@/lib/use-wake-lock', () => ({ useWakeLock: mocks.wakeLock }));

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

  it('si la sala desaparece lo explica y deja apagarse la pantalla', () => {
    mocks.sync.mockReturnValue({ status: 'gone', snapshot: null, offline: false });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByRole('heading', { name: 'Esta sala no existe' })).toBeInTheDocument();
    expect(mocks.wakeLock).toHaveBeenLastCalledWith(false);
  });

  it('mientras se está en la sala mantiene la pantalla encendida', () => {
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(mocks.wakeLock).toHaveBeenLastCalledWith(true);
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

  it('el anfitrión puede elegir otro juego antes de abrir la sala', async () => {
    mocks.setGame.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    render(<Room initial={lobbySnapshot()} fresh />);
    fireEvent.click(screen.getByRole('button', { name: /¿Quién es más probable que…\?/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir la sala' }));
    expect(mocks.setGame).toHaveBeenCalledWith(ids.room, 'probable');
    expect(await screen.findByText('KTRM')).toBeInTheDocument();
  });

  it('en un juego por rondas, el anfitrión empieza con las rondas elegidas', async () => {
    const base = lobbySnapshot();
    const probableLobby = lobbySnapshot({ room: { ...base.room, game: 'probable' } });
    ready(probableLobby);
    mocks.probableStart.mockResolvedValue({ ok: true, data: probableLobby });
    render(<Room initial={probableLobby} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: '15 rondas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar partida' }));
    expect(mocks.probableStart).toHaveBeenCalledWith(ids.room, 15);
    expect(mocks.startGame).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mocks.apply).toHaveBeenCalledTimes(1);
    });
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

  it('salir pide confirmación, sale y vuelve al inicio', async () => {
    mocks.leaveRoom.mockResolvedValue({ ok: true, data: null });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'El impostor. Salir de la sala' }));
    expect(mocks.leaveRoom).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(mocks.leaveRoom).toHaveBeenCalledWith(ids.room);
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/');
    });
  });

  it('cancelar la salida no hace nada', () => {
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'El impostor. Salir de la sala' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.leaveRoom).not.toHaveBeenCalled();
  });

  it('si no se puede salir, lo dice dentro del diálogo', async () => {
    mocks.leaveRoom.mockResolvedValue({ ok: false, error: 'offline' });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'El impostor. Salir de la sala' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Sin conexión/);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('sin conexión avisa y sigue mostrando la última foto', () => {
    mocks.sync.mockReturnValue({
      status: 'ready',
      snapshot: lobbySnapshot(),
      offline: true,
      apply: mocks.apply,
    });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(
      screen.getByText('Sin conexión. Seguimos intentándolo; no cierres la página.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Lucía')).toBeInTheDocument();
  });

  it('el selector de impostores no pasa de su máximo con la gente que hay', () => {
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByRole('button', { name: 'Más impostores' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Menos impostores' })).toBeDisabled();
  });

  it('el anfitrión empieza la partida con los impostores elegidos', async () => {
    mocks.startGame.mockResolvedValue({ ok: true, data: inGame() });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Empezar partida' }));
    expect(mocks.startGame).toHaveBeenCalledWith(ids.room, 1);
    await waitFor(() => {
      expect(mocks.apply).toHaveBeenCalledTimes(1);
    });
  });

  it('con partida, el reparto muestra la palabra y el anfitrión pasa a votación', () => {
    mocks.openVoting.mockResolvedValue({ ok: true, data: inGame({ phase: 'voting' }) });
    ready(inGame());
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByText('Paella')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pasar a votación' }));
    expect(mocks.openVoting).toHaveBeenCalledWith(ids.room);
  });

  it('quien no es anfitrión espera a que decida', () => {
    const base = inGame();
    ready({ ...base, me: { user_id: ids.lucia, name: 'Lucía', is_host: false } });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('Fran decide cuándo se vota');
  });

  it('votar envía el voto al elegido', async () => {
    mocks.castVote.mockResolvedValue({ ok: true, data: inGame({ phase: 'voting' }) });
    ready(inGame({ phase: 'voting' }));
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lucía' }));
    fireEvent.click(screen.getByRole('button', { name: 'Votar a Lucía' }));
    expect(mocks.castVote).toHaveBeenCalledWith(ids.room, ids.lucia);
    await waitFor(() => {
      expect(mocks.apply).toHaveBeenCalledTimes(1);
    });
  });

  it('tras votar, el anfitrión cierra la votación', () => {
    mocks.closeVoting.mockResolvedValue({ ok: true, data: inGame({ phase: 'reveal' }) });
    ready(inGame({ phase: 'voting', my: { ...gameState().my, voted_for: ids.lucia } }));
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByText('Tu voto: Lucía')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar votación' }));
    expect(mocks.closeVoting).toHaveBeenCalledWith(ids.room);
  });

  it('en la revelación cuenta cuántos quedan y el anfitrión sigue', () => {
    mocks.continueGame.mockResolvedValue({ ok: true, data: inGame() });
    ready(
      inGame({
        phase: 'reveal',
        participants: [
          { user_id: ids.fran, name: 'Fran', alive: true, has_voted: true },
          { user_id: ids.lucia, name: 'Lucía', alive: true, has_voted: true },
          { user_id: ids.alvaro, name: 'Álvaro', alive: false, has_voted: true },
          { user_id: ids.marta, name: 'Marta', alive: true, has_voted: true },
        ],
        outcome: { type: 'eliminated', user_id: ids.alvaro, name: 'Álvaro', was_impostor: false },
      }),
    );
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(
      screen.getByText('La partida sigue. Quedan 3 jugadores y 1 impostor entre ellos.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Seguir hablando' }));
    expect(mocks.continueGame).toHaveBeenCalledWith(ids.room);
  });

  it('un anfitrión eliminado sigue llevando la partida', () => {
    ready(inGame({ phase: 'talking', my: { ...gameState().my, alive: false } }));
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByRole('heading', { name: 'Estás fuera, Fran' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pasar a votación' })).toBeInTheDocument();
  });

  it('un eliminado que no es anfitrión ve que el grupo está votando', () => {
    const base = inGame({ phase: 'voting', my: { ...gameState().my, alive: false } });
    ready({ ...base, me: { user_id: ids.lucia, name: 'Lucía', is_host: false } });
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('El grupo está votando');
  });

  const finished = () =>
    inGame({
      phase: 'finished',
      result: { winner: 'group', word: 'Paella', impostor_ids: [ids.alvaro] },
    });

  it('volver a jugar empieza otra partida con los mismos impostores', async () => {
    mocks.startGame.mockResolvedValue({ ok: true, data: inGame() });
    ready(finished());
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByRole('heading', { name: '¡Has ganado!' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
    expect(mocks.startGame).toHaveBeenCalledWith(ids.room, 1);
    await waitFor(() => {
      expect(mocks.apply).toHaveBeenCalledTimes(1);
    });
    expect(mocks.backToLobby).not.toHaveBeenCalled();
  });

  it('si ya no hay gente suficiente, volver a jugar lleva a la sala de espera', async () => {
    mocks.startGame.mockResolvedValue({ ok: false, error: 'not_enough_players' });
    mocks.backToLobby.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    ready(finished());
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
    await waitFor(() => {
      expect(mocks.backToLobby).toHaveBeenCalledWith(ids.room);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('en plena votación, el anfitrión echa a un desconectado con confirmación', async () => {
    mocks.kickPlayer.mockResolvedValue({ ok: true, data: inGame({ phase: 'reveal' }) });
    ready(inGame({ phase: 'voting', my: { ...gameState().my, voted_for: ids.lucia } }));
    render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Echar a Álvaro' }));
    expect(screen.getByRole('dialog', { name: '¿Echar a Álvaro?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Echar' }));
    expect(mocks.kickPlayer).toHaveBeenCalledWith(ids.room, ids.alvaro);
    await waitFor(() => {
      expect(mocks.apply).toHaveBeenCalledTimes(1);
    });
  });

  it('cambiar de juego vuelve a la sala y abre el selector', async () => {
    mocks.backToLobby.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    ready(finished());
    const { rerender } = render(<Room initial={lobbySnapshot()} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar de juego' }));
    await waitFor(() => {
      expect(mocks.apply).toHaveBeenCalledTimes(1);
    });
    ready(lobbySnapshot());
    rerender(<Room initial={lobbySnapshot()} fresh={false} />);
    expect(screen.getByRole('button', { name: 'Abrir la sala' })).toBeInTheDocument();
  });
});

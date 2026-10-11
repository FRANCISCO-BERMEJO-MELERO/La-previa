import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/actions';
import type { ShareOutcome } from '@/lib/share';
import type { Snapshot } from '@/lib/snapshot';
import type { RoomSync } from '@/lib/use-room-sync';
import {
  gameState,
  ids,
  inGame,
  inPista,
  inPrefieres,
  inProbable,
  inQuien,
  lobbySnapshot,
} from '@/test/fixtures';
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
  probableVote: vi.fn<(roomId: string, target: string) => Promise<ActionResult<Snapshot>>>(),
  probableClose: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  probableNext: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  quienLoDijoStart: vi.fn<(roomId: string, rounds: number) => Promise<ActionResult<Snapshot>>>(),
  quienLoDijoAnswer: vi.fn<(roomId: string, text: string) => Promise<ActionResult<Snapshot>>>(),
  quienLoDijoCloseWriting: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  quienLoDijoVote: vi.fn<(roomId: string, target: string) => Promise<ActionResult<Snapshot>>>(),
  quienLoDijoCloseVoting: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  quienLoDijoNext: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  unaPistaStart: vi.fn<(roomId: string, rounds: number) => Promise<ActionResult<Snapshot>>>(),
  unaPistaClue: vi.fn<(roomId: string, text: string) => Promise<ActionResult<Snapshot>>>(),
  unaPistaCloseWriting: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  unaPistaToggleClue: vi.fn<(roomId: string, userId: string) => Promise<ActionResult<Snapshot>>>(),
  unaPistaShowClues: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  unaPistaMark: vi.fn<(roomId: string, result: string) => Promise<ActionResult<Snapshot>>>(),
  unaPistaNext: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  quePrefieresStart: vi.fn<(roomId: string, rounds: number) => Promise<ActionResult<Snapshot>>>(),
  quePrefieresChoose: vi.fn<(roomId: string, option: string) => Promise<ActionResult<Snapshot>>>(),
  quePrefieresClose: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
  quePrefieresNext: vi.fn<(roomId: string) => Promise<ActionResult<Snapshot>>>(),
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
  probableVote: mocks.probableVote,
  probableClose: mocks.probableClose,
  probableNext: mocks.probableNext,
  quienLoDijoStart: mocks.quienLoDijoStart,
  quienLoDijoAnswer: mocks.quienLoDijoAnswer,
  quienLoDijoCloseWriting: mocks.quienLoDijoCloseWriting,
  quienLoDijoVote: mocks.quienLoDijoVote,
  quienLoDijoCloseVoting: mocks.quienLoDijoCloseVoting,
  quienLoDijoNext: mocks.quienLoDijoNext,
  unaPistaStart: mocks.unaPistaStart,
  unaPistaClue: mocks.unaPistaClue,
  unaPistaCloseWriting: mocks.unaPistaCloseWriting,
  unaPistaToggleClue: mocks.unaPistaToggleClue,
  unaPistaShowClues: mocks.unaPistaShowClues,
  unaPistaMark: mocks.unaPistaMark,
  unaPistaNext: mocks.unaPistaNext,
  quePrefieresStart: mocks.quePrefieresStart,
  quePrefieresChoose: mocks.quePrefieresChoose,
  quePrefieresClose: mocks.quePrefieresClose,
  quePrefieresNext: mocks.quePrefieresNext,
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

  it('el anfitrión puede elegir ¿Qué prefieres?', async () => {
    mocks.setGame.mockResolvedValue({ ok: true, data: lobbySnapshot() });
    render(<Room initial={lobbySnapshot()} fresh />);
    fireEvent.click(screen.getByRole('button', { name: /¿Qué prefieres\?/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir la sala' }));
    expect(mocks.setGame).toHaveBeenCalledWith(ids.room, 'que_prefieres');
    expect(await screen.findByText('KTRM')).toBeInTheDocument();
  });

  it('¿Qué prefieres? empieza con las rondas elegidas', () => {
    const base = lobbySnapshot();
    const lobby = lobbySnapshot({ room: { ...base.room, game: 'que_prefieres' } });
    ready(lobby);
    mocks.quePrefieresStart.mockResolvedValue({ ok: true, data: lobby });
    render(<Room initial={lobby} fresh={false} />);
    fireEvent.click(screen.getByRole('button', { name: '5 rondas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar partida' }));
    expect(mocks.quePrefieresStart).toHaveBeenCalledWith(ids.room, 5);
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

  describe('probable', () => {
    it('vota con la pregunta delante y aplica la foto', async () => {
      ready(inProbable());
      mocks.probableVote.mockResolvedValue({
        ok: true,
        data: inProbable({ my: { is_participant: true, alive: true, voted_for: ids.lucia } }),
      });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(
        screen.getByRole('button', { name: 'Ronda 3 de 10. Salir de la sala' }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Lucía/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Votar a Lucía' }));
      expect(mocks.probableVote).toHaveBeenCalledWith(ids.room, ids.lucia);
      await waitFor(() => {
        expect(mocks.apply).toHaveBeenCalledTimes(1);
      });
    });

    it('tras votar, el anfitrión puede cerrar con los votos que haya', () => {
      ready(inProbable({ my: { is_participant: true, alive: true, voted_for: ids.fran } }));
      mocks.probableClose.mockResolvedValue({ ok: true, data: inProbable({ phase: 'reveal' }) });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('Tu voto: Fran')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar votación' }));
      expect(mocks.probableClose).toHaveBeenCalledWith(ids.room);
    });

    it('en el recuento el anfitrión pasa a la siguiente ronda', () => {
      ready(
        inProbable({
          phase: 'reveal',
          tally: [{ user_id: ids.lucia, votes: 2, voter_ids: [ids.fran, ids.alvaro] }],
          round_winner_ids: [ids.lucia],
        }),
      );
      mocks.probableNext.mockResolvedValue({ ok: true, data: inProbable() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('heading', { name: 'Lucía' })).toBeInTheDocument();
      expect(screen.getByText('2 votos de Fran y Álvaro')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente ronda' }));
      expect(mocks.probableNext).toHaveBeenCalledWith(ids.room);
    });

    it('quien llega a media ronda espera a la siguiente; el anfitrión sigue llevándola', () => {
      const lateGuest = inProbable(
        { my: { is_participant: false, alive: false, voted_for: null } },
        { me: { user_id: ids.marta, name: 'Marta', is_host: false } },
      );
      ready(lateGuest);
      const { unmount } = render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('heading', { name: 'Llegas tarde, Marta' })).toBeInTheDocument();
      expect(screen.getByText(/desde la siguiente ronda/)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Esperando a la siguiente ronda');
      unmount();
      ready(inProbable({ my: { is_participant: false, alive: false, voted_for: null } }));
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('button', { name: 'Cerrar votación' })).toBeInTheDocument();
    });

    it('al final enseña la clasificación y vuelve a jugar con las mismas rondas', async () => {
      ready(
        inProbable({
          phase: 'finished',
          ranking: [
            { user_id: ids.lucia, name: 'Lucía', score: 3 },
            { user_id: ids.fran, name: 'Fran', score: 1 },
          ],
        }),
      );
      mocks.probableStart.mockResolvedValue({ ok: true, data: inProbable() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('El más probable de la noche')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Lucía' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
      expect(mocks.probableStart).toHaveBeenCalledWith(ids.room, 10);
      await waitFor(() => {
        expect(mocks.apply).toHaveBeenCalledTimes(1);
      });
      expect(mocks.backToLobby).not.toHaveBeenCalled();
    });

    it('si ya no hay gente suficiente, volver a jugar lleva a la sala de espera', async () => {
      ready(inProbable({ phase: 'finished', ranking: [] }));
      mocks.probableStart.mockResolvedValue({ ok: false, error: 'not_enough_players' });
      mocks.backToLobby.mockResolvedValue({ ok: true, data: lobbySnapshot() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
      await waitFor(() => {
        expect(mocks.backToLobby).toHaveBeenCalledWith(ids.room);
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('quien_lo_dijo', () => {
    it('escribe la respuesta y la envía', async () => {
      ready(inQuien());
      mocks.quienLoDijoAnswer.mockResolvedValue({
        ok: true,
        data: inQuien({
          my: {
            is_participant: true,
            alive: true,
            answer: 'Volar',
            is_author: false,
            voted_for: null,
          },
        }),
      });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(
        screen.getByRole('button', { name: 'Ronda 2 de 5. Salir de la sala' }),
      ).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Tu respuesta'), { target: { value: 'Volar' } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
      expect(mocks.quienLoDijoAnswer).toHaveBeenCalledWith(ids.room, 'Volar');
      await waitFor(() => {
        expect(mocks.apply).toHaveBeenCalledTimes(1);
      });
    });

    it('tras responder, el anfitrión ve quién falta y puede cerrar las respuestas', () => {
      ready(
        inQuien({
          my: {
            is_participant: true,
            alive: true,
            answer: 'Volar',
            is_author: false,
            voted_for: null,
          },
        }),
      );
      mocks.quienLoDijoCloseWriting.mockResolvedValue({ ok: true, data: inQuien() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('Tu respuesta: Volar')).toBeInTheDocument();
      expect(screen.getByText('1 de 3')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar respuestas' }));
      expect(mocks.quienLoDijoCloseWriting).toHaveBeenCalledWith(ids.room);
    });

    it('vota a quien cree que lo escribió, sin poder votarse a sí mismo', () => {
      ready(
        inQuien({ phase: 'voting', featured_text: 'Volar', vote_progress: { voted: 0, total: 2 } }),
      );
      mocks.quienLoDijoVote.mockResolvedValue({ ok: true, data: inQuien({ phase: 'voting' }) });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('«Volar»')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^F?Fran/ })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Lucía/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Votar a Lucía' }));
      expect(mocks.quienLoDijoVote).toHaveBeenCalledWith(ids.room, ids.lucia);
    });

    it('el autor ve que es la suya, el contador sin nombres y, si es anfitrión, puede cerrar', () => {
      ready(
        inQuien({
          phase: 'voting',
          featured_text: 'Volar',
          vote_progress: { voted: 1, total: 2 },
          my: {
            is_participant: true,
            alive: true,
            answer: 'Volar',
            is_author: true,
            voted_for: null,
          },
        }),
      );
      mocks.quienLoDijoCloseVoting.mockResolvedValue({
        ok: true,
        data: inQuien({ phase: 'reveal' }),
      });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('Es la tuya')).toBeInTheDocument();
      expect(screen.getByText('1 de 2')).toBeInTheDocument();
      expect(screen.queryByTestId('player-chip')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar votación' }));
      expect(mocks.quienLoDijoCloseVoting).toHaveBeenCalledWith(ids.room);
    });

    it('en la revelación el anfitrión pasa de ronda', () => {
      ready(
        inQuien({
          phase: 'reveal',
          featured_text: 'Volar',
          annulled: false,
          author_id: ids.lucia,
          correct_ids: [ids.fran],
          wrong_ids: [ids.alvaro],
          answers: [{ user_id: ids.lucia, text: 'Volar' }],
        }),
      );
      mocks.quienLoDijoNext.mockResolvedValue({ ok: true, data: inQuien() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('heading', { name: 'Lucía' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente ronda' }));
      expect(mocks.quienLoDijoNext).toHaveBeenCalledWith(ids.room);
    });

    it('al final vuelve a jugar con las mismas rondas', () => {
      ready(
        inQuien({ phase: 'finished', ranking: [{ user_id: ids.lucia, name: 'Lucía', score: 3 }] }),
      );
      mocks.quienLoDijoStart.mockResolvedValue({ ok: true, data: inQuien() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('Gana la partida')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
      expect(mocks.quienLoDijoStart).toHaveBeenCalledWith(ids.room, 5);
    });
  });

  describe('una_pista', () => {
    const asLucia = { me: { user_id: ids.lucia, name: 'Lucía', is_host: false } };

    it('quien da pista la escribe y la envía', async () => {
      ready(inPista());
      mocks.unaPistaClue.mockResolvedValue({
        ok: true,
        data: inPista({ my: { is_participant: true, alive: true, clue: 'frío' } }),
      });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('Pingüino')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Tu pista'), { target: { value: 'frío' } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar pista' }));
      expect(mocks.unaPistaClue).toHaveBeenCalledWith(ids.room, 'frío');
      await waitFor(() => {
        expect(mocks.apply).toHaveBeenCalledTimes(1);
      });
    });

    it('el adivino no ve la palabra y espera a quien arbitra', () => {
      ready(inPista({ word: null, category: null }, asLucia));
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('heading', { name: 'Te toca adivinar' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Fran cerrará las pistas');
    });

    it('el árbitro cierra las pistas tras dar la suya', () => {
      ready(inPista({ my: { is_participant: true, alive: true, clue: 'frío' } }));
      mocks.unaPistaCloseWriting.mockResolvedValue({
        ok: true,
        data: inPista({ phase: 'review' }),
      });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('Tu pista: frío')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar pistas' }));
      expect(mocks.unaPistaCloseWriting).toHaveBeenCalledWith(ids.room);
    });

    it('en la revisión se anula una pista y el árbitro las enseña', async () => {
      ready(
        inPista({
          phase: 'review',
          my: { is_participant: true, alive: true, clue: 'frío' },
          clues: [
            { user_id: ids.fran, text: 'frío', cancelled: false },
            { user_id: ids.alvaro, text: 'fria', cancelled: false },
          ],
        }),
      );
      mocks.unaPistaToggleClue.mockResolvedValue({ ok: true, data: inPista({ phase: 'review' }) });
      mocks.unaPistaShowClues.mockResolvedValue({ ok: true, data: inPista({ phase: 'guessing' }) });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Anular la pista de Álvaro: fria' }));
      expect(mocks.unaPistaToggleClue).toHaveBeenCalledWith(ids.room, ids.alvaro);
      await waitFor(() => {
        expect(mocks.apply).toHaveBeenCalledTimes(1);
      });
      fireEvent.click(screen.getByRole('button', { name: 'Enseñar pistas' }));
      expect(mocks.unaPistaShowClues).toHaveBeenCalledWith(ids.room);
    });

    it('el adivino ve sus pistas y el árbitro marca', () => {
      ready(
        inPista(
          { phase: 'guessing', word: null, category: null, clues: [{ text: 'hielo' }] },
          asLucia,
        ),
      );
      const { unmount } = render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('hielo')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Fran dirá si has acertado');
      unmount();
      ready(
        inPista({
          phase: 'guessing',
          clues: [{ user_id: ids.alvaro, text: 'hielo', cancelled: false }],
        }),
      );
      mocks.unaPistaMark.mockResolvedValue({
        ok: true,
        data: inPista({ phase: 'reveal', result: 'correct' }),
      });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Acertada' }));
      expect(mocks.unaPistaMark).toHaveBeenCalledWith(ids.room, 'correct');
    });

    it('en la revelación el árbitro pasa de ronda', () => {
      ready(inPista({ phase: 'reveal', result: 'wrong', clues: [] }));
      mocks.unaPistaNext.mockResolvedValue({ ok: true, data: inPista() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('Fallada')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente ronda' }));
      expect(mocks.unaPistaNext).toHaveBeenCalledWith(ids.room);
    });

    it('al final el anfitrión vuelve a jugar con las mismas rondas', () => {
      ready(inPista({ phase: 'finished', team_score: 7 }));
      mocks.unaPistaStart.mockResolvedValue({ ok: true, data: inPista() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('heading', { name: '7 de 10' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
      expect(mocks.unaPistaStart).toHaveBeenCalledWith(ids.room, 10);
    });
  });

  describe('que_prefieres', () => {
    it('elige una opción del dilema y aplica la foto', async () => {
      ready(inPrefieres());
      mocks.quePrefieresChoose.mockResolvedValue({
        ok: true,
        data: inPrefieres({ my: { is_participant: true, alive: true, choice: 'b' } }),
      });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(
        screen.getByRole('button', { name: 'Ronda 4 de 10. Salir de la sala' }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Opción B: Ser invisible' }));
      fireEvent.click(screen.getByRole('button', { name: 'Elegir la B' }));
      expect(mocks.quePrefieresChoose).toHaveBeenCalledWith(ids.room, 'b');
      await waitFor(() => {
        expect(mocks.apply).toHaveBeenCalledTimes(1);
      });
    });

    it('tras elegir, ve su elección y el anfitrión puede cerrar con las que haya', () => {
      ready(inPrefieres({ my: { is_participant: true, alive: true, choice: 'a' } }));
      mocks.quePrefieresClose.mockResolvedValue({ ok: true, data: inPrefieres() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('Tu elección: Volar')).toBeInTheDocument();
      expect(screen.getByText('1 de 3')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar elecciones' }));
      expect(mocks.quePrefieresClose).toHaveBeenCalledWith(ids.room);
    });

    it('quien no lleva la sala espera a que cierre el anfitrión', () => {
      ready(
        inPrefieres(
          { my: { is_participant: true, alive: true, choice: 'a' } },
          { me: { user_id: ids.lucia, name: 'Lucía', is_host: false } },
        ),
      );
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('status')).toHaveTextContent('Fran cerrará las elecciones');
      expect(screen.queryByRole('button', { name: 'Cerrar elecciones' })).not.toBeInTheDocument();
    });

    it('en el reparto el anfitrión pasa a la siguiente ronda', () => {
      ready(
        inPrefieres({
          phase: 'reveal',
          choices: { a: [ids.fran, ids.lucia], b: [ids.alvaro] },
          majority: 'a',
        }),
      );
      mocks.quePrefieresNext.mockResolvedValue({ ok: true, data: inPrefieres() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('heading', { name: 'Volar' })).toBeInTheDocument();
      expect(screen.getByText('Fran y Lucía')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente ronda' }));
      expect(mocks.quePrefieresNext).toHaveBeenCalledWith(ids.room);
    });

    it('al final nombra a quien mejor conoce al grupo y vuelve a jugar con las mismas rondas', async () => {
      ready(
        inPrefieres({
          phase: 'finished',
          ranking: [
            { user_id: ids.lucia, name: 'Lucía', score: 4 },
            { user_id: ids.fran, name: 'Fran', score: 2 },
          ],
        }),
      );
      mocks.quePrefieresStart.mockResolvedValue({ ok: true, data: inPrefieres() });
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByText('Quien mejor conoce al grupo')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Lucía' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
      expect(mocks.quePrefieresStart).toHaveBeenCalledWith(ids.room, 10);
      await waitFor(() => {
        expect(mocks.apply).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('entrar tarde según el juego', () => {
    const marta = { me: { user_id: ids.marta, name: 'Marta', is_host: false } };

    it('en El impostor se juega en la siguiente partida', () => {
      ready(
        inGame(
          { my: { is_participant: false, alive: false, role: null, word: null, voted_for: null } },
          marta,
        ),
      );
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('heading', { name: 'Llegas tarde, Marta' })).toBeInTheDocument();
      expect(screen.getByText(/Juegas en la siguiente partida/)).toBeInTheDocument();
    });

    it.each([
      [
        'probable',
        inProbable({ my: { is_participant: false, alive: false, voted_for: null } }, marta),
      ],
      [
        'quien_lo_dijo',
        inQuien(
          {
            my: {
              is_participant: false,
              alive: false,
              answer: null,
              is_author: false,
              voted_for: null,
            },
          },
          marta,
        ),
      ],
      ['una_pista', inPista({ my: { is_participant: false, alive: false, clue: null } }, marta)],
      [
        'que_prefieres',
        inPrefieres({ my: { is_participant: false, alive: false, choice: null } }, marta),
      ],
    ])('en %s se juega desde la siguiente ronda', (_game, snapshot) => {
      ready(snapshot);
      render(<Room initial={lobbySnapshot()} fresh={false} />);
      expect(screen.getByRole('heading', { name: 'Llegas tarde, Marta' })).toBeInTheDocument();
      expect(screen.getByText(/Juegas desde la siguiente ronda/)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Esperando a la siguiente ronda');
    });
  });
});

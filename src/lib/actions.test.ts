import { afterEach, describe, expect, it, vi } from 'vitest';
import { lobbySnapshot } from '@/test/fixtures';
import {
  backToLobby,
  castVote,
  closeVoting,
  continueGame,
  createRoom,
  getRoomState,
  joinRoom,
  kickPlayer,
  leaveRoom,
  openVoting,
  probableClose,
  probableNext,
  probableStart,
  probableVote,
  quePrefieresChoose,
  quePrefieresClose,
  quePrefieresNext,
  quePrefieresStart,
  quienLoDijoAnswer,
  quienLoDijoCloseVoting,
  quienLoDijoCloseWriting,
  quienLoDijoNext,
  quienLoDijoStart,
  quienLoDijoVote,
  unaPistaClue,
  unaPistaCloseWriting,
  unaPistaMark,
  unaPistaNext,
  unaPistaShowClues,
  unaPistaStart,
  unaPistaToggleClue,
  setGame,
  startGame,
  toActionError,
  type ActionDeps,
} from './actions';

function deps(response: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn<ActionDeps['rpc']>(() => Promise.resolve(response));
  const ensureSession = vi.fn(() => Promise.resolve('u1'));
  return { rpc, ensureSession };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('acciones', () => {
  it('cada acción llama a su RPC con los argumentos de la base de datos', async () => {
    const d = deps({ data: lobbySnapshot(), error: null });
    await createRoom('Fran', d);
    await joinRoom('KTRM', 'Lucía', d);
    await getRoomState('sala', d);
    await setGame('sala', 'impostor', d);
    await kickPlayer('sala', 'u2', d);
    await startGame('sala', 2, d);
    await probableStart('sala', 10, d);
    await probableVote('sala', 'u2', d);
    await probableClose('sala', d);
    await probableNext('sala', d);
    await quienLoDijoStart('sala', 5, d);
    await quienLoDijoAnswer('sala', 'Volar', d);
    await quienLoDijoCloseWriting('sala', d);
    await quienLoDijoVote('sala', 'u3', d);
    await quienLoDijoCloseVoting('sala', d);
    await quienLoDijoNext('sala', d);
    await unaPistaStart('sala', 15, d);
    await unaPistaClue('sala', 'frío', d);
    await unaPistaCloseWriting('sala', d);
    await unaPistaToggleClue('sala', 'u2', d);
    await unaPistaShowClues('sala', d);
    await unaPistaMark('sala', 'pass', d);
    await unaPistaNext('sala', d);
    await quePrefieresStart('sala', 5, d);
    await quePrefieresChoose('sala', 'b', d);
    await quePrefieresClose('sala', d);
    await quePrefieresNext('sala', d);
    await openVoting('sala', d);
    await castVote('sala', 'u3', d);
    await closeVoting('sala', d);
    await continueGame('sala', d);
    await backToLobby('sala', d);
    expect(d.rpc.mock.calls).toEqual([
      ['create_room', { name: 'Fran' }],
      ['join_room', { code: 'KTRM', name: 'Lucía' }],
      ['get_room_state', { room_id: 'sala' }],
      ['set_game', { room_id: 'sala', game: 'impostor' }],
      ['kick_player', { room_id: 'sala', user_id: 'u2' }],
      ['start_game', { room_id: 'sala', impostor_count: 2 }],
      ['probable_start', { room_id: 'sala', rounds: 10 }],
      ['probable_vote', { room_id: 'sala', target_id: 'u2' }],
      ['probable_close', { room_id: 'sala' }],
      ['probable_next', { room_id: 'sala' }],
      ['quien_lo_dijo_start', { room_id: 'sala', rounds: 5 }],
      ['quien_lo_dijo_answer', { room_id: 'sala', text: 'Volar' }],
      ['quien_lo_dijo_close_writing', { room_id: 'sala' }],
      ['quien_lo_dijo_vote', { room_id: 'sala', target_id: 'u3' }],
      ['quien_lo_dijo_close_voting', { room_id: 'sala' }],
      ['quien_lo_dijo_next', { room_id: 'sala' }],
      ['una_pista_start', { room_id: 'sala', rounds: 15 }],
      ['una_pista_clue', { room_id: 'sala', text: 'frío' }],
      ['una_pista_close_writing', { room_id: 'sala' }],
      ['una_pista_toggle_clue', { room_id: 'sala', user_id: 'u2' }],
      ['una_pista_show_clues', { room_id: 'sala' }],
      ['una_pista_mark', { room_id: 'sala', result: 'pass' }],
      ['una_pista_next', { room_id: 'sala' }],
      ['que_prefieres_start', { room_id: 'sala', rounds: 5 }],
      ['que_prefieres_choose', { room_id: 'sala', option: 'b' }],
      ['que_prefieres_close', { room_id: 'sala' }],
      ['que_prefieres_next', { room_id: 'sala' }],
      ['open_voting', { room_id: 'sala' }],
      ['cast_vote', { room_id: 'sala', target_id: 'u3' }],
      ['close_voting', { room_id: 'sala' }],
      ['continue_game', { room_id: 'sala' }],
      ['back_to_lobby', { room_id: 'sala' }],
    ]);
  });

  it('inicia sesión antes de llamar', async () => {
    const d = deps({ data: lobbySnapshot(), error: null });
    await createRoom('Fran', d);
    expect(d.ensureSession).toHaveBeenCalledTimes(1);
  });

  it('devuelve la foto validada', async () => {
    const snapshot = lobbySnapshot();
    await expect(getRoomState('sala', deps({ data: snapshot, error: null }))).resolves.toEqual({
      ok: true,
      data: snapshot,
    });
  });

  it('una foto que no cumple el contrato es un error inesperado', async () => {
    await expect(getRoomState('sala', deps({ data: { room: 'x' }, error: null }))).resolves.toEqual(
      {
        ok: false,
        error: 'unknown',
      },
    );
  });

  it('traduce el código de error de la base de datos', async () => {
    await expect(
      joinRoom('KTRM', 'Fran', deps({ data: null, error: { message: 'name_taken' } })),
    ).resolves.toEqual({ ok: false, error: 'name_taken' });
  });

  it('salir de la sala no devuelve foto', async () => {
    const d = deps({ data: null, error: null });
    await expect(leaveRoom('sala', d)).resolves.toEqual({ ok: true, data: null });
    expect(d.rpc).toHaveBeenCalledWith('leave_room', { room_id: 'sala' });
  });

  it('si fetch lanza, es falta de conexión', async () => {
    const d = deps({ data: null, error: null });
    d.rpc.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(getRoomState('sala', d)).resolves.toEqual({ ok: false, error: 'offline' });
  });

  it('si no se puede iniciar sesión, lo dice', async () => {
    const d = deps({ data: null, error: null });
    d.ensureSession.mockImplementation(() => Promise.reject(new Error('not_authenticated')));
    await expect(createRoom('Fran', d)).resolves.toEqual({ ok: false, error: 'not_authenticated' });
    expect(d.rpc).not.toHaveBeenCalled();
  });
});

describe('toActionError', () => {
  it('conserva los códigos conocidos', () => {
    expect(toActionError('room_full')).toBe('room_full');
  });

  it('un error técnico desconocido es inesperado', () => {
    expect(toActionError('JWT expired')).toBe('unknown');
  });

  it('sin red siempre es falta de conexión', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(toActionError('JWT expired')).toBe('offline');
  });
});

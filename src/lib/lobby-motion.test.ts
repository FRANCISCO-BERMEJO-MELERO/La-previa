import { describe, expect, it } from 'vitest';
import { ids, inGame, lobbySnapshot } from '@/test/fixtures';
import { joinedPlayers } from './lobby-motion';
import { transitionOf } from './motion';

const base = lobbySnapshot();
const [fran, lucia, alvaro] = base.players;
const before = lobbySnapshot({ players: [fran, lucia].filter((p) => p !== undefined) });

describe('joinedPlayers', () => {
  it('quien entra en la sala de espera cae', () => {
    expect(joinedPlayers(transitionOf(before, base, false))).toEqual([ids.alvaro]);
  });

  it('quien se va no se anima', () => {
    expect(joinedPlayers(transitionOf(base, before, false))).toEqual([]);
  });

  it('nada en la primera foto ni con movimiento reducido', () => {
    expect(joinedPlayers(transitionOf(null, base, false))).toEqual([]);
    expect(joinedPlayers(transitionOf(before, base, true))).toEqual([]);
  });

  it('solo en la sala de espera, no al entrar tarde a una partida', () => {
    const playing = inGame({}, { players: [fran, lucia, alvaro].filter((p) => p !== undefined) });
    const earlier = inGame({}, { players: before.players });
    expect(joinedPlayers(transitionOf(earlier, playing, false))).toEqual([]);
  });
});

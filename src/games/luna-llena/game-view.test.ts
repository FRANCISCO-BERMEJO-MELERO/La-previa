import { describe, expect, it } from 'vitest';
import { inLuna, lunaIds, lunaMy, lunaState } from '@/test/fixtures';
import {
  lunaPlayers,
  nameOf,
  nightCandidates,
  nightMode,
  packMarks,
  pendingCount,
} from './game-view';

const ids = lunaIds;

function setup(game: Parameters<typeof lunaState>[0] = {}) {
  const snapshot = inLuna(game);
  if (snapshot.game?.type !== 'luna_llena') throw new Error('sin partida de Luna llena');
  return { snapshot, game: snapshot.game, players: lunaPlayers(snapshot, snapshot.game) };
}

const namesIn = (players: { name: string }[]) => players.map((player) => player.name);

describe('lunaPlayers', () => {
  it('toma el avatar y la conexión de la sala, y el orden de llegada', () => {
    const { players } = setup();
    expect(players.map((player) => player.joinIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(players[0]).toMatchObject({ name: 'Fran', connected: true, alive: true, role: null });
  });

  it('quien ya no está en la sala conserva su sitio', () => {
    const snapshot = inLuna();
    const game = lunaState();
    const players = lunaPlayers({ ...snapshot, players: snapshot.players.slice(0, 2) }, game);
    expect(players[5]).toMatchObject({ name: 'Paula', joinIndex: 5, connected: false });
  });

  it('cuenta quién falta por actuar entre los vivos', () => {
    const { participants } = lunaState();
    const { players } = setup({
      participants: participants.map((participant, index) => ({
        ...participant,
        has_acted: index < 2,
        alive: index !== 5,
      })),
    });
    expect(pendingCount(players)).toBe(3);
    expect(nameOf(players, ids.marta)).toBe('Marta');
    expect(nameOf(players, null)).toBe('');
  });
});

describe('la noche según el rol', () => {
  const { participants } = lunaState();
  const withDead = participants.map((participant) =>
    participant.user_id === ids.paula ? { ...participant, alive: false } : participant,
  );

  it('un lobo elige entre los vivos que no son de la manada', () => {
    const { game, players } = setup({
      participants: withDead,
      my: lunaMy({ role: 'wolf', fellow_wolves: [ids.lucia] }),
    });
    expect(nightMode(game)).toBe('wolf');
    expect(namesIn(nightCandidates(game, players, ids.fran))).toEqual(['Álvaro', 'Marta', 'Dani']);
  });

  it('la vidente y quien sospecha eligen a otro vivo', () => {
    for (const role of ['seer', 'villager', 'hunter', 'jester'] as const) {
      const { game, players } = setup({ participants: withDead, my: lunaMy({ role }) });
      expect(namesIn(nightCandidates(game, players, ids.fran))).toEqual([
        'Lucía',
        'Álvaro',
        'Marta',
        'Dani',
      ]);
    }
  });

  it('el protector puede protegerse, pero no repetir la noche anterior', () => {
    const { game, players } = setup({
      my: lunaMy({ role: 'protector', last_protected_id: ids.marta }),
    });
    expect(namesIn(nightCandidates(game, players, ids.fran))).toEqual([
      'Fran',
      'Lucía',
      'Álvaro',
      'Dani',
      'Paula',
    ]);
  });

  it('Cupido enlaza la primera noche, puede elegirse, y después sospecha', () => {
    const first = setup({ my: lunaMy({ role: 'cupid' }) });
    expect(nightMode(first.game)).toBe('cupid');
    expect(nightCandidates(first.game, first.players, ids.fran)).toHaveLength(6);
    const later = setup({ night: 2, my: lunaMy({ role: 'cupid' }) });
    expect(nightMode(later.game)).toBe('suspect');
    expect(nightCandidates(later.game, later.players, ids.fran)).toHaveLength(5);
  });

  it('un lobo ve a quién marca cada lobo de su manada', () => {
    const { game, players } = setup({
      my: lunaMy({
        role: 'wolf',
        fellow_wolves: [ids.lucia],
        wolf_marks: [
          { user_id: ids.fran, target_id: ids.marta },
          { user_id: ids.lucia, target_id: ids.marta },
        ],
      }),
    });
    expect(packMarks(game, players).get(ids.marta)).toEqual(['Fran', 'Lucía']);
  });
});

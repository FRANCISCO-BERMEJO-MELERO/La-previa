import { describe, expect, it } from 'vitest';
import { copy } from '@/lib/copy';
import { inLuna, lunaIds, lunaMy, lunaState } from '@/test/fixtures';
import {
  actionLines,
  lunaPlayers,
  nameOf,
  nightCandidates,
  nightMode,
  packMarks,
  pendingCount,
  realDeaths,
  witchReportLines,
  wolfVictimLine,
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

  it('el asesino elige a cualquier vivo menos a sí mismo', () => {
    const { game, players } = setup({ my: lunaMy({ role: 'killer' }) });
    expect(nightMode(game)).toBe('killer');
    expect(namesIn(nightCandidates(game, players, ids.fran))).not.toContain('Fran');
    expect(nightCandidates(game, players, ids.fran)).toHaveLength(5);
  });

  it('la bruja usa pociones mientras le quede alguna, y envenena a otro', () => {
    const both = setup({ my: lunaMy({ role: 'witch', potions: { life: true, poison: true } }) });
    expect(nightMode(both.game)).toBe('witch');
    expect(namesIn(nightCandidates(both.game, both.players, ids.fran))).not.toContain('Fran');
    const lifeOnly = setup({
      my: lunaMy({ role: 'witch', potions: { life: true, poison: false } }),
    });
    expect(nightMode(lifeOnly.game)).toBe('witch');
    expect(nightCandidates(lifeOnly.game, lifeOnly.players, ids.fran)).toEqual([]);
    const none = setup({ my: lunaMy({ role: 'witch', potions: { life: false, poison: false } }) });
    expect(nightMode(none.game)).toBe('suspect');
    expect(nightCandidates(none.game, none.players, ids.fran)).toHaveLength(5);
  });

  it('la bruja ve a quién van a devorar solo mientras tiene la poción de vida', () => {
    const marked = setup({
      my: lunaMy({ role: 'witch', potions: { life: true, poison: true }, wolf_victim: ids.marta }),
    });
    expect(wolfVictimLine(marked.game, marked.players)).toBe(
      copy.lunaLlena.night.witch.victim('Marta'),
    );
    const undecided = setup({
      my: lunaMy({ role: 'witch', potions: { life: true, poison: true } }),
    });
    expect(wolfVictimLine(undecided.game, undecided.players)).toBe(
      copy.lunaLlena.night.witch.undecided,
    );
    const spent = setup({ my: lunaMy({ role: 'witch', potions: { life: false, poison: true } }) });
    expect(wolfVictimLine(spent.game, spent.players)).toBeNull();
  });
});

describe('la bruja y los muertos', () => {
  it('el aviso de la bruja dice qué han hecho sus pociones y cuáles quedan', () => {
    const { game, players } = setup({
      phase: 'dawn',
      my: lunaMy({
        role: 'witch',
        potions: { life: false, poison: false },
        witch_report: { saved_id: ids.marta, poisoned_id: ids.dani },
      }),
    });
    expect(witchReportLines(game, players)).toEqual([
      copy.lunaLlena.dawn.witchSaved('Marta'),
      copy.lunaLlena.dawn.witchPoisoned('Dani'),
      copy.lunaLlena.dawn.potionsLeft(false, false),
    ]);
    const quiet = setup({ phase: 'dawn', my: lunaMy({ role: 'witch' }) });
    expect(witchReportLines(quiet.game, quiet.players)).toEqual([]);
  });

  it('los muertos leen cada acción de la bruja', () => {
    const { players } = setup();
    expect(
      actionLines(players, [
        { user_id: ids.marta, target_id: ids.dani, target2_id: null, use_life: true },
        { user_id: ids.marta, target_id: null, target2_id: null, use_life: false },
        { user_id: ids.lucia, target_id: ids.dani, target2_id: null },
      ]),
    ).toEqual([
      copy.lunaLlena.spectator.witch('Marta', true, 'Dani'),
      copy.lunaLlena.spectator.witch('Marta', false, null),
      copy.lunaLlena.spectator.action('Lucía', 'Dani'),
    ]);
  });

  it('los muertos ven la causa real de cada muerte; los vivos, solo la pública', () => {
    const announcement = {
      kind: 'night' as const,
      deaths: [
        { user_id: ids.marta, name: 'Marta', role: 'seer' as const, cause: 'night' as const },
      ],
      spared: null,
    };
    const alive = setup({ phase: 'dawn', announcement });
    expect(realDeaths(alive.game).map((death) => death.cause)).toEqual(['night']);
    const dead = setup({
      phase: 'dawn',
      announcement,
      my: lunaMy({ alive: false }),
      spectator: {
        roles: [],
        lovers: null,
        actions: [],
        causes: [{ user_id: ids.marta, cause: 'killer' }],
        potions: null,
      },
    });
    expect(realDeaths(dead.game).map((death) => death.cause)).toEqual(['killer']);
  });
});

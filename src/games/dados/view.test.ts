import { describe, expect, it } from 'vitest';
import { ids, dadosState, dadosTeamsState, inDados } from '@/test/fixtures';
import { parseSnapshot } from '@/lib/snapshot';
import {
  boardSides,
  dieTone,
  resultSummary,
  resultTitle,
  sideLabel,
  sideRegions,
  turnName,
  turnSteps,
} from './game-view';
import { viewFor } from './view';

describe('foto de A dados', () => {
  it('acepta la variante', () => {
    expect(parseSnapshot(inDados())?.game?.type).toBe('dados');
  });

  it('rechaza un dado que no existe o una columna con cuatro', () => {
    expect(parseSnapshot(inDados({ pending_die: 7 }))).toBeNull();
    const [a, b] = dadosState().sides;
    expect(
      parseSnapshot(inDados({ sides: [{ ...a, board: [[1, 2, 3, 4], [], []] }, b] })),
    ).toBeNull();
  });

  it('rechaza los bandos cambiados de sitio', () => {
    const [a, b] = dadosState().sides;
    const raw: unknown = { ...inDados(), game: { ...dadosState(), sides: [b, a] } };
    expect(parseSnapshot(raw)).toBeNull();
  });
});

describe('viewFor', () => {
  it('jugador con el turno', () => {
    expect(viewFor(dadosState())).toBe('my_turn');
  });

  it('jugador esperando', () => {
    expect(viewFor(dadosTeamsState())).toBe('waiting');
  });

  it('espectador', () => {
    expect(viewFor(dadosState({ my: { side: null, is_spectator: true, is_my_turn: false } }))).toBe(
      'spectator',
    );
  });

  it('resultado, también para quien mira', () => {
    const result = { winner: 'A', reason: 'board_full', left: null } as const;
    expect(viewFor(dadosState({ phase: 'finished', turn: null, result }))).toBe('result');
    expect(
      viewFor(
        dadosState({
          phase: 'finished',
          result,
          my: { side: null, is_spectator: true, is_my_turn: false },
        }),
      ),
    ).toBe('result');
  });
});

describe('dieTone', () => {
  it('blanco solo, azul en pareja y verde en trío', () => {
    expect(dieTone([5, 4], 5)).toBe('single');
    expect(dieTone([5, 4, 5], 5)).toBe('pair');
    expect(dieTone([5, 5, 5], 5)).toBe('trio');
  });
});

describe('tableros', () => {
  it('el bando propio va abajo; quien juega en B ve a A arriba', () => {
    expect(boardSides(dadosState()).bottom.side).toBe('A');
    const asB = dadosState({ my: { side: 'B', is_spectator: false, is_my_turn: false } });
    expect(boardSides(asB).bottom.side).toBe('B');
    expect(boardSides(asB).top.side).toBe('A');
  });

  it('rótulos: "Tú" y el rival en 1 contra 1; "Tu equipo" y "Equipo B" en 2 contra 2', () => {
    const solo = dadosState();
    expect(sideLabel(solo, solo.sides[0])).toBe('Tú');
    expect(sideLabel(solo, solo.sides[1])).toBe('Lucía');
    const teams = dadosTeamsState();
    expect(sideLabel(teams, teams.sides[0])).toBe('Tu equipo');
    expect(sideLabel(teams, teams.sides[1])).toBe('Equipo B');
  });

  it('cada tablero tiene su nombre accesible', () => {
    const teams = dadosTeamsState();
    expect(sideRegions(teams, teams.sides[0]).board).toBe('Tablero de tu equipo');
    expect(sideRegions(teams, teams.sides[1]).board).toBe('Tablero del equipo B');
    const solo = dadosState();
    expect(sideRegions(solo, solo.sides[0]).scores).toBe('Tus puntos por columna');
    expect(sideRegions(solo, solo.sides[1]).board).toBe('Tablero de Lucía');
  });

  it('quien mira ve los nombres de cada bando y ningún "Tú"', () => {
    const teams = dadosTeamsState({ my: { side: null, is_spectator: true, is_my_turn: false } });
    expect(sideLabel(teams, teams.sides[0])).toBe('Fran y Marta');
    expect(sideLabel(teams, teams.sides[1])).toBe('Lucía y Álvaro');
  });

  it('dice a quién le toca y en qué orden van los turnos', () => {
    const teams = dadosTeamsState();
    expect(turnName(teams)).toBe('Marta');
    expect(turnSteps(teams).map((step) => [step.name, step.current])).toEqual([
      ['Fran', false],
      ['Lucía', false],
      ['Marta', true],
      ['Álvaro', false],
    ]);
  });
});

describe('resultado', () => {
  const finished = (
    winner: 'A' | 'B' | null,
    reason: 'board_full' | 'forfeit' = 'board_full',
    left: { user_id: string; name: string } | null = null,
  ) => ({
    phase: 'finished' as const,
    turn: null,
    pending_die: null,
    result: { winner, reason, left },
  });

  it('1 contra 1: has ganado o has perdido, con el marcador', () => {
    expect(resultTitle(dadosState(finished('A')))).toBe('Has ganado');
    expect(resultTitle(dadosState(finished('B')))).toBe('Has perdido');
    expect(resultSummary(dadosState(finished('A')))).toBe('Fran se lleva la mesa: 31 a 26.');
  });

  it('2 contra 2: habéis ganado o habéis perdido', () => {
    expect(resultTitle(dadosTeamsState(finished('A')))).toBe('Habéis ganado');
    expect(resultTitle(dadosTeamsState(finished('B')))).toBe('Habéis perdido');
    expect(resultSummary(dadosTeamsState(finished('A')))).toBe(
      'Fran y Marta se llevan la mesa: 43 a 13.',
    );
  });

  it('empate para todos', () => {
    expect(resultTitle(dadosState(finished(null)))).toBe('Empate');
    expect(
      resultTitle(
        dadosState({
          ...finished(null),
          my: { side: null, is_spectator: true, is_my_turn: false },
        }),
      ),
    ).toBe('Empate');
  });

  it('quien mira lee quién gana', () => {
    const spectator = { my: { side: null, is_spectator: true, is_my_turn: false } } as const;
    expect(resultTitle(dadosState({ ...finished('B'), ...spectator }))).toBe('Gana Lucía');
    expect(resultTitle(dadosTeamsState({ ...finished('A'), ...spectator }))).toBe(
      'Gana el equipo A',
    );
  });

  it('por abandono dice quién se fue', () => {
    const left = { user_id: ids.lucia, name: 'Lucía' };
    expect(resultSummary(dadosState(finished('A', 'forfeit', left)))).toBe(
      'Lucía se ha ido. Gana Fran por abandono.',
    );
    expect(resultSummary(dadosTeamsState(finished('A', 'forfeit', left)))).toBe(
      'Lucía se ha ido. Gana el equipo A por abandono.',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { ids, lobbySnapshot } from '@/test/fixtures';
import { choicesFor, teamsFrom, teamsReady } from './teams';

const extra = (user_id: string, name: string) => ({
  user_id,
  name,
  avatar: null,
  connected: true,
  joined_at: '2026-10-08T19:05:00+00:00',
});

// Fran, Lucía, Álvaro, Marta y Dani, por orden de entrada.
const players = [
  ...lobbySnapshot().players,
  extra(ids.marta, 'Marta'),
  extra('0a1b2c3d-1111-4aaa-8bbb-000000000005', 'Dani'),
];

describe('equipos de A dados', () => {
  it('por defecto juegan los primeros por orden de entrada, alternando A y B', () => {
    expect(choicesFor(players, '1v1', {})).toEqual(['A', 'B', 'watch', 'watch', 'watch']);
    expect(choicesFor(players, '2v2', {})).toEqual(['A', 'B', 'A', 'B', 'watch']);
  });

  it('lo que cambia el anfitrión manda sobre el reparto por defecto', () => {
    expect(choicesFor(players, '1v1', { [ids.fran]: 'watch', [ids.marta]: 'A' })).toEqual([
      'watch',
      'B',
      'watch',
      'A',
      'watch',
    ]);
  });

  it('cuadran con una persona por equipo en 1 contra 1 y dos en 2 contra 2', () => {
    const solo = teamsFrom(players, choicesFor(players, '1v1', {}));
    expect(solo).toEqual({ A: [ids.fran], B: [ids.lucia] });
    expect(teamsReady('1v1', solo)).toBe(true);
    expect(teamsReady('2v2', solo)).toBe(false);
    expect(teamsReady('2v2', teamsFrom(players, choicesFor(players, '2v2', {})))).toBe(true);
  });

  it('no cuadran si sobra o falta alguien', () => {
    const extra = teamsFrom(players, choicesFor(players, '1v1', { [ids.alvaro]: 'A' }));
    expect(teamsReady('1v1', extra)).toBe(false);
    const short = teamsFrom(players, choicesFor(players, '2v2', { [ids.marta]: 'watch' }));
    expect(teamsReady('2v2', short)).toBe(false);
  });

  it('con menos gente de la que pide la modalidad, no cuadran', () => {
    const two = players.slice(0, 2);
    expect(teamsReady('2v2', teamsFrom(two, choicesFor(two, '2v2', {})))).toBe(false);
  });
});

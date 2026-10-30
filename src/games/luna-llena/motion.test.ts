import { describe, expect, it } from 'vitest';
import { sequenceDelays, transitionOf } from '@/lib/motion';
import type { LunaLlenaGameState, Snapshot } from '@/lib/snapshot';
import { inLuna, lunaIds, lunaMy, lunaState } from '@/test/fixtures';
import { closedVote, curtainOf, fallenIds, has, lunaMotion } from './motion';
import { lunaRoles, type LunaRole } from './roles';

type Game = Partial<LunaLlenaGameState>;

/** Lo que solo sabe quien mira, según su rol: rol, compañeros, vidente, pociones, enamorado… */
function privateFor(role: LunaRole): LunaLlenaGameState['my'] {
  return lunaMy({
    role,
    fellow_wolves: role === 'wolf' ? [lunaIds.dani] : [],
    wolf_marks: role === 'wolf' ? [{ user_id: lunaIds.dani, target_id: lunaIds.paula }] : [],
    seer_results: role === 'seer' ? [{ night: 1, user_id: lunaIds.marta, is_wolf: false }] : [],
    lover_id: role === 'cupid' ? null : lunaIds.paula,
    chosen_lovers: role === 'cupid' ? [lunaIds.marta, lunaIds.paula] : null,
    last_protected_id: role === 'protector' ? lunaIds.lucia : null,
    potions: role === 'witch' ? { life: true, poison: false } : null,
    wolf_victim: role === 'witch' ? lunaIds.paula : null,
    witch_report: role === 'witch' ? { saved_id: null, poisoned_id: lunaIds.alvaro } : null,
    action: { target_id: lunaIds.marta, target2_id: null },
  });
}

function seenBy(role: LunaRole, game: Game): Snapshot {
  return inLuna({ ...game, my: privateFor(role) });
}

function motion(previous: Snapshot, next: Snapshot) {
  return lunaMotion(transitionOf(previous, next, false));
}

const death = (user_id: string, name: string, cause: 'night' | 'hanged' | 'hunter' = 'night') => ({
  user_id,
  name,
  role: 'villager' as const,
  cause,
});

const nightAnnouncement = (deaths: ReturnType<typeof death>[]) =>
  ({ kind: 'night', deaths, spared: null }) as const;

describe('lunaMotion', () => {
  it('al anochecer baja el telón', () => {
    const roles = inLuna({ phase: 'roles', night: 0 });
    const night = inLuna({ phase: 'night', night: 1 });
    expect(curtainOf(motion(roles, night))).toBe('down');
  });

  it('al amanecer sube el telón y caen los muertos en orden', () => {
    const night = inLuna({ phase: 'night', night: 1 });
    const dawn = inLuna({
      phase: 'dawn',
      night: 1,
      announcement: nightAnnouncement([death(lunaIds.marta, 'Marta'), death(lunaIds.dani, 'Dani')]),
    });
    const events = motion(night, dawn);
    expect(curtainOf(events)).toBe('up');
    expect(fallenIds(events)).toEqual([lunaIds.marta, lunaIds.dani]);
    expect(has(events, 'quiet')).toBe(false);
  });

  it('un amanecer sin muertos da una sola fila tranquila', () => {
    const night = inLuna({ phase: 'night', night: 1 });
    const dawn = inLuna({ phase: 'dawn', night: 1, announcement: nightAnnouncement([]) });
    const events = motion(night, dawn);
    expect(has(events, 'quiet')).toBe(true);
    expect(fallenIds(events)).toEqual([]);
  });

  it('el disparo del cazador hace caer solo a su víctima', () => {
    const before = nightAnnouncement([death(lunaIds.marta, 'Marta')]);
    const hunter = inLuna({ phase: 'hunter', night: 1, announcement: before });
    const dawn = inLuna({
      phase: 'dawn',
      night: 1,
      announcement: nightAnnouncement([
        death(lunaIds.marta, 'Marta'),
        death(lunaIds.dani, 'Dani', 'hunter'),
      ]),
    });
    expect(fallenIds(motion(hunter, dawn))).toEqual([lunaIds.dani]);
  });

  it('al cerrar las votaciones caen los votos', () => {
    const mayor = inLuna({ phase: 'mayor', night: 1, day: 1 });
    const day = inLuna({ phase: 'day', night: 1, day: 1 });
    const voting = inLuna({ phase: 'voting', night: 1, day: 1 });
    const defense = inLuna({ phase: 'defense', night: 1, day: 1 });
    expect(closedVote(motion(mayor, day))).toBe('mayor');
    expect(closedVote(motion(voting, defense))).toBe('accuse');
  });

  it('el veredicto planta el sello y hace caer al ahorcado', () => {
    const defense = inLuna({ phase: 'defense', night: 1, day: 1 });
    const execution = inLuna({
      phase: 'execution',
      night: 1,
      day: 1,
      announcement: {
        kind: 'trial',
        deaths: [death(lunaIds.dani, 'Dani', 'hanged')],
        spared: null,
      },
    });
    const events = motion(defense, execution);
    expect(has(events, 'verdict')).toBe(true);
    expect(fallenIds(events)).toEqual([lunaIds.dani]);
  });

  it('el final da el resultado', () => {
    const execution = inLuna({ phase: 'execution', night: 1, day: 1 });
    expect(has(motion(execution, inLuna({ phase: 'finished', night: 1, day: 1 })), 'result')).toBe(
      true,
    );
  });

  it('nada en la primera foto, con movimiento reducido ni si se salta una fase', () => {
    const night = inLuna({ phase: 'night', night: 1 });
    const dawn = inLuna({ phase: 'dawn', night: 1, announcement: nightAnnouncement([]) });
    expect(lunaMotion(transitionOf(null, dawn, false))).toEqual([]);
    expect(lunaMotion(transitionOf(night, dawn, true))).toEqual([]);
    expect(motion(night, inLuna({ phase: 'day', night: 1, day: 1 }))).toEqual([]);
  });

  it('una secuencia de dieciséis muertes cabe en 1,6 s', () => {
    expect(Math.max(...sequenceDelays(16, 240, 420)) + 240).toBeLessThanOrEqual(1600);
  });
});

describe('lunaMotion: privacidad', () => {
  const transitions: [string, Game, Game][] = [
    ['reparto → noche', { phase: 'roles', night: 0 }, { phase: 'night', night: 1 }],
    [
      'noche: alguien actúa',
      { phase: 'night', night: 1 },
      {
        phase: 'night',
        night: 1,
        participants: lunaState().participants.map((p, index) => ({ ...p, has_acted: index < 2 })),
      },
    ],
    [
      'noche → amanecer',
      { phase: 'night', night: 1 },
      {
        phase: 'dawn',
        night: 1,
        announcement: nightAnnouncement([death(lunaIds.marta, 'Marta')]),
      },
    ],
  ];

  it('sala → reparto: todos los roles reciben los mismos eventos', () => {
    const lobby = inLuna({}, { game: null });
    const reference = motion(lobby, seenBy('villager', { phase: 'roles', night: 0 }));
    for (const role of lunaRoles) {
      expect(motion(lobby, seenBy(role, { phase: 'roles', night: 0 }))).toEqual(reference);
    }
  });

  it.each(transitions)('%s: todos los roles reciben los mismos eventos', (_, before, after) => {
    const reference = motion(seenBy('villager', before), seenBy('villager', after));
    for (const role of lunaRoles) {
      expect(motion(seenBy(role, before), seenBy(role, after))).toEqual(reference);
    }
  });

  it('pulsar un objetivo de noche no produce eventos, sea cual sea el rol', () => {
    for (const role of lunaRoles) {
      const before = seenBy(role, { phase: 'night', night: 1 });
      const acted = inLuna({
        phase: 'night',
        night: 1,
        my: { ...privateFor(role), action: { target_id: lunaIds.lucia, target2_id: null } },
      });
      expect(motion(before, acted)).toEqual([]);
    }
  });

  it('los avisos privados del amanecer no generan eventos', () => {
    const dawn = inLuna({ phase: 'dawn', night: 1, announcement: nightAnnouncement([]) });
    const withSecrets = seenBy('witch', {
      phase: 'dawn',
      night: 1,
      announcement: nightAnnouncement([]),
    });
    expect(motion(dawn, withSecrets)).toEqual([]);
  });

  it('el amanecer da los mismos eventos sea cual sea la causa de cada muerte', () => {
    const night = inLuna({ phase: 'night', night: 1 });
    const causes = ['night', 'heartbreak', 'hunter', 'left'] as const;
    const events = causes.map((cause) =>
      motion(
        night,
        inLuna({
          phase: 'dawn',
          night: 1,
          announcement: {
            kind: 'night',
            spared: null,
            deaths: [{ user_id: lunaIds.marta, name: 'Marta', role: 'seer', cause }],
          },
        }),
      ),
    );
    for (const each of events) expect(each).toEqual(events[0]);
  });
});

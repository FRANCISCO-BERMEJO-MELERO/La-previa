import { describe, expect, it } from 'vitest';
import { copy } from '@/lib/copy';
import { lunaNarrationKeys } from '@/lib/snapshot';
import { narrationLines } from './narration';

const { script } = copy.lunaLlena;

describe('narrationLines', () => {
  it('cada clave del guion tiene su texto', () => {
    for (const key of lunaNarrationKeys) {
      const lines = narrationLines({
        key,
        params: { name: 'Marta', role: 'seer', names: ['Marta', 'Luis'] },
      });
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((line) => line.trim() !== '')).toBe(true);
    }
  });

  it('anuncia la victoria del asesino', () => {
    expect(narrationLines({ key: 'win_killer', params: {} })).toEqual([
      'Solo queda uno en pie, y no es precisamente un vecino ejemplar. Gana el asesino.',
    ]);
  });

  it('ningún texto del guion dice cómo ha muerto alguien de noche', () => {
    const lines = lunaNarrationKeys.flatMap((key) =>
      narrationLines({ key, params: { name: 'Marta', role: 'seer', names: ['Marta', 'Luis'] } }),
    );
    expect(lines.some((line) => /veneno|envenen|asesinad|devorad/i.test(line))).toBe(false);
  });

  it('nombra al muerto y su rol', () => {
    expect(narrationLines({ key: 'dawn_death', params: { name: 'Marta', role: 'seer' } })).toEqual([
      'Amanece. Marta no ha despertado. Era vidente.',
    ]);
    expect(narrationLines({ key: 'executed', params: { name: 'Dani', role: 'wolf' } })).toEqual([
      'El pueblo ha hablado. Dani sube a la horca. Era lobo.',
    ]);
  });

  it('cuenta después la muerte por amor', () => {
    expect(
      narrationLines({
        key: 'dawn_deaths',
        params: { names: ['Marta', 'Luis'], lover: { name: 'Luis', role: 'cupid' } },
      }),
    ).toEqual([
      'Amanece con malas noticias. Han muerto Marta y Luis.',
      'Luis no soporta la pérdida y muere de pena. Era Cupido.',
    ]);
  });

  it('anuncia al alcalde antes de abrir el debate', () => {
    expect(narrationLines({ key: 'day', params: { mayor: 'Fran' } })).toEqual([
      script.mayorElected('Fran'),
      script.day,
    ]);
    expect(narrationLines({ key: 'day', params: {} })).toEqual([script.day]);
  });

  it('distingue la primera noche de las demás', () => {
    expect(narrationLines({ key: 'night_first', params: {} })).toEqual([script.nightFirst]);
    expect(narrationLines({ key: 'night', params: {} })).toEqual([script.night]);
  });

  it('el guion no lleva nada que no sea público', () => {
    expect(narrationLines({ key: 'voting', params: { name: 'Marta', role: 'wolf' } })).toEqual([
      script.voting,
    ]);
  });
});

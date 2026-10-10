import { describe, expect, it } from 'vitest';
import { clueSize } from './clue-size';

describe('clueSize', () => {
  it('las pistas cortas van en mayúsculas al tamaño pedido', () => {
    expect(clueSize('frío', 'text-xl')).toBe('uppercase text-xl');
    expect(clueSize('frío', 'text-display-sm')).toContain('uppercase');
  });

  it('de 13 a 16 letras, más pequeñas y sin mayúsculas', () => {
    expect(clueSize('Supercalifrag', 'text-xl')).toBe('text-lg');
    expect(clueSize('Supercalifragili', 'text-display-sm')).toBe('text-lg');
  });

  it('de 17 a 20 letras, más pequeñas todavía', () => {
    expect(clueSize('Zqwxzqwxzqwxzqwxzabc', 'text-xl')).toBe('text-base');
  });
});

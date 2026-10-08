import { describe, expect, it } from 'vitest';
import { normalizeCodeInput, roomPath } from './room-code';

describe('normalizeCodeInput', () => {
  it('pasa a mayúsculas', () => {
    expect(normalizeCodeInput('ktrm')).toBe('KTRM');
  });

  it('quita las letras que no existen en los códigos (I, L, O) y lo que no son letras', () => {
    expect(normalizeCodeInput('kilo')).toBe('K');
    expect(normalizeCodeInput('K T-R 1M')).toBe('KTRM');
    expect(normalizeCodeInput('ñáKTRM')).toBe('KTRM');
  });

  it('corta en cuatro letras', () => {
    expect(normalizeCodeInput('KTRMAB')).toBe('KTRM');
  });
});

describe('roomPath', () => {
  it('apunta a la sala', () => {
    expect(roomPath('KTRM')).toBe('/sala/KTRM');
  });
});

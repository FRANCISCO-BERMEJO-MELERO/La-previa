import { describe, expect, it } from 'vitest';
import { avatarColor, initialOf } from './avatar-color';

describe('avatarColor', () => {
  it('sigue el orden de la referencia', () => {
    expect([0, 1, 2, 3, 4].map(avatarColor)).toEqual(['tomato', 'sky', 'lime', 'lilac', 'orange']);
  });

  it('vuelve a empezar tras el quinto jugador', () => {
    expect(avatarColor(5)).toBe('tomato');
    expect(avatarColor(13)).toBe('lilac');
  });

  it('no falla con posiciones negativas', () => {
    expect(avatarColor(-1)).toBe('orange');
  });
});

describe('initialOf', () => {
  it('devuelve la primera letra en mayúscula, con tilde', () => {
    expect(initialOf('álvaro')).toBe('Á');
  });

  it('ignora los espacios iniciales', () => {
    expect(initialOf('  lucía')).toBe('L');
  });

  it('devuelve cadena vacía para un nombre vacío', () => {
    expect(initialOf('')).toBe('');
  });
});

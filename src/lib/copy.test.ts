import { describe, expect, it } from 'vitest';
import { copy, errorCodes, errorMessage } from './copy';

function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') return [];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(allStrings);
  return [];
}

const texts = allStrings(copy);

describe('copy', () => {
  it('no tiene textos vacíos', () => {
    expect(texts.filter((text) => text.trim() === '')).toEqual([]);
  });

  it('no usa emojis', () => {
    expect(texts.filter((text) => /\p{Extended_Pictographic}/u.test(text))).toEqual([]);
  });

  it('habla de vosotros, nunca de ustedes', () => {
    expect(texts.filter((text) => /\bustedes\b/i.test(text))).toEqual([]);
  });

  it('interpola nombres y cuentas', () => {
    expect(copy.room.pill('KTRM')).toBe('Sala KTRM');
    expect(copy.name.taken('Álvaro')).toBe(
      'Ya hay un Álvaro en esta sala. Prueba con otro nombre.',
    );
    expect(copy.vote.count(4, 6)).toBe('4 de 6');
    expect(copy.deal.waitingVote('Fran')).toBe('Fran decide cuándo se vota');
  });

  it('concuerda el número de impostores que quedan', () => {
    expect(copy.reveal.continues(5, 1)).toBe(
      'La partida sigue. Quedan 5 jugadores y 1 impostor entre ellos.',
    );
    expect(copy.reveal.continues(7, 2)).toContain('2 impostores');
  });

  it('enumera los empatados con "y"', () => {
    expect(copy.tie.text(['Álvaro', 'Marta'])).toBe(
      'Álvaro y Marta empatan a votos. Esta vez no se expulsa a nadie.',
    );
    expect(copy.tie.text(['Ana', 'Bea', 'Carla'])).toMatch(/^Ana, Bea y Carla empatan/);
  });
});

describe('errorMessage', () => {
  it.each(errorCodes)('traduce %s a un texto que no muestra el código', (code) => {
    const message = errorMessage(code);
    expect(message).not.toContain(code);
    expect(message).not.toBe(errorMessage('desconocido'));
  });

  it('un código desconocido da un mensaje genérico', () => {
    expect(errorMessage('PGRST301')).toBe(copy.errors.unknown);
  });
});

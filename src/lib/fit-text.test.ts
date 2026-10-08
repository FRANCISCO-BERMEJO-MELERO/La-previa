import { describe, expect, it } from 'vitest';
import { fitDisplay, longestWord } from './fit-text';

describe('longestWord', () => {
  it('cuenta letras de la palabra más larga, con tildes como una letra', () => {
    expect(longestWord('Tortilla de patatas')).toBe(8);
    expect(longestWord('Ópera')).toBe(5);
    expect(longestWord('')).toBe(0);
  });
});

describe('fitDisplay', () => {
  it.each([
    ['Taxi', 'text-display-lg'],
    ['Paella', 'text-display-md'],
    ['Croqueta', 'text-display-sm'],
    ['Discoteca', 'text-display-xs'],
    ['Helicóptero', 'text-display-2xs'],
    ['Supermercado', 'text-2xl'],
    ['Extraterrestre', 'text-xl'],
  ])('%s usa %s', (word, size) => {
    expect(fitDisplay(word)).toBe(size);
  });

  it('en textos de varias palabras manda la más larga', () => {
    expect(fitDisplay('Pulpo a la gallega')).toBe('text-display-sm');
  });

  it('respeta el tamaño máximo pedido', () => {
    expect(fitDisplay('Ana', 'text-display-md')).toBe('text-display-md');
    expect(fitDisplay('Ana', 'text-display-sm')).toBe('text-display-sm');
  });

  it('con un máximo menor sigue bajando si hace falta', () => {
    expect(fitDisplay('Extraterrestre', 'text-display-sm')).toBe('text-xl');
  });
});

import { describe, expect, it } from 'vitest';
import { roomCodeFromScan } from './scan';

describe('roomCodeFromScan', () => {
  it.each([
    ['https://la-previa.vercel.app/sala/KTRM', 'KTRM'],
    ['http://localhost:3000/sala/KTRM', 'KTRM'],
    ['https://la-previa.vercel.app/sala/KTRM/', 'KTRM'],
    ['https://la-previa.vercel.app/sala/KTRM?nueva=1', 'KTRM'],
    ['https://la-previa.vercel.app/sala/ktrm', 'KTRM'],
    ['KTRM', 'KTRM'],
    ['  ktrm \n', 'KTRM'],
  ])('reconoce %s', (text, code) => {
    expect(roomCodeFromScan(text)).toBe(code);
  });

  it.each([
    ['https://example.com/', 'una web cualquiera'],
    ['https://la-previa.vercel.app/sala/KTRMX', 'un código de cinco letras'],
    ['https://la-previa.vercel.app/sala/KTIO', 'letras que no usan las salas'],
    ['https://la-previa.vercel.app/sala/KTRM/otra', 'una ruta que sigue'],
    ['KTR', 'tres letras'],
    ['', 'nada'],
  ])('no reconoce %s (%s)', (text) => {
    expect(roomCodeFromScan(text)).toBeNull();
  });
});

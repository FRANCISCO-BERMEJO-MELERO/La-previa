import { describe, expect, it } from 'vitest';
import { ids, palabrasState, pizzaCard } from '@/test/fixtures';
import { viewFor } from './view';

const late = { is_participant: false, alive: false };
const leftAndBack = { is_participant: true, alive: false };

describe('viewFor de palabras_prohibidas', () => {
  it('describiendo, quien describe ve su tarjeta', () => {
    expect(viewFor(palabrasState(pizzaCard), ids.lucia)).toBe('describe');
  });

  it('describiendo, quien vigila ve la tarjeta para cantar la prohibida', () => {
    expect(viewFor(palabrasState(pizzaCard), ids.alvaro)).toBe('watch');
  });

  it('describiendo, los demás adivinan', () => {
    expect(viewFor(palabrasState(), ids.fran)).toBe('guess');
    expect(viewFor(palabrasState(), ids.marta)).toBe('guess');
  });

  it('en la revelación todos ven la tarjeta y cómo acabó', () => {
    for (const id of [ids.fran, ids.lucia, ids.alvaro]) {
      expect(viewFor(palabrasState({ phase: 'reveal', ...pizzaCard }), id)).toBe('reveal');
    }
  });

  it.each(['describing', 'reveal'] as const)(
    'en %s, quien llegó tarde o se fue y ha vuelto espera a la siguiente ronda',
    (phase) => {
      expect(viewFor(palabrasState({ phase, my: late }), ids.fran)).toBe('late');
      expect(viewFor(palabrasState({ phase, my: leftAndBack }), ids.fran)).toBe('late');
    },
  );

  it('al terminar todos ven el resultado, también quien llegó tarde', () => {
    expect(viewFor(palabrasState({ phase: 'finished' }), ids.lucia)).toBe('result');
    expect(viewFor(palabrasState({ phase: 'finished', my: late }), ids.fran)).toBe('result');
  });
});

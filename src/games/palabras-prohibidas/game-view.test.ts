import { describe, expect, it } from 'vitest';
import { ids, inPalabras, palabrasState } from '@/test/fixtures';
import { guessers, nameOf } from './game-view';

describe('datos de palabras_prohibidas', () => {
  it('pueden acertar los activos que ni describen ni vigilan', () => {
    const game = palabrasState();
    expect(guessers(inPalabras(), game).map((player) => player.name)).toEqual(['Fran', 'Marta']);
  });

  it('quien se ha ido no puede acertar', () => {
    const base = palabrasState();
    const game = palabrasState({
      participants: base.participants.map((participant) =>
        participant.user_id === ids.marta ? { ...participant, alive: false } : participant,
      ),
    });
    expect(guessers(inPalabras(game), game).map((player) => player.name)).toEqual(['Fran']);
  });

  it('el nombre de quien describe y de quien vigila', () => {
    const game = palabrasState();
    expect(nameOf(inPalabras(), game, game.describer_id)).toBe('Lucía');
    expect(nameOf(inPalabras(), game, game.watcher_id)).toBe('Álvaro');
    expect(nameOf(inPalabras(), game, null)).toBe('');
  });
});

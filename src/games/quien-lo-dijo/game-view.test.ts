import { describe, expect, it } from 'vitest';
import { ids, inQuien, quienState } from '@/test/fixtures';
import { revealData } from './game-view';

describe('datos de quien_lo_dijo', () => {
  it('en la revelación: autor, aciertos, fallos y el resto de respuestas con su autor', () => {
    const game = quienState({
      phase: 'reveal',
      featured_text: 'Volar',
      annulled: false,
      author_id: ids.lucia,
      correct_ids: [ids.fran],
      wrong_ids: [ids.alvaro],
      answers: [
        { user_id: ids.fran, text: 'Teletransporte' },
        { user_id: ids.lucia, text: 'Volar' },
        { user_id: ids.alvaro, text: 'Ser invisible' },
      ],
    });
    const data = revealData(inQuien(), game);
    expect(data.author?.name).toBe('Lucía');
    expect(data.correct).toEqual(['Fran']);
    expect(data.wrong).toEqual(['Álvaro']);
    expect(data.others.map(({ player, text }) => [player.name, text])).toEqual([
      ['Fran', 'Teletransporte'],
      ['Álvaro', 'Ser invisible'],
    ]);
  });

  it('en una ronda anulada no hay autor y salen todas las respuestas', () => {
    const game = quienState({
      phase: 'reveal',
      annulled: true,
      answers: [
        { user_id: ids.fran, text: 'Teletransporte' },
        { user_id: ids.lucia, text: 'Volar' },
      ],
    });
    const data = revealData(inQuien(), game);
    expect(data.author).toBeNull();
    expect(data.correct).toEqual([]);
    expect(data.others).toHaveLength(2);
  });
});

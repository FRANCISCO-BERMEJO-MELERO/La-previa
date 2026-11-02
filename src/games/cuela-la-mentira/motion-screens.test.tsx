import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Player } from '@/games/rounds/game-view';
import { SEQUENCE_MAX_MS, motionMs } from '@/lib/motion';
import type { RevealData } from './game-view';
import { RevealScreen } from './RevealScreen';

function p(name: string): Player {
  return {
    userId: `id-${name}`,
    name,
    joinIndex: 0,
    active: true,
    score: 0,
    hasResponded: false,
    connected: true,
  };
}

function lies(count: number): RevealData['lies'] {
  return Array.from({ length: count }, (_, index) => ({
    id: `l${String(index)}`,
    text: `Mentira ${String(index + 1)}`,
    authors: [p(`Autor ${String(index + 1)}`)],
    leftIds: [],
    voters: [],
  }));
}

function renderReveal(animate: boolean, count = 2) {
  render(
    <RevealScreen
      aside={null}
      notice={null}
      footer={null}
      question="¿Para qué se inventó el plástico de burbujas?"
      explanation={null}
      reveal={{
        truth: { text: 'Como papel pintado', voters: [] },
        lies: lies(count),
        points: [{ player: p('Fran'), points: 3 }],
      }}
      animate={animate}
    />,
  );
}

function delayOf(element: Element): number {
  const match = /anim-delay-(\d+)/.exec(element.className);
  return match ? Number(match[1]) : 0;
}

describe('RevealScreen: movimiento', () => {
  it('el sello de la verdad se planta al llegar la tarjeta', () => {
    renderReveal(true);
    expect(screen.getByText('La verdad')).toHaveClass('animate-sello', 'anim-delay-420');
  });

  it('las mentiras caen de una en una, después del sello', () => {
    renderReveal(true);
    const items = screen
      .getAllByRole('listitem')
      .filter((item) => item.textContent?.includes('Mentira'));
    expect(items[0]).toHaveClass('animate-caer', 'anim-delay-840');
    expect(items[1]).toHaveClass('animate-caer', 'anim-delay-1260');
  });

  it('con muchas mentiras, la secuencia no pasa de 1,6 s', () => {
    renderReveal(true, 9);
    const items = screen
      .getAllByRole('listitem')
      .filter((item) => item.textContent?.includes('Mentira'));
    const last = items.at(-1);
    if (!last) throw new Error('sin mentiras');
    expect(delayOf(last) + motionMs.base).toBeLessThanOrEqual(SEQUENCE_MAX_MS);
  });

  it('los puntos cuentan; el lector de pantalla lee ya el valor final', () => {
    renderReveal(true);
    expect(screen.getByText('+3', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('sin animar, todo quieto y en su estado final', () => {
    renderReveal(false);
    expect(document.querySelector('.animate-sello, .animate-caer')).toBeNull();
    expect(screen.getByText('+3')).not.toHaveClass('sr-only');
  });
});

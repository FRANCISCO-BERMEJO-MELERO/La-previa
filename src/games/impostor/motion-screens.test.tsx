import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DealScreen } from './DealScreen';
import type { ParticipantView } from './game-view';
import { ResultScreen } from './ResultScreen';
import { RevealScreen } from './RevealScreen';
import { TieScreen } from './TieScreen';
import { VoteWaitScreen } from './VoteWaitScreen';

const chrome = { aside: null, notice: null, footer: null };

function p(name: string, hasVoted: boolean): ParticipantView {
  return { userId: name, name, joinIndex: 0, alive: true, hasVoted, connected: true };
}

const reveal = {
  kind: 'eliminated',
  name: 'Lucía',
  joinIndex: 1,
  wasImpostor: true,
  summary: 'Se acabó la partida.',
} as const;

describe('El impostor en movimiento', () => {
  it('la revelación planta el sello al llegar la tarjeta; quieta, no', () => {
    const { rerender } = render(<RevealScreen {...chrome} {...reveal} stamp />);
    expect(screen.getByText('Era el impostor')).toHaveClass('animate-sello', 'anim-delay-420');
    rerender(<RevealScreen {...chrome} {...reveal} />);
    expect(screen.getByText('Era el impostor')).not.toHaveClass('animate-sello');
  });

  it('el empate cae sin sello', () => {
    render(<TieScreen {...chrome} tied={[]} falls />);
    expect(screen.getByRole('heading', { name: 'Empate' })).toHaveClass('animate-caer');
    expect(document.querySelector('.animate-sello')).toBeNull();
  });

  it('los votos nuevos caen de uno en uno', () => {
    render(
      <VoteWaitScreen
        {...chrome}
        voters={[p('Fran', true), p('Lucía', true), p('Álvaro', true)]}
        myVote={null}
        busy={false}
        justVoted={['Lucía', 'Álvaro']}
        votedBefore={1}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).not.toHaveClass('animate-caer');
    expect(items[1]).toHaveClass('animate-caer', 'anim-delay-0');
    expect(items[2]).toHaveClass('animate-caer', 'anim-delay-420');
    // El recuento ya dice el valor final a los lectores de pantalla mientras cuenta.
    expect(screen.getByText('3 de 3')).toHaveClass('sr-only');
  });

  it('sin votos nuevos, el recuento es el texto de siempre', () => {
    render(<VoteWaitScreen {...chrome} voters={[p('Fran', true)]} myVote={null} busy={false} />);
    expect(screen.getByText('1 de 1')).not.toHaveClass('sr-only');
    expect(document.querySelector('.animate-caer')).toBeNull();
  });

  it('el resultado sella el titular y los impostores caen después, en orden', () => {
    render(
      <ResultScreen
        {...chrome}
        outcome="won"
        winner="group"
        impostorNames={['Dani', 'Marta']}
        word="Paella"
        animate
      />,
    );
    expect(screen.getByText('¡Has ganado!')).toHaveClass('animate-sello');
    const dani = screen.getByText('Dani');
    const marta = screen.getByText('Marta');
    expect(dani).toHaveClass('animate-caer', 'anim-delay-840');
    expect(marta).toHaveClass('animate-caer', 'anim-delay-1260');
  });

  it('mantener para mirar: la misma tapa para el jugador y para el impostor', () => {
    const deal = {
      word: 'Paella',
      category: 'Comida',
      hint: 'Valencia',
      players: [],
      connected: 3,
    };
    const { unmount } = render(<DealScreen {...chrome} {...deal} role="player" />);
    const player = screen.getByRole('button', { name: 'Mantén pulsado para ver tu palabra' });
    const playerCover = player.outerHTML;
    // Tapado no se ve ni la palabra ni la frase que distingue al impostor.
    expect(screen.getByTestId('peek-content')).toHaveClass('invisible');
    expect(screen.getByTestId('peek-content')).toHaveTextContent('Hablad las rondas');
    unmount();
    render(<DealScreen {...chrome} {...deal} role="impostor" />);
    const impostor = screen.getByRole('button', { name: 'Mantén pulsado para ver tu palabra' });
    expect(impostor.outerHTML).toBe(playerCover);
    expect(screen.getByTestId('peek-content')).toHaveTextContent('No conoces la palabra');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Player } from '@/games/rounds/game-view';
import { RevealScreen } from './RevealScreen';
import { VoteScreen } from './VoteScreen';
import { WriteScreen } from './WriteScreen';

const chrome = {
  aside: <span>Ronda 2 de 5</span>,
  notice: null,
  footer: <p>pie</p>,
};

function p(name: string, overrides: Partial<Player> = {}): Player {
  return {
    userId: `id-${name}`,
    name,
    joinIndex: 0,
    active: true,
    score: 0,
    hasResponded: false,
    connected: true,
    ...overrides,
  };
}

describe('WriteScreen', () => {
  it('enseña la pregunta y envía la respuesta escrita, con el límite de 80', () => {
    const onChange = vi.fn<(value: string) => void>();
    const onSubmit = vi.fn();
    render(
      <WriteScreen
        aside={chrome.aside}
        notice={null}
        prompt="¿Qué superpoder elegirías?"
        value="Volar"
        busy={false}
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole('heading', { name: '¿Qué superpoder elegirías?' })).toBeInTheDocument();
    const field = screen.getByLabelText('Tu respuesta');
    expect(field).toHaveAttribute('maxLength', '80');
    fireEvent.change(field, { target: { value: 'Volar alto' } });
    expect(onChange).toHaveBeenCalledWith('Volar alto');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('sin texto no deja enviar, y muestra el error en el campo', () => {
    render(
      <WriteScreen
        aside={chrome.aside}
        notice={null}
        prompt="¿Qué superpoder elegirías?"
        value="   "
        busy={false}
        error="La respuesta tiene que tener entre 1 y 80 caracteres."
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Enviar respuesta' })).toBeDisabled();
    expect(screen.getByLabelText('Tu respuesta')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('VoteScreen de quien_lo_dijo', () => {
  it('enseña la respuesta sin autor y deja votar a los demás', () => {
    const onSelect = vi.fn<(id: string) => void>();
    render(
      <VoteScreen
        aside={chrome.aside}
        notice={null}
        featuredText="Volar"
        candidates={[p('Lucía'), p('Álvaro')]}
        selected={null}
        busy={false}
        onSelect={onSelect}
        onVote={vi.fn()}
      />,
    );
    expect(screen.getByText('«Volar»')).toBeInTheDocument();
    expect(screen.getByText(/No puedes votarte a ti/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elige a quién votar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Lucía/ }));
    expect(onSelect).toHaveBeenCalledWith('id-Lucía');
  });
});

describe('RevealScreen de quien_lo_dijo', () => {
  it('dice quién lo dijo, quién acertó y quién falló, y el resto de respuestas', () => {
    render(
      <RevealScreen
        {...chrome}
        featuredText="Volar"
        reveal={{
          author: p('Lucía'),
          correct: ['Fran'],
          wrong: ['Álvaro', 'Marta'],
          others: [{ player: p('Fran'), text: 'Teletransporte' }],
        }}
      />,
    );
    expect(screen.getByText('Lo dijo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lucía' })).toBeInTheDocument();
    expect(screen.getByText('«Volar»')).toBeInTheDocument();
    expect(screen.getByText('Acertaron: Fran')).toBeInTheDocument();
    expect(screen.getByText('Fallaron: Álvaro y Marta')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Las demás respuestas' })).toBeInTheDocument();
    expect(screen.getByText('Teletransporte')).toBeInTheDocument();
  });

  it('si nadie acierta lo dice', () => {
    render(
      <RevealScreen
        {...chrome}
        featuredText="Volar"
        reveal={{ author: p('Lucía'), correct: [], wrong: ['Fran'], others: [] }}
      />,
    );
    expect(screen.getByText('Nadie acertó')).toBeInTheDocument();
  });

  it('una ronda anulada lo explica y enseña las respuestas', () => {
    render(
      <RevealScreen
        {...chrome}
        featuredText="Volar"
        reveal={{
          author: null,
          correct: [],
          wrong: [],
          others: [
            { player: p('Lucía'), text: 'Volar' },
            { player: p('Fran'), text: 'Teletransporte' },
          ],
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Ronda anulada' })).toBeInTheDocument();
    expect(screen.getByText(/Esta ronda no suma puntos/)).toBeInTheDocument();
    expect(screen.queryByText(/Acertaron/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Las respuestas' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

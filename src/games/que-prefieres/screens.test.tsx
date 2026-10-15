import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Player } from '@/games/rounds/game-view';
import type { QuePrefieresOption } from '@/lib/snapshot';
import type { OptionRow } from './game-view';
import { ChooseScreen, RevealScreen } from './screens';

const chrome = {
  aside: <span>Ronda 4 de 10</span>,
  notice: null,
  footer: <p>pie</p>,
};

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

function rows(a: Player[] = [], b: Player[] = [], majority: QuePrefieresOption | null = null) {
  return [
    { option: 'a', text: 'Volar', choosers: a, majority: majority === 'a' },
    { option: 'b', text: 'Ser invisible', choosers: b, majority: majority === 'b' },
  ] satisfies OptionRow[];
}

describe('ChooseScreen de que_prefieres', () => {
  it('enseña el dilema con las dos opciones como botones y avisa de cuál se toca', () => {
    const onSelect = vi.fn<(option: QuePrefieresOption) => void>();
    render(
      <ChooseScreen
        aside={chrome.aside}
        notice={null}
        options={rows()}
        selected={null}
        busy={false}
        onSelect={onSelect}
        onChoose={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: '¿Qué prefieres?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opción A: Volar' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText(/Nadie ve lo que eliges/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elige una opción' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Opción B: Ser invisible' }));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('con una opción marcada, el botón dice cuál se elige', () => {
    const onChoose = vi.fn();
    render(
      <ChooseScreen
        aside={chrome.aside}
        notice={null}
        options={rows()}
        selected="b"
        busy={false}
        onSelect={vi.fn()}
        onChoose={onChoose}
      />,
    );
    expect(screen.getByRole('button', { name: 'Opción B: Ser invisible' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Elegir la B' }));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it('mientras se envía no deja elegir otra vez y enseña el error', () => {
    render(
      <ChooseScreen
        aside={chrome.aside}
        notice={null}
        options={rows()}
        selected="a"
        busy
        error="Ya has enviado tu respuesta en esta ronda."
        onSelect={vi.fn()}
        onChoose={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Elegir la A' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Ya has enviado tu respuesta');
  });
});

describe('RevealScreen de que_prefieres', () => {
  it('con mayoría, la nombra y da el punto a quienes la eligieron', () => {
    render(
      <RevealScreen {...chrome} options={rows([p('Lucía')], [p('Fran'), p('Álvaro')], 'b')} />,
    );
    expect(screen.getByText('Gana la mayoría')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ser invisible' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'AVolar1 lo prefiereLucía',
      'BSer invisible2 lo prefierenFran y Álvaro+1',
    ]);
  });

  it('con empate, lo dice y nadie puntúa', () => {
    render(<RevealScreen {...chrome} options={rows([p('Lucía')], [p('Fran')])} />);
    expect(screen.getByRole('heading', { name: 'Empate' })).toBeInTheDocument();
    expect(screen.getByText(/esta ronda nadie puntúa/)).toBeInTheDocument();
    expect(screen.queryByText('+1')).not.toBeInTheDocument();
  });

  it('sin elecciones, lo dice', () => {
    render(<RevealScreen {...chrome} options={rows()} />);
    expect(screen.getByRole('heading', { name: 'Nadie ha elegido' })).toBeInTheDocument();
    expect(screen.getAllByText('Nadie')).toHaveLength(2);
    expect(screen.getAllByText('0 lo prefieren')).toHaveLength(2);
  });
});

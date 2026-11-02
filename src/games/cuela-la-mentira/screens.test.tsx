import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Player } from '@/games/rounds/game-view';
import { copy } from '@/lib/copy';
import type { CuelaGameState } from '@/lib/snapshot';
import {
  cuelaIds,
  cuelaQuestion,
  cuelaRevealOptions,
  cuelaVotingOptions,
  ids,
  inCuela,
} from '@/test/fixtures';
import { CuelaGame } from './CuelaGame';
import type { RevealData } from './game-view';
import { RevealScreen } from './RevealScreen';
import { VoteScreen } from './VoteScreen';
import { WriteScreen } from './WriteScreen';

const chrome = { aside: <span>Ronda 2 de 5</span>, notice: null };

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

function renderWrite(overrides: Partial<Parameters<typeof WriteScreen>[0]> = {}) {
  const props = {
    ...chrome,
    question: cuelaQuestion,
    value: '',
    busy: false,
    onChange: vi.fn<(value: string) => void>(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<WriteScreen {...props} />);
  return props;
}

describe('WriteScreen', () => {
  it('enseña la pregunta y un campo con su etiqueta y el límite de 80', () => {
    renderWrite();
    expect(screen.getByRole('heading', { name: cuelaQuestion })).toBeInTheDocument();
    const field = screen.getByLabelText('Tu mentira');
    expect(field).toHaveAttribute('maxLength', '80');
    expect(screen.getByRole('button', { name: 'Colar mentira' })).toBeDisabled();
  });

  it('cuenta los caracteres escritos', () => {
    renderWrite({ value: 'Para envolver lámparas' });
    expect(screen.getByText('22/80')).toBeInTheDocument();
    expect(screen.getByLabelText('Tu mentira')).toHaveAccessibleDescription('22/80');
  });

  it('envía la mentira escrita', () => {
    const props = renderWrite({ value: 'Para envolver lámparas' });
    fireEvent.change(screen.getByLabelText('Tu mentira'), { target: { value: 'Otra' } });
    expect(props.onChange).toHaveBeenCalledWith('Otra');
    fireEvent.click(screen.getByRole('button', { name: 'Colar mentira' }));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('si ha escrito la verdad, lo avisa sin borrar lo escrito', () => {
    renderWrite({ value: 'Como papel pintado', truthWarning: copy.errors.is_truth });
    expect(screen.getByRole('alert')).toHaveTextContent('¡Has dado con la verdad!');
    expect(screen.getByLabelText('Tu mentira')).toHaveValue('Como papel pintado');
    expect(screen.getByLabelText('Tu mentira')).not.toHaveAttribute('aria-invalid');
  });

  it('otros errores marcan el campo', () => {
    renderWrite({ value: 'x', error: copy.errors.invalid_answer });
    expect(screen.getByLabelText('Tu mentira')).toHaveAttribute('aria-invalid', 'true');
  });
});

function renderVote(overrides: Partial<Parameters<typeof VoteScreen>[0]> = {}) {
  const props = {
    ...chrome,
    question: cuelaQuestion,
    options: cuelaVotingOptions ?? [],
    selected: null,
    busy: false,
    onSelect: vi.fn<(optionId: string) => void>(),
    onVote: vi.fn(),
    ...overrides,
  };
  render(<VoteScreen {...props} />);
  return props;
}

describe('VoteScreen', () => {
  it('enseña cada opción como un botón, en el orden de la foto', () => {
    renderVote();
    expect(screen.getByRole('heading', { name: '¿Cuál es la de verdad?' })).toBeInTheDocument();
    const options = within(screen.getByRole('list')).getAllByRole('button');
    expect(options.map((option) => option.textContent)).toEqual([
      'Para aislar cables',
      'Como papel pintado',
      'Tu mentiraPara envolver lámparas',
    ]);
  });

  it('la propia va marcada y no se puede votar', () => {
    renderVote();
    const mine = screen.getByRole('button', { name: /Para envolver lámparas/ });
    expect(mine).toBeDisabled();
    expect(mine).toHaveTextContent('Tu mentira');
  });

  it('elegir una opción la marca y deja votar', () => {
    const props = renderVote({ selected: cuelaIds.truth });
    expect(screen.getByRole('button', { name: /Como papel pintado/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Es esta' }));
    expect(props.onVote).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Para aislar cables/ }));
    expect(props.onSelect).toHaveBeenCalledWith(cuelaIds.other);
  });

  it('sin elegir no se vota', () => {
    renderVote();
    expect(screen.getByRole('button', { name: 'Elige una respuesta' })).toBeDisabled();
  });

  it('un texto con etiquetas se pinta como texto', () => {
    renderVote({
      options: [{ id: cuelaIds.other, text: '<b>negrita</b><img src=x>', is_mine: false }],
    });
    expect(screen.getByText('<b>negrita</b><img src=x>')).toBeInTheDocument();
    expect(document.querySelector('b')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});

const reveal: RevealData = {
  truth: { text: 'Como papel pintado', voters: [p('Lucía')] },
  lies: [
    {
      id: 'a',
      text: 'Para envolver lámparas',
      authors: [p('Fran')],
      leftIds: [],
      voters: [p('Álvaro')],
    },
    { id: 'b', text: 'Para aislar invernaderos', authors: [], leftIds: [], voters: [] },
    { id: 'c', text: 'Para aislar cables', authors: [p('Dani')], leftIds: ['id-Dani'], voters: [] },
  ],
  points: [
    { player: p('Fran'), points: 1 },
    { player: p('Lucía'), points: 2 },
  ],
};

describe('RevealScreen', () => {
  it('enseña la verdad con su sello, su explicación y quién la acertó', () => {
    render(
      <RevealScreen
        footer={null}
        {...chrome}
        question={cuelaQuestion}
        explanation="Se inventó en 1957."
        reveal={reveal}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Como papel pintado' })).toBeInTheDocument();
    expect(screen.getByText('La verdad')).toBeInTheDocument();
    expect(screen.getByText('Se inventó en 1957.')).toBeInTheDocument();
    expect(screen.getByText('La acertaron: Lucía')).toBeInTheDocument();
  });

  it('cada mentira dice quién la coló o si es de la casa, y quién se la tragó', () => {
    render(
      <RevealScreen
        footer={null}
        {...chrome}
        question={cuelaQuestion}
        explanation={null}
        reveal={reveal}
      />,
    );
    const [lieList] = screen.getAllByRole('list');
    if (!lieList) throw new Error('sin lista de mentiras');
    const lies = within(lieList).getAllByRole('listitem');
    expect(lies[0]).toHaveTextContent('La coló Fran');
    expect(lies[0]).toHaveTextContent('Álvaro');
    expect(screen.getByText('La casa')).toBeInTheDocument();
    expect(screen.getByText('La coló Dani (se ha ido)')).toBeInTheDocument();
    expect(screen.getAllByText('No se la tragó nadie')).toHaveLength(2);
  });

  it('da los puntos de la ronda', () => {
    render(
      <RevealScreen
        footer={null}
        {...chrome}
        question={cuelaQuestion}
        explanation={null}
        reveal={reveal}
      />,
    );
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('sin nadie que acierte, lo dice', () => {
    render(
      <RevealScreen
        footer={null}
        {...chrome}
        question={cuelaQuestion}
        explanation={null}
        reveal={{ ...reveal, truth: { text: 'Como papel pintado', voters: [] } }}
      />,
    );
    expect(screen.getByText('Nadie dio con la verdad')).toBeInTheDocument();
  });
});

function renderGame(game: Partial<CuelaGameState>, error?: string) {
  const snapshot = inCuela(game);
  if (snapshot.game?.type !== 'cuela_la_mentira') throw new Error('foto sin partida');
  const run = vi.fn(() => Promise.resolve(true));
  render(
    <CuelaGame
      snapshot={snapshot}
      game={snapshot.game}
      pill={(label) => <span>{label}</span>}
      notice={null}
      busy={false}
      error={error}
      run={run}
      onKickRequest={vi.fn()}
      onChangeGame={vi.fn()}
    />,
  );
  return run;
}

describe('CuelaGame', () => {
  it('lleva la ronda en la cabecera', () => {
    renderGame({});
    expect(screen.getByText('Ronda 2 de 5')).toBeInTheDocument();
  });

  it('el error de haber escrito la verdad sale como aviso en el campo, no abajo', () => {
    renderGame({}, copy.errors.is_truth);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('¡Has dado con la verdad!');
  });

  it('tras enviar, enseña la mentira y quién falta', () => {
    renderGame({
      my: { is_participant: true, alive: true, answer: '<i>Trola</i>', voted_option_id: null },
    });
    expect(screen.getByText('«<i>Trola</i>»')).toBeInTheDocument();
    expect(screen.getByText('Han escrito')).toBeInTheDocument();
    expect(screen.getByText('1 de 3')).toBeInTheDocument();
  });

  it('tras votar, enseña lo votado y la espera común', () => {
    renderGame({
      phase: 'voting',
      options: cuelaVotingOptions,
      my: { is_participant: true, alive: true, answer: null, voted_option_id: cuelaIds.truth },
    });
    expect(screen.getByText('«Como papel pintado»')).toBeInTheDocument();
    expect(screen.getByText('Han votado')).toBeInTheDocument();
  });

  it('la revelación sale de la foto', () => {
    renderGame({
      phase: 'reveal',
      options: cuelaRevealOptions,
      explanation: 'Se inventó en 1957.',
      round_points: [{ user_id: ids.fran, points: 1 }],
    });
    expect(screen.getByRole('heading', { name: 'Como papel pintado' })).toBeInTheDocument();
    expect(screen.getByText('La coló Fran')).toBeInTheDocument();
  });

  it('con 10 jugando, quien llega mira hasta que quede sitio', () => {
    renderGame({
      my: { is_participant: false, alive: false, answer: null, voted_option_id: null },
      participants: Array.from({ length: 10 }, (_, index) => ({
        user_id: `0a1b2c3d-1111-4aaa-8bbb-${String(index + 10).padStart(12, '0')}`,
        name: `Jugador ${String(index + 1)}`,
        alive: true,
        score: 0,
        has_responded: false,
      })),
    });
    expect(screen.getByText(copy.cuela.lateFull)).toBeInTheDocument();
  });

  it('al final, la clasificación común', () => {
    renderGame({
      phase: 'finished',
      ranking: [
        { user_id: ids.fran, name: 'Fran', score: 3 },
        { user_id: ids.lucia, name: 'Lucía', score: 3 },
        { user_id: ids.alvaro, name: 'Álvaro', score: 1 },
      ],
    });
    expect(screen.getByRole('heading', { name: 'Fran y Lucía' })).toBeInTheDocument();
  });
});

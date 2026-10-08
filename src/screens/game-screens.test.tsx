import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ParticipantView } from '@/lib/game-view';
import { DealScreen } from './DealScreen';
import { LateScreen } from './LateScreen';
import { OutScreen } from './OutScreen';
import { ResultScreen } from './ResultScreen';
import { RevealScreen } from './RevealScreen';
import { TieScreen } from './TieScreen';
import { VoteScreen } from './VoteScreen';
import { VoteWaitScreen } from './VoteWaitScreen';

const chrome = {
  aside: <span>Sala KTRM</span>,
  notice: null,
  footer: <p>pie</p>,
};

function p(name: string, overrides: Partial<ParticipantView> = {}): ParticipantView {
  return {
    userId: `id-${name}`,
    name,
    joinIndex: 0,
    alive: true,
    hasVoted: false,
    connected: true,
    ...overrides,
  };
}

const avatars = [
  { userId: 'f', name: 'Fran', joinIndex: 0, muted: false },
  { userId: 'p', name: 'Paula', joinIndex: 1, muted: true },
];

describe('DealScreen (06 y 07)', () => {
  it('06 · el jugador normal ve la palabra y la categoría', () => {
    render(
      <DealScreen
        {...chrome}
        role="player"
        word="Paella"
        category="Comida"
        players={avatars}
        connected={1}
      />,
    );
    expect(screen.getByText('Tu palabra')).toBeInTheDocument();
    expect(screen.getByText('Paella')).toBeInTheDocument();
    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('1 conectados')).toBeInTheDocument();
    expect(screen.getByText(/Hablad las rondas que queráis/)).toBeInTheDocument();
  });

  it('06 · ajusta el tamaño de la palabra a su longitud', () => {
    render(
      <DealScreen
        {...chrome}
        role="player"
        word="Extraterrestre"
        category="Cine y series"
        players={avatars}
        connected={1}
      />,
    );
    expect(screen.getByText('Extraterrestre')).toHaveClass('text-xl');
  });

  it('07 · el impostor ve que lo es y solo la categoría como pista', () => {
    render(
      <DealScreen
        {...chrome}
        role="impostor"
        word={null}
        category="Comida"
        players={avatars}
        connected={1}
      />,
    );
    expect(screen.getByText('Eres el')).toBeInTheDocument();
    expect(screen.getByText('Tu pista: la categoría')).toBeInTheDocument();
    expect(screen.queryByText('Tu palabra')).not.toBeInTheDocument();
    expect(screen.getByText(/No conoces la palabra/)).toBeInTheDocument();
  });

  it('la fila de avatares nombra a todos para lectores de pantalla', () => {
    render(
      <DealScreen
        {...chrome}
        role="player"
        word="Paella"
        category="Comida"
        players={avatars}
        connected={1}
      />,
    );
    expect(screen.getByText('Paula')).toHaveClass('sr-only');
  });
});

describe('LateScreen (05)', () => {
  it('saluda a quien llega tarde y cuenta quién juega', () => {
    render(<LateScreen {...chrome} myName="Sergio" playing={avatars} />);
    expect(screen.getByRole('heading', { name: 'Llegas tarde, Sergio' })).toBeInTheDocument();
    expect(screen.getByText('Partida en curso')).toBeInTheDocument();
    expect(screen.getByText('2 jugando')).toBeInTheDocument();
    expect(screen.getByText('pie')).toBeInTheDocument();
  });
});

describe('VoteScreen (08)', () => {
  const candidates = [p('Fran'), p('Álvaro'), p('Paula', { connected: false })];

  function renderVote(selected: string | null = null) {
    const props = { onSelect: vi.fn(), onVote: vi.fn() };
    render(
      <VoteScreen
        aside={chrome.aside}
        notice={null}
        myName="Lucía"
        candidates={candidates}
        selected={selected}
        busy={false}
        {...props}
      />,
    );
    return props;
  }

  it('lista a quién se puede votar, con los desconectados apagados', () => {
    renderVote();
    expect(screen.getByRole('heading', { name: '¿Quién es el impostor?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paula/ })).toHaveClass('border-dashed');
    expect(screen.getByText(/Lucía, no puedes votar por ti/)).toBeInTheDocument();
  });

  it('sin elegir no se puede votar', () => {
    renderVote();
    expect(screen.getByRole('button', { name: 'Elige a quién votar' })).toBeDisabled();
  });

  it('elegir marca la opción y el botón dice a quién se vota', () => {
    const props = renderVote('id-Álvaro');
    expect(screen.getByRole('button', { name: /Álvaro/, pressed: true })).toHaveTextContent(
      'Tu voto',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fran' }));
    expect(props.onSelect).toHaveBeenCalledWith('id-Fran');
    fireEvent.click(screen.getByRole('button', { name: 'Votar a Álvaro' }));
    expect(props.onVote).toHaveBeenCalledTimes(1);
  });
});

describe('VoteWaitScreen (09)', () => {
  const voters = [
    p('Fran', { hasVoted: true }),
    p('Lucía', { hasVoted: true }),
    p('Dani'),
    p('Paula', { connected: false }),
  ];

  it('cuenta los votos sin decir a quién y marca quién falta', () => {
    render(<VoteWaitScreen {...chrome} voters={voters} myVote="Marta" busy={false} />);
    expect(screen.getByText('2 de 4')).toBeInTheDocument();
    expect(screen.getByText('Tu voto: Marta')).toBeInTheDocument();
    expect(screen.getAllByText('Ha votado')).toHaveLength(2);
    expect(screen.getByText('Pensando')).toBeInTheDocument();
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
  });

  it('el anfitrión ve la explicación de cerrar', () => {
    render(
      <VoteWaitScreen
        {...chrome}
        voters={voters}
        myVote={null}
        busy={false}
        hint="Puedes cerrar la votación con los votos que haya."
      />,
    );
    expect(
      screen.getByText('Puedes cerrar la votación con los votos que haya.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Tu voto/)).not.toBeInTheDocument();
  });
});

describe('VoteWaitScreen (09): echar a desconectados', () => {
  const voters = [p('Fran', { hasVoted: true }), p('Paula', { connected: false })];

  it('el anfitrión puede tocar la ficha de un desconectado para echarlo', () => {
    const onKickRequest = vi.fn();
    render(
      <VoteWaitScreen
        {...chrome}
        voters={voters}
        myVote={null}
        busy={false}
        onKickRequest={onKickRequest}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Echar a Fran' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Echar a Paula' }));
    expect(onKickRequest).toHaveBeenCalledWith('id-Paula');
  });

  it('quien no es anfitrión no puede echar a nadie', () => {
    render(<VoteWaitScreen {...chrome} voters={voters} myVote={null} busy={false} />);
    expect(screen.queryByRole('button', { name: /Echar a/ })).not.toBeInTheDocument();
  });
});

describe('RevealScreen (10)', () => {
  it('expulsión de alguien que no era el impostor', () => {
    render(
      <RevealScreen
        {...chrome}
        kind="eliminated"
        name="Álvaro"
        joinIndex={2}
        wasImpostor={false}
        summary="La partida sigue."
      />,
    );
    expect(screen.getByText('El grupo expulsa a')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Álvaro' })).toBeInTheDocument();
    expect(screen.getByText('No era el impostor')).toHaveClass('bg-sky');
    expect(screen.getByText('La partida sigue.')).toBeInTheDocument();
  });

  it('abandono de alguien que era el impostor', () => {
    render(
      <RevealScreen
        {...chrome}
        kind="left"
        name="Dani"
        joinIndex={4}
        wasImpostor
        summary="Se acabó la partida."
      />,
    );
    expect(screen.getByText('Se ha ido')).toBeInTheDocument();
    expect(screen.getByText('Era el impostor')).toHaveClass('bg-tomato');
  });
});

describe('TieScreen (11)', () => {
  it('empate entre dos', () => {
    render(<TieScreen {...chrome} tied={[p('Álvaro'), p('Marta')]} />);
    expect(screen.getByRole('heading', { name: 'Empate' })).toBeInTheDocument();
    expect(
      screen.getByText('Álvaro y Marta empatan a votos. Esta vez no se expulsa a nadie.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Volved a hablar y votad otra vez cuando queráis.'),
    ).toBeInTheDocument();
  });

  it('nadie ha votado', () => {
    render(<TieScreen {...chrome} tied={[]} />);
    expect(
      screen.getByText('Nadie ha votado. Esta vez no se expulsa a nadie.'),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId('avatar')).toHaveLength(0);
  });
});

describe('OutScreen (12)', () => {
  it('dice que estás fuera y quién sigue', () => {
    render(
      <OutScreen
        {...chrome}
        myName="Álvaro"
        stillPlaying={[p('Fran'), p('Paula', { connected: false })]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Estás fuera, Álvaro' })).toBeInTheDocument();
    expect(screen.getByText('Siguen jugando')).toBeInTheDocument();
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
  });
});

describe('ResultScreen (13 y 14)', () => {
  it('13 · has ganado con el grupo', () => {
    render(
      <ResultScreen
        {...chrome}
        outcome="won"
        winner="group"
        impostorNames={['Marta']}
        word="Paella"
      />,
    );
    expect(screen.getByRole('heading', { name: '¡Has ganado!' })).toBeInTheDocument();
    expect(screen.getByText('Gana el grupo')).toBeInTheDocument();
    expect(screen.getByText('El impostor era')).toBeInTheDocument();
    expect(screen.getByText('Marta')).toBeInTheDocument();
    expect(screen.getByText('Paella')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveClass('bg-lime');
  });

  it('14 · has perdido contra el impostor', () => {
    render(
      <ResultScreen
        {...chrome}
        outcome="lost"
        winner="impostors"
        impostorNames={['Marta']}
        word="Paella"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Has perdido' })).toBeInTheDocument();
    expect(screen.getByText('Gana el impostor')).toBeInTheDocument();
    expect(
      screen.getByText('Quedaban tantos impostores como jugadores normales.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveClass('bg-ink');
  });

  it('con varios impostores los lista a todos', () => {
    render(
      <ResultScreen
        {...chrome}
        outcome="won"
        winner="impostors"
        impostorNames={['Dani', 'Marta']}
        word="Paella"
      />,
    );
    expect(screen.getByText('Ganan los impostores')).toBeInTheDocument();
    expect(screen.getByText('Los impostores eran')).toBeInTheDocument();
    expect(screen.getByText('Dani y Marta')).toBeInTheDocument();
  });

  it('quien llegó tarde ve una tarjeta neutra', () => {
    render(
      <ResultScreen
        {...chrome}
        outcome="spectator"
        winner="group"
        impostorNames={['Marta']}
        word="Paella"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Fin de la partida' })).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveClass('bg-paper');
  });
});

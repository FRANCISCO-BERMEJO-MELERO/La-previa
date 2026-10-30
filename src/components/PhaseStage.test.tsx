import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';
import { PhaseStage } from './PhaseStage';

function Stage({ stage, entering }: { stage: string; entering: boolean }) {
  return (
    <PhaseStage stageKey={stage} entering={entering}>
      <Card variant="hero" tilt="left">
        <h1 id="titular">{stage}</h1>
        <button type="button">Seguir</button>
      </Card>
      <Card>
        <p>Normal</p>
      </Card>
    </PhaseStage>
  );
}

function ghosts(): HTMLElement {
  return screen.getByTestId('phase-ghosts');
}

describe('PhaseStage', () => {
  it('sin cambio de fase no hay fantasma ni entrada', () => {
    const { rerender } = render(<Stage stage="talking" entering={false} />);
    rerender(<Stage stage="talking" entering={false} />);
    expect(ghosts()).toBeEmptyDOMElement();
    expect(screen.getAllByTestId('card')[0]).not.toHaveClass('animate-entrar');
  });

  it('al cambiar de fase la tarjeta nueva entra y la vieja sale como fantasma inerte', () => {
    const { rerender } = render(<Stage stage="talking" entering={false} />);
    rerender(<Stage stage="voting" entering />);

    const [lead, normal] = screen.getAllByTestId('card');
    expect(lead).toHaveClass('animate-entrar');
    expect(normal).not.toHaveClass('animate-entrar');
    expect(screen.getByRole('heading', { name: 'voting' })).toBeInTheDocument();

    const layer = ghosts();
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer).toHaveAttribute('inert');
    expect(layer).toHaveClass('pointer-events-none');
    const ghost = layer.firstElementChild;
    expect(ghost).toHaveClass('animate-salir');
    expect(ghost).toHaveTextContent('talking');
    // Una sola tarjeta sale: la normal no es protagonista.
    expect(layer.children).toHaveLength(1);
    // Sin ids repetidos en la página.
    expect(layer.querySelector('[id]')).toBeNull();
  });

  it('el fantasma no se puede usar ni lo leen los lectores de pantalla', () => {
    const { rerender } = render(<Stage stage="talking" entering={false} />);
    rerender(<Stage stage="voting" entering />);
    expect(screen.getAllByRole('button', { name: 'Seguir' })).toHaveLength(1);
  });

  it('cambiar de fase sin animar monta la tarjeta nueva, quieta', () => {
    const { rerender } = render(<Stage stage="talking" entering={false} />);
    rerender(<Stage stage="voting" entering={false} />);
    expect(ghosts()).toBeEmptyDOMElement();
    expect(screen.getAllByTestId('card')[0]).not.toHaveClass('animate-entrar');
  });

  it('el fantasma se quita al terminar su animación', () => {
    const { rerender } = render(<Stage stage="talking" entering={false} />);
    rerender(<Stage stage="voting" entering />);
    ghosts().firstElementChild?.dispatchEvent(new Event('animationend'));
    expect(ghosts()).toBeEmptyDOMElement();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfflineNotice } from './OfflineNotice';
import { HeaderAside } from './HeaderAside';
import { Screen } from './Screen';

describe('HeaderAside', () => {
  it('la píldora solo informa y salir es un botón a la vista que abre la confirmación', () => {
    const onLeave = vi.fn();
    render(<HeaderAside label="Sala KTRM" onLeave={onLeave} />);
    expect(screen.getByText('Sala KTRM')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sala KTRM/ })).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Salir de la sala' });
    expect(button).toHaveTextContent('Salir');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveClass('min-h-11');
    fireEvent.click(button);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});

describe('OfflineNotice', () => {
  it('anuncia el aviso sin bloquear', () => {
    render(<OfflineNotice>Sin conexión.</OfflineNotice>);
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión.');
  });
});

describe('Screen', () => {
  it('coloca el aviso entre la cabecera y el contenido', () => {
    render(
      <Screen brand="La Previa" notice={<p>aviso</p>}>
        contenido
      </Screen>,
    );
    const notice = screen.getByText('aviso');
    expect(screen.getByRole('banner').compareDocumentPosition(notice)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(notice.compareDocumentPosition(screen.getByRole('main'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

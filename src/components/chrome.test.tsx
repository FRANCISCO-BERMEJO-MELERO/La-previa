import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfflineNotice } from './OfflineNotice';
import { PillButton } from './PillButton';
import { Screen } from './Screen';

describe('PillButton', () => {
  it('es un botón con el texto visible y la explicación para lectores de pantalla', () => {
    const onClick = vi.fn();
    render(<PillButton label="Sala KTRM" hint="Salir de la sala" onClick={onClick} />);
    expect(screen.getByText('Sala KTRM')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Sala KTRM. Salir de la sala' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveClass('min-h-11');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
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

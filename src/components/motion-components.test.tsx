import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';
import { OfflineNotice } from './OfflineNotice';
import { TextField } from './TextField';

describe('avisos y errores que caen', () => {
  it('el aviso sin conexión cae', () => {
    render(<OfflineNotice>Sin conexión</OfflineNotice>);
    expect(screen.getByRole('status')).toHaveClass('animate-caer');
  });

  it('el campo con error tiembla y su mensaje cae', () => {
    const { rerender } = render(<TextField id="codigo" label="Código" />);
    expect(screen.getByLabelText('Código')).not.toHaveClass('animate-sacudida');
    rerender(<TextField id="codigo" label="Código" error="No existe esa sala" />);
    expect(screen.getByLabelText('Código')).toHaveClass('animate-sacudida');
    expect(screen.getByText('No existe esa sala')).toHaveClass('animate-caer');
  });

  it('el diálogo que cae lo hace al abrirse; los demás no', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open title="Código QR" closeLabel="Cerrar" onClose={onClose} falls>
        <p>QR</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('animate-caer');
    rerender(
      <Dialog open title="Código QR" closeLabel="Cerrar" onClose={onClose}>
        <p>QR</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).not.toHaveClass('animate-caer');
  });
});

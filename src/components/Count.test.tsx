import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Count } from './Count';

describe('Count', () => {
  it('sin valor anterior es el texto de siempre', () => {
    render(<Count value={7} from={null} />);
    expect(screen.getByText('7')).not.toHaveClass('sr-only');
  });

  it('cuenta hasta el valor y el lector de pantalla oye ya el final', async () => {
    render(<Count value={10} from={2} format={(n) => `${String(n)} puntos`} />);
    expect(screen.getByText('10 puntos')).toHaveClass('sr-only');
    expect(screen.getByText('2 puntos')).toHaveAttribute('aria-hidden', 'true');
    await waitFor(
      () => {
        expect(screen.getByText('10 puntos', { selector: '[aria-hidden]' })).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('HomePage', () => {
  it('muestra la pantalla de inicio', () => {
    render(<HomePage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear sala' })).toBeInTheDocument();
  });
});

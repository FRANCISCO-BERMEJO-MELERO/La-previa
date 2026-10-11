import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { copy } from '@/lib/copy';
import { RoleArt } from './RoleArt';
import { RoleCard } from './RoleCard';
import { lunaRoles, teamOf } from './roles';

describe('RoleArt', () => {
  it.each(lunaRoles)('dibuja %s con su descripción', (role) => {
    render(<RoleArt role={role} />);
    expect(screen.getByRole('img', { name: copy.lunaLlena.roles[role].art })).toBeInTheDocument();
  });

  it('junto al nombre del rol es decorativo', () => {
    const { container } = render(<RoleArt role="wolf" decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('usa solo clases de la paleta, sin colores sueltos', () => {
    const { container } = render(
      <>
        {lunaRoles.map((role) => (
          <RoleArt key={role} role={role} />
        ))}
      </>,
    );
    const shapes = Array.from(container.querySelectorAll('svg *'));
    expect(
      shapes.filter((shape) => shape.hasAttribute('fill') || shape.hasAttribute('style')),
    ).toEqual([]);
  });
});

describe('RoleCard', () => {
  it.each(lunaRoles)('la carta de %s dice el rol, el bando y el efecto', (role) => {
    render(<RoleCard role={role} pack={[]} headingLevel={1} />);
    expect(
      screen.getByRole('heading', { level: 1, name: copy.lunaLlena.roles[role].name }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.lunaLlena.teams[teamOf(role)])).toBeInTheDocument();
    expect(screen.getByText(copy.lunaLlena.roles[role].effect)).toBeInTheDocument();
    expect(screen.getByText(copy.lunaLlena.card.youAre)).toBeInTheDocument();
  });

  it('la del lobo enseña la manada y es oscura', () => {
    render(<RoleCard role="wolf" pack={['Lucía', 'Dani']} headingLevel={2} />);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-ink');
    expect(within(card).getByText(copy.lunaLlena.card.pack)).toBeInTheDocument();
    expect(within(card).getByText('Lucía y Dani')).toBeInTheDocument();
  });

  it('un lobo solo sabe que caza solo', () => {
    render(<RoleCard role="wolf" pack={[]} headingLevel={2} />);
    expect(screen.getByText(copy.lunaLlena.card.packNames([]))).toBeInTheDocument();
  });

  it('las demás no hablan de la manada aunque se les pasen nombres', () => {
    render(<RoleCard role="seer" pack={['Lucía']} headingLevel={2} />);
    expect(screen.queryByText(copy.lunaLlena.card.pack)).not.toBeInTheDocument();
    expect(screen.queryByText('Lucía')).not.toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveClass('bg-paper');
  });

  it('el bufón juega solo y los lobos tienen su bando', () => {
    expect(teamOf('jester')).toBe('solo');
    expect(teamOf('wolf')).toBe('wolves');
    expect(teamOf('cupid')).toBe('village');
  });
});

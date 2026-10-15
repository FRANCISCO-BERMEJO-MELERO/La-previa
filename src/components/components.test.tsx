import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { avatarIds } from '@/lib/avatars';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Card } from './Card';
import { Pill } from './Pill';
import { PlayerChip } from './PlayerChip';
import { Screen } from './Screen';
import { TextField } from './TextField';
import { WaitingBox } from './WaitingBox';

describe('Screen', () => {
  it('muestra la marca en la cabecera y el contenido en main', () => {
    render(
      <Screen brand="La Previa" aside={<span>Sala KTRM</span>}>
        contenido
      </Screen>,
    );
    expect(screen.getByRole('banner')).toHaveTextContent('La PreviaSala KTRM');
    expect(screen.getByRole('main')).toHaveTextContent('contenido');
  });

  it('sin cabecera cuando es una pantalla desnuda', () => {
    render(
      <Screen brand="La Previa" bare>
        contenido
      </Screen>,
    );
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});

describe('Button', () => {
  it('es un botón nativo de tipo button por defecto', () => {
    render(<Button>Crear sala</Button>);
    expect(screen.getByRole('button', { name: 'Crear sala' })).toHaveAttribute('type', 'button');
  });

  it('el principal mide 64 px, lleva sombra dura y se hunde al pulsar', () => {
    render(<Button>Crear sala</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-16', 'bg-tomato', 'shadow-hard', 'press');
  });

  it('el secundario es blanco y sin sombra', () => {
    render(<Button variant="secondary">Copiar enlace</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-paper', 'h-12');
    expect(button).not.toHaveClass('shadow-hard');
  });

  it('ocupa todo el ancho cuando se pide', () => {
    render(<Button fullWidth>Entrar</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('avisa al pulsar y no lo hace si está desactivado', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Votar</Button>);
    fireEvent.click(screen.getByRole('button'));
    rerender(
      <Button onClick={onClick} disabled>
        Votar
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Card', () => {
  it('la normal tiene radio de tarjeta y sombra de 6 px, sin giro', () => {
    render(<Card tilt="left">x</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-card', 'shadow-hard', 'bg-paper');
    expect(card).not.toHaveClass('tilt-left');
  });

  it('la protagonista gira y lleva sombra de 8 px', () => {
    render(
      <Card variant="hero" tilt="right" tone="lime">
        x
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('tilt-right', 'shadow-hard-lg', 'bg-lime');
  });

  it('parte las palabras largas en vez de desbordarse', () => {
    render(<Card>x</Card>);
    expect(screen.getByTestId('card')).toHaveClass('wrap-break-word', 'hyphens-auto');
  });

  it('la oscura es ink con sombra tomate', () => {
    render(<Card variant="dark">x</Card>);
    expect(screen.getByTestId('card')).toHaveClass('bg-ink', 'text-paper', 'shadow-hard-lg-tomato');
  });
});

describe('Pill', () => {
  it('es redonda y puede girar', () => {
    render(
      <Pill tone="tomato" tilted>
        Juegos de fiesta
      </Pill>,
    );
    expect(screen.getByText('Juegos de fiesta')).toHaveClass(
      'rounded-full',
      'bg-tomato',
      'tilt-pill-left',
    );
  });

  it('sobre fondo oscuro lleva borde blanco', () => {
    render(
      <Pill onDark caps>
        Eres el
      </Pill>,
    );
    expect(screen.getByText('Eres el')).toHaveClass('border-paper', 'uppercase');
  });
});

describe('Avatar', () => {
  it('muestra la inicial con el color de su orden de entrada', () => {
    render(<Avatar name="lucía" joinIndex={1} />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveTextContent('L');
    expect(avatar).toHaveClass('bg-sky', 'rounded-full');
  });

  it('desconectado pierde el color', () => {
    render(<Avatar name="Paula" joinIndex={0} muted />);
    expect(screen.getByTestId('avatar')).toHaveClass('bg-paper');
  });

  it.each(avatarIds)('con el avatar %s pinta su ilustración en vez de la inicial', (id) => {
    render(<Avatar name="Paula" joinIndex={0} avatar={id} />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar).not.toHaveTextContent('P');
    expect(avatar).toHaveClass('bg-paper');
    expect(avatar.querySelector(`svg[data-avatar="${id}"]`)?.childElementCount).toBeGreaterThan(0);
  });

  it('con avatar y desconectado, la ilustración se apaga', () => {
    render(<Avatar name="Paula" joinIndex={0} avatar="ghost" muted />);
    expect(screen.getByTestId('avatar').querySelector('svg')).toHaveClass('grayscale');
  });
});

describe('PlayerChip', () => {
  it('muestra nombre, detalle y avatar', () => {
    render(<PlayerChip name="Fran" joinIndex={0} detail="Anfitrión" />);
    expect(screen.getByTestId('player-chip')).toHaveTextContent('FFranAnfitrión');
    expect(screen.getByTestId('avatar')).toHaveClass('bg-tomato');
  });

  it('apagado con borde discontinuo y sin avatar si no hay orden', () => {
    render(<PlayerChip name="Dani" detail="Pensando" muted />);
    expect(screen.getByTestId('player-chip')).toHaveClass('border-dashed', 'bg-ground-soft');
    expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
  });
});

describe('WaitingBox', () => {
  it('anuncia la espera con borde discontinuo', () => {
    render(<WaitingBox>Fran decide cuándo se vota</WaitingBox>);
    const box = screen.getByRole('status');
    expect(box).toHaveTextContent('Fran decide cuándo se vota');
    expect(box).toHaveClass('border-dashed');
  });
});

describe('TextField', () => {
  it('asocia la etiqueta al campo', () => {
    render(<TextField id="nombre" label="Tu nombre" />);
    expect(screen.getByLabelText('Tu nombre')).toHaveClass('bg-field');
  });

  it('con error marca el campo y lo describe con el mensaje', () => {
    render(<TextField id="nombre" label="Tu nombre" error="Ya hay un Álvaro en esta sala." />);
    const input = screen.getByLabelText('Tu nombre');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Ya hay un Álvaro en esta sala.');
    expect(input).toHaveClass('bg-field-error');
  });

  it('la variante de código centra y espacia las letras', () => {
    render(<TextField id="codigo" label="Código de la sala" variant="code" maxLength={4} />);
    expect(screen.getByLabelText('Código de la sala')).toHaveClass('tracking-code', 'text-center');
  });
});

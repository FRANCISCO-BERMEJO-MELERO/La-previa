import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeScreen } from './HomeScreen';
import { NameScreen } from './NameScreen';
import { RoomGoneScreen } from './RoomGoneScreen';

function home(overrides: Partial<Parameters<typeof HomeScreen>[0]> = {}) {
  const props = {
    code: '',
    busy: false,
    onCodeChange: vi.fn(),
    onJoin: vi.fn(),
    onScan: vi.fn(),
    onCreate: vi.fn(),
    ...overrides,
  };
  render(<HomeScreen {...props} />);
  return props;
}

describe('HomeScreen (01)', () => {
  it('muestra los textos de la referencia', () => {
    home();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('LaPrevia');
    expect(
      screen.getByText('Para jugar en persona, cada uno con su móvil. Sin registro.'),
    ).toBeInTheDocument();
    expect(screen.getByText('o empieza tú')).toBeInTheDocument();
  });

  it('el código tiene etiqueta y avisa de cada cambio', () => {
    const props = home();
    fireEvent.change(screen.getByLabelText('Código de la sala'), { target: { value: 'kt' } });
    expect(props.onCodeChange).toHaveBeenCalledWith('kt');
  });

  it('no deja unirse hasta tener cuatro letras', () => {
    home({ code: 'KTR' });
    expect(screen.getByRole('button', { name: 'Unirse' })).toBeDisabled();
  });

  it('con el código completo, unirse envía el formulario', () => {
    const props = home({ code: 'KTRM' });
    fireEvent.click(screen.getByRole('button', { name: 'Unirse' }));
    expect(props.onJoin).toHaveBeenCalledTimes(1);
  });

  it('escanear el QR está a la vista y avisa', () => {
    const props = home();
    fireEvent.click(screen.getByRole('button', { name: 'Escanear QR' }));
    expect(props.onScan).toHaveBeenCalledTimes(1);
  });

  it('crear sala avisa', () => {
    const props = home();
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }));
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it('mientras trabaja no deja pulsar', () => {
    home({ code: 'KTRM', busy: true });
    expect(screen.getByRole('button', { name: 'Unirse' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Crear sala' })).toBeDisabled();
  });
});

function name(overrides: Partial<Parameters<typeof NameScreen>[0]> = {}) {
  const props = {
    name: '',
    busy: false,
    onNameChange: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<NameScreen {...props} />);
  return props;
}

describe('NameScreen (02)', () => {
  it('pregunta el nombre con su etiqueta y su explicación', () => {
    name();
    expect(screen.getByRole('heading', { name: '¿Cómo te llamas?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tu nombre')).toHaveAttribute('maxLength', '14');
    expect(
      screen.getByText('Así te verán los demás. El nombre no puede repetirse dentro de la sala.'),
    ).toBeInTheDocument();
  });

  it('muestra la sala si se entra en una', () => {
    name({ roomCode: 'KTRM' });
    expect(screen.getByText('Sala KTRM')).toBeInTheDocument();
  });

  it('no deja entrar con el nombre vacío o de espacios', () => {
    name({ name: '   ' });
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });

  it('entrar envía el formulario', () => {
    const props = name({ name: 'Lucía' });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('muestra el error en línea, asociado al campo', () => {
    name({ name: 'Álvaro', error: 'Ya hay un Álvaro en esta sala. Prueba con otro nombre.' });
    expect(screen.getByLabelText('Tu nombre')).toHaveAccessibleDescription(
      'Ya hay un Álvaro en esta sala. Prueba con otro nombre.',
    );
  });
});

describe('RoomGoneScreen', () => {
  it('explica que la sala no existe y lleva al inicio', () => {
    render(<RoomGoneScreen />);
    expect(screen.getByRole('heading', { name: 'Esta sala no existe' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '@/lib/snapshot';
import { ids, lobbySnapshot } from '@/test/fixtures';
import { LobbyScreen } from './LobbyScreen';

function withPlayers(count: number): Snapshot {
  const base = lobbySnapshot();
  const players = Array.from({ length: count }, (_, i) => ({
    user_id: `0a1b2c3d-1111-4aaa-8bbb-${String(i + 1).padStart(12, '0')}`,
    name: `Jugador ${String(i + 1)}`,
    connected: true,
    joined_at: '2026-10-08T19:00:00+00:00',
  }));
  return lobbySnapshot({
    players,
    room: { ...base.room, host_id: players[0]?.user_id ?? '' },
    me: { ...base.me, user_id: players[0]?.user_id ?? '' },
  });
}

function renderLobby(overrides: Partial<Parameters<typeof LobbyScreen>[0]> = {}) {
  const props = {
    snapshot: lobbySnapshot(),
    impostors: 1,
    busy: false,
    offline: false,
    onLeaveRequest: vi.fn(),
    roomUrl: 'https://laprevia.app/sala/KTRM',
    qrOpen: false,
    shareOutcome: null,
    onShare: vi.fn(),
    onShowQr: vi.fn(),
    onCloseQr: vi.fn(),
    onImpostorsChange: vi.fn(),
    onStart: vi.fn(),
    onKickRequest: vi.fn(),
    ...overrides,
  };
  render(<LobbyScreen {...props} />);
  return props;
}

const asGuest = (() => {
  const base = lobbySnapshot();
  return lobbySnapshot({
    me: { user_id: ids.lucia, name: 'Lucía', is_host: false },
    room: base.room,
  });
})();

describe('LobbyScreen (04)', () => {
  it('muestra el código de la sala', () => {
    renderLobby();
    expect(screen.getByText('KTRM')).toBeInTheDocument();
  });

  it('deja compartir el enlace y avisa cuando se ha copiado', () => {
    const props = renderLobby();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }));
    expect(props.onShare).toHaveBeenCalledTimes(1);
  });

  it('cuando el enlace se ha copiado lo dice en el botón', () => {
    renderLobby({ shareOutcome: 'copied' });
    expect(screen.getByRole('button', { name: 'Enlace copiado' })).toBeInTheDocument();
  });

  it('si no se pudo copiar, da el código como salida', () => {
    renderLobby({ shareOutcome: 'failed' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se ha podido copiar el enlace. Diles el código: KTRM.',
    );
  });

  it('muestra el QR de la sala en un diálogo', () => {
    const props = renderLobby();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar QR' }));
    expect(props.onShowQr).toHaveBeenCalledTimes(1);
  });

  it('con el QR abierto se ve el código QR y se puede cerrar', () => {
    const props = renderLobby({ qrOpen: true });
    const dialog = screen.getByRole('dialog', { name: 'Escanea para entrar' });
    expect(
      within(dialog).getByRole('img', { name: 'Código QR para entrar en la sala KTRM' }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(props.onCloseQr).toHaveBeenCalled();
  });

  it('lista a los jugadores por orden de entrada con su cuenta', () => {
    renderLobby({ snapshot: asGuest });
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'FFranAnfitrión',
      'LLucía',
      'ÁÁlvaroSin conexión',
    ]);
    expect(screen.getByText('3 de 16')).toBeInTheDocument();
  });

  it('marca apagado al jugador desconectado', () => {
    renderLobby();
    const alvaro = screen.getAllByRole('listitem')[2];
    expect(alvaro && within(alvaro).getByTestId('player-chip')).toHaveClass('border-dashed');
  });

  it('el anfitrión toca la ficha de otro para echarlo, pero no la suya', () => {
    const props = renderLobby();
    expect(screen.queryByRole('button', { name: 'Echar a Fran' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Echar a Álvaro' }));
    expect(props.onKickRequest).toHaveBeenCalledWith(ids.alvaro);
  });

  it('el anfitrión ajusta los impostores dentro de los límites', () => {
    const onImpostorsChange = vi.fn<(count: number) => void>();
    renderLobby({ snapshot: withPlayers(7), impostors: 2, onImpostorsChange });
    fireEvent.click(screen.getByRole('button', { name: 'Más impostores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Menos impostores' }));
    expect(onImpostorsChange.mock.calls).toEqual([[3], [1]]);
  });

  it('no deja pasar del máximo ni bajar de uno', () => {
    renderLobby({ snapshot: withPlayers(5), impostors: 2 });
    expect(screen.getByRole('button', { name: 'Más impostores' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Menos impostores' })).toBeEnabled();
  });

  it('el anfitrión empieza la partida', () => {
    const props = renderLobby({ snapshot: withPlayers(4) });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar partida' }));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('quien no es anfitrión no ve el botón de empezar', () => {
    renderLobby({ snapshot: asGuest });
    expect(screen.queryByRole('button', { name: 'Empezar partida' })).not.toBeInTheDocument();
  });

  it('quien no es anfitrión no puede echar ni elegir impostores, y ve a quién espera', () => {
    renderLobby({ snapshot: asGuest });
    expect(screen.queryByRole('button', { name: /Echar a/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Más impostores' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Fran empezará la partida');
  });

  it('la píldora de la cabecera sirve para salir de la sala', () => {
    const props = renderLobby();
    fireEvent.click(screen.getByRole('button', { name: 'El impostor. Salir de la sala' }));
    expect(props.onLeaveRequest).toHaveBeenCalledTimes(1);
  });

  it('sin conexión avisa y sigue mostrando la sala', () => {
    renderLobby({ offline: true });
    expect(
      screen.getByText('Sin conexión. Seguimos intentándolo; no cierres la página.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Lucía')).toBeInTheDocument();
  });

  it('con conexión no hay aviso', () => {
    renderLobby();
    expect(
      screen.queryByText('Sin conexión. Seguimos intentándolo; no cierres la página.'),
    ).not.toBeInTheDocument();
  });

  it('muestra el error de una acción', () => {
    renderLobby({ error: 'Eso solo lo puede hacer quien lleva la sala.' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Eso solo lo puede hacer quien lleva la sala.',
    );
  });
});

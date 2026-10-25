import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LunaConfig } from '@/games/luna-llena/composition';
import type { Snapshot } from '@/lib/snapshot';
import { ids, lobbySnapshot } from '@/test/fixtures';
import { LobbyScreen } from './LobbyScreen';

function withPlayers(count: number): Snapshot {
  const base = lobbySnapshot();
  const players = Array.from({ length: count }, (_, i) => ({
    user_id: `0a1b2c3d-1111-4aaa-8bbb-${String(i + 1).padStart(12, '0')}`,
    name: `Jugador ${String(i + 1)}`,
    avatar: null,
    connected: true,
    joined_at: '2026-10-08T19:00:00+00:00',
  }));
  return lobbySnapshot({
    players,
    room: { ...base.room, host_id: players[0]?.user_id ?? '' },
    me: { ...base.me, user_id: players[0]?.user_id ?? '' },
  });
}

const defaultLunaConfig: LunaConfig = { wolves: 1, roles: ['seer'] };

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
    howToOpen: false,
    avatarOpen: false,
    onAvatarOpen: vi.fn(),
    onAvatarClose: vi.fn(),
    onAvatarChange: vi.fn(),
    onHowToOpen: vi.fn(),
    onHowToClose: vi.fn(),
    onImpostorsChange: vi.fn(),
    voteSeconds: null as number | null,
    onVoteSecondsChange: vi.fn(),
    categories: [] as string[],
    chosenCategories: [] as string[],
    topicsOpen: false,
    onTopicsOpen: vi.fn(),
    onTopicsClose: vi.fn(),
    onCategoriesChange: vi.fn(),
    rounds: 10,
    onRoundsChange: vi.fn(),
    lunaConfig: defaultLunaConfig,
    onLunaConfigChange: vi.fn(),
    onStart: vi.fn(),
    onKickRequest: vi.fn(),
    onChangeGame: vi.fn(),
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

  it('con El impostor no hay selector de rondas', () => {
    renderLobby();
    expect(screen.queryByRole('group', { name: 'Rondas' })).not.toBeInTheDocument();
  });

  it('en un juego por rondas, el anfitrión elige 5, 10 o 15 rondas en vez de impostores', () => {
    const base = lobbySnapshot();
    const onRoundsChange = vi.fn<(rounds: number) => void>();
    renderLobby({
      snapshot: lobbySnapshot({ room: { ...base.room, game: 'probable' } }),
      onRoundsChange,
    });
    expect(screen.queryByRole('button', { name: 'Más impostores' })).not.toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Rondas' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => [b.getAttribute('aria-label'), b.getAttribute('aria-pressed')]),
    ).toEqual([
      ['5 rondas', 'false'],
      ['10 rondas', 'true'],
      ['15 rondas', 'false'],
    ]);
    fireEvent.click(screen.getByRole('button', { name: '15 rondas' }));
    expect(onRoundsChange).toHaveBeenCalledWith(15);
    expect(screen.getByText('¿Quién es más probable que…?')).toBeInTheDocument();
  });

  it('quien no es anfitrión no elige rondas', () => {
    renderLobby({ snapshot: { ...asGuest, room: { ...asGuest.room, game: 'probable' } } });
    expect(screen.queryByRole('group', { name: 'Rondas' })).not.toBeInTheDocument();
  });

  it('el anfitrión empieza la partida', () => {
    const props = renderLobby({ snapshot: withPlayers(4) });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar partida' }));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('con menos de 3 jugadores no deja empezar y explica cuántos faltan', () => {
    const props = renderLobby({ snapshot: withPlayers(2) });
    const start = screen.getByRole('button', { name: 'Empezar partida' });
    expect(start).toBeDisabled();
    expect(start).toHaveAccessibleDescription(/Hacen falta al menos 3 jugadores: falta 1\./);
    fireEvent.click(start);
    expect(props.onStart).not.toHaveBeenCalled();
  });

  it('solo con el anfitrión dice que faltan 2', () => {
    renderLobby({ snapshot: withPlayers(1) });
    expect(screen.getByText(/faltan 2\./)).toBeInTheDocument();
  });

  it('con 3 jugadores ya se puede empezar, sin aviso', () => {
    renderLobby({ snapshot: withPlayers(3) });
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeEnabled();
    expect(screen.queryByText(/Hacen falta/)).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Salir de la sala' }));
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

describe('LobbyScreen: temáticas de El impostor', () => {
  const categories = ['Animales', 'Fútbol', 'Historia'];

  it('sin temáticas cargadas no se enseña el selector', () => {
    renderLobby();
    expect(screen.queryByRole('button', { name: 'Elegir temáticas' })).not.toBeInTheDocument();
  });

  it('dice qué temáticas hay elegidas y abre el diálogo', () => {
    const props = renderLobby({ categories, chosenCategories: ['Fútbol', 'Historia'] });
    expect(screen.getByText('2 temáticas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir temáticas' }));
    expect(props.onTopicsOpen).toHaveBeenCalledTimes(1);
  });

  it('marcar una la añade en el orden de la lista, y desmarcarla la quita', () => {
    const props = renderLobby({ categories, chosenCategories: ['Historia'], topicsOpen: true });
    expect(screen.getByRole('button', { name: 'Historia' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Animales' }));
    expect(props.onCategoriesChange).toHaveBeenLastCalledWith(['Animales', 'Historia']);
    fireEvent.click(screen.getByRole('button', { name: 'Historia' }));
    expect(props.onCategoriesChange).toHaveBeenLastCalledWith([]);
  });

  it('"Todas" deja de filtrar, y está marcada cuando no hay ninguna elegida', () => {
    const props = renderLobby({ categories, chosenCategories: ['Fútbol'], topicsOpen: true });
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(props.onCategoriesChange).toHaveBeenLastCalledWith([]);
  });

  it('en los juegos por rondas no hay temáticas', () => {
    const base = lobbySnapshot();
    renderLobby({
      snapshot: lobbySnapshot({ room: { ...base.room, game: 'probable' } }),
      categories,
    });
    expect(screen.queryByRole('button', { name: 'Elegir temáticas' })).not.toBeInTheDocument();
  });
});

describe('LobbyScreen: cómo se juega', () => {
  it('todos, no solo el anfitrión, pueden abrir el tutorial', () => {
    const props = renderLobby({
      snapshot: lobbySnapshot({ me: { user_id: ids.lucia, name: 'Lucía', is_host: false } }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cómo se juega' }));
    expect(props.onHowToOpen).toHaveBeenCalledTimes(1);
  });
});

describe('LobbyScreen: cambiar de juego', () => {
  it('el anfitrión pulsa la píldora del juego para cambiarlo', () => {
    const props = renderLobby();
    const pill = screen.getByRole('button', { name: 'Cambiar de juego. Ahora: El impostor' });
    expect(pill).toHaveTextContent('El impostorCambiar');
    expect(pill).toHaveClass('min-h-11', 'shadow-hard');
    fireEvent.click(pill);
    expect(props.onChangeGame).toHaveBeenCalledTimes(1);
  });

  it('para los demás la píldora solo dice a qué se juega', () => {
    renderLobby({
      snapshot: lobbySnapshot({ me: { user_id: ids.lucia, name: 'Lucía', is_host: false } }),
    });
    expect(screen.getByText('El impostor')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cambiar de juego/ })).not.toBeInTheDocument();
  });
});

describe('LobbyScreen: El lobo', () => {
  const inLunaLobby = (count: number) => {
    const snapshot = withPlayers(count);
    return lobbySnapshot({ ...snapshot, room: { ...snapshot.room, game: 'luna_llena' } });
  };

  it('pide al menos 4 jugadores', () => {
    renderLobby({ snapshot: inLunaLobby(2) });
    expect(screen.getByText(/Hacen falta al menos 4 jugadores: faltan 2/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeDisabled();
  });

  it('enseña los lobos, los roles especiales y la composición', () => {
    renderLobby({
      snapshot: inLunaLobby(9),
      lunaConfig: { wolves: 2, roles: ['seer', 'protector', 'hunter'] },
    });
    expect(
      screen.getByText('2 lobos · vidente · protector · cazador · 4 aldeanos'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Protector/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Bufón/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Más impostores' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Rondas' })).not.toBeInTheDocument();
    expect(screen.queryByText(/vidente, el pueblo|lobos de lo habitual/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeEnabled();
  });

  it('cambiar lobos o roles avisa con la composición nueva', () => {
    const props = renderLobby({
      snapshot: inLunaLobby(9),
      lunaConfig: { wolves: 2, roles: ['seer', 'protector', 'hunter'] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Más lobos' }));
    expect(props.onLunaConfigChange).toHaveBeenLastCalledWith({
      wolves: 3,
      roles: ['seer', 'protector', 'hunter'],
    });
    fireEvent.click(screen.getByRole('button', { name: /Cupido/ }));
    expect(props.onLunaConfigChange).toHaveBeenLastCalledWith({
      wolves: 2,
      roles: ['seer', 'protector', 'hunter', 'cupid'],
    });
    fireEvent.click(screen.getByRole('button', { name: /Vidente/ }));
    expect(props.onLunaConfigChange).toHaveBeenLastCalledWith({
      wolves: 2,
      roles: ['protector', 'hunter'],
    });
  });

  it('se pueden pedir todos los lobos menos uno, y con mayoría se avisa sin bloquear', () => {
    renderLobby({ snapshot: inLunaLobby(5), lunaConfig: { wolves: 4, roles: ['seer'] } });
    expect(screen.getByRole('button', { name: 'Más lobos' })).toBeDisabled();
    expect(screen.getByText('4 lobos · vidente')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Hay 4 lobos para 5 jugadores. Ya son mayoría: la partida terminará en cuanto amanezca. Podéis jugar igualmente.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeEnabled();
  });

  it('sin vidente ni aldeanos se puede empezar, con el aviso de la vidente', () => {
    renderLobby({
      snapshot: inLunaLobby(5),
      lunaConfig: { wolves: 1, roles: ['protector', 'hunter', 'jester', 'cupid'] },
    });
    expect(screen.getByText('1 lobo · protector · cazador · bufón · Cupido')).toBeInTheDocument();
    expect(screen.getByText('Sin vidente, el pueblo juega a ciegas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeEnabled();
  });

  it('con más lobos de lo habitual se avisa', () => {
    renderLobby({ snapshot: inLunaLobby(9), lunaConfig: { wolves: 3, roles: ['seer'] } });
    expect(
      screen.getByText('Hay más lobos de lo habitual. Lo va a tener difícil el pueblo.'),
    ).toBeInTheDocument();
  });

  it('con más roles que jugadores no se puede empezar y se dice por qué', () => {
    renderLobby({
      snapshot: inLunaLobby(6),
      lunaConfig: { wolves: 2, roles: ['seer', 'protector', 'hunter', 'jester', 'cupid'] },
    });
    expect(screen.getByText('Hay más roles que jugadores. Quita alguno.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeDisabled();
  });

  it('sin lobos ni asesino no se puede empezar', () => {
    renderLobby({ snapshot: inLunaLobby(6), lunaConfig: { wolves: 0, roles: ['seer'] } });
    expect(screen.getByRole('button', { name: 'Menos lobos' })).toBeDisabled();
    expect(
      screen.getByText('Sin lobos ni asesino no hay partida. Pon al menos uno.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeDisabled();
  });

  it('sin lobos y con el asesino sí, y se ofrecen la bruja y el asesino', () => {
    renderLobby({ snapshot: inLunaLobby(6), lunaConfig: { wolves: 0, roles: ['killer'] } });
    expect(screen.getByRole('button', { name: /Bruja/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Asesino/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('asesino · 5 aldeanos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeEnabled();
  });

  it('el botón de la recomendada pone la de ese número de jugadores', () => {
    const props = renderLobby({
      snapshot: inLunaLobby(9),
      lunaConfig: { wolves: 5, roles: [] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Usar la recomendada' }));
    expect(props.onLunaConfigChange).toHaveBeenLastCalledWith({
      wolves: 2,
      roles: ['seer', 'protector', 'hunter'],
    });
  });
});

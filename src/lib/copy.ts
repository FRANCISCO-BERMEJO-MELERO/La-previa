/**
 * Todos los textos visibles de la aplicación. Ningún componente escribe cadenas propias.
 * Salen de docs/referencia-pantallas.html y de docs/CONTEXTO.md §6.
 */

export const errorCodes = [
  'not_authenticated',
  'room_not_found',
  'room_full',
  'name_invalid',
  'name_taken',
  'not_member',
  'not_host',
  'invalid_phase',
  'not_enough_players',
  'invalid_impostor_count',
  'not_participant',
  'not_alive',
  'already_voted',
  'invalid_target',
  'cannot_kick',
  'invalid_game',
] as const;

export type ErrorCode = (typeof errorCodes)[number];

const errors: Record<ErrorCode | 'unknown' | 'offline', string> = {
  not_authenticated: 'No hemos podido identificarte. Recarga la página y vuelve a intentarlo.',
  room_not_found: 'No existe ninguna sala con ese código. Revisa las letras y prueba otra vez.',
  room_full: 'La sala está llena: ya hay 16 jugadores. Pedid que alguien salga o cread otra.',
  name_invalid: 'El nombre tiene que tener entre 1 y 14 caracteres.',
  name_taken: 'Ese nombre ya está cogido en esta sala. Prueba con otro nombre.',
  not_member: 'Ya no estás en esta sala. Vuelve a entrar con el código.',
  not_host: 'Eso solo lo puede hacer quien lleva la sala.',
  invalid_phase: 'La partida ha avanzado mientras tanto. Ya tienes la pantalla al día.',
  not_enough_players: 'Hacen falta al menos 3 jugadores para empezar.',
  invalid_impostor_count: 'Tiene que haber menos impostores que jugadores normales.',
  not_participant: 'No juegas en esta partida. Entrarás en la siguiente.',
  not_alive: 'Estás fuera en esta partida, así que ya no votas.',
  already_voted: 'Ya has votado en esta ronda.',
  invalid_target: 'No puedes votar a esa persona. Elige a otra.',
  cannot_kick: 'Durante la partida solo puedes echar a alguien que se haya desconectado.',
  invalid_game: 'Ese juego todavía no está disponible.',
  unknown: 'Algo ha fallado. Vuelve a intentarlo en un momento.',
  offline: 'Sin conexión. Seguimos intentándolo; no cierres la página.',
};

export const copy = {
  brand: 'La Previa',
  meta: {
    title: 'La Previa',
    description: 'Juegos de fiesta para jugar en persona, cada uno con su móvil. Sin registro.',
  },
  errors,

  home: {
    tagline: 'Juegos de fiesta',
    title: 'La Previa',
    intro: 'Para jugar en persona, cada uno con su móvil. Sin registro.',
    codeLabel: 'Código de la sala',
    join: 'Unirse',
    or: 'o empieza tú',
    create: 'Crear sala',
  },

  name: {
    title: '¿Cómo te llamas?',
    label: 'Tu nombre',
    hint: 'Así te verán los demás. El nombre no puede repetirse dentro de la sala.',
    taken: (name: string) => `Ya hay un ${name} en esta sala. Prueba con otro nombre.`,
    submit: 'Entrar',
  },

  room: {
    pill: (code: string) => `Sala ${code}`,
    leave: 'Salir de la sala',
    leaveTitle: '¿Salir de la sala?',
    leaveText: 'Si estáis en mitad de una partida, contará como que te has ido.',
    leaveConfirm: 'Salir',
    cancel: 'Cancelar',
    loading: 'Cargando la sala…',
    failedTitle: 'No hemos podido entrar',
    retry: 'Reintentar',
    notFoundTitle: 'Esta sala no existe',
    notFoundText: 'Puede que el código esté mal o que la sala se haya cerrado.',
    backHome: 'Volver al inicio',
  },

  games: {
    title: '¿A qué jugamos?',
    chosen: 'Elegido',
    soon: 'Próximamente',
    open: 'Abrir la sala',
    impostor: {
      name: 'El impostor',
      description: 'Todos conocen la palabra menos uno. Descubrid quién disimula.',
      players: 'De 3 a 16 jugadores',
    },
    upcoming: ['¿Quién lo dijo?', 'Palabras prohibidas', 'La bomba', '¿Qué prefieres?'],
    covers: { quote: '¿?', banned: 'Palabra', optionA: 'A', optionB: 'B' },
  },

  lobby: {
    codeLabel: 'Código de la sala',
    copyLink: 'Copiar enlace',
    linkCopied: 'Enlace copiado',
    showQr: 'Mostrar QR',
    qrTitle: 'Escanea para entrar',
    close: 'Cerrar',
    players: 'Jugadores',
    count: (current: number, max: number) => `${String(current)} de ${String(max)}`,
    host: 'Anfitrión',
    disconnected: 'Sin conexión',
    kick: (name: string) => `Echar a ${name}`,
    kickTitle: (name: string) => `¿Echar a ${name}?`,
    kickText: 'Podrá volver a entrar con el código si quiere.',
    kickConfirm: 'Echar',
    impostors: 'Impostores',
    fewerImpostors: 'Menos impostores',
    moreImpostors: 'Más impostores',
    minus: '−',
    plus: '+',
    start: 'Empezar partida',
    waitingHost: (host: string) => `${host} empezará la partida`,
  },

  late: {
    pill: 'Partida en curso',
    title: (name: string) => `Llegas tarde, ${name}`,
    text: 'Ya estás en la sala. Juegas en la siguiente partida, en cuanto termine esta.',
    playing: (count: number) => `${String(count)} jugando`,
    waiting: 'Esperando a que termine la partida',
  },

  deal: {
    wordPill: 'Tu palabra',
    category: 'Categoría',
    playerHint: 'Hablad las rondas que queráis. Cuando el grupo lo decida, pasa a la votación.',
    impostorPill: 'Eres el',
    impostorTitle: 'Impostor',
    impostorClue: 'Tu pista: la categoría',
    impostorHint: 'No conoces la palabra. Escucha, disimula y que no te pillen.',
    connected: (count: number) => `${String(count)} conectados`,
    openVoting: 'Pasar a votación',
    waitingVote: (host: string) => `${host} decide cuándo se vota`,
  },

  vote: {
    pill: 'Votación',
    title: '¿Quién es el impostor?',
    yourVote: 'Tu voto',
    hint: (name: string) =>
      `${name}, no puedes votar por ti. El voto es secreto hasta que se cierre la votación.`,
    submit: (target: string) => `Votar a ${target}`,
    choose: 'Elige a quién votar',
    received: 'Votos recibidos',
    count: (votes: number, total: number) => `${String(votes)} de ${String(total)}`,
    mine: (target: string) => `Tu voto: ${target}`,
    voted: 'Ha votado',
    thinking: 'Pensando',
    closeHint: 'Puedes cerrar la votación con los votos que haya.',
    close: 'Cerrar votación',
    waitingClose: (host: string) => `${host} cerrará la votación`,
  },

  reveal: {
    expelled: 'El grupo expulsa a',
    left: 'Se ha ido',
    wasImpostor: 'Era el impostor',
    wasNotImpostor: 'No era el impostor',
    continues: (players: number, impostors: number) =>
      `La partida sigue. Quedan ${String(players)} jugadores y ${String(impostors)} ${
        impostors === 1 ? 'impostor' : 'impostores'
      } entre ellos.`,
    gameOver: 'Se acabó la partida.',
    keepTalking: 'Seguir hablando',
    seeResult: 'Ver resultado',
    waitingHost: (host: string) => `${host} decide cuándo seguir`,
  },

  tie: {
    title: 'Empate',
    text: (names: readonly string[]) =>
      `${joinNames(names)} empatan a votos. Esta vez no se expulsa a nadie.`,
    noVotes: 'Nadie ha votado. Esta vez no se expulsa a nadie.',
    hint: 'Volved a hablar y votad otra vez cuando queráis.',
  },

  out: {
    pill: 'Mirando',
    title: (name: string) => `Estás fuera, ${name}`,
    text: 'Sigues viendo la partida, pero ya no votas. Vuelves a jugar en la siguiente.',
    stillPlaying: 'Siguen jugando',
    talking: 'El grupo está hablando',
    voting: 'El grupo está votando',
  },

  result: {
    groupWins: 'Gana el grupo',
    impostorWins: 'Gana el impostor',
    impostorsWin: 'Ganan los impostores',
    won: '¡Has ganado!',
    lost: 'Has perdido',
    finished: 'Fin de la partida',
    impostorWas: 'El impostor era',
    impostorsWere: 'Los impostores eran',
    wordWas: 'La palabra era',
    impostorsEqual: 'Quedaban tantos impostores como jugadores normales.',
    noImpostorsLeft: 'No queda ningún impostor en la partida.',
    changeGame: 'Cambiar de juego',
    playAgain: 'Volver a jugar',
    waitingHost: (host: string) => `${host} decide si se vuelve a jugar`,
  },

  // Solo para la página interna de componentes, que no existe en producción.
  dev: {
    title: 'Componentes',
    sections: {
      buttons: 'Botones',
      cards: 'Tarjetas',
      pills: 'Píldoras',
      avatars: 'Avatares',
      chips: 'Fichas de jugador',
      waiting: 'Caja de espera',
      fields: 'Campos de texto',
      dialog: 'Diálogo',
    },
    disabled: 'Desactivado',
    openDialog: 'Abrir diálogo',
    dialogText: 'Contenido del diálogo.',
  },
} as const;

/** Error de una acción: un código de la base de datos, falta de red o algo inesperado. */
export type ActionError = ErrorCode | 'offline' | 'unknown';

export function errorMessage(error: ActionError): string {
  return errors[error];
}

const errorCodeSet: ReadonlySet<string> = new Set(errorCodes);

export function isErrorCode(code: string): code is ErrorCode {
  return errorCodeSet.has(code);
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1) ?? ''}`;
}

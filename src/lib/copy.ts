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
  'invalid_rounds',
  'invalid_answer',
  'already_answered',
  'is_author',
  'invalid_clue',
  'not_arbiter',
  'is_guesser',
  'invalid_option',
] as const;

export type ErrorCode = (typeof errorCodes)[number];

const errors: Record<ErrorCode | 'unknown' | 'offline', string> = {
  not_authenticated: 'No hemos podido identificarte. Recarga la página y vuelve a intentarlo.',
  room_not_found: 'No existe ninguna sala con ese código. Revisa las letras y prueba otra vez.',
  room_full: 'La sala está llena: ya hay 16 jugadores. Pedid que alguien salga o cread otra.',
  name_invalid: 'El nombre tiene que tener entre 1 y 14 caracteres. Prueba con uno más corto.',
  name_taken: 'Ese nombre ya está cogido en esta sala. Prueba con otro nombre.',
  not_member: 'Ya no estás en esta sala. Vuelve a entrar con el código.',
  not_host: 'Eso solo lo puede hacer quien lleva la sala. Pídeselo a quien la lleva.',
  invalid_phase: 'La partida ha avanzado mientras tanto. Ya tienes la pantalla al día.',
  not_enough_players:
    'Hacen falta al menos 3 jugadores para empezar. Comparte el código con alguien más.',
  invalid_impostor_count:
    'Tiene que haber menos impostores que jugadores normales. Baja el número de impostores.',
  not_participant: 'No juegas en esta partida. Entrarás en la siguiente.',
  not_alive: 'Estás fuera en esta partida, así que ya no votas. Vuelves a jugar en la siguiente.',
  already_voted: 'Ya has votado en esta ronda. Espera a que se cierre la votación.',
  invalid_target: 'No puedes votar a esa persona. Elige a otra.',
  cannot_kick:
    'Durante la partida solo puedes echar a alguien que se haya desconectado. Espera a que termine.',
  invalid_game: 'Ese juego no está disponible. Elige otro en el selector de juegos.',
  invalid_rounds: 'Las partidas son de 5, 10 o 15 rondas. Elige una de esas opciones.',
  invalid_answer: 'La respuesta tiene que tener entre 1 y 80 caracteres. Escribe algo más corto.',
  already_answered: 'Ya has enviado tu respuesta en esta ronda. Espera a que respondan los demás.',
  is_author: 'Esa respuesta es la tuya, así que no votas. Disimula mientras votan los demás.',
  invalid_clue:
    'La pista tiene que ser una sola palabra de hasta 20 letras, y no puede ser la palabra secreta ni contenerla. Prueba con otra.',
  not_arbiter: 'Eso lo decide quien arbitra la ronda. Pídeselo a quien arbitra.',
  is_guesser: 'Esta ronda te toca adivinar, así que no das pista. Espera a ver las de los demás.',
  invalid_option: 'Esa opción no existe. Elige una de las dos.',
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
    probable: {
      name: '¿Quién es más probable que…?',
      description: 'Sale una pregunta y todos señaláis a alguien a la vez.',
      players: 'De 3 a 16 jugadores',
    },
    quien_lo_dijo: {
      name: '¿Quién lo dijo?',
      description: 'Todos escribís una respuesta y adivináis de quién es la que sale.',
      players: 'De 3 a 16 jugadores',
    },
    una_pista: {
      name: 'Una sola pista',
      description: 'Uno adivina la palabra con una pista de cada uno. Las repetidas no valen.',
      players: 'De 3 a 16 jugadores',
    },
    que_prefieres: {
      name: '¿Qué prefieres?',
      description: 'Sale un dilema y cada uno elige en secreto. Puntúa quien piensa como la mayoría.',
      players: 'De 3 a 16 jugadores',
    },
    upcoming: { banned: 'Palabras prohibidas' },
    covers: {
      quote: '¿?',
      banned: 'Palabra',
      optionA: 'A',
      optionB: 'B',
      point: '+1',
      clue: 'Pista',
    },
  },

  lobby: {
    codeLabel: 'Código de la sala',
    copyLink: 'Copiar enlace',
    linkCopied: 'Enlace copiado',
    copyFailed: (code: string) => `No se ha podido copiar el enlace. Diles el código: ${code}.`,
    shareTitle: (code: string) => `Únete a la sala ${code} en La Previa`,
    qrLabel: (code: string) => `Código QR para entrar en la sala ${code}`,
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
    rounds: 'Rondas',
    roundsOption: (rounds: number) => `${String(rounds)} rondas`,
    start: 'Empezar partida',
    needPlayers: (missing: number) =>
      missing === 1
        ? 'Hacen falta al menos 3 jugadores: falta 1. Comparte el código para que entre alguien más.'
        : `Hacen falta al menos 3 jugadores: faltan ${String(missing)}. Comparte el código para que entren.`,
    waitingHost: (host: string) => `${host} empezará la partida`,
  },

  late: {
    pill: 'Partida en curso',
    title: (name: string) => `Llegas tarde, ${name}`,
    text: 'Ya estás en la sala. Juegas en la siguiente partida, en cuanto termine esta.',
    textRound: 'Ya estás en la sala. Juegas desde la siguiente ronda, en cuanto empiece.',
    waitingRound: 'Esperando a la siguiente ronda',
    playing: (count: number) => `${String(count)} jugando`,
    waiting: 'Esperando a que termine la partida',
  },

  deal: {
    wordPill: 'Tu palabra',
    category: 'Categoría',
    playerHint: 'Hablad las rondas que queráis. Cuando el grupo lo decida, pasa a la votación.',
    impostorPill: 'Eres el',
    // Guion blando para que, si no cabe, se parta como en la referencia: IMPOS-TOR.
    impostorTitle: 'Impos­tor',
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
    equals: '=',
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
    winnerPill: (winner: 'group' | 'impostors', impostorCount: number) =>
      winner === 'group'
        ? 'Gana el grupo'
        : impostorCount === 1
          ? 'Gana el impostor'
          : 'Ganan los impostores',
    impostorsLabel: (count: number) => (count === 1 ? 'El impostor era' : 'Los impostores eran'),
    names: (names: readonly string[]) => joinNames(names),
    won: '¡Has ganado!',
    lost: 'Has perdido',
    finished: 'Fin de la partida',
    wordWas: 'La palabra era',
    impostorsEqual: 'Quedaban tantos impostores como jugadores normales.',
    changeGame: 'Cambiar de juego',
    playAgain: 'Volver a jugar',
    waitingHost: (host: string) => `${host} decide si se vuelve a jugar`,
  },

  rounds: {
    pill: (round: number, total: number) => `Ronda ${String(round)} de ${String(total)}`,
    points: (points: number) => (points === 1 ? '1 punto' : `${String(points)} puntos`),
    ranking: 'Clasificación',
    position: (position: number) => `${String(position)}.º`,
    noWinner: 'Nadie ha sumado puntos',
    next: 'Siguiente ronda',
    names: (names: readonly string[]) => joinNames(names),
  },

  probable: {
    question: '¿Quién es más probable que…',
    prompt: (text: string) => `…${text}?`,
    voteHint: 'Puedes votarte a ti. Nadie ve tu voto hasta el recuento.',
    voted: 'Han votado',
    roundWinner: (count: number) => (count === 1 ? 'El más votado' : 'Empate en cabeza'),
    noVotes: 'Nadie ha votado',
    noVotesText: 'Esta ronda nadie se lleva el punto.',
    votesFrom: (votes: number, names: readonly string[]) =>
      `${votes === 1 ? '1 voto' : `${String(votes)} votos`} de ${joinNames(names)}`,
    point: '+1',
    resultPill: 'El más probable de la noche',
  },

  quienLoDijo: {
    question: '¿Quién lo dijo?',
    answerLabel: 'Tu respuesta',
    answerHint: 'Una línea, hasta 80 caracteres. Nadie sabrá que es tuya… de momento.',
    send: 'Enviar respuesta',
    mine: (text: string) => `Tu respuesta: ${text}`,
    responded: 'Han respondido',
    respondedDetail: 'Ha respondido',
    closeWriting: 'Cerrar respuestas',
    closeWritingHint: 'Puedes cerrar con las respuestas que haya.',
    waitingWriting: (host: string) => `${host} cerrará las respuestas`,
    voted: 'Han votado',
    voteHint: 'No puedes votarte a ti. Si aciertas quién lo escribió, sumas un punto.',
    yours: 'Es la tuya',
    yoursText: 'Disimula mientras los demás intentan adivinar quién lo escribió.',
    saidBy: 'Lo dijo',
    correct: (names: readonly string[]) => `Acertaron: ${joinNames(names)}`,
    nobodyCorrect: 'Nadie acertó',
    wrong: (names: readonly string[]) => `Fallaron: ${joinNames(names)}`,
    annulled: 'Ronda anulada',
    annulledText: 'Se ha ido quien escribió la respuesta. Esta ronda no suma puntos.',
    otherAnswers: 'Las demás respuestas',
    answers: 'Las respuestas',
    quoted: (text: string) => `«${text}»`,
    resultPill: 'Gana la partida',
  },

  unaPista: {
    guesserPill: (name: string) => `Adivina ${name}`,
    guesserTitle: 'Te toca adivinar',
    guesserText:
      'No mires los móviles de los demás. Cuando se enseñen las pistas, dirás tu respuesta en voz alta.',
    guesserReview: 'Los demás están revisando las pistas.',
    wordPill: 'La palabra',
    category: (category: string) => `Categoría: ${category}`,
    clueLabel: 'Tu pista',
    clueHint: 'Una sola palabra, hasta 20 letras. Si coincide con la de otro, se anulan las dos.',
    send: 'Enviar pista',
    mine: (text: string) => `Tu pista: ${text}`,
    cluesGiven: 'Han dado pista',
    clueGivenDetail: 'Ha dado pista',
    closeWriting: 'Cerrar pistas',
    closeWritingHint: 'Puedes cerrar con las pistas que haya.',
    waitingWriting: (arbiter: string) => `${arbiter} cerrará las pistas`,
    reviewTitle: 'Revisad las pistas',
    reviewHint:
      'Las repetidas ya están anuladas. Toca una para anularla o recuperarla si se parece demasiado a otra.',
    cancelled: 'Anulada',
    cancel: (name: string, text: string) => `Anular la pista de ${name}: ${text}`,
    restore: (name: string, text: string) => `Recuperar la pista de ${name}: ${text}`,
    showClues: 'Enseñar pistas',
    waitingShow: (arbiter: string) => `${arbiter} enseñará las pistas`,
    guessTitle: 'Tus pistas',
    guessHint: 'Di tu respuesta en voz alta.',
    noClues: 'Todas las pistas se han anulado. Toca adivinar sin ayuda.',
    waitingMark: (arbiter: string) => `${arbiter} dirá si has acertado`,
    markHint: 'Cuando diga su respuesta en voz alta, marca cómo ha ido.',
    correct: 'Acertada',
    wrong: 'Fallada',
    pass: 'Pasa',
    waitingGuess: (arbiter: string) => `${arbiter} marcará la respuesta`,
    waitingNext: (arbiter: string) => `${arbiter} decide cuándo seguir`,
    outcome: { correct: '¡Acertada!', wrong: 'Fallada', pass: 'Ha pasado' },
    wordWas: 'La palabra era',
    clues: 'Las pistas',
    scorePill: 'Marcador del equipo',
    score: (score: number, total: number) => `${String(score)} de ${String(total)}`,
    verdict: (score: number, total: number) => {
      const ratio = total === 0 ? 0 : score / total;
      if (ratio >= 1) return '¡Pleno! No se os escapa ni una.';
      if (ratio > 0.7) return 'Muy bien. Os entendéis casi sin hablar.';
      if (ratio > 0.4) return 'No está mal. Hay química, pero se puede afinar.';
      return 'Hay que practicar más. La próxima sale mejor.';
    },
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

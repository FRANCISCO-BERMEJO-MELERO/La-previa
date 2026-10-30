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
  'not_describer',
  'not_watcher',
  'invalid_categories',
  'invalid_vote_seconds',
  'invalid_avatar',
  'invalid_config',
  'already_acted',
  'same_as_last_night',
  'not_hunter',
  'not_witch',
  'potion_used',
  'invalid_mode',
  'invalid_teams',
  'not_your_turn',
  'column_full',
  'invalid_column',
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
  not_describer: 'Eso lo decide quien describe esta ronda. Tú adivina en voz alta.',
  invalid_avatar: 'Ese avatar no está en la galería. Elige otro.',
  already_acted: 'Ya has hecho lo tuyo esta noche. Espera al amanecer.',
  same_as_last_night: 'Anoche ya protegiste a esa persona. Esta noche elige a otra.',
  not_hunter: 'Solo dispara el cazador. Espera a que elija.',
  not_witch: 'Las pociones son cosa de la bruja. Haz lo tuyo esta noche.',
  potion_used: 'Esa poción ya la has gastado. Solo servía una vez.',
  invalid_mode: 'Esa modalidad no existe. Elige 1 contra 1 o 2 contra 2.',
  invalid_teams:
    'Los equipos no cuadran: en 1 contra 1 va una persona por equipo y en 2 contra 2, dos, todas de la sala. Revisa quién juega.',
  not_your_turn: 'Ahora no te toca. Espera a que sea tu turno.',
  column_full: 'Esa columna ya está llena. Elige otra.',
  invalid_column: 'Esa columna no existe. Elige una de las tres.',
  invalid_config:
    'Con esa composición no se puede jugar. Revisa los lobos y los roles: tiene que haber alguna amenaza, algún jugador que no sea lobo y sitio para todos los roles.',
  invalid_vote_seconds: 'El tiempo para votar es de 30, 60 o 90 segundos. Elige uno de esos.',
  invalid_categories: 'Alguna temática ya no está disponible. Revisa las temáticas elegidas.',
  not_watcher: 'Eso lo canta quien vigila las palabras prohibidas. Avísale si oyes una.',
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
    scan: 'Escanear QR',
    or: 'o empieza tú',
    create: 'Crear sala',
  },

  avatars: {
    legend: 'Tu avatar',
    initial: 'Sin avatar: tu inicial',
    // Inicial de ejemplo mientras aún no se ha escrito el nombre.
    placeholder: '?',
    change: 'Cambiar tu avatar',
    done: 'Listo',
    names: {
      olive: 'Aceituna con gafas',
      churro: 'Churro con chocolate',
      croquette: 'Croqueta con gorra',
      dice: 'Dado con cadena',
      watermelon: 'Sandía con chicle',
      lemon: 'Limón con chicle',
      omelette: 'Tortilla con bigote',
      popcorn: 'Palomita',
      lantern: 'Farolillo',
      flip_flop: 'Chancla',
      moon: 'Luna con antifaz',
    },
  },

  howTo: {
    button: 'Cómo se juega',
    title: (game: string) => `Cómo se juega a ${game}`,
    close: 'Cerrar',
    previous: 'Anterior',
    next: 'Siguiente',
    progress: (step: number, total: number) => `Paso ${String(step)} de ${String(total)}`,
    // Textos de las ilustraciones de los pasos.
    art: {
      word: 'Pizza',
      secret: '?',
      clue: 'Queso',
      otherClue: 'Horno',
      dots: '…',
      out: 'Fuera',
      who: '¿Quién…?',
      answerA: 'Volar',
      answerB: 'Siesta',
      unknown: '¿?',
      point: '+1',
      optionA: 'A',
      optionB: 'B',
      or: 'o',
      forbiddenA: 'Queso',
      forbiddenB: 'Italia',
      forbiddenCall: '¡Prohibida!',
      shout: '¡Pizza!',
      mayor: 'Alcalde',
      double: '×2',
      dadosScore: '24',
      dadosOrder: ['A1', 'B1', 'A2', 'B2'],
    },
    steps: {
      impostor: [
        {
          title: 'Una palabra para todos',
          text: 'Todos reciben la misma palabra menos el impostor, que solo recibe una pista.',
        },
        {
          title: 'Pistas por turnos',
          text: 'Por turnos, cada uno dice una palabra relacionada. El impostor escucha e intenta disimular.',
        },
        {
          title: 'Votad y expulsad',
          text: 'Votáis a quién expulsar. Si echáis a todos los impostores gana el grupo; si quedan tantos impostores como jugadores, ganan ellos.',
        },
      ],
      probable: [
        {
          title: 'Sale una pregunta',
          text: '«¿Quién es más probable que…?» y una situación. Sin pensarlo mucho.',
        },
        {
          title: 'Señala a alguien',
          text: 'Cada uno vota en secreto a quien más le pega. Puedes votarte a ti.',
        },
        {
          title: 'Un punto al más votado',
          text: 'El más votado de cada ronda suma un punto. Al final, gana el más probable de la noche.',
        },
      ],
      quien_lo_dijo: [
        {
          title: 'Todos responden',
          text: 'Sale una pregunta y cada uno escribe una respuesta corta.',
        },
        {
          title: '¿De quién es?',
          text: 'Sale una respuesta sin nombre y los demás votáis quién la escribió. Su autor disimula.',
        },
        {
          title: 'Puntos',
          text: 'Un punto por acertar el autor. El autor gana uno por cada uno que falle.',
        },
      ],
      una_pista: [
        {
          title: 'A uno le toca adivinar',
          text: 'Por turnos, uno adivina una palabra que todos los demás ven.',
        },
        {
          title: 'Una pista cada uno',
          text: 'Los demás escriben una sola palabra de pista. Las repetidas se anulan, así que pensad distinto.',
        },
        {
          title: 'Todos en el mismo equipo',
          text: 'Quien adivina ve las pistas que quedan y responde en voz alta. Cada acierto suma para el grupo.',
        },
      ],
      que_prefieres: [
        { title: 'Dos opciones', text: 'Sale un dilema: ¿esto o aquello?' },
        {
          title: 'Elige en secreto',
          text: 'Cada uno elige la suya. Nadie ve qué ha elegido el resto hasta el reparto.',
        },
        {
          title: 'Gana la mayoría',
          text: 'Quien elige lo mismo que la mayoría se lleva un punto. Si empatan, nadie.',
        },
      ],
      palabras_prohibidas: [
        {
          title: 'Uno describe',
          text: 'A uno le toca describir una palabra sin decir ninguna de las cinco prohibidas.',
        },
        {
          title: 'Otro vigila',
          text: 'El siguiente ve la tarjeta y pulsa «¡Prohibida!» si se le escapa alguna.',
        },
        {
          title: 'Los demás adivinan',
          text: 'Decid la respuesta en voz alta. Quien acierta y quien describe se llevan un punto cada uno.',
        },
      ],
      luna_llena: [
        {
          title: 'Cada uno, su carta',
          text: 'Recibes un rol en secreto. Los lobos se conocen entre ellos; nadie más sabe nada de nadie.',
        },
        {
          title: 'De noche, todos al móvil',
          text: 'Todos tocan algo para que nadie se delate. Los lobos eligen víctima, el asesino también, y los roles con poder lo usan: la bruja tiene una poción de vida y otra de muerte.',
        },
        {
          title: 'De día, a juicio',
          text: 'Se anuncia quién ha muerto. Elegís alcalde, debatís con los móviles boca abajo y votáis a quién ahorcar.',
        },
        {
          title: 'Quién gana',
          text: 'El pueblo, si caen los lobos y el asesino. Los lobos, si llegan a ser tantos como el resto y no queda asesino. El asesino, si queda solo. El bufón, si lo ahorcáis.',
        },
      ],
      dados: [
        {
          title: 'Un dado en cada turno',
          text: 'Cuando te toca, el dado ya está tirado. Tú solo eliges en cuál de tus tres columnas va.',
        },
        {
          title: 'Los iguales multiplican',
          text: 'Los dados iguales de una misma columna multiplican: un 6 vale 6; dos, 24, y tres, 54. Una columna con 5, 5 y 4 vale 24, y con 2, 3 y 6, 11. Las parejas se ven en azul y los tríos, en verde.',
        },
        {
          title: 'Rompe los del rival',
          text: 'Al poner un dado, se rompen todos los del mismo número que el rival tenga en esa columna. Sus otras columnas no se tocan.',
        },
        {
          title: 'Final y equipos',
          text: 'Se acaba cuando un tablero se llena, y gana quien tenga más puntos. En 2 contra 2 cada equipo comparte tablero y os vais turnando: uno de A, uno de B, el otro de A, el otro de B.',
        },
      ],
    },
  },

  scan: {
    title: 'Escanear QR',
    close: 'Cerrar',
    status: {
      starting: 'Abriendo la cámara…',
      scanning: 'Apunta al QR de la sala que te enseñan.',
      not_room: 'Ese QR no es de una sala de La Previa. Prueba con otro.',
      denied:
        'No tenemos permiso para usar la cámara. Dáselo en los ajustes del navegador o escribe el código de la sala.',
      unavailable: 'No podemos usar la cámara en este móvil. Escribe el código de la sala.',
    },
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
    change: 'Cambiar',
    changeLabel: (game: string) => `Cambiar de juego. Ahora: ${game}`,
    leave: 'Salir de la sala',
    leaveShort: 'Salir',
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
      description:
        'Sale un dilema y cada uno elige en secreto. Puntúa quien piensa como la mayoría.',
      players: 'De 3 a 16 jugadores',
    },
    palabras_prohibidas: {
      name: 'Palabras prohibidas',
      description: 'Uno describe una palabra sin decir las cinco prohibidas. Los demás adivinan.',
      players: 'De 3 a 16 jugadores',
    },
    luna_llena: {
      name: 'El lobo',
      description:
        'Un pueblo con lobos escondidos. De noche matan; de día se ahorca a un sospechoso.',
      players: 'De 4 a 16 jugadores',
    },
    dados: {
      name: 'A dados',
      description: 'Coloca dados en tus columnas y rompe los del rival.',
      players: '2 o 4',
    },
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
    voteTime: 'Tiempo para votar',
    voteTimeOption: (seconds: number | null) => (seconds === null ? 'Sin' : `${String(seconds)} s`),
    voteTimeLabel: (seconds: number | null) =>
      seconds === null
        ? 'Sin tiempo: cierra el anfitrión'
        : `${String(seconds)} segundos para votar`,
    topics: 'Temáticas',
    topicsSummary: (chosen: readonly string[]) =>
      chosen.length === 0
        ? 'Todas'
        : chosen.length === 1
          ? (chosen[0] ?? '')
          : `${String(chosen.length)} temáticas`,
    topicsChoose: 'Elegir',
    topicsChooseLabel: 'Elegir temáticas',
    topicsHint: 'Marca las que quieras. Sin marcar ninguna, la palabra sale de todas.',
    topicsAll: 'Todas',
    topicsDone: 'Listo',
    rounds: 'Rondas',
    roundsOption: (rounds: number) => `${String(rounds)} rondas`,
    start: 'Empezar partida',
    needPlayers: (min: number, missing: number) =>
      missing === 1
        ? `Hacen falta al menos ${String(min)} jugadores: falta 1. Comparte el código para que entre alguien más.`
        : `Hacen falta al menos ${String(min)} jugadores: faltan ${String(missing)}. Comparte el código para que entren.`,
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
    impostorClue: 'Tu pista',
    impostorHint: 'No conoces la palabra. Escucha, disimula y que no te pillen.',
    // La tapa del reparto: la misma para todos, no dice si debajo hay palabra o impostor.
    holdTitle: 'Mantén pulsado',
    holdHint: 'para ver tu palabra',
    connected: (count: number) => `${String(count)} conectados`,
    openVoting: 'Pasar a votación',
    waitingVote: (host: string) => `${host} decide cuándo se vota`,
  },

  vote: {
    pill: 'Votación',
    pillTimed: (seconds: number) =>
      `Votación · ${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`,
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
    nextRound: 'Siguiente ronda',
    roundPill: (round: number) => `Ronda ${String(round)} de la partida`,
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
    /** Lo que va delante del nombre en la posición dada al listarlos uno a uno: «, » o « y ». */
    nameJoin: (index: number, count: number) =>
      index === 0 ? '' : index === count - 1 ? ' y ' : ', ',
    won: '¡Has ganado!',
    lost: 'Has perdido',
    finished: 'Fin de la partida',
    wordWas: 'La palabra era',
    impostorsEqual: 'Quedaban tantos impostores como jugadores normales.',
    changeGame: 'Cambiar de juego',
    playAgain: 'Volver a jugar',
    waitingHost: (host: string) => `${host} elige si jugáis otra o cambiáis de juego`,
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

  quePrefieres: {
    question: '¿Qué prefieres?',
    or: 'o',
    letter: (option: 'a' | 'b') => (option === 'a' ? 'A' : 'B'),
    optionLabel: (option: 'a' | 'b', text: string) =>
      `Opción ${option === 'a' ? 'A' : 'B'}: ${text}`,
    chooseHint: 'Nadie ve lo que eliges hasta el reparto. Puntúa quien piensa como la mayoría.',
    choose: 'Elige una opción',
    submit: (option: 'a' | 'b') => `Elegir la ${option === 'a' ? 'A' : 'B'}`,
    chosen: 'Han elegido',
    chosenDetail: 'Ha elegido',
    mine: (text: string) => `Tu elección: ${text}`,
    closeHint: 'Puedes cerrar con las elecciones que haya.',
    close: 'Cerrar elecciones',
    waitingClose: (host: string) => `${host} cerrará las elecciones`,
    majorityPill: 'Gana la mayoría',
    tie: 'Empate',
    tieText: 'Las dos opciones empatan: esta ronda nadie puntúa.',
    nobody: 'Nadie ha elegido',
    nobodyText: 'Esta ronda nadie se lleva el punto.',
    count: (count: number) => (count === 1 ? '1 lo prefiere' : `${String(count)} lo prefieren`),
    none: 'Nadie',
    point: '+1',
    resultPill: 'Quien mejor conoce al grupo',
  },

  palabrasProhibidas: {
    describePill: 'Describes tú',
    watchPill: 'Vigilas tú',
    word: 'La palabra',
    forbidden: 'No se puede decir',
    describeHint: 'Descríbela sin decir ninguna de estas. Cuando alguien acierte, márcalo.',
    whoGuessed: '¿Quién ha acertado?',
    chooseGuesser: 'Toca a quien ha acertado',
    guessed: (name: string) => `Ha acertado ${name}`,
    picked: 'Acierta',
    pass: 'Pasar',
    watchHint: (describer: string) =>
      `Si ${describer} dice alguna de estas palabras, pulsa el botón y la ronda acaba.`,
    forbiddenButton: '¡Prohibida!',
    guessPill: 'Te toca adivinar',
    guessTitle: 'Adivina en voz alta',
    guessText: (describer: string) =>
      `${describer} describe una palabra. Grita la respuesta en cuanto la sepas.`,
    watcherIs: (watcher: string) => `Vigila las prohibidas: ${watcher}`,
    waitingMark: (describer: string) => `Esperando a que ${describer} marque quién acierta`,
    guessedPill: (name: string) => `Lo acierta ${name}`,
    guessedPoints: (guesser: string, describer: string) =>
      `+1 para ${guesser} y +1 para ${describer}`,
    forbiddenPill: 'Se dijo una prohibida',
    passedPill: (describer: string) => `${describer} ha pasado`,
    noPoints: 'Esta ronda nadie puntúa.',
    resultPill: 'Gana la partida',
  },

  lunaLlena: {
    roles: {
      wolf: {
        name: 'Lobo',
        effect:
          'Cada noche elegís entre los lobos a quién devorar. De día, disimula y que ahorquen a otro.',
        art: 'Cabeza de lobo bajo la luna',
      },
      villager: {
        name: 'Aldeano',
        effect:
          'No tienes poderes. Tu arma es hablar: descubre a los lobos y convence al resto de a quién ahorcar.',
        art: 'Aldeano con sombrero de paja',
      },
      seer: {
        name: 'Vidente',
        effect:
          'Cada noche eliges a un jugador y descubres si es lobo. Úsalo con cabeza: si te delatas, eres la siguiente cena.',
        art: 'Bola de cristal con un ojo',
      },
      protector: {
        name: 'Protector',
        effect:
          'Cada noche proteges a un jugador del ataque de los lobos. Puedes protegerte a ti, pero no a la misma persona dos noches seguidas.',
        art: 'Escudo',
      },
      hunter: {
        name: 'Cazador',
        effect:
          'Si mueres, de noche o en la horca, disparas antes de caer y te llevas contigo a quien elijas.',
        art: 'Punto de mira',
      },
      jester: {
        name: 'Bufón',
        effect:
          'Ganas tú, y solo tú, si el pueblo te ahorca. Hazte el sospechoso sin que se note. Si te matan los lobos, pierdes.',
        art: 'Bufón con gorro de tres puntas',
      },
      cupid: {
        name: 'Cupido',
        effect:
          'La primera noche eliges a dos enamorados. Si uno muere, el otro muere con él. Después eres un aldeano más.',
        art: 'Corazón atravesado por una flecha',
      },
      witch: {
        name: 'Bruja',
        effect:
          'Tienes dos pociones para toda la partida. La de vida salva a quien vayan a devorar los lobos esta noche; la de muerte se lleva a quien tú elijas. Cada una sirve una sola vez.',
        art: 'Caldero entre dos pociones',
      },
      killer: {
        name: 'Asesino',
        effect:
          'No estás con nadie. Cada noche eliges a quién matar. Ganas si al final eres el único que queda en pie.',
        art: 'Máscara blanca',
      },
    },
    // Cómo se nombra cada rol en el guion: "Era vidente".
    spokenRoles: {
      wolf: 'lobo',
      villager: 'aldeano',
      seer: 'vidente',
      protector: 'protector',
      hunter: 'cazador',
      jester: 'bufón',
      cupid: 'Cupido',
      witch: 'bruja',
      killer: 'asesino',
    },
    // Guion del narrador (docs/PLAN-5.md §4). Solo información pública.
    script: {
      roles:
        'Bienvenidos al pueblo. Mirad vuestra carta sin que nadie la vea. Entre vosotros hay lobos.',
      nightFirst:
        'Cae la primera noche. Coged todos el móvil y seguid las instrucciones. Nada de mirar al de al lado.',
      night: 'Cae la noche sobre el pueblo. Todos al móvil.',
      dawnDeath: (name: string, role: string) => `Amanece. ${name} no ha despertado. Era ${role}.`,
      dawnDeaths: (names: readonly string[]) =>
        `Amanece con malas noticias. Han muerto ${joinNames(names)}.`,
      dawnNone: 'Amanece y, por una vez, estáis todos. Alguien ha tenido suerte esta noche.',
      hunter: (name: string) =>
        `${name} era el cazador, y no piensa irse solo. Elige a quién te llevas.`,
      hunterShot: (name: string, role: string) =>
        `El cazador dispara. ${name} cae con él. Era ${role}.`,
      loverDeath: (name: string, role: string) =>
        `${name} no soporta la pérdida y muere de pena. Era ${role}.`,
      left: (name: string, role: string) => `${name} se ha ido del pueblo. Era ${role}.`,
      mayor: 'El pueblo necesita un alcalde. Su voto valdrá doble. Postulaos, convenced y votad.',
      mayorElected: (name: string) => `${name} es vuestro alcalde.`,
      day: 'Móviles boca abajo. Tenéis que decidir a quién acusáis. Hablad.',
      voting: 'Se acabó la charla. Coged el móvil y votad a quién acusáis.',
      defense: (name: string) =>
        `El pueblo acusa a ${name}. ${name}, tienes la palabra: son tus últimas palabras.`,
      noAccused: 'El pueblo no se pone de acuerdo. Hoy no se ahorca a nadie.',
      executed: (name: string, role: string) =>
        `El pueblo ha hablado. ${name} sube a la horca. Era ${role}.`,
      winVillage: 'No queda ni un lobo. El pueblo puede dormir tranquilo.',
      winWolves: 'Los lobos ya son mayoría. El pueblo ha caído.',
      winJester: 'Habéis ahorcado al bufón, que es justo lo que quería. Gana él solo.',
      winKiller: 'Solo queda uno en pie, y no es precisamente un vecino ejemplar. Gana el asesino.',
    },
    teams: {
      village: 'Bando del pueblo',
      wolves: 'Bando de los lobos',
      solo: 'Juegas solo',
    },
    card: {
      youAre: 'Eres',
      pack: 'Tu manada',
      packNames: (names: readonly string[]) =>
        names.length === 0 ? 'Cazas solo: no hay más lobos.' : joinNames(names),
    },
    deal: {
      waiting: 'El narrador dará paso a la noche',
      peek: 'Mantén para ver tu carta',
      peekOpen: 'Suelta para ocultarla',
    },
    night: {
      pill: (night: number) => `Noche ${String(night)}`,
      titles: {
        wolf: 'Elegid víctima',
        seer: '¿A quién miras?',
        protector: '¿A quién proteges?',
        cupid: 'Elige a dos',
        witch: 'Tus pociones',
        killer: '¿A quién matas?',
        suspect: '¿De quién sospechas?',
      },
      hints: {
        witch:
          'Usa la de vida para salvar a la víctima de los lobos, elige a quién envenenar, las dos o ninguna.',
        killer: 'Elige a quién matas esta noche. Nadie sabrá que has sido tú.',
        wolf: 'Marca a quién devoráis. Ves lo que marca tu manada y puedes cambiar hasta el amanecer.',
        seer: 'Elige a alguien y sabrás al momento si es lobo.',
        protector: 'Si los lobos van a por esa persona, esta noche no muere nadie.',
        cupid: 'Serán los enamorados: si uno muere, el otro también. Puedes ser uno de ellos.',
        suspect: 'Marca a quien te parezca sospechoso. Que nadie sepa qué eres.',
      },
      choose: 'Jugadores',
      confirm: 'Confirmar',
      changeMark: 'Cambiar la marca',
      marks: (names: readonly string[]) => `Lo marca ${joinNames(names)}`,
      mine: 'Elegido',
      done: {
        wolf: (name: string) => `Tu marca: ${name}`,
        seer: (name: string) => `Has mirado a ${name}`,
        protector: (name: string) => `Proteges a ${name}`,
        cupid: (a: string, b: string) => `Has enamorado a ${a} y ${b}`,
        killer: (name: string) => `Vas a por ${name}`,
        suspect: (name: string) => `Sospechas de ${name}`,
      },
      witch: {
        victim: (name: string) => `Los lobos van a por ${name}`,
        undecided: 'Los lobos aún no se han decidido',
        life: 'Usar la poción de vida',
        lifeUsed: 'Ya no te queda la poción de vida',
        poisonTitle: 'Poción de muerte: elige a quién, o a nadie',
        poisonUsed: 'Ya no te queda la poción de muerte',
        done: (life: boolean, poisoned: string | null) =>
          life && poisoned
            ? `Usas la poción de vida y envenenas a ${poisoned}`
            : life
              ? 'Usas la poción de vida'
              : poisoned
                ? `Envenenas a ${poisoned}`
                : 'Esta noche no usas ninguna poción',
      },
      waiting: 'Espera al amanecer',
      pending: (count: number) =>
        count === 0
          ? 'Ya ha actuado todo el pueblo'
          : count === 1
            ? 'Falta 1 por actuar'
            : `Faltan ${String(count)} por actuar`,
      seerTitle: 'Lo que has visto',
      seerResult: (night: number, name: string, isWolf: boolean) =>
        `Noche ${String(night)} · ${name}: ${isWolf ? 'es lobo' : 'no es lobo'}`,
    },
    dawn: {
      pill: 'Amanece',
      quietTitle: 'Noche tranquila',
      quietText: 'Esta noche no ha muerto nadie.',
      deadStamp: 'Ha muerto',
      deathsTitle: 'Esta noche',
      // Los vivos solo saben que alguien ha muerto de noche; los muertos, por qué.
      causes: {
        night: 'Ha muerto esta noche',
        wolves: 'Devorado por los lobos',
        killer: 'Asesinado',
        poison: 'Envenenado',
        hanged: 'Ahorcado',
        hunter: 'Abatido por el cazador',
        heartbreak: 'Muerto de pena',
        left: 'Se ha ido del pueblo',
      },
      witchSaved: (name: string) => `Tu poción de vida ha salvado a ${name}.`,
      witchPoisoned: (name: string) => `Tu poción de muerte ha caído sobre ${name}.`,
      potionsLeft: (life: boolean, poison: boolean) =>
        life && poison
          ? 'Te quedan las dos pociones.'
          : life
            ? 'Te queda la poción de vida.'
            : poison
              ? 'Te queda la poción de muerte.'
              : 'Ya no te quedan pociones.',
      lover: (name: string) => `Estás enamorado de ${name}. Si uno muere, el otro también.`,
      cupid: (a: string, b: string) => `Has enamorado a ${a} y ${b}. Nadie más lo sabe.`,
    },
    waitingNarrator: (host: string) => `Escucha a ${host}, que narra`,
    mayorBadge: 'Alcalde',
    vote: {
      mayorPill: 'Alcalde',
      mayorTitle: '¿Quién es el alcalde?',
      mayorHint: 'Su voto valdrá doble al acusar. Puedes votarte a ti.',
      accusePill: (day: number) => `Día ${String(day)}`,
      accuseTitle: '¿A quién acusáis?',
      accuseHint:
        'El más votado dirá sus últimas palabras y subirá a la horca. Con empate, hoy no se ahorca a nadie.',
      choose: 'Jugadores',
      submit: (name: string) => `Votar a ${name}`,
      choosePlayer: 'Elige a alguien',
      voted: (name: string) => `Has votado a ${name}`,
      pending: (count: number) =>
        count === 0
          ? 'Ya ha votado todo el pueblo'
          : count === 1
            ? 'Falta 1 por votar'
            : `Faltan ${String(count)} por votar`,
    },
    day: {
      pill: (day: number) => `Día ${String(day)}`,
      title: 'Móviles boca abajo',
      text: 'Hablad. Decidid a quién acusáis. El narrador abrirá la votación.',
      mayor: (name: string) => `Alcalde: ${name}`,
      noMayor: 'Sin alcalde',
      mayorVotesTitle: 'Así se eligió al alcalde',
    },
    defense: {
      pill: 'Defensa',
      accused: (name: string) => `Acusado: ${name}`,
      speak: (name: string) => `${name} dice sus últimas palabras.`,
      youSpeak: 'Te acusan a ti. Di tus últimas palabras: después, a la horca.',
      noAccused: 'Sin acusado',
      noAccusedText: 'Empate o nadie ha votado. Hoy no se ahorca a nadie.',
      votesTitle: 'Quién votó a quién',
      votes: (count: number) => (count === 1 ? '1 voto' : `${String(count)} votos`),
      double: '×2',
      noVotes: 'Nadie ha votado.',
    },
    execution: {
      pill: 'Ejecución',
      hanged: 'A la horca',
      left: 'Se ha ido',
    },
    hunter: {
      pill: 'Cazador',
      title: 'Dispara antes de caer',
      hint: 'Elige a quién te llevas contigo.',
      submit: (name: string) => `Disparar a ${name}`,
      chooseTarget: 'Elige a quién',
      waiting: (name: string) => `${name}, el cazador, elige a quién se lleva`,
    },
    spectator: {
      pill: 'Has muerto',
      title: 'Ahora lo ves todo',
      text: 'No puedes hablar del juego ni dar pistas. Mira y disfruta.',
      rolesTitle: 'Quién es quién',
      lovers: (a: string, b: string) => `Enamorados: ${a} y ${b}`,
      actionsTitle: 'Esta noche',
      action: (who: string, target: string) => `${who} marca a ${target}`,
      pair: (who: string, a: string, b: string) => `${who} enamora a ${a} y ${b}`,
      witch: (who: string, life: boolean, poisoned: string | null) =>
        life && poisoned
          ? `${who} usa la poción de vida y envenena a ${poisoned}`
          : life
            ? `${who} usa la poción de vida`
            : poisoned
              ? `${who} envenena a ${poisoned}`
              : `${who} no usa pociones`,
      potions: (life: boolean, poison: boolean) =>
        life && poison
          ? 'A la bruja le quedan las dos pociones'
          : life
            ? 'A la bruja le queda la poción de vida'
            : poison
              ? 'A la bruja le queda la poción de muerte'
              : 'A la bruja no le quedan pociones',
      noActions: 'Nadie ha actuado todavía.',
      dead: 'Muerto',
    },
    result: {
      winner: {
        village: 'Gana el pueblo',
        wolves: 'Ganan los lobos',
        jester: 'Gana el bufón',
        killer: 'Gana el asesino',
      },
      lovers: (a: string, b: string) => `Los enamorados eran ${a} y ${b}`,
      rolesTitle: 'Todos los roles',
      dead: 'Muerto',
    },
    narrator: {
      title: 'Lee en voz alta',
      startNight: 'Que caiga la noche',
      forceDawn: 'Hacer que amanezca',
      next: 'Continuar',
      skipHunter: 'Seguir sin disparo',
      closeVote: 'Cerrar la votación',
      openVoting: 'Abrir votación',
      toGallows: 'A la horca',
    },
    lobby: {
      wolves: 'Lobos',
      fewerWolves: 'Menos lobos',
      moreWolves: 'Más lobos',
      optionalRoles: 'Roles especiales',
      composition: 'Composición',
      // "2 lobos · vidente · protector · cazador · 4 aldeanos". Lo que no hay no se nombra.
      compositionLine: (wolves: number, roles: readonly string[], villagers: number) =>
        [
          ...(wolves === 0 ? [] : [wolves === 1 ? '1 lobo' : `${String(wolves)} lobos`]),
          ...roles,
          ...(villagers === 0
            ? []
            : [villagers === 1 ? '1 aldeano' : `${String(villagers)} aldeanos`]),
        ].join(' · '),
      useRecommended: 'Usar la recomendada',
      problems: {
        no_threat: 'Sin lobos ni asesino no hay partida. Pon al menos uno.',
        all_wolves: 'No pueden ser todos lobos. Quita alguno.',
        too_many_roles: 'Hay más roles que jugadores. Quita alguno.',
      },
      warnings: {
        wolves_majority: (wolves: number, players: number) =>
          `Hay ${String(wolves)} lobos para ${String(players)} jugadores. Ya son mayoría: la partida terminará en cuanto amanezca. Podéis jugar igualmente.`,
        wolves_above_recommended: 'Hay más lobos de lo habitual. Lo va a tener difícil el pueblo.',
        no_seer: 'Sin vidente, el pueblo juega a ciegas.',
      },
    },
  },

  dados: {
    pill: (mode: '1v1' | '2v2') => (mode === '1v1' ? 'A dados' : 'A dados · 2 contra 2'),
    lobby: {
      mode: 'Modalidad',
      modes: { '1v1': '1 contra 1', '2v2': '2 contra 2' },
      who: 'Quién juega',
      choices: { A: 'A', B: 'B', watch: 'Mira' },
      choiceLabel: (name: string, choice: 'A' | 'B' | 'watch') =>
        choice === 'watch' ? `${name} mira` : `${name} juega en el equipo ${choice}`,
      count: (side: 'A' | 'B', count: number, size: number) =>
        `${side} · ${String(count)}/${String(size)}`,
      countLabel: (side: 'A' | 'B', count: number, size: number) =>
        `Equipo ${side}: ${String(count)} de ${String(size)}`,
      mismatch: {
        '1v1': 'En 1 contra 1 va una persona en cada equipo. El resto mira.',
        '2v2': 'En 2 contra 2 van dos personas en cada equipo. El resto mira.',
      },
    },
    team: (side: 'A' | 'B') => `Equipo ${side}`,
    you: 'Tú',
    yourTeam: 'Tu equipo',
    names: (names: readonly string[]) => joinNames(names),
    board: (label: string) => `Tablero de ${label}`,
    teamBoard: (side: 'A' | 'B') => `Tablero del equipo ${side}`,
    teamScores: (side: 'A' | 'B') => `Puntos por columna del equipo ${side}`,
    myBoard: { '1v1': 'Tu tablero', '2v2': 'Tablero de tu equipo' },
    myScores: { '1v1': 'Tus puntos por columna', '2v2': 'Puntos por columna de tu equipo' },
    total: (label: string, points: number) => `${label}: ${String(points)} puntos`,
    column: (column: number, points: number) =>
      `Columna ${String(column)}: ${String(points)} puntos`,
    place: (column: number) => `Colocar el dado en la columna ${String(column)}`,
    die: (value: number) => `Dado: ${String(value)}`,
    // Sello sobre la columna con pareja o trío, y los puntos que pierde el rival al romperle dados.
    combo: (count: 2 | 3) => `×${String(count)}`,
    lost: (points: number) => `−${String(points)}`,
    empty: 'Hueco libre',
    myTurn: 'Te toca',
    myTurnText: (value: number) =>
      `Te ha salido un ${String(value)}. Toca la columna donde lo quieres.`,
    waiting: (name: string, value: number) =>
      `Le toca a ${name}. Decide dónde va el ${String(value)}.`,
    spectatorWaiting: (name: string) => `Le toca a ${name}`,
    turnOrder: 'Orden de turnos',
    arrow: '→',
    scores: (label: string) => `Puntos por columna de ${label}`,
    result: {
      finished: 'Fin de la partida',
      won: { '1v1': 'Has ganado', '2v2': 'Habéis ganado' },
      lost: { '1v1': 'Has perdido', '2v2': 'Habéis perdido' },
      tie: 'Empate',
      wins: (label: string) => `Gana ${label}`,
      teamLabel: (side: 'A' | 'B') => `el equipo ${side}`,
      score: (names: readonly string[], high: number, low: number) =>
        `${joinNames(names)} se ${names.length === 1 ? 'lleva' : 'llevan'} la mesa: ${String(high)} a ${String(low)}.`,
      tieScore: (points: number) => `Empate a ${String(points)} puntos.`,
      forfeit: (name: string, label: string) => `${name} se ha ido. Gana ${label} por abandono.`,
      winner: 'Ganador',
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
      lunaCards: 'Cartas del lobo',
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

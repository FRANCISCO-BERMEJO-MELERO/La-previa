-- Esquema de Luna llena (docs/PLAN-5.md §6). No es un juego por rondas: no usa total_rounds,
-- game_rounds ni votes, y guarda su estado en tablas propias.

alter table public.rooms drop constraint rooms_game_check;
alter table public.rooms add constraint rooms_game_check check (
  game in (
    'impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas',
    'luna_llena'
  )
);

alter table public.games drop constraint games_game_type_check;
alter table public.games add constraint games_game_type_check check (
  game_type in (
    'impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas',
    'luna_llena'
  )
);

alter table public.games drop constraint games_phase_check;
alter table public.games add constraint games_phase_check check (
  case game_type
    when 'impostor' then phase in ('talking', 'voting', 'reveal', 'finished')
    when 'probable' then phase in ('voting', 'reveal', 'finished')
    when 'quien_lo_dijo' then phase in ('writing', 'voting', 'reveal', 'finished')
    when 'una_pista' then phase in ('writing', 'review', 'guessing', 'reveal', 'finished')
    when 'que_prefieres' then phase in ('voting', 'reveal', 'finished')
    when 'palabras_prohibidas' then phase in ('describing', 'reveal', 'finished')
    when 'luna_llena' then phase in (
      'roles', 'night', 'dawn', 'hunter', 'mayor', 'day', 'voting', 'defense', 'verdict',
      'execution', 'finished'
    )
  end
);

alter table public.games drop constraint games_total_rounds_check;
alter table public.games add constraint games_total_rounds_check check (
  case
    when game_type in ('impostor', 'luna_llena') then total_rounds is null
    else total_rounds is not null and total_rounds in (5, 10, 15) and round <= total_rounds
  end
);

alter table public.game_roles drop constraint game_roles_role_check;
alter table public.game_roles add constraint game_roles_role_check check (
  role in (
    'player', 'impostor',
    'wolf', 'villager', 'seer', 'protector', 'hunter', 'jester', 'cupid'
  )
);

-- Una fila por partida. winner se fija al ahorcar al bufón o al comprobar la victoria.
create table public.luna_state (
  game_id uuid primary key references public.games (id) on delete cascade,
  night integer not null default 0 check (night >= 0),
  day integer not null default 0 check (day >= 0),
  mayor_id uuid,
  accused_id uuid,
  lover_a uuid,
  lover_b uuid,
  last_protected_id uuid,
  hunter_pending boolean not null default false,
  return_phase text check (return_phase in ('night', 'dawn', 'day', 'execution')),
  announcement jsonb,
  config jsonb not null,
  winner text check (winner in ('village', 'wolves', 'jester')),
  check ((lover_a is null) = (lover_b is null)),
  check (lover_a <> lover_b),
  foreign key (game_id, mayor_id) references public.game_players (game_id, user_id),
  foreign key (game_id, accused_id) references public.game_players (game_id, user_id),
  foreign key (game_id, lover_a) references public.game_players (game_id, user_id),
  foreign key (game_id, lover_b) references public.game_players (game_id, user_id),
  foreign key (game_id, last_protected_id) references public.game_players (game_id, user_id)
);

alter table public.luna_state enable row level security;

-- Lo que hace cada vivo una noche. target2_id solo lo usa Cupido la primera noche.
create table public.luna_night_actions (
  game_id uuid not null,
  night integer not null check (night >= 1),
  user_id uuid not null,
  target_id uuid not null,
  target2_id uuid,
  primary key (game_id, night, user_id),
  check (target2_id <> target_id),
  foreign key (game_id, user_id) references public.game_players (game_id, user_id) on delete cascade,
  foreign key (game_id, target_id) references public.game_players (game_id, user_id) on delete cascade,
  foreign key (game_id, target2_id) references public.game_players (game_id, user_id) on delete cascade
);

alter table public.luna_night_actions enable row level security;

-- Votos de un día: alcalde y acusación llevan objetivo; el veredicto, condenar o salvar.
create table public.luna_votes (
  game_id uuid not null,
  day integer not null check (day >= 1),
  kind text not null check (kind in ('mayor', 'accuse', 'verdict')),
  voter_id uuid not null,
  target_id uuid,
  condemn boolean,
  primary key (game_id, day, kind, voter_id),
  check (case kind when 'verdict' then target_id is null and condemn is not null
    else target_id is not null and condemn is null end),
  check (kind <> 'accuse' or target_id <> voter_id),
  foreign key (game_id, voter_id) references public.game_players (game_id, user_id) on delete cascade,
  foreign key (game_id, target_id) references public.game_players (game_id, user_id) on delete cascade
);

alter table public.luna_votes enable row level security;

revoke all on public.luna_state, public.luna_night_actions, public.luna_votes from anon, authenticated;

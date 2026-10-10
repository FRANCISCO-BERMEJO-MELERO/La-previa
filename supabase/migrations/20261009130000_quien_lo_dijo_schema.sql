-- Esquema de ¿Quién lo dijo? (docs/JUEGOS.md §4 y §6).

alter table public.rooms drop constraint rooms_game_check;
alter table public.rooms add constraint rooms_game_check
  check (game in ('impostor', 'probable', 'quien_lo_dijo'));

alter table public.games drop constraint games_game_type_check;
alter table public.games add constraint games_game_type_check
  check (game_type in ('impostor', 'probable', 'quien_lo_dijo'));

alter table public.games drop constraint games_phase_check;
alter table public.games add constraint games_phase_check check (
  case game_type
    when 'impostor' then phase in ('talking', 'voting', 'reveal', 'finished')
    when 'probable' then phase in ('voting', 'reveal', 'finished')
    when 'quien_lo_dijo' then phase in ('writing', 'voting', 'reveal', 'finished')
  end
);

alter table public.prompts drop constraint prompts_game_type_check;
alter table public.prompts add constraint prompts_game_type_check
  check (game_type in ('probable', 'quien_lo_dijo'));

-- Lo que escribe cada jugador en una ronda. El texto llega ya recortado y validado por la acción.
create table public.answers (
  game_id uuid not null,
  round integer not null check (round >= 1),
  user_id uuid not null,
  text text not null check (char_length(text) between 1 and 80 and text = btrim(text)),
  cancelled boolean not null default false,
  primary key (game_id, round, user_id),
  foreign key (game_id, user_id) references public.game_players (game_id, user_id) on delete cascade
);

alter table public.answers enable row level security;

revoke all on public.answers from anon, authenticated;

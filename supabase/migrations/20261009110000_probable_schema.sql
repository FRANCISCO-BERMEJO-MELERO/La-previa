-- Esquema de ¿Quién es más probable que…? (docs/JUEGOS.md §3 y §6), el primer juego por rondas.
-- Las partidas de El impostor quedan exactamente igual de restringidas que antes.

alter table public.rooms drop constraint rooms_game_check;
alter table public.rooms add constraint rooms_game_check check (game in ('impostor', 'probable'));

alter table public.games drop constraint games_game_type_check;
alter table public.games add constraint games_game_type_check
  check (game_type in ('impostor', 'probable'));

alter table public.games drop constraint games_phase_check;
alter table public.games add constraint games_phase_check check (
  case game_type
    when 'impostor' then phase in ('talking', 'voting', 'reveal', 'finished')
    when 'probable' then phase in ('voting', 'reveal', 'finished')
  end
);

-- Palabra, impostores y bando ganador son solo de El impostor.
alter table public.games alter column word_id drop not null;
alter table public.games alter column impostor_count drop not null;
alter table public.games drop constraint games_check;
alter table public.games add constraint games_impostor_columns_check check (
  case game_type
    when 'impostor' then word_id is not null
      and impostor_count is not null
      and (phase = 'finished') = (winner is not null)
    else word_id is null and impostor_count is null and winner is null
  end
);

-- Rondas: nulas en El impostor; 5, 10 o 15 en los juegos por rondas.
alter table public.games add column total_rounds integer;
alter table public.games add constraint games_total_rounds_check check (
  case game_type
    when 'impostor' then total_rounds is null
    else total_rounds is not null and total_rounds in (5, 10, 15) and round <= total_rounds
  end
);

alter table public.game_players add column score integer not null default 0 check (score >= 0);

create table public.prompts (
  id bigint generated always as identity primary key,
  game_type text not null check (game_type in ('probable')),
  text text not null check (char_length(text) between 1 and 200),
  active boolean not null default true,
  unique (game_type, text)
);

alter table public.prompts enable row level security;

-- Qué salió en cada ronda y cómo acabó. subject_id es el protagonista de la ronda en los juegos
-- que lo tienen; result se escribe al cerrar la ronda.
create table public.game_rounds (
  game_id uuid not null references public.games (id) on delete cascade,
  round integer not null check (round >= 1),
  prompt_id bigint references public.prompts (id),
  word_id bigint references public.words (id),
  subject_id uuid,
  result jsonb,
  primary key (game_id, round)
);

create index game_rounds_prompt_id_idx on public.game_rounds (prompt_id);

alter table public.game_rounds enable row level security;

revoke all on public.prompts, public.game_rounds from anon, authenticated;

-- En El impostor nadie se vota a sí mismo; en ¿Quién es más probable que…? sí se puede.
-- Un check no puede mirar el juego de la partida, así que lo hace un disparador con el mismo error.
alter table public.votes drop constraint votes_check;

create function private.forbid_impostor_self_vote()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.voter_id = new.target_id
    and exists (select 1 from public.games g where g.id = new.game_id and g.game_type = 'impostor') then
    raise exception using errcode = 'check_violation', message = 'votes_check';
  end if;
  return new;
end;
$$;

revoke execute on function private.forbid_impostor_self_vote() from public, anon, authenticated;

create trigger votes_forbid_impostor_self_vote
before insert or update on public.votes
for each row execute function private.forbid_impostor_self_vote();

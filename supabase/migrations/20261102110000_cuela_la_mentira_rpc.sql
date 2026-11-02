-- Cuela la mentira (docs/PLAN-9.md §2 a §5): preguntas, opciones de cada ronda, votos y acciones,
-- sobre las auxiliares de los juegos por rondas.

-- Datos ------------------------------------------------------------------------------------------

-- Banco de preguntas. `truth` es la respuesta real tal como se enseña; `accepted`, otras formas de
-- escribirla que también cuentan como la verdad.
create table public.cuela_questions (
  id bigint generated always as identity primary key,
  text text not null unique check (char_length(text) between 1 and 200),
  truth text not null check (char_length(truth) between 1 and 80),
  accepted text[] not null default '{}',
  explanation text not null check (char_length(explanation) between 1 and 300),
  source text not null check (char_length(source) >= 1),
  distractors text[] not null check (cardinality(distractors) >= 2),
  active boolean not null default true
);

alter table public.cuela_questions enable row level security;
revoke all on public.cuela_questions from anon, authenticated;

alter table public.game_rounds add column cuela_question_id bigint references public.cuela_questions (id);
create index game_rounds_cuela_question_id_idx on public.game_rounds (cuela_question_id);

-- Orden de llegada de las respuestas: entre mentiras iguales se enseña la primera.
alter table public.answers add column created_at timestamptz not null default clock_timestamp();

-- Opciones de una ronda: la verdad, una por mentira distinta y las de la casa. El identificador es
-- aleatorio y la posición se baraja, para que nada delate cuál es la verdad.
create table public.cuela_options (
  option_id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  round integer not null check (round >= 1),
  text text not null check (char_length(text) between 1 and 80),
  kind text not null check (kind in ('truth', 'lie', 'house')),
  -- Nula solo mientras se preparan las opciones, antes de barajar.
  position integer check (position >= 1),
  unique (game_id, round, position)
);

create index cuela_options_round_idx on public.cuela_options (game_id, round);

create table public.cuela_option_authors (
  option_id uuid not null references public.cuela_options (option_id) on delete cascade,
  game_id uuid not null,
  user_id uuid not null,
  primary key (option_id, user_id),
  foreign key (game_id, user_id) references public.game_players (game_id, user_id) on delete cascade
);

create table public.cuela_votes (
  game_id uuid not null,
  round integer not null check (round >= 1),
  user_id uuid not null,
  option_id uuid not null references public.cuela_options (option_id) on delete cascade,
  primary key (game_id, round, user_id),
  foreign key (game_id, user_id) references public.game_players (game_id, user_id) on delete cascade
);

create index cuela_votes_option_id_idx on public.cuela_votes (option_id);

alter table public.cuela_options enable row level security;
alter table public.cuela_option_authors enable row level security;
alter table public.cuela_votes enable row level security;
revoke all on public.cuela_options, public.cuela_option_authors, public.cuela_votes from anon, authenticated;

-- Normalización (docs/PLAN-9.md §3) ---------------------------------------------------------------

-- Forma con la que se comparan las mentiras entre sí y con la verdad: minúsculas, sin tildes ni
-- diéresis (la ñ se conserva), sin puntuación ni comillas, con los espacios colapsados y sin un
-- artículo al principio. No trata plurales, sinónimos ni significados.
create function private.normalize_answer(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    btrim(regexp_replace(
      regexp_replace(
        translate(lower(coalesce(raw, '')), 'áéíóúàèìòùâêîôûäëïöü', 'aeiouaeiouaeiouaeiou'),
        '[^a-z0-9ñ[:space:]]', '', 'g'
      ),
      '[[:space:]]+', ' ', 'g'
    )),
    '^(el|la|los|las|un|una|unos|unas) ', ''
  );
$$;

-- Reglas comunes de los juegos por rondas, ampliadas ----------------------------------------------

create or replace function private.first_phase(kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'probable' then 'voting'
    when 'quien_lo_dijo' then 'writing'
    when 'una_pista' then 'writing'
    when 'que_prefieres' then 'voting'
    when 'palabras_prohibidas' then 'describing'
    when 'cuela_la_mentira' then 'writing'
  end;
$$;

-- En la votación de Cuela la mentira se vota una opción, no a un jugador: va en su propia tabla.
create or replace function private.has_responded(game public.games, target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when game.phase = 'writing' or (game.game_type = 'que_prefieres' and game.phase = 'voting') then
      (game.game_type = 'una_pista' and private.round_subject(game) = target_user_id)
      or exists (
        select 1 from public.answers a
        where a.game_id = game.id and a.round = game.round and a.user_id = target_user_id
      )
    when game.game_type = 'cuela_la_mentira' and game.phase = 'voting' then exists (
      select 1 from public.cuela_votes v
      where v.game_id = game.id and v.round = game.round and v.user_id = target_user_id
    )
    when game.phase = 'voting' then
      (game.game_type = 'quien_lo_dijo' and private.round_subject(game) = target_user_id)
      or exists (
        select 1 from public.votes v
        where v.game_id = game.id and v.round = game.round and v.voter_id = target_user_id
      )
    else false
  end;
$$;

-- Pregunta de la ronda: al azar entre las que no han salido en la sala, mientras queden.
create function private.cuela_pick_question(target_room_id uuid)
returns bigint
language sql
volatile
set search_path = ''
as $$
  select q.id
  from public.cuela_questions q
  where q.active
  order by
    exists (
      select 1
      from public.game_rounds gr
      join public.games g on g.id = gr.game_id
      where g.room_id = target_room_id and gr.cuela_question_id = q.id
    ),
    pg_catalog.gen_random_uuid()
  limit 1;
$$;

-- En Cuela la mentira juegan como mucho 10: al abrir ronda siguen los que ya juegan y entran los
-- demás por orden de llegada hasta llenar las plazas. El resto mira hasta la siguiente partida.
create or replace function private.open_round(target_game_id uuid, new_round integer, leaving uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
begin
  update public.games g set round = new_round, phase = private.first_phase(g.game_type)
  where g.id = target_game_id
  returning g.* into game;

  insert into public.game_players (game_id, user_id, name)
  select game.id, rp.user_id, rp.name
  from public.room_players rp
  where rp.room_id = game.room_id and rp.user_id is distinct from leaving
    and (game.game_type <> 'cuela_la_mentira' or rp.user_id in (
      select seat.user_id
      from public.room_players seat
      left join public.game_players gp on gp.game_id = game.id and gp.user_id = seat.user_id
      where seat.room_id = game.room_id
      order by coalesce(gp.alive, false) desc, seat.joined_at, seat.user_id
      limit 10
    ))
  on conflict (game_id, user_id) do update set alive = true, name = excluded.name;

  insert into public.game_rounds (game_id, round, prompt_id, word_id, card_id, subject_id, cuela_question_id)
  values (
    game.id,
    new_round,
    private.pick_prompt(game.room_id, game.game_type),
    case when game.game_type = 'una_pista' then private.pick_word(game.room_id) end,
    case when game.game_type = 'palabras_prohibidas' then private.pick_card(game.room_id) end,
    case when game.game_type in ('una_pista', 'palabras_prohibidas') then private.next_subject(game.id, leaving) end,
    case when game.game_type = 'cuela_la_mentira' then private.cuela_pick_question(game.room_id) end
  );
end;
$$;

create or replace function private.start_round_game(room public.rooms, uid uuid, kind text, rounds integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games := private.current_game(room);
  new_game_id uuid;
  members integer := (select count(*) from public.room_players rp where rp.room_id = room.id);
begin
  perform private.require_host(room, uid);

  if game.id is not null and game.phase <> 'finished' then
    perform private.raise_error('invalid_phase');
  end if;

  if room.game <> kind then
    perform private.raise_error('invalid_game');
  end if;

  if members < 3 then
    perform private.raise_error('not_enough_players');
  end if;

  if kind = 'cuela_la_mentira' and members > 10 then
    perform private.raise_error('too_many_players');
  end if;

  if rounds is null or rounds not in (5, 10, 15) then
    perform private.raise_error('invalid_rounds');
  end if;

  insert into public.games (room_id, game_type, phase, total_rounds)
  values (room.id, kind, private.first_phase(kind), rounds)
  returning id into new_game_id;

  perform private.open_round(new_game_id, 1);
  update public.rooms r set current_game_id = new_game_id where r.id = room.id;
end;
$$;

-- Preparar las opciones ---------------------------------------------------------------------------

create function private.cuela_question(game public.games)
returns public.cuela_questions
language sql
stable
set search_path = ''
as $$
  select q.*
  from public.game_rounds gr
  join public.cuela_questions q on q.id = gr.cuela_question_id
  where gr.game_id = game.id and gr.round = game.round;
$$;

-- ¿Dice lo mismo que la verdad o que alguna de sus variantes?
create function private.cuela_is_truth(question public.cuela_questions, text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select private.normalize_answer(text) in (
    select private.normalize_answer(t) from unnest(question.truth || question.accepted) as t
  );
$$;

-- Al cerrar la escritura: la verdad, una opción por cada mentira distinta (las iguales se funden,
-- con todos sus autores y el texto de la primera que llegó) y, si no llegan a 3, distractores de la
-- casa que no repitan ninguna. Después se barajan.
create function private.cuela_close_writing_round(target_game_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
  question public.cuela_questions;
  lie record;
  distractor text;
  new_option uuid;
begin
  select g.* into game from public.games g where g.id = target_game_id;
  question := private.cuela_question(game);

  insert into public.cuela_options (game_id, round, text, kind)
  values (game.id, game.round, question.truth, 'truth');

  for lie in
    select
      (array_agg(a.text order by a.created_at, a.user_id))[1] as text,
      array_agg(a.user_id) as authors
    from public.answers a
    where a.game_id = game.id and a.round = game.round
    group by private.normalize_answer(a.text)
    order by min(a.created_at)
  loop
    insert into public.cuela_options (game_id, round, text, kind)
    values (game.id, game.round, lie.text, 'lie')
    returning option_id into new_option;
    insert into public.cuela_option_authors (option_id, game_id, user_id)
    select new_option, game.id, author from unnest(lie.authors) as author;
  end loop;

  foreach distractor in array question.distractors loop
    exit when (
      select count(*) from public.cuela_options o where o.game_id = game.id and o.round = game.round
    ) >= 3;
    if not exists (
      select 1 from public.cuela_options o
      where o.game_id = game.id and o.round = game.round
        and private.normalize_answer(o.text) = private.normalize_answer(distractor)
    ) then
      insert into public.cuela_options (game_id, round, text, kind)
      values (game.id, game.round, distractor, 'house');
    end if;
  end loop;

  update public.cuela_options o set position = shuffled.position
  from (
    select s.option_id, row_number() over (order by pg_catalog.gen_random_uuid()) as position
    from public.cuela_options s
    where s.game_id = game.id and s.round = game.round
  ) shuffled
  where o.option_id = shuffled.option_id;

  update public.games g set phase = 'voting' where g.id = game.id;
end;
$$;

-- Puntuar -----------------------------------------------------------------------------------------

-- Puntos de un jugador en la ronda: 2 si ha votado la verdad y 1 por cada voto a una opción suya.
create function private.cuela_points(game public.games, target_user_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select (
    2 * (
      select count(*)::integer
      from public.cuela_votes v
      join public.cuela_options o on o.option_id = v.option_id
      where v.game_id = game.id and v.round = game.round and v.user_id = target_user_id
        and o.kind = 'truth'
    )
  ) + (
    select count(*)::integer
    from public.cuela_votes v
    join public.cuela_option_authors oa on oa.option_id = v.option_id
    where v.game_id = game.id and v.round = game.round and oa.user_id = target_user_id
  );
$$;

-- Al cerrar la votación se suman los puntos de la ronda a los participantes activos, una sola vez:
-- la fase pasa a la revelación en la misma transacción. Quien se fue durante la votación no cobra.
create function private.cuela_close_voting_round(target_game_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
  points jsonb;
begin
  select g.* into game from public.games g where g.id = target_game_id;

  select coalesce(jsonb_agg(
    jsonb_build_object('user_id', gp.user_id, 'points', private.cuela_points(game, gp.user_id))
    order by rp.joined_at nulls last, gp.name, gp.user_id
  ), '[]'::jsonb)
  into points
  from public.game_players gp
  left join public.room_players rp on rp.room_id = game.room_id and rp.user_id = gp.user_id
  where gp.game_id = game.id and gp.alive;

  update public.game_players gp set score = gp.score + (earned.value ->> 'points')::integer
  from jsonb_array_elements(points) as earned(value)
  where gp.game_id = game.id and gp.user_id = (earned.value ->> 'user_id')::uuid;

  update public.game_rounds gr
  set result = jsonb_build_object(
    'points', points,
    'left_author_ids', (
      select coalesce(jsonb_agg(distinct oa.user_id), '[]'::jsonb)
      from public.cuela_option_authors oa
      join public.cuela_options o on o.option_id = oa.option_id
      join public.game_players gp on gp.game_id = oa.game_id and gp.user_id = oa.user_id
      where o.game_id = game.id and o.round = game.round and not gp.alive
    )
  )
  where gr.game_id = game.id and gr.round = game.round;

  update public.games g set phase = 'reveal' where g.id = game.id;
end;
$$;

create or replace function private.close_if_done(target_game_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
begin
  select g.* into game from public.games g where g.id = target_game_id;
  if not private.all_responded(game.id) then
    return;
  end if;

  if game.game_type = 'probable' and game.phase = 'voting' then
    perform private.probable_close_round(game.id);
  elsif game.game_type = 'quien_lo_dijo' and game.phase = 'writing' then
    perform private.quien_lo_dijo_close_writing_round(game.id);
  elsif game.game_type = 'quien_lo_dijo' and game.phase = 'voting' then
    perform private.quien_lo_dijo_close_voting_round(game.id);
  elsif game.game_type = 'una_pista' and game.phase = 'writing' then
    perform private.una_pista_close_writing_round(game.id);
  elsif game.game_type = 'que_prefieres' and game.phase = 'voting' then
    perform private.que_prefieres_close_round(game.id);
  elsif game.game_type = 'cuela_la_mentira' and game.phase = 'writing' then
    perform private.cuela_close_writing_round(game.id);
  elsif game.game_type = 'cuela_la_mentira' and game.phase = 'voting' then
    perform private.cuela_close_voting_round(game.id);
  end if;
end;
$$;

-- Salidas: en la votación de Cuela la mentira se borra el voto de quien se va, pero su opción se
-- queda (quitarla dejaría votos sin opción). El resto es la regla común.
create or replace function private.round_departure(game public.games, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if game.phase = 'finished' then
    return;
  end if;

  update public.game_players gp set alive = false
  where gp.game_id = game.id and gp.user_id = target_user_id and gp.alive;
  if not found then
    return;
  end if;

  if (select count(*) from public.game_players gp where gp.game_id = game.id and gp.alive) < 3 then
    update public.games g set phase = 'finished', finished_at = now() where g.id = game.id;
    return;
  end if;

  if game.game_type in ('una_pista', 'palabras_prohibidas') and game.phase <> 'reveal'
    and private.round_subject(game) = target_user_id then
    delete from public.answers a where a.game_id = game.id and a.round = game.round;
    delete from public.game_rounds gr where gr.game_id = game.id and gr.round = game.round;
    perform private.open_round(game.id, game.round, target_user_id);
    return;
  end if;

  if game.game_type = 'quien_lo_dijo' and game.phase = 'voting'
    and private.round_subject(game) = target_user_id then
    delete from public.votes v where v.game_id = game.id and v.round = game.round;
    update public.game_rounds gr set result = jsonb_build_object('annulled', true)
    where gr.game_id = game.id and gr.round = game.round;
    update public.games g set phase = 'reveal' where g.id = game.id;
    return;
  end if;

  if game.phase <> 'reveal' then
    delete from public.votes v
    where v.game_id = game.id
      and v.round = game.round
      and (v.voter_id = target_user_id or v.target_id = target_user_id);
    delete from public.cuela_votes v
    where v.game_id = game.id and v.round = game.round and v.user_id = target_user_id;
    if game.phase = 'writing' or game.game_type = 'que_prefieres' then
      delete from public.answers a
      where a.game_id = game.id and a.round = game.round and a.user_id = target_user_id;
    end if;
    perform private.close_if_done(game.id);
  end if;
end;
$$;

-- Acciones ----------------------------------------------------------------------------------------

create function public.cuela_start(room_id uuid, rounds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(cuela_start.room_id);
begin
  perform private.start_round_game(room, uid, 'cuela_la_mentira', cuela_start.rounds);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.cuela_answer(room_id uuid, text text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(cuela_answer.room_id);
  game public.games;
  clean text := private.clean_text(cuela_answer.text);
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'cuela_la_mentira', 'writing');
  perform private.require_active(game, uid);

  if private.has_responded(game, uid) then
    perform private.raise_error('already_answered');
  end if;
  if char_length(clean) not between 1 and 80 then
    perform private.raise_error('invalid_answer');
  end if;
  if private.cuela_is_truth(private.cuela_question(game), clean) then
    perform private.raise_error('is_truth');
  end if;

  insert into public.answers (game_id, round, user_id, text) values (game.id, game.round, uid, clean);
  perform private.close_if_done(game.id);

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.cuela_close_writing(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(cuela_close_writing.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'cuela_la_mentira', 'writing');

  perform private.cuela_close_writing_round(game.id);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.cuela_vote(room_id uuid, option_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(cuela_vote.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'cuela_la_mentira', 'voting');
  perform private.require_active(game, uid);

  if private.has_responded(game, uid) then
    perform private.raise_error('already_voted');
  end if;
  if cuela_vote.option_id is null or not exists (
    select 1 from public.cuela_options o
    where o.option_id = cuela_vote.option_id and o.game_id = game.id and o.round = game.round
  ) then
    perform private.raise_error('invalid_option');
  end if;
  if exists (
    select 1 from public.cuela_option_authors oa
    where oa.option_id = cuela_vote.option_id and oa.user_id = uid
  ) then
    perform private.raise_error('own_option');
  end if;

  insert into public.cuela_votes (game_id, round, user_id, option_id)
  values (game.id, game.round, uid, cuela_vote.option_id);
  perform private.close_if_done(game.id);

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.cuela_close_voting(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(cuela_close_voting.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'cuela_la_mentira', 'voting');

  perform private.cuela_close_voting_round(game.id);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.cuela_next(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(cuela_next.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'cuela_la_mentira', 'reveal');

  perform private.next_round(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function
  private.normalize_answer(text),
  private.cuela_pick_question(uuid),
  private.cuela_question(public.games),
  private.cuela_is_truth(public.cuela_questions, text),
  private.cuela_close_writing_round(uuid),
  private.cuela_points(public.games, uuid),
  private.cuela_close_voting_round(uuid)
from public, anon, authenticated;

revoke execute on function
  public.cuela_start(uuid, integer),
  public.cuela_answer(uuid, text),
  public.cuela_close_writing(uuid),
  public.cuela_vote(uuid, uuid),
  public.cuela_close_voting(uuid),
  public.cuela_next(uuid)
from public, anon;

grant execute on function
  public.cuela_start(uuid, integer),
  public.cuela_answer(uuid, text),
  public.cuela_close_writing(uuid),
  public.cuela_vote(uuid, uuid),
  public.cuela_close_voting(uuid),
  public.cuela_next(uuid)
to authenticated;

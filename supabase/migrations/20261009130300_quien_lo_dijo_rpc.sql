-- Acciones de ¿Quién lo dijo? (docs/JUEGOS.md §4 y §7), sobre las auxiliares de juegos por rondas.

create or replace function public.set_game(room_id uuid, game text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(set_game.room_id);
begin
  perform private.require_host(room, uid);

  if room.current_game_id is not null then
    perform private.raise_error('invalid_phase');
  end if;

  if set_game.game is null or set_game.game not in ('impostor', 'probable', 'quien_lo_dijo') then
    perform private.raise_error('invalid_game');
  end if;

  update public.rooms r set game = set_game.game where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Autor elegido de la ronda en curso (protagonista de la ronda).
create function private.round_subject(game public.games)
returns uuid
language sql
stable
set search_path = ''
as $$
  select gr.subject_id from public.game_rounds gr where gr.game_id = game.id and gr.round = game.round;
$$;

create or replace function private.first_phase(kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'probable' then 'voting'
    when 'quien_lo_dijo' then 'writing'
  end;
$$;

-- En la votación de ¿Quién lo dijo? el autor no vota: cuenta como que ya ha respondido.
create or replace function private.has_responded(game public.games, target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when game.phase = 'writing' then exists (
      select 1 from public.answers a
      where a.game_id = game.id and a.round = game.round and a.user_id = target_user_id
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

-- Al cerrar la escritura se elige una respuesta al azar entre los autores que menos veces han
-- salido en la partida. Sin respuestas, la ronda se salta sin puntos.
create function private.quien_lo_dijo_close_writing_round(target_game_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
  author uuid;
begin
  select g.* into game from public.games g where g.id = target_game_id;

  select a.user_id into author
  from public.answers a
  where a.game_id = game.id and a.round = game.round
  order by
    (select count(*) from public.game_rounds gr where gr.game_id = game.id and gr.subject_id = a.user_id),
    pg_catalog.gen_random_uuid()
  limit 1;

  if author is null then
    update public.game_rounds gr set result = jsonb_build_object('skipped', true)
    where gr.game_id = game.id and gr.round = game.round;
    perform private.next_round(game);
    return;
  end if;

  update public.game_rounds gr set subject_id = author
  where gr.game_id = game.id and gr.round = game.round;
  update public.games g set phase = 'voting' where g.id = game.id;
end;
$$;

-- Un punto por acertar el autor; el autor se lleva uno por cada fallo.
create function private.quien_lo_dijo_close_voting_round(target_game_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
  author uuid;
  correct uuid[];
  wrong uuid[];
begin
  select g.* into game from public.games g where g.id = target_game_id;
  author := private.round_subject(game);

  select
    coalesce(array_agg(v.voter_id order by v.voter_id) filter (where v.target_id = author), '{}'),
    coalesce(array_agg(v.voter_id order by v.voter_id) filter (where v.target_id <> author), '{}')
  into correct, wrong
  from public.votes v
  where v.game_id = game.id and v.round = game.round;

  update public.game_players gp
  set score = gp.score
    + case when gp.user_id = any (correct) then 1 else 0 end
    + case when gp.user_id = author then cardinality(wrong) else 0 end
  where gp.game_id = game.id;

  update public.game_rounds gr
  set result = jsonb_build_object('author_id', author, 'correct_ids', to_jsonb(correct), 'wrong_ids', to_jsonb(wrong))
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
  end if;
end;
$$;

-- Si se va el autor elegido durante la votación, la ronda se anula sin puntos y se pasa a la
-- revelación, que enseña las respuestas. El resto de abandonos siguen la regla común.
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

  if game.game_type = 'quien_lo_dijo' and game.phase = 'voting'
    and private.round_subject(game) = target_user_id then
    delete from public.votes v where v.game_id = game.id and v.round = game.round;
    update public.game_rounds gr set result = jsonb_build_object('annulled', true)
    where gr.game_id = game.id and gr.round = game.round;
    update public.games g set phase = 'reveal' where g.id = game.id;
  else
    if game.phase <> 'reveal' then
      delete from public.votes v
      where v.game_id = game.id
        and v.round = game.round
        and (v.voter_id = target_user_id or v.target_id = target_user_id);
    end if;

    if game.phase = 'writing' then
      delete from public.answers a
      where a.game_id = game.id and a.round = game.round and a.user_id = target_user_id;
    end if;
  end if;

  if (select count(*) from public.game_players gp where gp.game_id = game.id and gp.alive) < 3 then
    update public.games g set phase = 'finished', finished_at = now() where g.id = game.id;
  elsif game.phase <> 'reveal' then
    perform private.close_if_done(game.id);
  end if;
end;
$$;

-- Participante activo de la partida; si no, not_participant o not_alive.
create function private.require_active(game public.games, uid uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  player public.game_players;
begin
  select gp.* into player from public.game_players gp where gp.game_id = game.id and gp.user_id = uid;
  if not found then
    perform private.raise_error('not_participant');
  end if;
  if not player.alive then
    perform private.raise_error('not_alive');
  end if;
end;
$$;

-- Texto escrito por un jugador: sin espacios alrededor y con los de dentro colapsados.
create function private.clean_text(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g'));
$$;

create function public.quien_lo_dijo_start(room_id uuid, rounds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(quien_lo_dijo_start.room_id);
begin
  perform private.start_round_game(room, uid, 'quien_lo_dijo', quien_lo_dijo_start.rounds);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.quien_lo_dijo_answer(room_id uuid, text text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(quien_lo_dijo_answer.room_id);
  game public.games;
  clean text := private.clean_text(quien_lo_dijo_answer.text);
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'quien_lo_dijo', 'writing');
  perform private.require_active(game, uid);

  if private.has_responded(game, uid) then
    perform private.raise_error('already_answered');
  end if;
  if char_length(clean) not between 1 and 80 then
    perform private.raise_error('invalid_answer');
  end if;

  insert into public.answers (game_id, round, user_id, text) values (game.id, game.round, uid, clean);
  perform private.close_if_done(game.id);

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.quien_lo_dijo_close_writing(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(quien_lo_dijo_close_writing.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'quien_lo_dijo', 'writing');

  perform private.quien_lo_dijo_close_writing_round(game.id);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.quien_lo_dijo_vote(room_id uuid, target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(quien_lo_dijo_vote.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'quien_lo_dijo', 'voting');
  perform private.require_active(game, uid);

  if private.round_subject(game) = uid then
    perform private.raise_error('is_author');
  end if;
  if private.has_responded(game, uid) then
    perform private.raise_error('already_voted');
  end if;

  -- Se vota a un participante activo que no sea uno mismo.
  if quien_lo_dijo_vote.target_id is null or quien_lo_dijo_vote.target_id = uid or not exists (
    select 1 from public.game_players gp
    where gp.game_id = game.id and gp.user_id = quien_lo_dijo_vote.target_id and gp.alive
  ) then
    perform private.raise_error('invalid_target');
  end if;

  insert into public.votes (game_id, round, voter_id, target_id)
  values (game.id, game.round, uid, quien_lo_dijo_vote.target_id);
  perform private.close_if_done(game.id);

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.quien_lo_dijo_close_voting(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(quien_lo_dijo_close_voting.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'quien_lo_dijo', 'voting');

  perform private.quien_lo_dijo_close_voting_round(game.id);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.quien_lo_dijo_next(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(quien_lo_dijo_next.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'quien_lo_dijo', 'reveal');

  perform private.next_round(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function
  private.round_subject(public.games),
  private.quien_lo_dijo_close_writing_round(uuid),
  private.quien_lo_dijo_close_voting_round(uuid),
  private.require_active(public.games, uuid),
  private.clean_text(text)
from public, anon, authenticated;

revoke execute on function
  public.quien_lo_dijo_start(uuid, integer),
  public.quien_lo_dijo_answer(uuid, text),
  public.quien_lo_dijo_close_writing(uuid),
  public.quien_lo_dijo_vote(uuid, uuid),
  public.quien_lo_dijo_close_voting(uuid),
  public.quien_lo_dijo_next(uuid)
from public, anon;

grant execute on function
  public.quien_lo_dijo_start(uuid, integer),
  public.quien_lo_dijo_answer(uuid, text),
  public.quien_lo_dijo_close_writing(uuid),
  public.quien_lo_dijo_vote(uuid, uuid),
  public.quien_lo_dijo_close_voting(uuid),
  public.quien_lo_dijo_next(uuid)
to authenticated;

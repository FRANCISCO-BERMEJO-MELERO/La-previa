-- Lo común de los juegos por rondas (docs/JUEGOS.md §2), extraído de ¿Quién es más probable que…?
-- antes de añadir el segundo juego. Lo propio de cada juego queda en funciones pequeñas
-- (first_phase, has_responded, close_if_done) que cada juego nuevo amplía.

-- Fase con la que se abre cada ronda.
create function private.first_phase(kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind when 'probable' then 'voting' end;
$$;

-- ¿Ha hecho ya este participante lo que pide la fase en curso?
create function private.has_responded(game public.games, target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when game.game_type = 'probable' and game.phase = 'voting' then exists (
      select 1 from public.votes v
      where v.game_id = game.id and v.round = game.round and v.voter_id = target_user_id
    )
    else false
  end;
$$;

-- ¿Han respondido todos los participantes activos?
create function private.all_responded(target_game_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1
    from public.games g
    join public.game_players gp on gp.game_id = g.id
    where g.id = target_game_id and gp.alive and not private.has_responded(g, gp.user_id)
  );
$$;

-- Cierra la fase en curso si ya no falta nadie por responder.
create function private.close_if_done(target_game_id uuid)
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
  end if;
end;
$$;

-- Abre una ronda. Juegan todos los miembros de la sala: quien llegó tarde entra y quien se fue
-- y ha vuelto, también, con sus puntos.
create function private.open_round(target_game_id uuid, new_round integer)
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
  where rp.room_id = game.room_id
  on conflict (game_id, user_id) do update set alive = true, name = excluded.name;

  insert into public.game_rounds (game_id, round, prompt_id)
  values (game.id, new_round, private.pick_prompt(game.room_id, game.game_type));
end;
$$;

-- Ronda siguiente o, tras la última, final.
create function private.next_round(game public.games)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if game.round >= game.total_rounds then
    update public.games g set phase = 'finished', finished_at = now() where g.id = game.id;
  else
    perform private.open_round(game.id, game.round + 1);
  end if;
end;
$$;

-- Crea una partida por rondas desde la sala de espera o desde una partida terminada.
create function private.start_round_game(room public.rooms, uid uuid, kind text, rounds integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games := private.current_game(room);
  new_game_id uuid;
begin
  perform private.require_host(room, uid);

  if game.id is not null and game.phase <> 'finished' then
    perform private.raise_error('invalid_phase');
  end if;

  if room.game <> kind then
    perform private.raise_error('invalid_game');
  end if;

  if (select count(*) from public.room_players rp where rp.room_id = room.id) < 3 then
    perform private.raise_error('not_enough_players');
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

-- Quien se va deja de participar y se borra lo que hubiera enviado en la ronda en curso, y los
-- votos que había recibido (quien le votó vuelve a votar). En la revelación solo se marca como
-- fuera. Con menos de 3 activos la partida termina; si no, se comprueba si ya no falta nadie.
create function private.round_departure(game public.games, target_user_id uuid)
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

  if (select count(*) from public.game_players gp where gp.game_id = game.id and gp.alive) < 3 then
    update public.games g set phase = 'finished', finished_at = now() where g.id = game.id;
  elsif game.phase <> 'reveal' then
    perform private.close_if_done(game.id);
  end if;
end;
$$;

create or replace function private.handle_departure(room public.rooms, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games := private.current_game(room);
begin
  if game.id is null then
    return;
  end if;

  if game.game_type = 'impostor' then
    perform private.impostor_departure(game, target_user_id);
  else
    perform private.round_departure(game, target_user_id);
  end if;
end;
$$;

-- Parte común de la foto: rondas, participantes con sus puntos y si ya han respondido, y la
-- clasificación al terminar. Cada juego añade lo suyo.
create function private.round_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'type', g.game_type,
    'id', g.id,
    'phase', g.phase,
    'round', g.round,
    'total_rounds', g.total_rounds,
    'participants', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'user_id', gp.user_id,
          'name', gp.name,
          'alive', gp.alive,
          'score', gp.score,
          'has_responded', private.has_responded(g, gp.user_id)
        )
        order by rp.joined_at nulls last, gp.name, gp.user_id
      ), '[]'::jsonb)
      from public.game_players gp
      left join public.room_players rp on rp.room_id = g.room_id and rp.user_id = gp.user_id
      where gp.game_id = g.id
    ),
    'my', jsonb_build_object(
      'is_participant', me.user_id is not null,
      'alive', coalesce(me.alive, false)
    ),
    'ranking', case when g.phase = 'finished' then (
      select coalesce(jsonb_agg(
        jsonb_build_object('user_id', gp.user_id, 'name', gp.name, 'score', gp.score)
        order by gp.score desc, gp.name, gp.user_id
      ), '[]'::jsonb)
      from public.game_players gp
      where gp.game_id = g.id
    ) end
  )
  from public.games g
  left join public.game_players me on me.game_id = g.id and me.user_id = uid
  where g.id = target_game_id;
$$;

-- Añade campos a `my` dentro de una foto.
create function private.with_my(state jsonb, extra jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_set(state, '{my}', (state -> 'my') || extra);
$$;

-- ¿Quién es más probable que…? pasa a usar lo común ---------------------------------------------

create or replace function private.probable_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.with_my(private.round_state(g.id, uid), jsonb_build_object(
    'voted_for', (
      select v.target_id from public.votes v
      where v.game_id = g.id and v.round = g.round and v.voter_id = uid
    )
  )) || jsonb_build_object(
    'prompt', p.text,
    'tally', case when g.phase = 'reveal' then gr.result -> 'tally' end,
    'round_winner_ids', case when g.phase = 'reveal' then gr.result -> 'winner_ids' end
  )
  from public.games g
  join public.game_rounds gr on gr.game_id = g.id and gr.round = g.round
  left join public.prompts p on p.id = gr.prompt_id
  where g.id = target_game_id;
$$;

create or replace function public.probable_start(room_id uuid, rounds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(probable_start.room_id);
begin
  perform private.start_round_game(room, uid, 'probable', probable_start.rounds);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create or replace function public.probable_vote(room_id uuid, target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(probable_vote.room_id);
  game public.games;
  voter public.game_players;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'probable', 'voting');

  select gp.* into voter from public.game_players gp where gp.game_id = game.id and gp.user_id = uid;
  if not found then
    perform private.raise_error('not_participant');
  end if;
  if not voter.alive then
    perform private.raise_error('not_alive');
  end if;
  if private.has_responded(game, uid) then
    perform private.raise_error('already_voted');
  end if;

  -- Se puede votar a cualquier participante activo, también a uno mismo.
  if probable_vote.target_id is null or not exists (
    select 1 from public.game_players gp
    where gp.game_id = game.id and gp.user_id = probable_vote.target_id and gp.alive
  ) then
    perform private.raise_error('invalid_target');
  end if;

  insert into public.votes (game_id, round, voter_id, target_id)
  values (game.id, game.round, uid, probable_vote.target_id);
  perform private.close_if_done(game.id);

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create or replace function public.probable_next(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(probable_next.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'probable', 'reveal');

  perform private.next_round(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Sustituidas por las auxiliares comunes.
drop function private.probable_departure(public.games, uuid);
drop function private.probable_all_voted(uuid);
drop function private.probable_open_round(uuid, integer);

revoke execute on function
  private.first_phase(text),
  private.has_responded(public.games, uuid),
  private.all_responded(uuid),
  private.close_if_done(uuid),
  private.open_round(uuid, integer),
  private.next_round(public.games),
  private.start_round_game(public.rooms, uuid, text, integer),
  private.round_departure(public.games, uuid),
  private.round_state(uuid, uuid),
  private.with_my(jsonb, jsonb)
from public, anon, authenticated;

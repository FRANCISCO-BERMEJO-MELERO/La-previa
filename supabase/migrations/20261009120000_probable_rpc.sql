-- Acciones de ¿Quién es más probable que…? (docs/JUEGOS.md §3 y §7).

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

  if set_game.game is null or set_game.game not in ('impostor', 'probable') then
    perform private.raise_error('invalid_game');
  end if;

  update public.rooms r set game = set_game.game where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Partida en curso del juego y la fase pedidos; si no, invalid_phase.
create function private.require_game(room public.rooms, kind text, expected text)
returns public.games
language plpgsql
stable
set search_path = ''
as $$
declare
  game public.games := private.current_game(room);
begin
  if game.id is null or game.game_type <> kind or game.phase <> expected then
    perform private.raise_error('invalid_phase');
  end if;
  return game;
end;
$$;

-- Las acciones de El impostor no sirven en las partidas de otros juegos.
create or replace function private.require_phase(room public.rooms, expected text)
returns public.games
language plpgsql
stable
set search_path = ''
as $$
begin
  return private.require_game(room, 'impostor', expected);
end;
$$;

-- Volver a la sala de espera vale para cualquier juego terminado.
create or replace function public.back_to_lobby(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(back_to_lobby.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.current_game(room);
  if game.id is null or game.phase <> 'finished' then
    perform private.raise_error('invalid_phase');
  end if;

  update public.rooms r set current_game_id = null where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Pregunta al azar del juego, empezando por las que aún no han salido en la sala.
create function private.pick_prompt(target_room_id uuid, kind text)
returns bigint
language sql
volatile
set search_path = ''
as $$
  select p.id
  from public.prompts p
  where p.active and p.game_type = kind
  order by
    exists (
      select 1
      from public.game_rounds gr
      join public.games g on g.id = gr.game_id
      where g.room_id = target_room_id and gr.prompt_id = p.id
    ),
    pg_catalog.gen_random_uuid()
  limit 1;
$$;

create function private.probable_open_round(target_game_id uuid, new_round integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
begin
  update public.games g set round = new_round, phase = 'voting'
  where g.id = target_game_id
  returning g.* into game;

  insert into public.game_rounds (game_id, round, prompt_id)
  values (game.id, new_round, private.pick_prompt(game.room_id, 'probable'));
end;
$$;

-- Recuento de la ronda: un punto a cada uno de los más votados; sin votos, nadie puntúa.
-- El recuento queda guardado en la ronda para la revelación.
create function private.probable_close_round(target_game_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
  tally jsonb;
  winners uuid[];
begin
  select g.* into game from public.games g where g.id = target_game_id;

  with counted as (
    select v.target_id, count(*) as votes, array_agg(v.voter_id order by v.voter_id) as voter_ids
    from public.votes v
    where v.game_id = game.id and v.round = game.round
    group by v.target_id
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object('user_id', c.target_id, 'votes', c.votes, 'voter_ids', to_jsonb(c.voter_ids))
      order by c.votes desc, gp.name, c.target_id
    ), '[]'::jsonb),
    coalesce(
      array_agg(c.target_id order by c.target_id) filter (where c.votes = (select max(votes) from counted)),
      '{}'
    )
  into tally, winners
  from counted c
  join public.game_players gp on gp.game_id = game.id and gp.user_id = c.target_id;

  update public.game_players gp set score = gp.score + 1
  where gp.game_id = game.id and gp.user_id = any (winners);

  update public.game_rounds gr
  set result = jsonb_build_object('tally', tally, 'winner_ids', to_jsonb(winners))
  where gr.game_id = game.id and gr.round = game.round;

  update public.games g set phase = 'reveal' where g.id = game.id;
end;
$$;

create function public.probable_start(room_id uuid, rounds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(probable_start.room_id);
  game public.games;
  new_game_id uuid;
begin
  perform private.require_host(room, uid);

  -- Se empieza desde la sala de espera o, para volver a jugar, desde una partida terminada.
  game := private.current_game(room);
  if game.id is not null and game.phase <> 'finished' then
    perform private.raise_error('invalid_phase');
  end if;

  if room.game <> 'probable' then
    perform private.raise_error('invalid_game');
  end if;

  if (select count(*) from public.room_players rp where rp.room_id = room.id) < 3 then
    perform private.raise_error('not_enough_players');
  end if;

  if probable_start.rounds is null or probable_start.rounds not in (5, 10, 15) then
    perform private.raise_error('invalid_rounds');
  end if;

  insert into public.games (room_id, game_type, phase, total_rounds)
  values (room.id, 'probable', 'voting', probable_start.rounds)
  returning id into new_game_id;

  -- Participan todos los miembros, también los desconectados.
  insert into public.game_players (game_id, user_id, name)
  select new_game_id, rp.user_id, rp.name
  from public.room_players rp
  where rp.room_id = room.id;

  perform private.probable_open_round(new_game_id, 1);

  update public.rooms r set current_game_id = new_game_id where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.probable_vote(room_id uuid, target_id uuid)
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
  if exists (
    select 1 from public.votes v
    where v.game_id = game.id and v.round = game.round and v.voter_id = uid
  ) then
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
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.probable_close(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(probable_close.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'probable', 'voting');

  perform private.probable_close_round(game.id);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.probable_next(room_id uuid)
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

  if game.round >= game.total_rounds then
    update public.games g set phase = 'finished', finished_at = now() where g.id = game.id;
  else
    perform private.probable_open_round(game.id, game.round + 1);
  end if;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function
  private.require_game(public.rooms, text, text),
  private.pick_prompt(uuid, text),
  private.probable_open_round(uuid, integer),
  private.probable_close_round(uuid)
from public, anon, authenticated;

revoke execute on function
  public.probable_start(uuid, integer),
  public.probable_vote(uuid, uuid),
  public.probable_close(uuid),
  public.probable_next(uuid)
from public, anon;

grant execute on function
  public.probable_start(uuid, integer),
  public.probable_vote(uuid, uuid),
  public.probable_close(uuid),
  public.probable_next(uuid)
to authenticated;

-- Fases de la partida (docs/CONTEXTO.md §3 y §5): votación, revelación, final y vuelta a la sala.

-- Partida en curso en la fase pedida; si no, invalid_phase.
create function private.require_phase(room public.rooms, expected text)
returns public.games
language plpgsql
stable
set search_path = ''
as $$
declare
  game public.games := private.current_game(room);
begin
  if game.id is null or game.phase <> expected then
    perform private.raise_error('invalid_phase');
  end if;
  return game;
end;
$$;

-- Bando ganador con los vivos de ahora, o null si la partida sigue.
create function private.winner(target_game_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when alive.impostors = 0 then 'group'
    when alive.impostors >= alive.players then 'impostors'
  end
  from (
    select
      count(*) filter (where gr.role = 'impostor') as impostors,
      count(*) filter (where gr.role = 'player') as players
    from public.game_players gp
    join public.game_roles gr on gr.game_id = gp.game_id and gr.user_id = gp.user_id
    where gp.game_id = target_game_id and gp.alive
  ) alive;
$$;

create function private.was_impostor(target_game_id uuid, target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.game_roles gr
    where gr.game_id = target_game_id and gr.user_id = target_user_id and gr.role = 'impostor'
  );
$$;

create function public.open_voting(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(open_voting.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_phase(room, 'talking');

  update public.games g set phase = 'voting' where g.id = game.id;
  update public.game_players gp set has_voted = false where gp.game_id = game.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.cast_vote(room_id uuid, target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(cast_vote.room_id);
  game public.games;
  voter public.game_players;
begin
  perform private.require_member(room.id, uid);
  game := private.require_phase(room, 'voting');

  select gp.* into voter from public.game_players gp where gp.game_id = game.id and gp.user_id = uid;
  if not found then
    perform private.raise_error('not_participant');
  end if;
  if not voter.alive then
    perform private.raise_error('not_alive');
  end if;
  if voter.has_voted then
    perform private.raise_error('already_voted');
  end if;

  if cast_vote.target_id is null
    or cast_vote.target_id = uid
    or not exists (
      select 1 from public.game_players gp
      where gp.game_id = game.id and gp.user_id = cast_vote.target_id and gp.alive
    ) then
    perform private.raise_error('invalid_target');
  end if;

  insert into public.votes (game_id, round, voter_id, target_id)
  values (game.id, game.round, uid, cast_vote.target_id);
  update public.game_players gp set has_voted = true where gp.game_id = game.id and gp.user_id = uid;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.close_voting(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(close_voting.room_id);
  game public.games;
  leaders uuid[];
  expelled public.game_players;
  result jsonb;
begin
  perform private.require_host(room, uid);
  game := private.require_phase(room, 'voting');

  -- Los más votados de la ronda; si no hay votos, ninguno.
  select coalesce(array_agg(tally.target_id order by tally.target_id), '{}')
  into leaders
  from (
    select v.target_id, count(*) as votes, max(count(*)) over () as top
    from public.votes v
    where v.game_id = game.id and v.round = game.round
    group by v.target_id
  ) tally
  where tally.votes = tally.top;

  if cardinality(leaders) = 1 then
    update public.game_players gp set alive = false
    where gp.game_id = game.id and gp.user_id = leaders[1]
    returning gp.* into expelled;

    result := jsonb_build_object(
      'type', 'eliminated',
      'user_id', expelled.user_id,
      'name', expelled.name,
      'was_impostor', private.was_impostor(game.id, expelled.user_id)
    );
  else
    result := jsonb_build_object('type', 'tie', 'user_ids', to_jsonb(leaders));
  end if;

  update public.games g set phase = 'reveal', outcome = result where g.id = game.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.continue_game(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(continue_game.room_id);
  game public.games;
  side text;
begin
  perform private.require_host(room, uid);
  game := private.require_phase(room, 'reveal');
  side := private.winner(game.id);

  if side is not null then
    update public.games g
    set phase = 'finished', winner = side, finished_at = now()
    where g.id = game.id;
  else
    update public.games g
    set phase = 'talking', round = g.round + 1, outcome = null
    where g.id = game.id;
  end if;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.back_to_lobby(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(back_to_lobby.room_id);
begin
  perform private.require_host(room, uid);
  perform private.require_phase(room, 'finished');

  update public.rooms r set current_game_id = null where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function
  private.require_phase(public.rooms, text),
  private.winner(uuid),
  private.was_impostor(uuid, uuid)
from public, anon, authenticated;

revoke execute on function
  public.open_voting(uuid),
  public.cast_vote(uuid, uuid),
  public.close_voting(uuid),
  public.continue_game(uuid),
  public.back_to_lobby(uuid)
from public, anon;

grant execute on function
  public.open_voting(uuid),
  public.cast_vote(uuid, uuid),
  public.close_voting(uuid),
  public.continue_game(uuid),
  public.back_to_lobby(uuid)
to authenticated;

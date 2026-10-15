-- Acciones de ¿Qué prefieres? (docs/JUEGOS-2.md §2 y §5), sobre las auxiliares de juegos por rondas.

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

  if set_game.game is null
    or set_game.game not in ('impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres') then
    perform private.raise_error('invalid_game');
  end if;

  update public.rooms r set game = set_game.game where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
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
    when 'una_pista' then 'writing'
    when 'que_prefieres' then 'voting'
  end;
$$;

-- La elección de ¿Qué prefieres? se guarda en `answers`, no en `votes`.
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
    when game.phase = 'voting' then
      (game.game_type = 'quien_lo_dijo' and private.round_subject(game) = target_user_id)
      or exists (
        select 1 from public.votes v
        where v.game_id = game.id and v.round = game.round and v.voter_id = target_user_id
      )
    else false
  end;
$$;

-- Reparte las elecciones, da un punto a cada uno de la opción mayoritaria y pasa a la revelación.
-- Con empate o sin elecciones nadie puntúa. El reparto queda guardado para enseñarlo tal cual.
create function private.que_prefieres_close_round(target_game_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
  choices jsonb;
  majority text;
begin
  select g.* into game from public.games g where g.id = target_game_id;

  select jsonb_build_object(
    'a', coalesce(jsonb_agg(a.user_id order by rp.joined_at nulls last, a.user_id) filter (where a.text = 'a'), '[]'::jsonb),
    'b', coalesce(jsonb_agg(a.user_id order by rp.joined_at nulls last, a.user_id) filter (where a.text = 'b'), '[]'::jsonb)
  ) into choices
  from public.answers a
  left join public.room_players rp on rp.room_id = game.room_id and rp.user_id = a.user_id
  where a.game_id = game.id and a.round = game.round;

  majority := case
    when jsonb_array_length(choices -> 'a') > jsonb_array_length(choices -> 'b') then 'a'
    when jsonb_array_length(choices -> 'b') > jsonb_array_length(choices -> 'a') then 'b'
  end;

  update public.game_players gp set score = gp.score + 1
  from public.answers a
  where a.game_id = game.id and a.round = game.round and a.text = majority
    and gp.game_id = a.game_id and gp.user_id = a.user_id;

  update public.game_rounds gr set result = jsonb_build_object('choices', choices, 'majority', majority)
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
  end if;
end;
$$;

-- Igual que antes, salvo que en ¿Qué prefieres? la elección de quien se va también se borra.
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

  if game.game_type = 'una_pista' and game.phase <> 'reveal'
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
    if game.phase = 'writing' or game.game_type = 'que_prefieres' then
      delete from public.answers a
      where a.game_id = game.id and a.round = game.round and a.user_id = target_user_id;
    end if;
    perform private.close_if_done(game.id);
  end if;
end;
$$;

create function public.que_prefieres_start(room_id uuid, rounds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(que_prefieres_start.room_id);
begin
  perform private.start_round_game(room, uid, 'que_prefieres', que_prefieres_start.rounds);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.que_prefieres_choose(room_id uuid, option text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(que_prefieres_choose.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'que_prefieres', 'voting');
  perform private.require_active(game, uid);

  if private.has_responded(game, uid) then
    perform private.raise_error('already_answered');
  end if;
  if que_prefieres_choose.option is null or que_prefieres_choose.option not in ('a', 'b') then
    perform private.raise_error('invalid_option');
  end if;

  insert into public.answers (game_id, round, user_id, text)
  values (game.id, game.round, uid, que_prefieres_choose.option);
  perform private.close_if_done(game.id);

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.que_prefieres_close(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(que_prefieres_close.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'que_prefieres', 'voting');

  perform private.que_prefieres_close_round(game.id);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.que_prefieres_next(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(que_prefieres_next.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'que_prefieres', 'reveal');

  perform private.next_round(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function private.que_prefieres_close_round(uuid) from public, anon, authenticated;

revoke execute on function
  public.que_prefieres_start(uuid, integer),
  public.que_prefieres_choose(uuid, text),
  public.que_prefieres_close(uuid),
  public.que_prefieres_next(uuid)
from public, anon;

grant execute on function
  public.que_prefieres_start(uuid, integer),
  public.que_prefieres_choose(uuid, text),
  public.que_prefieres_close(uuid),
  public.que_prefieres_next(uuid)
to authenticated;

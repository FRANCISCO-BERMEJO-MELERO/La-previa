-- Abandono o expulsión a media partida (docs/CONTEXTO.md §3 y §4, "Abandono a media partida"):
-- cuenta como una eliminación sin votación.

create function private.handle_departure(room public.rooms, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games := private.current_game(room);
  leaving public.game_players;
begin
  if game.id is null then
    return;
  end if;

  select gp.* into leaving
  from public.game_players gp
  where gp.game_id = game.id and gp.user_id = target_user_id and gp.alive;
  -- Quien llegó tarde o ya estaba eliminado no cambia la partida.
  if not found then
    return;
  end if;

  if game.phase in ('talking', 'voting') then
    update public.game_players gp set alive = false
    where gp.game_id = game.id and gp.user_id = target_user_id;

    -- Se cancela la votación en curso.
    delete from public.votes v where v.game_id = game.id and v.round = game.round;
    update public.game_players gp set has_voted = false where gp.game_id = game.id;

    update public.games g
    set phase = 'reveal',
        outcome = jsonb_build_object(
          'type', 'left',
          'user_id', leaving.user_id,
          'name', leaving.name,
          'was_impostor', private.was_impostor(game.id, leaving.user_id)
        )
    where g.id = game.id;
  elsif game.phase = 'reveal' then
    -- La revelación en pantalla no cambia.
    update public.game_players gp set alive = false
    where gp.game_id = game.id and gp.user_id = target_user_id;
  end if;
end;
$$;

create or replace function public.kick_player(room_id uuid, user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(kick_player.room_id);
  target public.room_players;
begin
  perform private.require_host(room, uid);

  select rp.* into target
  from public.room_players rp
  where rp.room_id = room.id and rp.user_id = kick_player.user_id;

  if not found or target.user_id = uid then
    perform private.raise_error('cannot_kick');
  end if;

  -- Durante una partida solo se puede echar a un desconectado.
  if room.current_game_id is not null and private.is_connected(target.last_seen_at) then
    perform private.raise_error('cannot_kick');
  end if;

  perform private.handle_departure(room, target.user_id);
  delete from public.room_players rp where rp.room_id = room.id and rp.user_id = target.user_id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Quien sale ya no es miembro, así que no recibe foto: devuelve null.
create or replace function public.leave_room(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(leave_room.room_id);
  next_host uuid;
begin
  perform private.require_member(room.id, uid);

  perform private.handle_departure(room, uid);
  delete from public.room_players rp where rp.room_id = room.id and rp.user_id = uid;

  if not exists (select 1 from public.room_players rp where rp.room_id = room.id) then
    delete from public.rooms r where r.id = room.id;
    return null;
  end if;

  if room.host_id = uid then
    next_host := private.pick_host(room.id, uid);
    update public.rooms r set host_id = next_host where r.id = room.id;
  end if;

  perform private.bump_version(room.id);
  return null;
end;
$$;

revoke execute on function private.handle_departure(public.rooms, uuid) from public, anon, authenticated;

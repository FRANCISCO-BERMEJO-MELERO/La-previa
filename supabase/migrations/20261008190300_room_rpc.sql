-- RPC de sala (docs/CONTEXTO.md §4, "Acciones"). Todas comprueban auth.uid() primero,
-- bloquean la fila de la sala antes de leer estado y devuelven la foto para quien llama.

create function public.create_room(name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  clean_name text := private.normalize_name(name);
  new_room_id uuid;
begin
  loop
    begin
      insert into public.rooms (code, host_id)
      values (private.generate_room_code(), uid)
      returning id into new_room_id;
      exit;
    exception when unique_violation then
      -- Otro ha cogido el mismo código entre la comprobación y la inserción: se reintenta.
      null;
    end;
  end loop;

  insert into public.room_players (room_id, user_id, name) values (new_room_id, uid, clean_name);
  return private.build_state(new_room_id, uid);
end;
$$;

create function public.join_room(code text, name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms;
  clean_name text;
begin
  select r.* into room
  from public.rooms r
  where r.code = upper(btrim(coalesce(join_room.code, '')))
  for update;
  if not found then
    perform private.raise_error('room_not_found');
  end if;

  -- Reconexión: ya era miembro.
  if exists (select 1 from public.room_players rp where rp.room_id = room.id and rp.user_id = uid) then
    return private.build_state(room.id, uid);
  end if;

  clean_name := private.normalize_name(join_room.name);

  if (select count(*) from public.room_players rp where rp.room_id = room.id) >= 16 then
    perform private.raise_error('room_full');
  end if;

  if exists (
    select 1 from public.room_players rp
    where rp.room_id = room.id and lower(rp.name) = lower(clean_name)
  ) then
    perform private.raise_error('name_taken');
  end if;

  insert into public.room_players (room_id, user_id, name) values (room.id, uid, clean_name);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.get_room_state(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(get_room_state.room_id);
begin
  perform private.require_member(room.id, uid);

  update public.room_players rp
  set last_seen_at = now()
  where rp.room_id = room.id and rp.user_id = uid;

  perform private.transfer_host_if_due(room);
  return private.build_state(room.id, uid);
end;
$$;

create function public.set_game(room_id uuid, game text)
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

  if set_game.game is null or set_game.game not in ('impostor') then
    perform private.raise_error('invalid_game');
  end if;

  update public.rooms r set game = set_game.game where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.kick_player(room_id uuid, user_id uuid)
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

  delete from public.room_players rp where rp.room_id = room.id and rp.user_id = target.user_id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Quien sale ya no es miembro, así que no recibe foto: devuelve null.
create function public.leave_room(room_id uuid)
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

revoke execute on function
  public.create_room(text),
  public.join_room(text, text),
  public.get_room_state(uuid),
  public.set_game(uuid, text),
  public.kick_player(uuid, uuid),
  public.leave_room(uuid)
from public, anon;

grant execute on function
  public.create_room(text),
  public.join_room(text, text),
  public.get_room_state(uuid),
  public.set_game(uuid, text),
  public.kick_player(uuid, uuid),
  public.leave_room(uuid)
to authenticated;

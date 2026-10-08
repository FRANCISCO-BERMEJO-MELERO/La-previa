-- Funciones auxiliares (docs/CONTEXTO.md §4). Viven en private, que no se expone por la API,
-- y solo las llaman las RPC de public, que se ejecutan como su propietario.

-- Umbrales de presencia: un jugador está conectado si ha dado señal hace menos de 25 s,
-- y el anfitrión se traspasa tras 90 s sin señal.
create function private.connected_window()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '25 seconds' $$;

create function private.host_timeout()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '90 seconds' $$;

-- El mensaje es el código estable que traduce el cliente.
create function private.raise_error(code text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using message = code, errcode = 'P0001';
end;
$$;

create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    perform private.raise_error('not_authenticated');
  end if;
  return uid;
end;
$$;

create function private.lock_room(target_room_id uuid)
returns public.rooms
language plpgsql
set search_path = ''
as $$
declare
  room public.rooms;
begin
  select r.* into room from public.rooms r where r.id = target_room_id for update;
  if not found then
    perform private.raise_error('room_not_found');
  end if;
  return room;
end;
$$;

create function private.require_member(target_room_id uuid, uid uuid)
returns public.room_players
language plpgsql
stable
set search_path = ''
as $$
declare
  member public.room_players;
begin
  select rp.* into member
  from public.room_players rp
  where rp.room_id = target_room_id and rp.user_id = uid;
  if not found then
    perform private.raise_error('not_member');
  end if;
  return member;
end;
$$;

create function private.require_host(room public.rooms, uid uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform private.require_member(room.id, uid);
  if room.host_id <> uid then
    perform private.raise_error('not_host');
  end if;
end;
$$;

create function private.normalize_name(raw_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  name text := btrim(coalesce(raw_name, ''));
begin
  if char_length(name) not between 1 and 14 then
    perform private.raise_error('name_invalid');
  end if;
  return name;
end;
$$;

create function private.generate_room_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ';
  new_code text;
begin
  loop
    select string_agg(substr(alphabet, 1 + floor(random() * char_length(alphabet))::int, 1), '')
    into new_code
    from generate_series(1, 4);
    exit when not exists (select 1 from public.rooms r where r.code = new_code);
  end loop;
  return new_code;
end;
$$;

create function private.bump_version(target_room_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.rooms
  set version = version + 1, last_activity_at = now()
  where id = target_room_id;
$$;

create function private.is_connected(last_seen_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$ select last_seen_at > now() - private.connected_window() $$;

-- Nuevo anfitrión: el miembro conectado más antiguo; si no hay conectados, el más antiguo.
create function private.pick_host(target_room_id uuid, excluded uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select rp.user_id
  from public.room_players rp
  where rp.room_id = target_room_id and rp.user_id <> excluded
  order by private.is_connected(rp.last_seen_at) desc, rp.joined_at, rp.user_id
  limit 1;
$$;

-- Traspasa el anfitrión si lleva más de host_timeout sin señal y hay otro miembro conectado.
-- Devuelve si ha habido traspaso.
create function private.transfer_host_if_due(room public.rooms)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  host_seen timestamptz;
  next_host uuid;
begin
  select rp.last_seen_at into host_seen
  from public.room_players rp
  where rp.room_id = room.id and rp.user_id = room.host_id;

  if host_seen is not null and host_seen > now() - private.host_timeout() then
    return false;
  end if;

  select rp.user_id into next_host
  from public.room_players rp
  where rp.room_id = room.id
    and rp.user_id <> room.host_id
    and private.is_connected(rp.last_seen_at)
  order by rp.joined_at, rp.user_id
  limit 1;

  if next_host is null then
    return false;
  end if;

  update public.rooms set host_id = next_host where id = room.id;
  perform private.bump_version(room.id);
  return true;
end;
$$;

-- Foto del estado para un miembro (docs/CONTEXTO.md §4, "La foto del estado").
-- No incluye nada secreto: la parte de partida llega con El impostor.
create function private.build_state(target_room_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'server_time', now(),
    'room', jsonb_build_object(
      'id', r.id,
      'code', r.code,
      'game', r.game,
      'host_id', r.host_id,
      'version', r.version
    ),
    'me', (
      select jsonb_build_object('user_id', me.user_id, 'name', me.name, 'is_host', me.user_id = r.host_id)
      from public.room_players me
      where me.room_id = r.id and me.user_id = uid
    ),
    'players', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'user_id', rp.user_id,
          'name', rp.name,
          'connected', private.is_connected(rp.last_seen_at),
          'joined_at', rp.joined_at
        )
        order by rp.joined_at, rp.user_id
      ), '[]'::jsonb)
      from public.room_players rp
      where rp.room_id = r.id
    ),
    'game', null
  )
  from public.rooms r
  where r.id = target_room_id;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_room_member(uuid) to authenticated;

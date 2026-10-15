-- Avatares de la galería (docs/MEJORAS.md §8). Cada jugador elige una ilustración de la galería
-- para la sala; sin elegir, se sigue viendo su inicial. No se guarda ninguna imagen: solo el nombre.

create function private.avatar_ids()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'avocado', 'egg', 'ghost', 'cactus', 'banana', 'pizza',
    'cloud', 'toast', 'octopus', 'donut', 'rocket', 'penguin'
  ];
$$;

revoke execute on function private.avatar_ids() from public, anon, authenticated;

alter table public.room_players add column avatar text;
alter table public.room_players add constraint room_players_avatar_check
  check (avatar is null or avatar = any (private.avatar_ids()));

-- Elegir avatar (o quitarlo con null) en cualquier momento, también a media partida.
create function public.set_avatar(room_id uuid, avatar text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(set_avatar.room_id);
begin
  perform private.require_member(room.id, uid);

  if set_avatar.avatar is not null and not (set_avatar.avatar = any (private.avatar_ids())) then
    perform private.raise_error('invalid_avatar');
  end if;

  update public.room_players rp set avatar = set_avatar.avatar
  where rp.room_id = room.id and rp.user_id = uid;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create or replace function private.build_state(target_room_id uuid, uid uuid)
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
          'avatar', rp.avatar,
          'connected', private.is_connected(rp.last_seen_at),
          'joined_at', rp.joined_at
        )
        order by rp.joined_at, rp.user_id
      ), '[]'::jsonb)
      from public.room_players rp
      where rp.room_id = r.id
    ),
    'game', case when r.current_game_id is not null then private.game_state(r.current_game_id, uid) end
  )
  from public.rooms r
  where r.id = target_room_id;
$$;

revoke execute on function public.set_avatar(uuid, text) from public, anon;
grant execute on function public.set_avatar(uuid, text) to authenticated;

-- Composición de Luna llena (docs/PLAN-5.md §2): cuántos lobos y qué roles opcionales.

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

  if set_game.game is null or set_game.game not in (
    'impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas',
    'luna_llena'
  ) then
    perform private.raise_error('invalid_game');
  end if;

  update public.rooms r set game = set_game.game where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Roles opcionales, en el orden en que se enumeran siempre.
create function private.luna_optional_roles()
returns text[]
language sql
immutable
set search_path = ''
as $$ select array['protector', 'hunter', 'jester', 'cupid'] $$;

-- Reparto recomendado por número de jugadores.
create function private.luna_recommended_config(players integer)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when players <= 6 then '{"wolves": 1, "roles": []}'
    when players <= 8 then '{"wolves": 2, "roles": ["protector"]}'
    when players <= 11 then '{"wolves": 2, "roles": ["protector", "hunter"]}'
    when players <= 13 then '{"wolves": 3, "roles": ["protector", "hunter", "jester"]}'
    else '{"wolves": 3, "roles": ["protector", "hunter", "jester", "cupid"]}'
  end::jsonb;
$$;

-- Valida una composición para tantos jugadores y la devuelve con los roles en su orden.
-- Sin lobos ni roles, la recomendada.
create function private.luna_config(players integer, wolves integer, roles text[])
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  optional text[] := private.luna_optional_roles();
begin
  if players < 6 then
    perform private.raise_error('not_enough_players');
  end if;

  if wolves is null and roles is null then
    return private.luna_recommended_config(players);
  end if;

  if wolves is null
    or roles is null
    or exists (select 1 from unnest(roles) r where r is null or not r = any (optional))
    or (select count(distinct r) from unnest(roles) r) <> cardinality(roles)
    or wolves < 1
    or 2 * wolves >= players
    or wolves + 1 + cardinality(roles) > players - 1
  then
    perform private.raise_error('invalid_config');
  end if;

  return jsonb_build_object(
    'wolves', wolves,
    'roles', (
      select coalesce(jsonb_agg(o order by array_position(optional, o)), '[]'::jsonb)
      from unnest(optional) o
      where o = any (roles)
    )
  );
end;
$$;

revoke execute on function
  private.luna_optional_roles(),
  private.luna_recommended_config(integer),
  private.luna_config(integer, integer, text[])
from public, anon, authenticated;

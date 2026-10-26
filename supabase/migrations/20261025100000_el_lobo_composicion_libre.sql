-- El lobo con composición libre (docs/PLAN-6.md §1). La vidente pasa a ser un rol opcional más y
-- llegan la bruja y el asesino. Solo se rechaza lo que no se puede jugar: roles desconocidos o
-- repetidos, lobos negativos, más roles que jugadores, ninguna amenaza o todo lobos. El
-- equilibrio lo aconseja el cliente, sin bloquear.

alter table public.game_roles drop constraint game_roles_role_check;
alter table public.game_roles add constraint game_roles_role_check check (
  role in (
    'player', 'impostor',
    'wolf', 'villager', 'seer', 'protector', 'hunter', 'jester', 'cupid', 'witch', 'killer'
  )
);

-- Roles opcionales, en el orden en que se enumeran siempre.
create or replace function private.luna_optional_roles()
returns text[]
language sql
immutable
set search_path = ''
as $$ select array['seer', 'protector', 'hunter', 'jester', 'cupid', 'witch', 'killer'] $$;

-- El reparto recomendado de siempre, ahora con la vidente a la vista.
create or replace function private.luna_recommended_config(players integer)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when players <= 6 then '{"wolves": 1, "roles": ["seer"]}'
    when players <= 8 then '{"wolves": 2, "roles": ["seer", "protector"]}'
    when players <= 11 then '{"wolves": 2, "roles": ["seer", "protector", "hunter"]}'
    when players <= 13 then '{"wolves": 3, "roles": ["seer", "protector", "hunter", "jester"]}'
    else '{"wolves": 3, "roles": ["seer", "protector", "hunter", "jester", "cupid"]}'
  end::jsonb;
$$;

create or replace function private.luna_config(players integer, wolves integer, roles text[])
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  optional text[] := private.luna_optional_roles();
begin
  if players < 4 then
    perform private.raise_error('not_enough_players');
  end if;

  if wolves is null and roles is null then
    return private.luna_recommended_config(players);
  end if;

  if wolves is null
    or roles is null
    or exists (select 1 from unnest(roles) r where r is null or not r = any (optional))
    or (select count(distinct r) from unnest(roles) r) <> cardinality(roles)
    or wolves < 0
    or wolves + cardinality(roles) > players
    or (wolves = 0 and not 'killer' = any (roles))
    or wolves >= players
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

-- Se reparte exactamente lo pedido: lobos, los roles activados y aldeanos en los huecos.
create or replace function public.luna_llena_start(room_id uuid, wolves integer, roles text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_start.room_id);
  game public.games;
  players integer;
  config jsonb;
  optional text[];
  deck text[];
  new_game_id uuid;
begin
  perform private.require_host(room, uid);
  game := private.current_game(room);

  if game.id is not null and game.phase <> 'finished' then
    perform private.raise_error('invalid_phase');
  end if;

  if room.game <> 'luna_llena' then
    perform private.raise_error('invalid_game');
  end if;

  select count(*) into players from public.room_players rp where rp.room_id = room.id;
  config := private.luna_config(players, luna_llena_start.wolves, luna_llena_start.roles);
  optional := array(select jsonb_array_elements_text(config -> 'roles'));

  deck := array_fill('wolf'::text, array[(config ->> 'wolves')::integer])
    || optional
    || array_fill('villager'::text, array[players - (config ->> 'wolves')::integer - cardinality(optional)]);

  insert into public.games (room_id, game_type, phase)
  values (room.id, 'luna_llena', 'roles')
  returning id into new_game_id;

  insert into public.game_players (game_id, user_id, name)
  select new_game_id, rp.user_id, rp.name
  from public.room_players rp
  where rp.room_id = room.id;

  insert into public.game_roles (game_id, user_id, role)
  select new_game_id, shuffled.user_id, deck[shuffled.position]
  from (
    select rp.user_id, row_number() over (order by random()) as position
    from public.room_players rp
    where rp.room_id = room.id
  ) shuffled;

  insert into public.luna_state (game_id, config) values (new_game_id, config);

  update public.rooms r set current_game_id = new_game_id where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

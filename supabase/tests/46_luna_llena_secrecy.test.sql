begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 10) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create temp table ctx (key text primary key, value jsonb);
grant all on ctx to authenticated;

create function pg_temp.room() returns uuid language sql stable as $$
  select (value #>> '{}')::uuid from ctx where key = 'room'
$$;

create function pg_temp.code() returns text language sql stable as $$
  select value #>> '{}' from ctx where key = 'code'
$$;

create function pg_temp.game() returns public.games language sql stable as $$
  select g.* from public.games g join public.rooms r on r.current_game_id = g.id where r.id = pg_temp.room()
$$;

create function pg_temp.call(n integer, sql text) returns jsonb language plpgsql as $$
declare
  result jsonb;
begin
  perform pg_temp.as_user(n);
  execute sql into result;
  perform pg_temp.as_admin();
  return result;
end;
$$;

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

create function pg_temp.act(n integer, target integer, target2 integer default null) returns jsonb language sql as $$
  select pg_temp.call(n, format(
    'select public.luna_llena_night_action(%L, %L, %L)',
    pg_temp.room(), pg_temp.u(target), case when target2 is not null then pg_temp.u(target2) end
  ))
$$;

-- Lo que la foto de un vivo no puede contener antes de 'finished' (docs/PLAN-5.md §8).
create function pg_temp.leaks(n integer) returns text[] language plpgsql as $$
declare
  v jsonb := pg_temp.view(n);
  my jsonb := v -> 'my';
  role text := my ->> 'role';
  state public.luna_state;
  found text[] := '{}';
begin
  select s.* into state from public.luna_state s where s.game_id = (pg_temp.game()).id;
  if not (my ->> 'alive')::boolean or v ->> 'phase' = 'finished' then
    return found;
  end if;

  if exists (
    select 1 from jsonb_array_elements(v -> 'participants') p
    where (p ->> 'alive')::boolean and p ->> 'role' is not null
  ) then
    found := found || 'rol de un vivo';
  end if;
  if role <> 'wolf' and jsonb_array_length(my -> 'fellow_wolves') > 0 then
    found := found || 'quiénes son los lobos';
  end if;
  if role <> 'wolf' and jsonb_array_length(my -> 'wolf_marks') > 0 then
    found := found || 'marcas de los lobos';
  end if;
  if role <> 'seer' and jsonb_array_length(my -> 'seer_results') > 0 then
    found := found || 'resultado de la vidente';
  end if;
  if role <> 'protector' and my -> 'last_protected_id' <> 'null' then
    found := found || 'protegido';
  end if;
  if role <> 'cupid' and my -> 'chosen_lovers' <> 'null' then
    found := found || 'enamorados elegidos';
  end if;
  if my -> 'lover_id' <> 'null' and pg_temp.u(n) not in (state.lover_a, state.lover_b) then
    found := found || 'pareja ajena';
  end if;
  if v -> 'spectator' <> 'null' then
    found := found || 'vista de espectador';
  end if;
  if v -> 'result' <> 'null' then
    found := found || 'resultado';
  end if;
  if v ->> 'phase' in ('roles', 'night', 'dawn', 'mayor', 'voting', 'verdict') and v -> 'public_votes' <> 'null' then
    found := found || 'votos sin cerrar';
  end if;
  return found;
end;
$$;

create function pg_temp.all_leaks() returns text[] language sql as $$
  select coalesce(array_agg(format('u%s: %s', n, l) order by n), '{}')
  from generate_series(1, 10) n
  cross join lateral unnest(pg_temp.leaks(n)) l
$$;

create function pg_temp.roles_seen_by(n integer) returns bigint language sql as $$
  select count(*) from jsonb_array_elements(pg_temp.view(n) -> 'participants') p where p ->> 'role' is not null
$$;

-- Sala de 10 y reparto fijo (u1 anfitrión) ---------------------------------------------------
-- Lobos u1, u2 y u3; vidente u4; protector u5; cazador u6; bufón u7; Cupido u8; aldeanos u9 y u10.

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 10) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));
select pg_temp.call(1, format(
  'select public.luna_llena_start(%L, 3, %L)', pg_temp.room(), array['protector', 'hunter', 'jester', 'cupid']
));
update public.game_roles gr
set role = (array['wolf', 'wolf', 'wolf', 'seer', 'protector', 'hunter', 'jester', 'cupid', 'villager', 'villager'])[right(gr.user_id::text, 2)::integer]
where gr.game_id = (pg_temp.game()).id;

-- Reparto ------------------------------------------------------------------------------------

select is(pg_temp.all_leaks(), '{}'::text[], 'en el reparto ningún vivo recibe nada secreto');
select is(pg_temp.roles_seen_by(9), 0::bigint, 'un aldeano no ve ningún rol ajeno');
select is(pg_temp.roles_seen_by(1), 0::bigint, 'un lobo tampoco en la lista de jugadores');
select is(
  pg_temp.view(1) #> '{my,fellow_wolves}',
  jsonb_build_array(pg_temp.u(2), pg_temp.u(3)),
  'solo sabe quiénes son los otros lobos'
);

-- Noche, a medias ----------------------------------------------------------------------------

update public.games set phase = 'night' where id = (pg_temp.game()).id;
update public.luna_state set night = 1 where game_id = (pg_temp.game()).id;

select pg_temp.act(1, 10);
select pg_temp.act(4, 2);
select pg_temp.act(5, 9);
select pg_temp.act(8, 9, 10);
select pg_temp.act(6, 1);

select is(pg_temp.all_leaks(), '{}'::text[], 'de noche ningún vivo recibe nada secreto');
select is(pg_temp.view(9) #> '{my,action}', 'null'::jsonb, 'quien no ha actuado no ve acciones ajenas');
select is(pg_temp.view(6) #> '{my,action}', jsonb_build_object('target_id', pg_temp.u(1), 'target2_id', null), 'quien ha actuado ve solo la suya');
select is(pg_temp.view(4) #> '{my,wolf_marks}', '[]'::jsonb, 'la vidente no ve las marcas de los lobos');
select is(jsonb_array_length(pg_temp.view(2) #> '{my,wolf_marks}'), 1, 'otro lobo sí');
select is(pg_temp.view(1) #> '{my,seer_results}', '[]'::jsonb, 'solo la vidente ve su resultado');
select is(
  pg_temp.view(4) #> '{my,seer_results}',
  jsonb_build_array(jsonb_build_object('night', 1, 'user_id', pg_temp.u(2), 'is_wolf', true)),
  'que ella sí ve'
);
select is(pg_temp.view(8) #> '{my,chosen_lovers}', 'null'::jsonb, 'los enamorados no existen hasta el amanecer');

select pg_temp.act(2, 10);
select pg_temp.act(3, 10);
select pg_temp.act(7, 1);
select pg_temp.act(9, 1);
select pg_temp.act(10, 1);

-- Amanecer: muere u10 y, de pena, u9 --------------------------------------------------------

select is((pg_temp.game()).phase, 'dawn', 'amanece');
select is(pg_temp.all_leaks(), '{}'::text[], 'al amanecer ningún vivo recibe nada secreto');
select is(
  (select count(*) from generate_series(1, 10) n where pg_temp.view(n) #> '{my,last_protected_id}' <> 'null'),
  1::bigint,
  'el protegido solo lo ve el protector'
);
select is(
  (select array_agg(n order by n) from generate_series(1, 10) n where pg_temp.view(n) -> 'spectator' <> 'null'),
  array[9, 10],
  'solo los muertos reciben la vista de espectador'
);

select * from finish();
rollback;

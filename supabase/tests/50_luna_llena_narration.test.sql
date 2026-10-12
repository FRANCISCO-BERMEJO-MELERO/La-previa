begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 6) as i;

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

-- Lo que lee el narrador en la fase dada.
create function pg_temp.reads(phase text) returns jsonb language sql as $$
  update public.games set phase = reads.phase where id = (pg_temp.game()).id;
  select pg_temp.call(1, format('select public.get_room_state(%L)', pg_temp.room())) #> '{game,narration}';
$$;

create function pg_temp.announce(announcement jsonb) returns void language sql as $$
  update public.luna_state set announcement = announce.announcement where game_id = (pg_temp.game()).id;
$$;

create function pg_temp.death(n integer, role text, cause text) returns jsonb language sql immutable as $$
  select jsonb_build_object('user_id', pg_temp.u(n), 'name', format('Jugador %s', n), 'role', role, 'cause', cause)
$$;

-- Sala de 6 (u1 anfitrión) -------------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 6) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));
select pg_temp.call(1, format('select public.luna_llena_start(%L, null, null)', pg_temp.room()));

-- Claves sin datos ----------------------------------------------------------------------------

update public.luna_state set night = 2, day = 1 where game_id = (pg_temp.game()).id;
select is(pg_temp.reads('night'), '{"key": "night", "params": {}}'::jsonb, 'desde la segunda noche, el texto de siempre');
select is(pg_temp.reads('day'), '{"key": "day", "params": {}}'::jsonb, 'un debate sin elección de alcalde ese día no lo anuncia');
select is(pg_temp.reads('voting'), '{"key": "voting", "params": {}}'::jsonb, 'votar a quién se acusa');

-- Muertes encadenadas -------------------------------------------------------------------------

select pg_temp.announce(jsonb_build_object('kind', 'trial', 'spared', null, 'deaths', jsonb_build_array(
  pg_temp.death(2, 'villager', 'hanged'), pg_temp.death(3, 'seer', 'heartbreak')
)));
select is(
  pg_temp.reads('execution'),
  '{"key": "executed", "params": {"name": "Jugador 2", "role": "villager", "lover": {"name": "Jugador 3", "role": "seer"}}}'::jsonb,
  'un ahorcado y su enamorado, que muere de pena'
);

select pg_temp.announce(jsonb_build_object('kind', 'night', 'spared', null, 'deaths', jsonb_build_array(
  pg_temp.death(2, 'villager', 'wolves'), pg_temp.death(4, 'hunter', 'heartbreak'), pg_temp.death(5, 'villager', 'hunter')
)));
select is(
  pg_temp.reads('dawn'),
  '{"key": "hunter_shot", "params": {"name": "Jugador 5", "role": "villager"}}'::jsonb,
  'tras el disparo no se repite la muerte por amor de antes'
);

select pg_temp.announce(jsonb_build_object('kind', 'night', 'spared', null, 'deaths', jsonb_build_array(
  pg_temp.death(4, 'hunter', 'wolves'), pg_temp.death(5, 'villager', 'hunter'), pg_temp.death(6, 'villager', 'heartbreak')
)));
select is(
  pg_temp.reads('dawn'),
  '{"key": "hunter_shot", "params": {"name": "Jugador 5", "role": "villager", "lover": {"name": "Jugador 6", "role": "villager"}}}'::jsonb,
  'pero sí la que causa el disparo'
);

select pg_temp.announce(jsonb_build_object('kind', 'trial', 'spared', null, 'deaths', jsonb_build_array(
  pg_temp.death(4, 'hunter', 'hanged'), pg_temp.death(5, 'villager', 'hunter')
)));
select is(
  pg_temp.reads('execution'),
  '{"key": "hunter_shot", "params": {"name": "Jugador 5", "role": "villager"}}'::jsonb,
  'un cazador ahorcado que dispara'
);

-- Finales -------------------------------------------------------------------------------------

update public.games set phase = 'finished', finished_at = now() where id = (pg_temp.game()).id;
update public.luna_state set winner = 'village' where game_id = (pg_temp.game()).id;
select is(pg_temp.reads('finished'), '{"key": "win_village", "params": {}}'::jsonb, 'gana el pueblo');
update public.luna_state set winner = 'jester' where game_id = (pg_temp.game()).id;
select is(pg_temp.reads('finished'), '{"key": "win_jester", "params": {}}'::jsonb, 'gana el bufón');
update public.luna_state set winner = 'wolves' where game_id = (pg_temp.game()).id;
select is(pg_temp.reads('finished'), '{"key": "win_wolves", "params": {}}'::jsonb, 'ganan los lobos');

-- Datos públicos de la foto -------------------------------------------------------------------

update public.luna_state set mayor_id = pg_temp.u(2), accused_id = pg_temp.u(3) where game_id = (pg_temp.game()).id;
update public.games set phase = 'defense', finished_at = null where id = (pg_temp.game()).id;
select pg_temp.reads('defense');
select is(
  pg_temp.call(4, format('select public.get_room_state(%L)', pg_temp.room())) #>> '{game,mayor_id}',
  pg_temp.u(2)::text,
  'todos saben quién es el alcalde'
);
select is(
  pg_temp.call(4, format('select public.get_room_state(%L)', pg_temp.room())) #>> '{game,accused_id}',
  pg_temp.u(3)::text,
  'y quién es el acusado'
);
select is(
  pg_temp.call(4, format('select public.get_room_state(%L)', pg_temp.room())) #> '{game,result}',
  'null'::jsonb,
  'sin resultado hasta el final'
);

select * from finish();
rollback;

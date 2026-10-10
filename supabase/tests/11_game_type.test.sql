begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 3) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.call(n integer, sql text) returns jsonb language plpgsql as $$
declare
  result jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute sql into result;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  return result;
end;
$$;

create temp table ctx (key text primary key, value jsonb);

insert into ctx values ('room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room');
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select value ->> 'code' from ctx), format('Jugador %s', n)))
from generate_series(2, 3) as n;

select is(
  pg_temp.call(2, format('select public.get_room_state(%L)', (select value ->> 'id' from ctx))) -> 'game',
  'null'::jsonb,
  'en la sala de espera no hay partida ni tipo'
);

select is(
  pg_temp.call(1, format('select public.start_game(%L, 1)', (select value ->> 'id' from ctx))) #>> '{game,type}',
  'impostor',
  'la foto de quien empieza dice que la partida es de El impostor'
);

select is(
  pg_temp.call(3, format('select public.get_room_state(%L)', (select value ->> 'id' from ctx))) #>> '{game,type}',
  'impostor',
  'la foto de cualquier participante lleva el tipo de juego'
);

select * from finish();
rollback;

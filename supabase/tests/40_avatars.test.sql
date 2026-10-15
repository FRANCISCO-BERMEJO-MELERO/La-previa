begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

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

create temp table ctx (key text primary key, value jsonb);
grant all on ctx to authenticated, anon;

create function pg_temp.room() returns uuid language sql stable as $$
  select (value #>> '{}')::uuid from ctx where key = 'room'
$$;

-- Avatar de u(n) en la foto que ve u(viewer).
create function pg_temp.avatar_of(viewer integer, n integer) returns jsonb language sql as $$
  select p -> 'avatar'
  from jsonb_array_elements(pg_temp.call(viewer, format('select public.get_room_state(%L)', pg_temp.room())) -> 'players') p
  where p ->> 'user_id' = pg_temp.u(n)::text
$$;

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
select pg_temp.call(2, format('select public.join_room(%L, %L)', (select code from public.rooms where id = pg_temp.room()), 'Jugador 2'));

select is(pg_temp.avatar_of(1, 2), 'null'::jsonb, 'sin elegir, no hay avatar');

select pg_temp.call(2, format('select public.set_avatar(%L, %L)', pg_temp.room(), 'ghost'));
select is(pg_temp.avatar_of(1, 2), '"ghost"'::jsonb, 'quien elige avatar lo enseña a todos');
select is(pg_temp.avatar_of(1, 1), 'null'::jsonb, 'sin tocar el de los demás');

select pg_temp.call(2, format('select public.set_avatar(%L, %L)', pg_temp.room(), 'donut'));
select is(pg_temp.avatar_of(2, 2), '"donut"'::jsonb, 'se puede cambiar');

select pg_temp.call(2, format('select public.set_avatar(%L, null)', pg_temp.room()));
select is(pg_temp.avatar_of(2, 2), 'null'::jsonb, 'y quitar, para volver a la inicial');

select pg_temp.as_user(2);
select throws_ok(format('select public.set_avatar(%L, %L)', pg_temp.room(), 'unicornio'), 'P0001', 'invalid_avatar', 'solo valen los de la galería');
select pg_temp.as_user(3);
select throws_ok(format('select public.set_avatar(%L, %L)', pg_temp.room(), 'ghost'), 'P0001', 'not_member', 'quien no está en la sala no elige');
select pg_temp.as_admin();
insert into ctx select 'anon_call', to_jsonb(format('select public.set_avatar(%L, %L)', pg_temp.room(), 'ghost'));
set local role anon;
select throws_ok((select value #>> '{}' from ctx where key = 'anon_call'), '42501', null, 'sin sesión no se puede');
reset role;

select throws_ok(
  format('update public.room_players set avatar = %L where room_id = %L', 'unicornio', pg_temp.room()),
  '23514', null, 'la tabla tampoco admite otro'
);

select * from finish();
rollback;

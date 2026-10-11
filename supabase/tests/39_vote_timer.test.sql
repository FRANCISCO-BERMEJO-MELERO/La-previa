begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

-- Utilidades ------------------------------------------------------------------------------

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
grant all on ctx to authenticated;

create function pg_temp.room() returns uuid language sql stable as $$
  select (value #>> '{}')::uuid from ctx where key = 'room'
$$;

create function pg_temp.game() returns public.games language sql stable as $$
  select g.* from public.games g join public.rooms r on r.current_game_id = g.id where r.id = pg_temp.room()
$$;

create function pg_temp.act(n integer, action text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.game_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

-- Sala de 4 (u1 anfitrión) ------------------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select code from public.rooms where id = pg_temp.room()), format('Jugador %s', n)))
from generate_series(2, 4) as n;

select pg_temp.as_user(1);
select throws_ok(
  format('select public.start_game(%L, 1, null, 45)', pg_temp.room()),
  'P0001', 'invalid_vote_seconds', 'el tiempo es 30, 60 o 90 segundos'
);
select pg_temp.as_admin();

-- Con tiempo ---------------------------------------------------------------------------------------

select pg_temp.call(1, format('select public.start_game(%L, 1, null, 30)', pg_temp.room()));
select is((pg_temp.game()).vote_seconds, 30, 'la partida guarda el tiempo');
select is((pg_temp.game_of(2) ->> 'vote_seconds')::int, 30, 'y la foto lo dice');
select is(pg_temp.game_of(2) -> 'voting_deadline', 'null'::jsonb, 'hablando no hay hora límite');

select pg_temp.act(1, 'open_voting');
select is((pg_temp.game()).voting_deadline, now() + interval '30 seconds', 'al abrir la votación, la hora límite es dentro de 30 s');
select is(
  (pg_temp.game_of(2) ->> 'voting_deadline')::timestamptz,
  now() + interval '30 seconds',
  'y todos la ven en la foto'
);

select pg_temp.as_user(2);
select throws_ok(format('select public.close_voting(%L)', pg_temp.room()), 'P0001', 'not_host', 'antes de tiempo solo cierra el anfitrión');
select pg_temp.as_user(9);
select throws_ok(format('select public.close_voting(%L)', pg_temp.room()), 'P0001', 'not_member', 'quien no está en la sala nunca cierra');
select pg_temp.as_admin();

update public.games set voting_deadline = now() - interval '1 second' where id = (pg_temp.game()).id;
select lives_ok(
  format('select pg_temp.act(2, %L)', 'close_voting'),
  'pasada la hora, cualquier miembro cierra'
);
select is((pg_temp.game()).phase, 'reveal', 'y se revela con los votos que haya');
select is((pg_temp.game()).voting_deadline, null, 'sin hora límite fuera de la votación');

select pg_temp.as_user(2);
select throws_ok(format('select public.close_voting(%L)', pg_temp.room()), 'P0001', 'not_host', 'cerrada, ya no se puede volver a cerrar');
select pg_temp.as_admin();

-- Empate y segunda votación: el tiempo vuelve a empezar.
select pg_temp.act(1, 'continue_game');
update public.games set voting_deadline = null where id = (pg_temp.game()).id;
select pg_temp.act(1, 'open_voting');
select is((pg_temp.game()).voting_deadline, now() + interval '30 seconds', 'la siguiente votación vuelve a tener 30 s');

-- El anfitrión sigue pudiendo cerrar antes.
select lives_ok(
  format('select pg_temp.act(1, %L)', 'close_voting'),
  'el anfitrión cierra antes de tiempo'
);

-- Sin tiempo ---------------------------------------------------------------------------------------

update public.games set phase = 'finished', winner = 'group', finished_at = now() where id = (pg_temp.game()).id;
select pg_temp.call(1, format('select public.start_game(%L, 1)', pg_temp.room()));
select is((pg_temp.game()).vote_seconds, null, 'sin elegir tiempo, no hay');
select pg_temp.act(1, 'open_voting');
select is((pg_temp.game()).voting_deadline, null, 'ni hora límite');
select pg_temp.as_user(2);
select throws_ok(format('select public.close_voting(%L)', pg_temp.room()), 'P0001', 'not_host', 'sin tiempo solo cierra el anfitrión');
select pg_temp.as_admin();

select * from finish();
rollback;

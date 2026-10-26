begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 12) as i;

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

create function pg_temp.start(wolves text, roles text) returns text language sql stable as $$
  select format('select public.luna_llena_start(%L, %s, %s)', pg_temp.room(), wolves, roles)
$$;

create function pg_temp.roles() returns jsonb language sql stable as $$
  select jsonb_object_agg(role, n) from (
    select role, count(*) as n from public.game_roles where game_id = (pg_temp.game()).id group by role
  ) counts
$$;

-- Sala de 3 (u1 anfitrión) --------------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 3) as n;

select pg_temp.as_user(1);
select throws_ok(pg_temp.start('null', 'null'), 'P0001', 'invalid_game', 'no se empieza si la sala eligió otro juego');
select lives_ok(format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'), 'se elige Luna llena');
select throws_ok(pg_temp.start('null', 'null'), 'P0001', 'not_enough_players', 'con 3 jugadores no se empieza');
select pg_temp.as_admin();

select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(4, 9) as n;

select pg_temp.as_user(2);
select throws_ok(pg_temp.start('null', 'null'), 'P0001', 'not_host', 'solo empieza el anfitrión');
select pg_temp.as_user(1);
select throws_ok(pg_temp.start('9', 'array[]::text[]'), 'P0001', 'invalid_config', 'una composición inválida no empieza');
select pg_temp.as_admin();
select is((pg_temp.game()).id, null::uuid, 'y no crea partida');

-- Reparto ------------------------------------------------------------------------------------

select pg_temp.call(1, pg_temp.start('3', $$array['cupid', 'jester', 'seer']$$));
select is((pg_temp.game()).phase, 'roles', 'empieza en el reparto');
select is((pg_temp.game()).game_type, 'luna_llena', 'de Luna llena');
select is(
  (select count(*) from public.game_players where game_id = (pg_temp.game()).id and alive),
  9::bigint,
  'juegan los nueve, vivos'
);
select is(
  pg_temp.roles(),
  '{"wolf": 3, "seer": 1, "jester": 1, "cupid": 1, "villager": 3}'::jsonb,
  'el reparto coincide exactamente con la composición pedida'
);
select is(
  (select config from public.luna_state where game_id = (pg_temp.game()).id),
  '{"wolves": 3, "roles": ["seer", "jester", "cupid"]}'::jsonb,
  'y la composición queda guardada'
);
select is(
  (select (night, day, mayor_id, lover_a, hunter_pending, announcement, winner)::text from public.luna_state where game_id = (pg_temp.game()).id),
  '(0,0,,,f,,)',
  'sin noches, días, alcalde, enamorados ni anuncios'
);

select pg_temp.as_user(1);
select throws_ok(pg_temp.start('null', 'null'), 'P0001', 'invalid_phase', 'no se empieza otra con una en curso');
select pg_temp.as_admin();

-- Desde una partida terminada, con la recomendada ---------------------------------------------

insert into ctx select 'first', to_jsonb((pg_temp.game()).id);
update public.games set phase = 'finished', finished_at = now() where id = (pg_temp.game()).id;

select pg_temp.call(1, pg_temp.start('null', 'null'));
select isnt((pg_temp.game()).id, (select (value #>> '{}')::uuid from ctx where key = 'first'), 'tras terminar, empieza una nueva');
select is(
  pg_temp.roles(),
  '{"wolf": 2, "seer": 1, "protector": 1, "hunter": 1, "villager": 4}'::jsonb,
  'sin composición, la recomendada para 9'
);

-- Composiciones libres --------------------------------------------------------------------------

create function pg_temp.restart(wolves text, roles text) returns jsonb language plpgsql as $$
begin
  update public.games set phase = 'finished', finished_at = now() where id = (pg_temp.game()).id;
  return pg_temp.call(1, pg_temp.start(wolves, roles));
end;
$$;

select pg_temp.restart('2', $$array['protector']$$);
select is(pg_temp.roles(), '{"wolf": 2, "protector": 1, "villager": 6}'::jsonb, 'sin vidente pedida, se reparte sin vidente');
select is(
  (select count(*) from public.game_roles where game_id = (pg_temp.game()).id and role = 'seer'),
  0::bigint,
  'y no aparece ninguna'
);

select pg_temp.restart('2', $$array['seer', 'protector', 'hunter', 'jester', 'cupid', 'witch', 'killer']$$);
select is(
  pg_temp.roles(),
  '{"wolf": 2, "seer": 1, "protector": 1, "hunter": 1, "jester": 1, "cupid": 1, "witch": 1, "killer": 1}'::jsonb,
  'todos los especiales y ningún aldeano'
);

select pg_temp.restart('0', $$array['killer']$$);
select is(pg_temp.roles(), '{"killer": 1, "villager": 8}'::jsonb, 'sin lobos, con el asesino');

select pg_temp.restart('8', 'array[]::text[]');
select is(pg_temp.roles(), '{"wolf": 8, "villager": 1}'::jsonb, 'ocho lobos de nueve');
select is((pg_temp.game()).phase, 'roles', 'y la partida empieza');

-- Entra tarde y se va ----------------------------------------------------------------------------

select pg_temp.call(10, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 10'));
select is(
  (select count(*) from public.game_players where game_id = (pg_temp.game()).id),
  9::bigint,
  'quien entra tarde no juega esta partida'
);
select is(
  (select count(*) from public.game_roles where game_id = (pg_temp.game()).id and user_id = pg_temp.u(10)),
  0::bigint,
  'ni recibe rol'
);

select pg_temp.as_user(1);
select throws_ok(
  format('select public.luna_llena_start(%L, null, null)', '10000000-0000-0000-0000-000000000099'),
  'P0001', 'room_not_found', 'una sala inexistente falla'
);
select pg_temp.as_admin();

select * from finish();
rollback;

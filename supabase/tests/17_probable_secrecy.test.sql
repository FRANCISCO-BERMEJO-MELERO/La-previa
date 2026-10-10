begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

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

create function pg_temp.state_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room()))
$$;

create function pg_temp.vote(voter integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(voter, format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

-- ¿Cuántas veces aparece el id de u(n) en la foto?
create function pg_temp.mentions(state jsonb, n integer) returns bigint language sql immutable as $$
  select count(*) from jsonb_path_query(state, 'strict $.** ? (@ == $id)', jsonb_build_object('id', pg_temp.u(n)))
$$;

-- ¿Aparece alguna clave llamada `key` en cualquier nivel?
create function pg_temp.has_key(state jsonb, key text) returns boolean language sql immutable as $$
  select exists (
    select 1 from jsonb_path_query(state, 'strict $.**') node
    where jsonb_typeof(node) = 'object' and node ? key
  )
$$;

-- Sala de 4 con u1 de anfitrión, partida de 5 rondas.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), format('Jugador %s', n)))
from generate_series(2, 4) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'probable'));
select pg_temp.call(1, format('select public.probable_start(%L, 5)', pg_temp.room()));

-- Secreto mientras se vota ----------------------------------------------------------------------

select pg_temp.vote(2, 3);
select pg_temp.vote(3, 4);

select is(pg_temp.mentions(pg_temp.state_of(1), 3), 2::bigint, 'el votado solo aparece en las listas de jugadores y de participantes');
select is(pg_temp.mentions(pg_temp.state_of(1), 4), 2::bigint, 'para todos los votados');
select is(pg_temp.mentions(pg_temp.state_of(2), 3), 3::bigint, 'quien ha votado ve además su propio voto');
select is(pg_temp.state_of(4) #>> '{game,my,voted_for}', null, 'nadie ve el voto de otro');
select is(pg_temp.has_key(pg_temp.state_of(1), 'target_id'), false, 'la foto no tiene destinos de votos');
select is(pg_temp.has_key(pg_temp.state_of(1), 'voter_ids'), false, 'ni quién ha votado a quién');
select is(pg_temp.has_key(pg_temp.state_of(1), 'votes'), false, 'ni recuentos');
select is(
  (select result from public.game_rounds gr join public.rooms r on r.current_game_id = gr.game_id where r.id = pg_temp.room()),
  null,
  'el recuento no existe hasta cerrar'
);

-- Votar a quien ya no está --------------------------------------------------------------------------

select pg_temp.call(4, format('select public.leave_room(%L)', pg_temp.room()));
select pg_temp.as_user(1);
select throws_ok(format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(4)), 'P0001', 'invalid_target', 'no se vota a quien ya no participa');
select pg_temp.as_admin();

-- En la revelación el recuento es público ----------------------------------------------------------

select pg_temp.vote(1, 2);
select pg_temp.vote(3, 2);
select is(pg_temp.state_of(1) #>> '{game,phase}', 'reveal', 'votan los que quedan y se revela');
select is(pg_temp.has_key(pg_temp.state_of(1) -> 'game', 'voter_ids'), true, 'ahora sí se ve quién votó a quién');
select is(
  (pg_temp.state_of(1) #> '{game,tally}') -> 0 -> 'voter_ids',
  (select jsonb_agg(x order by x) from unnest(array[pg_temp.u(1), pg_temp.u(3)]) x),
  'el más votado, con quienes le votaron'
);

select * from finish();
rollback;

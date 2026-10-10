begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.as_uid(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
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

create function pg_temp.game_id() returns uuid language sql stable as $$
  select current_game_id from public.rooms where id = pg_temp.room()
$$;

create function pg_temp.call(n integer, sql text) returns jsonb language plpgsql as $$
declare
  result jsonb;
begin
  perform pg_temp.as_uid(pg_temp.u(n));
  execute sql into result;
  perform pg_temp.as_admin();
  return result;
end;
$$;

-- La parte de partida de la foto de u(n).
create function pg_temp.game_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

-- Sala de 5 (u1 anfitrión), u5 impostor.
select pg_temp.as_uid(pg_temp.u(1));
insert into ctx values ('room', to_jsonb(public.create_room('Jugador 1') -> 'room' ->> 'id'));
select pg_temp.as_admin();
insert into ctx values ('code', to_jsonb((select code from public.rooms where id = pg_temp.room())));
create function pg_temp.join_all() returns void language plpgsql as $$
begin
  for n in 2..5 loop
    perform pg_temp.call(n, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), format('Jugador %s', n)));
  end loop;
end;
$$;
select pg_temp.join_all();

select is(pg_temp.game_of(2), 'null'::jsonb, 'en la sala de espera no hay partida');

select pg_temp.call(1, format('select public.start_game(%L, 1)', pg_temp.room()));
update public.game_roles set role = case when user_id = pg_temp.u(5) then 'impostor' else 'player' end
where game_id = pg_temp.game_id();
insert into ctx values ('word', to_jsonb((select w.word from public.games g join public.words w on w.id = g.word_id where g.id = pg_temp.game_id())));
insert into ctx values ('category', to_jsonb((select w.category from public.games g join public.words w on w.id = g.word_id where g.id = pg_temp.game_id())));

-- Hablando ----------------------------------------------------------------------------------

select is(pg_temp.game_of(2) ->> 'phase', 'talking', 'la foto dice la fase');
select is((pg_temp.game_of(2) ->> 'round')::int, 1, 'y la ronda');
select is(pg_temp.game_of(2) ->> 'category', (select value #>> '{}' from ctx where key = 'category'), 'todos ven la categoría');
select is(
  pg_temp.game_of(2) -> 'my',
  jsonb_build_object('is_participant', true, 'alive', true, 'role', 'player',
                     'word', (select value #>> '{}' from ctx where key = 'word'), 'voted_for', null),
  'un jugador normal ve su rol y la palabra'
);
select is(
  pg_temp.game_of(5) -> 'my',
  '{"is_participant": true, "alive": true, "role": "impostor", "word": null, "voted_for": null}'::jsonb,
  'el impostor ve su rol y no la palabra'
);
select is((pg_temp.game_of(2) ->> 'impostors_left')::int, 1, 'cuántos impostores quedan');
select is(jsonb_array_length(pg_temp.game_of(2) -> 'participants'), 5, 'la lista de participantes');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(pg_temp.game_of(2) -> 'participants' -> 0) k),
  array['alive', 'has_voted', 'name', 'user_id'],
  'cada participante lleva solo nombre, si sigue vivo y si ha votado'
);
select is(
  (select array_agg(p ->> 'name') from jsonb_array_elements(pg_temp.game_of(2) -> 'participants') p),
  array['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4', 'Jugador 5'],
  'en el orden de entrada a la sala'
);
select is(pg_temp.game_of(2) -> 'outcome', 'null'::jsonb, 'sin revelación');
select is(pg_temp.game_of(2) -> 'result', 'null'::jsonb, 'sin resultado');
select is((pg_temp.game_of(2) ->> 'game_over')::boolean, false, 'la partida no se acaba');

-- Votando -----------------------------------------------------------------------------------

select pg_temp.call(1, format('select public.open_voting(%L)', pg_temp.room()));
select pg_temp.call(2, format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(5)));
select is(pg_temp.game_of(2) -> 'my' ->> 'voted_for', pg_temp.u(5)::text, 'cada uno ve a quién ha votado');
select is(pg_temp.game_of(3) -> 'my' -> 'voted_for', 'null'::jsonb, 'quien no ha votado no ve votos');
select is(
  (select p ->> 'has_voted' from jsonb_array_elements(pg_temp.game_of(3) -> 'participants') p where p ->> 'user_id' = pg_temp.u(2)::text),
  'true',
  'los demás ven quién ha votado'
);

-- Revelación: cae el impostor ------------------------------------------------------------------

select pg_temp.call(3, format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(5)));
select pg_temp.call(1, format('select public.close_voting(%L)', pg_temp.room()));
select is(pg_temp.game_of(2) -> 'outcome' ->> 'type', 'eliminated', 'en la revelación se ve el resultado');
select is((pg_temp.game_of(2) ->> 'game_over')::boolean, true, 'y se sabe que al continuar se acaba');
select is((pg_temp.game_of(2) ->> 'impostors_left')::int, 0, 'ya no quedan impostores');
select is(pg_temp.game_of(5) -> 'my' ->> 'alive', 'false', 'el expulsado se ve fuera');

-- Terminada ---------------------------------------------------------------------------------

select pg_temp.call(1, format('select public.continue_game(%L)', pg_temp.room()));
select is(
  pg_temp.game_of(2) -> 'result',
  jsonb_build_object('winner', 'group', 'word', (select value #>> '{}' from ctx where key = 'word'),
                     'impostor_ids', jsonb_build_array(pg_temp.u(5))),
  'al terminar se revelan ganador, palabra e impostores'
);
select is(pg_temp.game_of(2) -> 'outcome' ->> 'type', 'eliminated', 'y se conserva la última revelación');
select is((pg_temp.game_of(2) ->> 'game_over')::boolean, false, 'game_over solo cuenta en la revelación');

-- Quien llega tarde ------------------------------------------------------------------------------

select pg_temp.call(1, format('select public.start_game(%L, 1)', pg_temp.room()));
select pg_temp.call(6, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), 'Tardón'));
select is(
  pg_temp.game_of(6) -> 'my',
  '{"is_participant": false, "alive": false, "role": null, "word": null, "voted_for": null}'::jsonb,
  'quien llega tarde no participa y no recibe rol ni palabra'
);
select isnt(pg_temp.game_of(6) ->> 'category', null, 'pero sí ve la categoría');
select is(jsonb_array_length(pg_temp.game_of(6) -> 'participants'), 5, 'y no aparece entre los participantes');

select * from finish();
rollback;

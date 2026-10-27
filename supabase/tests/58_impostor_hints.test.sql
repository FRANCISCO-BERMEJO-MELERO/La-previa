begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

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

create function pg_temp.game_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

create function pg_temp.hint() returns text language sql stable as $$
  select w.hint from public.games g join public.words w on w.id = g.word_id where g.id = pg_temp.game_id()
$$;

-- Las palabras --------------------------------------------------------------------------------

select col_not_null('public', 'words', 'hint', 'toda palabra tiene pista');
select is(
  (select count(*)::int from public.words where btrim(hint) = ''),
  0,
  'ninguna pista está vacía'
);
select is(
  (
    select array_agg(word order by word) from public.words
    where strpos(private.normalize_clue(hint), private.normalize_clue(word)) > 0
       or strpos(private.normalize_clue(word), private.normalize_clue(hint)) > 0
  ),
  null,
  'ninguna pista contiene su palabra ni está dentro de ella'
);
select is(
  (select count(*)::int from public.words where char_length(hint) > 20),
  0,
  'las pistas son cortas'
);
select throws_ok(
  $$update public.words set hint = '  ' where word = 'Paella'$$,
  '23514',
  null,
  'una pista en blanco se rechaza'
);
select is(
  (select hint from public.words where category = 'Comida' and word = 'Paella'),
  'Valencia',
  'cada palabra tiene la suya'
);

-- La foto -----------------------------------------------------------------------------------

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

select pg_temp.call(1, format('select public.start_game(%L, 1)', pg_temp.room()));
update public.game_roles set role = case when user_id = pg_temp.u(5) then 'impostor' else 'player' end
where game_id = pg_temp.game_id();

select is(pg_temp.game_of(5) ->> 'hint', pg_temp.hint(), 'el impostor recibe la pista de la palabra');
select is(pg_temp.game_of(2) -> 'hint', 'null'::jsonb, 'un jugador normal no recibe la pista');

select pg_temp.call(6, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), 'Tardón'));
select is(pg_temp.game_of(6) -> 'hint', 'null'::jsonb, 'quien llega tarde tampoco');

-- Expulsado, el impostor sigue viendo su pista hasta el final.
select pg_temp.call(1, format('select public.open_voting(%L)', pg_temp.room()));
select pg_temp.call(n, format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(5))) from generate_series(1, 4) n;
select pg_temp.call(1, format('select public.close_voting(%L)', pg_temp.room()));
select is(pg_temp.game_of(5) ->> 'hint', pg_temp.hint(), 'y la conserva tras ser expulsado');

select * from finish();
rollback;

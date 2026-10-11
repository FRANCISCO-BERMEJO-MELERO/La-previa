begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

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

-- Temática de la palabra de la partida en curso.
create function pg_temp.category() returns text language sql stable as $$
  select w.category from public.rooms r join public.games g on g.id = r.current_game_id
  join public.words w on w.id = g.word_id where r.id = pg_temp.room()
$$;

create function pg_temp.restart(categories text) returns jsonb language plpgsql as $$
begin
  update public.games set phase = 'finished', winner = 'group', finished_at = now()
  where id = (select current_game_id from public.rooms where id = pg_temp.room());
  return pg_temp.call(1, format('select public.start_game(%L, 1, %s)', pg_temp.room(), categories));
end;
$$;

-- Lista de temáticas ---------------------------------------------------------------------------

select pg_temp.as_user(1);
select is(
  array_length(public.impostor_categories(), 1),
  15,
  'hay 15 temáticas'
);
select is(
  (public.impostor_categories())[1:3],
  array['Animales', 'Ciencia', 'Cine y series'],
  'en orden alfabético'
);
select pg_temp.as_admin();
update public.words set active = false where category = 'Fútbol';
select pg_temp.as_user(1);
select ok(not ('Fútbol' = any (public.impostor_categories())), 'sin palabras activas, la temática no sale');
select pg_temp.as_admin();
update public.words set active = true where category = 'Fútbol';

set local role anon;
select throws_ok('select public.impostor_categories()', '42501', null, 'sin sesión no se pueden pedir');
reset role;

-- Empezar con temáticas ------------------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select code from public.rooms where id = pg_temp.room()), format('Jugador %s', n)))
from generate_series(2, 4) as n;

select pg_temp.as_user(1);
select throws_ok(
  format('select public.start_game(%L, 1, %L)', pg_temp.room(), '{Fútbol,Parchís}'),
  'P0001', 'invalid_categories', 'una temática que no existe se rechaza'
);
select throws_ok(
  format('select public.start_game(%L, 1, %s)', pg_temp.room(), 'array[null]::text[]'),
  'P0001', 'invalid_categories', 'una temática vacía también'
);
select pg_temp.as_admin();

select pg_temp.call(1, format('select public.start_game(%L, 1, %L)', pg_temp.room(), '{Fútbol}'));
select is(pg_temp.category(), 'Fútbol', 'con una temática, la palabra sale de ella');

select pg_temp.restart($$'{Historia,Ciencia}'$$);
select ok(pg_temp.category() in ('Historia', 'Ciencia'), 'con varias, de alguna de ellas');

select pg_temp.restart($$'{}'$$);
select isnt(pg_temp.category(), null, 'sin ninguna elegida, sale de cualquiera');

select pg_temp.restart('null');
select isnt(pg_temp.category(), null, 'sin pasarlas, también');

-- No repite mientras queden palabras de la temática.
update public.words set active = (category = 'Videojuegos' and word in ('Tetris', 'Sonic')) or category <> 'Videojuegos';
select pg_temp.restart($$'{Videojuegos}'$$);
insert into ctx select 'first', to_jsonb((select w.word from public.rooms r join public.games g on g.id = r.current_game_id join public.words w on w.id = g.word_id where r.id = pg_temp.room()));
select pg_temp.restart($$'{Videojuegos}'$$);
select isnt(
  (select w.word from public.rooms r join public.games g on g.id = r.current_game_id join public.words w on w.id = g.word_id where r.id = pg_temp.room()),
  (select value #>> '{}' from ctx where key = 'first'),
  'no repite palabra de la temática mientras quede otra'
);
select pg_temp.restart($$'{Videojuegos}'$$);
select is(pg_temp.category(), 'Videojuegos', 'agotada la temática, repite antes que salirse de ella');

-- La llamada de siempre, sin temáticas, sigue funcionando.
select pg_temp.as_admin();
update public.games set phase = 'finished', winner = 'group', finished_at = now()
where id = (select current_game_id from public.rooms where id = pg_temp.room());
select lives_ok(
  format('select pg_temp.call(1, %L)', format('select public.start_game(%L, 1)', pg_temp.room())),
  'start_game con dos argumentos sigue valiendo'
);
select pg_temp.as_user(2);
select throws_ok(
  format('select public.start_game(%L, 1, %L)', pg_temp.room(), '{Fútbol}'),
  'P0001', 'not_host', 'solo el anfitrión empieza'
);
select pg_temp.as_admin();

select * from finish();
rollback;

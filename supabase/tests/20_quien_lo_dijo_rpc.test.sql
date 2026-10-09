begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

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

create function pg_temp.host(action text) returns jsonb language sql as $$
  select pg_temp.call(1, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.answer(n integer, text text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.quien_lo_dijo_answer(%L, %L)', pg_temp.room(), text))
$$;

create function pg_temp.vote(voter integer, target uuid) returns jsonb language sql as $$
  select pg_temp.call(voter, format('select public.quien_lo_dijo_vote(%L, %L)', pg_temp.room(), target))
$$;

create function pg_temp.author() returns uuid language sql stable as $$
  select subject_id from public.game_rounds where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

-- Número de jugador (1-9) de un id.
create function pg_temp.n(id uuid) returns integer language sql immutable as $$
  select right(id::text, 2)::integer
$$;

create function pg_temp.score(n integer) returns integer language sql stable as $$
  select score from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(n)
$$;

create function pg_temp.scores() returns integer[] language sql stable as $$
  select array_agg(score order by user_id) from public.game_players where game_id = (pg_temp.game()).id
$$;

create function pg_temp.round_result() returns jsonb language sql stable as $$
  select result from public.game_rounds where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

-- Sala de 4 con u1 de anfitrión ---------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 4) as n;

select pg_temp.as_user(1);
select throws_ok(format('select public.quien_lo_dijo_start(%L, 5)', pg_temp.room()), 'P0001', 'invalid_game', 'no se empieza si la sala eligió otro juego');
select lives_ok(format('select public.set_game(%L, %L)', pg_temp.room(), 'quien_lo_dijo'), 'set_game acepta quien_lo_dijo');
select throws_ok(format('select public.quien_lo_dijo_start(%L, 4)', pg_temp.room()), 'P0001', 'invalid_rounds', 'las rondas son 5, 10 o 15');
select pg_temp.as_user(2);
select throws_ok(format('select public.quien_lo_dijo_start(%L, 5)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión empieza');
select pg_temp.as_admin();

select pg_temp.call(1, format('select public.quien_lo_dijo_start(%L, 5)', pg_temp.room()));
select is((pg_temp.game()).phase, 'writing', 'empieza escribiendo');
select isnt(
  (select prompt_id from public.game_rounds where game_id = (pg_temp.game()).id and round = 1),
  null,
  'con una pregunta de quien_lo_dijo'
);
select is(
  (select p.game_type from public.game_rounds gr join public.prompts p on p.id = gr.prompt_id where gr.game_id = (pg_temp.game()).id and gr.round = 1),
  'quien_lo_dijo',
  'del juego que toca'
);

-- Escribir --------------------------------------------------------------------------------------

select pg_temp.as_user(2);
select throws_ok(format('select public.quien_lo_dijo_answer(%L, %L)', pg_temp.room(), ''), 'P0001', 'invalid_answer', 'una respuesta vacía no vale');
select throws_ok(format('select public.quien_lo_dijo_answer(%L, %L)', pg_temp.room(), '    '), 'P0001', 'invalid_answer', 'ni una de solo espacios');
select throws_ok(format('select public.quien_lo_dijo_answer(%L, %L)', pg_temp.room(), repeat('a', 81)), 'P0001', 'invalid_answer', 'ni una de más de 80 caracteres');
select throws_ok(format('select public.quien_lo_dijo_vote(%L, %L)', pg_temp.room(), pg_temp.u(3)), 'P0001', 'invalid_phase', 'no se vota mientras se escribe');
select pg_temp.as_admin();

select pg_temp.answer(2, E'  Ir a la   playa\n sin  móvil ');
select is(
  (select text from public.answers where game_id = (pg_temp.game()).id and user_id = pg_temp.u(2)),
  'Ir a la playa sin móvil',
  'se recortan y colapsan los espacios'
);
select lives_ok($$select pg_temp.answer(3, repeat('b', 80))$$, 'una respuesta de 80 caracteres vale');
select pg_temp.as_user(2);
select throws_ok(format('select public.quien_lo_dijo_answer(%L, %L)', pg_temp.room(), 'otra'), 'P0001', 'already_answered', 'no se responde dos veces');
select pg_temp.as_admin();
select pg_temp.call(5, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 5'));
select pg_temp.as_user(5);
select throws_ok(format('select public.quien_lo_dijo_answer(%L, %L)', pg_temp.room(), 'hola'), 'P0001', 'not_participant', 'quien llega a media ronda no responde');
select pg_temp.as_user(2);
select throws_ok(format('select public.quien_lo_dijo_close_writing(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión cierra la escritura');
select pg_temp.as_admin();

-- Cierre forzado de la escritura con respuestas parciales.
select pg_temp.host('quien_lo_dijo_close_writing');
select is((pg_temp.game()).phase, 'voting', 'cerrar la escritura pasa a votar');
select ok(pg_temp.n(pg_temp.author()) in (2, 3), 'la respuesta elegida es de alguien que respondió');

-- Votar -----------------------------------------------------------------------------------------

select pg_temp.as_user(pg_temp.n(pg_temp.author()));
select throws_ok(format('select public.quien_lo_dijo_vote(%L, %L)', pg_temp.room(), pg_temp.u(1)), 'P0001', 'is_author', 'el autor no vota');
select pg_temp.as_user(1);
select throws_ok(format('select public.quien_lo_dijo_vote(%L, %L)', pg_temp.room(), pg_temp.u(1)), 'P0001', 'invalid_target', 'nadie se vota a sí mismo');
select throws_ok(format('select public.quien_lo_dijo_vote(%L, %L)', pg_temp.room(), pg_temp.u(5)), 'P0001', 'invalid_target', 'ni a quien no participa');
select throws_ok(format('select public.quien_lo_dijo_answer(%L, %L)', pg_temp.room(), 'tarde'), 'P0001', 'invalid_phase', 'ya no se escribe');
select pg_temp.as_admin();

-- u1 acierta; el otro que no es autor falla. El autor (u2 o u3) y u4 quedan.
insert into ctx select 'other', to_jsonb(case when pg_temp.n(pg_temp.author()) = 2 then 3 else 2 end);
select pg_temp.vote(1, pg_temp.author());
select pg_temp.as_user(1);
select throws_ok(format('select public.quien_lo_dijo_vote(%L, %L)', pg_temp.room(), pg_temp.u(4)), 'P0001', 'already_voted', 'no se vota dos veces');
select pg_temp.as_admin();
select pg_temp.vote((select value::int from ctx where key = 'other'), pg_temp.u(1));
select is((pg_temp.game()).phase, 'voting', 'falta u4: se sigue votando');
select pg_temp.vote(4, pg_temp.u(1));
select is((pg_temp.game()).phase, 'reveal', 'cuando votan todos menos el autor, se revela solo');
select is(pg_temp.score(1), 1, 'un punto por acertar el autor');
select is(pg_temp.score(pg_temp.n(pg_temp.author())), 2, 'el autor se lleva uno por cada fallo');
select is(pg_temp.score(4), 0, 'fallar no puntúa');
select is(
  pg_temp.round_result(),
  jsonb_build_object(
    'author_id', pg_temp.author(),
    'correct_ids', jsonb_build_array(pg_temp.u(1)),
    'wrong_ids', (select jsonb_agg(x order by x) from unnest(array[pg_temp.u((select value::int from ctx where key = 'other')), pg_temp.u(4)]) x)
  ),
  'la ronda guarda autor, aciertos y fallos'
);

-- Ronda 2: todos escriben y se cierra sola; votos con cierre forzado ---------------------------------

select pg_temp.host('quien_lo_dijo_next');
select is((pg_temp.game()).round, 2, 'siguiente ronda');
select is((pg_temp.game()).phase, 'writing', 'que empieza escribiendo');
select is(
  (select alive from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(5)),
  true,
  'quien llegó tarde entra en la ronda siguiente'
);
select pg_temp.answer(n, format('respuesta %s', n)) from generate_series(1, 4) as n;
select is((pg_temp.game()).phase, 'writing', 'falta uno por escribir');
select pg_temp.answer(5, 'respuesta 5');
select is((pg_temp.game()).phase, 'voting', 'cuando escriben todos, se pasa a votar solo');
insert into ctx select 'scores_before', to_jsonb(pg_temp.scores());
select pg_temp.host('quien_lo_dijo_close_voting');
select is((pg_temp.game()).phase, 'reveal', 'cerrar la votación sin votos pasa a la revelación');
select is(to_jsonb(pg_temp.scores()), (select value from ctx where key = 'scores_before'), 'sin votos nadie puntúa');

-- Ronda 3: nadie escribe; la ronda se salta ---------------------------------------------------------

select pg_temp.host('quien_lo_dijo_next');
select pg_temp.host('quien_lo_dijo_close_writing');
select is((pg_temp.game()).round, 4, 'sin respuestas la ronda se salta');
select is((pg_temp.game()).phase, 'writing', 'y se escribe la siguiente');
select is(
  (select result from public.game_rounds where game_id = (pg_temp.game()).id and round = 3),
  '{"skipped": true}'::jsonb,
  'la ronda saltada queda marcada'
);
select is(to_jsonb(pg_temp.scores()), (select value from ctx where key = 'scores_before'), 'sin puntos');

-- Ronda 4: se va el autor elegido durante la votación ----------------------------------------------

select pg_temp.answer(n, format('cuarta %s', n)) from generate_series(1, 5) as n;
select is((pg_temp.game()).phase, 'voting', 'votando la cuarta');
insert into ctx select 'leaving', to_jsonb(pg_temp.n(pg_temp.author()));
update public.room_players set last_seen_at = now() - interval '5 minutes'
where user_id = pg_temp.u((select value::int from ctx where key = 'leaving'));
select case
  when (select value::int from ctx where key = 'leaving') = 1 then pg_temp.call(1, format('select public.leave_room(%L)', pg_temp.room()))
  else pg_temp.call(1, format('select public.kick_player(%L, %L)', pg_temp.room(), pg_temp.u((select value::int from ctx where key = 'leaving'))))
end;
select is((pg_temp.game()).phase, 'reveal', 'si se va el autor, se pasa a la revelación');
select is(pg_temp.round_result(), '{"annulled": true}'::jsonb, 'con la ronda anulada');
select is(
  (select count(*) from public.votes where game_id = (pg_temp.game()).id and round = 4),
  0::bigint,
  'y sin votos que puntúen'
);
select is(
  (select count(*) from public.answers where game_id = (pg_temp.game()).id and round = 4),
  5::bigint,
  'las respuestas de la ronda se conservan para enseñarlas'
);

-- La elección rota entre autores ------------------------------------------------------------------

select is(
  (select count(distinct subject_id) from public.game_rounds where game_id = (pg_temp.game()).id and subject_id is not null),
  (select count(*) from public.game_rounds where game_id = (pg_temp.game()).id and subject_id is not null),
  'nunca repite autor mientras haya otros que no han salido'
);

select * from finish();
rollback;

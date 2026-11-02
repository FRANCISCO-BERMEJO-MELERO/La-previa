begin;
create extension if not exists pgtap with schema extensions;

select plan(82);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 21) as i;

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

create function pg_temp.room(room_key text default 'room') returns uuid language sql stable as $$
  select (value #>> '{}')::uuid from ctx where key = room_key
$$;

create function pg_temp.code(room_key text default 'room') returns text language sql stable as $$
  select code from public.rooms where id = pg_temp.room(room_key)
$$;

create function pg_temp.game(room_key text default 'room') returns public.games language sql stable as $$
  select g.* from public.games g join public.rooms r on r.current_game_id = g.id where r.id = pg_temp.room(room_key)
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

create function pg_temp.act(n integer, action text, room_key text default 'room') returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.%s(%L)', action, pg_temp.room(room_key)))
$$;

create function pg_temp.join(n integer, room_key text default 'room') returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(room_key), format('Jugador %s', n)))
$$;

create function pg_temp.answer(n integer, text text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.cuela_answer(%L, %L)', pg_temp.room(), text))
$$;

create function pg_temp.vote(n integer, option_id uuid) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.cuela_vote(%L, %L)', pg_temp.room(), option_id))
$$;

-- Rechazo de una acción hecha por un jugador; la sentencia se prepara antes, con permisos de prueba.
create function pg_temp.rejects(n integer, sql text, code text, description text) returns text language plpgsql as $$
declare
  result text;
begin
  perform pg_temp.as_user(n);
  result := throws_ok(sql, 'P0001', code, description);
  perform pg_temp.as_admin();
  return result;
end;
$$;

-- Opciones de la ronda en curso.
create function pg_temp.options() returns setof public.cuela_options language sql stable as $$
  select o.* from public.cuela_options o
  where o.game_id = (pg_temp.game()).id and o.round = (pg_temp.game()).round
  order by o.position
$$;

create function pg_temp.option_of(target_text text) returns uuid language sql stable as $$
  select option_id from pg_temp.options() where text = target_text
$$;

create function pg_temp.truth_option() returns uuid language sql stable as $$
  select option_id from pg_temp.options() where kind = 'truth'
$$;

create function pg_temp.authors(target_text text) returns uuid[] language sql stable as $$
  select array_agg(oa.user_id order by oa.user_id)
  from public.cuela_option_authors oa where oa.option_id = pg_temp.option_of(target_text)
$$;

create function pg_temp.scores(room_key text default 'room') returns integer[] language sql stable as $$
  select array_agg(score order by user_id) from public.game_players where game_id = (pg_temp.game(room_key)).id
$$;

create function pg_temp.answers() returns bigint language sql stable as $$
  select count(*) from public.answers where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

create function pg_temp.question_id(target_round integer) returns bigint language sql stable as $$
  select cuela_question_id from public.game_rounds where game_id = (pg_temp.game()).id and round = target_round
$$;

-- Dos preguntas iguales salvo el enunciado: así lo que pasa no depende de cuál salga.
update public.cuela_questions set active = false;
insert into public.cuela_questions (text, truth, accepted, explanation, source, distractors)
select format('Pregunta de prueba %s', i), 'Para sujetar una vela', '{"Sujetar velas"}', 'Explicación de prueba.', 'Prueba',
  '{"Para afinar guitarras", "Para medir la lluvia", "Para espantar moscas"}'
from generate_series(1, 2) as i;

-- Normalización ---------------------------------------------------------------------------------

select is(private.normalize_answer('ÁRBOL'), 'arbol', 'minúsculas y sin tildes');
select is(private.normalize_answer('Pingüino'), 'pinguino', 'sin diéresis');
select is(private.normalize_answer('Año'), 'año', 'la ñ se conserva');
select is(private.normalize_answer('¡Hola, «tú»! ¿Qué?'), 'hola tu que', 'sin puntuación ni comillas');
select is(private.normalize_answer('   muchos    espacios  '), 'muchos espacios', 'espacios colapsados y recortados');
select is(private.normalize_answer('Las velas'), 'velas', 'sin el artículo inicial');
select is(private.normalize_answer('Unos gatos'), 'gatos', 'también unos');
select is(private.normalize_answer('Elefante'), 'elefante', 'un artículo pegado a la palabra no se quita');
select is(private.normalize_answer('Para la vela'), 'para la vela', 'solo el artículo del principio');
select isnt(private.normalize_answer('gato'), private.normalize_answer('gatos'), 'los plurales no se igualan');

-- Empezar ---------------------------------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
select pg_temp.join(2);

select pg_temp.as_user(1);
select throws_ok(format('select public.cuela_start(%L, 5)', pg_temp.room()), 'P0001', 'invalid_game', 'no se empieza si la sala eligió otro juego');
select lives_ok(format('select public.set_game(%L, %L)', pg_temp.room(), 'cuela_la_mentira'), 'set_game acepta cuela_la_mentira');
select throws_ok(format('select public.cuela_start(%L, 5)', pg_temp.room()), 'P0001', 'not_enough_players', 'con 2 no se empieza');
select pg_temp.as_admin();
select pg_temp.join(n) from generate_series(3, 4) as n;

select pg_temp.as_user(1);
select throws_ok(format('select public.cuela_start(%L, 4)', pg_temp.room()), 'P0001', 'invalid_rounds', 'las rondas son 5, 10 o 15');
select pg_temp.as_user(2);
select throws_ok(format('select public.cuela_start(%L, 5)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión empieza');
select pg_temp.as_admin();

select pg_temp.call(1, format('select public.cuela_start(%L, 5)', pg_temp.room()));
select is((pg_temp.game()).phase, 'writing', 'empieza escribiendo');
select is((pg_temp.game()).total_rounds, 5, 'con las rondas elegidas');
select isnt(pg_temp.question_id(1), null, 'con una pregunta del banco');

-- Escribir --------------------------------------------------------------------------------------

select pg_temp.as_user(2);
select throws_ok(format('select public.cuela_answer(%L, %L)', pg_temp.room(), '   '), 'P0001', 'invalid_answer', 'una mentira vacía no vale');
select throws_ok(format('select public.cuela_answer(%L, %L)', pg_temp.room(), repeat('a', 81)), 'P0001', 'invalid_answer', 'ni una de más de 80');
select throws_ok(format('select public.cuela_answer(%L, %L)', pg_temp.room(), 'Para sujetar una vela'), 'P0001', 'is_truth', 'la verdad exacta no vale');
select throws_ok(format('select public.cuela_answer(%L, %L)', pg_temp.room(), 'sujetar velas'), 'P0001', 'is_truth', 'ni una variante aceptada');
select throws_ok(format('select public.cuela_answer(%L, %L)', pg_temp.room(), '  ¡PARA sujetar, una vela!  '), 'P0001', 'is_truth', 'ni la verdad escrita de otra forma');
select pg_temp.as_admin();
select is(pg_temp.answers(), 0::bigint, 'los rechazos no gastan el envío');

select pg_temp.answer(2, '  Para   medir la lluvia ');
select is(
  (select text from public.answers where game_id = (pg_temp.game()).id and user_id = pg_temp.u(2)),
  'Para medir la lluvia',
  'la mentira se guarda recortada y con los espacios colapsados'
);
select pg_temp.as_user(2);
select throws_ok(format('select public.cuela_answer(%L, %L)', pg_temp.room(), 'Otra'), 'P0001', 'already_answered', 'la mentira no se cambia');
select pg_temp.as_user(5);
select throws_ok(format('select public.cuela_answer(%L, %L)', pg_temp.room(), 'Otra'), 'P0001', 'not_member', 'quien no está en la sala no escribe');
select pg_temp.as_admin();

select pg_temp.answer(3, 'para medir la LLUVIA.');
select pg_temp.answer(1, 'Para afinar guitarras');
select is((pg_temp.game()).phase, 'writing', 'mientras falte alguien se sigue escribiendo');
select pg_temp.answer(4, 'Para espantar a los mosquitos');
select is((pg_temp.game()).phase, 'voting', 'cuando han escrito todos se pasa a votar');

-- Preparar las opciones --------------------------------------------------------------------------

select is((select count(*) from pg_temp.options()), 4::bigint, 'la verdad y una opción por mentira distinta');
select is((select count(*) from pg_temp.options() where kind = 'house'), 0::bigint, 'con tres o más no entra la casa');
select is(pg_temp.authors('Para medir la lluvia'), array[pg_temp.u(2), pg_temp.u(3)], 'las mentiras iguales se funden con sus dos autores');
select is(pg_temp.option_of('para medir la LLUVIA.'), null, 'y se enseña el texto de la primera que llegó');
select is((select array_agg(position order by position) from pg_temp.options()), array[1, 2, 3, 4], 'las opciones quedan barajadas, cada una en un sitio');

-- Votar -----------------------------------------------------------------------------------------

select pg_temp.rejects(2, format('select public.cuela_vote(%L, %L)', pg_temp.room(), pg_temp.option_of('Para medir la lluvia')), 'own_option', 'no se vota la opción propia');
select pg_temp.rejects(3, format('select public.cuela_vote(%L, %L)', pg_temp.room(), pg_temp.option_of('Para medir la lluvia')), 'own_option', 'tampoco el otro autor de una mentira fundida');
select pg_temp.rejects(3, format('select public.cuela_vote(%L, %L)', pg_temp.room(), gen_random_uuid()), 'invalid_option', 'ni una opción que no existe');
select pg_temp.rejects(3, format('select public.cuela_vote(%L, null)', pg_temp.room()), 'invalid_option', 'ni ninguna');

select pg_temp.vote(2, pg_temp.truth_option());
select pg_temp.rejects(2, format('select public.cuela_vote(%L, %L)', pg_temp.room(), pg_temp.option_of('Para afinar guitarras')), 'already_voted', 'el voto no se cambia');
select pg_temp.vote(3, pg_temp.option_of('Para afinar guitarras'));
select pg_temp.vote(4, pg_temp.option_of('Para medir la lluvia'));
select is((pg_temp.game()).phase, 'voting', 'mientras falte alguien se sigue votando');
select is(pg_temp.scores(), array[0, 0, 0, 0], 'y nadie suma antes de cerrar');
select pg_temp.vote(1, pg_temp.option_of('Para medir la lluvia'));
select is((pg_temp.game()).phase, 'reveal', 'cuando han votado todos se revela');

-- u2: 2 por la verdad y 2 por los votos a su mentira fundida; u3: esos 2; u1: 1 por el voto de u3.
select is(pg_temp.scores(), array[1, 4, 2, 0], '2 por acertar y 1 por engañado, a cada autor');
select is(
  (select result -> 'points' from public.game_rounds where game_id = (pg_temp.game()).id and round = 1),
  jsonb_build_array(
    jsonb_build_object('user_id', pg_temp.u(1), 'points', 1),
    jsonb_build_object('user_id', pg_temp.u(2), 'points', 4),
    jsonb_build_object('user_id', pg_temp.u(3), 'points', 2),
    jsonb_build_object('user_id', pg_temp.u(4), 'points', 0)
  ),
  'los puntos de la ronda quedan guardados por jugador'
);
select pg_temp.as_user(1);
select throws_ok(format('select public.cuela_close_voting(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'cerrar otra vez no vale');
select pg_temp.as_admin();
select is(pg_temp.scores(), array[1, 4, 2, 0], 'y no vuelve a sumar');

select pg_temp.as_user(2);
select throws_ok(format('select public.cuela_next(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión sigue');
select pg_temp.as_admin();
select pg_temp.act(1, 'cuela_next');
select is((pg_temp.game()).round, 2, 'siguiente ronda');
select is((pg_temp.game()).phase, 'writing', 'otra vez escribiendo');
select isnt(pg_temp.question_id(2), pg_temp.question_id(1), 'con otra pregunta mientras queden');

-- Nadie escribe y nadie vota: cierres a mano ---------------------------------------------------

select pg_temp.as_user(2);
select throws_ok(format('select public.cuela_close_writing(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión cierra la escritura');
select pg_temp.as_admin();
select pg_temp.act(1, 'cuela_close_writing');
select is((pg_temp.game()).phase, 'voting', 'el anfitrión cierra aunque nadie haya escrito');
select is(
  (select array_agg(text order by text) from pg_temp.options() where kind = 'house'),
  array['Para afinar guitarras', 'Para medir la lluvia'],
  'sin mentiras, la verdad y dos de la casa'
);
select pg_temp.vote(2, pg_temp.option_of('Para afinar guitarras'));
select pg_temp.as_user(2);
select throws_ok(format('select public.cuela_close_voting(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión cierra la votación');
select pg_temp.as_admin();
select pg_temp.act(1, 'cuela_close_voting');
select is((pg_temp.game()).phase, 'reveal', 'el anfitrión cierra aunque falten votos');
select is(pg_temp.scores(), array[1, 4, 2, 0], 'votar a la casa no da puntos a nadie');

select pg_temp.act(1, 'cuela_next');
select ok(pg_temp.question_id(3) in (pg_temp.question_id(1), pg_temp.question_id(2)), 'agotadas las preguntas, vuelven a salir');

-- Una sola mentira, igual a un distractor: la casa completa sin repetir.
select pg_temp.answer(2, 'para afinar GUITARRAS');
select pg_temp.act(1, 'cuela_close_writing');
select is((select count(*) from pg_temp.options()), 3::bigint, 'con una mentira se completa hasta 3');
select is(
  (select count(distinct private.normalize_answer(text)) from pg_temp.options()),
  3::bigint,
  'sin repetir ninguna'
);
select is(
  (select array_agg(text) from pg_temp.options() where kind = 'house'),
  array['Para medir la lluvia'],
  'se salta el distractor que ya ha escrito alguien'
);
select pg_temp.act(1, 'cuela_close_voting');
select is((pg_temp.game()).phase, 'reveal', 'se revela aunque no vote nadie');
select is(pg_temp.scores(), array[1, 4, 2, 0], 'sin votos, nadie suma');

-- Entrar tarde e irse ---------------------------------------------------------------------------

select pg_temp.join(5);
select is(
  (select count(*) from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(5)),
  0::bigint,
  'quien entra a media ronda no juega todavía'
);
select pg_temp.act(1, 'cuela_next');
select is(
  (select alive from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(5)),
  true,
  'entra al empezar la ronda siguiente'
);

select pg_temp.answer(5, 'Una mentira que se va');
select pg_temp.answer(2, 'Para cascar nueces');
select pg_temp.answer(3, 'Para pescar cangrejos');
select pg_temp.answer(1, 'Para pelar patatas');
select pg_temp.act(5, 'leave_room');
select is(pg_temp.answers(), 3::bigint, 'al irse escribiendo se borra su mentira');
select is((pg_temp.game()).phase, 'writing', 'y se sigue escribiendo: falta uno');
select pg_temp.answer(4, 'Para colgar llaves');
select is((pg_temp.game()).phase, 'voting', 'cuando escriben los que quedan, se vota');
select is(pg_temp.option_of('Una mentira que se va'), null, 'sin la mentira de quien se fue');

-- Quien se va votando: se borra su voto y su opción se queda.
select pg_temp.vote(4, pg_temp.option_of('Para cascar nueces'));
select pg_temp.vote(1, pg_temp.option_of('Para colgar llaves'));
select pg_temp.vote(2, pg_temp.option_of('Para pescar cangrejos'));
select pg_temp.act(4, 'leave_room');
select is((pg_temp.game()).phase, 'voting', 'se sigue votando: falta uno');
select is(
  (select count(*) from public.cuela_votes where game_id = (pg_temp.game()).id and round = 4 and user_id = pg_temp.u(4)),
  0::bigint,
  'el voto de quien se va se borra'
);
select is((select count(*) from pg_temp.options()), 5::bigint, 'su opción se queda');
select pg_temp.vote(3, pg_temp.truth_option());
select is((pg_temp.game()).phase, 'reveal', 'cuando votan los que quedan, se revela');
select is(
  (select result -> 'left_author_ids' from public.game_rounds where game_id = (pg_temp.game()).id and round = 4),
  jsonb_build_array(pg_temp.u(4)),
  'su autor sale como que se ha ido'
);
-- u4 no cobra el voto de u1; u2 tampoco cobra el de u4, que se borró; u3 suma 2 por la verdad y
-- 1 por el voto de u2.
select is(pg_temp.scores(), array[1, 4, 5, 0, 0], 'quien se ha ido no cobra los votos que recibe');

select pg_temp.act(1, 'cuela_next');
select pg_temp.call(3, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'finished', 'con menos de 3 la partida termina en el acto');

-- Plazas: de 3 a 10 ----------------------------------------------------------------------------

insert into ctx select 'big', pg_temp.call(10, $$select public.create_room('Jugador 10')$$) -> 'room' -> 'id';
select pg_temp.call(10, format('select public.set_game(%L, %L)', pg_temp.room('big'), 'cuela_la_mentira'));
select pg_temp.join(n, 'big') from generate_series(11, 20) as n;

select pg_temp.as_user(10);
select throws_ok(format('select public.cuela_start(%L, 5)', pg_temp.room('big')), 'P0001', 'too_many_players', 'con 11 no se empieza');
select pg_temp.as_admin();
select pg_temp.call(20, format('select public.leave_room(%L)', pg_temp.room('big')));
select pg_temp.call(10, format('select public.cuela_start(%L, 5)', pg_temp.room('big')));
select is((pg_temp.game('big')).phase, 'writing', 'con 10 sí');

select pg_temp.join(21, 'big');
select pg_temp.act(10, 'cuela_close_writing', 'big');
select pg_temp.act(10, 'cuela_close_voting', 'big');
select pg_temp.act(10, 'cuela_next', 'big');
select is(
  (select count(*) from public.game_players where game_id = (pg_temp.game('big')).id and user_id = pg_temp.u(21)),
  0::bigint,
  'con 10 jugando, el undécimo mira aunque empiece otra ronda'
);
select is(
  (select count(*) from public.game_players where game_id = (pg_temp.game('big')).id and alive),
  10::bigint,
  'siguen jugando los 10'
);

select pg_temp.call(n, format('select public.cuela_answer(%L, %L)', pg_temp.room('big'), format('Mentira %s', n)))
from generate_series(10, 18) as n;
select pg_temp.call(19, format('select public.leave_room(%L)', pg_temp.room('big')));
select is((pg_temp.game('big')).phase, 'voting', 'si al irse ya han escrito los demás, se pasa a votar');
select pg_temp.act(10, 'cuela_close_voting', 'big');
select pg_temp.act(10, 'cuela_next', 'big');
select is(
  (select alive from public.game_players where game_id = (pg_temp.game('big')).id and user_id = pg_temp.u(21)),
  true,
  'si queda una plaza libre, entra en la ronda siguiente'
);

select pg_temp.act(10, 'cuela_close_writing', 'big');
select pg_temp.act(10, 'cuela_close_voting', 'big');
select pg_temp.act(10, 'cuela_next', 'big');
select pg_temp.act(10, 'cuela_close_writing', 'big');
select pg_temp.act(10, 'cuela_close_voting', 'big');
select pg_temp.act(10, 'cuela_next', 'big');
select pg_temp.act(10, 'cuela_close_writing', 'big');
select pg_temp.act(10, 'cuela_close_voting', 'big');
select pg_temp.act(10, 'cuela_next', 'big');
select is((pg_temp.game('big')).phase, 'finished', 'tras la última ronda, final');

select * from finish();
rollback;

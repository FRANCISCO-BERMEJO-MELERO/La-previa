begin;
create extension if not exists pgtap with schema extensions;

select plan(59);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.n(id uuid) returns integer language sql immutable as $$
  select right(id::text, 2)::integer
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

create function pg_temp.act(n integer, action text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.clue(n integer, text text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.una_pista_clue(%L, %L)', pg_temp.room(), text))
$$;

create function pg_temp.guesser() returns integer language sql stable as $$
  select pg_temp.n(subject_id) from public.game_rounds where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

create function pg_temp.arbiter() returns integer language sql stable as $$
  select pg_temp.n(private.una_pista_arbiter(pg_temp.game()))
$$;

create function pg_temp.round_word() returns bigint language sql stable as $$
  select word_id from public.game_rounds where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

create function pg_temp.cancelled(n integer) returns boolean language sql stable as $$
  select cancelled from public.answers where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round and user_id = pg_temp.u(n)
$$;

-- Todos los que no adivinan dan una pista distinta, sin coincidir con la palabra.
create function pg_temp.all_clues() returns void language plpgsql as $$
declare
  n integer;
begin
  for n in
    select pg_temp.n(gp.user_id) from public.game_players gp
    where gp.game_id = (pg_temp.game()).id and gp.alive and pg_temp.n(gp.user_id) <> pg_temp.guesser()
  loop
    perform pg_temp.clue(n, format('pistaxyz%s', n));
  end loop;
end;
$$;

-- Una ronda entera: pistas, enseñarlas y marcar.
create function pg_temp.play_round(result text) returns void language plpgsql as $$
begin
  perform pg_temp.all_clues();
  perform pg_temp.act(pg_temp.arbiter(), 'una_pista_show_clues');
  perform pg_temp.call(pg_temp.arbiter(), format('select public.una_pista_mark(%L, %L)', pg_temp.room(), result));
end;
$$;

-- Sala de 4 (u1 anfitrión) y una partida de El impostor ya terminada --------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 4) as n;

-- Solo dos palabras activas: la que sale en El impostor no puede repetirse en Una sola pista.
update public.words set active = id in (select id from public.words order by id limit 2);
select pg_temp.call(1, format('select public.start_game(%L, 1)', pg_temp.room()));
insert into ctx select 'impostor_word', to_jsonb((pg_temp.game()).word_id);
update public.games set phase = 'finished', winner = 'group', finished_at = now() where id = (pg_temp.game()).id;
select pg_temp.act(1, 'back_to_lobby');

select pg_temp.as_user(1);
select throws_ok(format('select public.una_pista_start(%L, 5)', pg_temp.room()), 'P0001', 'invalid_game', 'no se empieza si la sala eligió otro juego');
select lives_ok(format('select public.set_game(%L, %L)', pg_temp.room(), 'una_pista'), 'set_game acepta una_pista');
select throws_ok(format('select public.una_pista_start(%L, 6)', pg_temp.room()), 'P0001', 'invalid_rounds', 'las rondas son 5, 10 o 15');
select pg_temp.as_admin();

select pg_temp.call(1, format('select public.una_pista_start(%L, 5)', pg_temp.room()));
select is((pg_temp.game()).phase, 'writing', 'empieza escribiendo pistas');
select isnt(pg_temp.round_word(), (select value::bigint from ctx where key = 'impostor_word'), 'la palabra no repite la de El impostor');
select is(pg_temp.guesser(), 1, 'el primer adivino es el primero en entrar');
select is(pg_temp.arbiter(), 2, 'si el anfitrión adivina, arbitra el siguiente por orden de entrada');
update public.words set active = true;

-- Pistas: rechazos ---------------------------------------------------------------------------------

update public.game_rounds set word_id = (select id from public.words where word = 'Pingüino')
where game_id = (pg_temp.game()).id and round = 1;

select pg_temp.as_user(1);
select throws_ok(format('select public.una_pista_clue(%L, %L)', pg_temp.room(), 'frío'), 'P0001', 'is_guesser', 'el adivino no da pista');
select pg_temp.as_user(2);
select throws_ok(format('select public.una_pista_clue(%L, %L)', pg_temp.room(), 'polo norte'), 'P0001', 'invalid_clue', 'una pista con espacios no vale');
select throws_ok(format('select public.una_pista_clue(%L, %L)', pg_temp.room(), '   '), 'P0001', 'invalid_clue', 'ni una vacía');
select throws_ok(format('select public.una_pista_clue(%L, %L)', pg_temp.room(), repeat('a', 21)), 'P0001', 'invalid_clue', 'ni una de más de 20 caracteres');
select throws_ok(format('select public.una_pista_clue(%L, %L)', pg_temp.room(), 'pingüino'), 'P0001', 'invalid_clue', 'ni la palabra secreta');
select throws_ok(format('select public.una_pista_clue(%L, %L)', pg_temp.room(), 'PINGUINO'), 'P0001', 'invalid_clue', 'tampoco con otras mayúsculas y sin diéresis');
select throws_ok(format('select public.una_pista_clue(%L, %L)', pg_temp.room(), 'Píngüinos'), 'P0001', 'invalid_clue', 'ni una que la contenga, aunque lleve tildes');
select throws_ok(format('select public.una_pista_toggle_clue(%L, %L)', pg_temp.room(), pg_temp.u(3)), 'P0001', 'invalid_phase', 'no se anulan pistas mientras se escriben');
select throws_ok(format('select public.una_pista_show_clues(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'ni se enseñan');
select pg_temp.as_user(3);
select throws_ok(format('select public.una_pista_close_writing(%L)', pg_temp.room()), 'P0001', 'not_arbiter', 'solo el árbitro cierra la escritura');
select pg_temp.as_user(1);
select throws_ok(format('select public.una_pista_close_writing(%L)', pg_temp.room()), 'P0001', 'not_arbiter', 'el anfitrión no arbitra si adivina');
select pg_temp.as_admin();

select pg_temp.call(5, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 5'));
select pg_temp.as_user(5);
select throws_ok(format('select public.una_pista_clue(%L, %L)', pg_temp.room(), 'frío'), 'P0001', 'not_participant', 'quien llega a media ronda no da pista');
select pg_temp.as_admin();

-- Anulación automática -------------------------------------------------------------------------------

select lives_ok($$select pg_temp.clue(2, '  Sol ')$$, 'una palabra con espacios alrededor vale');
select pg_temp.as_user(2);
select throws_ok(format('select public.una_pista_clue(%L, %L)', pg_temp.room(), 'otra'), 'P0001', 'already_answered', 'no se da pista dos veces');
select pg_temp.as_admin();
select is(
  (select text from public.answers where user_id = pg_temp.u(2) and game_id = (pg_temp.game()).id),
  'Sol',
  'la pista se guarda recortada'
);
select pg_temp.clue(3, 'SÓL');
select is((pg_temp.game()).phase, 'writing', 'falta una pista');
select pg_temp.clue(4, 'soles');
select is((pg_temp.game()).phase, 'review', 'con todas las pistas se pasa a revisarlas');
select is(pg_temp.cancelled(2), true, '"Sol" y "SÓL" se anulan entre sí');
select is(pg_temp.cancelled(3), true, 'las dos');
select is(pg_temp.cancelled(4), false, '"soles" no: no se tratan los plurales');

-- Revisión ------------------------------------------------------------------------------------------

select pg_temp.as_user(1);
select throws_ok(format('select public.una_pista_toggle_clue(%L, %L)', pg_temp.room(), pg_temp.u(4)), 'P0001', 'is_guesser', 'el adivino no anula pistas');
select pg_temp.as_user(5);
select throws_ok(format('select public.una_pista_toggle_clue(%L, %L)', pg_temp.room(), pg_temp.u(4)), 'P0001', 'not_participant', 'solo anula quien ha dado pista');
select pg_temp.as_user(4);
select throws_ok(format('select public.una_pista_toggle_clue(%L, %L)', pg_temp.room(), pg_temp.u(1)), 'P0001', 'invalid_target', 'solo se anulan pistas que existen');
select pg_temp.as_admin();

select pg_temp.call(3, format('select public.una_pista_toggle_clue(%L, %L)', pg_temp.room(), pg_temp.u(4)));
select is(pg_temp.cancelled(4), true, 'cualquiera que ha dado pista anula a mano la de otro');
select pg_temp.call(4, format('select public.una_pista_toggle_clue(%L, %L)', pg_temp.room(), pg_temp.u(2)));
select is(pg_temp.cancelled(2), false, 'y recupera una anulada');

select pg_temp.as_user(3);
select throws_ok(format('select public.una_pista_show_clues(%L)', pg_temp.room()), 'P0001', 'not_arbiter', 'solo el árbitro enseña las pistas');
select pg_temp.as_admin();
select pg_temp.act(2, 'una_pista_show_clues');
select is((pg_temp.game()).phase, 'guessing', 'el árbitro las enseña y se adivina');

-- Marcar --------------------------------------------------------------------------------------------

select pg_temp.as_user(2);
select throws_ok(format('select public.una_pista_mark(%L, %L)', pg_temp.room(), 'casi'), 'P0001', 'invalid_answer', 'solo se marca acertada, fallada o pasa');
select pg_temp.as_user(3);
select throws_ok(format('select public.una_pista_mark(%L, %L)', pg_temp.room(), 'correct'), 'P0001', 'not_arbiter', 'solo marca el árbitro');
select pg_temp.as_admin();
select pg_temp.call(2, format('select public.una_pista_mark(%L, %L)', pg_temp.room(), 'correct'));
select is((pg_temp.game()).phase, 'reveal', 'marcar pasa a la revelación');
select is(
  (select result from public.game_rounds where game_id = (pg_temp.game()).id and round = 1),
  '{"result": "correct"}'::jsonb,
  'con el resultado guardado'
);
select pg_temp.as_user(3);
select throws_ok(format('select public.una_pista_next(%L)', pg_temp.room()), 'P0001', 'not_arbiter', 'solo el árbitro pasa de ronda');
select pg_temp.as_admin();

-- Ronda 2: rota el adivino y entra quien llegó tarde --------------------------------------------------

select pg_temp.act(2, 'una_pista_next');
select is((pg_temp.game()).round, 2, 'ronda 2');
select is(pg_temp.guesser(), 2, 'el adivino rota por orden de entrada');
select is(pg_temp.arbiter(), 1, 'y si no adivina, arbitra el anfitrión');
select is(
  (select alive from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(5)),
  true,
  'quien llegó tarde juega desde la ronda siguiente'
);

-- Todas las pistas anuladas: se adivina igual.
select pg_temp.clue(n, 'igual') from generate_series(1, 5) n where n <> 2;
select is((pg_temp.game()).phase, 'review', 'pistas iguales: revisión');
select is(
  (select bool_and(cancelled) from public.answers where game_id = (pg_temp.game()).id and round = 2),
  true,
  'todas anuladas'
);
select pg_temp.act(1, 'una_pista_show_clues');
select is((pg_temp.game()).phase, 'guessing', 'y el adivino juega sin pistas');
select pg_temp.call(1, format('select public.una_pista_mark(%L, %L)', pg_temp.room(), 'pass'));
select is((pg_temp.game()).phase, 'reveal', 'pasar también cierra la ronda');

-- Ronda 3, y el turno salta a los que se han ido ------------------------------------------------------

select pg_temp.act(1, 'una_pista_next');
select is(pg_temp.guesser(), 3, 'tercer adivino');
select pg_temp.play_round('wrong');
select is(
  (select result from public.game_rounds where game_id = (pg_temp.game()).id and round = 3),
  '{"result": "wrong"}'::jsonb,
  'fallada'
);
select pg_temp.call(4, format('select public.leave_room(%L)', pg_temp.room()));
select pg_temp.act(1, 'una_pista_next');
select is(pg_temp.guesser(), 5, 'el turno salta a quien ya no juega');

-- Ronda 4: se va el adivino a media ronda ------------------------------------------------------------

select pg_temp.all_clues();
select is((pg_temp.game()).phase, 'review', 'revisando la cuarta');
insert into ctx select 'word4', to_jsonb(pg_temp.round_word());
select pg_temp.call(5, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.game()).round, 4, 'si se va el adivino la ronda se anula sin contar');
select is((pg_temp.game()).phase, 'writing', 'y se vuelve a empezar');
select isnt(pg_temp.guesser(), 5, 'con otro adivino');
select is(
  (select count(*) from public.answers where game_id = (pg_temp.game()).id and round = 4),
  0::bigint,
  'sin las pistas de la ronda anulada'
);
select is(
  (select alive from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(5)),
  false,
  'y sin quien se ha ido'
);

-- Final ---------------------------------------------------------------------------------------------

select pg_temp.play_round('correct');
select pg_temp.act(pg_temp.arbiter(), 'una_pista_next');
select pg_temp.play_round('correct');
select pg_temp.act(pg_temp.arbiter(), 'una_pista_next');
select is((pg_temp.game()).phase, 'finished', 'tras la quinta ronda la partida termina');
select is(
  (select count(*) from public.game_rounds where game_id = (pg_temp.game()).id),
  5::bigint,
  'con 5 rondas jugadas: la anulada no cuenta'
);
select is(
  (select count(distinct word_id) from public.game_rounds where game_id = (pg_temp.game()).id),
  5::bigint,
  'sin repetir palabra'
);

select * from finish();
rollback;

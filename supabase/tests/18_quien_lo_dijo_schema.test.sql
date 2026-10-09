begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

select has_table('public', 'answers', 'existe la tabla answers');
select col_is_pk('public', 'answers', array['game_id', 'round', 'user_id'], 'answers: una respuesta por jugador y ronda');
select col_default_is('public', 'answers', 'cancelled', 'false', 'una respuesta empieza sin anular');

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');

select lives_ok(
  $$insert into public.rooms (id, code, host_id, game) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001', 'quien_lo_dijo')$$,
  'una sala puede elegir quien_lo_dijo'
);
select throws_ok(
  $$insert into public.games (room_id, game_type, phase, total_rounds) values ('10000000-0000-0000-0000-000000000001', 'quien_lo_dijo', 'talking', 10)$$,
  '23514', null, 'quien_lo_dijo no tiene fase de hablar'
);
select lives_ok(
  $$insert into public.games (id, room_id, game_type, phase, total_rounds) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'quien_lo_dijo', 'writing', 10)$$,
  'una partida de quien_lo_dijo empieza escribiendo'
);
select throws_ok(
  $$insert into public.games (room_id, game_type, phase, total_rounds) values ('10000000-0000-0000-0000-000000000001', 'probable', 'writing', 10)$$,
  '23514', null, 'probable no tiene fase de escribir'
);

insert into public.game_players (game_id, user_id, name)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Álvaro');

select throws_ok(
  $$insert into public.answers (game_id, round, user_id, text) values ('20000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000001', repeat('a', 81))$$,
  '23514', null, 'una respuesta tiene como mucho 80 caracteres'
);
select throws_ok(
  $$insert into public.answers (game_id, round, user_id, text) values ('20000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000001', ' hola')$$,
  '23514', null, 'una respuesta se guarda recortada'
);
select throws_ok(
  $$insert into public.answers (game_id, round, user_id, text) values ('20000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000009', 'hola')$$,
  '23503', null, 'solo responden participantes'
);

set local role authenticated;
select throws_ok('select * from public.answers', '42501', null, 'el cliente no puede leer las respuestas');
reset role;

select * from finish();
rollback;

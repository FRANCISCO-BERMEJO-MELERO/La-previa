begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

select has_table('public', 'prompts', 'existe la tabla prompts');
select has_table('public', 'game_rounds', 'existe la tabla game_rounds');
select col_is_pk('public', 'game_rounds', array['game_id', 'round'], 'game_rounds: una fila por ronda');
select has_column('public', 'games', 'total_rounds', 'games tiene total_rounds');
select col_default_is('public', 'game_players', 'score', '0', 'los puntos empiezan en 0');

insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

select lives_ok(
  $$insert into public.rooms (id, code, host_id, game) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001', 'probable')$$,
  'una sala puede elegir probable'
);

select throws_ok(
  $$insert into public.games (room_id, game_type, phase, total_rounds) values ('10000000-0000-0000-0000-000000000001', 'probable', 'talking', 10)$$,
  '23514', null, 'probable no tiene fase de hablar'
);
select throws_ok(
  $$insert into public.games (room_id, game_type, phase, total_rounds) values ('10000000-0000-0000-0000-000000000001', 'probable', 'voting', 7)$$,
  '23514', null, 'las rondas son 5, 10 o 15'
);
select throws_ok(
  $$insert into public.games (room_id, game_type, phase) values ('10000000-0000-0000-0000-000000000001', 'probable', 'voting')$$,
  '23514', null, 'un juego por rondas necesita total de rondas'
);
select throws_ok(
  $$insert into public.games (room_id, game_type, phase, total_rounds, round) values ('10000000-0000-0000-0000-000000000001', 'probable', 'voting', 5, 6)$$,
  '23514', null, 'la ronda no pasa del total'
);
select throws_ok(
  $$insert into public.games (room_id, game_type, phase, total_rounds, impostor_count) values ('10000000-0000-0000-0000-000000000001', 'probable', 'voting', 10, 1)$$,
  '23514', null, 'probable no tiene impostores'
);
select throws_ok(
  $$insert into public.games (room_id, game_type, phase, total_rounds, winner, finished_at) values ('10000000-0000-0000-0000-000000000001', 'probable', 'finished', 10, 'group', now())$$,
  '23514', null, 'probable no tiene bando ganador'
);
select lives_ok(
  $$insert into public.games (id, room_id, game_type, phase, total_rounds) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'probable', 'voting', 10)$$,
  'una partida de probable válida'
);
select lives_ok(
  $$update public.games set phase = 'finished', finished_at = now() where id = '20000000-0000-0000-0000-000000000001'$$,
  'probable termina sin ganador de bando'
);
select throws_ok(
  $$insert into public.games (room_id, impostor_count) values ('10000000-0000-0000-0000-000000000001', 1)$$,
  '23514', null, 'El impostor sigue necesitando palabra'
);
select throws_ok(
  $$insert into public.games (room_id, word_id, total_rounds) values ('10000000-0000-0000-0000-000000000001', (select min(id) from public.words), 10)$$,
  '23514', null, 'El impostor no tiene rondas fijas ni impostores nulos'
);

insert into public.game_players (game_id, user_id, name) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Álvaro');
select is(
  (select score from public.game_players where user_id = '00000000-0000-0000-0000-000000000001'),
  0, 'un participante nuevo tiene 0 puntos'
);
select lives_ok(
  $$insert into public.votes (game_id, round, voter_id, target_id) values ('20000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')$$,
  'en probable uno puede votarse a sí mismo'
);

insert into public.prompts (game_type, text) values ('probable', 'se quede dormido en el cine');
select throws_ok(
  $$insert into public.prompts (game_type, text) values ('probable', 'se quede dormido en el cine')$$,
  '23505', null, 'una pregunta no se repite'
);
select throws_ok(
  $$insert into public.prompts (game_type, text) values ('impostor', 'algo')$$,
  '23514', null, 'El impostor no tiene preguntas'
);

select * from finish();
rollback;

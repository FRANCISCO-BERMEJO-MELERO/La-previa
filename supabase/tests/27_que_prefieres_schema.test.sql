begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$insert into public.rooms (id, code, host_id, game) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001', 'que_prefieres')$$,
  'una sala puede elegir que_prefieres'
);
select lives_ok(
  $$insert into public.games (id, room_id, game_type, phase, total_rounds) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'que_prefieres', 'voting', 5)$$,
  'que_prefieres empieza eligiendo'
);
select lives_ok(
  $$update public.games set phase = 'reveal' where id = '20000000-0000-0000-0000-000000000001'$$,
  'tiene revelación'
);
select throws_ok(
  $$update public.games set phase = 'writing' where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'pero no fase de escribir'
);

select has_column('public', 'prompts', 'text_b', 'prompts tiene la opción B');
select lives_ok(
  $$insert into public.prompts (game_type, text, text_b) values ('que_prefieres', 'Opción A de prueba', 'Opción B de prueba')$$,
  'un dilema lleva sus dos opciones'
);
select throws_ok(
  $$insert into public.prompts (game_type, text) values ('que_prefieres', 'Solo una opción')$$,
  '23514', null, 'un dilema sin opción B se rechaza'
);
select throws_ok(
  $$insert into public.prompts (game_type, text, text_b) values ('probable', '…tenga opción B?', 'B')$$,
  '23514', null, 'los otros juegos no llevan opción B'
);
select throws_ok(
  $$insert into public.prompts (game_type, text, text_b) values ('que_prefieres', 'A', '')$$,
  '23514', null, 'la opción B no puede estar vacía'
);

select * from finish();
rollback;

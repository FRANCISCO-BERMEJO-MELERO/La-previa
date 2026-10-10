begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

select is(private.normalize_clue('Sol'), 'sol', 'pasa a minúsculas');
select is(private.normalize_clue('SÓL'), 'sol', 'quita las tildes también en mayúsculas');
select is(private.normalize_clue('Pingüino'), 'pinguino', 'quita la diéresis');
select is(private.normalize_clue('Tortilla de patatas'), 'tortilladepatatas', 'quita los espacios');
select is(private.normalize_clue('Ñandú'), 'ñandu', 'conserva la ñ');
select is(private.normalize_clue(null), '', 'sin texto queda vacío');
select isnt(private.normalize_clue('sol'), private.normalize_clue('soles'), 'no trata los plurales');

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$insert into public.rooms (id, code, host_id, game) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001', 'una_pista')$$,
  'una sala puede elegir una_pista'
);
select lives_ok(
  $$insert into public.games (id, room_id, game_type, phase, total_rounds) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'una_pista', 'review', 10)$$,
  'una_pista tiene fase de revisión'
);
select lives_ok(
  $$update public.games set phase = 'guessing' where id = '20000000-0000-0000-0000-000000000001'$$,
  'y de adivinar'
);
select throws_ok(
  $$update public.games set phase = 'voting' where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'pero no de votar'
);

select * from finish();
rollback;

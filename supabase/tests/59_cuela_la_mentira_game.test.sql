begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$insert into public.rooms (id, code, host_id, game) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001', 'cuela_la_mentira')$$,
  'una sala puede elegir cuela_la_mentira'
);
select lives_ok(
  $$insert into public.games (id, room_id, game_type, phase, total_rounds) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'cuela_la_mentira', 'writing', 5)$$,
  'empieza escribiendo, con rondas'
);
select lives_ok(
  $$update public.games set phase = 'voting' where id = '20000000-0000-0000-0000-000000000001'$$,
  'pasa a votar'
);
select lives_ok(
  $$update public.games set phase = 'reveal' where id = '20000000-0000-0000-0000-000000000001'$$,
  'y a la revelación'
);
select throws_ok(
  $$update public.games set phase = 'review' where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'no tiene revisión'
);
select throws_ok(
  $$update public.games set total_rounds = null where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'las rondas son obligatorias'
);
select throws_ok(
  $$update public.games set total_rounds = 7 where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'y son 5, 10 o 15'
);

-- set_game ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
set local role authenticated;
select public.create_room('Uno') -> 'room' ->> 'id' as room_id \gset
select is(
  public.set_game(:'room_id', 'cuela_la_mentira') -> 'room' ->> 'game',
  'cuela_la_mentira',
  'set_game acepta cuela_la_mentira'
);
select throws_ok(
  format('select public.set_game(%L, %L)', :'room_id', 'cuela'),
  'P0001', 'invalid_game', 'y sigue rechazando un juego que no existe'
);

select * from finish();
rollback;

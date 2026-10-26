begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$insert into public.rooms (id, code, host_id, game) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001', 'dados')$$,
  'una sala puede elegir dados'
);
select lives_ok(
  $$insert into public.games (id, room_id, game_type, phase) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'dados', 'playing')$$,
  'dados empieza jugando, sin rondas'
);
select lives_ok(
  $$update public.games set phase = 'finished', finished_at = now() where id = '20000000-0000-0000-0000-000000000001'$$,
  'y termina'
);
select throws_ok(
  $$update public.games set phase = 'voting', finished_at = null where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'pero no tiene votación'
);
select throws_ok(
  $$update public.games set total_rounds = 5 where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'ni rondas'
);
select throws_ok(
  $$update public.rooms set game = 'matatena' where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'un juego inventado sigue sin caber'
);

-- set_game ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
set local role authenticated;
select public.create_room('Uno') -> 'room' ->> 'id' as room_id \gset
select is(
  public.set_game(:'room_id', 'dados') -> 'room' ->> 'game',
  'dados',
  'set_game acepta dados'
);
select throws_ok(
  format('select public.set_game(%L, %L)', :'room_id', 'matatena'),
  'P0001', 'invalid_game', 'y sigue rechazando un juego que no existe'
);

select * from finish();
rollback;

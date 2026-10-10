begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

select has_table('public', t, format('existe la tabla %s', t))
from unnest(array['rooms', 'room_players', 'games', 'game_players', 'game_roles', 'votes', 'words']) as t;

select is(
  (select bool_and(c.relrowsecurity) from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  true,
  'todas las tablas de public tienen RLS activado'
);

select col_is_unique('public', 'rooms', array['code'], 'el código de sala es único');
select col_is_pk('public', 'room_players', array['room_id', 'user_id'], 'room_players: PK (sala, usuario)');
select col_is_pk('public', 'votes', array['game_id', 'round', 'voter_id'], 'votes: un voto por ronda');

-- Datos mínimos para probar restricciones.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

select throws_ok(
  $$insert into public.rooms (code, host_id) values ('KTRL', '00000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'el código no admite la L'
);
select throws_ok(
  $$insert into public.rooms (code, host_id) values ('ktrm', '00000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'el código va en mayúsculas'
);
select throws_ok(
  $$insert into public.rooms (code, host_id) values ('KTRMA', '00000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'el código tiene 4 letras'
);
select lives_ok(
  $$insert into public.rooms (id, code, host_id) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001')$$,
  'un código válido se acepta'
);
select throws_ok(
  $$insert into public.rooms (code, host_id, game) values ('ABCD', '00000000-0000-0000-0000-000000000001', 'parchis')$$,
  '23514', null, 'solo existe el juego impostor'
);

select lives_ok(
  $$insert into public.room_players (room_id, user_id, name) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Álvaro')$$,
  'un nombre válido se acepta'
);
select throws_ok(
  $$insert into public.room_players (room_id, user_id, name) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'ÁLVARO')$$,
  '23505', null, 'el nombre no se repite aunque cambien las mayúsculas'
);
select throws_ok(
  $$insert into public.room_players (room_id, user_id, name) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '')$$,
  '23514', null, 'el nombre no puede estar vacío'
);
select throws_ok(
  $$insert into public.room_players (room_id, user_id, name) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Quinceletrasaaa')$$,
  '23514', null, 'el nombre tiene como mucho 14 caracteres'
);
select throws_ok(
  $$insert into public.room_players (room_id, user_id, name) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', ' Lucía')$$,
  '23514', null, 'el nombre se guarda sin espacios alrededor'
);

insert into public.games (id, room_id, impostor_count, word_id)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, (select min(id) from public.words));
insert into public.game_players (game_id, user_id, name) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Álvaro'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Lucía');

select throws_ok(
  $$update public.games set phase = 'finished' where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'una partida terminada necesita ganador'
);
select throws_ok(
  $$insert into public.votes (game_id, round, voter_id, target_id) values ('20000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'nadie se vota a sí mismo'
);
select throws_ok(
  $$insert into public.votes (game_id, round, voter_id, target_id) values ('20000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000009')$$,
  '23503', null, 'solo se vota a participantes de la partida'
);

delete from public.rooms where id = '10000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.games where id = '20000000-0000-0000-0000-000000000001'),
  0::bigint,
  'borrar la sala borra sus partidas'
);

select * from finish();
rollback;

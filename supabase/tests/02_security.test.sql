begin;
create extension if not exists pgtap with schema extensions;

select plan(36);

-- Dos usuarios, cada uno en su sala.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
insert into public.rooms (id, code, host_id) values
  ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'ABCD', '00000000-0000-0000-0000-000000000002');
insert into public.room_players (room_id, user_id, name) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Fran'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Lucía');
insert into public.words (id, category, word) overriding system value values (1, 'Comida', 'Paella');
insert into public.games (id, room_id, impostor_count, word_id)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 1);
insert into public.game_players (game_id, user_id, name)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Fran');
insert into public.game_roles (game_id, user_id, role)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'impostor');

select has_schema('private', 'existe el esquema private');
select is(
  (select count(*) from pg_policies where schemaname = 'public'),
  1::bigint,
  'solo hay una política en public'
);
select policies_are('public', 'rooms', array['rooms_select_member'], 'la única política es la de lectura de rooms');
select is(
  (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'),
  1::bigint,
  'rooms está en la publicación de Realtime'
);
select is(
  (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename <> 'rooms'),
  0::bigint,
  'ninguna otra tabla está en Realtime'
);

-- Como usuario 1, autenticado.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  'select code from public.rooms',
  array['KTRM'],
  'un miembro solo ve la fila de su sala'
);
select is_empty(
  $$select 1 from public.rooms where id = '10000000-0000-0000-0000-000000000002'$$,
  'no puede leer la fila de una sala ajena'
);

select throws_ok(format('select * from public.%I', t), '42501', null, format('no puede leer %s', t))
from unnest(array['room_players', 'games', 'game_players', 'game_roles', 'votes', 'words']) as t;

select throws_ok(
  $$insert into public.rooms (code, host_id) values ('ZZZZ', '00000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'no puede insertar en rooms'
);
select throws_ok(
  $$update public.rooms set version = version + 1$$,
  '42501', null, 'no puede actualizar rooms'
);
select throws_ok(
  $$delete from public.rooms$$,
  '42501', null, 'no puede borrar en rooms'
);

select throws_ok(format('insert into public.%I default values', t), '42501', null, format('no puede insertar en %s', t))
from unnest(array['room_players', 'games', 'game_players', 'game_roles', 'votes', 'words']) as t;

select throws_ok(format('update public.%I set %I = %I', t, c, c), '42501', null, format('no puede actualizar %s', t))
from (values ('room_players', 'name'), ('games', 'phase'), ('game_players', 'alive'),
             ('game_roles', 'role'), ('votes', 'target_id'), ('words', 'word')) as v (t, c);

select throws_ok(format('delete from public.%I', t), '42501', null, format('no puede borrar en %s', t))
from unnest(array['room_players', 'games', 'game_players', 'game_roles', 'votes', 'words']) as t;

reset role;

-- Un visitante sin sesión no ve ni la sala.
set local role anon;
select throws_ok('select * from public.rooms', '42501', null, 'anon no puede leer rooms');
reset role;

select is(
  (select count(*) from information_schema.role_routine_grants
   where routine_schema = 'public' and grantee in ('PUBLIC', 'anon')),
  0::bigint,
  'ninguna función de public es ejecutable por public o anon'
);

select * from finish();
rollback;

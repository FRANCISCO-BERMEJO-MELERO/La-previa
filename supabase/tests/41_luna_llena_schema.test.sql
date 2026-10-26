begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
select lives_ok(
  $$insert into public.rooms (id, code, host_id, game) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001', 'luna_llena')$$,
  'una sala puede elegir luna_llena'
);
select lives_ok(
  $$insert into public.games (id, room_id, game_type, phase) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'luna_llena', 'roles')$$,
  'luna_llena empieza en el reparto, sin rondas'
);
select lives_ok(
  $$update public.games set phase = 'execution' where id = '20000000-0000-0000-0000-000000000001'$$,
  'tiene ejecución'
);
select throws_ok(
  $$update public.games set phase = 'reveal' where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'pero no revelación'
);
select throws_ok(
  $$update public.games set total_rounds = 5 where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'ni rondas'
);

insert into public.game_players (game_id, user_id, name) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Uno'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Dos');

select lives_ok(
  $$insert into public.game_roles (game_id, user_id, role) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'wolf'), ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'cupid')$$,
  'los roles de Luna llena caben en game_roles'
);
select throws_ok(
  $$update public.game_roles set role = 'wizard' where user_id = '00000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'y uno inventado no'
);
select lives_ok(
  $$update public.game_roles set role = 'witch' where user_id = '00000000-0000-0000-0000-000000000002'$$,
  'la bruja cabe'
);
select lives_ok(
  $$update public.game_roles set role = 'killer' where user_id = '00000000-0000-0000-0000-000000000002'$$,
  'y el asesino'
);

-- Tablas propias ----------------------------------------------------------------------------

select has_table('public', 'luna_state', 'existe el estado de la partida');
select has_table('public', 'luna_night_actions', 'existen las acciones de noche');
select has_table('public', 'luna_votes', 'existen los votos');
select is(
  (select count(*) from pg_class where oid in ('public.luna_state'::regclass, 'public.luna_night_actions'::regclass, 'public.luna_votes'::regclass) and relrowsecurity),
  3::bigint,
  'las tres con RLS activado'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename in ('luna_state', 'luna_night_actions', 'luna_votes')),
  0::bigint,
  'y sin políticas'
);
select is(
  (select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('luna_state', 'luna_night_actions', 'luna_votes') and grantee in ('anon', 'authenticated')),
  0::bigint,
  'sin permisos para anon ni authenticated'
);

select lives_ok(
  $$insert into public.luna_state (game_id, config) values ('20000000-0000-0000-0000-000000000001', '{"wolves": 1, "roles": []}')$$,
  'el estado nace con su composición'
);
select throws_ok(
  $$update public.luna_state set lover_a = '00000000-0000-0000-0000-000000000001' where game_id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'los enamorados van de dos en dos'
);
select throws_ok(
  $$update public.luna_state set lover_a = '00000000-0000-0000-0000-000000000001', lover_b = '00000000-0000-0000-0000-000000000001' where game_id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'y son dos personas distintas'
);
select throws_ok(
  $$update public.luna_state set mayor_id = '00000000-0000-0000-0000-000000000009' where game_id = '20000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'el alcalde es un jugador de la partida'
);
select throws_ok(
  $$update public.luna_state set winner = 'group' where game_id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'el ganador es un bando de Luna llena'
);

select lives_ok(
  $$insert into public.luna_night_actions (game_id, night, user_id, target_id, target2_id) values ('20000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')$$,
  'Cupido guarda dos objetivos'
);
select throws_ok(
  $$insert into public.luna_night_actions (game_id, night, user_id, target_id, target2_id) values ('20000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002')$$,
  '23514', null, 'que no pueden ser el mismo'
);

select lives_ok(
  $$insert into public.luna_votes (game_id, day, kind, voter_id, target_id) values ('20000000-0000-0000-0000-000000000001', 1, 'mayor', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')$$,
  'para alcalde uno se puede votar a sí mismo'
);
select throws_ok(
  $$insert into public.luna_votes (game_id, day, kind, voter_id, target_id) values ('20000000-0000-0000-0000-000000000001', 1, 'accuse', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'pero no acusarse'
);
select throws_ok(
  $$insert into public.luna_votes (game_id, day, kind, voter_id, target_id) values ('20000000-0000-0000-0000-000000000001', 1, 'verdict', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'no hay votos de veredicto'
);
select throws_ok(
  $$update public.games set phase = 'verdict' where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'ni fase de veredicto'
);

select * from finish();
rollback;

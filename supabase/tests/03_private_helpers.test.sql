begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');

select is(private.connected_window(), interval '25 seconds', 'conectado: señal en los últimos 25 s');
select is(private.host_timeout(), interval '90 seconds', 'traspaso de anfitrión tras 90 s');

select throws_ok($$select private.raise_error('room_full')$$, 'P0001', 'room_full', 'raise_error lanza el código como mensaje');
select throws_ok($$select private.require_user()$$, 'P0001', 'not_authenticated', 'require_user sin sesión');

select is(private.normalize_name('  Ana  '), 'Ana', 'normalize_name recorta espacios');
select throws_ok($$select private.normalize_name(null)$$, 'P0001', 'name_invalid', 'normalize_name rechaza nulo');
select throws_ok($$select private.normalize_name(repeat('a', 15))$$, 'P0001', 'name_invalid', 'normalize_name rechaza 15 caracteres');
select is(private.normalize_name(repeat('ñ', 14)), repeat('ñ', 14), 'normalize_name cuenta caracteres, no bytes');

select is(
  (select bool_and(private.generate_room_code() ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$') from generate_series(1, 200)),
  true,
  'generate_room_code solo usa el alfabeto permitido'
);

select is(private.is_connected(now() - interval '24 seconds'), true, 'a los 24 s sigue conectado');
select is(private.is_connected(now() - interval '26 seconds'), false, 'a los 26 s está desconectado');

insert into public.rooms (id, code, host_id) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001');
insert into public.room_players (room_id, user_id, name, joined_at, last_seen_at) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Fran', now() - interval '3 minutes', now() - interval '2 minutes'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Lucía', now() - interval '2 minutes', now() - interval '1 minute'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Álvaro', now() - interval '1 minute', now());

select throws_ok($$select private.lock_room('10000000-0000-0000-0000-00000000dead')$$, 'P0001', 'room_not_found', 'lock_room con sala inexistente');
select is((private.lock_room('10000000-0000-0000-0000-000000000001')).code, 'KTRM', 'lock_room devuelve la sala');
select throws_ok(
  $$select private.require_member('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000009')$$,
  'P0001', 'not_member', 'require_member con un no miembro'
);
select throws_ok(
  $$select private.require_host((select r from public.rooms r where r.code = 'KTRM'), '00000000-0000-0000-0000-000000000002')$$,
  'P0001', 'not_host', 'require_host con un miembro que no es anfitrión'
);

select is(
  private.pick_host('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-000000000003'::uuid,
  'pick_host prefiere un conectado aunque sea más nuevo'
);

select private.bump_version('10000000-0000-0000-0000-000000000001');
select is((select version from public.rooms where code = 'KTRM'), 2::bigint, 'bump_version sube la versión');

select is(
  private.transfer_host_if_due((select r from public.rooms r where r.code = 'KTRM')),
  true,
  'transfer_host_if_due traspasa con el anfitrión inactivo y alguien conectado'
);
select is((select host_id from public.rooms where code = 'KTRM'), '00000000-0000-0000-0000-000000000003'::uuid, 'el nuevo anfitrión es el conectado');
select is(
  private.transfer_host_if_due((select r from public.rooms r where r.code = 'KTRM')),
  false,
  'no traspasa si el anfitrión está activo'
);

update public.room_players set last_seen_at = now() - interval '5 minutes' where room_id = '10000000-0000-0000-0000-000000000001';
select is(
  private.transfer_host_if_due((select r from public.rooms r where r.code = 'KTRM')),
  false,
  'no traspasa si no hay nadie conectado'
);

select is(
  private.build_state('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002') - 'server_time' - 'players',
  jsonb_build_object(
    'room', jsonb_build_object('id', '10000000-0000-0000-0000-000000000001', 'code', 'KTRM', 'game', 'impostor',
                               'host_id', '00000000-0000-0000-0000-000000000003', 'version', 3),
    'me', jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000002', 'name', 'Lucía', 'is_host', false),
    'game', null
  ),
  'build_state devuelve sala, yo y partida nula'
);

select * from finish();
rollback;

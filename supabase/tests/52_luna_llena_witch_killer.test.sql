begin;
create extension if not exists pgtap with schema extensions;

select plan(59);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 10) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create temp table ctx (key text primary key, value jsonb);
grant all on ctx to authenticated;

create function pg_temp.room() returns uuid language sql stable as $$
  select (value #>> '{}')::uuid from ctx where key = 'room'
$$;

create function pg_temp.code() returns text language sql stable as $$
  select value #>> '{}' from ctx where key = 'code'
$$;

create function pg_temp.game() returns public.games language sql stable as $$
  select g.* from public.games g join public.rooms r on r.current_game_id = g.id where r.id = pg_temp.room()
$$;

create function pg_temp.state() returns public.luna_state language sql stable as $$
  select s.* from public.luna_state s where s.game_id = (pg_temp.game()).id
$$;

create function pg_temp.call(n integer, sql text) returns jsonb language plpgsql as $$
declare
  result jsonb;
begin
  perform pg_temp.as_user(n);
  execute sql into result;
  perform pg_temp.as_admin();
  return result;
end;
$$;

create function pg_temp.act_sql(target integer) returns text language sql stable as $$
  select format('select public.luna_llena_night_action(%L, %L, null)', pg_temp.room(), pg_temp.u(target))
$$;

create function pg_temp.act(n integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, pg_temp.act_sql(target))
$$;

create function pg_temp.witch_sql(use_life boolean, target integer) returns text language sql stable as $$
  select format(
    'select public.luna_llena_witch_action(%L, %L, %L)',
    pg_temp.room(), use_life, case when target is not null then pg_temp.u(target) end
  )
$$;

create function pg_temp.witch(use_life boolean, target integer) returns jsonb language sql as $$
  select pg_temp.call(3, pg_temp.witch_sql(use_life, target))
$$;

create function pg_temp.close() returns jsonb language sql as $$
  select pg_temp.call(1, format('select public.luna_llena_close_night(%L)', pg_temp.room()))
$$;

create function pg_temp.alive(n integer) returns boolean language sql stable as $$
  select alive from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(n)
$$;

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

-- Muertes del último anuncio, ordenadas por jugador: [jugador, causa].
create function pg_temp.deaths() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_array(right(d ->> 'user_id', 2)::integer, d ->> 'cause') order by d ->> 'user_id'), '[]'::jsonb)
  from jsonb_array_elements((pg_temp.state()).announcement -> 'deaths') d
$$;

-- Vuelve a una noche nueva con todos vivos y la bruja con sus dos pociones.
create function pg_temp.fresh_night(night integer) returns void language sql as $$
  update public.game_players set alive = true where game_id = (pg_temp.game()).id;
  update public.luna_state
  set night = fresh_night.night, witch_life_used = false, witch_poison_used = false,
      witch_report = null, last_protected_id = null, hunter_pending = false, lover_a = null, lover_b = null
  where game_id = (pg_temp.game()).id;
  update public.games set phase = 'night' where id = (pg_temp.game()).id;
$$;

-- La noche siguiente, sin tocar a los vivos ni las pociones.
create function pg_temp.next_night() returns void language sql as $$
  update public.luna_state set night = night + 1 where game_id = (pg_temp.game()).id;
  update public.games set phase = 'night' where id = (pg_temp.game()).id;
$$;

-- Sala de 10 y reparto fijo (u1 anfitrión) ---------------------------------------------------
-- Lobos u1 y u2; bruja u3; asesino u4; protector u5; vidente u6; cazador u7; Cupido u8;
-- aldeanos u9 y u10.

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 10) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));
select pg_temp.call(1, format(
  'select public.luna_llena_start(%L, 2, %L)', pg_temp.room(),
  array['seer', 'protector', 'hunter', 'cupid', 'witch', 'killer']
));
update public.game_roles gr
set role = (array['wolf', 'wolf', 'witch', 'killer', 'protector', 'seer', 'hunter', 'cupid', 'villager', 'villager'])[right(gr.user_id::text, 2)::integer]
where gr.game_id = (pg_temp.game()).id;

-- Acción de la bruja -----------------------------------------------------------------------

select pg_temp.as_user(3);
select throws_ok(pg_temp.witch_sql(true, null), 'P0001', 'invalid_phase', 'en el reparto la bruja no actúa');
select pg_temp.as_admin();

select pg_temp.fresh_night(1);

select pg_temp.as_user(9);
select throws_ok(pg_temp.witch_sql(true, null), 'P0001', 'not_witch', 'solo la bruja usa pociones');
select pg_temp.as_user(3);
select throws_ok(pg_temp.witch_sql(false, 3), 'P0001', 'invalid_target', 'la bruja no se envenena a sí misma');
select pg_temp.as_admin();
update public.game_players set alive = false where game_id = (pg_temp.game()).id and user_id = pg_temp.u(10);
select pg_temp.as_user(3);
select throws_ok(pg_temp.witch_sql(false, 10), 'P0001', 'invalid_target', 'ni a un muerto');
select pg_temp.as_admin();
update public.game_players set alive = true where game_id = (pg_temp.game()).id and user_id = pg_temp.u(10);

select pg_temp.as_user(4);
select throws_ok(pg_temp.act_sql(4), 'P0001', 'invalid_target', 'el asesino no se elige a sí mismo');
select pg_temp.as_admin();

-- Poción de vida sin víctima: no se gasta.
select pg_temp.witch(true, null);
select pg_temp.as_user(3);
select throws_ok(pg_temp.witch_sql(false, 9), 'P0001', 'already_acted', 'la bruja no repite acción la misma noche');
select pg_temp.as_admin();
select is(
  (select (target_id, use_life)::text from public.luna_night_actions where game_id = (pg_temp.game()).id and night = 1 and user_id = pg_temp.u(3)),
  '(,t)',
  'la acción guarda solo la poción de vida'
);
select is(pg_temp.view(3) -> 'my' -> 'action' -> 'use_life', 'true'::jsonb, 'y la bruja la ve como suya');
select pg_temp.close();
select is(pg_temp.deaths(), '[]'::jsonb, 'sin víctima de los lobos no muere nadie');
select is((pg_temp.state()).witch_life_used, false, 'y la poción de vida no se gasta');
select is((pg_temp.state()).witch_report, null::jsonb, 'ni hay nada que contar');

-- Poción de vida con víctima: salva y se gasta.
select pg_temp.fresh_night(2);
select pg_temp.act(1, 10);
select pg_temp.act(2, 10);
select is(pg_temp.view(3) -> 'my' -> 'wolf_victim', to_jsonb(pg_temp.u(10)), 'la bruja ve a quién van a devorar');
select pg_temp.witch(true, null);
select pg_temp.close();
select ok(pg_temp.alive(10), 'la poción de vida salva a la víctima de los lobos');
select is((pg_temp.state()).witch_life_used, true, 'y se gasta');
select is((pg_temp.state()).witch_poison_used, false, 'la de muerte sigue');
select is(
  (pg_temp.state()).witch_report,
  jsonb_build_object('saved_id', pg_temp.u(10), 'poisoned_id', null),
  'queda dicho a quién ha salvado'
);
select is(pg_temp.view(3) -> 'my' -> 'witch_report' -> 'saved_id', to_jsonb(pg_temp.u(10)), 'y la bruja lo ve al amanecer');
select is(pg_temp.view(3) -> 'my' -> 'potions', '{"life": false, "poison": true}'::jsonb, 'con las pociones que le quedan');

-- Con la de vida gastada ya no la usa, ni ve a la víctima.
select pg_temp.next_night();
select pg_temp.act(1, 9);
select is(pg_temp.view(3) -> 'my' -> 'wolf_victim', 'null'::jsonb, 'sin poción de vida no ve a la víctima');
select pg_temp.as_user(3);
select throws_ok(pg_temp.witch_sql(true, null), 'P0001', 'potion_used', 'una poción gastada se rechaza');
select pg_temp.as_admin();
select is(
  (select count(*) from public.luna_night_actions where game_id = (pg_temp.game()).id and night = (pg_temp.state()).night and user_id = pg_temp.u(3)),
  0::bigint,
  'y el intento no cuenta como acción'
);

-- Poción de vida cuando el protector ya cubría: no se gasta.
select pg_temp.fresh_night(4);
select pg_temp.act(1, 10);
select pg_temp.act(5, 10);
select pg_temp.witch(true, null);
select pg_temp.close();
select ok(pg_temp.alive(10), 'el protegido no muere');
select is((pg_temp.state()).witch_life_used, false, 'y la poción de vida no se gasta, porque no ha salvado a nadie');

-- La poción de vida no salva del asesino.
select pg_temp.fresh_night(5);
select pg_temp.act(1, 9);
select pg_temp.act(4, 10);
select pg_temp.witch(true, null);
select pg_temp.close();
select is(pg_temp.deaths(), '[[10, "killer"]]'::jsonb, 'salva a la víctima de los lobos, pero no a la del asesino');
select is((pg_temp.state()).witch_life_used, true, 'y se gasta por haber salvado a la de los lobos');

-- Ni del veneno: salvar y envenenar a la misma persona la mata.
select pg_temp.fresh_night(6);
select pg_temp.act(1, 9);
select pg_temp.witch(true, 9);
select pg_temp.close();
select is(pg_temp.deaths(), '[[9, "poison"]]'::jsonb, 'la poción de vida no salva del veneno');
select is(((pg_temp.state()).witch_life_used, (pg_temp.state()).witch_poison_used)::text, '(t,t)', 'y se gastan las dos');

-- La poción de muerte mata aunque el objetivo esté protegido, y se gasta.
select pg_temp.fresh_night(7);
select pg_temp.act(5, 10);
select pg_temp.witch(false, 10);
select pg_temp.close();
select is(pg_temp.deaths(), '[[10, "poison"]]'::jsonb, 'el protector no frena el veneno');
select is((pg_temp.state()).witch_poison_used, true, 'la poción de muerte se gasta');
select is((pg_temp.state()).witch_life_used, false, 'y la de vida no');
select is(
  pg_temp.view(3) -> 'my' -> 'witch_report',
  jsonb_build_object('saved_id', null, 'poisoned_id', pg_temp.u(10)),
  'la bruja ve sobre quién ha caído su veneno'
);

-- Las dos la misma noche; después, ninguna más.
select pg_temp.fresh_night(8);
select pg_temp.act(1, 9);
select pg_temp.witch(true, 8);
select pg_temp.close();
select ok(pg_temp.alive(9), 'con las dos a la vez, salva a la víctima');
select is(pg_temp.deaths(), '[[8, "poison"]]'::jsonb, 'y envenena a otro');
select pg_temp.next_night();
select pg_temp.as_user(3);
select throws_ok(pg_temp.witch_sql(false, 10), 'P0001', 'potion_used', 'la poción de muerte gastada se rechaza');
select throws_ok(pg_temp.witch_sql(true, null), 'P0001', 'potion_used', 'y la de vida');
select lives_ok(pg_temp.witch_sql(false, null), 'no usar nada sigue valiendo');
select pg_temp.as_admin();
select is(pg_temp.view(3) -> 'my' -> 'potions', '{"life": false, "poison": false}'::jsonb, 'sin pociones');

-- Sin pociones, la bruja sospecha como un aldeano, y su marca no mata.
select pg_temp.next_night();
select pg_temp.act(3, 10);
select pg_temp.close();
select ok(pg_temp.alive(10), 'la marca de una bruja sin pociones no tiene efecto');

-- Cierre forzado sin acción de la bruja: no gasta nada.
select pg_temp.fresh_night(11);
select pg_temp.act(1, 9);
select pg_temp.close();
select is(pg_temp.deaths(), '[[9, "wolves"]]'::jsonb, 'si la bruja no actúa, mueren los que tocan');
select is(((pg_temp.state()).witch_life_used, (pg_temp.state()).witch_poison_used)::text, '(f,f)', 'y no gasta ninguna poción');

-- Asesino ----------------------------------------------------------------------------------

select pg_temp.fresh_night(12);
select pg_temp.act(4, 10);
select pg_temp.close();
select is(pg_temp.deaths(), '[[10, "killer"]]'::jsonb, 'el asesino mata');

select pg_temp.fresh_night(13);
select pg_temp.act(4, 10);
select pg_temp.act(5, 10);
select pg_temp.close();
select is(pg_temp.deaths(), '[]'::jsonb, 'el protector frena al asesino');

select pg_temp.fresh_night(14);
select pg_temp.act(1, 10);
select pg_temp.act(4, 10);
select pg_temp.close();
select is(pg_temp.deaths(), '[[10, "wolves"]]'::jsonb, 'si lobos y asesino coinciden, muere una sola vez');

select pg_temp.fresh_night(15);
select pg_temp.act(1, 4);
select pg_temp.act(2, 4);
select pg_temp.act(4, 1);
select pg_temp.close();
select is(pg_temp.deaths(), '[[1, "killer"], [4, "wolves"]]'::jsonb, 'lobos y asesino se matan entre sí la misma noche');

select pg_temp.fresh_night(16);
select pg_temp.act(1, 9);
select pg_temp.close();
select is(pg_temp.deaths(), '[[9, "wolves"]]'::jsonb, 'si el asesino no elige antes del cierre, no mata a nadie');

-- Lobos, asesino y veneno a la vez, con un cazador y unos enamorados.
select pg_temp.fresh_night(17);
update public.luna_state set lover_a = pg_temp.u(9), lover_b = pg_temp.u(5) where game_id = (pg_temp.game()).id;
select pg_temp.act(1, 9);
select pg_temp.act(4, 7);
select pg_temp.witch(false, 6);
select pg_temp.close();
select is(
  pg_temp.deaths(),
  '[[5, "heartbreak"], [6, "poison"], [7, "killer"], [9, "wolves"]]'::jsonb,
  'mueren a la vez las víctimas de lobos, asesino y veneno, y la pareja de pena'
);
select ok((pg_temp.state()).hunter_pending, 'el cazador muerto por el asesino dispara');
select is(
  (select jsonb_agg(d ->> 'cause' order by o) from jsonb_array_elements((pg_temp.state()).announcement -> 'deaths') with ordinality e(d, o)) -> -1,
  '"heartbreak"'::jsonb,
  'la muerte de pena va detrás de las de la noche'
);

-- Enamorados que mueren los dos a la vez: cada uno por su causa, no de pena.
select pg_temp.fresh_night(18);
update public.luna_state set lover_a = pg_temp.u(9), lover_b = pg_temp.u(10) where game_id = (pg_temp.game()).id;
select pg_temp.act(1, 9);
select pg_temp.act(4, 10);
select pg_temp.close();
select is(pg_temp.deaths(), '[[9, "wolves"], [10, "killer"]]'::jsonb, 'si los dos enamorados mueren esa noche, ninguno es de pena');

-- Cierre automático: cuenta a la bruja y al asesino ------------------------------------------

select pg_temp.fresh_night(19);
select pg_temp.act(n, case when n in (1, 2) then 10 else 1 end) from generate_series(1, 10) n where n not in (3, 4, 5);
select pg_temp.act(5, 8);
select is((pg_temp.game()).phase, 'night', 'falta la bruja y el asesino: sigue la noche');
select pg_temp.act(4, 9);
select is((pg_temp.game()).phase, 'night', 'falta la bruja: sigue la noche');
select pg_temp.witch(false, null);
select is((pg_temp.game()).phase, 'dawn', 'cuando actúa la bruja, amanece');
select is(pg_temp.deaths(), '[[9, "killer"], [10, "wolves"]]'::jsonb, 'y se resuelve la noche');

-- Abandono: no gasta pociones y la noche se repite ---------------------------------------------

select pg_temp.fresh_night(20);
select pg_temp.witch(true, 10);
select pg_temp.call(9, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.state()).witch_poison_used, false, 'si alguien se va de noche, la bruja no gasta la poción');
select pg_temp.call(1, format('select public.luna_llena_continue(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'night', 'la noche se repite');
select is(
  (select count(*) from public.luna_night_actions where game_id = (pg_temp.game()).id and night = 20),
  0::bigint,
  'y su acción se olvida'
);
select pg_temp.as_user(3);
select lives_ok(pg_temp.witch_sql(false, 10), 'y la bruja vuelve a actuar');
select pg_temp.as_admin();
select pg_temp.call(3, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.state()).announcement -> 'deaths' -> 0 ->> 'cause', 'left', 'la bruja que se va muere como cualquiera');
select is((pg_temp.state()).witch_poison_used, false, 'sin usar la poción que había elegido');

select * from finish();
rollback;

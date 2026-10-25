begin;
create extension if not exists pgtap with schema extensions;

select plan(44);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 11) as i;

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

create function pg_temp.act_sql(target integer, target2 integer default null) returns text language sql stable as $$
  select format(
    'select public.luna_llena_night_action(%L, %L, %L)',
    pg_temp.room(), pg_temp.u(target), case when target2 is not null then pg_temp.u(target2) end
  )
$$;

create function pg_temp.act(n integer, target integer, target2 integer default null) returns jsonb language sql as $$
  select pg_temp.call(n, pg_temp.act_sql(target, target2))
$$;

create function pg_temp.close_sql() returns text language sql stable as $$
  select format('select public.luna_llena_close_night(%L)', pg_temp.room())
$$;

create function pg_temp.alive(n integer) returns boolean language sql stable as $$
  select alive from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(n)
$$;

-- Abre la noche dada a mano: luna_llena_continue llega en la fase siguiente.
create function pg_temp.open_night(night integer) returns void language sql as $$
  update public.games set phase = 'night' where id = (pg_temp.game()).id;
  update public.luna_state set night = open_night.night where game_id = (pg_temp.game()).id;
$$;

create function pg_temp.deaths() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_array(right(d ->> 'user_id', 2)::integer, d ->> 'role', d ->> 'cause') order by o), '[]'::jsonb)
  from jsonb_array_elements((pg_temp.state()).announcement -> 'deaths') with ordinality as e(d, o)
$$;

-- Sala de 10 y reparto fijo (u1 anfitrión) ---------------------------------------------------
-- Lobos u1, u2 y u3; vidente u4; protector u5; cazador u6; bufón u7; Cupido u8; aldeanos u9 y u10.

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 10) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));
select pg_temp.call(1, format(
  'select public.luna_llena_start(%L, 3, %L)', pg_temp.room(), array['seer', 'protector', 'hunter', 'jester', 'cupid']
));
update public.game_roles gr
set role = (array['wolf', 'wolf', 'wolf', 'seer', 'protector', 'hunter', 'jester', 'cupid', 'villager', 'villager'])[right(gr.user_id::text, 2)::integer]
where gr.game_id = (pg_temp.game()).id;
select pg_temp.call(11, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 11'));

select pg_temp.as_user(9);
select throws_ok(pg_temp.act_sql(1), 'P0001', 'invalid_phase', 'en el reparto no se actúa');
select pg_temp.as_admin();

-- Primera noche ------------------------------------------------------------------------------

select pg_temp.open_night(1);

select pg_temp.as_user(11);
select throws_ok(pg_temp.act_sql(1), 'P0001', 'not_participant', 'quien entró tarde no actúa');
select pg_temp.as_user(1);
select throws_ok(pg_temp.act_sql(2), 'P0001', 'invalid_target', 'un lobo no marca a otro lobo');
select throws_ok(pg_temp.act_sql(1), 'P0001', 'invalid_target', 'ni a sí mismo');
select throws_ok(pg_temp.act_sql(11), 'P0001', 'invalid_target', 'ni a quien no juega');
select throws_ok(pg_temp.act_sql(9, 10), 'P0001', 'invalid_target', 'ni elige a dos');
select lives_ok(pg_temp.act_sql(9), 'marca a un aldeano');
select lives_ok(pg_temp.act_sql(10), 'y puede cambiar de marca');
select pg_temp.as_admin();
select is(
  (select right(target_id::text, 2)::integer from public.luna_night_actions where game_id = (pg_temp.game()).id and night = 1 and user_id = pg_temp.u(1)),
  10,
  'se queda la última marca'
);

select pg_temp.as_user(4);
select throws_ok(pg_temp.act_sql(4), 'P0001', 'invalid_target', 'la vidente no se elige a sí misma');
select lives_ok(pg_temp.act_sql(1), 'la vidente elige a un jugador');
select throws_ok(pg_temp.act_sql(2), 'P0001', 'already_acted', 'y no repite acción la misma noche');

select pg_temp.as_user(8);
select throws_ok(pg_temp.act_sql(9), 'P0001', 'invalid_target', 'Cupido elige a dos la primera noche');
select throws_ok(pg_temp.act_sql(9, 9), 'P0001', 'invalid_target', 'a dos distintos');
select lives_ok(pg_temp.act_sql(9, 10), 'enlaza a dos jugadores');

select pg_temp.as_user(5);
select lives_ok(pg_temp.act_sql(5), 'el protector puede protegerse a sí mismo');

select pg_temp.as_user(9);
select throws_ok(pg_temp.act_sql(9), 'P0001', 'invalid_target', 'un aldeano no sospecha de sí mismo');
select lives_ok(pg_temp.act_sql(1), 'un aldeano marca de quién sospecha');
select throws_ok(pg_temp.act_sql(2), 'P0001', 'already_acted', 'y no cambia su marca');
select pg_temp.as_admin();

select pg_temp.act(2, 10);
select pg_temp.act(3, 9);
select pg_temp.act(6, 1);
select pg_temp.act(7, 1);
select is((pg_temp.game()).phase, 'night', 'mientras falte alguien sigue la noche');
select pg_temp.act(10, 1);

select is((pg_temp.game()).phase, 'dawn', 'al actuar el último vivo amanece');
select is((pg_temp.state()).day, 1, 'empieza el primer día');
select is(
  pg_temp.deaths(),
  '[[10, "villager", "wolves"], [9, "villager", "heartbreak"]]'::jsonb,
  'muere el más marcado y su pareja muere de pena'
);
select is((pg_temp.state()).announcement -> 'kind', '"night"'::jsonb, 'el anuncio es de la noche');
select is(
  array[(pg_temp.state()).lover_a, (pg_temp.state()).lover_b],
  array[pg_temp.u(9), pg_temp.u(10)],
  'Cupido ha enlazado a los enamorados'
);
select is((pg_temp.state()).last_protected_id, pg_temp.u(5), 'queda apuntado a quién protegió');
select is((pg_temp.state()).hunter_pending, false, 'el cazador sigue vivo');

select pg_temp.as_user(1);
select throws_ok(pg_temp.close_sql(), 'P0001', 'invalid_phase', 'de día no se cierra la noche');
select pg_temp.as_admin();

-- Segunda noche: Cupido ya es un aldeano, el protector no repite y hay empate -----------------

select pg_temp.open_night(2);

select pg_temp.as_user(9);
select throws_ok(pg_temp.act_sql(1), 'P0001', 'not_alive', 'un muerto no actúa');
select pg_temp.as_user(1);
select throws_ok(pg_temp.act_sql(9), 'P0001', 'invalid_target', 'nadie marca a un muerto');
select pg_temp.as_user(5);
select throws_ok(pg_temp.act_sql(5), 'P0001', 'same_as_last_night', 'el protector no repite la noche anterior');
select lives_ok(pg_temp.act_sql(4), 'pero protege a otro');
select pg_temp.as_user(8);
select throws_ok(pg_temp.act_sql(1, 2), 'P0001', 'invalid_target', 'desde la segunda noche Cupido no enlaza');
select throws_ok(pg_temp.act_sql(8), 'P0001', 'invalid_target', 'y como aldeano no sospecha de sí mismo');
select lives_ok(pg_temp.act_sql(1), 'marca de quién sospecha');
select pg_temp.as_admin();

select pg_temp.act(1, 6);
select pg_temp.act(2, 7);

select pg_temp.as_user(2);
select throws_ok(pg_temp.close_sql(), 'P0001', 'not_host', 'solo el narrador fuerza el final de la noche');
select pg_temp.as_admin();
select pg_temp.call(1, pg_temp.close_sql());

select is((pg_temp.game()).phase, 'dawn', 'forzada con acciones a medias, amanece');
select is(
  (select count(*) from unnest(array[pg_temp.alive(6), pg_temp.alive(7)]) a where not a),
  1::bigint,
  'con empate muere uno de los empatados'
);
select is(
  (pg_temp.state()).hunter_pending,
  not pg_temp.alive(6),
  'si cae el cazador, queda pendiente su disparo'
);
select is((pg_temp.state()).day, 2, 'segundo día');

-- Tercera noche: el protector salva a la víctima ---------------------------------------------

update public.game_players set alive = true where game_id = (pg_temp.game()).id and user_id in (pg_temp.u(6), pg_temp.u(7));
update public.luna_state set hunter_pending = false where game_id = (pg_temp.game()).id;
select pg_temp.open_night(3);

select pg_temp.act(1, 7);
select pg_temp.act(2, 7);
select pg_temp.act(3, 6);
select pg_temp.act(5, 7);
select pg_temp.call(1, pg_temp.close_sql());
select is(pg_temp.deaths(), '[]'::jsonb, 'el protegido no muere y esa noche no muere nadie');
select ok(pg_temp.alive(7), 'la víctima sigue viva');

-- Cuarta noche: nadie marca ------------------------------------------------------------------

select pg_temp.open_night(4);
select pg_temp.act(4, 1);
select pg_temp.call(1, pg_temp.close_sql());
select is(pg_temp.deaths(), '[]'::jsonb, 'si ningún lobo marca, no muere nadie');
select is((pg_temp.state()).last_protected_id, null::uuid, 'y el protector que no actuó puede repetir después');

select * from finish();
rollback;

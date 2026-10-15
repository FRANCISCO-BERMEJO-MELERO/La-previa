begin;
create extension if not exists pgtap with schema extensions;

select plan(35);

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

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room()))
    -> 'game'
$$;

create function pg_temp.act(n integer, target integer, target2 integer default null) returns jsonb language sql as $$
  select pg_temp.call(n, format(
    'select public.luna_llena_night_action(%L, %L, %L)',
    pg_temp.room(), pg_temp.u(target), case when target2 is not null then pg_temp.u(target2) end
  ))
$$;

create function pg_temp.ids(value jsonb) returns integer[] language sql immutable as $$
  select coalesce(array_agg(right(e #>> '{}', 2)::integer order by 1), '{}') from jsonb_array_elements(value) e
$$;

-- Sala de 10 y reparto fijo (u1 anfitrión) ---------------------------------------------------
-- Lobos u1, u2 y u3; vidente u4; protector u5; cazador u6; bufón u7; Cupido u8; aldeanos u9 y u10.

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 10) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));
select pg_temp.call(1, format(
  'select public.luna_llena_start(%L, 3, %L)', pg_temp.room(), array['protector', 'hunter', 'jester', 'cupid']
));
update public.game_roles gr
set role = (array['wolf', 'wolf', 'wolf', 'seer', 'protector', 'hunter', 'jester', 'cupid', 'villager', 'villager'])[right(gr.user_id::text, 2)::integer]
where gr.game_id = (pg_temp.game()).id;
select pg_temp.call(11, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 11'));

-- Reparto ------------------------------------------------------------------------------------

select is(pg_temp.view(9) ->> 'type', 'luna_llena', 'la foto dice que es Luna llena');
select is(pg_temp.view(9) ->> 'phase', 'roles', 'en el reparto');
select is(pg_temp.view(9) -> 'config', '{"wolves": 3, "roles": ["protector", "hunter", "jester", "cupid"]}'::jsonb, 'con la composición pública');
select is(jsonb_array_length(pg_temp.view(9) -> 'participants'), 10, 'con los diez participantes');
select is(
  (select array_agg(p ->> 'name' order by o) from jsonb_array_elements(pg_temp.view(9) -> 'participants') with ordinality e(p, o)),
  array(select format('Jugador %s', n) from generate_series(1, 10) n),
  'en orden de llegada a la sala'
);
select is(pg_temp.view(9) #>> '{my,role}', 'villager', 'cada uno ve su rol');
select is(pg_temp.view(9) -> 'narration', '{"key": "roles", "params": {}}'::jsonb, 'el narrador da la bienvenida');
select is(pg_temp.ids(pg_temp.view(1) #> '{my,fellow_wolves}'), array[2, 3], 'un lobo ve a los otros lobos');
select is(pg_temp.view(11) #>> '{my,is_participant}', 'false', 'quien entró tarde no participa');
select is(pg_temp.view(11) #>> '{my,role}', null, 'ni tiene rol');
select is(pg_temp.view(9) -> 'announcement', 'null'::jsonb, 'sin anuncio');
select is(pg_temp.view(9) -> 'public_votes', 'null'::jsonb, 'ni votos públicos');
select is(pg_temp.view(9) -> 'result', 'null'::jsonb, 'ni resultado');

-- Primera noche ------------------------------------------------------------------------------

update public.games set phase = 'night' where id = (pg_temp.game()).id;
update public.luna_state set night = 1 where game_id = (pg_temp.game()).id;

select is(pg_temp.view(9) -> 'narration', '{"key": "night_first", "params": {}}'::jsonb, 'la primera noche tiene su texto');
select pg_temp.act(1, 10);
select pg_temp.act(2, 10);
select is(
  pg_temp.view(1) #> '{my,wolf_marks}',
  jsonb_build_array(
    jsonb_build_object('user_id', pg_temp.u(1), 'target_id', pg_temp.u(10)),
    jsonb_build_object('user_id', pg_temp.u(2), 'target_id', pg_temp.u(10))
  ),
  'un lobo ve en directo las marcas de la manada'
);
select is(pg_temp.view(1) #> '{my,action}', jsonb_build_object('target_id', pg_temp.u(10), 'target2_id', null), 'y la suya');
select is(
  (select p ->> 'has_acted' from jsonb_array_elements(pg_temp.view(9) -> 'participants') p where p ->> 'user_id' = pg_temp.u(1)::text),
  'true',
  'todos ven quién ha actuado ya'
);

select pg_temp.act(4, 1);
select is(
  pg_temp.view(4) #> '{my,seer_results}',
  jsonb_build_array(jsonb_build_object('night', 1, 'user_id', pg_temp.u(1), 'is_wolf', true)),
  'la vidente ve al momento que es lobo'
);
select pg_temp.act(8, 9, 10);
select is(
  pg_temp.view(8) #> '{my,action}',
  jsonb_build_object('target_id', pg_temp.u(9), 'target2_id', pg_temp.u(10)),
  'Cupido ve a quién ha enlazado'
);
select pg_temp.act(5, 5);
select is(pg_temp.view(9) #> '{my,lover_id}', 'null'::jsonb, 'de noche nadie sabe aún que está enamorado');

select pg_temp.act(3, 9);
select pg_temp.act(6, 1);
select pg_temp.act(7, 1);
select pg_temp.act(9, 1);
select pg_temp.act(10, 1);

-- Amanecer ---------------------------------------------------------------------------------

select is(pg_temp.view(4) ->> 'phase', 'dawn', 'amanece');
select is(
  pg_temp.view(4) -> 'announcement',
  jsonb_build_object('kind', 'night', 'spared', null, 'deaths', jsonb_build_array(
    jsonb_build_object('user_id', pg_temp.u(10), 'name', 'Jugador 10', 'role', 'villager', 'cause', 'wolves'),
    jsonb_build_object('user_id', pg_temp.u(9), 'name', 'Jugador 9', 'role', 'villager', 'cause', 'heartbreak')
  )),
  'el anuncio dice quién ha muerto, su rol y por qué'
);
select is(
  pg_temp.view(4) -> 'narration',
  '{"key": "dawn_deaths", "params": {"names": ["Jugador 10", "Jugador 9"], "lover": {"name": "Jugador 9", "role": "villager"}}}'::jsonb,
  'el narrador cuenta las muertes y quién ha muerto de pena'
);
select is(
  (select p ->> 'role' from jsonb_array_elements(pg_temp.view(4) -> 'participants') p where p ->> 'user_id' = pg_temp.u(10)::text),
  'villager',
  'el rol de un muerto es público'
);
select is(
  (select count(*) from jsonb_array_elements(pg_temp.view(4) -> 'participants') p where p ->> 'role' is not null),
  2::bigint,
  'y solo el de los muertos'
);
select is(pg_temp.view(10) #>> '{my,lover_id}', pg_temp.u(9)::text, 'al amanecer cada enamorado sabe de quién');
select is(pg_temp.view(9) #>> '{my,lover_id}', pg_temp.u(10)::text, 'los dos');
select is(pg_temp.ids(pg_temp.view(8) #> '{my,chosen_lovers}'), array[9, 10], 'Cupido sabe a quién eligió');
select is(pg_temp.view(5) #>> '{my,last_protected_id}', pg_temp.u(5)::text, 'el protector sabe a quién protegió');
select is(pg_temp.view(4) -> 'spectator', 'null'::jsonb, 'un vivo no recibe la vista de espectador');

select is(pg_temp.ids((pg_temp.view(9) -> 'spectator') -> 'lovers'), array[9, 10], 'un muerto ve a los enamorados');
select is(
  jsonb_array_length((pg_temp.view(9) -> 'spectator') -> 'roles'),
  10,
  'y todos los roles'
);
select is(
  jsonb_array_length((pg_temp.view(9) -> 'spectator') -> 'actions'),
  10,
  'y lo que marcó cada uno esa noche'
);

update public.luna_state set announcement = jsonb_build_object('kind', 'night', 'deaths', '[]'::jsonb, 'spared', null)
where game_id = (pg_temp.game()).id;
select is(pg_temp.view(4) -> 'narration', '{"key": "dawn_none", "params": {}}'::jsonb, 'una noche sin muertes tiene su texto');
update public.luna_state set announcement = jsonb_build_object('kind', 'night', 'spared', null, 'deaths', jsonb_build_array(
  jsonb_build_object('user_id', pg_temp.u(10), 'name', 'Jugador 10', 'role', 'villager', 'cause', 'wolves')
)) where game_id = (pg_temp.game()).id;
select is(
  pg_temp.view(4) -> 'narration',
  '{"key": "dawn_death", "params": {"name": "Jugador 10", "role": "villager"}}'::jsonb,
  'y una con un muerto, el suyo'
);

select * from finish();
rollback;

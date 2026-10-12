begin;
create extension if not exists pgtap with schema extensions;

select plan(47);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 8) as i;

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

create function pg_temp.phase() returns text language sql stable as $$
  select (pg_temp.game()).phase
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

create function pg_temp.sql(action text) returns text language sql stable as $$
  select format('select public.%s(%L)', action, pg_temp.room())
$$;

create function pg_temp.shot_sql(target integer) returns text language sql stable as $$
  select format('select public.luna_llena_hunter_shot(%L, %L)', pg_temp.room(), pg_temp.u(target))
$$;

create function pg_temp.next() returns jsonb language sql as $$
  select pg_temp.call(1, pg_temp.sql('luna_llena_continue'))
$$;

create function pg_temp.set_phase(phase text) returns void language sql as $$
  update public.games set phase = set_phase.phase where id = (pg_temp.game()).id;
$$;

create function pg_temp.kill(n integer, cause text) returns void language sql as $$
  select private.luna_kill((pg_temp.game()).id, pg_temp.u(n), cause);
$$;

create function pg_temp.announce(kind text) returns void language sql as $$
  select private.luna_new_announcement((pg_temp.game()).id, kind);
$$;

create function pg_temp.deaths() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_array(right(d ->> 'user_id', 2)::integer, d ->> 'role', d ->> 'cause') order by o), '[]'::jsonb)
  from jsonb_array_elements((pg_temp.state()).announcement -> 'deaths') with ordinality as e(d, o)
$$;

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

-- Lobos u1 y u2; vidente u3; cazador u4; bufón u5; aldeanos u6, u7 y u8.
create function pg_temp.new_game() returns void language sql as $$
  select pg_temp.call(1, format('select public.luna_llena_start(%L, 2, %L)', pg_temp.room(), array['hunter', 'jester']));
  update public.game_roles gr
  set role = (array['wolf', 'wolf', 'seer', 'hunter', 'jester', 'villager', 'villager', 'villager'])[right(gr.user_id::text, 2)::integer]
  where gr.game_id = (pg_temp.game()).id;
$$;

-- Sala de 8 (u1 anfitrión y narrador) --------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 8) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));
select pg_temp.new_game();

-- Reparto y primera noche --------------------------------------------------------------------

select pg_temp.as_user(2);
select throws_ok(pg_temp.sql('luna_llena_continue'), 'P0001', 'not_host', 'solo el narrador continúa');
select pg_temp.as_admin();

select pg_temp.next();
select is(pg_temp.phase(), 'night', 'del reparto se pasa a la primera noche');
select is((pg_temp.state()).night, 1, 'que es la noche 1');

select pg_temp.as_user(1);
select throws_ok(pg_temp.sql('luna_llena_continue'), 'P0001', 'invalid_phase', 'la noche no se continúa: se cierra');
select throws_ok(pg_temp.sql('luna_llena_skip_hunter'), 'P0001', 'invalid_phase', 'sin cazador no hay nada que saltar');
select pg_temp.as_admin();

-- Los lobos matan al cazador -----------------------------------------------------------------

select pg_temp.call(1, format('select public.luna_llena_night_action(%L, %L, null)', pg_temp.room(), pg_temp.u(4)));
select pg_temp.call(2, format('select public.luna_llena_night_action(%L, %L, null)', pg_temp.room(), pg_temp.u(4)));
select pg_temp.call(1, pg_temp.sql('luna_llena_close_night'));
select is(pg_temp.phase(), 'dawn', 'amanece con el cazador muerto');
select is((pg_temp.state()).hunter_pending, true, 'su disparo queda pendiente');

select pg_temp.next();
select is(pg_temp.phase(), 'hunter', 'tras el anuncio, el turno del cazador');
select is((pg_temp.state()).return_phase, 'dawn', 'que vuelve al amanecer');
select is(pg_temp.view(6) -> 'narration', '{"key": "hunter", "params": {"name": "Jugador 4"}}'::jsonb, 'el narrador lo anuncia');
select is(pg_temp.view(6) -> 'announcement' -> 'deaths' -> 0 ->> 'cause', 'wolves', 'y el anuncio sigue a la vista');

select pg_temp.as_user(6);
select throws_ok(pg_temp.shot_sql(7), 'P0001', 'not_hunter', 'solo dispara el cazador');
select pg_temp.as_user(1);
select throws_ok(pg_temp.shot_sql(7), 'P0001', 'not_hunter', 'tampoco el narrador');
select throws_ok(pg_temp.sql('luna_llena_continue'), 'P0001', 'invalid_phase', 'ni continúa sin disparo');
select pg_temp.as_user(4);
select throws_ok(pg_temp.shot_sql(4), 'P0001', 'invalid_target', 'el cazador dispara a un vivo');
select lives_ok(pg_temp.shot_sql(7), 'el cazador muerto dispara');
select pg_temp.as_admin();

select is(pg_temp.phase(), 'dawn', 'y se vuelve al amanecer');
select is(pg_temp.deaths(), '[[4, "hunter", "wolves"], [7, "villager", "hunter"]]'::jsonb, 'con el disparo añadido al anuncio');
select is(pg_temp.view(6) -> 'narration', '{"key": "hunter_shot", "params": {"name": "Jugador 7", "role": "villager"}}'::jsonb, 'que lee el narrador');
select is(((pg_temp.state()).hunter_pending, (pg_temp.state()).return_phase)::text, '(f,)', 'el disparo ya no está pendiente');

-- Día ----------------------------------------------------------------------------------------

select pg_temp.next();
select is(pg_temp.phase(), 'mayor', 'el primer día se elige alcalde');

update public.luna_state set mayor_id = pg_temp.u(6) where game_id = (pg_temp.game()).id;
select pg_temp.set_phase('day');
select pg_temp.next();
select is(pg_temp.phase(), 'voting', 'del debate se pasa a votar');

select pg_temp.set_phase('defense');
select pg_temp.next();
select is(pg_temp.phase(), 'night', 'sin acusado, de la defensa se pasa a la noche');
select is((pg_temp.state()).night, 2, 'la siguiente');

select pg_temp.set_phase('defense');
update public.luna_state set accused_id = pg_temp.u(8) where game_id = (pg_temp.game()).id;
select pg_temp.next();
select is(
  (pg_temp.phase(), pg_temp.deaths())::text,
  '(execution,"[[8, ""villager"", ""hanged""]]")',
  'con acusado, al continuar el narrador lo ahorca, sin segunda votación'
);
select pg_temp.next();
select is(pg_temp.phase(), 'night', 'tras la ejecución, la noche');
select is((pg_temp.state()).night, 3, 'la siguiente');
select is((pg_temp.state()).accused_id, null::uuid, 'sin acusado');

select pg_temp.announce('night');
select pg_temp.set_phase('dawn');
select pg_temp.next();
select is(pg_temp.phase(), 'day', 'con alcalde vivo el día empieza con el debate');

-- Saltar al cazador ----------------------------------------------------------------------------

update public.luna_state set hunter_pending = true where game_id = (pg_temp.game()).id;
select pg_temp.announce('trial');
select pg_temp.set_phase('execution');
select pg_temp.next();
select is(pg_temp.phase(), 'hunter', 'un cazador ahorcado también dispara');
select pg_temp.as_user(2);
select throws_ok(pg_temp.sql('luna_llena_skip_hunter'), 'P0001', 'not_host', 'solo el narrador lo salta');
select pg_temp.as_admin();
select pg_temp.call(1, pg_temp.sql('luna_llena_skip_hunter'));
select is(pg_temp.phase(), 'execution', 'saltado, se vuelve a la ejecución');
select is(pg_temp.deaths(), '[]'::jsonb, 'sin disparo');
select pg_temp.next();
select is(pg_temp.phase(), 'night', 'y se sigue');

-- Tras un abandono --------------------------------------------------------------------------

insert into public.luna_night_actions (game_id, night, user_id, target_id)
values ((pg_temp.game()).id, 4, pg_temp.u(3), pg_temp.u(1));
update public.luna_state
set announcement = jsonb_build_object('kind', 'left', 'resume', 'night', 'deaths', '[]'::jsonb, 'spared', null)
where game_id = (pg_temp.game()).id;
select pg_temp.set_phase('execution');
select pg_temp.next();
select is((pg_temp.phase(), (pg_temp.state()).night)::text, '(night,4)', 'si se fue de noche, la noche se repite');
select is(
  (select count(*) from public.luna_night_actions where game_id = (pg_temp.game()).id and night = 4),
  0::bigint,
  'desde cero'
);

update public.luna_state
set announcement = jsonb_build_object('kind', 'left', 'resume', 'day', 'deaths', '[]'::jsonb, 'spared', null)
where game_id = (pg_temp.game()).id;
select pg_temp.set_phase('execution');
select pg_temp.next();
select is(pg_temp.phase(), 'day', 'si se fue de día, se vuelve al debate');

-- Victoria -----------------------------------------------------------------------------------
-- Vivos: lobos u1 y u2; vidente u3; bufón u5; aldeano u6.

select pg_temp.announce('night');
select pg_temp.set_phase('dawn');
select pg_temp.next();
select is(pg_temp.phase(), 'day', 'dos lobos contra tres no ganan');

select pg_temp.announce('night');
select pg_temp.kill(3, 'wolves');
select pg_temp.set_phase('dawn');
select pg_temp.next();
select is(pg_temp.phase(), 'finished', 'dos lobos contra el bufón y un aldeano: el bufón cuenta como no lobo');
select is((pg_temp.state()).winner, 'wolves', 'ganan los lobos');
select is(pg_temp.view(6) #>> '{result,winner}', 'wolves', 'el resultado lo dice');
select is(jsonb_array_length(pg_temp.view(6) #> '{result,roles}'), 8, 'con todos los roles');
select is(pg_temp.view(6) -> 'narration', '{"key": "win_wolves", "params": {}}'::jsonb, 'y el narrador lo anuncia');
select is(
  (select count(*) from jsonb_array_elements(pg_temp.view(6) -> 'participants') p where p ->> 'role' is null),
  0::bigint,
  'al terminar, todos los roles son públicos'
);

select pg_temp.new_game();
select pg_temp.announce('night');
select pg_temp.kill(1, 'hanged');
select pg_temp.kill(2, 'wolves');
select pg_temp.set_phase('dawn');
select pg_temp.next();
select is((pg_temp.state()).winner, 'village', 'sin lobos vivos gana el pueblo');

select pg_temp.new_game();
select pg_temp.announce('trial');
select pg_temp.kill(5, 'hanged');
update public.luna_state set winner = 'jester' where game_id = (pg_temp.game()).id;
update public.game_players set alive = false where game_id = (pg_temp.game()).id and user_id <> all (array[pg_temp.u(1), pg_temp.u(2)]);
select pg_temp.set_phase('execution');
select pg_temp.next();
select is((pg_temp.state()).winner, 'jester', 'el bufón ahorcado gana antes que nadie');

select pg_temp.new_game();
select pg_temp.announce('night');
update public.game_players set alive = false where game_id = (pg_temp.game()).id;
select pg_temp.set_phase('dawn');
select pg_temp.next();
select is((pg_temp.state()).winner, 'village', 'si mueren todos, gana el pueblo porque no quedan lobos');

select * from finish();
rollback;

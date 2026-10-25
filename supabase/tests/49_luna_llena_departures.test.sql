begin;
create extension if not exists pgtap with schema extensions;

select plan(30);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 12) as i;

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

create function pg_temp.next(n integer default 1) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.luna_llena_continue(%L)', pg_temp.room()))
$$;

create function pg_temp.leave(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.leave_room(%L)', pg_temp.room()))
$$;

create function pg_temp.act(n integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.luna_llena_night_action(%L, %L, null)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.vote(n integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.luna_llena_vote(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

create function pg_temp.deaths() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_array(right(d ->> 'user_id', 2)::integer, d ->> 'role', d ->> 'cause') order by o), '[]'::jsonb)
  from jsonb_array_elements((pg_temp.state()).announcement -> 'deaths') with ordinality as e(d, o)
$$;

create function pg_temp.set_phase(phase text) returns void language sql as $$
  update public.games set phase = set_phase.phase where id = (pg_temp.game()).id;
$$;

-- Sala de 12 y reparto fijo (u1 anfitrión) --------------------------------------------------
-- Lobos u1 y u2; vidente u3; cazador u4; Cupido u5; aldeanos de u6 a u12.

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 12) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));
select pg_temp.call(1, format('select public.luna_llena_start(%L, 2, %L)', pg_temp.room(), array['seer', 'hunter', 'cupid']));
update public.game_roles gr
set role = (array['wolf', 'wolf', 'seer', 'hunter', 'cupid', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager'])[right(gr.user_id::text, 2)::integer]
where gr.game_id = (pg_temp.game()).id;

-- De noche: la noche se repite desde cero ----------------------------------------------------

select pg_temp.next();
select pg_temp.act(1, 6);
select pg_temp.act(3, 1);
select pg_temp.leave(9);

select is(pg_temp.phase(), 'execution', 'quien se va de noche cancela la noche y se anuncia');
select is(pg_temp.deaths(), '[[9, "villager", "left"]]'::jsonb, 'muere al instante y se revela su rol');
select is(pg_temp.view(3) -> 'narration', '{"key": "left", "params": {"name": "Jugador 9", "role": "villager"}}'::jsonb, 'el narrador lo cuenta');
select is(pg_temp.view(3) -> 'public_votes', 'null'::jsonb, 'sin votos que enseñar');
select pg_temp.next();
select is((pg_temp.phase(), (pg_temp.state()).night)::text, '(night,1)', 'y se vuelve a la misma noche');
select is(
  (select count(*) from public.luna_night_actions where game_id = (pg_temp.game()).id),
  0::bigint,
  'desde cero'
);

-- Primera noche completa: Cupido enamora a u6 y u7; los lobos matan a u8 ----------------------

select pg_temp.call(5, format('select public.luna_llena_night_action(%L, %L, %L)', pg_temp.room(), pg_temp.u(6), pg_temp.u(7)));
select pg_temp.act(1, 8);
select pg_temp.act(2, 8);
select pg_temp.call(1, format('select public.luna_llena_close_night(%L)', pg_temp.room()));
select pg_temp.next();
select is(pg_temp.phase(), 'mayor', 'el primer día se elige alcalde');

-- Votando alcalde: se cancela la elección -----------------------------------------------------

select pg_temp.vote(3, 3);
select pg_temp.leave(7);
select is(pg_temp.deaths(), '[[7, "villager", "left"], [6, "villager", "heartbreak"]]'::jsonb, 'su enamorado muere con él');
select is(
  pg_temp.view(3) -> 'narration',
  '{"key": "left", "params": {"name": "Jugador 7", "role": "villager", "lover": {"name": "Jugador 6", "role": "villager"}}}'::jsonb,
  'y el narrador cuenta las dos muertes'
);
select is(
  (select count(*) from public.luna_votes where game_id = (pg_temp.game()).id),
  0::bigint,
  'los votos de la elección se cancelan'
);
select pg_temp.next();
select is(pg_temp.phase(), 'mayor', 'y se vuelve a elegir');

-- Elección completa; abandono en la votación de acusación -------------------------------------
-- Vivos: u1, u2, u3, u4, u5, u10, u11 y u12.

select pg_temp.vote(n, 3) from unnest(array[1, 2, 3, 4, 5, 10, 11, 12]) n;
select is((pg_temp.phase(), right((pg_temp.state()).mayor_id::text, 2))::text, '(day,03)', 'u3 es el alcalde');
select pg_temp.next();
select pg_temp.vote(1, 4);
select pg_temp.leave(5);
select is(pg_temp.phase(), 'execution', 'quien se va mientras se acusa también se anuncia');
select is(
  (select count(*) from public.luna_votes where game_id = (pg_temp.game()).id and kind = 'accuse'),
  0::bigint,
  'y la acusación se cancela'
);
select is(
  (select count(*) from public.luna_votes where game_id = (pg_temp.game()).id and kind = 'mayor'),
  8::bigint,
  'pero el alcalde ya elegido se queda'
);
select pg_temp.next();
select is(pg_temp.phase(), 'day', 'y se vuelve al debate');

-- Defensa: se va el acusado --------------------------------------------------------------------
-- Vivos: lobos u1 y u2; vidente u3 (alcalde); cazador u4; aldeanos u10, u11 y u12.

select pg_temp.call(9, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 9'));
select pg_temp.next();
select pg_temp.vote(1, 3);
select pg_temp.vote(2, 3);
select pg_temp.call(1, format('select public.luna_llena_close_vote(%L)', pg_temp.room()));

select is((pg_temp.phase(), right((pg_temp.state()).accused_id::text, 2))::text, '(defense,03)', 'u3 es el acusado');
select pg_temp.leave(9);
select is(pg_temp.phase(), 'defense', 'un muerto que vuelve a la sala y se va no cambia la partida');
select pg_temp.leave(3);
select is(pg_temp.phase(), 'execution', 'si se va el acusado, el juicio se cancela');
select is((pg_temp.state()).accused_id, null::uuid, 'sin acusado');
select is(pg_temp.deaths(), '[[3, "seer", "left"]]'::jsonb, 'con su rol a la vista');

-- El cazador vivo que se va no dispara ---------------------------------------------------------
-- Vivos: lobos u1 y u2; cazador u4; aldeanos u10, u11 y u12.

select pg_temp.leave(4);
select is((pg_temp.state()).hunter_pending, false, 'un cazador vivo que se va no dispara');

-- Un cazador muerto que se va antes de disparar ------------------------------------------------

select pg_temp.call(4, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 4'));
update public.luna_state set hunter_pending = true, return_phase = 'dawn' where game_id = (pg_temp.game()).id;
select pg_temp.set_phase('hunter');
select pg_temp.leave(4);
select is(pg_temp.phase(), 'dawn', 'si el cazador muerto se va antes de disparar, se vuelve al anuncio');
select is((pg_temp.state()).hunter_pending, false, 'sin disparo pendiente');

-- Tras la ejecución de un juicio ---------------------------------------------------------------

update public.luna_state set announcement = '{"kind": "trial", "deaths": [], "spared": "Jugador 1"}' where game_id = (pg_temp.game()).id;
select pg_temp.set_phase('execution');
select pg_temp.leave(12);
select is(
  (pg_temp.state()).announcement ->> 'resume',
  'next_night',
  'quien se va tras un juicio no lo repite: se sigue con la noche siguiente'
);

-- Expulsión de un desconectado y traspaso del narrador -------------------------------------------

update public.room_players set last_seen_at = now() - interval '10 minutes' where room_id = pg_temp.room() and user_id = pg_temp.u(11);
select pg_temp.set_phase('voting');
select pg_temp.call(1, format('select public.kick_player(%L, %L)', pg_temp.room(), pg_temp.u(11)));
select is(pg_temp.phase(), 'execution', 'echar a un desconectado cuenta como abandono');
select is(pg_temp.deaths() -> 0 ->> 2, 'left', 'con la misma causa');

select pg_temp.leave(1);
select is((select right(host_id::text, 2) from public.rooms where id = pg_temp.room()), '02', 'si se va el narrador, narra el nuevo anfitrión');
select pg_temp.as_user(2);
select lives_ok(format('select public.luna_llena_continue(%L)', pg_temp.room()), 'que puede continuar');
select pg_temp.as_admin();
select is((pg_temp.phase(), (pg_temp.state()).winner)::text, '(finished,wolves)', 'y al continuar se comprueba la victoria');

select * from finish();
rollback;

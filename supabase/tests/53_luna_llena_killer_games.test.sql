begin;
create extension if not exists pgtap with schema extensions;

select plan(49);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 30) as i;

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

create function pg_temp.host() returns integer language sql stable as $$
  select (value #>> '{}')::integer from ctx where key = 'host'
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

-- Una sala con los jugadores dados y los roles en ese orden; el primero es el anfitrión.
create function pg_temp.new_game(players integer[], roles text[], wolves integer, optional text[]) returns void language plpgsql as $$
declare
  code text;
begin
  delete from ctx;
  insert into ctx select 'room', pg_temp.call(players[1], format('select public.create_room(%L)', format('Jugador %s', players[1]))) -> 'room' -> 'id';
  insert into ctx values ('host', to_jsonb(players[1]));
  code := (select r.code from public.rooms r where r.id = pg_temp.room());
  perform pg_temp.call(n, format('select public.join_room(%L, %L)', code, format('Jugador %s', n)))
  from unnest(players[2:]) n;
  perform pg_temp.call(players[1], format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));
  perform pg_temp.call(players[1], format('select public.luna_llena_start(%L, %s, %L)', pg_temp.room(), wolves, optional));
  update public.game_roles gr set role = roles[array_position(players, right(gr.user_id::text, 2)::integer)]
  where gr.game_id = (pg_temp.game()).id;
end;
$$;

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

create function pg_temp.next() returns jsonb language sql as $$
  select pg_temp.call(pg_temp.host(), format('select public.luna_llena_continue(%L)', pg_temp.room()))
$$;

create function pg_temp.act(n integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.luna_llena_night_action(%L, %L, null)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.witch(n integer, use_life boolean, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, format(
    'select public.luna_llena_witch_action(%L, %L, %L)',
    pg_temp.room(), use_life, case when target is not null then pg_temp.u(target) end
  ))
$$;

create function pg_temp.vote(n integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.luna_llena_vote(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.alive_set(living integer[]) returns void language sql as $$
  update public.game_players gp set alive = right(gp.user_id::text, 2)::integer = any (living)
  where gp.game_id = (pg_temp.game()).id;
$$;

create function pg_temp.winner() returns text language sql stable as $$
  select private.luna_winner(pg_temp.game())
$$;

create function pg_temp.deaths() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_array(right(d ->> 'user_id', 2)::integer, d ->> 'cause') order by d ->> 'user_id'), '[]'::jsonb)
  from jsonb_array_elements((pg_temp.state()).announcement -> 'deaths') d
$$;

-- ¿Recibe este jugador algo que no debería? Pociones, víctima provisional o informe de la
-- bruja, la vista de espectador, la causa real de una muerte nocturna, el uso de una poción o
-- el rol de un vivo.
create function pg_temp.leaks(n integer) returns boolean language sql as $$
  select jsonb_typeof(g #> '{my,potions}') <> 'null'
    or jsonb_typeof(g #> '{my,wolf_victim}') <> 'null'
    or jsonb_typeof(g #> '{my,witch_report}') <> 'null'
    or jsonb_typeof(g -> 'spectator') <> 'null'
    or jsonb_path_exists(g, '$.announcement.deaths[*] ? (@.cause == "wolves" || @.cause == "killer" || @.cause == "poison")')
    or jsonb_path_exists(g, '$.**.use_life ? (@ != null)')
    or jsonb_path_exists(g, '$.participants[*] ? (@.alive == true && @.role != null)')
  from (select pg_temp.view(n) as g) v
$$;

-- Ninguno de los vivos que no son la bruja recibe nada de eso.
create function pg_temp.sealed(witch integer) returns boolean language sql as $$
  select coalesce(bool_and(not pg_temp.leaks(right(gp.user_id::text, 2)::integer)), true)
  from public.game_players gp
  where gp.game_id = (pg_temp.game()).id and gp.alive and gp.user_id <> pg_temp.u(witch)
$$;

-- ¿Ve este jugador alguna acción con ese objetivo?
create function pg_temp.sees_target(n integer, target integer) returns boolean language sql as $$
  select jsonb_path_exists(pg_temp.view(n), '$.** ? (@.target_id == $t)', jsonb_build_object('t', pg_temp.u(target)))
$$;

-- Victoria -----------------------------------------------------------------------------------
-- Lobos u1 y u2; bruja u3; asesino u4; cazador u5; aldeano u6.

select pg_temp.new_game(array[1, 2, 3, 4, 5, 6], array['wolf', 'wolf', 'witch', 'killer', 'hunter', 'villager'], 2, array['hunter', 'witch', 'killer']);

select pg_temp.alive_set(array[4, 6]);
select is(pg_temp.winner(), null, 'sin lobos y con el asesino vivo, la partida sigue');
select pg_temp.alive_set(array[1, 4]);
select is(pg_temp.winner(), null, 'con los lobos en paridad y el asesino vivo, también');
select pg_temp.alive_set(array[1, 2, 4]);
select is(pg_temp.winner(), null, 'y con los lobos en mayoría');
select pg_temp.alive_set(array[4]);
select is(pg_temp.winner(), 'killer', 'el asesino, único superviviente, gana');
select pg_temp.alive_set(array[]::integer[]);
select is(pg_temp.winner(), 'village', 'sin nadie vivo y el asesino muerto, gana el pueblo');
select pg_temp.alive_set(array[1, 6]);
select is(pg_temp.winner(), 'wolves', 'sin asesino, los lobos ganan en paridad');
select pg_temp.alive_set(array[3, 5, 6]);
select is(pg_temp.winner(), 'village', 'sin lobos ni asesino, gana el pueblo');

-- El asesino enamorado no gana mientras viva su pareja, y muere con ella.
select pg_temp.alive_set(array[4, 6]);
update public.luna_state set lover_a = pg_temp.u(4), lover_b = pg_temp.u(6) where game_id = (pg_temp.game()).id;
select is(pg_temp.winner(), null, 'el asesino enamorado no gana con su pareja viva');
select private.luna_new_announcement((pg_temp.game()).id, 'trial');
select private.luna_kill((pg_temp.game()).id, pg_temp.u(6), 'hanged');
select is(pg_temp.deaths(), '[[4, "heartbreak"], [6, "hanged"]]'::jsonb, 'y muere de pena con ella');
select is(pg_temp.winner(), 'village', 'sin nadie vivo, gana el pueblo');

-- El cazador dispara antes de comprobar la victoria.
update public.luna_state set lover_a = null, lover_b = null, winner = null where game_id = (pg_temp.game()).id;
select pg_temp.alive_set(array[4, 5]);
update public.luna_state set night = 5 where game_id = (pg_temp.game()).id;
update public.games set phase = 'night' where id = (pg_temp.game()).id;
select pg_temp.act(5, 4);
select pg_temp.act(4, 5);
select is((pg_temp.game()).phase, 'dawn', 'el asesino mata al cazador');
select pg_temp.next();
select is((pg_temp.game()).phase, 'hunter', 'el cazador dispara antes de que gane el asesino');
select pg_temp.call(5, format('select public.luna_llena_hunter_shot(%L, %L)', pg_temp.room(), pg_temp.u(4)));
select pg_temp.next();
select is((pg_temp.state()).winner, 'village', 'el disparo mata al asesino y gana el pueblo');

-- Partida completa: gana el asesino -------------------------------------------------------------
-- Lobo u11 (anfitrión); asesino u12; bruja u13; aldeano u14; vidente u15.

select pg_temp.new_game(array[11, 12, 13, 14, 15], array['wolf', 'killer', 'witch', 'villager', 'seer'], 1, array['seer', 'witch', 'killer']);
select is(
  (select jsonb_object_agg(role, n) from (select role, count(*) n from public.game_roles where game_id = (pg_temp.game()).id group by role) c),
  '{"wolf": 1, "killer": 1, "witch": 1, "villager": 1, "seer": 1}'::jsonb,
  'se reparte la composición pedida'
);
select ok(pg_temp.sealed(13), 'en el reparto nadie recibe nada ajeno');
select pg_temp.next();

select pg_temp.act(11, 14);
select pg_temp.act(12, 11);
select pg_temp.act(14, 15);
select pg_temp.act(15, 12);
select is(pg_temp.view(13) -> 'my' -> 'wolf_victim', to_jsonb(pg_temp.u(14)), 'la bruja ve a quién van a devorar');
select ok(not pg_temp.leaks(11) and not pg_temp.leaks(14) and not pg_temp.leaks(15), 'nadie más lo ve');
select ok(pg_temp.leaks(13), 'la comprobación sí salta con lo que recibe la bruja');
select ok(
  not pg_temp.sees_target(11, 11) and not pg_temp.sees_target(13, 11)
    and not pg_temp.sees_target(14, 11) and not pg_temp.sees_target(15, 11),
  'el objetivo del asesino solo lo ve él'
);
select ok(pg_temp.sees_target(12, 11), 'que sí lo ve');
select is(
  pg_temp.view(15) -> 'my' -> 'seer_results' -> 0 -> 'is_wolf',
  'false'::jsonb,
  'la vidente ve al asesino como no lobo'
);
select pg_temp.witch(13, false, null);
select is((pg_temp.game()).phase, 'dawn', 'con la bruja, han actuado todos');
select is(pg_temp.deaths(), '[[11, "killer"], [14, "wolves"]]'::jsonb, 'el asesino mata al lobo y el lobo al aldeano');
select ok(pg_temp.sealed(13), 'al amanecer ningún vivo sabe cómo han muerto');
select is(
  (select jsonb_agg(d ->> 'cause') from jsonb_array_elements(pg_temp.view(15) -> 'announcement' -> 'deaths') d),
  '["night", "night"]'::jsonb,
  'para los vivos, las dos muertes son de la noche'
);
select is(
  (select jsonb_agg(c ->> 'cause' order by c ->> 'user_id') from jsonb_array_elements(pg_temp.view(14) -> 'spectator' -> 'causes') c),
  '["killer", "wolves"]'::jsonb,
  'los muertos ven la causa real'
);
select is(pg_temp.view(14) -> 'spectator' -> 'potions', '{"life": true, "poison": true}'::jsonb, 'y las pociones de la bruja');
select ok(
  not (pg_temp.view(15) -> 'narration')::text ~ '(wolves|killer|poison|lobos|asesino|veneno)',
  'el narrador no dice cómo han muerto'
);

select pg_temp.next();
select is((pg_temp.game()).phase, 'mayor', 'sin lobos, con el asesino vivo, la partida sigue');
select pg_temp.vote(n, 12) from unnest(array[12, 13, 15]) n;
select ok(pg_temp.sealed(13), 'de día tampoco');
select pg_temp.next();
select pg_temp.vote(12, 15);
select pg_temp.vote(13, 15);
select pg_temp.vote(15, 13);
select pg_temp.next();
select is((pg_temp.game()).phase, 'execution', 'el pueblo ahorca a la vidente');
select pg_temp.next();
select is((pg_temp.game()).phase, 'night', 'con la bruja viva, sigue la noche');

select pg_temp.act(12, 13);
select pg_temp.witch(13, false, null);
select is(pg_temp.deaths(), '[[13, "killer"]]'::jsonb, 'el asesino mata a la bruja');
select pg_temp.next();
select is((pg_temp.game()).phase, 'finished', 'solo queda el asesino');
select is((pg_temp.state()).winner, 'killer', 'y gana');
select is(pg_temp.view(14) -> 'narration', '{"key": "win_killer", "params": {}}'::jsonb, 'el narrador lo anuncia');
select is(pg_temp.view(12) -> 'result' ->> 'winner', 'killer', 'el resultado lo dice');
select is(jsonb_array_length(pg_temp.view(14) -> 'result' -> 'roles'), 5, 'con todos los roles');

-- Partida completa: gana el pueblo, con la bruja usando las dos pociones ---------------------
-- Lobos u21 (anfitrión) y u22; bruja u23; asesino u24; aldeanos u25, u26 y u27.

select pg_temp.new_game(array[21, 22, 23, 24, 25, 26, 27], array['wolf', 'wolf', 'witch', 'killer', 'villager', 'villager', 'villager'], 2, array['witch', 'killer']);
select pg_temp.next();

select pg_temp.act(21, 25);
select pg_temp.act(22, 25);
select pg_temp.act(24, 26);
select pg_temp.act(n, 21) from unnest(array[25, 26, 27]) n;
select ok(pg_temp.sealed(23), 'de noche ningún vivo recibe nada de la bruja');
select pg_temp.witch(23, true, 24);
select is(pg_temp.deaths(), '[[24, "poison"], [26, "killer"]]'::jsonb, 'la bruja salva a la víctima de los lobos y envenena al asesino, que ya había matado');
select ok(
  ((pg_temp.state()).witch_life_used and (pg_temp.state()).witch_poison_used),
  'gasta las dos pociones'
);
select is(
  pg_temp.view(23) -> 'my' -> 'witch_report',
  jsonb_build_object('saved_id', pg_temp.u(25), 'poisoned_id', pg_temp.u(24)),
  'y ve qué han hecho'
);
select ok(pg_temp.sealed(23), 'pero nadie más lo sabe');
select is(
  (select count(*) from jsonb_array_elements(pg_temp.view(25) -> 'announcement' -> 'deaths') d where d ->> 'cause' = 'night'),
  2::bigint,
  'ni el salvado: dos muertes de la noche'
);

select pg_temp.next();
select pg_temp.vote(n, 25) from unnest(array[21, 22, 23, 25, 27]) n;
select pg_temp.next();
select pg_temp.vote(23, 21);
select pg_temp.vote(25, 21);
select pg_temp.vote(27, 21);
select pg_temp.vote(21, 27);
select pg_temp.vote(22, 27);
select pg_temp.next();
select pg_temp.next();
select is((pg_temp.game()).phase, 'night', 'ahorcado un lobo, cae la segunda noche');

select pg_temp.act(22, 25);
select pg_temp.act(23, 22);
select pg_temp.act(25, 22);
select pg_temp.act(27, 22);
select is(pg_temp.deaths(), '[[25, "wolves"]]'::jsonb, 'sin pociones, la bruja ya no salva a nadie');
select ok(pg_temp.sealed(23), 'y su noche no deja rastro');
select pg_temp.next();
select pg_temp.vote(n, 23) from unnest(array[22, 23, 27]) n;
select pg_temp.next();
select pg_temp.vote(23, 22);
select pg_temp.vote(27, 22);
select pg_temp.vote(22, 27);
select pg_temp.next();
select pg_temp.next();
select is((pg_temp.game()).phase, 'finished', 'ahorcado el último lobo');
select is((pg_temp.state()).winner, 'village', 'gana el pueblo');

select * from finish();
rollback;

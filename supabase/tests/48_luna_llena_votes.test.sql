begin;
create extension if not exists pgtap with schema extensions;

select plan(41);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 8) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.n(id uuid) returns integer language sql immutable as $$
  select right(id::text, 2)::integer
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

create function pg_temp.vote_sql(target integer) returns text language sql stable as $$
  select format('select public.luna_llena_vote(%L, %L)', pg_temp.room(), pg_temp.u(target))
$$;

create function pg_temp.vote(n integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, pg_temp.vote_sql(target))
$$;

create function pg_temp.close_sql() returns text language sql stable as $$
  select format('select public.luna_llena_close_vote(%L)', pg_temp.room())
$$;

create function pg_temp.close() returns jsonb language sql as $$
  select pg_temp.call(1, pg_temp.close_sql())
$$;

create function pg_temp.next() returns jsonb language sql as $$
  select pg_temp.call(1, format('select public.luna_llena_continue(%L)', pg_temp.room()))
$$;

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

-- Abre a mano una fase de un día.
create function pg_temp.open(phase text, day integer) returns void language sql as $$
  update public.games set phase = open.phase where id = (pg_temp.game()).id;
  update public.luna_state set day = open.day where game_id = (pg_temp.game()).id;
$$;

-- Sala de 8 y reparto fijo (u1 anfitrión) ----------------------------------------------------
-- Lobos u1 y u2; vidente u3; cazador u4; bufón u5; aldeanos u6, u7 y u8.

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 8) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));
select pg_temp.call(1, format('select public.luna_llena_start(%L, 2, %L)', pg_temp.room(), array['seer', 'hunter', 'jester']));
update public.game_roles gr
set role = (array['wolf', 'wolf', 'seer', 'hunter', 'jester', 'villager', 'villager', 'villager'])[right(gr.user_id::text, 2)::integer]
where gr.game_id = (pg_temp.game()).id;

select pg_temp.as_user(2);
select throws_ok(pg_temp.vote_sql(3), 'P0001', 'invalid_phase', 'en el reparto no se vota');
select throws_ok(pg_temp.close_sql(), 'P0001', 'not_host', 'ni cierra una votación quien no narra');
select pg_temp.as_admin();

-- Alcalde ------------------------------------------------------------------------------------

select pg_temp.open('mayor', 1);
select is(pg_temp.view(3) -> 'narration', '{"key": "mayor", "params": {}}'::jsonb, 'el narrador pide un alcalde');
select pg_temp.as_user(3);
select lives_ok(pg_temp.vote_sql(3), 'para alcalde uno puede votarse a sí mismo');
select throws_ok(pg_temp.vote_sql(6), 'P0001', 'already_voted', 'y no vota dos veces');
select pg_temp.as_admin();

select pg_temp.vote(n, 6) from generate_series(1, 2) n;
select pg_temp.vote(n, 6) from generate_series(4, 6) n;
select pg_temp.vote(7, 7);
select is(pg_temp.view(7) -> 'public_votes', 'null'::jsonb, 'mientras se vota no se ven los votos');
select is(pg_temp.view(7) #> '{my,vote}', jsonb_build_object('target_id', pg_temp.u(7)), 'solo el propio');
select is(
  (select count(*) from jsonb_array_elements(pg_temp.view(7) -> 'participants') p where (p ->> 'has_acted')::boolean),
  7::bigint,
  'y quién ha votado ya'
);
select pg_temp.vote(8, 7);

select is(pg_temp.phase(), 'day', 'al votar el último se cierra y empieza el debate');
select is((pg_temp.state()).mayor_id, pg_temp.u(6), 'el más votado es el alcalde');
select is(pg_temp.view(3) #>> '{mayor_id}', pg_temp.u(6)::text, 'y todos lo saben');
select is(pg_temp.view(3) #>> '{public_votes,kind}', 'mayor', 'tras elegirlo se ven los votos');
select is(jsonb_array_length(pg_temp.view(3) #> '{public_votes,votes}'), 8, 'todos');
select is(
  pg_temp.view(3) -> 'narration',
  '{"key": "day", "params": {"mayor": "Jugador 6"}}'::jsonb,
  'el narrador anuncia al alcalde y abre el debate'
);

-- Acusación con el voto doble del alcalde ---------------------------------------------------------

select pg_temp.next();
select is(pg_temp.phase(), 'voting', 'se abre la votación');
select is(pg_temp.view(3) -> 'public_votes', 'null'::jsonb, 'y los votos del alcalde dejan de verse');
select pg_temp.as_user(6);
select throws_ok(pg_temp.vote_sql(6), 'P0001', 'invalid_target', 'nadie se acusa a sí mismo');
select pg_temp.as_admin();
select pg_temp.vote(6, 8);
select pg_temp.vote(7, 4);
select pg_temp.close();

select is(pg_temp.phase(), 'defense', 'forzada, se pasa a la defensa');
select is((pg_temp.state()).accused_id, pg_temp.u(8), 'el voto doble del alcalde decide la acusación');
select is(
  pg_temp.view(3) -> 'public_votes',
  jsonb_build_object('kind', 'accuse', 'votes', jsonb_build_array(
    jsonb_build_object('voter_id', pg_temp.u(6), 'target_id', pg_temp.u(8)),
    jsonb_build_object('voter_id', pg_temp.u(7), 'target_id', pg_temp.u(4))
  )),
  'en la defensa se ve quién votó a quién'
);
select is(pg_temp.view(3) -> 'narration', '{"key": "defense", "params": {"name": "Jugador 8"}}'::jsonb, 'y el acusado tiene sus últimas palabras');

-- Sin segunda votación: el acusado sube a la horca ------------------------------------------------

select pg_temp.as_user(3);
select throws_ok(pg_temp.vote_sql(4), 'P0001', 'invalid_phase', 'en la defensa ya no se vota');
select pg_temp.as_admin();
select pg_temp.next();
select is(pg_temp.phase(), 'execution', 'tras la defensa, el narrador lo ahorca');
select is(
  (select jsonb_agg(jsonb_build_array(d ->> 'name', d ->> 'cause')) from jsonb_array_elements((pg_temp.state()).announcement -> 'deaths') d),
  '[["Jugador 8", "hanged"]]'::jsonb,
  'el acusado muere ahorcado'
);
select is(pg_temp.view(3) -> 'narration', '{"key": "executed", "params": {"name": "Jugador 8", "role": "villager"}}'::jsonb, 'el narrador lo cuenta');
select is(pg_temp.view(3) #>> '{public_votes,kind}', 'accuse', 'y se ve otra vez quién votó a quién');
select is(jsonb_array_length(pg_temp.view(3) #> '{public_votes,votes}'), 2, 'con todos los votos de la acusación');

select pg_temp.next();
select is(pg_temp.phase(), 'night', 'y llega la noche');

-- Sin acusado ---------------------------------------------------------------------------------

select pg_temp.open('voting', 2);
select pg_temp.close();
select is((pg_temp.phase(), (pg_temp.state()).accused_id)::text, '(defense,)', 'si nadie vota no hay acusado');
select is(pg_temp.view(3) -> 'narration', '{"key": "no_accused", "params": {}}'::jsonb, 'y el narrador lo anuncia');
select is(pg_temp.view(3) -> 'public_votes', '{"kind": "accuse", "votes": []}'::jsonb, 'sin votos que enseñar');

select pg_temp.open('voting', 3);
select pg_temp.vote(1, 7);
select pg_temp.vote(2, 6);
select pg_temp.close();
select is((pg_temp.state()).accused_id, null::uuid, 'con empate tampoco');

select pg_temp.open('voting', 4);
select pg_temp.vote(6, 3);
select pg_temp.vote(1, 7);
select pg_temp.vote(2, 7);
select pg_temp.close();
select is((pg_temp.state()).accused_id, null::uuid, 'el voto doble del alcalde también empata');

-- Alcalde: empate y sin votos ----------------------------------------------------------------

select pg_temp.open('mayor', 5);
select pg_temp.vote(1, 1);
select pg_temp.vote(2, 2);
select pg_temp.close();
select ok(pg_temp.n((pg_temp.state()).mayor_id) in (1, 2), 'con empate, el azar elige entre los empatados');

select pg_temp.open('mayor', 6);
select pg_temp.close();
select ok(private.luna_is_alive((pg_temp.game()).id, (pg_temp.state()).mayor_id), 'si nadie vota, el azar elige entre los vivos');
select is(pg_temp.view(3) #> '{public_votes}', 'null'::jsonb, 'sin votos que enseñar en el debate');

-- El bufón acusado sube a la horca y gana ----------------------------------------------------

update public.luna_state set accused_id = pg_temp.u(5) where game_id = (pg_temp.game()).id;
select pg_temp.open('defense', 7);
select pg_temp.next();
select is(
  (select jsonb_agg(d ->> 'cause') from jsonb_array_elements((pg_temp.state()).announcement -> 'deaths') d),
  '["hanged"]'::jsonb,
  'el bufón acusado sube a la horca'
);
select is(pg_temp.view(3) -> 'narration', '{"key": "executed", "params": {"name": "Jugador 5", "role": "jester"}}'::jsonb, 'el narrador lo cuenta');
select pg_temp.next();
select is(pg_temp.phase(), 'finished', 'y la partida termina');
select is((pg_temp.state()).winner, 'jester', 'con el bufón como ganador');

select pg_temp.as_user(1);
select throws_ok(pg_temp.close_sql(), 'P0001', 'invalid_phase', 'terminada no hay votación que cerrar');
select pg_temp.as_admin();

select * from finish();
rollback;

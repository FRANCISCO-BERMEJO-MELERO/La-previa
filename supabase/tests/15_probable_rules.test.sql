begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

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

create function pg_temp.host(action text) returns jsonb language sql as $$
  select pg_temp.call(1, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.vote(voter integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(voter, format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.join(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
$$;

create function pg_temp.leave(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.leave_room(%L)', pg_temp.room()))
$$;

create function pg_temp.player(n integer) returns public.game_players language sql stable as $$
  select gp.* from public.game_players gp where gp.game_id = (pg_temp.game()).id and gp.user_id = pg_temp.u(n)
$$;

create function pg_temp.votes_now() returns bigint language sql stable as $$
  select count(*) from public.votes where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

-- Sala de 5 con u1 de anfitrión, partida de 5 rondas.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.join(n) from generate_series(2, 5) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'probable'));
select pg_temp.call(1, format('select public.probable_start(%L, 5)', pg_temp.room()));

-- Ronda 1: cierre automático --------------------------------------------------------------------

select pg_temp.vote(1, 2);
select pg_temp.vote(2, 2);
select pg_temp.vote(3, 2);
select pg_temp.vote(4, 1);
select is((pg_temp.game()).phase, 'voting', 'falta uno: se sigue votando');
select pg_temp.vote(5, 2);
select is((pg_temp.game()).phase, 'reveal', 'cuando vota el último se cierra sola');
select is((pg_temp.player(2)).score, 1, 'y se puntúa igual que al cerrar a mano');

-- Ronda 2: llegar tarde, abandono a media votación y expulsión -----------------------------------

select pg_temp.host('probable_next');
select pg_temp.join(6);
select is(pg_temp.player(6), null::public.game_players, 'quien llega a media ronda no entra en ella');
select pg_temp.as_user(6);
select throws_ok(format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(1)), 'P0001', 'not_participant', 'ni vota');
select pg_temp.as_admin();

select pg_temp.vote(1, 3);
select pg_temp.vote(2, 3);
select pg_temp.vote(3, 5);
select pg_temp.vote(5, 1);
select pg_temp.leave(5);
select is((pg_temp.player(5)).alive, false, 'quien se va deja de participar');
select is(
  (select count(*) from public.votes where game_id = (pg_temp.game()).id and round = 2 and (voter_id = pg_temp.u(5) or target_id = pg_temp.u(5))),
  0::bigint,
  'su voto y los que había recibido desaparecen'
);
select is(pg_temp.votes_now(), 2::bigint, 'los demás votos siguen');
select is((pg_temp.game()).phase, 'voting', 'quien le había votado tiene que volver a votar');

select pg_temp.join(5);
select pg_temp.as_user(5);
select throws_ok(format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(1)), 'P0001', 'not_alive', 'quien vuelve a la sala no vota en la ronda que dejó');
select pg_temp.as_admin();

select pg_temp.vote(3, 1);
select is((pg_temp.game()).phase, 'voting', 'falta el que no ha votado');
update public.room_players set last_seen_at = now() - interval '5 minutes' where user_id = pg_temp.u(4);
select pg_temp.call(1, format('select public.kick_player(%L, %L)', pg_temp.room(), pg_temp.u(4)));
select is((pg_temp.player(4)).alive, false, 'echar a un desconectado lo saca de la partida');
select is((pg_temp.game()).phase, 'reveal', 'y si ya no falta nadie, la ronda se cierra');
select is((pg_temp.player(3)).score, 1, 'con los votos que quedaban');

-- Ronda 3: se incorporan los de la sala --------------------------------------------------------

select pg_temp.host('probable_next');
select is((pg_temp.player(6)).alive, true, 'quien llegó tarde juega desde la ronda siguiente');
select is((pg_temp.player(5)).alive, true, 'quien se fue y volvió, también');
select is((pg_temp.player(5)).score, 0, 'conservando sus puntos');
select is((pg_temp.player(4)).alive, false, 'y el echado, que ya no está en la sala, no vuelve');
select lives_ok($$select pg_temp.vote(6, 1)$$, 'el recién llegado vota');

-- Con 5 activos (u1, u2, u3, u5, u6) se va uno: quedan 4 y se sigue.
select pg_temp.leave(6);
select is((pg_temp.game()).phase, 'voting', 'con 4 activos la partida sigue');
select pg_temp.vote(1, 2);
select pg_temp.vote(2, 2);
select pg_temp.vote(3, 2);
select pg_temp.vote(5, 2);
select is((pg_temp.game()).phase, 'reveal', 'votan los 4 y se cierra');

-- En la revelación: irse no cambia el recuento, pero con menos de 3 activos se acaba.
insert into ctx select 'result', (select result from public.game_rounds where game_id = (pg_temp.game()).id and round = 3);
select pg_temp.leave(5);
select is((pg_temp.game()).phase, 'reveal', 'con 3 activos se sigue en la revelación');
select is(
  (select result from public.game_rounds where game_id = (pg_temp.game()).id and round = 3),
  (select value from ctx where key = 'result'),
  'el recuento enseñado no cambia'
);
select pg_temp.leave(3);
select is((pg_temp.game()).phase, 'finished', 'con menos de 3 activos la partida termina en el acto');
select isnt((pg_temp.game()).finished_at, null, 'con fecha de fin');

select * from finish();
rollback;

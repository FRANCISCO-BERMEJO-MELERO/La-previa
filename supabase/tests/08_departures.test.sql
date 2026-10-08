begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.as_uid(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
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

create function pg_temp.game() returns public.games language sql stable as $$
  select g.* from public.games g where g.room_id = pg_temp.room() order by g.created_at desc limit 1
$$;

create function pg_temp.player(n integer) returns public.game_players language sql stable as $$
  select gp.* from public.game_players gp where gp.game_id = (pg_temp.game()).id and gp.user_id = pg_temp.u(n)
$$;

create function pg_temp.call(n integer, sql text) returns jsonb language plpgsql as $$
declare
  result jsonb;
begin
  perform pg_temp.as_uid(pg_temp.u(n));
  execute sql into result;
  perform pg_temp.as_admin();
  return result;
end;
$$;

-- Sala de 5 (u1 anfitrión) con partida de 1 impostor, que es u5.
create function pg_temp.setup() returns void language plpgsql as $$
declare
  state jsonb;
begin
  perform pg_temp.as_uid(pg_temp.u(1));
  state := public.create_room('Jugador 1');
  for n in 2..5 loop
    perform pg_temp.as_uid(pg_temp.u(n));
    perform public.join_room(state -> 'room' ->> 'code', format('Jugador %s', n));
  end loop;
  perform pg_temp.as_uid(pg_temp.u(1));
  perform public.start_game((state -> 'room' ->> 'id')::uuid, 1);
  perform pg_temp.as_admin();
  delete from ctx where key in ('room', 'code');
  insert into ctx values ('room', to_jsonb(state -> 'room' ->> 'id')), ('code', to_jsonb(state -> 'room' ->> 'code'));
  update public.game_roles set role = case when user_id = pg_temp.u(5) then 'impostor' else 'player' end
  where game_id = (pg_temp.game()).id;
end;
$$;

-- talking: se va un jugador normal ----------------------------------------------------------

select pg_temp.setup();
select pg_temp.call(3, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.player(3)).alive, false, 'hablando: quien se va queda fuera de la partida');
select is((pg_temp.game()).phase, 'reveal', 'hablando: se pasa a la revelación');
select is(
  (pg_temp.game()).outcome,
  jsonb_build_object('type', 'left', 'user_id', pg_temp.u(3), 'name', 'Jugador 3', 'was_impostor', false),
  'hablando: outcome de tipo left que dice que no era el impostor'
);
select is(
  (select count(*) from public.room_players where room_id = pg_temp.room() and user_id = pg_temp.u(3)),
  0::bigint,
  'y deja de ser miembro de la sala'
);
select is((pg_temp.player(3)).name, 'Jugador 3', 'la partida conserva su nombre para mostrarlo');

-- reveal: se va otro; la revelación no cambia ------------------------------------------------

select pg_temp.call(4, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.player(4)).alive, false, 'en la revelación quien se va queda fuera');
select is((pg_temp.game()).outcome ->> 'user_id', pg_temp.u(3)::text, 'pero la revelación en pantalla no cambia');
select is((pg_temp.game()).phase, 'reveal', 'y se sigue en la revelación');

-- voting: se va el impostor; se cancela la votación ------------------------------------------------

select pg_temp.call(1, format('select public.continue_game(%L)', pg_temp.room()));
select pg_temp.call(1, format('select public.open_voting(%L)', pg_temp.room()));
select pg_temp.call(1, format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)));
select pg_temp.call(5, format('select public.leave_room(%L)', pg_temp.room()));
select is(
  (select count(*) from public.votes where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round),
  0::bigint,
  'votando: se borran los votos de la ronda'
);
select is(
  (select bool_or(has_voted) from public.game_players where game_id = (pg_temp.game()).id),
  false,
  'votando: nadie queda marcado como que ha votado'
);
select is((pg_temp.game()).phase, 'reveal', 'votando: se pasa a la revelación');
select is(((pg_temp.game()).outcome ->> 'was_impostor')::boolean, true, 'se revela que el que se fue era el impostor');
select is(
  ((pg_temp.call(1, format('select public.continue_game(%L)', pg_temp.room()))) -> 'room' ->> 'id'),
  pg_temp.room()::text,
  'se puede continuar tras el abandono'
);
select is((pg_temp.game()).winner, 'group', 'sin impostores, gana el grupo al continuar');

-- finished: irse no cambia nada ---------------------------------------------------------------------

select pg_temp.call(2, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.player(2)).alive, true, 'con la partida terminada, irse no cambia la partida');
select is((pg_temp.game()).phase, 'finished', 'y sigue terminada');

-- Expulsar a un desconectado a media partida cuenta como abandono ------------------------------------

select pg_temp.setup();
update public.room_players set last_seen_at = now() - interval '5 minutes'
where room_id = pg_temp.room() and user_id = pg_temp.u(5);
select pg_temp.call(1, format('select public.kick_player(%L, %L)', pg_temp.room(), pg_temp.u(5)));
select is((pg_temp.player(5)).alive, false, 'el expulsado queda fuera de la partida');
select is((pg_temp.game()).outcome ->> 'type', 'left', 'la expulsión se revela como un abandono');
select is(((pg_temp.game()).outcome ->> 'was_impostor')::boolean, true, 'y dice si era el impostor');

-- Quien llegó tarde y se va no cambia la partida ------------------------------------------------------

select pg_temp.setup();
select pg_temp.call(6, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), 'Tardón'));
select pg_temp.call(6, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'talking', 'irse sin participar no cambia la fase');
select is((pg_temp.game()).outcome, null, 'ni crea revelación');

-- El anfitrión que se va a media partida traspasa y la partida sigue ------------------------------------

select pg_temp.call(1, format('select public.leave_room(%L)', pg_temp.room()));
select is((select host_id from public.rooms where id = pg_temp.room()), pg_temp.u(2), 'el anfitrión pasa al siguiente');
select is((pg_temp.game()).outcome ->> 'user_id', pg_temp.u(1)::text, 'y su marcha se revela como las demás');
select lives_ok(
  format('select pg_temp.call(2, %L)', format('select public.continue_game(%L)', pg_temp.room())),
  'el nuevo anfitrión puede seguir la partida'
);

select * from finish();
rollback;

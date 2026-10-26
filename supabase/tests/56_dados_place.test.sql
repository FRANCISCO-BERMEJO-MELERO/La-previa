begin;
create extension if not exists pgtap with schema extensions;

select plan(45);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 5) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.ids(ns integer[]) returns uuid[] language sql immutable as $$
  select array(select pg_temp.u(n) from unnest(ns) with ordinality as e(n, o) order by o)
$$;

create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.as_uid(id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
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

create function pg_temp.state() returns public.dados_state language sql stable as $$
  select s.* from public.dados_state s where s.game_id = (pg_temp.game()).id
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

create function pg_temp.place_sql(col integer) returns text language sql stable as $$
  select format('select public.dados_place(%L, %L)', pg_temp.room(), col)
$$;

create function pg_temp.place(n integer, col integer) returns jsonb language sql as $$
  select pg_temp.call(n, pg_temp.place_sql(col))
$$;

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

-- Fija los tableros, el dado pendiente y el turno (u1 en A abre, u2 en B le sigue).
create function pg_temp.setup(a jsonb, b jsonb, die integer) returns void language sql as $$
  update public.dados_state
  set boards = jsonb_build_object('A', a, 'B', b),
      pending_die = die,
      turn_order = pg_temp.ids(array[1, 2]),
      turn_index = 0
  where game_id = (pg_temp.game()).id;
$$;

-- Puntuación --------------------------------------------------------------------------------

select is(private.dados_column_score('[6]'), 6, 'un 6 vale 6');
select is(private.dados_column_score('[6, 6]'), 24, 'dos 6 valen 24');
select is(private.dados_column_score('[6, 6, 6]'), 54, 'tres 6 valen 54');
select is(private.dados_column_score('[5, 5, 4]'), 24, '5, 5 y 4 valen 24');
select is(private.dados_column_score('[2, 3, 6]'), 11, '2, 3 y 6 valen 11');
select is(private.dados_column_score('[4, 1, 4]'), 17, 'la pareja cuenta aunque no esté seguida');
select is(private.dados_column_score('[]'), 0, 'una columna vacía no vale nada');
select is(private.dados_board_score('[[6, 6], [6], []]'), 30, 'iguales en columnas distintas no se multiplican entre sí');

-- Sala: u1 (anfitrión) contra u2; u3 mira -------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 5) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'dados'));
select pg_temp.call(1, format('select public.dados_start(%L, %L, %L, %L)', pg_temp.room(), '1v1', pg_temp.ids(array[1]), pg_temp.ids(array[2])));

select pg_temp.setup('[[5, 5], [6], []]', '[[], [], []]', 4);
select is(pg_temp.view(3) -> 'sides' -> 0 -> 'column_scores', '[20, 6, 0]'::jsonb, 'la foto da los puntos de cada columna');
select is(pg_temp.view(3) -> 'sides' -> 0 -> 'total', '26'::jsonb, 'y el total del tablero');

-- Turnos ------------------------------------------------------------------------------------

select pg_temp.setup('[[], [], []]', '[[], [], []]', 4);
select pg_temp.as_user(2);
select throws_ok(pg_temp.place_sql(0), 'P0001', 'not_your_turn', 'el rival no coloca en tu turno');
select pg_temp.as_user(3);
select throws_ok(pg_temp.place_sql(0), 'P0001', 'not_your_turn', 'un espectador no coloca');
select pg_temp.as_user(1);
select throws_ok(pg_temp.place_sql(3), 'P0001', 'invalid_column', 'solo hay tres columnas');
select throws_ok(pg_temp.place_sql(-1), 'P0001', 'invalid_column', 'contadas desde cero');
select throws_ok(pg_temp.place_sql(null), 'P0001', 'invalid_column', 'hay que elegir una');
select throws_ok(
  format('select public.dados_place(%L, 0, 6)', pg_temp.room()),
  '42883', null, 'nadie puede proponer el valor del dado'
);
select pg_temp.as_admin();

select pg_temp.place(1, 1);
select is((pg_temp.state()).boards, '{"A": [[], [4], []], "B": [[], [], []]}'::jsonb, 'el dado pendiente va a la columna elegida');
select is((pg_temp.state()).turn_index, 1, 'y el turno pasa al rival');
select ok((pg_temp.state()).pending_die between 1 and 6, 'con un dado nuevo');
select is(pg_temp.view(1) -> 'turn' ->> 'side', 'B', 'la foto dice que le toca a B');
select pg_temp.as_user(1);
select throws_ok(pg_temp.place_sql(1), 'P0001', 'not_your_turn', 'repetir la jugada falla: el turno ya ha pasado');
select pg_temp.as_admin();

-- Columna llena -----------------------------------------------------------------------------

select pg_temp.setup('[[1, 2, 3], [], []]', '[[], [], []]', 6);
select pg_temp.as_user(1);
select throws_ok(pg_temp.place_sql(0), 'P0001', 'column_full', 'una columna llena no admite más');
select pg_temp.as_admin();
select is(
  ((pg_temp.state()).turn_index, (pg_temp.state()).pending_die, (pg_temp.state()).boards -> 'A')::text,
  '(0,6,"[[1, 2, 3], [], []]")',
  'sin consumir el turno ni cambiar el dado'
);

-- Ataque ------------------------------------------------------------------------------------

select pg_temp.setup('[[], [], []]', '[[5, 2, 5], [5], [5, 5]]', 5);
select pg_temp.place(1, 0);
select is(
  (pg_temp.state()).boards,
  '{"A": [[5], [], []], "B": [[2], [5], [5, 5]]}'::jsonb,
  'rompe todos los dados de ese valor en la columna rival y ninguno de las demás'
);
select is(pg_temp.view(3) -> 'sides' -> 1 -> 'column_scores', '[2, 5, 20]'::jsonb, 'recalcula la puntuación del rival');
select is(pg_temp.view(3) -> 'sides' -> 1 -> 'total', '27'::jsonb, 'y su total');
select is(jsonb_array_length((pg_temp.state()).boards #> '{B,0}'), 1, 'los huecos rotos quedan libres');

select pg_temp.setup('[[], [], []]', '[[3, 4], [], []]', 6);
select pg_temp.place(1, 0);
select is((pg_temp.state()).boards -> 'B', '[[3, 4], [], []]'::jsonb, 'sin iguales en la columna rival no rompe nada');

-- Final -------------------------------------------------------------------------------------

select pg_temp.setup('[[1, 2, 3], [4, 5, 6], [1, 2]]', '[[6, 6, 6], [6, 6], []]', 3);
select pg_temp.place(1, 2);
select is((pg_temp.game()).phase, 'finished', 'termina al llenarse un tablero');
select is(pg_temp.view(3) -> 'result', '{"winner": "B", "reason": "board_full", "left": null}'::jsonb, 'gana el de más puntos aunque no haya llenado');
select is(pg_temp.view(3) -> 'turn', 'null'::jsonb, 'ya no le toca a nadie');
select is(pg_temp.view(3) -> 'pending_die', 'null'::jsonb, 'ni hay dado pendiente');
select is(pg_temp.view(1) -> 'my' -> 'is_my_turn', 'false'::jsonb, 'nadie tiene el turno');
select ok((pg_temp.game()).finished_at is not null, 'la partida queda cerrada');
select pg_temp.as_user(2);
select throws_ok(pg_temp.place_sql(0), 'P0001', 'invalid_phase', 'ninguna jugada se acepta al terminar');
select pg_temp.as_admin();

-- El ataque libera huecos del rival y aun así se acaba
select pg_temp.call(1, format('select public.dados_start(%L, %L, %L, %L)', pg_temp.room(), '1v1', pg_temp.ids(array[1]), pg_temp.ids(array[2])));
select pg_temp.setup('[[1, 2, 3], [1, 2, 3], [4, 4]]', '[[], [], [4, 4, 4]]', 4);
select pg_temp.place(1, 2);
select is((pg_temp.state()).boards -> 'B', '[[], [], []]'::jsonb, 'el ataque vacía la columna rival');
select is(pg_temp.view(3) -> 'result', '{"winner": "A", "reason": "board_full", "left": null}'::jsonb, 'y se termina igual, porque el tablero propio está lleno');

-- Empate
select pg_temp.call(1, format('select public.dados_start(%L, %L, %L, %L)', pg_temp.room(), '1v1', pg_temp.ids(array[1]), pg_temp.ids(array[2])));
select pg_temp.setup('[[1, 2, 3], [1, 2, 3], [1, 2]]', '[[6], [6], [6]]', 3);
select pg_temp.place(1, 2);
select is(pg_temp.view(3) -> 'sides' -> 0 -> 'total', pg_temp.view(3) -> 'sides' -> 1 -> 'total', 'los dos bandos acaban con los mismos puntos');
select is(pg_temp.view(3) -> 'result', '{"winner": null, "reason": "board_full", "left": null}'::jsonb, 'con los mismos puntos es empate');

-- Lo llena el segundo en jugar
select pg_temp.call(1, format('select public.dados_start(%L, %L, %L, %L)', pg_temp.room(), '1v1', pg_temp.ids(array[1]), pg_temp.ids(array[2])));
select pg_temp.setup('[[1], [], []]', '[[2, 2, 2], [6, 6, 6], [5, 5]]', 3);
update public.dados_state set turn_index = 1 where game_id = (pg_temp.game()).id;
select pg_temp.place(2, 2);
select is(pg_temp.view(3) -> 'result', '{"winner": "B", "reason": "board_full", "left": null}'::jsonb, 'también se acaba cuando llena el bando B');

-- 2 contra 2: una partida entera respetando el orden ---------------------------------------

select pg_temp.call(1, format('select public.dados_start(%L, %L, %L, %L)', pg_temp.room(), '2v2', pg_temp.ids(array[1, 3]), pg_temp.ids(array[2, 4])));

create temp table turns (step integer, expected uuid, actual uuid, rejected integer, placed boolean);
do $$
declare
  sequence uuid[] := (pg_temp.state()).turn_order;
  current uuid;
  rejected integer;
  placed boolean;
  free_column integer;
  step integer := 0;
begin
  while (pg_temp.game()).phase = 'playing' and step < 500 loop
    current := (pg_temp.state()).turn_order[(pg_temp.state()).turn_index + 1];
    select c.o - 1 into free_column
    from public.game_players gp,
      jsonb_array_elements((pg_temp.state()).boards -> gp.side) with ordinality as c(dice, o)
    where gp.game_id = (pg_temp.game()).id and gp.user_id = current and jsonb_array_length(c.dice) < 3
    order by c.o
    limit 1;

    rejected := 0;
    for other in 1..5 loop
      continue when pg_temp.u(other) = current;
      begin
        perform pg_temp.as_user(other);
        execute pg_temp.place_sql(free_column);
      exception when others then
        if sqlerrm = 'not_your_turn' then
          rejected := rejected + 1;
        end if;
      end;
      perform pg_temp.as_admin();
    end loop;

    placed := false;
    perform pg_temp.as_uid(current);
    execute pg_temp.place_sql(free_column);
    perform pg_temp.as_admin();
    placed := true;

    insert into turns values (step, sequence[(step % 4) + 1], current, rejected, placed);
    step := step + 1;
  end loop;
end;
$$;

select is((pg_temp.game()).phase, 'finished', 'la partida de 2 contra 2 llega al final');
select is((select count(*) from turns where expected <> actual), 0::bigint, 'cada turno es de quien toca en la secuencia A1, B1, A2, B2');
select is((select count(*) from turns where rejected <> 4), 0::bigint, 'en cada turno, los otros tres jugadores y el espectador reciben not_your_turn');
select ok((select count(*) from turns) >= 9, 'se han jugado al menos nueve turnos');
select is(
  (select count(*) from (select actual, lag(actual) over (order by step) as previous from turns) t where actual = previous),
  0::bigint,
  'nadie coloca dos veces seguidas'
);

select * from finish();
rollback;

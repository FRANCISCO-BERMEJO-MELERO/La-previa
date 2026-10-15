begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

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

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

create function pg_temp.next() returns jsonb language sql as $$
  select pg_temp.call(1, format('select public.luna_llena_continue(%L)', pg_temp.room()))
$$;

create function pg_temp.act(n integer, target integer, target2 integer default null) returns jsonb language sql as $$
  select pg_temp.call(n, format(
    'select public.luna_llena_night_action(%L, %L, %L)',
    pg_temp.room(), pg_temp.u(target), case when target2 is not null then pg_temp.u(target2) end
  ))
$$;

create function pg_temp.vote(n integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.luna_llena_vote(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.shoot(n integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.luna_llena_hunter_shot(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.alive() returns integer[] language sql stable as $$
  select array_agg(right(user_id::text, 2)::integer order by user_id)
  from public.game_players where game_id = (pg_temp.game()).id and alive
$$;

-- Lobos u1 y u2; vidente u3; protector u4; cazador u5; bufón u6; Cupido u7; aldeanos u8, u9 y u10.
create function pg_temp.new_game() returns void language sql as $$
  select pg_temp.call(1, format(
    'select public.luna_llena_start(%L, 2, %L)', pg_temp.room(), array['protector', 'hunter', 'jester', 'cupid']
  ));
  update public.game_roles gr
  set role = (array['wolf', 'wolf', 'seer', 'protector', 'hunter', 'jester', 'cupid', 'villager', 'villager', 'villager'])[right(gr.user_id::text, 2)::integer]
  where gr.game_id = (pg_temp.game()).id;
$$;

-- Revisión en cada paso -----------------------------------------------------------------------

create temp table problems (step integer generated always as identity, phase text, problem text);

-- Lo que la foto de un vivo no puede contener antes de 'finished' (docs/PLAN-5.md §8).
create function pg_temp.leaks(n integer) returns text[] language plpgsql as $$
declare
  v jsonb := pg_temp.view(n);
  my jsonb := v -> 'my';
  role text := my ->> 'role';
  state public.luna_state := pg_temp.state();
  found text[] := '{}';
begin
  if not (my ->> 'alive')::boolean or v ->> 'phase' = 'finished' then
    return found;
  end if;
  if exists (
    select 1 from jsonb_array_elements(v -> 'participants') p
    where (p ->> 'alive')::boolean and p ->> 'role' is not null
  ) then
    found := array_append(found, 'rol de un vivo');
  end if;
  if role <> 'wolf' and (jsonb_array_length(my -> 'fellow_wolves') > 0 or jsonb_array_length(my -> 'wolf_marks') > 0) then
    found := array_append(found, 'lobos');
  end if;
  if role <> 'seer' and jsonb_array_length(my -> 'seer_results') > 0 then
    found := array_append(found, 'vidente');
  end if;
  if role <> 'protector' and my -> 'last_protected_id' <> 'null' then
    found := array_append(found, 'protegido');
  end if;
  if role <> 'cupid' and my -> 'chosen_lovers' <> 'null' then
    found := array_append(found, 'enamorados');
  end if;
  if my -> 'lover_id' <> 'null' and pg_temp.u(n) not in (state.lover_a, state.lover_b) then
    found := array_append(found, 'pareja ajena');
  end if;
  if v -> 'spectator' <> 'null' or v -> 'result' <> 'null' then
    found := array_append(found, 'espectador o resultado');
  end if;
  if v ->> 'phase' in ('roles', 'night', 'dawn', 'mayor', 'voting') and v -> 'public_votes' <> 'null' then
    found := array_append(found, 'votos sin cerrar');
  end if;
  return found;
end;
$$;

-- Acciones que no tocan en la fase en curso y que, pedidas por el narrador, no fallan como deben.
create function pg_temp.misfires() returns text[] language plpgsql as $$
declare
  allowed text[] := case pg_temp.phase()
    when 'roles' then array['continue']
    when 'night' then array['night_action', 'close_night']
    when 'hunter' then array['hunter_shot', 'skip_hunter']
    when 'mayor' then array['vote', 'close_vote']
    when 'voting' then array['vote', 'close_vote']
    when 'finished' then array[]::text[]
    else array['continue']
  end;
  found text[] := '{}';
  attempt record;
begin
  for attempt in
    select * from (values
      ('continue', format('select public.luna_llena_continue(%L)', pg_temp.room())),
      ('night_action', format('select public.luna_llena_night_action(%L, %L, null)', pg_temp.room(), pg_temp.u(9))),
      ('close_night', format('select public.luna_llena_close_night(%L)', pg_temp.room())),
      ('vote', format('select public.luna_llena_vote(%L, %L)', pg_temp.room(), pg_temp.u(9))),
      ('close_vote', format('select public.luna_llena_close_vote(%L)', pg_temp.room())),
      ('hunter_shot', format('select public.luna_llena_hunter_shot(%L, %L)', pg_temp.room(), pg_temp.u(9))),
      ('skip_hunter', format('select public.luna_llena_skip_hunter(%L)', pg_temp.room()))
    ) calls(name, sql)
    where not calls.name = any (allowed)
  loop
    begin
      perform pg_temp.call(1, attempt.sql);
      found := found || format('%s no falla', attempt.name);
    exception when others then
      if sqlerrm <> 'invalid_phase' then
        found := found || format('%s: %s', attempt.name, sqlerrm);
      end if;
    end;
    perform pg_temp.as_admin();
  end loop;
  return found;
end;
$$;

create function pg_temp.audit() returns void language sql as $$
  insert into problems (phase, problem)
  select pg_temp.phase(), format('u%s: %s', n, l)
  from generate_series(1, 10) n
  cross join lateral unnest(pg_temp.leaks(n)) l;
  insert into problems (phase, problem)
  select pg_temp.phase(), m from unnest(pg_temp.misfires()) m;
$$;

create function pg_temp.problems() returns text[] language sql stable as $$
  select coalesce(array_agg(format('%s · %s', phase, problem) order by step), '{}') from problems
$$;

-- Sala de 10 (u1 anfitrión y narrador) -------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 10) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'luna_llena'));

-- Partida 1: gana el pueblo --------------------------------------------------------------------

select pg_temp.new_game();
select pg_temp.audit();
select pg_temp.next();
select pg_temp.audit();

-- Noche 1: Cupido enamora a u8 y u9; los lobos van a por u10, que está protegido.
select pg_temp.act(7, 8, 9);
select pg_temp.act(1, 10);
select pg_temp.audit();
select pg_temp.act(2, 10);
select pg_temp.act(4, 10);
select pg_temp.act(3, 1);
select pg_temp.act(n, 1) from unnest(array[5, 6, 8, 9]) n;
select pg_temp.audit();
select pg_temp.act(10, 1);
select is(pg_temp.alive(), array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'partida 1: el protector salva a la víctima');
select pg_temp.audit();

-- Día 1: u3 es alcalde; el pueblo ahorca a u1.
select pg_temp.next();
select pg_temp.audit();
select pg_temp.vote(n, 3) from generate_series(1, 10) n;
select pg_temp.audit();
select pg_temp.next();
select pg_temp.vote(1, 3);
select pg_temp.vote(2, 3);
select pg_temp.audit();
select pg_temp.vote(n, 1) from generate_series(3, 10) n;
select pg_temp.audit();
select pg_temp.next();
select pg_temp.audit();
select pg_temp.audit();
select is(pg_temp.alive(), array[2, 3, 4, 5, 6, 7, 8, 9, 10], 'el pueblo ahorca a un lobo');

-- Noche 2: los lobos matan al cazador, que dispara al último lobo.
select pg_temp.next();
select pg_temp.audit();
select pg_temp.act(2, 5);
select pg_temp.act(4, 3);
select pg_temp.act(3, 2);
select pg_temp.act(n, 2) from unnest(array[5, 6, 7, 8, 9]) n;
select pg_temp.audit();
select pg_temp.act(10, 2);
select pg_temp.audit();
select pg_temp.next();
select is(pg_temp.phase(), 'hunter', 'el cazador devorado dispara');
select pg_temp.audit();
select pg_temp.shoot(5, 2);
select pg_temp.audit();
select pg_temp.next();

select is((pg_temp.phase(), (pg_temp.state()).winner)::text, '(finished,village)', 'sin lobos, gana el pueblo');
select is(
  pg_temp.view(8) -> 'result',
  jsonb_build_object(
    'winner', 'village',
    'roles', (select jsonb_agg(jsonb_build_object('user_id', user_id, 'role', role) order by user_id) from public.game_roles where game_id = (pg_temp.game()).id),
    'lovers', jsonb_build_array(pg_temp.u(8), pg_temp.u(9))
  ),
  'el resultado trae todos los roles y los enamorados'
);
select pg_temp.audit();
select is(pg_temp.problems(), '{}'::text[], 'partida 1: en ningún paso un vivo ve algo secreto ni funciona una acción fuera de su fase');

-- Partida 2: ganan los lobos -------------------------------------------------------------------

delete from problems;
select pg_temp.new_game();
select pg_temp.next();

-- Noche 1: Cupido enamora a un lobo (u2) y a u10; los lobos matan a la vidente.
select pg_temp.act(7, 2, 10);
select pg_temp.act(1, 3);
select pg_temp.act(2, 3);
select pg_temp.act(4, 4);
select pg_temp.act(3, 1);
select pg_temp.act(n, 1) from unnest(array[5, 6, 8, 9]) n;
select pg_temp.audit();
select pg_temp.act(10, 1);
select is(pg_temp.alive(), array[1, 2, 4, 5, 6, 7, 8, 9, 10], 'partida 2: muere la vidente');
select is(pg_temp.view(10) #>> '{my,lover_id}', pg_temp.u(2)::text, 'un lobo y un aldeano pueden estar enamorados');
select pg_temp.audit();

-- Día 1: u1 (lobo) es alcalde; su voto doble decide la acusación y la condena de u4.
select pg_temp.next();
select pg_temp.vote(n, 1) from unnest(array[1, 2, 4, 5, 6, 7, 8, 9, 10]) n;
select pg_temp.next();
select pg_temp.vote(1, 4);
select pg_temp.vote(2, 4);
select pg_temp.vote(10, 4);
select pg_temp.vote(5, 6);
select pg_temp.vote(6, 5);
select pg_temp.vote(7, 5);
select pg_temp.vote(8, 6);
select pg_temp.vote(4, 6);
select pg_temp.audit();
select pg_temp.vote(9, 7);
select is((pg_temp.state()).accused_id, pg_temp.u(4), 'el voto doble del alcalde decide la acusación');
select pg_temp.audit();
select pg_temp.next();
select is(pg_temp.alive(), array[1, 2, 5, 6, 7, 8, 9, 10], 'y sube a la horca sin segunda votación');
select pg_temp.audit();

-- Noche 2: los lobos matan al cazador, que se lleva a u8.
select pg_temp.next();
select pg_temp.act(1, 5);
select pg_temp.act(2, 5);
select pg_temp.act(n, 1) from unnest(array[5, 6, 7, 8, 9, 10]) n;
select pg_temp.next();
select pg_temp.audit();
select pg_temp.shoot(5, 8);
select pg_temp.next();
select is(pg_temp.phase(), 'day', 'el alcalde sigue vivo: directo al debate');

-- Día 2: el pueblo ahorca a u9 por error.
select pg_temp.next();
select pg_temp.vote(1, 9);
select pg_temp.vote(2, 9);
select pg_temp.vote(10, 9);
select pg_temp.vote(6, 7);
select pg_temp.vote(7, 6);
select pg_temp.vote(9, 6);
select pg_temp.next();
select is(pg_temp.alive(), array[1, 2, 6, 7, 10], 'ahorcado u9');
select pg_temp.audit();

-- Noche 3: los lobos devoran al bufón, que no gana.
select pg_temp.next();
select pg_temp.act(1, 6);
select pg_temp.act(2, 6);
select pg_temp.act(n, 1) from unnest(array[6, 7, 10]) n;
select pg_temp.audit();
select pg_temp.next();
select is((pg_temp.phase(), (pg_temp.state()).winner)::text, '(finished,wolves)', 'dos lobos contra dos: ganan los lobos y el bufón devorado no');
select is(pg_temp.problems(), '{}'::text[], 'partida 2: en ningún paso un vivo ve algo secreto ni funciona una acción fuera de su fase');

-- Partida 3: gana el bufón ---------------------------------------------------------------------

delete from problems;
select pg_temp.new_game();
select pg_temp.next();
select pg_temp.act(7, 8, 9);
select pg_temp.act(1, 10);
select pg_temp.act(2, 10);
select pg_temp.act(4, 3);
select pg_temp.act(3, 6);
select is(pg_temp.view(3) #> '{my,seer_results,0,is_wolf}', 'false'::jsonb, 'partida 3: para la vidente el bufón no es lobo');
select pg_temp.act(n, 1) from unnest(array[5, 6, 8, 9, 10]) n;
select pg_temp.audit();
select is(pg_temp.alive(), array[1, 2, 3, 4, 5, 6, 7, 8, 9], 'muere u10');
select pg_temp.next();
select pg_temp.vote(n, 6) from generate_series(1, 9) n;
select pg_temp.next();
select pg_temp.vote(6, 1);
select pg_temp.vote(n, 6) from generate_series(1, 5) n;
select pg_temp.vote(n, 6) from generate_series(7, 9) n;
select pg_temp.audit();
select pg_temp.next();
select pg_temp.audit();
select pg_temp.next();
select is((pg_temp.phase(), (pg_temp.state()).winner)::text, '(finished,jester)', 'el pueblo ahorca al bufón y gana él solo');
select is(pg_temp.view(3) #>> '{result,winner}', 'jester', 'y así lo dice el resultado');
select is(pg_temp.problems(), '{}'::text[], 'partida 3: en ningún paso un vivo ve algo secreto ni funciona una acción fuera de su fase');

select * from finish();
rollback;

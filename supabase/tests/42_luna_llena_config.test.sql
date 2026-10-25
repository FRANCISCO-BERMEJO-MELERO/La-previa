begin;
create extension if not exists pgtap with schema extensions;

select plan(29);

-- Composición ---------------------------------------------------------------------------------

select throws_ok($$select private.luna_config(3, 1, array[]::text[])$$, 'P0001', 'not_enough_players', 'con menos de 4 jugadores no se juega');
select lives_ok($$select private.luna_config(4, 1, array[]::text[])$$, 'con 4 sí');
select throws_ok($$select private.luna_config(3, null, null)$$, 'P0001', 'not_enough_players', 'ni con la recomendada');
select throws_ok($$select private.luna_config(8, 0, array[]::text[])$$, 'P0001', 'invalid_config', 'sin lobos ni asesino no hay amenaza');
select throws_ok($$select private.luna_config(8, 0, array['seer', 'witch'])$$, 'P0001', 'invalid_config', 'ni con otros roles');
select lives_ok($$select private.luna_config(8, 0, array['killer'])$$, 'sin lobos vale si hay asesino');
select throws_ok($$select private.luna_config(8, -1, array['killer'])$$, 'P0001', 'invalid_config', 'los lobos no pueden ser negativos');
select lives_ok($$select private.luna_config(8, 4, array[]::text[])$$, 'los lobos pueden ser la mitad');
select lives_ok($$select private.luna_config(5, 4, array[]::text[])$$, 'y mayoría: cuatro lobos de cinco');
select throws_ok($$select private.luna_config(5, 5, array[]::text[])$$, 'P0001', 'invalid_config', 'pero no todos lobos');
select throws_ok($$select private.luna_config(5, 6, array[]::text[])$$, 'P0001', 'invalid_config', 'ni más lobos que jugadores');
select lives_ok($$select private.luna_config(9, 4, array[]::text[])$$, 'cuatro lobos con nueve jugadores sí');
select lives_ok($$select private.luna_config(6, 2, array['seer', 'protector', 'hunter', 'jester'])$$, 'puede no quedar ningún aldeano');
select throws_ok($$select private.luna_config(6, 2, array['seer', 'protector', 'hunter', 'jester', 'cupid'])$$, 'P0001', 'invalid_config', 'pero los roles tienen que caber');
select lives_ok($$select private.luna_config(6, 2, array['protector', 'hunter'])$$, 'con un aldeano basta');
select lives_ok($$select private.luna_config(8, 1, array['seer', 'protector', 'hunter', 'jester', 'cupid', 'witch', 'killer'])$$, 'todos los especiales a la vez, si caben');
select throws_ok($$select private.luna_config(9, 2, array['wizard'])$$, 'P0001', 'invalid_config', 'un rol opcional desconocido se rechaza');
select throws_ok($$select private.luna_config(9, 2, array['wolf'])$$, 'P0001', 'invalid_config', 'el lobo no es un rol opcional');
select lives_ok($$select private.luna_config(9, 2, array['seer'])$$, 'la vidente es opcional');
select lives_ok($$select private.luna_config(9, 2, array[]::text[])$$, 'y se puede jugar sin ella');
select throws_ok($$select private.luna_config(9, 2, array['hunter', 'hunter'])$$, 'P0001', 'invalid_config', 'un rol opcional repetido se rechaza');
select throws_ok($$select private.luna_config(9, 2, array[null]::text[])$$, 'P0001', 'invalid_config', 'y uno nulo');
select throws_ok($$select private.luna_config(9, 2, null)$$, 'P0001', 'invalid_config', 'lobos sin roles es una composición a medias');
select throws_ok($$select private.luna_config(9, null, array[]::text[])$$, 'P0001', 'invalid_config', 'y roles sin lobos también');

select is(
  private.luna_config(12, 3, array['killer', 'cupid', 'protector', 'witch', 'jester', 'seer']),
  '{"wolves": 3, "roles": ["seer", "protector", "jester", "cupid", "witch", "killer"]}'::jsonb,
  'los roles se guardan en su orden'
);
select is(private.luna_config(10, null, null), '{"wolves": 2, "roles": ["seer", "protector", "hunter"]}'::jsonb, 'sin composición, la recomendada');
select ok(
  (select bool_and(not private.luna_recommended_config(p) -> 'roles' ?| array['witch', 'killer']) from generate_series(4, 16) p),
  'la recomendada no lleva bruja ni asesino'
);

select is(
  (
    select array_agg(p order by p)
    from generate_series(4, 16) p
    cross join lateral (select private.luna_recommended_config(p) as c) rec
    where private.luna_config(
      p,
      (rec.c ->> 'wolves')::integer,
      array(select jsonb_array_elements_text(rec.c -> 'roles'))
    ) = rec.c
  ),
  array(select generate_series(4, 16)),
  'la recomendada es válida de 4 a 16 jugadores'
);

-- set_game ------------------------------------------------------------------------------------

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
set local role authenticated;
select public.create_room('Uno') -> 'room' ->> 'id' as room_id \gset
select is(
  public.set_game(:'room_id', 'luna_llena') -> 'room' ->> 'game',
  'luna_llena',
  'set_game acepta luna_llena'
);

select * from finish();
rollback;

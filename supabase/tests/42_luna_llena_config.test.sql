begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- Composición ---------------------------------------------------------------------------------

select throws_ok($$select private.luna_config(3, 1, array[]::text[])$$, 'P0001', 'not_enough_players', 'con menos de 4 jugadores no se juega');
select lives_ok($$select private.luna_config(4, 1, array[]::text[])$$, 'con 4 sí');
select throws_ok($$select private.luna_config(3, null, null)$$, 'P0001', 'not_enough_players', 'ni con la recomendada');
select throws_ok($$select private.luna_config(8, 0, array[]::text[])$$, 'P0001', 'invalid_config', 'hace falta al menos un lobo');
select throws_ok($$select private.luna_config(8, 4, array[]::text[])$$, 'P0001', 'invalid_config', 'los lobos no pueden ser la mitad o más');
select lives_ok($$select private.luna_config(9, 4, array[]::text[])$$, 'cuatro lobos con nueve jugadores sí');
select throws_ok($$select private.luna_config(6, 2, array['protector', 'hunter', 'jester'])$$, 'P0001', 'invalid_config', 'tiene que quedar al menos un aldeano');
select lives_ok($$select private.luna_config(6, 2, array['protector', 'hunter'])$$, 'con un aldeano basta');
select throws_ok($$select private.luna_config(9, 2, array['witch'])$$, 'P0001', 'invalid_config', 'un rol opcional desconocido se rechaza');
select throws_ok($$select private.luna_config(9, 2, array['seer'])$$, 'P0001', 'invalid_config', 'la vidente no es opcional');
select throws_ok($$select private.luna_config(9, 2, array['hunter', 'hunter'])$$, 'P0001', 'invalid_config', 'un rol opcional repetido se rechaza');
select throws_ok($$select private.luna_config(9, 2, array[null]::text[])$$, 'P0001', 'invalid_config', 'y uno nulo');
select throws_ok($$select private.luna_config(9, 2, null)$$, 'P0001', 'invalid_config', 'lobos sin roles es una composición a medias');
select throws_ok($$select private.luna_config(9, null, array[]::text[])$$, 'P0001', 'invalid_config', 'y roles sin lobos también');

select is(
  private.luna_config(12, 3, array['cupid', 'protector', 'jester']),
  '{"wolves": 3, "roles": ["protector", "jester", "cupid"]}'::jsonb,
  'los roles se guardan en su orden'
);
select is(private.luna_config(10, null, null), '{"wolves": 2, "roles": ["protector", "hunter"]}'::jsonb, 'sin composición, la recomendada');

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

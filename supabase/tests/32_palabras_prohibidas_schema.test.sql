begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$insert into public.rooms (id, code, host_id, game) values ('10000000-0000-0000-0000-000000000001', 'KTRM', '00000000-0000-0000-0000-000000000001', 'palabras_prohibidas')$$,
  'una sala puede elegir palabras_prohibidas'
);
select lives_ok(
  $$insert into public.games (id, room_id, game_type, phase, total_rounds) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'palabras_prohibidas', 'describing', 5)$$,
  'palabras_prohibidas empieza describiendo'
);
select lives_ok(
  $$update public.games set phase = 'reveal' where id = '20000000-0000-0000-0000-000000000001'$$,
  'tiene revelación'
);
select throws_ok(
  $$update public.games set phase = 'voting' where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'pero no votación'
);

-- Tarjetas -------------------------------------------------------------------------------------

select has_table('public', 'taboo_cards', 'existe la tabla de tarjetas');
select is(
  (select relrowsecurity from pg_class where oid = 'public.taboo_cards'::regclass),
  true,
  'con RLS activado'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'taboo_cards'),
  0::bigint,
  'y sin políticas'
);
select has_column('public', 'game_rounds', 'card_id', 'cada ronda puede llevar su tarjeta');

select lives_ok(
  $$insert into public.taboo_cards (word, forbidden) values ('Tarjeta de prueba', array['uno', 'dos', 'tres', 'cuatro', 'cinco'])$$,
  'una tarjeta lleva su palabra y cinco prohibidas'
);
select throws_ok(
  $$insert into public.taboo_cards (word, forbidden) values ('Otra prueba', array['uno', 'dos', 'tres', 'cuatro'])$$,
  '23514', null, 'con cuatro prohibidas se rechaza'
);
select throws_ok(
  $$insert into public.taboo_cards (word, forbidden) values ('Otra prueba', array['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'])$$,
  '23514', null, 'con seis también'
);
select throws_ok(
  $$insert into public.taboo_cards (word, forbidden) values ('Otra prueba', array['Árbol', 'arbol', 'tres', 'cuatro', 'cinco'])$$,
  '23514', null, 'dos prohibidas que solo cambian en tildes o mayúsculas son la misma'
);
select throws_ok(
  $$insert into public.taboo_cards (word, forbidden) values ('Otra prueba', array['OTRA PRUEBA', 'dos', 'tres', 'cuatro', 'cinco'])$$,
  '23514', null, 'una prohibida no puede ser la palabra'
);
select throws_ok(
  $$insert into public.taboo_cards (word, forbidden) values ('Otra prueba', array['', 'dos', 'tres', 'cuatro', 'cinco'])$$,
  '23514', null, 'ni estar vacía'
);
select throws_ok(
  $$insert into public.taboo_cards (word, forbidden) values ('Tarjeta de prueba', array['seis', 'siete', 'ocho', 'nueve', 'diez'])$$,
  '23505', null, 'la palabra no se repite entre tarjetas'
);

select * from finish();
rollback;

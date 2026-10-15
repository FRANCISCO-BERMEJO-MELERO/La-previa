begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

select is((select count(*) from public.taboo_cards where active), 150::bigint, 'hay 150 tarjetas activas');
select is(
  (select count(*) from public.taboo_cards t, unnest(t.forbidden) f where f <> btrim(f)),
  0::bigint,
  'las prohibidas no tienen espacios sobrantes'
);
-- Las tarjetas se pintan con la palabra grande y las prohibidas en una lista.
select is(
  (select count(*) from public.taboo_cards t, unnest(t.forbidden) f
   where char_length(t.word) > 16 or char_length(f) > 16),
  0::bigint,
  'ni la palabra ni las prohibidas pasan de 16 caracteres'
);

select * from finish();
rollback;

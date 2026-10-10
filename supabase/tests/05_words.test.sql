begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

select is((select count(*) from public.words where active), 200::bigint, 'hay 200 palabras activas');
select is((select count(distinct category) from public.words), 10::bigint, 'en 10 categorías');
select set_eq(
  'select distinct category from public.words',
  array['Comida', 'Animales', 'Lugares', 'Objetos de casa', 'Deportes', 'Profesiones',
        'Cine y series', 'Música', 'Transporte', 'Fiesta y ocio'],
  'las categorías son las de CONTEXTO §9'
);
select is(
  (select min(n) from (select count(*) as n from public.words group by category) per_category),
  20::bigint,
  'ninguna categoría tiene menos de 20 palabras'
);
select is(
  (select count(*) from (select lower(word) from public.words group by lower(word) having count(*) > 1) dup),
  0::bigint,
  'ninguna palabra se repite'
);

set local role authenticated;
select throws_ok('select * from public.words', '42501', null, 'el cliente no puede leer las palabras');
reset role;

select * from finish();
rollback;

begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

select is(
  (select count(*) from public.words where active and category in ('Fútbol', 'Historia', 'Videojuegos', 'Ciencia', 'Geografía')),
  100::bigint,
  'hay 100 palabras activas en las cinco temáticas nuevas'
);
select is(
  (select min(n) from (
    select count(*) as n from public.words
    where category in ('Fútbol', 'Historia', 'Videojuegos', 'Ciencia', 'Geografía')
    group by category
  ) per_category),
  20::bigint,
  'cada temática nueva tiene 20'
);
select is((select count(*) from public.words where active), 300::bigint, 'en total, 300 palabras activas');
select is(
  (select count(*) from public.words where word <> btrim(word)),
  0::bigint,
  'sin espacios sobrantes'
);

select * from finish();
rollback;

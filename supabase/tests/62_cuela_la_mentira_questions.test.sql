begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

select is((select count(*) from public.cuela_questions where active), 40::bigint, '40 preguntas activas');
select is(
  (select count(*) from public.cuela_questions where cardinality(distractors) < 2),
  0::bigint,
  'cada una con al menos 2 distractores'
);
select is(
  (
    select count(*)
    from public.cuela_questions q, unnest(q.distractors) as d
    where private.cuela_is_truth(q, d)
  ),
  0::bigint,
  'ningún distractor es la verdad ni una variante aceptada en forma normalizada'
);
select is(
  (
    select count(*)
    from public.cuela_questions q
    where cardinality(q.distractors) <> (
      select count(distinct private.normalize_answer(d)) from unnest(q.distractors) as d
    )
  ),
  0::bigint,
  'ningún distractor repite otro de la misma pregunta'
);
select is(
  (
    select count(*)
    from public.cuela_questions q, unnest(q.accepted) as a
    where private.normalize_answer(a) = private.normalize_answer(q.truth)
  ),
  0::bigint,
  'las variantes aceptadas no repiten la verdad'
);
select is(
  (select count(*) from public.cuela_questions where array_length(regexp_split_to_array(btrim(truth), '\s+'), 1) > 6),
  0::bigint,
  'cada verdad cabe en 6 palabras'
);

select * from finish();
rollback;

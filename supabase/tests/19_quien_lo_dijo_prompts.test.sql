begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

select is(
  (select count(*) from public.prompts where game_type = 'quien_lo_dijo' and active),
  80::bigint,
  'hay 80 preguntas activas de quien_lo_dijo'
);
select is(
  (select count(*) from public.prompts where game_type = 'quien_lo_dijo' and text !~ '^¿[^?]+\?$'),
  0::bigint,
  'todas son una pregunta completa, entre signos de interrogación'
);
select is(
  (select count(*) from public.prompts where game_type = 'quien_lo_dijo' and text <> btrim(text)),
  0::bigint,
  'sin espacios sobrantes'
);

select * from finish();
rollback;

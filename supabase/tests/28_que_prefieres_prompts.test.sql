begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

select is(
  (select count(*) from public.prompts where game_type = 'que_prefieres' and active),
  120::bigint,
  'hay 120 dilemas activos de que_prefieres'
);
select is(
  (select count(*) from public.prompts where game_type = 'que_prefieres' and text = text_b),
  0::bigint,
  'las dos opciones de cada dilema son distintas'
);
select is(
  (select count(*) from public.prompts
   where game_type = 'que_prefieres' and (text <> btrim(text) or text_b <> btrim(text_b))),
  0::bigint,
  'sin espacios sobrantes'
);
-- Las opciones van en botones grandes: cortas, sin signos al final y empezando en mayúscula.
select is(
  (select count(*) from public.prompts
   where game_type = 'que_prefieres' and (char_length(text) > 50 or char_length(text_b) > 50)),
  0::bigint,
  'ninguna opción pasa de 50 caracteres'
);
select is(
  (select count(*) from public.prompts
   where game_type = 'que_prefieres'
     and (text !~ '^[[:upper:]].*[^.?!]$' or text_b !~ '^[[:upper:]].*[^.?!]$')),
  0::bigint,
  'empiezan en mayúscula y no acaban en signo'
);

select * from finish();
rollback;

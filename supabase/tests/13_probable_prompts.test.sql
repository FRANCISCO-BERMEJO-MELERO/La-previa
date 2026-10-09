begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

select is(
  (select count(*) from public.prompts where game_type = 'probable' and active),
  150::bigint,
  'hay 150 preguntas activas de probable'
);
select is(
  (select count(*) from (select lower(text) from public.prompts group by lower(text) having count(*) > 1) dup),
  0::bigint,
  'ninguna pregunta se repite'
);
select is(
  (select count(*) from public.prompts where game_type = 'probable' and text !~ '^[a-záéíóúñ]'),
  0::bigint,
  'todas continúan la frase: empiezan en minúscula'
);
select is(
  (select count(*) from public.prompts where game_type = 'probable' and (text ~ '[?.¿]' or text <> btrim(text))),
  0::bigint,
  'ninguna lleva signos de cierre ni espacios sobrantes: los pone la interfaz'
);

set local role authenticated;
select throws_ok('select * from public.prompts', '42501', null, 'el cliente no puede leer las preguntas');
reset role;

select * from finish();
rollback;

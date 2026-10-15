-- Foto de ¿Qué prefieres? (docs/JUEGOS-2.md §6). Hasta 'reveal' solo se sabe quién ha elegido,
-- nunca qué ni cuántos han elegido cada opción.

create function private.que_prefieres_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.with_my(private.round_state(g.id, uid), jsonb_build_object(
    'choice', (
      select a.text from public.answers a
      where a.game_id = g.id and a.round = g.round and a.user_id = uid
    )
  )) || jsonb_build_object(
    'option_a', p.text,
    'option_b', p.text_b,
    'choices', case when g.phase = 'reveal' then gr.result -> 'choices' end,
    'majority', case when g.phase = 'reveal' then gr.result -> 'majority' end
  )
  from public.games g
  join public.game_rounds gr on gr.game_id = g.id and gr.round = g.round
  join public.prompts p on p.id = gr.prompt_id
  where g.id = target_game_id;
$$;

create or replace function private.game_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case g.game_type
    when 'impostor' then private.impostor_state(g.id, uid)
    when 'probable' then private.probable_state(g.id, uid)
    when 'quien_lo_dijo' then private.quien_lo_dijo_state(g.id, uid)
    when 'una_pista' then private.una_pista_state(g.id, uid)
    when 'que_prefieres' then private.que_prefieres_state(g.id, uid)
  end
  from public.games g
  where g.id = target_game_id;
$$;

revoke execute on function private.que_prefieres_state(uuid, uuid) from public, anon, authenticated;

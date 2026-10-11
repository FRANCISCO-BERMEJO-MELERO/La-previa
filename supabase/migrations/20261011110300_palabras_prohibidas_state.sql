-- Foto de Palabras prohibidas (docs/JUEGOS-2.md §6). Hasta 'reveal', la palabra y las prohibidas
-- solo van en la foto de quien describe y de quien vigila.

create function private.palabras_prohibidas_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.round_state(g.id, uid) || jsonb_build_object(
    'describer_id', gr.subject_id,
    'watcher_id', roles.watcher,
    'word', case when sees.card then t.word end,
    'forbidden', case when sees.card then to_jsonb(t.forbidden) end,
    'result', case when g.phase = 'reveal' then gr.result end
  )
  from public.games g
  join public.game_rounds gr on gr.game_id = g.id and gr.round = g.round
  join public.taboo_cards t on t.id = gr.card_id
  cross join lateral (select private.palabras_prohibidas_watcher(g) as watcher) roles
  cross join lateral (
    select g.phase in ('reveal', 'finished') or gr.subject_id = uid or roles.watcher = uid as card
  ) sees
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
    when 'palabras_prohibidas' then private.palabras_prohibidas_state(g.id, uid)
  end
  from public.games g
  where g.id = target_game_id;
$$;

revoke execute on function private.palabras_prohibidas_state(uuid, uuid) from public, anon, authenticated;

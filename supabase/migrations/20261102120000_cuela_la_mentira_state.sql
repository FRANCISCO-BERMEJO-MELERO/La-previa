-- Foto de Cuela la mentira (docs/PLAN-9.md §5). Antes de 'reveal' no contiene la verdad, el tipo
-- de ninguna opción, autores ni votos ajenos, ni las mentiras de los demás: cada uno sabe solo
-- cuál es la suya. Las opciones van en el orden barajado, el mismo para todos.

create function private.cuela_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.with_my(private.round_state(g.id, uid), jsonb_build_object(
    'answer', (
      select a.text from public.answers a
      where a.game_id = g.id and a.round = g.round and a.user_id = uid
    ),
    'voted_option_id', (
      select v.option_id from public.cuela_votes v
      where v.game_id = g.id and v.round = g.round and v.user_id = uid
    )
  )) || jsonb_build_object(
    'question', q.text,
    'options', case
      when g.phase = 'voting' then (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', o.option_id,
            'text', o.text,
            'is_mine', exists (
              select 1 from public.cuela_option_authors oa
              where oa.option_id = o.option_id and oa.user_id = uid
            )
          )
          order by o.position
        ), '[]'::jsonb)
        from public.cuela_options o
        where o.game_id = g.id and o.round = g.round
      )
      when g.phase in ('reveal', 'finished') then (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', o.option_id,
            'text', o.text,
            'kind', o.kind,
            'author_ids', (
              select coalesce(jsonb_agg(oa.user_id order by oa.user_id), '[]'::jsonb)
              from public.cuela_option_authors oa
              where oa.option_id = o.option_id
            ),
            'left_author_ids', (
              select coalesce(jsonb_agg(oa.user_id order by oa.user_id), '[]'::jsonb)
              from public.cuela_option_authors oa
              where oa.option_id = o.option_id
                and coalesce(gr.result -> 'left_author_ids', '[]'::jsonb) ? oa.user_id::text
            ),
            'voter_ids', (
              select coalesce(jsonb_agg(v.user_id order by v.user_id), '[]'::jsonb)
              from public.cuela_votes v
              where v.option_id = o.option_id
            )
          )
          order by o.position
        ), '[]'::jsonb)
        from public.cuela_options o
        where o.game_id = g.id and o.round = g.round
      )
    end,
    'explanation', case when g.phase in ('reveal', 'finished') then q.explanation end,
    'round_points', case when g.phase in ('reveal', 'finished') then gr.result -> 'points' end
  )
  from public.games g
  join public.game_rounds gr on gr.game_id = g.id and gr.round = g.round
  left join public.cuela_questions q on q.id = gr.cuela_question_id
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
    when 'luna_llena' then private.luna_llena_state(g.id, uid)
    when 'dados' then private.dados_game_state(g.id, uid)
    when 'cuela_la_mentira' then private.cuela_state(g.id, uid)
  end
  from public.games g
  where g.id = target_game_id;
$$;

revoke execute on function private.cuela_state(uuid, uuid) from public, anon, authenticated;

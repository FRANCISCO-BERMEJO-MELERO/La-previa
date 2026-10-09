-- Foto de Una sola pista (docs/JUEGOS.md §8). Hasta 'reveal', la foto del adivino no lleva la
-- palabra; hasta 'guessing' no lleva ninguna pista, y entonces solo el texto de las vivas. Quien da
-- pista no ve las de los demás hasta 'review'.

-- Pistas de la ronda en curso tal como las puede ver quien mira.
create function private.una_pista_clues(game public.games, uid uuid, is_guesser boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when game.phase in ('writing', 'finished') then null
    when is_guesser and game.phase = 'review' then null
    -- Sin autor y en orden alfabético, para que el orden tampoco diga de quién es cada una.
    when is_guesser and game.phase = 'guessing' then (
      select coalesce(jsonb_agg(jsonb_build_object('text', a.text) order by lower(a.text), a.text), '[]'::jsonb)
      from public.answers a
      where a.game_id = game.id and a.round = game.round and not a.cancelled
    )
    else (
      select coalesce(jsonb_agg(
        jsonb_build_object('user_id', a.user_id, 'text', a.text, 'cancelled', a.cancelled)
        order by rp.joined_at nulls last, a.user_id
      ), '[]'::jsonb)
      from public.answers a
      left join public.room_players rp on rp.room_id = game.room_id and rp.user_id = a.user_id
      where a.game_id = game.id and a.round = game.round
    )
  end;
$$;

create function private.una_pista_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.with_my(private.round_state(g.id, uid), jsonb_build_object(
    'clue', (
      select a.text from public.answers a
      where a.game_id = g.id and a.round = g.round and a.user_id = uid
    )
  )) || jsonb_build_object(
    'guesser_id', gr.subject_id,
    'arbiter_id', private.una_pista_arbiter(g),
    'team_score', (
      select count(*) from public.game_rounds r
      where r.game_id = g.id and r.result ->> 'result' = 'correct'
    ),
    'category', case when not hidden.word then w.category end,
    'word', case when not hidden.word then w.word end,
    'clues', private.una_pista_clues(g, uid, gr.subject_id = uid),
    'result', case when g.phase = 'reveal' then gr.result ->> 'result' end,
    'ranking', null
  )
  from public.games g
  join public.game_rounds gr on gr.game_id = g.id and gr.round = g.round
  join public.words w on w.id = gr.word_id
  cross join lateral (
    select gr.subject_id = uid and g.phase not in ('reveal', 'finished') as word
  ) hidden
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
  end
  from public.games g
  where g.id = target_game_id;
$$;

revoke execute on function
  private.una_pista_clues(public.games, uuid, boolean),
  private.una_pista_state(uuid, uuid)
from public, anon, authenticated;

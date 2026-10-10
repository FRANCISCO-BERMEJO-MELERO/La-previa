-- Foto de ¿Quién lo dijo? (docs/JUEGOS.md §8). Antes de 'reveal' no contiene el autor de la
-- respuesta elegida ni respuestas ajenas: cada uno ve solo la suya.

-- Si ha respondido, tal como lo ve la foto. En la votación de ¿Quién lo dijo? el autor no vota, así
-- que saber quién falta por votar delataría al autor: ahí no se dice de nadie.
create function private.shows_responded(game public.games, target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when game.game_type = 'quien_lo_dijo' and game.phase = 'voting' then false
    else private.has_responded(game, target_user_id)
  end;
$$;

create or replace function private.round_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'type', g.game_type,
    'id', g.id,
    'phase', g.phase,
    'round', g.round,
    'total_rounds', g.total_rounds,
    'participants', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'user_id', gp.user_id,
          'name', gp.name,
          'alive', gp.alive,
          'score', gp.score,
          'has_responded', private.shows_responded(g, gp.user_id)
        )
        order by rp.joined_at nulls last, gp.name, gp.user_id
      ), '[]'::jsonb)
      from public.game_players gp
      left join public.room_players rp on rp.room_id = g.room_id and rp.user_id = gp.user_id
      where gp.game_id = g.id
    ),
    'my', jsonb_build_object(
      'is_participant', me.user_id is not null,
      'alive', coalesce(me.alive, false)
    ),
    'ranking', case when g.phase = 'finished' then (
      select coalesce(jsonb_agg(
        jsonb_build_object('user_id', gp.user_id, 'name', gp.name, 'score', gp.score)
        order by gp.score desc, gp.name, gp.user_id
      ), '[]'::jsonb)
      from public.game_players gp
      where gp.game_id = g.id
    ) end
  )
  from public.games g
  left join public.game_players me on me.game_id = g.id and me.user_id = uid
  where g.id = target_game_id;
$$;

create function private.quien_lo_dijo_state(target_game_id uuid, uid uuid)
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
    'is_author', g.phase in ('voting', 'reveal') and gr.subject_id is not distinct from uid,
    'voted_for', (
      select v.target_id from public.votes v
      where v.game_id = g.id and v.round = g.round and v.voter_id = uid
    )
  )) || jsonb_build_object(
    'prompt', p.text,
    'featured_text', case when g.phase in ('voting', 'reveal') then (
      select a.text from public.answers a
      where a.game_id = g.id and a.round = g.round and a.user_id = gr.subject_id
    ) end,
    'vote_progress', case when g.phase = 'voting' then jsonb_build_object(
      'voted', (select count(*) from public.votes v where v.game_id = g.id and v.round = g.round),
      'total', (
        select count(*) from public.game_players gp
        where gp.game_id = g.id and gp.alive and gp.user_id <> gr.subject_id
      )
    ) end,
    'annulled', case when g.phase = 'reveal' then coalesce((gr.result ->> 'annulled')::boolean, false) end,
    'author_id', case when g.phase = 'reveal' then gr.result -> 'author_id' end,
    'correct_ids', case when g.phase = 'reveal' then gr.result -> 'correct_ids' end,
    'wrong_ids', case when g.phase = 'reveal' then gr.result -> 'wrong_ids' end,
    'answers', case when g.phase = 'reveal' then (
      select coalesce(jsonb_agg(
        jsonb_build_object('user_id', a.user_id, 'text', a.text)
        order by rp.joined_at nulls last, a.user_id
      ), '[]'::jsonb)
      from public.answers a
      left join public.room_players rp on rp.room_id = g.room_id and rp.user_id = a.user_id
      where a.game_id = g.id and a.round = g.round
    ) end
  )
  from public.games g
  join public.game_rounds gr on gr.game_id = g.id and gr.round = g.round
  left join public.prompts p on p.id = gr.prompt_id
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
  end
  from public.games g
  where g.id = target_game_id;
$$;

revoke execute on function
  private.shows_responded(public.games, uuid),
  private.quien_lo_dijo_state(uuid, uuid)
from public, anon, authenticated;

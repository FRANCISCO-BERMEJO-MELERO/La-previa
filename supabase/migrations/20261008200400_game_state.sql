-- La parte de partida de la foto del estado (docs/CONTEXTO.md §4, "La foto del estado").
-- Antes de 'finished' no puede contener el rol ni la palabra de otro, a quién ha votado otro
-- ni recuentos. Cada jugador solo recibe su propio rol, y la palabra solo si no es impostor.

create function private.game_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id,
    'phase', g.phase,
    'round', g.round,
    'impostor_count', g.impostor_count,
    'impostors_left', (
      select count(*)
      from public.game_players gp
      join public.game_roles gr on gr.game_id = gp.game_id and gr.user_id = gp.user_id
      where gp.game_id = g.id and gp.alive and gr.role = 'impostor'
    ),
    'category', w.category,
    'participants', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'user_id', gp.user_id,
          'name', gp.name,
          'alive', gp.alive,
          'has_voted', gp.has_voted
        )
        order by rp.joined_at nulls last, gp.name, gp.user_id
      ), '[]'::jsonb)
      from public.game_players gp
      left join public.room_players rp on rp.room_id = g.room_id and rp.user_id = gp.user_id
      where gp.game_id = g.id
    ),
    'my', jsonb_build_object(
      'is_participant', me.user_id is not null,
      'alive', coalesce(me.alive, false),
      'role', mine.role,
      'word', case when mine.role = 'player' then w.word end,
      'voted_for', (
        select v.target_id from public.votes v
        where v.game_id = g.id and v.round = g.round and v.voter_id = uid
      )
    ),
    'outcome', case when g.phase in ('reveal', 'finished') then g.outcome end,
    'game_over', g.phase = 'reveal' and private.winner(g.id) is not null,
    'result', case when g.phase = 'finished' then jsonb_build_object(
      'winner', g.winner,
      'word', w.word,
      'impostor_ids', (
        select coalesce(jsonb_agg(gr.user_id order by gr.user_id), '[]'::jsonb)
        from public.game_roles gr
        where gr.game_id = g.id and gr.role = 'impostor'
      )
    ) end
  )
  from public.games g
  join public.words w on w.id = g.word_id
  left join public.game_players me on me.game_id = g.id and me.user_id = uid
  left join public.game_roles mine on mine.game_id = g.id and mine.user_id = uid
  where g.id = target_game_id;
$$;

create or replace function private.build_state(target_room_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'server_time', now(),
    'room', jsonb_build_object(
      'id', r.id,
      'code', r.code,
      'game', r.game,
      'host_id', r.host_id,
      'version', r.version
    ),
    'me', (
      select jsonb_build_object('user_id', me.user_id, 'name', me.name, 'is_host', me.user_id = r.host_id)
      from public.room_players me
      where me.room_id = r.id and me.user_id = uid
    ),
    'players', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'user_id', rp.user_id,
          'name', rp.name,
          'connected', private.is_connected(rp.last_seen_at),
          'joined_at', rp.joined_at
        )
        order by rp.joined_at, rp.user_id
      ), '[]'::jsonb)
      from public.room_players rp
      where rp.room_id = r.id
    ),
    'game', case when r.current_game_id is not null then private.game_state(r.current_game_id, uid) end
  )
  from public.rooms r
  where r.id = target_room_id;
$$;

revoke execute on function private.game_state(uuid, uuid) from public, anon, authenticated;

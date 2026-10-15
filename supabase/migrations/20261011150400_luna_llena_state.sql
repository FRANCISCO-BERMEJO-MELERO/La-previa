-- Foto de Luna llena (docs/PLAN-5.md §8). Es el juego con más secretos: antes de 'finished', un
-- vivo solo recibe su rol, los otros lobos si es lobo, sus propias acciones, su pareja y los
-- votos ya cerrados. Los muertos que juegan reciben además `spectator`.

-- ¿Ha hecho ya este jugador lo que pide la fase en curso?
create function private.luna_has_acted(game public.games, state public.luna_state, target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when game.phase = 'night' then exists (
      select 1 from public.luna_night_actions a
      where a.game_id = game.id and a.night = state.night and a.user_id = target_user_id
    )
    when game.phase in ('mayor', 'voting', 'verdict') then exists (
      select 1 from public.luna_votes v
      where v.game_id = game.id
        and v.day = state.day
        and v.kind = case game.phase when 'voting' then 'accuse' else game.phase end
        and v.voter_id = target_user_id
    )
    else false
  end;
$$;

-- El rol de cada muerto es público; el de los vivos, solo al terminar.
create function private.luna_participants(game public.games, state public.luna_state)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', gp.user_id,
      'name', gp.name,
      'alive', gp.alive,
      'has_acted', gp.alive and private.luna_has_acted(game, state, gp.user_id),
      'role', case when not gp.alive or game.phase = 'finished' then gr.role end
    )
    order by rp.joined_at nulls last, gp.name, gp.user_id
  ), '[]'::jsonb)
  from public.game_players gp
  join public.game_roles gr on gr.game_id = gp.game_id and gr.user_id = gp.user_id
  left join public.room_players rp on rp.room_id = game.room_id and rp.user_id = gp.user_id
  where gp.game_id = game.id;
$$;

create function private.luna_roles(target_game_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', gr.user_id, 'role', gr.role) order by gr.user_id), '[]'::jsonb)
  from public.game_roles gr
  where gr.game_id = target_game_id;
$$;

create function private.luna_lovers(state public.luna_state)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when state.lover_a is not null then jsonb_build_array(state.lover_a, state.lover_b) end;
$$;

create function private.luna_my(game public.games, state public.luna_state, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'is_participant', me.user_id is not null,
    'alive', coalesce(me.alive, false),
    'role', mine.role,
    'fellow_wolves', case when mine.role = 'wolf' then (
      select coalesce(jsonb_agg(gr.user_id order by gr.user_id), '[]'::jsonb)
      from public.game_roles gr
      where gr.game_id = game.id and gr.role = 'wolf' and gr.user_id <> uid
    ) else '[]'::jsonb end,
    'action', case when game.phase = 'night' then (
      select jsonb_build_object('target_id', a.target_id, 'target2_id', a.target2_id)
      from public.luna_night_actions a
      where a.game_id = game.id and a.night = state.night and a.user_id = uid
    ) end,
    'wolf_marks', case when mine.role = 'wolf' and me.alive and game.phase = 'night' then (
      select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'target_id', a.target_id) order by a.user_id), '[]'::jsonb)
      from public.luna_night_actions a
      join public.game_roles gr on gr.game_id = a.game_id and gr.user_id = a.user_id
      where a.game_id = game.id and a.night = state.night and gr.role = 'wolf'
    ) else '[]'::jsonb end,
    'seer_results', case when mine.role = 'seer' then (
      select coalesce(jsonb_agg(
        jsonb_build_object('night', a.night, 'user_id', a.target_id, 'is_wolf', target.role = 'wolf')
        order by a.night
      ), '[]'::jsonb)
      from public.luna_night_actions a
      join public.game_roles target on target.game_id = a.game_id and target.user_id = a.target_id
      where a.game_id = game.id and a.user_id = uid
    ) else '[]'::jsonb end,
    'lover_id', case
      when state.lover_a = uid then state.lover_b
      when state.lover_b = uid then state.lover_a
    end,
    'chosen_lovers', case when mine.role = 'cupid' then private.luna_lovers(state) end,
    'last_protected_id', case when mine.role = 'protector' then state.last_protected_id end,
    'vote', case when game.phase in ('mayor', 'voting', 'verdict') then (
      select jsonb_build_object('target_id', v.target_id, 'condemn', v.condemn)
      from public.luna_votes v
      where v.game_id = game.id
        and v.day = state.day
        and v.kind = case game.phase when 'voting' then 'accuse' else game.phase end
        and v.voter_id = uid
    ) end
  )
  from (select 1) one
  left join public.game_players me on me.game_id = game.id and me.user_id = uid
  left join public.game_roles mine on mine.game_id = game.id and mine.user_id = uid;
$$;

-- Votos ya cerrados: los del alcalde durante el día en que se eligió, los de la acusación en la
-- defensa y los del veredicto en la ejecución que lo anuncia.
create function private.luna_public_votes(game public.games, state public.luna_state)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when game.phase in ('day', 'defense')
      or (game.phase in ('execution', 'hunter') and state.announcement ->> 'kind' = 'trial')
    then (
      select jsonb_build_object(
        'kind', shown.kind,
        'votes', coalesce(jsonb_agg(
          jsonb_build_object('voter_id', v.voter_id, 'target_id', v.target_id, 'condemn', v.condemn)
          order by v.voter_id
        ) filter (where v.voter_id is not null), '[]'::jsonb)
      )
      from (select case game.phase when 'day' then 'mayor' when 'defense' then 'accuse' else 'verdict' end as kind) shown
      left join public.luna_votes v on v.game_id = game.id and v.day = state.day and v.kind = shown.kind
      group by shown.kind
      having game.phase <> 'day' or count(v.voter_id) > 0
    )
  end;
$$;

-- Lo que lee el narrador: una clave del guion y sus datos públicos. En los anuncios, `lover`
-- es quien ha muerto de pena, para que el narrador lo cuente detrás.
create function private.luna_narration(game public.games, state public.luna_state)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  deaths jsonb := coalesce(state.announcement -> 'deaths', '[]'::jsonb);
  shot jsonb;
  shot_at bigint := 0;
  first_death jsonb := deaths -> 0;
  lover jsonb;
  params jsonb := '{}'::jsonb;
  key text;
begin
  if game.phase in ('dawn', 'execution') then
    select e.d, e.o into shot, shot_at
    from jsonb_array_elements(deaths) with ordinality e(d, o)
    where e.d ->> 'cause' = 'hunter';
    -- Tras un disparo se cuenta la muerte por amor que ha causado, no una anterior.
    select jsonb_build_object('name', e.d ->> 'name', 'role', e.d ->> 'role') into lover
    from jsonb_array_elements(deaths) with ordinality e(d, o)
    where e.d ->> 'cause' = 'heartbreak' and e.o > coalesce(shot_at, 0)
    order by e.o desc
    limit 1;

    if shot is not null then
      key := 'hunter_shot';
      params := jsonb_build_object('name', shot ->> 'name', 'role', shot ->> 'role');
    elsif game.phase = 'dawn' then
      key := case jsonb_array_length(deaths) when 0 then 'dawn_none' when 1 then 'dawn_death' else 'dawn_deaths' end;
      params := case jsonb_array_length(deaths)
        when 0 then '{}'::jsonb
        when 1 then jsonb_build_object('name', first_death ->> 'name', 'role', first_death ->> 'role')
        else jsonb_build_object('names', (select jsonb_agg(d -> 'name') from jsonb_array_elements(deaths) d))
      end;
    elsif state.announcement ->> 'kind' = 'left' then
      key := 'left';
      params := jsonb_build_object('name', first_death ->> 'name', 'role', first_death ->> 'role');
    elsif first_death is not null then
      key := 'executed';
      params := jsonb_build_object('name', first_death ->> 'name', 'role', first_death ->> 'role');
    else
      key := 'spared';
      params := jsonb_build_object('name', state.announcement ->> 'spared');
    end if;

    if lover is not null then
      params := params || jsonb_build_object('lover', lover);
    end if;
    return jsonb_build_object('key', key, 'params', params);
  end if;

  return case game.phase
    when 'roles' then jsonb_build_object('key', 'roles', 'params', '{}'::jsonb)
    when 'night' then jsonb_build_object(
      'key', case when state.night = 1 then 'night_first' else 'night' end,
      'params', '{}'::jsonb
    )
    when 'hunter' then jsonb_build_object('key', 'hunter', 'params', (
      select jsonb_build_object('name', gp.name)
      from public.game_players gp
      join public.game_roles gr on gr.game_id = gp.game_id and gr.user_id = gp.user_id
      where gp.game_id = game.id and gr.role = 'hunter'
    ))
    when 'mayor' then jsonb_build_object('key', 'mayor', 'params', '{}'::jsonb)
    when 'day' then jsonb_build_object('key', 'day', 'params', coalesce((
      select jsonb_build_object('mayor', gp.name)
      from public.game_players gp
      where gp.game_id = game.id
        and gp.user_id = state.mayor_id
        and exists (
          select 1 from public.luna_votes v
          where v.game_id = game.id and v.day = state.day and v.kind = 'mayor'
        )
    ), '{}'::jsonb))
    when 'voting' then jsonb_build_object('key', 'voting', 'params', '{}'::jsonb)
    when 'defense' then case
      when state.accused_id is null then jsonb_build_object('key', 'no_accused', 'params', '{}'::jsonb)
      else jsonb_build_object('key', 'defense', 'params', (
        select jsonb_build_object('name', gp.name)
        from public.game_players gp
        where gp.game_id = game.id and gp.user_id = state.accused_id
      ))
    end
    when 'verdict' then jsonb_build_object('key', 'verdict', 'params', '{}'::jsonb)
    when 'finished' then jsonb_build_object('key', 'win_' || state.winner, 'params', '{}'::jsonb)
  end;
end;
$$;

create function private.luna_llena_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'type', g.game_type,
    'id', g.id,
    'phase', g.phase,
    'night', s.night,
    'day', s.day,
    'mayor_id', s.mayor_id,
    'accused_id', s.accused_id,
    'config', s.config,
    'participants', private.luna_participants(g, s),
    'my', private.luna_my(g, s, uid),
    'announcement', case when g.phase in ('dawn', 'hunter', 'execution') then s.announcement end,
    'public_votes', private.luna_public_votes(g, s),
    'narration', private.luna_narration(g, s),
    'spectator', case when g.phase <> 'finished' and me.user_id is not null and not me.alive then jsonb_build_object(
      'roles', private.luna_roles(g.id),
      'lovers', private.luna_lovers(s),
      'actions', (
        select coalesce(jsonb_agg(
          jsonb_build_object('user_id', a.user_id, 'target_id', a.target_id, 'target2_id', a.target2_id)
          order by a.user_id
        ), '[]'::jsonb)
        from public.luna_night_actions a
        where a.game_id = g.id and a.night = s.night
      )
    ) end,
    'result', case when g.phase = 'finished' then jsonb_build_object(
      'winner', s.winner,
      'roles', private.luna_roles(g.id),
      'lovers', private.luna_lovers(s)
    ) end
  )
  from public.games g
  join public.luna_state s on s.game_id = g.id
  left join public.game_players me on me.game_id = g.id and me.user_id = uid
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
  end
  from public.games g
  where g.id = target_game_id;
$$;

revoke execute on function
  private.luna_has_acted(public.games, public.luna_state, uuid),
  private.luna_participants(public.games, public.luna_state),
  private.luna_roles(uuid),
  private.luna_lovers(public.luna_state),
  private.luna_my(public.games, public.luna_state, uuid),
  private.luna_public_votes(public.games, public.luna_state),
  private.luna_narration(public.games, public.luna_state),
  private.luna_llena_state(uuid, uuid)
from public, anon, authenticated;

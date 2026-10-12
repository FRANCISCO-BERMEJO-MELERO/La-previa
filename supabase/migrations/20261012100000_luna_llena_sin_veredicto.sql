-- Luna llena sin veredicto (DECISIONES 2026-10-12): se quita la segunda votación del juicio. El
-- más votado en la acusación tiene sus últimas palabras en la defensa y, al continuar, el
-- narrador lo ahorca. La ejecución enseña quién votó a quién en la acusación.

drop function public.luna_llena_verdict(uuid, boolean);
drop function private.luna_cast_vote(public.games, uuid, uuid, boolean);

delete from public.luna_votes v where v.kind = 'verdict';
alter table public.luna_votes drop column condemn;
alter table public.luna_votes alter column target_id set not null;
alter table public.luna_votes drop constraint luna_votes_kind_check;
alter table public.luna_votes add constraint luna_votes_kind_check check (kind in ('mayor', 'accuse'));

update public.games g set phase = 'defense' where g.game_type = 'luna_llena' and g.phase = 'verdict';
alter table public.games drop constraint games_phase_check;
alter table public.games add constraint games_phase_check check (
  case game_type
    when 'impostor' then phase in ('talking', 'voting', 'reveal', 'finished')
    when 'probable' then phase in ('voting', 'reveal', 'finished')
    when 'quien_lo_dijo' then phase in ('writing', 'voting', 'reveal', 'finished')
    when 'una_pista' then phase in ('writing', 'review', 'guessing', 'reveal', 'finished')
    when 'que_prefieres' then phase in ('voting', 'reveal', 'finished')
    when 'palabras_prohibidas' then phase in ('describing', 'reveal', 'finished')
    when 'luna_llena' then phase in (
      'roles', 'night', 'dawn', 'hunter', 'mayor', 'day', 'voting', 'defense', 'execution',
      'finished'
    )
  end
);

-- Votaciones ---------------------------------------------------------------------------------

create or replace function private.luna_vote_kind(phase text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case phase when 'mayor' then 'mayor' when 'voting' then 'accuse' end;
$$;

create or replace function private.luna_all_voted(game public.games)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1
    from public.game_players gp
    join public.luna_state s on s.game_id = gp.game_id
    where gp.game_id = game.id
      and gp.alive
      and not exists (
        select 1 from public.luna_votes v
        where v.game_id = gp.game_id
          and v.day = s.day
          and v.kind = private.luna_vote_kind(game.phase)
          and v.voter_id = gp.user_id
      )
  );
$$;

create or replace function private.luna_close_vote(game public.games)
returns void
language plpgsql
set search_path = ''
as $$
declare
  state public.luna_state;
  chosen uuid;
begin
  select s.* into state from public.luna_state s where s.game_id = game.id;

  if game.phase = 'mayor' then
    -- El más votado; con empate, o si nadie ha votado, al azar entre los empatados.
    select gp.user_id into chosen
    from public.game_players gp
    left join public.luna_votes v
      on v.game_id = gp.game_id and v.day = state.day and v.kind = 'mayor' and v.target_id = gp.user_id
    where gp.game_id = game.id and gp.alive
    group by gp.user_id
    order by count(v.voter_id) desc, random()
    limit 1;

    update public.luna_state s set mayor_id = chosen where s.game_id = game.id;
    update public.games g set phase = 'day' where g.id = game.id;
  else
    -- Acusado: el único más votado, contando doble al alcalde. Con empate o sin votos, nadie.
    with tally as (
      select v.target_id, sum(case when v.voter_id = state.mayor_id then 2 else 1 end) as weight
      from public.luna_votes v
      where v.game_id = game.id and v.day = state.day and v.kind = 'accuse'
      group by v.target_id
    )
    select t.target_id into chosen
    from tally t
    where t.weight = (select max(weight) from tally)
      and (select count(*) from tally where weight = (select max(weight) from tally)) = 1;

    update public.luna_state s set accused_id = chosen where s.game_id = game.id;
    update public.games g set phase = 'defense' where g.id = game.id;
  end if;
end;
$$;

create function private.luna_cast_vote(game public.games, uid uuid, target_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  state public.luna_state;
  vote_kind text := private.luna_vote_kind(game.phase);
begin
  select s.* into state from public.luna_state s where s.game_id = game.id;

  if exists (
    select 1 from public.luna_votes v
    where v.game_id = game.id and v.day = state.day and v.kind = vote_kind and v.voter_id = uid
  ) then
    perform private.raise_error('already_voted');
  end if;

  insert into public.luna_votes (game_id, day, kind, voter_id, target_id)
  values (game.id, state.day, vote_kind, uid, luna_cast_vote.target_id);

  if private.luna_all_voted(game) then
    perform private.luna_close_vote(game);
  end if;
end;
$$;

create or replace function public.luna_llena_vote(room_id uuid, target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_vote.room_id);
  game public.games := private.current_game(room);
begin
  if game.id is null or game.game_type <> 'luna_llena' or game.phase not in ('mayor', 'voting') then
    perform private.raise_error('invalid_phase');
  end if;
  perform private.luna_require_alive(game, uid);

  -- Para alcalde vale cualquier vivo, uno mismo incluido; para acusar, otro vivo.
  if not private.luna_is_alive(game.id, luna_llena_vote.target_id)
    or (game.phase = 'voting' and luna_llena_vote.target_id = uid)
  then
    perform private.raise_error('invalid_target');
  end if;

  perform private.luna_cast_vote(game, uid, luna_llena_vote.target_id);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create or replace function public.luna_llena_close_vote(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_close_vote.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.current_game(room);
  if game.id is null or game.game_type <> 'luna_llena' or game.phase not in ('mayor', 'voting') then
    perform private.raise_error('invalid_phase');
  end if;

  perform private.luna_close_vote(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Ahorcar ------------------------------------------------------------------------------------

-- El acusado sube a la horca. Si es el bufón, gana él solo.
create function private.luna_hang(game public.games)
returns void
language plpgsql
set search_path = ''
as $$
declare
  accused uuid := (select s.accused_id from public.luna_state s where s.game_id = game.id);
begin
  perform private.luna_new_announcement(game.id, 'trial');
  if private.luna_role(game.id, accused) = 'jester' then
    update public.luna_state s set winner = 'jester' where s.game_id = game.id;
  end if;
  perform private.luna_kill(game.id, accused, 'hanged');
  update public.games g set phase = 'execution' where g.id = game.id;
end;
$$;

create or replace function public.luna_llena_continue(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_continue.room_id);
  game public.games;
  state public.luna_state;
begin
  perform private.require_host(room, uid);
  game := private.current_game(room);

  if game.id is null
    or game.game_type <> 'luna_llena'
    or game.phase not in ('roles', 'dawn', 'day', 'defense', 'execution')
  then
    perform private.raise_error('invalid_phase');
  end if;

  select s.* into state from public.luna_state s where s.game_id = game.id;

  case game.phase
    when 'roles' then
      perform private.luna_open_night(game, 1);
    when 'day' then
      update public.games g set phase = 'voting' where g.id = game.id;
    when 'defense' then
      if state.accused_id is null then
        perform private.luna_open_night(game, state.night + 1);
      else
        perform private.luna_hang(game);
      end if;
    else
      perform private.luna_after_announcement(game);
  end case;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Abandono ------------------------------------------------------------------------------------

create or replace function private.luna_departure(game public.games, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  state public.luna_state;
  resume text;
begin
  if game.phase = 'finished' then
    return;
  end if;
  select s.* into state from public.luna_state s where s.game_id = game.id;

  -- Quien no juega o ya está muerto no cambia la partida, salvo el cazador que aún no ha disparado.
  if not private.luna_is_alive(game.id, target_user_id) then
    if state.hunter_pending and private.luna_role(game.id, target_user_id) = 'hunter' then
      if game.phase = 'hunter' then
        perform private.luna_end_hunter(game);
      else
        update public.luna_state s set hunter_pending = false where s.game_id = game.id;
      end if;
    end if;
    return;
  end if;

  resume := case
    when game.phase in ('roles', 'night') then 'night'
    when game.phase = 'execution' or (game.phase = 'hunter' and state.return_phase = 'execution') then 'next_night'
    else 'day'
  end;

  -- Se cancelan las votaciones del día que aún no han terminado.
  if resume = 'day' then
    delete from public.luna_votes v
    where v.game_id = game.id
      and v.day = state.day
      and (v.kind = 'accuse' or (v.kind = 'mayor' and game.phase = 'mayor'));
  end if;

  update public.luna_state s set accused_id = null, return_phase = null where s.game_id = game.id;
  perform private.luna_new_announcement(game.id, 'left');
  update public.luna_state s set announcement = s.announcement || jsonb_build_object('resume', resume)
  where s.game_id = game.id;
  perform private.luna_kill(game.id, target_user_id, 'left');
  update public.games g set phase = 'execution' where g.id = game.id;
end;
$$;

-- Foto ------------------------------------------------------------------------------------------

create or replace function private.luna_has_acted(game public.games, state public.luna_state, target_user_id uuid)
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
    when game.phase in ('mayor', 'voting') then exists (
      select 1 from public.luna_votes v
      where v.game_id = game.id
        and v.day = state.day
        and v.kind = private.luna_vote_kind(game.phase)
        and v.voter_id = target_user_id
    )
    else false
  end;
$$;

create or replace function private.luna_my(game public.games, state public.luna_state, uid uuid)
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
    'vote', case when game.phase in ('mayor', 'voting') then (
      select jsonb_build_object('target_id', v.target_id)
      from public.luna_votes v
      where v.game_id = game.id
        and v.day = state.day
        and v.kind = private.luna_vote_kind(game.phase)
        and v.voter_id = uid
    ) end
  )
  from (select 1) one
  left join public.game_players me on me.game_id = game.id and me.user_id = uid
  left join public.game_roles mine on mine.game_id = game.id and mine.user_id = uid;
$$;

-- Votos ya cerrados: los del alcalde durante el día en que se eligió y los de la acusación en la
-- defensa y en la ejecución que la cierra.
create or replace function private.luna_public_votes(game public.games, state public.luna_state)
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
          jsonb_build_object('voter_id', v.voter_id, 'target_id', v.target_id)
          order by v.voter_id
        ) filter (where v.voter_id is not null), '[]'::jsonb)
      )
      from (select case game.phase when 'day' then 'mayor' else 'accuse' end as kind) shown
      left join public.luna_votes v on v.game_id = game.id and v.day = state.day and v.kind = shown.kind
      group by shown.kind
      having game.phase <> 'day' or count(v.voter_id) > 0
    )
  end;
$$;

-- Lo que lee el narrador: una clave del guion y sus datos públicos. En los anuncios, `lover`
-- es quien ha muerto de pena, para que el narrador lo cuente detrás.
create or replace function private.luna_narration(game public.games, state public.luna_state)
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
    else
      key := 'executed';
      params := jsonb_build_object('name', first_death ->> 'name', 'role', first_death ->> 'role');
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
    when 'finished' then jsonb_build_object('key', 'win_' || state.winner, 'params', '{}'::jsonb)
  end;
end;
$$;

revoke execute on function
  private.luna_cast_vote(public.games, uuid, uuid),
  private.luna_hang(public.games)
from public, anon, authenticated;

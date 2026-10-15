-- Avanzar la partida de Luna llena (docs/PLAN-5.md §3): el narrador continúa desde el reparto, los
-- anuncios, el debate y la defensa. Tras cada anuncio dispara el cazador si ha caído y se comprueba
-- si alguien ha ganado.

-- Bando ganador, si lo hay, en el orden del plan: bufón ahorcado, pueblo sin lobos y lobos en
-- paridad. El bufón cuenta como "no lobo".
create function private.luna_winner(game public.games)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when s.winner = 'jester' then 'jester'
    when alive.wolves = 0 then 'village'
    when alive.wolves >= alive.others then 'wolves'
  end
  from public.luna_state s
  cross join lateral (
    select
      count(*) filter (where gr.role = 'wolf') as wolves,
      count(*) filter (where gr.role <> 'wolf') as others
    from public.game_players gp
    join public.game_roles gr on gr.game_id = gp.game_id and gr.user_id = gp.user_id
    where gp.game_id = game.id and gp.alive
  ) alive
  where s.game_id = game.id;
$$;

-- Abre la noche dada. Si es la que estaba en curso, empieza desde cero.
create function private.luna_open_night(game public.games, night integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.luna_night_actions a where a.game_id = game.id and a.night = luna_open_night.night;
  update public.luna_state s set night = luna_open_night.night, accused_id = null where s.game_id = game.id;
  update public.games g set phase = 'night' where g.id = game.id;
end;
$$;

-- Empieza el día: si no hay alcalde vivo, se elige uno antes del debate.
create function private.luna_open_day(game public.games)
returns void
language plpgsql
set search_path = ''
as $$
declare
  state public.luna_state;
begin
  update public.luna_state s set accused_id = null where s.game_id = game.id returning s.* into state;
  update public.games g
  set phase = case when private.luna_is_alive(game.id, state.mayor_id) then 'day' else 'mayor' end
  where g.id = game.id;
end;
$$;

-- Tras un anuncio: primero el disparo pendiente del cazador, después la victoria y, si nadie ha
-- ganado, lo que toque.
create function private.luna_after_announcement(game public.games)
returns void
language plpgsql
set search_path = ''
as $$
declare
  state public.luna_state;
  won text := private.luna_winner(game);
  resume text;
begin
  select s.* into state from public.luna_state s where s.game_id = game.id;

  if state.hunter_pending then
    update public.luna_state s set return_phase = game.phase where s.game_id = game.id;
    update public.games g set phase = 'hunter' where g.id = game.id;
    return;
  end if;

  if won is not null then
    update public.luna_state s set winner = won where s.game_id = game.id;
    update public.games g set phase = 'finished', finished_at = now() where g.id = game.id;
    return;
  end if;

  resume := case
    when game.phase = 'dawn' then 'day'
    when state.announcement ->> 'kind' = 'left' then state.announcement ->> 'resume'
    else 'next_night'
  end;

  case resume
    when 'day' then perform private.luna_open_day(game);
    when 'night' then perform private.luna_open_night(game, greatest(state.night, 1));
    else perform private.luna_open_night(game, state.night + 1);
  end case;
end;
$$;

create function public.luna_llena_continue(room_id uuid)
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
        update public.games g set phase = 'verdict' where g.id = game.id;
      end if;
    else
      perform private.luna_after_announcement(game);
  end case;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Vuelve de la fase del cazador a la del anuncio que la abrió.
create function private.luna_end_hunter(game public.games)
returns void
language plpgsql
set search_path = ''
as $$
declare
  back text;
begin
  select s.return_phase into back from public.luna_state s where s.game_id = game.id;
  update public.luna_state s set hunter_pending = false, return_phase = null where s.game_id = game.id;
  update public.games g set phase = back where g.id = game.id;
end;
$$;

create function public.luna_llena_hunter_shot(room_id uuid, target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_hunter_shot.room_id);
  game public.games := private.require_game(room, 'luna_llena', 'hunter');
begin
  if private.luna_role(game.id, uid) is distinct from 'hunter' or private.luna_is_alive(game.id, uid) then
    perform private.raise_error('not_hunter');
  end if;

  if not private.luna_is_alive(game.id, luna_llena_hunter_shot.target_id) then
    perform private.raise_error('invalid_target');
  end if;

  perform private.luna_end_hunter(game);
  perform private.luna_kill(game.id, luna_llena_hunter_shot.target_id, 'hunter');

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.luna_llena_skip_hunter(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_skip_hunter.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'luna_llena', 'hunter');
  perform private.luna_end_hunter(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function
  private.luna_winner(public.games),
  private.luna_open_night(public.games, integer),
  private.luna_open_day(public.games),
  private.luna_after_announcement(public.games),
  private.luna_end_hunter(public.games)
from public, anon, authenticated;

revoke execute on function
  public.luna_llena_continue(uuid),
  public.luna_llena_hunter_shot(uuid, uuid),
  public.luna_llena_skip_hunter(uuid)
from public, anon;

grant execute on function
  public.luna_llena_continue(uuid),
  public.luna_llena_hunter_shot(uuid, uuid),
  public.luna_llena_skip_hunter(uuid)
to authenticated;

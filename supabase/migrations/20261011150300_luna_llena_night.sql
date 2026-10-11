-- La noche de Luna llena (docs/PLAN-5.md §3, "La noche"): todos los vivos actúan, y al actuar el
-- último, o al forzarlo el narrador, se resuelve en este orden: enamorados (primera noche),
-- víctima de los lobos, protección, muerte de la víctima y muerte por amor.

create function private.luna_role(target_game_id uuid, target_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select gr.role from public.game_roles gr
  where gr.game_id = target_game_id and gr.user_id = target_user_id;
$$;

create function private.luna_is_alive(target_game_id uuid, target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select gp.alive from public.game_players gp
    where gp.game_id = target_game_id and gp.user_id = target_user_id
  ), false);
$$;

-- Quien llama, si juega y está vivo.
create function private.luna_require_alive(game public.games, uid uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not exists (select 1 from public.game_players gp where gp.game_id = game.id and gp.user_id = uid) then
    perform private.raise_error('not_participant');
  end if;
  if not private.luna_is_alive(game.id, uid) then
    perform private.raise_error('not_alive');
  end if;
end;
$$;

-- Mata a un jugador vivo, lo añade al anuncio en curso y arrastra a su pareja. Si es el cazador
-- y no se ha ido de la sala, queda pendiente su disparo.
create function private.luna_kill(target_game_id uuid, target_user_id uuid, cause text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  victim public.game_players;
  victim_role text := private.luna_role(target_game_id, target_user_id);
  partner uuid;
begin
  update public.game_players gp set alive = false
  where gp.game_id = target_game_id and gp.user_id = target_user_id and gp.alive
  returning gp.* into victim;
  if not found then
    return;
  end if;

  update public.luna_state s
  set announcement = jsonb_set(
        s.announcement,
        '{deaths}',
        (s.announcement -> 'deaths') || jsonb_build_array(jsonb_build_object(
          'user_id', victim.user_id,
          'name', victim.name,
          'role', victim_role,
          'cause', cause
        ))
      ),
      hunter_pending = s.hunter_pending or (victim_role = 'hunter' and cause <> 'left')
  where s.game_id = target_game_id
  returning case
    when s.lover_a = target_user_id then s.lover_b
    when s.lover_b = target_user_id then s.lover_a
  end into partner;

  if partner is not null then
    perform private.luna_kill(target_game_id, partner, 'heartbreak');
  end if;
end;
$$;

-- Empieza un anuncio vacío del tipo dado: night, trial o left.
create function private.luna_new_announcement(target_game_id uuid, kind text)
returns void
language sql
set search_path = ''
as $$
  update public.luna_state s
  set announcement = jsonb_build_object('kind', kind, 'deaths', '[]'::jsonb, 'spared', null)
  where s.game_id = target_game_id;
$$;

-- ¿Han actuado ya todos los vivos esta noche?
create function private.luna_all_acted(game public.games)
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
        select 1 from public.luna_night_actions a
        where a.game_id = gp.game_id and a.night = s.night and a.user_id = gp.user_id
      )
  );
$$;

create function private.luna_resolve_night(game public.games)
returns void
language plpgsql
set search_path = ''
as $$
declare
  state public.luna_state;
  pair public.luna_night_actions;
  victim uuid;
  protected uuid;
begin
  select s.* into state from public.luna_state s where s.game_id = game.id;
  perform private.luna_new_announcement(game.id, 'night');

  if state.night = 1 then
    select a.* into pair
    from public.luna_night_actions a
    join public.game_roles gr on gr.game_id = a.game_id and gr.user_id = a.user_id
    where a.game_id = game.id and a.night = 1 and gr.role = 'cupid' and a.target2_id is not null;
    if found then
      update public.luna_state s set lover_a = pair.target_id, lover_b = pair.target2_id
      where s.game_id = game.id;
    end if;
  end if;

  -- Muere el más marcado por los lobos; con empate, uno de los empatados al azar.
  select a.target_id into victim
  from public.luna_night_actions a
  join public.game_roles gr on gr.game_id = a.game_id and gr.user_id = a.user_id
  where a.game_id = game.id and a.night = state.night and gr.role = 'wolf'
  group by a.target_id
  order by count(*) desc, random()
  limit 1;

  select a.target_id into protected
  from public.luna_night_actions a
  join public.game_roles gr on gr.game_id = a.game_id and gr.user_id = a.user_id
  where a.game_id = game.id and a.night = state.night and gr.role = 'protector';

  update public.luna_state s set last_protected_id = protected, day = s.day + 1
  where s.game_id = game.id;

  if victim is not null and victim is distinct from protected then
    perform private.luna_kill(game.id, victim, 'wolves');
  end if;

  update public.games g set phase = 'dawn' where g.id = game.id;
end;
$$;

create function public.luna_llena_night_action(room_id uuid, target_id uuid, target2_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_night_action.room_id);
  game public.games := private.require_game(room, 'luna_llena', 'night');
  state public.luna_state;
  my_role text;
  target uuid := luna_llena_night_action.target_id;
  target2 uuid := luna_llena_night_action.target2_id;
  pairs boolean;
begin
  perform private.luna_require_alive(game, uid);
  select s.* into state from public.luna_state s where s.game_id = game.id;
  my_role := private.luna_role(game.id, uid);
  pairs := my_role = 'cupid' and state.night = 1;

  -- Salvo la marca de los lobos, una acción enviada no se cambia.
  if my_role <> 'wolf' and exists (
    select 1 from public.luna_night_actions a
    where a.game_id = game.id and a.night = state.night and a.user_id = uid
  ) then
    perform private.raise_error('already_acted');
  end if;

  if not private.luna_is_alive(game.id, target)
    or (target2 is not null and not pairs)
    or (pairs and (target2 is null or target2 = target or not private.luna_is_alive(game.id, target2)))
    or (my_role = 'wolf' and private.luna_role(game.id, target) = 'wolf')
    or (my_role not in ('wolf', 'protector') and not pairs and target = uid)
  then
    perform private.raise_error('invalid_target');
  end if;

  if my_role = 'protector' and target = state.last_protected_id then
    perform private.raise_error('same_as_last_night');
  end if;

  insert into public.luna_night_actions (game_id, night, user_id, target_id, target2_id)
  values (game.id, state.night, uid, target, target2)
  on conflict (game_id, night, user_id) do update set target_id = excluded.target_id;

  if private.luna_all_acted(game) then
    perform private.luna_resolve_night(game);
  end if;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.luna_llena_close_night(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_close_night.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'luna_llena', 'night');
  perform private.luna_resolve_night(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function
  private.luna_role(uuid, uuid),
  private.luna_is_alive(uuid, uuid),
  private.luna_require_alive(public.games, uuid),
  private.luna_kill(uuid, uuid, text),
  private.luna_new_announcement(uuid, text),
  private.luna_all_acted(public.games),
  private.luna_resolve_night(public.games)
from public, anon, authenticated;

revoke execute on function
  public.luna_llena_night_action(uuid, uuid, uuid),
  public.luna_llena_close_night(uuid)
from public, anon;

grant execute on function
  public.luna_llena_night_action(uuid, uuid, uuid),
  public.luna_llena_close_night(uuid)
to authenticated;

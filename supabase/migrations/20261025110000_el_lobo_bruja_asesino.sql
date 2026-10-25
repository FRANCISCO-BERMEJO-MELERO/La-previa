-- Bruja y asesino en serie (docs/PLAN-6.md §2 a §7). La bruja tiene dos pociones de un solo uso
-- en toda la partida y actúa con su propia función; el asesino mata cada noche con la acción de
-- siempre y gana si queda solo. La causa real de una muerte nocturna no sale de la base de datos
-- salvo para los muertos.

alter table public.luna_state
  add column witch_life_used boolean not null default false,
  add column witch_poison_used boolean not null default false,
  -- Lo que han hecho las pociones la última noche: a quién salvó y a quién envenenó.
  add column witch_report jsonb;

alter table public.luna_state drop constraint luna_state_winner_check;
alter table public.luna_state add constraint luna_state_winner_check
  check (winner in ('village', 'wolves', 'jester', 'killer'));

-- La acción de la bruja lleva la poción de vida en use_life y la de muerte en target_id, que puede
-- faltar. El resto de acciones siempre tienen objetivo y no usan use_life.
alter table public.luna_night_actions alter column target_id drop not null;
alter table public.luna_night_actions add column use_life boolean;
alter table public.luna_night_actions add constraint luna_night_actions_target_check
  check (target_id is not null or use_life is not null);

-- Muertes ------------------------------------------------------------------------------------

-- Mata a un jugador vivo y lo añade al anuncio en curso, sin arrastrar a su pareja. Si es el
-- cazador y no se ha ido de la sala, queda pendiente su disparo. Dice si lo ha matado.
create function private.luna_mark_dead(target_game_id uuid, target_user_id uuid, cause text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  victim public.game_players;
  victim_role text := private.luna_role(target_game_id, target_user_id);
begin
  update public.game_players gp set alive = false
  where gp.game_id = target_game_id and gp.user_id = target_user_id and gp.alive
  returning gp.* into victim;
  if not found then
    return false;
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
  where s.game_id = target_game_id;
  return true;
end;
$$;

-- Si el muerto tenía pareja, muere de pena.
create function private.luna_heartbreak(target_game_id uuid, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  partner uuid := (
    select case
      when s.lover_a = target_user_id then s.lover_b
      when s.lover_b = target_user_id then s.lover_a
    end
    from public.luna_state s
    where s.game_id = target_game_id
  );
begin
  if partner is not null then
    perform private.luna_kill(target_game_id, partner, 'heartbreak');
  end if;
end;
$$;

create or replace function private.luna_kill(target_game_id uuid, target_user_id uuid, cause text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if private.luna_mark_dead(target_game_id, target_user_id, cause) then
    perform private.luna_heartbreak(target_game_id, target_user_id);
  end if;
end;
$$;

-- Noche --------------------------------------------------------------------------------------

-- A quién van a devorar los lobos ahora mismo: el más marcado, si no hay empate.
create function private.luna_leading_wolf_target(target_game_id uuid, target_night integer)
returns uuid
language sql
stable
set search_path = ''
as $$
  with marks as (
    select a.target_id, count(*) as n
    from public.luna_night_actions a
    join public.game_roles gr on gr.game_id = a.game_id and gr.user_id = a.user_id
    where a.game_id = target_game_id and a.night = target_night and gr.role = 'wolf'
    group by a.target_id
  )
  select m.target_id
  from marks m
  where m.n = (select max(n) from marks)
    and (select count(*) from marks where n = (select max(n) from marks)) = 1;
$$;

-- El objetivo de quien tenga este rol esta noche.
create function private.luna_role_target(target_game_id uuid, target_night integer, target_role text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select a.target_id
  from public.luna_night_actions a
  join public.game_roles gr on gr.game_id = a.game_id and gr.user_id = a.user_id
  where a.game_id = target_game_id and a.night = target_night and gr.role = target_role;
$$;

-- Se resuelve en el orden de docs/PLAN-6.md §4: enamorados, lobos, asesino, protección, poción
-- de vida, poción de muerte, muertes y muertes por amor.
create or replace function private.luna_resolve_night(game public.games)
returns void
language plpgsql
set search_path = ''
as $$
declare
  state public.luna_state;
  pair public.luna_night_actions;
  witch public.luna_night_actions;
  wolf_victim uuid;
  killer_victim uuid;
  protected uuid;
  saved uuid;
  poisoned uuid;
  dead record;
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
  select a.target_id into wolf_victim
  from public.luna_night_actions a
  join public.game_roles gr on gr.game_id = a.game_id and gr.user_id = a.user_id
  where a.game_id = game.id and a.night = state.night and gr.role = 'wolf'
  group by a.target_id
  order by count(*) desc, random()
  limit 1;

  killer_victim := private.luna_role_target(game.id, state.night, 'killer');
  protected := private.luna_role_target(game.id, state.night, 'protector');

  -- Sin pociones, la bruja solo sospecha: su acción no lleva use_life.
  select a.* into witch
  from public.luna_night_actions a
  join public.game_roles gr on gr.game_id = a.game_id and gr.user_id = a.user_id
  where a.game_id = game.id and a.night = state.night and gr.role = 'witch' and a.use_life is not null;

  if wolf_victim = protected then
    wolf_victim := null;
  end if;
  if killer_victim = protected then
    killer_victim := null;
  end if;
  if witch.use_life and wolf_victim is not null then
    saved := wolf_victim;
    wolf_victim := null;
  end if;
  poisoned := witch.target_id;

  update public.luna_state s
  set last_protected_id = protected,
      day = s.day + 1,
      witch_life_used = s.witch_life_used or saved is not null,
      witch_poison_used = s.witch_poison_used or poisoned is not null,
      witch_report = case
        when saved is not null or poisoned is not null
        then jsonb_build_object('saved_id', saved, 'poisoned_id', poisoned)
      end
  where s.game_id = game.id;

  -- Mueren todos a la vez y, después, sus parejas. Si dos ataques coinciden, muere una vez. El
  -- orden del anuncio es al azar para que no delate quién ha matado a quién.
  for dead in
    select victims.user_id, victims.cause
    from (
      select distinct on (d.user_id) d.user_id, d.cause
      from (values (wolf_victim, 'wolves', 1), (killer_victim, 'killer', 2), (poisoned, 'poison', 3))
        d(user_id, cause, priority)
      where d.user_id is not null
      order by d.user_id, d.priority
    ) victims
    order by random()
  loop
    perform private.luna_mark_dead(game.id, dead.user_id, dead.cause);
  end loop;

  for dead in
    select d.user_id
    from (values (wolf_victim), (killer_victim), (poisoned)) d(user_id)
    where d.user_id is not null
  loop
    perform private.luna_heartbreak(game.id, dead.user_id);
  end loop;

  update public.games g set phase = 'dawn' where g.id = game.id;
end;
$$;

-- La bruja: poción de vida (sí o no) y poción de muerte (a alguien o a nadie). No usar nada
-- también cuenta como haber actuado. Las pociones se gastan al resolver la noche.
create function public.luna_llena_witch_action(room_id uuid, use_life boolean, poison_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_witch_action.room_id);
  game public.games := private.require_game(room, 'luna_llena', 'night');
  state public.luna_state;
  life boolean := coalesce(luna_llena_witch_action.use_life, false);
  poison uuid := luna_llena_witch_action.poison_target_id;
begin
  perform private.luna_require_alive(game, uid);
  if private.luna_role(game.id, uid) is distinct from 'witch' then
    perform private.raise_error('not_witch');
  end if;

  select s.* into state from public.luna_state s where s.game_id = game.id;

  if exists (
    select 1 from public.luna_night_actions a
    where a.game_id = game.id and a.night = state.night and a.user_id = uid
  ) then
    perform private.raise_error('already_acted');
  end if;

  if (life and state.witch_life_used) or (poison is not null and state.witch_poison_used) then
    perform private.raise_error('potion_used');
  end if;

  if poison is not null and (poison = uid or not private.luna_is_alive(game.id, poison)) then
    perform private.raise_error('invalid_target');
  end if;

  insert into public.luna_night_actions (game_id, night, user_id, target_id, use_life)
  values (game.id, state.night, uid, poison, life);

  if private.luna_all_acted(game) then
    perform private.luna_resolve_night(game);
  end if;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Victoria -----------------------------------------------------------------------------------

-- En el orden de docs/PLAN-6.md §5: bufón ahorcado, asesino solo, pueblo sin lobos ni asesino y
-- lobos en paridad sin asesino. Mientras el asesino vive, ni el pueblo ni los lobos ganan.
create or replace function private.luna_winner(game public.games)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when s.winner = 'jester' then 'jester'
    when alive.killers > 0 and alive.total = 1 then 'killer'
    when alive.killers = 0 and alive.wolves = 0 then 'village'
    when alive.killers = 0 and alive.wolves >= alive.total - alive.wolves then 'wolves'
  end
  from public.luna_state s
  cross join lateral (
    select
      count(*) as total,
      count(*) filter (where gr.role = 'wolf') as wolves,
      count(*) filter (where gr.role = 'killer') as killers
    from public.game_players gp
    join public.game_roles gr on gr.game_id = gp.game_id and gr.user_id = gp.user_id
    where gp.game_id = game.id and gp.alive
  ) alive
  where s.game_id = game.id;
$$;

-- Foto ---------------------------------------------------------------------------------------

-- En una acción de la bruja con pociones, si usa la de vida. Las demás acciones no lo llevan.
create function private.luna_potion_use(action public.luna_night_actions)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when action.use_life is not null
    then jsonb_build_object('use_life', action.use_life)
    else '{}'::jsonb
  end;
$$;

-- El anuncio tal como lo ve un vivo: las muertes de la noche no dicen quién ha matado.
create function private.luna_public_announcement(announcement jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when announcement is not null then announcement || jsonb_build_object(
    'deaths', coalesce((
      select jsonb_agg(
        case when e.d ->> 'cause' in ('wolves', 'killer', 'poison')
          then e.d || '{"cause": "night"}'::jsonb
          else e.d
        end
        order by e.o
      )
      from jsonb_array_elements(announcement -> 'deaths') with ordinality e(d, o)
    ), '[]'::jsonb)
  ) end;
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
      select jsonb_build_object('target_id', a.target_id, 'target2_id', a.target2_id) || private.luna_potion_use(a)
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
    'potions', case when mine.role = 'witch' then jsonb_build_object(
      'life', not state.witch_life_used,
      'poison', not state.witch_poison_used
    ) end,
    -- La bruja ve en directo a quién van a devorar mientras pueda salvarlo.
    'wolf_victim', case
      when mine.role = 'witch' and me.alive and game.phase = 'night' and not state.witch_life_used
      then private.luna_leading_wolf_target(game.id, state.night)
    end,
    'witch_report', case
      when mine.role = 'witch' and game.phase in ('dawn', 'hunter') and state.announcement ->> 'kind' = 'night'
      then state.witch_report
    end,
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

create or replace function private.luna_llena_state(target_game_id uuid, uid uuid)
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
    'announcement', case when g.phase in ('dawn', 'hunter', 'execution') then private.luna_public_announcement(s.announcement) end,
    'public_votes', private.luna_public_votes(g, s),
    'narration', private.luna_narration(g, s),
    'spectator', case when g.phase <> 'finished' and me.user_id is not null and not me.alive then jsonb_build_object(
      'roles', private.luna_roles(g.id),
      'lovers', private.luna_lovers(s),
      'actions', (
        select coalesce(jsonb_agg(
          jsonb_build_object('user_id', a.user_id, 'target_id', a.target_id, 'target2_id', a.target2_id) || private.luna_potion_use(a)
          order by a.user_id
        ), '[]'::jsonb)
        from public.luna_night_actions a
        where a.game_id = g.id and a.night = s.night
      ),
      'causes', case when g.phase in ('dawn', 'hunter', 'execution') then (
        select coalesce(jsonb_agg(jsonb_build_object('user_id', d ->> 'user_id', 'cause', d ->> 'cause')), '[]'::jsonb)
        from jsonb_array_elements(s.announcement -> 'deaths') d
      ) end,
      'potions', case when exists (
        select 1 from public.game_roles gr where gr.game_id = g.id and gr.role = 'witch'
      ) then jsonb_build_object('life', not s.witch_life_used, 'poison', not s.witch_poison_used) end
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

revoke execute on function
  private.luna_mark_dead(uuid, uuid, text),
  private.luna_heartbreak(uuid, uuid),
  private.luna_leading_wolf_target(uuid, integer),
  private.luna_role_target(uuid, integer, text),
  private.luna_potion_use(public.luna_night_actions),
  private.luna_public_announcement(jsonb)
from public, anon, authenticated;

revoke execute on function public.luna_llena_witch_action(uuid, boolean, uuid) from public, anon;
grant execute on function public.luna_llena_witch_action(uuid, boolean, uuid) to authenticated;

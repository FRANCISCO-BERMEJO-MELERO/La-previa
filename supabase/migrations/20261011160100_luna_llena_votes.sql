-- Votaciones de Luna llena (docs/PLAN-5.md §3, "El alcalde" y "El juicio"): elegir alcalde,
-- acusar y el veredicto. Se cierran solas cuando han votado todos o cuando lo fuerza el narrador.
-- El voto del alcalde vale doble al acusar y en el veredicto.

-- Clase de voto que pide la fase.
create function private.luna_vote_kind(phase text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case phase when 'mayor' then 'mayor' when 'voting' then 'accuse' when 'verdict' then 'verdict' end;
$$;

-- ¿Han votado todos los que votan en esta fase? En el veredicto no vota el acusado.
create function private.luna_all_voted(game public.games)
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
      and gp.user_id is distinct from case when game.phase = 'verdict' then s.accused_id end
      and not exists (
        select 1 from public.luna_votes v
        where v.game_id = gp.game_id
          and v.day = s.day
          and v.kind = private.luna_vote_kind(game.phase)
          and v.voter_id = gp.user_id
      )
  );
$$;

create function private.luna_close_vote(game public.games)
returns void
language plpgsql
set search_path = ''
as $$
declare
  state public.luna_state;
  chosen uuid;
  condemn integer;
  spare integer;
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

  elsif game.phase = 'voting' then
    -- Acusado: el único más votado. Con empate o sin votos, nadie.
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

  else
    select
      coalesce(sum(case when v.voter_id = state.mayor_id then 2 else 1 end) filter (where v.condemn), 0),
      coalesce(sum(case when v.voter_id = state.mayor_id then 2 else 1 end) filter (where not v.condemn), 0)
    into condemn, spare
    from public.luna_votes v
    where v.game_id = game.id and v.day = state.day and v.kind = 'verdict';

    perform private.luna_new_announcement(game.id, 'trial');
    -- Con empate se salva.
    if condemn > spare then
      if private.luna_role(game.id, state.accused_id) = 'jester' then
        update public.luna_state s set winner = 'jester' where s.game_id = game.id;
      end if;
      perform private.luna_kill(game.id, state.accused_id, 'hanged');
    else
      update public.luna_state s
      set announcement = jsonb_set(s.announcement, '{spared}', to_jsonb((
        select gp.name from public.game_players gp
        where gp.game_id = game.id and gp.user_id = state.accused_id
      )))
      where s.game_id = game.id;
    end if;
    update public.games g set phase = 'execution' where g.id = game.id;
  end if;
end;
$$;

-- Guarda el voto de quien llama y cierra si ya han votado todos.
create function private.luna_cast_vote(game public.games, uid uuid, target_id uuid, condemn boolean)
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

  insert into public.luna_votes (game_id, day, kind, voter_id, target_id, condemn)
  values (game.id, state.day, vote_kind, uid, luna_cast_vote.target_id, luna_cast_vote.condemn);

  if private.luna_all_voted(game) then
    perform private.luna_close_vote(game);
  end if;
end;
$$;

create function public.luna_llena_vote(room_id uuid, target_id uuid)
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

  perform private.luna_cast_vote(game, uid, luna_llena_vote.target_id, null);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.luna_llena_verdict(room_id uuid, condemn boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_verdict.room_id);
  game public.games := private.require_game(room, 'luna_llena', 'verdict');
begin
  perform private.luna_require_alive(game, uid);

  if uid = (select s.accused_id from public.luna_state s where s.game_id = game.id) then
    perform private.raise_error('is_accused');
  end if;

  if luna_llena_verdict.condemn is null then
    perform private.raise_error('invalid_option');
  end if;

  perform private.luna_cast_vote(game, uid, null, luna_llena_verdict.condemn);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.luna_llena_close_vote(room_id uuid)
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
  if game.id is null or game.game_type <> 'luna_llena' or game.phase not in ('mayor', 'voting', 'verdict') then
    perform private.raise_error('invalid_phase');
  end if;

  perform private.luna_close_vote(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function
  private.luna_vote_kind(text),
  private.luna_all_voted(public.games),
  private.luna_close_vote(public.games),
  private.luna_cast_vote(public.games, uuid, uuid, boolean)
from public, anon, authenticated;

revoke execute on function
  public.luna_llena_vote(uuid, uuid),
  public.luna_llena_verdict(uuid, boolean),
  public.luna_llena_close_vote(uuid)
from public, anon;

grant execute on function
  public.luna_llena_vote(uuid, uuid),
  public.luna_llena_verdict(uuid, boolean),
  public.luna_llena_close_vote(uuid)
to authenticated;

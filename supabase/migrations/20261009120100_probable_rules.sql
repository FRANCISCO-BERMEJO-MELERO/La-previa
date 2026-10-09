-- Reglas de juego por rondas en ¿Quién es más probable que…? (docs/JUEGOS.md §2): avance
-- automático, incorporación al abrir ronda, abandono y final anticipado.

-- Al abrir cada ronda juegan todos los miembros de la sala: quien llegó tarde entra y quien se
-- fue y ha vuelto, también. Sus puntos se conservan.
create or replace function private.probable_open_round(target_game_id uuid, new_round integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
begin
  update public.games g set round = new_round, phase = 'voting'
  where g.id = target_game_id
  returning g.* into game;

  insert into public.game_players (game_id, user_id, name)
  select game.id, rp.user_id, rp.name
  from public.room_players rp
  where rp.room_id = game.room_id
  on conflict (game_id, user_id) do update set alive = true, name = excluded.name;

  insert into public.game_rounds (game_id, round, prompt_id)
  values (game.id, new_round, private.pick_prompt(game.room_id, 'probable'));
end;
$$;

-- ¿Han votado ya todos los participantes activos en la ronda en curso?
create function private.probable_all_voted(target_game_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    where gp.game_id = target_game_id
      and gp.alive
      and not exists (
        select 1 from public.votes v
        where v.game_id = g.id and v.round = g.round and v.voter_id = gp.user_id
      )
  );
$$;

create or replace function public.probable_vote(room_id uuid, target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(probable_vote.room_id);
  game public.games;
  voter public.game_players;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'probable', 'voting');

  select gp.* into voter from public.game_players gp where gp.game_id = game.id and gp.user_id = uid;
  if not found then
    perform private.raise_error('not_participant');
  end if;
  if not voter.alive then
    perform private.raise_error('not_alive');
  end if;
  if exists (
    select 1 from public.votes v
    where v.game_id = game.id and v.round = game.round and v.voter_id = uid
  ) then
    perform private.raise_error('already_voted');
  end if;

  -- Se puede votar a cualquier participante activo, también a uno mismo.
  if probable_vote.target_id is null or not exists (
    select 1 from public.game_players gp
    where gp.game_id = game.id and gp.user_id = probable_vote.target_id and gp.alive
  ) then
    perform private.raise_error('invalid_target');
  end if;

  insert into public.votes (game_id, round, voter_id, target_id)
  values (game.id, game.round, uid, probable_vote.target_id);

  if private.probable_all_voted(game.id) then
    perform private.probable_close_round(game.id);
  end if;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Quien se va deja de participar. En la votación se borran su voto y los que había recibido
-- (quien le votó vuelve a votar). Con menos de 3 activos la partida termina en el acto; si no,
-- se comprueba si ya han votado todos.
create function private.probable_departure(game public.games, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if game.phase = 'finished' then
    return;
  end if;

  update public.game_players gp set alive = false
  where gp.game_id = game.id and gp.user_id = target_user_id and gp.alive;
  if not found then
    return;
  end if;

  if game.phase = 'voting' then
    delete from public.votes v
    where v.game_id = game.id
      and v.round = game.round
      and (v.voter_id = target_user_id or v.target_id = target_user_id);
  end if;

  if (select count(*) from public.game_players gp where gp.game_id = game.id and gp.alive) < 3 then
    update public.games g set phase = 'finished', finished_at = now() where g.id = game.id;
  elsif game.phase = 'voting' and private.probable_all_voted(game.id) then
    perform private.probable_close_round(game.id);
  end if;
end;
$$;

-- El abandono de El impostor, sin cambios (docs/CONTEXTO.md §4, "Abandono a media partida").
create function private.impostor_departure(game public.games, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  leaving public.game_players;
begin
  select gp.* into leaving
  from public.game_players gp
  where gp.game_id = game.id and gp.user_id = target_user_id and gp.alive;
  -- Quien llegó tarde o ya estaba eliminado no cambia la partida.
  if not found then
    return;
  end if;

  if game.phase in ('talking', 'voting') then
    update public.game_players gp set alive = false
    where gp.game_id = game.id and gp.user_id = target_user_id;

    -- Se cancela la votación en curso.
    delete from public.votes v where v.game_id = game.id and v.round = game.round;
    update public.game_players gp set has_voted = false where gp.game_id = game.id;

    update public.games g
    set phase = 'reveal',
        outcome = jsonb_build_object(
          'type', 'left',
          'user_id', leaving.user_id,
          'name', leaving.name,
          'was_impostor', private.was_impostor(game.id, leaving.user_id)
        )
    where g.id = game.id;
  elsif game.phase = 'reveal' then
    -- La revelación en pantalla no cambia.
    update public.game_players gp set alive = false
    where gp.game_id = game.id and gp.user_id = target_user_id;
  end if;
end;
$$;

create or replace function private.handle_departure(room public.rooms, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games := private.current_game(room);
begin
  if game.id is null then
    return;
  end if;

  if game.game_type = 'impostor' then
    perform private.impostor_departure(game, target_user_id);
  else
    perform private.probable_departure(game, target_user_id);
  end if;
end;
$$;

revoke execute on function
  private.probable_all_voted(uuid),
  private.probable_departure(public.games, uuid),
  private.impostor_departure(public.games, uuid)
from public, anon, authenticated;

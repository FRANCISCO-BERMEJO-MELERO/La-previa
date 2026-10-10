-- Empezar una partida de El impostor (docs/CONTEXTO.md §3 y §4, "Acciones").

create function private.current_game(room public.rooms)
returns public.games
language sql
stable
set search_path = ''
as $$
  select g.* from public.games g where g.id = room.current_game_id;
$$;

-- Palabra al azar entre las activas, empezando por las que aún no han salido en la sala.
create function private.pick_word(target_room_id uuid)
returns bigint
language sql
volatile
set search_path = ''
as $$
  select w.id
  from public.words w
  where w.active
  order by
    exists (select 1 from public.games g where g.room_id = target_room_id and g.word_id = w.id),
    pg_catalog.gen_random_uuid()
  limit 1;
$$;

create function public.start_game(room_id uuid, impostor_count integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(start_game.room_id);
  game public.games;
  player_count integer;
  new_game_id uuid;
begin
  perform private.require_host(room, uid);

  -- Se empieza desde la sala de espera o, para volver a jugar, desde una partida terminada.
  game := private.current_game(room);
  if game.id is not null and game.phase <> 'finished' then
    perform private.raise_error('invalid_phase');
  end if;

  select count(*) into player_count from public.room_players rp where rp.room_id = room.id;
  if player_count < 3 then
    perform private.raise_error('not_enough_players');
  end if;

  if start_game.impostor_count is null
    or start_game.impostor_count < 1
    or 2 * start_game.impostor_count >= player_count then
    perform private.raise_error('invalid_impostor_count');
  end if;

  insert into public.games (room_id, impostor_count, word_id)
  values (room.id, start_game.impostor_count, private.pick_word(room.id))
  returning id into new_game_id;

  -- Participan todos los miembros, también los desconectados.
  insert into public.game_players (game_id, user_id, name)
  select new_game_id, rp.user_id, rp.name
  from public.room_players rp
  where rp.room_id = room.id;

  insert into public.game_roles (game_id, user_id, role)
  select
    new_game_id,
    shuffled.user_id,
    case when shuffled.position <= start_game.impostor_count then 'impostor' else 'player' end
  from (
    select gp.user_id, row_number() over (order by pg_catalog.gen_random_uuid()) as position
    from public.game_players gp
    where gp.game_id = new_game_id
  ) shuffled;

  update public.rooms r set current_game_id = new_game_id where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function private.current_game(public.rooms), private.pick_word(uuid)
from public, anon, authenticated;
revoke execute on function public.start_game(uuid, integer) from public, anon;
grant execute on function public.start_game(uuid, integer) to authenticated;

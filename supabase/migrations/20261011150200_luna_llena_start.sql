-- Empezar una partida de Luna llena (docs/PLAN-5.md §2 y §7): valida la composición, reparte los
-- roles al azar y abre el reparto. Sin lobos ni roles se usa la composición recomendada.

create function public.luna_llena_start(room_id uuid, wolves integer, roles text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(luna_llena_start.room_id);
  game public.games;
  players integer;
  config jsonb;
  optional text[];
  deck text[];
  new_game_id uuid;
begin
  perform private.require_host(room, uid);
  game := private.current_game(room);

  if game.id is not null and game.phase <> 'finished' then
    perform private.raise_error('invalid_phase');
  end if;

  if room.game <> 'luna_llena' then
    perform private.raise_error('invalid_game');
  end if;

  select count(*) into players from public.room_players rp where rp.room_id = room.id;
  config := private.luna_config(players, luna_llena_start.wolves, luna_llena_start.roles);
  optional := array(select jsonb_array_elements_text(config -> 'roles'));

  deck := array_fill('wolf'::text, array[(config ->> 'wolves')::integer])
    || 'seer'::text
    || optional
    || array_fill('villager'::text, array[players - (config ->> 'wolves')::integer - 1 - cardinality(optional)]);

  insert into public.games (room_id, game_type, phase)
  values (room.id, 'luna_llena', 'roles')
  returning id into new_game_id;

  insert into public.game_players (game_id, user_id, name)
  select new_game_id, rp.user_id, rp.name
  from public.room_players rp
  where rp.room_id = room.id;

  insert into public.game_roles (game_id, user_id, role)
  select new_game_id, shuffled.user_id, deck[shuffled.position]
  from (
    select rp.user_id, row_number() over (order by random()) as position
    from public.room_players rp
    where rp.room_id = room.id
  ) shuffled;

  insert into public.luna_state (game_id, config) values (new_game_id, config);

  update public.rooms r set current_game_id = new_game_id where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function public.luna_llena_start(uuid, integer, text[]) from public, anon;
grant execute on function public.luna_llena_start(uuid, integer, text[]) to authenticated;

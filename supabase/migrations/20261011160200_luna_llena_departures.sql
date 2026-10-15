-- Abandono y expulsión a media partida de Luna llena (docs/PLAN-5.md §5): quien se va muere al
-- instante, se revela su rol y se pasa a un anuncio de tipo 'left'. Después, si era de noche, la
-- noche se repite desde cero; si era de día, se vuelve al debate. Tras una ejecución, que ya cerró
-- el juicio del día, se sigue con la noche siguiente.

create function private.luna_departure(game public.games, target_user_id uuid)
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
      and (v.kind in ('accuse', 'verdict') or (v.kind = 'mayor' and game.phase = 'mayor'));
  end if;

  update public.luna_state s set accused_id = null, return_phase = null where s.game_id = game.id;
  perform private.luna_new_announcement(game.id, 'left');
  update public.luna_state s set announcement = s.announcement || jsonb_build_object('resume', resume)
  where s.game_id = game.id;
  perform private.luna_kill(game.id, target_user_id, 'left');
  update public.games g set phase = 'execution' where g.id = game.id;
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
  elsif game.game_type = 'luna_llena' then
    perform private.luna_departure(game, target_user_id);
  else
    perform private.round_departure(game, target_user_id);
  end if;
end;
$$;

revoke execute on function private.luna_departure(public.games, uuid) from public, anon, authenticated;

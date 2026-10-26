-- A dados (docs/PLAN-7.md §5): la sala y la partida admiten el juego. No es un juego por rondas:
-- no usa total_rounds, game_rounds ni votes, y guarda su estado en una tabla propia.

alter table public.rooms drop constraint rooms_game_check;
alter table public.rooms add constraint rooms_game_check check (
  game in (
    'impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas',
    'luna_llena', 'dados'
  )
);

alter table public.games drop constraint games_game_type_check;
alter table public.games add constraint games_game_type_check check (
  game_type in (
    'impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas',
    'luna_llena', 'dados'
  )
);

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
    when 'dados' then phase in ('playing', 'finished')
  end
);

alter table public.games drop constraint games_total_rounds_check;
alter table public.games add constraint games_total_rounds_check check (
  case
    when game_type in ('impostor', 'luna_llena', 'dados') then total_rounds is null
    else total_rounds is not null and total_rounds in (5, 10, 15) and round <= total_rounds
  end
);

create or replace function public.set_game(room_id uuid, game text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(set_game.room_id);
begin
  perform private.require_host(room, uid);

  if room.current_game_id is not null then
    perform private.raise_error('invalid_phase');
  end if;

  if set_game.game is null or set_game.game not in (
    'impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas',
    'luna_llena', 'dados'
  ) then
    perform private.raise_error('invalid_game');
  end if;

  update public.rooms r set game = set_game.game where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

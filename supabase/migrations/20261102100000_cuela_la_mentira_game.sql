-- Cuela la mentira (docs/PLAN-9.md §1, §2 y §5): la sala y la partida admiten el juego. Es un juego
-- por rondas, con sus fases propias.

alter table public.rooms drop constraint rooms_game_check;
alter table public.rooms add constraint rooms_game_check check (
  game in (
    'impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas',
    'luna_llena', 'dados', 'cuela_la_mentira'
  )
);

alter table public.games drop constraint games_game_type_check;
alter table public.games add constraint games_game_type_check check (
  game_type in (
    'impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas',
    'luna_llena', 'dados', 'cuela_la_mentira'
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
    when 'cuela_la_mentira' then phase in ('writing', 'voting', 'reveal', 'finished')
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
    'luna_llena', 'dados', 'cuela_la_mentira'
  ) then
    perform private.raise_error('invalid_game');
  end if;

  update public.rooms r set game = set_game.game where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

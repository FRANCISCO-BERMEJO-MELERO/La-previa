-- Esquema de Una sola pista (docs/JUEGOS.md §5 y §6).

alter table public.rooms drop constraint rooms_game_check;
alter table public.rooms add constraint rooms_game_check
  check (game in ('impostor', 'probable', 'quien_lo_dijo', 'una_pista'));

alter table public.games drop constraint games_game_type_check;
alter table public.games add constraint games_game_type_check
  check (game_type in ('impostor', 'probable', 'quien_lo_dijo', 'una_pista'));

alter table public.games drop constraint games_phase_check;
alter table public.games add constraint games_phase_check check (
  case game_type
    when 'impostor' then phase in ('talking', 'voting', 'reveal', 'finished')
    when 'probable' then phase in ('voting', 'reveal', 'finished')
    when 'quien_lo_dijo' then phase in ('writing', 'voting', 'reveal', 'finished')
    when 'una_pista' then phase in ('writing', 'review', 'guessing', 'reveal', 'finished')
  end
);

-- Forma con la que se comparan las pistas entre sí y con la palabra: minúsculas, sin tildes ni
-- diéresis y sin espacios. La ñ es otra letra y se conserva. No trata plurales ni derivados.
create function private.normalize_clue(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(
    lower(coalesce(raw, '')),
    'áéíóúàèìòùâêîôûäëïöü ',
    'aeiouaeiouaeiouaeiou'
  );
$$;

revoke execute on function private.normalize_clue(text) from public, anon, authenticated;

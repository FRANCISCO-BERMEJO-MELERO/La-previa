-- Esquema de ¿Qué prefieres? (docs/JUEGOS-2.md §2 y §4).

alter table public.rooms drop constraint rooms_game_check;
alter table public.rooms add constraint rooms_game_check
  check (game in ('impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres'));

alter table public.games drop constraint games_game_type_check;
alter table public.games add constraint games_game_type_check
  check (game_type in ('impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres'));

alter table public.games drop constraint games_phase_check;
alter table public.games add constraint games_phase_check check (
  case game_type
    when 'impostor' then phase in ('talking', 'voting', 'reveal', 'finished')
    when 'probable' then phase in ('voting', 'reveal', 'finished')
    when 'quien_lo_dijo' then phase in ('writing', 'voting', 'reveal', 'finished')
    when 'una_pista' then phase in ('writing', 'review', 'guessing', 'reveal', 'finished')
    when 'que_prefieres' then phase in ('voting', 'reveal', 'finished')
  end
);

alter table public.prompts drop constraint prompts_game_type_check;
alter table public.prompts add constraint prompts_game_type_check
  check (game_type in ('probable', 'quien_lo_dijo', 'que_prefieres'));

-- En ¿Qué prefieres? `text` es la opción A y `text_b` la B. Los demás juegos no la usan.
alter table public.prompts add column text_b text;
alter table public.prompts add constraint prompts_text_b_check check (
  case game_type
    when 'que_prefieres' then text_b is not null and char_length(text_b) between 1 and 200
    else text_b is null
  end
);

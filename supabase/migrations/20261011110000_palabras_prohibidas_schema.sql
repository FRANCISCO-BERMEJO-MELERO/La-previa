-- Esquema de Palabras prohibidas (docs/JUEGOS-2.md §3 y §4).

alter table public.rooms drop constraint rooms_game_check;
alter table public.rooms add constraint rooms_game_check check (
  game in ('impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas')
);

alter table public.games drop constraint games_game_type_check;
alter table public.games add constraint games_game_type_check check (
  game_type in ('impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas')
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
  end
);

-- Cinco prohibidas, distintas entre sí y de la palabra en la forma con la que se comparan las
-- pistas de Una sola pista: sin mayúsculas, tildes ni espacios.
create function private.valid_taboo_card(word text, forbidden text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(forbidden) = 5
    and not exists (select 1 from unnest(forbidden) f where f is null or char_length(btrim(f)) = 0)
    and (select count(distinct private.normalize_clue(f)) from unnest(forbidden) f) = 5
    and not exists (
      select 1 from unnest(forbidden) f where private.normalize_clue(f) = private.normalize_clue(word)
    );
$$;

revoke execute on function private.valid_taboo_card(text, text[]) from public, anon, authenticated;

create table public.taboo_cards (
  id bigint generated always as identity primary key,
  word text not null unique check (char_length(word) between 1 and 40 and word = btrim(word)),
  forbidden text[] not null,
  active boolean not null default true,
  constraint taboo_cards_forbidden_check check (private.valid_taboo_card(word, forbidden))
);

alter table public.taboo_cards enable row level security;

revoke all on public.taboo_cards from anon, authenticated;

-- La tarjeta de cada ronda. Quien describe es `subject_id`.
alter table public.game_rounds add column card_id bigint references public.taboo_cards (id);

create index game_rounds_card_id_idx on public.game_rounds (card_id);

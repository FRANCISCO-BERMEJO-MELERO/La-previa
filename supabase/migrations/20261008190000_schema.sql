-- Esquema de La Previa (docs/CONTEXTO.md §4, "Modelo de datos").
-- Todas las tablas nacen con RLS activado y sin políticas: los clientes solo usan RPC.

create table public.words (
  id bigint generated always as identity primary key,
  category text not null check (char_length(category) between 1 and 40),
  word text not null check (char_length(word) between 1 and 40),
  active boolean not null default true,
  unique (category, word)
);

alter table public.words enable row level security;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$'),
  host_id uuid not null,
  game text not null default 'impostor' check (game in ('impostor')),
  current_game_id uuid,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

create table public.room_players (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 14 and name = btrim(name)),
  joined_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create unique index room_players_room_name_key on public.room_players (room_id, lower(name));
create index room_players_user_id_idx on public.room_players (user_id);

alter table public.room_players enable row level security;

create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  game_type text not null default 'impostor' check (game_type in ('impostor')),
  phase text not null default 'talking' check (phase in ('talking', 'voting', 'reveal', 'finished')),
  round integer not null default 1 check (round >= 1),
  impostor_count integer not null check (impostor_count >= 1),
  word_id bigint not null references public.words (id),
  outcome jsonb,
  winner text check (winner in ('group', 'impostors')),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  check ((phase = 'finished') = (winner is not null)),
  check ((phase = 'finished') = (finished_at is not null))
);

create index games_room_id_idx on public.games (room_id);

alter table public.games enable row level security;

alter table public.rooms
  add constraint rooms_current_game_id_fkey
  foreign key (current_game_id) references public.games (id) on delete set null;

create table public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null,
  name text not null check (char_length(name) between 1 and 14),
  alive boolean not null default true,
  has_voted boolean not null default false,
  primary key (game_id, user_id)
);

alter table public.game_players enable row level security;

-- Tabla aparte a propósito: aunque algún día se pudiera leer game_players, los roles no.
create table public.game_roles (
  game_id uuid not null,
  user_id uuid not null,
  role text not null check (role in ('player', 'impostor')),
  primary key (game_id, user_id),
  foreign key (game_id, user_id) references public.game_players (game_id, user_id) on delete cascade
);

alter table public.game_roles enable row level security;

create table public.votes (
  game_id uuid not null,
  round integer not null check (round >= 1),
  voter_id uuid not null,
  target_id uuid not null,
  primary key (game_id, round, voter_id),
  foreign key (game_id, voter_id) references public.game_players (game_id, user_id) on delete cascade,
  foreign key (game_id, target_id) references public.game_players (game_id, user_id) on delete cascade,
  check (voter_id <> target_id)
);

alter table public.votes enable row level security;

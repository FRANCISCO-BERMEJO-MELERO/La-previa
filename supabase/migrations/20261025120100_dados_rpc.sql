-- A dados (docs/PLAN-7.md §2 a §5): estado, puntuación, acciones, abandono y foto.

-- Bando de cada jugador. Solo lo usa A dados; en los demás juegos queda nulo.
alter table public.game_players add column side text check (side in ('A', 'B'));

-- Una fila por partida. Los tableros van por bando: tres columnas con sus dados en el orden en
-- que se colocaron. turn_order es la secuencia completa de turnos, que se repite en bucle.
create table public.dados_state (
  game_id uuid primary key references public.games (id) on delete cascade,
  mode text not null check (mode in ('1v1', '2v2')),
  turn_order uuid[] not null check (cardinality(turn_order) in (2, 4)),
  turn_index integer not null default 0 check (turn_index >= 0 and turn_index < cardinality(turn_order)),
  pending_die integer check (pending_die between 1 and 6),
  boards jsonb not null,
  winner text check (winner in ('A', 'B')),
  end_reason text check (end_reason in ('board_full', 'forfeit')),
  left_user_id uuid,
  check ((end_reason is null) = (pending_die is not null)),
  check (end_reason = 'forfeit' or left_user_id is null),
  check (end_reason is not null or winner is null),
  foreign key (game_id, left_user_id) references public.game_players (game_id, user_id)
);

alter table public.dados_state enable row level security;

revoke all on public.dados_state from anon, authenticated;

-- Reglas -------------------------------------------------------------------------------------

-- Un dado de seis caras. Solo lo tira el servidor.
create function private.dados_roll()
returns integer
language sql
volatile
set search_path = ''
as $$ select 1 + floor(random() * 6)::integer $$;

-- Un grupo de n dados de valor v aporta v × n².
create function private.dados_column_score(dice jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum(grouped.value * grouped.n * grouped.n), 0)::integer
  from (
    select d.value::integer as value, count(*) as n
    from jsonb_array_elements_text(dice) d
    group by d.value::integer
  ) grouped
$$;

create function private.dados_board_score(board jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum(private.dados_column_score(c)), 0)::integer
  from jsonb_array_elements(board) c
$$;

create function private.dados_board_full(board jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select bool_and(jsonb_array_length(c) = 3) from jsonb_array_elements(board) c
$$;

create function private.dados_other_side(side text)
returns text
language sql
immutable
set search_path = ''
as $$ select case side when 'A' then 'B' else 'A' end $$;

-- Acaba la partida. winner nulo es empate.
create function private.dados_finish(target_game_id uuid, winner text, reason text, left_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.dados_state s
  set winner = dados_finish.winner,
      end_reason = reason,
      left_user_id = dados_finish.left_user_id,
      pending_die = null
  where s.game_id = target_game_id;
  update public.games g set phase = 'finished', finished_at = now() where g.id = target_game_id;
end;
$$;

-- Acciones -----------------------------------------------------------------------------------

-- El anfitrión abre la partida con la modalidad y los equipos que ha montado en la sala de
-- espera. El bando que abre y el orden dentro de cada equipo se sortean.
create function public.dados_start(room_id uuid, mode text, team_a uuid[], team_b uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(dados_start.room_id);
  game public.games;
  size integer;
  players uuid[];
  shuffled_a uuid[];
  shuffled_b uuid[];
  first_team uuid[];
  second_team uuid[];
  new_game_id uuid;
begin
  perform private.require_host(room, uid);
  game := private.current_game(room);

  if game.id is not null and game.phase <> 'finished' then
    perform private.raise_error('invalid_phase');
  end if;

  if room.game <> 'dados' then
    perform private.raise_error('invalid_game');
  end if;

  if dados_start.mode is null or dados_start.mode not in ('1v1', '2v2') then
    perform private.raise_error('invalid_mode');
  end if;
  size := case dados_start.mode when '1v1' then 1 else 2 end;
  players := coalesce(team_a, '{}') || coalesce(team_b, '{}');

  if coalesce(cardinality(team_a), 0) <> size
    or coalesce(cardinality(team_b), 0) <> size
    or array_position(players, null) is not null
    or (select count(distinct p) from unnest(players) p) <> 2 * size
    or exists (
      select 1
      from unnest(players) p
      where not exists (
        select 1 from public.room_players rp where rp.room_id = room.id and rp.user_id = p
      )
    )
  then
    perform private.raise_error('invalid_teams');
  end if;

  shuffled_a := array(select p from unnest(team_a) p order by random());
  shuffled_b := array(select p from unnest(team_b) p order by random());
  if random() < 0.5 then
    first_team := shuffled_a;
    second_team := shuffled_b;
  else
    first_team := shuffled_b;
    second_team := shuffled_a;
  end if;

  insert into public.games (room_id, game_type, phase)
  values (room.id, 'dados', 'playing')
  returning id into new_game_id;

  insert into public.game_players (game_id, user_id, name, side)
  select new_game_id, rp.user_id, rp.name, case when rp.user_id = any (team_a) then 'A' else 'B' end
  from public.room_players rp
  where rp.room_id = room.id and rp.user_id = any (players);

  insert into public.dados_state (game_id, mode, turn_order, pending_die, boards)
  values (
    new_game_id,
    dados_start.mode,
    case size
      when 1 then array[first_team[1], second_team[1]]
      else array[first_team[1], second_team[1], first_team[2], second_team[2]]
    end,
    private.dados_roll(),
    '{"A": [[], [], []], "B": [[], [], []]}'
  );

  update public.rooms r set current_game_id = new_game_id where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Quien tiene el turno coloca el dado pendiente en una de sus columnas (0, 1 o 2). Se resuelve
-- todo de una vez: colocar, romper los iguales de la columna rival, comprobar el final y, si
-- sigue, pasar el turno con un dado nuevo.
create function public.dados_place(room_id uuid, column_index integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(dados_place.room_id);
  game public.games;
  state public.dados_state;
  side text;
  rival text;
  path text[];
  rival_path text[];
  new_boards jsonb;
  score_a integer;
  score_b integer;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'dados', 'playing');
  select s.* into state from public.dados_state s where s.game_id = game.id;

  if state.turn_order[state.turn_index + 1] <> uid then
    perform private.raise_error('not_your_turn');
  end if;

  if column_index is null or column_index not between 0 and 2 then
    perform private.raise_error('invalid_column');
  end if;

  select gp.side into side from public.game_players gp where gp.game_id = game.id and gp.user_id = uid;
  rival := private.dados_other_side(side);
  path := array[side, column_index::text];
  rival_path := array[rival, column_index::text];

  if jsonb_array_length(state.boards #> path) >= 3 then
    perform private.raise_error('column_full');
  end if;

  new_boards := jsonb_set(state.boards, path, (state.boards #> path) || to_jsonb(state.pending_die));
  new_boards := jsonb_set(
    new_boards,
    rival_path,
    (
      select coalesce(jsonb_agg(d order by position), '[]'::jsonb)
      from jsonb_array_elements(new_boards #> rival_path) with ordinality as dice(d, position)
      where d <> to_jsonb(state.pending_die)
    )
  );

  if private.dados_board_full(new_boards -> 'A') or private.dados_board_full(new_boards -> 'B') then
    update public.dados_state s set boards = new_boards where s.game_id = game.id;
    score_a := private.dados_board_score(new_boards -> 'A');
    score_b := private.dados_board_score(new_boards -> 'B');
    perform private.dados_finish(
      game.id,
      case when score_a > score_b then 'A' when score_b > score_a then 'B' end,
      'board_full',
      null
    );
  else
    update public.dados_state s
    set boards = new_boards,
        turn_index = (s.turn_index + 1) % cardinality(s.turn_order),
        pending_die = private.dados_roll()
    where s.game_id = game.id;
  end if;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Abandono y expulsión -----------------------------------------------------------------------

-- Si quien se va juega, la partida termina y gana el otro bando. Un espectador no cambia nada.
create function private.dados_departure(game public.games, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  leaving_side text;
begin
  if game.phase = 'finished' then
    return;
  end if;

  select gp.side into leaving_side
  from public.game_players gp
  where gp.game_id = game.id and gp.user_id = target_user_id;
  if not found then
    return;
  end if;

  perform private.dados_finish(game.id, private.dados_other_side(leaving_side), 'forfeit', target_user_id);
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
  elsif game.game_type = 'dados' then
    perform private.dados_departure(game, target_user_id);
  else
    perform private.round_departure(game, target_user_id);
  end if;
end;
$$;

-- Foto ---------------------------------------------------------------------------------------

-- Un bando: quiénes lo forman en su orden de turno, su tablero y sus puntos.
create function private.dados_side(game public.games, state public.dados_state, target_side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'side', target_side,
    'members', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('user_id', gp.user_id, 'name', gp.name)
          order by array_position(state.turn_order, gp.user_id)
        ),
        '[]'::jsonb
      )
      from public.game_players gp
      where gp.game_id = game.id and gp.side = target_side
    ),
    'board', state.boards -> target_side,
    'column_scores', (
      select jsonb_agg(private.dados_column_score(c) order by position)
      from jsonb_array_elements(state.boards -> target_side) with ordinality as columns(c, position)
    ),
    'total', private.dados_board_score(state.boards -> target_side)
  )
$$;

-- No hay nada secreto: todos ven lo mismo, salvo lo que dice de ti.
create function private.dados_game_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'type', 'dados',
    'id', g.id,
    'phase', g.phase,
    'mode', s.mode,
    'sides', jsonb_build_array(private.dados_side(g, s, 'A'), private.dados_side(g, s, 'B')),
    'turn_order', to_jsonb(s.turn_order),
    'turn', case when g.phase = 'playing' then jsonb_build_object(
      'user_id', s.turn_order[s.turn_index + 1],
      'side', (
        select gp.side from public.game_players gp
        where gp.game_id = g.id and gp.user_id = s.turn_order[s.turn_index + 1]
      )
    ) end,
    'pending_die', s.pending_die,
    'my', jsonb_build_object(
      'side', me.side,
      'is_spectator', me.user_id is null,
      'is_my_turn', g.phase = 'playing' and s.turn_order[s.turn_index + 1] = uid
    ),
    'result', case when g.phase = 'finished' then jsonb_build_object(
      'winner', s.winner,
      'reason', s.end_reason,
      'left', (
        select jsonb_build_object('user_id', gp.user_id, 'name', gp.name)
        from public.game_players gp
        where gp.game_id = g.id and gp.user_id = s.left_user_id
      )
    ) end
  )
  from public.games g
  join public.dados_state s on s.game_id = g.id
  left join public.game_players me on me.game_id = g.id and me.user_id = uid
  where g.id = target_game_id;
$$;

create or replace function private.game_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case g.game_type
    when 'impostor' then private.impostor_state(g.id, uid)
    when 'probable' then private.probable_state(g.id, uid)
    when 'quien_lo_dijo' then private.quien_lo_dijo_state(g.id, uid)
    when 'una_pista' then private.una_pista_state(g.id, uid)
    when 'que_prefieres' then private.que_prefieres_state(g.id, uid)
    when 'palabras_prohibidas' then private.palabras_prohibidas_state(g.id, uid)
    when 'luna_llena' then private.luna_llena_state(g.id, uid)
    when 'dados' then private.dados_game_state(g.id, uid)
  end
  from public.games g
  where g.id = target_game_id;
$$;

revoke execute on function
  private.dados_roll(),
  private.dados_column_score(jsonb),
  private.dados_board_score(jsonb),
  private.dados_board_full(jsonb),
  private.dados_other_side(text),
  private.dados_finish(uuid, text, text, uuid),
  private.dados_departure(public.games, uuid),
  private.dados_side(public.games, public.dados_state, text),
  private.dados_game_state(uuid, uuid)
from public, anon, authenticated;

revoke execute on function
  public.dados_start(uuid, text, uuid[], uuid[]),
  public.dados_place(uuid, integer)
from public, anon;
grant execute on function
  public.dados_start(uuid, text, uuid[], uuid[]),
  public.dados_place(uuid, integer)
to authenticated;

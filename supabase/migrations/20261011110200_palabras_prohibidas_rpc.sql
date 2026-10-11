-- Acciones de Palabras prohibidas (docs/JUEGOS-2.md §3 y §5), sobre las auxiliares de juegos por
-- rondas. El turno de quien describe y el cálculo de quien vigila son los de Una sola pista, así que
-- pasan a ser auxiliares comunes.

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
    'impostor', 'probable', 'quien_lo_dijo', 'una_pista', 'que_prefieres', 'palabras_prohibidas'
  ) then
    perform private.raise_error('invalid_game');
  end if;

  update public.rooms r set game = set_game.game where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create or replace function private.first_phase(kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'probable' then 'voting'
    when 'quien_lo_dijo' then 'writing'
    when 'una_pista' then 'writing'
    when 'que_prefieres' then 'voting'
    when 'palabras_prohibidas' then 'describing'
  end;
$$;

-- Protagonista de la ronda que se abre: el participante activo que menos veces lo ha sido, y entre
-- ellos el primero por orden de entrada a la sala. Así el turno rota y salta a los inactivos.
create function private.next_subject(target_game_id uuid, leaving uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select gp.user_id
  from public.game_players gp
  join public.games g on g.id = gp.game_id
  left join public.room_players rp on rp.room_id = g.room_id and rp.user_id = gp.user_id
  where gp.game_id = target_game_id and gp.alive and gp.user_id is distinct from leaving
  order by
    (select count(*) from public.game_rounds gr where gr.game_id = gp.game_id and gr.subject_id = gp.user_id),
    rp.joined_at nulls last,
    gp.user_id
  limit 1;
$$;

-- El siguiente participante activo por orden de entrada después de `after`, volviendo al principio
-- al llegar al final y empezando por los conectados.
create function private.next_active_after(game public.games, after uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select gp.user_id
  from public.game_players gp
  join public.room_players rp on rp.room_id = game.room_id and rp.user_id = gp.user_id
  left join public.room_players pivot on pivot.room_id = game.room_id and pivot.user_id = after
  where gp.game_id = game.id and gp.alive and gp.user_id is distinct from after
  order by
    private.is_connected(rp.last_seen_at) desc,
    rp.joined_at < pivot.joined_at,
    rp.joined_at,
    gp.user_id
  limit 1;
$$;

create or replace function private.una_pista_arbiter(game public.games)
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when r.host_id is distinct from private.round_subject(una_pista_arbiter.game) then r.host_id
    else private.next_active_after(una_pista_arbiter.game, r.host_id)
  end
  from public.rooms r
  where r.id = (una_pista_arbiter.game).room_id;
$$;

-- Tarjeta al azar entre las activas, empezando por las que aún no han salido en la sala.
create function private.pick_card(target_room_id uuid)
returns bigint
language sql
volatile
set search_path = ''
as $$
  select t.id
  from public.taboo_cards t
  where t.active
  order by
    exists (
      select 1
      from public.game_rounds gr
      join public.games g on g.id = gr.game_id
      where g.room_id = target_room_id and gr.card_id = t.id
    ),
    pg_catalog.gen_random_uuid()
  limit 1;
$$;

create or replace function private.open_round(target_game_id uuid, new_round integer, leaving uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
begin
  update public.games g set round = new_round, phase = private.first_phase(g.game_type)
  where g.id = target_game_id
  returning g.* into game;

  insert into public.game_players (game_id, user_id, name)
  select game.id, rp.user_id, rp.name
  from public.room_players rp
  where rp.room_id = game.room_id and rp.user_id is distinct from leaving
  on conflict (game_id, user_id) do update set alive = true, name = excluded.name;

  insert into public.game_rounds (game_id, round, prompt_id, word_id, card_id, subject_id)
  values (
    game.id,
    new_round,
    private.pick_prompt(game.room_id, game.game_type),
    case when game.game_type = 'una_pista' then private.pick_word(game.room_id) end,
    case when game.game_type = 'palabras_prohibidas' then private.pick_card(game.room_id) end,
    case when game.game_type in ('una_pista', 'palabras_prohibidas') then private.next_subject(game.id, leaving) end
  );
end;
$$;

drop function private.una_pista_next_guesser(uuid, uuid);

create function private.palabras_prohibidas_watcher(game public.games)
returns uuid
language sql
stable
set search_path = ''
as $$
  select private.next_active_after(game, private.round_subject(game));
$$;

create function private.require_describer(game public.games, uid uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if private.round_subject(game) is distinct from uid then
    perform private.raise_error('not_describer');
  end if;
end;
$$;

create function private.require_watcher(game public.games, uid uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if private.palabras_prohibidas_watcher(game) is distinct from uid then
    perform private.raise_error('not_watcher');
  end if;
end;
$$;

-- Cierra la ronda con su resultado y pasa a la revelación.
create function private.palabras_prohibidas_end_round(game public.games, result jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.game_rounds gr set result = palabras_prohibidas_end_round.result
  where gr.game_id = game.id and gr.round = game.round;
  update public.games g set phase = 'reveal' where g.id = game.id;
end;
$$;

-- Igual que antes, salvo que en Palabras prohibidas, como en Una sola pista, la ronda se anula si
-- se va quien la protagoniza antes de la revelación.
create or replace function private.round_departure(game public.games, target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if game.phase = 'finished' then
    return;
  end if;

  update public.game_players gp set alive = false
  where gp.game_id = game.id and gp.user_id = target_user_id and gp.alive;
  if not found then
    return;
  end if;

  if (select count(*) from public.game_players gp where gp.game_id = game.id and gp.alive) < 3 then
    update public.games g set phase = 'finished', finished_at = now() where g.id = game.id;
    return;
  end if;

  if game.game_type in ('una_pista', 'palabras_prohibidas') and game.phase <> 'reveal'
    and private.round_subject(game) = target_user_id then
    delete from public.answers a where a.game_id = game.id and a.round = game.round;
    delete from public.game_rounds gr where gr.game_id = game.id and gr.round = game.round;
    perform private.open_round(game.id, game.round, target_user_id);
    return;
  end if;

  if game.game_type = 'quien_lo_dijo' and game.phase = 'voting'
    and private.round_subject(game) = target_user_id then
    delete from public.votes v where v.game_id = game.id and v.round = game.round;
    update public.game_rounds gr set result = jsonb_build_object('annulled', true)
    where gr.game_id = game.id and gr.round = game.round;
    update public.games g set phase = 'reveal' where g.id = game.id;
    return;
  end if;

  if game.phase <> 'reveal' then
    delete from public.votes v
    where v.game_id = game.id
      and v.round = game.round
      and (v.voter_id = target_user_id or v.target_id = target_user_id);
    if game.phase = 'writing' or game.game_type = 'que_prefieres' then
      delete from public.answers a
      where a.game_id = game.id and a.round = game.round and a.user_id = target_user_id;
    end if;
    perform private.close_if_done(game.id);
  end if;
end;
$$;

create function public.palabras_prohibidas_start(room_id uuid, rounds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(palabras_prohibidas_start.room_id);
begin
  perform private.start_round_game(room, uid, 'palabras_prohibidas', palabras_prohibidas_start.rounds);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Quien describe toca a quien ha acertado: un punto para cada uno.
create function public.palabras_prohibidas_guessed(room_id uuid, user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(palabras_prohibidas_guessed.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'palabras_prohibidas', 'describing');
  perform private.require_describer(game, uid);

  if palabras_prohibidas_guessed.user_id is null
    or palabras_prohibidas_guessed.user_id = uid
    or palabras_prohibidas_guessed.user_id is not distinct from private.palabras_prohibidas_watcher(game)
    or not exists (
      select 1 from public.game_players gp
      where gp.game_id = game.id and gp.user_id = palabras_prohibidas_guessed.user_id and gp.alive
    ) then
    perform private.raise_error('invalid_target');
  end if;

  update public.game_players gp set score = gp.score + 1
  where gp.game_id = game.id and gp.user_id in (uid, palabras_prohibidas_guessed.user_id);
  perform private.palabras_prohibidas_end_round(
    game, jsonb_build_object('type', 'guessed', 'user_id', palabras_prohibidas_guessed.user_id)
  );

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.palabras_prohibidas_pass(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(palabras_prohibidas_pass.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'palabras_prohibidas', 'describing');
  perform private.require_describer(game, uid);

  perform private.palabras_prohibidas_end_round(game, jsonb_build_object('type', 'passed'));
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.palabras_prohibidas_forbidden(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(palabras_prohibidas_forbidden.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'palabras_prohibidas', 'describing');
  perform private.require_watcher(game, uid);

  perform private.palabras_prohibidas_end_round(game, jsonb_build_object('type', 'forbidden'));
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.palabras_prohibidas_next(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(palabras_prohibidas_next.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_game(room, 'palabras_prohibidas', 'reveal');

  perform private.next_round(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function
  private.next_subject(uuid, uuid),
  private.next_active_after(public.games, uuid),
  private.pick_card(uuid),
  private.palabras_prohibidas_watcher(public.games),
  private.require_describer(public.games, uuid),
  private.require_watcher(public.games, uuid),
  private.palabras_prohibidas_end_round(public.games, jsonb)
from public, anon, authenticated;

revoke execute on function
  public.palabras_prohibidas_start(uuid, integer),
  public.palabras_prohibidas_guessed(uuid, uuid),
  public.palabras_prohibidas_pass(uuid),
  public.palabras_prohibidas_forbidden(uuid),
  public.palabras_prohibidas_next(uuid)
from public, anon;

grant execute on function
  public.palabras_prohibidas_start(uuid, integer),
  public.palabras_prohibidas_guessed(uuid, uuid),
  public.palabras_prohibidas_pass(uuid),
  public.palabras_prohibidas_forbidden(uuid),
  public.palabras_prohibidas_next(uuid)
to authenticated;

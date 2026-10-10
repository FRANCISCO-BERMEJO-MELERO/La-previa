-- Acciones de Una sola pista (docs/JUEGOS.md §5 y §7), sobre las auxiliares de juegos por rondas.

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

  if set_game.game is null
    or set_game.game not in ('impostor', 'probable', 'quien_lo_dijo', 'una_pista') then
    perform private.raise_error('invalid_game');
  end if;

  update public.rooms r set game = set_game.game where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Palabra al azar entre las activas, empezando por las que aún no han salido en la sala, ni en
-- El impostor ni en Una sola pista.
create or replace function private.pick_word(target_room_id uuid)
returns bigint
language sql
volatile
set search_path = ''
as $$
  select w.id
  from public.words w
  where w.active
  order by
    exists (select 1 from public.games g where g.room_id = target_room_id and g.word_id = w.id)
      or exists (
        select 1
        from public.game_rounds gr
        join public.games g on g.id = gr.game_id
        where g.room_id = target_room_id and gr.word_id = w.id
      ),
    pg_catalog.gen_random_uuid()
  limit 1;
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
  end;
$$;

-- Adivino de la ronda que se abre: el participante activo que menos veces lo ha sido, y entre
-- ellos el primero por orden de entrada a la sala. Así el turno rota y salta a los inactivos.
create function private.una_pista_next_guesser(target_game_id uuid, leaving uuid)
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

-- Abre una ronda. Juegan todos los miembros de la sala menos `leaving` (quien se está yendo y
-- todavía figura en la sala cuando una ronda se abre por su abandono).
drop function private.open_round(uuid, integer);

create function private.open_round(target_game_id uuid, new_round integer, leaving uuid default null)
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

  insert into public.game_rounds (game_id, round, prompt_id, word_id, subject_id)
  values (
    game.id,
    new_round,
    private.pick_prompt(game.room_id, game.game_type),
    case when game.game_type = 'una_pista' then private.pick_word(game.room_id) end,
    case when game.game_type = 'una_pista' then private.una_pista_next_guesser(game.id, leaving) end
  );
end;
$$;

-- Árbitro: el anfitrión; si le toca adivinar, el siguiente participante activo por orden de
-- entrada, empezando por los conectados.
create function private.una_pista_arbiter(game public.games)
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when r.host_id is distinct from private.round_subject(una_pista_arbiter.game) then r.host_id
    else (
      select gp.user_id
      from public.game_players gp
      join public.room_players rp on rp.room_id = r.id and rp.user_id = gp.user_id
      left join public.room_players host on host.room_id = r.id and host.user_id = r.host_id
      where gp.game_id = (una_pista_arbiter.game).id and gp.alive and gp.user_id <> r.host_id
      order by
        private.is_connected(rp.last_seen_at) desc,
        rp.joined_at < host.joined_at,
        rp.joined_at,
        gp.user_id
      limit 1
    )
  end
  from public.rooms r
  where r.id = (una_pista_arbiter.game).room_id;
$$;

create function private.require_arbiter(game public.games, uid uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if private.una_pista_arbiter(game) is distinct from uid then
    perform private.raise_error('not_arbiter');
  end if;
end;
$$;

-- El adivino no escribe: cuenta como que ya ha respondido.
create or replace function private.has_responded(game public.games, target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when game.phase = 'writing' then
      (game.game_type = 'una_pista' and private.round_subject(game) = target_user_id)
      or exists (
        select 1 from public.answers a
        where a.game_id = game.id and a.round = game.round and a.user_id = target_user_id
      )
    when game.phase = 'voting' then
      (game.game_type = 'quien_lo_dijo' and private.round_subject(game) = target_user_id)
      or exists (
        select 1 from public.votes v
        where v.game_id = game.id and v.round = game.round and v.voter_id = target_user_id
      )
    else false
  end;
$$;

-- Al cerrar la escritura se anulan las pistas que coinciden entre sí en forma normalizada.
create function private.una_pista_close_writing_round(target_game_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
begin
  select g.* into game from public.games g where g.id = target_game_id;

  update public.answers a set cancelled = true
  where a.game_id = game.id and a.round = game.round
    and exists (
      select 1 from public.answers b
      where b.game_id = a.game_id and b.round = a.round and b.user_id <> a.user_id
        and private.normalize_clue(b.text) = private.normalize_clue(a.text)
    );

  update public.games g set phase = 'review' where g.id = game.id;
end;
$$;

create or replace function private.close_if_done(target_game_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.games;
begin
  select g.* into game from public.games g where g.id = target_game_id;
  if not private.all_responded(game.id) then
    return;
  end if;

  if game.game_type = 'probable' and game.phase = 'voting' then
    perform private.probable_close_round(game.id);
  elsif game.game_type = 'quien_lo_dijo' and game.phase = 'writing' then
    perform private.quien_lo_dijo_close_writing_round(game.id);
  elsif game.game_type = 'quien_lo_dijo' and game.phase = 'voting' then
    perform private.quien_lo_dijo_close_voting_round(game.id);
  elsif game.game_type = 'una_pista' and game.phase = 'writing' then
    perform private.una_pista_close_writing_round(game.id);
  end if;
end;
$$;

-- Abandonos en juegos por rondas. En ¿Quién lo dijo?, si se va el autor elegido durante la
-- votación, la ronda se anula y se revela. En Una sola pista, si se va el adivino antes de la
-- revelación, la ronda se anula sin contar: se borra y se vuelve a abrir con otro adivino y otra
-- palabra. El resto sigue la regla común.
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

  if game.game_type = 'una_pista' and game.phase <> 'reveal'
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
    if game.phase = 'writing' then
      delete from public.answers a
      where a.game_id = game.id and a.round = game.round and a.user_id = target_user_id;
    end if;
    perform private.close_if_done(game.id);
  end if;
end;
$$;

create function public.una_pista_start(room_id uuid, rounds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(una_pista_start.room_id);
begin
  perform private.start_round_game(room, uid, 'una_pista', una_pista_start.rounds);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Una sola palabra de 1 a 20 caracteres, que no sea la palabra secreta ni la contenga.
create function public.una_pista_clue(room_id uuid, text text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(una_pista_clue.room_id);
  game public.games;
  clean text := private.clean_text(una_pista_clue.text);
  secret text;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'una_pista', 'writing');
  perform private.require_active(game, uid);

  if private.round_subject(game) = uid then
    perform private.raise_error('is_guesser');
  end if;
  if private.has_responded(game, uid) then
    perform private.raise_error('already_answered');
  end if;

  select w.word into secret
  from public.game_rounds gr
  join public.words w on w.id = gr.word_id
  where gr.game_id = game.id and gr.round = game.round;

  if char_length(clean) not between 1 and 20
    or position(' ' in clean) > 0
    or position(private.normalize_clue(secret) in private.normalize_clue(clean)) > 0 then
    perform private.raise_error('invalid_clue');
  end if;

  insert into public.answers (game_id, round, user_id, text) values (game.id, game.round, uid, clean);
  perform private.close_if_done(game.id);

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.una_pista_close_writing(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(una_pista_close_writing.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'una_pista', 'writing');
  perform private.require_arbiter(game, uid);

  perform private.una_pista_close_writing_round(game.id);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- Quien ha dado pista puede anular o recuperar cualquiera, para lo que el automático no ve.
create function public.una_pista_toggle_clue(room_id uuid, user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(una_pista_toggle_clue.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'una_pista', 'review');

  if private.round_subject(game) = uid then
    perform private.raise_error('is_guesser');
  end if;
  if not exists (
    select 1 from public.answers a
    where a.game_id = game.id and a.round = game.round and a.user_id = uid
  ) then
    perform private.raise_error('not_participant');
  end if;

  update public.answers a set cancelled = not a.cancelled
  where a.game_id = game.id and a.round = game.round and a.user_id = una_pista_toggle_clue.user_id;
  if not found then
    perform private.raise_error('invalid_target');
  end if;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.una_pista_show_clues(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(una_pista_show_clues.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'una_pista', 'review');
  perform private.require_arbiter(game, uid);

  update public.games g set phase = 'guessing' where g.id = game.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- El adivino dice su respuesta en voz alta y el árbitro la marca.
create function public.una_pista_mark(room_id uuid, result text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(una_pista_mark.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'una_pista', 'guessing');
  perform private.require_arbiter(game, uid);

  if una_pista_mark.result is null or una_pista_mark.result not in ('correct', 'wrong', 'pass') then
    perform private.raise_error('invalid_answer');
  end if;

  update public.game_rounds gr set result = jsonb_build_object('result', una_pista_mark.result)
  where gr.game_id = game.id and gr.round = game.round;
  update public.games g set phase = 'reveal' where g.id = game.id;

  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create function public.una_pista_next(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(una_pista_next.room_id);
  game public.games;
begin
  perform private.require_member(room.id, uid);
  game := private.require_game(room, 'una_pista', 'reveal');
  perform private.require_arbiter(game, uid);

  perform private.next_round(game);
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

revoke execute on function
  private.una_pista_next_guesser(uuid, uuid),
  private.open_round(uuid, integer, uuid),
  private.una_pista_arbiter(public.games),
  private.require_arbiter(public.games, uuid),
  private.una_pista_close_writing_round(uuid)
from public, anon, authenticated;

revoke execute on function
  public.una_pista_start(uuid, integer),
  public.una_pista_clue(uuid, text),
  public.una_pista_close_writing(uuid),
  public.una_pista_toggle_clue(uuid, uuid),
  public.una_pista_show_clues(uuid),
  public.una_pista_mark(uuid, text),
  public.una_pista_next(uuid)
from public, anon;

grant execute on function
  public.una_pista_start(uuid, integer),
  public.una_pista_clue(uuid, text),
  public.una_pista_close_writing(uuid),
  public.una_pista_toggle_clue(uuid, uuid),
  public.una_pista_show_clues(uuid),
  public.una_pista_mark(uuid, text),
  public.una_pista_next(uuid)
to authenticated;

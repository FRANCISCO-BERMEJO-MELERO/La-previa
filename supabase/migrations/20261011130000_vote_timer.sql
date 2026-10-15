-- Tiempo para votar en El impostor (docs/MEJORAS.md §5): el anfitrión lo elige al empezar y, al
-- abrir cada votación, se guarda la hora límite. Pasada esa hora, cualquier miembro puede cerrarla.

alter table public.games add column vote_seconds integer;
alter table public.games add column voting_deadline timestamptz;
alter table public.games add constraint games_vote_timer_check check (
  case game_type
    when 'impostor' then vote_seconds is null or vote_seconds in (30, 60, 90)
    else vote_seconds is null and voting_deadline is null
  end
);

drop function public.start_game(uuid, integer, text[]);

create function public.start_game(
  room_id uuid,
  impostor_count integer,
  categories text[] default null,
  vote_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(start_game.room_id);
  game public.games;
  player_count integer;
  new_game_id uuid;
begin
  perform private.require_host(room, uid);

  -- Se empieza desde la sala de espera o, para volver a jugar, desde una partida terminada.
  game := private.current_game(room);
  if game.id is not null and game.phase <> 'finished' then
    perform private.raise_error('invalid_phase');
  end if;

  select count(*) into player_count from public.room_players rp where rp.room_id = room.id;
  if player_count < 3 then
    perform private.raise_error('not_enough_players');
  end if;

  if start_game.impostor_count is null
    or start_game.impostor_count < 1
    or 2 * start_game.impostor_count >= player_count then
    perform private.raise_error('invalid_impostor_count');
  end if;

  -- Cada temática elegida tiene que existir y tener palabras activas.
  if exists (
    select 1 from unnest(start_game.categories) c
    where c is null or not exists (
      select 1 from public.words w where w.active and w.category = c
    )
  ) then
    perform private.raise_error('invalid_categories');
  end if;

  if start_game.vote_seconds is not null and start_game.vote_seconds not in (30, 60, 90) then
    perform private.raise_error('invalid_vote_seconds');
  end if;

  insert into public.games (room_id, impostor_count, word_id, vote_seconds)
  values (
    room.id,
    start_game.impostor_count,
    private.pick_word(room.id, start_game.categories),
    start_game.vote_seconds
  )
  returning id into new_game_id;

  -- Participan todos los miembros, también los desconectados.
  insert into public.game_players (game_id, user_id, name)
  select new_game_id, rp.user_id, rp.name
  from public.room_players rp
  where rp.room_id = room.id;

  insert into public.game_roles (game_id, user_id, role)
  select
    new_game_id,
    shuffled.user_id,
    case when shuffled.position <= start_game.impostor_count then 'impostor' else 'player' end
  from (
    select gp.user_id, row_number() over (order by pg_catalog.gen_random_uuid()) as position
    from public.game_players gp
    where gp.game_id = new_game_id
  ) shuffled;

  update public.rooms r set current_game_id = new_game_id where r.id = room.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create or replace function public.open_voting(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(open_voting.room_id);
  game public.games;
begin
  perform private.require_host(room, uid);
  game := private.require_phase(room, 'talking');

  update public.games g
  set phase = 'voting',
      voting_deadline = case
        when g.vote_seconds is null then null
        else now() + make_interval(secs => g.vote_seconds)
      end
  where g.id = game.id;
  update public.game_players gp set has_voted = false where gp.game_id = game.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

-- El anfitrión cierra cuando quiere. Los demás miembros, solo una votación con tiempo que ya ha
-- pasado: así se cierra aunque el móvil del anfitrión esté bloqueado.
create or replace function public.close_voting(room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  room public.rooms := private.lock_room(close_voting.room_id);
  game public.games := private.current_game(room);
  leaders uuid[];
  expelled public.game_players;
  result jsonb;
begin
  if room.host_id is distinct from uid then
    perform private.require_member(room.id, uid);
    if game.id is null or game.game_type <> 'impostor' or game.phase <> 'voting'
      or game.voting_deadline is null or now() < game.voting_deadline then
      perform private.raise_error('not_host');
    end if;
  end if;
  game := private.require_phase(room, 'voting');

  -- Los más votados de la ronda; si no hay votos, ninguno.
  select coalesce(array_agg(tally.target_id order by tally.target_id), '{}')
  into leaders
  from (
    select v.target_id, count(*) as votes, max(count(*)) over () as top
    from public.votes v
    where v.game_id = game.id and v.round = game.round
    group by v.target_id
  ) tally
  where tally.votes = tally.top;

  if cardinality(leaders) = 1 then
    update public.game_players gp set alive = false
    where gp.game_id = game.id and gp.user_id = leaders[1]
    returning gp.* into expelled;

    result := jsonb_build_object(
      'type', 'eliminated',
      'user_id', expelled.user_id,
      'name', expelled.name,
      'was_impostor', private.was_impostor(game.id, expelled.user_id)
    );
  else
    result := jsonb_build_object('type', 'tie', 'user_ids', to_jsonb(leaders));
  end if;

  update public.games g set phase = 'reveal', outcome = result, voting_deadline = null
  where g.id = game.id;
  perform private.bump_version(room.id);
  return private.build_state(room.id, uid);
end;
$$;

create or replace function private.impostor_state(target_game_id uuid, uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'type', g.game_type,
    'id', g.id,
    'phase', g.phase,
    'round', g.round,
    'impostor_count', g.impostor_count,
    'impostors_left', (
      select count(*)
      from public.game_players gp
      join public.game_roles gr on gr.game_id = gp.game_id and gr.user_id = gp.user_id
      where gp.game_id = g.id and gp.alive and gr.role = 'impostor'
    ),
    'category', w.category,
    'vote_seconds', g.vote_seconds,
    'voting_deadline', case when g.phase = 'voting' then g.voting_deadline end,
    'participants', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'user_id', gp.user_id,
          'name', gp.name,
          'alive', gp.alive,
          'has_voted', gp.has_voted
        )
        order by rp.joined_at nulls last, gp.name, gp.user_id
      ), '[]'::jsonb)
      from public.game_players gp
      left join public.room_players rp on rp.room_id = g.room_id and rp.user_id = gp.user_id
      where gp.game_id = g.id
    ),
    'my', jsonb_build_object(
      'is_participant', me.user_id is not null,
      'alive', coalesce(me.alive, false),
      'role', mine.role,
      'word', case when mine.role = 'player' then w.word end,
      'voted_for', (
        select v.target_id from public.votes v
        where v.game_id = g.id and v.round = g.round and v.voter_id = uid
      )
    ),
    'outcome', case when g.phase in ('reveal', 'finished') then g.outcome end,
    'game_over', g.phase = 'reveal' and private.winner(g.id) is not null,
    'result', case when g.phase = 'finished' then jsonb_build_object(
      'winner', g.winner,
      'word', w.word,
      'impostor_ids', (
        select coalesce(jsonb_agg(gr.user_id order by gr.user_id), '[]'::jsonb)
        from public.game_roles gr
        where gr.game_id = g.id and gr.role = 'impostor'
      )
    ) end
  )
  from public.games g
  join public.words w on w.id = g.word_id
  left join public.game_players me on me.game_id = g.id and me.user_id = uid
  left join public.game_roles mine on mine.game_id = g.id and mine.user_id = uid
  where g.id = target_game_id;
$$;

revoke execute on function public.start_game(uuid, integer, text[], integer) from public, anon;
grant execute on function public.start_game(uuid, integer, text[], integer) to authenticated;

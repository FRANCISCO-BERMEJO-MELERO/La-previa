-- La galería pasa a los avatares con imagen de public/avatars (docs/DECISIONES.md, D.4). Quien
-- tenía uno de los antiguos vuelve a su inicial: el cliente ya no sabría pintarlo.
alter table public.room_players drop constraint room_players_avatar_check;

update public.room_players
set avatar = null
where avatar is not null
  and not avatar = any (array[
    'olive', 'churro', 'croquette', 'dice', 'watermelon', 'lemon',
    'omelette', 'popcorn', 'lantern', 'flip_flop', 'moon'
  ]);

create or replace function private.avatar_ids()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'olive', 'churro', 'croquette', 'dice', 'watermelon', 'lemon',
    'omelette', 'popcorn', 'lantern', 'flip_flop', 'moon'
  ];
$$;

revoke execute on function private.avatar_ids() from public, anon, authenticated;

alter table public.room_players add constraint room_players_avatar_check
  check (avatar is null or avatar = any (private.avatar_ids()));

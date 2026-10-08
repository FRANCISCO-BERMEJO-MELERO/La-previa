-- Seguridad (docs/CONTEXTO.md §4, "Seguridad").
-- Los clientes no tocan tablas: solo leen su fila de rooms (para Realtime) y llaman a RPC.

create schema private;

revoke all on schema private from public, anon, authenticated;
-- La política de rooms se evalúa como el usuario, así que necesita llegar a is_room_member.
grant usage on schema private to authenticated;

-- Supabase concede por defecto todo sobre public a anon y authenticated; se retira.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

create function private.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_players rp
    where rp.room_id = target_room_id
      and rp.user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_room_member(uuid) from public, anon;
grant execute on function private.is_room_member(uuid) to authenticated;

-- Única política del esquema: Realtime la necesita para entregar el cambio de version.
grant select on public.rooms to authenticated;

create policy rooms_select_member
on public.rooms
for select
to authenticated
using (private.is_room_member(id));

alter publication supabase_realtime add table public.rooms;

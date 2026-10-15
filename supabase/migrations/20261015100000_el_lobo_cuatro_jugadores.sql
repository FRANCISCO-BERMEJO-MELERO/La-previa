-- El lobo se juega desde 4 jugadores (docs/DECISIONES.md, D.3). Con 4 o 5 vale el reparto
-- recomendado de 6: un lobo, la vidente y aldeanos.
create or replace function private.luna_config(players integer, wolves integer, roles text[])
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  optional text[] := private.luna_optional_roles();
begin
  if players < 4 then
    perform private.raise_error('not_enough_players');
  end if;

  if wolves is null and roles is null then
    return private.luna_recommended_config(players);
  end if;

  if wolves is null
    or roles is null
    or exists (select 1 from unnest(roles) r where r is null or not r = any (optional))
    or (select count(distinct r) from unnest(roles) r) <> cardinality(roles)
    or wolves < 1
    or 2 * wolves >= players
    or wolves + 1 + cardinality(roles) > players - 1
  then
    perform private.raise_error('invalid_config');
  end if;

  return jsonb_build_object(
    'wolves', wolves,
    'roles', (
      select coalesce(jsonb_agg(o order by array_position(optional, o)), '[]'::jsonb)
      from unnest(optional) o
      where o = any (roles)
    )
  );
end;
$$;

revoke execute on function private.luna_config(integer, integer, text[])
from public, anon, authenticated;

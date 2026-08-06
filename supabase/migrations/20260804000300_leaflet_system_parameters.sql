-- Stable hidden parameters and explicit permission for leaflet bleed editing.
insert into public.calculation_permissions(role, permission)
values ('admin', 'calculation.bleed.edit')
on conflict do nothing;

create or replace function public.normalize_leaflet_calculation_payload()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_layouts integer := 1;
  v_bleed numeric := 2;
begin
  if new.product_type <> 'leaflet' then
    return new;
  end if;

  if jsonb_typeof(new.calculation_payload -> 'layouts_count') = 'number'
     and (new.calculation_payload ->> 'layouts_count')::numeric >= 1
     and trunc((new.calculation_payload ->> 'layouts_count')::numeric) = (new.calculation_payload ->> 'layouts_count')::numeric then
    v_layouts := (new.calculation_payload ->> 'layouts_count')::integer;
  end if;

  if jsonb_typeof(new.calculation_payload -> 'bleed_mm') = 'number'
     and (new.calculation_payload ->> 'bleed_mm')::numeric >= 0 then
    v_bleed := (new.calculation_payload ->> 'bleed_mm')::numeric;
  end if;

  new.calculation_payload :=
    (coalesce(new.calculation_payload, '{}'::jsonb)
      - 'hasDesign' - 'leadDays' - 'kind' - 'printMode')
    || jsonb_build_object(
      'leaflet_type', 'twoSided',
      'print_method', 'offset',
      'layouts_count', v_layouts,
      'bleed_mm', v_bleed
    );
  return new;
end;
$$;

drop trigger if exists normalize_leaflet_calculation_payload on public.calculations;
create trigger normalize_leaflet_calculation_payload
before insert on public.calculations
for each row execute function public.normalize_leaflet_calculation_payload();

revoke all on function public.normalize_leaflet_calculation_payload()
from public, anon, authenticated;

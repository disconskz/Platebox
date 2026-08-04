-- Security and performance follow-up after Supabase advisors.
alter table public.calculation_number_sequences enable row level security;
revoke all on table public.calculation_number_sequences from anon, authenticated;
create policy "No direct sequence access"
  on public.calculation_number_sequences
  for all to authenticated
  using (false) with check (false);

create policy "Users read own calculation permissions"
  on public.calculation_permissions
  for select to authenticated
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = calculation_permissions.role
  ));

revoke all on function public.prepare_calculation_insert(),
  public.enforce_calculation_permissions(),
  public.audit_calculation_change()
from public, anon, authenticated;

alter function public.has_calculation_permission(text, uuid) security invoker;

create index if not exists calculation_history_user_idx
  on public.calculation_history(user_id);

drop index if exists public.calculations_client_idx;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions')
     and exists (select 1 from pg_extension where extname = 'pg_trgm') then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;

-- Calculation identity, customer metadata and lifecycle.
create extension if not exists pg_trgm;

alter table public.clients
  add column if not exists contact_name text,
  add column if not exists phone text,
  add column if not exists phone_normalized text generated always as (regexp_replace(coalesce(phone, ''), '\\D', '', 'g')) stored;

create table if not exists public.calculation_number_sequences (
  year integer primary key,
  last_value bigint not null default 0
);

insert into public.system_settings(key, value, description)
values ('calculation_number_format', 'РС-{YYYY}-{SEQ:6}', 'Формат номера расчёта')
on conflict (key) do nothing;

create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists lead_sources_name_ci_uidx on public.lead_sources(lower(name));
insert into public.lead_sources(name, sort_order) values
 ('WhatsApp',10),('Instagram',20),('TikTok',30),('Telegram',40),('сайт',50),
 ('телефон',60),('повторный клиент',70),('рекомендация',80),('самостоятельный поиск',90),('другое',100)
on conflict do nothing;

alter table public.calculations
  add column if not exists calculation_number text,
  add column if not exists calculation_date date not null default current_date,
  add column if not exists responsible_user_id uuid references auth.users(id),
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists lead_source_id uuid references public.lead_sources(id),
  add column if not exists comment text,
  add column if not exists source_calculation_id uuid references public.calculations(id),
  add column if not exists status text not null default 'active',
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id),
  add column if not exists calculation_payload jsonb not null default '{}'::jsonb,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

alter table public.calculations drop constraint if exists calculations_status_check;
alter table public.calculations add constraint calculations_status_check check (status in ('active','archived'));
create unique index if not exists calculations_number_uidx on public.calculations(calculation_number) where calculation_number is not null;
create index if not exists calculations_date_idx on public.calculations(calculation_date desc);
create index if not exists calculations_status_idx on public.calculations(status, calculation_date desc);
create index if not exists calculations_client_idx on public.calculations(client_id);
create index if not exists calculations_responsible_idx on public.calculations(responsible_user_id);
create index if not exists calculations_source_idx on public.calculations(source_calculation_id);
create index if not exists calculations_name_trgm_idx on public.calculations using gin(name gin_trgm_ops);
create index if not exists clients_name_trgm_idx on public.clients using gin(name gin_trgm_ops);
create index if not exists clients_contact_trgm_idx on public.clients using gin(contact_name gin_trgm_ops);
create index if not exists clients_phone_normalized_idx on public.clients(phone_normalized);

create table if not exists public.calculation_permissions (
  role public.app_role not null,
  permission text not null,
  primary key(role, permission)
);
insert into public.calculation_permissions(role, permission)
select r, p from unnest(enum_range(null::public.app_role)) r cross join unnest(array[
 'calculation.create','calculation.view','calculation.edit','calculation.copy','calculation.archive','calculation.restore'
]) p on conflict do nothing;
insert into public.calculation_permissions(role, permission) values
 ('admin','calculation.number.edit'),('admin','calculation.date.edit'),('admin','calculation.responsible.edit'),
 ('admin','lead_sources.manage'),('admin','calculation.delete') on conflict do nothing;

create table if not exists public.calculation_history (
  id bigint generated always as identity primary key,
  calculation_id uuid not null references public.calculations(id) on delete restrict,
  event_type text not null,
  old_value jsonb,
  new_value jsonb,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists calculation_history_calc_idx on public.calculation_history(calculation_id, created_at desc);

create or replace function public.has_calculation_permission(_permission text, _user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles ur join public.calculation_permissions cp using(role)
    where ur.user_id=_user_id and cp.permission=_permission)
$$;

create or replace function public.next_calculation_number()
returns text language plpgsql security definer set search_path=public as $$
declare v_year integer := extract(year from current_date); v_seq bigint; v_fmt text;
begin
  insert into calculation_number_sequences(year,last_value) values(v_year,1)
  on conflict(year) do update set last_value=calculation_number_sequences.last_value+1
  returning last_value into v_seq;
  select value into v_fmt from system_settings where key='calculation_number_format';
  v_fmt := coalesce(v_fmt,'РС-{YYYY}-{SEQ:6}');
  return replace(replace(v_fmt,'{YYYY}',v_year::text),'{SEQ:6}',lpad(v_seq::text,6,'0'));
end $$;

create or replace function public.prepare_calculation_insert()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.calculation_number is null then new.calculation_number := next_calculation_number(); end if;
  new.user_id := coalesce(new.user_id, auth.uid());
  new.responsible_user_id := coalesce(new.responsible_user_id, auth.uid());
  return new;
end $$;
drop trigger if exists prepare_calculation_insert on public.calculations;
create trigger prepare_calculation_insert before insert on public.calculations for each row execute function public.prepare_calculation_insert();

create or replace function public.enforce_calculation_permissions()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.calculation_number is distinct from new.calculation_number and not has_calculation_permission('calculation.number.edit') then raise exception 'permission_denied:number'; end if;
  if old.calculation_date is distinct from new.calculation_date and not has_calculation_permission('calculation.date.edit') then raise exception 'permission_denied:date'; end if;
  if old.responsible_user_id is distinct from new.responsible_user_id and not has_calculation_permission('calculation.responsible.edit') then raise exception 'permission_denied:responsible'; end if;
  if old.status is distinct from new.status and current_setting('app.lifecycle_rpc', true) is distinct from 'on' then raise exception 'use_lifecycle_rpc'; end if;
  return new;
end $$;
drop trigger if exists enforce_calculation_permissions on public.calculations;
create trigger enforce_calculation_permissions before update on public.calculations for each row execute function public.enforce_calculation_permissions();

create or replace function public.audit_calculation_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into calculation_history(calculation_id,event_type,new_value,user_id) values(new.id,'created',to_jsonb(new),auth.uid());
  elsif old.calculation_number is distinct from new.calculation_number then
    insert into calculation_history(calculation_id,event_type,old_value,new_value,user_id) values(new.id,'number_changed',to_jsonb(old.calculation_number),to_jsonb(new.calculation_number),auth.uid());
  end if;
  if tg_op='UPDATE' and old.calculation_date is distinct from new.calculation_date then
    insert into calculation_history(calculation_id,event_type,old_value,new_value,user_id) values(new.id,'date_changed',to_jsonb(old.calculation_date),to_jsonb(new.calculation_date),auth.uid());
  end if;
  if tg_op='UPDATE' and old.responsible_user_id is distinct from new.responsible_user_id then
    insert into calculation_history(calculation_id,event_type,old_value,new_value,user_id) values(new.id,'responsible_changed',to_jsonb(old.responsible_user_id),to_jsonb(new.responsible_user_id),auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists audit_calculation_change on public.calculations;
create trigger audit_calculation_change after insert or update on public.calculations for each row execute function public.audit_calculation_change();

create or replace function public.copy_calculation(_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare src calculations%rowtype; new_id uuid;
begin
  if not has_calculation_permission('calculation.copy') then raise exception 'permission_denied'; end if;
  select * into src from calculations where id=_id and user_id=auth.uid();
  if not found then raise exception 'not_found'; end if;
  insert into calculations(name,product_type,category,circulation,format_type,format_width,format_height,color_front,color_back,
    material_id,print_format_width,print_format_height,items_per_sheet,is_rotated,turnaround_type,forms_count,forms_cost,forms_prep_cost,
    setup_sheets,purchase_sheets,paper_cost,paper_cut_cost,print_sheets,print_cost,ink_cost,postpress,total_cost,margin_percent,sale_price,profit,
    client_id,contact_name,contact_phone,lead_source_id,comment,source_calculation_id,calculation_payload,pricing_snapshot,user_id,responsible_user_id)
  values(src.name,src.product_type,src.category,src.circulation,src.format_type,src.format_width,src.format_height,src.color_front,src.color_back,
    src.material_id,src.print_format_width,src.print_format_height,src.items_per_sheet,src.is_rotated,src.turnaround_type,src.forms_count,src.forms_cost,src.forms_prep_cost,
    src.setup_sheets,src.purchase_sheets,src.paper_cost,src.paper_cut_cost,src.print_sheets,src.print_cost,src.ink_cost,src.postpress,src.total_cost,src.margin_percent,src.sale_price,src.profit,
    src.client_id,src.contact_name,src.contact_phone,src.lead_source_id,src.comment,src.id,src.calculation_payload,src.pricing_snapshot,auth.uid(),auth.uid()) returning id into new_id;
  insert into calculation_items(calculation_id,stage,sort_order,name,quantity,unit,unit_price,total_price,is_editable,manual_price)
    select new_id,stage,sort_order,name,quantity,unit,unit_price,total_price,is_editable,manual_price from calculation_items where calculation_id=_id;
  insert into calculation_history(calculation_id,event_type,new_value,user_id) values(new_id,'copied',jsonb_build_object('source_calculation_id',_id),auth.uid());
  return new_id;
end $$;

create or replace function public.set_calculation_archived(_id uuid, _archived boolean) returns void language plpgsql security definer set search_path=public as $$
declare evt text;
begin
  if not has_calculation_permission(case when _archived then 'calculation.archive' else 'calculation.restore' end) then raise exception 'permission_denied'; end if;
  perform set_config('app.lifecycle_rpc','on',true);
  update calculations set status=case when _archived then 'archived' else 'active' end,
    archived_at=case when _archived then now() else null end, archived_by=case when _archived then auth.uid() else null end
    where id=_id and user_id=auth.uid();
  if not found then raise exception 'not_found'; end if;
  evt := case when _archived then 'archived' else 'restored' end;
  insert into calculation_history(calculation_id,event_type,new_value,user_id) values(_id,evt,jsonb_build_object('status',case when _archived then 'archived' else 'active' end),auth.uid());
end $$;

alter table public.lead_sources enable row level security;
alter table public.calculation_permissions enable row level security;
alter table public.calculation_history enable row level security;
drop policy if exists "Users delete own calculations" on public.calculations;
create policy "Admins delete calculations" on public.calculations for delete to authenticated using(has_calculation_permission('calculation.delete'));
create policy "Authenticated read lead sources" on public.lead_sources for select to authenticated using(true);
create policy "Admins manage lead sources" on public.lead_sources for all to authenticated using(has_calculation_permission('lead_sources.manage')) with check(has_calculation_permission('lead_sources.manage'));
create policy "Users read calculation history" on public.calculation_history for select to authenticated using(exists(select 1 from calculations c where c.id=calculation_id and c.user_id=auth.uid()));
revoke all on function public.next_calculation_number() from public, anon, authenticated;
grant execute on function public.copy_calculation(uuid), public.set_calculation_archived(uuid,boolean), public.has_calculation_permission(text,uuid) to authenticated;

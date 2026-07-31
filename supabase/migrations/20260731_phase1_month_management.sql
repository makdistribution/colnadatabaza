create table if not exists public.app_state (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  active_month date not null,
  active_report_year integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.months (
  month_start date primary key,
  status text not null default 'active' check (status in ('active', 'closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.customs_records (
  id text primary key,
  month_start date not null references public.months(month_start),
  zakaznik text not null,
  is_new boolean not null default true,
  bell boolean not null default false,
  alert boolean not null default false,
  datum_colnice date not null,
  spz text not null default '',
  ref_na_fa text not null default '',
  uk_to_eu text not null default '',
  eu_to_uk text not null default '',
  fa_od_uk_agent numeric(12, 2) not null default 0,
  fa_od_eu_agent numeric(12, 2) not null default 0,
  fa_klient numeric(12, 2) not null default 0,
  int_poznamka text not null default '',
  zisk numeric(12, 2) not null default 0,
  cislo_fa text not null default '',
  splatna date,
  zaplatena boolean not null default false,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customs_records_month_start_idx
  on public.customs_records(month_start);

create table if not exists public.monthly_reports (
  month_start date primary key references public.months(month_start),
  report_year integer not null,
  report_month integer not null check (report_month between 1 and 12),
  record_count integer not null default 0,
  total_revenue numeric(14, 2) not null default 0,
  total_costs numeric(14, 2) not null default 0,
  total_profit numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.refresh_monthly_report(target_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.monthly_reports
  set
    record_count = totals.record_count,
    total_revenue = totals.total_revenue,
    total_costs = totals.total_costs,
    total_profit = totals.total_profit,
    updated_at = now()
  from (
    select
      count(*)::integer as record_count,
      coalesce(sum(fa_klient), 0) as total_revenue,
      coalesce(sum(fa_od_uk_agent + fa_od_eu_agent), 0) as total_costs,
      coalesce(sum(zisk), 0) as total_profit
    from public.customs_records
    where month_start = target_month
  ) totals
  where monthly_reports.month_start = target_month;
end;
$$;

create or replace function public.refresh_changed_monthly_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_monthly_report(old.month_start);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op <> 'UPDATE' or new.month_start <> old.month_start) then
    perform public.refresh_monthly_report(new.month_start);
  elsif tg_op = 'UPDATE' then
    perform public.refresh_monthly_report(new.month_start);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_monthly_report_after_record_change on public.customs_records;
create trigger refresh_monthly_report_after_record_change
after insert or update or delete on public.customs_records
for each row execute function public.refresh_changed_monthly_report();

create or replace function public.close_current_month(close_year boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_month date;
  next_month date;
  current_year integer;
  current_month_number integer;
begin
  select active_month
  into current_month
  from public.app_state
  where singleton_id = 1
  for update;

  if current_month is null then
    raise exception 'Application state has not been initialized.';
  end if;

  current_year := extract(year from current_month)::integer;
  current_month_number := extract(month from current_month)::integer;

  if current_month_number = 12 and not close_year then
    raise exception 'Year closing confirmation is required for December.';
  end if;

  if not exists (
    select 1 from public.months
    where month_start = current_month and status = 'active'
  ) then
    raise exception 'The active month is already closed.';
  end if;

  insert into public.monthly_reports (
    month_start,
    report_year,
    report_month,
    record_count,
    total_revenue,
    total_costs,
    total_profit
  )
  select
    current_month,
    current_year,
    current_month_number,
    count(*)::integer,
    coalesce(sum(fa_klient), 0),
    coalesce(sum(fa_od_uk_agent + fa_od_eu_agent), 0),
    coalesce(sum(zisk), 0)
  from public.customs_records
  where month_start = current_month
  on conflict (month_start) do update set
    record_count = excluded.record_count,
    total_revenue = excluded.total_revenue,
    total_costs = excluded.total_costs,
    total_profit = excluded.total_profit,
    updated_at = now();

  update public.customs_records
  set is_closed = true, updated_at = now()
  where month_start = current_month;

  update public.months
  set status = 'closed', closed_at = now()
  where month_start = current_month;

  next_month := (current_month + interval '1 month')::date;

  insert into public.months (month_start, status)
  values (next_month, 'active')
  on conflict (month_start) do update set status = 'active', closed_at = null;

  update public.app_state
  set
    active_month = next_month,
    active_report_year = case
      when current_month_number = 12 and close_year then extract(year from next_month)::integer
      else active_report_year
    end,
    updated_at = now()
  where singleton_id = 1;

  return jsonb_build_object(
    'closedMonth', current_month,
    'nextMonth', next_month,
    'closedYear', current_month_number = 12 and close_year,
    'activeReportYear', case
      when current_month_number = 12 and close_year then extract(year from next_month)::integer
      else (select active_report_year from public.app_state where singleton_id = 1)
    end
  );
end;
$$;

alter table public.app_state enable row level security;
alter table public.months enable row level security;
alter table public.customs_records enable row level security;
alter table public.monthly_reports enable row level security;

revoke all on public.app_state from anon, authenticated;
revoke all on public.months from anon, authenticated;
revoke all on public.customs_records from anon, authenticated;
revoke all on public.monthly_reports from anon, authenticated;
revoke execute on function public.refresh_monthly_report(date) from public, anon, authenticated;
revoke execute on function public.refresh_changed_monthly_report() from public, anon, authenticated;
revoke execute on function public.close_current_month(boolean) from public, anon, authenticated;
grant execute on function public.close_current_month(boolean) to service_role;

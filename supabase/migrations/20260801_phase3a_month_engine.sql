create or replace function public.initialize_app_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  initialized_month date;
begin
  select active_month
  into initialized_month
  from public.app_state
  where singleton_id = 1;

  if initialized_month is not null then
    return jsonb_build_object(
      'activeMonth', initialized_month,
      'activeReportYear', extract(year from initialized_month)::integer,
      'created', false
    );
  end if;

  select month_start
  into initialized_month
  from public.months
  where status = 'active'
  order by month_start desc
  limit 1;

  if initialized_month is null then
    initialized_month := date_trunc(
      'month',
      timezone('Europe/Bratislava', now())
    )::date;

    insert into public.months (month_start, status)
    values (initialized_month, 'active')
    on conflict (month_start) do update
      set status = 'active', closed_at = null;
  end if;

  insert into public.app_state (
    singleton_id,
    active_month,
    active_report_year,
    updated_at
  )
  values (
    1,
    initialized_month,
    extract(year from initialized_month)::integer,
    now()
  )
  on conflict (singleton_id) do nothing;

  return jsonb_build_object(
    'activeMonth', initialized_month,
    'activeReportYear', extract(year from initialized_month)::integer,
    'created', true
  );
end;
$$;

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
  next_year integer;
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
  next_month := (current_month + interval '1 month')::date;
  next_year := extract(year from next_month)::integer;

  if current_month_number = 12 and not close_year then
    raise exception 'Year closing confirmation is required for December.';
  end if;

  if not exists (
    select 1
    from public.months
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

  if current_month_number = 12 then
    update public.app_state
    set active_report_year = next_year, updated_at = now()
    where singleton_id = 1;
  end if;

  insert into public.months (month_start, status)
  values (next_month, 'active')
  on conflict (month_start) do update
    set status = 'active', closed_at = null;

  update public.customs_records
  set is_closed = false, updated_at = now()
  where month_start = next_month;

  update public.app_state
  set
    active_month = next_month,
    active_report_year = case
      when current_month_number = 12 then next_year
      else current_year
    end,
    updated_at = now()
  where singleton_id = 1;

  return jsonb_build_object(
    'closedMonth', current_month,
    'nextMonth', next_month,
    'closedYear', current_month_number = 12,
    'activeReportYear', case
      when current_month_number = 12 then next_year
      else current_year
    end
  );
end;
$$;

do $$
declare
  business_month date := date_trunc(
    'month',
    timezone('Europe/Bratislava', now())
  )::date;
  persisted_active_month date;
begin
  select active_month
  into persisted_active_month
  from public.app_state
  where singleton_id = 1;

  if persisted_active_month > business_month then
    update public.months
    set status = 'closed', closed_at = coalesce(closed_at, now())
    where status = 'active';

    delete from public.monthly_reports report
    where report.month_start >= business_month
      and not exists (
        select 1
        from public.customs_records record
        where record.month_start = report.month_start
      );

    delete from public.months month
    where month.month_start > business_month
      and month.status = 'closed'
      and not exists (
        select 1
        from public.customs_records record
        where record.month_start = month.month_start
      )
      and not exists (
        select 1
        from public.monthly_reports report
        where report.month_start = month.month_start
      );

    insert into public.months (month_start, status)
    values (business_month, 'active')
    on conflict (month_start) do update
      set status = 'active', closed_at = null;

    update public.customs_records
    set
      is_closed = month_start <> business_month,
      updated_at = now()
    where month_start >= business_month;

    update public.app_state
    set
      active_month = business_month,
      active_report_year = extract(year from business_month)::integer,
      updated_at = now()
    where singleton_id = 1;
  end if;
end;
$$;

create unique index if not exists months_single_active_idx
  on public.months (status)
  where status = 'active';

revoke execute on function public.initialize_app_state() from public, anon, authenticated;
grant execute on function public.initialize_app_state() to service_role;

revoke execute on function public.close_current_month(boolean) from public, anon, authenticated;
grant execute on function public.close_current_month(boolean) to service_role;

notify pgrst, 'reload schema';

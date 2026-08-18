-- Adds a persistent "VYPLATENÉ" (paid out) flag on monthly reports, confirmed via in-app PIN.
alter table public.monthly_reports
  add column if not exists is_paid boolean not null default false;

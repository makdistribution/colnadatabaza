-- Add col_konanie column to customs_records table (COL. KONANIE amount)
-- This column was missing from the initial schema — the UI collected the value
-- but it was never persisted, causing "data not showing" after save.

alter table public.customs_records
  add column if not exists col_konanie numeric(12, 2) not null default 0;

-- Backfill existing rows:
-- col_konanie = fa_klient minus the auto surcharges (ICS2 €25 + GB ENS €25),
-- matching the fallback logic used on the client when the field is absent.
update public.customs_records
set col_konanie = greatest(
  0,
  coalesce(fa_klient, 0)
  - (case when uk_to_eu like '%ICS2%' then 25 else 0 end)
  - (case when eu_to_uk like '%GB ENS%' then 25 else 0 end)
)
where col_konanie = 0
  and coalesce(fa_klient, 0) > 0;

create index if not exists customs_records_col_konanie_idx
  on public.customs_records(col_konanie);

-- Consolidate packed customs notes into a single column: oprava_faktury.
-- The physical column previously named int_poznamka stores POZNÁMKA + OPRAVA + clip flags.
-- If migration 20260803 added a redundant empty oprava_faktury column, drop it first.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customs_records'
      and column_name = 'oprava_faktury'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customs_records'
      and column_name = 'int_poznamka'
  ) then
    if exists (
      select 1
      from public.customs_records
      where btrim(oprava_faktury) <> ''
    ) then
      raise exception 'Migration aborted: redundant customs_records.oprava_faktury column contains data.';
    end if;

    alter table public.customs_records drop column oprava_faktury;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customs_records'
      and column_name = 'int_poznamka'
  ) then
    alter table public.customs_records rename column int_poznamka to oprava_faktury;
  end if;
end $$;

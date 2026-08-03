-- Separate invoice-correction instructions from general customs notes.
alter table public.customs_records
  add column if not exists oprava_faktury text not null default '';

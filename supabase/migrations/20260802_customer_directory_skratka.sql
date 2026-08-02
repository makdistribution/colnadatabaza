-- Short customer name for ZÁKAZNÍK dropdown (manual entry, never auto-generated)
alter table public.customer_directory
  add column if not exists skratka text not null default '';

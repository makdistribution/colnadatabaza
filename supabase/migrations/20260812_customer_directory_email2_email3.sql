-- Add optional EMAIL 2 and EMAIL 3 for customer directory.
-- Existing `email` (EMAIL 1) is preserved unchanged.

alter table public.customer_directory
  add column if not exists email2 text not null default '';

alter table public.customer_directory
  add column if not exists email3 text not null default '';

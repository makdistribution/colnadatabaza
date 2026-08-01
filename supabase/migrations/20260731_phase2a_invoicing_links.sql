alter table public.customs_records
  add column if not exists invoice_token_hash text,
  add column if not exists invoicing_email_claimed_at timestamptz,
  add column if not exists invoicing_email_sent_at timestamptz;

create unique index if not exists customs_records_invoice_token_hash_idx
  on public.customs_records(invoice_token_hash)
  where invoice_token_hash is not null;

notify pgrst, 'reload schema';

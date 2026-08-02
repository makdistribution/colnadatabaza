-- One-time backfill: permanent case-link tokens for ALL customs records.
--
-- Contract:
--   invoice_token_hash stores a permanent unique access token used in ?invoiceToken=
--   Format: 43-char base64url ([A-Za-z0-9_-]{43}) from 32 random bytes
--
-- Rules:
--   - Assign a token immediately to every record missing a valid permanent token
--   - Replace legacy SHA-256 hex digests (64 hex chars) with permanent tokens
--   - Never change a record that already has a valid permanent token
--   - Updates ONLY invoice_token_hash (no other customs_records columns)
--
-- Monthly-report refresh trigger is disabled for this backfill so report rows
-- are not touched when only the token column changes.

create extension if not exists pgcrypto;

alter table public.customs_records
  disable trigger refresh_monthly_report_after_record_change;

do $$
declare
  r record;
  new_token text;
  attempts integer;
begin
  for r in
    select id
    from public.customs_records
    where invoice_token_hash is null
       or invoice_token_hash !~ '^[A-Za-z0-9_-]{43}$'
  loop
    attempts := 0;
    loop
      attempts := attempts + 1;
      new_token := rtrim(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
      begin
        update public.customs_records
        set invoice_token_hash = new_token
        where id = r.id;
        exit;
      exception
        when unique_violation then
          if attempts >= 10 then
            raise exception 'Could not generate unique permanent token for record %', r.id;
          end if;
      end;
    end loop;
  end loop;
end $$;

alter table public.customs_records
  enable trigger refresh_monthly_report_after_record_change;

-- Fail the migration if any non-permanent token remains.
do $$
declare
  remaining integer;
begin
  select count(*)::integer
  into remaining
  from public.customs_records
  where invoice_token_hash is null
     or invoice_token_hash !~ '^[A-Za-z0-9_-]{43}$';

  if remaining > 0 then
    raise exception
      'Permanent token backfill incomplete: % customs_records still lack a valid permanent token',
      remaining;
  end if;
end $$;

notify pgrst, 'reload schema';

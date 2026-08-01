alter table public.customs_records
  add column if not exists invoice_pdf_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'invoice-pdfs',
  'invoice-pdfs',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- Directory, login credentials, invoice info, and app documents
-- Multi-user persistent storage (service_role only via API)

create table if not exists public.customer_directory (
  id text primary key,
  p_c text not null default '',
  nazov_firmy text not null default '',
  registrovana_adresa text not null default '',
  krajina text not null default '',
  ico text not null default '',
  dic text not null default '',
  ic_dph text not null default '',
  telefonne_cislo text not null default '',
  email text not null default '',
  poznamka text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.login_credentials (
  id text primary key,
  sluzba text not null default '',
  odkaz text not null default '',
  prihlasenie text not null default '',
  heslo text not null default '',
  kategoria text not null default 'I' check (kategoria in ('I', 'II')),
  poznamka text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_info_records (
  id text primary key,
  nazov text not null default '',
  popis text not null default '',
  dolezite_alert boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_documents (
  id text primary key,
  name text not null,
  note text not null default '',
  size_label text not null default '',
  size_bytes bigint not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists app_documents_created_at_idx
  on public.app_documents (created_at desc);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'app-documents',
  'app-documents',
  false,
  52428800,
  null
)
on conflict (id) do nothing;

alter table public.customer_directory enable row level security;
alter table public.login_credentials enable row level security;
alter table public.invoice_info_records enable row level security;
alter table public.app_documents enable row level security;

revoke all on public.customer_directory from anon, authenticated;
revoke all on public.login_credentials from anon, authenticated;
revoke all on public.invoice_info_records from anon, authenticated;
revoke all on public.app_documents from anon, authenticated;

notify pgrst, 'reload schema';

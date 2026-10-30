-- Sakara · migrasi 005: panel admin. Aman dijalankan ulang.
-- admins: akun admin (sandi disimpan sebagai hash scrypt oleh server). Tidak bisa dibaca dari browser.
create table if not exists public.admins (
  id bigint generated always as identity primary key,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,40}$'),
  email text not null default '',
  pass_hash text not null,
  must_change boolean not null default false,
  created_at timestamptz not null default now(),
  last_login timestamptz
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant all on public.admins to service_role;

-- app_config: pengaturan yang diatur dari panel admin (tema, fitur, harga).
-- Semua orang boleh MEMBACA (aplikasi butuh), hanya server (service role) yang boleh mengubah.
create table if not exists public.app_config (
  key text primary key check (key in ('themes','features','prices')),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
alter table public.app_config enable row level security;
drop policy if exists app_config_read on public.app_config;
create policy app_config_read on public.app_config for select to anon, authenticated using (true);
revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to anon, authenticated;
grant all on public.app_config to service_role;

-- Satu baris per pengguna: email, nama, paket, status, jumlah tamu (untuk panel admin, hanya service role)
create or replace view public.admin_users as
select u.id, u.email, coalesce(u.raw_user_meta_data->>'name','') as name, u.created_at, u.last_sign_in_at,
  u.banned_until,
  i.id as invitation_id, i.slug, i.plan, i.published, i.updated_at as inv_updated,
  coalesce(i.data->'bride'->>'nick', i.data->'bride'->>'name','') as bride,
  coalesce(i.data->'groom'->>'nick', i.data->'groom'->>'name','') as groom,
  coalesce(i.data->>'theme','') as theme,
  (select count(*) from public.guests g where g.invitation_id = i.id) as guests,
  (select count(*) from public.guests g where g.invitation_id = i.id and g.status = 'hadir') as hadir,
  (select coalesce(sum(v.total),0) from public.invoices v where v.owner = u.id and v.status = 'paid') as paid_total
from auth.users u left join public.invitations i on i.owner = u.id;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to service_role;

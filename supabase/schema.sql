-- Sahitya · skema database Supabase
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.

create extension if not exists pgcrypto;

-- ============ TABEL ============
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  data jsonb not null default '{}'::jsonb,
  plan text not null default 'coba' check (plan in ('coba','undangan','tamu')),
  published boolean not null default false,
  checkin_pin text not null default lpad((floor(random()*1000000))::int::text, 6, '0'),
  gift_no int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists invitations_owner_key on public.invitations(owner);

create table if not exists public.guests (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) between 1 and 120),
  phone text not null default '',
  grp text not null default 'Tanpa grup',
  sessions int[] not null default '{}',
  code text not null,
  status text not null default 'belum' check (status in ('belum','hadir','tidak')),
  pax int not null default 0 check (pax between 0 and 20),
  sent boolean not null default false,
  walkin boolean not null default false,
  checkin jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (invitation_id, id),
  unique (invitation_id, code)
);

create table if not exists public.wishes (
  id bigint generated always as identity primary key,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  message text not null check (char_length(message) between 1 and 600),
  attending boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_confirmations (
  id bigint generated always as identity primary key,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  amount bigint not null default 0 check (amount >= 0),
  bank text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  owner uuid not null references auth.users(id) on delete cascade,
  item text not null,
  plan text not null,
  price int not null,
  discount int not null default 0,
  voucher text not null default '',
  total int not null,
  method text not null default '',
  status text not null default 'pending' check (status in ('pending','paid','expired','failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ============ PROTEKSI KOLOM ============
-- Paket, status publikasi, dan nomor kado hanya boleh diubah server (webhook) atau fungsi check-in.
create or replace function public.protect_invitation() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' and coalesce(current_setting('satupadu.bypass', true),'') <> 'on' then
    if tg_op = 'INSERT' then
      new.plan := 'coba'; new.published := false; new.gift_no := 0; new.owner := auth.uid();
    else
      new.plan := old.plan; new.published := old.published; new.gift_no := old.gift_no;
      new.owner := old.owner; new.checkin_pin := old.checkin_pin;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists protect_invitation on public.invitations;
create trigger protect_invitation before insert or update on public.invitations
  for each row execute function public.protect_invitation();

-- ============ ROW LEVEL SECURITY ============
alter table public.invitations enable row level security;
alter table public.guests enable row level security;
alter table public.wishes enable row level security;
alter table public.gift_confirmations enable row level security;
alter table public.invoices enable row level security;

create or replace function public.owns(p_inv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from invitations where id = p_inv and owner = auth.uid());
$$;

drop policy if exists inv_owner on public.invitations;
create policy inv_owner on public.invitations for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists guests_owner on public.guests;
create policy guests_owner on public.guests for all to authenticated
  using (public.owns(invitation_id)) with check (public.owns(invitation_id));

drop policy if exists wishes_owner_read on public.wishes;
create policy wishes_owner_read on public.wishes for select to authenticated using (public.owns(invitation_id));
drop policy if exists wishes_owner_update on public.wishes;
create policy wishes_owner_update on public.wishes for update to authenticated using (public.owns(invitation_id)) with check (public.owns(invitation_id));
drop policy if exists wishes_owner_delete on public.wishes;
create policy wishes_owner_delete on public.wishes for delete to authenticated using (public.owns(invitation_id));

drop policy if exists gifts_owner_read on public.gift_confirmations;
create policy gifts_owner_read on public.gift_confirmations for select to authenticated using (public.owns(invitation_id));

drop policy if exists invoices_owner_read on public.invoices;
create policy invoices_owner_read on public.invoices for select to authenticated using (owner = auth.uid());

-- ============ FUNGSI PUBLIK (tamu & penerima tamu) ============
create or replace function public.gen_code() returns text
language sql volatile as $$
  select 'SP-' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random()*32)::int, 1), '')
  from generate_series(1,4);
$$;

create or replace function public.guest_json(g public.guests) returns jsonb
language sql immutable as $$
  select jsonb_build_object('id',g.id,'name',g.name,'code',g.code,'sessions',g.sessions,'status',g.status,'pax',g.pax,
    'grp',g.grp,'phone',g.phone,'sent',g.sent,'walkin',g.walkin,'checkin',g.checkin);
$$;

-- Undangan publik untuk tamu (hanya yang sudah dipublikasikan)
create or replace function public.get_public_invitation(p_slug text, p_code text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv invitations; g guests; w jsonb;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then return null; end if;
  if p_code is not null and p_code <> '' then
    select * into g from guests where invitation_id = inv.id and code = upper(p_code);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name',x.name,'message',x.message,'attending',x.attending,'created_at',x.created_at) order by x.created_at desc), '[]'::jsonb)
    into w from (select * from wishes where invitation_id = inv.id and not hidden order by created_at desc limit 30) x;
  return jsonb_build_object('slug', inv.slug, 'plan', inv.plan, 'data', inv.data, 'wishes', w,
    'guest', case when g.id is null then null else
      jsonb_build_object('id',g.id,'name',g.name,'code',g.code,'sessions',g.sessions,'status',g.status,'pax',g.pax) end);
end $$;

create or replace function public.rsvp(p_slug text, p_code text, p_name text, p_status text, p_pax int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; g guests; c text; n int := 0; v_pax int;
begin
  if p_status not in ('hadir','tidak') then raise exception 'Status tidak valid'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Nama wajib diisi'; end if;
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  v_pax := case when p_status = 'hadir' then greatest(1, least(coalesce(p_pax,1), 12)) else 0 end;
  if p_code is not null and p_code <> '' then
    select * into g from guests where invitation_id = inv.id and code = upper(p_code);
  end if;
  if g.id is null then
    loop
      c := gen_code(); n := n + 1;
      exit when not exists(select 1 from guests where invitation_id = inv.id and code = c) or n > 30;
    end loop;
    insert into guests(invitation_id, id, name, grp, code, status, pax, sent)
    values (inv.id, 'r' || replace(gen_random_uuid()::text,'-',''), left(trim(p_name),120), 'Lewat undangan', c, p_status, v_pax, true)
    returning * into g;
  else
    update guests set status = p_status, pax = v_pax, updated_at = now()
    where invitation_id = inv.id and id = g.id returning * into g;
  end if;
  return jsonb_build_object('id',g.id,'name',g.name,'code',g.code,'sessions',g.sessions,'status',g.status,'pax',g.pax);
end $$;

create or replace function public.add_wish(p_slug text, p_name text, p_message text, p_code text default null) returns void
language plpgsql security definer set search_path = public as $$
declare inv invitations; att boolean := false;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  if p_code is not null and p_code <> '' then
    select status = 'hadir' into att from guests where invitation_id = inv.id and code = upper(p_code);
  end if;
  insert into wishes(invitation_id, name, message, attending) values (inv.id, left(trim(p_name),80), left(trim(p_message),600), coalesce(att,false));
end $$;

create or replace function public.add_gift(p_slug text, p_name text, p_amount bigint) returns void
language plpgsql security definer set search_path = public as $$
declare inv invitations;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  insert into gift_confirmations(invitation_id, name, amount, bank)
  values (inv.id, left(trim(p_name),80), greatest(0, coalesce(p_amount,0)), coalesce(inv.data->'gift'->>'bank',''));
end $$;

-- Penerima tamu (pakai PIN 6 angka, hanya paket Undangan + Tamu)
create or replace function public.ci_inv(p_slug text, p_pin text) returns public.invitations
language plpgsql stable security definer set search_path = public as $$
declare inv invitations;
begin
  select * into inv from invitations where slug = lower(p_slug) and checkin_pin = p_pin;
  if not found then raise exception 'PIN salah'; end if;
  if inv.plan <> 'tamu' then raise exception 'Check-in hanya ada di paket Undangan + Tamu'; end if;
  return inv;
end $$;

create or replace function public.ci_guests(p_slug text, p_pin text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv invitations; gs jsonb;
begin
  inv := ci_inv(p_slug, p_pin);
  select coalesce(jsonb_agg(guest_json(g) order by g.name), '[]'::jsonb) into gs from guests g where g.invitation_id = inv.id;
  return jsonb_build_object('data', inv.data, 'gift_no', inv.gift_no, 'guests', gs);
end $$;

create or replace function public.ci_checkin(p_slug text, p_pin text, p_id text, p_pax int, p_gift boolean, p_session int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; g guests; no int;
begin
  inv := ci_inv(p_slug, p_pin);
  perform set_config('satupadu.bypass', 'on', true);
  if p_gift then update invitations set gift_no = gift_no + 1 where id = inv.id returning gift_no into no; end if;
  update guests set
    checkin = jsonb_build_object('ts', floor(extract(epoch from now())*1000), 'time', to_char(now() at time zone 'Asia/Jakarta','HH24.MI'),
      'pax', greatest(1, least(coalesce(p_pax,1), 20)), 'gift', no, 'session', coalesce(p_session,0)),
    status = case when status = 'belum' then 'hadir' else status end,
    pax = case when pax = 0 then greatest(1, least(coalesce(p_pax,1), 20)) else pax end,
    updated_at = now()
  where invitation_id = inv.id and id = p_id returning * into g;
  if g.id is null then raise exception 'Tamu tidak ditemukan'; end if;
  return guest_json(g);
end $$;

create or replace function public.ci_undo(p_slug text, p_pin text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare inv invitations;
begin
  inv := ci_inv(p_slug, p_pin);
  update guests set checkin = null, updated_at = now() where invitation_id = inv.id and id = p_id;
end $$;

create or replace function public.ci_walkin(p_slug text, p_pin text, p_name text, p_grp text, p_session int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; g guests; c text; n int := 0;
begin
  inv := ci_inv(p_slug, p_pin);
  if coalesce(trim(p_name),'') = '' then raise exception 'Nama wajib diisi'; end if;
  loop
    c := gen_code(); n := n + 1;
    exit when not exists(select 1 from guests where invitation_id = inv.id and code = c) or n > 30;
  end loop;
  insert into guests(invitation_id, id, name, grp, code, status, pax, walkin, sessions)
  values (inv.id, 'w' || replace(gen_random_uuid()::text,'-',''), left(trim(p_name),120), coalesce(nullif(trim(p_grp),''),'Tamu tambahan'), c, 'hadir', 1, true, array[coalesce(p_session,0)])
  returning * into g;
  return guest_json(g);
end $$;

grant execute on function public.get_public_invitation(text,text), public.rsvp(text,text,text,text,int), public.add_wish(text,text,text,text),
  public.add_gift(text,text,bigint), public.ci_guests(text,text), public.ci_checkin(text,text,text,int,boolean,int),
  public.ci_undo(text,text,text), public.ci_walkin(text,text,text,text,int) to anon, authenticated;

-- ============ REALTIME (dashboard ikut berubah saat tamu RSVP) ============
do $$ begin
  begin alter publication supabase_realtime add table public.guests; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.wishes; exception when duplicate_object then null; end;
end $$;

-- ============ STORAGE FOTO ============
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
drop policy if exists photos_insert_own on storage.objects;
create policy photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists photos_delete_own on storage.objects;
create policy photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ HAK AKSES API (jika "Automatically expose new tables" dimatikan) ============
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.invitations, public.guests to authenticated;
grant select, update, delete on public.wishes to authenticated;
grant select on public.gift_confirmations, public.invoices to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ============ STORAGE MUSIK (lagu unggahan pengantin) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music', 'music', true, 15728640, array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/wav','audio/x-wav','audio/webm'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists music_insert_own on storage.objects;
create policy music_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'music' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists music_delete_own on storage.objects;
create policy music_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'music' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Migrasi berikutnya ada di supabase/migration-002-keluarga-katering.sql =====

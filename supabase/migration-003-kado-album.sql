-- Sakara · migrasi 003: kado patungan & album dari tamu. Aman dijalankan ulang.

-- ============ KADO PATUNGAN ============
create table if not exists public.pledges (
  id bigint generated always as identity primary key,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  item text not null check (char_length(item) between 1 and 40),
  name text not null check (char_length(name) between 1 and 80),
  amount bigint not null check (amount between 10000 and 100000000),
  message text not null default '' check (char_length(message) <= 300),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pledges_inv on public.pledges(invitation_id, item);
alter table public.pledges enable row level security;
drop policy if exists pledges_owner on public.pledges;
create policy pledges_owner on public.pledges for all to authenticated
  using (public.owns(invitation_id)) with check (public.owns(invitation_id));
grant select, update, delete on public.pledges to authenticated;
grant all on public.pledges to service_role;

-- progres publik: total & jumlah orang per barang (tanpa nominal per orang)
create or replace function public.wishlist_progress(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv invitations; r jsonb;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then return '{}'::jsonb; end if;
  select coalesce(jsonb_object_agg(item, jsonb_build_object('sum', s, 'n', n, 'names', names)), '{}'::jsonb) into r from (
    select item, sum(amount)::bigint s, count(*)::int n,
      (array_agg(split_part(name,' ',1) order by created_at desc))[1:6] names
    from pledges where invitation_id = inv.id and not hidden group by item) x;
  return r;
end $$;

create or replace function public.pledge(p_slug text, p_item text, p_name text, p_amount bigint, p_message text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; it jsonb; recent int;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  select x into it from jsonb_array_elements(coalesce(inv.data->'wishlist'->'items','[]'::jsonb)) x where x->>'id' = p_item;
  if it is null then raise exception 'Kado tidak ditemukan'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Nama wajib diisi'; end if;
  if coalesce(p_amount,0) < 10000 then raise exception 'Minimal Rp10.000'; end if;
  select count(*) into recent from pledges where invitation_id = inv.id and created_at > now() - interval '1 minute';
  if recent > 20 then raise exception 'Terlalu banyak permintaan, coba lagi sebentar'; end if;
  insert into pledges(invitation_id, item, name, amount, message)
  values (inv.id, p_item, left(trim(p_name),80), least(p_amount, 100000000), left(coalesce(trim(p_message),''),300));
  return wishlist_progress(p_slug);
end $$;

-- ============ ALBUM DARI TAMU ============
create table if not exists public.album_photos (
  id bigint generated always as identity primary key,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  path text not null unique,
  name text not null default '' check (char_length(name) <= 60),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists album_inv on public.album_photos(invitation_id, created_at desc);
alter table public.album_photos enable row level security;
drop policy if exists album_owner on public.album_photos;
create policy album_owner on public.album_photos for all to authenticated
  using (public.owns(invitation_id)) with check (public.owns(invitation_id));
grant select, update, delete on public.album_photos to authenticated;
grant all on public.album_photos to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album', 'album', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

create or replace function public.album_open(p_inv text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from invitations where id::text = p_inv and published and coalesce((data->>'albumOn')::boolean, true));
$$;
grant execute on function public.album_open(text) to anon, authenticated;

drop policy if exists album_upload on storage.objects;
create policy album_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'album' and public.album_open((storage.foldername(name))[1]));
drop policy if exists album_delete_owner on storage.objects;
create policy album_delete_owner on storage.objects for delete to authenticated
  using (bucket_id = 'album' and public.owns(((storage.foldername(name))[1])::uuid));

create or replace function public.album_info(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv invitations; ph jsonb;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Album tidak ditemukan'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('path',path,'name',name,'created_at',created_at) order by created_at desc), '[]'::jsonb)
    into ph from (select * from album_photos where invitation_id = inv.id and not hidden order by created_at desc limit 400) x;
  return jsonb_build_object('id', inv.id, 'open', coalesce((inv.data->>'albumOn')::boolean, true),
    'bride', inv.data->'bride'->>'nick', 'groom', inv.data->'groom'->>'nick', 'date', inv.data->'events'->0->>'date',
    'theme', inv.data->>'theme', 'accent', inv.data->>'accent', 'photos', ph);
end $$;

create or replace function public.album_add(p_slug text, p_path text, p_name text default '') returns void
language plpgsql security definer set search_path = public, storage as $$
declare inv invitations;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Album tidak ditemukan'; end if;
  if not coalesce((inv.data->>'albumOn')::boolean, true) then raise exception 'Album sedang ditutup'; end if;
  if p_path not like inv.id::text || '/%' then raise exception 'Path tidak valid'; end if;
  if not exists(select 1 from storage.objects where bucket_id = 'album' and name = p_path) then raise exception 'File belum terunggah'; end if;
  insert into album_photos(invitation_id, path, name) values (inv.id, p_path, left(coalesce(trim(p_name),''),60)) on conflict (path) do nothing;
end $$;

grant execute on function public.wishlist_progress(text), public.pledge(text,text,text,bigint,text),
  public.album_info(text), public.album_add(text,text,text) to anon, authenticated;

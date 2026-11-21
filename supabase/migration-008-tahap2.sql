-- Sakara · migrasi 008 (audit tahap 2)
-- Batas percobaan untuk fungsi publik, kode tamu & PIN check-in yang sulit ditebak,
-- ucapan dan RSVP dipisah, serta kolom tagihan untuk melanjutkan pembayaran & refund.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.

create extension if not exists pgcrypto;

-- ============ 1) Catatan percobaan (rate limit) ============
create table if not exists public.rate_hits (
  scope text not null,
  k text not null,
  at timestamptz not null default now()
);
create index if not exists rate_hits_idx on public.rate_hits(scope, k, at desc);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;

-- IP pengunjung dari header yang diteruskan Supabase (tanpa IP → semua dihitung bersama per undangan).
create or replace function public.client_ip() returns text
language sql stable as $$
  select coalesce(nullif(trim(split_part(coalesce(
    current_setting('request.headers', true)::json->>'cf-connecting-ip',
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1)), ''), '?');
$$;

-- true bila masih di bawah batas
-- Tanpa IP (kunci berakhir '|?') semua pengunjung berbagi satu hitungan, jadi batasnya dilonggarkan 30×.
create or replace function public.rate_ok(p_scope text, p_key text, p_max int, p_win interval) returns boolean
language sql stable security definer set search_path = public as $$
  select count(*) < (case when p_key like '%|?' then p_max * 30 else p_max end)
  from rate_hits where scope = p_scope and k = p_key and at > now() - p_win;
$$;
create or replace function public.rate_hit(p_scope text, p_key text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  insert into rate_hits(scope, k) values (p_scope, p_key);
  if random() < 0.02 then delete from rate_hits where at < now() - interval '1 day'; end if;
end $$;
-- tolak bila melewati batas, catat bila lolos
create or replace function public.rate_guard(p_scope text, p_key text, p_max int, p_win interval) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not rate_ok(p_scope, p_key, p_max, p_win) then
    raise exception 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi, ya.';
  end if;
  perform rate_hit(p_scope, p_key);
end $$;
revoke execute on function public.client_ip(), public.rate_ok(text,text,int,interval), public.rate_hit(text,text), public.rate_guard(text,text,int,interval) from public, anon, authenticated;

-- ============ 2) Kode tamu 8 karakter acak (kode lama tetap berlaku) ============
-- gen_random_uuid() selalu tersedia (pgcrypto di Supabase ada di skema extensions, di luar search_path fungsi).
-- Byte 0–5 dari dua UUID v4 sepenuhnya acak.
create or replace function public.gen_code() returns text
language sql volatile as $$
  select 'SP-' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(x.b, i) % 32), 1), '' order by i)
  from (select substr(decode(replace(gen_random_uuid()::text,'-',''),'hex'), 1, 6) || substr(decode(replace(gen_random_uuid()::text,'-',''),'hex'), 1, 2) b) x,
       generate_series(0, 7) i;
$$;

-- Undangan publik: tebakan kode tamu yang salah dibatasi 40 per 10 menit per IP.
create or replace function public.get_public_invitation(p_slug text, p_code text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare inv invitations; g guests; w jsonb; k text;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then return null; end if;
  if p_code is not null and p_code <> '' then
    k := inv.id::text || '|' || client_ip();
    if rate_ok('code', k, 40, interval '10 minutes') then
      select * into g from guests where invitation_id = inv.id and code = upper(p_code);
      if g.id is null then perform rate_hit('code', k); end if;
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name',x.name,'message',x.message,'attending',x.attending,'created_at',x.created_at) order by x.created_at desc), '[]'::jsonb)
    into w from (select * from wishes where invitation_id = inv.id and not hidden order by created_at desc limit 30) x;
  return jsonb_build_object('slug', inv.slug, 'plan', inv.plan, 'data', inv.data, 'wishes', w,
    'guest', case when g.id is null then null else
      jsonb_build_object('id',g.id,'name',g.name,'code',g.code,'sessions',g.sessions,'status',g.status,'pax',g.pax) end);
end $$;

-- ============ 3) RSVP & ucapan ============
-- RSVP: maksimal 10 per 10 menit per IP per undangan.
create or replace function public.rsvp(p_slug text, p_code text, p_name text, p_status text, p_pax int, p_arrive text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; g guests; c text; n int := 0; v_pax int; v_arr text;
begin
  if p_status not in ('hadir','tidak') then raise exception 'Status tidak valid'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Nama wajib diisi'; end if;
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  perform rate_guard('rsvp', inv.id::text || '|' || client_ip(), 10, interval '10 minutes');
  v_pax := case when p_status = 'hadir' then greatest(1, least(coalesce(p_pax,1), 12)) else 0 end;
  v_arr := case when p_status = 'hadir' and coalesce(p_arrive,'') ~ '^\d{2}\.\d{2}$' then p_arrive else '' end;
  if p_code is not null and p_code <> '' then
    select * into g from guests where invitation_id = inv.id and code = upper(p_code) and approved;
  end if;
  if g.id is null then
    loop
      c := gen_code(); n := n + 1;
      exit when not exists(select 1 from guests where invitation_id = inv.id and code = c) or n > 30;
    end loop;
    insert into guests(invitation_id, id, name, grp, code, status, pax, sent, arrive)
    values (inv.id, 'r' || replace(gen_random_uuid()::text,'-',''), left(trim(p_name),120), 'Lewat undangan', c, p_status, v_pax, true, v_arr)
    returning * into g;
  else
    update guests set status = p_status, pax = v_pax, arrive = v_arr, updated_at = now()
    where invitation_id = inv.id and id = g.id returning * into g;
  end if;
  return jsonb_build_object('id',g.id,'name',g.name,'code',g.code,'sessions',g.sessions,'status',g.status,'pax',g.pax,'arrive',g.arrive);
end $$;

-- Ucapan: kehadiran bisa dikirim langsung (untuk tamu tanpa kode); maksimal 6 per 10 menit per IP.
drop function if exists public.add_wish(text,text,text,text);
create or replace function public.add_wish(p_slug text, p_name text, p_message text, p_code text default null, p_attending boolean default null) returns void
language plpgsql security definer set search_path = public as $$
declare inv invitations; att boolean;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_message),'') = '' then raise exception 'Nama dan ucapan wajib diisi'; end if;
  perform rate_guard('wish', inv.id::text || '|' || client_ip(), 6, interval '10 minutes');
  if p_code is not null and p_code <> '' then
    select status = 'hadir' into att from guests where invitation_id = inv.id and code = upper(p_code);
  end if;
  insert into wishes(invitation_id, name, message, attending)
  values (inv.id, left(trim(p_name),80), left(trim(p_message),600), coalesce(att, p_attending, false));
end $$;

create or replace function public.add_gift(p_slug text, p_name text, p_amount bigint) returns void
language plpgsql security definer set search_path = public as $$
declare inv invitations;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  perform rate_guard('gift', inv.id::text || '|' || client_ip(), 6, interval '10 minutes');
  insert into gift_confirmations(invitation_id, name, amount, bank)
  values (inv.id, left(trim(p_name),80), least(greatest(0, coalesce(p_amount,0)), 1000000000), coalesce(inv.data->'gift'->>'bank',''));
end $$;

-- ============ 4) PIN check-in ============
-- Undangan baru dapat PIN 10 karakter; PIN lama tetap berlaku sampai diganti pemilik.
alter table public.invitations alter column checkin_pin set default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 10));

-- Pemilik bisa mengganti PIN (link penerima tamu lama langsung tidak berlaku).
create or replace function public.rotate_checkin_pin() returns text
language plpgsql security definer set search_path = public as $$
declare p text := upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 10)); n int;
begin
  perform set_config('satupadu.bypass', 'on', true);
  update invitations set checkin_pin = p where owner = auth.uid();
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Undangan tidak ditemukan'; end if;
  return p;
end $$;
revoke execute on function public.rotate_checkin_pin() from public, anon;
grant execute on function public.rotate_checkin_pin() to authenticated;

-- PIN salah tidak menghentikan transaksi (supaya tercatat); maksimal 10 salah per 15 menit per IP.
create or replace function public.ci_inv(p_slug text, p_pin text) returns public.invitations
language plpgsql volatile security definer set search_path = public as $$
declare inv invitations; k text := lower(coalesce(p_slug,'')) || '|' || client_ip();
begin
  if not rate_ok('pin', k, 10, interval '15 minutes') then
    raise exception 'Terlalu banyak percobaan PIN. Coba lagi 15 menit lagi.';
  end if;
  select * into inv from invitations where slug = lower(p_slug) and checkin_pin = coalesce(p_pin,'');
  if not found then perform rate_hit('pin', k); return null; end if;
  if not public.plan_has(inv.plan, 'qr') then raise exception 'Check-in tidak termasuk di paket undangan ini'; end if;
  return inv;
end $$;

create or replace function public.ci_guests(p_slug text, p_pin text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare inv invitations; gs jsonb;
begin
  inv := ci_inv(p_slug, p_pin);
  if inv.id is null then return jsonb_build_object('error', 'PIN salah'); end if;
  select coalesce(jsonb_agg(guest_json(g) order by g.name), '[]'::jsonb) into gs from guests g where g.invitation_id = inv.id and g.approved;
  return jsonb_build_object('data', inv.data, 'gift_no', inv.gift_no, 'guests', gs);
end $$;

create or replace function public.ci_checkin(p_slug text, p_pin text, p_id text, p_pax int, p_gift boolean, p_session int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; g guests; no int;
begin
  inv := ci_inv(p_slug, p_pin);
  if inv.id is null then return jsonb_build_object('error', 'PIN salah'); end if;
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
  if inv.id is null then return; end if;
  update guests set checkin = null, updated_at = now() where invitation_id = inv.id and id = p_id;
end $$;

create or replace function public.ci_walkin(p_slug text, p_pin text, p_name text, p_grp text, p_session int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; g guests; c text; n int := 0;
begin
  inv := ci_inv(p_slug, p_pin);
  if inv.id is null then return jsonb_build_object('error', 'PIN salah'); end if;
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

-- ============ 5) Kado patungan & album tamu: batas per IP ============
create or replace function public.pledge(p_slug text, p_item text, p_name text, p_amount bigint, p_message text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; it jsonb;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  select x into it from jsonb_array_elements(coalesce(inv.data->'wishlist'->'items','[]'::jsonb)) x where x->>'id' = p_item;
  if it is null then raise exception 'Kado tidak ditemukan'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Nama wajib diisi'; end if;
  if coalesce(p_amount,0) < 10000 then raise exception 'Minimal Rp10.000'; end if;
  perform rate_guard('pledge', inv.id::text || '|' || client_ip(), 5, interval '10 minutes');
  insert into pledges(invitation_id, item, name, amount, message)
  values (inv.id, p_item, left(trim(p_name),80), least(p_amount, 100000000), left(coalesce(trim(p_message),''),300));
  return wishlist_progress(p_slug);
end $$;

create or replace function public.album_add(p_slug text, p_path text, p_name text default '') returns void
language plpgsql security definer set search_path = public, storage as $$
declare inv invitations;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Album tidak ditemukan'; end if;
  if not coalesce((inv.data->>'albumOn')::boolean, true) then raise exception 'Album sedang ditutup'; end if;
  if p_path not like inv.id::text || '/%' then raise exception 'Path tidak valid'; end if;
  perform rate_guard('album', inv.id::text || '|' || client_ip(), 40, interval '10 minutes');
  if not exists(select 1 from storage.objects where bucket_id = 'album' and name = p_path) then raise exception 'File belum terunggah'; end if;
  insert into album_photos(invitation_id, path, name) values (inv.id, p_path, left(coalesce(trim(p_name),''),60)) on conflict (path) do nothing;
end $$;

-- ============ 6) Tagihan: lanjutkan pembayaran & refund ============
alter table public.invoices add column if not exists snap_token text;
alter table public.invoices add column if not exists snap_url text;
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('pending','paid','expired','failed','refunded','partial_refund'));

-- Foto bucket photos: hanya gambar, maks 10 MB.
update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'photos';

grant execute on function public.get_public_invitation(text,text), public.rsvp(text,text,text,text,int,text),
  public.add_wish(text,text,text,text,boolean), public.add_gift(text,text,bigint),
  public.ci_guests(text,text), public.ci_checkin(text,text,text,int,boolean,int), public.ci_undo(text,text,text),
  public.ci_walkin(text,text,text,text,int), public.pledge(text,text,text,bigint,text), public.album_add(text,text,text)
  to anon, authenticated;

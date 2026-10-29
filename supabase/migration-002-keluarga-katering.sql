-- Satu Padu Kita · migrasi 002: akun keluarga, jam kedatangan, katering. Aman dijalankan ulang.

alter table public.guests add column if not exists fam text;
alter table public.guests add column if not exists approved boolean not null default true;
alter table public.guests add column if not exists arrive text not null default '';
alter table public.invitations add column if not exists catering_token text not null default encode(gen_random_bytes(12), 'hex');

create table if not exists public.families (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) between 1 and 80),
  quota int not null default 100 check (quota between 1 and 5000),
  token text not null unique check (char_length(token) >= 12),
  created_at timestamptz not null default now(),
  primary key (invitation_id, id)
);
alter table public.families enable row level security;
drop policy if exists fam_owner on public.families;
create policy fam_owner on public.families for all to authenticated
  using (public.owns(invitation_id)) with check (public.owns(invitation_id));
grant select, insert, update, delete on public.families to authenticated;
grant all on public.families to service_role;

create or replace function public.guest_json(g public.guests) returns jsonb
language sql immutable as $$
  select jsonb_build_object('id',g.id,'name',g.name,'code',g.code,'sessions',g.sessions,'status',g.status,'pax',g.pax,
    'grp',g.grp,'phone',g.phone,'sent',g.sent,'walkin',g.walkin,'checkin',g.checkin,'fam',g.fam,'approved',g.approved,'arrive',g.arrive);
$$;

-- penerima tamu hanya melihat tamu yang sudah disetujui
create or replace function public.ci_guests(p_slug text, p_pin text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv invitations; gs jsonb;
begin
  inv := ci_inv(p_slug, p_pin);
  select coalesce(jsonb_agg(guest_json(g) order by g.name), '[]'::jsonb) into gs from guests g where g.invitation_id = inv.id and g.approved;
  return jsonb_build_object('data', inv.data, 'gift_no', inv.gift_no, 'guests', gs);
end $$;

-- RSVP dengan jam kedatangan
drop function if exists public.rsvp(text,text,text,text,int);
create or replace function public.rsvp(p_slug text, p_code text, p_name text, p_status text, p_pax int, p_arrive text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; g guests; c text; n int := 0; v_pax int; v_arr text;
begin
  if p_status not in ('hadir','tidak') then raise exception 'Status tidak valid'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Nama wajib diisi'; end if;
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
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

-- Halaman keluarga (tanpa akun, pakai token)
create or replace function public.fam_load(p_slug text, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv invitations; f families; gs jsonb;
begin
  select * into inv from invitations where slug = lower(p_slug);
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  select * into f from families where invitation_id = inv.id and token = p_token;
  if not found then raise exception 'Link keluarga tidak berlaku'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'phone',g.phone,'approved',g.approved,'status',g.status) order by g.created_at desc), '[]'::jsonb)
    into gs from guests g where g.invitation_id = inv.id and g.fam = f.id;
  return jsonb_build_object('family', jsonb_build_object('id',f.id,'name',f.name,'quota',f.quota),
    'bride', inv.data->'bride'->>'nick', 'groom', inv.data->'groom'->>'nick', 'date', inv.data->'events'->0->>'date', 'guests', gs);
end $$;

create or replace function public.fam_add(p_slug text, p_token text, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; f families; used int; it jsonb; c text; n int; nev int; ses int[];
begin
  select * into inv from invitations where slug = lower(p_slug);
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  select * into f from families where invitation_id = inv.id and token = p_token;
  if not found then raise exception 'Link keluarga tidak berlaku'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Tidak ada nama'; end if;
  if jsonb_array_length(p_items) > 300 then raise exception 'Maksimal 300 nama sekali tambah'; end if;
  select count(*) into used from guests where invitation_id = inv.id and fam = f.id;
  if used + jsonb_array_length(p_items) > f.quota then raise exception 'Melebihi jatah % tamu. Sisa % nama.', f.quota, greatest(0, f.quota - used); end if;
  nev := greatest(coalesce(jsonb_array_length(inv.data->'events'), 1), 1);
  select array_agg(i) into ses from generate_series(0, nev - 1) i;
  for it in select * from jsonb_array_elements(p_items) loop
    if char_length(trim(coalesce(it->>'name',''))) < 2 then continue; end if;
    n := 0;
    loop
      c := gen_code(); n := n + 1;
      exit when not exists(select 1 from guests where invitation_id = inv.id and code = c) or n > 30;
    end loop;
    insert into guests(invitation_id, id, name, phone, grp, code, sessions, fam, approved)
    values (inv.id, 'f' || replace(gen_random_uuid()::text,'-',''), left(trim(it->>'name'),120), left(regexp_replace(coalesce(it->>'phone',''),'[^0-9+]','','g'),20), f.name, c, ses, f.id, false);
  end loop;
  return fam_load(p_slug, p_token);
end $$;

create or replace function public.fam_remove(p_slug text, p_token text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare inv invitations; f families;
begin
  select * into inv from invitations where slug = lower(p_slug);
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  select * into f from families where invitation_id = inv.id and token = p_token;
  if not found then raise exception 'Link keluarga tidak berlaku'; end if;
  delete from guests where invitation_id = inv.id and fam = f.id and id = p_id and not approved;
end $$;

-- Status ramai (publik, tanpa nama)
create or replace function public.crowd(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv invitations; sl jsonb; recent int; total_in int;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then return null; end if;
  select coalesce(jsonb_object_agg(arrive, pax), '{}'::jsonb) into sl from (
    select arrive, sum(greatest(pax,1))::int pax from guests
    where invitation_id = inv.id and approved and status = 'hadir' and arrive <> '' group by arrive) x;
  select coalesce(sum(greatest(coalesce((checkin->>'pax')::int,1),1)),0) into recent from guests
    where invitation_id = inv.id and checkin is not null and (checkin->>'ts')::bigint > floor(extract(epoch from now())*1000) - 1800000;
  select coalesce(sum(greatest(coalesce((checkin->>'pax')::int,1),1)),0) into total_in from guests where invitation_id = inv.id and checkin is not null;
  return jsonb_build_object('slots', sl, 'recent', recent, 'arrived', total_in, 'now', floor(extract(epoch from now())*1000));
end $$;

-- Vendor katering (pakai token, tanpa nama tamu)
create or replace function public.catering(p_slug text, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv invitations; st jsonb; nev int;
begin
  select * into inv from invitations where slug = lower(p_slug) and catering_token = p_token;
  if not found then raise exception 'Link katering tidak berlaku'; end if;
  nev := greatest(coalesce(jsonb_array_length(inv.data->'events'), 1), 1);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.i), '[]'::jsonb) into st from (
    select s.i,
      count(g.id)::int invited,
      count(g.id) filter (where g.status = 'hadir')::int hadir,
      coalesce(sum(g.pax) filter (where g.status = 'hadir'), 0)::int hadir_pax,
      count(g.id) filter (where g.status = 'belum')::int belum,
      count(g.id) filter (where g.status = 'tidak')::int tidak,
      coalesce(sum(coalesce((g.checkin->>'pax')::int,1)) filter (where g.checkin is not null and coalesce((g.checkin->>'session')::int,0) = s.i), 0)::int checkin_pax
    from generate_series(0, nev - 1) s(i)
    left join guests g on g.invitation_id = inv.id and g.approved and (cardinality(g.sessions) = 0 or s.i = any(g.sessions))
    group by s.i) x;
  return jsonb_build_object('bride', inv.data->'bride'->>'nick', 'groom', inv.data->'groom'->>'nick', 'events', inv.data->'events',
    'settings', coalesce(inv.data->'catering', '{}'::jsonb), 'stats', st, 'updated', now());
end $$;

grant execute on function public.rsvp(text,text,text,text,int,text), public.fam_load(text,text), public.fam_add(text,text,jsonb),
  public.fam_remove(text,text,text), public.crowd(text), public.catering(text,text), public.ci_guests(text,text) to anon, authenticated;

do $$ begin
  begin alter publication supabase_realtime add table public.families; exception when duplicate_object then null; end;
end $$;

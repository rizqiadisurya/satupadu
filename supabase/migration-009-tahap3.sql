-- Sakara · migrasi 009 (audit tahap 3): hak paket dicek di server.
-- Tema Custom hanya ditampilkan ke tamu bila paket undangannya Custom; kado patungan hanya paket Undangan/Tamu. Aman dijalankan ulang.

create or replace function public.get_public_invitation(p_slug text, p_code text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare inv invitations; g guests; w jsonb; k text; d jsonb;
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
  -- Tema Custom hanya tayang di paket Custom; paket lain memakai tema Lukisan yang terakhir tayang.
  d := inv.data;
  if coalesce(d->>'theme','') like 'cx-%' and inv.plan <> 'custom' then
    d := jsonb_set(d, '{theme}', to_jsonb(case when coalesce(d->>'liveTheme','') <> '' and d->>'liveTheme' not like 'cx-%' then d->>'liveTheme' else 'arunika' end));
  end if;
  return jsonb_build_object('slug', inv.slug, 'plan', inv.plan, 'data', d, 'wishes', w,
    'guest', case when g.id is null then null else
      jsonb_build_object('id',g.id,'name',g.name,'code',g.code,'sessions',g.sessions,'status',g.status,'pax',g.pax) end);
end $$;

create or replace function public.pledge(p_slug text, p_item text, p_name text, p_amount bigint, p_message text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv invitations; it jsonb;
begin
  select * into inv from invitations where slug = lower(p_slug) and published;
  if not found then raise exception 'Undangan tidak ditemukan'; end if;
  select x into it from jsonb_array_elements(coalesce(inv.data->'wishlist'->'items','[]'::jsonb)) x where x->>'id' = p_item;
  if it is null then raise exception 'Kado tidak ditemukan'; end if;
  -- kado patungan hanya untuk paket Undangan & Tamu dengan tema Lukisan
  if inv.plan not in ('undangan','tamu') or coalesce(inv.data->>'theme','') like 'cx-%' then raise exception 'Kado patungan tidak tersedia di undangan ini'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Nama wajib diisi'; end if;
  if coalesce(p_amount,0) < 10000 then raise exception 'Minimal Rp10.000'; end if;
  perform rate_guard('pledge', inv.id::text || '|' || client_ip(), 5, interval '10 minutes');
  insert into pledges(invitation_id, item, name, amount, message)
  values (inv.id, p_item, left(trim(p_name),80), least(p_amount, 100000000), left(coalesce(trim(p_message),''),300));
  return wishlist_progress(p_slug);
end $$;

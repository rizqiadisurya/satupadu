-- Sakara · migrasi 009 (audit tahap 3): hak paket dicek di server.
-- Tema Custom hanya ditampilkan ke tamu bila paket undangannya Custom. Aman dijalankan ulang.

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

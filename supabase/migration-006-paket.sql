-- Sakara · migrasi 006: paket bisa ditambah dari panel admin. Aman dijalankan ulang.
-- 1) Kolom plan tidak lagi dibatasi ke coba/undangan/tamu.
alter table public.invitations drop constraint if exists invitations_plan_check;
alter table public.invitations add constraint invitations_plan_check check (plan ~ '^[a-z0-9][a-z0-9-]{1,29}$');

-- 2) Cek fitur sebuah paket dari pengaturan admin (app_config.prices.packages[].feats).
--    Bila paket belum diatur di panel admin, perilaku lama dipakai (hanya 'tamu' yang punya fitur lengkap).
create or replace function public.plan_has(p_plan text, p_feat text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select coalesce(e->'feats'->>p_feat, '0') not in ('0', 'false', '')
       from public.app_config c, jsonb_array_elements(c.value->'packages') e
      where c.key = 'prices' and jsonb_typeof(c.value->'packages') = 'array' and e->>'id' = p_plan
      limit 1),
    p_plan = 'tamu');
$$;

-- 3) Penerima tamu / QR check-in mengikuti fitur paket.
create or replace function public.ci_inv(p_slug text, p_pin text) returns public.invitations
language plpgsql stable security definer set search_path = public as $$
declare inv invitations;
begin
  select * into inv from invitations where slug = lower(p_slug) and checkin_pin = p_pin;
  if not found then raise exception 'PIN salah'; end if;
  if not public.plan_has(inv.plan, 'qr') then raise exception 'Check-in tidak termasuk di paket undangan ini'; end if;
  return inv;
end $$;

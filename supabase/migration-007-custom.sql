-- Sakara · migrasi 007: paket Custom. Aman dijalankan ulang.
-- Menyertakan isi migrasi 006 (belum terpasang di production), lalu menambahkan paket Custom.

-- 1) Kolom plan boleh berisi paket apa pun (termasuk 'custom').
alter table public.invitations drop constraint if exists invitations_plan_check;
alter table public.invitations add constraint invitations_plan_check check (plan ~ '^[a-z0-9][a-z0-9-]{1,29}$');

-- 2) Cek fitur paket dari pengaturan admin. Bila paket belum diatur di panel admin,
--    'tamu' (Undangan Lengkap) dan 'custom' sama-sama punya fitur lengkap.
create or replace function public.plan_has(p_plan text, p_feat text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select coalesce(e->'feats'->>p_feat, '0') not in ('0', 'false', '')
       from public.app_config c, jsonb_array_elements(c.value->'packages') e
      where c.key = 'prices' and jsonb_typeof(c.value->'packages') = 'array' and e->>'id' = p_plan
      limit 1),
    p_plan in ('tamu', 'custom'));
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

-- 4) Undangan yang sudah lunas paket Custom tapi paketnya belum tersimpan (karena batasan lama di poin 1) langsung dipulihkan.
--    Kolom plan dilindungi trigger, jadi perlindungannya dibuka sebentar untuk perintah ini saja.
select set_config('satupadu.bypass', 'on', false);
update public.invitations i set plan = x.plan, published = true
  from (select distinct on (invitation_id) invitation_id, plan from public.invoices
         where status = 'paid' order by invitation_id, paid_at desc) x
 where x.invitation_id = i.id and x.plan = 'custom' and i.plan <> 'custom';
select set_config('satupadu.bypass', '', false);

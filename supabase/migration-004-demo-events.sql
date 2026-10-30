-- Sakara · migrasi 004: catatan kunjungan mode demo. Aman dijalankan ulang.
-- Pengunjung hanya bisa MENAMBAH baris. Membaca hanya dari dashboard Supabase.

create table if not exists public.demo_events (
  id bigint generated always as identity primary key,
  sid text not null check (char_length(sid) between 6 and 40),
  event text not null check (char_length(event) between 1 and 20),
  detail text not null default '' check (char_length(detail) <= 60),
  secs int check (secs between 0 and 86400),
  device text not null default '' check (char_length(device) <= 10),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists demo_events_sid on public.demo_events(sid);
create index if not exists demo_events_time on public.demo_events(created_at desc);
alter table public.demo_events enable row level security;

drop policy if exists demo_events_insert on public.demo_events;
create policy demo_events_insert on public.demo_events for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
revoke all on public.demo_events from anon, authenticated;
grant insert on public.demo_events to anon, authenticated;
grant all on public.demo_events to service_role;

-- Ringkasan harian: buka Table Editor > demo_summary
create or replace view public.demo_summary as
select date_trunc('day', created_at at time zone 'Asia/Jakarta')::date as hari,
  count(distinct sid) filter (where event = 'open') as pengunjung_demo,
  count(distinct sid) filter (where event = 'open' and device = 'hp') as dari_hp,
  round(avg(secs) filter (where event in ('exit','end')))::int as rata2_detik,
  count(distinct sid) filter (where event = 'act') as mencoba_fitur,
  count(distinct sid) filter (where event in ('cta','nudge_click')) as klik_mulai,
  count(distinct sid) filter (where event = 'login') as jadi_login
from public.demo_events group by 1 order by 1 desc;

-- Fitur yang paling sering dibuka/dicoba
create or replace view public.demo_features as
select event, detail, count(*) as kali, count(distinct sid) as orang
from public.demo_events where event in ('tab','view','act')
group by 1, 2 order by orang desc;

-- Siapa saja yang login setelah melihat demo
create or replace view public.demo_people as
select u.email, coalesce(u.raw_user_meta_data->>'name', '') as nama, d.created_at as login_pada,
  (select string_agg(distinct e.detail, ', ') from public.demo_events e where e.sid = d.sid and e.event in ('tab','act') and e.detail <> '') as yang_dicoba,
  (select max(e.secs) from public.demo_events e where e.sid = d.sid) as lama_detik,
  exists(select 1 from public.invitations i where i.owner = d.user_id and i.published) as sudah_bayar
from public.demo_events d join auth.users u on u.id = d.user_id
where d.event = 'login' order by d.created_at desc;

revoke all on public.demo_summary, public.demo_features, public.demo_people from anon, authenticated;

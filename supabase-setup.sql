-- =====================================================================
-- RAMEN RUSH — Supabase kurulumu
-- Supabase Dashboard > SQL Editor'e yapıştırıp tek seferde çalıştır.
--
-- ÖNCESİNDE: Authentication > Providers > Email altında
--   "Confirm email" KAPALI olmalı. (Kullanıcı adıyla giriş yaptığımız için
--    sahte e-posta kullanılıyor, onay maili gidecek gerçek adres yok.)
-- =====================================================================

-- ---------- profiller ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null check (username ~ '^[a-z0-9_]{3,16}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles okunabilir" on public.profiles;
create policy "profiles okunabilir" on public.profiles
  for select using (true);

drop policy if exists "kendi profilini guncelle" on public.profiles;
create policy "kendi profilini guncelle" on public.profiles
  for update using (auth.uid() = id);

-- Kayıt olurken metadata'daki username otomatik profile yazılır
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- skorlar ----------
create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  track_id   text not null check (char_length(track_id) between 2 and 16),
  score      int  not null check (score between 0 and 400000),
  max_combo  int  not null default 0 check (max_combo between 0 and 1000),
  level      int  not null default 1 check (level between 1 and 40),
  caught     int  not null default 0 check (caught between 0 and 1200),
  duration_s int  not null default 90 check (duration_s between 30 and 300),
  created_at timestamptz not null default now(),

  -- Hile filtresi (seviye 2): fiziksel olarak mümkün olmayan skorları reddet.
  -- Yakalanan noodle başına teorik tavan ~1300 puan (golden/mega dahil).
  constraint makul_skor  check (score <= caught * 1500 + 2000),
  -- 90 saniyede yakalanabilecek makul üst sınır (spawn hızı tavanı ~2/sn)
  constraint makul_yakalama check (caught <= duration_s * 4)
);

create index if not exists scores_track_score_idx on public.scores (track_id, score desc);
create index if not exists scores_user_idx on public.scores (user_id, created_at desc);

alter table public.scores enable row level security;

drop policy if exists "skorlar herkese acik" on public.scores;
create policy "skorlar herkese acik" on public.scores
  for select using (true);

drop policy if exists "kendi skorunu ekle" on public.scores;
create policy "kendi skorunu ekle" on public.scores
  for insert with check (auth.uid() = user_id);

-- update / delete politikası YOK -> kimse skorunu sonradan değiştiremez

-- Hız sınırı: aynı kullanıcı 25 saniyeden sık skor gönderemez (bir maç 90 sn)
create or replace function public.scores_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (
    select 1 from public.scores s
    where s.user_id = new.user_id
      and s.created_at > now() - interval '25 seconds'
  ) then
    raise exception 'Cok sik skor gonderimi (rate limit)';
  end if;
  return new;
end;
$$;

drop trigger if exists scores_rate_limit_trg on public.scores;
create trigger scores_rate_limit_trg
  before insert on public.scores
  for each row execute function public.scores_rate_limit();

-- ---------- sıralama görünümleri (kullanıcı başına en iyi skor) ----------
drop view if exists public.leaderboard;
create view public.leaderboard
with (security_invoker = on) as
select * from (
  select distinct on (s.user_id, s.track_id)
         p.username, s.track_id, s.score, s.max_combo, s.level, s.created_at
  from public.scores s
  join public.profiles p on p.id = s.user_id
  order by s.user_id, s.track_id, s.score desc
) t;

drop view if exists public.leaderboard_global;
create view public.leaderboard_global
with (security_invoker = on) as
select * from (
  select distinct on (s.user_id)
         p.username, s.score, s.max_combo, s.level, s.created_at
  from public.scores s
  join public.profiles p on p.id = s.user_id
  order by s.user_id, s.score desc
) t;

grant select on public.leaderboard, public.leaderboard_global to anon, authenticated;

-- ---------- kontrol ----------
-- select * from public.leaderboard order by score desc limit 20;
-- select * from public.leaderboard_global order by score desc limit 20;

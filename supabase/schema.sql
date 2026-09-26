-- Kod Kilimi — veritabanı şeması
--
-- Tek dosya, sıfırdan çalıştırılabilir ve tekrar çalıştırılabilir.
-- Supabase panelinde SQL Editor'e yapıştırıp çalıştır.
--
-- Motif kuralları dört yerde birebir aynı olmalı. Birini değiştirirken
-- hepsini güncelle:
--   1. shared/domain/TileValidator.ts        — tarayıcı ve sunucu
--   2. server/utils/github/TileFile.ts       — pull request açılırken
--   3. scripts/validate.mjs                  — pull request'teki JSON dosyaları
--   4. bu dosya                              — veritabanı, son söz

-- ═════════════════════════════════════════════════════════════════
-- 81 il
-- ═════════════════════════════════════════════════════════════════
create table if not exists public.cities (
  name text primary key
);

comment on table public.cities is '81 il. Tek doğruluk kaynağı data/cities.json.';

insert into public.cities (name) values
  ('Adana'),
  ('Adıyaman'),
  ('Afyonkarahisar'),
  ('Ağrı'),
  ('Amasya'),
  ('Ankara'),
  ('Antalya'),
  ('Artvin'),
  ('Aydın'),
  ('Balıkesir'),
  ('Bilecik'),
  ('Bingöl'),
  ('Bitlis'),
  ('Bolu'),
  ('Burdur'),
  ('Bursa'),
  ('Çanakkale'),
  ('Çankırı'),
  ('Çorum'),
  ('Denizli'),
  ('Diyarbakır'),
  ('Edirne'),
  ('Elazığ'),
  ('Erzincan'),
  ('Erzurum'),
  ('Eskişehir'),
  ('Gaziantep'),
  ('Giresun'),
  ('Gümüşhane'),
  ('Hakkari'),
  ('Hatay'),
  ('Isparta'),
  ('Mersin'),
  ('İstanbul'),
  ('İzmir'),
  ('Kars'),
  ('Kastamonu'),
  ('Kayseri'),
  ('Kırklareli'),
  ('Kırşehir'),
  ('Kocaeli'),
  ('Konya'),
  ('Kütahya'),
  ('Malatya'),
  ('Manisa'),
  ('Kahramanmaraş'),
  ('Mardin'),
  ('Muğla'),
  ('Muş'),
  ('Nevşehir'),
  ('Niğde'),
  ('Ordu'),
  ('Rize'),
  ('Sakarya'),
  ('Samsun'),
  ('Siirt'),
  ('Sinop'),
  ('Sivas'),
  ('Tekirdağ'),
  ('Tokat'),
  ('Trabzon'),
  ('Tunceli'),
  ('Şanlıurfa'),
  ('Uşak'),
  ('Van'),
  ('Yozgat'),
  ('Zonguldak'),
  ('Aksaray'),
  ('Bayburt'),
  ('Karaman'),
  ('Kırıkkale'),
  ('Batman'),
  ('Şırnak'),
  ('Bartın'),
  ('Ardahan'),
  ('Iğdır'),
  ('Yalova'),
  ('Karabük'),
  ('Kilis'),
  ('Osmaniye'),
  ('Düzce')
on conflict (name) do nothing;

alter table public.cities enable row level security;

drop policy if exists "cities are readable" on public.cities;
create policy "cities are readable"
  on public.cities for select
  using (true);

-- ═════════════════════════════════════════════════════════════════
-- Karolar
-- ═════════════════════════════════════════════════════════════════
create table if not exists public.tiles (
  id uuid primary key default gen_random_uuid(),

  -- Kullanıcı adı küçük harfle saklanır; karo dosyasının adı da budur.
  -- Kimliği belirleyen alan bu: kişi başına tek motif.
  username text not null unique,

  -- Sahiplenilmemiş karolar için boştur: repodaki tiles/*.json
  -- dosyalarından aktarılanlar ve elle pull request açanlar. Sahibi
  -- GitHub ile giriş yaptığında karosunu devralır.
  user_id uuid unique references auth.users (id) on delete set null,
  github_id bigint unique,
  avatar_url text,

  city text not null references public.cities (name),
  message text,
  pixels text not null,

  -- Pull request alanlarını yalnızca sunucu (servis rolü) yazar.
  pr_number integer,
  pr_status text not null default 'pending',

  -- Kilimdeki sıra created_at'e göredir; motif güncellemesi sırayı bozmaz.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tiles_username_format
    check (username ~ '^[a-z0-9][a-z0-9-]{0,38}$'),

  constraint tiles_message_length
    check (message is null or char_length(message) <= 60),

  -- 8×8 ilmek, her biri 0-7 arası bir kök boya.
  constraint tiles_pixels_format
    check (pixels ~ '^[0-7]{64}$'),

  -- En az 6 boyalı ilmek.
  constraint tiles_pixels_knots
    check (length(replace(pixels, '0', '')) >= 6),

  constraint tiles_pr_status_valid
    check (pr_status in ('pending', 'open', 'merged', 'closed', 'failed'))
);

comment on table public.tiles is 'Kilimdeki karolar. Tek doğruluk kaynağı budur; tiles/*.json dosyaları pull request ile üretilen kopyalardır.';

create index if not exists tiles_created_at_idx on public.tiles (created_at);
create index if not exists tiles_city_idx on public.tiles (city);
create index if not exists tiles_pr_number_idx on public.tiles (pr_number);

-- ═════════════════════════════════════════════════════════════════
-- Oturumdaki GitHub kullanıcı adı
-- ═════════════════════════════════════════════════════════════════
create or replace function public.jwt_github_username()
returns text
language sql
stable
as $fn$
  select lower(coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'user_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'preferred_username', '')
  ));
$fn$;

-- ═════════════════════════════════════════════════════════════════
-- Kimlik: kullanıcı adını kullanıcı değil, jeton belirler
-- ═════════════════════════════════════════════════════════════════
create or replace function public.tiles_apply_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  meta jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  github_login text := public.jwt_github_username();
begin
  new.updated_at := now();

  if viewer is null then
    -- Servis rolü: pull request durumunu ya da arşiv karolarını yazıyor.
    new.username := lower(new.username);
    return new;
  end if;

  -- Kullanıcı adı jetondan gelmeli; istemciden gelen değere asla güvenilmez.
  if github_login is null then
    raise exception 'Kilime yalnızca GitHub ile giriş yaparak motif eklenebilir.'
      using errcode = '42501';
  end if;

  new.user_id := viewer;
  new.username := github_login;
  new.github_id := coalesce(
    nullif(meta ->> 'provider_id', '')::bigint,
    nullif(meta ->> 'sub', '')::bigint,
    new.github_id
  );
  new.avatar_url := coalesce(nullif(meta ->> 'avatar_url', ''), new.avatar_url);

  if tg_op = 'INSERT' then
    -- Yeni karo: pull request henüz açılmadı.
    new.pr_number := null;
    new.pr_status := 'pending';
    new.created_at := now();
  else
    -- Güncelleme: kilimdeki sıra korunur, pull request alanlarına dokunulmaz.
    new.created_at := old.created_at;
    new.pr_number := old.pr_number;
    new.pr_status := case
      when new.pixels is distinct from old.pixels
        or new.city is distinct from old.city
        or new.message is distinct from old.message
      then 'pending'
      else old.pr_status
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists tiles_identity on public.tiles;
create trigger tiles_identity
  before insert or update on public.tiles
  for each row execute function public.tiles_apply_identity();

-- ═════════════════════════════════════════════════════════════════
-- Data API erişimi
-- ═════════════════════════════════════════════════════════════════
-- İzinler açıkça veriliyor; projede "Automatically expose new tables"
-- kapalı olduğu için tablolar kendiliğinden açılmıyor. Asıl koruma
-- aşağıdaki satır güvenliği kurallarında.
grant usage on schema public to anon, authenticated;

grant select on public.cities to anon, authenticated;
grant select on public.tiles to anon, authenticated;
grant insert on public.tiles to authenticated;

-- Sunucu, pull request durumunu (pr_number / pr_status) servis rolüyle
-- yazar; bu sütunlara başka hiçbir rolün yetkisi yok.
grant all on public.tiles to service_role;
grant all on public.cities to service_role;

-- ═════════════════════════════════════════════════════════════════
-- Satır güvenliği
-- ═════════════════════════════════════════════════════════════════
alter table public.tiles enable row level security;

drop policy if exists "tiles are readable" on public.tiles;
create policy "tiles are readable"
  on public.tiles for select
  using (true);

drop policy if exists "insert own tile" on public.tiles;
create policy "insert own tile"
  on public.tiles for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Kendi karosunu günceller; sahipsiz bir karo kendi kullanıcı adındaysa
-- (repodan aktarılmış ya da elle pull request'le eklenmiş) onu devralır.
drop policy if exists "update own tile" on public.tiles;
create policy "update own tile"
  on public.tiles for update
  to authenticated
  using (
    auth.uid() = user_id
    or (user_id is null and username = public.jwt_github_username())
  )
  with check (auth.uid() = user_id);

-- Silme kapalı; moderasyon servis rolüyle yapılır.

-- Sütun düzeyinde yetki: kullanıcı pull request alanlarına hiç dokunamaz.
revoke update on public.tiles from authenticated;
grant update (username, user_id, github_id, avatar_url, city, message, pixels)
  on public.tiles to authenticated;

# Kod Kilimi

Onaylı tasarım `design/Main.dc.html` içinde; renk, ölçü, metin ve durumları
oradan al. `design/*.dc.html` dosyaları üretim kodu değil, görsel referanstır.
Ürünün arka planı için `HANDOFF.md`, kurulum için `SETUP.md`, yayın için
`DEPLOY.md`.

## Kurallar

- **Arayüz dili ve yorumlar Türkçe; kod tanımlayıcıları İngilizce.**
  Sınıf, değişken, CSS sınıfı, veritabanı nesnesi adları İngilizce olur.
- Arayüzde JSON, dosya adı ya da repo ayrıntısı gösterme.
- Gizli anahtarları istemci koduna koyma. Supabase anahtarları, GitHub App
  özel anahtarı ve webhook gizli metni yalnızca sunucuda (`runtimeConfig`in
  gizli bölümü) durur.

## Mimari

- **Tarayıcı Supabase'i görmez.** Bütün veri erişimi `server/api/*` üzerinden
  gider; veritabanı adresi, anahtarı ve şeması sunucuda kalır. Oturum
  HttpOnly çerezde taşınır.
- **Özellik tabanlı düzen.** Her özellik `app/features/<ad>/` altında kendi
  modeli, saf hesap sınıfları ve bileşenleriyle durur.
- **Sınıflar saf.** `shared/domain/*` ve `app/features/*/services/*` Vue'ya,
  reaktifliğe ve ağa dokunmaz; aynı girdi her zaman aynı çıktıyı verir.
- **Veri erişimi ince repository'lerde.** `*Repository` sınıfları `/api/*`
  uçlarıyla konuşur, `Result` döndürür, istisna sızdırmaz. Reaktif değildirler.
- **Hook'lar sayfa ve bileşenlerde.** `ref`, `computed`, `onMounted` yalnızca
  `.vue` dosyalarında bulunur; ayrı bir `composables/` klasörü yok.
- Sınıf örnekleri `shallowRef` ile tutulur; modeller değişmez olduğu için
  her değişiklikte referans zaten yenilenir.
- SSR'da iç `$fetch` çerezleri taşımaz; oturum gerektiren çağrılarda
  `useRequestFetch()` kullan.

## Motif doğrulama

Kurallar dört yerde birebir aynı olmalı. Birini değiştirirken hepsini güncelle:

1. `shared/domain/TileValidator.ts` — tarayıcı ve sunucu
2. `server/utils/github/TileFile.ts` — pull request açılırken
3. `supabase/schema.sql` — veritabanı kısıtları (son söz)
4. `scripts/validate.mjs` — pull request'teki JSON dosyaları

## Denetimler

```bash
pnpm typecheck    # tip denetimi
pnpm validate     # tiles/*.json
pnpm contrast     # WCAG AA renk kontrastı
```

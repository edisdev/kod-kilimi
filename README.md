# Kod Kilimi

Türkiye'deki geliştiricilerin birlikte dokuduğu bir kilim. Her katılımcı **8×8
ilmekten** oluşan bir motif çizer ve tek tıkla kilime ekler.

İlk açık kaynak katkını yapmak için iyi bir yer: dosya yok, fork yok, sonucu
hemen görürsün.

## Nasıl katılırım?

1. Sitedeki tezgâhta motifini çiz.
2. GitHub ile giriş yap, şehrini seç.
3. **Kilime ekle**'ye bas.

Motifin **anında** kilimde belirir. Arka planda senin adına bir pull request
açılır; birleştirildiğinde katkı, GitHub katkı grafiğine de yazılır.

Elle eklemek istersen yol hâlâ açık: [CONTRIBUTING.md](CONTRIBUTING.md).

## Kök boyalar

Her ilmek 0–7 arası bir boya kodudur.

| Kod | Renk | Hex |
|---|---|---|
| 0 | Ham yün (zemin) | `#F3E6D3` |
| 1 | Kök boya kırmızısı | `#B8322B` |
| 2 | Çivit | `#2A2350` |
| 3 | Cehri sarısı | `#E3A935` |
| 4 | Asma yaprağı | `#5B7F3F` |
| 5 | Ceviz kabuğu | `#5A3524` |
| 6 | Kiremit | `#D9774A` |
| 7 | Gök mavisi | `#8DB7C4` |

## Motif kuralları

- `city`, 81 ilden biri olmalı ve Türkçe karakterlerle yazılmalı (`"İstanbul"`, `"Muğla"`).
- `message` isteğe bağlı, en fazla 60 karakter.
- `pixels`: 8×8 ilmek, her biri 0–7. En az **6 ilmek** boyalı olmalı.
- Herkesin **bir** motifi olur; güncellemek serbest.

Bu kurallar dört yerde birebir aynı tutulur:

| Yer | Ne için |
|---|---|
| `shared/domain/TileValidator.ts` | Tarayıcı ve sunucu |
| `server/utils/github/TileFile.ts` | Pull request açılırken |
| `supabase/schema.sql` | Veritabanı kısıtları (son söz) |
| `scripts/validate.mjs` | Pull request'teki JSON dosyaları |

Birini değiştirirken diğerlerini de güncelle.

## Nasıl çalışıyor?

```
Tarayıcı ──▶ Nuxt sunucusu ──▶ Supabase
             /api/tiles         tiles tablosu (tek doğruluk kaynağı)
             /api/me            kimlik, satır güvenliği
             /api/auth/*        GitHub girişi (HttpOnly çerez)
             /api/tiles/pr ──▶ GitHub App (bot)
                                 • dal aç, tiles/<kullanici>.json yaz
                                 • Co-authored-by ile commit
                                 • pull request aç
                                        │
             /api/github/webhook ◀──────┘  birleşince pr_status güncellenir
```

- **Tarayıcı Supabase'i hiç görmez.** Veritabanı adresi, anahtarı ve tablo
  şeması sunucuda kalır; istemci yalnızca kendi alan adındaki `/api/*` uçlarını
  çağırır. Oturum HttpOnly çerezde taşınır, JavaScript jetona erişemez.
- **Kilim sunucuda render edilir.** Motif sahiplerinin adları ve şehirleri
  HTML'de gelir, arama motoru da görür.
- Pull request'i kullanıcı değil bot açar, bu yüzden kimseden repo izni istenmez.
- Commit'teki `Co-authored-by` satırı, birleşme sonrası katkının kullanıcının
  grafiğinde sayılmasını sağlar.
- Herkesin kendi dosyası olduğu için pull request'ler birbiriyle çakışmaz.

## Proje yapısı

Özellik tabanlı (feature-based) bir düzen. İş kuralları saf sınıflarda;
reaktif durum yalnızca sayfa ve bileşenlerde.

```
shared/domain/          Saf domain sınıfları — Vue'dan ve ağdan bağımsız
  Motif.ts                8×8 motif (değişmez değer nesnesi)
  Dye.ts                  Kök boya paleti
  MotifGenerator.ts       Rastgele kilim motifi üreteci
  TileValidator.ts        Doğrulama kuralları
  CityCatalog.ts          81 il, Türkçe harfe duyarsız arama
  Result.ts               Hatasız akış için sonuç taşıyıcı

server/                 Nitro sunucusu — Supabase ve GitHub yalnızca burada
  api/tiles/              kilimi oku, motif kaydet, pull request aç
  api/auth/               GitHub girişi, çerez tabanlı oturum
  api/github/webhook      pull request durumu
  utils/github/           GitHub App kimliği, repo işlemleri, imza doğrulama

app/
  core/                 Temel sınıflar: BaseModel, BaseRepository, ApiErrorMapper
  features/
    tiles/                Karo modeli ve veri erişimi
    auth/                 Giriş, dokuyucu modeli
    rug/                  Kilim yerleşimi, ölçek ve sayaçlar (saf hesap)
    loom/                 Tezgâh: üç adımlı akış
    motif/                Çizim ızgarası ve boya paleti
    pullrequest/          Pull request durumu ve başarı kartı
  pages/index.vue       Tüm reaktif durum burada

supabase/
  schema.sql            Şema, kısıtlar, satır güvenliği
```

## Yerelde çalıştırma

```bash
pnpm install
cp .env.example .env    # anahtarları doldur
pnpm dev                # http://localhost:3000
```

Kurulumun tamamı: [SETUP.md](SETUP.md) · Yayın: [DEPLOY.md](DEPLOY.md)

## Lisans

MIT

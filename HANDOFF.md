# Kod Kilimi — Claude Code'a devir notu

Bu belge, tasarımı onaylanmış Kod Kilimi sitesinin geliştirilmesi için hazırlandı. Önce bunu, sonra `design/Main.dc.html` dosyasını oku.

## Ürün

Türkiye'deki geliştiricilerin birlikte dokuduğu ortak bir kilim. Her katılımcı 8 kök boyayla 8×8 ilmeklik bir motif çizer, GitHub ile giriş yapar ve tek tıkla kilime ekler. Motif **anında** kilimde görünür. Arka planda kullanıcı adına bir **pull request** açılır. Bu PR birleştirilince katkı kullanıcının GitHub katkı grafiğine yazılır.

## Repodaki mevcut durum

| Yol | Durum |
|---|---|
| `site/index.html` | İlk prototip (PR'ı kullanıcının kendisinin açtığı eski akış). **Yeni tasarımla değiştirilecek.** |
| `tiles/*.json` | Örnek motifler. `ornek-*` olanlar örnek, `edisdev.json` gerçek. |
| `data/cities.json` | 81 il listesi. |
| `scripts/validate.mjs` | Motif doğrulama kuralları. Kurallar aynen korunacak (aşağıda). |
| `scripts/build.mjs` | `tiles/*.json` → `site/tiles.json`. Yeni mimaride site veriyi Supabase'den okuyacağı için rolü değişir. |
| `.github/workflows/` | PR doğrulama ve Pages yayını. |
| `design/Main.dc.html` | **Onaylı tasarım.** Claude Design bileşen formatındadır (`<x-dc>`, `<sc-for>`, `{{…}}`). Üretim kodu değildir, görsel ve davranış referansıdır. Renkler, ölçüler, metinler ve durumlar buradan alınmalı. |
| `design/Mobile.dc.html` | Aynı tasarımın 390 px görünümü (Main'i içe aktarır). |

## Hedef mimari

```
Tarayıcı ──(Supabase Auth: GitHub)──▶ Supabase
   │                                     │
   │  insert/update tiles (RLS)          │ tiles tablosu (tek doğruluk kaynağı)
   │  select tiles (herkese açık)        │
   │                                     ▼
   │                              Edge Function: open-pr
   │                                     │ GitHub App (bot) ile:
   │                                     │  • branch aç
   │                                     │  • tiles/<kullanici>.json yaz
   │                                     │  • Co-authored-by ile commit
   │                                     │  • PR aç, numarayı tabloya yaz
   ▼                                     ▼
Kilim anında güncellenir          GitHub repo ── PR birleşince webhook ──▶ pr_status = merged
```

### Veri modeli (öneri)

`tiles` tablosu:

| Alan | Tip | Not |
|---|---|---|
| `id` | uuid, pk | |
| `user_id` | uuid, unique | `auth.users.id`. Kişi başı tek motif. |
| `github_id` | bigint, unique | GitHub kullanıcı id'si |
| `username` | text | GitHub kullanıcı adı |
| `avatar_url` | text | |
| `city` | text | 81 ilden biri (check constraint veya `cities` tablosu) |
| `message` | text, null | en fazla 60 karakter |
| `pixels` | char(64) | `^[0-7]{64}$`, en az 6 sıfır olmayan karakter |
| `pr_number` | int, null | |
| `pr_status` | text | `pending` · `open` · `merged` · `closed` |
| `created_at` / `updated_at` | timestamptz | Kilimdeki sıra `created_at`'e göre |

RLS:
- `select`: herkese açık.
- `insert` / `update`: yalnızca `auth.uid() = user_id`.
- `delete`: kapalı (moderasyon servis rolüyle).

### Doğrulama kuralları (`scripts/validate.mjs` ile aynı)

- `city` 81 ilden biri, Türkçe karakterlerle (`"İstanbul"`, `"Muğla"`).
- `message` isteğe bağlı, en fazla 60 karakter.
- `pixels` 8×8, her hücre 0–7, en az 6 boyalı ilmek.
- Kurallar hem veritabanında (constraint) hem Edge Function'da uygulanmalı.

### Pull request ve katkı grafiği

- PR, repoya kurulu bir **GitHub App** (bot) tarafından açılır. Kullanıcıdan ek GitHub izni istenmez.
- Katkının kullanıcının grafiğine yazılması için commit mesajına şu satır eklenir:
  `Co-authored-by: <username> <github_id>+<username>@users.noreply.github.com`
  Co-author'lu commitler, varsayılan dala birleşince ortak yazarın katkı grafiğinde sayılır.
- PR başlığı: `@<username> kilime katıldı`, içerik: motifin küçük bir önizlemesi ve şehir.
- Motif güncellenirse aynı dosyayı değiştiren yeni bir commit veya PR açılır.
- Birleştirme sonrası `pull_request.closed` webhook'u `pr_status` alanını günceller.
- Mevcut `validate.yml` bot PR'larını da denetlemeye devam etsin. Bot PR'larında "yalnızca kendi dosyan" kuralı, PR yazarı yerine commit'teki co-author'a göre kontrol edilmeli.

### Gizli anahtarlar

GitHub App private key, webhook secret ve Supabase service role key yalnızca Edge Function ortam değişkenlerinde durur. İstemcide yalnızca Supabase anon key bulunur.

## Arayüz

Tasarım referansı `design/Main.dc.html`. Özet:

### Tasarım dili

| Token | Değer | Kullanım |
|---|---|---|
| zemin | `#F8EDE7` | sayfa (gül kurusu yün) |
| yüzey | `#FFFAF6` | kartlar, tezgâh |
| çizgi | `#EAD8CF` | kenarlıklar, boş hücre |
| mürekkep | `#2A2350` | metin, koyu butonlar |
| soluk | `#6B6380` | ikincil metin |
| vurgu | `#B8322B` | ana buton, etiket (Tweaks'te değiştirilebilir) |
| sarı | `#E3A935` | kilim kenarı, avatar |
| teal | `#3F7C78` | tamamlanan kontroller, başarı |

- Yazı tipleri: başlıklar **Baloo 2** (600/800), metin **Nunito** (400–800).
- Köşeler: kartlar 20–24 px, alanlar 12–14 px, butonlar tam yuvarlak.
- Kök boyalar (kod → renk): `0 #F3E6D3` ham yün, `1 #B8322B` kök boya kırmızısı, `2 #2A2350` çivit, `3 #E3A935` cehri sarısı, `4 #5B7F3F` asma yaprağı, `5 #5A3524` ceviz kabuğu, `6 #D9774A` kiremit, `7 #8DB7C4` gök mavisi.

### Yerleşim

- **Masaüstü (≥ 900 px):** Solda kilim ve altında 3 "nasıl çalışıyor" kartı. Sağda 390 px genişliğinde tezgâh kartı.
- **Telefon (< 900 px):** Tek sütun; başlık → kilim → tezgâh → kartlar.
- **Kilim:** masaüstünde 8 sütun × 64 px karo, telefonda 6 sütun × 40 px, karolar arası 6 px. Üstte ve altta saçak, çivit dış çerçeve, kırmızı-sarı eğik şeritli kenar.
- Boş yuvalar soluk desenli, kullanıcının yeri kesikli çerçeveli. Eklendikten sonra çerçeve düz vurgu rengine döner.

### Tezgâh akışı ve durumlar

1. **Motifini çiz:** 8×8 ızgara, 8 boya, Ayna (varsayılan açık, yatay simetri) ve Temizle. Seçili boyayla aynı renkteki ilmeğe basmak onu siler. Gerçek sürümde sürükleyerek boyama ve klavyeyle gezinme de olsun.
2. **Kendini tanıt:**
   - Giriş yapılmamış: "GitHub ile giriş yap" butonu ve "Sadece kullanıcı adını ve profil fotoğrafını görürüz. Şifren bize gelmez." notu.
   - Giriş yapılmış: avatar (tasarımda baş harf rozeti, gerçekte GitHub avatarı), @kullanıcı adı, "Çıkış".
   - Şehir seçimi (81 il) ve isteğe bağlı not (60 karakter, sayaçlı).
3. **Kilime ekle:**
   - Önizleme kartı (64 px motif, @kullanıcı adı, şehir, not).
   - Kontrol listesi: motif ≥ 6 ilmek, giriş yapıldı, şehir seçildi. Hepsi tamamlanınca buton aktifleşir.
   - "Kilime ekle" → kayıt → **başarı kartı**: "Motifin kilimde!", PR satırı ve durum rozeti (`İncelemede` / `Birleşti` / `Kapatıldı`), "PR'ı gör" ve "Motifi düzenle".
   - Kullanıcının zaten motifi varsa tezgâh onun motifiyle açılsın ve buton "Motifimi güncelle" olsun.

**Arayüzde JSON, dosya adı veya repo ayrıntısı gösterilmez.**

### Diğer

- Başlıkta nazar motifi logo, sayaç rozetleri (dokuyucu, şehir, ilmek). Sayaçlar veriden hesaplanır.
- Motifin üzerine gelince veya dokununca `@kullanıcı · Şehir · not` gösterilsin.
- Kilim, Supabase Realtime ile yeni motifleri sayfa yenilenmeden alabilir (isteğe bağlı).
- Erişilebilirlik: ızgara hücreleri gerçek `<button>`, `aria-label` ile satır/sütun, görünür odak, dokunma hedefleri ≥ 44 px.

## Önerilen iş sırası

1. Supabase projesi: `tiles` tablosu, constraint'ler, RLS, GitHub Auth sağlayıcısı.
2. Mevcut `tiles/*.json` dosyalarını tabloya aktaran tek seferlik bir betik.
3. Ön yüz: tasarımın üretim sürümü (kilim, tezgâh, giriş, kaydetme, başarı durumu).
4. GitHub App ve `open-pr` Edge Function, PR numarası ve durumunu tabloya yazma.
5. Birleştirme webhook'u ve `pr_status` güncellemesi.
6. README ve CONTRIBUTING'i yeni akışa göre güncelleme (elle PR yolu da açık kalabilir).

## Açık sorular

- Ön yüz çatısı: bağımlılıksız mı kalsın, yoksa Vite + Vue/React mı? (Repo sahibine sor.)
- Moderasyon: uygunsuz motifleri kim ve nasıl kaldıracak?
- Motif güncellemesi kilimdeki sırayı değiştirmesin (sıra ilk ekleme tarihine göre).

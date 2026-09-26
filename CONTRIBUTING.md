# Katkı rehberi

## Motif eklemek

En kolay yol sitedeki tezgâhı kullanmak: çiz, GitHub ile gir, **Kilime ekle**'ye
bas. Pull request senin adına açılır.

Elle eklemek istersen:

1. Repoyu fork'la.
2. `tiles/` klasörüne **GitHub kullanıcı adınla aynı isimde** bir dosya ekle:
   `tiles/kullanici-adin.json` (küçük harf).
3. Dosyayı şu biçimde doldur:

```json
{
  "username": "edisdev",
  "city": "Samsun",
  "message": "Kilime ilk ilmeği ben attım.",
  "pixels": [
    "00000000",
    "00022000",
    "00211200",
    "02133120",
    "02133120",
    "00211200",
    "00022000",
    "00000000"
  ]
}
```

4. Kontrol et: `pnpm validate`
5. Pull request aç.

Elle eklenen karo, sen siteye GitHub ile giriş yapınca sana bağlanır ve
tezgâhta düzenlenebilir hâle gelir.

### Kurallar

- Herkesin **bir** motifi olur. Değiştirmek için aynı dosyayı güncelle.
- Bir pull request yalnızca **kendi** karo dosyana dokunabilir.
- `city`, 81 ilden biri olmalı ve Türkçe karakterlerle yazılmalı
  (`"İstanbul"`, `"Muğla"`). Tam liste: [`data/cities.json`](data/cities.json).
- `message` isteğe bağlı, en fazla 60 karakter.
- `pixels`: 8 satır, her satırda 0–7 arası 8 rakam. En az 6 ilmek boyalı olmalı.
- Motifler herkese açık bir duvarda duruyor. Saygılı ol; hakaret, reklam ya da
  uygunsuz içerik birleştirilmez.

## Siteye katkı

Site Nuxt ile yazıldı ve **SSR** çalışıyor; Supabase yalnızca sunucu tarafında.

```bash
pnpm install
cp .env.example .env    # anahtarları doldur (SETUP.md)
pnpm dev
```

Kurulum: [SETUP.md](SETUP.md) · Yayın: [DEPLOY.md](DEPLOY.md)

### Düzen

- İş kuralları `shared/domain` ve `app/features/*/services` altındaki
  **saf sınıflarda** — Vue'ya ve ağa dokunmazlar.
- Veri erişimi ince `*Repository` sınıflarında; `/api/*` uçlarıyla konuşurlar.
- Reaktif durum yalnızca sayfa ve bileşenlerde.
- **Yorumlar ve arayüz metinleri Türkçe, kod tanımlayıcıları İngilizce.**

Yeni bir motif kuralı eklerken dört yeri birden güncellemen gerekir; hangileri
olduğu [README](README.md#motif-kuralları) içinde yazıyor.

Denetimler:

```bash
pnpm typecheck
pnpm validate
pnpm contrast
```

### Fikirler

- Şehre göre filtre ve vurgulama
- Motifi PNG olarak indirme
- Türkiye haritası görünümü
- Kilimi büyütmek için sayfalama

Büyük bir değişiklikten önce bir issue açıp konuşalım.

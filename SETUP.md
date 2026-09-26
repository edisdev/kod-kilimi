# Kurulum

Kilimin çalışması için üç parça var: **Supabase** (veri ve kimlik),
**GitHub OAuth App** (giriş) ve **GitHub App** (pull request açan bot).

Anahtarların hiçbiri tarayıcıya inmez; hepsi Nuxt sunucusunda kalır.

---

## 1. Supabase

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje aç.
   - **Region:** Central EU (Frankfurt) — Türkiye'ye en yakını
   - **Automatically expose new tables:** kapalı (şema izinleri elle veriliyor)
   - **Enable automatic RLS:** açık
2. **SQL Editor** → `supabase/schema.sql` dosyasının tamamını yapıştır ve çalıştır.
3. **Project Settings → API Keys** altından iki değeri not al:
   - `Project URL`
   - `Publishable key` (`sb_publishable_...`) — legacy görünümde adı `anon`
   - `Secret key` (`sb_secret_...`) — legacy görünümde `service_role`

Şemayı doğrulamak için:

```sql
select
  (select count(*) from public.cities) = 81                      as il_sayisi,
  (select relrowsecurity from pg_class
    where oid = 'public.tiles'::regclass)                        as rls_acik,
  (select count(*) from pg_policies where tablename = 'tiles') = 3 as politikalar;
```

Üçü de `true` dönmeli.

---

## 2. GitHub ile giriş

Kullanıcıyı giriş yaptıran OAuth App. Bot değil.

1. **Settings → Developer settings → OAuth Apps → New OAuth App**
   - Application name: `Kod Kilimi`
   - Homepage URL: sitenin adresi
   - Authorization callback URL: `https://<proje-ref>.supabase.co/auth/v1/callback`
2. `Client ID` ve `Client secret` üret, ikisini de kopyala.
3. Supabase → **Authentication → Sign In / Providers → GitHub** → aç,
   ikisini yapıştır, **Save**.
4. Supabase → **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (yayında kendi alan adın)
   - Redirect URLs:
     ```
     http://localhost:3000/api/auth/callback
     https://<alan-adın>/api/auth/callback
     ```

> Callback adresi iki farklı yerde geçiyor ve karışması çok kolay:
> **GitHub'ın callback'i her zaman Supabase'i gösterir.** Bizim sunucumuzun
> adresi Supabase'in *Redirect URLs* listesine yazılır.

**E-posta sağlayıcısını kapat.** Yalnızca GitHub girişi kullanılıyor;
veritabanı da e-posta ile giren birinin karo eklemesini reddediyor.

---

## 3. Pull request açan bot

Kullanıcıdan repo izni istemiyoruz; pull request'i repoya kurulu bir
GitHub App açıyor.

1. **Settings → Developer settings → GitHub Apps → New GitHub App**
   - Adı: `Kod Kilimi`
   - Homepage URL: sitenin adresi
   - **Callback URL: boş** (bot kullanıcı tanımıyor)
   - Webhook → Active: alan adın hazırsa açık
   - Webhook URL: `https://<alan-adın>/api/github/webhook`
   - Webhook secret: `openssl rand -hex 32`
2. **Permissions → Repository permissions**
   - `Contents`: **Read and write**
   - `Pull requests`: **Read and write**
   - `Metadata`: Read-only (otomatik)
3. **Subscribe to events**: `Pull request`
4. **Where can this GitHub App be installed**: `Only on this account`
5. Oluştur, sonra:
   - En üstteki **App ID**'yi not al
   - **Generate a private key** → inen `.pem`'i sakla
   - **Install App** → kilim reposunu seç (`Only select repositories`)
   - Kurulum adresindeki sayıyı not al:
     `https://github.com/settings/installations/<KURULUM_ID>`

> Uygulama kuruluyken izinleri değiştirirsen GitHub yeni izinleri
> onaylamanı ister. Onaylamazsan izinler jetona geçmez ve bot yazamaz.

### Özel anahtarı çevir

GitHub `.pem` dosyasını PKCS#1 biçiminde verir, kod PKCS#8 bekler:

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in indirilen-anahtar.pem -out anahtar.pkcs8.pem

# .env'e tek satır olarak yazmak için:
awk '{printf "%s\\n", $0}' anahtar.pkcs8.pem
```

---

## 4. Ortam değişkenleri

```bash
cp .env.example .env
```

Doldurulacaklar `.env.example` içinde açıklamalı. Gizli bir değeri
ekrana ve shell geçmişine düşürmeden yazmak için:

```bash
node scripts/set-secret.mjs SUPABASE_SERVICE_ROLE_KEY
```

---

## 5. Yerelde çalıştırma

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Anahtarlar boşken site açılır ama kilim boş görünür ve giriş çalışmaz;
arayüz bunu bir uyarıyla söyler.

Diğer komutlar:

```bash
pnpm typecheck    # tip denetimi
pnpm validate     # tiles/*.json dosyalarını denetle
pnpm contrast     # renk kontrastı WCAG AA denetimi
pnpm icons        # favicon ve paylaşım görselini motiften üret
pnpm build        # üretim derlemesi (.output)
```

### Mevcut karoları aktarmak (isteğe bağlı)

Repodaki `tiles/*.json` dosyalarını tabloya taşır. Kilim boş da başlayabilir.

```bash
node scripts/import-tiles.mjs --kuru   # önce ne yapacağını göster

SUPABASE_URL="https://xxxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
node scripts/import-tiles.mjs
```

Aktarılan karolar sahipsiz olur; sahibi GitHub ile giriş yapıp motifini
kaydettiğinde karosunu devralır, kilimdeki sırası değişmez.

Geri almak için:

```sql
delete from public.tiles where user_id is null;
```

---

## 6. Yayın

Sunucuya çıkmak için: [DEPLOY.md](DEPLOY.md) — Docker + Caddy, otomatik HTTPS.

---

## Kontrol listesi

- [ ] `supabase/schema.sql` çalıştırıldı, üç kontrol de `true`
- [ ] GitHub girişi çalışıyor, avatar ve kullanıcı adı görünüyor
- [ ] E-posta sağlayıcısı kapalı
- [ ] Motif kaydedilince kilimde beliriyor
- [ ] Bot pull request açıyor, commit'te `Co-authored-by` satırı var
- [ ] Pull request birleşince rozet "Birleşti"ye dönüyor
- [ ] Tarayıcı DevTools → Network'te `supabase.co` adresine giden istek **yok**

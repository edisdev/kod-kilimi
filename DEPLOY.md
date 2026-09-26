# Yayın

Bu bir **Nuxt SSR** uygulaması (Nitro `node-server`). Statik değil; Node
çalıştıran bir sunucu gerekiyor. Sebebi bilinçli bir tercih: Supabase
anahtarının tarayıcıya inmemesi için bütün veri istekleri sunucudan atılıyor.

## Ön koşullar

- Bir VPS (Ubuntu 22.04/24.04 önerilir). Var olan bir sunucuya da kurulabilir;
  aşağıdaki **A** seçeneği tam bunun için.
- Bir alan adı; **A kaydı** sunucunun IP'sine baksın
- Sunucuda **80** ve **443** portları açık
- Docker

## 1. Ortam değişkenleri

Sunucuda proje kökünde bir `.env` oluştur. Şablon `.env.example` içinde.

```env
# Sunucu tarafı — tarayıcıya inmez
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=12345678
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=uzun-rastgele-metin

# Tarayıcıya inen — gizli değil
NUXT_PUBLIC_REPO=edisdev/kod-kilimi
NUXT_PUBLIC_SITE_URL=https://kodkilimi.com
```

> `SUPABASE_SERVICE_ROLE_KEY` bütün güvenlik kurallarını atlar. Yalnızca
> sunucudaki `.env` dosyasında durur; depoya, imaja ve tarayıcıya girmez.

## 2. Kurulum

Sunucuda başka bir site varsa (ortak Caddy) **A**, boş bir sunucuysa **B**.

### A — Sunucuda zaten bir Caddy çalışıyor

İki site tek proxy'nin arkasında durur; portlar çakışmaz, sertifikalar tek
yerden yönetilir.

```bash
# Ortak ağı bir kez oluştur
docker network create web
```

Mevcut Caddy'yi bu ağa kat. Onun `docker-compose.yml`inde caddy servisine:

```yaml
    networks:
      - web
      - default

networks:
  web:
    external: true
```

Caddyfile'ına kilim için iki blok ekle:

```
kodkilimi.com {
    encode zstd gzip
    reverse_proxy kodkilimi:3000
}

www.kodkilimi.com {
    redir https://kodkilimi.com{uri} permanent
}
```

Sonra kilimi kur:

```bash
curl -fsSL https://get.docker.com | sh   # Docker yoksa
git clone https://github.com/edisdev/kod-kilimi && cd kod-kilimi
# .env'i oluştur (yukarıdaki gibi)
docker compose up -d --build

# Caddy'yi yeni ayarlarla yeniden başlat
cd ../baris-akarsu && docker compose up -d
```

### B — Sunucu boş, kendi Caddy'si ile

```bash
curl -fsSL https://get.docker.com | sh
git clone https://github.com/edisdev/kod-kilimi && cd kod-kilimi
# .env'i oluştur

# Caddyfile içindeki alan adını kendi alan adınla değiştir
nano Caddyfile

docker compose -f docker-compose.standalone.yml up -d --build
```

Caddy sertifikayı Let's Encrypt'ten otomatik alır; birkaç saniye içinde
site HTTPS'te olur.

**Güncelleme:**

```bash
git pull
docker compose up -d --build     # B seçeneğinde: -f docker-compose.standalone.yml
```

**Loglar:** `docker compose logs -f web`
**Durdurma:** `docker compose down`

## 3. Yayına özel ayarlar

Alan adın belli olunca üç yeri güncelle:

**Supabase → Authentication → URL Configuration**
- Site URL: `https://kodkilimi.com`
- Redirect URLs listesine ekle: `https://kodkilimi.com/api/auth/callback`
  (yerelde denemeye devam etmek için `http://localhost:3000/api/auth/callback` kalsın)

**GitHub OAuth App** (giriş için)
- Homepage URL: `https://kodkilimi.com`
- Authorization callback URL **değişmez**: `https://<proje-ref>.supabase.co/auth/v1/callback`

**GitHub App** (pull request açan bot)
- Webhook → Active: açık
- Webhook URL: `https://kodkilimi.com/api/github/webhook`
- Secret: `.env`'deki `GITHUB_WEBHOOK_SECRET` ile birebir aynı

## Sertleştirme

Konteyner ayrıcalıksız çalışır: `node` kullanıcısı, salt okunur dosya
sistemi, düşürülmüş yetenekler, `no-new-privileges`. Ayrıca kilim yalnızca
`web` ağında; aynı makinedeki diğer site onu göremez, yalnızca Caddy erişir.

İlk açılışta bir yazma hatası görürsen (`EROFS`, `read-only file system`),
uygulamanın beklenmedik bir yere yazmaya çalıştığı anlamına gelir. Geçici
çözüm, `docker-compose.yml` içinde `read_only: true` satırını kaldırmak;
kalıcı çözüm, o yolu `tmpfs` listesine eklemek.

```bash
docker compose logs -f web    # ilk açılışta izle
```

## Sağlık kontrolü

```bash
curl -s https://kodkilimi.com/api/tiles | head -c 200
```

Karo listesi dönüyorsa sunucu ve Supabase bağlantısı çalışıyor demektir.

Tarayıcıda DevTools → Network sekmesinde yalnızca kendi alan adına giden
istekler görünmeli; `supabase.co` adresine giden bir istek olmamalı.

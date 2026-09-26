import { fileURLToPath } from 'node:url'

// Kendi sunucumuzda kök yolda yayınlanır. Alt yolda barındırmak istersen
// NUXT_APP_BASE_URL ver; simge yolları da bu önekle kurulur.
const baseURL = (process.env.NUXT_APP_BASE_URL || '/').replace(/\/*$/, '/')

export default defineNuxtConfig({
  compatibilityDate: '2026-09-26',
  devtools: { enabled: true },
  srcDir: 'app',

  // Kendi sunucumuzda çalışan Nuxt SSR (`node .output/server/index.mjs`).
  //
  // Statik yayından buraya geçildi: Supabase anahtarının tarayıcıya inmemesi
  // için isteklerin sunucudan atılması gerekiyor. Kilim de artık sunucuda
  // render edildiği için HTML'de görünür — arama motoru karoları da görür.
  ssr: true,
  nitro: {
    preset: 'node-server',
    // Doğrulama kuralları sunucu tarafında da kullanılıyor.
    alias: {
      '#domain': fileURLToPath(new URL('./shared/domain', import.meta.url)),
    },
  },

  app: {
    // Proje sayfası alt yolda yayınlanır: https://edisdev.github.io/kod-kilimi/
    // Yerelde ve özel alan adında NUXT_APP_BASE_URL=/ verilir.
    baseURL,
    head: {
      htmlAttrs: { lang: 'tr' },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: `${baseURL}favicon.svg` },
        { rel: 'apple-touch-icon', href: `${baseURL}apple-touch-icon.png` },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@400;600;700;800&display=swap',
        },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  // Bileşenler özellik klasörlerinde durur; klasör adı bileşen adına eklenmez.
  components: [{ path: '~/features', pathPrefix: false, extensions: ['vue'] }],

  // Doğrulama kuralları hem Nuxt hem Supabase Edge Function tarafından
  // kullanıldığı için app/ dışında, bağımsız bir klasörde durur.
  alias: {
    '#domain': fileURLToPath(new URL('./shared/domain', import.meta.url)),
  },

  // Değerler ÇALIŞMA ANINDA ortam değişkenlerinden gelir. Nuxt her anahtarı
  // NUXT_ önekli, BÜYÜK_HARFLİ karşılığıyla eşler:
  //   supabaseUrl       ← NUXT_SUPABASE_URL
  //   public.repo       ← NUXT_PUBLIC_REPO
  //
  // Buraya `process.env.X` yazmak işe yaramaz: o ifade derleme anında
  // okunur ve imaja sabitlenir. Docker'da derleme sırasında .env yoktur.
  runtimeConfig: {
    // ── Yalnızca sunucuda. Tarayıcıya hiçbiri inmez. ──
    supabaseUrl: '',
    supabaseAnonKey: '',
    // pr_number / pr_status sütunlarına hiçbir kullanıcı yazamaz; pull
    // request durumunu güncellemek için servis rolü gerekiyor.
    supabaseServiceKey: '',

    // Pull request'i açan GitHub App. Özel anahtar PKCS#8 biçiminde olmalı.
    githubAppId: '',
    githubAppInstallationId: '',
    githubAppPrivateKey: '',
    githubWebhookSecret: '',

    public: {
      // Yalnızca gösterim için; gizli değil.
      repo: 'edisdev/kod-kilimi',
      siteUrl: 'https://kodkilimi.com',
    },
  },

  typescript: { strict: true },
})

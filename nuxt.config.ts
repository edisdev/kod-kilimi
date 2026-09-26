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

  runtimeConfig: {
    // ── Yalnızca sunucuda. Tarayıcıya hiçbiri inmez. ──
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    // pr_number / pr_status sütunlarına hiçbir kullanıcı yazamaz; pull
    // request durumunu güncellemek için servis rolü gerekiyor. Sunucuda
    // kalır, tarayıcıya inmez.
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

    // Pull request'i açan GitHub App. Özel anahtar PKCS#8 biçiminde olmalı.
    githubAppId: process.env.GITHUB_APP_ID || '',
    githubAppInstallationId: process.env.GITHUB_APP_INSTALLATION_ID || '',
    githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY || '',
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',

    public: {
      // Yalnızca gösterim için; gizli değil.
      repo: process.env.NUXT_PUBLIC_REPO || 'edisdev/kod-kilimi',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://kodkilimi.com',
    },
  },

  typescript: { strict: true },
})

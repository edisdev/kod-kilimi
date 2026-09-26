<script setup lang="ts">
import { AuthRepository } from '~/features/auth/AuthRepository'
import { Weaver } from '~/features/auth/models/Weaver'
import { SignInFailure } from '~/features/auth/services/SignInFailure'
import { PullRequestRepository } from '~/features/pullrequest/PullRequestRepository'
import { TileRepository } from '~/features/tiles/TileRepository'
import { Tile, type PublicTile } from '~/features/tiles/models/Tile'
import { RugLayout } from '~/features/rug/services/RugLayout'
import { RugScale } from '~/features/rug/services/RugScale'
import { RugStats } from '~/features/rug/services/RugStats'
import { howItWorks, logoMotif } from '~/features/loom/steps'
import { Motif } from '#domain/Motif'

/*
 * Sayfa paylaşılan reaktif durumu tutar; hesaplama ve doğrulama işini saf
 * sınıflara (RugLayout, RugScale, RugStats) devreder. Veriye erişim ince
 * repository sınıflarından geçer.
 *
 * Supabase tarayıcıdan görünmez: her istek kendi sunucumuzdaki /api/*
 * uçlarına gider, veritabanı adresi ve anahtarı orada kalır.
 */

const { public: config } = useRuntimeConfig()

const pageTitle = 'Kod Kilimi — Bir ilmek de sen at'
const pageSummary =
  "Türkiye'deki geliştiricilerin birlikte dokuduğu bir kilim. 8×8 ilmeklik motifini çiz, GitHub ile gir, tek tıkla kilime ekle."
const siteRoot = config.siteUrl.replace(/\/+$/, '')

useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageSummary },
    { name: 'theme-color', content: '#F8EDE7' },

    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'Kod Kilimi' },
    { property: 'og:locale', content: 'tr_TR' },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageSummary },
    { property: 'og:url', content: siteRoot },
    { property: 'og:image', content: `${siteRoot}/og.png` },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'Motiflerle dokunmuş bir kilim parçası' },

    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: pageTitle },
    { name: 'twitter:description', content: pageSummary },
    { name: 'twitter:image', content: `${siteRoot}/og.png` },
  ],
})

// ── Depolar (Vue'dan bağımsız, saf I/O) ────────────────────────────
const tileRepository = new TileRepository()
const authRepository = new AuthRepository()
const pullRequestRepository = new PullRequestRepository()

// ── Sunucuda yüklenen veri ─────────────────────────────────────────
// Kilim ve oturum SSR sırasında okunur: karolar HTML'e gömülür, arama
// motoru da görür. Ham JSON tutulur; sınıflar iki tarafta da kurulur
// (sınıf örnekleri sunucu→istemci taşımasından sağ çıkmaz).
// SSR sırasında `$fetch` gelen isteğin çerezlerini taşımaz; oturum
// çerezi sunucudaki uca ulaşmaz ve kullanıcı giriş yapmamış görünür.
// `useRequestFetch` başlıkları olduğu gibi iletir.
const request = useRequestFetch()

const { data: rug, refresh: refreshRug, status: rugStatus } = await useAsyncData(
  'kilim',
  () => request<{ tiles: PublicTile[]; configured: boolean }>('/api/tiles'),
  { default: () => ({ tiles: [] as PublicTile[], configured: true }) },
)

const { data: session, refresh: refreshSession } = await useAsyncData(
  'oturum',
  () => request<{ weaver: { username: string; avatar: string | null; name: string } | null }>('/api/me'),
  { default: () => ({ weaver: null }) },
)

// ── Durum ──────────────────────────────────────────────────────────
const draft = shallowRef<Motif>(Motif.blank())
const city = ref('')
const message = ref('')

const saving = ref(false)
const authBusy = ref(false)
const editing = ref(false)
const error = ref<string | null>(null)
const signInError = ref<string | null>(null)
const pullRequestWarning = ref<string | null>(null)
const announcement = ref('')
const ready = ref(false)

const scale = shallowRef<RugScale>(RugScale.desktop)

// ── Türetilmiş değerler ────────────────────────────────────────────
const tiles = computed(() => (rug.value?.tiles ?? []).map((wire) => Tile.fromPublic(wire)))
const weaver = computed<Weaver | null>(() => Weaver.from(session.value?.weaver ?? null))
const configured = computed(() => rug.value?.configured !== false)
const loading = computed(() => rugStatus.value === 'pending')

const myTile = computed(() => tiles.value.find((tile) => tile.belongsTo(weaver.value)) ?? null)

/** Motif kaydedildi ve kullanıcı düzenlemeye dönmedi. */
const woven = computed(() => Boolean(myTile.value) && !editing.value)

const slots = computed(() =>
  new RugLayout({
    tiles: tiles.value,
    draft: draft.value,
    viewer: weaver.value,
    settled: woven.value,
    columns: scale.value.columns,
    minimumSlots: scale.value.minimumSlots,
  }).build(),
)

const stats = computed(() =>
  RugStats.from(tiles.value).withDraft(draft.value, {
    alreadyWoven: Boolean(myTile.value),
    city: city.value,
  }),
)

// ── Veri akışı ─────────────────────────────────────────────────────
/** Kaydedilen ya da yoklamayla gelen karoyu listeye yerleştirir. */
function absorb(wire: PublicTile) {
  const list = rug.value?.tiles ?? []
  const index = list.findIndex((tile) => tile.id === wire.id)
  const tiles = index === -1 ? [...list, wire] : list.map((t, i) => (i === index ? wire : t))
  rug.value = { tiles, configured: rug.value?.configured ?? true }
}

/** Kullanıcının kilimde karosu varsa tezgâh onunla açılır. */
function loadIntoLoom(tile: Tile | null) {
  if (!tile) return
  draft.value = tile.motif
  city.value = tile.city
  message.value = tile.message ?? ''
  editing.value = false
}

function signIn() {
  authBusy.value = true
  signInError.value = null
  authRepository.startSignIn()
}

async function signOut() {
  signInError.value = null
  await authRepository.signOut()
  await refreshSession()
  editing.value = false
  draft.value = Motif.blank()
  city.value = ''
  message.value = ''
}

async function weave() {
  if (!weaver.value) return

  saving.value = true
  error.value = null
  pullRequestWarning.value = null

  const saved = await tileRepository.save({
    motif: draft.value,
    city: city.value,
    note: message.value,
  })
  saving.value = false

  if (saved.failed) {
    error.value = saved.error!.message
    return
  }

  absorb(saved.unwrap().toPublic())
  editing.value = false

  // Pull request açılması motifin kilimde görünmesini bekletmesin.
  const opened = await pullRequestRepository.open()
  if (opened.failed) {
    pullRequestWarning.value = opened.error!.message
    return
  }
  await refreshRug()
}

// ── Yaşam döngüsü ──────────────────────────────────────────────────
let poll: ReturnType<typeof setInterval> | null = null

function onResize() {
  const next = RugScale.forWidth(window.innerWidth)
  if (next.columns !== scale.value.columns || next.tileSize !== scale.value.tileSize) {
    scale.value = next
  }
}

/**
 * Realtime yerine yoklama.
 *
 * Canlı websocket tarayıcıdan doğrudan Supabase'e açılırdı ve anahtar
 * isterdi; anahtarı sunucuda tutmak için ondan vazgeçildi. Yoklama kendi
 * sunucumuza gider, sekme arka plandayken durur.
 */
async function tick() {
  if (document.hidden) return
  const before = rug.value?.tiles.length ?? 0
  await refreshRug()
  const after = rug.value?.tiles.length ?? 0
  if (after > before) {
    const last = rug.value?.tiles.at(-1)
    if (last) announcement.value = `${last.user} ${last.city} şehrinden kilime katıldı.`
  }
}

onMounted(() => {
  ready.value = true

  // GitHub dönüşünde giriş başarısızsa sunucu adres satırına hata bırakır.
  const failure = SignInFailure.fromQuery(window.location.search)
  if (failure) {
    console.error('Giriş başarısız —', failure.raw)
    signInError.value = failure.message
    window.history.replaceState({}, '', window.location.pathname)
  }

  onResize()
  window.addEventListener('resize', onResize, { passive: true })

  loadIntoLoom(myTile.value)
  poll = setInterval(tick, 45_000)
})

watch(weaver, (next, previous) => {
  if (next && next.username !== previous?.username) loadIntoLoom(myTile.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (poll) clearInterval(poll)
})
</script>

<template>
  <div class="page">
    <header class="masthead">
      <span class="masthead__eyebrow">Açık kaynak · 81 il · tek kilim</span>

      <div class="masthead__name">
        <MotifSwatch class="masthead__logo" :cells="logoMotif.cells" :radius="6" />
        <h1 class="masthead__title">Kod Kilimi</h1>
      </div>

      <p class="masthead__tagline">Bir ilmek de sen at.</p>

      <p class="masthead__intro">
        Türkiye'deki geliştiricilerin birlikte dokuduğu bir kilim. 8×8 ilmeklik motifini çiz,
        GitHub ile gir, tek tıkla kilime ekle. İlk açık kaynak katkın için sıcacık bir başlangıç.
      </p>

      <div class="masthead__stats">
        <span v-for="badge in stats.badges" :key="badge.key" class="stat">
          <!-- key değerle birlikte değişince Vue düğümü yeniler ve
               animasyon baştan oynar: sayı arttığı an göze çarpar. -->
          <b :key="badge.value">{{ badge.value }}</b> {{ badge.label }}
        </span>
      </div>
    </header>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <p v-if="ready && !configured" class="notice" role="alert">
      Kilim şu an okunamıyor. Bağlantı ayarları tamamlanmamış.
    </p>

    <div class="layout">
      <div class="layout__rug">
        <!-- Görsel geri bildirimi shuttle veriyor; metin ekran okuyucu için. -->
        <p v-if="loading" class="sr-only" role="status">Kilim yükleniyor…</p>

        <RugWall
          :slots="slots"
          :loading="loading"
          :columns="scale.columns"
          :tile-size="scale.tileSize"
          :settled="woven"
        />
      </div>

      <div class="layout__bench">
        <LoomBench
          v-model:motif="draft"
          v-model:city="city"
          v-model:message="message"
          :weaver="weaver"
          :tile="myTile"
          :repo="config.repo"
          :saving="saving"
          :auth-busy="authBusy"
          :error="error"
          :sign-in-error="signInError"
          :pull-request-warning="pullRequestWarning"
          :woven="woven"
          @login="signIn"
          @logout="signOut"
          @weave="weave"
          @edit="editing = true"
        />
      </div>

      <section class="layout__steps" aria-label="Nasıl çalışıyor">
        <article v-for="step in howItWorks" :key="step.key" class="step-card">
          <MotifSwatch :cells="step.motif.cells" :size="40" :radius="5" />
          <div class="step-card__text">
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 48px 56px 56px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* ── Başlık ── */
.masthead {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 720px;
}

.masthead__eyebrow {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.masthead__name {
  display: flex;
  align-items: center;
  gap: 16px;
}

.masthead__logo {
  width: 56px;
  height: 56px;
}

.masthead__title {
  font-size: 76px;
  line-height: 0.95;
  letter-spacing: -0.01em;
}

.masthead__tagline {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 28px;
  line-height: 1.2;
  color: var(--accent);
}

.masthead__intro {
  font-size: 17px;
  line-height: 1.6;
  color: var(--muted);
  max-width: 600px;
}

.masthead__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 14px;
  color: var(--muted);
}

.stat b {
  animation: count-pop 420ms cubic-bezier(0.2, 1.3, 0.4, 1);
  display: inline-block;
  font-family: var(--font-display);
  font-size: 20px;
  line-height: 1;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.notice {
  padding: 14px 18px;
  border-radius: var(--radius-field);
  background: #f7e0de;
  color: #8c2b25;
  font-weight: 700;
}

/* ── Yerleşim ── */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--bench-width);
  grid-template-areas:
    'kilim tezgah'
    'adimlar tezgah';
  gap: 40px;
  align-items: start;
}

.layout__rug {
  grid-area: kilim;
  min-width: 0;
}

.layout__bench {
  grid-area: tezgah;
}

.layout__steps {
  grid-area: adimlar;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.step-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px;
  border-radius: var(--radius-box);
  background: var(--surface);
  border: 1px solid var(--border);
  transition: transform 200ms cubic-bezier(0.2, 1, 0.4, 1), border-color 200ms;
}

.step-card:hover {
  transform: translateY(-3px);
  border-color: var(--muted);
}

.step-card__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-card__text h3 {
  font-size: 18px;
}

.step-card__text p {
  font-size: 14px;
  line-height: 1.55;
  color: var(--muted);
}

/* ── Telefon ── */
@media (max-width: 899px) {
  .page {
    padding: 28px 16px 40px;
    gap: 28px;
  }

  .masthead__title {
    font-size: 48px;
  }

  .masthead__tagline {
    font-size: 22px;
  }

  .masthead__logo {
    width: 40px;
    height: 40px;
  }

  .layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'kilim'
      'tezgah'
      'adimlar';
    gap: 28px;
  }

  /*
   * Tek sütuna düşünce tezgâh tüm genişliğe yayılmasın. Boya daireleri ve
   * çizim hücreleri kare (aspect-ratio: 1) olduğu için genişlikle birlikte
   * boyları da büyür; tablette kocaman görünürler. Masaüstündeki 390 px'e
   * yakın bir tavanla sınırlayıp ortalıyoruz.
   */
  .layout__bench {
    width: 100%;
    max-width: 440px;
    margin-inline: auto;
  }

  .layout__steps {
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
    max-width: 640px;
    margin-inline: auto;
  }
}
</style>

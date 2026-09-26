<script setup lang="ts">
import type { RugSlot } from '../models/RugSlot'

/**
 * Dokunan kilim.
 *
 * Katmanlar tasarımdan birebir: saçak → çivit dış çerçeve → kırmızı-sarı
 * eğik şerit → ham yün → dokuma zemini → karolar.
 *
 * Dolu karoların üzerine gelince ya da dokununca "@kullanıcı · Şehir · not"
 * balonu açılır. Dokunmatikte `title` çalışmadığı için balon odaklanmayla
 * da görünür.
 */
const props = defineProps<{
  slots: readonly RugSlot[]
  columns: number
  tileSize: number
  /** Kullanıcı motifini kilime eklediyse kendi yuvası düz çerçeveye döner. */
  settled: boolean
  /** Kilim verisi hâlâ geliyorsa tezgâhta mekik gidip gelir. */
  loading?: boolean
}>()

const active = ref<string | null>(null)

/*
 * Kilime düşen karolar dokunuyormuş gibi belirsin.
 *
 * İki ayrı an var:
 *
 *  1. İlk dokuma — veri geldiğinde kilimdeki karolar sırayla belirir.
 *     Sayfa açıldığı anda kilim boştur (veri Supabase'den sonra gelir),
 *     bu yüzden animasyon ilk çizimde değil, ilk karolar geldiğinde oynar.
 *  2. Yeni katılımcı — sonradan düşen tek karo, beklemeden dokunur.
 *
 * Boş yuvalar ikisine de girmez: kilim bir satır büyüdüğünde arkadaki
 * boşluklar animasyon başlatmasın.
 */
const fresh = ref(new Set<string>())
/** Karo başına animasyon gecikmesi — ilk dokumada sırayla belirsinler. */
const delays = ref(new Map<string, number>())
const seen = new Set<string>()
/** İlk dokuma henüz oynamadı. Yalnızca gerçek karolar geldiğinde tükenir. */
let awaitingFirstWeave = true
const timers: ReturnType<typeof setTimeout>[] = []

watch(
  () => props.slots,
  (slots) => {
    const freshKeys: string[] = []
    let newlyWoven = 0

    for (const slot of slots) {
      if (seen.has(slot.key)) continue
      seen.add(slot.key)
      if (slot.isEmpty) continue
      freshKeys.push(slot.key)
      // Kullanıcının kendi boş yuvası ("Senin yerin") sayılmaz; yoksa
      // sayfa açılır açılmaz bayrak tükenir ve asıl dokuma kaçar.
      if (slot.kind === 'woven') newlyWoven++
    }

    if (!freshKeys.length) return

    const firstWeave = awaitingFirstWeave && newlyWoven > 0
    if (firstWeave) awaitingFirstWeave = false

    const nextDelays = new Map(delays.value)
    freshKeys.forEach((key, index) => {
      // Kalabalık kilimde bekleme uzamasın diye tavan konur.
      nextDelays.set(key, firstWeave ? Math.min(index * 30, 700) : 0)
    })
    delays.value = nextDelays

    fresh.value = new Set([...fresh.value, ...freshKeys])
    timers.push(
      setTimeout(() => {
        const remaining = new Set(fresh.value)
        for (const key of freshKeys) remaining.delete(key)
        fresh.value = remaining
      }, 2200),
    )
  },
  { immediate: true, deep: false },
)

onBeforeUnmount(() => timers.forEach(clearTimeout))

/** Saçak, kilimin tam genişliğine göre uzar. */
const fringeWidth = computed(
  () => props.columns * props.tileSize + (props.columns - 1) * 6 + 20,
)

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.columns}, ${props.tileSize}px)`,
}))

function slotStyle(slot: RugSlot) {
  const base = { width: `${props.tileSize}px`, height: `${props.tileSize}px` }
  if (!slot.isMine) return base
  return {
    ...base,
    outline: props.settled ? '3px solid var(--accent)' : '2.5px dashed var(--ink)',
    outlineOffset: '2px',
  }
}
</script>

<template>
  <section class="rug" aria-label="Kilim">
    <div class="rug__fringe" :style="{ width: `${fringeWidth}px` }" aria-hidden="true" />

    <div class="rug__frame">
      <div class="rug__stripe">
        <div class="rug__wool">
          <div
            class="rug__weave"
            :class="{ 'rug__weave--loading': loading }"
            :style="gridStyle"
          >
            <component
              :is="slot.focusable ? 'button' : 'div'"
              v-for="slot in slots"
              :key="slot.key"
              class="rug__slot"
              :class="{
                'rug__slot--interactive': slot.focusable,
                'rug__slot--new': fresh.has(slot.key),
              }"
              :type="slot.focusable ? 'button' : undefined"
              :style="slotStyle(slot)"
              :aria-label="slot.focusable ? slot.label : undefined"
              :aria-hidden="slot.focusable ? undefined : 'true'"
              @pointerenter="active = slot.key"
              @pointerleave="active = null"
              @focus="active = slot.key"
              @blur="active = null"
            >
              <MotifSwatch
                :cells="slot.cells"
                :radius="3"
                :weave="fresh.has(slot.key)"
                :delay="delays.get(slot.key) ?? 0"
              />
              <span v-if="active === slot.key && slot.focusable" class="rug__caption">
                {{ slot.label }}
              </span>
            </component>
          </div>
        </div>
      </div>
    </div>

    <div class="rug__fringe" :style="{ width: `${fringeWidth}px` }" aria-hidden="true" />

    <p class="rug__hint">Motiflerin üzerine gel, kimin olduğunu gör. Kesikli çerçeve senin yerin.</p>
  </section>
</template>

<style scoped>
.rug {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.rug__fringe {
  height: 14px;
  max-width: 100%;
  background: repeating-linear-gradient(90deg, #e2cdb4 0 3px, transparent 3px 7px);
}

.rug__frame {
  background: var(--ink);
  padding: 6px;
  border-radius: 18px;
  /* Saçaklar kilimin altına girsin. */
  margin: -12px 0;
  max-width: 100%;
}

.rug__stripe {
  background: repeating-linear-gradient(-45deg, var(--accent) 0 6px, var(--gold) 6px 10px);
  padding: 8px;
  border-radius: 13px;
}

.rug__wool {
  background: var(--wool);
  padding: 5px;
  border-radius: 8px;
}

.rug__weave {
  background: var(--weave);
  padding: 10px;
  border-radius: 5px;
  display: grid;
  gap: var(--tile-gap);
}

/* Veri beklenirken dokuma zemininde mekik gidip gelir. */
.rug__weave--loading {
  position: relative;
  overflow: hidden;
}

.rug__weave--loading::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    100deg,
    transparent 15%,
    rgb(255 250 246 / 50%) 45%,
    transparent 75%
  );
  animation: shuttle 1400ms linear infinite;
}

.rug__slot {
  all: unset;
  position: relative;
  display: block;
  border-radius: 3px;
}

.rug__slot--interactive {
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.2, 1.3, 0.4, 1);
}

.rug__slot--interactive:hover,
.rug__slot--interactive:focus-visible {
  transform: scale(1.09);
  z-index: 2;
}

/* Yeni dokunan karo kısa bir halkayla kendini belli eder. */
.rug__slot--new {
  animation: tile-pulse 1200ms ease-out;
  border-radius: 3px;
}

.rug__caption {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  max-width: 230px;
  width: max-content;
  padding: 8px 12px;
  border-radius: var(--radius-field-sm);
  background: var(--ink);
  color: var(--surface);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 6px 18px rgb(42 35 80 / 25%);
}

.rug__hint {
  font-size: 14px;
  color: var(--muted);
  text-align: center;
}
</style>

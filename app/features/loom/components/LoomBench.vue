<script setup lang="ts">
import { LoomChecklist } from '../services/LoomChecklist'
import type { Weaver } from '~/features/auth/models/Weaver'
import type { Tile } from '~/features/tiles/models/Tile'
import { DyePalette } from '#domain/Dye'
import { Motif } from '#domain/Motif'
import { MotifGenerator } from '#domain/MotifGenerator'
import { TileValidator } from '#domain/TileValidator'

/**
 * Tezgâh: üç adımda motif çizme, tanıtma ve kilime ekleme.
 *
 * Paylaşılan durum (motif, şehir, not) sayfada tutulur ve `defineModel` ile
 * çift yönlü bağlanır — kilim de aynı taslağı anlık gösterdiği için.
 * Yalnızca tezgâha ait olan seçili boya ve ayna burada durur.
 */
const motif = defineModel<Motif>('motif', { required: true })
const city = defineModel<string>('city', { required: true })
const message = defineModel<string>('message', { required: true })

const props = defineProps<{
  weaver: Weaver | null
  /** Kullanıcının kilimde duran karosu; yoksa null. */
  tile: Tile | null
  repo: string
  saving: boolean
  authBusy: boolean
  /** Kaydetme sırasında oluşan, kullanıcıya gösterilecek hata. */
  error: string | null
  /** GitHub girişi başarısız olduysa gösterilecek hata. */
  signInError: string | null
  /** Motif kaydedildi ama pull request açılamadıysa gösterilecek uyarı. */
  pullRequestWarning: string | null
  /** Motif kaydedildi ve kullanıcı düzenlemeye dönmedi. */
  woven: boolean
}>()

const emit = defineEmits<{
  login: []
  logout: []
  weave: []
  edit: []
}>()

const palette = DyePalette.kokBoya
const dye = ref(1)
const mirror = ref(true)

/*
 * Geri alma yığını. Motif değişmez olduğu için önceki hâli saklamak
 * bedava: kopya çıkarmaya gerek yok, referansı tutmak yetiyor.
 *
 * Bir fırça darbesi (sürükleyerek boyama) tek adım sayılır; yoksa yirmi
 * hücre boyayan biri yirmi kez geri almak zorunda kalırdı.
 */
const history = shallowRef<Motif[]>([])
const canUndo = computed(() => history.value.length > 0)

function remember() {
  history.value = [...history.value, motif.value].slice(-50)
}

function undo() {
  const stack = [...history.value]
  const previous = stack.pop()
  if (!previous) return
  history.value = stack
  motif.value = previous
}

function surprise() {
  remember()
  motif.value = new MotifGenerator().generate()
}

// Kullanıcının kilimdeki motifi tezgâha yüklendiğinde geçmiş sıfırlanır;
// yoksa "geri al" başkasının oturumundan kalma bir hâle dönerdi.
watch(
  () => props.tile?.id,
  () => {
    history.value = []
  },
)

const dyeName = computed(() => palette.nameAt(dye.value))
const messageLength = computed(() => Array.from(message.value).length)

const checklist = computed(
  () =>
    new LoomChecklist({
      motif: motif.value,
      username: props.weaver?.username ?? null,
      city: city.value,
    }),
)

const previewName = computed(() => props.weaver?.handle ?? '@kullanici-adin')
const previewCity = computed(() => city.value || 'Şehrin')
const submitLabel = computed(() => (props.tile ? 'Motifimi güncelle' : 'Kilime ekle'))

function paint(index: number) {
  motif.value = motif.value.paint(index, dye.value, { mirror: mirror.value })
}

function clear() {
  if (motif.value.isBlank) return
  remember()
  motif.value = Motif.blank()
}
</script>

<template>
  <aside class="bench" aria-label="Motifini doku">
    <div class="bench__band" aria-hidden="true" />

    <div class="bench__body">
      <!-- 1 ─ Motifini çiz -->
      <section class="bench__step">
        <StepHeading :step="1" title="Motifini çiz" />
        <MotifEditor :motif="motif" @paint="paint" @stroke-start="remember" />
        <DyePicker :dyes="palette.dyes" :selected="dye" @pick="dye = $event" />

        <div class="bench__tools">
          <span class="bench__dye-name">{{ dyeName }}</span>
          <div class="bench__tool-buttons">
            <button
              type="button"
              class="bench__icon"
              :disabled="!canUndo"
              title="Geri al"
              aria-label="Son değişikliği geri al"
              @click="undo"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 8a5 5 0 1 1 1.6 3.7M3 4.5V8h3.5"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              class="bench__icon"
              title="Şaşırt beni"
              aria-label="Rastgele bir motif oluştur"
              @click="surprise"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect
                  x="2.5"
                  y="2.5"
                  width="11"
                  height="11"
                  rx="3"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
                <circle cx="5.9" cy="5.9" r="1.15" fill="currentColor" />
                <circle cx="10.1" cy="10.1" r="1.15" fill="currentColor" />
                <circle cx="10.1" cy="5.9" r="1.15" fill="currentColor" />
              </svg>
            </button>

            <button
              type="button"
              class="bench__toggle"
              :class="{ 'bench__toggle--on': mirror }"
              :aria-pressed="mirror"
              @click="mirror = !mirror"
            >
              Ayna
            </button>
            <button type="button" class="bench__ghost" @click="clear">Temizle</button>
          </div>
        </div>
      </section>

      <!-- 2 ─ Kendini tanıt -->
      <section class="bench__step">
        <StepHeading :step="2" title="Kendini tanıt" />
        <WeaverCard
          :weaver="weaver"
          :busy="authBusy"
          @login="emit('login')"
          @logout="emit('logout')"
        />

        <p v-if="signInError" class="bench__error" role="alert">{{ signInError }}</p>

        <div class="bench__field">
          <label class="bench__label" for="sehir">Şehrin</label>
          <CityPicker v-model="city" />
        </div>

        <div class="bench__field">
          <label class="bench__label" for="not">
            Kilime bir not bırak
            <span class="bench__counter">
              {{ messageLength }}/{{ TileValidator.MESSAGE_MAX_LENGTH }}
            </span>
          </label>
          <input
            id="not"
            v-model="message"
            class="bench__input"
            :maxlength="TileValidator.MESSAGE_MAX_LENGTH"
            placeholder="İsteğe bağlı"
          >
        </div>
      </section>

      <!-- 3 ─ Kilime ekle -->
      <section class="bench__step">
        <StepHeading :step="3" title="Kilime ekle" />

        <TilePreview
          :cells="motif.cells"
          :name="previewName"
          :city="previewCity"
          :message="message.trim()"
        />

        <WovenCard
          v-if="woven && tile"
          :handle="tile.handle"
          :pull-request="tile.pullRequest"
          :repo="repo"
          :warning="pullRequestWarning"
          @edit="emit('edit')"
        />

        <template v-else>
          <LoomChecks id="kilime-ekle-kosullar" :items="checklist.items" />

          <button
            v-if="checklist.ready"
            type="button"
            class="bench__submit"
            :disabled="saving"
            @click="emit('weave')"
          >
            {{ saving ? 'Dokunuyor…' : submitLabel }}
            <svg v-if="!saving" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M4 9h10M10 5l4 4-4 4"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <!--
            Gerçek bir <button disabled> klavyeyle hiç bulunamaz; kullanıcı
            butonun neden pasif olduğunu öğrenemez. Bu yüzden odaklanabilir
            bırakılıp aria-disabled ile işaretleniyor ve koşul listesine
            bağlanıyor.
          -->
          <button
            v-else
            type="button"
            class="bench__submit bench__submit--off"
            aria-disabled="true"
            aria-describedby="kilime-ekle-kosullar"
          >
            {{ submitLabel }}
          </button>

          <p v-if="error" class="bench__error" role="alert">{{ error }}</p>

          <p class="bench__note">
            Motifin hemen kilimde görünür. Katkı grafiğine de yazılsın diye senin adına bir
            pull request açarız.
          </p>
        </template>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.bench {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bench__band {
  height: 10px;
  background: repeating-linear-gradient(
    90deg,
    var(--accent) 0 14px,
    var(--gold) 14px 20px,
    var(--ink) 20px 34px,
    var(--gold) 34px 40px
  );
}

.bench__body {
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.bench__step {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bench__tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bench__dye-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
}

.bench__tool-buttons {
  display: flex;
  gap: 6px;
}

.bench__toggle,
.bench__ghost,
.bench__icon {
  font: 700 13px/1 var(--font-body);
  padding: 10px 14px;
  min-height: 36px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--ink);
  transition: background 140ms, border-color 140ms, transform 140ms;
}

.bench__toggle:hover,
.bench__ghost:hover,
.bench__icon:not([disabled]):hover {
  background: var(--canvas);
  border-color: var(--muted);
}

.bench__toggle:active,
.bench__ghost:active,
.bench__icon:not([disabled]):active {
  transform: scale(0.94);
}

.bench__icon {
  padding: 10px;
  min-width: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bench__icon[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}

.bench__toggle--on {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--surface);
}

.bench__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bench__label {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
}

.bench__counter {
  font-weight: 600;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.bench__input {
  font: 16px var(--font-body);
  padding: 11px 12px;
  border-radius: var(--radius-field-sm);
  border: 1.5px solid var(--border);
  background: var(--canvas);
  color: var(--ink);
}

.bench__submit {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  border-radius: var(--radius-pill);
  background: var(--accent);
  color: #fff;
  font: 800 17px/1 var(--font-body);
  box-shadow: 0 4px 0 var(--accent-shadow);
  transition: transform 90ms ease-out, box-shadow 90ms ease-out;
}

/* Kalın gölge içeri çöksün: butona gerçekten basılmış gibi. */
.bench__submit:not([disabled]):active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--accent-shadow);
}

.bench__submit[disabled] {
  cursor: progress;
  opacity: 0.8;
}

.bench__submit--off {
  cursor: not-allowed;
  background: var(--border);
  /* 17px kalın yazı WCAG'de normal metin sayılır: 4.5:1 gerekir.
     #EAD8CF üzerinde 5.16:1. */
  color: #635552;
  box-shadow: none;
}

.bench__error {
  font-size: 14px;
  line-height: 1.5;
  color: var(--accent);
  font-weight: 700;
}

.bench__note {
  font-size: 14px;
  line-height: 1.55;
  color: var(--muted);
}

@media (max-width: 899px) {
  .bench__body {
    padding: 20px;
  }
}
</style>

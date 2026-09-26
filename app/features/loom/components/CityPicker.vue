<script setup lang="ts">
import { cityCatalog } from '../cities'

/**
 * 81 il için aranabilir açılır liste.
 *
 * Native `<select>` 81 seçeneği tek seferde açıp ekranı kapladığı için
 * yerine yazarak süzülen bir combobox kullanılıyor. Arama Türkçe harflere
 * duyarsız: "mugla" yazan da Muğla'yı bulur.
 *
 * Süzme işini saf `CityCatalog.search` yapar; burada yalnızca açık/kapalı
 * ve odak durumu tutulur.
 */
const city = defineModel<string>({ required: true })

const query = ref('')
const open = ref(false)
const activeIndex = ref(0)
const input = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)

const matches = computed(() => cityCatalog.search(query.value))

/** Kapalıyken seçili şehri, açıkken yazılanı gösterir. */
const shown = computed({
  get: () => (open.value ? query.value : city.value),
  set: (value: string) => {
    query.value = value
    open.value = true
    activeIndex.value = 0
  },
})

function pick(name: string) {
  city.value = name
  query.value = ''
  open.value = false
  input.value?.blur()
}

function reveal() {
  query.value = ''
  open.value = true
  activeIndex.value = Math.max(0, matches.value.indexOf(city.value))
  scrollToActive()
}

function close() {
  open.value = false
  query.value = ''
}

function move(step: number) {
  if (!matches.value.length) return
  const count = matches.value.length
  activeIndex.value = (activeIndex.value + step + count) % count
  scrollToActive()
}

/** Klavyeyle gezerken seçili satır görünür kalsın. */
function scrollToActive() {
  nextTick(() => {
    list.value
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!open.value) reveal()
      else move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Enter': {
      if (!open.value) return
      event.preventDefault()
      const choice = matches.value[activeIndex.value]
      if (choice) pick(choice)
      break
    }
    case 'Escape':
      if (open.value) {
        event.preventDefault()
        close()
      }
      break
    case 'Tab':
      close()
      break
  }
}
</script>

<template>
  <div class="city">
    <input
      id="sehir"
      ref="input"
      v-model="shown"
      class="city__input"
      type="text"
      role="combobox"
      autocomplete="off"
      :aria-expanded="open"
      aria-controls="sehir-listesi"
      aria-autocomplete="list"
      :aria-activedescendant="open ? `sehir-secenek-${activeIndex}` : undefined"
      :placeholder="open ? 'Yazarak ara: örn. mugla' : city || 'Şehir seç'"
      @focus="reveal"
      @blur="close"
      @keydown="onKeydown"
    >

    <span class="city__icon" aria-hidden="true">
      <svg v-if="open" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6.2" cy="6.2" r="4.2" stroke="currentColor" stroke-width="1.6" />
        <path d="M9.4 9.4 12.5 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M3 4.5 6 7.5l3-3"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>

    <div v-if="open" class="city__panel">
      <ul id="sehir-listesi" ref="list" class="city__list" role="listbox">
        <li
          v-for="(name, index) in matches"
          :id="`sehir-secenek-${index}`"
          :key="name"
          class="city__option"
          role="option"
          :data-active="index === activeIndex"
          :aria-selected="name === city"
          @mousedown.prevent="pick(name)"
          @mousemove="activeIndex = index"
        >
          {{ name }}
        </li>
      </ul>

      <p class="city__footer" aria-live="polite">
        {{ matches.length ? `${matches.length} il` : 'Böyle bir il yok' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.city {
  position: relative;
}

.city__input {
  width: 100%;
  box-sizing: border-box;
  font: 16px var(--font-body);
  padding: 11px 36px 11px 12px;
  border-radius: var(--radius-field-sm);
  border: 1.5px solid var(--border);
  background: var(--canvas);
  color: var(--ink);
}

/* Şehir seçilmemişken yer tutucu soluk, seçiliyken metin koyu görünür. */
.city__input::placeholder {
  color: var(--muted);
  opacity: 1;
}

.city__icon {
  position: absolute;
  right: 12px;
  top: 13px;
  color: var(--muted);
  pointer-events: none;
  display: inline-flex;
}

.city__panel {
  animation: soft-enter 160ms ease-out both;
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-field);
  overflow: hidden;
  box-shadow: 0 12px 28px rgb(42 35 80 / 18%);
}

.city__list {
  margin: 0;
  padding: 4px;
  list-style: none;
  /* Ekranı kaplamasın diye sınırlı yükseklik. */
  max-height: 240px;
  overflow-y: auto;
}

.city__option {
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: background 120ms linear;
}

.city__option[data-active='true'] {
  background: var(--canvas);
}

.city__option[aria-selected='true'] {
  font-weight: 800;
}

.city__footer {
  padding: 7px 12px;
  border-top: 1px solid var(--border);
  background: var(--canvas);
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  text-align: right;
}
</style>

<script setup lang="ts">
import type { PullRequestState } from '../models/PullRequestState'

/**
 * Motif kilime eklendikten sonra görünen başarı kartı.
 *
 * Pull request satırı durum rozetiyle birlikte gösterilir; durum Realtime
 * ile güncellendiğinde rozet kendiliğinden değişir.
 */
const props = defineProps<{
  handle: string
  pullRequest: PullRequestState
  repo: string
  /** Pull request isteği başarısızsa gösterilecek yumuşak uyarı. */
  warning?: string | null
}>()

const emit = defineEmits<{ edit: [] }>()

const pullRequestUrl = computed(() => props.pullRequest.urlIn(props.repo))
</script>

<template>
  <div class="woven" role="status">
    <div class="woven__head">
      <span class="woven__check" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.2 5 8.5l4.5-5"
            stroke="#fff"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span class="woven__title">Motifin kilimde!</span>
    </div>

    <p class="woven__lead">
      Kesikli çerçevedeki yerine dokundu. Katkı grafiğin için pull request'in de açıldı.
    </p>

    <div class="woven__pr">
      <span class="woven__pr-text">
        <b>{{ pullRequest.title }} · {{ handle }} kilime katıldı</b>
        <span class="woven__pr-hint">{{ pullRequest.hint }}</span>
      </span>
      <span class="woven__badge" :style="pullRequest.badgeStyle">{{ pullRequest.label }}</span>
    </div>

    <p v-if="warning" class="woven__warning">{{ warning }}</p>

    <div class="woven__actions">
      <a
        v-if="pullRequestUrl"
        class="woven__link"
        :href="pullRequestUrl"
        target="_blank"
        rel="noopener"
      >
        PR'ı gör
      </a>
      <button type="button" class="woven__edit" @click="emit('edit')">Motifi düzenle</button>
    </div>
  </div>
</template>

<style scoped>
.woven {
  animation: soft-enter 340ms cubic-bezier(0.2, 1, 0.4, 1) both;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: var(--success-bg);
  border: 1.5px solid var(--success-border);
}

.woven__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.woven__check {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--teal);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.woven__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  line-height: 1.1;
}

.woven__lead {
  font-size: 15px;
  line-height: 1.55;
  color: var(--success-text);
}

.woven__pr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-field-sm);
  background: var(--surface);
  flex-wrap: wrap;
}

.woven__pr-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.woven__pr-text b {
  font-size: 15px;
  overflow-wrap: anywhere;
}

.woven__pr-hint {
  font-size: 13px;
  color: var(--muted);
}

.woven__badge {
  padding: 6px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.woven__warning {
  font-size: 14px;
  line-height: 1.5;
  color: #8c2b25;
  font-weight: 700;
}

.woven__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.woven__link,
.woven__edit {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}

.woven__link {
  background: var(--ink);
  color: var(--surface);
}

.woven__edit {
  border: 1.5px solid var(--success-border);
  background: transparent;
  color: var(--ink);
  font-family: inherit;
}
</style>

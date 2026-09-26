<script setup lang="ts">
import type { Weaver } from '../models/Weaver'

/**
 * "Kendini tanıt" adımının kimlik bölümü.
 *
 * Giriş yapılmamışsa GitHub butonu ve gizlilik notu, yapılmışsa avatar,
 * kullanıcı adı ve çıkış bağlantısı gösterilir.
 */
defineProps<{
  weaver: Weaver | null
  busy?: boolean
}>()

const emit = defineEmits<{ login: []; logout: [] }>()

/** Avatar yüklenemezse baş harf rozetine düş. */
const avatarBroken = ref(false)
</script>

<template>
  <div v-if="!weaver" class="weaver weaver--out">
    <button type="button" class="weaver__login" :disabled="busy" @click="emit('login')">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="6.5" r="3" stroke="currentColor" stroke-width="1.8" />
        <path
          d="M3.5 15c.8-2.6 3-4 5.5-4s4.7 1.4 5.5 4"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
      {{ busy ? 'GitHub açılıyor…' : 'GitHub ile giriş yap' }}
    </button>
    <span class="weaver__note">
      Sadece kullanıcı adını ve profil fotoğrafını görürüz. Şifren bize gelmez.
    </span>
  </div>

  <div v-else class="weaver weaver--in">
    <img
      v-if="weaver.avatarUrl && !avatarBroken"
      class="weaver__avatar"
      :src="weaver.avatarUrl"
      :alt="`${weaver.handle} profil fotoğrafı`"
      width="40"
      height="40"
      loading="lazy"
      @error="avatarBroken = true"
    >
    <span v-else class="weaver__avatar weaver__avatar--letter" aria-hidden="true">
      {{ weaver.initial }}
    </span>

    <span class="weaver__who">
      <b>{{ weaver.handle }}</b>
      <span class="weaver__sub">GitHub ile bağlandı</span>
    </span>

    <button type="button" class="weaver__logout" @click="emit('logout')">Çıkış</button>
  </div>
</template>

<style scoped>
.weaver--out {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weaver__login {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  border-radius: var(--radius-field);
  background: var(--ink);
  color: var(--surface);
  font-weight: 800;
  font-size: 16px;
}

.weaver__login[disabled] {
  cursor: progress;
  opacity: 0.7;
}

.weaver__note {
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
}

.weaver--in {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-field);
  background: var(--canvas);
  border: 1.5px solid var(--border);
}

.weaver__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
}

.weaver__avatar--letter {
  background: var(--gold);
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 18px;
}

.weaver__who {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-grow: 1;
  min-width: 0;
}

.weaver__who b {
  font-size: 15px;
  overflow-wrap: anywhere;
}

.weaver__sub {
  font-size: 13px;
  color: var(--muted);
}

.weaver__logout {
  all: unset;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  padding: 8px 4px;
}
</style>

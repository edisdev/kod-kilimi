import type { User } from '@supabase/supabase-js'

/** Tarayıcıya verilen dokuyucu bilgisi. Kimlik (uuid) dışarı çıkmaz. */
export interface PublicWeaver {
  username: string
  avatar: string | null
  name: string
}

function pickText(meta: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = meta[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * Supabase kullanıcısını arayüzün gördüğü biçime çevirir.
 *
 * GitHub profili `user_metadata` içinde gelir; alan adları sağlayıcıya göre
 * değiştiği için okuma burada toplanmıştır.
 */
export function toPublicWeaver(user: User | null): PublicWeaver | null {
  if (!user) return null
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>

  const username = pickText(meta, ['user_name', 'preferred_username', 'login'])
  if (!username) return null

  return {
    username: username.toLowerCase(),
    avatar: pickText(meta, ['avatar_url', 'picture']) || null,
    name: pickText(meta, ['full_name', 'name']) || username,
  }
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

/**
 * Satır güvenliğini aşan istemci.
 *
 * Yalnızca `pr_number` / `pr_status` yazmak için kullanılır — bu sütunlara
 * hiçbir kullanıcı rolünün yetkisi yok (migration'da revoke edildi). Başka
 * hiçbir yerde kullanılmamalı; okuma ve kullanıcı yazmaları oturuma bağlı
 * istemciden (`supabaseFor`) geçer.
 *
 * Anahtar sunucunun ortam değişkeninde durur, tarayıcıya inmez.
 */
export function supabaseAdmin(event: H3Event): SupabaseClient {
  const config = useRuntimeConfig(event)

  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Pull request servisi yapılandırılmamış.',
    })
  }

  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

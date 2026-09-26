import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

/**
 * İstek bağlamına bağlı Supabase istemcisi.
 *
 * Oturum, tarayıcıdaki `localStorage` yerine **HttpOnly çerezlerde** durur.
 * Böylece Supabase adresi ve anahtarı istemciye hiç inmez; jetona JavaScript
 * de erişemez. Tarayıcı yalnızca kendi alan adımızdaki `/api/*` uçlarını görür.
 *
 * Anahtar `runtimeConfig`in gizli bölümünden okunur (`public` değil).
 */
export function supabaseFor(event: H3Event): SupabaseClient {
  const config = useRuntimeConfig(event)

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Bağlantı yapılandırılmamış.',
    })
  }

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(getHeader(event, 'cookie') ?? '')
          .filter((cookie): cookie is { name: string; value: string } =>
            typeof cookie.value === 'string',
          )
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          appendResponseHeader(
            event,
            'Set-Cookie',
            serializeCookieHeader(name, value, {
              ...options,
              httpOnly: true,
              sameSite: 'lax',
              path: '/',
              secure: !import.meta.dev,
            }),
          )
        }
      },
    },
  })
}

/** Bağlantı ayarlanmış mı? Arayüzdeki uyarı buna bakar. */
export function supabaseConfigured(event: H3Event): boolean {
  const config = useRuntimeConfig(event)
  return Boolean(config.supabaseUrl && config.supabaseAnonKey)
}

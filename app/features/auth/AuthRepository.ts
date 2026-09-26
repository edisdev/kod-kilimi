import { BaseRepository } from '~/core/BaseRepository'
import { Weaver, type WeaverPayload } from './models/Weaver'
import { Result } from '#domain/Result'

interface MeResponse {
  weaver: WeaverPayload | null
  configured: boolean
}

/**
 * Giriş/çıkış ve oturum bilgisi.
 *
 * Supabase ile konuşan taraf sunucudur; burada yalnızca kendi `/api/auth/*`
 * uçlarımız çağrılır. Oturum HttpOnly çerezde taşındığı için jeton hiçbir
 * zaman JavaScript'e görünmez.
 */
export class AuthRepository extends BaseRepository {
  /** Şu anki oturumun sahibi, yoksa null. */
  async currentWeaver(): Promise<Result<{ weaver: Weaver | null; configured: boolean }>> {
    const result = await this.call(
      () => $fetch<MeResponse>('/api/me'),
      'Oturum bilgisi alınamadı.',
    )
    return result.map((response) => ({
      weaver: Weaver.from(response.weaver),
      configured: response.configured,
    }))
  }

  /**
   * GitHub girişini başlatır.
   *
   * Yönlendirmeyi sunucu yapar: tarayıcı `/api/auth/github` adresine gider,
   * sunucu da GitHub'a. Böylece Supabase adresi adres çubuğunda bile
   * görünmez.
   */
  startSignIn(): void {
    window.location.href = '/api/auth/github'
  }

  async signOut(): Promise<Result<void>> {
    const result = await this.call(
      () => $fetch('/api/auth/logout', { method: 'POST' }),
      'Çıkış yapılamadı.',
    )
    return result.map(() => undefined)
  }
}

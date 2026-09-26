import { BaseRepository } from '~/core/BaseRepository'
import type { Result } from '#domain/Result'

interface OpenResponse {
  pr: number
  state: string
}

/**
 * Kullanıcı adına pull request açılmasını ister.
 *
 * Asıl iş sunucuda (`server/api/tiles/pr.post.ts`) yapılır: repoya kurulu
 * GitHub App dalı açar, karo dosyasını yazar ve commit'e `Co-authored-by`
 * satırını ekler. GitHub App özel anahtarı sunucunun ortam değişkeninde
 * durur, tarayıcıya hiç inmez.
 */
export class PullRequestRepository extends BaseRepository {
  /**
   * Motif kaydedildikten sonra çağrılır. Hangi karo olduğunu sunucu
   * oturumdan bulur; istemci kimlik göndermez.
   */
  async open(): Promise<Result<OpenResponse>> {
    return this.call(
      () => $fetch<OpenResponse>('/api/tiles/pr', { method: 'POST' }),
      'Pull request açılamadı. Motifin kilimde duruyor, sonra tekrar deneyebiliriz.',
    )
  }
}

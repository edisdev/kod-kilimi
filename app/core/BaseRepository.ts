import { ApiErrorMapper } from './ApiErrorMapper'
import { Result } from '#domain/Result'

/**
 * Kendi sunucumuzdaki `/api/*` uçlarıyla konuşan depoların ortak atası.
 *
 * İnce bir I/O katmanıdır: Vue'ya, reaktifliğe ve arayüze bağımlı değildir.
 * İstisna sızdırmaz; her şey `Result` içinde döner.
 *
 * Supabase artık yalnızca sunucuda; tarayıcı veritabanını, anahtarı ve
 * şemayı hiç görmez.
 */
export abstract class BaseRepository {
  protected async call<T>(
    request: () => Promise<T>,
    fallbackMessage: string,
  ): Promise<Result<T>> {
    try {
      return Result.ok(await request())
    } catch (thrown) {
      return Result.fail(ApiErrorMapper.toDomainError(thrown, fallbackMessage))
    }
  }
}

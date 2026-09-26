import { BaseRepository } from '~/core/BaseRepository'
import { Tile, type PublicTile } from './models/Tile'
import type { Motif } from '#domain/Motif'
import type { Result } from '#domain/Result'

interface TilesResponse {
  tiles: PublicTile[]
  configured: boolean
}

interface SaveResponse {
  tile: PublicTile
}

export interface WeaveRequest {
  motif: Motif
  city: string
  note: string
}

/**
 * Kilim verisine erişim.
 *
 * Supabase ile konuşan taraf sunucudur; burada yalnızca kendi `/api/tiles`
 * uçlarımız çağrılır. Tarayıcı veritabanı adresini, anahtarı ve tablo
 * şemasını hiç görmez.
 */
export class TileRepository extends BaseRepository {
  /** Kilimdeki sıra: karonun ilk dokunduğu an. */
  async listWoven(): Promise<Result<{ tiles: Tile[]; configured: boolean }>> {
    const result = await this.call(
      () => $fetch<TilesResponse>('/api/tiles'),
      'Kilim yüklenemedi.',
    )
    return result.map((response) => ({
      tiles: (response.tiles ?? []).map((wire) => Tile.fromPublic(wire)),
      configured: response.configured,
    }))
  }

  /**
   * Motifi kaydeder. Kullanıcı adı sunucuda oturumdan alınır; istemci
   * kimlik göndermez, gönderse de dikkate alınmaz.
   */
  async save(request: WeaveRequest): Promise<Result<Tile>> {
    const result = await this.call(
      () =>
        $fetch<SaveResponse>('/api/tiles', {
          method: 'POST',
          body: {
            motif: request.motif.code,
            city: request.city,
            note: request.note,
          },
        }),
      'Motif kilime eklenemedi.',
    )
    return result.map((response) => Tile.fromPublic(response.tile))
  }
}

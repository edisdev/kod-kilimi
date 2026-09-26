import type { Tile } from '~/features/tiles/models/Tile'
import type { Motif } from '#domain/Motif'

export interface StatBadge {
  readonly key: string
  readonly value: string
  readonly label: string
}

/**
 * Başlıktaki sayaçlar: kaç dokuyucu, kaç şehir, kaç ilmek.
 *
 * Saf bir hesaplayıcıdır; veri okumaz, yalnızca verilen karolardan sayar.
 * Tezgâhtaki motif henüz kaydedilmediyse `withDraft` ile sayıma katılır,
 * böylece kullanıcı katkısını anında görür.
 */
export class RugStats {
  private constructor(
    public readonly people: number,
    public readonly cities: number,
    public readonly knots: number,
    /** Sayılan şehirler; taslak yeni bir il getirirse ayırt edebilmek için. */
    private readonly cityNames: ReadonlySet<string> = new Set(),
  ) {}

  static from(tiles: readonly Tile[]): RugStats {
    const cities = new Set<string>()
    let knots = 0
    for (const tile of tiles) {
      if (tile.city) cities.add(tile.city)
      knots += tile.knotCount
    }
    return new RugStats(tiles.length, cities.size, knots, cities)
  }

  /**
   * Kilimde henüz yeri olmayan bir dokuyucunun taslağını sayıma ekler.
   * Kullanıcının zaten karosu varsa sayı artmaz, yalnızca ilmekler tazelenir.
   */
  withDraft(draft: Motif, options: { alreadyWoven: boolean; city: string }): RugStats {
    if (draft.isBlank) return this

    // Üç rozet aynı taslağı anlatır; biri artarken diğeri donuk kalmasın.
    const city = options.city.trim()
    const isNewCity = Boolean(city) && !this.cityNames.has(city)

    return new RugStats(
      options.alreadyWoven ? this.people : this.people + 1,
      isNewCity ? this.cities + 1 : this.cities,
      this.knots + draft.knotCount,
      isNewCity ? new Set([...this.cityNames, city]) : this.cityNames,
    )
  }

  private static format(value: number): string {
    return value.toLocaleString('tr-TR')
  }

  /** Başlıkta yan yana dizilen üç rozet. */
  get badges(): StatBadge[] {
    return [
      { key: 'dokuyucu', value: RugStats.format(this.people), label: 'dokuyucu' },
      { key: 'sehir', value: RugStats.format(this.cities), label: 'şehir' },
      { key: 'ilmek', value: RugStats.format(this.knots), label: 'ilmek' },
    ]
  }
}

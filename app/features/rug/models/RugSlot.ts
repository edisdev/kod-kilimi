import type { Motif, MotifCell } from '#domain/Motif'
import type { Tile } from '~/features/tiles/models/Tile'

export type RugSlotKind = 'woven' | 'mine' | 'empty'

/**
 * Kilimdeki tek bir yuva.
 *
 * Üç hâli vardır: dokunmuş bir karo, kullanıcının kendi yeri (kesikli
 * çerçeve) ve henüz boş bir yuva. Bileşen yalnızca bu nesneyi render eder.
 */
export class RugSlot {
  private constructor(
    public readonly key: string,
    public readonly kind: RugSlotKind,
    public readonly cells: readonly MotifCell[],
    public readonly label: string,
    public readonly tile: Tile | null,
  ) {}

  static woven(tile: Tile): RugSlot {
    return new RugSlot(`karo-${tile.id}`, 'woven', tile.motif.cells, tile.caption, tile)
  }

  /** Kullanıcının yeri. Henüz eklemediyse kesikli, ekledikten sonra düz çerçeve. */
  static mine(motif: Motif, label: string, settled: boolean, tile: Tile | null = null): RugSlot {
    return new RugSlot(
      tile ? `benim-${tile.id}` : 'benim-yerim',
      'mine',
      motif.cells,
      label,
      settled ? tile : null,
    )
  }

  static empty(index: number, cells: readonly MotifCell[]): RugSlot {
    return new RugSlot(`bos-${index}`, 'empty', cells, 'Boş, sıradaki dokuyucuyu bekliyor', null)
  }

  get isMine(): boolean {
    return this.kind === 'mine'
  }

  get isEmpty(): boolean {
    return this.kind === 'empty'
  }

  /** Boş yuvalar odaklanabilir olmasın; sadece dolu karolar gezilebilir. */
  get focusable(): boolean {
    return !this.isEmpty
  }
}

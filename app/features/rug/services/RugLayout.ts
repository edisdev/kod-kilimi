import { RugSlot } from '../models/RugSlot'
import type { Tile } from '~/features/tiles/models/Tile'
import { Dye, DyePalette } from '#domain/Dye'
import { Motif, type MotifCell } from '#domain/Motif'

export interface RugLayoutInput {
  tiles: readonly Tile[]
  /** Tezgâhtaki canlı motif; kullanıcının yuvasında anlık gösterilir. */
  draft: Motif
  /** Giriş yapan kişi; yoksa null. Karo sahipliği buna göre bulunur. */
  viewer: { id: string; username: string } | null
  /** Kullanıcı motifini kilime eklediyse çerçeve düz renge döner. */
  settled: boolean
  /** Bir satırdaki karo sayısı (masaüstü 8, telefon 6). */
  columns: number
  /** Kilim hiç boş görünmesin diye en az bu kadar yuva çizilir. */
  minimumSlots: number
}

/**
 * Kilimdeki yuvaların sırasını kurar.
 *
 * Kurallar:
 *  - Sıra, karonun ilk dokunduğu ana göredir; motif güncellemek sırayı bozmaz.
 *  - Kullanıcının kendi karosu varsa yerinde kalır, içinde tezgâhtaki canlı
 *    motif gösterilir. Yoksa dokunmuş karoların hemen ardına eklenir.
 *  - Kalan yerler boş yuvayla doldurulur; toplam her zaman tam satırdır.
 */
export class RugLayout {
  /** Boş yuvaların soluk dama deseni — her yuvada aynı olduğu için bir kez üretilir. */
  private static readonly emptyCells: readonly MotifCell[] = RugLayout.buildEmptyCells()

  private static buildEmptyCells(): MotifCell[] {
    const { base, accent } = DyePalette.emptySlotHexes
    const cells: MotifCell[] = []
    for (let index = 0; index < Motif.CELL_COUNT; index++) {
      const row = Math.floor(index / Motif.SIZE)
      const column = index % Motif.SIZE
      const hex = (column + row) % 4 === 0 ? accent : base
      cells.push({ index, row, column, code: 0, dye: new Dye(0, hex, 'Boş') })
    }
    return cells
  }

  constructor(private readonly input: RugLayoutInput) {}

  /** Kullanıcının kilimde zaten duran karosu. */
  private get myTile(): Tile | null {
    const { viewer, tiles } = this.input
    if (!viewer) return null
    return tiles.find((tile) => tile.belongsTo(viewer)) ?? null
  }

  private get myLabel(): string {
    const mine = this.myTile
    if (this.input.settled && mine) return mine.caption
    return 'Senin yerin'
  }

  build(): RugSlot[] {
    const { tiles, draft, columns, minimumSlots } = this.input
    const mine = this.myTile
    const slots: RugSlot[] = []

    for (const tile of tiles) {
      if (mine && tile.id === mine.id) {
        // Kendi karom: yerinde duruyor ama içinde tezgâhtaki canlı motif var.
        slots.push(RugSlot.mine(draft, this.myLabel, this.input.settled, tile))
      } else {
        slots.push(RugSlot.woven(tile))
      }
    }

    // Henüz karosu olmayan ziyaretçi için sıradaki yer.
    if (!mine) {
      slots.push(RugSlot.mine(draft, this.myLabel, this.input.settled))
    }

    const total = RugLayout.roundUpToRow(Math.max(slots.length, minimumSlots), columns)
    for (let index = slots.length; index < total; index++) {
      slots.push(RugSlot.empty(index, RugLayout.emptyCells))
    }

    return slots
  }

  private static roundUpToRow(count: number, columns: number): number {
    if (columns <= 0) return count
    return Math.ceil(count / columns) * columns
  }
}

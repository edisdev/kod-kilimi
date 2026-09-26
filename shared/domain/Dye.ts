import { DomainError, Result } from './Result'

/**
 * Bir kök boya. Motifteki her ilmek 0-7 arası bir boya koduyla saklanır.
 * Renkler onaylı tasarımdan (design/Main.dc.html) alınmıştır.
 */
export class Dye {
  constructor(
    public readonly code: number,
    public readonly hex: string,
    public readonly name: string,
  ) {}

  /** 0 numaralı boya zemin rengidir; boyamak yerine siler. */
  get isGround(): boolean {
    return this.code === 0
  }

  toString(): string {
    return String(this.code)
  }
}

/**
 * Sekiz kök boyadan oluşan sabit palet.
 * Tek örnek (`DyePalette.kokBoya`) üzerinden kullanılır.
 */
export class DyePalette {
  private readonly byCode: Map<number, Dye>

  private constructor(public readonly dyes: readonly Dye[]) {
    this.byCode = new Map(dyes.map((d) => [d.code, d]))
  }

  static readonly kokBoya = new DyePalette([
    new Dye(0, '#F3E6D3', 'Ham yün · silgi'),
    new Dye(1, '#B8322B', 'Kök boya kırmızısı'),
    new Dye(2, '#2A2350', 'Çivit'),
    new Dye(3, '#E3A935', 'Cehri sarısı'),
    new Dye(4, '#5B7F3F', 'Asma yaprağı'),
    new Dye(5, '#5A3524', 'Ceviz kabuğu'),
    new Dye(6, '#D9774A', 'Kiremit'),
    new Dye(7, '#8DB7C4', 'Gök mavisi'),
  ])

  get size(): number {
    return this.dyes.length
  }

  /** Kod aralık dışındaysa zemin boyasına düşer. */
  at(code: number): Dye {
    return this.byCode.get(code) ?? this.dyes[0]!
  }

  hexAt(code: number): string {
    return this.at(code).hex
  }

  nameAt(code: number): string {
    return this.at(code).name
  }

  has(code: number): boolean {
    return this.byCode.has(code)
  }

  resolve(code: number): Result<Dye> {
    const dye = this.byCode.get(code)
    return dye
      ? Result.ok(dye)
      : Result.fail(DomainError.of('boya-yok', `Böyle bir kök boya yok: ${code}`, 'dye'))
  }

  /** Kilimdeki boş yuvaların soluk dama deseni. */
  static readonly emptySlotHexes = { base: '#F3E6D3', accent: '#E6D8C2' } as const
}

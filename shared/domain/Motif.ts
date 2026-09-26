import { Dye, DyePalette } from './Dye'
import { DomainError, Result } from './Result'

/** Izgarada tek bir ilmek. Arayüz bu nesneleri doğrudan render eder. */
export interface MotifCell {
  readonly index: number
  readonly row: number
  readonly column: number
  readonly code: number
  readonly dye: Dye
}

/**
 * 8×8 ilmekten oluşan bir motif.
 *
 * Değişmezdir (immutable): `paint`, `clear` gibi işlemler yeni bir `Motif`
 * döndürür. Böylece Vue tarafında referans değişimi reaktifliği tetikler ve
 * geri alma gibi işlemler bedavaya gelir.
 *
 * İç gösterim, veritabanındaki `pixels` alanıyla birebir aynı olan
 * 64 karakterlik bir dizgidir: `"0000000000022000..."`.
 */
export class Motif {
  static readonly SIZE = 8
  static readonly CELL_COUNT = 64
  /** Bir motifin kilime kabul edilmesi için gereken en az boyalı ilmek. */
  static readonly MIN_KNOTS = 6
  static readonly PATTERN = /^[0-7]{64}$/
  static readonly ROW_PATTERN = /^[0-7]{8}$/

  private constructor(
    private readonly value: string,
    private readonly palette: DyePalette = DyePalette.kokBoya,
  ) {}

  // ── Oluşturucular ────────────────────────────────────────────────

  static blank(): Motif {
    return new Motif('0'.repeat(Motif.CELL_COUNT))
  }

  /** Geçersizse `DomainError` fırlatır. Girdiye güvenilen yerlerde kullan. */
  static from(value: string): Motif {
    return Motif.tryFrom(value).unwrap()
  }

  /** 64 karakterlik dizgiden güvenli oluşturma. */
  static tryFrom(value: unknown): Result<Motif> {
    if (typeof value !== 'string') {
      return Result.fail(DomainError.of('motif-tip', 'Motif metin olmalı.', 'pixels'))
    }
    if (!Motif.PATTERN.test(value)) {
      return Result.fail(
        DomainError.of('motif-bicim', 'Motif 0-7 arası 64 rakamdan oluşmalı.', 'pixels'),
      )
    }
    return Result.ok(new Motif(value))
  }

  /** `tiles/*.json` dosyalarındaki 8 satırlık biçimden oluşturur. */
  static fromRows(rows: unknown): Result<Motif> {
    if (!Array.isArray(rows) || rows.length !== Motif.SIZE) {
      return Result.fail(
        DomainError.of('motif-satir', `Motif ${Motif.SIZE} satırlık bir dizi olmalı.`, 'pixels'),
      )
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (typeof row !== 'string' || !Motif.ROW_PATTERN.test(row)) {
        return Result.fail(
          DomainError.of(
            'motif-satir-bicim',
            `${i + 1}. satır 0-7 arası 8 rakamdan oluşmalı.`,
            'pixels',
          ),
        )
      }
    }
    return Motif.tryFrom((rows as string[]).join(''))
  }

  // ── Okuma ────────────────────────────────────────────────────────

  /** Veritabanında ve karşılaştırmalarda kullanılan 64 karakterlik gösterim. */
  get code(): string {
    return this.value
  }

  toString(): string {
    return this.value
  }

  /** `tiles/*.json` biçimi: 8 satır, her biri 8 rakam. */
  toRows(): string[] {
    const rows: string[] = []
    for (let y = 0; y < Motif.SIZE; y++) {
      rows.push(this.value.slice(y * Motif.SIZE, (y + 1) * Motif.SIZE))
    }
    return rows
  }

  codeAt(index: number): number {
    return Number(this.value[index] ?? 0)
  }

  dyeAt(index: number): Dye {
    return this.palette.at(this.codeAt(index))
  }

  /** Render için 64 hücrenin tamamı. */
  get cells(): MotifCell[] {
    const cells: MotifCell[] = []
    for (let index = 0; index < Motif.CELL_COUNT; index++) {
      const code = this.codeAt(index)
      cells.push({
        index,
        row: Math.floor(index / Motif.SIZE),
        column: index % Motif.SIZE,
        code,
        dye: this.palette.at(code),
      })
    }
    return cells
  }

  /** Boyalı (zemin olmayan) ilmek sayısı. */
  get knotCount(): number {
    let count = 0
    for (let i = 0; i < this.value.length; i++) {
      if (this.value[i] !== '0') count++
    }
    return count
  }

  get isBlank(): boolean {
    return this.knotCount === 0
  }

  get hasEnoughKnots(): boolean {
    return this.knotCount >= Motif.MIN_KNOTS
  }

  /** Kilime eklenmek için gereken ilmek açığı. */
  get missingKnots(): number {
    return Math.max(0, Motif.MIN_KNOTS - this.knotCount)
  }

  equals(other: Motif | string | null | undefined): boolean {
    if (!other) return false
    return this.value === (typeof other === 'string' ? other : other.value)
  }

  // ── Dönüştürücüler (hepsi yeni Motif döndürür) ───────────────────

  /**
   * Bir ilmeği boyar.
   *
   * Tasarımdaki davranış: seçili boyayla aynı renkteki bir ilmeğe basmak
   * onu siler. `mirror` açıkken aynı satırdaki yatay eşi de boyanır.
   */
  paint(index: number, dyeCode: number, options: { mirror?: boolean } = {}): Motif {
    if (index < 0 || index >= Motif.CELL_COUNT) return this
    if (!this.palette.has(dyeCode)) return this

    const next = this.value.split('')
    const applied = this.codeAt(index) === dyeCode ? 0 : dyeCode
    next[index] = String(applied)

    if (options.mirror) {
      const row = Math.floor(index / Motif.SIZE)
      const column = index % Motif.SIZE
      next[row * Motif.SIZE + (Motif.SIZE - 1 - column)] = String(applied)
    }

    return new Motif(next.join(''), this.palette)
  }

  clear(): Motif {
    return Motif.blank()
  }
}

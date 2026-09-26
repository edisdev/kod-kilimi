/**
 * Veritabanı satırından üretilen modellerin ortak atası.
 *
 * Modeller değişmezdir: alanlar `readonly`, güncelleme yeni nesne üretir.
 * Her model satıra geri dönüşü (`toRow`) kendisi bilir; böylece alan adı
 * eşlemesi (snake_case ↔ camelCase) tek yerde kalır.
 */
export abstract class BaseModel<TRow extends Record<string, unknown> = Record<string, unknown>> {
  abstract readonly id: string

  /** Veritabanına yazılacak biçim. */
  abstract toRow(): Partial<TRow>

  equals(other: BaseModel | null | undefined): boolean {
    return Boolean(other) && this.id === other!.id
  }

  /** null/boş değerleri güvenle `Date`e çevirir. */
  protected static toDate(value: unknown): Date | null {
    if (!value || typeof value !== 'string') return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  protected static toText(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback
  }
}

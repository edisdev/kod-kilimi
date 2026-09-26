import { Motif } from '#domain/Motif'

export interface ChecklistItem {
  readonly key: string
  readonly done: boolean
  readonly text: string
}

export interface LoomChecklistInput {
  motif: Motif
  /** Giriş yapan kişinin kullanıcı adı; giriş yoksa null. */
  username: string | null
  city: string
}

/**
 * "Kilime ekle" adımındaki üç koşul.
 *
 * Saf bir kuraldır: aynı girdi her zaman aynı listeyi üretir. Buton,
 * üçü de tamamlanınca etkinleşir.
 */
export class LoomChecklist {
  constructor(private readonly input: LoomChecklistInput) {}

  get items(): ChecklistItem[] {
    const { motif, username, city } = this.input
    return [
      {
        key: 'motif',
        done: motif.hasEnoughKnots,
        text: motif.hasEnoughKnots
          ? 'Motif hazır'
          : `En az ${Motif.MIN_KNOTS} ilmek boya (${motif.knotCount}/${Motif.MIN_KNOTS})`,
      },
      {
        key: 'giris',
        done: Boolean(username),
        text: username ? `@${username} olarak girildi` : 'GitHub ile giriş yap',
      },
      {
        key: 'sehir',
        done: Boolean(city),
        text: city || 'Şehrini seç',
      },
    ]
  }

  get ready(): boolean {
    return this.items.every((item) => item.done)
  }
}

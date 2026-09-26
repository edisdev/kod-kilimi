/** `tiles` tablosundan okunan, pull request'e dönüşecek kayıt. */
export interface TileRecord {
  id: string
  username: string
  github_id: number
  city: string
  message: string | null
  pixels: string
  pr_number: number | null
  pr_status: string
}

/**
 * Bir karodan pull request'in bütün parçalarını üretir: dosya yolu, dosya
 * içeriği, dal adı, commit mesajı, başlık ve açıklama.
 *
 * Saf bir sınıftır — ağ, dosya sistemi ya da ortam değişkeni kullanmaz.
 *
 * Buradaki kurallar `shared/domain/TileValidator.ts`, `scripts/validate.mjs`
 * ve `supabase/schema.sql` ile aynı olmalıdır.
 */
export class TileFile {
  static readonly PIXELS_PATTERN = /^[0-7]{64}$/
  static readonly USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/
  static readonly MIN_KNOTS = 6
  static readonly MESSAGE_MAX_LENGTH = 60

  /** Motifin pull request açıklamasındaki emoji önizlemesi. */
  private static readonly SQUARES = ['⬜', '🟥', '⬛', '🟨', '🟩', '🟫', '🟧', '🟦']

  constructor(private readonly tile: TileRecord) {}

  /** Veritabanı kısıtlarına ek son kontrol. Boş dizi = geçerli. */
  validate(): string[] {
    const errors: string[] = []
    const { username, city, message, pixels } = this.tile

    if (!TileFile.USERNAME_PATTERN.test(username ?? '')) {
      errors.push('kullanıcı adı geçersiz')
    }
    if (!city?.trim()) {
      errors.push('şehir boş')
    }
    if (message && Array.from(message).length > TileFile.MESSAGE_MAX_LENGTH) {
      errors.push(`not ${TileFile.MESSAGE_MAX_LENGTH} karakteri aşıyor`)
    }
    if (!TileFile.PIXELS_PATTERN.test(pixels ?? '')) {
      errors.push('motif 0-7 arası 64 rakamdan oluşmalı')
    } else if (pixels.replace(/0/g, '').length < TileFile.MIN_KNOTS) {
      errors.push(`motifte en az ${TileFile.MIN_KNOTS} boyalı ilmek olmalı`)
    }
    return errors
  }

  private get handle(): string {
    return this.tile.username.toLowerCase()
  }

  /** Herkesin kendi dosyası olduğu için pull request'ler çakışmaz. */
  get path(): string {
    return `tiles/${this.handle}.json`
  }

  /** Aynı kişi motifini güncellerse aynı dal yeniden kullanılır. */
  get branch(): string {
    return `kilim/${this.handle}`
  }

  get rows(): string[] {
    const rows: string[] = []
    for (let y = 0; y < 8; y++) rows.push(this.tile.pixels.slice(y * 8, y * 8 + 8))
    return rows
  }

  /** `tiles/<kullanici>.json` içeriği. Sonunda satır sonu bırakılır. */
  get content(): string {
    const payload: Record<string, unknown> = {
      username: this.handle,
      city: this.tile.city,
    }
    if (this.tile.message) payload.message = this.tile.message
    payload.pixels = this.rows

    return `${JSON.stringify(payload, null, 2)}\n`
  }

  /**
   * Commit mesajı. `Co-authored-by` satırı, varsayılan dala birleşince
   * katkının kullanıcının GitHub grafiğine yazılmasını sağlar.
   */
  get commitMessage(): string {
    const lines = [this.title, '', `Şehir: ${this.tile.city}`]
    if (this.tile.message) lines.push(`Not: ${this.tile.message}`)
    lines.push('', this.coAuthorLine)
    return lines.join('\n')
  }

  get coAuthorLine(): string {
    const { github_id, username } = this.tile
    return `Co-authored-by: ${username} <${github_id}+${username}@users.noreply.github.com>`
  }

  get title(): string {
    return `@${this.tile.username} kilime katıldı`
  }

  /** Motifin emoji önizlemesi — kod bloğunda kare kare. */
  get preview(): string {
    return this.rows
      .map((row) => [...row].map((code) => TileFile.SQUARES[Number(code)]).join(''))
      .join('\n')
  }

  get body(): string {
    const parts = [
      `**${this.tile.city}**${this.tile.message ? ` · _${this.tile.message}_` : ''}`,
      '',
      this.preview,
      '',
      `Bu pull request [Kod Kilimi](https://github.com/) tezgâhından @${this.tile.username} adına açıldı.`,
      'Birleştirildiğinde katkı, ortak yazar olarak katkı grafiğine yazılır.',
    ]
    return parts.join('\n')
  }
}

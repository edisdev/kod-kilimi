/**
 * GitHub'dan dönüşte adres satırına düşen hatayı okunabilir bir mesaja çevirir.
 *
 * Supabase, giriş başarısız olduğunda kullanıcıyı siteye `?error=...` ile
 * geri gönderir. Bu sınıf saftır: bir sorgu dizgisi alır, Türkçe mesaj verir.
 */
export class SignInFailure {
  private constructor(
    public readonly code: string,
    public readonly description: string,
  ) {}

  /** Hata yoksa null döner. */
  static fromQuery(search: string): SignInFailure | null {
    const params = new URLSearchParams(search)
    const error = params.get('error') ?? params.get('error_code')
    if (!error) return null

    return new SignInFailure(
      params.get('error_code') ?? error,
      params.get('error_description') ?? '',
    )
  }

  /** Kullanıcıya gösterilecek metin. Teknik ayrıntı sızdırmaz. */
  get message(): string {
    const detail = this.description.toLowerCase()

    if (detail.includes('exchange')) {
      return 'GitHub girişi tamamlanamadı. Bağlantı ayarları eksik görünüyor; biraz sonra tekrar dene.'
    }
    if (this.code === 'access_denied') {
      return 'GitHub girişini onaylamadın. Kilime eklemek için giriş yapman gerekiyor.'
    }
    if (detail.includes('redirect')) {
      return 'Giriş sonrası dönüş adresi tanınmadı. Biraz sonra tekrar dene.'
    }
    return 'GitHub girişi tamamlanamadı. Biraz sonra tekrar dene.'
  }

  /** Geliştiricinin konsolda göreceği ham metin. */
  get raw(): string {
    return `${this.code}: ${this.description || '(açıklama gönderilmedi)'}`
  }
}

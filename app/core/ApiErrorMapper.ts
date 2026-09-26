import { DomainError } from '#domain/Result'

/**
 * Sunucudan dönen hatayı kullanıcıya gösterilebilir Türkçe mesaja çevirir.
 *
 * Uçlar zaten Türkçe `statusMessage` döndürüyor; bu sınıf onu alır, ağ ve
 * oturum hatalarını da anlaşılır hâle getirir. Arayüzde ham hata metni ya da
 * yığın izi görünmez.
 */
export class ApiErrorMapper {
  private static readonly byStatus: Record<number, string> = {
    401: 'Oturumun düşmüş görünüyor. Yeniden giriş yap.',
    403: 'Bu işlem için yetkin yok.',
    404: 'Aradığın şey bulunamadı.',
    429: 'Çok hızlı gidiyorsun. Biraz bekleyip tekrar dene.',
    503: 'Bağlantı şu an kurulamıyor. Biraz sonra tekrar dene.',
  }

  static toDomainError(error: unknown, fallback = 'Beklenmedik bir sorun oldu.'): DomainError {
    if (error instanceof DomainError) return error

    const raw = error as
      | { statusCode?: number; statusMessage?: string; message?: string }
      | null

    // Sunucunun kendi Türkçe mesajı varsa onu kullan.
    const fromServer = raw?.statusMessage?.trim()
    if (fromServer) return new DomainError(fromServer, String(raw?.statusCode ?? ''))

    const status = raw?.statusCode
    if (status && ApiErrorMapper.byStatus[status]) {
      return new DomainError(ApiErrorMapper.byStatus[status]!, String(status))
    }

    if (raw?.message?.includes('fetch')) {
      return new DomainError('Bağlantı kurulamadı. İnternetini kontrol et.', 'ag')
    }

    return new DomainError(fallback, status ? String(status) : 'bilinmeyen')
  }
}

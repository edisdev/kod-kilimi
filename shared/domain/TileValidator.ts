import { CityCatalog } from './CityCatalog'
import { Motif } from './Motif'
import { DomainError, Result, ValidationError } from './Result'

/** Kullanıcının tezgâhta ürettiği, henüz doğrulanmamış motif kaydı. */
export interface TileDraft {
  username?: unknown
  city?: unknown
  message?: unknown
  /** 64 karakterlik dizgi ya da 8 satırlık dizi. */
  pixels?: unknown
}

/** Doğrulamadan geçmiş, kaydedilmeye hazır kayıt. */
export interface ValidTile {
  username: string
  city: string
  message: string | null
  motif: Motif
}

/**
 * Karo doğrulama kuralları.
 *
 * Bu kurallar üç yerde birebir aynı olmalıdır:
 *   1. Bu sınıf — tarayıcı ve Supabase Edge Function
 *   2. `supabase/schema.sql` — veritabanı constraint'leri
 *   3. `scripts/validate.mjs` — pull request'teki JSON dosyaları
 *
 * Birini değiştirirken diğerlerini de güncelle.
 */
export class TileValidator {
  /** GitHub kullanıcı adı: 1-39 karakter, harf/rakamla başlar, tire içerebilir. */
  static readonly USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38})$/i
  static readonly MESSAGE_MAX_LENGTH = 60

  constructor(private readonly cities: CityCatalog) {}

  /** Tüm alanları doğrular, hataların hepsini birden toplar. */
  validate(draft: TileDraft): Result<ValidTile, ValidationError> {
    const errors: DomainError[] = []

    const username = this.validateUsername(draft.username)
    if (username.failed) errors.push(username.error!)

    const city = this.cities.validate(draft.city)
    if (city.failed) errors.push(city.error!)

    const message = this.validateMessage(draft.message)
    if (message.failed) errors.push(message.error!)

    const motif = this.validateMotif(draft.pixels)
    if (motif.failed) errors.push(motif.error!)

    if (errors.length) return Result.fail(new ValidationError(errors))

    return Result.ok({
      username: username.unwrap(),
      city: city.unwrap(),
      message: message.unwrap(),
      motif: motif.unwrap(),
    })
  }

  validateUsername(value: unknown): Result<string> {
    if (typeof value !== 'string' || !value.trim()) {
      return Result.fail(DomainError.of('kullanici-bos', 'GitHub ile giriş yap.', 'username'))
    }
    const username = value.trim()
    if (!TileValidator.USERNAME_PATTERN.test(username)) {
      return Result.fail(
        DomainError.of(
          'kullanici-bicim',
          'Geçerli bir GitHub kullanıcı adı değil.',
          'username',
        ),
      )
    }
    return Result.ok(username)
  }

  validateMessage(value: unknown): Result<string | null> {
    if (value === undefined || value === null || value === '') return Result.ok(null)
    if (typeof value !== 'string') {
      return Result.fail(DomainError.of('not-tip', 'Not metin olmalı.', 'message'))
    }
    const message = value.trim()
    if (!message) return Result.ok(null)
    // Emoji ve Türkçe harfler tek karakter sayılsın diye kod noktası uzunluğu.
    if (Array.from(message).length > TileValidator.MESSAGE_MAX_LENGTH) {
      return Result.fail(
        DomainError.of(
          'not-uzun',
          `Not en fazla ${TileValidator.MESSAGE_MAX_LENGTH} karakter olabilir.`,
          'message',
        ),
      )
    }
    return Result.ok(message)
  }

  /** 64 karakterlik dizgiyi de 8 satırlık diziyi de kabul eder. */
  validateMotif(value: unknown): Result<Motif> {
    const parsed = Array.isArray(value) ? Motif.fromRows(value) : Motif.tryFrom(value)
    if (parsed.failed) return parsed

    const motif = parsed.unwrap()
    if (!motif.hasEnoughKnots) {
      return Result.fail(
        DomainError.of(
          'motif-seyrek',
          `Motifte en az ${Motif.MIN_KNOTS} boyalı ilmek olmalı (şu an ${motif.knotCount}).`,
          'pixels',
        ),
      )
    }
    return Result.ok(motif)
  }

  /** Karo dosyasının adı her zaman küçük harfli kullanıcı adıdır. */
  static fileNameFor(username: string): string {
    return `tiles/${username.trim().toLowerCase()}.json`
  }
}

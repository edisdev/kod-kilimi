/**
 * Sonuç taşıyıcı. İstisna fırlatmak yerine başarı/başarısızlık durumunu
 * tip güvenli biçimde döndürmek için kullanılır.
 *
 * Hem Nuxt tarafında hem de Supabase Edge Function (Deno) tarafında
 * çalışması gerektiği için hiçbir dış bağımlılığı yoktur.
 */
export class Result<T, E = DomainError> {
  private constructor(
    private readonly _value: T | undefined,
    private readonly _error: E | undefined,
    public readonly ok: boolean,
  ) {}

  static ok<T, E = DomainError>(value: T): Result<T, E> {
    return new Result<T, E>(value, undefined, true)
  }

  static fail<T, E = DomainError>(error: E): Result<T, E> {
    return new Result<T, E>(undefined, error, false)
  }

  get failed(): boolean {
    return !this.ok
  }

  /** Başarılıysa değeri verir, değilse hatayı fırlatır. */
  unwrap(): T {
    if (!this.ok) throw this._error
    return this._value as T
  }

  /** Başarısızsa verilen yedek değeri döndürür. */
  unwrapOr(fallback: T): T {
    return this.ok ? (this._value as T) : fallback
  }

  get error(): E | undefined {
    return this._error
  }

  get value(): T | undefined {
    return this._value
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.ok ? Result.ok<U, E>(fn(this._value as T)) : Result.fail<U, E>(this._error as E)
  }

  chain<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return this.ok ? fn(this._value as T) : Result.fail<U, E>(this._error as E)
  }
}

/** Alan adına bağlanabilen, kullanıcıya gösterilebilir Türkçe hata. */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'gecersiz',
    public readonly field?: string,
  ) {
    super(message)
    this.name = 'DomainError'
  }

  static of(code: string, message: string, field?: string): DomainError {
    return new DomainError(message, code, field)
  }
}

/** Birden çok doğrulama hatasını tek sonuçta toplar. */
export class ValidationError extends DomainError {
  constructor(public readonly errors: DomainError[]) {
    super(errors.map((e) => e.message).join(' · '), 'dogrulama', errors[0]?.field)
    this.name = 'ValidationError'
  }

  get messages(): string[] {
    return this.errors.map((e) => e.message)
  }
}

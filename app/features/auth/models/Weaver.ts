import { BaseModel } from '~/core/BaseModel'

/** Sunucunun `/api/me` ucundan dönen biçim. */
export interface WeaverPayload {
  username: string
  avatar: string | null
  name: string
}

/**
 * Kilime ilmek atan kişi.
 *
 * Kimlik doğrulama tamamen sunucuda yapılır; tarayıcıya yalnızca herkese
 * açık profil bilgisi iner. Oturum jetonu HttpOnly çerezdedir, JavaScript
 * ona erişemez.
 */
export class Weaver extends BaseModel {
  private constructor(
    public readonly username: string,
    public readonly avatarUrl: string | null,
    public readonly displayName: string,
  ) {
    super()
  }

  /** Kullanıcı adı kimliğin kendisidir: benzersiz ve jetondan gelir. */
  get id(): string {
    return this.username
  }

  static from(payload: WeaverPayload | null | undefined): Weaver | null {
    if (!payload?.username) return null
    return new Weaver(
      payload.username.toLowerCase(),
      payload.avatar || null,
      payload.name || payload.username,
    )
  }

  toRow(): Record<string, unknown> {
    return { username: this.username, avatar_url: this.avatarUrl }
  }

  get handle(): string {
    return `@${this.username}`
  }

  /** Avatar yüklenemezse gösterilecek baş harf. */
  get initial(): string {
    return (this.username[0] ?? '?').toLocaleUpperCase('tr-TR')
  }

  get profileUrl(): string {
    return `https://github.com/${this.username}`
  }
}

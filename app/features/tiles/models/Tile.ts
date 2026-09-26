import { BaseModel } from '~/core/BaseModel'
import { PullRequestState } from '~/features/pullrequest/models/PullRequestState'
import { Motif } from '#domain/Motif'

/** Sunucunun `/api/tiles` ucundan dönen karo biçimi. */
export interface PublicTile {
  id: string
  user: string
  avatar: string | null
  city: string
  note: string | null
  motif: string
  pr: number | null
  state: string
  at: string
}

/**
 * Kilimdeki bir karo: bir kişinin motifi, şehri ve notu.
 *
 * Kilimdeki sıra `createdAt`e göredir; motif güncellendiğinde `updatedAt`
 * değişir ama sıra korunur.
 */
export class Tile extends BaseModel {
  private constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly avatarUrl: string | null,
    public readonly city: string,
    public readonly message: string | null,
    public readonly motif: Motif,
    public readonly pullRequest: PullRequestState,
    public readonly createdAt: Date | null,
    public readonly updatedAt: Date | null,
  ) {
    super()
  }

  /** Sunucudan gelen biçimden üretir. */
  static fromPublic(wire: PublicTile): Tile {
    return new Tile(
      BaseModel.toText(wire.id),
      BaseModel.toText(wire.user),
      typeof wire.avatar === 'string' && wire.avatar ? wire.avatar : null,
      BaseModel.toText(wire.city),
      typeof wire.note === 'string' && wire.note.trim() ? wire.note.trim() : null,
      Motif.tryFrom(wire.motif).unwrapOr(Motif.blank()),
      PullRequestState.from(wire.state, wire.pr),
      BaseModel.toDate(wire.at),
      BaseModel.toDate(wire.at),
    )
  }

  toRow(): Record<string, unknown> {
    return {
      username: this.username,
      city: this.city,
      message: this.message,
      pixels: this.motif.code,
    }
  }

  /** Sunucunun döndürdüğü biçime geri çevirir (yerel listeye eklemek için). */
  toPublic(): PublicTile {
    return {
      id: this.id,
      user: this.username,
      avatar: this.avatarUrl,
      city: this.city,
      note: this.message,
      motif: this.motif.code,
      pr: this.pullRequest.number,
      state: this.pullRequest.status,
      at: (this.createdAt ?? new Date()).toISOString(),
    }
  }

  get handle(): string {
    return `@${this.username}`
  }

  get hasMessage(): boolean {
    return Boolean(this.message)
  }

  /** Motifin üzerine gelince görünen metin: "@edisdev · Samsun · not" */
  get caption(): string {
    const parts = [this.handle, this.city]
    if (this.message) parts.push(this.message)
    return parts.join(' · ')
  }

  get knotCount(): number {
    return this.motif.knotCount
  }

  get profileUrl(): string {
    return `https://github.com/${this.username}`
  }

  /**
   * Karo bu kişiye mi ait?
   *
   * Kullanıcı adı benzersizdir ve sunucuda oturum jetonundan doğrulanır;
   * eşleşme için başka bir kimliğe gerek yok.
   */
  belongsTo(viewer: { username: string } | null | undefined): boolean {
    return Boolean(viewer) && this.username === viewer!.username.toLowerCase()
  }

  /**
   * Pull request bilgisi değişmiş kopyasını üretir.
   *
   * `open-pr` işlevi numarayı döndürdüğünde arayüz bunu hemen uygular;
   * yalnızca Realtime'a güvenirsek kanal düştüğünde rozet "Açılıyor"da
   * takılı kalır.
   */
  withPullRequest(number: number | null, status: string): Tile {
    return new Tile(
      this.id,
      this.username,
      this.avatarUrl,
      this.city,
      this.message,
      this.motif,
      PullRequestState.from(status, number),
      this.createdAt,
      this.updatedAt,
    )
  }

  /** Aynı karonun güncellenmiş hâlini üretir (sıra bozulmaz). */
  withMotif(motif: Motif, city: string, message: string | null): Tile {
    return new Tile(
      this.id,
      this.username,
      this.avatarUrl,
      city,
      message,
      motif,
      this.pullRequest,
      this.createdAt,
      new Date(),
    )
  }
}

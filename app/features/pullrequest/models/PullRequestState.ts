/** Veritabanındaki `pr_status` alanının alabileceği değerler. */
export type PullRequestStatus = 'pending' | 'open' | 'merged' | 'closed' | 'failed'

interface StateStyle {
  readonly label: string
  readonly hint: string
  readonly background: string
  readonly color: string
}

/**
 * Pull request durumunun arayüzdeki karşılığı.
 *
 * Rozet metni ve rengi burada durur; bileşenler durum koduna göre
 * `if/else` kurmaz, doğrudan bu nesneyi render eder.
 */
export class PullRequestState {
  private static readonly styles: Record<PullRequestStatus, StateStyle> = {
    pending: {
      label: 'Açılıyor',
      hint: 'Senin adına pull request hazırlanıyor',
      background: '#fbefd6',
      color: '#7a5410',
    },
    open: {
      label: 'İncelemede',
      hint: 'Bot kontrol etti, birleştirilmeyi bekliyor',
      background: '#fbefd6',
      color: '#7a5410',
    },
    merged: {
      label: 'Birleşti',
      hint: 'Katkın GitHub grafiğine yazıldı',
      background: '#e4f0ec',
      color: '#2a4a47',
    },
    closed: {
      label: 'Kapatıldı',
      hint: 'Pull request birleştirilmeden kapatıldı',
      background: '#ead8cf',
      // #EAD8CF üzerinde 5.15:1 — WCAG AA
      color: '#5c5470',
    },
    failed: {
      label: 'Açılamadı',
      hint: 'Pull request açılamadı, motifin kilimde duruyor',
      background: '#f7e0de',
      color: '#8c2b25',
    },
  }

  private constructor(
    public readonly status: PullRequestStatus,
    public readonly number: number | null,
  ) {}

  static from(status: unknown, number: unknown = null): PullRequestState {
    const known = (status ?? 'pending') as PullRequestStatus
    const valid = known in PullRequestState.styles ? known : 'pending'
    const parsed = typeof number === 'number' && Number.isFinite(number) ? number : null
    return new PullRequestState(valid, parsed)
  }

  private get style(): StateStyle {
    return PullRequestState.styles[this.status]
  }

  get label(): string {
    return this.style.label
  }

  get hint(): string {
    return this.style.hint
  }

  get badgeStyle(): Record<string, string> {
    return { background: this.style.background, color: this.style.color }
  }

  /** Numara atanmadan önce PR'a bağlantı verilemez. */
  get hasNumber(): boolean {
    return this.number !== null
  }

  get isSettled(): boolean {
    return this.status === 'merged' || this.status === 'closed'
  }

  get isMerged(): boolean {
    return this.status === 'merged'
  }

  /** "PR #128 · @edisdev kilime katıldı" satırındaki ilk parça. */
  get title(): string {
    return this.hasNumber ? `PR #${this.number}` : 'Pull request'
  }

  urlIn(repo: string): string | null {
    if (!repo) return null
    return this.hasNumber
      ? `https://github.com/${repo}/pull/${this.number}`
      : `https://github.com/${repo}/pulls`
  }
}

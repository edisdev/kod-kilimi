/**
 * GitHub webhook imzasını doğrular.
 *
 * GitHub, gövdeyi paylaşılan gizli anahtarla HMAC-SHA256 ile imzalar ve
 * `X-Hub-Signature-256` başlığına koyar. İmza doğrulanmadan hiçbir veri
 * işlenmez; aksi hâlde herkes kilimdeki durumu değiştirebilirdi.
 */
export class WebhookSignature {
  constructor(private readonly secret: string) {}

  async matches(rawBody: string, header: string | null): Promise<boolean> {
    if (!header?.startsWith('sha256=')) return false

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(rawBody),
    )

    const expected = Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')

    return WebhookSignature.constantTimeEquals(header.slice('sha256='.length), expected)
  }

  /** Karşılaştırma süresi içeriğe göre değişmesin diye sabit zamanlı. */
  private static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
  }
}

/**
 * GitHub App kimliği.
 *
 * Pull request'i kullanıcı değil, repoya kurulu bot açar. Böylece
 * kullanıcıdan repo yazma izni istenmez. Özel anahtar yalnızca Edge
 * Function ortam değişkenlerinde durur, istemciye hiç inmez.
 *
 * Anahtarlar sunucunun ortam değişkenlerinden (runtimeConfig) gelir;
 * tarayıcıya hiçbiri inmez.
 *
 * Akış: özel anahtarla imzalanmış kısa ömürlü bir uygulama jetonu (JWT)
 * üretilir, onunla kurulum jetonu alınır, istekler onunla atılır.
 */
export class GitHubApp {
  /** Kurulum jetonu bir saat geçerlidir; sıcak örnekte yeniden kullanılır. */
  private static cache: { token: string; expiresAt: number } | null = null

  private key: CryptoKey | null = null

  constructor(
    private readonly appId: string,
    private readonly privateKeyPem: string,
    private readonly installationId: string,
  ) {}

  /** PEM metnini Web Crypto anahtarına çevirir. */
  private async importKey(): Promise<CryptoKey> {
    if (this.key) return this.key

    const pem = this.privateKeyPem.replace(/\\n/g, '\n').trim()

    if (pem.includes('BEGIN RSA PRIVATE KEY')) {
      throw new Error(
        'Özel anahtar PKCS#1 biçiminde. Şu komutla PKCS#8 biçimine çevir: ' +
          'openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in anahtar.pem -out anahtar.pkcs8.pem',
      )
    }
    if (!pem.includes('BEGIN PRIVATE KEY')) {
      throw new Error('GITHUB_APP_PRIVATE_KEY geçerli bir PKCS#8 PEM değil.')
    }

    const body = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s+/g, '')

    const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))

    this.key = await crypto.subtle.importKey(
      'pkcs8',
      bytes,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    return this.key
  }

  private static base64Url(input: string | Uint8Array): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  /** Uygulamanın kendini tanıttığı, 9 dakikalık JWT. */
  private async appJwt(): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const header = GitHubApp.base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = GitHubApp.base64Url(
      // 60 saniye geriye alınır: GitHub, saat farkına karşı bunu ister.
      JSON.stringify({ iat: now - 60, exp: now + 540, iss: this.appId }),
    )

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      await this.importKey(),
      new TextEncoder().encode(`${header}.${payload}`),
    )

    return `${header}.${payload}.${GitHubApp.base64Url(new Uint8Array(signature))}`
  }

  /** Repoya erişen asıl jeton. */
  async installationToken(): Promise<string> {
    const cached = GitHubApp.cache
    // Bitmesine bir dakika kala yenile.
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token

    const response = await fetch(
      `https://api.github.com/app/installations/${this.installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${await this.appJwt()}`,
          accept: 'application/vnd.github+json',
          'user-agent': 'kod-kilimi',
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Kurulum jetonu alınamadı (${response.status}): ${await response.text()}`)
    }

    const data = (await response.json()) as { token: string; expires_at: string }
    GitHubApp.cache = { token: data.token, expiresAt: Date.parse(data.expires_at) }
    return data.token
  }
}


import { GitHubApp } from './GitHubApp'

interface WriteFileInput {
  path: string
  content: string
  message: string
  branch: string
}

/**
 * Kilim reposu üzerinde pull request açmak için gereken GitHub işlemleri.
 *
 * Yalnızca ağ işi yapar; metin üretimi `TileFile` sınıfındadır.
 */
export class GitHubRepository {
  constructor(
    private readonly app: GitHubApp,
    /** "kullanici/repo" biçiminde. */
    private readonly repo: string,
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.app.installationToken()
    const response = await fetch(`https://api.github.com/repos/${this.repo}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'kod-kilimi',
        ...(init.headers ?? {}),
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub isteği başarısız (${response.status} ${path}): ${await response.text()}`)
    }
    return (await response.json()) as T
  }

  /** 404'ü hata saymayan okuma. */
  private async maybe<T>(path: string): Promise<T | null> {
    const token = await this.app.installationToken()
    const response = await fetch(`https://api.github.com/repos/${this.repo}${path}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'kod-kilimi',
      },
    })
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`GitHub isteği başarısız (${response.status} ${path}): ${await response.text()}`)
    }
    return (await response.json()) as T
  }

  /** UTF-8 metni GitHub Contents API'nin beklediği base64'e çevirir. */
  private static toBase64(text: string): string {
    const bytes = new TextEncoder().encode(text)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
  }

  async defaultBranch(): Promise<string> {
    const repo = await this.request<{ default_branch: string }>('')
    return repo.default_branch
  }

  private async branchSha(branch: string): Promise<string | null> {
    const ref = await this.maybe<{ object: { sha: string } }>(
      `/git/ref/heads/${encodeURIComponent(branch)}`,
    )
    return ref?.object.sha ?? null
  }

  /**
   * Dalı hazırlar. Yoksa taban daldan açar; varsa olduğu gibi bırakır
   * (kullanıcı motifini güncelliyorsa aynı dal yeniden kullanılır).
   */
  async ensureBranch(branch: string, base: string): Promise<void> {
    if (await this.branchSha(branch)) return

    const baseSha = await this.branchSha(base)
    if (!baseSha) throw new Error(`Taban dal bulunamadı: ${base}`)

    await this.request('/git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
    })
  }

  /** Dosya dalda varsa sha'sını verir; güncelleme için gerekir. */
  private async fileSha(path: string, branch: string): Promise<string | null> {
    const file = await this.maybe<{ sha: string }>(
      `/contents/${path}?ref=${encodeURIComponent(branch)}`,
    )
    return file?.sha ?? null
  }

  /** Karo dosyasını dala yazar. Dosya varsa üzerine yazar. */
  async writeFile(input: WriteFileInput): Promise<void> {
    const sha = await this.fileSha(input.path, input.branch)

    await this.request(`/contents/${input.path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: input.message,
        content: GitHubRepository.toBase64(input.content),
        branch: input.branch,
        ...(sha ? { sha } : {}),
      }),
    })
  }

  /** Dal için zaten açık bir pull request varsa numarasını verir. */
  async openPullRequestFor(branch: string): Promise<number | null> {
    const owner = this.repo.split('/')[0]
    const list = await this.request<Array<{ number: number }>>(
      `/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}`,
    )
    return list[0]?.number ?? null
  }

  async createPullRequest(input: {
    title: string
    body: string
    head: string
    base: string
  }): Promise<number> {
    const pull = await this.request<{ number: number }>('/pulls', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return pull.number
  }
}

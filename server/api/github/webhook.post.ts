import { WebhookSignature } from '../../utils/github/WebhookSignature'

/**
 * Pull request kapandığında ya da yeniden açıldığında kilimdeki durumu
 * günceller.
 *
 * GitHub bu ucu kimliksiz çağırır; güvenlik paylaşılan gizli metinle
 * imzalanmış gövdenin doğrulanmasıyla sağlanır.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const raw = await readRawBody(event)

  if (!raw) throw createError({ statusCode: 400, statusMessage: 'Boş gövde.' })

  const signature = new WebhookSignature(config.githubWebhookSecret)
  const header = getHeader(event, 'x-hub-signature-256') ?? null
  if (!(await signature.matches(raw.toString(), header))) {
    throw createError({ statusCode: 401, statusMessage: 'İmza doğrulanamadı.' })
  }

  if (getHeader(event, 'x-github-event') !== 'pull_request') {
    return { ignored: true }
  }

  const payload = JSON.parse(raw.toString()) as {
    action?: string
    repository?: { full_name?: string }
    pull_request?: { number?: number; merged?: boolean }
  }

  // GitHub App birden fazla repoya kurulu olabilir ve pr_number repolar
  // arasında benzersiz değil.
  if (payload.repository?.full_name !== config.public.repo) return { ignored: true }

  const number = payload.pull_request?.number
  if (!number) return { ignored: true }

  const states: Record<string, string> = {
    closed: payload.pull_request?.merged ? 'merged' : 'closed',
    reopened: 'open',
  }
  const state = states[payload.action ?? '']
  if (!state) return { ignored: true }

  const { error } = await supabaseAdmin(event)
    .from('tiles')
    .update({ pr_status: state })
    .eq('pr_number', number)

  if (error) {
    console.error('Durum güncellenemedi:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Durum güncellenemedi.' })
  }

  return { state }
})

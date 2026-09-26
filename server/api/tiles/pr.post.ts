import { GitHubApp } from '../../utils/github/GitHubApp'
import { GitHubRepository } from '../../utils/github/GitHubRepository'
import { TileFile, type TileRecord } from '../../utils/github/TileFile'

/**
 * Kullanıcı adına pull request açar.
 *
 * Repoya kurulu GitHub App (bot) dalı açar, karo dosyasını yazar ve commit'e
 * `Co-authored-by` satırını ekler; böylece katkı, pull request birleşince
 * kullanıcının GitHub katkı grafiğinde görünür. Kullanıcıdan repo izni
 * istenmez.
 *
 * Eskiden Supabase Edge Function'daydı; kendi sunucumuz olunca buraya taşındı.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const supabase = supabaseFor(event)

  const { data: auth } = await supabase.auth.getUser()
  const weaver = toPublicWeaver(auth.user ?? null)
  if (!weaver) throw createError({ statusCode: 401, statusMessage: 'Giriş gerekli.' })

  // Karo, oturumdaki kullanıcı adından bulunur; istemci kimlik göndermez.
  const { data: row, error } = await supabase
    .from('tiles')
    .select(TILE_FIELDS)
    .eq('username', weaver.username)
    .maybeSingle()

  if (error) throw createError({ statusCode: 502, statusMessage: 'Karo okunamadı.' })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Önce motifini kaydet.' })

  const tile = row as TileRow
  const file = new TileFile({
    id: tile.id,
    username: tile.username,
    github_id: tile.github_id ?? 0,
    city: tile.city,
    message: tile.message,
    pixels: tile.pixels,
    pr_number: tile.pr_number,
    pr_status: tile.pr_status,
  } satisfies TileRecord)

  const problems = file.validate()
  if (problems.length) {
    throw createError({
      statusCode: 422,
      statusMessage: `Motif kurallara uymuyor: ${problems.join(', ')}`,
    })
  }

  const admin = supabaseAdmin(event)

  try {
    const app = new GitHubApp(
      config.githubAppId,
      config.githubAppPrivateKey,
      config.githubAppInstallationId,
    )
    const repository = new GitHubRepository(app, config.public.repo)
    const base = await repository.defaultBranch()

    await repository.ensureBranch(file.branch, base)
    await repository.writeFile({
      path: file.path,
      content: file.content,
      message: file.commitMessage,
      branch: file.branch,
    })

    // Motif güncellemesinde açık pull request varsa yenisi açılmaz;
    // yeni commit mevcut olana eklenir.
    const existing = await repository.openPullRequestFor(file.branch)
    const number =
      existing ??
      (await repository.createPullRequest({
        title: file.title,
        body: file.body,
        head: file.branch,
        base,
      }))

    await admin
      .from('tiles')
      .update({ pr_number: number, pr_status: 'open' })
      .eq('id', tile.id)

    return { pr: number, state: 'open' }
  } catch (thrown) {
    console.error('Pull request açılamadı:', thrown)
    await admin.from('tiles').update({ pr_status: 'failed' }).eq('id', tile.id)

    throw createError({
      statusCode: 502,
      statusMessage: 'Pull request açılamadı. Motifin kilimde duruyor.',
    })
  }
})

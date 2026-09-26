import { TileValidator } from '#domain/TileValidator'
import type { ValidationError } from '#domain/Result'

/**
 * Motifi kilime ekler ya da günceller.
 *
 * Doğrulama hem burada (paylaşılan `TileValidator`) hem de veritabanında
 * (kısıtlar) yapılır. Yazma, oturum çerezindeki kullanıcı adına bağlıdır:
 * satır güvenliği ve veritabanı tetikleyicisi kullanıcı adını jetondan alır,
 * istemcinin gönderdiğine güvenilmez.
 */
export default defineEventHandler(async (event) => {
  const supabase = supabaseFor(event)

  const { data: auth } = await supabase.auth.getUser()
  const weaver = toPublicWeaver(auth.user ?? null)
  if (!auth.user || !weaver) {
    throw createError({ statusCode: 401, statusMessage: 'Giriş gerekli.' })
  }

  const body = await readBody<{ motif?: unknown; city?: unknown; note?: unknown }>(event)

  const validated = new TileValidator(cityCatalog).validate({
    username: weaver.username,
    city: body?.city,
    message: body?.note,
    pixels: body?.motif,
  })

  if (validated.failed) {
    throw createError({
      statusCode: 422,
      statusMessage: (validated.error as ValidationError).messages.join(' '),
    })
  }

  const tile = validated.unwrap()
  const { data, error } = await supabase
    .from('tiles')
    .upsert(
      {
        user_id: auth.user.id,
        github_id: Number(auth.user.user_metadata?.provider_id) || null,
        username: tile.username.toLowerCase(),
        avatar_url: weaver.avatar,
        city: tile.city,
        message: tile.message,
        pixels: tile.motif.code,
      },
      { onConflict: 'username' },
    )
    .select(TILE_FIELDS)
    .single()

  if (error) {
    console.error('Motif kaydedilemedi:', error.message)
    throw createError({
      statusCode: 400,
      statusMessage: 'Motif kilime eklenemedi.',
    })
  }

  return { tile: toPublicTile(data as TileRow) }
})

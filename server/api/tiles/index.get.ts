/**
 * Kilimi okur.
 *
 * Tarayıcı Supabase'i görmez; yalnızca bu ucu çağırır. Şema da dışarı
 * çıkmaz: sütunlar `toPublicTile` ile yeniden adlandırılır.
 */
export default defineEventHandler(async (event) => {
  if (!supabaseConfigured(event)) return { tiles: [], configured: false }

  const supabase = supabaseFor(event)
  const { data, error } = await supabase
    .from('tiles')
    .select(TILE_FIELDS)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Kilim okunamadı:', error.message)
    throw createError({ statusCode: 502, statusMessage: 'Kilim okunamadı.' })
  }

  return {
    tiles: ((data ?? []) as TileRow[]).map(toPublicTile),
    configured: true,
  }
})

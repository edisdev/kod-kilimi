/** Şu anki dokuyucu. Giriş yoksa null. */
export default defineEventHandler(async (event) => {
  if (!supabaseConfigured(event)) return { weaver: null, configured: false }

  const supabase = supabaseFor(event)
  const { data } = await supabase.auth.getUser()

  return { weaver: toPublicWeaver(data.user ?? null), configured: true }
})

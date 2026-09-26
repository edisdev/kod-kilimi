/** Oturumu kapatır; çerezler temizlenir. */
export default defineEventHandler(async (event) => {
  const supabase = supabaseFor(event)
  await supabase.auth.signOut()
  return { ok: true }
})

/**
 * GitHub dönüşü. Kodu oturuma çevirir ve çerezi kurar.
 *
 * Hata olursa ana sayfaya `?error=...` ile döneriz; arayüz bunu okuyup
 * Türkçe bir mesaj gösterir (bkz. SignInFailure).
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  if (query.error) {
    return sendRedirect(
      event,
      failureUrl(String(query.error_description ?? 'Giriş onaylanmadı.'), String(query.error)),
    )
  }

  const code = typeof query.code === 'string' ? query.code : ''
  if (!code) return sendRedirect(event, failureUrl('Giriş kodu alınamadı.'))

  const supabase = supabaseFor(event)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Oturum kurulamadı:', error.message)
    return sendRedirect(event, failureUrl('Giriş tamamlanamadı.'))
  }

  return sendRedirect(event, '/')
})

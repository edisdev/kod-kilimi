/**
 * GitHub girişini başlatır.
 *
 * Tarayıcı bu uca gelir, biz Supabase'in yetkilendirme adresini üretip
 * yönlendiririz. PKCE doğrulayıcısı HttpOnly çerezde saklanır; istemci
 * kodunda Supabase anahtarı bulunmaz.
 */
export default defineEventHandler(async (event) => {
  const supabase = supabaseFor(event)
  const origin = getRequestURL(event).origin

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/api/auth/callback`,
      // Yalnızca herkese açık profil. Repo izni istemiyoruz.
      scopes: 'read:user',
      skipBrowserRedirect: true,
    },
  })

  if (error || !data?.url) {
    return sendRedirect(event, failureUrl('GitHub girişi başlatılamadı.'))
  }

  return sendRedirect(event, data.url)
})

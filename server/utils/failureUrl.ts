/** Giriş hatasını ana sayfaya taşıyan adres. Arayüz `SignInFailure` ile okur. */
export function failureUrl(description: string, code = 'server_error'): string {
  const params = new URLSearchParams({
    error: code,
    error_description: description,
  })
  return `/?${params.toString()}`
}

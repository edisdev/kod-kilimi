// Kod Kilimi — renk kontrastı denetimi
//
// Kullanım: node scripts/check-contrast.mjs
//
// Tasarımdaki her metin/zemin ikilisinin WCAG AA eşiğini geçtiğini doğrular.
// Renk değiştirirken buradaki listeyi de güncelle.

const linear = (channel) => {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

// [açıklama, metin rengi, zemin, boyut]
//
// "buyuk" YALNIZCA 18.66px kalın (14pt kalın) ya da 24px+ metin içindir.
// Daha küçük her şey — 17px kalın bir buton yazısı dahil — normal metindir
// ve 4.5:1 ister. Yanlış etiketlemek denetimi işe yaramaz hâle getirir.
const PAIRS = [
  ['gövde metni', '#2A2350', '#FFFAF6', 'normal'],
  ['ikincil metin (yüzey)', '#6B6380', '#FFFAF6', 'normal'],
  ['ikincil metin (zemin)', '#6B6380', '#F8EDE7', 'normal'],
  ['vurgu etiketi', '#B8322B', '#F8EDE7', 'normal'],
  ['hata metni', '#B8322B', '#FFFAF6', 'normal'],
  ['ana buton yazısı (17px kalın)', '#FFFFFF', '#B8322B', 'normal'],
  ['giriş butonu', '#FFFAF6', '#2A2350', 'normal'],
  ['pasif buton yazısı (17px kalın)', '#635552', '#EAD8CF', 'normal'],
  ['başarı metni', '#2A4A47', '#E4F0EC', 'normal'],
  ['rozet: İncelemede', '#7A5410', '#FBEFD6', 'normal'],
  ['rozet: Birleşti', '#2A4A47', '#E4F0EC', 'normal'],
  ['rozet: Kapatıldı', '#5C5470', '#EAD8CF', 'normal'],
  ['rozet: Açılamadı', '#8C2B25', '#F7E0DE', 'normal'],
  ['PR uyarısı', '#8C2B25', '#E4F0EC', 'normal'],
  ['bağlantı uyarısı', '#8C2B25', '#F7E0DE', 'normal'],
  ['şehir statı', '#6B6380', '#F8EDE7', 'normal'],
  ['kilim ipucu', '#6B6380', '#F8EDE7', 'normal'],
  ['motif balonu', '#FFFAF6', '#2A2350', 'normal'],
]

let failed = 0

for (const [name, foreground, background, size] of PAIRS) {
  const ratio = contrast(foreground, background)
  const required = size === 'buyuk' ? 3 : 4.5
  const ok = ratio >= required
  if (!ok) failed++
  console.log(
    `${ok ? '✓' : '✗'} ${ratio.toFixed(2).padStart(5)} / ${required}  ${name}`,
  )
}

if (failed) {
  console.error(`\n✗ ${failed} ikili WCAG AA eşiğinin altında.`)
  process.exit(1)
}
console.log('\n✓ Tüm renk ikilileri WCAG AA geçiyor.')

import { Motif } from '#domain/Motif'

/** "Nasıl çalışıyor" kartları. Motifler kilimden seçilmiş örneklerdir. */
export interface HowItWorksStep {
  readonly key: string
  readonly motif: Motif
  readonly title: string
  readonly text: string
}

export const howItWorks: readonly HowItWorksStep[] = [
  {
    key: 'ciz',
    motif: Motif.from('3000000313000031013113100013310000133100013113101300003130000003'),
    title: 'Motifini çiz',
    text: 'Sekiz kök boyayla 8×8 ilmeklik bir motif. Ayna açıkken iki yan birlikte dokunur, tıpkı kilimdeki gibi.',
  },
  {
    key: 'gir',
    motif: Motif.from('0000000000022000002112000213312002133120002112000002200000000000'),
    title: 'GitHub ile gir',
    text: 'Tek tıkla giriş. Kullanıcı adını yazmana, dosya ya da fork uğraşına gerek yok.',
  },
  {
    key: 'yerini-al',
    motif: Motif.from('1100001110100101100110010101101000011000000110000011110000000000'),
    title: 'Kilimde yerini al',
    text: 'Motifin anında kilime dokunur. Senin adına açılan pull request de katkı grafiğine yazılır.',
  },
]

/** Başlıktaki nazar motifi logosu. */
export const logoMotif = Motif.from(
  '0000000000022000002112000213312002133120002112000002200000000000',
)

import { DomainError, Result } from './Result'

/**
 * 81 ilin listesi. Tek doğruluk kaynağı `data/cities.json`; bu sınıf onu
 * arama ve doğrulama için sarmalar.
 *
 * Şehir adları Türkçe karakterlerle yazılır ("İstanbul", "Muğla"). Bu yüzden
 * karşılaştırma yaparken `localeCompare` ve Türkçe `toLocaleLowerCase` kullanılır;
 * aksi hâlde "İ" harfi İngilizce kurallarla yanlış eşleşir.
 */
export class CityCatalog {
  private readonly index: Map<string, string>

  constructor(public readonly cities: readonly string[]) {
    this.index = new Map(cities.map((c) => [CityCatalog.normalize(c), c]))
  }

  /**
   * Arama ve eşleştirme için ortak indirgeme.
   *
   * Yalnızca Türkçe küçük harfe çevirmek yetmez: tr-TR kuralında "I" harfi
   * "ı" olur, yani "Isparta" → "ısparta" ve "Iğdır" → "ığdır". Kullanıcı
   * klavyesinde "isparta" yazdığında bu anahtarlar tutmaz ve şehir
   * "81 ilden biri değil" diye reddedilirdi. Bu yüzden harfler ASCII
   * karşılığına indirgenir.
   */
  static normalize(value: string): string {
    return CityCatalog.fold(value)
  }

  get size(): number {
    return this.cities.length
  }

  has(city: unknown): boolean {
    return typeof city === 'string' && this.index.has(CityCatalog.normalize(city))
  }

  /** Kullanıcı girdisini kanonik yazıma çevirir ("istanbul" → "İstanbul"). */
  canonical(city: string): string | undefined {
    return this.index.get(CityCatalog.normalize(city))
  }

  validate(city: unknown): Result<string> {
    if (typeof city !== 'string' || !city.trim()) {
      return Result.fail(DomainError.of('sehir-bos', 'Şehrini seç.', 'city'))
    }
    const canonical = this.canonical(city)
    if (!canonical) {
      return Result.fail(
        DomainError.of('sehir-yok', `Şehir 81 ilden biri olmalı, gelen: "${city}"`, 'city'),
      )
    }
    return Result.ok(canonical)
  }

  /**
   * Aramada kullanılan indirgenmiş biçim.
   *
   * Türkçe harfleri ASCII karşılığına düşürür; böylece klavyesinde Türkçe
   * karakter olmayan biri de şehri bulabilir: "mugla" → Muğla,
   * "sanliurfa" → Şanlıurfa, "istanbul" → İstanbul.
   */
  static fold(value: string): string {
    return value
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/â/g, 'a')
      .trim()
  }

  /**
   * Yazılana uyan şehirler. Baştan eşleşenler önce gelir:
   * "kar" yazınca Karabük ve Karaman, Kahramanmaraş'tan önce listelenir.
   */
  search(query: string): string[] {
    const needle = CityCatalog.fold(query)
    if (!needle) return this.sorted()

    const leading: string[] = []
    const inner: string[] = []

    for (const city of this.sorted()) {
      const folded = CityCatalog.fold(city)
      if (folded.startsWith(needle)) leading.push(city)
      else if (folded.includes(needle)) inner.push(city)
    }

    return [...leading, ...inner]
  }

  /** Alfabetik, Türkçe sıralı liste. Açılır menü için. */
  sorted(): string[] {
    return [...this.cities].sort((a, b) => a.localeCompare(b, 'tr-TR'))
  }
}

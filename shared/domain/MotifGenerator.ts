import { Motif } from './Motif'

/**
 * Kilim havası taşıyan rastgele motif üretir.
 *
 * Boş tuval korkutucudur; "Şaşırt beni" bir başlangıç noktası verir.
 * Tamamen rastgele bir ızgara gürültü gibi görünürdü, bu yüzden gerçek
 * kilim motiflerinin iki kuralı uygulanır: yatay simetri ve sınırlı sayıda
 * boya.
 *
 * Rastgelelik dışarıdan verilir; aynı üreteçle aynı sonuç alınır, yani
 * sınıf test edilebilir kalır.
 */
export class MotifGenerator {
  constructor(private readonly random: () => number = Math.random) {}

  private pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.random() * items.length)]!
  }

  /** Kilimlerde motifler genelde 2-3 renkten oluşur. */
  private palette(): number[] {
    const dyes = [1, 2, 3, 4, 5, 6, 7]
    const chosen: number[] = []
    const count = 2 + Math.floor(this.random() * 2)
    while (chosen.length < count) {
      const dye = this.pick(dyes)
      if (!chosen.includes(dye)) chosen.push(dye)
    }
    return chosen
  }

  generate(): Motif {
    const dyes = this.palette()
    const cells = new Array<string>(Motif.CELL_COUNT).fill('0')

    // Yalnızca sol yarı boyanır, sağ yarı aynalanır.
    const half = Motif.SIZE / 2
    for (let row = 0; row < Motif.SIZE; row++) {
      for (let column = 0; column < half; column++) {
        // Kenarlar seyrek, merkeze doğru yoğun: motif ortada toplanır.
        const distance = Math.abs(row - 3.5) + Math.abs(column - 3.5)
        const chance = 0.72 - distance * 0.09
        if (this.random() > chance) continue

        const dye = String(this.pick(dyes))
        cells[row * Motif.SIZE + column] = dye
        cells[row * Motif.SIZE + (Motif.SIZE - 1 - column)] = dye
      }
    }

    const motif = Motif.tryFrom(cells.join('')).unwrapOr(Motif.blank())
    // Çok seyrek çıktıysa tekrar dene; kilime eklenebilir olmalı.
    return motif.hasEnoughKnots ? motif : this.generate()
  }
}

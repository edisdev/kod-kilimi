/**
 * Ekran genişliğine göre kilimin ölçüsü.
 *
 * Onaylı tasarım iki durum tanımlar: masaüstü (8 sütun × 64 px) ve telefon
 * (6 sütun × 40 px). Aradaki tablet genişliğinde ikisi de yanlış durur —
 * telefon ölçüsü geniş alanda kaybolur, masaüstü ölçüsü taşar. Bu yüzden
 * arada bir kademe var.
 *
 * Saf bir karardır: genişlik girer, ölçü çıkar.
 */
export class RugScale {
  private constructor(
    public readonly columns: number,
    public readonly tileSize: number,
    /** Kilim boş görünmesin diye çizilecek en az yuva sayısı. */
    public readonly minimumSlots: number,
    /** Tek sütuna düşen yerleşim. CSS'teki 899 px kırılımıyla aynı. */
    public readonly compact: boolean,
  ) {}

  /** Ön-render sırasında pencere yoktur; masaüstü varsayılır. */
  static readonly desktop = new RugScale(8, 64, 40, false)

  static forWidth(width: number): RugScale {
    if (width >= 900) return RugScale.desktop
    // Tablet: tek sütun ama karolar telefon ölçüsünde kalmasın.
    if (width >= 620) return new RugScale(8, 52, 32, true)
    // Büyük telefon
    if (width >= 430) return new RugScale(6, 48, 30, true)
    return new RugScale(6, 40, 36, true)
  }

  /** Saçak ve çerçeve dahil kilimin toplam genişliği. */
  get weaveWidth(): number {
    return this.columns * this.tileSize + (this.columns - 1) * 6 + 20
  }
}

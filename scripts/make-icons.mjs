// Kod Kilimi — simge ve paylaşım görselini motiften üretir.
//
// Kullanım: node scripts/make-icons.mjs
//
// Üretilenler:
//   public/favicon.svg         8×8 nazar motifi, sekmede net görünür
//   public/apple-touch-icon.png  180×180
//   public/og.png              1200×630 paylaşım kartı
//
// Dış bağımlılık yok: PNG, Node'un kendi zlib'iyle elle kodlanır.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// URL.pathname boşluğu ve Türkçe karakteri yüzde kodlar; fileURLToPath
// gerçek dosya yolunu verir.
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = join(ROOT, 'public')
mkdirSync(OUT, { recursive: true })

// ── Kök boyalar (design/Main.dc.html ile aynı) ──────────────────
const DYES = ['#F3E6D3', '#B8322B', '#2A2350', '#E3A935', '#5B7F3F', '#5A3524', '#D9774A', '#8DB7C4']
const CANVAS = '#F8EDE7'
const INK = '#2A2350'
const GOLD = '#E3A935'
const ACCENT = '#B8322B'
const WEAVE = '#D9C7AC'
const WOOL = '#F3E6D3'

/** Başlıktaki nazar motifi. */
const LOGO = '0000000000022000002112000213312002133120002112000002200000000000'

/** Paylaşım kartındaki dekoratif motifler. */
const SAMPLES = [
  '3000000313000031013113100013310000133100013113101300003130000003',
  '1100001110100101100110010101101000011000000110000011110000000000',
  '0104401010100101006666000001100000011000006666001010010101044010',
  '0220022050200205202002026265562662655626202002025020020502200220',
  '0001100000144100014224101427724114277241014224100014410000011000',
  '0000000064633646434664340063360000633600434664346463364600000000',
  '0066660022266222464004640240042002400420464004642226622200666600',
  '3636636303600630503003050600006006000060503003050360063036366363',
  '2106601260022006161111616011110660111106161111616002200621066012',
  '4000000444700744600660064060060440600604600660064470074440000004',
  '0363363001366310330000330060060000600600330000330136631003633630',
  '0540045005055050054004505550055555500555054004500505505005400450',
]

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

// ── Minik PNG kodlayıcı ─────────────────────────────────────────
const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit derinliği
  ihdr[9] = 2 // renk tipi: RGB
  // 10-12: sıkıştırma, süzgeç, taramasız — hepsi 0

  // Her satırın başına süzgeç baytı (0 = süzgeç yok).
  const raw = Buffer.alloc(height * (width * 3 + 1))
  for (let y = 0; y < height; y++) {
    const from = y * width * 3
    rgb.copy(raw, y * (width * 3 + 1) + 1, from, from + width * 3)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Basit tuval ─────────────────────────────────────────────────
class Canvas {
  constructor(width, height, background) {
    this.width = width
    this.height = height
    this.data = Buffer.alloc(width * height * 3)
    this.fill(0, 0, width, height, background)
  }

  fill(x, y, w, h, color) {
    const [r, g, b] = hex(color)
    const x0 = Math.max(0, Math.round(x))
    const y0 = Math.max(0, Math.round(y))
    const x1 = Math.min(this.width, Math.round(x + w))
    const y1 = Math.min(this.height, Math.round(y + h))
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * this.width + px) * 3
        this.data[i] = r
        this.data[i + 1] = g
        this.data[i + 2] = b
      }
    }
  }

  /** Kilim kenarındaki kırmızı-sarı eğik şerit. */
  stripes(x, y, w, h, a, b, period, split) {
    const [ar, ag, ab] = hex(a)
    const [br, bg, bb] = hex(b)
    for (let py = Math.round(y); py < Math.round(y + h); py++) {
      for (let px = Math.round(x); px < Math.round(x + w); px++) {
        if (px < 0 || py < 0 || px >= this.width || py >= this.height) continue
        const t = ((px + py) % period + period) % period
        const i = (py * this.width + px) * 3
        const use = t < split
        this.data[i] = use ? ar : br
        this.data[i + 1] = use ? ag : bg
        this.data[i + 2] = use ? ab : bb
      }
    }
  }

  /** 8×8 motifi verilen kareye çizer. */
  motif(code, x, y, size) {
    const cell = size / 8
    for (let i = 0; i < 64; i++) {
      this.fill(x + (i % 8) * cell, y + Math.floor(i / 8) * cell, cell, cell, DYES[+code[i]])
    }
  }

  toPng() {
    return encodePng(this.width, this.height, this.data)
  }
}

// ── 1. favicon.svg ──────────────────────────────────────────────
const rects = [...LOGO]
  .map((code, i) =>
    code === '0'
      ? ''
      : `<rect x="${i % 8}" y="${Math.floor(i / 8)}" width="1" height="1" fill="${DYES[+code]}"/>`,
  )
  .join('')

writeFileSync(
  join(OUT, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">` +
    `<rect width="8" height="8" fill="${WOOL}"/>${rects}</svg>\n`,
)

// ── 2. apple-touch-icon.png ─────────────────────────────────────
{
  const size = 180
  const pad = 18
  const icon = new Canvas(size, size, INK)
  icon.fill(pad, pad, size - pad * 2, size - pad * 2, WOOL)
  icon.motif(LOGO, pad, pad, size - pad * 2)
  writeFileSync(join(OUT, 'apple-touch-icon.png'), icon.toPng())
}

// ── 3. og.png — paylaşım kartı ──────────────────────────────────
{
  const W = 1200
  const H = 630
  const card = new Canvas(W, H, CANVAS)

  const tile = 132
  const gap = 12
  const cols = 6
  const rows = 2

  const weaveW = cols * tile + (cols - 1) * gap + 20
  const weaveH = rows * tile + (rows - 1) * gap + 20

  // Katmanlar: çivit çerçeve → eğik şerit → ham yün → dokuma zemini
  const fx = (W - weaveW) / 2 - 19
  const fy = (H - weaveH) / 2 - 19

  card.fill(fx, fy, weaveW + 38, weaveH + 38, INK)
  card.stripes(fx + 6, fy + 6, weaveW + 26, weaveH + 26, ACCENT, GOLD, 20, 12)
  card.fill(fx + 14, fy + 14, weaveW + 10, weaveH + 10, WOOL)
  card.fill(fx + 19, fy + 19, weaveW, weaveH, WEAVE)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      card.motif(
        SAMPLES[(row * cols + col) % SAMPLES.length],
        fx + 29 + col * (tile + gap),
        fy + 29 + row * (tile + gap),
        tile,
      )
    }
  }

  // Üstte ve altta saçak
  for (let x = fx; x < fx + weaveW + 38; x += 7) {
    card.fill(x, fy - 26, 3, 16, '#E2CDB4')
    card.fill(x, fy + weaveH + 48, 3, 16, '#E2CDB4')
  }

  writeFileSync(join(OUT, 'og.png'), card.toPng())
}

console.log('✓ public/favicon.svg')
console.log('✓ public/apple-touch-icon.png')
console.log('✓ public/og.png')

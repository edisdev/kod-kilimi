// Kod Kilimi — repodaki tiles/*.json dosyalarını Supabase'e aktarır.
//
// Tek seferlik geçiş betiği. Aktarılan karolar "sahipsiz" olur: user_id ve
// github_id boş kalır. Sahibi GitHub ile giriş yapıp motifini kaydettiğinde
// karosunu devralır (bkz. supabase/schema.sql).
//
// Kullanım:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-tiles.mjs
//   ... --kuru            (yazmadan ne yapacağını göster)
//   ... --ornekleri-atla  (ornek-* karolarını aktarma)

import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { loadTiles, validateTile } from './validate.mjs'

// URL.pathname boşluğu ve Türkçe karakteri yüzde kodlar; fileURLToPath
// gerçek dosya yolunu verir.
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--kuru')
const skipSamples = args.has('--ornekleri-atla')

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!dryRun && (!url || !serviceRoleKey)) {
  console.error('✗ SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.')
  console.error('  Anahtarı Supabase panelinde Project Settings → API altında bulursun.')
  process.exit(1)
}

/** Karonun repoya ilk eklendiği an — kilimdeki sırayı bu belirler. */
function addedAt(file) {
  try {
    const out = execSync(`git log --diff-filter=A --follow --format=%aI -- "tiles/${file}"`, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
      .split('\n')
      .pop()
    return out || null
  } catch {
    // Git geçmişi yoksa (yeni repo) sıra dosya adına göre belirlenir.
    return null
  }
}

const rows = []
let skipped = 0

for (const { file, tile, parseError } of loadTiles()) {
  if (parseError) {
    console.warn(`atlandı: ${file} (okunamadı: ${parseError})`)
    skipped++
    continue
  }

  const errors = validateTile(file, tile)
  if (errors.length) {
    console.warn(`atlandı: ${file} (${errors.join(', ')})`)
    skipped++
    continue
  }

  if (skipSamples && tile.username.startsWith('ornek-')) {
    skipped++
    continue
  }

  rows.push({
    username: tile.username.toLowerCase(),
    city: tile.city,
    message: tile.message ?? null,
    pixels: tile.pixels.join(''),
    created_at: addedAt(file),
    file,
  })
}

// Kilimdeki sıra: önce eklenen önce dokunur.
rows.sort(
  (a, b) =>
    (a.created_at || '9999').localeCompare(b.created_at || '9999') ||
    a.username.localeCompare(b.username),
)

// Git geçmişi yoksa sıralamayı korumak için yapay ama artan zaman damgası üret.
const base = Date.now() - rows.length * 1000
rows.forEach((row, index) => {
  if (!row.created_at) row.created_at = new Date(base + index * 1000).toISOString()
})

console.log(`${rows.length} karo aktarılacak, ${skipped} atlandı.`)

if (dryRun) {
  for (const row of rows) console.log(`  ${row.created_at}  ${row.username.padEnd(18)} ${row.city}`)
  console.log('\nKuru çalışma: hiçbir şey yazılmadı.')
  process.exit(0)
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

let written = 0
for (const { file, ...row } of rows) {
  // Zaten sahiplenilmiş bir karonun üzerine yazma: kullanıcı kendi
  // motifini tezgâhta güncellemiş olabilir.
  const { data: existing, error: readError } = await supabase
    .from('tiles')
    .select('username, user_id')
    .eq('username', row.username)
    .maybeSingle()

  if (readError) {
    console.error(`✗ ${file}: okunamadı — ${readError.message}`)
    continue
  }

  if (existing?.user_id) {
    console.log(`= ${row.username} (sahibi devralmış, dokunulmadı)`)
    continue
  }

  const { error } = await supabase
    .from('tiles')
    .upsert(row, { onConflict: 'username' })

  if (error) {
    console.error(`✗ ${file}: ${error.message}`)
    continue
  }

  written++
  console.log(`✓ ${row.username}`)
}

console.log(`\n${written} karo yazıldı.`)

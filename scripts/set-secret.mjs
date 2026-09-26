// Gizli bir değeri .env dosyasına yazar.
//
// Kullanım:
//   node scripts/set-secret.mjs SUPABASE_SERVICE_ROLE_KEY
//
// Değer ekranda görünmez, shell geçmişine düşmez ve komut satırında
// (ps çıktısında) yer almaz — standart girdiden okunur.
import { readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const name = process.argv[2]
if (!name || !/^[A-Z0-9_]+$/.test(name)) {
  console.error('Kullanım: node scripts/set-secret.mjs DEGISKEN_ADI')
  process.exit(1)
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })

// Yazılanı ekrana basma.
rl.output.write(`${name} değerini yapıştır ve Enter'a bas:\n`)
const hidden = rl.output
rl._writeToOutput = () => {}

rl.question('', (value) => {
  rl._writeToOutput = (s) => hidden.write(s)
  rl.close()

  const secret = value.trim()
  if (!secret) {
    console.error('\n✗ Boş değer, dosya değişmedi.')
    process.exit(1)
  }

  let env = readFileSync('.env', 'utf8')
  const line = `${name}="${secret}"`
  env = new RegExp(`^${name}=.*$`, 'm').test(env)
    ? env.replace(new RegExp(`^${name}=.*$`, 'm'), line)
    : `${env.trimEnd()}\n${line}\n`

  writeFileSync('.env', env)
  console.log(`\n✓ ${name} yazıldı (${secret.length} karakter).`)
})

// Kod Kilimi — karo doğrulayıcı
//
// Kullanım:  node scripts/validate.mjs
//
// Pull request içinde:
//   PR_AUTHOR=<login> CHANGED_FILES="tiles/a.json ..." node scripts/validate.mjs
//
// Pull request'i kilim botu açtığında dosyanın sahibi PR yazarı değil,
// commit'teki ortak yazardır (Co-authored-by). ANCAK bu satırı commit'i
// yazan herkes uydurabilir; bu yüzden yalnızca PR'ı gerçekten bot açtıysa
// (PR_AUTHOR_IS_BOT=true) dikkate alınır. Aksi hâlde biri, commit'ine
// "Co-authored-by: kurban" yazıp kurbanın karosunu değiştirebilirdi.
//
// Buradaki kurallar şunlarla birebir aynı olmalıdır:
//   shared/domain/TileValidator.ts
//   supabase/functions/_shared/TileFile.ts
//   supabase/schema.sql
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Yol boşluk ya da Türkçe karakter içerebilir; URL.pathname bunları
// yüzde kodlar ve dosya bulunamaz. fileURLToPath doğru çözer.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TILES = join(ROOT, "tiles");
const CITIES = JSON.parse(readFileSync(join(ROOT, "data/cities.json"), "utf8"));

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,38})$/i;
const ROW_RE = /^[0-7]{8}$/;
const MIN_FILLED = 6; // en az 6 boyalı ilmek

export function validateTile(file, tile) {
  const errors = [];
  const name = basename(file, ".json");
  const allowed = ["username", "city", "message", "pixels"];

  for (const key of Object.keys(tile)) {
    if (!allowed.includes(key)) errors.push(`bilinmeyen alan: "${key}"`);
  }
  if (typeof tile.username !== "string" || !USERNAME_RE.test(tile.username)) {
    errors.push("username geçerli bir GitHub kullanıcı adı olmalı");
  } else if (tile.username.toLowerCase() !== name.toLowerCase()) {
    errors.push(`dosya adı kullanıcı adıyla aynı olmalı: tiles/${tile.username.toLowerCase()}.json`);
  }
  if (!CITIES.includes(tile.city)) {
    errors.push(`city 81 ilden biri olmalı (ör. "İstanbul", "Samsun"), gelen: "${tile.city}"`);
  }
  if (tile.message !== undefined) {
    if (typeof tile.message !== "string") errors.push("message metin olmalı");
    else if ([...tile.message].length > 60) errors.push("message en fazla 60 karakter olabilir");
  }
  if (!Array.isArray(tile.pixels) || tile.pixels.length !== 8) {
    errors.push("pixels 8 satırlık bir dizi olmalı");
  } else {
    tile.pixels.forEach((row, i) => {
      if (typeof row !== "string" || !ROW_RE.test(row)) {
        errors.push(`pixels[${i}] 0-7 arası 8 rakamdan oluşmalı, gelen: "${row}"`);
      }
    });
    const filled = tile.pixels.join("").replace(/0/g, "").length;
    if (filled < MIN_FILLED) errors.push(`motifte en az ${MIN_FILLED} boyalı ilmek olmalı (şu an ${filled})`);
  }
  return errors;
}

export function loadTiles() {
  return readdirSync(TILES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const path = join(TILES, f);
      try {
        return { file: f, tile: JSON.parse(readFileSync(path, "utf8")) };
      } catch (e) {
        return { file: f, tile: null, parseError: e.message };
      }
    });
}

/** Karo dosyasının sahibi kim sayılmalı? */
export function resolveOwner({ author, coauthor, authorIsBot }) {
  // Ortak yazar satırına yalnızca PR'ı bot açtıysa güvenilir.
  if (authorIsBot && coauthor) return coauthor;
  return author;
}

function main() {
  let failed = false;
  const fail = (msg) => { failed = true; console.error("✗ " + msg); };

  const authorIsBot = process.env.PR_AUTHOR_IS_BOT === "true";
  const owner = resolveOwner({
    author: process.env.PR_AUTHOR,
    coauthor: process.env.PR_COAUTHOR,
    authorIsBot,
  });

  const changed = (process.env.CHANGED_FILES || "").split(/\s+/).filter(Boolean);
  const changedTiles = changed.filter((f) => f.toLowerCase().startsWith("tiles/"));
  const changedOthers = changed.filter((f) => !f.toLowerCase().startsWith("tiles/"));

  // PR kuralı: herkes yalnızca kendi karosunu ekler/değiştirir.
  // Karo dışındaki dosyalar (README, site kodu) bu kurala girmez;
  // onları insan gözü inceler.
  if (owner && changedTiles.length) {
    const own = `tiles/${owner.toLowerCase()}.json`;
    for (const f of changedTiles) {
      if (f.toLowerCase() !== own) {
        fail(`Bu pull request yalnızca ${own} dosyasını değiştirebilir, ama ${f} de değişmiş.`);
      }
    }
  }

  // Bot yalnızca karo dosyasına dokunur; başka bir şey değiştiyse bir terslik var.
  if (authorIsBot && changedOthers.length) {
    fail(`Bot pull request'i yalnızca tiles/ altına yazmalı, ama şunlar da değişmiş: ${changedOthers.join(", ")}`);
  }

  for (const { file, tile, parseError } of loadTiles()) {
    if (parseError) { fail(`${file}: JSON okunamadı (${parseError})`); continue; }
    for (const err of validateTile(file, tile)) fail(`${file}: ${err}`);
  }

  if (failed) process.exit(1);
  console.log("✓ Tüm karolar geçerli.");
}

// Doğrudan çalıştırıldı mı? İki tarafı da gerçek dosya yoluna çevirerek
// karşılaştır; yoksa boşluklu bir dizinde main() hiç çalışmaz ve denetim
// sessizce "geçti" der.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();

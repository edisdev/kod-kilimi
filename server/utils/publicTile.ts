/** Veritabanı satırı. Sunucu dışına çıkmaz. */
export interface TileRow {
  id: string
  user_id: string | null
  github_id: number | null
  username: string
  avatar_url: string | null
  city: string
  message: string | null
  pixels: string
  pr_number: number | null
  pr_status: string
  created_at: string
  updated_at: string
}

/**
 * Tarayıcıya verilen biçim.
 *
 * Sütun adlarıyla kasıtlı olarak aynı değil: şema dışarı sızmasın. Sahip
 * kimliği (`user_id`) de verilmez — aidiyet kullanıcı adından bulunur.
 */
export interface PublicTile {
  id: string
  user: string
  avatar: string | null
  city: string
  note: string | null
  motif: string
  pr: number | null
  state: string
  at: string
}

/** Arayüzün ihtiyaç duyduğu sütunlar. `*` kullanılmaz. */
export const TILE_FIELDS =
  'id, user_id, github_id, username, avatar_url, city, message, pixels, pr_number, pr_status, created_at, updated_at'

export function toPublicTile(row: TileRow): PublicTile {
  return {
    id: row.id,
    user: row.username,
    avatar: row.avatar_url,
    city: row.city,
    note: row.message,
    motif: row.pixels,
    pr: row.pr_number,
    state: row.pr_status,
    at: row.created_at,
  }
}

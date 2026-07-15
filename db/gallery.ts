import { neon } from "@neondatabase/serverless";

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  return value;
}

export function db() {
  return neon(databaseUrl());
}

export async function query<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
  return await db().query(text, params) as T[];
}

export function createShareToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
}

let schemaReady: Promise<void> | null = null;
export function ensureGallerySchema() {
  if (!schemaReady) schemaReady = (async () => {
    const sql = db();
    await sql`CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      share_token TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      event_date TEXT,
      venue TEXT,
      photographer TEXT NOT NULL DEFAULT 'KoAke Photo',
      is_published INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      source_album_url TEXT,
      created_at TEXT NOT NULL
    )`;
    await sql`CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      object_key TEXT NOT NULL UNIQUE,
      source_url TEXT,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS photos_album_sort_idx ON photos(album_id, sort_order)`;
  })().catch((error) => { schemaReady = null; throw error; });
  return schemaReady;
}

export type AdminAlbum = {
  id: string;
  shareToken: string;
  title: string;
  eventDate: string | null;
  venue: string | null;
  isPublished: boolean;
  expiresAt: string | null;
  createdAt: string;
  photoCount: number;
  coverPhotoId: string | null;
};

export async function listAdminAlbums(): Promise<AdminAlbum[]> {
  await ensureGallerySchema();
  const rows = await query<Record<string, unknown>>(`
    SELECT a.id, a.share_token, a.title, a.event_date, a.venue, a.is_published,
           a.expires_at, a.created_at, COUNT(p.id)::int AS photo_count,
           (SELECT p2.id FROM photos p2 WHERE p2.album_id = a.id ORDER BY p2.sort_order LIMIT 1) AS cover_photo_id
    FROM albums a LEFT JOIN photos p ON p.album_id = a.id
    GROUP BY a.id ORDER BY a.created_at DESC
  `);
  return rows.map((row) => ({
    id: String(row.id), shareToken: String(row.share_token), title: String(row.title),
    eventDate: row.event_date ? String(row.event_date) : null,
    venue: row.venue ? String(row.venue) : null,
    isPublished: Number(row.is_published) === 1,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    createdAt: String(row.created_at), photoCount: Number(row.photo_count),
    coverPhotoId: row.cover_photo_id ? String(row.cover_photo_id) : null,
  }));
}

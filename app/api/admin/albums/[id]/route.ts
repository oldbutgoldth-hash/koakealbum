import { getAdminUser } from "../../../../admin-auth";
import { ensureGallerySchema, query, type AdminAlbum } from "../../../../../db/gallery";

type AlbumRow = {
  id: string;
  share_token: string;
  title: string;
  event_date: string | null;
  venue: string | null;
  is_published: number;
  expires_at: string | null;
  created_at: string;
  photo_count: number;
  cover_photo_id: string | null;
};

function mapAlbum(row: AlbumRow): AdminAlbum {
  return {
    id: String(row.id),
    shareToken: String(row.share_token),
    title: String(row.title),
    eventDate: row.event_date ? String(row.event_date) : null,
    venue: row.venue ? String(row.venue) : null,
    isPublished: Number(row.is_published) === 1,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    createdAt: String(row.created_at),
    photoCount: Number(row.photo_count),
    coverPhotoId: row.cover_photo_id ? String(row.cover_photo_id) : null,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json() as { isPublished?: boolean; title?: string; eventDate?: string; venue?: string; expiresAt?: string };
  await ensureGallerySchema();

  if (typeof body.isPublished === "boolean" && body.title === undefined && body.eventDate === undefined && body.venue === undefined && body.expiresAt === undefined) {
    const rows = await query(`UPDATE albums SET is_published = $1 WHERE id = $2 RETURNING id`, [body.isPublished ? 1 : 0, id]);
    if (!rows.length) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return Response.json({ error: "กรุณาระบุชื่ออัลบั้ม" }, { status: 400 });
  const eventDate = typeof body.eventDate === "string" ? body.eventDate.trim() : "";
  const venue = typeof body.venue === "string" ? body.venue.trim() : "";
  const expiresAt = typeof body.expiresAt === "string" ? body.expiresAt.trim() : "";
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) return Response.json({ error: "รูปแบบวันหมดอายุไม่ถูกต้อง" }, { status: 400 });

  const updated = await query<{ id: string }>(
    `UPDATE albums SET title = $1, event_date = $2, venue = $3, expires_at = $4 WHERE id = $5 RETURNING id`,
    [title, eventDate || null, venue || null, expiresAt || null, id],
  );
  if (!updated.length) return Response.json({ error: "Not found" }, { status: 404 });

  const rows = await query<AlbumRow>(
    `SELECT a.id, a.share_token, a.title, a.event_date, a.venue, a.is_published,
            a.expires_at, a.created_at, COUNT(p.id)::int AS photo_count,
            (SELECT p2.id FROM photos p2 WHERE p2.album_id = a.id ORDER BY p2.sort_order LIMIT 1) AS cover_photo_id
     FROM albums a LEFT JOIN photos p ON p.album_id = a.id
     WHERE a.id = $1 GROUP BY a.id LIMIT 1`,
    [id],
  );
  return Response.json({ ok: true, album: mapAlbum(rows[0]) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  await ensureGallerySchema();
  const count = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM photos WHERE album_id = $1`, [id]);
  const rows = await query(`DELETE FROM albums WHERE id = $1 RETURNING id`, [id]);
  if (!rows.length) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, deletedPhotos: Number(count[0]?.count ?? 0) });
}

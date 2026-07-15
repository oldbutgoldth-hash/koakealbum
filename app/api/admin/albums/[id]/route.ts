import { getAdminUser } from "../../../../admin-auth";
import { ensureGallerySchema, query } from "../../../../../db/gallery";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json() as { isPublished?: boolean };
  if (typeof body.isPublished !== "boolean") return Response.json({ error: "Invalid state" }, { status: 400 });
  await ensureGallerySchema();
  const rows = await query(`UPDATE albums SET is_published = $1 WHERE id = $2 RETURNING id`, [body.isPublished ? 1 : 0, id]);
  if (!rows.length) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
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

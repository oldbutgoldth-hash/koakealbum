import { getAdminUser } from "../../admin-auth";
import { createShareToken, ensureGallerySchema, query } from "../../../db/gallery";

type AlbumEntry = unknown[];
function validAlbumUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "photos.app.goo.gl" || url.hostname === "photos.google.com") ? url : null; } catch { return null; } }

export async function POST(request: Request) {
  if (!await getAdminUser()) return Response.json({ error: "ไม่มีสิทธิ์จัดการอัลบั้ม" }, { status: 403 });
  const body = await request.json() as { albumUrl?: string; title?: string; eventDate?: string; venue?: string; expiresAt?: string };
  const albumUrl = validAlbumUrl(body.albumUrl ?? "");
  if (!albumUrl) return Response.json({ error: "กรุณาใส่ลิงก์แชร์ Google Photos ที่ถูกต้อง" }, { status: 400 });
  const response = await fetch(albumUrl, { redirect: "follow", headers: { "user-agent": "KoAkeGallery/1.0" }, cache: "no-store" });
  if (!response.ok || new URL(response.url).hostname !== "photos.google.com") return Response.json({ error: "เปิดอัลบั้มไม่ได้ กรุณาตรวจว่าเปิดแชร์ด้วยลิงก์แล้ว" }, { status: 422 });
  const html = await response.text();
  if (html.length > 8_000_000) return Response.json({ error: "อัลบั้มมีข้อมูลมากเกินไป" }, { status: 413 });
  const match = html.match(/data:(\[null.*,[,0\]]\])/mi);
  if (!match) return Response.json({ error: "ไม่พบรายการภาพในอัลบั้ม" }, { status: 422 });
  let data: unknown[];
  try { data = JSON.parse(match[1]) as unknown[]; } catch { return Response.json({ error: "อ่านข้อมูลอัลบั้มไม่สำเร็จ" }, { status: 422 }); }
  const entries = Array.isArray(data[1]) ? data[1] as AlbumEntry[] : [];
  const parsedTitle = Array.isArray(data[3]) && typeof data[3][1] === "string" ? data[3][1] : "Google Photos Album";
  const items = entries.flatMap((entry) => { const media = Array.isArray(entry) && Array.isArray(entry[1]) ? entry[1] as unknown[] : null; return media && typeof media[0] === "string" && media[0].startsWith("https://lh3.googleusercontent.com/") ? [{ baseUrl: media[0] }] : []; }).slice(0, 1000);
  if (!items.length) return Response.json({ error: "อัลบั้มนี้ไม่มีรูปที่นำมาแสดงได้" }, { status: 422 });

  await ensureGallerySchema();
  const albumId = crypto.randomUUID(); const shareToken = createShareToken(); const title = (body.title?.trim() || parsedTitle).slice(0, 120); const now = new Date().toISOString();
  await query(`INSERT INTO albums (id, slug, share_token, title, event_date, venue, photographer, is_published, expires_at, source_album_url, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9,$10)`, [albumId, `gallery-${albumId.slice(0, 8)}`, shareToken, title, body.eventDate?.slice(0, 80) || null, body.venue?.slice(0, 160) || null, "KoAke Photo", body.expiresAt || null, albumUrl.toString(), now]);
  const photoRows = items.map((item, index) => ({ id: crypto.randomUUID(), album_id: albumId, object_key: `linked/${crypto.randomUUID()}`, source_url: item.baseUrl, filename: `KOAKE-${String(index + 1).padStart(4, "0")}.jpg`, mime_type: "image/jpeg", sort_order: index, created_at: now }));
  await query(`INSERT INTO photos (id, album_id, object_key, source_url, filename, mime_type, sort_order, created_at)
    SELECT x.id,x.album_id,x.object_key,x.source_url,x.filename,x.mime_type,x.sort_order,x.created_at
    FROM jsonb_to_recordset($1::jsonb) AS x(id text,album_id text,object_key text,source_url text,filename text,mime_type text,sort_order integer,created_at text)`, [JSON.stringify(photoRows)]);
  return Response.json({ ok: true, album: { id: albumId, shareToken, title, photoCount: items.length, coverPhotoId: photoRows[0]?.id ?? null, isPublished: true, eventDate: body.eventDate || null, venue: body.venue || null, expiresAt: body.expiresAt || null, createdAt: now } });
}

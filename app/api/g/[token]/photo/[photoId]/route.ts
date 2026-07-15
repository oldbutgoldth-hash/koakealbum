import { ensureGallerySchema, query } from "../../../../../../db/gallery";

async function fetchPhoto(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request, context: { params: Promise<{ token: string; photoId: string }> }) {
  const { token, photoId } = await context.params;
  await ensureGallerySchema();
  const rows = await query<{ source_url: string | null; filename: string }>(`SELECT p.source_url, p.filename FROM photos p JOIN albums a ON a.id = p.album_id WHERE p.id = $1 AND a.share_token = $2 AND a.is_published = 1 AND (a.expires_at IS NULL OR a.expires_at = '' OR a.expires_at > $3) LIMIT 1`, [photoId, token, new Date().toISOString()]);
  const photo = rows[0];
  if (!photo?.source_url) return new Response("Not found", { status: 404 });
  let source: URL;
  try { source = new URL(photo.source_url); } catch { return new Response("Invalid source", { status: 502 }); }
  if (source.protocol !== "https:" || !source.hostname.endsWith("googleusercontent.com")) return new Response("Invalid source", { status: 502 });
  const url = new URL(request.url); const download = url.searchParams.get("download") === "1";
  const full = !download && url.searchParams.get("size") === "full";
  const suffix = download ? "=d" : full ? "=w2400-h2400-no" : "=w1200-h1200-no";
  let remote: Response;
  try {
    remote = await fetchPhoto(`${photo.source_url}${suffix}`);
  } catch {
    if (!full) return new Response("Photo unavailable", { status: 502 });
    try { remote = await fetchPhoto(`${photo.source_url}=w1200-h1200-no`); }
    catch { return new Response("Photo unavailable", { status: 502 }); }
  }
  if (full && (!remote.ok || !remote.body)) {
    try { remote = await fetchPhoto(`${photo.source_url}=w1200-h1200-no`); }
    catch { return new Response("Photo unavailable", { status: 502 }); }
  }
  if (!remote.ok || !remote.body) return new Response("Photo unavailable", { status: 502 });
  const headers = new Headers({ "content-type": remote.headers.get("content-type") ?? "image/jpeg", "cache-control": "private, max-age=3600", "x-robots-tag": "noindex, nofollow" });
  if (download) headers.set("content-disposition", `attachment; filename="${photo.filename.replace(/["\\]/g, "-")}"`);
  return new Response(remote.body, { headers });
}

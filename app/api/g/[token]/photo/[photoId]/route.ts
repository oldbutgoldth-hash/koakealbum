import { ensureGallerySchema, query } from "../../../../../../db/gallery";

type PhotoRow = { source_url: string | null; filename: string };

function cleanGoogleUrl(raw: string) {
  const url = new URL(raw);
  url.hash = "";
  url.pathname = url.pathname.replace(/=([a-zA-Z0-9_-]+(?:-[a-zA-Z0-9_-]+)*)$/, "");
  return url.toString();
}

function allowed(url: URL) {
  return url.protocol === "https:" &&
    (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com"));
}

async function firstAvailable(urls: string[]) {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0", accept: "image/*,*/*;q=0.8" },
      });
      if (response.ok && response.body) return response;
    } catch {}
  }
  return null;
}

export async function GET(request: Request, context: { params: Promise<{ token: string; photoId: string }> }) {
  const { token, photoId } = await context.params;
  await ensureGallerySchema();
  const rows = await query<PhotoRow>(
    `SELECT p.source_url, p.filename FROM photos p JOIN albums a ON a.id = p.album_id
     WHERE p.id = $1 AND a.share_token = $2 AND a.is_published = 1
     AND (a.expires_at IS NULL OR a.expires_at = '' OR a.expires_at > $3) LIMIT 1`,
    [photoId, token, new Date().toISOString()],
  );
  const photo = rows[0];
  if (!photo?.source_url) return new Response("Not found", { status: 404 });

  let source: URL;
  try { source = new URL(photo.source_url); } catch { return new Response("Invalid source", { status: 502 }); }
  if (!allowed(source)) return new Response("Invalid source", { status: 502 });

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const base = cleanGoogleUrl(photo.source_url);
  const remote = await firstAvailable(download
    ? [`${base}=d`, base]
    : [`${base}=w1200-h1200-no`, `${base}=w1000-h1000-no`, `${base}=w800-h800-no`, base]);

  if (!remote?.body) return new Response("Photo unavailable", { status: 502, headers: { "cache-control": "no-store" } });

  const headers = new Headers({
    "content-type": remote.headers.get("content-type") ?? "image/jpeg",
    "cache-control": download ? "private, no-store" : "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow",
  });
  if (download) headers.set("content-disposition", `attachment; filename="${photo.filename.replace(/["\\\r\n]/g, "-")}"`);
  return new Response(remote.body, { status: 200, headers });
}

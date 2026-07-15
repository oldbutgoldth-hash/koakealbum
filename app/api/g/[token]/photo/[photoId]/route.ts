import { ensureGallerySchema, query } from "../../../../../../db/gallery";

function normalizeGooglePhotoUrl(raw: string) {
  const url = new URL(raw);
  url.hash = "";

  // Google Photos base URLs sometimes already end with a transform suffix.
  // Remove it before applying a fresh size/download transform.
  url.pathname = url.pathname.replace(/=([a-zA-Z0-9_-]+(?:-[a-zA-Z0-9_-]+)*)$/, "");
  return url.toString();
}

async function fetchFirstAvailable(urls: string[]) {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0",
          accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      if (response.ok && response.body) return response;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string; photoId: string }> },
) {
  const { token, photoId } = await context.params;

  await ensureGallerySchema();

  const rows = await query<{ source_url: string | null; filename: string }>(
    `SELECT p.source_url, p.filename
     FROM photos p
     JOIN albums a ON a.id = p.album_id
     WHERE p.id = $1
       AND a.share_token = $2
       AND a.is_published = 1
       AND (a.expires_at IS NULL OR a.expires_at = '' OR a.expires_at > $3)
     LIMIT 1`,
    [photoId, token, new Date().toISOString()],
  );

  const photo = rows[0];
  if (!photo?.source_url) {
    return new Response("Not found", { status: 404 });
  }

  let source: URL;
  try {
    source = new URL(photo.source_url);
  } catch {
    return new Response("Invalid source", { status: 502 });
  }

  const allowedGoogleHost =
    source.protocol === "https:" &&
    (source.hostname === "googleusercontent.com" ||
      source.hostname.endsWith(".googleusercontent.com"));

  if (!allowedGoogleHost) {
    return new Response("Invalid source", { status: 502 });
  }

  const requestUrl = new URL(request.url);
  const download = requestUrl.searchParams.get("download") === "1";
  const full = requestUrl.searchParams.get("size") === "full";
  const base = normalizeGooglePhotoUrl(photo.source_url);

  const candidates = download
    ? [`${base}=d`, `${base}=w2400-h2400-no`, `${base}=w1600-h1600-no`, base]
    : full
      ? [`${base}=w2400-h2400-no`, `${base}=w2048-h2048-no`, `${base}=w1600-h1600-no`, `${base}=w1200-h1200-no`, base]
      : [`${base}=w1200-h1200-no`, `${base}=w800-h800-no`, base];

  const remote = await fetchFirstAvailable(candidates);

  if (!remote?.body) {
    return new Response("Photo unavailable", {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }

  const headers = new Headers({
    "content-type": remote.headers.get("content-type") ?? "image/jpeg",
    "cache-control": "private, max-age=3600",
    "x-robots-tag": "noindex, nofollow",
  });

  const contentLength = remote.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);

  if (download) {
    headers.set(
      "content-disposition",
      `attachment; filename="${photo.filename.replace(/["\\]/g, "-")}"`,
    );
  }

  return new Response(remote.body, {
    status: 200,
    headers,
  });
}

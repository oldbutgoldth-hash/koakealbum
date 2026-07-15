import sharp from "sharp";
import { ensureGallerySchema, query } from "../../../../../../db/gallery";

export const runtime = "nodejs";
export const maxDuration = 30;

type PhotoRow = {
  source_url: string | null;
  filename: string;
};

function normalizeGooglePhotoUrl(raw: string) {
  const url = new URL(raw);
  url.hash = "";

  // Remove an existing Google image transform before applying a new one.
  url.pathname = url.pathname.replace(/=([a-zA-Z0-9_-]+(?:-[a-zA-Z0-9_-]+)*)$/, "");
  return url.toString();
}

function isAllowedGooglePhotoUrl(url: URL) {
  return (
    url.protocol === "https:" &&
    (url.hostname === "googleusercontent.com" ||
      url.hostname.endsWith(".googleusercontent.com"))
  );
}

async function fetchFirstAvailable(urls: string[]) {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "user-agent": "Mozilla/5.0",
        },
      });

      if (response.ok) return response;
    } catch {
      // Try the next candidate URL.
    }
  }

  return null;
}

function safeFilename(filename: string) {
  return filename.replace(/["\\\r\n]/g, "-");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string; photoId: string }> },
) {
  const { token, photoId } = await context.params;
  await ensureGallerySchema();

  const rows = await query<PhotoRow>(
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

  if (!isAllowedGooglePhotoUrl(source)) {
    return new Response("Invalid source", { status: 502 });
  }

  const requestUrl = new URL(request.url);
  const download = requestUrl.searchParams.get("download") === "1";
  const preview = requestUrl.searchParams.get("preview") === "full" ? "full" : "thumb";
  const base = normalizeGooglePhotoUrl(photo.source_url);

  // Downloads always remain the original Google Photos file.
  if (download) {
    const remote = await fetchFirstAvailable([`${base}=d`, base]);
    if (!remote?.body) {
      return new Response("Photo unavailable", {
        status: 502,
        headers: { "cache-control": "no-store" },
      });
    }

    const headers = new Headers({
      "content-type": remote.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "private, max-age=0, no-store",
      "content-disposition": `attachment; filename="${safeFilename(photo.filename)}"`,
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    });

    return new Response(remote.body, { status: 200, headers });
  }

  // Preview files are resized and converted to WebP. The stable URL lets the
  // Vercel CDN and the customer's browser reuse the generated result.
  const width = preview === "full" ? 1800 : 1000;
  const quality = preview === "full" ? 82 : 76;
  const remote = await fetchFirstAvailable([
    `${base}=w${width}-h${width}-no`,
    `${base}=w${Math.min(width, 1600)}-h${Math.min(width, 1600)}-no`,
    base,
  ]);

  if (!remote) {
    return new Response("Photo unavailable", {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }

  try {
    const input = Buffer.from(await remote.arrayBuffer());
    const webp = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({
        width,
        height: width,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toBuffer();

    return new Response(new Uint8Array(webp), {
      status: 200,
      headers: {
        "content-type": "image/webp",
        // Browser: 7 days, Vercel CDN: 30 days, stale copy: 7 more days.
        "cache-control":
          "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800, immutable",
        "content-length": String(webp.byteLength),
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  } catch {
    return new Response("Preview conversion failed", {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }
}

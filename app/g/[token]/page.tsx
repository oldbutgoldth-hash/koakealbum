import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryClient, type GalleryPhoto } from "../../gallery-client";
import { ensureGallerySchema, query } from "../../../db/gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function CustomerGallery({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureGallerySchema();
  const albums = await query<Record<string, unknown>>(`SELECT id, share_token, title, event_date, venue, photographer FROM albums WHERE share_token = $1 AND is_published = 1 AND (expires_at IS NULL OR expires_at = '' OR expires_at > $2) LIMIT 1`, [token, new Date().toISOString()]);
  const album = albums[0];
  if (!album) notFound();
  const rows = await query<Record<string, unknown>>(`SELECT id, filename, sort_order FROM photos WHERE album_id = $1 ORDER BY sort_order`, [album.id]);
  const photos: GalleryPhoto[] = rows.map((photo, index) => {
    const id = String(photo.id); const base = `/api/g/${encodeURIComponent(token)}/photo/${encodeURIComponent(id)}`;
    return { id, src: base, full: `${base}?size=full`, download: `${base}?download=1`, alt: `ภาพที่ ${index + 1} จากอัลบั้ม ${album.title}`, filename: String(photo.filename), aspect: "landscape" };
  });
  return <GalleryClient album={{ title: String(album.title), eventDate: album.event_date ? String(album.event_date) : null, venue: album.venue ? String(album.venue) : null, photographer: "KoAke Photo", shareToken: token }} photos={photos} />;
}

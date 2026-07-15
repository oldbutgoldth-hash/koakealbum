"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type GalleryPhoto = { id: string; src: string; full: string; download: string; alt: string; filename: string; aspect: "portrait" | "landscape" | "square" };
export type GalleryAlbum = { title: string; eventDate: string | null; venue: string | null; photographer: string; shareToken: string };

async function savePhoto(photo: GalleryPhoto) {
  const response = await fetch(photo.download);
  if (!response.ok) throw new Error("download failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = photo.filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function GalleryClient({ album, photos }: { album: GalleryAlbum; photos: GalleryPhoto[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const selectedPhotos = useMemo(() => photos.filter((photo) => selected.has(photo.id)), [photos, selected]);
  const currentPhoto = lightbox === null ? null : photos[lightbox];

  const move = (direction: number) => setLightbox((current) => current === null ? null : (current + direction + photos.length) % photos.length);
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (lightbox === null) return;
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  useEffect(() => {
    document.body.style.overflow = lightbox !== null || infoOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox, infoOpen]);

  useEffect(() => {
    if (lightbox === null) return;

    const updateViewerHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--lightbox-height", `${Math.round(height)}px`);
    };

    updateViewerHeight();
    window.addEventListener("resize", updateViewerHeight);
    window.addEventListener("orientationchange", updateViewerHeight);
    window.visualViewport?.addEventListener("resize", updateViewerHeight);

    return () => {
      window.removeEventListener("resize", updateViewerHeight);
      window.removeEventListener("orientationchange", updateViewerHeight);
      window.visualViewport?.removeEventListener("resize", updateViewerHeight);
      document.documentElement.style.removeProperty("--lightbox-height");
    };
  }, [lightbox]);

  const downloadSelected = async () => {
    setNotice(`กำลังดาวน์โหลด ${selectedPhotos.length} รูป…`);
    for (const photo of selectedPhotos) {
      try { await savePhoto(photo); } catch { setNotice(`ดาวน์โหลด ${photo.filename} ไม่สำเร็จ`); }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    setNotice("ดาวน์โหลดเรียบร้อยแล้ว");
    setTimeout(() => setNotice(""), 2500);
  };

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">K</span><span><strong>KoAke</strong><small>PHOTO</small></span></div>
        <span className="private-badge">อัลบั้มส่วนตัว</span>
        <button className="info-button" onClick={() => setInfoOpen(true)} aria-label="ข้อมูลอัลบั้ม">i</button>
      </header>
      <section className="hero">
        <div className="eyebrow"><span /> PRIVATE GALLERY <span /></div>
        <h1>{album.title}</h1>
        <p>{[album.eventDate, album.venue].filter(Boolean).join(" · ")}</p>
        <div className="hero-actions">
          <button className="primary" onClick={() => document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" })}>ชมภาพทั้งหมด <span>↓</span></button>
          <button className="secondary" onClick={() => setSelected(new Set(photos.map((photo) => photo.id)))}>เลือกทั้งหมด</button>
        </div>
      </section>
      <section className="gallery-section" id="gallery">
        <div className="gallery-heading"><div><span className="section-number">01</span><h2>เรื่องราวในอัลบั้ม</h2></div><p>ภาพทั้งหมด {photos.length} รูป</p></div>
        <div className="masonry">
          {photos.map((photo, index) => (
            <article className={`photo-card ${photo.aspect}`} key={photo.id}>
              <button className="photo-open" onClick={() => setLightbox(index)} aria-label={`เปิดดู ${photo.alt}`}><img src={photo.src} alt={photo.alt} loading={index < 6 ? "eager" : "lazy"} /></button>
              <button className={`select-photo ${selected.has(photo.id) ? "active" : ""}`} onClick={() => toggle(photo.id)} aria-label={selected.has(photo.id) ? `ยกเลิกเลือก ${photo.filename}` : `เลือก ${photo.filename}`} aria-pressed={selected.has(photo.id)}>{selected.has(photo.id) ? "✓" : ""}</button>
              <span className="photo-index">{String(index + 1).padStart(2, "0")}</span>
            </article>
          ))}
        </div>
      </section>
      <footer><span className="footer-mark">K</span><p>เก็บทุกความรู้สึก ให้กลับมามีชีวิตอีกครั้ง</p><small>© 2026 KOAKE PHOTO</small></footer>
      {selected.size > 0 && <div className="selection-bar"><div><span>{selected.size}</span><p>รูปที่เลือก<small>แตะรูปอีกครั้งเพื่อยกเลิก</small></p></div><button className="clear-button" onClick={() => setSelected(new Set())}>ล้าง</button><button className="download-button" onClick={downloadSelected}><span>↓</span> ดาวน์โหลด</button></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
      {currentPhoto && <div className="lightbox" role="dialog" aria-modal="true" aria-label={`ดูภาพ ${lightbox! + 1} จาก ${photos.length}`} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1); touchStart.current = null; }}>
        <div className="lightbox-top"><span><b>{String(lightbox! + 1).padStart(2, "0")}</b> / {String(photos.length).padStart(2, "0")}</span><div><button onClick={() => toggle(currentPhoto.id)} className={selected.has(currentPhoto.id) ? "chosen" : ""}>{selected.has(currentPhoto.id) ? "✓ เลือกแล้ว" : "○ เลือกรูป"}</button><button onClick={() => savePhoto(currentPhoto)}>↓ ดาวน์โหลด</button><button className="close" onClick={() => setLightbox(null)} aria-label="ปิด">×</button></div></div>
        <button className="nav prev" onClick={() => move(-1)} aria-label="รูปก่อนหน้า">←</button><div className="lightbox-stage"><img
          key={currentPhoto.id}
          src={currentPhoto.full}
          alt={currentPhoto.alt}
          onError={(event) => {
            const image = event.currentTarget;
            if (image.dataset.fallbackApplied === "1") return;
            image.dataset.fallbackApplied = "1";
            image.src = currentPhoto.src;
          }}
        /></div><button className="nav next" onClick={() => move(1)} aria-label="รูปถัดไป">→</button><div className="lightbox-bottom"><p>{currentPhoto.filename}</p><span>ปัดซ้าย–ขวา หรือใช้ปุ่มลูกศรเพื่อดูรูปถัดไป</span></div>
      </div>}
      {infoOpen && <div className="sheet-backdrop" role="presentation" onMouseDown={() => setInfoOpen(false)}><aside className="info-sheet" role="dialog" aria-modal="true" aria-label="ข้อมูลอัลบั้ม" onMouseDown={(event) => event.stopPropagation()}><button className="sheet-close" onClick={() => setInfoOpen(false)}>×</button><span className="sheet-kicker">PRIVATE GALLERY</span><h2>{album.title}</h2><p>ลิงก์นี้จัดทำสำหรับลูกค้าของอัลบั้มนี้เท่านั้น กรุณาไม่ส่งต่อให้บุคคลอื่น</p><dl><div><dt>วันที่</dt><dd>{album.eventDate || "—"}</dd></div><div><dt>สถานที่</dt><dd>{album.venue || "—"}</dd></div><div><dt>ช่างภาพ</dt><dd>KoAke Photo</dd></div></dl><button className="sheet-action" onClick={() => { setInfoOpen(false); setSelected(new Set(photos.map((photo) => photo.id))); }}>เลือกทุกภาพในอัลบั้ม</button></aside></div>}
    </main>
  );
}

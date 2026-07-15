"use client";

import { useMemo, useState } from "react";
import type { AdminAlbum } from "../../db/gallery";

export function StudioClient({ ownerName, initialAlbums }: { ownerName: string; initialAlbums: AdminAlbum[] }) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [showCreate, setShowCreate] = useState(initialAlbums.length === 0);
  const [title, setTitle] = useState(""); const [eventDate, setEventDate] = useState(""); const [venue, setVenue] = useState(""); const [expiresAt, setExpiresAt] = useState(""); const [shareLink, setShareLink] = useState("");
  const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false); const [copied, setCopied] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const publishedCount = useMemo(() => albums.filter((album) => album.isPublished).length, [albums]);

  const customerUrl = (token: string) => `${window.location.origin}/g/${token}`;
  const copyLink = async (album: AdminAlbum) => { await navigator.clipboard.writeText(customerUrl(album.shareToken)); setCopied(album.id); setTimeout(() => setCopied(""), 1800); };

  const importAlbum = async () => {
    if (!title.trim() || !shareLink.trim()) return;
    setBusy(true); setStatus("กำลังตรวจลิงก์และสร้างอัลบั้ม กรุณารอสักครู่…");
    try {
      const response = await fetch("/api/import-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ albumUrl: shareLink.trim(), title: title.trim(), eventDate, venue, expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : "" }) });
      const result = await response.json() as { album?: AdminAlbum; error?: string };
      if (!response.ok || !result.album) throw new Error(result.error ?? "สร้างอัลบั้มไม่สำเร็จ");
      setAlbums((current) => [result.album!, ...current]); setStatus(`สร้างอัลบั้ม “${result.album.title}” แล้ว ${result.album.photoCount} รูป`);
      setTitle(""); setEventDate(""); setVenue(""); setExpiresAt(""); setShareLink(""); setShowCreate(false);
    } catch (error) { setStatus(error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่"); } finally { setBusy(false); }
  };

  const togglePublish = async (album: AdminAlbum) => {
    const next = !album.isPublished;
    const response = await fetch(`/api/admin/albums/${album.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished: next }) });
    if (response.ok) setAlbums((current) => current.map((item) => item.id === album.id ? { ...item, isPublished: next } : item));
  };

  const deleteAlbum = async (album: AdminAlbum) => {
    const confirmed = window.confirm(`ลบอัลบั้ม “${album.title}” ถาวรหรือไม่?\n\nรูปที่เก็บในแอปและลิงก์ลูกค้าจะถูกลบและไม่สามารถกู้คืนได้`);
    if (!confirmed) return;
    setDeletingId(album.id);
    const response = await fetch(`/api/admin/albums/${album.id}`, { method: "DELETE" });
    if (response.ok) {
      setAlbums((current) => current.filter((item) => item.id !== album.id));
      setStatus(`ลบอัลบั้ม “${album.title}” เรียบร้อยแล้ว`);
    } else {
      setStatus("ลบอัลบั้มไม่สำเร็จ กรุณาลองใหม่");
    }
    setDeletingId("");
  };

  return <main className="studio-dashboard">
    <header className="studio-header"><a href="/" className="brand"><span className="brand-mark">K</span><span><strong>KoAke</strong><small>PHOTO</small></span></a><div><span>สวัสดี {ownerName}</span><a href="/api/admin/logout">ออกจากระบบ</a></div></header>
    <section className="dashboard-shell">
      <div className="dashboard-title"><div><span className="sheet-kicker">PHOTOGRAPHER STUDIO</span><h1>อัลบั้มลูกค้า</h1><p>สร้าง จัดการ และส่งลิงก์ส่วนตัวให้ลูกค้าแต่ละงาน</p></div><button className="primary" onClick={() => setShowCreate((value) => !value)}>{showCreate ? "ปิดแบบฟอร์ม" : "+ สร้างงานใหม่"}</button></div>
      <div className="dashboard-stats"><div><strong>{albums.length}</strong><span>อัลบั้มทั้งหมด</span></div><div><strong>{publishedCount}</strong><span>กำลังเผยแพร่</span></div><div><strong>{albums.reduce((sum, album) => sum + album.photoCount, 0)}</strong><span>รูปทั้งหมด</span></div></div>
      {showCreate && <section className="create-panel"><div className="create-panel-head"><span>NEW CLIENT GALLERY</span><h2>สร้างอัลบั้มใหม่</h2></div><div className="create-grid"><label>ชื่ออัลบั้ม *<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น กานต์ & กิ่ง" /></label><label>วันที่จัดงาน<input value={eventDate} onChange={(e) => setEventDate(e.target.value)} placeholder="12 มิถุนายน 2569" /></label><label>สถานที่<input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="ชื่อสถานที่" /></label><label>วันหมดอายุ<input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label><label className="full">ลิงก์แชร์ Google Photos *<input value={shareLink} onChange={(e) => setShareLink(e.target.value)} placeholder="https://photos.app.goo.gl/…" inputMode="url" /></label></div><button className="google-button" onClick={importAlbum} disabled={busy || !title || !shareLink}>{busy ? "กำลังสร้างอัลบั้ม…" : "ดึงรูปและสร้างลิงก์ลูกค้า"}</button>{status && <div className="studio-status" role="status">{status}</div>}</section>}
      <div className="album-list-head"><h2>งานทั้งหมด</h2><span>{albums.length} งาน</span></div>
      {albums.length === 0 ? <div className="empty-albums"><span>＋</span><h3>ยังไม่มีอัลบั้ม</h3><p>เริ่มต้นด้วยการสร้างงานและวางลิงก์ Google Photos</p></div> : <div className="album-grid">{albums.map((album) => <article className="album-admin-card" key={album.id}>
        <div className="album-cover">{album.coverPhotoId && album.isPublished ? <img src={`/api/g/${album.shareToken}/photo/${album.coverPhotoId}`} alt="" /> : <span>L</span>}<b className={album.isPublished ? "live" : "draft"}>{album.isPublished ? "เผยแพร่แล้ว" : "ปิดอยู่"}</b><div className="album-quick-actions"><button className="copy-link-primary" onClick={() => copyLink(album)} disabled={!album.isPublished}>{album.isPublished ? (copied === album.id ? "✓ คัดลอกลิงก์แล้ว" : "⧉ คัดลอกลิงก์ลูกค้า") : "เผยแพร่ก่อนคัดลอกลิงก์"}</button><button className="delete-album-primary" onClick={() => deleteAlbum(album)} disabled={deletingId === album.id}>{deletingId === album.id ? "กำลังลบ…" : "ลบอัลบั้ม"}</button></div></div>
        <div className="album-card-body"><span className="album-date">{album.eventDate || new Date(album.createdAt).toLocaleDateString("th-TH")}</span><h3>{album.title}</h3><p>{album.venue || "ยังไม่ได้ระบุสถานที่"}</p><div className="album-meta"><span>{album.photoCount} รูป</span>{album.expiresAt && <span>หมดอายุ {new Date(album.expiresAt).toLocaleDateString("th-TH")}</span>}</div><div className="album-actions">{album.isPublished && <a href={`/g/${album.shareToken}`} target="_blank" rel="noreferrer">เปิดดูอัลบั้ม</a>}<button className="muted" onClick={() => togglePublish(album)}>{album.isPublished ? "หยุดเผยแพร่" : "เผยแพร่"}</button></div></div>
      </article>)}</div>}
    </section>
  </main>;
}

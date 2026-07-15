export default function Home() {
  return (
    <main className="public-home">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">K</span><span><strong>KoAke</strong><small>PHOTO</small></span></div>
        <a className="owner-link" href="/studio">สำหรับช่างภาพ</a>
      </header>
      <section className="public-home-hero">
        <div className="eyebrow"><span /> PRIVATE CLIENT GALLERIES <span /></div>
        <h1>เรื่องราวของคุณ<br/><em>เก็บไว้อย่างงดงาม</em></h1>
        <p>แกลเลอรีส่วนตัวสำหรับลูกค้า KoAke Photo</p>
        <div className="privacy-note"><span>✦</span><p>กรุณาเปิดอัลบั้มจากลิงก์ส่วนตัวที่ช่างภาพส่งให้คุณ</p></div>
      </section>
      <footer><span className="footer-mark">K</span><p>เก็บทุกความรู้สึก ให้กลับมามีชีวิตอีกครั้ง</p><small>© 2026 KOAKE PHOTO</small></footer>
    </main>
  );
}

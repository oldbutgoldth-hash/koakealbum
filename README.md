# KoAke Photo — Vercel Edition

เวอร์ชันนี้สร้างสำหรับนำซอร์สขึ้น GitHub และ Import เข้า Vercel โดยตรง ระบบไม่ผูกกับ ChatGPT Sites

## สิ่งที่ต้องเตรียม

1. บัญชี Vercel
2. ฐานข้อมูล Neon Postgres (เพิ่มจาก Vercel Marketplace ได้)
3. Environment Variables ใน Vercel:
   - `DATABASE_URL` — Neon connection string
   - `ADMIN_PASSWORD` — รหัสผ่านหน้าแอดมิน อย่างน้อย 8 ตัวอักษร
   - `SESSION_SECRET` — ข้อความสุ่มยาวอย่างน้อย 32 ตัวอักษร

## Deploy

1. แตก ZIP แล้วอัปโหลด **ไฟล์และโฟลเดอร์ภายใน** ไปไว้ที่ root ของ GitHub Repository
2. ตรวจว่า `package.json`, `app`, `db`, `public` อยู่ชั้นบนสุดของ Repository
3. ใน Vercel กด Add New > Project แล้ว Import Repository
4. Framework Preset เลือก Next.js และ Root Directory เว้นว่าง
5. เพิ่ม Neon จาก Storage/Marketplace ให้ได้ `DATABASE_URL`
6. เพิ่ม `ADMIN_PASSWORD` และ `SESSION_SECRET` ใน Settings > Environment Variables
7. กด Redeploy

หน้าแอดมินอยู่ที่ `/studio` และหน้าอัลบั้มลูกค้าใช้ `/g/[ลิงก์ลับ]`

## หมายเหตุ

- รูปภาพยังโหลดจาก Google Photos ต้นทาง ต้องเปิดแชร์อัลบั้มไว้
- หากลบหรือปิดการแชร์อัลบั้ม Google Photos รูปในเว็บอาจไม่แสดง
- เปลี่ยนรหัสผ่านได้จาก Vercel Environment Variables แล้ว Redeploy

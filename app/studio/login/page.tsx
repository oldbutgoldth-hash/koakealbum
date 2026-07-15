import { redirect } from "next/navigation";
import { getAdminUser, setAdminSession, verifyAdminPassword } from "../../admin-auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdminUser()) redirect("/studio");
  const { error } = await searchParams;
  async function login(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    if (!verifyAdminPassword(password)) redirect("/studio/login?error=1");
    await setAdminSession();
    redirect("/studio");
  }
  return <main className="studio-page"><section className="studio-card"><span className="brand-mark">K</span><p className="sheet-kicker">KOAKE PHOTO ADMIN</p><h1>เข้าสู่ระบบแอดมิน</h1><p>ใส่รหัสผ่านที่ตั้งไว้ใน Vercel Environment Variables</p><form action={login}><label>รหัสผ่าน<input type="password" name="password" required autoComplete="current-password" /></label><button className="google-button" type="submit">เข้าสู่ระบบ</button>{error && <div className="studio-status">รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่</div>}</form></section></main>;
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./lightbox-fix.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og-v2.png`;
  const title = "KoAke Photo — Private Client Galleries";
  const description = "แกลเลอรีภาพส่วนตัวสำหรับลูกค้า ดู เลือก และดาวน์โหลดภาพได้ง่ายจากทุกอุปกรณ์";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: imageUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

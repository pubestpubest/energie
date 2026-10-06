import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

// Geist for Latin and digits; Thai glyphs fall through to IBM Plex Sans Thai.
const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const thai = IBM_Plex_Sans_Thai({ subsets: ["thai"], weight: ["400", "500", "600", "700"], variable: "--font-thai" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Energie",
  description: "บันทึกค่าไฟในบ้านและพยากรณ์ค่าไฟรายเดือน",
  appleWebApp: { capable: true, title: "Energie", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${sans.variable} ${thai.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}

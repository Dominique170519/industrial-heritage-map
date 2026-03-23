import type { Metadata } from "next";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "锈迹地图 · Industrial Heritage Map",
  description: "一个面向工业遗产与城市档案兴趣者的轻量地图工具。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen bg-[#eef2f6] text-slate-900">
          <main>{children}</main>

          <footer className="border-t border-stone-300">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-sm text-slate-500 sm:px-6 lg:px-8">
              <Link href="/" className="font-semibold text-slate-700 hover:text-[var(--industrial-accent)] transition">
                锈迹地图 · Industrial Heritage Map
              </Link>
              <nav className="flex items-center gap-5">
                <Link href="/" className="hover:text-slate-700 transition">地图</Link>
                <Link href="/disclaimer" className="hover:text-slate-700 transition">免责声明</Link>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "寻厂 · 工业遗产地图",
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
        <div className="min-h-screen bg-[#f7f7f5] text-slate-900">
          <header className="border-b border-stone-300 bg-[rgba(247,247,245,0.92)] backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
                寻厂 · 工业遗产地图
              </Link>

              <nav className="flex items-center gap-5 text-sm text-slate-600">
                <Link href="/">地图</Link>
                <Link href="/disclaimer">免责声明</Link>
              </nav>
            </div>
          </header>

          <main>{children}</main>

          <footer className="border-t border-stone-300">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
              <p>寻厂 · 工业遗产地图 MVP</p>
              <p>数据为本地 JSON 示例，仅用于演示与研究型浏览。</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

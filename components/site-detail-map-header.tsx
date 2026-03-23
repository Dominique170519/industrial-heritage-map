"use client";

import Link from "next/link";

export default function SiteDetailMapHeader({
  siteName,
  lat,
  lng,
  mapReturnHref,
}: {
  siteName: string;
  lat: number;
  lng: number;
  mapReturnHref: string;
}) {
  function copyCoords() {
    navigator.clipboard.writeText(`${lat},${lng}`).catch(() => {});
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">地图定位</h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={copyCoords}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-stone-400 hover:bg-stone-50"
        >
          复制坐标
        </button>
        <a
          href={`https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(siteName)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-stone-400 hover:bg-stone-50"
        >
          高德导航 →
        </a>
        <Link
          href={mapReturnHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-stone-400 hover:bg-stone-50"
        >
          返回主地图
        </Link>
      </div>
    </div>
  );
}

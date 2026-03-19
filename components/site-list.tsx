"use client";

import type { Site } from "@/types/site";
import SiteCard from "@/components/site-card";

export default function SiteList({ sites }: { sites: Site[] }) {
  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-slate-500">
        没有匹配到点位，请调整筛选条件。
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sites.map((site) => (
        <SiteCard key={site.id} site={site} />
      ))}
    </div>
  );
}

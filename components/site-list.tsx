"use client";

import { useEffect } from "react";
import type { Site } from "@/types/site";
import SiteCard from "@/components/site-card";

export default function SiteList({
  sites,
  selectedSiteId,
  hoveredSiteId,
  onSelectSite,
  onHoverSite,
}: {
  sites: Site[];
  selectedSiteId: string | null;
  hoveredSiteId: string | null;
  onSelectSite: (siteId: string | null) => void;
  onHoverSite: (siteId: string | null) => void;
}) {
  useEffect(() => {
    if (!selectedSiteId) {
      return;
    }

    const element = document.getElementById(`site-card-${selectedSiteId}`);
    element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedSiteId]);

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-slate-500">
        <p>没有匹配到点位，请调整筛选条件，或尝试清空关键词后重试。</p>
        <p className="mt-2">地图未显示任何匹配点位。</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sites.map((site) => (
        <SiteCard
          key={site.id}
          id={`site-card-${site.id}`}
          site={site}
          isSelected={selectedSiteId === site.id}
          isHovered={hoveredSiteId === site.id}
          onHover={onHoverSite}
          onSelect={onSelectSite}
        />
      ))}
    </div>
  );
}

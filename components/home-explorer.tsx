"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { buildLinkedSiteFilterOptions, buildSiteSearchParams, filterSites, mergeSiteFilters, parseSiteFiltersFromSearchParams, sanitizeSiteFilters } from "@/lib/sites";
import type { Site, SiteFilterKey } from "@/types/site";
import Filters from "@/components/filters";
import SiteList from "@/components/site-list";

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-2xl border border-stone-300 bg-white text-sm text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      地图加载中...
    </div>
  ),
});

export default function HomeExplorer({
  sites,
}: {
  sites: Site[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseSiteFiltersFromSearchParams(searchParams), [searchParams]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);

  const filteredSites = useMemo(() => filterSites(sites, filters), [filters, sites]);
  const linkedOptions = useMemo(() => buildLinkedSiteFilterOptions(sites, filters), [filters, sites]);
  const selectedSiteIdInResults =
    selectedSiteId && filteredSites.some((site) => site.id === selectedSiteId) ? selectedSiteId : null;
  const hoveredSiteIdInResults =
    hoveredSiteId && filteredSites.some((site) => site.id === hoveredSiteId) ? hoveredSiteId : null;
  const effectiveSelectedSiteId = selectedSiteIdInResults ?? filteredSites[0]?.id ?? null;

  function handleChange(key: SiteFilterKey, value: string) {
    const nextFilters = mergeSiteFilters(filters, key, value);
    const nextLinkedOptions = buildLinkedSiteFilterOptions(sites, nextFilters);
    const sanitizedFilters = sanitizeSiteFilters(nextFilters, nextLinkedOptions);
    const nextQuery = buildSiteSearchParams(sanitizedFilters).toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  function handleReset() {
    router.replace(pathname, { scroll: false });
  }

  function handleSelectSite(siteId: string | null) {
    setSelectedSiteId(siteId);
  }

  function handleHoverSite(siteId: string | null) {
    setHoveredSiteId(siteId);
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        id="map-explorer"
        className="rounded-3xl border border-stone-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8"
      >
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Map Explorer</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              工业遗产地图筛选页
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              先按省份、城市、类别、级别、批次与关键词做基础检索，再结合地图与列表切换到单点档案页继续阅读。
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-slate-600">
            当前结果 <span className="font-semibold text-slate-900">{filteredSites.length}</span> / {sites.length}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <div className="xl:sticky xl:top-6">
          <Filters
            provinces={linkedOptions.provinces}
            cities={linkedOptions.cities}
            categories={linkedOptions.categories}
            statuses={linkedOptions.statuses}
            levels={linkedOptions.levels}
            batches={linkedOptions.batches}
            filters={filters}
            total={sites.length}
            filtered={filteredSites.length}
            onChange={handleChange}
            onReset={handleReset}
          />
        </div>

        <div className="flex flex-col gap-6">
          <MapView
            sites={filteredSites}
            selectedSiteId={effectiveSelectedSiteId}
            hoveredSiteId={hoveredSiteIdInResults}
            onSelectSite={handleSelectSite}
            onHoverSite={handleHoverSite}
          />

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">点位列表</h2>
                <p className="mt-1 text-sm text-slate-500">
                  筛选结果与地图同步，可继续进入单点详情查看研究字段与访问提示。
                </p>
              </div>
            </div>

            <SiteList
              sites={filteredSites}
              selectedSiteId={effectiveSelectedSiteId}
              hoveredSiteId={hoveredSiteIdInResults}
              onSelectSite={handleSelectSite}
              onHoverSite={handleHoverSite}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

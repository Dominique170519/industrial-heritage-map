"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { filterSites } from "@/lib/sites";
import type { Site, SiteFilterOptions, SiteFilters } from "@/types/site";
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

const initialFilters: SiteFilters = {
  province: "",
  city: "",
  category: "",
  status: "",
  level: "",
  batch: "",
  keyword: "",
};

export default function HomeExplorer({
  sites,
  options,
}: {
  sites: Site[];
  options: SiteFilterOptions;
}) {
  const [filters, setFilters] = useState<SiteFilters>(initialFilters);

  const filteredSites = useMemo(() => filterSites(sites, filters), [filters, sites]);
  const cityOptions = useMemo(() => {
    if (!filters.province) {
      return options.cities;
    }

    return Array.from(
      new Set(
        sites
          .filter((site) => site.provinceFull === filters.province)
          .map((site) => site.primaryCity),
      ),
    ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [filters.province, options.cities, sites]);

  function handleChange(key: keyof SiteFilters, value: string) {
    setFilters((prev) => {
      if (key === "province") {
        return {
          ...prev,
          province: value,
          city: "",
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  }

  function handleReset() {
    setFilters(initialFilters);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-stone-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8">
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
            provinces={options.provinces}
            cities={cityOptions}
            categories={options.categories}
            statuses={options.statuses}
            levels={options.levels}
            batches={options.batches}
            filters={filters}
            total={sites.length}
            filtered={filteredSites.length}
            onChange={handleChange}
            onReset={handleReset}
          />
        </div>

        <div className="flex flex-col gap-6">
          <MapView sites={filteredSites} />

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">点位列表</h2>
                <p className="mt-1 text-sm text-slate-500">
                  筛选结果与地图同步，可继续进入单点详情查看研究字段与访问提示。
                </p>
              </div>
            </div>

            <SiteList sites={filteredSites} />
          </section>
        </div>
      </div>
    </div>
  );
}

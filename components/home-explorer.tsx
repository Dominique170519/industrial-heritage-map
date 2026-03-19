"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Site } from "@/types/site";
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

type FilterOptions = {
  cities: string[];
  types: string[];
  statuses: string[];
};

export default function HomeExplorer({
  sites,
  options,
}: {
  sites: Site[];
  options: FilterOptions;
}) {
  const [filters, setFilters] = useState({
    city: "",
    type: "",
    status: "",
  });

  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const byCity = !filters.city || site.city === filters.city;
      const byType = !filters.type || site.type === filters.type;
      const byStatus = !filters.status || site.status === filters.status;

      return byCity && byType && byStatus;
    });
  }, [filters, sites]);

  function handleChange(key: "city" | "type" | "status", value: string) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleReset() {
    setFilters({
      city: "",
      type: "",
      status: "",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Filters
        cities={options.cities}
        types={options.types}
        statuses={options.statuses}
        filters={filters}
        total={sites.length}
        filtered={filteredSites.length}
        onChange={handleChange}
        onReset={handleReset}
      />

      <MapView sites={filteredSites} />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">点位列表</h2>
            <p className="mt-1 text-sm text-slate-500">
              适合从地图快速定位后，再进入单点档案页查看。
            </p>
          </div>
        </div>

        <SiteList sites={filteredSites} />
      </section>
    </div>
  );
}

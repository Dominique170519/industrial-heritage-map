"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  areSiteMapBoundsEqual,
  buildLinkedSiteFilterOptions,
  buildSiteSearchParams,
  filterSites,
  filterSitesInBounds,
  getPrimarySiteImage,
  getSiteFacetCounts,
  getSiteMapRelationLevel,
  getSiteRegionStats,
  mergeSiteFilters,
  parseSiteFiltersFromSearchParams,
  sanitizeSiteFilters,
} from "@/lib/sites";
import type { Site, SiteFacetCounts, SiteFilterKey, SiteFilters, SiteMapBounds } from "@/types/site";
import Filters from "@/components/filters";

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[720px] items-center justify-center rounded-[32px] border border-slate-200 bg-white text-sm text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      地图加载中...
    </div>
  ),
});

const QUICK_CATEGORY_PRIORITY = ["钢铁工业", "铁路工业", "电力工业", "纺织工业", "机械制造", "食品工业"] as const;

function getTopCategoryStats(items: Site[], limit = 5) {
  const counts = new Map<string, number>();

  items.forEach((site) => {
    counts.set(site.category, (counts.get(site.category) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "zh-Hans-CN"))
    .slice(0, limit);
}

function getPrimaryInsight(items: Site[]) {
  if (items.length === 0) {
    return "当前筛选下暂无结果，可先清空条件或切换省份 / 类型继续探索。";
  }

  if (items.length === 1) {
    return "当前结果仅剩 1 处点位，适合直接查看其详细档案并沿关联路径继续浏览。";
  }

  const topRegion = getSiteRegionStats(items, 1)[0];
  const topCategory = getTopCategoryStats(items, 1)[0];

  if (topRegion && topCategory) {
    return `当前结果主要集中在${topRegion.value}，并以${topCategory.value}为主，可先从高频区域或类型切入。`;
  }

  if (topRegion) {
    return `当前结果主要集中在${topRegion.value}，可先锁定区域再继续缩小筛选。`;
  }

  if (topCategory) {
    return `当前结果以${topCategory.value}为主，可先围绕同类型点位做横向比较。`;
  }

  return "当前结果已同步到地图、列表与右侧面板，可继续点击点位或调整筛选。";
}

function buildExploreActions(selectedSite: Site | null, regionStats: Array<{ value: string; count: number }>, categoryStats: Array<{ value: string; count: number }>, filters: SiteFilters, facetCounts: SiteFacetCounts) {
  if (selectedSite) {
    const actions = [
      {
        label: `同类 · ${selectedSite.category}`,
        description: `查看同类型点位（${Math.max((facetCounts.categories[selectedSite.category] ?? 0) - 1, 0)} 处关联结果）`,
        key: "category" as SiteFilterKey,
        value: selectedSite.category,
      },
      {
        label: `同城 · ${selectedSite.primaryCity}`,
        description: `回到当前城市继续比较（${Math.max((facetCounts.cities[selectedSite.primaryCity] ?? 0) - 1, 0)} 处关联结果）`,
        key: "city" as SiteFilterKey,
        value: selectedSite.primaryCity,
      },
      {
        label: `同省 · ${selectedSite.provinceFull}`,
        description: `扩大到同省范围继续浏览（${Math.max((facetCounts.provinces[selectedSite.provinceFull] ?? 0) - 1, 0)} 处关联结果）`,
        key: "province" as SiteFilterKey,
        value: selectedSite.provinceFull,
      },
    ];

    return actions.filter((action, index) => {
      const count =
        action.key === "category"
          ? facetCounts.categories[action.value] ?? 0
          : action.key === "city"
            ? facetCounts.cities[action.value] ?? 0
            : facetCounts.provinces[action.value] ?? 0;

      return count > 1 || index === 0;
    });
  }

  const actions = [] as Array<{
    label: string;
    description: string;
    key: SiteFilterKey;
    value: string;
  }>;

  const activeRegion = regionStats[0];
  const activeCategory = categoryStats[0];

  if (activeRegion && filters.province !== activeRegion.value) {
    actions.push({
      label: `先看${activeRegion.value}`,
      description: `锁定当前高频地区，快速聚焦 ${activeRegion.count} 处结果。`,
      key: "province",
      value: activeRegion.value,
    });
  }

  if (activeCategory && filters.category !== activeCategory.value) {
    actions.push({
      label: `先看${activeCategory.value}`,
      description: `切到当前高频类型，继续比较 ${activeCategory.count} 处点位。`,
      key: "category",
      value: activeCategory.value,
    });
  }

  if (!filters.status && Object.entries(facetCounts.statuses).length > 0) {
    const topStatus = Object.entries(facetCounts.statuses)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "zh-Hans-CN"))[0];

    if (topStatus) {
      actions.push({
        label: `按${topStatus.value}看`,
        description: `用开放状态继续压缩结果，当前可得到 ${topStatus.count} 处点位。`,
        key: "status",
        value: topStatus.value,
      });
    }
  }

  return actions.slice(0, 3);
}

function MapOverviewOverlay({
  total,
  filtered,
  activeFilters,
  regions,
  activeProvince,
  isViewportOnly,
  isExpanded,
  onToggleExpanded,
  onToggleViewportOnly,
  onApplyProvince,
  onResetMap,
  onFitResults,
}: {
  total: number;
  filtered: number;
  activeFilters: Array<{ key: SiteFilterKey; value: string }>;
  regions: Array<{ value: string; count: number }>;
  activeProvince: string;
  isViewportOnly: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleViewportOnly: () => void;
  onApplyProvince: (province: string) => void;
  onResetMap: () => void;
  onFitResults: () => void;
}) {
  const filterSummary =
    activeFilters.length > 0 ? activeFilters.map((item) => item.value).join(" · ") : "还没有筛选条件，适合从常见地区或类型开始逛。";

  return (
    <div className={`site-map-overview ${isExpanded ? "is-expanded" : "is-collapsed"}`}>
      <button
        type="button"
        onClick={onToggleExpanded}
        className="site-map-overview__toggle"
        aria-expanded={isExpanded}
        aria-controls="site-map-overview-panel"
      >
        <span>
          <strong>地图概览</strong>
          <small>{isExpanded ? "收起" : "查看概览"}</small>
        </span>
        <span className="site-map-overview__toggle-icon" aria-hidden="true">
          {isExpanded ? "−" : "+"}
        </span>
      </button>

      {isExpanded ? (
        <div id="site-map-overview-panel" className="site-map-overview__panel">
          <div className="site-map-overview__stats">
            <div className="site-map-overview__stat-card">
              <span>全国收录</span>
              <strong>{total}</strong>
            </div>
            <div className="site-map-overview__stat-card is-emphasis">
              <span>{isViewportOnly ? "当前视野" : "当前结果"}</span>
              <strong>{filtered}</strong>
            </div>
          </div>

          <div className="site-map-overview__section">
            <p className="site-map-overview__label">已启用筛选</p>
            <p className="site-map-overview__summary">{filterSummary}</p>
          </div>

          {regions.length > 0 ? (
            <div className="site-map-overview__section">
              <p className="site-map-overview__label">热门地区</p>
              <div className="site-map-overview__chips" aria-label="热门地区">
                {regions.map((region) => {
                  const isActive = activeProvince === region.value;

                  return (
                    <button
                      key={region.value}
                      type="button"
                      onClick={() => onApplyProvince(isActive ? "" : region.value)}
                      className={`site-map-stat-chip ${isActive ? "is-active" : ""}`}
                    >
                      <span>{region.value}</span>
                      <strong>{region.count}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="site-map-overview__actions">
            <button
              type="button"
              onClick={onToggleViewportOnly}
              className={`site-map-control-button ${isViewportOnly ? "is-active" : ""}`}
            >
              {isViewportOnly ? "只看当前视野 · 开" : "只看当前视野"}
            </button>
            <button type="button" onClick={onFitResults} className="site-map-control-button">
              定位结果
            </button>
            <button type="button" onClick={onResetMap} className="site-map-control-button">
              重置地图
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExploreIntro({
  visibleCount,
  totalCount,
  hasActiveFilters,
  onReset,
}: {
  visibleCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="site-workspace-rail__header">
      <p className="site-workspace-rail__eyebrow">Start here</p>
      <h2 className="site-workspace-rail__title">开始探索</h2>
      <p className="site-workspace-rail__description">
        先从地区、类型或关键词切入，地图和右侧发现会跟着一起更新。
      </p>
      <div className="site-workspace-rail__summary">
        <strong>找到 {visibleCount} 个点位</strong>
        <span>共收录 {totalCount} 处工业遗产</span>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="site-workspace-rail__reset"
        disabled={!hasActiveFilters}
      >
        清空筛选
      </button>
    </div>
  );
}

function ActiveFilterBadges({
  filters,
  onClear,
  emptyText = "当前还没有筛选条件，可先从地区、类型或开放状态开始。",
}: {
  filters: Record<string, string>;
  onClear: (key: SiteFilterKey) => void;
  emptyText?: string;
}) {
  const entries = (Object.entries(filters) as [SiteFilterKey, string][]).filter(([, value]) => value.trim());

  if (entries.length === 0) {
    return <p className="site-workspace-inspector__muted">{emptyText}</p>;
  }

  return (
    <div className="site-workspace-badges">
      {entries.map(([key, value]) => (
        <button key={`${key}-${value}`} type="button" onClick={() => onClear(key)} className="site-workspace-badge">
          <span>{value}</span>
          <strong>×</strong>
        </button>
      ))}
    </div>
  );
}

function WorkspaceInspector({
  sites,
  selectedSite,
  filters,
  visibleCount,
  totalCount,
  requestedSiteId,
  regionStats,
  categoryStats,
  facetCounts,
  onSelectSite,
  onClearFilter,
  onApplyFilter,
}: {
  sites: Site[];
  selectedSite: Site | null;
  filters: Record<SiteFilterKey, string>;
  visibleCount: number;
  totalCount: number;
  requestedSiteId: string;
  regionStats: Array<{ value: string; count: number }>;
  categoryStats: Array<{ value: string; count: number }>;
  facetCounts: SiteFacetCounts;
  onSelectSite: (siteId: string | null) => void;
  onClearFilter: (key: SiteFilterKey) => void;
  onApplyFilter: (key: SiteFilterKey, value: string) => void;
}) {
  const previewSites = useMemo(() => {
    if (selectedSite || sites.length === 0) {
      return [] as Site[];
    }

    return sites.slice(0, 6);
  }, [selectedSite, sites]);

  const relatedSites = useMemo(() => {
    if (!selectedSite) {
      return [] as Array<{ site: Site; relation: ReturnType<typeof getSiteMapRelationLevel> }>;
    }

    return sites
      .filter((site) => site.id !== selectedSite.id)
      .map((site) => ({ site, relation: getSiteMapRelationLevel(selectedSite, site) }))
      .filter((item) => item.relation !== "dimmed")
      .sort((a, b) => {
        const order = ["same-city", "same-province", "same-category"];
        return order.indexOf(a.relation) - order.indexOf(b.relation);
      })
      .slice(0, 5);
  }, [selectedSite, sites]);

  const insightText = useMemo(() => getPrimaryInsight(sites), [sites]);
  const exploreActions = useMemo(
    () => buildExploreActions(selectedSite, regionStats, categoryStats, filters, facetCounts),
    [categoryStats, facetCounts, filters, regionStats, selectedSite],
  );

  if (!selectedSite) {
    return (
      <aside className="site-workspace-inspector">
        <div className="site-workspace-inspector__section">
          <p className="site-workspace-inspector__eyebrow">This trip</p>
          <h2 className="site-workspace-inspector__title">本次发现</h2>
          <p className="site-workspace-inspector__muted">
            这次一共看到 <strong>{visibleCount}</strong> / {totalCount} 处点位。
            {requestedSiteId ? " 当前链接带了一个点位，但它暂时不在这组结果里。" : " 可以点地图、点地区，或者从右侧建议继续看看。"}
          </p>
          <div className="site-workspace-inspector__highlight">{insightText}</div>
        </div>

        <div className="site-workspace-inspector__section">
          <h3 className="site-workspace-inspector__heading">当前筛选</h3>
          <ActiveFilterBadges
            filters={filters}
            onClear={onClearFilter}
            emptyText="还没有加筛选条件，先从地区、类型或开放状态开始逛也可以。"
          />
        </div>

        <div className="site-workspace-inspector__section">
          <div className="site-workspace-inspector__row">
            <h3 className="site-workspace-inspector__heading">热门地区</h3>
            <span className="site-workspace-inspector__meta">Top {regionStats.length}</span>
          </div>
          {regionStats.length > 0 ? (
            <div className="site-workspace-inspector__metric-list">
              {regionStats.map((region) => (
                <button
                  key={region.value}
                  type="button"
                  onClick={() => onApplyFilter("province", filters.province === region.value ? "" : region.value)}
                  className={`site-workspace-inspector__metric-item ${filters.province === region.value ? "is-active" : ""}`}
                >
                  <span>{region.value}</span>
                  <strong>{region.count}</strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="site-workspace-inspector__muted">当前结果还不足以形成明显的地区分布。</p>
          )}
        </div>

        <div className="site-workspace-inspector__section">
          <div className="site-workspace-inspector__row">
            <h3 className="site-workspace-inspector__heading">热门类型</h3>
            <span className="site-workspace-inspector__meta">Top {categoryStats.length}</span>
          </div>
          {categoryStats.length > 0 ? (
            <div className="site-workspace-inspector__metric-list">
              {categoryStats.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => onApplyFilter("category", filters.category === category.value ? "" : category.value)}
                  className={`site-workspace-inspector__metric-item ${filters.category === category.value ? "is-active" : ""}`}
                >
                  <span>{category.value}</span>
                  <strong>{category.count}</strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="site-workspace-inspector__muted">当前结果还不足以形成明显的类型分布。</p>
          )}
        </div>

        <div className="site-workspace-inspector__section">
          <div className="site-workspace-inspector__row">
            <h3 className="site-workspace-inspector__heading">接着逛</h3>
            <span className="site-workspace-inspector__meta">{exploreActions.length} 条</span>
          </div>
          {exploreActions.length > 0 ? (
            <div className="site-workspace-guide-list">
              {exploreActions.map((action) => (
                <button
                  key={`${action.key}-${action.value}`}
                  type="button"
                  onClick={() => onApplyFilter(action.key, action.value)}
                  className="site-workspace-guide-item"
                >
                  <span className="site-workspace-guide-item__label">{action.label}</span>
                  <span className="site-workspace-guide-item__description">{action.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="site-workspace-inspector__muted">这组结果已经比较集中，可以直接点开点位看看。</p>
          )}
        </div>

        <div className="site-workspace-inspector__section">
          <div className="site-workspace-inspector__row">
            <h3 className="site-workspace-inspector__heading">先看这些</h3>
            <span className="site-workspace-inspector__meta">Top {Math.min(previewSites.length, 6)}</span>
          </div>
          <div className="site-workspace-result-list">
            {previewSites.length > 0 ? (
              previewSites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => onSelectSite(site.id)}
                  className="site-workspace-result-item"
                >
                  <span className="site-workspace-result-item__name">{site.name}</span>
                  <span className="site-workspace-result-item__meta">
                    {site.primaryCity} · {site.category}
                  </span>
                </button>
              ))
            ) : (
              <p className="site-workspace-inspector__muted">当前没有可预览的点位。</p>
            )}
          </div>
        </div>
      </aside>
    );
  }

  const image = getPrimarySiteImage(selectedSite);

  return (
    <aside className="site-workspace-inspector">
      <div className="site-workspace-inspector__section">
        <p className="site-workspace-inspector__eyebrow">Now viewing</p>
        <div className="site-workspace-site-card">
          <div className="site-workspace-site-card__image-shell">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.alt ?? selectedSite.name}
              className="site-workspace-site-card__image"
            />
          </div>
          <div className="site-workspace-site-card__body">
            <div className="site-workspace-site-card__tags">
              <span className="site-workspace-site-card__status">{selectedSite.status}</span>
              <span className="site-workspace-site-card__category">{selectedSite.category}</span>
              {selectedSite.level ? <span className="site-workspace-site-card__category">{selectedSite.level}</span> : null}
            </div>
            <h2 className="site-workspace-site-card__title">{selectedSite.name}</h2>
            <p className="site-workspace-site-card__meta">
              {selectedSite.provinceFull} · {selectedSite.primaryCity}
              {selectedSite.district ? ` · ${selectedSite.district}` : ""}
            </p>
            <p className="site-workspace-site-card__description">{selectedSite.description}</p>
            <div className="site-workspace-site-card__actions">
              <Link href={`/sites/${selectedSite.id}`} className="site-workspace-primary-link">
                去看看完整档案
              </Link>
              <button type="button" onClick={() => onSelectSite(null)} className="site-workspace-secondary-link">
                回到本次发现
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="site-workspace-inspector__section">
        <div className="site-workspace-inspector__row">
          <h3 className="site-workspace-inspector__heading">接着逛</h3>
          <span className="site-workspace-inspector__meta">{exploreActions.length} 条</span>
        </div>
        {exploreActions.length > 0 ? (
          <div className="site-workspace-guide-list">
            {exploreActions.map((action) => (
              <button
                key={`${action.key}-${action.value}`}
                type="button"
                onClick={() => onApplyFilter(action.key, action.value)}
                className="site-workspace-guide-item"
              >
                <span className="site-workspace-guide-item__label">{action.label}</span>
                <span className="site-workspace-guide-item__description">{action.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="site-workspace-inspector__muted">当前结果里暂无更宽的延展路径，可先返回本次发现或重置部分筛选。</p>
        )}
      </div>

      <div className="site-workspace-inspector__section">
        <div className="site-workspace-inspector__row">
          <h3 className="site-workspace-inspector__heading">附近关联</h3>
          <span className="site-workspace-inspector__meta">{relatedSites.length} 条</span>
        </div>
        <div className="site-workspace-related-list">
          {relatedSites.length > 0 ? (
            relatedSites.map(({ site, relation }) => (
              <button
                key={site.id}
                type="button"
                onClick={() => onSelectSite(site.id)}
                className="site-workspace-related-item"
              >
                <span className={`site-workspace-related-item__relation is-${relation}`}>
                  {relation === "same-city"
                    ? "同城"
                    : relation === "same-province"
                      ? "同省"
                      : "同类"}
                </span>
                <div>
                  <p className="site-workspace-related-item__name">{site.name}</p>
                  <p className="site-workspace-related-item__meta">
                    {site.primaryCity} · {site.category}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="site-workspace-inspector__muted">当前结果中没有更近的关联点位。</p>
          )}
        </div>
      </div>
    </aside>
  );
}

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
  const [isViewportOnly, setIsViewportOnly] = useState(false);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [viewportBounds, setViewportBounds] = useState<SiteMapBounds | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [fitResultsSignal, setFitResultsSignal] = useState(0);
  const [boundsSyncSignal, setBoundsSyncSignal] = useState(0);

  const filteredSites = useMemo(() => filterSites(sites, filters), [filters, sites]);
  const visibleSites = useMemo(
    () => (isViewportOnly ? filterSitesInBounds(filteredSites, viewportBounds) : filteredSites),
    [filteredSites, isViewportOnly, viewportBounds],
  );
  const linkedOptions = useMemo(() => buildLinkedSiteFilterOptions(sites, filters), [filters, sites]);
  const facetCounts = useMemo(() => getSiteFacetCounts(sites, filters), [filters, sites]);
  const filterOptions = useMemo(
    () => ({
      provinces: linkedOptions.provinces.map((option) => ({
        ...option,
        count: facetCounts.provinces[option.value] ?? 0,
        disabled: (facetCounts.provinces[option.value] ?? 0) === 0,
      })),
      cities: linkedOptions.cities.map((option) => ({
        ...option,
        count: facetCounts.cities[option.value] ?? 0,
        disabled: (facetCounts.cities[option.value] ?? 0) === 0,
      })),
      categories: linkedOptions.categories.map((option) => ({
        ...option,
        count: facetCounts.categories[option.value] ?? 0,
        disabled: (facetCounts.categories[option.value] ?? 0) === 0,
      })),
      statuses: linkedOptions.statuses.map((option) => ({
        ...option,
        count: facetCounts.statuses[option.value] ?? 0,
        disabled: (facetCounts.statuses[option.value] ?? 0) === 0,
      })),
      levels: linkedOptions.levels.map((option) => ({
        ...option,
        count: facetCounts.levels[option.value] ?? 0,
        disabled: (facetCounts.levels[option.value] ?? 0) === 0,
      })),
      batches: linkedOptions.batches.map((option) => ({
        ...option,
        count: facetCounts.batches[option.value] ?? 0,
        disabled: (facetCounts.batches[option.value] ?? 0) === 0,
      })),
    }),
    [facetCounts, linkedOptions],
  );
  const regionStats = useMemo(() => getSiteRegionStats(visibleSites), [visibleSites]);
  const categoryStats = useMemo(() => getTopCategoryStats(visibleSites), [visibleSites]);
  const requestedSiteId = searchParams.get("site")?.trim() ?? "";
  const requestedSiteIdInResults =
    requestedSiteId && visibleSites.some((site) => site.id === requestedSiteId) ? requestedSiteId : null;
  const selectedSiteIdInResults =
    selectedSiteId && visibleSites.some((site) => site.id === selectedSiteId) ? selectedSiteId : null;
  const hoveredSiteIdInResults =
    hoveredSiteId && visibleSites.some((site) => site.id === hoveredSiteId) ? hoveredSiteId : null;
  const effectiveSelectedSiteId = selectedSiteIdInResults ?? requestedSiteIdInResults ?? null;
  const effectiveSelectedSite =
    effectiveSelectedSiteId ? visibleSites.find((site) => site.id === effectiveSelectedSiteId) ?? null : null;
  const quickCategories = useMemo(
    () => QUICK_CATEGORY_PRIORITY.filter((category) => sites.some((site) => site.category === category)),
    [sites],
  );
  const activeFilterEntries = useMemo(
    () =>
      (Object.entries(filters) as [SiteFilterKey, string][])
        .filter(([, value]) => value.trim())
        .map(([key, value]) => ({ key, value })),
    [filters],
  );

  const handleBoundsChange = useCallback((bounds: SiteMapBounds | null) => {
    if (!isViewportOnly) {
      return;
    }

    setViewportBounds((previousBounds) =>
      areSiteMapBoundsEqual(previousBounds, bounds) ? previousBounds : bounds,
    );
  }, [isViewportOnly]);

  function handleChange(key: SiteFilterKey, value: string) {
    const nextFilters = mergeSiteFilters(filters, key, value);
    const nextLinkedOptions = buildLinkedSiteFilterOptions(sites, nextFilters);
    const sanitizedFilters = sanitizeSiteFilters(nextFilters, nextLinkedOptions);
    const nextQuery = buildSiteSearchParams(sanitizedFilters).toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  function handleReset() {
    setSelectedSiteId(null);
    router.replace(pathname, { scroll: false });
  }

  function handleSelectSite(siteId: string | null) {
    setSelectedSiteId(siteId);
  }

  function handleHoverSite(siteId: string | null) {
    setHoveredSiteId(siteId);
  }

  function handleApplyProvinceChip(province: string) {
    handleChange("province", province);
  }

  function handleToggleViewportOnly() {
    setIsViewportOnly((current) => {
      const nextValue = !current;
      if (nextValue) {
        setBoundsSyncSignal((signal) => signal + 1);
      }
      return nextValue;
    });
  }

  function handleResetMap() {
    setResetSignal((current) => current + 1);
  }

  function handleFitResults() {
    setFitResultsSignal((current) => current + 1);
  }

  return (
    <section
      id="map-explorer"
      className="site-workspace-panel scroll-mt-4 px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8"
    >
      <div className="site-workspace-frame">
        <div className="site-workspace-shell">
          <div className="site-workspace-rail site-workspace-rail--filters">
            <ExploreIntro
              visibleCount={visibleSites.length}
              totalCount={sites.length}
              hasActiveFilters={activeFilterEntries.length > 0}
              onReset={handleReset}
            />
            <Filters
              provinces={filterOptions.provinces}
              cities={filterOptions.cities}
              categories={filterOptions.categories}
              statuses={filterOptions.statuses}
              levels={filterOptions.levels}
              batches={filterOptions.batches}
              filters={filters}
              onChange={handleChange}
              className="site-workspace-filters"
            />
          </div>

          <div className="site-workspace-map-column">
            <div className="site-workspace-map-header">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Map Explorer</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                  工业遗产地图
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  从地图上找地方、看分布、切换筛选，再把感兴趣的点位留给右侧继续细看。
                </p>
              </div>
              <div className="site-workspace-map-header__summary">
                <span>{isViewportOnly ? "当前视野" : "当前结果"}</span>
                <strong>{visibleSites.length}</strong>
                <small>/ {sites.length}</small>
              </div>
            </div>

            <div className="site-workspace-map-stage">
              <MapOverviewOverlay
                total={sites.length}
                filtered={visibleSites.length}
                activeFilters={activeFilterEntries}
                regions={regionStats}
                activeProvince={filters.province}
                isViewportOnly={isViewportOnly}
                isExpanded={isOverviewExpanded}
                onToggleExpanded={() => setIsOverviewExpanded((current) => !current)}
                onToggleViewportOnly={handleToggleViewportOnly}
                onApplyProvince={handleApplyProvinceChip}
                onResetMap={handleResetMap}
                onFitResults={handleFitResults}
              />
              <MapView
                sites={filteredSites}
                selectedSiteId={effectiveSelectedSiteId}
                hoveredSiteId={hoveredSiteIdInResults}
                onSelectSite={handleSelectSite}
                onHoverSite={handleHoverSite}
                onBoundsChange={handleBoundsChange}
                boundsSyncSignal={boundsSyncSignal}
                resetSignal={resetSignal}
                fitResultsSignal={fitResultsSignal}
                quickCategories={quickCategories}
                activeCategory={filters.category}
                onApplyCategory={(category) => handleChange("category", category)}
              />
            </div>
          </div>

          <WorkspaceInspector
            sites={visibleSites}
            selectedSite={effectiveSelectedSite}
            filters={filters}
            visibleCount={visibleSites.length}
            totalCount={sites.length}
            requestedSiteId={requestedSiteId}
            regionStats={regionStats}
            categoryStats={categoryStats}
            facetCounts={facetCounts}
            onSelectSite={handleSelectSite}
            onClearFilter={(key) => handleChange(key, "")}
            onApplyFilter={handleChange}
          />
        </div>
      </div>
    </section>
  );
}

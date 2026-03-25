"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  areSiteMapBoundsEqual,
  buildExplorationRoute,
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
import type {
  ExplorationRoute,
  Site,
  SiteFacetCounts,
  SiteFilterKey,
  SiteFilters,
  SiteMapBounds,
} from "@/types/site";
import type { AIRouteResult } from "@/types/ai-explore";
import Filters from "@/components/filters";

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
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
    return "没有符合条件的点位，试试换一个筛选条件。";
  }

  if (items.length === 1) {
    return "只剩这一处了——值得深入看看它的完整档案。";
  }

  const topRegion = getSiteRegionStats(items, 1)[0];
  const topCategory = getTopCategoryStats(items, 1)[0];

  if (topRegion && topCategory) {
    return `${topRegion.value}最集中，${topCategory.value}占了大多数，从这里切入不会错。`;
  }

  if (topRegion) {
    return `大部分点位都在${topRegion.value}，可以专注这个区域来缩小范围。`;
  }

  if (topCategory) {
    return `这一批里${topCategory.value}最多，适合做横向比较。`;
  }

  return "结果已经显示在地图和下方列表里了，往下滑看看。";
}

function getRouteInsight(route: ExplorationRoute | null, items: Site[]) {
  if (!route) {
    return "";
  }

  const routeSites = route.stops.map((stop) => stop.site);
  const topRegion = getSiteRegionStats(routeSites, 1)[0];
  const topCategory = getTopCategoryStats(routeSites, 1)[0];
  const uniqueCities = new Set(routeSites.map((site) => site.primaryCity)).size;
  const uniqueProvinces = new Set(routeSites.map((site) => site.provinceFull)).size;
  const resultShare = items.length > 0 ? Math.round((routeSites.length / items.length) * 100) : 0;

  if (uniqueCities === 1) {
    return `路线集中在${routeSites[0]?.primaryCity}，串起 ${routeSites.length} 个点位，同城工业遗产一网打尽。`;
  }

  if (uniqueProvinces === 1) {
    return `跨越 ${uniqueCities} 城，以${topCategory?.value ?? "工业遗产"}为主，是一条顺路的区域探索。`;
  }

  return `横跨 ${uniqueProvinces} 省 ${uniqueCities} 城的远途路线，抓住了当前结果中约 ${resultShare}% 的精华。`;
}

function buildExploreActions(selectedSite: Site | null, regionStats: Array<{ value: string; count: number }>, categoryStats: Array<{ value: string; count: number }>, filters: SiteFilters, facetCounts: SiteFacetCounts) {
  if (selectedSite) {
    const actions = [
      {
        label: `${selectedSite.category}还有`,
        description: `${Math.max((facetCounts.categories[selectedSite.category] ?? 0) - 1, 0)} 处同类遗产可比较`,
        key: "category" as SiteFilterKey,
        value: selectedSite.category,
      },
      {
        label: `${selectedSite.primaryCity}同城`,
        description: `${Math.max((facetCounts.cities[selectedSite.primaryCity] ?? 0) - 1, 0)} 处同城市点位可比较`,
        key: "city" as SiteFilterKey,
        value: selectedSite.primaryCity,
      },
      {
        label: `${selectedSite.provinceFull}同省`,
        description: `${Math.max((facetCounts.provinces[selectedSite.provinceFull] ?? 0) - 1, 0)} 处同省点位可比较`,
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
      label: `去${activeRegion.value}看看`,
      description: `${activeRegion.count} 处遗产集中在那里，一键聚焦。`,
      key: "province",
      value: activeRegion.value,
    });
  }

  if (activeCategory && filters.category !== activeCategory.value) {
    actions.push({
      label: `${activeCategory.value}有哪些`,
      description: `${activeCategory.count} 处${activeCategory.value}遗产可以比较。`,
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
        label: `只看${topStatus.value}`,
        description: `${topStatus.count} 处${topStatus.value}遗产值得优先关注。`,
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
      <p className="site-workspace-rail__eyebrow">Start exploring</p>
      <h2 className="site-workspace-rail__title">出发吧</h2>
      <p className="site-workspace-rail__description">
        选一个省份、一种类型，或者随手搜个词，看看地图上藏着什么。
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
        重置
      </button>
    </div>
  );
}

function RoutePlanner({
  route,
  resultCount,
  canGenerateRoute,
  onToggleRoute,
}: {
  route: ExplorationRoute | null;
  resultCount: number;
  canGenerateRoute: boolean;
  onToggleRoute: () => void;
}) {
  return (
    <section className="site-workspace-route-panel">
      <div className="site-workspace-route-panel__header">
        <div>
          <p className="site-workspace-route-panel__eyebrow">Plan your route</p>
          <h3 className="site-workspace-route-panel__title">规划一条路线</h3>
        </div>
        <span className="site-workspace-route-panel__meta">{route ? `${route.stops.length} 站` : `${resultCount} 个候选`}</span>
      </div>

      <p className="site-workspace-route-panel__description">
        挑几个感兴趣的地方，让地图帮你串成一条顺路的探索路径。
      </p>

      <button
        type="button"
        onClick={onToggleRoute}
        className={`site-workspace-route-panel__action ${route ? "is-secondary" : ""}`}
        disabled={!route && !canGenerateRoute}
      >
        {route ? "重新来过" : "生成路线"}
      </button>

      {!canGenerateRoute && !route ? (
        <p className="site-workspace-route-panel__hint">先挑 2 个点位试试看。</p>
      ) : null}

      {route ? <p className="site-workspace-route-panel__hint">路线详情已移到右侧面板，可在那里继续逐站浏览。</p> : null}
    </section>
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
  activeRoute,
  routeInsight,
  onSelectSite,
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
  activeRoute: ExplorationRoute | null;
  routeInsight: string;
  onSelectSite: (siteId: string | null) => void;
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
          <p className="site-workspace-inspector__eyebrow">Field notes</p>
          <h2 className="site-workspace-inspector__title">本次发现</h2>
          <p className="site-workspace-inspector__muted">
            <strong>{visibleCount}</strong> / {totalCount} 处点位。
            {requestedSiteId ? " 链接里的那一处暂时不在当前结果中。" : " 点地图、点地区热区，或者直接翻下方的推荐继续逛。"}
          </p>
          <div className="site-workspace-inspector__highlight">{insightText}</div>
        </div>

        <div className="site-workspace-inspector__section">
          <div className="site-workspace-inspector__row">
            <h3 className="site-workspace-inspector__heading">都在哪</h3>
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
            <h3 className="site-workspace-inspector__heading">都是什么</h3>
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
            <h3 className="site-workspace-inspector__heading">继续探索</h3>
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
            <h3 className="site-workspace-inspector__heading">这条路线</h3>
            <span className="site-workspace-inspector__meta">{activeRoute ? `${activeRoute.stops.length} 站` : "未生成"}</span>
          </div>
          {activeRoute ? (
            <>
              <p className="site-workspace-inspector__muted site-workspace-inspector__muted--compact">{routeInsight}</p>
              <div className="site-workspace-route-list">
                {activeRoute.stops.map((stop) => (
                  <button
                    key={stop.site.id}
                    type="button"
                    onClick={() => onSelectSite(stop.site.id)}
                    className="site-workspace-route-item"
                  >
                    <span className="site-workspace-route-item__order">{stop.order}</span>
                    <div className="site-workspace-route-item__body">
                      <p className="site-workspace-route-item__name">{stop.site.name}</p>
                      <p className="site-workspace-route-item__meta">
                        {stop.site.primaryCity} · {stop.site.category}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="site-workspace-inspector__muted">路线入口在左侧，先筛选再规划。</p>
          )}
        </div>

        <div className="site-workspace-inspector__section">
          <div className="site-workspace-inspector__row">
            <h3 className="site-workspace-inspector__heading">随手翻翻</h3>
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
  const hasRealImage = image.url !== "/covers/factory-default.svg";

  return (
    <aside className="site-workspace-inspector">
      <div className="site-workspace-inspector__section">
        <p className="site-workspace-inspector__eyebrow">Spotlight</p>
        <div className="site-workspace-site-card">
          {hasRealImage ? (
            <div className="site-workspace-site-card__image-shell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt ?? selectedSite.name}
                className="site-workspace-site-card__image"
              />
            </div>
          ) : null}
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
                查看完整档案
              </Link>
              <button type="button" onClick={() => onSelectSite(null)} className="site-workspace-secondary-link">
                返回
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="site-workspace-inspector__section">
        <div className="site-workspace-inspector__row">
          <h3 className="site-workspace-inspector__heading">继续探索</h3>
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
          <p className="site-workspace-inspector__muted">当前结果里没有更多扩展路径了，可以直接看档案或返回。</p>
        )}
      </div>

      <div className="site-workspace-inspector__section">
        <div className="site-workspace-inspector__row">
          <h3 className="site-workspace-inspector__heading">路线一览</h3>
          <span className="site-workspace-inspector__meta">{activeRoute ? `${activeRoute.stops.length} 站` : "未生成"}</span>
        </div>
        {activeRoute ? (
          <>
            <p className="site-workspace-inspector__muted site-workspace-inspector__muted--compact">{routeInsight}</p>
            <div className="site-workspace-route-list">
              {activeRoute.stops.map((stop) => {
                const isActive = stop.site.id === selectedSite.id;

                return (
                  <button
                    key={stop.site.id}
                    type="button"
                    onClick={() => onSelectSite(stop.site.id)}
                    className={`site-workspace-route-item ${isActive ? "is-active" : ""}`}
                  >
                    <span className="site-workspace-route-item__order">{stop.order}</span>
                    <div className="site-workspace-route-item__body">
                      <p className="site-workspace-route-item__name">{stop.site.name}</p>
                      <p className="site-workspace-route-item__meta">
                        {stop.site.primaryCity} · {stop.site.category}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="site-workspace-inspector__muted">路线入口在左侧，先筛选再规划。</p>
        )}
      </div>

      <div className="site-workspace-inspector__section">
        <div className="site-workspace-inspector__row">
          <h3 className="site-workspace-inspector__heading">附近还有</h3>
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
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<SiteMapBounds | null>(null);
  const [storedRoute, setStoredRoute] = useState<ExplorationRoute | null>(null);
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
  const canGenerateRoute = filteredSites.length >= 2;
  const activeRoute = useMemo(() => {
    if (!storedRoute) {
      return null;
    }

    const nextSiteIds = new Set(filteredSites.map((site) => site.id));
    return storedRoute.siteIds.every((siteId) => nextSiteIds.has(siteId)) ? storedRoute : null;
  }, [filteredSites, storedRoute]);
  const routeInsight = useMemo(() => getRouteInsight(activeRoute, filteredSites), [activeRoute, filteredSites]);

  const handleBoundsChange = useCallback((bounds: SiteMapBounds | null) => {
    if (!isViewportOnly) {
      return;
    }

    setViewportBounds((previousBounds) =>
      areSiteMapBoundsEqual(previousBounds, bounds) ? previousBounds : bounds,
    );
  }, [isViewportOnly]);

  function handleChange(key: SiteFilterKey, value: string) {
    setStoredRoute(null);
    const nextFilters = mergeSiteFilters(filters, key, value);
    const nextLinkedOptions = buildLinkedSiteFilterOptions(sites, nextFilters);
    const sanitizedFilters = sanitizeSiteFilters(nextFilters, nextLinkedOptions);
    const nextQuery = buildSiteSearchParams(sanitizedFilters).toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  function handleReset() {
    setStoredRoute(null);
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

  function handleToggleRoute() {
    if (activeRoute) {
      setStoredRoute(null);
      return;
    }

    const nextRoute = buildExplorationRoute(filteredSites);
    if (!nextRoute) {
      return;
    }

    setStoredRoute(nextRoute);
    handleSelectSite(nextRoute.stops[0]?.site.id ?? null);
  }

  // ─── AI route from sessionStorage ────────────────────────────────────────
  const STORAGE_KEY = "ihm-ai-route-result";
  const AI_SESSION_KEY = "ihm-ai-route-active";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const isAiSession = sessionStorage.getItem(AI_SESSION_KEY) === "1";

      if (!raw || !isAiSession) return;

      const aiResult: AIRouteResult = JSON.parse(raw);

      if (!aiResult?.stops?.length) return;

      const route = buildExplorationRouteFromAi(aiResult, sites);
      if (!route) return;

      setStoredRoute(route);

      // Select the first AI site and scroll to map
      if (route.stops[0]) {
        handleSelectSite(route.stops[0].site.id);
      }

      // Clear sessionStorage so refresh doesn't re-trigger
      sessionStorage.removeItem(AI_SESSION_KEY);
    } catch {
      // sessionStorage may be unavailable or data corrupted — ignore
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildExplorationRouteFromAi(
    aiResult: AIRouteResult,
    allSites: Site[],
  ): ExplorationRoute | null {
    const siteMap = new Map(allSites.map((s) => [s.id, s]));
    const orderedSites: Site[] = [];

    for (const stop of aiResult.stops) {
      const site = siteMap.get(stop.siteId);
      if (site) {
        orderedSites.push(site);
      }
    }

    if (orderedSites.length === 0) return null;

    return {
      stops: orderedSites.map((site, index) => ({ order: index + 1, site })),
      siteIds: orderedSites.map((s) => s.id),
      coordinates: orderedSites.map((s) => [s.lat, s.lng] as [number, number]),
      isAiRoute: true,
    };
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
            <RoutePlanner
              route={activeRoute}
              resultCount={filteredSites.length}
              canGenerateRoute={canGenerateRoute}
              onToggleRoute={handleToggleRoute}
            />
          </div>

          <div className="site-workspace-map-column">
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
                activeRoute={activeRoute}
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
            activeRoute={activeRoute}
            routeInsight={routeInsight}
            onSelectSite={handleSelectSite}
            onApplyFilter={handleChange}
          />
        </div>
      </div>
    </section>
  );
}

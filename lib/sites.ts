import type { ReadonlyURLSearchParams } from "next/navigation";
import rawSites from "@/data/sites.json";
import {
  SITE_CATEGORIES,
  SITE_FILTER_KEYS,
  SITE_STATUSES,
  type LinkedSiteFilterKey,
  type RawSiteRecord,
  type Site,
  type SiteCategory,
  type SiteFilterKey,
  type SiteFilterOptions,
  type SiteFilters,
  type SiteImage,
  type SiteStatus,
} from "@/types/site";

const DEFAULT_IMAGE_URL = "/covers/factory-default.svg";
const DEFAULT_PROVINCE = "未知省份";
const DEFAULT_CITY = "未知城市";
const SPLIT_PATTERN = /[\/、，,；;｜|]+/;

const sites = sortSites(normalizeSites(rawSites as RawSiteRecord[]));

export type SiteStatusGroup =
  | "adaptive-reuse"
  | "observable"
  | "restricted"
  | "unknown";

export interface SiteMarkerTone {
  fill: string;
  stroke: string;
  ring: string;
  shadow: string;
}

const SITE_MARKER_TONES: Record<SiteStatusGroup, SiteMarkerTone> = {
  "adaptive-reuse": {
    fill: "#2f7f78",
    stroke: "#1f5b56",
    ring: "rgba(47, 127, 120, 0.22)",
    shadow: "rgba(25, 67, 62, 0.24)",
  },
  observable: {
    fill: "#425a70",
    stroke: "#263746",
    ring: "rgba(66, 90, 112, 0.22)",
    shadow: "rgba(20, 32, 44, 0.24)",
  },
  restricted: {
    fill: "#8a6957",
    stroke: "#61473a",
    ring: "rgba(138, 105, 87, 0.2)",
    shadow: "rgba(67, 46, 38, 0.22)",
  },
  unknown: {
    fill: "#78838f",
    stroke: "#505b67",
    ring: "rgba(120, 131, 143, 0.18)",
    shadow: "rgba(51, 65, 85, 0.18)",
  },
};

export function normalizeSite(raw: RawSiteRecord): Site {
  const category = normalizeCategory(raw.category ?? raw.type);
  const status = normalizeStatus(raw.status);
  const name = raw.name ?? "未命名点位";
  const province = normalizeText(raw.province) ?? DEFAULT_PROVINCE;
  const provinceFull = normalizeText(raw.provinceFull) ?? province;
  const city = normalizeText(raw.city) ?? DEFAULT_CITY;
  const primaryCity = normalizeText(raw.primaryCity) ?? city;
  const cityList = normalizeStringList(raw.cityList, [primaryCity]);
  const district = normalizeText(raw.district);
  const districtList = normalizeStringList(raw.districtList, district ? [district] : []);
  const level = normalizeOptionalText(raw.level);
  const batch = normalizeOptionalText(raw.batch);
  const era = normalizeEra(raw.era, raw.year);
  const description = raw.description ?? raw.summary;
  const historicalBackground = normalizeOptionalText(raw.historicalBackground) ?? normalizeOptionalText(description);
  const researchValue = normalizeOptionalText(raw.researchValue);
  const address = normalizeOptionalText(raw.address);
  const source = normalizeOptionalText(raw.source);
  const imageAlt = name ? `${name} 图片` : undefined;

  const site: Site = {
    id: raw.id ?? "",
    name,
    province,
    provinceFull,
    city,
    primaryCity,
    cityList,
    district,
    districtList,
    lat: Number(raw.lat ?? 0),
    lng: Number(raw.lng ?? 0),
    category,
    status,
    featured: Boolean(raw.featured),
    featuredOrder: normalizeFeaturedOrder(raw.featuredOrder),
    level,
    batch,
    era,
    description,
    historicalBackground,
    researchValue,
    address,
    source,
    images: normalizeImages(raw.images, raw.coverImage, imageAlt),
    visitAccess: normalizeOptionalText(raw.visitAccess),
    currentUse: normalizeOptionalText(raw.currentUse),
    visibleRemains: normalizeOptionalText(raw.visibleRemains),
    riskNote: normalizeOptionalText(raw.riskNote),
    searchText: "",
  };

  return {
    ...site,
    searchText: getSiteSearchText(site),
  };
}

export function normalizeSites(raw: RawSiteRecord[]): Site[] {
  return raw.map(normalizeSite);
}

export function sortSites(items: Site[]): Site[] {
  return items.slice().sort((a, b) => {
    const cityCompare = a.city.localeCompare(b.city, "zh-CN");
    if (cityCompare !== 0) return cityCompare;
    return a.name.localeCompare(b.name, "zh-CN");
  });
}

export function buildSiteFilterOptions(items: Site[]): SiteFilterOptions {
  return {
    provinces: uniqueSorted(items.map((site) => site.provinceFull)),
    cities: uniqueSorted(items.map((site) => site.primaryCity)),
    categories: uniqueSorted(items.map((site) => site.category)),
    statuses: uniqueSorted(items.map((site) => site.status)) as SiteStatus[],
    levels: uniqueSorted(items.map((site) => site.level ?? "")),
    batches: uniqueSorted(items.map((site) => site.batch ?? "")),
  };
}

export function buildLinkedSiteFilterOptions(items: Site[], filters: SiteFilters): SiteFilterOptions {
  return {
    provinces: getLinkedSiteFilterValues(items, filters, "province"),
    cities: getLinkedSiteFilterValues(items, filters, "city"),
    categories: getLinkedSiteFilterValues(items, filters, "category"),
    statuses: getLinkedSiteFilterValues(items, filters, "status") as SiteStatus[],
    levels: getLinkedSiteFilterValues(items, filters, "level"),
    batches: getLinkedSiteFilterValues(items, filters, "batch"),
  };
}

export function getSiteSearchText(site: Site): string {
  return [
    site.name,
    site.province,
    site.provinceFull,
    site.city,
    site.primaryCity,
    ...site.cityList,
    site.district,
    ...site.districtList,
    site.category,
    site.status,
    site.level,
    site.batch,
    site.description,
    site.historicalBackground,
    site.researchValue,
    site.address,
    site.era,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterSites(items: Site[], filters: SiteFilters): Site[] {
  const normalizedKeyword = filters.keyword.trim().toLowerCase();

  return items.filter((site) => {
    const byProvince = !filters.province || site.provinceFull === filters.province;
    const byCity = !filters.city || site.primaryCity === filters.city || site.cityList.includes(filters.city);
    const byCategory = !filters.category || site.category === filters.category;
    const byStatus = !filters.status || site.status === filters.status;
    const byLevel = !filters.level || site.level === filters.level;
    const byBatch = !filters.batch || site.batch === filters.batch;
    const byKeyword = !normalizedKeyword || site.searchText.includes(normalizedKeyword);

    return byProvince && byCity && byCategory && byStatus && byLevel && byBatch && byKeyword;
  });
}

export function parseSiteFiltersFromSearchParams(searchParams: URLSearchParams | ReadonlyURLSearchParams): SiteFilters {
  return SITE_FILTER_KEYS.reduce<SiteFilters>((filters, key) => {
    filters[key] = searchParams.get(key)?.trim() ?? "";
    return filters;
  }, createEmptySiteFilters());
}

export function buildSiteSearchParams(filters: SiteFilters): URLSearchParams {
  const searchParams = new URLSearchParams();

  SITE_FILTER_KEYS.forEach((key) => {
    const value = filters[key].trim();
    if (value) {
      searchParams.set(key, value);
    }
  });

  return searchParams;
}

export function createEmptySiteFilters(): SiteFilters {
  return SITE_FILTER_KEYS.reduce<SiteFilters>((filters, key) => {
    filters[key] = "";
    return filters;
  }, {} as SiteFilters);
}

export function mergeSiteFilters(
  filters: SiteFilters,
  key: SiteFilterKey,
  value: string,
): SiteFilters {
  if (key === "province") {
    return {
      ...filters,
      province: value,
      city: "",
    };
  }

  return {
    ...filters,
    [key]: value,
  };
}

export function sanitizeSiteFilters(filters: SiteFilters, options: SiteFilterOptions): SiteFilters {
  return {
    ...filters,
    province: sanitizeSiteFilterValue(filters.province, options.provinces),
    city: sanitizeSiteFilterValue(filters.city, options.cities),
    category: sanitizeSiteFilterValue(filters.category, options.categories),
    status: sanitizeSiteFilterValue(filters.status, options.statuses),
    level: sanitizeSiteFilterValue(filters.level, options.levels),
    batch: sanitizeSiteFilterValue(filters.batch, options.batches),
    keyword: filters.keyword,
  };
}

export function getFeaturedSites(): Site[] {
  return sites.filter((site) => site.featured).sort((a, b) => a.featuredOrder - b.featuredOrder);
}

export function getPrimarySiteImage(site: Site): SiteImage {
  return site.images?.[0] ?? { url: DEFAULT_IMAGE_URL, alt: site.name };
}

export function getSiteStatusGroup(site: Pick<Site, "status">): SiteStatusGroup {
  switch (site.status) {
    case "开放参观":
    case "预约参观":
      return "adaptive-reuse";
    case "外观可见":
      return "observable";
    case "暂不开放":
      return "restricted";
    default:
      return "unknown";
  }
}

export function getSiteMarkerTone(site: Pick<Site, "status">): SiteMarkerTone {
  return SITE_MARKER_TONES[getSiteStatusGroup(site)];
}

export function getAllSites(): Site[] {
  return sites;
}

export function getSiteById(id: string): Site | null {
  return sites.find((site) => site.id === id) ?? null;
}

export function getSiteFilterOptions(): SiteFilterOptions {
  return buildSiteFilterOptions(sites);
}

function normalizeText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  return normalizeText(value);
}

function normalizeStringList(value: string[] | string | undefined, fallback: string[]): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(SPLIT_PATTERN)
      : fallback;

  const normalized = Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeCategory(value: string | undefined): SiteCategory {
  if (value && SITE_CATEGORIES.includes(value as SiteCategory)) {
    return value as SiteCategory;
  }

  return "机械制造";
}

function normalizeStatus(value: string | undefined): SiteStatus {
  if (value && SITE_STATUSES.includes(value as SiteStatus)) {
    return value as SiteStatus;
  }

  return "状态未知";
}

function normalizeEra(era: string | undefined, year: number | undefined): string | undefined {
  if (era && era.trim()) {
    return era.trim();
  }

  if (typeof year === "number") {
    return String(year);
  }

  return undefined;
}

function normalizeFeaturedOrder(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function normalizeImages(
  images: SiteImage[] | undefined,
  coverImage: string | undefined,
  fallbackAlt: string | undefined,
): SiteImage[] {
  if (images?.length) {
    return images.map((image) => ({
      ...image,
      url: image.url || DEFAULT_IMAGE_URL,
      alt: image.alt ?? fallbackAlt,
    }));
  }

  return [
    {
      url: coverImage || DEFAULT_IMAGE_URL,
      alt: fallbackAlt,
    },
  ];
}

function getLinkedSiteFilterValues(items: Site[], filters: SiteFilters, key: LinkedSiteFilterKey): string[] {
  const scopedFilters = createScopedSiteFilters(filters, key);
  const filteredItems = filterSites(items, scopedFilters);

  switch (key) {
    case "province":
      return uniqueSorted(filteredItems.map((site) => site.provinceFull));
    case "city":
      return uniqueSorted(filteredItems.map((site) => site.primaryCity));
    case "category":
      return uniqueSorted(filteredItems.map((site) => site.category));
    case "status":
      return uniqueSorted(filteredItems.map((site) => site.status));
    case "level":
      return uniqueSorted(filteredItems.map((site) => site.level ?? ""));
    case "batch":
      return uniqueSorted(filteredItems.map((site) => site.batch ?? ""));
    default:
      return [];
  }
}

function createScopedSiteFilters(filters: SiteFilters, ignoredKey: LinkedSiteFilterKey): SiteFilters {
  const nextFilters = { ...filters };
  nextFilters[ignoredKey] = "";
  return nextFilters;
}

function sanitizeSiteFilterValue(value: string, options: string[]): string {
  return !value || options.includes(value) ? value : "";
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

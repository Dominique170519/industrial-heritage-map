import rawSites from "@/data/sites.json";
import {
  SITE_CATEGORIES,
  SITE_STATUSES,
  type RawSiteRecord,
  type Site,
  type SiteCategory,
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
    level,
    batch,
    era,
    description,
    address,
    source,
    images: normalizeImages(raw.images, raw.coverImage, imageAlt),
    visitAccess: normalizeOptionalText(raw.visitAccess),
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

export function getPrimarySiteImage(site: Site): SiteImage {
  return site.images?.[0] ?? { url: DEFAULT_IMAGE_URL, alt: site.name };
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

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

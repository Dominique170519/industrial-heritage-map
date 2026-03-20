export const SITE_STATUSES = [
  "开放参观",
  "预约参观",
  "外观可见",
  "暂不开放",
  "状态未知",
] as const;

export type SiteStatus = (typeof SITE_STATUSES)[number];

export const SITE_CATEGORIES = [
  "钢铁工业",
  "电子工业",
  "纺织工业",
  "电力工业",
  "船舶工业",
  "铁路工业",
  "食品工业",
  "机械制造",
  "罐头食品工业",
  "印刷工业",
  "其他工业",
  "有色金属",
] as const;

export type SiteCategory = (typeof SITE_CATEGORIES)[number];
export type SiteSource = string;

export interface SiteImage {
  url: string;
  alt?: string;
  source?: SiteSource;
}

export interface SiteRecord {
  id: string;
  name: string;
  province: string;
  provinceFull: string;
  city: string;
  primaryCity: string;
  cityList: string[];
  district?: string;
  districtList: string[];
  lat: number;
  lng: number;
  category: SiteCategory;
  status: SiteStatus;
  level?: string;
  batch?: string;
  era?: string;
  description?: string;
  address?: string;
  source?: SiteSource;
  images?: SiteImage[];
  visitAccess?: string;
  riskNote?: string;
  searchText: string;
}

export interface LegacySiteRecord {
  id: string;
  name: string;
  city: string;
  district?: string;
  type: string;
  status: SiteStatus;
  year?: number;
  lat: number;
  lng: number;
  coverImage?: string;
  summary?: string;
  address?: string;
  visitAccess?: string;
  riskNote?: string;
}

export type RawSiteRecord = Partial<SiteRecord> & Partial<LegacySiteRecord>;

export interface SiteFilters {
  province: string;
  city: string;
  category: string;
  status: string;
  level: string;
  batch: string;
  keyword: string;
}

export interface SiteFilterOptions {
  provinces: string[];
  cities: string[];
  categories: string[];
  statuses: SiteStatus[];
  levels: string[];
  batches: string[];
}

export type Site = SiteRecord;

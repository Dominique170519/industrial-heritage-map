export type SiteStatus =
  | "开放参观"
  | "预约参观"
  | "外观可见"
  | "暂不开放"
  | "状态未知";

export interface Site {
  id: string;
  name: string;
  city: string;
  district: string;
  type: string;
  status: SiteStatus;
  year: number;
  lat: number;
  lng: number;
  coverImage: string;
  summary: string;
  address: string;
  visitAccess: string;
  riskNote: string;
}

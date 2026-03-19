import rawSites from "@/data/sites.json";
import type { Site } from "@/types/site";

const sites = (rawSites as Site[]).slice().sort((a, b) => {
  const cityCompare = a.city.localeCompare(b.city, "zh-CN");
  if (cityCompare !== 0) return cityCompare;
  return a.name.localeCompare(b.name, "zh-CN");
});

export function getAllSites(): Site[] {
  return sites;
}

export function getSiteById(id: string): Site | null {
  return sites.find((site) => site.id === id) ?? null;
}

export function getSiteFilterOptions() {
  const cities = Array.from(new Set(sites.map((site) => site.city)));
  const types = Array.from(new Set(sites.map((site) => site.type)));
  const statuses = Array.from(new Set(sites.map((site) => site.status)));

  return {
    cities,
    types,
    statuses,
  };
}

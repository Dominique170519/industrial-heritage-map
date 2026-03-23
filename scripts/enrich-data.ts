/**
 * 工业遗产数据补全脚本 MVP
 * -----------------------------
 * 输入：data/sites.json
 * 输出：
 *   - data/enrichment_candidates.jsonl   ← 原始候选记录（JSONL）
 *   - data/review_queue.csv              ← 待人工复核队列
 *   - data/enriched_industrial_heritage.json  ← 已确认富化数据
 *
 * 流程：
 *   1. 分析字段结构
 *   2. 筛选无实图点位（SVG 占位 / aos-comment 已失效）
 *   3. 生成 Wikipedia/Wikimedia 搜索词
 *   4. 抓取摘要 + 候选图片
 *   5. 名称 + 省市匹配评分
 *   6. 写三个输出文件
 *
 * 用法：
 *   npx tsx scripts/enrich-data.ts [options]
 *
 *   --limit N       仅处理前 N 条（默认全部）
 *   --dry-run       仅分析，不请求网络
 *   --min-score N   最低匹配分才输出（默认 0）
 */

import fs from "fs";
import path from "path";
import { parseArgs } from "util";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteImage {
  url: string;
  alt: string;
}

interface Site {
  id: string;
  name: string;
  province: string;
  provinceFull?: string;
  city: string;
  primaryCity?: string;
  district?: string;
  lat: number;
  lng: number;
  category: string;
  status: string;
  era?: string;
  description?: string;
  images: SiteImage[];
  address?: string;
  source?: string;
  visitAccess?: string;
  riskNote?: string;
  level?: string;
  batch?: string;
  featured?: boolean;
  featuredOrder?: number;
  historicalBackground?: string;
  researchValue?: string;
  visibleRemains?: string;
  currentUse?: string;
  searchText?: string;
}

interface WikiCandidate {
  siteId: string;
  siteName: string;
  siteCity: string;
  siteProvince: string;
  siteCategory: string;
  searchTerm: string;
  wikiTitle: string | null;
  wikiUrl: string | null;
  imageUrl: string | null;
  imageThumbUrl: string | null;
  imagePageUrl: string | null;
  imageLicense: string;
  imageLicenseUrl: string;
  pageSummary: string | null;
  pageUrl: string | null;
  score: number;           // 0-100
  scoreBreakdown: {
    nameMatch: number;     // 0-40
    cityMatch: number;     // 0-30
    provinceMatch: number; // 0-15
    categoryHint: number;  // 0-15
  };
  reviewed: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  approved: boolean | null;
  reviewNote: string | null;
}

interface EnrichedOutput {
  generatedAt: string;
  totalSites: number;
  candidatesFound: number;
  highConfidenceCount: number; // score >= 70
  sites: (Site & { enrichment?: {
    wikiImage?: string;
    wikiImageThumb?: string;
    wikiImagePage?: string;
    wikiImageLicense?: string;
    wikiImageLicenseUrl?: string;
    wikiSummary?: string;
    wikiPageUrl?: string;
    enrichmentScore?: number;
    enrichmentSearchTerm?: string;
    enrichedAt: string;
  }})[];
}

// ─── Config ────────────────────────────────────────────────────────────────────

const DATA_DIR = path.resolve("data");
const SITES_FILE = path.join(DATA_DIR, "sites.json");
const OUTPUT_CANDIDATES = path.join(DATA_DIR, "enrichment_candidates.jsonl");
const OUTPUT_REVIEW = path.join(DATA_DIR, "review_queue.csv");
const OUTPUT_ENRICHED = path.join(DATA_DIR, "enriched_industrial_heritage.json");

// ─── Step 0: 分析 JSON 结构 ─────────────────────────────────────────────────

function analyzeSchema(sites: Site[]) {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  Step 0: JSON 字段结构分析                           ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const total = sites.length;
  const allKeys = new Set<string>();
  sites.forEach(s => Object.keys(s).forEach(k => allKeys.add(k)));

  const keyStats: Record<string, { present: number; sample: string }> = {};
  allKeys.forEach(k => {
    const present = sites.filter(s => k in s && s[k as keyof Site] !== undefined).length;
    const sample = sites.find(s => k in s && s[k as keyof Site] !== undefined)?.[k as keyof Site];
    keyStats[k] = { present, sample: JSON.stringify(sample ?? "").slice(0, 60) };
  });

  console.log(`\n总点位：${total}`);
  console.log(`不同字段数：${allKeys.size}`);
  console.log("\n字段覆盖情况：");

  const sorted = Object.entries(keyStats).sort((a, b) => b[1].present - a[1].present);
  sorted.forEach(([key, stat]) => {
    const pct = ((stat.present / total) * 100).toFixed(1).padStart(6);
    const bar = "█".repeat(Math.round(stat.present / total * 20)).padEnd(20, "░");
    console.log(`  ${bar} ${pct}%  ${key}`);
  });

  return keyStats;
}

// ─── Step 1: 筛选无实图点位 ─────────────────────────────────────────────────

function findSitesNeedingImages(sites: Site[], keyStats: Record<string, { present: number }>) {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  Step 1: 筛选无实图点位                             ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const NEEDS_IMAGE: ("images" | "historicalBackground" | "address" | "visitAccess")[] = [
    "images", "historicalBackground", "address", "visitAccess",
  ];

  const results = sites.map(site => {
    const issues: string[] = [];

    // 1a. 占位图 SVG
    if (site.images?.length === 1 && site.images[0].url.includes("/covers/factory-default.svg")) {
      issues.push("placeholder_svg");
    }

    // 1b. aos-comment 失效图片（已知不可靠域名）
    const unreliableDomains = ["aos-comment.amap.com", "aos-cdn-image.amap.com"];
    const hasUnreliable = site.images?.some(img =>
      unreliableDomains.some(d => img.url.includes(d))
    );
    if (hasUnreliable) issues.push("unreliable_image_source");

    // 1c. 无图
    if (!site.images || site.images.length === 0) issues.push("no_image");

    // 2. 缺少扩展字段
    if (!site.historicalBackground) issues.push("no_historical_background");
    if (!site.address) issues.push("no_address");
    if (!site.visitAccess) issues.push("no_visit_access");

    return { site, issues, needsEnrichment: issues.length > 0 };
  });

  const needs = results.filter(r => r.needsEnrichment);
  const byIssue: Record<string, number> = {};
  needs.forEach(r => r.issues.forEach(i => { byIssue[i] = (byIssue[i] ?? 0) + 1; }));

  console.log(`\n总点位：${sites.length}`);
  console.log(`需要富化：${needs.length}（${((needs.length / sites.length) * 100).toFixed(1)}%）`);
  console.log("\n问题分布：");
  Object.entries(byIssue).sort((a, b) => b[1] - a[1]).forEach(([issue, count]) => {
    console.log(`  ${count.toString().padStart(3)}  ${issue}`);
  });

  return needs;
}

// ─── Step 2: 生成搜索词 ─────────────────────────────────────────────────────

function buildSearchTerms(site: Site): string[] {
  const terms: string[] = [];

  // 基础名称
  terms.push(site.name);

  // 城市+名称
  terms.push(`${site.city}${site.name}`);

  // 去后缀名称 + 城市
  const stripped = site.name
    .replace(/旧址|旧厂|遗址|公园|博物馆|纪念馆|展示馆/g, "")
    .trim();
  if (stripped && stripped !== site.name) {
    terms.push(stripped);
    terms.push(`${site.city}${stripped}`);
  }

  // 加"工业遗产"后缀
  terms.push(`${site.name} 工业遗产`);

  // 加"厂/矿/站"后缀
  if (!site.name.includes("厂") && !site.name.includes("矿") && !site.name.includes("站")) {
    terms.push(`${stripped || site.name}厂`);
  }

  // 类别词
  const categoryMap: Record<string, string> = {
    "钢铁工业": "钢铁厂", "纺织工业": "纺织厂", "食品工业": "食品厂",
    "电力工业": "电厂", "机械制造": "机械厂", "船舶工业": "船厂",
    "铁路工业": "火车站", "铁路交通": "火车站", "军工国防": "军工厂",
  };
  if (categoryMap[site.category]) {
    terms.push(`${stripped || site.name}${categoryMap[site.category]}`);
  }

  // 去重
  return [...new Set(terms)];
}

// ─── Step 3: Wikipedia/Wikimedia API ─────────────────────────────────────────

const WIKI_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function searchWikiPage(term: string): Promise<{
  title: string;
  url: string;
  summary: string | null;
  imageUrl: string | null;
  imageThumbUrl: string | null;
  imagePageUrl: string | null;
  imageLicense: string;
  imageLicenseUrl: string;
} | null> {
  try {
    // OpenSearch 先找到标题
    const searchUrl = `https://zh.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(term)}&limit=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { headers: WIKI_HEADERS });
    const searchData = (await searchRes.json()) as [string, string[], string[], string[]];

    if (!searchData[1] || searchData[1].length === 0) return null;
    const title = searchData[1][0];

    // 抓摘要（Wikipedia REST API）
    let summary: string | null = null;
    let pageUrl: string | null = null;
    try {
      const summaryRes = await fetch(
        `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: WIKI_HEADERS }
      );
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        summary = summaryData.extract ?? null;
        pageUrl = summaryData.content_urls?.desktop?.page ?? null;
      }
    } catch { /* skip summary */ }

    // 抓主图（query API + pageimages）
    let imageUrl: string | null = null;
    let imageThumbUrl: string | null = null;
    let imagePageUrl: string | null = null;
    let imageLicense = "Unknown";
    let imageLicenseUrl = "";

    try {
      const pageImgRes = await fetch(
        `https://zh.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
        `&prop=pageimages&pithumbsize=800&format=json&origin=*`,
        { headers: WIKI_HEADERS }
      );
      if (pageImgRes.ok) {
        const pageImgData = await pageImgRes.json();
        const pages = pageImgData.query?.pages as Record<string, { thumbnail?: { source: string }; pageimage?: string }> | undefined;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          if (pageId && pageId !== "-1" && pages[pageId].thumbnail) {
            imageThumbUrl = pages[pageId].thumbnail!.source;
          }
        }
      }
    } catch { /* skip image */ }

    // Wikimedia Commons 大图
    if (imageThumbUrl) {
      try {
        const commonsRes = await fetch(
          `https://commons.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
          `&prop=pageimages&pithumbsize=1200&format=json&origin=*`,
          { headers: WIKI_HEADERS }
        );
        if (commonsRes.ok) {
          const commonsData = await commonsRes.json();
          const pages = commonsData.query?.pages as Record<string, { thumbnail?: { source: string } }> | undefined;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            if (pageId && pageId !== "-1" && pages[pageId].thumbnail) {
              imageUrl = pages[pageId].thumbnail!.source;
              imagePageUrl = `https://commons.wikipedia.org/wiki/File:${encodeURIComponent(title)}.jpg`;
            }
          }
        }
      } catch { /* skip full image */ }
    }

    // 如果 Wikipedia 没有图，尝试 Wikimedia Commons 直接搜索
    if (!imageThumbUrl) {
      try {
        const commonsSearchRes = await fetch(
          `https://commons.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}` +
          `&srnamespace=6&srlimit=3&format=json&origin=*`,
          { headers: WIKI_HEADERS }
        );
        if (commonsSearchRes.ok) {
          const csData = await commonsSearchRes.json();
          const results = csData.query?.search as Array<{ title: string }> | undefined;
          if (results && results.length > 0) {
            const fileName = results[0].title.replace("File:", "");
            const fileInfoRes = await fetch(
              `https://commons.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}` +
              `&prop=imageinfo&iiprop=url|extmeta&iiurlwidth=1200&format=json&origin=*`,
              { headers: WIKI_HEADERS }
            );
            if (fileInfoRes.ok) {
              const fiData = await fileInfoRes.json();
              const pages = fiData.query?.pages as Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string }> }> | undefined;
              if (pages) {
                const pageId = Object.keys(pages)[0];
                if (pageId && pageId !== "-1" && pages[pageId].imageinfo) {
                  imageThumbUrl = pages[pageId].imageinfo![0].thumburl ?? null;
                  imageUrl = pages[pageId].imageinfo![0].url ?? null;
                  imagePageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(results[0].title)}`;
                }
              }
            }
          }
        }
      } catch { /* skip */ }
    }

    return {
      title,
      url: pageUrl ?? `https://zh.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      summary,
      imageUrl,
      imageThumbUrl: imageThumbUrl ?? imageUrl,
      imagePageUrl,
      imageLicense: imageLicense,
      imageLicenseUrl: imageLicenseUrl,
    };
  } catch (e) {
    console.error(`  Wiki fetch error for "${term}": ${e}`);
    return null;
  }
}

// ─── Step 4: 匹配评分 ────────────────────────────────────────────────────────

function scoreCandidate(
  site: Site,
  wiki: { title: string | null; summary: string | null; imageUrl: string | null },
): { score: number; breakdown: WikiCandidate["scoreBreakdown"] } {
  const breakdown = { nameMatch: 0, cityMatch: 0, provinceMatch: 0, categoryHint: 0 };

  const siteName = site.name.replace(/旧址|旧厂|遗址|公园|博物馆|纪念馆/g, "").trim();
  const wikiTitle = wiki.title ?? "";
  const wikiSummary = wiki.summary ?? "";

  // 名称匹配 0-40
  if (wikiTitle === site.name) {
    breakdown.nameMatch = 40;
  } else if (wikiTitle.includes(site.name) || site.name.includes(wikiTitle)) {
    breakdown.nameMatch = 30;
  } else if (
    wikiTitle.includes(siteName) ||
    siteName.includes(wikiTitle) ||
    siteName.includes(wikiTitle.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ""))
  ) {
    breakdown.nameMatch = 22;
  } else if (fuzzyMatch(siteName, wikiTitle) > 0.7) {
    breakdown.nameMatch = 15;
  } else if (fuzzyMatch(siteName, wikiTitle) > 0.5) {
    breakdown.nameMatch = 8;
  }

  // 城市匹配 0-30
  const wikiFull = (wikiTitle + wikiSummary).replace(/\s/g, "");
  if (wikiFull.includes(site.city) || wikiFull.includes(site.city.replace(/市|县/g, ""))) {
    breakdown.cityMatch = 30;
  } else if (wikiFull.includes(site.province.replace(/省|市|自治区|特别行政区/g, ""))) {
    breakdown.cityMatch = 15;
  }

  // 省份匹配 0-15
  const provinceShort = site.province.replace(/省|市|自治区|特别行政区/g, "");
  if (wikiSummary.includes(provinceShort) || wikiTitle.includes(provinceShort)) {
    breakdown.provinceMatch = 15;
  } else if (wikiSummary.includes(site.province)) {
    breakdown.provinceMatch = 10;
  }

  // 类别暗示词匹配 0-15
  const categoryHints: Record<string, string[]> = {
    "钢铁工业": ["钢铁", "高炉", "炼钢", "钢铁厂", "鞍钢", "首钢"],
    "纺织工业": ["纺织", "纱厂", "棉纺", "丝绸"],
    "食品工业": ["啤酒", "酿酒", "面粉", "食品", "饮料"],
    "电力工业": ["电厂", "发电", "电力", "电站"],
    "机械制造": ["机械", "机床", "制造"],
    "船舶工业": ["船厂", "造船", "船舶", "船坞"],
    "铁路交通": ["铁路", "火车站", "车站", "铁路站"],
    "铁路工业": ["铁路", "火车站", "车站"],
    "军工国防": ["兵工厂", "军工厂", "军工", "军事"],
  };
  const hints = categoryHints[site.category] ?? [];
  const hintMatches = hints.filter(h => wikiSummary.includes(h) || wikiTitle.includes(h)).length;
  breakdown.categoryHint = Math.min(15, hintMatches * 7);

  const score = breakdown.nameMatch + breakdown.cityMatch + breakdown.provinceMatch + breakdown.categoryHint;
  return { score: Math.min(100, score), breakdown };
}

function fuzzyMatch(a: string, b: string): number {
  const a2 = a.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "");
  const b2 = b.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "");
  if (a2 === b2) return 1;
  if (!a2 || !b2) return 0;
  const longer = a2.length > b2.length ? a2 : b2;
  const shorter = a2.length > b2.length ? b2 : a2;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= shorter.length; i++) matrix[i] = [i];
  for (let j = 0; j <= longer.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= shorter.length; i++) {
    for (let j = 1; j <= longer.length; j++) {
      const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return 1 - matrix[shorter.length][longer.length] / Math.max(a2.length, b2.length);
}

// ─── Step 5: 写输出文件 ──────────────────────────────────────────────────────

function writeJsonl(candidates: WikiCandidate[], filepath: string) {
  const lines = candidates.map(c => JSON.stringify(c)).join("\n");
  fs.writeFileSync(filepath, lines, "utf-8");
  console.log(`\n✓ enrichment_candidates.jsonl — ${candidates.length} 条`);
}

function writeReviewCsv(candidates: WikiCandidate[], filepath: string) {
  const headers = [
    "site_id", "site_name", "site_city", "site_province", "site_category",
    "wiki_title", "wiki_url", "image_url", "image_thumb_url",
    "image_license", "image_page_url",
    "page_summary（摘要前100字）",
    "总分", "名称匹配分", "城市匹配分", "省份匹配分", "类别匹配分",
    "复核状态", "复核人", "复核时间", "通过/拒绝", "复核备注",
  ];

  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes("\n") || s.includes('"')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = candidates.map(c => [
    c.siteId, c.siteName, c.siteCity, c.siteProvince, c.siteCategory,
    c.wikiTitle ?? "", c.wikiUrl ?? "", c.imageUrl ?? "", c.imageThumbUrl ?? "",
    c.imageLicense, c.imagePageUrl ?? "",
    (c.pageSummary ?? "").slice(0, 100),
    c.score, c.scoreBreakdown.nameMatch, c.scoreBreakdown.cityMatch,
    c.scoreBreakdown.provinceMatch, c.scoreBreakdown.categoryHint,
    c.reviewed ? "已复核" : "待复核", c.reviewedBy ?? "", c.reviewedAt ?? "",
    c.approved === true ? "通过" : c.approved === false ? "拒绝" : "",
    c.reviewNote ?? "",
  ].map(escape).join(","));

  fs.writeFileSync(filepath, [headers.join(","), ...rows].join("\n"), "utf-8");
  console.log(`✓ review_queue.csv — ${candidates.length} 条`);
}

function writeEnrichedJson(
  sites: Site[],
  candidates: WikiCandidate[],
  filepath: string,
) {
  const approvedMap = new Map(
    candidates.filter(c => c.approved === true).map(c => [c.siteId, c])
  );
  // 也包含未复核但高分候选（>=70）作为自动建议
  const highScoreMap = new Map(
    candidates.filter(c => c.reviewed === false && c.score >= 70).map(c => [c.siteId, c])
  );

  const output: EnrichedOutput = {
    generatedAt: new Date().toISOString(),
    totalSites: sites.length,
    candidatesFound: candidates.length,
    highConfidenceCount: candidates.filter(c => c.score >= 70).length,
    sites: sites.map(site => {
      const enriched: EnrichedOutput["sites"][0] = { ...site };

      const approved = approvedMap.get(site.id);
      const highScore = highScoreMap.get(site.id);
      const bestCandidate = approved ?? highScore;

      if (bestCandidate) {
        enriched.enrichment = {
          wikiImage: bestCandidate.imageUrl ?? undefined,
          wikiImageThumb: bestCandidate.imageThumbUrl ?? undefined,
          wikiImagePage: bestCandidate.imagePageUrl ?? undefined,
          wikiImageLicense: bestCandidate.imageLicense,
          wikiImageLicenseUrl: bestCandidate.imageLicenseUrl,
          wikiSummary: bestCandidate.pageSummary ?? undefined,
          wikiPageUrl: bestCandidate.wikiUrl ?? undefined,
          enrichmentScore: bestCandidate.score,
          enrichmentSearchTerm: bestCandidate.searchTerm,
          enrichedAt: new Date().toISOString(),
        };
      }

      return enriched;
    }),
  };

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  const approvedCount = approvedMap.size;
  const highScoreCount = highScoreMap.size;
  console.log(`✓ enriched_industrial_heritage.json — ${sites.length} 条（含 ${approvedCount} 已通过 + ${highScoreCount} 高分待确认）`);
}

// ─── Step 6: 加载人工复核结果 ────────────────────────────────────────────────

function loadExistingReview(filepath: string): WikiCandidate[] {
  if (!fs.existsSync(filepath)) return [];
  const content = fs.readFileSync(filepath, "utf-8");
  return content
    .split("\n")
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line) as WikiCandidate; }
      catch { return null; }
    })
    .filter(Boolean) as WikiCandidate[];
}

// ─── 主流程 ─────────────────────────────────────────────────────────────────

async function main() {
  const { values: args } = parseArgs({
    options: {
      limit: { type: "string", default: "0" },
      "dry-run": { type: "boolean", default: false },
      "min-score": { type: "string", default: "0" },
    },
  });

  const limit = args.limit ? parseInt(args.limit) : 0;
  const dryRun = args["dry-run"] as boolean;
  const minScore = parseInt(args["min-score"] as string);

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  工业遗产数据补全脚本 MVP                              ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  if (dryRun) console.log("  [DRY RUN — 不请求网络]\n");
  console.log(`  最低评分阈值: ${minScore}`);
  if (limit > 0) console.log(`  处理上限: ${limit} 条\n`);

  // ── 加载数据 ──────────────────────────────────────────────────────────────
  if (!fs.existsSync(SITES_FILE)) {
    console.error(`错误：找不到 ${SITES_FILE}`);
    process.exit(1);
  }
  const allSites: Site[] = JSON.parse(fs.readFileSync(SITES_FILE, "utf-8"));
  console.log(`已加载 ${allSites.length} 条点位`);

  // ── Step 0: 结构分析 ───────────────────────────────────────────────────────
  const keyStats = analyzeSchema(allSites);

  // ── Step 1: 筛选无图 ───────────────────────────────────────────────────────
  const needsEnrichment = findSitesNeedingImages(allSites, keyStats);
  const allTargetSites = needsEnrichment.map(r => r.site);
  const targetSites = limit > 0 ? allTargetSites.slice(0, limit) : allTargetSites;

  console.log(`\n目标点位（需富化）：${allTargetSites.length}`);

  if (dryRun) {
    console.log("\n[DRY RUN] 以下点位将被处理：");
    targetSites.slice(0, 10).forEach(s =>
      console.log(`  - ${s.id} | ${s.name} (${s.city})`)
    );
    if (targetSites.length > 10) console.log(`  ... 还有 ${targetSites.length - 10} 条`);
    return;
  }

  // ── 加载已有复核记录 ────────────────────────────────────────────────────────
  const existingReviews = loadExistingReview(OUTPUT_CANDIDATES);
  const reviewedMap = new Map(existingReviews.map(r => [`${r.siteId}::${r.searchTerm}`, r]));

  // ── Step 2-4: 抓取 + 评分 ───────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  Step 2-4: Wikipedia 抓取 + 评分                     ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const allCandidates: WikiCandidate[] = [];

  for (let i = 0; i < targetSites.length; i++) {
    const site = targetSites[i];
    const terms = buildSearchTerms(site);
    console.log(`\n[${i + 1}/${targetSites.length}] ${site.name} (${site.city})`);
    console.log(`  搜索词: ${terms.join(" | ")}`);

    let bestCandidate: WikiCandidate | null = null;

    for (const term of terms) {
      // 检查是否已有复核记录
      const existing = reviewedMap.get(`${site.id}::${term}`);
      if (existing && existing.reviewed) {
        if (!bestCandidate || existing.score > bestCandidate.score) {
          bestCandidate = existing;
        }
        continue;
      }

      const wiki = await searchWikiPage(term);
      await new Promise(r => setTimeout(r, 350)); // 礼貌限速

      if (!wiki) {
        console.log(`  ✗ "${term}" → 无结果`);
        continue;
      }

      const { score, breakdown } = scoreCandidate(site, wiki);
      console.log(
        `  ${score >= 70 ? "★" : score >= 50 ? "●" : "○"} "${term}" → "${wiki.title}" 评分 ${score}` +
        ` (名${breakdown.nameMatch} 城${breakdown.cityMatch} 省${breakdown.provinceMatch} 类${breakdown.categoryHint})`
      );

      const candidate: WikiCandidate = {
        siteId: site.id,
        siteName: site.name,
        siteCity: site.city,
        siteProvince: site.province,
        siteCategory: site.category,
        searchTerm: term,
        wikiTitle: wiki.title,
        wikiUrl: wiki.url,
        imageUrl: wiki.imageUrl,
        imageThumbUrl: wiki.imageThumbUrl,
        imagePageUrl: wiki.imagePageUrl,
        imageLicense: wiki.imageLicense,
        imageLicenseUrl: wiki.imageLicenseUrl,
        pageSummary: wiki.summary,
        pageUrl: wiki.url,
        score,
        scoreBreakdown: breakdown,
        reviewed: false,
        reviewedAt: null,
        reviewedBy: null,
        approved: null,
        reviewNote: null,
      };

      allCandidates.push(candidate);

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = candidate;
      }

      // Wikipedia 找到了高质量匹配，提前结束
      if (score >= 85) {
        console.log(`  ✓ 高分命中，停止搜索`);
        break;
      }
    }

    if (!bestCandidate) {
      console.log(`  ✗ 全局无结果`);
    } else {
      console.log(
        `  → 最佳: "${bestCandidate.wikiTitle}" 评分 ${bestCandidate.score}`
      );
    }
  }

  // ── Step 5: 过滤 + 输出 ─────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  Step 5: 输出文件                                     ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const filteredCandidates = allCandidates.filter(c => c.score >= minScore);

  console.log(`\n总候选数：${allCandidates.length}`);
  console.log(`过滤后（>= ${minScore}分）：${filteredCandidates.length}`);
  const scoreBins = { high: 0, mid: 0, low: 0 };
  filteredCandidates.forEach(c => {
    if (c.score >= 70) scoreBins.high++;
    else if (c.score >= 50) scoreBins.mid++;
    else scoreBins.low++;
  });
  console.log(`  高置信度（≥70分）：${scoreBins.high}`);
  console.log(`  中置信度（50-69分）：${scoreBins.mid}`);
  console.log(`  低置信度（${minScore}-49分）：${scoreBins.low}`);

  writeJsonl(filteredCandidates, OUTPUT_CANDIDATES);
  writeReviewCsv(filteredCandidates, OUTPUT_REVIEW);
  writeEnrichedJson(allSites, filteredCandidates, OUTPUT_ENRICHED);

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  完成                                                  ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("\n使用方法：");
  console.log("  # 分析结构 + 筛选无图（不请求网络）");
  console.log("  npx tsx scripts/enrich-data.ts --dry-run");
  console.log("");
  console.log("  # 处理全部无图点位");
  console.log("  npx tsx scripts/enrich-data.ts");
  console.log("");
  console.log("  # 仅处理前 20 条（快速测试）");
  console.log("  npx tsx scripts/enrich-data.ts --limit 20");
  console.log("");
  console.log("  # 仅输出 50 分以上的候选");
  console.log("  npx tsx scripts/enrich-data.ts --min-score 50");
  console.log("");
  console.log("人工复核流程：");
  console.log("  1. 打开 data/review_queue.csv 查阅每条候选");
  console.log("  2. 编辑 data/enrichment_candidates.jsonl");
  console.log("     将对应条目的 reviewed=true, approved=true/false, reviewedBy='your-name'");
  console.log("  3. 重新运行脚本（会合并已有复核结果）");
  console.log(`  4. 输出 data/enriched_industrial_heritage.json 即可集成到项目`);
}

main().catch(err => {
  console.error("脚本错误:", err);
  process.exit(1);
});

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAllSites } from "@/lib/sites";
import type { AIRouteResult, AISiteStop } from "@/types/ai-explore";

// ─── Environment ──────────────────────────────────────────────────────────────
const API_KEY = process.env.OPENAI_API_KEY ?? process.env.MINIMAX_API_KEY ?? "";
const BASE_URL =
  process.env.OPENAI_BASE_URL ??
  (API_KEY.startsWith("eyJ") ? "https://api.minimax.chat/v1" : "https://api.openai.com/v1");
const MODEL = process.env.AI_MODEL ?? "abab6.5s-chat";
// MiniMax-specific: pass GroupId in request headers
const GROUP_ID = process.env.MINIMAX_GROUP_ID ?? "";

const MIN_SITES = 4;
const MAX_SITES = 6;

// ─── OpenAI client (works with any OpenAI-compatible endpoint) ─────────────────
const client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  query: string,
  sites: Array<{
    id: string;
    name: string;
    category: string;
    provinceFull: string;
    primaryCity: string;
    era?: string;
    description?: string;
    status: string;
  }>,
): string {
  const siteList = sites
    .map(
      (s) =>
        `- ${s.id} | ${s.name} | ${s.category} | ${s.provinceFull} ${s.primaryCity}${s.era ? ` | ${s.era}年` : ""}${s.description ? ` | ${s.description.slice(0, 100)}` : ""} | ${s.status}`,
    )
    .join("\n");

  return `你是一个专业的中国工业遗产研究助手。用户的问题是："${query}"

【任务】
从以下站点列表中，选择 ${MIN_SITES} 到 ${MAX_SITES} 个最能回答用户问题的站点，按逻辑顺序（时间顺序或地理顺序）排列成一条探索路线。

【严格约束】
- 只从列表中选择站点，每个站点必须以上面的 "- ID | ..." 格式提供
- 不得编造任何不在列表中的站点 ID
- 每个 stop 的 explanation 是一句简洁的话，说明该站点为什么在这条路线上

站点列表：
${siteList}

请严格以如下 JSON 格式返回，不要输出任何其他内容：
{"title":"路线标题","summary":"2-3句综述","stops":[{"siteId":"站点ID","explanation":"一句解释"},{"siteId":"站点ID","explanation":"一句解释"}]}`;
}

// ─── Fallback: keyword-based route ───────────────────────────────────────────

function buildFallbackResult(query: string, allSites: ReturnType<typeof getAllSites>): AIRouteResult {
  const keywords = query.toLowerCase().split(/[\s,.，,。?？!！]+/).filter(Boolean);

  const scored = allSites.map((site) => {
    const haystack = [
      site.name,
      site.category,
      site.provinceFull,
      site.primaryCity,
      site.description ?? "",
      site.era ?? "",
    ]
      .join(" ")
      .toLowerCase();
    const score = keywords.filter((kw) => haystack.includes(kw)).length;
    return { site, score };
  });

  const top = scored
    .sort((a, b) => {
      // Primary: higher score first
      if (b.score !== a.score) return b.score - a.score;
      // Secondary: seed by site.id to keep order stable across re-renders
      return a.site.id.localeCompare(b.site.id, "zh-CN");
    })
    .slice(0, MAX_SITES);

  return {
    title: `关于"${query}"的探索路线`,
    summary: `基于关键词匹配，从数据库中选取了与"${query}"最相关的 ${top.length} 个工业遗产点位，呈现如下探索路线。`,
    stops: top.map((x) => ({
      siteId: x.site.id,
      explanation: `${x.site.name}（${x.site.category}，${x.site.provinceFull}）`,
    })),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Check API key
  if (!API_KEY) {
    return NextResponse.json(
      {
        error:
          "未配置 AI API Key。请在 .env.local 中添加 OPENAI_API_KEY（MiniMax API Key），或在 Vercel Project Settings → Environment Variables 中配置。",
      },
      { status: 500 },
    );
  }

  // 2. Parse body
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误，需要 JSON body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "query 不能为空" }, { status: 400 });
  }
  if (query.length > 200) {
    return NextResponse.json({ error: "query 不能超过 200 个字符" }, { status: 400 });
  }

  // 3. Load sites
  const allSites = getAllSites();
  const siteIds = new Set(allSites.map((s) => s.id));
  const siteMap = new Map(allSites.map((s) => [s.id, s]));

  // 4. Call LLM — MiniMax requires GroupId in request body for OpenAI-compatible endpoint
  const extraBody: Record<string, string> = {};
  if (GROUP_ID) {
    extraBody["group_id"] = GROUP_ID;
  }

  let rawText = "";
  let usedFallback = false;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: buildPrompt(query, allSites) }],
      temperature: 0.6,
      max_tokens: 1200,
      ...(Object.keys(extraBody).length > 0 ? { extra_body: extraBody } : {}),
    });

    rawText = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!rawText) {
      throw new Error("LLM returned empty response");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    console.error("[AI Explore] LLM call failed:", message);
    usedFallback = true;

    // Auto-fallback on error
    const fallbackResult = buildFallbackResult(query, allSites);
    return NextResponse.json(fallbackResult, {
      headers: { "X-Route-Source": "fallback", "X-Error": message },
    });
  }

  // 5. Parse JSON from response
  let parsed: { title?: string; summary?: string; stops?: unknown[] };

  try {
    // Try extracting JSON block (LLM sometimes wraps in markdown)
    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)```/)?.[1] ??
      rawText.match(/```\s*([\s\S]*?)```/)?.[1] ??
      rawText.match(/(\{[\s\S]*\})/)?.[1] ??
      rawText;

    parsed = JSON.parse(jsonMatch.trim());
  } catch {
    console.warn("[AI Explore] JSON parse failed, using fallback. Response:", rawText.slice(0, 300));
    return NextResponse.json(buildFallbackResult(query, allSites));
  }

  // 6. Validate stops — discard any siteId not in our database
  const rawStops = Array.isArray(parsed.stops) ? parsed.stops : [];

  const validatedStops: AISiteStop[] = [];
  const usedIds = new Set<string>();

  for (const stop of rawStops) {
    if (
      stop &&
      typeof stop === "object" &&
      "siteId" in stop &&
      typeof (stop as { siteId?: string }).siteId === "string" &&
      siteIds.has((stop as { siteId: string }).siteId) &&
      !usedIds.has((stop as { siteId: string }).siteId)
    ) {
      const s = stop as { siteId: string; explanation?: string };
      usedIds.add(s.siteId);
      validatedStops.push({
        siteId: s.siteId,
        explanation: s.explanation?.trim() ? s.explanation.trim() : siteMap.get(s.siteId)?.name ?? s.siteId,
      });
    }
  }

  // 7. If too few stops, supplement with fallback
  if (validatedStops.length < MIN_SITES) {
    const supplements = allSites
      .filter((s) => !usedIds.has(s.id))
      .slice(0, MIN_SITES - validatedStops.length)
      .map((s) => ({
        siteId: s.id,
        explanation: `${s.name}（${s.category}，${s.provinceFull}）—— 作为补充推荐。`,
      }));
    validatedStops.push(...supplements);
  }

  // 8. Build final result
  const result: AIRouteResult = {
    title:
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : `关于"${query}"的探索路线`,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : `这条路线汇集了与"${query}"最相关的 ${validatedStops.length} 个工业遗产点位。`,
    stops: validatedStops.slice(0, MAX_SITES),
  };

  return NextResponse.json(result, {
    headers: { "X-Route-Source": "llm" },
  });
}

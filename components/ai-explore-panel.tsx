"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { AIRouteResult, AIExplorePanelStatus } from "@/types/ai-explore";

const STORAGE_KEY = "ihm-ai-route-result";
const AI_SESSION_KEY = "ihm-ai-route-active";

interface AIExplorePanelProps {
  /** Called when the user submits a valid query */
  onRouteGenerated?: (result: AIRouteResult) => void;
}

export default function AIExplorePanel({ onRouteGenerated }: AIExplorePanelProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AIExplorePanelStatus>("idle");
  const [result, setResult] = useState<AIRouteResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed || status === "loading") return;

      setStatus("loading");
      setErrorMsg(null);
      setNoticeMsg(null);

      try {
        const res = await fetch("/api/ai-explore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });

        const data = await res.json();
        const routeSource = res.headers.get("X-Route-Source");

        if (!res.ok || data.error) {
          throw new Error(data.error ?? `请求失败（${res.status}）`);
        }

        const routeResult: AIRouteResult = data as AIRouteResult;

        // Persist to sessionStorage so HomeExplorer can read it after mount
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(routeResult));
          sessionStorage.setItem(AI_SESSION_KEY, "1");
        } catch {
          // sessionStorage may be unavailable in some environments
        }

        setResult(routeResult);
        setStatus("success");
        setNoticeMsg(
          routeSource === "fallback"
            ? "AI 服务暂时不可用，当前路线由关键词匹配生成。"
            : null,
        );
        onRouteGenerated?.(routeResult);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知错误，请重试";
        setErrorMsg(msg);
        setStatus("error");
      }
    },
    [query, status, onRouteGenerated],
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setStatus("idle");
    setErrorMsg(null);
    setNoticeMsg(null);
    setQuery("");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(AI_SESSION_KEY);
    } catch {
      // ignore
    }
  }, []);

  const handleExampleClick = useCallback(
    (example: string) => {
      setQuery(example);
      // Focus input
      inputRef.current?.focus();
    },
    [],
  );

  const examples = [
    "中国重工业的发展路径",
    "1950年代的工业遗产",
    "纺织工业的近代化",
    "长江沿线的工业重镇",
  ];

  return (
    <section className="w-full px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
      <div
        className="rounded-[28px] border border-[var(--industrial-accent)] border-b-2 bg-white p-5 shadow-[0_16px_38px_rgba(126,47,47,0.1)] sm:p-6 lg:p-7"
        style={{ borderBottomColor: "rgba(126,47,47,0.5)" }}
      >
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {/* Sparkle icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
                  fill="var(--industrial-accent)"
                  opacity="0.85"
                />
                <path
                  d="M19 15L19.75 17.25L22 18L19.75 18.75L19 21L18.25 18.75L16 18L18.25 17.25L19 15Z"
                  fill="var(--industrial-accent)"
                  opacity="0.5"
                />
                <path
                  d="M5 13L5.5 14.5L7 15L5.5 15.5L5 17L4.5 15.5L3 15L4.5 14.5L5 13Z"
                  fill="var(--industrial-accent)"
                  opacity="0.35"
                />
              </svg>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--industrial-accent)]">
                AI-Powered
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              AI 探索助手
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
              说一句话，告诉我想了解什么，AI 会在 284 个工业遗产点中为你规划一条探索路线。
            </p>
          </div>

          {status === "success" && (
            <button
              type="button"
              onClick={handleReset}
              className="self-start rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
              重新探索
            </button>
          )}
        </div>

        {/* Input area */}
        {status !== "success" && (
          <div className="mt-5">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="例如：中国重工业的发展路径"
                  maxLength={200}
                  className="h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[var(--industrial-accent)] focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || status === "loading"}
                  className="h-12 shrink-0 rounded-2xl px-6 text-sm font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: "var(--industrial-accent)" }}
                >
                  {status === "loading" ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner />
                      分析中…
                    </span>
                  ) : (
                    "生成路线"
                  )}
                </button>
              </div>

              {/* Examples */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-slate-400">试试：</span>
                {examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => handleExampleClick(ex)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 transition hover:border-[var(--industrial-accent-soft)] hover:text-[var(--industrial-accent)]"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* Error */}
              {status === "error" && errorMsg && (
                <p className="mt-3 text-sm text-red-500">{errorMsg}</p>
              )}
            </form>
          </div>
        )}

        {/* Results */}
        {status === "success" && result && (
          <div className="mt-6">
            {/* Title + summary */}
            <div className="mb-5 rounded-2xl border border-[var(--industrial-accent-soft)] bg-[rgba(126,47,47,0.04)] p-5">
              <h3 className="text-lg font-semibold text-[var(--industrial-accent)]">{result.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-700">{result.summary}</p>
              {noticeMsg && (
                <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
                  {noticeMsg}
                </p>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <LoadingSpinner size={12} />
                由 AI 生成 · 共 {result.stops.length} 个站点
              </p>
            </div>

            {/* Stop list */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.stops.map((stop, index) => (
                <AIStopCard key={stop.siteId} stop={stop} index={index} />
              ))}
            </div>

            {/* View on map CTA */}
            <div className="mt-6 flex justify-center">
              <a
                href="/#map-explorer"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-8 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(126,47,47,0.22)] transition hover:-translate-y-0.5 hover:brightness-90"
                style={{ background: "var(--industrial-accent)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                在地图上查看路线
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AIStopCard({ stop, index }: { stop: { siteId: string; explanation: string }; index: number }) {
  return (
    <Link
      href={`/sites/${stop.siteId}?from=ai`}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[var(--industrial-accent-soft)] hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
    >
      {/* Index badge + site ID hint */}
      <div className="flex items-center justify-between">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: "var(--industrial-accent)", opacity: 0.85 + index * 0.03 }}
        >
          {index + 1}
        </span>
        <span className="text-xs font-mono text-slate-400">{stop.siteId}</span>
      </div>

      {/* Explanation */}
      <p className="text-sm leading-7 text-slate-700">{stop.explanation}</p>

      {/* View link */}
      <span className="mt-auto flex items-center gap-1 text-xs font-medium text-slate-400 transition group-hover:text-[var(--industrial-accent)]">
        查看详情
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}

function LoadingSpinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: "ai-spin 1s linear infinite", display: "inline-block" }}
    >
      <style>{`@keyframes ai-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

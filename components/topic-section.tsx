"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { buildTopicSearchParams, countTopicMatches, getPrimarySiteImage, matchSiteAgainstTopicFilters, type TopicFilterRule } from "@/lib/sites";
import type { Site } from "@/types/site";

function getAccentColor(accentClassName: string): string {
  const match = accentClassName.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
  const hexMatch = accentClassName.match(/#([0-9a-fA-F]{6})/);
  if (hexMatch) return hexMatch[1];
  return "#7e2f2f";
}

export interface TopicDefinition {
  id: string;
  tag: string;
  title: string;
  description: string;
  examples: string;
  accentClassName: string;
  filters: TopicFilterRule;
  curatedIds?: string[];
}

interface TopicSectionProps {
  topics: TopicDefinition[];
  sites: Site[];
}

export default function TopicSection({ topics, sites }: TopicSectionProps) {
  const router = useRouter();

  const topicCounts = useMemo(() => {
    return topics.map((topic) => {
      const count = countTopicMatches(sites, topic.filters, topic.curatedIds);
      const matched = sites.filter((site) => matchSiteAgainstTopicFilters(site, topic.filters));
      const curatedExtra = (topic.curatedIds ?? [])
        .map((id) => sites.find((s) => s.id === id))
        .filter(Boolean) as Site[];
      const allMatched = [...matched, ...curatedExtra];
      const unique = allMatched.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
      const thumbs = unique.slice(0, 3).map((s) => getPrimarySiteImage(s));
      return { ...topic, count, thumbs };
    });
  }, [topics, sites]);

  function handleEnterTopic(topic: TopicDefinition) {
    const params = buildTopicSearchParams(topic.filters);
    const query = params.toString();
    router.push(query ? `/?${query}#map-explorer` : "/#map-explorer", { scroll: true });
  }

  return (
    <section className="w-full px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
      <div className="rounded-[28px] border border-stone-200 border-b-2 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.08)] sm:p-6 lg:p-7" style={{ borderBottomColor: "rgba(126,47,47,0.4)" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Thematic Collections
            </p>
            <h2 className="featured-picks-header__title" style={{ marginTop: "4px" }}>
              专题精选
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {topics.length} 个专题，按工业门类、历史阶段与遗产现状梳理全国工业遗产
            </p>
          </div>
          <a href="#map-explorer" className="shrink-0 text-sm font-medium text-slate-500 hover:text-[var(--industrial-accent)] transition">
            ← 返回地图
          </a>
        </div>

        {/* 卡片网格 */}
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {topicCounts.map((topic) => (
            <article
              key={topic.id}
              className="topic-card"
              style={{ "--topic-accent": getAccentColor(topic.accentClassName) } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium tracking-[0.04em] ${topic.accentClassName}`}
                >
                  {topic.tag}
                </span>
                {topic.count > 0 && (
                  <span className="text-xs text-slate-400">{topic.count} 处</span>
                )}
              </div>

              {topic.thumbs.length > 0 && (
                <div className="mt-3 flex gap-1.5">
                  {topic.thumbs.map((thumb, i) => (
                    <div key={i} className="h-16 w-16 flex-[0_0_auto] overflow-hidden rounded-xl border border-stone-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb.url} alt={thumb.alt ?? topic.title} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <h3 className="topic-card__title">{topic.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">{topic.description}</p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">{topic.examples}</p>

              <button
                type="button"
                onClick={() => handleEnterTopic(topic)}
                className="mt-auto inline-flex min-h-11 items-center justify-center rounded-2xl border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-stone-400 hover:bg-stone-50"
                style={{ letterSpacing: '0.01em' }}
              >
                去看看 →
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

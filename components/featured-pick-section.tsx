"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import picks from "@/data/picks.json";

type Pick = (typeof picks)[number];

const INTERVAL_MS = 8000;
const FADE_DURATION_MS = 350;

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        border: "1px solid rgba(47,127,120,0.3)",
        background: "rgba(47,127,120,0.12)",
        color: "#2f7f78",
        backdropFilter: "blur(8px)",
        letterSpacing: "0.04em",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: status === "开放参观" ? "#22c55e" : "#f59e0b",
          display: "inline-block",
          flexShrink: 0,
          boxShadow: `0 0 4px ${status === "开放参观" ? "#22c55e" : "#f59e0b"}`,
        }}
      />
      {status}
    </span>
  );
}

function ProgressDots({
  total,
  current,
  onClick,
}: {
  total: number;
  current: number;
  onClick: (i: number) => void;
}) {
  return (
    <div className="featured-pick-dots" role="tablist" aria-label="精选推荐切换">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === current}
          aria-label={`查看第 ${i + 1} 个推荐`}
          onClick={() => onClick(i)}
          className={`featured-pick-dot ${i === current ? "is-active" : ""}`}
        />
      ))}
    </div>
  );
}

function PickCard({ pick, visible }: { pick: Pick; visible: boolean }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  return (
    <Link
      href={`/sites/${pick.id}`}
      className="featured-pick-single"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: `opacity ${FADE_DURATION_MS}ms ease`,
      }}
      tabIndex={visible ? 0 : -1}
    >
      {/* 左侧图片 */}
      <div className="featured-pick-single__image-shell">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {!imgError ? (
          <img
            src={pick.imageUrl}
            alt={pick.name}
            className={`featured-pick-single__image ${imgLoaded || imgError ? "is-loaded" : ""}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
          />
        ) : null}
        {/* 图片加载占位骨架 */}
        <div
          className={`featured-pick-single__image-skeleton ${
            imgLoaded || imgError ? "is-loaded" : ""
          } ${imgError ? "is-error" : ""}`}
        />
        {/* 叠加层 */}
        <div className="featured-pick-single__image-overlay" />
        {/* 左下角标签 */}
        <div className="featured-pick-single__image-tag">
          <StatusBadge status={pick.status} />
        </div>
      </div>

      {/* 右侧内容 */}
      <div className="featured-pick-single__body">
        {/* 标签 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {pick.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="featured-pick-tag"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* 标题 */}
        <h3 className="featured-pick-single__title">{pick.name}</h3>

        {/* 城市 + 类型 */}
        <p className="featured-pick-single__meta">
          {pick.city} · {pick.category}
        </p>

        {/* 高亮语 */}
        <p className="featured-pick-single__highlight">{pick.highlight}</p>

        {/* 简介 */}
        <p className="featured-pick-single__description line-clamp-3">
          {pick.description}
        </p>

        {/* 查看详情按钮 */}
        <div className="featured-pick-single__cta">
          <span className="featured-pick-single__cta-inner">
            查看详情
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function FeaturedPickSection() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allPicks = useMemo(() => picks as Pick[], []);

  function goTo(index: number) {
    if (index === current) return;
    setVisible(false);
    setTimeout(() => {
      setCurrent(index);
      setVisible(true);
    }, FADE_DURATION_MS);
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % allPicks.length);
        setVisible(true);
      }, FADE_DURATION_MS);
    }, INTERVAL_MS);
  }

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [allPicks.length]);

  const pick = allPicks[current];

  return (
    <section className="w-full px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
      <div className="featured-picks-wrapper">
        {/* 标题栏 */}
        <div className="featured-picks-header">
          <div className="featured-picks-header__text">
            <p className="featured-picks-header__eyebrow">Curated for Visit</p>
            <h2 className="featured-picks-header__title">编辑精选</h2>
            <p className="featured-picks-header__sub">
              可参观 · 改造优质 · 实景体验
            </p>
          </div>

          <div className="featured-picks-header__actions">
            <span className="featured-picks-header__counter">
              {current + 1} / {allPicks.length}
            </span>
          </div>
        </div>

        {/* 单卡片 + 进度指示器 */}
        <PickCard pick={pick} visible={visible} />

        <ProgressDots
          total={allPicks.length}
          current={current}
          onClick={(i) => { goTo(i); startTimer(); }}
        />
      </div>
    </section>
  );
}

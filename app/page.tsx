import { Suspense } from "react";
import HomeExplorer from "@/components/home-explorer";
import FeaturedPickSection from "@/components/featured-pick-section";
import TopicSection from "@/components/topic-section";
import AIExplorePanel from "@/components/ai-explore-panel";
import { getAllSites } from "@/lib/sites";
import topics from "@/data/topics.json";

export default function HomePage() {
  const sites = getAllSites();

  return (
    <div className="flex flex-col gap-5 pb-6 pt-4 sm:gap-6 sm:pb-8 sm:pt-5">
      <section className="w-full px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
        <div className="relative flex flex-col gap-4 rounded-[28px] border border-stone-200 border-b-2 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.08)] sm:flex-row sm:items-end sm:justify-between sm:p-6 lg:p-7" style={{ borderBottomColor: "var(--industrial-accent)" }}>
          <div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl lg:leading-[1.05]">
              Industrial Heritage Map
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              全国工业遗产散落在地图上，等待被重新发现。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:flex-nowrap">
            <a
              href="#map-explorer"
              className="inline-flex min-h-12 items-center rounded-2xl px-6 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(126,47,47,0.22)] transition hover:-translate-y-0.5 hover:brightness-90 sm:text-base"
              style={{ background: "var(--industrial-accent)" }}
            >
              开始探索 →
            </a>
            <div className="flex gap-5 text-sm text-slate-500">
              <span><strong className="text-slate-800">{sites.length}</strong> 个点位</span>
              <span><strong className="text-slate-800">{new Set(sites.map((s) => s.province)).size}</strong> 个省份</span>
              <span><strong className="text-slate-800">{new Set(sites.map((s) => s.category)).size}</strong> 个门类</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI 探索入口 */}
      <Suspense fallback={null}>
        <AIExplorePanel />
      </Suspense>

      <Suspense
        fallback={
          <section className="w-full px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
            <div className="rounded-[28px] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:p-5 lg:p-6">
              <div className="flex h-[76vh] min-h-[680px] items-center justify-center rounded-[24px] border border-stone-200 bg-white text-sm text-slate-500 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
                地图加载中...
              </div>
            </div>
          </section>
        }
      >
        <HomeExplorer sites={sites} />
      </Suspense>

      <FeaturedPickSection />

      <TopicSection topics={topics} sites={sites} />

      <section className="w-full px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
        <div className="rounded-[22px] border border-[var(--industrial-accent-soft)] bg-[rgba(126,47,47,0.06)] p-4 text-sm leading-7 text-slate-800 shadow-[0_10px_24px_rgba(126,47,47,0.06)] sm:p-5">
          <p className="font-medium text-[var(--industrial-accent)]">免责声明</p>
          <p className="mt-1">
            本站为研究与信息浏览用途的 MVP，不构成官方开放承诺、导览建议或安全指引。
            工业遗产点位可能存在封闭管理、修缮施工、产权限制或结构风险，请勿擅自进入未开放区域。
          </p>
        </div>
      </section>
    </div>
  );
}

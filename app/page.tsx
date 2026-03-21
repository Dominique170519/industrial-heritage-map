import { Suspense } from "react";
import Link from "next/link";
import HomeExplorer from "@/components/home-explorer";
import FeaturedSiteList from "@/components/featured-site-list";
import { getAllSites, getFeaturedSites } from "@/lib/sites";

export default function HomePage() {
  const sites = getAllSites();
  const featuredSites = getFeaturedSites()
    .filter((site) => (site.images?.length ?? 0) > 0)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-5 pb-6 pt-4 sm:gap-6 sm:pb-8 sm:pt-5">
      <section className="w-full px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_320px] xl:items-start">
          <div className="rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] p-5 shadow-[0_16px_38px_rgba(15,23,42,0.08)] sm:p-6 lg:p-7">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Industrial Heritage Map
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl lg:leading-[1.05]">
              工业遗产地图
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
              浏览全国工业遗产分布，按类型、时期与状态筛选点位，发现被遗忘的工业空间。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#map-explorer"
                className="inline-flex min-h-12 items-center rounded-2xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--industrial-accent)] hover:shadow-[0_20px_36px_rgba(126,47,47,0.22)] sm:text-base"
              >
                进入地图工作区 →
              </a>
              <Link
                href="/disclaimer"
                className="inline-flex min-h-12 items-center rounded-2xl border border-stone-300 bg-white/78 px-5 text-sm font-medium text-slate-700 transition hover:border-stone-400 hover:bg-white"
              >
                查看免责声明
              </Link>
            </div>
          </div>

          <aside className="rounded-[24px] border border-stone-200 bg-white/82 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Exploration Flow</p>
            <h2 className="mt-3 text-base font-semibold text-slate-900">探索方式</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <li className="border-l-2 border-[var(--industrial-accent-soft)] pl-4">先进入地图查看全国点位分布</li>
              <li className="border-l-2 border-stone-200 pl-4">用快速类型切换主要工业门类</li>
              <li className="border-l-2 border-stone-200 pl-4">再用完整筛选缩小到城市、级别与批次</li>
              <li className="border-l-2 border-stone-200 pl-4">进入单点档案页继续阅读现场信息</li>
            </ul>
          </aside>
        </div>
      </section>

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

      {featuredSites.length > 0 ? (
        <section className="w-full px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
          <div className="rounded-[24px] border border-slate-200 bg-white/80 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Sample Shelf</p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                  研究样本速览
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  仅保留带图样本，作为地图工作台之外的补充入口，适合快速扫读与继续跳转。
                </p>
              </div>
              <a href="#map-explorer" className="text-sm font-medium text-slate-700 underline underline-offset-4">
                返回地图工作台
              </a>
            </div>

            <div className="mt-4">
              <FeaturedSiteList sites={featuredSites} />
            </div>
          </div>
        </section>
      ) : null}

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

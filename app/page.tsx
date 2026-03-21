import Link from "next/link";
import HomeExplorer from "@/components/home-explorer";
import FeaturedSiteList from "@/components/featured-site-list";
import { getAllSites, getFeaturedSites } from "@/lib/sites";

export default function HomePage() {
  const sites = getAllSites();
  const featuredSites = getFeaturedSites().slice(0, 8);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-3xl border border-stone-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Industrial Heritage Map
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            锈迹·工业遗产地图
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
            一个面向工业遗产爱好者、研究者与城市观察者的轻量地图工具。
            你可以按省份、城市、类别、级别、批次与关键词筛选点位，并进入单点档案页查看基础信息。
          </p>
        </div>

        <div className="rounded-3xl border border-stone-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <h2 className="text-base font-semibold text-slate-900">MVP 范围</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
            <li>• 首页地图</li>
            <li>• 省份 / 城市 / 类别 / 级别 / 批次 / 关键词筛选</li>
            <li>• 点位列表</li>
            <li>• 点位详情页</li>
            <li>• 免责声明</li>
          </ul>

          <Link
            href="/disclaimer"
            className="mt-5 inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
          >
            查看免责声明
          </Link>
        </div>
      </section>

      {featuredSites.length > 0 ? (
        <section className="rounded-3xl border border-stone-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Featured Sites</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                精选工业遗产
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                从江浙出发，发现值得一看的工业遗产点位。
              </p>
            </div>
            <a href="#map-explorer" className="text-sm font-medium text-slate-900 underline underline-offset-4">
              继续使用地图筛选
            </a>
          </div>

          <div className="mt-6">
            <FeaturedSiteList sites={featuredSites} />
          </div>
        </section>
      ) : null}

      <HomeExplorer sites={sites} />

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
        <p className="font-medium">免责声明</p>
        <p className="mt-1">
          本站为研究与信息浏览用途的 MVP，不构成官方开放承诺、导览建议或安全指引。
          工业遗产点位可能存在封闭管理、修缮施工、产权限制或结构风险，请勿擅自进入未开放区域。
        </p>
      </section>
    </div>
  );
}

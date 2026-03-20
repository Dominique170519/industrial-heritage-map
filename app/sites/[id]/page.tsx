import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSites, getPrimarySiteImage, getSiteById } from "@/lib/sites";

export function generateStaticParams() {
  return getAllSites().map((site) => ({
    id: site.id,
  }));
}

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = getSiteById(id);

  if (!site) {
    notFound();
  }

  const image = getPrimarySiteImage(site);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/"
          className="inline-flex text-sm text-slate-600 underline underline-offset-4"
        >
          返回地图
        </Link>
      </div>

      <article className="overflow-hidden rounded-3xl border border-stone-300 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="aspect-[16/7] overflow-hidden bg-stone-100">
          <img src={image.url} alt={image.alt ?? site.name} className="h-full w-full object-cover" />
        </div>

        <div className="flex flex-col gap-8 p-6 sm:p-8">
          <header className="border-b border-stone-200 pb-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Site Archive
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {site.name}
            </h1>
            <p className="mt-3 text-base text-slate-600">
              {site.provinceFull} · {site.primaryCity}
              {site.district ? ` · ${site.district}` : ""}
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
              {site.description}
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2">
            <InfoItem label="省份" value={site.provinceFull} />
            <InfoItem label="城市" value={site.primaryCity} />
            <InfoItem label="行政区" value={site.district ?? "未知"} />
            <InfoItem label="类型" value={site.category} />
            <InfoItem label="级别" value={site.level ?? "未知"} />
            <InfoItem label="批次" value={site.batch ?? "未知"} />
            <InfoItem label="状态" value={site.status} />
            <InfoItem label="建成年代" value={site.era ?? "未知"} />
            <InfoItem label="地址" value={site.address ?? "未知"} />
            <InfoItem label="纬度 / 经度" value={`${site.lat}, ${site.lng}`} />
            <InfoItem label="访问方式" value={site.visitAccess ?? "暂无说明"} />
            <InfoItem label="来源" value={site.source ?? "暂无说明"} />
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-base font-semibold text-amber-950">风险提示</h2>
            <p className="mt-2 text-sm leading-7 text-amber-900">
              {site.riskNote ?? "暂无补充说明，请以现场管理要求为准。"}
            </p>
          </section>

          <section className="rounded-2xl border border-stone-300 bg-stone-50 p-5">
            <h2 className="text-base font-semibold text-slate-900">免责声明</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              本页信息仅作工业遗产点位索引与研究性浏览，不保证实时开放、可进入性、交通组织、
              场地边界与安全条件完全准确。请勿翻越围挡、进入封闭厂房或进行任何未经许可的探访行为。
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-300 bg-stone-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-7 text-slate-900">{value}</p>
    </div>
  );
}

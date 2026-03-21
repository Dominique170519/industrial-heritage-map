import Link from "next/link";
import { notFound } from "next/navigation";
import SiteLocationMapClient from "@/components/site-location-map-client";
import { buildSiteExploreHref, getAllSites, getExplorationPaths, getPrimarySiteImage, getSiteById } from "@/lib/sites";
import type { Site } from "@/types/site";

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
  const summary = site.description ?? "暂无摘要，待补充现场与文献资料。";
  const locationLabel = [site.provinceFull, site.primaryCity, site.district].filter(Boolean).join(" · ");
  const archiveMeta = [site.category, site.level, site.batch].filter(Boolean).slice(0, 3);
  const allSites = getAllSites();
  const relatedSites = getRelatedSites(site, allSites).slice(0, 4);
  const explorationPaths = getExplorationPaths(site, allSites);
  const mapReturnHref = buildSiteExploreHref({ category: site.category }, site.id);
  const galleryImages = site.images?.slice(1, 4) ?? [];
  const hasGallery = galleryImages.length > 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/"
          className="inline-flex text-sm text-slate-600 underline underline-offset-4"
        >
          返回地图
        </Link>
      </div>

      <article className="flex flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-stone-300 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative min-h-[320px] overflow-hidden bg-stone-100 lg:min-h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.alt ?? site.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,23,42,0.52)] via-[rgba(15,23,42,0.08)] to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <div className="inline-flex rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs tracking-[0.22em] text-white/85 backdrop-blur-sm">
                  INDUSTRIAL HERITAGE DOSSIER
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Site Archive</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {site.name}
                </h1>
                <p className="mt-3 text-sm uppercase tracking-[0.16em] text-slate-500">
                  {site.category}
                  {site.era ? ` · ${site.era}` : ""}
                </p>
                <p className="mt-5 text-sm leading-7 text-slate-600">{locationLabel}</p>
                <p className="mt-5 text-base leading-8 text-slate-700">{summary}</p>
              </div>

              <div className="space-y-5 border-t border-stone-200 pt-5">
                <div className="flex flex-wrap gap-2">
                  {archiveMeta.map((item) => (
                    <ArchiveTag key={item} tone="default">
                      {item}
                    </ArchiveTag>
                  ))}
                  <ArchiveTag tone="status">{site.status}</ArchiveTag>
                </div>

                <dl className="grid gap-4 sm:grid-cols-2">
                  <HeroMetaItem label="地区" value={locationLabel} />
                  <HeroMetaItem label="坐标" value={formatCoordinates(site.lat, site.lng)} />
                  <HeroMetaItem label="访问状态" value={site.visitAccess ?? "暂无资料"} />
                  <HeroMetaItem label="数据来源" value={site.source ?? "待补充"} />
                </dl>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="flex flex-col gap-8">
            <SectionCard
              eyebrow="Catalog Entry"
              title="基础信息"
              description="以档案条目方式整理点位基础字段，便于后续扩展与标准化。"
            >
              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <InfoCard label="名称" value={site.name} />
                <InfoCard label="所在地" value={locationLabel} />
                <InfoCard label="工业类型" value={site.category} />
                <InfoCard label="当前状态" value={site.status} />
                <InfoCard label="保护级别" value={site.level ?? "暂无资料"} muted={!site.level} />
                <InfoCard label="认定批次" value={site.batch ?? "暂无资料"} muted={!site.batch} />
                <InfoCard label="建成年代" value={site.era ?? "暂无资料"} muted={!site.era} />
                <InfoCard label="历史时期" value={site.era ?? "待补充"} muted={!site.era} />
                <InfoCard label="详细地址" value={site.address ?? "暂无资料"} muted={!site.address} />
                <InfoCard label="坐标" value={formatCoordinates(site.lat, site.lng)} />
                <InfoCard label="访问方式" value={site.visitAccess ?? "暂无资料"} muted={!site.visitAccess} />
                <InfoCard label="数据来源" value={site.source ?? "暂无资料"} muted={!site.source} />
              </dl>
            </SectionCard>

            <SectionCard
              eyebrow="Research Notes"
              title="历史与价值说明"
              description="将基础介绍拆分为研究型阅读结构，形成更清晰的信息节奏。"
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <NarrativeBlock
                  title="历史背景"
                  content={site.historicalBackground}
                  fallback="当前数据以概述性描述为主，后续可补充建厂背景、生产体系演变、城市扩张关系等历史信息。"
                />
                <NarrativeBlock
                  title="遗产价值 / 研究价值"
                  content={site.researchValue}
                  fallback={buildResearchValue(site)}
                />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Image & Field Condition"
              title="图像与现场信息"
              description="结合影像与现场状态，保持页面完整，同时兼容暂缺资料。"
            >
              <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[1.5rem] border border-stone-300 bg-stone-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.alt ?? site.name} className="aspect-[16/10] w-full object-cover" />
                  </div>

                  {hasGallery ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {galleryImages.map((galleryImage, index) => (
                        <div
                          key={`${galleryImage.url}-${index}`}
                          className="overflow-hidden rounded-2xl border border-stone-300 bg-stone-100"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={galleryImage.url}
                            alt={galleryImage.alt ?? `${site.name} 图像 ${index + 2}`}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm leading-7 text-slate-500">
                      当前仅收录 1 张主图，后续可继续补充历史照片、现场照片或局部遗存图像。
                    </div>
                  )}
                </div>

                <div className="grid gap-4">
                  <FieldInfoCard label="开放参观" value={site.status} />
                  <FieldInfoCard
                    label="当前利用情况"
                    value={site.currentUse ?? site.visitAccess ?? "暂无资料，待补充当前利用与开放方式。"}
                    muted={!site.currentUse && !site.visitAccess}
                  />
                  <FieldInfoCard
                    label="可见遗存类型"
                    value={site.visibleRemains ?? inferVisibleRemains(site)}
                    muted={!site.visibleRemains && !hasInferredVisibleRemains(site)}
                  />
                  <FieldInfoCard label="现场提示" value={site.riskNote ?? "暂无资料，请以现场管理要求为准。"} muted={!site.riskNote} />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Spatial Context"
              title="地图定位"
              description="将单点档案页与主地图系统保持联系，提供清晰的空间坐标感。"
            >
              <div className="overflow-hidden rounded-[1.5rem] border border-stone-300 bg-stone-100">
                <SiteLocationMapClient lat={site.lat} lng={site.lng} name={site.name} />
              </div>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  当前坐标：<span className="font-medium text-slate-900">{formatCoordinates(site.lat, site.lng)}</span>
                </p>
                <Link href={mapReturnHref} className="inline-flex font-medium text-slate-900 underline underline-offset-4">
                  返回主地图继续筛选
                </Link>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Continue Exploring"
              title="继续探索"
              description="从当前点位回到主页地图，并直接带入一组可继续浏览的筛选路径。"
            >
              <div className="grid gap-4 lg:grid-cols-3">
                {explorationPaths.map((path) => (
                  <Link
                    key={path.key}
                    href={path.href}
                    className="group rounded-[1.5rem] border border-stone-300 bg-stone-50 p-5 transition hover:border-[var(--industrial-accent-soft)] hover:bg-white hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{path.filterLabel}</p>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950 group-hover:text-[var(--industrial-accent)]">
                      {path.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{path.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-200 pt-4 text-sm">
                      <span className="text-slate-500">匹配点位 {path.resultCount} 个</span>
                      <span className="font-medium text-slate-900">回到地图 →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          </div>

          <aside className="flex flex-col gap-6">
            <SectionCard
              eyebrow="Archive Status"
              title="档案提示"
              description="当前页面已兼容基础字段与后续研究字段补充。"
            >
              <div className="space-y-4 text-sm leading-7 text-slate-700">
                <AsideMetric label="记录编号" value={site.id} />
                <AsideMetric label="资料完整度" value={getDataCompletenessLabel(site)} />
                <AsideMetric label="图像数量" value={`${site.images?.length ?? 0} 张`} />
                <AsideMetric label="研究备注" value={site.riskNote ?? "暂无补充备注"} muted={!site.riskNote} />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Related Sites"
              title="相关点位"
              description="按同城、同类型、同省份的优先级做轻量推荐。"
            >
              <div className="space-y-4">
                {relatedSites.length > 0 ? (
                  relatedSites.map((relatedSite) => (
                    <Link
                      key={relatedSite.id}
                      href={`/sites/${relatedSite.id}`}
                      className="group block rounded-2xl border border-stone-300 bg-stone-50 p-4 transition hover:border-slate-400 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 group-hover:text-slate-950">
                            {relatedSite.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {relatedSite.primaryCity}
                            {relatedSite.district ? ` · ${relatedSite.district}` : ""}
                          </p>
                        </div>
                        <span className="rounded-full border border-stone-300 px-2.5 py-1 text-xs text-slate-600">
                          {getRelationLabel(site, relatedSite)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ArchiveTag tone="default">{relatedSite.category}</ArchiveTag>
                        <ArchiveTag tone="status">{relatedSite.status}</ArchiveTag>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">
                        {relatedSite.description ?? "暂无概述"}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm leading-7 text-slate-500">
                    暂无可推荐的相关点位，待数据规模扩大后补充更多关联关系。
                  </div>
                )}
              </div>
            </SectionCard>

            <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-base font-semibold text-amber-950">风险提示</h2>
              <p className="mt-2 text-sm leading-7 text-amber-900">
                {site.riskNote ?? "暂无补充说明，请以现场管理要求为准。"}
              </p>
            </section>

            <section className="rounded-[1.5rem] border border-stone-300 bg-stone-50 p-5">
              <h2 className="text-base font-semibold text-slate-900">免责声明</h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                本页信息仅作工业遗产点位索引与研究性浏览，不保证实时开放、可进入性、交通组织、
                场地边界与安全条件完全准确。请勿翻越围挡、进入封闭厂房或进行任何未经许可的探访行为。
              </p>
            </section>
          </aside>
        </div>
      </article>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="border-b border-stone-200 pb-5">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ArchiveTag({ children, tone }: { children: React.ReactNode; tone: "default" | "status" }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-medium tracking-[0.08em]",
        tone === "status"
          ? "border-slate-300 bg-slate-900 text-white"
          : "border-stone-300 bg-stone-50 text-slate-700",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function HeroMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm leading-7 text-slate-900">{value}</dd>
    </div>
  );
}

function InfoCard({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-300 bg-stone-50 p-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={["mt-2 text-sm leading-7", muted ? "text-slate-500" : "text-slate-900"].join(" ")}>
        {value}
      </dd>
    </div>
  );
}

function NarrativeBlock({
  title,
  content,
  fallback,
}: {
  title: string;
  content?: string;
  fallback: string;
}) {
  const text = content?.trim() || fallback;
  const isFallback = !content?.trim();

  return (
    <section className="rounded-[1.5rem] border border-stone-300 bg-stone-50 p-5">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className={["mt-4 text-sm leading-8", isFallback ? "text-slate-500" : "text-slate-700"].join(" ")}>
        {text}
      </p>
    </section>
  );
}

function FieldInfoCard({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-stone-300 bg-stone-50 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={["mt-3 text-sm leading-7", muted ? "text-slate-500" : "text-slate-800"].join(" ")}>
        {value}
      </p>
    </div>
  );
}

function AsideMetric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="border-b border-stone-200 pb-3 last:border-b-0 last:pb-0">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={["mt-2 text-sm leading-7", muted ? "text-slate-500" : "text-slate-900"].join(" ")}>
        {value}
      </p>
    </div>
  );
}

function formatCoordinates(lat: number, lng: number) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function buildResearchValue(site: Site) {
  const parts = [
    `${site.name}可作为${site.category}类型遗产的案例样本进行观察。`,
    site.level ? `现有资料显示其保护级别为“${site.level}”。` : "当前保护级别资料仍待补充。",
    site.status ? `从现场状态看，该点位目前处于“${site.status}”状态。` : "现场状态信息仍待补充。",
    site.address ? `其空间位置位于${site.address}。` : "其空间区位仍可结合地图与文献继续补充。",
  ];

  return parts.join("");
}

function hasInferredVisibleRemains(site: Site) {
  const description = site.description ?? "";
  return ["建筑", "设备", "轨道", "烟囱", "高炉", "厂房", "料仓", "管廊"].some((keyword) => description.includes(keyword));
}

function inferVisibleRemains(site: Site) {
  const description = site.description ?? "";
  const matched = ["建筑", "设备", "轨道", "烟囱", "高炉", "厂房", "料仓", "管廊"].filter((keyword) =>
    description.includes(keyword),
  );

  if (matched.length > 0) {
    return Array.from(new Set(matched)).join(" / ");
  }

  return "暂无资料，待补充现场可见遗存类型。";
}

function getDataCompletenessLabel(site: Site) {
  const fields = [site.level, site.batch, site.era, site.address, site.source, site.visitAccess, site.riskNote].filter(Boolean);

  if (fields.length >= 6) return "较完整";
  if (fields.length >= 3) return "基础完整";
  return "待补充";
}

function getRelationLabel(currentSite: Site, relatedSite: Site) {
  if (currentSite.primaryCity === relatedSite.primaryCity) return "同城市";
  if (currentSite.category === relatedSite.category) return "同类型";
  if (currentSite.provinceFull === relatedSite.provinceFull) return "同省份";
  return "相关点位";
}

function getRelatedSites(currentSite: Site, allSites: Site[]) {
  return allSites
    .filter((site) => site.id !== currentSite.id)
    .map((site) => ({
      site,
      score: getRelatedSiteScore(currentSite, site),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.site.name.localeCompare(b.site.name, "zh-CN");
    })
    .map((item) => item.site);
}

function getRelatedSiteScore(currentSite: Site, candidate: Site) {
  if (currentSite.primaryCity === candidate.primaryCity) return 3;
  if (currentSite.category === candidate.category) return 2;
  if (currentSite.provinceFull === candidate.provinceFull) return 1;
  return 0;
}

import Link from "next/link";
import { getPrimarySiteImage } from "@/lib/sites";
import type { Site } from "@/types/site";

function StatusTag({ status }: { status: Site["status"] }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--industrial-accent-soft)] bg-[rgba(126,47,47,0.08)] px-2.5 py-1 text-xs font-medium text-[var(--industrial-accent)] backdrop-blur">
      {status}
    </span>
  );
}

export default function FeaturedSiteList({ sites }: { sites: Site[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:overflow-visible lg:pb-0">
      {sites.map((site) => {
        const image = getPrimarySiteImage(site);

        return (
          <Link
            key={site.id}
            href={`/sites/${site.id}`}
            className="group min-w-[280px] overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[var(--industrial-accent-soft)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)] lg:min-w-0"
          >
            <div className="relative h-44 overflow-hidden bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt ?? site.name}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute left-4 top-4">
                <StatusTag status={site.status} />
              </div>
            </div>

            <div className="flex flex-col gap-3 p-5">
              <div>
                <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">{site.name}</h3>
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                  {site.primaryCity} · {site.category}
                </p>
              </div>

              <p className="line-clamp-2 text-sm leading-6 text-slate-700">{site.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

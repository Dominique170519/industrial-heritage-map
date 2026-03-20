"use client";

import Link from "next/link";
import { getPrimarySiteImage } from "@/lib/sites";
import type { Site } from "@/types/site";

function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

export default function SiteCard({ site }: { site: Site }) {
  const image = getPrimarySiteImage(site);

  return (
    <Link
      href={`/sites/${site.id}`}
      className="group overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-400"
    >
      <div className="aspect-[16/9] overflow-hidden bg-stone-100">
        <img
          src={image.url}
          alt={image.alt ?? site.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{site.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {site.provinceFull} · {site.primaryCity}
            {site.district ? ` · ${site.district}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <MetaTag>{site.category}</MetaTag>
          {site.batch ? <MetaTag>{site.batch}</MetaTag> : null}
          {site.level ? <MetaTag>{site.level}</MetaTag> : null}
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-slate-700">{site.description}</p>
      </div>
    </Link>
  );
}

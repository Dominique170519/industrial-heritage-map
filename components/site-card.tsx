"use client";

import Link from "next/link";
import type { Site } from "@/types/site";

function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

export default function SiteCard({ site }: { site: Site }) {
  return (
    <Link
      href={`/sites/${site.id}`}
      className="group overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-400"
    >
      <div className="aspect-[16/9] overflow-hidden bg-stone-100">
        <img
          src={site.coverImage}
          alt={site.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{site.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {site.city} · {site.district}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <MetaTag>{site.type}</MetaTag>
          <MetaTag>{site.status}</MetaTag>
          <MetaTag>{site.year} 年</MetaTag>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-slate-700">
          {site.summary}
        </p>
      </div>
    </Link>
  );
}

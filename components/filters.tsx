"use client";

import type { SiteFilterOption, SiteFilterOptions, SiteFilters } from "@/types/site";

interface FiltersProps extends SiteFilterOptions {
  filters: SiteFilters;
  onChange: (key: keyof SiteFilters, value: string) => void;
  className?: string;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "全部",
}: {
  label: string;
  value: string;
  options: SiteFilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled && option.value !== value}>
            {option.value}（{option.count}）
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Filters({
  provinces,
  cities,
  categories,
  statuses,
  levels,
  batches,
  filters,
  onChange,
  className,
}: FiltersProps) {
  return (
    <section
      className={[
        "rounded-[24px] border border-slate-200 bg-[rgba(255,255,255,0.92)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">关键词</span>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => onChange("keyword", e.target.value)}
            placeholder="按名称、省市、类别、批次或级别搜索"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <SelectField
            label="省份"
            value={filters.province}
            options={provinces}
            onChange={(value) => onChange("province", value)}
          />
          <SelectField
            label="城市"
            value={filters.city}
            options={cities}
            placeholder={filters.province ? "全部城市" : "先选省份或查看全部"}
            onChange={(value) => onChange("city", value)}
          />
          <SelectField
            label="类别"
            value={filters.category}
            options={categories}
            onChange={(value) => onChange("category", value)}
          />
          <SelectField
            label="级别"
            value={filters.level}
            options={levels}
            onChange={(value) => onChange("level", value)}
          />
          <SelectField
            label="批次"
            value={filters.batch}
            options={batches}
            onChange={(value) => onChange("batch", value)}
          />
          <SelectField
            label="状态"
            value={filters.status}
            options={statuses}
            onChange={(value) => onChange("status", value)}
          />
        </div>
      </div>
    </section>
  );
}

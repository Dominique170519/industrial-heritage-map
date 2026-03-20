"use client";

import type { SiteFilterOptions, SiteFilters } from "@/types/site";

interface FiltersProps extends SiteFilterOptions {
  filters: SiteFilters;
  total: number;
  filtered: number;
  onChange: (key: keyof SiteFilters, value: string) => void;
  onReset: () => void;
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
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
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
  total,
  filtered,
  onChange,
  onReset,
}: FiltersProps) {
  const hasActiveFilters = Object.values(filters).some((value) => value.trim() !== "");

  return (
    <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">筛选</h2>
            <p className="mt-1 text-sm text-slate-500">
              当前显示 {filtered} / {total} 个点位
            </p>
            {hasActiveFilters ? (
              <p className="mt-1 text-sm text-slate-500">已启用筛选，可重置后查看全部点位。</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-stone-50"
          >
            清空筛选
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">关键词</span>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => onChange("keyword", e.target.value)}
            placeholder="按名称、省市、类别、批次或级别搜索"
            className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

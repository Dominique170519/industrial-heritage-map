"use client";

type FilterState = {
  city: string;
  type: string;
  status: string;
};

interface FiltersProps {
  cities: string[];
  types: string[];
  statuses: string[];
  filters: FilterState;
  total: number;
  filtered: number;
  onChange: (key: keyof FilterState, value: string) => void;
  onReset: () => void;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
      >
        <option value="">全部</option>
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
  cities,
  types,
  statuses,
  filters,
  total,
  filtered,
  onChange,
  onReset,
}: FiltersProps) {
  return (
    <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">筛选</h2>
            <p className="mt-1 text-sm text-slate-500">
              当前显示 {filtered} / {total} 个点位
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-stone-50"
          >
            重置
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="城市"
            value={filters.city}
            options={cities}
            onChange={(value) => onChange("city", value)}
          />
          <SelectField
            label="类型"
            value={filters.type}
            options={types}
            onChange={(value) => onChange("type", value)}
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

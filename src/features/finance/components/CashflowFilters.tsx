import { MultiSelectDropdown } from "../../../ui/MultiSelectDropdown";
import type { OurEntity } from "../../../store/types";
import type { CashflowGranularity } from "../financeUtils";
import type { CashflowPlanFilters, CashflowRangePreset } from "../useCashflowPlan";

const inputCls =
  "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function CashflowFilters({
  value,
  onChange,
  onPreset,
}: {
  value: CashflowPlanFilters;
  onChange: (next: CashflowPlanFilters) => void;
  onPreset: (preset: CashflowRangePreset) => void;
}) {
  const entities = ["USA", "UK", "TR"] as OurEntity[];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Range</label>
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px]">
            {(["30", "60", "90", "custom"] as CashflowRangePreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPreset(p)}
                className={`flex-1 rounded-md px-2 py-1 font-semibold ${
                  value.preset === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {p === "custom" ? "Custom" : `${p}d`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">From</label>
          <input
            type="date"
            className={inputCls}
            value={value.fromYmd}
            onChange={(e) => onChange({ ...value, preset: "custom", fromYmd: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">To</label>
          <input
            type="date"
            className={inputCls}
            value={value.toYmd}
            onChange={(e) => onChange({ ...value, preset: "custom", toYmd: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Entities</label>
          <MultiSelectDropdown
            label="Select entities…"
            items={entities}
            selectedIds={value.entityIds}
            getItemId={(e) => e}
            getItemLabel={(e) => e}
            onToggle={(id) => {
              const next = value.entityIds.includes(id as OurEntity)
                ? value.entityIds.filter((x) => x !== (id as OurEntity))
                : [...value.entityIds, id as OurEntity];
              onChange({ ...value, entityIds: next.length ? next : [...entities] });
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Bucket</label>
          <select
            className={inputCls}
            value={value.granularity}
            onChange={(e) => onChange({ ...value, granularity: e.target.value as CashflowGranularity })}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>
    </section>
  );
}

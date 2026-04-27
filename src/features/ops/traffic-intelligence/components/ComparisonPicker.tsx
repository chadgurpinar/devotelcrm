import type { ComparePreset } from "../trafficUtils";

const inputCls =
  "rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-800 focus:border-indigo-500 focus:outline-none";

interface Props {
  preset: ComparePreset;
  onPreset: (p: ComparePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
  bFrom: string;
  bTo: string;
}

const LABELS: Record<ComparePreset, string> = {
  prior: "Prior period (same length)",
  prior_month: "Shift −1 month",
  prior_quarter: "Shift −3× length",
  custom: "Custom B range",
};

export function ComparisonPicker({ preset, onPreset, customFrom, customTo, onCustomFrom, onCustomTo, bFrom, bTo }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px]">
      <span className="font-semibold uppercase text-slate-500">Compare</span>
      <select className={inputCls} value={preset} onChange={(e) => onPreset(e.target.value as ComparePreset)}>
        {(Object.keys(LABELS) as ComparePreset[]).map((k) => (
          <option key={k} value={k}>
            {LABELS[k]}
          </option>
        ))}
      </select>
      {preset === "custom" && (
        <>
          <input type="date" className={inputCls} value={customFrom} onChange={(e) => onCustomFrom(e.target.value)} />
          <span className="text-slate-400">→</span>
          <input type="date" className={inputCls} value={customTo} onChange={(e) => onCustomTo(e.target.value)} />
        </>
      )}
      <span className="text-slate-500">
        B: <span className="font-mono text-slate-800">{bFrom}</span> – <span className="font-mono text-slate-800">{bTo}</span>
      </span>
    </div>
  );
}

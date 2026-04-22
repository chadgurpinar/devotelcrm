import type { TrafficSourceType } from "../../../store/types";
import { ALL_TRAFFIC_SOURCES, type TrafficTypeFilter } from "./trafficUtils";

const inputCls =
  "rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

interface TrafficFiltersProps {
  trafficSourceTypes: TrafficSourceType[];
  onToggleSource: (src: TrafficSourceType) => void;
  onSelectAllSources: () => void;
  trafficType: TrafficTypeFilter;
  onTrafficType: (v: TrafficTypeFilter) => void;
  country: string;
  onCountry: (v: string) => void;
  operator: string;
  onOperator: (v: string) => void;
  sourceAccount: string;
  onSourceAccount: (v: string) => void;
  destinationAccount: string;
  onDestinationAccount: (v: string) => void;
  senderId: string;
  onSenderId: (v: string) => void;
  countries: string[];
  operators: string[];
  sourceAccounts: string[];
  destinationAccounts: string[];
}

export function TrafficFilters(props: TrafficFiltersProps) {
  const allOn = props.trafficSourceTypes.length === ALL_TRAFFIC_SOURCES.length;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="min-w-[200px] flex-1">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Traffic source</span>
        <div className="flex flex-wrap gap-1.5">
          {ALL_TRAFFIC_SOURCES.map((src) => {
            const on = props.trafficSourceTypes.includes(src);
            return (
              <button
                key={src}
                type="button"
                onClick={() => props.onToggleSource(src)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                  on ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {src}
              </button>
            );
          })}
          <button
            type="button"
            onClick={props.onSelectAllSources}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
              allOn ? "border-slate-300 text-slate-400" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
            disabled={allOn}
          >
            All
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Country</label>
        <select className={`min-w-[120px] ${inputCls}`} value={props.country} onChange={(e) => props.onCountry(e.target.value)}>
          <option value="">All</option>
          {props.countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Operator</label>
        <select className={`min-w-[130px] ${inputCls}`} value={props.operator} onChange={(e) => props.onOperator(e.target.value)}>
          <option value="">All</option>
          {props.operators.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Source acct</label>
        <select
          className={`min-w-[120px] ${inputCls}`}
          value={props.sourceAccount}
          onChange={(e) => props.onSourceAccount(e.target.value)}
        >
          <option value="">All</option>
          {props.sourceAccounts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Destination</label>
        <select
          className={`min-w-[120px] ${inputCls}`}
          value={props.destinationAccount}
          onChange={(e) => props.onDestinationAccount(e.target.value)}
        >
          <option value="">All</option>
          {props.destinationAccounts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Traffic type</label>
        <select
          className={`min-w-[110px] ${inputCls}`}
          value={props.trafficType}
          onChange={(e) => props.onTrafficType(e.target.value as TrafficTypeFilter)}
        >
          <option value="">All</option>
          <option value="Direct">Direct</option>
          <option value="Generated">Generated</option>
        </select>
      </div>
      <div className="min-w-[140px]">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sender ID</label>
        <input
          className={`w-full ${inputCls}`}
          placeholder="Contains…"
          value={props.senderId}
          onChange={(e) => props.onSenderId(e.target.value)}
        />
      </div>
    </div>
  );
}

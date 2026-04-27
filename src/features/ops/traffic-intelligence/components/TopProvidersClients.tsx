import { useState } from "react";
import type { WholesaleTrafficRecord } from "../../../../store/types";
import { topDestinationAccounts, topSourceAccounts, type TopAccountMetric } from "../trafficUtils";

interface Props {
  filtered: WholesaleTrafficRecord[];
  onPickProvider?: (name: string) => void;
  onPickClient?: (name: string) => void;
}

export function TopProvidersClients({ filtered, onPickProvider, onPickClient }: Props) {
  const [metric, setMetric] = useState<TopAccountMetric>("volume");
  const providers = topSourceAccounts(filtered, metric, 6);
  const clients = topDestinationAccounts(filtered, metric, 6);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800">Top providers</h4>
          <select
            className="rounded border border-slate-200 px-1 py-0.5 text-[10px]"
            value={metric}
            onChange={(e) => setMetric(e.target.value as TopAccountMetric)}
          >
            <option value="volume">Volume</option>
            <option value="profit">Profit</option>
            <option value="margin">Margin</option>
          </select>
        </div>
        <ul className="space-y-1">
          {providers.map((p) => (
            <li key={p.name} className="flex justify-between text-[11px]">
              <button
                type="button"
                className="truncate text-left font-medium text-indigo-700 hover:underline"
                onClick={() => onPickProvider?.(p.name)}
              >
                {p.name}
              </button>
              <span className="tabular-nums text-slate-600">
                {metric === "volume" && p.volume.toLocaleString()}
                {metric === "profit" && `$${p.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                {metric === "margin" && `${(p.margin * 100).toFixed(1)}%`}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800">Top clients</h4>
          <span className="text-[10px] text-slate-400">Same metric</span>
        </div>
        <ul className="space-y-1">
          {clients.map((p) => (
            <li key={p.name} className="flex justify-between text-[11px]">
              <button
                type="button"
                className="truncate text-left font-medium text-indigo-700 hover:underline"
                onClick={() => onPickClient?.(p.name)}
              >
                {p.name}
              </button>
              <span className="tabular-nums text-slate-600">
                {metric === "volume" && p.volume.toLocaleString()}
                {metric === "profit" && `$${p.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                {metric === "margin" && `${(p.margin * 100).toFixed(1)}%`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

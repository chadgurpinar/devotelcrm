import type { WholesaleTrafficRecord } from "../../../../store/types";
import { buildDlrWatchByOperator, buildDlrWatchByProvider } from "../trafficUtils";

export function DlrWatchPanel({ filtered }: { filtered: WholesaleTrafficRecord[] }) {
  const prov = buildDlrWatchByProvider(filtered, 25_000).slice(0, 8);
  const ops = buildDlrWatchByOperator(filtered, 25_000).slice(0, 8);

  const col = (title: string, rows: typeof prov) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-[11px] text-slate-500">Lowest DLR first (min 25k submit in current filters).</p>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li key={r.key} className="flex justify-between text-[11px]">
            <span className="truncate font-medium text-slate-800">{r.label}</span>
            <span className={`tabular-nums ${r.dlr < 0.92 ? "font-semibold text-rose-600" : "text-slate-600"}`}>
              {(r.dlr * 100).toFixed(2)}%
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-[11px] text-slate-400">No rows meet threshold.</li>}
      </ul>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {col("DLR watch — providers", prov)}
      {col("DLR watch — operators", ops)}
    </div>
  );
}

import { useMemo } from "react";
import type { WholesaleTrafficRecord } from "../../../../store/types";
import { qualityScoreForAccount, topDestinationAccounts, topSourceAccounts } from "../trafficUtils";

export function QualityScorecards({ filtered }: { filtered: WholesaleTrafficRecord[] }) {
  const topProv = useMemo(
    () =>
      topSourceAccounts(filtered, "volume", 5).map((t) => {
        const q = qualityScoreForAccount(filtered, "sourceAccount", t.name);
        return { ...t, qualityScore: q.score, qualityDlr: q.dlr, qualityMargin: q.margin };
      }),
    [filtered],
  );
  const topCli = useMemo(
    () =>
      topDestinationAccounts(filtered, "volume", 5).map((t) => {
        const q = qualityScoreForAccount(filtered, "destinationAccount", t.name);
        return { ...t, qualityScore: q.score, qualityDlr: q.dlr, qualityMargin: q.margin };
      }),
    [filtered],
  );

  const block = (title: string, rows: typeof topProv) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-[11px] text-slate-500">Heuristic 0–100: DLR and margin blend (by volume leaders in-filter).</p>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2 text-[11px]">
            <div>
              <div className="font-semibold text-slate-800">{r.name}</div>
              <div className="text-slate-500">
                DLR {(r.qualityDlr * 100).toFixed(1)}% · margin {(r.qualityMargin * 100).toFixed(1)}%
              </div>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                r.qualityScore >= 75 ? "bg-emerald-100 text-emerald-800" : r.qualityScore >= 55 ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-800"
              }`}
            >
              {r.qualityScore}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {block("Provider quality", topProv)}
      {block("Client quality", topCli)}
    </div>
  );
}

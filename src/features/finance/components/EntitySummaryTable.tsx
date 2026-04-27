import type { CashflowComputed } from "../financeUtils";

function fmt(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  const sign = n < 0 ? "-" : "";
  return `${sign}€${s}`;
}

export function EntitySummaryTable({ cashflow }: { cashflow: CashflowComputed }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Per-entity summary</h3>
        <p className="text-[11px] text-slate-500">Range totals normalized to EUR via HR FX rates.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Entity</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Opening</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Inflows</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Outflows</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Net</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Closing</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Max dip</th>
            </tr>
          </thead>
          <tbody>
            {cashflow.perEntity.map((row) => (
              <tr key={row.entityId} className="border-b border-slate-100 hover:bg-slate-50/80">
                <td className="px-3 py-2 font-semibold text-slate-800">{row.entityId}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmt(row.opening)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{fmt(row.inflows)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-rose-700">{fmt(row.outflows)}</td>
                <td className={`px-3 py-2 text-right font-bold tabular-nums ${row.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {fmt(row.net)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmt(row.closing)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${row.maxDip < 0 ? "text-rose-700" : "text-slate-700"}`}>
                  {fmt(row.maxDip)}
                </td>
              </tr>
            ))}
            {cashflow.perEntity.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  No entity activity in range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

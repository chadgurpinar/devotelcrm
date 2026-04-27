import { Link } from "react-router-dom";
import type { FinInternalExpense } from "../../../store/types";

function fmt(ccy: string, n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  return `${ccy} ${s}`;
}

export function InternalExpensesPanel({ expenses }: { expenses: FinInternalExpense[] }) {
  const grouped = new Map<string, { total: number; currency: string; count: number }>();
  for (const e of expenses) {
    if (!e.active) continue;
    const cur = grouped.get(e.category) ?? { total: 0, currency: e.currency, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    grouped.set(e.category, cur);
  }
  const rows = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Internal expenses</h4>
        <Link to="/finance/internal-expenses" className="text-[11px] font-semibold text-indigo-700 hover:underline">
          Configure
        </Link>
      </div>
      <ul className="mt-2 space-y-1 text-[11px]">
        {rows.map(([category, v]) => (
          <li key={category} className="flex items-center justify-between border-b border-slate-50 py-1">
            <span className="font-semibold text-slate-800">{category}</span>
            <span className="tabular-nums text-slate-700">
              {fmt(v.currency, v.total)} <span className="text-slate-400">/mo · {v.count} item{v.count === 1 ? "" : "s"}</span>
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="py-3 text-center text-slate-400">No active recurring expenses.</li>}
      </ul>
    </div>
  );
}

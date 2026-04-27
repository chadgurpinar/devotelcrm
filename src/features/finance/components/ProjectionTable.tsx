import type { FinProjection, FinProjectionStatus } from "../../../store/types";

function fmt(ccy: string, n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  return `${ccy} ${s}`;
}

function statusBadge(status: FinProjectionStatus): string {
  if (status === "Confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "Cancelled") return "bg-slate-100 text-slate-500";
  return "bg-indigo-100 text-indigo-800";
}

export function ProjectionTable({ projections }: { projections: FinProjection[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Projections</h3>
        <p className="text-[11px] text-slate-500">{projections.length} planned/confirmed item(s)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Label</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Direction</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Entity</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Category</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Due</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                <td className="px-3 py-2 font-semibold text-slate-800">{p.label}</td>
                <td className="px-3 py-2 text-slate-700">{p.direction}</td>
                <td className="px-3 py-2 text-slate-700">{p.entityId}</td>
                <td className="px-3 py-2 text-slate-700">{p.category}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{p.dueDate}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">{fmt(p.currency, p.amount)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(p.status)}`}>{p.status}</span>
                </td>
              </tr>
            ))}
            {projections.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  No projections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

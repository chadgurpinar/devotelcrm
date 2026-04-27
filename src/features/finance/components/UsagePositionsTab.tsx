import { useUsageArApPositions } from "../useUsageArApPositions";

function fmt(ccy: string, n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  return `${ccy} ${s}`;
}

export function UsagePositionsTab({ counterpartyId }: { counterpartyId: string }) {
  const { loading, error, data } = useUsageArApPositions({ counterpartyId });

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Usage-based positions (mocked panel)</h3>
        <p className="text-[11px] text-slate-500">
          Pulled from a mock SMS/Voice panel API. Rolls over to a real backend call with the same shape.
        </p>
      </div>
      {loading && <div className="px-4 py-8 text-center text-sm text-slate-500">Loading…</div>}
      {error && <div className="px-4 py-8 text-center text-sm text-rose-600">{error}</div>}
      {!loading && !error && data.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-slate-500">No positions for this counterparty.</div>
      )}
      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Entity</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Track</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Direction</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Period</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Volume</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-3 py-2 text-slate-700">{p.entityId}</td>
                  <td className="px-3 py-2 text-slate-700">{p.track}</td>
                  <td className="px-3 py-2 text-slate-700">{p.direction}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{p.periodFrom} → {p.periodTo}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">{p.volume.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">{fmt(p.currency, p.amount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        p.status === "Confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

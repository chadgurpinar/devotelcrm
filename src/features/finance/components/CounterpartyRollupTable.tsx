import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui";

const PAGE = 20;

function fmt(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${s}`;
}

export function CounterpartyRollupTable({
  rows,
  onOpen,
}: {
  rows: Array<{ counterpartyId: string; name: string; type: string; ar: number; ap: number; nextDue?: string }>;
  onOpen: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Counterparties</h3>
          <p className="text-[11px] text-slate-500">{filtered.length} counterparties</p>
        </div>
        <input
          className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder="Search counterparty…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Name</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Type</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">AR open</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">AP open</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Net</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Next due</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const net = r.ar - r.ap;
              return (
                <tr key={r.counterpartyId} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-3 py-2">
                    <button type="button" className="max-w-[280px] truncate text-left font-semibold text-indigo-700 hover:underline" onClick={() => onOpen(r.counterpartyId)}>
                      {r.name}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.type}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">{fmt(r.ar)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">{fmt(r.ap)}</td>
                  <td className={`px-3 py-2 text-right font-bold tabular-nums ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmt(net)}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{r.nextDue ?? "—"}</td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  No counterparties match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
        <span className="text-[11px] text-slate-500">
          Page {safePage + 1} / {totalPages}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" type="button" disabled={safePage <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft size={14} />
          </Button>
          <Button size="sm" variant="outline" type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </section>
  );
}


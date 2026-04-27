import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui";
import type { FinTxStatus } from "../../../store/types";

const PAGE = 25;

type Row = {
  id: string;
  entityId: string;
  counterpartyId: string | null;
  counterpartyName: string;
  counterpartyType: string;
  direction: string;
  sourceType: string;
  status: FinTxStatus;
  issueDate: string;
  due?: string;
  aging: string;
  currency: string;
  amount: number;
  paidAmount: number;
  openAmount: number;
  description?: string;
};

function fmtMoney(ccy: string, n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  return `${ccy} ${s}`;
}

function statusBadge(status: FinTxStatus): string {
  if (status === "Overdue") return "bg-rose-100 text-rose-800";
  if (status === "PartiallyPaid") return "bg-amber-100 text-amber-900";
  if (status === "Paid") return "bg-emerald-100 text-emerald-800";
  if (status === "Planned") return "bg-slate-100 text-slate-700";
  if (status === "Cancelled") return "bg-slate-100 text-slate-500";
  return "bg-indigo-100 text-indigo-800";
}

export function ArApTable({
  title,
  rows,
  onOpenCounterparty,
  onMarkPaid,
}: {
  title: string;
  rows: Row[];
  onOpenCounterparty: (counterpartyId: string) => void;
  onMarkPaid: (txId: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.counterpartyName} ${r.description ?? ""}`.toLowerCase().includes(q));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500">{filtered.length} rows</p>
        </div>
        <input
          className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder="Search…"
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
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Counterparty</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Entity</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Due</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Aging</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Open</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Total</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                <td className="px-3 py-2">
                  {r.counterpartyId ? (
                    <button
                      type="button"
                      className="max-w-[260px] truncate text-left font-semibold text-indigo-700 hover:underline"
                      onClick={() => onOpenCounterparty(r.counterpartyId as string)}
                    >
                      {r.counterpartyName}
                    </button>
                  ) : (
                    <span className="font-semibold text-slate-700">Internal</span>
                  )}
                  <div className="text-[11px] text-slate-500">{r.description ?? `${r.sourceType}`}</div>
                </td>
                <td className="px-3 py-2 text-slate-700">{r.entityId}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{r.due}</td>
                <td className="px-3 py-2 text-[11px] text-slate-600">{r.aging}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(r.status)}`}>{r.status}</span>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">{fmtMoney(r.currency, r.openAmount)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtMoney(r.currency, r.amount)}</td>
                <td className="px-3 py-2 text-right">
                  {(r.status === "Open" || r.status === "Overdue" || r.status === "PartiallyPaid") && (
                    <Button size="sm" variant="outline" type="button" onClick={() => onMarkPaid(r.id)}>
                      Mark paid
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  No rows match your filters.
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


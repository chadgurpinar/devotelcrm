import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui";
import type { FinInternalExpense } from "../../../store/types";

function fmt(ccy: string, n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  return `${ccy} ${s}`;
}

export function InternalExpensesTable({
  rows,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  rows: FinInternalExpense[];
  onEdit: (row: FinInternalExpense) => void;
  onDelete: (id: string) => void;
  onToggleActive: (row: FinInternalExpense) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Internal expenses</h3>
        <p className="text-[11px] text-slate-500">{rows.length} configured · changes appear in Cashflow Planning automatically.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Entity</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Label</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Category</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Recurrence</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">When</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Active</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                <td className="px-3 py-2 text-slate-700">{r.entityId}</td>
                <td className="px-3 py-2 font-semibold text-slate-800">{r.label}</td>
                <td className="px-3 py-2 text-slate-700">{r.category}</td>
                <td className="px-3 py-2 text-slate-700">{r.recurrence}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                  {r.recurrence === "Monthly" ? `Day ${r.dayOfMonth ?? 1}` : r.fixedDate ?? "—"}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">{fmt(r.currency, r.amount)}</td>
                <td className="px-3 py-2">
                  <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-slate-600">
                    <input type="checkbox" checked={r.active} onChange={() => onToggleActive(r)} />
                    {r.active ? "Yes" : "No"}
                  </label>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="outline" type="button" onClick={() => onEdit(r)}>
                      <span className="inline-flex items-center gap-1">
                        <Pencil size={12} /> Edit
                      </span>
                    </Button>
                    <Button size="sm" variant="ghost" type="button" onClick={() => onDelete(r.id)}>
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <Trash2 size={12} /> Delete
                      </span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  No internal expenses configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

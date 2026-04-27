import type { FinInvoice, FinInvoiceLine, FinInvoiceStatus } from "../../../store/types";

function fmt(ccy: string, n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  return `${ccy} ${s}`;
}

function statusBadge(status: FinInvoiceStatus): string {
  if (status === "Paid") return "bg-emerald-100 text-emerald-800";
  if (status === "Overdue") return "bg-rose-100 text-rose-800";
  if (status === "PartiallyPaid") return "bg-amber-100 text-amber-900";
  if (status === "Cancelled") return "bg-slate-100 text-slate-500";
  if (status === "Draft") return "bg-slate-100 text-slate-700";
  return "bg-indigo-100 text-indigo-800";
}

export function InvoiceTable({
  invoices,
  lines,
  onSelect,
}: {
  invoices: FinInvoice[];
  lines: FinInvoiceLine[];
  onSelect?: (invoice: FinInvoice) => void;
}) {
  const lineCount = (id: string) => lines.filter((l) => l.invoiceId === id).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Invoices</h3>
        <p className="text-[11px] text-slate-500">{invoices.length} invoice(s)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Invoice</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Type</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Entity</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Issued</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Due</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Total</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Lines</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className={`border-b border-slate-100 hover:bg-slate-50/80 ${onSelect ? "cursor-pointer" : ""}`}
                onClick={() => onSelect?.(inv)}
              >
                <td className="px-3 py-2 font-semibold text-slate-800">{inv.invoiceNumber}</td>
                <td className="px-3 py-2 text-slate-700">{inv.type === "CustomerInvoice" ? "Customer" : "Supplier"}</td>
                <td className="px-3 py-2 text-slate-700">{inv.entityId}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{inv.invoiceDate}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{inv.dueDate}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">{fmt(inv.currency, inv.totalAmount)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(inv.status)}`}>{inv.status}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{lineCount(inv.id)}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

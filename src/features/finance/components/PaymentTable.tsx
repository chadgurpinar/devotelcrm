import type { FinPayment, FinPaymentApplication } from "../../../store/types";

function fmt(ccy: string, n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  return `${ccy} ${s}`;
}

export function PaymentTable({
  payments,
  applications,
}: {
  payments: FinPayment[];
  applications: FinPaymentApplication[];
}) {
  const appsByPayment = new Map<string, FinPaymentApplication[]>();
  for (const a of applications) {
    const list = appsByPayment.get(a.paymentId) ?? [];
    list.push(a);
    appsByPayment.set(a.paymentId, list);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Payments</h3>
        <p className="text-[11px] text-slate-500">{payments.length} payment(s)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Date</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Direction</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Entity</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Method</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Applied to</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const apps = appsByPayment.get(p.id) ?? [];
              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{p.paymentDate}</td>
                  <td className="px-3 py-2 text-slate-700">{p.direction}</td>
                  <td className="px-3 py-2 text-slate-700">{p.entityId}</td>
                  <td className="px-3 py-2 text-slate-700">{p.method}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">{fmt(p.currency, p.amount)}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-600">
                    {apps.length === 0 ? (
                      <span className="text-slate-400">unallocated</span>
                    ) : (
                      apps.map((a) => (
                        <div key={a.id}>
                          {a.appliedToInvoiceId ? `INV ${a.appliedToInvoiceId.slice(-6)}` : `TX ${(a.appliedToTransactionId ?? "").slice(-6)}`} —{" "}
                          {fmt(p.currency, a.appliedAmount)}
                        </div>
                      ))
                    )}
                  </td>
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

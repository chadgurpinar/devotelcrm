import { useMemo, useState } from "react";
import { Button } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import type { FinCounterparty, FinPaymentMethod, HrCurrencyCode, OurEntity } from "../../../store/types";
import { isOpenLikeStatus, openAmount } from "../financeUtils";

const inputCls =
  "w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none";

export function PaymentFormModal({
  open,
  counterparty,
  onClose,
}: {
  open: boolean;
  counterparty: FinCounterparty;
  onClose: () => void;
}) {
  const addPayment = useAppStore((s) => s.addFinPayment);
  const transactions = useAppStore((s) => s.finArApTransactions);

  const today = new Date().toISOString().slice(0, 10);
  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [paymentDate, setPaymentDate] = useState(today);
  const [direction, setDirection] = useState<"Incoming" | "Outgoing">(
    counterparty.type === "Provider" ? "Outgoing" : "Incoming",
  );
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<HrCurrencyCode>(counterparty.defaultCurrency);
  const [method, setMethod] = useState<FinPaymentMethod>("BankTransfer");
  const [reference, setReference] = useState("");
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const outstanding = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.counterpartyId === counterparty.id &&
          isOpenLikeStatus(t.status) &&
          t.direction === (direction === "Incoming" ? "Receivable" : "Payable"),
      )
      .map((t) => ({ ...t, openAmount: openAmount(t) }))
      .filter((t) => t.openAmount > 0)
      .sort((a, b) => (a.dueDate ?? a.issueDate).localeCompare(b.dueDate ?? b.issueDate));
  }, [transactions, counterparty.id, direction]);

  const allocatedTotal = Object.values(allocations).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);

  if (!open) return null;

  const submit = () => {
    if (amount <= 0) return;
    const apps = Object.entries(allocations)
      .filter(([, v]) => v > 0)
      .map(([txId, v]) => ({ appliedToTransactionId: txId, appliedAmount: Math.round(v * 100) / 100 }));
    addPayment(
      {
        entityId,
        counterpartyId: counterparty.id,
        direction,
        paymentDate,
        amount: Math.round(amount * 100) / 100,
        currency,
        method,
        reference: reference.trim() || undefined,
      },
      apps,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Add payment — {counterparty.name}</h3>
        <p className="mt-1 text-xs text-slate-500">
          Allocate to outstanding transactions. Status of those transactions updates automatically.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">
            Direction
            <select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value as "Incoming" | "Outgoing")}>
              <option value="Incoming">Incoming (customer paid us)</option>
              <option value="Outgoing">Outgoing (we paid supplier)</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Entity
            <select className={inputCls} value={entityId} onChange={(e) => setEntityId(e.target.value as OurEntity)}>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="TR">TR</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Payment date
            <input type="date" className={inputCls} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Method
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as FinPaymentMethod)}>
              <option value="BankTransfer">Bank transfer</option>
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Amount
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={Number.isFinite(amount) ? amount : 0}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Currency
            <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as HrCurrencyCode)}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="TRY">TRY</option>
            </select>
          </label>
          <label className="col-span-2 text-xs font-semibold text-slate-600">
            Reference
            <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank reference / memo" />
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200">
          <div className="border-b border-slate-100 px-3 py-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Apply to outstanding</h4>
            <p className="text-[11px] text-slate-500">
              Allocated {currency} {allocatedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} of {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="max-h-64 overflow-auto">
            {outstanding.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-500">No matching outstanding items.</p>}
            {outstanding.map((tx) => (
              <div key={tx.id} className="grid grid-cols-12 items-center gap-2 border-b border-slate-50 px-3 py-2 text-[11px]">
                <span className="col-span-5 truncate text-slate-700">{tx.description ?? tx.sourceType}</span>
                <span className="col-span-2 font-mono text-slate-600">{tx.dueDate ?? tx.issueDate}</span>
                <span className="col-span-2 text-right tabular-nums text-slate-800">
                  {tx.currency} {tx.openAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <input
                  type="number"
                  step="0.01"
                  className={`${inputCls} col-span-3 text-right tabular-nums`}
                  value={allocations[tx.id] ?? 0}
                  onChange={(e) => setAllocations((prev) => ({ ...prev, [tx.id]: Number(e.target.value) }))}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={amount <= 0}>
            Add payment
          </Button>
        </div>
      </div>
    </div>
  );
}

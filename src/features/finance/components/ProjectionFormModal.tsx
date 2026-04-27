import { useState } from "react";
import { Button } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import type {
  FinCounterparty,
  FinDirection,
  FinProjectionCategory,
  FinProjectionStatus,
  HrCurrencyCode,
  OurEntity,
} from "../../../store/types";

const inputCls =
  "w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none";

export function ProjectionFormModal({
  open,
  counterparty,
  onClose,
}: {
  open: boolean;
  counterparty?: FinCounterparty;
  onClose: () => void;
}) {
  const addProjection = useAppStore((s) => s.addFinProjection);
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [direction, setDirection] = useState<FinDirection>(
    counterparty?.type === "Provider" ? "Payable" : "Receivable",
  );
  const [label, setLabel] = useState(counterparty ? `Expected payment — ${counterparty.name}` : "Future cash item");
  const [dueDate, setDueDate] = useState(due);
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<HrCurrencyCode>(counterparty?.defaultCurrency ?? "EUR");
  const [category, setCategory] = useState<FinProjectionCategory>(counterparty?.type === "Provider" ? "Provider" : "Customer");
  const [status, setStatus] = useState<FinProjectionStatus>("Planned");
  const [confidence, setConfidence] = useState(0.7);

  if (!open) return null;

  const submit = () => {
    if (amount <= 0) return;
    addProjection({
      entityId,
      counterpartyId: counterparty?.id,
      direction,
      label: label.trim() || "Projection",
      dueDate,
      amount: Math.round(amount * 100) / 100,
      currency,
      category,
      status,
      confidence,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">
          New projection {counterparty ? `— ${counterparty.name}` : ""}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Future-dated expected inflow/outflow. Appears in AR/AP overview and the cashflow chart.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-xs font-semibold text-slate-600">
            Label
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Direction
            <select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value as FinDirection)}>
              <option value="Receivable">Receivable (inflow)</option>
              <option value="Payable">Payable (outflow)</option>
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
            Due date
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Category
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as FinProjectionCategory)}>
              {["Customer", "Provider", "Salary", "Rent", "Tax", "Card", "Loan", "Other"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
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
          <label className="text-xs font-semibold text-slate-600">
            Status
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as FinProjectionStatus)}>
              <option value="Planned">Planned</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Confidence (0–1)
            <input
              type="number"
              step="0.05"
              min={0}
              max={1}
              className={`${inputCls} text-right tabular-nums`}
              value={confidence}
              onChange={(e) => setConfidence(Math.max(0, Math.min(1, Number(e.target.value))))}
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={amount <= 0}>
            Save projection
          </Button>
        </div>
      </div>
    </div>
  );
}

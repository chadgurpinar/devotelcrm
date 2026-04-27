import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import type {
  FinCounterparty,
  FinInvoiceServiceType,
  FinInvoiceType,
  HrCurrencyCode,
  OurEntity,
} from "../../../store/types";

const inputCls =
  "w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none";

interface DraftLine {
  description: string;
  serviceType: FinInvoiceServiceType;
  amount: number;
  periodFrom?: string;
  periodTo?: string;
}

export function InvoiceFormModal({
  open,
  counterparty,
  onClose,
}: {
  open: boolean;
  counterparty: FinCounterparty;
  onClose: () => void;
}) {
  const createInvoice = useAppStore((s) => s.createFinInvoice);
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [type, setType] = useState<FinInvoiceType>(counterparty.type === "Provider" ? "SupplierInvoice" : "CustomerInvoice");
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(due);
  const [currency, setCurrency] = useState<HrCurrencyCode>(counterparty.defaultCurrency);
  const [lines, setLines] = useState<DraftLine[]>([
    { description: "Monthly traffic", serviceType: "SMS", amount: 0 },
  ]);

  if (!open) return null;
  const total = lines.reduce((sum, l) => sum + (Number.isFinite(l.amount) ? l.amount : 0), 0);

  const updateLine = (idx: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const submit = () => {
    if (total <= 0) return;
    createInvoice(
      {
        entityId,
        counterpartyId: counterparty.id,
        type,
        invoiceNumber: invoiceNumber.trim() || `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate,
        dueDate,
        currency,
        totalAmount: Math.round(total * 100) / 100,
        status: "Issued",
      },
      lines.map((l) => ({
        description: l.description.trim() || "—",
        serviceType: l.serviceType,
        amount: Math.round(l.amount * 100) / 100,
        periodFrom: l.periodFrom,
        periodTo: l.periodTo,
      })),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">New invoice — {counterparty.name}</h3>
        <p className="mt-1 text-xs text-slate-500">Posting an invoice creates a matching AR/AP transaction (sourceType = Invoice).</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">
            Type
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as FinInvoiceType)}>
              <option value="CustomerInvoice">Customer invoice (AR)</option>
              <option value="SupplierInvoice">Supplier invoice (AP)</option>
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
            Invoice number
            <input className={inputCls} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
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
            Invoice date
            <input type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Due date
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Lines</h4>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setLines((prev) => [...prev, { description: "", serviceType: "SMS", amount: 0 }])}
            >
              <span className="inline-flex items-center gap-1">
                <Plus size={12} /> Add line
              </span>
            </Button>
          </div>
          <div className="p-2">
            {lines.map((l, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-12 gap-2">
                <input
                  className={`${inputCls} col-span-5`}
                  placeholder="Description"
                  value={l.description}
                  onChange={(e) => updateLine(idx, { description: e.target.value })}
                />
                <select
                  className={`${inputCls} col-span-2`}
                  value={l.serviceType}
                  onChange={(e) => updateLine(idx, { serviceType: e.target.value as FinInvoiceServiceType })}
                >
                  <option value="SMS">SMS</option>
                  <option value="Voice">Voice</option>
                  <option value="Setup">Setup</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  className={`${inputCls} col-span-4 text-right tabular-nums`}
                  value={Number.isFinite(l.amount) ? l.amount : 0}
                  onChange={(e) => updateLine(idx, { amount: Number(e.target.value) })}
                />
                <button
                  type="button"
                  className="col-span-1 inline-flex items-center justify-center rounded text-rose-600 hover:bg-rose-50"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove line"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-3 py-2 text-right text-xs">
            <span className="text-slate-500">Total: </span>
            <span className="font-bold text-slate-800">
              {currency} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={total <= 0}>
            Create invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

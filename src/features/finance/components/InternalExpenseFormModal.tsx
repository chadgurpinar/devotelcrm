import { useEffect, useState } from "react";
import { Button } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import type {
  FinExpenseRecurrence,
  FinInternalExpense,
  FinInternalExpenseCategory,
  HrCurrencyCode,
  OurEntity,
} from "../../../store/types";

const inputCls =
  "w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none";

const CATEGORIES: FinInternalExpenseCategory[] = ["Salary", "Rent", "Tax", "Card", "Loan", "Software", "Other"];

export function InternalExpenseFormModal({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial?: FinInternalExpense | null;
  onClose: () => void;
}) {
  const upsert = useAppStore((s) => s.upsertFinInternalExpense);

  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<FinInternalExpenseCategory>("Other");
  const [recurrence, setRecurrence] = useState<FinExpenseRecurrence>("Monthly");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<HrCurrencyCode>("EUR");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [fixedDate, setFixedDate] = useState(new Date().toISOString().slice(0, 10));
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setEntityId(initial.entityId);
      setLabel(initial.label);
      setCategory(initial.category);
      setRecurrence(initial.recurrence);
      setAmount(initial.amount);
      setCurrency(initial.currency);
      setDayOfMonth(initial.dayOfMonth ?? 1);
      setFixedDate(initial.fixedDate ?? new Date().toISOString().slice(0, 10));
      setActive(initial.active);
      setNotes(initial.notes ?? "");
    } else {
      setEntityId("UK");
      setLabel("");
      setCategory("Other");
      setRecurrence("Monthly");
      setAmount(0);
      setCurrency("EUR");
      setDayOfMonth(1);
      setFixedDate(new Date().toISOString().slice(0, 10));
      setActive(true);
      setNotes("");
    }
  }, [open, initial]);

  if (!open) return null;

  const submit = () => {
    if (!label.trim() || amount <= 0) return;
    upsert({
      id: initial?.id,
      entityId,
      label: label.trim(),
      category,
      recurrence,
      amount: Math.round(amount * 100) / 100,
      currency,
      dayOfMonth: recurrence === "Monthly" ? dayOfMonth : undefined,
      fixedDate: recurrence === "OneOff" ? fixedDate : undefined,
      active,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{initial ? "Edit expense" : "New internal expense"}</h3>
        <p className="mt-1 text-xs text-slate-500">Configure recurring or one-off cash outflows used by the cashflow chart.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-xs font-semibold text-slate-600">
            Label
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Office rent — London" />
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
            Category
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as FinInternalExpenseCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Recurrence
            <select className={inputCls} value={recurrence} onChange={(e) => setRecurrence(e.target.value as FinExpenseRecurrence)}>
              <option value="Monthly">Monthly</option>
              <option value="OneOff">One-off</option>
            </select>
          </label>
          {recurrence === "Monthly" ? (
            <label className="text-xs font-semibold text-slate-600">
              Day of month
              <input
                type="number"
                min={1}
                max={31}
                className={inputCls}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value))))}
              />
            </label>
          ) : (
            <label className="text-xs font-semibold text-slate-600">
              Date
              <input type="date" className={inputCls} value={fixedDate} onChange={(e) => setFixedDate(e.target.value)} />
            </label>
          )}
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
          <label className="col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (include in cashflow projections)
          </label>
          <label className="col-span-2 text-xs font-semibold text-slate-600">
            Notes
            <textarea className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!label.trim() || amount <= 0}>
            {initial ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </div>
    </div>
  );
}

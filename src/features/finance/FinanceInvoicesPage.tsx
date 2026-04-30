import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FileSearch,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import type {
  FinanceCounterparty,
  FinanceCounterpartyType,
  FinanceCurrencyCode,
  FinanceInvoice,
  FinanceInvoiceLine,
  FinanceInvoiceServiceType,
  FinanceInvoiceStatus,
  FinanceInvoiceType,
  OurEntity,
} from "../../store/types";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { UiPageHeader } from "../../ui/UiPageHeader";

// ─── Local helpers ───────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<FinanceCurrencyCode, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  TRY: "₺",
  CHF: "CHF ",
  AED: "AED ",
};

const FX_TO_EUR: Record<FinanceCurrencyCode, number> = {
  EUR: 1,
  GBP: 1.18,
  USD: 0.92,
  TRY: 0.028,
  CHF: 1.05,
  AED: 0.25,
};

const ENTITY_FLAGS: Record<OurEntity, string> = {
  UK: "🇬🇧",
  USA: "🇺🇸",
  TR: "🇹🇷",
};

const ALL_ENTITIES: readonly OurEntity[] = ["UK", "USA", "TR"] as const;
const ALL_CURRENCIES: readonly FinanceCurrencyCode[] = ["EUR", "USD", "GBP", "TRY", "CHF", "AED"] as const;
const ALL_STATUSES: readonly FinanceInvoiceStatus[] = ["Draft", "Issued", "PartiallyPaid", "Paid", "Overdue", "Cancelled"] as const;
const ALL_SERVICE_TYPES: readonly FinanceInvoiceServiceType[] = ["SMS", "Voice", "Platform", "Consulting", "Other"] as const;

const PAGE_SIZE = 20;

const inputCls =
  "w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none";

function fmtEur(amount: number): string {
  return `€${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtOriginal(amount: number, currency: FinanceCurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function approxEur(amount: number, currency: FinanceCurrencyCode): number {
  const rate = FX_TO_EUR[currency] ?? 1;
  return Math.round(amount * rate);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function daysFromToday(ymd: string): number {
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(parseYmd(ymd)).getTime();
  return Math.floor((target - today) / (24 * 60 * 60 * 1000));
}

function isOpenInvoice(inv: FinanceInvoice): boolean {
  return inv.status !== "Paid" && inv.status !== "Cancelled";
}

function isOverdueInvoice(inv: FinanceInvoice): boolean {
  if (inv.status === "Overdue") return true;
  if (!isOpenInvoice(inv)) return false;
  return daysFromToday(inv.dueDate) < 0;
}

function isInCurrentMonth(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ─── Badges ──────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: FinanceInvoiceStatus }) {
  if (value === "Cancelled") {
    return <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-gray-500 line-through">{value}</span>;
  }
  const styles: Record<FinanceInvoiceStatus, string> = {
    Draft: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
    Issued: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    PartiallyPaid: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Overdue: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    Cancelled: "",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[value]}`}>{value}</span>;
}

function TypeBadge({ value }: { value: FinanceInvoiceType }) {
  const isCustomer = value === "CustomerInvoice";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
        isCustomer ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-violet-50 text-violet-700 ring-violet-200"
      }`}
    >
      {isCustomer ? "Customer" : "Supplier"}
    </span>
  );
}

// ─── Two-step Add / Edit modal ───────────────────────────────────────

interface InvoiceFormModalProps {
  open: boolean;
  onClose: () => void;
  editing?: FinanceInvoice | null;
}

interface LineDraft {
  key: string;
  description: string;
  serviceType: FinanceInvoiceServiceType;
  periodFrom: string;
  periodTo: string;
  amountOriginal: number;
}

function emptyLine(): LineDraft {
  return {
    key: `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    description: "",
    serviceType: "SMS",
    periodFrom: "",
    periodTo: "",
    amountOriginal: 0,
  };
}

function InvoiceFormModal({ open, onClose, editing }: InvoiceFormModalProps) {
  const counterparties = useAppStore((s) => s.financeCounterparties);
  const addInvoice = useAppStore((s) => s.addFinanceInvoice);
  const updateInvoice = useAppStore((s) => s.updateFinanceInvoice);
  const addCounterparty = useAppStore((s) => s.addFinanceCounterparty);

  const today = new Date().toISOString().slice(0, 10);

  const [step, setStep] = useState<1 | 2>(1);
  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [type, setType] = useState<FinanceInvoiceType>("CustomerInvoice");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [creatingCp, setCreatingCp] = useState(false);
  const [newCpName, setNewCpName] = useState("");
  const [newCpType, setNewCpType] = useState<FinanceCounterpartyType>("Customer");
  const [newCpCurrency, setNewCpCurrency] = useState<FinanceCurrencyCode>("EUR");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [currency, setCurrency] = useState<FinanceCurrencyCode>("EUR");
  const [status, setStatus] = useState<FinanceInvoiceStatus>("Draft");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    if (editing) {
      setEntityId(editing.entityId);
      setType(editing.type);
      setCounterpartyId(editing.counterpartyId);
      setCreatingCp(false);
      setInvoiceNumber(editing.invoiceNumber);
      setInvoiceDate(editing.invoiceDate);
      setDueDate(editing.dueDate);
      setCurrency(editing.currency);
      setStatus(editing.status);
      setNotes(editing.notes ?? "");
      setLines(
        editing.lines.length === 0
          ? [emptyLine()]
          : editing.lines.map((l, idx) => ({
              key: `l-${idx}-${l.id}`,
              description: l.description,
              serviceType: l.serviceType,
              periodFrom: l.periodFrom ?? "",
              periodTo: l.periodTo ?? "",
              amountOriginal: l.amountOriginal,
            })),
      );
      return;
    }
    setEntityId("UK");
    setType("CustomerInvoice");
    setCounterpartyId("");
    setCreatingCp(false);
    setNewCpName("");
    setNewCpType("Customer");
    setNewCpCurrency("EUR");
    setInvoiceNumber("");
    setInvoiceDate(today);
    setDueDate(today);
    setCurrency("EUR");
    setStatus("Draft");
    setNotes("");
    setLines([emptyLine()]);
  }, [open, editing, today]);

  const subtotal = lines.reduce((s, l) => s + (Number.isFinite(l.amountOriginal) ? l.amountOriginal : 0), 0);
  const subtotalEur = approxEur(subtotal, currency);

  if (!open) return null;

  const updateLine = (idx: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const validLineCount = lines.filter((l) => l.amountOriginal > 0).length;
  const step1Valid =
    invoiceNumber.trim().length > 0 &&
    (creatingCp ? newCpName.trim().length > 0 : counterpartyId.length > 0) &&
    invoiceDate.length > 0 &&
    dueDate.length > 0;

  const submit = () => {
    if (validLineCount === 0) return;

    let cpId = counterpartyId;
    if (creatingCp) {
      const trimmed = newCpName.trim();
      if (!trimmed) return;
      cpId = addCounterparty({
        type: newCpType,
        name: trimmed,
        defaultCurrency: newCpCurrency,
      });
    }
    if (!cpId) return;

    const invoiceLines: FinanceInvoiceLine[] = lines
      .filter((l) => l.amountOriginal > 0)
      .map((l, i) => ({
        id: editing && editing.lines[i] ? editing.lines[i]!.id : `tmp-${i}`,
        invoiceId: editing?.id ?? "tmp",
        description: l.description.trim() || "—",
        serviceType: l.serviceType,
        periodFrom: l.periodFrom || undefined,
        periodTo: l.periodTo || undefined,
        amountOriginal: Math.round(l.amountOriginal * 100) / 100,
        currency,
      }));

    const totalOriginal = Math.round(subtotal * 100) / 100;
    const totalEur = approxEur(totalOriginal, currency);

    if (editing) {
      updateInvoice({
        ...editing,
        entityId,
        counterpartyId: cpId,
        type,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        dueDate,
        currency,
        amountOriginal: totalOriginal,
        amountEur: totalEur,
        status,
        lines: invoiceLines,
        notes: notes.trim() || undefined,
      });
    } else {
      addInvoice({
        entityId,
        counterpartyId: cpId,
        type,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        dueDate,
        currency,
        amountOriginal: totalOriginal,
        amountEur: totalEur,
        status,
        lines: invoiceLines,
        notes: notes.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">{editing ? "Edit invoice" : "New invoice"}</h3>
        <p className="mt-1 text-xs text-gray-500">
          {editing
            ? "Saving keeps the linked AR/AP item in sync automatically."
            : "Saving with status Issued / PartiallyPaid / Overdue creates a matching AR/AP item automatically."}
        </p>

        {/* Step indicator */}
        <div className="mt-4 flex items-center gap-3 text-xs">
          <span className={step === 1 ? "font-bold text-indigo-700" : "text-gray-400"}>① Invoice Details</span>
          <span className="text-gray-300">→</span>
          <span className={step === 2 ? "font-bold text-indigo-700" : "text-gray-400"}>② Line Items</span>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-700">
              Entity
              <select className={inputCls} value={entityId} onChange={(e) => setEntityId(e.target.value as OurEntity)}>
                {ALL_ENTITIES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Type
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as FinanceInvoiceType)}>
                <option value="CustomerInvoice">Customer invoice</option>
                <option value="SupplierInvoice">Supplier invoice</option>
              </select>
            </label>

            <label className="col-span-2 text-xs font-semibold text-gray-700">
              Counterparty
              <select
                className={inputCls}
                value={creatingCp ? "__new__" : counterpartyId}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setCreatingCp(true);
                  } else {
                    setCreatingCp(false);
                    setCounterpartyId(e.target.value);
                  }
                }}
              >
                <option value="">Select counterparty…</option>
                {counterparties.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
                <option value="__new__">+ Create new counterparty</option>
              </select>
            </label>

            {creatingCp && (
              <div className="col-span-2 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/30 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">New counterparty</p>
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-[11px] font-semibold text-gray-700">
                    Name
                    <input className={inputCls} value={newCpName} onChange={(e) => setNewCpName(e.target.value)} placeholder="Counterparty name" />
                  </label>
                  <label className="text-[11px] font-semibold text-gray-700">
                    Type
                    <select className={inputCls} value={newCpType} onChange={(e) => setNewCpType(e.target.value as FinanceCounterpartyType)}>
                      <option value="Customer">Customer</option>
                      <option value="Provider">Provider</option>
                      <option value="Internal">Internal</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold text-gray-700">
                    Currency
                    <select className={inputCls} value={newCpCurrency} onChange={(e) => setNewCpCurrency(e.target.value as FinanceCurrencyCode)}>
                      {ALL_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}

            <label className="text-xs font-semibold text-gray-700">
              Invoice number
              <input className={inputCls} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="C-UK-2026-0099" />
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Status
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as FinanceInvoiceStatus)}>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Invoice date
              <input type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Due date
              <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Currency
              <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as FinanceCurrencyCode)}>
                {ALL_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="col-span-2 text-xs font-semibold text-gray-700">
              Notes <span className="text-gray-400">(optional)</span>
              <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="mt-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                Lines · {lines.length} {lines.length === 1 ? "row" : "rows"}
              </h4>
              <Button size="sm" variant="outline" type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
                <span className="inline-flex items-center gap-1">
                  <Plus size={12} /> Add Line
                </span>
              </Button>
            </div>
            <div className="p-2 space-y-2">
              {lines.map((l, idx) => (
                <div key={l.key} className="grid grid-cols-12 gap-2">
                  <input
                    className={`${inputCls} col-span-4`}
                    placeholder="Description"
                    value={l.description}
                    onChange={(e) => updateLine(idx, { description: e.target.value })}
                  />
                  <select
                    className={`${inputCls} col-span-2`}
                    value={l.serviceType}
                    onChange={(e) => updateLine(idx, { serviceType: e.target.value as FinanceInvoiceServiceType })}
                  >
                    {ALL_SERVICE_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className={`${inputCls} col-span-2`}
                    value={l.periodFrom}
                    onChange={(e) => updateLine(idx, { periodFrom: e.target.value })}
                    title="Period from"
                  />
                  <input
                    type="date"
                    className={`${inputCls} col-span-2`}
                    value={l.periodTo}
                    onChange={(e) => updateLine(idx, { periodTo: e.target.value })}
                    title="Period to"
                  />
                  <input
                    type="number"
                    step="0.01"
                    className={`${inputCls} col-span-1 text-right tabular-nums`}
                    value={Number.isFinite(l.amountOriginal) ? l.amountOriginal : 0}
                    onChange={(e) => updateLine(idx, { amountOriginal: Number(e.target.value) })}
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
              {lines.length === 0 && (
                <p className="px-1 py-3 text-center text-xs text-gray-500">No lines. Click "Add Line" to begin.</p>
              )}
            </div>
            <div className="border-t border-gray-100 px-3 py-2 text-right text-xs text-gray-700">
              Subtotal: <span className="font-semibold">{fmtOriginal(subtotal, currency)}</span>
              <span className="mx-2 text-gray-300">·</span>
              EUR (auto): <span className="font-semibold">{fmtEur(subtotalEur)}</span>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="secondary" type="button" onClick={() => setStep(1)}>
                <span className="inline-flex items-center gap-1">
                  <ChevronLeft size={14} /> Back
                </span>
              </Button>
            )}
            {step === 1 ? (
              <Button type="button" disabled={!step1Valid} onClick={() => setStep(2)}>
                <span className="inline-flex items-center gap-1">
                  Next <ChevronRight size={14} />
                </span>
              </Button>
            ) : (
              <Button type="button" disabled={validLineCount === 0} onClick={submit}>
                {editing ? "Save changes" : "Save Invoice"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mark as Paid modal ──────────────────────────────────────────────

function MarkAsPaidModal({
  open,
  onClose,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  invoice: FinanceInvoice | null;
}) {
  const updateInvoice = useAppStore((s) => s.updateFinanceInvoice);
  const today = new Date().toISOString().slice(0, 10);

  const [paidDate, setPaidDate] = useState(today);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidEur, setPaidEur] = useState(0);
  const [eurOverridden, setEurOverridden] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !invoice) return;
    setPaidDate(today);
    setPaidAmount(invoice.amountOriginal);
    setPaidEur(invoice.amountEur);
    setEurOverridden(false);
    setNotes(invoice.notes ?? "");
  }, [open, invoice, today]);

  useEffect(() => {
    if (eurOverridden || !invoice) return;
    setPaidEur(approxEur(paidAmount, invoice.currency));
  }, [paidAmount, invoice, eurOverridden]);

  if (!open || !invoice) return null;

  const submit = () => {
    if (paidAmount <= 0) return;
    updateInvoice({
      ...invoice,
      status: "Paid",
      paidAmountOriginal: Math.round(paidAmount * 100) / 100,
      paidAmountEur: Math.round(paidEur * 100) / 100,
      notes: notes.trim() || invoice.notes,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Mark invoice as paid</h3>
        <p className="mt-1 text-xs text-gray-500">
          {invoice.invoiceNumber} · total {fmtOriginal(invoice.amountOriginal, invoice.currency)}
        </p>
        <p className="mt-1 text-[11px] text-amber-700">Linked AR/AP item is updated automatically.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-700">
            Paid date
            <input type="date" className={inputCls} value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Paid amount ({invoice.currency})
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={Number.isFinite(paidAmount) ? paidAmount : 0}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
            />
          </label>
          <label className="col-span-2 text-xs font-semibold text-gray-700">
            EUR equivalent {!eurOverridden && <span className="text-gray-400">(auto)</span>}
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={Number.isFinite(paidEur) ? paidEur : 0}
              onChange={(e) => {
                setEurOverridden(true);
                setPaidEur(Number(e.target.value));
              }}
            />
          </label>
          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Notes <span className="text-gray-400">(optional)</span>
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={paidAmount <= 0}>
            Mark paid
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

type EntityFilter = "All" | OurEntity;
type TypeFilter = "All" | "Customer" | "Supplier";
type StatusFilter = "All" | FinanceInvoiceStatus;
type SortKey = "invoiceDate" | "dueDate" | "amountOriginal" | "amountEur";
type SortDir = "asc" | "desc";

export function FinanceInvoicesPage() {
  const invoices = useAppStore((s) => s.financeInvoices);
  const counterparties = useAppStore((s) => s.financeCounterparties);
  const deleteInvoice = useAppStore((s) => s.deleteFinanceInvoice);

  const [entityFilter, setEntityFilter] = useState<EntityFilter>("All");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("invoiceDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceInvoice | null>(null);
  const [payTarget, setPayTarget] = useState<FinanceInvoice | null>(null);

  // Debounce search input.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 200);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const cpById = useMemo(() => {
    const m = new Map<string, FinanceCounterparty>();
    for (const c of counterparties) m.set(c.id, c);
    return m;
  }, [counterparties]);

  // KPIs from full unfiltered set.
  const kpis = useMemo(() => {
    let outstandingCustomer = 0;
    let outstandingSupplier = 0;
    let overdue = 0;
    let paidThisMonth = 0;
    for (const inv of invoices) {
      const isOpen = isOpenInvoice(inv);
      if (isOpen) {
        if (inv.type === "CustomerInvoice") outstandingCustomer += inv.amountEur;
        else outstandingSupplier += inv.amountEur;
      }
      if (isOverdueInvoice(inv)) overdue += 1;
      if (inv.status === "Paid" && isInCurrentMonth(inv.updatedAt)) paidThisMonth += 1;
    }
    return { outstandingCustomer, outstandingSupplier, overdue, paidThisMonth };
  }, [invoices]);

  // Filtered + sorted list.
  const visible = useMemo(() => {
    const list = invoices.filter((inv) => {
      if (entityFilter !== "All" && inv.entityId !== entityFilter) return false;
      if (typeFilter === "Customer" && inv.type !== "CustomerInvoice") return false;
      if (typeFilter === "Supplier" && inv.type !== "SupplierInvoice") return false;
      if (statusFilter !== "All" && inv.status !== statusFilter) return false;
      if (debouncedSearch) {
        const cpName = cpById.get(inv.counterpartyId)?.name?.toLowerCase() ?? "";
        const hay = `${inv.invoiceNumber.toLowerCase()} ${cpName}`;
        if (!hay.includes(debouncedSearch)) return false;
      }
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "invoiceDate":
          return dir * a.invoiceDate.localeCompare(b.invoiceDate);
        case "dueDate":
          return dir * a.dueDate.localeCompare(b.dueDate);
        case "amountOriginal":
          return dir * (a.amountOriginal - b.amountOriginal);
        case "amountEur":
          return dir * (a.amountEur - b.amountEur);
        default:
          return 0;
      }
    });
    return list;
  }, [invoices, entityFilter, typeFilter, statusFilter, debouncedSearch, sortKey, sortDir, cpById]);

  // Reset to first page when the filter set changes.
  useEffect(() => {
    setPage(0);
  }, [entityFilter, typeFilter, statusFilter, debouncedSearch, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = visible.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const showingFrom = visible.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const showingTo = Math.min(visible.length, safePage * PAGE_SIZE + PAGE_SIZE);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronsUpDown size={11} className="opacity-40" />;
    return sortDir === "asc" ? <ChevronRight size={11} className="rotate-90" /> : <ChevronRight size={11} className="-rotate-90" />;
  };

  const isFiltered =
    entityFilter !== "All" || typeFilter !== "All" || statusFilter !== "All" || debouncedSearch.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <UiPageHeader title="Invoices" subtitle="Customer and supplier invoices across all entities" />
        <Button type="button" onClick={openAdd}>
          <span className="inline-flex items-center gap-1">
            <Plus size={14} /> New Invoice
          </span>
        </Button>
      </div>

      {/* Section 1 — KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiKpiCard
          label="Outstanding (Customer)"
          value={fmtEur(kpis.outstandingCustomer)}
          icon={<ArrowDownRight className="h-5 w-5" />}
          trend={{ value: "Receivable", positive: true }}
        />
        <UiKpiCard
          label="Outstanding (Supplier)"
          value={fmtEur(kpis.outstandingSupplier)}
          icon={<ArrowUpRight className="h-5 w-5" />}
          trend={{ value: "Payable", positive: false }}
        />
        <UiKpiCard
          label="Overdue"
          value={kpis.overdue}
          icon={<AlertCircle className="h-5 w-5" />}
          className={kpis.overdue > 0 ? "border-rose-200 bg-rose-50/50" : ""}
        />
        <UiKpiCard
          label="Paid This Month"
          value={kpis.paidThisMonth}
          icon={<CheckCircle2 className="h-5 w-5" />}
          className={kpis.paidThisMonth > 0 ? "border-emerald-200 bg-emerald-50/50" : ""}
        />
      </div>

      {/* Section 2 — Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-gray-600">
            Entity
            <select
              className={`${inputCls} ml-2 inline-block w-auto`}
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as EntityFilter)}
            >
              <option value="All">All Entities</option>
              {ALL_ENTITIES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>

          <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs">
            {(["All", "Customer", "Supplier"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`rounded-md px-3 py-1 font-semibold ${
                  typeFilter === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="text-xs font-semibold text-gray-600">
            Status
            <select
              className={`${inputCls} ml-2 inline-block w-auto`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="All">All</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <input
            className={`${inputCls} w-64`}
            placeholder="Search invoice # or counterparty…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <Button type="button" onClick={openAdd}>
          <span className="inline-flex items-center gap-1">
            <Plus size={14} /> New Invoice
          </span>
        </Button>
      </div>

      {/* Section 3 — Invoice table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">All invoices</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {visible.length} matching · {invoices.length} total
          </p>
        </div>

        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <FileText className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No invoices yet</p>
            <Button className="mt-3" type="button" onClick={openAdd}>
              <span className="inline-flex items-center gap-1">
                <Plus size={14} /> New Invoice
              </span>
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <FileSearch className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">
              {isFiltered ? "No invoices match the current filters" : "No invoices to display"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50/80">
                  <tr>
                    <th className="w-10 px-3 py-2"></th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Invoice #</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Counterparty</th>
                    <th
                      className="cursor-pointer px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800"
                      onClick={() => toggleSort("invoiceDate")}
                    >
                      <span className="inline-flex items-center gap-1">Invoice Date {sortIcon("invoiceDate")}</span>
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800"
                      onClick={() => toggleSort("dueDate")}
                    >
                      <span className="inline-flex items-center gap-1">Due Date {sortIcon("dueDate")}</span>
                    </th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Cur.</th>
                    <th
                      className="cursor-pointer px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800 text-right"
                      onClick={() => toggleSort("amountOriginal")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">Amount {sortIcon("amountOriginal")}</span>
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800 text-right"
                      onClick={() => toggleSort("amountEur")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">EUR {sortIcon("amountEur")}</span>
                    </th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((inv) => {
                    const cp = cpById.get(inv.counterpartyId);
                    const isExpanded = expanded.has(inv.id);
                    const overdueRow = isOverdueInvoice(inv);
                    const days = daysFromToday(inv.dueDate);
                    const dueClass =
                      overdueRow
                        ? "text-rose-700 font-semibold"
                        : isOpenInvoice(inv) && days <= 7
                        ? "text-amber-700 font-semibold"
                        : "text-gray-700";
                    return (
                      <Fragment key={inv.id}>
                        <tr className="border-b border-gray-50 hover:bg-gray-50/80">
                          <td className="w-10 px-3 py-2">
                            <button
                              type="button"
                              className="rounded p-1 text-gray-500 hover:bg-gray-100"
                              onClick={() => toggleExpanded(inv.id)}
                              aria-label={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="font-mono text-xs font-semibold text-indigo-700 hover:underline"
                              onClick={() => toggleExpanded(inv.id)}
                            >
                              {inv.invoiceNumber}
                            </button>
                          </td>
                          <td className="px-3 py-2"><TypeBadge value={inv.type} /></td>
                          <td className="px-3 py-2 text-xs text-gray-700">
                            <span className="mr-1">{ENTITY_FLAGS[inv.entityId]}</span>
                            {inv.entityId}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700">{cp?.name ?? "—"}</td>
                          <td className="px-3 py-2 text-xs tabular-nums text-gray-700">{inv.invoiceDate}</td>
                          <td className={`px-3 py-2 text-xs tabular-nums ${dueClass}`}>{inv.dueDate}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{inv.currency}</td>
                          <td className="px-3 py-2 text-xs tabular-nums text-gray-700 text-right">{fmtOriginal(inv.amountOriginal, inv.currency)}</td>
                          <td className="px-3 py-2 text-xs font-semibold tabular-nums text-gray-900 text-right">{fmtEur(inv.amountEur)}</td>
                          <td className="px-3 py-2"><StatusBadge value={inv.status} /></td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex gap-1">
                              <Button size="sm" variant="outline" type="button" onClick={() => toggleExpanded(inv.id)}>
                                <span className="inline-flex items-center gap-1">
                                  View Lines {isExpanded ? <ChevronDown size={11} /> : <ChevronDown size={11} className="-rotate-90" />}
                                </span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={() => {
                                  setEditing(inv);
                                  setModalOpen(true);
                                }}
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Pencil size={12} /> Edit
                                </span>
                              </Button>
                              {inv.status !== "Paid" && inv.status !== "Cancelled" && (
                                <Button size="sm" type="button" onClick={() => setPayTarget(inv)}>
                                  Mark Paid
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete invoice ${inv.invoiceNumber}? This cannot be undone.`)) deleteInvoice(inv.id);
                                }}
                              >
                                <span className="inline-flex items-center gap-1 text-rose-700">
                                  <Trash2 size={12} /> Delete
                                </span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50/40">
                            <td colSpan={12} className="px-3 py-3">
                              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                <table className="w-full text-left">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Service Type</th>
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Period</th>
                                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.lines.map((l) => (
                                      <tr key={l.id} className="border-t border-gray-100">
                                        <td className="px-3 py-2 text-xs text-gray-800">{l.description}</td>
                                        <td className="px-3 py-2 text-xs text-gray-700">{l.serviceType}</td>
                                        <td className="px-3 py-2 text-xs tabular-nums text-gray-700">
                                          {l.periodFrom ? `${l.periodFrom} → ${l.periodTo ?? "—"}` : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-xs tabular-nums text-gray-800 text-right">
                                          {fmtOriginal(l.amountOriginal, l.currency)}
                                        </td>
                                      </tr>
                                    ))}
                                    {inv.lines.length === 0 && (
                                      <tr>
                                        <td colSpan={4} className="px-3 py-3 text-center text-xs text-gray-500">
                                          No lines.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                  {inv.lines.length > 0 && (
                                    <tfoot className="bg-gray-50/80">
                                      <tr>
                                        <td className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-700">TOTAL</td>
                                        <td className="px-3 py-2"></td>
                                        <td className="px-3 py-2"></td>
                                        <td className="px-3 py-2 text-xs font-bold tabular-nums text-gray-900 text-right">
                                          {fmtOriginal(
                                            inv.lines.reduce((s, l) => s + l.amountOriginal, 0),
                                            inv.currency,
                                          )}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  )}
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Section 4 — Pagination */}
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-600">
              <span>
                Showing <span className="font-semibold tabular-nums">{showingFrom}</span>–
                <span className="font-semibold tabular-nums">{showingTo}</span> of{" "}
                <span className="font-semibold tabular-nums">{visible.length}</span>{" "}
                {visible.length === 1 ? "invoice" : "invoices"}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="px-2 text-[11px] tabular-nums">
                  Page {safePage + 1} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <InvoiceFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
      <MarkAsPaidModal open={!!payTarget} invoice={payTarget} onClose={() => setPayTarget(null)} />
    </div>
  );
}

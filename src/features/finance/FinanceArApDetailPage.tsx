import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import type {
  FinanceARAPItem,
  FinanceARAPStatus,
  FinanceBilateralDirection,
  FinanceCurrencyCode,
  FinanceInvoice,
  FinanceInvoiceLine,
  FinanceInvoiceServiceType,
  FinanceInvoiceStatus,
  FinanceInvoiceType,
  FinancePaymentMethod,
  OurEntity,
} from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { FinanceArApItemFormModal } from "./FinanceArApPage";

// ─── Local helpers (intentionally duplicated; cleanup later) ─────────

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

const ALL_CURRENCIES: readonly FinanceCurrencyCode[] = ["EUR", "USD", "GBP", "TRY", "CHF", "AED"] as const;
const ALL_ENTITIES: readonly OurEntity[] = ["UK", "USA", "TR"] as const;
const ALL_SERVICE_TYPES: readonly FinanceInvoiceServiceType[] = ["SMS", "Voice", "Platform", "Consulting", "Other"] as const;
const ALL_INVOICE_STATUSES: readonly FinanceInvoiceStatus[] = ["Draft", "Issued", "PartiallyPaid", "Paid", "Overdue", "Cancelled"] as const;
const ALL_PAYMENT_METHODS: readonly FinancePaymentMethod[] = ["BankTransfer", "CreditCard", "DirectDebit", "Cash", "Other"] as const;

const inputCls =
  "w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none";

// ─── Badges ──────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: FinanceARAPStatus }) {
  if (value === "Cancelled") {
    return <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-gray-500 line-through">{value}</span>;
  }
  const styles: Record<FinanceARAPStatus, string> = {
    Open: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    Overdue: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    Paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Planned: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
    PartiallyPaid: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Cancelled: "",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[value]}`}>{value}</span>;
}

function DirectionBadge({ value }: { value: FinanceBilateralDirection }) {
  return value === "Receivable" ? (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">REC</span>
  ) : (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-rose-100 text-rose-800">PAY</span>
  );
}

function InvoiceStatusBadge({ value }: { value: FinanceInvoiceStatus }) {
  if (value === "Cancelled") return <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-gray-500 line-through">{value}</span>;
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

// ─── Add Invoice modal ───────────────────────────────────────────────

interface InvoiceLineDraft {
  key: string;
  description: string;
  serviceType: FinanceInvoiceServiceType;
  periodFrom: string;
  periodTo: string;
  amountOriginal: number;
}

function AddInvoiceModal({
  open,
  onClose,
  counterpartyId,
  defaultCurrency,
}: {
  open: boolean;
  onClose: () => void;
  counterpartyId: string;
  defaultCurrency: FinanceCurrencyCode;
}) {
  const addInvoice = useAppStore((s) => s.addFinanceInvoice);
  const today = new Date().toISOString().slice(0, 10);

  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [type, setType] = useState<FinanceInvoiceType>("CustomerInvoice");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [currency, setCurrency] = useState<FinanceCurrencyCode>(defaultCurrency);
  const [status, setStatus] = useState<FinanceInvoiceStatus>("Draft");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLineDraft[]>([
    { key: "l1", description: "", serviceType: "SMS", periodFrom: "", periodTo: "", amountOriginal: 0 },
  ]);

  useEffect(() => {
    if (!open) return;
    setEntityId("UK");
    setType("CustomerInvoice");
    setInvoiceNumber("");
    setInvoiceDate(today);
    setDueDate(today);
    setCurrency(defaultCurrency);
    setStatus("Draft");
    setNotes("");
    setLines([{ key: "l1", description: "", serviceType: "SMS", periodFrom: "", periodTo: "", amountOriginal: 0 }]);
  }, [open, defaultCurrency, today]);

  const totalOriginal = lines.reduce((sum, l) => sum + (Number.isFinite(l.amountOriginal) ? l.amountOriginal : 0), 0);
  const totalEur = approxEur(totalOriginal, currency);

  const updateLine = (idx: number, patch: Partial<InvoiceLineDraft>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  if (!open) return null;

  const submit = () => {
    if (!invoiceNumber.trim()) return;
    if (totalOriginal <= 0) return;

    const invoiceLines: FinanceInvoiceLine[] = lines
      .filter((l) => l.amountOriginal > 0)
      .map((l, i) => ({
        // Real `id` and `invoiceId` are assigned by addFinanceInvoice; placeholders fine here.
        id: `tmp-${i}`,
        invoiceId: "tmp",
        description: l.description.trim() || "—",
        serviceType: l.serviceType,
        periodFrom: l.periodFrom || undefined,
        periodTo: l.periodTo || undefined,
        amountOriginal: Math.round(l.amountOriginal * 100) / 100,
        currency,
      }));

    addInvoice({
      entityId,
      counterpartyId,
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">New invoice</h3>
        <p className="mt-1 text-xs text-gray-500">
          Issued or non-Draft invoices automatically create a matching AR/AP item.
        </p>

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
          <label className="text-xs font-semibold text-gray-700">
            Invoice number
            <input className={inputCls} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. C-UK-2026-0099" />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Status
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as FinanceInvoiceStatus)}>
              {ALL_INVOICE_STATUSES.map((s) => (
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
        </div>

        <div className="mt-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">Lines</h4>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { key: `l${prev.length + 1}-${Date.now().toString(36)}`, description: "", serviceType: "SMS", periodFrom: "", periodTo: "", amountOriginal: 0 },
                ])
              }
            >
              <span className="inline-flex items-center gap-1">
                <Plus size={12} /> Add line
              </span>
            </Button>
          </div>
          <div className="p-2">
            {lines.map((l, idx) => (
              <div key={l.key} className="mb-2 grid grid-cols-12 gap-2">
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
          </div>
          <div className="border-t border-gray-100 px-3 py-2 text-right text-xs text-gray-700">
            Original total: <span className="font-semibold">{fmtOriginal(totalOriginal, currency)}</span>
            <span className="mx-2 text-gray-300">·</span>
            EUR (auto): <span className="font-semibold">{fmtEur(totalEur)}</span>
          </div>
        </div>

        <label className="mt-4 block text-xs font-semibold text-gray-700">
          Notes <span className="text-gray-400">(optional)</span>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!invoiceNumber.trim() || totalOriginal <= 0}>
            Add invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Payment modal ───────────────────────────────────────────────

function AddPaymentModal({
  open,
  onClose,
  counterpartyId,
  invoices,
  defaultCurrency,
  activeUserId,
}: {
  open: boolean;
  onClose: () => void;
  counterpartyId: string;
  invoices: FinanceInvoice[];
  defaultCurrency: FinanceCurrencyCode;
  activeUserId: string;
}) {
  const addPayment = useAppStore((s) => s.addFinancePayment);
  const today = new Date().toISOString().slice(0, 10);

  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [direction, setDirection] = useState<"Incoming" | "Outgoing">("Incoming");
  const [paymentDate, setPaymentDate] = useState(today);
  const [currency, setCurrency] = useState<FinanceCurrencyCode>(defaultCurrency);
  const [amountOriginal, setAmountOriginal] = useState(0);
  const [amountEur, setAmountEur] = useState(0);
  const [eurOverridden, setEurOverridden] = useState(false);
  const [method, setMethod] = useState<FinancePaymentMethod>("BankTransfer");
  const [description, setDescription] = useState("");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setEntityId("UK");
    setDirection("Incoming");
    setPaymentDate(today);
    setCurrency(defaultCurrency);
    setAmountOriginal(0);
    setAmountEur(0);
    setEurOverridden(false);
    setMethod("BankTransfer");
    setDescription("");
    setInvoiceId("");
    setNotes("");
  }, [open, defaultCurrency, today]);

  useEffect(() => {
    if (eurOverridden) return;
    setAmountEur(approxEur(amountOriginal, currency));
  }, [amountOriginal, currency, eurOverridden]);

  if (!open) return null;

  const submit = () => {
    if (amountOriginal <= 0 || !description.trim()) return;
    addPayment({
      entityId,
      counterpartyId,
      direction,
      paymentDate,
      currency,
      amountOriginal,
      amountEur,
      method,
      invoiceId: invoiceId || undefined,
      description: description.trim(),
      notes: notes.trim() || undefined,
      createdByUserId: activeUserId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">New payment</h3>
        <p className="mt-1 text-xs text-gray-500">Optionally link the payment to one of this counterparty's invoices.</p>

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
            Direction
            <select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value as "Incoming" | "Outgoing")}>
              <option value="Incoming">Incoming</option>
              <option value="Outgoing">Outgoing</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Payment date
            <input type="date" className={inputCls} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Method
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as FinancePaymentMethod)}>
              {ALL_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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
          <label className="text-xs font-semibold text-gray-700">
            Linked invoice <span className="text-gray-400">(optional)</span>
            <select className={inputCls} value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
              <option value="">— None —</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} ({inv.status})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Original amount
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={Number.isFinite(amountOriginal) ? amountOriginal : 0}
              onChange={(e) => setAmountOriginal(Number(e.target.value))}
            />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            EUR amount {!eurOverridden && <span className="text-gray-400">(auto)</span>}
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={Number.isFinite(amountEur) ? amountEur : 0}
              onChange={(e) => {
                setEurOverridden(true);
                setAmountEur(Number(e.target.value));
              }}
            />
          </label>
          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Description
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this payment for?" />
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
          <Button type="button" onClick={submit} disabled={amountOriginal <= 0 || !description.trim()}>
            Add payment
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

type Tab = "Items" | "Invoices" | "Payments";

export function FinanceArApDetailPage() {
  const navigate = useNavigate();
  const { counterpartyId } = useParams<{ counterpartyId: string }>();
  const cpId = counterpartyId ?? "";

  const counterparty = useAppStore((s) => s.financeCounterparties.find((c) => c.id === cpId));
  const items = useAppStore((s) => s.financeARAPItems);
  const invoices = useAppStore((s) => s.financeInvoices);
  const payments = useAppStore((s) => s.financePayments);
  const activeUserId = useAppStore((s) => s.activeUserId);
  const deleteItem = useAppStore((s) => s.deleteFinanceARAPItem);
  const deleteInvoice = useAppStore((s) => s.deleteFinanceInvoice);
  const deletePayment = useAppStore((s) => s.deleteFinancePayment);

  const [tab, setTab] = useState<Tab>("Items");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinanceARAPItem | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<Set<string>>(new Set());

  const cpItems = useMemo(() => items.filter((it) => it.counterpartyId === cpId), [items, cpId]);
  const cpInvoices = useMemo(() => invoices.filter((inv) => inv.counterpartyId === cpId), [invoices, cpId]);
  const cpPayments = useMemo(() => payments.filter((p) => p.counterpartyId === cpId), [payments, cpId]);

  const summary = useMemo(() => {
    let recOpen = 0;
    let payOpen = 0;
    for (const it of cpItems) {
      const isOpen = it.status !== "Paid" && it.status !== "Cancelled";
      if (!isOpen) continue;
      if (it.direction === "Receivable") recOpen += it.amountEur;
      else payOpen += it.amountEur;
    }
    return { recOpen, payOpen, net: recOpen - payOpen };
  }, [cpItems]);

  if (!counterparty) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Counterparty not found.</p>
          <Button className="mt-4" type="button" variant="secondary" onClick={() => navigate("/finance/ar-ap")}>
            <span className="inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back to AR / AP
            </span>
          </Button>
        </div>
      </div>
    );
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
        tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
      }`}
    >
      {label}
    </button>
  );

  const toggleInvoice = (id: string) => {
    setExpandedInvoice((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <Link to="/finance/ar-ap" className="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline">
          <ArrowLeft size={12} /> AR / AP
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-700">{counterparty.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <UiPageHeader title={counterparty.name} subtitle={counterparty.type} />
        {counterparty.companyId && (
          <Link
            to={`/companies/${counterparty.companyId}`}
            className="inline-flex items-center gap-1 self-end pb-1 text-xs font-semibold text-indigo-700 hover:underline"
          >
            View in CRM <ExternalLink size={12} />
          </Link>
        )}
      </div>

      {/* Section 1 — Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Open Receivables</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{fmtEur(summary.recOpen)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Open Payables</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-700">{fmtEur(summary.payOpen)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Net Exposure</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${summary.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {fmtEur(summary.net)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-100 p-1">
        {tabBtn("Items", `AR / AP Items (${cpItems.length})`)}
        {tabBtn("Invoices", `Invoices (${cpInvoices.length})`)}
        {tabBtn("Payments", `Payments (${cpPayments.length})`)}
      </div>

      {/* Tab 1 — AR / AP items */}
      {tab === "Items" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">AR / AP items</h3>
              <p className="mt-0.5 text-xs text-gray-500">{cpItems.length} item{cpItems.length === 1 ? "" : "s"}</p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setItemModalOpen(true);
              }}
            >
              <span className="inline-flex items-center gap-1">
                <Plus size={14} /> Add Item
              </span>
            </Button>
          </div>
          {cpItems.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500">No AR/AP items for this counterparty yet.</p>
              <Button
                className="mt-3"
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingItem(null);
                  setItemModalOpen(true);
                }}
              >
                Add the first item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50/80">
                  <tr>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Direction</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Source</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Cur.</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Original</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Due</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cpItems
                    .slice()
                    .sort((a, b) => (a.dueDate ?? a.issueDate).localeCompare(b.dueDate ?? b.issueDate))
                    .map((it) => (
                      <tr key={it.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                        <td className="px-3 py-2 text-xs tabular-nums text-gray-700">{it.issueDate}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{it.entityId}</td>
                        <td className="px-3 py-2"><DirectionBadge value={it.direction} /></td>
                        <td className="px-3 py-2 text-xs text-gray-700">{it.sourceType}</td>
                        <td className="px-3 py-2 text-xs text-gray-900">{it.description}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{it.currency}</td>
                        <td className="px-3 py-2 text-xs tabular-nums text-gray-700 text-right">{fmtOriginal(it.amountOriginal, it.currency)}</td>
                        <td className="px-3 py-2 text-xs font-semibold tabular-nums text-gray-900 text-right">{fmtEur(it.amountEur)}</td>
                        <td className="px-3 py-2 text-xs tabular-nums text-gray-700">{it.dueDate ?? "—"}</td>
                        <td className="px-3 py-2"><StatusBadge value={it.status} /></td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => {
                                setEditingItem(it);
                                setItemModalOpen(true);
                              }}
                            >
                              <span className="inline-flex items-center gap-1">
                                <Pencil size={12} /> Edit
                              </span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete "${it.description}"?`)) deleteItem(it.id);
                              }}
                            >
                              <span className="inline-flex items-center gap-1 text-rose-700">
                                <Trash2 size={12} /> Delete
                              </span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2 — Invoices */}
      {tab === "Invoices" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Invoices</h3>
              <p className="mt-0.5 text-xs text-gray-500">{cpInvoices.length} invoice{cpInvoices.length === 1 ? "" : "s"}</p>
            </div>
            <Button type="button" onClick={() => setInvoiceModalOpen(true)}>
              <span className="inline-flex items-center gap-1">
                <Plus size={14} /> Add Invoice
              </span>
            </Button>
          </div>
          {cpInvoices.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500">No invoices for this counterparty yet.</p>
              <Button className="mt-3" type="button" variant="secondary" onClick={() => setInvoiceModalOpen(true)}>
                Add the first invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50/80">
                  <tr>
                    <th className="w-10 px-3 py-2"></th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Invoice #</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Invoice date</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Due</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Cur.</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Amount</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cpInvoices
                    .slice()
                    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
                    .map((inv) => {
                      const isOpen = expandedInvoice.has(inv.id);
                      return (
                        <Fragment key={inv.id}>
                          <tr className="border-b border-gray-50 hover:bg-gray-50/80">
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                                onClick={() => toggleInvoice(inv.id)}
                                aria-label={isOpen ? "Hide lines" : "View lines"}
                              >
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-xs font-semibold text-gray-900">{inv.invoiceNumber}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">
                              {inv.type === "CustomerInvoice" ? "Customer" : "Supplier"}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-700">{inv.entityId}</td>
                            <td className="px-3 py-2 text-xs tabular-nums text-gray-700">{inv.invoiceDate}</td>
                            <td className="px-3 py-2 text-xs tabular-nums text-gray-700">{inv.dueDate}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{inv.currency}</td>
                            <td className="px-3 py-2 text-xs tabular-nums text-gray-700 text-right">{fmtOriginal(inv.amountOriginal, inv.currency)}</td>
                            <td className="px-3 py-2 text-xs font-semibold tabular-nums text-gray-900 text-right">{fmtEur(inv.amountEur)}</td>
                            <td className="px-3 py-2"><InvoiceStatusBadge value={inv.status} /></td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-1">
                                <Button size="sm" variant="outline" type="button" onClick={() => toggleInvoice(inv.id)}>
                                  <span className="inline-flex items-center gap-1">View lines</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete invoice ${inv.invoiceNumber}?`)) deleteInvoice(inv.id);
                                  }}
                                >
                                  <span className="inline-flex items-center gap-1 text-rose-700">
                                    <Trash2 size={12} /> Delete
                                  </span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-gray-50/40">
                              <td colSpan={11} className="px-3 py-3">
                                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                  <table className="w-full text-left">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Service</th>
                                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Period</th>
                                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {inv.lines.length === 0 && (
                                        <tr>
                                          <td colSpan={4} className="px-3 py-3 text-center text-xs text-gray-500">
                                            No lines.
                                          </td>
                                        </tr>
                                      )}
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
                                    </tbody>
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
          )}
        </div>
      )}

      {/* Tab 3 — Payments */}
      {tab === "Payments" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Payments</h3>
              <p className="mt-0.5 text-xs text-gray-500">{cpPayments.length} payment{cpPayments.length === 1 ? "" : "s"}</p>
            </div>
            <Button type="button" onClick={() => setPaymentModalOpen(true)}>
              <span className="inline-flex items-center gap-1">
                <Plus size={14} /> Add Payment
              </span>
            </Button>
          </div>
          {cpPayments.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500">No payments recorded for this counterparty.</p>
              <Button className="mt-3" type="button" variant="secondary" onClick={() => setPaymentModalOpen(true)}>
                Record the first payment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50/80">
                  <tr>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Direction</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Method</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Cur.</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Original</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Linked Invoice</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cpPayments
                    .slice()
                    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
                    .map((p) => {
                      const inv = p.invoiceId ? cpInvoices.find((i) => i.id === p.invoiceId) : null;
                      return (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                          <td className="px-3 py-2 text-xs tabular-nums text-gray-700">{p.paymentDate}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{p.entityId}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                p.direction === "Incoming" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {p.direction === "Incoming" ? "IN" : "OUT"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700">{p.method}</td>
                          <td className="px-3 py-2 text-xs text-gray-900">{p.description}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{p.currency}</td>
                          <td className="px-3 py-2 text-xs tabular-nums text-gray-700 text-right">{fmtOriginal(p.amountOriginal, p.currency)}</td>
                          <td className="px-3 py-2 text-xs font-semibold tabular-nums text-gray-900 text-right">{fmtEur(p.amountEur)}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">
                            {inv ? (
                              <span className="inline-flex items-center gap-1 text-indigo-700">
                                <ArrowUpRight size={10} />
                                {inv.invoiceNumber}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => {
                                if (confirm("Delete this payment?")) deletePayment(p.id);
                              }}
                            >
                              <span className="inline-flex items-center gap-1 text-rose-700">
                                <Trash2 size={12} /> Delete
                              </span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <FinanceArApItemFormModal
        open={itemModalOpen}
        prefillCounterpartyId={cpId}
        editing={editingItem}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
      />
      <AddInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        counterpartyId={cpId}
        defaultCurrency={counterparty.defaultCurrency}
      />
      <AddPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        counterpartyId={cpId}
        invoices={cpInvoices}
        defaultCurrency={counterparty.defaultCurrency}
        activeUserId={activeUserId}
      />
    </div>
  );
}

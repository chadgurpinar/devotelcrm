import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Clock,
  FileSearch,
  Layers,
  Link2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import type {
  FinanceARAPItem,
  FinanceARAPSourceType,
  FinanceARAPStatus,
  FinanceBilateralDirection,
  FinanceCounterparty,
  FinanceCounterpartyType,
  FinanceCurrencyCode,
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

const ALL_ENTITIES: readonly OurEntity[] = ["UK", "USA", "TR"] as const;
const ALL_STATUSES: readonly FinanceARAPStatus[] = ["Open", "Overdue", "Planned", "PartiallyPaid", "Paid", "Cancelled"] as const;
const ALL_SOURCES: readonly FinanceARAPSourceType[] = ["Usage", "Invoice", "Projection", "Manual"] as const;
const ALL_CURRENCIES: readonly FinanceCurrencyCode[] = ["EUR", "USD", "GBP", "TRY", "CHF", "AED"] as const;

// Default to the codebase's small-input style used by other finance modals.
const inputCls =
  "w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none";

// ─── Status / direction badges ───────────────────────────────────────

function StatusBadge({ value }: { value: FinanceARAPStatus }) {
  if (value === "Cancelled") {
    return (
      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-gray-500 line-through">
        {value}
      </span>
    );
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

function CounterpartyTypeBadge({ value }: { value: FinanceCounterpartyType }) {
  const styles: Record<FinanceCounterpartyType, string> = {
    Customer: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Provider: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    Internal: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Other: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[value]}`}>{value}</span>;
}

// ─── Exported ARAP modal (also used by FinanceArApDetailPage) ────────

interface FinanceArApItemFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, locks counterparty field. */
  prefillCounterpartyId?: string;
  /** When provided, modal acts as edit. */
  editing?: FinanceARAPItem | null;
}

export function FinanceArApItemFormModal({
  open,
  onClose,
  prefillCounterpartyId,
  editing,
}: FinanceArApItemFormModalProps) {
  const counterparties = useAppStore((s) => s.financeCounterparties);
  const addItem = useAppStore((s) => s.addFinanceARAPItem);
  const updateItem = useAppStore((s) => s.updateFinanceARAPItem);
  const addCounterparty = useAppStore((s) => s.addFinanceCounterparty);

  const today = new Date().toISOString().slice(0, 10);

  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [counterpartyId, setCounterpartyId] = useState<string>("");
  const [creatingCounterparty, setCreatingCounterparty] = useState(false);
  const [newCpName, setNewCpName] = useState("");
  const [newCpType, setNewCpType] = useState<FinanceCounterpartyType>("Customer");
  const [newCpCurrency, setNewCpCurrency] = useState<FinanceCurrencyCode>("EUR");

  const [direction, setDirection] = useState<FinanceBilateralDirection>("Receivable");
  const [sourceType, setSourceType] = useState<FinanceARAPSourceType>("Manual");
  const [currency, setCurrency] = useState<FinanceCurrencyCode>("EUR");
  const [amountOriginal, setAmountOriginal] = useState<number>(0);
  const [amountEur, setAmountEur] = useState<number>(0);
  const [eurOverridden, setEurOverridden] = useState(false);
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState<string>("");
  const [status, setStatus] = useState<FinanceARAPStatus>("Open");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedPaymentDate, setExpectedPaymentDate] = useState<string>("");
  const [disputed, setDisputed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [nettingEligible, setNettingEligible] = useState(false);
  const [intercompany, setIntercompany] = useState(false);

  // Reset on open / when editing target changes.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setEntityId(editing.entityId);
      setCounterpartyId(editing.counterpartyId);
      setCreatingCounterparty(false);
      setDirection(editing.direction);
      setSourceType(editing.sourceType);
      setCurrency(editing.currency);
      setAmountOriginal(editing.amountOriginal);
      setAmountEur(editing.amountEur);
      setEurOverridden(true);
      setIssueDate(editing.issueDate);
      setDueDate(editing.dueDate ?? "");
      setStatus(editing.status);
      setDescription(editing.description);
      setNotes(editing.notes ?? "");
      setExpectedPaymentDate(editing.expectedPaymentDate ?? "");
      setDisputed(Boolean(editing.disputed));
      setBlocked(Boolean(editing.blocked));
      setNettingEligible(Boolean(editing.nettingEligible));
      setIntercompany(Boolean(editing.intercompany));
      return;
    }
    setEntityId("UK");
    setCounterpartyId(prefillCounterpartyId ?? "");
    setCreatingCounterparty(false);
    setNewCpName("");
    setNewCpType("Customer");
    setNewCpCurrency("EUR");
    setDirection("Receivable");
    setSourceType("Manual");
    setCurrency("EUR");
    setAmountOriginal(0);
    setAmountEur(0);
    setEurOverridden(false);
    setIssueDate(today);
    setDueDate("");
    setStatus("Open");
    setDescription("");
    setNotes("");
    setExpectedPaymentDate("");
    setDisputed(false);
    setBlocked(false);
    setNettingEligible(false);
    setIntercompany(false);
  }, [open, editing, prefillCounterpartyId, today]);

  // Auto-recompute EUR from original × FX unless user has overridden.
  useEffect(() => {
    if (eurOverridden) return;
    setAmountEur(approxEur(amountOriginal, currency));
  }, [amountOriginal, currency, eurOverridden]);

  if (!open) return null;

  const counterpartyLocked = Boolean(prefillCounterpartyId) || Boolean(editing);

  const submit = () => {
    let cpId = counterpartyId;
    if (creatingCounterparty) {
      const trimmedName = newCpName.trim();
      if (!trimmedName) return;
      cpId = addCounterparty({
        type: newCpType,
        name: trimmedName,
        defaultCurrency: newCpCurrency,
      });
    }
    if (!cpId) return;
    if (!description.trim()) return;
    if (amountOriginal <= 0) return;

    const flagsPayload = {
      expectedPaymentDate: expectedPaymentDate || undefined,
      disputed: disputed || undefined,
      blocked: blocked || undefined,
      nettingEligible: nettingEligible || undefined,
      intercompany: intercompany || undefined,
    };

    if (editing) {
      updateItem({
        ...editing,
        entityId,
        counterpartyId: cpId,
        direction,
        sourceType,
        currency,
        amountOriginal,
        amountEur,
        issueDate,
        dueDate: dueDate || undefined,
        status,
        description: description.trim(),
        notes: notes.trim() || undefined,
        ...flagsPayload,
      });
    } else {
      addItem({
        entityId,
        counterpartyId: cpId,
        direction,
        sourceType,
        currency,
        amountOriginal,
        amountEur,
        issueDate,
        dueDate: dueDate || undefined,
        status,
        description: description.trim(),
        notes: notes.trim() || undefined,
        ...flagsPayload,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">{editing ? "Edit AR/AP item" : "New AR/AP item"}</h3>
        <p className="mt-1 text-xs text-gray-500">
          Add a manual receivable or payable. EUR amount auto-calculates from original currency unless you override.
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
            Counterparty
            <select
              className={inputCls}
              value={creatingCounterparty ? "__new__" : counterpartyId}
              disabled={counterpartyLocked && !creatingCounterparty}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setCreatingCounterparty(true);
                } else {
                  setCreatingCounterparty(false);
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
              {!counterpartyLocked && <option value="__new__">+ Create new counterparty</option>}
            </select>
          </label>

          {creatingCounterparty && (
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
            Direction
            <select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value as FinanceBilateralDirection)}>
              <option value="Receivable">Receivable</option>
              <option value="Payable">Payable</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Source
            <select className={inputCls} value={sourceType} onChange={(e) => setSourceType(e.target.value as FinanceARAPSourceType)}>
              {ALL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
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
            Status
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as FinanceARAPStatus)}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
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

          <label className="text-xs font-semibold text-gray-700">
            Issue date
            <input type="date" className={inputCls} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Due date <span className="text-gray-400">(optional)</span>
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Expected payment <span className="text-gray-400">(optional)</span>
            <input
              type="date"
              className={inputCls}
              value={expectedPaymentDate}
              onChange={(e) => setExpectedPaymentDate(e.target.value)}
            />
          </label>

          <div className="col-span-2 grid grid-cols-2 gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/40 p-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={disputed}
                onChange={(e) => setDisputed(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Disputed
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={blocked}
                onChange={(e) => setBlocked(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Blocked
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={nettingEligible}
                onChange={(e) => setNettingEligible(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Netting eligible
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={intercompany}
                onChange={(e) => setIntercompany(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Intercompany
            </label>
          </div>

          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Description
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this item?" />
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
          <Button
            type="button"
            onClick={submit}
            disabled={
              amountOriginal <= 0 ||
              !description.trim() ||
              (creatingCounterparty ? !newCpName.trim() : !counterpartyId)
            }
          >
            {editing ? "Save changes" : "Add item"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

type EntityFilter = "All" | OurEntity;
type DirectionFilter = "All" | FinanceBilateralDirection;
type StatusFilter = "All" | FinanceARAPStatus;

export function FinanceArApPage() {
  const navigate = useNavigate();
  const items = useAppStore((s) => s.financeARAPItems);
  const counterparties = useAppStore((s) => s.financeCounterparties);
  const deleteItem = useAppStore((s) => s.deleteFinanceARAPItem);

  const [entityFilter, setEntityFilter] = useState<EntityFilter>("All");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinanceARAPItem | null>(null);

  const cpById = useMemo(() => {
    const m = new Map<string, FinanceCounterparty>();
    for (const c of counterparties) m.set(c.id, c);
    return m;
  }, [counterparties]);

  // ── KPIs (use full unfiltered set per spec) ────────────────────────
  const kpis = useMemo(() => {
    let totalRec = 0;
    let totalPay = 0;
    let overdueRec = 0;
    let overduePay = 0;
    // Weighted-average days overdue (weighted by EUR), open items only.
    let weightedDaysSum = 0;
    let weightedAmountSum = 0;
    const todayMs = Date.now();
    for (const it of items) {
      const isReceivable = it.direction === "Receivable";
      const isOpen = it.status !== "Paid" && it.status !== "Cancelled";
      if (isOpen) {
        if (isReceivable) totalRec += it.amountEur;
        else totalPay += it.amountEur;
        if (it.dueDate) {
          const dueMs = new Date(`${it.dueDate.slice(0, 10)}T12:00:00Z`).getTime();
          const daysPast = Math.floor((todayMs - dueMs) / (24 * 60 * 60 * 1000));
          if (daysPast > 0) {
            weightedDaysSum += daysPast * it.amountEur;
            weightedAmountSum += it.amountEur;
          }
        }
      }
      if (it.status === "Overdue") {
        if (isReceivable) overdueRec += it.amountEur;
        else overduePay += it.amountEur;
      }
    }
    const weightedAvgDaysOverdue = weightedAmountSum > 0 ? Math.round(weightedDaysSum / weightedAmountSum) : 0;
    return { totalRec, totalPay, overdueRec, overduePay, weightedAvgDaysOverdue };
  }, [items]);

  // ── Aging buckets (open items only, by direction) ──────────────────
  const aging = useMemo(() => {
    const blank = () => ({ current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b90: 0, total: 0 });
    const rec = blank();
    const pay = blank();
    const todayMs = Date.now();
    for (const it of items) {
      const isOpen = it.status !== "Paid" && it.status !== "Cancelled";
      if (!isOpen) continue;
      const target = it.direction === "Receivable" ? rec : pay;
      target.total += it.amountEur;
      if (!it.dueDate) {
        target.current += it.amountEur;
        continue;
      }
      const dueMs = new Date(`${it.dueDate.slice(0, 10)}T12:00:00Z`).getTime();
      const daysPast = Math.floor((todayMs - dueMs) / (24 * 60 * 60 * 1000));
      if (daysPast <= 0) target.current += it.amountEur;
      else if (daysPast <= 30) target.b1_30 += it.amountEur;
      else if (daysPast <= 60) target.b31_60 += it.amountEur;
      else if (daysPast <= 90) target.b61_90 += it.amountEur;
      else target.b90 += it.amountEur;
    }
    return { rec, pay };
  }, [items]);

  // ── Filtered items ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (entityFilter !== "All" && it.entityId !== entityFilter) return false;
      if (directionFilter !== "All" && it.direction !== directionFilter) return false;
      if (statusFilter !== "All" && it.status !== statusFilter) return false;
      return true;
    });
  }, [items, entityFilter, directionFilter, statusFilter]);

  // ── Group by counterparty ──────────────────────────────────────────
  const groups = useMemo(() => {
    const m = new Map<
      string,
      {
        counterparty: FinanceCounterparty | undefined;
        items: FinanceARAPItem[];
        openReceivablesEur: number;
        openPayablesEur: number;
      }
    >();
    for (const it of filtered) {
      const cur = m.get(it.counterpartyId) ?? {
        counterparty: cpById.get(it.counterpartyId),
        items: [],
        openReceivablesEur: 0,
        openPayablesEur: 0,
      };
      cur.items.push(it);
      const isOpen = it.status !== "Paid" && it.status !== "Cancelled";
      if (isOpen) {
        if (it.direction === "Receivable") cur.openReceivablesEur += it.amountEur;
        else cur.openPayablesEur += it.amountEur;
      }
      m.set(it.counterpartyId, cur);
    }
    return Array.from(m.entries())
      .map(([counterpartyId, v]) => ({
        counterpartyId,
        ...v,
        openTotalEur: v.openReceivablesEur + v.openPayablesEur,
        netEur: v.openReceivablesEur - v.openPayablesEur,
      }))
      .sort((a, b) => b.openTotalEur - a.openTotalEur);
  }, [filtered, cpById]);

  // ── Top 10 net debtor / net creditor (from full unfiltered set) ────
  const netByCounterparty = useMemo(() => {
    const m = new Map<string, { id: string; name: string; type: FinanceCounterpartyType; netEur: number }>();
    for (const it of items) {
      if (it.status === "Paid" || it.status === "Cancelled") continue;
      const cp = cpById.get(it.counterpartyId);
      const cur = m.get(it.counterpartyId) ?? {
        id: it.counterpartyId,
        name: cp?.name ?? "Unknown",
        type: cp?.type ?? "Other",
        netEur: 0,
      };
      cur.netEur += it.direction === "Receivable" ? it.amountEur : -it.amountEur;
      m.set(it.counterpartyId, cur);
    }
    return Array.from(m.values());
  }, [items, cpById]);

  const topNetDebtors = useMemo(
    () => netByCounterparty.filter((c) => c.netEur > 0).sort((a, b) => b.netEur - a.netEur).slice(0, 10),
    [netByCounterparty],
  );

  const topNetCreditors = useMemo(
    () => netByCounterparty.filter((c) => c.netEur < 0).sort((a, b) => a.netEur - b.netEur).slice(0, 10),
    [netByCounterparty],
  );

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <UiPageHeader title="AR / AP" subtitle="Receivables and payables across all entities" />

      {/* Section 1 — KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <UiKpiCard label="Total Receivables (EUR)" value={fmtEur(kpis.totalRec)} icon={<ArrowDownRight className="h-5 w-5" />} />
        <UiKpiCard label="Total Payables (EUR)" value={fmtEur(kpis.totalPay)} icon={<ArrowUpRight className="h-5 w-5" />} />
        <UiKpiCard
          label="Overdue Receivables"
          value={fmtEur(kpis.overdueRec)}
          icon={<ArrowDownRight className="h-5 w-5" />}
          className={kpis.overdueRec > 0 ? "border-rose-200 bg-rose-50/50" : ""}
        />
        <UiKpiCard
          label="Overdue Payables"
          value={fmtEur(kpis.overduePay)}
          icon={<ArrowUpRight className="h-5 w-5" />}
          className={kpis.overduePay > 0 ? "border-rose-200 bg-rose-50/50" : ""}
        />
        <UiKpiCard
          label="Weighted Avg Days Overdue"
          value={kpis.weightedAvgDaysOverdue > 0 ? `${kpis.weightedAvgDaysOverdue}d` : "—"}
          icon={<Clock className="h-5 w-5" />}
          className={kpis.weightedAvgDaysOverdue >= 30 ? "border-rose-200 bg-rose-50/50" : kpis.weightedAvgDaysOverdue >= 15 ? "border-amber-200 bg-amber-50/50" : ""}
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
            {(["All", "Receivable", "Payable"] as DirectionFilter[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirectionFilter(d)}
                className={`rounded-md px-3 py-1 font-semibold ${
                  directionFilter === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {d === "All" ? "All" : d === "Receivable" ? "Receivables" : "Payables"}
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
        </div>

        <Button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
        >
          <span className="inline-flex items-center gap-1">
            <Plus size={14} /> Add AR/AP Item
          </span>
        </Button>
      </div>

      {/* Section 2b — Aging buckets */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Aging Buckets</h3>
          <p className="mt-0.5 text-xs text-gray-500">Open items only · EUR · derived from due date</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Direction</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Current</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">1 – 30 d</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">31 – 60 d</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">61 – 90 d</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">90 + d</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="px-5 py-3 text-sm font-medium text-emerald-700">Receivables</td>
                <td className="px-5 py-3 text-sm tabular-nums text-gray-800 text-right">{fmtEur(aging.rec.current)}</td>
                <td className="px-5 py-3 text-sm tabular-nums text-gray-800 text-right">{fmtEur(aging.rec.b1_30)}</td>
                <td className="px-5 py-3 text-sm tabular-nums text-amber-700 text-right">{fmtEur(aging.rec.b31_60)}</td>
                <td className="px-5 py-3 text-sm tabular-nums text-amber-700 text-right">{fmtEur(aging.rec.b61_90)}</td>
                <td className="px-5 py-3 text-sm tabular-nums text-rose-700 text-right">{fmtEur(aging.rec.b90)}</td>
                <td className="px-5 py-3 text-sm font-semibold tabular-nums text-gray-900 text-right">{fmtEur(aging.rec.total)}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-medium text-rose-700">Payables</td>
                <td className="px-5 py-3 text-sm tabular-nums text-gray-800 text-right">{fmtEur(aging.pay.current)}</td>
                <td className="px-5 py-3 text-sm tabular-nums text-gray-800 text-right">{fmtEur(aging.pay.b1_30)}</td>
                <td className="px-5 py-3 text-sm tabular-nums text-amber-700 text-right">{fmtEur(aging.pay.b31_60)}</td>
                <td className="px-5 py-3 text-sm tabular-nums text-amber-700 text-right">{fmtEur(aging.pay.b61_90)}</td>
                <td className="px-5 py-3 text-sm tabular-nums text-rose-700 text-right">{fmtEur(aging.pay.b90)}</td>
                <td className="px-5 py-3 text-sm font-semibold tabular-nums text-gray-900 text-right">{fmtEur(aging.pay.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2c — Top 10 net debtor / net creditor */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-800">Top Net Debtors</h3>
            <p className="mt-0.5 text-xs text-gray-500">Counterparties owing us the most (EUR, net)</p>
          </div>
          <div className="overflow-x-auto">
            {topNetDebtors.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No net debtors</div>
            ) : (
              <table className="w-full text-left">
                <tbody>
                  {topNetDebtors.map((c, idx) => (
                    <tr
                      key={c.id}
                      className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer"
                      onClick={() => navigate(`/finance/ar-ap/${c.id}`)}
                    >
                      <td className="px-5 py-2.5 w-8 text-[11px] tabular-nums text-gray-400">{idx + 1}</td>
                      <td className="px-5 py-2.5 text-sm font-medium text-gray-900">
                        {c.name}
                        <span className="ml-2 text-[10px] text-gray-400 uppercase">{c.type}</span>
                      </td>
                      <td className="px-5 py-2.5 text-sm font-semibold tabular-nums text-emerald-700 text-right">
                        {fmtEur(c.netEur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-800">Top Net Creditors</h3>
            <p className="mt-0.5 text-xs text-gray-500">Counterparties we owe the most (EUR, net)</p>
          </div>
          <div className="overflow-x-auto">
            {topNetCreditors.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No net creditors</div>
            ) : (
              <table className="w-full text-left">
                <tbody>
                  {topNetCreditors.map((c, idx) => (
                    <tr
                      key={c.id}
                      className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer"
                      onClick={() => navigate(`/finance/ar-ap/${c.id}`)}
                    >
                      <td className="px-5 py-2.5 w-8 text-[11px] tabular-nums text-gray-400">{idx + 1}</td>
                      <td className="px-5 py-2.5 text-sm font-medium text-gray-900">
                        {c.name}
                        <span className="ml-2 text-[10px] text-gray-400 uppercase">{c.type}</span>
                      </td>
                      <td className="px-5 py-2.5 text-sm font-semibold tabular-nums text-rose-700 text-right">
                        {fmtEur(Math.abs(c.netEur))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Section 3 — Grouped table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">By counterparty</h3>
          <p className="mt-0.5 text-xs text-gray-500">{groups.length} counterparties · {filtered.length} items</p>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <FileSearch className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No AR/AP items match the current filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="w-10 px-3 py-3"></th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Counterparty</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Receivables</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Payables</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Net</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Items</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const isExpanded = expanded.has(g.counterpartyId);
                  const cp = g.counterparty;
                  const name = cp?.name ?? "Unknown counterparty";
                  return (
                    <Fragment key={g.counterpartyId}>
                      <tr
                        className="cursor-pointer border-b border-gray-100 hover:bg-gray-50/80 transition"
                        onClick={() => navigate(`/finance/ar-ap/${g.counterpartyId}`)}
                      >
                        <td className="w-10 px-3 py-3">
                          <button
                            type="button"
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(g.counterpartyId);
                            }}
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{name}</span>
                            {cp && <CounterpartyTypeBadge value={cp.type} />}
                            {g.openReceivablesEur > 0 && g.openPayablesEur > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">
                                <Layers className="h-2.5 w-2.5" /> Both
                              </span>
                            )}
                            {cp?.type === "Internal" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                                <Link2 className="h-2.5 w-2.5" /> Intercompany
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-medium tabular-nums text-emerald-700">
                          {fmtEur(g.openReceivablesEur)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-medium tabular-nums text-rose-700">
                          {fmtEur(g.openPayablesEur)}
                        </td>
                        <td
                          className={`px-5 py-3 text-right text-sm font-bold tabular-nums ${
                            g.netEur >= 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {fmtEur(g.netEur)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-gray-600 tabular-nums">{g.items.length}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/40">
                          <td colSpan={6} className="px-3 py-3">
                            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                              <table className="w-full text-left">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Dir.</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Source</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Cur.</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Original</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Due</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.items
                                    .slice()
                                    .sort((a, b) => (a.dueDate ?? a.issueDate).localeCompare(b.dueDate ?? b.issueDate))
                                    .map((it) => (
                                      <tr key={it.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                                        <td className="px-3 py-2 text-xs tabular-nums text-gray-700">{it.issueDate}</td>
                                        <td className="px-3 py-2 text-xs text-gray-700">{it.entityId}</td>
                                        <td className="px-3 py-2"><DirectionBadge value={it.direction} /></td>
                                        <td className="px-3 py-2 text-xs text-gray-700">{it.sourceType}</td>
                                        <td className="px-3 py-2 text-xs text-gray-900">
                                          <div className="flex items-center gap-1">
                                            <span>{it.description}</span>
                                            {it.disputed && (
                                              <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700 ring-1 ring-rose-200">
                                                Disputed
                                              </span>
                                            )}
                                            {it.blocked && (
                                              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 ring-1 ring-amber-200">
                                                Blocked
                                              </span>
                                            )}
                                            {it.nettingEligible && (
                                              <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700 ring-1 ring-violet-200">
                                                Net
                                              </span>
                                            )}
                                            {it.intercompany && (
                                              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 ring-1 ring-amber-200">
                                                I/C
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-700">{it.currency}</td>
                                        <td className="px-3 py-2 text-xs tabular-nums text-gray-700 text-right">
                                          {fmtOriginal(it.amountOriginal, it.currency)}
                                        </td>
                                        <td className="px-3 py-2 text-xs font-semibold tabular-nums text-gray-900 text-right">
                                          {fmtEur(it.amountEur)}
                                        </td>
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
                                                setModalOpen(true);
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

      <FinanceArApItemFormModal
        open={modalOpen}
        editing={editingItem}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
      />
    </div>
  );
}

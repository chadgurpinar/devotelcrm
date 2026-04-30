import { useEffect, useMemo, useState } from "react";
import { CalendarClock, PauseCircle, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import type {
  FinanceCounterparty,
  FinanceCurrencyCode,
  FinanceDirectDebit,
  FinanceDirectDebitCategory,
  FinanceDirectDebitFrequency,
  FinanceDirectDebitStatus,
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
const ALL_CATEGORIES: readonly FinanceDirectDebitCategory[] = [
  "Software",
  "Utilities",
  "Rent",
  "Insurance",
  "Loan",
  "Subscription",
  "Tax",
  "Other",
] as const;
const ALL_FREQUENCIES: readonly FinanceDirectDebitFrequency[] = ["Monthly", "Quarterly", "Annual", "OneOff"] as const;
const ALL_STATUSES: readonly FinanceDirectDebitStatus[] = ["Active", "Paused", "Cancelled"] as const;

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

function diffDaysFromToday(ymd: string): number {
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(parseYmd(ymd)).getTime();
  return Math.floor((target - today) / (24 * 60 * 60 * 1000));
}

function frequencyLabel(f: FinanceDirectDebitFrequency): string {
  return f === "OneOff" ? "One-off" : f;
}

function monthlyEurEquivalent(dd: FinanceDirectDebit): number {
  switch (dd.frequency) {
    case "Monthly":
      return dd.amountEur;
    case "Quarterly":
      return dd.amountEur / 3;
    case "Annual":
      return dd.amountEur / 12;
    case "OneOff":
    default:
      return 0;
  }
}

function isInCurrentMonth(ymd: string): boolean {
  const today = new Date();
  const d = parseYmd(ymd);
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
}

// ─── Badges ──────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: FinanceDirectDebitStatus }) {
  const styles: Record<FinanceDirectDebitStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Paused: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Cancelled: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[value]}`}>{value}</span>;
}

function CategoryBadge({ value }: { value: FinanceDirectDebitCategory }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-700 ring-1 ring-gray-200">
      {value}
    </span>
  );
}

// ─── Add / Edit modal ────────────────────────────────────────────────

interface DDFormModalProps {
  open: boolean;
  onClose: () => void;
  editing?: FinanceDirectDebit | null;
}

function DirectDebitFormModal({ open, onClose, editing }: DDFormModalProps) {
  const counterparties = useAppStore((s) => s.financeCounterparties);
  const addDD = useAppStore((s) => s.addFinanceDirectDebit);
  const updateDD = useAppStore((s) => s.updateFinanceDirectDebit);
  const addProjection = useAppStore((s) => s.addFinanceProjection);

  const today = new Date().toISOString().slice(0, 10);

  const [entityId, setEntityId] = useState<OurEntity>("UK");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<FinanceDirectDebitCategory>("Software");
  const [counterpartyId, setCounterpartyId] = useState<string>("");
  const [currency, setCurrency] = useState<FinanceCurrencyCode>("EUR");
  const [amountOriginal, setAmountOriginal] = useState<number>(0);
  const [amountEur, setAmountEur] = useState<number>(0);
  const [eurOverridden, setEurOverridden] = useState(false);
  const [frequency, setFrequency] = useState<FinanceDirectDebitFrequency>("Monthly");
  const [nextDueDate, setNextDueDate] = useState(today);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [status, setStatus] = useState<FinanceDirectDebitStatus>("Active");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setEntityId(editing.entityId);
      setLabel(editing.label);
      setCategory(editing.category);
      setCounterpartyId(editing.counterpartyId ?? "");
      setCurrency(editing.currency);
      setAmountOriginal(editing.amountOriginal);
      setAmountEur(editing.amountEur);
      setEurOverridden(true);
      setFrequency(editing.frequency);
      setNextDueDate(editing.nextDueDate);
      setDayOfMonth(editing.dayOfMonth ?? 1);
      setStatus(editing.status);
      setNotes(editing.notes ?? "");
      return;
    }
    setEntityId("UK");
    setLabel("");
    setCategory("Software");
    setCounterpartyId("");
    setCurrency("EUR");
    setAmountOriginal(0);
    setAmountEur(0);
    setEurOverridden(false);
    setFrequency("Monthly");
    setNextDueDate(today);
    setDayOfMonth(1);
    setStatus("Active");
    setNotes("");
  }, [open, editing, today]);

  useEffect(() => {
    if (eurOverridden) return;
    setAmountEur(approxEur(amountOriginal, currency));
  }, [amountOriginal, currency, eurOverridden]);

  if (!open) return null;

  const submit = () => {
    if (!label.trim() || amountOriginal <= 0) return;
    const day = frequency === "Monthly" ? Math.max(1, Math.min(31, dayOfMonth)) : undefined;
    const payload = {
      entityId,
      label: label.trim(),
      counterpartyId: counterpartyId || undefined,
      currency,
      amountOriginal: Math.round(amountOriginal * 100) / 100,
      amountEur: Math.round(amountEur * 100) / 100,
      frequency,
      nextDueDate,
      dayOfMonth: day,
      category,
      status,
      notes: notes.trim() || undefined,
    };

    if (editing) {
      updateDD({ ...editing, ...payload });
    } else {
      const newId = addDD(payload);
      addProjection({
        entityId,
        direction: "Outflow",
        label: `Direct debit — ${payload.label}`,
        dueDate: nextDueDate,
        currency,
        amountOriginal: payload.amountOriginal,
        amountEur: payload.amountEur,
        category: "DirectDebit",
        confidence: "Confirmed",
        status: "Pending",
        linkedDirectDebitId: newId,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">{editing ? "Edit direct debit" : "New direct debit"}</h3>
        <p className="mt-1 text-xs text-gray-500">
          {editing
            ? "Edits do not modify existing projections."
            : "A matching DirectDebit projection is created automatically with the same due date."}
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
            Status
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as FinanceDirectDebitStatus)}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Label
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. AWS hosting, Office rent" />
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Category
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as FinanceDirectDebitCategory)}>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Counterparty <span className="text-gray-400">(optional)</span>
            <select className={inputCls} value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)}>
              <option value="">— None —</option>
              {counterparties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
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
            Frequency
            <select className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value as FinanceDirectDebitFrequency)}>
              {ALL_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {frequencyLabel(f)}
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
            Next due date
            <input type="date" className={inputCls} value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </label>
          {frequency === "Monthly" && (
            <label className="text-xs font-semibold text-gray-700">
              Day of month
              <input
                type="number"
                min={1}
                max={31}
                className={inputCls}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
              />
            </label>
          )}

          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Notes <span className="text-gray-400">(optional)</span>
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!label.trim() || amountOriginal <= 0}>
            {editing ? "Save changes" : "Add direct debit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

type EntityFilter = "All" | OurEntity;
type StatusFilter = "All" | FinanceDirectDebitStatus;
type CategoryFilter = "All" | FinanceDirectDebitCategory;

export function FinanceDirectDebitsPage() {
  const debits = useAppStore((s) => s.financeDirectDebits);
  const counterparties = useAppStore((s) => s.financeCounterparties);
  const updateDD = useAppStore((s) => s.updateFinanceDirectDebit);
  const deleteDD = useAppStore((s) => s.deleteFinanceDirectDebit);

  const [entityFilter, setEntityFilter] = useState<EntityFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Active");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceDirectDebit | null>(null);

  const cpById = useMemo(() => {
    const m = new Map<string, FinanceCounterparty>();
    for (const c of counterparties) m.set(c.id, c);
    return m;
  }, [counterparties]);

  const kpis = useMemo(() => {
    let activeCount = 0;
    let monthlyEur = 0;
    let dueThisMonthEur = 0;
    let pausedCancelled = 0;
    for (const d of debits) {
      if (d.status === "Active") {
        activeCount += 1;
        monthlyEur += monthlyEurEquivalent(d);
        if (isInCurrentMonth(d.nextDueDate)) dueThisMonthEur += d.amountEur;
      } else {
        pausedCancelled += 1;
      }
    }
    return { activeCount, monthlyEur: Math.round(monthlyEur), dueThisMonthEur, pausedCancelled };
  }, [debits]);

  const filtered = useMemo(() => {
    return debits
      .filter((d) => {
        if (entityFilter !== "All" && d.entityId !== entityFilter) return false;
        if (statusFilter !== "All" && d.status !== statusFilter) return false;
        if (categoryFilter !== "All" && d.category !== categoryFilter) return false;
        return true;
      })
      .slice()
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  }, [debits, entityFilter, statusFilter, categoryFilter]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <UiPageHeader title="Direct Debits & Recurring Bills" subtitle="Scheduled outflows across all entities" />
        <Button type="button" onClick={openAdd}>
          <span className="inline-flex items-center gap-1">
            <Plus size={14} /> Add Direct Debit
          </span>
        </Button>
      </div>

      {/* Section 1 — KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiKpiCard label="Active Direct Debits" value={kpis.activeCount} icon={<Repeat className="h-5 w-5" />} />
        <UiKpiCard
          label="Monthly Commitment (EUR)"
          value={fmtEur(kpis.monthlyEur)}
          icon={<CalendarClock className="h-5 w-5" />}
          trend={{ value: "≈ per month", positive: true }}
        />
        <UiKpiCard label="Due This Month (EUR)" value={fmtEur(kpis.dueThisMonthEur)} icon={<CalendarClock className="h-5 w-5" />} />
        <UiKpiCard label="Paused / Cancelled" value={kpis.pausedCancelled} icon={<PauseCircle className="h-5 w-5" />} />
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
            {(["Active", "Paused", "Cancelled", "All"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1 font-semibold ${
                  statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="text-xs font-semibold text-gray-600">
            Category
            <select
              className={`${inputCls} ml-2 inline-block w-auto`}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            >
              <option value="All">All Categories</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Button type="button" onClick={openAdd}>
          <span className="inline-flex items-center gap-1">
            <Plus size={14} /> Add Direct Debit
          </span>
        </Button>
      </div>

      {/* Section 3 — Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">All direct debits</h3>
          <p className="mt-0.5 text-xs text-gray-500">{filtered.length} record{filtered.length === 1 ? "" : "s"}</p>
        </div>

        {debits.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <Repeat className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No direct debits added yet</p>
            <Button className="mt-3" type="button" onClick={openAdd}>
              <span className="inline-flex items-center gap-1">
                <Plus size={14} /> Add Direct Debit
              </span>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">No direct debits match the current filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Label</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Category</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Counterparty</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Frequency</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Next Due</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Original</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const cp = d.counterpartyId ? cpById.get(d.counterpartyId) : undefined;
                  const days = diffDaysFromToday(d.nextDueDate);
                  const dueClass = days < 0 ? "text-rose-700 font-semibold" : days <= 7 ? "text-amber-700 font-semibold" : "text-gray-700";
                  const rowDim = d.status === "Cancelled" ? "opacity-60" : "";
                  return (
                    <tr key={d.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${rowDim}`}>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        <span className="mr-1">{ENTITY_FLAGS[d.entityId]}</span>
                        {d.entityId}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{d.label}</td>
                      <td className="px-3 py-2"><CategoryBadge value={d.category} /></td>
                      <td className="px-3 py-2 text-xs text-gray-700">{cp?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{frequencyLabel(d.frequency)}</td>
                      <td className={`px-3 py-2 text-xs tabular-nums ${dueClass}`}>{d.nextDueDate}</td>
                      <td className="px-3 py-2 text-xs tabular-nums text-gray-700 text-right">
                        {fmtOriginal(d.amountOriginal, d.currency)}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold tabular-nums text-gray-900 text-right">{fmtEur(d.amountEur)}</td>
                      <td className="px-3 py-2"><StatusBadge value={d.status} /></td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => {
                              setEditing(d);
                              setModalOpen(true);
                            }}
                          >
                            <span className="inline-flex items-center gap-1">
                              <Pencil size={12} /> Edit
                            </span>
                          </Button>
                          {d.status !== "Cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() =>
                                updateDD({ ...d, status: d.status === "Active" ? "Paused" : "Active" })
                              }
                            >
                              <span className="inline-flex items-center gap-1">
                                {d.status === "Active" ? (
                                  <>
                                    <PauseCircle size={12} /> Pause
                                  </>
                                ) : (
                                  <>
                                    <Play size={12} /> Resume
                                  </>
                                )}
                              </span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete direct debit "${d.label}"?`)) deleteDD(d.id);
                            }}
                          >
                            <span className="inline-flex items-center gap-1 text-rose-700">
                              <Trash2 size={12} /> Delete
                            </span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DirectDebitFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

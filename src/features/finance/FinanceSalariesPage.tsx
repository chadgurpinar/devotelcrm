import { useEffect, useMemo, useState } from "react";
import { Banknote, Briefcase, ChevronLeft, ChevronRight, FileCheck2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import type {
  FinanceCurrencyCode,
  FinanceSalaryPlan,
  FinanceSalaryPlanLine,
  FinanceSalaryPlanStatus,
  HrEmployee,
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
const ALL_STATUSES: readonly FinanceSalaryPlanStatus[] = ["Planned", "Paid", "Cancelled"] as const;

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

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthKey: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1 + delta;
  const d = new Date(Date.UTC(year, month, 1, 12, 0, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLong(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1, 12, 0, 0));
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatMonthShort(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1, 12, 0, 0));
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

// ─── Status badge ────────────────────────────────────────────────────

function PlanStatusBadge({ value }: { value: FinanceSalaryPlanStatus | "None" }) {
  if (value === "None") {
    return <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-200">No plan</span>;
  }
  const styles: Record<FinanceSalaryPlanStatus, string> = {
    Planned: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    Paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Cancelled: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[value]}`}>{value}</span>;
}

// ─── Plan create / edit modal ────────────────────────────────────────

interface LineDraft {
  key: string;
  employeeId: string;
  entityId: OurEntity;
  currency: FinanceCurrencyCode;
  plannedNetOriginal: number;
  plannedNetEur: number;
  netEurOverridden: boolean;
  plannedEmployerCostOriginal: number;
  plannedEmployerCostEur: number;
  costEurOverridden: boolean;
  notes: string;
}

function emptyLine(employees: HrEmployee[]): LineDraft {
  const first = employees[0];
  return {
    key: `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    employeeId: first?.id ?? "",
    entityId: first?.legalEntityId ?? "UK",
    currency: "EUR",
    plannedNetOriginal: 0,
    plannedNetEur: 0,
    netEurOverridden: false,
    plannedEmployerCostOriginal: 0,
    plannedEmployerCostEur: 0,
    costEurOverridden: false,
    notes: "",
  };
}

function PlanFormModal({
  open,
  monthKey,
  editing,
  onClose,
}: {
  open: boolean;
  monthKey: string;
  editing: FinanceSalaryPlan | null;
  onClose: () => void;
}) {
  const employees = useAppStore((s) => s.hrEmployees);
  const addPlan = useAppStore((s) => s.addFinanceSalaryPlan);
  const updatePlan = useAppStore((s) => s.updateFinanceSalaryPlan);
  const addProjection = useAppStore((s) => s.addFinanceProjection);

  const today = new Date().toISOString().slice(0, 10);

  const [status, setStatus] = useState<FinanceSalaryPlanStatus>("Planned");
  const [paidDate, setPaidDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setStatus(editing.status);
      setPaidDate(editing.paidDate ?? "");
      setNotes(editing.notes ?? "");
      setLines(
        editing.lines.map((l, idx) => ({
          key: `l-${idx}-${l.id}`,
          employeeId: l.employeeId,
          entityId: l.entityId,
          currency: l.currency,
          plannedNetOriginal: l.plannedNetOriginal,
          plannedNetEur: l.plannedNetEur,
          netEurOverridden: true,
          plannedEmployerCostOriginal: l.plannedEmployerCostOriginal ?? 0,
          plannedEmployerCostEur: l.plannedEmployerCostEur ?? 0,
          costEurOverridden: true,
          notes: l.notes ?? "",
        })),
      );
      return;
    }
    setStatus("Planned");
    setPaidDate("");
    setNotes("");
    setLines([emptyLine(employees)]);
  }, [open, editing, employees]);

  const updateLine = (idx: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  // Live EUR auto-calc per row.
  const computedLines = useMemo(
    () =>
      lines.map((l) => ({
        ...l,
        plannedNetEur: l.netEurOverridden ? l.plannedNetEur : approxEur(l.plannedNetOriginal, l.currency),
        plannedEmployerCostEur: l.costEurOverridden
          ? l.plannedEmployerCostEur
          : approxEur(l.plannedEmployerCostOriginal, l.currency),
      })),
    [lines],
  );

  const totals = useMemo(() => {
    let net = 0;
    let cost = 0;
    for (const l of computedLines) {
      net += l.plannedNetEur;
      cost += l.plannedEmployerCostEur;
    }
    return { net: Math.round(net), cost: Math.round(cost) };
  }, [computedLines]);

  if (!open) return null;

  const empById = new Map(employees.map((e) => [e.id, e]));

  const submit = () => {
    if (computedLines.length === 0) return;
    const valid = computedLines.filter((l) => l.employeeId && l.plannedNetOriginal > 0);
    if (valid.length === 0) return;

    const planLines: FinanceSalaryPlanLine[] = valid.map((l, idx) => ({
      id: `line-${idx}-${Date.now().toString(36)}`,
      salaryPlanId: editing?.id ?? "",
      employeeId: l.employeeId,
      entityId: l.entityId,
      currency: l.currency,
      plannedNetOriginal: Math.round(l.plannedNetOriginal * 100) / 100,
      plannedNetEur: Math.round(l.plannedNetEur),
      plannedEmployerCostOriginal:
        l.plannedEmployerCostOriginal > 0 ? Math.round(l.plannedEmployerCostOriginal * 100) / 100 : undefined,
      plannedEmployerCostEur:
        l.plannedEmployerCostEur > 0 ? Math.round(l.plannedEmployerCostEur) : undefined,
      notes: l.notes.trim() || undefined,
    }));

    const totalNetEur = planLines.reduce((sum, l) => sum + l.plannedNetEur, 0);
    const totalEmployerCostEur = planLines.reduce((sum, l) => sum + (l.plannedEmployerCostEur ?? 0), 0);

    const now = new Date().toISOString();

    if (editing) {
      updatePlan({
        ...editing,
        status,
        lines: planLines,
        totalNetEur,
        totalEmployerCostEur,
        paidDate: status === "Paid" ? paidDate || today : undefined,
        notes: notes.trim() || undefined,
        updatedAt: now,
      });
    } else {
      const newId = addPlan({
        month: monthKey,
        status,
        lines: planLines,
        totalNetEur,
        totalEmployerCostEur,
        paidDate: status === "Paid" ? paidDate || today : undefined,
        notes: notes.trim() || undefined,
        updatedAt: now,
        createdByUserId: "usr-001",
      });

      // Per-entity projections (one per unique paying entity).
      const sumByEntity = new Map<OurEntity, number>();
      for (const l of planLines) {
        sumByEntity.set(l.entityId, (sumByEntity.get(l.entityId) ?? 0) + l.plannedNetEur);
      }
      const dueDate = `${monthKey}-01`;
      for (const [entityId, eur] of sumByEntity) {
        if (eur <= 0) continue;
        addProjection({
          entityId,
          direction: "Outflow",
          label: `Salaries — ${monthKey}`,
          dueDate,
          currency: "EUR",
          amountOriginal: eur,
          amountEur: eur,
          category: "Salary",
          confidence: "Confirmed",
          status: "Pending",
          linkedSalaryPlanId: newId,
        });
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">
          {editing ? "Edit salary plan" : "Create salary plan"} — {formatMonthLong(monthKey)}
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          {editing
            ? "Edits adjust the plan only — existing projections are not modified."
            : "Saving creates one Salary projection per paying entity, due on the first of the month."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-700">
            Month
            <input className={`${inputCls} bg-gray-50`} value={monthKey} disabled />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Status
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as FinanceSalaryPlanStatus)}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {status === "Paid" && (
            <label className="text-xs font-semibold text-gray-700">
              Paid date
              <input type="date" className={inputCls} value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
            </label>
          )}
          <label className={`${status === "Paid" ? "" : "col-span-2"} text-xs font-semibold text-gray-700`}>
            Notes <span className="text-gray-400">(optional)</span>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Lines · {computedLines.length} {computedLines.length === 1 ? "row" : "rows"}
            </h4>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine(employees)])}
            >
              <span className="inline-flex items-center gap-1">
                <Plus size={12} /> Add Employee
              </span>
            </Button>
          </div>

          {employees.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-500">
              No employees found in HR module. Add employees in HR → People first.
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {computedLines.map((l, idx) => {
                const emp = empById.get(l.employeeId);
                return (
                  <div key={l.key} className="rounded-lg border border-gray-100 bg-gray-50/40 p-2">
                    <div className="grid grid-cols-12 gap-2">
                      <select
                        className={`${inputCls} col-span-3`}
                        value={l.employeeId}
                        onChange={(e) => {
                          const newId = e.target.value;
                          const newEmp = empById.get(newId);
                          updateLine(idx, {
                            employeeId: newId,
                            entityId: newEmp?.legalEntityId ?? l.entityId,
                          });
                        }}
                      >
                        <option value="">Select employee…</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.displayName} ({e.legalEntityId})
                          </option>
                        ))}
                      </select>
                      <select
                        className={`${inputCls} col-span-2`}
                        value={l.entityId}
                        onChange={(e) => updateLine(idx, { entityId: e.target.value as OurEntity })}
                      >
                        {ALL_ENTITIES.map((e) => (
                          <option key={e} value={e}>
                            Pays from {e}
                          </option>
                        ))}
                      </select>
                      <select
                        className={`${inputCls} col-span-1`}
                        value={l.currency}
                        onChange={(e) => updateLine(idx, { currency: e.target.value as FinanceCurrencyCode })}
                      >
                        {ALL_CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        className={`${inputCls} col-span-2 text-right tabular-nums`}
                        placeholder="Net (orig)"
                        value={Number.isFinite(l.plannedNetOriginal) ? l.plannedNetOriginal : 0}
                        onChange={(e) => updateLine(idx, { plannedNetOriginal: Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        step="0.01"
                        className={`${inputCls} col-span-2 text-right tabular-nums`}
                        placeholder="Net EUR"
                        value={Number.isFinite(l.plannedNetEur) ? l.plannedNetEur : 0}
                        onChange={(e) =>
                          updateLine(idx, { plannedNetEur: Number(e.target.value), netEurOverridden: true })
                        }
                      />
                      <button
                        type="button"
                        className="col-span-1 inline-flex items-center justify-center rounded text-rose-600 hover:bg-rose-50"
                        onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label="Remove row"
                      >
                        <Trash2 size={14} />
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        className={`${inputCls} col-span-3 text-right tabular-nums`}
                        placeholder="Employer cost (orig, optional)"
                        value={Number.isFinite(l.plannedEmployerCostOriginal) ? l.plannedEmployerCostOriginal : 0}
                        onChange={(e) => updateLine(idx, { plannedEmployerCostOriginal: Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        step="0.01"
                        className={`${inputCls} col-span-2 text-right tabular-nums`}
                        placeholder="Cost EUR"
                        value={Number.isFinite(l.plannedEmployerCostEur) ? l.plannedEmployerCostEur : 0}
                        onChange={(e) =>
                          updateLine(idx, {
                            plannedEmployerCostEur: Number(e.target.value),
                            costEurOverridden: true,
                          })
                        }
                      />
                      <input
                        className={`${inputCls} col-span-7`}
                        placeholder="Notes (optional)"
                        value={l.notes}
                        onChange={(e) => updateLine(idx, { notes: e.target.value })}
                      />
                    </div>
                    {emp && (
                      <p className="mt-1 px-1 text-[10px] text-gray-400">
                        {emp.displayName} · HR entity {emp.legalEntityId}
                        {l.entityId !== emp.legalEntityId && (
                          <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">
                            cross-entity payment
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-gray-100 px-3 py-2 text-right text-xs text-gray-700">
            Total Net EUR: <span className="font-semibold">{fmtEur(totals.net)}</span>
            <span className="mx-2 text-gray-300">·</span>
            Total Employer Cost EUR: <span className="font-semibold">{fmtEur(totals.cost)}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={computedLines.filter((l) => l.employeeId && l.plannedNetOriginal > 0).length === 0}
          >
            {editing ? "Save changes" : "Create plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export function FinanceSalariesPage() {
  const plans = useAppStore((s) => s.financeSalaryPlans);
  const employees = useAppStore((s) => s.hrEmployees);
  const updatePlan = useAppStore((s) => s.updateFinanceSalaryPlan);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey());
  const [modalOpen, setModalOpen] = useState(false);

  const plan = useMemo(() => plans.find((p) => p.month === selectedMonth) ?? null, [plans, selectedMonth]);

  const empById = useMemo(() => {
    const m = new Map<string, HrEmployee>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const linesByEntity = useMemo(() => {
    const m = new Map<OurEntity, FinanceSalaryPlanLine[]>();
    if (!plan) return m;
    for (const l of plan.lines) {
      const arr = m.get(l.entityId) ?? [];
      arr.push(l);
      m.set(l.entityId, arr);
    }
    return m;
  }, [plan]);

  const markPaid = () => {
    if (!plan) return;
    const today = new Date().toISOString().slice(0, 10);
    updatePlan({ ...plan, status: "Paid", paidDate: today });
  };

  return (
    <div className="space-y-5">
      <UiPageHeader title="Salary Planning" subtitle="Monthly payroll commitments per entity" />

      {/* Section 1 — Month nav */}
      <div className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <button
          type="button"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-gray-400">{formatMonthShort(shiftMonth(selectedMonth, -1))}</span>
        <span className="px-3 text-base font-bold tabular-nums text-gray-900">
          {formatMonthLong(selectedMonth)}
        </span>
        <span className="text-xs text-gray-400">{formatMonthShort(shiftMonth(selectedMonth, 1))}</span>
        <button
          type="button"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="ml-2 rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          onClick={() => setSelectedMonth(currentMonthKey())}
        >
          This month
        </button>
      </div>

      {/* Section 2 — KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiKpiCard
          label="Total Net Payroll (EUR)"
          value={plan ? fmtEur(plan.totalNetEur) : "—"}
          icon={<Banknote className="h-5 w-5" />}
        />
        <UiKpiCard
          label="Total Employer Cost (EUR)"
          value={plan ? fmtEur(plan.totalEmployerCostEur) : "—"}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500">Plan Status</p>
              <div className="mt-2">
                <PlanStatusBadge value={plan ? plan.status : "None"} />
              </div>
              {plan?.paidDate && (
                <p className="mt-2 text-[11px] text-gray-500">Paid on <span className="tabular-nums">{plan.paidDate}</span></p>
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 — Plan actions (placed above breakdown for visibility) */}
      <div className="flex flex-wrap gap-2">
        {plan ? (
          <>
            {plan.status !== "Paid" && (
              <Button type="button" onClick={markPaid}>
                <span className="inline-flex items-center gap-1">
                  <FileCheck2 size={14} /> Mark as Paid
                </span>
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => setModalOpen(true)}>
              <span className="inline-flex items-center gap-1">
                <Pencil size={14} /> Edit Plan
              </span>
            </Button>
          </>
        ) : (
          <Button type="button" onClick={() => setModalOpen(true)} disabled={employees.length === 0}>
            <span className="inline-flex items-center gap-1">
              <Plus size={14} /> Create Plan for {formatMonthShort(selectedMonth)}
            </span>
          </Button>
        )}
      </div>

      {!plan && employees.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4 text-sm text-amber-800">
          No employees found in HR module. Add employees in HR → People first.
        </div>
      )}

      {/* Section 3 — Entity breakdown cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ALL_ENTITIES.map((entityId) => {
          const lines = linesByEntity.get(entityId) ?? [];
          const subtotalNet = lines.reduce((s, l) => s + l.plannedNetEur, 0);
          const subtotalCost = lines.reduce((s, l) => s + (l.plannedEmployerCostEur ?? 0), 0);
          return (
            <div key={entityId} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  <span className="mr-1.5">{ENTITY_FLAGS[entityId]}</span>
                  {entityId}
                </h3>
                <Users className="h-4 w-4 text-gray-400" />
              </div>

              {!plan ? (
                <p className="mt-4 text-xs text-gray-500">No plan for {formatMonthShort(selectedMonth)}.</p>
              ) : lines.length === 0 ? (
                <p className="mt-4 text-xs text-gray-500">No employees assigned to this entity.</p>
              ) : (
                <>
                  <div className="mt-3 overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/80">
                        <tr>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Employee</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Net (orig)</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Net EUR</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Employer EUR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l) => {
                          const emp = empById.get(l.employeeId);
                          return (
                            <tr key={l.id} className="border-t border-gray-100">
                              <td className="px-3 py-2 text-xs text-gray-800">
                                {emp?.displayName ?? `Employee ${l.employeeId}`}
                              </td>
                              <td className="px-3 py-2 text-xs tabular-nums text-gray-700 text-right">
                                {fmtOriginal(l.plannedNetOriginal, l.currency)}
                              </td>
                              <td className="px-3 py-2 text-xs font-medium tabular-nums text-gray-900 text-right">
                                {fmtEur(l.plannedNetEur)}
                              </td>
                              <td className="px-3 py-2 text-xs tabular-nums text-gray-700 text-right">
                                {l.plannedEmployerCostEur !== undefined ? fmtEur(l.plannedEmployerCostEur) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50/80">
                        <tr>
                          <td className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-700">Subtotal</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-xs font-bold tabular-nums text-gray-900 text-right">
                            {fmtEur(subtotalNet)}
                          </td>
                          <td className="px-3 py-2 text-xs font-bold tabular-nums text-gray-900 text-right">
                            {fmtEur(subtotalCost)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <PlanFormModal
        open={modalOpen}
        monthKey={selectedMonth}
        editing={plan}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

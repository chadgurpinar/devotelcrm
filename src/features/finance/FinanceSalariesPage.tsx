import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Users,
  UserSquare,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import type {
  FinanceContractor,
  FinanceCurrencyCode,
  FinanceSalaryDefault,
  FinanceSalaryPersonKind,
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

/** Default currency suggestion for a paying entity. */
const ENTITY_DEFAULT_CCY: Record<OurEntity, FinanceCurrencyCode> = {
  UK: "GBP",
  USA: "USD",
  TR: "TRY",
};

function PlanFormModal({
  open,
  monthKey,
  editing,
  previousPlan,
  onClose,
}: {
  open: boolean;
  monthKey: string;
  editing: FinanceSalaryPlan | null;
  previousPlan: FinanceSalaryPlan | null;
  onClose: () => void;
}) {
  const employees = useAppStore((s) => s.hrEmployees);
  const contractors = useAppStore((s) => s.financeContractors);
  const defaults = useAppStore((s) => s.financeSalaryDefaults);
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
    if (previousPlan && previousPlan.lines.length > 0) {
      // Copy from previous month — preserves employee, paying entity, currency, and amounts.
      setLines(
        previousPlan.lines.map((l, idx) => ({
          key: `l-prev-${idx}-${l.id}`,
          employeeId: l.employeeId,
          entityId: l.entityId,
          currency: l.currency,
          plannedNetOriginal: l.plannedNetOriginal,
          plannedNetEur: l.plannedNetEur,
          netEurOverridden: false,
          plannedEmployerCostOriginal: l.plannedEmployerCostOriginal ?? 0,
          plannedEmployerCostEur: l.plannedEmployerCostEur ?? 0,
          costEurOverridden: false,
          notes: l.notes ?? "",
        })),
      );
    } else if (defaults.length > 0) {
      // Fallback: pre-populate from the salary defaults registry.
      setLines(
        defaults.map((d, idx) => ({
          key: `l-def-${idx}-${d.id}`,
          employeeId: d.personId,
          entityId: d.entityId,
          currency: d.currency,
          plannedNetOriginal: d.defaultNetOriginal,
          plannedNetEur: approxEur(d.defaultNetOriginal, d.currency),
          netEurOverridden: false,
          plannedEmployerCostOriginal: d.defaultEmployerCostOriginal ?? 0,
          plannedEmployerCostEur:
            d.defaultEmployerCostOriginal !== undefined
              ? approxEur(d.defaultEmployerCostOriginal, d.currency)
              : 0,
          costEurOverridden: false,
          notes: d.notes ?? "",
        })),
      );
    } else {
      setLines([emptyLine(employees)]);
    }
  }, [open, editing, employees, previousPlan, defaults]);

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
            : previousPlan
            ? `Pre-filled from ${formatMonthShort(previousPlan.month)}. Adjust amounts as needed. Saving creates one Salary projection per paying entity, due on the first of the month.`
            : defaults.length > 0
            ? `Pre-filled from ${defaults.length} salary default(s). Saving creates one Salary projection per paying entity, due on the first of the month.`
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
                          const newEntity = newEmp?.legalEntityId ?? l.entityId;
                          updateLine(idx, {
                            employeeId: newId,
                            entityId: newEntity,
                            // Auto-suggest currency from paying entity (e.g. UK → GBP).
                            currency: ENTITY_DEFAULT_CCY[newEntity] ?? l.currency,
                            netEurOverridden: false,
                            costEurOverridden: false,
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
                        onChange={(e) => {
                          const newEntity = e.target.value as OurEntity;
                          updateLine(idx, {
                            entityId: newEntity,
                            currency: ENTITY_DEFAULT_CCY[newEntity] ?? l.currency,
                            netEurOverridden: false,
                            costEurOverridden: false,
                          });
                        }}
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

type SalariesTab = "Plan" | "Defaults" | "Contractors" | "History";

export function FinanceSalariesPage() {
  const plans = useAppStore((s) => s.financeSalaryPlans);
  const employees = useAppStore((s) => s.hrEmployees);
  const contractors = useAppStore((s) => s.financeContractors);
  const updatePlan = useAppStore((s) => s.updateFinanceSalaryPlan);

  const [tab, setTab] = useState<SalariesTab>("Plan");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey());
  const [modalOpen, setModalOpen] = useState(false);

  const plan = useMemo(() => plans.find((p) => p.month === selectedMonth) ?? null, [plans, selectedMonth]);
  const previousPlan = useMemo(
    () => plans.find((p) => p.month === shiftMonth(selectedMonth, -1)) ?? null,
    [plans, selectedMonth],
  );

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
      <UiPageHeader title="Salary Planning" subtitle="Monthly payroll commitments, defaults, and contractors" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-100 p-1">
        {(
          [
            { id: "Plan", label: `Plan (${plans.length})`, icon: <Banknote size={12} /> },
            { id: "History", label: "History", icon: <BarChart3 size={12} /> },
            { id: "Defaults", label: "Defaults", icon: <Layers size={12} /> },
            { id: "Contractors", label: `Contractors (${contractors.length})`, icon: <UserSquare size={12} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "History" && <HistoryTab />}
      {tab === "Defaults" && <DefaultsTab />}
      {tab === "Contractors" && <ContractorsTab />}

      {tab !== "Plan" && null}

      {tab === "Plan" && <>
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
        previousPlan={previousPlan}
        onClose={() => setModalOpen(false)}
      />
      </>}
    </div>
  );
}

// ─── History tab ─────────────────────────────────────────────────────

function HistoryTab() {
  const plans = useAppStore((s) => s.financeSalaryPlans);
  const employees = useAppStore((s) => s.hrEmployees);
  const contractors = useAppStore((s) => s.financeContractors);

  // Build month → { UK, USA, TR } stacked dataset.
  const monthData = useMemo(() => {
    type Row = { month: string; UK: number; USA: number; TR: number };
    const map = new Map<string, Row>();
    for (const p of plans) {
      if (p.status === "Cancelled") continue;
      const cur = map.get(p.month) ?? { month: p.month, UK: 0, USA: 0, TR: 0 };
      for (const l of p.lines) {
        cur[l.entityId] += l.plannedNetEur;
      }
      map.set(p.month, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [plans]);

  // Per-employee/contractor cumulative totals.
  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const cpById = useMemo(() => new Map(contractors.map((c) => [c.id, c])), [contractors]);

  const perPersonTotal = useMemo(() => {
    type Row = { personId: string; personKind: string; label: string; totalEur: number; months: number };
    const m = new Map<string, Row>();
    for (const p of plans) {
      if (p.status === "Cancelled") continue;
      const seenInMonth = new Set<string>();
      for (const l of p.lines) {
        const key = `${l.personKind ?? "Employee"}:${l.personId ?? l.employeeId}`;
        const labelBase =
          (l.personKind ?? "Employee") === "Contractor"
            ? cpById.get(l.personId ?? "")?.name ?? `Contractor ${l.personId ?? l.employeeId}`
            : empById.get(l.personId ?? l.employeeId)?.displayName ?? `Employee ${l.personId ?? l.employeeId}`;
        const cur =
          m.get(key) ??
          ({
            personId: l.personId ?? l.employeeId,
            personKind: l.personKind ?? "Employee",
            label: labelBase,
            totalEur: 0,
            months: 0,
          } as Row);
        cur.totalEur += l.plannedNetEur;
        if (!seenInMonth.has(key)) {
          cur.months += 1;
          seenInMonth.add(key);
        }
        m.set(key, cur);
      }
    }
    return Array.from(m.values()).sort((a, b) => b.totalEur - a.totalEur);
  }, [plans, empById, cpById]);

  if (monthData.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
        No historical salary plans yet.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Net Salary EUR — by Entity</h3>
          <p className="mt-0.5 text-xs text-gray-500">Stacked area · across all logged monthly plans</p>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                tickFormatter={(v: number) => fmtEur(v)}
                width={80}
              />
              <Tooltip formatter={(v: number, name: string) => [fmtEur(v), name]} />
              <Legend />
              <Area type="monotone" dataKey="UK" stackId="net" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              <Area type="monotone" dataKey="USA" stackId="net" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
              <Area type="monotone" dataKey="TR" stackId="net" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Per-person total</h3>
          <p className="mt-0.5 text-xs text-gray-500">Sum of planned net EUR across all logged months</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Person</th>
                <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Kind</th>
                <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Months paid</th>
                <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Total Net EUR</th>
              </tr>
            </thead>
            <tbody>
              {perPersonTotal.slice(0, 30).map((r) => (
                <tr key={`${r.personKind}-${r.personId}`} className="border-b border-gray-50">
                  <td className="px-5 py-2 text-sm text-gray-900">{r.label}</td>
                  <td className="px-5 py-2 text-xs text-gray-700">{r.personKind}</td>
                  <td className="px-5 py-2 text-sm text-gray-600 text-right tabular-nums">{r.months}</td>
                  <td className="px-5 py-2 text-sm font-semibold text-gray-900 text-right tabular-nums">
                    {fmtEur(r.totalEur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Defaults tab ────────────────────────────────────────────────────

function personLabel(
  d: FinanceSalaryDefault,
  empById: Map<string, HrEmployee>,
  cpById: Map<string, FinanceContractor>,
): string {
  if (d.personKind === "Employee") return empById.get(d.personId)?.displayName ?? `Employee ${d.personId}`;
  return cpById.get(d.personId)?.name ?? `Contractor ${d.personId}`;
}

function DefaultsTab() {
  const defaults = useAppStore((s) => s.financeSalaryDefaults);
  const employees = useAppStore((s) => s.hrEmployees);
  const contractors = useAppStore((s) => s.financeContractors);
  const upsert = useAppStore((s) => s.upsertFinanceSalaryDefault);
  const remove = useAppStore((s) => s.deleteFinanceSalaryDefault);

  const [editing, setEditing] = useState<FinanceSalaryDefault | "new" | null>(null);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const cpById = useMemo(() => new Map(contractors.map((c) => [c.id, c])), [contractors]);

  const sorted = useMemo(
    () =>
      defaults.slice().sort((a, b) => {
        if (a.entityId !== b.entityId) return a.entityId.localeCompare(b.entityId);
        return personLabel(a, empById, cpById).localeCompare(personLabel(b, empById, cpById));
      }),
    [defaults, empById, cpById],
  );

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div className="text-xs text-gray-500">
          Defaults pre-populate new monthly plans. They are not posted as projections until added to a plan.
        </div>
        <Button type="button" onClick={() => setEditing("new")}>
          <span className="inline-flex items-center gap-1">
            <Plus size={14} /> Add default
          </span>
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">No defaults yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Kind</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Person</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Currency</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Net (default)</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Employer cost</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                    <td className="px-5 py-3 text-sm text-gray-800">
                      <span className="mr-1.5">{ENTITY_FLAGS[d.entityId]}</span>
                      {d.entityId}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          d.personKind === "Employee"
                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                            : "bg-violet-50 text-violet-700 ring-violet-200 ring-1"
                        }`}
                      >
                        {d.personKind}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900">{personLabel(d, empById, cpById)}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{d.currency}</td>
                    <td className="px-5 py-3 text-sm tabular-nums text-gray-800 text-right">
                      {fmtOriginal(d.defaultNetOriginal, d.currency)}
                    </td>
                    <td className="px-5 py-3 text-sm tabular-nums text-gray-700 text-right">
                      {d.defaultEmployerCostOriginal !== undefined
                        ? fmtOriginal(d.defaultEmployerCostOriginal, d.currency)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" type="button" onClick={() => setEditing(d)}>
                          <span className="inline-flex items-center gap-1">
                            <Pencil size={12} /> Edit
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete default for ${personLabel(d, empById, cpById)}?`)) remove(d.id);
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

      {editing && (
        <DefaultEditorModal
          editing={editing === "new" ? null : editing}
          employees={employees}
          contractors={contractors}
          onSave={(payload) => {
            upsert(payload);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function DefaultEditorModal({
  editing,
  employees,
  contractors,
  onSave,
  onClose,
}: {
  editing: FinanceSalaryDefault | null;
  employees: HrEmployee[];
  contractors: FinanceContractor[];
  onSave: (payload: Omit<FinanceSalaryDefault, "id" | "updatedAt">) => void;
  onClose: () => void;
}) {
  const [personKind, setPersonKind] = useState<FinanceSalaryPersonKind>(editing?.personKind ?? "Employee");
  const [personId, setPersonId] = useState(editing?.personId ?? "");
  const [entityId, setEntityId] = useState<OurEntity>(editing?.entityId ?? "UK");
  const [currency, setCurrency] = useState<FinanceCurrencyCode>(editing?.currency ?? "GBP");
  const [defaultNetOriginal, setDefaultNetOriginal] = useState(editing?.defaultNetOriginal ?? 0);
  const [defaultEmployerCostOriginal, setDefaultEmployerCostOriginal] = useState(
    editing?.defaultEmployerCostOriginal ?? 0,
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const empOptions = employees.map((e) => ({ id: e.id, label: `${e.displayName} (${e.legalEntityId})` }));
  const cpOptions = contractors
    .filter((c) => c.active)
    .map((c) => ({ id: c.id, label: `${c.name} (${c.defaultEntityId})` }));
  const personOptions = personKind === "Employee" ? empOptions : cpOptions;

  const submit = () => {
    if (!personId || defaultNetOriginal <= 0) return;
    onSave({
      personKind,
      personId,
      entityId,
      currency,
      defaultNetOriginal: Math.round(defaultNetOriginal * 100) / 100,
      defaultEmployerCostOriginal:
        defaultEmployerCostOriginal > 0 ? Math.round(defaultEmployerCostOriginal * 100) / 100 : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">{editing ? "Edit default" : "New default"}</h3>
        <p className="mt-1 text-xs text-gray-500">
          Defaults are picked up automatically when creating a new month plan with no previous month.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-700">
            Kind
            <select
              className={inputCls}
              value={personKind}
              onChange={(e) => {
                const k = e.target.value as FinanceSalaryPersonKind;
                setPersonKind(k);
                setPersonId("");
              }}
            >
              <option value="Employee">Employee</option>
              <option value="Contractor">Contractor</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Person
            <select className={inputCls} value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">Select…</option>
              {personOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Paying entity
            <select
              className={inputCls}
              value={entityId}
              onChange={(e) => {
                const ent = e.target.value as OurEntity;
                setEntityId(ent);
                setCurrency(ENTITY_DEFAULT_CCY[ent] ?? currency);
              }}
            >
              {ALL_ENTITIES.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Currency
            <select
              className={inputCls}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as FinanceCurrencyCode)}
            >
              {ALL_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Default net
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={Number.isFinite(defaultNetOriginal) ? defaultNetOriginal : 0}
              onChange={(e) => setDefaultNetOriginal(Number(e.target.value))}
            />
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Default employer cost <span className="text-gray-400">(optional)</span>
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right tabular-nums`}
              value={Number.isFinite(defaultEmployerCostOriginal) ? defaultEmployerCostOriginal : 0}
              onChange={(e) => setDefaultEmployerCostOriginal(Number(e.target.value))}
            />
          </label>

          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Notes
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!personId || defaultNetOriginal <= 0}>
            {editing ? "Save changes" : "Add default"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Contractors tab ─────────────────────────────────────────────────

function ContractorsTab() {
  const contractors = useAppStore((s) => s.financeContractors);
  const addContractor = useAppStore((s) => s.addFinanceContractor);
  const updateContractor = useAppStore((s) => s.updateFinanceContractor);
  const deleteContractor = useAppStore((s) => s.deleteFinanceContractor);
  const [editing, setEditing] = useState<FinanceContractor | "new" | null>(null);

  const sorted = useMemo(
    () =>
      contractors.slice().sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [contractors],
  );

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div className="text-xs text-gray-500">
          Lightweight contractor records — referenced by salary lines and defaults.
        </div>
        <Button type="button" onClick={() => setEditing("new")}>
          <span className="inline-flex items-center gap-1">
            <Plus size={14} /> Add contractor
          </span>
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">No contractors yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Default entity</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Default ccy</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Active</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${c.active ? "" : "opacity-60"}`}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      <span className="mr-1.5">{ENTITY_FLAGS[c.defaultEntityId]}</span>
                      {c.defaultEntityId}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{c.defaultCurrency}</td>
                    <td className="px-5 py-3 text-xs text-gray-600">{c.email ?? "—"}</td>
                    <td className="px-5 py-3 text-xs">
                      <label className="inline-flex cursor-pointer items-center gap-1 text-gray-600">
                        <input
                          type="checkbox"
                          checked={c.active}
                          onChange={() => updateContractor({ ...c, active: !c.active })}
                        />
                        {c.active ? "Yes" : "No"}
                      </label>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" type="button" onClick={() => setEditing(c)}>
                          <span className="inline-flex items-center gap-1">
                            <Pencil size={12} /> Edit
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete contractor ${c.name}?`)) deleteContractor(c.id);
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

      {editing && (
        <ContractorEditorModal
          editing={editing === "new" ? null : editing}
          onSave={(payload) => {
            if (editing && editing !== "new") {
              updateContractor({ ...editing, ...payload });
            } else {
              addContractor(payload);
            }
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ContractorEditorModal({
  editing,
  onSave,
  onClose,
}: {
  editing: FinanceContractor | null;
  onSave: (payload: Omit<FinanceContractor, "id" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [defaultEntityId, setDefaultEntityId] = useState<OurEntity>(editing?.defaultEntityId ?? "UK");
  const [defaultCurrency, setDefaultCurrency] = useState<FinanceCurrencyCode>(editing?.defaultCurrency ?? "GBP");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [active, setActive] = useState(editing?.active ?? true);

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      defaultEntityId,
      defaultCurrency,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      active,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">{editing ? "Edit contractor" : "New contractor"}</h3>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Name
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Default entity
            <select
              className={inputCls}
              value={defaultEntityId}
              onChange={(e) => {
                const ent = e.target.value as OurEntity;
                setDefaultEntityId(ent);
                setDefaultCurrency(ENTITY_DEFAULT_CCY[ent] ?? defaultCurrency);
              }}
            >
              {ALL_ENTITIES.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-700">
            Default currency
            <select
              className={inputCls}
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value as FinanceCurrencyCode)}
            >
              {ALL_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Email <span className="text-gray-400">(optional)</span>
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="col-span-2 text-xs font-semibold text-gray-700">
            Notes <span className="text-gray-400">(optional)</span>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label className="col-span-2 inline-flex items-center gap-2 text-xs font-medium text-gray-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!name.trim()}>
            {editing ? "Save changes" : "Add contractor"}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Wallet,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { Drawer, EmptyState, StatusBadge } from "../components/primitives";
import { cycleStatusTone, formatPeriod } from "./utils";
import {
  HR2_CURRENCIES,
  HR2_ENTITIES,
  entityLabel,
  formatDate,
  formatMoney,
} from "../compensation/utils";
import { HrCurrencyCode, OurEntity } from "../../../store/types";

export function Hr2PayrollOverviewPage() {
  const navigate = useNavigate();
  const cycles = useAppStore((s) => s.hr2PayrollCycles);
  const cycleLines = useAppStore((s) => s.hr2PayrollCycleLines);
  const exceptions = useAppStore((s) => s.hr2PayrollExceptions);
  const activeUserId = useAppStore((s) => s.activeUserId);
  const openCycle = useAppStore((s) => s.openHr2PayrollCycle);
  const recompute = useAppStore((s) => s.recomputeHr2PayrollCycle);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [legalEntityId, setLegalEntityId] = useState<OurEntity>("UK");
  const [payrollCurrency, setPayrollCurrency] = useState<HrCurrencyCode>("GBP");
  const [notes, setNotes] = useState("");

  const linesByCycle = useMemo(() => {
    const map = new Map<string, typeof cycleLines>();
    cycleLines.forEach((line) => {
      const list = map.get(line.cycleId) ?? [];
      list.push(line);
      map.set(line.cycleId, list);
    });
    return map;
  }, [cycleLines]);
  const blockersByCycle = useMemo(() => {
    const map = new Map<string, number>();
    exceptions.forEach((ex) => {
      if (ex.status === "Open" && ex.severity === "Blocker") {
        map.set(ex.cycleId, (map.get(ex.cycleId) ?? 0) + 1);
      }
    });
    return map;
  }, [exceptions]);

  const sortedCycles = useMemo(
    () =>
      cycles
        .slice()
        .sort((a, b) => {
          if (a.period !== b.period) return b.period.localeCompare(a.period);
          return a.legalEntityId.localeCompare(b.legalEntityId);
        }),
    [cycles],
  );

  const kpis = useMemo(() => {
    const inReview = cycles.filter((c) => c.status === "ReadyForReview" || c.status === "Computing").length;
    const approved = cycles.filter((c) => c.status === "Approved" || c.status === "PaidOut").length;
    const totalBlockers = exceptions.filter((ex) => ex.status === "Open" && ex.severity === "Blocker").length;
    return { total: cycles.length, inReview, approved, totalBlockers };
  }, [cycles, exceptions]);

  const handleOpenCycle = () => {
    if (!period || !legalEntityId || !payrollCurrency) return;
    const cycleId = openCycle({
      period,
      legalEntityId,
      payrollCurrency,
      userId: activeUserId,
      notes: notes.trim() || undefined,
    });
    recompute(cycleId, activeUserId);
    setDrawerOpen(false);
    navigate(`/hr2/payroll/${cycleId}`);
  };

  return (
    <div className="p-6">
      <UiPageHeader
        title="Payroll"
        subtitle="Period-by-entity payroll cycles. Each cycle derives lines from active compensation packages."
        actions={
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <CalendarPlus size={14} className="mr-1" /> Open a new cycle
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total cycles" value={kpis.total} icon={<ClipboardList size={16} />} tone="neutral" />
        <Kpi label="In review" value={kpis.inReview} icon={<ChevronRight size={16} />} tone="indigo" />
        <Kpi label="Approved" value={kpis.approved} icon={<CheckCircle2 size={16} />} tone="success" />
        <Kpi label="Open blockers" value={kpis.totalBlockers} icon={<AlertOctagon size={16} />} tone="danger" />
      </div>

      {sortedCycles.length === 0 ? (
        <EmptyState
          icon={<Wallet size={20} />}
          title="No payroll cycles yet"
          description="Open the first cycle for any legal entity. The cycle workspace derives lines from active compensation packages."
          action={
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <CalendarPlus size={14} className="mr-1" /> Open a new cycle
            </Button>
          }
        />
      ) : (
        <Card padded={false}>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-left">Entity</th>
                <th className="px-3 py-2 text-left">Currency</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Lines</th>
                <th className="px-3 py-2 text-right">Net total</th>
                <th className="px-3 py-2 text-right">Blockers</th>
                <th className="px-3 py-2 text-left">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedCycles.map((cycle) => {
                const lines = linesByCycle.get(cycle.id) ?? [];
                const netTotal = lines.reduce((sum, l) => sum + l.netPayrollCurrency, 0);
                const blockers = blockersByCycle.get(cycle.id) ?? 0;
                return (
                  <tr
                    key={cycle.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => navigate(`/hr2/payroll/${cycle.id}`)}
                  >
                    <td className="px-3 py-2 font-semibold text-slate-800">{formatPeriod(cycle.period)}</td>
                    <td className="px-3 py-2 text-slate-700">{entityLabel(cycle.legalEntityId)}</td>
                    <td className="px-3 py-2 text-slate-700">{cycle.payrollCurrency}</td>
                    <td className="px-3 py-2">
                      <StatusBadge label={cycle.status} tone={cycleStatusTone(cycle.status)} dot />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{lines.length}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatMoney(netTotal, cycle.payrollCurrency)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {blockers > 0 ? (
                        <StatusBadge label={blockers} tone="danger" dot />
                      ) : (
                        <span className="text-[11px] text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{formatDate(cycle.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="What payroll does in HR Module 2" className="mt-6">
        <ul className="space-y-1 text-xs text-slate-600">
          <li>
            <span className="font-semibold text-slate-700">Open</span> — pick period, entity, currency. A draft cycle is
            created and lines are derived from currently active compensation packages.
          </li>
          <li>
            <span className="font-semibold text-slate-700">Review</span> — exceptions surface as Blockers or Warnings.
            Blockers must be resolved before approval.
          </li>
          <li>
            <span className="font-semibold text-slate-700">Approve</span> — emits payment-instruction batches and lines
            that Finance picks up. Blocked lines remain Blocked until exceptions are cleared.
          </li>
        </ul>
      </Card>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Open a new payroll cycle"
        subtitle="A draft cycle is created and lines are derived from current active compensation packages."
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleOpenCycle} disabled={!period || !legalEntityId || !payrollCurrency}>
              Open & compute
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>Period (YYYY-MM)</FieldLabel>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel>Legal entity</FieldLabel>
            <select
              value={legalEntityId}
              onChange={(e) => setLegalEntityId(e.target.value as OurEntity)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {HR2_ENTITIES.map((entity) => (
                <option key={entity} value={entity}>
                  {entityLabel(entity)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Payroll currency</FieldLabel>
            <select
              value={payrollCurrency}
              onChange={(e) => setPayrollCurrency(e.target.value as HrCurrencyCode)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {HR2_CURRENCIES.map((ccy) => (
                <option key={ccy} value={ccy}>
                  {ccy}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Notes (optional)</FieldLabel>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Context for reviewers..."
            />
          </div>
          <p className="text-[11px] text-slate-500">
            <Link to="/hr2/compensation" className="text-brand-700 hover:text-brand-800">
              Compensation
            </Link>{" "}
            must contain active packages for the chosen entity, otherwise the cycle will have zero lines.
          </p>
        </div>
      </Drawer>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "neutral" | "indigo" | "success" | "danger";
}) {
  const toneClass = {
    neutral: "text-slate-700",
    indigo: "text-indigo-700",
    success: "text-emerald-700",
    danger: "text-rose-700",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className={`mt-0.5 text-2xl font-bold ${toneClass}`}>{value}</p>
        </div>
        <span className="text-slate-300">{icon}</span>
      </div>
    </div>
  );
}

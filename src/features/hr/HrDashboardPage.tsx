import { useMemo } from "react";
import { Badge, Card } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { computePayrollPreview, dateRangesOverlap } from "../../store/hrUtils";

function pctChange(current: number, previous: number): { label: string; color: string } | null {
  if (previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? "+" : "";
  const arrow = delta >= 0 ? "↑" : "↓";
  const color = delta >= 0 ? "text-emerald-600" : "text-red-600";
  return { label: `${arrow} ${sign}${delta.toFixed(1)}% vs last month`, color };
}

function getWeekRange(now: Date): { start: Date; end: Date } {
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function matchesWeekByMonthDay(dateStr: string | undefined, weekStart: Date, weekEnd: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const thisYear = weekStart.getFullYear();
  const check = new Date(thisYear, d.getMonth(), d.getDate());
  return check >= weekStart && check <= weekEnd;
}

export function HrDashboardPage() {
  const state = useAppStore();
  const month = new Date().toISOString().slice(0, 7);

  const departmentById = useMemo(() => {
    const map = new Map(state.hrDepartments.map((department) => [department.id, department.name]));
    return map;
  }, [state.hrDepartments]);

  const headcountByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    state.hrEmployees
      .filter((employee) => employee.active)
      .forEach((employee) => {
        map.set(employee.departmentId, (map.get(employee.departmentId) ?? 0) + 1);
      });
    return Array.from(map.entries())
      .map(([departmentId, count]) => ({
        departmentId,
        departmentName: departmentById.get(departmentId) ?? departmentId,
        count,
      }))
      .sort((left, right) => right.count - left.count);
  }, [departmentById, state.hrEmployees]);

  const preview = useMemo(
    () =>
      computePayrollPreview({
        employees: state.hrEmployees,
        compensations: state.hrCompensations,
        fxRates: state.hrFxRates,
        month,
      }),
    [month, state.hrCompensations, state.hrEmployees, state.hrFxRates],
  );

  const pendingExpenseApprovals = useMemo(
    () => state.hrExpenses.filter((expense) => expense.status === "PendingManager" || expense.status === "PendingFinance").length,
    [state.hrExpenses],
  );

  const assetsAssigned = useMemo(
    () => state.hrAssets.filter((asset) => Boolean(asset.assignedToEmployeeId) && !asset.returnedAt).length,
    [state.hrAssets],
  );

  const upcomingLeaveConflicts = useMemo(() => {
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 30);
    const activeRows = state.hrLeaveRequests.filter((row) => {
      if (!(row.status === "PendingManager" || row.status === "PendingHR" || row.status === "Approved")) return false;
      const start = new Date(row.startDate);
      return start <= windowEnd;
    });
    let conflicts = 0;
    for (let i = 0; i < activeRows.length; i += 1) {
      for (let j = i + 1; j < activeRows.length; j += 1) {
        const left = activeRows[i];
        const right = activeRows[j];
        if (left.employeeId === right.employeeId) continue;
        if (dateRangesOverlap(left.startDate, left.endDate, right.startDate, right.endDate)) conflicts += 1;
      }
    }
    return conflicts;
  }, [state.hrLeaveRequests]);

  // DASH 1 — Action Required data
  const pendingLeaveCount = useMemo(
    () => state.hrLeaveRequests.filter((r) => r.status === "PendingHR" || r.status === "PendingManager").length,
    [state.hrLeaveRequests],
  );

  const pendingExpenseCount = useMemo(
    () => state.hrExpenses.filter((e) => e.status === "PendingManager" || e.status === "PendingFinance").length,
    [state.hrExpenses],
  );

  const birthdaysThisWeek = useMemo(() => {
    const { start, end } = getWeekRange(new Date());
    return state.hrEmployees
      .filter((emp) => emp.active && matchesWeekByMonthDay(emp.birthDate, start, end))
      .map((emp) => emp.displayName || `${emp.firstName} ${emp.lastName}`);
  }, [state.hrEmployees]);

  const newStartersThisWeek = useMemo(() => {
    const { start, end } = getWeekRange(new Date());
    return state.hrEmployees
      .filter((emp) => {
        if (!emp.active || !emp.startDate) return false;
        const sd = new Date(emp.startDate);
        return sd >= start && sd <= end;
      })
      .map((emp) => emp.displayName || `${emp.firstName} ${emp.lastName}`);
  }, [state.hrEmployees]);

  const allClear = pendingLeaveCount === 0 && pendingExpenseCount === 0 && birthdaysThisWeek.length === 0 && newStartersThisWeek.length === 0;

  // DASH 2 — KPI % change vs previous month
  const kpiChanges = useMemo(() => {
    const sorted = state.hrPayrollSnapshots.slice().sort((a, b) => b.month.localeCompare(a.month));
    const current = sorted[0] ?? null;
    const previous = sorted[1] ?? null;

    const activeHeadcount = state.hrEmployees.filter((e) => e.active).length;
    const prevHeadcount = previous?.totals.headcount ?? null;
    const headcountChange = prevHeadcount !== null ? pctChange(activeHeadcount, prevHeadcount) : null;

    const payrollChange = previous ? pctChange(preview.totals.netEur, previous.totals.netEur) : null;
    const employerCostChange = previous ? pctChange(preview.totals.employerCostEur, previous.totals.employerCostEur) : null;

    const currentConflicts = upcomingLeaveConflicts;
    const prevExpenses = previous ? previous.totals.bonusesEur : null;
    const expenseChange = prevExpenses !== null ? pctChange(pendingExpenseApprovals, prevExpenses) : null;

    return {
      headcount: headcountChange,
      payroll: payrollChange,
      employerCost: employerCostChange,
      leaveConflicts: null as ReturnType<typeof pctChange>,
      expenses: expenseChange,
      assets: null as ReturnType<typeof pctChange>,
      hasPriorData: previous !== null,
    };
  }, [state.hrPayrollSnapshots, state.hrEmployees, preview, upcomingLeaveConflicts, pendingExpenseApprovals]);

  // DASH 3 — Payroll Trend (last 6 months)
  const payrollTrend = useMemo(() => {
    const sorted = state.hrPayrollSnapshots
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
    const maxCost = Math.max(...sorted.map((s) => s.totals.employerCostEur), 1);
    return sorted.map((snapshot) => ({
      month: snapshot.month,
      netEur: snapshot.totals.netEur,
      employerCostEur: snapshot.totals.employerCostEur,
      headcount: snapshot.totals.headcount,
      barPct: (snapshot.totals.employerCostEur / maxCost) * 100,
    }));
  }, [state.hrPayrollSnapshots]);

  // DASH 4 — Department cost breakdown
  const departmentCosts = useMemo(() => {
    const map = new Map<string, { headcount: number; totalCost: number }>();
    state.hrEmployees
      .filter((emp) => emp.active)
      .forEach((emp) => {
        const deptName = departmentById.get(emp.departmentId) ?? emp.departmentId;
        const existing = map.get(deptName) ?? { headcount: 0, totalCost: 0 };
        existing.headcount += 1;
        existing.totalCost += emp.salaryEur ?? 0;
        map.set(deptName, existing);
      });
    return Array.from(map.entries())
      .map(([department, data]) => ({ department, ...data }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [state.hrEmployees, departmentById]);

  // Existing cost trend (kept for backward compat reference)
  const costTrend = useMemo(
    () =>
      state.hrPayrollSnapshots
        .slice()
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((snapshot) => ({
          month: snapshot.month,
          employerCostEur: snapshot.totals.employerCostEur,
        })),
    [state.hrPayrollSnapshots],
  );

  function renderKpiDelta(change: ReturnType<typeof pctChange>, hasPrior: boolean) {
    if (!hasPrior) return <p className="text-[10px] text-slate-400">No prior data</p>;
    if (!change) return <p className="text-[10px] text-slate-400">No prior data</p>;
    return <p className={`text-[10px] font-medium ${change.color}`}>{change.label}</p>;
  }

  return (
    <div className="space-y-4">
      {/* DASH 1 — Action Required */}
      <Card title="⚡ Action Required">
        {allClear ? (
          <p className="text-sm font-medium text-emerald-600">✓ All clear — no pending actions</p>
        ) : (
          <div className="space-y-1">
            {pendingLeaveCount > 0 && (
              <p className="text-sm text-slate-700">
                <Badge className="mr-1 bg-amber-100 text-amber-800">{pendingLeaveCount}</Badge>
                leave requests awaiting approval
              </p>
            )}
            {pendingExpenseCount > 0 && (
              <p className="text-sm text-slate-700">
                <Badge className="mr-1 bg-amber-100 text-amber-800">{pendingExpenseCount}</Badge>
                expenses awaiting approval
              </p>
            )}
            {birthdaysThisWeek.length > 0 && (
              <p className="text-sm text-slate-700">
                🎂 {birthdaysThisWeek.length} birthdays this week: {birthdaysThisWeek.join(", ")}
              </p>
            )}
            {newStartersThisWeek.length > 0 && (
              <p className="text-sm text-slate-700">
                👋 {newStartersThisWeek.length} new starters this week: {newStartersThisWeek.join(", ")}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* DASH 2 — KPI cards with % change */}
      <Card title="HR Dashboard">
        <div className="mb-3 grid gap-2 md:grid-cols-6">
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Total headcount</p>
            <p className="text-xl font-semibold text-slate-800">{state.hrEmployees.filter((employee) => employee.active).length}</p>
            {renderKpiDelta(kpiChanges.headcount, kpiChanges.hasPriorData)}
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Monthly payroll EUR</p>
            <p className="text-xl font-semibold text-slate-800">{preview.totals.netEur.toLocaleString()}</p>
            {renderKpiDelta(kpiChanges.payroll, kpiChanges.hasPriorData)}
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Employer cost EUR</p>
            <p className="text-xl font-semibold text-slate-800">{preview.totals.employerCostEur.toLocaleString()}</p>
            {renderKpiDelta(kpiChanges.employerCost, kpiChanges.hasPriorData)}
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Leave conflicts (30d)</p>
            <p className="text-xl font-semibold text-slate-800">{upcomingLeaveConflicts}</p>
            {renderKpiDelta(kpiChanges.leaveConflicts, false)}
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending expenses</p>
            <p className="text-xl font-semibold text-slate-800">{pendingExpenseApprovals}</p>
            {renderKpiDelta(kpiChanges.expenses, kpiChanges.hasPriorData)}
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Assets assigned</p>
            <p className="text-xl font-semibold text-slate-800">{assetsAssigned}</p>
            {renderKpiDelta(kpiChanges.assets, false)}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="rounded-md border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Headcount by department</p>
            <div className="space-y-2">
              {headcountByDepartment.map((entry) => (
                <div key={entry.departmentId} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1">
                  <p className="text-xs text-slate-700">{entry.departmentName}</p>
                  <Badge className="bg-slate-100 text-slate-700">{entry.count}</Badge>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-md border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payroll by legal entity (EUR)</p>
            <div className="space-y-2">
              {preview.totals.byLegalEntity.map((entry) => (
                <div key={entry.legalEntityId} className="rounded-md border border-slate-200 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">{entry.legalEntityId}</p>
                    <Badge className="bg-slate-100 text-slate-700">{entry.headcount} people</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">Net: {entry.netEur.toLocaleString()} EUR</p>
                  <p className="text-[11px] text-slate-600">Employer cost: {entry.employerCostEur.toLocaleString()} EUR</p>
                  <p className="text-[11px] text-slate-600">Bonuses: {entry.bonusesEur.toLocaleString()} EUR</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Card>

      {/* DASH 3 — Payroll Trend */}
      <Card title="Payroll Cost Trend — Last 6 Months">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
              <th className="pb-2 pr-3">Month</th>
              <th className="pb-2 pr-3 text-right">Total Net EUR</th>
              <th className="pb-2 pr-3 text-right">Employer Cost EUR</th>
              <th className="pb-2 pr-3 text-right">Headcount</th>
              <th className="pb-2" style={{ minWidth: 120 }}>Bar</th>
            </tr>
          </thead>
          <tbody>
            {payrollTrend.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 text-slate-500">
                  No payroll snapshots yet.
                </td>
              </tr>
            ) : (
              payrollTrend.map((entry) => (
                <tr key={entry.month} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 font-medium text-slate-700">{entry.month}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-600">{entry.netEur.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-600">{entry.employerCostEur.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-600">{entry.headcount}</td>
                  <td className="py-1.5">
                    <div className="h-3 rounded bg-blue-500" style={{ width: `${entry.barPct}%` }} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* DASH 4 — Department cost breakdown */}
      <Card title="Cost by Department">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
              <th className="pb-2 pr-3">Department</th>
              <th className="pb-2 pr-3 text-right">Headcount</th>
              <th className="pb-2 text-right">Est. Monthly Cost (EUR)</th>
            </tr>
          </thead>
          <tbody>
            {departmentCosts.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-3 text-slate-500">
                  No department data.
                </td>
              </tr>
            ) : (
              departmentCosts.map((row) => (
                <tr key={row.department} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 font-medium text-slate-700">{row.department}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-600">{row.headcount}</td>
                  <td className="py-1.5 text-right text-slate-600">{row.totalCost.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Existing Payroll Dashboard section */}
      <Card title="Payroll Dashboard">
        <div className="mb-2 grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Current bonus summary EUR</p>
            <p className="text-lg font-semibold text-slate-800">{preview.totals.bonusesEur.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Snapshot count</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrPayrollSnapshots.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Last snapshot month</p>
            <p className="text-lg font-semibold text-slate-800">
              {state.hrPayrollSnapshots.length ? state.hrPayrollSnapshots.slice().sort((a, b) => b.month.localeCompare(a.month))[0].month : "-"}
            </p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Employer cost EUR</th>
            </tr>
          </thead>
          <tbody>
            {costTrend.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-xs text-slate-500">
                  No payroll snapshots yet.
                </td>
              </tr>
            ) : (
              costTrend.map((entry) => (
                <tr key={entry.month}>
                  <td>{entry.month}</td>
                  <td>{entry.employerCostEur.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

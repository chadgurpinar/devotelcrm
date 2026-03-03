import { useMemo } from "react";
import { Badge, Card } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { computePayrollPreview, dateRangesOverlap } from "../../store/hrUtils";

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

  return (
    <div className="space-y-4">
      <Card title="HR Dashboard">
        <div className="mb-3 grid gap-2 md:grid-cols-6">
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Total headcount</p>
            <p className="text-xl font-semibold text-slate-800">{state.hrEmployees.filter((employee) => employee.active).length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Monthly payroll EUR</p>
            <p className="text-xl font-semibold text-slate-800">{preview.totals.netEur.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Employer cost EUR</p>
            <p className="text-xl font-semibold text-slate-800">{preview.totals.employerCostEur.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Leave conflicts (30d)</p>
            <p className="text-xl font-semibold text-slate-800">{upcomingLeaveConflicts}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending expenses</p>
            <p className="text-xl font-semibold text-slate-800">{pendingExpenseApprovals}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Assets assigned</p>
            <p className="text-xl font-semibold text-slate-800">{assetsAssigned}</p>
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

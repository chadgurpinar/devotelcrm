import { useMemo, useState } from "react";
import { Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";

export function HrPayslipPage() {
  const state = useAppStore();

  const myEmployee = useMemo(
    () => state.hrEmployees.find((e) => e.systemUserId === state.activeUserId),
    [state.hrEmployees, state.activeUserId],
  );

  const departmentName = useMemo(() => {
    if (!myEmployee) return "";
    return state.hrDepartments.find((d) => d.id === myEmployee.departmentId)?.name ?? myEmployee.departmentId;
  }, [myEmployee, state.hrDepartments]);

  const availableMonths = useMemo(
    () =>
      state.hrPayrollSnapshots
        .slice()
        .sort((a, b) => b.month.localeCompare(a.month))
        .map((s) => s.month),
    [state.hrPayrollSnapshots],
  );

  const [selectedMonth, setSelectedMonth] = useState(() => availableMonths[0] ?? "");

  const payrollLine = useMemo(() => {
    if (!myEmployee || !selectedMonth) return null;
    const snapshot = state.hrPayrollSnapshots.find((s) => s.month === selectedMonth);
    if (!snapshot) return null;
    return snapshot.lines.find((l) => l.employeeId === myEmployee.id) ?? null;
  }, [myEmployee, selectedMonth, state.hrPayrollSnapshots]);

  function formatMonth(m: string): string {
    const [y, mo] = m.split("-");
    const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${names[parseInt(mo, 10) - 1]} ${y}`;
  }

  if (!myEmployee) {
    return (
      <div className="space-y-4">
        <Card title="My Payslip">
          <p className="text-sm text-slate-500 py-8 text-center">No employee profile linked to your account.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title="My Payslip"
        actions={
          <div className="w-48">
            <FieldLabel>Period</FieldLabel>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {availableMonths.length === 0 && <option value="">No snapshots</option>}
              {availableMonths.map((m) => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>
        }
      >
        {!payrollLine ? (
          <p className="text-sm text-slate-500 py-8 text-center">No payroll data for this period.</p>
        ) : (
          <div className="max-w-lg mx-auto">
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-brand-600 px-5 py-3">
                <p className="text-white font-bold text-sm">DEVOTEL — PAYSLIP</p>
              </div>
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-700"><span className="text-slate-500">Employee:</span> {myEmployee.displayName || `${myEmployee.firstName} ${myEmployee.lastName}`}</p>
                <p className="text-sm text-slate-700"><span className="text-slate-500">Period:</span> {formatMonth(selectedMonth)}</p>
                <p className="text-sm text-slate-700"><span className="text-slate-500">Department:</span> {departmentName}</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-5 py-2 text-slate-600">Base Salary Net</td>
                    <td className="px-5 py-2 text-right font-semibold text-slate-800">{payrollLine.netEur.toLocaleString()} EUR</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-5 py-2 text-slate-600">Employer Cost</td>
                    <td className="px-5 py-2 text-right font-semibold text-slate-800">{payrollLine.employerCostEur.toLocaleString()} EUR</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-5 py-2 text-slate-600">Bonuses Total</td>
                    <td className="px-5 py-2 text-right font-semibold text-slate-800">{payrollLine.bonusesEur.toLocaleString()} EUR</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-5 py-3 font-bold text-slate-800">TOTAL (Net)</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800 text-lg">{payrollLine.netEur.toLocaleString()} EUR</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[10px] text-slate-400 text-center">⚙ This is a read-only summary view. Official payslips are issued by Finance.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

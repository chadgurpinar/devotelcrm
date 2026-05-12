import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { formatPeriod } from "./utils";
import {
  componentKindAccent,
  componentKindLabel,
  entityLabel,
  formatDate,
  formatMoney,
} from "../compensation/utils";

export function Hr2PayslipPage() {
  const params = useParams<{ cycleLineId: string }>();
  const cycleLineId = params.cycleLineId ?? "";
  const navigate = useNavigate();

  const line = useAppStore((s) => s.hr2PayrollCycleLines.find((l) => l.id === cycleLineId));
  const cycle = useAppStore((s) =>
    s.hr2PayrollCycles.find((c) => c.id === line?.cycleId),
  );
  const pkg = useAppStore((s) =>
    s.hr2CompensationPackages.find((p) => p.id === line?.packageId),
  );
  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === line?.employeeId));

  if (!line || !cycle) {
    return (
      <div className="p-6">
        <UiPageHeader title="Payslip not found" />
        <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/payroll")}>
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
      </div>
    );
  }

  const earnings = line.componentBreakdown.filter(
    (b) => b.kind === "BaseSalary" || b.kind === "Allowance" || b.kind === "VariableBonus",
  );
  const deductions = line.componentBreakdown.filter((b) => b.kind === "Deduction");
  const employerCost = line.componentBreakdown.filter((b) => b.kind === "EmployerCost");

  return (
    <div className="p-6">
      <Link
        to={`/hr2/payroll/${cycle.id}/employee/${line.employeeId}`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700 print:hidden"
      >
        <ArrowLeft size={12} /> Back to employee detail
      </Link>
      <UiPageHeader
        title="Payslip"
        subtitle={`${line.employeeFullName} · ${formatPeriod(cycle.period)} · ${entityLabel(cycle.legalEntityId)}`}
        actions={
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            <Printer size={14} className="mr-1" /> Print
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Employee" value={line.employeeFullName} />
          <Field label="Role" value={employee?.position ?? "—"} />
          <Field label="Period" value={formatPeriod(cycle.period)} />
          <Field label="Cycle status" value={cycle.status} />
          <Field label="Employing entity" value={entityLabel(line.employingEntityId)} />
          <Field
            label="Funding entity"
            value={line.fundingEntityId ? entityLabel(line.fundingEntityId) : "Same as employing"}
          />
          <Field label="Package version" value={pkg?.versionLabel ?? "—"} />
          <Field label="Approved" value={cycle.approvedAt ? formatDate(cycle.approvedAt) : "Pending"} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Earnings" padded={false}>
          <PayslipRows entries={earnings} currency={line.payrollCurrency} />
          <Footer label="Gross" amount={line.grossPayrollCurrency} currency={line.payrollCurrency} accent="brand" />
        </Card>
        <Card title="Deductions" padded={false}>
          <PayslipRows entries={deductions} currency={line.payrollCurrency} />
          <Footer
            label="Total deductions"
            amount={line.grossPayrollCurrency - line.netPayrollCurrency}
            currency={line.payrollCurrency}
            accent="rose"
          />
        </Card>
      </div>

      <Card className="mt-4 border-emerald-200 bg-emerald-50/60">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Net pay</p>
          <p className="text-3xl font-bold tabular-nums text-emerald-700">
            {formatMoney(line.netPayrollCurrency, line.payrollCurrency)}
          </p>
        </div>
        <p className="mt-1 text-[11px] text-emerald-800">
          Payable via {line.payoutMethod}
          {line.bankAccountLast4 ? ` to account ending ${line.bankAccountLast4}` : ""}.
        </p>
      </Card>

      {employerCost.length > 0 && (
        <Card title="Employer cost (informational)" className="mt-4" padded={false}>
          <PayslipRows entries={employerCost} currency={line.payrollCurrency} />
          <Footer label="Employer cost" amount={line.employerCostPayrollCurrency} currency={line.payrollCurrency} accent="amber" />
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function PayslipRows({
  entries,
  currency,
}: {
  entries: Array<{
    componentId: string;
    kind: Parameters<typeof componentKindLabel>[0];
    label: string;
    amountPayrollCurrency: number;
  }>;
  currency: string;
}) {
  if (entries.length === 0) {
    return <p className="p-6 text-center text-xs text-slate-500">No entries.</p>;
  }
  return (
    <table className="min-w-full text-sm">
      <tbody>
        {entries.map((entry) => {
          const accent = componentKindAccent(entry.kind);
          return (
            <tr key={entry.componentId} className="border-t border-slate-100">
              <td className="px-3 py-2">
                <span
                  className={`rounded-full border ${accent.bg} ${accent.text} ${accent.border} px-2 py-0.5 text-[10px] font-semibold`}
                >
                  {componentKindLabel(entry.kind)}
                </span>
              </td>
              <td className="px-3 py-2 text-sm text-slate-800">{entry.label}</td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">
                {formatMoney(entry.amountPayrollCurrency, currency as never)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Footer({
  label,
  amount,
  currency,
  accent,
}: {
  label: string;
  amount: number;
  currency: string;
  accent: "brand" | "rose" | "amber";
}) {
  const accentClass = {
    brand: "text-brand-700",
    rose: "text-rose-700",
    amber: "text-amber-700",
  }[accent];
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-base font-bold tabular-nums ${accentClass}`}>
        {formatMoney(amount, currency as never)}
      </p>
    </div>
  );
}

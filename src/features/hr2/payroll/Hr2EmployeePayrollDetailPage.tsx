import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Receipt } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { StatusBadge } from "../components/primitives";
import { categoryLabel, cycleStatusTone, formatPeriod, lineStatusTone, severityTone } from "./utils";
import {
  componentKindAccent,
  componentKindLabel,
  entityLabel,
  formatDateTime,
  formatMoney,
} from "../compensation/utils";

export function Hr2EmployeePayrollDetailPage() {
  const params = useParams<{ cycleId: string; employeeId: string }>();
  const cycleId = params.cycleId ?? "";
  const employeeId = params.employeeId ?? "";
  const navigate = useNavigate();

  const cycle = useAppStore((s) => s.hr2PayrollCycles.find((c) => c.id === cycleId));
  const line = useAppStore((s) =>
    s.hr2PayrollCycleLines.find((l) => l.cycleId === cycleId && l.employeeId === employeeId),
  );
  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === employeeId));
  const pkg = useAppStore((s) => s.hr2CompensationPackages.find((p) => p.id === line?.packageId));
  const exceptions = useAppStore((s) =>
    s.hr2PayrollExceptions.filter((e) => e.cycleLineId === line?.id),
  );

  if (!cycle || !line) {
    return (
      <div className="p-6">
        <UiPageHeader title="Payroll line not found" />
        <Button size="sm" variant="secondary" onClick={() => navigate(`/hr2/payroll/${cycleId}`)}>
          <ArrowLeft size={14} className="mr-1" /> Back to cycle
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        to={`/hr2/payroll/${cycle.id}`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to cycle
      </Link>
      <UiPageHeader
        title={`${line.employeeFullName} · ${formatPeriod(cycle.period)}`}
        subtitle={`${entityLabel(cycle.legalEntityId)} · ${cycle.payrollCurrency} · cycle status ${cycle.status}`}
        actions={
          <Link to={`/hr2/payroll/payslip/${line.id}`}>
            <Button size="sm">
              <Receipt size={14} className="mr-1" /> View payslip
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Gross" value={formatMoney(line.grossPayrollCurrency, line.payrollCurrency)} />
          <Stat
            label="Net"
            value={formatMoney(line.netPayrollCurrency, line.payrollCurrency)}
            tone="success"
            emphasize
          />
          <Stat label="Employer cost" value={formatMoney(line.employerCostPayrollCurrency, line.payrollCurrency)} />
          <Stat label="FX rate" value={line.fxRate.toFixed(4)} />
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge label={line.status} tone={lineStatusTone(line.status)} dot />
              <StatusBadge label={cycle.status} tone={cycleStatusTone(cycle.status)} size="sm" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Component breakdown" className="lg:col-span-2" padded={false}>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Component</th>
                <th className="px-3 py-2 text-left">Kind</th>
                <th className="px-3 py-2 text-right">In package</th>
                <th className="px-3 py-2 text-right">In payroll</th>
              </tr>
            </thead>
            <tbody>
              {line.componentBreakdown.map((entry) => {
                const accent = componentKindAccent(entry.kind);
                return (
                  <tr key={entry.componentId} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-sm text-slate-800">{entry.label}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full border ${accent.bg} ${accent.text} ${accent.border} px-2 py-0.5 text-[10px] font-semibold`}
                      >
                        {componentKindLabel(entry.kind)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(entry.amountPackageCurrency, line.packageCurrency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatMoney(entry.amountPayrollCurrency, line.payrollCurrency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Linked package">
          {pkg ? (
            <div className="space-y-2">
              <Link
                to={`/hr2/compensation/${pkg.id}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Package {pkg.versionLabel} <ExternalLink size={12} />
              </Link>
              <p className="text-xs text-slate-600">
                {pkg.packageCurrency} · {pkg.payrollFrequency}
              </p>
              <p className="text-[11px] text-slate-400">
                Employing: {entityLabel(pkg.employingEntityId)}
                {pkg.fundingEntityId && pkg.fundingEntityId !== pkg.employingEntityId
                  ? ` · Funded by ${entityLabel(pkg.fundingEntityId)}`
                  : ""}
              </p>
              {employee && (
                <p className="text-[11px] text-slate-500">
                  Employee position: {employee.position ?? "—"}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Linked package no longer available.</p>
          )}
        </Card>
      </div>

      <Card title={`Exceptions (${exceptions.length})`} className="mt-4" padded={false}>
        {exceptions.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">No exceptions on this line.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {exceptions.map((ex) => (
              <li key={ex.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge label={categoryLabel(ex.category)} tone={severityTone(ex.severity)} dot />
                    <StatusBadge label={ex.status} tone={ex.status === "Resolved" ? "success" : "neutral"} size="sm" />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{ex.message}</p>
                  <p className="text-[11px] text-slate-400">Detected {formatDateTime(ex.detectedAt)}</p>
                  {ex.resolutionNote && (
                    <p className="mt-1 text-[11px] text-emerald-700">Resolution: {ex.resolutionNote}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  emphasize,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger" | "neutral";
  emphasize?: boolean;
}) {
  const t = tone ?? "neutral";
  const c = {
    success: "text-emerald-700",
    danger: "text-rose-700",
    neutral: "text-slate-800",
  }[t];
  return (
    <div className={`rounded-xl border ${emphasize ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"} p-3 shadow-sm`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums ${c}`}>{value}</p>
    </div>
  );
}

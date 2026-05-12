import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertOctagon,
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  PrinterIcon,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { ConfirmModal, StatusBadge } from "../components/primitives";
import { cycleStatusTone, formatPeriod, lineStatusTone } from "./utils";
import { entityLabel, formatDateTime, formatMoney } from "../compensation/utils";

export function Hr2PayrollFinalReviewPage() {
  const params = useParams<{ cycleId: string }>();
  const cycleId = params.cycleId ?? "";
  const navigate = useNavigate();

  const cycle = useAppStore((s) => s.hr2PayrollCycles.find((c) => c.id === cycleId));
  const lines = useAppStore((s) =>
    s.hr2PayrollCycleLines.filter((l) => l.cycleId === cycleId),
  );
  const exceptions = useAppStore((s) =>
    s.hr2PayrollExceptions.filter((e) => e.cycleId === cycleId),
  );
  const activeUserId = useAppStore((s) => s.activeUserId);
  const approveCycle = useAppStore((s) => s.approveHr2PayrollCycle);

  const [approveOpen, setApproveOpen] = useState(false);
  const [approveResult, setApproveResult] = useState<{ ok: boolean; message?: string } | null>(null);

  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let employer = 0;
    lines.forEach((l) => {
      gross += l.grossPayrollCurrency;
      net += l.netPayrollCurrency;
      employer += l.employerCostPayrollCurrency;
    });
    return { gross, net, employer };
  }, [lines]);
  const openBlockers = exceptions.filter((e) => e.status === "Open" && e.severity === "Blocker").length;
  const openWarnings = exceptions.filter((e) => e.status === "Open" && e.severity === "Warning").length;
  const blockedLines = lines.filter((l) => l.status === "Blocked");
  const cleanLines = lines.filter((l) => l.status !== "Blocked");

  if (!cycle) {
    return (
      <div className="p-6">
        <UiPageHeader title="Cycle not found" />
        <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/payroll")}>
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
      </div>
    );
  }

  const canApprove = cycle.status === "ReadyForReview" && openBlockers === 0 && lines.length > 0;
  const alreadyApproved = cycle.status === "Approved" || cycle.status === "PaidOut" || cycle.status === "Closed";

  const handleApprove = () => {
    const result = approveCycle(cycle.id, activeUserId);
    setApproveResult(result);
    setApproveOpen(false);
  };

  return (
    <div className="p-6">
      <Link
        to={`/hr2/payroll/${cycle.id}`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to cycle
      </Link>
      <UiPageHeader
        title={`Final review · ${formatPeriod(cycle.period)} ${entityLabel(cycle.legalEntityId)}`}
        subtitle="Register-style view of every line. Approval emits payment instructions to Finance."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => window.print()}>
              <PrinterIcon size={14} className="mr-1" /> Print
            </Button>
            {!alreadyApproved && (
              <Button size="sm" onClick={() => setApproveOpen(true)} disabled={!canApprove}>
                <BadgeCheck size={14} className="mr-1" /> Approve & emit instructions
              </Button>
            )}
            {alreadyApproved && (
              <Link to="/hr2/finance">
                <Button size="sm" variant="secondary">
                  Finance instructions <ChevronRight size={14} className="ml-1" />
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
            <div className="mt-1">
              <StatusBadge label={cycle.status} tone={cycleStatusTone(cycle.status)} dot />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Computed</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">
              {cycle.computedAt ? formatDateTime(cycle.computedAt) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Approved</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">
              {cycle.approvedAt ? formatDateTime(cycle.approvedAt) : "—"}
            </p>
          </div>
          <div className="flex-1" />
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Net payable</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-700">
              {formatMoney(totals.net, cycle.payrollCurrency)}
            </p>
          </div>
        </div>
      </Card>

      {openBlockers > 0 && !alreadyApproved && (
        <Card className="mb-4 border-rose-200 bg-rose-50/40">
          <div className="flex items-start gap-3">
            <AlertOctagon className="mt-0.5 shrink-0 text-rose-600" size={16} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-900">
                {openBlockers} blocker{openBlockers !== 1 ? "s" : ""} prevent approval
              </p>
              <p className="text-xs text-rose-800">
                Resolve every blocker exception, then return here to approve.
              </p>
            </div>
            <Link to={`/hr2/payroll/${cycle.id}/exceptions`}>
              <Button size="sm" variant="secondary">
                Review exceptions
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {approveResult && (
        <Card
          className={`mb-4 ${approveResult.ok ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"}`}
        >
          <p className={`text-sm font-semibold ${approveResult.ok ? "text-emerald-900" : "text-rose-900"}`}>
            {approveResult.ok ? "Cycle approved" : "Approval failed"}
          </p>
          <p className={`mt-1 text-xs ${approveResult.ok ? "text-emerald-800" : "text-rose-800"}`}>
            {approveResult.message}
          </p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Lines" value={lines.length} />
        <Stat label="Clean" value={cleanLines.length} tone="success" />
        <Stat label="Blocked" value={blockedLines.length} tone={blockedLines.length > 0 ? "danger" : "neutral"} />
        <Stat label="Warnings" value={openWarnings} tone={openWarnings > 0 ? "warning" : "neutral"} />
      </div>

      <Card title="Register" padded={false}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Employee</th>
              <th className="px-3 py-2 text-left">Package</th>
              <th className="px-3 py-2 text-right">Gross</th>
              <th className="px-3 py-2 text-right">Deductions</th>
              <th className="px-3 py-2 text-right">Net</th>
              <th className="px-3 py-2 text-right">Employer cost</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-800">{line.employeeFullName}</div>
                  <div className="text-[11px] text-slate-400">{line.payoutMethod}</div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{line.packageVersionLabel}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatMoney(line.grossPayrollCurrency, line.payrollCurrency)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                  {formatMoney(line.grossPayrollCurrency - line.netPayrollCurrency, line.payrollCurrency)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">
                  {formatMoney(line.netPayrollCurrency, line.payrollCurrency)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {formatMoney(line.employerCostPayrollCurrency, line.payrollCurrency)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge label={line.status} tone={lineStatusTone(line.status)} dot />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 text-sm">
              <td className="px-3 py-2 font-semibold text-slate-700" colSpan={2}>
                Totals
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {formatMoney(totals.gross, cycle.payrollCurrency)}
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-rose-700">
                {formatMoney(totals.gross - totals.net, cycle.payrollCurrency)}
              </td>
              <td className="px-3 py-2 text-right font-bold tabular-nums text-emerald-700">
                {formatMoney(totals.net, cycle.payrollCurrency)}
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {formatMoney(totals.employer, cycle.payrollCurrency)}
              </td>
              <td className="px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <ConfirmModal
        open={approveOpen}
        title="Approve and emit payment instructions?"
        description="Payment instruction batches are created for Finance to release. Blocked lines stay Blocked and need exception resolution to ship."
        confirmLabel="Approve & emit"
        onConfirm={handleApprove}
        onCancel={() => setApproveOpen(false)}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" | "warning" | "neutral" }) {
  const t = tone ?? "neutral";
  const c = {
    success: "text-emerald-700",
    danger: "text-rose-700",
    warning: "text-amber-700",
    neutral: "text-slate-700",
  }[t];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold ${c}`}>{value}</p>
    </div>
  );
}

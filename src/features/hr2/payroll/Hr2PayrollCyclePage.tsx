import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Lock,
  RefreshCw,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import {
  ConfirmModal,
  StatusBadge,
  Tabs,
  TabItem,
} from "../components/primitives";
import {
  categoryLabel,
  cycleStatusTone,
  formatPeriod,
  lineStatusTone,
  severityTone,
} from "./utils";
import {
  entityLabel,
  formatDate,
  formatDateTime,
  formatMoney,
} from "../compensation/utils";

type CycleTabId = "summary" | "lines" | "exceptions";

export function Hr2PayrollCyclePage() {
  const params = useParams<{ cycleId: string }>();
  const cycleId = params.cycleId ?? "";
  const navigate = useNavigate();

  const cycle = useAppStore((s) => s.hr2PayrollCycles.find((c) => c.id === cycleId));
  const lines = useAppStore((s) => s.hr2PayrollCycleLines.filter((l) => l.cycleId === cycleId));
  const exceptions = useAppStore((s) => s.hr2PayrollExceptions.filter((e) => e.cycleId === cycleId));
  const activeUserId = useAppStore((s) => s.activeUserId);
  const recompute = useAppStore((s) => s.recomputeHr2PayrollCycle);
  const approveCycle = useAppStore((s) => s.approveHr2PayrollCycle);
  const closeCycle = useAppStore((s) => s.closeHr2PayrollCycle);

  const [activeTab, setActiveTab] = useState<CycleTabId>("summary");
  const [recomputeOpen, setRecomputeOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [approveResult, setApproveResult] = useState<{ ok: boolean; message?: string } | null>(null);

  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let employerCost = 0;
    lines.forEach((l) => {
      gross += l.grossPayrollCurrency;
      net += l.netPayrollCurrency;
      employerCost += l.employerCostPayrollCurrency;
    });
    return {
      gross: Math.round(gross * 100) / 100,
      net: Math.round(net * 100) / 100,
      employerCost: Math.round(employerCost * 100) / 100,
    };
  }, [lines]);

  const openBlockers = exceptions.filter((e) => e.status === "Open" && e.severity === "Blocker").length;
  const openWarnings = exceptions.filter((e) => e.status === "Open" && e.severity === "Warning").length;
  const blockedLines = lines.filter((l) => l.status === "Blocked").length;
  const warningLines = lines.filter((l) => l.status === "Warning").length;
  const okLines = lines.filter((l) => l.status === "OK").length;

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

  const canRecompute =
    cycle.status === "Draft" || cycle.status === "Computing" || cycle.status === "ReadyForReview";
  const canApprove = cycle.status === "ReadyForReview" && openBlockers === 0 && lines.length > 0;
  const canGoToReview = cycle.status === "ReadyForReview" || cycle.status === "Approved";
  const canClose = cycle.status === "Approved" || cycle.status === "PaidOut";

  const handleRecompute = () => {
    recompute(cycle.id, activeUserId);
    setRecomputeOpen(false);
  };
  const handleApprove = () => {
    const result = approveCycle(cycle.id, activeUserId);
    setApproveResult(result);
    setApproveOpen(false);
  };
  const handleClose = () => {
    closeCycle(cycle.id, activeUserId);
    setCloseOpen(false);
  };

  const tabs: TabItem[] = [
    { id: "summary", label: "Summary" },
    { id: "lines", label: "Lines", count: lines.length },
    { id: "exceptions", label: "Exceptions", count: openBlockers + openWarnings },
  ];

  return (
    <div className="p-6">
      <Link
        to="/hr2/payroll"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to payroll
      </Link>

      <UiPageHeader
        title={`${formatPeriod(cycle.period)} · ${entityLabel(cycle.legalEntityId)}`}
        subtitle={`Cycle workspace · ${cycle.payrollCurrency}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canRecompute && (
              <Button size="sm" variant="secondary" onClick={() => setRecomputeOpen(true)}>
                <RefreshCw size={14} className="mr-1" /> Recompute
              </Button>
            )}
            {canGoToReview && (
              <Link to={`/hr2/payroll/${cycle.id}/review`}>
                <Button size="sm" variant="secondary">
                  Final review <ChevronRight size={14} className="ml-1" />
                </Button>
              </Link>
            )}
            {cycle.status === "ReadyForReview" && (
              <Button size="sm" onClick={() => setApproveOpen(true)} disabled={!canApprove}>
                <BadgeCheck size={14} className="mr-1" /> Approve & emit
              </Button>
            )}
            {canClose && (
              <Button size="sm" variant="secondary" onClick={() => setCloseOpen(true)}>
                <Lock size={14} className="mr-1" /> Close
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Cycle status</h2>
              <StatusBadge label={cycle.status} tone={cycleStatusTone(cycle.status)} dot />
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <Detail label="Opened" value={formatDateTime(cycle.openedAt)} />
              <Detail label="Computed" value={cycle.computedAt ? formatDateTime(cycle.computedAt) : "—"} />
              <Detail label="Approved" value={cycle.approvedAt ? formatDateTime(cycle.approvedAt) : "—"} />
              <Detail label="FX reference" value={cycle.fxRateRefDate ?? "—"} />
            </div>
          </div>
        </div>
      </Card>

      {openBlockers > 0 && cycle.status !== "Approved" && (
        <Card className="mb-4 border-rose-200 bg-rose-50/40">
          <div className="flex items-start gap-3">
            <AlertOctagon className="mt-0.5 shrink-0 text-rose-600" size={16} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-900">
                {openBlockers} open blocker{openBlockers !== 1 ? "s" : ""} prevent approval
              </p>
              <p className="text-xs text-rose-800">
                Resolve every Blocker exception before approving the cycle. Approving emits payment instructions only
                for non-blocked lines; blocked lines stay Blocked and remain unbillable.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setActiveTab("exceptions")}>
              View exceptions <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {approveResult && (
        <Card className={`mb-4 ${approveResult.ok ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"}`}>
          <p className={`text-sm font-semibold ${approveResult.ok ? "text-emerald-900" : "text-rose-900"}`}>
            {approveResult.ok ? "Cycle approved" : "Approval failed"}
          </p>
          <p className={`mt-1 text-xs ${approveResult.ok ? "text-emerald-800" : "text-rose-800"}`}>
            {approveResult.message}
          </p>
          {approveResult.ok && (
            <Link to="/hr2/finance" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline">
              Go to Finance instructions <ChevronRight size={12} />
            </Link>
          )}
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <TotalCard label="Lines" value={lines.length.toString()} sub={`${okLines} OK · ${warningLines} warn · ${blockedLines} blocked`} />
        <TotalCard label="Gross" value={formatMoney(totals.gross, cycle.payrollCurrency)} sub={cycle.payrollCurrency} />
        <TotalCard label="Net" value={formatMoney(totals.net, cycle.payrollCurrency)} sub={cycle.payrollCurrency} emphasize />
        <TotalCard label="Employer cost" value={formatMoney(totals.employerCost, cycle.payrollCurrency)} sub={cycle.payrollCurrency} />
        <TotalCard label="Blockers / warnings" value={`${openBlockers} / ${openWarnings}`} sub="Open exceptions" />
      </div>

      <Tabs items={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as CycleTabId)} className="mb-4" />

      {activeTab === "summary" && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">How this cycle was computed</h3>
          <ul className="space-y-1 text-xs text-slate-600">
            <li>
              <span className="font-semibold text-slate-700">Source:</span> Every active compensation package for{" "}
              {entityLabel(cycle.legalEntityId)} as of {cycle.fxRateRefDate ?? "the cycle reference date"} produced one
              line.
            </li>
            <li>
              <span className="font-semibold text-slate-700">FX:</span> Where a package currency differs from{" "}
              {cycle.payrollCurrency}, an FX rate was applied and a FxReviewNeeded warning was raised so the rate can
              be confirmed before approval.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Bank details:</span> Employees without bank details on the
              HR2 extension get a MissingBank blocker — payment instructions cannot be prepared until bank details are
              recorded.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Entity mismatch:</span> If an employee's HR legal entity
              doesn't match the cycle's employing entity in HR2, an EntityMismatch blocker is raised.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Pending changes:</span> If a change request is submitted
              but not yet approved, a PendingCompChange warning is attached so reviewers know the line still uses the
              old package.
            </li>
          </ul>
          {cycle.notes && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cycle notes</p>
              {cycle.notes}
            </div>
          )}
        </Card>
      )}

      {activeTab === "lines" && (
        <Card padded={false}>
          {lines.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">
              No lines yet. Recompute the cycle once active compensation packages exist for{" "}
              {entityLabel(cycle.legalEntityId)}.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Employee</th>
                  <th className="px-3 py-2 text-left">Package</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">FX</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr
                    key={line.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => navigate(`/hr2/payroll/${cycle.id}/employee/${line.employeeId}`)}
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-800">{line.employeeFullName}</div>
                      <div className="text-[11px] text-slate-400">{entityLabel(line.employingEntityId)}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {line.packageVersionLabel}
                      <div className="text-[11px] text-slate-400">{line.packageCurrency}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(line.grossPayrollCurrency, line.payrollCurrency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-slate-500">
                      {line.fxRate.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">
                      {formatMoney(line.netPayrollCurrency, line.payrollCurrency)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge label={line.status} tone={lineStatusTone(line.status)} dot />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === "exceptions" && (
        <ExceptionsList cycleId={cycle.id} />
      )}

      <ConfirmModal
        open={recomputeOpen}
        title="Recompute this cycle?"
        description="Existing lines and exceptions for this cycle will be replaced based on current active packages. This action is safe before approval."
        confirmLabel="Recompute"
        onConfirm={handleRecompute}
        onCancel={() => setRecomputeOpen(false)}
      />
      <ConfirmModal
        open={approveOpen}
        title="Approve and emit payment instructions?"
        description="Payment instruction batches will be created for Finance to release. Blocked lines stay Blocked and will not be sent until exceptions are cleared."
        confirmLabel="Approve & emit"
        onConfirm={handleApprove}
        onCancel={() => setApproveOpen(false)}
      />
      <ConfirmModal
        open={closeOpen}
        title="Close this cycle?"
        description="Closing locks the cycle. No further changes will be allowed."
        confirmLabel="Close cycle"
        onConfirm={handleClose}
        onCancel={() => setCloseOpen(false)}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function TotalCard({
  label,
  value,
  sub,
  emphasize,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasize?: boolean;
}) {
  return (
    <div className={`rounded-xl border ${emphasize ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"} p-3 shadow-sm`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${emphasize ? "text-emerald-700" : "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function ExceptionsList({ cycleId }: { cycleId: string }) {
  const exceptions = useAppStore((s) => s.hr2PayrollExceptions.filter((e) => e.cycleId === cycleId));
  const lines = useAppStore((s) => s.hr2PayrollCycleLines.filter((l) => l.cycleId === cycleId));
  const activeUserId = useAppStore((s) => s.activeUserId);
  const resolve = useAppStore((s) => s.resolveHr2PayrollException);
  const [resolveId, setResolveId] = useState<string | null>(null);

  const visible = exceptions
    .slice()
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "Open" ? -1 : 1;
      if (a.severity !== b.severity) return a.severity === "Blocker" ? -1 : 1;
      return a.detectedAt.localeCompare(b.detectedAt);
    });

  return (
    <Card padded={false}>
      {visible.length === 0 ? (
        <p className="p-6 text-center text-xs text-slate-500">No exceptions for this cycle.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((ex) => {
            const line = lines.find((l) => l.id === ex.cycleLineId);
            return (
              <li key={ex.id} className="flex items-start gap-3 p-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ex.severity === "Blocker" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                  {ex.severity === "Blocker" ? <AlertOctagon size={14} /> : <AlertTriangle size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{line?.employeeFullName ?? ex.employeeId}</p>
                    <StatusBadge label={categoryLabel(ex.category)} tone={severityTone(ex.severity)} dot />
                    <StatusBadge
                      label={ex.status}
                      tone={ex.status === "Resolved" ? "success" : "neutral"}
                      size="sm"
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{ex.message}</p>
                  <p className="text-[11px] text-slate-400">Detected {formatDateTime(ex.detectedAt)}</p>
                  {ex.resolutionNote && (
                    <p className="mt-1 text-[11px] text-emerald-700">Resolution: {ex.resolutionNote}</p>
                  )}
                </div>
                {ex.status === "Open" && (
                  <Button size="sm" variant="secondary" onClick={() => setResolveId(ex.id)}>
                    <CheckCircle2 size={14} className="mr-1" /> Resolve
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ResolveExceptionModal
        exceptionId={resolveId}
        onClose={() => setResolveId(null)}
        onResolve={(note) => {
          if (resolveId) resolve(resolveId, activeUserId, note);
          setResolveId(null);
        }}
      />
    </Card>
  );
}

function ResolveExceptionModal({
  exceptionId,
  onClose,
  onResolve,
}: {
  exceptionId: string | null;
  onClose: () => void;
  onResolve: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  if (!exceptionId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-slate-900">Resolve exception</h3>
        <p className="mt-1 text-xs text-slate-600">
          Confirm the underlying issue is fixed. Add a short note for the audit trail.
        </p>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Bank details captured in the HR2 extension."
          className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setNote(""); onClose(); }}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => { onResolve(note.trim()); setNote(""); }}>
            Resolve
          </Button>
        </div>
      </div>
    </div>
  );
}

void formatDate;

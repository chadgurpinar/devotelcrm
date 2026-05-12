import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Layers,
  XCircle,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { CompPackageHeaderCard } from "./CompPackageHeaderCard";
import { ConfirmModal, StatusBadge } from "../components/primitives";
import {
  changeKindLabel,
  changeStatusTone,
  formatDate,
  formatDateTime,
  formatMoney,
} from "./utils";

export function Hr2RequestSubmittedPage() {
  const params = useParams<{ packageId: string; requestId: string }>();
  const packageId = params.packageId ?? "";
  const requestId = params.requestId ?? "";
  const navigate = useNavigate();

  const pkg = useAppStore((s) => s.hr2CompensationPackages.find((p) => p.id === packageId));
  const request = useAppStore((s) => s.hr2CompChangeRequests.find((r) => r.id === requestId));
  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === pkg?.employeeId));
  const activeUserId = useAppStore((s) => s.activeUserId);
  const approveChange = useAppStore((s) => s.approveHr2ChangeRequest);
  const rejectChange = useAppStore((s) => s.rejectHr2ChangeRequest);
  const withdrawChange = useAppStore((s) => s.withdrawHr2ChangeRequest);

  const [decisionNote, setDecisionNote] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  if (!pkg || !request) {
    return (
      <div className="p-6">
        <UiPageHeader title="Request not found" />
        <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/compensation")}>
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
      </div>
    );
  }

  const isPending = request.status === "Submitted" || request.status === "UnderReview" || request.status === "Draft";
  const isJustSubmitted =
    request.status === "Submitted" && request.submittedAt && Date.now() - new Date(request.submittedAt).getTime() < 60_000;

  const handleApprove = () => {
    approveChange(request.id, activeUserId, decisionNote.trim() || undefined);
    setApproveOpen(false);
  };
  const handleReject = () => {
    rejectChange(request.id, activeUserId, decisionNote.trim() || undefined);
    setRejectOpen(false);
  };
  const handleWithdraw = () => {
    withdrawChange(request.id, activeUserId);
    setWithdrawOpen(false);
  };

  return (
    <div className="p-6">
      <Link
        to={`/hr2/compensation/${pkg.id}`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to package
      </Link>
      <UiPageHeader
        title={changeKindLabel(request.kind)}
        subtitle={isJustSubmitted ? "Submitted for review. Approvers can act below." : "Change request detail."}
      />
      <CompPackageHeaderCard pkg={pkg} employee={employee} />

      {isJustSubmitted && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50/60">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={24} />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Request submitted</p>
              <p className="text-xs text-emerald-800">
                Submitted at {formatDateTime(request.submittedAt)}. Approvers will be notified.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Request summary</h3>
          <StatusBadge label={request.status} tone={changeStatusTone(request.status)} dot />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          <Detail label="Type" value={changeKindLabel(request.kind)} />
          <Detail label="Effective from" value={formatDate(request.effectiveFrom)} />
          <Detail label="Reason" value={request.reason ?? "—"} />
          <Detail label="Submitted at" value={formatDateTime(request.submittedAt)} />
          {request.reviewedAt && <Detail label="Reviewed at" value={formatDateTime(request.reviewedAt)} />}
          {request.decisionNote && <Detail label="Decision note" value={request.decisionNote} />}
          {request.resultingPackageId && (
            <Detail
              label="Resulting package"
              value={
                <Link to={`/hr2/compensation/${request.resultingPackageId}`} className="text-brand-700 hover:text-brand-800">
                  Open new version
                </Link>
              }
            />
          )}
        </ul>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ChangeSpecifics request={request} packageCurrency={pkg.packageCurrency} />
        </div>
      </Card>

      {isPending && (
        <Card title="Decide" className="mt-4">
          <FieldLabel>Decision note (optional)</FieldLabel>
          <textarea
            rows={2}
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder="Notes to record alongside the decision..."
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setWithdrawOpen(true)}>
              <Layers size={14} className="mr-1" /> Withdraw
            </Button>
            <Button size="sm" variant="danger" onClick={() => setRejectOpen(true)}>
              <XCircle size={14} className="mr-1" /> Reject
            </Button>
            <Button size="sm" onClick={() => setApproveOpen(true)}>
              <BadgeCheck size={14} className="mr-1" /> Approve & apply
            </Button>
          </div>
        </Card>
      )}

      <ConfirmModal
        open={approveOpen}
        title="Approve and apply this change?"
        description={
          request.kind === "Termination"
            ? "Approving will terminate the active package and stop future payroll lines."
            : "Approving will create a new package version that supersedes the current active one."
        }
        confirmLabel="Approve & apply"
        onConfirm={handleApprove}
        onCancel={() => setApproveOpen(false)}
      />
      <ConfirmModal
        open={rejectOpen}
        title="Reject this change request?"
        description="The change will not be applied. A new request can be created later."
        confirmLabel="Reject"
        variant="danger"
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
      />
      <ConfirmModal
        open={withdrawOpen}
        title="Withdraw this request?"
        description="The request will be moved to Withdrawn status. No changes will be applied."
        confirmLabel="Withdraw"
        onConfirm={handleWithdraw}
        onCancel={() => setWithdrawOpen(false)}
      />
    </div>
  );
}

function ChangeSpecifics({
  request,
  packageCurrency,
}: {
  request: ReturnType<typeof useAppStore.getState>["hr2CompChangeRequests"][number];
  packageCurrency: string;
}) {
  if (request.kind === "SalaryChange") {
    const delta = request.proposedBaseSalary - request.previousBaseSalary;
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <BigStat
          label="Previous"
          value={formatMoney(request.previousBaseSalary, request.previousCurrency)}
          tone="neutral"
        />
        <BigStat
          label="Proposed"
          value={formatMoney(request.proposedBaseSalary, request.proposedCurrency)}
          tone="brand"
        />
        <BigStat
          label="Delta"
          value={`${delta > 0 ? "+" : ""}${formatMoney(delta, request.proposedCurrency)}`}
          tone={delta > 0 ? "success" : delta < 0 ? "danger" : "neutral"}
        />
      </div>
    );
  }
  if (request.kind === "VariableBonus") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <BigStat label="Bonus" value={request.bonusLabel} tone="brand" />
        <BigStat label="Amount" value={formatMoney(request.bonusAmount, request.bonusCurrency)} tone="success" />
        <BigStat label="Frequency" value={request.bonusFrequency} tone="neutral" />
      </div>
    );
  }
  if (request.kind === "SettlementChange") {
    return (
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Proposed settlement rules</p>
        <ul className="space-y-1.5">
          {request.proposedSettlementRules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-2">
              <span className="text-sm text-slate-800">{rule.legalEntityId}</span>
              <span className="font-semibold tabular-nums text-brand-700">{rule.percentage}%</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-700">
        <span className="font-semibold">Termination reason:</span> {request.terminationReason}
      </p>
      {request.lastPayrollDate && (
        <p className="text-xs text-slate-500">Last payroll: {formatDate(request.lastPayrollDate)}</p>
      )}
      {request.finalSettlementAmount && request.finalSettlementCurrency && (
        <p className="text-xs text-slate-500">
          Final settlement: {formatMoney(request.finalSettlementAmount, request.finalSettlementCurrency)}
        </p>
      )}
      <p className="text-[11px] text-slate-400">{packageCurrency}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="rounded-md border border-slate-200 bg-white p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value}</p>
    </li>
  );
}

function BigStat({ label, value, tone }: { label: string; value: string; tone: "neutral" | "brand" | "success" | "danger" }) {
  const toneClass = {
    neutral: "text-slate-700",
    brand: "text-brand-700",
    success: "text-emerald-700",
    danger: "text-rose-700",
  }[tone];
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

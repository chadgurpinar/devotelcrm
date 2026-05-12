import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDot,
  Clock,
  FileText,
  History,
  Layers,
  PencilLine,
  Send,
  XCircle,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import {
  ConfirmModal,
  StatusBadge,
  Tabs,
  Timeline,
  TimelineEvent,
  TimelineVariant,
} from "../components/primitives";
import { CompPackageHeaderCard } from "./CompPackageHeaderCard";
import {
  changeKindLabel,
  changeStatusTone,
  componentKindAccent,
  componentKindLabel,
  entityLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  packageStatusTone,
  summarizeComponents,
} from "./utils";
import {
  Hr2CompAuditAction,
  Hr2CompChangeRequest,
} from "../../../store/types";

type DetailTabId = "summary" | "components" | "settlement" | "changes" | "history";

export function Hr2CompPackageDetailPage() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId ?? "";
  const navigate = useNavigate();

  const pkg = useAppStore((s) => s.hr2CompensationPackages.find((p) => p.id === packageId));
  const allPackages = useAppStore((s) => s.hr2CompensationPackages);
  const components = useAppStore((s) =>
    s.hr2CompPackageComponents.filter((c) => c.packageId === packageId),
  );
  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === pkg?.employeeId));
  const auditEntries = useAppStore((s) =>
    s.hr2CompAuditLog.filter(
      (entry) => entry.packageId === packageId || entry.employeeId === pkg?.employeeId,
    ),
  );
  const changeRequests = useAppStore((s) =>
    s.hr2CompChangeRequests.filter((cr) => cr.packageId === packageId),
  );
  const activeUserId = useAppStore((s) => s.activeUserId);
  const users = useAppStore((s) => s.users);
  const submitPackage = useAppStore((s) => s.submitHr2Package);
  const approvePackage = useAppStore((s) => s.approveHr2Package);
  const activatePackage = useAppStore((s) => s.activateHr2Package);

  const [activeTab, setActiveTab] = useState<DetailTabId>("summary");
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [approveConfirm, setApproveConfirm] = useState(false);
  const [activateConfirm, setActivateConfirm] = useState(false);

  const summary = useMemo(() => {
    return summarizeComponents(components.map((c) => ({ kind: c.kind, amount: c.amount })));
  }, [components]);

  if (!pkg) {
    return (
      <div className="p-6">
        <UiPageHeader title="Package not found" subtitle="The requested compensation package does not exist." />
        <Card>
          <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/compensation")}>
            <ArrowLeft size={14} className="mr-1" />
            Back to compensation
          </Button>
        </Card>
      </div>
    );
  }

  const employeeOtherPackages = allPackages.filter(
    (p) => p.employeeId === pkg.employeeId && p.id !== pkg.id,
  );

  const pendingChange = changeRequests.find(
    (cr) => cr.status === "Submitted" || cr.status === "UnderReview" || cr.status === "Draft",
  );
  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : pkg.employeeId;

  const canSubmit = pkg.status === "Draft";
  const canApprove = pkg.status === "Submitted" || pkg.status === "UnderReview";
  const canActivate = pkg.status === "Approved";
  const canStartChange = pkg.status === "Active" && !pendingChange;

  const handleSubmit = () => {
    submitPackage(pkg.id, activeUserId);
    setSubmitConfirm(false);
  };
  const handleApprove = () => {
    approvePackage(pkg.id, activeUserId);
    setApproveConfirm(false);
  };
  const handleActivate = () => {
    activatePackage(pkg.id, activeUserId);
    setActivateConfirm(false);
  };

  const tabs = [
    { id: "summary" as DetailTabId, label: "Summary" },
    { id: "components" as DetailTabId, label: "Components", count: components.length },
    { id: "settlement" as DetailTabId, label: "Settlement", count: pkg.settlementRules.length },
    { id: "changes" as DetailTabId, label: "Change requests", count: changeRequests.length },
    { id: "history" as DetailTabId, label: "Audit history", count: auditEntries.length },
  ];

  return (
    <div className="p-6">
      <Link
        to="/hr2/compensation"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to compensation
      </Link>

      <UiPageHeader
        title={`Compensation · ${employeeName}`}
        subtitle={`${pkg.versionLabel} · ${entityLabel(pkg.employingEntityId)} · ${pkg.packageCurrency}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canSubmit && (
              <Button size="sm" variant="secondary" onClick={() => setSubmitConfirm(true)}>
                <Send size={14} className="mr-1" /> Submit for review
              </Button>
            )}
            {canApprove && (
              <Button size="sm" variant="secondary" onClick={() => setApproveConfirm(true)}>
                <BadgeCheck size={14} className="mr-1" /> Approve
              </Button>
            )}
            {canActivate && (
              <Button size="sm" onClick={() => setActivateConfirm(true)}>
                <CheckCircle2 size={14} className="mr-1" /> Activate
              </Button>
            )}
            {canStartChange && (
              <Link to={`/hr2/compensation/${pkg.id}/change`}>
                <Button size="sm">
                  <PencilLine size={14} className="mr-1" /> Start a change
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <CompPackageHeaderCard pkg={pkg} employee={employee} />

      {pendingChange && pkg.status === "Active" && (
        <Card className="mb-4 border-amber-200 bg-amber-50/40">
          <div className="flex items-start gap-3">
            <CircleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Pending change request: {changeKindLabel(pendingChange.kind)}
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Submitted {formatDate(pendingChange.submittedAt ?? pendingChange.createdAt)} ·
                Effective {formatDate(pendingChange.effectiveFrom)}
                {pendingChange.reason && ` · ${pendingChange.reason}`}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setActiveTab("changes")}>
              Review
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      <Tabs items={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as DetailTabId)} className="mb-4" />

      {activeTab === "summary" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SummaryCard label="Gross (monthly)" amount={summary.gross} currency={pkg.packageCurrency} accent="brand" />
          <SummaryCard label="Net (monthly)" amount={summary.net} currency={pkg.packageCurrency} accent="success" emphasize />
          <SummaryCard label="Employer cost" amount={summary.employerCost} currency={pkg.packageCurrency} accent="amber" />
          <Card title="Lifecycle" className="lg:col-span-3">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Lifecycle label="Created" at={pkg.createdAt} by={lookupName(users, pkg.createdBy)} />
              <Lifecycle label="Submitted" at={pkg.submittedAt} by={lookupName(users, pkg.submittedBy)} />
              <Lifecycle label="Approved" at={pkg.approvedAt} by={lookupName(users, pkg.approvedBy)} />
              <Lifecycle label="Activated" at={pkg.activatedAt} by={lookupName(users, pkg.activatedBy)} />
            </ul>
            {pkg.notes && (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Notes</p>
                {pkg.notes}
              </div>
            )}
          </Card>
          {employeeOtherPackages.length > 0 && (
            <Card title="Other versions for this employee" className="lg:col-span-3">
              <ul className="divide-y divide-slate-100">
                {employeeOtherPackages.map((other) => (
                  <li key={other.id} className="flex items-center justify-between py-2">
                    <div>
                      <Link
                        to={`/hr2/compensation/${other.id}`}
                        className="text-sm font-semibold text-slate-800 hover:text-brand-700"
                      >
                        {other.versionLabel}
                      </Link>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(other.effectiveFrom)}
                        {other.effectiveTo ? ` → ${formatDate(other.effectiveTo)}` : ""}
                      </p>
                    </div>
                    <StatusBadge label={other.status} tone={packageStatusTone(other.status)} dot />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {activeTab === "components" && (
        <Card padded={false}>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Component</th>
                <th className="px-3 py-2 text-left">Kind</th>
                <th className="px-3 py-2 text-left">Frequency</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Taxable</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => {
                const accent = componentKindAccent(c.kind);
                return (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{c.label}</p>
                      {c.notes && <p className="text-[11px] text-slate-500">{c.notes}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full border ${accent.bg} ${accent.text} ${accent.border} px-2 py-0.5 text-[10px] font-semibold`}
                      >
                        {componentKindLabel(c.kind)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.frequency}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">
                      {formatMoney(c.amount, c.currency)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.taxable ? "Yes" : "No"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === "settlement" && (
        <Card title="Settlement rules">
          <ul className="space-y-2">
            {pkg.settlementRules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{entityLabel(rule.legalEntityId)}</p>
                  {rule.note && <p className="text-[11px] text-slate-500">{rule.note}</p>}
                </div>
                <span className="text-sm font-bold text-brand-700">{rule.percentage}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">
            Settlement rules split the loaded employer cost between participating legal entities.
            The percentages must sum to 100 across rules.
          </p>
        </Card>
      )}

      {activeTab === "changes" && (
        <ChangeRequestsList
          requests={changeRequests}
          packageId={pkg.id}
          packageActive={pkg.status === "Active"}
        />
      )}

      {activeTab === "history" && (
        <Card>
          <Timeline events={auditEntries.map(toTimelineEvent)} emptyMessage="No audit entries yet for this package." />
        </Card>
      )}

      <ConfirmModal
        open={submitConfirm}
        title="Submit package for review?"
        description="This locks the package draft and notifies reviewers."
        confirmLabel="Submit"
        onConfirm={handleSubmit}
        onCancel={() => setSubmitConfirm(false)}
      />
      <ConfirmModal
        open={approveConfirm}
        title="Approve this package?"
        description="Approved packages can then be activated to replace any current active package for the employee."
        confirmLabel="Approve"
        onConfirm={handleApprove}
        onCancel={() => setApproveConfirm(false)}
      />
      <ConfirmModal
        open={activateConfirm}
        title="Activate this package?"
        description="Activating will supersede any currently active package for this employee and become the source of truth for the next payroll cycle."
        confirmLabel="Activate"
        onConfirm={handleActivate}
        onCancel={() => setActivateConfirm(false)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  currency,
  accent,
  emphasize,
}: {
  label: string;
  amount: number;
  currency: string;
  accent: "brand" | "success" | "amber";
  emphasize?: boolean;
}) {
  const accentClass =
    accent === "brand"
      ? "text-brand-700"
      : accent === "success"
        ? "text-emerald-700"
        : "text-amber-700";
  return (
    <Card className={emphasize ? "border-emerald-300 ring-1 ring-emerald-100" : ""}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accentClass}`}>
        {formatMoney(amount, currency as never)}
      </p>
      <p className="text-[11px] text-slate-400">{currency}</p>
    </Card>
  );
}

function Lifecycle({
  label,
  at,
  by,
}: {
  label: string;
  at?: string;
  by?: string;
}) {
  return (
    <li className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-800">{at ? formatDateTime(at) : "—"}</p>
      <p className="text-[11px] text-slate-500">{by ?? ""}</p>
    </li>
  );
}

function ChangeRequestsList({
  requests,
  packageId,
  packageActive,
}: {
  requests: Hr2CompChangeRequest[];
  packageId: string;
  packageActive: boolean;
}) {
  const pending = requests.filter((r) => r.status === "Draft" || r.status === "Submitted" || r.status === "UnderReview");
  const resolved = requests.filter((r) => r.status === "Approved" || r.status === "Rejected" || r.status === "Withdrawn");
  return (
    <div className="space-y-4">
      <Card title="Pending">
        {pending.length === 0 ? (
          <p className="text-xs text-slate-500">No pending change requests.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((r) => (
              <ChangeRequestRow key={r.id} request={r} packageId={packageId} />
            ))}
          </ul>
        )}
        {packageActive && pending.length === 0 && (
          <div className="mt-3">
            <Link to={`/hr2/compensation/${packageId}/change`}>
              <Button size="sm">
                <PencilLine size={14} className="mr-1" /> Start a change
              </Button>
            </Link>
          </div>
        )}
      </Card>
      <Card title="Resolved">
        {resolved.length === 0 ? (
          <p className="text-xs text-slate-500">No resolved change requests.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {resolved.map((r) => (
              <ChangeRequestRow key={r.id} request={r} packageId={packageId} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ChangeRequestRow({
  request,
  packageId,
}: {
  request: Hr2CompChangeRequest;
  packageId: string;
}) {
  return (
    <li className="flex items-center justify-between py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{changeKindLabel(request.kind)}</p>
          <StatusBadge label={request.status} tone={changeStatusTone(request.status)} dot />
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Effective {formatDate(request.effectiveFrom)}
          {request.reason ? ` · ${request.reason}` : ""}
        </p>
      </div>
      <Link
        to={`/hr2/compensation/${packageId}/change/submitted/${request.id}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
      >
        Open <ChevronRight size={12} />
      </Link>
    </li>
  );
}

function toTimelineEvent(entry: { id: string; action: Hr2CompAuditAction; summary: string; performedAt: string; performedBy: string }): TimelineEvent {
  const variant = actionToVariant(entry.action);
  return {
    id: entry.id,
    title: entry.summary,
    timestamp: formatDateTime(entry.performedAt),
    actor: entry.performedBy,
    icon: actionToIcon(entry.action),
    variant,
  };
}

function actionToVariant(action: Hr2CompAuditAction): TimelineVariant {
  if (action.includes("Approved") || action.includes("Activated")) return "success";
  if (action.includes("Rejected") || action.includes("Terminated")) return "danger";
  if (action.includes("Submitted")) return "info";
  if (action.includes("Withdrawn")) return "warning";
  return "default";
}

function actionToIcon(action: Hr2CompAuditAction) {
  if (action.includes("Approved") || action.includes("Activated")) return <CheckCircle2 size={12} />;
  if (action.includes("Rejected")) return <XCircle size={12} />;
  if (action.includes("Submitted")) return <Send size={12} />;
  if (action.includes("Terminated")) return <History size={12} />;
  if (action.includes("Created")) return <FileText size={12} />;
  if (action.includes("Withdrawn")) return <Layers size={12} />;
  return <CircleDot size={12} />;
}

function lookupName(users: Array<{ id: string; name: string }>, userId?: string): string {
  if (!userId) return "";
  return users.find((u) => u.id === userId)?.name ?? userId;
}

void Clock;

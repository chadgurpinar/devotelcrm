import { Badge, Button } from "../../../components/ui";
import { OpsCase, OpsCaseAction, OpsMonitoringSignal, User } from "../../../store/types";
import { actionBadgeClass } from "../domain/opsTheme";

function formatDateTime(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function NocCaseHistoryDrawer(props: {
  caseRow: OpsCase;
  actions: OpsCaseAction[];
  linkedSignals: OpsMonitoringSignal[];
  users: User[];
  onClose: () => void;
}) {
  const { caseRow, actions, linkedSignals, users, onClose } = props;
  const orderedActions = [...actions].sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  const orderedSignals = [...linkedSignals].sort((a, b) => a.detectedAt.localeCompare(b.detectedAt));
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Case history</h3>
            <p className="text-xs text-slate-500">{caseRow.id}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">Case details</p>
          <p className="mt-1 text-xs text-slate-600">Status: {caseRow.status}</p>
          <p className="text-xs text-slate-600">Severity: {caseRow.severity}</p>
          <p className="text-xs text-slate-600">TT: {caseRow.ttNumber ?? "-"}</p>
          <p className="text-xs text-slate-600">Created: {formatDateTime(caseRow.createdAt)}</p>
        </div>

        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Action timeline</p>
          <div className="space-y-2">
            {orderedActions.length === 0 && <p className="text-xs text-slate-500">No actions recorded.</p>}
            {orderedActions.map((action) => (
              <div key={action.id} className="rounded-md border border-slate-200 p-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge className={actionBadgeClass(action.type)}>{action.type.replace(/_/g, " ")}</Badge>
                  <p className="text-[11px] text-slate-500">{formatDateTime(action.performedAt)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  By: {users.find((user) => user.id === action.performedByUserId)?.name ?? action.performedByUserId}
                </p>
                {action.comment && <p className="mt-1 text-xs text-slate-700">{action.comment}</p>}
                {action.ttNumber && <p className="mt-1 text-xs text-slate-700">TT Number: {action.ttNumber}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Linked signals</p>
          <div className="space-y-2">
            {orderedSignals.length === 0 && <p className="text-xs text-slate-500">No linked signals.</p>}
            {orderedSignals.map((signal) => (
              <div key={signal.id} className="rounded-md border border-slate-200 p-2">
                <p className="text-xs font-semibold text-slate-700">{signal.moduleOrigin.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-600">{signal.description}</p>
                <p className="text-[11px] text-slate-500">{formatDateTime(signal.detectedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

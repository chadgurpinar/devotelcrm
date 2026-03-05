import { Fragment, useState } from "react";
import { Badge, Button } from "../../../components/ui";
import { OpsCase, OpsCaseAction, OpsCaseActionType } from "../../../store/types";
import { OpsCaseActionDefinition } from "../domain/opsPolicies";
import { OpsCaseSlaView } from "../domain/opsSla";
import { caseStatusBadgeClass, getCaseCardTheme } from "../domain/opsTheme";
import { NocCaseCard } from "./NocCaseCard";
import { OpsSlaCountdown } from "./OpsSlaCountdown";

function compactContext(caseRow: OpsCase): string {
  const metadata = caseRow.metadata as unknown as Record<string, unknown>;
  const customerOrProvider = String(metadata.customerName ?? metadata.providerName ?? caseRow.relatedProvider ?? "-");
  const destination = String(metadata.destination ?? caseRow.relatedDestination ?? "-");
  return `${customerOrProvider} / ${destination}`;
}

export function NocCaseListCompact(props: {
  rows: OpsCase[];
  getSla: (caseRow: OpsCase) => OpsCaseSlaView;
  getAvailableActions: (caseRow: OpsCase) => OpsCaseActionDefinition[];
  getLastAction: (caseRow: OpsCase) => OpsCaseAction | undefined;
  getActorName: (userId: string) => string | undefined;
  currentActorName?: string;
  onApplyAction: (caseId: string, input: { actionType: OpsCaseActionType; comment?: string; ttNumber?: string }) => { ok: boolean; message?: string };
  onOpenHistory: (caseRow: OpsCase) => void;
  enableActions?: boolean;
}) {
  const { rows, getSla, getAvailableActions, getLastAction, getActorName, currentActorName, onApplyAction, onOpenHistory, enableActions = true } = props;
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-xs text-slate-500">No cases found for current filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Category</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Assigned</th>
            <th>SLA</th>
            <th>Destination / Customer</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((caseRow) => {
            const isExpanded = expandedCaseId === caseRow.id;
            const theme = getCaseCardTheme(caseRow);
            const lastAction = getLastAction(caseRow);
            return (
              <Fragment key={caseRow.id}>
                <tr className={`${theme.cardClass}`}>
                  <td className="font-mono text-[11px]">{caseRow.id}</td>
                  <td className="text-xs">{caseRow.category.replace(/_/g, " ")}</td>
                  <td>
                    <Badge className={theme.badgeClass}>
                      {caseRow.category === "TRAFFIC_COMPARISON"
                        ? String((caseRow.metadata as { comparisonType?: string }).comparisonType ?? "N/A")
                        : caseRow.severity}
                    </Badge>
                  </td>
                  <td>
                    <Badge className={caseStatusBadgeClass(caseRow.status)}>{caseRow.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="text-xs">{caseRow.assignedToUserId ? getActorName(caseRow.assignedToUserId) ?? caseRow.assignedToUserId : "-"}</td>
                  <td>
                    <OpsSlaCountdown sla={getSla(caseRow)} />
                  </td>
                  <td className="text-xs text-slate-600">{compactContext(caseRow)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => setExpandedCaseId(isExpanded ? null : caseRow.id)}>
                        {isExpanded ? "Close" : "Open"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onOpenHistory(caseRow)}>
                        History
                      </Button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="bg-slate-50 px-2 py-2">
                      <NocCaseCard
                        caseRow={caseRow}
                        sla={getSla(caseRow)}
                        availableActions={enableActions ? getAvailableActions(caseRow) : []}
                        lastAction={lastAction}
                        actorName={lastAction ? getActorName(lastAction.performedByUserId) : undefined}
                        currentActorName={currentActorName}
                        onApplyAction={(input) => onApplyAction(caseRow.id, input)}
                        onOpenHistory={() => onOpenHistory(caseRow)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

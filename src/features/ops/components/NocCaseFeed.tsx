import { OpsCase, OpsCaseAction, OpsCaseActionType } from "../../../store/types";
import { OpsCaseActionDefinition } from "../domain/opsPolicies";
import { OpsCaseSlaView } from "../domain/opsSla";
import { NocCaseCard } from "./NocCaseCard";

export function NocCaseFeed(props: {
  rows: OpsCase[];
  getSla: (caseRow: OpsCase) => OpsCaseSlaView;
  getAvailableActions: (caseRow: OpsCase) => OpsCaseActionDefinition[];
  getLastAction: (caseRow: OpsCase) => OpsCaseAction | undefined;
  getActorName: (userId: string) => string | undefined;
  currentActorName?: string;
  enableActions?: boolean;
  onApplyAction: (caseId: string, input: { actionType: OpsCaseActionType; comment?: string; ttNumber?: string }) => { ok: boolean; message?: string };
  onOpenHistory: (caseRow: OpsCase) => void;
}) {
  const { rows, getSla, getAvailableActions, getLastAction, getActorName, currentActorName, enableActions = true, onApplyAction, onOpenHistory } = props;
  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="text-xs text-slate-500">No cases found for current filters.</p>}
      {rows.map((caseRow) => {
        const lastAction = getLastAction(caseRow);
        return (
          <NocCaseCard
            key={caseRow.id}
            caseRow={caseRow}
            sla={getSla(caseRow)}
            availableActions={enableActions ? getAvailableActions(caseRow) : []}
            lastAction={lastAction}
            actorName={lastAction ? getActorName(lastAction.performedByUserId) : undefined}
            currentActorName={currentActorName}
            enableActions={enableActions}
            onApplyAction={(input) => onApplyAction(caseRow.id, input)}
            onOpenHistory={() => onOpenHistory(caseRow)}
          />
        );
      })}
    </div>
  );
}

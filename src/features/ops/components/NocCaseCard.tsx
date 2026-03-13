import { useMemo, useState } from "react";
import { Badge, Button } from "../../../components/ui";
import { OpsCase, OpsCaseAction, OpsCaseActionType } from "../../../store/types";
import { OpsCaseActionDefinition } from "../domain/opsPolicies";
import { OpsCaseSlaView } from "../domain/opsSla";
import { getCaseCardTheme } from "../domain/opsTheme";
import { NocCaseInfoBlock } from "./NocCaseInfoBlock";
import { OpsSlaCountdown } from "./OpsSlaCountdown";

function formatDateTime(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function NocCaseCard(props: {
  caseRow: OpsCase;
  sla: OpsCaseSlaView;
  availableActions: OpsCaseActionDefinition[];
  lastAction?: OpsCaseAction;
  actorName?: string;
  currentActorName?: string;
  enableActions?: boolean;
  onApplyAction: (input: { actionType: OpsCaseActionType; comment?: string; ttNumber?: string }) => { ok: boolean; message?: string };
  onOpenHistory: () => void;
}) {
  const { caseRow, sla, availableActions, lastAction, actorName, currentActorName, enableActions = true, onApplyAction, onOpenHistory } = props;
  const [selectedAction, setSelectedAction] = useState<OpsCaseActionDefinition | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [ttNumber, setTtNumber] = useState("");
  const [validationError, setValidationError] = useState("");

  const theme = useMemo(() => getCaseCardTheme(caseRow), [caseRow]);

  function resetForm() {
    setSelectedAction(undefined);
    setComment("");
    setTtNumber("");
    setValidationError("");
  }

  function submitAction() {
    if (!selectedAction) return;
    const trimmedComment = comment.trim();
    const trimmedTtNumber = ttNumber.trim();
    if (selectedAction.comment === "REQUIRED" && !trimmedComment) {
      setValidationError("Comment is mandatory for this action.");
      return;
    }
    if (selectedAction.ttNumber === "REQUIRED" && !trimmedTtNumber) {
      setValidationError("TT number is mandatory for this action.");
      return;
    }
    const result = onApplyAction({
      actionType: selectedAction.type,
      comment: trimmedComment,
      ttNumber: selectedAction.ttNumber === "REQUIRED" ? trimmedTtNumber : undefined,
    });
    if (!result.ok) {
      setValidationError(result.message ?? "Action failed.");
      return;
    }
    resetForm();
  }

  const saveDisabled =
    !selectedAction ||
    (selectedAction.comment === "REQUIRED" && !comment.trim()) ||
    (selectedAction.ttNumber === "REQUIRED" && !ttNumber.trim());

  return (
    <article className={`rounded-xl border p-3 shadow-sm ${theme.cardClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <NocCaseInfoBlock caseRow={caseRow} />
        </div>
        <Badge className={theme.badgeClass}>
          {caseRow.category === "TRAFFIC_COMPARISON"
            ? String((caseRow.metadata as { comparisonType?: string }).comparisonType ?? "N/A")
            : caseRow.severity}
        </Badge>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <OpsSlaCountdown sla={sla} />
        <Button size="sm" variant="ghost" onClick={onOpenHistory}>
          View history
        </Button>
      </div>

      {enableActions && availableActions.length > 0 && (
        <div className="mt-3 rounded-md border border-slate-200 bg-white/80 p-2">
          <div className="flex flex-wrap gap-1.5">
            {availableActions.map((action) => (
              <Button
                key={action.type}
                size="sm"
                variant={selectedAction?.type === action.type ? "primary" : "secondary"}
                onClick={() => {
                  setSelectedAction(action);
                  setValidationError("");
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
          {selectedAction && (
            <div className="mt-2 space-y-2">
              {selectedAction.ttNumber === "REQUIRED" && (
                <input
                  placeholder="Enter TT number"
                  value={ttNumber}
                  onChange={(event) => {
                    setTtNumber(event.target.value);
                    setValidationError("");
                  }}
                  className="w-full"
                />
              )}
              <textarea
                placeholder="Short action comment"
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value);
                  setValidationError("");
                }}
                rows={2}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
              <p className="text-[11px] text-slate-500">
                Action will be saved by <span className="font-semibold text-slate-700">{currentActorName ?? "Current user"}</span> at{" "}
                {formatDateTime(new Date().toISOString())}
              </p>
              {validationError && <p className="text-[11px] font-semibold text-rose-700">{validationError}</p>}
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submitAction} disabled={saveDisabled}>
                  Save action
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-[11px] text-slate-600">
        {lastAction ? (
          <>
            Last action by <span className="font-semibold">{actorName ?? lastAction.performedByUserId}</span> on{" "}
            <span className="font-semibold">{formatDateTime(lastAction.performedAt)}</span>
            {lastAction.comment ? ` — ${lastAction.comment}` : ""}
          </>
        ) : (
          <>No action yet.</>
        )}
      </div>
    </article>
  );
}

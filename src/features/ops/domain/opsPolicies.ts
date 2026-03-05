import {
  OpsCase,
  OpsCaseActionType,
  OpsCaseCategory,
  OpsCaseStatus,
  OpsResolutionType,
} from "../../../store/types";

export type OpsActionRequirement = "OPTIONAL" | "RECOMMENDED" | "REQUIRED";

export interface OpsCaseActionDefinition {
  type: OpsCaseActionType;
  label: string;
  resolutionType?: OpsResolutionType;
  nextStatus?: OpsCaseStatus;
  ttNumber: OpsActionRequirement;
  comment: OpsActionRequirement;
  completesSla: boolean;
}

const DISPOSITION_ACTIONS: OpsCaseActionType[] = [
  "CHECKED_NO_ISSUE",
  "ROUTING_CHANGED",
  "ACCOUNT_MANAGER_INFORMED",
  "ROUTING_INFORMED",
  "TT_RAISED",
  "IGNORED",
  "IGNORE",
  "RESOLVE",
];

export const OPS_ACTIONS_BY_CATEGORY: Record<OpsCaseCategory, OpsCaseActionDefinition[]> = {
  PROVIDER_ISSUE: [
    {
      type: "TT_RAISED",
      label: "TT RAISED",
      resolutionType: "TT_RAISED",
      nextStatus: "RESOLVED",
      ttNumber: "REQUIRED",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "IGNORED",
      label: "IGNORED",
      resolutionType: "IGNORED",
      nextStatus: "IGNORED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
  ],
  LOSSES: [
    {
      type: "CHECKED_NO_ISSUE",
      label: "CHECKED/NOISSUE",
      resolutionType: "NO_ISSUE",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "ROUTING_CHANGED",
      label: "ROUTING CHANGED",
      resolutionType: "ROUTING_CHANGED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "ACCOUNT_MANAGER_INFORMED",
      label: "AC MNG INFORMED",
      resolutionType: "ACCOUNT_MANAGER_INFORMED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
  ],
  NEW_LOST_TRAFFIC: [
    {
      type: "ACCOUNT_MANAGER_INFORMED",
      label: "AC MNG INFORMED",
      resolutionType: "ACCOUNT_MANAGER_INFORMED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "ROUTING_INFORMED",
      label: "ROUTING INFORMED",
      resolutionType: "ROUTING_INFORMED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "IGNORED",
      label: "IGNORED",
      resolutionType: "IGNORED",
      nextStatus: "IGNORED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
  ],
  TRAFFIC_COMPARISON: [
    {
      type: "CHECKED_NO_ISSUE",
      label: "CHECKED/NOISSUE",
      resolutionType: "NO_ISSUE",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "ROUTING_INFORMED",
      label: "ROUTING INFORMED",
      resolutionType: "ROUTING_INFORMED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "ACCOUNT_MANAGER_INFORMED",
      label: "AC MNG INFORMED",
      resolutionType: "ACCOUNT_MANAGER_INFORMED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
  ],
  SCHEDULE_TEST_RESULT: [
    {
      type: "TT_RAISED",
      label: "TT RAISED",
      resolutionType: "TT_RAISED",
      nextStatus: "RESOLVED",
      ttNumber: "REQUIRED",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "ROUTING_INFORMED",
      label: "ROUTING INFORMED",
      resolutionType: "ROUTING_INFORMED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "ACCOUNT_MANAGER_INFORMED",
      label: "AC MNG INFORMED",
      resolutionType: "ACCOUNT_MANAGER_INFORMED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "IGNORED",
      label: "IGNORED",
      resolutionType: "IGNORED",
      nextStatus: "IGNORED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
  ],
  FAILED_SMS_CALL: [
    {
      type: "CHECKED_NO_ISSUE",
      label: "CHECKED/NOISSUE",
      resolutionType: "NO_ISSUE",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "ROUTING_CHANGED",
      label: "ROUTING CHANGED",
      resolutionType: "ROUTING_CHANGED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
    {
      type: "ACCOUNT_MANAGER_INFORMED",
      label: "AC MNG INFORMED",
      resolutionType: "ACCOUNT_MANAGER_INFORMED",
      nextStatus: "RESOLVED",
      ttNumber: "OPTIONAL",
      comment: "REQUIRED",
      completesSla: true,
    },
  ],
};

export function isOpsCaseTerminal(status: OpsCaseStatus): boolean {
  return status === "RESOLVED" || status === "IGNORED" || status === "CANCELLED";
}

export function isDispositionActionType(actionType: OpsCaseActionType): boolean {
  return DISPOSITION_ACTIONS.includes(actionType);
}

export function normalizeCaseActionType(actionType: OpsCaseActionType): OpsCaseActionType {
  if (actionType === "IGNORE") return "IGNORED";
  if (actionType === "RESOLVE") return "CHECKED_NO_ISSUE";
  return actionType;
}

export function getAvailableActionsForCase(caseRow: OpsCase): OpsCaseActionDefinition[] {
  if (isOpsCaseTerminal(caseRow.status) || Boolean(caseRow.disposition)) {
    return [];
  }
  return OPS_ACTIONS_BY_CATEGORY[caseRow.category] ?? [];
}

export function getCaseActionDefinition(
  caseRow: OpsCase,
  actionType: OpsCaseActionType,
): OpsCaseActionDefinition | undefined {
  const normalizedType = normalizeCaseActionType(actionType);
  return (OPS_ACTIONS_BY_CATEGORY[caseRow.category] ?? []).find((entry) => entry.type === normalizedType);
}

export function requiresCaseComment(caseRow: OpsCase, actionType: OpsCaseActionType): boolean {
  if (actionType === "COMMENT" || actionType === "CANCEL" || actionType === "ESCALATED") return true;
  const definition = getCaseActionDefinition(caseRow, actionType);
  return definition?.comment === "REQUIRED";
}

export function requiresTtNumber(caseRow: OpsCase, actionType: OpsCaseActionType): boolean {
  const definition = getCaseActionDefinition(caseRow, actionType);
  return definition?.ttNumber === "REQUIRED";
}

export function nextCaseStatusForAction(caseRow: OpsCase, actionType: OpsCaseActionType): OpsCaseStatus | undefined {
  if (actionType === "START") {
    return caseRow.status === "NEW" ? "IN_PROGRESS" : undefined;
  }
  if (actionType === "CANCEL") {
    return caseRow.status === "NEW" || caseRow.status === "IN_PROGRESS" ? "CANCELLED" : undefined;
  }
  if (actionType === "COMMENT" || actionType === "ASSIGN" || actionType === "SIGNAL_REFRESHED" || actionType === "ESCALATED") {
    return caseRow.status;
  }
  const definition = getCaseActionDefinition(caseRow, actionType);
  if (!definition?.nextStatus) return undefined;
  if (caseRow.status !== "NEW" && caseRow.status !== "IN_PROGRESS") return undefined;
  return definition.nextStatus;
}

export function resolutionTypeForAction(
  caseRow: OpsCase,
  actionType: OpsCaseActionType,
  override?: OpsResolutionType,
): OpsResolutionType | undefined {
  if (override) return override;
  if (actionType === "IGNORE") return "IGNORED";
  if (actionType === "RESOLVE") return "FIXED";
  return getCaseActionDefinition(caseRow, actionType)?.resolutionType;
}

export function actionCompletesSla(caseRow: OpsCase, actionType: OpsCaseActionType): boolean {
  if (actionType === "CANCEL") return true;
  if (!isDispositionActionType(actionType)) return false;
  return getCaseActionDefinition(caseRow, actionType)?.completesSla ?? true;
}

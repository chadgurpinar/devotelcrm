import { OpsCase, OpsCaseStatus, OpsSeverity, OpsTrafficComparisonType } from "../../../store/types";
import { isDispositionActionType } from "./opsPolicies";

export interface OpsCaseCardTheme {
  cardClass: string;
  badgeClass: string;
  countdownClass: string;
}

export function severityBadgeClass(severity: OpsSeverity): string {
  if (severity === "URGENT") return "bg-rose-100 text-rose-700";
  if (severity === "HIGH") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export function directionBadgeClass(direction: OpsTrafficComparisonType): string {
  if (direction === "DECREASE") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

export function caseStatusBadgeClass(status: OpsCaseStatus): string {
  if (status === "RESOLVED") return "bg-emerald-100 text-emerald-700";
  if (status === "IGNORED" || status === "CANCELLED") return "bg-slate-200 text-slate-700";
  if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-700";
  return "bg-violet-100 text-violet-700";
}

function handledSeverityBackgroundClass(severity: OpsSeverity): string {
  if (severity === "URGENT") return "bg-rose-100 border-rose-300";
  if (severity === "HIGH") return "bg-amber-100 border-amber-300";
  return "bg-emerald-100 border-emerald-300";
}

function handledTrafficComparisonBackground(caseRow: OpsCase): string {
  if (caseRow.category !== "TRAFFIC_COMPARISON") return handledSeverityBackgroundClass(caseRow.severity);
  const metadata = caseRow.metadata as unknown as Record<string, unknown>;
  const direction = metadata.comparisonType === "INCREASE" ? "INCREASE" : "DECREASE";
  return direction === "DECREASE" ? "bg-rose-100 border-rose-300" : "bg-amber-100 border-amber-300";
}

export function hasCaseDisposition(caseRow: OpsCase): boolean {
  if (caseRow.disposition) return true;
  if (caseRow.resolutionType) return true;
  return false;
}

export function getCaseCardTheme(caseRow: OpsCase): OpsCaseCardTheme {
  const handled = hasCaseDisposition(caseRow);
  const cardClass = handled ? handledTrafficComparisonBackground(caseRow) : "bg-white border-slate-200";
  return {
    cardClass,
    badgeClass:
      caseRow.category === "TRAFFIC_COMPARISON"
        ? directionBadgeClass((caseRow.metadata as unknown as Record<string, unknown>).comparisonType === "INCREASE" ? "INCREASE" : "DECREASE")
        : severityBadgeClass(caseRow.severity),
    countdownClass: handled ? "text-slate-600" : "text-slate-700",
  };
}

export function actionBadgeClass(actionType: string): string {
  if (isDispositionActionType(actionType as never)) return "bg-slate-900 text-white";
  return "bg-slate-100 text-slate-700";
}

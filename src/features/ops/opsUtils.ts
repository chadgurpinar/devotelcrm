import { OpsCase, OpsCaseCategory, OpsCaseStatus, OpsRequestStatus, OpsSeverity, OpsSlaProfileId } from "../../store/types";
import { computeCaseSlaView, formatDurationMs as formatDurationFromDomain, getSlaTargetMs } from "./domain/opsSla";
import { caseStatusBadgeClass, severityBadgeClass } from "./domain/opsTheme";

export type OpsDateFilter = "Any" | "Today" | "Last7Days" | "Last30Days";

export function getSlaDurationMs(slaProfileId: OpsSlaProfileId, severity: OpsSeverity): number {
  return getSlaTargetMs(slaProfileId, severity);
}

export function computeCaseSla(caseRow: OpsCase): {
  dueAt: string;
  remainingMs: number;
  breached: boolean;
  progressPct: number;
  remainingPct: number;
} {
  const row = computeCaseSlaView(caseRow);
  const progressPct = 100 - row.remainingPct;
  return {
    dueAt: row.dueAt,
    remainingMs: row.remainingMs,
    breached: row.breached,
    progressPct,
    remainingPct: row.remainingPct,
  };
}

export function getEscalationLevel(remainingPct: number, breached: boolean): 0 | 1 | 2 | 3 {
  if (breached) return 3;
  if (remainingPct <= 20) return 2;
  if (remainingPct <= 50) return 1;
  return 0;
}

export function formatDurationMs(durationMs: number): string {
  return formatDurationFromDomain(durationMs);
}

export function dateMatchesFilter(value: string, filter: OpsDateFilter): boolean {
  if (filter === "Any") return true;
  const now = new Date();
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return false;
  if (filter === "Today") return start.toDateString() === now.toDateString();
  const dayCount = filter === "Last7Days" ? 7 : 30;
  const min = new Date(now);
  min.setDate(now.getDate() - dayCount);
  return start >= min && start <= now;
}

export { severityBadgeClass };

export function requestStatusBadgeClass(status: OpsRequestStatus): string {
  if (status === "Done") return "bg-emerald-100 text-emerald-700";
  if (status === "Failed" || status === "Cancelled") return "bg-rose-100 text-rose-700";
  if (status === "InProgress") return "bg-blue-100 text-blue-700";
  if (status === "Sent") return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-700";
}

export { caseStatusBadgeClass };

export function categoryToSlaProfile(category: OpsCaseCategory): OpsSlaProfileId {
  if (category === "LOSSES") return "LOSS";
  if (category === "SCHEDULE_TEST_RESULT") return "TEST";
  if (category === "FAILED_SMS_CALL") return "KPI";
  return "DEFAULT";
}

import { OpsCase, OpsCaseCategory, OpsCaseStatus, OpsRequestStatus, OpsSeverity, OpsSlaProfileId } from "../../store/types";

export type OpsDateFilter = "Any" | "Today" | "Last7Days" | "Last30Days";

export function getSlaDurationMs(slaProfileId: OpsSlaProfileId, severity: OpsSeverity): number {
  if (slaProfileId === "LOSS_ALERT") {
    if (severity === "Urgent") return 30 * 60 * 1000;
    if (severity === "High") return 60 * 60 * 1000;
    return 2 * 60 * 60 * 1000;
  }
  if (severity === "Urgent") return 60 * 60 * 1000;
  if (severity === "High") return 4 * 60 * 60 * 1000;
  return 8 * 60 * 60 * 1000;
}

export function computeCaseSla(caseRow: OpsCase): {
  dueAt: string;
  remainingMs: number;
  breached: boolean;
  progressPct: number;
  remainingPct: number;
} {
  const durationMs = getSlaDurationMs(caseRow.slaProfileId, caseRow.severity);
  const detectedAtMs = new Date(caseRow.detectedAt).getTime();
  const dueAtMs = detectedAtMs + durationMs;
  const stopAtIso =
    caseRow.status === "Resolved"
      ? caseRow.resolvedAt
      : caseRow.status === "Ignored"
        ? caseRow.ignoredAt
        : caseRow.status === "Cancelled"
          ? caseRow.cancelledAt
          : undefined;
  const stopAtMs = stopAtIso ? new Date(stopAtIso).getTime() : Date.now();
  const remainingMs = dueAtMs - stopAtMs;
  const elapsedMs = Math.max(0, stopAtMs - detectedAtMs);
  const progressPct = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
  const remainingPct = Math.max(0, Math.min(100, 100 - progressPct));
  return {
    dueAt: new Date(dueAtMs).toISOString(),
    remainingMs,
    breached: remainingMs < 0,
    progressPct,
    remainingPct,
  };
}

export function getEscalationLevel(remainingPct: number, breached: boolean): 0 | 1 | 2 | 3 {
  if (breached) return 3;
  if (remainingPct <= 25) return 2;
  if (remainingPct <= 50) return 1;
  return 0;
}

export function formatDurationMs(durationMs: number): string {
  const negative = durationMs < 0;
  const totalMinutes = Math.abs(Math.round(durationMs / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const text = `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return negative ? `-${text}` : text;
}

export function dateMatchesFilter(value: string, filter: OpsDateFilter): boolean {
  if (filter === "Any") return true;
  const now = new Date();
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return false;
  if (filter === "Today") {
    return start.toDateString() === now.toDateString();
  }
  const dayCount = filter === "Last7Days" ? 7 : 30;
  const min = new Date(now);
  min.setDate(now.getDate() - dayCount);
  return start >= min && start <= now;
}

export function severityBadgeClass(severity: OpsSeverity): string {
  if (severity === "Urgent") return "bg-rose-100 text-rose-700";
  if (severity === "High") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

export function requestStatusBadgeClass(status: OpsRequestStatus): string {
  if (status === "Done") return "bg-emerald-100 text-emerald-700";
  if (status === "Failed" || status === "Cancelled") return "bg-rose-100 text-rose-700";
  if (status === "InProgress") return "bg-blue-100 text-blue-700";
  if (status === "Sent") return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-700";
}

export function caseStatusBadgeClass(status: OpsCaseStatus): string {
  if (status === "Resolved") return "bg-emerald-100 text-emerald-700";
  if (status === "Ignored" || status === "Cancelled") return "bg-slate-100 text-slate-700";
  if (status === "InProgress") return "bg-blue-100 text-blue-700";
  return "bg-violet-100 text-violet-700";
}

export function categoryToSlaProfile(category: OpsCaseCategory): OpsSlaProfileId {
  return category === "Loss" ? "LOSS_ALERT" : "KPI_ALERT";
}

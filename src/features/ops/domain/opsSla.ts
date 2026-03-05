import { OpsCase, OpsCaseStatus, OpsSeverity, OpsSlaProfile, OpsSlaProfileId } from "../../../store/types";
import { actionCompletesSla } from "./opsPolicies";

export const DEFAULT_OPS_SLA_PROFILES: OpsSlaProfile[] = [
  {
    id: "DEFAULT",
    name: "Default SLA",
    targetsMs: {
      URGENT: 30 * 60 * 1000,
      HIGH: 2 * 60 * 60 * 1000,
      MEDIUM: 4 * 60 * 60 * 1000,
    },
  },
  {
    id: "LOSS",
    name: "Loss Alerts",
    targetsMs: {
      URGENT: 30 * 60 * 1000,
      HIGH: 2 * 60 * 60 * 1000,
      MEDIUM: 4 * 60 * 60 * 1000,
    },
  },
  {
    id: "KPI",
    name: "KPI Alerts",
    targetsMs: {
      URGENT: 45 * 60 * 1000,
      HIGH: 3 * 60 * 60 * 1000,
      MEDIUM: 6 * 60 * 60 * 1000,
    },
  },
  {
    id: "TEST",
    name: "Scheduled Test Alerts",
    targetsMs: {
      URGENT: 20 * 60 * 1000,
      HIGH: 90 * 60 * 1000,
      MEDIUM: 3 * 60 * 60 * 1000,
    },
  },
];

const PROFILE_BY_ID = new Map<OpsSlaProfileId, OpsSlaProfile>(
  DEFAULT_OPS_SLA_PROFILES.map((profile) => [profile.id, profile]),
);

export type OpsSlaState = "ON_TIME" | "NEAR_DEADLINE" | "OVERDUE" | "COMPLETED";

export interface OpsCaseSlaView {
  dueAt: string;
  totalMs: number;
  remainingMs: number;
  remainingPct: number;
  breached: boolean;
  slaState: OpsSlaState;
}

export function resolveOpsSlaProfile(profileId: OpsSlaProfileId): OpsSlaProfile {
  return PROFILE_BY_ID.get(profileId) ?? PROFILE_BY_ID.get("DEFAULT")!;
}

export function getSlaTargetMs(profileId: OpsSlaProfileId, severity: OpsSeverity): number {
  return resolveOpsSlaProfile(profileId).targetsMs[severity];
}

export function computeSlaDeadline(createdAtIso: string, profileId: OpsSlaProfileId, severity: OpsSeverity): string {
  const startsAtMs = new Date(createdAtIso).getTime();
  const targetMs = getSlaTargetMs(profileId, severity);
  return new Date(startsAtMs + targetMs).toISOString();
}

function getCaseTerminalTimestamp(caseRow: OpsCase): string | undefined {
  if (caseRow.status === "RESOLVED") return caseRow.resolvedAt;
  if (caseRow.status === "IGNORED") return caseRow.ignoredAt;
  if (caseRow.status === "CANCELLED") return caseRow.cancelledAt;
  return undefined;
}

function deriveDueAt(caseRow: OpsCase): string {
  if (caseRow.slaDeadline) return caseRow.slaDeadline;
  return computeSlaDeadline(caseRow.createdAt, caseRow.slaProfileId, caseRow.severity);
}

function deriveStopAt(caseRow: OpsCase, nowMs: number): number {
  if (caseRow.disposition && actionCompletesSla(caseRow, caseRow.disposition.resolutionType === "IGNORED" ? "IGNORED" : "RESOLVE")) {
    return new Date(caseRow.disposition.performedAt).getTime();
  }
  const terminalTimestamp = getCaseTerminalTimestamp(caseRow);
  if (terminalTimestamp) return new Date(terminalTimestamp).getTime();
  return nowMs;
}

function deriveSlaState(caseRow: OpsCase, breached: boolean, remainingPct: number): OpsSlaState {
  const terminal = caseRow.status === "RESOLVED" || caseRow.status === "IGNORED" || caseRow.status === "CANCELLED";
  if (terminal) return "COMPLETED";
  if (breached) return "OVERDUE";
  if (remainingPct < 20) return "NEAR_DEADLINE";
  return "ON_TIME";
}

export function computeCaseSlaView(caseRow: OpsCase, nowMs = Date.now()): OpsCaseSlaView {
  const dueAt = deriveDueAt(caseRow);
  const dueAtMs = new Date(dueAt).getTime();
  const totalMs = Math.max(1, getSlaTargetMs(caseRow.slaProfileId, caseRow.severity));
  const stopAtMs = deriveStopAt(caseRow, nowMs);
  const remainingMs = dueAtMs - stopAtMs;
  const remainingPct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const breached = remainingMs < 0;
  return {
    dueAt,
    totalMs,
    remainingMs,
    remainingPct,
    breached,
    slaState: deriveSlaState(caseRow, breached, remainingPct),
  };
}

export function formatDurationMs(durationMs: number): string {
  const negative = durationMs < 0;
  const absoluteMs = Math.abs(durationMs);
  const totalMinutes = Math.round(absoluteMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const rendered = `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return negative ? `-${rendered}` : rendered;
}

export function isOpenCaseStatus(status: OpsCaseStatus): boolean {
  return status === "NEW" || status === "IN_PROGRESS";
}

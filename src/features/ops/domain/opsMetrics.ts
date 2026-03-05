import { DbState, OpsCase, OpsSeverity } from "../../../store/types";
import { actionCompletesSla, isDispositionActionType } from "./opsPolicies";
import { selectCaseActions } from "./opsSelectors";
import { computeCaseSlaView } from "./opsSla";

const SEVERITY_ORDER: OpsSeverity[] = ["MEDIUM", "HIGH", "URGENT"];

export interface OpsSeverityMetric {
  severity: OpsSeverity;
  total: number;
  breached: number;
  breachRate: number;
}

export interface OpsPerformanceMetrics {
  totalCases: number;
  casesWithinSla: number;
  casesBreachedSla: number;
  slaComplianceRate: number;
  avgTimeToFirstActionMs: number | null;
  avgTimeToDispositionMs: number | null;
  countTtRaised: number;
  avgTimeToTtRaisedMs: number | null;
  routingTouchCount: number;
  severityStats: OpsSeverityMetric[];
}

function toNonNegativeDurationMs(fromIso: string, toIso: string): number | null {
  const fromMs = new Date(fromIso).getTime();
  const toMs = new Date(toIso).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return null;
  const duration = toMs - fromMs;
  return duration >= 0 ? duration : null;
}

function averageOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export function computeOpsPerformanceMetrics(state: DbState, rows: OpsCase[]): OpsPerformanceMetrics {
  const severityCounts = new Map<OpsSeverity, { total: number; breached: number }>(
    SEVERITY_ORDER.map((severity) => [severity, { total: 0, breached: 0 }]),
  );
  const firstActionDurations: number[] = [];
  const firstDispositionDurations: number[] = [];
  const ttRaisedDurations: number[] = [];
  let casesBreachedSla = 0;
  let countTtRaised = 0;
  let routingTouchCount = 0;

  rows.forEach((caseRow) => {
    const sla = computeCaseSlaView(caseRow);
    const severityBucket = severityCounts.get(caseRow.severity);
    if (severityBucket) {
      severityBucket.total += 1;
      if (sla.breached) severityBucket.breached += 1;
    }
    if (sla.breached) casesBreachedSla += 1;

    const actions = selectCaseActions(state, caseRow.id);
    const firstAction = actions[0];
    if (firstAction) {
      const duration = toNonNegativeDurationMs(caseRow.createdAt, firstAction.performedAt);
      if (duration !== null) firstActionDurations.push(duration);
    }

    const firstDisposition = actions.find((action) => isDispositionActionType(action.type) && actionCompletesSla(caseRow, action.type));
    if (firstDisposition) {
      const duration = toNonNegativeDurationMs(caseRow.createdAt, firstDisposition.performedAt);
      if (duration !== null) firstDispositionDurations.push(duration);
    }

    const ttRaisedAction = actions.find((action) => action.type === "TT_RAISED" || action.resolutionType === "TT_RAISED");
    if (ttRaisedAction) {
      countTtRaised += 1;
      const duration = toNonNegativeDurationMs(caseRow.createdAt, ttRaisedAction.performedAt);
      if (duration !== null) ttRaisedDurations.push(duration);
    } else if (caseRow.ttRaisedAt || caseRow.resolutionType === "TT_RAISED") {
      countTtRaised += 1;
      if (caseRow.ttRaisedAt) {
        const duration = toNonNegativeDurationMs(caseRow.createdAt, caseRow.ttRaisedAt);
        if (duration !== null) ttRaisedDurations.push(duration);
      }
    }

    const routingTouched =
      caseRow.resolutionType === "ROUTING_CHANGED" ||
      caseRow.resolutionType === "ROUTING_INFORMED" ||
      actions.some(
        (action) =>
          action.type === "ROUTING_CHANGED" ||
          action.type === "ROUTING_INFORMED" ||
          action.resolutionType === "ROUTING_CHANGED" ||
          action.resolutionType === "ROUTING_INFORMED",
      );
    if (routingTouched) routingTouchCount += 1;
  });

  const totalCases = rows.length;
  const casesWithinSla = totalCases - casesBreachedSla;
  return {
    totalCases,
    casesWithinSla,
    casesBreachedSla,
    slaComplianceRate: toPercent(casesWithinSla, totalCases),
    avgTimeToFirstActionMs: averageOrNull(firstActionDurations),
    avgTimeToDispositionMs: averageOrNull(firstDispositionDurations),
    countTtRaised,
    avgTimeToTtRaisedMs: averageOrNull(ttRaisedDurations),
    routingTouchCount,
    severityStats: SEVERITY_ORDER.map((severity) => {
      const stats = severityCounts.get(severity)!;
      return {
        severity,
        total: stats.total,
        breached: stats.breached,
        breachRate: toPercent(stats.breached, stats.total),
      };
    }),
  };
}

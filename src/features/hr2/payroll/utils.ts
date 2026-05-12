import {
  Hr2ExceptionCategory,
  Hr2ExceptionSeverity,
  Hr2PayrollCycleStatus,
  Hr2PayrollLineStatus,
} from "../../../store/types";
import { StatusTone } from "../components/primitives";

export function cycleStatusTone(status: Hr2PayrollCycleStatus): StatusTone {
  switch (status) {
    case "Approved":
    case "PaidOut":
      return "success";
    case "ReadyForReview":
      return "info";
    case "Computing":
      return "indigo";
    case "Draft":
      return "neutral";
    case "Closed":
      return "slate";
    default:
      return "neutral";
  }
}

export function lineStatusTone(status: Hr2PayrollLineStatus): StatusTone {
  switch (status) {
    case "Blocked":
      return "danger";
    case "Warning":
      return "warning";
    case "OK":
      return "success";
    default:
      return "neutral";
  }
}

export function severityTone(severity: Hr2ExceptionSeverity): StatusTone {
  return severity === "Blocker" ? "danger" : "warning";
}

export function categoryLabel(category: Hr2ExceptionCategory): string {
  switch (category) {
    case "MissingBank":
      return "Missing bank";
    case "PendingCompChange":
      return "Pending change";
    case "FxReviewNeeded":
      return "FX review";
    case "EntityMismatch":
      return "Entity mismatch";
    case "DocumentsMissing":
      return "Documents missing";
    case "ComplianceHold":
      return "Compliance hold";
    case "DataIncomplete":
      return "Data incomplete";
    default:
      return category;
  }
}

export function formatPeriod(period: string): string {
  // period is "YYYY-MM"
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const date = new Date(`${period}-01T00:00:00Z`);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

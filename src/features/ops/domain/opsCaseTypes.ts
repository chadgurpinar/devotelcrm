import { OpsCase, OpsCaseCategory, OpsMonitoringModuleOrigin } from "../../../store/types";

export const OPS_MODULE_ORIGINS: OpsMonitoringModuleOrigin[] = [
  "PROVIDER_ISSUES",
  "LOSSES",
  "NEW_AND_LOST_TRAFFICS",
  "TRAFFIC_COMPARISON",
  "SCHEDULE_TEST_RESULTS",
  "FAILED_SMS_OR_CALL_ANALYSIS",
];

export const OPS_CASE_CATEGORIES: OpsCaseCategory[] = [
  "PROVIDER_ISSUE",
  "LOSSES",
  "NEW_LOST_TRAFFIC",
  "TRAFFIC_COMPARISON",
  "SCHEDULE_TEST_RESULT",
  "FAILED_SMS_CALL",
];

export function inferCaseCategoryFromModule(moduleOrigin: OpsMonitoringModuleOrigin): OpsCaseCategory {
  if (moduleOrigin === "PROVIDER_ISSUES") return "PROVIDER_ISSUE";
  if (moduleOrigin === "LOSSES") return "LOSSES";
  if (moduleOrigin === "NEW_AND_LOST_TRAFFICS") return "NEW_LOST_TRAFFIC";
  if (moduleOrigin === "TRAFFIC_COMPARISON") return "TRAFFIC_COMPARISON";
  if (moduleOrigin === "SCHEDULE_TEST_RESULTS") return "SCHEDULE_TEST_RESULT";
  return "FAILED_SMS_CALL";
}

export function inferModuleOriginFromCategory(category: OpsCaseCategory): OpsMonitoringModuleOrigin {
  if (category === "PROVIDER_ISSUE") return "PROVIDER_ISSUES";
  if (category === "LOSSES") return "LOSSES";
  if (category === "NEW_LOST_TRAFFIC") return "NEW_AND_LOST_TRAFFICS";
  if (category === "TRAFFIC_COMPARISON") return "TRAFFIC_COMPARISON";
  if (category === "SCHEDULE_TEST_RESULT") return "SCHEDULE_TEST_RESULTS";
  return "FAILED_SMS_OR_CALL_ANALYSIS";
}

export function getCaseAlertTime(caseRow: OpsCase): string {
  return caseRow.metadata.alertTime ?? caseRow.createdAt;
}

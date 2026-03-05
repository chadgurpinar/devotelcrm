import { OpsAssignedRole, OpsCaseCategory, OpsPortalId, OpsTrackFilter } from "../../store/types";
import { OpsPortalScope } from "./domain/opsSelectors";

type LegacyPortalScope = "all" | "mine";

export type OpsPortalConfig = {
  portalId: OpsPortalId;
  title: string;
  subtitle?: string;
  defaultTrack: OpsTrackFilter;
  includedCategories?: OpsCaseCategory[];
  requestRoleFocus?: OpsAssignedRole[];
  showTrackFilter?: boolean;
  showScopeFilter?: boolean;
  showRequestsSection?: boolean;
  showSignalsSection?: boolean;
  defaultScope?: OpsPortalScope;
  // Legacy compatibility for existing wrappers.
  requestScope?: LegacyPortalScope;
  caseScope?: LegacyPortalScope;
  showRequests?: boolean;
  showSignals?: boolean;
};

export const SMS_NOC_PORTAL_CONFIG: OpsPortalConfig = {
  portalId: "sms-noc",
  title: "SMS NOC Portal",
  subtitle: "Operational monitoring and case/request workflow for SMS traffic.",
  defaultTrack: "SMS",
  includedCategories: [
    "PROVIDER_ISSUE",
    "LOSSES",
    "NEW_LOST_TRAFFIC",
    "TRAFFIC_COMPARISON",
    "SCHEDULE_TEST_RESULT",
    "FAILED_SMS_CALL",
  ],
  showTrackFilter: false,
  showSignalsSection: true,
};

export const VOICE_NOC_PORTAL_CONFIG: OpsPortalConfig = {
  portalId: "voice-noc",
  title: "Voice NOC Portal",
  subtitle: "Operational monitoring and case/request workflow for Voice traffic.",
  defaultTrack: "VOICE",
  includedCategories: [
    "PROVIDER_ISSUE",
    "LOSSES",
    "NEW_LOST_TRAFFIC",
    "TRAFFIC_COMPARISON",
    "SCHEDULE_TEST_RESULT",
    "FAILED_SMS_CALL",
  ],
  showTrackFilter: false,
  showSignalsSection: true,
};

export const ROUTING_NOC_PORTAL_CONFIG: OpsPortalConfig = {
  portalId: "routing-noc",
  title: "Routing & NOC Portal",
  subtitle: "Cross-track traffic and losses workspace for Routing and NOC collaboration.",
  defaultTrack: "ANY",
  includedCategories: ["PROVIDER_ISSUE", "LOSSES", "NEW_LOST_TRAFFIC", "TRAFFIC_COMPARISON", "FAILED_SMS_CALL"],
  requestRoleFocus: ["Routing", "NOC"],
  showTrackFilter: true,
  showRequestsSection: true,
  showSignalsSection: true,
};

export const AM_NOC_ROUTING_PORTAL_CONFIG: OpsPortalConfig = {
  portalId: "am-noc-routing",
  title: "AM & NOC & Routing Portal",
  subtitle: "Shared operational cockpit for account ownership and routing escalation.",
  defaultTrack: "ANY",
  includedCategories: [
    "PROVIDER_ISSUE",
    "LOSSES",
    "NEW_LOST_TRAFFIC",
    "TRAFFIC_COMPARISON",
    "SCHEDULE_TEST_RESULT",
    "FAILED_SMS_CALL",
  ],
  requestRoleFocus: ["AM", "NOC", "Routing"],
  showTrackFilter: true,
  showScopeFilter: true,
  defaultScope: "MINE",
  showRequestsSection: true,
  showSignalsSection: true,
};

export const ACCOUNT_MANAGERS_PORTAL_CONFIG: OpsPortalConfig = {
  portalId: "account-managers",
  title: "Account Managers Portal",
  subtitle: "AM-focused view for owned and watched customer accounts.",
  defaultTrack: "ANY",
  includedCategories: [
    "PROVIDER_ISSUE",
    "LOSSES",
    "NEW_LOST_TRAFFIC",
    "TRAFFIC_COMPARISON",
    "SCHEDULE_TEST_RESULT",
    "FAILED_SMS_CALL",
  ],
  showTrackFilter: true,
  showScopeFilter: true,
  defaultScope: "MINE",
  showRequestsSection: false,
  showSignalsSection: false,
};

export const PERFORMANCE_AUDIT_PORTAL_CONFIG: OpsPortalConfig = {
  portalId: "performance-audit",
  title: "NOC Performance / Audit",
  subtitle: "Read-only KPI and audit analytics over OPS case and action streams.",
  defaultTrack: "ANY",
  includedCategories: [
    "PROVIDER_ISSUE",
    "LOSSES",
    "NEW_LOST_TRAFFIC",
    "TRAFFIC_COMPARISON",
    "SCHEDULE_TEST_RESULT",
    "FAILED_SMS_CALL",
  ],
  showTrackFilter: true,
  showScopeFilter: false,
  showRequestsSection: false,
  showSignalsSection: false,
};

export const OPS_PORTAL_CONFIGS = {
  "sms-noc": SMS_NOC_PORTAL_CONFIG,
  "voice-noc": VOICE_NOC_PORTAL_CONFIG,
  "routing-noc": ROUTING_NOC_PORTAL_CONFIG,
  "am-noc-routing": AM_NOC_ROUTING_PORTAL_CONFIG,
  "account-managers": ACCOUNT_MANAGERS_PORTAL_CONFIG,
  "performance-audit": PERFORMANCE_AUDIT_PORTAL_CONFIG,
} as const;

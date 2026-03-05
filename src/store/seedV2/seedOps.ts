import {
  Company,
  OpsAuditLogEntry,
  OpsCase,
  OpsCaseActionType,
  OpsCaseCategory,
  OpsCaseStatus,
  OpsMonitoringModuleOrigin,
  OpsMonitoringSignal,
  OpsRequest,
  OpsRequestStatus,
  OpsRequestType,
  OpsResolutionType,
  OpsSeverity,
  OpsShift,
  OpsSlaProfile,
  OpsSlaProfileId,
  OpsTrack,
  User,
} from "../types";
import { SeedIdFactory } from "./ids";
import { SeedPrng } from "./prng";
import { ScenarioConfig } from "./scenarios";
import { addDaysToIso } from "./time";

export interface SeedOpsResult {
  opsMonitoringSignals: OpsMonitoringSignal[];
  opsCases: OpsCase[];
  opsRequests: OpsRequest[];
  opsAuditLogs: OpsAuditLogEntry[];
  opsShifts: OpsShift[];
  opsSlaProfiles: OpsSlaProfile[];
}

const MODULE_ORIGINS: OpsMonitoringModuleOrigin[] = [
  "PROVIDER_ISSUES",
  "LOSSES",
  "NEW_AND_LOST_TRAFFICS",
  "TRAFFIC_COMPARISON",
  "SCHEDULE_TEST_RESULTS",
  "FAILED_SMS_OR_CALL_ANALYSIS",
];

const REQUEST_TYPES: OpsRequestType[] = [
  "RoutingRequest",
  "TroubleTicketRequest",
  "TestRequest",
  "LossAccepted",
  "InterconnectionRequest",
];

const CASE_STATUSES: OpsCaseStatus[] = ["NEW", "IN_PROGRESS", "RESOLVED", "IGNORED", "CANCELLED"];
const REQUEST_STATUSES: OpsRequestStatus[] = ["Draft", "Sent", "InProgress", "Done", "Cancelled", "Failed"];
const DESTINATIONS = ["United Kingdom", "Spain", "Germany", "Turkey", "UAE", "France"];
const PROVIDERS = ["Carrier Sigma", "Carrier Nova", "Provider Orbit", "Provider Helix", "Gateway Flux", "Node Prism"];
const CUSTOMERS = ["NovaTel", "Blue Signal", "Astera Global", "MetroCom", "InfiniRoute"];

const OPS_SLA_PROFILES: OpsSlaProfile[] = [
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
    name: "Test Results",
    targetsMs: {
      URGENT: 20 * 60 * 1000,
      HIGH: 90 * 60 * 1000,
      MEDIUM: 3 * 60 * 60 * 1000,
    },
  },
];

function categoryFromModule(moduleOrigin: OpsMonitoringModuleOrigin): OpsCaseCategory {
  if (moduleOrigin === "PROVIDER_ISSUES") return "PROVIDER_ISSUE";
  if (moduleOrigin === "LOSSES") return "LOSSES";
  if (moduleOrigin === "NEW_AND_LOST_TRAFFICS") return "NEW_LOST_TRAFFIC";
  if (moduleOrigin === "TRAFFIC_COMPARISON") return "TRAFFIC_COMPARISON";
  if (moduleOrigin === "SCHEDULE_TEST_RESULTS") return "SCHEDULE_TEST_RESULT";
  return "FAILED_SMS_CALL";
}

function slaProfileFromCategory(category: OpsCaseCategory): OpsSlaProfileId {
  if (category === "LOSSES") return "LOSS";
  if (category === "SCHEDULE_TEST_RESULT") return "TEST";
  if (category === "FAILED_SMS_CALL") return "KPI";
  return "DEFAULT";
}

function requestAssignedRole(requestType: OpsRequestType): OpsRequest["assignedToRole"] {
  if (requestType === "RoutingRequest") return "Routing";
  if (requestType === "TroubleTicketRequest" || requestType === "TestRequest") return "NOC";
  if (requestType === "LossAccepted") return "AM";
  return "Supervisor";
}

function requestDoneAction(requestType: OpsRequestType): "ROUTING_DONE" | "TT_SENT" | "TEST_DONE" | "LOSS_ACCEPTED" {
  if (requestType === "TroubleTicketRequest") return "TT_SENT";
  if (requestType === "TestRequest") return "TEST_DONE";
  if (requestType === "LossAccepted") return "LOSS_ACCEPTED";
  return "ROUTING_DONE";
}

function actionFromResolution(resolutionType: OpsResolutionType | undefined): OpsCaseActionType {
  if (resolutionType === "TT_RAISED") return "TT_RAISED";
  if (resolutionType === "ROUTING_CHANGED") return "ROUTING_CHANGED";
  if (resolutionType === "ACCOUNT_MANAGER_INFORMED") return "ACCOUNT_MANAGER_INFORMED";
  if (resolutionType === "ROUTING_INFORMED") return "ROUTING_INFORMED";
  if (resolutionType === "IGNORED") return "IGNORED";
  return "CHECKED_NO_ISSUE";
}

function withMinutes(baseIso: string, deltaMinutes: number): string {
  return new Date(new Date(baseIso).getTime() + deltaMinutes * 60 * 1000).toISOString();
}

function updateMetadataAlertTime(metadata: OpsCase["metadata"], alertTime: string): OpsCase["metadata"] {
  return {
    ...metadata,
    alertTime,
  };
}

function buildSignalMetadata(params: {
  moduleOrigin: OpsMonitoringModuleOrigin;
  track: OpsTrack;
  idx: number;
  alertTime: string;
  providerName: string;
  destination: string;
  customerName: string;
}): OpsCase["metadata"] {
  const { moduleOrigin, track, idx, alertTime, providerName, destination, customerName } = params;
  const category = categoryFromModule(moduleOrigin);
  if (category === "PROVIDER_ISSUE") {
    return {
      providerName,
      smsCount: track === "SMS" ? 1400 + idx * 11 : undefined,
      callCount: track === "VOICE" ? 980 + idx * 9 : undefined,
      dlrValue: track === "SMS" ? 92 - (idx % 13) : undefined,
      asrValue: track === "VOICE" ? 78 - (idx % 12) : undefined,
      alertTime,
    };
  }
  if (category === "LOSSES") {
    return {
      customerName,
      destination,
      lossAmount: 400 + idx * 37,
      alertTime,
    };
  }
  if (category === "NEW_LOST_TRAFFIC") {
    return {
      customerName,
      destination,
      attemptCount: 550 + idx * 14,
      alertTime,
    };
  }
  if (category === "TRAFFIC_COMPARISON") {
    return {
      comparisonType: idx % 2 === 0 ? "DECREASE" : "INCREASE",
      comparisonPercentage: 8 + (idx % 21),
      alertTime,
    };
  }
  if (category === "SCHEDULE_TEST_RESULT") {
    return {
      providerName,
      destination,
      testResult: idx % 2 === 0 ? "FAILED" : "DELAYED",
      testToolName: track === "SMS" ? "TELQ" : "ARPTEL",
      alertTime,
    };
  }
  return {
    customerName,
    destination,
    attemptCount: 280 + idx * 10,
    alertTime,
  };
}

export function getSlaDurationMs(profile: OpsSlaProfileId, severity: OpsSeverity): number {
  if (profile === "LOSS") {
    if (severity === "URGENT") return 30 * 60 * 1000;
    if (severity === "HIGH") return 2 * 60 * 60 * 1000;
    return 4 * 60 * 60 * 1000;
  }
  if (profile === "TEST") {
    if (severity === "URGENT") return 20 * 60 * 1000;
    if (severity === "HIGH") return 90 * 60 * 1000;
    return 3 * 60 * 60 * 1000;
  }
  if (profile === "KPI") {
    if (severity === "URGENT") return 45 * 60 * 1000;
    if (severity === "HIGH") return 3 * 60 * 60 * 1000;
    return 6 * 60 * 60 * 1000;
  }
  if (severity === "URGENT") return 30 * 60 * 1000;
  if (severity === "HIGH") return 2 * 60 * 60 * 1000;
  return 4 * 60 * 60 * 1000;
}

export function seedOps(params: {
  rng: SeedPrng;
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  users: User[];
  companies: Company[];
  baseNowIso: string;
  activeUserId: string;
}): SeedOpsResult {
  const { idFactory, scenario, users, companies, baseNowIso, activeUserId } = params;
  const nocAssignableUsers = users.filter((user) =>
    ["NOC", "Interconnection Manager", "Head of SMS", "Head of Voice"].includes(user.role),
  );
  const trackValues: OpsTrack[] = ["SMS", "VOICE"];

  const opsMonitoringSignals: OpsMonitoringSignal[] = Array.from({ length: scenario.counts.opsSignals }).map((_, idx) => {
    const moduleOrigin = MODULE_ORIGINS[idx % MODULE_ORIGINS.length];
    const category = categoryFromModule(moduleOrigin);
    const track = trackValues[idx % trackValues.length];
    const severity: OpsSeverity = idx % 9 === 0 ? "URGENT" : idx % 3 === 0 ? "HIGH" : "MEDIUM";
    const relatedCompany = idx % 5 === 0 ? undefined : companies[(idx * 3 + 1) % companies.length];
    const detectedAt = withMinutes(baseNowIso, -(idx + 1) * 38);
    const providerName = PROVIDERS[idx % PROVIDERS.length];
    const destination = DESTINATIONS[(idx + 2) % DESTINATIONS.length];
    const customerName = CUSTOMERS[idx % CUSTOMERS.length];
    return {
      id: idFactory.next("opsSignal"),
      moduleOrigin,
      track,
      relatedTrack: track,
      severity,
      category,
      detectedAt,
      metadata: buildSignalMetadata({
        moduleOrigin,
        track,
        idx,
        alertTime: detectedAt,
        providerName,
        destination,
        customerName,
      }),
      fingerprint: `fp-${moduleOrigin}-${track}-${destination}-${providerName}-${idx % 11}`,
      relatedCompanyId: relatedCompany?.id,
      relatedProvider: providerName,
      relatedDestination: destination,
      description: `${moduleOrigin.replace(/_/g, " ")} alert for ${track} route ${idx + 1}.`,
      rawPayload: {
        source: "seed-v2",
        sample: idx + 1,
      },
      createdAt: detectedAt,
    };
  });

  const opsCases: OpsCase[] = opsMonitoringSignals.slice(0, scenario.counts.opsCases).map((signal, idx) => {
    const status = CASE_STATUSES[idx % CASE_STATUSES.length];
    const createdAt = signal.createdAt;
    let detectedAt = signal.detectedAt;
    const slaProfileId = slaProfileFromCategory(signal.category);
    if (scenario.toggles.forceOpsBreaches && (status === "NEW" || status === "IN_PROGRESS") && idx % 3 === 0) {
      const breachWindowMs = getSlaDurationMs(slaProfileId, signal.severity) + 30 * 60 * 1000;
      detectedAt = new Date(new Date(baseNowIso).getTime() - breachWindowMs).toISOString();
    }
    const slaDeadline = new Date(new Date(detectedAt).getTime() + getSlaDurationMs(slaProfileId, signal.severity)).toISOString();
    const updatedAt = withMinutes(createdAt, (idx % 5 + 1) * 45);
    const resolvedAt = status === "RESOLVED" ? updatedAt : undefined;
    const ignoredAt = status === "IGNORED" ? updatedAt : undefined;
    const cancelledAt = status === "CANCELLED" ? updatedAt : undefined;
    const baseResolution: OpsResolutionType | undefined =
      status === "RESOLVED"
        ? idx % 4 === 0
          ? "TT_RAISED"
          : idx % 4 === 1
            ? "ROUTING_CHANGED"
            : idx % 4 === 2
              ? "ACCOUNT_MANAGER_INFORMED"
              : "NO_ISSUE"
        : status === "IGNORED"
          ? "IGNORED"
          : undefined;
    const ttRaised = baseResolution === "TT_RAISED";
    const dispositionTime = status === "RESOLVED" ? resolvedAt : status === "IGNORED" ? ignoredAt : undefined;
    return {
      id: idFactory.next("opsCase"),
      portalOrigin: signal.track === "SMS" ? "sms-noc" : "voice-noc",
      moduleOrigin: signal.moduleOrigin,
      track: signal.track,
      relatedTrack: signal.track,
      severity: signal.severity,
      category: signal.category,
      detectedAt,
      metadata: updateMetadataAlertTime(signal.metadata, detectedAt),
      relatedCompanyId: signal.relatedCompanyId,
      relatedProvider: signal.relatedProvider,
      relatedDestination: signal.relatedDestination,
      description: signal.description,
      status,
      slaProfileId,
      slaDeadline,
      linkedSignalIds: [signal.id],
      lastSignalAt: detectedAt,
      ttNumber: ttRaised ? `TT-${1000 + idx}` : undefined,
      ttRaisedAt: ttRaised && dispositionTime ? withMinutes(dispositionTime, -5) : undefined,
      resolvedAt,
      ignoredAt,
      cancelledAt,
      resolutionType: baseResolution,
      disposition:
        dispositionTime && baseResolution
          ? {
              resolutionType: baseResolution,
              performedByUserId: nocAssignableUsers[idx % nocAssignableUsers.length]?.id ?? activeUserId,
              performedAt: dispositionTime,
              comment: "Synthetic case disposition from seeded workflow.",
            }
          : undefined,
      assignedToUserId: nocAssignableUsers[idx % nocAssignableUsers.length]?.id,
      createdAt,
      updatedAt,
    };
  });

  const opsRequests: OpsRequest[] = Array.from({ length: scenario.counts.opsRequests }).map((_, idx) => {
    const requestType = REQUEST_TYPES[idx % REQUEST_TYPES.length];
    const status = REQUEST_STATUSES[idx % REQUEST_STATUSES.length];
    const linkedCase = idx % 2 === 0 ? opsCases[idx % opsCases.length] : undefined;
    const createdAt = withMinutes(baseNowIso, -(idx + 2) * 57);
    const updatedAt = withMinutes(createdAt, (idx % 6 + 1) * 35);
    return {
      id: idFactory.next("opsRequest"),
      requestType,
      createdByUserId: users[idx % users.length]?.id ?? activeUserId,
      assignedToRole: requestAssignedRole(requestType),
      priority: linkedCase?.severity ?? (idx % 7 === 0 ? "URGENT" : idx % 3 === 0 ? "HIGH" : "MEDIUM"),
      relatedCompanyId: linkedCase?.relatedCompanyId ?? companies[(idx + 3) % companies.length]?.id,
      relatedTrack: linkedCase?.track ?? trackValues[idx % trackValues.length],
      destination: {
        country: linkedCase?.relatedDestination ?? DESTINATIONS[idx % DESTINATIONS.length],
        operator: linkedCase?.relatedProvider ?? PROVIDERS[idx % PROVIDERS.length],
      },
      comment: `Synthetic ${requestType} workflow entry.`,
      status,
      relatedCaseId: requestType === "TroubleTicketRequest" ? linkedCase?.id : undefined,
      createdAt,
      updatedAt,
    };
  });

  const opsAuditLogs: OpsAuditLogEntry[] = [];
  const pushAudit = (entry: Omit<OpsAuditLogEntry, "id">) => {
    opsAuditLogs.push({
      id: idFactory.next("opsAudit"),
      ...entry,
    });
  };

  opsCases.forEach((opsCase, idx) => {
    const actor = opsCase.assignedToUserId ?? users[idx % users.length]?.id ?? activeUserId;
    pushAudit({
      parentType: "Case",
      parentId: opsCase.id,
      actionType: "CREATED_AUTO",
      performedByUserId: actor,
      comment: "Case auto-created from monitoring signal.",
      timestamp: opsCase.createdAt,
    });
    if (opsCase.assignedToUserId) {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "ASSIGN",
        performedByUserId: actor,
        comment: `Assigned to ${opsCase.assignedToUserId}.`,
        timestamp: withMinutes(opsCase.createdAt, 1),
      });
    }
    if (opsCase.status === "IN_PROGRESS" || opsCase.status === "RESOLVED" || opsCase.status === "IGNORED" || opsCase.status === "CANCELLED") {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "START",
        performedByUserId: actor,
        comment: "Work started on this case.",
        timestamp: withMinutes(opsCase.createdAt, 2),
      });
    }
    if (opsCase.status === "RESOLVED" || opsCase.status === "IGNORED") {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: actionFromResolution(opsCase.resolutionType),
        performedByUserId: actor,
        comment: "Synthetic case disposition complete.",
        resolutionType: opsCase.resolutionType,
        ttNumber: opsCase.ttNumber,
        timestamp: opsCase.disposition?.performedAt ?? opsCase.updatedAt,
      });
    } else if (opsCase.status === "CANCELLED") {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "CANCEL",
        performedByUserId: actor,
        comment: "Synthetic cancelled case rationale.",
        timestamp: opsCase.cancelledAt ?? opsCase.updatedAt,
      });
    }
  });

  opsRequests.forEach((request, idx) => {
    const actor = request.createdByUserId || users[idx % users.length]?.id || activeUserId;
    pushAudit({
      parentType: "Request",
      parentId: request.id,
      actionType: "CREATED_MANUAL",
      performedByUserId: actor,
      comment: "Request created in seed workflow.",
      timestamp: request.createdAt,
    });
    if (request.status !== "Draft") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "SEND",
        performedByUserId: actor,
        timestamp: withMinutes(request.createdAt, 1),
      });
    }
    if (request.status === "InProgress" || request.status === "Done" || request.status === "Cancelled" || request.status === "Failed") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "START",
        performedByUserId: actor,
        timestamp: withMinutes(request.createdAt, 2),
      });
    }
    if (request.status === "Done") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: requestDoneAction(request.requestType),
        performedByUserId: actor,
        timestamp: request.updatedAt,
      });
    } else if (request.status === "Cancelled") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "CANCELLED",
        performedByUserId: actor,
        comment: "Synthetic cancelled request.",
        timestamp: request.updatedAt,
      });
    } else if (request.status === "Failed") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "MARK_FAILED",
        performedByUserId: actor,
        comment: "Synthetic failed request.",
        timestamp: request.updatedAt,
      });
    }
  });

  const opsShifts: OpsShift[] = Array.from({ length: scenario.counts.opsShifts }).map((_, idx) => {
    const startsAt = addDaysToIso(baseNowIso, -(idx + 1));
    const endsAt = addDaysToIso(startsAt, 1);
    const track: OpsShift["track"] = idx % 3 === 0 ? "BOTH" : idx % 2 === 0 ? "SMS" : "VOICE";
    const userIds = [users[idx % users.length]?.id, users[(idx + 2) % users.length]?.id, users[(idx + 4) % users.length]?.id].filter(
      (id): id is string => Boolean(id),
    );
    return {
      id: idFactory.next("opsShift"),
      track,
      startsAt,
      endsAt,
      userIds: Array.from(new Set(userIds)),
      createdAt: startsAt,
      updatedAt: startsAt,
    };
  });

  return {
    opsMonitoringSignals,
    opsCases,
    opsRequests,
    opsAuditLogs,
    opsShifts,
    opsSlaProfiles: OPS_SLA_PROFILES.map((profile) => ({ ...profile })),
  };
}

import {
  Company,
  OpsAuditLogEntry,
  OpsCase,
  OpsCaseCategory,
  OpsCaseStatus,
  OpsMonitoringModuleOrigin,
  OpsMonitoringSignal,
  OpsRequest,
  OpsRequestStatus,
  OpsRequestType,
  OpsSeverity,
  OpsShift,
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
}

const MODULE_ORIGINS: OpsMonitoringModuleOrigin[] = [
  "ProviderIssues",
  "Losses",
  "NewAndLostTraffics",
  "TrafficComparison",
  "ScheduleTestResults",
  "FailedSmsOrCallAnalysis",
];

const REQUEST_TYPES: OpsRequestType[] = [
  "RoutingRequest",
  "TroubleTicketRequest",
  "TestRequest",
  "LossAccepted",
  "InterconnectionRequest",
];

const CASE_STATUSES: OpsCaseStatus[] = ["New", "InProgress", "Resolved", "Ignored", "Cancelled"];
const REQUEST_STATUSES: OpsRequestStatus[] = ["Draft", "Sent", "InProgress", "Done", "Cancelled", "Failed"];
const DESTINATIONS = ["North Zone", "South Zone", "East Corridor", "West Corridor", "Metro Core", "Rural Mesh"];
const PROVIDERS = ["Carrier Sigma", "Carrier Nova", "Provider Orbit", "Provider Helix", "Gateway Flux", "Node Prism"];

function categoryFromModule(moduleOrigin: OpsMonitoringModuleOrigin): OpsCaseCategory {
  if (moduleOrigin === "Losses") return "Loss";
  if (moduleOrigin === "ProviderIssues") return "Provider";
  if (moduleOrigin === "TrafficComparison" || moduleOrigin === "NewAndLostTraffics") return "Traffic";
  if (moduleOrigin === "ScheduleTestResults") return "Test";
  if (moduleOrigin === "FailedSmsOrCallAnalysis") return "KPI";
  return "Other";
}

function slaProfileFromCategory(category: OpsCaseCategory): OpsSlaProfileId {
  return category === "Loss" ? "LOSS_ALERT" : "KPI_ALERT";
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

export function getSlaDurationMs(profile: OpsSlaProfileId, severity: OpsSeverity): number {
  if (profile === "LOSS_ALERT") {
    if (severity === "Urgent") return 30 * 60 * 1000;
    if (severity === "High") return 60 * 60 * 1000;
    return 2 * 60 * 60 * 1000;
  }
  if (severity === "Urgent") return 60 * 60 * 1000;
  if (severity === "High") return 4 * 60 * 60 * 1000;
  return 8 * 60 * 60 * 1000;
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
  const { rng, idFactory, scenario, users, companies, baseNowIso, activeUserId } = params;
  const nocAssignableUsers = users.filter((user) =>
    ["NOC", "Interconnection Manager", "Head of SMS", "Head of Voice"].includes(user.role),
  );
  const trackValues: OpsTrack[] = ["SMS", "Voice"];

  const opsMonitoringSignals: OpsMonitoringSignal[] = Array.from({ length: scenario.counts.opsSignals }).map((_, idx) => {
    const moduleOrigin = MODULE_ORIGINS[idx % MODULE_ORIGINS.length];
    const category = categoryFromModule(moduleOrigin);
    const relatedTrack = trackValues[idx % trackValues.length];
    const severity: OpsSeverity = idx % 9 === 0 ? "Urgent" : idx % 3 === 0 ? "High" : "Medium";
    const relatedCompany = idx % 5 === 0 ? undefined : companies[(idx * 3 + 1) % companies.length];
    const detectedAt = addDaysToIso(baseNowIso, -Math.floor(idx / 3));
    return {
      id: idFactory.next("opsSignal"),
      moduleOrigin,
      relatedTrack,
      severity,
      category,
      detectedAt,
      fingerprint: `fp-${moduleOrigin}-${relatedTrack}-${idx % 11}`,
      relatedCompanyId: relatedCompany?.id,
      relatedProvider: PROVIDERS[idx % PROVIDERS.length],
      relatedDestination: DESTINATIONS[(idx + 2) % DESTINATIONS.length],
      description: `${moduleOrigin} alert for ${relatedTrack} route ${idx + 1}.`,
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
    if (scenario.toggles.forceOpsBreaches && (status === "New" || status === "InProgress") && idx % 3 === 0) {
      const breachWindowMs = getSlaDurationMs(slaProfileId, signal.severity) + 30 * 60 * 1000;
      detectedAt = new Date(new Date(baseNowIso).getTime() - breachWindowMs).toISOString();
    }
    const updatedAt = new Date(new Date(createdAt).getTime() + (idx % 5 + 1) * 45 * 60 * 1000).toISOString();
    return {
      id: idFactory.next("opsCase"),
      moduleOrigin: signal.moduleOrigin,
      relatedTrack: signal.relatedTrack,
      severity: signal.severity,
      category: signal.category,
      detectedAt,
      relatedCompanyId: signal.relatedCompanyId,
      relatedProvider: signal.relatedProvider,
      relatedDestination: signal.relatedDestination,
      description: signal.description,
      status,
      slaProfileId,
      resolvedAt: status === "Resolved" ? updatedAt : undefined,
      ignoredAt: status === "Ignored" ? updatedAt : undefined,
      cancelledAt: status === "Cancelled" ? updatedAt : undefined,
      resolutionType: status === "Resolved" ? (idx % 2 === 0 ? "Fixed" : "PartnerIssue") : undefined,
      assignedToUserId: nocAssignableUsers[idx % nocAssignableUsers.length]?.id,
      createdAt,
      updatedAt,
    };
  });

  const caseById = new Map(opsCases.map((row) => [row.id, row]));
  const opsRequests: OpsRequest[] = Array.from({ length: scenario.counts.opsRequests }).map((_, idx) => {
    const requestType = REQUEST_TYPES[idx % REQUEST_TYPES.length];
    const status = REQUEST_STATUSES[idx % REQUEST_STATUSES.length];
    const linkedCase = idx % 2 === 0 ? opsCases[idx % opsCases.length] : undefined;
    const createdAt = addDaysToIso(baseNowIso, -Math.floor(idx / 2));
    const updatedAt = new Date(new Date(createdAt).getTime() + (idx % 6 + 1) * 35 * 60 * 1000).toISOString();
    return {
      id: idFactory.next("opsRequest"),
      requestType,
      createdByUserId: users[idx % users.length]?.id ?? activeUserId,
      assignedToRole: requestAssignedRole(requestType),
      priority: linkedCase?.severity ?? (idx % 7 === 0 ? "Urgent" : idx % 3 === 0 ? "High" : "Medium"),
      relatedCompanyId: linkedCase?.relatedCompanyId ?? companies[(idx + 3) % companies.length]?.id,
      relatedTrack: linkedCase?.relatedTrack ?? trackValues[idx % trackValues.length],
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

  // Case audit timeline
  opsCases.forEach((opsCase, idx) => {
    const actor = opsCase.assignedToUserId ?? users[idx % users.length]?.id ?? activeUserId;
    pushAudit({
      parentType: "Case",
      parentId: opsCase.id,
      actionType: "CREATED_AUTO",
      performedByUserId: actor,
      comment: "Case created from monitoring signal.",
      timestamp: opsCase.createdAt,
    });
    if (opsCase.assignedToUserId) {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "ASSIGN",
        performedByUserId: actor,
        comment: `Assigned to ${opsCase.assignedToUserId}.`,
        timestamp: new Date(new Date(opsCase.createdAt).getTime() + 60 * 1000).toISOString(),
      });
    }
    if (opsCase.status === "InProgress" || opsCase.status === "Resolved" || opsCase.status === "Ignored" || opsCase.status === "Cancelled") {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "START",
        performedByUserId: actor,
        timestamp: new Date(new Date(opsCase.createdAt).getTime() + 2 * 60 * 1000).toISOString(),
      });
    }
    if (opsCase.status === "Resolved") {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "RESOLVE",
        performedByUserId: actor,
        comment: "Synthetic resolution complete.",
        timestamp: opsCase.resolvedAt ?? opsCase.updatedAt,
      });
    } else if (opsCase.status === "Ignored") {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "IGNORE",
        performedByUserId: actor,
        comment: "Synthetic ignored case rationale.",
        timestamp: opsCase.ignoredAt ?? opsCase.updatedAt,
      });
    } else if (opsCase.status === "Cancelled") {
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

  // Request audit timeline (request lifecycle actions only)
  opsRequests.forEach((request) => {
    const actor = request.createdByUserId;
    if (request.status === "Draft") return;
    pushAudit({
      parentType: "Request",
      parentId: request.id,
      actionType: "SEND",
      performedByUserId: actor,
      timestamp: new Date(new Date(request.createdAt).getTime() + 60 * 1000).toISOString(),
    });
    if (request.status === "InProgress" || request.status === "Done" || request.status === "Cancelled" || request.status === "Failed") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "START",
        performedByUserId: actor,
        timestamp: new Date(new Date(request.createdAt).getTime() + 4 * 60 * 1000).toISOString(),
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
        comment: "Synthetic cancellation note.",
        timestamp: request.updatedAt,
      });
    } else if (request.status === "Failed") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "MARK_FAILED",
        performedByUserId: actor,
        comment: "Synthetic failure note.",
        timestamp: request.updatedAt,
      });
    }
  });

  // Link a subset of signals to cases.
  const caseIds = opsCases.map((row) => row.id);
  const linkedSignals = opsMonitoringSignals.map((signal, idx) => ({
    ...signal,
    createdCaseId: idx < caseIds.length && idx % 2 === 0 ? caseIds[idx] : undefined,
  }));

  const shiftTemplates: Array<{ startHour: number; endHour: number; track: OpsShift["track"] }> = [
    { startHour: 0, endHour: 8, track: "Both" },
    { startHour: 8, endHour: 16, track: "SMS" },
    { startHour: 16, endHour: 24, track: "Voice" },
  ];
  const opsShifts: OpsShift[] = [];
  const dayCount = Math.max(1, Math.ceil(scenario.counts.opsShifts / shiftTemplates.length));
  for (let day = 0; day < dayCount; day += 1) {
    shiftTemplates.forEach((template, idx) => {
      if (opsShifts.length >= scenario.counts.opsShifts) return;
      const startsAt = new Date("2026-03-20T00:00:00.000Z");
      startsAt.setUTCDate(startsAt.getUTCDate() + day);
      startsAt.setUTCHours(template.startHour, 0, 0, 0);
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(template.endHour === 24 ? 23 : template.endHour, template.endHour === 24 ? 59 : 0, 0, 0);
      const firstUser = nocAssignableUsers[(day + idx) % nocAssignableUsers.length]?.id ?? activeUserId;
      const secondUser = nocAssignableUsers[(day + idx + 1) % nocAssignableUsers.length]?.id ?? activeUserId;
      opsShifts.push({
        id: idFactory.next("opsShift"),
        track: template.track,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        userIds: Array.from(new Set([firstUser, secondUser])),
        createdAt: startsAt.toISOString(),
        updatedAt: startsAt.toISOString(),
      });
    });
  }

  return {
    opsMonitoringSignals: linkedSignals.sort((left, right) => left.id.localeCompare(right.id)),
    opsCases: opsCases.sort((left, right) => left.id.localeCompare(right.id)),
    opsRequests: opsRequests.sort((left, right) => left.id.localeCompare(right.id)),
    opsAuditLogs: opsAuditLogs.sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.id.localeCompare(right.id)),
    opsShifts: opsShifts.sort((left, right) => left.id.localeCompare(right.id)),
  };
}

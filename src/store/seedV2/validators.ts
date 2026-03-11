import { DbState, InterconnectionProcess, OpsCase, OurEntity } from "../types";
import { buildHrOrgAnalytics, buildHrOrgChart } from "../hrOrgSelectors";
import { ScenarioConfig } from "./scenarios";
import { getSlaDurationMs } from "./seedOps";

export interface SeedDiagnostics {
  counts: Record<keyof DbState, number>;
  hrOrg: {
    roots: number;
    maxDepth: number;
    levels: number;
    topManagersByHeadcount: Array<{ employeeId: string; fullName: string; headcount: number }>;
  };
  meetings: {
    primaryEventId?: string;
    totalPrimaryMeetings: number;
    maxMeetingsInSlot: number;
    averageMeetingsPerDay: number;
  };
  notesCoverage: {
    primaryEventCoveragePct: number;
    coveredMeetings: number;
    totalMeetings: number;
  };
  crmPipeline: {
    lead: number;
    interconnection: number;
    client: number;
    rejected: number;
  };
  ops: {
    breachedCount: number;
    pendingCount: number;
    requestsByType: Record<string, number>;
    requestsByStatus: Record<string, number>;
    casesByModuleOrigin: Record<string, number>;
    casesBySeverity: Record<string, number>;
  };
}

export interface SeedReport {
  errors: string[];
  diagnostics: SeedDiagnostics;
}

let hasLoggedSeedSummary = false;

function isDevEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function buildCounts(db: DbState): Record<keyof DbState, number> {
  return {
    version: db.version,
    activeUserId: 1,
    users: db.users.length,
    events: db.events.length,
    eventStaff: db.eventStaff.length,
    companies: db.companies.length,
    contacts: db.contacts.length,
    meetings: db.meetings.length,
    notes: db.notes.length,
    tasks: db.tasks.length,
    taskLabels: db.taskLabels.length,
    taskComments: db.taskComments.length,
    interconnectionProcesses: db.interconnectionProcesses.length,
    projects: db.projects.length,
    projectWeeklyReports: db.projectWeeklyReports.length,
    contracts: db.contracts.length,
    ourCompanyInfo: db.ourCompanyInfo.length,
    hrLegalEntities: db.hrLegalEntities.length,
    hrFxRates: db.hrFxRates.length,
    hrDepartments: db.hrDepartments.length,
    hrEmployees: db.hrEmployees.length,
    hrCompensations: db.hrCompensations.length,
    hrPayrollSnapshots: db.hrPayrollSnapshots.length,
    hrLeaveProfiles: db.hrLeaveProfiles.length,
    hrLeaveRequests: db.hrLeaveRequests.length,
    hrAssets: db.hrAssets.length,
    hrSoftwareLicenses: db.hrSoftwareLicenses.length,
    hrAssetAssignments: db.hrAssetAssignments.length,
    hrSoftwareProducts: db.hrSoftwareProducts.length,
    hrSoftwareSeats: db.hrSoftwareSeats.length,
    hrProvisionRequests: db.hrProvisionRequests.length,
    hrExpenses: db.hrExpenses.length,
    hrAuditLogs: db.hrAuditLogs.length,
    opsRequests: db.opsRequests.length,
    opsCases: db.opsCases.length,
    opsMonitoringSignals: db.opsMonitoringSignals.length,
    opsAuditLogs: db.opsAuditLogs.length,
    opsShifts: db.opsShifts.length,
    opsSlaProfiles: db.opsSlaProfiles.length,
    outbox: db.outbox.length,
  };
}

function uniqueIfPresent(values: string[]): { ok: boolean; duplicate?: string } {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) return { ok: false, duplicate: value };
    seen.add(normalized);
  }
  return { ok: true };
}

function checkManagerCycles(db: DbState): string[] {
  const errors: string[] = [];
  const managerByEmployee = new Map<string, string>();
  db.hrEmployees.forEach((employee) => {
    if (employee.managerId) managerByEmployee.set(employee.id, employee.managerId);
  });
  const visited = new Set<string>();
  const inStack = new Set<string>();

  const dfs = (employeeId: string) => {
    if (inStack.has(employeeId)) {
      errors.push(`HR manager cycle detected at employee ${employeeId}.`);
      return;
    }
    if (visited.has(employeeId)) return;
    visited.add(employeeId);
    inStack.add(employeeId);
    const managerId = managerByEmployee.get(employeeId);
    if (managerId) dfs(managerId);
    inStack.delete(employeeId);
  };

  db.hrEmployees.forEach((employee) => dfs(employee.id));
  return errors;
}

function buildMeetingDiagnostics(db: DbState): SeedDiagnostics["meetings"] {
  const primaryEvent = db.events.find((event) => event.name === "MWC Barcelona 2026") ?? db.events.find((event) => event.id === "e-primary");
  if (!primaryEvent) {
    return {
      primaryEventId: undefined,
      totalPrimaryMeetings: 0,
      maxMeetingsInSlot: 0,
      averageMeetingsPerDay: 0,
    };
  }
  const meetings = db.meetings.filter((meeting) => meeting.eventId === primaryEvent.id);
  const slotCounts = new Map<string, number>();
  meetings.forEach((meeting) => {
    const dateTime = new Date(meeting.startAt);
    const key = `${dateTime.toISOString().slice(0, 16)}`;
    slotCounts.set(key, (slotCounts.get(key) ?? 0) + 1);
  });
  const maxMeetingsInSlot = Math.max(0, ...Array.from(slotCounts.values()));
  const days = new Set(meetings.map((meeting) => meeting.startAt.slice(0, 10)));
  const averageMeetingsPerDay = days.size > 0 ? meetings.length / days.size : 0;
  return {
    primaryEventId: primaryEvent.id,
    totalPrimaryMeetings: meetings.length,
    maxMeetingsInSlot,
    averageMeetingsPerDay: Math.round(averageMeetingsPerDay * 100) / 100,
  };
}

function computeNotesCoverage(db: DbState, primaryEventId?: string): SeedDiagnostics["notesCoverage"] {
  if (!primaryEventId) {
    return {
      primaryEventCoveragePct: 0,
      coveredMeetings: 0,
      totalMeetings: 0,
    };
  }
  const primaryMeetings = db.meetings.filter((meeting) => meeting.eventId === primaryEventId);
  const notedMeetingIds = new Set(
    db.notes
      .filter((note) => note.relatedEventId === primaryEventId && note.relatedMeetingId)
      .map((note) => note.relatedMeetingId as string),
  );
  const coveredMeetings = primaryMeetings.filter((meeting) => notedMeetingIds.has(meeting.id)).length;
  const coveragePct = primaryMeetings.length > 0 ? (coveredMeetings / primaryMeetings.length) * 100 : 0;
  return {
    primaryEventCoveragePct: Math.round(coveragePct * 100) / 100,
    coveredMeetings,
    totalMeetings: primaryMeetings.length,
  };
}

function evaluateCaseBreach(caseRow: OpsCase, nowIso: string): boolean {
  const durationMs = getSlaDurationMs(caseRow.slaProfileId, caseRow.severity);
  const detectedAtMs = new Date(caseRow.detectedAt).getTime();
  const dueAt = detectedAtMs + durationMs;
  const stopAtIso =
    caseRow.status === "RESOLVED"
      ? caseRow.resolvedAt
      : caseRow.status === "IGNORED"
        ? caseRow.ignoredAt
        : caseRow.status === "CANCELLED"
          ? caseRow.cancelledAt
          : nowIso;
  const stopAtMs = new Date(stopAtIso ?? nowIso).getTime();
  return stopAtMs > dueAt;
}

function diagnosticsFromDb(db: DbState, scenario: ScenarioConfig): SeedDiagnostics {
  const orgChart = buildHrOrgChart(db.hrEmployees, db.hrDepartments, { includeInactive: false });
  const orgAnalytics = buildHrOrgAnalytics(orgChart, db.hrEmployees, db.hrDepartments, { includeInactive: false });
  const meetingDiagnostics = buildMeetingDiagnostics(db);
  const notesCoverage = computeNotesCoverage(db, meetingDiagnostics.primaryEventId);
  const requestsByType: Record<string, number> = {};
  const requestsByStatus: Record<string, number> = {};
  const casesByModuleOrigin: Record<string, number> = {};
  const casesBySeverity: Record<string, number> = {};
  db.opsRequests.forEach((request) => {
    requestsByType[request.requestType] = (requestsByType[request.requestType] ?? 0) + 1;
    requestsByStatus[request.status] = (requestsByStatus[request.status] ?? 0) + 1;
  });
  db.opsCases.forEach((opsCase) => {
    casesByModuleOrigin[opsCase.moduleOrigin] = (casesByModuleOrigin[opsCase.moduleOrigin] ?? 0) + 1;
    casesBySeverity[opsCase.severity] = (casesBySeverity[opsCase.severity] ?? 0) + 1;
  });
  const nowIso = scenario.timeAnchor.baseNowIso;
  const breachedCount = db.opsCases.filter((opsCase) => evaluateCaseBreach(opsCase, nowIso)).length;
  const pendingCount = db.opsCases.filter((opsCase) => opsCase.status === "NEW" || opsCase.status === "IN_PROGRESS").length;
  const rejected = db.companies.filter((company) => company.leadDisposition === "Rejected").length;
  return {
    counts: buildCounts(db),
    hrOrg: {
      roots: orgChart.roots.length,
      maxDepth: orgChart.maxDepth,
      levels: orgChart.nodeById.size > 0 ? orgChart.maxDepth + 1 : 0,
      topManagersByHeadcount: orgAnalytics.topManagersByHeadcount.slice(0, 5).map((entry) => ({
        employeeId: entry.employeeId,
        fullName: entry.fullName,
        headcount: entry.headcount,
      })),
    },
    meetings: meetingDiagnostics,
    notesCoverage,
    crmPipeline: {
      lead: db.companies.filter((company) => company.companyStatus === "LEAD").length,
      interconnection: db.companies.filter((company) => company.companyStatus === "INTERCONNECTION").length,
      client: db.companies.filter((company) => company.companyStatus === "CLIENT").length,
      rejected,
    },
    ops: {
      breachedCount,
      pendingCount,
      requestsByType,
      requestsByStatus,
      casesByModuleOrigin,
      casesBySeverity,
    },
  };
}

function pushFkError(errors: string[], relation: string, id: string) {
  errors.push(`Broken FK: ${relation} references missing id "${id}".`);
}

function validateFkIntegrity(db: DbState, errors: string[]) {
  const userIds = new Set(db.users.map((row) => row.id));
  const eventIds = new Set(db.events.map((row) => row.id));
  const companyIds = new Set(db.companies.map((row) => row.id));
  const contactIds = new Set(db.contacts.map((row) => row.id));
  const meetingIds = new Set(db.meetings.map((row) => row.id));
  const noteIds = new Set(db.notes.map((row) => row.id));
  const taskIds = new Set(db.tasks.map((row) => row.id));
  const processIds = new Set(db.interconnectionProcesses.map((row) => row.id));
  const projectIds = new Set(db.projects.map((row) => row.id));
  const hrDepartmentIds = new Set(db.hrDepartments.map((row) => row.id));
  const hrEmployeeIds = new Set(db.hrEmployees.map((row) => row.id));
  const hrCompensationIds = new Set(db.hrCompensations.map((row) => row.id));
  const hrPayrollSnapshotIds = new Set(db.hrPayrollSnapshots.map((row) => row.id));
  const hrLeaveRequestIds = new Set(db.hrLeaveRequests.map((row) => row.id));
  const hrExpenseIds = new Set(db.hrExpenses.map((row) => row.id));
  const hrAssetIds = new Set(db.hrAssets.map((row) => row.id));
  const hrAssetAssignmentIds = new Set(db.hrAssetAssignments.map((row) => row.id));
  const hrSoftwareProductIds = new Set(db.hrSoftwareProducts.map((row) => row.id));
  const hrSoftwareSeatIds = new Set(db.hrSoftwareSeats.map((row) => row.id));
  const hrProvisionRequestIds = new Set(db.hrProvisionRequests.map((row) => row.id));
  const opsSignalIds = new Set(db.opsMonitoringSignals.map((row) => row.id));
  const opsCaseIds = new Set(db.opsCases.map((row) => row.id));
  const opsRequestIds = new Set(db.opsRequests.map((row) => row.id));
  const legalEntityIds = new Set<OurEntity>(db.hrLegalEntities.map((row) => row.id));

  db.eventStaff.forEach((row) => {
    if (!eventIds.has(row.eventId)) pushFkError(errors, "EventStaff.eventId", row.eventId);
    if (!userIds.has(row.userId)) pushFkError(errors, "EventStaff.userId", row.userId);
  });
  db.contacts.forEach((row) => {
    if (row.companyId && !companyIds.has(row.companyId)) pushFkError(errors, "Contact.companyId", row.companyId);
  });
  db.companies.forEach((row) => {
    if (!userIds.has(row.ownerUserId)) pushFkError(errors, "Company.ownerUserId", row.ownerUserId);
    row.watcherUserIds.forEach((watcherId) => {
      if (!userIds.has(watcherId)) pushFkError(errors, "Company.watcherUserIds", watcherId);
    });
    if (row.internalAmUserId && !userIds.has(row.internalAmUserId)) pushFkError(errors, "Company.internalAmUserId", row.internalAmUserId);
    if (row.createdFromEventId && !eventIds.has(row.createdFromEventId)) pushFkError(errors, "Company.createdFromEventId", row.createdFromEventId);
    if (row.primaryContactIds?.commercial && !contactIds.has(row.primaryContactIds.commercial)) {
      pushFkError(errors, "Company.primaryContactIds.commercial", row.primaryContactIds.commercial);
    }
    if (row.primaryContactIds?.technical && !contactIds.has(row.primaryContactIds.technical)) {
      pushFkError(errors, "Company.primaryContactIds.technical", row.primaryContactIds.technical);
    }
    if (row.primaryContactIds?.finance && !contactIds.has(row.primaryContactIds.finance)) {
      pushFkError(errors, "Company.primaryContactIds.finance", row.primaryContactIds.finance);
    }
  });
  db.meetings.forEach((row) => {
    if (!eventIds.has(row.eventId)) pushFkError(errors, "Meeting.eventId", row.eventId);
    if (!companyIds.has(row.companyId)) pushFkError(errors, "Meeting.companyId", row.companyId);
    if (!contactIds.has(row.contactId)) pushFkError(errors, "Meeting.contactId", row.contactId);
    if (!userIds.has(row.ownerUserId)) pushFkError(errors, "Meeting.ownerUserId", row.ownerUserId);
  });
  db.notes.forEach((row) => {
    if (!companyIds.has(row.companyId)) pushFkError(errors, "Note.companyId", row.companyId);
    if (!userIds.has(row.createdByUserId)) pushFkError(errors, "Note.createdByUserId", row.createdByUserId);
    if (row.relatedEventId && !eventIds.has(row.relatedEventId)) pushFkError(errors, "Note.relatedEventId", row.relatedEventId);
    if (row.relatedMeetingId && !meetingIds.has(row.relatedMeetingId)) pushFkError(errors, "Note.relatedMeetingId", row.relatedMeetingId);
    if (row.relatedContactId && !contactIds.has(row.relatedContactId)) pushFkError(errors, "Note.relatedContactId", row.relatedContactId);
  });
  db.tasks.forEach((row) => {
    if (!userIds.has(row.createdByUserId)) pushFkError(errors, "Task.createdByUserId", row.createdByUserId);
    if (!userIds.has(row.assigneeUserId)) pushFkError(errors, "Task.assigneeUserId", row.assigneeUserId);
    row.watcherUserIds.forEach((watcherId) => {
      if (!userIds.has(watcherId)) pushFkError(errors, "Task.watcherUserIds", watcherId);
    });
    if (row.companyId && !companyIds.has(row.companyId)) pushFkError(errors, "Task.companyId", row.companyId);
    if (row.eventId && !eventIds.has(row.eventId)) pushFkError(errors, "Task.eventId", row.eventId);
    if (row.interconnectionProcessId && !processIds.has(row.interconnectionProcessId)) {
      pushFkError(errors, "Task.interconnectionProcessId", row.interconnectionProcessId);
    }
    if (row.projectId && !projectIds.has(row.projectId)) pushFkError(errors, "Task.projectId", row.projectId);
    if (row.meetingId && !meetingIds.has(row.meetingId)) pushFkError(errors, "Task.meetingId", row.meetingId);
    if (row.noteId && !noteIds.has(row.noteId)) pushFkError(errors, "Task.noteId", row.noteId);
  });
  db.taskComments.forEach((row) => {
    if (!taskIds.has(row.taskId)) pushFkError(errors, "TaskComment.taskId", row.taskId);
    if (!userIds.has(row.authorUserId)) pushFkError(errors, "TaskComment.authorUserId", row.authorUserId);
  });
  db.interconnectionProcesses.forEach((row) => {
    if (!companyIds.has(row.companyId)) pushFkError(errors, "InterconnectionProcess.companyId", row.companyId);
    if (!userIds.has(row.ownerUserId)) pushFkError(errors, "InterconnectionProcess.ownerUserId", row.ownerUserId);
  });
  db.projectWeeklyReports.forEach((row) => {
    if (!projectIds.has(row.projectId)) pushFkError(errors, "ProjectWeeklyReport.projectId", row.projectId);
    if (row.amendsReportId && !db.projectWeeklyReports.some((entry) => entry.id === row.amendsReportId)) {
      pushFkError(errors, "ProjectWeeklyReport.amendsReportId", row.amendsReportId);
    }
  });
  db.contracts.forEach((row) => {
    if (!companyIds.has(row.companyId)) pushFkError(errors, "Contract.companyId", row.companyId);
    if (!processIds.has(row.interconnectionProcessId)) pushFkError(errors, "Contract.interconnectionProcessId", row.interconnectionProcessId);
    if (!userIds.has(row.requestedByUserId)) pushFkError(errors, "Contract.requestedByUserId", row.requestedByUserId);
    if (row.internalSignerUserId && !userIds.has(row.internalSignerUserId)) {
      pushFkError(errors, "Contract.internalSignerUserId", row.internalSignerUserId);
    }
    row.files.forEach((file) => {
      if (!userIds.has(file.uploadedByUserId)) pushFkError(errors, "ContractFile.uploadedByUserId", file.uploadedByUserId);
    });
  });
  db.hrDepartments.forEach((row) => {
    if (row.parentDepartmentId && !hrDepartmentIds.has(row.parentDepartmentId)) {
      pushFkError(errors, "HrDepartment.parentDepartmentId", row.parentDepartmentId);
    }
  });
  db.hrEmployees.forEach((row) => {
    if (!hrDepartmentIds.has(row.departmentId)) pushFkError(errors, "HrEmployee.departmentId", row.departmentId);
    if (row.managerId && !hrEmployeeIds.has(row.managerId)) pushFkError(errors, "HrEmployee.managerId", row.managerId);
    if (!legalEntityIds.has(row.legalEntityId)) pushFkError(errors, "HrEmployee.legalEntityId", row.legalEntityId);
    if (row.systemUserId && !userIds.has(row.systemUserId)) pushFkError(errors, "HrEmployee.systemUserId", row.systemUserId);
  });
  db.hrCompensations.forEach((row) => {
    if (!hrEmployeeIds.has(row.employeeId)) pushFkError(errors, "HrEmployeeCompensation.employeeId", row.employeeId);
    row.bonusEntries.forEach((bonus) => {
      if (!hrEmployeeIds.has(bonus.employeeId)) pushFkError(errors, "HrBonusEntry.employeeId", bonus.employeeId);
    });
    row.salaryDistribution.forEach((line) => {
      if (!legalEntityIds.has(line.legalEntityId)) pushFkError(errors, "HrSalaryDistributionLine.legalEntityId", line.legalEntityId);
    });
  });
  db.hrPayrollSnapshots.forEach((row) => {
    if (!userIds.has(row.createdByUserId)) pushFkError(errors, "HrPayrollMonthSnapshot.createdByUserId", row.createdByUserId);
    row.lines.forEach((line) => {
      if (!hrEmployeeIds.has(line.employeeId)) pushFkError(errors, "HrPayrollEmployeeLine.employeeId", line.employeeId);
      if (line.snapshotId !== row.id) pushFkError(errors, "HrPayrollEmployeeLine.snapshotId", line.snapshotId);
      line.distributionBreakdown.forEach((entry) => {
        if (!legalEntityIds.has(entry.legalEntityId)) pushFkError(errors, "HrPayrollDistributionBreakdown.legalEntityId", entry.legalEntityId);
      });
    });
  });
  db.hrLeaveRequests.forEach((row) => {
    if (!hrEmployeeIds.has(row.employeeId)) pushFkError(errors, "HrLeaveRequest.employeeId", row.employeeId);
  });
  db.hrAssets.forEach((row) => {
    if (row.assignedToEmployeeId && !hrEmployeeIds.has(row.assignedToEmployeeId)) {
      pushFkError(errors, "HrAsset.assignedToEmployeeId", row.assignedToEmployeeId);
    }
  });
  db.hrAssetAssignments.forEach((row) => {
    if (!hrAssetIds.has(row.assetId)) pushFkError(errors, "HrAssetAssignment.assetId", row.assetId);
    if (!hrEmployeeIds.has(row.employeeId)) pushFkError(errors, "HrAssetAssignment.employeeId", row.employeeId);
    if (!userIds.has(row.assignedByUserId)) pushFkError(errors, "HrAssetAssignment.assignedByUserId", row.assignedByUserId);
  });
  db.hrSoftwareProducts.forEach((row) => {
    if (!row.name.trim()) errors.push(`HrSoftwareProduct.name is empty for ${row.id}.`);
  });
  db.hrSoftwareSeats.forEach((row) => {
    if (!hrSoftwareProductIds.has(row.softwareProductId)) {
      pushFkError(errors, "HrSoftwareSeat.softwareProductId", row.softwareProductId);
    }
    if (row.assignedToEmployeeId && !hrEmployeeIds.has(row.assignedToEmployeeId)) {
      pushFkError(errors, "HrSoftwareSeat.assignedToEmployeeId", row.assignedToEmployeeId);
    }
    if (row.status === "Assigned" && !row.assignedToEmail) {
      errors.push(`HrSoftwareSeat ${row.id} is Assigned but assignedToEmail is missing.`);
    }
  });
  db.hrProvisionRequests.forEach((row) => {
    if (!hrEmployeeIds.has(row.requesterEmployeeId)) {
      pushFkError(errors, "HrProvisionRequest.requesterEmployeeId", row.requesterEmployeeId);
    }
    if (row.requestedSoftwareProductId && !hrSoftwareProductIds.has(row.requestedSoftwareProductId)) {
      pushFkError(errors, "HrProvisionRequest.requestedSoftwareProductId", row.requestedSoftwareProductId);
    }
    if (row.linkedAssetAssignmentId && !hrAssetAssignmentIds.has(row.linkedAssetAssignmentId)) {
      pushFkError(errors, "HrProvisionRequest.linkedAssetAssignmentId", row.linkedAssetAssignmentId);
    }
    if (row.linkedSoftwareSeatId && !hrSoftwareSeatIds.has(row.linkedSoftwareSeatId)) {
      pushFkError(errors, "HrProvisionRequest.linkedSoftwareSeatId", row.linkedSoftwareSeatId);
    }
    if (row.managerApproverUserId && !userIds.has(row.managerApproverUserId)) {
      pushFkError(errors, "HrProvisionRequest.managerApproverUserId", row.managerApproverUserId);
    }
    if (row.hrApproverUserId && !userIds.has(row.hrApproverUserId)) {
      pushFkError(errors, "HrProvisionRequest.hrApproverUserId", row.hrApproverUserId);
    }
  });
  db.hrSoftwareLicenses.forEach((row) => {
    if (row.assignedToEmployeeId && !hrEmployeeIds.has(row.assignedToEmployeeId)) {
      pushFkError(errors, "HrSoftwareLicense.assignedToEmployeeId", row.assignedToEmployeeId);
    }
  });
  db.hrExpenses.forEach((row) => {
    if (!hrEmployeeIds.has(row.employeeId)) pushFkError(errors, "HrExpense.employeeId", row.employeeId);
  });
  db.hrAuditLogs.forEach((row) => {
    if (!userIds.has(row.performedByUserId)) pushFkError(errors, "HrAuditLogEntry.performedByUserId", row.performedByUserId);
    if (row.parentType === "Leave" && !hrLeaveRequestIds.has(row.parentId)) pushFkError(errors, "HrAuditLogEntry.parentId(Leave)", row.parentId);
    if (row.parentType === "Expense" && !hrExpenseIds.has(row.parentId)) pushFkError(errors, "HrAuditLogEntry.parentId(Expense)", row.parentId);
    if (row.parentType === "Asset" && !hrAssetIds.has(row.parentId)) pushFkError(errors, "HrAuditLogEntry.parentId(Asset)", row.parentId);
    if (row.parentType === "AssetAssignment" && !hrAssetAssignmentIds.has(row.parentId)) {
      pushFkError(errors, "HrAuditLogEntry.parentId(AssetAssignment)", row.parentId);
    }
    if (row.parentType === "SoftwareSeat" && !hrSoftwareSeatIds.has(row.parentId)) {
      pushFkError(errors, "HrAuditLogEntry.parentId(SoftwareSeat)", row.parentId);
    }
    if (row.parentType === "ProvisionRequest" && !hrProvisionRequestIds.has(row.parentId)) {
      pushFkError(errors, "HrAuditLogEntry.parentId(ProvisionRequest)", row.parentId);
    }
    if (row.parentType === "Compensation" && !hrCompensationIds.has(row.parentId)) {
      pushFkError(errors, "HrAuditLogEntry.parentId(Compensation)", row.parentId);
    }
    if (row.parentType === "PayrollSnapshot" && !hrPayrollSnapshotIds.has(row.parentId)) {
      pushFkError(errors, "HrAuditLogEntry.parentId(PayrollSnapshot)", row.parentId);
    }
  });
  db.opsMonitoringSignals.forEach((row) => {
    if (row.relatedCompanyId && !companyIds.has(row.relatedCompanyId)) pushFkError(errors, "OpsMonitoringSignal.relatedCompanyId", row.relatedCompanyId);
    if (row.createdCaseId && !opsCaseIds.has(row.createdCaseId)) pushFkError(errors, "OpsMonitoringSignal.createdCaseId", row.createdCaseId);
  });
  db.opsCases.forEach((row) => {
    if (row.relatedCompanyId && !companyIds.has(row.relatedCompanyId)) pushFkError(errors, "OpsCase.relatedCompanyId", row.relatedCompanyId);
    if (row.assignedToUserId && !userIds.has(row.assignedToUserId)) pushFkError(errors, "OpsCase.assignedToUserId", row.assignedToUserId);
    row.linkedSignalIds.forEach((signalId) => {
      if (!opsSignalIds.has(signalId)) pushFkError(errors, "OpsCase.linkedSignalIds", signalId);
    });
  });
  db.opsRequests.forEach((row) => {
    if (!userIds.has(row.createdByUserId)) pushFkError(errors, "OpsRequest.createdByUserId", row.createdByUserId);
    if (row.relatedCompanyId && !companyIds.has(row.relatedCompanyId)) pushFkError(errors, "OpsRequest.relatedCompanyId", row.relatedCompanyId);
    if (row.relatedCaseId && !opsCaseIds.has(row.relatedCaseId)) pushFkError(errors, "OpsRequest.relatedCaseId", row.relatedCaseId);
  });
  db.opsAuditLogs.forEach((row) => {
    if (!userIds.has(row.performedByUserId)) pushFkError(errors, "OpsAuditLogEntry.performedByUserId", row.performedByUserId);
    if (row.parentType === "Case" && !opsCaseIds.has(row.parentId)) pushFkError(errors, "OpsAuditLogEntry.parentId(Case)", row.parentId);
    if (row.parentType === "Request" && !opsRequestIds.has(row.parentId)) pushFkError(errors, "OpsAuditLogEntry.parentId(Request)", row.parentId);
  });
  db.opsShifts.forEach((row) => {
    row.userIds.forEach((userId) => {
      if (!userIds.has(userId)) pushFkError(errors, "OpsShift.userIds", userId);
    });
  });
}

function validateCoherence(db: DbState, scenario: ScenarioConfig, diagnostics: SeedDiagnostics, errors: string[]) {
  const processByCompany = new Map<string, InterconnectionProcess[]>();
  db.interconnectionProcesses.forEach((process) => {
    const list = processByCompany.get(process.companyId) ?? [];
    list.push(process);
    processByCompany.set(process.companyId, list);
  });

  db.companies.forEach((company) => {
    const processes = processByCompany.get(company.id) ?? [];
    const hasCompleted = processes.some((process) => process.stage === "Completed");
    const hasAny = processes.length > 0;
    const hasSms = processes.some((process) => process.track === "SMS");
    const hasVoice = processes.some((process) => process.track === "Voice");
    const scope = new Set(company.workscope);
    if (hasSms && hasVoice) {
      const exact = scope.size === 2 && scope.has("SMS") && scope.has("Voice");
      if (!exact) {
        errors.push(`Workscope mismatch: company ${company.id} has both tracks but workscope is not exactly SMS+Voice.`);
      }
    } else if (hasSms) {
      const exact = scope.size === 1 && scope.has("SMS");
      if (!exact) {
        errors.push(`Workscope mismatch: company ${company.id} has SMS-only process but workscope is not exactly SMS.`);
      }
    } else if (hasVoice) {
      const exact = scope.size === 1 && scope.has("Voice");
      if (!exact) {
        errors.push(`Workscope mismatch: company ${company.id} has Voice-only process but workscope is not exactly Voice.`);
      }
    }
    if (company.companyStatus === "LEAD" && hasAny) {
      errors.push(`Lifecycle mismatch: LEAD company ${company.id} has interconnection processes.`);
    }
    if (company.companyStatus === "INTERCONNECTION" && (!hasAny || hasCompleted)) {
      errors.push(`Lifecycle mismatch: INTERCONNECTION company ${company.id} must have process and no completed stage.`);
    }
    if (company.companyStatus === "CLIENT" && !hasCompleted) {
      errors.push(`Lifecycle mismatch: CLIENT company ${company.id} has no completed process.`);
    }
    if (company.leadDisposition === "Rejected" && company.companyStatus !== "LEAD") {
      errors.push(`Rejected integrity mismatch: company ${company.id} rejected but status is not LEAD.`);
    }
  });

  db.contracts.forEach((contract) => {
    contract.files.forEach((file) => {
      if (!(file.kind === "Draft" || file.kind === "Signed" || file.kind === "Other")) {
        errors.push(`Contract file kind invalid on ${contract.id}: ${String(file.kind)}`);
      }
    });
    if (contract.status === "FullySigned" && !contract.files.some((file) => file.kind === "Signed")) {
      errors.push(`Contract ${contract.id} is FullySigned but has no Signed file.`);
    }
  });

  const enforceHrHierarchy =
    scenario.scenarioId === "SCENARIO_HR_ORG_DEEP" ||
    scenario.scenarioId === "SCENARIO_FULL" ||
    scenario.toggles.forceDeepHrOrg;
  if (enforceHrHierarchy) {
    if (diagnostics.hrOrg.roots > scenario.constraints.hrOrgMaxRoots) {
      errors.push(`HR org roots exceed limit: ${diagnostics.hrOrg.roots} > ${scenario.constraints.hrOrgMaxRoots}.`);
    }
    const minDepth = Math.max(3, scenario.constraints.hrOrgMinLevels - 1);
    if (diagnostics.hrOrg.maxDepth < minDepth) {
      errors.push(`HR org maxDepth too low: ${diagnostics.hrOrg.maxDepth} < ${minDepth}.`);
    }
  }

  if (scenario.constraints.requirePrimaryEventCoverageCheck) {
    const coverage = diagnostics.notesCoverage.primaryEventCoveragePct / 100;
    if (coverage < scenario.constraints.primaryEventNotesCoverageMin) {
      errors.push(
        `Primary event notes coverage too low: ${(coverage * 100).toFixed(2)}% < ${(scenario.constraints.primaryEventNotesCoverageMin * 100).toFixed(2)}%.`,
      );
    }
  }

  if (scenario.toggles.forceEventsHeavyDensity) {
    if (diagnostics.meetings.maxMeetingsInSlot < scenario.constraints.eventsHeavyHotSlotMinMeetings) {
      errors.push(
        `Hot slot density too low: ${diagnostics.meetings.maxMeetingsInSlot} < ${scenario.constraints.eventsHeavyHotSlotMinMeetings}.`,
      );
    }
  }
}

function validateUniqueConstraints(db: DbState, errors: string[]) {
  const companyUnique = uniqueIfPresent(db.companies.map((company) => company.name));
  if (!companyUnique.ok) {
    errors.push(`Duplicate company name detected: "${companyUnique.duplicate}".`);
  }
  const employeeUnique = uniqueIfPresent(db.hrEmployees.map((employee) => employee.email));
  if (!employeeUnique.ok) {
    errors.push(`Duplicate HR employee email detected: "${employeeUnique.duplicate}".`);
  }
  const contactEmailUnique = uniqueIfPresent(db.contacts.map((contact) => contact.email ?? ""));
  if (!contactEmailUnique.ok) {
    errors.push(`Duplicate contact email detected: "${contactEmailUnique.duplicate}".`);
  }
}

export function validateSeedDb(db: DbState, scenario: ScenarioConfig): SeedReport {
  const diagnostics = diagnosticsFromDb(db, scenario);
  const errors: string[] = [];
  validateUniqueConstraints(db, errors);
  validateFkIntegrity(db, errors);
  errors.push(...checkManagerCycles(db));
  validateCoherence(db, scenario, diagnostics, errors);
  return { errors, diagnostics };
}

export function assertSeedDb(db: DbState, scenario: ScenarioConfig): SeedReport {
  const report = validateSeedDb(db, scenario);
  if (report.errors.length > 0) {
    if (isDevEnvironment()) {
      console.error("[seed-v2] validation failed", {
        errors: report.errors,
        diagnostics: report.diagnostics,
      });
    }
    throw new Error(`Seed validation failed (${report.errors.length} issues):\n- ${report.errors.join("\n- ")}`);
  }
  return report;
}

export function logSeedDiagnosticsOnce(report: SeedReport, scenario: ScenarioConfig, seedKey: string) {
  if (!isDevEnvironment() || hasLoggedSeedSummary) return;
  hasLoggedSeedSummary = true;
  console.info("[seed-v2] deterministic summary", {
    seedKey,
    scenario: scenario.scenarioId,
    counts: report.diagnostics.counts,
    hrOrg: report.diagnostics.hrOrg,
    meetings: report.diagnostics.meetings,
    notesCoverage: report.diagnostics.notesCoverage,
    crmPipeline: report.diagnostics.crmPipeline,
    ops: report.diagnostics.ops,
  });
}

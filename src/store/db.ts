import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSeedDb } from "./seed";
import {
  Company,
  CompanyStatus,
  Contract,
  ContractStatus,
  Contact,
  DbState,
  Event,
  EventStaff,
  HrAsset,
  HrAssetAssignment,
  HrAuditLogEntry,
  HrCountryLeaveProfile,
  HrDepartment,
  HrEmployee,
  HrEmployeeCompensation,
  HrExpense,
  HrExpenseActionType,
  HrFxRate,
  HrLeaveActionType,
  HrLeaveRequest,
  HrLegalEntity,
  HrPayrollFilters,
  HrPayrollMonthSnapshot,
  HrProvisionRequest,
  HrSoftwareLicense,
  HrSoftwareProduct,
  HrSoftwareSeat,
  InterconnectionProcess,
  InterconnectionStage,
  InterconnectionTrack,
  Meeting,
  Note,
  OurCompanyInfo,
  OurEntity,
  OpsAuditLogEntry,
  OpsCase,
  OpsCaseActionType,
  OpsMonitoringSignal,
  OpsMonitoringSignalInput,
  OpsRequest,
  OpsRequestActionType,
  OpsShift,
  Project,
  ProjectAiSummary,
  ProjectAttachmentLink,
  ProjectManagerSummary,
  ProjectRoleReport,
  ProjectWeeklyReport,
  Task,
  TaskComment,
  TaskLabel,
} from "./types";
import {
  computePayrollPreview,
  convertCurrency,
  dateRangesOverlap,
  toMonthKey,
  validateSalaryDistribution,
  workingDaysBetween,
} from "./hrUtils";
import {
  actionCompletesSla,
  getCaseActionDefinition,
  isOpsCaseTerminal,
  nextCaseStatusForAction as policyNextCaseStatusForAction,
  normalizeCaseActionType,
  requiresCaseComment as requiresCaseCommentByPolicy,
  requiresTtNumber,
  resolutionTypeForAction,
} from "../features/ops/domain/opsPolicies";
import { inferCaseCategoryFromModule } from "../features/ops/domain/opsCaseTypes";
import { computeSlaDeadline } from "../features/ops/domain/opsSla";

interface DbActions {
  setActiveUser: (userId: string) => void;
  updateUserColor: (userId: string, color: string) => void;
  updateUserDefaultOurEntity: (userId: string, ourEntity: OurEntity) => void;
  createEvent: (payload: Omit<Event, "id">) => void;
  updateEvent: (event: Event) => void;
  deleteEvent: (eventId: string) => void;
  addEventStaff: (payload: Omit<EventStaff, "id">) => void;
  upsertEventStaff: (payload: EventStaff) => void;
  updateEventStaff: (payload: EventStaff) => void;
  deleteEventStaff: (staffId: string) => void;
  createMeeting: (payload: Omit<Meeting, "id">) => void;
  updateMeeting: (meeting: Meeting) => void;
  deleteMeeting: (meetingId: string) => void;
  createCompany: (payload: Omit<Company, "id">) => string;
  updateCompany: (company: Company) => void;
  createContact: (payload: Omit<Contact, "id">) => string;
  updateContact: (contact: Contact) => void;
  createNote: (payload: Omit<Note, "id" | "createdAt" | "reminderTriggered">) => string;
  updateNote: (note: Note) => void;
  deleteNote: (noteId: string) => void;
  createTask: (
    payload: Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt" | "watcherUserIds"> & {
      watcherUserIds?: string[];
      initialComment?: string;
    },
  ) => string;
  addTaskComment: (taskId: string, text: string, kind?: TaskComment["kind"]) => void;
  addTaskLabel: (payload: Omit<TaskLabel, "id">) => string;
  updateTaskLabel: (id: string, patch: { name?: string; color?: string }) => void;
  deleteTaskLabel: (id: string) => void;
  ensureProjectLabel: (projectId: string, projectName: string) => string;
  updateTask: (task: Task) => void;
  createProject: (payload: Omit<Project, "id" | "createdAt" | "updatedAt">) => string;
  updateProject: (project: Project) => void;
  createProjectWeeklyReport: (payload: Omit<ProjectWeeklyReport, "id" | "createdAt" | "updatedAt">) => string;
  updateProjectWeeklyReport: (report: ProjectWeeklyReport) => void;
  generateProjectAiSummary: (projectId: string, weekStartDate: string) => void;
  createContract: (
    payload: Omit<Contract, "id" | "createdAt" | "updatedAt" | "signedAt"> & Partial<Pick<Contract, "signedAt">>,
  ) => string;
  updateContract: (contract: Contract) => void;
  addContractFile: (contractId: string, payload: Omit<Contract["files"][number], "id">) => void;
  requestContractInternalSignature: (contractId: string, internalSignerUserId: string) => void;
  markContractInternallySigned: (contractId: string) => void;
  markContractCounterpartySigned: (contractId: string, counterpartySignerName?: string) => void;
  setContractStatus: (contractId: string, status: ContractStatus) => void;
  updateOurCompanyInfo: (payload: OurCompanyInfo) => void;
  createHrDepartment: (payload: Omit<HrDepartment, "id" | "createdAt" | "updatedAt">) => string;
  updateHrDepartment: (department: HrDepartment) => void;
  deleteHrDepartment: (departmentId: string) => void;
  createHrEmployee: (payload: Omit<HrEmployee, "id" | "createdAt" | "updatedAt">) => string;
  updateHrEmployee: (employee: HrEmployee) => void;
  upsertHrCompensation: (
    payload: Omit<HrEmployeeCompensation, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) => string;
  addHrBonusEntry: (employeeId: string, payload: Omit<HrEmployeeCompensation["bonusEntries"][number], "id" | "employeeId">) => void;
  removeHrBonusEntry: (employeeId: string, bonusId: string) => void;
  upsertHrLegalEntity: (payload: Omit<HrLegalEntity, "createdAt" | "updatedAt">) => void;
  upsertHrFxRate: (payload: Omit<HrFxRate, "id" | "createdAt" | "updatedAt"> & { id?: string }) => string;
  upsertHrLeaveProfile: (
    payload: Omit<HrCountryLeaveProfile, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) => string;
  createHrLeaveRequest: (
    payload: Omit<
      HrLeaveRequest,
      "id" | "status" | "totalDays" | "managerApprovedAt" | "hrApprovedAt" | "rejectedAt" | "rejectionReason" | "createdAt" | "updatedAt"
    >,
  ) => string;
  applyHrLeaveAction: (requestId: string, actionType: HrLeaveActionType, comment?: string) => { ok: boolean; message?: string };
  createHrAsset: (payload: Omit<HrAsset, "id" | "createdAt" | "updatedAt">) => string;
  updateHrAsset: (asset: HrAsset) => void;
  assignHrAsset: (assetId: string, employeeId: string) => void;
  returnHrAsset: (assetId: string) => void;
  retireHrAsset: (assetId: string) => void;
  markHrAssetAcceptance: (assetId: string, accepted: boolean) => void;
  createHrSoftwareLicense: (payload: Omit<HrSoftwareLicense, "id" | "createdAt" | "updatedAt">) => string;
  updateHrSoftwareLicense: (license: HrSoftwareLicense) => void;
  createHrSoftwareProduct: (payload: Omit<HrSoftwareProduct, "id" | "createdAt" | "updatedAt">) => string;
  updateHrSoftwareProduct: (product: HrSoftwareProduct) => void;
  createHrSoftwareSeat: (payload: Omit<HrSoftwareSeat, "id" | "createdAt" | "updatedAt">) => string;
  updateHrSoftwareSeat: (seat: HrSoftwareSeat) => void;
  assignHrSoftwareSeat: (
    seatId: string,
    payload: { employeeId: string; assignedToEmail: string; requestId?: string; notes?: string },
  ) => { ok: boolean; message?: string };
  revokeHrSoftwareSeat: (seatId: string, note?: string) => { ok: boolean; message?: string };
  createHrProvisionRequest: (
    payload: Omit<
      HrProvisionRequest,
      | "id"
      | "status"
      | "managerApproverUserId"
      | "hrApproverUserId"
      | "managerApprovedAt"
      | "hrApprovedAt"
      | "fulfilledAt"
      | "rejectionReason"
      | "cancellationReason"
      | "linkedAssetAssignmentId"
      | "linkedSoftwareSeatId"
      | "createdAt"
      | "updatedAt"
    >,
  ) => string;
  approveHrProvisionByManager: (requestId: string, comment?: string) => { ok: boolean; message?: string };
  rejectHrProvisionByManager: (requestId: string, comment: string) => { ok: boolean; message?: string };
  approveHrProvisionByHr: (requestId: string, comment?: string) => { ok: boolean; message?: string };
  rejectHrProvisionByHr: (requestId: string, comment: string) => { ok: boolean; message?: string };
  cancelHrProvisionRequest: (requestId: string, comment?: string) => { ok: boolean; message?: string };
  fulfillHrProvisionRequest: (
    requestId: string,
    payload: { assetId?: string; softwareSeatId?: string; assignedToEmail?: string; note?: string },
  ) => { ok: boolean; message?: string };
  setHrAssetAssignmentAcceptance: (assignmentId: string, accepted: boolean) => { ok: boolean; message?: string };
  createHrExpense: (
    payload: Omit<
      HrExpense,
      | "id"
      | "convertedAmountEUR"
      | "status"
      | "managerApprovedAt"
      | "financeApprovedAt"
      | "paidAt"
      | "rejectedAt"
      | "cancelledAt"
      | "reconciledAt"
      | "reconciledWithClaimIds"
      | "createdAt"
      | "updatedAt"
    >,
  ) => { ok: boolean; id?: string; message?: string };
  updateHrExpenseDraft: (
    expenseId: string,
    payload: Omit<
      HrExpense,
      | "id"
      | "employeeId"
      | "convertedAmountEUR"
      | "status"
      | "managerApprovedAt"
      | "financeApprovedAt"
      | "paidAt"
      | "rejectedAt"
      | "cancelledAt"
      | "reconciledAt"
      | "reconciledWithClaimIds"
      | "createdAt"
      | "updatedAt"
    >,
  ) => { ok: boolean; message?: string };
  cancelHrExpense: (expenseId: string, comment?: string) => { ok: boolean; message?: string };
  addHrExpenseComment: (expenseId: string, comment: string) => { ok: boolean; message?: string };
  applyHrExpenseAction: (expenseId: string, actionType: HrExpenseActionType, comment?: string) => { ok: boolean; message?: string };
  generateHrPayrollSnapshot: (payload: { month: string; filters?: HrPayrollFilters; notes?: string }) => string;
  startInterconnectionProcess: (companyId: string, track: InterconnectionTrack) => void;
  setInterconnectionStage: (processId: string, stage: InterconnectionStage) => void;
  createOpsRequest: (payload: Omit<OpsRequest, "id" | "createdAt" | "updatedAt"> & Partial<Pick<OpsRequest, "status">>) => string;
  updateOpsRequest: (request: OpsRequest) => void;
  applyOpsRequestAction: (
    requestId: string,
    actionType: OpsRequestActionType,
    options?: { comment?: string; doneByUserId?: string },
  ) => { ok: boolean; message?: string };
  createOpsCase: (payload: Omit<OpsCase, "id" | "createdAt" | "updatedAt">) => string;
  updateOpsCase: (opsCase: OpsCase) => void;
  applyOpsCaseAction: (
    caseId: string,
    actionType: OpsCaseActionType,
    options?: {
      comment?: string;
      ttNumber?: string;
      assignedToUserId?: string;
      resolutionType?: OpsCase["resolutionType"];
      doneByUserId?: string;
    },
  ) => { ok: boolean; message?: string };
  createOpsMonitoringSignal: (payload: OpsMonitoringSignalInput) => string;
  ingestOpsMonitoringSignals: (signals: OpsMonitoringSignalInput[], options?: { autoCreate?: boolean }) => number;
  createOpsShift: (payload: Omit<OpsShift, "id" | "createdAt" | "updatedAt">) => string;
  updateOpsShift: (shift: OpsShift) => void;
  deleteOpsShift: (shiftId: string) => void;
  resetDemoData: () => void;
  exportData: () => string;
  importData: (raw: string) => { ok: boolean; message: string };
  processReminders: () => void;
  convertNoteToTask: (noteId: string, assigneeUserId: string) => void;
}

export type AppStore = DbState & DbActions;
const STORAGE_KEY = "event-crm-prototype-db-v1";

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function validateImportShape(data: unknown): data is DbState {
  if (!data || typeof data !== "object") {
    return false;
  }
  const input = data as Partial<DbState>;
  return Array.isArray(input.users) && Array.isArray(input.companies) && Array.isArray(input.events);
}

function mapLegacyTrack(value: unknown): InterconnectionTrack {
  if (value === "Voice" || value === "VOICE") return "Voice";
  return "SMS";
}

function mapLegacyStage(value: unknown): InterconnectionStage {
  switch (value) {
    case "NDA":
    case "NDA Waiting":
    case "NDA Signed":
      return "NDA";
    case "Contract":
    case "Contract Waiting":
    case "Contract Signed":
      return "Contract";
    case "AM_Assigned":
    case "AM Assignment":
      return "AM_Assigned";
    case "Completed":
      return "Completed";
    case "Failed":
      return "Failed";
    case "Technical":
    case "Technical Interconnection":
    case "Head Approval":
    case "Data Completion":
    default:
      return "Technical";
  }
}

function mapLegacyLeadDisposition(value: unknown): Company["leadDisposition"] {
  if (value === "Rejected") return "Rejected";
  if (value === "OnHold") return "OnHold";
  return "Open";
}

function normalizeOurEntity(value: unknown): OurEntity | undefined {
  if (value === "USA" || value === "UK" || value === "TR") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "US" || normalized === "USA") return "USA";
  if (normalized === "TR" || normalized === "TURKEY") return "TR";
  if (normalized === "GB" || normalized === "UK" || normalized === "UNITED KINGDOM") return "UK";
  return undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toOptionalDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function toOptionalDateTime(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const raw = value.trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function sanitizeNonNegative(value: unknown): number | undefined {
  const parsed = toOptionalNumber(value);
  if (parsed === undefined || parsed < 0) return undefined;
  return parsed;
}

function normalizeHrEmploymentType(value: unknown): HrEmployee["employmentType"] {
  if (value === "Full-time" || value === "Part-time" || value === "Contractor") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "full-time" || normalized === "full time" || normalized === "fulltime") return "Full-time";
    if (normalized === "part-time" || normalized === "part time" || normalized === "parttime") return "Part-time";
    if (normalized === "contractor" || normalized === "freelancer") return "Contractor";
  }
  return "Full-time";
}

function normalizeHrGender(value: unknown): HrEmployee["gender"] {
  if (value === "Male" || value === "Female" || value === "Other" || value === "PreferNotToSay") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "male" || normalized === "m") return "Male";
    if (normalized === "female" || normalized === "f") return "Female";
    if (normalized === "other") return "Other";
    if (normalized === "prefernottosay" || normalized === "prefer_not_to_say" || normalized === "prefer not to say") {
      return "PreferNotToSay";
    }
  }
  return undefined;
}

function normalizeHrMaritalStatus(value: unknown): HrEmployee["maritalStatus"] {
  if (value === "Single" || value === "Married" || value === "Other") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "single") return "Single";
    if (normalized === "married") return "Married";
    if (normalized === "other") return "Other";
  }
  return undefined;
}

function inferHrLegalEntity(countryOfEmployment: string | undefined): OurEntity {
  if (!countryOfEmployment) return "UK";
  const value = countryOfEmployment.trim().toLowerCase();
  if (value.includes("turkey") || value === "tr") return "TR";
  if (value.includes("united states") || value.includes("usa") || value === "us") return "USA";
  return "UK";
}

function normalizeHrEmployeeRecord(
  row: Record<string, unknown>,
  idx: number,
  fallbackDepartmentId: string,
): HrEmployee {
  const fallbackId = `hre-migrated-${idx + 1}`;
  const id = asNonEmptyString(row.id) ?? fallbackId;
  const firstName = asNonEmptyString(row.firstName) ?? "Employee";
  const lastName = asNonEmptyString(row.lastName) ?? String(idx + 1);
  const displayName = asNonEmptyString(row.displayName) ?? `${firstName} ${lastName}`.trim();
  const createdAt = toOptionalDateTime(row.createdAt) ?? new Date().toISOString();
  const updatedAt = toOptionalDateTime(row.updatedAt) ?? createdAt;

  const statusRaw = typeof row.status === "string" ? row.status : typeof row.Status === "string" ? row.Status : undefined;
  const active =
    typeof row.active === "boolean"
      ? row.active
      : statusRaw
        ? statusRaw.trim().toLowerCase() !== "inactive"
        : true;

  const startDate = toOptionalDate(row.startDate) ?? toOptionalDate(row.employmentStartDate) ?? createdAt.slice(0, 10);
  const endDate = toOptionalDate(row.endDate) ?? toOptionalDate(row.terminationDate);
  const managerRaw = asNonEmptyString(row.managerId);
  const managerId = managerRaw && managerRaw !== id ? managerRaw : undefined;
  const departmentId = asNonEmptyString(row.departmentId) ?? fallbackDepartmentId;
  const countryOfEmployment = asNonEmptyString(row.countryOfEmployment) ?? asNonEmptyString(row.country) ?? "United Kingdom";
  const legalEntityId =
    normalizeOurEntity(row.legalEntityId ?? row.ourEntity) ??
    normalizeOurEntity(row.legalEntity) ??
    inferHrLegalEntity(countryOfEmployment);
  const numberOfChildren = sanitizeNonNegative(row.numberOfChildren);

  const normalizedEndDate = endDate && endDate >= startDate ? endDate : undefined;

  return {
    id,
    firstName,
    lastName,
    displayName,
    active,
    employmentType: normalizeHrEmploymentType(row.employmentType),
    startDate,
    endDate: normalizedEndDate,
    seniorityYears: sanitizeNonNegative(row.seniorityYears),
    managerId,
    departmentId,
    division: asNonEmptyString(row.division),
    position: asNonEmptyString(row.position),
    jobTitle: asNonEmptyString(row.jobTitle) ?? asNonEmptyString(row.title),
    gradeLevel: asNonEmptyString(row.gradeLevel),
    workLocation: asNonEmptyString(row.workLocation),
    countryOfEmployment,
    legalEntityId,
    company: asNonEmptyString(row.company),
    citizenshipIdNumber: asNonEmptyString(row.citizenshipIdNumber),
    email: asNonEmptyString(row.email) ?? `employee${idx + 1}@devotel.com`,
    phone: asNonEmptyString(row.phone) ?? "",
    address: asNonEmptyString(row.address),
    emergencyContactName: asNonEmptyString(row.emergencyContactName),
    emergencyContactPhone: asNonEmptyString(row.emergencyContactPhone),
    nationality: asNonEmptyString(row.nationality),
    gender: normalizeHrGender(row.gender),
    birthDate: toOptionalDate(row.birthDate),
    maritalStatus: normalizeHrMaritalStatus(row.maritalStatus),
    numberOfChildren,
    university: asNonEmptyString(row.university),
    universityDepartment: asNonEmptyString(row.universityDepartment),
    degree: asNonEmptyString(row.degree),
    salaryTry: sanitizeNonNegative(row.salaryTry),
    salaryEur: sanitizeNonNegative(row.salaryEur),
    salaryGbp: sanitizeNonNegative(row.salaryGbp),
    salaryUsd: sanitizeNonNegative(row.salaryUsd),
    totalSalaryUsdEq: sanitizeNonNegative(row.totalSalaryUsdEq),
    bankName: asNonEmptyString(row.bankName) ?? asNonEmptyString(row.bank),
    ibanOrTrc20: asNonEmptyString(row.ibanOrTrc20) ?? asNonEmptyString(row.iban),
    employeeFolderUrl: asNonEmptyString(row.employeeFolderUrl) ?? asNonEmptyString(row.employeeFolder),
    masterContractSignedAt: toOptionalDateTime(row.masterContractSignedAt),
    createdAt,
    updatedAt,
    systemUserId: asNonEmptyString(row.systemUserId),
  };
}

function inferOurEntity(company: Record<string, unknown>): OurEntity {
  const explicit = normalizeOurEntity(company.ourEntity);
  if (explicit) return explicit;
  const currency = typeof company.currency === "string" ? company.currency.toUpperCase() : "";
  if (currency === "TRY") return "TR";
  if (currency === "USD") return "USA";
  const region = typeof company.region === "string" ? company.region.toLowerCase() : "";
  if (region.includes("turkey") || region.includes("istanbul") || region === "tr") return "TR";
  if (region.includes("usa") || region.includes("america")) return "USA";
  return "UK";
}

function mapLegacyContractStatus(value: unknown): ContractStatus {
  switch (value) {
    case "InternalSignatureRequested":
      return "InternalSignatureRequested";
    case "CounterpartySignatureRequested":
      return "CounterpartySignatureRequested";
    case "FullySigned":
    case "Completed":
      return "FullySigned";
    case "Rejected":
    case "Failed":
      return "Rejected";
    case "Expired":
      return "Expired";
    default:
      return "Draft";
  }
}

function mapLegacyTaskStatus(value: unknown): Task["status"] {
  if (value === "Done") return "Done";
  if (value === "InProgress" || value === "Doing") return "InProgress";
  return "Open";
}

function mapLegacyTaskPriority(value: unknown): Task["priority"] {
  if (value === "Critical") return "Critical";
  if (value === "High") return "High";
  if (value === "Low") return "Low";
  return "Medium";
}

function mapLegacyProjectStatus(value: unknown): Project["status"] {
  if (value === "Active") return "InProgress";
  if (value === "Paused") return "Paused";
  if (value === "Completed") return "Completed";
  return "InProgress";
}

function toProjectTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function toProjectAttachmentLinks(value: unknown): ProjectAttachmentLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, idx) => {
      if (typeof entry === "string") {
        return { label: `Attachment ${idx + 1}`, url: entry };
      }
      if (!entry || typeof entry !== "object") return undefined;
      const raw = entry as Record<string, unknown>;
      const url = typeof raw.url === "string" ? raw.url.trim() : "";
      if (!url) return undefined;
      return {
        label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : `Attachment ${idx + 1}`,
        url,
      };
    })
    .filter((entry): entry is ProjectAttachmentLink => Boolean(entry));
}

function normalizeProjectRoleReport(raw: unknown, fallbackUserId: string): ProjectRoleReport | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const entry = raw as Record<string, unknown>;
  const authorUserId =
    typeof entry.authorUserId === "string"
      ? entry.authorUserId
      : typeof entry.submittedByUserId === "string"
        ? entry.submittedByUserId
        : fallbackUserId;
  const updatedAt = typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString();
  return {
    authorUserId,
    achievements: toProjectTextList(entry.achievements),
    inProgress: toProjectTextList(entry.inProgress),
    blockers: toProjectTextList(entry.blockers),
    decisionsRequired: toProjectTextList(entry.decisionsRequired),
    nextWeekFocus: toProjectTextList(entry.nextWeekFocus),
    attachments: toProjectAttachmentLinks(entry.attachments),
    submittedAt: typeof entry.submittedAt === "string" ? entry.submittedAt : undefined,
    updatedAt,
  };
}

function normalizeProjectManagerSummary(raw: unknown, fallbackUserId: string): ProjectManagerSummary | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const entry = raw as Record<string, unknown>;
  const executiveSummaryText =
    typeof entry.executiveSummaryText === "string"
      ? entry.executiveSummaryText
      : typeof entry.text === "string"
        ? entry.text
        : "";
  const riskLevel = entry.riskLevel === "Low" || entry.riskLevel === "High" ? entry.riskLevel : "Medium";
  const updatedAt = typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString();
  return {
    authorUserId:
      typeof entry.authorUserId === "string"
        ? entry.authorUserId
        : typeof entry.submittedByUserId === "string"
          ? entry.submittedByUserId
          : fallbackUserId,
    executiveSummaryText: executiveSummaryText.trim(),
    riskLevel,
    blockers: toProjectTextList(entry.blockers),
    decisionsRequired: toProjectTextList(entry.decisionsRequired),
    deckLinks: toProjectAttachmentLinks(entry.deckLinks ?? entry.attachments),
    submittedAt: typeof entry.submittedAt === "string" ? entry.submittedAt : undefined,
    updatedAt,
  };
}

function createProjectAiSummary(report: ProjectWeeklyReport, generatedByUserId: string, generatedAt: string): ProjectAiSummary {
  const technical = report.roleReports.technical;
  const sales = report.roleReports.sales;
  const product = report.roleReports.product;
  const manager = report.managerSummary;
  const missingRoles: ProjectAiSummary["missingRoles"] = [];
  if (!technical?.submittedAt) missingRoles.push("technical");
  if (!sales?.submittedAt) missingRoles.push("sales");
  if (!product?.submittedAt) missingRoles.push("product");
  if (!manager?.submittedAt) missingRoles.push("manager");

  const concatLines = (...groups: Array<string[] | undefined>): string[] =>
    Array.from(new Set(groups.flatMap((group) => group ?? []).map((line) => line.trim()).filter(Boolean)));

  const keyBlockers = concatLines(technical?.blockers, sales?.blockers, product?.blockers, manager?.blockers).slice(0, 6);
  const decisionsRequired = concatLines(
    technical?.decisionsRequired,
    sales?.decisionsRequired,
    product?.decisionsRequired,
    manager?.decisionsRequired,
  ).slice(0, 6);

  const coreSummaryLine =
    manager?.executiveSummaryText ||
    technical?.inProgress[0] ||
    sales?.inProgress[0] ||
    product?.inProgress[0] ||
    technical?.achievements[0] ||
    sales?.achievements[0] ||
    product?.achievements[0] ||
    report.legacyCombinedReport?.inProgress[0] ||
    report.legacyCombinedReport?.achievements[0] ||
    "No submitted updates yet.";

  const missingSentence =
    missingRoles.length > 0
      ? `Missing updates: ${missingRoles
          .map((role) => {
            if (role === "technical") return "Technical";
            if (role === "sales") return "Sales";
            if (role === "product") return "Product";
            return "Manager";
          })
          .join(", ")}.`
      : "All required sections submitted.";

  const shortText = `${coreSummaryLine} ${missingSentence}`.trim().slice(0, 220);
  const riskText = manager?.riskLevel ? `Risk: ${manager.riskLevel}.` : "Risk: Medium (default).";
  const blockerText = keyBlockers.length > 0 ? `Key blockers: ${keyBlockers.join(" | ")}.` : "Key blockers: None.";
  const decisionsText =
    decisionsRequired.length > 0 ? `Decisions required: ${decisionsRequired.join(" | ")}.` : "Decisions required: None.";

  return {
    shortText,
    fullText: [coreSummaryLine, riskText, blockerText, decisionsText, missingSentence].join("\n"),
    keyRisks: [riskText],
    keyBlockers,
    decisionsRequired,
    missingRoles,
    generatedAt,
    generatedByUserId,
    coverage: {
      technicalSubmittedAt: technical?.submittedAt,
      salesSubmittedAt: sales?.submittedAt,
      productSubmittedAt: product?.submittedAt,
      managerSubmittedAt: manager?.submittedAt,
    },
  };
}

function hasSignedContract(
  contracts: Contract[],
  processId: string,
  contractType: "NDA" | "ServiceAgreement",
): boolean {
  return contracts.some(
    (contract) =>
      contract.interconnectionProcessId === processId &&
      contract.contractType === contractType &&
      contract.status === "FullySigned",
  );
}

function getStageRequirements(
  stage: InterconnectionStage,
  company: Company,
  processId: string,
  contracts: Contract[],
): string[] {
  const missing: string[] = [];
  if (stage === "Contract" || stage === "Technical" || stage === "AM_Assigned" || stage === "Completed") {
    if (!hasSignedContract(contracts, processId, "NDA")) {
      missing.push("NDA fully signed");
    }
  }
  if (stage === "Technical" || stage === "AM_Assigned" || stage === "Completed") {
    if (!hasSignedContract(contracts, processId, "ServiceAgreement")) {
      missing.push("Service Agreement fully signed");
    }
  }
  if (stage === "Completed") {
    if (!company.internalAmUserId && !company.ownerUserId) {
      missing.push("Internal AM assigned");
    }
    if (!company.counterpartyAmName?.trim()) {
      missing.push("Counterparty AM name");
    }
  }
  return missing;
}

function isOpsRequestTerminal(status: OpsRequest["status"]): boolean {
  return status === "Done" || status === "Cancelled" || status === "Failed";
}

function requestDoneActionForType(requestType: OpsRequest["requestType"]): OpsRequestActionType {
  if (requestType === "TroubleTicketRequest") return "TT_SENT";
  if (requestType === "TestRequest") return "TEST_DONE";
  if (requestType === "LossAccepted") return "LOSS_ACCEPTED";
  return "ROUTING_DONE";
}

function nextRequestStatusForAction(
  currentStatus: OpsRequest["status"],
  actionType: OpsRequestActionType,
): OpsRequest["status"] | undefined {
  if (actionType === "SEND") return currentStatus === "Draft" ? "Sent" : undefined;
  if (actionType === "START") return currentStatus === "Sent" ? "InProgress" : undefined;
  if (actionType === "MARK_FAILED") return currentStatus === "Sent" || currentStatus === "InProgress" ? "Failed" : undefined;
  if (actionType === "CANCELLED") return isOpsRequestTerminal(currentStatus) ? undefined : "Cancelled";
  if (actionType === "ROUTING_DONE" || actionType === "TT_SENT" || actionType === "TEST_DONE" || actionType === "LOSS_ACCEPTED") {
    return currentStatus === "Sent" || currentStatus === "InProgress" ? "Done" : undefined;
  }
  return undefined;
}

function requiresRequestComment(actionType: OpsRequestActionType): boolean {
  return actionType === "CANCELLED";
}

function buildOpsSlaProfileId(category: OpsCase["category"]): OpsCase["slaProfileId"] {
  if (category === "LOSSES") return "LOSS";
  if (category === "SCHEDULE_TEST_RESULT") return "TEST";
  if (category === "FAILED_SMS_CALL") return "KPI";
  return "DEFAULT";
}

function mapOpsTrack(value: unknown): OpsCase["track"] {
  if (value === "VOICE" || value === "Voice") return "VOICE";
  return "SMS";
}

function mapOpsSeverity(value: unknown): OpsCase["severity"] {
  if (value === "URGENT" || value === "Urgent") return "URGENT";
  if (value === "HIGH" || value === "High") return "HIGH";
  return "MEDIUM";
}

function mapOpsModuleOrigin(value: unknown): OpsCase["moduleOrigin"] {
  if (value === "PROVIDER_ISSUES" || value === "ProviderIssues") return "PROVIDER_ISSUES";
  if (value === "LOSSES" || value === "Losses") return "LOSSES";
  if (value === "NEW_AND_LOST_TRAFFICS" || value === "NewAndLostTraffics") return "NEW_AND_LOST_TRAFFICS";
  if (value === "TRAFFIC_COMPARISON" || value === "TrafficComparison") return "TRAFFIC_COMPARISON";
  if (value === "SCHEDULE_TEST_RESULTS" || value === "ScheduleTestResults") return "SCHEDULE_TEST_RESULTS";
  return "FAILED_SMS_OR_CALL_ANALYSIS";
}

function mapOpsCategory(value: unknown, moduleOrigin: OpsCase["moduleOrigin"]): OpsCase["category"] {
  if (value === "PROVIDER_ISSUE" || value === "Provider") return "PROVIDER_ISSUE";
  if (value === "LOSSES" || value === "Loss") return "LOSSES";
  if (value === "NEW_LOST_TRAFFIC" || value === "Traffic") {
    return moduleOrigin === "TRAFFIC_COMPARISON" ? "TRAFFIC_COMPARISON" : "NEW_LOST_TRAFFIC";
  }
  if (value === "TRAFFIC_COMPARISON") return "TRAFFIC_COMPARISON";
  if (value === "SCHEDULE_TEST_RESULT" || value === "Test") return "SCHEDULE_TEST_RESULT";
  if (value === "FAILED_SMS_CALL" || value === "KPI") return "FAILED_SMS_CALL";
  return inferCaseCategoryFromModule(moduleOrigin);
}

function mapOpsCaseStatus(value: unknown): OpsCase["status"] {
  if (value === "NEW" || value === "New") return "NEW";
  if (value === "IN_PROGRESS" || value === "InProgress") return "IN_PROGRESS";
  if (value === "RESOLVED" || value === "Resolved") return "RESOLVED";
  if (value === "IGNORED" || value === "Ignored") return "IGNORED";
  if (value === "CANCELLED" || value === "Cancelled") return "CANCELLED";
  return "NEW";
}

function mapOpsResolutionType(value: unknown): OpsCase["resolutionType"] {
  if (
    value === "NO_ISSUE" ||
    value === "ROUTING_CHANGED" ||
    value === "ACCOUNT_MANAGER_INFORMED" ||
    value === "ROUTING_INFORMED" ||
    value === "TT_RAISED" ||
    value === "IGNORED" ||
    value === "FIXED" ||
    value === "FALSE_POSITIVE" ||
    value === "PARTNER_ISSUE" ||
    value === "PLANNED_WORK" ||
    value === "UNKNOWN"
  ) {
    return value;
  }
  if (value === "Fixed") return "FIXED";
  if (value === "FalsePositive") return "FALSE_POSITIVE";
  if (value === "PartnerIssue") return "PARTNER_ISSUE";
  if (value === "PlannedWork") return "PLANNED_WORK";
  if (value === "Unknown") return "UNKNOWN";
  return undefined;
}

function mapOpsAuditActionType(parentType: OpsAuditLogEntry["parentType"], value: unknown): OpsAuditLogEntry["actionType"] {
  if (typeof value !== "string") {
    return parentType === "Case" ? "COMMENT" : "SEND";
  }
  if (parentType === "Case") {
    if (value === "IGNORE") return "IGNORED";
    if (value === "RESOLVE") return "CHECKED_NO_ISSUE";
    return value as OpsAuditLogEntry["actionType"];
  }
  return value as OpsAuditLogEntry["actionType"];
}

function buildFallbackOpsMetadata(
  category: OpsCase["category"],
  detectedAt: string,
  relatedProvider?: string,
  relatedDestination?: string,
): OpsCase["metadata"] {
  if (category === "PROVIDER_ISSUE") {
    return {
      providerName: relatedProvider ?? "Unknown provider",
      smsCount: 0,
      callCount: 0,
      dlrValue: 0,
      asrValue: 0,
      alertTime: detectedAt,
    };
  }
  if (category === "LOSSES") {
    return {
      customerName: "Unknown customer",
      destination: relatedDestination ?? "Unknown destination",
      lossAmount: 0,
      alertTime: detectedAt,
    };
  }
  if (category === "NEW_LOST_TRAFFIC") {
    return {
      customerName: "Unknown customer",
      destination: relatedDestination ?? "Unknown destination",
      attemptCount: 0,
      alertTime: detectedAt,
    };
  }
  if (category === "TRAFFIC_COMPARISON") {
    return {
      comparisonType: "DECREASE",
      comparisonPercentage: 0,
      alertTime: detectedAt,
    };
  }
  if (category === "SCHEDULE_TEST_RESULT") {
    return {
      providerName: relatedProvider ?? "Unknown provider",
      destination: relatedDestination ?? "Unknown destination",
      testResult: "UNKNOWN",
      testToolName: "TELQ",
      alertTime: detectedAt,
    };
  }
  return {
    customerName: "Unknown customer",
    destination: relatedDestination ?? "Unknown destination",
    attemptCount: 0,
    alertTime: detectedAt,
  };
}

function mapCompanyAddress(company: Record<string, unknown>): Company["address"] {
  const rawAddress =
    company.address && typeof company.address === "object" ? (company.address as Record<string, unknown>) : undefined;
  const street =
    typeof rawAddress?.street === "string"
      ? rawAddress.street
      : typeof company.street === "string"
        ? company.street
        : undefined;
  const city =
    typeof rawAddress?.city === "string"
      ? rawAddress.city
      : typeof company.city === "string"
        ? company.city
        : undefined;
  const state =
    typeof rawAddress?.state === "string"
      ? rawAddress.state
      : typeof company.state === "string"
        ? company.state
        : undefined;
  const zip =
    typeof rawAddress?.zip === "string" ? rawAddress.zip : typeof company.zip === "string" ? company.zip : undefined;
  const country =
    typeof rawAddress?.country === "string"
      ? rawAddress.country
      : typeof company.country === "string"
        ? company.country
        : undefined;
  if (!street && !city && !state && !zip && !country) {
    return undefined;
  }
  return { street, city, state, zip, country };
}

function mapPrimaryContactIds(company: Record<string, unknown>): Company["primaryContactIds"] {
  if (!company.primaryContactIds || typeof company.primaryContactIds !== "object") {
    return undefined;
  }
  const raw = company.primaryContactIds as Record<string, unknown>;
  const commercial = typeof raw.commercial === "string" ? raw.commercial : undefined;
  const technical = typeof raw.technical === "string" ? raw.technical : undefined;
  const finance = typeof raw.finance === "string" ? raw.finance : undefined;
  if (!commercial && !technical && !finance) {
    return undefined;
  }
  return { commercial, technical, finance };
}

function mapContactRoleTags(value: unknown): Contact["roleTags"] {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value.filter((item): item is "Commercial" | "Technical" | "Finance" =>
    item === "Commercial" || item === "Technical" || item === "Finance",
  );
  return normalized.length ? Array.from(new Set(normalized)) : undefined;
}

function mapLegacyEvaluation(company: Partial<Company> & { leadEvaluation?: unknown }): Company["evaluation"] {
  if (company.evaluation) {
    return company.evaluation;
  }
  const legacy = company.leadEvaluation as
    | {
        technical?: { testResult?: "Pass" | "Fail" | "Pending"; technicalRiskLevel?: "Low" | "Medium" | "High" };
        commercial?: { commercialRiskLevel?: "Low" | "Medium" | "High"; fraudRiskLevel?: "Low" | "Medium" | "High" };
        nextAction?: string;
        updatedAt?: string;
      }
    | undefined;
  if (!legacy) return undefined;
  const technicalFit =
    legacy.technical?.testResult === "Pass" ? "Pass" : legacy.technical?.testResult === "Fail" ? "Fail" : "Unknown";
  const commercialFit =
    legacy.commercial?.commercialRiskLevel === "High" || legacy.commercial?.fraudRiskLevel === "High"
      ? "Risk"
      : legacy.commercial?.commercialRiskLevel === "Medium"
        ? "Medium"
        : legacy.commercial?.commercialRiskLevel === "Low"
          ? "Low"
          : "Unknown";
  const riskLevel =
    legacy.technical?.technicalRiskLevel === "High" ||
    legacy.commercial?.commercialRiskLevel === "High" ||
    legacy.commercial?.fraudRiskLevel === "High"
      ? "High"
      : legacy.technical?.technicalRiskLevel === "Medium" || legacy.commercial?.commercialRiskLevel === "Medium"
        ? "Medium"
        : legacy.technical?.technicalRiskLevel === "Low" || legacy.commercial?.commercialRiskLevel === "Low"
          ? "Low"
          : "Unknown";
  return {
    technicalFit,
    commercialFit,
    riskLevel,
    nextAction: legacy.nextAction,
    evaluationUpdatedAt: legacy.updatedAt,
  };
}

function appendHrAudit(
  state: AppStore,
  payload: Omit<HrAuditLogEntry, "id" | "performedByUserId" | "timestamp"> & {
    performedByUserId?: string;
    timestamp?: string;
  },
): HrAuditLogEntry[] {
  return [
    ...state.hrAuditLogs,
    {
      id: uid("hra"),
      parentType: payload.parentType,
      parentId: payload.parentId,
      actionType: payload.actionType,
      comment: payload.comment,
      performedByUserId: payload.performedByUserId ?? state.activeUserId,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    },
  ];
}

function requiresLeaveComment(actionType: HrLeaveActionType): boolean {
  return actionType === "MANAGER_REJECT" || actionType === "HR_REJECT";
}

function normalizePayrollMonth(value: string): string {
  const v = value.trim();
  if (/^\d{4}-\d{2}$/.test(v)) return v;
  const normalized = toMonthKey(v);
  return normalized || new Date().toISOString().slice(0, 7);
}

function createStoreSlice(set: (fn: (state: AppStore) => AppStore) => void, get: () => AppStore): AppStore {
  return {
    ...createSeedDb(),
    setActiveUser: (userId) =>
      set((state) => ({
        ...state,
        activeUserId: userId,
      })),
    updateUserColor: (userId, color) =>
      set((state) => ({
        ...state,
        users: state.users.map((user) => (user.id === userId ? { ...user, color } : user)),
      })),
    updateUserDefaultOurEntity: (userId, ourEntity) =>
      set((state) => ({
        ...state,
        users: state.users.map((user) => (user.id === userId ? { ...user, defaultOurEntity: ourEntity } : user)),
      })),
    createEvent: (payload) =>
      set((state) => ({
        ...state,
        events: [...state.events, { ...payload, id: uid("e") }],
      })),
    updateEvent: (event) =>
      set((state) => ({
        ...state,
        events: state.events.map((row) => (row.id === event.id ? event : row)),
      })),
    deleteEvent: (eventId) =>
      set((state) => ({
        ...state,
        events: state.events.filter((event) => event.id !== eventId),
        meetings: state.meetings.filter((meeting) => meeting.eventId !== eventId),
        eventStaff: state.eventStaff.filter((row) => row.eventId !== eventId),
        notes: state.notes.filter((note) => note.relatedEventId !== eventId),
      })),
    addEventStaff: (payload) =>
      set((state) => ({
        ...state,
        eventStaff: [...state.eventStaff, { ...payload, id: uid("es") }],
      })),
    upsertEventStaff: (payload) =>
      set((state) => ({
        ...state,
        eventStaff: state.eventStaff.some((x) => x.id === payload.id)
          ? state.eventStaff.map((row) => (row.id === payload.id ? payload : row))
          : [...state.eventStaff, payload],
      })),
    updateEventStaff: (payload) =>
      set((state) => ({
        ...state,
        eventStaff: state.eventStaff.map((row) => (row.id === payload.id ? payload : row)),
      })),
    deleteEventStaff: (staffId) =>
      set((state) => ({
        ...state,
        eventStaff: state.eventStaff.filter((x) => x.id !== staffId),
      })),
    createMeeting: (payload) =>
      set((state) => {
        let contacts = [...state.contacts];
        const meetingId = uid("m");
        const contact = contacts.find((c) => c.id === payload.contactId);
        if (contact && !contact.companyId) {
          contacts = contacts.map((c) =>
            c.id === payload.contactId
              ? {
                  ...c,
                  companyId: payload.companyId,
                }
              : c,
          );
        }

        const notes = [...state.notes];
        if (payload.description?.trim()) {
          notes.push({
            id: uid("n"),
            companyId: payload.companyId,
            createdByUserId: state.activeUserId,
            text: payload.description,
            createdAt: new Date().toISOString(),
            relatedEventId: payload.eventId,
            relatedMeetingId: meetingId,
            relatedContactId: payload.contactId,
            reminderTriggered: false,
          });
        }

        return {
          ...state,
          contacts,
          notes,
          meetings: [
            ...state.meetings,
            {
              ...payload,
              id: meetingId,
              status: payload.status ?? "Scheduled",
            },
          ],
        };
      }),
    updateMeeting: (meeting) =>
      set((state) => ({
        ...state,
        meetings: state.meetings.map((row) => (row.id === meeting.id ? meeting : row)),
      })),
    deleteMeeting: (meetingId) =>
      set((state) => ({
        ...state,
        meetings: state.meetings.filter((meeting) => meeting.id !== meetingId),
        notes: state.notes.filter((note) => note.relatedMeetingId !== meetingId),
      })),
    createCompany: (payload) => {
      const id = uid("c");
      const createdAt = payload.createdAt ?? new Date().toISOString();
      const createdFrom = payload.createdFrom ?? (payload.createdFromEventId ? "Event" : "Manual");
      const watcherUserIds = Array.from(new Set([...(payload.watcherUserIds ?? []), payload.ownerUserId].filter(Boolean)));
      const activeUserDefaultEntity =
        get().users.find((user) => user.id === get().activeUserId)?.defaultOurEntity ?? "UK";
      const ourEntity = payload.ourEntity ?? activeUserDefaultEntity;
      set((state) => ({
        ...state,
        companies: [
          ...state.companies,
          {
            ...payload,
            id,
            createdAt,
            createdFrom,
            watcherUserIds,
            companyStatus: payload.companyStatus ?? "LEAD",
            leadDisposition: payload.leadDisposition ?? "Open",
            ourEntity,
            emails: payload.emails ?? {},
            address: payload.address,
            primaryContactIds: payload.primaryContactIds,
            internalAmUserId: payload.internalAmUserId,
            counterpartyAmName: payload.counterpartyAmName,
            evaluation: payload.evaluation ?? {
              technicalFit: "Unknown",
              commercialFit: "Unknown",
              riskLevel: "Unknown",
            },
          },
        ],
      }));
      return id;
    },
    updateCompany: (company) =>
      set((state) => {
        const existing = state.companies.find((row) => row.id === company.id);
        if (!existing) return state;
        const hasInterconnectionProcess = state.interconnectionProcesses.some((row) => row.companyId === company.id);
        const nextOurEntity = hasInterconnectionProcess ? existing.ourEntity : company.ourEntity;
        return {
          ...state,
          companies: state.companies.map((row) =>
            row.id === company.id
              ? {
                  ...company,
                  ourEntity: nextOurEntity,
                  watcherUserIds: Array.from(new Set([...(company.watcherUserIds ?? []), company.ownerUserId].filter(Boolean))),
                }
              : row,
          ),
        };
      }),
    createContact: (payload) => {
      const id = uid("p");
      const roleTags = payload.roleTags ? Array.from(new Set(payload.roleTags)) : undefined;
      set((state) => ({
        ...state,
        contacts: [...state.contacts, { ...payload, id, roleTags }],
      }));
      return id;
    },
    updateContact: (contact) =>
      set((state) => ({
        ...state,
        contacts: state.contacts.map((row) => (row.id === contact.id ? contact : row)),
      })),
    createNote: (payload) => {
      const id = uid("n");
      set((state) => ({
        ...state,
        notes: [
          ...state.notes,
          {
            ...payload,
            id,
            createdAt: new Date().toISOString(),
            reminderTriggered: false,
          },
        ],
      }));
      return id;
    },
    updateNote: (note) =>
      set((state) => ({
        ...state,
        notes: state.notes.map((row) => (row.id === note.id ? note : row)),
      })),
    deleteNote: (noteId) =>
      set((state) => ({
        ...state,
        notes: state.notes.filter((row) => row.id !== noteId),
      })),
    createTask: (payload) => {
      const taskId = uid("t");
      const now = new Date().toISOString();
      const { initialComment, watcherUserIds, ...taskPayload } = payload;
      let labelIds = taskPayload.labelIds ? [...taskPayload.labelIds] : [];
      if (taskPayload.projectId) {
        const state = get();
        const project = state.projects.find((p) => p.id === taskPayload.projectId);
        if (project) {
          const projectLabelId = get().ensureProjectLabel(project.id, project.name);
          if (!labelIds.includes(projectLabelId)) {
            labelIds = [...labelIds, projectLabelId];
          }
        }
      }
      set((state) => ({
        ...state,
        tasks: [
          ...state.tasks,
          {
            ...taskPayload,
            id: taskId,
            labelIds: labelIds.length > 0 ? labelIds : undefined,
            createdAt: now,
            updatedAt: now,
            completedAt: taskPayload.status === "Done" ? now : undefined,
            archivedAt: taskPayload.status === "Done" ? taskPayload.archivedAt : undefined,
            watcherUserIds: Array.from(
              new Set([...(watcherUserIds ?? []), state.activeUserId, taskPayload.assigneeUserId].filter(Boolean)),
            ),
          },
        ],
        taskComments: initialComment
          ? [
              ...state.taskComments,
              {
                id: uid("tc"),
                taskId,
                authorUserId: state.activeUserId,
                content: initialComment,
                kind: "Comment",
                createdAt: now,
              },
            ]
          : state.taskComments,
      }));
      return taskId;
    },
    addTaskComment: (taskId, text, kind = "Comment") =>
      set((state) => ({
        ...state,
        taskComments: [
          ...state.taskComments,
          {
            id: uid("tc"),
            taskId,
            authorUserId: state.activeUserId,
            content: text,
            kind,
            createdAt: new Date().toISOString(),
          },
        ],
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                updatedAt: new Date().toISOString(),
              }
            : task,
        ),
      })),
    addTaskLabel: (payload) => {
      const labelId = uid("tl");
      set((state) => ({
        ...state,
        taskLabels: [...state.taskLabels, { ...payload, id: labelId }],
      }));
      return labelId;
    },
    updateTaskLabel: (id, patch) =>
      set((state) => ({
        ...state,
        taskLabels: state.taskLabels.map((label) =>
          label.id === id ? { ...label, ...patch } : label,
        ),
      })),
    deleteTaskLabel: (id) =>
      set((state) => ({
        ...state,
        taskLabels: state.taskLabels.filter((label) => label.id !== id),
        tasks: state.tasks.map((task) =>
          task.labelIds?.includes(id)
            ? { ...task, labelIds: task.labelIds.filter((lid) => lid !== id) }
            : task,
        ),
      })),
    ensureProjectLabel: (projectId, projectName) => {
      const state = get();
      const existing = state.taskLabels.find((l) => l.name === projectName);
      if (existing) return existing.id;
      const PROJECT_LABEL_COLORS = [
        "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
        "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
      ];
      const projectIdx = state.projects.findIndex((p) => p.id === projectId);
      const color = PROJECT_LABEL_COLORS[(projectIdx >= 0 ? projectIdx : 0) % PROJECT_LABEL_COLORS.length];
      const labelId = uid("tl");
      set((s) => ({
        ...s,
        taskLabels: [...s.taskLabels, { id: labelId, name: projectName, color }],
      }));
      return labelId;
    },
    updateTask: (task) =>
      set((state) => {
        const existing = state.tasks.find((row) => row.id === task.id);
        const now = new Date().toISOString();
        const hasArchivedAt = Object.prototype.hasOwnProperty.call(task, "archivedAt");
        return {
          ...state,
          tasks: state.tasks.map((row) =>
            row.id === task.id
              ? {
                  ...task,
                  updatedAt: now,
                  completedAt:
                    task.status === "Done"
                      ? task.completedAt ?? existing?.completedAt ?? now
                      : undefined,
                  archivedAt:
                    task.status === "Done" ? (hasArchivedAt ? task.archivedAt : existing?.archivedAt) : undefined,
                  watcherUserIds: Array.from(
                    new Set([...(task.watcherUserIds ?? []), task.createdByUserId, task.assigneeUserId].filter(Boolean)),
                  ),
                }
              : row,
          ),
        };
      }),
    createProject: (payload) => {
      const id = uid("pr");
      const now = new Date().toISOString();
      set((state) => ({
        ...state,
        projects: [
          ...state.projects,
          {
            ...payload,
            id,
            managerUserIds: Array.from(new Set([...(payload.managerUserIds ?? []), payload.ownerUserId].filter(Boolean))),
            technicalResponsibleUserId: payload.technicalResponsibleUserId ?? payload.ownerUserId,
            salesResponsibleUserId: payload.salesResponsibleUserId ?? payload.ownerUserId,
            productResponsibleUserId: payload.productResponsibleUserId ?? payload.ownerUserId,
            watcherUserIds: Array.from(
              new Set(
                [
                  ...(payload.watcherUserIds ?? []),
                  payload.ownerUserId,
                  payload.technicalResponsibleUserId ?? payload.ownerUserId,
                  payload.salesResponsibleUserId ?? payload.ownerUserId,
                  payload.productResponsibleUserId ?? payload.ownerUserId,
                  ...(payload.managerUserIds ?? []),
                ].filter(Boolean),
              ),
            ),
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
      get().ensureProjectLabel(id, payload.name);
      return id;
    },
    updateProject: (project) =>
      set((state) => ({
        ...state,
        projects: state.projects.map((row) =>
          row.id === project.id
            ? {
                ...project,
                managerUserIds: Array.from(new Set([...(project.managerUserIds ?? []), project.ownerUserId].filter(Boolean))),
                technicalResponsibleUserId: project.technicalResponsibleUserId ?? project.ownerUserId,
                salesResponsibleUserId: project.salesResponsibleUserId ?? project.ownerUserId,
                productResponsibleUserId: project.productResponsibleUserId ?? project.ownerUserId,
                watcherUserIds: Array.from(
                  new Set(
                    [
                      ...(project.watcherUserIds ?? []),
                      project.ownerUserId,
                      project.technicalResponsibleUserId ?? project.ownerUserId,
                      project.salesResponsibleUserId ?? project.ownerUserId,
                      project.productResponsibleUserId ?? project.ownerUserId,
                      ...(project.managerUserIds ?? []),
                    ].filter(Boolean),
                  ),
                ),
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    createProjectWeeklyReport: (payload) => {
      const existing = get().projectWeeklyReports.find(
        (report) => report.projectId === payload.projectId && report.weekStartDate === payload.weekStartDate,
      );
      if (existing) return existing.id;
      const id = uid("pwr");
      const now = new Date().toISOString();
      set((state) => {
        const technical = normalizeProjectRoleReport(payload.roleReports?.technical, state.activeUserId);
        const sales = normalizeProjectRoleReport(payload.roleReports?.sales, state.activeUserId);
        const product = normalizeProjectRoleReport(payload.roleReports?.product, state.activeUserId);
        const managerSummary = normalizeProjectManagerSummary(payload.managerSummary, state.activeUserId);
        return {
          ...state,
          projectWeeklyReports: [
            ...state.projectWeeklyReports,
            {
              ...payload,
              id,
              roleReports: {
                technical,
                sales,
                product,
              },
              managerSummary,
              createdAt: now,
              updatedAt: now,
            },
          ],
        };
      });
      return id;
    },
    updateProjectWeeklyReport: (report) =>
      set((state) => {
        const now = new Date().toISOString();
        const exists = state.projectWeeklyReports.some((row) => row.id === report.id);
        if (exists) {
          return {
            ...state,
            projectWeeklyReports: state.projectWeeklyReports.map((row) =>
              row.id === report.id
                ? {
                    ...report,
                    updatedAt: now,
                  }
                : row,
            ),
          };
        }
        return {
          ...state,
          projectWeeklyReports: [
            ...state.projectWeeklyReports,
            {
              ...report,
              createdAt: report.createdAt ?? now,
              updatedAt: now,
            },
          ],
        };
      }),
    generateProjectAiSummary: (projectId, weekStartDate) =>
      set((state) => {
        const target = state.projectWeeklyReports.find(
          (report) => report.projectId === projectId && report.weekStartDate === weekStartDate,
        );
        if (!target) {
          return {
            ...state,
            outbox: [...state.outbox, `No weekly report found for ${projectId} (${weekStartDate})`],
          };
        }
        const generatedAt = new Date().toISOString();
        const aiSummary = createProjectAiSummary(target, state.activeUserId, generatedAt);
        return {
          ...state,
          projectWeeklyReports: state.projectWeeklyReports.map((report) =>
            report.id === target.id
              ? {
                  ...report,
                  aiSummary,
                  updatedAt: generatedAt,
                }
              : report,
          ),
        };
      }),
    createContract: (payload) => {
      const id = uid("ct");
      const now = new Date().toISOString();
      const company = get().companies.find((row) => row.id === payload.companyId);
      const ourEntity = payload.ourEntity ?? company?.ourEntity ?? "UK";
      set((state) => ({
        ...state,
        contracts: [
          ...state.contracts,
          {
            ...payload,
            id,
            ourEntity,
            files: payload.files ?? [],
            createdAt: now,
            updatedAt: now,
            signedAt: payload.status === "FullySigned" ? payload.signedAt ?? now : payload.signedAt,
          },
        ],
      }));
      return id;
    },
    updateContract: (contract) =>
      set((state) => ({
        ...state,
        contracts: state.contracts.map((row) =>
          row.id === contract.id
            ? {
                ...contract,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    addContractFile: (contractId, payload) =>
      set((state) => ({
        ...state,
        contracts: state.contracts.map((contract) =>
          contract.id === contractId
            ? {
                ...contract,
                files: [
                  ...contract.files,
                  {
                    ...payload,
                    id: uid("cf"),
                  },
                ],
                updatedAt: new Date().toISOString(),
              }
            : contract,
        ),
      })),
    requestContractInternalSignature: (contractId, internalSignerUserId) =>
      set((state) => ({
        ...state,
        contracts: state.contracts.map((contract) =>
          contract.id === contractId
            ? {
                ...contract,
                status: "InternalSignatureRequested",
                internalSignerUserId,
                updatedAt: new Date().toISOString(),
              }
            : contract,
        ),
      })),
    markContractInternallySigned: (contractId) =>
      set((state) => ({
        ...state,
        contracts: state.contracts.map((contract) =>
          contract.id === contractId
            ? {
                ...contract,
                status: "CounterpartySignatureRequested",
                updatedAt: new Date().toISOString(),
              }
            : contract,
        ),
      })),
    markContractCounterpartySigned: (contractId, counterpartySignerName) =>
      set((state) => ({
        ...state,
        contracts: state.contracts.map((contract) =>
          contract.id === contractId
            ? {
                ...contract,
                status: "FullySigned",
                counterpartySignerName: counterpartySignerName || contract.counterpartySignerName,
                signedAt: contract.signedAt ?? new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : contract,
        ),
      })),
    setContractStatus: (contractId, status) =>
      set((state) => ({
        ...state,
        contracts: state.contracts.map((contract) =>
          contract.id === contractId
            ? {
                ...contract,
                status,
                signedAt: status === "FullySigned" ? contract.signedAt ?? new Date().toISOString() : contract.signedAt,
                updatedAt: new Date().toISOString(),
              }
            : contract,
        ),
      })),
    updateOurCompanyInfo: (payload) =>
      set((state) => ({
        ...state,
        ourCompanyInfo: state.ourCompanyInfo.map((row) =>
          row.ourEntity === payload.ourEntity
            ? {
                ...payload,
                lastUpdatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    createHrDepartment: (payload) => {
      const id = uid("hrd");
      const now = new Date().toISOString();
      set((state) => ({
        ...state,
        hrDepartments: [
          ...state.hrDepartments,
          {
            ...payload,
            id,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
      return id;
    },
    updateHrDepartment: (department) =>
      set((state) => ({
        ...state,
        hrDepartments: state.hrDepartments.map((row) =>
          row.id === department.id
            ? {
                ...department,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    deleteHrDepartment: (departmentId) =>
      set((state) => {
        if (state.hrEmployees.some((employee) => employee.departmentId === departmentId && employee.active)) {
          return {
            ...state,
            outbox: [...state.outbox, "Cannot delete department with active employees."],
          };
        }
        return {
          ...state,
          hrDepartments: state.hrDepartments.filter((row) => row.id !== departmentId),
        };
      }),
    createHrEmployee: (payload) => {
      const id = uid("hre");
      const now = new Date().toISOString();
      const firstName = payload.firstName.trim();
      const lastName = payload.lastName.trim();
      set((state) => ({
        ...state,
        hrEmployees: [
          ...state.hrEmployees,
          {
            ...payload,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`.trim(),
            managerId: payload.managerId === id ? undefined : payload.managerId,
            id,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
      return id;
    },
    updateHrEmployee: (employee) =>
      set((state) => ({
        ...state,
        hrEmployees: state.hrEmployees.map((row) =>
          row.id === employee.id
            ? {
                ...employee,
                displayName: `${employee.firstName.trim()} ${employee.lastName.trim()}`.trim(),
                managerId: employee.managerId === employee.id ? undefined : employee.managerId,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    upsertHrCompensation: (payload) => {
      let nextId = payload.id ?? "";
      set((state) => {
        const now = new Date().toISOString();
        const existing = state.hrCompensations.find((row) => row.employeeId === payload.employeeId || row.id === payload.id);
        const row: HrEmployeeCompensation = {
          ...payload,
          id: existing?.id ?? payload.id ?? uid("hrc"),
          bonusEntries: payload.bonusEntries ?? [],
          salaryDistribution: payload.salaryDistribution ?? [],
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        const validation = validateSalaryDistribution(row, state.hrFxRates, now);
        if (!validation.ok) {
          return {
            ...state,
            outbox: [...state.outbox, `Compensation update blocked: ${validation.message ?? "invalid salary distribution"}`],
          };
        }
        nextId = row.id;
        const hrCompensations = existing
          ? state.hrCompensations.map((entry) => (entry.id === existing.id ? row : entry))
          : [...state.hrCompensations, row];
        return {
          ...state,
          hrCompensations,
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Compensation",
            parentId: row.id,
            actionType: "COMPENSATION_UPDATED",
            comment: "Compensation and salary distribution updated.",
          }),
        };
      });
      return nextId;
    },
    addHrBonusEntry: (employeeId, payload) =>
      set((state) => {
        const compensation = state.hrCompensations.find((row) => row.employeeId === employeeId);
        if (!compensation) {
          return {
            ...state,
            outbox: [...state.outbox, "Compensation record not found for employee."],
          };
        }
        const nextBonus = {
          id: uid("hrb"),
          employeeId,
          ...payload,
        };
        return {
          ...state,
          hrCompensations: state.hrCompensations.map((row) =>
            row.id === compensation.id
              ? {
                  ...row,
                  bonusEntries: [...row.bonusEntries, nextBonus],
                  updatedAt: new Date().toISOString(),
                }
              : row,
          ),
        };
      }),
    removeHrBonusEntry: (employeeId, bonusId) =>
      set((state) => ({
        ...state,
        hrCompensations: state.hrCompensations.map((row) =>
          row.employeeId === employeeId
            ? {
                ...row,
                bonusEntries: row.bonusEntries.filter((entry) => entry.id !== bonusId),
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    upsertHrLegalEntity: (payload) =>
      set((state) => {
        const now = new Date().toISOString();
        const existing = state.hrLegalEntities.find((entry) => entry.id === payload.id);
        const row: HrLegalEntity = {
          ...payload,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        return {
          ...state,
          hrLegalEntities: existing
            ? state.hrLegalEntities.map((entry) => (entry.id === payload.id ? row : entry))
            : [...state.hrLegalEntities, row],
        };
      }),
    upsertHrFxRate: (payload) => {
      let nextId = payload.id ?? "";
      set((state) => {
        const now = new Date().toISOString();
        const existing = state.hrFxRates.find((entry) => entry.id === payload.id || (entry.from === payload.from && entry.effectiveAt === payload.effectiveAt));
        const row: HrFxRate = {
          ...payload,
          id: existing?.id ?? payload.id ?? uid("hrfx"),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        nextId = row.id;
        return {
          ...state,
          hrFxRates: existing ? state.hrFxRates.map((entry) => (entry.id === existing.id ? row : entry)) : [...state.hrFxRates, row],
        };
      });
      return nextId;
    },
    upsertHrLeaveProfile: (payload) => {
      let nextId = payload.id ?? "";
      set((state) => {
        const now = new Date().toISOString();
        const existing = state.hrLeaveProfiles.find((row) => row.id === payload.id || row.country === payload.country);
        const row: HrCountryLeaveProfile = {
          ...payload,
          id: existing?.id ?? payload.id ?? uid("hrlp"),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        nextId = row.id;
        return {
          ...state,
          hrLeaveProfiles: existing
            ? state.hrLeaveProfiles.map((entry) => (entry.id === existing.id ? row : entry))
            : [...state.hrLeaveProfiles, row],
        };
      });
      return nextId;
    },
    createHrLeaveRequest: (payload) => {
      let createdId = "";
      set((state) => {
        const employee = state.hrEmployees.find((row) => row.id === payload.employeeId);
        if (!employee) {
          return {
            ...state,
            outbox: [...state.outbox, "Employee not found for leave request."],
          };
        }
        const totalDays = workingDaysBetween(payload.startDate, payload.endDate);
        if (totalDays <= 0) {
          return {
            ...state,
            outbox: [...state.outbox, "Leave request dates are invalid."],
          };
        }
        const hasOverlap = state.hrLeaveRequests.some(
          (entry) =>
            entry.employeeId === payload.employeeId &&
            (entry.status === "PendingManager" || entry.status === "PendingHR" || entry.status === "Approved") &&
            dateRangesOverlap(entry.startDate, entry.endDate, payload.startDate, payload.endDate),
        );
        if (hasOverlap) {
          return {
            ...state,
            outbox: [...state.outbox, "Leave request overlaps with another active leave request."],
          };
        }
        const now = new Date().toISOString();
        const row: HrLeaveRequest = {
          ...payload,
          id: uid("hrlr"),
          totalDays,
          status: "PendingManager",
          createdAt: now,
          updatedAt: now,
        };
        createdId = row.id;
        return {
          ...state,
          hrLeaveRequests: [...state.hrLeaveRequests, row],
        };
      });
      return createdId;
    },
    applyHrLeaveAction: (requestId, actionType, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Leave request not found." };
      set((state) => {
        const target = state.hrLeaveRequests.find((row) => row.id === requestId);
        if (!target) {
          result = { ok: false, message: "Leave request not found." };
          return state;
        }
        const trimmedComment = comment?.trim();
        if (requiresLeaveComment(actionType) && !trimmedComment) {
          result = { ok: false, message: "Comment is mandatory for reject actions." };
          return state;
        }
        const now = new Date().toISOString();
        let next: HrLeaveRequest | null = null;
        if (actionType === "MANAGER_APPROVE" && target.status === "PendingManager") {
          next = { ...target, status: "PendingHR", managerApprovedAt: now, updatedAt: now };
        } else if (actionType === "MANAGER_REJECT" && target.status === "PendingManager") {
          next = {
            ...target,
            status: "Rejected",
            managerApprovedAt: now,
            rejectedAt: now,
            rejectionReason: trimmedComment ?? "Rejected by manager.",
            updatedAt: now,
          };
        } else if (actionType === "HR_APPROVE" && target.status === "PendingHR") {
          next = { ...target, status: "Approved", hrApprovedAt: now, updatedAt: now };
        } else if (actionType === "HR_REJECT" && target.status === "PendingHR") {
          next = {
            ...target,
            status: "Rejected",
            hrApprovedAt: now,
            rejectedAt: now,
            rejectionReason: trimmedComment ?? "Rejected by HR.",
            updatedAt: now,
          };
        }
        if (!next) {
          result = { ok: false, message: "Action is not valid for current leave status." };
          return state;
        }
        result = { ok: true };
        return {
          ...state,
          hrLeaveRequests: state.hrLeaveRequests.map((entry) => (entry.id === requestId ? next! : entry)),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Leave",
            parentId: requestId,
            actionType,
            comment: trimmedComment,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    createHrAsset: (payload) => {
      const id = uid("hra");
      const now = new Date().toISOString();
      set((state) => {
        const isAssigned = Boolean(payload.assignedToEmployeeId);
        return {
          ...state,
          hrAssets: [
            ...state.hrAssets,
            {
              ...payload,
              id,
              status: payload.status ?? (isAssigned ? "Assigned" : "Available"),
              assignedAt: isAssigned ? payload.assignedAt ?? now : undefined,
              returnedAt: isAssigned ? undefined : payload.returnedAt,
              digitalAcceptance: isAssigned ? payload.digitalAcceptance : false,
              createdAt: now,
              updatedAt: now,
            },
          ],
        };
      });
      return id;
    },
    updateHrAsset: (asset) =>
      set((state) => ({
        ...state,
        hrAssets: state.hrAssets.map((row) =>
          row.id === asset.id
            ? {
                ...asset,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    assignHrAsset: (assetId, employeeId) =>
      set((state) => {
        const now = new Date().toISOString();
        const assignee = state.hrEmployees.find((row) => row.id === employeeId);
        if (!assignee) return state;
        const assignmentId = uid("hraa");
        return {
          ...state,
          hrAssets: state.hrAssets.map((row) =>
            row.id === assetId
              ? {
                  ...row,
                  status: "Assigned",
                  assignedToEmployeeId: employeeId,
                  assignedAt: now,
                  returnedAt: undefined,
                  digitalAcceptance: false,
                  updatedAt: now,
                }
              : row,
          ),
          hrAssetAssignments: [
            ...state.hrAssetAssignments.map((row) =>
              row.assetId === assetId && !row.returnedAt
                ? {
                    ...row,
                    returnedAt: now,
                    updatedAt: now,
                  }
                : row,
            ),
            {
              id: assignmentId,
              assetId,
              employeeId,
              assignedAt: now,
              returnedAt: undefined,
              acceptanceStatus: "Pending",
              acceptedAt: undefined,
              revokedAt: undefined,
              assignedByUserId: state.activeUserId,
              notes: undefined,
              createdAt: now,
              updatedAt: now,
            },
          ],
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Asset",
            parentId: assetId,
            actionType: "ASSET_ASSIGNED",
            comment: `Assigned to ${assignee.displayName || assignee.email}.`,
            timestamp: now,
          }),
        };
      }),
    returnHrAsset: (assetId) =>
      set((state) => {
        const now = new Date().toISOString();
        const activeAssignment = state.hrAssetAssignments.find((row) => row.assetId === assetId && !row.returnedAt);
        return {
          ...state,
          hrAssets: state.hrAssets.map((row) =>
            row.id === assetId
              ? {
                  ...row,
                  status: "Returned",
                  assignedToEmployeeId: undefined,
                  returnedAt: now,
                  digitalAcceptance: false,
                  updatedAt: now,
                }
              : row,
          ),
          hrAssetAssignments: state.hrAssetAssignments.map((row) =>
            row.assetId === assetId && !row.returnedAt
              ? {
                  ...row,
                  returnedAt: now,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Asset",
            parentId: assetId,
            actionType: "ASSET_RETURNED",
            timestamp: now,
            comment: "Asset returned to inventory.",
          }).concat(
            activeAssignment
              ? [
                  {
                    id: uid("hra"),
                    parentType: "AssetAssignment",
                    parentId: activeAssignment.id,
                    actionType: "ASSET_ASSIGNMENT_ACCEPTANCE_REVOKED",
                    performedByUserId: state.activeUserId,
                    timestamp: now,
                    comment: "Assignment closed due to asset return.",
                  } as HrAuditLogEntry,
                ]
              : [],
          ),
        };
      }),
    retireHrAsset: (assetId) =>
      set((state) => {
        const now = new Date().toISOString();
        return {
          ...state,
          hrAssets: state.hrAssets.map((row) =>
            row.id === assetId
              ? {
                  ...row,
                  status: "Retired",
                  assignedToEmployeeId: undefined,
                  returnedAt: row.returnedAt ?? now,
                  digitalAcceptance: false,
                  updatedAt: now,
                }
              : row,
          ),
          hrAssetAssignments: state.hrAssetAssignments.map((row) =>
            row.assetId === assetId && !row.returnedAt
              ? {
                  ...row,
                  returnedAt: now,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Asset",
            parentId: assetId,
            actionType: "ASSET_RETURNED",
            comment: "Asset retired from active inventory.",
            timestamp: now,
          }),
        };
      }),
    markHrAssetAcceptance: (assetId, accepted) =>
      set((state) => {
        const now = new Date().toISOString();
        const activeAssignment = state.hrAssetAssignments.find((row) => row.assetId === assetId && !row.returnedAt);
        return {
          ...state,
          hrAssets: state.hrAssets.map((row) =>
            row.id === assetId
              ? {
                  ...row,
                  digitalAcceptance: accepted,
                  updatedAt: now,
                }
              : row,
          ),
          hrAssetAssignments: state.hrAssetAssignments.map((row) =>
            row.id === activeAssignment?.id
              ? {
                  ...row,
                  acceptanceStatus: accepted ? "Accepted" : "Pending",
                  acceptedAt: accepted ? now : undefined,
                  revokedAt: accepted ? undefined : now,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Asset",
            parentId: assetId,
            actionType: "ASSET_ACCEPTED",
            comment: accepted ? "Digital acceptance confirmed." : "Digital acceptance reverted.",
            timestamp: now,
          }),
        };
      }),
    createHrSoftwareLicense: (payload) => {
      const id = uid("hrsl");
      const now = new Date().toISOString();
      set((state) => ({
        ...state,
        hrSoftwareLicenses: [
          ...state.hrSoftwareLicenses,
          {
            ...payload,
            id,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
      return id;
    },
    updateHrSoftwareLicense: (license) =>
      set((state) => ({
        ...state,
        hrSoftwareLicenses: state.hrSoftwareLicenses.map((row) =>
          row.id === license.id
            ? {
                ...license,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    createHrSoftwareProduct: (payload) => {
      const id = uid("hrsp");
      const now = new Date().toISOString();
      set((state) => ({
        ...state,
        hrSoftwareProducts: [
          ...state.hrSoftwareProducts,
          {
            ...payload,
            id,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
      return id;
    },
    updateHrSoftwareProduct: (product) =>
      set((state) => ({
        ...state,
        hrSoftwareProducts: state.hrSoftwareProducts.map((row) =>
          row.id === product.id
            ? {
                ...product,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    createHrSoftwareSeat: (payload) => {
      const id = uid("hrss");
      const now = new Date().toISOString();
      set((state) => {
        const status = payload.status ?? (payload.assignedToEmployeeId ? "Assigned" : "Available");
        return {
          ...state,
          hrSoftwareSeats: [
            ...state.hrSoftwareSeats,
            {
              ...payload,
              id,
              status,
              assignedAt: status === "Assigned" ? payload.assignedAt ?? now : undefined,
              createdAt: now,
              updatedAt: now,
            },
          ],
        };
      });
      return id;
    },
    updateHrSoftwareSeat: (seat) =>
      set((state) => ({
        ...state,
        hrSoftwareSeats: state.hrSoftwareSeats.map((row) =>
          row.id === seat.id
            ? {
                ...seat,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      })),
    assignHrSoftwareSeat: (seatId, payload) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Seat not found." };
      set((state) => {
        const seat = state.hrSoftwareSeats.find((row) => row.id === seatId);
        if (!seat) return state;
        const employee = state.hrEmployees.find((row) => row.id === payload.employeeId);
        if (!employee) {
          result = { ok: false, message: "Employee not found." };
          return state;
        }
        if (!payload.assignedToEmail.trim()) {
          result = { ok: false, message: "Assigned email is required." };
          return state;
        }
        const now = new Date().toISOString();
        result = { ok: true };
        const nextRequests: HrProvisionRequest[] = payload.requestId
          ? state.hrProvisionRequests.map((request): HrProvisionRequest =>
              request.id === payload.requestId
                ? {
                    ...request,
                    status: "Fulfilled",
                    fulfilledAt: now,
                    linkedSoftwareSeatId: seatId,
                    updatedAt: now,
                  }
                : request,
            )
          : state.hrProvisionRequests;
        return {
          ...state,
          hrSoftwareSeats: state.hrSoftwareSeats.map((row) =>
            row.id === seatId
              ? {
                  ...row,
                  status: "Assigned",
                  assignedToEmployeeId: payload.employeeId,
                  assignedToEmail: payload.assignedToEmail.trim(),
                  assignedAt: now,
                  revokedAt: undefined,
                  updatedAt: now,
                  notes: payload.notes ?? row.notes,
                }
              : row,
          ),
          hrProvisionRequests: nextRequests,
          hrAuditLogs: appendHrAudit(state, {
            parentType: "SoftwareSeat",
            parentId: seatId,
            actionType: "SOFTWARE_SEAT_ASSIGNED",
            comment: payload.notes,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    revokeHrSoftwareSeat: (seatId, note) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Seat not found." };
      set((state) => {
        const seat = state.hrSoftwareSeats.find((row) => row.id === seatId);
        if (!seat) return state;
        const now = new Date().toISOString();
        result = { ok: true };
        return {
          ...state,
          hrSoftwareSeats: state.hrSoftwareSeats.map((row) =>
            row.id === seatId
              ? {
                  ...row,
                  status: "Revoked",
                  revokedAt: now,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "SoftwareSeat",
            parentId: seatId,
            actionType: "SOFTWARE_SEAT_REVOKED",
            comment: note?.trim() || undefined,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    createHrProvisionRequest: (payload) => {
      const id = uid("hrpr");
      const now = new Date().toISOString();
      set((state) => ({
        ...state,
        hrProvisionRequests: [
          ...state.hrProvisionRequests,
          {
            ...payload,
            id,
            status: "PendingManager",
            createdAt: now,
            updatedAt: now,
          },
        ],
        hrAuditLogs: appendHrAudit(state, {
          parentType: "ProvisionRequest",
          parentId: id,
          actionType: "PROVISION_REQUEST_CREATED",
          performedByUserId: state.activeUserId,
          timestamp: now,
        }),
      }));
      return id;
    },
    approveHrProvisionByManager: (requestId, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Request not found." };
      set((state) => {
        const request = state.hrProvisionRequests.find((row) => row.id === requestId);
        if (!request) return state;
        if (request.status !== "PendingManager") {
          result = { ok: false, message: "Only PendingManager requests can be approved." };
          return state;
        }
        const now = new Date().toISOString();
        result = { ok: true };
        return {
          ...state,
          hrProvisionRequests: state.hrProvisionRequests.map((row) =>
            row.id === requestId
              ? {
                  ...row,
                  status: "PendingHR",
                  managerApproverUserId: state.activeUserId,
                  managerApprovedAt: now,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "ProvisionRequest",
            parentId: requestId,
            actionType: "PROVISION_MANAGER_APPROVED",
            comment: comment?.trim() || undefined,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    rejectHrProvisionByManager: (requestId, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Request not found." };
      set((state) => {
        const request = state.hrProvisionRequests.find((row) => row.id === requestId);
        if (!request) return state;
        if (request.status !== "PendingManager") {
          result = { ok: false, message: "Only PendingManager requests can be rejected." };
          return state;
        }
        const reason = comment.trim();
        if (!reason) {
          result = { ok: false, message: "Rejection reason is required." };
          return state;
        }
        const now = new Date().toISOString();
        result = { ok: true };
        return {
          ...state,
          hrProvisionRequests: state.hrProvisionRequests.map((row) =>
            row.id === requestId
              ? {
                  ...row,
                  status: "Rejected",
                  managerApproverUserId: state.activeUserId,
                  managerApprovedAt: now,
                  rejectionReason: reason,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "ProvisionRequest",
            parentId: requestId,
            actionType: "PROVISION_MANAGER_REJECTED",
            comment: reason,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    approveHrProvisionByHr: (requestId, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Request not found." };
      set((state) => {
        const request = state.hrProvisionRequests.find((row) => row.id === requestId);
        if (!request) return state;
        if (request.status !== "PendingHR") {
          result = { ok: false, message: "Only PendingHR requests can be approved." };
          return state;
        }
        const now = new Date().toISOString();
        result = { ok: true };
        return {
          ...state,
          hrProvisionRequests: state.hrProvisionRequests.map((row) =>
            row.id === requestId
              ? {
                  ...row,
                  hrApproverUserId: state.activeUserId,
                  hrApprovedAt: now,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "ProvisionRequest",
            parentId: requestId,
            actionType: "PROVISION_HR_APPROVED",
            comment: comment?.trim() || undefined,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    rejectHrProvisionByHr: (requestId, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Request not found." };
      set((state) => {
        const request = state.hrProvisionRequests.find((row) => row.id === requestId);
        if (!request) return state;
        if (request.status !== "PendingHR") {
          result = { ok: false, message: "Only PendingHR requests can be rejected." };
          return state;
        }
        const reason = comment.trim();
        if (!reason) {
          result = { ok: false, message: "Rejection reason is required." };
          return state;
        }
        const now = new Date().toISOString();
        result = { ok: true };
        return {
          ...state,
          hrProvisionRequests: state.hrProvisionRequests.map((row) =>
            row.id === requestId
              ? {
                  ...row,
                  status: "Rejected",
                  hrApproverUserId: state.activeUserId,
                  hrApprovedAt: now,
                  rejectionReason: reason,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "ProvisionRequest",
            parentId: requestId,
            actionType: "PROVISION_HR_REJECTED",
            comment: reason,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    cancelHrProvisionRequest: (requestId, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Request not found." };
      set((state) => {
        const request = state.hrProvisionRequests.find((row) => row.id === requestId);
        if (!request) return state;
        if (request.status !== "PendingManager") {
          result = { ok: false, message: "Only PendingManager requests can be cancelled by requester." };
          return state;
        }
        const now = new Date().toISOString();
        result = { ok: true };
        return {
          ...state,
          hrProvisionRequests: state.hrProvisionRequests.map((row) =>
            row.id === requestId
              ? {
                  ...row,
                  status: "Cancelled",
                  cancellationReason: comment?.trim() || "Cancelled by requester.",
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "ProvisionRequest",
            parentId: requestId,
            actionType: "PROVISION_CANCELLED",
            comment: comment?.trim() || undefined,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    fulfillHrProvisionRequest: (requestId, payload) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Request not found." };
      set((state) => {
        const request = state.hrProvisionRequests.find((row) => row.id === requestId);
        if (!request) return state;
        if (request.status !== "PendingHR") {
          result = { ok: false, message: "Only PendingHR requests can be fulfilled." };
          return state;
        }
        const requester = state.hrEmployees.find((row) => row.id === request.requesterEmployeeId);
        if (!requester) {
          result = { ok: false, message: "Requester employee was not found." };
          return state;
        }
        const now = new Date().toISOString();
        if (request.requestType === "Hardware") {
          if (!payload.assetId) {
            result = { ok: false, message: "Asset selection is required for hardware fulfillment." };
            return state;
          }
          const asset = state.hrAssets.find((row) => row.id === payload.assetId);
          if (!asset) {
            result = { ok: false, message: "Selected asset not found." };
            return state;
          }
          if (asset.status === "Assigned" || asset.status === "Retired") {
            result = { ok: false, message: "Selected asset is not available for assignment." };
            return state;
          }
          const assignmentId = uid("hraa");
          result = { ok: true };
          return {
            ...state,
            hrAssets: state.hrAssets.map((row) =>
              row.id === payload.assetId
                ? {
                    ...row,
                    status: "Assigned",
                    assignedToEmployeeId: requester.id,
                    assignedAt: now,
                    returnedAt: undefined,
                    digitalAcceptance: false,
                    updatedAt: now,
                  }
                : row,
            ),
            hrAssetAssignments: [
              ...state.hrAssetAssignments.map((row) =>
                row.assetId === payload.assetId && !row.returnedAt
                  ? {
                      ...row,
                      returnedAt: now,
                      updatedAt: now,
                    }
                  : row,
              ),
              {
                id: assignmentId,
                assetId: payload.assetId,
                employeeId: requester.id,
                assignedAt: now,
                returnedAt: undefined,
                acceptanceStatus: "Pending",
                acceptedAt: undefined,
                revokedAt: undefined,
                assignedByUserId: state.activeUserId,
                notes: payload.note?.trim() || undefined,
                createdAt: now,
                updatedAt: now,
              },
            ],
            hrProvisionRequests: state.hrProvisionRequests.map((row) =>
              row.id === requestId
                ? {
                    ...row,
                    status: "Fulfilled",
                    hrApproverUserId: row.hrApproverUserId ?? state.activeUserId,
                    hrApprovedAt: row.hrApprovedAt ?? now,
                    fulfilledAt: now,
                    linkedAssetAssignmentId: assignmentId,
                    updatedAt: now,
                  }
                : row,
            ),
            hrAuditLogs: appendHrAudit(state, {
              parentType: "ProvisionRequest",
              parentId: requestId,
              actionType: "PROVISION_FULFILLED",
              comment: payload.note?.trim() || undefined,
              timestamp: now,
            }).concat([
              {
                id: uid("hra"),
                parentType: "AssetAssignment",
                parentId: assignmentId,
                actionType: "ASSET_ASSIGNMENT_CREATED",
                performedByUserId: state.activeUserId,
                timestamp: now,
                comment: payload.note?.trim() || undefined,
              } as HrAuditLogEntry,
            ]),
          };
        }
        if (!payload.softwareSeatId) {
          result = { ok: false, message: "Seat selection is required for software fulfillment." };
          return state;
        }
        if (!payload.assignedToEmail?.trim()) {
          result = { ok: false, message: "Assigned email is required for software seat fulfillment." };
          return state;
        }
        const seat = state.hrSoftwareSeats.find((row) => row.id === payload.softwareSeatId);
        if (!seat) {
          result = { ok: false, message: "Selected seat not found." };
          return state;
        }
        if (seat.status === "Assigned" || seat.status === "Expired") {
          result = { ok: false, message: "Selected seat is not available for assignment." };
          return state;
        }
        result = { ok: true };
        return {
          ...state,
          hrSoftwareSeats: state.hrSoftwareSeats.map((row) =>
            row.id === payload.softwareSeatId
              ? {
                  ...row,
                  status: "Assigned",
                  assignedToEmployeeId: requester.id,
                  assignedToEmail: payload.assignedToEmail?.trim(),
                  assignedAt: now,
                  revokedAt: undefined,
                  updatedAt: now,
                  notes: payload.note?.trim() || row.notes,
                }
              : row,
          ),
          hrProvisionRequests: state.hrProvisionRequests.map((row) =>
            row.id === requestId
              ? {
                  ...row,
                  status: "Fulfilled",
                  hrApproverUserId: row.hrApproverUserId ?? state.activeUserId,
                  hrApprovedAt: row.hrApprovedAt ?? now,
                  fulfilledAt: now,
                  linkedSoftwareSeatId: payload.softwareSeatId,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "ProvisionRequest",
            parentId: requestId,
            actionType: "PROVISION_FULFILLED",
            comment: payload.note?.trim() || undefined,
            timestamp: now,
          }).concat([
            {
              id: uid("hra"),
              parentType: "SoftwareSeat",
              parentId: payload.softwareSeatId,
              actionType: "SOFTWARE_SEAT_ASSIGNED",
              performedByUserId: state.activeUserId,
              timestamp: now,
              comment: payload.note?.trim() || undefined,
            } as HrAuditLogEntry,
          ]),
        };
      });
      return result;
    },
    setHrAssetAssignmentAcceptance: (assignmentId, accepted) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Assignment not found." };
      set((state) => {
        const assignment = state.hrAssetAssignments.find((row) => row.id === assignmentId);
        if (!assignment) return state;
        if (assignment.returnedAt) {
          result = { ok: false, message: "Returned assignments cannot be accepted." };
          return state;
        }
        const now = new Date().toISOString();
        result = { ok: true };
        return {
          ...state,
          hrAssetAssignments: state.hrAssetAssignments.map((row) =>
            row.id === assignmentId
              ? {
                  ...row,
                  acceptanceStatus: accepted ? "Accepted" : "Pending",
                  acceptedAt: accepted ? now : undefined,
                  revokedAt: accepted ? undefined : now,
                  updatedAt: now,
                }
              : row,
          ),
          hrAssets: state.hrAssets.map((row) =>
            row.id === assignment.assetId
              ? {
                  ...row,
                  digitalAcceptance: accepted,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "AssetAssignment",
            parentId: assignmentId,
            actionType: accepted ? "ASSET_ASSIGNMENT_ACCEPTED" : "ASSET_ASSIGNMENT_ACCEPTANCE_REVOKED",
            timestamp: now,
          }),
        };
      });
      return result;
    },
    createHrExpense: (payload) => {
      let result: { ok: boolean; id?: string; message?: string } = { ok: false, message: "Unable to create claim." };
      set((state) => {
        const claimant = state.hrEmployees.find((employee) => employee.id === payload.employeeId);
        if (!claimant) {
          result = { ok: false, message: "Employee not found." };
          return state;
        }
        if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
          result = { ok: false, message: "Amount must be greater than zero." };
          return state;
        }
        const trimmedDescription = payload.description.trim();
        if (!trimmedDescription) {
          result = { ok: false, message: "Description is required." };
          return state;
        }
        const trimmedCategory = payload.category.trim();
        if (payload.claimType === "Reimbursement" && !trimmedCategory) {
          result = { ok: false, message: "Category is required for reimbursement claims." };
          return state;
        }
        if (payload.claimType === "Advance" && !payload.advanceType) {
          result = { ok: false, message: "Advance type is required for advance requests." };
          return state;
        }
        const now = new Date().toISOString();
        const converted = convertCurrency(payload.amount, payload.currency, "EUR", state.hrFxRates, now);
        if (payload.currency !== "EUR" && converted === undefined) {
          result = { ok: false, message: "Missing FX rate for the selected currency." };
          return state;
        }
        const receiptUrl = payload.receiptUrl?.trim() || undefined;
        const attachmentUrl = payload.attachmentMeta?.url?.trim();
        const attachmentMeta = attachmentUrl
          ? {
              ...payload.attachmentMeta,
              url: attachmentUrl,
              fileName: payload.attachmentMeta?.fileName?.trim() || undefined,
              mimeType: payload.attachmentMeta?.mimeType?.trim() || undefined,
              uploadedAt: payload.attachmentMeta?.uploadedAt ?? now,
            }
          : undefined;
        const id = uid("hrex");
        const hasManager =
          Boolean(claimant.managerId) && state.hrEmployees.some((employee) => employee.id === claimant.managerId);
        const initialStatus: HrExpense["status"] = hasManager ? "PendingManager" : "PendingFinance";
        const next: HrExpense = {
          ...payload,
          id,
          category: trimmedCategory || (payload.claimType === "Advance" ? "Advance" : "Other"),
          amount: Math.round(payload.amount * 100) / 100,
          description: trimmedDescription,
          receiptUrl,
          attachmentMeta,
          advancePurpose: payload.advancePurpose?.trim() || undefined,
          convertedAmountEUR: Math.round(((converted ?? payload.amount) * 100)) / 100,
          status: initialStatus,
          managerApprovedAt: hasManager ? undefined : now,
          financeApprovedAt: undefined,
          rejectedAt: undefined,
          paidAt: undefined,
          cancelledAt: undefined,
          createdAt: now,
          updatedAt: now,
        };
        result = { ok: true, id };
        return {
          ...state,
          hrExpenses: [...state.hrExpenses, next],
          hrAuditLogs: hasManager
            ? appendHrAudit(state, {
                parentType: "Expense",
                parentId: id,
                actionType: "SUBMIT",
                comment: payload.claimType === "Advance" ? "Advance request submitted." : "Reimbursement claim submitted.",
                timestamp: now,
              })
            : appendHrAudit(
                {
                  ...state,
                  hrAuditLogs: appendHrAudit(state, {
                    parentType: "Expense",
                    parentId: id,
                    actionType: "SUBMIT",
                    comment: payload.claimType === "Advance" ? "Advance request submitted." : "Reimbursement claim submitted.",
                    timestamp: now,
                  }),
                },
                {
                  parentType: "Expense",
                  parentId: id,
                  actionType: "MANAGER_APPROVE",
                  comment: "No manager assigned; routed directly to finance queue.",
                  timestamp: now,
                },
              ),
        };
      });
      return result;
    },
    updateHrExpenseDraft: (expenseId, payload) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Expense not found." };
      set((state) => {
        const target = state.hrExpenses.find((row) => row.id === expenseId);
        if (!target) {
          result = { ok: false, message: "Expense not found." };
          return state;
        }
        if (target.status !== "PendingManager") {
          result = { ok: false, message: "Only PendingManager claims can be edited." };
          return state;
        }
        if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
          result = { ok: false, message: "Amount must be greater than zero." };
          return state;
        }
        const trimmedDescription = payload.description.trim();
        if (!trimmedDescription) {
          result = { ok: false, message: "Description is required." };
          return state;
        }
        const trimmedCategory = payload.category.trim();
        if (payload.claimType === "Reimbursement" && !trimmedCategory) {
          result = { ok: false, message: "Category is required for reimbursement claims." };
          return state;
        }
        if (payload.claimType === "Advance" && !payload.advanceType) {
          result = { ok: false, message: "Advance type is required for advance requests." };
          return state;
        }
        const now = new Date().toISOString();
        const converted = convertCurrency(payload.amount, payload.currency, "EUR", state.hrFxRates, now);
        if (payload.currency !== "EUR" && converted === undefined) {
          result = { ok: false, message: "Missing FX rate for the selected currency." };
          return state;
        }
        const receiptUrl = payload.receiptUrl?.trim() || undefined;
        const attachmentUrl = payload.attachmentMeta?.url?.trim();
        const attachmentMeta = attachmentUrl
          ? {
              ...payload.attachmentMeta,
              url: attachmentUrl,
              fileName: payload.attachmentMeta?.fileName?.trim() || undefined,
              mimeType: payload.attachmentMeta?.mimeType?.trim() || undefined,
              uploadedAt: payload.attachmentMeta?.uploadedAt ?? now,
            }
          : undefined;
        const next: HrExpense = {
          ...target,
          ...payload,
          category: trimmedCategory || (payload.claimType === "Advance" ? "Advance" : "Other"),
          amount: Math.round(payload.amount * 100) / 100,
          description: trimmedDescription,
          receiptUrl,
          attachmentMeta,
          advancePurpose: payload.advancePurpose?.trim() || undefined,
          convertedAmountEUR: Math.round(((converted ?? payload.amount) * 100)) / 100,
          updatedAt: now,
        };
        result = { ok: true };
        return {
          ...state,
          hrExpenses: state.hrExpenses.map((entry) => (entry.id === expenseId ? next : entry)),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Expense",
            parentId: expenseId,
            actionType: "EDIT",
            comment: "Employee updated claim details.",
            timestamp: now,
          }),
        };
      });
      return result;
    },
    cancelHrExpense: (expenseId, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Expense not found." };
      set((state) => {
        const target = state.hrExpenses.find((row) => row.id === expenseId);
        if (!target) {
          result = { ok: false, message: "Expense not found." };
          return state;
        }
        if (target.status !== "PendingManager") {
          result = { ok: false, message: "Only PendingManager claims can be cancelled." };
          return state;
        }
        const now = new Date().toISOString();
        const trimmedComment = comment?.trim();
        result = { ok: true };
        return {
          ...state,
          hrExpenses: state.hrExpenses.map((entry) =>
            entry.id === expenseId
              ? {
                  ...entry,
                  status: "Cancelled",
                  cancelledAt: now,
                  updatedAt: now,
                }
              : entry,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Expense",
            parentId: expenseId,
            actionType: "CANCEL",
            comment: trimmedComment || "Claim cancelled by employee.",
            timestamp: now,
          }),
        };
      });
      return result;
    },
    addHrExpenseComment: (expenseId, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Expense not found." };
      set((state) => {
        const target = state.hrExpenses.find((row) => row.id === expenseId);
        if (!target) {
          result = { ok: false, message: "Expense not found." };
          return state;
        }
        const trimmedComment = comment.trim();
        if (!trimmedComment) {
          result = { ok: false, message: "Comment cannot be empty." };
          return state;
        }
        const now = new Date().toISOString();
        result = { ok: true };
        return {
          ...state,
          hrExpenses: state.hrExpenses.map((entry) => (entry.id === expenseId ? { ...entry, updatedAt: now } : entry)),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Expense",
            parentId: expenseId,
            actionType: "COMMENT",
            comment: trimmedComment,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    applyHrExpenseAction: (expenseId, actionType, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Expense not found." };
      set((state) => {
        const target = state.hrExpenses.find((row) => row.id === expenseId);
        if (!target) {
          result = { ok: false, message: "Expense not found." };
          return state;
        }
        if (!["MANAGER_APPROVE", "MANAGER_REJECT", "FINANCE_APPROVE", "FINANCE_REJECT", "MARK_PAID"].includes(actionType)) {
          result = { ok: false, message: "Unsupported action for workflow transition." };
          return state;
        }
        const trimmedComment = comment?.trim() || undefined;
        const now = new Date().toISOString();
        let next: HrExpense | null = null;
        if (actionType === "MANAGER_APPROVE" && target.status === "PendingManager") {
          next = {
            ...target,
            status: "PendingFinance",
            managerApprovedAt: now,
            rejectedAt: undefined,
            cancelledAt: undefined,
            updatedAt: now,
          };
        } else if (actionType === "MANAGER_REJECT" && target.status === "PendingManager") {
          next = {
            ...target,
            status: "Rejected",
            rejectedAt: now,
            cancelledAt: undefined,
            updatedAt: now,
          };
        } else if (actionType === "FINANCE_APPROVE" && target.status === "PendingFinance") {
          next = {
            ...target,
            status: "Approved",
            financeApprovedAt: now,
            rejectedAt: undefined,
            cancelledAt: undefined,
            updatedAt: now,
          };
        } else if (actionType === "FINANCE_REJECT" && target.status === "PendingFinance") {
          next = {
            ...target,
            status: "Rejected",
            rejectedAt: now,
            cancelledAt: undefined,
            updatedAt: now,
          };
        } else if (actionType === "MARK_PAID" && target.status === "Approved") {
          next = { ...target, status: "Paid", paidAt: now, updatedAt: now };
        }
        if (!next) {
          result = { ok: false, message: "Action is not valid for current expense status." };
          return state;
        }
        result = { ok: true };
        return {
          ...state,
          hrExpenses: state.hrExpenses.map((entry) => (entry.id === expenseId ? next : entry)),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Expense",
            parentId: expenseId,
            actionType,
            comment: trimmedComment,
            timestamp: now,
          }),
        };
      });
      return result;
    },
    generateHrPayrollSnapshot: (payload) => {
      const month = normalizePayrollMonth(payload.month);
      const snapshotId = uid("hrps");
      set((state) => {
        const preview = computePayrollPreview({
          employees: state.hrEmployees,
          compensations: state.hrCompensations,
          fxRates: state.hrFxRates,
          month,
          filters: payload.filters,
          snapshotId,
        });
        if (!preview.lines.length) {
          return {
            ...state,
            outbox: [...state.outbox, "Payroll snapshot generation produced no lines for selected filters."],
          };
        }
        const now = new Date().toISOString();
        const snapshot: HrPayrollMonthSnapshot = {
          id: snapshotId,
          month,
          createdAt: now,
          createdByUserId: state.activeUserId,
          notes: payload.notes?.trim() || undefined,
          filtersUsed: payload.filters ?? {},
          fxRateSetRef: `fx-${month}`,
          lines: preview.lines,
          totals: preview.totals,
        };
        return {
          ...state,
          hrPayrollSnapshots: [...state.hrPayrollSnapshots, snapshot],
          hrAuditLogs: appendHrAudit(state, {
            parentType: "PayrollSnapshot",
            parentId: snapshot.id,
            actionType: "PAYROLL_SNAPSHOT_GENERATED",
            comment: preview.warnings.length ? preview.warnings.join(" | ") : "Snapshot generated.",
            timestamp: now,
          }),
          outbox: preview.warnings.length > 0 ? [...state.outbox, ...preview.warnings] : state.outbox,
        };
      });
      return snapshotId;
    },
    startInterconnectionProcess: (companyId, track) =>
      set((state) => {
        const company = state.companies.find((row) => row.id === companyId);
        if (!company) {
          return state;
        }
        const exists = state.interconnectionProcesses.find((p) => p.companyId === companyId && p.track === track);
        if (exists) {
          return state;
        }
        const now = new Date().toISOString();
        const interconnectionManagerId =
          state.users.find((u) => u.role === "Interconnection Manager")?.id ?? state.activeUserId;
        const row: InterconnectionProcess = {
          id: uid("ip"),
          companyId,
          track,
          stage: "NDA",
          startedAt: now,
          updatedAt: now,
          ownerUserId: interconnectionManagerId,
          stageHistory: [{ at: now, stage: "NDA", byUserId: state.activeUserId }],
        };
        const companies = state.companies.map((entry) =>
          entry.id === companyId
            ? {
                ...entry,
                companyStatus: (entry.companyStatus === "CLIENT" ? "CLIENT" : "INTERCONNECTION") as CompanyStatus,
                movedToInterconnectionAt: entry.movedToInterconnectionAt ?? now,
              }
            : entry,
        );
        return {
          ...state,
          companies,
          interconnectionProcesses: [...state.interconnectionProcesses, row],
          notes: [
            ...state.notes,
            {
              id: uid("n"),
              companyId,
              createdByUserId: state.activeUserId,
              text: `${track} interconnection started`,
              createdAt: now,
              reminderTriggered: false,
            },
          ],
        };
      }),
    setInterconnectionStage: (processId, stage) =>
      set((state) => {
        const entry = state.interconnectionProcesses.find((row) => row.id === processId);
        if (!entry) {
          return state;
        }
        const company = state.companies.find((row) => row.id === entry.companyId);
        if (!company) {
          return state;
        }
        const missing = getStageRequirements(stage, company, processId, state.contracts);
        if (missing.length > 0) {
          return {
            ...state,
            outbox: [...state.outbox, `Stage update blocked (${entry.track} -> ${stage}): missing ${missing.join(", ")}`],
          };
        }
        const now = new Date().toISOString();
        const interconnectionProcesses = state.interconnectionProcesses.map((row) =>
          row.id === processId
            ? {
                ...row,
                stage,
                updatedAt: now,
                completedAt: stage === "Completed" ? row.completedAt ?? now : row.completedAt,
                stageHistory: [...(row.stageHistory ?? []), { at: now, stage, byUserId: state.activeUserId }],
              }
            : row,
        );
        const related = interconnectionProcesses.filter((row) => row.companyId === entry.companyId);
        const hasCompleted = related.some((row) => row.stage === "Completed");
        const hasProcess = related.length > 0;
        const nextStatus: CompanyStatus = hasCompleted ? "CLIENT" : hasProcess ? "INTERCONNECTION" : "LEAD";
        const companies = state.companies.map((company) =>
          company.id === entry.companyId
            ? {
                ...company,
                companyStatus: nextStatus,
                movedToInterconnectionAt: company.movedToInterconnectionAt ?? now,
                becameClientAt: nextStatus === "CLIENT" ? company.becameClientAt ?? now : company.becameClientAt,
              }
            : company,
        );
        const notes = [
          ...state.notes,
          {
            id: uid("n"),
            companyId: entry.companyId,
            createdByUserId: state.activeUserId,
            text: `${entry.track} interconnection stage updated to ${stage}`,
            createdAt: now,
            reminderTriggered: false,
          },
        ];
        return {
          ...state,
          companies,
          notes,
          interconnectionProcesses,
        };
      }),
    createOpsRequest: (payload) => {
      const id = uid("opr");
      const now = new Date().toISOString();
      let createdId = id;
      set((state) => {
        const status = payload.status ?? "Draft";
        const request: OpsRequest = {
          ...payload,
          id,
          status,
          createdAt: now,
          updatedAt: now,
        };
        const nextAuditLogs: OpsAuditLogEntry[] = [
          ...state.opsAuditLogs,
          {
            id: uid("opsa"),
            parentType: "Request",
            parentId: id,
            actionType: "CREATED_MANUAL",
            performedByUserId: state.activeUserId,
            comment: "Request created.",
            timestamp: now,
          },
        ];
        if (status !== "Draft") {
          nextAuditLogs.push({
            id: uid("opsa"),
            parentType: "Request",
            parentId: id,
            actionType: "SEND",
            performedByUserId: state.activeUserId,
            timestamp: new Date(new Date(now).getTime() + 60 * 1000).toISOString(),
          });
        }
        if (status === "InProgress" || status === "Done" || status === "Cancelled" || status === "Failed") {
          nextAuditLogs.push({
            id: uid("opsa"),
            parentType: "Request",
            parentId: id,
            actionType: "START",
            performedByUserId: state.activeUserId,
            timestamp: new Date(new Date(now).getTime() + 120 * 1000).toISOString(),
          });
        }
        if (status === "Done") {
          nextAuditLogs.push({
            id: uid("opsa"),
            parentType: "Request",
            parentId: id,
            actionType: requestDoneActionForType(request.requestType),
            performedByUserId: state.activeUserId,
            timestamp: new Date(new Date(now).getTime() + 180 * 1000).toISOString(),
          });
        }
        if (status === "Cancelled") {
          nextAuditLogs.push({
            id: uid("opsa"),
            parentType: "Request",
            parentId: id,
            actionType: "CANCELLED",
            performedByUserId: state.activeUserId,
            comment: "Cancelled during creation workflow.",
            timestamp: new Date(new Date(now).getTime() + 180 * 1000).toISOString(),
          });
        }
        if (status === "Failed") {
          nextAuditLogs.push({
            id: uid("opsa"),
            parentType: "Request",
            parentId: id,
            actionType: "MARK_FAILED",
            performedByUserId: state.activeUserId,
            comment: "Marked as failed during creation workflow.",
            timestamp: new Date(new Date(now).getTime() + 180 * 1000).toISOString(),
          });
        }
        createdId = request.id;
        return {
          ...state,
          opsRequests: [...state.opsRequests, request],
          opsAuditLogs: nextAuditLogs,
        };
      });
      return createdId;
    },
    updateOpsRequest: (request) =>
      set((state) => {
        const existing = state.opsRequests.find((entry) => entry.id === request.id);
        if (!existing) return state;
        if (request.status !== existing.status) {
          return {
            ...state,
            outbox: [...state.outbox, "Ops request status changes must go through actions."],
          };
        }
        return {
          ...state,
          opsRequests: state.opsRequests.map((entry) =>
            entry.id === request.id
              ? {
                  ...request,
                  updatedAt: new Date().toISOString(),
                }
              : entry,
          ),
        };
      }),
    applyOpsRequestAction: (requestId, actionType, options) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Request not found." };
      set((state) => {
        const request = state.opsRequests.find((entry) => entry.id === requestId);
        if (!request) {
          result = { ok: false, message: "Request not found." };
          return state;
        }
        const comment = options?.comment?.trim();
        if (requiresRequestComment(actionType) && !comment) {
          result = { ok: false, message: "Comment is mandatory for this action." };
          return state;
        }
        const isDoneAction =
          actionType === "ROUTING_DONE" ||
          actionType === "TT_SENT" ||
          actionType === "TEST_DONE" ||
          actionType === "LOSS_ACCEPTED";
        if (isDoneAction && actionType !== requestDoneActionForType(request.requestType)) {
          result = { ok: false, message: "This action does not match request type." };
          return state;
        }
        const nextStatus = nextRequestStatusForAction(request.status, actionType);
        if (!nextStatus) {
          result = { ok: false, message: "Action is not valid for current status." };
          return state;
        }
        const doneByUserId = options?.doneByUserId ?? state.activeUserId;
        const now = new Date().toISOString();
        const nextRequest: OpsRequest = {
          ...request,
          status: nextStatus,
          updatedAt: now,
        };
        result = { ok: true };
        return {
          ...state,
          opsRequests: state.opsRequests.map((entry) => (entry.id === requestId ? nextRequest : entry)),
          opsAuditLogs: [
            ...state.opsAuditLogs,
            {
              id: uid("opsa"),
              parentType: "Request",
              parentId: requestId,
              actionType,
              performedByUserId: doneByUserId,
              comment,
              timestamp: now,
            },
          ],
        };
      });
      return result;
    },
    createOpsCase: (payload) => {
      const id = uid("opc");
      const now = new Date().toISOString();
      let createdId = id;
      set((state) => {
        const track = payload.track ?? payload.relatedTrack ?? "SMS";
        const category = payload.category ?? inferCaseCategoryFromModule(payload.moduleOrigin);
        const detectedAt = payload.detectedAt ?? now;
        const slaProfileId = payload.slaProfileId ?? buildOpsSlaProfileId(category);
        const row: OpsCase = {
          ...payload,
          portalOrigin: payload.portalOrigin ?? (track === "SMS" ? "sms-noc" : "voice-noc"),
          track,
          relatedTrack: track,
          category,
          detectedAt,
          metadata:
            payload.metadata ??
            buildFallbackOpsMetadata(category, detectedAt, payload.relatedProvider, payload.relatedDestination),
          slaProfileId,
          slaDeadline: payload.slaDeadline ?? computeSlaDeadline(detectedAt, slaProfileId, payload.severity),
          linkedSignalIds: payload.linkedSignalIds ?? [],
          id,
          createdAt: now,
          updatedAt: now,
        };
        createdId = id;
        return {
          ...state,
          opsCases: [...state.opsCases, row],
          opsAuditLogs: [
            ...state.opsAuditLogs,
            {
              id: uid("opsa"),
              parentType: "Case",
              parentId: id,
              actionType: "CREATED_MANUAL",
              performedByUserId: state.activeUserId,
              comment: "Case created manually.",
              timestamp: now,
            },
          ],
        };
      });
      return createdId;
    },
    updateOpsCase: (opsCase) =>
      set((state) => {
        const existing = state.opsCases.find((entry) => entry.id === opsCase.id);
        if (!existing) return state;
        if (opsCase.status !== existing.status) {
          return {
            ...state,
            outbox: [...state.outbox, "Ops case status changes must go through actions."],
          };
        }
        return {
          ...state,
          opsCases: state.opsCases.map((entry) =>
            entry.id === opsCase.id
              ? {
                  ...opsCase,
                  updatedAt: new Date().toISOString(),
                }
              : entry,
          ),
        };
      }),
    applyOpsCaseAction: (caseId, actionType, options) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Case not found." };
      set((state) => {
        const target = state.opsCases.find((entry) => entry.id === caseId);
        if (!target) {
          result = { ok: false, message: "Case not found." };
          return state;
        }
        const normalizedActionType = normalizeCaseActionType(actionType);
        const comment = options?.comment?.trim();
        if (requiresCaseCommentByPolicy(target, normalizedActionType) && !comment) {
          result = { ok: false, message: "Comment is mandatory for this action." };
          return state;
        }
        const ttNumber = options?.ttNumber?.trim();
        if (requiresTtNumber(target, normalizedActionType) && !ttNumber) {
          result = { ok: false, message: "TT number is mandatory for this action." };
          return state;
        }
        const doneByUserId = options?.doneByUserId ?? state.activeUserId;
        const now = new Date().toISOString();
        if (normalizedActionType === "ASSIGN") {
          if (!options?.assignedToUserId) {
            result = { ok: false, message: "Select assignee first." };
            return state;
          }
          const nextCase: OpsCase = {
            ...target,
            assignedToUserId: options.assignedToUserId,
            updatedAt: now,
          };
          result = { ok: true };
          return {
            ...state,
            opsCases: state.opsCases.map((entry) => (entry.id === caseId ? nextCase : entry)),
            opsAuditLogs: [
              ...state.opsAuditLogs,
              {
                id: uid("opsa"),
                parentType: "Case",
                parentId: caseId,
                actionType: normalizedActionType,
                performedByUserId: doneByUserId,
                comment: comment ?? `Assigned to ${options.assignedToUserId}.`,
                timestamp: now,
              },
            ],
          };
        }
        if (normalizedActionType === "COMMENT") {
          result = { ok: true };
          return {
            ...state,
            opsAuditLogs: [
              ...state.opsAuditLogs,
              {
                id: uid("opsa"),
                parentType: "Case",
                parentId: caseId,
                actionType: normalizedActionType,
                performedByUserId: doneByUserId,
                comment,
                timestamp: now,
              },
            ],
          };
        }
        const nextStatus = policyNextCaseStatusForAction(target, normalizedActionType);
        if (!nextStatus) {
          result = { ok: false, message: "Action is not valid for current status." };
          return state;
        }
        const resolutionType = resolutionTypeForAction(target, normalizedActionType, options?.resolutionType);
        const completesSla = actionCompletesSla(target, normalizedActionType);
        const definition = getCaseActionDefinition(target, normalizedActionType);
        const dispositionComment = comment ?? definition?.label;
        const nextCase: OpsCase = {
          ...target,
          status: nextStatus,
          resolvedAt: nextStatus === "RESOLVED" ? now : target.resolvedAt,
          ignoredAt: nextStatus === "IGNORED" ? now : target.ignoredAt,
          cancelledAt: nextStatus === "CANCELLED" ? now : target.cancelledAt,
          resolutionType: resolutionType ?? target.resolutionType,
          ttNumber: normalizedActionType === "TT_RAISED" ? ttNumber : target.ttNumber,
          ttRaisedAt: normalizedActionType === "TT_RAISED" ? now : target.ttRaisedAt,
          disposition:
            resolutionType && completesSla
              ? {
                  resolutionType,
                  performedByUserId: doneByUserId,
                  performedAt: now,
                  comment: dispositionComment,
                }
              : target.disposition,
          updatedAt: now,
        };
        result = { ok: true };
        return {
          ...state,
          opsCases: state.opsCases.map((entry) => (entry.id === caseId ? nextCase : entry)),
          opsAuditLogs: [
            ...state.opsAuditLogs,
            {
              id: uid("opsa"),
              parentType: "Case",
              parentId: caseId,
                actionType: normalizedActionType,
              performedByUserId: doneByUserId,
              comment,
                resolutionType,
                ttNumber: normalizedActionType === "TT_RAISED" ? ttNumber : undefined,
                caseActionId: uid("opca"),
              timestamp: now,
            },
          ],
        };
      });
      return result;
    },
    createOpsMonitoringSignal: (payload) => {
      const id = uid("opsg");
      const now = new Date().toISOString();
      const track = payload.track ?? payload.relatedTrack ?? "SMS";
      const moduleOrigin = payload.moduleOrigin;
      const category = payload.category ?? inferCaseCategoryFromModule(moduleOrigin);
      const detectedAt = payload.detectedAt ?? now;
      set((state) => ({
        ...state,
        opsMonitoringSignals: [
          ...state.opsMonitoringSignals,
          {
            ...payload,
            track,
            relatedTrack: track,
            moduleOrigin,
            category,
            detectedAt,
            metadata:
              payload.metadata ?? buildFallbackOpsMetadata(category, detectedAt, payload.relatedProvider, payload.relatedDestination),
            id,
            createdAt: now,
          },
        ],
      }));
      return id;
    },
    ingestOpsMonitoringSignals: (signals, options) => {
      let createdCount = 0;
      set((state) => {
        const autoCreate = options?.autoCreate ?? true;
        const now = new Date().toISOString();
        const nextSignals = [...state.opsMonitoringSignals];
        const nextCases = [...state.opsCases];
        const nextAudit = [...state.opsAuditLogs];
        signals.forEach((signal) => {
          const track = signal.track ?? signal.relatedTrack ?? "SMS";
          const moduleOrigin = signal.moduleOrigin;
          const category = signal.category ?? inferCaseCategoryFromModule(moduleOrigin);
          const detectedAt = signal.detectedAt ?? now;
          const metadata =
            signal.metadata ?? buildFallbackOpsMetadata(category, detectedAt, signal.relatedProvider, signal.relatedDestination);
          const alreadyExists = nextSignals.some(
            (entry) => entry.fingerprint === signal.fingerprint && entry.moduleOrigin === moduleOrigin,
          );
          if (alreadyExists) {
            return;
          }
          const signalId = uid("opsg");
          createdCount += 1;
          let createdCaseId: string | undefined;
          if (autoCreate) {
            const openCase = nextCases.find(
              (entry) =>
                !isOpsCaseTerminal(entry.status) &&
                entry.moduleOrigin === moduleOrigin &&
                entry.track === track &&
                entry.category === category &&
                entry.relatedProvider === signal.relatedProvider &&
                entry.relatedDestination === signal.relatedDestination,
            );
            if (openCase) {
              createdCaseId = openCase.id;
              openCase.updatedAt = now;
              openCase.lastSignalAt = detectedAt;
              if (!openCase.linkedSignalIds.includes(signalId)) {
                openCase.linkedSignalIds = [...openCase.linkedSignalIds, signalId];
              }
              nextAudit.push({
                id: uid("opsa"),
                parentType: "Case",
                parentId: openCase.id,
                actionType: "SIGNAL_REFRESHED",
                performedByUserId: state.activeUserId,
                comment: "Additional monitoring signal matched this open case.",
                timestamp: now,
              });
            } else {
              const caseId = uid("opc");
              createdCaseId = caseId;
              const slaProfileId = buildOpsSlaProfileId(category);
              nextCases.push({
                id: caseId,
                portalOrigin: track === "SMS" ? "sms-noc" : "voice-noc",
                moduleOrigin,
                track,
                relatedTrack: track,
                severity: signal.severity,
                category,
                detectedAt,
                metadata,
                relatedCompanyId: signal.relatedCompanyId,
                relatedProvider: signal.relatedProvider,
                relatedDestination: signal.relatedDestination,
                description: signal.description,
                status: "NEW",
                slaProfileId,
                slaDeadline: computeSlaDeadline(detectedAt, slaProfileId, signal.severity),
                linkedSignalIds: [signalId],
                lastSignalAt: detectedAt,
                createdAt: now,
                updatedAt: now,
              });
              nextAudit.push({
                id: uid("opsa"),
                parentType: "Case",
                parentId: caseId,
                actionType: "CREATED_AUTO",
                performedByUserId: state.activeUserId,
                comment: "Case auto-created from monitoring signal.",
                timestamp: now,
              });
            }
          }
          nextSignals.push({
            ...signal,
            moduleOrigin,
            track,
            relatedTrack: track,
            category,
            detectedAt,
            metadata,
            id: signalId,
            createdAt: now,
            createdCaseId,
          });
        });
        return {
          ...state,
          opsMonitoringSignals: nextSignals,
          opsCases: nextCases,
          opsAuditLogs: nextAudit,
        };
      });
      return createdCount;
    },
    createOpsShift: (payload) => {
      const id = uid("opsh");
      const now = new Date().toISOString();
      const payloadTrack = String(payload.track ?? "");
      const track = payloadTrack === "VOICE" || payloadTrack === "Voice" ? "VOICE" : payloadTrack === "SMS" ? "SMS" : "BOTH";
      set((state) => ({
        ...state,
        opsShifts: [
          ...state.opsShifts,
          {
            ...payload,
            track,
            id,
            userIds: Array.from(new Set(payload.userIds)),
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
      return id;
    },
    updateOpsShift: (shift) =>
      set((state) => ({
        ...state,
        opsShifts: state.opsShifts.map((entry) =>
          entry.id === shift.id
            ? {
                ...shift,
                track:
                  String(shift.track) === "VOICE" || String(shift.track) === "Voice"
                    ? "VOICE"
                    : String(shift.track) === "SMS"
                      ? "SMS"
                      : "BOTH",
                userIds: Array.from(new Set(shift.userIds)),
                updatedAt: new Date().toISOString(),
              }
            : entry,
        ),
      })),
    deleteOpsShift: (shiftId) =>
      set((state) => ({
        ...state,
        opsShifts: state.opsShifts.filter((entry) => entry.id !== shiftId),
      })),
    resetDemoData: () =>
      set((state) => ({
        ...state,
        ...createSeedDb(),
      })),
    exportData: () => JSON.stringify(get(), null, 2),
    importData: (raw) => {
      try {
        const parsed = JSON.parse(raw);
        if (!validateImportShape(parsed)) {
          return { ok: false, message: "Invalid data structure." };
        }
        const data = parsed as Partial<AppStore>;
        set((state) => ({
          ...state,
          ...data,
          tasks: Array.isArray(data.tasks) ? data.tasks : state.tasks,
          taskComments: Array.isArray(data.taskComments) ? data.taskComments : [],
          projects: Array.isArray(data.projects) ? data.projects : [],
          projectWeeklyReports: Array.isArray(data.projectWeeklyReports) ? data.projectWeeklyReports : [],
          hrLegalEntities: Array.isArray(data.hrLegalEntities) ? data.hrLegalEntities : state.hrLegalEntities,
          hrFxRates: Array.isArray(data.hrFxRates) ? data.hrFxRates : state.hrFxRates,
          hrDepartments: Array.isArray(data.hrDepartments) ? data.hrDepartments : state.hrDepartments,
          hrEmployees: Array.isArray(data.hrEmployees) ? data.hrEmployees : state.hrEmployees,
          hrCompensations: Array.isArray(data.hrCompensations) ? data.hrCompensations : state.hrCompensations,
          hrPayrollSnapshots: Array.isArray(data.hrPayrollSnapshots) ? data.hrPayrollSnapshots : state.hrPayrollSnapshots,
          hrLeaveProfiles: Array.isArray(data.hrLeaveProfiles) ? data.hrLeaveProfiles : state.hrLeaveProfiles,
          hrLeaveRequests: Array.isArray(data.hrLeaveRequests) ? data.hrLeaveRequests : state.hrLeaveRequests,
          hrAssets: Array.isArray(data.hrAssets) ? data.hrAssets : state.hrAssets,
          hrSoftwareLicenses: Array.isArray(data.hrSoftwareLicenses) ? data.hrSoftwareLicenses : state.hrSoftwareLicenses,
          hrAssetAssignments: Array.isArray(data.hrAssetAssignments) ? data.hrAssetAssignments : state.hrAssetAssignments,
          hrSoftwareProducts: Array.isArray(data.hrSoftwareProducts) ? data.hrSoftwareProducts : state.hrSoftwareProducts,
          hrSoftwareSeats: Array.isArray(data.hrSoftwareSeats) ? data.hrSoftwareSeats : state.hrSoftwareSeats,
          hrProvisionRequests: Array.isArray(data.hrProvisionRequests) ? data.hrProvisionRequests : state.hrProvisionRequests,
          hrExpenses: Array.isArray(data.hrExpenses) ? data.hrExpenses : state.hrExpenses,
          hrAuditLogs: Array.isArray(data.hrAuditLogs) ? data.hrAuditLogs : state.hrAuditLogs,
          opsRequests: Array.isArray(data.opsRequests) ? data.opsRequests : state.opsRequests,
          opsCases: Array.isArray(data.opsCases) ? data.opsCases : state.opsCases,
          opsMonitoringSignals: Array.isArray(data.opsMonitoringSignals) ? data.opsMonitoringSignals : state.opsMonitoringSignals,
          opsAuditLogs: Array.isArray(data.opsAuditLogs) ? data.opsAuditLogs : state.opsAuditLogs,
          opsShifts: Array.isArray(data.opsShifts) ? data.opsShifts : state.opsShifts,
          opsSlaProfiles: Array.isArray(data.opsSlaProfiles) ? data.opsSlaProfiles : state.opsSlaProfiles,
        }));
        return { ok: true, message: "Data imported successfully." };
      } catch {
        return { ok: false, message: "Invalid JSON." };
      }
    },
    processReminders: () =>
      set((state) => {
        const now = Date.now();
        const due = state.notes.filter(
          (note) =>
            Boolean(note.reminderAt) &&
            !note.reminderTriggered &&
            new Date(note.reminderAt as string).getTime() <= now,
        );
        if (!due.length) {
          return state;
        }

        const nextNotes = state.notes.map((note) =>
          due.find((x) => x.id === note.id) ? { ...note, reminderTriggered: true } : note,
        );
        const outbox = [
          ...state.outbox,
          ...due.map((note) => `Reminder: ${note.text.slice(0, 80)} (${note.id})`),
        ];
        return {
          ...state,
          notes: nextNotes,
          outbox,
        };
      }),
    convertNoteToTask: (noteId, assigneeUserId) =>
      set((state) => {
        const note = state.notes.find((x) => x.id === noteId);
        if (!note) {
          return state;
        }
        const now = new Date().toISOString();
        const taskId = uid("t");
        return {
          ...state,
          tasks: [
            ...state.tasks,
            {
              id: taskId,
              title: "Follow-up from note",
              description: note.text,
              status: "Open",
              priority: "Medium",
              createdByUserId: state.activeUserId,
              assigneeUserId,
              watcherUserIds: Array.from(new Set([state.activeUserId, assigneeUserId])),
              visibility: state.activeUserId === assigneeUserId ? "Private" : "Shared",
              companyId: note.companyId,
              eventId: note.relatedEventId,
              meetingId: note.relatedMeetingId,
              noteId: note.id,
              createdAt: now,
              updatedAt: now,
            },
          ],
          taskComments: [
            ...state.taskComments,
            {
              id: uid("tc"),
              taskId,
              authorUserId: state.activeUserId,
              content: "Task created from meeting note.",
              kind: "Comment",
              createdAt: now,
            },
          ],
        };
      }),
  };
}

export const useAppStore = create<AppStore>()(
  persist(createStoreSlice, {
    name: STORAGE_KEY,
    version: 18,
    migrate: (persistedState, storedVersion) => {
      const state = persistedState as
        | (Partial<AppStore> & {
            onboarding?: Array<Record<string, unknown>>;
            companies?: Array<Record<string, unknown>>;
            contracts?: Array<Record<string, unknown>>;
            ourCompanyInfo?: Array<Record<string, unknown>>;
            tasks?: Array<Record<string, unknown>>;
            taskComments?: Array<Record<string, unknown>>;
            projects?: Array<Record<string, unknown>>;
            projectWeeklyReports?: Array<Record<string, unknown>>;
            opsRequests?: Array<Record<string, unknown>>;
            opsCases?: Array<Record<string, unknown>>;
            opsMonitoringSignals?: Array<Record<string, unknown>>;
            opsAuditLogs?: Array<Record<string, unknown>>;
            opsShifts?: Array<Record<string, unknown>>;
            opsSlaProfiles?: Array<Record<string, unknown>>;
            hrLegalEntities?: Array<Record<string, unknown>>;
            hrFxRates?: Array<Record<string, unknown>>;
            hrDepartments?: Array<Record<string, unknown>>;
            hrEmployees?: Array<Record<string, unknown>>;
            hrCompensations?: Array<Record<string, unknown>>;
            hrPayrollSnapshots?: Array<Record<string, unknown>>;
            hrLeaveProfiles?: Array<Record<string, unknown>>;
            hrLeaveRequests?: Array<Record<string, unknown>>;
            hrAssets?: Array<Record<string, unknown>>;
            hrSoftwareLicenses?: Array<Record<string, unknown>>;
            hrAssetAssignments?: Array<Record<string, unknown>>;
            hrSoftwareProducts?: Array<Record<string, unknown>>;
            hrSoftwareSeats?: Array<Record<string, unknown>>;
            hrProvisionRequests?: Array<Record<string, unknown>>;
            hrExpenses?: Array<Record<string, unknown>>;
            hrAuditLogs?: Array<Record<string, unknown>>;
          })
        | undefined;
      if (!state || !Array.isArray(state.users) || !Array.isArray(state.events) || !Array.isArray(state.companies)) {
        return createSeedDb() as unknown as AppStore;
      }
      const fallback = createSeedDb();
      const users = state.users.map((row, idx) => {
        const user = row as unknown as Record<string, unknown>;
        return {
          id: typeof user.id === "string" ? user.id : `u-migrated-${idx + 1}`,
          name: typeof user.name === "string" ? user.name : `User ${idx + 1}`,
          role:
            user.role === "Sales" ||
            user.role === "Interconnection Manager" ||
            user.role === "NOC" ||
            user.role === "Head of SMS" ||
            user.role === "Head of Voice"
              ? user.role
              : "Sales",
          color: typeof user.color === "string" ? user.color : "#1d4ed8",
          defaultOurEntity: normalizeOurEntity(user.defaultOurEntity) ?? "UK",
        };
      });
      const activeUserId = typeof state.activeUserId === "string" ? state.activeUserId : users[0]?.id ?? fallback.activeUserId;

      const eventStaff = Array.isArray(state.eventStaff)
        ? state.eventStaff.map((row) => {
            const legacy = row as EventStaff & { flightOut?: string; flightBack?: string };
            return {
              ...legacy,
              flightOutNumber: legacy.flightOutNumber ?? legacy.flightOut ?? "",
              flightOutDepartAt: legacy.flightOutDepartAt ?? "",
              flightOutArriveAt: legacy.flightOutArriveAt ?? "",
              flightBackNumber: legacy.flightBackNumber ?? legacy.flightBack ?? "",
              flightBackDepartAt: legacy.flightBackDepartAt ?? "",
              flightBackArriveAt: legacy.flightBackArriveAt ?? "",
              pnr: legacy.pnr ?? "",
              hotelName: legacy.hotelName ?? "",
              checkIn: legacy.checkIn ?? "",
              checkOut: legacy.checkOut ?? "",
              bookingRef: legacy.bookingRef ?? "",
            };
          })
        : fallback.eventStaff;
      const rawProcesses = Array.isArray(state.interconnectionProcesses)
        ? state.interconnectionProcesses
        : Array.isArray(state.onboarding)
          ? state.onboarding
          : [];
      const interconnectionManagerId = users.find((u) => u.role === "Interconnection Manager")?.id ?? activeUserId;
      const interconnectionProcesses = rawProcesses.map((row, idx) => {
        const raw = row as Record<string, unknown> & {
          roles?: { interconnectionManager?: string };
          stageHistory?: InterconnectionProcess["stageHistory"];
        };
        const stage = mapLegacyStage(raw.stage);
        const startedAt = typeof raw.startedAt === "string" ? raw.startedAt : new Date().toISOString();
        const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : startedAt;
        return {
          id: typeof raw.id === "string" ? raw.id : `ip-migrated-${idx + 1}`,
          companyId: String(raw.companyId ?? ""),
          track: mapLegacyTrack(raw.track),
          stage,
          startedAt,
          updatedAt,
          completedAt:
            stage === "Completed"
              ? typeof raw.completedAt === "string"
                ? raw.completedAt
                : updatedAt
              : undefined,
          ownerUserId:
            typeof raw.ownerUserId === "string"
              ? raw.ownerUserId
              : raw.roles?.interconnectionManager ?? interconnectionManagerId,
          stageHistory: Array.isArray(raw.stageHistory)
            ? raw.stageHistory
            : [{ at: startedAt, stage, byUserId: interconnectionManagerId }],
        } as InterconnectionProcess;
      });
      const companies = state.companies.map((row, idx) => {
        const company = row as Record<string, unknown> & Company & { leadState?: string; convertedToClientAt?: string };
        const ownerUserId = typeof company.ownerUserId === "string" ? company.ownerUserId : activeUserId;
        const related = interconnectionProcesses.filter((process) => process.companyId === company.id);
        const hasProcess = related.length > 0;
        const hasCompleted = related.some((process) => process.stage === "Completed");
        const fromLegacyStatus =
          company.companyStatus === "LEAD" || company.companyStatus === "INTERCONNECTION" || company.companyStatus === "CLIENT"
            ? company.companyStatus
            : company.lifecycle === "Account" || company.status === "Completed"
              ? "CLIENT"
              : "LEAD";
        const companyStatus: CompanyStatus = hasCompleted ? "CLIENT" : hasProcess ? "INTERCONNECTION" : fromLegacyStatus;
        const movedToInterconnectionAt =
          typeof company.movedToInterconnectionAt === "string"
            ? company.movedToInterconnectionAt
            : related[0]?.startedAt;
        const becameClientAt =
          companyStatus === "CLIENT"
            ? typeof company.becameClientAt === "string"
              ? company.becameClientAt
              : typeof company.convertedToClientAt === "string"
                ? company.convertedToClientAt
                : related.find((process) => process.stage === "Completed")?.completedAt ?? new Date().toISOString()
            : undefined;
        const rawEmails =
          company.emails && typeof company.emails === "object" ? (company.emails as Record<string, unknown>) : {};
        const creditLimit =
          typeof company.creditLimit === "number"
            ? company.creditLimit
            : typeof company.creditLimit === "string" && Number.isFinite(Number(company.creditLimit))
              ? Number(company.creditLimit)
              : undefined;
        return {
          id: typeof company.id === "string" ? company.id : `c-migrated-${idx + 1}`,
          name: typeof company.name === "string" ? company.name : `Company ${idx + 1}`,
          companyStatus,
          leadDisposition: mapLegacyLeadDisposition(company.leadDisposition ?? company.leadState),
          ourEntity: inferOurEntity(company),
          createdAt: typeof company.createdAt === "string" ? company.createdAt : new Date().toISOString(),
          createdFromEventId: typeof company.createdFromEventId === "string" ? company.createdFromEventId : undefined,
          createdFrom: company.createdFrom === "Event" ? "Event" : "Manual",
          region: typeof company.region === "string" ? company.region : undefined,
          address: mapCompanyAddress(company),
          taxId: typeof company.taxId === "string" ? company.taxId : undefined,
          website: typeof company.website === "string" ? company.website : undefined,
          mainPhone: typeof company.mainPhone === "string" ? company.mainPhone : undefined,
          billingTerm: typeof company.billingTerm === "string" ? company.billingTerm : undefined,
          currency: typeof company.currency === "string" ? company.currency : undefined,
          creditLimit,
          type: company.type ?? "Aggregator",
          interconnectionType: company.interconnectionType ?? "Two-way",
          workscope: Array.isArray(company.workscope) && company.workscope.length ? company.workscope : ["SMS"],
          ownerUserId,
          watcherUserIds: Array.from(new Set([...(company.watcherUserIds ?? []), ownerUserId].filter(Boolean))),
          internalAmUserId: typeof company.internalAmUserId === "string" ? company.internalAmUserId : undefined,
          counterpartyAmName: typeof company.counterpartyAmName === "string" ? company.counterpartyAmName : undefined,
          primaryContactIds: mapPrimaryContactIds(company),
          movedToInterconnectionAt,
          becameClientAt,
          evaluation: mapLegacyEvaluation(company),
          tags: Array.isArray(company.tags) ? company.tags : [],
          emails: {
            technical: typeof rawEmails.technical === "string" ? rawEmails.technical : undefined,
            finance: typeof rawEmails.finance === "string" ? rawEmails.finance : undefined,
            invoice: typeof rawEmails.invoice === "string" ? rawEmails.invoice : undefined,
            rates: typeof rawEmails.rates === "string" ? rawEmails.rates : undefined,
          },
        } as Company;
      });

      const contacts = Array.isArray(state.contacts)
        ? state.contacts.map((row, idx) => {
            const contact = row as Record<string, unknown> & Contact;
            return {
              id: typeof contact.id === "string" ? contact.id : `p-migrated-${idx + 1}`,
              companyId: typeof contact.companyId === "string" ? contact.companyId : undefined,
              name: typeof contact.name === "string" ? contact.name : `Contact ${idx + 1}`,
              title: typeof contact.title === "string" ? contact.title : "",
              phone: typeof contact.phone === "string" ? contact.phone : "",
              mobile: typeof contact.mobile === "string" ? contact.mobile : undefined,
              skypeId: typeof contact.skypeId === "string" ? contact.skypeId : undefined,
              email: typeof contact.email === "string" ? contact.email : undefined,
              roleTags: mapContactRoleTags(contact.roleTags),
            } as Contact;
          })
        : fallback.contacts;

      const meetings = Array.isArray(state.meetings)
        ? state.meetings.map((meeting) => ({
            ...meeting,
            status: meeting.status === "Completed" ? "Completed" : "Scheduled",
          }))
        : fallback.meetings;

      const hasTasksArray = Array.isArray(state.tasks);
      const rawTasks = hasTasksArray ? (state.tasks as unknown as Array<Record<string, unknown>>) : [];
      const tasks = hasTasksArray
        ? rawTasks.map((row, idx) => {
            const raw = row as unknown as Record<string, unknown>;
            const status = mapLegacyTaskStatus(raw.status);
            const createdByUserId = typeof raw.createdByUserId === "string" ? raw.createdByUserId : activeUserId;
            const assigneeUserId = typeof raw.assigneeUserId === "string" ? raw.assigneeUserId : createdByUserId;
            const updates = Array.isArray(raw.updates) ? raw.updates : [];
            const updateTimes = updates
              .map((update) => {
                const entry = update as Record<string, unknown>;
                return typeof entry.createdAt === "string" ? entry.createdAt : undefined;
              })
              .filter((value): value is string => Boolean(value));
            const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : updateTimes[0] ?? new Date().toISOString();
            const updatedAt =
              typeof raw.updatedAt === "string" ? raw.updatedAt : updateTimes[updateTimes.length - 1] ?? createdAt;
            const explicitWatchers = Array.isArray(raw.watcherUserIds)
              ? raw.watcherUserIds.filter((entry): entry is string => typeof entry === "string")
              : [];
            const visibility =
              raw.visibility === "Private" || raw.visibility === "Shared"
                ? raw.visibility
                : createdByUserId === assigneeUserId
                  ? "Private"
                  : "Shared";
            return {
              id: typeof raw.id === "string" ? raw.id : `t-migrated-${idx + 1}`,
              title: typeof raw.title === "string" ? raw.title : `Task ${idx + 1}`,
              description: typeof raw.description === "string" ? raw.description : "",
              status,
              priority: mapLegacyTaskPriority(raw.priority),
              dueAt: typeof raw.dueAt === "string" ? raw.dueAt : undefined,
              createdByUserId,
              assigneeUserId,
              watcherUserIds: Array.from(new Set([...explicitWatchers, createdByUserId, assigneeUserId].filter(Boolean))),
              visibility,
              companyId:
                typeof raw.companyId === "string"
                  ? raw.companyId
                  : typeof raw.relatedCompanyId === "string"
                    ? raw.relatedCompanyId
                    : undefined,
              eventId:
                typeof raw.eventId === "string"
                  ? raw.eventId
                  : typeof raw.relatedEventId === "string"
                    ? raw.relatedEventId
                    : undefined,
              interconnectionProcessId:
                typeof raw.interconnectionProcessId === "string" ? raw.interconnectionProcessId : undefined,
              projectId: typeof raw.projectId === "string" ? raw.projectId : undefined,
              meetingId:
                typeof raw.meetingId === "string"
                  ? raw.meetingId
                  : typeof raw.relatedMeetingId === "string"
                    ? raw.relatedMeetingId
                    : undefined,
              noteId:
                typeof raw.noteId === "string"
                  ? raw.noteId
                  : typeof raw.relatedNoteId === "string"
                    ? raw.relatedNoteId
                    : undefined,
              createdAt,
              updatedAt,
              completedAt:
                status === "Done"
                  ? typeof raw.completedAt === "string"
                    ? raw.completedAt
                    : updatedAt
                  : undefined,
              archivedAt:
                status === "Done" && typeof raw.archivedAt === "string"
                  ? raw.archivedAt
                  : undefined,
              isUrgent: typeof raw.isUrgent === "boolean" ? raw.isUrgent : undefined,
              kanbanStage:
                raw.kanbanStage === "Backlog" || raw.kanbanStage === "InProgress" || raw.kanbanStage === "Done"
                  ? raw.kanbanStage
                  : undefined,
              labelIds: Array.isArray(raw.labelIds)
                ? raw.labelIds.filter((id): id is string => typeof id === "string")
                : undefined,
            } as Task;
          })
        : fallback.tasks;

      const taskCommentsFromState = Array.isArray(state.taskComments)
        ? state.taskComments
            .map((row, idx) => {
              const raw = row as unknown as Record<string, unknown>;
              const taskId = typeof raw.taskId === "string" ? raw.taskId : "";
              const content =
                typeof raw.content === "string" ? raw.content : typeof raw.text === "string" ? raw.text : "";
              if (!taskId || !content.trim()) return undefined;
              return {
                id: typeof raw.id === "string" ? raw.id : `tc-migrated-${idx + 1}`,
                taskId,
                authorUserId:
                  typeof raw.authorUserId === "string"
                    ? raw.authorUserId
                    : typeof raw.createdByUserId === "string"
                      ? raw.createdByUserId
                      : activeUserId,
                content,
                kind: raw.kind === "Blocker" ? "Blocker" : "Comment",
                createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
              } as TaskComment;
            })
            .filter((entry): entry is TaskComment => Boolean(entry))
        : [];

      const legacyTaskComments = rawTasks.flatMap((row, taskIdx) => {
        const raw = row as unknown as Record<string, unknown>;
        const taskId = typeof raw.id === "string" ? raw.id : `t-migrated-${taskIdx + 1}`;
        if (!Array.isArray(raw.updates)) return [] as TaskComment[];
        return raw.updates
          .map((update, updateIdx) => {
            const entry = update as Record<string, unknown>;
            const content = typeof entry.text === "string" ? entry.text : typeof entry.content === "string" ? entry.content : "";
            if (!content.trim()) return undefined;
            return {
              id: typeof entry.id === "string" ? entry.id : `tc-legacy-${taskIdx + 1}-${updateIdx + 1}`,
              taskId,
              authorUserId:
                typeof entry.createdByUserId === "string"
                  ? entry.createdByUserId
                  : typeof entry.authorUserId === "string"
                    ? entry.authorUserId
                    : activeUserId,
              content,
              kind: "Comment",
              createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
            } as TaskComment;
          })
          .filter((entry): entry is TaskComment => Boolean(entry));
      });

      const taskIds = new Set(tasks.map((task) => task.id));
      const taskCommentMap = new Map<string, TaskComment>();
      [...taskCommentsFromState, ...legacyTaskComments].forEach((comment) => {
        if (!taskIds.has(comment.taskId)) return;
        taskCommentMap.set(comment.id, comment);
      });
      const mergedTaskComments = Array.from(taskCommentMap.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const taskComments =
        hasTasksArray || Array.isArray(state.taskComments) ? mergedTaskComments : fallback.taskComments;

      const projects = Array.isArray(state.projects)
        ? state.projects
            .map((row, idx) => {
              const raw = row as unknown as Record<string, unknown>;
              const ownerUserId = typeof raw.ownerUserId === "string" ? raw.ownerUserId : activeUserId;
              const managerUserIds = Array.isArray(raw.managerUserIds)
                ? raw.managerUserIds.filter((entry): entry is string => typeof entry === "string")
                : [];
              const technicalResponsibleUserId =
                typeof raw.technicalResponsibleUserId === "string"
                  ? raw.technicalResponsibleUserId
                  : Array.isArray(raw.technicalResponsibleIds) &&
                      typeof raw.technicalResponsibleIds[0] === "string"
                    ? (raw.technicalResponsibleIds[0] as string)
                    : ownerUserId;
              const salesResponsibleUserId =
                typeof raw.salesResponsibleUserId === "string"
                  ? raw.salesResponsibleUserId
                  : Array.isArray(raw.salesResponsibleIds) && typeof raw.salesResponsibleIds[0] === "string"
                    ? (raw.salesResponsibleIds[0] as string)
                    : ownerUserId;
              const productResponsibleUserId =
                typeof raw.productResponsibleUserId === "string"
                  ? raw.productResponsibleUserId
                  : Array.isArray(raw.productResponsibleIds) && typeof raw.productResponsibleIds[0] === "string"
                    ? (raw.productResponsibleIds[0] as string)
                    : ownerUserId;
              const watcherUserIds = Array.isArray(raw.watcherUserIds)
                ? raw.watcherUserIds.filter((entry): entry is string => typeof entry === "string")
                : [];
              const normalizedManagers = Array.from(new Set([...managerUserIds, ownerUserId].filter(Boolean)));
              return {
                id: typeof raw.id === "string" ? raw.id : `pr-migrated-${idx + 1}`,
                name: typeof raw.name === "string" ? raw.name : `Project ${idx + 1}`,
                description: typeof raw.description === "string" ? raw.description : "",
                ownerUserId,
                managerUserIds: normalizedManagers,
                technicalResponsibleUserId,
                salesResponsibleUserId,
                productResponsibleUserId,
                watcherUserIds: Array.from(
                  new Set(
                    [
                      ...watcherUserIds,
                      ownerUserId,
                      technicalResponsibleUserId,
                      salesResponsibleUserId,
                      productResponsibleUserId,
                      ...normalizedManagers,
                    ].filter(Boolean),
                  ),
                ),
                status: mapLegacyProjectStatus(raw.status),
                strategicPriority:
                  raw.strategicPriority === "Low" || raw.strategicPriority === "High" ? raw.strategicPriority : "Medium",
                tags: Array.isArray(raw.tags) ? raw.tags.filter((entry): entry is string => typeof entry === "string") : undefined,
                createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
                updatedAt:
                  typeof raw.updatedAt === "string"
                    ? raw.updatedAt
                    : typeof raw.createdAt === "string"
                      ? raw.createdAt
                      : new Date().toISOString(),
              } as Project;
            })
            .filter((project) => Boolean(project.name.trim()))
        : fallback.projects;

      const projectIds = new Set(projects.map((project) => project.id));
      const projectWeeklyReports = Array.isArray(state.projectWeeklyReports)
        ? state.projectWeeklyReports
            .map((row, idx) => {
              const raw = row as unknown as Record<string, unknown>;
              const projectId = typeof raw.projectId === "string" ? raw.projectId : "";
              if (!projectId || !projectIds.has(projectId)) return undefined;
              const roleReportsRaw =
                raw.roleReports && typeof raw.roleReports === "object"
                  ? (raw.roleReports as Record<string, unknown>)
                  : {};
              const technical = normalizeProjectRoleReport(roleReportsRaw.technical, activeUserId);
              const sales = normalizeProjectRoleReport(roleReportsRaw.sales, activeUserId);
              const product = normalizeProjectRoleReport(roleReportsRaw.product, activeUserId);
              const managerSummary = normalizeProjectManagerSummary(raw.managerSummary, activeUserId);

              const legacyAchievements = toProjectTextList(raw.achievements);
              const legacyInProgress = toProjectTextList(raw.inProgress ?? raw.progressSummary);
              const legacyBlockers = toProjectTextList(raw.blockers);
              const legacyDecisionsRequired = toProjectTextList(raw.decisionsRequired);
              const legacyNextWeekFocus = toProjectTextList(raw.nextWeekFocus);
              const legacyAttachments = toProjectAttachmentLinks(raw.attachments);
              const legacyRisk = raw.riskLevel === "Low" || raw.riskLevel === "High" ? raw.riskLevel : "Medium";
              const hasLegacyContent =
                legacyAchievements.length > 0 ||
                legacyInProgress.length > 0 ||
                legacyBlockers.length > 0 ||
                legacyDecisionsRequired.length > 0 ||
                legacyNextWeekFocus.length > 0 ||
                legacyAttachments.length > 0 ||
                typeof raw.teamStatusSummary === "string" ||
                typeof raw.submittedByUserId === "string" ||
                typeof raw.submittedById === "string";
              const legacyCombinedReport = hasLegacyContent
                ? {
                    submittedByUserId:
                      typeof raw.submittedByUserId === "string"
                        ? raw.submittedByUserId
                        : typeof raw.submittedById === "string"
                          ? raw.submittedById
                          : undefined,
                    achievements: legacyAchievements,
                    inProgress: legacyInProgress,
                    blockers: legacyBlockers,
                    decisionsRequired: legacyDecisionsRequired,
                    nextWeekFocus: legacyNextWeekFocus,
                    riskLevel: legacyRisk,
                    teamStatusSummary: typeof raw.teamStatusSummary === "string" ? raw.teamStatusSummary : undefined,
                    attachments: legacyAttachments,
                    submittedAt: typeof raw.submittedAt === "string" ? raw.submittedAt : undefined,
                  }
                : undefined;

              let aiSummary: ProjectWeeklyReport["aiSummary"];
              if (raw.aiSummary && typeof raw.aiSummary === "object") {
                const aiRaw = raw.aiSummary as Record<string, unknown>;
                const coverageRaw =
                  aiRaw.coverage && typeof aiRaw.coverage === "object"
                    ? (aiRaw.coverage as Record<string, unknown>)
                    : {};
                const missingRoles = Array.isArray(aiRaw.missingRoles)
                  ? aiRaw.missingRoles.filter(
                      (entry): entry is "technical" | "sales" | "product" | "manager" =>
                        entry === "technical" || entry === "sales" || entry === "product" || entry === "manager",
                    )
                  : [];
                aiSummary = {
                  shortText: typeof aiRaw.shortText === "string" ? aiRaw.shortText : "",
                  fullText: typeof aiRaw.fullText === "string" ? aiRaw.fullText : "",
                  keyRisks: toProjectTextList(aiRaw.keyRisks),
                  keyBlockers: toProjectTextList(aiRaw.keyBlockers),
                  decisionsRequired: toProjectTextList(aiRaw.decisionsRequired),
                  missingRoles,
                  generatedAt: typeof aiRaw.generatedAt === "string" ? aiRaw.generatedAt : new Date().toISOString(),
                  generatedByUserId:
                    typeof aiRaw.generatedByUserId === "string" ? aiRaw.generatedByUserId : activeUserId,
                  coverage: {
                    technicalSubmittedAt:
                      typeof coverageRaw.technicalSubmittedAt === "string" ? coverageRaw.technicalSubmittedAt : undefined,
                    salesSubmittedAt:
                      typeof coverageRaw.salesSubmittedAt === "string" ? coverageRaw.salesSubmittedAt : undefined,
                    productSubmittedAt:
                      typeof coverageRaw.productSubmittedAt === "string" ? coverageRaw.productSubmittedAt : undefined,
                    managerSubmittedAt:
                      typeof coverageRaw.managerSubmittedAt === "string" ? coverageRaw.managerSubmittedAt : undefined,
                  },
                };
              }

              const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString();
              return {
                id: typeof raw.id === "string" ? raw.id : `pwr-migrated-${idx + 1}`,
                projectId,
                weekStartDate:
                  typeof raw.weekStartDate === "string" ? raw.weekStartDate : new Date().toISOString().slice(0, 10),
                roleReports: {
                  technical,
                  sales,
                  product,
                },
                managerSummary,
                aiSummary,
                legacyCombinedReport,
                createdAt,
                updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt,
                amendsReportId: typeof raw.amendsReportId === "string" ? raw.amendsReportId : undefined,
              } as ProjectWeeklyReport;
            })
            .filter((entry): entry is ProjectWeeklyReport => Boolean(entry))
        : fallback.projectWeeklyReports;

      const contracts = Array.isArray(state.contracts)
        ? state.contracts.map((row, idx) => {
            const contract = row as Record<string, unknown> & Partial<Contract>;
            const companyId = typeof contract.companyId === "string" ? contract.companyId : "";
            const processId =
              typeof contract.interconnectionProcessId === "string"
                ? contract.interconnectionProcessId
                : interconnectionProcesses.find((entry) => entry.companyId === companyId && entry.track === contract.track)?.id ??
                  "";
            const company = companies.find((entry) => entry.id === companyId);
            const track = contract.track === "Voice" ? "Voice" : "SMS";
            const now = new Date().toISOString();
            return {
              id: typeof contract.id === "string" ? contract.id : `ct-migrated-${idx + 1}`,
              companyId,
              interconnectionProcessId: processId,
              track,
              ourEntity: normalizeOurEntity(contract.ourEntity) ?? company?.ourEntity ?? "UK",
              contractType:
                contract.contractType === "NDA" ||
                contract.contractType === "ServiceAgreement" ||
                contract.contractType === "Addendum" ||
                contract.contractType === "Other"
                  ? contract.contractType
                  : "Other",
              customTypeName:
                typeof contract.customTypeName === "string" && contract.customTypeName.trim()
                  ? contract.customTypeName.trim()
                  : undefined,
              note: typeof contract.note === "string" && contract.note.trim() ? contract.note.trim() : undefined,
              status: mapLegacyContractStatus(contract.status),
              files: Array.isArray(contract.files)
                ? contract.files
                    .map((file, fileIdx) => {
                      const raw = file as unknown as Record<string, unknown>;
                      return {
                        id: typeof raw.id === "string" ? raw.id : `cf-migrated-${idx + 1}-${fileIdx + 1}`,
                        kind: raw.kind === "Signed" || raw.kind === "Other" ? raw.kind : "Draft",
                        filename: typeof raw.filename === "string" ? raw.filename : `contract-${idx + 1}.pdf`,
                        mimeType: typeof raw.mimeType === "string" ? raw.mimeType : "application/octet-stream",
                        size: typeof raw.size === "number" ? raw.size : 0,
                        uploadedAt: typeof raw.uploadedAt === "string" ? raw.uploadedAt : now,
                        uploadedByUserId: typeof raw.uploadedByUserId === "string" ? raw.uploadedByUserId : activeUserId,
                        storageRef: typeof raw.storageRef === "string" ? raw.storageRef : undefined,
                        contentDataUrl: typeof raw.contentDataUrl === "string" ? raw.contentDataUrl : undefined,
                      };
                    })
                    .filter((file) => Boolean(file.filename))
                : [],
              requestedByUserId: typeof contract.requestedByUserId === "string" ? contract.requestedByUserId : activeUserId,
              internalSignerUserId:
                typeof contract.internalSignerUserId === "string" ? contract.internalSignerUserId : undefined,
              counterpartySignerName:
                typeof contract.counterpartySignerName === "string" ? contract.counterpartySignerName : undefined,
              createdAt: typeof contract.createdAt === "string" ? contract.createdAt : now,
              updatedAt: typeof contract.updatedAt === "string" ? contract.updatedAt : now,
              signedAt: typeof contract.signedAt === "string" ? contract.signedAt : undefined,
            } as Contract;
          })
        : [];

      const ourCompanyInfo = Array.isArray(state.ourCompanyInfo)
        ? state.ourCompanyInfo
            .map((row) => {
              const raw = row as unknown as Record<string, unknown>;
              const ourEntity = normalizeOurEntity(raw.ourEntity);
              if (!ourEntity) return undefined;
              return {
                ourEntity,
                legalName: typeof raw.legalName === "string" ? raw.legalName : "",
                address:
                  raw.address && typeof raw.address === "object"
                    ? {
                        street: typeof (raw.address as Record<string, unknown>).street === "string"
                          ? ((raw.address as Record<string, unknown>).street as string)
                          : "",
                        city: typeof (raw.address as Record<string, unknown>).city === "string"
                          ? ((raw.address as Record<string, unknown>).city as string)
                          : "",
                        state:
                          typeof (raw.address as Record<string, unknown>).state === "string"
                            ? ((raw.address as Record<string, unknown>).state as string)
                            : undefined,
                        zip:
                          typeof (raw.address as Record<string, unknown>).zip === "string"
                            ? ((raw.address as Record<string, unknown>).zip as string)
                            : undefined,
                        country: typeof (raw.address as Record<string, unknown>).country === "string"
                          ? ((raw.address as Record<string, unknown>).country as string)
                          : "",
                      }
                    : { street: "", city: "", country: "" },
                taxIdOrVat: typeof raw.taxIdOrVat === "string" ? raw.taxIdOrVat : "",
                signatory:
                  raw.signatory && typeof raw.signatory === "object"
                    ? {
                        name:
                          typeof (raw.signatory as Record<string, unknown>).name === "string"
                            ? ((raw.signatory as Record<string, unknown>).name as string)
                            : "",
                        title:
                          typeof (raw.signatory as Record<string, unknown>).title === "string"
                            ? ((raw.signatory as Record<string, unknown>).title as string)
                            : "",
                      }
                    : { name: "", title: "" },
                emails:
                  raw.emails && typeof raw.emails === "object"
                    ? {
                        billing:
                          typeof (raw.emails as Record<string, unknown>).billing === "string"
                            ? ((raw.emails as Record<string, unknown>).billing as string)
                            : "",
                        finance:
                          typeof (raw.emails as Record<string, unknown>).finance === "string"
                            ? ((raw.emails as Record<string, unknown>).finance as string)
                            : "",
                        invoice:
                          typeof (raw.emails as Record<string, unknown>).invoice === "string"
                            ? ((raw.emails as Record<string, unknown>).invoice as string)
                            : undefined,
                        rate:
                          typeof (raw.emails as Record<string, unknown>).rate === "string"
                            ? ((raw.emails as Record<string, unknown>).rate as string)
                            : undefined,
                        technical:
                          typeof (raw.emails as Record<string, unknown>).technical === "string"
                            ? ((raw.emails as Record<string, unknown>).technical as string)
                            : undefined,
                      }
                    : { billing: "", finance: "" },
                bankDetails:
                  raw.bankDetails && typeof raw.bankDetails === "object"
                    ? {
                        bankName:
                          typeof (raw.bankDetails as Record<string, unknown>).bankName === "string"
                            ? ((raw.bankDetails as Record<string, unknown>).bankName as string)
                            : "",
                        iban:
                          typeof (raw.bankDetails as Record<string, unknown>).iban === "string"
                            ? ((raw.bankDetails as Record<string, unknown>).iban as string)
                            : undefined,
                        swift:
                          typeof (raw.bankDetails as Record<string, unknown>).swift === "string"
                            ? ((raw.bankDetails as Record<string, unknown>).swift as string)
                            : undefined,
                        accountNumber:
                          typeof (raw.bankDetails as Record<string, unknown>).accountNumber === "string"
                            ? ((raw.bankDetails as Record<string, unknown>).accountNumber as string)
                            : undefined,
                        currency:
                          typeof (raw.bankDetails as Record<string, unknown>).currency === "string"
                            ? ((raw.bankDetails as Record<string, unknown>).currency as string)
                            : undefined,
                      }
                    : undefined,
                lastUpdatedAt: typeof raw.lastUpdatedAt === "string" ? raw.lastUpdatedAt : new Date().toISOString(),
              } as OurCompanyInfo;
            })
            .filter((entry): entry is OurCompanyInfo => Boolean(entry))
        : fallback.ourCompanyInfo;

      const opsRequests = Array.isArray(state.opsRequests)
        ? state.opsRequests
            .map((row, idx) => {
              const raw = row as unknown as Record<string, unknown>;
              const requestType =
                raw.requestType === "RoutingRequest" ||
                raw.requestType === "TroubleTicketRequest" ||
                raw.requestType === "TestRequest" ||
                raw.requestType === "LossAccepted" ||
                raw.requestType === "InterconnectionRequest"
                  ? raw.requestType
                  : "RoutingRequest";
              const status =
                raw.status === "Draft" ||
                raw.status === "Sent" ||
                raw.status === "InProgress" ||
                raw.status === "Done" ||
                raw.status === "Cancelled" ||
                raw.status === "Failed"
                  ? raw.status
                  : "Draft";
              const priority = mapOpsSeverity(raw.priority);
              const assignedToRole =
                raw.assignedToRole === "AM" ||
                raw.assignedToRole === "NOC" ||
                raw.assignedToRole === "Routing" ||
                raw.assignedToRole === "Supervisor"
                  ? raw.assignedToRole
                  : "NOC";
              const relatedTrack = mapOpsTrack(raw.relatedTrack);
              const destinationRaw =
                raw.destination && typeof raw.destination === "object" ? (raw.destination as Record<string, unknown>) : {};
              return {
                id: typeof raw.id === "string" ? raw.id : `opr-migrated-${idx + 1}`,
                requestType,
                createdByUserId: typeof raw.createdByUserId === "string" ? raw.createdByUserId : activeUserId,
                assignedToRole,
                priority,
                relatedCompanyId: typeof raw.relatedCompanyId === "string" ? raw.relatedCompanyId : undefined,
                relatedTrack,
                destination: {
                  country:
                    typeof destinationRaw.country === "string" && destinationRaw.country.trim()
                      ? destinationRaw.country
                      : "Unknown",
                  operator: typeof destinationRaw.operator === "string" ? destinationRaw.operator : undefined,
                },
                comment: typeof raw.comment === "string" ? raw.comment : "",
                status,
                relatedCaseId: typeof raw.relatedCaseId === "string" ? raw.relatedCaseId : undefined,
                createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
                updatedAt:
                  typeof raw.updatedAt === "string"
                    ? raw.updatedAt
                    : typeof raw.createdAt === "string"
                      ? raw.createdAt
                      : new Date().toISOString(),
              } as OpsRequest;
            })
            .filter((entry) => Boolean(entry.id))
        : fallback.opsRequests;

      const opsCases = Array.isArray(state.opsCases)
        ? state.opsCases
            .map((row, idx) => {
              const raw = row as unknown as Record<string, unknown>;
              const moduleOrigin = mapOpsModuleOrigin(raw.moduleOrigin);
              const category = mapOpsCategory(raw.category, moduleOrigin);
              const severity = mapOpsSeverity(raw.severity);
              const status = mapOpsCaseStatus(raw.status);
              const track = mapOpsTrack(raw.track ?? raw.relatedTrack);
              const detectedAt = typeof raw.detectedAt === "string" ? raw.detectedAt : new Date().toISOString();
              const metadataRaw =
                raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Partial<OpsCase["metadata"]> & Record<string, unknown>) : undefined;
              const metadata = metadataRaw
                ? ({
                    ...buildFallbackOpsMetadata(category, detectedAt, typeof raw.relatedProvider === "string" ? raw.relatedProvider : undefined, typeof raw.relatedDestination === "string" ? raw.relatedDestination : undefined),
                    ...metadataRaw,
                    alertTime: typeof metadataRaw.alertTime === "string" ? metadataRaw.alertTime : detectedAt,
                  } as OpsCase["metadata"])
                : buildFallbackOpsMetadata(
                    category,
                    detectedAt,
                    typeof raw.relatedProvider === "string" ? raw.relatedProvider : undefined,
                    typeof raw.relatedDestination === "string" ? raw.relatedDestination : undefined,
                  );
              const rawSlaProfile = typeof raw.slaProfileId === "string" ? raw.slaProfileId : undefined;
              const slaProfileId: OpsCase["slaProfileId"] =
                rawSlaProfile === "LOSS" || rawSlaProfile === "KPI" || rawSlaProfile === "DEFAULT" || rawSlaProfile === "TEST"
                  ? rawSlaProfile
                  : rawSlaProfile === "LOSS_ALERT"
                    ? "LOSS"
                    : rawSlaProfile === "KPI_ALERT"
                      ? "KPI"
                      : buildOpsSlaProfileId(category);
              const resolutionType = mapOpsResolutionType(raw.resolutionType);
              const dispositionRaw =
                raw.disposition && typeof raw.disposition === "object" ? (raw.disposition as Record<string, unknown>) : undefined;
              const performedAtCandidate =
                typeof dispositionRaw?.performedAt === "string"
                  ? dispositionRaw.performedAt
                  : status === "RESOLVED"
                    ? (typeof raw.resolvedAt === "string" ? raw.resolvedAt : undefined)
                    : status === "IGNORED"
                      ? (typeof raw.ignoredAt === "string" ? raw.ignoredAt : undefined)
                      : undefined;
              const disposition =
                resolutionType && performedAtCandidate
                  ? {
                      resolutionType,
                      performedByUserId:
                        typeof dispositionRaw?.performedByUserId === "string"
                          ? dispositionRaw.performedByUserId
                          : typeof raw.assignedToUserId === "string"
                            ? raw.assignedToUserId
                            : activeUserId,
                      performedAt: performedAtCandidate,
                      comment: typeof dispositionRaw?.comment === "string" ? dispositionRaw.comment : undefined,
                    }
                  : undefined;
              const portalOriginRaw = typeof raw.portalOrigin === "string" ? raw.portalOrigin : undefined;
              const portalOrigin: OpsCase["portalOrigin"] =
                portalOriginRaw === "sms-noc" ||
                portalOriginRaw === "voice-noc" ||
                portalOriginRaw === "routing-noc" ||
                portalOriginRaw === "am-noc-routing" ||
                portalOriginRaw === "account-managers" ||
                portalOriginRaw === "performance-audit"
                  ? portalOriginRaw
                  : track === "SMS"
                    ? "sms-noc"
                    : "voice-noc";
              const linkedSignalIds = Array.isArray(raw.linkedSignalIds)
                ? raw.linkedSignalIds.filter((entry): entry is string => typeof entry === "string")
                : [];
              return {
                id: typeof raw.id === "string" ? raw.id : `opc-migrated-${idx + 1}`,
                portalOrigin,
                moduleOrigin,
                track,
                relatedTrack: track,
                severity,
                category,
                detectedAt,
                metadata,
                relatedCompanyId: typeof raw.relatedCompanyId === "string" ? raw.relatedCompanyId : undefined,
                relatedProvider: typeof raw.relatedProvider === "string" ? raw.relatedProvider : undefined,
                relatedDestination: typeof raw.relatedDestination === "string" ? raw.relatedDestination : undefined,
                description: typeof raw.description === "string" ? raw.description : "",
                status,
                slaProfileId,
                slaDeadline:
                  typeof raw.slaDeadline === "string"
                    ? raw.slaDeadline
                    : computeSlaDeadline(detectedAt, slaProfileId, severity),
                linkedSignalIds,
                lastSignalAt: typeof raw.lastSignalAt === "string" ? raw.lastSignalAt : detectedAt,
                ttNumber: typeof raw.ttNumber === "string" ? raw.ttNumber : undefined,
                ttRaisedAt: typeof raw.ttRaisedAt === "string" ? raw.ttRaisedAt : undefined,
                resolvedAt: typeof raw.resolvedAt === "string" ? raw.resolvedAt : undefined,
                ignoredAt: typeof raw.ignoredAt === "string" ? raw.ignoredAt : undefined,
                cancelledAt: typeof raw.cancelledAt === "string" ? raw.cancelledAt : undefined,
                resolutionType,
                disposition,
                assignedToUserId: typeof raw.assignedToUserId === "string" ? raw.assignedToUserId : undefined,
                createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
                updatedAt:
                  typeof raw.updatedAt === "string"
                    ? raw.updatedAt
                    : typeof raw.createdAt === "string"
                      ? raw.createdAt
                      : new Date().toISOString(),
              } as OpsCase;
            })
            .filter((entry) => Boolean(entry.id))
        : fallback.opsCases;

      const opsMonitoringSignals = Array.isArray(state.opsMonitoringSignals)
        ? state.opsMonitoringSignals
            .map((row, idx) => {
              const raw = row as unknown as Record<string, unknown>;
              const moduleOrigin = mapOpsModuleOrigin(raw.moduleOrigin);
              const category = mapOpsCategory(raw.category, moduleOrigin);
              const severity = mapOpsSeverity(raw.severity);
              const track = mapOpsTrack(raw.track ?? raw.relatedTrack);
              const detectedAt = typeof raw.detectedAt === "string" ? raw.detectedAt : new Date().toISOString();
              const metadataRaw =
                raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Partial<OpsMonitoringSignal["metadata"]> & Record<string, unknown>) : undefined;
              const metadata = metadataRaw
                ? ({
                    ...buildFallbackOpsMetadata(
                      category,
                      detectedAt,
                      typeof raw.relatedProvider === "string" ? raw.relatedProvider : undefined,
                      typeof raw.relatedDestination === "string" ? raw.relatedDestination : undefined,
                    ),
                    ...metadataRaw,
                    alertTime: typeof metadataRaw.alertTime === "string" ? metadataRaw.alertTime : detectedAt,
                  } as OpsMonitoringSignal["metadata"])
                : buildFallbackOpsMetadata(
                    category,
                    detectedAt,
                    typeof raw.relatedProvider === "string" ? raw.relatedProvider : undefined,
                    typeof raw.relatedDestination === "string" ? raw.relatedDestination : undefined,
                  );
              return {
                id: typeof raw.id === "string" ? raw.id : `opsg-migrated-${idx + 1}`,
                moduleOrigin,
                track,
                relatedTrack: track,
                severity,
                category,
                detectedAt,
                metadata,
                fingerprint: typeof raw.fingerprint === "string" ? raw.fingerprint : `fingerprint-${idx + 1}`,
                relatedCompanyId: typeof raw.relatedCompanyId === "string" ? raw.relatedCompanyId : undefined,
                relatedProvider: typeof raw.relatedProvider === "string" ? raw.relatedProvider : undefined,
                relatedDestination: typeof raw.relatedDestination === "string" ? raw.relatedDestination : undefined,
                description: typeof raw.description === "string" ? raw.description : "",
                rawPayload: raw.rawPayload,
                createdCaseId: typeof raw.createdCaseId === "string" ? raw.createdCaseId : undefined,
                createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
              } as OpsMonitoringSignal;
            })
            .filter((entry) => Boolean(entry.id))
        : fallback.opsMonitoringSignals;

      const opsAuditLogs = Array.isArray(state.opsAuditLogs)
        ? state.opsAuditLogs
            .map((row, idx) => {
              const raw = row as unknown as Record<string, unknown>;
              const parentType = raw.parentType === "Case" ? "Case" : "Request";
              const actionType = mapOpsAuditActionType(parentType, raw.actionType);
              return {
                id: typeof raw.id === "string" ? raw.id : `opsa-migrated-${idx + 1}`,
                parentType,
                parentId: typeof raw.parentId === "string" ? raw.parentId : "",
                actionType,
                performedByUserId:
                  typeof raw.performedByUserId === "string" ? raw.performedByUserId : activeUserId,
                comment: typeof raw.comment === "string" ? raw.comment : undefined,
                resolutionType: mapOpsResolutionType(raw.resolutionType),
                ttNumber: typeof raw.ttNumber === "string" ? raw.ttNumber : undefined,
                caseActionId: typeof raw.caseActionId === "string" ? raw.caseActionId : undefined,
                timestamp: typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString(),
              } as OpsAuditLogEntry;
            })
            .filter((entry) => Boolean(entry.parentId))
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        : fallback.opsAuditLogs;

      const opsShifts = Array.isArray(state.opsShifts)
        ? state.opsShifts
            .map((row, idx) => {
              const raw = row as unknown as Record<string, unknown>;
              return {
                id: typeof raw.id === "string" ? raw.id : `opsh-migrated-${idx + 1}`,
                track:
                  raw.track === "SMS" || raw.track === "VOICE" || raw.track === "Voice" || raw.track === "BOTH" || raw.track === "Both"
                    ? raw.track === "Voice"
                      ? "VOICE"
                      : raw.track === "Both"
                        ? "BOTH"
                        : raw.track
                    : "BOTH",
                startsAt: typeof raw.startsAt === "string" ? raw.startsAt : new Date().toISOString(),
                endsAt: typeof raw.endsAt === "string" ? raw.endsAt : new Date().toISOString(),
                userIds: Array.isArray(raw.userIds) ? raw.userIds.filter((entry): entry is string => typeof entry === "string") : [],
                createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
                updatedAt:
                  typeof raw.updatedAt === "string"
                    ? raw.updatedAt
                    : typeof raw.createdAt === "string"
                      ? raw.createdAt
                      : new Date().toISOString(),
              } as OpsShift;
            })
            .filter((entry) => Boolean(entry.id))
        : fallback.opsShifts;
      const opsSlaProfiles = Array.isArray(state.opsSlaProfiles)
        ? state.opsSlaProfiles
            .map((row, idx) => {
              const raw = row as unknown as Record<string, unknown>;
              const idRaw = typeof raw.id === "string" ? raw.id : "DEFAULT";
              const id = idRaw === "DEFAULT" || idRaw === "LOSS" || idRaw === "KPI" || idRaw === "TEST" ? idRaw : "DEFAULT";
              const targetsRaw =
                raw.targetsMs && typeof raw.targetsMs === "object" ? (raw.targetsMs as Record<string, unknown>) : {};
              const urgent =
                typeof targetsRaw.URGENT === "number" && Number.isFinite(targetsRaw.URGENT) ? targetsRaw.URGENT : 30 * 60 * 1000;
              const high =
                typeof targetsRaw.HIGH === "number" && Number.isFinite(targetsRaw.HIGH) ? targetsRaw.HIGH : 2 * 60 * 60 * 1000;
              const medium =
                typeof targetsRaw.MEDIUM === "number" && Number.isFinite(targetsRaw.MEDIUM) ? targetsRaw.MEDIUM : 4 * 60 * 60 * 1000;
              return {
                id,
                name: typeof raw.name === "string" ? raw.name : `SLA Profile ${idx + 1}`,
                targetsMs: {
                  URGENT: urgent,
                  HIGH: high,
                  MEDIUM: medium,
                },
              };
            })
            .filter((entry) => Boolean(entry.id))
        : fallback.opsSlaProfiles;

      const hrLegalEntities = Array.isArray(state.hrLegalEntities)
        ? (state.hrLegalEntities as unknown as HrLegalEntity[])
        : fallback.hrLegalEntities;
      const hrFxRates = Array.isArray(state.hrFxRates) ? (state.hrFxRates as unknown as HrFxRate[]) : fallback.hrFxRates;
      const hrDepartments = Array.isArray(state.hrDepartments)
        ? (state.hrDepartments as unknown as HrDepartment[])
        : fallback.hrDepartments;
      const hrEmployees = Array.isArray(state.hrEmployees)
        ? state.hrEmployees
            .map((row, idx) =>
              normalizeHrEmployeeRecord(row as unknown as Record<string, unknown>, idx, hrDepartments[0]?.id ?? "hr-dept-1"),
            )
            .filter((employee) => Boolean(employee.id))
        : fallback.hrEmployees;
      const hrCompensations = Array.isArray(state.hrCompensations)
        ? (state.hrCompensations as unknown as HrEmployeeCompensation[])
        : fallback.hrCompensations;
      const hrPayrollSnapshots = Array.isArray(state.hrPayrollSnapshots)
        ? (state.hrPayrollSnapshots as unknown as HrPayrollMonthSnapshot[])
        : fallback.hrPayrollSnapshots;
      const hrLeaveProfiles = Array.isArray(state.hrLeaveProfiles)
        ? (state.hrLeaveProfiles as unknown as HrCountryLeaveProfile[])
        : fallback.hrLeaveProfiles;
      const hrLeaveRequests = Array.isArray(state.hrLeaveRequests)
        ? (state.hrLeaveRequests as unknown as HrLeaveRequest[])
        : fallback.hrLeaveRequests;
      const hrAssets = Array.isArray(state.hrAssets)
        ? (state.hrAssets as unknown as Array<Record<string, unknown>>).map((row, idx) => {
            const raw = row as Partial<HrAsset> & Record<string, unknown>;
            const categoryRaw = typeof raw.category === "string" ? raw.category : "Other";
            const category: HrAsset["category"] =
              categoryRaw === "Laptop" || categoryRaw === "Phone" || categoryRaw === "Accessory" || categoryRaw === "Monitor"
                ? categoryRaw
                : "Other";
            const assignedToEmployeeId = typeof raw.assignedToEmployeeId === "string" ? raw.assignedToEmployeeId : undefined;
            const returnedAt = typeof raw.returnedAt === "string" ? raw.returnedAt : undefined;
            const status: HrAsset["status"] =
              raw.status === "Available" || raw.status === "Assigned" || raw.status === "Returned" || raw.status === "Retired"
                ? raw.status
                : returnedAt
                  ? "Returned"
                  : assignedToEmployeeId
                    ? "Assigned"
                    : "Available";
            return {
              id: typeof raw.id === "string" ? raw.id : `hr-asset-migrated-${idx + 1}`,
              name: typeof raw.name === "string" ? raw.name : `Asset ${idx + 1}`,
              category,
              status,
              assignedToEmployeeId: status === "Assigned" ? assignedToEmployeeId : undefined,
              assignedAt: typeof raw.assignedAt === "string" ? raw.assignedAt : undefined,
              returnedAt,
              digitalAcceptance: Boolean(raw.digitalAcceptance),
              notes: typeof raw.notes === "string" ? raw.notes : undefined,
              createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
              updatedAt:
                typeof raw.updatedAt === "string"
                  ? raw.updatedAt
                  : typeof raw.createdAt === "string"
                    ? raw.createdAt
                    : new Date().toISOString(),
            } as HrAsset;
          })
        : fallback.hrAssets;
      const hrSoftwareLicenses = Array.isArray(state.hrSoftwareLicenses)
        ? (state.hrSoftwareLicenses as unknown as HrSoftwareLicense[])
        : fallback.hrSoftwareLicenses;
      const hrAssetAssignments = Array.isArray(state.hrAssetAssignments)
        ? (state.hrAssetAssignments as unknown as HrAssetAssignment[])
        : hrAssets
            .filter((asset) => Boolean(asset.assignedToEmployeeId))
            .map((asset, idx) => ({
              id: `hraa-migrated-${idx + 1}`,
              assetId: asset.id,
              employeeId: asset.assignedToEmployeeId as string,
              assignedAt: asset.assignedAt ?? asset.createdAt,
              returnedAt: asset.returnedAt,
              acceptanceStatus: asset.digitalAcceptance ? "Accepted" : "Pending",
              acceptedAt: asset.digitalAcceptance ? asset.updatedAt : undefined,
              revokedAt: undefined,
              assignedByUserId: activeUserId,
              notes: asset.notes,
              createdAt: asset.assignedAt ?? asset.createdAt,
              updatedAt: asset.updatedAt,
            }));
      const hrSoftwareProducts = Array.isArray(state.hrSoftwareProducts)
        ? (state.hrSoftwareProducts as unknown as HrSoftwareProduct[])
        : (() => {
            const rows: HrSoftwareProduct[] = [];
            const keySet = new Set<string>();
            hrSoftwareLicenses.forEach((license, idx) => {
              const key = `${license.name}::${license.vendor}::${license.licenseType}`;
              if (keySet.has(key)) return;
              keySet.add(key);
              rows.push({
                id: `hrsp-migrated-${rows.length + 1}`,
                name: license.name,
                vendor: license.vendor,
                licenseType: license.licenseType.toLowerCase().includes("enterprise")
                  ? "Enterprise"
                  : license.licenseType.toLowerCase().includes("seat")
                    ? "Seat"
                    : "Other",
                notes: undefined,
                createdAt: license.createdAt ?? new Date().toISOString(),
                updatedAt: license.updatedAt ?? license.createdAt ?? new Date().toISOString(),
              });
            });
            if (!rows.length) {
              rows.push({
                id: "hrsp-migrated-1",
                name: "Workspace Suite",
                vendor: "Legacy Vendor",
                licenseType: "Seat",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
            return rows;
          })();
      const productIdByLegacyKey = new Map<string, string>();
      hrSoftwareProducts.forEach((product) => {
        const key = `${product.name}::${product.vendor}`;
        if (!productIdByLegacyKey.has(key)) {
          productIdByLegacyKey.set(key, product.id);
        }
      });
      const hrSoftwareSeats = Array.isArray(state.hrSoftwareSeats)
        ? (state.hrSoftwareSeats as unknown as HrSoftwareSeat[])
        : hrSoftwareLicenses.map((license, idx) => {
            const key = `${license.name}::${license.vendor}`;
            const softwareProductId = productIdByLegacyKey.get(key) ?? hrSoftwareProducts[0]?.id ?? "hrsp-migrated-1";
            const assignedEmployee = license.assignedToEmployeeId
              ? hrEmployees.find((employee) => employee.id === license.assignedToEmployeeId)
              : undefined;
            const expired = typeof license.endDate === "string" && license.endDate < new Date().toISOString().slice(0, 10);
            const status: HrSoftwareSeat["status"] = license.assignedToEmployeeId
              ? expired
                ? "Expired"
                : "Assigned"
              : "Available";
            return {
              id: `hrss-migrated-${idx + 1}`,
              softwareProductId,
              status,
              assignedToEmployeeId: license.assignedToEmployeeId,
              assignedToEmail: license.assignedToEmployeeId ? assignedEmployee?.email : undefined,
              assignedAt: license.startDate ? `${license.startDate}T09:00:00.000Z` : undefined,
              revokedAt: undefined,
              endDate: license.endDate,
              cost: license.cost,
              currency: license.currency,
              notes: license.notes,
              createdAt: license.createdAt,
              updatedAt: license.updatedAt,
            } as HrSoftwareSeat;
          });
      const hrProvisionRequests = Array.isArray(state.hrProvisionRequests)
        ? (state.hrProvisionRequests as unknown as HrProvisionRequest[])
        : fallback.hrProvisionRequests;
      const hrExpenses = Array.isArray(state.hrExpenses)
        ? (state.hrExpenses as unknown as Array<Record<string, unknown>>).map((row, idx) => {
            const createdAt = typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString();
            const currency: HrExpense["currency"] =
              row.currency === "EUR" || row.currency === "USD" || row.currency === "GBP" || row.currency === "TRY"
                ? row.currency
                : "EUR";
            const amount = typeof row.amount === "number" && Number.isFinite(row.amount) ? row.amount : 0;
            const convertedAmountEUR =
              typeof row.convertedAmountEUR === "number" && Number.isFinite(row.convertedAmountEUR)
                ? row.convertedAmountEUR
                : convertCurrency(amount, currency, "EUR", hrFxRates, createdAt) ?? amount;
            const status: HrExpense["status"] =
              row.status === "PendingManager" ||
              row.status === "PendingFinance" ||
              row.status === "Approved" ||
              row.status === "Rejected" ||
              row.status === "Paid" ||
              row.status === "Cancelled"
                ? row.status
                : "PendingManager";
            const claimType: HrExpense["claimType"] = row.claimType === "Advance" ? "Advance" : "Reimbursement";
            const attachmentMetaRaw = row.attachmentMeta;
            const attachmentMeta =
              attachmentMetaRaw && typeof attachmentMetaRaw === "object" && typeof (attachmentMetaRaw as { url?: unknown }).url === "string"
                ? {
                    url: ((attachmentMetaRaw as { url: string }).url || "").trim(),
                    fileName:
                      typeof (attachmentMetaRaw as { fileName?: unknown }).fileName === "string"
                        ? ((attachmentMetaRaw as { fileName: string }).fileName || "").trim() || undefined
                        : undefined,
                    mimeType:
                      typeof (attachmentMetaRaw as { mimeType?: unknown }).mimeType === "string"
                        ? ((attachmentMetaRaw as { mimeType: string }).mimeType || "").trim() || undefined
                        : undefined,
                    sizeBytes:
                      typeof (attachmentMetaRaw as { sizeBytes?: unknown }).sizeBytes === "number"
                        ? (attachmentMetaRaw as { sizeBytes: number }).sizeBytes
                        : undefined,
                    uploadedAt:
                      typeof (attachmentMetaRaw as { uploadedAt?: unknown }).uploadedAt === "string"
                        ? (attachmentMetaRaw as { uploadedAt: string }).uploadedAt
                        : undefined,
                  }
                : undefined;
            return {
              id: typeof row.id === "string" ? row.id : `hrex-migrated-${idx + 1}`,
              employeeId: typeof row.employeeId === "string" ? row.employeeId : hrEmployees[0]?.id ?? "hre-migrated-1",
              claimType,
              advanceType: row.advanceType === "TravelAdvance" || row.advanceType === "PerDiem" ? row.advanceType : undefined,
              category:
                typeof row.category === "string" && row.category.trim()
                  ? row.category.trim()
                  : claimType === "Advance"
                    ? "Advance"
                    : "Other",
              amount: Math.round(amount * 100) / 100,
              currency,
              convertedAmountEUR: Math.round(convertedAmountEUR * 100) / 100,
              description: typeof row.description === "string" ? row.description : "",
              receiptUrl:
                typeof row.receiptUrl === "string"
                  ? row.receiptUrl
                  : typeof row.receiptAttachmentUrl === "string"
                    ? row.receiptAttachmentUrl
                    : undefined,
              attachmentMeta: attachmentMeta?.url ? attachmentMeta : undefined,
              travelStartDate: typeof row.travelStartDate === "string" ? row.travelStartDate : undefined,
              travelEndDate: typeof row.travelEndDate === "string" ? row.travelEndDate : undefined,
              advancePurpose: typeof row.advancePurpose === "string" ? row.advancePurpose : undefined,
              status,
              managerApprovedAt: typeof row.managerApprovedAt === "string" ? row.managerApprovedAt : undefined,
              financeApprovedAt: typeof row.financeApprovedAt === "string" ? row.financeApprovedAt : undefined,
              rejectedAt: typeof row.rejectedAt === "string" ? row.rejectedAt : undefined,
              paidAt: typeof row.paidAt === "string" ? row.paidAt : undefined,
              cancelledAt: typeof row.cancelledAt === "string" ? row.cancelledAt : undefined,
              reconciledAt: typeof row.reconciledAt === "string" ? row.reconciledAt : undefined,
              reconciledWithClaimIds: Array.isArray(row.reconciledWithClaimIds)
                ? row.reconciledWithClaimIds.filter((entry): entry is string => typeof entry === "string")
                : undefined,
              createdAt,
              updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : createdAt,
            } as HrExpense;
          })
        : fallback.hrExpenses;
      const hrAuditLogs = Array.isArray(state.hrAuditLogs) ? (state.hrAuditLogs as unknown as HrAuditLogEntry[]) : fallback.hrAuditLogs;

      return {
        ...fallback,
        ...state,
        users,
        activeUserId,
        companies,
        contacts,
        interconnectionProcesses,
        meetings,
        eventStaff,
        tasks,
        taskLabels: (() => {
          let labels: TaskLabel[] = Array.isArray(state.taskLabels)
            ? (state.taskLabels as unknown as TaskLabel[])
            : fallback.taskLabels;
          if (labels.length === 0) {
            labels = [
              { id: "label-bug", name: "Bug", color: "bg-rose-500" },
              { id: "label-feature", name: "Feature", color: "bg-blue-500" },
              { id: "label-infra", name: "Infra", color: "bg-slate-500" },
              { id: "label-urgent", name: "Urgent", color: "bg-amber-500" },
              { id: "label-review", name: "Review", color: "bg-violet-500" },
              { id: "label-blocked", name: "Blocked", color: "bg-rose-700" },
              { id: "label-research", name: "Research", color: "bg-cyan-500" },
              { id: "label-docs", name: "Docs", color: "bg-emerald-500" },
            ];
          }
          const PROJECT_LABEL_COLORS = [
            "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
            "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
          ];
          const allProjects: Project[] = Array.isArray(state.projects) ? projects : fallback.projects;
          allProjects.forEach((project, idx) => {
            if (!labels.some((l) => l.name === project.name)) {
              labels = [...labels, {
                id: `label-project-${project.id}`,
                name: project.name,
                color: PROJECT_LABEL_COLORS[idx % PROJECT_LABEL_COLORS.length],
              }];
            }
          });
          return labels;
        })(),
        taskComments,
        projects: Array.isArray(state.projects) ? projects : fallback.projects,
        projectWeeklyReports: Array.isArray(state.projectWeeklyReports)
          ? projectWeeklyReports
          : fallback.projectWeeklyReports,
        contracts,
        ourCompanyInfo:
          ourCompanyInfo.length > 0
            ? ourCompanyInfo
            : fallback.ourCompanyInfo,
        hrLegalEntities,
        hrFxRates,
        hrDepartments,
        hrEmployees,
        hrCompensations,
        hrPayrollSnapshots,
        hrLeaveProfiles,
        hrLeaveRequests,
        hrAssets,
        hrSoftwareLicenses,
        hrAssetAssignments,
        hrSoftwareProducts,
        hrSoftwareSeats,
        hrProvisionRequests,
        hrExpenses,
        hrAuditLogs,
        opsRequests: Array.isArray(state.opsRequests) ? opsRequests : fallback.opsRequests,
        opsCases: Array.isArray(state.opsCases) ? opsCases : fallback.opsCases,
        opsMonitoringSignals: Array.isArray(state.opsMonitoringSignals)
          ? opsMonitoringSignals
          : fallback.opsMonitoringSignals,
        opsAuditLogs: Array.isArray(state.opsAuditLogs) ? opsAuditLogs : fallback.opsAuditLogs,
        opsShifts: Array.isArray(state.opsShifts) ? opsShifts : fallback.opsShifts,
        opsSlaProfiles: Array.isArray(state.opsSlaProfiles) ? opsSlaProfiles : fallback.opsSlaProfiles,
      } as unknown as AppStore;
    },
  }),
);

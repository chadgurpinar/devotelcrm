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
  HrSoftwareLicense,
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
} from "./types";
import {
  computePayrollPreview,
  convertCurrency,
  dateRangesOverlap,
  toMonthKey,
  validateSalaryDistribution,
  workingDaysBetween,
} from "./hrUtils";

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
  markHrAssetAcceptance: (assetId: string, accepted: boolean) => void;
  createHrSoftwareLicense: (payload: Omit<HrSoftwareLicense, "id" | "createdAt" | "updatedAt">) => string;
  updateHrSoftwareLicense: (license: HrSoftwareLicense) => void;
  createHrExpense: (
    payload: Omit<
      HrExpense,
      "id" | "convertedAmountEUR" | "status" | "managerApprovedAt" | "financeApprovedAt" | "paidAt" | "createdAt" | "updatedAt"
    >,
  ) => string;
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

function isOpsCaseTerminal(status: OpsCase["status"]): boolean {
  return status === "Resolved" || status === "Ignored" || status === "Cancelled";
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

function nextCaseStatusForAction(
  currentStatus: OpsCase["status"],
  actionType: OpsCaseActionType,
): OpsCase["status"] | undefined {
  if (actionType === "START") return currentStatus === "New" ? "InProgress" : undefined;
  if (actionType === "RESOLVE") return currentStatus === "InProgress" ? "Resolved" : undefined;
  if (actionType === "IGNORE") return currentStatus === "New" || currentStatus === "InProgress" ? "Ignored" : undefined;
  if (actionType === "CANCEL") return currentStatus === "New" || currentStatus === "InProgress" ? "Cancelled" : undefined;
  return undefined;
}

function requiresRequestComment(actionType: OpsRequestActionType): boolean {
  return actionType === "CANCELLED";
}

function requiresCaseComment(actionType: OpsCaseActionType): boolean {
  return actionType === "IGNORE" || actionType === "CANCEL" || actionType === "COMMENT";
}

function buildOpsSlaProfileId(category: OpsCase["category"]): OpsCase["slaProfileId"] {
  return category === "Loss" ? "LOSS_ALERT" : "KPI_ALERT";
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

function requiresExpenseComment(actionType: HrExpenseActionType): boolean {
  return actionType === "MANAGER_REJECT" || actionType === "FINANCE_REJECT";
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
      set((state) => ({
        ...state,
        tasks: [
          ...state.tasks,
          {
            ...taskPayload,
            id: taskId,
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
      set((state) => ({
        ...state,
        hrAssets: [
          ...state.hrAssets,
          {
            ...payload,
            id,
            assignedAt: payload.assignedToEmployeeId ? payload.assignedAt ?? now : undefined,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
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
        return {
          ...state,
          hrAssets: state.hrAssets.map((row) =>
            row.id === assetId
              ? {
                  ...row,
                  assignedToEmployeeId: employeeId,
                  assignedAt: now,
                  returnedAt: undefined,
                  digitalAcceptance: false,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Asset",
            parentId: assetId,
            actionType: "ASSET_ASSIGNED",
            comment: `Assigned to ${employeeId}.`,
            timestamp: now,
          }),
        };
      }),
    returnHrAsset: (assetId) =>
      set((state) => {
        const now = new Date().toISOString();
        return {
          ...state,
          hrAssets: state.hrAssets.map((row) =>
            row.id === assetId
              ? {
                  ...row,
                  assignedToEmployeeId: undefined,
                  returnedAt: now,
                  digitalAcceptance: false,
                  updatedAt: now,
                }
              : row,
          ),
          hrAuditLogs: appendHrAudit(state, {
            parentType: "Asset",
            parentId: assetId,
            actionType: "ASSET_RETURNED",
            timestamp: now,
          }),
        };
      }),
    markHrAssetAcceptance: (assetId, accepted) =>
      set((state) => {
        const now = new Date().toISOString();
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
    createHrExpense: (payload) => {
      const id = uid("hrex");
      const now = new Date().toISOString();
      const convertedAmountEUR = convertCurrency(payload.amount, payload.currency, "EUR", get().hrFxRates, now) ?? payload.amount;
      set((state) => ({
        ...state,
        hrExpenses: [
          ...state.hrExpenses,
          {
            ...payload,
            id,
            convertedAmountEUR: Math.round(convertedAmountEUR * 100) / 100,
            status: "PendingManager",
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
      return id;
    },
    applyHrExpenseAction: (expenseId, actionType, comment) => {
      let result: { ok: boolean; message?: string } = { ok: false, message: "Expense not found." };
      set((state) => {
        const target = state.hrExpenses.find((row) => row.id === expenseId);
        if (!target) {
          result = { ok: false, message: "Expense not found." };
          return state;
        }
        const trimmedComment = comment?.trim();
        if (requiresExpenseComment(actionType) && !trimmedComment) {
          result = { ok: false, message: "Comment is mandatory for reject actions." };
          return state;
        }
        const now = new Date().toISOString();
        let next: HrExpense | null = null;
        if (actionType === "MANAGER_APPROVE" && target.status === "PendingManager") {
          next = { ...target, status: "PendingFinance", managerApprovedAt: now, updatedAt: now };
        } else if (actionType === "MANAGER_REJECT" && target.status === "PendingManager") {
          next = { ...target, status: "Rejected", managerApprovedAt: now, updatedAt: now };
        } else if (actionType === "FINANCE_APPROVE" && target.status === "PendingFinance") {
          next = { ...target, status: "Approved", financeApprovedAt: now, updatedAt: now };
        } else if (actionType === "FINANCE_REJECT" && target.status === "PendingFinance") {
          next = { ...target, status: "Rejected", financeApprovedAt: now, updatedAt: now };
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
          hrExpenses: state.hrExpenses.map((entry) => (entry.id === expenseId ? next! : entry)),
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
        const row: OpsCase = {
          ...payload,
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
        const comment = options?.comment?.trim();
        if (requiresCaseComment(actionType) && !comment) {
          result = { ok: false, message: "Comment is mandatory for this action." };
          return state;
        }
        const doneByUserId = options?.doneByUserId ?? state.activeUserId;
        const now = new Date().toISOString();
        if (actionType === "ASSIGN") {
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
                actionType,
                performedByUserId: doneByUserId,
                comment: comment ?? `Assigned to ${options.assignedToUserId}.`,
                timestamp: now,
              },
            ],
          };
        }
        if (actionType === "COMMENT") {
          result = { ok: true };
          return {
            ...state,
            opsAuditLogs: [
              ...state.opsAuditLogs,
              {
                id: uid("opsa"),
                parentType: "Case",
                parentId: caseId,
                actionType,
                performedByUserId: doneByUserId,
                comment,
                timestamp: now,
              },
            ],
          };
        }
        const nextStatus = nextCaseStatusForAction(target.status, actionType);
        if (!nextStatus) {
          result = { ok: false, message: "Action is not valid for current status." };
          return state;
        }
        const nextCase: OpsCase = {
          ...target,
          status: nextStatus,
          resolvedAt: actionType === "RESOLVE" ? now : target.resolvedAt,
          ignoredAt: actionType === "IGNORE" ? now : target.ignoredAt,
          cancelledAt: actionType === "CANCEL" ? now : target.cancelledAt,
          resolutionType: actionType === "RESOLVE" ? options?.resolutionType ?? "Unknown" : target.resolutionType,
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
    createOpsMonitoringSignal: (payload) => {
      const id = uid("opsg");
      const now = new Date().toISOString();
      set((state) => ({
        ...state,
        opsMonitoringSignals: [
          ...state.opsMonitoringSignals,
          {
            ...payload,
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
          const alreadyExists = nextSignals.some(
            (entry) => entry.fingerprint === signal.fingerprint && entry.moduleOrigin === signal.moduleOrigin,
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
                entry.moduleOrigin === signal.moduleOrigin &&
                entry.relatedTrack === signal.relatedTrack &&
                entry.category === signal.category &&
                entry.relatedProvider === signal.relatedProvider &&
                entry.relatedDestination === signal.relatedDestination,
            );
            if (openCase) {
              createdCaseId = openCase.id;
              openCase.updatedAt = now;
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
              nextCases.push({
                id: caseId,
                moduleOrigin: signal.moduleOrigin,
                relatedTrack: signal.relatedTrack,
                severity: signal.severity,
                category: signal.category,
                detectedAt: signal.detectedAt,
                relatedCompanyId: signal.relatedCompanyId,
                relatedProvider: signal.relatedProvider,
                relatedDestination: signal.relatedDestination,
                description: signal.description,
                status: "New",
                slaProfileId: buildOpsSlaProfileId(signal.category),
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
      set((state) => ({
        ...state,
        opsShifts: [
          ...state.opsShifts,
          {
            ...payload,
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
          hrExpenses: Array.isArray(data.hrExpenses) ? data.hrExpenses : state.hrExpenses,
          hrAuditLogs: Array.isArray(data.hrAuditLogs) ? data.hrAuditLogs : state.hrAuditLogs,
          opsRequests: Array.isArray(data.opsRequests) ? data.opsRequests : state.opsRequests,
          opsCases: Array.isArray(data.opsCases) ? data.opsCases : state.opsCases,
          opsMonitoringSignals: Array.isArray(data.opsMonitoringSignals) ? data.opsMonitoringSignals : state.opsMonitoringSignals,
          opsAuditLogs: Array.isArray(data.opsAuditLogs) ? data.opsAuditLogs : state.opsAuditLogs,
          opsShifts: Array.isArray(data.opsShifts) ? data.opsShifts : state.opsShifts,
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
    version: 15,
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
              const priority = raw.priority === "Urgent" || raw.priority === "High" ? raw.priority : "Medium";
              const assignedToRole =
                raw.assignedToRole === "AM" ||
                raw.assignedToRole === "NOC" ||
                raw.assignedToRole === "Routing" ||
                raw.assignedToRole === "Supervisor"
                  ? raw.assignedToRole
                  : "NOC";
              const relatedTrack = raw.relatedTrack === "Voice" ? "Voice" : "SMS";
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
              const moduleOrigin =
                raw.moduleOrigin === "ProviderIssues" ||
                raw.moduleOrigin === "Losses" ||
                raw.moduleOrigin === "NewAndLostTraffics" ||
                raw.moduleOrigin === "TrafficComparison" ||
                raw.moduleOrigin === "ScheduleTestResults" ||
                raw.moduleOrigin === "FailedSmsOrCallAnalysis"
                  ? raw.moduleOrigin
                  : "ProviderIssues";
              const severity = raw.severity === "Urgent" || raw.severity === "High" ? raw.severity : "Medium";
              const category =
                raw.category === "Loss" ||
                raw.category === "KPI" ||
                raw.category === "Traffic" ||
                raw.category === "Provider" ||
                raw.category === "Test" ||
                raw.category === "Other"
                  ? raw.category
                  : "Other";
              const status =
                raw.status === "New" ||
                raw.status === "InProgress" ||
                raw.status === "Resolved" ||
                raw.status === "Ignored" ||
                raw.status === "Cancelled"
                  ? raw.status
                  : "New";
              const slaProfileId = raw.slaProfileId === "LOSS_ALERT" ? "LOSS_ALERT" : "KPI_ALERT";
              return {
                id: typeof raw.id === "string" ? raw.id : `opc-migrated-${idx + 1}`,
                moduleOrigin,
                relatedTrack: raw.relatedTrack === "Voice" ? "Voice" : "SMS",
                severity,
                category,
                detectedAt: typeof raw.detectedAt === "string" ? raw.detectedAt : new Date().toISOString(),
                relatedCompanyId: typeof raw.relatedCompanyId === "string" ? raw.relatedCompanyId : undefined,
                relatedProvider: typeof raw.relatedProvider === "string" ? raw.relatedProvider : undefined,
                relatedDestination: typeof raw.relatedDestination === "string" ? raw.relatedDestination : undefined,
                description: typeof raw.description === "string" ? raw.description : "",
                status,
                slaProfileId,
                resolvedAt: typeof raw.resolvedAt === "string" ? raw.resolvedAt : undefined,
                ignoredAt: typeof raw.ignoredAt === "string" ? raw.ignoredAt : undefined,
                cancelledAt: typeof raw.cancelledAt === "string" ? raw.cancelledAt : undefined,
                resolutionType:
                  raw.resolutionType === "Fixed" ||
                  raw.resolutionType === "FalsePositive" ||
                  raw.resolutionType === "PartnerIssue" ||
                  raw.resolutionType === "PlannedWork" ||
                  raw.resolutionType === "Unknown"
                    ? raw.resolutionType
                    : undefined,
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
              const moduleOrigin =
                raw.moduleOrigin === "ProviderIssues" ||
                raw.moduleOrigin === "Losses" ||
                raw.moduleOrigin === "NewAndLostTraffics" ||
                raw.moduleOrigin === "TrafficComparison" ||
                raw.moduleOrigin === "ScheduleTestResults" ||
                raw.moduleOrigin === "FailedSmsOrCallAnalysis"
                  ? raw.moduleOrigin
                  : "ProviderIssues";
              const category =
                raw.category === "Loss" ||
                raw.category === "KPI" ||
                raw.category === "Traffic" ||
                raw.category === "Provider" ||
                raw.category === "Test" ||
                raw.category === "Other"
                  ? raw.category
                  : "Other";
              const severity = raw.severity === "Urgent" || raw.severity === "High" ? raw.severity : "Medium";
              return {
                id: typeof raw.id === "string" ? raw.id : `opsg-migrated-${idx + 1}`,
                moduleOrigin,
                relatedTrack: raw.relatedTrack === "Voice" ? "Voice" : "SMS",
                severity,
                category,
                detectedAt: typeof raw.detectedAt === "string" ? raw.detectedAt : new Date().toISOString(),
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
              const actionType =
                typeof raw.actionType === "string"
                  ? raw.actionType
                  : parentType === "Case"
                    ? "COMMENT"
                    : "SEND";
              return {
                id: typeof raw.id === "string" ? raw.id : `opsa-migrated-${idx + 1}`,
                parentType,
                parentId: typeof raw.parentId === "string" ? raw.parentId : "",
                actionType: actionType as OpsAuditLogEntry["actionType"],
                performedByUserId:
                  typeof raw.performedByUserId === "string" ? raw.performedByUserId : activeUserId,
                comment: typeof raw.comment === "string" ? raw.comment : undefined,
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
                track: raw.track === "SMS" || raw.track === "Voice" || raw.track === "Both" ? raw.track : "Both",
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
      const hrAssets = Array.isArray(state.hrAssets) ? (state.hrAssets as unknown as HrAsset[]) : fallback.hrAssets;
      const hrSoftwareLicenses = Array.isArray(state.hrSoftwareLicenses)
        ? (state.hrSoftwareLicenses as unknown as HrSoftwareLicense[])
        : fallback.hrSoftwareLicenses;
      const hrExpenses = Array.isArray(state.hrExpenses) ? (state.hrExpenses as unknown as HrExpense[]) : fallback.hrExpenses;
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
        hrExpenses,
        hrAuditLogs,
        opsRequests: Array.isArray(state.opsRequests) ? opsRequests : fallback.opsRequests,
        opsCases: Array.isArray(state.opsCases) ? opsCases : fallback.opsCases,
        opsMonitoringSignals: Array.isArray(state.opsMonitoringSignals)
          ? opsMonitoringSignals
          : fallback.opsMonitoringSignals,
        opsAuditLogs: Array.isArray(state.opsAuditLogs) ? opsAuditLogs : fallback.opsAuditLogs,
        opsShifts: Array.isArray(state.opsShifts) ? opsShifts : fallback.opsShifts,
      } as unknown as AppStore;
    },
  }),
);

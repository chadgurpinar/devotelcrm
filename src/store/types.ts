export type CompanyStatus = "LEAD" | "INTERCONNECTION" | "CLIENT";
export type LeadDisposition = "Open" | "Rejected" | "OnHold";
export type TechnicalFit = "Unknown" | "Pass" | "Fail";
export type CommercialFit = "Unknown" | "Low" | "Medium" | "High" | "Risk";
export type RiskLevel = "Unknown" | "Low" | "Medium" | "High";
export type OurEntity = "USA" | "UK" | "TR";
export type InterconnectionTrack = "SMS" | "Voice";
export type InterconnectionStage = "NDA" | "Contract" | "Technical" | "AM_Assigned" | "Completed" | "Failed";
export type ContractType = "NDA" | "ServiceAgreement" | "Addendum" | "Other";
export type ContractStatus =
  | "Draft"
  | "InternalSignatureRequested"
  | "CounterpartySignatureRequested"
  | "FullySigned"
  | "Rejected"
  | "Expired";

export type CompanyType =
  | "MNO"
  | "Exclusive"
  | "Aggregator"
  | "MVNO"
  | "Large Aggregator"
  | "Wholesale Carrier"
  | "Enterprise";

export type InterconnectionType = "One-way" | "Two-way";
export type Workscope = "SMS" | "Voice" | "Data" | "Software" | "RCS";
export type ContactRoleTag = "Commercial" | "Technical" | "Finance";

export type TaskStatus = "Open" | "InProgress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";
export type TaskVisibility = "Private" | "Shared";
export type TaskCommentKind = "Comment" | "Blocker";

export type ProjectStatus = "InProgress" | "Paused" | "Completed";
export type StrategicPriority = "Low" | "Medium" | "High";
export type ProjectRiskLevel = "Low" | "Medium" | "High";
export type ProjectRoleKey = "technical" | "sales" | "product";
export type ProjectSubmissionKey = ProjectRoleKey | "manager";

export interface User {
  id: string;
  name: string;
  role:
    | "Sales"
    | "Interconnection Manager"
    | "NOC"
    | "Head of SMS"
    | "Head of Voice";
  color: string;
  defaultOurEntity: OurEntity;
}

export interface Contact {
  id: string;
  companyId?: string;
  name: string;
  title: string;
  phone: string;
  mobile?: string;
  skypeId?: string;
  email?: string;
  roleTags?: ContactRoleTag[];
}

export interface CompanyAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface Company {
  id: string;
  name: string;
  companyStatus: CompanyStatus;
  leadDisposition: LeadDisposition;
  ourEntity: OurEntity;
  createdAt?: string;
  createdFromEventId?: string;
  createdFrom?: "Event" | "Manual";
  region?: string;
  address?: CompanyAddress;
  taxId?: string;
  website?: string;
  mainPhone?: string;
  billingTerm?: string;
  currency?: string;
  creditLimit?: number;
  type: CompanyType;
  interconnectionType: InterconnectionType;
  workscope: Workscope[];
  ownerUserId: string;
  watcherUserIds: string[];
  internalAmUserId?: string;
  counterpartyAmName?: string;
  primaryContactIds?: {
    commercial?: string;
    technical?: string;
    finance?: string;
  };
  movedToInterconnectionAt?: string;
  becameClientAt?: string;
  evaluation?: {
    technicalFit: TechnicalFit;
    commercialFit: CommercialFit;
    riskLevel: RiskLevel;
    nextAction?: string;
    evaluationNotes?: string;
    evaluationUpdatedAt?: string;
  };
  tags: string[];
  emails: {
    technical?: string;
    finance?: string;
    invoice?: string;
    rates?: string;
  };
}

export interface Event {
  id: string;
  name: string;
  city: string;
  venue: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EventStaff {
  id: string;
  eventId: string;
  userId: string;
  flightOutNumber: string;
  flightOutDepartAt: string;
  flightOutArriveAt: string;
  flightBackNumber: string;
  flightBackDepartAt: string;
  flightBackArriveAt: string;
  pnr: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  bookingRef: string;
}

export interface Meeting {
  id: string;
  eventId: string;
  companyId: string;
  contactId: string;
  startAt: string;
  endAt: string;
  status?: "Scheduled" | "Completed";
  place: string;
  ownerUserId: string;
  secondPersonTitle?: string;
  mobileOverride?: string;
  description?: string;
}

export interface Note {
  id: string;
  companyId: string;
  createdByUserId: string;
  text: string;
  createdAt: string;
  relatedEventId?: string;
  relatedMeetingId?: string;
  relatedContactId?: string;
  reminderAt?: string;
  reminderTriggered?: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorUserId: string;
  content: string;
  kind: TaskCommentKind;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string;
  createdByUserId: string;
  assigneeUserId: string;
  watcherUserIds: string[];
  visibility: TaskVisibility;
  companyId?: string;
  eventId?: string;
  interconnectionProcessId?: string;
  projectId?: string;
  meetingId?: string;
  noteId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerUserId: string;
  managerUserIds: string[];
  technicalResponsibleUserId: string;
  salesResponsibleUserId: string;
  productResponsibleUserId: string;
  watcherUserIds: string[];
  status: ProjectStatus;
  strategicPriority: StrategicPriority;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAttachmentLink {
  label: string;
  url: string;
}

export interface ProjectRoleReport {
  authorUserId: string;
  achievements: string[];
  inProgress: string[];
  blockers: string[];
  decisionsRequired: string[];
  nextWeekFocus: string[];
  attachments: ProjectAttachmentLink[];
  submittedAt?: string;
  updatedAt: string;
}

export interface ProjectManagerSummary {
  authorUserId: string;
  executiveSummaryText: string;
  riskLevel: ProjectRiskLevel;
  blockers: string[];
  decisionsRequired: string[];
  deckLinks: ProjectAttachmentLink[];
  submittedAt?: string;
  updatedAt: string;
}

export interface ProjectAiSummary {
  shortText: string;
  fullText: string;
  keyRisks: string[];
  keyBlockers: string[];
  decisionsRequired: string[];
  missingRoles: ProjectSubmissionKey[];
  generatedAt: string;
  generatedByUserId: string;
  coverage: {
    technicalSubmittedAt?: string;
    salesSubmittedAt?: string;
    productSubmittedAt?: string;
    managerSubmittedAt?: string;
  };
}

export interface ProjectLegacyCombinedReport {
  submittedByUserId?: string;
  achievements: string[];
  inProgress: string[];
  blockers: string[];
  decisionsRequired: string[];
  nextWeekFocus: string[];
  riskLevel: ProjectRiskLevel;
  teamStatusSummary?: string;
  attachments: ProjectAttachmentLink[];
  submittedAt?: string;
}

export interface ProjectWeeklyReport {
  id: string;
  projectId: string;
  weekStartDate: string;
  roleReports: {
    technical?: ProjectRoleReport;
    sales?: ProjectRoleReport;
    product?: ProjectRoleReport;
  };
  managerSummary?: ProjectManagerSummary;
  aiSummary?: ProjectAiSummary;
  legacyCombinedReport?: ProjectLegacyCombinedReport;
  createdAt: string;
  updatedAt: string;
  amendsReportId?: string;
}

export interface InterconnectionProcessHistory {
  at: string;
  stage: InterconnectionStage;
  byUserId?: string;
}

export interface InterconnectionProcess {
  id: string;
  companyId: string;
  track: InterconnectionTrack;
  stage: InterconnectionStage;
  stageHistory?: InterconnectionProcessHistory[];
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
  ownerUserId: string;
}

export interface ContractFile {
  id: string;
  kind: "Draft" | "Signed" | "Other";
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedByUserId: string;
  storageRef?: string;
  contentDataUrl?: string;
}

export interface Contract {
  id: string;
  companyId: string;
  interconnectionProcessId: string;
  track: InterconnectionTrack;
  ourEntity: OurEntity;
  contractType: ContractType;
  status: ContractStatus;
  files: ContractFile[];
  requestedByUserId: string;
  internalSignerUserId?: string;
  counterpartySignerName?: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
}

export interface OurCompanyInfo {
  ourEntity: OurEntity;
  legalName: string;
  address: {
    street: string;
    city: string;
    state?: string;
    zip?: string;
    country: string;
  };
  taxIdOrVat: string;
  signatory: {
    name: string;
    title: string;
  };
  emails: {
    billing: string;
    finance: string;
    invoice?: string;
    rate?: string;
    technical?: string;
  };
  bankDetails?: {
    bankName: string;
    iban?: string;
    swift?: string;
    accountNumber?: string;
    currency?: string;
  };
  lastUpdatedAt: string;
}

export type OpsTrack = "SMS" | "Voice";
export type OpsSeverity = "Urgent" | "High" | "Medium";
export type OpsRequestType =
  | "RoutingRequest"
  | "TroubleTicketRequest"
  | "TestRequest"
  | "LossAccepted"
  | "InterconnectionRequest";
export type OpsRequestStatus = "Draft" | "Sent" | "InProgress" | "Done" | "Cancelled" | "Failed";
export type OpsAssignedRole = "AM" | "NOC" | "Routing" | "Supervisor";
export type OpsRequestActionType =
  | "SEND"
  | "START"
  | "MARK_FAILED"
  | "ROUTING_DONE"
  | "TT_SENT"
  | "TEST_DONE"
  | "LOSS_ACCEPTED"
  | "CANCELLED";
export type OpsMonitoringModuleOrigin =
  | "ProviderIssues"
  | "Losses"
  | "NewAndLostTraffics"
  | "TrafficComparison"
  | "ScheduleTestResults"
  | "FailedSmsOrCallAnalysis";
export type OpsCaseStatus = "New" | "InProgress" | "Resolved" | "Ignored" | "Cancelled";
export type OpsCaseCategory = "Loss" | "KPI" | "Traffic" | "Provider" | "Test" | "Other";
export type OpsSlaProfileId = "KPI_ALERT" | "LOSS_ALERT";
export type OpsResolutionType = "Fixed" | "FalsePositive" | "PartnerIssue" | "PlannedWork" | "Unknown";
export type OpsCaseActionType =
  | "ASSIGN"
  | "START"
  | "RESOLVE"
  | "IGNORE"
  | "CANCEL"
  | "COMMENT"
  | "SIGNAL_REFRESHED"
  | "CREATED_MANUAL"
  | "CREATED_AUTO"
  | "ESCALATED";
export type OpsAuditActionType = OpsRequestActionType | OpsCaseActionType;

export interface OpsRequest {
  id: string;
  requestType: OpsRequestType;
  createdByUserId: string;
  assignedToRole: OpsAssignedRole;
  priority: OpsSeverity;
  relatedCompanyId?: string;
  relatedTrack: OpsTrack;
  destination: {
    country: string;
    operator?: string;
  };
  comment: string;
  status: OpsRequestStatus;
  relatedCaseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpsCase {
  id: string;
  moduleOrigin: OpsMonitoringModuleOrigin;
  relatedTrack: OpsTrack;
  severity: OpsSeverity;
  category: OpsCaseCategory;
  detectedAt: string;
  relatedCompanyId?: string;
  relatedProvider?: string;
  relatedDestination?: string;
  description: string;
  status: OpsCaseStatus;
  slaProfileId: OpsSlaProfileId;
  resolvedAt?: string;
  ignoredAt?: string;
  cancelledAt?: string;
  resolutionType?: OpsResolutionType;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpsMonitoringSignal {
  id: string;
  moduleOrigin: OpsMonitoringModuleOrigin;
  relatedTrack: OpsTrack;
  severity: OpsSeverity;
  category: OpsCaseCategory;
  detectedAt: string;
  fingerprint: string;
  relatedCompanyId?: string;
  relatedProvider?: string;
  relatedDestination?: string;
  description: string;
  rawPayload: unknown;
  createdCaseId?: string;
  createdAt: string;
}

export interface OpsMonitoringSignalInput {
  moduleOrigin: OpsMonitoringModuleOrigin;
  relatedTrack: OpsTrack;
  severity: OpsSeverity;
  category: OpsCaseCategory;
  detectedAt: string;
  fingerprint: string;
  relatedCompanyId?: string;
  relatedProvider?: string;
  relatedDestination?: string;
  description: string;
  rawPayload: unknown;
}

export interface OpsAuditLogEntry {
  id: string;
  parentType: "Request" | "Case";
  parentId: string;
  actionType: OpsAuditActionType;
  performedByUserId: string;
  comment?: string;
  timestamp: string;
}

export interface OpsShift {
  id: string;
  track: OpsTrack | "Both";
  startsAt: string;
  endsAt: string;
  userIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OpsPerformanceSnapshot {
  startsAt: string;
  endsAt: string;
  averageTtCreationTimeMs: number;
  averageCaseResolutionTimeMs: number;
  slaCompliancePercent: number;
  casesPerShift: number;
}

export interface TrafficAdapter {
  fetchProviderIssues: () => Promise<OpsMonitoringSignalInput[]>;
  fetchLossAlerts: () => Promise<OpsMonitoringSignalInput[]>;
  fetchTrafficComparison: () => Promise<OpsMonitoringSignalInput[]>;
  fetchTestResults: () => Promise<OpsMonitoringSignalInput[]>;
}

export interface DbState {
  version: number;
  activeUserId: string;
  users: User[];
  events: Event[];
  eventStaff: EventStaff[];
  companies: Company[];
  contacts: Contact[];
  meetings: Meeting[];
  notes: Note[];
  tasks: Task[];
  taskComments: TaskComment[];
  interconnectionProcesses: InterconnectionProcess[];
  projects: Project[];
  projectWeeklyReports: ProjectWeeklyReport[];
  contracts: Contract[];
  ourCompanyInfo: OurCompanyInfo[];
  opsRequests: OpsRequest[];
  opsCases: OpsCase[];
  opsMonitoringSignals: OpsMonitoringSignal[];
  opsAuditLogs: OpsAuditLogEntry[];
  opsShifts: OpsShift[];
  outbox: string[];
}

export interface FilterState {
  companyStatus?: CompanyStatus | "";
  ourEntity?: OurEntity | "";
  type?: CompanyType | "";
  interconnectionType?: InterconnectionType | "";
  workscope?: Workscope | "";
  ownerUserId?: string | "";
}

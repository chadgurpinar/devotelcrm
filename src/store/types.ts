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

export type TaskStatus = "Backlog" | "Open" | "InProgress" | "Done" | "Completed" | "Archived";
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
    cc?: string;
  };
  bankDetails?: {
    bankName?: string;
    iban?: string;
    swift?: string;
    accountHolder?: string;
    currency?: string;
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

export interface TaskLabel {
  id: string;
  name: string;
  color: string; // tailwind bg color token e.g. "bg-rose-500"
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
  archivedAt?: string;
  isUrgent?: boolean;
  kanbanStage?: "Backlog" | "InProgress" | "Done";
  labelIds?: string[];
  attachmentIds?: string[];
  dueDateReminderLastTriggeredAt?: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByUserId: string;
  note?: string;
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
  customTypeName?: string;
  note?: string;
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

export type HrCurrencyCode = "EUR" | "USD" | "GBP" | "TRY";
export type HrEmploymentType = "Full-time" | "Part-time" | "Contractor";
export type HrGender = "Male" | "Female" | "Other" | "PreferNotToSay";
export type HrMaritalStatus = "Single" | "Married" | "Other";
export type HrSalaryDistributionMode = "Percent" | "Fixed";
export type HrLeaveType = "Annual" | "Sick" | "Marriage" | "Bereavement" | "Paternity" | "Maternity" | "Unpaid" | "Other";
export type HrLeaveStatus = "PendingManager" | "PendingHR" | "Approved" | "Rejected";
export type HrExpenseStatus = "PendingManager" | "PendingFinance" | "Approved" | "Rejected" | "Paid" | "Cancelled";
export type HrExpenseClaimType = "Reimbursement" | "Advance";
export type HrAdvanceType = "TravelAdvance" | "PerDiem";
export interface HrAttachmentMeta {
  url: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
}
export type HrAssetCategory = "Laptop" | "Phone" | "Accessory" | "Monitor" | "Other";
export type HrAssetStatus = "Available" | "Assigned" | "Returned" | "Retired" | "Lost" | "Stolen";
export type HrAssetAcceptanceStatus = "Pending" | "Accepted";
export type HrSoftwareLicenseType = "Seat" | "Enterprise" | "Other";
export type HrSoftwareSeatStatus = "Available" | "Assigned" | "Revoked" | "Expired";
export type HrProvisionRequestType = "Hardware" | "Software";
export type HrProvisionRequestPriority = "Low" | "Medium" | "High";
export type HrProvisionRequestStatus = "PendingManager" | "PendingHR" | "Fulfilled" | "Rejected" | "Cancelled";
export type HrLeaveActionType = "MANAGER_APPROVE" | "MANAGER_REJECT" | "HR_APPROVE" | "HR_REJECT";
export type HrExpenseActionType =
  | "SUBMIT"
  | "EDIT"
  | "CANCEL"
  | "COMMENT"
  | "MANAGER_APPROVE"
  | "MANAGER_REJECT"
  | "FINANCE_APPROVE"
  | "FINANCE_REJECT"
  | "MARK_PAID";
export type HrProvisionActionType =
  | "PROVISION_REQUEST_CREATED"
  | "PROVISION_MANAGER_APPROVED"
  | "PROVISION_MANAGER_REJECTED"
  | "PROVISION_HR_APPROVED"
  | "PROVISION_HR_REJECTED"
  | "PROVISION_CANCELLED"
  | "PROVISION_FULFILLED"
  | "ASSET_ASSIGNMENT_CREATED"
  | "ASSET_ASSIGNMENT_ACCEPTED"
  | "ASSET_ASSIGNMENT_ACCEPTANCE_REVOKED"
  | "SOFTWARE_SEAT_ASSIGNED"
  | "SOFTWARE_SEAT_REVOKED";
export type HrAuditActionType =
  | HrLeaveActionType
  | HrExpenseActionType
  | HrProvisionActionType
  | "ASSET_ASSIGNED"
  | "ASSET_ACCEPTED"
  | "ASSET_RETURNED"
  | "COMPENSATION_UPDATED"
  | "PAYROLL_SNAPSHOT_GENERATED";

export interface HrLegalEntity {
  id: OurEntity;
  name: string;
  country: string;
  currency: HrCurrencyCode;
  bankDetailsRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrFxRate {
  id: string;
  from: HrCurrencyCode;
  to: "EUR";
  rate: number;
  effectiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrDepartment {
  id: string;
  name: string;
  parentDepartmentId?: string;
  targetHeadcount?: number;
  departmentHeadEmployeeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrEmployee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  active: boolean;
  employmentType: HrEmploymentType;
  startDate: string;
  endDate?: string;
  seniorityYears?: number;
  managerId?: string;
  departmentId: string;
  division?: string;
  position?: string;
  jobTitle?: string;
  gradeLevel?: string;
  workLocation?: string;
  countryOfEmployment: string;
  legalEntityId: OurEntity;
  company?: string;
  citizenshipIdNumber?: string;
  email: string;
  phone: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  nationality?: string;
  gender?: HrGender;
  birthDate?: string;
  maritalStatus?: HrMaritalStatus;
  numberOfChildren?: number;
  university?: string;
  universityDepartment?: string;
  degree?: string;
  salaryTry?: number;
  salaryEur?: number;
  salaryGbp?: number;
  salaryUsd?: number;
  totalSalaryUsdEq?: number;
  bankName?: string;
  ibanOrTrc20?: string;
  employeeFolderUrl?: string;
  masterContractSignedAt?: string;
  createdAt: string;
  updatedAt: string;
  systemUserId?: string;
}

export interface HrBonusEntry {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  currency: HrCurrencyCode;
  description: string;
}

export interface HrSalaryDistributionLine {
  id: string;
  legalEntityId: OurEntity;
  mode: HrSalaryDistributionMode;
  percent?: number;
  fixedAmount?: number;
  currency: HrCurrencyCode;
}

export interface HrEmployeeCompensation {
  id: string;
  employeeId: string;
  baseSalaryNet: number;
  baseSalaryGross: number;
  employerCost: number;
  currency: HrCurrencyCode;
  bonusEntries: HrBonusEntry[];
  salaryDistribution: HrSalaryDistributionLine[];
  createdAt: string;
  updatedAt: string;
}

export interface HrPayrollFilters {
  legalEntityId?: OurEntity | "";
  departmentId?: string | "";
  country?: string | "";
  employmentType?: HrEmploymentType | "";
}

export interface HrPayrollDistributionBreakdown {
  legalEntityId: OurEntity;
  weightPct: number;
  netAmount: number;
  employerCostAmount: number;
  bonusAmount: number;
  currency: HrCurrencyCode;
  netEur: number;
  employerCostEur: number;
  bonusEur: number;
}

export interface HrPayrollEmployeeLine {
  id: string;
  snapshotId: string;
  employeeId: string;
  net: number;
  gross: number;
  employerCost: number;
  currency: HrCurrencyCode;
  bonusesTotal: number;
  netEur: number;
  employerCostEur: number;
  bonusesEur: number;
  distributionBreakdown: HrPayrollDistributionBreakdown[];
}

export interface HrPayrollMonthSnapshot {
  id: string;
  month: string;
  createdAt: string;
  createdByUserId: string;
  notes?: string;
  filtersUsed: HrPayrollFilters;
  fxRateSetRef?: string;
  lines: HrPayrollEmployeeLine[];
  totals: {
    netEur: number;
    employerCostEur: number;
    bonusesEur: number;
    headcount: number;
    byLegalEntity: Array<{
      legalEntityId: OurEntity;
      netEur: number;
      employerCostEur: number;
      bonusesEur: number;
      headcount: number;
    }>;
  };
}

export interface HrCountryLeaveProfile {
  id: string;
  country: string;
  annualLeaveDays: number;
  sickLeaveDays: number;
  carryOverPolicy: string;
  resetPolicy: string;
  seniorityTiers?: Array<{ minYears: number; maxYears: number | null; days: number }>;
  workingDays?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface HrLeaveRequest {
  id: string;
  employeeId: string;
  leaveType: HrLeaveType;
  startDate: string;
  endDate: string;
  employeeComment?: string;
  totalDays: number;
  halfDay?: boolean;
  doctorNoteFileName?: string;
  status: HrLeaveStatus;
  managerApprovedAt?: string;
  hrApprovedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrAsset {
  id: string;
  name: string;
  category: HrAssetCategory;
  status: HrAssetStatus;
  assignedToEmployeeId?: string;
  assignedAt?: string;
  returnedAt?: string;
  digitalAcceptance: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrSoftwareLicense {
  id: string;
  name: string;
  vendor: string;
  licenseType: string;
  assignedToEmployeeId?: string;
  startDate: string;
  endDate?: string;
  cost?: number;
  currency?: HrCurrencyCode;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrAssetAssignment {
  id: string;
  assetId: string;
  employeeId: string;
  assignedAt: string;
  returnedAt?: string;
  returnCondition?: string;
  acceptanceStatus: HrAssetAcceptanceStatus;
  acceptedAt?: string;
  revokedAt?: string;
  assignedByUserId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrSoftwareProduct {
  id: string;
  name: string;
  vendor: string;
  licenseType: HrSoftwareLicenseType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrSoftwareSeat {
  id: string;
  softwareProductId: string;
  status: HrSoftwareSeatStatus;
  assignedToEmployeeId?: string;
  assignedToEmail?: string;
  assignedAt?: string;
  revokedAt?: string;
  endDate?: string;
  cost?: number;
  currency?: HrCurrencyCode;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrProvisionRequest {
  id: string;
  requesterEmployeeId: string;
  requestType: HrProvisionRequestType;
  requestedAssetCategory?: HrAssetCategory;
  requestedSoftwareProductId?: string;
  justification: string;
  priority: HrProvisionRequestPriority;
  status: HrProvisionRequestStatus;
  managerApproverUserId?: string;
  hrApproverUserId?: string;
  managerApprovedAt?: string;
  hrApprovedAt?: string;
  fulfilledAt?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  linkedAssetAssignmentId?: string;
  linkedSoftwareSeatId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrExpense {
  id: string;
  employeeId: string;
  claimType: HrExpenseClaimType;
  advanceType?: HrAdvanceType;
  category: string;
  amount: number;
  currency: HrCurrencyCode;
  convertedAmountEUR: number;
  description: string;
  receiptUrl?: string;
  attachmentMeta?: HrAttachmentMeta;
  travelStartDate?: string;
  travelEndDate?: string;
  advancePurpose?: string;
  paymentMethod?: "CompanyCard" | "Personal";
  costCenterTag?: string;
  rejectedAt?: string;
  status: HrExpenseStatus;
  managerApprovedAt?: string;
  financeApprovedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  reconciledAt?: string;
  reconciledWithClaimIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HrAuditLogEntry {
  id: string;
  parentType:
    | "Leave"
    | "Expense"
    | "Asset"
    | "Compensation"
    | "PayrollSnapshot"
    | "ProvisionRequest"
    | "AssetAssignment"
    | "SoftwareSeat";
  parentId: string;
  actionType: HrAuditActionType;
  performedByUserId: string;
  comment?: string;
  timestamp: string;
}

export interface HrCompChangeLog {
  id: string;
  employeeId: string;
  changedByUserId: string;
  changedAt: string;
  reason: string;
  previousSalaryEur?: number;
  newSalaryEur?: number;
}

export interface HrPublicHoliday {
  id: string;
  country: string;
  date: string;
  name: string;
}

export type NocPortalType = "SMS" | "Voice";

export type NocCaseType =
  | "ProviderIssue"
  | "Losses"
  | "NewLostTraffic"
  | "TrafficComparison"
  | "ScheduleTest"
  | "FailedSmsCall";

export type NocSeverity =
  | "MEDIUM"
  | "HIGH"
  | "URGENT"
  | "DECREASE"
  | "INCREASE";

export type NocCaseAction =
  | "TT_RAISED"
  | "IGNORED"
  | "CHECKED_NOISSUE"
  | "ROUTING_CHANGED"
  | "AC_MNG_INFORMED"
  | "ROUTING_INFORMED";

export type NocCaseStatus = "Open" | "Actioned";

export interface NocCase {
  id: string;
  portalType: NocPortalType;
  caseType: NocCaseType;
  severity: NocSeverity;
  status: NocCaseStatus;
  createdAt: string;
  providerName?: string;
  customerName?: string;
  destination?: string;
  smsCount?: number;
  callCount?: number;
  dlrRate?: number;
  asrRate?: number;
  lossAmount?: number;
  attemptCount?: number;
  testResult?: string;
  trafficDirection?: "DECREASE" | "INCREASE";
  trafficChangePercent?: number;
  action?: NocCaseAction;
  ttNumber?: string;
  comment?: string;
  actionedBy?: string;
  actionedAt?: string;
}

export type OpsPortalId =
  | "sms-noc"
  | "voice-noc"
  | "routing-noc"
  | "am-noc-routing"
  | "account-managers"
  | "performance-audit";

export type OpsTrack = "SMS" | "VOICE";
export type OpsTrackFilter = OpsTrack | "ANY";
export type OpsSeverity = "MEDIUM" | "HIGH" | "URGENT";
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
  | "PROVIDER_ISSUES"
  | "LOSSES"
  | "NEW_AND_LOST_TRAFFICS"
  | "TRAFFIC_COMPARISON"
  | "SCHEDULE_TEST_RESULTS"
  | "FAILED_SMS_OR_CALL_ANALYSIS";
export type OpsCaseStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "IGNORED" | "CANCELLED";
export type OpsCaseCategory =
  | "PROVIDER_ISSUE"
  | "LOSSES"
  | "NEW_LOST_TRAFFIC"
  | "TRAFFIC_COMPARISON"
  | "SCHEDULE_TEST_RESULT"
  | "FAILED_SMS_CALL";
export type OpsTrafficComparisonType = "INCREASE" | "DECREASE";
export type OpsSlaProfileId = "DEFAULT" | "LOSS" | "KPI" | "TEST";
export type OpsResolutionType =
  | "NO_ISSUE"
  | "ROUTING_CHANGED"
  | "ACCOUNT_MANAGER_INFORMED"
  | "ROUTING_INFORMED"
  | "TT_RAISED"
  | "IGNORED"
  | "FIXED"
  | "FALSE_POSITIVE"
  | "PARTNER_ISSUE"
  | "PLANNED_WORK"
  | "UNKNOWN";
export type OpsCaseActionType =
  | "CHECKED_NO_ISSUE"
  | "ROUTING_CHANGED"
  | "ACCOUNT_MANAGER_INFORMED"
  | "ROUTING_INFORMED"
  | "TT_RAISED"
  | "IGNORED"
  | "RESOLVE"
  | "ASSIGN"
  | "START"
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

export interface OpsSlaProfile {
  id: OpsSlaProfileId;
  name: string;
  targetsMs: Record<OpsSeverity, number>;
}

export interface OpsCaseMetadataProviderIssue {
  providerName: string;
  smsCount?: number;
  callCount?: number;
  dlrValue?: number;
  asrValue?: number;
  alertTime: string;
}

export interface OpsCaseMetadataLosses {
  customerName: string;
  destination: string;
  lossAmount: number;
  alertTime: string;
}

export interface OpsCaseMetadataNewLostTraffic {
  customerName: string;
  destination: string;
  attemptCount: number;
  alertTime: string;
}

export interface OpsCaseMetadataTrafficComparison {
  comparisonType: OpsTrafficComparisonType;
  comparisonPercentage: number;
  alertTime: string;
}

export interface OpsCaseMetadataScheduleTestResult {
  providerName: string;
  destination: string;
  testResult: string;
  testToolName: "TELQ" | "ARPTEL";
  alertTime: string;
}

export interface OpsCaseMetadataFailedSmsCall {
  customerName: string;
  destination: string;
  attemptCount: number;
  alertTime: string;
}

export type OpsCaseMetadata =
  | OpsCaseMetadataProviderIssue
  | OpsCaseMetadataLosses
  | OpsCaseMetadataNewLostTraffic
  | OpsCaseMetadataTrafficComparison
  | OpsCaseMetadataScheduleTestResult
  | OpsCaseMetadataFailedSmsCall;

export interface OpsCaseDisposition {
  resolutionType: OpsResolutionType;
  performedByUserId: string;
  performedAt: string;
  comment?: string;
}

export interface OpsCase {
  id: string;
  portalOrigin: OpsPortalId;
  moduleOrigin: OpsMonitoringModuleOrigin;
  track: OpsTrack;
  relatedTrack?: OpsTrack;
  severity: OpsSeverity;
  category: OpsCaseCategory;
  detectedAt: string;
  metadata: OpsCaseMetadata;
  relatedCompanyId?: string;
  relatedProvider?: string;
  relatedDestination?: string;
  description: string;
  status: OpsCaseStatus;
  slaProfileId: OpsSlaProfileId;
  slaDeadline: string;
  linkedSignalIds: string[];
  lastSignalAt?: string;
  ttNumber?: string;
  ttRaisedAt?: string;
  resolvedAt?: string;
  ignoredAt?: string;
  cancelledAt?: string;
  resolutionType?: OpsResolutionType;
  disposition?: OpsCaseDisposition;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpsMonitoringSignal {
  id: string;
  moduleOrigin: OpsMonitoringModuleOrigin;
  track: OpsTrack;
  relatedTrack?: OpsTrack;
  severity: OpsSeverity;
  category: OpsCaseCategory;
  detectedAt: string;
  metadata: OpsCaseMetadata;
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
  track: OpsTrack;
  relatedTrack?: OpsTrack;
  severity: OpsSeverity;
  category: OpsCaseCategory;
  detectedAt: string;
  metadata: OpsCaseMetadata;
  fingerprint: string;
  relatedCompanyId?: string;
  relatedProvider?: string;
  relatedDestination?: string;
  description: string;
  rawPayload: unknown;
}

export interface OpsCaseAction {
  id: string;
  caseId: string;
  type: OpsCaseActionType;
  resolutionType?: OpsResolutionType;
  comment?: string;
  ttNumber?: string;
  performedByUserId: string;
  performedAt: string;
}

export interface OpsAuditLogEntry {
  id: string;
  parentType: "Request" | "Case";
  parentId: string;
  actionType: OpsAuditActionType;
  performedByUserId: string;
  comment?: string;
  resolutionType?: OpsResolutionType;
  ttNumber?: string;
  caseActionId?: string;
  timestamp: string;
}

export interface OpsShift {
  id: string;
  track: OpsTrack | "BOTH";
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

export type WeeklyReportStatus = "Draft" | "Submitted";
export type WorkloadRating = 1 | 2 | 3 | 4 | 5;
export type ProductivityRating = 1 | 2 | 3 | 4 | 5;

export interface WeeklyStaffReport {
  id: string;
  employeeId: string;
  weekStartDate: string;
  status: WeeklyReportStatus;
  reportText: string;
  highlights: string[];
  workloadRating: WorkloadRating;
  productivityRating: ProductivityRating;
  calendarScreenshotUrl?: string;
  calendarConnected?: boolean;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReportManagerComment {
  id: string;
  reportId: string;
  managerUserId: string;
  commentText: string;
  aiGenerated: boolean;
  createdAt: string;
}

export interface WeeklyReportAiSummary {
  reportId?: string;
  scope: "individual" | "team" | "company";
  scopeId: string;
  weekStartDate?: string;
  monthKey?: string;
  workloadAssessment: string;
  productivityAssessment: string;
  overallVerdict: string;
  flags: string[];
  generatedAt: string;
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
  taskLabels: TaskLabel[];
  taskComments: TaskComment[];
  taskAttachments: TaskAttachment[];
  interconnectionProcesses: InterconnectionProcess[];
  projects: Project[];
  projectWeeklyReports: ProjectWeeklyReport[];
  contracts: Contract[];
  ourCompanyInfo: OurCompanyInfo[];
  hrLegalEntities: HrLegalEntity[];
  hrFxRates: HrFxRate[];
  hrDepartments: HrDepartment[];
  hrEmployees: HrEmployee[];
  hrCompensations: HrEmployeeCompensation[];
  hrPayrollSnapshots: HrPayrollMonthSnapshot[];
  hrLeaveProfiles: HrCountryLeaveProfile[];
  hrLeaveRequests: HrLeaveRequest[];
  hrAssets: HrAsset[];
  hrSoftwareLicenses: HrSoftwareLicense[];
  hrAssetAssignments: HrAssetAssignment[];
  hrSoftwareProducts: HrSoftwareProduct[];
  hrSoftwareSeats: HrSoftwareSeat[];
  hrProvisionRequests: HrProvisionRequest[];
  hrExpenses: HrExpense[];
  hrAuditLogs: HrAuditLogEntry[];
  hrCompChangeLogs: HrCompChangeLog[];
  hrPublicHolidays: HrPublicHoliday[];
  opsRequests: OpsRequest[];
  opsCases: OpsCase[];
  opsMonitoringSignals: OpsMonitoringSignal[];
  opsAuditLogs: OpsAuditLogEntry[];
  opsShifts: OpsShift[];
  opsSlaProfiles: OpsSlaProfile[];
  nocCases: NocCase[];
  weeklyStaffReports: WeeklyStaffReport[];
  weeklyReportManagerComments: WeeklyReportManagerComment[];
  weeklyReportAiSummaries: WeeklyReportAiSummary[];
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

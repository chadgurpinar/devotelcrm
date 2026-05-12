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

export type TaskStatus = "Backlog" | "ToDo" | "InProgress" | "Done" | "Cancelled";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";
export type TaskVisibility = "Private" | "Shared";
export type TaskCommentKind = "Comment" | "Blocker";

export type ProjectStatus = "Planning" | "InProgress" | "Paused" | "Completed" | "OnHold" | "Cancelled";
export type StrategicPriority = "Low" | "Medium" | "High";
export type ProjectRiskLevel = "Low" | "Medium" | "High";
export type ProjectRoleKey = "technical" | "sales" | "product";
export type ProjectSubmissionKey = ProjectRoleKey | "manager";

export interface User {
  id: string;
  name: string;
  role:
    | "SuperAdmin"
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
  planningStatus?: "Planned" | "PlanningComplete" | "Attended" | "Skipped";
}

export type EventAttendDecision = "Undecided" | "Attend" | "Skip";
export type EventParticipationType = "Sponsor" | "Ticket" | "Undecided";

export interface EventSponsorshipOption {
  id: string;
  label: string;
  priceEur: number;
}

export interface EventEvaluation {
  id: string;
  eventId: string;
  year: number;
  attendDecision: EventAttendDecision;
  participationType: EventParticipationType;
  sponsorshipOptions: EventSponsorshipOption[];
  selectedSponsorshipId?: string;
  ticketPricePerPersonEur?: number;
  estimatedAttendeesCount: number;
  estimatedFlightPerPersonEur: number;
  estimatedHotelPerPersonEur: number;
  estimatedDailyExpensePerPersonEur: number;
  estimatedEventDays: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventCostCategory = "Sponsorship" | "Ticket" | "Flight" | "Hotel" | "DailyExpense" | "Other";

export interface EventCostLineItem {
  id: string;
  eventId: string;
  category: EventCostCategory;
  description: string;
  amountEur: number;
  paidByUserId?: string;
  receiptFileName?: string;
  createdAt: string;
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
  kanbanStage?: "Backlog" | "ToDo" | "InProgress" | "Done" | "Cancelled";
  labelIds?: string[];
  attachmentIds?: string[];
  dueDateReminderLastTriggeredAt?: string;
  estimatedHours?: number;
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
  reportDeadlines?: {
    memberLockDay: number;
    memberLockTime: string;
    managerLockDay: number;
    managerLockTime: string;
  };
  responsibleRoles?: { key: string; label: string; userId: string }[];
  responsibles?: Array<{ roleLabel: string; userId: string }>;
  customLabels?: string[];
  startDate?: string;
  endDate?: string;
  budget?: number;
  executiveStatus?: "approved" | "changes_requested" | "escalated";
  executiveStatusNote?: string;
  executiveStatusUpdatedAt?: string;
  executiveFeedback?: Array<{ id: string; authorUserId: string; text: string; action: "comment" | "approved" | "changes_requested" | "escalated"; submittedAt: string; weekRef?: string }>;
  managerComment?: string;
  managerCommentUpdatedAt?: string;
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
  overallStatus?: "OnTrack" | "AtRisk" | "Delayed";
  score?: number;
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
  roleComments?: {
    technical?: Array<{ id: string; managerUserId: string; text: string; createdAt: string }>;
    sales?: Array<{ id: string; managerUserId: string; text: string; createdAt: string }>;
    product?: Array<{ id: string; managerUserId: string; text: string; createdAt: string }>;
  };
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
  legalEntityId?: OurEntity;
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
  profilePhotoBase64?: string;
  projectIds?: string[];
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
  serialNumber?: string;
  imei?: string;
  purchaseDate?: string;
  warrantyEndsAt?: string;
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
  returnCondition?: "Good" | "Damaged" | "Needs Replacement";
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

export interface HrDigitalSignature {
  id: string;
  assetAssignmentId: string;
  employeeId: string;
  signedAt: string;
  signatureDataUrl: string;
  deviceInfo?: string;
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

export type RoutingReqTab =
  | "Routing Request"
  | "TT Request"
  | "Test Request"
  | "Loss Accepted";

export type RoutingReqStatus =
  | "Open"
  | "Routing Done"
  | "TT Sent"
  | "Test Successful"
  | "Test Failed"
  | "Loss Accepted"
  | "Loss Not Accepted"
  | "Cancelled";

export interface RoutingNocRequest {
  id: string;
  tab: RoutingReqTab;
  fields: Record<string, string>;
  submittedBy: string;
  submittedAt: string;
  status: RoutingReqStatus;
  nocComment?: string;
  closedBy?: string;
  closedAt?: string;
  reviewedByAm?: boolean;
}

export type AmTab =
  | "Route Request"
  | "Traffic Request"
  | "Targets"
  | "Deal Offers";

export interface AmComment {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface AmEntry {
  id: string;
  tab: AmTab;
  fields?: Record<string, string>;
  customer?: Record<string, string>;
  provider?: Record<string, string>;
  submittedBy: string;
  submittedAt: string;
  expiresAt: string;
  isArchived: boolean;
  comments: AmComment[];
}

export type NocTeamType = "Monitoring" | "Routing";

export type NocPerfCaseType =
  | "Urgent"
  | "High"
  | "Medium"
  | "TrafficComparison"
  | "RoutingRequest"
  | "TTRequest"
  | "TestRequest"
  | "LossAccepted";

export interface NocPerfCaseAction {
  id: string;
  caseType: NocPerfCaseType;
  resolvedWithinSla: boolean;
  bonusApplied: boolean;
  pointsEarned: number;
  caseRef?: string;
  recordedAt: string;
}

export interface NocPerfWeekEntry {
  id: string;
  memberId: string;
  month: string;
  week: 1 | 2 | 3 | 4;
  caseActions: NocPerfCaseAction[];
  disciplineScore: number;
  weeklyManagerNote?: string;
}

export interface NocPerfManagerOpinion {
  responsibility: number;
  teamwork: number;
  learning: number;
  proactivity: number;
  communication: number;
}

export interface NocPerfMonthSummary {
  id: string;
  memberId: string;
  month: string;
  technicalScore: number;
  disciplineScore: number;
  managerOpinionScore: number;
  managerOpinionBreakdown: NocPerfManagerOpinion;
  finalScore: number;
  managerComment?: string;
  spotlightBonus: number;
  behavioralPenalty: number;
  createdAt: string;
  updatedAt: string;
}

export interface NocMember {
  id: string;
  name: string;
  teamType: NocTeamType;
  role?: string;
  active: boolean;
  joinedAt: string;
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

export type WholesaleTrafficType = "Direct" | "Generated";
export type TrafficSourceType = "Facebook" | "TikTok" | "WhatsApp" | "Other";

export interface WholesaleTrafficRecord {
  id: string;
  timestamp: string;
  trafficType: WholesaleTrafficType;
  trafficSourceType: TrafficSourceType;
  sourceAccount: string;
  destinationAccount: string;
  senderId: string;
  country: string;
  operator: string;
  submitCount: number;
  deliveryCount: number;
  buyPrice: number;
  sellPrice: number;
}

/** Reserved for cached baseline stats (v3); may stay empty while heuristics run client-side. */
export interface TrafficBaseline {
  id: string;
  dimensionKey: string;
  hourOfDay: number;
  avgVolume: number;
  stdVolume: number;
  createdAt: string;
}

export type TrafficAlertSeverity = "info" | "warning" | "critical";
export type TrafficAlertMetric = "dlr" | "volume_spike";
export type TrafficAlertCompareOp = "lt" | "gt";

export interface TrafficAlertRule {
  id: string;
  name: string;
  enabled: boolean;
  metric: TrafficAlertMetric;
  compareOp: TrafficAlertCompareOp;
  threshold: number;
  dimension: "global" | "sourceAccount" | "operator";
  minSubmit: number;
  createdAt: string;
}

export interface TrafficAlertEvent {
  id: string;
  ruleId: string;
  severity: TrafficAlertSeverity;
  title: string;
  detail: string;
  sourceAccount?: string;
  country?: string;
  operator?: string;
  /** Stable key for evaluation de-duplication across runs. */
  dedupeKey?: string;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
}

// ─── Finance (Phase 1 — Finance* layer) ─────────────────────────────

export type FinanceCurrencyCode = "EUR" | "USD" | "GBP" | "TRY" | "CHF" | "AED";

export type FinanceDirection = "Inflow" | "Outflow";
export type FinanceBilateralDirection = "Receivable" | "Payable";
export type FinanceConfidence = "Confirmed" | "Expected" | "Planned";
export type FinancePaymentMethod = "BankTransfer" | "CreditCard" | "DirectDebit" | "Cash" | "Other";

export interface FinanceCashPosition {
  id: string;
  entityId: OurEntity;
  currency: FinanceCurrencyCode;
  amountOriginal: number;
  amountEur: number;
  asOf: string;
  source: "Manual" | "BankFeed";
  /** Optional link to a `FinanceBankAccount`. */
  bankAccountId?: string;
  notes?: string;
  updatedAt: string;
  updatedByUserId: string;
}

export type FinanceBankAccountStatus = "Active" | "Frozen" | "Closed";

export interface FinanceBankAccount {
  id: string;
  entityId: OurEntity;
  bankName: string;
  accountName: string;
  /** Last-4 or masked account number. Storing masked for display only. */
  accountNumberMasked?: string;
  iban?: string;
  swift?: string;
  currency: FinanceCurrencyCode;
  jurisdiction?: string;
  ownerUserId?: string;
  /** True if balance held in this account is restricted (escrow / collateral / legal hold). */
  restricted: boolean;
  /** True if this account's balance should be included in cashflow forecast. */
  includedInForecast: boolean;
  /** Last connection sync (when `source` on positions is "BankFeed"). */
  lastSyncAt?: string;
  status: FinanceBankAccountStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinanceBankConnectionKind = "Manual" | "BankFeed" | "API";
export type FinanceBankConnectionStatus = "Connected" | "Stale" | "Error" | "NotConfigured";

/**
 * Logical "connection" record per bank account — drives the Cash Visibility KPI
 * and the Liquidity bank-account table's freshness column.
 */
export interface FinanceBankConnection {
  id: string;
  bankAccountId: string;
  kind: FinanceBankConnectionKind;
  status: FinanceBankConnectionStatus;
  lastSyncAt?: string;
  errorMessage?: string;
  notes?: string;
  updatedAt: string;
}

/** Per-entity minimum operating cash threshold (EUR) — used by Forecast and Liquidity. */
export interface FinanceLiquidityThreshold {
  id: string;
  entityId: OurEntity;
  minOperatingCashEur: number;
  notes?: string;
  updatedAt: string;
}

export type FinanceCounterpartyType = "Customer" | "Provider" | "Internal" | "Other";

export interface FinanceCounterparty {
  id: string;
  type: FinanceCounterpartyType;
  companyId?: string;
  name: string;
  defaultCurrency: FinanceCurrencyCode;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinanceARAPSourceType = "Usage" | "Invoice" | "Projection" | "Manual";
export type FinanceARAPStatus = "Planned" | "Open" | "PartiallyPaid" | "Paid" | "Overdue" | "Cancelled";

export interface FinanceARAPItem {
  id: string;
  entityId: OurEntity;
  counterpartyId: string;
  direction: FinanceBilateralDirection;
  sourceType: FinanceARAPSourceType;
  currency: FinanceCurrencyCode;
  amountOriginal: number;
  amountEur: number;
  paidAmountOriginal?: number;
  paidAmountEur?: number;
  issueDate: string;
  dueDate?: string;
  /** Operational expected-payment date — used by Cashflow Forecast and counterparty drawers (separate from `dueDate`). */
  expectedPaymentDate?: string;
  /** Internal user (HrEmployee.id or User.id) responsible for chasing / approving this item. */
  assigneeUserId?: string;
  /** True when invoice is under dispute (pause collection / payment). */
  disputed?: boolean;
  /** True when payment is blocked (compliance / approvals). */
  blocked?: boolean;
  /** True when this item can be offset against an opposite-direction item with the same counterparty. */
  nettingEligible?: boolean;
  /** True when this item represents an intercompany flow (counterparty is another `OurEntity`). */
  intercompany?: boolean;
  status: FinanceARAPStatus;
  description: string;
  referenceId?: string;
  invoiceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinanceInvoiceType = "CustomerInvoice" | "SupplierInvoice";
export type FinanceInvoiceStatus = "Draft" | "Issued" | "PartiallyPaid" | "Paid" | "Overdue" | "Cancelled";
export type FinanceInvoiceServiceType = "SMS" | "Voice" | "Platform" | "Consulting" | "Other";

export interface FinanceInvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  serviceType: FinanceInvoiceServiceType;
  periodFrom?: string;
  periodTo?: string;
  quantity?: number;
  unitPrice?: number;
  amountOriginal: number;
  currency: FinanceCurrencyCode;
}

export interface FinanceInvoice {
  id: string;
  entityId: OurEntity;
  counterpartyId: string;
  type: FinanceInvoiceType;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: FinanceCurrencyCode;
  amountOriginal: number;
  amountEur: number;
  paidAmountOriginal?: number;
  paidAmountEur?: number;
  status: FinanceInvoiceStatus;
  /** Embedded; not stored as a separate DbState array. */
  lines: FinanceInvoiceLine[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancePayment {
  id: string;
  entityId: OurEntity;
  counterpartyId?: string;
  direction: "Incoming" | "Outgoing";
  paymentDate: string;
  currency: FinanceCurrencyCode;
  amountOriginal: number;
  amountEur: number;
  method: FinancePaymentMethod;
  invoiceId?: string;
  arapItemId?: string;
  description: string;
  notes?: string;
  createdAt: string;
  createdByUserId: string;
}

export type FinanceProjectionCategory =
  | "CustomerPayment"
  | "ProviderPayment"
  | "Salary"
  | "Rent"
  | "Tax"
  | "CreditCard"
  | "DirectDebit"
  | "Loan"
  | "Other";

export type FinanceProjectionStatus = "Pending" | "Realised" | "Cancelled";

export interface FinanceProjection {
  id: string;
  entityId: OurEntity;
  counterpartyId?: string;
  direction: FinanceDirection;
  label: string;
  dueDate: string;
  currency: FinanceCurrencyCode;
  amountOriginal: number;
  amountEur: number;
  category: FinanceProjectionCategory;
  confidence: FinanceConfidence;
  status: FinanceProjectionStatus;
  linkedARAPItemId?: string;
  linkedDirectDebitId?: string;
  linkedCreditCardId?: string;
  linkedSalaryPlanId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinanceCreditCardStatus = "Active" | "Cancelled" | "Suspended";

export type FinanceCreditCardExpenseCategory =
  | "Software"
  | "Advertising"
  | "Travel"
  | "Office"
  | "Subscription"
  | "Utilities"
  | "Meals"
  | "Hardware"
  | "Legal"
  | "Hosting"
  | "Telecom"
  | "Other";

export interface FinanceCreditCardTransaction {
  id: string;
  cardId: string;
  /** Optional link to the statement that absorbed this transaction. */
  statementId?: string;
  transactionDate: string;
  merchant: string;
  category: FinanceCreditCardExpenseCategory;
  amountOriginal: number;
  amountEur: number;
  currency: FinanceCurrencyCode;
  /** Cardholder / employee user-id (HR or User scope). */
  cardholderUserId?: string;
  /** Free-form project tag (e.g. "MWC 2026", "API platform v2"). */
  projectTag?: string;
  /** True when this is a known recurring charge (subscription / contract). */
  recurring: boolean;
  notes?: string;
  createdAt: string;
}

export interface FinanceCreditCardStatementCategory {
  category: FinanceCreditCardExpenseCategory;
  amountOriginal: number;
  amountEur: number;
  description?: string;
}

export interface FinanceCreditCardStatement {
  id: string;
  cardId: string;
  statementMonth: string;
  totalAmountOriginal: number;
  totalAmountEur: number;
  currency: FinanceCurrencyCode;
  categories: FinanceCreditCardStatementCategory[];
  dueDate: string;
  paidDate?: string;
  paidAmountOriginal?: number;
  paidAmountEur?: number;
  status: "Unpaid" | "Paid" | "PartiallyPaid" | "Overdue";
  importedAt: string;
  notes?: string;
}

export interface FinanceCreditCard {
  id: string;
  entityId: OurEntity;
  cardName: string;
  lastFourDigits: string;
  currency: FinanceCurrencyCode;
  creditLimitOriginal?: number;
  currentBalanceOriginal?: number;
  currentBalanceEur?: number;
  statementDayOfMonth: number;
  paymentDueDayOfMonth: number;
  status: FinanceCreditCardStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinanceDirectDebitFrequency = "Monthly" | "Quarterly" | "Annual" | "OneOff";
export type FinanceDirectDebitStatus = "Active" | "Cancelled" | "Paused";

export type FinanceDirectDebitCategory =
  | "Software"
  | "Utilities"
  | "Rent"
  | "Insurance"
  | "Loan"
  | "Subscription"
  | "Tax"
  | "Other";

export interface FinanceDirectDebit {
  id: string;
  entityId: OurEntity;
  label: string;
  counterpartyId?: string;
  currency: FinanceCurrencyCode;
  amountOriginal: number;
  amountEur: number;
  frequency: FinanceDirectDebitFrequency;
  nextDueDate: string;
  dayOfMonth?: number;
  category: FinanceDirectDebitCategory;
  status: FinanceDirectDebitStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinanceSalaryPlanStatus = "Planned" | "Paid" | "Cancelled";

export type FinanceSalaryPersonKind = "Employee" | "Contractor";

/** Per-person default salary, used to pre-populate new monthly plans. */
export interface FinanceSalaryDefault {
  id: string;
  personKind: FinanceSalaryPersonKind;
  /** HrEmployee.id (when Employee) or FinanceContractor.id (when Contractor). */
  personId: string;
  entityId: OurEntity;
  currency: FinanceCurrencyCode;
  defaultNetOriginal: number;
  defaultEmployerCostOriginal?: number;
  notes?: string;
  updatedAt: string;
}

/** Lightweight contractor record — separate from HR employees. */
export interface FinanceContractor {
  id: string;
  name: string;
  defaultEntityId: OurEntity;
  defaultCurrency: FinanceCurrencyCode;
  email?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSalaryPlanLine {
  id: string;
  salaryPlanId: string;
  /**
   * Legacy field. New code should use `personKind` + `personId`.
   * Kept for backward compatibility with rows seeded before contractors.
   */
  employeeId: string;
  /** When set, indicates whether `employeeId` is an HR employee or a finance contractor. */
  personKind?: FinanceSalaryPersonKind;
  /** Mirrored from `employeeId`; new lines populate this explicitly. */
  personId?: string;
  entityId: OurEntity;
  currency: FinanceCurrencyCode;
  plannedNetOriginal: number;
  plannedNetEur: number;
  plannedEmployerCostOriginal?: number;
  plannedEmployerCostEur?: number;
  notes?: string;
}

export interface FinanceSalaryPlan {
  id: string;
  month: string;
  status: FinanceSalaryPlanStatus;
  lines: FinanceSalaryPlanLine[];
  totalNetEur: number;
  totalEmployerCostEur: number;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
}

/**
 * Snapshot of a forecasted weekly bucket — produced manually when the user
 * clicks "Run snapshot" on the Cashflow Forecast page. Used to compute
 * forecast-accuracy and actual-vs-forecast variance later.
 */
export interface FinanceForecastSnapshot {
  id: string;
  /** ISO date the snapshot was taken. */
  forecastedAt: string;
  /** The week the snapshot is forecasting (Monday or any anchor — must be stable). */
  weekStartYmd: string;
  /** EUR-equivalent forecasted inflow for the week. */
  forecastInflowEur: number;
  /** EUR-equivalent forecasted outflow for the week. */
  forecastOutflowEur: number;
  /** EUR-equivalent forecasted closing balance after the week. */
  forecastClosingEur: number;
  /** EUR-equivalent actual closing balance — populated retrospectively when the week is over. */
  actualClosingEur?: number;
  notes?: string;
}

// ─── HR Module 2 (additive, isolated from existing Hr* layer) ────────────
//
// HR2 introduces a canonical compensation package model, governed change
// requests, payroll cycles with explicit readiness, and post-approval finance
// payment instructions. All new slices are namespaced `hr2*` so the existing
// HR module is untouched.

export type Hr2PayrollFrequency = "Monthly" | "BiWeekly" | "Weekly";

export type Hr2PayoutMethod = "BankTransfer" | "Check" | "WireInternal";

export type Hr2CompComponentKind =
  | "BaseSalary"
  | "Allowance"
  | "Deduction"
  | "EmployerCost"
  | "VariableBonus";

export type Hr2CompComponentFrequency = "Monthly" | "Quarterly" | "Annual" | "OneOff";

export type Hr2CompPackageStatus =
  | "Draft"
  | "Submitted"
  | "UnderReview"
  | "Approved"
  | "Active"
  | "Historical"
  | "Terminated";

export type Hr2CompChangeKind =
  | "SalaryChange"
  | "VariableBonus"
  | "SettlementChange"
  | "Termination";

export type Hr2CompChangeStatus =
  | "Draft"
  | "Submitted"
  | "UnderReview"
  | "Approved"
  | "Rejected"
  | "Withdrawn";

export type Hr2CompAuditAction =
  | "PackageCreated"
  | "PackageDraftSaved"
  | "PackageSubmitted"
  | "PackageApproved"
  | "PackageActivated"
  | "PackageTerminated"
  | "ChangeRequestCreated"
  | "ChangeRequestSubmitted"
  | "ChangeRequestApproved"
  | "ChangeRequestRejected"
  | "ChangeRequestWithdrawn";

export type Hr2PayrollCycleStatus =
  | "Draft"
  | "Computing"
  | "ReadyForReview"
  | "Approved"
  | "PaidOut"
  | "Closed";

export type Hr2PayrollLineStatus = "OK" | "Warning" | "Blocked";

export type Hr2ExceptionCategory =
  | "MissingBank"
  | "PendingCompChange"
  | "FxReviewNeeded"
  | "EntityMismatch"
  | "DocumentsMissing"
  | "ComplianceHold"
  | "DataIncomplete";

export type Hr2ExceptionSeverity = "Blocker" | "Warning";

export type Hr2ExceptionStatus = "Open" | "Resolved";

export type Hr2InstructionLineStatus = "Ready" | "Blocked" | "Sent" | "Verified";

export type Hr2InstructionBatchStatus =
  | "Ready"
  | "PartiallyBlocked"
  | "Sent"
  | "Verified"
  | "Closed";

export interface Hr2SettlementRule {
  id: string;
  legalEntityId: OurEntity;
  percentage: number;
  note?: string;
}

export interface Hr2EmployeeExtension {
  id: string;
  employeeId: string;
  employingEntityId: OurEntity;
  fundingEntityId?: OurEntity;
  payrollFrequency: Hr2PayrollFrequency;
  payoutMethod: Hr2PayoutMethod;
  bankAccountLast4?: string;
  hasBankDetails: boolean;
  activePackageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Hr2CompComponent {
  id: string;
  packageId: string;
  kind: Hr2CompComponentKind;
  label: string;
  amount: number;
  currency: HrCurrencyCode;
  frequency: Hr2CompComponentFrequency;
  taxable: boolean;
  notes?: string;
  createdAt: string;
}

export interface Hr2CompPackage {
  id: string;
  employeeId: string;
  versionLabel: string;
  status: Hr2CompPackageStatus;
  packageCurrency: HrCurrencyCode;
  payrollFrequency: Hr2PayrollFrequency;
  effectiveFrom: string;
  effectiveTo?: string;
  employingEntityId: OurEntity;
  fundingEntityId?: OurEntity;
  settlementRules: Hr2SettlementRule[];
  notes?: string;
  supersedesPackageId?: string;
  supersededByPackageId?: string;
  createdBy: string;
  createdAt: string;
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  activatedAt?: string;
  activatedBy?: string;
  terminatedAt?: string;
  terminatedBy?: string;
  terminationReason?: string;
  updatedAt: string;
}

interface Hr2CompChangeRequestBase {
  id: string;
  packageId: string;
  employeeId: string;
  status: Hr2CompChangeStatus;
  effectiveFrom: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  decisionNote?: string;
  resultingPackageId?: string;
  updatedAt: string;
}

export interface Hr2SalaryChangeRequest extends Hr2CompChangeRequestBase {
  kind: "SalaryChange";
  proposedBaseSalary: number;
  proposedCurrency: HrCurrencyCode;
  previousBaseSalary: number;
  previousCurrency: HrCurrencyCode;
}

export interface Hr2VariableBonusRequest extends Hr2CompChangeRequestBase {
  kind: "VariableBonus";
  bonusLabel: string;
  bonusAmount: number;
  bonusCurrency: HrCurrencyCode;
  bonusFrequency: Hr2CompComponentFrequency;
  taxable: boolean;
}

export interface Hr2SettlementChangeRequest extends Hr2CompChangeRequestBase {
  kind: "SettlementChange";
  proposedSettlementRules: Hr2SettlementRule[];
  previousSettlementRules: Hr2SettlementRule[];
}

export interface Hr2TerminationRequest extends Hr2CompChangeRequestBase {
  kind: "Termination";
  terminationReason: string;
  lastPayrollDate?: string;
  finalSettlementCurrency?: HrCurrencyCode;
  finalSettlementAmount?: number;
}

export type Hr2CompChangeRequest =
  | Hr2SalaryChangeRequest
  | Hr2VariableBonusRequest
  | Hr2SettlementChangeRequest
  | Hr2TerminationRequest;

export interface Hr2CompAuditEntry {
  id: string;
  employeeId: string;
  packageId?: string;
  changeRequestId?: string;
  action: Hr2CompAuditAction;
  summary: string;
  performedBy: string;
  performedAt: string;
  detailsJson?: string;
}

export interface Hr2PayrollCycle {
  id: string;
  period: string;
  legalEntityId: OurEntity;
  payrollCurrency: HrCurrencyCode;
  status: Hr2PayrollCycleStatus;
  openedAt: string;
  openedBy: string;
  computedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  paidOutAt?: string;
  closedAt?: string;
  fxRateRefDate?: string;
  notes?: string;
  updatedAt: string;
}

export interface Hr2PayrollComponentBreakdown {
  componentId: string;
  kind: Hr2CompComponentKind;
  label: string;
  amountPackageCurrency: number;
  amountPayrollCurrency: number;
}

export interface Hr2PayrollCycleLine {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeFullName: string;
  packageId: string;
  packageVersionLabel: string;
  status: Hr2PayrollLineStatus;
  packageCurrency: HrCurrencyCode;
  grossPackageCurrency: number;
  netPackageCurrency: number;
  employerCostPackageCurrency: number;
  payrollCurrency: HrCurrencyCode;
  fxRate: number;
  grossPayrollCurrency: number;
  netPayrollCurrency: number;
  employerCostPayrollCurrency: number;
  employingEntityId: OurEntity;
  fundingEntityId?: OurEntity;
  payoutMethod: Hr2PayoutMethod;
  bankAccountLast4?: string;
  componentBreakdown: Hr2PayrollComponentBreakdown[];
  derivedAt: string;
}

export interface Hr2PayrollException {
  id: string;
  cycleId: string;
  cycleLineId: string;
  employeeId: string;
  category: Hr2ExceptionCategory;
  severity: Hr2ExceptionSeverity;
  status: Hr2ExceptionStatus;
  message: string;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface Hr2PaymentInstructionBatch {
  id: string;
  cycleId: string;
  employingEntityId: OurEntity;
  fundingEntityId?: OurEntity;
  payoutCurrency: HrCurrencyCode;
  status: Hr2InstructionBatchStatus;
  totalAmount: number;
  blockedAmount: number;
  lineCount: number;
  blockedLineCount: number;
  emittedAt: string;
  emittedBy: string;
  sentAt?: string;
  sentBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  closedAt?: string;
  notes?: string;
  updatedAt: string;
}

export interface Hr2PaymentInstructionLine {
  id: string;
  batchId: string;
  cycleId: string;
  cycleLineId: string;
  employeeId: string;
  employeeFullName: string;
  employingEntityId: OurEntity;
  fundingEntityId?: OurEntity;
  payoutCurrency: HrCurrencyCode;
  amount: number;
  payoutMethod: Hr2PayoutMethod;
  bankAccountLast4?: string;
  status: Hr2InstructionLineStatus;
  blockedReason?: string;
  blockingExceptionIds: string[];
  sentAt?: string;
  verifiedAt?: string;
  notes?: string;
  updatedAt: string;
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
  hrDigitalSignatures: HrDigitalSignature[];
  hr2EmployeeExtensions: Hr2EmployeeExtension[];
  hr2CompensationPackages: Hr2CompPackage[];
  hr2CompPackageComponents: Hr2CompComponent[];
  hr2CompChangeRequests: Hr2CompChangeRequest[];
  hr2CompAuditLog: Hr2CompAuditEntry[];
  hr2PayrollCycles: Hr2PayrollCycle[];
  hr2PayrollCycleLines: Hr2PayrollCycleLine[];
  hr2PayrollExceptions: Hr2PayrollException[];
  hr2PaymentInstructionBatches: Hr2PaymentInstructionBatch[];
  hr2PaymentInstructionLines: Hr2PaymentInstructionLine[];
  opsRequests: OpsRequest[];
  opsCases: OpsCase[];
  opsMonitoringSignals: OpsMonitoringSignal[];
  opsAuditLogs: OpsAuditLogEntry[];
  opsShifts: OpsShift[];
  opsSlaProfiles: OpsSlaProfile[];
  nocCases: NocCase[];
  routingNocRequests: RoutingNocRequest[];
  amEntries: AmEntry[];
  nocMembers: NocMember[];
  nocPerfWeekEntries: NocPerfWeekEntry[];
  nocPerfMonthSummaries: NocPerfMonthSummary[];
  weeklyStaffReports: WeeklyStaffReport[];
  weeklyReportManagerComments: WeeklyReportManagerComment[];
  weeklyReportAiSummaries: WeeklyReportAiSummary[];
  eventEvaluations: EventEvaluation[];
  eventCostLineItems: EventCostLineItem[];
  wholesaleTrafficRecords: WholesaleTrafficRecord[];
  trafficBaselines: TrafficBaseline[];
  trafficAlertRules: TrafficAlertRule[];
  trafficAlertEvents: TrafficAlertEvent[];
  financeCounterparties: FinanceCounterparty[];
  financeCashPositions: FinanceCashPosition[];
  financeARAPItems: FinanceARAPItem[];
  /** Lines are embedded in `FinanceInvoice.lines`; no separate top-level array. */
  financeInvoices: FinanceInvoice[];
  financePayments: FinancePayment[];
  financeProjections: FinanceProjection[];
  financeCreditCards: FinanceCreditCard[];
  financeCreditCardStatements: FinanceCreditCardStatement[];
  financeDirectDebits: FinanceDirectDebit[];
  financeSalaryPlans: FinanceSalaryPlan[];
  financeBankAccounts: FinanceBankAccount[];
  financeLiquidityThresholds: FinanceLiquidityThreshold[];
  financeCreditCardTransactions: FinanceCreditCardTransaction[];
  financeSalaryDefaults: FinanceSalaryDefault[];
  financeContractors: FinanceContractor[];
  financeForecastSnapshots: FinanceForecastSnapshot[];
  financeBankConnections: FinanceBankConnection[];
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

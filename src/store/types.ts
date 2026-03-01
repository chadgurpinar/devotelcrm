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

export type TaskStatus = "Open" | "Doing" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";

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

export interface TaskUpdate {
  id: string;
  text: string;
  createdAt: string;
  createdByUserId: string;
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
  relatedCompanyId?: string;
  relatedEventId?: string;
  relatedMeetingId?: string;
  relatedNoteId?: string;
  updates: TaskUpdate[];
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
  interconnectionProcesses: InterconnectionProcess[];
  contracts: Contract[];
  ourCompanyInfo: OurCompanyInfo[];
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

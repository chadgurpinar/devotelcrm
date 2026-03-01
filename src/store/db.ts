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
  InterconnectionProcess,
  InterconnectionStage,
  InterconnectionTrack,
  Meeting,
  Note,
  OurCompanyInfo,
  OurEntity,
  Task,
} from "./types";

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
  createTask: (payload: Omit<Task, "id" | "updates"> & { initialUpdate?: string }) => string;
  addTaskUpdate: (taskId: string, text: string) => void;
  updateTask: (task: Task) => void;
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
  startInterconnectionProcess: (companyId: string, track: InterconnectionTrack) => void;
  setInterconnectionStage: (processId: string, stage: InterconnectionStage) => void;
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
      set((state) => ({
        ...state,
        tasks: [
          ...state.tasks,
          {
            ...payload,
            id: taskId,
            updates: payload.initialUpdate
              ? [
                  {
                    id: uid("tu"),
                    text: payload.initialUpdate,
                    createdAt: new Date().toISOString(),
                    createdByUserId: state.activeUserId,
                  },
                ]
              : [],
          },
        ],
      }));
      return taskId;
    },
    addTaskUpdate: (taskId, text) =>
      set((state) => ({
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                updates: [
                  ...task.updates,
                  {
                    id: uid("tu"),
                    text,
                    createdAt: new Date().toISOString(),
                    createdByUserId: state.activeUserId,
                  },
                ],
              }
            : task,
        ),
      })),
    updateTask: (task) =>
      set((state) => ({
        ...state,
        tasks: state.tasks.map((row) => (row.id === task.id ? task : row)),
      })),
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
        set((state) => ({ ...state, ...parsed }));
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
        return {
          ...state,
          tasks: [
            ...state.tasks,
            {
              id: uid("t"),
              title: "Follow-up from note",
              description: note.text,
              status: "Open",
              priority: "Medium",
              createdByUserId: state.activeUserId,
              assigneeUserId,
              relatedCompanyId: note.companyId,
              relatedEventId: note.relatedEventId,
              relatedMeetingId: note.relatedMeetingId,
              relatedNoteId: note.id,
              updates: [
                {
                  id: uid("tu"),
                  text: "Task created from meeting note.",
                  createdAt: new Date().toISOString(),
                  createdByUserId: state.activeUserId,
                },
              ],
            },
          ],
        };
      }),
  };
}

export const useAppStore = create<AppStore>()(
  persist(createStoreSlice, {
    name: STORAGE_KEY,
    version: 10,
    migrate: (persistedState, storedVersion) => {
      const state = persistedState as
        | (Partial<AppStore> & {
            onboarding?: Array<Record<string, unknown>>;
            companies?: Array<Record<string, unknown>>;
            contracts?: Array<Record<string, unknown>>;
            ourCompanyInfo?: Array<Record<string, unknown>>;
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
        contracts,
        ourCompanyInfo:
          ourCompanyInfo.length > 0
            ? ourCompanyInfo
            : fallback.ourCompanyInfo,
      } as unknown as AppStore;
    },
  }),
);

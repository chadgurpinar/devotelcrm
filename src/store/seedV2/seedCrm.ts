import {
  Company,
  CompanyType,
  Contact,
  ContactRoleTag,
  Event,
  EventStaff,
  InterconnectionProcess,
  InterconnectionType,
  Meeting,
  Note,
  Project,
  Task,
  TaskComment,
  User,
  Workscope,
} from "../types";
import { SeedIdFactory } from "./ids";
import { SeedPrng } from "./prng";
import { ScenarioConfig } from "./scenarios";
import {
  BASE_COMPANY_ROWS,
  BASE_CONTACT_ROWS,
  BASE_EVENT_ROWS,
  BASE_MEETING_TARGET_ROWS,
} from "./seedEvents";
import { addDaysToIso, isoDateAtHour, shiftIsoDate, shiftIsoTime } from "./time";

const NOTE_PHRASES = [
  "Traffic forecast discussed with staged launch expectations.",
  "Technical prerequisites reviewed with routing and firewall checklist.",
  "Commercial model reviewed; pricing corridor under evaluation.",
  "Partner requested bilateral testing before production ramp.",
  "AM assignment and escalation path clarified for go-live.",
  "Regulatory and compliance dependencies flagged for follow-up.",
];

const TASK_TITLES = [
  "Share updated pricing pack",
  "Confirm test window",
  "Prepare partner onboarding checklist",
  "Collect compliance documents",
  "Validate routing matrix",
  "Schedule AM alignment call",
];

const MEETING_PLACE_PREFIXES = ["Booth", "Table", "Meeting Room", "Lobby", "Partner Booth", "Private Suite"];
const ROOM_TOKENS = ["A1", "A2", "B1", "B2", "C3", "D4", "E5", "F6"];
const EVENT_SERIES = ["ConnectSphere", "RouteSync", "SignalSummit", "CarrierMesh", "InteropForum", "TransitCon"];
const EVENT_CITIES = ["Barcelona", "Lisbon", "Prague", "Istanbul", "Berlin", "Amsterdam", "Warsaw", "Athens", "Vienna", "Milan"];
const COMPANY_TOKEN_A = ["Nexa", "Orbi", "Vanta", "Lyra", "Axon", "Kairo", "Tetra", "Solis", "Mira", "Riva", "Helio", "Fluxa"];
const COMPANY_TOKEN_B = ["tel", "link", "grid", "wave", "mesh", "route", "node", "bridge", "pulse", "core"];
const CONTACT_TOKEN_A = ["Ari", "Lio", "Niv", "Tae", "Mio", "Ryn", "Sia", "Koa", "Vee", "Pax", "Uno", "Zel"];
const CONTACT_TOKEN_B = ["Quartz", "Vector", "Signal", "Matrix", "Beacon", "Drift", "Nova", "Prism", "Atlas", "Pulse", "Cobalt", "Nimbus"];
const MONTH_TO_NUMBER: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

export interface SeedCrmCoreResult {
  events: Event[];
  companies: Company[];
  contacts: Contact[];
  eventStaff: EventStaff[];
  meetings: Meeting[];
  notes: Note[];
}

export interface SeedTaskResult {
  tasks: Task[];
  taskComments: TaskComment[];
}

function stringHash(input: string): number {
  let hash = 0;
  for (let idx = 0; idx < input.length; idx += 1) {
    hash = (hash * 31 + input.charCodeAt(idx)) >>> 0;
  }
  return hash;
}

function normalizeCountry(country: string): string {
  const normalized = country.trim().toLowerCase();
  if (normalized === "uk" || normalized === "united kingdom") return "United Kingdom";
  if (normalized === "usa" || normalized === "us" || normalized === "united states") return "United States";
  if (normalized === "tr" || normalized === "turkey") return "Turkey";
  if (normalized === "uae") return "United Arab Emirates";
  return country.trim();
}

function mapOurEntity(country: string, region: string, rng: SeedPrng, scenario: ScenarioConfig): "USA" | "UK" | "TR" {
  const normalizedCountry = normalizeCountry(country).toLowerCase();
  if (normalizedCountry === "united states") return "USA";
  if (normalizedCountry === "united kingdom") return "UK";
  if (normalizedCountry === "turkey") return "TR";
  const normalizedRegion = region.trim().toLowerCase();
  if (normalizedRegion.includes("americas")) return "USA";
  if (normalizedRegion.includes("europe")) return "UK";
  if (normalizedRegion.includes("middle east")) return "TR";
  if (normalizedRegion.includes("asia")) return "TR";
  if (normalizedRegion.includes("africa")) return "TR";
  const weights = scenario.distributions.ourEntityWeights;
  return rng.weightedPick(
    ["UK", "TR", "USA"] as const,
    (entity) => {
      if (entity === "UK") return weights.UK;
      if (entity === "TR") return weights.TR;
      return weights.USA;
    },
  );
}

function mapCompanyType(rawType: string): CompanyType {
  const value = rawType.trim().toLowerCase();
  if (value === "mno") return "MNO";
  if (value === "aggregator") return "Aggregator";
  if (value === "cpaas") return "Large Aggregator";
  if (value === "vendor") return "Enterprise";
  if (value === "enterprise") return "Enterprise";
  return "Aggregator";
}

function mapInterconnectionType(type: CompanyType): InterconnectionType {
  if (type === "MNO" || type === "Wholesale Carrier" || type === "Large Aggregator") return "Two-way";
  return "One-way";
}

function mapWorkscope(type: CompanyType): Workscope[] {
  if (type === "MNO") return ["SMS", "Voice"];
  if (type === "Aggregator" || type === "Large Aggregator") return ["SMS"];
  if (type === "Enterprise") return ["Data", "Software"];
  return ["SMS"];
}

function mapCurrency(country: string): string {
  const normalized = normalizeCountry(country).toLowerCase();
  if (normalized === "turkey") return "TRY";
  if (normalized === "united kingdom") return "GBP";
  if (normalized === "united states") return "USD";
  if (normalized === "united arab emirates") return "USD";
  return "EUR";
}

function resolveSalesUserForEmployee(employeeId: string | undefined, users: User[]): string {
  const salesUsers = users.filter((user) => user.role === "Sales");
  const pool = salesUsers.length > 0 ? salesUsers : users;
  if (!pool.length) return "u1";
  if (!employeeId) return pool[0].id;
  const exact = pool.find((user) => user.id === employeeId);
  if (exact) return exact.id;
  const idx = stringHash(employeeId) % pool.length;
  return pool[idx]?.id ?? pool[0].id;
}

function detectContactRoleTags(title: string): ContactRoleTag[] {
  const normalized = title.toLowerCase();
  const tags: ContactRoleTag[] = [];
  if (normalized.includes("network") || normalized.includes("technical") || normalized.includes("sms") || normalized.includes("messaging")) {
    tags.push("Technical");
  }
  if (normalized.includes("finance") || normalized.includes("billing")) {
    tags.push("Finance");
  }
  if (normalized.includes("relations") || normalized.includes("partnership") || normalized.includes("commercial")) {
    tags.push("Commercial");
  }
  if (tags.length === 0) tags.push("Commercial");
  return Array.from(new Set(tags));
}

function monthToNumber(monthAbbrev: string): number {
  return MONTH_TO_NUMBER[monthAbbrev.trim()] ?? 1;
}

function syntheticPlace(index: number): string {
  const prefix = MEETING_PLACE_PREFIXES[index % MEETING_PLACE_PREFIXES.length];
  if (prefix === "Meeting Room") return `${prefix} ${ROOM_TOKENS[index % ROOM_TOKENS.length]}`;
  return `${prefix} ${70 + (index % 160)}`;
}

function syntheticCompanyName(index: number, rng: SeedPrng): string {
  const a = COMPANY_TOKEN_A[index % COMPANY_TOKEN_A.length];
  const b = COMPANY_TOKEN_B[(index * 3 + rng.int(0, COMPANY_TOKEN_B.length - 1)) % COMPANY_TOKEN_B.length];
  return `${a}${b} Networks ${String(index + 1).padStart(2, "0")}`;
}

function syntheticContactName(companyIndex: number, contactIndex: number): string {
  const a = CONTACT_TOKEN_A[(companyIndex + contactIndex * 2) % CONTACT_TOKEN_A.length];
  const b = CONTACT_TOKEN_B[(companyIndex * 3 + contactIndex) % CONTACT_TOKEN_B.length];
  return `${a} ${b}-${String(contactIndex + 1).padStart(2, "0")}`;
}

function eventDatesInclusive(event: Event): string[] {
  const rows: string[] = [];
  let cursor = event.startDate;
  while (cursor <= event.endDate) {
    rows.push(cursor);
    cursor = shiftIsoDate(cursor, 1);
  }
  return rows;
}

function buildEvents(params: {
  idFactory: SeedIdFactory;
  rng: SeedPrng;
  scenario: ScenarioConfig;
}): Event[] {
  const { idFactory, rng, scenario } = params;
  const baseEvents: Event[] = BASE_EVENT_ROWS.map((row, idx) => {
    const month = monthToNumber(row.approxMonth);
    const day = 2 + ((idx * 3) % 20);
    const start = new Date(Date.UTC(2026, month - 1, day));
    const startDate = start.toISOString().slice(0, 10);
    const endDate = shiftIsoDate(startDate, 2 + (idx % 2));
    return {
      id: row.eventId,
      name: row.eventName,
      city: row.city,
      venue: `${row.city === "Global" ? "Global" : row.city} Expo Center`,
      startDate,
      endDate,
      description: `${row.region} event (${row.approxMonth}) from base dataset.`,
    };
  });

  const hasPrimary = baseEvents.some((event) => event.id === "e-primary" || event.name === scenario.primaryEvent.name);
  const withPrimary = hasPrimary
    ? baseEvents
    : [
        ...baseEvents,
        {
          id: "e-primary",
          name: scenario.primaryEvent.name,
          city: scenario.primaryEvent.city,
          venue: scenario.primaryEvent.venue,
          startDate: scenario.primaryEvent.startDate,
          endDate: scenario.primaryEvent.endDate,
          description: "Primary flagship event for deterministic scheduling and collaboration scenarios.",
        },
      ];

  const targetCount = Math.max(scenario.counts.events, withPrimary.length);
  const extras: Event[] = [];
  for (let idx = withPrimary.length; idx < targetCount; idx += 1) {
    const city = EVENT_CITIES[idx % EVENT_CITIES.length];
    const series = EVENT_SERIES[(idx + rng.int(0, EVENT_SERIES.length - 1)) % EVENT_SERIES.length];
    const startDate = shiftIsoDate("2026-01-08", idx * 9 + (idx % 3));
    const endDate = shiftIsoDate(startDate, 2 + (idx % 2));
    extras.push({
      id: idFactory.next("event"),
      name: `${series} ${city} 2026`,
      city,
      venue: `Expo Deck ${String(idx + 1).padStart(2, "0")}`,
      startDate,
      endDate,
      description: `Synthetic expansion event ${idx + 1}.`,
    });
  }

  return [...withPrimary, ...extras].sort((left, right) => left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id));
}

function buildCompanies(params: {
  rng: SeedPrng;
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  users: User[];
  events: Event[];
  baseNowIso: string;
}): Company[] {
  const { rng, idFactory, scenario, users, events, baseNowIso } = params;
  const salesUsers = users.filter((user) => user.role === "Sales");
  const ownerPool = salesUsers.length > 0 ? salesUsers : users;
  const baseCompanies: Company[] = BASE_COMPANY_ROWS.map((row, idx) => {
    const type = mapCompanyType(row.type);
    const ownerUserId = resolveSalesUserForEmployee(row.accountManagerEmployeeId, users);
    const watcher = ownerPool[(idx + 3) % Math.max(1, ownerPool.length)]?.id;
    const createdFromEvent = idx % 3 === 0 ? events[idx % events.length]?.id : undefined;
    const createdAt = addDaysToIso(baseNowIso, -(idx * 2 + 5));
    return {
      id: row.companyId,
      name: row.companyName,
      companyStatus: "LEAD",
      leadDisposition: "Open",
      ourEntity: mapOurEntity(row.country, row.region, rng, scenario),
      createdAt,
      createdFromEventId: createdFromEvent,
      createdFrom: createdFromEvent ? "Event" : "Manual",
      region: row.region,
      address: {
        city: normalizeCountry(row.country),
        country: normalizeCountry(row.country),
      },
      website: `https://${row.companyId}.seed.local`,
      mainPhone: `+44 70${String(1000000 + idx).slice(-7)}`,
      billingTerm: idx % 4 === 0 ? "Net 30" : idx % 3 === 0 ? "Net 15" : "Prepaid",
      currency: mapCurrency(row.country),
      creditLimit: 12000 + idx * 350,
      type,
      interconnectionType: mapInterconnectionType(type),
      workscope: mapWorkscope(type),
      ownerUserId,
      watcherUserIds: Array.from(new Set([ownerUserId, watcher].filter(Boolean) as string[])),
      tags: idx % 4 === 0 ? ["Priority"] : ["Standard"],
      emails: {
        technical: `technical@${row.companyId}.seed.local`,
        finance: `finance@${row.companyId}.seed.local`,
        invoice: idx % 5 === 0 ? undefined : `invoice@${row.companyId}.seed.local`,
        rates: idx % 7 === 0 ? undefined : `rates@${row.companyId}.seed.local`,
      },
      evaluation:
        idx % 3 === 0
          ? {
              technicalFit: idx % 2 === 0 ? "Pass" : "Unknown",
              commercialFit: idx % 5 === 0 ? "Risk" : idx % 3 === 0 ? "Medium" : "Low",
              riskLevel: idx % 6 === 0 ? "High" : "Low",
              nextAction: "Continue qualification workflow.",
              evaluationUpdatedAt: createdAt,
            }
          : undefined,
    };
  });

  const targetCount = Math.max(scenario.counts.companies, baseCompanies.length);
  const extras: Company[] = [];
  for (let idx = baseCompanies.length; idx < targetCount; idx += 1) {
    const ownerUserId = ownerPool[idx % Math.max(1, ownerPool.length)]?.id ?? users[0]?.id ?? "u1";
    const createdAt = addDaysToIso(baseNowIso, -(idx * 3 + 4));
    const type = mapCompanyType(idx % 5 === 0 ? "MNO" : idx % 4 === 0 ? "Aggregator" : "Enterprise");
    const country = idx % 3 === 0 ? "United Kingdom" : idx % 3 === 1 ? "Turkey" : "United States";
    extras.push({
      id: idFactory.next("company"),
      name: syntheticCompanyName(idx, rng),
      companyStatus: "LEAD",
      leadDisposition: "Open",
      ourEntity: mapOurEntity(country, "Synthetic", rng, scenario),
      createdAt,
      createdFrom: "Manual",
      region: "Synthetic",
      address: { country, city: country },
      website: `https://synthetic-company-${idx + 1}.seed.local`,
      mainPhone: `+44 79${String(1000000 + idx).slice(-7)}`,
      billingTerm: "Net 30",
      currency: mapCurrency(country),
      creditLimit: 10000 + idx * 240,
      type,
      interconnectionType: mapInterconnectionType(type),
      workscope: mapWorkscope(type),
      ownerUserId,
      watcherUserIds: [ownerUserId],
      tags: ["Synthetic"],
      emails: {
        technical: `technical.synthetic.${idx + 1}@seed.local`,
        finance: `finance.synthetic.${idx + 1}@seed.local`,
      },
    });
  }
  return [...baseCompanies, ...extras].sort((left, right) => left.id.localeCompare(right.id));
}

function buildContacts(params: {
  idFactory: SeedIdFactory;
  companies: Company[];
  scenario: ScenarioConfig;
}): Contact[] {
  const { idFactory, companies, scenario } = params;
  const companyIds = new Set(companies.map((company) => company.id));
  const baseContacts: Contact[] = BASE_CONTACT_ROWS
    .filter((row) => companyIds.has(row.companyId))
    .map((row, idx) => ({
      id: row.contactId,
      companyId: row.companyId,
      name: row.name,
      title: row.title,
      phone: `+44 71${String(1000000 + idx).slice(-7)}`,
      mobile: idx % 4 === 0 ? undefined : `+44 72${String(1000000 + idx).slice(-7)}`,
      skypeId: `skype.${row.contactId}`,
      email: row.email ?? undefined,
      roleTags: detectContactRoleTags(row.title),
    }));

  const byCompany = new Map<string, Contact[]>();
  baseContacts.forEach((contact) => {
    const list = byCompany.get(contact.companyId ?? "") ?? [];
    list.push(contact);
    byCompany.set(contact.companyId ?? "", list);
  });

  // Guarantee at least one contact per company for meeting generation.
  companies.forEach((company, idx) => {
    if ((byCompany.get(company.id)?.length ?? 0) > 0) return;
    const synthetic: Contact = {
      id: idFactory.next("contact"),
      companyId: company.id,
      name: syntheticContactName(idx, 0),
      title: "Partnership Manager",
      phone: `+44 73${String(1000000 + idx).slice(-7)}`,
      mobile: `+44 74${String(1000000 + idx).slice(-7)}`,
      email: `contact.${company.id}@seed.local`,
      roleTags: ["Commercial"],
    };
    baseContacts.push(synthetic);
    byCompany.set(company.id, [synthetic]);
  });

  const targetCount = Math.max(scenario.counts.contacts, baseContacts.length);
  let cursor = 0;
  while (baseContacts.length < targetCount) {
    const company = companies[cursor % companies.length];
    const existingForCompany = byCompany.get(company.id) ?? [];
    const localIndex = existingForCompany.length;
    const contact: Contact = {
      id: idFactory.next("contact"),
      companyId: company.id,
      name: syntheticContactName(cursor % companies.length, localIndex),
      title: localIndex % 2 === 0 ? "Technical Lead" : "Finance Lead",
      phone: `+44 73${String(2000000 + cursor).slice(-7)}`,
      mobile: localIndex % 3 === 0 ? undefined : `+44 74${String(2000000 + cursor).slice(-7)}`,
      email: `contact.${company.id}.${localIndex + 1}@seed.local`,
      roleTags: localIndex % 2 === 0 ? ["Technical"] : ["Finance"],
    };
    baseContacts.push(contact);
    const next = byCompany.get(company.id) ?? [];
    next.push(contact);
    byCompany.set(company.id, next);
    cursor += 1;
  }

  return baseContacts.sort((left, right) => left.id.localeCompare(right.id));
}

function buildEventStaff(params: {
  idFactory: SeedIdFactory;
  events: Event[];
  users: User[];
  perEvent: number;
}): EventStaff[] {
  const { idFactory, events, users, perEvent } = params;
  const rows: EventStaff[] = [];
  events.forEach((event, eventIdx) => {
    for (let idx = 0; idx < perEvent; idx += 1) {
      const user = users[idx % users.length];
      const outDepart = isoDateAtHour(shiftIsoDate(event.startDate, -1), 6 + (idx % 5), (idx % 2) * 30);
      const outArrive = shiftIsoTime(outDepart, 140 + (idx % 4) * 20);
      const backDepart = isoDateAtHour(event.endDate, 17 + (idx % 4), (idx % 2) * 15);
      const backArrive = shiftIsoTime(backDepart, 150 + (idx % 4) * 15);
      rows.push({
        id: idFactory.next("eventStaff"),
        eventId: event.id,
        userId: user.id,
        flightOutNumber: `FL${String(eventIdx + 1).padStart(2, "0")}${String(idx + 1).padStart(2, "0")}`,
        flightOutDepartAt: outDepart,
        flightOutArriveAt: outArrive,
        flightBackNumber: `BK${String(eventIdx + 1).padStart(2, "0")}${String(idx + 1).padStart(2, "0")}`,
        flightBackDepartAt: backDepart,
        flightBackArriveAt: backArrive,
        pnr: `PNR${String(eventIdx + 1).padStart(2, "0")}${String(idx + 1).padStart(2, "0")}`,
        hotelName: `Hotel Deck ${String((eventIdx + idx) % 12 + 1).padStart(2, "0")}`,
        checkIn: event.startDate,
        checkOut: event.endDate,
        bookingRef: `BOOK-${eventIdx + 1}-${idx + 1}`,
      });
    }
  });
  return rows.sort((left, right) => left.id.localeCompare(right.id));
}

function buildMeetings(params: {
  rng: SeedPrng;
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  users: User[];
  events: Event[];
  companies: Company[];
  contacts: Contact[];
}): Meeting[] {
  const { rng, idFactory, scenario, users, events, companies, contacts } = params;
  const salesUsers = users.filter((user) => user.role === "Sales");
  const ownerPool = salesUsers.length > 0 ? salesUsers : users;
  const eventById = new Map(events.map((event) => [event.id, event]));
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const contactsByCompany = new Map<string, Contact[]>();
  contacts.forEach((contact) => {
    if (!contact.companyId) return;
    const list = contactsByCompany.get(contact.companyId) ?? [];
    list.push(contact);
    contactsByCompany.set(contact.companyId, list);
  });
  const eventDates = new Map(events.map((event) => [event.id, eventDatesInclusive(event)]));
  const eventCounters = new Map<string, number>();
  const meetings: Meeting[] = [];

  const addMeeting = (payload: Omit<Meeting, "id">) => {
    meetings.push({
      id: idFactory.next("meeting"),
      ...payload,
      status: payload.status ?? "Scheduled",
    });
  };

  // Base meetings from MeetingTargets.
  BASE_MEETING_TARGET_ROWS.forEach((target, idx) => {
    const event = eventById.get(target.eventId);
    const company = companyById.get(target.companyId);
    const companyContacts = contactsByCompany.get(target.companyId);
    const contact = companyContacts?.[idx % Math.max(1, companyContacts.length)];
    if (!event || !company || !contact) return;
    const dates = eventDates.get(event.id) ?? [event.startDate];
    const slot = eventCounters.get(event.id) ?? 0;
    eventCounters.set(event.id, slot + 1);
    const ownerUserId = resolveSalesUserForEmployee(target.employeeId, users);
    const ownerHash = stringHash(target.employeeId);
    const day = dates[slot % dates.length];
    const hour = 8 + ((slot * 2 + ownerHash) % 10);
    const minute = slot % 2 === 0 ? 0 : 30;
    const priority = target.priority.trim().toLowerCase();
    const duration = priority === "high" ? 45 : priority === "low" ? 30 : 30;
    const startAt = isoDateAtHour(day, hour, minute);
    addMeeting({
      eventId: event.id,
      companyId: company.id,
      contactId: contact.id,
      startAt,
      endAt: shiftIsoTime(startAt, duration),
      status: idx % 9 === 0 ? "Completed" : "Scheduled",
      place: syntheticPlace(idx),
      ownerUserId,
      secondPersonTitle: priority === "high" ? "Head of SMS" : undefined,
      mobileOverride: idx % 6 === 0 ? `+44 75${String(3000000 + idx).slice(-7)}` : undefined,
      description: `Targeted meeting (${target.priority}) from MeetingTargets.`,
    });
  });

  const primaryEvent = eventById.get("e-primary") ?? events[0];
  const primaryDates = eventDates.get(primaryEvent.id) ?? [primaryEvent.startDate];
  const primaryHotSlots = [
    { date: primaryDates[0], hour: 8, minute: 0 },
    { date: primaryDates[0], hour: 9, minute: 30 },
    { date: primaryDates[1] ?? primaryDates[0], hour: 10, minute: 0 },
    { date: primaryDates[1] ?? primaryDates[0], hour: 14, minute: 0 },
  ];
  const hotSlotTarget = scenario.toggles.forceEventsHeavyDensity ? scenario.constraints.eventsHeavyHotSlotMinMeetings : 6;

  let companyCursor = 0;
  const meetingCountForEvent = (eventId: string) => meetings.filter((meeting) => meeting.eventId === eventId).length;
  primaryHotSlots.forEach((slot, slotIdx) => {
    for (let lane = 0; lane < hotSlotTarget; lane += 1) {
      const company = companies[companyCursor % companies.length];
      const companyContacts = contactsByCompany.get(company.id) ?? [];
      const contact = companyContacts[lane % Math.max(1, companyContacts.length)];
      if (!contact) continue;
      const startAt = isoDateAtHour(slot.date, slot.hour, slot.minute);
      addMeeting({
        eventId: primaryEvent.id,
        companyId: company.id,
        contactId: contact.id,
        startAt,
        endAt: shiftIsoTime(startAt, [15, 30, 45, 60][(slotIdx + lane) % 4]),
        status: lane % 7 === 0 ? "Completed" : "Scheduled",
        place: syntheticPlace(1000 + slotIdx * 50 + lane),
        ownerUserId: ownerPool[(slotIdx + lane) % Math.max(1, ownerPool.length)]?.id ?? users[0]?.id ?? "u1",
        secondPersonTitle: lane % 8 === 0 ? "Head of Voice" : undefined,
        description: lane % 2 === 0 ? `Pre-meeting: ${NOTE_PHRASES[(slotIdx + lane) % NOTE_PHRASES.length]}` : undefined,
      });
      companyCursor += 1;
    }
  });

  while (meetingCountForEvent(primaryEvent.id) < scenario.counts.primaryEventMeetings) {
    const idx = meetingCountForEvent(primaryEvent.id);
    const company = companies[companyCursor % companies.length];
    const companyContacts = contactsByCompany.get(company.id) ?? [];
    const contact = companyContacts[idx % Math.max(1, companyContacts.length)];
    if (!contact) {
      companyCursor += 1;
      continue;
    }
    const day = primaryDates[idx % primaryDates.length];
    const hour = 8 + ((idx * 2) % 11);
    const minute = idx % 2 === 0 ? 0 : 30;
    const startAt = isoDateAtHour(day, hour, minute);
    addMeeting({
      eventId: primaryEvent.id,
      companyId: company.id,
      contactId: contact.id,
      startAt,
      endAt: shiftIsoTime(startAt, [15, 30, 45, 60][idx % 4]),
      status: idx % 9 === 0 ? "Completed" : "Scheduled",
      place: syntheticPlace(2000 + idx),
      ownerUserId: ownerPool[idx % Math.max(1, ownerPool.length)]?.id ?? users[0]?.id ?? "u1",
      secondPersonTitle: idx % 13 === 0 ? "Head of SMS" : undefined,
      mobileOverride: idx % 6 === 0 ? `+44 76${String(3000000 + idx).slice(-7)}` : undefined,
      description: idx % 2 === 0 ? `Pre-meeting: ${NOTE_PHRASES[idx % NOTE_PHRASES.length]}` : undefined,
    });
    companyCursor += 1;
  }

  events
    .filter((event) => event.id !== primaryEvent.id)
    .forEach((event, eventIdx) => {
      const dates = eventDates.get(event.id) ?? [event.startDate];
      while (meetingCountForEvent(event.id) < scenario.counts.otherEventMeetingsMin) {
        const idx = meetingCountForEvent(event.id);
        const company = companies[companyCursor % companies.length];
        const companyContacts = contactsByCompany.get(company.id) ?? [];
        const contact = companyContacts[idx % Math.max(1, companyContacts.length)];
        if (!contact) {
          companyCursor += 1;
          continue;
        }
        const day = dates[idx % dates.length];
        const hour = 8 + ((idx + eventIdx) % 10);
        const minute = idx % 2 === 0 ? 0 : 30;
        const startAt = isoDateAtHour(day, hour, minute);
        addMeeting({
          eventId: event.id,
          companyId: company.id,
          contactId: contact.id,
          startAt,
          endAt: shiftIsoTime(startAt, [15, 30, 45, 60][(idx + eventIdx) % 4]),
          status: idx % 10 === 0 ? "Completed" : "Scheduled",
          place: syntheticPlace(3000 + eventIdx * 100 + idx),
          ownerUserId: ownerPool[(eventIdx + idx) % Math.max(1, ownerPool.length)]?.id ?? users[0]?.id ?? "u1",
          secondPersonTitle: idx % 10 === 0 ? "Head of Voice" : undefined,
          mobileOverride: idx % 7 === 0 ? `+44 77${String(3000000 + idx + eventIdx).slice(-7)}` : undefined,
          description: idx % 2 === 0 ? `Pre-meeting: ${NOTE_PHRASES[(idx + eventIdx) % NOTE_PHRASES.length]}` : undefined,
        });
        companyCursor += 1;
      }
    });

  return meetings.sort((left, right) => left.id.localeCompare(right.id));
}

function createNotes(params: {
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  meetings: Meeting[];
  users: User[];
  companies: Company[];
}): Note[] {
  const { idFactory, scenario, meetings, users, companies } = params;
  const primaryEventId = meetings.some((meeting) => meeting.eventId === "e-primary") ? "e-primary" : meetings[0]?.eventId;
  const primaryMeetings = meetings.filter((meeting) => meeting.eventId === primaryEventId);
  const primaryCoverageTarget = Math.ceil(primaryMeetings.length * scenario.constraints.primaryEventNotesCoverageMin);
  const notes: Note[] = [];
  const addNote = (payload: Omit<Note, "id">) => {
    notes.push({
      id: idFactory.next("note"),
      ...payload,
    });
  };

  primaryMeetings.forEach((meeting, idx) => {
    if (idx >= primaryCoverageTarget) return;
    addNote({
      companyId: meeting.companyId,
      createdByUserId: users[idx % users.length]?.id ?? users[0].id,
      text: `Meeting notes: ${NOTE_PHRASES[idx % NOTE_PHRASES.length]}`,
      createdAt: shiftIsoTime(meeting.endAt, 12),
      relatedEventId: meeting.eventId,
      relatedMeetingId: meeting.id,
      relatedContactId: meeting.contactId,
      reminderAt: idx % 3 === 0 ? shiftIsoTime(meeting.endAt, 24 * 60) : undefined,
      reminderTriggered: false,
    });
    if (idx % 2 === 0) {
      addNote({
        companyId: meeting.companyId,
        createdByUserId: users[(idx + 1) % users.length]?.id ?? users[0].id,
        text: `Follow-up action: send update pack and confirm next checkpoint for ${meeting.id}.`,
        createdAt: shiftIsoTime(meeting.endAt, 90),
        relatedEventId: meeting.eventId,
        relatedMeetingId: meeting.id,
        relatedContactId: meeting.contactId,
        reminderAt: shiftIsoTime(meeting.endAt, 48 * 60),
        reminderTriggered: false,
      });
    }
  });

  meetings
    .filter((meeting) => meeting.eventId !== primaryEventId)
    .forEach((meeting, idx) => {
      if (idx % 3 !== 0) return;
      addNote({
        companyId: meeting.companyId,
        createdByUserId: users[(idx + 2) % users.length]?.id ?? users[0].id,
        text: `Meeting notes: ${NOTE_PHRASES[(idx + 2) % NOTE_PHRASES.length]}`,
        createdAt: shiftIsoTime(meeting.endAt, 10),
        relatedEventId: meeting.eventId,
        relatedMeetingId: meeting.id,
        relatedContactId: meeting.contactId,
        reminderAt: idx % 5 === 0 ? shiftIsoTime(meeting.endAt, 24 * 60) : undefined,
        reminderTriggered: false,
      });
    });

  companies.slice(0, 10).forEach((company, idx) => {
    addNote({
      companyId: company.id,
      createdByUserId: users[idx % users.length]?.id ?? users[0].id,
      text: `General CRM note for ${company.name}.`,
      createdAt: addDaysToIso("2026-01-10T10:00:00.000Z", idx * 4),
      reminderTriggered: false,
    });
  });

  return notes.sort((left, right) => left.id.localeCompare(right.id));
}

export function seedCrmCore(params: {
  rng: SeedPrng;
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  users: User[];
  baseNowIso: string;
}): SeedCrmCoreResult {
  const { rng, idFactory, scenario, users, baseNowIso } = params;
  const events = buildEvents({
    idFactory,
    rng,
    scenario,
  });
  const companies = buildCompanies({
    rng,
    idFactory,
    scenario,
    users,
    events,
    baseNowIso,
  });
  const contacts = buildContacts({
    idFactory,
    companies,
    scenario,
  });
  const eventStaff = buildEventStaff({
    idFactory,
    events,
    users,
    perEvent: Math.min(users.length, scenario.counts.eventStaffPerEvent),
  });
  const meetings = buildMeetings({
    rng,
    idFactory,
    scenario,
    users,
    events,
    companies,
    contacts,
  });
  const notes = createNotes({
    idFactory,
    scenario,
    meetings,
    users,
    companies,
  });
  return {
    events,
    companies,
    contacts,
    eventStaff,
    meetings,
    notes,
  };
}

export function seedCrmTasks(params: {
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  users: User[];
  notes: Note[];
  projects: Project[];
  interconnectionProcesses: InterconnectionProcess[];
}): SeedTaskResult {
  const { idFactory, scenario, users, notes, projects, interconnectionProcesses } = params;
  const tasks: Task[] = [];
  const taskComments: TaskComment[] = [];
  const total = scenario.counts.tasks;
  for (let idx = 0; idx < total; idx += 1) {
    const note = notes[idx % notes.length];
    const creator = users[idx % users.length] ?? users[0];
    const assignee = users[(idx + 2) % users.length] ?? creator;
    const status: Task["status"] = idx % 3 === 0 ? "Open" : idx % 3 === 1 ? "InProgress" : "Done";
    const createdAt = addDaysToIso("2026-03-20T09:00:00.000Z", -(idx + 1));
    const updatedAt = addDaysToIso(createdAt, 1);
    const linkedProcess = idx % 4 === 0 ? interconnectionProcesses[idx % interconnectionProcesses.length] : undefined;
    const linkedProject = idx % 3 === 0 ? projects[idx % projects.length] : undefined;
    const task: Task = {
      id: idFactory.next("task"),
      title: TASK_TITLES[idx % TASK_TITLES.length],
      description: `Synthetic task generated from note ${note.id}.`,
      status,
      priority: idx % 8 === 0 ? "Critical" : idx % 3 === 0 ? "High" : idx % 3 === 1 ? "Medium" : "Low",
      dueAt: idx % 5 === 0 ? addDaysToIso(createdAt, 5) : undefined,
      createdByUserId: creator.id,
      assigneeUserId: assignee.id,
      watcherUserIds: Array.from(new Set([creator.id, assignee.id, users[(idx + 5) % users.length]?.id].filter(Boolean) as string[])),
      visibility: creator.id === assignee.id ? "Private" : "Shared",
      companyId: note.companyId,
      eventId: note.relatedEventId,
      interconnectionProcessId: linkedProcess?.id,
      projectId: linkedProject?.id,
      meetingId: note.relatedMeetingId,
      noteId: note.id,
      createdAt,
      updatedAt,
      completedAt: status === "Done" ? addDaysToIso(updatedAt, 1) : undefined,
      archivedAt: status === "Done" && idx % 6 === 0 ? addDaysToIso(updatedAt, 2) : undefined,
    };
    tasks.push(task);
    taskComments.push({
      id: idFactory.next("taskComment"),
      taskId: task.id,
      authorUserId: creator.id,
      content: "Initial deterministic task entry.",
      kind: "Comment",
      createdAt,
    });
    if (idx % 2 === 0) {
      taskComments.push({
        id: idFactory.next("taskComment"),
        taskId: task.id,
        authorUserId: assignee.id,
        content: idx % 5 === 0 ? "Waiting for partner input." : "Progress updated by assignee.",
        kind: idx % 9 === 0 && task.status !== "Done" ? "Blocker" : "Comment",
        createdAt: updatedAt,
      });
    }
  }
  return {
    tasks: tasks.sort((left, right) => left.id.localeCompare(right.id)),
    taskComments: taskComments.sort((left, right) => left.id.localeCompare(right.id)),
  };
}

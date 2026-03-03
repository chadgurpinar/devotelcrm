import {
  Company,
  CompanyStatus,
  CompanyType,
  Contract,
  ContractStatus,
  Contact,
  DbState,
  Event,
  EventStaff,
  HrAsset,
  HrCountryLeaveProfile,
  HrCurrencyCode,
  HrDepartment,
  HrEmployee,
  HrEmployeeCompensation,
  HrExpense,
  HrFxRate,
  HrLegalEntity,
  HrLeaveRequest,
  HrPayrollMonthSnapshot,
  HrSoftwareLicense,
  InterconnectionProcess,
  InterconnectionStage,
  InterconnectionType,
  Meeting,
  Note,
  OurCompanyInfo,
  OurEntity,
  OpsAssignedRole,
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
  Project,
  ProjectRiskLevel,
  ProjectWeeklyReport,
  Task,
  TaskComment,
  User,
  Workscope,
} from "./types";
import { computePayrollPreview, convertCurrency, workingDaysBetween } from "./hrUtils";

const companyPrefixes = [
  "A1",
  "Orange",
  "Viber",
  "Vodafone",
  "China",
  "Unitel",
  "Etisalat",
  "Nobel",
  "Montnets",
  "Telefónica",
];
const companySuffixes = [
  "Telecom",
  "Global",
  "Connect",
  "Networks",
  "Digital",
  "Mobile",
  "Carrier",
  "Comms",
];
const firstNames = [
  "Alex",
  "Maria",
  "John",
  "Elena",
  "Daniel",
  "Sara",
  "Ahmed",
  "Mila",
  "Victor",
  "Lina",
  "Ravi",
  "Nour",
  "Jakub",
  "Irina",
  "Mehmet",
];
const lastNames = [
  "Petrov",
  "Khan",
  "Yilmaz",
  "Ivanov",
  "Santos",
  "Meyer",
  "Nowak",
  "Kovacs",
  "Popescu",
  "Silva",
  "Rahman",
  "Demir",
  "Marin",
  "Nikolov",
  "Costa",
];
const hotels = [
  "City Center Hotel",
  "Business Grand Hotel",
  "Fira Trade Hotel",
  "Metropolitan Suites",
  "Skyline Convention Hotel",
  "Harbor Gate Hotel",
];
const airlines = ["TK", "BA", "LH", "AF", "KL", "EK", "QR", "AY", "IB", "OS"];
const meetingPlaces = [
  "Our Booth",
  "Meeting Room A",
  "Meeting Room B",
  "Room Castilla",
  "Room Turina",
  "Table Escudero",
  "Lobby Bar",
  "Hall 1 Corner",
  "Cafe Lounge",
  "Partner Booth",
];
const noteSamples = [
  "Traffic forecast reviewed; customer expects a phased launch with SMS first.",
  "NDA follow-up required before sharing routing details.",
  "Pricing discussion started; customer asked for tiered rate card.",
  "Technical team requested SIP/IP whitelist and test plan.",
  "Voice quality concerns discussed; next step is bilateral testing.",
  "Customer asked for dedicated account manager after onboarding.",
  "Commercial terms look positive; legal review pending.",
];
const taskTitles = [
  "Send revised rate card",
  "Prepare onboarding checklist",
  "Coordinate technical test window",
  "Confirm NDA signature status",
  "Schedule follow-up call",
  "Share interconnection questionnaire",
];
const opsCountries = ["United Kingdom", "Spain", "Germany", "Turkey", "UAE", "France", "Italy", "Saudi Arabia"];
const opsOperators = ["Vodafone", "Orange", "Telefonica", "Turkcell", "Etisalat", "TIM", "STC", "DT"];
const opsRequestTypes: OpsRequestType[] = [
  "RoutingRequest",
  "TroubleTicketRequest",
  "TestRequest",
  "LossAccepted",
  "InterconnectionRequest",
];
const opsModuleOrigins: OpsMonitoringModuleOrigin[] = [
  "ProviderIssues",
  "Losses",
  "NewAndLostTraffics",
  "TrafficComparison",
  "ScheduleTestResults",
  "FailedSmsOrCallAnalysis",
];

const workscopes: Workscope[] = ["SMS", "Voice", "Data", "Software", "RCS"];
const types: CompanyType[] = [
  "MNO",
  "Exclusive",
  "Aggregator",
  "MVNO",
  "Large Aggregator",
  "Wholesale Carrier",
  "Enterprise",
];
const interconnectionTypes: InterconnectionType[] = ["One-way", "Two-way"];
const regions = ["Europe", "Middle East", "Asia", "Africa"];
const billingTerms = ["Prepaid", "Net 7", "Net 15", "Net 30", "Net 45"];
const currencies = ["USD", "EUR", "GBP", "TRY"];
const hrCountries = ["Turkey", "United Kingdom", "United States", "Germany", "Spain"];
const hrDepartmentNames = [
  "Sales",
  "NOC",
  "Routing",
  "Interconnection",
  "Product",
  "Finance",
  "Human Resources",
  "Management",
];
const hrExpenseCategories = ["Travel", "Meal", "Taxi", "Hotel", "Office", "Training", "Other"];

const seedUsers: User[] = [
  { id: "u1", name: "Timur", role: "Sales", color: "#4f46e5", defaultOurEntity: "UK" },
  { id: "u2", name: "Nadia", role: "Sales", color: "#1d4ed8", defaultOurEntity: "TR" },
  { id: "u3", name: "Sirarpi", role: "Sales", color: "#0f766e", defaultOurEntity: "UK" },
  { id: "u4", name: "Mate", role: "Sales", color: "#0369a1", defaultOurEntity: "USA" },
  { id: "u5", name: "Kia", role: "Sales", color: "#be123c", defaultOurEntity: "UK" },
  { id: "u6", name: "Hilal", role: "Sales", color: "#6d28d9", defaultOurEntity: "TR" },
  { id: "u7", name: "Erol", role: "Interconnection Manager", color: "#1e40af", defaultOurEntity: "UK" },
  { id: "u8", name: "NOC Team", role: "NOC", color: "#0f766e", defaultOurEntity: "UK" },
  { id: "u9", name: "Head SMS", role: "Head of SMS", color: "#b45309", defaultOurEntity: "UK" },
  { id: "u10", name: "Head Voice", role: "Head of Voice", color: "#9333ea", defaultOurEntity: "UK" },
];

function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length];
}

function companyName(index: number): string {
  return `${pick(companyPrefixes, index)} ${pick(companySuffixes, index + 2)} ${index + 1}`;
}

function personName(index: number): string {
  return `${pick(firstNames, index)} ${pick(lastNames, index + 3)}`;
}

function cleanForEmail(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

function inferEntity(region: string, currency: string, idx: number): OurEntity {
  if (currency === "TRY" || region === "Middle East") return "TR";
  if (currency === "USD" || idx % 11 === 0) return "USA";
  return "UK";
}

function flightCode(index: number): string {
  const airline = pick(airlines, index);
  const number = 100 + ((index * 37) % 8900);
  return `${airline}${number}`;
}

function bookingCode(index: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[(index * 7 + i * 11) % chars.length];
  }
  return out;
}

function isoDay(base: Date, dayOffset: number, hour = 9): string {
  const d = new Date(base);
  d.setDate(base.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function createCompanies(users: User[], events: Event[]): Company[] {
  const salesUsers = users.filter((user) => user.role === "Sales");
  const interconnectionManagerId = users.find((user) => user.role === "Interconnection Manager")?.id ?? users[0].id;
  const baseNow = new Date("2026-03-20T12:00:00Z");

  return Array.from({ length: 60 }).map((_, idx) => {
    const ws = [pick(workscopes, idx)];
    if (idx % 5 === 0 || idx % 7 === 0) ws.push("Voice");
    if (idx % 9 === 0) ws.push("SMS");
    const createdAt = new Date(baseNow);
    createdAt.setDate(createdAt.getDate() - (idx * 3 + (idx % 5) * 2));
    const createdFromEventId = idx % 2 === 0 ? pick(events, idx).id : undefined;
    const ownerUserId = salesUsers[idx % salesUsers.length]?.id ?? users[0].id;
    const extraWatcher = salesUsers[(idx + 2) % salesUsers.length]?.id;
    const watcherUserIds = Array.from(new Set([ownerUserId, extraWatcher].filter(Boolean) as string[]));
    const companyStatus: CompanyStatus = idx < 32 ? "LEAD" : idx < 46 ? "INTERCONNECTION" : "CLIENT";
    const leadDisposition =
      companyStatus === "LEAD" ? (idx % 14 === 0 ? "Rejected" : idx % 9 === 0 ? "OnHold" : "Open") : "Open";
    const movedToInterconnectionAt =
      companyStatus === "LEAD"
        ? undefined
        : new Date(createdAt.getTime() + (12 + (idx % 8)) * 24 * 60 * 60 * 1000).toISOString();
    const becameClientAt =
      companyStatus === "CLIENT"
        ? new Date(createdAt.getTime() + (22 + (idx % 12)) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
    const hasEvaluation = companyStatus === "LEAD" && idx % 4 !== 3;
    const technicalFit = idx % 3 === 0 ? "Pass" : idx % 3 === 1 ? "Fail" : "Unknown";
    const commercialFit = idx % 8 === 0 ? "Risk" : idx % 3 === 0 ? "Medium" : idx % 4 === 0 ? "High" : "Low";
    const riskLevel = idx % 10 === 0 ? "High" : idx % 3 === 0 ? "Medium" : "Low";
    const companyNameValue = companyName(idx);
    const companyDomain = `${cleanForEmail(companyNameValue)}.com`;
    const billingTerm = pick(billingTerms, idx);
    const currency = pick(currencies, idx);
    const region = pick(regions, idx);
    const ourEntity = inferEntity(region, currency, idx);
    const technicalEmail = idx % 11 === 0 ? undefined : `tech${idx + 1}@${companyDomain}`;

    return {
      id: `c-${idx + 1}`,
      name: companyNameValue,
      companyStatus,
      leadDisposition,
      ourEntity,
      createdAt: createdAt.toISOString(),
      createdFromEventId,
      createdFrom: createdFromEventId ? "Event" : "Manual",
      region,
      address: {
        street: `${100 + idx} Carrier Street`,
        city: region === "Europe" ? "London" : region === "Middle East" ? "Dubai" : "Singapore",
        state: idx % 2 === 0 ? "N/A" : "Business District",
        zip: `${10000 + idx}`,
        country: region === "Europe" ? "United Kingdom" : region === "Middle East" ? "UAE" : "Singapore",
      },
      taxId: idx % 6 === 0 ? undefined : `TAX-${100000 + idx}`,
      website: idx % 8 === 0 ? undefined : `https://www.${companyDomain}`,
      mainPhone: `+44 20 ${String(3000 + idx).padStart(4, "0")} ${String(1000 + idx).slice(-4)}`,
      billingTerm,
      currency,
      creditLimit: idx % 7 === 0 ? undefined : 10000 + idx * 1250,
      type: pick(types, idx),
      interconnectionType: pick(interconnectionTypes, idx),
      workscope: Array.from(new Set(ws)),
      ownerUserId,
      watcherUserIds,
      internalAmUserId: companyStatus === "LEAD" ? undefined : interconnectionManagerId,
      counterpartyAmName: companyStatus === "CLIENT" || idx % 3 === 0 ? personName(idx + 200) : undefined,
      movedToInterconnectionAt,
      becameClientAt,
      evaluation: hasEvaluation
        ? {
            technicalFit,
            commercialFit,
            riskLevel,
            nextAction:
              technicalFit === "Fail"
                ? "Hold for revised technical profile"
                : technicalFit === "Unknown"
                  ? "Complete evaluation checklist"
                  : "Start interconnection",
            evaluationNotes: idx % 5 === 0 ? pick(noteSamples, idx) : undefined,
            evaluationUpdatedAt: new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          }
        : undefined,
      tags: idx % 3 === 0 ? ["Priority"] : ["Standard"],
      emails: {
        technical: technicalEmail,
        finance: idx % 9 === 0 ? undefined : `finance${idx + 1}@mail.com`,
        invoice: idx % 10 === 0 ? undefined : `invoice${idx + 1}@mail.com`,
        rates: idx % 12 === 0 ? undefined : `rates${idx + 1}@mail.com`,
      },
    };
  });
}

function createContacts(companies: Company[]): Contact[] {
  const titles = [
    "Account Manager",
    "Director",
    "Business Development Manager",
    "Wholesale Manager",
    "Chief Commercial Officer",
  ];
  const roles = [
    ["Commercial"],
    ["Technical"],
    ["Finance"],
    ["Commercial", "Technical"],
  ] as const;
  return companies.flatMap((company, idx) => {
    const primaryName = personName(idx);
    const technicalName = personName(idx + 70);
    const basePhone = `+44 7${String(100000000 + idx * 97).slice(1)}`;
    const contacts: Contact[] = [
      {
        id: `p-${idx + 1}-a`,
        companyId: company.id,
        name: primaryName,
        title: pick(titles, idx),
        phone: basePhone,
        mobile: idx % 4 === 0 ? undefined : `+44 7${String(200000000 + idx * 79).slice(1)}`,
        skypeId: `live.${cleanForEmail(primaryName)}_${idx + 1}`,
        email: idx % 9 === 0 ? undefined : `${cleanForEmail(primaryName)}@${cleanForEmail(company.name)}.com`,
        roleTags: [...pick(roles, idx)],
      },
    ];
    if (idx % 3 === 0) {
      contacts.push({
        id: `p-${idx + 1}-b`,
        companyId: company.id,
        name: technicalName,
        title: "Technical Manager",
        phone: `+44 7${String(300000000 + idx * 61).slice(1)}`,
        mobile: `+44 7${String(400000000 + idx * 23).slice(1)}`,
        skypeId: `live.${cleanForEmail(technicalName)}_${idx + 1}`,
        email: `${cleanForEmail(technicalName)}@${cleanForEmail(company.name)}.com`,
        roleTags: ["Technical"],
      });
    }
    return contacts;
  });
}

function createEvents(): Event[] {
  const names = [
    "MWC",
    "Capacity Europe",
    "WAS",
    "Gitex",
    "AfricaCom",
    "ITW",
    "CC Global Awards",
    "Carriers World",
    "WWC",
    "Middle East Carrier Awards",
  ];
  const cities = [
    "Barcelona",
    "London",
    "Dubai",
    "Istanbul",
    "Paris",
    "Berlin",
    "Madrid",
    "Prague",
    "Vienna",
    "Amsterdam",
  ];
  const venues = [
    "Expo Center",
    "Business Hub",
    "Convention Hall",
    "City Congress Center",
    "Grand Hotel Conference",
  ];

  const startBase = new Date("2026-01-08T00:00:00");
  return Array.from({ length: 30 }).map((_, idx) => {
    const start = new Date(startBase);
    start.setDate(start.getDate() + idx * 10);
    const end = new Date(start);
    end.setDate(start.getDate() + 2 + (idx % 3));
    const city = pick(cities, idx);
    const eventName = `${pick(names, idx)} ${city} 2026`;
    if (eventName === "MWC Barcelona 2026") {
      start.setTime(new Date("2026-03-02T00:00:00").getTime());
      end.setTime(new Date("2026-03-05T00:00:00").getTime());
    }
    return {
      id: `e-${idx + 1}`,
      name: eventName,
      city,
      venue: `${pick(venues, idx)} ${idx + 1}`,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      description: `${pick(names, idx)} regional networking and interconnection meetings`,
    };
  });
}

function createEventStaff(events: Event[], users: User[]): EventStaff[] {
  const rows: EventStaff[] = [];
  events.forEach((event, idx) => {
    users.forEach((user, userIdx) => {
      const outDepart = new Date(`${event.startDate}T00:00:00`);
      outDepart.setHours(5 + (userIdx % 5), (userIdx % 2) * 30, 0, 0);
      const outArrive = new Date(outDepart);
      outArrive.setHours(outArrive.getHours() + 2 + (userIdx % 3), outArrive.getMinutes() + 20, 0, 0);
      const backDepart = new Date(`${event.endDate}T00:00:00`);
      backDepart.setHours(17 + (userIdx % 4), (userIdx % 2) * 15, 0, 0);
      const backArrive = new Date(backDepart);
      backArrive.setHours(backArrive.getHours() + 2 + ((userIdx + 1) % 3), backArrive.getMinutes() + 10, 0, 0);
      rows.push({
        id: `es-${event.id}-${user.id}`,
        eventId: event.id,
        userId: user.id,
        flightOutNumber: flightCode(idx * 20 + userIdx),
        flightOutDepartAt: outDepart.toISOString(),
        flightOutArriveAt: outArrive.toISOString(),
        flightBackNumber: flightCode(idx * 20 + userIdx + 5),
        flightBackDepartAt: backDepart.toISOString(),
        flightBackArriveAt: backArrive.toISOString(),
        pnr: bookingCode(idx * 13 + userIdx),
        hotelName: `${event.city} ${pick(hotels, idx + userIdx)}`,
        checkIn: event.startDate,
        checkOut: event.endDate,
        bookingRef: `BKG-${idx + 1}-${user.id.toUpperCase()}`,
      });
    });
  });
  return rows;
}

function createMeetings(
  events: Event[],
  companies: Company[],
  contacts: Contact[],
  users: User[],
): Meeting[] {
  const sales = users.filter((u) => u.role === "Sales");
  const meetings: Meeting[] = [];
  let meetingIdx = 1;
  const addMeeting = (payload: Omit<Meeting, "id">) => {
    meetings.push({
      id: `m-${meetingIdx}`,
      ...payload,
      status: payload.status ?? "Scheduled",
    });
    meetingIdx += 1;
  };
  events.forEach((event, idx) => {
    const isMwcBarcelona2026 = event.name === "MWC Barcelona 2026";
    const dayCount =
      Math.max(1, Math.round((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const contactForCompany = (company: Company) => contacts.find((c) => c.companyId === company.id) ?? contacts[0];

    if (isMwcBarcelona2026) {
      const eventStart = new Date(`${event.startDate}T00:00:00`);
      const mkStart = (dayOffset: number, hour: number, minute: number) => {
        const dt = new Date(eventStart);
        dt.setDate(dt.getDate() + dayOffset);
        dt.setHours(hour, minute, 0, 0);
        return dt;
      };

      // 4 days * 7 slots * 2 meetings = 56 base meetings, evenly distributed.
      const slotTemplates = [
        { hour: 8, minute: 0 },
        { hour: 9, minute: 30 },
        { hour: 11, minute: 0 },
        { hour: 12, minute: 30 },
        { hour: 14, minute: 0 },
        { hour: 15, minute: 30 },
        { hour: 17, minute: 0 },
      ];
      const daysToUse = Math.min(dayCount, 4);
      for (let dayOffset = 0; dayOffset < daysToUse; dayOffset += 1) {
        slotTemplates.forEach((slot, slotIdx) => {
          for (let lane = 0; lane < 2; lane += 1) {
            const i = dayOffset * slotTemplates.length * 2 + slotIdx * 2 + lane;
            const company = pick(companies, idx * 13 + i);
            const contact = contactForCompany(company);
            const start = mkStart(dayOffset, slot.hour, slot.minute);
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 30);
            const isCompleted = dayOffset === 0 && lane === 0 && slotIdx < 4;
            addMeeting({
              eventId: event.id,
              companyId: company.id,
              contactId: contact.id,
              startAt: start.toISOString(),
              endAt: end.toISOString(),
              status: isCompleted ? "Completed" : "Scheduled",
              place: `${pick(meetingPlaces, i + idx)} ${20 + ((i + idx) % 70)}`,
              ownerUserId: pick(sales, dayOffset + slotIdx + lane).id,
              secondPersonTitle: i % 9 === 0 ? "Head of SMS" : i % 11 === 0 ? "Head of Voice" : undefined,
              mobileOverride:
                i % 7 === 0 ? `+44 77 ${String(300 + i).padStart(3, "0")} ${String(20 + dayOffset).padStart(2, "0")} 11` : undefined,
              description: i % 2 === 0 ? pick(noteSamples, i + idx) : undefined,
            });
          }
        });
      }

      // Curated additions for explicit edge/collision scenarios (total MWC = 60).
      const conflictOwner = sales[0]?.id ?? users[0].id;
      const edgeEarlyCompany = companies[9] ?? companies[0]; // idx=9 contact email is intentionally undefined.
      {
        const start = mkStart(0, 8, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 15);
        addMeeting({
          eventId: event.id,
          companyId: edgeEarlyCompany.id,
          contactId: contactForCompany(edgeEarlyCompany).id,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          status: "Completed",
          place: "Room Turina 88",
          ownerUserId: sales[4]?.id ?? conflictOwner,
          secondPersonTitle: undefined,
          mobileOverride: undefined,
          description: undefined,
        });
      }

      // Explicit extra meeting for Timur at 2 March 2026 08:00 (slot total becomes 4).
      const timurExtraCompany = companies[41] ?? companies[4];
      {
        const start = mkStart(0, 8, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 30);
        addMeeting({
          eventId: event.id,
          companyId: timurExtraCompany.id,
          contactId: contactForCompany(timurExtraCompany).id,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          status: "Scheduled",
          place: "Our Booth 77",
          ownerUserId: conflictOwner,
          secondPersonTitle: undefined,
          mobileOverride: undefined,
          description: "Extra overlap scenario for owner-based conflict demo.",
        });
      }

      const edgeLateCompany = companies[17] ?? companies[1];
      {
        const start = mkStart(Math.max(0, daysToUse - 1), 19, 30);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 45);
        addMeeting({
          eventId: event.id,
          companyId: edgeLateCompany.id,
          contactId: contactForCompany(edgeLateCompany).id,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          status: "Completed",
          place: "Partner Booth 91",
          ownerUserId: sales[2]?.id ?? conflictOwner,
          secondPersonTitle: "Head of Voice",
          mobileOverride: "+44 77 901 26 55",
          description: pick(noteSamples, 2),
        });
      }

      const conflictCompanyA = companies[23] ?? companies[2];
      {
        const start = mkStart(0, 10, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 60);
        addMeeting({
          eventId: event.id,
          companyId: conflictCompanyA.id,
          contactId: contactForCompany(conflictCompanyA).id,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          status: "Completed",
          place: "Meeting Room A 24",
          ownerUserId: conflictOwner,
          secondPersonTitle: "Head of SMS",
          mobileOverride: undefined,
          description: pick(noteSamples, 3),
        });
      }

      const conflictCompanyB = companies[31] ?? companies[3];
      {
        const start = mkStart(0, 10, 30);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 30);
        addMeeting({
          eventId: event.id,
          companyId: conflictCompanyB.id,
          contactId: contactForCompany(conflictCompanyB).id,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          status: "Completed",
          place: "Meeting Room B 31",
          ownerUserId: conflictOwner,
          secondPersonTitle: undefined,
          mobileOverride: "+44 77 777 26 55",
          description: undefined,
        });
      }
      return;
    }

    const perEvent = 44 + (idx % 26);
    const clusterSize = 4 + (idx % 3);
    for (let i = 0; i < perEvent; i += 1) {
      const company = pick(companies, idx * 9 + i);
      const contact = contactForCompany(company);
      const clusterIdx = Math.floor(i / clusterSize);
      const dayOffset = clusterIdx % dayCount;
      const slotHour = 8 + ((clusterIdx * 2 + idx) % 12);
      const slotMinute = clusterIdx % 2 === 0 ? 0 : 30;
      const start = new Date(`${event.startDate}T00:00:00`);
      start.setDate(start.getDate() + dayOffset);
      start.setHours(slotHour, slotMinute, 0, 0);
      const duration = [15, 30, 45, 60][(i + idx) % 4];
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + duration);

      addMeeting({
        eventId: event.id,
        companyId: company.id,
        contactId: contact.id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        place: `${pick(meetingPlaces, i + idx)} ${10 + ((i + idx) % 90)}`,
        ownerUserId: pick(sales, idx + i).id,
        secondPersonTitle: (i + idx) % 5 === 0 ? "Head of SMS" : (i + idx) % 6 === 0 ? "Head of Voice" : undefined,
        mobileOverride:
          (i + idx) % 8 === 0 ? `+44 77 ${String(200 + i).padStart(3, "0")} ${String(10 + idx).padStart(2, "0")} 55` : undefined,
        description: (i + idx) % 2 === 0 ? pick(noteSamples, i + idx) : undefined,
      });
    }
  });

  return meetings;
}

function createNotes(meetings: Meeting[], users: User[]): Note[] {
  const notes: Note[] = meetings.slice(0, 520).map((meeting, idx) => ({
    id: `n-${idx + 1}`,
    companyId: meeting.companyId,
    createdByUserId: pick(users, idx).id,
    text: pick(noteSamples, idx),
    createdAt: meeting.startAt,
    relatedEventId: meeting.eventId,
    relatedMeetingId: meeting.id,
    relatedContactId: meeting.contactId,
    reminderAt: idx % 7 === 0 ? meeting.endAt : undefined,
    reminderTriggered: false,
  }));

  notes.push({
    id: "n-free-1",
    companyId: "c-2",
    createdByUserId: "u2",
    text: "General CRM note not tied to a meeting.",
    createdAt: new Date("2026-01-10").toISOString(),
  });

  return notes;
}

function createProjects(users: User[]): Project[] {
  const ownerPool = users.filter((user) => user.role === "Sales" || user.role === "Interconnection Manager");
  const managerPool = users.filter((user) =>
    ["Sales", "Interconnection Manager", "Head of SMS", "Head of Voice", "NOC"].includes(user.role),
  );
  const technicalPool = users.filter((user) =>
    ["NOC", "Head of SMS", "Head of Voice", "Interconnection Manager"].includes(user.role),
  );
  const salesPool = users.filter((user) => user.role === "Sales" || user.role === "Interconnection Manager");
  const productPool = users.filter((user) => user.role === "Interconnection Manager" || user.role === "Head of SMS");
  const names = ["Mobile Identity", "Lucibook", "Deytu", "Esimora", "CPaaS"];
  const descriptions = [
    "Identity and trust layer for enterprise messaging channels.",
    "Cloud-native booking and lifecycle automation for telecom partners.",
    "Market intelligence and route quality optimization initiative.",
    "eSIM ecosystem partnerships and managed activation rollout.",
    "Unified communications platform strategy for API products.",
  ];
  const statuses: Project["status"][] = ["InProgress", "InProgress", "Paused", "InProgress", "Completed"];
  const priorities: Project["strategicPriority"][] = ["High", "Medium", "High", "High", "Medium"];
  const createdAtBase = new Date("2025-11-01T09:00:00Z");

  return names.map((name, idx) => {
    const createdAt = new Date(createdAtBase);
    createdAt.setDate(createdAt.getDate() + idx * 14);
    const owner = ownerPool[idx % ownerPool.length] ?? users[0];
    const managerOne = managerPool[(idx + 1) % managerPool.length] ?? owner;
    const managerTwo = managerPool[(idx + 3) % managerPool.length] ?? owner;
    const technicalResponsible = technicalPool[(idx + 2) % technicalPool.length] ?? managerOne;
    const salesResponsible = salesPool[(idx + 4) % salesPool.length] ?? owner;
    const productResponsible = productPool[(idx + 5) % productPool.length] ?? managerTwo;
    const watcher = managerPool[(idx + 6) % managerPool.length] ?? owner;
    const updatedAt = new Date(createdAt);
    updatedAt.setDate(updatedAt.getDate() + 4 + idx);
    return {
      id: `pr-${idx + 1}`,
      name,
      description: descriptions[idx],
      ownerUserId: owner.id,
      managerUserIds: Array.from(new Set([owner.id, managerOne.id, managerTwo.id])),
      technicalResponsibleUserId: technicalResponsible.id,
      salesResponsibleUserId: salesResponsible.id,
      productResponsibleUserId: productResponsible.id,
      watcherUserIds: Array.from(
        new Set([owner.id, managerOne.id, managerTwo.id, technicalResponsible.id, salesResponsible.id, productResponsible.id, watcher.id]),
      ),
      status: statuses[idx],
      strategicPriority: priorities[idx],
      tags: idx % 2 === 0 ? ["Strategic"] : ["Growth"],
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  });
}

function weekStartMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + delta);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function createProjectWeeklyReports(projects: Project[]): ProjectWeeklyReport[] {
  const now = new Date("2026-03-20T12:00:00Z");
  const weeksBack = [0, 1, 2, 3, 4, 5, 6];
  const reports: ProjectWeeklyReport[] = [];

  projects.forEach((project, projectIdx) => {
    weeksBack.forEach((weekOffset) => {
      if (project.status === "Completed" && weekOffset < 2) {
        return;
      }
      if (project.status === "Paused" && weekOffset === 0) {
        return;
      }
      if (projectIdx === 1 && weekOffset === 0) {
        // Keep one project intentionally missing current week report.
        return;
      }

      const weekDate = new Date(now);
      weekDate.setUTCDate(now.getUTCDate() - weekOffset * 7);
      const weekStart = weekStartMonday(weekDate);
      const reportCreatedAt = new Date(weekStart);
      reportCreatedAt.setUTCDate(reportCreatedAt.getUTCDate() + 4);
      reportCreatedAt.setUTCHours(16, 30, 0, 0);
      const technicalSubmitted = !(projectIdx === 0 && weekOffset === 0);
      const salesSubmitted = !(projectIdx === 1 && weekOffset === 0);
      const productSubmitted = !(projectIdx === 3 && weekOffset === 0);
      const managerSubmitted = !(projectIdx === 4 && weekOffset === 0);
      const riskScale: ProjectRiskLevel[] = ["Low", "Medium", "High"];
      const riskLevel = riskScale[(projectIdx + weekOffset) % riskScale.length];
      const blockers = weekOffset % 3 === 0 ? [`Dependency approval pending from partner (${project.name}).`] : [];
      const technicalUpdatedAt = new Date(reportCreatedAt);
      technicalUpdatedAt.setUTCHours(technicalUpdatedAt.getUTCHours() - 6);
      const salesUpdatedAt = new Date(reportCreatedAt);
      salesUpdatedAt.setUTCHours(salesUpdatedAt.getUTCHours() - 4);
      const productUpdatedAt = new Date(reportCreatedAt);
      productUpdatedAt.setUTCHours(productUpdatedAt.getUTCHours() - 2);
      const managerUpdatedAt = new Date(reportCreatedAt);
      managerUpdatedAt.setUTCHours(managerUpdatedAt.getUTCHours() - 1);
      const missingRoles: Array<"technical" | "sales" | "product" | "manager"> = [];
      if (!technicalSubmitted) missingRoles.push("technical");
      if (!salesSubmitted) missingRoles.push("sales");
      if (!productSubmitted) missingRoles.push("product");
      if (!managerSubmitted) missingRoles.push("manager");
      const aiGeneratedAt = new Date(reportCreatedAt);
      const withAiSummary = weekOffset % 2 === 0;
      const staleAiScenario = withAiSummary && projectIdx === 0 && weekOffset === 2;
      if (staleAiScenario) {
        aiGeneratedAt.setTime(managerUpdatedAt.getTime() - 30 * 60 * 1000);
      } else {
        aiGeneratedAt.setUTCHours(aiGeneratedAt.getUTCHours() + 1);
      }

      reports.push({
        id: `pwr-${project.id}-${weekStart.toISOString().slice(0, 10)}`,
        projectId: project.id,
        weekStartDate: weekStart.toISOString().slice(0, 10),
        roleReports: {
          technical: technicalSubmitted
            ? {
                authorUserId: project.technicalResponsibleUserId,
                achievements: [`${project.name}: technical readiness tests progressed.`],
                inProgress: ["Environment hardening and routing validation continue."],
                blockers,
                decisionsRequired: riskLevel === "High" ? ["Need infra budget approval for technical scaling."] : [],
                nextWeekFocus: ["Finish interop test matrix.", "Close security review checklist."],
                attachments: [
                  { label: "Technical runbook", url: `https://docs.devotel.example/${project.id}/${weekStart.toISOString().slice(0, 10)}/tech` },
                ],
                submittedAt: technicalUpdatedAt.toISOString(),
                updatedAt: technicalUpdatedAt.toISOString(),
              }
            : undefined,
          sales: salesSubmitted
            ? {
                authorUserId: project.salesResponsibleUserId,
                achievements: ["Commercial alignment call completed with target partners."],
                inProgress: ["Pipeline conversion and partner term alignment in progress."],
                blockers: weekOffset % 4 === 0 ? ["Pending partner commercial sign-off."] : [],
                decisionsRequired: riskLevel === "High" ? ["Need pricing exception decision from leadership."] : [],
                nextWeekFocus: ["Close outstanding commercial approvals."],
                attachments: [
                  { label: "Sales notes", url: `https://docs.devotel.example/${project.id}/${weekStart.toISOString().slice(0, 10)}/sales` },
                ],
                submittedAt: salesUpdatedAt.toISOString(),
                updatedAt: salesUpdatedAt.toISOString(),
              }
            : undefined,
          product: productSubmitted
            ? {
                authorUserId: project.productResponsibleUserId,
                achievements: ["Roadmap trade-offs reviewed with delivery stakeholders."],
                inProgress: ["Specification updates and release sequencing continue."],
                blockers: weekOffset % 5 === 0 ? ["Dependency on external API stability."] : [],
                decisionsRequired: ["Confirm priority order for next milestone scope."],
                nextWeekFocus: ["Finalize sprint goal alignment across squads."],
                attachments: [
                  { label: "Product brief", url: `https://docs.devotel.example/${project.id}/${weekStart.toISOString().slice(0, 10)}/product` },
                ],
                submittedAt: productUpdatedAt.toISOString(),
                updatedAt: productUpdatedAt.toISOString(),
              }
            : undefined,
        },
        managerSummary: managerSubmitted
          ? {
              authorUserId: project.ownerUserId,
              executiveSummaryText:
                weekOffset % 2 === 0
                  ? "Delivery is mostly on track with manageable cross-team dependencies."
                  : "Execution is stable but capacity is tight; close monitoring required.",
              riskLevel,
              blockers,
              decisionsRequired: riskLevel === "High" ? ["Leadership decision needed on external vendor contract terms."] : [],
              deckLinks: [
                {
                  label: "Weekly deck",
                  url: `https://docs.devotel.example/${project.id}/${weekStart.toISOString().slice(0, 10)}`,
                },
              ],
              submittedAt: managerUpdatedAt.toISOString(),
              updatedAt: managerUpdatedAt.toISOString(),
            }
          : undefined,
        aiSummary: withAiSummary
          ? {
              shortText:
                missingRoles.length === 0
                  ? staleAiScenario
                    ? "Cross-functional updates submitted; AI refresh recommended (new edits detected)."
                    : "Cross-functional updates submitted; leadership actions are clear."
                  : `Missing updates: ${missingRoles.join(", ")}.`,
              fullText:
                missingRoles.length === 0
                  ? staleAiScenario
                    ? "Consolidated view indicates progress, but one or more sections changed after summary generation."
                    : "Consolidated view indicates steady weekly progress with visible next actions."
                  : `Consolidated summary generated with missing sections: ${missingRoles.join(", ")}.`,
              keyRisks: [riskLevel === "High" ? "Execution risk elevated this week." : "No major risk escalation."],
              keyBlockers: blockers,
              decisionsRequired: riskLevel === "High" ? ["Leadership decision needed on vendor contract terms."] : [],
              missingRoles,
              generatedAt: aiGeneratedAt.toISOString(),
              generatedByUserId: project.ownerUserId,
              coverage: {
                technicalSubmittedAt: technicalSubmitted ? technicalUpdatedAt.toISOString() : undefined,
                salesSubmittedAt: salesSubmitted ? salesUpdatedAt.toISOString() : undefined,
                productSubmittedAt: productSubmitted ? productUpdatedAt.toISOString() : undefined,
                managerSubmittedAt: managerSubmitted ? managerUpdatedAt.toISOString() : undefined,
              },
            }
          : undefined,
        createdAt: reportCreatedAt.toISOString(),
        updatedAt: reportCreatedAt.toISOString(),
      });
    });
  });

  return reports;
}

function createTasks(
  notes: Note[],
  users: User[],
  projects: Project[],
  interconnectionProcesses: InterconnectionProcess[],
): Task[] {
  const now = new Date("2026-03-20T12:00:00Z");
  return Array.from({ length: 54 }).map((_, idx) => {
    const note = notes[idx % notes.length];
    const creator = pick(users, idx);
    const assignee = idx % 6 === 0 ? creator : pick(users, idx + 2);
    const status: Task["status"] = idx % 3 === 0 ? "Open" : idx % 3 === 1 ? "InProgress" : "Done";
    const createdAt = new Date(now);
    createdAt.setUTCDate(createdAt.getUTCDate() - (idx + 2));
    const updatedAt = new Date(createdAt);
    updatedAt.setUTCHours(updatedAt.getUTCHours() + 8 + (idx % 17));
    const dueAt = idx % 5 === 0 ? new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString() : undefined;
    const completedAt =
      status === "Done" ? new Date(updatedAt.getTime() + 6 * 60 * 60 * 1000).toISOString() : undefined;
    const archivedAt =
      status === "Done" && idx % 6 === 0 ? new Date(updatedAt.getTime() + 36 * 60 * 60 * 1000).toISOString() : undefined;
    const linkedProcess = idx % 4 === 0 ? pick(interconnectionProcesses, idx) : undefined;
    const linkedProject = idx % 3 === 0 ? pick(projects, idx).id : undefined;
    const visibility: Task["visibility"] = creator.id === assignee.id ? "Private" : "Shared";
    const thirdWatcher = idx % 4 === 0 ? pick(users, idx + 5).id : undefined;

    return {
      id: `t-${idx + 1}`,
      title: pick(taskTitles, idx),
      description: `${pick(noteSamples, idx + 2)} Action owner should provide update in 48 hours.`,
      status,
      priority: idx % 8 === 0 ? "Critical" : idx % 3 === 0 ? "High" : idx % 3 === 1 ? "Medium" : "Low",
      dueAt,
      createdByUserId: creator.id,
      assigneeUserId: assignee.id,
      watcherUserIds: Array.from(new Set([creator.id, assignee.id, thirdWatcher].filter(Boolean) as string[])),
      visibility,
      companyId: note?.companyId,
      eventId: note?.relatedEventId,
      interconnectionProcessId: linkedProcess?.id,
      projectId: linkedProject,
      meetingId: note?.relatedMeetingId,
      noteId: note?.id,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      completedAt,
      archivedAt,
    };
  });
}

function createTaskComments(tasks: Task[], users: User[]): TaskComment[] {
  const comments: TaskComment[] = [];
  tasks.forEach((task, idx) => {
    const primaryAuthor = users.find((user) => user.id === task.createdByUserId) ?? users[0];
    comments.push({
      id: `tc-${idx + 1}-1`,
      taskId: task.id,
      authorUserId: primaryAuthor.id,
      content: "Initial task created from meeting note.",
      kind: "Comment",
      createdAt: task.createdAt,
    });
    if (idx % 2 === 0) {
      comments.push({
        id: `tc-${idx + 1}-2`,
        taskId: task.id,
        authorUserId: task.assigneeUserId,
        content: idx % 5 === 0 ? "Waiting for partner response before next step." : "Progress updated by assignee.",
        kind: idx % 9 === 0 && task.status !== "Done" ? "Blocker" : "Comment",
        createdAt: task.updatedAt,
      });
    }
    if (task.status === "Done") {
      comments.push({
        id: `tc-${idx + 1}-3`,
        taskId: task.id,
        authorUserId: task.assigneeUserId,
        content: "Execution completed and validated.",
        kind: "Comment",
        createdAt: task.completedAt ?? task.updatedAt,
      });
    }
  });
  return comments;
}

function createInterconnectionProcesses(companies: Company[], users: User[]): InterconnectionProcess[] {
  const rows: InterconnectionProcess[] = [];
  const interconnectionManagerId = users.find((u) => u.role === "Interconnection Manager")?.id ?? users[0].id;
  const inProgressStages: InterconnectionStage[] = ["NDA", "Contract", "Technical", "AM_Assigned"];

  companies.forEach((company, idx) => {
    if (company.companyStatus === "LEAD") {
      return;
    }
    const startedAt = new Date("2026-01-15T09:00:00Z");
    startedAt.setDate(startedAt.getDate() + idx);
    const updatedAt = new Date(startedAt);
    updatedAt.setDate(updatedAt.getDate() + 7 + (idx % 9));
    const base = {
      companyId: company.id,
      startedAt: startedAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      ownerUserId: interconnectionManagerId,
    };

    if (company.companyStatus === "INTERCONNECTION") {
      const primaryTrack = idx % 2 === 0 ? "SMS" : "Voice";
      const primaryStage = pick(inProgressStages, idx);
      rows.push({
        id: `ip-${company.id}-${primaryTrack.toLowerCase()}`,
        track: primaryTrack,
        stage: primaryStage,
        ...base,
        stageHistory: [{ at: startedAt.toISOString(), stage: primaryStage, byUserId: interconnectionManagerId }],
      });
      if (idx % 4 === 0) {
        const secondaryTrack = primaryTrack === "SMS" ? "Voice" : "SMS";
        const secondaryStage: InterconnectionStage = idx % 8 === 0 ? "Failed" : "Contract";
        rows.push({
          id: `ip-${company.id}-${secondaryTrack.toLowerCase()}`,
          track: secondaryTrack,
          stage: secondaryStage,
          ...base,
          stageHistory: [{ at: startedAt.toISOString(), stage: secondaryStage, byUserId: interconnectionManagerId }],
        });
      }
      return;
    }

    const completedAt = new Date(updatedAt);
    completedAt.setDate(completedAt.getDate() + 3);
    const hasSmsCompleted = idx % 2 === 0 || idx % 5 === 0;
    const hasVoiceCompleted = idx % 3 === 0;
    const smsStage: InterconnectionStage = hasSmsCompleted ? "Completed" : "Technical";
    const voiceStage: InterconnectionStage = hasVoiceCompleted ? "Completed" : "Contract";
    rows.push({
      id: `ip-${company.id}-sms`,
      track: "SMS",
      stage: smsStage,
      ...base,
      completedAt: smsStage === "Completed" ? completedAt.toISOString() : undefined,
      stageHistory: [{ at: startedAt.toISOString(), stage: smsStage, byUserId: interconnectionManagerId }],
    });
    rows.push({
      id: `ip-${company.id}-voice`,
      track: "Voice",
      stage: voiceStage,
      ...base,
      completedAt: voiceStage === "Completed" ? completedAt.toISOString() : undefined,
      stageHistory: [{ at: startedAt.toISOString(), stage: voiceStage, byUserId: interconnectionManagerId }],
    });
  });

  return rows;
}

function contractStatusForStage(stage: InterconnectionProcess["stage"], contractType: Contract["contractType"], idx: number): ContractStatus {
  if (stage === "Failed") return idx % 2 === 0 ? "Rejected" : "Expired";
  if (contractType === "NDA") {
    if (stage === "NDA") return idx % 3 === 0 ? "InternalSignatureRequested" : "Draft";
    return "FullySigned";
  }
  if (contractType === "ServiceAgreement") {
    if (stage === "NDA") return "Draft";
    if (stage === "Contract") return idx % 2 === 0 ? "InternalSignatureRequested" : "CounterpartySignatureRequested";
    return "FullySigned";
  }
  return "Draft";
}

function createContracts(companies: Company[], interconnectionProcesses: InterconnectionProcess[], users: User[]): Contract[] {
  const rows: Contract[] = [];
  const fallbackUserId = users[0]?.id ?? "u1";
  interconnectionProcesses.forEach((process, idx) => {
    const company = companies.find((entry) => entry.id === process.companyId);
    if (!company) return;
    const createdAt = process.startedAt;
    const ndaStatus = contractStatusForStage(process.stage, "NDA", idx);
    const serviceStatus = contractStatusForStage(process.stage, "ServiceAgreement", idx + 5);
    const ndaContract: Contract = {
      id: `ct-${process.id}-nda`,
      companyId: process.companyId,
      interconnectionProcessId: process.id,
      track: process.track,
      ourEntity: company.ourEntity,
      contractType: "NDA",
      status: ndaStatus,
      files: [
        {
          id: `cf-${process.id}-nda-draft`,
          kind: ndaStatus === "FullySigned" ? "Signed" : "Draft",
          filename: `${company.name.replace(/\s+/g, "_")}_${process.track}_NDA.pdf`,
          mimeType: "application/pdf",
          size: 120_000 + idx * 321,
          uploadedAt: createdAt,
          uploadedByUserId: process.ownerUserId || fallbackUserId,
          storageRef: `seed://${process.id}/nda`,
        },
      ],
      requestedByUserId: process.ownerUserId || fallbackUserId,
      internalSignerUserId: ndaStatus === "Draft" ? undefined : "u9",
      counterpartySignerName: ndaStatus === "FullySigned" ? personName(idx + 400) : undefined,
      createdAt,
      updatedAt: process.updatedAt,
      signedAt: ndaStatus === "FullySigned" ? process.updatedAt : undefined,
    };
    rows.push(ndaContract);

    const serviceContract: Contract = {
      id: `ct-${process.id}-svc`,
      companyId: process.companyId,
      interconnectionProcessId: process.id,
      track: process.track,
      ourEntity: company.ourEntity,
      contractType: "ServiceAgreement",
      status: serviceStatus,
      files: [
        {
          id: `cf-${process.id}-svc-draft`,
          kind: serviceStatus === "FullySigned" ? "Signed" : "Draft",
          filename: `${company.name.replace(/\s+/g, "_")}_${process.track}_ServiceAgreement.pdf`,
          mimeType: "application/pdf",
          size: 150_000 + idx * 347,
          uploadedAt: createdAt,
          uploadedByUserId: process.ownerUserId || fallbackUserId,
          storageRef: `seed://${process.id}/service`,
        },
      ],
      requestedByUserId: process.ownerUserId || fallbackUserId,
      internalSignerUserId: serviceStatus === "Draft" ? undefined : "u10",
      counterpartySignerName: serviceStatus === "FullySigned" ? personName(idx + 500) : undefined,
      createdAt,
      updatedAt: process.updatedAt,
      signedAt: serviceStatus === "FullySigned" ? process.updatedAt : undefined,
    };
    rows.push(serviceContract);
  });
  return rows;
}

function createOurCompanyInfo(): OurCompanyInfo[] {
  const now = new Date().toISOString();
  return [
    {
      ourEntity: "USA",
      legalName: "Devotel USA LLC",
      address: {
        street: "350 5th Avenue",
        city: "New York",
        state: "NY",
        zip: "10118",
        country: "USA",
      },
      taxIdOrVat: "US-TAX-458218",
      signatory: { name: "Michael Reed", title: "Managing Director" },
      emails: {
        billing: "billing.usa@devotel.io",
        finance: "finance.usa@devotel.io",
        invoice: "invoice.usa@devotel.io",
        rate: "rates.usa@devotel.io",
        technical: "technical.usa@devotel.io",
      },
      bankDetails: {
        bankName: "Bank of America",
        accountNumber: "US-22190314",
        swift: "BOFAUS3N",
        currency: "USD",
      },
      lastUpdatedAt: now,
    },
    {
      ourEntity: "UK",
      legalName: "Devotel UK Ltd",
      address: {
        street: "1 Canada Square",
        city: "London",
        zip: "E14 5AB",
        country: "United Kingdom",
      },
      taxIdOrVat: "UK-VAT-9021183",
      signatory: { name: "Sarah Collins", title: "Director" },
      emails: {
        billing: "billing.uk@devotel.io",
        finance: "finance.uk@devotel.io",
        invoice: "invoice.uk@devotel.io",
        rate: "rates.uk@devotel.io",
        technical: "technical.uk@devotel.io",
      },
      bankDetails: {
        bankName: "HSBC UK",
        iban: "GB29NWBK60161331926819",
        swift: "HBUKGB4B",
        currency: "GBP",
      },
      lastUpdatedAt: now,
    },
    {
      ourEntity: "TR",
      legalName: "Devotel Telekomunikasyon A.S.",
      address: {
        street: "Buyukdere Caddesi No:120",
        city: "Istanbul",
        zip: "34394",
        country: "Turkey",
      },
      taxIdOrVat: "TR-VKN-9930271045",
      signatory: { name: "Mert Yildirim", title: "General Manager" },
      emails: {
        billing: "billing.tr@devotel.io",
        finance: "finance.tr@devotel.io",
        invoice: "invoice.tr@devotel.io",
        rate: "rates.tr@devotel.io",
        technical: "technical.tr@devotel.io",
      },
      bankDetails: {
        bankName: "Isbank",
        iban: "TR330006100519786457841326",
        swift: "ISBKTRIS",
        currency: "TRY",
      },
      lastUpdatedAt: now,
    },
  ];
}

function opsCategoryFromModule(moduleOrigin: OpsMonitoringModuleOrigin): OpsCaseCategory {
  if (moduleOrigin === "Losses") return "Loss";
  if (moduleOrigin === "ProviderIssues") return "Provider";
  if (moduleOrigin === "TrafficComparison" || moduleOrigin === "NewAndLostTraffics") return "Traffic";
  if (moduleOrigin === "ScheduleTestResults") return "Test";
  if (moduleOrigin === "FailedSmsOrCallAnalysis") return "KPI";
  return "Other";
}

function opsSlaProfileForCategory(category: OpsCaseCategory): OpsSlaProfileId {
  return category === "Loss" ? "LOSS_ALERT" : "KPI_ALERT";
}

function createOpsMonitoringSignals(companies: Company[]): OpsMonitoringSignal[] {
  const base = new Date("2026-03-20T08:00:00Z");
  return Array.from({ length: 30 }).map((_, idx) => {
    const moduleOrigin = pick(opsModuleOrigins, idx);
    const category = opsCategoryFromModule(moduleOrigin);
    const relatedTrack: OpsTrack = idx % 2 === 0 ? "SMS" : "Voice";
    const severity: OpsSeverity = idx % 9 === 0 ? "Urgent" : idx % 3 === 0 ? "High" : "Medium";
    const company = idx % 5 === 0 ? undefined : pick(companies, idx * 3 + 1);
    const detectedAt = new Date(base.getTime() - idx * 37 * 60 * 1000).toISOString();
    const destinationCountry = pick(opsCountries, idx + 3);
    const destinationOperator = pick(opsOperators, idx + 5);
    return {
      id: `ops-signal-${idx + 1}`,
      moduleOrigin,
      relatedTrack,
      severity,
      category,
      detectedAt,
      fingerprint: `${moduleOrigin}__${relatedTrack}__${destinationCountry}__${destinationOperator}__${idx % 6}`,
      relatedCompanyId: company?.id,
      relatedProvider: destinationOperator,
      relatedDestination: destinationCountry,
      description: `${moduleOrigin} alert detected for ${destinationCountry}/${destinationOperator}.`,
      rawPayload: {
        source: "demo-traffic-adapter",
        sampleId: idx + 1,
        deltaPercent: ((idx % 7) + 1) * 3,
      },
      createdCaseId: undefined,
      createdAt: detectedAt,
    };
  });
}

function createOpsCases(signals: OpsMonitoringSignal[], users: User[]): OpsCase[] {
  const assignees = users.filter((user) =>
    ["NOC", "Interconnection Manager", "Head of SMS", "Head of Voice"].includes(user.role),
  );
  const statuses: OpsCaseStatus[] = ["New", "InProgress", "Resolved", "Ignored", "Cancelled"];
  return signals.slice(0, 22).map((signal, idx) => {
    const status = pick(statuses, idx);
    const createdAt = signal.createdAt;
    const updatedAt = new Date(new Date(createdAt).getTime() + (idx % 5 + 1) * 45 * 60 * 1000).toISOString();
    const assignedToUserId = assignees[idx % assignees.length]?.id;
    const resolvedAt =
      status === "Resolved" ? new Date(new Date(createdAt).getTime() + (idx % 4 + 1) * 70 * 60 * 1000).toISOString() : undefined;
    const ignoredAt =
      status === "Ignored" ? new Date(new Date(createdAt).getTime() + (idx % 3 + 1) * 50 * 60 * 1000).toISOString() : undefined;
    const cancelledAt =
      status === "Cancelled" ? new Date(new Date(createdAt).getTime() + (idx % 4 + 1) * 35 * 60 * 1000).toISOString() : undefined;
    return {
      id: `ops-case-${idx + 1}`,
      moduleOrigin: signal.moduleOrigin,
      relatedTrack: signal.relatedTrack,
      severity: signal.severity,
      category: signal.category,
      detectedAt: signal.detectedAt,
      relatedCompanyId: signal.relatedCompanyId,
      relatedProvider: signal.relatedProvider,
      relatedDestination: signal.relatedDestination,
      description: signal.description,
      status,
      slaProfileId: opsSlaProfileForCategory(signal.category),
      resolvedAt,
      ignoredAt,
      cancelledAt,
      resolutionType: status === "Resolved" ? (idx % 2 === 0 ? "Fixed" : "PartnerIssue") : undefined,
      assignedToUserId,
      createdAt,
      updatedAt,
    };
  });
}

function requestAssignedRoleForType(requestType: OpsRequestType): OpsAssignedRole {
  if (requestType === "RoutingRequest") return "Routing";
  if (requestType === "TroubleTicketRequest") return "NOC";
  if (requestType === "TestRequest") return "NOC";
  if (requestType === "LossAccepted") return "AM";
  return "Supervisor";
}

function requestDoneActionForType(requestType: OpsRequestType): "ROUTING_DONE" | "TT_SENT" | "TEST_DONE" | "LOSS_ACCEPTED" {
  if (requestType === "TroubleTicketRequest") return "TT_SENT";
  if (requestType === "TestRequest") return "TEST_DONE";
  if (requestType === "LossAccepted") return "LOSS_ACCEPTED";
  return "ROUTING_DONE";
}

function createOpsRequests(cases: OpsCase[], companies: Company[], users: User[]): OpsRequest[] {
  const requestStatuses: OpsRequestStatus[] = ["Draft", "Sent", "InProgress", "Done", "Cancelled", "Failed"];
  return Array.from({ length: 24 }).map((_, idx) => {
    const requestType = pick(opsRequestTypes, idx);
    const linkedCase = idx % 2 === 0 ? pick(cases, idx) : undefined;
    const linkedCompany = linkedCase?.relatedCompanyId
      ? companies.find((company) => company.id === linkedCase.relatedCompanyId)
      : pick(companies, idx + 4);
    const createdByUserId = users[idx % users.length]?.id ?? users[0].id;
    const status = pick(requestStatuses, idx);
    const createdAt = new Date("2026-03-18T09:00:00Z");
    createdAt.setUTCHours(createdAt.getUTCHours() + idx * 2);
    const updatedAt = new Date(createdAt.getTime() + (idx % 6 + 1) * 55 * 60 * 1000).toISOString();
    return {
      id: `ops-req-${idx + 1}`,
      requestType,
      createdByUserId,
      assignedToRole: requestAssignedRoleForType(requestType),
      priority: linkedCase?.severity ?? (idx % 7 === 0 ? "Urgent" : idx % 3 === 0 ? "High" : "Medium"),
      relatedCompanyId: linkedCompany?.id,
      relatedTrack: linkedCase?.relatedTrack ?? (idx % 2 === 0 ? "SMS" : "Voice"),
      destination: {
        country: linkedCase?.relatedDestination ?? pick(opsCountries, idx),
        operator: linkedCase?.relatedProvider ?? pick(opsOperators, idx),
      },
      comment: `${requestType} created for destination validation and follow-up.`,
      status,
      relatedCaseId: requestType === "TroubleTicketRequest" ? linkedCase?.id : undefined,
      createdAt: createdAt.toISOString(),
      updatedAt,
    };
  });
}

function createOpsAuditLogs(requests: OpsRequest[], cases: OpsCase[], users: User[]): OpsAuditLogEntry[] {
  const rows: OpsAuditLogEntry[] = [];
  let auditIdx = 1;
  const pushAudit = (entry: Omit<OpsAuditLogEntry, "id">) => {
    rows.push({ id: `ops-audit-${auditIdx}`, ...entry });
    auditIdx += 1;
  };

  requests.forEach((request, idx) => {
    const actor = users.find((user) => user.id === request.createdByUserId)?.id ?? users[0].id;
    const createdAt = new Date(request.createdAt);
    pushAudit({
      parentType: "Request",
      parentId: request.id,
      actionType: "CREATED_MANUAL",
      performedByUserId: actor,
      comment: "Request created.",
      timestamp: createdAt.toISOString(),
    });
    if (request.status !== "Draft") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "SEND",
        performedByUserId: actor,
        timestamp: new Date(createdAt.getTime() + 2 * 60 * 1000).toISOString(),
      });
    }
    if (request.status === "InProgress" || request.status === "Done" || request.status === "Cancelled" || request.status === "Failed") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "START",
        performedByUserId: actor,
        timestamp: new Date(createdAt.getTime() + 9 * 60 * 1000).toISOString(),
      });
    }
    if (request.status === "Done") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: requestDoneActionForType(request.requestType),
        performedByUserId: actor,
        timestamp: request.updatedAt,
      });
    }
    if (request.status === "Cancelled") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "CANCELLED",
        performedByUserId: actor,
        comment: "Cancelled by requester due to scope change.",
        timestamp: request.updatedAt,
      });
    }
    if (request.status === "Failed") {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "MARK_FAILED",
        performedByUserId: actor,
        comment: "Failed due to partner rejection.",
        timestamp: request.updatedAt,
      });
    }
    if (idx % 4 === 0) {
      pushAudit({
        parentType: "Request",
        parentId: request.id,
        actionType: "COMMENT",
        performedByUserId: actor,
        comment: "Follow-up requested by AM.",
        timestamp: new Date(new Date(request.updatedAt).getTime() - 7 * 60 * 1000).toISOString(),
      });
    }
  });

  cases.forEach((opsCase, idx) => {
    const actor = opsCase.assignedToUserId ?? users[idx % users.length]?.id ?? users[0].id;
    pushAudit({
      parentType: "Case",
      parentId: opsCase.id,
      actionType: "CREATED_AUTO",
      performedByUserId: actor,
      comment: "Created from monitoring signal.",
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
        timestamp: new Date(new Date(opsCase.createdAt).getTime() + 5 * 60 * 1000).toISOString(),
      });
    }
    if (opsCase.status === "Resolved") {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "RESOLVE",
        performedByUserId: actor,
        comment: "Issue resolved and verified.",
        timestamp: opsCase.resolvedAt ?? opsCase.updatedAt,
      });
    }
    if (opsCase.status === "Ignored") {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "IGNORE",
        performedByUserId: actor,
        comment: "Ignored after investigation (false positive).",
        timestamp: opsCase.ignoredAt ?? opsCase.updatedAt,
      });
    }
    if (opsCase.status === "Cancelled") {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "CANCEL",
        performedByUserId: actor,
        comment: "Cancelled because alert source was decommissioned.",
        timestamp: opsCase.cancelledAt ?? opsCase.updatedAt,
      });
    }
    if (idx % 6 === 0) {
      pushAudit({
        parentType: "Case",
        parentId: opsCase.id,
        actionType: "ESCALATED",
        performedByUserId: actor,
        comment: "Escalated due to nearing SLA breach.",
        timestamp: new Date(new Date(opsCase.updatedAt).getTime() - 3 * 60 * 1000).toISOString(),
      });
    }
  });

  return rows.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

function createOpsShifts(users: User[]): OpsShift[] {
  const nocUsers = users.filter((user) =>
    ["NOC", "Interconnection Manager", "Head of SMS", "Head of Voice"].includes(user.role),
  );
  const base = new Date("2026-03-20T00:00:00Z");
  const templates: Array<{ hourStart: number; hourEnd: number; track: OpsShift["track"] }> = [
    { hourStart: 0, hourEnd: 8, track: "Both" },
    { hourStart: 8, hourEnd: 16, track: "SMS" },
    { hourStart: 16, hourEnd: 24, track: "Voice" },
  ];
  const rows: OpsShift[] = [];
  for (let day = 0; day < 3; day += 1) {
    templates.forEach((template, idx) => {
      const startsAt = new Date(base);
      startsAt.setUTCDate(startsAt.getUTCDate() + day);
      startsAt.setUTCHours(template.hourStart, 0, 0, 0);
      const endsAt = new Date(base);
      endsAt.setUTCDate(endsAt.getUTCDate() + day);
      endsAt.setUTCHours(template.hourEnd === 24 ? 23 : template.hourEnd, template.hourEnd === 24 ? 59 : 0, 0, 0);
      rows.push({
        id: `ops-shift-${day + 1}-${idx + 1}`,
        track: template.track,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        userIds: [pick(nocUsers, day + idx).id, pick(nocUsers, day + idx + 1).id],
        createdAt: startsAt.toISOString(),
        updatedAt: startsAt.toISOString(),
      });
    });
  }
  return rows;
}

function createHrLegalEntities(): HrLegalEntity[] {
  const now = new Date("2026-03-01T09:00:00Z").toISOString();
  return [
    {
      id: "USA",
      name: "Devotel USA Inc.",
      country: "United States",
      currency: "USD",
      bankDetailsRef: "BANK-USA-001",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "UK",
      name: "Devotel UK Ltd.",
      country: "United Kingdom",
      currency: "GBP",
      bankDetailsRef: "BANK-UK-001",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "TR",
      name: "Devotel Telekom TR A.S.",
      country: "Turkey",
      currency: "TRY",
      bankDetailsRef: "BANK-TR-001",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createHrFxRates(): HrFxRate[] {
  const effectiveDates = ["2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z", "2026-03-01T00:00:00.000Z"];
  const rows: HrFxRate[] = [];
  const matrix: Record<HrCurrencyCode, number[]> = {
    EUR: [1, 1, 1],
    USD: [0.92, 0.93, 0.94],
    GBP: [1.16, 1.17, 1.18],
    TRY: [0.029, 0.028, 0.027],
  };
  (Object.keys(matrix) as HrCurrencyCode[]).forEach((currency) => {
    effectiveDates.forEach((effectiveAt, idx) => {
      rows.push({
        id: `hr-fx-${currency}-${idx + 1}`,
        from: currency,
        to: "EUR",
        rate: matrix[currency][idx],
        effectiveAt,
        createdAt: effectiveAt,
        updatedAt: effectiveAt,
      });
    });
  });
  return rows;
}

function createHrDepartments(): HrDepartment[] {
  const now = new Date("2026-03-01T09:00:00Z").toISOString();
  return hrDepartmentNames.map((name, idx) => ({
    id: `hr-dept-${idx + 1}`,
    name,
    parentDepartmentId:
      name === "Sales" || name === "NOC" || name === "Routing" || name === "Interconnection" ? `hr-dept-8` : undefined,
    createdAt: now,
    updatedAt: now,
  }));
}

function countryToCurrency(country: string): HrCurrencyCode {
  if (country === "Turkey") return "TRY";
  if (country === "United States") return "USD";
  if (country === "United Kingdom") return "GBP";
  return "EUR";
}

function legalEntityForCountry(country: string): OurEntity {
  if (country === "Turkey") return "TR";
  if (country === "United States") return "USA";
  return "UK";
}

function createHrEmployees(users: User[], departments: HrDepartment[]): HrEmployee[] {
  const start = new Date("2024-01-15T09:00:00Z");
  return Array.from({ length: 72 }).map((_, idx) => {
    const country = pick(hrCountries, idx);
    const firstName = pick(firstNames, idx + 11);
    const lastName = pick(lastNames, idx + 27);
    const employmentStartDate = new Date(start);
    employmentStartDate.setUTCDate(start.getUTCDate() + idx * 9);
    const createdAt = new Date(employmentStartDate);
    createdAt.setUTCDate(createdAt.getUTCDate() - 7);
    const isManagement = idx < 6;
    const managerIdx = isManagement ? undefined : Math.floor((idx % 12) / 2);
    const managerId = managerIdx !== undefined ? `hr-emp-${managerIdx + 1}` : undefined;
    const active = idx % 14 !== 0;
    const systemUserId = idx < users.length ? users[idx].id : undefined;
    return {
      id: `hr-emp-${idx + 1}`,
      firstName,
      lastName,
      email: `${cleanForEmail(`${firstName}.${lastName}`)}@devotel.com`,
      phone: `+90 5${String(100000000 + idx * 87).slice(1)}`,
      nationality: country,
      countryOfEmployment: country,
      departmentId: pick(departments, idx).id,
      title: isManagement ? "Department Manager" : idx % 4 === 0 ? "Specialist" : "Senior Specialist",
      managerId,
      employmentStartDate: employmentStartDate.toISOString().slice(0, 10),
      employmentType: idx % 10 === 0 ? "Contractor" : idx % 4 === 0 ? "Part-time" : "Full-time",
      baseCurrency: countryToCurrency(country),
      masterContractSignedAt: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      active,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      systemUserId,
      terminationDate: active ? undefined : new Date(createdAt.getTime() + 420 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };
  });
}

function createHrCompensations(employees: HrEmployee[]): HrEmployeeCompensation[] {
  const now = new Date("2026-03-01T09:00:00Z").toISOString();
  return employees.map((employee, idx) => {
    const baseSalaryNet =
      employee.baseCurrency === "TRY"
        ? 52000 + (idx % 9) * 2800
        : employee.baseCurrency === "USD"
          ? 4200 + (idx % 10) * 220
          : employee.baseCurrency === "GBP"
            ? 3300 + (idx % 8) * 190
            : 3800 + (idx % 8) * 210;
    const baseSalaryGross = baseSalaryNet * (employee.baseCurrency === "TRY" ? 1.42 : 1.35);
    const employerCost = baseSalaryGross * 1.18;
    const primaryEntity = legalEntityForCountry(employee.countryOfEmployment);
    const secondaryEntity: OurEntity = primaryEntity === "TR" ? "UK" : "TR";
    const salaryDistribution =
      idx % 5 === 0
        ? [
            {
              id: `hr-dist-${employee.id}-1`,
              legalEntityId: primaryEntity,
              mode: "Percent" as const,
              percent: 70,
              currency: employee.baseCurrency,
            },
            {
              id: `hr-dist-${employee.id}-2`,
              legalEntityId: secondaryEntity,
              mode: "Percent" as const,
              percent: 30,
              currency: employee.baseCurrency,
            },
          ]
        : [
            {
              id: `hr-dist-${employee.id}-1`,
              legalEntityId: primaryEntity,
              mode: "Percent" as const,
              percent: 100,
              currency: employee.baseCurrency,
            },
          ];
    const bonusEntries =
      idx % 3 === 0
        ? [
            {
              id: `hr-bonus-${employee.id}-1`,
              employeeId: employee.id,
              date: "2026-02-15",
              amount: Math.round(baseSalaryNet * 0.12),
              currency: employee.baseCurrency,
              description: "Quarterly performance bonus",
            },
            {
              id: `hr-bonus-${employee.id}-2`,
              employeeId: employee.id,
              date: "2026-03-18",
              amount: Math.round(baseSalaryNet * 0.08),
              currency: employee.baseCurrency,
              description: "Project completion bonus",
            },
          ]
        : idx % 7 === 0
          ? [
              {
                id: `hr-bonus-${employee.id}-1`,
                employeeId: employee.id,
                date: "2026-03-10",
                amount: Math.round(baseSalaryNet * 0.05),
                currency: employee.baseCurrency,
                description: "Manual spot bonus",
              },
            ]
          : [];
    return {
      id: `hr-comp-${employee.id}`,
      employeeId: employee.id,
      baseSalaryNet: Math.round(baseSalaryNet * 100) / 100,
      baseSalaryGross: Math.round(baseSalaryGross * 100) / 100,
      employerCost: Math.round(employerCost * 100) / 100,
      currency: employee.baseCurrency,
      bonusEntries,
      salaryDistribution,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function createHrLeaveProfiles(): HrCountryLeaveProfile[] {
  const now = new Date("2026-03-01T09:00:00Z").toISOString();
  return [
    {
      id: "hr-leave-profile-tr",
      country: "Turkey",
      annualLeaveDays: 20,
      sickLeaveDays: 10,
      carryOverPolicy: "Up to 5 days carried to next year",
      resetPolicy: "January 1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-leave-profile-uk",
      country: "United Kingdom",
      annualLeaveDays: 25,
      sickLeaveDays: 10,
      carryOverPolicy: "Up to 3 days carried to next year",
      resetPolicy: "January 1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-leave-profile-us",
      country: "United States",
      annualLeaveDays: 15,
      sickLeaveDays: 8,
      carryOverPolicy: "No carry-over",
      resetPolicy: "January 1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-leave-profile-de",
      country: "Germany",
      annualLeaveDays: 24,
      sickLeaveDays: 12,
      carryOverPolicy: "Up to 5 days by Q1",
      resetPolicy: "January 1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-leave-profile-es",
      country: "Spain",
      annualLeaveDays: 23,
      sickLeaveDays: 10,
      carryOverPolicy: "Up to 5 days carried to next year",
      resetPolicy: "January 1",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createHrLeaveRequests(employees: HrEmployee[]): HrLeaveRequest[] {
  return Array.from({ length: 54 }).map((_, idx) => {
    const employee = employees[idx % employees.length];
    const start = new Date("2026-02-01T00:00:00Z");
    start.setUTCDate(start.getUTCDate() + idx * 2);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + (idx % 4) + 1);
    const status: HrLeaveRequest["status"] =
      idx % 6 === 0 ? "PendingManager" : idx % 6 === 1 ? "PendingHR" : idx % 6 === 2 ? "Rejected" : "Approved";
    const createdAt = new Date(start);
    createdAt.setUTCDate(createdAt.getUTCDate() - 7);
    const managerApprovedAt =
      status === "PendingHR" || status === "Approved" || status === "Rejected"
        ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
    const hrApprovedAt = status === "Approved" ? new Date(createdAt.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString() : undefined;
    const rejectedAt = status === "Rejected" ? new Date(createdAt.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString() : undefined;
    return {
      id: `hr-leave-${idx + 1}`,
      employeeId: employee.id,
      leaveType: idx % 7 === 0 ? "Sick" : idx % 9 === 0 ? "Other" : "Annual",
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      totalDays: workingDaysBetween(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)),
      status,
      managerApprovedAt,
      hrApprovedAt,
      rejectedAt,
      rejectionReason: status === "Rejected" ? "Insufficient staffing coverage for selected dates." : undefined,
      createdAt: createdAt.toISOString(),
      updatedAt: (hrApprovedAt ?? rejectedAt ?? managerApprovedAt ?? createdAt.toISOString()),
    };
  });
}

function createHrAssets(employees: HrEmployee[]): HrAsset[] {
  return Array.from({ length: 96 }).map((_, idx) => {
    const category: HrAsset["category"] = idx % 4 === 0 ? "Laptop" : idx % 4 === 1 ? "Phone" : idx % 4 === 2 ? "Accessory" : "Software";
    const employee = employees[idx % employees.length];
    const assigned = idx % 8 !== 0;
    const assignedAt = assigned ? new Date(Date.UTC(2026, 0, 2 + idx)).toISOString() : undefined;
    const returnedAt = assigned && idx % 13 === 0 ? new Date(Date.UTC(2026, 2, 2 + idx)).toISOString() : undefined;
    return {
      id: `hr-asset-${idx + 1}`,
      name:
        category === "Laptop"
          ? `Dell Latitude ${7400 + (idx % 6)}`
          : category === "Phone"
            ? `iPhone ${13 + (idx % 3)}`
            : category === "Accessory"
              ? `Headset ${idx + 1}`
              : `Software seat ${idx + 1}`,
      category,
      assignedToEmployeeId: assigned && !returnedAt ? employee.id : undefined,
      assignedAt: assigned && !returnedAt ? assignedAt : undefined,
      returnedAt,
      digitalAcceptance: Boolean(assigned && idx % 5 !== 0 && !returnedAt),
      notes: idx % 10 === 0 ? "Needs replacement this quarter." : undefined,
      createdAt: new Date(Date.UTC(2025, 11, 12)).toISOString(),
      updatedAt: new Date(Date.UTC(2026, 2, 10)).toISOString(),
    };
  });
}

function createHrSoftwareLicenses(employees: HrEmployee[]): HrSoftwareLicense[] {
  const vendors = ["Microsoft", "Google", "Atlassian", "Figma", "Slack", "HubSpot"];
  const names = ["Microsoft 365", "Google Workspace", "Jira", "Figma Pro", "Slack Business+", "HubSpot Sales"];
  return Array.from({ length: 84 }).map((_, idx) => {
    const startDate = new Date(Date.UTC(2025, 11, 1 + idx)).toISOString().slice(0, 10);
    const endDate = idx % 9 === 0 ? undefined : new Date(Date.UTC(2026, 11, 1 + (idx % 15))).toISOString().slice(0, 10);
    return {
      id: `hr-license-${idx + 1}`,
      name: pick(names, idx),
      vendor: pick(vendors, idx),
      licenseType: idx % 2 === 0 ? "Annual Seat" : "Monthly Seat",
      assignedToEmployeeId: idx % 7 === 0 ? undefined : employees[idx % employees.length]?.id,
      startDate,
      endDate,
      cost: idx % 6 === 0 ? undefined : 10 + (idx % 8) * 7,
      currency: idx % 3 === 0 ? "USD" : idx % 3 === 1 ? "EUR" : "GBP",
      notes: idx % 12 === 0 ? "Pending true-up with vendor." : undefined,
      createdAt: `${startDate}T09:00:00.000Z`,
      updatedAt: "2026-03-01T09:00:00.000Z",
    };
  });
}

function createHrExpenses(employees: HrEmployee[], fxRates: HrFxRate[]): HrExpense[] {
  return Array.from({ length: 70 }).map((_, idx) => {
    const employee = employees[idx % employees.length];
    const currency = employee.baseCurrency;
    const createdAt = new Date(Date.UTC(2026, 1, 1 + idx)).toISOString();
    const amount = currency === "TRY" ? 2800 + (idx % 10) * 430 : 45 + (idx % 8) * 22;
    const convertedAmountEUR = convertCurrency(amount, currency, "EUR", fxRates, createdAt) ?? amount;
    const status: HrExpense["status"] =
      idx % 5 === 0
        ? "PendingManager"
        : idx % 5 === 1
          ? "PendingFinance"
          : idx % 5 === 2
            ? "Approved"
            : idx % 5 === 3
              ? "Rejected"
              : "Paid";
    return {
      id: `hr-expense-${idx + 1}`,
      employeeId: employee.id,
      category: pick(hrExpenseCategories, idx),
      amount: Math.round(amount * 100) / 100,
      currency,
      convertedAmountEUR: Math.round(convertedAmountEUR * 100) / 100,
      description: idx % 2 === 0 ? "Client meeting related expense." : "Operational expense reimbursement.",
      receiptUrl: idx % 9 === 0 ? undefined : `upload://hr-expense-${idx + 1}/receipt.pdf`,
      status,
      managerApprovedAt:
        status === "PendingFinance" || status === "Approved" || status === "Rejected" || status === "Paid"
          ? new Date(new Date(createdAt).getTime() + 2 * 60 * 60 * 1000).toISOString()
          : undefined,
      financeApprovedAt:
        status === "Approved" || status === "Paid"
          ? new Date(new Date(createdAt).getTime() + 26 * 60 * 60 * 1000).toISOString()
          : undefined,
      paidAt: status === "Paid" ? new Date(new Date(createdAt).getTime() + 72 * 60 * 60 * 1000).toISOString() : undefined,
      createdAt,
      updatedAt: status === "Paid" ? new Date(new Date(createdAt).getTime() + 72 * 60 * 60 * 1000).toISOString() : createdAt,
    };
  });
}

function createHrPayrollSnapshots(
  employees: HrEmployee[],
  compensations: HrEmployeeCompensation[],
  fxRates: HrFxRate[],
  activeUserId: string,
): HrPayrollMonthSnapshot[] {
  const months = ["2026-02", "2026-03"];
  return months.map((month, idx) => {
    const snapshotId = `hr-payroll-snapshot-${idx + 1}`;
    const preview = computePayrollPreview({
      employees,
      compensations,
      fxRates,
      month,
      snapshotId,
    });
    return {
      id: snapshotId,
      month,
      createdAt: `${month}-28T18:00:00.000Z`,
      createdByUserId: activeUserId,
      notes: "Generated from seeded compensation and FX data.",
      filtersUsed: {},
      fxRateSetRef: `fx-${month}`,
      lines: preview.lines,
      totals: preview.totals,
    };
  });
}

function createHrAuditLogs(
  leaveRequests: HrLeaveRequest[],
  expenses: HrExpense[],
  assets: HrAsset[],
  activeUserId: string,
): DbState["hrAuditLogs"] {
  const rows: DbState["hrAuditLogs"] = [];
  leaveRequests.slice(0, 50).forEach((request, idx) => {
    rows.push({
      id: `hr-audit-leave-created-${idx + 1}`,
      parentType: "Leave",
      parentId: request.id,
      actionType: "MANAGER_APPROVE",
      performedByUserId: activeUserId,
      comment: request.status === "PendingManager" ? "Leave request created and waiting manager." : "Manager action processed.",
      timestamp: request.managerApprovedAt ?? request.createdAt,
    });
  });
  expenses.slice(0, 50).forEach((expense, idx) => {
    rows.push({
      id: `hr-audit-expense-${idx + 1}`,
      parentType: "Expense",
      parentId: expense.id,
      actionType:
        expense.status === "PendingManager"
          ? "MANAGER_APPROVE"
          : expense.status === "PendingFinance"
            ? "FINANCE_APPROVE"
            : expense.status === "Rejected"
              ? "FINANCE_REJECT"
              : expense.status === "Paid"
                ? "MARK_PAID"
                : "FINANCE_APPROVE",
      performedByUserId: activeUserId,
      comment: "Seeded expense workflow log.",
      timestamp: expense.updatedAt,
    });
  });
  assets.slice(0, 40).forEach((asset, idx) => {
    rows.push({
      id: `hr-audit-asset-${idx + 1}`,
      parentType: "Asset",
      parentId: asset.id,
      actionType: asset.returnedAt ? "ASSET_RETURNED" : asset.digitalAcceptance ? "ASSET_ACCEPTED" : "ASSET_ASSIGNED",
      performedByUserId: activeUserId,
      comment: "Seeded asset assignment event.",
      timestamp: asset.updatedAt,
    });
  });
  return rows.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function createSeedDb(): DbState {
  const users = seedUsers;
  const events = createEvents();
  const companies = createCompanies(users, events);
  const contacts = createContacts(companies);
  const eventStaff = createEventStaff(events, users);
  const meetings = createMeetings(events, companies, contacts, users);
  const notes = createNotes(meetings, users);
  const interconnectionProcesses = createInterconnectionProcesses(companies, users);
  const projects = createProjects(users);
  const projectWeeklyReports = createProjectWeeklyReports(projects);
  const tasks = createTasks(notes, users, projects, interconnectionProcesses);
  const taskComments = createTaskComments(tasks, users);
  const contracts = createContracts(companies, interconnectionProcesses, users);
  const ourCompanyInfo = createOurCompanyInfo();
  const opsMonitoringSignals = createOpsMonitoringSignals(companies);
  const opsCases = createOpsCases(opsMonitoringSignals, users);
  const opsRequests = createOpsRequests(opsCases, companies, users);
  const opsAuditLogs = createOpsAuditLogs(opsRequests, opsCases, users);
  const opsShifts = createOpsShifts(users);
  const hrLegalEntities = createHrLegalEntities();
  const hrFxRates = createHrFxRates();
  const hrDepartments = createHrDepartments();
  const hrEmployees = createHrEmployees(users, hrDepartments);
  const hrCompensations = createHrCompensations(hrEmployees);
  const hrLeaveProfiles = createHrLeaveProfiles();
  const hrLeaveRequests = createHrLeaveRequests(hrEmployees);
  const hrAssets = createHrAssets(hrEmployees);
  const hrSoftwareLicenses = createHrSoftwareLicenses(hrEmployees);
  const hrExpenses = createHrExpenses(hrEmployees, hrFxRates);
  const hrPayrollSnapshots = createHrPayrollSnapshots(hrEmployees, hrCompensations, hrFxRates, users[0].id);
  const hrAuditLogs = createHrAuditLogs(hrLeaveRequests, hrExpenses, hrAssets, users[0].id);

  return {
    version: 1,
    activeUserId: users[0].id,
    users,
    events,
    eventStaff,
    companies,
    contacts,
    meetings,
    notes,
    tasks,
    taskComments,
    interconnectionProcesses,
    projects,
    projectWeeklyReports,
    contracts,
    ourCompanyInfo,
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
    opsRequests,
    opsCases,
    opsMonitoringSignals,
    opsAuditLogs,
    opsShifts,
    outbox: [],
  };
}

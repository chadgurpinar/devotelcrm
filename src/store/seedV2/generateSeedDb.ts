import { Company, DbState, OurCompanyInfo } from "../types";
import { createSeedIdFactory } from "./ids";
import { createSeedPrng } from "./prng";
import { DEFAULT_SCENARIO_CONFIG, DEFAULT_SEED_KEY, resolveScenarioConfig, ScenarioConfig } from "./scenarios";
import { seedUsers } from "./seedUsers";
import { seedCrmCore, seedCrmTasks } from "./seedCrm";
import { seedInterconnection } from "./seedInterconnection";
import { seedContracts } from "./seedContracts";
import { seedProjects } from "./seedProjects";
import { seedHr } from "./seedHr";
import { seedOps } from "./seedOps";
import { assertSeedDb, logSeedDiagnosticsOnce } from "./validators";

let determinismProbeInProgress = false;

function isDevEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function createOurCompanyInfo(baseNowIso: string): OurCompanyInfo[] {
  return [
    {
      ourEntity: "USA",
      legalName: "Synthetic Telecom USA LLC",
      address: {
        street: "100 Seed Avenue",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "United States",
      },
      taxIdOrVat: "US-SYN-0001",
      signatory: {
        name: "Signer USA 01",
        title: "Managing Director",
      },
      emails: {
        billing: "billing.usa@seed.local",
        finance: "finance.usa@seed.local",
        invoice: "invoice.usa@seed.local",
        rate: "rates.usa@seed.local",
        technical: "technical.usa@seed.local",
      },
      bankDetails: {
        bankName: "Seed Financial USA",
        accountNumber: "US-ACC-100001",
        swift: "SEEDUS01",
        currency: "USD",
      },
      lastUpdatedAt: baseNowIso,
    },
    {
      ourEntity: "UK",
      legalName: "Synthetic Telecom UK Ltd",
      address: {
        street: "200 Seed Street",
        city: "London",
        zip: "E14 5AA",
        country: "United Kingdom",
      },
      taxIdOrVat: "UK-SYN-0002",
      signatory: {
        name: "Signer UK 01",
        title: "Director",
      },
      emails: {
        billing: "billing.uk@seed.local",
        finance: "finance.uk@seed.local",
        invoice: "invoice.uk@seed.local",
        rate: "rates.uk@seed.local",
        technical: "technical.uk@seed.local",
      },
      bankDetails: {
        bankName: "Seed Financial UK",
        iban: "GB00SEED000000200001",
        swift: "SEEDGB01",
        currency: "GBP",
      },
      lastUpdatedAt: baseNowIso,
    },
    {
      ourEntity: "TR",
      legalName: "Synthetic Telecom TR AS",
      address: {
        street: "300 Seed Cad.",
        city: "Istanbul",
        zip: "34394",
        country: "Turkey",
      },
      taxIdOrVat: "TR-SYN-0003",
      signatory: {
        name: "Signer TR 01",
        title: "General Manager",
      },
      emails: {
        billing: "billing.tr@seed.local",
        finance: "finance.tr@seed.local",
        invoice: "invoice.tr@seed.local",
        rate: "rates.tr@seed.local",
        technical: "technical.tr@seed.local",
      },
      bankDetails: {
        bankName: "Seed Financial TR",
        iban: "TR000000000000300001",
        swift: "SEEDTR01",
        currency: "TRY",
      },
      lastUpdatedAt: baseNowIso,
    },
  ];
}

function attachPrimaryContacts(companies: Company[], contacts: DbState["contacts"]): Company[] {
  const contactByCompany = new Map<string, DbState["contacts"]>();
  contacts.forEach((contact) => {
    if (!contact.companyId) return;
    const list = contactByCompany.get(contact.companyId) ?? [];
    list.push(contact);
    contactByCompany.set(contact.companyId, list);
  });
  return companies.map((company) => {
    const list = contactByCompany.get(company.id) ?? [];
    const commercial = list[0]?.id;
    const technical = list.find((contact) => contact.roleTags?.includes("Technical"))?.id ?? list[1]?.id;
    const finance = list.find((contact) => contact.roleTags?.includes("Finance"))?.id ?? list[2]?.id;
    return {
      ...company,
      primaryContactIds: commercial || technical || finance ? { commercial, technical, finance } : undefined,
    };
  });
}

export function generateSeedDb(
  seedKey: string = DEFAULT_SEED_KEY,
  scenarioConfig: Partial<ScenarioConfig> = DEFAULT_SCENARIO_CONFIG,
): DbState {
  const scenario = resolveScenarioConfig(scenarioConfig);
  const idFactory = createSeedIdFactory();
  const rootRng = createSeedPrng(seedKey);
  const userRng = rootRng.fork("users");
  const crmRng = rootRng.fork("crm");
  const hrRng = rootRng.fork("hr");
  const opsRng = rootRng.fork("ops");
  const projectRng = rootRng.fork("projects");
  const interconnectionRng = rootRng.fork("interconnection");
  const contractsRng = rootRng.fork("contracts");
  const baseNowIso = scenario.timeAnchor.baseNowIso;

  const users = seedUsers(userRng, scenario.counts.users);
  const activeUserId = users[0]?.id ?? "u1";

  const crmCore = seedCrmCore({
    rng: crmRng,
    idFactory,
    scenario,
    users,
    baseNowIso,
  });

  const lifecycle = seedInterconnection({
    rng: interconnectionRng,
    idFactory,
    scenario,
    users,
    companies: crmCore.companies,
    baseNowIso,
  });

  const companiesWithContacts = attachPrimaryContacts(lifecycle.companies, crmCore.contacts);

  const contracts = seedContracts({
    rng: contractsRng,
    idFactory,
    scenario,
    users,
    companies: companiesWithContacts,
    interconnectionProcesses: lifecycle.interconnectionProcesses,
  });

  const projectsSeed = seedProjects({
    rng: projectRng,
    idFactory,
    scenario,
    users,
    baseNowIso,
  });

  const crmTasks = seedCrmTasks({
    idFactory,
    scenario,
    users,
    notes: crmCore.notes,
    projects: projectsSeed.projects,
    interconnectionProcesses: lifecycle.interconnectionProcesses,
  });

  const hr = seedHr({
    rng: hrRng,
    idFactory,
    scenario,
    users,
    baseNowIso,
    activeUserId,
  });

  const ops = seedOps({
    rng: opsRng,
    idFactory,
    scenario,
    users,
    companies: companiesWithContacts,
    baseNowIso,
    activeUserId,
  });

  const db: DbState = {
    version: 1,
    activeUserId,
    users: users.slice().sort((left, right) => left.id.localeCompare(right.id)),
    events: crmCore.events.slice().sort((left, right) => left.id.localeCompare(right.id)),
    eventStaff: crmCore.eventStaff.slice().sort((left, right) => left.id.localeCompare(right.id)),
    companies: companiesWithContacts.slice().sort((left, right) => left.id.localeCompare(right.id)),
    contacts: crmCore.contacts.slice().sort((left, right) => left.id.localeCompare(right.id)),
    meetings: crmCore.meetings.slice().sort((left, right) => left.id.localeCompare(right.id)),
    notes: crmCore.notes.slice().sort((left, right) => left.id.localeCompare(right.id)),
    tasks: crmTasks.tasks.slice().sort((left, right) => left.id.localeCompare(right.id)),
    taskComments: crmTasks.taskComments.slice().sort((left, right) => left.id.localeCompare(right.id)),
    interconnectionProcesses: lifecycle.interconnectionProcesses.slice().sort((left, right) => left.id.localeCompare(right.id)),
    projects: projectsSeed.projects.slice().sort((left, right) => left.id.localeCompare(right.id)),
    projectWeeklyReports: projectsSeed.projectWeeklyReports
      .slice()
      .sort((left, right) => left.weekStartDate.localeCompare(right.weekStartDate) || left.id.localeCompare(right.id)),
    contracts: contracts.slice().sort((left, right) => left.id.localeCompare(right.id)),
    ourCompanyInfo: createOurCompanyInfo(baseNowIso),
    hrLegalEntities: hr.hrLegalEntities,
    hrFxRates: hr.hrFxRates,
    hrDepartments: hr.hrDepartments,
    hrEmployees: hr.hrEmployees,
    hrCompensations: hr.hrCompensations,
    hrPayrollSnapshots: hr.hrPayrollSnapshots,
    hrLeaveProfiles: hr.hrLeaveProfiles,
    hrLeaveRequests: hr.hrLeaveRequests,
    hrAssets: hr.hrAssets,
    hrSoftwareLicenses: hr.hrSoftwareLicenses,
    hrAssetAssignments: hr.hrAssetAssignments,
    hrSoftwareProducts: hr.hrSoftwareProducts,
    hrSoftwareSeats: hr.hrSoftwareSeats,
    hrProvisionRequests: hr.hrProvisionRequests,
    hrExpenses: hr.hrExpenses,
    hrAuditLogs: hr.hrAuditLogs,
    opsRequests: ops.opsRequests,
    opsCases: ops.opsCases,
    opsMonitoringSignals: ops.opsMonitoringSignals,
    opsAuditLogs: ops.opsAuditLogs,
    opsShifts: ops.opsShifts,
    outbox: [],
  };

  const report = assertSeedDb(db, scenario);
  logSeedDiagnosticsOnce(report, scenario, seedKey);
  if (isDevEnvironment() && !determinismProbeInProgress) {
    determinismProbeInProgress = true;
    try {
      const probeDb = generateSeedDb(seedKey, scenario);
      const digest = (state: DbState) =>
        JSON.stringify({
          users: state.users.map((row) => row.id),
          companies: state.companies.map((row) => row.id),
          meetings: state.meetings.slice(0, 20).map((row) => row.id),
          notes: state.notes.slice(0, 20).map((row) => row.id),
          processes: state.interconnectionProcesses.map((row) => row.id),
          contracts: state.contracts.slice(0, 20).map((row) => row.id),
          hrEmployees: state.hrEmployees.map((row) => row.id),
          opsCases: state.opsCases.map((row) => row.id),
          counts: {
            users: state.users.length,
            events: state.events.length,
            companies: state.companies.length,
            contacts: state.contacts.length,
            meetings: state.meetings.length,
            notes: state.notes.length,
            tasks: state.tasks.length,
            interconnectionProcesses: state.interconnectionProcesses.length,
            contracts: state.contracts.length,
            projectWeeklyReports: state.projectWeeklyReports.length,
            hrEmployees: state.hrEmployees.length,
            opsCases: state.opsCases.length,
            opsRequests: state.opsRequests.length,
          },
        });
      if (digest(db) !== digest(probeDb)) {
        throw new Error("Seed determinism probe failed: repeated generation produced different IDs/counts.");
      }
    } finally {
      determinismProbeInProgress = false;
    }
  }
  return db;
}

export { DEFAULT_SEED_KEY, DEFAULT_SCENARIO_CONFIG } from "./scenarios";

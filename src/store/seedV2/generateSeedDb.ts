import {
  Company,
  DbState,
  OurCompanyInfo,
  WeeklyStaffReport,
  WeeklyReportManagerComment,
  WeeklyReportAiSummary,
  WorkloadRating,
  ProductivityRating,
  WeeklyReportStatus,
} from "../types";
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

function seedWeek(weeksAgo: number): string {
  const d = new Date();
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day) - weeksAgo * 7);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const REPORT_TEXTS = [
  "Strong week overall. Finalized the Q1 pipeline review with the sales team, joined three carrier negotiation calls, and closed a routing deal with a tier-2 partner. Also helped onboard the new junior analyst \u2014 took about half a day but went smoothly.",
  "Tough week. The NOC alert storm on Tuesday consumed most of Wednesday too. Wrote the full post-mortem, coordinated with three teams, and presented findings to management by Friday. Exhausting but the team held up well.",
  "Mostly internal work this week \u2014 updated the interconnection process documentation, ran the monthly carrier quality audit, and responded to a backlog of emails. No major fires, just steady execution.",
  "Big sales push. Sent 5 proposals, had 8 follow-up calls, and closed 2 deals. One was the Acme Telecom contract we\u2019ve been chasing for 6 weeks. Very satisfying week despite the pressure.",
  "Platform migration prep dominated the week. Two all-hands alignment sessions, updated the technical runbook, and ran a dry-run with the engineering team. We\u2019re on track for the Q2 cutover.",
  "Mixed week. Good progress on the voice routing optimisation project (delivered the analysis report), but got pulled into a last-minute compliance review that took two full days unexpectedly.",
  "Light week by design \u2014 used the time to clear the backlog: expense reports, HR forms, contract renewals, and cleaning up the CRM. Also did a 1-on-1 catch-up with each team member.",
  "Intensive sprint to hit the monthly KPI targets. Lots of short calls, dashboard updates, and coordinating between sales and technical. Hit targets by Thursday, so Friday was more relaxed.",
];

const REPORT_HIGHLIGHTS = [
  ["Closed routing deal with tier-2 partner", "Q1 pipeline review completed", "New analyst onboarded"],
  ["NOC post-mortem delivered to management", "Alert storm contained within 36h", "Cross-team coordination successful"],
  ["Carrier quality audit completed", "Interconnection docs updated", "Email backlog cleared"],
  ["Closed Acme Telecom contract", "5 proposals sent", "2 deals closed this week"],
  ["Technical runbook updated", "Dry-run completed on schedule", "Q2 migration on track"],
  ["Voice routing analysis report delivered", "Compliance review completed"],
  ["Full backlog cleared", "1-on-1s with all team members", "CRM data cleaned up"],
  ["Monthly KPI targets hit by Thursday", "Sales-technical coordination smooth"],
];

const SEED_WL: WorkloadRating[] = [4, 5, 3, 4, 4, 3, 2, 5, 3, 4];
const SEED_PR: ProductivityRating[] = [4, 3, 3, 5, 4, 3, 4, 4, 3, 5];

interface SeedReportResult {
  weeklyStaffReports: WeeklyStaffReport[];
  weeklyReportManagerComments: WeeklyReportManagerComment[];
  weeklyReportAiSummaries: WeeklyReportAiSummary[];
}

function seedManagementReports(
  hrEmployees: DbState["hrEmployees"],
  managerUserId: string,
): SeedReportResult {
  const active = hrEmployees.filter((e) => e.active).slice(0, 10);
  const reports: WeeklyStaffReport[] = [];
  const comments: WeeklyReportManagerComment[] = [];

  active.forEach((emp, empIdx) => {
    for (let weeksAgo = 0; weeksAgo < 4; weeksAgo++) {
      const weekStart = seedWeek(weeksAgo);
      const textIdx = (empIdx + weeksAgo) % REPORT_TEXTS.length;
      const wl = SEED_WL[empIdx % SEED_WL.length];
      const pr = SEED_PR[empIdx % SEED_PR.length];
      const status: WeeklyReportStatus = weeksAgo > 0 ? "Submitted" : "Draft";
      reports.push({
        id: `seed-wr-${emp.id}-w${weeksAgo}`,
        employeeId: emp.id,
        weekStartDate: weekStart,
        status,
        reportText: REPORT_TEXTS[textIdx],
        highlights: REPORT_HIGHLIGHTS[textIdx],
        workloadRating: wl,
        productivityRating: pr,
        calendarScreenshotUrl: undefined,
        submittedAt: status === "Submitted" ? weekStart + "T17:30:00Z" : undefined,
        createdAt: weekStart + "T09:00:00Z",
        updatedAt: weekStart + "T17:30:00Z",
      });
    }
  });

  const COMMENT_POOL: { text: string; ai: boolean }[] = [
    { text: "Great work this week. The pipeline review output was exactly what we needed for the board deck.", ai: false },
    { text: "Workload: Heavy week \u2013 close to capacity. Productivity: High productivity week. Overall: High-output high-intensity week. Well done on managing the incident.", ai: true },
    { text: "Good steady execution. Make sure to flag the compliance backlog earlier next time so we can resource it properly.", ai: false },
    { text: "Workload: Moderate. Productivity: Average. Overall: Balanced week. No flags.", ai: true },
    { text: "Excellent result on the Acme deal. Let\u2019s discuss the pipeline strategy in our next 1-on-1.", ai: false },
    { text: "Workload: Heavy. Productivity: High. Overall: High-output high-intensity week. Flags: Consistently in top quartile.", ai: true },
  ];

  const commentAssignments: number[][] = [[0, 1], [2, 3], [4], [5], [0]];
  const w1Start = seedWeek(1);

  commentAssignments.forEach((indices, empIdx) => {
    if (empIdx >= active.length) return;
    const emp = active[empIdx];
    const reportId = `seed-wr-${emp.id}-w1`;
    indices.forEach((ci, commentIdx) => {
      const c = COMMENT_POOL[ci];
      comments.push({
        id: `seed-mc-${emp.id}-${commentIdx}`,
        reportId,
        managerUserId,
        commentText: c.text,
        aiGenerated: c.ai,
        createdAt: w1Start + "T18:30:00Z",
      });
    });
  });

  const emp0Id = active[0]?.id ?? "unknown";
  const summaries: WeeklyReportAiSummary[] = [
    {
      reportId: `seed-wr-${emp0Id}-w1`,
      scope: "individual",
      scopeId: emp0Id,
      weekStartDate: seedWeek(1),
      workloadAssessment: "Heavy week \u2013 close to capacity",
      productivityAssessment: "High productivity week",
      overallVerdict: "High-output high-intensity week",
      flags: [],
      generatedAt: seedWeek(1) + "T19:00:00Z",
    },
    {
      scope: "team",
      scopeId: emp0Id,
      weekStartDate: seedWeek(1),
      workloadAssessment: "Team avg workload: 3.8/5 \u2013 Heavy week across the team",
      productivityAssessment: "Team avg productivity: 3.6/5 \u2013 Above average performance",
      overallVerdict: "High-output week with some capacity pressure",
      flags: ["Burnout risk: 1 employee at max workload", "2 reports missing submission"],
      generatedAt: seedWeek(1) + "T20:00:00Z",
    },
    {
      scope: "company",
      scopeId: "all",
      weekStartDate: seedWeek(1),
      workloadAssessment: "Team avg workload: 3.7/5 \u2013 Moderately heavy company-wide",
      productivityAssessment: "Team avg productivity: 3.8/5 \u2013 Good overall output",
      overallVerdict: "Solid execution week \u2013 company performing above average",
      flags: ["Burnout risk: 2 employees at max workload", "Less than half of team submitted reports"],
      generatedAt: seedWeek(1) + "T21:00:00Z",
    },
  ];

  return {
    weeklyStaffReports: reports,
    weeklyReportManagerComments: comments,
    weeklyReportAiSummaries: summaries,
  };
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

  const mgmtReports = seedManagementReports(hr.hrEmployees, activeUserId);

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
    taskLabels: crmTasks.taskLabels.slice().sort((left, right) => left.id.localeCompare(right.id)),
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
    opsSlaProfiles: ops.opsSlaProfiles,
    weeklyStaffReports: mgmtReports.weeklyStaffReports,
    weeklyReportManagerComments: mgmtReports.weeklyReportManagerComments,
    weeklyReportAiSummaries: mgmtReports.weeklyReportAiSummaries,
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

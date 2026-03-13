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

const REPORT_POOL: { text: string; highlights: string[] }[] = [
  { text: "Strong week overall. Finalized the Q1 pipeline review with the sales team, joined three carrier negotiation calls, and closed a routing deal with a tier-2 partner. Also helped onboard the new junior analyst which took about half a day but went smoothly.", highlights: ["Closed routing deal with tier-2 partner", "Q1 pipeline review completed", "New analyst onboarded"] },
  { text: "Tough week. The NOC alert storm on Tuesday consumed most of Wednesday as well. Wrote the full post-mortem report, coordinated with three cross-functional teams, and presented findings to management by Friday. Exhausting but the team held up remarkably well under pressure.", highlights: ["NOC post-mortem delivered to management", "Alert storm contained within 36 hours", "Cross-team coordination successful"] },
  { text: "Mostly internal work this week. Updated the interconnection process documentation, ran the monthly carrier quality audit, and responded to a significant backlog of vendor emails. No major fires, just steady and reliable execution across the board.", highlights: ["Carrier quality audit completed", "Interconnection docs updated", "Email backlog cleared"] },
  { text: "Big sales push. Sent five proposals, had eight follow-up calls, and closed two deals. One was the Acme Telecom contract we have been chasing for six weeks. Very satisfying week despite the relentless pace and back-to-back meetings.", highlights: ["Closed Acme Telecom contract", "5 proposals sent", "2 deals closed this week"] },
  { text: "Platform migration prep dominated the week. Two all-hands alignment sessions, updated the technical runbook, and ran a full dry-run with the engineering team. We are on track for the Q2 cutover and the team confidence is high after the rehearsal.", highlights: ["Technical runbook updated", "Dry-run completed on schedule", "Q2 migration on track"] },
  { text: "Mixed week. Good progress on the voice routing optimisation project where I delivered the analysis report ahead of schedule, but got pulled into a last-minute compliance review that consumed two full days unexpectedly. Need to discuss resource allocation for these ad-hoc requests.", highlights: ["Voice routing analysis report delivered", "Compliance review completed", "Resource allocation discussion needed"] },
  { text: "Light week by design. Used the time to clear the administrative backlog: expense reports, HR forms, contract renewals, and cleaning up outdated CRM records. Also did one-on-one catch-ups with each team member to check on morale and priorities.", highlights: ["Full backlog cleared", "1-on-1s with all team members", "CRM data cleaned up"] },
  { text: "Intensive sprint to hit the monthly KPI targets. Lots of short coordination calls, real-time dashboard updates, and tight orchestration between sales and technical teams. Hit all targets by Thursday, so Friday was a well-deserved lighter day for the team.", highlights: ["Monthly KPI targets hit by Thursday", "Sales-technical coordination smooth", "Team morale boosted"] },
  { text: "Customer escalation week. Two major accounts flagged SLA breaches on Monday, so the entire week was spent diagnosing the root cause, implementing fixes, and running executive status calls every afternoon. Both issues are now resolved but it was draining.", highlights: ["Two SLA breach escalations resolved", "Root cause analysis completed", "Executive status cadence established"] },
  { text: "Focused heavily on carrier negotiations this week. Had four calls with potential partners in the MENA region and prepared the commercial terms for two new interconnection agreements. Also reviewed three inbound rate sheets and updated our pricing model accordingly.", highlights: ["4 MENA carrier negotiation calls", "2 interconnection agreements drafted", "Pricing model updated"] },
  { text: "Training and knowledge transfer week. Ran two internal workshops on the new billing system for the finance team, prepared updated onboarding materials for the next cohort of hires, and documented the SMS gateway failover procedure that was missing from our runbooks.", highlights: ["2 billing system workshops delivered", "Onboarding materials updated", "Failover procedure documented"] },
  { text: "Budget review season hit hard. Spent three days preparing the quarterly forecast with finance, reconciling actual vs. projected spend across all carrier contracts, and building the business case for the headcount increase we need in Q3. Important but tedious work.", highlights: ["Quarterly forecast prepared", "Carrier spend reconciled", "Q3 headcount business case drafted"] },
  { text: "Product demo marathon. Presented our new routing dashboard to four different client groups this week, incorporating feedback after each session. The engineering team pushed a hotfix mid-week that improved load times by forty percent, which made the Thursday demo noticeably smoother.", highlights: ["4 product demos delivered", "Client feedback incorporated", "40% load time improvement shipped"] },
  { text: "Cross-team coordination was the theme of the week. Facilitated alignment between sales, product, and engineering on the roadmap for Q2. Three departments, five meetings, one shared Gantt chart that everyone finally agrees on. Also squeezed in a contract renewal with VodaConnect.", highlights: ["Q2 roadmap alignment achieved", "VodaConnect contract renewed", "Cross-department Gantt chart finalized"] },
  { text: "Compliance-heavy week. The annual regulatory audit preparation kicked off and I spent most of the week gathering documentation, updating our data processing records, and coordinating with legal on two outstanding items. Necessary work but it stalled my other projects.", highlights: ["Regulatory audit prep started", "Data processing records updated", "Legal coordination on 2 items"] },
  { text: "Great momentum this week. Closed the TelcoHub partnership that has been in the pipeline for three months. Also onboarded two new team members, ran their orientation sessions, and paired them with mentors. The team is growing and the energy is positive.", highlights: ["TelcoHub partnership closed", "2 new team members onboarded", "Mentor pairing completed"] },
  { text: "Infrastructure focus. Worked closely with the DevOps team to migrate our monitoring stack to the new observability platform. Spent two days writing Terraform configs and another day validating alert thresholds. Everything is live and working as expected.", highlights: ["Monitoring stack migrated", "Terraform configs written", "Alert thresholds validated"] },
  { text: "Quiet week on the client front which I used to catch up on internal process improvements. Redesigned the weekly reporting template, automated three manual data pulls using scripts, and updated the team wiki with the latest process changes from last quarter.", highlights: ["Reporting template redesigned", "3 data pulls automated", "Team wiki updated"] },
  { text: "Stressful week. A critical route went down on Wednesday affecting a top-five customer. Led the war room for eight hours, coordinated with two external carriers, and had the route restored by Thursday morning. Wrote the incident report and started the vendor review process.", highlights: ["Critical route restored within 18 hours", "War room led successfully", "Incident report and vendor review initiated"] },
  { text: "Balanced week with a good mix of strategic and operational work. Finalized the market entry analysis for Southeast Asia, reviewed two vendor proposals for the new SMS hub, and conducted three performance reviews with team members. Felt productive without being overwhelmed.", highlights: ["Southeast Asia market analysis finalized", "2 vendor proposals reviewed", "3 performance reviews conducted"] },
  { text: "Spent the week deep in contract negotiations with GlobalCarrier Ltd. Four rounds of redlines on the service agreement, two pricing model iterations, and a final alignment call on Friday that got us to a handshake deal. Legal will formalize next week.", highlights: ["GlobalCarrier deal reached handshake", "4 rounds of contract redlines", "Pricing model finalized"] },
  { text: "Week dominated by the quarterly business review preparation. Built the executive deck, consolidated KPIs from five departments, and rehearsed the presentation twice. The actual QBR on Thursday went well and leadership approved our expansion proposal.", highlights: ["QBR deck built and presented", "KPIs consolidated from 5 departments", "Expansion proposal approved"] },
  { text: "Customer success focus. Ran health checks on our top ten accounts, identified two at risk of churn, and initiated retention plans for both. Also conducted a satisfaction survey follow-up with three accounts that had flagged issues last quarter. All three are now green.", highlights: ["Top 10 account health checks completed", "2 at-risk accounts identified with retention plans", "3 previously flagged accounts moved to green"] },
  { text: "Technical deep-dive week. Investigated the intermittent latency issues on our European routes, identified a misconfigured load balancer as the culprit, and worked with the network team to deploy the fix. Also benchmarked three alternative CDN providers for the Q3 evaluation.", highlights: ["European route latency issue resolved", "Load balancer misconfiguration fixed", "3 CDN providers benchmarked"] },
  { text: "Relatively calm week. Used the breathing room to plan the team offsite for next month, update our OKRs for the quarter, and write a process document for the new escalation workflow. Also had a productive strategy session with the head of product about our integration roadmap.", highlights: ["Team offsite planned", "Quarterly OKRs updated", "Escalation workflow documented", "Integration roadmap discussed"] },
  { text: "Heavy travel week. Visited the Istanbul office Monday through Wednesday for the regional sync, then flew to London for two client meetings on Thursday. Managed to squeeze in a partner dinner Friday evening. Productive but physically exhausting with the back-to-back flights.", highlights: ["Istanbul regional sync completed", "2 London client meetings", "Partner dinner relationship building"] },
  { text: "Sprint planning and execution. Kicked off the new development cycle with the engineering team, defined acceptance criteria for twelve user stories, and reviewed the QA test plan. Also handled an urgent pricing request from the APAC sales team that needed same-day turnaround.", highlights: ["Sprint planning completed with 12 stories", "QA test plan reviewed", "Urgent APAC pricing delivered same-day"] },
  { text: "Focused on team development this week. Ran a skills assessment workshop, identified three training gaps across the team, and enrolled two team members in external certification programs. Also conducted mid-year career development conversations with everyone on the team.", highlights: ["Skills assessment workshop completed", "3 training gaps identified", "2 certifications initiated", "Career conversations held"] },
  { text: "End-of-month crunch. Finalized all outstanding invoices with finance, reconciled three disputed billing items with carriers, and submitted the monthly operations report. Also squeezed in preparation for the board meeting next week, which required pulling data from six different systems.", highlights: ["Monthly invoices finalized", "3 billing disputes reconciled", "Board meeting prep completed"] },
  { text: "Innovation day plus regular duties. Spent Wednesday at the internal hackathon where our team prototyped an AI-powered route optimization tool. Won second place. The rest of the week was standard operations: carrier calls, ticket reviews, and a vendor performance meeting.", highlights: ["Hackathon: 2nd place for AI route optimizer", "Vendor performance review conducted", "Standard operations maintained"] },
];

const WL_GRID: WorkloadRating[][] = [
  [4, 3, 5, 3, 4, 2],
  [5, 4, 3, 5, 4, 3],
  [3, 2, 3, 4, 3, 2],
  [4, 5, 4, 3, 2, 4],
  [4, 3, 4, 5, 3, 3],
  [3, 4, 2, 3, 4, 3],
  [2, 3, 2, 2, 3, 2],
  [5, 4, 5, 4, 3, 5],
  [3, 3, 4, 3, 2, 3],
  [4, 5, 3, 4, 4, 3],
  [3, 4, 3, 2, 3, 4],
  [4, 3, 4, 5, 4, 3],
  [2, 3, 3, 3, 2, 2],
  [5, 4, 4, 3, 5, 4],
  [3, 2, 3, 4, 3, 3],
];

const PR_GRID: ProductivityRating[][] = [
  [4, 4, 3, 4, 5, 3],
  [3, 3, 4, 2, 3, 4],
  [3, 4, 3, 3, 4, 4],
  [5, 4, 5, 4, 3, 5],
  [4, 4, 3, 3, 4, 4],
  [3, 3, 4, 4, 3, 3],
  [4, 5, 4, 3, 4, 5],
  [4, 3, 3, 4, 4, 3],
  [3, 4, 3, 3, 3, 4],
  [5, 4, 4, 5, 3, 4],
  [4, 3, 4, 4, 5, 3],
  [3, 4, 3, 2, 3, 4],
  [4, 4, 5, 4, 3, 4],
  [3, 2, 3, 4, 4, 3],
  [4, 3, 4, 3, 4, 5],
];

interface SeedReportResult {
  weeklyStaffReports: WeeklyStaffReport[];
  weeklyReportManagerComments: WeeklyReportManagerComment[];
  weeklyReportAiSummaries: WeeklyReportAiSummary[];
}

function seedManagementReports(
  hrEmployees: DbState["hrEmployees"],
  managerUserId: string,
): SeedReportResult {
  const active = hrEmployees.filter((e) => e.active).slice(0, 15);
  const reports: WeeklyStaffReport[] = [];
  const comments: WeeklyReportManagerComment[] = [];

  active.forEach((emp, ei) => {
    for (let w = 0; w < 6; w++) {
      const ws = seedWeek(w);
      const pool = REPORT_POOL[(ei * 6 + w) % REPORT_POOL.length];
      const wl = WL_GRID[ei % WL_GRID.length][w % 6];
      const pr = PR_GRID[ei % PR_GRID.length][w % 6];
      const status: WeeklyReportStatus = w > 0 ? "Submitted" : "Draft";
      reports.push({
        id: `seed-wr-${emp.id}-w${w}`,
        employeeId: emp.id,
        weekStartDate: ws,
        status,
        reportText: pool.text,
        highlights: pool.highlights,
        workloadRating: wl,
        productivityRating: pr,
        calendarScreenshotUrl: undefined,
        submittedAt: status === "Submitted" ? ws + "T17:30:00Z" : undefined,
        createdAt: ws + "T09:00:00Z",
        updatedAt: ws + "T17:30:00Z",
      });
    }
  });

  const HUMAN_COMMENTS = [
    "The pipeline review output was exactly what we needed for the board deck. Great initiative pulling in the carrier data without being asked.",
    "The Acme escalation you handled was exactly the right approach. Let us document that process so the wider team can follow it next time.",
    "Good steady execution this week. Make sure to flag compliance-related blockers earlier so we can allocate resources before they become urgent.",
    "Excellent result on closing that deal. I want to discuss the negotiation tactics you used in our next one-on-one so we can share them with the team.",
    "Your cross-team coordination this week was outstanding. The Gantt chart alignment alone probably saved us two weeks of misalignment down the road.",
    "Appreciate the deep-dive on the latency issue. The root cause analysis was thorough and the fix was deployed quickly. Well done.",
    "The training workshops you ran were well received by the finance team. Consider doing a recorded version for future hires to watch during onboarding.",
    "The incident response on Wednesday was textbook. Eight-hour war room sessions are never fun but the outcome speaks for itself. Make sure you take some recovery time.",
    "Budget review work is thankless but critical. The forecast you put together was clean and the headcount business case was compelling. Leadership noticed.",
    "Your customer health checks identified real risks early. The retention plans for the two at-risk accounts are solid. Let us review progress in two weeks.",
    "The product demos went well based on client feedback. Keep iterating on the messaging for the mid-market segment, it resonated less than the enterprise pitch.",
    "Team development is one of your strengths. The skills assessment workshop was well-structured and the certification investments are the right call.",
    "Good job clearing the backlog. Administrative work piles up fast and tackling it proactively keeps the team running smoothly. Solid week.",
    "The QBR presentation was one of the best we have delivered. The data consolidation from five departments was seamless. Great preparation.",
    "Your hackathon project was impressive. Let us explore whether the AI route optimizer prototype can become a real roadmap item for Q3.",
    "Carrier negotiations are always a grind but four rounds of redlines to a handshake in one week is exceptional. Well managed.",
    "The monitoring stack migration was a big lift. Appreciate you taking ownership of the Terraform configs end-to-end without needing hand-holding.",
    "Sprint planning was efficient this week. Twelve stories with clear acceptance criteria is a good pace. Keep an eye on the APAC pricing workflow, it keeps coming up as urgent.",
    "The Southeast Asia market analysis was thorough and will directly inform our expansion strategy. Good balance of data and narrative.",
    "Strong week of customer relationship building. The partner dinner was a smart investment of time. Travel is tiring but these face-to-face moments matter.",
  ];

  const AI_COMMENTS = [
    "Workload: Heavy week at 4/5, close to capacity. Productivity: High at 4/5, output matched the effort. Overall verdict: High-output, high-intensity week. No flags raised.",
    "Workload: Extreme at 5/5, potential burnout risk. Productivity: Moderate at 3/5, output did not match the heavy effort invested. Overall verdict: Heavy load with moderate output, needs attention. Flags: Burnout risk flagged, consider workload redistribution.",
    "Workload: Moderate at 3/5, standard operating rhythm. Productivity: Average at 3/5, steady but not exceptional. Overall verdict: Balanced and sustainable week. No flags.",
    "Workload: Heavy at 4/5, near capacity. Productivity: Very high at 5/5, exceptional output relative to effort. Overall verdict: Efficient high-performer week. Flags: Consistently in top quartile, consider for expanded responsibilities.",
    "Workload: Light at 2/5, well below capacity. Productivity: High at 4/5, used downtime effectively. Overall verdict: Efficient light week with good use of available time. No flags.",
    "Workload: Extreme at 5/5, significant strain. Productivity: High at 4/5, maintained output despite pressure. Overall verdict: Resilient performance under heavy load. Flags: Burnout risk, two consecutive heavy weeks detected.",
    "Workload: Moderate at 3/5. Productivity: High at 4/5. Overall verdict: Good productive week at a sustainable pace. No flags. Recommendation: Maintain this rhythm.",
    "Workload: Heavy at 4/5. Productivity: Low at 2/5, output significantly below expected for this workload level. Overall verdict: Heavy load, low output, needs manager attention. Flags: Critically low productivity relative to effort, possible blockers or burnout.",
    "Workload: Light at 2/5, deliberately reduced. Productivity: Very high at 5/5, excellent use of focused time. Overall verdict: Strategic light week with exceptional productivity. Recommendation: This pattern is healthy when alternated with heavier weeks.",
    "Workload: Moderate at 3/5. Productivity: Moderate at 3/5. Overall verdict: Standard balanced week. No flags. Report is detailed and well-structured.",
  ];

  let commentId = 0;
  for (let ei = 0; ei < Math.min(10, active.length); ei++) {
    const emp = active[ei];
    for (let w = 1; w <= 3; w++) {
      const reportId = `seed-wr-${emp.id}-w${w}`;
      const ws = seedWeek(w);
      const hIdx = (ei * 3 + w) % HUMAN_COMMENTS.length;
      comments.push({
        id: `seed-mc-${commentId++}`,
        reportId,
        managerUserId,
        commentText: HUMAN_COMMENTS[hIdx],
        aiGenerated: false,
        createdAt: ws + "T18:30:00Z",
      });
      if ((ei + w) % 2 === 0) {
        const aIdx = (ei * 3 + w) % AI_COMMENTS.length;
        comments.push({
          id: `seed-mc-${commentId++}`,
          reportId,
          managerUserId,
          commentText: AI_COMMENTS[aIdx],
          aiGenerated: true,
          createdAt: ws + "T19:00:00Z",
        });
      }
    }
  }

  const summaries: WeeklyReportAiSummary[] = [];
  for (let ei = 0; ei < Math.min(5, active.length); ei++) {
    const emp = active[ei];
    for (const w of [1, 2]) {
      const ws = seedWeek(w);
      const wl = WL_GRID[ei][w];
      const pr = PR_GRID[ei][w];
      const wlText = wl >= 4 ? "Heavy week, close to or at capacity. The employee reported sustained high effort throughout the period." : wl <= 2 ? "Light week with available capacity. The employee had room for additional responsibilities or strategic work." : "Moderate and sustainable workload. The employee operated within normal parameters with no strain indicators.";
      const prText = pr >= 4 ? "High productivity reported. Output was strong relative to effort and the employee delivered meaningful results across multiple workstreams." : pr <= 2 ? "Below-average productivity. Output did not match the effort invested, which may indicate blockers, context-switching overhead, or fatigue." : "Average productivity. The employee maintained a steady output pace consistent with typical weekly performance.";
      const verdict = wl >= 4 && pr >= 4 ? "High-output, high-intensity week. Strong results under pressure but sustainability should be monitored." : wl >= 4 && pr <= 2 ? "Heavy load with low output. This pattern needs immediate attention to identify and remove blockers." : wl <= 2 && pr >= 4 ? "Efficient light week. Excellent use of available time to deliver meaningful results." : wl <= 2 && pr <= 2 ? "Low-activity week. Consider whether the employee had sufficient work allocated or is disengaged." : "Balanced week with proportionate effort and output. No immediate concerns.";
      const flags: string[] = [];
      if (wl === 5) flags.push("Burnout risk: workload rated at maximum");
      if (pr <= 2) flags.push("Low productivity flagged for follow-up");
      if (wl >= 4 && pr <= 2) flags.push("Effort-output mismatch requires manager discussion");
      summaries.push({
        reportId: `seed-wr-${emp.id}-w${w}`,
        scope: "individual",
        scopeId: emp.id,
        weekStartDate: ws,
        workloadAssessment: wlText,
        productivityAssessment: prText,
        overallVerdict: verdict,
        flags,
        generatedAt: ws + "T19:00:00Z",
      });
    }
  }

  const emp0Id = active[0]?.id ?? "unknown";
  for (const w of [1, 2, 3]) {
    const ws = seedWeek(w);
    const weekReports = reports.filter((r) => r.weekStartDate === ws && r.status === "Submitted");
    const cnt = weekReports.length || 1;
    const avgWl = (weekReports.reduce((s, r) => s + r.workloadRating, 0) / cnt).toFixed(1);
    const avgPr = (weekReports.reduce((s, r) => s + r.productivityRating, 0) / cnt).toFixed(1);
    const burnout = weekReports.filter((r) => r.workloadRating === 5).length;
    const lowPr = weekReports.filter((r) => r.productivityRating <= 2).length;
    const tFlags: string[] = [];
    if (burnout > 0) tFlags.push(`Burnout risk: ${burnout} employee${burnout > 1 ? "s" : ""} at maximum workload`);
    if (lowPr > 0) tFlags.push(`${lowPr} employee${lowPr > 1 ? "s" : ""} reported low productivity, follow-up recommended`);
    const missing = active.length - weekReports.length;
    if (missing > 0) tFlags.push(`${missing} report${missing > 1 ? "s" : ""} not yet submitted for this period`);
    summaries.push({
      scope: "team",
      scopeId: emp0Id,
      weekStartDate: ws,
      workloadAssessment: `Team average workload: ${avgWl}/5. ${Number(avgWl) >= 4 ? "The team is operating near capacity this week with elevated strain across multiple members." : Number(avgWl) <= 2.5 ? "The team had a relatively light week with available capacity for additional work." : "The team maintained a moderate and sustainable pace this week."}`,
      productivityAssessment: `Team average productivity: ${avgPr}/5. ${Number(avgPr) >= 4 ? "Strong collective output this week with most team members delivering at or above expectations." : Number(avgPr) <= 2.5 ? "Below-average team productivity. Several members underperformed relative to their workload." : "Solid team productivity overall, consistent with recent weekly averages."}`,
      overallVerdict: Number(avgWl) >= 4 && Number(avgPr) >= 4 ? "High-intensity, high-output week across the team. Results are strong but the pace may not be sustainable if maintained." : Number(avgWl) >= 4 && Number(avgPr) < 3 ? "The team worked hard but output was disappointing. Investigate systemic blockers or process inefficiencies." : "Balanced team performance this week. Workload and productivity are aligned and within healthy ranges.",
      flags: tFlags,
      generatedAt: ws + "T20:00:00Z",
    });
  }

  for (const w of [1, 2, 3]) {
    const ws = seedWeek(w);
    const weekReports = reports.filter((r) => r.weekStartDate === ws && r.status === "Submitted");
    const cnt = weekReports.length || 1;
    const avgWl = (weekReports.reduce((s, r) => s + r.workloadRating, 0) / cnt).toFixed(1);
    const avgPr = (weekReports.reduce((s, r) => s + r.productivityRating, 0) / cnt).toFixed(1);
    const burnout = weekReports.filter((r) => r.workloadRating === 5).length;
    const cFlags: string[] = [];
    if (burnout > 0) cFlags.push(`Company-wide burnout risk: ${burnout} employee${burnout > 1 ? "s" : ""} at maximum workload`);
    const subRate = ((weekReports.length / active.length) * 100).toFixed(0);
    if (Number(subRate) < 80) cFlags.push(`Submission rate at ${subRate}%, below the 80% target`);
    summaries.push({
      scope: "company",
      scopeId: "all",
      weekStartDate: ws,
      workloadAssessment: `Company average workload: ${avgWl}/5. ${Number(avgWl) >= 3.5 ? "The organization is running at elevated capacity. Resource planning should be reviewed to prevent sustained overload." : "Workload levels are within normal operating range across the company."}`,
      productivityAssessment: `Company average productivity: ${avgPr}/5. ${Number(avgPr) >= 3.5 ? "Strong organizational output this week. The company is executing well against its objectives." : "Productivity is at acceptable levels but there is room for improvement in several departments."}`,
      overallVerdict: `Solid execution week across the organization. ${weekReports.length} of ${active.length} employees submitted reports. ${Number(avgWl) >= 4 ? "Capacity pressure is building and should be addressed in the next planning cycle." : "The overall rhythm is healthy and sustainable."}`,
      flags: cFlags,
      generatedAt: ws + "T21:00:00Z",
    });
  }

  const monthKey = seedWeek(1).slice(0, 7);
  const monthReports = reports.filter((r) => r.weekStartDate.startsWith(monthKey) && r.status === "Submitted");
  const mCnt = monthReports.length || 1;
  const mAvgWl = (monthReports.reduce((s, r) => s + r.workloadRating, 0) / mCnt).toFixed(1);
  const mAvgPr = (monthReports.reduce((s, r) => s + r.productivityRating, 0) / mCnt).toFixed(1);
  const mBurnout = monthReports.filter((r) => r.workloadRating === 5).length;
  const mFlags: string[] = [];
  if (mBurnout > 0) mFlags.push(`${mBurnout} burnout-risk report${mBurnout > 1 ? "s" : ""} detected this month`);
  if (monthReports.length < active.length * 3) mFlags.push("Monthly submission rate below expected volume");
  summaries.push({
    scope: "company",
    scopeId: "all",
    monthKey,
    workloadAssessment: `Monthly company average workload: ${mAvgWl}/5. ${Number(mAvgWl) >= 3.5 ? "The month saw sustained elevated workload across the organization, suggesting resource constraints." : "Monthly workload remained within sustainable levels."}`,
    productivityAssessment: `Monthly company average productivity: ${mAvgPr}/5. ${Number(mAvgPr) >= 3.5 ? "Strong month for output. Most teams delivered at or above their targets." : "Average monthly productivity. Performance was steady but not exceptional."}`,
    overallVerdict: `${monthReports.length} reports submitted this month across ${active.length} employees. ${Number(mAvgWl) >= 3.5 && Number(mAvgPr) >= 3.5 ? "High-effort, high-output month. Monitor for burnout in the coming weeks." : "Balanced month with no systemic concerns. Continue current operating rhythm."}`,
    flags: mFlags,
    generatedAt: seedWeek(0) + "T10:00:00Z",
  });

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
    taskAttachments: [],
    hrCompChangeLogs: (() => {
      const logs = [];
      const empSlice = hr.hrEmployees.filter((e) => e.active).slice(0, 5);
      for (let i = 0; i < empSlice.length; i++) {
        logs.push({
          id: `seed-ccl-${i}-1`,
          employeeId: empSlice[i].id,
          changedByUserId: users[0].id,
          changedAt: `2026-01-${String(10 + i).padStart(2, "0")}T10:00:00.000Z`,
          reason: ["Annual salary review", "Promotion adjustment", "Market correction"][i % 3],
          previousSalaryEur: 3000 + i * 500,
          newSalaryEur: 3500 + i * 500,
        });
        if (i < 3) {
          logs.push({
            id: `seed-ccl-${i}-2`,
            employeeId: empSlice[i].id,
            changedByUserId: users[0].id,
            changedAt: `2025-07-${String(15 + i).padStart(2, "0")}T10:00:00.000Z`,
            reason: "Onboarding salary set",
            previousSalaryEur: undefined,
            newSalaryEur: 3000 + i * 500,
          });
        }
      }
      return logs;
    })(),
    hrPublicHolidays: [
      { id: "ph-tr-1", country: "Turkey", date: "2026-01-01", name: "New Year's Day" },
      { id: "ph-tr-2", country: "Turkey", date: "2026-04-23", name: "National Sovereignty and Children's Day" },
      { id: "ph-tr-3", country: "Turkey", date: "2026-05-01", name: "Labour Day" },
      { id: "ph-tr-4", country: "Turkey", date: "2026-05-19", name: "Commemoration of Atatürk, Youth and Sports Day" },
      { id: "ph-tr-5", country: "Turkey", date: "2026-07-15", name: "Democracy and National Unity Day" },
      { id: "ph-tr-6", country: "Turkey", date: "2026-10-29", name: "Republic Day" },
      { id: "ph-uk-1", country: "United Kingdom", date: "2026-01-01", name: "New Year's Day" },
      { id: "ph-uk-2", country: "United Kingdom", date: "2026-04-03", name: "Good Friday" },
      { id: "ph-uk-3", country: "United Kingdom", date: "2026-04-06", name: "Easter Monday" },
      { id: "ph-uk-4", country: "United Kingdom", date: "2026-05-04", name: "Early May Bank Holiday" },
      { id: "ph-uk-5", country: "United Kingdom", date: "2026-05-25", name: "Spring Bank Holiday" },
      { id: "ph-uk-6", country: "United Kingdom", date: "2026-12-25", name: "Christmas Day" },
      { id: "ph-us-1", country: "United States", date: "2026-01-01", name: "New Year's Day" },
      { id: "ph-us-2", country: "United States", date: "2026-01-19", name: "Martin Luther King Jr. Day" },
      { id: "ph-us-3", country: "United States", date: "2026-02-16", name: "Presidents' Day" },
      { id: "ph-us-4", country: "United States", date: "2026-05-25", name: "Memorial Day" },
      { id: "ph-us-5", country: "United States", date: "2026-07-04", name: "Independence Day" },
      { id: "ph-us-6", country: "United States", date: "2026-12-25", name: "Christmas Day" },
    ],
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
    nocCases: (() => {
      const now = Date.now();
      const ago = (m: number) => new Date(now - m * 60 * 1000).toISOString();
      return [
        { id: "noc-s-01", portalType: "SMS" as const, caseType: "ProviderIssue" as const, severity: "HIGH" as const, status: "Open" as const, createdAt: ago(45), providerName: "Turkcell", smsCount: 45230, dlrRate: 62 },
        { id: "noc-s-02", portalType: "SMS" as const, caseType: "Losses" as const, severity: "URGENT" as const, status: "Open" as const, createdAt: ago(12), customerName: "Vodafone DE", destination: "Germany", lossAmount: 18400 },
        { id: "noc-s-03", portalType: "SMS" as const, caseType: "FailedSmsCall" as const, severity: "MEDIUM" as const, status: "Actioned" as const, createdAt: ago(180), customerName: "Orange FR", destination: "France", attemptCount: 3200, action: "ROUTING_CHANGED" as const, actionedBy: "Ali Yılmaz", actionedAt: ago(120), comment: "Route switched to backup" },
        { id: "noc-s-04", portalType: "SMS" as const, caseType: "NewLostTraffic" as const, severity: "HIGH" as const, status: "Open" as const, createdAt: ago(30), customerName: "T-Mobile US", destination: "United States", smsCount: 89100 },
        { id: "noc-s-05", portalType: "SMS" as const, caseType: "TrafficComparison" as const, severity: "DECREASE" as const, status: "Actioned" as const, createdAt: ago(240), customerName: "MTN Nigeria", trafficDirection: "DECREASE" as const, trafficChangePercent: -28, action: "AC_MNG_INFORMED" as const, actionedBy: "Mehmet Kaya", actionedAt: ago(200), comment: "Account manager notified about volume drop" },
        { id: "noc-s-06", portalType: "SMS" as const, caseType: "ScheduleTest" as const, severity: "MEDIUM" as const, status: "Open" as const, createdAt: ago(55), destination: "Brazil", testResult: "TIMEOUT", attemptCount: 500 },
        { id: "noc-s-07", portalType: "SMS" as const, caseType: "ProviderIssue" as const, severity: "URGENT" as const, status: "Actioned" as const, createdAt: ago(300), providerName: "Etisalat", smsCount: 120000, dlrRate: 41, action: "TT_RAISED" as const, ttNumber: "TT-2026-0342", actionedBy: "Zeynep Demir", actionedAt: ago(280), comment: "DLR dropped to 41%, TT raised with provider" },
        { id: "noc-s-08", portalType: "SMS" as const, caseType: "Losses" as const, severity: "HIGH" as const, status: "Open" as const, createdAt: ago(18), customerName: "Telefonica ES", destination: "Spain", lossAmount: 7250 },
        { id: "noc-v-01", portalType: "Voice" as const, caseType: "ProviderIssue" as const, severity: "URGENT" as const, status: "Open" as const, createdAt: ago(8), providerName: "BT Wholesale", callCount: 12400, asrRate: 31 },
        { id: "noc-v-02", portalType: "Voice" as const, caseType: "TrafficComparison" as const, severity: "DECREASE" as const, status: "Open" as const, createdAt: ago(22), customerName: "Global Telecom", trafficDirection: "DECREASE" as const, trafficChangePercent: -34 },
        { id: "noc-v-03", portalType: "Voice" as const, caseType: "Losses" as const, severity: "HIGH" as const, status: "Actioned" as const, createdAt: ago(150), customerName: "Reliance Jio", destination: "India", lossAmount: 22100, action: "ROUTING_INFORMED" as const, actionedBy: "Can Özkan", actionedAt: ago(130), comment: "Routing team working on alternative path" },
        { id: "noc-v-04", portalType: "Voice" as const, caseType: "FailedSmsCall" as const, severity: "MEDIUM" as const, status: "Open" as const, createdAt: ago(35), customerName: "Airtel Africa", destination: "Kenya", attemptCount: 1800, testResult: "FAILED" },
        { id: "noc-v-05", portalType: "Voice" as const, caseType: "NewLostTraffic" as const, severity: "URGENT" as const, status: "Actioned" as const, createdAt: ago(90), customerName: "Claro Brazil", destination: "Brazil", callCount: 54000, action: "TT_RAISED" as const, ttNumber: "TT-2026-0356", actionedBy: "Ali Yılmaz", actionedAt: ago(75), comment: "New route lost, TT raised urgently" },
        { id: "noc-v-06", portalType: "Voice" as const, caseType: "ScheduleTest" as const, severity: "MEDIUM" as const, status: "Actioned" as const, createdAt: ago(200), destination: "Pakistan", testResult: "FAILED", attemptCount: 250, action: "CHECKED_NOISSUE" as const, actionedBy: "Mehmet Kaya", actionedAt: ago(185), comment: "Test failure was transient, re-test passed" },
        { id: "noc-v-07", portalType: "Voice" as const, caseType: "ProviderIssue" as const, severity: "HIGH" as const, status: "Open" as const, createdAt: ago(15), providerName: "Telia Carrier", callCount: 8900, asrRate: 48 },
        { id: "noc-v-08", portalType: "Voice" as const, caseType: "TrafficComparison" as const, severity: "INCREASE" as const, status: "Open" as const, createdAt: ago(40), customerName: "Singtel", trafficDirection: "INCREASE" as const, trafficChangePercent: 52 },
      ];
    })(),
    routingNocRequests: (() => {
      const now = Date.now();
      const ago = (m: number) => new Date(now - m * 60 * 1000).toISOString();
      const f = (obj: Record<string, string>): Record<string, string> => obj;
      return [
        { id: "rnr-01", tab: "Routing Request" as const, fields: f({ Customer: "Vodafone DE", Destination: "Germany", "Provider 1": "BT Wholesale", "Provider 2": "Tele2", "Provider 3": "", "Provider 4": "", "Provider 5": "", Comment: "Please optimise ASR for DE traffic" }), submittedBy: "Sarah Mitchell", submittedAt: ago(45), status: "Open" as const },
        { id: "rnr-02", tab: "Routing Request" as const, fields: f({ Customer: "Orange FR", Destination: "France", "Provider 1": "Syniverse", "Provider 2": "BICS", Comment: "" }), submittedBy: "James Carter", submittedAt: ago(180), status: "Routing Done" as const, closedBy: "Ali Yılmaz", closedAt: ago(120), nocComment: "Re-routed via BICS, ASR improved to 74%", reviewedByAm: false },
        { id: "rnr-03", tab: "Routing Request" as const, fields: f({ Customer: "T-Mobile US", Destination: "United States", "Provider 1": "Telia Carrier", "Provider 2": "", Comment: "ASR below 50% on current route" }), submittedBy: "Elif Demir", submittedAt: ago(320), status: "Routing Done" as const, closedBy: "Mehmet Kaya", closedAt: ago(280), nocComment: "Switched to Telia direct route, ASR now 68%", reviewedByAm: true },
        { id: "rnr-04", tab: "TT Request" as const, fields: f({ Customer: "Turkcell", Destination: "Turkey", Issue: "High failure rate on MT SMS last 2 hours", Comment: "Urgent please" }), submittedBy: "Elif Demir", submittedAt: ago(25), status: "Open" as const },
        { id: "rnr-05", tab: "TT Request" as const, fields: f({ Customer: "MTN Nigeria", Destination: "Nigeria", Issue: "DLR drop below 60% since 11:00 UTC", Comment: "" }), submittedBy: "James Carter", submittedAt: ago(200), status: "TT Sent" as const, closedBy: "Mehmet Yıldız", closedAt: ago(160), nocComment: "TT raised with provider, ref: TT-2024-9921", reviewedByAm: true },
        { id: "rnr-06", tab: "TT Request" as const, fields: f({ Customer: "Etisalat", Destination: "UAE", Issue: "Complete delivery failure on A2P routes", Comment: "Customer escalated" }), submittedBy: "Sarah Mitchell", submittedAt: ago(90), status: "TT Sent" as const, closedBy: "Ali Yılmaz", closedAt: ago(60), nocComment: "TT-2026-0401 raised, provider acknowledged", reviewedByAm: false },
        { id: "rnr-07", tab: "Test Request" as const, fields: f({ Customer: "Zain KSA", Destination: "Saudi Arabia", "Test Type": "MT SMS delivery test", Comment: "Need results ASAP" }), submittedBy: "Rania Al-Hassan", submittedAt: ago(35), status: "Open" as const },
        { id: "rnr-08", tab: "Test Request" as const, fields: f({ Customer: "Globe PH", Destination: "Philippines", "Test Type": "Voice call completion test", Comment: "" }), submittedBy: "James Carter", submittedAt: ago(150), status: "Test Successful" as const, closedBy: "Mehmet Kaya", closedAt: ago(110), nocComment: "All 10 test calls connected, avg duration 45s", reviewedByAm: true },
        { id: "rnr-09", tab: "Test Request" as const, fields: f({ Customer: "Reliance Jio", Destination: "India", "Test Type": "A2P SMS delivery test", Comment: "New route validation" }), submittedBy: "Priya Nair", submittedAt: ago(240), status: "Test Failed" as const, closedBy: "Ali Yılmaz", closedAt: ago(200), nocComment: "3/10 messages delivered, route not viable", reviewedByAm: false },
        { id: "rnr-10", tab: "Loss Accepted" as const, fields: f({ Customer: "Airtel India", Destination: "India", "Acceptable Loss Value": "5%", Comment: "Seasonal traffic spike" }), submittedBy: "Priya Nair", submittedAt: ago(15), status: "Open" as const },
        { id: "rnr-11", tab: "Loss Accepted" as const, fields: f({ Customer: "Claro Brazil", Destination: "Brazil", "Acceptable Loss Value": "12%", Comment: "" }), submittedBy: "Sarah Mitchell", submittedAt: ago(300), status: "Loss Not Accepted" as const, closedBy: "Ali Yılmaz", closedAt: ago(260), nocComment: "12% is above threshold, max 8% acceptable", reviewedByAm: false },
        { id: "rnr-12", tab: "Loss Accepted" as const, fields: f({ Customer: "Singtel", Destination: "Singapore", "Acceptable Loss Value": "3%", Comment: "Within tolerance" }), submittedBy: "James Carter", submittedAt: ago(180), status: "Loss Accepted" as const, closedBy: "Mehmet Kaya", closedAt: ago(150), nocComment: "3% within acceptable range, approved", reviewedByAm: true },
      ];
    })(),
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

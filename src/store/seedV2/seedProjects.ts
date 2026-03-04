import {
  Project,
  ProjectRiskLevel,
  ProjectRoleReport,
  ProjectSubmissionKey,
  ProjectWeeklyReport,
  User,
} from "../types";
import { SeedIdFactory } from "./ids";
import { SeedPrng } from "./prng";
import { ScenarioConfig } from "./scenarios";
import { addDaysToIso, weekStartMonday } from "./time";

function riskByIndex(value: number): ProjectRiskLevel {
  if (value % 3 === 0) return "High";
  if (value % 2 === 0) return "Medium";
  return "Low";
}

function roleReport(
  authorUserId: string,
  weekStartDate: string,
  seed: number,
  roleLabel: string,
  submitted: boolean,
): ProjectRoleReport | undefined {
  if (!submitted) return undefined;
  const updatedAt = addDaysToIso(`${weekStartDate}T09:00:00.000Z`, 4 + (seed % 2));
  return {
    authorUserId,
    achievements: [`${roleLabel} milestone ${seed + 1} delivered.`],
    inProgress: [`${roleLabel} stream preparing next sprint handoff.`],
    blockers: seed % 4 === 0 ? [`${roleLabel} waiting for partner approval.`] : [],
    decisionsRequired: seed % 5 === 0 ? [`${roleLabel} decision needed on scope variant B.`] : [],
    nextWeekFocus: [`${roleLabel} close remaining review items.`],
    attachments: [
      {
        label: `${roleLabel} notes`,
        url: `https://seed.local/projects/${seed + 1}/${weekStartDate}/${roleLabel.toLowerCase()}`,
      },
    ],
    submittedAt: updatedAt,
    updatedAt,
  };
}

export function seedProjects(params: {
  rng: SeedPrng;
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  users: User[];
  baseNowIso: string;
}): { projects: Project[]; projectWeeklyReports: ProjectWeeklyReport[] } {
  const { rng, idFactory, scenario, users, baseNowIso } = params;
  const projectCount = scenario.counts.projects;
  const weekCount = scenario.counts.projectWeeks;
  const salesPool = users.filter((user) => user.role === "Sales" || user.role === "Interconnection Manager");
  const technicalPool = users.filter((user) => user.role === "NOC" || user.role === "Head of SMS" || user.role === "Head of Voice");
  const productPool = users.filter((user) => user.role === "Interconnection Manager" || user.role === "Head of SMS");
  const managerPool = users;

  const projectNamePrefix = ["Signal", "Orbit", "Pulse", "Vector", "Nimbus", "Prism", "Astra", "Lattice"];
  const projectNameSuffix = ["Bridge", "Fabric", "Relay", "Core", "Matrix", "Flow", "Grid", "Hub"];

  const projects: Project[] = [];
  for (let idx = 0; idx < projectCount; idx += 1) {
    const owner = salesPool[idx % salesPool.length] ?? users[0];
    const managerOne = managerPool[(idx + 1) % managerPool.length] ?? owner;
    const managerTwo = managerPool[(idx + 3) % managerPool.length] ?? owner;
    const technicalResponsible = technicalPool[(idx + 2) % technicalPool.length] ?? managerOne;
    const salesResponsible = salesPool[(idx + 4) % salesPool.length] ?? owner;
    const productResponsible = productPool[(idx + 5) % productPool.length] ?? owner;
    const createdAt = addDaysToIso(baseNowIso, -(220 - idx * 14));
    const updatedAt = addDaysToIso(createdAt, 18 + (idx % 7));
    projects.push({
      id: idFactory.next("project"),
      name: `${projectNamePrefix[idx % projectNamePrefix.length]} ${projectNameSuffix[(idx * 2) % projectNameSuffix.length]} ${idx + 1}`,
      description: `Synthetic governance project ${idx + 1} for deterministic scenario coverage.`,
      ownerUserId: owner.id,
      managerUserIds: Array.from(new Set([owner.id, managerOne.id, managerTwo.id])),
      technicalResponsibleUserId: technicalResponsible.id,
      salesResponsibleUserId: salesResponsible.id,
      productResponsibleUserId: productResponsible.id,
      watcherUserIds: Array.from(new Set([owner.id, managerOne.id, managerTwo.id, technicalResponsible.id, salesResponsible.id, productResponsible.id])),
      status: idx % 5 === 4 ? "Completed" : idx % 4 === 3 ? "Paused" : "InProgress",
      strategicPriority: idx % 3 === 0 ? "High" : idx % 2 === 0 ? "Medium" : "Low",
      tags: idx % 2 === 0 ? ["Strategic"] : ["Execution"],
      createdAt,
      updatedAt,
    });
  }

  const reports: ProjectWeeklyReport[] = [];
  const thisWeek = weekStartMonday(baseNowIso);

  projects.forEach((project, projectIdx) => {
    for (let weekOffset = 0; weekOffset < weekCount; weekOffset += 1) {
      const weekStartDate = addDaysToIso(`${thisWeek}T00:00:00.000Z`, -weekOffset * 7).slice(0, 10);
      if (project.status === "Completed" && weekOffset < 2) continue;
      if (project.status === "Paused" && weekOffset === 0) continue;
      if (projectIdx === 1 && weekOffset === 0) continue; // guaranteed missing this week case.

      const createdAt = addDaysToIso(`${weekStartDate}T08:00:00.000Z`, 4);
      const updatedAt = addDaysToIso(createdAt, 0);
      const technicalSubmitted = !(projectIdx === 0 && weekOffset === 0);
      const salesSubmitted = !(projectIdx === 2 && weekOffset === 0);
      const productSubmitted = !(projectIdx === 3 && weekOffset === 0);
      const managerSubmitted = !(projectIdx === 4 && weekOffset === 0);
      const riskLevel = riskByIndex(projectIdx + weekOffset);
      const technical = roleReport(project.technicalResponsibleUserId, weekStartDate, projectIdx + weekOffset, "Technical", technicalSubmitted);
      const sales = roleReport(project.salesResponsibleUserId, weekStartDate, projectIdx + weekOffset + 7, "Sales", salesSubmitted);
      const product = roleReport(project.productResponsibleUserId, weekStartDate, projectIdx + weekOffset + 13, "Product", productSubmitted);

      const missingRoles: ProjectSubmissionKey[] = [];
      if (!technical?.submittedAt) missingRoles.push("technical");
      if (!sales?.submittedAt) missingRoles.push("sales");
      if (!product?.submittedAt) missingRoles.push("product");
      if (!managerSubmitted) missingRoles.push("manager");

      const managerUpdatedAt = addDaysToIso(`${weekStartDate}T17:00:00.000Z`, 4);
      const managerSummary = managerSubmitted
        ? {
            authorUserId: project.ownerUserId,
            executiveSummaryText:
              missingRoles.length > 0
                ? `Execution progressing with missing updates: ${missingRoles.join(", ")}.`
                : "Execution is steady with visible cross-team alignment.",
            riskLevel,
            blockers: riskLevel === "High" ? ["External dependency approval pending."] : [],
            decisionsRequired: riskLevel === "High" ? ["Leadership decision on partner rollout sequence."] : [],
            deckLinks: [
              {
                label: "Weekly deck",
                url: `https://seed.local/projects/${project.id}/${weekStartDate}/deck`,
              },
            ],
            submittedAt: managerUpdatedAt,
            updatedAt: managerUpdatedAt,
          }
        : undefined;

      const aiGeneratedAt = addDaysToIso(`${weekStartDate}T19:00:00.000Z`, 4);
      const aiSummary = weekOffset % 2 === 0
        ? {
            shortText:
              missingRoles.length === 0
                ? "Cross-functional summary available."
                : `Missing updates: ${missingRoles.join(", ")}.`,
            fullText:
              missingRoles.length === 0
                ? "AI summary synthesized all submitted sections."
                : `AI summary generated with partial data. Missing: ${missingRoles.join(", ")}.`,
            keyRisks: riskLevel === "High" ? ["Execution risk elevated this week."] : ["No material risk escalation."],
            keyBlockers: riskLevel === "High" ? ["Partner dependency remains unresolved."] : [],
            decisionsRequired: riskLevel === "High" ? ["Approve fallback delivery path."] : [],
            missingRoles,
            generatedAt: aiGeneratedAt,
            generatedByUserId: project.ownerUserId,
            coverage: {
              technicalSubmittedAt: technical?.submittedAt,
              salesSubmittedAt: sales?.submittedAt,
              productSubmittedAt: product?.submittedAt,
              managerSubmittedAt: managerSummary?.submittedAt,
            },
          }
        : undefined;

      reports.push({
        id: idFactory.next("projectWeeklyReport"),
        projectId: project.id,
        weekStartDate,
        roleReports: {
          technical,
          sales,
          product,
        },
        managerSummary,
        aiSummary,
        createdAt,
        updatedAt,
      });
    }
  });

  return {
    projects: projects.slice().sort((left, right) => left.id.localeCompare(right.id)),
    projectWeeklyReports: reports
      .slice()
      .sort((left, right) => left.weekStartDate.localeCompare(right.weekStartDate) || left.id.localeCompare(right.id)),
  };
}

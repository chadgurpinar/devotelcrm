import { Company, InterconnectionProcess, InterconnectionStage, InterconnectionTrack, User } from "../types";
import { SeedIdFactory } from "./ids";
import { ScenarioConfig } from "./scenarios";
import { SeedPrng } from "./prng";
import { addDaysToIso } from "./time";

export interface SeedInterconnectionResult {
  companies: Company[];
  interconnectionProcesses: InterconnectionProcess[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundedCount(total: number, ratio: number): number {
  return clamp(Math.round(total * ratio), 0, total);
}

function stageProgressionFor(stage: InterconnectionStage): InterconnectionStage[] {
  const flow: InterconnectionStage[] = ["NDA", "Contract", "Technical", "AM_Assigned", "Completed"];
  if (stage === "Failed") return ["NDA", "Contract", "Failed"];
  const idx = flow.indexOf(stage);
  if (idx < 0) return ["NDA"];
  return flow.slice(0, idx + 1);
}

function alignWorkscopeWithTracks(company: Company, tracks: InterconnectionTrack[]): Company {
  if (tracks.length === 0) return company;
  let workscope: Company["workscope"];
  if (tracks.includes("SMS") && tracks.includes("Voice")) {
    workscope = ["SMS", "Voice"];
  } else if (tracks.includes("SMS")) {
    workscope = ["SMS"];
  } else {
    workscope = ["Voice"];
  }
  return {
    ...company,
    workscope,
  };
}

export function seedInterconnection(params: {
  rng: SeedPrng;
  idFactory: SeedIdFactory;
  scenario: ScenarioConfig;
  users: User[];
  companies: Company[];
  baseNowIso: string;
}): SeedInterconnectionResult {
  const { rng, idFactory, scenario, users, companies, baseNowIso } = params;
  const shuffled = rng.shuffle(companies);
  const total = companies.length;
  const leadTarget = roundedCount(total, scenario.distributions.leadRatio);
  const interconnectionTarget = roundedCount(total, scenario.distributions.interconnectionRatio);
  const clientTarget = clamp(total - leadTarget - interconnectionTarget, 0, total);
  const interconnectionManagerId = users.find((user) => user.role === "Interconnection Manager")?.id ?? users[0]?.id ?? "u1";
  const salesUsers = users.filter((user) => user.role === "Sales");

  const leads = shuffled.slice(0, leadTarget);
  const interconnections = shuffled.slice(leadTarget, leadTarget + interconnectionTarget);
  const clients = shuffled.slice(leadTarget + interconnectionTarget, leadTarget + interconnectionTarget + clientTarget);

  const processRows: InterconnectionProcess[] = [];
  const companyById = new Map<string, Company>(companies.map((row) => [row.id, row]));

  const pushProcess = (
    company: Company,
    track: InterconnectionTrack,
    stage: InterconnectionStage,
    startedAt: string,
    updatedAt: string,
  ) => {
    const ownerUserId = company.ownerUserId || interconnectionManagerId;
    const sequence = stageProgressionFor(stage);
    const stageHistory = sequence.map((entry, idx) => ({
      at: addDaysToIso(startedAt, idx * 3),
      stage: entry,
      byUserId: ownerUserId,
    }));
    processRows.push({
      id: idFactory.next("interconnectionProcess"),
      companyId: company.id,
      track,
      stage,
      stageHistory,
      startedAt,
      completedAt: stage === "Completed" ? updatedAt : undefined,
      updatedAt,
      ownerUserId,
    });
  };

  interconnections.forEach((company, idx) => {
    const startedAt = addDaysToIso(baseNowIso, -(90 + idx * 2));
    const updatedAt = addDaysToIso(startedAt, 14 + (idx % 9));
    const primaryTrack: InterconnectionTrack = idx % 2 === 0 ? "SMS" : "Voice";
    const stages: InterconnectionStage[] = ["NDA", "Contract", "Technical", "AM_Assigned", "Failed"];
    const stage = stages[idx % stages.length];
    pushProcess(company, primaryTrack, stage, startedAt, updatedAt);
    if (idx % 4 === 0) {
      const secondaryTrack: InterconnectionTrack = primaryTrack === "SMS" ? "Voice" : "SMS";
      const secondaryStage: InterconnectionStage = idx % 8 === 0 ? "Contract" : "NDA";
      pushProcess(company, secondaryTrack, secondaryStage, addDaysToIso(startedAt, 1), addDaysToIso(updatedAt, 1));
    }
  });

  clients.forEach((company, idx) => {
    const startedAt = addDaysToIso(baseNowIso, -(180 + idx * 3));
    const completedAt = addDaysToIso(startedAt, 30 + (idx % 8));
    const smsCompleted = idx % 2 === 0 || idx % 5 === 0;
    const voiceCompleted = idx % 3 === 0;
    const smsStage: InterconnectionStage = smsCompleted ? "Completed" : "Technical";
    const voiceStage: InterconnectionStage = voiceCompleted ? "Completed" : "Contract";
    pushProcess(company, "SMS", smsStage, startedAt, completedAt);
    pushProcess(company, "Voice", voiceStage, addDaysToIso(startedAt, 1), addDaysToIso(completedAt, 1));
  });

  const processByCompany = new Map<string, InterconnectionProcess[]>();
  processRows.forEach((process) => {
    const list = processByCompany.get(process.companyId) ?? [];
    list.push(process);
    processByCompany.set(process.companyId, list);
  });

  const leadRejectedTarget = roundedCount(leads.length, scenario.distributions.rejectedWithinLeadRatio);
  const rejectedLeadIds = new Set(rng.shuffle(leads).slice(0, leadRejectedTarget).map((entry) => entry.id));
  const onHoldLeadIds = new Set(rng.shuffle(leads).slice(leadRejectedTarget, leadRejectedTarget + Math.max(1, Math.floor(leads.length * 0.12))).map((entry) => entry.id));

  const normalizedCompanies = companies
    .map((company) => {
      const related = processByCompany.get(company.id) ?? [];
      const hasCompleted = related.some((process) => process.stage === "Completed");
      const hasProcess = related.length > 0;
      const tracks = Array.from(new Set(related.map((process) => process.track)));
      const aligned = alignWorkscopeWithTracks(company, tracks);
      const derivedStatus: Company["companyStatus"] = hasCompleted ? "CLIENT" : hasProcess ? "INTERCONNECTION" : "LEAD";
      const ownerUserId = aligned.ownerUserId || salesUsers[0]?.id || users[0]?.id || "u1";
      const watcherUserIds = Array.from(new Set([...(aligned.watcherUserIds ?? []), ownerUserId]));
      const leadDisposition: Company["leadDisposition"] =
        derivedStatus !== "LEAD"
          ? "Open"
          : rejectedLeadIds.has(aligned.id)
            ? "Rejected"
            : onHoldLeadIds.has(aligned.id)
              ? "OnHold"
              : "Open";
      const movedToInterconnectionAt =
        derivedStatus === "LEAD"
          ? undefined
          : aligned.movedToInterconnectionAt ?? related.slice().sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0]?.startedAt;
      const becameClientAt =
        derivedStatus === "CLIENT"
          ? aligned.becameClientAt ??
            related
              .filter((process) => process.stage === "Completed")
              .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0]?.updatedAt
          : undefined;
      return {
        ...aligned,
        ownerUserId,
        watcherUserIds,
        companyStatus: derivedStatus,
        leadDisposition,
        movedToInterconnectionAt,
        becameClientAt,
        internalAmUserId: derivedStatus === "LEAD" ? undefined : interconnectionManagerId,
        counterpartyAmName: derivedStatus === "CLIENT" ? `Counterparty AM ${aligned.id.slice(-4)}` : undefined,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  const stableProcesses = processRows.slice().sort((left, right) => left.id.localeCompare(right.id));
  // Keep map in sync for downstream modules that may rely on updated company status.
  normalizedCompanies.forEach((company) => companyById.set(company.id, company));

  return {
    companies: normalizedCompanies,
    interconnectionProcesses: stableProcesses,
  };
}

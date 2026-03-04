import { SeedTimeAnchor, DEFAULT_TIME_ANCHOR } from "./time";

export type SeedScenarioId =
  | "SCENARIO_FULL"
  | "SCENARIO_HR_ORG_DEEP"
  | "SCENARIO_EVENTS_HEAVY"
  | "SCENARIO_CRM_PIPELINE"
  | "SCENARIO_OPS_SLA"
  | "SCENARIO_PROJECTS_GOV"
  | "SCENARIO_CONTRACTS";

export interface SeedCountConfig {
  users: number;
  events: number;
  companies: number;
  contacts: number;
  eventStaffPerEvent: number;
  primaryEventMeetings: number;
  otherEventMeetingsMin: number;
  otherEventMeetingsMax: number;
  tasks: number;
  projects: number;
  projectWeeks: number;
  hrDepartments: number;
  hrEmployees: number;
  hrLeaveRequests: number;
  hrAssets: number;
  hrSoftwareLicenses: number;
  hrExpenses: number;
  opsSignals: number;
  opsCases: number;
  opsRequests: number;
  opsShifts: number;
}

export interface SeedDistributionConfig {
  leadRatio: number;
  interconnectionRatio: number;
  clientRatio: number;
  rejectedWithinLeadRatio: number;
  ourEntityWeights: {
    UK: number;
    TR: number;
    USA: number;
  };
}

export interface SeedConstraintConfig {
  primaryEventNotesCoverageMin: number;
  eventsHeavyHotSlotMinMeetings: number;
  hrOrgMaxRoots: number;
  hrOrgMinLevels: number;
  requirePrimaryEventCoverageCheck: boolean;
}

export interface SeedToggleConfig {
  enforceGlobalUniqueKeyContacts: boolean;
  forceDeepHrOrg: boolean;
  forceEventsHeavyDensity: boolean;
  forceOpsBreaches: boolean;
  forceContractsRichFiles: boolean;
}

export interface PrimaryEventConfig {
  name: string;
  city: string;
  venue: string;
  startDate: string;
  endDate: string;
}

export interface ScenarioConfig {
  scenarioId: SeedScenarioId;
  counts: SeedCountConfig;
  distributions: SeedDistributionConfig;
  constraints: SeedConstraintConfig;
  toggles: SeedToggleConfig;
  timeAnchor: SeedTimeAnchor;
  primaryEvent: PrimaryEventConfig;
}

const BASE_COUNTS: SeedCountConfig = {
  users: 10,
  events: 30,
  companies: 60,
  contacts: 80,
  eventStaffPerEvent: 10,
  primaryEventMeetings: 140,
  otherEventMeetingsMin: 44,
  otherEventMeetingsMax: 62,
  tasks: 54,
  projects: 5,
  projectWeeks: 7,
  hrDepartments: 8,
  hrEmployees: 72,
  hrLeaveRequests: 54,
  hrAssets: 96,
  hrSoftwareLicenses: 84,
  hrExpenses: 70,
  opsSignals: 30,
  opsCases: 22,
  opsRequests: 24,
  opsShifts: 9,
};

const BASE_DISTRIBUTIONS: SeedDistributionConfig = {
  leadRatio: 0.55,
  interconnectionRatio: 0.25,
  clientRatio: 0.2,
  rejectedWithinLeadRatio: 0.15,
  ourEntityWeights: {
    UK: 50,
    TR: 30,
    USA: 20,
  },
};

const BASE_CONSTRAINTS: SeedConstraintConfig = {
  primaryEventNotesCoverageMin: 0.8,
  eventsHeavyHotSlotMinMeetings: 8,
  hrOrgMaxRoots: 2,
  hrOrgMinLevels: 4,
  requirePrimaryEventCoverageCheck: true,
};

const BASE_TOGGLES: SeedToggleConfig = {
  enforceGlobalUniqueKeyContacts: true,
  forceDeepHrOrg: false,
  forceEventsHeavyDensity: false,
  forceOpsBreaches: false,
  forceContractsRichFiles: false,
};

const PRIMARY_EVENT: PrimaryEventConfig = {
  name: "MWC Barcelona 2026",
  city: "Barcelona",
  venue: "Fira Gran Via",
  startDate: DEFAULT_TIME_ANCHOR.primaryEventStartDate,
  endDate: DEFAULT_TIME_ANCHOR.primaryEventEndDate,
};

type ScenarioOverrides = {
  scenarioId: SeedScenarioId;
  counts?: Partial<SeedCountConfig>;
  distributions?: Partial<Omit<SeedDistributionConfig, "ourEntityWeights">> & {
    ourEntityWeights?: Partial<SeedDistributionConfig["ourEntityWeights"]>;
  };
  constraints?: Partial<SeedConstraintConfig>;
  toggles?: Partial<SeedToggleConfig>;
  timeAnchor?: Partial<SeedTimeAnchor>;
  primaryEvent?: Partial<PrimaryEventConfig>;
};

function buildScenario(overrides: ScenarioOverrides): ScenarioConfig {
  return {
    scenarioId: overrides.scenarioId,
    counts: {
      ...BASE_COUNTS,
      ...overrides.counts,
    },
    distributions: {
      ...BASE_DISTRIBUTIONS,
      ...overrides.distributions,
      ourEntityWeights: {
        ...BASE_DISTRIBUTIONS.ourEntityWeights,
        ...(overrides.distributions?.ourEntityWeights ?? {}),
      },
    },
    constraints: {
      ...BASE_CONSTRAINTS,
      ...overrides.constraints,
    },
    toggles: {
      ...BASE_TOGGLES,
      ...overrides.toggles,
    },
    timeAnchor: {
      ...DEFAULT_TIME_ANCHOR,
      ...overrides.timeAnchor,
    },
    primaryEvent: {
      ...PRIMARY_EVENT,
      ...overrides.primaryEvent,
    },
  };
}

export const SCENARIO_PRESETS: Record<SeedScenarioId, ScenarioConfig> = {
  SCENARIO_FULL: buildScenario({
    scenarioId: "SCENARIO_FULL",
    toggles: {
      forceDeepHrOrg: true,
    },
  }),
  SCENARIO_HR_ORG_DEEP: buildScenario({
    scenarioId: "SCENARIO_HR_ORG_DEEP",
    counts: {
      hrEmployees: 96,
    },
    toggles: {
      forceDeepHrOrg: true,
    },
  }),
  SCENARIO_EVENTS_HEAVY: buildScenario({
    scenarioId: "SCENARIO_EVENTS_HEAVY",
    counts: {
      primaryEventMeetings: 260,
      otherEventMeetingsMin: 52,
      otherEventMeetingsMax: 76,
    },
    constraints: {
      primaryEventNotesCoverageMin: 0.85,
      eventsHeavyHotSlotMinMeetings: 8,
    },
    toggles: {
      forceEventsHeavyDensity: true,
    },
  }),
  SCENARIO_CRM_PIPELINE: buildScenario({
    scenarioId: "SCENARIO_CRM_PIPELINE",
    distributions: {
      leadRatio: 0.6,
      interconnectionRatio: 0.25,
      clientRatio: 0.15,
      rejectedWithinLeadRatio: 0.2,
    },
  }),
  SCENARIO_OPS_SLA: buildScenario({
    scenarioId: "SCENARIO_OPS_SLA",
    counts: {
      opsSignals: 44,
      opsCases: 30,
      opsRequests: 36,
    },
    toggles: {
      forceOpsBreaches: true,
    },
  }),
  SCENARIO_PROJECTS_GOV: buildScenario({
    scenarioId: "SCENARIO_PROJECTS_GOV",
    counts: {
      projects: 5,
      projectWeeks: 8,
    },
  }),
  SCENARIO_CONTRACTS: buildScenario({
    scenarioId: "SCENARIO_CONTRACTS",
    toggles: {
      forceContractsRichFiles: true,
    },
  }),
};

export const DEFAULT_SEED_KEY = "seed-v2-default";
export const DEFAULT_SCENARIO_CONFIG: ScenarioConfig = SCENARIO_PRESETS.SCENARIO_FULL;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function resolveScenarioConfig(config?: Partial<ScenarioConfig>): ScenarioConfig {
  if (!config) return deepClone(DEFAULT_SCENARIO_CONFIG);
  const scenarioId = config.scenarioId ?? DEFAULT_SCENARIO_CONFIG.scenarioId;
  const preset = SCENARIO_PRESETS[scenarioId];
  return buildScenario({
    scenarioId,
    counts: {
      ...preset.counts,
      ...(config.counts ?? {}),
    },
    distributions: {
      ...preset.distributions,
      ...(config.distributions ?? {}),
      ourEntityWeights: {
        ...preset.distributions.ourEntityWeights,
        ...(config.distributions?.ourEntityWeights ?? {}),
      },
    },
    constraints: {
      ...preset.constraints,
      ...(config.constraints ?? {}),
    },
    toggles: {
      ...preset.toggles,
      ...(config.toggles ?? {}),
    },
    primaryEvent: {
      ...preset.primaryEvent,
      ...(config.primaryEvent ?? {}),
    },
    timeAnchor: {
      ...preset.timeAnchor,
      ...(config.timeAnchor ?? {}),
    },
  });
}

import { DbState } from "./types";
import {
  DEFAULT_SCENARIO_CONFIG,
  DEFAULT_SEED_KEY,
  generateSeedDb,
} from "./seedV2/generateSeedDb";
import { ScenarioConfig } from "./seedV2/scenarios";

export { generateSeedDb, DEFAULT_SEED_KEY, DEFAULT_SCENARIO_CONFIG };
export type { ScenarioConfig };

export function createSeedDb(): DbState {
  return generateSeedDb(DEFAULT_SEED_KEY, DEFAULT_SCENARIO_CONFIG);
}

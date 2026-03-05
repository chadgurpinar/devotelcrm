import {
  OpsCaseCategory,
  OpsMonitoringModuleOrigin,
  OpsMonitoringSignalInput,
  OpsSeverity,
  OpsTrack,
  TrafficAdapter,
} from "../../store/types";

function moduleCategory(moduleOrigin: OpsMonitoringModuleOrigin): OpsCaseCategory {
  if (moduleOrigin === "PROVIDER_ISSUES") return "PROVIDER_ISSUE";
  if (moduleOrigin === "LOSSES") return "LOSSES";
  if (moduleOrigin === "NEW_AND_LOST_TRAFFICS") return "NEW_LOST_TRAFFIC";
  if (moduleOrigin === "TRAFFIC_COMPARISON") return "TRAFFIC_COMPARISON";
  if (moduleOrigin === "SCHEDULE_TEST_RESULTS") return "SCHEDULE_TEST_RESULT";
  return "FAILED_SMS_CALL";
}

function buildSignal(moduleOrigin: OpsMonitoringModuleOrigin, track: OpsTrack, idx: number, seedOffset: number): OpsMonitoringSignalInput {
  const destinations = ["United Kingdom", "Spain", "Germany", "Turkey", "UAE", "France"];
  const providers = ["Vodafone", "Orange", "Telefonica", "Turkcell", "Etisalat", "TIM"];
  const customers = ["NovaTel", "Galaxy Comm", "BlueSignal", "Astra Comms", "Metro Link"];
  const now = Date.now();
  const severity: OpsSeverity = idx % 5 === 0 ? "URGENT" : idx % 2 === 0 ? "HIGH" : "MEDIUM";
  const destination = destinations[(idx + seedOffset) % destinations.length];
  const providerName = providers[(idx + seedOffset * 2) % providers.length];
  const customerName = customers[(idx + seedOffset * 3) % customers.length];
  const detectedAt = new Date(now - (idx + 1) * 11 * 60 * 1000).toISOString();
  const category = moduleCategory(moduleOrigin);
  const base = {
    moduleOrigin,
    track,
    relatedTrack: track,
    severity,
    category,
    detectedAt,
    fingerprint: `${moduleOrigin}-${track}-${destination}-${providerName}-${idx % 4}`,
    relatedProvider: providerName,
    relatedDestination: destination,
    relatedCompanyId: undefined,
    description: `${moduleOrigin.replace(/_/g, " ")} detected for ${destination}/${providerName} on ${track}.`,
    rawPayload: {
      source: "demoTrafficAdapter",
      signalOrdinal: idx + 1,
      sampleWindowMinutes: 15,
    },
  } as const;

  if (category === "PROVIDER_ISSUE") {
    return {
      ...base,
      metadata: {
        providerName,
        smsCount: track === "SMS" ? 2000 + idx * 20 : undefined,
        callCount: track === "VOICE" ? 1500 + idx * 10 : undefined,
        dlrValue: track === "SMS" ? 88 - (idx % 12) : undefined,
        asrValue: track === "VOICE" ? 72 - (idx % 15) : undefined,
        alertTime: detectedAt,
      },
    };
  }

  if (category === "LOSSES") {
    return {
      ...base,
      metadata: {
        customerName,
        destination,
        lossAmount: 500 + idx * 25,
        alertTime: detectedAt,
      },
    };
  }

  if (category === "NEW_LOST_TRAFFIC") {
    return {
      ...base,
      metadata: {
        customerName,
        destination,
        attemptCount: 800 + idx * 12,
        alertTime: detectedAt,
      },
    };
  }

  if (category === "TRAFFIC_COMPARISON") {
    return {
      ...base,
      metadata: {
        comparisonType: idx % 2 === 0 ? "DECREASE" : "INCREASE",
        comparisonPercentage: 12 + (idx % 14),
        alertTime: detectedAt,
      },
    };
  }

  if (category === "SCHEDULE_TEST_RESULT") {
    return {
      ...base,
      metadata: {
        providerName,
        destination,
        testResult: idx % 2 === 0 ? "FAILED" : "DELAYED",
        testToolName: track === "SMS" ? "TELQ" : "ARPTEL",
        alertTime: detectedAt,
      },
    };
  }

  return {
    ...base,
    metadata: {
      customerName,
      destination,
      attemptCount: 350 + idx * 9,
      alertTime: detectedAt,
    },
  };
}

function buildSignals(moduleOrigin: OpsMonitoringModuleOrigin, track: OpsTrack, amount: number, seedOffset: number): OpsMonitoringSignalInput[] {
  return Array.from({ length: amount }).map((_, idx) => buildSignal(moduleOrigin, track, idx, seedOffset));
}

export function createDemoTrafficAdapter(defaultTrack: OpsTrack = "SMS"): TrafficAdapter {
  return {
    async fetchProviderIssues() {
      return buildSignals("PROVIDER_ISSUES", defaultTrack, 4, 1);
    },
    async fetchLossAlerts() {
      return buildSignals("LOSSES", defaultTrack, 5, 2);
    },
    async fetchTrafficComparison() {
      return [...buildSignals("TRAFFIC_COMPARISON", defaultTrack, 3, 3), ...buildSignals("NEW_AND_LOST_TRAFFICS", defaultTrack, 2, 4)];
    },
    async fetchTestResults() {
      return [...buildSignals("SCHEDULE_TEST_RESULTS", defaultTrack, 2, 5), ...buildSignals("FAILED_SMS_OR_CALL_ANALYSIS", defaultTrack, 2, 6)];
    },
  };
}

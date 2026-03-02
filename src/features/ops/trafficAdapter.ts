import { OpsCaseCategory, OpsMonitoringModuleOrigin, OpsMonitoringSignalInput, OpsSeverity, OpsTrack, TrafficAdapter } from "../../store/types";

function moduleCategory(moduleOrigin: OpsMonitoringModuleOrigin): OpsCaseCategory {
  if (moduleOrigin === "Losses") return "Loss";
  if (moduleOrigin === "ProviderIssues") return "Provider";
  if (moduleOrigin === "TrafficComparison" || moduleOrigin === "NewAndLostTraffics") return "Traffic";
  if (moduleOrigin === "ScheduleTestResults") return "Test";
  if (moduleOrigin === "FailedSmsOrCallAnalysis") return "KPI";
  return "Other";
}

function buildSignals(moduleOrigin: OpsMonitoringModuleOrigin, track: OpsTrack, amount: number, seedOffset: number): OpsMonitoringSignalInput[] {
  const countries = ["United Kingdom", "Spain", "Germany", "Turkey", "UAE", "France"];
  const providers = ["Vodafone", "Orange", "Telefonica", "Turkcell", "Etisalat", "TIM"];
  const now = Date.now();
  return Array.from({ length: amount }).map((_, idx) => {
    const severity: OpsSeverity = idx % 5 === 0 ? "Urgent" : idx % 2 === 0 ? "High" : "Medium";
    const country = countries[(idx + seedOffset) % countries.length];
    const provider = providers[(idx + seedOffset * 2) % providers.length];
    const detectedAt = new Date(now - (idx + 1) * 11 * 60 * 1000).toISOString();
    return {
      moduleOrigin,
      relatedTrack: track,
      severity,
      category: moduleCategory(moduleOrigin),
      detectedAt,
      fingerprint: `${moduleOrigin}-${track}-${country}-${provider}-${idx % 4}`,
      relatedProvider: provider,
      relatedDestination: country,
      description: `${moduleOrigin} detected for ${country}/${provider} on ${track}.`,
      rawPayload: {
        source: "demoTrafficAdapter",
        signalOrdinal: idx + 1,
        sampleWindowMinutes: 15,
      },
    };
  });
}

export function createDemoTrafficAdapter(defaultTrack: OpsTrack = "SMS"): TrafficAdapter {
  return {
    async fetchProviderIssues() {
      return buildSignals("ProviderIssues", defaultTrack, 4, 1);
    },
    async fetchLossAlerts() {
      return buildSignals("Losses", defaultTrack, 5, 2);
    },
    async fetchTrafficComparison() {
      return [
        ...buildSignals("TrafficComparison", defaultTrack, 3, 3),
        ...buildSignals("NewAndLostTraffics", defaultTrack, 2, 4),
      ];
    },
    async fetchTestResults() {
      return [
        ...buildSignals("ScheduleTestResults", defaultTrack, 2, 5),
        ...buildSignals("FailedSmsOrCallAnalysis", defaultTrack, 2, 6),
      ];
    },
  };
}

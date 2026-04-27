import type { TrafficAlertEvent, TrafficAlertRule, TrafficBaseline } from "../types";

/** Deterministic seed for Traffic Intelligence v3 alerting / baselines scaffolding. */
export function seedTrafficIntelV3(baseNowIso: string): {
  trafficBaselines: TrafficBaseline[];
  trafficAlertRules: TrafficAlertRule[];
  trafficAlertEvents: TrafficAlertEvent[];
} {
  const trafficBaselines: TrafficBaseline[] = [];

  const trafficAlertRules: TrafficAlertRule[] = [
    {
      id: "tar-op-dlr",
      name: "Operator DLR floor",
      enabled: true,
      metric: "dlr",
      compareOp: "lt",
      threshold: 0.95,
      dimension: "operator",
      minSubmit: 30_000,
      createdAt: baseNowIso,
    },
    {
      id: "tar-prov-dlr",
      name: "Provider DLR critical",
      enabled: true,
      metric: "dlr",
      compareOp: "lt",
      threshold: 0.9,
      dimension: "sourceAccount",
      minSubmit: 50_000,
      createdAt: baseNowIso,
    },
  ];

  const trafficAlertEvents: TrafficAlertEvent[] = [
    {
      id: "tae-1",
      ruleId: "tar-op-dlr",
      severity: "warning",
      title: "Operator DLR watch",
      detail: "One or more operators in the current seed window may approach the DLR floor under heavy Generated traffic — review routing tables.",
      operator: "MTN",
      dedupeKey: "tar-op-dlr|seed|mtn",
      read: false,
      dismissed: false,
      createdAt: baseNowIso,
    },
    {
      id: "tae-2",
      ruleId: "tar-prov-dlr",
      severity: "info",
      title: "Provider quality check",
      detail: "Run evaluation after loading live MDRs to populate actionable alerts. Seeded example references provider concentration.",
      sourceAccount: "RouteHub",
      dedupeKey: "tar-prov-dlr|seed|routehub",
      read: true,
      dismissed: false,
      createdAt: baseNowIso,
    },
  ];

  return { trafficBaselines, trafficAlertRules, trafficAlertEvents };
}

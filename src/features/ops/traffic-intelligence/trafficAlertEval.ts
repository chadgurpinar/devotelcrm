import type { TrafficAlertEvent, TrafficAlertRule, WholesaleTrafficRecord } from "../../../store/types";
import { recordProfit } from "./trafficUtils";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function aggregateDlr(
  records: WholesaleTrafficRecord[],
  dimension: TrafficAlertRule["dimension"],
): Map<string, { submit: number; del: number }> {
  const m = new Map<string, { submit: number; del: number }>();
  for (const r of records) {
    const key =
      dimension === "global"
        ? "__all__"
        : dimension === "sourceAccount"
          ? r.sourceAccount
          : r.operator;
    const cur = m.get(key) ?? { submit: 0, del: 0 };
    cur.submit += r.submitCount;
    cur.del += r.deliveryCount;
    m.set(key, cur);
  }
  return m;
}

/** Hourly volume by provider for spike heuristic. */
function hourlyProviderBuckets(records: WholesaleTrafficRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of records) {
    const hour = new Date(r.timestamp).toISOString().slice(0, 13);
    const k = `${r.sourceAccount}|${hour}`;
    m.set(k, (m.get(k) ?? 0) + r.submitCount);
  }
  return m;
}

/**
 * Evaluates enabled rules against full record set. Returns new events (caller merges).
 * Dedupes by stable key ruleId+scope so re-runs do not spam.
 */
export function evaluateTrafficAlerts(
  records: WholesaleTrafficRecord[],
  rules: TrafficAlertRule[],
  existingDedupeKeys: Set<string>,
): TrafficAlertEvent[] {
  const now = new Date().toISOString();
  const out: TrafficAlertEvent[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.metric === "dlr" && rule.compareOp === "lt") {
      const agg = aggregateDlr(records, rule.dimension);
      for (const [key, v] of agg) {
        if (v.submit < rule.minSubmit) continue;
        const dlr = v.submit > 0 ? v.del / v.submit : 1;
        if (dlr >= rule.threshold) continue;
        const dedupeKey = `${rule.id}|dlr|${key}`;
        if (existingDedupeKeys.has(dedupeKey)) continue;
        existingDedupeKeys.add(dedupeKey);
        const title =
          rule.dimension === "operator"
            ? `DLR below ${(rule.threshold * 100).toFixed(0)}%: ${key}`
            : rule.dimension === "sourceAccount"
              ? `Provider DLR soft: ${key}`
              : `Global DLR below ${(rule.threshold * 100).toFixed(0)}%`;
        out.push({
          id: uid("tae"),
          ruleId: rule.id,
          severity: dlr < rule.threshold * 0.9 ? "critical" : "warning",
          title,
          detail: `Submit ${v.submit.toLocaleString()}, DLR ${(dlr * 100).toFixed(2)}%.`,
          ...(rule.dimension === "operator" ? { operator: key === "__all__" ? undefined : key } : {}),
          ...(rule.dimension === "sourceAccount" ? { sourceAccount: key === "__all__" ? undefined : key } : {}),
          dedupeKey,
          read: false,
          dismissed: false,
          createdAt: now,
        });
      }
    }

    if (rule.metric === "volume_spike" && rule.compareOp === "gt") {
      const hv = hourlyProviderBuckets(records);
      const byProvider = new Map<string, number[]>();
      for (const [k, vol] of hv) {
        const prov = k.split("|")[0] ?? "";
        const arr = byProvider.get(prov) ?? [];
        arr.push(vol);
        byProvider.set(prov, arr);
      }
      for (const [prov, vals] of byProvider) {
        if (vals.length < 8) continue;
        const sorted = [...vals].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
        if (median <= 0) continue;
        const peak = Math.max(...vals);
        if (peak < median * rule.threshold) continue;
        const dedupeKey = `${rule.id}|spike|${prov}`;
        if (existingDedupeKeys.has(dedupeKey)) continue;
        existingDedupeKeys.add(dedupeKey);
        out.push({
          id: uid("tae"),
          ruleId: rule.id,
          severity: "warning",
          title: `Volume spike pattern: ${prov}`,
          detail: `Peak hourly bucket ~${(peak / median).toFixed(1)}x median hourly volume for this provider in-window.`,
          sourceAccount: prov,
          dedupeKey,
          read: false,
          dismissed: false,
          createdAt: now,
        });
      }
    }
  }

  return out;
}

export function collectAlertDedupeKeys(events: TrafficAlertEvent[]): Set<string> {
  const s = new Set<string>();
  for (const e of events) {
    if (e.dedupeKey) s.add(e.dedupeKey);
  }
  return s;
}

/** Profit concentration: top provider share of total profit. */
export function topProviderProfitShare(records: WholesaleTrafficRecord[]): { name: string; share: number } | null {
  const m = new Map<string, number>();
  let total = 0;
  for (const r of records) {
    const p = recordProfit(r);
    m.set(r.sourceAccount, (m.get(r.sourceAccount) ?? 0) + p);
    total += p;
  }
  if (total <= 0) return null;
  let best = "";
  let bestV = -Infinity;
  for (const [n, v] of m) {
    if (v > bestV) {
      bestV = v;
      best = n;
    }
  }
  return { name: best, share: bestV / total };
}

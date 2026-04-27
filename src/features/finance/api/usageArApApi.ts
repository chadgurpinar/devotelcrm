import type { FinUsageArApPosition, FinUsageTrack, OurEntity } from "../../../store/types";

export interface UsageArApFilters {
  counterpartyId: string;
  entityId?: OurEntity;
  track?: FinUsageTrack;
  /** Optional override; defaults to a 30-day window ending today. */
  periodFrom?: string;
  periodTo?: string;
}

function ymdNDaysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Mocked panel API. Returns deterministic positions per counterparty. Replace with a real fetch later. */
export async function fetchUsageArApPositions(filters: UsageArApFilters): Promise<FinUsageArApPosition[]> {
  await new Promise((r) => setTimeout(r, 250));

  const today = new Date().toISOString().slice(0, 10);
  const periodFrom = filters.periodFrom ?? ymdNDaysAgo(30);
  const periodTo = filters.periodTo ?? today;
  const seed = hash(`${filters.counterpartyId}|${periodFrom}|${periodTo}`);
  const entities: OurEntity[] = filters.entityId ? [filters.entityId] : ["USA", "UK", "TR"];
  const tracks: FinUsageTrack[] = filters.track ? [filters.track] : ["SMS", "Voice"];

  const out: FinUsageArApPosition[] = [];
  let i = 0;
  for (const entityId of entities) {
    for (const track of tracks) {
      i++;
      const direction = (seed + i) % 2 === 0 ? "Receivable" : "Payable";
      const volume = 50_000 + ((seed + i * 1009) % 500_000);
      const unit = track === "SMS" ? 0.0085 : 0.012;
      const amount = Math.round(volume * unit * 100) / 100;
      out.push({
        id: `usage-${filters.counterpartyId}-${entityId}-${track}-${i}`,
        counterpartyId: filters.counterpartyId,
        entityId,
        track,
        direction,
        periodFrom,
        periodTo,
        volume,
        amount,
        currency: entityId === "USA" ? "USD" : entityId === "UK" ? "GBP" : "TRY",
        status: i % 3 === 0 ? "Confirmed" : "Provisional",
        fetchedAt: new Date().toISOString(),
      });
    }
  }
  return out;
}

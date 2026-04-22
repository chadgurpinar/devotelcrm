import type { SeedPrng } from "./prng";
import type { TrafficSourceType, WholesaleTrafficRecord, WholesaleTrafficType } from "../types";

const REGIONS: Array<{ country: string; operator: string; dlrBias: number }> = [
  { country: "Vietnam", operator: "Viettel Group", dlrBias: 0.01 },
  { country: "Indonesia", operator: "Telkomsel", dlrBias: 0 },
  { country: "Thailand", operator: "AIS Mobile", dlrBias: -0.005 },
  { country: "France", operator: "Orange SA", dlrBias: 0.008 },
  { country: "Nigeria", operator: "MTN", dlrBias: -0.012 },
  { country: "Turkey", operator: "Turkcell", dlrBias: 0.002 },
  { country: "Brazil", operator: "Claro", dlrBias: -0.008 },
  { country: "India", operator: "Airtel", dlrBias: 0.003 },
];

const SOURCE_ACCOUNTS = ["RouteHub", "SMSGlobal", "DirectConnect", "HubNode", "CloudSMS", "PeerLink"] as const;
const DEST_ACCOUNTS = ["MegaCorp", "TechFlow", "DataPulse", "NetBridge", "SignalPro", "OmniReach"] as const;

function pickSourceType(rng: SeedPrng): TrafficSourceType {
  const r = rng.next();
  if (r < 0.4) return "Facebook";
  if (r < 0.7) return "TikTok";
  if (r < 0.9) return "WhatsApp";
  return "Other";
}

function pickTrafficType(rng: SeedPrng): WholesaleTrafficType {
  return rng.next() < 0.6 ? "Direct" : "Generated";
}

function randomSenderId(rng: SeedPrng): string {
  const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 10; i += 1) {
    s += chars[rng.int(0, chars.length - 1)];
  }
  return s;
}

function pricingForSource(
  rng: SeedPrng,
  source: TrafficSourceType,
): { buyPrice: number; sellPrice: number } {
  const buyPrice = Math.round((0.001 + rng.next() * 0.014) * 1_000_000) / 1_000_000;
  let multMin = 1.08;
  let multMax = 1.45;
  if (source === "Facebook") {
    multMin = 1.22;
    multMax = 1.65;
  } else if (source === "TikTok") {
    multMin = 1.01;
    multMax = 1.18;
  } else if (source === "WhatsApp") {
    multMin = 1.1;
    multMax = 1.38;
  } else {
    multMin = 1.05;
    multMax = 1.42;
  }
  let sellPrice = Math.round(buyPrice * (multMin + rng.next() * (multMax - multMin)) * 1_000_000) / 1_000_000;
  if (rng.bool(0.06)) {
    sellPrice = Math.round(buyPrice * (0.88 + rng.next() * 0.1) * 1_000_000) / 1_000_000;
  }
  if (sellPrice <= buyPrice && rng.bool(0.5)) {
    sellPrice = Math.round(buyPrice * (1.02 + rng.next() * 0.08) * 1_000_000) / 1_000_000;
  }
  return { buyPrice, sellPrice };
}

/** ~640 deterministic wholesale traffic rows for analytics demos. */
export function seedWholesaleTraffic(rng: SeedPrng, baseNowIso: string): WholesaleTrafficRecord[] {
  const baseMs = new Date(baseNowIso).getTime();
  const windowMs = 30 * 24 * 60 * 60 * 1000;
  const startMs = baseMs - windowMs;
  const totalHours = 30 * 24;
  const count = 640;
  const records: WholesaleTrafficRecord[] = [];

  for (let i = 0; i < count; i += 1) {
    const region = rng.pick(REGIONS);
    const trafficSourceType = pickSourceType(rng);
    const trafficType = pickTrafficType(rng);
    const { buyPrice, sellPrice } = pricingForSource(rng, trafficSourceType);

    const submitCount = rng.int(1_000, 50_000);
    const dlrBase = trafficType === "Direct" ? 0.93 + rng.next() * 0.065 : 0.86 + rng.next() * 0.11;
    const dlr = Math.min(0.999, Math.max(0.5, dlrBase + region.dlrBias + (rng.next() - 0.5) * 0.04));
    const deliveryCount = Math.floor(submitCount * dlr);

    const hourSlot = rng.int(0, totalHours - 1);
    const timestamp = new Date(startMs + hourSlot * 60 * 60 * 1000).toISOString();

    records.push({
      id: `wtr-${String(i).padStart(5, "0")}`,
      timestamp,
      trafficType,
      trafficSourceType,
      sourceAccount: rng.pick(SOURCE_ACCOUNTS),
      destinationAccount: rng.pick(DEST_ACCOUNTS),
      senderId: randomSenderId(rng),
      country: region.country,
      operator: region.operator,
      submitCount,
      deliveryCount,
      buyPrice,
      sellPrice,
    });
  }

  records.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  return records;
}

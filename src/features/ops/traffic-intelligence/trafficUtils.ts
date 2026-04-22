import { endOfDay, format, parseISO, startOfDay, startOfHour, startOfMonth, subDays } from "date-fns";
import type { TrafficSourceType, WholesaleTrafficRecord, WholesaleTrafficType } from "../../../store/types";

export const ALL_TRAFFIC_SOURCES: TrafficSourceType[] = ["Facebook", "TikTok", "WhatsApp", "Other"];

export type TrafficTypeFilter = "" | WholesaleTrafficType;

export interface TrafficFilterState {
  dateFrom: string;
  dateTo: string;
  trafficSourceTypes: TrafficSourceType[];
  trafficType: TrafficTypeFilter;
  country: string;
  operator: string;
  sourceAccount: string;
  destinationAccount: string;
  senderId: string;
}

export function recordDlr(r: WholesaleTrafficRecord): number {
  if (r.submitCount <= 0) return 0;
  return r.deliveryCount / r.submitCount;
}

export function recordProfit(r: WholesaleTrafficRecord): number {
  return (r.sellPrice - r.buyPrice) * r.deliveryCount;
}

export function recordRevenue(r: WholesaleTrafficRecord): number {
  return r.sellPrice * r.deliveryCount;
}

export function inDateRange(iso: string, fromYmd: string, toYmd: string): boolean {
  const d = parseISO(iso);
  const from = startOfDay(parseISO(`${fromYmd}T12:00:00`));
  const to = endOfDay(parseISO(`${toYmd}T12:00:00`));
  return d >= from && d <= to;
}

export function filterWholesaleRecords(
  records: WholesaleTrafficRecord[],
  f: TrafficFilterState,
): WholesaleTrafficRecord[] {
  return records.filter((r) => {
    if (!inDateRange(r.timestamp, f.dateFrom, f.dateTo)) return false;
    if (f.trafficSourceTypes.length > 0 && !f.trafficSourceTypes.includes(r.trafficSourceType)) return false;
    if (f.trafficType && r.trafficType !== f.trafficType) return false;
    if (f.country && r.country !== f.country) return false;
    if (f.operator && r.operator !== f.operator) return false;
    if (f.sourceAccount && r.sourceAccount !== f.sourceAccount) return false;
    if (f.destinationAccount && r.destinationAccount !== f.destinationAccount) return false;
    if (f.senderId && !r.senderId.toLowerCase().includes(f.senderId.trim().toLowerCase())) return false;
    return true;
  });
}

export interface TrafficKpis {
  totalVolume: number;
  avgSellPerMsg: number;
  netProfit: number;
  avgDlr: number;
}

export function computeKpis(rows: WholesaleTrafficRecord[]): TrafficKpis {
  let vol = 0;
  let del = 0;
  let profit = 0;
  let sellWeighted = 0;
  for (const r of rows) {
    vol += r.submitCount;
    del += r.deliveryCount;
    profit += recordProfit(r);
    sellWeighted += r.sellPrice * r.submitCount;
  }
  return {
    totalVolume: vol,
    avgSellPerMsg: vol > 0 ? sellWeighted / vol : 0,
    netProfit: profit,
    avgDlr: vol > 0 ? del / vol : 0,
  };
}

export function pctTrend(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) return { value: current === 0 ? "0%" : "—", positive: true };
  const p = ((current - previous) / previous) * 100;
  return {
    value: `${p >= 0 ? "+" : ""}${p.toFixed(1)}% vs prior`,
    positive: p >= 0,
  };
}

export type ChartGranularity = "Hourly" | "Daily" | "Monthly";

export function bucketKey(iso: string, g: ChartGranularity): string {
  const d = parseISO(iso);
  if (g === "Hourly") return format(startOfHour(d), "yyyy-MM-dd HH:00");
  if (g === "Daily") return format(startOfDay(d), "yyyy-MM-dd");
  return format(startOfMonth(d), "yyyy-MM");
}

export interface TimeBucketRow {
  key: string;
  label: string;
  directVolume: number;
  generatedVolume: number;
  directProfit: number;
  generatedProfit: number;
  directSubmit: number;
  generatedSubmit: number;
  directDelivery: number;
  generatedDelivery: number;
  directRevenue: number;
  generatedRevenue: number;
  facebook: number;
  tiktok: number;
  whatsapp: number;
  other: number;
}

function emptyBucket(key: string, label: string): TimeBucketRow {
  return {
    key,
    label,
    directVolume: 0,
    generatedVolume: 0,
    directProfit: 0,
    generatedProfit: 0,
    directSubmit: 0,
    generatedSubmit: 0,
    directDelivery: 0,
    generatedDelivery: 0,
    directRevenue: 0,
    generatedRevenue: 0,
    facebook: 0,
    tiktok: 0,
    whatsapp: 0,
    other: 0,
  };
}

export function buildTimeBuckets(rows: WholesaleTrafficRecord[], g: ChartGranularity): TimeBucketRow[] {
  const map = new Map<string, TimeBucketRow>();
  for (const r of rows) {
    const key = bucketKey(r.timestamp, g);
    const label = key;
    let row = map.get(key);
    if (!row) {
      row = emptyBucket(key, label);
      map.set(key, row);
    }
    const vol = r.submitCount;
    const profit = recordProfit(r);
    const revenue = recordRevenue(r);
    if (r.trafficType === "Direct") {
      row.directVolume += vol;
      row.directProfit += profit;
      row.directSubmit += r.submitCount;
      row.directDelivery += r.deliveryCount;
      row.directRevenue += revenue;
    } else {
      row.generatedVolume += vol;
      row.generatedProfit += profit;
      row.generatedSubmit += r.submitCount;
      row.generatedDelivery += r.deliveryCount;
      row.generatedRevenue += revenue;
    }
    if (r.trafficSourceType === "Facebook") row.facebook += vol;
    else if (r.trafficSourceType === "TikTok") row.tiktok += vol;
    else if (r.trafficSourceType === "WhatsApp") row.whatsapp += vol;
    else row.other += vol;
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export type CompareDimension = "country" | "operator" | "senderId" | "destinationAccount" | "trafficSourceType";

export function compareDimensionValue(r: WholesaleTrafficRecord, dim: CompareDimension): string {
  switch (dim) {
    case "country":
      return r.country;
    case "operator":
      return r.operator;
    case "senderId":
      return r.senderId;
    case "destinationAccount":
      return r.destinationAccount;
    case "trafficSourceType":
      return r.trafficSourceType;
    default:
      return "";
  }
}

export interface CompareBucketRow {
  dim: string;
  directVolume: number;
  generatedVolume: number;
  directProfit: number;
  generatedProfit: number;
  directSubmit: number;
  generatedSubmit: number;
  directDelivery: number;
  generatedDelivery: number;
  directRevenue: number;
  generatedRevenue: number;
}

export type ChartMetric = "Volume" | "Profit" | "Margin" | "DLR" | "Submit" | "Delivery";

function compareSortTotal(row: CompareBucketRow, metric: ChartMetric): number {
  switch (metric) {
    case "Volume":
      return row.directVolume + row.generatedVolume;
    case "Profit":
      return row.directProfit + row.generatedProfit;
    case "Submit":
      return row.directSubmit + row.generatedSubmit;
    case "Delivery":
      return row.directDelivery + row.generatedDelivery;
    case "Margin":
    case "DLR":
      return row.directVolume + row.generatedVolume;
    default:
      return row.directVolume + row.generatedVolume;
  }
}

export function buildCompareBuckets(
  rows: WholesaleTrafficRecord[],
  dim: CompareDimension,
  topN: number,
  sortMetric: ChartMetric = "Volume",
): CompareBucketRow[] {
  const agg = new Map<
    string,
    {
      directVol: number;
      genVol: number;
      directProfit: number;
      genProfit: number;
      directSubmit: number;
      genSubmit: number;
      directDel: number;
      genDel: number;
      directRev: number;
      genRev: number;
    }
  >();
  for (const r of rows) {
    const k = compareDimensionValue(r, dim);
    const cur = agg.get(k) ?? {
      directVol: 0,
      genVol: 0,
      directProfit: 0,
      genProfit: 0,
      directSubmit: 0,
      genSubmit: 0,
      directDel: 0,
      genDel: 0,
      directRev: 0,
      genRev: 0,
    };
    const vol = r.submitCount;
    const profit = recordProfit(r);
    const rev = recordRevenue(r);
    if (r.trafficType === "Direct") {
      cur.directVol += vol;
      cur.directProfit += profit;
      cur.directSubmit += r.submitCount;
      cur.directDel += r.deliveryCount;
      cur.directRev += rev;
    } else {
      cur.genVol += vol;
      cur.genProfit += profit;
      cur.genSubmit += r.submitCount;
      cur.genDel += r.deliveryCount;
      cur.genRev += rev;
    }
    agg.set(k, cur);
  }
  const list: CompareBucketRow[] = Array.from(agg.entries()).map(([d, v]) => ({
    dim: d,
    directVolume: v.directVol,
    generatedVolume: v.genVol,
    directProfit: v.directProfit,
    generatedProfit: v.genProfit,
    directSubmit: v.directSubmit,
    generatedSubmit: v.genSubmit,
    directDelivery: v.directDel,
    generatedDelivery: v.genDel,
    directRevenue: v.directRev,
    generatedRevenue: v.genRev,
  }));
  list.sort((a, b) => compareSortTotal(b, sortMetric) - compareSortTotal(a, sortMetric));
  return list.slice(0, topN);
}

export function directDlrRatio(row: TimeBucketRow): number {
  return row.directSubmit > 0 ? row.directDelivery / row.directSubmit : 0;
}

export function generatedDlrRatio(row: TimeBucketRow): number {
  return row.generatedSubmit > 0 ? row.generatedDelivery / row.generatedSubmit : 0;
}

export function directMarginRatio(row: TimeBucketRow): number {
  return row.directRevenue > 0 ? row.directProfit / row.directRevenue : 0;
}

export function generatedMarginRatio(row: TimeBucketRow): number {
  return row.generatedRevenue > 0 ? row.generatedProfit / row.generatedRevenue : 0;
}

export function compareDirectDlr(row: CompareBucketRow): number {
  return row.directSubmit > 0 ? row.directDelivery / row.directSubmit : 0;
}

export function compareGenDlr(row: CompareBucketRow): number {
  return row.generatedSubmit > 0 ? row.generatedDelivery / row.generatedSubmit : 0;
}

export function compareDirectMargin(row: CompareBucketRow): number {
  return row.directRevenue > 0 ? row.directProfit / row.directRevenue : 0;
}

export function compareGenMargin(row: CompareBucketRow): number {
  return row.generatedRevenue > 0 ? row.generatedProfit / row.generatedRevenue : 0;
}

export interface TableAggRow {
  key: string;
  trafficType: WholesaleTrafficType;
  country: string;
  operator: string;
  sourceAccount: string;
  submitCount: number;
  deliveryCount: number;
  buyWeighted: number;
  sellWeighted: number;
  profit: number;
  revenue: number;
}

export function buildTableAggregates(rows: WholesaleTrafficRecord[]): TableAggRow[] {
  const map = new Map<string, TableAggRow>();
  for (const r of rows) {
    const key = `${r.trafficType}|${r.country}|${r.operator}|${r.sourceAccount}`;
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        trafficType: r.trafficType,
        country: r.country,
        operator: r.operator,
        sourceAccount: r.sourceAccount,
        submitCount: 0,
        deliveryCount: 0,
        buyWeighted: 0,
        sellWeighted: 0,
        profit: 0,
        revenue: 0,
      };
      map.set(key, row);
    }
    row.submitCount += r.submitCount;
    row.deliveryCount += r.deliveryCount;
    row.buyWeighted += r.buyPrice * r.submitCount;
    row.sellWeighted += r.sellPrice * r.submitCount;
    row.profit += recordProfit(r);
    row.revenue += recordRevenue(r);
  }
  return Array.from(map.values());
}

export function defaultDateBounds(records: WholesaleTrafficRecord[]): { from: string; to: string } {
  if (records.length === 0) {
    const t = new Date();
    return { from: format(t, "yyyy-MM-dd"), to: format(t, "yyyy-MM-dd") };
  }
  let min = records[0].timestamp;
  let max = records[0].timestamp;
  for (const r of records) {
    if (r.timestamp < min) min = r.timestamp;
    if (r.timestamp > max) max = r.timestamp;
  }
  return { from: format(parseISO(min), "yyyy-MM-dd"), to: format(parseISO(max), "yyyy-MM-dd") };
}

export function shiftDateWindow(fromYmd: string, toYmd: string): { prevFrom: string; prevTo: string } {
  const from = startOfDay(parseISO(`${fromYmd}T12:00:00`));
  const to = endOfDay(parseISO(`${toYmd}T12:00:00`));
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const prevToDate = subDays(from, 1);
  const prevFromDate = subDays(from, days);
  return { prevFrom: format(prevFromDate, "yyyy-MM-dd"), prevTo: format(prevToDate, "yyyy-MM-dd") };
}

import type {
  FinArApTransaction,
  FinDirection,
  FinInternalExpense,
  FinTxStatus,
  HrCurrencyCode,
  HrFxRate,
  OurEntity,
} from "../../store/types";
import { convertCurrency } from "../../store/hrUtils";

export type FinAgingBucket = "0-30" | "31-60" | "61+";

export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T12:00:00Z`).getTime();
  const b = new Date(`${toYmd}T12:00:00Z`).getTime();
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

export function agingBucket(dueDateYmd: string, todayYmd: string): FinAgingBucket {
  const days = daysBetween(dueDateYmd, todayYmd);
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  return "61+";
}

export function isOpenLikeStatus(status: FinTxStatus): boolean {
  return status === "Open" || status === "PartiallyPaid" || status === "Overdue";
}

export function openAmount(tx: FinArApTransaction): number {
  return Math.max(0, tx.amount - (tx.paidAmount ?? 0));
}

export interface VirtualCashflowItem {
  id: string;
  source: "Transaction" | "InternalExpense";
  entityId: OurEntity;
  direction: FinDirection;
  dueDate: string;
  amount: number;
  currency: HrCurrencyCode;
  label: string;
  category?: string;
}

function ymdToDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00Z`);
}

function dateToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clampMonthDay(year: number, monthIdx: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIdx, Math.min(day, lastDay), 12, 0, 0));
}

/** Expand recurring expenses into virtual cashflow items inside the [fromYmd, toYmd] range. */
export function materializeRecurringExpenses(
  expenses: FinInternalExpense[],
  fromYmd: string,
  toYmd: string,
): VirtualCashflowItem[] {
  const out: VirtualCashflowItem[] = [];
  const from = ymdToDate(fromYmd);
  const to = ymdToDate(toYmd);

  for (const exp of expenses) {
    if (!exp.active) continue;
    if (exp.recurrence === "OneOff") {
      if (!exp.fixedDate) continue;
      if (exp.fixedDate < fromYmd || exp.fixedDate > toYmd) continue;
      out.push({
        id: `vexp-${exp.id}-${exp.fixedDate}`,
        source: "InternalExpense",
        entityId: exp.entityId,
        direction: "Payable",
        dueDate: exp.fixedDate,
        amount: exp.amount,
        currency: exp.currency,
        label: exp.label,
        category: exp.category,
      });
      continue;
    }
    const day = exp.dayOfMonth ?? 1;
    let cursorY = from.getUTCFullYear();
    let cursorM = from.getUTCMonth();
    while (true) {
      const occurrence = clampMonthDay(cursorY, cursorM, day);
      if (occurrence > to) break;
      if (occurrence >= from) {
        const ymd = dateToYmd(occurrence);
        out.push({
          id: `vexp-${exp.id}-${ymd}`,
          source: "InternalExpense",
          entityId: exp.entityId,
          direction: "Payable",
          dueDate: ymd,
          amount: exp.amount,
          currency: exp.currency,
          label: exp.label,
          category: exp.category,
        });
      }
      cursorM += 1;
      if (cursorM > 11) {
        cursorM = 0;
        cursorY += 1;
      }
    }
  }
  return out;
}

export function txToVirtualItem(tx: FinArApTransaction): VirtualCashflowItem | null {
  if (!isOpenLikeStatus(tx.status) && tx.status !== "Planned") return null;
  const due = tx.dueDate ?? tx.issueDate;
  return {
    id: `vtx-${tx.id}`,
    source: "Transaction",
    entityId: tx.entityId,
    direction: tx.direction,
    dueDate: due,
    amount: openAmount(tx) > 0 ? openAmount(tx) : tx.amount,
    currency: tx.currency,
    label: tx.description ?? tx.sourceType,
    category: tx.sourceType,
  };
}

export type CashflowGranularity = "daily" | "weekly";

function bucketKey(ymd: string, granularity: CashflowGranularity): string {
  if (granularity === "daily") return ymd;
  const d = ymdToDate(ymd);
  const day = d.getUTCDay();
  const monday = new Date(d);
  const offset = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(d.getUTCDate() + offset);
  return dateToYmd(monday);
}

export interface CashflowBucket {
  key: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
}

export interface CashflowComputed {
  buckets: CashflowBucket[];
  inflowsTotal: number;
  outflowsTotal: number;
  netTotal: number;
  openingBalance: number;
  closingBalance: number;
  maxDip: number;
  perEntity: Array<{ entityId: OurEntity; inflows: number; outflows: number; net: number; opening: number; closing: number; maxDip: number }>;
}

export function bucketCashflow(opts: {
  items: VirtualCashflowItem[];
  fromYmd: string;
  toYmd: string;
  granularity: CashflowGranularity;
  fx: HrFxRate[];
  /** Opening cash balance per entity (in their own currency). */
  openingByEntity: Map<OurEntity, { amount: number; currency: HrCurrencyCode }>;
}): CashflowComputed {
  const at = new Date().toISOString();
  const bucketMap = new Map<string, { inflow: number; outflow: number }>();
  let inflowsTotal = 0;
  let outflowsTotal = 0;

  const perEntityMap = new Map<OurEntity, { inflows: number; outflows: number }>();

  for (const item of opts.items) {
    if (item.dueDate < opts.fromYmd || item.dueDate > opts.toYmd) continue;
    const eur = convertCurrency(item.amount, item.currency, "EUR", opts.fx, at) ?? item.amount;
    const key = bucketKey(item.dueDate, opts.granularity);
    const cur = bucketMap.get(key) ?? { inflow: 0, outflow: 0 };
    if (item.direction === "Receivable") cur.inflow += eur;
    else cur.outflow += eur;
    bucketMap.set(key, cur);

    const ent = perEntityMap.get(item.entityId) ?? { inflows: 0, outflows: 0 };
    if (item.direction === "Receivable") ent.inflows += eur;
    else ent.outflows += eur;
    perEntityMap.set(item.entityId, ent);

    if (item.direction === "Receivable") inflowsTotal += eur;
    else outflowsTotal += eur;
  }

  let openingBalance = 0;
  for (const [, v] of opts.openingByEntity) {
    const eur = convertCurrency(v.amount, v.currency, "EUR", opts.fx, at) ?? v.amount;
    openingBalance += eur;
  }

  const sortedKeys = Array.from(bucketMap.keys()).sort();
  let cumulative = openingBalance;
  let maxDip = openingBalance;
  const buckets: CashflowBucket[] = sortedKeys.map((k) => {
    const v = bucketMap.get(k)!;
    const net = v.inflow - v.outflow;
    cumulative += net;
    if (cumulative < maxDip) maxDip = cumulative;
    return { key: k, inflow: v.inflow, outflow: v.outflow, net, cumulative };
  });
  const closingBalance = cumulative;

  const perEntity = Array.from(perEntityMap.entries())
    .map(([entityId, v]) => {
      const opening = (() => {
        const o = opts.openingByEntity.get(entityId);
        if (!o) return 0;
        return convertCurrency(o.amount, o.currency, "EUR", opts.fx, at) ?? o.amount;
      })();
      const net = v.inflows - v.outflows;
      const closing = opening + net;
      return {
        entityId,
        inflows: v.inflows,
        outflows: v.outflows,
        net,
        opening,
        closing,
        maxDip: Math.min(opening, closing),
      };
    })
    .sort((a, b) => a.entityId.localeCompare(b.entityId));

  return {
    buckets,
    inflowsTotal,
    outflowsTotal,
    netTotal: inflowsTotal - outflowsTotal,
    openingBalance,
    closingBalance,
    maxDip,
    perEntity,
  };
}


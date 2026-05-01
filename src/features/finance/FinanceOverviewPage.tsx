import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Calendar, TrendingDown, Wallet } from "lucide-react";
import { useAppStore } from "../../store/db";
import type {
  FinanceCashPosition,
  FinanceCounterparty,
  FinanceCurrencyCode,
  OurEntity,
} from "../../store/types";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { UiPageHeader } from "../../ui/UiPageHeader";

// ─── Local helpers ───────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<FinanceCurrencyCode, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  TRY: "₺",
  CHF: "CHF ",
  AED: "AED ",
};

function fmtEur(amount: number): string {
  return `€${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtOriginal(amount: number, currency: FinanceCurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function isWithin30Days(dateStr: string): boolean {
  const today = startOfDay(new Date());
  const target = startOfDay(parseYmd(dateStr));
  const limit = addDays(today, 30);
  return target.getTime() >= today.getTime() && target.getTime() <= limit.getTime();
}

/** 0 = current week, 1 = next week, … returns -1 outside the [today, today+90d] window. */
function getWeekBucket(dateStr: string, referenceDate: Date): number {
  const ref = startOfDay(referenceDate);
  const target = startOfDay(parseYmd(dateStr));
  const diffDays = Math.floor((target.getTime() - ref.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0 || diffDays > 90) return -1;
  return Math.floor(diffDays / 7);
}

const ENTITIES: { id: OurEntity; label: string; flag: string }[] = [
  { id: "UK", label: "UK", flag: "🇬🇧" },
  { id: "USA", label: "USA", flag: "🇺🇸" },
  { id: "TR", label: "TR", flag: "🇹🇷" },
];

// ─── Cash position card ──────────────────────────────────────────────

function EntityCashCard({
  entity,
  flag,
  positions,
}: {
  entity: OurEntity;
  flag: string;
  positions: FinanceCashPosition[];
}) {
  if (positions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">
            <span className="mr-2">{flag}</span>
            {entity}
          </h4>
          <Wallet className="h-4 w-4 text-gray-400" />
        </div>
        <p className="mt-3 text-sm text-gray-400">—</p>
      </div>
    );
  }

  const totalEur = positions.reduce((sum, p) => sum + p.amountEur, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">
          <span className="mr-2">{flag}</span>
          {entity}
        </h4>
        <Wallet className="h-4 w-4 text-gray-400" />
      </div>
      <ul className="mt-3 space-y-1">
        {positions.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{p.currency}</span>
            <span className="font-medium tabular-nums text-gray-800">{fmtOriginal(p.amountOriginal, p.currency)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-gray-100 pt-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total</span>
        <span className="text-base font-bold tabular-nums text-gray-900">{fmtEur(totalEur)}</span>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

type ObligationRow = {
  id: string;
  dueDate: string;
  entityId: OurEntity;
  type: "Projection" | "Credit Card" | "Direct Debit" | "Payable";
  description: string;
  originalAmount: string;
  amountEur: number;
  confidence: "Confirmed" | "Expected" | "Planned" | "Overdue";
};

type InflowRow = {
  id: string;
  dueDate: string;
  entityId: OurEntity;
  counterparty: string;
  description: string;
  originalAmount: string;
  amountEur: number;
  confidence: "Confirmed" | "Expected" | "Planned";
};

export function FinanceOverviewPage() {
  const cashPositions = useAppStore((s) => s.financeCashPositions);
  const projections = useAppStore((s) => s.financeProjections);
  const arapItems = useAppStore((s) => s.financeARAPItems);
  const counterparties = useAppStore((s) => s.financeCounterparties);
  const creditCards = useAppStore((s) => s.financeCreditCards);
  const creditCardStatements = useAppStore((s) => s.financeCreditCardStatements);
  const directDebits = useAppStore((s) => s.financeDirectDebits);
  const liquidityThresholds = useAppStore((s) => s.financeLiquidityThresholds);
  const forecastSnapshots = useAppStore((s) => s.financeForecastSnapshots);
  const recordSnapshot = useAppStore((s) => s.recordFinanceForecastSnapshot);

  // Sum of min liquidity thresholds (group floor used in chart).
  const minLiquidityFloor = useMemo(
    () => liquidityThresholds.reduce((s, t) => s + t.minOperatingCashEur, 0),
    [liquidityThresholds],
  );

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayYmd = ymd(today);

  // Counterparty lookup
  const cpById = useMemo(() => {
    const m = new Map<string, FinanceCounterparty>();
    for (const c of counterparties) m.set(c.id, c);
    return m;
  }, [counterparties]);

  // ── Section 2: latest cash position rows per entity ────────────────
  const latestPositionsByEntity = useMemo(() => {
    const groups = new Map<OurEntity, FinanceCashPosition[]>();
    // For each entity+currency, find the latest by asOf desc
    const sorted = cashPositions.slice().sort((a, b) => (b.asOf ?? "").localeCompare(a.asOf ?? ""));
    const seen = new Set<string>();
    for (const p of sorted) {
      const key = `${p.entityId}:${p.currency}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const arr = groups.get(p.entityId) ?? [];
      arr.push(p);
      groups.set(p.entityId, arr);
    }
    return groups;
  }, [cashPositions]);

  const asOfLabel = useMemo(() => {
    if (cashPositions.length === 0) return null;
    const sorted = cashPositions.map((p) => p.asOf).filter(Boolean).sort();
    return sorted.length > 0 ? sorted[sorted.length - 1] : null;
  }, [cashPositions]);

  // ── Section 3: 90-day weekly buckets, by category ─────────────────
  /**
   * Stacked-category buckets:
   *   Inflow categories: Collections (ARAP receivable), Other inflow (projections).
   *   Outflow categories: SupplierPayments (ARAP payable), Payroll (Salary projection),
   *     Tax, DirectDebits, CardSettlements, Intercompany, OtherOutflow.
   */
  const chartData = useMemo(() => {
    const WEEKS = 13;
    type Bucket = {
      weekStartYmd: string;
      Collections: number;
      OtherInflow: number;
      SupplierPayments: number;
      Payroll: number;
      Tax: number;
      DirectDebits: number;
      CardSettlements: number;
      Intercompany: number;
      OtherOutflow: number;
    };
    const buckets: Bucket[] = [];
    for (let i = 0; i < WEEKS; i++) {
      const start = addDays(today, i * 7);
      buckets.push({
        weekStartYmd: ymd(start),
        Collections: 0,
        OtherInflow: 0,
        SupplierPayments: 0,
        Payroll: 0,
        Tax: 0,
        DirectDebits: 0,
        CardSettlements: 0,
        Intercompany: 0,
        OtherOutflow: 0,
      });
    }
    const bucketIdx = (dateStr: string) => {
      const idx = getWeekBucket(dateStr, today);
      return idx >= 0 && idx < WEEKS ? idx : -1;
    };
    const cpById = new Map<string, FinanceCounterparty>();
    for (const c of counterparties) cpById.set(c.id, c);

    // ARAP items: receivables → Collections (or Intercompany when Internal cp).
    for (const item of arapItems) {
      if (item.status === "Paid" || item.status === "Cancelled") continue;
      if (!item.dueDate) continue;
      const idx = bucketIdx(item.dueDate);
      if (idx < 0) continue;
      const cp = cpById.get(item.counterpartyId);
      const isIc = item.intercompany || cp?.type === "Internal";
      if (item.direction === "Receivable") {
        if (isIc) buckets[idx]!.Intercompany += item.amountEur;
        else buckets[idx]!.Collections += item.amountEur;
      } else {
        if (isIc) buckets[idx]!.Intercompany += item.amountEur;
        else buckets[idx]!.SupplierPayments += item.amountEur;
      }
    }

    // Projections: split by category.
    for (const p of projections) {
      if (p.status !== "Pending") continue;
      const idx = bucketIdx(p.dueDate);
      if (idx < 0) continue;
      if (p.direction === "Inflow") {
        buckets[idx]!.OtherInflow += p.amountEur;
      } else {
        switch (p.category) {
          case "Salary":
            buckets[idx]!.Payroll += p.amountEur;
            break;
          case "Tax":
            buckets[idx]!.Tax += p.amountEur;
            break;
          case "DirectDebit":
            buckets[idx]!.DirectDebits += p.amountEur;
            break;
          case "CreditCard":
            buckets[idx]!.CardSettlements += p.amountEur;
            break;
          case "ProviderPayment":
            buckets[idx]!.SupplierPayments += p.amountEur;
            break;
          default:
            buckets[idx]!.OtherOutflow += p.amountEur;
        }
      }
    }

    // Credit-card statements not yet paid (independent of projections).
    for (const s of creditCardStatements) {
      if (s.status === "Paid") continue;
      const idx = bucketIdx(s.dueDate);
      if (idx >= 0) buckets[idx]!.CardSettlements += s.totalAmountEur;
    }

    // Active direct debits.
    for (const dd of directDebits) {
      if (dd.status !== "Active") continue;
      const idx = bucketIdx(dd.nextDueDate);
      if (idx >= 0) buckets[idx]!.DirectDebits += dd.amountEur;
    }

    // Running balance starting from total cash.
    const startingBalance = cashPositions.reduce((s, p) => s + p.amountEur, 0);
    let running = startingBalance;
    return buckets.map((b) => {
      const totalInflow = b.Collections + b.OtherInflow + (/* IC handled both ways */ 0);
      const totalOutflow =
        b.SupplierPayments + b.Payroll + b.Tax + b.DirectDebits + b.CardSettlements + b.OtherOutflow;
      // Intercompany splits both directions; we treat its `Receivable` as inflow and `Payable` as outflow.
      // For the bar stack we surface a single "Intercompany" net column; for running balance we add to inflow when net positive, outflow when negative.
      const icNet = b.Intercompany; // positive means net inflow; negative means net outflow (rare in seed).
      const inflow = totalInflow + Math.max(0, icNet);
      const outflow = totalOutflow + Math.max(0, -icNet);
      running = running + inflow - outflow;
      return {
        weekLabel: b.weekStartYmd.slice(5),
        weekStartYmd: b.weekStartYmd,
        // Stacked inflow series (positive)
        Collections: Math.round(b.Collections),
        OtherInflow: Math.round(b.OtherInflow),
        Intercompany: Math.round(b.Intercompany),
        // Stacked outflow series (negative for chart display)
        SupplierPayments: -Math.round(b.SupplierPayments),
        Payroll: -Math.round(b.Payroll),
        Tax: -Math.round(b.Tax),
        DirectDebits: -Math.round(b.DirectDebits),
        CardSettlements: -Math.round(b.CardSettlements),
        OtherOutflow: -Math.round(b.OtherOutflow),
        // Aggregate totals (used by KPIs / exception panel)
        _totalInflow: Math.round(inflow),
        _totalOutflow: Math.round(outflow),
        "Running Balance": Math.round(running),
      };
    });
  }, [today, projections, creditCardStatements, directDebits, arapItems, cashPositions, counterparties]);

  // ── Forecast KPIs (derived from chartData) ─────────────────────────
  const forecastKpis = useMemo(() => {
    if (chartData.length === 0) {
      return { openingCash: 0, totalInflows: 0, totalOutflows: 0, lowestBalance: 0, lowestWeek: "—" };
    }
    let totalInflows = 0;
    let totalOutflows = 0;
    let lowestBalance = chartData[0]!["Running Balance"];
    let lowestWeek = chartData[0]!.weekStartYmd;
    for (const row of chartData) {
      totalInflows += row._totalInflow;
      totalOutflows += row._totalOutflow;
      if (row["Running Balance"] < lowestBalance) {
        lowestBalance = row["Running Balance"];
        lowestWeek = row.weekStartYmd;
      }
    }
    const week0 = chartData[0]!;
    const week0Net = week0._totalInflow - week0._totalOutflow;
    const openingCash = week0["Running Balance"] - week0Net;
    return { openingCash, totalInflows, totalOutflows, lowestBalance, lowestWeek };
  }, [chartData]);

  // ── Forecast accuracy (over prior 4/8/13 weeks of actuals) ─────────
  const accuracy = useMemo(() => {
    // Rule: a snapshot is "accurate" when |actual − forecast| / |forecast| <= 10%.
    // We need only snapshots that have an `actualClosingEur` set (i.e. the week is in the past).
    const finalised = forecastSnapshots
      .filter((s) => s.actualClosingEur !== undefined)
      .slice()
      .sort((a, b) => b.weekStartYmd.localeCompare(a.weekStartYmd));
    const accuracyForLastN = (n: number) => {
      const set = finalised.slice(0, n);
      if (set.length === 0) return null;
      let hits = 0;
      for (const s of set) {
        const fc = s.forecastClosingEur;
        const ac = s.actualClosingEur ?? 0;
        const denom = Math.max(1, Math.abs(fc));
        if (Math.abs(ac - fc) / denom <= 0.1) hits += 1;
      }
      return Math.round((hits / set.length) * 100);
    };
    return {
      last4: accuracyForLastN(4),
      last8: accuracyForLastN(8),
      last13: accuracyForLastN(13),
      finalisedCount: finalised.length,
    };
  }, [forecastSnapshots]);

  const runSnapshot = () => {
    const todayIso = new Date().toISOString();
    const rows = chartData.map((row) => ({
      forecastedAt: todayIso,
      weekStartYmd: row.weekStartYmd,
      forecastInflowEur: row._totalInflow,
      forecastOutflowEur: row._totalOutflow,
      forecastClosingEur: row["Running Balance"],
    }));
    recordSnapshot(rows);
  };

  // ── Exception panel data ───────────────────────────────────────────
  const exceptions = useMemo(() => {
    const out: Array<{ id: string; severity: "danger" | "warning" | "info"; title: string; detail: string }> = [];
    // 1. Cash pinch in next 4 weeks (any of the next 4 weeks below threshold or going negative).
    if (chartData.length > 0) {
      const next4 = chartData.slice(0, 4);
      for (const row of next4) {
        if (row["Running Balance"] < 0) {
          out.push({
            id: `pinch-neg-${row.weekStartYmd}`,
            severity: "danger",
            title: "Cash goes negative",
            detail: `Week of ${row.weekStartYmd} closes at ${fmtEur(row["Running Balance"])}.`,
          });
        } else if (minLiquidityFloor > 0 && row["Running Balance"] < minLiquidityFloor) {
          out.push({
            id: `pinch-thr-${row.weekStartYmd}`,
            severity: "warning",
            title: "Cash below minimum threshold",
            detail: `Week of ${row.weekStartYmd}: ${fmtEur(row["Running Balance"])} < min ${fmtEur(minLiquidityFloor)}.`,
          });
        }
      }
    }
    // 2. Large unconfirmed inflow (Expected/Planned projection ≥ 50k EUR within 30d).
    const todayMs = Date.now();
    const in30Ms = todayMs + 30 * 24 * 60 * 60 * 1000;
    for (const p of projections) {
      if (p.status !== "Pending" || p.direction !== "Inflow") continue;
      const dueMs = new Date(`${p.dueDate.slice(0, 10)}T12:00:00Z`).getTime();
      if (dueMs < todayMs || dueMs > in30Ms) continue;
      if (p.confidence === "Confirmed") continue;
      if (p.amountEur >= 50_000) {
        out.push({
          id: `unconf-${p.id}`,
          severity: "warning",
          title: `Large unconfirmed inflow: ${p.label}`,
          detail: `${fmtEur(p.amountEur)} due ${p.dueDate} · confidence ${p.confidence}.`,
        });
      }
    }
    // 3. Single-item outflows over 30k EUR threshold within 30d.
    const PROJ_THRESHOLD = 30_000;
    for (const p of projections) {
      if (p.status !== "Pending" || p.direction !== "Outflow") continue;
      const dueMs = new Date(`${p.dueDate.slice(0, 10)}T12:00:00Z`).getTime();
      if (dueMs < todayMs || dueMs > in30Ms) continue;
      if (p.amountEur >= PROJ_THRESHOLD) {
        out.push({
          id: `bigout-${p.id}`,
          severity: "info",
          title: `Large single outflow: ${p.label}`,
          detail: `${fmtEur(p.amountEur)} due ${p.dueDate} · ${p.category}.`,
        });
      }
    }
    return out.slice(0, 12);
  }, [chartData, projections, minLiquidityFloor]);

  // ── Section 4: upcoming obligations (next 30d, outflows) ───────────
  const obligations: ObligationRow[] = useMemo(() => {
    const rows: ObligationRow[] = [];
    for (const p of projections) {
      if (p.direction !== "Outflow" || p.status !== "Pending") continue;
      if (!isWithin30Days(p.dueDate)) continue;
      rows.push({
        id: `proj-${p.id}`,
        dueDate: p.dueDate,
        entityId: p.entityId,
        type: "Projection",
        description: p.label,
        originalAmount: fmtOriginal(p.amountOriginal, p.currency),
        amountEur: p.amountEur,
        confidence: p.dueDate < todayYmd ? "Overdue" : p.confidence,
      });
    }
    const cardEntityById = new Map(creditCards.map((c) => [c.id, c.entityId]));
    for (const s of creditCardStatements) {
      if (s.status === "Paid") continue;
      if (!isWithin30Days(s.dueDate)) continue;
      rows.push({
        id: `ccs-${s.id}`,
        dueDate: s.dueDate,
        entityId: cardEntityById.get(s.cardId) ?? "UK",
        type: "Credit Card",
        description: `Card statement ${s.statementMonth}`,
        originalAmount: fmtOriginal(s.totalAmountOriginal, s.currency),
        amountEur: s.totalAmountEur,
        confidence: s.dueDate < todayYmd ? "Overdue" : "Confirmed",
      });
    }
    for (const dd of directDebits) {
      if (dd.status !== "Active") continue;
      if (!isWithin30Days(dd.nextDueDate)) continue;
      rows.push({
        id: `dd-${dd.id}`,
        dueDate: dd.nextDueDate,
        entityId: dd.entityId,
        type: "Direct Debit",
        description: dd.label,
        originalAmount: fmtOriginal(dd.amountOriginal, dd.currency),
        amountEur: dd.amountEur,
        confidence: dd.nextDueDate < todayYmd ? "Overdue" : "Confirmed",
      });
    }
    for (const item of arapItems) {
      if (item.direction !== "Payable") continue;
      if (item.status !== "Open" && item.status !== "Planned") continue;
      if (!item.dueDate || !isWithin30Days(item.dueDate)) continue;
      rows.push({
        id: `arap-${item.id}`,
        dueDate: item.dueDate,
        entityId: item.entityId,
        type: "Payable",
        description: item.description,
        originalAmount: fmtOriginal(item.amountOriginal, item.currency),
        amountEur: item.amountEur,
        confidence: item.status === "Planned" ? "Planned" : item.dueDate < todayYmd ? "Overdue" : "Confirmed",
      });
    }
    rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return rows;
  }, [projections, creditCardStatements, directDebits, arapItems, creditCards, todayYmd]);

  // ── Section 5: expected inflows (next 30d) ─────────────────────────
  const inflows: InflowRow[] = useMemo(() => {
    const rows: InflowRow[] = [];
    for (const p of projections) {
      if (p.direction !== "Inflow" || p.status !== "Pending") continue;
      if (!isWithin30Days(p.dueDate)) continue;
      rows.push({
        id: `proj-${p.id}`,
        dueDate: p.dueDate,
        entityId: p.entityId,
        counterparty: p.counterpartyId ? cpById.get(p.counterpartyId)?.name ?? "—" : "—",
        description: p.label,
        originalAmount: fmtOriginal(p.amountOriginal, p.currency),
        amountEur: p.amountEur,
        confidence: p.confidence,
      });
    }
    for (const item of arapItems) {
      if (item.direction !== "Receivable") continue;
      if (item.status !== "Open" && item.status !== "Planned") continue;
      if (!item.dueDate || !isWithin30Days(item.dueDate)) continue;
      rows.push({
        id: `arap-${item.id}`,
        dueDate: item.dueDate,
        entityId: item.entityId,
        counterparty: item.counterpartyId ? cpById.get(item.counterpartyId)?.name ?? "—" : "—",
        description: item.description,
        originalAmount: fmtOriginal(item.amountOriginal, item.currency),
        amountEur: item.amountEur,
        confidence: item.status === "Planned" ? "Planned" : "Confirmed",
      });
    }
    rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return rows;
  }, [projections, arapItems, cpById]);

  // ── Section 6: summary totals ──────────────────────────────────────
  const totalCashEur = useMemo(() => cashPositions.reduce((s, p) => s + p.amountEur, 0), [cashPositions]);
  const expectedInflowsEur = useMemo(
    () => projections.filter((p) => p.direction === "Inflow" && p.status === "Pending").reduce((s, p) => s + p.amountEur, 0),
    [projections],
  );
  const expectedOutflowsEur = useMemo(
    () => projections.filter((p) => p.direction === "Outflow" && p.status === "Pending").reduce((s, p) => s + p.amountEur, 0),
    [projections],
  );
  const projectedNet = totalCashEur + expectedInflowsEur - expectedOutflowsEur;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <UiPageHeader title="Cashflow Forecast" subtitle="Entity treasury positions and 90-day cash flow projection" />
        <div className="flex items-end gap-3">
          {accuracy.finalisedCount > 0 && (
            <span className="pb-1 text-[11px] text-gray-500">
              Accuracy
              {accuracy.last4 !== null && <> · 4w {accuracy.last4}%</>}
              {accuracy.last8 !== null && <> · 8w {accuracy.last8}%</>}
              {accuracy.last13 !== null && <> · 13w {accuracy.last13}%</>}
            </span>
          )}
          {asOfLabel && (
            <span className="pb-1 text-xs text-gray-500">
              As of <span className="font-medium text-gray-700">{asOfLabel}</span>
            </span>
          )}
          <button
            type="button"
            className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            onClick={runSnapshot}
            title={`Stored snapshots: ${forecastSnapshots.length}`}
          >
            Run snapshot
          </button>
        </div>
      </div>

      {/* Forecast KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiKpiCard
          label="Opening Cash (This Week)"
          value={fmtEur(forecastKpis.openingCash)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <UiKpiCard
          label="Total Inflows (Next 13w)"
          value={fmtEur(forecastKpis.totalInflows)}
          icon={<ArrowDownRight className="h-5 w-5" />}
          trend={{ value: "Confirmed + Expected", positive: true }}
        />
        <UiKpiCard
          label="Total Outflows (Next 13w)"
          value={fmtEur(forecastKpis.totalOutflows)}
          icon={<ArrowUpRight className="h-5 w-5" />}
          trend={{ value: "AP + Direct Debits + Cards", positive: false }}
        />
        <UiKpiCard
          label="Lowest Projected Cash"
          value={fmtEur(forecastKpis.lowestBalance)}
          icon={forecastKpis.lowestBalance < 0 ? <TrendingDown className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
          trend={{
            value: forecastKpis.lowestWeek !== "—" ? `Week ${forecastKpis.lowestWeek}` : "—",
            positive: forecastKpis.lowestBalance >= 0,
          }}
          className={forecastKpis.lowestBalance < 0 ? "border-rose-200 bg-rose-50/50" : ""}
        />
      </div>

      {/* Section 2: cash position cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ENTITIES.map(({ id, flag }) => (
          <EntityCashCard key={id} entity={id} flag={flag} positions={latestPositionsByEntity.get(id) ?? []} />
        ))}
      </div>

      {/* Section 3: 90-day cashflow timeline + exception panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-800">90-day Cashflow Timeline</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Stacked weekly inflows / outflows by category, running balance line, minimum-liquidity floor
            </p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v: number) => fmtEur(v)} width={80} />
                <Tooltip
                  formatter={(value: number, name: string) => [fmtEur(Math.abs(value)), name]}
                  labelFormatter={(label, payload) => {
                    const ymdStart = (payload?.[0]?.payload as { weekStartYmd?: string } | undefined)?.weekStartYmd;
                    return ymdStart ? `Week starting ${ymdStart}` : String(label);
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#9ca3af" />
                {minLiquidityFloor > 0 && (
                  <ReferenceLine
                    y={minLiquidityFloor}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: "Min liquidity", position: "right", fill: "#b45309", fontSize: 11 }}
                  />
                )}
                {/* Inflows (positive) */}
                <Bar dataKey="Collections" stackId="cf" fill="#10b981" />
                <Bar dataKey="OtherInflow" stackId="cf" fill="#22c55e" />
                <Bar dataKey="Intercompany" stackId="cf" fill="#a855f7" />
                {/* Outflows (negative) */}
                <Bar dataKey="SupplierPayments" stackId="cf" fill="#ef4444" />
                <Bar dataKey="Payroll" stackId="cf" fill="#f97316" />
                <Bar dataKey="Tax" stackId="cf" fill="#dc2626" />
                <Bar dataKey="DirectDebits" stackId="cf" fill="#fb7185" />
                <Bar dataKey="CardSettlements" stackId="cf" fill="#f59e0b" />
                <Bar dataKey="OtherOutflow" stackId="cf" fill="#94a3b8" />
                <Line type="monotone" dataKey="Running Balance" stroke="#6b7280" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exception panel */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden lg:col-span-1">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-800">Exceptions</h3>
            <p className="mt-0.5 text-xs text-gray-500">Pinch points and unusual items</p>
          </div>
          {exceptions.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-gray-500">No exceptions detected.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {exceptions.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                        e.severity === "danger"
                          ? "bg-rose-500"
                          : e.severity === "warning"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{e.title}</p>
                      <p className="mt-0.5 text-[11px] text-gray-600">{e.detail}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Section 4: upcoming obligations */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Upcoming Obligations (next 30 days)</h3>
          <p className="mt-0.5 text-xs text-gray-500">{obligations.length} item{obligations.length === 1 ? "" : "s"}</p>
        </div>
        <div className="overflow-x-auto">
          {obligations.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-500">No obligations due in the next 30 days</div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Due Date</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Original</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Confidence</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition">
                    <td className="px-5 py-3 text-sm tabular-nums text-gray-800">{r.dueDate}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{r.entityId}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{r.type}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">{r.description}</td>
                    <td className="px-5 py-3 text-sm tabular-nums text-gray-700 text-right">{r.originalAmount}</td>
                    <td className="px-5 py-3 text-sm font-semibold tabular-nums text-gray-900 text-right">{fmtEur(r.amountEur)}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {r.confidence === "Confirmed" ? "Confirmed" : r.confidence === "Expected" ? "Committed" : r.confidence === "Planned" ? "Discretionary" : "Overdue"}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <ConfidenceBadge value={r.confidence} tier="outflow" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Section 5: expected inflows */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Expected Inflows (next 30 days)</h3>
          <p className="mt-0.5 text-xs text-gray-500">{inflows.length} item{inflows.length === 1 ? "" : "s"}</p>
        </div>
        <div className="overflow-x-auto">
          {inflows.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-500">No inflows expected in the next 30 days</div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Due Date</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Counterparty</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Original</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {inflows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition">
                    <td className="px-5 py-3 text-sm tabular-nums text-gray-800">{r.dueDate}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{r.entityId}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">{r.counterparty}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{r.description}</td>
                    <td className="px-5 py-3 text-sm tabular-nums text-gray-700 text-right">{r.originalAmount}</td>
                    <td className="px-5 py-3 text-sm font-semibold tabular-nums text-emerald-700 text-right">{fmtEur(r.amountEur)}</td>
                    <td className="px-5 py-3 text-sm">
                      <ConfidenceBadge value={r.confidence} tier="inflow" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Section 6: summary footer */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryStat label="Total Cash (EUR)" value={fmtEur(totalCashEur)} icon={<Wallet className="h-4 w-4 text-gray-400" />} />
          <SummaryStat
            label="Expected Inflows"
            value={fmtEur(expectedInflowsEur)}
            valueColor="text-emerald-700"
            icon={<ArrowDownRight className="h-4 w-4 text-emerald-500" />}
          />
          <SummaryStat
            label="Expected Outflows"
            value={fmtEur(expectedOutflowsEur)}
            valueColor="text-rose-700"
            icon={<ArrowUpRight className="h-4 w-4 text-rose-500" />}
          />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-sm font-semibold text-gray-700">Projected Net Position</span>
          <span className={`text-xl font-bold tabular-nums ${projectedNet >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {fmtEur(projectedNet)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Tiny presentational helpers ─────────────────────────────────────

/**
 * Translates the underlying `FinanceConfidence` enum to the CFO-style tier label
 * (Confirmed / Probable / Stretch for inflows; Confirmed / Committed / Discretionary for outflows).
 * Pass `tier="overdue"` to render the dedicated Overdue style.
 */
function ConfidenceBadge({
  value,
  tier = "inflow",
}: {
  value: "Confirmed" | "Expected" | "Planned" | "Overdue";
  tier?: "inflow" | "outflow" | "overdue";
}) {
  const styles =
    value === "Confirmed"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : value === "Expected"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : value === "Planned"
      ? "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
      : "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  // Display label translation: Confirmed stays; Expected/Planned vary by tier.
  let label: string = value;
  if (value === "Expected") label = tier === "outflow" ? "Committed" : "Probable";
  if (value === "Planned") label = tier === "outflow" ? "Discretionary" : "Stretch";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles}`}>{label}</span>;
}

function SummaryStat({
  label,
  value,
  icon,
  valueColor = "text-gray-900",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50/60 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <p className={`mt-1 text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      </div>
      {icon}
    </div>
  );
}

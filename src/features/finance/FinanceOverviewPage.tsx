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
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { useAppStore } from "../../store/db";
import type {
  FinanceCashPosition,
  FinanceCounterparty,
  FinanceCurrencyCode,
  OurEntity,
} from "../../store/types";
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

  // ── Section 3: 90-day weekly buckets ───────────────────────────────
  const chartData = useMemo(() => {
    const WEEKS = 13; // 13 weeks ≈ 91 days, covers the 90-day window
    const buckets: { idx: number; label: string; weekStartYmd: string; inflow: number; outflow: number }[] = [];
    for (let i = 0; i < WEEKS; i++) {
      const start = addDays(today, i * 7);
      buckets.push({ idx: i, label: ymd(start), weekStartYmd: ymd(start), inflow: 0, outflow: 0 });
    }
    const addOutflow = (dateStr: string, eur: number) => {
      const idx = getWeekBucket(dateStr, today);
      if (idx >= 0 && idx < WEEKS) buckets[idx]!.outflow += eur;
    };
    const addInflow = (dateStr: string, eur: number) => {
      const idx = getWeekBucket(dateStr, today);
      if (idx >= 0 && idx < WEEKS) buckets[idx]!.inflow += eur;
    };

    // Outflows
    for (const p of projections) {
      if (p.status !== "Pending") continue;
      if (p.direction === "Outflow") addOutflow(p.dueDate, p.amountEur);
      else if (p.direction === "Inflow") addInflow(p.dueDate, p.amountEur);
    }
    for (const s of creditCardStatements) {
      if (s.status !== "Paid") addOutflow(s.dueDate, s.totalAmountEur);
    }
    for (const dd of directDebits) {
      if (dd.status === "Active") addOutflow(dd.nextDueDate, dd.amountEur);
    }
    // Inflows from open / planned receivables
    for (const item of arapItems) {
      if (
        item.direction === "Receivable" &&
        (item.status === "Open" || item.status === "Planned") &&
        item.dueDate
      ) {
        addInflow(item.dueDate, item.amountEur);
      }
    }

    // Running balance starting from total cash
    const startingBalance = cashPositions.reduce((s, p) => s + p.amountEur, 0);
    let running = startingBalance;
    return buckets.map((b) => {
      running = running + b.inflow - b.outflow;
      return {
        weekLabel: b.label.slice(5), // "MM-DD"
        weekStartYmd: b.weekStartYmd,
        Inflows: Math.round(b.inflow),
        Outflows: -Math.round(b.outflow),
        "Running Balance": Math.round(running),
      };
    });
  }, [today, projections, creditCardStatements, directDebits, arapItems, cashPositions]);

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
        <UiPageHeader title="Cashflow Planning" subtitle="Entity treasury positions and 90-day cash flow projection" />
        {asOfLabel && (
          <span className="pb-1 text-xs text-gray-500">As of <span className="font-medium text-gray-700">{asOfLabel}</span></span>
        )}
      </div>

      {/* Section 2: cash position cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ENTITIES.map(({ id, flag }) => (
          <EntityCashCard key={id} entity={id} flag={flag} positions={latestPositionsByEntity.get(id) ?? []} />
        ))}
      </div>

      {/* Section 3: 90-day cashflow timeline */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">90-day Cashflow Timeline</h3>
          <p className="mt-0.5 text-xs text-gray-500">Weekly buckets · all amounts in EUR</p>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v: number) => fmtEur(v)} width={80} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "Outflows" ? fmtEur(Math.abs(value)) : fmtEur(value),
                  name,
                ]}
                labelFormatter={(label, payload) => {
                  const ymdStart = (payload?.[0]?.payload as { weekStartYmd?: string } | undefined)?.weekStartYmd;
                  return ymdStart ? `Week starting ${ymdStart}` : String(label);
                }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#9ca3af" />
              <Bar dataKey="Inflows" stackId="cf" fill="#22c55e" />
              <Bar dataKey="Outflows" stackId="cf" fill="#ef4444" />
              <Line type="monotone" dataKey="Running Balance" stroke="#6b7280" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
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
                    <td className="px-5 py-3 text-sm text-gray-700">{r.confidence}</td>
                    <td className="px-5 py-3 text-sm">
                      <ConfidenceBadge value={r.confidence} />
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
                      <ConfidenceBadge value={r.confidence} />
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

function ConfidenceBadge({ value }: { value: "Confirmed" | "Expected" | "Planned" | "Overdue" }) {
  const styles =
    value === "Confirmed"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : value === "Expected"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : value === "Planned"
      ? "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
      : "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles}`}>{value}</span>;
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

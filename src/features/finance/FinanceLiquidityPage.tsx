import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  Building2,
  Eye,
  Layers,
  Lock,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { useAppStore } from "../../store/db";
import type {
  FinanceBankAccount,
  FinanceCashPosition,
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

const ENTITY_FLAGS: Record<OurEntity, string> = {
  UK: "🇬🇧",
  USA: "🇺🇸",
  TR: "🇹🇷",
};

const CURRENCY_COLORS: Record<FinanceCurrencyCode, string> = {
  EUR: "#1e3a5f",
  GBP: "#3b82f6",
  USD: "#10b981",
  TRY: "#ef4444",
  CHF: "#a855f7",
  AED: "#f59e0b",
};

const ALL_ENTITIES: readonly OurEntity[] = ["UK", "USA", "TR"] as const;

function fmtEur(amount: number): string {
  return `€${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtOriginal(amount: number, currency: FinanceCurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

// ─── Page ────────────────────────────────────────────────────────────

export function FinanceLiquidityPage() {
  const cashPositions = useAppStore((s) => s.financeCashPositions);
  const bankAccounts = useAppStore((s) => s.financeBankAccounts);
  const thresholds = useAppStore((s) => s.financeLiquidityThresholds);
  const bankConnections = useAppStore((s) => s.financeBankConnections);

  const connByAccount = useMemo(() => {
    const m = new Map<string, (typeof bankConnections)[number]>();
    for (const c of bankConnections) m.set(c.bankAccountId, c);
    return m;
  }, [bankConnections]);

  // Latest cash position per (entity, currency, bankAccount).
  const latest = useMemo(() => {
    const sorted = cashPositions.slice().sort((a, b) => (b.asOf ?? "").localeCompare(a.asOf ?? ""));
    const seen = new Set<string>();
    const out: FinanceCashPosition[] = [];
    for (const p of sorted) {
      const key = `${p.entityId}:${p.currency}:${p.bankAccountId ?? "_"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  }, [cashPositions]);

  const asOfLabel = useMemo(() => {
    const dates = cashPositions.map((p) => p.asOf).filter(Boolean).sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  }, [cashPositions]);

  const banksById = useMemo(() => {
    const m = new Map<string, FinanceBankAccount>();
    for (const b of bankAccounts) m.set(b.id, b);
    return m;
  }, [bankAccounts]);

  const thresholdByEntity = useMemo(() => {
    const m = new Map<OurEntity, number>();
    for (const t of thresholds) m.set(t.entityId, t.minOperatingCashEur);
    return m;
  }, [thresholds]);

  // Aggregations.
  const aggregates = useMemo(() => {
    let totalEur = 0;
    let restrictedEur = 0;
    let availableEur = 0;
    let connectedEur = 0;
    let manualEur = 0;
    const byEntity = new Map<OurEntity, number>();
    const byCurrency = new Map<FinanceCurrencyCode, number>();
    const byBank = new Map<string, number>();
    /** byEntityCurrency[entity][currency] = sum (EUR) */
    const byEntityCurrency = new Map<OurEntity, Map<FinanceCurrencyCode, number>>();

    for (const p of latest) {
      totalEur += p.amountEur;
      if (p.source === "BankFeed") connectedEur += p.amountEur;
      else manualEur += p.amountEur;

      const ba = p.bankAccountId ? banksById.get(p.bankAccountId) : undefined;
      const isRestricted = ba?.restricted ?? false;
      if (isRestricted) restrictedEur += p.amountEur;
      else availableEur += p.amountEur;

      byEntity.set(p.entityId, (byEntity.get(p.entityId) ?? 0) + p.amountEur);
      byCurrency.set(p.currency, (byCurrency.get(p.currency) ?? 0) + p.amountEur);
      const bankName = ba?.bankName ?? "Manual / Unknown";
      byBank.set(bankName, (byBank.get(bankName) ?? 0) + p.amountEur);

      const inner = byEntityCurrency.get(p.entityId) ?? new Map<FinanceCurrencyCode, number>();
      inner.set(p.currency, (inner.get(p.currency) ?? 0) + p.amountEur);
      byEntityCurrency.set(p.entityId, inner);
    }

    return {
      totalEur,
      availableEur,
      restrictedEur,
      connectedEur,
      manualEur,
      byEntity,
      byCurrency,
      byBank,
      byEntityCurrency,
    };
  }, [latest, banksById]);

  // Concentrations.
  const visibilityPct = aggregates.totalEur > 0 ? aggregates.connectedEur / aggregates.totalEur : 0;
  const topEntityEur = useMemo(() => {
    let max = 0;
    for (const v of aggregates.byEntity.values()) if (v > max) max = v;
    return max;
  }, [aggregates.byEntity]);
  const concentrationTopEntityPct = aggregates.totalEur > 0 ? topEntityEur / aggregates.totalEur : 0;
  const top3BanksPct = useMemo(() => {
    if (aggregates.totalEur === 0) return 0;
    const sorted = Array.from(aggregates.byBank.values()).sort((a, b) => b - a).slice(0, 3);
    const sum = sorted.reduce((s, v) => s + v, 0);
    return sum / aggregates.totalEur;
  }, [aggregates.byBank, aggregates.totalEur]);

  // Threshold checks.
  const totalThresholdEur = useMemo(() => {
    let s = 0;
    for (const v of thresholdByEntity.values()) s += v;
    return s;
  }, [thresholdByEntity]);
  const thresholdBreaches = useMemo(() => {
    const out: Array<{ entityId: OurEntity; min: number; actualAvailable: number; gap: number }> = [];
    // Per-entity available EUR.
    const perEntityAvailable = new Map<OurEntity, number>();
    for (const p of latest) {
      const ba = p.bankAccountId ? banksById.get(p.bankAccountId) : undefined;
      if (ba?.restricted) continue;
      perEntityAvailable.set(p.entityId, (perEntityAvailable.get(p.entityId) ?? 0) + p.amountEur);
    }
    for (const [entityId, min] of thresholdByEntity) {
      const actual = perEntityAvailable.get(entityId) ?? 0;
      if (actual < min) out.push({ entityId, min, actualAvailable: actual, gap: min - actual });
    }
    return out;
  }, [latest, banksById, thresholdByEntity]);

  // Currencies sorted by amount desc.
  const currencyBreakdown = useMemo(() => {
    return Array.from(aggregates.byCurrency.entries()).sort((a, b) => b[1] - a[1]);
  }, [aggregates.byCurrency]);

  // Stacked bar dataset: one row per entity, one stacked series per currency.
  const stackedData = useMemo(() => {
    const presentCurrencies = new Set<FinanceCurrencyCode>();
    for (const inner of aggregates.byEntityCurrency.values()) {
      for (const k of inner.keys()) presentCurrencies.add(k);
    }
    return ALL_ENTITIES.map((entity) => {
      const inner = aggregates.byEntityCurrency.get(entity) ?? new Map<FinanceCurrencyCode, number>();
      const row: Record<string, string | number> = { entity };
      for (const ccy of presentCurrencies) {
        row[ccy] = Math.round(inner.get(ccy) ?? 0);
      }
      return row;
    });
  }, [aggregates.byEntityCurrency]);

  const stackedKeys = useMemo(() => {
    const keys = new Set<FinanceCurrencyCode>();
    for (const inner of aggregates.byEntityCurrency.values()) {
      for (const k of inner.keys()) keys.add(k);
    }
    return Array.from(keys).sort();
  }, [aggregates.byEntityCurrency]);

  // Bank-level rows (latest per (bank,currency)) for the bottom table.
  const bankRows = useMemo(() => {
    type Row = {
      bankAccount: FinanceBankAccount;
      positions: FinanceCashPosition[];
      totalEur: number;
    };
    const map = new Map<string, Row>();
    for (const ba of bankAccounts) {
      map.set(ba.id, { bankAccount: ba, positions: [], totalEur: 0 });
    }
    for (const p of latest) {
      if (!p.bankAccountId) continue;
      const row = map.get(p.bankAccountId);
      if (!row) continue;
      row.positions.push(p);
      row.totalEur += p.amountEur;
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.bankAccount.entityId !== b.bankAccount.entityId)
        return a.bankAccount.entityId.localeCompare(b.bankAccount.entityId);
      return a.bankAccount.bankName.localeCompare(b.bankAccount.bankName);
    });
  }, [latest, bankAccounts]);

  // Waterfall data: opening (total) → −restricted → −min liquidity threshold = headroom.
  const waterfall = useMemo(() => {
    const totalCash = aggregates.totalEur;
    const afterRestricted = totalCash - aggregates.restrictedEur;
    const headroom = afterRestricted - totalThresholdEur;
    return {
      total: Math.round(totalCash),
      restricted: Math.round(aggregates.restrictedEur),
      available: Math.round(afterRestricted),
      threshold: Math.round(totalThresholdEur),
      headroom: Math.round(headroom),
    };
  }, [aggregates.totalEur, aggregates.restrictedEur, totalThresholdEur]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <UiPageHeader title="Group Liquidity" subtitle="Treasury position across entities, banks, currencies, and sources" />
        {asOfLabel && (
          <span className="pb-1 text-xs text-gray-500">
            As of <span className="font-medium text-gray-700">{asOfLabel}</span>
          </span>
        )}
      </div>

      {/* KPI strip — 6 cards. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <UiKpiCard label="Total Cash (EUR)" value={fmtEur(aggregates.totalEur)} icon={<Wallet className="h-5 w-5" />} />
        <UiKpiCard
          label="Available"
          value={fmtEur(aggregates.availableEur)}
          icon={<Banknote className="h-5 w-5" />}
          trend={{ value: `Restricted ${fmtEur(aggregates.restrictedEur)}`, positive: true }}
        />
        <UiKpiCard
          label="By Base Currency"
          value={
            currencyBreakdown.length > 0
              ? `${currencyBreakdown[0]![0]} ${fmtPct(currencyBreakdown[0]![1] / Math.max(1, aggregates.totalEur))}`
              : "—"
          }
          icon={<Layers className="h-5 w-5" />}
          trend={
            currencyBreakdown.length > 1
              ? {
                  value: `${currencyBreakdown[1]![0]} ${fmtPct(currencyBreakdown[1]![1] / Math.max(1, aggregates.totalEur))}`,
                  positive: true,
                }
              : undefined
          }
        />
        <UiKpiCard
          label="Top-3 Banks Concentration"
          value={fmtPct(top3BanksPct)}
          icon={<Building2 className="h-5 w-5" />}
          className={
            top3BanksPct >= 0.85
              ? "border-rose-200 bg-rose-50/50"
              : top3BanksPct >= 0.7
              ? "border-amber-200 bg-amber-50/50"
              : ""
          }
          trend={{
            value: `Top entity ${fmtPct(concentrationTopEntityPct)}`,
            positive: concentrationTopEntityPct < 0.7,
          }}
        />
        <UiKpiCard
          label="Cash Visibility"
          value={fmtPct(visibilityPct)}
          icon={<Eye className="h-5 w-5" />}
          trend={{ value: `Bank feed ${fmtEur(aggregates.connectedEur)}`, positive: true }}
        />
        <UiKpiCard
          label="Threshold Breaches"
          value={thresholdBreaches.length > 0 ? `${thresholdBreaches.length} entity(s)` : "OK"}
          icon={<ShieldAlert className="h-5 w-5" />}
          className={thresholdBreaches.length > 0 ? "border-rose-200 bg-rose-50/50" : "border-emerald-200 bg-emerald-50/40"}
        />
      </div>

      {/* Waterfall card. */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">Cash Waterfall (EUR)</h3>
        <p className="mt-0.5 text-xs text-gray-500">Total → minus restricted → minus minimum liquidity = headroom</p>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <WaterfallStep label="Total cash" value={waterfall.total} tone="neutral" />
          <WaterfallStep label="− Restricted" value={waterfall.restricted} tone="negative" />
          <WaterfallStep label="= Available" value={waterfall.available} tone="positive" />
          <WaterfallStep label="− Min liquidity" value={waterfall.threshold} tone="negative" />
          <WaterfallStep
            label="= Headroom"
            value={waterfall.headroom}
            tone={waterfall.headroom >= 0 ? "positive" : "danger"}
          />
        </div>
        {thresholdBreaches.length > 0 && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800">
            <p className="font-semibold">Threshold breaches</p>
            <ul className="mt-1 space-y-0.5">
              {thresholdBreaches.map((b) => (
                <li key={b.entityId}>
                  <span className="mr-1">{ENTITY_FLAGS[b.entityId]}</span>
                  <span className="font-medium">{b.entityId}</span>: available {fmtEur(b.actualAvailable)} vs minimum{" "}
                  {fmtEur(b.min)} (gap {fmtEur(b.gap)})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Stacked bar by entity + currency. */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Cash by Entity & Currency</h3>
          <p className="mt-0.5 text-xs text-gray-500">EUR-equivalent, stacked per currency</p>
        </div>
        <div className="p-5">
          {stackedKeys.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No cash positions recorded.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stackedData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="entity" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v: number) => fmtEur(v)} width={80} />
                <Tooltip formatter={(value: number, name: string) => [fmtEur(value), name]} />
                <Legend />
                {stackedKeys.map((ccy) => (
                  <Bar key={ccy} dataKey={ccy} stackId="cash" fill={CURRENCY_COLORS[ccy] ?? "#94a3b8"} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bank accounts table. */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Bank Accounts</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Owners, restricted flags, last sync, and balance per account
          </p>
        </div>

        {bankRows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Banknote className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No bank accounts recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Bank / Account</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Currency</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Balance</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Owner</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Last sync</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Flags</th>
                </tr>
              </thead>
              <tbody>
                {bankRows.map((r) => {
                  const ba = r.bankAccount;
                  const primaryPosition = r.positions.find((p) => p.currency === ba.currency) ?? r.positions[0];
                  return (
                    <tr key={ba.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition">
                      <td className="px-5 py-3 text-sm text-gray-800">
                        <span className="mr-1.5">{ENTITY_FLAGS[ba.entityId]}</span>
                        <span className="font-medium">{ba.entityId}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-900">
                        <div className="font-medium">{ba.bankName}</div>
                        <div className="text-[11px] text-gray-500">
                          {ba.accountName}
                          {ba.accountNumberMasked && (
                            <span className="ml-1 font-mono">· {ba.accountNumberMasked}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">{ba.currency}</td>
                      <td className="px-5 py-3 text-sm tabular-nums text-gray-800 text-right">
                        {primaryPosition ? fmtOriginal(primaryPosition.amountOriginal, primaryPosition.currency) : "—"}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold tabular-nums text-gray-900 text-right">
                        {fmtEur(r.totalEur)}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">{ba.ownerUserId ?? "—"}</td>
                      <td className="px-5 py-3 text-xs font-mono text-gray-600">{ba.lastSyncAt ? ba.lastSyncAt.slice(0, 10) : "—"}</td>
                      <td className="px-5 py-3 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {ba.restricted && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-200">
                              <Lock className="h-2.5 w-2.5" /> Restricted
                            </span>
                          )}
                          {!ba.includedInForecast && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200">
                              Not in forecast
                            </span>
                          )}
                          {(() => {
                            const conn = connByAccount.get(ba.id);
                            if (!conn) {
                              // Fallback to source-based chip if no connection record yet.
                              if (primaryPosition?.source === "Manual")
                                return (
                                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                                    Manual
                                  </span>
                                );
                              if (primaryPosition?.source === "BankFeed")
                                return (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                                    Bank feed
                                  </span>
                                );
                              return null;
                            }
                            const tone =
                              conn.status === "Connected"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : conn.status === "Stale"
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : conn.status === "Error"
                                ? "bg-rose-50 text-rose-700 ring-rose-200"
                                : "bg-gray-100 text-gray-600 ring-gray-200";
                            return (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${tone}`}
                                title={conn.kind + (conn.errorMessage ? ` · ${conn.errorMessage}` : "")}
                              >
                                {conn.kind === "Manual" ? "Manual" : conn.kind === "BankFeed" ? "Bank feed" : "API"} ·{" "}
                                {conn.status}
                              </span>
                            );
                          })()}
                          {ba.status !== "Active" && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200">
                              {ba.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function WaterfallStep({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "positive" | "negative" | "danger";
}) {
  const color =
    tone === "negative"
      ? "text-rose-700"
      : tone === "positive"
      ? "text-emerald-700"
      : tone === "danger"
      ? "text-rose-700"
      : "text-gray-900";
  const ring =
    tone === "danger"
      ? "border-rose-200 bg-rose-50/40"
      : tone === "positive"
      ? "border-emerald-200 bg-emerald-50/40"
      : "border-gray-200 bg-gray-50/40";
  return (
    <div className={`rounded-lg border ${ring} p-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{fmtEur(value)}</p>
    </div>
  );
}

import { useMemo } from "react";
import { Link2, ShieldCheck, Triangle } from "lucide-react";
import { useAppStore } from "../../store/db";
import type {
  FinanceARAPItem,
  FinanceCounterparty,
  FinanceCurrencyCode,
  OurEntity,
} from "../../store/types";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { UiPageHeader } from "../../ui/UiPageHeader";

// ─── Local helpers ───────────────────────────────────────────────────

const ENTITY_FLAGS: Record<OurEntity, string> = {
  UK: "🇬🇧",
  USA: "🇺🇸",
  TR: "🇹🇷",
};

const ALL_ENTITIES: readonly OurEntity[] = ["UK", "USA", "TR"] as const;

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

// ─── Page ────────────────────────────────────────────────────────────

export function FinanceIntercompanyPage() {
  const arapItems = useAppStore((s) => s.financeARAPItems);
  const counterparties = useAppStore((s) => s.financeCounterparties);

  // Resolve "is intercompany" for every item.
  const cpById = useMemo(() => {
    const m = new Map<string, FinanceCounterparty>();
    for (const c of counterparties) m.set(c.id, c);
    return m;
  }, [counterparties]);

  const icItems = useMemo(() => {
    return arapItems.filter((it) => {
      if (it.intercompany) return true;
      const cp = cpById.get(it.counterpartyId);
      return cp?.type === "Internal";
    });
  }, [arapItems, cpById]);

  const openIcItems = useMemo(
    () => icItems.filter((it) => it.status !== "Paid" && it.status !== "Cancelled"),
    [icItems],
  );

  // Pair items: a Receivable in entity A is plausibly the counterparty of a
  // Payable in entity B if amounts match (EUR) and due dates are within ±3 days.
  type Pair = {
    receivable: FinanceARAPItem;
    payable: FinanceARAPItem | null;
    amountEur: number;
  };

  const { pairs, unmatched } = useMemo(() => {
    const receivables = openIcItems.filter((it) => it.direction === "Receivable");
    const payables = openIcItems.filter((it) => it.direction === "Payable");
    const usedPay = new Set<string>();
    const matched: Pair[] = [];
    for (const r of receivables) {
      const dueR = r.dueDate ?? r.issueDate;
      const dueRMs = new Date(`${dueR.slice(0, 10)}T12:00:00Z`).getTime();
      const candidate = payables.find((p) => {
        if (usedPay.has(p.id)) return false;
        if (Math.abs(p.amountEur - r.amountEur) > 1) return false;
        const dueP = p.dueDate ?? p.issueDate;
        const dueDiffDays = Math.abs(
          (new Date(`${dueP.slice(0, 10)}T12:00:00Z`).getTime() - dueRMs) / (24 * 60 * 60 * 1000),
        );
        return dueDiffDays <= 3 && p.entityId !== r.entityId;
      });
      if (candidate) {
        usedPay.add(candidate.id);
        matched.push({ receivable: r, payable: candidate, amountEur: r.amountEur });
      } else {
        matched.push({ receivable: r, payable: null, amountEur: r.amountEur });
      }
    }
    const unmatchedPayables = payables.filter((p) => !usedPay.has(p.id));
    return { pairs: matched, unmatched: unmatchedPayables };
  }, [openIcItems]);

  // 3x3 entity matrix — cell [A][B] = sum of EUR where A is Receivable from B.
  const matrix = useMemo(() => {
    const m: Record<OurEntity, Record<OurEntity, number>> = {
      UK: { UK: 0, USA: 0, TR: 0 },
      USA: { UK: 0, USA: 0, TR: 0 },
      TR: { UK: 0, USA: 0, TR: 0 },
    };
    for (const pair of pairs) {
      if (!pair.payable) continue;
      // Receivable side claims it from payable's entity.
      m[pair.receivable.entityId][pair.payable.entityId] += pair.amountEur;
    }
    return m;
  }, [pairs]);

  // KPIs.
  const totalGrossEur = useMemo(() => openIcItems.reduce((s, it) => s + it.amountEur, 0) / 2, [openIcItems]);
  const totalMatchedEur = useMemo(
    () => pairs.filter((p) => p.payable).reduce((s, p) => s + p.amountEur, 0),
    [pairs],
  );
  const totalUnmatchedEur = useMemo(
    () =>
      pairs.filter((p) => !p.payable).reduce((s, p) => s + p.amountEur, 0) +
      unmatched.reduce((s, p) => s + p.amountEur, 0),
    [pairs, unmatched],
  );

  return (
    <div className="space-y-5">
      <UiPageHeader title="Intercompany Balances" subtitle="Pairwise entity exposures driven by Internal-counterparty AR/AP" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiKpiCard
          label="Open Intercompany Items"
          value={openIcItems.length}
          icon={<Link2 className="h-5 w-5" />}
        />
        <UiKpiCard
          label="Gross IC Exposure (EUR)"
          value={fmtEur(totalGrossEur)}
          icon={<Link2 className="h-5 w-5" />}
        />
        <UiKpiCard
          label="Matched"
          value={fmtEur(totalMatchedEur)}
          icon={<ShieldCheck className="h-5 w-5" />}
          className="border-emerald-200 bg-emerald-50/40"
        />
        <UiKpiCard
          label="Unmatched"
          value={fmtEur(totalUnmatchedEur)}
          icon={<Triangle className="h-5 w-5" />}
          className={totalUnmatchedEur > 0 ? "border-rose-200 bg-rose-50/50" : ""}
        />
      </div>

      {/* Matrix */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Pairwise Matrix</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Row = entity that has a <span className="font-medium text-emerald-700">Receivable</span> · Column = entity
            that has the matching <span className="font-medium text-rose-700">Payable</span> · cells in EUR
          </p>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">From ↓ / To →</th>
                {ALL_ENTITIES.map((to) => (
                  <th
                    key={to}
                    className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right"
                  >
                    <span className="mr-1">{ENTITY_FLAGS[to]}</span>
                    {to}
                  </th>
                ))}
                <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {ALL_ENTITIES.map((from) => {
                const rowTotal = ALL_ENTITIES.reduce((s, to) => s + (matrix[from][to] ?? 0), 0);
                return (
                  <tr key={from} className="border-t border-gray-100">
                    <td className="px-5 py-2 text-sm font-medium text-gray-900">
                      <span className="mr-1.5">{ENTITY_FLAGS[from]}</span>
                      {from}
                    </td>
                    {ALL_ENTITIES.map((to) => {
                      const v = matrix[from][to] ?? 0;
                      const isDiagonal = from === to;
                      return (
                        <td
                          key={to}
                          className={`px-5 py-2 text-right text-sm tabular-nums ${
                            isDiagonal ? "text-gray-300" : v > 0 ? "font-semibold text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {isDiagonal ? "—" : v > 0 ? fmtEur(v) : "0"}
                        </td>
                      );
                    })}
                    <td className="px-5 py-2 text-right text-sm font-bold tabular-nums text-gray-900">
                      {fmtEur(rowTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pairs */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Pair-up</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Receivable side and matching Payable side (paired when amounts and due dates align).
          </p>
        </div>
        {pairs.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">No open intercompany items.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Receivable side</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Payable side</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">EUR</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Match</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((p) => (
                  <tr key={p.receivable.id} className="border-b border-gray-50">
                    <td className="px-5 py-3 text-sm">
                      <div className="font-medium text-gray-900">
                        <span className="mr-1.5">{ENTITY_FLAGS[p.receivable.entityId]}</span>
                        {p.receivable.entityId} · {p.receivable.description}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Due {p.receivable.dueDate ?? p.receivable.issueDate} ·{" "}
                        {fmtOriginal(p.receivable.amountOriginal, p.receivable.currency)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold tabular-nums text-emerald-700 text-right">
                      {fmtEur(p.receivable.amountEur)}
                    </td>
                    {p.payable ? (
                      <>
                        <td className="px-5 py-3 text-sm">
                          <div className="font-medium text-gray-900">
                            <span className="mr-1.5">{ENTITY_FLAGS[p.payable.entityId]}</span>
                            {p.payable.entityId} · {p.payable.description}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            Due {p.payable.dueDate ?? p.payable.issueDate} ·{" "}
                            {fmtOriginal(p.payable.amountOriginal, p.payable.currency)}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold tabular-nums text-rose-700 text-right">
                          {fmtEur(p.payable.amountEur)}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                            Matched
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 text-sm text-gray-400 italic">No matching payable found</td>
                        <td className="px-5 py-3 text-sm text-gray-400 text-right">—</td>
                        <td className="px-5 py-3 text-xs">
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
                            Unmatched receivable
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {unmatched.length > 0 &&
                  unmatched.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-400 italic">No matching receivable found</td>
                      <td className="px-5 py-3 text-sm text-gray-400 text-right">—</td>
                      <td className="px-5 py-3 text-sm">
                        <div className="font-medium text-gray-900">
                          <span className="mr-1.5">{ENTITY_FLAGS[p.entityId]}</span>
                          {p.entityId} · {p.description}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Due {p.dueDate ?? p.issueDate} · {fmtOriginal(p.amountOriginal, p.currency)}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold tabular-nums text-rose-700 text-right">
                        {fmtEur(p.amountEur)}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                          Unmatched payable
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

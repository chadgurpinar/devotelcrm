import { useMemo, useState } from "react";
import { useAppStore } from "../../store/db";
import type { HrCurrencyCode, OurEntity } from "../../store/types";
import {
  bucketCashflow,
  materializeRecurringExpenses,
  txToVirtualItem,
  type CashflowGranularity,
  type VirtualCashflowItem,
} from "./financeUtils";

export type CashflowRangePreset = "30" | "60" | "90" | "custom";

export interface CashflowPlanFilters {
  preset: CashflowRangePreset;
  fromYmd: string;
  toYmd: string;
  entityIds: OurEntity[];
  granularity: CashflowGranularity;
}

function ymdInDays(n: number): string {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function useCashflowPlan() {
  const transactions = useAppStore((s) => s.finArApTransactions);
  const expenses = useAppStore((s) => s.finInternalExpenses);
  const balances = useAppStore((s) => s.finEntityCashBalances);
  const fx = useAppStore((s) => s.hrFxRates);

  const today = new Date().toISOString().slice(0, 10);

  const [filters, setFilters] = useState<CashflowPlanFilters>({
    preset: "60",
    fromYmd: today,
    toYmd: ymdInDays(60),
    entityIds: ["USA", "UK", "TR"],
    granularity: "daily",
  });

  function setPreset(preset: CashflowRangePreset) {
    if (preset === "custom") {
      setFilters((prev) => ({ ...prev, preset }));
      return;
    }
    const days = Number(preset);
    setFilters((prev) => ({ ...prev, preset, fromYmd: today, toYmd: ymdInDays(days) }));
  }

  const items: VirtualCashflowItem[] = useMemo(() => {
    const txItems = transactions
      .filter((t) => filters.entityIds.includes(t.entityId))
      .map(txToVirtualItem)
      .filter((x): x is VirtualCashflowItem => x !== null);
    const expItems = materializeRecurringExpenses(
      expenses.filter((e) => filters.entityIds.includes(e.entityId)),
      filters.fromYmd,
      filters.toYmd,
    );
    return [...txItems, ...expItems];
  }, [transactions, expenses, filters.entityIds, filters.fromYmd, filters.toYmd]);

  const openingByEntity = useMemo(() => {
    const m = new Map<OurEntity, { amount: number; currency: HrCurrencyCode }>();
    for (const b of balances) {
      if (!filters.entityIds.includes(b.entityId)) continue;
      m.set(b.entityId, { amount: b.openingBalance, currency: b.currency });
    }
    return m;
  }, [balances, filters.entityIds]);

  const cashflow = useMemo(
    () =>
      bucketCashflow({
        items,
        fromYmd: filters.fromYmd,
        toYmd: filters.toYmd,
        granularity: filters.granularity,
        fx,
        openingByEntity,
      }),
    [items, filters.fromYmd, filters.toYmd, filters.granularity, fx, openingByEntity],
  );

  const inflowItems = useMemo(
    () => items.filter((i) => i.direction === "Receivable").sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [items],
  );
  const outflowItems = useMemo(
    () => items.filter((i) => i.direction === "Payable").sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [items],
  );

  return {
    filters,
    setFilters,
    setPreset,
    items,
    inflowItems,
    outflowItems,
    cashflow,
    today,
  };
}

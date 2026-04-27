import { ArrowDownLeft, ArrowUpRight, Scale, Wallet, TrendingDown } from "lucide-react";
import { UiKpiCard } from "../../../ui/UiKpiCard";
import type { CashflowComputed } from "../financeUtils";

function fmt(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  const sign = n < 0 ? "-" : "";
  return `${sign}€${s}`;
}

export function CashflowKpiStrip({ cashflow }: { cashflow: CashflowComputed }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <UiKpiCard label="Opening cash" value={fmt(cashflow.openingBalance)} icon={<Wallet size={18} />} />
      <UiKpiCard label="Inflows" value={fmt(cashflow.inflowsTotal)} icon={<ArrowDownLeft size={18} />} />
      <UiKpiCard label="Outflows" value={fmt(cashflow.outflowsTotal)} icon={<ArrowUpRight size={18} />} />
      <UiKpiCard label="Net cashflow" value={fmt(cashflow.netTotal)} icon={<Scale size={18} />} />
      <UiKpiCard label="Closing / max dip" value={`${fmt(cashflow.closingBalance)} / ${fmt(cashflow.maxDip)}`} icon={<TrendingDown size={18} />} />
    </div>
  );
}

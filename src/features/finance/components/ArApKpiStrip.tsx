import { ArrowDownLeft, ArrowUpRight, Scale, Timer } from "lucide-react";
import { UiKpiCard } from "../../../ui/UiKpiCard";

function fmt(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  const sign = n < 0 ? "-" : "";
  return `${sign}€${s}`;
}

export function ArApKpiStrip({
  kpis,
}: {
  kpis: { totalReceivablesEur: number; totalPayablesEur: number; netPositionEur: number; netCashNext30Eur: number };
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiKpiCard label="Receivables (open)" value={fmt(kpis.totalReceivablesEur)} icon={<ArrowDownLeft size={18} />} />
      <UiKpiCard label="Payables (open)" value={fmt(kpis.totalPayablesEur)} icon={<ArrowUpRight size={18} />} />
      <UiKpiCard label="Net position" value={fmt(kpis.netPositionEur)} icon={<Scale size={18} />} />
      <UiKpiCard label="Net cash next 30d" value={fmt(kpis.netCashNext30Eur)} icon={<Timer size={18} />} />
    </div>
  );
}


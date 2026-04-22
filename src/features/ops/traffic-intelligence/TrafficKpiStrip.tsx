import { BarChart3, DollarSign, Percent, Send } from "lucide-react";
import { UiKpiCard } from "../../../ui/UiKpiCard";
import type { TrafficKpis } from "./trafficUtils";

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface TrafficKpiStripProps {
  kpis: TrafficKpis;
  trends: {
    volume: { value: string; positive: boolean };
    price: { value: string; positive: boolean };
    profit: { value: string; positive: boolean };
    dlr: { value: string; positive: boolean };
  };
}

export function TrafficKpiStrip({ kpis, trends }: TrafficKpiStripProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiKpiCard label="Total volume (submit)" value={fmtVol(kpis.totalVolume)} icon={<Send size={18} />} trend={trends.volume} />
      <UiKpiCard
        label="Avg sell / msg"
        value={`$${kpis.avgSellPerMsg.toFixed(5)}`}
        icon={<BarChart3 size={18} />}
        trend={trends.price}
      />
      <UiKpiCard
        label="Net profit"
        value={`$${kpis.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        icon={<DollarSign size={18} />}
        trend={trends.profit}
      />
      <UiKpiCard
        label="Avg DLR"
        value={`${(kpis.avgDlr * 100).toFixed(2)}%`}
        icon={<Percent size={18} />}
        trend={trends.dlr}
      />
    </div>
  );
}

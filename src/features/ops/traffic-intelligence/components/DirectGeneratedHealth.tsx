import { UiKpiCard } from "../../../../ui/UiKpiCard";
import { pctTrend, sliceToHealthMetrics, type TrafficTypeSlice } from "../trafficUtils";

interface Props {
  direct: TrafficTypeSlice;
  generated: TrafficTypeSlice;
  directCompare: TrafficTypeSlice;
  generatedCompare: TrafficTypeSlice;
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function DirectGeneratedHealth({ direct, generated, directCompare, generatedCompare }: Props) {
  const d = sliceToHealthMetrics(direct);
  const g = sliceToHealthMetrics(generated);
  const dc = sliceToHealthMetrics(directCompare);
  const gc = sliceToHealthMetrics(generatedCompare);
  const totalVol = d.shareVolume + g.shareVolume;
  const dShare = totalVol > 0 ? d.shareVolume / totalVol : 0;
  const gShare = totalVol > 0 ? g.shareVolume / totalVol : 0;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Direct traffic</h4>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <UiKpiCard
            label="Volume share"
            value={`${(dShare * 100).toFixed(1)}%`}
            className="border-slate-200 !p-3"
            trend={pctTrend(d.shareVolume, dc.shareVolume)}
          />
          <UiKpiCard label="Volume" value={fmtVol(d.shareVolume)} className="border-slate-200 !p-3" />
          <UiKpiCard
            label="Net profit"
            value={`$${d.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            className="border-slate-200 !p-3"
            trend={pctTrend(d.profit, dc.profit)}
          />
          <UiKpiCard label="Avg sell/msg" value={`$${d.avgSell.toFixed(5)}`} className="border-slate-200 !p-3" />
          <UiKpiCard
            label="Avg DLR"
            value={`${(d.avgDlr * 100).toFixed(2)}%`}
            className="border-slate-200 !p-3"
            trend={pctTrend(d.avgDlr, dc.avgDlr)}
          />
          <UiKpiCard label="Margin" value={`${(d.margin * 100).toFixed(1)}%`} className="border-slate-200 !p-3" />
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Hubbed / Generated</h4>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <UiKpiCard
            label="Volume share"
            value={`${(gShare * 100).toFixed(1)}%`}
            className="border-slate-200 !p-3"
            trend={pctTrend(g.shareVolume, gc.shareVolume)}
          />
          <UiKpiCard label="Volume" value={fmtVol(g.shareVolume)} className="border-slate-200 !p-3" />
          <UiKpiCard
            label="Net profit"
            value={`$${g.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            className="border-slate-200 !p-3"
            trend={pctTrend(g.profit, gc.profit)}
          />
          <UiKpiCard label="Avg sell/msg" value={`$${g.avgSell.toFixed(5)}`} className="border-slate-200 !p-3" />
          <UiKpiCard
            label="Avg DLR"
            value={`${(g.avgDlr * 100).toFixed(2)}%`}
            className="border-slate-200 !p-3"
            trend={pctTrend(g.avgDlr, gc.avgDlr)}
          />
          <UiKpiCard label="Margin" value={`${(g.margin * 100).toFixed(1)}%`} className="border-slate-200 !p-3" />
        </div>
      </div>
    </div>
  );
}

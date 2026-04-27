import { useMemo, useState } from "react";
import { Button } from "../../../../components/ui";
import type { WholesaleTrafficRecord } from "../../../../store/types";
import {
  blendedMarginOnDelivered,
  composeQuickSummary,
  topCountryByVolume,
  topTrafficSourceByVolume,
  type TrafficKpis,
} from "../trafficUtils";

interface Props {
  filtered: WholesaleTrafficRecord[];
  dateFrom: string;
  dateTo: string;
  kpis: TrafficKpis;
  kpiTrends: { volume: { value: string }; profit: { value: string }; dlr: { value: string } };
  directVol: number;
  generatedVol: number;
}

export function QuickSummary({ filtered, dateFrom, dateTo, kpis, kpiTrends, directVol, generatedVol }: Props) {
  const [copied, setCopied] = useState(false);
  const text = useMemo(
    () =>
      composeQuickSummary({
        kpis,
        kpiTrends,
        dateFrom,
        dateTo,
        filteredCount: filtered.length,
        topCountries: topCountryByVolume(filtered, 2),
        topSource: topTrafficSourceByVolume(filtered),
        directShare: directVol,
        generatedShare: generatedVol,
        blendedMargin: blendedMarginOnDelivered(filtered),
      }),
    [filtered, dateFrom, dateTo, kpis, kpiTrends, directVol, generatedVol],
  );

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-900">Quick summary</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">{text}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

import { Download } from "lucide-react";
import { Button } from "../../../components/ui";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import type { WholesaleTrafficRecord } from "../../../store/types";
import { TrafficChart } from "./TrafficChart";
import { TrafficFilters } from "./TrafficFilters";
import { TrafficInsights } from "./TrafficInsights";
import { TrafficKpiStrip } from "./TrafficKpiStrip";
import { TrafficTable } from "./TrafficTable";
import { useTrafficData } from "./useTrafficData";

function exportFilteredCsv(rows: WholesaleTrafficRecord[]) {
  const headers = [
    "id",
    "timestamp",
    "trafficType",
    "trafficSourceType",
    "sourceAccount",
    "destinationAccount",
    "senderId",
    "country",
    "operator",
    "submitCount",
    "deliveryCount",
    "buyPrice",
    "sellPrice",
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        esc(r.id),
        esc(r.timestamp),
        esc(r.trafficType),
        esc(r.trafficSourceType),
        esc(r.sourceAccount),
        esc(r.destinationAccount),
        esc(r.senderId),
        esc(r.country),
        esc(r.operator),
        esc(r.submitCount),
        esc(r.deliveryCount),
        esc(r.buyPrice),
        esc(r.sellPrice),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `traffic-intelligence-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TrafficIntelligencePage() {
  const { filtered, filters, filterOptions, kpis, kpiTrends, tableRows } = useTrafficData();

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 pb-10">
      <UiPageHeader
        title="Traffic Intelligence"
        subtitle="Wholesale SMS / A2P traffic monitoring — commercial and delivery analytics on seeded MDR-style data."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
              <label className="text-[10px] font-semibold uppercase text-slate-500">From</label>
              <input
                type="date"
                className="border-0 bg-transparent text-xs text-slate-800 focus:outline-none"
                value={filters.dateFrom}
                onChange={(e) => filters.setDateFrom(e.target.value)}
              />
              <span className="text-slate-300">|</span>
              <label className="text-[10px] font-semibold uppercase text-slate-500">To</label>
              <input
                type="date"
                className="border-0 bg-transparent text-xs text-slate-800 focus:outline-none"
                value={filters.dateTo}
                onChange={(e) => filters.setDateTo(e.target.value)}
              />
            </div>
            <Button size="sm" variant="secondary" type="button" onClick={() => exportFilteredCsv(filtered)}>
              <span className="inline-flex items-center gap-1">
                <Download size={14} /> Export report
              </span>
            </Button>
          </div>
        }
      />

      <TrafficFilters
        trafficSourceTypes={filters.trafficSourceTypes}
        onToggleSource={filters.toggleSource}
        onSelectAllSources={filters.selectAllSources}
        trafficType={filters.trafficType}
        onTrafficType={filters.setTrafficType}
        country={filters.country}
        onCountry={filters.setCountry}
        operator={filters.operator}
        onOperator={filters.setOperator}
        sourceAccount={filters.sourceAccount}
        onSourceAccount={filters.setSourceAccount}
        destinationAccount={filters.destinationAccount}
        onDestinationAccount={filters.setDestinationAccount}
        senderId={filters.senderId}
        onSenderId={filters.setSenderId}
        countries={filterOptions.countries}
        operators={filterOptions.operators}
        sourceAccounts={filterOptions.sourceAccounts}
        destinationAccounts={filterOptions.destinationAccounts}
      />

      <TrafficKpiStrip kpis={kpis} trends={kpiTrends} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <TrafficChart filtered={filtered} />
        </div>
        <div className="lg:col-span-1">
          <TrafficInsights filtered={filtered} />
        </div>
      </div>

      <TrafficTable rows={tableRows} />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui";
import type { TrafficAlertEvent, TrafficSourceType, WholesaleTrafficRecord } from "../../../store/types";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { AlertRuleBuilderModal } from "./components/AlertRuleBuilderModal";
import { AlertsInbox } from "./components/AlertsInbox";
import { ComparisonPicker } from "./components/ComparisonPicker";
import { DirectGeneratedHealth } from "./components/DirectGeneratedHealth";
import { DlrWatchPanel } from "./components/DlrWatchPanel";
import { QualityScorecards } from "./components/QualityScorecards";
import { QuickSummary } from "./components/QuickSummary";
import { RoutesPivotTable } from "./components/RoutesPivotTable";
import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { TopProvidersClients } from "./components/TopProvidersClients";
import { TrafficRiskPanel } from "./components/TrafficRiskPanel";
import { TrafficChart } from "./TrafficChart";
import { TrafficFilters } from "./TrafficFilters";
import { TrafficInsights } from "./TrafficInsights";
import { TrafficKpiStrip } from "./TrafficKpiStrip";
import { TrafficTable } from "./TrafficTable";
import {
  ALL_TRAFFIC_SOURCES,
  blendedMarginOnDelivered,
  composeQuickSummary,
  topCountryByVolume,
  topTrafficSourceByVolume,
  type CompareDimension,
} from "./trafficUtils";
import { useSavedTrafficViews } from "./useSavedTrafficViews";
import { useTrafficData } from "./useTrafficData";

type PageTab = "overview" | "routes" | "risk" | "alerts";

function exportFilteredCsv(
  rows: WholesaleTrafficRecord[],
  meta?: { filterSummary?: string; narrative?: string },
) {
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
  const lines: string[] = [];
  if (meta?.filterSummary) lines.push(`# ${meta.filterSummary}`);
  if (meta?.narrative) lines.push(`# ${meta.narrative}`);
  lines.push(headers.join(","));
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
  const data = useTrafficData();
  const { views, saveView, deleteView } = useSavedTrafficViews();
  const [tab, setTab] = useState<PageTab>("overview");
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [showTopAccounts, setShowTopAccounts] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlHydrated = useRef(false);

  const {
    filtered,
    compareFiltered,
    compareWindow,
    filters,
    filterOptions,
    kpis,
    compareKpis,
    kpiTrends,
    tableRows,
    routeRows,
    splitA,
    splitB,
    chartMode,
    setChartMode,
    metric,
    setMetric,
    granularity,
    setGranularity,
    compareDim,
    setCompareDim,
    comparePreset,
    setComparePreset,
    compareCustomFrom,
    compareCustomTo,
    setCompareCustomFrom,
    setCompareCustomTo,
    applyDrillFilter,
  } = data;

  useEffect(() => {
    if (urlHydrated.current) return;
    urlHydrated.current = true;
    const t = searchParams.get("tab");
    if (t === "routes" || t === "risk" || t === "alerts") setTab(t);
    const c = searchParams.get("country");
    if (c) filters.setCountry(c);
    const o = searchParams.get("operator");
    if (o) filters.setOperator(o);
    const s = searchParams.get("source");
    if (s) filters.setSourceAccount(s);
    const d = searchParams.get("dest");
    if (d) filters.setDestinationAccount(d);
    const cm = searchParams.get("chartMode");
    if (cm === "Trend" || cm === "Compare" || cm === "Mix") setChartMode(cm);
    const m = searchParams.get("metric");
    if (m === "Volume" || m === "Profit" || m === "Margin" || m === "DLR" || m === "Submit" || m === "Delivery") setMetric(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot URL → state hydration
  }, [searchParams]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("tab", tab);
          if (filters.country) p.set("country", filters.country);
          else p.delete("country");
          if (filters.operator) p.set("operator", filters.operator);
          else p.delete("operator");
          if (filters.sourceAccount) p.set("source", filters.sourceAccount);
          else p.delete("source");
          if (filters.destinationAccount) p.set("dest", filters.destinationAccount);
          else p.delete("dest");
          p.set("chartMode", chartMode);
          p.set("metric", metric);
          return p;
        },
        { replace: true },
      );
    }, 400);
    return () => window.clearTimeout(id);
  }, [tab, filters.country, filters.operator, filters.sourceAccount, filters.destinationAccount, chartMode, metric, setSearchParams]);

  const snapshotForSave = useCallback(() => {
    return {
      name: "",
      savedAt: "",
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      comparePreset,
      compareCustomFrom,
      compareCustomTo,
      trafficSourceTypes: filters.trafficSourceTypes,
      trafficType: filters.trafficType,
      country: filters.country,
      operator: filters.operator,
      sourceAccount: filters.sourceAccount,
      destinationAccount: filters.destinationAccount,
      senderId: filters.senderId,
      chartMode,
      metric,
      granularity,
      compareDim,
    };
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.trafficSourceTypes,
    filters.trafficType,
    filters.country,
    filters.operator,
    filters.sourceAccount,
    filters.destinationAccount,
    filters.senderId,
    comparePreset,
    compareCustomFrom,
    compareCustomTo,
    chartMode,
    metric,
    granularity,
    compareDim,
  ]);

  const loadView = useCallback(
    (v: import("./useSavedTrafficViews").SavedTrafficViewV1) => {
      filters.setDateFrom(v.dateFrom);
      filters.setDateTo(v.dateTo);
      setComparePreset(v.comparePreset);
      setCompareCustomFrom(v.compareCustomFrom);
      setCompareCustomTo(v.compareCustomTo);
      if (!v.trafficSourceTypes?.length) filters.selectAllSources();
      else filters.setTrafficSourceTypes(v.trafficSourceTypes);
      filters.setTrafficType(v.trafficType);
      filters.setCountry(v.country);
      filters.setOperator(v.operator);
      filters.setSourceAccount(v.sourceAccount);
      filters.setDestinationAccount(v.destinationAccount);
      filters.setSenderId(v.senderId);
      setChartMode(v.chartMode);
      setMetric(v.metric);
      setGranularity(v.granularity);
      setCompareDim(v.compareDim);
    },
    [filters, setComparePreset, setCompareCustomFrom, setCompareCustomTo, setChartMode, setMetric, setGranularity, setCompareDim],
  );

  const handleCompareDrill = useCallback(
    (dim: CompareDimension, value: string) => {
      switch (dim) {
        case "country":
          filters.setCountry(value);
          break;
        case "operator":
          filters.setOperator(value);
          break;
        case "senderId":
          filters.setSenderId(value);
          break;
        case "destinationAccount":
          filters.setDestinationAccount(value);
          break;
        case "trafficSourceType": {
          const v = value as TrafficSourceType;
          if ((ALL_TRAFFIC_SOURCES as readonly string[]).includes(v)) {
            filters.setTrafficSourceTypes([v]);
          }
          break;
        }
        default:
          break;
      }
    },
    [filters],
  );

  const exportFilterSummary = useMemo(() => {
    const parts = [
      `range=${filters.dateFrom}..${filters.dateTo}`,
      filters.country && `country=${filters.country}`,
      filters.operator && `operator=${filters.operator}`,
      filters.sourceAccount && `provider=${filters.sourceAccount}`,
      filters.destinationAccount && `client=${filters.destinationAccount}`,
      filters.senderId && `sender=${filters.senderId}`,
    ].filter(Boolean);
    return parts.join(" · ");
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.country,
    filters.operator,
    filters.sourceAccount,
    filters.destinationAccount,
    filters.senderId,
  ]);

  const exportNarrative = useMemo(
    () =>
      composeQuickSummary({
        kpis,
        kpiTrends,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        filteredCount: filtered.length,
        topCountries: topCountryByVolume(filtered, 2),
        topSource: topTrafficSourceByVolume(filtered),
        directShare: splitA.direct.volume,
        generatedShare: splitA.generated.volume,
        blendedMargin: blendedMarginOnDelivered(filtered),
      }),
    [kpis, kpiTrends, filters.dateFrom, filters.dateTo, filtered, splitA],
  );

  const onInspectAlert = useCallback(
    (ev: TrafficAlertEvent) => {
      if (ev.country) filters.setCountry(ev.country);
      if (ev.operator) filters.setOperator(ev.operator);
      if (ev.sourceAccount) filters.setSourceAccount(ev.sourceAccount);
      setTab("overview");
    },
    [filters],
  );

  const tabBtn = (id: PageTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
        tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
    </button>
  );

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
            <ComparisonPicker
              preset={comparePreset}
              onPreset={setComparePreset}
              customFrom={compareCustomFrom}
              customTo={compareCustomTo}
              onCustomFrom={setCompareCustomFrom}
              onCustomTo={setCompareCustomTo}
              bFrom={compareWindow.bFrom}
              bTo={compareWindow.bTo}
            />
            <SavedViewsMenu
              views={views}
              onSave={(name) => {
                const snap = snapshotForSave();
                saveView({ ...snap, name });
              }}
              onLoad={loadView}
              onDelete={deleteView}
            />
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => exportFilteredCsv(filtered, { filterSummary: exportFilterSummary, narrative: exportNarrative })}
            >
              <span className="inline-flex items-center gap-1">
                <Download size={14} /> Export report
              </span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-100 p-1">
        {tabBtn("overview", "Overview")}
        {tabBtn("routes", "Routes")}
        {tabBtn("risk", "Risk")}
        {tabBtn("alerts", "Alerts")}
      </div>

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

      {tab === "overview" && (
        <>
          <TrafficKpiStrip kpis={kpis} trends={kpiTrends} />
          <DirectGeneratedHealth
            direct={splitA.direct}
            generated={splitA.generated}
            directCompare={splitB.direct}
            generatedCompare={splitB.generated}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3 space-y-3">
              <TrafficChart
                filtered={filtered}
                filteredCompare={compareFiltered}
                chartMode={chartMode}
                onChartMode={setChartMode}
                metric={metric}
                onMetric={setMetric}
                granularity={granularity}
                onGranularity={setGranularity}
                compareDim={compareDim}
                onCompareDim={setCompareDim}
                onCompareDrill={handleCompareDrill}
              />
              <button
                type="button"
                className="text-[11px] font-semibold text-indigo-700 hover:underline"
                onClick={() => setShowTopAccounts((s) => !s)}
              >
                {showTopAccounts ? "Hide" : "Show"} top providers / clients
              </button>
              {showTopAccounts && (
                <TopProvidersClients
                  filtered={filtered}
                  onPickProvider={(name) => applyDrillFilter({ sourceAccount: name })}
                  onPickClient={(name) => applyDrillFilter({ destinationAccount: name })}
                />
              )}
            </div>
            <div className="lg:col-span-1">
              <TrafficInsights filtered={filtered} />
            </div>
          </div>
          <QuickSummary
            filtered={filtered}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            kpis={kpis}
            kpiTrends={kpiTrends}
            directVol={splitA.direct.volume}
            generatedVol={splitA.generated.volume}
          />
          <TrafficTable
            rows={tableRows}
            onRowClick={(r) =>
              applyDrillFilter({ country: r.country, operator: r.operator, sourceAccount: r.sourceAccount })
            }
          />
        </>
      )}

      {tab === "routes" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Route profitability by country, operator, provider, and client. Click a row to drill filters.
          </p>
          <RoutesPivotTable
            rows={routeRows}
            onRowClick={(r) =>
              applyDrillFilter({
                country: r.country,
                operator: r.operator,
                sourceAccount: r.sourceAccount,
                destinationAccount: r.destinationAccount,
              })
            }
          />
        </div>
      )}

      {tab === "risk" && (
        <div className="space-y-6">
          <TrafficRiskPanel filtered={filtered} />
          <DlrWatchPanel filtered={filtered} />
          <QualityScorecards filtered={filtered} />
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" onClick={() => setRuleModalOpen(true)}>
              New alert rule
            </Button>
          </div>
          <AlertsInbox onInspect={onInspectAlert} />
          <AlertRuleBuilderModal open={ruleModalOpen} onClose={() => setRuleModalOpen(false)} />
        </div>
      )}

      <p className="text-[10px] text-slate-400">
        Compare window KPIs (B): volume {compareKpis.totalVolume.toLocaleString()} · profit $
        {compareKpis.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} · DLR{" "}
        {(compareKpis.avgDlr * 100).toFixed(2)}%
      </p>
    </div>
  );
}

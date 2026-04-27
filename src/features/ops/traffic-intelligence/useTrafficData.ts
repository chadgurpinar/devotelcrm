import { useCallback, useMemo, useState } from "react";
import { useAppStore } from "../../../store/db";
import type { TrafficSourceType, WholesaleTrafficRecord } from "../../../store/types";
import {
  ALL_TRAFFIC_SOURCES,
  buildRouteAggregates,
  buildTableAggregates,
  computeCompareWindowB,
  computeKpis,
  defaultDateBounds,
  filterWholesaleRecords,
  pctTrend,
  splitDirectGenerated,
  type ChartGranularity,
  type ChartMetric,
  type CompareDimension,
  type ComparePreset,
  type TrafficChartMode,
  type TrafficFilterState,
  type TrafficKpis,
  type TrafficTypeFilter,
} from "./trafficUtils";

export function useTrafficData() {
  const records = useAppStore((s) => s.wholesaleTrafficRecords);
  const bounds = useMemo(() => defaultDateBounds(records), [records]);

  const [dateFrom, setDateFrom] = useState(bounds.from);
  const [dateTo, setDateTo] = useState(bounds.to);
  const [trafficSourceTypes, setTrafficSourceTypes] = useState<TrafficSourceType[]>(() => [...ALL_TRAFFIC_SOURCES]);
  const [trafficType, setTrafficType] = useState<TrafficTypeFilter>("");
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [sourceAccount, setSourceAccount] = useState("");
  const [destinationAccount, setDestinationAccount] = useState("");
  const [senderId, setSenderId] = useState("");

  const [comparePreset, setComparePreset] = useState<ComparePreset>("prior");
  const [compareCustomFrom, setCompareCustomFrom] = useState("");
  const [compareCustomTo, setCompareCustomTo] = useState("");

  const [chartMode, setChartMode] = useState<TrafficChartMode>("Trend");
  const [metric, setMetric] = useState<ChartMetric>("Volume");
  const [granularity, setGranularity] = useState<ChartGranularity>("Daily");
  const [compareDim, setCompareDim] = useState<CompareDimension>("country");

  const filters: TrafficFilterState = useMemo(
    () => ({
      dateFrom,
      dateTo,
      trafficSourceTypes: trafficSourceTypes.length === ALL_TRAFFIC_SOURCES.length ? [] : trafficSourceTypes,
      trafficType,
      country,
      operator,
      sourceAccount,
      destinationAccount,
      senderId,
    }),
    [
      dateFrom,
      dateTo,
      trafficSourceTypes,
      trafficType,
      country,
      operator,
      sourceAccount,
      destinationAccount,
      senderId,
    ],
  );

  const effectiveSources = useCallback(
    (f: TrafficFilterState): TrafficSourceType[] =>
      f.trafficSourceTypes.length === 0 ? [...ALL_TRAFFIC_SOURCES] : f.trafficSourceTypes,
    [],
  );

  const filtered = useMemo(() => {
    const effective: TrafficFilterState = {
      ...filters,
      trafficSourceTypes: effectiveSources(filters),
    };
    return filterWholesaleRecords(records, effective);
  }, [records, filters, effectiveSources]);

  const compareWindow = useMemo(
    () => computeCompareWindowB(dateFrom, dateTo, comparePreset, compareCustomFrom || undefined, compareCustomTo || undefined),
    [dateFrom, dateTo, comparePreset, compareCustomFrom, compareCustomTo],
  );

  const compareFiltered = useMemo(() => {
    const effective: TrafficFilterState = {
      ...filters,
      dateFrom: compareWindow.bFrom,
      dateTo: compareWindow.bTo,
      trafficSourceTypes: effectiveSources(filters),
    };
    return filterWholesaleRecords(records, effective);
  }, [records, filters, compareWindow, effectiveSources]);

  const filterOptions = useMemo(() => {
    const countries = new Set<string>();
    const operators = new Set<string>();
    const sources = new Set<string>();
    const dests = new Set<string>();
    for (const r of records) {
      countries.add(r.country);
      operators.add(r.operator);
      sources.add(r.sourceAccount);
      dests.add(r.destinationAccount);
    }
    return {
      countries: Array.from(countries).sort(),
      operators: Array.from(operators).sort(),
      sourceAccounts: Array.from(sources).sort(),
      destinationAccounts: Array.from(dests).sort(),
    };
  }, [records]);

  const kpis: TrafficKpis = useMemo(() => computeKpis(filtered), [filtered]);
  const compareKpis = useMemo(() => computeKpis(compareFiltered), [compareFiltered]);

  const kpiTrends = useMemo(
    () => ({
      volume: pctTrend(kpis.totalVolume, compareKpis.totalVolume),
      price: pctTrend(kpis.avgSellPerMsg, compareKpis.avgSellPerMsg),
      profit: pctTrend(kpis.netProfit, compareKpis.netProfit),
      dlr: pctTrend(kpis.avgDlr, compareKpis.avgDlr),
    }),
    [kpis, compareKpis],
  );

  const splitA = useMemo(() => splitDirectGenerated(filtered), [filtered]);
  const splitB = useMemo(() => splitDirectGenerated(compareFiltered), [compareFiltered]);

  const tableRows = useMemo(() => buildTableAggregates(filtered), [filtered]);
  const routeRows = useMemo(() => buildRouteAggregates(filtered), [filtered]);

  const applyDrillFilter = useCallback(
    (patch: Partial<{ country: string; operator: string; sourceAccount: string; destinationAccount: string }>) => {
      if (patch.country !== undefined) setCountry(patch.country);
      if (patch.operator !== undefined) setOperator(patch.operator);
      if (patch.sourceAccount !== undefined) setSourceAccount(patch.sourceAccount);
      if (patch.destinationAccount !== undefined) setDestinationAccount(patch.destinationAccount);
    },
    [],
  );

  const toggleSource = useCallback((src: TrafficSourceType) => {
    setTrafficSourceTypes((prev) => {
      const has = prev.includes(src);
      if (has) {
        const next = prev.filter((s) => s !== src);
        return next.length === 0 ? [src] : next;
      }
      const next = [...prev, src];
      return next.length === ALL_TRAFFIC_SOURCES.length ? [...ALL_TRAFFIC_SOURCES] : next;
    });
  }, []);

  const selectAllSources = useCallback(() => {
    setTrafficSourceTypes([...ALL_TRAFFIC_SOURCES]);
  }, []);

  const filtersApi = useMemo(
    () => ({
      dateFrom,
      dateTo,
      trafficSourceTypes,
      trafficType,
      country,
      operator,
      sourceAccount,
      destinationAccount,
      senderId,
      setDateFrom,
      setDateTo,
      setTrafficType,
      setCountry,
      setOperator,
      setSourceAccount,
      setDestinationAccount,
      setSenderId,
      setTrafficSourceTypes,
      toggleSource,
      selectAllSources,
    }),
    [
      dateFrom,
      dateTo,
      trafficSourceTypes,
      trafficType,
      country,
      operator,
      sourceAccount,
      destinationAccount,
      senderId,
      toggleSource,
      selectAllSources,
    ],
  );

  return {
    records,
    filtered,
    compareFiltered,
    compareWindow,
    filters: filtersApi,
    comparePreset,
    setComparePreset,
    compareCustomFrom,
    compareCustomTo,
    setCompareCustomFrom,
    setCompareCustomTo,
    chartMode,
    setChartMode,
    metric,
    setMetric,
    granularity,
    setGranularity,
    compareDim,
    setCompareDim,
    filterOptions,
    kpis,
    compareKpis,
    kpiTrends,
    tableRows,
    routeRows,
    splitA,
    splitB,
    applyDrillFilter,
  };
}

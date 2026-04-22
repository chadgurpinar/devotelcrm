import { useMemo, useState } from "react";
import { useAppStore } from "../../../store/db";
import type { TrafficSourceType, WholesaleTrafficRecord } from "../../../store/types";
import {
  ALL_TRAFFIC_SOURCES,
  buildTableAggregates,
  computeKpis,
  defaultDateBounds,
  filterWholesaleRecords,
  pctTrend,
  shiftDateWindow,
  type CompareDimension,
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

  const filtered = useMemo(() => {
    const effective: TrafficFilterState = {
      ...filters,
      trafficSourceTypes:
        filters.trafficSourceTypes.length === 0 ? [...ALL_TRAFFIC_SOURCES] : filters.trafficSourceTypes,
    };
    return filterWholesaleRecords(records, effective);
  }, [records, filters]);

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

  const { prevFrom, prevTo } = useMemo(() => shiftDateWindow(dateFrom, dateTo), [dateFrom, dateTo]);
  const priorFiltered = useMemo(() => {
    const effective: TrafficFilterState = {
      ...filters,
      dateFrom: prevFrom,
      dateTo: prevTo,
      trafficSourceTypes:
        filters.trafficSourceTypes.length === 0 ? [...ALL_TRAFFIC_SOURCES] : filters.trafficSourceTypes,
    };
    return filterWholesaleRecords(records, effective);
  }, [records, filters, prevFrom, prevTo]);

  const priorKpis = useMemo(() => computeKpis(priorFiltered), [priorFiltered]);

  const kpiTrends = useMemo(
    () => ({
      volume: pctTrend(kpis.totalVolume, priorKpis.totalVolume),
      price: pctTrend(kpis.avgSellPerMsg, priorKpis.avgSellPerMsg),
      profit: pctTrend(kpis.netProfit, priorKpis.netProfit),
      dlr: pctTrend(kpis.avgDlr, priorKpis.avgDlr),
    }),
    [kpis, priorKpis],
  );

  const tableRows = useMemo(() => buildTableAggregates(filtered), [filtered]);

  function toggleSource(src: TrafficSourceType) {
    setTrafficSourceTypes((prev) => {
      const has = prev.includes(src);
      if (has) {
        const next = prev.filter((s) => s !== src);
        return next.length === 0 ? [src] : next;
      }
      const next = [...prev, src];
      return next.length === ALL_TRAFFIC_SOURCES.length ? [...ALL_TRAFFIC_SOURCES] : next;
    });
  }

  function selectAllSources() {
    setTrafficSourceTypes([...ALL_TRAFFIC_SOURCES]);
  }

  return {
    records,
    filtered,
    filters: {
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
      toggleSource,
      selectAllSources,
    },
    filterOptions,
    kpis,
    kpiTrends,
    tableRows,
  };
}

export type { TrafficFilterState, TrafficKpis, WholesaleTrafficRecord };

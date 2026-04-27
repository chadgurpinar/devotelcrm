import { useCallback, useEffect, useState } from "react";
import type { TrafficSourceType } from "../../../store/types";
import type {
  ChartGranularity,
  ChartMetric,
  CompareDimension,
  ComparePreset,
  TrafficChartMode,
  TrafficTypeFilter,
} from "./trafficUtils";

const STORAGE_KEY = "ti.savedViews.v1";

export interface SavedTrafficViewV1 {
  id: string;
  name: string;
  savedAt: string;
  dateFrom: string;
  dateTo: string;
  comparePreset: ComparePreset;
  compareCustomFrom: string;
  compareCustomTo: string;
  trafficSourceTypes: TrafficSourceType[];
  trafficType: TrafficTypeFilter;
  country: string;
  operator: string;
  sourceAccount: string;
  destinationAccount: string;
  senderId: string;
  chartMode: TrafficChartMode;
  metric: ChartMetric;
  granularity: ChartGranularity;
  compareDim: CompareDimension;
}

function loadRaw(): SavedTrafficViewV1[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedTrafficViewV1[]) : [];
  } catch {
    return [];
  }
}

function saveRaw(views: SavedTrafficViewV1[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    /* noop */
  }
}

export function useSavedTrafficViews() {
  const [views, setViews] = useState<SavedTrafficViewV1[]>(() => loadRaw());

  useEffect(() => {
    saveRaw(views);
  }, [views]);

  const saveView = useCallback((draft: Omit<SavedTrafficViewV1, "id" | "savedAt"> & { name: string }) => {
    const id = `sv-${Date.now().toString(36)}`;
    const entry: SavedTrafficViewV1 = {
      ...draft,
      id,
      savedAt: new Date().toISOString(),
    };
    setViews((prev) => [...prev, entry]);
    return id;
  }, []);

  const deleteView = useCallback((id: string) => {
    setViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const renameView = useCallback((id: string, name: string) => {
    setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  }, []);

  return { views, saveView, deleteView, renameView, setViews };
}

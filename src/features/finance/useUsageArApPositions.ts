import { useEffect, useState } from "react";
import type { FinUsageArApPosition } from "../../store/types";
import { fetchUsageArApPositions, type UsageArApFilters } from "./api/usageArApApi";

interface State {
  loading: boolean;
  error: string | null;
  data: FinUsageArApPosition[];
}

/** Thin wrapper around the mocked panel API. Designed to be swapped for a real backend call. */
export function useUsageArApPositions(filters: UsageArApFilters | null) {
  const [state, setState] = useState<State>({ loading: false, error: null, data: [] });

  useEffect(() => {
    let cancelled = false;
    if (!filters) {
      setState({ loading: false, error: null, data: [] });
      return () => {
        cancelled = true;
      };
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchUsageArApPositions(filters)
      .then((rows) => {
        if (!cancelled) setState({ loading: false, error: null, data: rows });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ loading: false, error: err instanceof Error ? err.message : "Fetch failed", data: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [filters?.counterpartyId, filters?.entityId, filters?.track, filters?.periodFrom, filters?.periodTo]);

  return state;
}

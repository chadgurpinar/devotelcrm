import { useMemo, useState } from "react";
import { useAppStore } from "../../store/db";
import type { FinArApTransaction, FinCounterparty, FinCounterpartyType, FinDirection, FinTxStatus, OurEntity } from "../../store/types";
import { agingBucket, isOpenLikeStatus, openAmount } from "./financeUtils";
import { convertCurrency } from "../../store/hrUtils";

export type FinanceArApDateField = "dueDate" | "issueDate";

export interface FinanceArApFilters {
  entityIds: OurEntity[];
  counterpartyType: FinCounterpartyType | "All";
  direction: FinDirection | "All";
  statuses: FinTxStatus[]; // empty means all
  dateField: FinanceArApDateField;
  fromYmd: string;
  toYmd: string;
  search: string;
}

function inRange(ymd: string | undefined, from: string, to: string): boolean {
  if (!ymd) return false;
  return ymd >= from && ymd <= to;
}

export function useFinanceArAp() {
  const tx = useAppStore((s) => s.finArApTransactions);
  const cps = useAppStore((s) => s.finCounterparties);
  const fx = useAppStore((s) => s.hrFxRates);

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = useMemo(() => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), []);
  const defaultTo = today;

  const [filters, setFilters] = useState<FinanceArApFilters>({
    entityIds: ["USA", "UK", "TR"],
    counterpartyType: "All",
    direction: "All",
    statuses: [],
    dateField: "dueDate",
    fromYmd: defaultFrom,
    toYmd: defaultTo,
    search: "",
  });

  const cpById = useMemo(() => new Map<string, FinCounterparty>(cps.map((c) => [c.id, c])), [cps]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return tx.filter((t) => {
      if (!filters.entityIds.includes(t.entityId)) return false;
      if (filters.direction !== "All" && t.direction !== filters.direction) return false;
      const cp = t.counterpartyId ? cpById.get(t.counterpartyId) : undefined;
      if (filters.counterpartyType !== "All") {
        if (!cp || cp.type !== filters.counterpartyType) return false;
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false;
      const date = filters.dateField === "dueDate" ? (t.dueDate ?? t.issueDate) : t.issueDate;
      if (!inRange(date, filters.fromYmd, filters.toYmd)) return false;
      if (q) {
        const hay = `${cp?.name ?? ""} ${t.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tx, filters, cpById]);

  const kpis = useMemo(() => {
    const to = "EUR" as const;
    const at = new Date().toISOString();
    let recv = 0;
    let pay = 0;
    let net30 = 0;
    const todayYmd = today;
    const plus30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    for (const t of filtered) {
      const open = isOpenLikeStatus(t.status) ? openAmount(t) : 0;
      const eur = convertCurrency(open, t.currency, to, fx, at) ?? open;
      if (t.direction === "Receivable") recv += eur;
      else pay += eur;

      const due = t.dueDate ?? t.issueDate;
      if (isOpenLikeStatus(t.status) && due >= todayYmd && due <= plus30) {
        net30 += t.direction === "Receivable" ? eur : -eur;
      }
      if (t.sourceType === "Projection" && (t.status === "Planned" || t.status === "Open")) {
        const in30 = due >= todayYmd && due <= plus30;
        if (in30) net30 += t.direction === "Receivable" ? eur : -eur;
      }
    }
    return {
      totalReceivablesEur: recv,
      totalPayablesEur: pay,
      netPositionEur: recv - pay,
      netCashNext30Eur: net30,
    };
  }, [filtered, fx, today]);

  const receivablesRows = useMemo(() => filtered.filter((t) => t.direction === "Receivable"), [filtered]);
  const payablesRows = useMemo(() => filtered.filter((t) => t.direction === "Payable"), [filtered]);

  const rollup = useMemo(() => {
    const map = new Map<string, { counterpartyId: string; name: string; type: FinCounterpartyType; ar: number; ap: number; nextDue?: string }>();
    for (const t of filtered) {
      if (!t.counterpartyId) continue;
      const cp = cpById.get(t.counterpartyId);
      if (!cp) continue;
      const open = isOpenLikeStatus(t.status) ? openAmount(t) : 0;
      const cur = map.get(cp.id) ?? { counterpartyId: cp.id, name: cp.name, type: cp.type, ar: 0, ap: 0, nextDue: undefined };
      if (t.direction === "Receivable") cur.ar += open;
      else cur.ap += open;
      const due = t.dueDate ?? t.issueDate;
      if (!cur.nextDue || due < cur.nextDue) cur.nextDue = due;
      map.set(cp.id, cur);
    }
    return Array.from(map.values()).sort((a, b) => (b.ar - b.ap) - (a.ar - a.ap));
  }, [filtered, cpById]);

  const enrichRow = (t: FinArApTransaction) => {
    const cp = t.counterpartyId ? cpById.get(t.counterpartyId) : undefined;
    const due = t.dueDate ?? t.issueDate;
    return {
      ...t,
      counterpartyName: cp?.name ?? (t.counterpartyId ? t.counterpartyId : "Internal"),
      counterpartyType: cp?.type ?? "Other",
      openAmount: openAmount(t),
      due,
      aging: due ? agingBucket(due, today) : "0-30",
    };
  };

  return {
    filters,
    setFilters,
    counterparties: cps,
    rows: filtered.map(enrichRow),
    receivables: receivablesRows.map(enrichRow),
    payables: payablesRows.map(enrichRow),
    rollup,
    kpis,
    today,
  };
}


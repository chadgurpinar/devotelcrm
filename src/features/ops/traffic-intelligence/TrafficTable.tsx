import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui";
import type { TableAggRow } from "./trafficUtils";

type SortKey = "country" | "operator" | "sourceAccount" | "submitCount" | "buy" | "sell" | "profit" | "margin" | "dlr";

const PAGE = 25;

function marginPct(row: TableAggRow): number {
  return row.revenue > 0 ? row.profit / row.revenue : 0;
}

function dlrPct(row: TableAggRow): number {
  return row.submitCount > 0 ? row.deliveryCount / row.submitCount : 0;
}

interface TrafficTableProps {
  rows: TableAggRow[];
  /** Click a row to drill filters to that slice. */
  onRowClick?: (row: TableAggRow) => void;
}

export function TrafficTable({ rows, onRowClick }: TrafficTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("submitCount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.country.toLowerCase().includes(q) ||
        r.operator.toLowerCase().includes(q) ||
        r.sourceAccount.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = [...filtered];
    list.sort((a, b) => {
      let va = 0;
      let vb = 0;
      switch (sortKey) {
        case "country":
          return dir * a.country.localeCompare(b.country);
        case "operator":
          return dir * a.operator.localeCompare(b.operator);
        case "sourceAccount":
          return dir * a.sourceAccount.localeCompare(b.sourceAccount);
        case "submitCount":
          va = a.submitCount;
          vb = b.submitCount;
          break;
        case "buy":
          va = a.buyWeighted / Math.max(1, a.submitCount);
          vb = b.buyWeighted / Math.max(1, b.submitCount);
          break;
        case "sell":
          va = a.sellWeighted / Math.max(1, a.submitCount);
          vb = b.sellWeighted / Math.max(1, b.submitCount);
          break;
        case "profit":
          va = a.profit;
          vb = b.profit;
          break;
        case "margin":
          va = marginPct(a);
          vb = marginPct(b);
          break;
        case "dlr":
          va = dlrPct(a);
          vb = dlrPct(b);
          break;
        default:
          return 0;
      }
      if (va === vb) return a.key.localeCompare(b.key);
      return dir * (va > vb ? 1 : -1);
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * PAGE, safePage * PAGE + PAGE);

  function toggleSort(k: SortKey) {
    setPage(0);
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "country" || k === "operator" || k === "sourceAccount" ? "asc" : "desc");
    }
  }

  const th = (k: SortKey, label: string) => (
    <th className="cursor-pointer whitespace-nowrap px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800" onClick={() => toggleSort(k)}>
      {label}
      {sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Enterprise traffic flow analysis</h3>
          <p className="text-[11px] text-slate-500">{sorted.length} aggregated rows · filters apply</p>
        </div>
        <input
          className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder="Search country, operator, source…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Type</th>
              {th("country", "Country")}
              {th("operator", "Operator")}
              {th("sourceAccount", "Source")}
              {th("submitCount", "Volume")}
              {th("buy", "Buy")}
              {th("sell", "Sell")}
              {th("profit", "Profit")}
              {th("margin", "Margin %")}
              {th("dlr", "DLR %")}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const buy = r.buyWeighted / Math.max(1, r.submitCount);
              const sell = r.sellWeighted / Math.max(1, r.submitCount);
              const m = marginPct(r);
              const dlr = dlrPct(r);
              const marginCls = m >= 0.15 ? "text-emerald-600" : m >= 0.05 ? "text-amber-600" : "text-rose-600";
              const profitCls = r.profit >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold";
              const badge =
                r.trafficType === "Direct" ? (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">DIRECT</span>
                ) : (
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">HUBBED</span>
                );
              return (
                <tr
                  key={r.key}
                  className={`border-b border-slate-100 hover:bg-slate-50/80 ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(r)}
                >
                  <td className="px-2 py-1.5">{badge}</td>
                  <td className="px-2 py-1.5 text-slate-800">{r.country}</td>
                  <td className="px-2 py-1.5 text-slate-700">{r.operator}</td>
                  <td className="px-2 py-1.5 font-medium text-slate-800">{r.sourceAccount}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-800">{r.submitCount.toLocaleString()}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-600">${buy.toFixed(5)}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-600">${sell.toFixed(5)}</td>
                  <td className={`px-2 py-1.5 tabular-nums ${profitCls}`}>${r.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className={`px-2 py-1.5 tabular-nums ${marginCls}`}>{(m * 100).toFixed(1)}%</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-700">{(dlr * 100).toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
        <span className="text-[11px] text-slate-500">
          Page {safePage + 1} / {totalPages}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" type="button" disabled={safePage <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft size={14} />
          </Button>
          <Button size="sm" variant="outline" type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </section>
  );
}

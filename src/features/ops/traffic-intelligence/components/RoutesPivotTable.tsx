import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../../components/ui";
import type { RouteAggRow } from "../trafficUtils";

type SortKey = "submitCount" | "profit" | "margin" | "dlr" | "country" | "operator";

const PAGE = 20;

export function RoutesPivotTable({
  rows,
  onRowClick,
}: {
  rows: RouteAggRow[];
  onRowClick?: (row: RouteAggRow) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = [...rows];
    list.sort((a, b) => {
      const margin = (r: RouteAggRow) => (r.revenue > 0 ? r.profit / r.revenue : 0);
      const dlr = (r: RouteAggRow) => (r.submitCount > 0 ? r.deliveryCount / r.submitCount : 0);
      let va = 0;
      let vb = 0;
      switch (sortKey) {
        case "country":
          return dir * a.country.localeCompare(b.country);
        case "operator":
          return dir * a.operator.localeCompare(b.operator);
        case "submitCount":
          va = a.submitCount;
          vb = b.submitCount;
          break;
        case "profit":
          va = a.profit;
          vb = b.profit;
          break;
        case "margin":
          va = margin(a);
          vb = margin(b);
          break;
        case "dlr":
          va = dlr(a);
          vb = dlr(b);
          break;
        default:
          return 0;
      }
      if (va === vb) return a.key.localeCompare(b.key);
      return dir * (va > vb ? 1 : -1);
    });
    return list;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * PAGE, safePage * PAGE + PAGE);

  function toggle(k: SortKey) {
    setPage(0);
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "country" ? "asc" : "desc");
    }
  }

  const th = (k: SortKey, label: string) => (
    <th className="cursor-pointer px-2 py-2 text-left text-[10px] font-bold uppercase text-slate-500" onClick={() => toggle(k)}>
      {label}
      {sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Route profitability</h3>
        <p className="text-[11px] text-slate-500">Country + operator + provider + client. Click a row to apply filters.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {th("country", "Country")}
              {th("operator", "Operator")}
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Provider</th>
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Client</th>
              {th("submitCount", "Volume")}
              {th("profit", "Profit")}
              {th("margin", "Margin %")}
              {th("dlr", "DLR %")}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const m = r.revenue > 0 ? r.profit / r.revenue : 0;
              const dlr = r.submitCount > 0 ? r.deliveryCount / r.submitCount : 0;
              const mCls = m >= 0.15 ? "text-emerald-600" : m >= 0.05 ? "text-amber-600" : "text-rose-600";
              return (
                <tr
                  key={r.key}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50/80"
                  onClick={() => onRowClick?.(r)}
                >
                  <td className="px-2 py-1.5">{r.country}</td>
                  <td className="px-2 py-1.5">{r.operator}</td>
                  <td className="px-2 py-1.5 font-medium">{r.sourceAccount}</td>
                  <td className="px-2 py-1.5">{r.destinationAccount}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.submitCount.toLocaleString()}</td>
                  <td className="px-2 py-1.5 tabular-nums font-semibold text-slate-800">
                    ${r.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className={`px-2 py-1.5 tabular-nums ${mCls}`}>{(m * 100).toFixed(1)}%</td>
                  <td className="px-2 py-1.5 tabular-nums">{(dlr * 100).toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
        <span className="text-[11px] text-slate-500">
          {sorted.length} routes · page {safePage + 1}/{totalPages}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" type="button" disabled={safePage <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </section>
  );
}

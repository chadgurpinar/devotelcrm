import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { ArApKpiStrip } from "./components/ArApKpiStrip";
import { ArApTable } from "./components/ArApTable";
import { CounterpartyRollupTable } from "./components/CounterpartyRollupTable";
import { FinanceFilters } from "./components/FinanceFilters";
import { useFinanceArAp } from "./useFinanceArAp";
import { useAppStore } from "../../store/db";
import type { FinCounterpartyType, FinDirection, FinTxStatus, OurEntity } from "../../store/types";

type Tab = "receivables" | "payables" | "counterparties";

const ALL_TX_STATUSES: FinTxStatus[] = ["Open", "PartiallyPaid", "Overdue", "Planned", "Paid", "Cancelled"];

function csvEsc(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportArApCsv(
  rows: ReturnType<typeof useFinanceArAp>["rows"],
  filtersSummary: string,
) {
  const header = ["counterparty", "type", "entity", "direction", "due", "issue", "aging", "status", "currency", "amount", "paid", "open", "source"];
  const lines: string[] = [];
  lines.push(`# ${filtersSummary}`);
  lines.push(header.join(","));
  for (const r of rows) {
    lines.push(
      [
        csvEsc(r.counterpartyName),
        csvEsc(r.counterpartyType),
        csvEsc(r.entityId),
        csvEsc(r.direction),
        csvEsc(r.due ?? ""),
        csvEsc(r.issueDate),
        csvEsc(r.aging),
        csvEsc(r.status),
        csvEsc(r.currency),
        csvEsc(r.amount),
        csvEsc(r.paidAmount),
        csvEsc(r.openAmount),
        csvEsc(r.sourceType),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finance-ar-ap-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FinanceArApOverviewPage() {
  const nav = useNavigate();
  const { filters, setFilters, kpis, rows, receivables, payables, rollup } = useFinanceArAp();
  const markPaid = useAppStore((s) => s.markFinTransactionPaid);
  const [tab, setTab] = useState<Tab>("receivables");
  const [searchParams, setSearchParams] = useSearchParams();
  const urlHydrated = useRef(false);

  const openCounterparty = (id: string) => {
    nav(`/finance/counterparties/${id}`);
  };

  useEffect(() => {
    if (urlHydrated.current) return;
    urlHydrated.current = true;
    const t = searchParams.get("tab");
    if (t === "receivables" || t === "payables" || t === "counterparties") setTab(t);
    const entities = searchParams.get("entities");
    const cpType = searchParams.get("type");
    const direction = searchParams.get("direction");
    const statuses = searchParams.get("statuses");
    const fromYmd = searchParams.get("from");
    const toYmd = searchParams.get("to");
    const search = searchParams.get("q");
    setFilters({
      ...filters,
      entityIds: entities
        ? (entities.split(",").filter((e) => ["USA", "UK", "TR"].includes(e)) as OurEntity[])
        : filters.entityIds,
      counterpartyType: cpType && ["All", "Customer", "Provider", "Other"].includes(cpType)
        ? (cpType as FinCounterpartyType | "All")
        : filters.counterpartyType,
      direction: direction && ["All", "Receivable", "Payable"].includes(direction)
        ? (direction as FinDirection | "All")
        : filters.direction,
      statuses: statuses
        ? (statuses.split(",").filter((s) => ALL_TX_STATUSES.includes(s as FinTxStatus)) as FinTxStatus[])
        : filters.statuses,
      fromYmd: fromYmd ?? filters.fromYmd,
      toYmd: toYmd ?? filters.toYmd,
      search: search ?? filters.search,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot URL → state hydration
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("tab", tab);
          p.set("entities", filters.entityIds.join(","));
          p.set("type", filters.counterpartyType);
          p.set("direction", filters.direction);
          if (filters.statuses.length > 0) p.set("statuses", filters.statuses.join(","));
          else p.delete("statuses");
          p.set("from", filters.fromYmd);
          p.set("to", filters.toYmd);
          if (filters.search.trim()) p.set("q", filters.search.trim());
          else p.delete("q");
          return p;
        },
        { replace: true },
      );
    }, 300);
    return () => window.clearTimeout(id);
  }, [tab, filters, setSearchParams]);

  const filtersSummary = `range=${filters.fromYmd}..${filters.toYmd} · entities=${filters.entityIds.join("/")} · type=${filters.counterpartyType} · direction=${filters.direction} · statuses=${filters.statuses.join("/") || "all"}`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 pb-10">
      <UiPageHeader
        title="Finance — AR/AP Overview"
        subtitle="Unified receivables/payables across entities and counterparties (seeded dummy data)."
        actions={
          <Button size="sm" variant="secondary" type="button" onClick={() => exportArApCsv(rows, filtersSummary)}>
            <span className="inline-flex items-center gap-1">
              <Download size={14} /> Export CSV
            </span>
          </Button>
        }
      />

      <FinanceFilters value={filters} onChange={setFilters} />

      <ArApKpiStrip kpis={kpis} />

      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-100 p-1">
        {(
          [
            { id: "receivables", label: "Receivables" },
            { id: "payables", label: "Payables" },
            { id: "counterparties", label: "Counterparties" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "receivables" && (
        <ArApTable title="Receivables" rows={receivables} onOpenCounterparty={openCounterparty} onMarkPaid={(id) => markPaid(id)} />
      )}
      {tab === "payables" && (
        <ArApTable title="Payables" rows={payables} onOpenCounterparty={openCounterparty} onMarkPaid={(id) => markPaid(id)} />
      )}
      {tab === "counterparties" && <CounterpartyRollupTable rows={rollup} onOpen={openCounterparty} />}
    </div>
  );
}


import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  ChevronRight,
  Download,
  Landmark,
  ListChecks,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { EmptyState, StatusBadge } from "../components/primitives";
import { formatDate, formatMoney, entityLabel } from "../compensation/utils";
import { formatPeriod } from "../payroll/utils";
import { batchStatusTone, buildBatchCsv, downloadCsv } from "./utils";
import { Hr2InstructionBatchStatus, OurEntity } from "../../../store/types";

export function Hr2FinanceInstructionRegisterPage() {
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.hr2PaymentInstructionBatches);
  const lines = useAppStore((s) => s.hr2PaymentInstructionLines);
  const cycles = useAppStore((s) => s.hr2PayrollCycles);

  const [statusFilter, setStatusFilter] = useState<"all" | Hr2InstructionBatchStatus>("all");
  const [entityFilter, setEntityFilter] = useState<"all" | OurEntity>("all");
  const [search, setSearch] = useState("");

  const linesByBatch = useMemo(() => {
    const map = new Map<string, typeof lines>();
    lines.forEach((line) => {
      const list = map.get(line.batchId) ?? [];
      list.push(line);
      map.set(line.batchId, list);
    });
    return map;
  }, [lines]);

  const sortedBatches = useMemo(() => {
    return batches
      .slice()
      .sort((a, b) => b.emittedAt.localeCompare(a.emittedAt))
      .filter((batch) => {
        if (statusFilter !== "all" && batch.status !== statusFilter) return false;
        if (entityFilter !== "all" && batch.employingEntityId !== entityFilter) return false;
        if (search) {
          const cycle = cycles.find((c) => c.id === batch.cycleId);
          const q = search.toLowerCase();
          const matches =
            batch.id.toLowerCase().includes(q) ||
            batch.employingEntityId.toLowerCase().includes(q) ||
            (cycle?.period ?? "").toLowerCase().includes(q);
          if (!matches) return false;
        }
        return true;
      });
  }, [batches, statusFilter, entityFilter, search, cycles]);

  const kpis = useMemo(() => {
    let totalAmount = 0;
    let readyAmount = 0;
    let blockedAmount = 0;
    let verifiedAmount = 0;
    let openBlockedLines = 0;
    batches.forEach((b) => {
      totalAmount += b.totalAmount;
      blockedAmount += b.blockedAmount;
      if (b.status === "Ready" || b.status === "PartiallyBlocked") {
        readyAmount += b.totalAmount - b.blockedAmount;
      }
      if (b.status === "Verified") {
        verifiedAmount += b.totalAmount;
      }
      openBlockedLines += b.blockedLineCount;
    });
    return { totalAmount, readyAmount, blockedAmount, verifiedAmount, openBlockedLines };
  }, [batches]);

  const handleExportAll = () => {
    const headerLines = sortedBatches.flatMap((batch) => {
      const batchLines = linesByBatch.get(batch.id) ?? [];
      return batchLines.map((line) => ({
        employeeFullName: line.employeeFullName,
        employingEntityId: line.employingEntityId,
        fundingEntityId: line.fundingEntityId,
        payoutCurrency: line.payoutCurrency,
        amount: line.amount,
        payoutMethod: line.payoutMethod,
        bankAccountLast4: line.bankAccountLast4,
        status: line.status,
        blockedReason: line.blockedReason,
      }));
    });
    const csv = buildBatchCsv(
      { id: "register", employingEntityId: "ALL", payoutCurrency: "MIXED" },
      headerLines,
    );
    downloadCsv(`hr2-finance-register-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="p-6">
      <UiPageHeader
        title="Payment instruction register"
        subtitle="Every batch emitted by approved payroll cycles. Mark Sent and Verified as bank confirms."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/finance/funding")}>
              <Landmark size={14} className="mr-1" /> Funding workspace
            </Button>
            <Button size="sm" variant="ghost" onClick={handleExportAll} disabled={sortedBatches.length === 0}>
              <Download size={14} className="mr-1" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total instructed" value={formatMoneyMulti(kpis.totalAmount)} icon={<Wallet size={16} />} tone="neutral" />
        <Kpi label="Ready to release" value={formatMoneyMulti(kpis.readyAmount)} icon={<ListChecks size={16} />} tone="indigo" />
        <Kpi label="Verified" value={formatMoneyMulti(kpis.verifiedAmount)} icon={<ShieldCheck size={16} />} tone="success" />
        <Kpi label="Blocked lines" value={kpis.openBlockedLines} icon={<AlertOctagon size={16} />} tone="danger" raw />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel>Status</FieldLabel>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | Hr2InstructionBatchStatus)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="Ready">Ready</option>
              <option value="PartiallyBlocked">Partially blocked</option>
              <option value="Sent">Sent</option>
              <option value="Verified">Verified</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <FieldLabel>Employing entity</FieldLabel>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as "all" | OurEntity)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All entities</option>
              <option value="UK">UK</option>
              <option value="USA">USA</option>
              <option value="TR">TR</option>
            </select>
          </div>
          <div>
            <FieldLabel>Search</FieldLabel>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Batch id, entity, period..."
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      {sortedBatches.length === 0 ? (
        <EmptyState
          icon={<Wallet size={20} />}
          title="No payment instructions yet"
          description="Approve a payroll cycle to emit payment instruction batches."
          action={
            <Button size="sm" onClick={() => navigate("/hr2/payroll")}>
              Go to payroll
            </Button>
          }
        />
      ) : (
        <Card padded={false}>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Batch</th>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-left">Employing</th>
                <th className="px-3 py-2 text-left">Funding</th>
                <th className="px-3 py-2 text-right">Lines</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Blocked</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Emitted</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sortedBatches.map((batch) => {
                const cycle = cycles.find((c) => c.id === batch.cycleId);
                return (
                  <tr
                    key={batch.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => navigate(`/hr2/finance/batch/${batch.id}`)}
                  >
                    <td className="px-3 py-2 text-xs">
                      <div className="font-semibold text-slate-800">{batch.id.replace("hr2pib-", "PIB-")}</div>
                      <div className="text-[11px] text-slate-400">{batch.payoutCurrency}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {cycle ? formatPeriod(cycle.period) : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{entityLabel(batch.employingEntityId)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {batch.fundingEntityId && batch.fundingEntityId !== batch.employingEntityId
                        ? entityLabel(batch.fundingEntityId)
                        : "Same"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {batch.lineCount}
                      {batch.blockedLineCount > 0 && (
                        <span className="ml-1 text-[10px] text-rose-600">({batch.blockedLineCount} blocked)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatMoney(batch.totalAmount, batch.payoutCurrency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                      {batch.blockedAmount > 0 ? formatMoney(batch.blockedAmount, batch.payoutCurrency) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge label={batch.status} tone={batchStatusTone(batch.status)} dot />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{formatDate(batch.emittedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <ChevronRight size={14} className="text-slate-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="What Finance does in HR Module 2" className="mt-6">
        <ul className="space-y-1 text-xs text-slate-600">
          <li>
            <span className="font-semibold text-slate-700">Receive</span> — payroll approval emits one payment
            instruction batch per employing-funding-currency combination.
          </li>
          <li>
            <span className="font-semibold text-slate-700">Release</span> — confirm a batch is sent to the bank; line
            statuses move from Ready to Sent.
          </li>
          <li>
            <span className="font-semibold text-slate-700">Verify</span> — once bank confirms posting, mark verified so
            the cycle becomes paid out.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function formatMoneyMulti(amount: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount);
}

function Kpi({
  label,
  value,
  icon,
  tone,
  raw,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "neutral" | "indigo" | "success" | "danger";
  raw?: boolean;
}) {
  const toneClass = {
    neutral: "text-slate-700",
    indigo: "text-indigo-700",
    success: "text-emerald-700",
    danger: "text-rose-700",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className={`mt-0.5 text-xl font-bold tabular-nums ${toneClass}`}>
            {raw ? value : value}
          </p>
        </div>
        <span className="text-slate-300">{icon}</span>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  ArrowLeft,
  ChevronRight,
  Landmark,
  ListChecks,
  Wallet,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { EmptyState, StatusBadge } from "../components/primitives";
import { entityLabel, formatMoney } from "../compensation/utils";
import { batchStatusTone } from "./utils";
import { HrCurrencyCode, OurEntity } from "../../../store/types";

interface FundingRow {
  fundingEntityId: OurEntity;
  employingEntityId: OurEntity;
  payoutCurrency: HrCurrencyCode;
  totalReady: number;
  totalBlocked: number;
  totalSent: number;
  totalVerified: number;
  batchCount: number;
  blockerCount: number;
  batchIds: string[];
}

export function Hr2FinanceFundingWorkspacePage() {
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.hr2PaymentInstructionBatches);

  const rows = useMemo<FundingRow[]>(() => {
    const map = new Map<string, FundingRow>();
    batches.forEach((b) => {
      const funder = (b.fundingEntityId ?? b.employingEntityId) as OurEntity;
      const key = `${funder}|${b.employingEntityId}|${b.payoutCurrency}`;
      const existing = map.get(key);
      const readyAmount = b.status === "Ready" || b.status === "PartiallyBlocked"
        ? b.totalAmount - b.blockedAmount
        : 0;
      const sentAmount = b.status === "Sent" ? b.totalAmount - b.blockedAmount : 0;
      const verifiedAmount = b.status === "Verified" ? b.totalAmount : 0;
      if (existing) {
        existing.totalReady += readyAmount;
        existing.totalBlocked += b.blockedAmount;
        existing.totalSent += sentAmount;
        existing.totalVerified += verifiedAmount;
        existing.batchCount += 1;
        existing.blockerCount += b.blockedLineCount;
        existing.batchIds.push(b.id);
      } else {
        map.set(key, {
          fundingEntityId: funder,
          employingEntityId: b.employingEntityId,
          payoutCurrency: b.payoutCurrency,
          totalReady: readyAmount,
          totalBlocked: b.blockedAmount,
          totalSent: sentAmount,
          totalVerified: verifiedAmount,
          batchCount: 1,
          blockerCount: b.blockedLineCount,
          batchIds: [b.id],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.fundingEntityId !== b.fundingEntityId)
        return a.fundingEntityId.localeCompare(b.fundingEntityId);
      if (a.employingEntityId !== b.employingEntityId)
        return a.employingEntityId.localeCompare(b.employingEntityId);
      return a.payoutCurrency.localeCompare(b.payoutCurrency);
    });
  }, [batches]);

  const byFunder = useMemo(() => {
    const map = new Map<OurEntity, FundingRow[]>();
    rows.forEach((row) => {
      const list = map.get(row.fundingEntityId) ?? [];
      list.push(row);
      map.set(row.fundingEntityId, list);
    });
    return map;
  }, [rows]);

  return (
    <div className="p-6">
      <Link
        to="/hr2/finance"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to register
      </Link>
      <UiPageHeader
        title="Treasury funding & release workspace"
        subtitle="Each funding entity sees what it owes by employing entity and currency, with blockers surfaced for action."
        actions={
          <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/finance")}>
            <Landmark size={14} className="mr-1" /> Open register
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Wallet size={20} />}
          title="No batches to fund"
          description="Approve a payroll cycle to start populating the funding workspace."
          action={
            <Button size="sm" onClick={() => navigate("/hr2/payroll")}>
              Go to payroll
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {Array.from(byFunder.entries()).map(([funder, funderRows]) => {
            const totalReady = funderRows.reduce((s, r) => s + r.totalReady, 0);
            const totalBlocked = funderRows.reduce((s, r) => s + r.totalBlocked, 0);
            const totalSent = funderRows.reduce((s, r) => s + r.totalSent, 0);
            const blockerCount = funderRows.reduce((s, r) => s + r.blockerCount, 0);
            return (
              <Card key={funder} title={`Funding entity · ${entityLabel(funder)}`}
                actions={
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      label={`${funderRows.length} flow${funderRows.length !== 1 ? "s" : ""}`}
                      tone="info"
                    />
                    {blockerCount > 0 && (
                      <StatusBadge label={`${blockerCount} blocked line${blockerCount !== 1 ? "s" : ""}`} tone="danger" dot />
                    )}
                  </div>
                }>
                <div className="mb-3 grid grid-cols-3 gap-3">
                  <FunderStat label="Ready to release" value={totalReady} tone="indigo" icon={<ListChecks size={14} />} />
                  <FunderStat label="Sent (awaiting verify)" value={totalSent} tone="warning" icon={<ChevronRight size={14} />} />
                  <FunderStat label="Blocked" value={totalBlocked} tone="danger" icon={<AlertOctagon size={14} />} />
                </div>
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Employing entity</th>
                      <th className="px-3 py-2 text-left">Currency</th>
                      <th className="px-3 py-2 text-right">Ready</th>
                      <th className="px-3 py-2 text-right">Sent</th>
                      <th className="px-3 py-2 text-right">Verified</th>
                      <th className="px-3 py-2 text-right">Blocked</th>
                      <th className="px-3 py-2 text-right">Batches</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {funderRows.map((row) => (
                      <tr key={`${row.fundingEntityId}-${row.employingEntityId}-${row.payoutCurrency}`} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{entityLabel(row.employingEntityId)}</td>
                        <td className="px-3 py-2 text-slate-700">{row.payoutCurrency}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-indigo-700">
                          {formatMoney(row.totalReady, row.payoutCurrency)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                          {row.totalSent > 0 ? formatMoney(row.totalSent, row.payoutCurrency) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                          {row.totalVerified > 0 ? formatMoney(row.totalVerified, row.payoutCurrency) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                          {row.totalBlocked > 0 ? formatMoney(row.totalBlocked, row.payoutCurrency) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.batchCount}</td>
                        <td className="px-3 py-2 text-right">
                          <BatchLinks batchIds={row.batchIds} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>
      )}

      <Card title="Reading this view" className="mt-6">
        <ul className="space-y-1 text-xs text-slate-600">
          <li>
            Rows are grouped per funding entity, then employing entity and currency — the natural unit for treasury to
            move money.
          </li>
          <li>
            <span className="font-semibold text-slate-700">Ready</span> totals are immediately releasable. Click a batch
            id to open it and mark sent / verified.
          </li>
          <li>
            <span className="font-semibold text-slate-700">Blocked</span> totals represent funding still owed pending
            exception resolution upstream in payroll.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function FunderStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "indigo" | "warning" | "danger";
  icon: React.ReactNode;
}) {
  const accent = {
    indigo: "border-indigo-200 bg-indigo-50/60 text-indigo-700",
    warning: "border-amber-200 bg-amber-50/60 text-amber-700",
    danger: "border-rose-200 bg-rose-50/60 text-rose-700",
  }[tone];
  return (
    <div className={`flex items-start justify-between rounded-lg border p-3 ${accent}`}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums">
          {value > 0 ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value) : "—"}
        </p>
      </div>
      <span className="opacity-70">{icon}</span>
    </div>
  );
}

function BatchLinks({ batchIds }: { batchIds: string[] }) {
  const navigate = useNavigate();
  const batches = useAppStore((s) =>
    s.hr2PaymentInstructionBatches.filter((b) => batchIds.includes(b.id)),
  );
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {batches.map((b) => (
        <button
          key={b.id}
          onClick={() => navigate(`/hr2/finance/batch/${b.id}`)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition hover:bg-slate-50 border-slate-200 text-slate-600`}
        >
          {b.id.replace("hr2pib-", "PIB-")}
          <StatusBadge label={b.status} tone={batchStatusTone(b.status)} size="sm" />
        </button>
      ))}
    </div>
  );
}

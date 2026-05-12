import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Send,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { ConfirmModal, StatusBadge } from "../components/primitives";
import { entityLabel, formatDateTime, formatMoney } from "../compensation/utils";
import { formatPeriod, categoryLabel, severityTone } from "../payroll/utils";
import { batchStatusTone, buildBatchCsv, downloadCsv, lineStatusTone } from "./utils";

export function Hr2FinanceEntityInstructionsPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = params.batchId ?? "";
  const navigate = useNavigate();

  const batch = useAppStore((s) => s.hr2PaymentInstructionBatches.find((b) => b.id === batchId));
  const lines = useAppStore((s) =>
    s.hr2PaymentInstructionLines.filter((l) => l.batchId === batchId),
  );
  const cycle = useAppStore((s) =>
    s.hr2PayrollCycles.find((c) => c.id === batch?.cycleId),
  );
  const exceptions = useAppStore((s) => s.hr2PayrollExceptions);
  const activeUserId = useAppStore((s) => s.activeUserId);
  const markSent = useAppStore((s) => s.markHr2PaymentBatchSent);
  const markVerified = useAppStore((s) => s.markHr2PaymentBatchVerified);
  const verifyLine = useAppStore((s) => s.verifyHr2PaymentInstructionLine);
  const unblockLine = useAppStore((s) => s.unblockHr2PaymentInstructionLine);

  const [sentOpen, setSentOpen] = useState(false);
  const [verifiedOpen, setVerifiedOpen] = useState(false);
  const [unblockId, setUnblockId] = useState<string | null>(null);
  const [unblockNote, setUnblockNote] = useState("");

  const blockingExceptionsByLine = useMemo(() => {
    const map = new Map<string, typeof exceptions>();
    lines.forEach((line) => {
      const list = exceptions.filter((ex) => line.blockingExceptionIds.includes(ex.id));
      map.set(line.id, list);
    });
    return map;
  }, [lines, exceptions]);

  if (!batch) {
    return (
      <div className="p-6">
        <UiPageHeader title="Batch not found" />
        <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/finance")}>
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
      </div>
    );
  }

  const handleExport = () => {
    const csv = buildBatchCsv(batch, lines);
    downloadCsv(`${batch.id}.csv`, csv);
  };

  const handleUnblock = () => {
    if (unblockId) {
      unblockLine(unblockId, activeUserId, unblockNote.trim() || undefined);
    }
    setUnblockId(null);
    setUnblockNote("");
  };

  const canSend = batch.status === "Ready" || batch.status === "PartiallyBlocked";
  const canVerify = batch.status === "Sent";

  return (
    <div className="p-6">
      <Link
        to="/hr2/finance"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to register
      </Link>
      <UiPageHeader
        title={`Batch ${batch.id.replace("hr2pib-", "PIB-")}`}
        subtitle={`${cycle ? formatPeriod(cycle.period) + " · " : ""}${entityLabel(batch.employingEntityId)} · ${batch.payoutCurrency}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleExport}>
              <Download size={14} className="mr-1" /> Export CSV
            </Button>
            {canSend && (
              <Button size="sm" variant="secondary" onClick={() => setSentOpen(true)}>
                <Send size={14} className="mr-1" /> Mark batch sent
              </Button>
            )}
            {canVerify && (
              <Button size="sm" onClick={() => setVerifiedOpen(true)}>
                <ShieldCheck size={14} className="mr-1" /> Mark verified
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Status" value={<StatusBadge label={batch.status} tone={batchStatusTone(batch.status)} dot />} />
          <Field label="Employing entity" value={entityLabel(batch.employingEntityId)} />
          <Field
            label="Funding entity"
            value={
              batch.fundingEntityId && batch.fundingEntityId !== batch.employingEntityId
                ? entityLabel(batch.fundingEntityId)
                : "Same as employing"
            }
          />
          <Field label="Currency" value={batch.payoutCurrency} />
          <Field label="Lines" value={`${batch.lineCount} (${batch.blockedLineCount} blocked)`} />
          <Field
            label="Total"
            value={formatMoney(batch.totalAmount, batch.payoutCurrency)}
          />
          <Field
            label="Blocked"
            value={
              batch.blockedAmount > 0
                ? formatMoney(batch.blockedAmount, batch.payoutCurrency)
                : "None"
            }
          />
          <Field label="Emitted" value={formatDateTime(batch.emittedAt)} />
          {batch.sentAt && <Field label="Sent" value={formatDateTime(batch.sentAt)} />}
          {batch.verifiedAt && <Field label="Verified" value={formatDateTime(batch.verifiedAt)} />}
        </div>
      </Card>

      <Card title={`Instruction lines (${lines.length})`} padded={false}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Employee</th>
              <th className="px-3 py-2 text-left">Payout method</th>
              <th className="px-3 py-2 text-left">Bank</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Blocked reason</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const blocking = blockingExceptionsByLine.get(line.id) ?? [];
              return (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-800">{line.employeeFullName}</div>
                    <div className="text-[11px] text-slate-400">{entityLabel(line.employingEntityId)}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{line.payoutMethod}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {line.bankAccountLast4 ? `••${line.bankAccountLast4}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {formatMoney(line.amount, line.payoutCurrency)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge label={line.status} tone={lineStatusTone(line.status)} dot />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {line.status === "Blocked" ? (
                      <div>
                        <p className="text-rose-700">{line.blockedReason}</p>
                        {blocking.length > 0 && (
                          <ul className="mt-0.5 space-y-0.5">
                            {blocking.map((ex) => (
                              <li key={ex.id} className="text-[10px] text-slate-500">
                                <StatusBadge label={categoryLabel(ex.category)} tone={severityTone(ex.severity)} size="sm" />{" "}
                                {ex.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {line.status === "Blocked" && (
                      <Button size="sm" variant="ghost" onClick={() => setUnblockId(line.id)}>
                        <Unlock size={14} className="mr-1" /> Unblock
                      </Button>
                    )}
                    {line.status === "Sent" && (
                      <Button size="sm" variant="ghost" onClick={() => verifyLine(line.id, activeUserId)}>
                        <CheckCircle2 size={14} className="mr-1" /> Verify line
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {batch.notes && (
        <Card className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Batch notes</p>
          <p className="mt-1 text-xs text-slate-600">{batch.notes}</p>
        </Card>
      )}

      <ConfirmModal
        open={sentOpen}
        title="Mark batch as sent to the bank?"
        description="Ready lines move to Sent. Blocked lines stay Blocked until exceptions are resolved."
        confirmLabel="Mark sent"
        onConfirm={() => {
          markSent(batch.id, activeUserId);
          setSentOpen(false);
        }}
        onCancel={() => setSentOpen(false)}
      />
      <ConfirmModal
        open={verifiedOpen}
        title="Mark batch as verified?"
        description="Confirm the bank has posted these payments. Sent lines move to Verified."
        confirmLabel="Mark verified"
        onConfirm={() => {
          markVerified(batch.id, activeUserId);
          setVerifiedOpen(false);
        }}
        onCancel={() => setVerifiedOpen(false)}
      />
      <ConfirmModal
        open={Boolean(unblockId)}
        title="Unblock this line?"
        description={
          <div>
            <p className="mb-2 text-sm text-slate-600">
              Override the block (e.g. exception was resolved after batch was emitted) and move the line to Ready.
            </p>
            <textarea
              rows={3}
              value={unblockNote}
              onChange={(e) => setUnblockNote(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Optional reason."
            />
          </div>
        }
        confirmLabel="Unblock"
        onConfirm={handleUnblock}
        onCancel={() => { setUnblockId(null); setUnblockNote(""); }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

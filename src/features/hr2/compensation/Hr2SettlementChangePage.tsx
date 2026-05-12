import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { CompPackageHeaderCard } from "./CompPackageHeaderCard";
import { HR2_ENTITIES, entityLabel } from "./utils";
import { OurEntity } from "../../../store/types";

interface DraftRule {
  tempId: string;
  legalEntityId: OurEntity;
  percentage: number;
  note?: string;
}

export function Hr2SettlementChangePage() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId ?? "";
  const navigate = useNavigate();
  const pkg = useAppStore((s) => s.hr2CompensationPackages.find((p) => p.id === packageId));
  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === pkg?.employeeId));
  const activeUserId = useAppStore((s) => s.activeUserId);
  const createChange = useAppStore((s) => s.createHr2ChangeRequest);
  const submitChange = useAppStore((s) => s.submitHr2ChangeRequest);

  const [rules, setRules] = useState<DraftRule[]>(() =>
    pkg
      ? pkg.settlementRules.map((rule, idx) => ({
          tempId: `tmp-${idx}`,
          legalEntityId: rule.legalEntityId,
          percentage: rule.percentage,
          note: rule.note,
        }))
      : [],
  );
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => rules.reduce((sum, r) => sum + (Number.isFinite(r.percentage) ? r.percentage : 0), 0),
    [rules],
  );
  const totalValid = Math.abs(total - 100) < 0.01 && rules.length > 0;

  if (!pkg) {
    return (
      <div className="p-6">
        <UiPageHeader title="Package not found" />
        <Button size="sm" variant="secondary" onClick={() => navigate("/hr2/compensation")}>
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
      </div>
    );
  }

  const valid = totalValid && reason.trim().length > 0 && effectiveFrom;

  const handleSubmit = () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const requestId = createChange({
      kind: "SettlementChange",
      packageId: pkg.id,
      effectiveFrom,
      reason: reason.trim(),
      proposedSettlementRules: rules.map((r) => ({
        legalEntityId: r.legalEntityId,
        percentage: r.percentage,
        note: r.note,
      })),
      userId: activeUserId,
    });
    submitChange(requestId, activeUserId);
    navigate(`/hr2/compensation/${pkg.id}/change/submitted/${requestId}`);
  };

  return (
    <div className="p-6">
      <Link
        to={`/hr2/compensation/${pkg.id}/change`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to change types
      </Link>
      <UiPageHeader
        title="Update settlement rules"
        subtitle="Re-balance how the loaded employer cost splits across legal entities."
      />
      <CompPackageHeaderCard pkg={pkg} employee={employee} />
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Proposed rules</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setRules([
                ...rules,
                {
                  tempId: `tmp-${rules.length}-${Date.now()}`,
                  legalEntityId: pkg.employingEntityId,
                  percentage: 0,
                },
              ])
            }
          >
            <Plus size={14} className="mr-1" /> Add rule
          </Button>
        </div>
        <ul className="space-y-2">
          {rules.map((rule, idx) => (
            <li key={rule.tempId} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-3">
              <select
                value={rule.legalEntityId}
                onChange={(e) =>
                  setRules(rules.map((row, i) => (i === idx ? { ...row, legalEntityId: e.target.value as OurEntity } : row)))
                }
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
              >
                {HR2_ENTITIES.map((entity) => (
                  <option key={entity} value={entity}>
                    {entityLabel(entity)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={rule.percentage}
                onChange={(e) =>
                  setRules(rules.map((row, i) => (i === idx ? { ...row, percentage: Number(e.target.value) } : row)))
                }
                className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs tabular-nums"
              />
              <span className="text-xs text-slate-500">%</span>
              <input
                value={rule.note ?? ""}
                onChange={(e) => setRules(rules.map((row, i) => (i === idx ? { ...row, note: e.target.value } : row)))}
                placeholder="Note (optional)"
                className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <p className={`mt-3 text-xs font-semibold ${totalValid ? "text-emerald-700" : "text-rose-700"}`}>
          Total: {total.toFixed(2)}% {totalValid ? "(valid)" : "(must equal 100%)"}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Effective from</FieldLabel>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel>Reason (required)</FieldLabel>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Cost-recharge update following entity reorganization."
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/hr2/compensation/${pkg.id}/change`)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!valid || submitting}>
            {submitting ? "Submitting..." : "Submit for review"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

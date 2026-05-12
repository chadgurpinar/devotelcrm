import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { CompPackageHeaderCard } from "./CompPackageHeaderCard";
import {
  HR2_CURRENCIES,
  formatMoney,
} from "./utils";
import { HrCurrencyCode } from "../../../store/types";

export function Hr2SalaryChangePage() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId ?? "";
  const navigate = useNavigate();

  const pkg = useAppStore((s) => s.hr2CompensationPackages.find((p) => p.id === packageId));
  const baseComp = useAppStore((s) =>
    s.hr2CompPackageComponents.find((c) => c.packageId === packageId && c.kind === "BaseSalary"),
  );
  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === pkg?.employeeId));
  const activeUserId = useAppStore((s) => s.activeUserId);
  const createChange = useAppStore((s) => s.createHr2ChangeRequest);
  const submitChange = useAppStore((s) => s.submitHr2ChangeRequest);

  const [proposed, setProposed] = useState<number>(baseComp ? Math.round(baseComp.amount * 1.05) : 0);
  const [currency, setCurrency] = useState<HrCurrencyCode>(baseComp?.currency ?? pkg?.packageCurrency ?? "EUR");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const delta = useMemo(() => {
    if (!baseComp) return 0;
    return proposed - baseComp.amount;
  }, [proposed, baseComp]);
  const deltaPct = useMemo(() => {
    if (!baseComp || baseComp.amount === 0) return 0;
    return Math.round((delta / baseComp.amount) * 10000) / 100;
  }, [delta, baseComp]);

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

  const valid = proposed > 0 && effectiveFrom && reason.trim().length > 0;

  const handleSubmit = () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const requestId = createChange({
      kind: "SalaryChange",
      packageId: pkg.id,
      effectiveFrom,
      reason: reason.trim(),
      proposedBaseSalary: proposed,
      proposedCurrency: currency,
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
        title="Request salary change"
        subtitle="A new package version will be created when this change is approved."
      />
      <CompPackageHeaderCard pkg={pkg} employee={employee} />
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Current base salary</FieldLabel>
            <p className="text-2xl font-bold tabular-nums text-slate-700">
              {baseComp ? formatMoney(baseComp.amount, baseComp.currency) : "—"}
            </p>
            <p className="text-[11px] text-slate-400">
              {baseComp ? `${baseComp.currency} · ${baseComp.frequency}` : ""}
            </p>
          </div>
          <div>
            <FieldLabel>Proposed base salary</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={proposed}
                onChange={(e) => setProposed(Number(e.target.value))}
                className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-right text-base font-semibold tabular-nums"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as HrCurrencyCode)}
                className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
              >
                {HR2_CURRENCIES.map((ccy) => (
                  <option key={ccy} value={ccy}>
                    {ccy}
                  </option>
                ))}
              </select>
            </div>
            {baseComp && (
              <p
                className={`mt-1 text-xs font-semibold ${
                  delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-500"
                }`}
              >
                {delta > 0 ? "+" : ""}{formatMoney(delta, currency)} ({deltaPct > 0 ? "+" : ""}{deltaPct}% vs current)
              </p>
            )}
          </div>
          <div>
            <FieldLabel>Effective from</FieldLabel>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Reason (required)</FieldLabel>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual salary review — performance and market correction."
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

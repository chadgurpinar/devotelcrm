import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { CompPackageHeaderCard } from "./CompPackageHeaderCard";
import { HR2_CURRENCIES } from "./utils";
import { Hr2CompComponentFrequency, HrCurrencyCode } from "../../../store/types";

export function Hr2VariableBonusPage() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId ?? "";
  const navigate = useNavigate();

  const pkg = useAppStore((s) => s.hr2CompensationPackages.find((p) => p.id === packageId));
  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === pkg?.employeeId));
  const activeUserId = useAppStore((s) => s.activeUserId);
  const createChange = useAppStore((s) => s.createHr2ChangeRequest);
  const submitChange = useAppStore((s) => s.submitHr2ChangeRequest);

  const [label, setLabel] = useState("Performance bonus");
  const [amount, setAmount] = useState(1000);
  const [currency, setCurrency] = useState<HrCurrencyCode>(pkg?.packageCurrency ?? "EUR");
  const [frequency, setFrequency] = useState<Hr2CompComponentFrequency>("OneOff");
  const [taxable, setTaxable] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const valid = label.trim().length > 0 && amount > 0 && reason.trim().length > 0 && effectiveFrom;

  const handleSubmit = () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const requestId = createChange({
      kind: "VariableBonus",
      packageId: pkg.id,
      effectiveFrom,
      reason: reason.trim(),
      bonusLabel: label.trim(),
      bonusAmount: amount,
      bonusCurrency: currency,
      bonusFrequency: frequency,
      taxable,
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
        title="Add variable bonus"
        subtitle="A bonus component will be added to a new package version when approved."
      />
      <CompPackageHeaderCard pkg={pkg} employee={employee} />
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel>Bonus label</FieldLabel>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <FieldLabel>Amount</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
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
          </div>
          <div>
            <FieldLabel>Frequency</FieldLabel>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Hr2CompComponentFrequency)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="OneOff">One-off</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Annual">Annual</option>
            </select>
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
          <div>
            <FieldLabel>Taxable</FieldLabel>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={taxable} onChange={(e) => setTaxable(e.target.checked)} />
              Counts as taxable income
            </label>
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Reason (required)</FieldLabel>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Q1 performance bonus per individual review."
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

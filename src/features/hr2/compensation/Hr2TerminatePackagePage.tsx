import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { CompPackageHeaderCard } from "./CompPackageHeaderCard";
import { HR2_CURRENCIES } from "./utils";
import { HrCurrencyCode } from "../../../store/types";

export function Hr2TerminatePackagePage() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId ?? "";
  const navigate = useNavigate();
  const pkg = useAppStore((s) => s.hr2CompensationPackages.find((p) => p.id === packageId));
  const employee = useAppStore((s) => s.hrEmployees.find((e) => e.id === pkg?.employeeId));
  const activeUserId = useAppStore((s) => s.activeUserId);
  const createChange = useAppStore((s) => s.createHr2ChangeRequest);
  const submitChange = useAppStore((s) => s.submitHr2ChangeRequest);

  const [terminationReason, setTerminationReason] = useState("");
  const [lastPayrollDate, setLastPayrollDate] = useState("");
  const [finalAmount, setFinalAmount] = useState(0);
  const [finalCurrency, setFinalCurrency] = useState<HrCurrencyCode>(pkg?.packageCurrency ?? "EUR");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
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

  const valid = terminationReason.trim().length > 0 && effectiveFrom;

  const handleSubmit = () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const requestId = createChange({
      kind: "Termination",
      packageId: pkg.id,
      effectiveFrom,
      terminationReason: terminationReason.trim(),
      lastPayrollDate: lastPayrollDate || undefined,
      finalSettlementCurrency: finalAmount > 0 ? finalCurrency : undefined,
      finalSettlementAmount: finalAmount > 0 ? finalAmount : undefined,
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
        title="Terminate compensation package"
        subtitle="The package will be marked Terminated once this request is approved. No new packages will be auto-created."
      />
      <CompPackageHeaderCard pkg={pkg} employee={employee} />
      <Card className="border-rose-200">
        <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50/50 p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
          <div className="text-xs text-rose-800">
            Termination is irreversible once approved. After approval the employee will no longer
            generate payroll lines until a new active package is created.
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel>Termination reason (required)</FieldLabel>
            <textarea
              rows={3}
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="e.g. Employment ended on mutual agreement; final settlement scheduled."
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
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
            <FieldLabel>Last payroll date (optional)</FieldLabel>
            <input
              type="date"
              value={lastPayrollDate}
              onChange={(e) => setLastPayrollDate(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Final settlement amount (optional)</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={finalAmount}
                onChange={(e) => setFinalAmount(Number(e.target.value))}
                className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-right text-base font-semibold tabular-nums"
              />
              <select
                value={finalCurrency}
                onChange={(e) => setFinalCurrency(e.target.value as HrCurrencyCode)}
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
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/hr2/compensation/${pkg.id}/change`)}>
            Cancel
          </Button>
          <Button size="sm" variant="danger" onClick={handleSubmit} disabled={!valid || submitting}>
            {submitting ? "Submitting..." : "Submit termination"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

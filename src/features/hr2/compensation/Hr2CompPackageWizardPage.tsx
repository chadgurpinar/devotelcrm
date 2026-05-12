import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { Stepper, StepperStep } from "../components/primitives";
import {
  HR2_CURRENCIES,
  HR2_ENTITIES,
  componentKindAccent,
  componentKindLabel,
  entityLabel,
  formatMoney,
  summarizeComponents,
} from "./utils";
import {
  Hr2CompComponentFrequency,
  Hr2CompComponentKind,
  Hr2PayrollFrequency,
  HrCurrencyCode,
  OurEntity,
} from "../../../store/types";

interface WizardComponent {
  tempId: string;
  kind: Hr2CompComponentKind;
  label: string;
  amount: number;
  currency: HrCurrencyCode;
  frequency: Hr2CompComponentFrequency;
  taxable: boolean;
}

interface WizardSettlementRule {
  tempId: string;
  legalEntityId: OurEntity;
  percentage: number;
  note?: string;
}

const STEP_IDS = [
  "employee",
  "frame",
  "components",
  "settlement",
  "review",
  "submit",
] as const;
type StepId = (typeof STEP_IDS)[number];

const STEP_LABELS: Record<StepId, { label: string; description: string }> = {
  employee: { label: "Employee", description: "Pick the employee for this package." },
  frame: { label: "Employment frame", description: "Entity, currency, frequency, effective date." },
  components: { label: "Components", description: "Base salary, allowances, deductions, employer cost." },
  settlement: { label: "Settlement", description: "How the loaded cost splits across entities." },
  review: { label: "Review", description: "Verify totals before saving." },
  submit: { label: "Submit", description: "Create the draft package." },
};

export function Hr2CompPackageWizardPage() {
  const navigate = useNavigate();
  const employees = useAppStore((s) => s.hrEmployees);
  const activeUserId = useAppStore((s) => s.activeUserId);
  const upsertExtension = useAppStore((s) => s.upsertHr2EmployeeExtension);
  const createPackage = useAppStore((s) => s.createHr2Package);
  const existingExtensions = useAppStore((s) => s.hr2EmployeeExtensions);

  const [stepIdx, setStepIdx] = useState(0);
  const stepId: StepId = STEP_IDS[stepIdx]!;

  const [employeeId, setEmployeeId] = useState("");
  const [employingEntityId, setEmployingEntityId] = useState<OurEntity>("UK");
  const [fundingEntityId, setFundingEntityId] = useState<"same" | OurEntity>("same");
  const [packageCurrency, setPackageCurrency] = useState<HrCurrencyCode>("EUR");
  const [payrollFrequency, setPayrollFrequency] = useState<Hr2PayrollFrequency>("Monthly");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [components, setComponents] = useState<WizardComponent[]>([
    {
      tempId: "tmp-base",
      kind: "BaseSalary",
      label: "Monthly base salary",
      amount: 0,
      currency: "EUR",
      frequency: "Monthly",
      taxable: true,
    },
    {
      tempId: "tmp-deduction",
      kind: "Deduction",
      label: "Income tax withholding",
      amount: 0,
      currency: "EUR",
      frequency: "Monthly",
      taxable: false,
    },
    {
      tempId: "tmp-employer",
      kind: "EmployerCost",
      label: "Loaded employer cost",
      amount: 0,
      currency: "EUR",
      frequency: "Monthly",
      taxable: false,
    },
  ]);
  const [settlementRules, setSettlementRules] = useState<WizardSettlementRule[]>([
    {
      tempId: "tmp-sr",
      legalEntityId: "UK",
      percentage: 100,
      note: "Single-entity settlement.",
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const employee = employees.find((e) => e.id === employeeId);
  const sortedEmployees = useMemo(
    () => employees.slice().sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [employees],
  );

  const summary = useMemo(
    () => summarizeComponents(components.map((c) => ({ kind: c.kind, amount: c.amount }))),
    [components],
  );

  const settlementTotal = settlementRules.reduce((sum, r) => sum + (Number.isFinite(r.percentage) ? r.percentage : 0), 0);
  const settlementValid = Math.abs(settlementTotal - 100) < 0.01 && settlementRules.length > 0;

  const employeeStepValid = Boolean(employee);
  const frameStepValid = Boolean(employingEntityId && packageCurrency && payrollFrequency && effectiveFrom);
  const componentsStepValid = components.length > 0 && components.every((c) => c.label.trim() && Number.isFinite(c.amount));
  const reviewStepValid = employeeStepValid && frameStepValid && componentsStepValid && settlementValid;

  const stepperSteps: StepperStep[] = STEP_IDS.map((id, idx) => ({
    id,
    label: STEP_LABELS[id].label,
    status:
      idx < stepIdx ? "completed" : idx === stepIdx ? "active" : "pending",
  }));

  const stepValidByIndex = [
    employeeStepValid,
    frameStepValid,
    componentsStepValid,
    settlementValid,
    reviewStepValid,
    true,
  ];

  const next = () => {
    if (stepValidByIndex[stepIdx] && stepIdx < STEP_IDS.length - 1) {
      setStepIdx(stepIdx + 1);
    }
  };
  const back = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  const handleCreate = () => {
    if (!employee || submitting) return;
    setSubmitting(true);
    const resolvedFunding =
      fundingEntityId === "same" || fundingEntityId === employingEntityId ? undefined : fundingEntityId;
    upsertExtension({
      employeeId: employee.id,
      employingEntityId,
      fundingEntityId: resolvedFunding,
      payrollFrequency,
      payoutMethod: "BankTransfer",
      bankAccountLast4: undefined,
      hasBankDetails: existingExtensions.find((ext) => ext.employeeId === employee.id)?.hasBankDetails ?? false,
      activePackageId: existingExtensions.find((ext) => ext.employeeId === employee.id)?.activePackageId,
    });
    const newPackageId = createPackage({
      employeeId: employee.id,
      employingEntityId,
      fundingEntityId: resolvedFunding,
      packageCurrency,
      payrollFrequency,
      effectiveFrom,
      settlementRules: settlementRules.map((rule) => ({
        legalEntityId: rule.legalEntityId,
        percentage: rule.percentage,
        note: rule.note,
      })),
      components: components.map((c) => ({
        kind: c.kind,
        label: c.label,
        amount: c.amount,
        currency: c.currency,
        frequency: c.frequency,
        taxable: c.taxable,
      })),
      notes: notes.trim() || undefined,
      userId: activeUserId,
    });
    navigate(`/hr2/compensation/${newPackageId}`);
  };

  return (
    <div className="p-6">
      <UiPageHeader
        title="New compensation package"
        subtitle="6 steps. The package is created as Draft so you can refine before submitting for review."
        actions={
          <Button size="sm" variant="ghost" onClick={() => navigate("/hr2/compensation")}>
            <ArrowLeft size={14} className="mr-1" /> Cancel
          </Button>
        }
      />
      <Card className="mb-4">
        <Stepper steps={stepperSteps} currentStepId={stepId} />
        <p className="mt-3 text-xs text-slate-500">{STEP_LABELS[stepId].description}</p>
      </Card>

      <Card className="mb-4">
        {stepId === "employee" && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Choose an employee</h3>
            <FieldLabel>Employee</FieldLabel>
            <select
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                const found = employees.find((emp) => emp.id === e.target.value);
                if (found) {
                  setEmployingEntityId(found.legalEntityId);
                }
              }}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select an employee...</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} · {emp.position ?? "—"} · {emp.legalEntityId}
                </option>
              ))}
            </select>
            {employee && (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">{employee.firstName} {employee.lastName}</span>{" "}
                  · {employee.position ?? "—"} · {employee.departmentId}
                </p>
                <p>Legal entity: {employee.legalEntityId}</p>
              </div>
            )}
          </div>
        )}

        {stepId === "frame" && (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Employing entity</FieldLabel>
              <select
                value={employingEntityId}
                onChange={(e) => setEmployingEntityId(e.target.value as OurEntity)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {HR2_ENTITIES.map((entity) => (
                  <option key={entity} value={entity}>
                    {entityLabel(entity)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Funding entity</FieldLabel>
              <select
                value={fundingEntityId}
                onChange={(e) => setFundingEntityId(e.target.value as "same" | OurEntity)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="same">Same as employing</option>
                {HR2_ENTITIES.filter((entity) => entity !== employingEntityId).map((entity) => (
                  <option key={entity} value={entity}>
                    {entityLabel(entity)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Package currency</FieldLabel>
              <select
                value={packageCurrency}
                onChange={(e) => setPackageCurrency(e.target.value as HrCurrencyCode)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {HR2_CURRENCIES.map((ccy) => (
                  <option key={ccy} value={ccy}>
                    {ccy}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Payroll frequency</FieldLabel>
              <select
                value={payrollFrequency}
                onChange={(e) => setPayrollFrequency(e.target.value as Hr2PayrollFrequency)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="Monthly">Monthly</option>
                <option value="BiWeekly">Bi-weekly</option>
                <option value="Weekly">Weekly</option>
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
            <div className="md:col-span-2">
              <FieldLabel>Notes (optional)</FieldLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Context for reviewers..."
              />
            </div>
          </div>
        )}

        {stepId === "components" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Compensation components</h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setComponents([
                    ...components,
                    {
                      tempId: `tmp-${components.length + 1}`,
                      kind: "Allowance",
                      label: "Allowance",
                      amount: 0,
                      currency: packageCurrency,
                      frequency: "Monthly",
                      taxable: false,
                    },
                  ])
                }
              >
                <Plus size={14} className="mr-1" /> Add component
              </Button>
            </div>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Kind</th>
                    <th className="px-3 py-2 text-left">Label</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Currency</th>
                    <th className="px-3 py-2 text-left">Frequency</th>
                    <th className="px-3 py-2 text-left">Taxable</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((c, idx) => (
                    <tr key={c.tempId} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <select
                          value={c.kind}
                          onChange={(e) =>
                            setComponents(
                              components.map((row, i) =>
                                i === idx ? { ...row, kind: e.target.value as Hr2CompComponentKind } : row,
                              ),
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          {(["BaseSalary", "Allowance", "Deduction", "EmployerCost", "VariableBonus"] as Hr2CompComponentKind[]).map((k) => (
                            <option key={k} value={k}>
                              {componentKindLabel(k)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={c.label}
                          onChange={(e) =>
                            setComponents(
                              components.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row)),
                            )
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={c.amount}
                          onChange={(e) =>
                            setComponents(
                              components.map((row, i) =>
                                i === idx ? { ...row, amount: Number(e.target.value) } : row,
                              ),
                            )
                          }
                          className="w-32 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={c.currency}
                          onChange={(e) =>
                            setComponents(
                              components.map((row, i) =>
                                i === idx ? { ...row, currency: e.target.value as HrCurrencyCode } : row,
                              ),
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          {HR2_CURRENCIES.map((ccy) => (
                            <option key={ccy} value={ccy}>
                              {ccy}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={c.frequency}
                          onChange={(e) =>
                            setComponents(
                              components.map((row, i) =>
                                i === idx ? { ...row, frequency: e.target.value as Hr2CompComponentFrequency } : row,
                              ),
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Annual">Annual</option>
                          <option value="OneOff">One-off</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={c.taxable}
                          onChange={(e) =>
                            setComponents(
                              components.map((row, i) =>
                                i === idx ? { ...row, taxable: e.target.checked } : row,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setComponents(components.filter((_, i) => i !== idx))}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <SummaryStat label="Gross" value={formatMoney(summary.gross, packageCurrency)} />
              <SummaryStat label="Deductions" value={formatMoney(summary.deductions, packageCurrency)} />
              <SummaryStat label="Net" value={formatMoney(summary.net, packageCurrency)} accent />
              <SummaryStat label="Employer cost" value={formatMoney(summary.employerCost, packageCurrency)} />
            </div>
          </div>
        )}

        {stepId === "settlement" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Settlement rules</h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setSettlementRules([
                    ...settlementRules,
                    {
                      tempId: `tmp-sr-${settlementRules.length + 1}`,
                      legalEntityId: employingEntityId,
                      percentage: 0,
                    },
                  ])
                }
              >
                <Plus size={14} className="mr-1" /> Add rule
              </Button>
            </div>
            <ul className="space-y-2">
              {settlementRules.map((rule, idx) => (
                <li key={rule.tempId} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-3">
                  <select
                    value={rule.legalEntityId}
                    onChange={(e) =>
                      setSettlementRules(
                        settlementRules.map((row, i) =>
                          i === idx ? { ...row, legalEntityId: e.target.value as OurEntity } : row,
                        ),
                      )
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
                      setSettlementRules(
                        settlementRules.map((row, i) =>
                          i === idx ? { ...row, percentage: Number(e.target.value) } : row,
                        ),
                      )
                    }
                    className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs tabular-nums"
                  />
                  <span className="text-xs text-slate-500">%</span>
                  <input
                    value={rule.note ?? ""}
                    onChange={(e) =>
                      setSettlementRules(
                        settlementRules.map((row, i) => (i === idx ? { ...row, note: e.target.value } : row)),
                      )
                    }
                    placeholder="Note (optional)"
                    className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setSettlementRules(settlementRules.filter((_, i) => i !== idx))}
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <p className={`mt-3 text-xs ${settlementValid ? "text-emerald-700" : "text-rose-700"}`}>
              Total: {settlementTotal.toFixed(2)}% {settlementValid ? "(valid)" : "(must equal 100%)"}
            </p>
          </div>
        )}

        {stepId === "review" && (
          <div className="space-y-3">
            <ReviewSection title="Employee">
              <p>
                <span className="font-semibold text-slate-800">{employee?.firstName} {employee?.lastName}</span>
                {employee?.position ? ` · ${employee.position}` : ""}
              </p>
            </ReviewSection>
            <ReviewSection title="Employment frame">
              <p>
                {entityLabel(employingEntityId)} (employing) ·{" "}
                {fundingEntityId === "same" ? "same funding" : `${entityLabel(fundingEntityId as OurEntity)} funding`} · {packageCurrency} · {payrollFrequency}
              </p>
              <p className="text-xs text-slate-500">Effective from {effectiveFrom}</p>
            </ReviewSection>
            <ReviewSection title="Components">
              <ul className="space-y-1.5">
                {components.map((c) => {
                  const accent = componentKindAccent(c.kind);
                  return (
                    <li key={c.tempId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border ${accent.bg} ${accent.text} ${accent.border} px-2 py-0.5 text-[10px] font-semibold`}>
                          {componentKindLabel(c.kind)}
                        </span>
                        <span className="text-sm text-slate-700">{c.label}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-slate-800">
                        {formatMoney(c.amount, c.currency)}
                        <span className="ml-1 text-[10px] text-slate-400">/ {c.frequency}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <SummaryStat label="Gross" value={formatMoney(summary.gross, packageCurrency)} />
                <SummaryStat label="Deductions" value={formatMoney(summary.deductions, packageCurrency)} />
                <SummaryStat label="Net" value={formatMoney(summary.net, packageCurrency)} accent />
                <SummaryStat label="Employer cost" value={formatMoney(summary.employerCost, packageCurrency)} />
              </div>
            </ReviewSection>
            <ReviewSection title="Settlement">
              <ul className="space-y-1">
                {settlementRules.map((rule) => (
                  <li key={rule.tempId} className="flex justify-between text-sm">
                    <span>{entityLabel(rule.legalEntityId)}</span>
                    <span className="font-semibold tabular-nums text-brand-700">{rule.percentage}%</span>
                  </li>
                ))}
              </ul>
            </ReviewSection>
          </div>
        )}

        {stepId === "submit" && (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto text-brand-600" size={32} />
            <h3 className="mt-3 text-base font-semibold text-slate-900">Ready to create draft</h3>
            <p className="mt-1 text-sm text-slate-600">
              The package will be created as Draft. You can refine it before submitting for review.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setStepIdx(stepIdx - 1)}>
                <ArrowLeft size={14} className="mr-1" /> Back to review
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={!reviewStepValid || submitting}>
                {submitting ? "Creating..." : "Create draft package"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {stepId !== "submit" && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" onClick={back} disabled={stepIdx === 0}>
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
          <Button size="sm" onClick={next} disabled={!stepValidByIndex[stepIdx]}>
            Next <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border ${accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"} p-2`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular-nums ${accent ? "text-emerald-700" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {children}
    </div>
  );
}

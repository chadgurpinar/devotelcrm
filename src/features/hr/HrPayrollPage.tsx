import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { computePayrollPreview } from "../../store/hrUtils";
import { HrCurrencyCode, HrEmployeeCompensation, HrEmploymentType, HrPayrollFilters, OurEntity } from "../../store/types";

type DistributionDraft = {
  id: string;
  legalEntityId: OurEntity;
  percent: number;
};

type BonusDraft = {
  id: string;
  date: string;
  amount: number;
  currency: HrCurrencyCode;
  description: string;
};

type CompensationDraft = {
  employeeId: string;
  baseSalaryNet: number;
  baseSalaryGross: number;
  employerCost: number;
  currency: HrCurrencyCode;
  distribution: DistributionDraft[];
  bonuses: BonusDraft[];
};

const currencyOptions: HrCurrencyCode[] = ["EUR", "USD", "GBP", "TRY"];
const employmentOptions: HrEmploymentType[] = ["Full-time", "Part-time", "Contractor"];

function employeeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function currencyByCountry(country: string): HrCurrencyCode {
  if (country === "Turkey") return "TRY";
  if (country === "United States") return "USD";
  if (country === "United Kingdom") return "GBP";
  return "EUR";
}

function emptyCompensation(employeeId: string): CompensationDraft {
  return {
    employeeId,
    baseSalaryNet: 0,
    baseSalaryGross: 0,
    employerCost: 0,
    currency: "EUR",
    distribution: [{ id: `dist-${employeeId}-1`, legalEntityId: "UK", percent: 100 }],
    bonuses: [],
  };
}

function toCompensationPayload(draft: CompensationDraft): Omit<HrEmployeeCompensation, "id" | "createdAt" | "updatedAt"> {
  return {
    employeeId: draft.employeeId,
    baseSalaryNet: draft.baseSalaryNet,
    baseSalaryGross: draft.baseSalaryGross,
    employerCost: draft.employerCost,
    currency: draft.currency,
    salaryDistribution: draft.distribution.map((line) => ({
      id: line.id,
      legalEntityId: line.legalEntityId,
      mode: "Percent" as const,
      percent: line.percent,
      currency: draft.currency,
    })),
    bonusEntries: draft.bonuses.map((bonus) => ({
      id: bonus.id,
      employeeId: draft.employeeId,
      date: bonus.date,
      amount: bonus.amount,
      currency: bonus.currency,
      description: bonus.description,
    })),
  };
}

export function HrPayrollPage() {
  const state = useAppStore();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filters, setFilters] = useState<HrPayrollFilters>({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [draft, setDraft] = useState<CompensationDraft | null>(null);
  const [isCompModalOpen, setCompModalOpen] = useState(false);
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [fxDraft, setFxDraft] = useState({
    from: "USD" as HrCurrencyCode,
    rate: 0.94,
    effectiveAt: new Date().toISOString().slice(0, 10),
  });

  const employeeById = useMemo(() => {
    const map = new Map(state.hrEmployees.map((employee) => [employee.id, employee]));
    return map;
  }, [state.hrEmployees]);
  const legalEntityById = useMemo(() => {
    const map = new Map(state.hrLegalEntities.map((entity) => [entity.id, entity]));
    return map;
  }, [state.hrLegalEntities]);

  const latestFxByCurrency = useMemo(() => {
    const map = new Map<HrCurrencyCode, (typeof state.hrFxRates)[number]>();
    state.hrFxRates
      .slice()
      .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))
      .forEach((rate) => {
        if (!map.has(rate.from)) map.set(rate.from, rate);
      });
    return map;
  }, [state.hrFxRates]);

  const preview = useMemo(
    () =>
      computePayrollPreview({
        employees: state.hrEmployees,
        compensations: state.hrCompensations,
        fxRates: state.hrFxRates,
        month,
        filters,
      }),
    [filters, month, state.hrCompensations, state.hrEmployees, state.hrFxRates],
  );

  const countries = useMemo(
    () => Array.from(new Set(state.hrEmployees.map((employee) => employee.countryOfEmployment))).sort((a, b) => a.localeCompare(b)),
    [state.hrEmployees],
  );

  function openCompensationModal(employeeId: string) {
    const existing = state.hrCompensations.find((row) => row.employeeId === employeeId);
    setSelectedEmployeeId(employeeId);
    if (!existing) {
      const employee = state.hrEmployees.find((row) => row.id === employeeId);
      const next = emptyCompensation(employeeId);
      if (employee) {
        const legalEntity = employee.legalEntityId;
        next.currency = legalEntityById.get(legalEntity)?.currency ?? currencyByCountry(employee.countryOfEmployment);
        next.distribution = [{ id: `dist-${employeeId}-1`, legalEntityId: legalEntity, percent: 100 }];
      }
      setDraft(next);
      setCompModalOpen(true);
      return;
    }
    setDraft({
      employeeId: existing.employeeId,
      baseSalaryNet: existing.baseSalaryNet,
      baseSalaryGross: existing.baseSalaryGross,
      employerCost: existing.employerCost,
      currency: existing.currency,
      distribution: existing.salaryDistribution.map((line) => ({
        id: line.id,
        legalEntityId: line.legalEntityId,
        percent: Number(line.percent ?? 0),
      })),
      bonuses: existing.bonusEntries.map((bonus) => ({
        id: bonus.id,
        date: bonus.date,
        amount: bonus.amount,
        currency: bonus.currency,
        description: bonus.description,
      })),
    });
    setCompModalOpen(true);
  }

  function saveCompensation() {
    if (!draft) return;
    state.upsertHrCompensation(toCompensationPayload(draft));
    setCompModalOpen(false);
  }

  function addDistributionLine() {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            distribution: [...prev.distribution, { id: `dist-${prev.employeeId}-${crypto.randomUUID().slice(0, 6)}`, legalEntityId: "UK", percent: 0 }],
          }
        : prev,
    );
  }

  function addBonusLine() {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            bonuses: [
              ...prev.bonuses,
              {
                id: `bonus-${crypto.randomUUID().slice(0, 6)}`,
                date: new Date().toISOString().slice(0, 10),
                amount: 0,
                currency: prev.currency,
                description: "",
              },
            ],
          }
        : prev,
    );
  }

  function saveFxRate() {
    if (!fxDraft.rate || fxDraft.rate <= 0 || !fxDraft.effectiveAt) return;
    state.upsertHrFxRate({
      from: fxDraft.from,
      to: "EUR",
      rate: fxDraft.rate,
      effectiveAt: `${fxDraft.effectiveAt}T00:00:00.000Z`,
    });
  }

  function generateSnapshot() {
    state.generateHrPayrollSnapshot({
      month,
      filters,
      notes: snapshotNotes,
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Payroll & Compensation">
        <div className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-6">
          <div>
            <FieldLabel>Month</FieldLabel>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <div>
            <FieldLabel>Legal entity</FieldLabel>
            <select
              value={filters.legalEntityId ?? ""}
              onChange={(event) => setFilters((prev) => ({ ...prev, legalEntityId: (event.target.value as OurEntity) || "" }))}
            >
              <option value="">All</option>
              {state.hrLegalEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Department</FieldLabel>
            <select
              value={filters.departmentId ?? ""}
              onChange={(event) => setFilters((prev) => ({ ...prev, departmentId: event.target.value || "" }))}
            >
              <option value="">All</option>
              {state.hrDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Country</FieldLabel>
            <select value={filters.country ?? ""} onChange={(event) => setFilters((prev) => ({ ...prev, country: event.target.value || "" }))}>
              <option value="">All</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Employment type</FieldLabel>
            <select
              value={filters.employmentType ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, employmentType: (event.target.value as HrEmploymentType) || "" }))
              }
            >
              <option value="">All</option>
              {employmentOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={generateSnapshot}>
              Generate snapshot
            </Button>
          </div>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Net total (EUR)</p>
            <p className="text-lg font-semibold text-slate-800">{preview.totals.netEur.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Employer cost (EUR)</p>
            <p className="text-lg font-semibold text-slate-800">{preview.totals.employerCostEur.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Bonuses (EUR)</p>
            <p className="text-lg font-semibold text-slate-800">{preview.totals.bonusesEur.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Headcount</p>
            <p className="text-lg font-semibold text-slate-800">{preview.totals.headcount}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Currency</th>
                <th>Net</th>
                <th>Employer cost</th>
                <th>Bonuses</th>
                <th>Net EUR</th>
                <th>Distribution</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {preview.lines.map((line) => {
                const employee = employeeById.get(line.employeeId);
                return (
                  <tr key={line.id}>
                    <td>
                      <p className="font-semibold text-slate-700">{employee ? employeeName(employee.firstName, employee.lastName) : line.employeeId}</p>
                      <p className="text-[11px] text-slate-500">{employee?.countryOfEmployment ?? "-"}</p>
                    </td>
                    <td>{line.currency}</td>
                    <td>{line.net.toLocaleString()}</td>
                    <td>{line.employerCost.toLocaleString()}</td>
                    <td>{line.bonusesTotal.toLocaleString()}</td>
                    <td>{line.netEur.toLocaleString()}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {line.distributionBreakdown.map((entry) => (
                          <Badge key={`${line.id}-${entry.legalEntityId}`} className="bg-slate-100 text-slate-700">
                            {entry.legalEntityId} {entry.weightPct.toFixed(0)}%
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (!employee) return;
                          openCompensationModal(employee.id);
                        }}
                      >
                        Edit comp
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="FX Rates (Manual)">
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <div>
            <FieldLabel>Currency</FieldLabel>
            <select value={fxDraft.from} onChange={(event) => setFxDraft((prev) => ({ ...prev, from: event.target.value as HrCurrencyCode }))}>
              {currencyOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Rate to EUR</FieldLabel>
            <input
              type="number"
              step="0.0001"
              value={fxDraft.rate}
              onChange={(event) => setFxDraft((prev) => ({ ...prev, rate: Number(event.target.value) }))}
            />
          </div>
          <div>
            <FieldLabel>Effective date</FieldLabel>
            <input
              type="date"
              value={fxDraft.effectiveAt}
              onChange={(event) => setFxDraft((prev) => ({ ...prev, effectiveAt: event.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={saveFxRate}>
              Save FX rate
            </Button>
          </div>
          <div className="flex items-end">
            <p className="text-[11px] text-slate-500">Reporting currency is fixed to EUR.</p>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          {currencyOptions.map((currency) => {
            const row = latestFxByCurrency.get(currency);
            return (
              <div key={currency} className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{currency} to EUR</p>
                <p className="text-sm font-semibold text-slate-800">{row ? row.rate : "-"}</p>
                <p className="text-[11px] text-slate-500">{row ? new Date(row.effectiveAt).toLocaleDateString() : "No rate"}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Payroll Snapshots">
        <div className="mb-2 grid gap-2 md:grid-cols-[1fr_auto]">
          <input value={snapshotNotes} onChange={(event) => setSnapshotNotes(event.target.value)} placeholder="Optional note for next snapshot" />
          <Button size="sm" onClick={generateSnapshot}>
            Save snapshot
          </Button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Created</th>
              <th>Headcount</th>
              <th>Net EUR</th>
              <th>Employer cost EUR</th>
              <th>Bonuses EUR</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {state.hrPayrollSnapshots
              .slice()
              .sort((a, b) => b.month.localeCompare(a.month))
              .map((snapshot) => (
                <tr key={snapshot.id}>
                  <td>{snapshot.month}</td>
                  <td>{new Date(snapshot.createdAt).toLocaleString()}</td>
                  <td>{snapshot.totals.headcount}</td>
                  <td>{snapshot.totals.netEur.toLocaleString()}</td>
                  <td>{snapshot.totals.employerCostEur.toLocaleString()}</td>
                  <td>{snapshot.totals.bonusesEur.toLocaleString()}</td>
                  <td className="text-xs">{snapshot.notes || "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>

      {isCompModalOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setCompModalOpen(false)}>
          <div className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Edit compensation ·{" "}
                {selectedEmployeeId && employeeById.get(selectedEmployeeId)
                  ? employeeName(employeeById.get(selectedEmployeeId)!.firstName, employeeById.get(selectedEmployeeId)!.lastName)
                  : draft.employeeId}
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setCompModalOpen(false)}>
                Close
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <div>
                <FieldLabel>Currency</FieldLabel>
                <select
                  value={draft.currency}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, currency: event.target.value as HrCurrencyCode } : prev))}
                >
                  {currencyOptions.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Base net</FieldLabel>
                <input
                  type="number"
                  value={draft.baseSalaryNet}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, baseSalaryNet: Number(event.target.value) } : prev))}
                />
              </div>
              <div>
                <FieldLabel>Base gross</FieldLabel>
                <input
                  type="number"
                  value={draft.baseSalaryGross}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, baseSalaryGross: Number(event.target.value) } : prev))}
                />
              </div>
              <div>
                <FieldLabel>Employer cost</FieldLabel>
                <input
                  type="number"
                  value={draft.employerCost}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, employerCost: Number(event.target.value) } : prev))}
                />
              </div>
            </div>

            <section className="mt-3 rounded-md border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Salary distribution (%)</p>
                <Button size="sm" variant="secondary" onClick={addDistributionLine}>
                  Add row
                </Button>
              </div>
              <div className="space-y-2">
                {draft.distribution.map((line) => (
                  <div key={line.id} className="grid gap-2 md:grid-cols-5">
                    <div>
                      <FieldLabel>Legal entity</FieldLabel>
                      <select
                        value={line.legalEntityId}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  distribution: prev.distribution.map((entry) =>
                                    entry.id === line.id ? { ...entry, legalEntityId: event.target.value as OurEntity } : entry,
                                  ),
                                }
                              : prev,
                          )
                        }
                      >
                        {state.hrLegalEntities.map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {entity.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Percent</FieldLabel>
                      <input
                        type="number"
                        value={line.percent}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  distribution: prev.distribution.map((entry) =>
                                    entry.id === line.id ? { ...entry, percent: Number(event.target.value) } : entry,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  distribution:
                                    prev.distribution.length > 1
                                      ? prev.distribution.filter((entry) => entry.id !== line.id)
                                      : prev.distribution,
                                }
                              : prev,
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-slate-500">
                  Total: {draft.distribution.reduce((sum, line) => sum + Number(line.percent || 0), 0).toFixed(2)}%
                </p>
              </div>
            </section>

            <section className="mt-3 rounded-md border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manual bonuses</p>
                <Button size="sm" variant="secondary" onClick={addBonusLine}>
                  Add bonus
                </Button>
              </div>
              <div className="space-y-2">
                {draft.bonuses.map((bonus) => (
                  <div key={bonus.id} className="grid gap-2 md:grid-cols-6">
                    <div>
                      <FieldLabel>Date</FieldLabel>
                      <input
                        type="date"
                        value={bonus.date}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  bonuses: prev.bonuses.map((entry) =>
                                    entry.id === bonus.id ? { ...entry, date: event.target.value } : entry,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Amount</FieldLabel>
                      <input
                        type="number"
                        value={bonus.amount}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  bonuses: prev.bonuses.map((entry) =>
                                    entry.id === bonus.id ? { ...entry, amount: Number(event.target.value) } : entry,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Currency</FieldLabel>
                      <select
                        value={bonus.currency}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  bonuses: prev.bonuses.map((entry) =>
                                    entry.id === bonus.id ? { ...entry, currency: event.target.value as HrCurrencyCode } : entry,
                                  ),
                                }
                              : prev,
                          )
                        }
                      >
                        {currencyOptions.map((entry) => (
                          <option key={entry} value={entry}>
                            {entry}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>Description</FieldLabel>
                      <input
                        value={bonus.description}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  bonuses: prev.bonuses.map((entry) =>
                                    entry.id === bonus.id ? { ...entry, description: event.target.value } : entry,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  bonuses: prev.bonuses.filter((entry) => entry.id !== bonus.id),
                                }
                              : prev,
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setCompModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveCompensation}>
                Save compensation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

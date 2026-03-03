import { useState } from "react";
import { Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { HrCurrencyCode, OurEntity } from "../../store/types";

const currencies: HrCurrencyCode[] = ["EUR", "USD", "GBP", "TRY"];
const entities: OurEntity[] = ["USA", "UK", "TR"];

export function HrSettingsPage() {
  const state = useAppStore();
  const [leaveForm, setLeaveForm] = useState({
    id: "",
    country: "",
    annualLeaveDays: "20",
    sickLeaveDays: "10",
    carryOverPolicy: "",
    resetPolicy: "January 1",
  });

  function saveLeaveProfile() {
    if (!leaveForm.country.trim()) return;
    state.upsertHrLeaveProfile({
      id: leaveForm.id || undefined,
      country: leaveForm.country.trim(),
      annualLeaveDays: Number(leaveForm.annualLeaveDays),
      sickLeaveDays: Number(leaveForm.sickLeaveDays),
      carryOverPolicy: leaveForm.carryOverPolicy.trim() || "No carry-over",
      resetPolicy: leaveForm.resetPolicy.trim() || "January 1",
    });
    setLeaveForm({
      id: "",
      country: "",
      annualLeaveDays: "20",
      sickLeaveDays: "10",
      carryOverPolicy: "",
      resetPolicy: "January 1",
    });
  }

  return (
    <div className="space-y-4">
      <Card title="HR Settings">
        <p className="text-xs text-slate-600">FX rates are maintained in Payroll & Compensation. Leave profiles and legal entities are managed here.</p>
      </Card>

      <Card title="Legal Entities">
        <div className="grid gap-2 md:grid-cols-3">
          {entities.map((entityId) => {
            const entity = state.hrLegalEntities.find((row) => row.id === entityId);
            if (!entity) return null;
            return (
              <div key={entity.id} className="rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{entity.id}</p>
                <div className="space-y-2">
                  <div>
                    <FieldLabel>Legal name</FieldLabel>
                    <input
                      value={entity.name}
                      onChange={(event) =>
                        state.upsertHrLegalEntity({
                          ...entity,
                          name: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Country</FieldLabel>
                    <input
                      value={entity.country}
                      onChange={(event) =>
                        state.upsertHrLegalEntity({
                          ...entity,
                          country: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Currency</FieldLabel>
                    <select
                      value={entity.currency}
                      onChange={(event) =>
                        state.upsertHrLegalEntity({
                          ...entity,
                          currency: event.target.value as HrCurrencyCode,
                        })
                      }
                    >
                      {currencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Bank details ref</FieldLabel>
                    <input
                      value={entity.bankDetailsRef}
                      onChange={(event) =>
                        state.upsertHrLegalEntity({
                          ...entity,
                          bankDetailsRef: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Country Leave Profiles">
        <section className="mb-3 rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Add / update profile</p>
          <div className="grid gap-2 md:grid-cols-6">
            <div>
              <FieldLabel>Country</FieldLabel>
              <input value={leaveForm.country} onChange={(event) => setLeaveForm((prev) => ({ ...prev, country: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Annual days</FieldLabel>
              <input
                type="number"
                value={leaveForm.annualLeaveDays}
                onChange={(event) => setLeaveForm((prev) => ({ ...prev, annualLeaveDays: event.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Sick days</FieldLabel>
              <input
                type="number"
                value={leaveForm.sickLeaveDays}
                onChange={(event) => setLeaveForm((prev) => ({ ...prev, sickLeaveDays: event.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Carry-over policy</FieldLabel>
              <input
                value={leaveForm.carryOverPolicy}
                onChange={(event) => setLeaveForm((prev) => ({ ...prev, carryOverPolicy: event.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Reset policy</FieldLabel>
              <input value={leaveForm.resetPolicy} onChange={(event) => setLeaveForm((prev) => ({ ...prev, resetPolicy: event.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={saveLeaveProfile}>
                Save profile
              </Button>
            </div>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Annual</th>
              <th>Sick</th>
              <th>Carry-over</th>
              <th>Reset</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.hrLeaveProfiles
              .slice()
              .sort((a, b) => a.country.localeCompare(b.country))
              .map((profile) => (
                <tr key={profile.id}>
                  <td>{profile.country}</td>
                  <td>{profile.annualLeaveDays}</td>
                  <td>{profile.sickLeaveDays}</td>
                  <td>{profile.carryOverPolicy}</td>
                  <td>{profile.resetPolicy}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setLeaveForm({
                          id: profile.id,
                          country: profile.country,
                          annualLeaveDays: String(profile.annualLeaveDays),
                          sickLeaveDays: String(profile.sickLeaveDays),
                          carryOverPolicy: profile.carryOverPolicy,
                          resetPolicy: profile.resetPolicy,
                        })
                      }
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

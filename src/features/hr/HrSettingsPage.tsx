import { useState, useMemo } from "react";
import { Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { HrCurrencyCode, OurEntity } from "../../store/types";

const currencies: HrCurrencyCode[] = ["EUR", "USD", "GBP", "TRY"];
const entities: OurEntity[] = ["USA", "UK", "TR"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
const HOLIDAY_COUNTRIES = ["Turkey", "United Kingdom", "United States"] as const;

const auditLogEntries = [
  { changedBy: "Sevim Yılmaz", field: "Turkey Annual Leave", oldValue: "14 days", newValue: "20 days", date: "2026-02-20" },
  { changedBy: "Kübra Demir", field: "UK Sick Leave", oldValue: "10 days", newValue: "15 days", date: "2026-02-18" },
  { changedBy: "System", field: "FX Rate USD/EUR", oldValue: "0.91", newValue: "0.94", date: "2026-02-15" },
  { changedBy: "Sevim Yılmaz", field: "TR Public Holiday Added", oldValue: "-", newValue: "Republic Day", date: "2026-02-10" },
];

export function HrSettingsPage() {
  const state = useAppStore();

  const [leaveForm, setLeaveForm] = useState({
    id: "",
    country: "",
    annualLeaveDays: "20",
    sickLeaveDays: "10",
    carryOverPolicy: "",
    resetPolicy: "January 1",
    workingDays: DEFAULT_WORKING_DAYS as number[],
  });

  const [holidayFilter, setHolidayFilter] = useState("All");
  const [holidayForm, setHolidayForm] = useState({ country: "Turkey" as string, date: "", name: "" });

  const filteredHolidays = useMemo(() => {
    const src = state.hrPublicHolidays.slice();
    const filtered = holidayFilter === "All" ? src : src.filter((h) => h.country === holidayFilter);
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  }, [state.hrPublicHolidays, holidayFilter]);

  const editingProfile = leaveForm.id
    ? state.hrLeaveProfiles.find((p) => p.id === leaveForm.id)
    : undefined;

  function saveLeaveProfile() {
    if (!leaveForm.country.trim()) return;
    state.upsertHrLeaveProfile({
      id: leaveForm.id || undefined,
      country: leaveForm.country.trim(),
      annualLeaveDays: Number(leaveForm.annualLeaveDays),
      sickLeaveDays: Number(leaveForm.sickLeaveDays),
      carryOverPolicy: leaveForm.carryOverPolicy.trim() || "No carry-over",
      resetPolicy: leaveForm.resetPolicy.trim() || "January 1",
      workingDays: leaveForm.workingDays,
      seniorityTiers: editingProfile?.seniorityTiers,
    });
    resetLeaveForm();
  }

  function resetLeaveForm() {
    setLeaveForm({
      id: "",
      country: "",
      annualLeaveDays: "20",
      sickLeaveDays: "10",
      carryOverPolicy: "",
      resetPolicy: "January 1",
      workingDays: DEFAULT_WORKING_DAYS,
    });
  }

  function toggleWorkingDay(day: number) {
    setLeaveForm((prev) => {
      const next = prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day].sort();
      return { ...prev, workingDays: next };
    });
  }

  function addHoliday() {
    if (!holidayForm.date || !holidayForm.name.trim()) return;
    state.addPublicHoliday({ country: holidayForm.country, date: holidayForm.date, name: holidayForm.name.trim() });
    setHolidayForm((prev) => ({ ...prev, date: "", name: "" }));
  }

  return (
    <div className="space-y-4">
      <Card title="HR Settings">
        <p className="text-xs text-slate-600">FX rates are maintained in Payroll & Compensation. Leave profiles and legal entities are managed here.</p>
      </Card>

      {/* ── Legal Entities ── */}
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
                        state.upsertHrLegalEntity({ ...entity, name: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Country</FieldLabel>
                    <input
                      value={entity.country}
                      onChange={(event) =>
                        state.upsertHrLegalEntity({ ...entity, country: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Currency</FieldLabel>
                    <select
                      value={entity.currency}
                      onChange={(event) =>
                        state.upsertHrLegalEntity({ ...entity, currency: event.target.value as HrCurrencyCode })
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
                        state.upsertHrLegalEntity({ ...entity, bankDetailsRef: event.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Country Leave Profiles ── */}
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

          {leaveForm.id && (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <FieldLabel>Working days</FieldLabel>
              <div className="mt-1 flex gap-4">
                {DAY_LABELS.map((label, dayIndex) => (
                  <label key={dayIndex} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={leaveForm.workingDays.includes(dayIndex)}
                      onChange={() => toggleWorkingDay(dayIndex)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-amber-600">⚙ Planned: will affect leave calc in next update</p>
            </div>
          )}
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
                          workingDays: profile.workingDays ?? DEFAULT_WORKING_DAYS,
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

        {editingProfile?.seniorityTiers && editingProfile.seniorityTiers.length > 0 && (
          <section className="mt-3 rounded-md border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Seniority Tiers</p>
            <table>
              <thead>
                <tr>
                  <th>Min Years</th>
                  <th>Max Years</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {editingProfile.seniorityTiers.map((tier, idx) => (
                  <tr key={idx}>
                    <td>{tier.minYears}</td>
                    <td>{tier.maxYears ?? "∞"}</td>
                    <td>{tier.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </Card>

      {/* ── Public Holidays ── */}
      <Card title="Public Holidays">
        <div className="mb-3 flex items-end gap-3">
          <div>
            <FieldLabel>Filter by country</FieldLabel>
            <select value={holidayFilter} onChange={(e) => setHolidayFilter(e.target.value)}>
              <option value="All">All</option>
              {HOLIDAY_COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Holiday Name</th>
              <th>Country</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHolidays.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-xs text-slate-400">No holidays found</td>
              </tr>
            ) : (
              filteredHolidays.map((h) => (
                <tr key={h.id}>
                  <td>{h.date}</td>
                  <td>{h.name}</td>
                  <td>{h.country}</td>
                  <td>
                    <Button size="sm" variant="secondary" onClick={() => state.deletePublicHoliday(h.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <section className="mt-3 rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Add Holiday</p>
          <div className="grid gap-2 md:grid-cols-4">
            <div>
              <FieldLabel>Date</FieldLabel>
              <input
                type="date"
                value={holidayForm.date}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                value={holidayForm.name}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Holiday name"
              />
            </div>
            <div>
              <FieldLabel>Country</FieldLabel>
              <select value={holidayForm.country} onChange={(e) => setHolidayForm((prev) => ({ ...prev, country: e.target.value }))}>
                {HOLIDAY_COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={addHoliday}>Add</Button>
            </div>
          </div>
        </section>
      </Card>

      {/* ── Recent Changes (Audit Log) ── */}
      <Card title="Recent Changes">
        <table>
          <thead>
            <tr>
              <th>Changed By</th>
              <th>Field</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {auditLogEntries.map((entry, idx) => (
              <tr key={idx}>
                <td>{entry.changedBy}</td>
                <td>{entry.field}</td>
                <td>{entry.oldValue}</td>
                <td>{entry.newValue}</td>
                <td>{entry.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

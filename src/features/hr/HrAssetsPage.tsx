import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { HrAssetCategory, HrCurrencyCode } from "../../store/types";

const assetCategories: HrAssetCategory[] = ["Laptop", "Phone", "Accessory", "Software"];
const currencyOptions: HrCurrencyCode[] = ["EUR", "USD", "GBP", "TRY"];

function employeeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function HrAssetsPage() {
  const state = useAppStore();
  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState<HrAssetCategory>("Laptop");
  const [assetNotes, setAssetNotes] = useState("");
  const [assignDraftByAssetId, setAssignDraftByAssetId] = useState<Record<string, string>>({});
  const [licenseForm, setLicenseForm] = useState({
    name: "",
    vendor: "",
    licenseType: "Annual Seat",
    assignedToEmployeeId: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    cost: "",
    currency: "EUR" as HrCurrencyCode,
    notes: "",
  });

  const employeeById = useMemo(() => {
    const map = new Map(state.hrEmployees.map((employee) => [employee.id, employee]));
    return map;
  }, [state.hrEmployees]);

  function createAsset() {
    if (!assetName.trim()) return;
    state.createHrAsset({
      name: assetName.trim(),
      category: assetCategory,
      assignedToEmployeeId: undefined,
      assignedAt: undefined,
      returnedAt: undefined,
      digitalAcceptance: false,
      notes: assetNotes.trim() || undefined,
    });
    setAssetName("");
    setAssetNotes("");
    setAssetCategory("Laptop");
  }

  function createLicense() {
    if (!licenseForm.name.trim() || !licenseForm.vendor.trim() || !licenseForm.startDate) return;
    state.createHrSoftwareLicense({
      name: licenseForm.name.trim(),
      vendor: licenseForm.vendor.trim(),
      licenseType: licenseForm.licenseType.trim(),
      assignedToEmployeeId: licenseForm.assignedToEmployeeId || undefined,
      startDate: licenseForm.startDate,
      endDate: licenseForm.endDate || undefined,
      cost: licenseForm.cost ? Number(licenseForm.cost) : undefined,
      currency: licenseForm.cost ? licenseForm.currency : undefined,
      notes: licenseForm.notes.trim() || undefined,
    });
    setLicenseForm({
      name: "",
      vendor: "",
      licenseType: "Annual Seat",
      assignedToEmployeeId: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      cost: "",
      currency: "EUR",
      notes: "",
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Assets & Software">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Total assets</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrAssets.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Assigned</p>
            <p className="text-lg font-semibold text-slate-800">
              {state.hrAssets.filter((asset) => Boolean(asset.assignedToEmployeeId) && !asset.returnedAt).length}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Returned</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrAssets.filter((asset) => Boolean(asset.returnedAt)).length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Software licenses</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrSoftwareLicenses.length}</p>
          </div>
        </div>

        <section className="mb-3 rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Add asset</p>
          <div className="grid gap-2 md:grid-cols-5">
            <div>
              <FieldLabel>Name</FieldLabel>
              <input value={assetName} onChange={(event) => setAssetName(event.target.value)} />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <select value={assetCategory} onChange={(event) => setAssetCategory(event.target.value as HrAssetCategory)}>
                {assetCategories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Notes</FieldLabel>
              <input value={assetNotes} onChange={(event) => setAssetNotes(event.target.value)} placeholder="Optional note" />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={createAsset} disabled={!assetName.trim()}>
                Add asset
              </Button>
            </div>
          </div>
        </section>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Category</th>
                <th>Assignee</th>
                <th>Acceptance</th>
                <th>Assigned at</th>
                <th>Returned at</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.hrAssets
                .slice()
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .map((asset) => {
                  const assignee = asset.assignedToEmployeeId ? employeeById.get(asset.assignedToEmployeeId) : undefined;
                  const assignmentDraft = assignDraftByAssetId[asset.id] ?? "";
                  return (
                    <tr key={asset.id}>
                      <td>
                        <p className="font-semibold text-slate-700">{asset.name}</p>
                        <p className="text-[11px] text-slate-500">{asset.notes || "-"}</p>
                      </td>
                      <td>{asset.category}</td>
                      <td>{assignee ? employeeName(assignee.firstName, assignee.lastName) : "-"}</td>
                      <td>
                        <Badge className={asset.digitalAcceptance ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                          {asset.digitalAcceptance ? "Accepted" : "Pending"}
                        </Badge>
                      </td>
                      <td>{asset.assignedAt ? new Date(asset.assignedAt).toLocaleString() : "-"}</td>
                      <td>{asset.returnedAt ? new Date(asset.returnedAt).toLocaleString() : "-"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {!asset.assignedToEmployeeId || asset.returnedAt ? (
                            <>
                              <select
                                value={assignmentDraft}
                                onChange={(event) =>
                                  setAssignDraftByAssetId((prev) => ({
                                    ...prev,
                                    [asset.id]: event.target.value,
                                  }))
                                }
                              >
                                <option value="">Select employee</option>
                                {state.hrEmployees
                                  .filter((employee) => employee.active)
                                  .map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                      {employeeName(employee.firstName, employee.lastName)}
                                    </option>
                                  ))}
                              </select>
                              <Button size="sm" onClick={() => assignmentDraft && state.assignHrAsset(asset.id, assignmentDraft)}>
                                Assign
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => state.markHrAssetAcceptance(asset.id, !asset.digitalAcceptance)}>
                                {asset.digitalAcceptance ? "Revoke acceptance" : "Accept digitally"}
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => state.returnHrAsset(asset.id)}>
                                Return
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Software Licenses">
        <section className="mb-3 rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Add software license</p>
          <div className="grid gap-2 md:grid-cols-6">
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                value={licenseForm.name}
                onChange={(event) =>
                  setLicenseForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>Vendor</FieldLabel>
              <input
                value={licenseForm.vendor}
                onChange={(event) =>
                  setLicenseForm((prev) => ({
                    ...prev,
                    vendor: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>License type</FieldLabel>
              <input
                value={licenseForm.licenseType}
                onChange={(event) =>
                  setLicenseForm((prev) => ({
                    ...prev,
                    licenseType: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>Assign to</FieldLabel>
              <select
                value={licenseForm.assignedToEmployeeId}
                onChange={(event) =>
                  setLicenseForm((prev) => ({
                    ...prev,
                    assignedToEmployeeId: event.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {state.hrEmployees
                  .filter((employee) => employee.active)
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employeeName(employee.firstName, employee.lastName)}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <FieldLabel>Start date</FieldLabel>
              <input
                type="date"
                value={licenseForm.startDate}
                onChange={(event) =>
                  setLicenseForm((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>End date</FieldLabel>
              <input
                type="date"
                value={licenseForm.endDate}
                onChange={(event) =>
                  setLicenseForm((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>Cost</FieldLabel>
              <input
                type="number"
                value={licenseForm.cost}
                onChange={(event) =>
                  setLicenseForm((prev) => ({
                    ...prev,
                    cost: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <select
                value={licenseForm.currency}
                onChange={(event) =>
                  setLicenseForm((prev) => ({
                    ...prev,
                    currency: event.target.value as HrCurrencyCode,
                  }))
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
              <FieldLabel>Notes</FieldLabel>
              <input
                value={licenseForm.notes}
                onChange={(event) =>
                  setLicenseForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={createLicense} disabled={!licenseForm.name.trim() || !licenseForm.vendor.trim()}>
                Add license
              </Button>
            </div>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Vendor</th>
              <th>Type</th>
              <th>Assigned to</th>
              <th>Period</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {state.hrSoftwareLicenses
              .slice()
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((license) => {
                const assignee = license.assignedToEmployeeId ? employeeById.get(license.assignedToEmployeeId) : undefined;
                return (
                  <tr key={license.id}>
                    <td>{license.name}</td>
                    <td>{license.vendor}</td>
                    <td>{license.licenseType}</td>
                    <td>{assignee ? employeeName(assignee.firstName, assignee.lastName) : "-"}</td>
                    <td>
                      {license.startDate} - {license.endDate ?? "Open"}
                    </td>
                    <td>{license.cost ? `${license.cost} ${license.currency ?? ""}` : "-"}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

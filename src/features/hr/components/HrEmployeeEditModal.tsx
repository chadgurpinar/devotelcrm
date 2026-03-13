import { Dispatch, SetStateAction } from "react";
import { Button, FieldLabel } from "../../../components/ui";
import { HrDepartment, HrEmployee, HrEmploymentType, HrGender, HrMaritalStatus, OurEntity } from "../../../store/types";

export type EmployeeForm = Omit<HrEmployee, "id" | "createdAt" | "updatedAt">;
export type EmployeeFormTab = "Profile" | "Employment" | "PayrollSnapshot" | "Personal" | "Documents";

function employeeName(row: Pick<HrEmployee, "firstName" | "lastName">): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function asInputNumber(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

interface HrEmployeeEditModalProps {
  open: boolean;
  editingEmployeeId: string | null;
  form: EmployeeForm;
  setForm: Dispatch<SetStateAction<EmployeeForm>>;
  formTab: EmployeeFormTab;
  setFormTab: Dispatch<SetStateAction<EmployeeFormTab>>;
  formErrors: string[];
  emailDuplicateError?: string;
  onEmailBlur?: (email: string) => void;
  onClose: () => void;
  onSave: () => void;
  departments: HrDepartment[];
  employeeOptions: HrEmployee[];
  legalEntityOptions: OurEntity[];
  employmentTypes: HrEmploymentType[];
  genderOptions: HrGender[];
  maritalStatusOptions: HrMaritalStatus[];
  projects?: { id: string; name: string }[];
}

export function HrEmployeeEditModal(props: HrEmployeeEditModalProps) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={props.onClose}>
      <div className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{props.editingEmployeeId ? "Edit employee" : "Create employee"}</h3>
          <Button size="sm" variant="secondary" onClick={props.onClose}>
            Close
          </Button>
        </div>
        <p className="mb-2 text-[11px] text-slate-500">
          Required fields: First name, Last name, Email, Department, Employment type, Start date, Legal entity, Active.
        </p>
        <div className="mb-3 flex flex-wrap gap-1">
          {(["Profile", "Employment", "PayrollSnapshot", "Personal", "Documents"] as EmployeeFormTab[]).map((entry) => (
            <Button key={entry} size="sm" variant={props.formTab === entry ? "primary" : "secondary"} onClick={() => props.setFormTab(entry)}>
              {entry === "PayrollSnapshot" ? "Payroll Snapshot" : entry}
            </Button>
          ))}
        </div>

        {props.formErrors.length > 0 && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {props.formErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        {props.formTab === "Profile" && (
          <div className="grid gap-2 md:grid-cols-6">
            <div>
              <FieldLabel>First name *</FieldLabel>
              <input value={props.form.firstName} onChange={(event) => props.setForm((prev) => ({ ...prev, firstName: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Last name *</FieldLabel>
              <input value={props.form.lastName} onChange={(event) => props.setForm((prev) => ({ ...prev, lastName: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Email *</FieldLabel>
              <input
                value={props.form.email}
                onChange={(event) => props.setForm((prev) => ({ ...prev, email: event.target.value }))}
                onBlur={() => props.onEmailBlur?.(props.form.email)}
              />
              {props.emailDuplicateError && <p className="mt-1 text-xs text-rose-600">{props.emailDuplicateError}</p>}
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <input value={props.form.phone} onChange={(event) => props.setForm((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Display name (derived)</FieldLabel>
              <input value={`${props.form.firstName} ${props.form.lastName}`.trim()} disabled />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Address</FieldLabel>
              <input
                value={props.form.address ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, address: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Emergency contact name</FieldLabel>
              <input
                value={props.form.emergencyContactName ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, emergencyContactName: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Emergency contact no</FieldLabel>
              <input
                value={props.form.emergencyContactPhone ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, emergencyContactPhone: event.target.value || undefined }))}
              />
            </div>
          </div>
        )}

        {props.formTab === "Employment" && (
          <div className="grid gap-2 md:grid-cols-6">
            <div>
              <FieldLabel>Active *</FieldLabel>
              <select
                value={props.form.active ? "active" : "inactive"}
                onChange={(event) => props.setForm((prev) => ({ ...prev, active: event.target.value === "active" }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <FieldLabel>Legal entity *</FieldLabel>
              <select
                value={props.form.legalEntityId}
                onChange={(event) => props.setForm((prev) => ({ ...prev, legalEntityId: event.target.value as OurEntity }))}
              >
                {props.legalEntityOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Company</FieldLabel>
              <input
                value={props.form.company ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, company: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Department *</FieldLabel>
              <select value={props.form.departmentId} onChange={(event) => props.setForm((prev) => ({ ...prev, departmentId: event.target.value }))}>
                <option value="">Select department</option>
                {props.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Manager</FieldLabel>
              <select
                value={props.form.managerId ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, managerId: event.target.value || undefined }))}
              >
                <option value="">None</option>
                {props.employeeOptions
                  .filter((entry) => entry.id !== props.editingEmployeeId)
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.displayName || employeeName(entry)}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <FieldLabel>Employment type *</FieldLabel>
              <select
                value={props.form.employmentType}
                onChange={(event) => props.setForm((prev) => ({ ...prev, employmentType: event.target.value as HrEmploymentType }))}
              >
                {props.employmentTypes.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Start date *</FieldLabel>
              <input type="date" value={props.form.startDate} onChange={(event) => props.setForm((prev) => ({ ...prev, startDate: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>End date</FieldLabel>
              <input
                type="date"
                value={props.form.endDate ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, endDate: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Seniority (Y)</FieldLabel>
              <input
                type="number"
                min={0}
                value={asInputNumber(props.form.seniorityYears)}
                onChange={(event) => props.setForm((prev) => ({ ...prev, seniorityYears: parseOptionalNumber(event.target.value) }))}
              />
            </div>
            <div>
              <FieldLabel>Country of employment</FieldLabel>
              <input
                value={props.form.countryOfEmployment}
                onChange={(event) => props.setForm((prev) => ({ ...prev, countryOfEmployment: event.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Work location</FieldLabel>
              <input
                value={props.form.workLocation ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, workLocation: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Division</FieldLabel>
              <input value={props.form.division ?? ""} onChange={(event) => props.setForm((prev) => ({ ...prev, division: event.target.value || undefined }))} />
            </div>
            <div>
              <FieldLabel>Position</FieldLabel>
              <input
                value={props.form.position ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, position: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Job title</FieldLabel>
              <input value={props.form.jobTitle ?? ""} onChange={(event) => props.setForm((prev) => ({ ...prev, jobTitle: event.target.value || undefined }))} />
            </div>
            <div>
              <FieldLabel>Grade / level</FieldLabel>
              <input
                value={props.form.gradeLevel ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, gradeLevel: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Citizenship ID number</FieldLabel>
              <input
                value={props.form.citizenshipIdNumber ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, citizenshipIdNumber: event.target.value || undefined }))}
              />
            </div>
            {props.projects && (
              <div className="md:col-span-2">
                <FieldLabel>Projects</FieldLabel>
                <select
                  multiple
                  value={props.form.projectIds ?? []}
                  onChange={(event) => {
                    const selected = Array.from(event.target.selectedOptions, (o) => o.value);
                    props.setForm((prev) => ({ ...prev, projectIds: selected.length ? selected : undefined }));
                  }}
                  className="h-24"
                >
                  {props.projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {(props.form.projectIds?.length ?? 0) > 5 && (
                  <p className="mt-1 text-xs text-rose-600">⚠ Max recommended: 5 concurrent projects</p>
                )}
              </div>
            )}
          </div>
        )}

        {props.formTab === "PayrollSnapshot" && (
          <div className="grid gap-2 md:grid-cols-6">
            <div>
              <FieldLabel>Salary TRY</FieldLabel>
              <input
                type="number"
                min={0}
                value={asInputNumber(props.form.salaryTry)}
                onChange={(event) => props.setForm((prev) => ({ ...prev, salaryTry: parseOptionalNumber(event.target.value) }))}
              />
            </div>
            <div>
              <FieldLabel>Salary EUR</FieldLabel>
              <input
                type="number"
                min={0}
                value={asInputNumber(props.form.salaryEur)}
                onChange={(event) => props.setForm((prev) => ({ ...prev, salaryEur: parseOptionalNumber(event.target.value) }))}
              />
            </div>
            <div>
              <FieldLabel>Salary GBP</FieldLabel>
              <input
                type="number"
                min={0}
                value={asInputNumber(props.form.salaryGbp)}
                onChange={(event) => props.setForm((prev) => ({ ...prev, salaryGbp: parseOptionalNumber(event.target.value) }))}
              />
            </div>
            <div>
              <FieldLabel>Salary USD</FieldLabel>
              <input
                type="number"
                min={0}
                value={asInputNumber(props.form.salaryUsd)}
                onChange={(event) => props.setForm((prev) => ({ ...prev, salaryUsd: parseOptionalNumber(event.target.value) }))}
              />
            </div>
            <div>
              <FieldLabel>Total salary USD Eq.</FieldLabel>
              <input
                type="number"
                min={0}
                value={asInputNumber(props.form.totalSalaryUsdEq)}
                onChange={(event) => props.setForm((prev) => ({ ...prev, totalSalaryUsdEq: parseOptionalNumber(event.target.value) }))}
              />
            </div>
            <div>
              <FieldLabel>Bank</FieldLabel>
              <input value={props.form.bankName ?? ""} onChange={(event) => props.setForm((prev) => ({ ...prev, bankName: event.target.value || undefined }))} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>IBAN or TRC20</FieldLabel>
              <input
                value={props.form.ibanOrTrc20 ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, ibanOrTrc20: event.target.value || undefined }))}
              />
            </div>
          </div>
        )}

        {props.formTab === "Personal" && (
          <div className="grid gap-2 md:grid-cols-6">
            <div>
              <FieldLabel>Nationality</FieldLabel>
              <input value={props.form.nationality ?? ""} onChange={(event) => props.setForm((prev) => ({ ...prev, nationality: event.target.value || undefined }))} />
            </div>
            <div>
              <FieldLabel>Gender</FieldLabel>
              <select
                value={props.form.gender ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, gender: (event.target.value as HrGender) || undefined }))}
              >
                <option value="">-</option>
                {props.genderOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Birth date</FieldLabel>
              <input
                type="date"
                value={props.form.birthDate ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, birthDate: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Marital status</FieldLabel>
              <select
                value={props.form.maritalStatus ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, maritalStatus: (event.target.value as HrMaritalStatus) || undefined }))}
              >
                <option value="">-</option>
                {props.maritalStatusOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Number of children</FieldLabel>
              <input
                type="number"
                min={0}
                value={asInputNumber(props.form.numberOfChildren)}
                onChange={(event) => props.setForm((prev) => ({ ...prev, numberOfChildren: parseOptionalNumber(event.target.value) }))}
              />
            </div>
            <div>
              <FieldLabel>University</FieldLabel>
              <input value={props.form.university ?? ""} onChange={(event) => props.setForm((prev) => ({ ...prev, university: event.target.value || undefined }))} />
            </div>
            <div>
              <FieldLabel>University dept.</FieldLabel>
              <input
                value={props.form.universityDepartment ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, universityDepartment: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Degree</FieldLabel>
              <input value={props.form.degree ?? ""} onChange={(event) => props.setForm((prev) => ({ ...prev, degree: event.target.value || undefined }))} />
            </div>
          </div>
        )}

        {props.formTab === "Documents" && (
          <div className="grid gap-2 md:grid-cols-6">
            <div className="md:col-span-4">
              <FieldLabel>Employee folder URL</FieldLabel>
              <input
                value={props.form.employeeFolderUrl ?? ""}
                onChange={(event) => props.setForm((prev) => ({ ...prev, employeeFolderUrl: event.target.value || undefined }))}
              />
            </div>
            <div>
              <FieldLabel>Master contract signed</FieldLabel>
              <input
                type="datetime-local"
                value={props.form.masterContractSignedAt ? props.form.masterContractSignedAt.slice(0, 16) : ""}
                onChange={(event) =>
                  props.setForm((prev) => ({
                    ...prev,
                    masterContractSignedAt: event.target.value ? new Date(event.target.value).toISOString() : undefined,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>System user id</FieldLabel>
              <input value={props.form.systemUserId ?? ""} onChange={(event) => props.setForm((prev) => ({ ...prev, systemUserId: event.target.value || undefined }))} />
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={props.onSave} disabled={!!props.emailDuplicateError}>
            Save employee
          </Button>
        </div>
      </div>
    </div>
  );
}


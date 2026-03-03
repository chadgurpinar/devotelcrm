import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { HrCurrencyCode, HrEmployee, HrEmploymentType } from "../../store/types";

const employmentTypes: HrEmploymentType[] = ["Full-time", "Part-time", "Contractor"];
const currencyOptions: HrCurrencyCode[] = ["EUR", "USD", "GBP", "TRY"];

type EmployeeForm = Omit<HrEmployee, "id" | "createdAt" | "updatedAt">;

function employeeName(row: Pick<HrEmployee, "firstName" | "lastName">): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

function emptyEmployeeForm(departmentId = ""): EmployeeForm {
  const now = new Date().toISOString().slice(0, 10);
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    countryOfEmployment: "",
    departmentId,
    title: "",
    managerId: undefined,
    employmentStartDate: now,
    employmentType: "Full-time",
    baseCurrency: "EUR",
    masterContractSignedAt: new Date().toISOString(),
    active: true,
    systemUserId: undefined,
    terminationDate: undefined,
  };
}

export function HrPeoplePage() {
  const state = useAppStore();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState<"" | HrEmploymentType>("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(() => emptyEmployeeForm(state.hrDepartments[0]?.id ?? ""));

  const employeeById = useMemo(() => {
    const map = new Map<string, HrEmployee>();
    state.hrEmployees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [state.hrEmployees]);

  const departmentById = useMemo(() => {
    const map = new Map<string, string>();
    state.hrDepartments.forEach((department) => map.set(department.id, department.name));
    return map;
  }, [state.hrDepartments]);

  const rows = useMemo(() => {
    let dataset = state.hrEmployees.slice();
    if (activeFilter === "active") dataset = dataset.filter((row) => row.active);
    if (activeFilter === "inactive") dataset = dataset.filter((row) => !row.active);
    if (departmentFilter) dataset = dataset.filter((row) => row.departmentId === departmentFilter);
    if (countryFilter) dataset = dataset.filter((row) => row.countryOfEmployment === countryFilter);
    if (employmentFilter) dataset = dataset.filter((row) => row.employmentType === employmentFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      dataset = dataset.filter((row) => {
        const manager = row.managerId ? employeeById.get(row.managerId) : undefined;
        const managerText = manager ? employeeName(manager).toLowerCase() : "";
        return (
          employeeName(row).toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.title.toLowerCase().includes(q) ||
          row.countryOfEmployment.toLowerCase().includes(q) ||
          managerText.includes(q)
        );
      });
    }
    return dataset.sort((left, right) => employeeName(left).localeCompare(employeeName(right)));
  }, [activeFilter, countryFilter, departmentFilter, employeeById, employmentFilter, search, state.hrEmployees]);

  const selectedEmployee = useMemo(
    () => (editingEmployeeId ? state.hrEmployees.find((row) => row.id === editingEmployeeId) ?? null : null),
    [editingEmployeeId, state.hrEmployees],
  );

  const countryOptions = useMemo(
    () => Array.from(new Set(state.hrEmployees.map((row) => row.countryOfEmployment))).sort((a, b) => a.localeCompare(b)),
    [state.hrEmployees],
  );

  function openCreateModal() {
    setEditingEmployeeId(null);
    setForm(emptyEmployeeForm(state.hrDepartments[0]?.id ?? ""));
    setModalOpen(true);
  }

  function openEditModal(employee: HrEmployee) {
    setEditingEmployeeId(employee.id);
    setForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      nationality: employee.nationality,
      countryOfEmployment: employee.countryOfEmployment,
      departmentId: employee.departmentId,
      title: employee.title,
      managerId: employee.managerId,
      employmentStartDate: employee.employmentStartDate,
      employmentType: employee.employmentType,
      baseCurrency: employee.baseCurrency,
      masterContractSignedAt: employee.masterContractSignedAt,
      active: employee.active,
      systemUserId: employee.systemUserId,
      terminationDate: employee.terminationDate,
    });
    setModalOpen(true);
  }

  function saveEmployee() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.departmentId || !form.email.trim()) return;
    if (editingEmployeeId) {
      const existing = state.hrEmployees.find((row) => row.id === editingEmployeeId);
      if (!existing) return;
      state.updateHrEmployee({
        ...existing,
        ...form,
        managerId: form.managerId || undefined,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        title: form.title.trim(),
        phone: form.phone.trim(),
        nationality: form.nationality.trim(),
        countryOfEmployment: form.countryOfEmployment.trim(),
        systemUserId: form.systemUserId || undefined,
        terminationDate: form.terminationDate || undefined,
      });
    } else {
      state.createHrEmployee({
        ...form,
        managerId: form.managerId || undefined,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        title: form.title.trim(),
        phone: form.phone.trim(),
        nationality: form.nationality.trim(),
        countryOfEmployment: form.countryOfEmployment.trim(),
        systemUserId: form.systemUserId || undefined,
        terminationDate: form.terminationDate || undefined,
      });
    }
    setModalOpen(false);
  }

  function toggleEmployeeActive(employee: HrEmployee) {
    state.updateHrEmployee({
      ...employee,
      active: !employee.active,
      terminationDate: employee.active ? new Date().toISOString().slice(0, 10) : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <Card
        title="People"
        actions={
          <Button size="sm" onClick={openCreateModal}>
            Add employee
          </Button>
        }
      >
        <div className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, title, manager..." />
          </div>
          <div>
            <FieldLabel>Department</FieldLabel>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
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
            <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
              <option value="">All</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Employment type</FieldLabel>
            <select value={employmentFilter} onChange={(event) => setEmploymentFilter((event.target.value as HrEmploymentType) || "")}>
              <option value="">All</option>
              {employmentTypes.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as "all" | "active" | "inactive")}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Country</th>
                <th>Employment</th>
                <th>Manager</th>
                <th>Start</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((employee) => {
                const manager = employee.managerId ? employeeById.get(employee.managerId) : undefined;
                return (
                  <tr key={employee.id}>
                    <td>
                      <p className="font-semibold text-slate-700">{employeeName(employee)}</p>
                      <p className="text-[11px] text-slate-500">{employee.email}</p>
                      <p className="text-[11px] text-slate-500">{employee.title}</p>
                    </td>
                    <td>{departmentById.get(employee.departmentId) ?? "-"}</td>
                    <td>{employee.countryOfEmployment}</td>
                    <td>
                      <Badge className="bg-slate-100 text-slate-700">{employee.employmentType}</Badge>
                    </td>
                    <td className="text-xs">{manager ? employeeName(manager) : "-"}</td>
                    <td>{employee.employmentStartDate}</td>
                    <td>
                      <Badge className={employee.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                        {employee.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(employee)}>
                          Open
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => toggleEmployeeActive(employee)}>
                          {employee.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedEmployee && (
        <Card title={`Employee detail · ${employeeName(selectedEmployee)}`}>
          <div className="grid gap-2 md:grid-cols-4">
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Department</p>
              <p className="text-xs font-semibold text-slate-700">{departmentById.get(selectedEmployee.departmentId) ?? "-"}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Manager</p>
              <p className="text-xs font-semibold text-slate-700">
                {selectedEmployee.managerId ? employeeName(employeeById.get(selectedEmployee.managerId) ?? selectedEmployee) : "-"}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Base currency</p>
              <p className="text-xs font-semibold text-slate-700">{selectedEmployee.baseCurrency}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Master contract</p>
              <p className="text-xs font-semibold text-slate-700">{new Date(selectedEmployee.masterContractSignedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </Card>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">{editingEmployeeId ? "Edit employee" : "Create employee"}</h3>
              <Button size="sm" variant="secondary" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-6">
              <div>
                <FieldLabel>First name</FieldLabel>
                <input value={form.firstName} onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Last name</FieldLabel>
                <input value={form.lastName} onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Email</FieldLabel>
                <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Nationality</FieldLabel>
                <input value={form.nationality} onChange={(event) => setForm((prev) => ({ ...prev, nationality: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Country of employment</FieldLabel>
                <input
                  value={form.countryOfEmployment}
                  onChange={(event) => setForm((prev) => ({ ...prev, countryOfEmployment: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel>Department</FieldLabel>
                <select value={form.departmentId} onChange={(event) => setForm((prev) => ({ ...prev, departmentId: event.target.value }))}>
                  <option value="">Select department</option>
                  {state.hrDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Title</FieldLabel>
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div>
                <FieldLabel>Manager</FieldLabel>
                <select
                  value={form.managerId ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, managerId: event.target.value || undefined }))}
                >
                  <option value="">No manager</option>
                  {state.hrEmployees
                    .filter((employee) => employee.id !== editingEmployeeId)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employeeName(employee)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <FieldLabel>Start date</FieldLabel>
                <input
                  type="date"
                  value={form.employmentStartDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, employmentStartDate: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel>Employment type</FieldLabel>
                <select
                  value={form.employmentType}
                  onChange={(event) => setForm((prev) => ({ ...prev, employmentType: event.target.value as HrEmploymentType }))}
                >
                  {employmentTypes.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Base currency</FieldLabel>
                <select
                  value={form.baseCurrency}
                  onChange={(event) => setForm((prev) => ({ ...prev, baseCurrency: event.target.value as HrCurrencyCode }))}
                >
                  {currencyOptions.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Master contract signed</FieldLabel>
                <input
                  type="datetime-local"
                  value={form.masterContractSignedAt.slice(0, 16)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      masterContractSignedAt: event.target.value ? new Date(event.target.value).toISOString() : prev.masterContractSignedAt,
                    }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  value={form.active ? "active" : "inactive"}
                  onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === "active" }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEmployee} disabled={!form.firstName.trim() || !form.lastName.trim() || !form.departmentId}>
                Save employee
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

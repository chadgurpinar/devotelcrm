import { useMemo, useState } from "react";
import { Plus, Download, Search } from "lucide-react";
import { Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { HrEmployee, HrEmploymentType, HrGender, HrMaritalStatus, OurEntity } from "../../store/types";
import { formatDate } from "../../utils/datetime";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { EmployeeTable } from "./components/EmployeeTable";
import { EmployeeForm, EmployeeFormTab, HrEmployeeEditModal } from "./components/HrEmployeeEditModal";
import { HrEmployeeProfileModal } from "./components/HrEmployeeProfileModal";

export { formatDate };

const employmentTypes: HrEmploymentType[] = ["Full-time", "Part-time", "Contractor"];
const genderOptions: HrGender[] = ["Male", "Female", "Other", "PreferNotToSay"];
const maritalStatusOptions: HrMaritalStatus[] = ["Single", "Married", "Other"];
const legalEntityDefaults: OurEntity[] = ["USA", "UK", "TR"];

function employeeName(row: Pick<HrEmployee, "firstName" | "lastName">): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

function optionalString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function emptyEmployeeForm(departmentId: string, legalEntityId: OurEntity): EmployeeForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    firstName: "",
    lastName: "",
    displayName: "",
    active: true,
    employmentType: "Full-time",
    startDate: today,
    endDate: undefined,
    seniorityYears: undefined,
    managerId: undefined,
    departmentId,
    division: undefined,
    position: undefined,
    jobTitle: undefined,
    gradeLevel: undefined,
    workLocation: undefined,
    countryOfEmployment: "United Kingdom",
    legalEntityId,
    company: "Devotel Group",
    citizenshipIdNumber: undefined,
    email: "",
    phone: "",
    address: undefined,
    emergencyContactName: undefined,
    emergencyContactPhone: undefined,
    nationality: undefined,
    gender: undefined,
    birthDate: undefined,
    maritalStatus: undefined,
    numberOfChildren: undefined,
    university: undefined,
    universityDepartment: undefined,
    degree: undefined,
    salaryTry: undefined,
    salaryEur: undefined,
    salaryGbp: undefined,
    salaryUsd: undefined,
    totalSalaryUsdEq: undefined,
    bankName: undefined,
    ibanOrTrc20: undefined,
    employeeFolderUrl: undefined,
    masterContractSignedAt: new Date().toISOString(),
    systemUserId: undefined,
  };
}

function validateEmployeeForm(form: EmployeeForm, editingEmployeeId: string | null): string[] {
  const errors: string[] = [];
  if (!form.firstName.trim()) errors.push("First name is required.");
  if (!form.lastName.trim()) errors.push("Last name is required.");
  if (!form.email.trim()) errors.push("Email is required.");
  if (form.email.trim() && !form.email.includes("@")) errors.push("Email must contain '@'.");
  if (!form.departmentId) errors.push("Department is required.");
  if (!form.employmentType) errors.push("Employment type is required.");
  if (!form.startDate) errors.push("Start date is required.");
  if (!form.legalEntityId) errors.push("Legal entity is required.");
  if (form.endDate && form.startDate && form.endDate < form.startDate) errors.push("End date must be equal or after start date.");
  if (form.numberOfChildren !== undefined && form.numberOfChildren < 0) errors.push("Number of children cannot be negative.");
  if (
    [form.salaryTry, form.salaryEur, form.salaryGbp, form.salaryUsd, form.totalSalaryUsdEq].some(
      (value) => value !== undefined && value < 0,
    )
  ) {
    errors.push("Salary snapshot values cannot be negative.");
  }
  if (editingEmployeeId && form.managerId === editingEmployeeId) errors.push("Employee cannot be selected as their own manager.");
  return errors;
}

export function HrPeoplePageV2() {
  const state = useAppStore();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [legalEntityFilter, setLegalEntityFilter] = useState<"" | OurEntity>("");
  const [countryFilter, setCountryFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState<"" | HrEmploymentType>("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [formTab, setFormTab] = useState<EmployeeFormTab>("Profile");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [deactivateTarget, setDeactivateTarget] = useState<HrEmployee | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [exitNotes, setExitNotes] = useState("");
  const [emailDuplicateError, setEmailDuplicateError] = useState("");

  const legalEntityOptions = useMemo(() => {
    const entities = state.hrLegalEntities.map((entity) => entity.id);
    return entities.length ? entities : legalEntityDefaults;
  }, [state.hrLegalEntities]);
  const defaultDepartmentId = state.hrDepartments[0]?.id ?? "";
  const defaultLegalEntity = legalEntityOptions[0] ?? "UK";
  const [form, setForm] = useState<EmployeeForm>(() => emptyEmployeeForm(defaultDepartmentId, defaultLegalEntity));

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

  const employeeOptions = useMemo(
    () =>
      state.hrEmployees
        .slice()
        .sort((left, right) => (left.displayName || employeeName(left)).localeCompare(right.displayName || employeeName(right))),
    [state.hrEmployees],
  );

  const directReportsCountByManagerId = useMemo(() => {
    const counts = new Map<string, number>();
    state.hrEmployees.forEach((employee) => {
      if (!employee.managerId) return;
      counts.set(employee.managerId, (counts.get(employee.managerId) ?? 0) + 1);
    });
    return counts;
  }, [state.hrEmployees]);

  const managerFilterOptions = useMemo(
    () => employeeOptions.filter((employee) => directReportsCountByManagerId.has(employee.id)),
    [directReportsCountByManagerId, employeeOptions],
  );

  const rows = useMemo(() => {
    let dataset = state.hrEmployees.slice();
    if (activeFilter === "active") dataset = dataset.filter((row) => row.active);
    if (activeFilter === "inactive") dataset = dataset.filter((row) => !row.active);
    if (departmentFilter) dataset = dataset.filter((row) => row.departmentId === departmentFilter);
    if (managerFilter) dataset = dataset.filter((row) => row.managerId === managerFilter);
    if (legalEntityFilter) dataset = dataset.filter((row) => row.legalEntityId === legalEntityFilter);
    if (countryFilter) dataset = dataset.filter((row) => row.countryOfEmployment === countryFilter);
    if (employmentFilter) dataset = dataset.filter((row) => row.employmentType === employmentFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      dataset = dataset.filter((row) => {
        const full = (row.displayName || employeeName(row)).toLowerCase();
        return (
          full.includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.phone.toLowerCase().includes(q) ||
          (row.jobTitle ?? "").toLowerCase().includes(q)
        );
      });
    }
    return dataset.sort((left, right) => (left.displayName || employeeName(left)).localeCompare(right.displayName || employeeName(right)));
  }, [
    activeFilter,
    countryFilter,
    departmentFilter,
    employmentFilter,
    legalEntityFilter,
    managerFilter,
    search,
    state.hrEmployees,
  ]);

  const countryOptions = useMemo(
    () => Array.from(new Set(state.hrEmployees.map((row) => row.countryOfEmployment))).sort((a, b) => a.localeCompare(b)),
    [state.hrEmployees],
  );

  const activeEmployees = useMemo(() => state.hrEmployees.filter((row) => row.active).length, [state.hrEmployees]);
  const inactiveEmployees = state.hrEmployees.length - activeEmployees;

  function checkEmailDuplicate(email: string) {
    if (!email.trim()) { setEmailDuplicateError(""); return; }
    const dup = state.hrEmployees.find(
      (e) => e.email.toLowerCase() === email.toLowerCase() && (!editingEmployeeId || e.id !== editingEmployeeId),
    );
    setEmailDuplicateError(dup ? "⚠ An employee with this email already exists." : "");
  }

  function openCreateModal() {
    setEditingEmployeeId(null);
    setFormTab("Profile");
    setFormErrors([]);
    setEmailDuplicateError("");
    setForm(emptyEmployeeForm(defaultDepartmentId, defaultLegalEntity));
    setModalOpen(true);
  }

  function openEditModal(employee: HrEmployee) {
    setEditingEmployeeId(employee.id);
    setFormTab("Profile");
    setFormErrors([]);
    setEmailDuplicateError("");
    setForm({ ...employee });
    setModalOpen(true);
  }

  function saveEmployee() {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const normalized: EmployeeForm = {
      ...form,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      managerId: form.managerId || undefined,
      division: optionalString(form.division),
      position: optionalString(form.position),
      jobTitle: optionalString(form.jobTitle),
      gradeLevel: optionalString(form.gradeLevel),
      workLocation: optionalString(form.workLocation),
      company: optionalString(form.company),
      citizenshipIdNumber: optionalString(form.citizenshipIdNumber),
      address: optionalString(form.address),
      emergencyContactName: optionalString(form.emergencyContactName),
      emergencyContactPhone: optionalString(form.emergencyContactPhone),
      nationality: optionalString(form.nationality),
      birthDate: form.birthDate || undefined,
      university: optionalString(form.university),
      universityDepartment: optionalString(form.universityDepartment),
      degree: optionalString(form.degree),
      salaryTry: form.salaryTry,
      salaryEur: form.salaryEur,
      salaryGbp: form.salaryGbp,
      salaryUsd: form.salaryUsd,
      totalSalaryUsdEq: form.totalSalaryUsdEq,
      bankName: optionalString(form.bankName),
      ibanOrTrc20: optionalString(form.ibanOrTrc20),
      employeeFolderUrl: optionalString(form.employeeFolderUrl),
      masterContractSignedAt: form.masterContractSignedAt || undefined,
      systemUserId: optionalString(form.systemUserId),
      endDate: form.endDate || undefined,
      numberOfChildren: form.numberOfChildren,
    };
    const errors = validateEmployeeForm(normalized, editingEmployeeId);
    checkEmailDuplicate(normalized.email);
    const emailLower = normalized.email.toLowerCase();
    const duplicate = state.hrEmployees.find(e => e.email.toLowerCase() === emailLower);
    if (duplicate && (!editingEmployeeId || duplicate.id !== editingEmployeeId)) {
      errors.push("⚠ An employee with this email already exists.");
    }
    if (errors.length) {
      setFormErrors(errors);
      return;
    }

    if (editingEmployeeId) {
      const existing = state.hrEmployees.find((row) => row.id === editingEmployeeId);
      if (!existing) return;
      state.updateHrEmployee({
        ...existing,
        ...normalized,
      });
    } else {
      state.createHrEmployee(normalized);
    }
    setModalOpen(false);
  }

  function toggleEmployeeActive(employee: HrEmployee) {
    if (employee.active) {
      setDeactivateTarget(employee);
      setDeactivateReason("");
      setExitNotes("");
    } else {
      state.updateHrEmployee({
        ...employee,
        active: true,
        endDate: undefined,
      });
    }
  }

  function confirmDeactivation() {
    if (!deactivateTarget || !deactivateReason) return;
    state.updateHrEmployee({
      ...deactivateTarget,
      active: false,
      endDate: new Date().toISOString().slice(0, 10),
    });
    setDeactivateTarget(null);
    setDeactivateReason("");
    setExitNotes("");
  }

  function exportCSV() {
    const headers = ["Name","Email","Department","Job Title","Entity","Employment Type","Start Date","Status"];
    const csvRows = [headers.join(",")];
    rows.forEach(emp => {
      csvRows.push([
        emp.displayName || `${emp.firstName} ${emp.lastName}`,
        emp.email,
        departmentById.get(emp.departmentId) ?? "",
        emp.jobTitle ?? "",
        emp.legalEntityId,
        emp.employmentType,
        emp.startDate,
        emp.active ? "Active" : "Inactive",
      ].map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `people-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="space-y-5">
      <UiPageHeader
        title="People"
        subtitle={`${activeEmployees} active · ${state.hrEmployees.length} total`}
        actions={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition">
              <Plus className="h-4 w-4" /> Add Employee
            </button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <UiKpiCard label="Active Employees" value={activeEmployees} className="border-emerald-200 bg-emerald-50/40" />
        <UiKpiCard label="Total" value={state.hrEmployees.length} />
        <UiKpiCard label="Inactive" value={inactiveEmployees} className={inactiveEmployees > 0 ? "border-gray-200" : ""} />
      </div>

      {/* Search bar — prominent */}
      <div className="flex h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, phone, or job title..."
          className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
        />
        {search && <button onClick={() => setSearch("")} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
      </div>

      {/* Department filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDepartmentFilter("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${!departmentFilter ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          All Departments
        </button>
        {state.hrDepartments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setDepartmentFilter(departmentFilter === dept.id ? "" : dept.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${departmentFilter === dept.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {dept.name}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <Card padded={false} className="p-0">
        <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 px-5 py-3">
          <div className="w-36"><FieldLabel>Entity</FieldLabel><select className={selectCls} value={legalEntityFilter} onChange={(e) => setLegalEntityFilter((e.target.value as OurEntity) || "")}><option value="">All</option>{legalEntityOptions.map((e) => <option key={e} value={e}>{e}</option>)}</select></div>
          <div className="w-36"><FieldLabel>Type</FieldLabel><select className={selectCls} value={employmentFilter} onChange={(e) => setEmploymentFilter((e.target.value as HrEmploymentType) || "")}><option value="">All</option>{employmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="w-36"><FieldLabel>Status</FieldLabel><select className={selectCls} value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <div className="w-36"><FieldLabel>Country</FieldLabel><select className={selectCls} value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}><option value="">All</option>{countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <p className="ml-auto text-xs text-gray-400">{rows.length} result{rows.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="overflow-x-auto">
          <EmployeeTable
            rows={rows}
            employeeById={employeeById}
            departmentById={departmentById}
            onProfile={(employeeId) => setProfileEmployeeId(employeeId)}
            onEdit={(employee) => openEditModal(employee)}
            onToggleActive={(employee) => toggleEmployeeActive(employee)}
          />
        </div>
      </Card>

      <HrEmployeeEditModal
        open={isModalOpen}
        editingEmployeeId={editingEmployeeId}
        form={form}
        setForm={setForm}
        formTab={formTab}
        setFormTab={setFormTab}
        formErrors={formErrors}
        emailDuplicateError={emailDuplicateError}
        onEmailBlur={checkEmailDuplicate}
        onClose={() => setModalOpen(false)}
        onSave={saveEmployee}
        departments={state.hrDepartments}
        employeeOptions={employeeOptions}
        legalEntityOptions={legalEntityOptions}
        employmentTypes={employmentTypes}
        genderOptions={genderOptions}
        maritalStatusOptions={maritalStatusOptions}
        projects={state.projects.map((p) => ({ id: p.id, name: p.name }))}
      />

      <HrEmployeeProfileModal
        employeeId={profileEmployeeId}
        onClose={() => setProfileEmployeeId(null)}
        onEdit={(employeeId) => {
          const emp = state.hrEmployees.find((row) => row.id === employeeId);
          if (emp) {
            setProfileEmployeeId(null);
            openEditModal(emp);
          }
        }}
      />

      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Deactivate {deactivateTarget.displayName || employeeName(deactivateTarget)}
            </h2>
            {(() => {
              const activeAssignments = state.hrAssetAssignments.filter((a) => a.employeeId === deactivateTarget.id && !a.returnedAt);
              return activeAssignments.length > 0 ? (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  ⚠ This employee has {activeAssignments.length} active asset assignment{activeAssignments.length > 1 ? "s" : ""}. Please initiate return process from Assets.
                </div>
              ) : null;
            })()}
            <div className="mb-3">
              <FieldLabel>Reason for leaving *</FieldLabel>
              <select value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)}>
                <option value="">Select a reason...</option>
                <option value="Resignation">Resignation</option>
                <option value="Termination">Termination</option>
                <option value="End of Contract">End of Contract</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="mb-4">
              <FieldLabel>Exit interview notes</FieldLabel>
              <textarea
                className="w-full rounded border border-slate-300 p-2 text-sm"
                rows={3}
                value={exitNotes}
                onChange={(e) => setExitNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDeactivateTarget(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={!deactivateReason}
                onClick={confirmDeactivation}
              >
                Confirm Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

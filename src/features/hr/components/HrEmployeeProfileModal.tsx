import { useEffect, useMemo, useState } from "react";
import { Badge, Button } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { HrEmployee } from "../../../store/types";

interface HrEmployeeProfileModalProps {
  employeeId: string | null;
  onClose: () => void;
  onEdit?: (employeeId: string) => void;
}

type ProfileTab = "Overview" | "Employment" | "PayrollSnapshot" | "Personal" | "Documents";

function employeeName(row: Pick<HrEmployee, "firstName" | "lastName">): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

function fallbackWorkLocation(countryOfEmployment: string | undefined): string {
  const normalized = (countryOfEmployment ?? "").trim().toLowerCase();
  if (normalized.includes("turkey") || normalized === "tr") return "Istanbul HQ";
  if (normalized.includes("united kingdom") || normalized === "uk" || normalized === "gb") return "London Office";
  if (normalized.includes("united states") || normalized.includes("usa") || normalized === "us") return "New York Office";
  if (normalized.includes("spain")) return "Barcelona Hub";
  if (normalized.includes("germany")) return "Berlin Office";
  return "Remote";
}

function resolveWorkLocation(workLocation: string | undefined, countryOfEmployment: string | undefined): string {
  const value = workLocation?.trim();
  return value ? value : fallbackWorkLocation(countryOfEmployment);
}

function displayValue(value: string | number | undefined): string {
  if (value === undefined || value === "") return "-";
  return String(value);
}

function displayDateTime(value: string | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function salaryValue(value: number | undefined): string {
  if (value === undefined) return "-";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function DetailCell(props: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{props.label}</p>
      <p className="text-xs font-semibold text-slate-700">{displayValue(props.value)}</p>
    </div>
  );
}

export function HrEmployeeProfileModal(props: HrEmployeeProfileModalProps) {
  const employees = useAppStore((state) => state.hrEmployees);
  const departments = useAppStore((state) => state.hrDepartments);
  const [tab, setTab] = useState<ProfileTab>("Overview");

  useEffect(() => {
    setTab("Overview");
  }, [props.employeeId]);

  const employee = useMemo(
    () => (props.employeeId ? employees.find((row) => row.id === props.employeeId) : undefined),
    [employees, props.employeeId],
  );

  const employeeById = useMemo(() => new Map(employees.map((row) => [row.id, row])), [employees]);
  const departmentById = useMemo(() => new Map(departments.map((row) => [row.id, row.name])), [departments]);

  if (!props.employeeId || !employee) return null;

  const manager = employee.managerId ? employeeById.get(employee.managerId) : undefined;
  const fullName = employee.displayName || employeeName(employee);
  const departmentName = departmentById.get(employee.departmentId) ?? employee.departmentId;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={props.onClose}>
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{fullName}</h3>
            <p className="text-xs text-slate-500">
              {employee.jobTitle ?? employee.position ?? "-"} · {departmentName}
            </p>
            <div className="mt-1">
              <Badge className={employee.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                {employee.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                props.onEdit?.(employee.id);
              }}
            >
              Edit
            </Button>
            <Button size="sm" variant="secondary" onClick={props.onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1">
          {(["Overview", "Employment", "PayrollSnapshot", "Personal", "Documents"] as ProfileTab[]).map((entry) => (
            <Button key={entry} size="sm" variant={tab === entry ? "primary" : "secondary"} onClick={() => setTab(entry)}>
              {entry === "PayrollSnapshot" ? "Payroll Snapshot" : entry}
            </Button>
          ))}
        </div>

        {tab === "Overview" && (
          <div className="grid gap-2 md:grid-cols-2">
            <DetailCell label="Name" value={fullName} />
            <DetailCell label="Title / Job title" value={employee.jobTitle ?? employee.position} />
            <DetailCell label="Department" value={departmentName} />
            <DetailCell label="Manager" value={manager ? manager.displayName || employeeName(manager) : "None"} />
            <DetailCell label="Status" value={employee.active ? "Active" : "Inactive"} />
            <DetailCell label="Employment type" value={employee.employmentType} />
            <DetailCell label="Start date" value={employee.startDate} />
            <DetailCell label="Country of employment" value={employee.countryOfEmployment} />
            <DetailCell label="Work location" value={resolveWorkLocation(employee.workLocation, employee.countryOfEmployment)} />
            <DetailCell label="Email" value={employee.email} />
            <DetailCell label="Phone" value={employee.phone} />
            <DetailCell label="Legal entity" value={employee.legalEntityId} />
          </div>
        )}

        {tab === "Employment" && (
          <div className="grid gap-2 md:grid-cols-2">
            <DetailCell label="Company" value={employee.company} />
            <DetailCell label="Legal entity" value={employee.legalEntityId} />
            <DetailCell label="Department" value={departmentName} />
            <DetailCell label="Division" value={employee.division} />
            <DetailCell label="Position" value={employee.position} />
            <DetailCell label="Job title" value={employee.jobTitle} />
            <DetailCell label="Grade / level" value={employee.gradeLevel} />
            <DetailCell label="Manager" value={manager ? manager.displayName || employeeName(manager) : "None"} />
            <DetailCell label="Employment type" value={employee.employmentType} />
            <DetailCell label="Start date" value={employee.startDate} />
            <DetailCell label="End date" value={employee.endDate} />
            <DetailCell label="Seniority (Y)" value={employee.seniorityYears} />
            <DetailCell label="Work location" value={employee.workLocation} />
            <DetailCell label="Country of employment" value={employee.countryOfEmployment} />
          </div>
        )}

        {tab === "PayrollSnapshot" && (
          <div className="grid gap-2 md:grid-cols-2">
            <DetailCell label="Salary TRY" value={salaryValue(employee.salaryTry)} />
            <DetailCell label="Salary EUR" value={salaryValue(employee.salaryEur)} />
            <DetailCell label="Salary GBP" value={salaryValue(employee.salaryGbp)} />
            <DetailCell label="Salary USD" value={salaryValue(employee.salaryUsd)} />
            <DetailCell label="Total salary USD Eq." value={salaryValue(employee.totalSalaryUsdEq)} />
            <DetailCell label="Bank" value={employee.bankName} />
            <DetailCell label="IBAN / TRC20" value={employee.ibanOrTrc20} />
          </div>
        )}

        {tab === "Personal" && (
          <div className="grid gap-2 md:grid-cols-2">
            <DetailCell label="Nationality" value={employee.nationality} />
            <DetailCell label="Citizenship ID number" value={employee.citizenshipIdNumber} />
            <DetailCell label="Gender" value={employee.gender} />
            <DetailCell label="Birth date" value={employee.birthDate} />
            <DetailCell label="Marital status" value={employee.maritalStatus} />
            <DetailCell label="Number of children" value={employee.numberOfChildren} />
            <DetailCell label="Address" value={employee.address} />
            <DetailCell label="Emergency contact name" value={employee.emergencyContactName} />
            <DetailCell label="Emergency contact no" value={employee.emergencyContactPhone} />
            <DetailCell label="University" value={employee.university} />
            <DetailCell label="University dept." value={employee.universityDepartment} />
            <DetailCell label="Degree" value={employee.degree} />
          </div>
        )}

        {tab === "Documents" && (
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 md:col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Employee folder URL</p>
              {employee.employeeFolderUrl ? (
                <a className="text-xs font-semibold text-brand-700 hover:underline" href={employee.employeeFolderUrl} target="_blank" rel="noreferrer">
                  {employee.employeeFolderUrl}
                </a>
              ) : (
                <p className="text-xs font-semibold text-slate-700">-</p>
              )}
            </div>
            <DetailCell label="Master contract signed at" value={displayDateTime(employee.masterContractSignedAt)} />
            <DetailCell label="System user id" value={employee.systemUserId} />
          </div>
        )}
      </div>
    </div>
  );
}

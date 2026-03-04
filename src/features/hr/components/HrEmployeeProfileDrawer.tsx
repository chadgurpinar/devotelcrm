import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { selectManagerChain } from "../../../store/hrOrgSelectors";

interface HrEmployeeProfileDrawerProps {
  employeeId: string | null;
  onClose: () => void;
  onFocusInOrgChart?: (employeeId: string) => void;
}

type DrawerTab = "Profile" | "Employment" | "PayrollSnapshot" | "Personal" | "Documents";

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
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
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{props.label}</p>
      <p className="text-xs font-semibold text-slate-700">{displayValue(props.value)}</p>
    </div>
  );
}

export function HrEmployeeProfileDrawer(props: HrEmployeeProfileDrawerProps) {
  const hrEmployees = useAppStore((state) => state.hrEmployees);
  const hrDepartments = useAppStore((state) => state.hrDepartments);
  const hrAssets = useAppStore((state) => state.hrAssets);
  const hrSoftwareLicenses = useAppStore((state) => state.hrSoftwareLicenses);
  const hrExpenses = useAppStore((state) => state.hrExpenses);
  const hrLeaveRequests = useAppStore((state) => state.hrLeaveRequests);
  const [tab, setTab] = useState<DrawerTab>("Profile");
  useEffect(() => {
    setTab("Profile");
  }, [props.employeeId]);

  if (!props.employeeId) return null;
  const employee = hrEmployees.find((row) => row.id === props.employeeId);
  if (!employee) return null;

  const employeeById = new Map(hrEmployees.map((row) => [row.id, row]));
  const departmentById = new Map(hrDepartments.map((row) => [row.id, row.name]));
  const directReports = hrEmployees
    .filter((row) => row.managerId === employee.id)
    .sort((left, right) => fullName(left.firstName, left.lastName).localeCompare(fullName(right.firstName, right.lastName)));
  const manager = employee.managerId ? employeeById.get(employee.managerId) : undefined;
  const managerChain = selectManagerChain(
    employee.id,
    { hrEmployees, hrDepartments },
    {
      includeInactive: true,
    },
  );

  const assignedAssets = hrAssets.filter((asset) => asset.assignedToEmployeeId === employee.id && !asset.returnedAt);
  const assignedLicenses = hrSoftwareLicenses.filter((license) => license.assignedToEmployeeId === employee.id);
  const pendingExpenses = hrExpenses.filter(
    (expense) =>
      expense.employeeId === employee.id && (expense.status === "PendingManager" || expense.status === "PendingFinance" || expense.status === "Approved"),
  );
  const pendingLeaves = hrLeaveRequests.filter(
    (leave) => leave.employeeId === employee.id && (leave.status === "PendingManager" || leave.status === "PendingHR"),
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/30" onClick={props.onClose}>
      <div className="ml-auto h-full w-full max-w-3xl overflow-y-auto bg-slate-50 p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <Card
          title={`Employee · ${fullName(employee.firstName, employee.lastName)}`}
          actions={
            <div className="flex items-center gap-2">
              {props.onFocusInOrgChart && (
                <Button size="sm" variant="secondary" onClick={() => props.onFocusInOrgChart?.(employee.id)}>
                  Focus in chart
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={props.onClose}>
                Close
              </Button>
            </div>
          }
        >
          <div className="grid gap-2 md:grid-cols-4">
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Job title</p>
              <p className="text-xs font-semibold text-slate-700">{employee.jobTitle ?? employee.position ?? "-"}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Department</p>
              <p className="text-xs font-semibold text-slate-700">{departmentById.get(employee.departmentId) ?? "Unassigned"}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Manager</p>
              <p className="text-xs font-semibold text-slate-700">
                {manager ? fullName(manager.firstName, manager.lastName) : "No manager"}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Status</p>
              <Badge className={employee.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                {employee.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="mt-4" title="Employee profile details">
          <div className="mb-3 flex flex-wrap gap-1">
            {(["Profile", "Employment", "PayrollSnapshot", "Personal", "Documents"] as DrawerTab[]).map((entry) => (
              <Button key={entry} size="sm" variant={tab === entry ? "primary" : "secondary"} onClick={() => setTab(entry)}>
                {entry === "PayrollSnapshot" ? "Payroll Snapshot" : entry}
              </Button>
            ))}
          </div>

          {tab === "Profile" && (
            <div className="grid gap-2 md:grid-cols-2">
              <DetailCell label="First name" value={employee.firstName} />
              <DetailCell label="Last name" value={employee.lastName} />
              <DetailCell label="Display name" value={employee.displayName} />
              <DetailCell label="Email" value={employee.email} />
              <DetailCell label="Phone" value={employee.phone} />
              <DetailCell label="Address" value={employee.address} />
              <DetailCell label="Emergency contact name" value={employee.emergencyContactName} />
              <DetailCell label="Emergency contact no" value={employee.emergencyContactPhone} />
            </div>
          )}

          {tab === "Employment" && (
            <div className="grid gap-2 md:grid-cols-2">
              <DetailCell label="Department" value={departmentById.get(employee.departmentId) ?? employee.departmentId} />
              <DetailCell label="Manager" value={manager ? fullName(manager.firstName, manager.lastName) : "No manager"} />
              <DetailCell label="Employment type" value={employee.employmentType} />
              <DetailCell label="Start date" value={employee.startDate} />
              <DetailCell label="End date" value={employee.endDate} />
              <DetailCell label="Seniority (years)" value={employee.seniorityYears} />
              <DetailCell label="Position" value={employee.position} />
              <DetailCell label="Job title" value={employee.jobTitle} />
              <DetailCell label="Grade level" value={employee.gradeLevel} />
              <DetailCell label="Division" value={employee.division} />
              <DetailCell label="Work location" value={employee.workLocation} />
              <DetailCell label="Country of employment" value={employee.countryOfEmployment} />
              <DetailCell label="Legal entity" value={employee.legalEntityId} />
              <DetailCell label="Company" value={employee.company} />
            </div>
          )}

          {tab === "PayrollSnapshot" && (
            <div className="grid gap-2 md:grid-cols-3">
              <DetailCell label="Salary TRY" value={salaryValue(employee.salaryTry)} />
              <DetailCell label="Salary EUR" value={salaryValue(employee.salaryEur)} />
              <DetailCell label="Salary GBP" value={salaryValue(employee.salaryGbp)} />
              <DetailCell label="Salary USD" value={salaryValue(employee.salaryUsd)} />
              <DetailCell label="Total salary USD eq." value={salaryValue(employee.totalSalaryUsdEq)} />
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
              <DetailCell label="University" value={employee.university} />
              <DetailCell label="University dept." value={employee.universityDepartment} />
              <DetailCell label="Degree" value={employee.degree} />
            </div>
          )}

          {tab === "Documents" && (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white p-2 md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Employee folder</p>
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
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card title="Reporting context">
            <p className="text-xs text-slate-600">
              Direct reports: <span className="font-semibold text-slate-800">{directReports.length}</span>
            </p>
            <div className="mt-2 space-y-1">
              {directReports.length === 0 ? (
                <p className="text-xs text-slate-500">No direct reports.</p>
              ) : (
                directReports.map((report) => (
                  <button
                    type="button"
                    key={report.id}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => props.onFocusInOrgChart?.(report.id)}
                  >
                    {fullName(report.firstName, report.lastName)} · {report.jobTitle ?? report.position ?? "-"}
                  </button>
                ))
              )}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">Chain to top</p>
            <p className="text-xs text-slate-700">{managerChain.map((entry) => entry.fullName).join(" -> ") || "-"}</p>
          </Card>

          <Card title="HR workload snapshot">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Assets</p>
                <p className="text-lg font-semibold text-slate-800">{assignedAssets.length}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Licenses</p>
                <p className="text-lg font-semibold text-slate-800">{assignedLicenses.length}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending expenses</p>
                <p className="text-lg font-semibold text-slate-800">{pendingExpenses.length}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending leave</p>
                <p className="text-lg font-semibold text-slate-800">{pendingLeaves.length}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className="text-[11px] font-semibold text-brand-700 hover:underline" to="/hr/payroll">
                Payroll
              </Link>
              <Link className="text-[11px] font-semibold text-brand-700 hover:underline" to="/hr/leave">
                Leave
              </Link>
              <Link className="text-[11px] font-semibold text-brand-700 hover:underline" to="/hr/assets">
                Assets
              </Link>
              <Link className="text-[11px] font-semibold text-brand-700 hover:underline" to="/hr/expenses">
                Expenses
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

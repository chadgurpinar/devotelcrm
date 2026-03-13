import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { HrEmployee } from "../../../store/types";
import { formatDate } from "../../../utils/datetime";

interface HrEmployeeProfileModalProps {
  employeeId: string | null;
  onClose: () => void;
  onEdit?: (employeeId: string) => void;
}

type DrawerTab = "Personal" | "Employment" | "Compensation" | "Leave" | "Assets";

const AVATAR_COLORS = [
  "bg-brand-100 text-brand-700",
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(emp: HrEmployee): string {
  return ((emp.firstName[0] ?? "") + (emp.lastName[0] ?? "")).toUpperCase();
}

function eName(row: Pick<HrEmployee, "firstName" | "lastName" | "displayName">): string {
  return row.displayName || `${row.firstName} ${row.lastName}`.trim();
}

function Row({ label, value }: { label: string; value: string | number | undefined }) {
  const display = value === undefined || value === "" || value === null ? "—" : String(value);
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-700 text-right">{display}</span>
    </div>
  );
}

export function EmployeeAvatar({ employee, size = "sm" }: { employee: HrEmployee; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-xs";
  if (employee.profilePhotoBase64) {
    return <img src={employee.profilePhotoBase64} alt="" className={`${dim} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-bold flex-shrink-0 ${avatarColor(employee.id)}`}>
      {initials(employee)}
    </div>
  );
}

export function HrEmployeeProfileModal(props: HrEmployeeProfileModalProps) {
  const state = useAppStore();
  const [tab, setTab] = useState<DrawerTab>("Personal");
  const [changeHistoryOpen, setChangeHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTab("Personal"); setChangeHistoryOpen(false); }, [props.employeeId]);

  const employee = useMemo(
    () => (props.employeeId ? state.hrEmployees.find((r) => r.id === props.employeeId) : undefined),
    [state.hrEmployees, props.employeeId],
  );

  const employeeById = useMemo(() => new Map(state.hrEmployees.map((r) => [r.id, r])), [state.hrEmployees]);
  const departmentById = useMemo(() => new Map(state.hrDepartments.map((r) => [r.id, r.name])), [state.hrDepartments]);
  const projectById = useMemo(() => new Map(state.projects.map((p) => [p.id, p.name])), [state.projects]);

  if (!props.employeeId || !employee) return null;

  const manager = employee.managerId ? employeeById.get(employee.managerId) : undefined;
  const fullName = eName(employee);
  const departmentName = departmentById.get(employee.departmentId) ?? employee.departmentId;

  const changeLogs = state.hrCompChangeLogs
    .filter((c) => c.employeeId === employee.id)
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));

  const currentYear = new Date().getFullYear();
  const leaveRequests = state.hrLeaveRequests.filter((r) => r.employeeId === employee.id);
  const annualUsed = leaveRequests
    .filter((r) => r.leaveType === "Annual" && r.status === "Approved" && new Date(r.startDate).getFullYear() === currentYear)
    .reduce((s, r) => s + r.totalDays, 0);
  const sickUsed = leaveRequests
    .filter((r) => r.leaveType === "Sick" && r.status === "Approved" && new Date(r.startDate).getFullYear() === currentYear)
    .reduce((s, r) => s + r.totalDays, 0);
  const pendingLeave = leaveRequests.filter((r) => r.status === "PendingManager" || r.status === "PendingHR").length;

  const assignments = state.hrAssetAssignments.filter((a) => a.employeeId === employee.id);
  const assetById = new Map(state.hrAssets.map((a) => [a.id, a]));

  const salaryRows: { label: string; value: number }[] = [];
  if (employee.salaryEur) salaryRows.push({ label: "Base Salary (EUR)", value: employee.salaryEur });
  if (employee.salaryGbp) salaryRows.push({ label: "Base Salary (GBP)", value: employee.salaryGbp });
  if (employee.salaryUsd) salaryRows.push({ label: "Base Salary (USD)", value: employee.salaryUsd });
  if (employee.salaryTry) salaryRows.push({ label: "Base Salary (TRY)", value: employee.salaryTry });

  const projectNames = (employee.projectIds ?? []).map((id) => projectById.get(id) ?? id);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !employee) return;
    const empId = employee.id;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        state.updateEmployeePhoto(empId, reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40" onClick={props.onClose}>
      <div
        className="h-full w-[480px] max-w-full overflow-y-auto bg-white shadow-2xl animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <EmployeeAvatar employee={employee} size="lg" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[10px] hover:bg-slate-50"
                title="Change photo"
              >
                📷
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-800 truncate">{fullName}</h2>
              <p className="text-sm text-slate-500">{employee.jobTitle ?? employee.position ?? "—"} · {departmentName}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge className="bg-slate-100 text-slate-700">{employee.legalEntityId}</Badge>
                <Badge className={employee.active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                  {employee.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b border-slate-200 px-5 pt-2 flex gap-1 overflow-x-auto">
          {(["Personal", "Employment", "Compensation", "Leave", "Assets"] as DrawerTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                tab === t ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="p-5">
          {tab === "Personal" && (
            <div>
              <Row label="Birth date" value={formatDate(employee.birthDate)} />
              <Row label="Gender" value={employee.gender} />
              <Row label="Nationality" value={employee.nationality} />
              <Row label="Email" value={employee.email} />
              <Row label="Phone" value={employee.phone} />
              <Row label="Address" value={employee.address} />
              <Row label="Emergency contact" value={employee.emergencyContactName} />
              <Row label="Emergency phone" value={employee.emergencyContactPhone} />
              <Row label="Marital status" value={employee.maritalStatus} />
              <Row label="Children" value={employee.numberOfChildren} />
            </div>
          )}

          {tab === "Employment" && (
            <div>
              <Row label="Start date" value={formatDate(employee.startDate)} />
              <Row label="End date" value={employee.endDate ? formatDate(employee.endDate) : "Present"} />
              <Row label="Employment type" value={employee.employmentType} />
              <Row label="Manager" value={manager ? eName(manager) : "—"} />
              <Row label="Grade / Level" value={employee.gradeLevel} />
              <Row label="Work location" value={employee.workLocation} />
              <Row label="Country" value={employee.countryOfEmployment} />
              <Row label="Company" value={employee.company} />
              <Row label="Division" value={employee.division} />
              <Row label="Seniority (years)" value={employee.seniorityYears} />
              {projectNames.length > 0 ? (
                <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                  <span className="text-xs text-slate-500 w-40 flex-shrink-0">Projects</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {projectNames.map((name, i) => (
                      <Badge key={i} className="bg-slate-100 text-slate-700">{name}</Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <Row label="Projects" value="—" />
              )}
            </div>
          )}

          {tab === "Compensation" && (
            <div>
              {salaryRows.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No salary data recorded</p>
              ) : (
                salaryRows.map((r) => (
                  <Row key={r.label} label={r.label} value={r.value.toLocaleString()} />
                ))
              )}
              {employee.totalSalaryUsdEq ? <Row label="Total (USD eq.)" value={employee.totalSalaryUsdEq.toLocaleString()} /> : null}

              <div className="mt-4">
                <button
                  onClick={() => setChangeHistoryOpen(!changeHistoryOpen)}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  {changeHistoryOpen ? "▾ Hide" : "▸ Show"} Change History ({changeLogs.length})
                </button>
                {changeHistoryOpen && (
                  <div className="mt-2 space-y-1">
                    {changeLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No change records</p>
                    ) : (
                      changeLogs.map((log) => {
                        const changedBy = employeeById.get(log.changedByUserId);
                        return (
                          <div key={log.id} className="rounded border border-slate-100 bg-slate-50 p-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">{formatDate(log.changedAt)}</span>
                              <span className="text-slate-500">{changedBy ? eName(changedBy) : log.changedByUserId}</span>
                            </div>
                            <p className="text-slate-700 mt-0.5">{log.reason}</p>
                            <p className="text-slate-500">
                              {log.previousSalaryEur !== undefined ? `€${log.previousSalaryEur.toLocaleString()}` : "—"}
                              {" → "}
                              {log.newSalaryEur !== undefined ? `€${log.newSalaryEur.toLocaleString()}` : "—"}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "Leave" && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">{annualUsed}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Annual used</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">{sickUsed}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Sick used</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 text-center">
                  <p className={`text-2xl font-bold ${pendingLeave > 0 ? "text-amber-600" : "text-slate-800"}`}>{pendingLeave}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pending</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">Recent requests ({currentYear})</p>
              {leaveRequests.filter((r) => new Date(r.startDate).getFullYear() === currentYear).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No leave requests this year</p>
              ) : (
                <div className="space-y-1">
                  {leaveRequests
                    .filter((r) => new Date(r.startDate).getFullYear() === currentYear)
                    .sort((a, b) => b.startDate.localeCompare(a.startDate))
                    .slice(0, 10)
                    .map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs">
                        <div>
                          <span className="font-medium text-slate-700">{r.leaveType}</span>
                          <span className="text-slate-500 ml-2">{formatDate(r.startDate)} – {formatDate(r.endDate)}</span>
                        </div>
                        <Badge className={r.status === "Approved" ? "bg-emerald-100 text-emerald-700" : r.status === "Rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {tab === "Assets" && (
            <div>
              {assignments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No asset assignments</p>
              ) : (
                <div className="space-y-2">
                  {assignments
                    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
                    .map((a) => {
                      const asset = assetById.get(a.assetId);
                      return (
                        <div key={a.id} className="rounded border border-slate-100 bg-slate-50 p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-700">{asset?.name ?? a.assetId}</span>
                            {a.returnedAt ? (
                              <Badge className="bg-slate-100 text-slate-600">Returned</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                            )}
                          </div>
                          <p className="text-slate-500 mt-0.5">
                            Assigned: {formatDate(a.assignedAt)}
                            {a.returnedAt ? ` · Returned: ${formatDate(a.returnedAt)}` : ""}
                            {a.returnCondition ? ` · Condition: ${a.returnCondition}` : ""}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-200 p-5 flex items-center gap-2">
          {employee.employeeFolderUrl && (
            <a
              href={employee.employeeFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              📁 Open Employee Folder
            </a>
          )}
          <div className="flex-1" />
          {props.onEdit && (
            <Button size="sm" variant="secondary" onClick={() => props.onEdit!(employee.id)}>
              Edit
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={props.onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

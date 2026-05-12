import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { StatusBadge } from "../components/primitives";
import { formatDateTime } from "./utils";
import { Hr2CompAuditAction } from "../../../store/types";

const ACTION_FILTERS: Array<{ id: "all" | Hr2CompAuditAction; label: string }> = [
  { id: "all", label: "All" },
  { id: "PackageCreated", label: "Package created" },
  { id: "PackageSubmitted", label: "Package submitted" },
  { id: "PackageApproved", label: "Package approved" },
  { id: "PackageActivated", label: "Package activated" },
  { id: "PackageTerminated", label: "Package terminated" },
  { id: "ChangeRequestCreated", label: "Change created" },
  { id: "ChangeRequestSubmitted", label: "Change submitted" },
  { id: "ChangeRequestApproved", label: "Change approved" },
  { id: "ChangeRequestRejected", label: "Change rejected" },
  { id: "ChangeRequestWithdrawn", label: "Change withdrawn" },
];

function actionTone(action: Hr2CompAuditAction): "neutral" | "info" | "success" | "warning" | "danger" {
  if (action.includes("Approved") || action.includes("Activated")) return "success";
  if (action.includes("Rejected") || action.includes("Terminated")) return "danger";
  if (action.includes("Submitted")) return "info";
  if (action.includes("Withdrawn")) return "warning";
  return "neutral";
}

export function Hr2CompAuditLogPage() {
  const auditLog = useAppStore((s) => s.hr2CompAuditLog);
  const employees = useAppStore((s) => s.hrEmployees);
  const users = useAppStore((s) => s.users);
  const packages = useAppStore((s) => s.hr2CompensationPackages);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | Hr2CompAuditAction>("all");
  const [employeeFilter, setEmployeeFilter] = useState<"all" | string>("all");

  const sortedEmployees = useMemo(
    () => employees.slice().sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [employees],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return auditLog
      .slice()
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      .filter((entry) => {
        if (actionFilter !== "all" && entry.action !== actionFilter) return false;
        if (employeeFilter !== "all" && entry.employeeId !== employeeFilter) return false;
        if (term) {
          const haystack = `${entry.summary} ${entry.employeeId}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });
  }, [auditLog, search, actionFilter, employeeFilter]);

  return (
    <div className="p-6">
      <Link
        to="/hr2/compensation"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft size={12} /> Back to compensation
      </Link>
      <UiPageHeader
        title="Compensation audit log"
        subtitle="Every package and change-request transition, chronologically. Filterable by action and employee."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Summary text..."
                className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Employee</FieldLabel>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All employees</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ACTION_FILTERS.map((f) => {
            const isActive = actionFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActionFilter(f.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  isActive
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card padded={false}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Timestamp</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Employee</th>
              <th className="px-3 py-2 text-left">Summary</th>
              <th className="px-3 py-2 text-left">By</th>
              <th className="px-3 py-2 text-left">Package</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-xs text-slate-400">
                  No audit entries match the filters.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => {
                const employee = employees.find((e) => e.id === entry.employeeId);
                const user = users.find((u) => u.id === entry.performedBy);
                const pkg = entry.packageId ? packages.find((p) => p.id === entry.packageId) : undefined;
                return (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs text-slate-500">{formatDateTime(entry.performedAt)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge label={entry.action} tone={actionTone(entry.action)} dot />
                    </td>
                    <td className="px-3 py-2">
                      {employee ? (
                        <span className="text-sm text-slate-800">
                          {employee.firstName} {employee.lastName}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">{entry.employeeId}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">{entry.summary}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{user?.name ?? entry.performedBy}</td>
                    <td className="px-3 py-2">
                      {pkg ? (
                        <Link to={`/hr2/compensation/${pkg.id}`} className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                          {pkg.versionLabel}
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

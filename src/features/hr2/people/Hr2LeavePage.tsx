import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarOff, CheckCircle2, Clock, XCircle } from "lucide-react";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { EmptyState, StatusBadge } from "../components/primitives";
import { entityLabel, formatDate } from "../compensation/utils";
import { HrLeaveStatus, HrLeaveType, OurEntity } from "../../../store/types";

const STATUS_OPTIONS: Array<{ id: "all" | HrLeaveStatus; label: string }> = [
  { id: "all", label: "All statuses" },
  { id: "PendingManager", label: "Pending manager" },
  { id: "PendingHR", label: "Pending HR" },
  { id: "Approved", label: "Approved" },
  { id: "Rejected", label: "Rejected" },
];

const TYPE_OPTIONS: Array<{ id: "all" | HrLeaveType; label: string }> = [
  { id: "all", label: "All types" },
  { id: "Annual", label: "Annual" },
  { id: "Sick", label: "Sick" },
  { id: "Marriage", label: "Marriage" },
  { id: "Bereavement", label: "Bereavement" },
  { id: "Paternity", label: "Paternity" },
  { id: "Maternity", label: "Maternity" },
  { id: "Unpaid", label: "Unpaid" },
  { id: "Other", label: "Other" },
];

export function Hr2LeavePage() {
  const navigate = useNavigate();
  const leaveRequests = useAppStore((s) => s.hrLeaveRequests);
  const employees = useAppStore((s) => s.hrEmployees);

  const [statusFilter, setStatusFilter] = useState<"all" | HrLeaveStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | HrLeaveType>("all");
  const [entityFilter, setEntityFilter] = useState<"all" | OurEntity>("all");

  const enriched = useMemo(() => {
    return leaveRequests.map((req) => ({
      req,
      employee: employees.find((e) => e.id === req.employeeId),
    }));
  }, [leaveRequests, employees]);

  const filtered = useMemo(() => {
    return enriched
      .filter((row) => {
        if (statusFilter !== "all" && row.req.status !== statusFilter) return false;
        if (typeFilter !== "all" && row.req.leaveType !== typeFilter) return false;
        if (entityFilter !== "all" && row.employee?.legalEntityId !== entityFilter) return false;
        return true;
      })
      .sort((a, b) => b.req.createdAt.localeCompare(a.req.createdAt));
  }, [enriched, statusFilter, typeFilter, entityFilter]);

  const kpis = useMemo(() => {
    const pending = leaveRequests.filter(
      (r) => r.status === "PendingManager" || r.status === "PendingHR",
    ).length;
    const approved = leaveRequests.filter((r) => r.status === "Approved").length;
    const rejected = leaveRequests.filter((r) => r.status === "Rejected").length;
    return { total: leaveRequests.length, pending, approved, rejected };
  }, [leaveRequests]);

  return (
    <div className="p-6">
      <UiPageHeader
        title="Leave (HR Module 2 view)"
        subtitle="Read-only mirror of leave requests scoped for the operational workflow."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={kpis.total} icon={<CalendarOff size={14} />} tone="neutral" />
        <Stat label="Pending" value={kpis.pending} icon={<Clock size={14} />} tone="info" />
        <Stat label="Approved" value={kpis.approved} icon={<CheckCircle2 size={14} />} tone="success" />
        <Stat label="Rejected" value={kpis.rejected} icon={<XCircle size={14} />} tone="danger" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel>Status</FieldLabel>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | HrLeaveStatus)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Type</FieldLabel>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | HrLeaveType)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Entity</FieldLabel>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as "all" | OurEntity)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All entities</option>
              <option value="UK">UK</option>
              <option value="USA">USA</option>
              <option value="TR">TR</option>
            </select>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarOff size={20} />}
          title="No leave requests match filters"
          description="Reset the filters to see the full HR2 leave view."
        />
      ) : (
        <Card padded={false}>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Employee</th>
                <th className="px-3 py-2 text-left">Entity</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-right">Days</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ req, employee }) => (
                <tr
                  key={req.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  onClick={() => employee && navigate(`/hr2/people/${employee.id}`)}
                >
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-800">{employee?.displayName ?? "—"}</div>
                    <div className="text-[11px] text-slate-400">{employee?.position ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {employee ? entityLabel(employee.legalEntityId) : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{req.leaveType}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {formatDate(req.startDate)} → {formatDate(req.endDate)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{req.totalDays}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      label={req.status}
                      tone={
                        req.status === "Approved"
                          ? "success"
                          : req.status === "Rejected"
                            ? "danger"
                            : "info"
                      }
                      dot
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="mt-6">
        <p className="text-xs text-slate-600">
          This view reads directly from the existing HR module's leave data. To create or approve a leave request, use
          the original HR module pages.
        </p>
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={() => navigate("/hr/leave")}>
            Open HR · Leave (original module)
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "neutral" | "info" | "success" | "danger";
}) {
  const c = {
    neutral: "text-slate-700",
    info: "text-indigo-700",
    success: "text-emerald-700",
    danger: "text-rose-700",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className={`mt-0.5 text-2xl font-bold tabular-nums ${c}`}>{value}</p>
        </div>
        <span className="text-slate-300">{icon}</span>
      </div>
    </div>
  );
}

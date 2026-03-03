import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { HrLeaveType } from "../../store/types";
import { dateRangesOverlap, workingDaysBetween } from "../../store/hrUtils";

const leaveTypes: HrLeaveType[] = ["Annual", "Sick", "Other"];

function employeeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function HrLeavePage() {
  const state = useAppStore();
  const [employeeId, setEmployeeId] = useState(state.hrEmployees.find((employee) => employee.active)?.id ?? "");
  const [leaveType, setLeaveType] = useState<HrLeaveType>("Annual");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<"" | "PendingManager" | "PendingHR" | "Approved" | "Rejected">("");
  const [actionCommentById, setActionCommentById] = useState<Record<string, string>>({});

  const employeeById = useMemo(() => {
    const map = new Map(state.hrEmployees.map((employee) => [employee.id, employee]));
    return map;
  }, [state.hrEmployees]);

  const leaveProfileByCountry = useMemo(() => {
    const map = new Map(state.hrLeaveProfiles.map((profile) => [profile.country, profile]));
    return map;
  }, [state.hrLeaveProfiles]);

  const rows = useMemo(() => {
    let dataset = state.hrLeaveRequests.slice();
    if (statusFilter) dataset = dataset.filter((row) => row.status === statusFilter);
    return dataset.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [state.hrLeaveRequests, statusFilter]);

  const upcomingConflicts = useMemo(() => {
    const activeRows = state.hrLeaveRequests.filter((row) => row.status === "PendingManager" || row.status === "PendingHR" || row.status === "Approved");
    const conflicts: Array<{ firstId: string; secondId: string }> = [];
    for (let i = 0; i < activeRows.length; i += 1) {
      for (let j = i + 1; j < activeRows.length; j += 1) {
        const left = activeRows[i];
        const right = activeRows[j];
        if (left.employeeId === right.employeeId) continue;
        if (dateRangesOverlap(left.startDate, left.endDate, right.startDate, right.endDate)) {
          conflicts.push({ firstId: left.id, secondId: right.id });
        }
      }
    }
    return conflicts;
  }, [state.hrLeaveRequests]);

  function createRequest() {
    if (!employeeId || !startDate || !endDate) return;
    state.createHrLeaveRequest({
      employeeId,
      leaveType,
      startDate,
      endDate,
    });
  }

  function applyAction(requestId: string, action: "MANAGER_APPROVE" | "MANAGER_REJECT" | "HR_APPROVE" | "HR_REJECT") {
    state.applyHrLeaveAction(requestId, action, actionCommentById[requestId] ?? "");
    setActionCommentById((prev) => ({ ...prev, [requestId]: "" }));
  }

  function annualBalance(employeeIdValue: string): { entitlement: number; used: number; remaining: number } {
    const employee = employeeById.get(employeeIdValue);
    if (!employee) return { entitlement: 0, used: 0, remaining: 0 };
    const profile = leaveProfileByCountry.get(employee.countryOfEmployment);
    const entitlement = profile?.annualLeaveDays ?? 0;
    const used = state.hrLeaveRequests
      .filter((row) => row.employeeId === employeeIdValue && row.leaveType === "Annual" && row.status === "Approved")
      .reduce((sum, row) => sum + row.totalDays, 0);
    return {
      entitlement,
      used,
      remaining: entitlement - used,
    };
  }

  return (
    <div className="space-y-4">
      <Card title="Leave Management">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending manager</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrLeaveRequests.filter((row) => row.status === "PendingManager").length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending HR</p>
            <p className="text-lg font-semibold text-slate-800">{state.hrLeaveRequests.filter((row) => row.status === "PendingHR").length}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Approved this month</p>
            <p className="text-lg font-semibold text-slate-800">
              {
                state.hrLeaveRequests.filter(
                  (row) => row.status === "Approved" && row.startDate.slice(0, 7) === new Date().toISOString().slice(0, 7),
                ).length
              }
            </p>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Upcoming conflicts</p>
            <p className="text-lg font-semibold text-slate-800">{upcomingConflicts.length}</p>
          </div>
        </div>

        <section className="mb-3 rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Create leave request</p>
          <div className="grid gap-2 md:grid-cols-6">
            <div className="md:col-span-2">
              <FieldLabel>Employee</FieldLabel>
              <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
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
              <FieldLabel>Leave type</FieldLabel>
              <select value={leaveType} onChange={(event) => setLeaveType(event.target.value as HrLeaveType)}>
                {leaveTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Start</FieldLabel>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div>
              <FieldLabel>End</FieldLabel>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={createRequest} disabled={!employeeId || workingDaysBetween(startDate, endDate) <= 0}>
                Submit
              </Button>
            </div>
          </div>
          {employeeId && (
            <p className="mt-2 text-[11px] text-slate-600">
              Annual balance: {annualBalance(employeeId).remaining} days (entitlement {annualBalance(employeeId).entitlement}, used{" "}
              {annualBalance(employeeId).used})
            </p>
          )}
        </section>

        <div className="mb-2 w-48">
          <FieldLabel>Status filter</FieldLabel>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="">All</option>
            <option value="PendingManager">PendingManager</option>
            <option value="PendingHR">PendingHR</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Period</th>
                <th>Total days</th>
                <th>Status</th>
                <th>Approvals</th>
                <th>Comment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const employee = employeeById.get(row.employeeId);
                const statusClass =
                  row.status === "Approved"
                    ? "bg-emerald-100 text-emerald-700"
                    : row.status === "Rejected"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-blue-100 text-blue-700";
                return (
                  <tr key={row.id}>
                    <td>
                      <p className="font-semibold text-slate-700">
                        {employee ? employeeName(employee.firstName, employee.lastName) : row.employeeId}
                      </p>
                      <p className="text-[11px] text-slate-500">{employee?.countryOfEmployment ?? "-"}</p>
                    </td>
                    <td>{row.leaveType}</td>
                    <td>
                      {row.startDate} - {row.endDate}
                    </td>
                    <td>{row.totalDays}</td>
                    <td>
                      <Badge className={statusClass}>{row.status}</Badge>
                    </td>
                    <td className="text-xs">
                      <p>Manager: {row.managerApprovedAt ? new Date(row.managerApprovedAt).toLocaleString() : "-"}</p>
                      <p>HR: {row.hrApprovedAt ? new Date(row.hrApprovedAt).toLocaleString() : "-"}</p>
                    </td>
                    <td>
                      <input
                        value={actionCommentById[row.id] ?? ""}
                        onChange={(event) => setActionCommentById((prev) => ({ ...prev, [row.id]: event.target.value }))}
                        placeholder="Required for reject"
                      />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {row.status === "PendingManager" && (
                          <>
                            <Button size="sm" onClick={() => applyAction(row.id, "MANAGER_APPROVE")}>
                              Manager approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => applyAction(row.id, "MANAGER_REJECT")}>
                              Manager reject
                            </Button>
                          </>
                        )}
                        {row.status === "PendingHR" && (
                          <>
                            <Button size="sm" onClick={() => applyAction(row.id, "HR_APPROVE")}>
                              HR approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => applyAction(row.id, "HR_REJECT")}>
                              HR reject
                            </Button>
                          </>
                        )}
                        {row.status === "Rejected" && <span className="text-[11px] text-slate-500">{row.rejectionReason ?? "-"}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { dateRangesOverlap, workingDaysBetween } from "../../store/hrUtils";
import { useAppStore } from "../../store/db";
import { HrEmployee, HrLeaveActionType, HrLeaveRequest, HrLeaveStatus, HrLeaveType } from "../../store/types";

const leaveTypes: HrLeaveType[] = ["Annual", "Sick", "Marriage", "Bereavement", "Paternity", "Maternity", "Unpaid", "Other"];
const activeLeaveStatuses: HrLeaveStatus[] = ["PendingManager", "PendingHR", "Approved"];
const managerConflictStatuses: HrLeaveStatus[] = ["PendingManager", "PendingHR", "Approved"];
const hrConflictStatuses: HrLeaveStatus[] = ["PendingHR", "Approved"];

type LeaveRole = "Employee" | "Manager" | "HR";

type DateConflict = {
  date: string;
  offEmployeeIds: string[];
};

type ManagerConflict = DateConflict & {
  threshold: number;
};

type DepartmentConflict = DateConflict & {
  departmentId: string;
  threshold: number;
};

type LeaveActionModalState = {
  requestId: string;
  action: HrLeaveActionType;
} | null;

type AnnualBalance = {
  entitlement: number;
  used: number;
  remaining: number;
};

const oneDayMs = 24 * 60 * 60 * 1000;

function employeeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function displayEmployee(employee: Pick<HrEmployee, "displayName" | "firstName" | "lastName">): string {
  return employee.displayName || employeeName(employee.firstName, employee.lastName);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function shiftIsoDate(isoDate: string, offsetDays: number): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  return toIsoDate(new Date(parsed.getTime() + offsetDays * oneDayMs));
}

function enumerateDays(startIso: string, endIso: string): string[] {
  if (!startIso || !endIso || startIso > endIso) return [];
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const result: string[] = [];
  for (let current = start.getTime(); current <= end.getTime(); current += oneDayMs) {
    result.push(toIsoDate(new Date(current)));
  }
  return result;
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function leaveStatusClass(status: HrLeaveStatus): string {
  if (status === "Approved") return "bg-emerald-100 text-emerald-700";
  if (status === "Rejected") return "bg-rose-100 text-rose-700";
  return "bg-blue-100 text-blue-700";
}

function waitingLabel(status: HrLeaveStatus): string {
  if (status === "PendingManager") return "Manager approval";
  if (status === "PendingHR") return "HR approval";
  if (status === "Approved") return "Completed";
  return "Rejected";
}

function clipsIntoWindow(row: HrLeaveRequest, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) return true;
  if (startDate && endDate) return dateRangesOverlap(row.startDate, row.endDate, startDate, endDate);
  if (startDate) return row.endDate >= startDate;
  return row.startDate <= endDate;
}

function statusPriority(status: HrLeaveStatus): number {
  if (status === "Approved") return 3;
  if (status === "PendingHR") return 2;
  if (status === "PendingManager") return 1;
  return 0;
}

function leaveStatusForDate(rows: HrLeaveRequest[], day: string): HrLeaveStatus | null {
  let best: HrLeaveStatus | null = null;
  let bestScore = -1;
  rows.forEach((row) => {
    if (day < row.startDate || day > row.endDate) return;
    const score = statusPriority(row.status);
    if (score > bestScore) {
      best = row.status;
      bestScore = score;
    }
  });
  return best;
}

function statusCellClass(status: HrLeaveStatus | null): string {
  if (status === "Approved") return "bg-emerald-100 text-emerald-700";
  if (status === "PendingHR" || status === "PendingManager") return "bg-blue-100 text-blue-700";
  if (status === "Rejected") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-400";
}

function isRejectAction(action: HrLeaveActionType): boolean {
  return action === "MANAGER_REJECT" || action === "HR_REJECT";
}

function actionLabel(action: HrLeaveActionType): string {
  if (action === "MANAGER_APPROVE") return "Manager approve";
  if (action === "MANAGER_REJECT") return "Manager reject";
  if (action === "HR_APPROVE") return "HR approve";
  return "HR reject";
}

type LeaveActionModalProps = {
  request: HrLeaveRequest | null;
  action: HrLeaveActionType | null;
  employeeLabel?: string;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  errorMessage: string;
};

function LeaveActionModal(props: LeaveActionModalProps) {
  const [comment, setComment] = useState("");
  const rejectAction = props.action ? isRejectAction(props.action) : false;

  useEffect(() => {
    setComment("");
  }, [props.request?.id, props.action]);

  if (!props.request || !props.action) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={props.onClose}>
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{actionLabel(props.action)}</h3>
          <Button size="sm" variant="secondary" onClick={props.onClose}>
            Close
          </Button>
        </div>
        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">{props.employeeLabel ?? props.request.employeeId}</p>
          <p>
            {props.request.leaveType} · {props.request.startDate} - {props.request.endDate} ({props.request.totalDays} business days)
          </p>
        </div>
        <div>
          <FieldLabel>{rejectAction ? "Comment (required)" : "Comment (optional)"}</FieldLabel>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="min-h-[90px] w-full rounded-md border border-slate-300 p-2 text-xs"
            placeholder={rejectAction ? "Reason is required for reject actions." : "Add context for the decision."}
          />
          {props.errorMessage ? <p className="mt-1 text-xs text-rose-600">{props.errorMessage}</p> : null}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => props.onConfirm(comment)} disabled={rejectAction && !comment.trim()}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

type LeaveRequestModalProps = {
  employee: HrEmployee;
  existingRows: HrLeaveRequest[];
  annualBalance: AnnualBalance;
  onClose: () => void;
  onSubmit: (payload: {
    leaveType: HrLeaveType;
    startDate: string;
    endDate: string;
    employeeComment?: string;
    halfDay?: boolean;
    doctorNoteFileName?: string;
  }) => void;
};

function LeaveRequestModal(props: LeaveRequestModalProps) {
  const today = toIsoDate(new Date());
  const tomorrow = shiftIsoDate(today, 1);
  const [leaveType, setLeaveType] = useState<HrLeaveType>("Annual");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(tomorrow);
  const [employeeComment, setEmployeeComment] = useState("");
  const [halfDay, setHalfDay] = useState(false);
  const [doctorNoteFileName, setDoctorNoteFileName] = useState<string | undefined>(undefined);

  const msPerDay = 86400000;
  const rawDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerDay) + 1;
  const totalDays = halfDay ? 0.5 : rawDays;
  const overlapExists = props.existingRows.some(
    (row) =>
      activeLeaveStatuses.includes(row.status) &&
      dateRangesOverlap(row.startDate, row.endDate, startDate, endDate),
  );
  const insufficientBalance = leaveType === "Annual" && totalDays > props.annualBalance.remaining;
  const submitDisabled = !startDate || !endDate || totalDays <= 0 || overlapExists || insufficientBalance;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={props.onClose}>
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Create leave request</h3>
            <p className="text-xs text-slate-500">{displayEmployee(props.employee)}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={props.onClose}>
            Close
          </Button>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-3">
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
            <FieldLabel>Start date</FieldLabel>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div>
            <FieldLabel>End date</FieldLabel>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>

        {leaveType === "Annual" && (
          <div className="mb-3">
            <FieldLabel>Duration</FieldLabel>
            <div className="flex gap-2">
              <Button size="sm" variant={!halfDay ? "primary" : "secondary"} onClick={() => setHalfDay(false)}>
                Full day
              </Button>
              <Button size="sm" variant={halfDay ? "primary" : "secondary"} onClick={() => setHalfDay(true)}>
                Half day
              </Button>
            </div>
          </div>
        )}

        {leaveType === "Sick" && (
          <div className="mb-3">
            <FieldLabel>Upload Doctor's Note (optional)</FieldLabel>
            <input
              type="file"
              className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setDoctorNoteFileName(file ? file.name : undefined);
              }}
            />
            {doctorNoteFileName && <p className="mt-1 text-xs text-slate-500">Selected: {doctorNoteFileName}</p>}
          </div>
        )}

        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
          <p className="font-semibold text-slate-700">Business day preview: {totalDays > 0 ? totalDays : 0} day(s)</p>
          <p className="text-slate-600">
            Annual balance: {props.annualBalance.remaining} days (entitlement {props.annualBalance.entitlement}, used {props.annualBalance.used})
          </p>
          {overlapExists ? <p className="mt-1 text-rose-600">This date range overlaps with another active leave request.</p> : null}
          {insufficientBalance ? <p className="mt-1 text-rose-600">Annual balance is not sufficient for selected dates.</p> : null}
          {!overlapExists && totalDays <= 0 ? <p className="mt-1 text-rose-600">Date range must include at least one business day.</p> : null}
        </div>

        <div>
          <FieldLabel>Employee comment (optional)</FieldLabel>
          <textarea
            value={employeeComment}
            onChange={(event) => setEmployeeComment(event.target.value)}
            className="min-h-[96px] w-full rounded-md border border-slate-300 p-2 text-xs"
            placeholder="Context for manager/HR review."
          />
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              props.onSubmit({
                leaveType,
                startDate,
                endDate,
                employeeComment: employeeComment.trim() ? employeeComment.trim() : undefined,
                halfDay: leaveType === "Annual" && halfDay ? true : undefined,
                doctorNoteFileName: leaveType === "Sick" && doctorNoteFileName ? doctorNoteFileName : undefined,
              })
            }
            disabled={submitDisabled}
          >
            Submit request
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState(props: { title: string; hint: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-semibold text-slate-700">{props.title}</p>
      <p className="mt-1 text-xs text-slate-500">{props.hint}</p>
    </div>
  );
}

export function HrLeavePage() {
  const state = useAppStore();
  const today = toIsoDate(new Date());
  const calendarWindowEnd = shiftIsoDate(today, 29);

  const [viewAs, setViewAs] = useState<LeaveRole>("Employee");
  const [employeeActorId, setEmployeeActorId] = useState(state.hrEmployees.find((employee) => employee.active)?.id ?? "");
  const [managerActorId, setManagerActorId] = useState("");
  const [hrActorId, setHrActorId] = useState(state.hrEmployees.find((employee) => employee.active)?.id ?? "");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<LeaveActionModalState>(null);
  const [actionError, setActionError] = useState("");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<"" | HrLeaveStatus>("");
  const [employeeNameSearch, setEmployeeNameSearch] = useState("");
  const [employeeLeaveTypeFilter, setEmployeeLeaveTypeFilter] = useState<"" | HrLeaveType>("");
  const [managerMemberFilter, setManagerMemberFilter] = useState("");
  const [managerDateFrom, setManagerDateFrom] = useState("");
  const [managerDateTo, setManagerDateTo] = useState("");
  const [hrFilters, setHrFilters] = useState<{
    employeeId: string;
    departmentId: string;
    managerId: string;
    country: string;
    leaveType: "" | HrLeaveType;
    status: "" | HrLeaveStatus;
    dateFrom: string;
    dateTo: string;
  }>({
    employeeId: "",
    departmentId: "",
    managerId: "",
    country: "",
    leaveType: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });
  const [inspectorFrom, setInspectorFrom] = useState(today);
  const [inspectorTo, setInspectorTo] = useState(calendarWindowEnd);

  const employeeById = useMemo(() => new Map(state.hrEmployees.map((employee) => [employee.id, employee])), [state.hrEmployees]);
  const departmentById = useMemo(() => new Map(state.hrDepartments.map((department) => [department.id, department.name])), [state.hrDepartments]);
  const leaveProfileByCountry = useMemo(
    () => new Map(state.hrLeaveProfiles.map((profile) => [profile.country, profile])),
    [state.hrLeaveProfiles],
  );

  const activeEmployees = useMemo(() => state.hrEmployees.filter((employee) => employee.active), [state.hrEmployees]);
  const directReportsByManagerId = useMemo(() => {
    const map = new Map<string, HrEmployee[]>();
    state.hrEmployees.forEach((employee) => {
      if (!employee.managerId || !employee.active) return;
      const list = map.get(employee.managerId) ?? [];
      list.push(employee);
      map.set(employee.managerId, list);
    });
    map.forEach((list) => {
      list.sort((left, right) => displayEmployee(left).localeCompare(displayEmployee(right)));
    });
    return map;
  }, [state.hrEmployees]);

  const managerActors = useMemo(() => {
    const result = Array.from(directReportsByManagerId.keys())
      .map((id) => employeeById.get(id))
      .filter((employee): employee is HrEmployee => Boolean(employee))
      .sort((left, right) => displayEmployee(left).localeCompare(displayEmployee(right)));
    return result;
  }, [directReportsByManagerId, employeeById]);

  useEffect(() => {
    if (!employeeActorId || !employeeById.has(employeeActorId)) {
      setEmployeeActorId(activeEmployees[0]?.id ?? "");
    }
  }, [activeEmployees, employeeActorId, employeeById]);

  useEffect(() => {
    if (!managerActorId || !managerActors.some((employee) => employee.id === managerActorId)) {
      setManagerActorId(managerActors[0]?.id ?? "");
    }
  }, [managerActorId, managerActors]);

  useEffect(() => {
    if (!hrActorId || !employeeById.has(hrActorId)) {
      setHrActorId(activeEmployees[0]?.id ?? "");
    }
  }, [activeEmployees, employeeById, hrActorId]);

  const annualBalance = (employeeId: string): AnnualBalance => {
    const employee = employeeById.get(employeeId);
    if (!employee) return { entitlement: 0, used: 0, remaining: 0 };
    const entitlement = leaveProfileByCountry.get(employee.countryOfEmployment)?.annualLeaveDays ?? 0;
    const currentYear = new Date().getFullYear();
    const used = state.hrLeaveRequests
      .filter(
        (row) =>
          row.employeeId === employeeId &&
          row.leaveType === "Annual" &&
          row.status === "Approved" &&
          new Date(`${row.startDate}T00:00:00`).getFullYear() === currentYear,
      )
      .reduce((sum, row) => sum + row.totalDays, 0);
    return { entitlement, used, remaining: entitlement - used };
  };

  const employeeActor = employeeActorId ? employeeById.get(employeeActorId) : undefined;
  const managerActor = managerActorId ? employeeById.get(managerActorId) : undefined;
  const managerTeam = useMemo(() => directReportsByManagerId.get(managerActorId) ?? [], [directReportsByManagerId, managerActorId]);
  const managerTeamIds = useMemo(() => new Set(managerTeam.map((employee) => employee.id)), [managerTeam]);

  const employeeRows = useMemo(() => {
    let rows = state.hrLeaveRequests.filter((row) => row.employeeId === employeeActorId);
    if (employeeStatusFilter) rows = rows.filter((row) => row.status === employeeStatusFilter);
    if (employeeLeaveTypeFilter) rows = rows.filter((row) => row.leaveType === employeeLeaveTypeFilter);
    if (employeeNameSearch.trim()) {
      const term = employeeNameSearch.trim().toLowerCase();
      rows = rows.filter((row) => {
        const emp = employeeById.get(row.employeeId);
        return emp ? displayEmployee(emp).toLowerCase().includes(term) : false;
      });
    }
    return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [employeeActorId, employeeStatusFilter, employeeLeaveTypeFilter, employeeNameSearch, employeeById, state.hrLeaveRequests]);

  const employeePendingCount = useMemo(
    () => employeeRows.filter((row) => row.status === "PendingManager" || row.status === "PendingHR").length,
    [employeeRows],
  );

  const employeeCalendarDays = useMemo(() => enumerateDays(today, calendarWindowEnd), [calendarWindowEnd, today]);

  const managerQueueRows = useMemo(() => {
    let rows = state.hrLeaveRequests.filter((row) => row.status === "PendingManager" && managerTeamIds.has(row.employeeId));
    if (managerMemberFilter) rows = rows.filter((row) => row.employeeId === managerMemberFilter);
    if (managerDateFrom || managerDateTo) rows = rows.filter((row) => clipsIntoWindow(row, managerDateFrom, managerDateTo));
    return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [managerDateFrom, managerDateTo, managerMemberFilter, managerTeamIds, state.hrLeaveRequests]);

  const managerTeamRows = useMemo(
    () => state.hrLeaveRequests.filter((row) => managerTeamIds.has(row.employeeId)),
    [managerTeamIds, state.hrLeaveRequests],
  );

  const managerOffToday = useMemo(() => {
    const offEmployees = new Set(
      managerTeamRows
        .filter((row) => row.status === "Approved" && row.startDate <= today && row.endDate >= today)
        .map((row) => row.employeeId),
    );
    return offEmployees.size;
  }, [managerTeamRows, today]);

  const managerUpcomingBlocks = useMemo(
    () =>
      managerTeamRows.filter(
        (row) =>
          (row.status === "Approved" || row.status === "PendingHR") &&
          dateRangesOverlap(row.startDate, row.endDate, today, calendarWindowEnd),
      ).length,
    [calendarWindowEnd, managerTeamRows, today],
  );

  const managerConflicts = useMemo<ManagerConflict[]>(() => {
    if (!managerTeam.length) return [];
    const threshold = Math.max(1, Math.ceil(managerTeam.length * 0.33));
    return employeeCalendarDays
      .map((date) => {
        const offEmployeeIds = Array.from(
          new Set(
            managerTeamRows
              .filter((row) => managerConflictStatuses.includes(row.status) && row.startDate <= date && row.endDate >= date)
              .map((row) => row.employeeId),
          ),
        );
        return { date, offEmployeeIds, threshold };
      })
      .filter((entry) => entry.offEmployeeIds.length > entry.threshold);
  }, [employeeCalendarDays, managerTeam, managerTeamRows]);

  const hrQueueRows = useMemo(
    () => state.hrLeaveRequests.filter((row) => row.status === "PendingHR").sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [state.hrLeaveRequests],
  );

  const hrFilteredRows = useMemo(() => {
    let rows = state.hrLeaveRequests.slice();
    if (hrFilters.employeeId) rows = rows.filter((row) => row.employeeId === hrFilters.employeeId);
    if (hrFilters.departmentId) {
      rows = rows.filter((row) => employeeById.get(row.employeeId)?.departmentId === hrFilters.departmentId);
    }
    if (hrFilters.managerId) {
      rows = rows.filter((row) => employeeById.get(row.employeeId)?.managerId === hrFilters.managerId);
    }
    if (hrFilters.country) {
      rows = rows.filter((row) => employeeById.get(row.employeeId)?.countryOfEmployment === hrFilters.country);
    }
    if (hrFilters.leaveType) {
      rows = rows.filter((row) => row.leaveType === hrFilters.leaveType);
    }
    if (hrFilters.status) {
      rows = rows.filter((row) => row.status === hrFilters.status);
    }
    if (hrFilters.dateFrom || hrFilters.dateTo) {
      rows = rows.filter((row) => clipsIntoWindow(row, hrFilters.dateFrom, hrFilters.dateTo));
    }
    return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [employeeById, hrFilters, state.hrLeaveRequests]);

  const hrApprovedThisMonth = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return state.hrLeaveRequests.filter((row) => row.status === "Approved" && (row.hrApprovedAt ?? row.updatedAt).slice(0, 7) === month).length;
  }, [state.hrLeaveRequests]);

  const departmentHeadcount = useMemo(() => {
    const map = new Map<string, number>();
    activeEmployees.forEach((employee) => {
      map.set(employee.departmentId, (map.get(employee.departmentId) ?? 0) + 1);
    });
    return map;
  }, [activeEmployees]);

  const hrUpcomingConflicts = useMemo<DepartmentConflict[]>(() => {
    const days = enumerateDays(today, calendarWindowEnd);
    const result: DepartmentConflict[] = [];
    const trackedRows = state.hrLeaveRequests.filter((row) => hrConflictStatuses.includes(row.status));
    const rowsByDepartment = new Map<string, HrLeaveRequest[]>();
    trackedRows.forEach((row) => {
      const employee = employeeById.get(row.employeeId);
      if (!employee?.departmentId) return;
      const rows = rowsByDepartment.get(employee.departmentId) ?? [];
      rows.push(row);
      rowsByDepartment.set(employee.departmentId, rows);
    });
    rowsByDepartment.forEach((rows, departmentId) => {
      const threshold = Math.max(2, Math.ceil((departmentHeadcount.get(departmentId) ?? 0) * 0.25));
      days.forEach((date) => {
        const offEmployeeIds = Array.from(
          new Set(rows.filter((row) => row.startDate <= date && row.endDate >= date).map((row) => row.employeeId)),
        );
        if (offEmployeeIds.length > threshold) {
          result.push({ date, departmentId, offEmployeeIds, threshold });
        }
      });
    });
    return result;
  }, [calendarWindowEnd, departmentHeadcount, employeeById, state.hrLeaveRequests, today]);

  const inspectorConflicts = useMemo<DepartmentConflict[]>(() => {
    if (!inspectorFrom || !inspectorTo || inspectorFrom > inspectorTo) return [];
    const days = enumerateDays(inspectorFrom, inspectorTo);
    const trackedRows = state.hrLeaveRequests.filter((row) => hrConflictStatuses.includes(row.status));
    const rowsByDepartment = new Map<string, HrLeaveRequest[]>();
    trackedRows.forEach((row) => {
      const employee = employeeById.get(row.employeeId);
      if (!employee?.departmentId) return;
      const list = rowsByDepartment.get(employee.departmentId) ?? [];
      list.push(row);
      rowsByDepartment.set(employee.departmentId, list);
    });
    const result: DepartmentConflict[] = [];
    rowsByDepartment.forEach((rows, departmentId) => {
      const threshold = Math.max(2, Math.ceil((departmentHeadcount.get(departmentId) ?? 0) * 0.25));
      days.forEach((date) => {
        const offEmployeeIds = Array.from(
          new Set(rows.filter((row) => row.startDate <= date && row.endDate >= date).map((row) => row.employeeId)),
        );
        if (offEmployeeIds.length > threshold) {
          result.push({
            departmentId,
            date,
            threshold,
            offEmployeeIds,
          });
        }
      });
    });
    return result.sort((left, right) =>
      left.departmentId === right.departmentId ? left.date.localeCompare(right.date) : left.departmentId.localeCompare(right.departmentId),
    );
  }, [departmentHeadcount, employeeById, inspectorFrom, inspectorTo, state.hrLeaveRequests]);

  const actionRequest = actionModal ? state.hrLeaveRequests.find((row) => row.id === actionModal.requestId) ?? null : null;
  const actionEmployee = actionRequest ? employeeById.get(actionRequest.employeeId) : undefined;
  const actionEmployeeLabel = actionRequest ? (actionEmployee ? displayEmployee(actionEmployee) : actionRequest.employeeId) : undefined;

  const managerCalendarStatuses = useMemo(() => {
    const rowsByEmployee = new Map<string, HrLeaveRequest[]>();
    managerTeamRows.forEach((row) => {
      const list = rowsByEmployee.get(row.employeeId) ?? [];
      list.push(row);
      rowsByEmployee.set(row.employeeId, list);
    });
    return rowsByEmployee;
  }, [managerTeamRows]);

  const countries = useMemo(
    () => Array.from(new Set(state.hrEmployees.map((employee) => employee.countryOfEmployment))).sort((a, b) => a.localeCompare(b)),
    [state.hrEmployees],
  );

  const departments = useMemo(
    () =>
      state.hrDepartments
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((department) => ({ id: department.id, name: department.name })),
    [state.hrDepartments],
  );

  const submitLeaveRequest = (payload: {
    leaveType: HrLeaveType;
    startDate: string;
    endDate: string;
    employeeComment?: string;
    halfDay?: boolean;
    doctorNoteFileName?: string;
  }) => {
    if (!employeeActor) return;
    state.createHrLeaveRequest({
      employeeId: employeeActor.id,
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      employeeComment: payload.employeeComment,
      halfDay: payload.halfDay,
      doctorNoteFileName: payload.doctorNoteFileName,
    });
    setRequestModalOpen(false);
  };

  const applyAction = (comment: string) => {
    if (!actionModal) return;
    const result = state.applyHrLeaveAction(actionModal.requestId, actionModal.action, comment.trim() || undefined);
    if (!result.ok) {
      setActionError(result.message ?? "Action failed.");
      return;
    }
    setActionError("");
    setActionModal(null);
  };

  return (
    <div className="space-y-4">
      <Card title="Leave Management">
        <div className="mb-3 space-y-2">
          <div>
            <FieldLabel>View</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {(["Employee", "Manager", "HR"] as const).map((role) => (
                <Button key={role} size="sm" variant={viewAs === role ? "primary" : "secondary"} onClick={() => setViewAs(role)}>
                  {role}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2 lg:grid-cols-3">
            {viewAs === "Employee" && (
              <div>
                <FieldLabel>Actor employee</FieldLabel>
                <select value={employeeActorId} onChange={(event) => setEmployeeActorId(event.target.value)}>
                  {activeEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {displayEmployee(employee)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {viewAs === "Manager" && (
              <div>
                <FieldLabel>Actor manager</FieldLabel>
                <select value={managerActorId} onChange={(event) => setManagerActorId(event.target.value)}>
                  {managerActors.length === 0 ? <option value="">No managers</option> : null}
                  {managerActors.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {displayEmployee(manager)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {viewAs === "HR" && (
              <div>
                <FieldLabel>Actor (demo)</FieldLabel>
                <select value={hrActorId} onChange={(event) => setHrActorId(event.target.value)}>
                  {activeEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {displayEmployee(employee)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {viewAs === "Employee" && (
          <>
            <div className="mb-3 grid gap-2 md:grid-cols-4">
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Annual entitlement</p>
                <p className="text-lg font-semibold text-slate-800">{employeeActor ? annualBalance(employeeActor.id).entitlement : 0}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Used (approved annual)</p>
                <p className="text-lg font-semibold text-slate-800">{employeeActor ? annualBalance(employeeActor.id).used : 0}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Remaining</p>
                <p className="text-lg font-semibold text-slate-800">{employeeActor ? annualBalance(employeeActor.id).remaining : 0}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending requests</p>
                <p className="text-lg font-semibold text-slate-800">{employeePendingCount}</p>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-end gap-2">
              <div className="w-48">
                <FieldLabel>Employee name</FieldLabel>
                <input
                  type="text"
                  value={employeeNameSearch}
                  onChange={(event) => setEmployeeNameSearch(event.target.value)}
                  placeholder="Search by name…"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>
              <div className="w-40">
                <FieldLabel>Leave type</FieldLabel>
                <select value={employeeLeaveTypeFilter} onChange={(event) => setEmployeeLeaveTypeFilter((event.target.value as HrLeaveType) || "")}>
                  <option value="">All</option>
                  {leaveTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="w-40">
                <FieldLabel>Status</FieldLabel>
                <select value={employeeStatusFilter} onChange={(event) => setEmployeeStatusFilter((event.target.value as HrLeaveStatus) || "")}>
                  <option value="">All</option>
                  <option value="PendingManager">PendingManager</option>
                  <option value="PendingHR">PendingHR</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <Button size="sm" onClick={() => setRequestModalOpen(true)} disabled={!employeeActor}>
                Create leave request
              </Button>
            </div>

            <div className="mb-3 overflow-x-auto rounded-md border border-slate-200">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Period</th>
                    <th>Total days</th>
                    <th>Status</th>
                    <th>Waiting at</th>
                    <th>Approvals</th>
                    <th>Employee comment</th>
                    <th>Rejected reason</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.leaveType}{row.doctorNoteFileName ? " 📎" : ""}</td>
                      <td>
                        {row.startDate} - {row.endDate}
                      </td>
                      <td>{row.totalDays}</td>
                      <td>
                        <Badge className={leaveStatusClass(row.status)}>{row.status}</Badge>
                      </td>
                      <td>{waitingLabel(row.status)}</td>
                      <td className="text-xs">
                        <p>Manager: {formatDateTime(row.managerApprovedAt)}</p>
                        <p>HR: {formatDateTime(row.hrApprovedAt)}</p>
                        {row.managerApprovedAt && row.hrApprovedAt && new Date(row.hrApprovedAt).getTime() < new Date(row.managerApprovedAt).getTime() && (
                          <Badge className="bg-amber-100 text-amber-700">⚠ Order anomaly</Badge>
                        )}
                      </td>
                      <td className="text-xs text-slate-600">{row.employeeComment ?? "-"}</td>
                      <td className="text-xs text-slate-600">{row.rejectionReason ?? "-"}</td>
                    </tr>
                  ))}
                  {!employeeRows.length ? (
                    <tr>
                      <td colSpan={8} className="text-center text-xs text-slate-500">
                        No leave requests found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <section className="rounded-md border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">My calendar preview (next 30 days)</p>
              <div className="overflow-x-auto">
                <div className="grid min-w-[960px] grid-cols-10 gap-1">
                  {employeeCalendarDays.map((day) => {
                    const status = leaveStatusForDate(employeeRows, day);
                    return (
                      <div key={day} className={`rounded-md px-2 py-1 text-center text-[11px] font-semibold ${statusCellClass(status)}`}>
                        <p>{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                        <p>{status ? (status === "Approved" ? "A" : status === "PendingHR" ? "PH" : status === "PendingManager" ? "PM" : "R") : "-"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {viewAs === "Manager" && (
          <>
            {!managerActor || !managerTeam.length ? (
              <EmptyState
                title="No direct reports for selected manager"
                hint="Select another manager in the actor selector to review approvals and team leave calendar."
              />
            ) : (
              <>
                <div className="mb-3 grid gap-2 md:grid-cols-4">
                  <div className="rounded-md border border-slate-200 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending manager approvals</p>
                    <p className="text-lg font-semibold text-slate-800">{managerQueueRows.length}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Team members off today</p>
                    <p className="text-lg font-semibold text-slate-800">{managerOffToday}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Upcoming staffing conflicts (30d)</p>
                    <p className="text-lg font-semibold text-slate-800">{managerConflicts.length}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Upcoming team leave blocks</p>
                    <p className="text-lg font-semibold text-slate-800">{managerUpcomingBlocks}</p>
                  </div>
                </div>

                <section className="mb-3 rounded-md border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Approvals queue (PendingManager)</p>
                  <div className="mb-2 grid gap-2 md:grid-cols-3">
                    <div>
                      <FieldLabel>Team member</FieldLabel>
                      <select value={managerMemberFilter} onChange={(event) => setManagerMemberFilter(event.target.value)}>
                        <option value="">All</option>
                        {managerTeam.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {displayEmployee(employee)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Date from</FieldLabel>
                      <input type="date" value={managerDateFrom} onChange={(event) => setManagerDateFrom(event.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Date to</FieldLabel>
                      <input type="date" value={managerDateTo} onChange={(event) => setManagerDateTo(event.target.value)} />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Type</th>
                          <th>Period</th>
                          <th>Days</th>
                          <th>Employee comment</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {managerQueueRows.map((row) => {
                          const employee = employeeById.get(row.employeeId);
                          return (
                            <tr key={row.id}>
                              <td>{employee ? displayEmployee(employee) : row.employeeId}</td>
                              <td>{row.leaveType}{row.doctorNoteFileName ? " 📎" : ""}</td>
                              <td>
                                {row.startDate} - {row.endDate}
                              </td>
                              <td>{row.totalDays}</td>
                              <td className="text-xs text-slate-600">{row.employeeComment ?? "-"}</td>
                              <td>
                                <div className="flex flex-wrap items-center gap-1">
                                  {row.totalDays === 0 && !row.halfDay && <Badge className="bg-rose-100 text-rose-700">⚠ 0 days — invalid</Badge>}
                                  <Button size="sm" onClick={() => setActionModal({ requestId: row.id, action: "MANAGER_APPROVE" })} disabled={row.totalDays === 0 && !row.halfDay}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="secondary" onClick={() => setActionModal({ requestId: row.id, action: "MANAGER_REJECT" })}>
                                    Reject
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {!managerQueueRows.length ? (
                          <tr>
                            <td colSpan={6} className="text-center text-xs text-slate-500">
                              No pending manager approvals.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="mb-3 rounded-md border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Team calendar / overlap view (next 30 days)</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-[1100px]">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          {employeeCalendarDays.map((day) => (
                            <th key={day} className="text-center">
                              {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {managerTeam.map((employee) => {
                          const employeeRowsForCalendar = managerCalendarStatuses.get(employee.id) ?? [];
                          return (
                            <tr key={employee.id}>
                              <td className="whitespace-nowrap">{displayEmployee(employee)}</td>
                              {employeeCalendarDays.map((day) => {
                                const status = leaveStatusForDate(employeeRowsForCalendar, day);
                                return (
                                  <td key={`${employee.id}-${day}`} className="p-1 text-center">
                                    <span className={`inline-flex min-w-[22px] justify-center rounded px-1 py-0.5 text-[10px] ${statusCellClass(status)}`}>
                                      {status ? (status === "Approved" ? "A" : status === "PendingHR" ? "PH" : status === "PendingManager" ? "PM" : "R") : "-"}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Team leave balance summary</p>
                    <div className="overflow-x-auto">
                      <table>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Entitlement</th>
                            <th>Used</th>
                            <th>Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          {managerTeam.map((employee) => {
                            const balance = annualBalance(employee.id);
                            return (
                              <tr key={employee.id}>
                                <td>{displayEmployee(employee)}</td>
                                <td>{balance.entitlement}</td>
                                <td>{balance.used}</td>
                                <td>{balance.remaining}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming staffing conflicts (next 30 days)</p>
                    <div className="space-y-1">
                      {managerConflicts.map((entry) => (
                        <div key={entry.date} className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                          <p className="font-semibold">
                            {entry.date} · {entry.offEmployeeIds.length} off (threshold {entry.threshold})
                          </p>
                          <p>
                            {entry.offEmployeeIds
                              .map((id) => employeeById.get(id))
                              .filter((employee): employee is HrEmployee => Boolean(employee))
                              .map((employee) => displayEmployee(employee))
                              .join(", ")}
                          </p>
                        </div>
                      ))}
                      {!managerConflicts.length ? <p className="text-xs text-slate-500">No staffing conflict detected in next 30 days.</p> : null}
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {viewAs === "HR" && (
          <>
            <div className="mb-3 grid gap-2 md:grid-cols-4">
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending manager</p>
                <p className="text-lg font-semibold text-slate-800">{state.hrLeaveRequests.filter((row) => row.status === "PendingManager").length}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending HR</p>
                <p className="text-lg font-semibold text-slate-800">{hrQueueRows.length}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Approved this month</p>
                <p className="text-lg font-semibold text-slate-800">{hrApprovedThisMonth}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Upcoming conflicts (30d)</p>
                <p className="text-lg font-semibold text-slate-800">{hrUpcomingConflicts.length}</p>
              </div>
            </div>

            <section className="mb-3 rounded-md border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">HR approvals queue (PendingHR)</p>
              </div>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Type</th>
                      <th>Period</th>
                      <th>Days</th>
                      <th>Employee comment</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {hrQueueRows.map((row) => {
                      const employee = employeeById.get(row.employeeId);
                      const departmentName = employee ? departmentById.get(employee.departmentId) ?? employee.departmentId : "-";
                      return (
                        <tr key={row.id}>
                          <td>{employee ? displayEmployee(employee) : row.employeeId}</td>
                          <td>{departmentName}</td>
                          <td>{row.leaveType}{row.doctorNoteFileName ? " 📎" : ""}</td>
                          <td>
                            {row.startDate} - {row.endDate}
                          </td>
                          <td>{row.totalDays}</td>
                          <td className="text-xs text-slate-600">{row.employeeComment ?? "-"}</td>
                          <td>
                            <div className="flex flex-wrap items-center gap-1">
                              {row.totalDays === 0 && !row.halfDay && <Badge className="bg-rose-100 text-rose-700">⚠ 0 days — invalid</Badge>}
                              <Button size="sm" onClick={() => setActionModal({ requestId: row.id, action: "HR_APPROVE" })} disabled={row.totalDays === 0 && !row.halfDay}>
                                Approve
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setActionModal({ requestId: row.id, action: "HR_REJECT" })}>
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!hrQueueRows.length ? (
                      <tr>
                        <td colSpan={7} className="text-center text-xs text-slate-500">
                          No pending HR approvals.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-3 rounded-md border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Global leave list + filters</p>
                <Link to="/hr/settings" className="text-xs font-semibold text-brand-700">
                  Manage Country Leave Profiles
                </Link>
              </div>
              <div className="mb-2 grid gap-2 md:grid-cols-4">
                <div>
                  <FieldLabel>Employee</FieldLabel>
                  <select value={hrFilters.employeeId} onChange={(event) => setHrFilters((prev) => ({ ...prev, employeeId: event.target.value }))}>
                    <option value="">All</option>
                    {state.hrEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {displayEmployee(employee)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Department</FieldLabel>
                  <select value={hrFilters.departmentId} onChange={(event) => setHrFilters((prev) => ({ ...prev, departmentId: event.target.value }))}>
                    <option value="">All</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Manager</FieldLabel>
                  <select value={hrFilters.managerId} onChange={(event) => setHrFilters((prev) => ({ ...prev, managerId: event.target.value }))}>
                    <option value="">All</option>
                    {managerActors.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {displayEmployee(manager)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <select value={hrFilters.country} onChange={(event) => setHrFilters((prev) => ({ ...prev, country: event.target.value }))}>
                    <option value="">All</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <select value={hrFilters.leaveType} onChange={(event) => setHrFilters((prev) => ({ ...prev, leaveType: (event.target.value as HrLeaveType) || "" }))}>
                    <option value="">All</option>
                    {leaveTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <select value={hrFilters.status} onChange={(event) => setHrFilters((prev) => ({ ...prev, status: (event.target.value as HrLeaveStatus) || "" }))}>
                    <option value="">All</option>
                    <option value="PendingManager">PendingManager</option>
                    <option value="PendingHR">PendingHR</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Date from</FieldLabel>
                  <input type="date" value={hrFilters.dateFrom} onChange={(event) => setHrFilters((prev) => ({ ...prev, dateFrom: event.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Date to</FieldLabel>
                  <input type="date" value={hrFilters.dateTo} onChange={(event) => setHrFilters((prev) => ({ ...prev, dateTo: event.target.value }))} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Manager</th>
                      <th>Country</th>
                      <th>Type</th>
                      <th>Period</th>
                      <th>Days</th>
                      <th>Status</th>
                      <th>Manager approved</th>
                      <th>HR approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hrFilteredRows.map((row) => {
                      const employee = employeeById.get(row.employeeId);
                      const manager = employee?.managerId ? employeeById.get(employee.managerId) : undefined;
                      const departmentName = employee ? departmentById.get(employee.departmentId) ?? employee.departmentId : "-";
                      return (
                        <tr key={row.id}>
                          <td>{employee ? displayEmployee(employee) : row.employeeId}</td>
                          <td>{departmentName}</td>
                          <td>{manager ? displayEmployee(manager) : "-"}</td>
                          <td>{employee?.countryOfEmployment ?? "-"}</td>
                          <td>{row.leaveType}{row.doctorNoteFileName ? " 📎" : ""}</td>
                          <td>
                            {row.startDate} - {row.endDate}
                          </td>
                          <td>{row.totalDays}</td>
                          <td>
                            <Badge className={leaveStatusClass(row.status)}>{row.status}</Badge>
                          </td>
                          <td>{formatDateTime(row.managerApprovedAt)}</td>
                          <td>
                            {formatDateTime(row.hrApprovedAt)}
                            {row.managerApprovedAt && row.hrApprovedAt && new Date(row.hrApprovedAt).getTime() < new Date(row.managerApprovedAt).getTime() && (
                              <Badge className="ml-1 bg-amber-100 text-amber-700">⚠ Order anomaly</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!hrFilteredRows.length ? (
                      <tr>
                        <td colSpan={10} className="text-center text-xs text-slate-500">
                          No leave requests match selected filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-md border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Conflict inspector</p>
              <div className="mb-2 grid gap-2 md:grid-cols-3">
                <div>
                  <FieldLabel>Date from</FieldLabel>
                  <input type="date" value={inspectorFrom} onChange={(event) => setInspectorFrom(event.target.value)} />
                </div>
                <div>
                  <FieldLabel>Date to</FieldLabel>
                  <input type="date" value={inspectorTo} onChange={(event) => setInspectorTo(event.target.value)} />
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                  Showing department conflict days where off-count exceeds threshold.
                </div>
              </div>
              <div className="space-y-1">
                {inspectorConflicts.map((entry) => {
                  const departmentName = departmentById.get(entry.departmentId) ?? entry.departmentId;
                  return (
                    <div key={`${entry.departmentId}-${entry.date}`} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                      <p className="font-semibold">
                        {departmentName} · {entry.date} · {entry.offEmployeeIds.length} off (threshold {entry.threshold})
                      </p>
                      <p>
                        {entry.offEmployeeIds
                          .map((id) => employeeById.get(id))
                          .filter((employee): employee is HrEmployee => Boolean(employee))
                          .map((employee) => displayEmployee(employee))
                          .join(", ")}
                      </p>
                    </div>
                  );
                })}
                {!inspectorConflicts.length ? <p className="text-xs text-slate-500">No department-level conflicts in selected range.</p> : null}
              </div>
            </section>
          </>
        )}
      </Card>

      {requestModalOpen && employeeActor ? (
        <LeaveRequestModal
          employee={employeeActor}
          existingRows={state.hrLeaveRequests.filter((row) => row.employeeId === employeeActor.id)}
          annualBalance={annualBalance(employeeActor.id)}
          onClose={() => setRequestModalOpen(false)}
          onSubmit={submitLeaveRequest}
        />
      ) : null}

      <LeaveActionModal
        request={actionRequest}
        action={actionModal?.action ?? null}
        employeeLabel={actionEmployeeLabel}
        onClose={() => {
          setActionModal(null);
          setActionError("");
        }}
        onConfirm={applyAction}
        errorMessage={actionError}
      />
    </div>
  );
}

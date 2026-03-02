import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { OpsAuditLogEntry, OpsShift } from "../../store/types";
import { computeCaseSla, formatDurationMs } from "./opsUtils";

function fromDateTimeLocal(value: string): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

export function NocPerformanceAuditPage() {
  const state = useAppStore();
  const [parentTypeFilter, setParentTypeFilter] = useState<OpsAuditLogEntry["parentType"] | "Any">("Any");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("Any");
  const [dateFilter, setDateFilter] = useState("Any");
  const [newShiftTrack, setNewShiftTrack] = useState<OpsShift["track"]>("Both");
  const [newShiftStart, setNewShiftStart] = useState("");
  const [newShiftEnd, setNewShiftEnd] = useState("");
  const [newShiftUsers, setNewShiftUsers] = useState<string[]>([]);

  const caseById = useMemo(() => new Map(state.opsCases.map((entry) => [entry.id, entry])), [state.opsCases]);

  const ttCreationDurations = useMemo(() => {
    const rows: number[] = [];
    state.opsCases.forEach((opsCase) => {
      const linked = state.opsRequests
        .filter((request) => request.relatedCaseId === opsCase.id && request.requestType === "TroubleTicketRequest")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (!linked) return;
      const duration = new Date(linked.createdAt).getTime() - new Date(opsCase.detectedAt).getTime();
      if (duration >= 0) rows.push(duration);
    });
    return rows;
  }, [state.opsCases, state.opsRequests]);

  const resolvedCases = useMemo(() => state.opsCases.filter((entry) => entry.status === "Resolved"), [state.opsCases]);

  const avgTtCreationMs = ttCreationDurations.length > 0 ? Math.round(ttCreationDurations.reduce((sum, value) => sum + value, 0) / ttCreationDurations.length) : 0;
  const resolutionDurations = resolvedCases
    .map((entry) => (entry.resolvedAt ? new Date(entry.resolvedAt).getTime() - new Date(entry.detectedAt).getTime() : undefined))
    .filter((entry): entry is number => typeof entry === "number" && entry >= 0);
  const avgResolutionMs =
    resolutionDurations.length > 0 ? Math.round(resolutionDurations.reduce((sum, value) => sum + value, 0) / resolutionDurations.length) : 0;
  const resolvedWithinSla = resolvedCases.filter((entry) => !computeCaseSla(entry).breached).length;
  const slaCompliancePercent = resolvedCases.length > 0 ? Math.round((resolvedWithinSla / resolvedCases.length) * 100) : 0;

  const casesPerShift = useMemo(() => {
    if (state.opsShifts.length === 0) return 0;
    const perShift = state.opsShifts.map((shift) => {
      const startMs = new Date(shift.startsAt).getTime();
      const endMs = new Date(shift.endsAt).getTime();
      const caseIds = new Set(
        state.opsAuditLogs
          .filter(
            (entry) =>
              entry.parentType === "Case" &&
              (entry.actionType === "START" || entry.actionType === "ASSIGN") &&
              new Date(entry.timestamp).getTime() >= startMs &&
              new Date(entry.timestamp).getTime() <= endMs,
          )
          .map((entry) => entry.parentId),
      );
      return caseIds.size;
    });
    return Math.round(perShift.reduce((sum, value) => sum + value, 0) / perShift.length);
  }, [state.opsAuditLogs, state.opsShifts]);

  const resolutionBySeverity = useMemo(() => {
    const base = {
      Urgent: { Resolved: 0, InProgress: 0, Other: 0 },
      High: { Resolved: 0, InProgress: 0, Other: 0 },
      Medium: { Resolved: 0, InProgress: 0, Other: 0 },
    };
    state.opsCases.forEach((entry) => {
      if (entry.status === "Resolved") base[entry.severity].Resolved += 1;
      else if (entry.status === "InProgress") base[entry.severity].InProgress += 1;
      else base[entry.severity].Other += 1;
    });
    return base;
  }, [state.opsCases]);

  const individualPerformance = useMemo(() => {
    return state.users.map((user) => {
      const userCaseEvents = state.opsAuditLogs.filter(
        (entry) =>
          entry.parentType === "Case" &&
          entry.performedByUserId === user.id &&
          (entry.actionType === "ASSIGN" || entry.actionType === "START" || entry.actionType === "RESOLVE"),
      );
      const handledCaseIds = Array.from(new Set(userCaseEvents.map((entry) => entry.parentId)));
      const resolvedByUserIds = Array.from(
        new Set(
          state.opsAuditLogs
            .filter((entry) => entry.parentType === "Case" && entry.performedByUserId === user.id && entry.actionType === "RESOLVE")
            .map((entry) => entry.parentId),
        ),
      );
      const resolvedRows = resolvedByUserIds
        .map((id) => caseById.get(id))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .filter((entry) => Boolean(entry.resolvedAt));
      const resolutionTimes = resolvedRows
        .map((entry) => (entry.resolvedAt ? new Date(entry.resolvedAt).getTime() - new Date(entry.detectedAt).getTime() : undefined))
        .filter((entry): entry is number => typeof entry === "number" && entry >= 0);
      const avgUserResolutionMs =
        resolutionTimes.length > 0 ? Math.round(resolutionTimes.reduce((sum, value) => sum + value, 0) / resolutionTimes.length) : 0;
      const userResolvedWithinSla = resolvedRows.filter((entry) => !computeCaseSla(entry).breached).length;
      const userSlaCompliance = resolvedRows.length > 0 ? Math.round((userResolvedWithinSla / resolvedRows.length) * 100) : 0;
      const speedScore = avgUserResolutionMs > 0 ? Math.max(0, 100 - Math.round(avgUserResolutionMs / (30 * 60 * 1000))) : 0;
      const performanceScore = Math.round(userSlaCompliance * 0.7 + speedScore * 0.3);
      return {
        userId: user.id,
        userName: user.name,
        handledCasesCount: handledCaseIds.length,
        resolvedCount: resolvedRows.length,
        avgResolutionMs: avgUserResolutionMs,
        slaCompliancePercent: userSlaCompliance,
        performanceScore,
      };
    });
  }, [caseById, state.opsAuditLogs, state.users]);

  const filteredAuditLogs = useMemo(() => {
    let rows = state.opsAuditLogs.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (parentTypeFilter !== "Any") rows = rows.filter((entry) => entry.parentType === parentTypeFilter);
    if (userFilter !== "Any") rows = rows.filter((entry) => entry.performedByUserId === userFilter);
    if (actionFilter.trim()) rows = rows.filter((entry) => entry.actionType.toLowerCase().includes(actionFilter.trim().toLowerCase()));
    if (dateFilter === "Today") {
      const today = new Date().toDateString();
      rows = rows.filter((entry) => new Date(entry.timestamp).toDateString() === today);
    } else if (dateFilter === "Last7Days" || dateFilter === "Last30Days") {
      const dayCount = dateFilter === "Last7Days" ? 7 : 30;
      const from = new Date();
      from.setDate(from.getDate() - dayCount);
      rows = rows.filter((entry) => new Date(entry.timestamp).getTime() >= from.getTime());
    }
    return rows;
  }, [actionFilter, dateFilter, parentTypeFilter, state.opsAuditLogs, userFilter]);

  function toggleShiftUser(userId: string) {
    setNewShiftUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function createShift() {
    if (!newShiftStart || !newShiftEnd || newShiftUsers.length === 0) return;
    state.createOpsShift({
      track: newShiftTrack,
      startsAt: fromDateTimeLocal(newShiftStart),
      endsAt: fromDateTimeLocal(newShiftEnd),
      userIds: newShiftUsers,
    });
    setNewShiftTrack("Both");
    setNewShiftStart("");
    setNewShiftEnd("");
    setNewShiftUsers([]);
  }

  return (
    <div className="space-y-4">
      <Card title="NOC Performance / Audit">
        <div className="grid gap-2 md:grid-cols-5">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Avg TT creation time</p>
            <p className="text-lg font-semibold text-slate-800">{formatDurationMs(avgTtCreationMs)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Avg resolution time</p>
            <p className="text-lg font-semibold text-slate-800">{formatDurationMs(avgResolutionMs)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">SLA compliance</p>
            <p className="text-lg font-semibold text-emerald-700">{slaCompliancePercent}%</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Cases per shift</p>
            <p className="text-lg font-semibold text-slate-800">{casesPerShift}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Resolved / total</p>
            <p className="text-lg font-semibold text-slate-800">
              {resolvedCases.length} / {state.opsCases.length}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Shift Schedule (24/7)">
        <div className="grid gap-2 md:grid-cols-4">
          <div>
            <FieldLabel>Track</FieldLabel>
            <select value={newShiftTrack} onChange={(event) => setNewShiftTrack(event.target.value as OpsShift["track"])}>
              <option value="Both">Both</option>
              <option value="SMS">SMS</option>
              <option value="Voice">Voice</option>
            </select>
          </div>
          <div>
            <FieldLabel>Start</FieldLabel>
            <input type="datetime-local" value={newShiftStart} onChange={(event) => setNewShiftStart(event.target.value)} />
          </div>
          <div>
            <FieldLabel>End</FieldLabel>
            <input type="datetime-local" value={newShiftEnd} onChange={(event) => setNewShiftEnd(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={createShift} disabled={!newShiftStart || !newShiftEnd || newShiftUsers.length === 0}>
              Add shift
            </Button>
          </div>
        </div>
        <div className="mt-2 grid gap-1 md:grid-cols-4">
          {state.users.map((user) => (
            <label key={user.id} className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={newShiftUsers.includes(user.id)} onChange={() => toggleShiftUser(user.id)} />
              {user.name}
            </label>
          ))}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Track</th>
                <th>Start</th>
                <th>End</th>
                <th>Users</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {state.opsShifts.map((shift) => (
                <tr key={shift.id}>
                  <td>{shift.track}</td>
                  <td>{new Date(shift.startsAt).toLocaleString()}</td>
                  <td>{new Date(shift.endsAt).toLocaleString()}</td>
                  <td>{shift.userIds.map((id) => state.users.find((user) => user.id === id)?.name ?? id).join(", ")}</td>
                  <td>
                    <Button size="sm" variant="danger" onClick={() => state.deleteOpsShift(shift.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Resolution by Severity">
        <div className="grid gap-2 md:grid-cols-3">
          {(["Urgent", "High", "Medium"] as const).map((severity) => (
            <div key={severity} className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">{severity}</p>
              <p className="text-xs text-slate-500">Resolved: {resolutionBySeverity[severity].Resolved}</p>
              <p className="text-xs text-slate-500">In Progress: {resolutionBySeverity[severity].InProgress}</p>
              <p className="text-xs text-slate-500">Other: {resolutionBySeverity[severity].Other}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Individual NOC Performance / Bonus Achievement">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Handled cases</th>
                <th>Resolved</th>
                <th>Avg resolution</th>
                <th>SLA compliance</th>
                <th>Performance score</th>
                <th>Bonus level</th>
              </tr>
            </thead>
            <tbody>
              {individualPerformance.map((entry) => {
                const bonusLevel = entry.performanceScore >= 85 ? "A" : entry.performanceScore >= 70 ? "B" : entry.performanceScore >= 55 ? "C" : "D";
                return (
                  <tr key={entry.userId}>
                    <td>{entry.userName}</td>
                    <td>{entry.handledCasesCount}</td>
                    <td>{entry.resolvedCount}</td>
                    <td>{formatDurationMs(entry.avgResolutionMs)}</td>
                    <td>{entry.slaCompliancePercent}%</td>
                    <td>{entry.performanceScore}</td>
                    <td>
                      <Badge className={bonusLevel === "A" ? "bg-emerald-100 text-emerald-700" : bonusLevel === "B" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}>
                        {bonusLevel}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Audit Log Explorer">
        <div className="grid gap-2 md:grid-cols-5">
          <div>
            <FieldLabel>Parent type</FieldLabel>
            <select value={parentTypeFilter} onChange={(event) => setParentTypeFilter(event.target.value as typeof parentTypeFilter)}>
              <option value="Any">Any</option>
              <option value="Request">Request</option>
              <option value="Case">Case</option>
            </select>
          </div>
          <div>
            <FieldLabel>Action contains</FieldLabel>
            <input value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} />
          </div>
          <div>
            <FieldLabel>User</FieldLabel>
            <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)}>
              <option value="Any">Any</option>
              {state.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="Any">Any</option>
              <option value="Today">Today</option>
              <option value="Last7Days">Last 7 days</option>
              <option value="Last30Days">Last 30 days</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setParentTypeFilter("Any");
                setActionFilter("");
                setUserFilter("Any");
                setDateFilter("Any");
              }}
            >
              Reset
            </Button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Parent</th>
                <th>Action</th>
                <th>User</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuditLogs.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td>
                    {entry.parentType} / {entry.parentId}
                  </td>
                  <td>{entry.actionType}</td>
                  <td>{state.users.find((user) => user.id === entry.performedByUserId)?.name ?? entry.performedByUserId}</td>
                  <td>{entry.comment ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

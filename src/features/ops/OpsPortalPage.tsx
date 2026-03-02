import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import {
  OpsAssignedRole,
  OpsCase,
  OpsCaseCategory,
  OpsMonitoringModuleOrigin,
  OpsRequestActionType,
  OpsRequestType,
  OpsSeverity,
  OpsTrack,
} from "../../store/types";
import {
  OpsDateFilter,
  caseStatusBadgeClass,
  categoryToSlaProfile,
  computeCaseSla,
  dateMatchesFilter,
  formatDurationMs,
  getEscalationLevel,
  requestStatusBadgeClass,
  severityBadgeClass,
} from "./opsUtils";
import { createDemoTrafficAdapter } from "./trafficAdapter";

type OpsTab = "Cases" | "Requests" | "Signals";
type PortalFilterScope = "all" | "mine";

export type OpsPortalConfig = {
  portalId: "sms-noc" | "voice-noc" | "routing-noc" | "am-noc-routing" | "account-managers";
  title: string;
  subtitle: string;
  defaultTrack: OpsTrack | "Any";
  moduleFocus?: OpsMonitoringModuleOrigin[];
  requestRoleFocus?: OpsAssignedRole[];
  requestScope?: PortalFilterScope;
  caseScope?: PortalFilterScope;
  includeCreatedByMe?: boolean;
};

const moduleOptions: OpsMonitoringModuleOrigin[] = [
  "ProviderIssues",
  "Losses",
  "NewAndLostTraffics",
  "TrafficComparison",
  "ScheduleTestResults",
  "FailedSmsOrCallAnalysis",
];

const requestTypeOptions: OpsRequestType[] = [
  "RoutingRequest",
  "TroubleTicketRequest",
  "TestRequest",
  "LossAccepted",
  "InterconnectionRequest",
];

const severityOptions: OpsSeverity[] = ["Urgent", "High", "Medium"];
const caseCategoryOptions: OpsCaseCategory[] = ["Loss", "KPI", "Traffic", "Provider", "Test", "Other"];

function requestAssignedRoleForType(requestType: OpsRequestType): OpsAssignedRole {
  if (requestType === "RoutingRequest") return "Routing";
  if (requestType === "TroubleTicketRequest") return "NOC";
  if (requestType === "TestRequest") return "NOC";
  if (requestType === "LossAccepted") return "AM";
  return "Supervisor";
}

function requestDoneActionForType(requestType: OpsRequestType): OpsRequestActionType {
  if (requestType === "TroubleTicketRequest") return "TT_SENT";
  if (requestType === "TestRequest") return "TEST_DONE";
  if (requestType === "LossAccepted") return "LOSS_ACCEPTED";
  return "ROUTING_DONE";
}

function requestTypeLabel(requestType: OpsRequestType): string {
  if (requestType === "RoutingRequest") return "Routing Request";
  if (requestType === "TroubleTicketRequest") return "Trouble Ticket Request";
  if (requestType === "TestRequest") return "Test Request";
  if (requestType === "LossAccepted") return "Loss Accepted";
  return "Interconnection Request";
}

function actionLabel(action: string): string {
  return action.replace(/_/g, " ");
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function moduleLabel(value: OpsMonitoringModuleOrigin): string {
  if (value === "ProviderIssues") return "Provider Issues";
  if (value === "Losses") return "Losses";
  if (value === "NewAndLostTraffics") return "New & Lost Traffics";
  if (value === "TrafficComparison") return "Traffic Comparison";
  if (value === "ScheduleTestResults") return "Schedule Test Results";
  return "Failed SMS/Call Analysis";
}

export function OpsPortalPage({ config }: { config: OpsPortalConfig }) {
  const state = useAppStore();
  const [tab, setTab] = useState<OpsTab>("Cases");
  const [severityFilter, setSeverityFilter] = useState<OpsSeverity | "Any">("Any");
  const [moduleFilter, setModuleFilter] = useState<OpsMonitoringModuleOrigin | "Any">("Any");
  const [assignedFilter, setAssignedFilter] = useState<string>("Any");
  const [dateFilter, setDateFilter] = useState<OpsDateFilter>("Any");
  const [trackFilter, setTrackFilter] = useState<OpsTrack | "Any">(config.defaultTrack);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [requestActionComment, setRequestActionComment] = useState("");
  const [caseActionComment, setCaseActionComment] = useState("");
  const [caseResolutionType, setCaseResolutionType] = useState<OpsCase["resolutionType"]>("Fixed");
  const [assignToUserId, setAssignToUserId] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    moduleOrigin: config.moduleFocus?.[0] ?? "ProviderIssues",
    severity: "High" as OpsSeverity,
    category: "Provider" as OpsCaseCategory,
    relatedTrack: config.defaultTrack === "Any" ? "SMS" : config.defaultTrack,
    relatedCompanyId: "",
    relatedProvider: "",
    relatedDestination: "",
    description: "",
    assignedToUserId: "",
  });
  const [newRequestForm, setNewRequestForm] = useState({
    requestType: "RoutingRequest" as OpsRequestType,
    priority: "High" as OpsSeverity,
    relatedTrack: config.defaultTrack === "Any" ? "SMS" : config.defaultTrack,
    relatedCompanyId: "",
    relatedCaseId: "",
    destinationCountry: "",
    destinationOperator: "",
    comment: "",
  });

  const companyById = useMemo(() => new Map(state.companies.map((company) => [company.id, company])), [state.companies]);
  const caseById = useMemo(() => new Map(state.opsCases.map((entry) => [entry.id, entry])), [state.opsCases]);

  const selectedCase = useMemo(() => state.opsCases.find((entry) => entry.id === selectedCaseId), [selectedCaseId, state.opsCases]);
  const selectedRequest = useMemo(
    () => state.opsRequests.find((entry) => entry.id === selectedRequestId),
    [selectedRequestId, state.opsRequests],
  );

  const caseTimeline = useMemo(
    () =>
      state.opsAuditLogs
        .filter((entry) => entry.parentType === "Case" && entry.parentId === selectedCaseId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [selectedCaseId, state.opsAuditLogs],
  );

  const requestTimeline = useMemo(
    () =>
      state.opsAuditLogs
        .filter((entry) => entry.parentType === "Request" && entry.parentId === selectedRequestId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [selectedRequestId, state.opsAuditLogs],
  );

  const filteredCases = useMemo(() => {
    let rows = state.opsCases.slice();
    if (config.defaultTrack !== "Any") rows = rows.filter((entry) => entry.relatedTrack === config.defaultTrack);
    if (trackFilter !== "Any") rows = rows.filter((entry) => entry.relatedTrack === trackFilter);
    if (config.moduleFocus && config.moduleFocus.length > 0) {
      rows = rows.filter((entry) => config.moduleFocus?.includes(entry.moduleOrigin));
    }
    if (config.caseScope === "mine") {
      rows = rows.filter((entry) => {
        if (entry.assignedToUserId === state.activeUserId) return true;
        if (!entry.relatedCompanyId) return false;
        const linkedCompany = companyById.get(entry.relatedCompanyId);
        if (!linkedCompany) return false;
        return linkedCompany.ownerUserId === state.activeUserId || linkedCompany.watcherUserIds.includes(state.activeUserId);
      });
    }
    if (severityFilter !== "Any") rows = rows.filter((entry) => entry.severity === severityFilter);
    if (moduleFilter !== "Any") rows = rows.filter((entry) => entry.moduleOrigin === moduleFilter);
    if (assignedFilter !== "Any") rows = rows.filter((entry) => entry.assignedToUserId === assignedFilter);
    if (dateFilter !== "Any") rows = rows.filter((entry) => dateMatchesFilter(entry.detectedAt, dateFilter));
    return rows
      .slice()
      .sort((left, right) => computeCaseSla(left).remainingMs - computeCaseSla(right).remainingMs);
  }, [
    assignedFilter,
    companyById,
    config.caseScope,
    config.defaultTrack,
    config.moduleFocus,
    dateFilter,
    moduleFilter,
    severityFilter,
    state.activeUserId,
    state.opsCases,
    trackFilter,
  ]);

  const filteredRequests = useMemo(() => {
    let rows = state.opsRequests.slice();
    if (config.defaultTrack !== "Any") rows = rows.filter((entry) => entry.relatedTrack === config.defaultTrack);
    if (trackFilter !== "Any") rows = rows.filter((entry) => entry.relatedTrack === trackFilter);
    if (config.requestRoleFocus && config.requestRoleFocus.length > 0) {
      rows = rows.filter((entry) =>
        config.includeCreatedByMe
          ? config.requestRoleFocus?.includes(entry.assignedToRole) || entry.createdByUserId === state.activeUserId
          : config.requestRoleFocus?.includes(entry.assignedToRole),
      );
    }
    if (config.requestScope === "mine") {
      rows = rows.filter((entry) => entry.createdByUserId === state.activeUserId);
    }
    if (severityFilter !== "Any") rows = rows.filter((entry) => entry.priority === severityFilter);
    if (moduleFilter !== "Any") {
      rows = rows.filter((entry) => {
        if (!entry.relatedCaseId) return false;
        return caseById.get(entry.relatedCaseId)?.moduleOrigin === moduleFilter;
      });
    }
    if (assignedFilter !== "Any") {
      rows = rows.filter((entry) => {
        if (entry.createdByUserId === assignedFilter) return true;
        if (!entry.relatedCaseId) return false;
        return caseById.get(entry.relatedCaseId)?.assignedToUserId === assignedFilter;
      });
    }
    if (dateFilter !== "Any") rows = rows.filter((entry) => dateMatchesFilter(entry.createdAt, dateFilter));
    return rows.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [
    assignedFilter,
    caseById,
    config.defaultTrack,
    config.includeCreatedByMe,
    config.requestRoleFocus,
    config.requestScope,
    dateFilter,
    moduleFilter,
    severityFilter,
    state.activeUserId,
    state.opsRequests,
    trackFilter,
  ]);

  const filteredSignals = useMemo(() => {
    let rows = state.opsMonitoringSignals.slice();
    if (config.defaultTrack !== "Any") rows = rows.filter((entry) => entry.relatedTrack === config.defaultTrack);
    if (trackFilter !== "Any") rows = rows.filter((entry) => entry.relatedTrack === trackFilter);
    if (config.moduleFocus && config.moduleFocus.length > 0) {
      rows = rows.filter((entry) => config.moduleFocus?.includes(entry.moduleOrigin));
    }
    if (severityFilter !== "Any") rows = rows.filter((entry) => entry.severity === severityFilter);
    if (moduleFilter !== "Any") rows = rows.filter((entry) => entry.moduleOrigin === moduleFilter);
    if (dateFilter !== "Any") rows = rows.filter((entry) => dateMatchesFilter(entry.detectedAt, dateFilter));
    return rows.slice().sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }, [config.defaultTrack, config.moduleFocus, dateFilter, moduleFilter, severityFilter, state.opsMonitoringSignals, trackFilter]);

  const kpis = useMemo(() => {
    const pendingCases = filteredCases.filter((entry) => entry.status === "New" || entry.status === "InProgress");
    const pendingRequests = filteredRequests.filter((entry) => entry.status === "Sent" || entry.status === "InProgress");
    const breaches = pendingCases.filter((entry) => computeCaseSla(entry).breached).length;
    const urgentCount =
      pendingCases.filter((entry) => entry.severity === "Urgent").length +
      pendingRequests.filter((entry) => entry.priority === "Urgent").length;
    return {
      pendingCases: pendingCases.length,
      pendingRequests: pendingRequests.length,
      breaches,
      urgentCount,
    };
  }, [filteredCases, filteredRequests]);

  async function syncSignals() {
    setSyncBusy(true);
    setSyncMessage("");
    try {
      const tracks: OpsTrack[] = trackFilter === "Any" ? ["SMS", "Voice"] : [trackFilter];
      let createdCount = 0;
      for (const track of tracks) {
        const adapter = createDemoTrafficAdapter(track);
        const [providerIssues, lossAlerts, trafficComparison, testResults] = await Promise.all([
          adapter.fetchProviderIssues(),
          adapter.fetchLossAlerts(),
          adapter.fetchTrafficComparison(),
          adapter.fetchTestResults(),
        ]);
        createdCount += state.ingestOpsMonitoringSignals(
          [...providerIssues, ...lossAlerts, ...trafficComparison, ...testResults],
          { autoCreate: true },
        );
      }
      setSyncMessage(`Demo adapter synced. ${createdCount} new signals ingested.`);
    } finally {
      setSyncBusy(false);
    }
  }

  function createCaseFromForm() {
    if (!newCaseForm.description.trim()) return;
    state.createOpsCase({
      moduleOrigin: newCaseForm.moduleOrigin,
      relatedTrack: newCaseForm.relatedTrack,
      severity: newCaseForm.severity,
      category: newCaseForm.category,
      detectedAt: new Date().toISOString(),
      relatedCompanyId: newCaseForm.relatedCompanyId || undefined,
      relatedProvider: newCaseForm.relatedProvider.trim() || undefined,
      relatedDestination: newCaseForm.relatedDestination.trim() || undefined,
      description: newCaseForm.description.trim(),
      status: "New",
      slaProfileId: categoryToSlaProfile(newCaseForm.category),
      assignedToUserId: newCaseForm.assignedToUserId || undefined,
    });
    setNewCaseOpen(false);
    setNewCaseForm((prev) => ({
      ...prev,
      description: "",
      relatedProvider: "",
      relatedDestination: "",
      relatedCompanyId: "",
    }));
  }

  function createRequestFromForm() {
    if (!newRequestForm.destinationCountry.trim()) return;
    const requestType = newRequestForm.requestType;
    state.createOpsRequest({
      requestType,
      createdByUserId: state.activeUserId,
      assignedToRole: requestAssignedRoleForType(requestType),
      priority: newRequestForm.priority,
      relatedCompanyId: newRequestForm.relatedCompanyId || undefined,
      relatedTrack: newRequestForm.relatedTrack,
      destination: {
        country: newRequestForm.destinationCountry.trim(),
        operator: newRequestForm.destinationOperator.trim() || undefined,
      },
      comment: newRequestForm.comment.trim(),
      status: "Draft",
      relatedCaseId: newRequestForm.relatedCaseId || undefined,
    });
    setNewRequestOpen(false);
    setNewRequestForm((prev) => ({
      ...prev,
      destinationCountry: "",
      destinationOperator: "",
      comment: "",
      relatedCaseId: "",
    }));
  }

  function applyRequestAction(actionType: OpsRequestActionType) {
    if (!selectedRequest) return;
    const result = state.applyOpsRequestAction(selectedRequest.id, actionType, {
      comment: requestActionComment,
      doneByUserId: state.activeUserId,
    });
    if (!result.ok && result.message) {
      setSyncMessage(result.message);
      return;
    }
    setRequestActionComment("");
  }

  function applyCaseAction(actionType: "ASSIGN" | "START" | "RESOLVE" | "IGNORE" | "CANCEL" | "COMMENT") {
    if (!selectedCase) return;
    const result = state.applyOpsCaseAction(selectedCase.id, actionType, {
      comment: caseActionComment,
      assignedToUserId: actionType === "ASSIGN" ? assignToUserId : undefined,
      resolutionType: actionType === "RESOLVE" ? caseResolutionType : undefined,
      doneByUserId: state.activeUserId,
    });
    if (!result.ok && result.message) {
      setSyncMessage(result.message);
      return;
    }
    setCaseActionComment("");
  }

  const selectedCaseSla = selectedCase ? computeCaseSla(selectedCase) : null;
  const selectedCaseEscalation = selectedCaseSla ? getEscalationLevel(selectedCaseSla.remainingPct, selectedCaseSla.breached) : 0;

  return (
    <div className="space-y-4">
      <Card title={config.title}>
        <p className="text-xs text-slate-500">{config.subtitle}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Pending cases</p>
            <p className="text-xl font-semibold text-slate-800">{kpis.pendingCases}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Pending requests</p>
            <p className="text-xl font-semibold text-slate-800">{kpis.pendingRequests}</p>
          </div>
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-rose-600">SLA breaches</p>
            <p className="text-xl font-semibold text-rose-700">{kpis.breaches}</p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-amber-700">Urgent</p>
            <p className="text-xl font-semibold text-amber-700">{kpis.urgentCount}</p>
          </div>
        </div>
      </Card>

      <Card
        title="Main Work List"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setNewCaseOpen(true)}>
              + Case
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setNewRequestOpen(true)}>
              + Request
            </Button>
            <Button size="sm" onClick={syncSignals} disabled={syncBusy}>
              {syncBusy ? "Syncing..." : "Sync signals"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-2 md:grid-cols-6">
          <div>
            <FieldLabel>Severity</FieldLabel>
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as OpsSeverity | "Any")}>
              <option value="Any">Any</option>
              {severityOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Module</FieldLabel>
            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value as OpsMonitoringModuleOrigin | "Any")}>
              <option value="Any">Any</option>
              {moduleOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {moduleLabel(entry)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Assigned to</FieldLabel>
            <select value={assignedFilter} onChange={(event) => setAssignedFilter(event.target.value)}>
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
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as OpsDateFilter)}>
              <option value="Any">Any</option>
              <option value="Today">Today</option>
              <option value="Last7Days">Last 7 days</option>
              <option value="Last30Days">Last 30 days</option>
            </select>
          </div>
          <div>
            <FieldLabel>Track</FieldLabel>
            <select value={trackFilter} onChange={(event) => setTrackFilter(event.target.value as OpsTrack | "Any")}>
              <option value="Any">Any</option>
              <option value="SMS">SMS</option>
              <option value="Voice">Voice</option>
            </select>
          </div>
          <div className="flex items-end justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSeverityFilter("Any");
                setModuleFilter("Any");
                setAssignedFilter("Any");
                setDateFilter("Any");
                setTrackFilter(config.defaultTrack);
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant={tab === "Cases" ? "primary" : "secondary"} onClick={() => setTab("Cases")}>
            Cases
          </Button>
          <Button size="sm" variant={tab === "Requests" ? "primary" : "secondary"} onClick={() => setTab("Requests")}>
            Requests
          </Button>
          <Button size="sm" variant={tab === "Signals" ? "primary" : "secondary"} onClick={() => setTab("Signals")}>
            Signals
          </Button>
          {syncMessage && <span className="text-[11px] text-slate-500">{syncMessage}</span>}
        </div>

        {tab === "Cases" && (
          <div className="mt-3 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Module</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>SLA remaining</th>
                  <th>Destination</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((entry) => {
                  const sla = computeCaseSla(entry);
                  const escalation = getEscalationLevel(sla.remainingPct, sla.breached);
                  return (
                    <tr key={entry.id} className={sla.breached ? "bg-rose-50/50" : ""}>
                      <td>
                        <p className="font-semibold text-slate-700">{entry.id}</p>
                        <p className="text-xs text-slate-500">{entry.description}</p>
                      </td>
                      <td>{moduleLabel(entry.moduleOrigin)}</td>
                      <td>
                        <Badge className={severityBadgeClass(entry.severity)}>{entry.severity}</Badge>
                      </td>
                      <td>
                        <Badge className={caseStatusBadgeClass(entry.status)}>{entry.status}</Badge>
                      </td>
                      <td>{state.users.find((user) => user.id === entry.assignedToUserId)?.name ?? "-"}</td>
                      <td>
                        <p className={sla.breached ? "text-xs font-semibold text-rose-700" : "text-xs text-slate-700"}>
                          {formatDurationMs(sla.remainingMs)}
                        </p>
                        <p className="text-[10px] text-slate-500">Escalation L{escalation}</p>
                      </td>
                      <td>
                        <p className="text-xs text-slate-700">{entry.relatedDestination ?? "-"}</p>
                        <p className="text-[10px] text-slate-500">{entry.relatedProvider ?? "-"}</p>
                      </td>
                      <td>
                        <Button size="sm" variant="secondary" onClick={() => setSelectedCaseId(entry.id)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Requests" && (
          <div className="mt-3 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned role</th>
                  <th>Track</th>
                  <th>Destination</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <p className="font-semibold text-slate-700">{requestTypeLabel(entry.requestType)}</p>
                      <p className="text-xs text-slate-500">{entry.comment || "-"}</p>
                    </td>
                    <td>
                      <Badge className={requestStatusBadgeClass(entry.status)}>{entry.status}</Badge>
                    </td>
                    <td>
                      <Badge className={severityBadgeClass(entry.priority)}>{entry.priority}</Badge>
                    </td>
                    <td>{entry.assignedToRole}</td>
                    <td>{entry.relatedTrack}</td>
                    <td>
                      <p className="text-xs text-slate-700">{entry.destination.country}</p>
                      <p className="text-[10px] text-slate-500">{entry.destination.operator ?? "-"}</p>
                    </td>
                    <td>{formatDateTime(entry.updatedAt)}</td>
                    <td>
                      <Button size="sm" variant="secondary" onClick={() => setSelectedRequestId(entry.id)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Signals" && (
          <div className="mt-3 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Severity</th>
                  <th>Track</th>
                  <th>Detected</th>
                  <th>Destination</th>
                  <th>Linked case</th>
                </tr>
              </thead>
              <tbody>
                {filteredSignals.map((entry) => (
                  <tr key={entry.id}>
                    <td>{moduleLabel(entry.moduleOrigin)}</td>
                    <td>
                      <Badge className={severityBadgeClass(entry.severity)}>{entry.severity}</Badge>
                    </td>
                    <td>{entry.relatedTrack}</td>
                    <td>{formatDateTime(entry.detectedAt)}</td>
                    <td>
                      <p className="text-xs text-slate-700">{entry.relatedDestination ?? "-"}</p>
                      <p className="text-[10px] text-slate-500">{entry.relatedProvider ?? "-"}</p>
                    </td>
                    <td className="text-xs text-slate-600">{entry.createdCaseId ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {newCaseOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setNewCaseOpen(false)}>
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Create case</h3>
              <Button size="sm" variant="secondary" onClick={() => setNewCaseOpen(false)}>
                Close
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              <div>
                <FieldLabel>Module</FieldLabel>
                <select
                  value={newCaseForm.moduleOrigin}
                  onChange={(event) =>
                    setNewCaseForm((prev) => ({
                      ...prev,
                      moduleOrigin: event.target.value as OpsMonitoringModuleOrigin,
                    }))
                  }
                >
                  {moduleOptions.map((entry) => (
                    <option key={entry} value={entry}>
                      {moduleLabel(entry)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Severity</FieldLabel>
                <select
                  value={newCaseForm.severity}
                  onChange={(event) =>
                    setNewCaseForm((prev) => ({
                      ...prev,
                      severity: event.target.value as OpsSeverity,
                    }))
                  }
                >
                  {severityOptions.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <select
                  value={newCaseForm.category}
                  onChange={(event) =>
                    setNewCaseForm((prev) => ({
                      ...prev,
                      category: event.target.value as OpsCaseCategory,
                    }))
                  }
                >
                  {caseCategoryOptions.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Track</FieldLabel>
                <select
                  value={newCaseForm.relatedTrack}
                  onChange={(event) =>
                    setNewCaseForm((prev) => ({
                      ...prev,
                      relatedTrack: event.target.value as OpsTrack,
                    }))
                  }
                >
                  <option value="SMS">SMS</option>
                  <option value="Voice">Voice</option>
                </select>
              </div>
              <div>
                <FieldLabel>Assign to</FieldLabel>
                <select
                  value={newCaseForm.assignedToUserId}
                  onChange={(event) => setNewCaseForm((prev) => ({ ...prev, assignedToUserId: event.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {state.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Company (optional)</FieldLabel>
                <select
                  value={newCaseForm.relatedCompanyId}
                  onChange={(event) => setNewCaseForm((prev) => ({ ...prev, relatedCompanyId: event.target.value }))}
                >
                  <option value="">None</option>
                  {state.companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Provider</FieldLabel>
                <input
                  value={newCaseForm.relatedProvider}
                  onChange={(event) => setNewCaseForm((prev) => ({ ...prev, relatedProvider: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel>Destination</FieldLabel>
                <input
                  value={newCaseForm.relatedDestination}
                  onChange={(event) => setNewCaseForm((prev) => ({ ...prev, relatedDestination: event.target.value }))}
                />
              </div>
              <div className="md:col-span-4">
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={newCaseForm.description}
                  onChange={(event) => setNewCaseForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setNewCaseOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={createCaseFromForm} disabled={!newCaseForm.description.trim()}>
                Create case
              </Button>
            </div>
          </div>
        </div>
      )}

      {newRequestOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setNewRequestOpen(false)}>
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Create request</h3>
              <Button size="sm" variant="secondary" onClick={() => setNewRequestOpen(false)}>
                Close
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              <div>
                <FieldLabel>Request type</FieldLabel>
                <select
                  value={newRequestForm.requestType}
                  onChange={(event) =>
                    setNewRequestForm((prev) => ({
                      ...prev,
                      requestType: event.target.value as OpsRequestType,
                    }))
                  }
                >
                  {requestTypeOptions.map((entry) => (
                    <option key={entry} value={entry}>
                      {requestTypeLabel(entry)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Priority</FieldLabel>
                <select
                  value={newRequestForm.priority}
                  onChange={(event) =>
                    setNewRequestForm((prev) => ({
                      ...prev,
                      priority: event.target.value as OpsSeverity,
                    }))
                  }
                >
                  {severityOptions.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Track</FieldLabel>
                <select
                  value={newRequestForm.relatedTrack}
                  onChange={(event) =>
                    setNewRequestForm((prev) => ({
                      ...prev,
                      relatedTrack: event.target.value as OpsTrack,
                    }))
                  }
                >
                  <option value="SMS">SMS</option>
                  <option value="Voice">Voice</option>
                </select>
              </div>
              <div>
                <FieldLabel>Company (optional)</FieldLabel>
                <select
                  value={newRequestForm.relatedCompanyId}
                  onChange={(event) => setNewRequestForm((prev) => ({ ...prev, relatedCompanyId: event.target.value }))}
                >
                  <option value="">None</option>
                  {state.companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Related case (optional)</FieldLabel>
                <select
                  value={newRequestForm.relatedCaseId}
                  onChange={(event) => setNewRequestForm((prev) => ({ ...prev, relatedCaseId: event.target.value }))}
                >
                  <option value="">None</option>
                  {state.opsCases.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Destination country</FieldLabel>
                <input
                  value={newRequestForm.destinationCountry}
                  onChange={(event) => setNewRequestForm((prev) => ({ ...prev, destinationCountry: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel>Destination operator</FieldLabel>
                <input
                  value={newRequestForm.destinationOperator}
                  onChange={(event) => setNewRequestForm((prev) => ({ ...prev, destinationOperator: event.target.value }))}
                />
              </div>
              <div className="md:col-span-4">
                <FieldLabel>Comment</FieldLabel>
                <textarea
                  value={newRequestForm.comment}
                  onChange={(event) => setNewRequestForm((prev) => ({ ...prev, comment: event.target.value }))}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setNewRequestOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={createRequestFromForm} disabled={!newRequestForm.destinationCountry.trim()}>
                Create request
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedCase && (
        <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => setSelectedCaseId("")}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Case detail</h3>
              <Button size="sm" variant="secondary" onClick={() => setSelectedCaseId("")}>
                Close
              </Button>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-800">{selectedCase.id}</p>
                <p className="mt-1">{moduleLabel(selectedCase.moduleOrigin)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className={severityBadgeClass(selectedCase.severity)}>{selectedCase.severity}</Badge>
                  <Badge className={caseStatusBadgeClass(selectedCase.status)}>{selectedCase.status}</Badge>
                  <Badge>{selectedCase.relatedTrack}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600">{selectedCase.description}</p>
                <p className="mt-2">Detected: {formatDateTime(selectedCase.detectedAt)}</p>
                <p>Assigned: {state.users.find((user) => user.id === selectedCase.assignedToUserId)?.name ?? "-"}</p>
                {selectedCaseSla && (
                  <>
                    <p className={selectedCaseSla.breached ? "text-rose-700" : ""}>SLA remaining: {formatDurationMs(selectedCaseSla.remainingMs)}</p>
                    <p>Due: {formatDateTime(selectedCaseSla.dueAt)}</p>
                    <p className="font-semibold">Escalation level: L{selectedCaseEscalation}</p>
                  </>
                )}
                {selectedCase.relatedCompanyId && (
                  <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                    <p className="font-semibold text-slate-700">Linked company (read-only)</p>
                    <p>{companyById.get(selectedCase.relatedCompanyId)?.name ?? selectedCase.relatedCompanyId}</p>
                    <Link className="text-[11px] font-semibold text-brand-700 hover:underline" to={`/companies/${selectedCase.relatedCompanyId}`}>
                      Open company
                    </Link>
                  </div>
                )}
              </div>

              <section className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel>Action comment</FieldLabel>
                    <input value={caseActionComment} onChange={(event) => setCaseActionComment(event.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Assign user</FieldLabel>
                    <select value={assignToUserId} onChange={(event) => setAssignToUserId(event.target.value)}>
                      <option value="">Select user</option>
                      {state.users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" className="mt-2" onClick={() => applyCaseAction("ASSIGN")} disabled={!assignToUserId}>
                      Assign
                    </Button>
                  </div>
                  <div>
                    <FieldLabel>Resolution type</FieldLabel>
                    <select
                      value={caseResolutionType}
                      onChange={(event) => setCaseResolutionType(event.target.value as OpsCase["resolutionType"])}
                    >
                      <option value="Fixed">Fixed</option>
                      <option value="FalsePositive">False positive</option>
                      <option value="PartnerIssue">Partner issue</option>
                      <option value="PlannedWork">Planned work</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCase.status === "New" && (
                    <Button size="sm" onClick={() => applyCaseAction("START")}>
                      Start
                    </Button>
                  )}
                  {selectedCase.status === "InProgress" && (
                    <Button size="sm" onClick={() => applyCaseAction("RESOLVE")}>
                      Resolve
                    </Button>
                  )}
                  {(selectedCase.status === "New" || selectedCase.status === "InProgress") && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => applyCaseAction("IGNORE")}>
                        Ignore
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => applyCaseAction("CANCEL")}>
                        Cancel
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => applyCaseAction("COMMENT")}>
                    Add comment
                  </Button>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
                <div className="space-y-2">
                  {caseTimeline.length === 0 ? (
                    <p className="text-xs text-slate-500">No timeline yet.</p>
                  ) : (
                    caseTimeline.map((entry) => (
                      <div key={entry.id} className="rounded-md border border-slate-200 p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-700">{actionLabel(entry.actionType)}</span>
                          <span className="text-[11px] text-slate-500">{formatDateTime(entry.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{state.users.find((user) => user.id === entry.performedByUserId)?.name ?? entry.performedByUserId}</p>
                        {entry.comment && <p className="mt-1 text-slate-600">{entry.comment}</p>}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => setSelectedRequestId("")}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Request detail</h3>
              <Button size="sm" variant="secondary" onClick={() => setSelectedRequestId("")}>
                Close
              </Button>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-800">{requestTypeLabel(selectedRequest.requestType)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className={requestStatusBadgeClass(selectedRequest.status)}>{selectedRequest.status}</Badge>
                  <Badge className={severityBadgeClass(selectedRequest.priority)}>{selectedRequest.priority}</Badge>
                  <Badge>{selectedRequest.relatedTrack}</Badge>
                </div>
                <p className="mt-2">Assigned role: {selectedRequest.assignedToRole}</p>
                <p>
                  Destination: {selectedRequest.destination.country} / {selectedRequest.destination.operator ?? "-"}
                </p>
                <p>Created: {formatDateTime(selectedRequest.createdAt)}</p>
                <p>Updated: {formatDateTime(selectedRequest.updatedAt)}</p>
                <p className="mt-2 text-slate-600">{selectedRequest.comment || "-"}</p>
              </div>

              <section className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</p>
                <div>
                  <FieldLabel>Action comment</FieldLabel>
                  <input value={requestActionComment} onChange={(event) => setRequestActionComment(event.target.value)} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRequest.status === "Draft" && (
                    <Button size="sm" onClick={() => applyRequestAction("SEND")}>
                      Send
                    </Button>
                  )}
                  {selectedRequest.status === "Sent" && (
                    <Button size="sm" onClick={() => applyRequestAction("START")}>
                      Start
                    </Button>
                  )}
                  {(selectedRequest.status === "Sent" || selectedRequest.status === "InProgress") && (
                    <>
                      <Button size="sm" onClick={() => applyRequestAction(requestDoneActionForType(selectedRequest.requestType))}>
                        {actionLabel(requestDoneActionForType(selectedRequest.requestType))}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => applyRequestAction("MARK_FAILED")}>
                        Mark failed
                      </Button>
                    </>
                  )}
                  {!["Done", "Cancelled", "Failed"].includes(selectedRequest.status) && (
                    <Button size="sm" variant="danger" onClick={() => applyRequestAction("CANCELLED")}>
                      CANCELLED
                    </Button>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Response bar timeline</p>
                <div className="space-y-2">
                  {requestTimeline.length === 0 ? (
                    <p className="text-xs text-slate-500">No actions yet.</p>
                  ) : (
                    requestTimeline.map((entry) => (
                      <div key={entry.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                        <p className="font-semibold text-slate-700">
                          {actionLabel(entry.actionType)} ·{" "}
                          {state.users.find((user) => user.id === entry.performedByUserId)?.name ?? entry.performedByUserId} ·{" "}
                          {formatDateTime(entry.timestamp)}
                        </p>
                        {entry.comment && <p className="text-slate-600">{entry.comment}</p>}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

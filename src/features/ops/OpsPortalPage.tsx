import { useMemo, useState } from "react";
import { Badge, Button, Card } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { OpsCase, OpsCaseActionType, OpsMonitoringSignalInput, OpsRequest, OpsTrack } from "../../store/types";
import { NocCaseFeed } from "./components/NocCaseFeed";
import { NocCaseHistoryDrawer } from "./components/NocCaseHistoryDrawer";
import { OpsPortalFilterBar } from "./components/OpsPortalFilterBar";
import { getAvailableActionsForCase } from "./domain/opsPolicies";
import { OpsPortalFilters, OpsPortalScope, selectCaseActions, selectCasesForPortal, selectLastCaseAction } from "./domain/opsSelectors";
import { computeCaseSlaView, isOpenCaseStatus } from "./domain/opsSla";
import { OpsPortalConfig } from "./portalConfigs";
import { createDemoTrafficAdapter } from "./trafficAdapter";

const TRAFFIC_RELATED_CATEGORIES = new Set(["NEW_LOST_TRAFFIC", "TRAFFIC_COMPARISON", "FAILED_SMS_CALL"]);
const ROUTING_RESOLUTION_TYPES = new Set(["ROUTING_CHANGED", "ROUTING_INFORMED"]);

function resolveDefaultScope(config: OpsPortalConfig): OpsPortalScope {
  if (config.defaultScope) return config.defaultScope;
  if (config.caseScope === "mine" || config.requestScope === "mine") return "MINE";
  return "ALL";
}

function isRequestOpen(status: OpsRequest["status"]): boolean {
  return status !== "Done" && status !== "Cancelled" && status !== "Failed";
}

function isRoutingRelatedRequest(request: OpsRequest): boolean {
  return request.assignedToRole === "Routing" || request.requestType === "RoutingRequest" || request.requestType === "InterconnectionRequest";
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function NocPortalPage({ config }: { config: OpsPortalConfig }) {
  const state = useAppStore();
  const defaultScope = resolveDefaultScope(config);
  const [filters, setFilters] = useState<OpsPortalFilters>({
    track: config.defaultTrack,
    severity: "ANY",
    category: "ANY",
    status: "ALL",
    search: "",
  });
  const [scope, setScope] = useState<OpsPortalScope>(defaultScope);
  const [selectedHistoryCase, setSelectedHistoryCase] = useState<OpsCase | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const showTrackFilter = config.showTrackFilter ?? config.defaultTrack === "ANY";
  const showScopeFilter = config.showScopeFilter ?? false;
  const showRequestsSection = config.showRequestsSection ?? config.showRequests ?? Boolean(config.requestRoleFocus?.length);
  const showSignalsSection = config.showSignalsSection ?? config.showSignals ?? false;
  const activeScope = showScopeFilter ? scope : defaultScope;
  const activeTrack = filters.track ?? config.defaultTrack;

  const filteredCases = useMemo(
    () =>
      selectCasesForPortal(state, config.portalId, filters, {
        includedCategories: config.includedCategories,
        scope: activeScope,
      }),
    [activeScope, config.includedCategories, config.portalId, filters, state],
  );

  const portalCases = useMemo(
    () =>
      selectCasesForPortal(
        state,
        config.portalId,
        {
          track: activeTrack,
          severity: "ANY",
          category: "ANY",
          status: "ALL",
          search: "",
        },
        {
          includedCategories: config.includedCategories,
          scope: activeScope,
        },
      ),
    [activeScope, activeTrack, config.includedCategories, config.portalId, state],
  );

  const caseSlaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeCaseSlaView>>();
    filteredCases.forEach((caseRow) => {
      map.set(caseRow.id, computeCaseSlaView(caseRow));
    });
    return map;
  }, [filteredCases]);

  const portalSlaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeCaseSlaView>>();
    portalCases.forEach((caseRow) => {
      map.set(caseRow.id, computeCaseSlaView(caseRow));
    });
    return map;
  }, [portalCases]);

  const openUrgentCount = portalCases.filter((caseRow) => isOpenCaseStatus(caseRow.status) && caseRow.severity === "URGENT").length;
  const overdueCount = portalCases.filter((caseRow) => {
    if (!isOpenCaseStatus(caseRow.status)) return false;
    return portalSlaMap.get(caseRow.id)?.slaState === "OVERDUE";
  }).length;
  const nearDeadlineCount = portalCases.filter((caseRow) => {
    if (!isOpenCaseStatus(caseRow.status)) return false;
    return portalSlaMap.get(caseRow.id)?.slaState === "NEAR_DEADLINE";
  }).length;

  const activeUserName = state.users.find((user) => user.id === state.activeUserId)?.name;
  const caseLastActionById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof selectLastCaseAction>>();
    portalCases.forEach((caseRow) => {
      map.set(caseRow.id, selectLastCaseAction(state, caseRow.id));
    });
    return map;
  }, [portalCases, state]);
  const filteredLastActionById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof selectLastCaseAction>>();
    filteredCases.forEach((caseRow) => {
      map.set(caseRow.id, selectLastCaseAction(state, caseRow.id));
    });
    return map;
  }, [filteredCases, state]);

  const routingTouchedOpenCount = portalCases.filter((caseRow) => {
    if (!isOpenCaseStatus(caseRow.status)) return false;
    const resolutionType = caseLastActionById.get(caseRow.id)?.resolutionType ?? caseRow.resolutionType;
    return Boolean(resolutionType && ROUTING_RESOLUTION_TYPES.has(resolutionType));
  }).length;
  const routingTrafficHotCount = portalCases.filter((caseRow) => {
    if (!isOpenCaseStatus(caseRow.status)) return false;
    if (caseRow.severity !== "URGENT" && caseRow.severity !== "HIGH") return false;
    return TRAFFIC_RELATED_CATEGORIES.has(caseRow.category);
  }).length;

  const mineCases = useMemo(
    () =>
      selectCasesForPortal(
        state,
        config.portalId,
        {
          track: activeTrack,
          severity: "ANY",
          category: "ANY",
          status: "ALL",
          search: "",
        },
        {
          includedCategories: config.includedCategories,
          scope: "MINE",
        },
      ),
    [activeTrack, config.includedCategories, config.portalId, state],
  );
  const mineOpenCount = mineCases.filter((caseRow) => isOpenCaseStatus(caseRow.status)).length;
  const mineUrgentHighCount = mineCases.filter(
    (caseRow) => isOpenCaseStatus(caseRow.status) && (caseRow.severity === "URGENT" || caseRow.severity === "HIGH"),
  ).length;
  const amInformedCount = mineCases.filter((caseRow) => {
    const resolutionType = selectLastCaseAction(state, caseRow.id)?.resolutionType ?? caseRow.resolutionType;
    return resolutionType === "ACCOUNT_MANAGER_INFORMED";
  }).length;
  const accountManagersOpenCount = filteredCases.filter((caseRow) => isOpenCaseStatus(caseRow.status)).length;
  const accountManagersUrgentHighCount = filteredCases.filter(
    (caseRow) => isOpenCaseStatus(caseRow.status) && (caseRow.severity === "URGENT" || caseRow.severity === "HIGH"),
  ).length;
  const accountManagersInformedCount = filteredCases.filter((caseRow) => {
    const resolutionType = filteredLastActionById.get(caseRow.id)?.resolutionType ?? caseRow.resolutionType;
    return resolutionType === "ACCOUNT_MANAGER_INFORMED";
  }).length;
  const scopeLabel = activeScope === "MINE" ? "Mine" : "All";

  const visibleRequests = useMemo(() => {
    const requestScope = showScopeFilter ? scope : config.requestScope === "mine" ? "MINE" : "ALL";
    return state.opsRequests
      .filter((request) => {
        if (activeTrack !== "ANY" && request.relatedTrack !== activeTrack) return false;
        if (config.requestRoleFocus && config.requestRoleFocus.length > 0 && !config.requestRoleFocus.includes(request.assignedToRole)) {
          return false;
        }
        if (requestScope === "MINE" && request.createdByUserId !== state.activeUserId) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [activeTrack, config.requestRoleFocus, config.requestScope, scope, showScopeFilter, state.activeUserId, state.opsRequests]);

  const routingOpenRequests = useMemo(
    () =>
      visibleRequests
        .filter((request) => isRoutingRelatedRequest(request) && isRequestOpen(request.status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [visibleRequests],
  );

  const visibleSignals = useMemo(() => {
    return state.opsMonitoringSignals
      .filter((signal) => {
        if (activeTrack !== "ANY" && signal.track !== activeTrack) return false;
        if (config.includedCategories && config.includedCategories.length > 0 && !config.includedCategories.includes(signal.category)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
      .slice(0, 25);
  }, [activeTrack, config.includedCategories, state.opsMonitoringSignals]);

  function applyCaseAction(caseId: string, input: { actionType: OpsCaseActionType; comment?: string; ttNumber?: string }) {
    return state.applyOpsCaseAction(caseId, input.actionType, {
      comment: input.comment,
      ttNumber: input.ttNumber,
      doneByUserId: state.activeUserId,
    });
  }

  async function syncSignals() {
    setSyncBusy(true);
    setSyncMessage("Syncing...");
    try {
      const tracksToSync: OpsTrack[] = config.defaultTrack === "ANY" ? ["SMS", "VOICE"] : [config.defaultTrack];
      const signals: OpsMonitoringSignalInput[] = [];
      for (const track of tracksToSync) {
        const adapter = createDemoTrafficAdapter(track);
        signals.push(
          ...(await adapter.fetchProviderIssues()),
          ...(await adapter.fetchLossAlerts()),
          ...(await adapter.fetchTrafficComparison()),
          ...(await adapter.fetchTestResults()),
        );
      }
      const created = state.ingestOpsMonitoringSignals(signals, { autoCreate: true });
      setSyncMessage(`${created} signal(s) ingested across ${tracksToSync.join(" + ")}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed.";
      setSyncMessage(message);
    } finally {
      setSyncBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={config.title}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={syncSignals} disabled={syncBusy}>
              {syncBusy ? "Refreshing..." : "Refresh signals"}
            </Button>
          </div>
        }
      >
        {config.subtitle && <p className="text-xs text-slate-600">{config.subtitle}</p>}
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {config.portalId === "routing-noc" ? (
            <>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Routing-touched open</p>
                <p className="text-lg font-semibold text-sky-700">{routingTouchedOpenCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Urgent/High traffic open</p>
                <p className="text-lg font-semibold text-rose-700">{routingTrafficHotCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Overdue</p>
                <p className="text-lg font-semibold text-rose-700">{overdueCount}</p>
              </div>
            </>
          ) : config.portalId === "am-noc-routing" ? (
            <>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Open cases (mine)</p>
                <p className="text-lg font-semibold text-slate-800">{mineOpenCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">AM informed</p>
                <p className="text-lg font-semibold text-sky-700">{amInformedCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Urgent/High (mine)</p>
                <p className="text-lg font-semibold text-rose-700">{mineUrgentHighCount}</p>
              </div>
            </>
          ) : config.portalId === "account-managers" ? (
            <>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Open ({scopeLabel})</p>
                <p className="text-lg font-semibold text-slate-800">{accountManagersOpenCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">AM informed ({scopeLabel})</p>
                <p className="text-lg font-semibold text-sky-700">{accountManagersInformedCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Urgent/High open ({scopeLabel})</p>
                <p className="text-lg font-semibold text-rose-700">{accountManagersUrgentHighCount}</p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Open urgent cases</p>
                <p className="text-lg font-semibold text-rose-700">{openUrgentCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Overdue</p>
                <p className="text-lg font-semibold text-rose-700">{overdueCount}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Near deadline</p>
                <p className="text-lg font-semibold text-amber-700">{nearDeadlineCount}</p>
              </div>
            </>
          )}
        </div>
        {syncMessage && <p className="mt-2 text-[11px] text-slate-500">{syncMessage}</p>}
      </Card>

      <Card title="Case feed">
        <OpsPortalFilterBar
          filters={filters}
          onChange={setFilters}
          showTrack={showTrackFilter}
          defaultTrack={config.defaultTrack}
          showScope={showScopeFilter}
          scope={scope}
          onScopeChange={setScope}
          categoryOptions={config.includedCategories}
        />
        <div className="mt-3">
          <NocCaseFeed
            rows={filteredCases}
            getSla={(caseRow) => caseSlaMap.get(caseRow.id) ?? computeCaseSlaView(caseRow)}
            getAvailableActions={getAvailableActionsForCase}
            getLastAction={(caseRow) => selectLastCaseAction(state, caseRow.id)}
            getActorName={(userId) => state.users.find((user) => user.id === userId)?.name}
            currentActorName={activeUserName}
            onApplyAction={applyCaseAction}
            onOpenHistory={(caseRow) => setSelectedHistoryCase(caseRow)}
          />
        </div>
      </Card>

      {showRequestsSection && (
        <Card title={config.portalId === "routing-noc" ? "Open routing requests" : "Requests"}>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  {config.portalId === "routing-noc" && <th>Related case</th>}
                  <th>Status</th>
                  {config.portalId === "routing-noc" ? (
                    <th>Created</th>
                  ) : (
                    <>
                      <th>Priority</th>
                      <th>Role</th>
                      <th>Track</th>
                      <th>Updated</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(config.portalId === "routing-noc" ? routingOpenRequests : visibleRequests).map((request) => (
                  <tr key={request.id}>
                    <td>{request.requestType}</td>
                    {config.portalId === "routing-noc" && <td>{request.relatedCaseId ?? "-"}</td>}
                    <td>{request.status}</td>
                    {config.portalId === "routing-noc" ? (
                      <td>{formatDateTime(request.createdAt)}</td>
                    ) : (
                      <>
                        <td>{request.priority}</td>
                        <td>{request.assignedToRole}</td>
                        <td>{request.relatedTrack}</td>
                        <td>{formatDateTime(request.updatedAt)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {config.portalId === "routing-noc" && routingOpenRequests.length === 0 && (
              <p className="pt-2 text-xs text-slate-500">No open routing-related requests.</p>
            )}
          </div>
        </Card>
      )}

      {showSignalsSection && (
        <Card title="Recent signals">
          <div className="space-y-2">
            {visibleSignals.map((signal) => (
              <div key={signal.id} className="rounded-md border border-slate-200 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">{signal.moduleOrigin.replace(/_/g, " ")}</p>
                  <Badge>{signal.severity}</Badge>
                </div>
                <p className="text-xs text-slate-600">{signal.description}</p>
                <p className="text-[11px] text-slate-500">{formatDateTime(signal.metadata.alertTime ?? signal.detectedAt)}</p>
              </div>
            ))}
            {visibleSignals.length === 0 && <p className="text-xs text-slate-500">No signals for current filters.</p>}
          </div>
        </Card>
      )}

      {selectedHistoryCase && (
        <NocCaseHistoryDrawer
          caseRow={selectedHistoryCase}
          actions={selectCaseActions(state, selectedHistoryCase.id)}
          linkedSignals={state.opsMonitoringSignals.filter((signal) => selectedHistoryCase.linkedSignalIds.includes(signal.id))}
          users={state.users}
          onClose={() => setSelectedHistoryCase(null)}
        />
      )}
    </div>
  );
}

export const OpsPortalPage = NocPortalPage;

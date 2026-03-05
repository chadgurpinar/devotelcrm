import { useMemo, useState } from "react";
import { Card } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { OpsCase } from "../../store/types";
import { NocCaseFeed } from "./components/NocCaseFeed";
import { NocCaseHistoryDrawer } from "./components/NocCaseHistoryDrawer";
import { OpsPortalFilterBar } from "./components/OpsPortalFilterBar";
import { computeOpsPerformanceMetrics } from "./domain/opsMetrics";
import { OpsPortalFilters, selectCaseActions, selectCasesForPortal, selectLastCaseAction } from "./domain/opsSelectors";
import { computeCaseSlaView, formatDurationMs } from "./domain/opsSla";
import { PERFORMANCE_AUDIT_PORTAL_CONFIG } from "./portalConfigs";

function formatDuration(valueMs: number | null): string {
  if (valueMs === null) return "-";
  return formatDurationMs(valueMs);
}

function closedAtIso(caseRow: OpsCase): string {
  return caseRow.resolvedAt ?? caseRow.ignoredAt ?? caseRow.cancelledAt ?? caseRow.updatedAt ?? caseRow.createdAt;
}

export function NocPerformanceAuditPage() {
  const state = useAppStore();
  const config = PERFORMANCE_AUDIT_PORTAL_CONFIG;
  const [filters, setFilters] = useState<OpsPortalFilters>({
    track: config.defaultTrack,
    severity: "ANY",
    category: "ANY",
    status: "ALL",
    search: "",
  });
  const [selectedHistoryCase, setSelectedHistoryCase] = useState<OpsCase | null>(null);

  const cases = useMemo(
    () =>
      selectCasesForPortal(state, config.portalId, filters, {
        includedCategories: config.includedCategories,
        scope: "ALL",
      }),
    [config.includedCategories, config.portalId, filters, state],
  );

  const metrics = useMemo(() => computeOpsPerformanceMetrics(state, cases), [cases, state]);

  const recentClosedCases = useMemo(
    () =>
      cases
        .filter((caseRow) => caseRow.status === "RESOLVED" || caseRow.status === "IGNORED" || caseRow.status === "CANCELLED")
        .sort((left, right) => closedAtIso(right).localeCompare(closedAtIso(left)))
        .slice(0, 10),
    [cases],
  );

  return (
    <div className="space-y-4">
      <Card title={config.title}>
        {config.subtitle && <p className="text-xs text-slate-600">{config.subtitle}</p>}
        <div className="mt-3">
          <OpsPortalFilterBar
            filters={filters}
            onChange={setFilters}
            showTrack={config.showTrackFilter ?? true}
            defaultTrack={config.defaultTrack}
            categoryOptions={config.includedCategories}
          />
        </div>
      </Card>

      <Card title="Performance overview">
        <div className="grid gap-2 md:grid-cols-5">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total cases</p>
            <p className="text-lg font-semibold text-slate-800">{metrics.totalCases}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">SLA compliance</p>
            <p className="text-lg font-semibold text-emerald-700">{metrics.slaComplianceRate}%</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">SLA breached</p>
            <p className="text-lg font-semibold text-rose-700">{metrics.casesBreachedSla}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Avg first action</p>
            <p className="text-lg font-semibold text-slate-800">{formatDuration(metrics.avgTimeToFirstActionMs)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Avg disposition</p>
            <p className="text-lg font-semibold text-slate-800">{formatDuration(metrics.avgTimeToDispositionMs)}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Severity breakdown">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Total</th>
                  <th>Breached</th>
                  <th>Breach rate</th>
                </tr>
              </thead>
              <tbody>
                {metrics.severityStats.map((row) => (
                  <tr key={row.severity}>
                    <td>{row.severity}</td>
                    <td>{row.total}</td>
                    <td>{row.breached}</td>
                    <td>{row.breachRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="TT and routing behavior">
          <div className="space-y-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">TT raised count</p>
              <p className="text-lg font-semibold text-slate-800">{metrics.countTtRaised}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Avg time to TT raised</p>
              <p className="text-lg font-semibold text-slate-800">{formatDuration(metrics.avgTimeToTtRaisedMs)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Routing touched cases</p>
              <p className="text-lg font-semibold text-sky-700">{metrics.routingTouchCount}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Within SLA</p>
              <p className="text-lg font-semibold text-emerald-700">{metrics.casesWithinSla}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recent closed cases (read-only)">
        <p className="text-xs text-slate-500">Latest resolved/ignored/cancelled cases for audit context. Use history to inspect action timelines.</p>
        <div className="mt-3">
          <NocCaseFeed
            rows={recentClosedCases}
            getSla={(caseRow) => computeCaseSlaView(caseRow)}
            getAvailableActions={() => []}
            getLastAction={(caseRow) => selectLastCaseAction(state, caseRow.id)}
            getActorName={(userId) => state.users.find((user) => user.id === userId)?.name}
            currentActorName={state.users.find((user) => user.id === state.activeUserId)?.name}
            onApplyAction={() => ({ ok: false, message: "Read-only audit view." })}
            onOpenHistory={(caseRow) => setSelectedHistoryCase(caseRow)}
          />
        </div>
      </Card>

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

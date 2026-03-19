import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Plus, Radio, Phone, Shield } from "lucide-react";
import { Badge, Button, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import { getUserName } from "../../../store/selectors";
import {
  NocCase,
  NocCaseAction,
  NocCaseStatus,
  NocCaseType,
  NocPortalType,
  NocSeverity,
} from "../../../store/types";
import { UiPageHeader } from "../../../ui/UiPageHeader";
import { UiKpiCard } from "../../../ui/UiKpiCard";
import { NocNewCaseCard } from "./NocNewCaseCard";

const ALL_CASE_TYPES: NocCaseType[] = [
  "ProviderIssue",
  "Losses",
  "NewLostTraffic",
  "TrafficComparison",
  "ScheduleTest",
  "FailedSmsCall",
];

const SEVERITY_PRIORITY: Record<NocSeverity, number> = {
  URGENT: 5,
  HIGH: 4,
  MEDIUM: 3,
  INCREASE: 2,
  DECREASE: 1,
};

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function caseTypeLabel(ct: NocCaseType, portalType: NocPortalType): string {
  switch (ct) {
    case "ProviderIssue": return "Provider Issue";
    case "Losses": return "Losses";
    case "NewLostTraffic": return "New & Lost Traffic";
    case "TrafficComparison": return "Traffic Comparison";
    case "ScheduleTest": return "Schedule Test";
    case "FailedSmsCall": return portalType === "SMS" ? "Failed SMS" : "Failed Calls";
  }
}

function dominantSeverity(cases: NocCase[]): NocSeverity | null {
  if (cases.length === 0) return null;
  let best: NocSeverity = cases[0].severity;
  for (const c of cases) {
    if (SEVERITY_PRIORITY[c.severity] > SEVERITY_PRIORITY[best]) best = c.severity;
  }
  return best;
}

function severityBarColor(sev: NocSeverity): string {
  if (sev === "URGENT") return "bg-rose-500";
  if (sev === "HIGH") return "bg-amber-500";
  return "bg-blue-400";
}

function severityBadgeClass(sev: NocSeverity): string {
  if (sev === "URGENT") return "bg-rose-50 text-rose-700";
  if (sev === "HIGH") return "bg-amber-50 text-amber-700";
  if (sev === "DECREASE") return "bg-rose-50 text-rose-600";
  if (sev === "INCREASE") return "bg-emerald-50 text-emerald-700";
  return "bg-sky-50 text-sky-700";
}

function statusBadgeClass(s: NocCaseStatus): string {
  if (s === "Open") return "bg-blue-50 text-blue-700";
  return "bg-emerald-50 text-emerald-700";
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NocPortalShellProps {
  portalType: NocPortalType;
}

export default function NocPortalShell({ portalType }: NocPortalShellProps) {
  const state = useAppStore();
  const [activeCategory, setActiveCategory] = useState<NocCaseType>("ProviderIssue");
  const [filterStatus, setFilterStatus] = useState<"All" | NocCaseStatus>("All");
  const [filterSeverity, setFilterSeverity] = useState<"All" | NocSeverity>("All");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSeverity, setAddSeverity] = useState<NocSeverity>("MEDIUM");
  const [addName, setAddName] = useState("");

  const activeUserName = useMemo(() => getUserName(state, state.activeUserId), [state]);

  const portalCases = useMemo(
    () => state.nocCases.filter((c) => c.portalType === portalType),
    [state.nocCases, portalType],
  );

  const categorySummaries = useMemo(
    () =>
      ALL_CASE_TYPES.map((ct) => {
        const open = portalCases.filter((c) => c.caseType === ct && c.status === "Open");
        return { caseType: ct, openCount: open.length, dominant: dominantSeverity(open) };
      }),
    [portalCases],
  );

  const activeCases = useMemo(() => {
    let dataset = portalCases.filter((c) => c.caseType === activeCategory);
    if (filterStatus !== "All") dataset = dataset.filter((c) => c.status === filterStatus);
    if (filterSeverity !== "All") dataset = dataset.filter((c) => c.severity === filterSeverity);
    return dataset.sort((a, b) => {
      const sp = SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity];
      if (sp !== 0) return sp;
      if (a.status !== b.status) return a.status === "Open" ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [portalCases, activeCategory, filterStatus, filterSeverity]);

  const totalCount = portalCases.length;
  const openCount = portalCases.filter((c) => c.status === "Open").length;
  const actionedCount = portalCases.filter((c) => c.status === "Actioned").length;
  const urgentCount = portalCases.filter((c) => c.status === "Open" && c.severity === "URGENT").length;

  function handleAddTestCase() {
    const isProvider = activeCategory === "ProviderIssue";
    state.addNocCase({
      portalType,
      caseType: activeCategory,
      severity: addSeverity,
      ...(isProvider ? { providerName: addName || "Test Provider" } : { customerName: addName || "Test Customer" }),
      ...(portalType === "SMS" ? { smsCount: 10000, dlrRate: 55 } : { callCount: 5000, asrRate: 40 }),
    });
    setAddName("");
    setAddModalOpen(false);
  }

  function handleCaseAction(
    id: string,
    action: NocCaseAction,
    payload: { ttNumber?: string; comment?: string; actionedBy: string },
  ) {
    state.actionNocCase(id, action, payload);
  }

  const PortalIcon = portalType === "SMS" ? Radio : Phone;

  return (
    <div className="space-y-5">
      <UiPageHeader
        title={`${portalType} NOC Portal`}
        subtitle={`${totalCount} cases · ${openCount} open`}
        actions={
          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                {urgentCount} urgent
              </span>
            )}
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" /> New Case
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiKpiCard label="Total Cases" value={totalCount} icon={<PortalIcon className="h-5 w-5" />} />
        <UiKpiCard label="Open" value={openCount} className="border-rose-200 bg-rose-50/40" icon={<AlertTriangle className="h-5 w-5 text-rose-400" />} />
        <UiKpiCard label="In Progress" value={portalCases.filter((c) => c.status === "Open" && c.severity !== "URGENT").length} className="border-amber-200 bg-amber-50/40" />
        <UiKpiCard label="Actioned" value={actionedCount} className="border-emerald-200 bg-emerald-50/40" icon={<Shield className="h-5 w-5 text-emerald-400" />} />
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {categorySummaries.map((s) => {
          const selected = s.caseType === activeCategory;
          const hasUrgent = s.dominant === "URGENT" && s.openCount > 0;
          return (
            <button
              key={s.caseType}
              type="button"
              onClick={() => setActiveCategory(s.caseType)}
              className={`rounded-xl border bg-white p-3.5 text-left shadow-sm transition hover:shadow-md ${
                selected ? "ring-2 ring-indigo-500 border-indigo-500" : "border-gray-200"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {caseTypeLabel(s.caseType, portalType)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`text-lg font-bold ${hasUrgent ? "text-rose-600" : s.openCount > 0 ? "text-gray-900" : "text-gray-400"}`}>
                  {s.openCount}
                </span>
                {hasUrgent && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter bar + case list */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">Status</label>
              <div className="flex gap-1">
                {(["All", "Open", "Actioned"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      filterStatus === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">Severity</label>
              <div className="flex gap-1">
                {(["All", "URGENT", "HIGH", "MEDIUM"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSeverity(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      filterSeverity === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="ml-auto text-xs text-gray-500">
              {activeCases.length} case{activeCases.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {activeCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <PortalIcon className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No cases found for this filter</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeCases.map((c) => {
              const isUrgent = c.severity === "URGENT" && c.status === "Open";
              const name = c.providerName ?? c.customerName ?? c.destination ?? "—";
              return (
                <div
                  key={c.id}
                  className={`flex items-stretch transition-colors hover:bg-gray-50/80 ${isUrgent ? "bg-rose-50/30" : ""}`}
                >
                  {/* Severity bar */}
                  <div className={`w-1 flex-shrink-0 ${severityBarColor(c.severity)}`} />

                  <div className="flex flex-1 items-center gap-4 px-5 py-3.5">
                    {/* Case info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono text-gray-400">{c.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityBadgeClass(c.severity)}`}>
                          {c.severity}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {caseTypeLabel(c.caseType, portalType)}
                        {c.smsCount ? ` · ${c.smsCount.toLocaleString()} SMS` : ""}
                        {c.callCount ? ` · ${c.callCount.toLocaleString()} calls` : ""}
                        {c.dlrRate != null ? ` · DLR ${c.dlrRate}%` : ""}
                        {c.asrRate != null ? ` · ASR ${c.asrRate}%` : ""}
                        {c.lossAmount ? ` · $${c.lossAmount.toLocaleString()}` : ""}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                      {c.actionedBy && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">
                            {c.actionedBy.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <span>{c.actionedBy}</span>
                        </div>
                      )}
                      <span>{timeAgo(c.createdAt)}</span>
                    </div>

                    <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded case cards (preserve existing NocNewCaseCard for actions) */}
      <div className="space-y-3">
        {activeCases.filter((c) => c.status === "Open").slice(0, 5).map((c) => (
          <NocNewCaseCard
            key={`action-${c.id}`}
            nocCase={c}
            portalType={portalType}
            activeUserName={activeUserName}
            onAction={handleCaseAction}
          />
        ))}
      </div>

      {/* Add test case modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setAddModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-base font-semibold text-gray-800">
              Add Test Case — {portalType} / {caseTypeLabel(activeCategory, portalType)}
            </h3>
            <div className="space-y-3">
              <div>
                <FieldLabel>Severity</FieldLabel>
                <select className={inputCls} value={addSeverity} onChange={(e) => setAddSeverity(e.target.value as NocSeverity)}>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
              <div>
                <FieldLabel>{activeCategory === "ProviderIssue" ? "Provider Name" : "Customer Name"}</FieldLabel>
                <input
                  className={inputCls}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder={activeCategory === "ProviderIssue" ? "e.g. Turkcell" : "e.g. Vodafone DE"}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddTestCase}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

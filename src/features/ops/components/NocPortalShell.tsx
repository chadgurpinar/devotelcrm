import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../../components/ui";
import { useAppStore } from "../../../store/db";
import {
  NocCase,
  NocCaseAction,
  NocCaseStatus,
  NocCaseType,
  NocPortalType,
  NocSeverity,
} from "../../../store/types";

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

const ACTION_OPTIONS: NocCaseAction[] = [
  "TT_RAISED",
  "IGNORED",
  "CHECKED_NOISSUE",
  "ROUTING_CHANGED",
  "AC_MNG_INFORMED",
  "ROUTING_INFORMED",
];

const ACTION_LABELS: Record<NocCaseAction, string> = {
  TT_RAISED: "TT Raised",
  IGNORED: "Ignored",
  CHECKED_NOISSUE: "Checked — No Issue",
  ROUTING_CHANGED: "Routing Changed",
  AC_MNG_INFORMED: "AC Manager Informed",
  ROUTING_INFORMED: "Routing Informed",
};

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

function severityBadge(sev: NocSeverity | null, count: number) {
  if (sev === null || count === 0)
    return <Badge className="bg-emerald-100 text-emerald-700">✓ 0</Badge>;
  if (sev === "URGENT")
    return <Badge className="bg-rose-100 text-rose-700">🔴 {count}</Badge>;
  if (sev === "HIGH")
    return <Badge className="bg-amber-100 text-amber-700">🟠 {count}</Badge>;
  if (sev === "DECREASE")
    return <Badge className="bg-rose-100 text-rose-700">↓ {count}</Badge>;
  if (sev === "INCREASE")
    return <Badge className="bg-amber-100 text-amber-700">↑ {count}</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700">🟢 {count}</Badge>;
}

function severityColor(sev: NocSeverity): string {
  if (sev === "URGENT") return "bg-rose-100 text-rose-700";
  if (sev === "HIGH") return "bg-amber-100 text-amber-700";
  if (sev === "DECREASE") return "bg-rose-100 text-rose-700";
  if (sev === "INCREASE") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
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

  const [actionCaseId, setActionCaseId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<NocCaseAction>("TT_RAISED");
  const [actionTtNumber, setActionTtNumber] = useState("");
  const [actionComment, setActionComment] = useState("");
  const [actionedBy, setActionedBy] = useState("");

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
      if (a.status !== b.status) return a.status === "Open" ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [portalCases, activeCategory, filterStatus, filterSeverity]);

  const totalCount = portalCases.filter((c) => c.caseType === activeCategory).length;
  const openCount = portalCases.filter((c) => c.caseType === activeCategory && c.status === "Open").length;
  const actionedCount = totalCount - openCount;

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

  function handleAction(caseId: string) {
    if (!actionedBy.trim()) return;
    state.actionNocCase(caseId, actionType, {
      ttNumber: actionType === "TT_RAISED" ? actionTtNumber.trim() || undefined : undefined,
      comment: actionComment.trim() || undefined,
      actionedBy: actionedBy.trim(),
    });
    setActionCaseId(null);
    setActionComment("");
    setActionTtNumber("");
    setActionedBy("");
  }

  return (
    <div className="space-y-4">
      {/* B2 — Category summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {categorySummaries.map((s) => {
          const selected = s.caseType === activeCategory;
          return (
            <button
              key={s.caseType}
              type="button"
              onClick={() => setActiveCategory(s.caseType)}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
                selected ? "ring-2 ring-brand-500 border-brand-500" : "border-slate-200"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {caseTypeLabel(s.caseType, portalType)}
              </p>
              <div className="mt-2">{severityBadge(s.dominant, s.openCount)}</div>
            </button>
          );
        })}
      </div>

      {/* B3 — Active category header + filters */}
      <Card
        title={`${portalType} NOC — ${caseTypeLabel(activeCategory, portalType)}`}
        actions={
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            + Add Test Case
          </Button>
        }
      >
        <p className="mb-3 text-xs text-slate-500">
          {totalCount} cases | {openCount} open | {actionedCount} actioned
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div>
            <FieldLabel>Show</FieldLabel>
            <div className="flex gap-1">
              {(["All", "Open", "Actioned"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={filterStatus === s ? "primary" : "secondary"}
                  onClick={() => setFilterStatus(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Severity</FieldLabel>
            <div className="flex gap-1">
              {(["All", "URGENT", "HIGH", "MEDIUM"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={filterSeverity === s ? "primary" : "secondary"}
                  onClick={() => setFilterSeverity(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* B4 — Case list */}
        {activeCases.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No cases found for this filter.</p>
        ) : (
          <div className="space-y-3">
            {activeCases.map((c) => (
              <article
                key={c.id}
                className={`rounded-xl border p-4 shadow-sm transition ${
                  c.status === "Open" ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={severityColor(c.severity)}>{c.severity}</Badge>
                      <Badge className={c.status === "Open" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}>
                        {c.status}
                      </Badge>
                      <span className="text-[11px] text-slate-400">{timeAgo(c.createdAt)}</span>
                    </div>
                    <div className="mt-2 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
                      {c.providerName && (
                        <p>
                          <span className="font-medium text-slate-500">Provider:</span> {c.providerName}
                        </p>
                      )}
                      {c.customerName && (
                        <p>
                          <span className="font-medium text-slate-500">Customer:</span> {c.customerName}
                        </p>
                      )}
                      {c.destination && (
                        <p>
                          <span className="font-medium text-slate-500">Destination:</span> {c.destination}
                        </p>
                      )}
                      {c.smsCount != null && (
                        <p>
                          <span className="font-medium text-slate-500">SMS:</span> {c.smsCount.toLocaleString()}
                        </p>
                      )}
                      {c.callCount != null && (
                        <p>
                          <span className="font-medium text-slate-500">Calls:</span> {c.callCount.toLocaleString()}
                        </p>
                      )}
                      {c.dlrRate != null && (
                        <p>
                          <span className="font-medium text-slate-500">DLR%:</span>{" "}
                          <span className={c.dlrRate < 70 ? "font-semibold text-rose-600" : ""}>{c.dlrRate}%</span>
                        </p>
                      )}
                      {c.asrRate != null && (
                        <p>
                          <span className="font-medium text-slate-500">ASR%:</span>{" "}
                          <span className={c.asrRate < 50 ? "font-semibold text-rose-600" : ""}>{c.asrRate}%</span>
                        </p>
                      )}
                      {c.lossAmount != null && (
                        <p>
                          <span className="font-medium text-slate-500">Loss:</span>{" "}
                          <span className="font-semibold text-rose-600">${c.lossAmount.toLocaleString()}</span>
                        </p>
                      )}
                      {c.attemptCount != null && (
                        <p>
                          <span className="font-medium text-slate-500">Attempts:</span> {c.attemptCount.toLocaleString()}
                        </p>
                      )}
                      {c.testResult && (
                        <p>
                          <span className="font-medium text-slate-500">Test:</span>{" "}
                          <span className={c.testResult === "FAILED" || c.testResult === "TIMEOUT" ? "font-semibold text-rose-600" : ""}>
                            {c.testResult}
                          </span>
                        </p>
                      )}
                      {c.trafficDirection && (
                        <p>
                          <span className="font-medium text-slate-500">Traffic:</span>{" "}
                          <span className={c.trafficDirection === "DECREASE" ? "text-rose-600" : "text-emerald-600"}>
                            {c.trafficDirection} {c.trafficChangePercent != null ? `${c.trafficChangePercent}%` : ""}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {c.status === "Actioned" && c.action && (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <p>
                      <span className="font-semibold">{ACTION_LABELS[c.action]}</span>
                      {c.ttNumber && <> · TT: {c.ttNumber}</>}
                      {c.actionedBy && <> · by {c.actionedBy}</>}
                      {c.actionedAt && <> · {formatDateTime(c.actionedAt)}</>}
                    </p>
                    {c.comment && <p className="mt-1 text-slate-600">{c.comment}</p>}
                  </div>
                )}

                {c.status === "Open" && (
                  <div className="mt-3">
                    {actionCaseId === c.id ? (
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
                        <div className="grid gap-2 md:grid-cols-4">
                          <div>
                            <FieldLabel>Action</FieldLabel>
                            <select value={actionType} onChange={(e) => setActionType(e.target.value as NocCaseAction)}>
                              {ACTION_OPTIONS.map((a) => (
                                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                              ))}
                            </select>
                          </div>
                          {actionType === "TT_RAISED" && (
                            <div>
                              <FieldLabel>TT Number</FieldLabel>
                              <input value={actionTtNumber} onChange={(e) => setActionTtNumber(e.target.value)} placeholder="TT-2026-..." />
                            </div>
                          )}
                          <div>
                            <FieldLabel>Actioned by</FieldLabel>
                            <input value={actionedBy} onChange={(e) => setActionedBy(e.target.value)} placeholder="Your name" />
                          </div>
                          <div>
                            <FieldLabel>Comment</FieldLabel>
                            <input value={actionComment} onChange={(e) => setActionComment(e.target.value)} placeholder="Optional note" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAction(c.id)} disabled={!actionedBy.trim()}>
                            Submit
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setActionCaseId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setActionCaseId(c.id)}>
                        Take Action
                      </Button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Card>

      {/* B5 — Add test case modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setAddModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Add Test Case — {portalType} / {caseTypeLabel(activeCategory, portalType)}
            </h3>
            <div className="space-y-3">
              <div>
                <FieldLabel>Severity</FieldLabel>
                <select value={addSeverity} onChange={(e) => setAddSeverity(e.target.value as NocSeverity)}>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
              <div>
                <FieldLabel>
                  {activeCategory === "ProviderIssue" ? "Provider Name" : "Customer Name"}
                </FieldLabel>
                <input
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

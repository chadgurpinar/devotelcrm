import { useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../../components/ui";
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
import { NocCaseCard } from "./NocCaseCard";

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

  const activeUserName = useMemo(
    () => getUserName(state, state.activeUserId),
    [state],
  );

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

  function handleCaseAction(
    id: string,
    action: NocCaseAction,
    payload: { ttNumber?: string; comment?: string; actionedBy: string },
  ) {
    state.actionNocCase(id, action, payload);
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
              <NocCaseCard
                key={c.id}
                nocCase={c}
                portalType={portalType}
                activeUserName={activeUserName}
                onAction={handleCaseAction}
              />
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

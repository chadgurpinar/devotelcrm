import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { RoutingReqStatus, RoutingReqTab } from "../../store/types";

const ALL_TABS: RoutingReqTab[] = ["Routing Request", "TT Request", "Test Request", "Loss Accepted"];

const TAB_FIELDS: Record<RoutingReqTab, string[]> = {
  "Routing Request": ["Customer", "Destination", "Provider 1", "Provider 2", "Provider 3", "Provider 4", "Provider 5", "Comment"],
  "TT Request": ["Customer", "Destination", "Issue", "Comment"],
  "Test Request": ["Customer", "Destination", "Test Type", "Comment"],
  "Loss Accepted": ["Customer", "Destination", "Acceptable Loss Value", "Comment"],
};

const TAB_ACTIONS: Record<RoutingReqTab, Array<{ label: string; status: RoutingReqStatus; style: string }>> = {
  "Routing Request": [
    { label: "✅ Routing Done", status: "Routing Done", style: "bg-emerald-600 text-white hover:opacity-90" },
    { label: "❌ Cancel", status: "Cancelled", style: "bg-rose-600 text-white hover:opacity-90" },
  ],
  "TT Request": [
    { label: "✅ TT Sent", status: "TT Sent", style: "bg-emerald-600 text-white hover:opacity-90" },
    { label: "❌ Cancel", status: "Cancelled", style: "bg-rose-600 text-white hover:opacity-90" },
  ],
  "Test Request": [
    { label: "✅ Test Successful", status: "Test Successful", style: "bg-emerald-600 text-white hover:opacity-90" },
    { label: "❌ Test Failed", status: "Test Failed", style: "bg-rose-600 text-white hover:opacity-90" },
  ],
  "Loss Accepted": [
    { label: "✅ Loss Accepted", status: "Loss Accepted", style: "bg-emerald-600 text-white hover:opacity-90" },
    { label: "❌ Loss Not Accepted", status: "Loss Not Accepted", style: "bg-rose-600 text-white hover:opacity-90" },
  ],
};

const POSITIVE_STATUSES: RoutingReqStatus[] = ["Routing Done", "TT Sent", "Test Successful", "Loss Accepted"];
const NEGATIVE_STATUSES: RoutingReqStatus[] = ["Test Failed", "Loss Not Accepted", "Cancelled"];

function statusBadgeClass(s: RoutingReqStatus): string {
  if (s === "Open") return "bg-blue-100 text-blue-700";
  if (POSITIVE_STATUSES.includes(s)) return "bg-emerald-100 text-emerald-700";
  return "bg-rose-100 text-rose-700";
}

function cardBorderClass(s: RoutingReqStatus): string {
  if (s === "Open") return "bg-white border-slate-200 border-l-4 border-l-blue-400";
  if (POSITIVE_STATUSES.includes(s)) return "bg-emerald-50 border-emerald-300 border-l-4 border-l-emerald-500";
  return "bg-rose-50 border-rose-300 border-l-4 border-l-rose-500";
}

function formatTS(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${hh}:${mm} ${dd}.${mo}.${yy}`;
}

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function emptyForm(tab: RoutingReqTab): Record<string, string> {
  const obj: Record<string, string> = {};
  TAB_FIELDS[tab].forEach((f) => { obj[f] = ""; });
  return obj;
}

function isTextArea(field: string): boolean {
  return field === "Comment" || field === "Issue";
}

function ElapsedTimer({ submittedAt }: { submittedAt: string }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(submittedAt).getTime());

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(submittedAt).getTime()), 1000);
    return () => clearInterval(id);
  }, [submittedAt]);

  const mins = elapsed / 60000;
  const cls = mins > 60 ? "text-rose-700 bg-rose-50 rounded px-1" : mins > 30 ? "text-amber-700 bg-amber-50 rounded px-1" : "text-slate-500";

  return <span className={`text-xs font-medium ${cls}`}>⏱ Open for: {formatElapsed(elapsed)}</span>;
}

export function RoutingNocPortalPage() {
  const state = useAppStore();
  const [activeTab, setActiveTab] = useState<RoutingReqTab>("Routing Request");
  const [form, setForm] = useState<Record<string, string>>(() => emptyForm("Routing Request"));
  const [filterStatus, setFilterStatus] = useState<"All" | "Open" | "Closed">("All");
  const [nocComments, setNocComments] = useState<Record<string, string>>({});

  const userName = useMemo(() => getUserName(state, state.activeUserId), [state]);

  useEffect(() => {
    setForm(emptyForm(activeTab));
  }, [activeTab]);

  const tabSummaries = useMemo(
    () => ALL_TABS.map((tab) => ({
      tab,
      openCount: state.routingNocRequests.filter((r) => r.tab === tab && r.status === "Open").length,
    })),
    [state.routingNocRequests],
  );

  const tabRequests = useMemo(() => {
    let dataset = state.routingNocRequests.filter((r) => r.tab === activeTab);
    if (filterStatus === "Open") dataset = dataset.filter((r) => r.status === "Open");
    if (filterStatus === "Closed") dataset = dataset.filter((r) => r.status !== "Open");
    dataset = dataset.filter((r) => !r.reviewedByAm);
    return dataset.sort((a, b) => {
      if (a.status === "Open" && b.status !== "Open") return -1;
      if (a.status !== "Open" && b.status === "Open") return 1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }, [state.routingNocRequests, activeTab, filterStatus]);

  const openCount = state.routingNocRequests.filter((r) => r.tab === activeTab && r.status === "Open").length;
  const closedCount = state.routingNocRequests.filter((r) => r.tab === activeTab && r.status !== "Open").length;

  function handleSend() {
    if (!form["Customer"]?.trim()) return;
    state.addRoutingNocRequest({ tab: activeTab, fields: { ...form }, submittedBy: userName });
    setForm(emptyForm(activeTab));
  }

  function handleClose(id: string, status: RoutingReqStatus) {
    state.closeRoutingNocRequest(id, status, {
      nocComment: nocComments[id]?.trim() || undefined,
      closedBy: userName,
    });
    setNocComments((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Routing &amp; NOC Portal</h1>
        <p className="mt-1 text-sm text-slate-500">Account Manager requests · NOC/Routing responses</p>
      </div>

      {/* B1 — Tab summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tabSummaries.map((s) => {
          const selected = s.tab === activeTab;
          return (
            <button
              key={s.tab}
              type="button"
              onClick={() => setActiveTab(s.tab)}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
                selected ? "ring-2 ring-brand-500 border-brand-500" : "border-slate-200"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.tab}</p>
              <div className="mt-2">
                {s.openCount === 0 ? (
                  <Badge className="bg-emerald-100 text-emerald-700">✓ 0</Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700">📋 {s.openCount}</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* B2 — Two-column layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* B3 — Left: New Request Form */}
        <Card title={`New ${activeTab}`}>
          <p className="mb-3 text-xs text-slate-500">Fill in the details and click Send</p>
          <div className="space-y-3">
            {TAB_FIELDS[activeTab].map((field) => (
              <div key={field}>
                <FieldLabel>{field}</FieldLabel>
                {isTextArea(field) ? (
                  <textarea
                    rows={3}
                    value={form[field] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                    placeholder={field === "Comment" ? "Optional notes..." : ""}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                ) : (
                  <input
                    value={form[field] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleSend} disabled={!form["Customer"]?.trim()}>
              Send
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setForm(emptyForm(activeTab))}>
              Clear
            </Button>
          </div>
        </Card>

        {/* B4 — Right: Request List */}
        <Card title={`${activeTab}s`}>
          <p className="mb-2 text-xs text-slate-500">{openCount} open · {closedCount} closed</p>
          <div className="mb-3 flex gap-1">
            {(["All", "Open", "Closed"] as const).map((s) => (
              <Button key={s} size="sm" variant={filterStatus === s ? "primary" : "secondary"} onClick={() => setFilterStatus(s)}>
                {s}
              </Button>
            ))}
          </div>

          {tabRequests.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No requests match this filter.</p>
          ) : (
            <div className="space-y-3">
              {tabRequests.map((entry) => (
                <article key={entry.id} className={`rounded-xl border p-4 shadow-sm ${cardBorderClass(entry.status)}`}>
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <span className="font-semibold text-slate-700">{entry.submittedBy}</span>
                      <span className="ml-2 text-slate-400">{formatTS(entry.submittedAt)}</span>
                    </div>
                    <Badge className={statusBadgeClass(entry.status)}>{entry.status}</Badge>
                  </div>

                  {/* Fields */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {Object.entries(entry.fields)
                      .filter(([, v]) => v.trim() !== "")
                      .map(([k, v]) => (
                        <span key={k}>
                          <span className="text-slate-500">{k}:</span>{" "}
                          <span className="font-medium text-slate-700">{v}</span>
                        </span>
                      ))}
                  </div>

                  {/* Elapsed timer (open only) */}
                  {entry.status === "Open" && (
                    <div className="mt-2">
                      <ElapsedTimer submittedAt={entry.submittedAt} />
                    </div>
                  )}

                  {/* NOC action (open only) */}
                  {entry.status === "Open" && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">NOC Response</p>
                      <textarea
                        rows={2}
                        placeholder="Add comment (optional)..."
                        value={nocComments[entry.id] ?? ""}
                        onChange={(e) => setNocComments((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        {TAB_ACTIONS[activeTab].map((act) => (
                          <button
                            key={act.status}
                            type="button"
                            onClick={() => handleClose(entry.id, act.status)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${act.style}`}
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Closed card footer */}
                  {entry.status !== "Open" && (
                    <div className="mt-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                        <Badge className={statusBadgeClass(entry.status)}>{entry.status}</Badge>
                        {entry.nocComment && <p className="mt-1 text-slate-600">Comment: &ldquo;{entry.nocComment}&rdquo;</p>}
                        <p className="mt-1 text-xs text-slate-500">
                          By: {entry.closedBy ?? "-"}
                          {entry.closedAt && <> · {formatTS(entry.closedAt)}</>}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => state.markRoutingNocRequestReviewed(entry.id)}
                        className="mt-2 text-xs text-slate-500 underline hover:text-slate-700"
                      >
                        Mark as Reviewed
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

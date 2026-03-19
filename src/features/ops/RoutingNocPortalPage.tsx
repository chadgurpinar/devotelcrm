import { useEffect, useMemo, useState } from "react";
import { Network, Plus } from "lucide-react";
import { Badge, Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { RoutingReqStatus, RoutingReqTab } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";

const ALL_TABS: RoutingReqTab[] = ["Routing Request", "TT Request", "Test Request", "Loss Accepted"];

const TAB_FIELDS: Record<RoutingReqTab, string[]> = {
  "Routing Request": ["Customer", "Destination", "Comment"],
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
  const [providers, setProviders] = useState<string[]>([""]);
  const [filterStatus, setFilterStatus] = useState<"All" | "Open" | "Closed">("All");
  const [nocComments, setNocComments] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const userName = useMemo(() => getUserName(state, state.activeUserId), [state]);

  useEffect(() => {
    setForm(emptyForm(activeTab));
    setProviders([""]);
    setExpandedId(null);
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
    let fields: Record<string, string>;
    if (activeTab === "Routing Request") {
      const providerFields: Record<string, string> = {};
      providers.forEach((p, i) => { if (p.trim()) providerFields[`Provider ${i + 1}`] = p.trim(); });
      fields = { Customer: form["Customer"], Destination: form["Destination"] ?? "", ...providerFields, Comment: form["Comment"] ?? "" };
    } else {
      fields = { ...form };
    }
    state.addRoutingNocRequest({ tab: activeTab, fields, submittedBy: userName });
    setForm(emptyForm(activeTab));
    setProviders([""]);
  }

  function handleClose(id: string, status: RoutingReqStatus) {
    state.closeRoutingNocRequest(id, status, {
      nocComment: nocComments[id]?.trim() || undefined,
      closedBy: userName,
    });
    setNocComments((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }

  const isRoutingTab = activeTab === "Routing Request";
  const formFields = TAB_FIELDS[activeTab];
  const expandedEntry = expandedId ? tabRequests.find((r) => r.id === expandedId) ?? null : null;

  const totalRequests = state.routingNocRequests.length;
  const totalOpen = state.routingNocRequests.filter((r) => r.status === "Open").length;
  const totalResolved = totalRequests - totalOpen;

  return (
    <div className="space-y-5">
      <UiPageHeader
        title="Routing & NOC Portal"
        subtitle="Account Manager requests · NOC/Routing responses"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiKpiCard label="Total Requests" value={totalRequests} icon={<Network className="h-5 w-5" />} />
        <UiKpiCard label="Open" value={totalOpen} className="border-blue-200 bg-blue-50/40" />
        <UiKpiCard label="Resolved" value={totalResolved} className="border-emerald-200 bg-emerald-50/40" />
      </div>

      {/* Tab summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tabSummaries.map((s) => {
          const selected = s.tab === activeTab;
          return (
            <button
              key={s.tab}
              type="button"
              onClick={() => setActiveTab(s.tab)}
              className={`rounded-xl border bg-white p-3.5 text-left shadow-sm transition hover:shadow-md ${
                selected ? "ring-2 ring-indigo-500 border-indigo-500" : "border-gray-200"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{s.tab}</p>
              <div className="mt-1.5">
                <span className={`text-lg font-bold ${s.openCount > 0 ? "text-gray-900" : "text-gray-400"}`}>{s.openCount}</span>
                <span className="ml-1 text-xs text-gray-400">open</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* BÖLÜM 2 — Compact inline form */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {formFields.map((field) => {
          if (isRoutingTab && field === "Comment") return null;
          return (
            <div key={field} className="flex flex-col min-w-[120px]">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{field}</label>
              <input
                className="rounded border border-slate-200 px-2 py-1 text-sm h-8"
                value={form[field] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
              />
            </div>
          );
        })}

        {isRoutingTab && providers.map((pv, i) => (
          <div key={i} className="flex items-end gap-1">
            <div className="flex flex-col min-w-[120px]">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Provider {i + 1}</label>
              <input
                className="rounded border border-slate-200 px-2 py-1 text-sm h-8"
                value={pv}
                onChange={(e) => setProviders((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
              />
            </div>
            {i === 0 ? (
              <button
                type="button"
                onClick={() => setProviders((p) => [...p, ""])}
                className="h-8 w-8 rounded border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 text-lg font-bold flex items-center justify-center flex-shrink-0"
              >
                +
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setProviders((p) => p.filter((_, idx) => idx !== i))}
                className="h-8 w-8 rounded border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 text-lg font-bold flex items-center justify-center flex-shrink-0"
              >
                −
              </button>
            )}
          </div>
        ))}

        {isRoutingTab && (
          <div className="flex flex-col min-w-[120px]">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Comment</label>
            <input
              className="rounded border border-slate-200 px-2 py-1 text-sm h-8"
              value={form["Comment"] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, Comment: e.target.value }))}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!form["Customer"]?.trim()}
          className="h-8 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 flex-shrink-0 self-end"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => { setForm(emptyForm(activeTab)); setProviders([""]); }}
          className="h-8 px-3 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 flex-shrink-0 self-end"
        >
          Clear
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500">{openCount} open · {closedCount} closed</p>
        <div className="flex gap-1">
          {(["All", "Open", "Closed"] as const).map((s) => (
            <Button key={s} size="sm" variant={filterStatus === s ? "primary" : "secondary"} onClick={() => setFilterStatus(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* BÖLÜM 3 — Compact request card grid + expand panel */}
      {tabRequests.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No requests match this filter.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 xl:grid-cols-4">
            {tabRequests.map((entry) => (
              <article
                key={entry.id}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className={`rounded-xl border p-3 shadow-sm cursor-pointer transition hover:shadow-md ${cardBorderClass(entry.status)}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold text-slate-700 truncate">{entry.submittedBy}</span>
                  <Badge className={statusBadgeClass(entry.status)}>{entry.status}</Badge>
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {entry.fields["Customer"]}
                  {entry.fields["Destination"] && <> → {entry.fields["Destination"]}</>}
                </div>
                <div className="mt-1">
                  {entry.status === "Open" ? (
                    <ElapsedTimer submittedAt={entry.submittedAt} />
                  ) : (
                    <span className="text-[10px] text-slate-400">{formatTS(entry.submittedAt)}</span>
                  )}
                </div>
                <div className="mt-1 text-[10px] text-slate-400 text-right">
                  {expandedId === entry.id ? "▲ less" : "▼ details"}
                </div>
              </article>
            ))}
          </div>

          {/* Expanded detail panel */}
          {expandedEntry && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4">
                {Object.entries(expandedEntry.fields)
                  .filter(([, v]) => v.trim() !== "")
                  .map(([k, v]) => (
                    <div key={k}>
                      <span className="text-xs text-slate-400 block">{k}</span>
                      <span className="font-medium text-slate-700">{v}</span>
                    </div>
                  ))}
              </div>

              {expandedEntry.status === "Open" && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">NOC Response</p>
                  <textarea
                    rows={2}
                    placeholder="Add comment (optional)..."
                    value={nocComments[expandedEntry.id] ?? ""}
                    onChange={(e) => setNocComments((prev) => ({ ...prev, [expandedEntry.id]: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {TAB_ACTIONS[activeTab].map((act) => (
                      <button
                        key={act.status}
                        type="button"
                        onClick={() => { handleClose(expandedEntry.id, act.status); setExpandedId(null); }}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${act.style}`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {expandedEntry.status !== "Open" && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <Badge className={statusBadgeClass(expandedEntry.status)}>{expandedEntry.status}</Badge>
                    {expandedEntry.nocComment && (
                      <p className="mt-1 text-slate-600">Comment: &ldquo;{expandedEntry.nocComment}&rdquo;</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      By: {expandedEntry.closedBy ?? "-"}
                      {expandedEntry.closedAt && <> · {formatTS(expandedEntry.closedAt)}</>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { state.markRoutingNocRequestReviewed(expandedEntry.id); setExpandedId(null); }}
                    className="mt-2 text-xs text-slate-500 underline hover:text-slate-700"
                  >
                    Mark as Reviewed
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

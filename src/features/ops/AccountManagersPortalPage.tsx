import { useEffect, useMemo, useState } from "react";
import { UserCheck } from "lucide-react";
import { Badge } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { AmTab } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";

const ALL_TABS: AmTab[] = ["Route Request", "Traffic Request", "Targets", "Deal Offers"];

const TAB_FIELDS: Record<string, string[]> = {
  "Route Request": ["Destination", "Target Rate", "Volume"],
  "Traffic Request": ["Destination", "Rate", "Volume"],
  Targets: ["Destination", "Target Rate", "Volume"],
};

const DEAL_CUSTOMER_FIELDS = ["Customer", "Destination", "Rate", "Volume", "Deal Period", "Amount"];
const DEAL_PROVIDER_FIELDS = ["Provider", "Destination", "Rate", "Volume", "Deal Period", "Amount"];

function emptyForm(tab: AmTab): Record<string, string> {
  const fields = TAB_FIELDS[tab] ?? [];
  const obj: Record<string, string> = {};
  fields.forEach((f) => { obj[f] = ""; });
  return obj;
}

function emptyDealSide(fields: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  fields.forEach((f) => { obj[f] = ""; });
  return obj;
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

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setRemaining(new Date(expiresAt).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining <= 0) return null;

  const totalSecs = Math.floor(remaining / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const fmt = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const hrs = remaining / 3_600_000;
  const cls = hrs < 2 ? "text-rose-700 bg-rose-50" : hrs < 6 ? "text-amber-700 bg-amber-50" : "text-slate-500 bg-slate-100";

  return <span className={`text-xs font-medium rounded px-2 py-0.5 ${cls}`}>⏱ {fmt} remaining</span>;
}

function CommentInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  const handleSend = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };
  return (
    <div className="flex gap-2 items-end">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Add a comment..."
        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="h-8 px-3 rounded-lg bg-brand-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 flex-shrink-0"
      >
        Send
      </button>
    </div>
  );
}

export function AccountManagersPortalPage() {
  const state = useAppStore();
  const [activeTab, setActiveTab] = useState<AmTab>("Route Request");
  const [form, setForm] = useState<Record<string, string>>(() => emptyForm("Route Request"));
  const [dealCustomer, setDealCustomer] = useState(() => emptyDealSide(DEAL_CUSTOMER_FIELDS));
  const [dealProvider, setDealProvider] = useState(() => emptyDealSide(DEAL_PROVIDER_FIELDS));
  const [filter, setFilter] = useState<"Active" | "Archived">("Active");

  const userName = useMemo(() => getUserName(state, state.activeUserId), [state]);

  useEffect(() => {
    state.archiveExpiredAmEntries();
    const interval = setInterval(() => state.archiveExpiredAmEntries(), 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab !== "Deal Offers") setForm(emptyForm(activeTab));
  }, [activeTab]);

  const tabSummaries = useMemo(
    () => ALL_TABS.map((tab) => ({
      tab,
      activeCount: state.amEntries.filter((e) => e.tab === tab && !e.isArchived).length,
    })),
    [state.amEntries],
  );

  const filteredEntries = useMemo(
    () =>
      state.amEntries
        .filter((e) => e.tab === activeTab)
        .filter((e) => (filter === "Active" ? !e.isArchived : e.isArchived))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [state.amEntries, activeTab, filter],
  );

  function handleSend() {
    if (!form["Destination"]?.trim()) return;
    state.addAmEntry({ tab: activeTab, fields: { ...form }, submittedBy: userName });
    setForm(emptyForm(activeTab));
  }

  function handleDealSend() {
    if (!dealCustomer["Customer"]?.trim()) return;
    state.addAmEntry({ tab: "Deal Offers", customer: { ...dealCustomer }, provider: { ...dealProvider }, submittedBy: userName });
    clearDeal();
  }

  function clearDeal() {
    setDealCustomer(emptyDealSide(DEAL_CUSTOMER_FIELDS));
    setDealProvider(emptyDealSide(DEAL_PROVIDER_FIELDS));
  }

  const isDealTab = activeTab === "Deal Offers";

  return (
    <div className="space-y-5">
      <UiPageHeader
        title="Account Managers Portal"
        subtitle="Internal collaboration board · entries expire after 48h"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiKpiCard label="Total Active" value={state.amEntries.filter((e) => !e.isArchived).length} icon={<UserCheck className="h-5 w-5" />} />
        <UiKpiCard label="Route Requests" value={tabSummaries.find((s) => s.tab === "Route Request")?.activeCount ?? 0} className="border-blue-200 bg-blue-50/40" />
        <UiKpiCard label="Deal Offers" value={tabSummaries.find((s) => s.tab === "Deal Offers")?.activeCount ?? 0} className="border-purple-200 bg-purple-50/40" />
        <UiKpiCard label="Archived" value={state.amEntries.filter((e) => e.isArchived).length} className="border-gray-200" />
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
                <span className={`text-lg font-bold ${s.activeCount > 0 ? "text-gray-900" : "text-gray-400"}`}>{s.activeCount}</span>
                <span className="ml-1 text-xs text-gray-400">active</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* B4 — Inline form */}
      {isDealTab ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">New Deal Offer</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400 mb-2">Customer Side</p>
              <div className="grid grid-cols-2 gap-2">
                {DEAL_CUSTOMER_FIELDS.map((f) => (
                  <div key={f} className="flex flex-col">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{f}</label>
                    <input
                      value={dealCustomer[f] ?? ""}
                      onChange={(e) => setDealCustomer((p) => ({ ...p, [f]: e.target.value }))}
                      className="rounded border border-slate-200 px-2 py-1 text-sm h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400 mb-2">Provider Side</p>
              <div className="grid grid-cols-2 gap-2">
                {DEAL_PROVIDER_FIELDS.map((f) => (
                  <div key={f} className="flex flex-col">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{f}</label>
                    <input
                      value={dealProvider[f] ?? ""}
                      onChange={(e) => setDealProvider((p) => ({ ...p, [f]: e.target.value }))}
                      className="rounded border border-slate-200 px-2 py-1 text-sm h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDealSend}
              disabled={!dealCustomer["Customer"]?.trim()}
              className="h-8 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              Send
            </button>
            <button onClick={clearDeal} className="h-8 px-3 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {(TAB_FIELDS[activeTab] ?? []).map((field) => (
            <div key={field} className="flex flex-col min-w-[120px]">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{field}</label>
              <input
                value={form[field] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                className="rounded border border-slate-200 px-2 py-1 text-sm h-8"
              />
            </div>
          ))}
          <button
            onClick={handleSend}
            disabled={!form["Destination"]?.trim()}
            className="h-8 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 flex-shrink-0 self-end"
          >
            Send
          </button>
          <button
            onClick={() => setForm(emptyForm(activeTab))}
            className="h-8 px-3 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 flex-shrink-0 self-end"
          >
            Clear
          </button>
        </div>
      )}

      {/* B5 — Filter bar */}
      <div className="flex items-center gap-2">
        {(["Active", "Archived"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-2">{filteredEntries.length} entries</span>
      </div>

      {/* B6 — Entry feed */}
      {filteredEntries.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No entries for this tab.</p>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* Top row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{entry.submittedBy}</span>
                  <span className="text-xs text-slate-400">{formatTS(entry.submittedAt)}</span>
                  {entry.comments.length > 0 && <span className="text-xs text-slate-400">· 💬 {entry.comments.length}</span>}
                </div>
                {!entry.isArchived && <ExpiryCountdown expiresAt={entry.expiresAt} />}
                {entry.isArchived && <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">Archived</span>}
              </div>

              {/* Simple fields */}
              {entry.fields && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3">
                  {Object.entries(entry.fields)
                    .filter(([, v]) => v.trim() !== "")
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide block">{k}</span>
                        <span className="text-sm font-semibold text-slate-700">{v}</span>
                      </div>
                    ))}
                </div>
              )}

              {/* Deal fields */}
              {entry.customer && entry.provider && (
                <div className="grid gap-3 md:grid-cols-2 mb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Customer</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {Object.entries(entry.customer)
                        .filter(([, v]) => v.trim() !== "")
                        .map(([k, v]) => (
                          <div key={k}>
                            <span className="text-[10px] text-slate-400 block">{k}</span>
                            <span className="text-sm font-medium text-slate-700">{v}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Provider</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {Object.entries(entry.provider)
                        .filter(([, v]) => v.trim() !== "")
                        .map(([k, v]) => (
                          <div key={k}>
                            <span className="text-[10px] text-slate-400 block">{k}</span>
                            <span className="text-sm font-medium text-slate-700">{v}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              {entry.comments.length > 0 && (
                <div className="border-t border-slate-100 pt-3 mb-3 space-y-2">
                  {entry.comments.map((c) => (
                    <div key={c.id} className="flex gap-2 text-sm">
                      <span className="font-semibold text-slate-600 whitespace-nowrap">{c.authorName}:</span>
                      <span className="text-slate-600">{c.text}</span>
                      <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">{formatTS(c.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              {!entry.isArchived && (
                <CommentInput onSubmit={(text) => state.addAmComment(entry.id, text, userName)} />
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

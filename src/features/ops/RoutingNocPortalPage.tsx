import { useState, useMemo } from "react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { NocPortalPage } from "./OpsPortalPage";
import { ROUTING_NOC_PORTAL_CONFIG } from "./portalConfigs";

type ReqTab = "Routing Request" | "TT Request" | "Test Request" | "Loss Accepted";

type ReqStatus =
  | "Open"
  | "Routing Done"
  | "TT Sent"
  | "Test Successful"
  | "Test Failed"
  | "Loss Accepted"
  | "Loss Not Accepted"
  | "Cancelled";

interface ReqEntry {
  id: string;
  tab: ReqTab;
  fields: Record<string, string>;
  submittedBy: string;
  submittedAt: string;
  status: ReqStatus;
  closedBy?: string;
  closedAt?: string;
}

const TAB_FIELDS: Record<ReqTab, string[]> = {
  "Routing Request": ["Customer", "Destination", "Provider 1", "Provider 2", "Provider 3", "Provider 4", "Provider 5", "Comment"],
  "TT Request": ["Customer", "Destination", "Issue", "Comment"],
  "Test Request": ["Customer", "Destination", "Test Type", "Comment"],
  "Loss Accepted": ["Customer", "Destination", "Acceptable Loss Value", "Comment"],
};

const TAB_ACTIONS: Record<ReqTab, ReqStatus[]> = {
  "Routing Request": ["Routing Done", "Cancelled"],
  "TT Request": ["TT Sent", "Cancelled"],
  "Test Request": ["Test Successful", "Test Failed"],
  "Loss Accepted": ["Loss Accepted", "Loss Not Accepted"],
};

function statusColor(s: ReqStatus): string {
  if (s === "Open") return "bg-blue-100 text-blue-700";
  if (s === "Cancelled" || s === "Test Failed" || s === "Loss Not Accepted") return "bg-rose-100 text-rose-700";
  return "bg-emerald-100 text-emerald-700";
}

export function RoutingNocPortalPage() {
  const state = useAppStore();
  const userName = getUserName(state, state.activeUserId);

  const [tab, setTab] = useState<ReqTab>("Routing Request");
  const [entries, setEntries] = useState<ReqEntry[]>([]);

  const emptyForm = (t: ReqTab) => Object.fromEntries(TAB_FIELDS[t].map((f) => [f, ""]));
  const [form, setForm] = useState<Record<string, string>>(() => emptyForm(tab));

  const switchTab = (t: ReqTab) => {
    setTab(t);
    setForm(emptyForm(t));
  };

  const tabEntries = useMemo(
    () =>
      entries
        .filter((e) => e.tab === tab)
        .sort((a, b) => {
          if (a.status === "Open" && b.status !== "Open") return -1;
          if (a.status !== "Open" && b.status === "Open") return 1;
          return 0;
        }),
    [entries, tab],
  );

  const handleSubmit = () => {
    const first = TAB_FIELDS[tab][0];
    if (!form[first]?.trim()) return;
    setEntries((prev) => [
      { id: crypto.randomUUID(), tab, fields: { ...form }, submittedBy: userName, submittedAt: new Date().toLocaleString(), status: "Open" },
      ...prev,
    ]);
    setForm(emptyForm(tab));
  };

  const handleClose = (id: string, newStatus: ReqStatus) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus, closedBy: userName, closedAt: new Date().toLocaleString() } : e)),
    );
  };

  const allTabs: ReqTab[] = ["Routing Request", "TT Request", "Test Request", "Loss Accepted"];

  return (
    <div className="space-y-6">
      <NocPortalPage config={ROUTING_NOC_PORTAL_CONFIG} />

      <Card title="AM → NOC Request Board">
        <p className="text-xs text-slate-500">AM submits operational requests — NOC/Routing closes them.</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {allTabs.map((t) => (
            <Button key={t} size="sm" variant={tab === t ? "primary" : "secondary"} onClick={() => switchTab(t)}>
              {t}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`New ${tab}`}>
          <div className="space-y-2">
            {TAB_FIELDS[tab].map((fieldName) => (
              <div key={fieldName}>
                <FieldLabel>{fieldName}</FieldLabel>
                {fieldName === "Comment" ? (
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                    value={form[fieldName] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [fieldName]: e.target.value }))}
                  />
                ) : (
                  <input value={form[fieldName] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [fieldName]: e.target.value }))} />
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSubmit}>Send</Button>
              <Button size="sm" variant="secondary" onClick={() => setForm(emptyForm(tab))}>Cancel / Clear</Button>
            </div>
          </div>
        </Card>

        <Card title={`${tab}s`}>
          {tabEntries.length === 0 && <p className="text-xs text-slate-400">No requests yet.</p>}
          <div className="space-y-2">
            {tabEntries.map((entry) => (
              <div key={entry.id} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700">{entry.submittedBy}</span>
                    <span className="text-slate-400">{entry.submittedAt}</span>
                  </div>
                  <Badge className={statusColor(entry.status)}>{entry.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(entry.fields).map(([k, v]) =>
                    v ? (
                      <span key={k} className="text-xs">
                        <span className="text-slate-500">{k}:</span>{" "}
                        <span className="font-medium text-slate-700">{v}</span>
                      </span>
                    ) : null,
                  )}
                </div>
                {entry.status === "Open" ? (
                  <div className="mt-2 flex gap-1 border-t border-slate-100 pt-2">
                    {TAB_ACTIONS[entry.tab].map((action) => (
                      <Button
                        key={action}
                        size="sm"
                        variant={action === "Cancelled" || action === "Test Failed" || action === "Loss Not Accepted" ? "secondary" : "primary"}
                        onClick={() => handleClose(entry.id, action)}
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-slate-400">
                    Closed by {entry.closedBy} at {entry.closedAt}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

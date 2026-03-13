import { useState } from "react";
import { Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { NocPortalPage } from "./OpsPortalPage";
import { ACCOUNT_MANAGERS_PORTAL_CONFIG } from "./portalConfigs";

type AmTab = "Route Request" | "Traffic Request" | "Targets" | "Deal Offers";

interface SimpleEntry {
  id: string;
  fields: Record<string, string>;
  submittedBy: string;
  submittedAt: string;
}

interface DealEntry {
  id: string;
  customer: Record<string, string>;
  provider: Record<string, string>;
  submittedBy: string;
  submittedAt: string;
}

const SIMPLE_FIELDS: Record<Exclude<AmTab, "Deal Offers">, string[]> = {
  "Route Request": ["Destination", "Target Rate", "Volume"],
  "Traffic Request": ["Destination", "Rate", "Volume"],
  Targets: ["Destination", "Target Rate", "Volume"],
};

const DEAL_CUSTOMER_FIELDS = ["Customer", "Destination", "Rate", "Volume", "Deal Period", "Amount"];
const DEAL_PROVIDER_FIELDS = ["Provider", "Destination", "Rate", "Volume", "Deal Period", "Amount"];

function fieldDisplay(label: string, value: string) {
  return (
    <span className="text-xs">
      <span className="text-slate-500">{label}:</span>{" "}
      <span className="font-medium text-slate-700">{value || "–"}</span>
    </span>
  );
}

export function AccountManagersPortalPage() {
  const state = useAppStore();
  const userName = getUserName(state, state.activeUserId);

  const [tab, setTab] = useState<AmTab>("Route Request");

  const [simpleEntries, setSimpleEntries] = useState<Record<string, SimpleEntry[]>>({
    "Route Request": [],
    "Traffic Request": [],
    Targets: [],
  });
  const [dealEntries, setDealEntries] = useState<DealEntry[]>([]);

  const emptySimple = (t: Exclude<AmTab, "Deal Offers">) =>
    Object.fromEntries(SIMPLE_FIELDS[t].map((f) => [f, ""]));
  const [simpleForm, setSimpleForm] = useState<Record<string, string>>(() => emptySimple("Route Request"));

  const emptyDealSide = (fields: string[]) => Object.fromEntries(fields.map((f) => [f, ""]));
  const [dealCustomer, setDealCustomer] = useState<Record<string, string>>(() => emptyDealSide(DEAL_CUSTOMER_FIELDS));
  const [dealProvider, setDealProvider] = useState<Record<string, string>>(() => emptyDealSide(DEAL_PROVIDER_FIELDS));

  const switchTab = (t: AmTab) => {
    setTab(t);
    if (t !== "Deal Offers") setSimpleForm(emptySimple(t));
  };

  const submitSimple = () => {
    if (tab === "Deal Offers") return;
    const fields = SIMPLE_FIELDS[tab as Exclude<AmTab, "Deal Offers">];
    if (!simpleForm[fields[0]]?.trim()) return;
    const entry: SimpleEntry = {
      id: crypto.randomUUID(),
      fields: { ...simpleForm },
      submittedBy: userName,
      submittedAt: new Date().toLocaleString(),
    };
    setSimpleEntries((prev) => ({ ...prev, [tab]: [entry, ...(prev[tab] ?? [])] }));
    setSimpleForm(emptySimple(tab as Exclude<AmTab, "Deal Offers">));
  };

  const submitDeal = () => {
    if (!dealCustomer["Customer"]?.trim() && !dealProvider["Provider"]?.trim()) return;
    const entry: DealEntry = {
      id: crypto.randomUUID(),
      customer: { ...dealCustomer },
      provider: { ...dealProvider },
      submittedBy: userName,
      submittedAt: new Date().toLocaleString(),
    };
    setDealEntries((prev) => [entry, ...prev]);
    setDealCustomer(emptyDealSide(DEAL_CUSTOMER_FIELDS));
    setDealProvider(emptyDealSide(DEAL_PROVIDER_FIELDS));
  };

  const allTabs: AmTab[] = ["Route Request", "Traffic Request", "Targets", "Deal Offers"];

  return (
    <div className="space-y-6">
      <NocPortalPage config={ACCOUNT_MANAGERS_PORTAL_CONFIG} />

      <Card title="AM Collaboration Board">
        <div className="flex flex-wrap gap-1">
          {allTabs.map((t) => (
            <Button key={t} size="sm" variant={tab === t ? "primary" : "secondary"} onClick={() => switchTab(t)}>
              {t}
            </Button>
          ))}
        </div>
      </Card>

      {tab !== "Deal Offers" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={`New ${tab}`}>
            <div className="space-y-2">
              {SIMPLE_FIELDS[tab as Exclude<AmTab, "Deal Offers">].map((f) => (
                <div key={f}>
                  <FieldLabel>{f}</FieldLabel>
                  <input value={simpleForm[f] ?? ""} onChange={(e) => setSimpleForm((p) => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={submitSimple}>Send Request</Button>
                <Button size="sm" variant="secondary" onClick={() => setSimpleForm(emptySimple(tab as Exclude<AmTab, "Deal Offers">))}>
                  Cancel / Clear
                </Button>
              </div>
            </div>
          </Card>
          <Card title={`Submitted ${tab}s`}>
            {(simpleEntries[tab] ?? []).length === 0 && <p className="text-xs text-slate-400">No entries yet.</p>}
            <div className="space-y-2">
              {(simpleEntries[tab] ?? []).map((entry) => (
                <div key={entry.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700">{entry.submittedBy}</span>
                    <span className="text-slate-400">{entry.submittedAt}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {Object.entries(entry.fields).map(([k, v]) => (
                      <span key={k}>{fieldDisplay(k, v)}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="New Deal Offer">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Side</p>
              <div className="grid gap-2 md:grid-cols-2">
                {DEAL_CUSTOMER_FIELDS.map((f) => (
                  <div key={f}>
                    <FieldLabel>{f}</FieldLabel>
                    <input value={dealCustomer[f] ?? ""} onChange={(e) => setDealCustomer((p) => ({ ...p, [f]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider Side</p>
              <div className="grid gap-2 md:grid-cols-2">
                {DEAL_PROVIDER_FIELDS.map((f) => (
                  <div key={f}>
                    <FieldLabel>{f}</FieldLabel>
                    <input value={dealProvider[f] ?? ""} onChange={(e) => setDealProvider((p) => ({ ...p, [f]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={submitDeal}>Send Request</Button>
                <Button size="sm" variant="secondary" onClick={() => { setDealCustomer(emptyDealSide(DEAL_CUSTOMER_FIELDS)); setDealProvider(emptyDealSide(DEAL_PROVIDER_FIELDS)); }}>
                  Cancel / Clear
                </Button>
              </div>
            </div>
          </Card>
          <Card title="Submitted Deal Offers">
            {dealEntries.length === 0 && <p className="text-xs text-slate-400">No deal offers yet.</p>}
            <div className="space-y-2">
              {dealEntries.map((d) => (
                <div key={d.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700">{d.submittedBy}</span>
                    <span className="text-slate-400">{d.submittedAt}</span>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Customer</p>
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(d.customer).map(([k, v]) => (
                          <div key={k}>{fieldDisplay(k, v)}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Provider</p>
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(d.provider).map(([k, v]) => (
                          <div key={k}>{fieldDisplay(k, v)}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

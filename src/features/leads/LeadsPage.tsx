import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge, Button, Card, FieldLabel, StatCard } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getEventName, getUserName } from "../../store/selectors";
import { CommercialFit, Company, CompanyType, OurEntity, TechnicalFit } from "../../store/types";
import { getInterconnectionStartReadiness } from "./readiness";

type AgeBucket = "all" | "0-7" | "8-30" | "30+";
type CreatedRange = "all" | "this_month" | "last_30_days";
type DispositionFilter = "Open" | "OnHold";

interface LeadFilters {
  search: string;
  leadDisposition: DispositionFilter;
  showRejected: boolean;
  source: string;
  ownerUserId: string;
  ourEntity: "" | OurEntity;
  workscope: string;
  type: string;
  watcherUserId: string;
  technicalFit: TechnicalFit | "all";
  commercialFit: CommercialFit | "all";
  ageBucket: AgeBucket;
  region: string;
  createdRange: CreatedRange;
}

const defaultFilters: LeadFilters = {
  search: "",
  leadDisposition: "Open",
  showRejected: false,
  source: "",
  ownerUserId: "",
  ourEntity: "",
  workscope: "",
  type: "",
  watcherUserId: "",
  technicalFit: "all",
  commercialFit: "all",
  ageBucket: "all",
  region: "",
  createdRange: "all",
};

const LEADS_ADVANCED_DRAWER_KEY = "leads-operational-advanced-open";

function leadAgeDays(company: Company): number {
  if (!company.createdAt) return 0;
  const start = new Date(company.createdAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / (24 * 60 * 60 * 1000)));
}

function technicalStatus(company: Company): TechnicalFit {
  return company.evaluation?.technicalFit ?? "Unknown";
}

function commercialStatus(company: Company): CommercialFit {
  return company.evaluation?.commercialFit ?? "Unknown";
}

function workscopeGroup(company: Company): string {
  const hasSms = company.workscope.includes("SMS");
  const hasVoice = company.workscope.includes("Voice");
  const hasData = company.workscope.includes("Data");
  if (hasSms && hasVoice) return "SMS + Voice";
  if (hasSms) return "SMS";
  if (hasVoice) return "Voice";
  if (hasData) return "Data";
  return "Other";
}

function passesAgeBucket(days: number, bucket: AgeBucket): boolean {
  if (bucket === "all") return true;
  if (bucket === "0-7") return days <= 7;
  if (bucket === "8-30") return days >= 8 && days <= 30;
  return days >= 30;
}

function isThisMonth(value?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isLast30Days(value?: string): boolean {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() <= 30 * 24 * 60 * 60 * 1000;
}

function matchesCreatedRange(value: string | undefined, range: CreatedRange): boolean {
  if (range === "all") return true;
  if (range === "this_month") return isThisMonth(value);
  return isLast30Days(value);
}

function dispositionBadgeClass(disposition: Company["leadDisposition"]): string {
  if (disposition === "Rejected") return "bg-rose-50 text-rose-700";
  if (disposition === "OnHold") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function technicalBadgeClass(value: TechnicalFit): string {
  if (value === "Pass") return "bg-emerald-50 text-emerald-700";
  if (value === "Fail") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function commercialBadgeClass(value: CommercialFit): string {
  if (value === "Risk") return "bg-rose-50 text-rose-700";
  if (value === "High") return "bg-amber-50 text-amber-700";
  if (value === "Medium") return "bg-sky-50 text-sky-700";
  if (value === "Low") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function readinessBadgeClass(ready: boolean): string {
  return ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
}

export function LeadsPage() {
  const navigate = useNavigate();
  const state = useAppStore();
  const tableAnchorRef = useRef<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
  const [advancedOpen, setAdvancedOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LEADS_ADVANCED_DRAWER_KEY) === "1";
  });
  const [drilldownLabel, setDrilldownLabel] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEADS_ADVANCED_DRAWER_KEY, advancedOpen ? "1" : "0");
  }, [advancedOpen]);

  const leads = useMemo(() => state.companies.filter((company) => company.companyStatus === "LEAD"), [state.companies]);
  const processByCompany = useMemo(() => {
    const map = new Map<string, typeof state.interconnectionProcesses>();
    state.interconnectionProcesses.forEach((row) => {
      const list = map.get(row.companyId) ?? [];
      list.push(row);
      map.set(row.companyId, list);
    });
    return map;
  }, [state.interconnectionProcesses]);
  const contactsByCompany = useMemo(() => {
    const map = new Map<string, typeof state.contacts>();
    state.contacts.forEach((row) => {
      if (!row.companyId) return;
      const list = map.get(row.companyId) ?? [];
      list.push(row);
      map.set(row.companyId, list);
    });
    return map;
  }, [state.contacts]);

  const visibleLeads = useMemo(() => {
    return leads
      .filter((company) => company.name.toLowerCase().includes(filters.search.toLowerCase()))
      .filter((company) => {
        if (filters.showRejected) return company.leadDisposition === "Rejected";
        return company.leadDisposition === filters.leadDisposition;
      })
      .filter((company) =>
        filters.source ? (filters.source === "manual" ? !company.createdFromEventId : company.createdFromEventId === filters.source) : true,
      )
      .filter((company) => (filters.ownerUserId ? company.ownerUserId === filters.ownerUserId : true))
      .filter((company) => (filters.ourEntity ? company.ourEntity === filters.ourEntity : true))
      .filter((company) => (filters.watcherUserId ? company.watcherUserIds.includes(filters.watcherUserId) : true))
      .filter((company) => (filters.workscope ? workscopeGroup(company) === filters.workscope : true))
      .filter((company) => (filters.type ? company.type === filters.type : true))
      .filter((company) => (filters.technicalFit === "all" ? true : technicalStatus(company) === filters.technicalFit))
      .filter((company) => (filters.commercialFit === "all" ? true : commercialStatus(company) === filters.commercialFit))
      .filter((company) => passesAgeBucket(leadAgeDays(company), filters.ageBucket))
      .filter((company) => (filters.region ? (company.region ?? "") === filters.region : true))
      .filter((company) => matchesCreatedRange(company.createdAt, filters.createdRange))
      .sort((a, b) => leadAgeDays(b) - leadAgeDays(a));
  }, [filters, leads]);

  const openLeads = useMemo(() => leads.filter((company) => company.leadDisposition === "Open"), [leads]);
  const onHoldLeads = useMemo(() => leads.filter((company) => company.leadDisposition === "OnHold"), [leads]);
  const rejectedLeads = useMemo(() => leads.filter((company) => company.leadDisposition === "Rejected"), [leads]);
  const totalLeads = openLeads.length;
  const olderThan30 = openLeads.filter((company) => leadAgeDays(company) >= 30).length;
  const createdThisMonth = openLeads.filter((company) => isThisMonth(company.createdAt)).length;
  const movedToInterconnection = state.companies.filter((company) => matchesCreatedRange(company.movedToInterconnectionAt, "this_month")).length;
  const avgLeadAge = totalLeads ? Math.round(openLeads.reduce((sum, company) => sum + leadAgeDays(company), 0) / totalLeads) : 0;

  const workscopeStats = useMemo(() => {
    const counts = { sms: 0, voice: 0, both: 0, data: 0, other: 0 };
    openLeads.forEach((company) => {
      const group = workscopeGroup(company);
      if (group === "SMS + Voice") counts.both += 1;
      else if (group === "SMS") counts.sms += 1;
      else if (group === "Voice") counts.voice += 1;
      else if (group === "Data") counts.data += 1;
      else counts.other += 1;
    });
    return counts;
  }, [openLeads]);

  const eventSourceOptions = useMemo(() => {
    const ids = Array.from(new Set(leads.map((company) => company.createdFromEventId).filter(Boolean))) as string[];
    return ids.map((id) => ({ id, label: getEventName(state, id) }));
  }, [leads, state]);
  const regionOptions = useMemo(() => Array.from(new Set(leads.map((company) => company.region).filter(Boolean))) as string[], [leads]);
  const watcherOptions = useMemo(
    () => Array.from(new Set(leads.flatMap((company) => company.watcherUserIds).filter(Boolean))) as string[],
    [leads],
  );
  const workscopeOptions = ["SMS", "Voice", "SMS + Voice", "Data", "Other"];

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
    if (filters.search) chips.push({ key: "search", label: `Search: ${filters.search}`, onClear: () => setFilters((f) => ({ ...f, search: "" })) });
    if (filters.ownerUserId)
      chips.push({
        key: "owner",
        label: `Owner: ${getUserName(state, filters.ownerUserId)}`,
        onClear: () => setFilters((f) => ({ ...f, ownerUserId: "" })),
      });
    if (filters.ourEntity)
      chips.push({
        key: "ourEntity",
        label: `Our entity: ${filters.ourEntity}`,
        onClear: () => setFilters((f) => ({ ...f, ourEntity: "" })),
      });
    if (filters.workscope) chips.push({ key: "workscope", label: `Workscope: ${filters.workscope}`, onClear: () => setFilters((f) => ({ ...f, workscope: "" })) });
    if (filters.ageBucket !== "all")
      chips.push({ key: "age", label: `Age: ${filters.ageBucket}`, onClear: () => setFilters((f) => ({ ...f, ageBucket: "all" })) });
    if (filters.technicalFit !== "all")
      chips.push({ key: "technicalFit", label: `Technical: ${filters.technicalFit}`, onClear: () => setFilters((f) => ({ ...f, technicalFit: "all" })) });
    if (filters.commercialFit !== "all")
      chips.push({
        key: "commercialFit",
        label: `Commercial: ${filters.commercialFit}`,
        onClear: () => setFilters((f) => ({ ...f, commercialFit: "all" })),
      });
    if (filters.showRejected)
      chips.push({ key: "rejected", label: "Rejected only", onClear: () => setFilters((f) => ({ ...f, showRejected: false })) });
    if (!filters.showRejected && filters.leadDisposition !== "Open")
      chips.push({
        key: "disposition",
        label: `Disposition: ${filters.leadDisposition}`,
        onClear: () => setFilters((f) => ({ ...f, leadDisposition: "Open" })),
      });
    if (filters.type) chips.push({ key: "type", label: `Type: ${filters.type}`, onClear: () => setFilters((f) => ({ ...f, type: "" })) });
    if (filters.source)
      chips.push({
        key: "source",
        label: `Source: ${filters.source === "manual" ? "Manual" : getEventName(state, filters.source)}`,
        onClear: () => setFilters((f) => ({ ...f, source: "" })),
      });
    if (filters.region) chips.push({ key: "region", label: `Region: ${filters.region}`, onClear: () => setFilters((f) => ({ ...f, region: "" })) });
    if (filters.watcherUserId)
      chips.push({
        key: "watcher",
        label: `Watcher: ${getUserName(state, filters.watcherUserId)}`,
        onClear: () => setFilters((f) => ({ ...f, watcherUserId: "" })),
      });
    if (filters.createdRange !== "all")
      chips.push({
        key: "createdRange",
        label: `Created: ${filters.createdRange.replace(/_/g, " ")}`,
        onClear: () => setFilters((f) => ({ ...f, createdRange: "all" })),
      });
    return chips;
  }, [filters, state]);

  const advancedActiveCount = useMemo(() => {
    let count = 0;
    if (filters.workscope) count += 1;
    if (filters.type) count += 1;
    if (filters.technicalFit !== "all") count += 1;
    if (filters.commercialFit !== "all") count += 1;
    if (filters.region) count += 1;
    if (filters.showRejected) count += 1;
    if (filters.source) count += 1;
    if (filters.watcherUserId) count += 1;
    if (filters.createdRange !== "all") count += 1;
    return count;
  }, [filters]);

  const breadcrumbText = activeChips.map((chip) => chip.label.replace(": ", "=")).join(", ");

  function applyDrilldown(label: string, patch: Partial<LeadFilters>) {
    if (drilldownLabel === label) {
      setDrilldownLabel(null);
      setFilters(defaultFilters);
    } else {
      setDrilldownLabel(label);
      setFilters({
        ...defaultFilters,
        ...patch,
      });
    }
    tableAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearAllFilters() {
    setFilters(defaultFilters);
    setDrilldownLabel(null);
  }

  return (
    <div className="space-y-4">
      <Card title="Lead dashboard">
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
          <button type="button" onClick={() => applyDrilldown("Open Leads", { showRejected: false, leadDisposition: "Open" })}>
            <StatCard label="Total Leads" value={totalLeads} size="xs" className={drilldownLabel === "Open Leads" ? "ring-2 ring-brand-300" : ""} />
          </button>
          <button
            type="button"
            onClick={() =>
              applyDrilldown("Leads >30 Days", {
                showRejected: false,
                leadDisposition: "Open",
                ageBucket: "30+",
              })
            }
          >
            <StatCard label="Leads >30 days" value={olderThan30} size="xs" className={drilldownLabel === "Leads >30 Days" ? "ring-2 ring-brand-300" : ""} />
          </button>
          <button
            type="button"
            onClick={() =>
              applyDrilldown("Created This Month", {
                showRejected: false,
                leadDisposition: "Open",
                createdRange: "this_month",
              })
            }
          >
            <StatCard label="Created this month" value={createdThisMonth} size="xs" className={drilldownLabel === "Created This Month" ? "ring-2 ring-brand-300" : ""} />
          </button>
          <button type="button" onClick={() => navigate("/interconnection")}>
            <StatCard
              label="Moved to Interconnection"
              value={movedToInterconnection}
              size="xs"
            />
          </button>
          <button type="button" onClick={() => applyDrilldown("On Hold Leads", { showRejected: false, leadDisposition: "OnHold" })}>
            <StatCard label="On Hold" value={onHoldLeads.length} size="xs" className={drilldownLabel === "On Hold Leads" ? "ring-2 ring-brand-300" : ""} />
          </button>
          <button type="button" onClick={() => applyDrilldown("Rejected Leads", { showRejected: true })}>
            <StatCard label="Rejected" value={rejectedLeads.length} size="xs" className={drilldownLabel === "Rejected Leads" ? "ring-2 ring-brand-300" : ""} />
          </button>
          <StatCard label="Avg Lead age" value={`${avgLeadAge}d`} size="xs" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
          <button type="button" onClick={() => applyDrilldown("Workscope SMS", { workscope: "SMS" })}>
            <Badge>SMS: {workscopeStats.sms}</Badge>
          </button>
          <button type="button" onClick={() => applyDrilldown("Workscope Voice", { workscope: "Voice" })}>
            <Badge>Voice: {workscopeStats.voice}</Badge>
          </button>
          <button type="button" onClick={() => applyDrilldown("Workscope SMS + Voice", { workscope: "SMS + Voice" })}>
            <Badge>SMS+Voice: {workscopeStats.both}</Badge>
          </button>
          <button type="button" onClick={() => applyDrilldown("Workscope Data", { workscope: "Data" })}>
            <Badge>Data: {workscopeStats.data}</Badge>
          </button>
          <button type="button" onClick={() => applyDrilldown("Workscope Other", { workscope: "Other" })}>
            <Badge>Other: {workscopeStats.other}</Badge>
          </button>
        </div>
      </Card>

      <div ref={tableAnchorRef} />
      <Card
        title="Lead operational list"
        actions={
          <div className="flex items-center gap-2">
            {drilldownLabel && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">View: {drilldownLabel}</span>
            )}
            {drilldownLabel && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDrilldownLabel(null);
                  setFilters(defaultFilters);
                }}
              >
                Exit drilldown
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setAdvancedOpen(true)}>
              Filters {advancedActiveCount > 0 ? `(${advancedActiveCount})` : ""}
            </Button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50/80 p-2">
          <div className="min-w-[280px] flex-1">
            <FieldLabel>Search</FieldLabel>
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search company..."
            />
          </div>
          <div className="w-[180px]">
            <FieldLabel>Owner</FieldLabel>
            <select value={filters.ownerUserId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerUserId: e.target.value }))}>
              <option value="">All</option>
              {state.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[130px]">
            <FieldLabel>Our entity</FieldLabel>
            <select value={filters.ourEntity} onChange={(e) => setFilters((prev) => ({ ...prev, ourEntity: e.target.value as "" | OurEntity }))}>
              <option value="">All</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="TR">TR</option>
            </select>
          </div>
          <div className="w-[150px]">
            <FieldLabel>Age bucket</FieldLabel>
            <select value={filters.ageBucket} onChange={(e) => setFilters((prev) => ({ ...prev, ageBucket: e.target.value as AgeBucket }))}>
              <option value="all">All</option>
              <option value="0-7">0-7 days</option>
              <option value="8-30">8-30 days</option>
              <option value="30+">30+ days</option>
            </select>
          </div>
          <div className="min-w-[240px]">
            <FieldLabel>Disposition</FieldLabel>
            <div className="flex rounded-md border border-slate-200 p-0.5">
              {(["Open", "OnHold"] as DispositionFilter[]).map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={filters.leadDisposition === item ? "secondary" : "ghost"}
                  className={filters.leadDisposition === item ? "" : "text-slate-500"}
                  onClick={() => setFilters((prev) => ({ ...prev, leadDisposition: item, showRejected: false }))}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAdvancedOpen(true)}>
              Advanced
            </Button>
            <Button size="sm" variant="secondary" onClick={clearAllFilters}>
              Reset all filters
            </Button>
          </div>
        </div>

        {advancedOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/25" onClick={() => setAdvancedOpen(false)}>
            <aside
              className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Advanced filters</h3>
                  <p className="text-xs text-slate-500">Refine operational list with additional criteria.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setAdvancedOpen(false)}>
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <FieldLabel>Workscope</FieldLabel>
                    <select value={filters.workscope} onChange={(e) => setFilters((prev) => ({ ...prev, workscope: e.target.value }))}>
                      <option value="">All</option>
                      {workscopeOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <select value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}>
                      <option value="">All</option>
                      {(["MNO", "Exclusive", "Aggregator", "MVNO", "Large Aggregator", "Wholesale Carrier", "Enterprise"] as CompanyType[]).map(
                        (option) => (
                          <option key={option}>{option}</option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Technical fit</FieldLabel>
                    <select
                      value={filters.technicalFit}
                      onChange={(e) => setFilters((prev) => ({ ...prev, technicalFit: e.target.value as TechnicalFit | "all" }))}
                    >
                      <option value="all">All</option>
                      <option value="Unknown">Unknown</option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Commercial fit</FieldLabel>
                    <select
                      value={filters.commercialFit}
                      onChange={(e) => setFilters((prev) => ({ ...prev, commercialFit: e.target.value as CommercialFit | "all" }))}
                    >
                      <option value="all">All</option>
                      <option value="Unknown">Unknown</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Risk">Risk</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Region</FieldLabel>
                    <select value={filters.region} onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))}>
                      <option value="">All</option>
                      {regionOptions.map((region) => (
                        <option key={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Additional filters</p>
                  <div className="grid gap-2">
                    <div>
                      <FieldLabel>Source</FieldLabel>
                      <select value={filters.source} onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}>
                        <option value="">All</option>
                        <option value="manual">Manual</option>
                        {eventSourceOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Watcher</FieldLabel>
                      <select value={filters.watcherUserId} onChange={(e) => setFilters((prev) => ({ ...prev, watcherUserId: e.target.value }))}>
                        <option value="">All</option>
                        {watcherOptions.map((userId) => (
                          <option key={userId} value={userId}>
                            {getUserName(state, userId)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Created range</FieldLabel>
                      <select
                        value={filters.createdRange}
                        onChange={(e) => setFilters((prev) => ({ ...prev, createdRange: e.target.value as CreatedRange }))}
                      >
                        <option value="all">All</option>
                        <option value="this_month">This month</option>
                        <option value="last_30_days">Last 30 days</option>
                      </select>
                    </div>
                    <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={filters.showRejected}
                        onChange={(e) => setFilters((prev) => ({ ...prev, showRejected: e.target.checked }))}
                      />
                      Show rejected only
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                <Button size="sm" variant="secondary" onClick={clearAllFilters}>
                  Reset all filters
                </Button>
                <Button size="sm" onClick={() => setAdvancedOpen(false)}>
                  Done
                </Button>
              </div>
            </aside>
          </div>
        )}

        {activeChips.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-xs text-slate-500">Filtered by: {breadcrumbText}</p>
            <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClear}
                className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
              >
                {chip.label} ×
              </button>
            ))}
            </div>
          </div>
        )}

        <div className="max-h-[72vh] overflow-auto rounded-lg border border-slate-200/80">
          <table>
            <thead className="sticky top-0 z-[1] bg-white">
              <tr>
                <th>Company</th>
                <th>Disposition</th>
                <th>Owner</th>
                <th>Type</th>
                <th>Workscope</th>
                <th>Technical</th>
                <th>Commercial</th>
                <th>Lead age</th>
                <th>Next action</th>
                <th>Readiness</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((company) => {
                const processes = processByCompany.get(company.id) ?? [];
                const hasSmsProcess = processes.some((row) => row.track === "SMS");
                const hasVoiceProcess = processes.some((row) => row.track === "Voice");
                const contactsForCompany = contactsByCompany.get(company.id) ?? [];
                const smsStartReadiness = getInterconnectionStartReadiness(company, contactsForCompany, "SMS");
                const voiceStartReadiness = getInterconnectionStartReadiness(company, contactsForCompany, "Voice");
                const watchers = Array.from(new Set([...(company.watcherUserIds ?? []), company.ownerUserId]));
                const sourceLabel = company.createdFromEventId ? getEventName(state, company.createdFromEventId) : "Manual";
                const canShowQuickStart =
                  company.companyStatus === "LEAD" && company.leadDisposition !== "Rejected" && !filters.showRejected;
                return (
                  <tr
                    key={company.id}
                    className="group cursor-pointer border-b border-slate-100 transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-brand-50/40"
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    <td>
                      <div>
                        <p className="font-semibold">{company.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {sourceLabel}
                          {company.ourEntity ? ` · ${company.ourEntity}` : ""}
                          {company.region ? ` · ${company.region}` : ""}
                        </p>
                      </div>
                    </td>
                    <td>
                      <Badge className={dispositionBadgeClass(company.leadDisposition)}>{company.leadDisposition}</Badge>
                    </td>
                    <td>
                      <p className="text-sm text-slate-800">{getUserName(state, company.ownerUserId)}</p>
                      <p className="text-[11px] text-slate-500">
                        Watchers: {watchers.map((userId) => getUserName(state, userId)).join(", ")}
                      </p>
                    </td>
                    <td>{company.type}</td>
                    <td>{workscopeGroup(company)}</td>
                    <td>
                      <Badge className={technicalBadgeClass(technicalStatus(company))}>{technicalStatus(company)}</Badge>
                    </td>
                    <td>
                      <Badge className={commercialBadgeClass(commercialStatus(company))}>{commercialStatus(company)}</Badge>
                    </td>
                    <td>{leadAgeDays(company)}d</td>
                    <td>
                      <p className="max-w-[240px] truncate text-sm font-medium text-slate-800">{company.evaluation?.nextAction ?? "-"}</p>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Badge className={readinessBadgeClass(smsStartReadiness.ready)}>
                            SMS: {smsStartReadiness.ready ? "Ready" : "Missing"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className={readinessBadgeClass(voiceStartReadiness.ready)}>
                            Voice: {voiceStartReadiness.ready ? "Ready" : "Missing"}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="w-[220px]">
                      <div
                        className="flex items-center justify-end gap-1 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          to={`/companies/${company.id}`}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50"
                        >
                          Open
                        </Link>
                        {canShowQuickStart && (
                          <>
                            {!hasSmsProcess && (
                              <Button
                                size="sm"
                                disabled={!smsStartReadiness.ready}
                                title={!smsStartReadiness.ready ? `Missing: ${smsStartReadiness.missing.join(", ")}` : undefined}
                                onClick={() => state.startInterconnectionProcess(company.id, "SMS")}
                              >
                                Start SMS
                              </Button>
                            )}
                            {!hasVoiceProcess && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={!voiceStartReadiness.ready}
                                title={!voiceStartReadiness.ready ? `Missing: ${voiceStartReadiness.missing.join(", ")}` : undefined}
                                onClick={() => state.startInterconnectionProcess(company.id, "Voice")}
                              >
                                Start Voice
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

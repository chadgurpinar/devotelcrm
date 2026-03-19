import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp, Plus, ChevronRight } from "lucide-react";
import { Badge, Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getEventName, getUserName } from "../../store/selectors";
import { CommercialFit, Company, CompanyType, OurEntity, TechnicalFit } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";
import { getInterconnectionStartReadiness } from "./readiness";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const selectCls = inputCls;

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
    <div className="space-y-5">
      <UiPageHeader
        title="Leads"
        subtitle={`${visibleLeads.length} leads · ${openLeads.length} open`}
        actions={
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" /> New Lead
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button type="button" className="text-left" onClick={() => applyDrilldown("Open Leads", { showRejected: false, leadDisposition: "Open" })}>
          <UiKpiCard
            label="Total Open Leads"
            value={totalLeads}
            icon={<TrendingUp className="h-5 w-5" />}
            className={`border-amber-200 bg-amber-50/40 ${drilldownLabel === "Open Leads" ? "ring-2 ring-amber-400" : ""}`}
          />
        </button>
        <button type="button" className="text-left" onClick={() => applyDrilldown("Created This Month", { showRejected: false, leadDisposition: "Open", createdRange: "this_month" })}>
          <UiKpiCard
            label="Created This Month"
            value={createdThisMonth}
            icon={<Plus className="h-5 w-5" />}
            className={`border-blue-200 bg-blue-50/40 ${drilldownLabel === "Created This Month" ? "ring-2 ring-blue-400" : ""}`}
          />
        </button>
        <button type="button" className="text-left" onClick={() => applyDrilldown("Leads >30 Days", { showRejected: false, leadDisposition: "Open", ageBucket: "30+" })}>
          <UiKpiCard
            label="Avg Lead Age"
            value={`${avgLeadAge} days`}
            className={drilldownLabel === "Leads >30 Days" ? "ring-2 ring-indigo-400" : ""}
          />
        </button>
      </div>

      {/* Quick stats row */}
      <div className="flex flex-wrap gap-2">
        {([
          { label: `On Hold: ${onHoldLeads.length}`, key: "On Hold Leads", patch: { showRejected: false, leadDisposition: "OnHold" as const } },
          { label: `Rejected: ${rejectedLeads.length}`, key: "Rejected Leads", patch: { showRejected: true } },
          { label: `>30 Days: ${olderThan30}`, key: "Leads >30 Days", patch: { showRejected: false, leadDisposition: "Open" as const, ageBucket: "30+" as const } },
          { label: `→ Interconnection: ${movedToInterconnection}`, key: "interconnection", patch: {} },
        ] as const).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => item.key === "interconnection" ? navigate("/interconnection") : applyDrilldown(item.key, item.patch)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              drilldownLabel === item.key ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="mx-1 h-6 w-px bg-gray-200 self-center" />
        {([
          { label: `SMS: ${workscopeStats.sms}`, key: "Workscope SMS", patch: { workscope: "SMS" } },
          { label: `Voice: ${workscopeStats.voice}`, key: "Workscope Voice", patch: { workscope: "Voice" } },
          { label: `Both: ${workscopeStats.both}`, key: "Workscope SMS + Voice", patch: { workscope: "SMS + Voice" } },
        ]).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => applyDrilldown(item.key, item.patch)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              drilldownLabel === item.key ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

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
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
          <div className="min-w-[280px] flex-1">
            <FieldLabel>Search</FieldLabel>
            <input
              className={inputCls}
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search company..."
            />
          </div>
          <div className="w-[180px]">
            <FieldLabel>Owner</FieldLabel>
            <select className={selectCls} value={filters.ownerUserId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerUserId: e.target.value }))}>
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
            <select className={selectCls} value={filters.ourEntity} onChange={(e) => setFilters((prev) => ({ ...prev, ourEntity: e.target.value as "" | OurEntity }))}>
              <option value="">All</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="TR">TR</option>
            </select>
          </div>
          <div className="w-[150px]">
            <FieldLabel>Age bucket</FieldLabel>
            <select className={selectCls} value={filters.ageBucket} onChange={(e) => setFilters((prev) => ({ ...prev, ageBucket: e.target.value as AgeBucket }))}>
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

        {visibleLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
            <TrendingUp className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No leads yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Get started by creating your first lead</p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" /> Create first lead
            </button>
          </div>
        ) : (
          <div className="max-h-[72vh] overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-[1] border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Company</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Owner</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Workscope</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Technical</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Commercial</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Age</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Readiness</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visibleLeads.map((company) => {
                  const contactsForCompany = contactsByCompany.get(company.id) ?? [];
                  const smsStartReadiness = getInterconnectionStartReadiness(company, contactsForCompany, "SMS");
                  const voiceStartReadiness = getInterconnectionStartReadiness(company, contactsForCompany, "Voice");
                  const ownerName = getUserName(state, company.ownerUserId);
                  const ownerInitials = ownerName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                  const companyInitials = company.name.slice(0, 2).toUpperCase();
                  return (
                    <tr
                      key={company.id}
                      className="group cursor-pointer border-b border-gray-50 transition-colors hover:bg-indigo-50/40"
                      onClick={() => navigate(`/companies/${company.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                            {companyInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{company.name}</p>
                            <p className="truncate text-[11px] text-gray-500">
                              {company.type}{company.ourEntity ? ` · ${company.ourEntity}` : ""}{company.region ? ` · ${company.region}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={dispositionBadgeClass(company.leadDisposition)}>{company.leadDisposition}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">
                            {ownerInitials}
                          </div>
                          <span className="text-sm text-gray-700">{ownerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {company.workscope.map((ws) => (
                            <span key={ws} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{ws}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={technicalBadgeClass(technicalStatus(company))}>{technicalStatus(company)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={commercialBadgeClass(commercialStatus(company))}>{commercialStatus(company)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{leadAgeDays(company)}d</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${smsStartReadiness.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"}`}>
                            SMS {smsStartReadiness.ready ? "✓" : "—"}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${voiceStartReadiness.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"}`}>
                            Voice {voiceStartReadiness.ready ? "✓" : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-4 py-2">
              <p className="text-xs text-gray-400">{visibleLeads.length} lead{visibleLeads.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

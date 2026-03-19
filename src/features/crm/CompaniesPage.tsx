import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Plus, Search } from "lucide-react";
import { Badge, Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { CompanyStatus, CompanyType, OurEntity, Workscope } from "../../store/types";
import { getTrackStage } from "../../store/interconnection";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";

const types: CompanyType[] = ["MNO", "Exclusive", "Aggregator", "MVNO", "Large Aggregator", "Wholesale Carrier", "Enterprise"];
const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const TYPE_COLOR: Record<string, string> = {
  MNO: "bg-indigo-50 text-indigo-700",
  Exclusive: "bg-purple-50 text-purple-700",
  Aggregator: "bg-sky-50 text-sky-700",
  MVNO: "bg-teal-50 text-teal-700",
  "Large Aggregator": "bg-amber-50 text-amber-700",
  "Wholesale Carrier": "bg-emerald-50 text-emerald-700",
  Enterprise: "bg-rose-50 text-rose-700",
};

const ENTITY_COLOR: Record<string, string> = {
  USA: "bg-blue-50 text-blue-700",
  UK: "bg-slate-100 text-slate-700",
  TR: "bg-red-50 text-red-700",
};

interface CompaniesPageProps {
  companyStatus: CompanyStatus;
  title: string;
}

export function CompaniesPage({ companyStatus, title }: CompaniesPageProps) {
  const state = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [ourEntity, setOurEntity] = useState<"" | OurEntity>("");
  const [type, setType] = useState("");

  const processMap = useMemo(() => {
    const map = new Map<string, typeof state.interconnectionProcesses>();
    state.interconnectionProcesses.forEach((row) => {
      const list = map.get(row.companyId) ?? [];
      list.push(row);
      map.set(row.companyId, list);
    });
    return map;
  }, [state.interconnectionProcesses]);

  const allRows = useMemo(
    () => state.companies.filter((c) => c.companyStatus === companyStatus),
    [companyStatus, state.companies],
  );

  const rows = useMemo(
    () =>
      allRows
        .filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()))
        .filter((c) => !ourEntity || c.ourEntity === ourEntity)
        .filter((c) => !type || c.type === type)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allRows, search, ourEntity, type],
  );

  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
  const addedThisQuarter = allRows.filter((c) => (c.createdAt ?? "") >= quarterStart).length;

  return (
    <div className="space-y-5">
      <UiPageHeader
        title={title}
        subtitle={`${allRows.length} companies`}
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition">
            <Plus className="h-4 w-4" /> Add Client
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiKpiCard label="Total Clients" value={allRows.length} icon={<Building2 className="h-5 w-5" />} />
        <UiKpiCard label="Active" value={allRows.length} className="border-emerald-200 bg-emerald-50/40" icon={<Building2 className="h-5 w-5" />} />
        <UiKpiCard label="Added This Quarter" value={addedThisQuarter} className="border-blue-200 bg-blue-50/40" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Search</label>
          <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company..." className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400" />
          </div>
        </div>
        <div className="w-40">
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Type</label>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Entity</label>
          <select className={inputCls} value={ourEntity} onChange={(e) => setOurEntity(e.target.value as "" | OurEntity)}>
            <option value="">All</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="TR">TR</option>
          </select>
        </div>
        {(search || type || ourEntity) && (
          <button onClick={() => { setSearch(""); setType(""); setOurEntity(""); }} className="h-9 rounded-lg px-3 text-xs font-medium text-gray-500 hover:bg-gray-100 transition">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <Building2 className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No clients found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-[1] border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Company</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Owner</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Workscope</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">SMS</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Voice</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((company) => {
                  const procs = processMap.get(company.id) ?? [];
                  const smsStage = getTrackStage(procs, "SMS");
                  const voiceStage = getTrackStage(procs, "Voice");
                  const initials = company.name.slice(0, 2).toUpperCase();
                  const ownerName = getUserName(state, company.ownerUserId);
                  return (
                    <tr key={company.id} className="group cursor-pointer border-b border-gray-50 transition-colors hover:bg-indigo-50/40" onClick={() => navigate(`/companies/${company.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">{initials}</div>
                          <span className="text-sm font-semibold text-gray-900">{company.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TYPE_COLOR[company.type] ?? "bg-gray-100 text-gray-600"}`}>{company.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${ENTITY_COLOR[company.ourEntity] ?? "bg-gray-100 text-gray-600"}`}>{company.ourEntity}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ownerName}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {company.workscope.map((ws) => (
                            <span key={ws} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{ws}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge className={smsStage === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}>{smsStage}</Badge></td>
                      <td className="px-4 py-3"><Badge className={voiceStage === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}>{voiceStage}</Badge></td>
                      <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-xs text-gray-400">{rows.length} row{rows.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}
    </div>
  );
}

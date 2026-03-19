import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, GitMerge, Search } from "lucide-react";
import { Badge, Button } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { getUserName } from "../../store/selectors";
import { InterconnectionProcess, InterconnectionStage, OurEntity } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";
import { UiKpiCard } from "../../ui/UiKpiCard";

const stages: InterconnectionStage[] = ["NDA", "Contract", "Technical", "AM_Assigned", "Completed", "Failed"];
const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const STAGE_COLOR: Record<string, string> = {
  NDA: "bg-amber-50 text-amber-700",
  Contract: "bg-sky-50 text-sky-700",
  Technical: "bg-indigo-50 text-indigo-700",
  AM_Assigned: "bg-purple-50 text-purple-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Failed: "bg-rose-50 text-rose-700",
  None: "bg-gray-100 text-gray-500",
};

function ProcessStageCell({
  process,
  onCreate,
  onUpdateStage,
}: {
  process?: InterconnectionProcess;
  onCreate: () => void;
  onUpdateStage: (stage: InterconnectionStage) => void;
}) {
  if (!process) {
    return (
      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onCreate(); }}>
        Start
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <select
        className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs text-gray-700"
        value={process.stage}
        onChange={(e) => onUpdateStage(e.target.value as InterconnectionStage)}
      >
        {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
      </select>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STAGE_COLOR[process.stage] ?? "bg-gray-100 text-gray-500"}`}>
        {process.stage}
      </span>
    </div>
  );
}

export function InterconnectionPage() {
  const state = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [ourEntityFilter, setOurEntityFilter] = useState<"" | OurEntity>("");

  const allRows = useMemo(
    () => state.companies.filter((c) => c.companyStatus === "INTERCONNECTION"),
    [state.companies],
  );

  const rows = useMemo(
    () =>
      allRows
        .filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()))
        .filter((c) => !ownerFilter || c.ownerUserId === ownerFilter)
        .filter((c) => !ourEntityFilter || c.ourEntity === ourEntityFilter)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allRows, search, ownerFilter, ourEntityFilter],
  );

  const processMap = useMemo(() => {
    const map = new Map<string, InterconnectionProcess[]>();
    state.interconnectionProcesses.forEach((p) => {
      const list = map.get(p.companyId) ?? [];
      list.push(p);
      map.set(p.companyId, list);
    });
    return map;
  }, [state.interconnectionProcesses]);

  const twoWay = allRows.filter((c) => c.interconnectionType === "Two-way").length;
  const oneWay = allRows.filter((c) => c.interconnectionType === "One-way").length;

  return (
    <div className="space-y-5">
      <UiPageHeader
        title="Interconnection"
        subtitle={`${allRows.length} companies in interconnection`}
        actions={
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">{allRows.length}</span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiKpiCard label="Total" value={allRows.length} icon={<GitMerge className="h-5 w-5" />} />
        <UiKpiCard label="Two-way" value={twoWay} className="border-indigo-200 bg-indigo-50/40" />
        <UiKpiCard label="One-way" value={oneWay} className="border-amber-200 bg-amber-50/40" />
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
        <div className="w-44">
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Owner</label>
          <select className={inputCls} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="">All</option>
            {state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Entity</label>
          <select className={inputCls} value={ourEntityFilter} onChange={(e) => setOurEntityFilter(e.target.value as "" | OurEntity)}>
            <option value="">All</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="TR">TR</option>
          </select>
        </div>
        {(search || ownerFilter || ourEntityFilter) && (
          <button onClick={() => { setSearch(""); setOwnerFilter(""); setOurEntityFilter(""); }} className="h-9 rounded-lg px-3 text-xs font-medium text-gray-500 hover:bg-gray-100 transition">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <GitMerge className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No interconnection companies found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-[1] border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Company</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Workscope</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Owner</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">SMS Process</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Voice Process</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((company) => {
                  const processes = processMap.get(company.id) ?? [];
                  const smsProcess = processes.find((p) => p.track === "SMS");
                  const voiceProcess = processes.find((p) => p.track === "Voice");
                  const initials = company.name.slice(0, 2).toUpperCase();
                  return (
                    <tr key={company.id} className="group cursor-pointer border-b border-gray-50 transition-colors hover:bg-indigo-50/40" onClick={() => navigate(`/companies/${company.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{initials}</div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{company.name}</p>
                            <p className="text-[11px] text-gray-500">{company.ourEntity}{company.region ? ` · ${company.region}` : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          company.interconnectionType === "Two-way" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {company.interconnectionType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {company.workscope.map((ws) => (
                            <span key={ws} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{ws}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{getUserName(state, company.ownerUserId)}</td>
                      <td className="px-4 py-3">
                        <ProcessStageCell
                          process={smsProcess}
                          onCreate={() => state.startInterconnectionProcess(company.id, "SMS")}
                          onUpdateStage={(stage) => state.setInterconnectionStage(smsProcess!.id, stage)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ProcessStageCell
                          process={voiceProcess}
                          onCreate={() => state.startInterconnectionProcess(company.id, "Voice")}
                          onUpdateStage={(stage) => state.setInterconnectionStage(voiceProcess!.id, stage)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                      </td>
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
